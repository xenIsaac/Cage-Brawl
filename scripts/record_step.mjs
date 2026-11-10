import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const step = process.argv[2];
if (!step) {
  console.error('Usage: node scripts/record_step.mjs <step_prefix> (e.g. 03a)');
  process.exit(1);
}

const reportsDir = path.resolve('reports/extraction');
fs.mkdirSync(reportsDir, { recursive: true });

console.log(`=== Recording verification outputs for step: ${step} ===`);

// 1. tsc
console.log('Running tsc --noEmit...');
let tscOutput = '';
try {
  tscOutput = execSync('npx tsc --noEmit', { encoding: 'utf8' });
  console.log('✅ tsc passed.');
} catch (err) {
  tscOutput = (err.stdout || '') + '\n' + (err.stderr || '') + '\n' + err.message;
  console.error('❌ tsc failed.');
}
fs.writeFileSync(path.join(reportsDir, `${step}_tsc.txt`), tscOutput || 'TypeScript compilation succeeded with 0 errors.\n');

// 2. build
console.log('Running vite build...');
let buildOutput = '';
try {
  buildOutput = execSync('npx vite build', { encoding: 'utf8' });
  console.log('✅ build passed.');
} catch (err) {
  buildOutput = (err.stdout || '') + '\n' + (err.stderr || '') + '\n' + err.message;
  console.error('❌ build failed.');
}
fs.writeFileSync(path.join(reportsDir, `${step}_build.txt`), buildOutput);

// 3. tests
console.log('Running vitest...');
let testOutput = '';
try {
  testOutput = execSync('npx vitest run', { encoding: 'utf8' });
  console.log('✅ tests passed.');
} catch (err) {
  testOutput = (err.stdout || '') + '\n' + (err.stderr || '') + '\n' + err.message;
  console.error('❌ tests failed.');
}
fs.writeFileSync(path.join(reportsDir, `${step}_tests.txt`), testOutput);

// 4. metrics
console.log('Collecting metrics...');
try {
  const metricsOutput = execSync('node scripts/metrics.mjs', { encoding: 'utf8' });
  fs.writeFileSync(path.join(reportsDir, `${step}_metrics.json`), metricsOutput);
  console.log('✅ metrics recorded.');
} catch (err) {
  console.error('❌ metrics failed:', err);
}

// 5. replay (if replay runner exists)
if (fs.existsSync('scripts/replay.mjs')) {
  console.log('Running replays...');
  try {
    execSync('node scripts/replay.mjs', { encoding: 'utf8' });
    if (fs.existsSync('replays/00_replay.json')) {
      const replayData = fs.readFileSync('replays/00_replay.json', 'utf8');
      fs.writeFileSync(path.join(reportsDir, `${step}_replay.json`), replayData);
      console.log('✅ replays recorded.');
    }
  } catch (err) {
    console.error('❌ replays failed:', err);
  }
}

console.log(`=== Step ${step} raw outputs successfully recorded in ${reportsDir} ===`);
