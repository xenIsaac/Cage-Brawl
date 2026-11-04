// ============================================================================
// STREET TAEKWONDO: OFFICIAL TIMINGS & S3 REVISED CONFIGURATION
// Calibrated to 60 FPS Fixed-Step Engine Standard (1 Frame ≈ 16.66ms)
// ============================================================================

export const STREET_TKD_TIMINGS = {
  executionTravelMs: 100, // 1.05x against 105ms baseline

  // Startup Windup Delays (Frames to active hitbox)
  windup: {
    s1: 6,   // ~0.10s
    s2: 4,   // ~0.06s (Double-tap)
    s3: 10,  // ~0.16s (Spinning torque)
    s4: 8,   // ~0.13s
    m2_total: 21 // ~0.35s (9f Phase 1 rear load + 12f Phase 2 feint arc & pull-back)
  },

  // Inter-Combo Delays (Attack Speed cadence)
  interComboDelay: {
    s1_to_s2: 14, // ~0.23s
    s2_to_s3: 12, // ~0.20s
    s3_to_s4: 16  // ~0.26s
  },

  // Retraction Duration Speed (DS)
  ds: {
    s1: 0.20,
    s2: 0.20,
    s3: 0.10,
    s4: 0.70,
    m2: 0.50
  },

  postureCdFrames: 78 // ~1.30s
};

export const STREET_TKD_S3_REVISED = {
  s2: {
    windupFrames: 4,
    ds: 0.20,
    // S2 On-Hit Debuff
    victimAttackDelayMultiplier: 1.40, // +40% longer delay before opponent can counter
    purgeOnS3Hit: true
  },
  s3: {
    // Slowed 360° Rotation Windup
    totalRotationFrames: 20, // ~0.33s
    legSpawnFrame: 9,        // Appears straight at 180° mark
    impactFrame: 15,         // Connects around 270° mark
    slantSnapFrame: 19,      // Smoothly snaps into 45° slant at 360° mark
    ds: 0.10,                // Ultra-fast snap into S4 finisher
    damage: 6.0
  }
};
