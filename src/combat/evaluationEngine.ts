/**
 * src/combat/evaluationEngine.ts
 *
 * SECTION 8.8: POST-MATCH EVALUATION ENGINE (PART 1/2 — SCORING ARCHITECTURE)
 *
 * Pure, deterministic evaluation of match performance based on the 3-Pillar Benchmark:
 * 1. Pillar A: Strike Accuracy (%)
 * 2. Pillar B: Defense & Health Retained (%)
 * 3. Pillar C: Match Pacing (Time Duration)
 *
 * Plus the Grade-to-Grade Matrix mapping and Cash Payout derivation.
 */

export type PillarGrade = 'S' | 'A' | 'B' | 'C';
export type OverallCombatGrade = 'S+' | 'S' | 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C';

export interface EvaluationPillarA {
  strikesLanded: number;
  strikesThrown: number;
  accuracyPct: number;
  grade: PillarGrade;
  gradeLabel: string;
}

export interface EvaluationPillarB {
  playerFinalHp: number;
  playerMaxHp: number;
  hpRetainedPct: number;
  isClutchComeback: boolean;
  isFlawless: boolean;
  isChokedLead: boolean;
  grade: PillarGrade;
  gradeLabel: string;
}

export interface EvaluationPillarC {
  durationSec: number;
  durationFormatted: string;
  pacingType: 'blitz' | 'tactical' | 'attrition';
  grade: 'S' | 'A';
  gradeLabel: string;
}

export interface MatchEvaluationResult {
  pillarA: EvaluationPillarA;
  pillarB: EvaluationPillarB;
  pillarC: EvaluationPillarC;
  overallGrade: OverallCombatGrade;
  gradeCategory: 'S' | 'A' | 'B' | 'C';
  cashPayout: number;
  title: string;
  flavorText: string;
}

export interface EvaluationInput {
  isPlayerWinner: boolean;
  strikesLanded: number;
  strikesThrown?: number;
  playerFinalHp: number;
  playerMaxHp?: number;
  durationSec: number;
  earlyDamageDealtPct?: number; // % of player's total damage dealt in the first half of the match
  isTournament?: boolean;
  isRanked?: boolean;
}

/**
 * Pillar A: Strike Accuracy (%)
 * Accuracy % = (Strikes Landed / Strikes Thrown) * 100
 *
 * 85% - 100%: Grade S
 * 70% - 84%: Grade A
 * 50% - 69%: Grade B
 * Below 50%: Grade C
 */
export function evaluatePillarA(strikesLanded: number, rawStrikesThrown?: number): EvaluationPillarA {
  const landed = Math.max(0, strikesLanded);
  // Guarantee thrown is at least equal to landed and at least 1
  const thrown = Math.max(landed, rawStrikesThrown ?? landed, 1);
  const accuracyPct = Math.min(100, Math.max(1, Math.round((landed / thrown) * 100)));

  let grade: PillarGrade = 'C';
  let gradeLabel = 'Wild Flurry';

  if (accuracyPct >= 85) {
    grade = 'S';
    gradeLabel = 'Deadly Precision';
  } else if (accuracyPct >= 70) {
    grade = 'A';
    gradeLabel = 'Crisp Execution';
  } else if (accuracyPct >= 50) {
    grade = 'B';
    gradeLabel = 'Contested Trades';
  } else {
    grade = 'C';
    gradeLabel = 'Untamed Swings';
  }

  return {
    strikesLanded: landed,
    strikesThrown: thrown,
    accuracyPct,
    grade,
    gradeLabel,
  };
}

/**
 * Pillar B: Defense & Health Retained (%)
 * HP Retained % = (Player Final HP / Player Max HP) * 100
 *
 * Branch 1: Standard & Clutch Wins
 * - 100% HP (Untouchable / Flawless): Grade S (Zero damage taken, including chip)
 * - 80% – 99% HP: Grade A
 * - 40% – 79% HP: Grade B
 * - 15% – 39% HP: Grade A (Hard-fought war)
 * - 1% – 14% HP (Clutch Comeback): Grade S (Overcoming near-death to win awards peak defensive grade)
 *
 * Branch 2: Choked Lead Penalty
 * - If player dealt >= 70% of early damage in the first half, but finished with < 25% HP:
 * - Grade is overridden and capped at Grade C for sloppy defense.
 */
export function evaluatePillarB(
  isPlayerWinner: boolean,
  playerFinalHp: number,
  playerMaxHp: number = 100,
  earlyDamageDealtPct: number = 50
): EvaluationPillarB {
  const maxHp = Math.max(1, playerMaxHp);
  const finalHp = Math.max(0, Math.min(maxHp, playerFinalHp));
  const hpRetainedPct = Math.min(100, Math.max(0, Math.round((finalHp / maxHp) * 100)));

  const isFlawless = isPlayerWinner && hpRetainedPct >= 100;
  const isClutchComeback = isPlayerWinner && hpRetainedPct >= 1 && hpRetainedPct <= 14;

  // Choked Lead Penalty check: dealt >= 70% early damage, but finished < 25% HP
  const isChokedLead = isPlayerWinner && earlyDamageDealtPct >= 70 && hpRetainedPct < 25;

  let grade: PillarGrade = 'C';
  let gradeLabel = 'Defensive Collapse';

  if (!isPlayerWinner) {
    grade = 'C';
    gradeLabel = 'Overwhelmed Guard';
  } else if (isChokedLead) {
    grade = 'C';
    gradeLabel = 'Choked Defense (Penalty)';
  } else if (isFlawless) {
    grade = 'S';
    gradeLabel = 'Untouchable Flawless';
  } else if (isClutchComeback) {
    grade = 'S';
    gradeLabel = 'Clutch Comeback';
  } else if (hpRetainedPct >= 80) {
    grade = 'A';
    gradeLabel = 'Ironclad Fortress';
  } else if (hpRetainedPct >= 40) {
    grade = 'B';
    gradeLabel = 'Battle-Tested';
  } else if (hpRetainedPct >= 15) {
    grade = 'A';
    gradeLabel = 'Hard-Fought War';
  } else {
    grade = 'B';
    gradeLabel = 'Scraped Through';
  }

  return {
    playerFinalHp: finalHp,
    playerMaxHp: maxHp,
    hpRetainedPct,
    isClutchComeback,
    isFlawless,
    isChokedLead,
    grade,
    gradeLabel,
  };
}

/**
 * Pillar C: Match Pacing (Time Duration)
 * Pacing respects both hyper-aggressive blitzes and patient, high-level tactical chess matches.
 * Note: B and C grades do NOT exist for Time!
 *
 * Fast Blitz (< 25s): Grade S
 * Balanced Tactical Exchange (25s – 75s): Grade A
 * Prolonged War of Attrition (> 75s): Grade S
 */
export function evaluatePillarC(durationSec: number): EvaluationPillarC {
  const dur = Math.max(1, Math.round(durationSec));
  const mins = Math.floor(dur / 60);
  const secs = dur % 60;
  const durationFormatted = `${mins}:${secs.toString().padStart(2, '0')}`;

  let grade: 'S' | 'A' = 'A';
  let pacingType: 'blitz' | 'tactical' | 'attrition' = 'tactical';
  let gradeLabel = 'Tactical Exchange';

  if (dur < 25) {
    grade = 'S';
    pacingType = 'blitz';
    gradeLabel = 'Lightning Blitz';
  } else if (dur > 75) {
    grade = 'S';
    pacingType = 'attrition';
    gradeLabel = 'War of Attrition';
  } else {
    grade = 'A';
    pacingType = 'tactical';
    gradeLabel = 'Tactical Chess';
  }

  return {
    durationSec: dur,
    durationFormatted,
    pacingType,
    grade,
    gradeLabel,
  };
}

/**
 * Overall Grade Derivation Matrix (Grade-to-Grade Formula):
 *
 * [ S + S + S ] = Grade S+ (Absolute Perfection)
 * [ S + S + A ] = Grade S
 * [ S + A + A ] = Grade A+
 * [ A + A + A ] = Grade A
 * [ S + S + B ] = Grade A
 * [ S + A + B ] = Grade A-
 * [ A + A + B ] = Grade B+
 * [ A + B + B ] = Grade B
 * [ B + B + B ] = Grade B-
 * [ S + S + C ] = Grade B
 * [ S + A + C ] = Grade B-
 * [ A + A + C ] = Grade C+
 * [ A + B + C ] = Grade C+
 * [ B + B + C ] = Grade C
 * [ B + C + C ] = Grade C
 * [ C + C + C ] = Grade C (Floor)
 */
export function deriveOverallGrade(
  gradeA: PillarGrade,
  gradeB: PillarGrade,
  gradeC: PillarGrade
): OverallCombatGrade {
  const grades = [gradeA, gradeB, gradeC];
  const countS = grades.filter(g => g === 'S').length;
  const countA = grades.filter(g => g === 'A').length;
  const countB = grades.filter(g => g === 'B').length;
  const countC = grades.filter(g => g === 'C').length;

  if (countS === 3) return 'S+';
  if (countS === 2 && countA === 1) return 'S';
  if (countS === 1 && countA === 2) return 'A+';
  if (countA === 3) return 'A';
  if (countS === 2 && countB === 1) return 'A';
  if (countS === 1 && countA === 1 && countB === 1) return 'A-';
  if (countA === 2 && countB === 1) return 'B+';
  if (countA === 1 && countB === 2) return 'B';
  if (countB === 3) return 'B-';
  if (countS === 2 && countC === 1) return 'B';
  if (countS === 1 && countA === 1 && countC === 1) return 'B-';
  if (countA === 2 && countC === 1) return 'C+';
  if (countA === 1 && countB === 1 && countC === 1) return 'C+';
  if (countB === 2 && countC === 1) return 'C';
  if (countB === 1 && countC === 2) return 'C';
  if (countS === 1 && countC === 2) return 'C';
  if (countC === 3) return 'C';

  // Fallback safe floor
  return 'C';
}

/**
 * Clash Cash Reward Scaling:
 * - S+ / S Rank: +$450 to +$600 Clash Cash
 * - A Rank: +$300 to +$400 Clash Cash
 * - B Rank: +$200 to +$250 Clash Cash
 * - C Rank: +$100 to +$150 Clash Cash
 */
export function calculateCashPayout(
  overallGrade: OverallCombatGrade,
  isPlayerWinner: boolean,
  isTournament: boolean = false,
  isRanked: boolean = false
): number {
  let baseCash = 250;

  switch (overallGrade) {
    case 'S+':
      baseCash = 600;
      break;
    case 'S':
      baseCash = 500;
      break;
    case 'A+':
      baseCash = 400;
      break;
    case 'A':
      baseCash = 350;
      break;
    case 'A-':
      baseCash = 300;
      break;
    case 'B+':
      baseCash = 250;
      break;
    case 'B':
      baseCash = 225;
      break;
    case 'B-':
      baseCash = 200;
      break;
    case 'C+':
      baseCash = 150;
      break;
    case 'C':
    default:
      baseCash = 100;
      break;
  }

  if (isTournament) {
    baseCash = Math.round(baseCash * 1.5);
  } else if (isRanked) {
    baseCash = Math.round(baseCash * 1.2);
  }

  if (!isPlayerWinner) {
    baseCash = Math.max(50, Math.round(baseCash * 0.40));
  }

  return baseCash;
}

/**
 * Master Post-Match Evaluation Runner
 */
export function evaluateMatchPerformance(input: EvaluationInput): MatchEvaluationResult {
  const pillarA = evaluatePillarA(input.strikesLanded, input.strikesThrown);
  const pillarB = evaluatePillarB(
    input.isPlayerWinner,
    input.playerFinalHp,
    input.playerMaxHp,
    input.earlyDamageDealtPct
  );
  const pillarC = evaluatePillarC(input.durationSec);

  const overallGrade = deriveOverallGrade(pillarA.grade, pillarB.grade, pillarC.grade);
  const gradeCategory = overallGrade.startsWith('S') ? 'S' : overallGrade.startsWith('A') ? 'A' : overallGrade.startsWith('B') ? 'B' : 'C';

  const cashPayout = calculateCashPayout(
    overallGrade,
    input.isPlayerWinner,
    input.isTournament,
    input.isRanked
  );

  let title = 'BOUT CONCLUDED';
  let flavorText = 'Tactical parameters archived.';

  if (input.isPlayerWinner) {
    if (overallGrade === 'S+' || overallGrade === 'S') {
      title = 'SUPREME DOMINATION';
      flavorText = 'Peak martial precision with immaculate ring command.';
    } else if (overallGrade.startsWith('A')) {
      title = 'DECISIVE CONQUEST';
      flavorText = 'Overwhelming tactical superiority across key exchanges.';
    } else if (overallGrade.startsWith('B')) {
      title = 'HARD-FOUGHT CONQUEST';
      flavorText = 'Grit, perseverance, and relentless pressure earned the victory.';
    } else {
      title = 'CONTESTED SURVIVAL';
      flavorText = 'A sloppy victory, but your hand was raised.';
    }
  } else {
    title = 'DEFEAT ARCHIVED';
    flavorText = 'Review telemetry, adapt guard stance, and strike back.';
  }

  return {
    pillarA,
    pillarB,
    pillarC,
    overallGrade,
    gradeCategory,
    cashPayout,
    title,
    flavorText,
  };
}
