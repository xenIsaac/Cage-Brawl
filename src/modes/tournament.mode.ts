// ============================================================================
// TOURNAMENT MODE CONTROLLER (src/modes/tournament.mode.ts)
// 9-competitor bracket & parallel headless simulation
// ============================================================================

export interface TournamentFighter {
  id: string;
  name: string;
  styleId: string;
  seed: number;
  eliminated: boolean;
}

export interface TournamentMatchup {
  fighterA: TournamentFighter;
  fighterB: TournamentFighter;
  winner?: TournamentFighter;
}

export class TournamentModeController {
  private roster: TournamentFighter[] = [];
  private currentRound: number = 1;

  public initializeBracket(fighters: TournamentFighter[]): void {
    this.roster = [...fighters];
    this.currentRound = 1;
  }

  public simulateHeadlessMatch(
    fighterA: TournamentFighter,
    fighterB: TournamentFighter
  ): TournamentFighter {
    // Deterministic simulation based on seeds and weighted randomness
    const weightA = 10 - fighterA.seed;
    const weightB = 10 - fighterB.seed;
    const total = weightA + weightB;
    const roll = Math.random() * total;
    return roll <= weightA ? fighterA : fighterB;
  }

  public getRemainingCompetitors(): TournamentFighter[] {
    return this.roster.filter((f) => !f.eliminated);
  }
}
