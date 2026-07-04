import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbRun, dbGet, dbAll } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

const router = Router();

router.get('/game/:gameId', (req: Request, res: Response) => {
  const sections = dbAll<any>('SELECT * FROM sections WHERE game_id = ? ORDER BY created_at ASC', [req.params.gameId]);
  res.json(sections);
});

router.get('/:id', (req: Request, res: Response) => {
  const section = dbGet<any>('SELECT * FROM sections WHERE id = ?', [req.params.id]);
  if (!section) { res.status(404).json({ error: 'Section not found' }); return; }
  res.json(section);
});

router.post('/game/:gameId', (req: Request, res: Response) => {
  const { name, description } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: 'Name is required' }); return; }
  const game = dbGet<any>('SELECT id FROM games WHERE id = ?', [req.params.gameId]);
  if (!game) { res.status(404).json({ error: 'Game not found' }); return; }
  const id = uuidv4();
  const now = new Date().toISOString();
  dbRun('INSERT INTO sections (id, game_id, name, description, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, req.params.gameId, name.trim(), description?.trim() || '', now]);
  const section = dbGet<any>('SELECT * FROM sections WHERE id = ?', [id]);
  res.status(201).json(section);
});

router.put('/:id', (req: Request, res: Response) => {
  const { name, description } = req.body;
  const existing = dbGet<any>('SELECT * FROM sections WHERE id = ?', [req.params.id]);
  if (!existing) { res.status(404).json({ error: 'Section not found' }); return; }
  dbRun('UPDATE sections SET name = ?, description = ? WHERE id = ?',
    [name?.trim() || existing.name, description?.trim() ?? existing.description, req.params.id]);
  const section = dbGet<any>('SELECT * FROM sections WHERE id = ?', [req.params.id]);
  res.json(section);
});

router.post('/:id/map', upload.single('map'), (req: Request, res: Response) => {
  const existing = dbGet<any>('SELECT * FROM sections WHERE id = ?', [req.params.id]);
  if (!existing) { res.status(404).json({ error: 'Section not found' }); return; }
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }
  const mapImage = `/uploads/${req.file.filename}`;
  const mapWidth = parseFloat(req.body.width as string) || 0;
  const mapHeight = parseFloat(req.body.height as string) || 0;
  dbRun('UPDATE sections SET map_image = ?, map_width = ?, map_height = ? WHERE id = ?',
    [mapImage, mapWidth, mapHeight, req.params.id]);
  const section = dbGet<any>('SELECT * FROM sections WHERE id = ?', [req.params.id]);
  res.json(section);
});

router.delete('/:id', (req: Request, res: Response) => {
  const existing = dbGet<any>('SELECT * FROM sections WHERE id = ?', [req.params.id]);
  if (!existing) { res.status(404).json({ error: 'Section not found' }); return; }
  dbRun('DELETE FROM checks WHERE section_id = ?', [req.params.id]);
  dbRun('DELETE FROM sections WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

export default router;
