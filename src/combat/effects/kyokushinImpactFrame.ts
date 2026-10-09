import { Fighter } from '../../types';

export function isKyokushinImpactActive(): boolean {
  return false;
}

export function isKyokushinImpactSilhouette(): boolean {
  return false;
}

/**
 * Kyokushin Karate M2 impact frames have been replaced by the Purple Electrical Spiral debuff FX.
 */
export function triggerKyokushinHitImpact(
  _attacker: Fighter,
  defender: Fighter,
  _hitX: number,
  _hitY: number,
  _kbX: number,
  _kbY: number
): void {
  // Set Purple Electrical Spiral debuff for 2.5s (150 frames)
  defender.kyokushinSpiralTimer = 150;
  defender.crippleTime = 720; // 12.0s Cripple slow
}

export function updateKyokushinImpact(_gameTime: number): void {
  // No full-screen impact frame freeze
}

export function renderKyokushinImpactBackground(
  _ctx: CanvasRenderingContext2D,
  _arenaSize: number
): void {
  // Full-screen black and white shatter removed
}

export function renderKyokushinImpactForeground(_ctx: CanvasRenderingContext2D): void {
  // Clutter removed
}
