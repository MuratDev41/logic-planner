import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../api'
import type { Game, Section } from '../types'

export default function GameView() {
  const { gameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()
  const [game, setGame] = useState<Game | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')

  useEffect(() => {
    if (!gameId) return
    api.games.get(gameId).then(setGame)
    api.sections.list(gameId).then(setSections)
  }, [gameId])

  const createSection = async () => {
    if (!name.trim() || !gameId) return
    const sec = await api.sections.create(gameId, name, desc)
    setName('')
    setDesc('')
    setShowForm(false)
    navigate(`/section/${sec.id}`)
  }

  const removeSection = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Delete this section?')) return
    await api.sections.delete(id)
    setSections(sections.filter(s => s.id !== id))
  }

  if (!game) return <div className="text-center text-muted">Loading...</div>

  return (
    <div>
      <Link to="/" className="text-muted" style={{ display: 'block', marginBottom: 16 }}>← Back to Games</Link>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 style={{ fontSize: 22 }}>{game.name}</h2>
          {game.description && <p className="text-muted">{game.description}</p>}
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          + New Section
        </button>
      </div>

      {showForm && (
        <div className="card mb-4">
          <div className="form-group">
            <label>Section Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Chapter 1: Forsaken City" autoFocus />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional description" />
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={createSection}>Create</button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="section-list">
        {sections.length === 0 && (
          <div className="empty-state card">
            <h3>No sections yet</h3>
            <p>Create a section to start planning logic for an area of the game.</p>
          </div>
        )}
        {sections.map(section => (
          <div
            key={section.id}
            className="section-item"
            onClick={() => navigate(`/section/${section.id}`)}
          >
            <div>
              <div style={{ fontWeight: 500 }}>{section.name}</div>
              {section.description && <div className="text-muted" style={{ fontSize: 13 }}>{section.description}</div>}
            </div>
            <div className="flex gap-2 items-center">
              {section.map_image && <span className="badge">Map</span>}
              <button className="btn btn-danger btn-sm" onClick={e => removeSection(e, section.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
