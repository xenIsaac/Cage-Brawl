import { CombatFighter } from './types';
import { getHeightModifiers } from '../utils/heightModifiers';

/**
 * Technical Specification: Stamina Engine, Height Scaling & Sprint Combat Mechanics
 * 
 * 1. Universal Stamina Engine & Height Scaling
 *    - Baseline 100 Stamina Pool.
 *    - Height Tier Stamina & Speed Matrix:
 *      - Micro Tier (3'8" - 4'5"): x0.90 movement speed, x1.25 fast stamina regen
 *      - Standard Tier (4'6" - 6'7"): x1.00 base speed, x1.00 base stamina regen
 *      - Giant Tier (6'8" - 7'6"): x1.10 movement speed, x0.75 slow stamina regen
 * 
 * 2. Sprint State & Attack Cancellation Rules
 *    - M1 during Sprint: Instantly cancels Sprint state. Drops velocity boost immediately.
 *    - M2 during Sprint: Disables Sprint state for the full duration of M2 animation sequence.
 * 
 * 3. Post-Sprint Disable & Sprint Striker Buffer
 *    - Standard Post-Sprint Disable: 0.18s (11 frames) M1 attack lockout upon exiting sprint.
 *    - Sprint Striker Buffer: Landing any hit grants a 1.5s (90 frames) buffer window.
 *      Exiting sprint during this window completely bypasses the 0.18s lockout.
 *      Refreshes on any hit, and is immediately consumed/cleared when landing an M1 S4 Finisher.
 */

export interface SprintUpdateResult {
  isSprinting: boolean;
  speedMultiplier: number;
  postSprintDisable: number;
}

/**
 * Initializes default stamina and sprint values on a fighter.
 */
export function initFighterStamina(fighter: CombatFighter) {
  if (fighter.stamina === undefined) fighter.stamina = 100;
  if (fighter.maxStamina === undefined) fighter.maxStamina = 100;
  if (fighter.isSprinting === undefined) fighter.isSprinting = false;
  if (fighter.postSprintDisable === undefined) fighter.postSprintDisable = 0;
  if (fighter.sprintStrikerBuffer === undefined) fighter.sprintStrikerBuffer = 0;
  if (fighter.wasSprinting === undefined) fighter.wasSprinting = false;
  if (fighter.sprintM2Lockout === undefined) fighter.sprintM2Lockout = 0;
  if (fighter.staminaRegenDelay === undefined) fighter.staminaRegenDelay = 0;
}

/**
 * Ticks stamina regeneration and timer decay each frame.
 */
export function updateFighterStaminaAndTimers(
  fighter: CombatFighter,
  hasMoveInput: boolean,
  isSprintInputHeld: boolean,
  infiniteStamina: boolean = false
): SprintUpdateResult {
  initFighterStamina(fighter);

  const heightMods = getHeightModifiers(fighter.baseHeight);

  // 1. Decay Timers
  if (fighter.postSprintDisable && fighter.postSprintDisable > 0) {
    fighter.postSprintDisable--;
  }
  if (fighter.sprintStrikerBuffer && fighter.sprintStrikerBuffer > 0) {
    fighter.sprintStrikerBuffer--;
  }
  if (fighter.sprintM2Lockout && fighter.sprintM2Lockout > 0) {
    fighter.sprintM2Lockout--;
  }
  if (fighter.staminaRegenDelay && fighter.staminaRegenDelay > 0) {
    fighter.staminaRegenDelay--;
  }
  if (fighter.lastSprintDelayTextTimer && fighter.lastSprintDelayTextTimer > 0) {
    fighter.lastSprintDelayTextTimer--;
  }
  if (fighter.lastBlockDelayTextTimer && fighter.lastBlockDelayTextTimer > 0) {
    fighter.lastBlockDelayTextTimer--;
  }
  if (fighter.flowSprintAbilityLockout && fighter.flowSprintAbilityLockout > 0) {
    fighter.flowSprintAbilityLockout--;
  }
  if (fighter.flowStrikerBuffTimer && fighter.flowStrikerBuffTimer > 0) {
    fighter.flowStrikerBuffTimer--;
  }

  // 2. Determine if fighter can sprint
  const isHeavyPunching = fighter.fists.some(f => f.isPunching && f.isHeavy);
  const isExecutingM2 = (fighter.heavyWindup || 0) > 0 || isHeavyPunching || (fighter.sprintM2Lockout || 0) > 0;
  const isStunnedOrDisabled =
    (fighter.stunTime || 0) > 0 ||
    (fighter.parriedStun || 0) > 0 ||
    (fighter.armorBreakTime || 0) > 0 ||
    fighter.isBlocking ||
    fighter.capoeiraExhausted;

  const canSprint =
    hasMoveInput &&
    isSprintInputHeld &&
    !isExecutingM2 &&
    !isStunnedOrDisabled &&
    (infiniteStamina || (fighter.stamina || 0) > 5);

  const wasSprinting = !!fighter.wasSprinting;
  let currentlySprinting = canSprint;

  // Track continuous sprint frames & reset depletion flag on sprint exit
  if (currentlySprinting) {
    fighter.continuousSprintFrames = (fighter.continuousSprintFrames || 0) + 1;
  } else {
    fighter.continuousSprintFrames = 0;
    fighter.flowSprintDepletedInRun = false;
  }

  // 3. Handle Sprint Exit Detection
  if (wasSprinting && !currentlySprinting) {
    // Exiting sprint!
    if (fighter.sprintStrikerBuffer && fighter.sprintStrikerBuffer > 0) {
      // Sprint Striker Active (1.5s Hit-Buff Exception): Bypasses 0.18s lockout!
      fighter.postSprintDisable = 0;
    } else {
      // Standard Post-Sprint Disable: 0.18s (11 frames @ 60fps) M1 lockout
      fighter.postSprintDisable = 11;
    }
  }

  fighter.isSprinting = currentlySprinting;
  fighter.wasSprinting = currentlySprinting;

  // 4. Update Stamina Consumption and Regeneration
  if (infiniteStamina) {
    fighter.stamina = 100;
    fighter.staminaRegenDelay = 0;
  } else if (currentlySprinting || (isSprintInputHeld && hasMoveInput)) {
    if (currentlySprinting) {
      // Sprinting consumes stamina (approx 13 stamina / second = 0.22 / frame)
      fighter.stamina = Math.max(0, (fighter.stamina || 0) - 0.22);
    }
    // Running refreshes the 2.0s (120 frames @ 60fps) stamina regen delay!
    fighter.staminaRegenDelay = 120;

    if (fighter.stamina <= 0) {
      currentlySprinting = false;
      fighter.isSprinting = false;
      // Stamina depleted sprint exit
      if (fighter.sprintStrikerBuffer && fighter.sprintStrikerBuffer > 0) {
        fighter.postSprintDisable = 0;
      } else {
        fighter.postSprintDisable = 11;
      }
    }
  } else {
    // Regenerate stamina when not sprinting and not heavily executing, AND 2s delay has expired
    if (!isExecutingM2 && (!fighter.stunTime || fighter.stunTime <= 0)) {
      if (fighter.staminaRegenDelay && fighter.staminaRegenDelay > 0) {
        // Delay active: Waiting 2 seconds after running before regeneration begins
      } else {
        const baseRegenPerFrame = 0.22; // ~13.2 stamina / second
        const actualRegen = baseRegenPerFrame * heightMods.staminaRegenRate;
        fighter.stamina = Math.min(fighter.maxStamina || 100, (fighter.stamina || 0) + actualRegen);
      }
    }
  }

  // 5. Calculate Movement Velocity Speed Multiplier
  let speedMultiplier = heightMods.moveSpeedModifier; // Height Tier Speed Modifier (Micro: 0.90, Standard: 1.00, Giant: 1.10)
  if (currentlySprinting) {
    speedMultiplier *= 1.35; // +35% Sprint Speed Boost
  }

  return {
    isSprinting: currentlySprinting,
    speedMultiplier,
    postSprintDisable: fighter.postSprintDisable || 0,
  };
}

/**
 * Handles M1 Light Attack input while sprinting.
 * - Instantly cancels Sprint state.
 * - Drops sprint velocity boost immediately.
 * - If Sprint Striker Buffer is active (1.5s hit-buff), M1 is instantly usable.
 * - Otherwise, applies standard 0.18s M1 lockout.
 */
export function handleSprintM1Cancel(fighter: CombatFighter): boolean {
  initFighterStamina(fighter);

  if (fighter.isSprinting || fighter.wasSprinting) {
    // Instantly cancel Sprint state
    fighter.isSprinting = false;
    fighter.wasSprinting = false;

    if (fighter.sprintStrikerBuffer && fighter.sprintStrikerBuffer > 0) {
      // Sprint Striker Active: Bypass lockout, M1 usable immediately!
      fighter.postSprintDisable = 0;
      return true;
    } else {
      // Standard Post-Sprint Exit: Apply 0.18s (11 frames) M1 lockout
      fighter.postSprintDisable = 11;
      return false; // Cannot trigger M1 immediately due to 0.18s lockout
    }
  }

  // Not sprinting: Check if post-sprint lockout is active
  if (fighter.postSprintDisable && fighter.postSprintDisable > 0) {
    return false; // M1 disabled during 0.18s lockout
  }

  return true;
}

/**
 * Handles M2 Heavy Attack input during Sprint.
 * - Pressing M2 disables Sprint state for the entire duration of the M2 animation sequence.
 * - Sprinting cannot be re-initiated until windup, execution, and recovery complete.
 */
export function handleSprintM2Cancel(fighter: CombatFighter, m2TotalFrames: number = 36) {
  initFighterStamina(fighter);

  fighter.isSprinting = false;
  fighter.wasSprinting = false;
  // Lock out sprint for the duration of the M2 attack
  fighter.sprintM2Lockout = Math.max(fighter.sprintM2Lockout || 0, m2TotalFrames);
}

/**
 * Call when an attack hit lands on an opponent.
 * - Activates or refreshes the 1.5s (90 frames) Sprint Striker Buffer on any hit.
 * - If landing an M1 S4 Finisher, immediately consumes and clears the Sprint Striker Buffer.
 */
export function onLandedHitStaminaUpdate(attacker: CombatFighter, isS4Finisher: boolean = false) {
  initFighterStamina(attacker);

  if (isS4Finisher) {
    // Activating and landing an M1 S4 Finisher immediately consumes and clears the Sprint Striker Buffer
    attacker.sprintStrikerBuffer = 0;
  } else {
    // Landing any hit on an opponent activates / refreshes the 1.5s (90 frames @ 60fps) Sprint Striker Buffer
    attacker.sprintStrikerBuffer = 90;
  }
}
