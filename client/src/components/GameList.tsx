import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { Game } from '../types'

export default function GameList() {
  const [games, setGames] = useState<Game[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')

  const load = () => api.games.list().then(setGames)

  useEffect(() => { load() }, [])

  const create = async () => {
    if (!name.trim()) return
    await api.games.create(name, desc)
    setName('')
    setDesc('')
    setShowForm(false)
    load()
  }

  const remove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Delete this game?')) return
    await api.games.delete(id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ fontSize: 20 }}>Games</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          + New Game
        </button>
      </div>

      {showForm && (
        <div className="card mb-4">
          <div className="form-group">
            <label>Game Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Celeste Randomizer" autoFocus />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional description" />
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={create}>Create</button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="grid">
        {games.length === 0 && (
          <div className="empty-state card">
            <h3>No games yet</h3>
            <p>Create your first game to get started.</p>
          </div>
        )}
        {games.map(game => (
          <Link to={`/game/${game.id}`} key={game.id} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ cursor: 'pointer' }}>
              <div className="flex items-center justify-between">
                <h3 style={{ color: '#e0e0e0' }}>{game.name}</h3>
                <button className="btn btn-danger btn-sm" onClick={e => remove(e, game.id)}>Delete</button>
              </div>
              {game.description && <p className="text-muted mt-2">{game.description}</p>}
              <p className="text-muted mt-2" style={{ fontSize: 12 }}>
                Created {new Date(game.created_at).toLocaleDateString()}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
