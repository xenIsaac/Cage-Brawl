// ============================================================================
// CASUAL AI MODE CONTROLLER (src/modes/casual_ai.mode.ts)
// Friendly sparring against standard AI archetypes
// ============================================================================

export interface CasualMatchConfig {
  aiDifficulty: 'easy' | 'medium' | 'hard';
  roundLimit: number;
}

export class CasualAIModeController {
  private config: CasualMatchConfig;

  constructor(config: Partial<CasualMatchConfig> = {}) {
    this.config = {
      aiDifficulty: 'medium',
      roundLimit: 3,
      ...config,
    };
  }

  public getConfig(): CasualMatchConfig {
    return { ...this.config };
  }
}
