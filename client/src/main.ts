import * as THREE from 'three';
import { PRNG } from './utils/PRNG';
import { createBiome } from './world/Biome';
import { createTerrainMesh, TERRAIN_SIZE } from './world/Terrain';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Generate world from seed
const seed = Date.now();
const rng = new PRNG(seed);
const biome = createBiome(rng);

// Fog
const fogColor = biome.palette[4];
scene.background = fogColor;
scene.fog = new THREE.FogExp2(fogColor.getHex(), biome.fogDensity);

// Terrain
const terrain = createTerrainMesh(rng.fork('terrain'), biome);
scene.add(terrain);

// Lighting
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(50, 80, 30);
sun.castShadow = true;
scene.add(sun);

// Camera position
camera.position.set(0, 15, 30);
camera.lookAt(0, 0, 0);

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

console.log(`Biome: ${biome.name} | Seed: ${seed}`);
