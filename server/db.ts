import Database from 'better-sqlite3';

export interface DiscoveryInput {
  speciesId: string;
  name: string;
  discoverer: string;
  bodyType: string;
  headType: string;
  limbCount: number;
  colorHue: number;
  behavior: string;
  biomeType: string;
  rarity: number;
}

export interface CatalogEntry extends DiscoveryInput {
  discoveredAt: string;
}

export interface LeaderboardEntry {
  player: string;
  totalScore: number;
}

export interface DbInstance {
  addDiscovery(input: DiscoveryInput): void;
  getCatalog(limit: number, offset: number): CatalogEntry[];
  getCatalogCount(): number;
  isSpeciesKnown(speciesId: string): boolean;
  addScore(player: string, points: number): void;
  getLeaderboard(limit: number): LeaderboardEntry[];
}

export function createDb(path: string): DbInstance {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS catalog (
      speciesId TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      discoverer TEXT NOT NULL,
      bodyType TEXT NOT NULL,
      headType TEXT NOT NULL,
      limbCount INTEGER NOT NULL,
      colorHue INTEGER NOT NULL,
      behavior TEXT NOT NULL,
      biomeType TEXT NOT NULL,
      rarity REAL NOT NULL,
      discoveredAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player TEXT NOT NULL,
      points INTEGER NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS lobbies (
      id TEXT PRIMARY KEY,
      hostToken TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const stmts = {
    addDiscovery: db.prepare(`
      INSERT INTO catalog (speciesId, name, discoverer, bodyType, headType, limbCount, colorHue, behavior, biomeType, rarity)
      VALUES (@speciesId, @name, @discoverer, @bodyType, @headType, @limbCount, @colorHue, @behavior, @biomeType, @rarity)
    `),
    getCatalog: db.prepare('SELECT * FROM catalog ORDER BY discoveredAt DESC LIMIT ? OFFSET ?'),
    getCatalogCount: db.prepare('SELECT COUNT(*) as count FROM catalog'),
    isSpeciesKnown: db.prepare('SELECT 1 FROM catalog WHERE speciesId = ?'),
    addScore: db.prepare('INSERT INTO scores (player, points) VALUES (?, ?)'),
    getLeaderboard: db.prepare(`
      SELECT player, SUM(points) as totalScore FROM scores
      GROUP BY player ORDER BY totalScore DESC LIMIT ?
    `),
  };

  return {
    addDiscovery(input: DiscoveryInput) { stmts.addDiscovery.run(input); },
    getCatalog(limit: number, offset: number): CatalogEntry[] {
      return stmts.getCatalog.all(limit, offset) as CatalogEntry[];
    },
    getCatalogCount(): number {
      return (stmts.getCatalogCount.get() as { count: number }).count;
    },
    isSpeciesKnown(speciesId: string): boolean {
      return !!stmts.isSpeciesKnown.get(speciesId);
    },
    addScore(player: string, points: number) { stmts.addScore.run(player, points); },
    getLeaderboard(limit: number): LeaderboardEntry[] {
      return stmts.getLeaderboard.all(limit) as LeaderboardEntry[];
    },
  };
}
