import { Fighter } from '../../types';
import { FighterTrailStore, TrailRenderParams } from './types';

const aikidoTrailMap = new WeakMap<Fighter, FighterTrailStore>();

export function renderAikidoHandTrail(params: TrailRenderParams): void {
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

  let store = aikidoTrailMap.get(fighter);
  if (!store) {
    store = { left: [], right: [] };
    aikidoTrailMap.set(fighter, store);
  }

  const sideKey = isLeft ? 'left' : 'right';
  const trailList = store[sideKey];

  const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
  const rightFist = fighter.fists ? (fighter.fists.find(f => f.punchType === 'right') || fighter.fists[1]) : undefined;
  const isS3Active = stage === 2 && rightFist && rightFist.punchProgress > 0;
  const isS4Active = stage === 3 && !isLeft && rightFist && rightFist.punchProgress > 0.50;
  const isM2Active = !!(fighter.aikiM2StanceTimer && fighter.aikiM2StanceTimer > 0);
  const isTrailActive = isS3Active || isS4Active || isM2Active;

  if (isTrailActive) {
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
    const maxTrailLen = isM2Active ? 20 : 14;
    if (trailList.length > maxTrailLen) {
      trailList.pop();
    }
  } else {
    for (let i = 0; i < trailList.length; i++) {
      trailList[i].alpha *= 0.72;
    }
    while (trailList.length > 0 && trailList[trailList.length - 1].alpha < 0.05) {
      trailList.pop();
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

  if (isM2Active) {
    ctx.shadowColor = '#00bfff';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(trailList[0].worldFx, trailList[0].worldFy);
    for (let i = 1; i < trailList.length; i++) {
      ctx.lineTo(trailList[i].worldFx, trailList[i].worldFy);
    }
    ctx.strokeStyle = `rgba(0, 191, 255, ${0.80 * avgAlpha})`;
    ctx.lineWidth = 5.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(trailList[0].worldFx, trailList[0].worldFy);
    for (let i = 1; i < trailList.length; i++) {
      ctx.lineTo(trailList[i].worldFx, trailList[i].worldFy);
    }
    ctx.strokeStyle = `rgba(224, 247, 255, ${0.95 * avgAlpha})`;
    ctx.lineWidth = 2.4;
    ctx.stroke();
  } else {
    ctx.shadowColor = '#00bfff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(trailList[0].worldFx, trailList[0].worldFy);
    for (let i = 1; i < trailList.length; i++) {
      ctx.lineTo(trailList[i].worldFx, trailList[i].worldFy);
    }
    ctx.strokeStyle = `rgba(0, 191, 255, ${0.30 * avgAlpha})`;
    ctx.lineWidth = 4.2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(trailList[0].worldFx, trailList[0].worldFy);
    for (let i = 1; i < trailList.length; i++) {
      ctx.lineTo(trailList[i].worldFx, trailList[i].worldFy);
    }
    ctx.strokeStyle = `rgba(224, 247, 250, ${0.40 * avgAlpha})`;
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }

  ctx.restore();
}
