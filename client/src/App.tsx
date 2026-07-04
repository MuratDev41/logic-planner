import { Routes, Route, Link } from 'react-router-dom'
import GameList from './components/GameList'
import GameView from './components/GameView'
import SectionView from './components/SectionView'

export default function App() {
  return (
    <div className="container">
      <header style={{ padding: '20px 0', borderBottom: '1px solid #0f3460', marginBottom: 24 }}>
        <Link to="/" style={{ fontSize: 22, fontWeight: 700, color: '#7c7cff', textDecoration: 'none' }}>
          Randomizer Logic Planner
        </Link>
        <p className="text-muted" style={{ marginTop: 4 }}>
          Plan and collaborate on randomizer check logic
        </p>
      </header>
      <Routes>
        <Route path="/" element={<GameList />} />
        <Route path="/game/:gameId" element={<GameView />} />
        <Route path="/section/:sectionId" element={<SectionView />} />
      </Routes>
    </div>
  )
}
