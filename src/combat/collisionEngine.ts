/**
 * src/combat/collisionEngine.ts
 *
 * Section 9.1 Block #3 Extraction:
 * Extracted detectSparringCollisions and line-to-circle collision routines out of Arena.tsx.
 *
 * ZERO LOGIC MUTATION GUARANTEE:
 * - 100% identical body overlap separation calculations
 * - 100% identical multi-point reach vector sampling and line-segment circle checks
 * - 100% identical continuous angular sweep sub-step sampling for Capoeira M2
 * - 100% identical hit guarantees for Street Boxing and Street Taekwondo S3
 */

import { Fighter, MatchData } from '../types';
import { getHeightModifiers } from '../utils/heightModifiers';
import { getStrikeHitboxInfo } from './hitboxCalculator';
import { getFighterVisualTransform } from './renderFighter';

export function checkLineSegmentToCircle(
  x1: number, y1: number,
  x2: number, y2: number,
  cx: number, cy: number,
  r: number
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return Math.hypot(cx - x1, cy - y1) <= r;
  }
  const t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / lenSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(cx - projX, cy - projY) <= r;
}

export interface CollisionEngineContext {
  stateRef: { current: any };
  matchData?: MatchData;
  soundManager: any;
  spawnFloatingText: (x: number, y: number, text: string, color: string) => void;
  onFighterHit: (
    attacker: Fighter,
    defender: Fighter,
    isHeavy: boolean,
    comboStage?: number,
    strikePos?: { x: number; y: number }
  ) => void;
}

/**
 * Avoid overlap collision pushing and handle per-frame parts-based hitboxes
 */
export function detectSparringCollisions(ctx: CollisionEngineContext): void {
  const { stateRef, matchData, soundManager, spawnFloatingText, onFighterHit } = ctx;
  const state = stateRef.current;
  if ((matchData?.isCompetitive || matchData?.isAiMatch) && state.rankedState !== 'fighting') return;
  const player = state.player;
  const dummy = state.dummy;
  if (!player || player.isDead || !dummy || dummy.isDead) return;

  // 1. Physical body overlap collision pushing
  const isCqcActive = (player.cqcM2Stage !== null && player.cqcM2Stage !== undefined) ||
                      (dummy.cqcM2Stage !== null && dummy.cqcM2Stage !== undefined);
  if (!isCqcActive) {
    const dx = dummy.x - player.x;
    const dy = dummy.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = player.radius + dummy.radius;

    if (dist < minDist) {
      const overlap = minDist - dist;
      const pushX = (dx / (dist || 1)) * overlap * 0.5;
      const pushY = (dy / (dist || 1)) * overlap * 0.5;

      player.x -= pushX;
      player.y -= pushY;
      dummy.x += pushX;
      dummy.y += pushY;
    }
  }

  // 2. "Parts as Hurt Objects" - Check fist hitboxes every frame during punch
  const idleTime = Date.now() / 1000;

  // Player hitting Dummy
  player.fists.forEach((fist: any) => {
    // Left Arm / Left Glove has its hitbox completely disabled throughout the entire M2 animation in Kyokushin
    if (player.styleId === 'kyokushin' && fist.punchType === 'left' && (fist.isHeavy || (player.heavyWindup && player.heavyWindup > 0) || player.fists.some((f: any) => f.punchType === 'right' && f.isHeavy))) {
      return;
    }
    if (fist.isPunching && !fist.hasHit) {
      const hitbox = getStrikeHitboxInfo(player, fist, idleTime, state.gameTime);
      if (!hitbox.isActiveHitWindow) return;

      const stage = hitbox.stage;
      const hitRadius = hitbox.hitRadius;
      const hitBuffer = hitbox.hitBuffer;
      const strikeX = hitbox.strikeX;
      const strikeY = hitbox.strikeY;
      const sampleFractions = hitbox.sampleFractions;

      const { visualAngle: pVisualAngle, lungeOffset: pLunge, swayLateralOffset: pSway } = getFighterVisualTransform(player, state.gameTime);
      const pCos = Math.cos(pVisualAngle);
      const pSin = Math.sin(pVisualAngle);
      const playerCenterX = player.x + pLunge * pCos - pSway * pSin;
      const playerCenterY = player.y + pLunge * pSin + pSway * pCos;

      const worldFistX = playerCenterX + (strikeX * pCos - strikeY * pSin);
      const worldFistY = playerCenterY + (strikeX * pSin + strikeY * pCos);

      const { visualAngle: dVisualAngle, lungeOffset: dLunge, swayLateralOffset: dSway } = getFighterVisualTransform(dummy, state.gameTime);
      const dummyCenterX = dummy.x + dLunge * Math.cos(dVisualAngle) - dSway * Math.sin(dVisualAngle);
      const dummyCenterY = dummy.y + dLunge * Math.sin(dVisualAngle) + dSway * Math.cos(dVisualAngle);

      const hdx = dummyCenterX - worldFistX;
      const hdy = dummyCenterY - worldFistY;
      const hdist = Math.sqrt(hdx * hdx + hdy * hdy);

      let strikePos: { x: number; y: number } | undefined = undefined;
      let hasOverlap = hdist <= dummy.radius + hitRadius + hitBuffer;

      if (player.styleId === 'boxing_shell' && fist.isHeavy) {
        const centerDist = Math.hypot(dummyCenterX - playerCenterX, dummyCenterY - playerCenterY);
        hasOverlap = (centerDist <= player.radius + dummy.radius + 10) && fist.punchProgress >= 0.20 && fist.punchProgress <= 0.80;
        if (hasOverlap) {
          strikePos = {
            x: playerCenterX + (dummyCenterX - playerCenterX) * 0.5,
            y: playerCenterY + (dummyCenterY - playerCenterY) * 0.5
          };
        }
      } else if (player.styleId === 'basic' && !fist.isHeavy) {
        if (stage === 0 && fist.punchProgress < 0.25) {
          hasOverlap = false;
        } else if (stage === 2) {
          hasOverlap = false;
          const distToDummy = Math.hypot(dummy.x - player.x, dummy.y - player.y);
          if (distToDummy <= player.radius + dummy.radius + 40 && (dummy.isBlocking || (dummy.blockTimer || 0) > 0)) {
            if (!player.flowS3ParryBaited) {
              player.flowS3ParryBaited = true;
              spawnFloatingText(player.x, player.y - 30, 'FEINT BAITED! S4 PRIMED', '#ef4444');
              soundManager.playParry();
            }
          }
        }
      }

      if (hasOverlap && !strikePos) {
        strikePos = { x: worldFistX, y: worldFistY };
      }

      if (!hasOverlap && player.styleId === 'street_boxing' && fist.isHeavy && player.streetBoxingUnbreakable) {
        const distToDummy = Math.hypot(dummy.x - player.x, dummy.y - player.y);
        if (distToDummy <= player.radius + dummy.radius + 80 && fist.punchProgress >= 0.20) {
          hasOverlap = true;
          strikePos = { x: dummyCenterX, y: dummyCenterY };
        }
      }

      if (!hasOverlap && !(player.styleId === 'boxing_shell' && fist.isHeavy) && !(player.styleId === 'basic' && !fist.isHeavy && stage === 2)) {
        for (let s = 0; s < sampleFractions.length; s++) {
          const frac = sampleFractions[s];
          const segX = strikeX * frac;
          const segY = strikeY * frac;
          const worldSegX = playerCenterX + (segX * pCos - segY * pSin);
          const worldSegY = playerCenterY + (segX * pSin + segY * pCos);
          const sdx = dummyCenterX - worldSegX;
          const sdy = dummyCenterY - worldSegY;
          const sdist = Math.sqrt(sdx * sdx + sdy * sdy);
          if (sdist <= dummy.radius + hitRadius + hitBuffer) {
            hasOverlap = true;
            strikePos = { x: worldSegX, y: worldSegY };
            break;
          }
        }
        if (!hasOverlap) {
          hasOverlap = checkLineSegmentToCircle(
            playerCenterX, playerCenterY,
            worldFistX, worldFistY,
            dummyCenterX, dummyCenterY,
            dummy.radius + hitRadius + hitBuffer
          );
          if (hasOverlap && !strikePos) {
            strikePos = { x: worldFistX, y: worldFistY };
          }
        }
      }

      if (!hasOverlap && player.styleId === 'capoeira' && fist.isHeavy) {
        const pMods = getHeightModifiers(player.baseHeight);
        const pSpeed = 0.075 * pMods.speedFactor;
        const prevP = Math.max(0, fist.punchProgress - pSpeed);
        const currP = fist.punchProgress;
        const sweepRadius = player.radius * 1.90;
        const subCount = 6;
        for (let k = 0; k <= subCount; k++) {
          const subP = prevP + (currP - prevP) * (k / subCount);
          const subHelico = subP * Math.PI * 2.0;
          const subRelX = Math.cos(subHelico) * sweepRadius;
          const subRelY = Math.sin(subHelico) * sweepRadius;
          const subFractions = [0.40, 0.60, 0.80, 1.0, 1.10];
          for (let sf = 0; sf < subFractions.length; sf++) {
            const frac = subFractions[sf];
            const segX = subRelX * frac;
            const segY = subRelY * frac;
            const worldSegX = playerCenterX + (segX * pCos - segY * pSin);
            const worldSegY = playerCenterY + (segX * pSin + segY * pCos);
            const sdx = dummyCenterX - worldSegX;
            const sdy = dummyCenterY - worldSegY;
            if (Math.hypot(sdx, sdy) <= dummy.radius + hitRadius + hitBuffer) {
              hasOverlap = true;
              strikePos = { x: worldSegX, y: worldSegY };
              break;
            }
          }
          if (hasOverlap) break;
        }
      }

      if (!hasOverlap && player.styleId === 'street_taekwondo' && !fist.isHeavy && stage === 2) {
        const kickReach = player.radius * 2.35;
        const distToDummy = Math.hypot(dummyCenterX - playerCenterX, dummyCenterY - playerCenterY);
        if (distToDummy <= player.radius + dummy.radius + kickReach + hitBuffer) {
          hasOverlap = true;
          strikePos = {
            x: playerCenterX + (dummyCenterX - playerCenterX) * 0.65,
            y: playerCenterY + (dummyCenterY - playerCenterY) * 0.65
          };
        }
      }

      if (hasOverlap) {
        fist.hasHit = true;
        onFighterHit(player, dummy, fist.isHeavy, fist.comboStage ?? player.comboStage, strikePos);
      }
    }
  });

  // Dummy hitting Player
  dummy.fists.forEach((fist: any) => {
    if (dummy.styleId === 'kyokushin' && fist.punchType === 'left' && (fist.isHeavy || (dummy.heavyWindup && dummy.heavyWindup > 0) || dummy.fists.some((f: any) => f.punchType === 'right' && f.isHeavy))) {
      return;
    }
    if (fist.isPunching && !fist.hasHit) {
      const hitbox = getStrikeHitboxInfo(dummy, fist, idleTime, state.gameTime);
      if (!hitbox.isActiveHitWindow) return;

      const stage = hitbox.stage;
      const hitRadius = hitbox.hitRadius;
      const hitBuffer = hitbox.hitBuffer;
      const strikeX = hitbox.strikeX;
      const strikeY = hitbox.strikeY;
      const sampleFractions = hitbox.sampleFractions;

      const { visualAngle: dVisualAngle, lungeOffset: dLunge, swayLateralOffset: dSway } = getFighterVisualTransform(dummy, state.gameTime);
      const dCos = Math.cos(dVisualAngle);
      const dSin = Math.sin(dVisualAngle);
      const dummyCenterX = dummy.x + dLunge * dCos - dSway * dSin;
      const dummyCenterY = dummy.y + dLunge * dSin + dSway * dCos;

      const worldFistX = dummyCenterX + (strikeX * dCos - strikeY * dSin);
      const worldFistY = dummyCenterY + (strikeX * dSin + strikeY * dCos);

      const { visualAngle: pVisualAngle, lungeOffset: pLunge, swayLateralOffset: pSway } = getFighterVisualTransform(player, state.gameTime);
      const playerCenterX = player.x + pLunge * Math.cos(pVisualAngle) - pSway * Math.sin(pVisualAngle);
      const playerCenterY = player.y + pLunge * Math.sin(pVisualAngle) + pSway * Math.cos(pVisualAngle);

      const hdx = playerCenterX - worldFistX;
      const hdy = playerCenterY - worldFistY;
      const hdist = Math.sqrt(hdx * hdx + hdy * hdy);

      let strikePos: { x: number; y: number } | undefined = undefined;
      let hasOverlap = hdist <= player.radius + hitRadius + hitBuffer;

      if (dummy.styleId === 'boxing_shell' && fist.isHeavy) {
        const centerDist = Math.hypot(playerCenterX - dummyCenterX, playerCenterY - dummyCenterY);
        hasOverlap = (centerDist <= dummy.radius + player.radius + 10) && fist.punchProgress >= 0.20 && fist.punchProgress <= 0.80;
        if (hasOverlap) {
          strikePos = {
            x: dummyCenterX + (playerCenterX - dummyCenterX) * 0.5,
            y: dummyCenterY + (playerCenterY - dummyCenterY) * 0.5
          };
        }
      } else if (dummy.styleId === 'basic' && !fist.isHeavy) {
        if (stage === 0 && fist.punchProgress < 0.25) {
          hasOverlap = false;
        } else if (stage === 2) {
          hasOverlap = false;
          const distToPlayer = Math.hypot(player.x - dummy.x, player.y - dummy.y);
          if (distToPlayer <= dummy.radius + player.radius + 40 && (player.isBlocking || (player.blockTimer || 0) > 0)) {
            if (!dummy.flowS3ParryBaited) {
              dummy.flowS3ParryBaited = true;
              spawnFloatingText(dummy.x, dummy.y - 30, 'FEINT BAITED! S4 PRIMED', '#ef4444');
              soundManager.playParry();
            }
          }
        }
      }

      if (hasOverlap && !strikePos) {
        strikePos = { x: worldFistX, y: worldFistY };
      }

      if (!hasOverlap && dummy.styleId === 'street_boxing' && fist.isHeavy && dummy.streetBoxingUnbreakable) {
        const distToPlayer = Math.hypot(player.x - dummy.x, player.y - dummy.y);
        if (distToPlayer <= dummy.radius + player.radius + 80 && fist.punchProgress >= 0.20) {
          hasOverlap = true;
          strikePos = { x: playerCenterX, y: playerCenterY };
        }
      }

      if (!hasOverlap && !(dummy.styleId === 'boxing_shell' && fist.isHeavy) && !(dummy.styleId === 'basic' && !fist.isHeavy && stage === 2)) {
        for (let s = 0; s < sampleFractions.length; s++) {
          const frac = sampleFractions[s];
          const segX = strikeX * frac;
          const segY = strikeY * frac;
          const worldSegX = dummyCenterX + (segX * dCos - segY * dSin);
          const worldSegY = dummyCenterY + (segX * dSin + segY * dCos);
          const sdx = playerCenterX - worldSegX;
          const sdy = playerCenterY - worldSegY;
          const sdist = Math.sqrt(sdx * sdx + sdy * sdy);
          if (sdist <= player.radius + hitRadius + hitBuffer) {
            hasOverlap = true;
            strikePos = { x: worldSegX, y: worldSegY };
            break;
          }
        }
        if (!hasOverlap) {
          hasOverlap = checkLineSegmentToCircle(
            dummyCenterX, dummyCenterY,
            worldFistX, worldFistY,
            playerCenterX, playerCenterY,
            player.radius + hitRadius + hitBuffer
          );
          if (hasOverlap && !strikePos) {
            strikePos = { x: worldFistX, y: worldFistY };
          }
        }
      }

      if (!hasOverlap && dummy.styleId === 'capoeira' && fist.isHeavy) {
        const dMods = getHeightModifiers(dummy.baseHeight);
        const dSpeed = 0.075 * dMods.speedFactor;
        const prevP = Math.max(0, fist.punchProgress - dSpeed);
        const currP = fist.punchProgress;
        const sweepRadius = dummy.radius * 1.90;
        const subCount = 6;
        for (let k = 0; k <= subCount; k++) {
          const subP = prevP + (currP - prevP) * (k / subCount);
          const subHelico = subP * Math.PI * 2.0;
          const subRelX = Math.cos(subHelico) * sweepRadius;
          const subRelY = Math.sin(subHelico) * sweepRadius;
          const subFractions = [0.40, 0.60, 0.80, 1.0, 1.10];
          for (let sf = 0; sf < subFractions.length; sf++) {
            const frac = subFractions[sf];
            const segX = subRelX * frac;
            const segY = subRelY * frac;
            const worldSegX = dummyCenterX + (segX * dCos - segY * dSin);
            const worldSegY = dummyCenterY + (segX * dSin + segY * dCos);
            const sdx = playerCenterX - worldSegX;
            const sdy = playerCenterY - worldSegY;
            if (Math.hypot(sdx, sdy) <= player.radius + hitRadius + hitBuffer) {
              hasOverlap = true;
              strikePos = { x: worldSegX, y: worldSegY };
              break;
            }
          }
          if (hasOverlap) break;
        }
      }

      if (!hasOverlap && dummy.styleId === 'street_taekwondo' && !fist.isHeavy && stage === 2) {
        const kickReach = dummy.radius * 2.35;
        const distToPlayer = Math.hypot(playerCenterX - dummyCenterX, playerCenterY - dummyCenterY);
        if (distToPlayer <= dummy.radius + player.radius + kickReach + hitBuffer) {
          hasOverlap = true;
          strikePos = {
            x: dummyCenterX + (playerCenterX - dummyCenterX) * 0.65,
            y: dummyCenterY + (playerCenterY - dummyCenterY) * 0.65
          };
        }
      }

      if (hasOverlap) {
        fist.hasHit = true;
        onFighterHit(dummy, player, fist.isHeavy, fist.comboStage ?? dummy.comboStage, strikePos);
      }
    }
  });
}
