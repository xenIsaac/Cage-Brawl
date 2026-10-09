import { Fighter } from '../types';

/**
 * Combat Engine Constants (v1.7.3.7)
 * Standardized steering physics, defensive buffering, 0.45s hitstun & attack lockout
 */

/** Universal Base Steering Turn Rate (radians per frame at 60fps) */
export const BASE_STEERING_TURN_RATE = 0.18; // ~10.3 deg/frame (smooth turning across PC mouse & Mobile Auto-Lock)

/** Universal Hit-Stun Duration (0.45s = 27 frames at 60fps) */
export const HITSTUN_DURATION_SEC = 0.45;
export const HITSTUN_FRAMES = 27; // 0.45s at 60fps

/** Universal Attack Lockout on Hit (0.45s = 27 frames at 60fps) - you can no longer attack when hit */
export const HIT_ATTACK_LOCKOUT_FRAMES = 27; // 0.45s at 60fps

/** Hit-Stun Steering Lockout duration (0.45s = 27 frames) */
export const STEERING_LOCKOUT_FRAMES = 27;

/** Hit-Stun Directional Movement Lockout duration (0.45s = 27 frames) */
export const HIT_MOVEMENT_LOCKOUT_FRAMES = 27;

/** Block Cooldown duration after releasing or exiting Guard (0.1s = 6 frames) */
export const BLOCK_COOLDOWN_FRAMES = 6;

/** Strict Perfect Parry Window from moment block is initiated (0.19s = 190ms) */
export const PERFECT_PARRY_WINDOW_SEC = 0.19;

/** Section 2.8: Post-M1 Block Lockout duration (0.15s = 9 frames at 60fps) */
export const POST_M1_BLOCK_LOCKOUT_FRAMES = 9;

/** Section 2.8: Post-Block Attack Re-Initiation Delay (0.10s = 6 frames at 60fps) */
export const POST_BLOCK_ATTACK_DELAY_FRAMES = 6;

/** Section 2.8: Post-Dash Attack Lockout duration (0.30s = 18 frames at 60fps) */
export const POST_DASH_ATTACK_LOCKOUT_FRAMES = 18;

/** Section 2.8: Dash Hit Delayed Momentum Stop duration (0.10s = 6 frames at 60fps) */
export const DASH_DELAYED_STOP_FRAMES = 6;

/** Universal Base Movement Speed (pixels per frame at 60fps) - slowed for grounded, tactical footwork */
export const BASE_MOVEMENT_SPEED = 2.3;

/** Base Directional Movement Acceleration Force */
export const BASE_MOVEMENT_FORCE = 0.32;

/** Default Combo Reset Timer in frames (Section 1.14: 2.0s = 120 frames at 60 FPS) */
export const BASE_COMBO_RESET_FRAMES = 120; // 2.0s reset window (120 frames at 60 FPS)
import {
  UNIVERSAL_BASELINE_EXECUTION_SPEED,
  calculateHeightModifiers,
  formatHeight,
  STYLE_STAT_PROFILES,
  resolveStyleCanonicalId,
} from './stats.config';

import {
  STYLE_RETRACTION_DS,
  COMBO_ACCELERATION_MULTIPLIER,
  getStyleSequenceDS,
  getStyleSequenceReturnSpeed,
  calculateDSRetractionDelta,
  normalizeStyleIdForDS,
} from './ds.config';

import {
  executeIronBoxingS4InstantChain,
  lockStreetBoxingAutoBurstQueue,
  tickStreetBoxingAutoBurst,
  isStreetBoxingFlurryUnparryable,
  applyGlobalM2RetractionOverride,
  canM2OverrideM1Retraction,
} from './combat.fixes';

// Re-export modular architecture for combat system consumption
export * from './stats.config';
export * from './ds.config';
export * from './combat.fixes';

export const CAPOEIRA_COMBO_RESET_FRAMES = 120; // 2.0s for Capoeira Rhythm Reset

export interface M1SpeedConfig {
  punchSpeed: number;
  returnSpeed: number;
}

/**
 * ⏱️ SECTION 1.18: MODULAR SCRIPT ARCHITECTURE & DURATION SPEED (DS) MATRIX
 *
 * 1. ⚙️ Pure Style Technique (Height Decoupled)
 *   - Universal Baseline Standard: Kyokushin Karate Baseline (~120.7ms, punchSpeed: 0.1381).
 *   - Genetics Decoupled: Execution speed is 100% style technique, untainted by height scaling.
 *
 * 2. ⏱️ Duration Speed (DS) Matrix
 *   - Governed per-sequence via ds.config.ts.
 *   - Forward travel is governed by UNIVERSAL_BASELINE_EXECUTION_SPEED.
 *   - Retraction is governed by per-sequence DS (STYLE_RETRACTION_DS).
 */
export function getStyleM1Speeds(styleId: string, stage: number = 0): M1SpeedConfig {
  const returnSpeed = getStyleSequenceReturnSpeed(styleId, stage);
  return { 
    punchSpeed: UNIVERSAL_BASELINE_EXECUTION_SPEED, 
    returnSpeed 
  };
}

/**
 * Returns the cooldown in frames between consecutive M1 strikes (Sequences 1-3).
 * Preserves authentic style execution speed, windup cadence, and strike rhythm.
 * While strikes ignore the 1.5s limb retraction, they strictly adhere to this
 * attack execution cadence and windup timing.
 */
export function getStyleM1BetweenCooldown(styleId: string, comboStage: number): number {
  switch (styleId) {
    case 'street_boxing':
      // S1 into S2 is a rapid double jab with reduced delay (8 frames / 0.13s), others 13 frames
      return comboStage === 0 ? 8 : 13;
    case 'muay_thai':
      return 20; // ~0.33s (rhythmic 8-limbs Thai march)
    case 'slugger':
      return 34; // ~0.57s (heavy deliberate windup and kinetic follow-through)
    case 'shotokan':
      // Ren-Zuki double-burst S2 -> S3: 9 frames vs 19 frames for others (signature double-jab burst!)
      return (comboStage === 1) ? 9 : 19;
    case 'ashihara':
      return 26; // ~0.43s (methodical Sabaki positioning)
    case 'capoeira':
      return 22; // ~0.37s (acrobatic Ginga flow)
    case 'kickboxing':
      // Cadence Opening: 10% faster jabs for S1 and S2
      return (comboStage === 0 || comboStage === 1) ? 18 : 21;
    case 'kyokushin':
      return 24; // ~0.40s (dense full-contact reverse thrust interval)
    case 'street_taekwondo':
      return 24; // ~0.40s (chambering interval)
    case 'keysi':
      return 18; // ~0.30s (rapid point-blank brawling cadence)
    case 'cqc':
      return 21; // ~0.35s base interval (progressively accelerated by 0.15s per landed hit)
    case 'boxing_shell':
      // S1 & S2 jabs (18 frames), S3 short hook (18 frames), S4 power hook (22 frames)
      return (comboStage === 3) ? 22 : 18;
    case 'aikido':
      return 21; // ~0.35s fluid redirected open-palm cadence
    default: // basic (Flow Boxing)
      return 21; // ~0.35s snappy out-boxer cadence
  }
}

export {
  MAX_POSTURE_REDUCTION,
  STYLE_BASE_POSTURE_CD,
  getStylePostureCooldown,
  calculateNetPostureCd,
  grantFighterPostureReduction,
  applyFighterPostureCooldown,
  updateFighterPostureFrame
} from './posture/postureEngine';

/**
 * Normalizes an angle into the range (-PI, PI]
 */
export function normalizeAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/**
 * Steering & Rotation Physics Controller
 *
 * - Base Steering Sensitivity: Rotation speed (omega) clamped to BASE_STEERING_TURN_RATE.
 * - Dash Steering Override: Free-Turn mode (instantaneous turn) during dash maneuvers.
 * - Hit-Stun Steering Lock: Taking damage locks rotation (omega = 0) for 0.45s (27 frames).
 *   Overwrites dash free-turn boost until the timer expires.
 */
export function updateFighterSteering(fighter: Fighter, targetAngle: number): void {
  // Locked Attack Direction (e.g. Flow Boxing M2 Sway Dash, Shotokan spinning kick):
  if (fighter.attackLockedAngle !== undefined) {
    fighter.facingAngle = fighter.attackLockedAngle;
    return;
  }

  // Hit-Stun Steering Lock (0.45s / 27 frames Lockout):
  // Constraint: Attempting to Dash while suffering from a Steering Lock will NOT activate Free-Turn mode.
  // The steering lock priority overwrites the dash turn boost until the 27-frame timer expires.
  if (fighter.hitSteeringLock && fighter.hitSteeringLock > 0) {
    return; // omega = 0, rotation strictly locked
  }

  // Dash Steering Override (Free-Turn Mode):
  // Executing a Dash temporarily removes the steering sensitivity cap for the duration of the dash.
  const isDashing = !!(fighter.isDashing || (fighter.dashProgress && fighter.dashProgress > 0));
  if (isDashing) {
    fighter.facingAngle = targetAngle;
    return;
  }

  // Base Steering Sensitivity (Turn Rate Cap):
  // Smoothly interpolate towards targetAngle with exponential dampening to eliminate rotational jitter
  const diff = normalizeAngle(targetAngle - fighter.facingAngle);
  const absDiff = Math.abs(diff);

  if (absDiff <= 0.001) {
    fighter.facingAngle = targetAngle;
  } else {
    const lerpStep = absDiff * 0.35;
    const clampedStep = Math.min(absDiff, Math.min(BASE_STEERING_TURN_RATE, Math.max(0.02, lerpStep)));
    fighter.facingAngle = normalizeAngle(fighter.facingAngle + Math.sign(diff) * clampedStep);
  }
}

/**
 * Applies or refreshes hit-stun movement, steering, and attack lockouts upon registering damage.
 * - Universal Hit-Stun: 0.45s lockout (27 frames at 60fps) on clean/unblocked hits.
 * - Universal Attack Lockout: 0.45s lockout (27 frames at 60fps) - cannot attack when hit.
 * - Hit-Stun Steering Lock: 0.45s lockout (27 frames).
 * - Hit-Stun Movement Lock: 0.45s lockout (27 frames).
 * - Physics vectors (knockback & wall collisions) remain active.
 */
export function applyDamageCombatLocks(defender: Fighter, isBlocked: boolean = false): void {
  defender.hitSteeringLock = Math.max(defender.hitSteeringLock || 0, STEERING_LOCKOUT_FRAMES); // 0.45s (27 frames)
  defender.hitMovementLock = Math.max(defender.hitMovementLock || 0, HIT_MOVEMENT_LOCKOUT_FRAMES); // 0.45s (27 frames)
  if (!isBlocked) {
    defender.stunTime = Math.max(defender.stunTime || 0, HITSTUN_FRAMES); // 0.45s (27 frames) hitstun
    defender.strikeCooldown = Math.max(defender.strikeCooldown || 0, HIT_ATTACK_LOCKOUT_FRAMES); // 0.45s (27 frames) attack lockout
  }
}

/**
 * Checks whether a fighter is eligible to initiate Guard stance.
 * Used for Frame 1 recovery buffered block activation.
 */
/**
 * Fully resets all combat timers, status debuffs (cripple, concuss, stun, etc.),
 * and active attack/block states on a fighter for a clean round start.
 */
export function resetFighterRoundState(fighter: Fighter): void {
  if (!fighter) return;
  // Basic status & flash reset
  fighter.parryFlashTime = 0;
  fighter.parryLockoutTimer = 0;
  fighter.parriedStun = 0;

  // Status debuffs & timers (Cripple, Concuss, Stun, Armor Break, Daze, Super Cripple, Bone Fracture)
  fighter.crippledLeg = false;
  fighter.crippleTimer = 0;
  fighter.crippleTime = 0;
  fighter.superCrippleTimer = 0;
  fighter.boneFractureTimer = 0;
  fighter.sluggerM1ChainCount = 0;
  fighter.sluggerM1WhiffDragCount = 0;
  fighter.sluggerWhiffedStages = [];
  fighter.sluggerM2WhiffLockoutTimer = 0;
  fighter.concussTime = 0;
  fighter.stunTime = 0;
  fighter.armorBreakTime = 0;
  fighter.dazeStunTimer = 0;
  fighter.m2StunTimer = 0;
  fighter.hitSteeringLock = 0;
  fighter.hitMovementLock = 0;

  // Attack & Block states
  fighter.strikeCooldown = 0;
  fighter.lightCooldown = 0;
  fighter.heavyCooldown = 0;
  fighter.heavyWindup = 0;
  fighter.isBlocking = false;
  fighter.wasBlocking = false;
  fighter.blockTimer = 0;
  fighter.blockLockout = 0;
  fighter.postBlockAttackLockout = 0;
  fighter.postM1BlockLockout = 0;
  fighter.postDashAttackLockout = 0;
  fighter.dashHitDelayedStopTimer = 0;
  fighter.dashWhiteFrameFlashTime = 0;
  fighter.postS4HeavyLockout = 0;
  fighter.shellPostureBoostTimer = 0;

  // Dash & Movement
  fighter.isDashing = false;
  fighter.dashProgress = 0;
  fighter.dashCooldown = 0;
  fighter.attackLockedAngle = undefined;

  // Style-specific & M2 timers
  fighter.comboStage = 0;
  fighter.comboResetTimer = 0;
  fighter.cqcM2Stage = null;
  fighter.cqcWindupTimer = 0;
  fighter.cqcAssaultTimer = 0;
  fighter.cqcAttackLockout = 0;
  fighter.capoeiraExhausted = false;
  fighter.capoeiraExhaustTimer = 0;
  fighter.capoeiraDodgeFlashTime = 0;
  fighter.capoeiraRegenTimer = 0;
  fighter.capoeiraWhiffBonusActive = false;
  fighter.capoeiraS3IFrameTimer = 0;
  fighter.spinOutTimer = 0;
  fighter.kyokushinSpinOutTimer = 0;
  fighter.disintegrationTimer = 0;
  fighter.shellLockoutTimer = 0;
  fighter.shellSpinTimer = 0;
  fighter.keysiAttackLockout = 0;
  fighter.ashiharaRecoveryTimer = 0;
  fighter.ashiharaParryLockout = 0;
  fighter.ashiharaM2Stage = 0;
  fighter.ashiharaM2Timer = 0;
  fighter.tkdSpinDashTimer = 0;
  fighter.tkdSpinDashActive = false;
  fighter.tkdCounterBaitIFrames = 0;
  fighter.tkdIFrameTimer = 0;
  fighter.tkdOffBalanceTimer = 0;
  fighter.damageFlashTime = 0;

  // Aikido & Super Armor reset
  fighter.aikiM2StanceTimer = 0;
  fighter.aikiM2SuperArmorHits = 0;
  fighter.aikiM2HitLanded = false;
  fighter.aikiCounterSlamWindow = 0;
  fighter.aikiSlamStage = null;
  fighter.aikiSlamTimer = 0;
  fighter.aikiSlamFrame = 0;
  fighter.aikiSlamTarget = null;
  fighter.aikiSlamUninterruptible = false;
  fighter.aikiLockoutTimer = 0;
  fighter.aikiSpinDownTimer = 0;
  fighter.aikiShakyVisionTimer = 0;
  fighter.aikiKoteGaeshiTrapTimer = 0;
  fighter.aikiTenkanOffBalanceTimer = 0;
  fighter.aikiShomenuchiChargeTimer = 0;
  fighter.aikiCentrifugalKnockbackTimer = 0;
  fighter.superArmorFlashTime = 0;
  fighter.superArmorPrevActive = false;

  if (!fighter.fists || !Array.isArray(fighter.fists) || fighter.fists.length < 2) {
    const r = (fighter.radius || 26) * 0.31;
    fighter.fists = [
      { id: 1, offsetX: 16, offsetY: -12, angle: 0, radius: r, isPunching: false, punchProgress: 0, punchType: 'left' },
      { id: 2, offsetX: 16, offsetY: 12, angle: 0, radius: r, isPunching: false, punchProgress: 0, punchType: 'right' }
    ];
  } else {
    fighter.fists[0].punchType = 'left';
    fighter.fists[1].punchType = 'right';
    fighter.fists.forEach(f => {
      f.isPunching = false;
      f.punchProgress = 0;
      f.hasHit = false;
      f.isHeavy = false;
    });
  }
}

export function canFighterRaiseGuard(fighter: Fighter): boolean {
  if (!fighter || fighter.isDead) return false;
  if (fighter.isDashing || (fighter.dashProgress && fighter.dashProgress > 0)) return false;
  if ((fighter.heavyWindup || 0) > 0) return false;
  if (fighter.fists.some(f => f.isPunching && f.isHeavy)) return false;
  // Section 2.8: Hard recovery frames of attacks prevent block-canceling
  if (fighter.fists.some(f => !f.isPunching && f.punchProgress > 0)) return false;
  // Section 2.8: Post-M1 Block Lockout (0.15s / 9 frames window) prevents immediate block after M1 finishes
  if ((fighter.postM1BlockLockout || 0) > 0) return false;
  if ((fighter.stunTime || 0) > 0) return false;
  if ((fighter.armorBreakTime || 0) > 0) return false;
  if ((fighter.spinOutTimer || 0) > 0 || (fighter.kyokushinSpinOutTimer || 0) > 0 || (fighter.shellLockoutTimer || 0) > 0 || (fighter.shellSpinTimer || 0) > 0) return false;
  if (fighter.aikiSlamStage || fighter.aikiSlamUninterruptible || (fighter.aikiLockoutTimer && fighter.aikiLockoutTimer > 0) || (fighter.aikiSpinDownTimer && fighter.aikiSpinDownTimer > 0)) return false;
  if ((fighter.blockLockout || 0) > 0) return false;
  if (fighter.styleId === 'capoeira' && fighter.capoeiraExhausted) return false;
  if ((fighter.keysiAttackLockout || 0) > 0) return false;

  return true;
}

/**
 * ⏱️ SECTION 1.18: DURATION SPEED (DS) MATRIX RETRACTION & 2.5x COMBO ACCELERATION
 * - Duration Speed (DS) mathematically dictates the natural decelerating retraction
 *   duration of a limb after reaching peak extension.
 * - Combo Acceleration Rule: Inputting next sequence strike while in active DS window
 *   accelerates the returning limb by 2.5x, clearing the centerline instantly.
 * - Active Retraction Exemptions: Flow Boxing S3 feint & Aikido S3 cross-trap flow.
 */
export function calculateAsymmetricalRetractionDelta(
  currentProgress: number,
  baseReturnSpeed: number,
  speedFactor: number,
  isComboAccelerated: boolean = false,
  isExempt: boolean = false,
  styleId?: string,
  stage: number = 0,
  isHeavy: boolean = false
): number {
  if (isHeavy) {
    // M2 attacks DO NOT follow Retraction Degradation (DS matrix cubic curve) and use their own retraction speeds
    let delta = baseReturnSpeed * speedFactor;
    if (isComboAccelerated) {
      delta *= COMBO_ACCELERATION_MULTIPLIER;
    }
    return Math.max(0.012, delta);
  }

  if (styleId) {
    return calculateDSRetractionDelta(currentProgress, styleId, stage, isComboAccelerated, isExempt) * speedFactor;
  }

  if (isExempt) {
    return Math.max(0.35, currentProgress * 0.50);
  }

  const progressRatio = Math.max(0, Math.min(1.0, currentProgress));
  const decelCurve = 0.70 + 0.60 * Math.pow(progressRatio, 1.5);
  const returnRate = (baseReturnSpeed && baseReturnSpeed > 0.02) ? baseReturnSpeed : (1.0 / 66);
  let delta = returnRate * decelCurve * speedFactor;

  if (isComboAccelerated) {
    delta *= COMBO_ACCELERATION_MULTIPLIER;
  }

  return Math.max(0.012, delta);
}
