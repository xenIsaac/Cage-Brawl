import { Fighter } from '../../types';
import { FighterTrailStore, TrailRenderParams } from './types';

const flowBoxingTrailMap = new WeakMap<Fighter, FighterTrailStore>();

export function renderFlowBoxingHandTrail(params: TrailRenderParams): void {
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

  if (!isLeft) return;

  let store = flowBoxingTrailMap.get(fighter);
  if (!store) {
    store = { left: [], right: [] };
    flowBoxingTrailMap.set(fighter, store);
  }

  const trailList = store.left;
  const isBoostActive = !!fighter.flowS3ParryBaited;

  if (isBoostActive) {
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

    if (trailList.length > 20) {
      trailList.pop();
    }
  } else {
    if (trailList.length > 0) {
      for (const pt of trailList) {
        pt.alpha *= 0.85;
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

  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(trailList[0].worldFx, trailList[0].worldFy);
  for (let i = 1; i < trailList.length; i++) {
    ctx.lineTo(trailList[i].worldFx, trailList[i].worldFy);
  }
  ctx.strokeStyle = `rgba(239, 68, 68, ${0.80 * avgAlpha})`;
  ctx.lineWidth = 5.8;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(trailList[0].worldFx, trailList[0].worldFy);
  for (let i = 1; i < trailList.length; i++) {
    ctx.lineTo(trailList[i].worldFx, trailList[i].worldFy);
  }
  ctx.strokeStyle = `rgba(220, 38, 38, ${0.95 * avgAlpha})`;
  ctx.lineWidth = 3.6;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(trailList[0].worldFx, trailList[0].worldFy);
  for (let i = 1; i < trailList.length; i++) {
    ctx.lineTo(trailList[i].worldFx, trailList[i].worldFy);
  }
  ctx.strokeStyle = `rgba(254, 226, 226, ${0.90 * avgAlpha})`;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  for (let i = 1; i < Math.min(trailList.length, 12); i += 2) {
    const pt = trailList[i];
    const fade = (1 - i / 12) * pt.alpha;
    ctx.fillStyle = `rgba(255, 100, 100, ${fade * 0.75})`;
    ctx.beginPath();
    ctx.arc(pt.worldFx, pt.worldFy, 2.5 * fade, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
