import { Fighter } from '../../types';

/**
 * Universal Posture System Constants & Engine
 * Posture represents physical balance, breathing, and stance realignment after an M1 sequence or S4 finisher.
 */

// Posture Reduction Hard Cap: Posture Reduction will NEVER reach 100% (or 99.6%), max reduction is 99.5% (0.995).
export const MAX_POSTURE_REDUCTION = 0.995;

/**
 * Master Posture Cooldown Map (in frames @ 60 FPS)
 */
export const STYLE_BASE_POSTURE_CD: Record<string, number> = {
  basic: 78,             // 1.30s
  street_boxing: 84,     // 1.40s
  muay_thai: 78,         // 1.30s
  slugger: 100,          // 1.67s
  shotokan: 72,          // 1.20s
  ashihara: 84,          // 1.40s
  capoeira: 72,          // 1.20s
  kickboxing: 84,        // 1.40s
  kyokushin: 90,         // 1.50s
  street_taekwondo: 86,  // 1.43s
  keysi: 80,             // 1.33s
  cqc: 78,               // 1.30s
  boxing_shell: 72,      // 1.20s
  aikido: 78,            // 1.30s
};

/**
 * Returns the Base Posture Cooldown in frames for a fighting style upon executing the S4 Finisher.
 */
export function getStylePostureCooldown(styleId: string): number {
  return STYLE_BASE_POSTURE_CD[styleId] ?? 78;
}

/**
 * Calculates Net Posture CD taking into account speed modifiers and dynamic posture reduction passives.
 * Posture Reduction is capped at 99.5% maximum reduction.
 * Formula: Net Posture CD = Base Posture CD * (1.0 - Min(0.995, Posture Reduction)) / (Speed Factor * Momentum Mult)
 */
export function calculateNetPostureCd(
  basePostureCd: number,
  speedFactor: number = 1.0,
  momentumMult: number = 1.0,
  postureReductionModifier: number = 0.0
): number {
  // Cap posture reduction to a hard maximum of 99.5% (0.995)
  const clampedReduction = Math.min(MAX_POSTURE_REDUCTION, Math.max(0, postureReductionModifier || 0));
  const reductionMult = 1.0 - clampedReduction;
  const effectiveSpeed = Math.max(0.2, (speedFactor || 1.0) * (momentumMult || 1.0));
  return Math.max(1, Math.round((basePostureCd * reductionMult) / effectiveSpeed));
}

/**
 * Grants a pending posture reduction buff to a fighter.
 * Stored reduction is consumable and will be applied on the NEXT posture trigger (e.g. S4 finisher or stance reset).
 * By default, posture reductions do NOT stack unless the fighter has a unique passive (canStackPostureReductions = true).
 */
export function grantFighterPostureReduction(
  fighter: Fighter,
  amount: number,
  allowStacking: boolean = false
): number {
  const canStack = fighter.canStackPostureReductions || allowStacking;
  if (canStack) {
    fighter.pendingPostureReduction = Math.min(
      MAX_POSTURE_REDUCTION,
      (fighter.pendingPostureReduction || 0) + amount
    );
  } else {
    fighter.pendingPostureReduction = Math.min(
      MAX_POSTURE_REDUCTION,
      Math.max(fighter.pendingPostureReduction || 0, amount)
    );
  }
  return fighter.pendingPostureReduction;
}

/**
 * Applies the formal Posture Cooldown to a fighter and CONSUMES the stored posture reduction.
 * Once activated, any pending/previous posture reduction is consumed and reset to 0.
 */
export function applyFighterPostureCooldown(
  fighter: Fighter,
  speedFactor: number = 1.0,
  momentumMult: number = 1.0
): number {
  if (fighter.styleId === 'boxing_shell' && fighter.shellParryResetPending) {
    fighter.shellParryResetPending = false;
    fighter.pendingPostureReduction = 0.45; // 45% Deflective Posture Reset reduction
  }
  if (fighter.styleId === 'street_boxing' && fighter.postureOverdriveActive) {
    fighter.postureOverdriveActive = false;
    fighter.postureCd = 6; // 0.1s Posture Blitz (6 frames @ 60fps)
    fighter.maxPostureCd = 6;
    fighter.lightCooldown = 6;
    fighter.isPostureLocked = true;
    fighter.pendingPostureReduction = 0;
    fighter.postureReductionModifier = 0;
    return 6;
  }

  const baseCd = getStylePostureCooldown(fighter.styleId);
  // Retrieve consumable stored posture reduction
  const reduction = fighter.pendingPostureReduction ?? fighter.postureReductionModifier ?? 0;
  
  const netCd = calculateNetPostureCd(baseCd, speedFactor, momentumMult, reduction);
  
  fighter.postureCd = netCd;
  fighter.maxPostureCd = netCd;
  fighter.lightCooldown = netCd;
  fighter.isPostureLocked = true;
  
  // CONSUMPTION RULE: The posture reduction is consumed on activation!
  fighter.pendingPostureReduction = 0;
  fighter.postureReductionModifier = 0;
  fighter.sluggerM1WhiffDragCount = 0;
  fighter.sluggerWhiffedStages = [];
  
  return netCd;
}

/**
 * Updates the fighter's posture state frame-by-frame.
 */
export function updateFighterPostureFrame(fighter: Fighter): void {
  if (fighter.postureCd && fighter.postureCd > 0) {
    // 2x Posture Recovery Speed when Iron Boxing M2 Shoulder Roll Spin Posture Boost is active
    const decrement = (fighter.shellPostureBoostTimer && fighter.shellPostureBoostTimer > 0) ? 2 : 1;
    fighter.postureCd = Math.max(0, fighter.postureCd - decrement);
    fighter.isPostureLocked = fighter.postureCd > 0;
  } else {
    fighter.isPostureLocked = false;
  }
}
