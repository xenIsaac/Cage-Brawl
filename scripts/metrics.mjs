import fs from 'node:fs';
import path from 'node:path';

const arenaPath = path.resolve('src/components/Arena.tsx');
const arenaContent = fs.readFileSync(arenaPath, 'utf8');

const lineCount = arenaContent.split('\n').length;
const useStateCount = (arenaContent.match(/useState\b/g) || []).length;
const useRefCount = (arenaContent.match(/useRef\b/g) || []).length;
const useEffectCount = (arenaContent.match(/useEffect\b/g) || []).length;
const asAnyCount = (arenaContent.match(/as\s+any\b/g) || []).length;
const tsIgnoreCount = (arenaContent.match(/@ts-ignore\b/g) || []).length;

const metrics = {
  file: 'src/components/Arena.tsx',
  lineCount,
  hooks: {
    useState: useStateCount,
    useRef: useRefCount,
    useEffect: useEffectCount,
    total: useStateCount + useRefCount + useEffectCount,
  },
  typingIssues: {
    asAny: asAnyCount,
    tsIgnore: tsIgnoreCount,
  },
};

console.log(JSON.stringify(metrics, null, 2));
