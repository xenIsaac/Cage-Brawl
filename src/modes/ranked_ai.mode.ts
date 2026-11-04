// ============================================================================
// RANKED AI MODE CONTROLLER (src/modes/ranked_ai.mode.ts)
// Trajectory engine (C-SSS) & percentage Elo calculations
// ============================================================================

export type RankedGrade = 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';

export interface TrajectoryEvaluation {
  grade: RankedGrade;
  eloDelta: number;
  combatEfficiency: number;
  parryAccuracyPercent: number;
}

export class RankedAIModeController {
  public evaluatePerformance(
    damageDealt: number,
    damageTaken: number,
    parriesLanded: number,
    totalAttacksReceived: number,
    durationSec: number
  ): TrajectoryEvaluation {
    const parryAccuracy = totalAttacksReceived > 0 ? (parriesLanded / totalAttacksReceived) * 100 : 0;
    const combatEfficiency = damageTaken > 0 ? damageDealt / damageTaken : damageDealt / 10;

    let grade: RankedGrade = 'C';
    let eloDelta = 15;

    if (combatEfficiency >= 4.0 && parryAccuracy >= 60) {
      grade = 'SSS';
      eloDelta = 45;
    } else if (combatEfficiency >= 3.0 && parryAccuracy >= 45) {
      grade = 'SS';
      eloDelta = 35;
    } else if (combatEfficiency >= 2.0 && parryAccuracy >= 30) {
      grade = 'S';
      eloDelta = 28;
    } else if (combatEfficiency >= 1.5) {
      grade = 'A';
      eloDelta = 22;
    } else if (combatEfficiency >= 1.0) {
      grade = 'B';
      eloDelta = 18;
    }

    return {
      grade,
      eloDelta,
      combatEfficiency,
      parryAccuracyPercent: Math.min(100, Math.round(parryAccuracy)),
    };
  }
}
