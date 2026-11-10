import fs from 'node:fs';
import path from 'node:path';

const arenaPath = path.resolve('src/components/Arena.tsx');
const lines = fs.readFileSync(arenaPath, 'utf8').split('\n');

const functions = [];
let currentFunc = null;

lines.forEach((line, index) => {
  const lineNo = index + 1;
  const match = line.match(/^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)|^\s*(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z0-9_]+)(?:\s*:\s*[^{=>]+)?\s*=>/);
  if (match) {
    const name = match[1] || match[2];
    functions.push({ name, startLine: lineNo });
  }
});

for (let i = 0; i < functions.length; i++) {
  const nextStart = functions[i + 1] ? functions[i + 1].startLine - 1 : lines.length;
  functions[i].endLine = nextStart;
  functions[i].lines = functions[i].endLine - functions[i].startLine + 1;
}

console.log(JSON.stringify({ totalFunctions: functions.length, functions }, null, 2));
