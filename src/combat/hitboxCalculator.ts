import { Fighter, Fist } from '../types';
import { getClampedFistPos } from './fistIK';

export interface StrikeHitboxInfo {
  strikeX: number;
  strikeY: number;
  hitRadius: number;
  hitBuffer: number;
  sampleFractions: number[];
  isActiveHitWindow: boolean;
  stage: number;
  isM1Light: boolean;
  strikeName: string;
}

/**
 * Standardized, height-calibrated hitbox calculation engine for Light Attacks (S1-S4) and Heavy Strikes (M2).
 * 
 * Features:
 * - Full limb kinematic reach & height scale compensation (prevents whiffing when tall vs short fighters engage).
 * - Full-depth limb sampling coverage ([0.30 .. 1.12]) so close-range CQC & infight pocket strikes connect cleanly.
 * - Dynamic height-adaptive hitBuffer to align visual limb contact with mathematical hurtboxes across all fighting styles.
 */
export function getStrikeHitboxInfo(
  fighter: Fighter,
  fist: Fist,
  idleTime: number = Date.now() / 1000,
  gameTime: number = 0
): StrikeHitboxInfo {
  const isLeft = fist.punchType === 'left';
  const progress = fist.punchProgress || 0;
  const isHeavy = !!fist.isHeavy;
  const punchTime = fist.punchTimeSec || 0;
  const stage = fist.comboStage !== undefined
    ? fist.comboStage
    : (fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1));

  const isM1Light = !isHeavy;

  // 1. ACTIVE HIT WINDOW
  let isActiveHitWindow = true;

  // SECTION 1.4: Deterministic Timing Untouched
  // Chamber Linger is purely a visual follow-through pose hold. Hitboxes do not linger.
  if (fist.isLingerActive) {
    isActiveHitWindow = false;
  } else if (isM1Light) {
    if (stage === 0 || stage === 1) {
      // S1 & S2 (Jabs / Quick Lights): Snappy forward extension window.
      const isExtending = fist.isPunching && progress >= 0.15 && progress <= 0.98;
      const isPeakRecovery = !fist.isPunching && progress >= 0.55;
      const isWithinTime = punchTime >= 0.04 && punchTime <= 0.35;
      isActiveHitWindow = (isExtending || isPeakRecovery) && isWithinTime;
    } else if (stage === 2) {
      // S3: Intermediate strike / Hook / Elbow / Calf Kick.
      const isExtending = fist.isPunching && progress >= 0.15;
      const isPeakRecovery = !fist.isPunching && progress >= 0.30;
      const isWithinTime = punchTime >= 0.05 && punchTime <= 0.58;
      isActiveHitWindow = (isExtending || isPeakRecovery) && isWithinTime;
    } else {
      // S4: Combo Finisher / Power Kick / Overhand / Palm Drive.
      const isExtending = fist.isPunching && progress >= 0.15;
      const isPeakRecovery = !fist.isPunching && progress >= 0.25;
      const isWithinTime = punchTime >= 0.05 && punchTime <= 0.68;
      isActiveHitWindow = (isExtending || isPeakRecovery) && isWithinTime;
    }
  } else {
    // M2 Heavy Strikes
    if (fighter.styleId === 'kyokushin' && isLeft) {
      // 🛠️ 1. Hitbox Bug Fix: Left Arm Isolation
      // The Left Arm / Left Glove has its hitbox completely disabled throughout the entire M2 animation.
      isActiveHitWindow = false;
    } else if (fighter.styleId === 'capoeira') {
      isActiveHitWindow = (fist.isPunching && progress >= 0.25) || (!fist.isPunching && progress >= 0.50);
    } else {
      const isExtending = fist.isPunching && progress >= 0.15;
      const isPeakRecovery = !fist.isPunching && progress >= 0.30;
      const isWithinTime = punchTime >= 0.05 && punchTime <= 0.80;
      isActiveHitWindow = (isExtending || isPeakRecovery) && isWithinTime;
    }
  }

  // Universal Kyokushin M2 Left Arm Hitbox Isolation guarantee (even during windup or stage confusion)
  if (fighter.styleId === 'kyokushin' && isLeft) {
    const isM2Active = isHeavy || ((fighter.heavyWindup || 0) > 0) || (fighter.fists && fighter.fists.some(f => f.punchType === 'right' && f.isHeavy));
    if (isM2Active) {
      isActiveHitWindow = false;
    }
  }

  // 2. HIT RADIUS, BUFFER & SEGMENT SAMPLE FRACTIONS
  // Dynamic height buffer scaling: accounts for scaleFactor variations (e.g. 4'11" Micro vs 7'2" Giant)
  const baseRadius = fighter.radius || 46.8;
  let hitRadius = baseRadius * 0.32;
  let hitBuffer = Math.max(8.0, baseRadius * 0.22);
  let sampleFractions = [0.30, 0.50, 0.70, 0.85, 1.0, 1.10];

  if (!isHeavy) {
    if (stage === 0 || stage === 1) {
      // S1 & S2: Lead strikes with full inner-arm to tip sampling to prevent CQC pocket whiffs
      hitRadius = Math.max(8.0, baseRadius * 0.30);
      hitBuffer = Math.max(8.0, baseRadius * 0.20);
      sampleFractions = [0.30, 0.50, 0.70, 0.85, 1.0, 1.10];
    } else if (stage === 2) {
      // S3: Solid, authoritative hitbox with forearm/shin coverage
      hitRadius = Math.max(11.0, baseRadius * 0.46);
      hitBuffer = Math.max(12.0, baseRadius * 0.28);
      sampleFractions = [0.25, 0.45, 0.65, 0.85, 1.0, 1.12];
    } else {
      // S4: Empowered Combo Finisher with expansive coverage
      hitRadius = Math.max(13.0, baseRadius * 0.54);
      hitBuffer = Math.max(16.0, baseRadius * 0.36);
      sampleFractions = [0.20, 0.40, 0.60, 0.80, 1.0, 1.15];
    }
  } else {
    // Heavy strikes
    if (fighter.styleId === 'capoeira' || fighter.styleId === 'kyokushin' || fighter.styleId === 'slugger') {
      hitRadius = baseRadius * 0.62;
      hitBuffer = Math.max(18.0, baseRadius * 0.42);
      sampleFractions = [0.20, 0.40, 0.60, 0.80, 1.0, 1.18];
    } else {
      hitRadius = baseRadius * 0.54;
      hitBuffer = Math.max(14.0, baseRadius * 0.32);
      sampleFractions = [0.25, 0.45, 0.65, 0.85, 1.0, 1.12];
    }
  }

  // 3. STRIKING LIMB COORDINATES (STRIKEX, STRIKEY)
  const rel = getClampedFistPos(fighter, fist, idleTime, isLeft, true, gameTime);
  let strikeX = rel.fistX;
  let strikeY = rel.fistY;

  const style = fighter.styleId;
  const ease = Math.sin(progress * Math.PI);

  if (!isHeavy) {
    if (stage === 0) {
      // S1 Lead Strikes
      if (style === 'shotokan' && isLeft) {
        // Empi-Uchi Elbow
        strikeX = baseRadius * (0.95 + ease * 0.85);
        strikeY = -baseRadius * 0.20;
      } else if (style === 'keysi') {
        // Lead Forearm Wedge
        strikeX = baseRadius * (0.68 + ease * 0.25);
        strikeY = -baseRadius * 0.25;
      }
    } else if (stage === 1) {
      // S2 Follow-up Strikes
      if (style === 'kyokushin' && !isLeft) {
        // Gedan Geri (Calf Kick)
        strikeX = baseRadius * (0.65 + ease * 1.95);
        strikeY = baseRadius * 0.32 * (1 - ease * 0.45);
      } else if (style === 'keysi') {
        // Rear Forearm Smash
        strikeX = baseRadius * (0.70 + ease * 0.28);
        strikeY = baseRadius * 0.25;
      }
    } else if (stage === 2) {
      // S3 Attacks: Fix all kicks, horizontal slicing elbows, sweeps & hooks
      if (style === 'shotokan') {
        // Ren-Zuki 2 punch
        strikeX = baseRadius * (1.15 + ease * 0.90);
        strikeY = -baseRadius * 0.18;
      } else if (style === 'muay_thai') {
        // Sok Tat (Horizontal Slicing Elbow)
        strikeX = baseRadius * (1.00 + ease * 0.75);
        strikeY = baseRadius * (0.35 - ease * 0.65);
      } else if (style === 'street_taekwondo') {
        // Stance Switch Jump Kick
        strikeX = baseRadius * (1.30 + ease * 1.25);
        strikeY = -baseRadius * 0.40;
      } else if (style === 'kickboxing') {
        // Calf Kick (Low Leg Sweep)
        strikeX = baseRadius * (1.35 + ease * 0.95);
        strikeY = -baseRadius * 0.25 * (1 - ease);
      } else if (style === 'ashihara') {
        // Chudan Kansetsu Geri (Left Kick)
        strikeX = baseRadius * (1.30 + ease * 1.15);
        strikeY = -baseRadius * 0.30;
      } else if (style === 'capoeira') {
        // Queixada (Left Kick)
        strikeX = baseRadius * (1.35 + ease * 1.05);
        strikeY = -baseRadius * 0.30;
      } else if (style === 'keysi') {
        // Descending Elbow (Inside CQC pocket)
        strikeX = baseRadius * (0.72 + ease * 0.30);
        strikeY = -baseRadius * 0.25;
      } else if (style === 'street_boxing') {
        // Rear Straight
        strikeX = baseRadius * (1.20 + ease * 1.05);
        strikeY = baseRadius * 0.10;
      } else if (style === 'aikido') {
        // Tenkan Arm Sweep
        strikeX = baseRadius * (1.05 + ease * 0.75);
        strikeY = baseRadius * 0.25 - ease * baseRadius * 0.40;
      } else if (style === 'boxing_shell') {
        // Left Upper-Jab / Hook
        strikeX = baseRadius * (1.15 + ease * 0.85);
        strikeY = -baseRadius * 0.18;
      } else if (style === 'kyokushin') {
        // Shotei Uchi (Left Palm)
        strikeX = baseRadius * (1.00 + ease * 0.90);
        strikeY = -baseRadius * 0.18;
      }
    } else if (stage === 3) {
      // S4 Attacks: Fix all finishers (kicks, downward palm drives, looping hooks, cleans)
      if (style === 'shotokan') {
        // Left Mae-Geri Kick (Front Kick extending to ~2.75 * R)
        strikeX = baseRadius * (1.25 + ease * 1.60);
        strikeY = -baseRadius * 0.40;
      } else if (style === 'muay_thai') {
        // Left Shin Kick sweeping across front
        const startAngle = -Math.PI * 0.45;
        const endAngle = Math.PI * 0.25;
        const sweepEase = progress * progress * (3 - 2 * progress);
        const currentSweepAngle = startAngle + sweepEase * (endAngle - startAngle);
        const dist = baseRadius * 1.75;
        strikeX = Math.cos(currentSweepAngle) * dist + baseRadius * 0.35;
        strikeY = Math.sin(currentSweepAngle) * dist;
      } else if (style === 'street_taekwondo') {
        // Right Side Kick / 360 Tornado Kick
        strikeX = baseRadius * (1.40 + ease * 1.35);
        strikeY = baseRadius * 0.20;
      } else if (style === 'kickboxing') {
        // Right Straight Finisher
        strikeX = baseRadius * (1.30 + ease * 1.15);
        strikeY = baseRadius * 0.12;
      } else if (style === 'ashihara') {
        // Right Ashibarai Sweep
        strikeX = baseRadius * (1.35 + ease * 1.20);
        strikeY = baseRadius * 0.25;
      } else if (style === 'capoeira') {
        // Right Bênção Front Push Kick
        strikeX = baseRadius * (1.45 + ease * 1.30);
        strikeY = 0;
      } else if (style === 'keysi') {
        // Heavy Pocket Knee (Inside CQC pocket)
        strikeX = baseRadius * (0.75 + ease * 0.35);
        strikeY = baseRadius * 0.20;
      } else if (style === 'street_boxing') {
        // Brawling Hook (90° L-shape arc)
        const hookEase = Math.sin(progress * Math.PI * 0.5);
        strikeX = baseRadius * (1.05 + hookEase * 0.95);
        strikeY = baseRadius * 0.20 - hookEase * baseRadius * 0.35;
      } else if (style === 'aikido') {
        // Shomenuchi Palm Drive
        strikeX = baseRadius * (1.15 + ease * 0.90);
        strikeY = baseRadius * 0.12;
      } else if (style === 'boxing_shell') {
        // Iron Cross Straight / Overhead Hook
        strikeX = baseRadius * (1.25 + ease * 1.00);
        strikeY = -baseRadius * 0.12;
      } else if (style === 'kyokushin') {
        // Right Full-Charge Palm Finisher
        strikeX = baseRadius * (1.15 + ease * 1.05);
        strikeY = baseRadius * 0.12;
      } else if (style === 'basic') {
        // Flow Boxing Left Looping Hook
        const hookEase = Math.sin(progress * Math.PI * 0.5);
        strikeX = baseRadius * (1.05 + hookEase * 0.90);
        strikeY = -baseRadius * 0.20 + hookEase * baseRadius * 0.35;
      }
    }
  }

  const strikeName = isHeavy
    ? 'HEAVY'
    : stage === 0
      ? 'S1'
      : stage === 1
        ? 'S2'
        : stage === 2
          ? 'S3'
          : 'S4';

  return {
    strikeX,
    strikeY,
    hitRadius,
    hitBuffer,
    sampleFractions,
    isActiveHitWindow,
    stage,
    isM1Light,
    strikeName,
  };
}
