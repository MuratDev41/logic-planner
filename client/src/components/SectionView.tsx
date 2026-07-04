import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import { getSocket, joinSection, leaveSection } from '../socket'
import MapCanvas from './MapCanvas'
import CheckModal from './CheckModal'
import type { Section, Check } from '../types'

const COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6bff', '#ff9f43', '#00d2d3', '#a29bfe']

function hashCode(s: string) {
  let hash = 0
  for (let i = 0; i < s.length; i++) hash = ((hash << 5) - hash) + s.charCodeAt(i)
  return Math.abs(hash)
}

export default function SectionView() {
  const { sectionId } = useParams<{ sectionId: string }>()
  const [section, setSection] = useState<Section | null>(null)
  const [checks, setChecks] = useState<Check[]>([])
  const [selectedCheck, setSelectedCheck] = useState<Check | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [clickPos, setClickPos] = useState<{ x: number; y: number } | null>(null)
  const [editingCheck, setEditingCheck] = useState<Check | null>(null)
  const [cursors, setCursors] = useState<Record<string, { x: number; y: number; name: string; color: string }>>({})
  const [username, setUsername] = useState(localStorage.getItem('username') || '')
  const [showUserPrompt, setShowUserPrompt] = useState(!username)
  const [collaborators, setCollaborators] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const cursorTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (!sectionId) return
    api.sections.get(sectionId).then(setSection)
    api.checks.list(sectionId).then(setChecks)
    joinSection(sectionId)

    const socket = getSocket()

    socket.on('check-added', (data: Check) => {
      setChecks(prev => {
        if (prev.find(c => c.id === data.id)) return prev
        return [...prev, data]
      })
    })

    socket.on('check-updated', (data: Check) => {
      setChecks(prev => prev.map(c => c.id === data.id ? data : c))
    })

    socket.on('check-deleted', (data: { id: string }) => {
      setChecks(prev => prev.filter(c => c.id !== data.id))
    })

    socket.on('cursor-move', (data: { id: string; x: number; y: number; name: string }) => {
      setCursors(prev => ({
        ...prev,
        [data.id]: { x: data.x, y: data.y, name: data.name, color: COLORS[hashCode(data.id) % COLORS.length] },
      }))
    })

    socket.on('user-joined', (data: { id: string }) => {
      setCollaborators(prev => prev.includes(data.id) ? prev : [...prev, data.id])
    })

    socket.on('user-left', (data: { id: string }) => {
      setCollaborators(prev => prev.filter(id => id !== data.id))
      setCursors(prev => {
        const next = { ...prev }
        delete next[data.id]
        return next
      })
    })

    return () => {
      leaveSection()
      socket.off('check-added')
      socket.off('check-updated')
      socket.off('check-deleted')
      socket.off('cursor-move')
      socket.off('user-joined')
      socket.off('user-left')
    }
  }, [sectionId])

  const setUsernamePersist = useCallback((name: string) => {
    setUsername(name)
    localStorage.setItem('username', name)
    setShowUserPrompt(false)
  }, [])

  const handleMapClick = useCallback((x: number, y: number) => {
    setClickPos({ x, y })
    setEditingCheck(null)
    setShowModal(true)
  }, [])

  const handleCheckClick = useCallback((check: Check) => {
    setSelectedCheck(check)
    setEditingCheck(check)
    setClickPos(null)
    setShowModal(true)
  }, [])

  const handleCursorMove = useCallback((x: number, y: number) => {
    if (!username) return
    const socket = getSocket()
    socket.emit('cursor-move', { x, y, name: username })
    if (cursorTimeout.current) clearTimeout(cursorTimeout.current)
    cursorTimeout.current = setTimeout(() => {
      setCursors(prev => {
        const next = { ...prev }
        delete next.self
        return next
      })
    }, 5000)
  }, [username])

  const handleUploadMap = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !sectionId) return
    setUploading(true)
    try {
      const img = new Image()
      img.src = URL.createObjectURL(file)
      await new Promise(resolve => { img.onload = resolve })
      const updated = await api.sections.uploadMap(sectionId, file, img.naturalWidth, img.naturalHeight)
      setSection(updated)
    } catch (err) {
      alert('Failed to upload map')
    } finally {
      setUploading(false)
    }
  }

  const removeCheck = async (id: string) => {
    if (!confirm('Delete this check?')) return
    await api.checks.delete(id)
    setChecks(prev => prev.filter(c => c.id !== id))
    getSocket().emit('check-deleted', { id })
  }

  const onSaved = () => {
    if (!sectionId) return
    api.checks.list(sectionId).then(newChecks => {
      setChecks(newChecks)
      getSocket().emit('check-added', {})
    })
  }

  const deleteSection = async () => {
    if (!sectionId || !confirm('Delete this section and all its checks?')) return
    await api.sections.delete(sectionId)
    window.location.href = '/'
  }

  if (!section) return <div className="text-center text-muted">Loading...</div>

  return (
    <div>
      <Link to={`/game/${section.game_id}`} className="text-muted" style={{ display: 'block', marginBottom: 16 }}>
        ← Back to Game
      </Link>

      {showUserPrompt && (
        <div className="card mb-4">
          <div className="form-group">
            <label>Your Name (for collaboration)</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter your name"
              onKeyDown={e => e.key === 'Enter' && username.trim() && setUsernamePersist(username.trim())}
              autoFocus
            />
          </div>
          <button
            className="btn btn-primary mt-2"
            onClick={() => username.trim() && setUsernamePersist(username.trim())}
          >
            Join
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 style={{ fontSize: 20 }}>{section.name}</h2>
          {section.description && <p className="text-muted">{section.description}</p>}
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {collaborators.length > 0 && (
            <span className="badge" style={{ background: '#2a2a3e' }}>
              {collaborators.length} online
            </span>
          )}
          {username && (
            <span className="badge" style={{ background: '#2a2a3e', color: '#6bcb77' }}>
              {username}
            </span>
          )}
          <button className="btn btn-danger btn-sm" onClick={deleteSection}>Delete Section</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexDirection: 'row' }} className="checks-map-layout">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {section.map_image ? (
            <MapCanvas
              mapImage={section.map_image}
              mapWidth={section.map_width || 1000}
              mapHeight={section.map_height || 800}
              checks={checks}
              selectedCheckId={selectedCheck?.id ?? null}
              onMapClick={handleMapClick}
              onCheckClick={handleCheckClick}
              cursors={cursors}
              onCursorMove={handleCursorMove}
            />
          ) : (
            <div className="card text-center" style={{ padding: 60 }}>
              <h3 className="mb-4">No Map Uploaded</h3>
              <p className="text-muted mb-4">Upload a world map image to start placing check pins.</p>
              <label className="btn btn-primary" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                {uploading ? 'Uploading...' : 'Upload Map Image'}
                <input type="file" accept="image/*" onChange={handleUploadMap} hidden />
              </label>
            </div>
          )}
        </div>

        <div style={{ width: 300, flexShrink: 0 }}>
          <div className="card" style={{ height: '100%', maxHeight: 600, overflowY: 'auto' }}>
            <div className="card-header">
              <h3 style={{ fontSize: 15 }}>Checks ({checks.length})</h3>
              <button className="btn btn-primary btn-sm" onClick={() => { setClickPos({ x: 100, y: 100 }); setShowModal(true) }}>
                + Add
              </button>
            </div>

            {checks.length === 0 && (
              <div className="text-muted text-center" style={{ padding: 20, fontSize: 13 }}>
                {section.map_image
                  ? 'Click on the map to add a check.'
                  : 'Upload a map first, then click to place checks.'}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {checks.map(check => (
                <div
                  key={check.id}
                  className="section-item"
                  style={{
                    cursor: 'pointer',
                    borderColor: selectedCheck?.id === check.id ? '#ffd93d' : undefined,
                  }}
                  onClick={() => {
                    setSelectedCheck(check)
                    setClickPos(null)
                    setEditingCheck(check)
                    setShowModal(true)
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {check.name}
                    </div>
                    {check.logic && (
                      <div style={{ fontSize: 11, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {check.logic}
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
                      by {check.created_by}
                    </div>
                  </div>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={e => { e.stopPropagation(); removeCheck(check.id) }}
                    style={{ flexShrink: 0 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <CheckModal
          check={editingCheck}
          sectionId={sectionId!}
          position={clickPos}
          onClose={() => { setShowModal(false); setEditingCheck(null); setClickPos(null) }}
          onSaved={onSaved}
        />
      )}
    </div>
  )
}
