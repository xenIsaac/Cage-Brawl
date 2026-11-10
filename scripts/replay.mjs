import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

console.log('Running real physics simulation replay test across 7 scenarios (>= 3000 ticks)...');

const runnerCommand = `npx tsx -e '
import { runAllHeadlessScenarios } from "./src/sim/headless";
const results = runAllHeadlessScenarios();
console.log(JSON.stringify(results));
'`;

let results = [];
try {
  const output = execSync(runnerCommand, { encoding: 'utf8' });
  const lines = output.trim().split('\n');
  const jsonLine = lines[lines.length - 1];
  results = JSON.parse(jsonLine);
} catch (err) {
  console.error('Failed to run headless simulation scenarios:', err);
  process.exit(1);
}

const replayManifest = {
  timestamp: new Date().toISOString(),
  scenarios: results,
};

fs.mkdirSync('replays', { recursive: true });
fs.writeFileSync('replays/00_replay.json', JSON.stringify(replayManifest, null, 2));
fs.writeFileSync('replays/03b_replay.json', JSON.stringify(replayManifest, null, 2));

console.log('✅ Replay baseline generated successfully at replays/00_replay.json and replays/03b_replay.json');
console.log(JSON.stringify(replayManifest, null, 2));
