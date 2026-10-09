import { FistIKContext } from './types';

/**
 * Kyokushin Karate Inverse Kinematics (IK):
 * Rooted Fudo Dachi stance, 4-Stage M1 Sequence (Chudan Tsuki -> Gedan Geri -> Shotei Uchi -> Full-Charge Right Palm),
 * and Gliding Right Palm (Super M2) with counter-weight arm closure across chest.
 */
export function getKyokushinFistPos(ctx: FistIKContext): { fistX: number; fistY: number } {
  const { fighter, fist, idleTime, isBlockingActive, isCollision, isLeft, leftProgress, rightProgress, easeProgress } = ctx;

  if (isBlockingActive) {
    // Rooted Fudo Dachi Guard: Elbows tucked tight against the ribs, fists guarding chest/chin
    return {
      fistX: fighter.radius * 0.58,
      fistY: isLeft ? -fighter.radius * 0.14 : fighter.radius * 0.14,
    };
  }

  // Fudo Dachi Neutral Stance Hand Anchors (30% Extension Center-Chest Guard)
  let leftBaseX = fighter.radius * 0.60;
  let leftBaseY = -fighter.radius * 0.26;
  let rightBaseX = fighter.radius * 0.60;
  let rightBaseY = fighter.radius * 0.26;

  const leftIdleMix = leftProgress > 0 ? 0 : (rightProgress > 0 ? 0 : 1);
  const rightIdleMix = rightProgress > 0 ? 0 : (leftProgress > 0 ? 0 : 1);

  // Heavy, rooted breathing rhythm
  leftBaseX += Math.sin(idleTime * 3.8) * 0.8 * leftIdleMix;
  leftBaseY += Math.cos(idleTime * 3.8) * 0.6 * leftIdleMix;
  rightBaseX += Math.sin(idleTime * 3.8 + Math.PI) * 0.6 * rightIdleMix;
  rightBaseY += Math.cos(idleTime * 3.8 + Math.PI) * 0.5 * rightIdleMix;

  const stage = fist.comboStage !== undefined 
    ? fist.comboStage 
    : (fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1));
  const rightFistObj = fighter.fists?.find(f => f.punchType === 'right');
  const isM2Active = (fighter.kyokushinM2Stage && fighter.kyokushinM2Stage !== null) ||
                     (fighter.heavyWindup && fighter.heavyWindup > 0) ||
                     !!fist.isHeavy ||
                     (rightProgress > 0 && !!rightFistObj?.isHeavy) ||
                     ((fighter.kyokushinM2PeakHoldTimer || 0) > 0) ||
                     ((fighter.kyokushinM2FreezeTimer || 0) > 0);

  let fistX = 0;
  let fistY = 0;

  // 1. PHASE 1: ASYMMETRICAL WINDUP (0.0s – 0.55s / 33 frames)
  if (fighter.heavyWindup && fighter.heavyWindup > 0) {
    const maxWindup = 33; // 0.55s = 33 frames
    const ratio = Math.min(1.0, Math.max(0, (maxWindup - fighter.heavyWindup) / maxWindup));

    if (isLeft) {
      // Left Arm (Lead Probe): Extends forward smoothly along center target vector to 80% extension (1.65 * R)
      // Measuring frame with strictly disabled hitbox
      fistX = leftBaseX + ratio * (fighter.radius * 1.65 - leftBaseX);
      fistY = leftBaseY + ratio * (-fighter.radius * 0.15 - leftBaseY);
    } else {
      // Right Arm (The Deep Coil): Pulls back along outer right flank alongside hip/ribs (away from body center)
      fistX = rightBaseX + ratio * (fighter.radius * 0.05 - rightBaseX);
      fistY = rightBaseY + ratio * (fighter.radius * 0.78 - rightBaseY);
    }
    return { fistX, fistY };
  }

  // 2. PHASE 2 & PHASE 3: EXPLOSIVE PISTON THRUST, HIT-STOP FREEZE & UNIFIED RETRACTION
  if (isM2Active && (rightProgress > 0 || leftProgress > 0 || (fighter.kyokushinM2Progress !== undefined && fighter.kyokushinM2Progress > 0) || (fighter.kyokushinM2FreezeTimer || 0) > 0 || (fighter.kyokushinM2PeakHoldTimer || 0) > 0 || !!fist.isHeavy || (rightFistObj && (rightFistObj.isPunching || rightFistObj.punchProgress > 0)))) {
    const isPunching = fighter.kyokushinM2Stage === 'thrust' || (rightFistObj ? rightFistObj.isPunching : fist.isPunching);
    const p = fighter.kyokushinM2Progress !== undefined ? fighter.kyokushinM2Progress : (rightFistObj ? rightFistObj.punchProgress : (fist.punchProgress || 0));
    const isFrozen = fighter.kyokushinM2Stage === 'freeze' || (fighter.kyokushinM2FreezeTimer || 0) > 0 || (fighter.kyokushinM2PeakHoldTimer || 0) > 0 || (rightFistObj?.lingerTimer || 0) > 0;

    // Phase Keyframes
    // Right Hand Positions:
    const rCoilX = fighter.radius * 0.05;  // Chambered at right hip/ribs
    const rCoilY = fighter.radius * 0.78;  // Outer right flank
    const rPeakX = fighter.radius * 2.30;  // 115% peak extension
    const rPeakY = fighter.radius * 0.12;  // Centerline thrust
    const rChestX = fighter.radius * 0.60; // 30% extension Fudo Dachi center-chest guard
    const rChestY = fighter.radius * 0.26;

    // Left Hand Positions:
    const lProbeX = fighter.radius * 1.65;  // 80% extension lead probe
    const lProbeY = -fighter.radius * 0.15;
    const lRibsX = fighter.radius * 0.18;   // Slanted Hikite chamber at left ribs
    const lRibsY = -fighter.radius * 0.48;  // Slanted diagonal angle across lower chest/ribs
    const lChestX = fighter.radius * 0.60;  // 30% extension Fudo Dachi center-chest guard
    const lChestY = -fighter.radius * 0.26;

    if (isPunching) {
      // Phase 2: Explosive Piston Thrust (Instant Snap ~0.08s)
      // Right Fist thrusts forward like a piston with max velocity to 115% peak extension
      // Left Arm simultaneously snaps backward tight against ribs as counterbalance along outer left flank
      if (!isLeft) {
        fistX = rCoilX + p * (rPeakX - rCoilX);
        fistY = rCoilY + p * (rPeakY - rCoilY);
      } else {
        fistX = lProbeX + p * (lRibsX - lProbeX);
        fistY = lProbeY + p * (lRibsY - lProbeY);
      }
    } else if (isFrozen) {
      // Hit-Stop Freeze: Both arms freeze completely rigid for exactly 3 frames (~0.05s). No movement, no wobble.
      if (!isLeft) {
        fistX = rPeakX;
        fistY = rPeakY;
      } else {
        fistX = lRibsX;
        fistY = lRibsY;
      }
    } else {
      // Phase 3: Unified Retraction (Fixing Post-Hit Desync & Position Snapping)
      // BOTH arms retract together at the exact same smooth speed:
      // - Right arm pulls back from 115% to 30% extension
      // - Left arm pushes back out from the ribs to 30% extension
      // Both hands reach the Fudo Dachi center-chest guard at the exact same frame!
      const retractT = Math.min(1.0, Math.max(0, 1.0 - p));
      const ease = retractT * retractT * (3 - 2 * retractT); // Smoothstep deceleration

      if (!isLeft) {
        fistX = rPeakX + ease * (rChestX - rPeakX);
        fistY = rPeakY + ease * (rChestY - rPeakY);
      } else {
        fistX = lRibsX + ease * (lChestX - lRibsX);
        fistY = lRibsY + ease * (lChestY - lRibsY);
      }
    }
    return { fistX, fistY };
  }

  // 3. Left Hand Strikes (S1 Chudan Seiken Tsuki & S3 Shotei Uchi)
  if (leftProgress > 0) {
    if (isLeft) {
      if (stage === 0) {
        // Sequence 1 (Stage 0): Chudan Seiken Tsuki (Lead Punch)
        // Snappy, fast execution windup delivering a direct centerline punch
        const extension = easeProgress * fighter.radius * 2.15;
        fistX = leftBaseX + extension;
        fistY = leftBaseY * (1 - easeProgress * 0.70);
      } else if (stage === 2) {
        // Sequence 3 (Stage 2): Shotei Uchi (Open Palm)
        // Heavy palm thrust displacing the opponent's guard line
        const extension = easeProgress * fighter.radius * 2.25;
        fistX = leftBaseX + extension;
        fistY = leftBaseY * (1 - easeProgress * 0.80);
      } else {
        fistX = leftBaseX + easeProgress * fighter.radius * 1.85;
        fistY = leftBaseY;
      }
    } else {
      // Right (rear) hand stays locked in tight Fudo Dachi jaw/rib guard
      fistX = rightBaseX;
      fistY = rightBaseY;
    }
    return { fistX, fistY };
  }

  // 4. Right Hand Strikes (S2 Gedan Geri & S4 Full-Charge Right Palm)
  if (rightProgress > 0) {
    const isHeavyStrike = fist.isHeavy || !!rightFistObj?.isHeavy;
    if (stage === 1 && !isHeavyStrike) {
      // Sequence 2 (Stage 1): Gedan Geri (Calf Kick)
      // Both hands stay firmly locked in tight Fudo Dachi counterbalance guard while leg kicks
      fistX = isLeft ? leftBaseX : rightBaseX;
      fistY = isLeft ? leftBaseY : rightBaseY;
      return { fistX, fistY };
    }

    if (!isLeft) {
      if (stage === 3) {
        // Sequence 4 (Stage 3): Full-Charge Right Palm (Finisher)
        // Drives forward with massive kinetic pushback down center line
        const extension = easeProgress * fighter.radius * 2.50;
        fistX = rightBaseX + extension;
        fistY = rightBaseY * (1 - easeProgress * 0.85);
      } else {
        fistX = rightBaseX + easeProgress * fighter.radius * 1.85;
        fistY = rightBaseY;
      }
    } else {
      // Left hand stays tight in high chest guard
      fistX = leftBaseX;
      fistY = leftBaseY;
    }
    return { fistX, fistY };
  }

  // Stance Default
  fistX = isLeft ? leftBaseX : rightBaseX;
  fistY = isLeft ? leftBaseY : rightBaseY;

  return { fistX, fistY };
}
