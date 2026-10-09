import { Fighter } from '../../types';
import { FighterTrailStore, TrailRenderParams } from './types';

const cqcTrailMap = new WeakMap<Fighter, FighterTrailStore>();

/**
 * Renders CQC M2 Dash vivid Red Hand Trails with dramatic follow-through.
 */
export function renderCqcHandTrail(params: TrailRenderParams): void {
  const {
    ctx,
    fighter,
    isLeft,
    worldFx,
    worldFy,
    worldEx,
    worldEy,
    worldSx,
    worldSy,
    worldHandAngle: handAngle,
    actualFistX,
    actualFistY,
    gloveRot,
    fistW,
    fistH,
    gameTime,
  } = params;

  let store = cqcTrailMap.get(fighter);
  if (!store) {
    store = { left: [], right: [] };
    cqcTrailMap.set(fighter, store);
  }

  const sideKey = isLeft ? 'left' : 'right';
  const trailList = store[sideKey];
  const isDashing = fighter.cqcM2Stage === 'dash';

  if (isDashing) {
    trailList.unshift({
      worldFx,
      worldFy,
      worldEx,
      worldEy,
      worldSx,
      worldSy,
      handAngle,
      handWidth: fistW,
      handHeight: fistH,
      time: gameTime,
      alpha: 1.0,
    });
    if (trailList.length > 24) {
      trailList.pop();
    }
  } else {
    if (trailList.length > 0) {
      for (const pt of trailList) {
        pt.alpha *= 0.88;
      }
      if (trailList[trailList.length - 1].alpha < 0.05) {
        trailList.pop();
      }
    }
  }

  if (trailList.length < 2) return;

  ctx.save();
  ctx.rotate(-gloveRot);
  ctx.translate(-actualFistX, -actualFistY);
  ctx.rotate(-fighter.facingAngle);
  ctx.translate(-fighter.x, -fighter.y);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const avgAlpha = trailList[0].alpha;

  // 1. Broad Crimson After-Glow Ribbon
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(trailList[0].worldFx, trailList[0].worldFy);
  for (let i = 1; i < trailList.length; i++) {
    ctx.lineTo(trailList[i].worldFx, trailList[i].worldFy);
  }
  ctx.strokeStyle = `rgba(239, 68, 68, ${0.75 * avgAlpha})`;
  ctx.lineWidth = 6.2;
  ctx.stroke();

  // 2. Vivid Core Red Ribbon
  ctx.beginPath();
  ctx.moveTo(trailList[0].worldFx, trailList[0].worldFy);
  for (let i = 1; i < trailList.length; i++) {
    ctx.lineTo(trailList[i].worldFx, trailList[i].worldFy);
  }
  ctx.strokeStyle = `rgba(220, 38, 38, ${0.95 * avgAlpha})`;
  ctx.lineWidth = 4.2;
  ctx.stroke();

  // 3. High-Glow Bright White-Crimson Core Line
  ctx.beginPath();
  ctx.moveTo(trailList[0].worldFx, trailList[0].worldFy);
  for (let i = 1; i < trailList.length; i++) {
    ctx.lineTo(trailList[i].worldFx, trailList[i].worldFy);
  }
  ctx.strokeStyle = `rgba(254, 202, 202, ${0.90 * avgAlpha})`;
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // 4. Vertical Hand-Length Trajectory Ribs
  for (let i = 1; i < Math.min(trailList.length, 18); i += 2) {
    const pt = trailList[i];
    const fade = (1 - i / Math.min(trailList.length, 18)) * pt.alpha;
    const perpAngle = pt.handAngle + Math.PI / 2;
    const halfH = pt.handHeight * 0.55;

    const x1 = pt.worldFx + Math.cos(perpAngle) * halfH;
    const y1 = pt.worldFy + Math.sin(perpAngle) * halfH;
    const x2 = pt.worldFx - Math.cos(perpAngle) * halfH;
    const y2 = pt.worldFy - Math.sin(perpAngle) * halfH;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = `rgba(239, 68, 68, ${fade * 0.85})`;
    ctx.lineWidth = 3.5 * fade + 1.0;
    ctx.stroke();
  }

  if (isDashing && trailList[0]) {
    const head = trailList[0];
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ff0033';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(head.worldFx, head.worldFy, 4.0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(head.worldFx, head.worldFy, 2.0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
