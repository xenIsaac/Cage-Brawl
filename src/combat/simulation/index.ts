import { updatePhysicsPreChecks } from './preChecks';
import { updateScreenAndGamemodePhysics } from './screenAndGamemode';
import { updatePlayerPhysics } from './playerPhysics';
import { updateDummyPhysics } from './dummyPhysics';
import { updateParticlePhysics } from './particlePhysics';

export * from './preChecks';
export * from './screenAndGamemode';
export * from './playerPhysics';
export * from './dummyPhysics';
export * from './particlePhysics';

export interface SimulationContext {
  matchData?: any;
  dummyBehavior?: string;
  settings?: any;
  soundManager?: any;
  spawnFloatingText?: (x: number, y: number, text: string, color: string) => void;
  handleRoundWinner?: (winner: 'player' | 'opponent') => void;
  setPotatoFuseLeft?: (seconds: number) => void;
  userEmail?: string;
  syncCombatStatesToUI?: () => void;
  isTouchDevice?: boolean;
  triggerKOCinematic?: (attacker: any, defender: any) => void;
  triggerPlayerLightAttack?: () => void;
  executePlayerHeavyAttack?: () => void;
  executeDummyHeavyAttack?: () => void;
  setIsPlayerBlocking?: (blocking: boolean) => void;
  setTotalDamageDealt?: (fn: (d: number) => number) => void;
  setTotalHitsLanded?: (fn: (h: number) => number) => void;
  setTotalParries?: (fn: (p: number) => number) => void;
  matchTotalFramesRef?: { current: number };
  matchForwardFramesRef?: { current: number };
  matchParriesLandedRef?: { current: number };
  roundParriesLandedRef?: { current: number };
  matchPostureBreaksRef?: { current: number };
  playerMinPosturePctRef?: { current: number };
  QuestTracker?: { trackEvent: (email: string, evt: any) => void };
}

export function runPhysicsSimulation(state: any, context: SimulationContext = {}): void {
  if (!state) return;
  const player = state.player;
  const dummy = state.dummy;
  const arenaSize = state.arenaSize;

  if (updatePhysicsPreChecks(state, player, dummy, context.matchData, context.dummyBehavior || 'passive')) {
    return;
  }

  updateScreenAndGamemodePhysics(
    state,
    context.matchData,
    context.settings || { screenShake: 1 },
    context.soundManager,
    context.spawnFloatingText,
    context.handleRoundWinner,
    context.setPotatoFuseLeft
  );

  updatePlayerPhysics(
    state,
    player,
    dummy,
    arenaSize,
    context
  );

  updateDummyPhysics(
    state,
    player,
    dummy,
    arenaSize,
    context
  );

  updateParticlePhysics(state);
}
