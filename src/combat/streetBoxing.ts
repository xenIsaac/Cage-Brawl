import { Fighter, Fist } from '../types';
import { CombatFighter } from './types';
import { applyFighterPostureCooldown } from './posture/postureEngine';

/**
 * Advance Street Boxing M2 "Pocket Flurry" to the next sequential strike:
 * [ Right Jab 1 ] -> [ Right Jab 2 ] -> [ Left Hook 3 ]
 *
 * Enforces zero Iframes, resets opposing fist states, applies in-pocket
 * cling micro-step, and triggers audio cue.
 */
export const advanceStreetBoxingFlurry = (
  fighter: Fighter | CombatFighter,
  playDashSound?: () => void
): boolean => {
  const nextStage = (fighter.streetBoxingM2Stage || 1) + 1;
  fighter.streetBoxingM2Stage = nextStage;
  const punchType = nextStage === 3 ? 'left' : 'right';

  // Clear previous punch states across all fists
  fighter.fists.forEach(f => {
    f.isPunching = false;
    f.punchProgress = 0;
    f.isHeavy = false;
    f.hasHit = false;
  });

  const nextFist = fighter.fists.find(f => f.punchType === punchType) || fighter.fists[0];
  if (nextFist) {
    nextFist.isPunching = true;
    nextFist.punchProgress = 0;
    nextFist.isHeavy = true;
    nextFist.hasHit = false;

    // Strict constraint: No Iframes
    fighter.isDashing = false;
    fighter.dashProgress = 0;
    fighter.strikeCooldown = 0;

    // Micro-step forward to maintain pocket cling
    fighter.vx += Math.cos(fighter.facingAngle) * 2.0;
    fighter.vy += Math.sin(fighter.facingAngle) * 2.0;

    playDashSound?.();
    return true;
  }
  return false;
};

/**
 * Handle punch retraction and sequence progression for Street Boxing M2 flurry.
 * - Stage 1 landed: queues Stage 2 (3-frame gap).
 * - Stage 1 whiffed: resets flurry and applies 8.0s whiff penalty.
 * - Stage 2: queues Stage 3 (guaranteed by hit-confirm).
 * - Stage 3 finished: resets flurry; applies whiff penalty if 0 hits connected.
 */
export const handleStreetBoxingPunchRetracted = (
  fighter: Fighter | CombatFighter,
  fist: Fist,
  applyWhiffPenalty: (f: Fighter | CombatFighter) => void
): void => {
  const stage = fighter.streetBoxingM2Stage || 1;
  if (stage === 1) {
    if (fist.hasHit) {
      fighter.streetBoxingM2NextTimer = 3;
    } else {
      fighter.streetBoxingM2Stage = 0;
      fighter.streetBoxingM2Hits = 0;
      fighter.streetBoxingUnbreakable = false;
      applyWhiffPenalty(fighter);
    }
  } else if (stage === 2) {
    fighter.streetBoxingM2NextTimer = 3;
  } else {
    // Stage 3 Left Hook completed
    fighter.streetBoxingM2Stage = 0;
    fighter.streetBoxingUnbreakable = false;
    if (!fist.hasHit && (fighter.streetBoxingM2Hits || 0) < 3) {
      applyWhiffPenalty(fighter);
    }
  }
};

/**
 * Hit-Confirm Guarantee: Landing 1st right jab locks the opponent into hit-stun,
 * making the 2nd jab and 3rd hook guaranteed hits within melee pocket range.
 */
export const checkStreetBoxingHitConfirm = (
  attacker: Fighter | CombatFighter,
  defender: Fighter | CombatFighter,
  fist: Fist
): boolean => {
  if (attacker.styleId !== 'street_boxing' || !fist.isHeavy || !attacker.streetBoxingUnbreakable) {
    return false;
  }
  const distToDefender = Math.hypot(defender.x - attacker.x, defender.y - attacker.y);
  return distToDefender <= attacker.radius + defender.radius + 80 && fist.punchProgress >= 0.20;
};

/**
 * Apply Street Boxing M2 hit effects based on active flurry stage:
 * - Stage 1: Locks opponent in hit-stun, disables block, sets unbreakable flag.
 * - Stage 2: Sustains hit lock.
 * - Stage 3: Delivers heavy knockback, 13.0s cooldown, and shaves Posture recovery to 0.1s.
 */
export const applyStreetBoxingM2Hit = (
  attacker: Fighter | CombatFighter,
  defender: Fighter | CombatFighter,
  kbX: number,
  kbY: number,
  setHitstop: (frames: number) => void,
  spawnFloatingText?: (x: number, y: number, text: string, color: string) => void
): void => {
  const stage = attacker.streetBoxingM2Stage || 1;

  if (stage === 1) {
    attacker.streetBoxingM2Hits = 1;
    attacker.streetBoxingUnbreakable = true;
    defender.stunTime = Math.max(defender.stunTime || 0, 24);
    defender.strikeCooldown = Math.max(defender.strikeCooldown || 0, 24);
    defender.blockLockout = Math.max(defender.blockLockout || 0, 24);
    defender.isBlocking = false;
    defender.vx = kbX * 1.2;
    defender.vy = kbY * 1.2;
    setHitstop(2);
    spawnFloatingText?.(defender.x, defender.y - 35, 'HIT-CONFIRM LOCK!', '#f59e0b');
  } else if (stage === 2) {
    attacker.streetBoxingM2Hits = 2;
    attacker.streetBoxingUnbreakable = true;
    defender.stunTime = Math.max(defender.stunTime || 0, 24);
    defender.strikeCooldown = Math.max(defender.strikeCooldown || 0, 24);
    defender.blockLockout = Math.max(defender.blockLockout || 0, 24);
    defender.isBlocking = false;
    defender.vx = kbX * 1.2;
    defender.vy = kbY * 1.2;
    setHitstop(2);
  } else {
    // Stage 3 Left Hook Finisher
    attacker.streetBoxingM2Hits = 3;
    attacker.streetBoxingUnbreakable = false;
    defender.vx = kbX * 15.0;
    defender.vy = kbY * 15.0;
    defender.stunTime = Math.max(defender.stunTime || 0, 28);
    defender.strikeCooldown = Math.max(defender.strikeCooldown || 0, 28);
    defender.concussTime = 60;
    setHitstop(4);
    attacker.heavyCooldown = 780; // 13.0s Total Hit Cooldown

    // Posture Reset: Landing all 3 hits shaves Posture recovery down to 0.1s
    attacker.postureOverdriveActive = true;
    attacker.pendingPostureReduction = 0.95;
    applyFighterPostureCooldown(attacker);
    attacker.postureCd = 6; // 0.1s (6 frames @ 60fps)
    attacker.maxPostureCd = 6;
    attacker.lightCooldown = 6;
    attacker.strikeCooldown = 6;
    attacker.isPostureLocked = true;
    spawnFloatingText?.(attacker.x, attacker.y - 35, 'POSTURE RESET (0.1s)!', '#22c55e');
  }
};

/**
 * Street Boxing Torso Transform calculation:
 * Computes rotation (visualAngle) and positional lunge offset for M1 and M2 sequences.
 */
export const calculateStreetBoxingTorso = (
  fighter: Fighter | CombatFighter,
  leftProgress: number,
  rightProgress: number,
  leftFist?: Fist,
  rightFist?: Fist,
  isBlockingActive: boolean = false
): { deltaVisualAngle: number; lungeOffset: number } => {
  let deltaVisualAngle = 0;
  let lungeOffset = 0;

  if (isBlockingActive) {
    // Street Boxing Braced Block Stance: Torso aligns slightly forward (+0.12 rad) to reinforce straightened lead shoulder
    return { deltaVisualAngle: 0.12, lungeOffset: 0 };
  }

  const isM2Active = (fighter.streetBoxingM2Stage && fighter.streetBoxingM2Stage > 0) || ((fighter.heavyWindup || 0) > 0);

  if (isM2Active) {
    if (fighter.streetBoxingM2Stage === 3 || (leftProgress > 0 && leftFist?.isHeavy)) {
      // Hit 3 Left Hook Finisher (S4 Hook animation on left side)
      const p = leftProgress > 0 ? leftProgress : 0.5;
      if (leftFist?.isPunching && leftFist.isHeavy) {
        if (p < 0.28) {
          const pullP = Math.sin((p / 0.28) * Math.PI * 0.5);
          deltaVisualAngle -= 0.45 * pullP;
          lungeOffset -= pullP * fighter.radius * 0.16;
        } else {
          const hookP = (p - 0.28) / 0.72;
          const hookEase = Math.sin(hookP * Math.PI * 0.5);
          deltaVisualAngle += -0.45 * (1 - hookEase) - 0.68 * hookEase;
          lungeOffset += hookEase * fighter.radius * 0.48;
        }
      } else {
        const retEase = Math.sin(p * Math.PI * 0.5);
        deltaVisualAngle -= 0.45 * retEase;
        lungeOffset += retEase * fighter.radius * 0.25;
      }
    } else if (rightProgress > 0 && rightFist?.isHeavy) {
      // Hit 1 & 2 Right Jabs (S1 Jab animation on right side)
      const p = rightProgress;
      if (rightFist.isPunching) {
        if (p < 0.28) {
          const pullP = Math.sin((p / 0.28) * Math.PI * 0.5);
          deltaVisualAngle += 0.32 * pullP;
          lungeOffset -= pullP * fighter.radius * 0.10;
        } else {
          const unspringP = (p - 0.28) / 0.72;
          const snapEase = Math.sin(unspringP * Math.PI * 0.5);
          deltaVisualAngle += 0.32 * (1 - snapEase) - 0.32 * snapEase;
          lungeOffset += snapEase * fighter.radius * 0.35;
        }
      } else {
        const retEase = Math.sin(p * Math.PI * 0.5);
        deltaVisualAngle -= 0.32 * (1 - retEase);
        lungeOffset += retEase * fighter.radius * 0.20;
      }
    }
  } else if (leftProgress > 0) {
    // S1 & S2 Left Jabs
    const p = leftProgress;
    if (leftFist?.isPunching && !leftFist.isHeavy) {
      if (p < 0.28) {
        const pullP = Math.sin((p / 0.28) * Math.PI * 0.5);
        deltaVisualAngle -= 0.32 * pullP;
        lungeOffset -= pullP * fighter.radius * 0.10;
      } else {
        const unspringP = (p - 0.28) / 0.72;
        const snapEase = Math.sin(unspringP * Math.PI * 0.5);
        deltaVisualAngle += -0.32 * (1 - snapEase) + 0.32 * snapEase;
        lungeOffset += snapEase * fighter.radius * 0.35;
      }
    } else {
      const retEase = Math.sin(p * Math.PI * 0.5);
      deltaVisualAngle += 0.32 * (1 - retEase);
      lungeOffset += retEase * fighter.radius * 0.20;
    }
  } else if (rightProgress > 0) {
    // S3 & S4 Right Strikes
    const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
    const comboStage = rightFist?.comboStage !== undefined ? rightFist.comboStage : stage;
    const p = rightProgress;

    if (rightFist?.isPunching && !rightFist.isHeavy) {
      if (comboStage === 2) {
        // S3 Straight Strike
        if (p < 0.28) {
          const pullP = Math.sin((p / 0.28) * Math.PI * 0.5);
          deltaVisualAngle -= 0.40 * pullP;
          lungeOffset -= pullP * fighter.radius * 0.16;
        } else {
          const strikeP = (p - 0.28) / 0.72;
          const strikeEase = Math.sin(strikeP * Math.PI * 0.5);
          deltaVisualAngle += -0.40 * (1 - strikeEase) + 0.38 * strikeEase;
          lungeOffset += strikeEase * fighter.radius * 0.44;
        }
      } else {
        // S4 Looping Hook
        if (p < 0.28) {
          const pullP = Math.sin((p / 0.28) * Math.PI * 0.5);
          deltaVisualAngle -= 0.45 * pullP;
          lungeOffset -= pullP * fighter.radius * 0.16;
        } else {
          const hookP = (p - 0.28) / 0.72;
          const hookEase = Math.sin(hookP * Math.PI * 0.5);
          deltaVisualAngle += -0.45 * (1 - hookEase) - 0.68 * hookEase;
          lungeOffset += hookEase * fighter.radius * 0.48;
        }
      }
    } else {
      // Recovery
      const pSine = Math.sin(rightProgress * Math.PI * 0.5);
      deltaVisualAngle -= (comboStage === 3 ? 0.45 : -0.22) * pSine;
      lungeOffset += pSine * fighter.radius * 0.28;
    }
  }

  return { deltaVisualAngle, lungeOffset };
};

/**
 * Street Boxing 2-Bone Arm IK solver:
 * Generates exact elbow and fist world coordinates for left and right arms
 * across orthodox stance, jabs, straight thrusts, and looping L-hooks.
 */
export const calculateStreetBoxingArmIK = (
  fighter: Fighter | CombatFighter,
  fist: Fist,
  isLeft: boolean,
  shoulderX: number,
  shoulderY: number,
  L1: number,
  L2: number,
  idleTime: number,
  targetFistX: number,
  targetFistY: number,
  leftProgress: number,
  rightProgress: number,
  isBlockingActive: boolean = false
): { elbowX: number; elbowY: number; actualFistX: number; actualFistY: number } => {
  let elbowX = shoulderX;
  let elbowY = shoulderY;
  let actualFistX = targetFistX;
  let actualFistY = targetFistY;

  // Street Boxing Block Animation:
  // Character straightens their left shoulder and slants his left hand far,
  // His right hand does the same but it's way more slanted to the point it's behind the left hand.
  if (isBlockingActive) {
    const D = Math.hypot(targetFistY - shoulderY, targetFistX - shoulderX);
    const targetAngle = Math.atan2(targetFistY - shoulderY, targetFistX - shoulderX);
    const clampedD = Math.min(D, (L1 + L2) * 0.98);
    const cosA = Math.max(-1, Math.min(1, (L1 * L1 + clampedD * clampedD - L2 * L2) / (2 * L1 * clampedD)));
    const A = Math.acos(cosA);

    if (isLeft) {
      // Left arm: Shoulder straightened forward, left hand extended far out, slanted inwards
      const elbowAngle = targetAngle - A * 0.60;
      elbowX = shoulderX + L1 * Math.cos(elbowAngle);
      elbowY = shoulderY + L1 * Math.sin(elbowAngle);
      actualFistX = targetFistX;
      actualFistY = targetFistY;
      return { elbowX, elbowY, actualFistX, actualFistY };
    } else {
      // Right arm: Reaches from right shoulder way across the chest to sit directly behind the left hand
      const elbowAngle = targetAngle + A * 0.60;
      elbowX = shoulderX + L1 * Math.cos(elbowAngle);
      elbowY = shoulderY + L1 * Math.sin(elbowAngle);
      actualFistX = targetFistX;
      actualFistY = targetFistY;
      return { elbowX, elbowY, actualFistX, actualFistY };
    }
  }

  const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
  const comboStage = fist.comboStage !== undefined ? fist.comboStage : stage;

  // Compute dynamic direction angle from shoulder joint to target fist position
  const targetAngle = Math.atan2(targetFistY - shoulderY, targetFistX - shoulderX);

  if (isLeft) {
    const isHeavyLeftHook = fist.isHeavy || fighter.streetBoxingM2Stage === 3;

    if (leftProgress > 0 && isHeavyLeftHook) {
      // M2 Strike 3 Left Hook: mirror S4 hook mechanics on left side
      const p = fist.punchProgress;
      if (fist.isPunching) {
        if (p < 0.28) {
          const chamberP = Math.sin((p / 0.28) * Math.PI * 0.5);
          elbowX = shoulderX - chamberP * fighter.radius * 0.55;
          elbowY = shoulderY - chamberP * fighter.radius * 0.35;
          actualFistX = shoulderX + fighter.radius * 0.16;
          actualFistY = shoulderY + fighter.radius * 0.10;
        } else {
          const hookP = (p - 0.28) / 0.72;
          const hookEase = Math.sin(hookP * Math.PI * 0.5);
          const chamberUpper = -Math.PI * 0.75;
          const targetUpper = Math.PI * 0.18;
          const loopBow = -Math.sin(hookP * Math.PI) * 0.30;
          const upperAngle = chamberUpper * (1 - hookEase) + targetUpper * hookEase + loopBow;

          elbowX = shoulderX + L1 * Math.cos(upperAngle);
          elbowY = shoulderY + L1 * Math.sin(upperAngle);

          // L-SHAPE: Forearm is strictly 90 degrees to upper arm
          const forearmAngle = upperAngle + Math.PI / 2;
          actualFistX = elbowX + L2 * Math.cos(forearmAngle);
          actualFistY = elbowY + L2 * Math.sin(forearmAngle);
        }
      } else {
        const retEase = Math.sin(p * Math.PI * 0.5);
        const upperAngle = Math.PI * 0.18;
        const strikeElbowX = shoulderX + L1 * Math.cos(upperAngle);
        const strikeElbowY = shoulderY + L1 * Math.sin(upperAngle);
        const forearmAngle = upperAngle + Math.PI / 2;
        const strikeFistX = strikeElbowX + L2 * Math.cos(forearmAngle);
        const strikeFistY = strikeElbowY + L2 * Math.sin(forearmAngle);

        const guardElbowX = shoulderX + L1 * 0.35;
        const guardElbowY = shoulderY - L1 * 0.65;

        elbowX = guardElbowX * (1 - retEase) + strikeElbowX * retEase;
        elbowY = guardElbowY * (1 - retEase) + strikeElbowY * retEase;
        actualFistX = targetFistX * (1 - retEase) + strikeFistX * retEase;
        actualFistY = targetFistY * (1 - retEase) + strikeFistY * retEase;
      }
    } else if (leftProgress > 0) {
      // S1 & S2 Left Jabs
      const p = fist.punchProgress;
      const targetDist = Math.hypot(targetFistY - shoulderY, targetFistX - shoulderX);
      const maxReach = Math.min(targetDist, (L1 + L2) * 0.98);

      if (fist.isPunching) {
        if (p < 0.28) {
          // Windup: wrist and shoulder pull back into sideways V
          const pullP = Math.sin((p / 0.28) * Math.PI * 0.5);
          const curD = maxReach - pullP * fighter.radius * 0.55;
          const cosA = Math.max(-1, Math.min(1, (L1 * L1 + curD * curD - L2 * L2) / (2 * L1 * curD)));
          const A = Math.acos(cosA);
          elbowX = shoulderX + L1 * Math.cos(targetAngle - A);
          elbowY = shoulderY + L1 * Math.sin(targetAngle - A);
          actualFistX = shoulderX + curD * Math.cos(targetAngle);
          actualFistY = shoulderY + curD * Math.sin(targetAngle);
        } else {
          // Extension: unsprings straight into jab
          const unspringP = (p - 0.28) / 0.72;
          const snapEase = Math.sin(unspringP * Math.PI * 0.5);
          const cockedD = maxReach - fighter.radius * 0.55;
          const curD = cockedD + (maxReach - cockedD) * snapEase;
          const cosA = Math.max(-1, Math.min(1, (L1 * L1 + curD * curD - L2 * L2) / (2 * L1 * curD)));
          const A = Math.acos(cosA) * (1 - snapEase);
          elbowX = shoulderX + L1 * Math.cos(targetAngle - A);
          elbowY = shoulderY + L1 * Math.sin(targetAngle - A);
          actualFistX = shoulderX + curD * Math.cos(targetAngle);
          actualFistY = shoulderY + curD * Math.sin(targetAngle);
        }
      } else {
        // Retraction
        const retEase = Math.sin(p * Math.PI * 0.5);
        if (comboStage === 1) {
          // Ready for S3: retracts into high chin guard
          const extElbowX = shoulderX + L1 * Math.cos(targetAngle);
          const extElbowY = shoulderY + L1 * Math.sin(targetAngle);

          const guardElbowX = shoulderX + L1 * 0.35;
          const guardElbowY = shoulderY - L1 * 0.65;

          elbowX = guardElbowX + (extElbowX - guardElbowX) * retEase;
          elbowY = guardElbowY + (extElbowY - guardElbowY) * retEase;
          actualFistX = targetFistX + (shoulderX + maxReach * Math.cos(targetAngle) - targetFistX) * retEase;
          actualFistY = targetFistY + (shoulderY + maxReach * Math.sin(targetAngle) - targetFistY) * retEase;
        } else {
          // S1 retraction: returns smoothly to stance
          const extElbowX = shoulderX + L1 * Math.cos(targetAngle);
          const extElbowY = shoulderY + L1 * Math.sin(targetAngle);

          elbowX = extElbowX * retEase + (shoulderX + L1 * Math.cos(targetAngle)) * (1 - retEase);
          elbowY = extElbowY * retEase + (shoulderY + L1 * Math.sin(targetAngle)) * (1 - retEase);
          actualFistX = targetFistX;
          actualFistY = targetFistY;
        }
      }
    } else if (fighter.comboStage === 2 || fighter.comboStage === 3 || rightProgress > 0) {
      // Guard stance when ready for S3 / S4
      const rightFist = fighter.fists?.find(f => f.punchType === 'right');
      const isS4Recovering = rightFist && !rightFist.isPunching && rightProgress > 0 && rightFist.comboStage === 3;

      const guardElbowX = shoulderX + L1 * 0.35;
      const guardElbowY = shoulderY - L1 * 0.65;
      const guardFistX = targetFistX;
      const guardFistY = targetFistY;

      const pokeElbowX = shoulderX + L1 * Math.cos(targetAngle);
      const pokeElbowY = shoulderY + L1 * Math.sin(targetAngle);
      const pokeFistX = pokeElbowX + L2 * Math.cos(targetAngle);
      const pokeFistY = pokeElbowY + L2 * Math.sin(targetAngle);

      if (isS4Recovering) {
        // Starts straightening left arm back into extended lead idle stance
        const targetDist = Math.hypot(targetFistY - shoulderY, targetFistX - shoulderX);
        const maxReach = Math.min(targetDist, (L1 + L2) * 0.98);
        const vCycle = (Math.sin(idleTime * 3.5) + 1) * 0.5;
        const curD = maxReach - vCycle * fighter.radius * 0.42;
        const cosA = Math.max(-1, Math.min(1, (L1 * L1 + curD * curD - L2 * L2) / (2 * L1 * curD)));
        const A = Math.acos(cosA);
        const idleElbowX = shoulderX + L1 * Math.cos(targetAngle - A);
        const idleElbowY = shoulderY + L1 * Math.sin(targetAngle - A);
        const idleFistX = shoulderX + curD * Math.cos(targetAngle);
        const idleFistY = shoulderY + curD * Math.sin(targetAngle);

        const retEase = Math.sin(rightProgress * Math.PI * 0.5);
        elbowX = idleElbowX * (1 - retEase) + guardElbowX * retEase;
        elbowY = idleElbowY * (1 - retEase) + guardElbowY * retEase;
        actualFistX = idleFistX * (1 - retEase) + guardFistX * retEase;
        actualFistY = idleFistY * (1 - retEase) + guardFistY * retEase;
      } else {
        elbowX = guardElbowX;
        elbowY = guardElbowY;
        actualFistX = guardFistX;
        actualFistY = guardFistY;
      }
    } else {
      // Idle Stance: Lead left arm extended straight forward with sideways V idle oscillation
      const targetDist = Math.hypot(targetFistY - shoulderY, targetFistX - shoulderX);
      const maxReach = Math.min(targetDist, (L1 + L2) * 0.98);
      const vCycle = (Math.sin(idleTime * 3.5) + 1) * 0.5;
      const curD = maxReach - vCycle * fighter.radius * 0.42;
      const cosA = Math.max(-1, Math.min(1, (L1 * L1 + curD * curD - L2 * L2) / (2 * L1 * curD)));
      const A = Math.acos(cosA);
      elbowX = shoulderX + L1 * Math.cos(targetAngle - A);
      elbowY = shoulderY + L1 * Math.sin(targetAngle - A);
      actualFistX = shoulderX + curD * Math.cos(targetAngle);
      actualFistY = shoulderY + curD * Math.sin(targetAngle);
    }
  } else {
    // RIGHT ARM
    const isM2RightJab = fist.isHeavy && (fighter.streetBoxingM2Stage === 1 || fighter.streetBoxingM2Stage === 2 || !fighter.streetBoxingM2Stage);

    if (rightProgress > 0 && isM2RightJab) {
      // M2 Strike 1 & 2 Right Jabs (opposite of S1)
      const p = fist.punchProgress;
      const targetDist = Math.hypot(targetFistY - shoulderY, targetFistX - shoulderX);
      const maxReach = Math.min(targetDist, (L1 + L2) * 0.98);

      if (fist.isPunching) {
        if (p < 0.28) {
          const pullP = Math.sin((p / 0.28) * Math.PI * 0.5);
          const curD = maxReach - pullP * fighter.radius * 0.55;
          const cosA = Math.max(-1, Math.min(1, (L1 * L1 + curD * curD - L2 * L2) / (2 * L1 * curD)));
          const A = Math.acos(cosA);
          elbowX = shoulderX + L1 * Math.cos(targetAngle + A);
          elbowY = shoulderY + L1 * Math.sin(targetAngle + A);
          actualFistX = shoulderX + curD * Math.cos(targetAngle);
          actualFistY = shoulderY + curD * Math.sin(targetAngle);
        } else {
          const unspringP = (p - 0.28) / 0.72;
          const snapEase = Math.sin(unspringP * Math.PI * 0.5);
          const cockedD = maxReach - fighter.radius * 0.55;
          const curD = cockedD + (maxReach - cockedD) * snapEase;
          const cosA = Math.max(-1, Math.min(1, (L1 * L1 + curD * curD - L2 * L2) / (2 * L1 * curD)));
          const A = Math.acos(cosA) * (1 - snapEase);
          elbowX = shoulderX + L1 * Math.cos(targetAngle + A);
          elbowY = shoulderY + L1 * Math.sin(targetAngle + A);
          actualFistX = shoulderX + curD * Math.cos(targetAngle);
          actualFistY = shoulderY + curD * Math.sin(targetAngle);
        }
      } else {
        const retEase = Math.sin(p * Math.PI * 0.5);
        const extElbowX = shoulderX + L1 * Math.cos(targetAngle);
        const extElbowY = shoulderY + L1 * Math.sin(targetAngle);

        const guardElbowX = shoulderX + L1 * 0.35;
        const guardElbowY = shoulderY + L1 * 0.65;

        elbowX = guardElbowX + (extElbowX - guardElbowX) * retEase;
        elbowY = guardElbowY + (extElbowY - guardElbowY) * retEase;
        actualFistX = targetFistX + (shoulderX + maxReach * Math.cos(targetAngle) - targetFistX) * retEase;
        actualFistY = targetFistY + (shoulderY + maxReach * Math.sin(targetAngle) - targetFistY) * retEase;
      }
    } else if (rightProgress > 0 && !fist.isHeavy) {
      const p = fist.punchProgress;

      if (comboStage === 2) {
        // S3 Straight: Shoulder and elbow pull back deeply before straightening
        if (fist.isPunching) {
          if (p < 0.28) {
            const chamberP = Math.sin((p / 0.28) * Math.PI * 0.5);
            elbowX = shoulderX - chamberP * fighter.radius * 0.55;
            elbowY = shoulderY + chamberP * fighter.radius * 0.35;
            actualFistX = shoulderX + fighter.radius * 0.16;
            actualFistY = shoulderY + fighter.radius * 0.10;
          } else {
            const strikeP = (p - 0.28) / 0.72;
            const strikeEase = Math.sin(strikeP * Math.PI * 0.5);

            const chamberElbowX = shoulderX - fighter.radius * 0.55;
            const chamberElbowY = shoulderY + fighter.radius * 0.35;
            const chamberFistX = shoulderX + fighter.radius * 0.16;
            const chamberFistY = shoulderY + fighter.radius * 0.10;

            const straightAngle = Math.atan2(targetFistY - shoulderY, targetFistX - shoulderX);
            const straightElbowX = shoulderX + L1 * Math.cos(straightAngle);
            const straightElbowY = shoulderY + L1 * Math.sin(straightAngle);
            const straightFistX = straightElbowX + L2 * Math.cos(straightAngle);
            const straightFistY = straightElbowY + L2 * Math.sin(straightAngle);

            elbowX = chamberElbowX * (1 - strikeEase) + straightElbowX * strikeEase;
            elbowY = chamberElbowY * (1 - strikeEase) + straightElbowY * strikeEase;
            actualFistX = chamberFistX * (1 - strikeEase) + straightFistX * strikeEase;
            actualFistY = chamberFistY * (1 - strikeEase) + straightFistY * strikeEase;
          }
        } else {
          const retEase = Math.sin(p * Math.PI * 0.5);
          const straightAngle = Math.atan2(targetFistY - shoulderY, targetFistX - shoulderX);
          const straightElbowX = shoulderX + L1 * Math.cos(straightAngle);
          const straightElbowY = shoulderY + L1 * Math.sin(straightAngle);

          const guardElbowX = shoulderX + L1 * 0.35;
          const guardElbowY = shoulderY + L1 * 0.65;

          elbowX = guardElbowX * (1 - retEase) + straightElbowX * retEase;
          elbowY = guardElbowY * (1 - retEase) + straightElbowY * retEase;
          actualFistX = targetFistX * (1 - retEase) + (straightElbowX + L2 * Math.cos(straightAngle)) * retEase;
          actualFistY = targetFistY * (1 - retEase) + (straightElbowY + L2 * Math.sin(straightAngle)) * retEase;
        }
      } else if (comboStage === 3) {
        // S4 Hook: Shoulder chambers back like S3 then hooks with exact L-shape (90°)
        if (fist.isPunching) {
          if (p < 0.28) {
            const chamberP = Math.sin((p / 0.28) * Math.PI * 0.5);
            elbowX = shoulderX - chamberP * fighter.radius * 0.55;
            elbowY = shoulderY + chamberP * fighter.radius * 0.35;
            actualFistX = shoulderX + fighter.radius * 0.16;
            actualFistY = shoulderY + fighter.radius * 0.10;
          } else {
            const hookP = (p - 0.28) / 0.72;
            const hookEase = Math.sin(hookP * Math.PI * 0.5);

            const chamberUpper = Math.PI * 0.75;
            const targetUpper = -Math.PI * 0.18;
            const loopBow = Math.sin(hookP * Math.PI) * 0.30;
            const upperAngle = chamberUpper * (1 - hookEase) + targetUpper * hookEase + loopBow;

            elbowX = shoulderX + L1 * Math.cos(upperAngle);
            elbowY = shoulderY + L1 * Math.sin(upperAngle);

            // Exact L-shape (90° perpendicular)
            const forearmAngle = upperAngle - Math.PI / 2;
            actualFistX = elbowX + L2 * Math.cos(forearmAngle);
            actualFistY = elbowY + L2 * Math.sin(forearmAngle);
          }
        } else {
          const targetDist = Math.hypot(targetFistY - shoulderY, targetFistX - shoulderX);
          const maxReach = Math.min(targetDist, (L1 + L2) * 0.98);
          const cosA = Math.max(-1, Math.min(1, (L1 * L1 + maxReach * maxReach - L2 * L2) / (2 * L1 * maxReach)));
          const A = Math.acos(cosA);
          const idleElbowX = shoulderX + L1 * Math.cos(targetAngle + A);
          const idleElbowY = shoulderY + L1 * Math.sin(targetAngle + A);

          const retEase = Math.sin(p * Math.PI * 0.5);
          const upperAngle = -Math.PI * 0.18;
          const strikeElbowX = shoulderX + L1 * Math.cos(upperAngle);
          const strikeElbowY = shoulderY + L1 * Math.sin(upperAngle);
          const forearmAngle = upperAngle - Math.PI / 2;
          const strikeFistX = strikeElbowX + L2 * Math.cos(forearmAngle);
          const strikeFistY = strikeElbowY + L2 * Math.sin(forearmAngle);

          elbowX = idleElbowX * (1 - retEase) + strikeElbowX * retEase;
          elbowY = idleElbowY * (1 - retEase) + strikeElbowY * retEase;
          actualFistX = targetFistX * (1 - retEase) + strikeFistX * retEase;
          actualFistY = targetFistY * (1 - retEase) + strikeFistY * retEase;
        }
      }
    } else if (fighter.streetBoxingM2Stage === 3 && leftProgress > 0) {
      // Held at chin guard during M2 Strike 3 (Left Hook)
      const guardElbowX = shoulderX + L1 * 0.35;
      const guardElbowY = shoulderY + L1 * 0.65;
      elbowX = guardElbowX;
      elbowY = guardElbowY;
      actualFistX = targetFistX;
      actualFistY = targetFistY;
    } else {
      // Right Arm Stance / Guard: 2-bone IK with elbow flexed outward on right side (+A)
      const targetDist = Math.hypot(targetFistY - shoulderY, targetFistX - shoulderX);
      const maxReach = Math.min(targetDist, (L1 + L2) * 0.98);
      const cosA = Math.max(-1, Math.min(1, (L1 * L1 + maxReach * maxReach - L2 * L2) / (2 * L1 * maxReach)));
      const A = Math.acos(cosA);
      elbowX = shoulderX + L1 * Math.cos(targetAngle + A);
      elbowY = shoulderY + L1 * Math.sin(targetAngle + A);
      actualFistX = targetFistX;
      actualFistY = targetFistY;
    }
  }

  return { elbowX, elbowY, actualFistX, actualFistY };
};
