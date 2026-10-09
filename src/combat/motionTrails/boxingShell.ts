import { Fighter } from '../../types';
import { FighterTrailStore, TrailRenderParams } from './types';

const ironBoxingTrailMap = new WeakMap<Fighter, FighterTrailStore>();

export function renderIronBoxingHandTrail(params: TrailRenderParams): void {
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

  const isBoostActive = (fighter.shellPostureBoostTimer || 0) > 0;
  let store = ironBoxingTrailMap.get(fighter);

  if (!isBoostActive) {
    if (store) {
      store.left = [];
      store.right = [];
    }
    return;
  }

  if (!store) {
    store = { left: [], right: [] };
    ironBoxingTrailMap.set(fighter, store);
  }

  const sideKey = isLeft ? 'left' : 'right';
  const trailList = store[sideKey];

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

  if (trailList.length > 16) {
    trailList.pop();
  }

  if (trailList.length < 2) return;

  ctx.save();
  ctx.rotate(-gloveRot);
  ctx.translate(-actualFistX, -actualFistY);
  ctx.rotate(-fighter.facingAngle);
  ctx.translate(-fighter.x, -fighter.y);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.shadowColor = '#d946ef';
  ctx.shadowBlur = 15;

  ctx.beginPath();
  ctx.moveTo(trailList[0].worldFx, trailList[0].worldFy);
  for (let i = 1; i < trailList.length; i++) {
    ctx.lineTo(trailList[i].worldFx, trailList[i].worldFy);
  }
  ctx.strokeStyle = '#d946ef';
  ctx.lineWidth = 4.8;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(trailList[0].worldFx, trailList[0].worldFy);
  for (let i = 1; i < trailList.length; i++) {
    ctx.lineTo(trailList[i].worldFx, trailList[i].worldFy);
  }
  ctx.strokeStyle = '#f0abfc';
  ctx.lineWidth = 2.2;
  ctx.stroke();

  for (let i = 2; i < Math.min(trailList.length, 10); i += 2) {
    const alpha = (1 - i / 10) * 0.65;
    const pt = trailList[i];
    ctx.beginPath();
    ctx.moveTo(pt.worldEx, pt.worldEy);
    ctx.lineTo(pt.worldFx, pt.worldFy);
    ctx.strokeStyle = `rgba(217, 70, 239, ${alpha})`;
    ctx.lineWidth = 3.0 * (1 - i / 10);
    ctx.stroke();
  }

  ctx.restore();
}
