/**
 * src/combat/medalsEngine.ts
 *
 * SECTION 8.9: POST-MATCH EVALUATION ENGINE (PART 2/2 — INDEPENDENT STACKABLE MEDALS)
 *
 * Core Architectural Rules:
 * 1. Total Track Elimination: Every medal exists as an independent, standalone achievement.
 * 2. Infinite Duplication & Stacking: Medals stack without caps per match or lifetime.
 * 3. Non-Destructive Progression: Higher tiers drop, stack, and register concurrently with lower tiers.
 * 4. Decoupled from Grade Evaluation: Medals have zero impact on letter grades.
 */

import { RoundReport } from '../types';

export type MedalTier = 'base' | 'copper' | 'silver' | 'gold';

export interface MedalDefinition {
  id: string;
  name: string;
  tier: MedalTier;
  icon: string;
  description: string;
  statTracked: string;
  cashPerMedal: number;
  soundType: 'base' | 'copper_silver' | 'gold';
  telemetryMultiplier?: number; // e.g. 100 for Century Strike
  telemetryUnit?: string;
}

export interface EarnedMedalResult {
  medal: MedalDefinition;
  count: number;
  totalCash: number;
}

export interface EvaluateMedalsInput {
  isPlayerWinner: boolean;
  damageDealt: number;
  damageTaken: number;
  hitsLanded: number;
  totalSwings?: number;
  parriesLanded?: number;
  heaviesLanded?: number;
  lightsLanded?: number;
  guardBreaksLanded?: number;
  playerFinalHp?: number;
  playerMaxHp?: number;
  roundReports?: RoundReport[];
  opponentKnockouts?: number;
}

/**
 * Master Independent Medals Catalog (17 Medals across 4 Tiers)
 */
export const MASTER_MEDALS_CATALOG: MedalDefinition[] = [
  // -------------------------------------------------------------
  // ⚪ BASE MEDALS (Universal Combat Feats — +$10 Cash each)
  // -------------------------------------------------------------
  {
    id: 'fighters_mark',
    name: "Fighter's Mark",
    tier: 'base',
    icon: '🎖️',
    description: 'Awarded 1x per enemy knocked out or match won.',
    statTracked: 'Lifetime Knockouts',
    cashPerMedal: 10,
    soundType: 'base',
    telemetryUnit: 'Knockouts',
  },
  {
    id: 'century_strike',
    name: 'Century Strike',
    tier: 'base',
    icon: '⚡',
    description: 'Stacks 1x for every cumulative 100 Damage dealt in a match.',
    statTracked: 'Lifetime Damage in hundreds',
    cashPerMedal: 10,
    soundType: 'base',
    telemetryMultiplier: 100,
    telemetryUnit: 'HP Damage',
  },
  {
    id: 'deflection',
    name: 'Deflection',
    tier: 'base',
    icon: '🛡️',
    description: 'Stacks 1x for every single Perfect Parry landed.',
    statTracked: 'Lifetime Parries',
    cashPerMedal: 10,
    soundType: 'base',
    telemetryUnit: 'Parries',
  },
  {
    id: 'heavy_strike',
    name: 'Heavy Strike',
    tier: 'base',
    icon: '💥',
    description: 'Stacks 1x for every single M2 Heavy Attack landed cleanly on hit.',
    statTracked: 'Lifetime Heavy Hits',
    cashPerMedal: 10,
    soundType: 'base',
    telemetryUnit: 'Heavy Hits',
  },

  // -------------------------------------------------------------
  // 🥉 COPPER MEDALS (Tactical Competence — +$25 Cash each)
  // -------------------------------------------------------------
  {
    id: 'counter_timing',
    name: 'Counter Timing',
    tier: 'copper',
    icon: '🥉',
    description: 'Stacks 1x for every 3 Perfect Parries landed within a single match.',
    statTracked: 'Tri-Parry Sets',
    cashPerMedal: 25,
    soundType: 'copper_silver',
    telemetryMultiplier: 3,
    telemetryUnit: 'Parries Executed',
  },
  {
    id: 'guard_breaker',
    name: 'Guard Breaker',
    tier: 'copper',
    icon: '🧱',
    description: 'Stacks 1x for every enemy Armor Guard (AP) completely shattered.',
    statTracked: 'Armor Guards Shattered',
    cashPerMedal: 25,
    soundType: 'copper_silver',
    telemetryUnit: 'Guard Breaks',
  },
  {
    id: 'paced_striker',
    name: 'Paced Striker',
    tier: 'copper',
    icon: '🎯',
    description: 'Awarded 1x per round completed with 50%+ Strike Accuracy.',
    statTracked: 'Rounds at 50%+ Accuracy',
    cashPerMedal: 25,
    soundType: 'copper_silver',
    telemetryUnit: 'Rounds',
  },
  {
    id: 'resilient',
    name: 'Resilient',
    tier: 'copper',
    icon: '❤️‍🩹',
    description: 'Awarded 1x per round won with less than 30% HP remaining.',
    statTracked: 'Grit Comeback Rounds (<30% HP)',
    cashPerMedal: 25,
    soundType: 'copper_silver',
    telemetryUnit: 'Rounds',
  },

  // -------------------------------------------------------------
  // 🥈 SILVER MEDALS (High-Level Prowess — +$60 Cash each)
  // -------------------------------------------------------------
  {
    id: 'iron_guard',
    name: 'Iron Guard',
    tier: 'silver',
    icon: '🥈',
    description: 'Stacks 1x for every 6 Perfect Parries landed within a single match.',
    statTracked: 'Sextuple-Parry Sets',
    cashPerMedal: 60,
    soundType: 'copper_silver',
    telemetryMultiplier: 6,
    telemetryUnit: 'Parries Executed',
  },
  {
    id: 'blunt_force',
    name: 'Blunt Force',
    tier: 'silver',
    icon: '🔨',
    description: 'Stacks 1x for every 3 M2 Heavy Strikes landed within a single round.',
    statTracked: 'Heavy Tri-Strike Rounds',
    cashPerMedal: 60,
    soundType: 'copper_silver',
    telemetryMultiplier: 3,
    telemetryUnit: 'Heavy Strikes',
  },
  {
    id: 'sharp_cadence',
    name: 'Sharp Cadence',
    tier: 'silver',
    icon: '⚔️',
    description: 'Awarded 1x per round completed with 70%+ Strike Accuracy.',
    statTracked: 'Rounds at 70%+ Accuracy',
    cashPerMedal: 60,
    soundType: 'copper_silver',
    telemetryUnit: 'Rounds',
  },
  {
    id: 'unbroken',
    name: 'Unbroken',
    tier: 'silver',
    icon: '🛡️',
    description: 'Awarded 1x per round won with 90%+ HP remaining.',
    statTracked: 'Dominant Rounds (90%+ HP)',
    cashPerMedal: 60,
    soundType: 'copper_silver',
    telemetryUnit: 'Rounds',
  },

  // -------------------------------------------------------------
  // 🥇 GOLD MEDALS (Masterclass & Clutch Feats — +$150 Cash each)
  // -------------------------------------------------------------
  {
    id: 'master_deflection',
    name: 'Master Deflection',
    tier: 'gold',
    icon: '🥇',
    description: 'Stacks 1x for every 10 Perfect Parries landed within a single match.',
    statTracked: 'Deca-Parry Masterclasses',
    cashPerMedal: 150,
    soundType: 'gold',
    telemetryMultiplier: 10,
    telemetryUnit: 'Parries Executed',
  },
  {
    id: 'heavy_devastation',
    name: 'Heavy Devastation',
    tier: 'gold',
    icon: '☄️',
    description: 'Awarded 1x for landing 5+ M2 Heavy Strikes across a single match.',
    statTracked: 'Heavy Devastation Matches (5+ Heavies)',
    cashPerMedal: 150,
    soundType: 'gold',
    telemetryUnit: 'Matches',
  },
  {
    id: 'surgical_execution',
    name: 'Surgical Execution',
    tier: 'gold',
    icon: '👑',
    description: 'Awarded 1x per round completed with 85%+ Strike Accuracy.',
    statTracked: 'Flawless Accuracy Rounds (85%+)',
    cashPerMedal: 150,
    soundType: 'gold',
    telemetryUnit: 'Rounds',
  },
  {
    id: 'untouchable',
    name: 'Untouchable',
    tier: 'gold',
    icon: '✨',
    description: 'Awarded 1x per round won with 100% HP (Zero damage taken, including chip).',
    statTracked: 'Untouchable Flawless Rounds (100% HP)',
    cashPerMedal: 150,
    soundType: 'gold',
    telemetryUnit: 'Flawless Rounds',
  },
  {
    id: 'clutch_recovery',
    name: 'Clutch Recovery',
    tier: 'gold',
    icon: '🔥',
    description: 'Awarded 1x per round won after dropping below 15% HP (Legendary comeback).',
    statTracked: 'Legendary Clutch Comebacks (<15% HP)',
    cashPerMedal: 150,
    soundType: 'gold',
    telemetryUnit: 'Comebacks',
  },
];

/**
 * Map catalog by ID for fast lookup
 */
export const MEDAL_MAP: Record<string, MedalDefinition> = MASTER_MEDALS_CATALOG.reduce((acc, m) => {
  acc[m.id] = m;
  return acc;
}, {} as Record<string, MedalDefinition>);

/**
 * Evaluate all 17 independent stackable medals for a completed match
 */
export function evaluateMatchMedals(input: EvaluateMedalsInput): EarnedMedalResult[] {
  const {
    isPlayerWinner,
    damageDealt,
    damageTaken,
    hitsLanded,
    totalSwings = hitsLanded,
    parriesLanded = 0,
    heaviesLanded = 0,
    guardBreaksLanded = 0,
    playerFinalHp = isPlayerWinner ? 70 : 0,
    playerMaxHp = 100,
    roundReports = [],
    opponentKnockouts = isPlayerWinner ? 1 : 0,
  } = input;

  const earnedCounts: Record<string, number> = {};

  const addMedalCount = (id: string, count: number) => {
    if (count > 0) {
      earnedCounts[id] = (earnedCounts[id] || 0) + count;
    }
  };

  // 1. BASE MEDALS
  if (isPlayerWinner || opponentKnockouts > 0) {
    addMedalCount('fighters_mark', Math.max(1, opponentKnockouts));
  }
  if (damageDealt >= 100) {
    addMedalCount('century_strike', Math.floor(damageDealt / 100));
  }
  if (parriesLanded > 0) {
    addMedalCount('deflection', parriesLanded);
  }
  if (heaviesLanded > 0) {
    addMedalCount('heavy_strike', heaviesLanded);
  }

  // 2. COPPER MEDALS
  if (parriesLanded >= 3) {
    addMedalCount('counter_timing', Math.floor(parriesLanded / 3));
  }
  if (guardBreaksLanded > 0) {
    addMedalCount('guard_breaker', guardBreaksLanded);
  }

  // Evaluate Round Reports or Match Fallbacks
  const hasRounds = roundReports && roundReports.length > 0;
  const matchAccuracy = totalSwings > 0 ? (hitsLanded / totalSwings) * 100 : (hitsLanded > 0 ? 100 : 0);
  const hpRetainedPct = Math.round((playerFinalHp / Math.max(1, playerMaxHp)) * 100);

  if (hasRounds) {
    let roundsAcc50 = 0;
    let roundsResilient = 0;
    let roundsBluntForce = 0;
    let roundsAcc70 = 0;
    let roundsUnbroken = 0;
    let roundsAcc85 = 0;
    let roundsUntouchable = 0;
    let roundsClutch = 0;

    roundReports.forEach(r => {
      const isWon = r.winner === 'player';
      const roundSwings = (r.lightsLanded + r.heaviesLanded) > 0 ? (r.lightsLanded + r.heaviesLanded) : 1;
      const roundHits = (r.lightsLanded + r.heaviesLanded);
      const acc = Math.min(100, Math.round((roundHits / roundSwings) * 100));

      // Paced Striker (50%+ accuracy)
      if (acc >= 50) roundsAcc50++;
      // Sharp Cadence (70%+ accuracy)
      if (acc >= 70) roundsAcc70++;
      // Surgical Execution (85%+ accuracy)
      if (acc >= 85) roundsAcc85++;

      // Blunt Force (3+ Heavies in single round)
      if (r.heaviesLanded >= 3) roundsBluntForce += Math.floor(r.heaviesLanded / 3);

      if (isWon) {
        // Untouchable (100% HP, zero damage taken)
        if (r.isFlawless || r.damageTaken === 0) {
          roundsUntouchable++;
        }
        // Unbroken (90%+ HP remaining)
        if (r.damageTaken <= 10) {
          roundsUnbroken++;
        }
        // Resilient (<30% HP remaining)
        if (r.minPlayerHpPct !== undefined && r.minPlayerHpPct <= 30) {
          roundsResilient++;
        }
        // Clutch Recovery (<15% HP comeback)
        if (r.isClutchComeback || (r.minPlayerHpPct !== undefined && r.minPlayerHpPct <= 15)) {
          roundsClutch++;
        }
      }
    });

    addMedalCount('paced_striker', roundsAcc50);
    addMedalCount('resilient', roundsResilient);
    addMedalCount('blunt_force', roundsBluntForce);
    addMedalCount('sharp_cadence', roundsAcc70);
    addMedalCount('unbroken', roundsUnbroken);
    addMedalCount('surgical_execution', roundsAcc85);
    addMedalCount('untouchable', roundsUntouchable);
    addMedalCount('clutch_recovery', roundsClutch);
  } else {
    // Single-Match Fallback Evaluation
    if (matchAccuracy >= 50) addMedalCount('paced_striker', 1);
    if (matchAccuracy >= 70) addMedalCount('sharp_cadence', 1);
    if (matchAccuracy >= 85) addMedalCount('surgical_execution', 1);

    if (heaviesLanded >= 3) {
      addMedalCount('blunt_force', Math.floor(heaviesLanded / 3));
    }

    if (isPlayerWinner) {
      if (damageTaken === 0 || hpRetainedPct >= 100) {
        addMedalCount('untouchable', 1);
      } else if (hpRetainedPct >= 90) {
        addMedalCount('unbroken', 1);
      }

      if (hpRetainedPct > 0 && hpRetainedPct <= 14) {
        addMedalCount('clutch_recovery', 1);
      } else if (hpRetainedPct < 30) {
        addMedalCount('resilient', 1);
      }
    }
  }

  // 3. SILVER MEDALS
  if (parriesLanded >= 6) {
    addMedalCount('iron_guard', Math.floor(parriesLanded / 6));
  }

  // 4. GOLD MEDALS
  if (parriesLanded >= 10) {
    addMedalCount('master_deflection', Math.floor(parriesLanded / 10));
  }
  if (heaviesLanded >= 5) {
    addMedalCount('heavy_devastation', 1);
  }

  // Build Results with cash conversion
  const results: EarnedMedalResult[] = [];
  const tierSortOrder: Record<MedalTier, number> = { base: 1, copper: 2, silver: 3, gold: 4 };

  Object.entries(earnedCounts).forEach(([id, count]) => {
    const medal = MEDAL_MAP[id];
    if (medal && count > 0) {
      results.push({
        medal,
        count,
        totalCash: count * medal.cashPerMedal,
      });
    }
  });

  // Sort: Base first, then Copper, Silver, Gold last for drop presentation
  results.sort((a, b) => {
    const tierDiff = tierSortOrder[a.medal.tier] - tierSortOrder[b.medal.tier];
    if (tierDiff !== 0) return tierDiff;
    return b.count - a.count;
  });

  return results;
}

/**
 * Calculate total bonus cash payout from all earned medals
 */
export function calculateMedalsTotalCash(earnedMedals: EarnedMedalResult[]): number {
  return earnedMedals.reduce((sum, item) => sum + item.totalCash, 0);
}

/**
 * Merge newly earned medals into player's lifetime medal inventory
 */
export function mergeLifetimeMedals(
  currentMedals: Record<string, number> = {},
  earnedMedals: EarnedMedalResult[]
): Record<string, number> {
  const updated = { ...currentMedals };
  earnedMedals.forEach(({ medal, count }) => {
    updated[medal.id] = (updated[medal.id] || 0) + count;
  });
  return updated;
}
