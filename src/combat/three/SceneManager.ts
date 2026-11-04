import * as THREE from 'three';
import { OctagonArena } from './OctagonArena';
import { Fighter3D } from './Fighter3D';
import { Fighter } from '../../types';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  public arena: OctagonArena;
  public player3D: Fighter3D;
  public dummy3D: Fighter3D;

  private canvas: HTMLCanvasElement;
  private width: number = 800;
  private height: number = 600;
  private isPortrait: boolean = false;

  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0.8, 0);
  private currentCameraPos: THREE.Vector3 = new THREE.Vector3(0, 8, 14);

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#050508');

    // Perspective camera with dynamic FOV
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);

    // High performance WebGLRenderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });

    const maxDpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.renderer.setPixelRatio(maxDpr);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // Add 3D Arena
    this.arena = new OctagonArena();
    this.scene.add(this.arena.root);

    // Add 3D Articulated Fighter Rigs and 3D Volumetric Ghost Trails
    this.player3D = new Fighter3D(true);
    this.dummy3D = new Fighter3D(false);
    this.scene.add(this.player3D.root);
    this.scene.add(this.player3D.ghostsGroup);
    this.scene.add(this.dummy3D.root);
    this.scene.add(this.dummy3D.ghostsGroup);

    this.resize();
  }

  /**
   * Dynamic Scaling: Portrait and Landscape UI adaptation
   * Adjusts camera frustum, distance, and pitch to ensure full viewport presence
   * without any page scrolling on mobile or desktop.
   */
  public resize(): void {
    const parent = this.canvas.parentElement || document.body;
    const w = parent.clientWidth || window.innerWidth;
    const h = parent.clientHeight || window.innerHeight;

    this.width = w;
    this.height = h;
    this.isPortrait = h > w;

    this.camera.aspect = w / h;

    if (this.isPortrait) {
      // Mobile portrait view: wider vertical FOV and elevated camera angle
      // keeps both fighters and the full octagon comfortably in view without scrolling
      this.camera.fov = 58;
    } else {
      // Landscape widescreen view: cinematic, tighter depth
      this.camera.fov = 42;
    }

    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  /**
   * Main 3D render loop called alongside combat tick
   */
  public updateAndRender(
    player: Fighter | null,
    dummy: Fighter | null,
    gameTime: number,
    arenaSize: number,
    shakeAmount: number = 0
  ): void {
    // 1. Sync 3D Fighter Rigs with current combat simulation
    this.player3D.syncState(player, gameTime, arenaSize);
    this.dummy3D.syncState(dummy, gameTime, arenaSize);

    // 2. Camera positioning & smooth dynamic tracking
    let targetX = 0;
    let targetZ = 0;
    let separation = 4.0;

    if (player && dummy && !player.isDead && !dummy.isDead) {
      targetX = (this.player3D.root.position.x + this.dummy3D.root.position.x) * 0.5;
      targetZ = (this.player3D.root.position.z + this.dummy3D.root.position.z) * 0.5;
      separation = this.player3D.root.position.distanceTo(this.dummy3D.root.position);
    } else if (player && !player.isDead) {
      targetX = this.player3D.root.position.x;
      targetZ = this.player3D.root.position.z;
    }

    // Dynamic camera distance depending on fighter separation and aspect ratio
    const baseDistance = this.isPortrait ? 13.5 : 10.5;
    const dynamicDist = Math.max(baseDistance, baseDistance + (separation - 3.5) * 0.45);
    const cameraHeight = this.isPortrait ? dynamicDist * 0.85 : dynamicDist * 0.58;

    // Desired camera position
    const desiredPos = new THREE.Vector3(
      targetX,
      cameraHeight,
      targetZ + dynamicDist
    );

    // Screen Shake recoil offset in 3D
    if (shakeAmount > 0) {
      const shakeFactor = Math.min(shakeAmount * 0.04, 0.45);
      desiredPos.x += (Math.random() - 0.5) * shakeFactor;
      desiredPos.y += (Math.random() - 0.5) * shakeFactor;
      desiredPos.z += (Math.random() - 0.5) * shakeFactor;
    }

    // Smooth camera lag
    this.currentCameraPos.lerp(desiredPos, 0.12);
    this.camera.position.copy(this.currentCameraPos);

    // Look at midpoint between fighters (slightly above floor at torso level)
    const desiredTarget = new THREE.Vector3(targetX, 0.9, targetZ);
    this.cameraTarget.lerp(desiredTarget, 0.15);
    this.camera.lookAt(this.cameraTarget);

    // 3. Render 3D scene
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.arena.dispose();
    this.player3D.dispose();
    this.dummy3D.dispose();
    this.renderer.dispose();
  }
}
