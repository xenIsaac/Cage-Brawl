import { Fighter, Fist } from '../../types';
import { CombatFighter } from '../types';
import { FistIKContext } from './types';
import { getBasicFistPos } from './basic';
import { getStreetBoxingFistPos } from './streetBoxing';
import { getKyokushinFistPos } from './kyokushin';
import { getMuayThaiFistPos } from './muayThai';
import { getShotokanFistPos } from './shotokan';
import { getAshiharaFistPos } from './ashihara';
import { getKickboxingFistPos } from './kickboxing';
import { getCapoeiraFistPos } from './capoeira';
import { getStreetTaekwondoFistPos } from './streetTaekwondo';
import { getSluggerFistPos } from './slugger';
import { getBoxingShellFistPos } from './boxingShell';
import { getKeysiFistPos } from './keysi';
import { getCQCFistPos } from './cqc';
import { getAikidoFistPos } from './aikido';
import { getKickShoulderAngle } from '../kickAnimation';

export { getIronSwayFactor, getCapoeiraKickEase } from '../fistIK';

/**
 * SECTION 1.10: ANIMATION LINGER, RIGID RETRACTION & COMBAT FLOW ENGINE (MASTER SPEC)
 * Initializes cross-sequence combo transitions:
 * 1. Instant Input Override & Zero Double-Travel: Captures current 2D canvas coordinates so next strike
 *    originates directly from where the hand/leg currently is in space without resetting to chest.
 * 2. Synchronized Opposing Torque Transition: Releases Linger on the opposing limb so it
 *    smoothly retracts simultaneously at an identical synchronized rate as a kinetic counterweight!
 */
export function initFistPunchBlend(fist: Fist, fighter?: any) {
  fist.isPunching = true;
  fist.punchProgress = 0;
  fist.lingerTimer = 0;
  fist.isLingerActive = false;
  fist.hasHit = false;

  // Zero Double-Travel: 3-Frame Spherical Slerp Decouple origin
  if (fist.currentSpatialX !== undefined && fist.currentSpatialY !== undefined) {
    fist.blendStartX = fist.currentSpatialX;
    fist.blendStartY = fist.currentSpatialY;
    fist.blendTimer = 3;
  }

  // Opposing Torque Transition:
  // If the other limb is in Chamber Linger (or still extended), release its pose hold
  // so it retracts simultaneously as a kinetic counterweight while this strike fires forward.
  if (fighter && fighter.fists && Array.isArray(fighter.fists)) {
    fighter.fists.forEach((otherFist: Fist) => {
      if (otherFist.id !== fist.id) {
        if (otherFist.lingerTimer && otherFist.lingerTimer > 0) {
          otherFist.lingerTimer = 0;
          otherFist.isLingerActive = false;
        }
      }
    });
  }
}

/**
 * Grounded Linear-Decay Interpolation (No Elastic Overshoot / Bounce)
 * Direct linear convergence; snaps cleanly when delta < 0.005 to prevent floating decimals
 */
export function blendLinearDecay(current: number, target: number, speed: number): number {
  const delta = target - current;
  if (Math.abs(delta) < 0.005) {
    return target; // HARD STOP, ZERO OSCILLATION
  }
  return current + delta * Math.min(1.0, Math.max(0.0, speed));
}

function computeStyleFistPos(
  styleId: string,
  ctx: FistIKContext
): { fistX: number; fistY: number } {
  switch (styleId) {
    case 'kyokushin':
      return getKyokushinFistPos(ctx);
    case 'basic':
      return getBasicFistPos(ctx);
    case 'street_boxing':
      return getStreetBoxingFistPos(ctx);
    case 'muay_thai':
      return getMuayThaiFistPos(ctx);
    case 'shotokan':
      return getShotokanFistPos(ctx);
    case 'ashihara':
      return getAshiharaFistPos(ctx);
    case 'kickboxing':
      return getKickboxingFistPos(ctx);
    case 'capoeira':
      return getCapoeiraFistPos(ctx);
    case 'street_taekwondo':
      return getStreetTaekwondoFistPos(ctx);
    case 'slugger':
      return getSluggerFistPos(ctx);
    case 'boxing_shell':
      return getBoxingShellFistPos(ctx);
    case 'keysi':
      return getKeysiFistPos(ctx);
    case 'cqc':
      return getCQCFistPos(ctx);
    case 'aikido':
      return getAikidoFistPos(ctx);
    default:
      return {
        fistX: ctx.isLeft ? ctx.fighter.radius * 1.0 : ctx.fighter.radius * 1.0,
        fistY: ctx.isLeft ? -ctx.fighter.radius * 0.45 : ctx.fighter.radius * 0.45,
      };
  }
}

/**
 * Dispatches fist IK relative position computation with 3-frame cross-sequence micro-blend
 * and 8-frame stance morphing on style switches (Universal Smooth Blend Engine v1.7.6 Part 4 Finale).
 */
export function getFistRelativePos(
  fighter: CombatFighter | Fighter,
  fist: Fist,
  idleTime: number,
  isBlockingActive: boolean,
  isCollision: boolean = false,
  gameTime: number = 0
): { fistX: number; fistY: number } {
  const isLeft = fist.punchType ? fist.punchType === 'left' : fist.id === 1;
  const leftFist = fighter.fists ? (fighter.fists.find(f => f.punchType === 'left') || fighter.fists[0]) : undefined;
  const rightFist = fighter.fists ? (fighter.fists.find(f => f.punchType === 'right') || fighter.fists[1]) : undefined;
  const leftProgress = leftFist ? leftFist.punchProgress : (isLeft ? fist.punchProgress : 0);
  const rightProgress = rightFist ? rightFist.punchProgress : (!isLeft ? fist.punchProgress : 0);

  let easeProgress = 0;
  if (fighter.styleId === 'basic' || fighter.styleId === 'muay_thai' || fighter.styleId === 'ashihara' || fighter.styleId === 'street_boxing' || fighter.styleId === 'boxing_shell' || fighter.styleId === 'aikido') {
    easeProgress = Math.sin((fist.punchProgress * Math.PI) / 2);
  } else {
    easeProgress = fist.punchProgress;
  }

  // Aikido Over-Head Grapple Slam: Target / Victim Arm Reaction & Lockout
  if ((fighter as any).aikiSlamVictimStage) {
    const vStage = (fighter as any).aikiSlamVictimStage;
    if (vStage === 'clamp') {
      return {
        fistX: isLeft ? fighter.radius * 1.65 : fighter.radius * 0.70,
        fistY: isLeft ? -fighter.radius * 0.10 : fighter.radius * 0.35,
      };
    } else if (vStage === 'lift' || vStage === 'airborne') {
      return {
        fistX: isLeft ? fighter.radius * 1.35 : fighter.radius * 0.60,
        fistY: isLeft ? -fighter.radius * 0.15 : fighter.radius * 0.30,
      };
    } else {
      return {
        fistX: isLeft ? fighter.radius * 0.35 : fighter.radius * 0.35,
        fistY: isLeft ? -fighter.radius * 0.55 : fighter.radius * 0.55,
      };
    }
  }

  const ctx: FistIKContext = {
    fighter,
    fist,
    idleTime,
    isBlockingActive,
    isCollision,
    gameTime,
    isLeft,
    leftProgress,
    rightProgress,
    easeProgress,
  };

  let pos = computeStyleFistPos(fighter.styleId, ctx);

  // 1. 8-Frame Stance Morphing on Style Switch (Smooth Morphing)
  if (fighter.prevStyleId && fighter.prevStyleId !== fighter.styleId && fighter.styleMorphProgress !== undefined && fighter.styleMorphProgress < 1.0) {
    const prevPos = computeStyleFistPos(fighter.prevStyleId, ctx);
    const m = Math.min(1.0, Math.max(0.0, fighter.styleMorphProgress));
    // Smoothstep interpolation over 8 frames
    const smoothM = m * m * (3 - 2 * m);
    pos = {
      fistX: prevPos.fistX * (1 - smoothM) + pos.fistX * smoothM,
      fistY: prevPos.fistY * (1 - smoothM) + pos.fistY * smoothM,
    };
  }

  // 2. 3-Frame Cross-Sequence Micro-Blend Window (Eliminates Frame-0 Teleport Snapping)
  if (fist.blendTimer && fist.blendTimer > 0 && fist.blendStartX !== undefined && fist.blendStartY !== undefined) {
    const t = Math.min(1.0, Math.max(0.0, (3 - fist.blendTimer) / 3));
    // Smoothstep curve for the 3-frame launch vector redirect
    const slerpCurve = t * t * (3 - 2 * t);
    pos = {
      fistX: fist.blendStartX * (1 - slerpCurve) + pos.fistX * slerpCurve,
      fistY: fist.blendStartY * (1 - slerpCurve) + pos.fistY * slerpCurve,
    };
    fist.blendTimer--;
    if (fist.blendTimer <= 0) {
      fist.blendStartX = undefined;
      fist.blendStartY = undefined;
    }
  }

  // 3. SECTION 1.12: Opposing Kinetic Counterweight Pull
  // The non-striking arm pulls backward slightly into the torso (~15% radius) as an opposing kinetic counterweight
  if (fist.punchProgress === 0 && !fist.isPunching && (!fist.lingerTimer || fist.lingerTimer <= 0)) {
    const opposingProgress = isLeft ? rightProgress : leftProgress;
    if (opposingProgress > 0) {
      const opposingSin = Math.sin(opposingProgress * Math.PI);
      pos.fistX -= fighter.radius * 0.15 * opposingSin;
      pos.fistY += (isLeft ? -1 : 1) * fighter.radius * 0.04 * opposingSin;
    }
  }

  // Save current spatial position for next frame's potential micro-blend origin
  fist.currentSpatialX = pos.fistX;
  fist.currentSpatialY = pos.fistY;

  return pos;
}
