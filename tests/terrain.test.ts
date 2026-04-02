import { describe, it, expect } from 'vitest';
import { generateHeightmap } from '../client/src/world/Terrain';
import { PRNG } from '../client/src/utils/PRNG';

describe('Terrain', () => {
  it('generates deterministic heightmap from seed', () => {
    const a = generateHeightmap(new PRNG(42), 32);
    const b = generateHeightmap(new PRNG(42), 32);
    expect(a).toEqual(b);
  });

  it('different seeds produce different heightmaps', () => {
    const a = generateHeightmap(new PRNG(42), 32);
    const b = generateHeightmap(new PRNG(99), 32);
    expect(a).not.toEqual(b);
  });

  it('heightmap values are normalized to [0, 1]', () => {
    const hm = generateHeightmap(new PRNG(42), 64);
    for (const row of hm) {
      for (const v of row) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});
