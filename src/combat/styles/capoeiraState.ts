// Capoeira style state manager (src/combat/styles/capoeiraState.ts)

export interface CapoeiraFighterState {
  capoeiraExhausted: boolean;
  capoeiraExhaustTimer: number;
  capoeiraDodgeStacks: number;
  capoeiraDodgeFlashTime: number;
  capoeiraRegenTimer: number;
  capoeiraWhiffBonusActive: boolean;
  capoeiraS3IFrameTimer: number;
}

export function updateCapoeiraState(fighter: CapoeiraFighterState, dt: number): void {
  if (fighter.capoeiraExhaustTimer > 0) {
    fighter.capoeiraExhaustTimer = Math.max(0, fighter.capoeiraExhaustTimer - dt);
    if (fighter.capoeiraExhaustTimer === 0) {
      fighter.capoeiraExhausted = false;
    }
  }

  if (fighter.capoeiraDodgeFlashTime > 0) {
    fighter.capoeiraDodgeFlashTime = Math.max(0, fighter.capoeiraDodgeFlashTime - dt);
  }

  if (fighter.capoeiraS3IFrameTimer > 0) {
    fighter.capoeiraS3IFrameTimer = Math.max(0, fighter.capoeiraS3IFrameTimer - dt);
  }

  if (fighter.capoeiraDodgeStacks < 3) {
    fighter.capoeiraRegenTimer += dt;
    if (fighter.capoeiraRegenTimer >= 4.0) {
      fighter.capoeiraDodgeStacks = Math.min(3, fighter.capoeiraDodgeStacks + 1);
      fighter.capoeiraRegenTimer = 0;
    }
  }
}
