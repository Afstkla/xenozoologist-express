import { describe, it, expect } from 'vitest';
import { generateSpeciesId, generateSpeciesName, SpeciesDefinition, computeRarity } from '../client/src/world/Species';
import { PRNG } from '../client/src/utils/PRNG';

describe('Species', () => {
  it('generates deterministic species ID from traits', () => {
    const def: SpeciesDefinition = {
      bodyType: 'quadruped',
      headType: 'bulb',
      limbCount: 4,
      colorHue: 180,
      behavior: 'grazing',
      biomeType: 'fungal_forest',
    };
    const id1 = generateSpeciesId(def);
    const id2 = generateSpeciesId(def);
    expect(id1).toBe(id2);
  });

  it('different traits produce different IDs', () => {
    const a = generateSpeciesId({ bodyType: 'quadruped', headType: 'bulb', limbCount: 4, colorHue: 180, behavior: 'grazing', biomeType: 'fungal_forest' });
    const b = generateSpeciesId({ bodyType: 'serpent', headType: 'bulb', limbCount: 0, colorHue: 180, behavior: 'grazing', biomeType: 'fungal_forest' });
    expect(a).not.toBe(b);
  });

  it('generates pronounceable species names from PRNG', () => {
    const rng = new PRNG(42);
    const name = generateSpeciesName(rng);
    expect(name.length).toBeGreaterThan(3);
    expect(name.length).toBeLessThan(20);
    expect(name.split(' ')).toHaveLength(2);
  });

  it('species name is deterministic from seed', () => {
    const a = generateSpeciesName(new PRNG(42));
    const b = generateSpeciesName(new PRNG(42));
    expect(a).toBe(b);
  });

  it('rarity increases with more trait combinations', () => {
    const common = computeRarity({ bodyType: 'quadruped', headType: 'round', limbCount: 4, colorHue: 120, behavior: 'grazing', biomeType: 'fungal_forest' });
    const rare = computeRarity({ bodyType: 'floating', headType: 'crystalline', limbCount: 0, colorHue: 300, behavior: 'burrowing', biomeType: 'volcanic_glass' });
    expect(rare).toBeGreaterThan(common);
  });
});
