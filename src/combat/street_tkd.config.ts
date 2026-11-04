/**
 * 🥋 STREET TAEKWONDO: ATTACK SPEED, STARTUP TIMING & DURATION SPEED SPECIFICATION
 * 60 FPS Fixed-Step Engine Standard: 1 Frame ≈ 16.66ms
 */

// --- STREET TKD: HEAVY ATTACK SPEED & S1->S2 TRANSITION SLOWDOWN ---
// Greatly increases the recovery gap between S1 and S2 to kill the rapid mash.

export const STREET_TKD_M1_SPEED = {
  // Enforced cooldown gap before the next kick is physically allowed to trigger
  interComboDelays: {
    s1_to_s2: 36, // ~0.60s (Heavy delay: Forces S1 to fully retract & chamber before S2)
    s2_to_s3: 30, // ~0.50s (Clear pause before starting S3 spin)
    s3_to_s4: 32  // ~0.53s (Clear pause before launching S4 side kick)
  },

  // Startup windups before damaging hitbox activates
  startupTicks: {
    s1: 12, // ~0.20s (Deliberate opening windup)
    s2: 10, // ~0.16s (Readable second kick)
    s3: 20, // ~0.33s (Deliberate 400° spin windup)
    s4: 16  // ~0.26s (Coiled torque before side snap)
  },

  postureCdFrames: 90 // ~1.50s Posture recovery
};

export const STREET_TKD_TIMINGS = {
  executionTravelMs: 100, // 1.05x against 105ms baseline
  
  // Startup Windup Delays (Frames to active hitbox)
  windup: {
    s1: STREET_TKD_M1_SPEED.startupTicks.s1,   // 12f (~0.20s deliberate opening windup)
    s2: STREET_TKD_M1_SPEED.startupTicks.s2,   // 10f (~0.16s readable second kick)
    s3: STREET_TKD_M1_SPEED.startupTicks.s3,   // 20f (~0.33s deliberate 400° spin windup)
    s4: STREET_TKD_M1_SPEED.startupTicks.s4,   // 16f (~0.26s coiled torque before side snap)
    m2_total: 21 // ~0.35s (9f Phase 1 rear load + 12f Phase 2 feint arc & pull-back)
  },

  // Inter-Combo Delays (Attack Speed cadence)
  interComboDelay: {
    s1_to_s2: STREET_TKD_M1_SPEED.interComboDelays.s1_to_s2, // 36f (~0.60s)
    s2_to_s3: STREET_TKD_M1_SPEED.interComboDelays.s2_to_s3, // 30f (~0.50s)
    s3_to_s4: STREET_TKD_M1_SPEED.interComboDelays.s3_to_s4  // 32f (~0.53s)
  },

  // Retraction Duration Speed (DS)
  ds: {
    s1: 0.20,
    s2: 0.20,
    s3: 0.10,
    s4: 0.70,
    m2: 0.50
  },

  postureCdFrames: STREET_TKD_M1_SPEED.postureCdFrames // 90f (~1.50s)
};
