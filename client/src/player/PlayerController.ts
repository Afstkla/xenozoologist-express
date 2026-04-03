import * as THREE from 'three';

const MOVE_SPEED = 12;
const SPRINT_MULTIPLIER = 1.8;
const JUMP_FORCE = 8;
const GRAVITY = -20;
const CAMERA_DISTANCE = 10;
const CAMERA_HEIGHT = 5;
const MOUSE_SENSITIVITY = 0.002;

export interface MobileInput {
  moveX: number;
  moveZ: number;
  lookDX: number;
  lookDY: number;
  jump: boolean;
}

export class PlayerController {
  readonly mesh: THREE.Group;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;

  // State
  private yaw = 0;
  private pitch = 0.3;
  private velocityY = 0;
  private onGround = false;
  readonly position = new THREE.Vector3(0, 10, 0);

  // Input
  private keys = new Set<string>();
  private mobileInput: MobileInput | null = null;

  // Callbacks
  public onEmote: ((index: number) => void) | null = null;

  // Bound event handlers for cleanup
  private _onMouseMove: (e: MouseEvent) => void;
  private _onKeyDown: (e: KeyboardEvent) => void;
  private _onKeyUp: (e: KeyboardEvent) => void;
  private _onClick: () => void;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.mesh = this.buildMesh();
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);

    this._onMouseMove = this.onMouseMove.bind(this);
    this._onKeyDown = this.onKeyDown.bind(this);
    this._onKeyUp = this.onKeyUp.bind(this);
    this._onClick = this.onClick.bind(this);

    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('click', this._onClick);
  }

  private buildMesh(): THREE.Group {
    const group = new THREE.Group();

    // Capsule body (teal)
    const bodyGeo = new THREE.CapsuleGeometry(0.4, 1.2, 6, 12);
    const bodyMat = new THREE.MeshToonMaterial({ color: 0x00b3a4 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    group.add(body);

    // Scanner visor (cyan sphere)
    const visorGeo = new THREE.SphereGeometry(0.25, 12, 10);
    const visorMat = new THREE.MeshToonMaterial({ color: 0x00ffff, emissive: 0x004444 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 1.55, 0.2);
    visor.castShadow = true;
    group.add(visor);

    return group;
  }

  private onClick(): void {
    const canvas = document.querySelector('canvas');
    if (canvas && document.pointerLockElement !== canvas) {
      canvas.requestPointerLock();
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (document.pointerLockElement) {
      this.yaw -= e.movementX * MOUSE_SENSITIVITY;
      this.pitch -= e.movementY * MOUSE_SENSITIVITY;
      this.pitch = Math.max(-0.4, Math.min(1.0, this.pitch));
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.code);

    // Emote keys: Digit1 - Digit4
    const emoteMatch = e.code.match(/^Digit([1-4])$/);
    if (emoteMatch && this.onEmote) {
      this.onEmote(parseInt(emoteMatch[1]) - 1);
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
  }

  /** Feed mobile input each frame before calling update() */
  setMobileInput(input: MobileInput): void {
    this.mobileInput = input;
  }

  update(dt: number, getTerrainHeight: (x: number, z: number) => number): void {
    // --- Gather input ---
    let moveX = 0;
    let moveZ = 0;
    let wantJump = false;
    let sprint = false;
    let lookDX = 0;
    let lookDY = 0;

    if (this.mobileInput) {
      moveX = this.mobileInput.moveX;
      moveZ = this.mobileInput.moveZ;
      lookDX = this.mobileInput.lookDX;
      lookDY = this.mobileInput.lookDY;
      wantJump = this.mobileInput.jump;
      this.mobileInput = null;
    }

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp'))    moveZ -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown'))  moveZ += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft'))  moveX -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) moveX += 1;
    if (this.keys.has('Space')) wantJump = true;
    if (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) sprint = true;

    // Apply mobile look (convert deltas to yaw/pitch)
    this.yaw -= lookDX * MOUSE_SENSITIVITY;
    this.pitch -= lookDY * MOUSE_SENSITIVITY;
    this.pitch = Math.max(-0.4, Math.min(1.0, this.pitch));

    // --- Normalize movement ---
    const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (len > 1) { moveX /= len; moveZ /= len; }

    const speed = MOVE_SPEED * (sprint ? SPRINT_MULTIPLIER : 1);

    // World-space movement relative to yaw
    const cos = Math.cos(this.yaw);
    const sin = Math.sin(this.yaw);
    const worldX = moveX * cos - moveZ * sin;
    const worldZ = moveX * sin + moveZ * cos;

    this.position.x += worldX * speed * dt;
    this.position.z += worldZ * speed * dt;

    // --- Gravity / jump ---
    this.velocityY += GRAVITY * dt;
    this.position.y += this.velocityY * dt;

    // Ground collision
    const groundY = getTerrainHeight(this.position.x, this.position.z);
    const playerBottom = groundY + 0.01; // player feet at ground level
    if (this.position.y <= playerBottom) {
      this.position.y = playerBottom;
      if (this.velocityY < 0) this.velocityY = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    if (wantJump && this.onGround) {
      this.velocityY = JUMP_FORCE;
      this.onGround = false;
    }

    // --- Update mesh ---
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.yaw + Math.PI; // Mesh faces +Z, camera is behind at +Z, so flip

    // --- Update camera (3rd person orbit) ---
    const camX = this.position.x + Math.sin(this.yaw) * CAMERA_DISTANCE * Math.cos(this.pitch);
    const camZ = this.position.z + Math.cos(this.yaw) * CAMERA_DISTANCE * Math.cos(this.pitch);
    const camY = this.position.y + CAMERA_HEIGHT + CAMERA_DISTANCE * Math.sin(this.pitch);

    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(
      this.position.x,
      this.position.y + 1.0,
      this.position.z
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
    document.removeEventListener('click', this._onClick);
    this.scene.remove(this.mesh);
  }
}
