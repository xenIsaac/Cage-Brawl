import { RoundReport, OverallMatchGrade, RankedAiEloBreakdown } from '../types';
import { getRankInfo, getDivisionRiskProfile } from './elo';

export interface MatchEvaluationTelemetry {
  isWin: boolean;
  totalRounds: number;
  playerWins: number;
  opponentWins: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  totalParries: number;
  whiffPunishes: number;
  guardBreaks: number;
  forwardPressurePct: number;
  fullM1Chains: number;
  postureBreaks: number;
  playerMinPosturePct: number;
  flawlessRounds: number;
  counterHits: number;
  roundReports: RoundReport[];
  currentAiElo: number;
  currentStreak: number;
}

export interface SkillMilestone {
  id: string;
  codename: string;
  name: string;
  description: string;
  benefit: string;
  rewardType: 'GRADE_BUMP' | 'ELO_PERCENT_BOOST' | 'LOSS_PROTECTION';
  value: number; // e.g. 1 for 1 sub-grade bump, 0.10 for +10% elo yield boost
  condition: (telemetry: MatchEvaluationTelemetry) => boolean;
}

export interface TriggeredMilestone {
  id: string;
  codename: string;
  name: string;
  benefit: string;
  rewardType: 'GRADE_BUMP' | 'ELO_PERCENT_BOOST' | 'LOSS_PROTECTION';
  value: number;
}

/**
 * Section 5.8.4: Initial 8 Expandable Skill Milestones
 */
export const INITIAL_SKILL_MILESTONES: SkillMilestone[] = [
  {
    id: 'parry_maestro',
    codename: 'Parry Maestro',
    name: 'Parry Maestro',
    description: 'Land 3+ Perfect Parries (0.19s) in a single match',
    benefit: '+1 Sub-Grade Bump',
    rewardType: 'GRADE_BUMP',
    value: 1,
    condition: (t) => t.totalParries >= 3,
  },
  {
    id: 'whiff_punisher',
    codename: 'Whiff Punisher',
    name: 'Whiff Punisher',
    description: 'Hit the AI during their heavy attack whiff recovery 2+ times',
    benefit: '+1 Sub-Grade Bump',
    rewardType: 'GRADE_BUMP',
    value: 1,
    condition: (t) => t.whiffPunishes >= 2,
  },
  {
    id: 'guard_breaker',
    codename: 'Guard Breaker',
    name: 'Guard Breaker',
    description: "Successfully shatter the AI's guard/armor pool",
    benefit: '+10% Bonus Elo Yield',
    rewardType: 'ELO_PERCENT_BOOST',
    value: 0.10,
    condition: (t) => t.guardBreaks >= 1,
  },
  {
    id: 'forward_pressure',
    codename: 'Forward Pressure',
    name: 'Forward Pressure',
    description: 'Maintain forward vector movement for 65%+ of the match',
    benefit: 'Loss Grade Protection',
    rewardType: 'LOSS_PROTECTION',
    value: 1,
    condition: (t) => t.forwardPressurePct >= 65,
  },
  {
    id: 'combo_technician',
    codename: 'Combo Technician',
    name: 'Combo Technician',
    description: 'Land a full 4-hit M1 sequence confirm 3+ times without missing',
    benefit: '+1 Sub-Grade Bump',
    rewardType: 'GRADE_BUMP',
    value: 1,
    condition: (t) => t.fullM1Chains >= 3,
  },
  {
    id: 'posture_dominator',
    codename: 'Posture Dominator',
    name: 'Posture Dominator',
    description: "Deplete the AI's posture to full reset while retaining 50%+ of your own",
    benefit: '+5% Bonus Elo Yield',
    rewardType: 'ELO_PERCENT_BOOST',
    value: 0.05,
    condition: (t) => t.postureBreaks >= 1 && t.playerMinPosturePct >= 50,
  },
  {
    id: 'untouchable_round',
    codename: 'Untouchable Round',
    name: 'Untouchable Round',
    description: 'Win a round taking ZERO damage (Flawless)',
    benefit: '1-Full Grade Leap',
    rewardType: 'GRADE_BUMP',
    value: 2, // 2 Sub-Grade bumps = full grade leap
    condition: (t) => t.flawlessRounds >= 1,
  },
  {
    id: 'counter_king',
    codename: 'Counter King',
    name: 'Counter King',
    description: 'Interrupt an active enemy M1 startup using an M2 counter strike',
    benefit: '+1 Sub-Grade Bump',
    rewardType: 'GRADE_BUMP',
    value: 1,
    condition: (t) => t.counterHits >= 1,
  },
];

/**
 * Standard Sub-Grade Hierarchy for Progressive Bumps
 */
export const SUB_GRADE_HIERARCHY: OverallMatchGrade[] = [
  'C',
  'B',
  'A',
  'S',
  'SS',
  'SSS'
];

/**
 * Maps Round Grade to Base Tactical Points
 */
function getRoundBasePoints(report: RoundReport): number {
  let score = 500;
  switch (report.grade) {
    case 'S+': score = 950; break;
    case 'S': score = 850; break;
    case 'A+': score = 750; break;
    case 'A': score = 650; break;
    case 'B': score = 450; break;
    case 'C': score = 200; break;
  }

  // Won round bonus
  if (report.winner === 'player') {
    score += 100;
  }

  // Dominance modifier
  const dom = report.dominancePct ?? 50;
  score += Math.round((dom - 50) * 1.5);

  // Parries bonus
  score += (report.parriesLanded || 0) * 20;

  // Flawless round bonus
  if (report.isFlawless) {
    score += 80;
  }

  // Section 5.8.3: Clutch Resolve Multiplier (<20% HP Comeback)
  // Winning a round after falling below 20% HP triggers +150 Tactical Points
  if (report.winner === 'player' && (report.isClutchComeback || (report.minPlayerHpPct !== undefined && report.minPlayerHpPct <= 20))) {
    score += 150;
  }

  return Math.max(50, score);
}

/**
 * Section 5.8.2: Escalating Trajectory Weights
 * 5 Rounds: R1 (10%), R2 (15%), R3 (25%), R4 (25%), R5 (25%)
 */
function getTrajectoryWeights(totalRounds: number): number[] {
  if (totalRounds <= 1) return [1.0];
  if (totalRounds === 2) return [0.35, 0.65];
  if (totalRounds === 3) return [0.20, 0.35, 0.45];
  if (totalRounds === 4) return [0.12, 0.18, 0.35, 0.35];
  
  // 5+ Rounds default specification:
  const weights = [0.10, 0.15, 0.25, 0.25, 0.25];
  while (weights.length < totalRounds) {
    weights.push(0.25);
  }
  // Normalize to 1.0
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map(w => w / sum);
}

/**
 * Section 5.8: Ranked AI Evaluation Engine 4.0
 * Calculates Trajectory Curve, Clean Eraser, and Skill Milestones
 */
export function evaluateRankedAiTrajectory(telemetry: MatchEvaluationTelemetry): RankedAiEloBreakdown {
  const {
    isWin,
    roundReports,
    currentAiElo,
    currentStreak,
  } = telemetry;

  const effectiveElo = Math.max(500, Math.round(currentAiElo));
  const rank = getRankInfo(currentAiElo);
  const riskProfile = getDivisionRiskProfile(currentAiElo);

  // 1. Calculate tactical points for each round
  interface ScoredRound {
    report: RoundReport;
    originalIndex: number;
    score: number;
    isCleanWin: boolean; // >= 80% HP remaining
    isErased?: boolean;
  }

  const scoredRounds: ScoredRound[] = roundReports.map((rep, idx) => {
    const isCleanWin = rep.winner === 'player' && (
      rep.isFlawless || 
      (rep.minPlayerHpPct !== undefined && rep.minPlayerHpPct >= 80) || 
      rep.damageTaken <= (rep.damageDealt * 0.25)
    );
    return {
      report: rep,
      originalIndex: idx,
      score: getRoundBasePoints(rep),
      isCleanWin,
    };
  });

  // 2. Section 5.8.3: Pillar 2: Dominance Overwrite (The Clean Eraser)
  // If player won any round with >= 80% HP remaining, delete single lowest-scoring round entirely
  const hasCleanRound = scoredRounds.some(r => r.isCleanWin);
  let erasedRoundNumber: number | null = null;
  let activeRounds = [...scoredRounds];

  if (hasCleanRound && scoredRounds.length > 1) {
    // Find single lowest scoring round
    let lowestIdx = 0;
    let lowestScore = scoredRounds[0].score;
    for (let i = 1; i < scoredRounds.length; i++) {
      if (scoredRounds[i].score < lowestScore) {
        lowestScore = scoredRounds[i].score;
        lowestIdx = i;
      }
    }
    // Only erase if lowest round is below a high threshold (so it actually helps)
    if (lowestScore < 850) {
      erasedRoundNumber = scoredRounds[lowestIdx].report.roundNumber;
      scoredRounds[lowestIdx].isErased = true;
      activeRounds = scoredRounds.filter((_, idx) => idx !== lowestIdx);
    }
  }

  // 3. Section 5.8.2: Pillar 1: Weighted Round Trajectory
  // Reverse-Sweep Multiplier (0-2 deficit -> 3-2 victory):
  // Detect if player lost R1 & R2 and then won R3, R4, R5 (or any 0-2 to 3-2 comeback)
  const isReverseSweep = roundReports.length >= 5 &&
    roundReports[0].winner !== 'player' &&
    roundReports[1].winner !== 'player' &&
    roundReports[2].winner === 'player' &&
    roundReports[3].winner === 'player' &&
    roundReports[4].winner === 'player';

  if (isReverseSweep) {
    // Discount early round losses by 60%
    activeRounds.forEach((r) => {
      if (r.report.winner !== 'player') {
        r.score = Math.round(r.score + (900 - r.score) * 0.60);
      }
    });
  }

  const weights = getTrajectoryWeights(activeRounds.length);
  let finalBaseScore = 0;
  activeRounds.forEach((round, i) => {
    finalBaseScore += round.score * weights[i];
  });
  finalBaseScore = Math.round(finalBaseScore);

  // 4. Map Final Base Score to Baseline Grade
  let baseGradeIndex = 1; // 'B'
  if (finalBaseScore >= 900) {
    baseGradeIndex = 4; // 'S'
  } else if (finalBaseScore >= 750) {
    baseGradeIndex = 3; // 'A+'
  } else if (finalBaseScore >= 620) {
    baseGradeIndex = 2; // 'A'
  } else if (finalBaseScore >= 420) {
    baseGradeIndex = 1; // 'B'
  } else {
    baseGradeIndex = 0; // 'C'
  }

  // Reverse sweep S/S+ round evaluation guarantee
  if (isReverseSweep) {
    const winningRoundsHigh = roundReports.slice(2).every(r => r.grade === 'S' || r.grade === 'S+' || r.grade === 'A+');
    if (winningRoundsHigh && baseGradeIndex < 4) {
      baseGradeIndex = 4; // Guaranteed Grade S / SS
    }
  }

  // If winner swept cleanly without losing any round, ensure minimum base A
  if (isWin && telemetry.opponentWins === 0 && baseGradeIndex < 2) {
    baseGradeIndex = 2;
  }

  // 5. Section 5.8.4: Pillar 3: Expandable Skill Milestone Matrix
  const triggeredMilestones: TriggeredMilestone[] = [];
  let totalGradeBumps = 0;
  let bonusEloYieldPct = 0;
  let hasLossProtection = false;

  INITIAL_SKILL_MILESTONES.forEach(ms => {
    try {
      if (ms.condition(telemetry)) {
        triggeredMilestones.push({
          id: ms.id,
          codename: ms.codename,
          name: ms.name,
          benefit: ms.benefit,
          rewardType: ms.rewardType,
          value: ms.value,
        });

        if (ms.rewardType === 'GRADE_BUMP') {
          totalGradeBumps += ms.value;
        } else if (ms.rewardType === 'ELO_PERCENT_BOOST') {
          bonusEloYieldPct += ms.value;
        } else if (ms.rewardType === 'LOSS_PROTECTION') {
          hasLossProtection = true;
        }
      }
    } catch (e) {
      console.error(`Error evaluating milestone ${ms.id}:`, e);
    }
  });

  // Apply Sub-Grade Bumps
  let finalGradeIndex = baseGradeIndex + totalGradeBumps;
  if (hasLossProtection && !isWin && finalGradeIndex < 2) {
    // Forward Pressure protection floor on losses
    finalGradeIndex = 2; // Minimum Grade A
  }
  finalGradeIndex = Math.max(0, Math.min(SUB_GRADE_HIERARCHY.length - 1, finalGradeIndex));

  const performanceGrade = SUB_GRADE_HIERARCHY[finalGradeIndex];

  // 6. Calculate Elo Yield and Breakdown
  if (isWin) {
    const gradeMultipliers: Record<OverallMatchGrade, number> = {
      'SSS': 1.00,
      'SS': 0.88,
      'S': 0.75,
      'A': 0.55,
      'B': 0.35,
      'C': 0.15,
    };

    let performanceMultiplier = gradeMultipliers[performanceGrade] || 0.55;
    // Add bonus Elo yield percentage from Guard Breaker / Posture Dominator
    performanceMultiplier += bonusEloYieldPct;

    const minWin = riskProfile.minWinPct;
    const maxWin = riskProfile.maxWinPct;
    const yieldPct = +(minWin + (maxWin - minWin) * Math.min(1.25, performanceMultiplier)).toFixed(2);

    const baseGain = Math.round(effectiveElo * (yieldPct / 100));

    // Winstreak Multipliers
    const nextStreak = currentStreak + 1;
    let streakMultiplier = 1.00;
    let streakBonus = 0;

    if (nextStreak >= 8) {
      streakMultiplier = 1.50;
      streakBonus = 10;
    } else if (nextStreak >= 5) {
      streakMultiplier = 1.35;
      streakBonus = 0;
    } else if (nextStreak >= 3) {
      streakMultiplier = 1.15;
      streakBonus = 0;
    }

    const calculatedGain = Math.round(baseGain * streakMultiplier + streakBonus);
    const totalEloChange = Math.max(1, calculatedGain);
    const performanceBonus = Math.max(0, calculatedGain - baseGain);

    return {
      isWin: true,
      baseGain,
      yieldPct,
      performanceBonus,
      performanceGrade,
      performanceMultiplier,
      dominanceBonus: performanceBonus,
      dominanceGrade: performanceGrade,
      streakCount: nextStreak,
      streakMultiplier,
      streakBonus,
      tierName: rank.tierName,
      totalEloChange,
      roundReports,
      currentElo: currentAiElo,
      cleanEraserActive: Boolean(erasedRoundNumber),
      erasedRoundNumber,
      trajectoryScore: finalBaseScore,
      totalGradeBumps,
      extraEloYieldPct: bonusEloYieldPct,
      triggeredMilestones,
    };
  } else {
    // Loss mitigation engine
    let lossMultiplier = 1.00;
    let lossTier: 'normal' | 'mitigated' | 'protected' | 'crushed' = 'normal';
    let lossPenaltyDescription = 'Standard Loss (1.0x)';

    if (hasLossProtection || performanceGrade === 'S' || performanceGrade === 'SS' || performanceGrade === 'SSS') {
      lossMultiplier = 0.40;
      lossTier = 'protected';
      lossPenaltyDescription = 'Greatly Mitigated Loss (-60% reduction)';
    } else if (performanceGrade === 'A') {
      lossMultiplier = 0.70;
      lossTier = 'mitigated';
      lossPenaltyDescription = 'Mitigated Loss (-30% reduction)';
    } else if (performanceGrade === 'B') {
      lossMultiplier = 1.00;
      lossTier = 'normal';
      lossPenaltyDescription = 'Standard Loss (1.0x)';
    } else {
      lossMultiplier = 1.40;
      lossTier = 'crushed';
      lossPenaltyDescription = 'Crushed Loss Penalty (1.4x)';
    }

    const baseLossPct = riskProfile.minLossPct;
    const baseLoss = Math.round(effectiveElo * (baseLossPct / 100));
    const totalLoss = Math.max(1, Math.round(baseLoss * lossMultiplier));

    return {
      isWin: false,
      baseGain: baseLoss,
      baseLossPct,
      performanceBonus: 0,
      performanceGrade,
      performanceMultiplier: lossMultiplier,
      dominanceBonus: 0,
      dominanceGrade: performanceGrade,
      streakCount: 0,
      streakMultiplier: lossMultiplier,
      streakBonus: 0,
      tierName: rank.tierName,
      totalEloChange: -totalLoss,
      isLossProtected: lossTier === 'protected' || lossTier === 'mitigated',
      lossTier,
      lossMultiplier,
      lossPenaltyDescription,
      roundReports,
      currentElo: currentAiElo,
      cleanEraserActive: Boolean(erasedRoundNumber),
      erasedRoundNumber,
      trajectoryScore: finalBaseScore,
      totalGradeBumps,
      extraEloYieldPct: 0,
      triggeredMilestones,
    };
  }
}
