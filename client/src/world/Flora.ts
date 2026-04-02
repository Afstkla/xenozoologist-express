import * as THREE from 'three';
import { PRNG } from '../utils/PRNG';
import { BiomeConfig } from './Biome';

export interface FloraParams {
  height: number;
  segments: number;
  branches: number;
  branchAngle: number;
  branchLength: number;
  topScale: number;
  topShape: 'sphere' | 'disc' | 'cone' | 'cluster';
  glowIntensity: number;
  pulseSpeed: number;
  color: THREE.Color;
  accentColor: THREE.Color;
}

export interface FloraInstance {
  mesh: THREE.Group;
  params: FloraParams;
}

function makeParams(rng: PRNG, biome: BiomeConfig): FloraParams {
  const [, , accent1, accent2] = biome.palette;

  // Derive colors from biome palette with slight HSL shifts
  const baseHSL = { h: 0, s: 0, l: 0 };
  biome.palette[1].getHSL(baseHSL);
  const hShift = rng.range(-0.08, 0.08);
  const sShift = rng.range(-0.15, 0.15);
  const lShift = rng.range(-0.1, 0.1);
  const color = new THREE.Color().setHSL(
    (baseHSL.h + hShift + 1) % 1,
    Math.max(0.1, Math.min(1, baseHSL.s + sShift)),
    Math.max(0.05, Math.min(0.9, baseHSL.l + lShift))
  );

  // Accent derived from accent1 or accent2
  const accentBase = rng.next() > 0.5 ? accent1 : accent2;
  const accentHSL = { h: 0, s: 0, l: 0 };
  accentBase.getHSL(accentHSL);
  const accentColor = new THREE.Color().setHSL(
    (accentHSL.h + rng.range(-0.05, 0.05) + 1) % 1,
    Math.max(0.4, Math.min(1, accentHSL.s + rng.range(-0.1, 0.1))),
    Math.max(0.3, Math.min(0.8, accentHSL.l + rng.range(-0.1, 0.1)))
  );

  return {
    height: rng.range(0.5, 4),
    segments: rng.int(2, 6),
    branches: rng.int(0, 5),
    branchAngle: rng.range(0.3, 1.1),
    branchLength: rng.range(0.3, 1.2),
    topScale: rng.range(0.3, 2.0),
    topShape: rng.pick(['sphere', 'disc', 'cone', 'cluster'] as const),
    glowIntensity: rng.range(0, 0.8),
    pulseSpeed: rng.range(0.5, 3),
    color,
    accentColor,
  };
}

function buildTrunk(params: FloraParams): { group: THREE.Group; segmentYPositions: number[] } {
  const group = new THREE.Group();
  const segmentYPositions: number[] = [];

  const segH = params.height / params.segments;
  let currentY = 0;

  for (let i = 0; i < params.segments; i++) {
    const taper = 1 - (i / params.segments) * 0.6;
    const radiusBottom = 0.06 * taper * (1 + 0.3);
    const radiusTop = 0.06 * (1 - ((i + 1) / params.segments) * 0.6);

    const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, segH, 6, 1);
    const mat = new THREE.MeshToonMaterial({ color: params.color });
    const seg = new THREE.Mesh(geo, mat);
    seg.castShadow = true;

    // Slight random bend per segment
    seg.position.y = currentY + segH / 2;
    seg.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.05;
    seg.rotation.x = (i % 3 === 0 ? 1 : -1) * 0.03;

    group.add(seg);
    segmentYPositions.push(currentY + segH);
    currentY += segH;
  }

  return { group, segmentYPositions };
}

function buildCrown(params: FloraParams): THREE.Mesh | THREE.Group {
  const mat = new THREE.MeshToonMaterial({
    color: params.accentColor,
    emissive: params.accentColor,
    emissiveIntensity: params.glowIntensity,
  });

  const s = params.topScale;

  if (params.topShape === 'sphere') {
    const geo = new THREE.SphereGeometry(0.3 * s, 8, 6);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.isGlow = true;
    mesh.castShadow = true;
    return mesh;
  }

  if (params.topShape === 'disc') {
    const geo = new THREE.CylinderGeometry(0.5 * s, 0.25 * s, 0.12 * s, 8, 1);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.isGlow = true;
    mesh.castShadow = true;
    return mesh;
  }

  if (params.topShape === 'cone') {
    const geo = new THREE.ConeGeometry(0.35 * s, 0.6 * s, 7, 1);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.isGlow = true;
    mesh.castShadow = true;
    return mesh;
  }

  // cluster
  const group = new THREE.Group();
  const count = 4 + Math.floor(s * 2);
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const radius = 0.2 * s;
    const geo = new THREE.SphereGeometry(0.1 * s, 5, 4);
    const sphere = new THREE.Mesh(geo, mat);
    sphere.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle * 0.5) * 0.1,
      Math.sin(angle) * radius
    );
    sphere.userData.isGlow = true;
    sphere.castShadow = true;
    group.add(sphere);
  }
  return group;
}

function buildBranch(params: FloraParams, segIndex: number, totalSegments: number): THREE.Group {
  const branchGroup = new THREE.Group();
  const mat = new THREE.MeshToonMaterial({ color: params.color });

  const branchH = params.branchLength * 0.5;
  const taper = 1 - (segIndex / totalSegments) * 0.7;
  const geo = new THREE.CylinderGeometry(0.025 * taper, 0.04 * taper, branchH, 5, 1);
  const branchMesh = new THREE.Mesh(geo, mat);
  branchMesh.castShadow = true;

  // Orient branch: tilt outward at branchAngle, center at midpoint
  branchMesh.position.y = branchH / 2;
  branchGroup.add(branchMesh);

  // Small accent tip
  const tipMat = new THREE.MeshToonMaterial({
    color: params.accentColor,
    emissive: params.accentColor,
    emissiveIntensity: params.glowIntensity * 0.6,
  });
  const tipGeo = new THREE.SphereGeometry(0.06 * params.topScale * 0.5, 5, 4);
  const tip = new THREE.Mesh(tipGeo, tipMat);
  tip.userData.isGlow = true;
  tip.position.y = branchH;
  branchGroup.add(tip);

  return branchGroup;
}

function buildPlant(rng: PRNG, params: FloraParams): THREE.Group {
  const plant = new THREE.Group();

  // Store animation data on the root group
  plant.userData.pulseSpeed = params.pulseSpeed;
  plant.userData.glowIntensity = params.glowIntensity;
  plant.userData.swayOffset = rng.range(0, Math.PI * 2);

  const { group: trunk, segmentYPositions } = buildTrunk(params);
  plant.add(trunk);

  // Add branches at random segments (avoid the very top segment)
  if (params.branches > 0 && params.segments > 1) {
    const availableSegments = params.segments - 1;
    const branchCount = Math.min(params.branches, availableSegments * 2);

    for (let b = 0; b < branchCount; b++) {
      const segIdx = rng.int(0, availableSegments - 1);
      const branchY = segmentYPositions[segIdx] ?? 0;
      const branchAngleY = rng.range(0, Math.PI * 2);

      const branch = buildBranch(params, segIdx, params.segments);
      branch.position.y = branchY - (params.height / params.segments) * 0.3;
      branch.rotation.y = branchAngleY;
      branch.rotation.z = Math.PI / 2 - params.branchAngle;
      plant.add(branch);
    }
  }

  // Crown at the top
  const topY = params.height;
  const crown = buildCrown(params);
  crown.position.y = topY;
  plant.add(crown);

  return plant;
}

export function generateFlora(
  rng: PRNG,
  biome: BiomeConfig,
  getTerrainHeight: (x: number, z: number) => number,
  terrainSize: number
): FloraInstance[] {
  const count = Math.floor(terrainSize * terrainSize * biome.floraFrequency * 0.001);
  const flora: FloraInstance[] = [];
  const halfSize = terrainSize / 2;

  for (let i = 0; i < count; i++) {
    const plantRng = rng.fork(`plant_${i}`);
    const params = makeParams(plantRng.fork('params'), biome);
    const mesh = buildPlant(plantRng.fork('build'), params);

    const x = rng.range(-halfSize * 0.9, halfSize * 0.9);
    const z = rng.range(-halfSize * 0.9, halfSize * 0.9);
    const y = getTerrainHeight(x, z);

    mesh.position.set(x, y, z);
    mesh.rotation.y = rng.range(0, Math.PI * 2);
    const scale = rng.range(0.7, 1.3);
    mesh.scale.setScalar(scale);

    flora.push({ mesh, params });
  }

  return flora;
}

export function updateFlora(flora: FloraInstance[], time: number): void {
  for (const { mesh } of flora) {
    const swayOffset: number = mesh.userData.swayOffset ?? 0;
    const pulseSpeed: number = mesh.userData.pulseSpeed ?? 1;
    const glowIntensity: number = mesh.userData.glowIntensity ?? 0.3;

    // Gentle sway
    const swayX = Math.sin(time * 0.8 + swayOffset) * 0.015;
    const swayZ = Math.cos(time * 0.6 + swayOffset * 1.3) * 0.01;
    mesh.rotation.x = swayX;
    mesh.rotation.z = swayZ;

    // Glow pulsing on emissive materials
    const pulse = (Math.sin(time * pulseSpeed + swayOffset) * 0.5 + 0.5);
    const emissiveValue = glowIntensity * (0.4 + 0.6 * pulse);

    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.isGlow) {
        const mat = child.material as THREE.MeshToonMaterial;
        mat.emissiveIntensity = emissiveValue;
      }
    });
  }
}
