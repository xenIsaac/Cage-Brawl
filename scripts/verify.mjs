import { execSync } from 'node:child_process';

console.log('=== Step 1: Running TypeScript Check (tsc --noEmit) ===');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✅ TypeScript check passed.');
} catch (err) {
  console.error('❌ TypeScript check failed.');
  process.exit(1);
}

console.log('\n=== Step 2: Running Vitest Characterization Tests ===');
try {
  execSync('npm test', { stdio: 'inherit' });
  console.log('✅ All characterization tests passed.');
} catch (err) {
  console.error('❌ Vitest tests failed.');
  process.exit(1);
}

console.log('\n=== Step 3: Checking Arena Metrics ===');
try {
  execSync('node scripts/metrics.mjs', { stdio: 'inherit' });
  console.log('✅ Metrics check completed.');
} catch (err) {
  console.error('❌ Metrics check failed.');
  process.exit(1);
}

console.log('\n🎉 ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
