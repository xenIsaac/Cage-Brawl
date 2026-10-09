import { FistIKContext } from './types';

export function getShotokanFistPos(ctx: FistIKContext): { fistX: number; fistY: number } {
  const { fighter, fist, idleTime, isCollision, isLeft, leftProgress, rightProgress, easeProgress } = ctx;

  let leftBaseX = fighter.radius * 1.0;
  let leftBaseY = -fighter.radius * 0.25;
  let rightBaseX = fighter.radius * 0.2;
  let rightBaseY = fighter.radius * 0.45;

  const leftIdleMix = leftProgress > 0 ? 0 : (rightProgress > 0 ? 0 : 1);
  const rightIdleMix = rightProgress > 0 ? 0 : (leftProgress > 0 ? 0 : 1);

  leftBaseX += Math.sin(idleTime * 3.5) * 1.0 * leftIdleMix;
  leftBaseY += Math.cos(idleTime * 3.5) * 0.8 * leftIdleMix;
  rightBaseX += Math.sin(idleTime * 3.5 + Math.PI) * 0.5 * rightIdleMix;
  rightBaseY += Math.cos(idleTime * 3.5 + Math.PI) * 0.5 * rightIdleMix;

  let fistX = 0;
  let fistY = 0;

  if (fighter.heavyWindup && fighter.heavyWindup > 0) {
    fistX = isLeft ? fighter.radius * 0.5 : fighter.radius * 0.2;
    fistY = isLeft ? -fighter.radius * 0.3 : fighter.radius * 0.4;
  } else if (leftProgress > 0) {
    if (isLeft) {
      const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
      if (stage === 0) {
        const shoulderAngle = -Math.PI / 2.2;
        const anchorRadius = fighter.radius * 0.85;
        const shoulderX = Math.cos(shoulderAngle) * anchorRadius;
        const shoulderY = Math.sin(shoulderAngle) * anchorRadius;

        const thrustProgress = easeProgress < 0.25 ? 0 : (easeProgress - 0.25) / 0.75;
        const elbowExt = thrustProgress * fighter.radius * 1.85;
        const elbowX = shoulderX + elbowExt;
        const elbowY = shoulderY - fighter.radius * 0.15 + thrustProgress * fighter.radius * 0.2;

        if (isCollision) {
          fistX = elbowX;
          fistY = elbowY;
        } else {
          const foldBack = fighter.radius * 0.65 * (1 - thrustProgress);
          fistX = elbowX - foldBack;
          fistY = elbowY - fighter.radius * 0.35;
        }
      } else if (stage === 2) {
        const ext = easeProgress * fighter.radius * 2.2;
        fistX = leftBaseX + ext;
        fistY = (leftBaseY + fighter.radius * 0.4) - easeProgress * fighter.radius * 0.8;
      } else if (stage === 3) {
        fistX = leftBaseX;
        fistY = leftBaseY;
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
      const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
      if (fist.isHeavy) {
        if (isCollision) {
          fistX = fighter.radius * (0.8 + easeProgress * 1.5);
          fistY = 0;
        } else {
          fistX = rightBaseX;
          fistY = rightBaseY;
        }
      } else if (stage === 1) {
        const ext = easeProgress * fighter.radius * 2.3;
        fistX = rightBaseX + ext;
        fistY = rightBaseY - easeProgress * fighter.radius * 0.7;
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
