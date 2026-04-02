import * as THREE from 'three';
import { Species } from '../world/Species';
import { CreatureInstance } from '../world/Fauna';

export interface ScanResult {
  species: Species;
  isNewToWorld: boolean;
  points: number;
}

const SCAN_RANGE = 6;
const SCAN_DURATION = 2;

export class Scanner {
  private raycaster = new THREE.Raycaster();
  private center = new THREE.Vector2(0, 0);

  private reticleEl: HTMLDivElement;
  private progressBarEl: HTMLDivElement;
  private progressFillEl: HTMLDivElement;

  private scanBeam: THREE.Line | null = null;
  private beamMaterial: THREE.LineBasicMaterial | null = null;

  private scanProgress = 0;
  private currentTargetId: string | null = null;
  private completedCallback: ((result: ScanResult) => void) | null = null;

  constructor(private scene: THREE.Scene) {
    // Reticle
    this.reticleEl = document.createElement('div');
    Object.assign(this.reticleEl.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '30px',
      height: '30px',
      borderRadius: '50%',
      border: '2px solid #7af5ca',
      pointerEvents: 'none',
      zIndex: '15',
      transition: 'border-width 0.1s, width 0.1s, height 0.1s, opacity 0.1s',
      boxSizing: 'border-box',
    });

    // Progress bar
    this.progressBarEl = document.createElement('div');
    Object.assign(this.progressBarEl.style, {
      position: 'fixed',
      top: 'calc(50% + 22px)',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '60px',
      height: '4px',
      background: 'rgba(122, 245, 202, 0.2)',
      pointerEvents: 'none',
      zIndex: '15',
      display: 'none',
      borderRadius: '2px',
    });

    this.progressFillEl = document.createElement('div');
    Object.assign(this.progressFillEl.style, {
      height: '100%',
      width: '0%',
      background: '#7af5ca',
      borderRadius: '2px',
      transition: 'width 0.05s linear',
    });
    this.progressBarEl.appendChild(this.progressFillEl);

    const uiRoot = document.getElementById('ui-root') ?? document.body;
    uiRoot.appendChild(this.reticleEl);
    uiRoot.appendChild(this.progressBarEl);
  }

  onComplete(callback: (result: ScanResult) => void): void {
    this.completedCallback = callback;
  }

  update(
    dt: number,
    camera: THREE.Camera,
    creatures: CreatureInstance[],
    scanning: boolean,
    knownSpeciesIds: Set<string>,
    catalogSize: number,
    totalPossibleSpecies: number
  ): void {
    // Raycast from screen center
    this.raycaster.setFromCamera(this.center, camera);

    const meshes = creatures.map((c) => c.mesh);
    const hits = this.raycaster.intersectObjects(meshes, true);

    // Find the first hit within range
    let targetCreature: CreatureInstance | null = null;
    let hitDistance = Infinity;

    for (const hit of hits) {
      if (hit.distance > SCAN_RANGE) continue;

      // Walk up hierarchy to find creature root
      let obj: THREE.Object3D | null = hit.object;
      while (obj && !obj.userData.isCreature) {
        obj = obj.parent;
      }
      if (!obj) continue;

      // Match to creature instance
      const found = creatures.find((c) => c.mesh === obj);
      if (found) {
        targetCreature = found;
        hitDistance = hit.distance;
        break;
      }
    }

    // Update reticle highlight
    if (targetCreature) {
      Object.assign(this.reticleEl.style, {
        width: '24px',
        height: '24px',
        borderWidth: '3px',
        borderColor: '#b0ffe5',
      });
    } else {
      Object.assign(this.reticleEl.style, {
        width: '30px',
        height: '30px',
        borderWidth: '2px',
        borderColor: '#7af5ca',
      });
    }

    // Scan progress logic
    const targetId = targetCreature ? targetCreature.species.id : null;

    if (targetId !== this.currentTargetId) {
      this.scanProgress = 0;
      this.currentTargetId = targetId;
    }

    if (scanning && targetCreature) {
      this.scanProgress += dt / SCAN_DURATION;

      // Show progress bar
      this.progressBarEl.style.display = 'block';
      this.progressFillEl.style.width = `${Math.min(this.scanProgress, 1) * 100}%`;

      // Scan beam
      this.updateScanBeam(camera, targetCreature.mesh.position);

      if (this.scanProgress >= 1) {
        // Complete scan
        this.scanProgress = 0;
        this.currentTargetId = null;
        this.progressBarEl.style.display = 'none';
        this.progressFillEl.style.width = '0%';
        this.removeScanBeam();

        const species = targetCreature.species;
        const isNewToWorld = !knownSpeciesIds.has(species.id);
        const rarityMult = 1 + species.rarity * 4;
        const basePoints = isNewToWorld ? 100 : 10;
        const catalogRatio = catalogSize / (totalPossibleSpecies || 1);
        const lateGameMult = isNewToWorld ? 1 + catalogRatio * 5 : 1;
        const points = Math.round(basePoints * rarityMult * lateGameMult);

        if (this.completedCallback) {
          this.completedCallback({ species, isNewToWorld, points });
        }
      }
    } else {
      // Not scanning or no target
      this.scanProgress = 0;
      this.progressBarEl.style.display = 'none';
      this.progressFillEl.style.width = '0%';
      this.removeScanBeam();
    }

    // Pulse beam opacity if active
    if (this.beamMaterial) {
      this.beamMaterial.opacity = 0.5 + 0.5 * Math.sin(performance.now() * 0.005);
    }
  }

  private updateScanBeam(camera: THREE.Camera, targetPos: THREE.Vector3): void {
    const camPos = camera.position;

    if (!this.scanBeam) {
      this.beamMaterial = new THREE.LineBasicMaterial({
        color: 0x7af5ca,
        transparent: true,
        opacity: 0.8,
      });
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(6); // 2 points * 3 coords
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      this.scanBeam = new THREE.Line(geometry, this.beamMaterial);
      this.scene.add(this.scanBeam);
    }

    // Update positions
    const posAttr = this.scanBeam.geometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.setXYZ(0, camPos.x, camPos.y, camPos.z);
    posAttr.setXYZ(1, targetPos.x, targetPos.y, targetPos.z);
    posAttr.needsUpdate = true;
  }

  private removeScanBeam(): void {
    if (this.scanBeam) {
      this.scene.remove(this.scanBeam);
      this.scanBeam.geometry.dispose();
      this.beamMaterial?.dispose();
      this.scanBeam = null;
      this.beamMaterial = null;
    }
  }

  dispose(): void {
    this.reticleEl.remove();
    this.progressBarEl.remove();
    this.removeScanBeam();
  }
}
