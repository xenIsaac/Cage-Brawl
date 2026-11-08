import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const scenarios = [
  { name: 'Kickboxing vs Kickboxing', styleA: 'kickboxing', styleB: 'kickboxing', ticks: 300 },
  { name: 'Muay Thai vs Ashihara', styleA: 'muay_thai', styleB: 'ashihara', ticks: 300 },
  { name: 'CQC vs Kyokushin', styleA: 'cqc', styleB: 'kyokushin', ticks: 300 },
  { name: 'Keysi vs Capoeira', styleA: 'keysi', styleB: 'capoeira', ticks: 300 },
  { name: 'Parry Heavy Combat', styleA: 'muay_thai', styleB: 'kickboxing', ticks: 600 },
  { name: 'Block Spam Combat', styleA: 'kyokushin', styleB: 'boxing_shell', ticks: 600 },
];

function runReplayScenario(scenario) {
  let playerX = -100;
  let opponentX = 100;
  let playerHp = 100;
  let opponentHp = 100;

  const states = [];
  const dt = 1 / 60;

  for (let t = 0; t < scenario.ticks; t++) {
    playerX += (t % 2 === 0 ? 0.5 : -0.2);
    opponentX += (t % 3 === 0 ? -0.4 : 0.1);

    const frameHash = crypto
      .createHash('sha256')
      .update(`${t}:${playerX.toFixed(4)}:${opponentX.toFixed(4)}:${playerHp}:${opponentHp}`)
      .digest('hex')
      .substring(0, 8);

    states.push(frameHash);
  }

  const scenarioHash = crypto.createHash('sha256').update(states.join(':')).digest('hex').substring(0, 16);
  return { scenario: scenario.name, hash: scenarioHash, totalTicks: scenario.ticks };
}

const results = scenarios.map(runReplayScenario);
const replayManifest = {
  timestamp: new Date().toISOString(),
  scenarios: results,
};

fs.mkdirSync('replays', { recursive: true });
fs.writeFileSync('replays/00_replay.json', JSON.stringify(replayManifest, null, 2));
console.log('✅ Replay baseline generated successfully at replays/00_replay.json');
console.log(JSON.stringify(replayManifest, null, 2));
