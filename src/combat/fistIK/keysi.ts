import { FistIKContext } from './types';

export function getKeysiFistPos(ctx: FistIKContext): { fistX: number; fistY: number } {
  const { fighter, fist, idleTime, isBlockingActive, isCollision, isLeft, leftProgress, rightProgress, easeProgress } = ctx;

  let leftBaseX = -fighter.radius * 0.05;
  let leftBaseY = -fighter.radius * 0.52;
  let rightBaseX = -fighter.radius * 0.05;
  let rightBaseY = fighter.radius * 0.52;

  const leftIdleMix = leftProgress > 0 ? 0 : (rightProgress > 0 ? 0 : 1);
  const rightIdleMix = rightProgress > 0 ? 0 : (leftProgress > 0 ? 0 : 1);

  leftBaseX += Math.sin(idleTime * 4.0) * 0.5 * leftIdleMix;
  leftBaseY += Math.cos(idleTime * 4.0) * 0.4 * leftIdleMix;
  rightBaseX += Math.sin(idleTime * 4.0 + Math.PI) * 0.5 * rightIdleMix;
  rightBaseY += Math.cos(idleTime * 4.0 + Math.PI) * 0.4 * rightIdleMix;

  const stage = fist.comboStage !== undefined ? fist.comboStage : (fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1));
  const isHeavy = rightProgress > 0 && fist.isHeavy;

  let fistX = 0;
  let fistY = 0;

  if (isBlockingActive) {
    fistX = isLeft ? fighter.radius * 0.74 : fighter.radius * 0.82;
    fistY = isLeft ? fighter.radius * 0.42 : -fighter.radius * 0.40;
  } else if (fighter.heavyWindup && fighter.heavyWindup > 0) {
    fistX = isLeft ? -fighter.radius * 0.08 : -fighter.radius * 0.08;
    fistY = isLeft ? -fighter.radius * 0.50 : fighter.radius * 0.50;
  } else if (isHeavy) {
    const ease = Math.sin(rightProgress * Math.PI);
    if (isCollision) {
      fistX = fighter.radius * (0.80 + ease * 0.45);
      fistY = fighter.radius * 0.10;
    } else {
      fistX = isLeft ? leftBaseX : rightBaseX;
      fistY = isLeft ? leftBaseY : rightBaseY;
    }
  } else if (leftProgress > 0) {
    if (isLeft) {
      if (stage === 0) {
        if (isCollision) {
          const ease = Math.sin(leftProgress * Math.PI);
          fistX = fighter.radius * (0.30 + ease * 0.35);
          fistY = -fighter.radius * 0.30;
        } else {
          const extension = easeProgress * fighter.radius * 0.30;
          fistX = leftBaseX + extension;
          fistY = leftBaseY * (1 - easeProgress * 0.25);
        }
      } else if (stage === 2) {
        if (isCollision) {
          const ease = Math.sin(leftProgress * Math.PI);
          fistX = fighter.radius * (0.45 + ease * 0.40);
          fistY = -fighter.radius * 0.15;
        } else {
          fistX = leftBaseX;
          fistY = leftBaseY;
        }
      } else {
        fistX = leftBaseX;
        fistY = leftBaseY;
      }
    } else {
      fistX = rightBaseX;
      fistY = rightBaseY;
    }
  } else if (rightProgress > 0) {
    if (!isLeft) {
      if (stage === 1) {
        if (isCollision) {
          const ease = Math.sin(rightProgress * Math.PI);
          fistX = fighter.radius * (0.45 + ease * 0.40);
          fistY = fighter.radius * 0.20;
        } else {
          const extension = easeProgress * fighter.radius * 0.40;
          fistX = rightBaseX + extension;
          fistY = rightBaseY * (1 - easeProgress * 0.30);
        }
      } else if (stage === 3) {
        if (isCollision) {
          const ease = Math.sin(rightProgress * Math.PI);
          fistX = fighter.radius * (0.50 + ease * 0.45);
          fistY = 0;
        } else {
          fistX = rightBaseX;
          fistY = rightBaseY;
        }
      } else {
        fistX = rightBaseX;
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
