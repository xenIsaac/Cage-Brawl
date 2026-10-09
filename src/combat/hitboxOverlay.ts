import { Fighter } from '../types';
import { getClampedFistPos } from './fistIK';
import { getFighterVisualTransform } from './renderFighter';
import { getStrikeHitboxInfo } from './hitboxCalculator';

/**
 * Hitbox Wireframe Overlay for AI Sparring Lab
 * Renders mathematical collision boundaries, hurtboxes, punch hitboxes, block shields, and range telemetry.
 */
export function drawHitboxOverlay(
  ctx: CanvasRenderingContext2D,
  player: Fighter | null,
  dummy: Fighter | null,
  gameTime: number
): void {
  if (!player || player.isDead) return;

  ctx.save();

  const idleTime = Date.now() / 1000;

  // 1. DISTANCE MEASURING TAPE & SPACING CLASSIFIER
  if (dummy && !dummy.isDead) {
    const dx = dummy.x - player.x;
    const dy = dummy.y - player.y;
    const dist = Math.round(Math.hypot(dx, dy));
    const midX = (player.x + dummy.x) / 2;
    const midY = (player.y + dummy.y) / 2;

    let rangeLabel = 'OUTSIDE';
    let rangeColor = '#94a3b8';
    if (dist <= 110) {
      rangeLabel = 'CQC POCKET';
      rangeColor = '#f43f5e';
    } else if (dist <= 175) {
      rangeLabel = 'INFIGHT RANGE';
      rangeColor = '#fbbf24';
    } else if (dist <= 250) {
      rangeLabel = 'MID RANGE';
      rangeColor = '#38bdf8';
    }

    // Dashed line between centers
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(dummy.x, dummy.y);
    ctx.strokeStyle = rangeColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    // Telemetry Badge at midpoint
    ctx.save();
    ctx.translate(midX, midY);
    const badgeText = `${dist}px • ${rangeLabel}`;
    ctx.font = 'bold 9px monospace';
    const textWidth = ctx.measureText(badgeText).width;
    const padX = 7;
    const padY = 3.5;

    ctx.fillStyle = 'rgba(9, 9, 11, 0.88)';
    ctx.strokeStyle = rangeColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-textWidth / 2 - padX, -8 - padY, textWidth + padX * 2, 16 + padY, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = rangeColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, 0, -1);
    ctx.restore();
  }

  // Helper to draw a fighter's hurtbox
  const drawFighterHurtbox = (f: Fighter, isPlayer: boolean) => {
    const mainColor = isPlayer ? '#06b6d4' : '#f97316';
    const fillColor = isPlayer ? 'rgba(6, 182, 212, 0.12)' : 'rgba(249, 115, 22, 0.12)';
    const r = f.radius;

    // Retrieve full visual transforms (lunge, sway, torso twist/rotations) to perfectly align hitbox with visual model
    const { visualAngle, lungeOffset, swayLateralOffset } = getFighterVisualTransform(f as any, gameTime);
    const cosV = Math.cos(visualAngle);
    const sinV = Math.sin(visualAngle);
    const bodyCenterX = f.x + lungeOffset * cosV - swayLateralOffset * sinV;
    const bodyCenterY = f.y + lungeOffset * sinV + swayLateralOffset * cosV;

    // Outer boundary circle
    ctx.beginPath();
    ctx.arc(bodyCenterX, bodyCenterY, r, 0, Math.PI * 2);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    // Center crosshair
    ctx.beginPath();
    ctx.moveTo(bodyCenterX - 5, bodyCenterY);
    ctx.lineTo(bodyCenterX + 5, bodyCenterY);
    ctx.moveTo(bodyCenterX, bodyCenterY - 5);
    ctx.lineTo(bodyCenterX, bodyCenterY + 5);
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Facing vector line aligned with visual facing angle
    ctx.beginPath();
    ctx.moveTo(bodyCenterX, bodyCenterY);
    ctx.lineTo(bodyCenterX + cosV * (r + 14), bodyCenterY + sinV * (r + 14));
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label tag above hurtbox
    ctx.font = 'bold 8px monospace';
    const label = `${isPlayer ? 'PLAYER' : 'AI DUMMY'} HURTBOX (r=${Math.round(r)})`;
    ctx.fillStyle = mainColor;
    ctx.textAlign = 'center';
    ctx.fillText(label, bodyCenterX, bodyCenterY - r - 6);

    // Active block arc shield wireframe
    if (f.isBlocking) {
      ctx.save();
      ctx.beginPath();
      const shieldRadius = r + 16;
      const shieldAngle = 1.5; // ~86 degrees coverage
      ctx.arc(bodyCenterX, bodyCenterY, shieldRadius, visualAngle - shieldAngle / 2, visualAngle + shieldAngle / 2);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      ctx.fillStyle = '#60a5fa';
      ctx.font = 'bold 7.5px monospace';
      ctx.fillText('PARRY / BLOCK ARC', bodyCenterX + cosV * (shieldRadius + 10), bodyCenterY + sinV * (shieldRadius + 10));
      ctx.restore();
    }

    // Strike Hitboxes
    f.fists.forEach((fist) => {
      if (fist.punchProgress > 0) {
        const hitbox = getStrikeHitboxInfo(f, fist, idleTime, gameTime);
        const worldFistX = bodyCenterX + (hitbox.strikeX * cosV - hitbox.strikeY * sinV);
        const worldFistY = bodyCenterY + (hitbox.strikeX * sinV + hitbox.strikeY * cosV);

        const hitRadius = hitbox.hitRadius;
        const isActivePhase = hitbox.isActiveHitWindow;
        const strikeColor = isActivePhase ? '#ef4444' : '#eab308';

        // Glowing active strike hitbox at limb/fist tip
        ctx.beginPath();
        ctx.arc(worldFistX, worldFistY, hitRadius, 0, Math.PI * 2);
        ctx.fillStyle = isActivePhase ? 'rgba(239, 68, 68, 0.28)' : 'rgba(234, 179, 8, 0.20)';
        ctx.fill();
        ctx.strokeStyle = strikeColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw active limb segments along sample fractions (only when active)
        if (isActivePhase && hitbox.sampleFractions.length > 0) {
          hitbox.sampleFractions.forEach((frac) => {
            const segX = hitbox.strikeX * frac;
            const segY = hitbox.strikeY * frac;
            const worldSegX = bodyCenterX + (segX * cosV - segY * sinV);
            const worldSegY = bodyCenterY + (segX * sinV + segY * cosV);
            ctx.beginPath();
            ctx.arc(worldSegX, worldSegY, hitRadius * 0.85, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
            ctx.fill();
            ctx.strokeStyle = strikeColor;
            ctx.lineWidth = 1;
            ctx.stroke();
          });
        }

        // Hitbox crosshair
        ctx.beginPath();
        ctx.moveTo(worldFistX - 4, worldFistY);
        ctx.lineTo(worldFistX + 4, worldFistY);
        ctx.moveTo(worldFistX, worldFistY - 4);
        ctx.lineTo(worldFistX, worldFistY + 4);
        ctx.strokeStyle = strikeColor;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Strike Tag
        ctx.font = 'bold 7px monospace';
        ctx.fillStyle = strikeColor;
        ctx.textAlign = 'center';
        ctx.fillText(
          `${hitbox.strikeName} HITBOX [${Math.round(hitRadius)}px]`,
          worldFistX,
          worldFistY + hitRadius + 9
        );
      }
    });
  };

  // Draw Player Hurtbox & Hitboxes
  drawFighterHurtbox(player, true);

  // Draw Dummy Hurtbox & Hitboxes
  if (dummy && !dummy.isDead) {
    drawFighterHurtbox(dummy, false);
  }

  ctx.restore();
}
