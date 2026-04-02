import * as THREE from 'three';
import { PRNG } from '../utils/PRNG';
import { BiomeConfig } from '../world/Biome';

const PARTICLE_COUNT = 200;

interface ParticleData {
  ox: number;
  oy: number;
  oz: number;
  speed: number;
}

export class ParticleSystem {
  private mesh: THREE.InstancedMesh;
  private particles: ParticleData[] = [];
  private dummy = new THREE.Object3D();
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene, biome: BiomeConfig, terrainSize: number, rng: PRNG) {
    this.scene = scene;

    const geometry = new THREE.SphereGeometry(0.05, 4, 2);
    const material = new THREE.MeshBasicMaterial({
      color: biome.palette[2],
      transparent: true,
      opacity: 0.6,
    });

    this.mesh = new THREE.InstancedMesh(geometry, material, PARTICLE_COUNT);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const half = terrainSize / 2;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particles.push({
        ox: rng.next() * terrainSize - half,
        oy: rng.next() * 7.5 + 0.5,
        oz: rng.next() * terrainSize - half,
        speed: rng.next() * 1.3 + 0.2,
      });
    }

    scene.add(this.mesh);
  }

  update(time: number): void {
    const dummy = this.dummy;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = this.particles[i];

      const x = p.ox + Math.sin(time * p.speed + i) * 0.5;
      const y = p.oy + Math.sin(time * 0.3 + i * 0.7) * 1.5;
      const z = p.oz + Math.cos(time * p.speed + i) * 0.5;
      const scale = 0.5 + 0.5 * Math.sin(time * 2 + i);

      dummy.position.set(x, y, z);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();

      this.mesh.setMatrixAt(i, dummy.matrix);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
