import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../db.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const games = dbAll<any>('SELECT * FROM games ORDER BY updated_at DESC');
  res.json(games);
});

router.get('/:id', (req: Request, res: Response) => {
  const game = dbGet<any>('SELECT * FROM games WHERE id = ?', [req.params.id]);
  if (!game) { res.status(404).json({ error: 'Game not found' }); return; }
  res.json(game);
});

router.post('/', (req: Request, res: Response) => {
  const { name, description } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: 'Name is required' }); return; }
  const id = uuidv4();
  const now = new Date().toISOString();
  dbRun('INSERT INTO games (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [id, name.trim(), description?.trim() || '', now, now]);
  const game = dbGet<any>('SELECT * FROM games WHERE id = ?', [id]);
  res.status(201).json(game);
});

router.put('/:id', (req: Request, res: Response) => {
  const { name, description } = req.body;
  const existing = dbGet<any>('SELECT * FROM games WHERE id = ?', [req.params.id]);
  if (!existing) { res.status(404).json({ error: 'Game not found' }); return; }
  const now = new Date().toISOString();
  dbRun('UPDATE games SET name = ?, description = ?, updated_at = ? WHERE id = ?',
    [name?.trim() || existing.name, description?.trim() ?? existing.description, now, req.params.id]);
  const game = dbGet<any>('SELECT * FROM games WHERE id = ?', [req.params.id]);
  res.json(game);
});

router.delete('/:id', (req: Request, res: Response) => {
  const existing = dbGet<any>('SELECT * FROM games WHERE id = ?', [req.params.id]);
  if (!existing) { res.status(404).json({ error: 'Game not found' }); return; }
  dbRun('DELETE FROM sections WHERE game_id = ?', [req.params.id]);
  dbRun('DELETE FROM games WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

export default router;
