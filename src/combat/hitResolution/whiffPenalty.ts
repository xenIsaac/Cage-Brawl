// Heavy attack whiff penalty helper module (src/combat/hitResolution/whiffPenalty.ts)

export function applyHeavyWhiffPenalty(fighter: any): void {
  if (!fighter) return;

  // Apply whiff recovery lockout
  fighter.postS4HeavyLockout = 20; // 20 frames lockout on whiff
  fighter.heavyCooldown = Math.max(fighter.heavyCooldown || 0, 30); // 30 frames minimum cooldown

  // Capoeira whiff penalty
  if (fighter.styleId === 'capoeira') {
    fighter.capoeiraExhausted = true;
    fighter.capoeiraExhaustTimer = 1.5; // 1.5s penalty timer
  }
}

export function finalizeKickboxingM2Cooldown(fighter: any, hitLanded: boolean): void {
  if (!fighter || fighter.styleId !== 'kickboxing') return;
  if (!hitLanded) {
    fighter.heavyCooldown = 480; // Full 8s cooldown on whiff
  } else {
    fighter.heavyCooldown = 240; // 50% reduced cooldown on hit
  }
}
