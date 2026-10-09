import { FistIKContext } from './types';

export function getAshiharaFistPos(ctx: FistIKContext): { fistX: number; fistY: number } {
  const { fighter, fist, idleTime, isCollision, isLeft, leftProgress, rightProgress, easeProgress } = ctx;

  let leftBaseX = fighter.radius * 1.1;
  let leftBaseY = -fighter.radius * 0.25;
  let rightBaseX = fighter.radius * 0.65;
  let rightBaseY = fighter.radius * 0.35;

  const leftIdleMix = leftProgress > 0 ? 0 : (rightProgress > 0 ? 0 : 1);
  const rightIdleMix = rightProgress > 0 ? 0 : (leftProgress > 0 ? 0 : 1);

  leftBaseX += Math.sin(idleTime * 4.0) * 1.0 * leftIdleMix;
  leftBaseY += Math.cos(idleTime * 4.0) * 1.5 * leftIdleMix;
  rightBaseX += Math.sin(idleTime * 4.0 + Math.PI) * 0.8 * rightIdleMix;
  rightBaseY += Math.cos(idleTime * 4.0 + Math.PI) * 1.2 * rightIdleMix;

  const parryLeftX = fighter.radius * 0.85;
  const parryLeftY = -fighter.radius * 0.25;
  const parryRightX = fighter.radius * 0.7;
  const parryRightY = fighter.radius * 0.35;

  let fistX = 0;
  let fistY = 0;

  if (fighter.ashiharaM2Stage === 2) {
    fistX = fighter.radius * 1.15;
    fistY = isLeft ? -fighter.radius * 0.15 : fighter.radius * 0.15;
  } else if (fighter.ashiharaM2Stage === 3 || (fist as any)?.ashiharaS3) {
    if (isLeft) {
      fistX = leftBaseX * 0.85;
      fistY = -fighter.radius * 0.40;
    } else {
      const rawProgress = fist.punchProgress > 0 ? fist.punchProgress : (fighter.ashiharaM2Timer !== undefined ? (12 - fighter.ashiharaM2Timer) / 12 : 0);
      const thrust = Math.sin(rawProgress * Math.PI);
      fistX = rightBaseX + thrust * fighter.radius * 2.3;
      fistY = 0;
    }
  } else if (fighter.heavyWindup && fighter.heavyWindup > 0) {
    if (isLeft) {
      fistX = parryLeftX;
      fistY = parryLeftY;
    } else {
      fistX = parryRightX;
      fistY = parryRightY;
    }
  } else if (fighter.ashiharaRecoveryTimer && fighter.ashiharaRecoveryTimer > 0) {
    const blend = fighter.ashiharaRecoveryTimer / 30;
    if (isLeft) {
      fistX = leftBaseX + blend * (parryLeftX - leftBaseX);
      fistY = leftBaseY + blend * (parryLeftY - leftBaseY);
    } else {
      fistX = rightBaseX + blend * (parryRightX - rightBaseX);
      fistY = rightBaseY + blend * (parryRightY - rightBaseY);
    }
  } else if (leftProgress > 0) {
    if (isLeft) {
      const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
      if (stage === 0) {
        fistX = leftBaseX + easeProgress * fighter.radius * 1.55;
        fistY = leftBaseY * (1 - easeProgress);
      } else if (stage === 2) {
        if (isCollision) {
          fistX = fighter.radius * (0.8 + easeProgress * 1.6);
          fistY = -fighter.radius * 0.45;
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
      const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
      if (stage === 1) {
        if (isCollision) {
          fistX = fighter.radius * (0.8 + easeProgress * 1.5);
          fistY = fighter.radius * 0.45;
        } else {
          fistX = rightBaseX;
          fistY = rightBaseY;
        }
      } else if (stage === 3) {
        if (isCollision) {
          fistX = fighter.radius * (0.8 + easeProgress * 1.7);
          fistY = fighter.radius * 0.45;
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
