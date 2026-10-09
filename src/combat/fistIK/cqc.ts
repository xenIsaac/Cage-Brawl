import { FistIKContext } from './types';

export function getCQCFistPos(ctx: FistIKContext): { fistX: number; fistY: number } {
  const { fighter, fist, idleTime, isBlockingActive, isLeft, leftProgress, rightProgress, easeProgress } = ctx;

  let leftBaseX = fighter.radius * 0.52;
  let leftBaseY = fighter.radius * 0.16;
  let rightBaseX = fighter.radius * 0.56;
  let rightBaseY = -fighter.radius * 0.16;

  const leftIdleMix = leftProgress > 0 ? 0 : (rightProgress > 0 ? 0 : 1);
  const rightIdleMix = rightProgress > 0 ? 0 : (leftProgress > 0 ? 0 : 1);

  leftBaseX += Math.sin(idleTime * 3.2) * 0.4 * leftIdleMix;
  leftBaseY += Math.cos(idleTime * 3.2) * 0.3 * leftIdleMix;
  rightBaseX += Math.sin(idleTime * 3.2 + Math.PI) * 0.4 * rightIdleMix;
  rightBaseY += Math.cos(idleTime * 3.2 + Math.PI) * 0.3 * rightIdleMix;

  const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
  const isHeavy = rightProgress > 0 && fist.isHeavy;
  const isM2Active = (fighter.heavyWindup && fighter.heavyWindup > 0) || fighter.cqcM2Stage === 'windup' || fighter.cqcM2Stage === 'dash' || fighter.cqcM2Stage === 'assault';

  let fistX = 0;
  let fistY = 0;

  if (isBlockingActive) {
    fistX = isLeft ? fighter.radius * 0.65 : fighter.radius * 0.70;
    fistY = isLeft ? -fighter.radius * 0.20 : fighter.radius * 0.20;
  } else if (isM2Active) {
    fistX = isLeft ? fighter.radius * 0.70 : fighter.radius * 0.74;
    fistY = isLeft ? fighter.radius * 0.16 : -fighter.radius * 0.16;
  } else if (isHeavy) {
    fistX = isLeft ? leftBaseX : rightBaseX;
    fistY = isLeft ? leftBaseY : rightBaseY;
  } else if (leftProgress > 0) {
    if (isLeft) {
      if (stage === 0) {
        let extension = 0;
        if (leftProgress < 0.25) {
          const pullProgress = leftProgress / 0.25;
          extension = -10 * Math.sin(pullProgress * Math.PI);
        } else {
          const thrustProgress = (leftProgress - 0.25) / 0.75;
          const snap = Math.sin(thrustProgress * (Math.PI / 2));
          extension = snap * fighter.radius * 1.85;
        }
        fistX = leftBaseX + extension;
        fistY = leftBaseY * (1 - easeProgress * 0.6);
      } else if (stage === 2) {
        const sweepEase = Math.sin(leftProgress * Math.PI);
        fistX = fighter.radius * (0.80 + sweepEase * 1.25);
        fistY = -fighter.radius * 0.40 + sweepEase * fighter.radius * 0.85;
      } else {
        fistX = leftBaseX + easeProgress * fighter.radius * 1.5;
        fistY = leftBaseY;
      }
    } else {
      fistX = rightBaseX;
      fistY = rightBaseY;
    }
  } else if (rightProgress > 0) {
    if (!isLeft) {
      if (stage === 1) {
        let extension = 0;
        if (rightProgress < 0.25) {
          const pullProgress = rightProgress / 0.25;
          extension = -10 * Math.sin(pullProgress * Math.PI);
        } else {
          const thrustProgress = (rightProgress - 0.25) / 0.75;
          const snap = Math.sin(thrustProgress * (Math.PI / 2));
          extension = snap * fighter.radius * 1.85;
        }
        fistX = rightBaseX + extension;
        fistY = rightBaseY * (1 - easeProgress * 0.6);
      } else if (stage === 3) {
        const extension = easeProgress * fighter.radius * 2.30;
        fistX = rightBaseX + extension;
        fistY = rightBaseY * (1 - easeProgress);
      } else {
        fistX = rightBaseX + easeProgress * fighter.radius * 1.5;
        fistY = rightBaseY;
      }
    } else {
      fistX = leftBaseX;
      fistY = leftBaseY;
    }
  } else {
    fistX = isLeft ? leftBaseX : rightBaseX;
    fistY = isLeft ? leftBaseY : rightBaseY;
  }

  return { fistX, fistY };
}
