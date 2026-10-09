import { FistIKContext } from './types';
import { CombatFighter } from '../types';

export function getKickboxingFistPos(ctx: FistIKContext): { fistX: number; fistY: number } {
  const { fighter, fist, idleTime, isCollision, isLeft, leftProgress, rightProgress, easeProgress } = ctx;

  let leftBaseX = fighter.radius * 0.95;
  let leftBaseY = -fighter.radius * 0.30;
  let rightBaseX = fighter.radius * 0.55;
  let rightBaseY = fighter.radius * 0.35;

  const leftIdleMix = leftProgress > 0 ? 0 : (rightProgress > 0 ? 0 : 1);
  const rightIdleMix = rightProgress > 0 ? 0 : (leftProgress > 0 ? 0 : 1);

  leftBaseX += Math.sin(idleTime * 5.0) * 1.2 * leftIdleMix;
  leftBaseY += Math.cos(idleTime * 5.0) * 1.0 * leftIdleMix;
  rightBaseX += Math.sin(idleTime * 5.0 + Math.PI) * 1.0 * rightIdleMix;
  rightBaseY += Math.cos(idleTime * 5.0 + Math.PI) * 0.8 * rightIdleMix;

  const isSeq2 = (fist as any)?.kickboxingSeq2 || (fighter as CombatFighter).kickboxingIsSeq2;

  let fistX = 0;
  let fistY = 0;

  if (fighter.heavyWindup && fighter.heavyWindup > 0) {
    if (isSeq2) {
      if (isLeft) {
        fistX = fighter.radius * 0.90;
        fistY = -fighter.radius * 0.85;
      } else {
        fistX = -fighter.radius * 0.15;
        fistY = fighter.radius * 1.30;
      }
    } else {
      if (isLeft) {
        fistX = fighter.radius * 0.90;
        fistY = -fighter.radius * 0.70;
      } else {
        fistX = fighter.radius * 0.15;
        fistY = fighter.radius * 1.25;
      }
    }
  } else if (leftProgress > 0) {
    if (isLeft) {
      const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
      if (stage === 0) {
        const extension = easeProgress * fighter.radius * 1.75;
        fistX = leftBaseX + extension;
        fistY = leftBaseY * (1 - easeProgress * 0.5);
      } else if (stage === 2) {
        if (isCollision) {
          const ease = Math.sin(leftProgress * Math.PI);
          fistX = fighter.radius * (1.10 + ease * 1.60);
          fistY = -fighter.radius * 0.25;
        } else {
          fistX = leftBaseX;
          fistY = leftBaseY;
        }
      } else {
        fistX = leftBaseX + easeProgress * fighter.radius * 1.4;
        fistY = leftBaseY;
      }
    } else {
      fistX = rightBaseX;
      fistY = rightBaseY;
    }
  } else if (rightProgress > 0) {
    if (!isLeft) {
      const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
      const isHeavy = fist.isHeavy;

      if (isHeavy && isSeq2) {
        if (isCollision) {
          fistX = fighter.radius * (0.82 + easeProgress * 2.03);
          fistY = 0;
        } else {
          fistX = -fighter.radius * (0.25 + easeProgress * 1.15);
          fistY = fighter.radius * (1.30 + easeProgress * 0.35);
        }
      } else if (isHeavy) {
        const loopX = easeProgress * fighter.radius * 1.6;
        const loopY = Math.sin(easeProgress * Math.PI) * fighter.radius * 0.70;
        fistX = rightBaseX + loopX;
        fistY = rightBaseY - loopY;
      } else if (stage === 1) {
        const extension = easeProgress * fighter.radius * 1.85;
        fistX = rightBaseX + extension;
        fistY = rightBaseY * (1 - easeProgress);
      } else if (stage === 3) {
        const extension = easeProgress * fighter.radius * 2.3;
        fistX = rightBaseX + extension;
        fistY = rightBaseY * (1 - easeProgress);
      } else {
        fistX = rightBaseX + easeProgress * fighter.radius * 1.4;
        fistY = rightBaseY;
      }
    } else {
      if (fist.isHeavy && isSeq2) {
        fistX = fighter.radius * (0.90 - easeProgress * 0.20);
        fistY = -fighter.radius * (0.85 + easeProgress * 0.15);
      } else if (fist.isHeavy) {
        fistX = fighter.radius * 0.85;
        fistY = -fighter.radius * 0.70;
      } else {
        fistX = leftBaseX;
        fistY = leftBaseY;
      }
    }
  } else {
    fistX = isLeft ? leftBaseX : rightBaseX;
    fistY = isLeft ? leftBaseY : rightBaseY;
  }

  return { fistX, fistY };
}
