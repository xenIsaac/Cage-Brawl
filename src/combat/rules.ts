/**
 * src/combat/rules.ts
 * Single Source of Truth for Universal Combat Rules & Parameters
 * Phase 5 Activated: Target Patch-Note Rules live in active gameplay.
 */

// ============================================================================
// PHASE 5 ACTIVATED UNIVERSAL COMBAT RULES
// ============================================================================

/** Universal Base Steering Turn Rate (radians per frame at 60fps) */
export const BASE_STEERING_TURN_RATE = 0.18; // ~10.3 deg/frame

/** Phase 5 Target: Universal Hit-Stun M1 Duration (0.40s = 24 frames at 60fps) */
export const HITSTUN_DURATION_SEC = 0.40;
export const HITSTUN_FRAMES = 24; // 0.40s at 60fps

/** Phase 5 Target: M2 Hit-Stun & Block Hit-Stun (0.30s = 18 frames at 60fps) */
export const HITSTUN_M2_SEC = 0.30;
export const HITSTUN_BLOCK_SEC = 0.30;

/** Universal Attack Lockout on Hit (0.40s = 24 frames at 60fps) */
export const HIT_ATTACK_LOCKOUT_FRAMES = 24;

/** Hit-Stun Steering Lockout duration (0.40s = 24 frames) */
export const STEERING_LOCKOUT_FRAMES = 24;

/** Hit-Stun Directional Movement Lockout duration (0.40s = 24 frames) */
export const HIT_MOVEMENT_LOCKOUT_FRAMES = 24;

/** Block Cooldown duration after releasing or exiting Guard (0.1s = 6 frames) */
export const BLOCK_COOLDOWN_FRAMES = 6;

/** Phase 5 Target: Strict Perfect Parry Base Window in seconds (0.12s = 120ms) */
export const PERFECT_PARRY_WINDOW_SEC = 0.12;

/** Phase 5 Target: Strict Perfect Parry Base Window in frames at 60fps (7 frames = ~0.116s) */
export const PERFECT_PARRY_FRAMES = 7;

/** Section 2.8: Post-M1 Block Lockout duration (0.15s = 9 frames at 60fps) */
export const POST_M1_BLOCK_LOCKOUT_FRAMES = 9;

/** Section 2.8: Post-Block Attack Re-Initiation Delay (0.10s = 6 frames at 60fps) */
export const POST_BLOCK_ATTACK_DELAY_FRAMES = 6;

/** Section 2.8: Post-Dash Attack Lockout duration (0.30s = 18 frames at 60fps) */
export const POST_DASH_ATTACK_LOCKOUT_FRAMES = 18;

/** Section 2.8: Dash Hit Delayed Momentum Stop duration (0.10s = 6 frames at 60fps) */
export const DASH_DELAYED_STOP_FRAMES = 6;

/** Phase 5 Target: Movement slow on hit (60% slow for 0.20s) */
export const MOVEMENT_SLOW_ON_HIT_PCT = 0.60;
export const MOVEMENT_SLOW_ON_HIT_DURATION_SEC = 0.20;

/** Phase 5 Target: Post-parry attacker lockout (0.12s = 7 frames) & defender recovery (0.10s = 6 frames) */
export const POST_PARRY_ATTACKER_LOCKOUT_SEC = 0.12;
export const POST_PARRY_DEFENDER_M1_LOCKOUT_SEC = 0.10;

/** Phase 5 Target: Guard raise startup times */
export const GUARD_RAISE_STARTUP_BASE_SEC = 0.03;
export const GUARD_RAISE_STARTUP_SPAM_SEC = 0.09;

/** Universal Base Movement Speed (pixels per frame at 60fps) */
export const BASE_MOVEMENT_SPEED = 2.3;

/** Base Directional Movement Acceleration Force */
export const BASE_MOVEMENT_FORCE = 0.32;

/** Default Combo Reset Timer in frames (2.0s = 120 frames at 60 FPS) */
export const BASE_COMBO_RESET_FRAMES = 120;

export const TARGET_RULES = {
  PERFECT_PARRY_WINDOW_SEC: 0.12,
  HITSTUN_M1_SEC: 0.40,
  HITSTUN_M2_SEC: 0.30,
  HITSTUN_BLOCK_SEC: 0.30,
  MOVEMENT_SLOW_ON_HIT_PCT: 0.60,
  MOVEMENT_SLOW_ON_HIT_DURATION_SEC: 0.20,
  M1_IMPACT_DELAY_SEC: 0.08,
  POST_PARRY_DEFENDER_M1_LOCKOUT_SEC: 0.10,
  POST_PARRY_ATTACKER_LOCKOUT_SEC: 0.12,
  BLOCK_SPAM_MAX_DURATION_SEC: 0.30,
  BLOCK_SPAM_LOCKOUT_SEC: 0.20,
  GUARD_RAISE_STARTUP_BASE_SEC: 0.03,
  GUARD_RAISE_STARTUP_SPAM_SEC: 0.09,
} as const;

