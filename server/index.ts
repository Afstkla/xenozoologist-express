import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const PORT = parseInt(process.env.PORT || '7755');

app.use(express.json());

// In production, serve the built client
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', game: 'Xenozoologist Express' });
});

// SPA fallback
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

server.listen(PORT, () => {
  console.log(`Xenozoologist Express server running on port ${PORT}`);
});
