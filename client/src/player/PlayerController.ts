import * as THREE from 'three';

const MOVE_SPEED = 10;
const SPRINT_MULTIPLIER = 1.8;
const JUMP_FORCE = 7;
const GRAVITY = -18;
const CAMERA_DISTANCE = 8;
const CAMERA_HEIGHT = 3;
const CAMERA_OFFSET_X = 1.5; // Over-the-shoulder offset
const MOUSE_SENSITIVITY = 0.003;
const PITCH_MIN = -0.8; // Can look up
const PITCH_MAX = 1.2;  // Can look down

export interface MobileInput {
  moveX: number;
  moveZ: number;
  lookDX: number;
  lookDY: number;
  jump: boolean;
}

export class PlayerController {
  readonly mesh: THREE.Group;
  readonly position = new THREE.Vector3(0, 10, 0);

  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private yaw = 0;
  private pitch = 0.3;
  private velocityY = 0;
  private onGround = false;
  private keys = new Set<string>();
  private mobileInput: MobileInput | null = null;

  public onEmote: ((index: number) => void) | null = null;

  private _onMouseMove: (e: MouseEvent) => void;
  private _onKeyDown: (e: KeyboardEvent) => void;
  private _onKeyUp: (e: KeyboardEvent) => void;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.mesh = this.buildMesh();
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);

    this._onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement) {
        this.yaw -= e.movementX * MOUSE_SENSITIVITY;
        this.pitch += e.movementY * MOUSE_SENSITIVITY; // Mouse down = look down (pitch up = overhead)
        this.pitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, this.pitch));
      }
    };
    this._onKeyDown = (e: KeyboardEvent) => {
      this.keys.add(e.code);
      const emoteMatch = e.code.match(/^Digit([1-4])$/);
      if (emoteMatch && this.onEmote) this.onEmote(parseInt(emoteMatch[1]) - 1);
    };
    this._onKeyUp = (e: KeyboardEvent) => { this.keys.delete(e.code); };

    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
  }

  private buildMesh(): THREE.Group {
    const group = new THREE.Group();

    // Body
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 1.0, 6, 12),
      new THREE.MeshToonMaterial({ color: 0x00b3a4 }),
    );
    body.position.y = 0.85;
    body.castShadow = true;
    group.add(body);

    // Visor
    const visor = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 6),
      new THREE.MeshToonMaterial({ color: 0x00ffff, emissive: 0x004444 }),
    );
    visor.position.set(0, 1.5, -0.25); // -Z is front (model faces -Z)
    group.add(visor);

    return group;
  }

  setMobileInput(input: MobileInput): void {
    this.mobileInput = input;
  }

  update(dt: number, getTerrainHeight: (x: number, z: number) => number): void {
    let moveX = 0, moveZ = 0, wantJump = false, sprint = false;

    if (this.mobileInput) {
      moveX = this.mobileInput.moveX;
      moveZ = this.mobileInput.moveZ;
      this.yaw -= this.mobileInput.lookDX * MOUSE_SENSITIVITY;
      this.pitch += this.mobileInput.lookDY * MOUSE_SENSITIVITY;
      this.pitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, this.pitch));
      wantJump = this.mobileInput.jump;
      this.mobileInput = null;
    }

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp'))    moveZ -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown'))  moveZ += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft'))  moveX -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) moveX += 1;
    if (this.keys.has('Space')) wantJump = true;
    if (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) sprint = true;

    // Normalize diagonal movement
    const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (len > 1) { moveX /= len; moveZ /= len; }

    // Camera-relative movement: forward is -Z in camera space
    // yaw rotation: forward direction the camera faces
    const forwardX = -Math.sin(this.yaw);
    const forwardZ = -Math.cos(this.yaw);
    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);

    const speed = MOVE_SPEED * (sprint ? SPRINT_MULTIPLIER : 1);
    const worldMoveX = (forwardX * -moveZ + rightX * moveX) * speed * dt;
    const worldMoveZ = (forwardZ * -moveZ + rightZ * moveX) * speed * dt;

    this.position.x += worldMoveX;
    this.position.z += worldMoveZ;

    // Gravity + jump
    this.velocityY += GRAVITY * dt;
    this.position.y += this.velocityY * dt;

    const groundY = getTerrainHeight(this.position.x, this.position.z);
    if (this.position.y <= groundY + 0.01) {
      this.position.y = groundY + 0.01;
      if (this.velocityY < 0) this.velocityY = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    if (wantJump && this.onGround) {
      this.velocityY = JUMP_FORCE;
      this.onGround = false;
    }

    // Mesh: face movement direction (model's front is -Z)
    this.mesh.position.copy(this.position);
    if (Math.abs(worldMoveX) + Math.abs(worldMoveZ) > 0.01) {
      this.mesh.rotation.y = Math.atan2(-worldMoveX, -worldMoveZ);
    }

    // Camera: over-the-shoulder, behind and slightly right
    const camBehindX = Math.sin(this.yaw) * CAMERA_DISTANCE;
    const camBehindZ = Math.cos(this.yaw) * CAMERA_DISTANCE;
    const camRightX = Math.cos(this.yaw) * CAMERA_OFFSET_X;
    const camRightZ = -Math.sin(this.yaw) * CAMERA_OFFSET_X;

    this.camera.position.set(
      this.position.x + camBehindX + camRightX,
      this.position.y + CAMERA_HEIGHT + CAMERA_DISTANCE * Math.sin(this.pitch) * 0.5,
      this.position.z + camBehindZ + camRightZ,
    );

    // Look at a point slightly ahead and above the player
    const lookAheadDist = 3;
    this.camera.lookAt(
      this.position.x - Math.sin(this.yaw) * lookAheadDist,
      this.position.y + 1.2 - this.pitch * 2,
      this.position.z - Math.cos(this.yaw) * lookAheadDist,
    );
  }

  getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  getYaw(): number {
    return this.yaw;
  }

  dispose(): void {
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    this.scene.remove(this.mesh);
  }
}
