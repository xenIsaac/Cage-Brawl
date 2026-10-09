/**
 * 🛠️ SECTION 1.18 - MODULE 1: stats.config.ts
 * 
 * Governs pure style attributes, genetics, and base multipliers.
 * Contains ZERO animation timing logic.
 * 
 * Rules:
 * 1. Height & genetics scaling strictly decoupled from attack execution speed.
 * 2. Genetics (Height) strictly governs physical mass:
 *    - Physical Reach & Visual Profile (1.68x - 2.07x)
 *    - Health Pool (90 - 115 HP)
 *    - Raw Power / Strike Damage (0.90x - 1.18x)
 *    - Stamina Regeneration (+30% to -35%)
 *    - Dash Profile & Movement Stride Speed
 * 3. Style technique strictly governs martial power, reach, and defense modifiers.
 * 4. Universal baseline bounds.
 */

export type HeightTier = 'Micro' | 'Short' | 'Average' | 'Tall' | 'Giant';

export interface HeightModifiers {
  maxHealth: number;                   // 90 HP (4'11") to 115 HP (7'2")
  damageFactor: number;                // 0.90x to 1.18x strike damage
  damageReduction: number;             // 0.0% to 3.0% (0.03) passive mass absorption
  speedFactor: number;                 // Cooldown / recovery speed multiplier (1.35x to 0.77x)
  attackCooldownMultiplier: number;    // Attack cooldown duration multiplier (0.74x to 1.30x)
  executionSpeedFactor: number;        // Fixed at 1.00x: Pure Style Technique Decoupled
  executionDurationMultiplier: number; // Fixed at 1.00x: Pure Style Technique Decoupled
  scaleFactor: number;                 // Canvas profile & reach scale (1.68x to 2.07x)
  trueScaleBonus: number;              // Percentage difference vs standard 5'8" average height baseline
  moveSpeedModifier: number;           // Movement stride speed (0.90x to 1.05x)
  staminaRegenRate: number;            // Stamina regen multiplier (1.30x to 0.65x)
  dashCooldownModifier: number;        // Dash cooldown multiplier (0.90x to 1.05x)
  dashDistanceModifier: number;        // Dash travel distance multiplier (0.85x to 1.10x)
  heightTier: HeightTier;
  reachBonus: number;                  // percentage reach bonus vs 1.00x
  label: string;
  color: string;
}

export const MIN_HEIGHT_INCHES = 59; // 4'11"
export const MAX_HEIGHT_INCHES = 86; // 7'2"
export const BASE_HEIGHT_INCHES = 68; // 5'8"

/**
 * Calculates genetics and biometric mass modifiers for a given height.
 * Completely decoupled from attack execution speed.
 */
export function calculateHeightModifiers(heightInInches: number): HeightModifiers {
  const clampedHeight = Math.max(MIN_HEIGHT_INCHES, Math.min(MAX_HEIGHT_INCHES, heightInInches || BASE_HEIGHT_INCHES));
  const diff = clampedHeight - BASE_HEIGHT_INCHES;

  // 1. Maximum Health (HP Pool): -10% at 4'11" (90 HP) -> 100 HP (5'8") -> +15% at 7'2" (115 HP)
  let maxHealth = 100;
  if (diff < 0) {
    maxHealth = Math.round(100 - (Math.abs(diff) / 9) * 10);
  } else if (diff > 0) {
    maxHealth = Math.round(100 + (diff / 18) * 15);
  }

  // 2. Fist & Kick Power (Strike Damage): -10% at 4'11" (0.90x) -> 1.00x (5'8") -> +18% at 7'2" (1.18x)
  let damageFactor = 1.0;
  if (diff < 0) {
    damageFactor = Math.round((1.0 - (Math.abs(diff) / 9) * 0.10) * 1000) / 1000;
  } else if (diff > 0) {
    damageFactor = Math.round((1.0 + (diff / 18) * 0.18) * 1000) / 1000;
  }

  // 3. Damage Absorption (DR): 0.0% (<=5'8") -> up to +3.0% (0.03) at 7'2"
  let damageReduction = 0.0;
  if (diff > 0) {
    damageReduction = Math.round(((diff / 18) * 0.03) * 1000) / 1000;
  }

  // 4. Attack Execution Speed: STRICTLY DECOUPLED (1.00x across all heights)
  const executionDurationMultiplier = 1.0;
  const executionSpeedFactor = 1.0;

  // 5. Cooldown / Recovery Speed: -26% CD (0.74x duration) -> 1.00x -> +30% CD (1.30x duration)
  let attackCooldownMultiplier = 1.0;
  let speedFactor = 1.0;
  if (diff < 0) {
    attackCooldownMultiplier = Math.round((1.0 - (Math.abs(diff) / 9) * 0.26) * 1000) / 1000;
    speedFactor = Math.round((1.0 / attackCooldownMultiplier) * 1000) / 1000;
  } else if (diff > 0) {
    attackCooldownMultiplier = Math.round((1.0 + (diff / 18) * 0.30) * 1000) / 1000;
    speedFactor = Math.round((1.0 / attackCooldownMultiplier) * 1000) / 1000;
  }

  // 6. Visual Profile & Canvas Scale (Micro 1.68x -> Standard 1.80x -> Giant 2.07x)
  let scaleFactor = 1.80;
  if (diff < 0) {
    scaleFactor = Math.round((1.80 - (Math.abs(diff) / 9) * 0.12) * 1000) / 1000;
  } else if (diff > 0) {
    scaleFactor = Math.round((1.80 + (diff / 18) * 0.27) * 1000) / 1000;
  }
  const reachBonus = Math.round(((scaleFactor / 1.80) - 1) * 100);
  const trueScaleBonus = Math.round(((scaleFactor - 1.80) / 1.80) * 100);

  // 7. Movement Speed (Stride Speed): -10% at 4'11" (0.90x) -> 1.00x -> +5% at 7'2" (1.05x)
  let moveSpeedModifier = 1.0;
  if (diff < 0) {
    moveSpeedModifier = Math.round((1.0 - (Math.abs(diff) / 9) * 0.10) * 1000) / 1000;
  } else if (diff > 0) {
    moveSpeedModifier = Math.round((1.0 + (diff / 18) * 0.05) * 1000) / 1000;
  }

  // 8. Stamina Regeneration: +30% at 4'11" (1.30x) -> 1.00x -> -35% at 7'2" (0.65x)
  let staminaRegenRate = 1.0;
  if (diff < 0) {
    staminaRegenRate = Math.round((1.0 + (Math.abs(diff) / 9) * 0.30) * 1000) / 1000;
  } else if (diff > 0) {
    staminaRegenRate = Math.round((1.0 - (diff / 18) * 0.35) * 1000) / 1000;
  }

  // 9. Dash Profile
  let dashCooldownModifier = 1.0;
  let dashDistanceModifier = 1.0;
  if (diff < 0) {
    dashCooldownModifier = Math.round((1.0 - (Math.abs(diff) / 9) * 0.10) * 1000) / 1000;
    dashDistanceModifier = Math.round((1.0 - (Math.abs(diff) / 9) * 0.15) * 1000) / 1000;
  } else if (diff > 0) {
    dashCooldownModifier = Math.round((1.0 + (diff / 18) * 0.05) * 1000) / 1000;
    dashDistanceModifier = Math.round((1.0 + (diff / 18) * 0.10) * 1000) / 1000;
  }

  // Height Tier Classification
  let heightTier: HeightTier = 'Average';
  let label = "5'8\" - 6'0\" (Average)";
  let color = '#38bdf8'; // Sky blue

  if (clampedHeight <= 61) {
    heightTier = 'Micro';
    label = '4\'11" - 5\'1" (Micro)';
    color = '#ec4899'; // Pink
  } else if (clampedHeight <= 65) {
    heightTier = 'Short';
    label = '5\'2" - 5\'5" (Compact)';
    color = '#a855f7'; // Purple
  } else if (clampedHeight <= 72) {
    heightTier = 'Average';
    label = '5\'6" - 6\'0" (Athletic)';
    color = '#38bdf8'; // Sky blue
  } else if (clampedHeight <= 78) {
    heightTier = 'Tall';
    label = '6\'1" - 6\'6" (Heavyweight)';
    color = '#f59e0b'; // Amber
  } else {
    heightTier = 'Giant';
    label = '6\'7" - 7\'2" (Colossus)';
    color = '#ef4444'; // Red
  }

  return {
    maxHealth,
    damageFactor,
    damageReduction,
    speedFactor,
    attackCooldownMultiplier,
    executionSpeedFactor,
    executionDurationMultiplier,
    scaleFactor,
    trueScaleBonus,
    moveSpeedModifier,
    staminaRegenRate,
    dashCooldownModifier,
    dashDistanceModifier,
    heightTier,
    reachBonus,
    label,
    color,
  };
}

export function formatHeight(inches: number): string {
  const clamped = Math.max(MIN_HEIGHT_INCHES, Math.min(MAX_HEIGHT_INCHES, inches || BASE_HEIGHT_INCHES));
  const feet = Math.floor(clamped / 12);
  const remainingInches = Math.round(clamped % 12);
  return `${feet}'${remainingInches}"`;
}

/**
 * Universal Baseline Standard:
 * Kyokushin Karate Baseline (~120.7ms, ~7.2 frames at 60 FPS fixed-step simulation)
 */
export const UNIVERSAL_BASELINE_EXECUTION_SPEED = 0.1381;
export const UNIVERSAL_BASELINE_DURATION_MS = 120.7;

export interface StyleStatProfile {
  name: string;
  speed: number;
  reach: number;
  power: number;
  defense: number;
  knockback: number;
}

/**
 * Master Style Stat Multipliers Matrix (Zero animation timing logic)
 */
export const STYLE_STAT_PROFILES: Record<string, StyleStatProfile> = {
  flow_boxing: {
    name: 'Flow Boxing',
    speed: 1.08,
    reach: 1.00,
    power: 1.00,
    defense: 0.95,
    knockback: 1.00,
  },
  iron_boxing: {
    name: 'Iron Boxing',
    speed: 1.00,
    reach: 0.95,
    power: 1.15,
    defense: 1.20,
    knockback: 1.10,
  },
  street_boxing: {
    name: 'Street Boxing',
    speed: 1.04,
    reach: 0.90,
    power: 0.75,
    defense: 0.90,
    knockback: 0.40,
  },
  slugger: {
    name: 'Slugger',
    speed: 1.00,
    reach: 1.12,
    power: 1.35,
    defense: 1.10,
    knockback: 1.50,
  },
  kyokushin: {
    name: 'Kyokushin Karate',
    speed: 1.00,
    reach: 1.00,
    power: 1.15,
    defense: 1.15,
    knockback: 1.15,
  },
  aikido: {
    name: 'Aikido',
    speed: 1.00,
    reach: 1.00,
    power: 0.85,
    defense: 1.25,
    knockback: 0.80,
  },
  keysi: {
    name: 'Keysi Fighting Method',
    speed: 1.05,
    reach: 0.85,
    power: 1.05,
    defense: 1.15,
    knockback: 0.90,
  },
  cqc: {
    name: 'CQC Operator',
    speed: 1.02,
    reach: 0.92,
    power: 1.05,
    defense: 1.05,
    knockback: 0.85,
  },
  muay_thai: {
    name: 'Muay Thai',
    speed: 0.98,
    reach: 1.05,
    power: 1.20,
    defense: 1.05,
    knockback: 1.25,
  },
  shotokan: {
    name: 'Shotokan Karate',
    speed: 1.05,
    reach: 1.02,
    power: 1.10,
    defense: 0.95,
    knockback: 1.05,
  },
  ashihara: {
    name: 'Ashihara Karate',
    speed: 0.96,
    reach: 0.98,
    power: 1.08,
    defense: 1.18,
    knockback: 0.95,
  },
  capoeira: {
    name: 'Capoeira',
    speed: 1.06,
    reach: 1.10,
    power: 1.12,
    defense: 0.90,
    knockback: 1.20,
  },
  kickboxing: {
    name: 'Kickboxing',
    speed: 1.04,
    reach: 1.04,
    power: 1.10,
    defense: 1.00,
    knockback: 1.05,
  },
  street_taekwondo: {
    name: 'Street Taekwondo',
    speed: 1.08,
    reach: 1.12,
    power: 1.15,
    defense: 0.88,
    knockback: 1.15,
  },
};

/**
 * Canonical Style ID resolution (handles project legacy aliases)
 */
export function resolveStyleCanonicalId(styleId: string): string {
  if (styleId === 'basic') return 'flow_boxing';
  if (styleId === 'boxing_shell') return 'iron_boxing';
  return styleId;
}
