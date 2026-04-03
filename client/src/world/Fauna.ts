import * as THREE from 'three';
import { PRNG } from '../utils/PRNG';
import { BiomeConfig } from './Biome';
import { Species, generateSpecies } from './Species';

export interface CreatureState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  targetDir: THREE.Vector3;
  wanderTimer: number;
  fleeTimer: number;
}

export interface CreatureInstance {
  mesh: THREE.Group;
  species: Species;
  state: CreatureState;
}

const FLEE_DISTANCE = 8;
const FLEE_SPEED_MULT = 2.5;

function buildCreatureMesh(rng: PRNG, species: Species): THREE.Group {
  const group = new THREE.Group();
  const def = species.definition;

  const hue = def.colorHue / 360;
  const accentHue = ((def.colorHue + 36) % 360) / 360; // +0.1 hue shift

  const bodyColor = new THREE.Color().setHSL(hue, 0.7, 0.5);
  const accentColor = new THREE.Color().setHSL(accentHue, 0.8, 0.55);

  const bodyMat = new THREE.MeshToonMaterial({ color: bodyColor });
  const accentMat = new THREE.MeshToonMaterial({ color: accentColor });

  // Body
  let bodyMesh: THREE.Mesh;
  let bodyHeight = 0.4;
  let bodyRadius = 0.25;

  switch (def.bodyType) {
    case 'quadruped':
    case 'biped': {
      const geo = new THREE.CapsuleGeometry(bodyRadius, bodyHeight, 4, 8);
      bodyMesh = new THREE.Mesh(geo, bodyMat);
      bodyMesh.rotation.x = Math.PI / 2; // horizontal capsule
      bodyMesh.position.y = bodyRadius + 0.1;
      break;
    }
    case 'serpent': {
      const geo = new THREE.CylinderGeometry(0.12, 0.18, 1.0, 7, 1);
      bodyMesh = new THREE.Mesh(geo, bodyMat);
      bodyMesh.rotation.z = Math.PI / 2; // horizontal
      bodyMesh.position.y = 0.2;
      bodyHeight = 0.2;
      bodyRadius = 0.15;
      break;
    }
    case 'insectoid': {
      const geo = new THREE.DodecahedronGeometry(0.28, 0);
      bodyMesh = new THREE.Mesh(geo, bodyMat);
      bodyMesh.position.y = 0.35;
      bodyHeight = 0.28;
      bodyRadius = 0.28;
      break;
    }
    case 'floating': {
      const geo = new THREE.SphereGeometry(0.32, 8, 6);
      bodyMesh = new THREE.Mesh(geo, bodyMat);
      bodyMesh.position.y = 0.4;
      bodyHeight = 0.32;
      bodyRadius = 0.32;
      break;
    }
    case 'blob':
    default: {
      const geo = new THREE.SphereGeometry(0.35, 7, 5);
      bodyMesh = new THREE.Mesh(geo, bodyMat);
      bodyMesh.scale.y = 0.65;
      bodyMesh.position.y = 0.3;
      bodyHeight = 0.35;
      bodyRadius = 0.35;
      break;
    }
  }

  bodyMesh.castShadow = true;
  group.add(bodyMesh);

  // Head
  const headOffsetY = bodyMesh.position.y + bodyHeight * 0.5 + 0.18;
  const headOffsetZ = -bodyRadius * 0.6;

  let headMesh: THREE.Mesh;
  switch (def.headType) {
    case 'round':
    case 'bulb': {
      const size = def.headType === 'bulb' ? 0.22 : 0.18;
      const geo = new THREE.SphereGeometry(size, 7, 6);
      headMesh = new THREE.Mesh(geo, bodyMat);
      break;
    }
    case 'elongated': {
      const geo = new THREE.CapsuleGeometry(0.12, 0.28, 4, 6);
      headMesh = new THREE.Mesh(geo, bodyMat);
      headMesh.rotation.x = Math.PI / 2;
      break;
    }
    case 'crystalline': {
      const geo = new THREE.OctahedronGeometry(0.2, 0);
      headMesh = new THREE.Mesh(geo, accentMat);
      break;
    }
    case 'flat': {
      const geo = new THREE.CylinderGeometry(0.22, 0.22, 0.1, 7, 1);
      headMesh = new THREE.Mesh(geo, bodyMat);
      break;
    }
    case 'tentacled':
    default: {
      const geo = new THREE.SphereGeometry(0.2, 7, 6);
      headMesh = new THREE.Mesh(geo, bodyMat);
      break;
    }
  }

  headMesh.position.set(0, headOffsetY, headOffsetZ);
  headMesh.castShadow = true;
  group.add(headMesh);

  // Eyes — big exaggerated proportions
  const eyeWhiteMat = new THREE.MeshToonMaterial({ color: 0xffffff });
  const eyePupilMat = new THREE.MeshToonMaterial({ color: 0x111111 });
  const eyeRadius = 0.09;
  const pupilRadius = 0.055;

  for (const side of [-1, 1]) {
    const eyeGroup = new THREE.Group();

    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius, 6, 5), eyeWhiteMat);
    const eyePupil = new THREE.Mesh(new THREE.SphereGeometry(pupilRadius, 5, 4), eyePupilMat);
    eyePupil.position.z = -eyeRadius * 0.55;

    eyeGroup.add(eyeWhite);
    eyeGroup.add(eyePupil);

    // Position on either side of head, slightly forward
    const headSize = 0.2;
    eyeGroup.position.set(
      side * headSize * 0.85,
      headOffsetY + headSize * 0.1,
      headOffsetZ - headSize * 0.5
    );

    group.add(eyeGroup);
  }

  // Limbs — skip for serpent and blob
  const skipLimbs = def.bodyType === 'serpent' || def.bodyType === 'blob' || def.bodyType === 'floating';
  if (!skipLimbs && def.limbCount > 0) {
    const pairCount = Math.floor(def.limbCount / 2);
    const limbMat = new THREE.MeshToonMaterial({ color: bodyColor });

    for (let p = 0; p < pairCount; p++) {
      const phase = (p / Math.max(pairCount, 1)) * 0.8 - 0.4; // spacing along body z
      const limbBaseY = bodyMesh.position.y - bodyHeight * 0.15;

      for (const side of [-1, 1]) {
        const limbGeo = new THREE.CylinderGeometry(0.04, 0.03, 0.4, 5, 1);
        const limb = new THREE.Mesh(limbGeo, limbMat);

        limb.position.set(
          side * (bodyRadius + 0.05),
          limbBaseY - 0.1,
          phase * bodyRadius * 2
        );
        limb.rotation.z = side * 0.25; // slight outward splay

        limb.userData.limbIndex = p;
        limb.userData.limbSide = side;
        limb.castShadow = true;

        group.add(limb);
      }
    }
  }

  // Determine speed from behavior
  const speedMap: Record<string, number> = {
    grazing: 1.5,
    flying: 3.0,
    burrowing: 1.0,
    schooling: 2.5,
    aggressive: 3.5,
    shy: 2.0,
  };
  const speed = speedMap[def.behavior] ?? 2.0;

  // Tag the mesh
  group.userData.isCreature = true;
  group.userData.speciesId = species.id;
  group.userData.speed = speed;

  return group;
}

export function spawnCreatures(
  rng: PRNG,
  biome: BiomeConfig,
  getTerrainHeight: (x: number, z: number) => number,
  terrainSize: number
): CreatureInstance[] {
  const creatures: CreatureInstance[] = [];
  const halfSize = terrainSize / 2;
  const count = biome.faunaCount;

  for (let i = 0; i < count; i++) {
    const creatureRng = rng.fork(`creature-${i}`);
    const species = generateSpecies(creatureRng.fork('species'), biome.type);
    const mesh = buildCreatureMesh(creatureRng.fork('mesh'), species);

    const x = creatureRng.range(-halfSize * 0.9, halfSize * 0.9);
    const z = creatureRng.range(-halfSize * 0.9, halfSize * 0.9);
    const y = getTerrainHeight(x, z);

    mesh.position.set(x, y, z);

    const state: CreatureState = {
      position: new THREE.Vector3(x, y, z),
      velocity: new THREE.Vector3(0, 0, 0),
      targetDir: new THREE.Vector3(
        creatureRng.range(-1, 1),
        0,
        creatureRng.range(-1, 1)
      ).normalize(),
      wanderTimer: creatureRng.range(2, 8),
      fleeTimer: 0,
    };

    creatures.push({ mesh, species, state });
  }

  return creatures;
}

const _forward = new THREE.Vector3();
const _toPlayer = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

export function updateCreatures(
  creatures: CreatureInstance[],
  dt: number,
  time: number,
  playerPos: THREE.Vector3,
  getTerrainHeight: (x: number, z: number) => number,
  terrainSize: number
): void {
  const halfSize = terrainSize / 2;
  const bound = halfSize * 0.9;

  for (const { mesh, species, state } of creatures) {
    const def = species.definition;
    const speed: number = mesh.userData.speed ?? 2.0;
    const isFlying = def.behavior === 'flying' || def.bodyType === 'floating';
    const isShy = def.behavior === 'shy';

    // --- Flee logic ---
    if (isShy) {
      _toPlayer.copy(playerPos).sub(state.position);
      const dist = _toPlayer.length();
      if (dist < FLEE_DISTANCE && dist > 0.01) {
        state.fleeTimer = 2;
        // Direction away from player (horizontal only)
        state.targetDir.set(-_toPlayer.x, 0, -_toPlayer.z).normalize();
      }
    }

    // Tick flee timer
    if (state.fleeTimer > 0) {
      state.fleeTimer -= dt;
    }

    // --- Wander timer ---
    state.wanderTimer -= dt;
    if (state.wanderTimer <= 0) {
      // Pick new random direction
      const angle = Math.random() * Math.PI * 2;
      state.targetDir.set(Math.cos(angle), 0, Math.sin(angle));
      state.wanderTimer = 2 + Math.random() * 6;
    }

    // --- Compute effective velocity ---
    const isFleeing = state.fleeTimer > 0;
    const effectiveSpeed = isFleeing ? speed * FLEE_SPEED_MULT : speed * 0.3;

    state.velocity.set(
      state.targetDir.x * effectiveSpeed,
      0,
      state.targetDir.z * effectiveSpeed
    );

    // --- Update position ---
    state.position.x += state.velocity.x * dt;
    state.position.z += state.velocity.z * dt;

    // Clamp to terrain bounds
    state.position.x = Math.max(-bound, Math.min(bound, state.position.x));
    state.position.z = Math.max(-bound, Math.min(bound, state.position.z));

    const terrainY = getTerrainHeight(state.position.x, state.position.z);

    if (isFlying) {
      // Float above terrain
      state.position.y = terrainY + 3 + Math.sin(time * 1.5 + mesh.userData.speciesId.charCodeAt(0) * 0.1) * 0.4;
    } else {
      // Snap to terrain
      state.position.y = terrainY;
    }

    // Apply to mesh
    mesh.position.copy(state.position);

    // --- Rotate to face movement direction ---
    const moveMag = Math.abs(state.velocity.x) + Math.abs(state.velocity.z);
    if (moveMag > 0.01) {
      _forward.set(state.velocity.x, 0, state.velocity.z).normalize();
      const angle = Math.atan2(_forward.x, _forward.z);
      mesh.rotation.y = angle + Math.PI; // Head is at +Z local, flip to face movement
    }

    // --- Limb animation ---
    const limbSpeed = moveMag > 0.01 ? effectiveSpeed : 0;
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.limbIndex !== undefined) {
        const idx: number = child.userData.limbIndex;
        const side: number = child.userData.limbSide;
        // Oscillate limb rotation.x; opposite phase for left vs right
        const phase = idx * 0.8 + (side > 0 ? Math.PI : 0);
        child.rotation.x = Math.sin(time * 6 * (limbSpeed / (speed || 1)) + phase) * 0.4 * Math.min(limbSpeed / (speed * 0.3 || 0.6), 1);
      }
    });
  }
}
