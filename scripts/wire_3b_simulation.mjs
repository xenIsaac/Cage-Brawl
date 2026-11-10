import fs from 'node:fs';
import path from 'node:path';

// 1. preChecks.ts
const preChecksLines = fs.readFileSync('src/combat/simulation/preChecks.ts', 'utf8').split('\n');
// remove duplicate declarations of state, player, dummy inside the body if present
const cleanedPreChecks = [
  "import { resetFighterRoundState } from '../combatEngine';",
  "import { updateImpactFrame } from '../impactFrame';",
  "",
  "export const updatePhysicsPreChecks = (",
  "  state: any,",
  "  player: any,",
  "  dummy: any,",
  "  matchData?: any,",
  "  dummyBehavior?: string",
  "): boolean => {",
  ...preChecksLines.filter(l => {
    const t = l.trim();
    if (t === 'const state = stateRef.current;') return false;
    if (t === 'const player = state.player;') return false;
    if (t === 'const dummy = state.dummy;') return false;
    if (t.startsWith('import ') || t.startsWith('export const updatePhysicsPreChecks')) return false;
    if (t === '};' && l === preChecksLines[preChecksLines.length - 2]) return false;
    return true;
  }),
  "};",
  ""
];
fs.writeFileSync('src/combat/simulation/preChecks.ts', cleanedPreChecks.join('\n'), 'utf8');

// 2. screenAndGamemode.ts
const screenLines = fs.readFileSync('src/combat/simulation/screenAndGamemode.ts', 'utf8').split('\n');
const cleanedScreen = [
  "export const updateScreenAndGamemodePhysics = (",
  "  state: any,",
  "  matchData: any,",
  "  settings: any,",
  "  soundManager: any,",
  "  spawnFloatingText: any,",
  "  handleRoundWinner: any,",
  "  setPotatoFuseLeft: any",
  "): void => {",
  ...screenLines.filter(l => {
    const t = l.trim();
    if (t === 'const state = stateRef.current;') return false;
    if (t.startsWith('export const updateScreenAndGamemodePhysics')) return false;
    if (t === '};' && l === screenLines[screenLines.length - 2]) return false;
    return true;
  }),
  "};",
  ""
];
fs.writeFileSync('src/combat/simulation/screenAndGamemode.ts', cleanedScreen.join('\n'), 'utf8');

// 3. playerPhysics.ts
const playerLines = fs.readFileSync('src/combat/simulation/playerPhysics.ts', 'utf8').split('\n');
const playerBodyLines = playerLines.filter(l => {
  const t = l.trim();
  if (t.startsWith('import ') || t.startsWith('export const updatePlayerPhysics')) return false;
  if (t === 'const state = stateRef.current;') return false;
  if (t === 'const player = state.player;') return false;
  if (t === 'const dummy = state.dummy;') return false;
  if (t === 'const arenaSize = state.arenaSize;') return false;
  return true;
});
if (playerBodyLines[playerBodyLines.length - 1]?.trim() === '};') {
  playerBodyLines.pop();
}

const cleanedPlayer = [
  "import { getHeightModifiers } from '../../utils/heightModifiers';",
  "import { updateFighterStaminaAndTimers } from '../staminaEngine';",
  "import { isFighterInIFrames } from '../hitResolution';",
  "import { applyHeavyWhiffPenalty, finalizeKickboxingM2Cooldown } from '../hitResolution/whiffPenalty';",
  "import { evaluateParry } from '../parry';",
  "import { QuestTracker } from '../../utils/questTracker';",
  "import { FIGHTING_STYLES } from '../../data/styles';",
  "import { BASE_MOVEMENT_FORCE, BASE_MOVEMENT_SPEED, BLOCK_COOLDOWN_FRAMES } from '../rules';",
  "import { applyDamageCombatLocks, canFighterRaiseGuard, updateFighterSteering } from '../combatEngine';",
  "import { calculateAsymmetricalRetractionDelta, getStyleM1BetweenCooldown, getStyleM1Speeds } from '../stats.config';",
  "import { checkDirectionalBlock } from '../blockEngine';",
  "import { isImpactFrameActive } from '../impactFrame';",
  "import { tickStreetBoxingAutoBurst } from '../combat.fixes';",
  "import { getMatchModeKey } from '../../utils/matchMode';",
  "",
  "export const updatePlayerPhysics = (",
  "  state: any,",
  "  player: any,",
  "  dummy: any,",
  "  arenaSize: number,",
  "  context: any = {}",
  "): void => {",
  "  const stateRef = { current: state };",
  "  const {",
  "    matchData,",
  "    dummyBehavior = 'passive',",
  "    settings = { screenShake: 1 },",
  "    soundManager,",
  "    spawnFloatingText = () => {},",
  "    userEmail = 'anon',",
  "    syncCombatStatesToUI = () => {},",
  "    isTouchDevice = false,",
  "    triggerKOCinematic = () => {},",
  "    triggerPlayerLightAttack = () => {},",
  "    executePlayerHeavyAttack = () => {},",
  "    setIsPlayerBlocking = () => {},",
  "    setTotalDamageDealt = () => {},",
  "    setTotalHitsLanded = () => {},",
  "    setTotalParries = () => {},",
  "    matchTotalFramesRef = { current: 0 },",
  "    matchForwardFramesRef = { current: 0 },",
  "    matchParriesLandedRef = { current: 0 },",
  "    roundParriesLandedRef = { current: 0 },",
  "    matchPostureBreaksRef = { current: 0 },",
  "    playerMinPosturePctRef = { current: 100 },",
  "  } = context;",
  ...playerBodyLines,
  "};",
  ""
];
fs.writeFileSync('src/combat/simulation/playerPhysics.ts', cleanedPlayer.join('\n'), 'utf8');

// 4. dummyPhysics.ts
const dummyLines = fs.readFileSync('src/combat/simulation/dummyPhysics.ts', 'utf8').split('\n');
const dummyBodyLines = dummyLines.filter(l => {
  const t = l.trim();
  if (t.startsWith('import ') || t.startsWith('export const updateDummyPhysics')) return false;
  if (t === 'const state = stateRef.current;') return false;
  if (t === 'const player = state.player;') return false;
  if (t === 'const dummy = state.dummy;') return false;
  if (t === 'const arenaSize = state.arenaSize;') return false;
  return true;
});
if (dummyBodyLines[dummyBodyLines.length - 1]?.trim() === '};') {
  dummyBodyLines.pop();
}

const cleanedDummy = [
  "import { getHeightModifiers } from '../../utils/heightModifiers';",
  "import { updateFighterStaminaAndTimers } from '../staminaEngine';",
  "import { isFighterInIFrames } from '../hitResolution';",
  "import { applyHeavyWhiffPenalty, finalizeKickboxingM2Cooldown } from '../hitResolution/whiffPenalty';",
  "import { evaluateParry } from '../parry';",
  "import { FIGHTING_STYLES } from '../../data/styles';",
  "import { BASE_MOVEMENT_FORCE, BASE_MOVEMENT_SPEED, BLOCK_COOLDOWN_FRAMES } from '../rules';",
  "import { applyDamageCombatLocks, canFighterRaiseGuard, updateFighterSteering } from '../combatEngine';",
  "import { calculateAsymmetricalRetractionDelta, getStyleM1BetweenCooldown, getStyleM1Speeds } from '../stats.config';",
  "import { checkDirectionalBlock } from '../blockEngine';",
  "import { isImpactFrameActive } from '../impactFrame';",
  "import { tickStreetBoxingAutoBurst } from '../combat.fixes';",
  "",
  "export const updateDummyPhysics = (",
  "  state: any,",
  "  player: any,",
  "  dummy: any,",
  "  arenaSize: number,",
  "  context: any = {}",
  "): void => {",
  "  const stateRef = { current: state };",
  "  const {",
  "    matchData,",
  "    dummyBehavior = 'passive',",
  "    settings = { screenShake: 1 },",
  "    soundManager,",
  "    spawnFloatingText = () => {},",
  "    syncCombatStatesToUI = () => {},",
  "    executeDummyHeavyAttack = () => {},",
  "    matchParriesLandedRef = { current: 0 },",
  "  } = context;",
  ...dummyBodyLines,
  "};",
  ""
];
fs.writeFileSync('src/combat/simulation/dummyPhysics.ts', cleanedDummy.join('\n'), 'utf8');

// 5. simulation/index.ts
const simIndexCode = `import { updatePhysicsPreChecks } from './preChecks';
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
`;
fs.writeFileSync('src/combat/simulation/index.ts', simIndexCode, 'utf8');

// Update Arena.tsx updatePhysics body
const arenaPath2 = 'src/components/Arena.tsx';
let arenaContent2 = fs.readFileSync(arenaPath2, 'utf8');
const updatePhysicsSearch = '  const updatePhysics = () => {';
const updatePhysicsIdx = arenaContent2.indexOf(updatePhysicsSearch);
const nextSection = '  const detectSparringCollisions';
const nextSectionIdx = arenaContent2.indexOf(nextSection);

if (updatePhysicsIdx !== -1 && nextSectionIdx !== -1) {
  const replacement = `  // Main Arena Physics Update Loop (Phase 3B: Evicted to src/combat/simulation/)
  const updatePhysics = () => {
    runPhysicsSimulation(stateRef.current, {
      matchData,
      dummyBehavior,
      settings: settingsRef.current,
      soundManager,
      spawnFloatingText,
      handleRoundWinner,
      setPotatoFuseLeft,
      userEmail,
      syncCombatStatesToUI,
      isTouchDevice,
      triggerKOCinematic,
      triggerPlayerLightAttack,
      executePlayerHeavyAttack,
      executeDummyHeavyAttack,
      setIsPlayerBlocking,
      setTotalDamageDealt,
      setTotalHitsLanded,
      setTotalParries,
      matchTotalFramesRef,
      matchForwardFramesRef,
      matchParriesLandedRef,
      roundParriesLandedRef,
      matchPostureBreaksRef,
      playerMinPosturePctRef,
    });
  };

  // -----------------------------------------------------
  // SECTION 9.1 BLOCK #3: COLLISION & HITBOX ENGINE
  // -----------------------------------------------------
`;
  arenaContent2 = arenaContent2.substring(0, updatePhysicsIdx) + replacement + arenaContent2.substring(nextSectionIdx);
  fs.writeFileSync(arenaPath2, arenaContent2, 'utf8');
}

console.log('✅ wire_3b_simulation completed!');
