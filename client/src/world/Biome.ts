import * as THREE from 'three';
import { BiomeType } from './Species';
import { PRNG } from '../utils/PRNG';

export interface BiomeConfig {
  type: BiomeType;
  name: string;
  baseHue: number;
  palette: THREE.Color[];   // 5 colors: ground low, ground high, accent1, accent2, sky/fog
  fogDensity: number;
  terrainScale: number;
  terrainOctaves: number;
  floraFrequency: number;
  faunaCount: number;
}

const BIOME_TEMPLATES: Record<BiomeType, Omit<BiomeConfig, 'palette'> & { baseHue: number }> = {
  fungal_forest: {
    type: 'fungal_forest', name: 'Fungal Forest', baseHue: 280,
    fogDensity: 0.04, terrainScale: 8, terrainOctaves: 5, floraFrequency: 0.3, faunaCount: 25,
  },
  crystal_desert: {
    type: 'crystal_desert', name: 'Crystal Desert', baseHue: 190,
    fogDensity: 0.02, terrainScale: 4, terrainOctaves: 3, floraFrequency: 0.08, faunaCount: 18,
  },
  toxic_marsh: {
    type: 'toxic_marsh', name: 'Toxic Marsh', baseHue: 90,
    fogDensity: 0.06, terrainScale: 3, terrainOctaves: 4, floraFrequency: 0.25, faunaCount: 22,
  },
  floating_reef: {
    type: 'floating_reef', name: 'Floating Reef', baseHue: 200,
    fogDensity: 0.03, terrainScale: 12, terrainOctaves: 4, floraFrequency: 0.2, faunaCount: 28,
  },
  volcanic_glass: {
    type: 'volcanic_glass', name: 'Volcanic Glass Fields', baseHue: 15,
    fogDensity: 0.035, terrainScale: 10, terrainOctaves: 5, floraFrequency: 0.05, faunaCount: 15,
  },
};

function generatePalette(rng: PRNG, baseHue: number): THREE.Color[] {
  const hueShift = rng.range(-20, 20);
  const h = (baseHue + hueShift) / 360;
  return [
    new THREE.Color().setHSL(h, 0.4, 0.15),
    new THREE.Color().setHSL(h, 0.5, 0.3),
    new THREE.Color().setHSL((h + 0.15) % 1, 0.7, 0.5),
    new THREE.Color().setHSL((h + 0.4) % 1, 0.6, 0.6),
    new THREE.Color().setHSL(h, 0.3, 0.08),
  ];
}

export function createBiome(rng: PRNG): BiomeConfig {
  const biomeTypes: BiomeType[] = ['fungal_forest', 'crystal_desert', 'toxic_marsh', 'floating_reef', 'volcanic_glass'];
  const type = rng.pick(biomeTypes);
  const template = BIOME_TEMPLATES[type];
  const palette = generatePalette(rng.fork('palette'), template.baseHue);
  return { ...template, palette };
}
