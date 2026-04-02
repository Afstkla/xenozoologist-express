import * as THREE from 'three';
import { PRNG } from './utils/PRNG';
import { createBiome, BiomeConfig } from './world/Biome';
import { createTerrainMesh, generateHeightmap, TERRAIN_SIZE, TERRAIN_SEGMENTS } from './world/Terrain';
import { generateFlora, updateFlora, FloraInstance } from './world/Flora';
import { spawnCreatures, updateCreatures, CreatureInstance } from './world/Fauna';
import { PlayerController } from './player/PlayerController';
import { MobileControls } from './player/MobileControls';
import { Scanner, ScanResult } from './game/Scanner';
import { GameManager } from './game/GameManager';
import { createRound, updateRound, addScanToRound, getRoundResults, RoundState, ROUND_DURATION } from './game/Round';
import { UIManager } from './ui/UIManager';
import { LobbyScreen } from './ui/LobbyScreen';
import { HUD } from './ui/HUD';
import { ResultsScreen } from './ui/ResultsScreen';
import { CatalogView } from './ui/CatalogView';
import { SpeciesCard } from './ui/SpeciesCard';
import { ParticleSystem } from './rendering/Particles';
import { AudioManager } from './audio/AudioManager';
import { LobbyClient } from './network/LobbyClient';
import { GameHost } from './network/GameHost';
import { GamePeer } from './network/GamePeer';

// ── Renderer + Scene (always visible behind UI) ─────────────────────────────
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Lighting (persistent across rounds)
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(50, 80, 30);
sun.castShadow = true;
scene.add(sun);

// ── Core Systems ─────────────────────────────────────────────────────────────
const gameManager = new GameManager();
const audio = new AudioManager();
const lobbyClient = new LobbyClient();

// ── UI ───────────────────────────────────────────────────────────────────────
const ui = new UIManager();

const lobbyScreen = new LobbyScreen({
  onSetUsername: (name) => { username = name; lobbyClient.setUsername(name); },
  onCreateLobby: () => lobbyClient.createLobby(username),
  onJoinLobby: (id) => lobbyClient.joinLobby(id),
  onStartGame: () => {
    const seed = Date.now();
    lobbyClient.startGame(seed);
  },
  onRefresh: () => lobbyClient.listLobbies(),
});

const hud = new HUD();
const resultsScreen = new ResultsScreen();
const catalogView = new CatalogView();

ui.register('lobby', lobbyScreen.el);
ui.register('hud', hud.el);
ui.register('results', resultsScreen.el);
ui.register('catalog', catalogView.el);

// ── Game State Variables ─────────────────────────────────────────────────────
let username = 'Explorer';
let isHost = false;
let gameHost: GameHost | null = null;
let gamePeer: GamePeer | null = null;

let roundState: RoundState | null = null;
let knownSpeciesIds = new Set<string>();
let catalogSize = 0;
let totalPossibleSpecies = 0;
let score = 0;

// World objects (cleaned up between rounds)
let biome: BiomeConfig | null = null;
let terrainMesh: THREE.Mesh | null = null;
let heightmap: number[][] = [];
let flora: FloraInstance[] = [];
let creatures: CreatureInstance[] = [];
let player: PlayerController | null = null;
let scanner: Scanner | null = null;
let particles: ParticleSystem | null = null;
let mobile: MobileControls | null = null;
let speciesCard: SpeciesCard | null = null;

let scanning = false;

// ── Terrain Height Helper ────────────────────────────────────────────────────
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

// ── World Lifecycle ──────────────────────────────────────────────────────────
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
  player = null;
  speciesCard?.dispose();
  speciesCard = null;
}

function startRound(seed: number): void {
  cleanupWorld();

  const rng = new PRNG(seed);
  biome = createBiome(rng);
  totalPossibleSpecies = biome.faunaCount;

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
  player['position'].set(0, getTerrainHeight(0, 0) + 2, 0);

  // Mobile controls
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
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
  audio.startAmbient(biome.baseHue);

  // HUD
  hud.updateTimer(ROUND_DURATION);
  hud.updateScore(0);
  hud.showChallenges(roundState.challenges, new Map());

  console.log(`Round started — Biome: ${biome.name} | Seed: ${seed}`);
}

// ── Scan Handling ────────────────────────────────────────────────────────────
function handleScanComplete(result: ScanResult): void {
  if (!roundState || !roundState.isActive) return;

  const { species, isNewToWorld, points } = result;

  // Add to known set
  knownSpeciesIds.add(species.id);
  score += points;

  // Show species card
  speciesCard?.dispose();
  speciesCard = new SpeciesCard();
  speciesCard.show(result);

  // Audio feedback
  audio.playDiscovery(isNewToWorld);

  // Update round state
  const challengeWon = addScanToRound(
    roundState, username, isNewToWorld, points,
    { behavior: species.definition.behavior, rarity: species.rarity }
  );

  // HUD updates
  hud.updateScore(score);
  const feedMsg = isNewToWorld
    ? `NEW DISCOVERY: ${species.name} (+${points})`
    : `Scanned: ${species.name} (+${points})`;
  hud.addFeedMessage(feedMsg);

  if (challengeWon) {
    const challenge = roundState.challenges.find(c => c.id === challengeWon);
    if (challenge) {
      hud.addFeedMessage(`CHALLENGE: ${challenge.description} (+${challenge.bonusPoints})`);
      score += challenge.bonusPoints;
      hud.updateScore(score);
    }
    hud.showChallenges(
      roundState.challenges,
      roundState.completedChallenges
    );
  }

  // POST to catalog API if new discovery
  if (isNewToWorld) {
    const { definition } = species;
    fetch('/api/catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        speciesId: species.id,
        name: species.name,
        bodyType: definition.bodyType,
        headType: definition.headType,
        limbCount: definition.limbCount,
        colorHue: definition.colorHue,
        behavior: definition.behavior,
        biomeType: definition.biomeType,
        rarity: species.rarity,
        discoverer: username,
      }),
    }).then(() => {
      catalogSize++;
      // Broadcast to other players via lobby
      lobbyClient.broadcastDiscovery(species.name, username);
    }).catch(() => { /* offline is fine */ });
  }
}

// ── State Machine ────────────────────────────────────────────────────────────
gameManager.onChange((_from, to) => {
  ui.hideAll();

  switch (to) {
    case 'menu':
      ui.show('lobby');
      lobbyScreen.showMenuView();
      break;

    case 'lobby':
      ui.show('lobby');
      break;

    case 'playing':
      ui.show('hud');
      // Lock pointer on desktop
      if (!('ontouchstart' in window)) {
        renderer.domElement.requestPointerLock?.();
      }
      break;

    case 'results': {
      ui.show('results');
      audio.stopAmbient();
      audio.playFanfare();
      // Unlock pointer
      document.exitPointerLock?.();
      if (!roundState) break;
      const results = getRoundResults(roundState);
      resultsScreen.show(results, () => {
        // Next expedition
        const nextSeed = Date.now();
        if (isHost) lobbyClient.startGame(nextSeed);
        else startPlayingState(nextSeed);
      });
      // Post scores to leaderboard
      for (const r of results) {
        fetch('/api/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: r.player, score: r.score }),
        }).catch(() => {});
      }
      break;
    }
  }
});

function startPlayingState(seed: number): void {
  startRound(seed);
  gameManager.transition('playing');
}

// ── Lobby Client Events ──────────────────────────────────────────────────────
lobbyClient.on('lobby-list', (data: any) => {
  lobbyScreen.updateLobbyList(data.lobbies ?? []);
});

lobbyClient.on('lobby-created', async () => {
  isHost = true;
  gameManager.transition('lobby');

  // Start WebRTC host
  gameHost = new GameHost();
  const peerId = await gameHost.start();
  lobbyClient.setHostPeerId(peerId);

  lobbyScreen.showLobbyView([username], true);
});

lobbyClient.on('lobby-joined', (data: any) => {
  isHost = false;
  gameManager.transition('lobby');
  lobbyScreen.showLobbyView(data.players ?? [username], false);
});

lobbyClient.on('player-joined', (data: any) => {
  lobbyScreen.updatePlayers(data.players ?? []);
});

lobbyClient.on('player-left', (data: any) => {
  lobbyScreen.updatePlayers(data.players ?? []);
});

lobbyClient.on('host-peer-id', async (data: any) => {
  if (isHost) return; // Host doesn't connect to itself
  gamePeer = new GamePeer();
  try {
    await gamePeer.connect(data.peerId, username);
    gamePeer.onMessage((msg) => {
      if (msg.type === 'discovery-fanfare') {
        hud.addFeedMessage(`${msg.discoverer} discovered: ${msg.speciesName}!`);
      }
    });
  } catch (err) {
    console.error('Failed to connect to host:', err);
  }
});

lobbyClient.on('game-starting', (data: any) => {
  startPlayingState(data.seed);
});

// ── Scanning Input ───────────────────────────────────────────────────────────
document.addEventListener('mousedown', (e) => {
  if (e.button === 0) scanning = true;
  // Start audio on first interaction (browser requirement)
  if (!audio['context']) audio.start();
});
document.addEventListener('mouseup', (e) => {
  if (e.button === 0) scanning = false;
});

// Touch: right half of screen = scan
document.addEventListener('touchstart', (e) => {
  for (const t of Array.from(e.touches)) {
    if (t.clientX > innerWidth / 2) { scanning = true; break; }
  }
  if (!audio['context']) audio.start();
});
document.addEventListener('touchend', () => { scanning = false; });

// ── Resize ───────────────────────────────────────────────────────────────────
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ── Game Loop ────────────────────────────────────────────────────────────────
let lastTime = performance.now();
const startTime = performance.now();

function animate(): void {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  const elapsed = (now - startTime) / 1000;

  if (gameManager.getState() === 'playing' && player && roundState) {
    // Mobile input
    if (mobile) player.setMobileInput(mobile.consume());

    // Update systems
    player.update(dt, getTerrainHeight);
    updateFlora(flora, elapsed);
    updateCreatures(creatures, dt, elapsed, player.getPosition(), getTerrainHeight, TERRAIN_SIZE);
    particles?.update(elapsed);

    // Scanner
    scanner?.update(dt, camera, creatures, scanning, knownSpeciesIds, catalogSize, totalPossibleSpecies);

    // Round timer
    if (roundState.isActive) {
      const ended = updateRound(roundState, dt);
      hud.updateTimer(roundState.timeRemaining);

      if (ended) {
        gameManager.transition('results');
      }
    }
  }

  renderer.render(scene, camera);
}
animate();

// ── Bootstrap ────────────────────────────────────────────────────────────────
async function init(): Promise<void> {
  // Fetch catalog count for scoring
  try {
    const res = await fetch('/api/catalog/count');
    const data = await res.json();
    catalogSize = data.count ?? 0;
  } catch {
    catalogSize = 0;
  }

  // Connect lobby WebSocket
  try {
    await lobbyClient.connect();
    lobbyClient.listLobbies();
  } catch (err) {
    console.warn('Lobby server unavailable, single-player only:', err);
  }

  // Show lobby / menu
  gameManager.transition('menu');

  // Quick-play: add a "Solo Expedition" option — pressing Start without a lobby
  // just starts a local round. The LobbyScreen onStartGame already generates a seed
  // and calls lobbyClient.startGame, but if WS is down we handle it here:
  lobbyClient.on('error', () => {
    console.warn('Lobby connection error');
  });
}

init();
