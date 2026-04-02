import { Router } from 'express';
import { DbInstance } from '../db';

export function catalogRouter(db: DbInstance): Router {
  const router = Router();

  router.get('/api/catalog', (req, res) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const entries = db.getCatalog(limit, offset);
    const total = db.getCatalogCount();
    res.json({ entries, total, limit, offset });
  });

  router.post('/api/catalog', (req, res) => {
    const { speciesId, name, discoverer, bodyType, headType, limbCount, colorHue, behavior, biomeType, rarity } = req.body;
    if (!speciesId || !name || !discoverer) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    if (db.isSpeciesKnown(speciesId)) {
      res.status(409).json({ error: 'Species already cataloged', speciesId });
      return;
    }
    try {
      db.addDiscovery({ speciesId, name, discoverer, bodyType, headType, limbCount, colorHue, behavior, biomeType, rarity });
      const total = db.getCatalogCount();
      res.status(201).json({ success: true, speciesId, total });
    } catch {
      res.status(500).json({ error: 'Failed to add discovery' });
    }
  });

  router.get('/api/catalog/count', (_req, res) => {
    res.json({ count: db.getCatalogCount() });
  });

  router.get('/api/catalog/check/:speciesId', (req, res) => {
    res.json({ known: db.isSpeciesKnown(req.params.speciesId) });
  });

  return router;
}
