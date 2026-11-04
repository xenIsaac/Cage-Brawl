import * as THREE from 'three';
import { Fighter } from '../../types';

export interface JointNodes {
  root: THREE.Group;
  waist: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  headMesh: THREE.Mesh;
  shoulderLeft: THREE.Group;
  upperArmLeft: THREE.Mesh;
  elbowLeft: THREE.Group;
  forearmLeft: THREE.Mesh;
  handLeft: THREE.Group;
  handMeshLeft: THREE.Mesh;
  shoulderRight: THREE.Group;
  upperArmRight: THREE.Mesh;
  elbowRight: THREE.Group;
  forearmRight: THREE.Mesh;
  handRight: THREE.Group;
  handMeshRight: THREE.Mesh;
  hipLeft: THREE.Group;
  thighLeft: THREE.Mesh;
  kneeLeft: THREE.Group;
  shinLeft: THREE.Mesh;
  hipRight: THREE.Group;
  thighRight: THREE.Mesh;
  kneeRight: THREE.Group;
  shinRight: THREE.Mesh;
}

interface SkeletalSnapshot {
  clone: THREE.Group;
  materials: THREE.MeshBasicMaterial[];
  life: number;
  maxLife: number;
}

export class Fighter3D {
  public root: THREE.Group;
  public joints: JointNodes;
  public ghostsGroup: THREE.Group;

  private primaryMaterial: THREE.MeshStandardMaterial;
  private secondaryMaterial: THREE.MeshStandardMaterial;
  private skinMaterial: THREE.MeshStandardMaterial;
  private jointMaterial: THREE.MeshStandardMaterial;

  private currentColor: string = '#38bdf8';
  private currentSecColor: string = '#f59e0b';
  private isPlayer: boolean;

  // SECTION 1.22: Dynamic Skeletal Snapshot Afterimage System
  private snapshots: SkeletalSnapshot[] = [];
  private wasDashing: boolean = false;
  private lastSnapshotProgress: number = 0;

  constructor(isPlayer: boolean = true) {
    this.isPlayer = isPlayer;
    this.root = new THREE.Group();
    this.root.name = isPlayer ? 'Player3DRoot' : 'Dummy3DRoot';

    this.ghostsGroup = new THREE.Group();
    this.ghostsGroup.name = isPlayer ? 'PlayerGhostsGroup' : 'DummyGhostsGroup';

    // Materials with high-contrast, clean low-poly lighting
    this.primaryMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.currentColor),
      roughness: 0.45,
      metalness: 0.15,
      flatShading: true,
    });

    this.secondaryMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.currentSecColor),
      roughness: 0.35,
      metalness: 0.25,
      flatShading: true,
    });

    this.skinMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#d4a373'),
      roughness: 0.6,
      metalness: 0.05,
      flatShading: true,
    });

    this.jointMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1e293b'),
      roughness: 0.5,
      metalness: 0.2,
      flatShading: true,
    });

    this.joints = this.buildHierarchicalRig();
    this.root.add(this.joints.root);

    // Apply initial Baseline Combat Ready Stance
    this.applyBaselinePose();
  }

  /**
   * SECTION 1.21 & 1.22: Constructs the clean, streamlined low-poly articulated rig
   * - Head: Pure solid cube (zero rectangle eyes, zero facial features)
   * - Torso: Square chest + slim square waist
   * - Arms: Upper arm rectangle + forearm rectangle + square hand cube
   * - Legs: Thigh rectangle + shin rectangle (shin bottom tip rests directly on mat floor; zero separate foot boxes)
   */
  private buildHierarchicalRig(): JointNodes {
    const root = new THREE.Group();
    root.name = 'RigRoot';

    // 1. Waist / Pelvis (Slim Square Box)
    const waist = new THREE.Group();
    waist.name = 'WaistJoint';
    waist.position.set(0, 0.90, 0);

    const waistGeo = new THREE.BoxGeometry(0.36, 0.18, 0.24);
    const waistMesh = new THREE.Mesh(waistGeo, this.secondaryMaterial);
    waistMesh.name = 'WaistMesh';
    waistMesh.castShadow = true;
    waistMesh.receiveShadow = true;
    waist.add(waistMesh);
    root.add(waist);

    // 2. Chest / Torso (Square Box)
    const torso = new THREE.Group();
    torso.name = 'TorsoJoint';
    torso.position.set(0, 0.09, 0);

    const torsoGeo = new THREE.BoxGeometry(0.48, 0.44, 0.28);
    const torsoMesh = new THREE.Mesh(torsoGeo, this.primaryMaterial);
    torsoMesh.name = 'TorsoMesh';
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    torsoMesh.position.set(0, 0.22, 0);
    torso.add(torsoMesh);
    waist.add(torso);

    // 3. Head (Pure Solid Cube - Section 1.21: NO rectangle eyes, NO facial features)
    const head = new THREE.Group();
    head.name = 'HeadJoint';
    head.position.set(0, 0.44, 0);

    const headGeo = new THREE.BoxGeometry(0.26, 0.26, 0.26);
    const headMesh = new THREE.Mesh(headGeo, this.skinMaterial);
    headMesh.name = 'HeadMesh';
    headMesh.castShadow = true;
    headMesh.receiveShadow = true;
    headMesh.position.set(0, 0.16, 0);
    head.add(headMesh);
    torso.add(head);

    // 4. LEFT ARM: Upper Arm -> Forearm -> Hand
    const shoulderLeft = new THREE.Group();
    shoulderLeft.name = 'ShoulderLeftJoint';
    shoulderLeft.position.set(0.28, 0.38, 0);

    const upperArmLeftGeo = new THREE.BoxGeometry(0.14, 0.36, 0.14);
    upperArmLeftGeo.translate(0, -0.18, 0);
    const upperArmLeft = new THREE.Mesh(upperArmLeftGeo, this.primaryMaterial);
    upperArmLeft.name = 'UpperArmLeft';
    upperArmLeft.castShadow = true;
    upperArmLeft.receiveShadow = true;
    shoulderLeft.add(upperArmLeft);
    torso.add(shoulderLeft);

    const elbowLeft = new THREE.Group();
    elbowLeft.name = 'ElbowLeftJoint';
    elbowLeft.position.set(0, -0.36, 0);

    const forearmLeftGeo = new THREE.BoxGeometry(0.13, 0.34, 0.13);
    forearmLeftGeo.translate(0, -0.17, 0);
    const forearmLeft = new THREE.Mesh(forearmLeftGeo, this.primaryMaterial);
    forearmLeft.name = 'ForearmLeft';
    forearmLeft.castShadow = true;
    forearmLeft.receiveShadow = true;
    elbowLeft.add(forearmLeft);
    shoulderLeft.add(elbowLeft);

    const handLeft = new THREE.Group();
    handLeft.name = 'HandLeftJoint';
    handLeft.position.set(0, -0.34, 0);

    const handLeftGeo = new THREE.BoxGeometry(0.17, 0.17, 0.17);
    handLeftGeo.translate(0, -0.08, 0);
    const handMeshLeft = new THREE.Mesh(handLeftGeo, this.secondaryMaterial);
    handMeshLeft.name = 'HandMeshLeft';
    handMeshLeft.castShadow = true;
    handMeshLeft.receiveShadow = true;
    handLeft.add(handMeshLeft);
    elbowLeft.add(handLeft);

    // 5. RIGHT ARM: Upper Arm -> Forearm -> Hand
    const shoulderRight = new THREE.Group();
    shoulderRight.name = 'ShoulderRightJoint';
    shoulderRight.position.set(-0.28, 0.38, 0);

    const upperArmRightGeo = new THREE.BoxGeometry(0.14, 0.36, 0.14);
    upperArmRightGeo.translate(0, -0.18, 0);
    const upperArmRight = new THREE.Mesh(upperArmRightGeo, this.primaryMaterial);
    upperArmRight.name = 'UpperArmRight';
    upperArmRight.castShadow = true;
    upperArmRight.receiveShadow = true;
    shoulderRight.add(upperArmRight);
    torso.add(shoulderRight);

    const elbowRight = new THREE.Group();
    elbowRight.name = 'ElbowRightJoint';
    elbowRight.position.set(0, -0.36, 0);

    const forearmRightGeo = new THREE.BoxGeometry(0.13, 0.34, 0.13);
    forearmRightGeo.translate(0, -0.17, 0);
    const forearmRight = new THREE.Mesh(forearmRightGeo, this.primaryMaterial);
    forearmRight.name = 'ForearmRight';
    forearmRight.castShadow = true;
    forearmRight.receiveShadow = true;
    elbowRight.add(forearmRight);
    shoulderRight.add(elbowRight);

    const handRight = new THREE.Group();
    handRight.name = 'HandRightJoint';
    handRight.position.set(0, -0.34, 0);

    const handRightGeo = new THREE.BoxGeometry(0.17, 0.17, 0.17);
    handRightGeo.translate(0, -0.08, 0);
    const handMeshRight = new THREE.Mesh(handRightGeo, this.secondaryMaterial);
    handMeshRight.name = 'HandMeshRight';
    handMeshRight.castShadow = true;
    handMeshRight.receiveShadow = true;
    handRight.add(handMeshRight);
    elbowRight.add(handRight);

    // 6. LEFT LEG: Thigh -> Shin (Knee-Tip Stride - Section 1.21: ZERO foot boxes)
    const hipLeft = new THREE.Group();
    hipLeft.name = 'HipLeftJoint';
    hipLeft.position.set(0.16, -0.09, 0);

    const thighLeftGeo = new THREE.BoxGeometry(0.16, 0.44, 0.16);
    thighLeftGeo.translate(0, -0.22, 0);
    const thighLeft = new THREE.Mesh(thighLeftGeo, this.secondaryMaterial);
    thighLeft.name = 'ThighLeft';
    thighLeft.castShadow = true;
    thighLeft.receiveShadow = true;
    hipLeft.add(thighLeft);
    waist.add(hipLeft);

    const kneeLeft = new THREE.Group();
    kneeLeft.name = 'KneeLeftJoint';
    kneeLeft.position.set(0, -0.44, 0);

    // Streamlined lower leg block with tip that rests cleanly on floor mat
    const shinLeftGeo = new THREE.BoxGeometry(0.13, 0.46, 0.13);
    shinLeftGeo.translate(0, -0.23, 0);
    const shinLeft = new THREE.Mesh(shinLeftGeo, this.skinMaterial);
    shinLeft.name = 'ShinLeft';
    shinLeft.castShadow = true;
    shinLeft.receiveShadow = true;
    kneeLeft.add(shinLeft);
    hipLeft.add(kneeLeft);

    // 7. RIGHT LEG: Thigh -> Shin (Knee-Tip Stride - Section 1.21: ZERO foot boxes)
    const hipRight = new THREE.Group();
    hipRight.name = 'HipRightJoint';
    hipRight.position.set(-0.16, -0.09, 0);

    const thighRightGeo = new THREE.BoxGeometry(0.16, 0.44, 0.16);
    thighRightGeo.translate(0, -0.22, 0);
    const thighRight = new THREE.Mesh(thighRightGeo, this.secondaryMaterial);
    thighRight.name = 'ThighRight';
    thighRight.castShadow = true;
    thighRight.receiveShadow = true;
    hipRight.add(thighRight);
    waist.add(hipRight);

    const kneeRight = new THREE.Group();
    kneeRight.name = 'KneeRightJoint';
    kneeRight.position.set(0, -0.44, 0);

    const shinRightGeo = new THREE.BoxGeometry(0.13, 0.46, 0.13);
    shinRightGeo.translate(0, -0.23, 0);
    const shinRight = new THREE.Mesh(shinRightGeo, this.skinMaterial);
    shinRight.name = 'ShinRight';
    shinRight.castShadow = true;
    shinRight.receiveShadow = true;
    kneeRight.add(shinRight);
    hipRight.add(kneeRight);

    return {
      root,
      waist,
      torso,
      head,
      headMesh,
      shoulderLeft,
      upperArmLeft,
      elbowLeft,
      forearmLeft,
      handLeft,
      handMeshLeft,
      shoulderRight,
      upperArmRight,
      elbowRight,
      forearmRight,
      handRight,
      handMeshRight,
      hipLeft,
      thighLeft,
      kneeLeft,
      shinLeft,
      hipRight,
      thighRight,
      kneeRight,
      shinRight,
    };
  }

  /**
   * SECTION 1.22: Dynamic Skeletal Snapshot Spawning (Clone Duplication)
   * Deep clones the entire Fighter3DRoot hierarchy at the exact current frame,
   * preserving joint angles, scales, and poses (punching, blocking, or recoiling).
   * Overrides all mesh materials with an unlit translucent white ghost material (#FFFFFF, opacity 0.35).
   * ZERO static floor rectangles or generic decals.
   */
  private spawnSkeletalSnapshot(): void {
    // 1. Pose Cloning (clone(true))
    const clonedHierarchy = this.root.clone(true);
    clonedHierarchy.name = 'DynamicSkeletalSnapshot';
    clonedHierarchy.position.copy(this.root.position);
    clonedHierarchy.rotation.copy(this.root.rotation);
    clonedHierarchy.scale.copy(this.root.scale);
    clonedHierarchy.visible = true;

    const materials: THREE.MeshBasicMaterial[] = [];

    // 2. Material Override: Translucent White Ghost (opacity 0.35, unlit MeshBasicMaterial)
    clonedHierarchy.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        const ghostMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
        });
        mesh.material = ghostMat;
        materials.push(ghostMat);
      }
    });

    this.ghostsGroup.add(clonedHierarchy);
    this.snapshots.push({
      clone: clonedHierarchy,
      materials,
      life: 0,
      maxLife: 15, // Fades out smoothly over 15 frames (~0.25 seconds)
    });
  }

  /**
   * SECTION 1.22: Smooth Temporal Fade-Out & Clean Disposal
   * Afterimages remain stationary in 3D world space where they were spawned.
   * Fades opacity from 0.35 -> 0.0 over 15 frames, then disposes cleanly.
   */
  private updateSnapshots(): void {
    for (let i = this.snapshots.length - 1; i >= 0; i--) {
      const snap = this.snapshots[i];
      snap.life++;
      const progress = snap.life / snap.maxLife;
      const currentOpacity = Math.max(0, 0.35 * (1 - progress));

      for (const mat of snap.materials) {
        mat.opacity = currentOpacity;
      }

      if (snap.life >= snap.maxLife) {
        // Clean disposal from memory
        this.ghostsGroup.remove(snap.clone);
        snap.clone.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) {
            const mesh = node as THREE.Mesh;
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => m.dispose());
            } else {
              mesh.material?.dispose();
            }
          }
        });
        this.snapshots.splice(i, 1);
      }
    }
  }

  /**
   * SECTION 1.21: Interim Baseline Pose (Knee-Tip Stride)
   * Stable 3D Combat Ready Stance:
   * - Balanced stance depth with knees hinged
   * - Shin bottom tips rest cleanly on floor mat (peg-style base, zero foot-clipping)
   * - Torso angled slightly forward in athletic poise
   * - Arms chambered at chest level, elbows tucked, fists facing forward
   */
  public applyBaselinePose(): void {
    const j = this.joints;

    // Pelvis / Waist: athletic stance with slight hip turn
    j.waist.rotation.set(0, 0.15, 0);
    j.waist.position.set(0, 0.82, 0); // Squat for knee flex

    // Chest / Torso: upright with subtle forward lean
    j.torso.rotation.set(0.08, -0.05, 0);

    // Head: gazing forward along vector (clean solid cube)
    j.head.rotation.set(-0.06, -0.10, 0);

    // Left Arm (Lead guard): chambered at chin height
    j.shoulderLeft.rotation.set(0.45, 0.25, -0.35);
    j.elbowLeft.rotation.set(-1.45, 0.15, 0.20);
    j.handLeft.rotation.set(0, 0, 0);

    // Right Arm (Rear guard): tucked tight guarding cheek/ribs
    j.shoulderRight.rotation.set(0.35, -0.30, 0.35);
    j.elbowRight.rotation.set(-1.55, -0.20, -0.25);
    j.handRight.rotation.set(0, 0, 0);

    // Left Leg (Lead): slightly forward with flexed knee, bottom of shin on floor
    j.hipLeft.rotation.set(-0.25, 0.10, -0.08);
    j.kneeLeft.rotation.set(0.35, 0, 0);

    // Right Leg (Rear): anchored backward with flexed knee, bottom of shin on floor
    j.hipRight.rotation.set(0.20, -0.15, 0.08);
    j.kneeRight.rotation.set(0.30, 0, 0);
  }

  /**
   * Updates fighter style colors and dynamic materials
   */
  public updateColors(primary: string, secondary: string): void {
    if (this.currentColor !== primary) {
      this.currentColor = primary;
      this.primaryMaterial.color.set(primary);
    }
    if (this.currentSecColor !== secondary) {
      this.currentSecColor = secondary;
      this.secondaryMaterial.color.set(secondary);
    }
  }

  /**
   * Synchronizes 3D rig with combat fighter state
   * Maps 2D simulation coordinates to 3D Octagon world space.
   */
  public syncState(fighter: Fighter | null, gameTime: number, arenaSize: number): void {
    if (!fighter) {
      this.root.visible = false;
      this.ghostsGroup.visible = false;
      return;
    }

    this.root.visible = !fighter.isDead;
    this.ghostsGroup.visible = !fighter.isDead;
    if (fighter.isDead) return;

    // Coordinate mapping: 2D arena canvas (0..arenaSize) -> 3D world space centered at (0, 0, 0)
    const worldScale = 18 / arenaSize;
    const x3D = (fighter.x - arenaSize / 2) * worldScale;
    const z3D = (fighter.y - arenaSize / 2) * worldScale;

    this.root.position.x = x3D;
    this.root.position.z = z3D;
    this.root.position.y = 0; // Bottom of shins strictly planted on mat surface

    const facingRotY = -fighter.facingAngle + Math.PI / 2;
    this.root.rotation.y = facingRotY;

    // Update style colors
    if (fighter.color && fighter.secondaryColor) {
      this.updateColors(fighter.color, fighter.secondaryColor);
    }

    // Dynamic scale based on fighter height modifiers
    const scaleFactor = (fighter.radius || 26) / 26;
    this.root.scale.set(scaleFactor, scaleFactor, scaleFactor);

    // Athletic breathing idle pulse in baseline pose
    const breath = Math.sin(gameTime * 0.06) * 0.02;
    this.joints.torso.position.y = 0.09 + breath;

    // SECTION 1.22: DYNAMIC SKELETAL SNAPSHOT DASH VFX TRIGGER
    const isDashing = Boolean(
      fighter.isDashing ||
      (fighter.dashProgress && fighter.dashProgress > 0) ||
      ((fighter.dashWhiteFrameFlashTime || 0) > 0)
    );

    if (isDashing) {
      if (!this.wasDashing) {
        // [ DASH ACTIVATED (Frame 0) ]: CLONE 1 freezes current 3D pose, scales, and joint angles
        this.spawnSkeletalSnapshot();
        this.lastSnapshotProgress = fighter.dashProgress || 18;
      } else {
        // [ DASH MIDPOINT (Frame 8) ]: CLONE 2 freezes updated pose/animation state
        const currentProgress = fighter.dashProgress || 0;
        if (Math.abs((this.lastSnapshotProgress || 0) - currentProgress) >= 7) {
          this.spawnSkeletalSnapshot();
          this.lastSnapshotProgress = currentProgress;
        }
      }
    }
    this.wasDashing = isDashing;

    // Update temporal fade-out for active snapshots
    this.updateSnapshots();

    // Damage & Flash feedback
    if (fighter.damageFlashTime && fighter.damageFlashTime > 0) {
      const flashIntensity = Math.min(1.0, fighter.damageFlashTime / 12);
      this.primaryMaterial.emissive.setRGB(flashIntensity * 0.9, flashIntensity * 0.9, flashIntensity * 0.9);
      this.secondaryMaterial.emissive.setRGB(flashIntensity * 0.8, flashIntensity * 0.8, flashIntensity * 0.8);
    } else if (fighter.superArmorFlashTime && fighter.superArmorFlashTime > 0) {
      this.primaryMaterial.emissive.setHex(0xf59e0b);
      this.secondaryMaterial.emissive.setHex(0xf59e0b);
    } else if (fighter.parryFlashTime && fighter.parryFlashTime > 0) {
      this.primaryMaterial.emissive.setHex(0x38bdf8);
      this.secondaryMaterial.emissive.setHex(0x38bdf8);
    } else if (isDashing) {
      // 3D Volumetric white frame flash during dash
      this.primaryMaterial.emissive.setHex(0xffffff);
      this.secondaryMaterial.emissive.setHex(0xffffff);
    } else {
      this.primaryMaterial.emissive.setHex(0x000000);
      this.secondaryMaterial.emissive.setHex(0x000000);
    }

    // Guard & Animation kinematics
    if (fighter.isBlocking) {
      if (fighter.styleId === 'street_boxing') {
        this.applyStreetBoxingBlock(fighter, gameTime);
      } else {
        this.joints.shoulderLeft.rotation.set(0.75, 0.45, -0.15);
        this.joints.elbowLeft.rotation.set(-1.85, 0.10, 0.10);
        this.joints.shoulderRight.rotation.set(0.75, -0.45, 0.15);
        this.joints.elbowRight.rotation.set(-1.85, -0.10, -0.10);
        this.joints.torso.rotation.set(0.12, 0, 0);
      }
    } else if (fighter.styleId === 'street_boxing') {
      this.applyStreetBoxingKinematics(fighter, gameTime);
    } else {
      this.applyBaselinePose();
    }
  }

  /**
   * SECTION 1.25: 3D STREET BOXING COMPLETE ANIMATION SUITE
   * 1. Resting Idle Stance: Stiff Poke Guard (Killing the T-Pose)
   * 2. Locomotion: Predatory Pocket Shuffle (Walk & Sprint Cycle)
   * 3. Guard & Defensive Mechanics: Clamped Pocket Shell (Block) & Recoil
   * 4. Torso Torque Engine for Strikes (M1 & M2)
   */
  private applyStreetBoxingKinematics(fighter: Fighter, gameTime: number): void {
    const timeSec = gameTime / 60;
    const breath = Math.sin(timeSec * 1.2 * Math.PI * 2) * 0.005;

    const leftFist = fighter.fists ? fighter.fists.find(f => f.punchType === 'left') : undefined;
    const rightFist = fighter.fists ? fighter.fists.find(f => f.punchType === 'right') : undefined;

    const isLeftPunching = leftFist ? (leftFist.isPunching || leftFist.punchProgress > 0) : false;
    const isRightPunching = rightFist ? (rightFist.isPunching || rightFist.punchProgress > 0) : false;

    // Active strike identification
    const activeFist = isLeftPunching ? leftFist : (isRightPunching ? rightFist : undefined);
    const isHeavy = Boolean(
      activeFist?.isHeavy || 
      (fighter.heavyWindup && fighter.heavyWindup > 0) || 
      (fighter.streetBoxingM2Stage && fighter.streetBoxingM2Stage > 0)
    );

    // 1. Heavy Strike (M2): 3-Hit Heavy Flurry (Right Jab 1 -> Right Jab 2 -> Left Hook 3)
    if (isHeavy) {
      this.animateStreetBoxingM2(fighter, leftFist, rightFist, activeFist);
      return;
    }

    // 2. Light Strike (M1): 4-Combo Torque Sequence S1 -> S2 -> S3 -> S4
    if (activeFist && (activeFist.isPunching || activeFist.punchProgress > 0)) {
      const stage = activeFist.comboStage !== undefined 
        ? activeFist.comboStage 
        : (fighter.comboStage === 0 ? 3 : Math.max(0, fighter.comboStage - 1));
      this.animateStreetBoxingM1(fighter, leftFist, rightFist, activeFist, stage);
      return;
    }

    // 3. Stance / Idle / Locomotion Alignment
    if ((fighter.comboStage || 0) > 0 && (fighter.comboResetTimer || 0) > 0) {
      this.applyStreetBoxingInsideGuard(fighter, breath, gameTime);
    } else {
      this.applyStreetBoxingStiffPokeGuard(breath, gameTime, fighter);
    }
  }

  /**
   * 🛡️ 3. Guard & Defensive Mechanics: Clamped Pocket Shell (Block)
   * Three.js Euler Rotation Matrix:
   * - Torso Hunch: chest.rotation.x = 0.25 rad (~15° forward tilt)
   * - Shoulders: left(0.50, 0.20, -0.10), right(0.50, -0.20, 0.10)
   * - Forearms: leftElbow.x = -1.50 rad, rightElbow.x = -1.50 rad (straight up)
   * - On-Hit Recoil: -4px Z compression on hit
   */
  public applyStreetBoxingBlock(fighter: Fighter, gameTime: number): void {
    const j = this.joints;
    const timeSec = gameTime / 60;
    const breath = Math.sin(timeSec * 1.2 * Math.PI * 2) * 0.005;

    // On-Hit Guard Recoil: Absorbing strikes compresses chest mesh backward (-4px ~ -0.012 in Z)
    const isHitRecoil = (fighter.damageFlashTime && fighter.damageFlashTime > 0) || (fighter.parryFlashTime && fighter.parryFlashTime > 0);
    const zRecoilOffset = isHitRecoil ? 0.015 : 0;

    j.waist.rotation.set(0, 0.20, 0);
    j.waist.position.set(0, 0.82, 0);

    // Torso Hunch: chest.rotation.x = 0.25 rad (~15° forward tilt)
    j.torso.rotation.set(0.25, 0.25, 0);
    j.torso.position.set(0, 0.09 + breath, zRecoilOffset);

    // Head tucked behind guards
    j.head.rotation.set(-0.12, -0.18, 0);

    // Both Shoulders: clamped in front of chest
    j.shoulderLeft.rotation.set(0.50, 0.20, -0.10);
    j.shoulderRight.rotation.set(0.50, -0.20, 0.10);

    // Both Forearms: rotation.x = -1.50 rad (straight up, parallel in front of face)
    j.elbowLeft.rotation.set(-1.50, 0.05, 0);
    j.elbowRight.rotation.set(-1.50, -0.05, 0);

    j.handLeft.rotation.set(0, 0, 0);
    j.handRight.rotation.set(0, 0, 0);

    // Legs: Staggered athletic base
    j.hipLeft.position.z = -0.08;
    j.hipRight.position.z = 0.08;
    j.hipLeft.rotation.set(-0.25, 0.10, -0.08);
    j.kneeLeft.rotation.set(0.35, 0, 0);
    j.hipRight.rotation.set(0.20, -0.15, 0.08);
    j.kneeRight.rotation.set(0.30, 0, 0);
  }

  /**
   * 🥋 1. Resting Idle Stance & 2. Predatory Pocket Shuffle (Locomotion)
   * Official Specification Matrix:
   * - Chest: rotation.y = 0.40 rad (~23° bladed angle)
   * - Left Upper Arm (Shoulder): rotation.set(0.35, 0.20, -0.15)
   * - Left Forearm (Elbow): rotation.x = -0.45 rad (holding forward at 80% reach)
   * - Right Upper Arm (Shoulder): rotation.set(0.20, -0.30, 0.10)
   * - Right Forearm (Elbow): rotation.x = -1.25 rad (clamped tight against chin)
   * - Thighs/Shins: Lead left offset +8px (-0.08 in Z), rear right -8px (+0.08 in Z)
   * - Breathing pulse: 1.2 Hz vertical pulse (±2px)
   * - Locomotion: 2.2 Hz shuffle stride (±0.35 rad swing on X-axis, minimal knee lift)
   * - Sprint Variant: Torso tilts 15° lower (+0.26 rad), freq +40% (3.08 Hz), elbows tuck 10%
   */
  public applyStreetBoxingStiffPokeGuard(breath: number, gameTime: number, fighter?: Fighter): void {
    const j = this.joints;

    const speed = fighter ? Math.hypot(fighter.vx || 0, fighter.vy || 0) : 0;
    const isMoving = speed > 0.05;
    const isSprinting = Boolean(fighter?.isSprinting && isMoving);

    // Stride frequencies: 2.2 Hz normal shuffle, 3.08 Hz (+40%) sprint
    const strideFreq = isSprinting ? 3.08 : 2.2;
    const stridePhase = (gameTime / 60) * strideFreq * Math.PI * 2;

    // Pelvis / Waist: athletic stance with 0.40 rad (~23°) bladed angle
    j.waist.rotation.set(0, 0.20, 0);
    j.waist.position.set(0, 0.82, 0);

    // Chest / Torso: rotation.y = 0.40 rad (~23° bladed angle)
    const torsoForwardTilt = 0.06 + (isSprinting ? 0.26 : (isMoving ? 0.05 : 0));
    const verticalBob = isMoving ? Math.abs(Math.sin(stridePhase)) * 0.006 : 0;
    j.torso.rotation.set(torsoForwardTilt, 0.40, 0);
    j.torso.position.set(0, 0.09 + breath + verticalBob, 0);

    // Head: turns forward looking down target vector
    j.head.rotation.set(-0.04, -0.32, 0);

    // Elbow tuck factor for sprint (-10%)
    const tuck = isSprinting ? 0.90 : 1.0;

    // Left Arm (Lead Poke):
    // Left Upper Arm (Shoulder): rotation.set(0.35, 0.20, -0.15)
    j.shoulderLeft.rotation.set(0.35, 0.20, -0.15 * tuck);
    // Left Forearm (Elbow): rotation.x = -0.45 rad (holding hand forward at 80% reach as measuring stick)
    j.elbowLeft.rotation.set(-0.45, 0.05, 0);
    j.handLeft.rotation.set(0, 0, 0);

    // Right Arm (Chin Guard):
    // Right Upper Arm (Shoulder): rotation.set(0.20, -0.30, 0.10)
    j.shoulderRight.rotation.set(0.20, -0.30, 0.10 * tuck);
    // Right Forearm (Elbow): rotation.x = -1.25 rad (deep vertical bend pressing hand against chin)
    j.elbowRight.rotation.set(-1.25, -0.20, -0.10);
    j.handRight.rotation.set(0, 0, 0);

    // Legs: Staggered athletic base (Lead left +8px / -0.08 Z; rear right -8px / +0.08 Z)
    j.hipLeft.position.z = -0.08;
    j.hipRight.position.z = 0.08;

    if (isMoving) {
      // Predatory Pocket Shuffle (Walk / Sprint Cycle)
      const legSwing = Math.sin(stridePhase) * 0.35;
      j.hipLeft.rotation.set(legSwing - 0.20, 0.10, -0.08);
      j.kneeLeft.rotation.set(Math.max(0, Math.sin(stridePhase)) * 0.12 + 0.25, 0, 0);

      j.hipRight.rotation.set(-legSwing + 0.15, -0.15, 0.08);
      j.kneeRight.rotation.set(Math.max(0, -Math.sin(stridePhase)) * 0.12 + 0.20, 0, 0);
    } else {
      // Stationary Staggered Base
      j.hipLeft.rotation.set(-0.25, 0.10, -0.08);
      j.kneeLeft.rotation.set(0.35, 0, 0);
      j.hipRight.rotation.set(0.20, -0.15, 0.08);
      j.kneeRight.rotation.set(0.30, 0, 0);
    }
  }

  /**
   * Threatening Inside-Boxing Guard Hold
   */
  private applyStreetBoxingInsideGuard(fighter: Fighter, breath: number, gameTime: number): void {
    const j = this.joints;
    const speed = Math.hypot(fighter.vx || 0, fighter.vy || 0);
    const isMoving = speed > 0.05;
    const stridePhase = (gameTime / 60) * 2.2 * Math.PI * 2;

    j.waist.rotation.set(0, 0.15, 0);
    j.waist.position.set(0, 0.82, 0);

    j.torso.rotation.set(0.08, 0.35, 0);
    j.torso.position.set(0, 0.09 + breath + (isMoving ? Math.abs(Math.sin(stridePhase)) * 0.006 : 0), 0);

    j.head.rotation.set(-0.04, -0.25, 0);

    // Left Arm: cocked at high measuring height ready to fire
    j.shoulderLeft.rotation.set(0.65, 0.18, -0.12);
    j.elbowLeft.rotation.set(-0.75, 0.08, 0.05);
    j.handLeft.rotation.set(0, 0, 0);

    // Right Arm: chin guard clamped tight
    j.shoulderRight.rotation.set(0.20, -0.30, 0.10);
    j.elbowRight.rotation.set(-1.25, -0.20, -0.10);
    j.handRight.rotation.set(0, 0, 0);

    j.hipLeft.position.z = -0.08;
    j.hipRight.position.z = 0.08;

    if (isMoving) {
      const legSwing = Math.sin(stridePhase) * 0.35;
      j.hipLeft.rotation.set(legSwing - 0.20, 0.10, -0.08);
      j.kneeLeft.rotation.set(Math.max(0, Math.sin(stridePhase)) * 0.12 + 0.25, 0, 0);
      j.hipRight.rotation.set(-legSwing + 0.15, -0.15, 0.08);
      j.kneeRight.rotation.set(Math.max(0, -Math.sin(stridePhase)) * 0.12 + 0.20, 0, 0);
    } else {
      j.hipLeft.rotation.set(-0.25, 0.10, -0.08);
      j.kneeLeft.rotation.set(0.35, 0, 0);
      j.hipRight.rotation.set(0.20, -0.15, 0.08);
      j.kneeRight.rotation.set(0.30, 0, 0);
    }
  }

  /**
   * 🌀 4A. M1 Combo Torque Flow
   * - S1 (Lead Left Poke Jab): chest.rotation.y twists +15° (+0.26 rad) forward, left forearm snaps to 100% reach in 3 frames, right hand glued to chin.
   * - S2 (Snap Left Jab): Torso uncoils from S1 follow-through driving another +15° twist into second poke.
   * - S3 (Rear Right Straight Cross): Massive Counter-Torque: chest.rotation.y violently twists -35° (-0.61 rad) in opposite direction. Right shoulder drives through centerline, left arm pulls to jaw as counterweight.
   * - S4 (Inside Left Hook Finisher): chest.rotation.y whips +40° (+0.70 rad) left. Left elbow locks at rigid 90° (-1.57 rad), sweeping forearm & glove horizontally.
   */
  private animateStreetBoxingM1(fighter: Fighter, leftFist: any, rightFist: any, activeFist: any, stage: number): void {
    const j = this.joints;
    const p = Math.max(0, Math.min(1.0, activeFist?.punchProgress || 0));
    const snapT = Math.sin(p * Math.PI * 0.5);

    if (stage === 0) {
      // S1: Lead Left Poke Jab
      // Chest: twists +15° (+0.26 rad) forward from 0.40 rad base
      j.torso.rotation.set(0.06, 0.40 + snapT * 0.26, 0);

      // Left forearm snaps to 100% reach (-0.05 rad) in 3 frames
      j.shoulderLeft.rotation.set(0.35 + snapT * 0.45, 0.20, -0.15);
      j.elbowLeft.rotation.set(-0.45 * (1 - snapT) - 0.05 * snapT, 0.05, 0);
      j.handLeft.rotation.set(0, 0, 0);

      // Right hand stays glued to chin
      j.shoulderRight.rotation.set(0.20, -0.30, 0.10);
      j.elbowRight.rotation.set(-1.25, -0.20, -0.10);
      j.handRight.rotation.set(0, 0, 0);
    } else if (stage === 1) {
      // S2: Snap Left Jab
      // Torso uncoils from S1 follow-through, driving another +15° (+0.26 rad) twist into second poke
      j.torso.rotation.set(0.06, 0.40 + snapT * 0.26, 0);

      j.shoulderLeft.rotation.set(0.50 + snapT * 0.35, 0.20, -0.15);
      j.elbowLeft.rotation.set(-0.80 * (1 - snapT) - 0.05 * snapT, 0.05, 0);
      j.handLeft.rotation.set(0, 0, 0);

      // Right hand glued to chin
      j.shoulderRight.rotation.set(0.20, -0.30, 0.10);
      j.elbowRight.rotation.set(-1.25, -0.20, -0.10);
      j.handRight.rotation.set(0, 0, 0);
    } else if (stage === 2) {
      // S3: Rear Right Straight Cross
      // Massive Counter-Torque: chest.rotation.y violently twists -35° (-0.61 rad) in opposite direction
      j.torso.rotation.set(0.06, 0.40 - snapT * 0.61, 0);
      j.waist.rotation.set(0, 0.20 - snapT * 0.35, 0);

      // Right shoulder drives through centerline as right arm punches straight out (100% reach)
      j.shoulderRight.rotation.set(0.20 + snapT * 0.85, -0.30 * (1 - snapT) + 0.10 * snapT, 0.10);
      j.elbowRight.rotation.set(-1.25 * (1 - snapT) - 0.05 * snapT, -0.20 * (1 - snapT), 0);
      j.handRight.rotation.set(0, 0, 0);

      // Left arm pulls back to jaw as opposing counterweight
      j.shoulderLeft.rotation.set(0.35 * (1 - snapT) + 0.20 * snapT, 0.20 * (1 - snapT) - 0.30 * snapT, -0.15);
      j.elbowLeft.rotation.set(-0.45 * (1 - snapT) - 1.25 * snapT, 0.05 * (1 - snapT) - 0.20 * snapT, 0);
      j.handLeft.rotation.set(0, 0, 0);
    } else {
      // S4: Inside Left Hook Finisher
      // chest.rotation.y whips +40° (+0.70 rad) to left
      j.torso.rotation.set(0.08, 0.40 + snapT * 0.70, 0);
      j.waist.rotation.set(0, 0.20 + snapT * 0.30, 0);

      // Left elbow locks at rigid 90° angle (-1.57 rad), sweeping forearm & glove horizontally
      j.shoulderLeft.rotation.set(0.85, 0.20 + snapT * 0.45, -0.25);
      j.elbowLeft.rotation.set(-1.57, 0.20, 0.10);
      j.handLeft.rotation.set(0, 0, 0);

      // Right hand glued to chin
      j.shoulderRight.rotation.set(0.20, -0.30, 0.10);
      j.elbowRight.rotation.set(-1.25, -0.20, -0.10);
      j.handRight.rotation.set(0, 0, 0);
    }
  }

  /**
   * 🌀 4B. M2 Heavy Flurry (Right Jab ➔ Right Jab ➔ Left Hook)
   * - Hits 1 & 2: Chest torques -25° (-0.44 rad), firing two machine-gun right jabs down pipe.
   * - Hit 3 (Finisher): Torso snaps violently from -25° to +45° (+0.78 rad), driving heavy left hook across target line with full body torque!
   */
  private animateStreetBoxingM2(fighter: Fighter, leftFist: any, rightFist: any, activeFist: any): void {
    const j = this.joints;
    const stage = fighter.streetBoxingM2Stage || 1;
    const p = Math.max(0, Math.min(1.0, activeFist?.punchProgress || 0));
    const t = Math.sin(p * Math.PI * 0.5);

    if (stage === 1 || stage === 2) {
      // Hits 1 & 2: Chest torques -25° (-0.44 rad), firing machine-gun right jabs down pipe
      j.torso.rotation.set(0.06, 0.40 - t * 0.44, 0);
      j.waist.rotation.set(0, 0.20 - t * 0.20, 0);

      j.shoulderRight.rotation.set(0.20 + t * 0.85, -0.30 * (1 - t) + 0.10 * t, 0.10);
      j.elbowRight.rotation.set(-1.25 * (1 - t) - 0.05 * t, -0.20 * (1 - t), 0);
      j.handRight.rotation.set(0, 0, 0);

      // Left arm guards chin
      j.shoulderLeft.rotation.set(0.20, 0.30, -0.15);
      j.elbowLeft.rotation.set(-1.25, 0.20, 0.10);
      j.handLeft.rotation.set(0, 0, 0);
    } else {
      // Hit 3 (Finisher): Torso snaps violently from -25° to +45° (+0.78 rad), driving heavy left hook
      j.torso.rotation.set(0.08, (0.40 - 0.44) * (1 - t) + (0.40 + 0.78) * t, 0);
      j.waist.rotation.set(0, 0.20 + t * 0.35, 0);

      // Right arm snaps back to protect chin
      j.shoulderRight.rotation.set(0.20, -0.30, 0.10);
      j.elbowRight.rotation.set(-1.25, -0.20, -0.10);
      j.handRight.rotation.set(0, 0, 0);

      // Left hook: elbow locked at rigid 90° (-1.57 rad)
      j.shoulderLeft.rotation.set(0.85, 0.20 + t * 0.55, -0.30);
      j.elbowLeft.rotation.set(-1.57, 0.20, 0.10);
      j.handLeft.rotation.set(0, 0, 0);
    }
  }

  public dispose(): void {
    this.primaryMaterial.dispose();
    this.secondaryMaterial.dispose();
    this.skinMaterial.dispose();
    this.jointMaterial.dispose();
    for (const snap of this.snapshots) {
      this.ghostsGroup.remove(snap.clone);
      snap.clone.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          const mesh = node as THREE.Mesh;
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
    }
    this.snapshots = [];
    this.root.clear();
    this.ghostsGroup.clear();
  }
}
