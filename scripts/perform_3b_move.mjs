import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const arenaPath = path.resolve('src/components/Arena.tsx');
const arenaContent = fs.readFileSync(arenaPath, 'utf8');
const lines = arenaContent.split('\n');

const preCheckStart = lines.findIndex(l => l.includes('const updatePhysicsPreChecks ='));
const screenStart = lines.findIndex(l => l.includes('const updateScreenAndGamemodePhysics ='));
const playerStart = lines.findIndex(l => l.includes('const updatePlayerPhysics ='));
const dummyStart = lines.findIndex(l => l.includes('const updateDummyPhysics ='));
const particleStart = lines.findIndex(l => l.includes('const updateParticlePhysics ='));
const updatePhysicsStart = lines.findIndex(l => l.includes('const updatePhysics = () => {'));

// find closing brace of updatePhysics
let updatePhysicsEnd = -1;
for (let i = updatePhysicsStart; i < updatePhysicsStart + 30; i++) {
  if (lines[i].trim() === '};') {
    updatePhysicsEnd = i;
    break;
  }
}

console.log({
  preCheckStart: preCheckStart + 1,
  screenStart: screenStart + 1,
  playerStart: playerStart + 1,
  dummyStart: dummyStart + 1,
  particleStart: particleStart + 1,
  updatePhysicsStart: updatePhysicsStart + 1,
  updatePhysicsEnd: updatePhysicsEnd + 1,
});

function getFunctionInnerBody(startIdx, endIdx) {
  // slice inside the function signature and closing brace
  // startIdx + 1 to endIdx - 1
  return lines.slice(startIdx + 1, endIdx);
}

function findClosingBrace(startIdx, nextFnStart) {
  for (let i = nextFnStart - 1; i >= startIdx; i--) {
    if (lines[i].trim() === '};') return i;
  }
  return nextFnStart - 1;
}

const preCheckEnd = findClosingBrace(preCheckStart, screenStart);
const screenEnd = findClosingBrace(screenStart, playerStart);
const playerEnd = findClosingBrace(playerStart, dummyStart);
const dummyEnd = findClosingBrace(dummyStart, particleStart);
const particleEnd = findClosingBrace(particleStart, updatePhysicsStart);

const preCheckBody = getFunctionInnerBody(preCheckStart, preCheckEnd);
const screenBody = getFunctionInnerBody(screenStart, screenEnd);
const playerBody = getFunctionInnerBody(playerStart, playerEnd);
const dummyBody = getFunctionInnerBody(dummyStart, dummyEnd);
const particleBody = getFunctionInnerBody(particleStart, particleEnd);

function hashLines(arr) {
  const norm = arr.join('\n').replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update(norm).digest('hex').substring(0, 16);
}

console.log('Sub-function inner body hashes:');
console.log('preCheckBody:', hashLines(preCheckBody), preCheckBody.length, 'lines');
console.log('screenBody:', hashLines(screenBody), screenBody.length, 'lines');
console.log('playerBody:', hashLines(playerBody), playerBody.length, 'lines');
console.log('dummyBody:', hashLines(dummyBody), dummyBody.length, 'lines');
console.log('particleBody:', hashLines(particleBody), particleBody.length, 'lines');

fs.mkdirSync('src/combat/simulation', { recursive: true });

// 1. preChecks.ts
const preChecksCode = `import { resetFighterRoundState } from '../combatEngine';
import { updateImpactFrame } from '../impactFrame';

export const updatePhysicsPreChecks = (
  state: any,
  player: any,
  dummy: any,
  matchData?: any,
  dummyBehavior?: string
): boolean => {
${preCheckBody.join('\n')}
};
`;
fs.writeFileSync('src/combat/simulation/preChecks.ts', preChecksCode, 'utf8');

// 2. screenAndGamemode.ts
const screenCode = `export const updateScreenAndGamemodePhysics = (
  state: any,
  matchData: any,
  settings: any,
  soundManager: any,
  spawnFloatingText: any,
  handleRoundWinner: any,
  setPotatoFuseLeft: any
): void => {
${screenBody.join('\n')}
};
`;
fs.writeFileSync('src/combat/simulation/screenAndGamemode.ts', screenCode, 'utf8');

// 3. playerPhysics.ts
const playerCode = `import { getHeightModifiers } from '../../utils/heightModifiers';
import { updateFighterStaminaAndTimers } from '../staminaEngine';
import { isFighterInIFrames } from '../hitResolution';
import { evaluateParry } from '../parry';
import { QuestTracker } from '../../utils/questTracker';
import { FIGHTING_STYLES } from '../../data/styles';

export const updatePlayerPhysics = (
  state: any,
  player: any,
  dummy: any,
  arenaSize: number,
  matchData: any,
  settings: any,
  soundManager: any,
  spawnFloatingText: any,
  userEmail: any,
  syncCombatStatesToUI: any,
  matchTotalFramesRef: any,
  matchForwardFramesRef: any,
  matchParriesLandedRef: any
): void => {
${playerBody.join('\n')}
};
`;
fs.writeFileSync('src/combat/simulation/playerPhysics.ts', playerCode, 'utf8');

// 4. dummyPhysics.ts
const dummyCode = `import { getHeightModifiers } from '../../utils/heightModifiers';
import { updateFighterStaminaAndTimers } from '../staminaEngine';
import { isFighterInIFrames } from '../hitResolution';
import { evaluateParry } from '../parry';
import { FIGHTING_STYLES } from '../../data/styles';

export const updateDummyPhysics = (
  state: any,
  player: any,
  dummy: any,
  arenaSize: number,
  matchData: any,
  dummyBehavior: any,
  settings: any,
  soundManager: any,
  spawnFloatingText: any,
  syncCombatStatesToUI: any,
  matchParriesLandedRef: any
): void => {
${dummyBody.join('\n')}
};
`;
fs.writeFileSync('src/combat/simulation/dummyPhysics.ts', dummyCode, 'utf8');

// 5. particlePhysics.ts
const particleCode = `export const updateParticlePhysics = (state: any): void => {
${particleBody.join('\n')}
};
`;
fs.writeFileSync('src/combat/simulation/particlePhysics.ts', particleCode, 'utf8');

// 6. simulation/index.ts
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
  matchTotalFramesRef?: { current: number };
  matchForwardFramesRef?: { current: number };
  matchParriesLandedRef?: { current: number };
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
    context.matchData,
    context.settings || { screenShake: 1 },
    context.soundManager,
    context.spawnFloatingText,
    context.userEmail || 'anon',
    context.syncCombatStatesToUI,
    context.matchTotalFramesRef || { current: 0 },
    context.matchForwardFramesRef || { current: 0 },
    context.matchParriesLandedRef || { current: 0 }
  );

  updateDummyPhysics(
    state,
    player,
    dummy,
    arenaSize,
    context.matchData,
    context.dummyBehavior || 'passive',
    context.settings || { screenShake: 1 },
    context.soundManager,
    context.spawnFloatingText,
    context.syncCombatStatesToUI,
    context.matchParriesLandedRef || { current: 0 }
  );

  updateParticlePhysics(state);
}
`;
fs.writeFileSync('src/combat/simulation/index.ts', simIndexCode, 'utf8');

// Update Arena.tsx
// Replace lines from preCheckStart to updatePhysicsEnd with the call to runPhysicsSimulation!
const arenaBefore = lines.slice(0, preCheckStart);
const arenaAfter = lines.slice(updatePhysicsEnd + 1);

const arenaReplacement = [
  '  // Main Arena Physics Update Loop (Phase 3B: Evicted to src/combat/simulation/)',
  '  const updatePhysics = () => {',
  '    runPhysicsSimulation(stateRef.current, {',
  '      matchData,',
  '      dummyBehavior,',
  '      settings: settingsRef.current,',
  '      soundManager,',
  '      spawnFloatingText,',
  '      handleRoundWinner,',
  '      setPotatoFuseLeft,',
  '      userEmail,',
  '      syncCombatStatesToUI,',
  '      matchTotalFramesRef,',
  '      matchForwardFramesRef,',
  '      matchParriesLandedRef,',
  '    });',
  '  };'
];

// Add import of runPhysicsSimulation to Arena.tsx if not present
let finalBefore = arenaBefore.join('\n');
if (!finalBefore.includes('runPhysicsSimulation')) {
  finalBefore = "import { runPhysicsSimulation } from '../combat/simulation';\n" + finalBefore;
}

const finalArena = finalBefore + '\n' + arenaReplacement.join('\n') + '\n' + arenaAfter.join('\n');
fs.writeFileSync(arenaPath, finalArena, 'utf8');

console.log('✅ Phase 3B move completed successfully!');
console.log('Arena.tsx line count now:', finalArena.split('\n').length);
