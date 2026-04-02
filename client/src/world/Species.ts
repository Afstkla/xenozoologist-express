import { PRNG } from '../utils/PRNG';

export type BiomeType = 'fungal_forest' | 'crystal_desert' | 'toxic_marsh' | 'floating_reef' | 'volcanic_glass';
export type BodyType = 'quadruped' | 'biped' | 'serpent' | 'insectoid' | 'floating' | 'blob';
export type HeadType = 'round' | 'bulb' | 'elongated' | 'crystalline' | 'flat' | 'tentacled';
export type Behavior = 'grazing' | 'flying' | 'burrowing' | 'schooling' | 'aggressive' | 'shy';

export interface SpeciesDefinition {
  bodyType: BodyType;
  headType: HeadType;
  limbCount: number;
  colorHue: number;
  behavior: Behavior;
  biomeType: BiomeType;
}

export interface Species {
  id: string;
  name: string;
  definition: SpeciesDefinition;
  rarity: number;
}

export function generateSpeciesId(def: SpeciesDefinition): string {
  const raw = `${def.bodyType}:${def.headType}:${def.limbCount}:${Math.round(def.colorHue)}:${def.behavior}:${def.biomeType}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

const PREFIXES = ['Zyx', 'Krel', 'Vorn', 'Thex', 'Qua', 'Pli', 'Murn', 'Glov', 'Dra', 'Fen', 'Ix', 'Bol', 'Sar', 'Nex', 'Rul', 'Whi', 'Cha', 'Elu', 'Oph', 'Tra'];
const MIDDLES = ['an', 'or', 'is', 'el', 'um', 'ax', 'ib', 'on', 'eth', 'al', 'us', 'ar', 'inth', 'op'];
const SUFFIXES = ['us', 'is', 'ax', 'on', 'um', 'yx', 'ia', 'os', 'ens', 'oid', 'rix', 'ex'];
const SPECIES_PREFIXES = ['glim', 'spo', 'cri', 'vel', 'nub', 'rhi', 'flu', 'tor', 'pla', 'xen', 'lum', 'ber', 'cal', 'dex', 'mir'];
const SPECIES_SUFFIXES = ['fera', 'cens', 'tans', 'alis', 'inus', 'orum', 'ella', 'atus', 'ipes', 'odon', 'aris', 'ulans'];

export function generateSpeciesName(rng: PRNG): string {
  const genus = rng.pick(PREFIXES) + rng.pick(MIDDLES) + rng.pick(SUFFIXES);
  const species = rng.pick(SPECIES_PREFIXES) + rng.pick(SPECIES_SUFFIXES);
  return `${genus} ${species}`;
}

const BODY_RARITY: Record<BodyType, number> = {
  quadruped: 0.1, biped: 0.15, serpent: 0.2, insectoid: 0.25, blob: 0.4, floating: 0.6,
};
const HEAD_RARITY: Record<HeadType, number> = {
  round: 0.1, flat: 0.15, bulb: 0.2, elongated: 0.25, tentacled: 0.4, crystalline: 0.6,
};
const BEHAVIOR_RARITY: Record<Behavior, number> = {
  grazing: 0.05, schooling: 0.1, flying: 0.2, aggressive: 0.3, shy: 0.4, burrowing: 0.5,
};

export function computeRarity(def: SpeciesDefinition): number {
  const raw = BODY_RARITY[def.bodyType] + HEAD_RARITY[def.headType] + BEHAVIOR_RARITY[def.behavior];
  return Math.min(raw / 1.7, 1);
}

export function generateSpecies(rng: PRNG, biomeType: BiomeType): Species {
  const bodyTypes: BodyType[] = ['quadruped', 'biped', 'serpent', 'insectoid', 'floating', 'blob'];
  const headTypes: HeadType[] = ['round', 'bulb', 'elongated', 'crystalline', 'flat', 'tentacled'];
  const behaviors: Behavior[] = ['grazing', 'flying', 'burrowing', 'schooling', 'aggressive', 'shy'];

  const bodyWeights = bodyTypes.map(b => 1 / (1 + BODY_RARITY[b] * 5));
  const headWeights = headTypes.map(h => 1 / (1 + HEAD_RARITY[h] * 5));
  const behaviorWeights = behaviors.map(b => 1 / (1 + BEHAVIOR_RARITY[b] * 5));

  const definition: SpeciesDefinition = {
    bodyType: rng.weighted(bodyTypes, bodyWeights),
    headType: rng.weighted(headTypes, headWeights),
    limbCount: rng.int(0, 8),
    colorHue: Math.round(rng.range(0, 360)),
    behavior: rng.weighted(behaviors, behaviorWeights),
    biomeType,
  };

  const nameRng = rng.fork(generateSpeciesId(definition));

  return {
    id: generateSpeciesId(definition),
    name: generateSpeciesName(nameRng),
    definition,
    rarity: computeRarity(definition),
  };
}
