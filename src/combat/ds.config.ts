/**
 * ⏱️ SECTION 1.18 - MODULE 2: ds.config.ts (Duration Speed Matrix)
 *
 * Governs strictly Duration Speed (DS) per sequence and limb return deceleration curves.
 * Contains ZERO stat or hitbox logic.
 *
 * Architecture Rules:
 * 1. Duration Speed (DS) mathematically dictates the natural decelerating retraction
 *    duration of a limb after reaching peak extension. It has zero effect on forward strike velocity.
 * 2. Combo Acceleration Rule: Inputting the next sequence strike while in an active DS window
 *    accelerates the returning limb by 2.5x, clearing the centerline instantly.
 */

export interface StyleSequenceDS {
  s1: number;
  s2: number;
  s3: number;
  s4: number;
}

/**
 * 📋 Master Configuration Data Table
 * Values in seconds for each combo sequence stage (s1 = Stage 0, s2 = Stage 1, s3 = Stage 2, s4 = Stage 3)
 */
export const STYLE_RETRACTION_DS: Record<string, StyleSequenceDS> = {
  flow_boxing: {
    s1: 0.55,
    s2: 0.55,
    s3: 0.10, // Fast feint apex recovery
    s4: 0.20,
  },
  iron_boxing: {
    s1: 0.80,
    s2: 0.80,
    s3: 0.30, // Snappy recovery into S4
    s4: 0.30,
  },
  street_boxing: {
    s1: 0.35,
    s2: 0.35,
    s3: 0.50,
    s4: 0.50,
  },
  slugger: {
    s1: 0.28,
    s2: 0.28,
    s3: 0.28,
    s4: 0.28, // Standardized snappy brawler recoil
  },
  kyokushin: {
    s1: 0.30,
    s2: 0.30,
    s3: 0.30,
    s4: 0.30, // Unified full-contact chest tuck
  },
  aikido: {
    s1: 0.20,
    s2: 0.20,
    s3: 0.10, // Instant Tenkan cross-trap flow
    s4: 0.90, // Heavy grounded palm follow-through
  },
  // Default values for other martial arts
  keysi: {
    s1: 0.30,
    s2: 0.30,
    s3: 0.25,
    s4: 0.25,
  },
  cqc: {
    s1: 0.32,
    s2: 0.32,
    s3: 0.30,
    s4: 0.30,
  },
  muay_thai: {
    s1: 0.38,
    s2: 0.38,
    s3: 0.35,
    s4: 0.40,
  },
  shotokan: {
    s1: 0.32,
    s2: 0.22, // Ren-Zuki quick snap
    s3: 0.32,
    s4: 0.35,
  },
  ashihara: {
    s1: 0.35,
    s2: 0.35,
    s3: 0.30,
    s4: 0.30,
  },
  capoeira: {
    s1: 0.35,
    s2: 0.35,
    s3: 0.35,
    s4: 0.40,
  },
  kickboxing: {
    s1: 0.32,
    s2: 0.32,
    s3: 0.35,
    s4: 0.35,
  },
  street_taekwondo: {
    s1: 0.35,
    s2: 0.35,
    s3: 0.30,
    s4: 0.38,
  },
};

/**
 * Global Combo Acceleration Multiplier per Section 1.18 specification:
 * Inputting next sequence strike accelerates returning limb by 2.5x.
 */
export const COMBO_ACCELERATION_MULTIPLIER = 2.5;

/**
 * Resolves style alias to config key (handles basic -> flow_boxing, boxing_shell -> iron_boxing).
 */
export function normalizeStyleIdForDS(styleId: string): string {
  if (styleId === 'basic') return 'flow_boxing';
  if (styleId === 'boxing_shell') return 'iron_boxing';
  return styleId;
}

/**
 * Retrieves the Duration Speed (DS in seconds) for a given style and sequence stage.
 * stage: 0 = S1, 1 = S2, 2 = S3, 3 = S4.
 */
export function getStyleSequenceDS(styleId: string, stage: number = 0): number {
  const normStyle = normalizeStyleIdForDS(styleId);
  const profile = STYLE_RETRACTION_DS[normStyle] || STYLE_RETRACTION_DS.kyokushin;
  const clampedStage = Math.max(0, Math.min(3, Math.floor(stage)));

  switch (clampedStage) {
    case 0:
      return profile.s1;
    case 1:
      return profile.s2;
    case 2:
      return profile.s3;
    case 3:
    default:
      return profile.s4;
  }
}

/**
 * Converts Duration Speed (DS) into base return rate per frame at 60 FPS fixed-step simulation.
 */
export function getStyleSequenceReturnSpeed(styleId: string, stage: number = 0): number {
  const dsSeconds = getStyleSequenceDS(styleId, stage);
  const totalFrames = Math.max(2, Math.round(dsSeconds * 60));
  return 1.0 / totalFrames;
}

/**
 * Computes the frame-by-frame retraction delta based on the limb's current progress,
 * style DS duration, and whether combo acceleration (2.5x) is triggered.
 *
 * Implements smooth weight-bearing cubic deceleration curve:
 * [ PEAK EXTENSION: t = 0.0s ] ➔ Initial Retraction Velocity: 100%
 *                                          │
 *                                          ▼ (Smooth Cubic Deceleration)
 * [ RETRACTION COMPLETE: t = DS ] ➔ Retraction Velocity: 0% (Fully Settled in Stance)
 */
export function calculateDSRetractionDelta(
  currentProgress: number,
  styleId: string,
  stage: number,
  isComboAccelerated: boolean = false,
  isExempt: boolean = false
): number {
  const normStyle = normalizeStyleIdForDS(styleId);

  // Active Retraction Exemptions Checklist
  if (isExempt || (normStyle === 'flow_boxing' && stage === 2) || (normStyle === 'aikido' && stage === 2)) {
    // Flow Boxing M1 S3 (Hook Feint) & Aikido M1 S3 (Tenkan Cross): Fast transition without lock
    return Math.max(0.35, currentProgress * 0.50);
  }

  const dsSeconds = getStyleSequenceDS(normStyle, stage);
  const totalFrames = Math.max(2, Math.round(dsSeconds * 60));
  const baseRate = 1.0 / totalFrames;

  // Cubic Deceleration Curve:
  // Decelerates as progress approaches 0, but maintains weight-bearing momentum so it never stalls.
  // Cubic weighting gives dynamic natural snap out of extension and smooth settlement into guard.
  const progressRatio = Math.max(0, Math.min(1.0, currentProgress));
  const decelCurve = 0.70 + 0.60 * Math.pow(progressRatio, 1.5);
  let delta = baseRate * decelCurve;

  // Combo Acceleration Rule:
  // Inputting next sequence strike accelerates returning limb by 2.5x to clear centerline instantly.
  if (isComboAccelerated) {
    delta *= COMBO_ACCELERATION_MULTIPLIER;
  }

  return Math.max(0.012, delta);
}
