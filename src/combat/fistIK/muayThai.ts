import { FistIKContext } from './types';

export function getMuayThaiFistPos(ctx: FistIKContext): { fistX: number; fistY: number } {
  const { fighter, idleTime, isCollision, isLeft, leftProgress, rightProgress } = ctx;

  let leftBaseX = fighter.radius * 1.35;
  let leftBaseY = -fighter.radius * 0.15;
  let rightBaseX = fighter.radius * 0.6;
  let rightBaseY = fighter.radius * 0.45;

  const leftIdleMix = leftProgress > 0 ? 0 : (rightProgress > 0 ? 0 : 1);
  const rightIdleMix = rightProgress > 0 ? 0 : (leftProgress > 0 ? 0 : 1);

  leftBaseX += Math.sin(idleTime * 4.0) * 1.5 * leftIdleMix;
  leftBaseY += Math.cos(idleTime * 4.0) * 2.0 * leftIdleMix;
  rightBaseX += Math.sin(idleTime * 4.0 + Math.PI) * 1.0 * rightIdleMix;
  rightBaseY += Math.cos(idleTime * 4.0 + Math.PI) * 1.5 * rightIdleMix;

  let fistX = 0;
  let fistY = 0;

  if (fighter.heavyWindup && fighter.heavyWindup > 0) {
    fistX = fighter.radius * 0.75;
    fistY = isLeft ? -fighter.radius * 0.12 : fighter.radius * 0.12;
  } else if (leftProgress > 0) {
    if (isLeft) {
      const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
      if (stage === 1) {
        const extension = ctx.easeProgress * fighter.radius * 1.2;
        fistX = leftBaseX + extension;
        fistY = leftBaseY + ctx.easeProgress * fighter.radius * 0.35;
      } else if (stage === 3) {
        fistX = leftBaseX * 0.85;
        fistY = leftBaseY - fighter.radius * 0.15;
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
      if (ctx.fist.isHeavy) {
        if (isCollision) {
          fistX = rightBaseX + ctx.easeProgress * fighter.radius * 1.45;
          fistY = rightBaseY - ctx.easeProgress * fighter.radius * 0.4;
        } else {
          fistX = rightBaseX;
          fistY = rightBaseY;
        }
      } else if (stage === 0) {
        const extension = ctx.easeProgress * fighter.radius * 1.15;
        fistX = rightBaseX + extension;
        fistY = rightBaseY - ctx.easeProgress * fighter.radius * 0.35;
      } else if (stage === 2) {
        const shoulderAngle = Math.PI / 2.3;
        const anchorRadius = fighter.radius * 0.85;
        const shoulderX = Math.cos(shoulderAngle) * anchorRadius;
        const shoulderY = Math.sin(shoulderAngle) * anchorRadius;

        const p = Math.sin(ctx.easeProgress * Math.PI * 0.5);
        const upperArmLen = fighter.radius * (0.90 + Math.sin(p * Math.PI) * 0.20);
        const startAngle = Math.PI * 0.35;
        const endAngle = -Math.PI * 0.35;
        const sweepAngle = startAngle + p * (endAngle - startAngle);

        fistX = shoulderX + upperArmLen * Math.cos(sweepAngle);
        fistY = shoulderY + upperArmLen * Math.sin(sweepAngle);
      } else {
        fistX = rightBaseX;
        fistY = rightBaseY;
      }
    } else {
      fistX = leftBaseX * 0.95;
      fistY = leftBaseY - fighter.radius * 0.1;
    }
  } else {
    fistX = isLeft ? leftBaseX : rightBaseX;
    fistY = isLeft ? leftBaseY : rightBaseY;
  }

  return { fistX, fistY };
}
