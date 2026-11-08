// iFrames detection helper module (src/combat/hitResolution/iFrames.ts)
import { Fighter } from '../../types';

export function isFighterInIFrames(target: (Fighter & { heavyWindup?: number; isDashing?: boolean }) | null | undefined): boolean {
  if (!target) return false;
  if (target.isDashing) return true;

  // Capoeira M2 roll iFrames check
  if (target.styleId === 'capoeira' && (target.heavyWindup || 0) > 0) {
    const isM2Rolling = target.heavyWindup && target.heavyWindup > 0;
    if (isM2Rolling) return true;
  }

  // Ashihara counter stance iFrames check
  if (target.styleId === 'ashihara' && (target as any).ashiharaCounterActive) {
    return true;
  }

  return false;
}
