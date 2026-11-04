// ============================================================================
// UNIVERSAL DEFENSE & PARRY ENGINE (src/combat/parry.ts)
// Section A & B: Modular Combat Engine & Plugin Architecture
// ============================================================================

export interface DefenseState {
  isBlocking: boolean;
  blockHeldDurationSec: number;
  lastBlockStartTime: number;
  blockRefreshCooldownSec: number;
  isParryWindowActive: boolean;
}

/**
 * Standard perfect parry window (0.19 seconds)
 */
export const STANDARD_PARRY_WINDOW_SEC = 0.19;

/**
 * Evaluates whether an incoming strike lands within the defender's active parry window
 */
export function evaluateParrySuccess(
  defense: DefenseState,
  currentTimeSec: number,
  customParryWindowSec: number = STANDARD_PARRY_WINDOW_SEC
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
