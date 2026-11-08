// ============================================================================
// UNIVERSAL DEFENSE & PARRY ENGINE (src/combat/parry.ts)
// Section A & B: Modular Combat Engine & Plugin Architecture
// ============================================================================

import { PERFECT_PARRY_WINDOW_SEC, PERFECT_PARRY_FRAMES } from './rules';
import { getStyleModule } from './styles';
import { CombatFighter } from './types';
import { isStreetBoxingFlurryUnparryable } from './combat.fixes';

export interface DefenseState {
  isBlocking: boolean;
  blockHeldDurationSec: number;
  lastBlockStartTime: number;
  blockRefreshCooldownSec: number;
  isParryWindowActive: boolean;
}

/**
 * Standard perfect parry window (0.19 seconds) re-exported from rules.ts
 */
export const STANDARD_PARRY_WINDOW_SEC = PERFECT_PARRY_WINDOW_SEC;

/**
 * Evaluates whether an incoming strike lands within the defender's active parry window
 */
export function evaluateParrySuccess(
  defense: DefenseState,
  currentTimeSec: number,
  customParryWindowSec: number = PERFECT_PARRY_WINDOW_SEC
): boolean {
  if (!defense.isBlocking) return false;
  const elapsed = currentTimeSec - defense.lastBlockStartTime;
  return elapsed >= 0 && elapsed <= customParryWindowSec;
}

/**
 * Calculates posture reduction upon successful parry
 */
export function calculateParryPostureRefund(basePosture: number, refundPercent: number = 0.20): number {
  return basePosture * refundPercent;
}

/**
 * Retrieves the style-specific parry window bonus in seconds (e.g. Muay Thai Iron Guard: +0.20s)
 */
export function getStyleParryBonusSec(styleId?: string): number {
  if (!styleId) return 0;
  const mod = getStyleModule(styleId);
  return mod?.block?.parryWindowBonusSec ?? 0;
}

/**
 * Retrieves the style-specific parry window bonus in frames at 60fps (e.g. Muay Thai Iron Guard: +12 frames)
 */
export function getStyleParryBonusFrames(styleId?: string): number {
  if (!styleId) return 0;
  const mod = getStyleModule(styleId);
  if (mod?.block?.parryWindowBonusFrames !== undefined) {
    return mod.block.parryWindowBonusFrames;
  }
  return Math.round(getStyleParryBonusSec(styleId) * 60);
}

/**
 * Retrieves total parry window duration in seconds for a given defender style
 */
export function getStyleParryWindowSec(styleId?: string): number {
  return PERFECT_PARRY_WINDOW_SEC + getStyleParryBonusSec(styleId);
}

/**
 * Retrieves total parry window duration in frames for a given defender style (11 base, 23 Muay Thai)
 */
export function getStyleParryWindowFrames(styleId?: string): number {
  return PERFECT_PARRY_FRAMES + getStyleParryBonusFrames(styleId);
}

export interface ParryEvalOptions {
  isFrames?: boolean;
  comboStage?: number;
  cqcWasBlockingAtHit4?: boolean;
}

/**
 * Checks whether a defender is eligible to perform a parry against an attacker
 */
export function canFighterParry(
  defender: any,
  attacker?: any | null,
  options: ParryEvalOptions = {}
): boolean {
  if (!defender) return false;
  if ((defender.parryLockoutTimer || 0) > 0) return false;
  if ((defender.keysiVulnerableTimer || 0) > 0) return false;
  if ((defender.armorBreakTime || 0) > 0) return false;
  if (options.cqcWasBlockingAtHit4 || defender.cqcWasBlockingAtHit4) return false;

  if (attacker) {
    const isCqcM2Unparriable = attacker.styleId === 'cqc' && attacker.cqcM2Stage === 'assault';
    if (isCqcM2Unparriable) return false;

    const comboStage = options.comboStage ?? 0;
    if (attacker.styleId === 'basic' && comboStage === 3 && attacker.flowS3ParryBaited) return false;

    const isHeavy = attacker.fists?.some((f: any) => f.isPunching && f.isHeavy) ?? false;
    if (isStreetBoxingFlurryUnparryable(attacker, isHeavy)) return false;
  }

  return true;
}

/**
 * Unified Single Source of Truth Parry Evaluation
 * Combines base window from rules.ts + defender style bonus (Muay Thai Iron Guard) + parry eligibility.
 */
export function evaluateParry(
  defender: any,
  attacker: any,
  isBlocked: boolean,
  blockTime: number,
  options: ParryEvalOptions = {}
): boolean {
  if (!isBlocked || !defender.isBlocking) return false;
  if ((defender.armorBreakTime || 0) > 0) return false;
  if (!canFighterParry(defender, attacker, options)) return false;

  if (options.isFrames) {
    const maxFrames = getStyleParryWindowFrames(defender.styleId);
    return blockTime >= 0 && blockTime <= maxFrames;
  } else {
    const maxSec = getStyleParryWindowSec(defender.styleId);
    return blockTime >= 0.0 && blockTime <= maxSec;
  }
}
