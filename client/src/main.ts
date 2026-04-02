import * as THREE from 'three';
import { PRNG } from './utils/PRNG';
import { createBiome } from './world/Biome';
import { createTerrainMesh, generateHeightmap, TERRAIN_SIZE, TERRAIN_SEGMENTS } from './world/Terrain';
import { generateFlora, updateFlora, FloraInstance } from './world/Flora';
import { spawnCreatures, updateCreatures, CreatureInstance } from './world/Fauna';
import { PlayerController } from './player/PlayerController';
import { MobileControls } from './player/MobileControls';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const seed = Date.now();
const rng = new PRNG(seed);
const biome = createBiome(rng);

const fogColor = biome.palette[4];
scene.background = fogColor;
scene.fog = new THREE.FogExp2(fogColor.getHex(), biome.fogDensity);

const terrain = createTerrainMesh(rng.fork('terrain'), biome);
scene.add(terrain);

const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(50, 80, 30);
sun.castShadow = true;
scene.add(sun);

// Heightmap for terrain collision
const heightmap = generateHeightmap(rng.fork('terrain'), TERRAIN_SEGMENTS + 1);
const resolution = TERRAIN_SEGMENTS + 1;
const halfSize = TERRAIN_SIZE / 2;

function getTerrainHeight(worldX: number, worldZ: number): number {
  // Map world coords [-halfSize, halfSize] to heightmap indices [0, resolution-1]
  const fx = (worldX + halfSize) / TERRAIN_SIZE * (resolution - 1);
  const fz = (worldZ + halfSize) / TERRAIN_SIZE * (resolution - 1);
  const ix = Math.max(0, Math.min(resolution - 1, Math.round(fx)));
  const iz = Math.max(0, Math.min(resolution - 1, Math.round(fz)));
  const h = heightmap[iz]?.[ix] ?? 0;
  return h * biome.terrainScale;
}

// Flora
const flora: FloraInstance[] = generateFlora(rng.fork('flora'), biome, getTerrainHeight, TERRAIN_SIZE);
for (const { mesh } of flora) scene.add(mesh);

// Fauna
const creatures: CreatureInstance[] = spawnCreatures(rng.fork('fauna'), biome, getTerrainHeight, TERRAIN_SIZE);
for (const { mesh } of creatures) scene.add(mesh);

// Player
const player = new PlayerController(scene, camera);
player.getPosition(); // prime internal state
player['position'].set(0, 10, 0);

// Mobile controls
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
let mobile: MobileControls | null = null;
if (isTouchDevice) {
  mobile = new MobileControls();
  mobile.onEmote = (i) => { player.onEmote?.(i); };
  player.onEmote = (i) => { console.log(`Emote: ${i}`); };
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const startTime = performance.now();
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (mobile) {
    player.setMobileInput(mobile.consume());
  }

  player.update(dt, getTerrainHeight);
  const elapsed = (performance.now() - startTime) / 1000;
  updateFlora(flora, elapsed);
  updateCreatures(creatures, dt, elapsed, player.getPosition(), getTerrainHeight, TERRAIN_SIZE);
  renderer.render(scene, camera);
}
animate();

console.log(`Biome: ${biome.name} | Seed: ${seed}`);
