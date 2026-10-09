import { Fighter, Fist } from '../types';
import { CombatFighter } from './types';
import { getFistRelativePos, initFistPunchBlend } from './fistIK/index';
import { getKickShoulderAngle } from './kickAnimation';

export { getFistRelativePos, initFistPunchBlend };

/**
 * Quintic smoothstep stance sway factor for Iron Boxing (-1.0 to +1.0) with 0.15s pause at peaks
 */
export const getIronSwayFactor = (gameTime: number): number => {
  const moveF = 42;
  const pauseF = 9;
  const cycle = (moveF + pauseF) * 2;
  const tPhase = gameTime % cycle;
  if (tPhase < moveF) {
    const norm = tPhase / moveF;
    const smooth = norm * norm * norm * (norm * (norm * 6 - 15) + 10);
    return -1.0 + 2.0 * smooth;
  } else if (tPhase < moveF + pauseF) {
    return 1.0;
  } else if (tPhase < moveF * 2 + pauseF) {
    const norm = (tPhase - (moveF + pauseF)) / moveF;
    const smooth = norm * norm * norm * (norm * (norm * 6 - 15) + 10);
    return 1.0 - 2.0 * smooth;
  } else {
    return -1.0;
  }
};

/**
 * Smooth, non-bouncy sinusoidal easing curve for Capoeira M1 strikes
 */
export const getCapoeiraKickEase = (p: number): number => {
  if (p <= 0 || p >= 1) return 0;
  return Math.sin(p * Math.PI);
};

/**
 * Calculates clamped fist coordinates and joint parameters with IK constraints
 */
export const getClampedFistPos = (
  fighter: CombatFighter | Fighter,
  fist: Fist,
  idleTime: number,
  isBlockingActive: boolean,
  isCollision: boolean,
  gameTime: number = 0
) => {
  const isLeft = fist.punchType === 'left';
  let shoulderAngle = isLeft ? -Math.PI / 2.3 : Math.PI / 2.3;
  if (fighter.styleId === 'street_boxing') {
    if (isBlockingActive) {
      if (isLeft) {
        shoulderAngle = -Math.PI / 5.2;
      } else {
        shoulderAngle = Math.PI / 2.45;
      }
    } else if (isLeft) {
      shoulderAngle = -Math.PI / 2.65;
    }
  } else if (fighter.styleId === 'boxing_shell') {
    const ironSway = getIronSwayFactor(gameTime);
    if (isLeft) {
      shoulderAngle = -Math.PI / 2.05;
      if (fist.punchProgress === 0) {
        if (ironSway < 0) {
          shoulderAngle += ironSway * 0.14;
        } else {
          shoulderAngle += ironSway * 0.04;
        }
      }
    } else {
      if (fist.punchProgress === 0) {
        if (ironSway > 0) {
          shoulderAngle += ironSway * 0.14;
        } else {
          shoulderAngle += ironSway * 0.04;
        }
      }
    }
  } else if (fighter.styleId === 'kyokushin') {
    const isKyokushinWindup = (fighter.heavyWindup && fighter.heavyWindup > 0);
    const rightFistObj = fighter.fists ? (fighter.fists.find((f: any) => f.punchType === 'right') || fighter.fists[1]) : undefined;
    const isKyokushinM2Executing = (rightFistObj && rightFistObj.isHeavy && (rightFistObj.isPunching || rightFistObj.punchProgress > 0)) || ((fighter as any).kyokushinM2PeakHoldTimer || 0) > 0;
    const defaultLeft = -Math.PI / 2.25;
    const defaultRight = Math.PI / 2.25;

    if (isKyokushinWindup) {
      const ratio = Math.min(1.0, Math.max(0, (33 - (fighter.heavyWindup || 0)) / 33));
      if (isLeft) {
        shoulderAngle = defaultLeft - ratio * 0.06;
      } else {
        shoulderAngle = defaultRight + ratio * 0.38; // Coils right shoulder backward past ribs
      }
    } else if (isKyokushinM2Executing) {
      const isPunching = fighter.kyokushinM2Stage === 'thrust' || (rightFistObj ? rightFistObj.isPunching : false);
      const p = fighter.kyokushinM2Progress !== undefined ? fighter.kyokushinM2Progress : (rightFistObj ? rightFistObj.punchProgress : 0);
      const isPeakLock = fighter.kyokushinM2Stage === 'freeze' || ((fighter as any).kyokushinM2FreezeTimer || 0) > 0 || ((fighter as any).kyokushinM2PeakHoldTimer || 0) > 0;

      if (isPunching) {
        if (isLeft) {
          shoulderAngle = (defaultLeft - 0.06) * (1 - p) + (-Math.PI / 1.45) * p; // Left shoulder pulls back with Hikite
        } else {
          shoulderAngle = (defaultRight + 0.38) * (1 - p) + (Math.PI / 2.80) * p; // Right shoulder drives forward behind fist
        }
      } else if (isPeakLock) {
        shoulderAngle = isLeft ? -Math.PI / 1.45 : Math.PI / 2.80;
      } else {
        const retractT = Math.min(1.0, Math.max(0, 1.0 - p));
        const ease = retractT * retractT * (3 - 2 * retractT); // Smoothstep deceleration
        if (isLeft) {
          shoulderAngle = (-Math.PI / 1.45) * (1 - ease) + defaultLeft * ease;
        } else {
          shoulderAngle = (Math.PI / 2.80) * (1 - ease) + defaultRight * ease;
        }
      }
    } else {
      shoulderAngle = isLeft ? defaultLeft : defaultRight;
    }
  } else if (fighter.styleId === 'aikido') {
    const rightFist = fighter.fists ? (fighter.fists.find((f: any) => f.punchType === 'right') || fighter.fists[1]) : undefined;
    const leftFist = fighter.fists ? (fighter.fists.find((f: any) => f.punchType === 'left') || fighter.fists[0]) : undefined;
    const rightProgress = rightFist ? rightFist.punchProgress : 0;
    const leftProgress = leftFist ? leftFist.punchProgress : 0;
    const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
    const isCurledForS2 = (fighter.comboStage === 1 && rightProgress === 0) || (leftProgress > 0 && (stage === 1 || stage === 0 || leftFist?.comboStage === 1));
    const curlFactor = (fighter as any).aikiCurlFactor !== undefined ? (fighter as any).aikiCurlFactor : (isCurledForS2 ? 1.0 : 0.0);
    const curlEase = 0.5 - 0.5 * Math.cos(curlFactor * Math.PI);
    const isS1Active = rightProgress > 0 && (stage === 0 || rightFist?.comboStage === 0);
    const isS2Active = leftProgress > 0 && (stage === 1 || stage === 0 || leftFist?.comboStage === 1);
    const isS3Active = rightProgress > 0 && (stage === 2 || rightFist?.comboStage === 2);
    const isS4Active = rightProgress > 0 && (stage === 3 || rightFist?.comboStage === 3);
    if (isLeft) {
      let sAngle = -Math.PI / 1.90;
      if (isS1Active) {
        const isForward = rightFist ? rightFist.isPunching : false;
        const windupSplit = 0.52;
        if (isForward) {
          if (rightProgress < windupSplit) {
            const wT = rightProgress / windupSplit;
            const windupRatio = Math.sin(wT * Math.PI * 0.5);
            sAngle -= windupRatio * 0.18;
          } else {
            const thrustT = (rightProgress - windupSplit) / (1 - windupSplit);
            const thrustEase = 1 - Math.pow(1 - thrustT, 3.2);
            sAngle = (-Math.PI / 1.90 - 0.18) * (1 - thrustEase) + (-Math.PI / 1.65) * thrustEase;
          }
        } else {
          const retEase = rightProgress * rightProgress * (3 - 2 * rightProgress);
          sAngle = (-Math.PI / 1.90) * (1 - retEase) + (-Math.PI / 1.65) * retEase;
        }
      } else if (isS2Active) {
        const isForward = leftFist ? leftFist.isPunching : false;
        const windupSplit = 0.44;
        if (isForward) {
          if (leftProgress < windupSplit) {
            const wT = leftProgress / windupSplit;
            sAngle = (-Math.PI / 1.90) - Math.sin(wT * Math.PI * 0.5) * 0.35;
          } else {
            const sT = (leftProgress - windupSplit) / (1 - windupSplit);
            const slashEase = 0.5 - 0.5 * Math.cos(sT * Math.PI);
            sAngle = (-Math.PI / 1.90 - 0.35) * (1 - slashEase) + (-Math.PI / 2.30) * slashEase;
          }
        } else {
          const retEase = leftProgress * leftProgress * (3 - 2 * leftProgress);
          sAngle = (-Math.PI / 1.90) * (1 - retEase) + (-Math.PI / 2.30) * retEase;
        }
      } else if (isS3Active) {
        const sweepRatio = Math.sin(rightProgress * Math.PI * 0.5);
        sAngle += sweepRatio * 0.35;
      } else if (isS4Active) {
        const tuckRatio = Math.sin(rightProgress * Math.PI * 0.5);
        sAngle -= tuckRatio * 0.20;
      }
      shoulderAngle = sAngle;
    } else {
      let sAngle = (Math.PI / 2.0) * (1 - curlEase) + (Math.PI / 1.70) * curlEase;
      if (isS1Active) {
        const isForward = rightFist ? rightFist.isPunching : false;
        const windupSplit = 0.52;
        if (isForward) {
          if (rightProgress < windupSplit) {
            const wT = rightProgress / windupSplit;
            const windupRatio = Math.sin(wT * Math.PI * 0.5);
            sAngle = Math.PI / 2.0 + windupRatio * 0.45;
          } else {
            const thrustT = (rightProgress - windupSplit) / (1 - windupSplit);
            const thrustEase = 1 - Math.pow(1 - thrustT, 3.2);
            sAngle = (Math.PI / 2.0 + 0.45) * (1 - thrustEase) + (Math.PI / 3.4) * thrustEase;
          }
        } else {
          const retEase = rightProgress * rightProgress * (3 - 2 * rightProgress);
          sAngle = (Math.PI / 2.0) * (1 - retEase) + (Math.PI / 3.4) * retEase;
        }
      } else if (isS3Active) {
        const isForward = rightFist ? rightFist.isPunching : false;
        if (isForward) {
          if (rightProgress < 0.55) {
            const wT = rightProgress / 0.55;
            const sweepT = Math.sin(wT * Math.PI * 0.5);
            sAngle -= sweepT * 0.25;
          } else {
            const sT = (rightProgress - 0.55) / 0.45;
            const thrustEase = 1 - Math.pow(1 - sT, 2.8);
            sAngle = (Math.PI / 2.0 - 0.25) * (1 - thrustEase) + (Math.PI / 2.6) * thrustEase;
          }
        } else {
          const retEase = rightProgress * rightProgress * (3 - 2 * rightProgress);
          sAngle = (Math.PI / 2.0) * (1 - retEase) + (Math.PI / 2.6) * retEase;
        }
      } else if (isS4Active) {
        const isForward = rightFist ? rightFist.isPunching : false;
        if (isForward) {
          if (rightProgress < 0.60) {
            const wT = rightProgress / 0.60;
            const elevEase = Math.sin(wT * Math.PI * 0.5);
            sAngle += elevEase * 0.40;
          } else {
            const dT = (rightProgress - 0.60) / 0.40;
            const chopEase = 1 - Math.pow(1 - dT, 3.5);
            sAngle = (Math.PI / 2.0 + 0.40) * (1 - chopEase) + (Math.PI / 3.2) * chopEase;
          }
        } else {
          const retEase = rightProgress * rightProgress * (3 - 2 * rightProgress);
          sAngle = (Math.PI / 2.0) * (1 - retEase) + (Math.PI / 3.2) * retEase;
        }
      }
      shoulderAngle = sAngle;
    }
  }
  shoulderAngle = getKickShoulderAngle(fighter as CombatFighter, isLeft, shoulderAngle);
  const anchorRadius = fighter.radius * 0.85;
  const shoulderX = Math.cos(shoulderAngle) * anchorRadius;
  const shoulderY = Math.sin(shoulderAngle) * anchorRadius;

  const { fistX: rawX, fistY: rawY } = getFistRelativePos(fighter, fist, idleTime, isBlockingActive, isCollision, gameTime);

  const isSlugger = fighter.styleId === 'slugger';
  const isBoxing = fighter.styleId === 'street_boxing' || fighter.styleId === 'basic' || fighter.styleId === 'boxing_shell';
  const isMuayThai = fighter.styleId === 'muay_thai';
  const isAshihara = fighter.styleId === 'ashihara';
  const isShotokan = fighter.styleId === 'shotokan';
  const isKyokushin = fighter.styleId === 'kyokushin';
  const isTaekwondo = fighter.styleId === 'street_taekwondo';
  const isCapoeira = fighter.styleId === 'capoeira';
  const isKeysi = fighter.styleId === 'keysi';
  const isAikido = fighter.styleId === 'aikido';

  let armScale = 1.0;
  if (isSlugger) armScale = 1.08; // Normal limb reach
  else if (isBoxing) armScale = 1.25; 
  else if (isMuayThai) armScale = 1.18; 
  else if (isAshihara) armScale = 1.15;
  else if (isShotokan) armScale = 1.15;
  else if (isKyokushin) armScale = 1.25;
  else if (isTaekwondo) armScale = 1.20;
  else if (isCapoeira) armScale = 1.25;
  else if (isKeysi) armScale = 1.15; // Visual arm rendering length
  else if (isAikido) armScale = 1.22;
  else armScale = 1.08; 

  const L1 = fighter.radius * 0.72 * armScale;
  const L2 = fighter.radius * 0.68 * armScale;
  const totalL = L1 + L2;

  const dx = rawX - shoulderX;
  const dy = rawY - shoulderY;
  const D = Math.sqrt(dx * dx + dy * dy);

  const clampedD = Math.min(D, totalL);
  const clampedFistX = D > 0 ? shoulderX + (dx / D) * clampedD : shoulderX;
  const clampedFistY = D > 0 ? shoulderY + (dy / D) * clampedD : shoulderY;

  return { fistX: clampedFistX, fistY: clampedFistY, L1, L2, totalL, shoulderX, shoulderY };
};
