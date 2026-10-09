export interface HeightModifiers {
  maxHealth: number;                   // 90 HP (4'11") to 115 HP (7'2")
  damageFactor: number;                // 0.90x to 1.18x strike damage
  damageReduction: number;             // 0.0% to 3.0% (0.03) passive mass absorption
  speedFactor: number;                 // Cooldown / recovery speed multiplier (1.35x to 0.77x)
  attackCooldownMultiplier: number;    // Attack cooldown duration multiplier (0.74x to 1.30x)
  executionSpeedFactor: number;        // Active physical punch travel animation speed (1.25x to 0.70x)
  executionDurationMultiplier: number; // Active physical punch travel duration multiplier (0.75x to 1.30x)
  scaleFactor: number;                 // Canvas profile & reach scale (1.35x to 2.07x, +50% size increase)
  trueScaleBonus: number;              // Percentage difference vs standard 5'8" average height baseline (+0% at 5'8", +15% at 7'2", -7% at 4'11")
  moveSpeedModifier: number;           // Movement stride speed (0.90x to 1.05x)
  staminaRegenRate: number;            // Stamina regen multiplier (1.30x to 0.65x)
  dashCooldownModifier: number;        // Dash cooldown multiplier (0.90x to 1.05x)
  dashDistanceModifier: number;        // Dash travel distance multiplier (0.85x to 1.10x)
  heightTier: 'Micro' | 'Short' | 'Average' | 'Tall' | 'Giant';
  reachBonus: number;                  // percentage reach bonus vs 1.00x
  label: string;
  color: string;
}

/**
 * Height System & Genetics Balancing (v1.7.6 P3 Final)
 * 
 * Bounds:
 * - Micro Tier: 4'11" (59") [0.75x canvas profile]
 * - Standard Tier: 5'8" - 6'0" (68" - 72") [1.00x profile]
 * - Giant Tier: 7'2" (86") [1.15x canvas profile]
 */
export function getHeightModifiers(heightInInches: number): HeightModifiers {
  // Clamp height between 4'11" (59") and 7'2" (86")
  const clampedHeight = Math.max(59, Math.min(86, heightInInches || 68));
  const baseHeight = 68; // 5'8" (Standard midpoint)
  const diff = clampedHeight - baseHeight;

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

  // 4. Attack Execution Speed (SECTION 1.17: PURE STYLE EXECUTION - Decoupled from Height)
  // Height strictly governs physical mass/reach, while fighting style strictly governs martial technique.
  // Execution speed is fixed at 1.00x across all heights to ensure clean, authentic style velocity.
  const executionDurationMultiplier = 1.0;
  const executionSpeedFactor = 1.0;

  // 5. Attack Speed / Cooldown (Startup / Recovery duration): -26% CD (0.74x duration) -> 1.00x -> +30% CD (1.30x duration)
  let attackCooldownMultiplier = 1.0;
  let speedFactor = 1.0;
  if (diff < 0) {
    attackCooldownMultiplier = Math.round((1.0 - (Math.abs(diff) / 9) * 0.26) * 1000) / 1000;
    speedFactor = Math.round((1.0 / attackCooldownMultiplier) * 1000) / 1000;
  } else if (diff > 0) {
    attackCooldownMultiplier = Math.round((1.0 + (diff / 18) * 0.30) * 1000) / 1000;
    speedFactor = Math.round((1.0 / attackCooldownMultiplier) * 1000) / 1000;
  }

  // 6. Visual Profile & Canvas Scale (Gentle lower compression so sub-standard fighters remain substantial):
  // Micro (4'11"): 1.68x (subtle, solid compact stature)
  // Standard (5'8"-6'0"): 1.80x (standard baseline profile)
  // Giant (7'2"): 2.07x (imposing heavyweight profile)
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

  // 9. Dash Cooldown (-10% at 4'11" [0.90x] -> 1.00x -> +5% at 7'2" [1.05x])
  let dashCooldownModifier = 1.0;
  if (diff < 0) {
    dashCooldownModifier = Math.round((1.0 - (Math.abs(diff) / 9) * 0.10) * 1000) / 1000;
  } else if (diff > 0) {
    dashCooldownModifier = Math.round((1.0 + (diff / 18) * 0.05) * 1000) / 1000;
  }

  // 10. Dash Distance (-15% at 4'11" [0.85x] -> 1.00x -> +10% at 7'2" [1.10x])
  let dashDistanceModifier = 1.0;
  if (diff < 0) {
    dashDistanceModifier = Math.round((1.0 - (Math.abs(diff) / 9) * 0.15) * 1000) / 1000;
  } else if (diff > 0) {
    dashDistanceModifier = Math.round((1.0 + (diff / 18) * 0.10) * 1000) / 1000;
  }

  // Height Tier Classification (5 Tiers: Micro - Short - Average - Tall - Giant)
  let heightTier: 'Micro' | 'Short' | 'Average' | 'Tall' | 'Giant' = 'Average';
  let label = 'Average';
  let color = 'text-white';

  if (clampedHeight <= 62) {
    // Micro Tier: 4'11" - 5'2" (0.2% ultra-rare)
    heightTier = 'Micro';
    label = clampedHeight <= 59 ? "Micro (4'11\")" : 'Micro';
    color = 'text-pink-400';
  } else if (clampedHeight <= 67) {
    // Short Tier: 5'3" - 5'7" (25.0%)
    heightTier = 'Short';
    label = 'Short';
    color = 'text-cyan-400';
  } else if (clampedHeight <= 72) {
    // Average Tier: 5'8" - 6'0" (65.0%)
    heightTier = 'Average';
    label = 'Average';
    color = 'text-white';
  } else if (clampedHeight <= 80) {
    // Tall Tier: 6'1" - 6'8" (9.5%)
    heightTier = 'Tall';
    label = 'Tall';
    color = 'text-amber-400';
  } else {
    // Giant Tier: 6'9" - 7'2" (0.3% ultra-rare)
    heightTier = 'Giant';
    label = clampedHeight >= 86 ? "Giant (7'2\")" : 'Giant';
    color = 'text-fuchsia-400';
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
    color
  };
}

export function formatHeight(heightInInches: number): string {
  const feet = Math.floor(heightInInches / 12);
  const inches = heightInInches % 12;
  return `${feet}'${inches}" (${heightInInches}")`;
}
