import { FistIKContext } from './types';

export function getStreetBoxingFistPos(ctx: FistIKContext): { fistX: number; fistY: number } {
  const { fighter, fist, idleTime, isBlockingActive, isLeft, leftProgress, rightProgress } = ctx;

  if (isBlockingActive) {
    if (isLeft) {
      return { fistX: fighter.radius * 1.85, fistY: -fighter.radius * 0.08 };
    } else {
      return { fistX: fighter.radius * 1.48, fistY: -fighter.radius * 0.06 };
    }
  }

  let leftBaseX = fighter.radius * 1.62;
  let leftBaseY = -fighter.radius * 0.10;
  let rightBaseX = fighter.radius * 0.50;
  let rightBaseY = fighter.radius * 0.24;

  const leftGuardX = fighter.radius * 0.52;
  const leftGuardY = -fighter.radius * 0.24;

  const rightFist = fighter.fists?.find(f => f.punchType === 'right');
  const isS4Recovering = rightFist && !rightFist.isPunching && rightProgress > 0 && rightFist.comboStage === 3;
  const isReadyForS3OrS4 = (fighter.comboStage === 2 || fighter.comboStage === 3 || rightProgress > 0);

  const rightIdleMix = rightProgress > 0 ? 0 : (leftProgress > 0 ? 0 : 1);

  if (isReadyForS3OrS4 && leftProgress === 0) {
    if (isS4Recovering) {
      const retEase = Math.sin(rightProgress * Math.PI * 0.5);
      leftBaseX = (fighter.radius * 1.62) * (1 - retEase) + leftGuardX * retEase;
      leftBaseY = (-fighter.radius * 0.10) * (1 - retEase) + leftGuardY * retEase;
    } else {
      leftBaseX = leftGuardX;
      leftBaseY = leftGuardY;
    }
  } else if (!isReadyForS3OrS4 && leftProgress === 0 && rightProgress === 0) {
    const vCycle = (Math.sin(idleTime * 3.5) + 1) * 0.5;
    leftBaseX -= vCycle * fighter.radius * 0.35;
    leftBaseY -= vCycle * fighter.radius * 0.08;
  }

  rightBaseX += Math.sin(idleTime * 5.0 + Math.PI) * 0.4 * rightIdleMix;
  rightBaseY += Math.cos(idleTime * 5.0 + Math.PI) * 0.4 * rightIdleMix;

  let fistX = 0;
  let fistY = 0;

  if (leftProgress > 0) {
    if (isLeft) {
      const isHeavyLeftHook = fist.isHeavy || fighter.streetBoxingM2Stage === 3;
      if (isHeavyLeftHook) {
        const p = fist.punchProgress;
        if (fist.isPunching || fist.isLingerActive) {
          if (p < 0.28) {
            const pullP = Math.sin((p / 0.28) * Math.PI * 0.5);
            fistX = leftGuardX - pullP * fighter.radius * 0.40;
            fistY = leftGuardY - pullP * fighter.radius * 0.22;
          } else {
            const hookP = (p - 0.28) / 0.72;
            const hookEase = Math.sin(hookP * Math.PI * 0.5);
            const cockedX = leftGuardX - fighter.radius * 0.40;
            const cockedY = leftGuardY - fighter.radius * 0.22;
            const extensionX = hookEase * fighter.radius * 1.70;
            const loopY = -Math.sin(hookP * Math.PI) * fighter.radius * 0.90 + hookEase * fighter.radius * 0.55;
            fistX = cockedX + extensionX;
            fistY = cockedY + loopY;
          }
        } else {
          const retEase = Math.sin(p * Math.PI * 0.5);
          fistX = leftGuardX + retEase * fighter.radius * 1.15;
          fistY = leftGuardY + retEase * fighter.radius * 0.25;
        }
      } else {
        const comboStage = fist.comboStage !== undefined ? fist.comboStage : (fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1));
        const p = fist.punchProgress;

        if (fist.isPunching || fist.isLingerActive) {
          if (p < 0.28) {
            const pullP = Math.sin((p / 0.28) * Math.PI * 0.5);
            fistX = leftBaseX - pullP * fighter.radius * 0.45;
            fistY = leftBaseY;
          } else {
            const unspringP = (p - 0.28) / 0.72;
            const snapEase = Math.sin(unspringP * Math.PI * 0.5);
            const cockedX = leftBaseX - fighter.radius * 0.45;
            const extensionDist = (comboStage === 1 ? 1.05 : 0.95) * fighter.radius;
            fistX = cockedX + (leftBaseX + extensionDist - cockedX) * snapEase;
            fistY = leftBaseY;
          }
        } else {
          const retEase = Math.sin(p * Math.PI * 0.5);
          const extensionDist = (comboStage === 1 ? 1.05 : 0.95) * fighter.radius;
          const peakX = leftBaseX + extensionDist;
          const peakY = leftBaseY;
          // Retract all the way back into neutral guard anchor
          fistX = leftGuardX + (peakX - leftGuardX) * retEase;
          fistY = leftGuardY + (peakY - leftGuardY) * retEase;
        }
      }
    } else {
      fistX = rightBaseX;
      fistY = rightBaseY;
    }
  } else if (rightProgress > 0) {
    if (!isLeft) {
      const isM2RightJab = fist.isHeavy || fighter.streetBoxingM2Stage === 1 || fighter.streetBoxingM2Stage === 2;
      if (isM2RightJab) {
        const p = fist.punchProgress;
        if (fist.isPunching || fist.isLingerActive) {
          if (p < 0.28) {
            const pullP = Math.sin((p / 0.28) * Math.PI * 0.5);
            fistX = rightBaseX - pullP * fighter.radius * 0.45;
            fistY = rightBaseY;
          } else {
            const unspringP = (p - 0.28) / 0.72;
            const snapEase = Math.sin(unspringP * Math.PI * 0.5);
            const cockedX = rightBaseX - fighter.radius * 0.45;
            const extensionDist = 1.05 * fighter.radius;
            fistX = cockedX + (rightBaseX + extensionDist - cockedX) * snapEase;
            fistY = rightBaseY;
          }
        } else {
          const retEase = Math.sin(p * Math.PI * 0.5);
          fistX = rightBaseX + retEase * 1.05 * fighter.radius;
          fistY = rightBaseY;
        }
      } else {
        const comboStage = fist.comboStage !== undefined ? fist.comboStage : (fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1));
        const p = fist.punchProgress;

        if (comboStage === 2) {
          if (fist.isPunching || fist.isLingerActive) {
            if (p < 0.26) {
              const pullP = Math.sin((p / 0.26) * Math.PI * 0.5);
              fistX = rightBaseX - pullP * fighter.radius * 0.35;
              fistY = rightBaseY + pullP * fighter.radius * 0.08;
            } else {
              const strikeP = (p - 0.26) / 0.74;
              const strikeEase = Math.sin(strikeP * Math.PI * 0.5);
              const cockedX = rightBaseX - fighter.radius * 0.35;
              fistX = cockedX + strikeEase * fighter.radius * 2.05;
              fistY = (rightBaseY + fighter.radius * 0.08) * (1 - strikeEase) + (fighter.radius * 0.02) * strikeEase;
            }
          } else {
            const retEase = Math.sin(p * Math.PI * 0.5);
            fistX = rightBaseX + retEase * fighter.radius * 1.45;
            fistY = rightBaseY + retEase * (-rightBaseY + fighter.radius * 0.02);
          }
        } else {
          if (fist.isPunching || fist.isLingerActive) {
            if (p < 0.28) {
              const pullP = Math.sin((p / 0.28) * Math.PI * 0.5);
              fistX = rightBaseX - pullP * fighter.radius * 0.40;
              fistY = rightBaseY + pullP * fighter.radius * 0.22;
            } else {
              const hookP = (p - 0.28) / 0.72;
              const hookEase = Math.sin(hookP * Math.PI * 0.5);
              const cockedX = rightBaseX - fighter.radius * 0.40;
              const cockedY = rightBaseY + fighter.radius * 0.22;
              const extensionX = hookEase * fighter.radius * 1.70;
              const loopY = Math.sin(hookP * Math.PI) * fighter.radius * 0.90 - hookEase * fighter.radius * 0.55;
              fistX = cockedX + extensionX;
              fistY = cockedY + loopY;
            }
          } else {
            const retEase = Math.sin(p * Math.PI * 0.5);
            fistX = rightBaseX + retEase * fighter.radius * 1.15;
            fistY = rightBaseY - retEase * fighter.radius * 0.25;
          }
        }
      }
    } else {
      if (isS4Recovering) {
        const retEase = Math.sin(rightProgress * Math.PI * 0.5);
        fistX = (fighter.radius * 1.62) * (1 - retEase) + leftGuardX * retEase;
        fistY = (-fighter.radius * 0.10) * (1 - retEase) + leftGuardY * retEase;
      } else {
        fistX = leftGuardX;
        fistY = leftGuardY;
      }
    }
  } else {
    fistX = isLeft ? leftBaseX : rightBaseX;
    fistY = isLeft ? leftBaseY : rightBaseY;
  }

  return { fistX, fistY };
}
