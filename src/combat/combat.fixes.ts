/**
 * 🔧 SECTION 1.18 - MODULE 3: combat.fixes.ts (Style Bug Resolutions)
 *
 * Governs specific move state machines, bug resolutions, and input override hooks.
 *
 * 🥊 Fix 1: Iron Boxing S4 Chain Lag Elimination
 *   - The Problem: The engine waited for S3's old universal timer to decay before allowing S4 to initiate,
 *     causing an awkward 1-second freeze.
 *   - The Fix: S3 and S4 are bound to iron_boxing.s3: 0.30s in ds.config.ts.
 *   - State Hook: Inputting M1 for S4 during S3's 0.30s DS window instantly aborts S3 recovery on Frame 1.
 *     S3 pulls back at accelerated speed while S4 launches without delay.
 *
 * 🥊 Fix 2: Street Boxing M2 Flurry Auto-Burst State Machine
 *   - The Problem: M2 flurry dropped inputs between Hit 1, Hit 2, and Hit 3 if physics checks or targets
 *     desynced mid-combo.
 *   - The Fix: M2 is converted into an Uninterruptible Auto-Burst Execution Queue:
 *     1. Hit 1 (Right Jab) launches.
 *     2. On Frame 1 of Hit 1 connecting with an opponent hurtbox: Hits 2 and 3 are automatically locked into the queue.
 *     3. Hit 2 (Right Jab) and Hit 3 (Left Hook) fire in high-speed automatic succession.
 *     4. Opponent Parry input is disabled for Hits 2 and 3 per the Unparryable Flurry passive.
 *
 * ⚡ Fix 3: Global M2 Retraction Override
 *   - The Rule: Initiating an M2 Heavy Strike at any point immediately cancels any active M1 retraction or DS timer.
 *   - The recovering arm is instantly cleared to neutral, and the M2 windup initiates on Frame 1.
 */

import { Fighter } from '../types';

/**
 * 🥊 FIX 1: Iron Boxing S4 Chain Lag Elimination Hook
 * Called when an Iron Boxing fighter inputs M1 while transitioning into S4 (Stage 3).
 * Instantly aborts any active S3 (left arm) retraction or hold on Frame 1 and snaps it back,
 * ensuring S4 launches with zero input delay or freeze.
 */
export function executeIronBoxingS4InstantChain(fighter: Fighter): boolean {
  if (fighter.styleId !== 'boxing_shell' && fighter.styleId !== 'iron_boxing') {
    return false;
  }

  // Find non-lead arm (Left fist) which executes S3 and S4
  const leftFist = fighter.fists.find(f => f.punchType === 'left');
  if (leftFist) {
    // If left fist was lingering or retracting from S3, instantly abort S3 recovery on Frame 1
    leftFist.isPunching = false;
    leftFist.punchProgress = 0;
    leftFist.isLingerActive = false;
    leftFist.lingerTimer = 0;
    leftFist.punchTimeSec = 0;
    leftFist.hasHit = false;
  }

  // Clear any legacy shell timers
  (fighter as any).shellRetractionHoldTimer = 0;
  (fighter as any).shellS3Primed = false;
  (fighter as any).shellS4ReturnTimer = 0;

  return true;
}

/**
 * 🥊 FIX 2: Street Boxing M2 Flurry Auto-Burst State Machine
 * On Frame 1 of Hit 1 connecting with an opponent hurtbox:
 * Hits 2 and 3 are automatically locked into the uninterruptible execution queue.
 */
export function lockStreetBoxingAutoBurstQueue(attacker: Fighter, defender: Fighter): void {
  if (attacker.styleId !== 'street_boxing') return;

  // 1. Lock Hits 2 and 3 into the queue
  attacker.streetBoxingM2Queue = [2, 3];
  attacker.streetBoxingAutoBurstActive = true;
  attacker.streetBoxingM2Stage = 1;
  attacker.streetBoxingM2Hits = 1;
  attacker.streetBoxingUnbreakable = true;
  
  // Note: streetBoxingM2NextTimer will be activated upon punch retraction completion so each flurry strike fully extends and retracts.

  // 2. Disable Opponent Parry input for Hits 2 and 3 per the Unparryable Flurry passive
  // Ensure defender cannot parry during the auto-burst flurry
  defender.parryLockoutTimer = Math.max(defender.parryLockoutTimer || 0, 48);
  defender.blockLockout = Math.max(defender.blockLockout || 0, 24);
  defender.isBlocking = false;
}

/**
 * Advances the Street Boxing Auto-Burst Queue on frame tick.
 * Returns true if a burst strike was launched.
 */
export function tickStreetBoxingAutoBurst(fighter: Fighter): boolean {
  if (fighter.styleId !== 'street_boxing') return false;
  if (!fighter.streetBoxingAutoBurstActive && (!fighter.streetBoxingM2Queue || fighter.streetBoxingM2Queue.length === 0)) {
    return false;
  }

  if (fighter.streetBoxingM2NextTimer && fighter.streetBoxingM2NextTimer > 0) {
    fighter.streetBoxingM2NextTimer--;
    if (fighter.streetBoxingM2NextTimer === 0) {
      if (fighter.streetBoxingM2Queue && fighter.streetBoxingM2Queue.length > 0) {
        const nextStage = fighter.streetBoxingM2Queue.shift()!;
        fighter.streetBoxingM2Stage = nextStage;
        const punchType = nextStage === 3 ? 'left' : 'right';

        // Clear limbs for clean Frame 1 execution
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
          fighter.isDashing = false;
          fighter.dashProgress = 0;
          fighter.strikeCooldown = 0;
          return true;
        }
      } else {
        // Auto-burst completed
        fighter.streetBoxingAutoBurstActive = false;
      }
    }
  }

  return false;
}

/**
 * Checks if incoming strike is an unparryable Street Boxing M2 Flurry strike (Hits 2 and 3).
 */
export function isStreetBoxingFlurryUnparryable(attacker: Fighter, isHeavy: boolean): boolean {
  if (attacker.styleId !== 'street_boxing') return false;
  if (!isHeavy) return false;
  
  // Hit 2 and Hit 3 are strictly unparryable per Section 1.18 spec
  const stage = attacker.streetBoxingM2Stage || 0;
  return stage >= 2 || !!attacker.streetBoxingAutoBurstActive || !!attacker.streetBoxingUnbreakable;
}

/**
 * ⚡ FIX 3: Global M2 Retraction Override Hook
 * Initiating an M2 Heavy Strike at any point immediately cancels any active M1 retraction or DS timer.
 * The recovering arm is instantly cleared to neutral, and the M2 windup initiates on Frame 1.
 */
export function applyGlobalM2RetractionOverride(fighter: Fighter): void {
  // Immediately clear and reset any active M1 retraction, extension, or chamber linger
  fighter.fists.forEach(f => {
    if (!f.isHeavy) {
      f.isPunching = false;
      f.punchProgress = 0;
      f.isLingerActive = false;
      f.lingerTimer = 0;
      f.punchTimeSec = 0;
    }
  });

  // Cancel any lingering DS or combo reset timers that would gate M2
  (fighter as any).shellRetractionHoldTimer = 0;
  fighter.lightCooldown = 0;
}

/**
 * Validates whether fighter is allowed to initiate M2 despite active M1 retraction.
 * Always returns true for retraction phase because M2 ignores and overrides M1 retraction.
 */
export function canM2OverrideM1Retraction(fighter: Fighter): boolean {
  // Can override any M1 retraction unless fighter is stunned or in hard heavyCooldown
  if ((fighter.stunTime || 0) > 0) return false;
  if ((fighter.heavyCooldown || 0) > 0) return false;
  if ((fighter.keysiVulnerableTimer || 0) > 0) return false;
  if (fighter.styleId === 'capoeira' && (fighter as any).capoeiraExhausted) return false;
  return true;
}
