import { FistIKContext } from './types';

export function getCapoeiraFistPos(ctx: FistIKContext): { fistX: number; fistY: number } {
  const { fighter, fist, idleTime, isCollision, isLeft, leftProgress, rightProgress, gameTime } = ctx;

  const effectiveTime = gameTime > 0 ? gameTime : (idleTime ? idleTime * 60 : 0);
  const cycle = (effectiveTime % 120) / 120;
  const gingaCycle = Math.sin(cycle * Math.PI * 2);
  const t = (gingaCycle + 1) / 2;

  const guardForwardX = fighter.radius * 1.18;
  const guardCrossY = fighter.radius * 0.28;
  const rearBackX = -fighter.radius * 0.48;
  const rearOutY = fighter.radius * 1.38;

  const wL = t;
  const wR = 1 - t;

  const outwardArcL = Math.sin(wL * Math.PI) * (fighter.radius * 0.44);
  const forwardLiftL = Math.sin(wL * Math.PI) * (fighter.radius * 0.18);

  let leftBaseX = (guardForwardX * (1 - wL) + rearBackX * wL) + forwardLiftL;
  let leftBaseY = (-guardCrossY * (1 - wL) + (-rearOutY) * wL) - outwardArcL;

  const outwardArcR = Math.sin(wR * Math.PI) * (fighter.radius * 0.44);
  const forwardLiftR = Math.sin(wR * Math.PI) * (fighter.radius * 0.18);

  let rightBaseX = (guardForwardX * (1 - wR) + rearBackX * wR) + forwardLiftR;
  let rightBaseY = (guardCrossY * (1 - wR) + rearOutY * wR) + outwardArcR;

  const rightFist = fighter.fists.find(f => f.punchType === 'right');
  const isHeavy = fist.isHeavy || (rightFist && rightFist.isHeavy);
  const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);

  let leftAttackT = 0;
  if (leftProgress > 0) {
    const f = fighter.fists.find(x => x.punchType === 'left');
    if (f) {
      leftAttackT = (f.isPunching || f.isLingerActive) ? (f.punchProgress * 0.5) : (0.5 + (1.0 - f.punchProgress) * 0.5);
    }
  }

  let rightAttackT = 0;
  if (rightProgress > 0) {
    const f = fighter.fists.find(x => x.punchType === 'right');
    if (f) {
      rightAttackT = (f.isPunching || f.isLingerActive) ? (f.punchProgress * 0.5) : (0.5 + (1.0 - f.punchProgress) * 0.5);
    }
  }

  const idleLeftX = leftBaseX;
  const idleLeftY = leftBaseY;
  const idleRightX = rightBaseX;
  const idleRightY = rightBaseY;

  if (leftProgress > 0 && !isHeavy) {
    const blendWeight = Math.sin(leftAttackT * Math.PI);
    const counterbalance_dist = fighter.radius * (1.10 + blendWeight * 0.40);
    if (stage === 0) {
      const kickAngle = -Math.PI * 0.3 + blendWeight * Math.PI * 0.6;
      const targetLeftX = -Math.sin(kickAngle) * counterbalance_dist;
      const targetLeftY = -Math.cos(kickAngle) * counterbalance_dist;
      const targetRightX = guardForwardX;
      const targetRightY = guardCrossY;

      leftBaseX = idleLeftX + (targetLeftX - idleLeftX) * blendWeight;
      leftBaseY = idleLeftY + (targetLeftY - idleLeftY) * blendWeight;
      rightBaseX = idleRightX + (targetRightX - idleRightX) * blendWeight;
      rightBaseY = idleRightY + (targetRightY - idleRightY) * blendWeight;
    } else if (stage === 2) {
      const kickAngle = Math.PI * 0.3 - blendWeight * Math.PI * 0.6;
      const targetLeftX = -Math.sin(kickAngle) * counterbalance_dist;
      const targetLeftY = -Math.cos(kickAngle) * counterbalance_dist;
      const targetRightX = guardForwardX;
      const targetRightY = guardCrossY;

      leftBaseX = idleLeftX + (targetLeftX - idleLeftX) * blendWeight;
      leftBaseY = idleLeftY + (targetLeftY - idleLeftY) * blendWeight;
      rightBaseX = idleRightX + (targetRightX - idleRightX) * blendWeight;
      rightBaseY = idleRightY + (targetRightY - idleRightY) * blendWeight;
    }
  } else if (rightProgress > 0 && !isHeavy) {
    const blendWeight = Math.sin(rightAttackT * Math.PI);
    const counterbalance_dist = fighter.radius * (1.10 + blendWeight * 0.40);
    if (stage === 1) {
      const kickAngle = -Math.PI * 0.3 + blendWeight * Math.PI * 0.6;
      const targetRightX = -Math.sin(kickAngle) * counterbalance_dist;
      const targetRightY = Math.cos(kickAngle) * counterbalance_dist;
      const targetLeftX = guardForwardX;
      const targetLeftY = -guardCrossY;

      leftBaseX = idleLeftX + (targetLeftX - idleLeftX) * blendWeight;
      leftBaseY = idleLeftY + (targetLeftY - idleLeftY) * blendWeight;
      rightBaseX = idleRightX + (targetRightX - idleRightX) * blendWeight;
      rightBaseY = idleRightY + (targetRightY - idleRightY) * blendWeight;
    } else if (stage === 3) {
      const targetLeftX = -counterbalance_dist * 0.8;
      const targetLeftY = -fighter.radius * 0.7;
      const targetRightX = -counterbalance_dist * 0.8;
      const targetRightY = fighter.radius * 0.7;

      leftBaseX = idleLeftX + (targetLeftX - idleLeftX) * blendWeight;
      leftBaseY = idleLeftY + (targetLeftY - idleLeftY) * blendWeight;
      rightBaseX = idleRightX + (targetRightX - idleRightX) * blendWeight;
      rightBaseY = idleRightY + (targetRightY - idleRightY) * blendWeight;
    }
  }

  let fistX = 0;
  let fistY = 0;

  if (isCollision) {
    if (leftProgress > 0 && !isHeavy) {
      const ease = Math.sin(leftAttackT * Math.PI);
      let kickAngle = 0;
      let legW = fighter.radius * 1.90;
      if (stage === 0) {
        kickAngle = -Math.PI * 0.35 + ease * Math.PI * 0.70;
        legW = fighter.radius * 1.90;
      } else if (stage === 2) {
        kickAngle = -Math.PI * 0.30 + ease * Math.PI * 0.60;
        legW = fighter.radius * 1.90;
      }
      const dist = fighter.radius * (0.95 + ease * 0.40);
      const rectX = Math.cos(kickAngle) * dist;
      const rectY = Math.sin(kickAngle) * dist;
      fistX = rectX + Math.cos(kickAngle) * (legW * 0.45);
      fistY = rectY + Math.sin(kickAngle) * (legW * 0.45);
    } else if (rightProgress > 0 && !isHeavy) {
      const ease = Math.sin(rightAttackT * Math.PI);
      if (stage === 1) {
        const kickAngle = Math.PI * 0.30 - ease * Math.PI * 0.60;
        const dist = fighter.radius * (0.95 + ease * 0.40);
        const rectX = Math.cos(kickAngle) * dist;
        const rectY = Math.sin(kickAngle) * dist;
        const legW = fighter.radius * 1.90;
        fistX = rectX + Math.cos(kickAngle) * (legW * 0.45);
        fistY = rectY + Math.sin(kickAngle) * (legW * 0.45);
      } else if (stage === 3) {
        const dist = fighter.radius * (0.95 + ease * 0.55);
        const legW = fighter.radius * 1.95;
        fistX = dist + legW * 0.45;
        fistY = 0;
      }
    } else if (rightProgress > 0 && isHeavy) {
      const helicoAngle = rightProgress * Math.PI * 2.0;
      const dist = fighter.radius * 1.90;
      fistX = Math.cos(helicoAngle) * dist;
      fistY = Math.sin(helicoAngle) * dist;
    } else {
      fistX = isLeft ? leftBaseX : rightBaseX;
      fistY = isLeft ? leftBaseY : rightBaseY;
    }
  } else {
    const isM2Active = (fighter.heavyWindup && fighter.heavyWindup > 0) || (rightProgress > 0 && isHeavy);

    if (isM2Active) {
      fistX = -fighter.radius * 0.35;
      fistY = isLeft ? -fighter.radius * 0.45 : fighter.radius * 0.45;
    } else {
      fistX = isLeft ? leftBaseX : rightBaseX;
      fistY = isLeft ? leftBaseY : rightBaseY;
    }
  }

  return { fistX, fistY };
}
