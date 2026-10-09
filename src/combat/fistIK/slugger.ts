import { FistIKContext } from './types';

export function getSluggerFistPos(ctx: FistIKContext): { fistX: number; fistY: number } {
  const { fighter, fist, idleTime, isCollision, isLeft, leftProgress, rightProgress } = ctx;

  let leftBaseX = fighter.radius * 0.9;
  let leftBaseY = -fighter.radius * 0.35;
  let rightBaseX = fighter.radius * 0.5;
  let rightBaseY = fighter.radius * 0.45;

  const leftIdleMix = leftProgress > 0 ? 0 : (rightProgress > 0 ? 0 : 1);
  const rightIdleMix = rightProgress > 0 ? 0 : (leftProgress > 0 ? 0 : 1);

  leftBaseX += Math.sin(idleTime * 2.0) * 1.0 * leftIdleMix;
  leftBaseY += Math.cos(idleTime * 2.0) * 1.2 * leftIdleMix;
  rightBaseX += Math.sin(idleTime * 2.0 + Math.PI) * 0.8 * rightIdleMix;
  rightBaseY += Math.cos(idleTime * 2.0 + Math.PI) * 1.0 * rightIdleMix;

  const stage = fist.comboStage !== undefined ? fist.comboStage : (fighter.comboStage === 0 ? 3 : (fighter.comboStage || 1) - 1);

  let fistX = 0;
  let fistY = 0;

  if (fighter.heavyWindup && fighter.heavyWindup > 0) {
    if (!isLeft) {
      fistX = -fighter.radius * 0.55; 
      fistY = fighter.radius * 1.45; 
    } else {
      fistX = leftBaseX;
      fistY = leftBaseY;
    }
  } else if (leftProgress > 0) {
    if (isLeft) {
      const p = leftProgress;
      const flareX = leftBaseX - fighter.radius * 0.55;
      const flareY = leftBaseY - fighter.radius * 0.95;
      const targetX = isCollision ? fighter.radius * 1.55 : fighter.radius * 1.85;
      const targetY = fighter.radius * 0.15;

      if (fist.isPunching || fist.isLingerActive) {
        if (p < 0.25) {
          const t = p / 0.25;
          fistX = leftBaseX + t * (flareX - leftBaseX);
          fistY = leftBaseY + t * (flareY - leftBaseY);
        } else {
          const t = (p - 0.25) / 0.75;
          const ease = Math.sin(t * Math.PI / 2);
          fistX = flareX + ease * (targetX - flareX);
          const arcBulge = Math.sin(t * Math.PI) * (-fighter.radius * 0.45);
          fistY = flareY + ease * (targetY - flareY) + arcBulge;
        }
      } else {
        const ease = p;
        fistX = leftBaseX + ease * (targetX - leftBaseX);
        fistY = leftBaseY + ease * (targetY - leftBaseY);
      }
    } else {
      fistX = rightBaseX;
      fistY = rightBaseY;
    }
  } else if (rightProgress > 0) {
    if (!isLeft) {
      const isHeavy = fist.isHeavy;
      if (isHeavy) {
        const p = rightProgress;
        const startX = -fighter.radius * 0.55;
        const startY = fighter.radius * 1.30;
        const targetX = isCollision ? fighter.radius * 1.75 : fighter.radius * 2.05;
        const targetY = -fighter.radius * 0.20;

        if (fist.isPunching || fist.isLingerActive) {
          const ease = Math.sin(p * Math.PI / 2);
          fistX = startX + ease * (targetX - startX);
          const arcBulge = Math.sin(p * Math.PI) * (fighter.radius * 0.45);
          fistY = startY + ease * (targetY - startY) + arcBulge;
        } else {
          const ease = p;
          fistX = rightBaseX + ease * (targetX - rightBaseX);
          fistY = rightBaseY + ease * (targetY - rightBaseY);
        }
      } else if (stage === 3) {
        const p = rightProgress;
        const targetX = isCollision ? fighter.radius * 1.75 : fighter.radius * 2.05;
        const targetY = 0;

        if (fist.isPunching || fist.isLingerActive) {
          const ease = Math.sin(p * Math.PI / 2);
          fistX = rightBaseX + ease * (targetX - rightBaseX);
          fistY = rightBaseY + ease * (targetY - rightBaseY);
        } else {
          const ease = p;
          fistX = rightBaseX + ease * (targetX - rightBaseX);
          fistY = rightBaseY + ease * (targetY - rightBaseY);
        }
      } else {
        const p = rightProgress;
        const flareX = rightBaseX - fighter.radius * 0.55;
        const flareY = rightBaseY + fighter.radius * 0.95;
        const targetX = isCollision ? fighter.radius * 1.55 : fighter.radius * 1.85;
        const targetY = -fighter.radius * 0.15;

        if (fist.isPunching || fist.isLingerActive) {
          if (p < 0.25) {
            const t = p / 0.25;
            fistX = rightBaseX + t * (flareX - rightBaseX);
            fistY = rightBaseY + t * (flareY - rightBaseY);
          } else {
            const t = (p - 0.25) / 0.75;
            const ease = Math.sin(t * Math.PI / 2);
            fistX = flareX + ease * (targetX - flareX);
            const arcBulge = Math.sin(t * Math.PI) * (fighter.radius * 0.45);
            fistY = flareY + ease * (targetY - flareY) + arcBulge;
          }
        } else {
          const ease = p;
          fistX = rightBaseX + ease * (targetX - rightBaseX);
          fistY = rightBaseY + ease * (targetY - rightBaseY);
        }
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
