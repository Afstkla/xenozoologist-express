import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createDb } from './db.js';
import { catalogRouter } from './routes/catalog.js';
import { leaderboardRouter } from './routes/leaderboard.js';
import { setupSignaling } from './signaling.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const PORT = parseInt(process.env.PORT || '7755');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

// Initialize database
const db = createDb(path.join(dataDir, 'xenozoologist.db'));

app.use(express.json());

// API routes
app.use(catalogRouter(db));
app.use(leaderboardRouter(db));

// In production, serve the built client
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', game: 'Xenozoologist Express', catalogSize: db.getCatalogCount() });
});

// SPA fallback
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

setupSignaling(server);

server.listen(PORT, () => {
  console.log(`Xenozoologist Express server running on port ${PORT}`);
});

export { server, db };
