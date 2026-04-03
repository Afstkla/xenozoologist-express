import * as THREE from 'three';
import { PRNG } from './utils/PRNG';
import { createBiome, BiomeConfig } from './world/Biome';
import { createTerrainMesh, generateHeightmap, TERRAIN_SIZE, TERRAIN_SEGMENTS } from './world/Terrain';
import { generateFlora, updateFlora, FloraInstance } from './world/Flora';
import { spawnCreatures, updateCreatures, CreatureInstance } from './world/Fauna';
import { PlayerController } from './player/PlayerController';
import { MobileControls } from './player/MobileControls';
import { Scanner, ScanResult } from './game/Scanner';
import { createRound, updateRound, addScanToRound, getRoundResults, RoundState, ROUND_DURATION } from './game/Round';
import { HUD } from './ui/HUD';
import { ResultsScreen } from './ui/ResultsScreen';
import { SpeciesCard } from './ui/SpeciesCard';
import { ParticleSystem } from './rendering/Particles';
import { AudioManager } from './audio/AudioManager';

// ── Renderer ────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(50, 80, 30);
sun.castShadow = true;
scene.add(sun);

// ── Audio ───────────────────────────────────────────────────────────────────
const audio = new AudioManager();

// ── Game State ──────────────────────────────────────────────────────────────
let username = 'Explorer';
let roundState: RoundState | null = null;
let knownSpeciesIds = new Set<string>();
let catalogSize = 0;
let score = 0;
let gameState: 'playing' | 'results' = 'playing';

// World objects
let biome: BiomeConfig | null = null;
let terrainMesh: THREE.Mesh | null = null;
let heightmap: number[][] = [];
let flora: FloraInstance[] = [];
let creatures: CreatureInstance[] = [];
let player: PlayerController | null = null;
let scanner: Scanner | null = null;
let particles: ParticleSystem | null = null;
let speciesCard: SpeciesCard | null = null;
let scanning = false;

// UI (always present)
const hud = new HUD();
const resultsScreen = new ResultsScreen();
document.getElementById('ui-root')!.appendChild(hud.el);
document.getElementById('ui-root')!.appendChild(resultsScreen.el);
resultsScreen.el.style.display = 'none';

// Mobile controls
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
let mobile: MobileControls | null = null;

// ── Terrain Height ──────────────────────────────────────────────────────────
const resolution = TERRAIN_SEGMENTS + 1;
const halfSize = TERRAIN_SIZE / 2;

function getTerrainHeight(worldX: number, worldZ: number): number {
  if (!biome || heightmap.length === 0) return 0;
  const fx = (worldX + halfSize) / TERRAIN_SIZE * (resolution - 1);
  const fz = (worldZ + halfSize) / TERRAIN_SIZE * (resolution - 1);
  const ix = Math.max(0, Math.min(resolution - 1, Math.round(fx)));
  const iz = Math.max(0, Math.min(resolution - 1, Math.round(fz)));
  return (heightmap[iz]?.[ix] ?? 0) * biome.terrainScale;
}

// ── World Lifecycle ─────────────────────────────────────────────────────────
function cleanupWorld(): void {
  if (terrainMesh) { scene.remove(terrainMesh); terrainMesh.geometry.dispose(); terrainMesh = null; }
  for (const f of flora) scene.remove(f.mesh);
  flora = [];
  for (const c of creatures) scene.remove(c.mesh);
  creatures = [];
  particles?.dispose();
  particles = null;
  scanner?.dispose();
  scanner = null;
  if (player) { player.dispose(); player = null; }
  speciesCard?.dispose();
  speciesCard = null;
  mobile?.dispose();
  mobile = null;
}

function startRound(seed: number): void {
  cleanupWorld();

  const rng = new PRNG(seed);
  biome = createBiome(rng);

  // Sky + fog
  const fogColor = biome.palette[4];
  scene.background = fogColor;
  scene.fog = new THREE.FogExp2(fogColor.getHex(), biome.fogDensity);

  // Terrain
  heightmap = generateHeightmap(rng.fork('terrain'), resolution);
  terrainMesh = createTerrainMesh(rng.fork('terrain'), biome);
  scene.add(terrainMesh);

  // Flora
  flora = generateFlora(rng.fork('flora'), biome, getTerrainHeight, TERRAIN_SIZE);
  for (const f of flora) scene.add(f.mesh);

  // Fauna
  creatures = spawnCreatures(rng.fork('fauna'), biome, getTerrainHeight, TERRAIN_SIZE);
  for (const c of creatures) scene.add(c.mesh);

  // Player
  player = new PlayerController(scene, camera);
  player.position.set(0, getTerrainHeight(0, 0) + 2, 0);

  // Mobile
  if (isTouchDevice) {
    mobile = new MobileControls();
    mobile.show();
  }

  // Scanner
  scanner = new Scanner(scene);
  scanner.onComplete(handleScanComplete);

  // Particles
  particles = new ParticleSystem(scene, biome, TERRAIN_SIZE, rng.fork('particles'));

  // Round state
  roundState = createRound(seed);
  roundState.playerScores.set(username, 0);
  knownSpeciesIds = new Set();
  score = 0;

  // Audio
  audio.stopAmbient();
  audio.startAmbient(biome.baseHue);

  // HUD
  hud.el.style.display = '';
  hud.updateTimer(ROUND_DURATION);
  hud.updateScore(0);
  hud.showChallenges(roundState.challenges, new Map());

  // Hide results if shown
  resultsScreen.el.style.display = 'none';
  gameState = 'playing';

  // Lock pointer on desktop
  if (!isTouchDevice) {
    renderer.domElement.addEventListener('click', requestPointerLock);
  }

  console.log(`Biome: ${biome.name} | Seed: ${seed}`);
}

function requestPointerLock(): void {
  if (!document.pointerLockElement) {
    renderer.domElement.requestPointerLock?.();
  }
}

function showResults(): void {
  gameState = 'results';
  audio.stopAmbient();
  audio.playFanfare();
  document.exitPointerLock?.();
  renderer.domElement.removeEventListener('click', requestPointerLock);

  if (!roundState) return;
  const results = getRoundResults(roundState);
  resultsScreen.el.style.display = 'flex';
  hud.el.style.display = 'none';

  resultsScreen.show(results, () => {
    // Next expedition — new seed, new biome
    startRound(Date.now());
  });

  // Post scores
  for (const r of results) {
    fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player: r.player, points: r.score }),
    }).catch(() => {});
  }
}

// ── Scan Handling ────────────────────────────────────────────────────────────
function handleScanComplete(result: ScanResult): void {
  if (!roundState || !roundState.isActive) return;

  const { species, isNewToWorld, points } = result;

  knownSpeciesIds.add(species.id);
  score += points;

  // Species card popup
  speciesCard?.dispose();
  speciesCard = new SpeciesCard();
  speciesCard.show(result);

  // Audio
  audio.playDiscovery(isNewToWorld);

  // Round tracking
  const challengeWon = addScanToRound(
    roundState, username, isNewToWorld, points,
    { behavior: species.definition.behavior, rarity: species.rarity }
  );

  // HUD
  hud.updateScore(score);
  hud.addFeedMessage(
    isNewToWorld
      ? `★ NEW: ${species.name} (+${points})`
      : `Scanned: ${species.name} (+${points})`
  );

  if (challengeWon) {
    const challenge = roundState.challenges.find(c => c.id === challengeWon);
    if (challenge) {
      hud.addFeedMessage(`⚡ ${challenge.description} (+${challenge.bonusPoints})`);
      score += challenge.bonusPoints;
      hud.updateScore(score);
    }
    hud.showChallenges(roundState.challenges, roundState.completedChallenges);
  }

  // Persist new discoveries
  if (isNewToWorld) {
    const { definition } = species;
    fetch('/api/catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        speciesId: species.id, name: species.name, discoverer: username,
        bodyType: definition.bodyType, headType: definition.headType,
        limbCount: definition.limbCount, colorHue: definition.colorHue,
        behavior: definition.behavior, biomeType: definition.biomeType,
        rarity: species.rarity,
      }),
    }).then(() => { catalogSize++; }).catch(() => {});
  }
}

// ── Input ───────────────────────────────────────────────────────────────────
document.addEventListener('mousedown', (e) => {
  if (e.button === 0) scanning = true;
  if (!audio.isStarted) audio.start();
});
document.addEventListener('mouseup', (e) => {
  if (e.button === 0) scanning = false;
});
document.addEventListener('touchstart', (e) => {
  for (const t of Array.from(e.touches)) {
    if (t.clientX > innerWidth / 2) { scanning = true; break; }
  }
  if (!audio.isStarted) audio.start();
});
document.addEventListener('touchend', () => { scanning = false; });

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ── Game Loop ───────────────────────────────────────────────────────────────
let lastTime = performance.now();
const startTime = performance.now();

function animate(): void {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  const elapsed = (now - startTime) / 1000;

  if (gameState === 'playing' && player && roundState) {
    if (mobile) player.setMobileInput(mobile.consume());

    player.update(dt, getTerrainHeight);
    updateFlora(flora, elapsed);
    updateCreatures(creatures, dt, elapsed, player.getPosition(), getTerrainHeight, TERRAIN_SIZE);
    particles?.update(elapsed);
    scanner?.update(dt, camera, creatures, scanning, knownSpeciesIds, catalogSize, 5000);

    if (roundState.isActive) {
      const ended = updateRound(roundState, dt);
      hud.updateTimer(roundState.timeRemaining);
      if (ended) showResults();
    }
  }

  renderer.render(scene, camera);
}
animate();

// ── Username Prompt (minimal, non-blocking) ─────────────────────────────────
function showUsernamePrompt(): void {
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(10,10,15,0.85)', zIndex: '500',
    fontFamily: 'monospace', color: '#fff',
  });

  const box = document.createElement('div');
  box.style.textAlign = 'center';
  box.innerHTML = `
    <h1 style="color:#7af5ca;font-size:32px;margin-bottom:8px;">Xenozoologist Express</h1>
    <p style="color:#888;font-size:14px;margin-bottom:24px;">Explore alien worlds. Catalog the unknown.</p>
    <input type="text" placeholder="Your name..." maxlength="20"
      style="width:300px;padding:12px;background:rgba(255,255,255,0.08);border:1px solid #444;
      color:white;font-family:monospace;font-size:18px;border-radius:8px;text-align:center;outline:none;" />
    <br>
    <button style="margin-top:16px;padding:14px 60px;background:#7af5ca;color:#0a0a0f;
      border:none;font-family:monospace;font-size:18px;font-weight:bold;border-radius:8px;cursor:pointer;">
      Explore
    </button>
    <p style="color:#555;font-size:11px;margin-top:16px;">WASD to move · Mouse to look · Click to scan creatures</p>
  `;
  overlay.appendChild(box);
  document.getElementById('ui-root')!.appendChild(overlay);

  const input = box.querySelector('input')!;
  const btn = box.querySelector('button')!;

  function go(): void {
    username = input.value.trim() || 'Explorer';
    overlay.remove();
    startRound(Date.now());
  }

  btn.addEventListener('click', go);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  input.focus();
}

// ── Init ────────────────────────────────────────────────────────────────────
async function init(): Promise<void> {
  // Fetch catalog size for progressive scoring
  try {
    const res = await fetch('/api/catalog/count');
    const data = await res.json();
    catalogSize = data.count ?? 0;
  } catch {
    catalogSize = 0;
  }

  // Show the name prompt — one click and you're in
  showUsernamePrompt();
}

init();
