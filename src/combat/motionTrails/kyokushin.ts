import { Fighter } from '../../types';
import { TrailRenderParams } from './types';

/**
 * Renders Kyokushin Karate signature visual effects:
 * - Stark Silver-White Impact Rings during strikes
 * - Deep Crimson Fracture Aura indicators when guard breach threshold is high / active
 * - Kinetic absorption shockwave rings during Super M2 windup
 */
export function renderKyokushinEffects(params: TrailRenderParams): void {
  const { ctx, fighter, actualFistX, actualFistY, gloveRot, gameTime } = params;

  if (fighter.styleId !== 'kyokushin') return;

  const isSuperM2Windup = (fighter.heavyWindup || 0) > 0;
  const isBlockBreached = !!(fighter as any).isGuardBreached;
  const hitsAbsorbed = (fighter as any).kyokushinHitsAbsorbed || 0;

  ctx.save();
  ctx.rotate(-gloveRot);
  ctx.translate(-actualFistX, -actualFistY);
  ctx.rotate(-fighter.facingAngle);
  ctx.translate(-fighter.x, -fighter.y);

  // 1. Kinetic Absorption Shockwave Rings during Super M2 windup
  if (isSuperM2Windup) {
    const pulse = (Math.sin(gameTime * 0.25) + 1) * 0.5;
    ctx.shadowColor = '#e2e8f0';
    ctx.shadowBlur = 16;
    ctx.strokeStyle = `rgba(226, 232, 240, ${0.6 + pulse * 0.35})`;
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.arc(fighter.x, fighter.y, fighter.radius * (1.1 + pulse * 0.25), 0, Math.PI * 2);
    ctx.stroke();

    // Secondary Crimson Kinetic Ring if hits have been absorbed
    if (hitsAbsorbed > 0) {
      ctx.shadowColor = '#dc2626';
      ctx.strokeStyle = `rgba(220, 38, 38, ${Math.min(1.0, hitsAbsorbed * 0.25)})`;
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.arc(fighter.x, fighter.y, fighter.radius * 1.35, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // 2. Deep Crimson Guard Fracture Ring when block is active or near breach
  if (fighter.isBlocking && hitsAbsorbed > 0) {
    const fractureIntensity = Math.min(1.0, hitsAbsorbed / 4);
    ctx.shadowColor = '#dc2626';
    ctx.shadowBlur = 12 * fractureIntensity;
    ctx.strokeStyle = `rgba(220, 38, 38, ${0.4 + fractureIntensity * 0.5})`;
    ctx.lineWidth = 2.0 + fractureIntensity * 2.0;

    ctx.beginPath();
    ctx.arc(fighter.x, fighter.y, fighter.radius * 1.15, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}
