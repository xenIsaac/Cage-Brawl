import { Fighter } from '../../types';
import { renderCqcHandTrail } from './cqc';
import { renderIronBoxingHandTrail } from './boxingShell';
import { renderFlowBoxingHandTrail } from './flowBoxing';
import { renderAikidoHandTrail } from './aikido';
import { renderKyokushinEffects } from './kyokushin';
import { TrailRenderParams } from './types';

export * from './types';

/**
 * Updates and renders style-specific hand/limb motion trails and visual effects.
 * Strictly checks styleId and required active timers/stages so trails NEVER leak to unauthorized styles.
 */
export function renderStyleHandTrails(
  ctx: CanvasRenderingContext2D,
  fighter: Fighter,
  isLeft: boolean,
  actualFistX: number,
  actualFistY: number,
  elbowX: number,
  elbowY: number,
  shoulderX: number,
  shoulderY: number,
  fistW: number,
  fistH: number,
  gloveRot: number,
  gameTime: number
): void {
  const cos = Math.cos(fighter.facingAngle);
  const sin = Math.sin(fighter.facingAngle);

  const worldFx = fighter.x + (cos * actualFistX - sin * actualFistY);
  const worldFy = fighter.y + (sin * actualFistX + cos * actualFistY);
  const worldEx = fighter.x + (cos * elbowX - sin * elbowY);
  const worldEy = fighter.y + (sin * elbowX + cos * elbowY);
  const worldSx = fighter.x + (cos * shoulderX - sin * shoulderY);
  const worldSy = fighter.y + (sin * shoulderX + cos * shoulderY);
  const worldHandAngle = fighter.facingAngle + gloveRot;

  const params: TrailRenderParams = {
    ctx,
    fighter,
    isLeft,
    worldFx,
    worldFy,
    worldEx,
    worldEy,
    worldSx,
    worldSy,
    worldHandAngle,
    actualFistX,
    actualFistY,
    gloveRot,
    fistW,
    fistH,
    gameTime,
  };

  // 1. CQC
  if (fighter.styleId === 'cqc') {
    renderCqcHandTrail(params);
    return;
  }

  // 2. Iron Boxing
  if (fighter.styleId === 'boxing_shell') {
    renderIronBoxingHandTrail(params);
    return;
  }

  // 3. Flow Boxing
  if (fighter.styleId === 'basic') {
    renderFlowBoxingHandTrail(params);
    return;
  }

  // 4. Aikido
  if (fighter.styleId === 'aikido') {
    renderAikidoHandTrail(params);
    return;
  }

  // 5. Kyokushin
  if (fighter.styleId === 'kyokushin') {
    renderKyokushinEffects(params);
    return;
  }
}
