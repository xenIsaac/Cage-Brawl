/**
 * src/combat/ArenaRenderer.ts
 *
 * Section 9.2: Dedicated Arena Renderer Service
 * Encapsulates the master 60 FPS Canvas 2D rendering pipeline out of Arena.tsx.
 *
 * ZERO LOGIC MUTATION GUARANTEE:
 * - 100% pixel-identical visual presentation
 * - Exact DPR and camera world-space transforms (shake, cinematic zooms, countdown lerp)
 * - Dynamic drop shadows, z-index elevation, and after-image phantom clones
 * - Screen-space cinematic vignettes, low-HP heartbeat, and countdown buffers
 */

import { Fighter, GameSettings, MatchData } from '../types';
import { drawArenaFloor as drawArenaFloorModule, renderParticlesAndTexts as renderParticlesAndTextsModule } from './renderArena';
import { drawFighter as drawFighterModule } from './renderFighter';
import { drawHitboxOverlay } from './hitboxOverlay';
import { renderImpactFrameBackground, renderImpactFrameForeground } from './impactFrame';
import { drawCachedCountdownNumeral, drawCachedFightBanner } from '../utils/countdownBuffer';

export interface RenderFrameOptions {
  ctx: CanvasRenderingContext2D;
  state: any;
  settings: GameSettings;
  matchData?: MatchData;
  showHitboxes?: boolean;
}

export class ArenaRenderer {
  /**
   * Master render pass called by the Arena's requestAnimationFrame loop.
   */
  public static drawFrame(
    ctxOrOptions: CanvasRenderingContext2D | RenderFrameOptions,
    stateArg?: any,
    settingsArg?: GameSettings,
    matchDataArg?: MatchData,
    showHitboxesArg?: boolean
  ): void {
    let ctx: CanvasRenderingContext2D;
    let state: any;
    let settings: GameSettings;
    let matchData: MatchData | undefined;
    let showHitboxes: boolean | undefined;

    if ('ctx' in (ctxOrOptions as any)) {
      const opts = ctxOrOptions as RenderFrameOptions;
      ctx = opts.ctx;
      state = opts.state;
      settings = opts.settings;
      matchData = opts.matchData;
      showHitboxes = opts.showHitboxes;
    } else {
      ctx = ctxOrOptions as CanvasRenderingContext2D;
      state = stateArg;
      settings = settingsArg!;
      matchData = matchDataArg;
      showHitboxes = showHitboxesArg;
    }

    const canvas = ctx?.canvas;
    if (!canvas || !ctx || !state) return;

    const player: Fighter | undefined = state.player;
    const dummy: Fighter | undefined = state.dummy;
    const baseDpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const dpr = baseDpr * (settings.renderResolutionScale || 1.0);

    // Clear physical backing store completely
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save 1: DPR scale layer for 100% full-screen coordinate space
    ctx.save();
    ctx.scale(dpr, dpr);

    // Save 2: Camera world space transform layer
    ctx.save();

    // Screenshake translate transformation offset
    const isPlayerVisionShaky = Boolean((state.shakyVisionTimer && state.shakyVisionTimer > 0) || (player && (player.aikiShakyVisionTimer || 0) > 0));
    if (state.shakeAmount > 0 || isPlayerVisionShaky) {
      const shakeMag = Math.max(state.shakeAmount, isPlayerVisionShaky ? (8.0 * settings.screenShake) : 0);
      const sx = (Math.random() * 2 - 1) * shakeMag;
      const sy = (Math.random() * 2 - 1) * shakeMag;
      ctx.translate(sx, sy);
    }

    // Camera positioning with dynamic cinematic support
    let zoomToUse = state.cameraZoom;
    if (state.cinematicZoomActive) {
      const targetX = state.cinematicTargetX ?? (player?.x || 500);
      const targetY = state.cinematicTargetY ?? (player?.y || 500);
      state.cameraX += (targetX - state.cameraX) * 0.15;
      state.cameraY += (targetY - state.cameraY) * 0.15;
      
      // Interpolate zoom smoothly to 3.5x
      state.cinematicCurrentZoom = state.cinematicCurrentZoom || state.cameraZoom;
      state.cinematicCurrentZoom += (3.5 - state.cinematicCurrentZoom) * 0.12;
      zoomToUse = state.cinematicCurrentZoom;
    } else if (state.rankedState === 'countdown') {
      const frame = state.countdownFrame || 0;

      if (frame < 90) {
        // Step 1 (Count 3 / t = 0.0s to 1.5s): 1.6x zoom-in centered on Player 1
        const targetX = player ? player.x : state.arenaSize / 2;
        const targetY = player ? player.y : state.arenaSize / 2;
        const targetZoom = 1.6;
        state.cameraX += (targetX - state.cameraX) * 0.12;
        state.cameraY += (targetY - state.cameraY) * 0.12;
        state.cinematicCurrentZoom = state.cinematicCurrentZoom || state.cameraZoom;
        state.cinematicCurrentZoom += (targetZoom - state.cinematicCurrentZoom) * 0.10;
        zoomToUse = state.cinematicCurrentZoom;
      } else if (frame < 180) {
        // Step 2 (Count 2 / t = 1.5s to 3.0s): 1.6x zoom centered on Opponent / Dummy
        const targetX = dummy ? dummy.x : state.arenaSize / 2;
        const targetY = dummy ? dummy.y : state.arenaSize / 2;
        const targetZoom = 1.6;
        state.cameraX += (targetX - state.cameraX) * 0.12;
        state.cameraY += (targetY - state.cameraY) * 0.12;
        state.cinematicCurrentZoom = state.cinematicCurrentZoom || state.cameraZoom;
        state.cinematicCurrentZoom += (targetZoom - state.cinematicCurrentZoom) * 0.10;
        zoomToUse = state.cinematicCurrentZoom;
      } else {
        // Step 3 (Count 1 / t = 3.0s to 4.5s / frames 180 to 270):
        const t = Math.min(1.0, Math.max(0.0, (frame - 180) / 90.0));
        const oneMinusT = 1.0 - t;
        const cubicFactor = oneMinusT * oneMinusT * oneMinusT;
        const targetZoom = 1.0 + 0.6 * cubicFactor;

        // Position Lerp Factor using cubic ease-out: E(t) = 1 - (1 - t)^3
        const posEaseOut = 1.0 - cubicFactor;

        const startX = dummy ? dummy.x : state.arenaSize / 2;
        const startY = dummy ? dummy.y : state.arenaSize / 2;
        const neutralX = (player && dummy) ? (player.x + dummy.x) / 2 : (player ? player.x : state.arenaSize / 2);
        const neutralY = (player && dummy) ? (player.y + dummy.y) / 2 : (player ? player.y : state.arenaSize / 2);

        state.cameraX = startX + (neutralX - startX) * posEaseOut;
        state.cameraY = startY + (neutralY - startY) * posEaseOut;
        state.cinematicCurrentZoom = targetZoom;
        zoomToUse = targetZoom;
      }
    } else {
      if (player && dummy) {
        const targetX = (player.x + dummy.x) / 2;
        const targetY = (player.y + dummy.y) / 2;
        const dx = targetX - state.cameraX;
        const dy = targetY - state.cameraY;
        state.cameraX += Math.abs(dx) < 0.02 ? dx : dx * 0.10;
        state.cameraY += Math.abs(dy) < 0.02 ? dy : dy * 0.10;
      } else if (player) {
        const dx = player.x - state.cameraX;
        const dy = player.y - state.cameraY;
        state.cameraX += Math.abs(dx) < 0.02 ? dx : dx * 0.10;
        state.cameraY += Math.abs(dy) < 0.02 ? dy : dy * 0.10;
      }
      state.cinematicCurrentZoom = state.cameraZoom;
      zoomToUse = state.cameraZoom;
    }

    // Neuro-Trauma & Neuro-Disruption Hallucination: Camera Sway on victim's screen
    let tkdCameraSwayX = 0;
    let tkdCameraSwayY = 0;
    if (player && ((player.tkdConfusionTimer || 0) > 0 || (player.aikiConfusionTimer || 0) > 0)) {
      const confusionProgress = Math.max((player.tkdConfusionTimer || 0) / 180, (player.aikiConfusionTimer || 0) / 120);
      const swayIntensity = 12 * confusionProgress;
      tkdCameraSwayX = Math.sin(state.gameTime * 0.08) * swayIntensity;
      tkdCameraSwayY = Math.cos(state.gameTime * 0.06) * (swayIntensity * 0.7);
    }

    const cx = state.width / 2 - (state.cameraX + tkdCameraSwayX) * zoomToUse;
    const cy = state.height / 2 - (state.cameraY + tkdCameraSwayY) * zoomToUse;

    ctx.translate(cx, cy);
    ctx.scale(zoomToUse, zoomToUse);

    // A. Draw octagonal grid mat arena
    drawArenaFloorModule(ctx, state.arenaSize, settings);

    // Slugger M2 Impact Frame pure-white background & black shockwaves
    renderImpactFrameBackground(ctx, state.arenaSize);

    // Helper to render fighter with targeting indicators
    const renderFighterItem = (f: Fighter, isDummy: boolean) => {
      const isVictimLocalPlayer = player && ((player.tkdConfusionTimer || 0) > 0 || (player.aikiConfusionTimer || 0) > 0);
      if (isDummy && isVictimLocalPlayer && !f.isDead) {
        ctx.save();
        // Phantom Fighter Clone Left
        const perpX = -Math.sin(f.facingAngle);
        const perpY = Math.cos(f.facingAngle);
        const cloneDist = (f.radius || 26) * 2.2;
        ctx.save();
        ctx.globalAlpha = 0.40;
        ctx.translate(perpX * cloneDist, perpY * cloneDist);
        drawFighterModule(ctx, f as any, state.gameTime, settings);
        ctx.restore();

        // Phantom Fighter Clone Right
        ctx.save();
        ctx.globalAlpha = 0.40;
        ctx.translate(-perpX * cloneDist, -perpY * cloneDist);
        drawFighterModule(ctx, f as any, state.gameTime, settings);
        ctx.restore();

        // Motion trail afterimages
        ctx.save();
        ctx.globalAlpha = 0.25;
        const trailOffset = (Math.sin(state.gameTime * 0.2) * 12);
        ctx.translate(-Math.cos(f.facingAngle) * (18 + trailOffset), -Math.sin(f.facingAngle) * (18 + trailOffset));
        drawFighterModule(ctx, f as any, state.gameTime, settings);
        ctx.restore();
        ctx.restore();
      }

      drawFighterModule(ctx, f as any, state.gameTime, settings);
      if (settings.cameraMode === 'lockon_swipe' && !f.isDead) {
        ctx.save();
        if (isDummy) {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
          ctx.lineWidth = 2;
          const r = (f.radius || 26) + 10;
          const bLen = 8;
          ctx.beginPath();
          ctx.moveTo(f.x - r, f.y - r + bLen);
          ctx.lineTo(f.x - r, f.y - r);
          ctx.lineTo(f.x - r + bLen, f.y - r);
          ctx.moveTo(f.x + r - bLen, f.y - r);
          ctx.lineTo(f.x + r, f.y - r);
          ctx.lineTo(f.x + r, f.y - r + bLen);
          ctx.moveTo(f.x - r, f.y + r - bLen);
          ctx.lineTo(f.x - r, f.y + r);
          ctx.lineTo(f.x - r + bLen, f.y + r);
          ctx.moveTo(f.x + r - bLen, f.y + r);
          ctx.lineTo(f.x + r, f.y + r);
          ctx.lineTo(f.x + r, f.y + r - bLen);
          ctx.stroke();
        } else {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.lineWidth = 1.5;
          const pR = (f.radius || 26) + 6;
          const fX = f.x + Math.cos(f.facingAngle) * (pR + 12);
          const fY = f.y + Math.sin(f.facingAngle) * (pR + 12);
          const lX = f.x + Math.cos(f.facingAngle + 2.5) * pR;
          const lY = f.y + Math.sin(f.facingAngle + 2.5) * pR;
          const rX = f.x + Math.cos(f.facingAngle - 2.5) * pR;
          const rY = f.y + Math.sin(f.facingAngle - 2.5) * pR;
          ctx.beginPath();
          ctx.moveTo(lX, lY);
          ctx.lineTo(fX, fY);
          ctx.lineTo(rX, rY);
          ctx.stroke();
        }
        ctx.restore();
      }
    };

    // Dynamic Z-Index Elevation
    const isDummyOverPlayer = dummy && player && (
      dummy.aikiSlamVictimStage === 'airborne' ||
      (player.aikiSlamStage && player.aikiSlamFrame !== undefined && player.aikiSlamFrame >= 15 && player.aikiSlamFrame <= 18 && (player.aikiSlamTarget === dummy || !player.aikiSlamTarget))
    );

    const isPlayerOverDummy = player && dummy && (
      player.aikiSlamVictimStage === 'airborne' ||
      (dummy.aikiSlamStage && dummy.aikiSlamFrame !== undefined && dummy.aikiSlamFrame >= 15 && dummy.aikiSlamFrame <= 18 && (dummy.aikiSlamTarget === player || !dummy.aikiSlamTarget))
    );

    if (isDummyOverPlayer && player && dummy) {
      renderFighterItem(player, false);

      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 12;
      const shadowScale = (dummy.aikiOverheadScale || 1.35) * 0.95;
      ctx.beginPath();
      ctx.ellipse(0, 0, dummy.radius * shadowScale, dummy.radius * shadowScale * 0.85, player.facingAngle, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      renderFighterItem(dummy, true);
    } else if (isPlayerOverDummy && dummy && player) {
      renderFighterItem(dummy, true);

      ctx.save();
      ctx.translate(dummy.x, dummy.y);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 12;
      const shadowScale = (player.aikiOverheadScale || 1.35) * 0.95;
      ctx.beginPath();
      ctx.ellipse(0, 0, player.radius * shadowScale, player.radius * shadowScale * 0.85, dummy.facingAngle, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      renderFighterItem(player, false);
    } else {
      if (dummy) renderFighterItem(dummy, true);
      if (player) renderFighterItem(player, false);
    }

    // Aikido Over-Head Grapple Slam
    const activeAttacker = (player && player.aikiSlamStage) ? player : ((dummy && dummy.aikiSlamStage) ? dummy : null);
    if (activeAttacker && activeAttacker.aikiSlamStage) {
      const activeVictim = activeAttacker === player ? (player.aikiSlamTarget || dummy) : (dummy.aikiSlamTarget || player);
      const progress = Math.min(1.0, Math.max(0, (90 - (activeAttacker.aikiSlamTimer || 0)) / 90));
      if (activeVictim && !activeVictim.isDead) {
        const uAngle = activeAttacker.facingAngle;
        const uCos = Math.cos(uAngle);
        const uSin = Math.sin(uAngle);
        const uRad = activeAttacker.radius;
        const tAngle = activeVictim.facingAngle;
        const tCos = Math.cos(tAngle);
        const tSin = Math.sin(tAngle);
        const tRad = activeVictim.radius;

        let uHandX = activeAttacker.x + uCos * (uRad * 1.85) - uSin * (uRad * 0.10);
        let uHandY = activeAttacker.y + uSin * (uRad * 1.85) + uCos * (uRad * 0.10);
        if (progress >= 0.25 && progress <= 0.70) {
          const t = (progress - 0.25) / 0.45;
          const forwardOff = (uRad * 1.85) * (1 - t * 0.85);
          const latOff = (uRad * 0.10) + (uRad * 0.35) * t;
          uHandX = activeAttacker.x + uCos * forwardOff - uSin * latOff;
          uHandY = activeAttacker.y + uSin * forwardOff + uCos * latOff;
        } else if (progress > 0.70) {
          const t = (progress - 0.70) / 0.30;
          const rearDist = -uRad * (0.2 + 0.9 * t);
          uHandX = activeAttacker.x + uCos * rearDist - uSin * (uRad * 0.20);
          uHandY = activeAttacker.y + uSin * rearDist + uCos * (uRad * 0.20);
        }

        const tHandX = activeVictim.x + tCos * (tRad * 1.65) - tSin * (-tRad * 0.10);
        const tHandY = activeVictim.y + tSin * (tRad * 1.65) + tCos * (-tRad * 0.10);

        if (progress < 0.25) {
          const clampProgress = Math.min(1.0, progress / 0.10);
          const bracketDist = 16 - 8 * clampProgress;
          const cxGrip = (uHandX + tHandX) * 0.5;
          const cyGrip = (uHandY + tHandY) * 0.5;
          const clampAngle = Math.atan2(tHandY - uHandY, tHandX - uHandX);

          ctx.save();
          ctx.translate(cxGrip, cyGrip);
          ctx.rotate(clampAngle);
          ctx.strokeStyle = '#00E5FF';
          ctx.shadowColor = '#00E5FF';
          ctx.shadowBlur = 10;
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'square';

          ctx.beginPath();
          ctx.moveTo(-bracketDist + 5, -8);
          ctx.lineTo(-bracketDist, -8);
          ctx.lineTo(-bracketDist, 8);
          ctx.lineTo(-bracketDist + 5, 8);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(bracketDist - 5, -8);
          ctx.lineTo(bracketDist, -8);
          ctx.lineTo(bracketDist, 8);
          ctx.lineTo(bracketDist - 5, 8);
          ctx.stroke();

          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(-bracketDist + 3, -6);
          ctx.lineTo(-bracketDist + 1, -6);
          ctx.lineTo(-bracketDist + 1, 6);
          ctx.lineTo(-bracketDist + 3, 6);
          ctx.moveTo(bracketDist - 3, -6);
          ctx.lineTo(bracketDist - 1, -6);
          ctx.lineTo(bracketDist - 1, 6);
          ctx.lineTo(bracketDist - 3, 6);
          ctx.stroke();

          ctx.restore();
        } else if (progress < 0.85) {
          ctx.save();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 3.0;
          ctx.shadowColor = '#00E5FF';
          ctx.shadowBlur = 12;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(uHandX, uHandY);
          ctx.lineTo(tHandX, tHandY);
          ctx.stroke();

          ctx.strokeStyle = '#00E5FF';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(uHandX, uHandY);
          ctx.lineTo(tHandX, tHandY);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // Hitbox & Wireframe Collision Overlay for Sparring Lab
    if (showHitboxes && !matchData?.isCompetitive && !matchData?.isAiMatch && !matchData?.isAiVsAiSpectator) {
      drawHitboxOverlay(ctx, player, dummy, state.gameTime);
    }

    // Gamemode: Draw Hot Potato floating above holder
    if (matchData?.gamemode === 'hot_potato' && state.rankedState === 'fighting') {
      const holder = state.potatoHolder === 'player' ? player : dummy;
      if (holder && !holder.isDead) {
        const fuseSec = Math.max(0, Math.ceil((state.potatoFuseTimer !== undefined ? state.potatoFuseTimer : 1200) / 60));
        const isCritical = fuseSec <= 5;
        const pulse = Math.sin(state.gameTime * 0.2) * 3;
        const floatY = holder.y - holder.radius - 24 + pulse;

        ctx.save();
        ctx.beginPath();
        ctx.arc(holder.x, floatY + 2, isCritical ? 18 + pulse : 13, 0, Math.PI * 2);
        ctx.fillStyle = isCritical ? 'rgba(239, 68, 68, 0.45)' : 'rgba(245, 158, 11, 0.35)';
        ctx.fill();

        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🥔', holder.x, floatY);

        ctx.font = '900 10px monospace';
        ctx.fillStyle = isCritical ? '#ef4444' : '#fbbf24';
        ctx.fillText(`${fuseSec}s`, holder.x, floatY - 14);
        ctx.restore();
      }
    }

    // D. Draw Particles and floating text indicators
    renderParticlesAndTextsModule(ctx, state.particles, settings);

    // Slugger M2 Impact Frame slow-motion particles exiting behind enemy
    renderImpactFrameForeground(ctx);

    // Restore 2: Exit world space, returning to DPR scaled screen space
    ctx.restore();

    // Screen-space overlays covering 100% of logical screen
    if (state.cinematicZoomActive) {
      const maxDim = Math.max(state.width, state.height);
      const grad = ctx.createRadialGradient(
        state.width / 2, state.height / 2, maxDim * 0.1,
        state.width / 2, state.height / 2, maxDim * 0.75
      );
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.5, 'rgba(153, 27, 27, 0.25)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.88)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, state.width, state.height);

      ctx.save();
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 italic 36px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FINISHING BLOW!', state.width / 2, state.height / 2 - 120);
      ctx.restore();
    } else if (state.matchEnded || (player && player.isDead) || (dummy && dummy.isDead)) {
      const maxDim = Math.max(state.width, state.height);
      const grad = ctx.createRadialGradient(
        state.width / 2, state.height / 2, maxDim * 0.15,
        state.width / 2, state.height / 2, maxDim * 0.8
      );
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.05)');
      grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.45)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, state.width, state.height);
    }

    // Dynamic HP-Linked Block Vignette Canvas Overlay
    if (state.blockVignetteTimer && state.blockVignetteTimer > 0) {
      state.blockVignetteTimer--;
      const maxFrames = state.blockVignetteMaxFrames || 4;
      const fadeFrames = maxFrames === 6 ? 3 : 2;
      let alpha = 1.0;
      if (state.blockVignetteTimer < fadeFrames) {
        alpha = state.blockVignetteTimer / fadeFrames;
      }
      
      const baseAlpha = state.blockVignetteType === 'red' ? 0.65 : 0.40;
      const currentAlpha = baseAlpha * alpha;
      const rgbStr = state.blockVignetteType === 'red' ? '220, 0, 0' : '255, 120, 0';

      const maxDim = Math.max(state.width, state.height);
      const grad = ctx.createRadialGradient(
        state.width / 2, state.height / 2, maxDim * 0.35,
        state.width / 2, state.height / 2, maxDim * 0.75
      );
      grad.addColorStop(0, `rgba(${rgbStr}, 0)`);
      grad.addColorStop(0.5, `rgba(${rgbStr}, ${currentAlpha * 0.4})`);
      grad.addColorStop(1, `rgba(${rgbStr}, ${currentAlpha})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, state.width, state.height);
    }

    // CQC Tactical Shadow Aura Vignette during M2 initiation and assault
    const isCqcM2Active = (player && player.styleId === 'cqc' && ((player.heavyWindup || 0) > 0 || player.cqcM2Stage)) ||
                          (dummy && dummy.styleId === 'cqc' && ((dummy.heavyWindup || 0) > 0 || dummy.cqcM2Stage));
    if (isCqcM2Active) {
      const maxDim = Math.max(state.width, state.height);
      const grad = ctx.createRadialGradient(
        state.width / 2, state.height / 2, maxDim * 0.25,
        state.width / 2, state.height / 2, maxDim * 0.8
      );
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.5, 'rgba(15, 23, 42, 0.35)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.75)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, state.width, state.height);
    }

    // Persona Cinematic Countdown Overlay & Banner (Section 8.4)
    if (state.rankedState === 'countdown') {
      const frame = state.countdownFrame || 0;
      const screenCenterX = state.width / 2;
      const screenCenterY = state.height / 2;

      if (frame < 90) {
        const stepProgress = frame / 90;
        const scale = 1.25 - stepProgress * 0.25;
        const alpha = Math.min(1.0, (90 - frame) / 12);
        drawCachedCountdownNumeral(ctx, 3, alpha, screenCenterX, screenCenterY, scale);
      } else if (frame < 180) {
        const stepFrame = frame - 90;
        const stepProgress = stepFrame / 90;
        const scale = 1.25 - stepProgress * 0.25;
        const alpha = Math.min(1.0, (90 - stepFrame) / 12);
        drawCachedCountdownNumeral(ctx, 2, alpha, screenCenterX, screenCenterY, scale);
      } else if (frame < 270) {
        const stepFrame = frame - 180;
        const stepProgress = stepFrame / 90;
        const scale = 1.25 - stepProgress * 0.25;
        const alpha = Math.min(1.0, (90 - stepFrame) / 12);
        drawCachedCountdownNumeral(ctx, 1, alpha, screenCenterX, screenCenterY, scale);
      }
    } else if (state.fightBannerTimer && state.fightBannerTimer > 0) {
      const maxBannerFrames = 48;
      const elapsed = maxBannerFrames - state.fightBannerTimer;
      const slideProgress = Math.min(1.0, elapsed / 10);
      const alpha = state.fightBannerTimer < 10 ? (state.fightBannerTimer / 10) : 1.0;
      
      drawCachedFightBanner(ctx, slideProgress, alpha, state.width / 2, state.height / 2);
    }

    // E. Draw Custom Cursor
    if (state.mouseX > -100 && state.mouseY > -100) {
      let canAttack = true;
      if (player && !player.isDead) {
        const isHeavyPunching = player.fists.some(f => f.isPunching && f.isHeavy);
        const isHeavyExecuting = (player.heavyWindup || 0) > 0 || isHeavyPunching || (player.ashiharaM2Stage && player.ashiharaM2Stage > 0) || (player.cqcM2Stage && player.cqcM2Stage !== null) || !!player.keysiClinchStage;
        const cannotLight = player.stunTime > 0 || (player.armorBreakTime || 0) > 0 || (player.postBlockAttackLockout || 0) > 0 || player.capoeiraExhausted || isHeavyExecuting || (player.strikeCooldown || 0) > 0 || (player.lightCooldown || 0) > 0 || player.isBlocking;
        const cannotHeavy = player.stunTime > 0 || (player.armorBreakTime || 0) > 0 || ((player.postBlockAttackLockout || 0) > 0 && player.styleId !== 'boxing_shell') || (player.postS4HeavyLockout || 0) > 0 || player.capoeiraExhausted || (player.strikeCooldown || 0) > 0 || (player.heavyCooldown || 0) > 0 || (player.isBlocking && player.styleId !== 'boxing_shell');
        
        if (cannotLight && cannotHeavy) {
          canAttack = false;
        }
      }

      const cursorType = settings.cursorType || 'crosshair';
      const cursorColorName = settings.cursorColor || 'red';
      const cxPos = state.mouseX;
      const cyPos = state.mouseY;

      const colorMap: Record<string, string> = {
        white: '#ffffff',
        red: '#ef4444',
        cyan: '#06b6d4',
        amber: '#f59e0b',
        emerald: '#10b981',
        purple: '#a855f7',
      };
      const activeColor = canAttack ? (colorMap[cursorColorName] || '#ffffff') : '#ef4444';

      ctx.strokeStyle = activeColor;
      ctx.fillStyle = activeColor;
      ctx.lineWidth = 1.75;

      if (cursorType === 'crosshair') {
        ctx.beginPath();
        ctx.moveTo(cxPos - 9, cyPos);
        ctx.lineTo(cxPos - 3, cyPos);
        ctx.moveTo(cxPos + 3, cyPos);
        ctx.lineTo(cxPos + 9, cyPos);
        ctx.moveTo(cxPos, cyPos - 9);
        ctx.lineTo(cxPos, cyPos - 3);
        ctx.moveTo(cxPos, cyPos + 3);
        ctx.lineTo(cxPos, cyPos + 9);
        ctx.stroke();
      } else if (cursorType === 'circle') {
        ctx.beginPath();
        ctx.arc(cxPos, cyPos, 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cxPos, cyPos, 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (cursorType === 'dot') {
        ctx.beginPath();
        ctx.arc(cxPos, cyPos, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (cursorType === 'diamond') {
        ctx.beginPath();
        ctx.moveTo(cxPos, cyPos - 7);
        ctx.lineTo(cxPos + 7, cyPos);
        ctx.lineTo(cxPos, cyPos + 7);
        ctx.lineTo(cxPos - 7, cyPos);
        ctx.closePath();
        ctx.stroke();
      } else if (cursorType === 'minimal') {
        ctx.beginPath();
        ctx.arc(cxPos, cyPos, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Restore 1: Exit DPR scale layer
    ctx.restore();
  }
}
