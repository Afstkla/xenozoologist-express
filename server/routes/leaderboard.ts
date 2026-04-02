import { Router } from 'express';
import { DbInstance } from '../db';

export function leaderboardRouter(db: DbInstance): Router {
  const router = Router();

  router.get('/api/leaderboard', (req, res) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const board = db.getLeaderboard(limit);
    res.json({ leaderboard: board });
  });

  router.post('/api/leaderboard', (req, res) => {
    const { player, points } = req.body;
    if (!player || typeof points !== 'number') {
      res.status(400).json({ error: 'Missing player or points' });
      return;
    }
    db.addScore(player, points);
    res.status(201).json({ success: true });
  });

  return router;
}
