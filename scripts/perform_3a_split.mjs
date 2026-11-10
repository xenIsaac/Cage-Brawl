import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const arenaPath = path.resolve('src/components/Arena.tsx');
const lines = fs.readFileSync(arenaPath, 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.includes('const updatePhysics = () => {'));
console.log('updatePhysics start line (1-indexed):', startIdx + 1);

const preCheckStart = lines.findIndex((l, i) => i > startIdx && l.includes("if ((matchData?.isCompetitive || matchData?.isAiMatch) && state.rankedState !== 'fighting')"));
const screenStart = lines.findIndex((l, i) => i > preCheckStart && l.includes("// 1. Screenshake, shaky vision and vision blur decay"));
const playerStart = lines.findIndex((l, i) => i > screenStart && l.includes("// 2. Update Player Physics"));
const dummyStart = lines.findIndex((l, i) => i > playerStart && l.includes("// 3. Update Sparring Dummy Physics"));
const particleStart = lines.findIndex((l, i) => i > dummyStart && l.includes("// 4. Update visual particle objects"));

let endIdx = -1;
for (let i = particleStart; i < particleStart + 30; i++) {
  if (lines[i].trim() === '};') {
    endIdx = i;
    break;
  }
}

console.log('preCheckStart line:', preCheckStart + 1);
console.log('screenStart line:', screenStart + 1);
console.log('playerStart line:', playerStart + 1);
console.log('dummyStart line:', dummyStart + 1);
console.log('particleStart line:', particleStart + 1);
console.log('endIdx line:', endIdx + 1);

if (endIdx === -1) {
  console.error('Failed to locate endIdx!');
  process.exit(1);
}

function hashBody(linesArr) {
  const norm = linesArr.join('\n').replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update(norm).digest('hex').substring(0, 16);
}

const preCheckLines = lines.slice(preCheckStart, screenStart);
const screenLines = lines.slice(screenStart, playerStart);
const playerLines = lines.slice(playerStart, dummyStart);
const dummyLines = lines.slice(dummyStart, particleStart);
const particleLines = lines.slice(particleStart, endIdx);

const chunkHashes = {
  updatePhysics_original: hashBody(lines.slice(startIdx, endIdx + 1)),
  updatePhysicsPreChecks_before: hashBody(preCheckLines),
  updateScreenAndGamemodePhysics_before: hashBody(screenLines),
  updatePlayerPhysics_before: hashBody(playerLines),
  updateDummyPhysics_before: hashBody(dummyLines),
  updateParticlePhysics_before: hashBody(particleLines),
};

console.log('Original chunk hashes:\n', JSON.stringify(chunkHashes, null, 2));

// Sub-functions in place
const newPreCheck = [
  '  const updatePhysicsPreChecks = (): boolean => {',
  '    const state = stateRef.current;',
  '    const player = state.player;',
  '    const dummy = state.dummy;',
  ...preCheckLines.map(l => {
    if (l.trim() === 'return;' && (l.includes('        return;') || l.includes('      return;'))) {
      return l.replace('return;', 'return true;');
    }
    return l;
  }),
  '    return false;',
  '  };',
  ''
];

const newScreen = [
  '  const updateScreenAndGamemodePhysics = (): void => {',
  '    const state = stateRef.current;',
  ...screenLines,
  '  };',
  ''
];

const newPlayer = [
  '  const updatePlayerPhysics = (): void => {',
  '    const state = stateRef.current;',
  '    const player = state.player;',
  '    const dummy = state.dummy;',
  '    const arenaSize = state.arenaSize;',
  ...playerLines,
  '  };',
  ''
];

const newDummy = [
  '  const updateDummyPhysics = (): void => {',
  '    const state = stateRef.current;',
  '    const player = state.player;',
  '    const dummy = state.dummy;',
  '    const arenaSize = state.arenaSize;',
  ...dummyLines,
  '  };',
  ''
];

const newParticle = [
  '  const updateParticlePhysics = (): void => {',
  '    const state = stateRef.current;',
  ...particleLines,
  '  };',
  ''
];

const newUpdatePhysics = [
  '  // Main Arena Physics Update Loop (Phase 3A: Orchestration of named sub-functions)',
  '  const updatePhysics = () => {',
  '    if (updatePhysicsPreChecks()) return;',
  '    updateScreenAndGamemodePhysics();',
  '    updatePlayerPhysics();',
  '    updateDummyPhysics();',
  '    updateParticlePhysics();',
  '  };'
];

const before = lines.slice(0, startIdx);
const after = lines.slice(endIdx + 1);

const resultLines = [
  ...before,
  ...newPreCheck,
  ...newScreen,
  ...newPlayer,
  ...newDummy,
  ...newParticle,
  ...newUpdatePhysics,
  ...after
];

console.log('Before lines count:', lines.length);
console.log('After lines count:', resultLines.length);

fs.writeFileSync(arenaPath, resultLines.join('\n'), 'utf8');
console.log('✅ Wrote 3A split to Arena.tsx');
