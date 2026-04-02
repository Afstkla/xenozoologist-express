import { describe, it, expect, beforeEach } from 'vitest';
import { createDb, DbInstance } from '../server/db';

describe('Catalog Database', () => {
  let db: DbInstance;

  beforeEach(() => {
    db = createDb(':memory:');
  });

  it('starts with empty catalog', () => {
    expect(db.getCatalogCount()).toBe(0);
    expect(db.getCatalog(100, 0)).toEqual([]);
  });

  it('adds a discovery', () => {
    db.addDiscovery({
      speciesId: 'abc12345',
      name: 'Zyxanus glimfera',
      discoverer: 'TestPlayer',
      bodyType: 'quadruped',
      headType: 'round',
      limbCount: 4,
      colorHue: 180,
      behavior: 'grazing',
      biomeType: 'fungal_forest',
      rarity: 0.3,
    });
    expect(db.getCatalogCount()).toBe(1);
    const [entry] = db.getCatalog(100, 0);
    expect(entry.speciesId).toBe('abc12345');
    expect(entry.discoverer).toBe('TestPlayer');
  });

  it('rejects duplicate species IDs', () => {
    const disc = {
      speciesId: 'abc12345', name: 'Test', discoverer: 'A',
      bodyType: 'quadruped', headType: 'round', limbCount: 4,
      colorHue: 180, behavior: 'grazing', biomeType: 'fungal_forest', rarity: 0.3,
    };
    db.addDiscovery(disc);
    expect(() => db.addDiscovery(disc)).toThrow();
  });

  it('checks if species is known', () => {
    expect(db.isSpeciesKnown('abc12345')).toBe(false);
    db.addDiscovery({
      speciesId: 'abc12345', name: 'Test', discoverer: 'A',
      bodyType: 'quadruped', headType: 'round', limbCount: 4,
      colorHue: 180, behavior: 'grazing', biomeType: 'fungal_forest', rarity: 0.3,
    });
    expect(db.isSpeciesKnown('abc12345')).toBe(true);
  });

  it('tracks leaderboard scores', () => {
    db.addScore('Alice', 500);
    db.addScore('Bob', 300);
    db.addScore('Alice', 200);
    const board = db.getLeaderboard(10);
    expect(board[0].player).toBe('Alice');
    expect(board[0].totalScore).toBe(700);
    expect(board[1].player).toBe('Bob');
  });
});
