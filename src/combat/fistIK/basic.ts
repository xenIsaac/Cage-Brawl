import { FistIKContext } from './types';

export function getBasicFistPos(ctx: FistIKContext): { fistX: number; fistY: number } {
  const { fighter, fist, idleTime, isLeft, leftProgress, rightProgress } = ctx;

  const isSwaySprinting = fighter.isDashing || ((fighter.heavyWindup || 0) > 0);
  let leftBaseX = isSwaySprinting ? fighter.radius * 0.75 : fighter.radius * 1.05;
  let leftBaseY = isSwaySprinting ? -fighter.radius * 0.18 : -fighter.radius * 0.35;
  let rightBaseX = isSwaySprinting ? fighter.radius * 0.68 : fighter.radius * 0.50;
  let rightBaseY = isSwaySprinting ? fighter.radius * 0.22 : fighter.radius * 0.38;

  const leftIdleMix = leftProgress > 0 ? 0 : (rightProgress > 0 ? 0 : 1);
  const rightIdleMix = rightProgress > 0 ? 0 : (leftProgress > 0 ? 0 : 1);

  // Rhythmic Pendulum Sway Idle
  leftBaseX += Math.sin(idleTime * 5.0) * 2.0 * leftIdleMix;
  leftBaseY += Math.cos(idleTime * 5.0) * 1.2 * leftIdleMix;
  rightBaseX += Math.sin(idleTime * 5.0 + Math.PI) * 1.8 * rightIdleMix;
  rightBaseY += Math.cos(idleTime * 5.0 + Math.PI) * 1.2 * rightIdleMix;

  const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
  let fistX = 0;
  let fistY = 0;

  if (fighter.heavyWindup && fighter.heavyWindup > 0) {
    if (isLeft) {
      fistX = fighter.radius * 0.80;
      fistY = -fighter.radius * 0.28;
    } else {
      fistX = fighter.radius * 0.65;
      fistY = fighter.radius * 0.25;
    }
  } else if (isLeft) {
    if (leftProgress > 0) {
      if (fist.isHeavy) {
        const extension = ctx.easeProgress * fighter.radius * 2.15;
        fistX = leftBaseX + extension;
        fistY = leftBaseY * (1 - ctx.easeProgress);
      } else if (stage === 3) {
        const p = leftProgress;
        const flareX = leftBaseX - fighter.radius * 0.50;
        const flareY = leftBaseY - fighter.radius * 1.10;
        const targetX = fighter.radius * 2.25;
        const targetY = fighter.radius * 0.10;

        if (fist.isPunching || fist.isLingerActive) {
          if (p < 0.25) {
            const t = p / 0.25;
            fistX = leftBaseX + t * (flareX - leftBaseX);
            fistY = leftBaseY + t * (flareY - leftBaseY);
          } else {
            const t = (p - 0.25) / 0.75;
            const ease = Math.sin(t * Math.PI / 2);
            fistX = flareX + ease * (targetX - flareX);
            const overheadArc = Math.sin(t * Math.PI) * (-fighter.radius * 0.50);
            fistY = flareY + ease * (targetY - flareY) + overheadArc;
          }
        } else {
          const ease = p * p;
          fistX = leftBaseX + ease * (targetX - leftBaseX);
          fistY = leftBaseY + ease * (targetY - leftBaseY);
        }
      } else {
        const isForward = fist ? (fist.isPunching || !!fist.isLingerActive) : false;
        const ease = isForward 
          ? Math.sin((leftProgress * Math.PI) / 2)
          : leftProgress;
        const extension = ease * fighter.radius * 1.85;
        fistX = leftBaseX + extension;
        fistY = leftBaseY * (1 - ease);
      }
    } else {
      fistX = leftBaseX;
      fistY = leftBaseY;
    }
  } else {
    // Right arm
    if (rightProgress > 0) {
      if (stage === 2) {
        const isForward = fist ? fist.isPunching : false;
        const p = rightProgress;
        let feintExtension = 0;
        let feintLoopY = 0;
        if (isForward) {
          const snapEase = Math.sin(p * Math.PI * 0.5);
          feintExtension = snapEase * fighter.radius * 1.65;
          feintLoopY = Math.sin(p * Math.PI) * fighter.radius * 0.25;
        } else {
          const retEase = p * p * (3 - 2 * p);
          feintExtension = retEase * fighter.radius * 1.65;
          feintLoopY = Math.sin(p * Math.PI) * fighter.radius * 0.18;
        }
        fistX = rightBaseX + feintExtension;
        fistY = rightBaseY - feintLoopY;
      } else {
        const isForward = fist ? (fist.isPunching || !!fist.isLingerActive) : false;
        const ease = isForward ? Math.sin((rightProgress * Math.PI) / 2) : rightProgress;
        const extension = ease * fighter.radius * 1.85;
        const loopY = Math.sin(ease * Math.PI) * fighter.radius * 0.50;
        fistX = rightBaseX + extension;
        fistY = rightBaseY - loopY;
      }
    } else {
      fistX = rightBaseX;
      fistY = rightBaseY;
    }
  }

  return { fistX, fistY };
}
