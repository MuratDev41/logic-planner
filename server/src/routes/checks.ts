import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../db.js';
import { getIO } from '../socket.js';

const router = Router();

router.get('/section/:sectionId', (req: Request, res: Response) => {
  const checks = dbAll<any>('SELECT * FROM checks WHERE section_id = ? ORDER BY created_at ASC', [req.params.sectionId]);
  res.json(checks);
});

router.post('/section/:sectionId', (req: Request, res: Response) => {
  const { name, x, y, logic, created_by } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: 'Name is required' }); return; }
  if (x == null || y == null) { res.status(400).json({ error: 'Position (x, y) is required' }); return; }
  const section = dbGet<any>('SELECT id FROM sections WHERE id = ?', [req.params.sectionId]);
  if (!section) { res.status(404).json({ error: 'Section not found' }); return; }
  const id = uuidv4();
  const now = new Date().toISOString();
  dbRun('INSERT INTO checks (id, section_id, name, description, x, y, logic, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, req.params.sectionId, name.trim(), '', x, y, logic || '', created_by || 'Anonymous', now, now]);
  const check = dbGet<any>('SELECT * FROM checks WHERE id = ?', [id]);
  getIO().to(req.params.sectionId).emit('check-added', check);
  res.status(201).json(check);
});

router.put('/:id', (req: Request, res: Response) => {
  const { name, x, y, logic, description } = req.body;
  const existing = dbGet<any>('SELECT * FROM checks WHERE id = ?', [req.params.id]);
  if (!existing) { res.status(404).json({ error: 'Check not found' }); return; }
  const now = new Date().toISOString();
  dbRun('UPDATE checks SET name = ?, x = ?, y = ?, logic = ?, description = ?, updated_at = ? WHERE id = ?',
    [
      name?.trim() ?? existing.name,
      x ?? existing.x,
      y ?? existing.y,
      logic ?? existing.logic,
      description ?? existing.description,
      now,
      req.params.id
    ]);
  const check = dbGet<any>('SELECT * FROM checks WHERE id = ?', [req.params.id]);
  getIO().to(existing.section_id).emit('check-updated', check);
  res.json(check);
});

router.delete('/:id', (req: Request, res: Response) => {
  const existing = dbGet<any>('SELECT * FROM checks WHERE id = ?', [req.params.id]);
  if (!existing) { res.status(404).json({ error: 'Check not found' }); return; }
  dbRun('DELETE FROM checks WHERE id = ?', [req.params.id]);
  getIO().to(existing.section_id).emit('check-deleted', { id: req.params.id });
  res.json({ ok: true });
});

export default router;
