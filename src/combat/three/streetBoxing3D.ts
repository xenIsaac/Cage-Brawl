import * as THREE from 'three';
import { Fighter } from '../../types';
import { JointNodes } from './Fighter3D';

/**
 * SECTION 1.25: 3D STREET BOXING COMPLETE ANIMATION SUITE
 * Solves joint matrices for 3D Street Boxing stance, shuffle walk cycle,
 * clamped pocket shell, and full-body torso torque engine.
 */
export function applyStreetBoxing3DPose(
  joints: JointNodes,
  fighter: Fighter,
  gameTime: number,
  blockRecoilFrames: number = 0
): void {
  const timeSec = gameTime / 60.0; // Time in seconds @ 60fps
  const j = joints;

  // Determine movement & action states
  const speedSq = fighter.vx * fighter.vx + fighter.vy * fighter.vy;
  const isMoving = speedSq > 0.05 || Boolean(fighter.isDashing);
  const isSprinting = Boolean(fighter.isSprinting && isMoving);
  const isBlocking = Boolean(fighter.isBlocking);

  // Identify active fists & progress
  const leftFist = fighter.fists ? (fighter.fists.find(f => f.punchType === 'left') || fighter.fists[0]) : undefined;
  const rightFist = fighter.fists ? (fighter.fists.find(f => f.punchType === 'right') || fighter.fists[1]) : undefined;

  const isLeftPunching = Boolean(leftFist && leftFist.isPunching && leftFist.punchProgress > 0);
  const isRightPunching = Boolean(rightFist && rightFist.isPunching && rightFist.punchProgress > 0);
  const isAttacking = isLeftPunching || isRightPunching;

  // Combo / M2 Stage determination
  const comboStage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
  const m2Stage = fighter.streetBoxingM2Stage || 0;
  const isM2Active = m2Stage > 0 || (fighter.heavyWindup !== undefined && fighter.heavyWindup > 0);

  // Base positional defaults
  j.waist.position.set(0, 0.82, 0);
  j.torso.position.set(0, 0.09, 0);
  j.head.position.set(0, 0.44, 0);

  // Leg offsets (staggered athletic base)
  j.hipLeft.position.set(0.16, -0.09, 0.08);   // Lead left leg forward +8px (~0.08 units)
  j.hipRight.position.set(-0.16, -0.09, -0.08); // Rear right leg back -8px (~-0.08 units)

  // --------------------------------------------------------------------------
  // 1. STRIKE ANIMATION ENGINE (TORSO TORQUE ENGINE FOR M1 & M2)
  // --------------------------------------------------------------------------
  if (isAttacking && !isBlocking) {
    if (isM2Active) {
      // B. M2 Heavy Flurry (Right Jab ➔ Right Jab ➔ Left Hook)
      if (m2Stage === 3 || (isLeftPunching && leftFist?.isHeavy)) {
        // Hit 3 (Finisher): Torso snaps violently from -25° (-0.44 rad) to +45° (+0.78 rad),
        // driving the heavy left hook across the target line with full body torque!
        const p = leftFist ? leftFist.punchProgress : 0.5;
        const strikeSin = Math.sin(p * Math.PI);

        // Torso: Base 0.40 rad + 0.78 rad (+45°) torque = 1.18 rad
        j.torso.rotation.set(0.10, 0.40 + 0.78 * strikeSin, 0);
        j.waist.rotation.set(0, 0.15 + 0.25 * strikeSin, 0);

        // Left Arm: Rigid 90° hook angle sweeping horizontally
        j.shoulderLeft.rotation.set(0.20, 0.70 * strikeSin, -0.10);
        j.elbowLeft.rotation.x = -1.57; // Rigid 90° elbow lock

        // Right Arm: Guard stays clamped to chin
        j.shoulderRight.rotation.set(0.20, -0.30, 0.10);
        j.elbowRight.rotation.x = -1.25;

        // Legs braced for heavy torque hook
        j.hipLeft.rotation.set(-0.30, 0.20, -0.10);
        j.kneeLeft.rotation.x = 0.40;
        j.hipRight.rotation.set(0.15, -0.10, 0.10);
        j.kneeRight.rotation.x = 0.35;
      } else {
        // Hits 1 & 2: Chest torques -25° (-0.44 rad), firing two machine-gun right jabs down the pipe
        const p = rightFist ? rightFist.punchProgress : 0.5;
        const strikeSin = Math.sin(p * Math.PI);

        // Torso: Base 0.40 rad - 0.44 rad (-25°) = -0.04 rad
        j.torso.rotation.set(0.08, 0.40 - 0.44 * strikeSin, 0);
        j.waist.rotation.set(0, 0.15 - 0.15 * strikeSin, 0);

        // Right Arm: Snaps straight out down the pipe
        const extReach = p <= 0.3 ? -1.25 + (-0.05 - (-1.25)) * (p / 0.3) : -0.05 - (-0.05 - (-1.25)) * ((p - 0.3) / 0.7);
        j.shoulderRight.rotation.set(0.40 * strikeSin, -0.10, 0.10);
        j.elbowRight.rotation.x = extReach; // Machine-gun jab extension

        // Left Arm: Maintains Lead Poke Stance
        j.shoulderLeft.rotation.set(0.35, 0.20, -0.15);
        j.elbowLeft.rotation.x = -0.45;

        // Legs
        j.hipLeft.rotation.set(-0.25, 0.10, -0.08);
        j.kneeLeft.rotation.x = 0.35;
        j.hipRight.rotation.set(0.20, -0.15, 0.08);
        j.kneeRight.rotation.x = 0.30;
      }
    } else if (isLeftPunching) {
      const p = leftFist ? leftFist.punchProgress : 0.5;
      const strikeSin = Math.sin(p * Math.PI);

      if (comboStage === 3) {
        // S4 (Inside Left Hook Finisher): chest.rotation.y whips +40° (+0.70 rad) to the left
        // Left elbow locks at rigid 90° angle (-1.57 rad), sweeping forearm horizontally
        j.torso.rotation.set(0.10, 0.40 + 0.70 * strikeSin, 0);
        j.waist.rotation.set(0, 0.15 + 0.20 * strikeSin, 0);

        j.shoulderLeft.rotation.set(0.20, 0.60 * strikeSin, -0.10);
        j.elbowLeft.rotation.x = -1.57; // Rigid 90° angle

        j.shoulderRight.rotation.set(0.20, -0.30, 0.10);
        j.elbowRight.rotation.x = -1.25;

        j.hipLeft.rotation.set(-0.30, 0.15, -0.08);
        j.kneeLeft.rotation.x = 0.38;
        j.hipRight.rotation.set(0.18, -0.12, 0.08);
        j.kneeRight.rotation.x = 0.32;
      } else {
        // S1 (Lead Left Poke Jab) & S2 (Snap Left Jab):
        // chest.rotation.y twists +15° (+0.26 rad) forward
        // Left forearm snaps to 100% reach in 3 frames (-0.05 rad)
        // Right hand stays glued to chin
        const reachExt = p <= 0.3 ? -0.45 + (-0.05 - (-0.45)) * (p / 0.3) : -0.05 - (-0.05 - (-0.45)) * ((p - 0.3) / 0.7);

        j.torso.rotation.set(0.08, 0.40 + 0.26 * strikeSin, 0);
        j.waist.rotation.set(0, 0.15 + 0.10 * strikeSin, 0);

        j.shoulderLeft.rotation.set(0.35 + 0.15 * strikeSin, 0.20, -0.15);
        j.elbowLeft.rotation.x = reachExt;

        j.shoulderRight.rotation.set(0.20, -0.30, 0.10);
        j.elbowRight.rotation.x = -1.25; // Glued to chin

        j.hipLeft.rotation.set(-0.25, 0.10, -0.08);
        j.kneeLeft.rotation.x = 0.32;
        j.hipRight.rotation.set(0.20, -0.15, 0.08);
        j.kneeRight.rotation.x = 0.30;
      }
    } else if (isRightPunching) {
      const p = rightFist ? rightFist.punchProgress : 0.5;
      const strikeSin = Math.sin(p * Math.PI);

      if (comboStage === 2) {
        // S3 (Rear Right Straight Cross): Massive Counter-Torque
        // chest.rotation.y violently twists -35° (-0.61 rad) in opposite direction
        // Right shoulder drives through centerline as right arm punches straight out
        // Left arm pulls back to jaw as opposing counterweight
        const extReach = p <= 0.3 ? -1.25 + (-0.05 - (-1.25)) * (p / 0.3) : -0.05 - (-0.05 - (-1.25)) * ((p - 0.3) / 0.7);

        j.torso.rotation.set(0.08, 0.40 - 0.61 * strikeSin, 0);
        j.waist.rotation.set(0, 0.15 - 0.20 * strikeSin, 0);

        j.shoulderRight.rotation.set(0.40, 0.20 * strikeSin, -0.10);
        j.elbowRight.rotation.x = extReach; // Drives straight out

        // Left arm pulls back to jaw as opposing counterweight
        j.shoulderLeft.rotation.set(0.35, -0.25 * strikeSin, 0.10);
        j.elbowLeft.rotation.x = -1.25;

        j.hipLeft.rotation.set(-0.20, 0.10, -0.08);
        j.kneeLeft.rotation.x = 0.30;
        j.hipRight.rotation.set(0.25, -0.20, 0.08);
        j.kneeRight.rotation.x = 0.35;
      } else {
        // Default Right Strike
        const extReach = p <= 0.3 ? -1.25 + (-0.05 - (-1.25)) * (p / 0.3) : -0.05 - (-0.05 - (-1.25)) * ((p - 0.3) / 0.7);

        j.torso.rotation.set(0.08, 0.40 - 0.35 * strikeSin, 0);
        j.waist.rotation.set(0, 0.15 - 0.10 * strikeSin, 0);

        j.shoulderRight.rotation.set(0.30, 0.10, 0);
        j.elbowRight.rotation.x = extReach;

        j.shoulderLeft.rotation.set(0.35, 0.20, -0.15);
        j.elbowLeft.rotation.x = -0.45;

        j.hipLeft.rotation.set(-0.25, 0.10, -0.08);
        j.kneeLeft.rotation.x = 0.32;
        j.hipRight.rotation.set(0.20, -0.15, 0.08);
        j.kneeRight.rotation.x = 0.30;
      }
    }
  }
  // --------------------------------------------------------------------------
  // 2. GUARD & DEFENSIVE MECHANICS: CLAMPED POCKET SHELL (BLOCK)
  // --------------------------------------------------------------------------
  else if (isBlocking) {
    // Torso Hunch: chest.rotation.x = 0.25 rad (~15° forward tilt)
    j.torso.rotation.set(0.25, 0.20, 0);
    j.waist.rotation.set(0, 0.10, 0);

    // On-Hit Guard Recoil: Absorbing incoming strikes compresses chest mesh backward by -4px (-0.06 Z units)
    if (blockRecoilFrames > 0 || (fighter.damageFlashTime && fighter.damageFlashTime > 0)) {
      j.torso.position.z = -0.06; // -4px backward compression
    } else {
      j.torso.position.z = 0;
    }

    // Both Shoulders: leftShoulder (0.50, 0.20, -0.10), rightShoulder (0.50, -0.20, 0.10)
    j.shoulderLeft.rotation.set(0.50, 0.20, -0.10);
    j.shoulderRight.rotation.set(0.50, -0.20, 0.10);

    // Both Forearms: leftElbow.x = -1.50 rad, rightElbow.x = -1.50 rad (point straight up)
    j.elbowLeft.rotation.set(-1.50, 0, 0);
    j.elbowRight.rotation.set(-1.50, 0, 0);

    // Hands: Square gloves parallel touching temple/eyeline height
    j.handLeft.rotation.set(0, 0, 0);
    j.handRight.rotation.set(0, 0, 0);

    // Guard Stance Legs
    j.hipLeft.rotation.set(-0.20, 0.10, -0.08);
    j.kneeLeft.rotation.x = 0.35;
    j.hipRight.rotation.set(0.18, -0.12, 0.08);
    j.kneeRight.rotation.x = 0.35;
  }
  // --------------------------------------------------------------------------
  // 3. LOCOMOTION: THE PREDATORY POCKET SHUFFLE (WALK CYCLE)
  // --------------------------------------------------------------------------
  else if (isMoving) {
    const freq = isSprinting ? 3.08 : 2.2; // Stride frequency (2.2 Hz base, +40% = 3.08 Hz on sprint)
    const strideCycle = Math.sin(timeSec * 2 * Math.PI * freq);
    const bob = Math.abs(Math.sin(timeSec * 2 * Math.PI * freq)) * 0.02; // Vertical bob ±2px

    // Torso lean into direction of movement + synchronized bob
    const torsoForwardTilt = isSprinting ? 0.25 : 0.12; // Sprint variant: torso tilts 15° lower (0.25 rad)
    j.torso.rotation.set(torsoForwardTilt, 0.40, 0); // Torso stays bladed at 0.40 rad (~23°)
    j.torso.position.y = 0.09 + bob;
    j.waist.rotation.set(0, 0.15, 0);

    // Upper Body Stability (The Guard Anchor):
    // Arms DO NOT swing loosely. The left stiff poke and right chin guard remain firmly locked in position!
    if (isSprinting) {
      // Both elbows tuck 10% tighter to the core during sprint
      j.shoulderLeft.rotation.set(0.35, 0.20, -0.20);
      j.elbowLeft.rotation.x = -0.50; // Tuck 10% tighter
      j.shoulderRight.rotation.set(0.20, -0.30, 0.15);
      j.elbowRight.rotation.x = -1.35; // Tuck 10% tighter
    } else {
      j.shoulderLeft.rotation.set(0.35, 0.20, -0.15);
      j.elbowLeft.rotation.x = -0.45;
      j.shoulderRight.rotation.set(0.20, -0.30, 0.10);
      j.elbowRight.rotation.x = -1.25;
    }

    // Lower Body (Thigh / Shin Pendulum):
    // Thighs alternate in tight forward-back stride (±0.35 rad swing on X-axis)
    // Lower leg tips slide close to Octagon mat with minimal knee lift
    j.hipLeft.rotation.set(-0.18 + strideCycle * 0.35, 0.10, -0.08);
    j.kneeLeft.rotation.x = 0.28 + Math.max(0, strideCycle) * 0.20;

    j.hipRight.rotation.set(0.18 - strideCycle * 0.35, -0.15, 0.08);
    j.kneeRight.rotation.x = 0.28 + Math.max(0, -strideCycle) * 0.20;
  }
  // --------------------------------------------------------------------------
  // 4. RESTING IDLE STANCE: STIFF POKE GUARD (KILLING THE T-POSE)
  // --------------------------------------------------------------------------
  else {
    // Subtle 1.2 Hz vertical breathing pulse on the hips (±2px / ±0.02 units)
    const breath = Math.sin(timeSec * 2 * Math.PI * 1.2) * 0.02;
    j.waist.position.y = 0.82 + breath;
    j.waist.rotation.set(0, 0.15, 0);

    // Torso: Bladed at 0.40 rad (~23° angle relative to target vector)
    j.torso.rotation.set(0.05, 0.40, 0);

    // Left Arm (Lead Poke): Shoulder set(0.35, 0.20, -0.15), Elbow x = -0.45 rad (holding hand forward at 80% reach)
    j.shoulderLeft.rotation.set(0.35, 0.20, -0.15);
    j.elbowLeft.rotation.set(-0.45, 0, 0);
    j.handLeft.rotation.set(0, 0, 0);

    // Right Arm (Chin Guard): Shoulder set(0.20, -0.30, 0.10), Elbow x = -1.25 rad (hand glued to jawline)
    j.shoulderRight.rotation.set(0.20, -0.30, 0.10);
    j.elbowRight.rotation.set(-1.25, 0, 0);
    j.handRight.rotation.set(0, 0, 0);

    // Legs: Staggered athletic base (Lead left leg forward +8px, rear right leg back -8px)
    j.hipLeft.rotation.set(-0.25, 0.10, -0.08);
    j.kneeLeft.rotation.set(0.35, 0, 0);

    j.hipRight.rotation.set(0.20, -0.15, 0.08);
    j.kneeRight.rotation.set(0.30, 0, 0);
  }

  // Head aligns facing forward toward opponent along the target line
  j.head.rotation.set(-0.02, -j.torso.rotation.y * 0.5, 0);
}
