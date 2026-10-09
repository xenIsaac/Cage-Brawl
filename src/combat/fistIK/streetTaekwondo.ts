import { FistIKContext } from './types';
import { getKickArmRestingPositions } from '../kickAnimation';
import { CombatFighter } from '../types';

export function getStreetTaekwondoFistPos(ctx: FistIKContext): { fistX: number; fistY: number } {
  const { fighter, fist, idleTime, isBlockingActive, isCollision, isLeft, leftProgress, rightProgress } = ctx;

  const isHeavy = fist.isHeavy;
  let leftBaseX = fighter.radius * 0.60;
  let leftBaseY = -fighter.radius * 0.35;
  let rightBaseX = fighter.radius * 0.32;
  let rightBaseY = fighter.radius * 0.28;

  const leftIdleMix = leftProgress > 0 ? 0 : (rightProgress > 0 ? 0 : 1);
  const rightIdleMix = rightProgress > 0 ? 0 : (leftProgress > 0 ? 0 : 1);

  leftBaseX += Math.sin(idleTime * 4.5) * 1.2 * leftIdleMix;
  leftBaseY += Math.cos(idleTime * 4.5) * 0.8 * leftIdleMix;
  rightBaseX += Math.sin(idleTime * 4.5 + Math.PI) * 1.0 * rightIdleMix;
  rightBaseY += Math.cos(idleTime * 4.5 + Math.PI) * 0.6 * rightIdleMix;

  const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);

  let fistX = 0;
  let fistY = 0;

  if (isBlockingActive) {
    fistX = isLeft ? fighter.radius * 0.48 : fighter.radius * 0.42;
    fistY = isLeft ? -fighter.radius * 0.25 : fighter.radius * 0.22;
  } else if (fighter.heavyWindup && fighter.heavyWindup > 0) {
    fistX = isLeft ? fighter.radius * 0.30 : fighter.radius * 0.30;
    fistY = isLeft ? -fighter.radius * 0.25 : fighter.radius * 0.25;
  } else if (isCollision) {
    if (rightProgress > 0 && isHeavy) {
      const ease = Math.sin(rightProgress * Math.PI);
      fistX = fighter.radius * (1.0 + ease * 1.4);
      fistY = 0;
    } else if (leftProgress > 0) {
      const ease = Math.sin(leftProgress * Math.PI);
      if (stage === 0) {
        fistX = fighter.radius * (0.85 + ease * 1.1);
        fistY = -fighter.radius * 0.20;
      } else if (stage === 2) {
        fistX = fighter.radius * (0.90 + ease * 1.2);
        fistY = 0;
      } else {
        fistX = fighter.radius * (0.85 + ease * 1.0);
        fistY = -fighter.radius * 0.20;
      }
    } else if (rightProgress > 0) {
      const ease = Math.sin(rightProgress * Math.PI);
      if (stage === 1) {
        const kickAngle = Math.PI * 0.30 - ease * Math.PI * 0.60;
        const dist = fighter.radius * (0.95 + ease * 0.40);
        fistX = Math.cos(kickAngle) * dist + Math.cos(kickAngle) * fighter.radius * 0.85;
        fistY = Math.sin(kickAngle) * dist + Math.sin(kickAngle) * fighter.radius * 0.85;
      } else if (stage === 3) {
        const rightFist = fighter.fists?.find(x => x.punchType === 'right');
        const totalProgress = (rightFist?.isPunching || rightFist?.isLingerActive) ? (rightProgress * 0.5) : (0.5 + (1.0 - rightProgress) * 0.5);
        const kickAngle = totalProgress * Math.PI * 2.0;
        fistX = Math.cos(kickAngle) * fighter.radius * 1.7;
        fistY = Math.sin(kickAngle) * fighter.radius * 1.7;
      } else {
        fistX = fighter.radius * (0.90 + ease * 1.1);
        fistY = fighter.radius * 0.25;
      }
    } else {
      fistX = isLeft ? leftBaseX : rightBaseX;
      fistY = isLeft ? leftBaseY : rightBaseY;
    }
  } else {
    const kickResting = getKickArmRestingPositions(fighter as CombatFighter, fist, isLeft, leftBaseX, leftBaseY, rightBaseX, rightBaseY);
    if (kickResting.handled) {
      fistX = kickResting.fistX;
      fistY = kickResting.fistY;
    } else {
      fistX = isLeft ? leftBaseX : rightBaseX;
      fistY = isLeft ? leftBaseY : rightBaseY;
    }
  }

  return { fistX, fistY };
}
