import * as THREE from 'three';
import { CombatFighter } from '../types';

export interface Fighter3DRig {
  root: THREE.Group;
  bodyGroup?: THREE.Group;
  shadowMesh?: THREE.Mesh;
  leftHip?: THREE.Group | THREE.Object3D;
  rightHip?: THREE.Group | THREE.Object3D;
  leftKnee?: THREE.Group | THREE.Object3D;
  rightKnee?: THREE.Group | THREE.Object3D;
  spine?: THREE.Group | THREE.Object3D;
  torso?: THREE.Group | THREE.Object3D;
  leftClavicle?: THREE.Group | THREE.Object3D;
  leftElbow?: THREE.Group | THREE.Object3D;
  rightClavicle?: THREE.Group | THREE.Object3D;
  rightElbow?: THREE.Group | THREE.Object3D;
  leftWrist?: THREE.Group | THREE.Object3D;
  rightWrist?: THREE.Group | THREE.Object3D;
  auraMesh?: THREE.Mesh;
  [key: string]: any;
}

/**
 * Updates the 3D humanoid fighter rig every frame based on the combat simulation state.
 * All transforms happen in bone local coordinates, ensuring zero stretching and physical joint integrity.
 */
export function updateFighter3DAnimation(
  rig: Fighter3DRig,
  fighter: CombatFighter,
  arenaWidth: number,
  arenaHeight: number,
  gameTime: number
) {
  const scale = 0.018;

  // 1. Root Position (Mapping 2D arena pixels to 3D world plane)
  // Arena center (arenaWidth / 2, arenaHeight / 2) -> (0, 0)
  const worldX = (fighter.x - arenaWidth / 2) * scale;
  const worldZ = (fighter.y - arenaHeight / 2) * scale;

  // Vertical Z/Y elevation for jumps, knockups, and Aikido Over-Head Slam
  let elevationY = 0;
  if (fighter.aikiSlamStage) {
    const slamProgress = Math.min(1.0, Math.max(0, (90 - ((fighter as any).aikiSlamTimer || 0)) / 90));
    // Parabolic throw arc through the air
    elevationY = Math.sin(slamProgress * Math.PI) * 1.8;
  }

  rig.root.position.set(worldX, elevationY, worldZ);

  // 2. Body Rotation (Facing angle)
  // In 2D, fighter.facingAngle is angle in radians. In Three.js, Y-axis is vertical up.
  const facingRad = (fighter as any).rotation ?? fighter.facingAngle ?? 0;
  rig.bodyGroup.rotation.y = -facingRad + Math.PI / 2;

  // Drop Shadow scaling based on elevation
  if (rig.shadowMesh) {
    const shadowScale = Math.max(0.4, 1.0 - elevationY * 0.4);
    rig.shadowMesh.scale.set(shadowScale, shadowScale, shadowScale);
    (rig.shadowMesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0.1, 0.45 - elevationY * 0.2);
  }

  // 3. Movement / Stepping Legs (Walking cycle)
  const isMoving = Math.hypot(fighter.vx || 0, fighter.vy || 0) > 0.2;
  const walkPhase = gameTime * 0.22;
  const idleBreathe = Math.sin(gameTime * 0.08) * 0.04;

  if (isMoving) {
    const legSwing = Math.sin(walkPhase) * 0.45;
    rig.leftHip.rotation.x = legSwing;
    rig.rightHip.rotation.x = -legSwing;
    rig.leftKnee.rotation.x = Math.max(0, -legSwing * 0.6);
    rig.rightKnee.rotation.x = Math.max(0, legSwing * 0.6);
  } else {
    // Martial arts ready stance (subtle knee bend)
    rig.leftHip.rotation.x = -0.15;
    rig.rightHip.rotation.x = 0.15;
    rig.leftKnee.rotation.x = 0.25;
    rig.rightKnee.rotation.x = 0.25;
  }

  // 4. Spine & Torso Posture
  rig.spine.position.y = (fighter.radius * scale * 0.22) + idleBreathe;
  rig.torso.rotation.x = 0.05; // Slight forward combat hunch

  // 5. Martial Arts Stance & Strike IK
  const rightFist = fighter.fists ? (fighter.fists.find(f => f.punchType === 'right') || fighter.fists[1]) : undefined;
  const leftFist = fighter.fists ? (fighter.fists.find(f => f.punchType === 'left') || fighter.fists[0]) : undefined;
  const rightProgress = rightFist ? rightFist.punchProgress : 0;
  const leftProgress = leftFist ? leftFist.punchProgress : 0;
  const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);

  // Default Guard Posture
  let leftUpperRotX = -0.65;
  let leftUpperRotZ = 0.40;
  let leftElbowBend = -1.35;

  let rightUpperRotX = -0.75;
  let rightUpperRotZ = -0.35;
  let rightElbowBend = -1.45;

  // Style-specific stances
  if (fighter.styleId === 'aikido') {
    // Hanmi open-palm ready guard: right arm extended forward, left arm tucked at ribs
    rightUpperRotX = -0.85;
    rightUpperRotZ = -0.20;
    rightElbowBend = -0.80; // half extended forward

    leftUpperRotX = -0.45;
    leftUpperRotZ = 0.35;
    leftElbowBend = -1.50; // tucked guard
  } else if (fighter.styleId === 'boxing_shell') {
    // Peek-a-boo tight ear guard
    leftUpperRotX = -1.10;
    leftUpperRotZ = 0.25;
    leftElbowBend = -1.95;

    rightUpperRotX = -1.10;
    rightUpperRotZ = -0.25;
    rightElbowBend = -1.95;
  } else if (fighter.styleId === 'muay_thai') {
    // High marching guard
    leftUpperRotX = -1.25;
    leftUpperRotZ = 0.30;
    leftElbowBend = -1.70;

    rightUpperRotX = -1.25;
    rightUpperRotZ = -0.30;
    rightElbowBend = -1.70;
  }

  // Blocking Posture
  if (fighter.isBlocking) {
    leftUpperRotX = -1.15;
    leftUpperRotZ = 0.25;
    leftElbowBend = -1.85;

    rightUpperRotX = -1.15;
    rightUpperRotZ = -0.25;
    rightElbowBend = -1.85;
  }

  // === STRIKES & COMBOS ===

  // 1. Right Arm Strikes (S1, S4, or heavy)
  if (rightProgress > 0) {
    const p = rightProgress;
    const isForward = rightFist ? rightFist.isPunching : false;
    const snapT = isForward ? (1 - Math.pow(1 - p, 3.5)) : (p * p * (3 - 2 * p));

    // Right arm explodes forward
    rightUpperRotX = -0.75 - snapT * 0.85; // Raises straight forward
    rightUpperRotZ = -0.35 * (1 - snapT); // Straightens toward centerline
    rightElbowBend = -1.45 * (1 - snapT * 0.90); // Unbends straight (zero stretch)

    // Left arm counter-pull along flank (Kyokushin curl / recoil)
    leftUpperRotX = -0.45 + snapT * 0.35;
    leftUpperRotZ = 0.35 + snapT * 0.25; // Curves outward along left flank
    leftElbowBend = -1.50 - snapT * 0.25; // Tucks tight
  }

  // 2. Left Arm Strikes (S2, S3)
  if (leftProgress > 0) {
    const p = leftProgress;
    const isForward = leftFist ? leftFist.isPunching : false;
    const snapT = isForward ? (1 - Math.pow(1 - p, 3.5)) : (p * p * (3 - 2 * p));

    if (stage === 1 || leftFist?.comboStage === 1) {
      // S2: Kote-Gaeshi Slap / Knife-hand chop (wide lateral sweep)
      leftUpperRotX = -0.85;
      leftUpperRotZ = 0.65 - snapT * 1.20; // Sweeps across centerline
      leftElbowBend = -0.85;
    } else if (stage === 2 || leftFist?.comboStage === 2) {
      // S3: Left Straight Thrust (Snappy & smooth linear piston)
      leftUpperRotX = -0.65 - snapT * 0.95; // Drives straight forward
      leftUpperRotZ = 0.40 * (1 - snapT); // Pinned to centerline
      leftElbowBend = -1.35 * (1 - snapT * 0.92); // Cleanly straightens at impact

      // Right arm kinetic counter-pull smoothly to right ribs
      rightUpperRotX = -0.75 + snapT * 0.40;
      rightUpperRotZ = -0.35 - snapT * 0.25; // Flank clearance to the right
      rightElbowBend = -1.45 - snapT * 0.20; // Tucks against ribs
    }
  }

  // Apply joint rotations directly to the hierarchical bone groups
  rig.leftClavicle.rotation.x = leftUpperRotX;
  rig.leftClavicle.rotation.z = leftUpperRotZ;
  rig.leftElbow.rotation.x = leftElbowBend;

  rig.rightClavicle.rotation.x = rightUpperRotX;
  rig.rightClavicle.rotation.z = rightUpperRotZ;
  rig.rightElbow.rotation.x = rightElbowBend;

  // Rigid Wrist Stasis: Wrist and square hand align rigidly with the forearm
  rig.leftWrist.rotation.set(0, 0, 0);
  rig.rightWrist.rotation.set(0, 0, 0);

  // 6. 3D Parry Energy Aura Sphere (M2 Active Window & Dual Opacity)
  if (rig.auraMesh) {
    const mat = rig.auraMesh.material as THREE.MeshBasicMaterial;
    if (fighter.aikiM2ActiveWindow && fighter.aikiM2ActiveWindow > 0) {
      // 6 Hz pulsing white/cyan rim blink
      const pulse = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(gameTime * 0.628));
      mat.opacity = pulse;
      mat.color.setHex(0x00e5ff);
      rig.auraMesh.scale.set(1.0 + pulse * 0.1, 1.0 + pulse * 0.1, 1.0 + pulse * 0.1);
    } else {
      mat.opacity = 0.0;
    }
  }
}
