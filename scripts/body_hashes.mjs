import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const arenaPath = path.resolve('src/components/Arena.tsx');
const lines = fs.readFileSync(arenaPath, 'utf8').split('\n');

const functionHashes = {};
let currentFunc = null;

lines.forEach((line, index) => {
  const lineNo = index + 1;
  const match = line.match(/^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)|^\s*(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z0-9_]+)(?:\s*:\s*[^{=>]+)?\s*=>/);
  if (match) {
    if (currentFunc) {
      const body = lines.slice(currentFunc.startLine - 1, lineNo - 1).join('\n');
      const normalizedBody = body.replace(/\s+/g, ' ').trim();
      const hash = crypto.createHash('sha256').update(normalizedBody).digest('hex').substring(0, 16);
      functionHashes[currentFunc.name] = { hash, lines: lineNo - currentFunc.startLine };
    }
    const name = match[1] || match[2];
    currentFunc = { name, startLine: lineNo };
  }
});

if (currentFunc) {
  const body = lines.slice(currentFunc.startLine - 1).join('\n');
  const normalizedBody = body.replace(/\s+/g, ' ').trim();
  const hash = crypto.createHash('sha256').update(normalizedBody).digest('hex').substring(0, 16);
  functionHashes[currentFunc.name] = { hash, lines: lines.length - currentFunc.startLine + 1 };
}

console.log(JSON.stringify(functionHashes, null, 2));
