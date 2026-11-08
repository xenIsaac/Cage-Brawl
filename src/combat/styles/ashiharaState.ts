// Ashihara style state manager (src/combat/styles/ashiharaState.ts)

export interface AshiharaFighterState {
  ashiharaRecoveryTimer: number;
  ashiharaCounterActive: boolean;
}

export function updateAshiharaState(fighter: AshiharaFighterState, dt: number): void {
  if (fighter.ashiharaRecoveryTimer > 0) {
    fighter.ashiharaRecoveryTimer = Math.max(0, fighter.ashiharaRecoveryTimer - dt);
    if (fighter.ashiharaRecoveryTimer === 0) {
      fighter.ashiharaCounterActive = false;
    }
  }
}
