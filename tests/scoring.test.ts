import { describe, it, expect } from 'vitest';
import { calculatePoints, generateChallenges } from '../client/src/game/Round';
import { PRNG } from '../client/src/utils/PRNG';

describe('Scoring', () => {
  it('new discoveries worth more than re-scans', () => {
    const newPoints = calculatePoints(true, 0.5, 0, 5000);
    const rescanPoints = calculatePoints(false, 0.5, 0, 5000);
    expect(newPoints).toBeGreaterThan(rescanPoints);
  });

  it('rare species worth more than common', () => {
    const common = calculatePoints(true, 0.1, 0, 5000);
    const rare = calculatePoints(true, 0.8, 0, 5000);
    expect(rare).toBeGreaterThan(common);
  });

  it('late-game discoveries worth more', () => {
    const early = calculatePoints(true, 0.5, 10, 5000);
    const late = calculatePoints(true, 0.5, 4000, 5000);
    expect(late).toBeGreaterThan(early);
  });

  it('generates 2-3 challenges per round', () => {
    const rng = new PRNG(42);
    const challenges = generateChallenges(rng);
    expect(challenges.length).toBeGreaterThanOrEqual(2);
    expect(challenges.length).toBeLessThanOrEqual(3);
    expect(challenges[0].description).toBeTruthy();
  });
});
