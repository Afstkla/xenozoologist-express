import type { Challenge, RoundResult } from '../network/Protocol';
import { PRNG } from '../utils/PRNG';

export { Challenge, RoundResult };

export const ROUND_DURATION = 240; // 4 minutes in seconds

export interface RoundState {
  seed: number;
  timeRemaining: number;
  duration: number;
  challenges: Challenge[];
  completedChallenges: Map<string, string>; // challengeId -> winner username
  playerScores: Map<string, number>;
  playerDiscoveries: Map<string, { total: number; new: number }>;
  isActive: boolean;
}

// Challenge templates
const CHALLENGE_TEMPLATES: Array<{
  description: string;
  criteria: string;
  bonusPoints: number;
}> = [
  { description: 'Scan a flying creature', criteria: 'behavior:flying', bonusPoints: 150 },
  { description: 'Scan a swimming creature', criteria: 'behavior:swimming', bonusPoints: 150 },
  { description: 'Scan a burrowing creature', criteria: 'behavior:burrowing', bonusPoints: 175 },
  { description: 'Scan a grazing creature', criteria: 'behavior:grazing', bonusPoints: 100 },
  { description: 'Make a new discovery first', criteria: 'new-discovery', bonusPoints: 200 },
  { description: 'Scan 3 different species', criteria: 'scan-count:3', bonusPoints: 125 },
  { description: 'Scan 5 different species', criteria: 'scan-count:5', bonusPoints: 200 },
  { description: 'Scan a rare species (rarity > 0.4)', criteria: 'rarity:0.4', bonusPoints: 175 },
  { description: 'Scan an ultra-rare species (rarity > 0.7)', criteria: 'rarity:0.7', bonusPoints: 300 },
];

/**
 * Calculate points for a scan.
 * @param isNew - Whether this is a first-time global discovery
 * @param rarity - Species rarity [0,1]
 * @param catalogSize - Number of species already in catalog
 * @param totalPossibleSpecies - Maximum species count for the biome
 */
export function calculatePoints(
  isNew: boolean,
  rarity: number,
  catalogSize: number,
  totalPossibleSpecies: number
): number {
  // Base points: new discoveries worth more
  const basePoints = isNew ? 100 : 20;

  // Rarity multiplier: scales from 1x (common) to 3x (rare)
  const rarityMultiplier = 1 + rarity * 2;

  // Scarcity bonus: more points as catalog fills up (late-game pressure)
  const catalogFill = totalPossibleSpecies > 0 ? catalogSize / totalPossibleSpecies : 0;
  const scarcityMultiplier = 1 + catalogFill * 2;

  return Math.round(basePoints * rarityMultiplier * scarcityMultiplier);
}

/**
 * Generate 2-3 challenges for a round using the given PRNG.
 */
export function generateChallenges(rng: PRNG): Challenge[] {
  const count = rng.int(2, 3);
  const shuffled = rng.shuffle(CHALLENGE_TEMPLATES);
  return shuffled.slice(0, count).map((template, i) => ({
    id: `challenge-${i}`,
    description: template.description,
    criteria: template.criteria,
    bonusPoints: template.bonusPoints,
  }));
}

/**
 * Create a new round state from a seed.
 */
export function createRound(seed: number): RoundState {
  const rng = new PRNG(seed);
  const challenges = generateChallenges(rng);

  return {
    seed,
    timeRemaining: ROUND_DURATION,
    duration: ROUND_DURATION,
    challenges,
    completedChallenges: new Map(),
    playerScores: new Map(),
    playerDiscoveries: new Map(),
    isActive: true,
  };
}

/**
 * Advance round time by dt seconds. Returns true if the round just ended.
 */
export function updateRound(state: RoundState, dt: number): boolean {
  if (!state.isActive) return false;

  state.timeRemaining -= dt;
  if (state.timeRemaining <= 0) {
    state.timeRemaining = 0;
    state.isActive = false;
    return true;
  }
  return false;
}

interface ScanTraits {
  behavior?: string;
  rarity?: number;
}

/**
 * Record a scan in the round state and check if any challenge was won.
 * Returns the challenge ID if a challenge was won, otherwise null.
 */
export function addScanToRound(
  state: RoundState,
  player: string,
  isNew: boolean,
  points: number,
  speciesTraits: ScanTraits
): string | null {
  // Update player score
  state.playerScores.set(player, (state.playerScores.get(player) ?? 0) + points);

  // Update player discovery counts
  const disc = state.playerDiscoveries.get(player) ?? { total: 0, new: 0 };
  disc.total += 1;
  if (isNew) disc.new += 1;
  state.playerDiscoveries.set(player, disc);

  // Check challenges
  for (const challenge of state.challenges) {
    if (state.completedChallenges.has(challenge.id)) continue;

    let won = false;
    const [criteriaType, criteriaValue] = challenge.criteria.split(':');

    switch (criteriaType) {
      case 'behavior':
        won = speciesTraits.behavior === criteriaValue;
        break;

      case 'new-discovery':
        won = isNew;
        break;

      case 'scan-count': {
        const threshold = parseInt(criteriaValue, 10);
        won = disc.total >= threshold;
        break;
      }

      case 'rarity': {
        const threshold = parseFloat(criteriaValue);
        won = (speciesTraits.rarity ?? 0) >= threshold;
        break;
      }
    }

    if (won) {
      state.completedChallenges.set(challenge.id, player);
      state.playerScores.set(player, (state.playerScores.get(player) ?? 0) + challenge.bonusPoints);
      return challenge.id;
    }
  }

  return null;
}

/**
 * Compile final results for all players.
 */
export function getRoundResults(state: RoundState): RoundResult[] {
  const allPlayers = new Set([
    ...state.playerScores.keys(),
    ...state.playerDiscoveries.keys(),
  ]);

  const results: RoundResult[] = [];

  for (const player of allPlayers) {
    const disc = state.playerDiscoveries.get(player) ?? { total: 0, new: 0 };
    const score = state.playerScores.get(player) ?? 0;
    const challengesWon = Array.from(state.completedChallenges.values()).filter(
      (winner) => winner === player
    ).length;

    results.push({
      player,
      discoveries: disc.total,
      newDiscoveries: disc.new,
      score,
      challengesWon,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}
