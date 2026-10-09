import { CombatFighter } from '../types';
import { Fist } from '../../types';
import { KickAttackInfo } from './types';

export type { KickAttackInfo };

/**
 * Identifies if the current fighter's active strike is an attack classified as a kick.
 */
export function getKickAttackInfo(
  fighter: CombatFighter,
  fist?: Fist | null
): KickAttackInfo {
  const defaultInfo: KickAttackInfo = {
    isKick: false,
    isStandardKick: false,
    isCapoeiraKick: false,
    kickStage: 0,
    isHeavyKick: false,
    activeProgress: 0,
    attackProgress: 0,
    isLeftLimb: false,
    snapEasing: 0,
  };

  if (!fighter) return defaultInfo;

  const leftFist = fighter.fists ? fighter.fists.find(f => f.punchType === 'left') : undefined;
  const rightFist = fighter.fists ? fighter.fists.find(f => f.punchType === 'right') : undefined;
  const leftP = leftFist ? leftFist.punchProgress : 0;
  const rightP = rightFist ? rightFist.punchProgress : 0;

  const isLeftActive = leftP > 0;
  const isRightActive = rightP > 0;

  if (!isLeftActive && !isRightActive) {
    return defaultInfo;
  }

  const activeFist = fist || (isLeftActive ? leftFist : rightFist);
  const isLeft = activeFist?.punchType === 'left';
  const progress = isLeft ? leftP : rightP;
  const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
  const isHeavy = !!(activeFist?.isHeavy || (rightFist && rightFist.isHeavy && isRightActive));

  const isPunching = activeFist?.isPunching ?? true;
  const attackProgress = isPunching ? (progress * 0.5) : (0.5 + (1.0 - progress) * 0.5);
  const snapEasing = Math.pow(Math.sin(attackProgress * Math.PI), 0.35);

  let isKick = false;
  let isCapoeiraKick = false;

  const style = fighter.styleId;

  if (style === 'street_taekwondo') {
    isKick = true;
  } else if (style === 'capoeira') {
    isKick = true;
    isCapoeiraKick = true;
  } else if (style === 'kickboxing') {
    if (isLeftActive && stage === 2) {
      isKick = true;
    } else if (isRightActive && isHeavy && ((activeFist as any)?.kickboxingSeq2 || fighter.kickboxingIsSeq2)) {
      isKick = true;
    }
  } else if (style === 'shotokan') {
    if (isLeftActive && stage === 3) {
      isKick = true;
    } else if (isRightActive && isHeavy) {
      isKick = true;
    }
  } else if (style === 'muay_thai') {
    if (isLeftActive && stage === 3) {
      isKick = true;
    } else if (isRightActive && isHeavy) {
      isKick = true;
    }
  } else if (style === 'ashihara') {
    if (isRightActive && (stage === 1 || stage === 3)) {
      isKick = true;
    } else if (isLeftActive && stage === 2) {
      isKick = true;
    }
  } else if (style === 'keysi') {
    if (isRightActive && stage === 3 && !isHeavy) {
      isKick = true;
    }
  } else if (style === 'kyokushin') {
    if (isRightActive && stage === 1 && !isHeavy) {
      isKick = true; // S2 Gedan Geri (Calf Kick)
    }
  } else if ((fighter as any).isKickingStyle || (activeFist as any)?.isKick) {
    isKick = true;
  }

  const isArmWhipKickStyle = style === 'street_taekwondo' || (fighter as any).isKickingStyle || !!(activeFist as any)?.isArmWhipKick;

  return {
    isKick,
    isStandardKick: isKick && isArmWhipKickStyle,
    isCapoeiraKick,
    kickStage: stage,
    isHeavyKick: isHeavy,
    activeProgress: progress,
    attackProgress,
    isLeftLimb: isLeft,
    snapEasing,
  };
}

export function getKickShoulderAngle(
  fighter: CombatFighter,
  isLeft: boolean,
  baseShoulderAngle: number
): number {
  const kickInfo = getKickAttackInfo(fighter);

  if (kickInfo.isStandardKick && kickInfo.kickStage !== 3) {
    const leftFist = fighter.fists ? fighter.fists.find(f => f.punchType === 'left') : undefined;
    const rightFist = fighter.fists ? fighter.fists.find(f => f.punchType === 'right') : undefined;
    const leftP = leftFist ? leftFist.punchProgress : 0;
    const rightP = rightFist ? rightFist.punchProgress : 0;

    if (isLeft && leftP > 0) {
      const leftAttackT = leftFist?.isPunching ? (leftP * 0.5) : (0.5 + (1.0 - leftP) * 0.5);
      const snapE = Math.pow(Math.sin(leftAttackT * Math.PI), 0.35);
      return baseShoulderAngle - snapE * 1.35;
    } else if (!isLeft && rightP > 0) {
      const rightAttackT = rightFist?.isPunching ? (rightP * 0.5) : (0.5 + (1.0 - rightP) * 0.5);
      const snapE = Math.pow(Math.sin(rightAttackT * Math.PI), 0.35);
      return baseShoulderAngle + snapE * 1.35;
    }
  }

  return baseShoulderAngle;
}

export function getKickArmIK(
  fighter: CombatFighter,
  fist: Fist,
  isLeft: boolean,
  shoulderX: number,
  shoulderY: number,
  L1: number,
  L2: number
): { elbowX: number; elbowY: number; actualFistX: number; actualFistY: number; isOverridden: boolean } {
  const kickInfo = getKickAttackInfo(fighter, fist);

  if (kickInfo.isStandardKick && kickInfo.kickStage !== 3) {
    const leftFist = fighter.fists ? fighter.fists.find(f => f.punchType === 'left') : undefined;
    const rightFist = fighter.fists ? fighter.fists.find(f => f.punchType === 'right') : undefined;
    const leftP = leftFist ? leftFist.punchProgress : 0;
    const rightP = rightFist ? rightFist.punchProgress : 0;

    if (isLeft && leftP > 0) {
      const attackT = leftFist?.isPunching ? (leftP * 0.5) : (0.5 + (1.0 - leftP) * 0.5);
      const snapE = Math.pow(Math.sin(attackT * Math.PI), 0.35);
      const elbowAngle = -Math.PI / 2.3 - snapE * 1.60;
      const elbowX = shoulderX + L1 * Math.cos(elbowAngle);
      const elbowY = shoulderY + L1 * Math.sin(elbowAngle);

      const forearmAngle = elbowAngle + (105 * Math.PI / 180);
      const actualFistX = elbowX + L2 * Math.cos(forearmAngle);
      const actualFistY = elbowY + L2 * Math.sin(forearmAngle);

      return { elbowX, elbowY, actualFistX, actualFistY, isOverridden: true };
    } else if (!isLeft && rightP > 0) {
      const attackT = rightFist?.isPunching ? (rightP * 0.5) : (0.5 + (1.0 - rightP) * 0.5);
      const snapE = Math.pow(Math.sin(attackT * Math.PI), 0.35);
      const elbowAngle = Math.PI / 2.3 + snapE * 1.60;
      const elbowX = shoulderX + L1 * Math.cos(elbowAngle);
      const elbowY = shoulderY + L1 * Math.sin(elbowAngle);

      const forearmAngle = elbowAngle - (105 * Math.PI / 180);
      const actualFistX = elbowX + L2 * Math.cos(forearmAngle);
      const actualFistY = elbowY + L2 * Math.sin(forearmAngle);

      return { elbowX, elbowY, actualFistX, actualFistY, isOverridden: true };
    }
  }

  return { elbowX: 0, elbowY: 0, actualFistX: 0, actualFistY: 0, isOverridden: false };
}

export function getKickGloveRotation(
  fighter: CombatFighter,
  fist: Fist,
  isLeft: boolean,
  baseForearmAngle: number
): number {
  const kickInfo = getKickAttackInfo(fighter, fist);

  if (kickInfo.isStandardKick && kickInfo.kickStage !== 3) {
    const fP = fist.punchProgress || 0;
    if (fP > 0) {
      const attackT = fist.isPunching ? (fP * 0.5) : (0.5 + (1.0 - fP) * 0.5);
      const snapE = Math.pow(Math.sin(attackT * Math.PI), 0.35);
      return baseForearmAngle + (isLeft ? (-snapE * 0.35) : (snapE * 0.35));
    }
  }

  return baseForearmAngle;
}

export function getKickArmRestingPositions(
  fighter: CombatFighter,
  fist: Fist,
  isLeft: boolean,
  leftBaseX: number,
  leftBaseY: number,
  rightBaseX: number,
  rightBaseY: number
): { fistX: number; fistY: number; handled: boolean } {
  const kickInfo = getKickAttackInfo(fighter, fist);

  if (kickInfo.isStandardKick && kickInfo.kickStage !== 3) {
    const leftFist = fighter.fists ? fighter.fists.find(f => f.punchType === 'left') : undefined;
    const rightFist = fighter.fists ? fighter.fists.find(f => f.punchType === 'right') : undefined;
    const leftP = leftFist ? leftFist.punchProgress : 0;
    const rightP = rightFist ? rightFist.punchProgress : 0;

    if (leftP > 0) {
      const leftAttackT = leftFist?.isPunching ? (leftP * 0.5) : (0.5 + (1.0 - leftP) * 0.5);
      const snapEasing = Math.pow(Math.sin(leftAttackT * Math.PI), 0.35);

      if (isLeft) {
        const sAngle = -Math.PI / 2.3 - snapEasing * 1.35;
        const eAngle = -Math.PI / 2.3 - snapEasing * 1.60;
        const L1 = fighter.radius * 2.2;
        const L2 = fighter.radius * 2.0;
        const sX = Math.cos(sAngle) * fighter.radius * 0.85;
        const sY = Math.sin(sAngle) * fighter.radius * 0.85;
        const eX = sX + L1 * Math.cos(eAngle);
        const eY = sY + L1 * Math.sin(eAngle);
        const fAngle = eAngle + (105 * Math.PI / 180);
        return {
          fistX: eX + L2 * Math.cos(fAngle),
          fistY: eY + L2 * Math.sin(fAngle),
          handled: true,
        };
      } else {
        return {
          fistX: rightBaseX - snapEasing * fighter.radius * 0.12,
          fistY: rightBaseY - snapEasing * fighter.radius * 0.10,
          handled: true,
        };
      }
    } else if (rightP > 0) {
      const rightAttackT = rightFist?.isPunching ? (rightP * 0.5) : (0.5 + (1.0 - rightP) * 0.5);
      const snapEasing = Math.pow(Math.sin(rightAttackT * Math.PI), 0.35);

      if (!isLeft) {
        const sAngle = Math.PI / 2.3 + snapEasing * 1.35;
        const eAngle = Math.PI / 2.3 + snapEasing * 1.60;
        const L1 = fighter.radius * 2.2;
        const L2 = fighter.radius * 2.0;
        const sX = Math.cos(sAngle) * fighter.radius * 0.85;
        const sY = Math.sin(sAngle) * fighter.radius * 0.85;
        const eX = sX + L1 * Math.cos(eAngle);
        const eY = sY + L1 * Math.sin(eAngle);
        const fAngle = eAngle - (105 * Math.PI / 180);
        return {
          fistX: eX + L2 * Math.cos(fAngle),
          fistY: eY + L2 * Math.sin(fAngle),
          handled: true,
        };
      } else {
        return {
          fistX: leftBaseX - snapEasing * fighter.radius * 0.12,
          fistY: leftBaseY + snapEasing * fighter.radius * 0.10,
          handled: true,
        };
      }
    }
  }

  return { fistX: 0, fistY: 0, handled: false };
}
