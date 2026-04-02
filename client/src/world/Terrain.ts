import * as THREE from 'three';
import { PRNG } from '../utils/PRNG';
import { seededNoise2D, fractalNoise2D } from '../utils/noise';
import { BiomeConfig } from './Biome';

const TERRAIN_SIZE = 200;
const TERRAIN_SEGMENTS = 128;

export function generateHeightmap(rng: PRNG, resolution: number): number[][] {
  const noise = seededNoise2D(rng);
  const hm: number[][] = [];
  let min = Infinity, max = -Infinity;

  for (let z = 0; z < resolution; z++) {
    hm[z] = [];
    for (let x = 0; x < resolution; x++) {
      const nx = x / resolution;
      const nz = z / resolution;
      const v = fractalNoise2D(noise, nx * 3, nz * 3, 4);
      hm[z][x] = v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }

  const range = max - min || 1;
  for (let z = 0; z < resolution; z++) {
    for (let x = 0; x < resolution; x++) {
      hm[z][x] = (hm[z][x] - min) / range;
    }
  }
  return hm;
}

export function createTerrainMesh(rng: PRNG, biome: BiomeConfig): THREE.Mesh {
  const heightmap = generateHeightmap(rng, TERRAIN_SEGMENTS + 1);
  const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const [groundLow, groundHigh, accent1] = biome.palette;
  const tmpColor = new THREE.Color();

  for (let i = 0; i < positions.count; i++) {
    const x = Math.floor((i % (TERRAIN_SEGMENTS + 1)));
    const z = Math.floor(i / (TERRAIN_SEGMENTS + 1));
    const h = heightmap[z]?.[x] ?? 0;
    positions.setY(i, h * biome.terrainScale);
    tmpColor.lerpColors(groundLow, groundHigh, h);
    if (h > 0.7) tmpColor.lerp(accent1, (h - 0.7) / 0.3 * 0.5);
    colors[i * 3] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const material = new THREE.MeshToonMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

export { TERRAIN_SIZE, TERRAIN_SEGMENTS };
