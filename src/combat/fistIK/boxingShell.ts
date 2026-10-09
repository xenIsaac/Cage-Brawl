import { FistIKContext } from './types';

export function getBoxingShellFistPos(ctx: FistIKContext): { fistX: number; fistY: number } {
  const { fighter, fist, idleTime, isBlockingActive, isLeft, leftProgress, rightProgress } = ctx;

  let rightBaseX = fighter.radius * 0.45;
  let rightBaseY = fighter.radius * 0.75;
  let leftBaseX = fighter.radius * 0.15;
  let leftBaseY = -fighter.radius * 0.65;

  const leftIdleMix = leftProgress > 0 ? 0 : (rightProgress > 0 ? 0 : 1);
  const rightIdleMix = rightProgress > 0 ? 0 : (leftProgress > 0 ? 0 : 1);

  leftBaseX += Math.sin(idleTime * 2.0) * 0.3 * leftIdleMix;
  leftBaseY += Math.cos(idleTime * 2.0) * 0.3 * leftIdleMix;
  rightBaseX += Math.sin(idleTime * 2.0 + Math.PI) * 0.3 * rightIdleMix;
  rightBaseY += Math.cos(idleTime * 2.0 + Math.PI) * 0.3 * rightIdleMix;

  let fistX = 0;
  let fistY = 0;

  if (isBlockingActive) {
    if (isLeft) {
      fistX = fighter.radius * 0.65;
      fistY = -fighter.radius * 0.25;
    } else {
      fistX = fighter.radius * 0.30;
      fistY = fighter.radius * 0.75;
    }
  } else if (fighter.heavyWindup && fighter.heavyWindup > 0) {
    const wProgress = (18 - fighter.heavyWindup) / 18;
    if (isLeft) {
      fistX = leftBaseX * 0.95;
      fistY = leftBaseY * 0.95;
    } else {
      fistX = rightBaseX * (0.85 - wProgress * 0.15);
      fistY = rightBaseY * (0.85 - wProgress * 0.25);
    }
  } else if (leftProgress > 0) {
    if (isLeft) {
      const leftFist = fighter.fists ? (fighter.fists.find(f => f.punchType === 'left') || fighter.fists[0]) : undefined;
      const stage = fist.comboStage !== undefined ? fist.comboStage : (fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1));
      const isForward = leftFist ? (leftFist.isPunching || !!leftFist.isLingerActive) : false;
      let sFactor = 0;
      let pullbackX = 0;
      let pullbackY = 0;

      if (isForward) {
        if (stage === 3 && leftProgress < 0.28) {
          const wT = leftProgress / 0.28;
          const pull = Math.sin(wT * Math.PI / 2);
          pullbackX = -pull * fighter.radius * 0.30;
          pullbackY = -pull * fighter.radius * 0.15;
          sFactor = 0;
        } else if (stage === 3) {
          const sT = (leftProgress - 0.28) / 0.72;
          const pull = Math.cos(sT * Math.PI / 2);
          pullbackX = -pull * fighter.radius * 0.30;
          pullbackY = -pull * fighter.radius * 0.15;
          sFactor = Math.sin(sT * Math.PI * 0.5) * 0.35 + (1 - Math.pow(1 - sT, 2.2)) * 0.65;
        } else {
          sFactor = Math.sin(leftProgress * Math.PI * 0.5) * 0.35 + (1 - Math.pow(1 - leftProgress, 2.2)) * 0.65;
        }
      } else {
        sFactor = leftProgress * leftProgress * (3 - 2 * leftProgress);
      }

      if (stage === 2) {
        const loopArc = Math.sin(sFactor * Math.PI) * fighter.radius * 0.38;
        const extension = sFactor * fighter.radius * 1.85;
        fistX = leftBaseX + sFactor * fighter.radius * 0.40 + pullbackX + extension;
        fistY = leftBaseY + pullbackY - loopArc + sFactor * fighter.radius * 0.55;
      } else {
        const loopArc = Math.sin(sFactor * Math.PI) * fighter.radius * 0.55;
        const extension = sFactor * fighter.radius * 1.95;
        fistX = leftBaseX + sFactor * fighter.radius * 0.35 + pullbackX + extension;
        fistY = leftBaseY + pullbackY - loopArc + sFactor * fighter.radius * 0.50;
      }
    } else {
      // NON-STRIKING RIGHT (LEAD) ARM WHEN LEFT IS STRIKING
      const stage = fist.comboStage !== undefined ? fist.comboStage : (fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1));
      if (stage === 2) {
        // S3 Dynamic Lead Feint: Fast, crisp lead-hand probe/feint flicking forward to bait/distract guard
        // during the startup phase of the rear hook before snapping tightly back to midsection!
        const feintT = Math.min(1.0, leftProgress * 2.2);
        const feintP = Math.sin(feintT * Math.PI);
        fistX = rightBaseX + feintP * fighter.radius * 1.15;
        fistY = rightBaseY - feintP * fighter.radius * 0.35;
      } else if (stage === 3) {
        // S4 Overhand Counter-Pull: Right arm braces low across ribs with kinetic counterweight
        const counterP = Math.sin(leftProgress * Math.PI);
        fistX = rightBaseX - counterP * fighter.radius * 0.15;
        fistY = rightBaseY + counterP * fighter.radius * 0.10;
      } else {
        fistX = rightBaseX;
        fistY = rightBaseY;
      }
    }
  } else if (rightProgress > 0) {
    if (!isLeft) {
      const rightFist = fighter.fists ? (fighter.fists.find(f => f.punchType === 'right') || fighter.fists[1]) : undefined;
      const isHeavy = rightFist ? rightFist.isHeavy : false;
      const isForward = rightFist ? (rightFist.isPunching || !!rightFist.isLingerActive) : false;
      const stage = fist.comboStage !== undefined 
        ? fist.comboStage 
        : (fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1));

      if (isHeavy) {
        fistX = rightBaseX;
        fistY = rightBaseY;
      } else if (stage === 0 || stage === 1) {
        // S1 to S2 Animation:
        // Visible Curl on the side flank -> Explosively Straighten and Punch to the side!
        const chargeLimit = stage === 0 ? 0.28 : 0.24;
        const straightReach = (stage === 1 ? 2.30 : 2.15) * fighter.radius;
        const sideAngle = stage === 1 ? 0.38 : 0.48; // Punches outward to the right side flank
        const straightSideX = fighter.radius * 0.15 + straightReach * Math.cos(sideAngle);
        const straightSideY = fighter.radius * 0.80 + straightReach * Math.sin(sideAngle);

        if (isForward) {
          if (rightProgress < chargeLimit) {
            // Visible Curl on the side: Pulls back tightly along the right side flank
            const wT = rightProgress / chargeLimit;
            const chamberPull = Math.sin(wT * Math.PI * 0.5);
            fistX = rightBaseX - chamberPull * fighter.radius * 0.15;
            fistY = rightBaseY + chamberPull * fighter.radius * 0.10;
          } else {
            // Straighten and punch to the side: Explosive linear snap straight out to the side flank
            const snapT = (rightProgress - chargeLimit) / (1.0 - chargeLimit);
            const snapEase = 1 - Math.pow(1 - snapT, 3.2);
            fistX = (rightBaseX - 0.15 * fighter.radius) * (1 - snapEase) + straightSideX * snapEase;
            fistY = (rightBaseY + 0.10 * fighter.radius) * (1 - snapEase) + straightSideY * snapEase;
          }
        } else {
          // Fluid Retraction back into curled Philly Shell stance on the side
          const retEase = rightProgress * rightProgress * (3 - 2 * rightProgress);
          fistX = rightBaseX * (1 - retEase) + straightSideX * retEase;
          fistY = rightBaseY * (1 - retEase) + straightSideY * retEase;
        }
      } else {
        const snapFactor = isForward 
          ? (Math.sin(rightProgress * Math.PI * 0.5) * 0.35 + (1 - Math.pow(1 - rightProgress, 2.2)) * 0.65)
          : (rightProgress * rightProgress * (3 - 2 * rightProgress));
        const extension = snapFactor * fighter.radius * 1.80;
        fistX = rightBaseX + extension;
        fistY = rightBaseY * (1 - snapFactor * 0.70) + snapFactor * fighter.radius * 0.20;
      }
    } else {
      fistX = leftBaseX;
      fistY = leftBaseY;
    }
  } else {
    if (isLeft && (fighter as any).shellS3Primed) {
      fistX = fighter.radius * 1.05;
      fistY = -fighter.radius * 0.10;
    } else if (isLeft && (fighter as any).shellS4ReturnTimer && (fighter as any).shellS4ReturnTimer > 0) {
      const returnT = (24 - (fighter as any).shellS4ReturnTimer) / 24;
      const smoothReturn = returnT * returnT * (3 - 2 * returnT);
      fistX = (fighter.radius * 1.15) * (1 - smoothReturn) + leftBaseX * smoothReturn;
      fistY = (-fighter.radius * 0.10) * (1 - smoothReturn) + leftBaseY * smoothReturn;
    } else {
      fistX = isLeft ? leftBaseX : rightBaseX;
      fistY = isLeft ? leftBaseY : rightBaseY;
    }
  }

  return { fistX, fistY };
}
