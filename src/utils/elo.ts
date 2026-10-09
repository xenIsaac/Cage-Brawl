import { RoundReport, RankedAiEloBreakdown, RoundGrade, OverallMatchGrade } from '../types';
import { evaluateRankedAiTrajectory, MatchEvaluationTelemetry, INITIAL_SKILL_MILESTONES, SkillMilestone } from './evaluationEngine';

export { evaluateRankedAiTrajectory, INITIAL_SKILL_MILESTONES };
export type { SkillMilestone, MatchEvaluationTelemetry };

/**
 * Competitive Ranked Elo & Tier System
 */

export interface RankInfo {
  name: string;
  tierName: string;
  color: string;
  borderColor: string;
  bgGlow: string;
  icon: string;
  baseGain: number;
  currentElo: number;
  minElo: number;
  maxElo: number | null;
  progressToNextTier: number; // 0 to 100 %
}

export function getRankInfo(elo: number, isTestPlayer = false): RankInfo {
  const currentElo = Math.max(0, Math.round(elo));

  // 1. UNRANKED (Test Players 0-100 Elo)
  if (isTestPlayer && currentElo < 100) {
    const progress = Math.min(100, Math.max(0, (currentElo / 100) * 100));
    return {
      name: 'Unranked',
      tierName: 'Unranked',
      color: '#9ca3af',
      borderColor: '#6b7280',
      bgGlow: 'rgba(156, 163, 175, 0.2)',
      icon: '⚪',
      baseGain: 50,
      currentElo,
      minElo: 0,
      maxElo: 100,
      progressToNextTier: progress,
    };
  }

  // 2. ROOKIE (100 - 500 Elo, 5 Tiers I-V, 100 Elo per tier)
  if (currentElo < 500) {
    const effectiveElo = Math.max(100, currentElo);
    const tierIdx = Math.min(4, Math.floor((effectiveElo - 100) / 100));
    const tierLabels = ['I', 'II', 'III', 'IV', 'V'];
    const tierMin = 100 + tierIdx * 100;
    const progress = Math.min(100, Math.max(0, ((effectiveElo - tierMin) / 100) * 100));

    return {
      name: 'Rookie',
      tierName: `Rookie ${tierLabels[tierIdx]}`,
      color: '#ef4444',
      borderColor: '#f87171',
      bgGlow: 'rgba(239, 68, 68, 0.25)',
      icon: '🥊',
      baseGain: 30,
      currentElo,
      minElo: 100,
      maxElo: 500,
      progressToNextTier: progress,
    };
  }

  // 3. COPPER / BRONZE (500 - 700 Elo, 4 Tiers I-IV, 50 Elo per tier)
  if (currentElo < 700) {
    const tierIdx = Math.min(3, Math.floor((currentElo - 500) / 50));
    const tierLabels = ['I', 'II', 'III', 'IV'];
    const tierMin = 500 + tierIdx * 50;
    const tierSpan = 50;
    const progress = Math.min(100, Math.max(0, ((currentElo - tierMin) / tierSpan) * 100));

    return {
      name: 'Copper',
      tierName: `Copper ${tierLabels[tierIdx]}`,
      color: '#d97706',
      borderColor: '#f59e0b',
      bgGlow: 'rgba(217, 119, 6, 0.25)',
      icon: '🛡️',
      baseGain: 25,
      currentElo,
      minElo: 500,
      maxElo: 700,
      progressToNextTier: progress,
    };
  }

  // 4. SILVER (700 - 1000 Elo, 3 Tiers I-III, 100 Elo per tier)
  if (currentElo < 1000) {
    const tierIdx = Math.min(2, Math.floor((currentElo - 700) / 100));
    const tierLabels = ['I', 'II', 'III'];
    const tierMin = 700 + tierIdx * 100;
    const progress = Math.min(100, Math.max(0, ((currentElo - tierMin) / 100) * 100));

    return {
      name: 'Silver',
      tierName: `Silver ${tierLabels[tierIdx]}`,
      color: '#cbd5e1',
      borderColor: '#e2e8f0',
      bgGlow: 'rgba(203, 213, 225, 0.25)',
      icon: '⚔️',
      baseGain: 20,
      currentElo,
      minElo: 700,
      maxElo: 1000,
      progressToNextTier: progress,
    };
  }

  // 5. GOLD (1000 - 1500 Elo, 5 Tiers I-V, 100 Elo per tier)
  if (currentElo < 1500) {
    const tierIdx = Math.min(4, Math.floor((currentElo - 1000) / 100));
    const tierLabels = ['I', 'II', 'III', 'IV', 'V'];
    const tierMin = 1000 + tierIdx * 100;
    const progress = Math.min(100, Math.max(0, ((currentElo - tierMin) / 100) * 100));

    return {
      name: 'Gold',
      tierName: `Gold ${tierLabels[tierIdx]}`,
      color: '#eab308',
      borderColor: '#fde047',
      bgGlow: 'rgba(234, 179, 8, 0.3)',
      icon: '🏆',
      baseGain: 15,
      currentElo,
      minElo: 1000,
      maxElo: 1500,
      progressToNextTier: progress,
    };
  }

  // 6. DIAMOND (1500 - 1850 Elo, 5 Tiers I-V: 70 Elo per tier)
  if (currentElo < 1850) {
    const tierIdx = Math.min(4, Math.floor((currentElo - 1500) / 70));
    const tierLabels = ['I', 'II', 'III', 'IV', 'V'];
    const tierMin = 1500 + tierIdx * 70;
    const progress = Math.min(100, Math.max(0, ((currentElo - tierMin) / 70) * 100));

    return {
      name: 'Diamond',
      tierName: `Diamond ${tierLabels[tierIdx]}`,
      color: '#38bdf8',
      borderColor: '#7dd3fc',
      bgGlow: 'rgba(56, 189, 248, 0.35)',
      icon: '💎',
      baseGain: 10,
      currentElo,
      minElo: 1500,
      maxElo: 1850,
      progressToNextTier: progress,
    };
  }

  // 7. AMETHYST (1850 - 2200 Elo, 3 Tiers Z-ZZZ, 116 Elo per tier)
  if (currentElo < 2200) {
    const tierIdx = Math.min(2, Math.floor((currentElo - 1850) / 116.6));
    const tierLabels = ['Z', 'ZZ', 'ZZZ'];
    const tierMin = 1850 + tierIdx * 116.6;
    const progress = Math.min(100, Math.max(0, ((currentElo - tierMin) / 116.6) * 100));

    return {
      name: 'Amethyst',
      tierName: `Amethyst ${tierLabels[tierIdx]}`,
      color: '#a855f7',
      borderColor: '#c084fc',
      bgGlow: 'rgba(168, 85, 247, 0.4)',
      icon: '🔮',
      baseGain: 6,
      currentElo,
      minElo: 1850,
      maxElo: 2200,
      progressToNextTier: progress,
    };
  }

  // 8. OBSIDIAN APEX (2200+ Elo, Limitless)
  const obsidianProgress = Math.min(100, Math.max(0, ((currentElo - 2200) / 500) * 100));
  return {
    name: 'Obsidian',
    tierName: 'Obsidian Apex',
    color: '#a855f7',
    borderColor: '#7c3aed',
    bgGlow: 'rgba(124, 58, 237, 0.5)',
    icon: '👑',
    baseGain: 3,
    currentElo,
    minElo: 2200,
    maxElo: null,
    progressToNextTier: obsidianProgress,
  };
}

export interface DivisionRiskProfile {
  division: string;
  minElo: number;
  maxElo: number | null;
  minWinPct: number;
  maxWinPct: number;
  minLossPct: number;
  maxLossPct: number;
}

export function getDivisionRiskProfile(elo: number): DivisionRiskProfile {
  const currentElo = Math.max(0, Math.round(elo));
  if (currentElo < 700) {
    return {
      division: 'Copper / Bronze',
      minElo: 0,
      maxElo: 699,
      minWinPct: 3.0,
      maxWinPct: 8.0,
      minLossPct: 1.0,
      maxLossPct: 2.0,
    };
  }
  if (currentElo < 1000) {
    return {
      division: 'Silver',
      minElo: 700,
      maxElo: 999,
      minWinPct: 2.5,
      maxWinPct: 6.5,
      minLossPct: 2.0,
      maxLossPct: 3.5,
    };
  }
  if (currentElo < 1500) {
    return {
      division: 'Gold',
      minElo: 1000,
      maxElo: 1499,
      minWinPct: 2.0,
      maxWinPct: 5.5,
      minLossPct: 3.0,
      maxLossPct: 5.0,
    };
  }
  if (currentElo < 1850) {
    return {
      division: 'Diamond',
      minElo: 1500,
      maxElo: 1849,
      minWinPct: 1.5,
      maxWinPct: 4.5,
      minLossPct: 4.0,
      maxLossPct: 6.5,
    };
  }
  if (currentElo < 2200) {
    return {
      division: 'Amethyst',
      minElo: 1850,
      maxElo: 2199,
      minWinPct: 1.2,
      maxWinPct: 4.0,
      minLossPct: 5.5,
      maxLossPct: 8.0,
    };
  }
  return {
    division: 'Obsidian (Apex)',
    minElo: 2200,
    maxElo: null,
    minWinPct: 1.0,
    maxWinPct: 3.5,
    minLossPct: 7.0,
    maxLossPct: 10.0,
  };
}

export function calculateWinEloGain(
  elo: number, 
  isTestPlayer = false,
  modifier: 'reduced' | 'standard' | 'increased' | number = 'standard'
): number {
  const rank = getRankInfo(elo, isTestPlayer);
  let mult = 1.0;
  if (typeof modifier === 'number') {
    mult = modifier;
  } else if (modifier === 'reduced') {
    mult = 0.70;
  } else if (modifier === 'increased') {
    mult = 1.35;
  }
  return Math.max(1, Math.round(rank.baseGain * mult));
}

export function calculateLossEloLoss(
  elo: number,
  lossStreak: number,
  isTestPlayer = false
): { eloLoss: number; lossTier: 'normal' | 'mitigated' | 'protected'; multiplier: number } {
  const rank = getRankInfo(elo, isTestPlayer);
  const baseGain = rank.baseGain;

  let multiplier = 1.30;
  let lossTier: 'normal' | 'mitigated' | 'protected' = 'normal';

  if (elo < 1500) {
    multiplier = 0.60;
    lossTier = 'protected';
  } else {
    if (lossStreak >= 6) {
      multiplier = 0.60;
      lossTier = 'protected';
    } else if (lossStreak >= 4) {
      multiplier = 1.10;
      lossTier = 'mitigated';
    }
  }

  const eloLoss = Math.max(1, Math.round(baseGain * multiplier));
  return { eloLoss, lossTier, multiplier };
}

export function evaluateRoundGrade(
  winner: 'player' | 'opponent',
  damageDealt: number,
  damageTaken: number,
  durationSec: number,
  parries: number,
  dominancePct: number = 50,
  minPlayerHpPct: number = 100,
  isClutchComeback: boolean = false,
  heavies: number = 0,
  lights: number = 0
): { grade: RoundGrade; gradeText: string; summaryBullets: string[] } {
  const isWon = winner === 'player';
  const durationStr = `${Math.floor(durationSec / 60)}:${(durationSec % 60).toString().padStart(2, '0')}s`;

  if (isWon) {
    const isFlawless = damageTaken === 0;

    // S+ : Flawless Masterclass: Absolute domination, near-zero damage taken, high forward aggression, continuous combo strings
    if (isFlawless || (damageTaken <= 15 && dominancePct >= 75 && durationSec <= 40)) {
      return {
        grade: 'S+',
        gradeText: 'Flawless Masterclass',
        summaryBullets: [
          `${durationStr} ${durationSec <= 30 ? 'Fast Finish' : 'Mastery'}`,
          `${Math.max(85, Math.min(99, dominancePct))}% Dominance`,
          isFlawless ? 'Zero Damage Taken' : 'Continuous Rush'
        ]
      };
    }

    // S : Dominant Victory: Clean pacing, high hit efficiency, controlled spacing, or an intense comeback win (<25% HP)
    if (isClutchComeback || (minPlayerHpPct <= 25 && durationSec >= 35) || (damageTaken <= 35 && dominancePct >= 60) || (damageDealt >= 80 && parries >= 2)) {
      if (isClutchComeback || minPlayerHpPct <= 25) {
        return {
          grade: 'S',
          gradeText: 'Clutch Comeback',
          summaryBullets: [
            `${durationStr} Long War`,
            `Clutch Comeback at ${minPlayerHpPct}% HP!`,
            parries > 0 ? `${parries} Clean Parries` : `${Math.round(damageDealt)} HP Turnaround`
          ]
        };
      }
      return {
        grade: 'S',
        gradeText: 'Dominant Victory',
        summaryBullets: [
          `${durationStr} Series`,
          `${Math.max(65, Math.min(95, dominancePct))}% Dominance`,
          parries > 0 ? `${parries} Clean Parries` : 'Clean Pacing'
        ]
      };
    }

    // A+ / A : Solid Victory: Good offensive rhythm, out-struck the AI, moderate chip or traded blows
    if (dominancePct >= 65 || (parries >= 2 && damageDealt > damageTaken)) {
      return {
        grade: 'A+',
        gradeText: 'High Offensive Rhythm',
        summaryBullets: [
          `${durationStr} Series`,
          'Heavy Strike Exchanges',
          parries > 0 ? `${parries} Clean Parries` : `${Math.max(60, Math.min(90, dominancePct))}% Control`
        ]
      };
    }

    if (damageDealt >= damageTaken * 1.25 || dominancePct >= 50 || durationSec <= 50) {
      return {
        grade: 'A',
        gradeText: 'Solid Victory',
        summaryBullets: [
          `${durationStr} Series`,
          'Out-Struck Opponent',
          `${Math.round(damageDealt)} HP Inflicted`
        ]
      };
    }

    // B : Scrappy Round: Inconsistent momentum, traded heavy hits, played overly passive
    return {
      grade: 'B',
      gradeText: 'Scrappy Round',
      summaryBullets: [
        `${durationStr} Battle`,
        'Traded Heavy Blows',
        `${Math.round(damageTaken)} HP Absorbed`
      ]
    };
  } else {
    // Loss
    if (damageDealt >= 75 || minPlayerHpPct <= 15) {
      return {
        grade: 'B',
        gradeText: 'Close Round',
        summaryBullets: [
          'Hard-Fought Defeat',
          `${Math.round(damageDealt)} HP Inflicted`,
          'Narrow Loss'
        ]
      };
    }
    return {
      grade: 'C',
      gradeText: 'Heavy Pressure',
      summaryBullets: [
        'Round Lost',
        'Heavy Guard Pressure Suffered',
        `${Math.round(damageTaken)} HP Taken`
      ]
    };
  }
}

export function calculateRankedAiEloBreakdown(
  currentElo: number,
  isWinner: boolean,
  currentStreak: number, // current winstreak (if winning) or current loss streak (if losing)
  roundReports: RoundReport[],
  telemetryOverride?: Partial<MatchEvaluationTelemetry>
): RankedAiEloBreakdown {
  const totalRounds = Math.max(1, roundReports.length);
  const playerWins = roundReports.filter(r => r.winner === 'player').length;
  const opponentWins = roundReports.filter(r => r.winner === 'opponent').length;
  const totalDamageDealt = roundReports.reduce((s, r) => s + (r.damageDealt || 0), 0);
  const totalDamageTaken = roundReports.reduce((s, r) => s + (r.damageTaken || 0), 0);
  const totalParries = roundReports.reduce((s, r) => s + (r.parriesLanded || 0), 0);
  const flawlessRounds = roundReports.filter(r => r.winner === 'player' && r.isFlawless).length;

  const fullTelemetry: MatchEvaluationTelemetry = {
    isWin: isWinner,
    totalRounds,
    playerWins,
    opponentWins,
    totalDamageDealt,
    totalDamageTaken,
    totalParries,
    whiffPunishes: telemetryOverride?.whiffPunishes ?? 0,
    guardBreaks: telemetryOverride?.guardBreaks ?? 0,
    forwardPressurePct: telemetryOverride?.forwardPressurePct ?? (isWinner ? 70 : 45),
    fullM1Chains: telemetryOverride?.fullM1Chains ?? 0,
    postureBreaks: telemetryOverride?.postureBreaks ?? 0,
    playerMinPosturePct: telemetryOverride?.playerMinPosturePct ?? 100,
    flawlessRounds,
    counterHits: telemetryOverride?.counterHits ?? 0,
    roundReports,
    currentAiElo: currentElo,
    currentStreak,
    ...telemetryOverride,
  };

  return evaluateRankedAiTrajectory(fullTelemetry);
}

