import { useState, useEffect } from 'react'
import { api } from '../api'
import type { Check } from '../types'

interface Props {
  check: Check | null
  sectionId: string
  position: { x: number; y: number } | null
  onClose: () => void
  onSaved: () => void
}

export default function CheckModal({ check, sectionId, position, onClose, onSaved }: Props) {
  const [name, setName] = useState('')
  const [logic, setLogic] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (check) {
      setName(check.name)
      setLogic(check.logic)
    } else {
      setName('')
      setLogic('')
    }
  }, [check, position])

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      if (check) {
        await api.checks.update(check.id, { name, logic, ...(position ? { x: position.x, y: position.y } : {}) })
      } else if (position) {
        await api.checks.create(sectionId, {
          name,
          x: position.x,
          y: position.y,
          logic,
          created_by: localStorage.getItem('username') || 'Anonymous',
        })
      }
      onSaved()
      onClose()
    } catch (err) {
      alert('Failed to save check')
    } finally {
      setSaving(false)
    }
  }

  if (!position && !check) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{check ? 'Edit Check' : 'New Check'}</h2>

        <div className="form-group">
          <label>Check Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Strawberry #1" autoFocus />
        </div>

        <div className="form-group">
          <label>Logic Requirements</label>
          <textarea
            value={logic}
            onChange={e => setLogic(e.target.value)}
            placeholder='e.g. Requires: dash refills AND dream blocks&#10;Requires: spring OR feathers&#10;NOT recommended: golden berry'
            rows={5}
          />
        </div>

        <div className="flex gap-2 justify-between items-center">
          <span className="text-muted" style={{ fontSize: 12 }}>
            Position: x={Math.round(position?.x ?? check?.x ?? 0)}, y={Math.round(position?.y ?? check?.y ?? 0)}
          </span>
          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving...' : check ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
