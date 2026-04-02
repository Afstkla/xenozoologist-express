import { createNoise2D, createNoise3D } from 'simplex-noise';
import { PRNG } from './PRNG';

export function seededNoise2D(rng: PRNG): (x: number, y: number) => number {
  return createNoise2D(() => rng.next());
}

export function seededNoise3D(rng: PRNG): (x: number, y: number, z: number) => number {
  return createNoise3D(() => rng.next());
}

export function fractalNoise2D(
  noiseFn: (x: number, y: number) => number,
  x: number, y: number,
  octaves: number = 4,
  lacunarity: number = 2.0,
  persistence: number = 0.5,
): number {
  let value = 0, amplitude = 1, frequency = 1, maxAmplitude = 0;
  for (let i = 0; i < octaves; i++) {
    value += noiseFn(x * frequency, y * frequency) * amplitude;
    maxAmplitude += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }
  return value / maxAmplitude;
}
