import { FistIKContext } from './types';

export function getAikidoFistPos(ctx: FistIKContext): { fistX: number; fistY: number } {
  const { fighter, fist, idleTime, isBlockingActive, isLeft, leftProgress, rightProgress, easeProgress } = ctx;

  let rightBaseX = fighter.radius * 1.55;
  let rightBaseY = fighter.radius * 0.42;
  let leftBaseX = fighter.radius * 0.90;
  let leftBaseY = -fighter.radius * 0.20;

  const stage = fist.comboStage !== undefined ? fist.comboStage : (fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1));
  const rightFist = fighter.fists ? (fighter.fists.find(f => f.punchType === 'right') || fighter.fists[1]) : undefined;
  const leftFist = fighter.fists ? (fighter.fists.find(f => f.punchType === 'left') || fighter.fists[0]) : undefined;

  const isCurledForS2 = (fighter.comboStage === 1 && rightProgress === 0) || (leftProgress > 0 && (stage === 1 || stage === 0 || leftFist?.comboStage === 1));
  const curlFactor = (fighter as any).aikiCurlFactor !== undefined ? (fighter as any).aikiCurlFactor : (isCurledForS2 ? 1.0 : 0.0);
  const curlEase = 0.5 - 0.5 * Math.cos(curlFactor * Math.PI);

  rightBaseX = (fighter.radius * 1.55) * (1 - curlEase) + (fighter.radius * 0.28) * curlEase;
  rightBaseY = (fighter.radius * 0.42) * (1 - curlEase) + (fighter.radius * 0.38) * curlEase;

  const leftIdleMix = leftProgress > 0 ? 0 : (rightProgress > 0 ? 0 : 1);
  const rightIdleMix = rightProgress > 0 ? 0 : (leftProgress > 0 ? 0 : (1 - curlEase));

  const aikiFloat = Math.sin(idleTime * 0.12566) * 1.5;
  rightBaseX += aikiFloat * rightIdleMix;
  leftBaseX += aikiFloat * leftIdleMix;

  let fistX = 0;
  let fistY = 0;

  if (fighter.aikiSlamStage) {
    const slamProgress = Math.min(1.0, Math.max(0, (90 - ((fighter as any).aikiSlamTimer || 0)) / 90));
    if (slamProgress < 0.25) {
      fistX = isLeft ? fighter.radius * 0.70 : fighter.radius * 1.85;
      fistY = isLeft ? -fighter.radius * 0.30 : fighter.radius * 0.10;
    } else if (slamProgress <= 0.70) {
      const pullT = (slamProgress - 0.25) / 0.45;
      fistX = isLeft ? fighter.radius * (0.70 + 0.50 * Math.sin(pullT * Math.PI)) : fighter.radius * (1.85 - 0.25 * Math.sin(pullT * Math.PI));
      fistY = isLeft ? -fighter.radius * 0.20 : fighter.radius * 0.10;
    } else {
      fistX = isLeft ? fighter.radius * 1.20 : fighter.radius * 1.35;
      fistY = isLeft ? -fighter.radius * 0.25 : fighter.radius * 0.25;
    }
  } else if (isBlockingActive) {
    fistX = isLeft ? fighter.radius * 0.95 : fighter.radius * 1.25;
    fistY = isLeft ? -fighter.radius * 0.28 : fighter.radius * 0.18;
  } else if (rightProgress > 0) {
    if (!isLeft) {
      if (stage === 0) {
        const isForward = rightFist ? (rightFist.isPunching || !!rightFist.isLingerActive) : false;
        const windupSplit = 0.52;
        if (isForward) {
          if (rightProgress < windupSplit) {
            const wT = rightProgress / windupSplit;
            const pullRatio = Math.sin(wT * Math.PI * 0.5);
            fistX = (fighter.radius * 1.55) - pullRatio * (fighter.radius * 1.55 - fighter.radius * 0.28);
            fistY = (fighter.radius * 0.42) + pullRatio * (fighter.radius * 0.48 - fighter.radius * 0.42);
          } else {
            const thrustT = (rightProgress - windupSplit) / (1 - windupSplit);
            const thrustEase = 1 - Math.pow(1 - thrustT, 3.2);
            fistX = (fighter.radius * 0.28) + thrustEase * (fighter.radius * 3.30 - fighter.radius * 0.28);
            fistY = (fighter.radius * 0.48) * (1 - thrustEase);
          }
        } else {
          const retEase = rightProgress * rightProgress * (3 - 2 * rightProgress);
          fistX = (fighter.radius * 1.55) * (1 - retEase) + (fighter.radius * 3.30) * retEase;
          fistY = (fighter.radius * 0.42) * (1 - retEase);
        }
      } else if (stage === 2) {
        // S3: Flowing Tenkan Arm-Cross Sweep (Graceful, seamless circular deflection)
        const isForward = rightFist ? (rightFist.isPunching || !!rightFist.isLingerActive) : false;
        const p = rightProgress;
        if (isForward) {
          // Circular sweeping path: Sweeps forward across centerline in a smooth spiral arc
          const sweepEase = Math.sin(p * Math.PI * 0.5);
          const arcLift = Math.sin(p * Math.PI) * fighter.radius * 0.38;
          fistX = rightBaseX * (1 - sweepEase) + (fighter.radius * 2.20) * sweepEase;
          fistY = rightBaseY * (1 - sweepEase) + (-fighter.radius * 0.22) * sweepEase - arcLift;
        } else {
          // Seamless, fluid return to Hanmi ready guard
          const retEase = p * p * (3 - 2 * p);
          fistX = rightBaseX * (1 - retEase) + (fighter.radius * 2.20) * retEase;
          fistY = rightBaseY * (1 - retEase) + (-fighter.radius * 0.22) * retEase;
        }
      } else if (stage === 3) {
        const isForward = rightFist ? (rightFist.isPunching || !!rightFist.isLingerActive) : false;
        const windupSplit = 0.55;
        if (isForward) {
          if (rightProgress < windupSplit) {
            const wT = rightProgress / windupSplit;
            const pullEase = Math.sin(wT * Math.PI * 0.5);
            fistX = rightBaseX - pullEase * (rightBaseX - fighter.radius * 0.28);
            fistY = rightBaseY + pullEase * (fighter.radius * 0.45 - rightBaseY);
          } else {
            const dT = (rightProgress - windupSplit) / (1 - windupSplit);
            const thrustEase = 1 - Math.pow(1 - dT, 3.5);
            fistX = (fighter.radius * 0.28) + thrustEase * (fighter.radius * 3.45 - fighter.radius * 0.28);
            fistY = (fighter.radius * 0.45) * (1 - thrustEase);
          }
        } else {
          const retEase = rightProgress * rightProgress * (3 - 2 * rightProgress);
          fistX = rightBaseX + retEase * (fighter.radius * 3.45 - rightBaseX);
          fistY = rightBaseY * (1 - retEase);
        }
      } else {
        fistX = rightBaseX + easeProgress * fighter.radius * 1.5;
        fistY = rightBaseY;
      }
    } else {
      if (stage === 3) {
        const stabRatio = Math.sin(rightProgress * Math.PI * 0.5);
        fistX = leftBaseX + stabRatio * (fighter.radius * 0.42 - leftBaseX);
        fistY = leftBaseY + stabRatio * (-fighter.radius * 0.45 - leftBaseY);
      } else if (stage === 2) {
        // S3 Left Counter-Arm: Harmonizes seamlessly with the right sweep in an interlocking Aiki trap
        const isForward = rightFist ? (rightFist.isPunching || !!rightFist.isLingerActive) : false;
        const p = rightProgress;
        if (isForward) {
          const sweepEase = Math.sin(p * Math.PI * 0.5);
          const arcLift = Math.sin(p * Math.PI) * fighter.radius * 0.22;
          fistX = leftBaseX * (1 - sweepEase) + (fighter.radius * 1.45) * sweepEase;
          fistY = leftBaseY * (1 - sweepEase) + (fighter.radius * 0.18) * sweepEase + arcLift;
        } else {
          const retEase = p * p * (3 - 2 * p);
          fistX = leftBaseX * (1 - retEase) + (fighter.radius * 1.45) * retEase;
          fistY = leftBaseY * (1 - retEase) + (fighter.radius * 0.18) * retEase;
        }
      } else {
        fistX = leftBaseX;
        fistY = leftBaseY;
      }
    }
  } else if (leftProgress > 0) {
    if (isLeft) {
      if (stage === 1 || stage === 0 || leftFist?.comboStage === 1) {
        const isForward = leftFist ? (leftFist.isPunching || !!leftFist.isLingerActive) : false;
        const windupSplit = 0.44;
        if (isForward) {
          if (leftProgress < windupSplit) {
            const wT = leftProgress / windupSplit;
            const pullEase = Math.sin(wT * Math.PI * 0.5);
            fistX = leftBaseX - pullEase * (leftBaseX - (-fighter.radius * 0.42));
            fistY = leftBaseY - pullEase * (fighter.radius * 1.25);
          } else {
            const sT = (leftProgress - windupSplit) / (1 - windupSplit);
            const slashEase = 0.5 - 0.5 * Math.cos(sT * Math.PI);
            const reachEase = Math.sin(sT * Math.PI * 0.5);
            const startSlashY = leftBaseY - fighter.radius * 1.25;
            const targetSlashY = fighter.radius * 1.55;
            fistX = (-fighter.radius * 0.42) + reachEase * (fighter.radius * 2.65 - (-fighter.radius * 0.42));
            fistY = startSlashY + slashEase * (targetSlashY - startSlashY);
          }
        } else {
          const retEase = leftProgress * leftProgress * (3 - 2 * leftProgress);
          fistX = leftBaseX + retEase * (fighter.radius * 2.65 - leftBaseX);
          fistY = leftBaseY + retEase * (fighter.radius * 1.55 - leftBaseY);
        }
      } else {
        fistX = leftBaseX + easeProgress * fighter.radius * 1.5;
        fistY = leftBaseY;
      }
    } else {
      fistX = rightBaseX;
      fistY = rightBaseY;
    }
  } else {
    fistX = isLeft ? leftBaseX : rightBaseX;
    fistY = isLeft ? leftBaseY : rightBaseY;
  }

  return { fistX, fistY };
}
