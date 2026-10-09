import React, { useEffect, useRef } from 'react';
import { CrateType, KeyTier, KEY_TIERS } from '../../data/crateData';

export type CrateAnimPhase =
  | 'idle'
  | 'popping_chest'
  | 'inserting_key'
  | 'spinning_key'
  | 'rattling'
  | 'opening'
  | 'revealed'
  | 'closing'
  | 'replacing';

interface CrateContainerCanvasProps {
  crateType: CrateType;
  animationPhase: CrateAnimPhase;
  selectedKeyTier: KeyTier;
  shakeStage: number; // 0, 1, 2, 3
  isWin?: boolean;
  styleColor?: string;
  width?: number;
  height?: number;
}

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export const CrateContainerCanvas: React.FC<CrateContainerCanvasProps> = ({
  crateType,
  animationPhase,
  selectedKeyTier,
  shakeStage,
  isWin = false,
  styleColor = '#eab308',
  width = 340,
  height = 240,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Persistent animation state across renders
  const stateRef = useRef({
    prevPhase: animationPhase,
    phaseStartTime: performance.now(),
    particles: [] as SparkParticle[],
    chestPopScale: 1.0,
    openProgress: 0.0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Support Retina/High-DPI sharp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;

      const state = stateRef.current;

      // Handle phase transitions cleanly within RAF
      if (state.prevPhase !== animationPhase) {
        state.phaseStartTime = time;
        state.prevPhase = animationPhase;

        // Spawn burst sparks on opening trigger
        if (animationPhase === 'opening') {
          for (let i = 0; i < 22; i++) {
            const angle = (Math.PI * 2 * i) / 22;
            const spd = 60 + Math.random() * 80;
            state.particles.push({
              x: 0,
              y: -10,
              vx: Math.cos(angle) * spd,
              vy: Math.sin(angle) * spd - 30,
              life: 1.0,
              maxLife: 0.6 + Math.random() * 0.4,
              size: 2 + Math.random() * 2.5,
              color: crateType === 'striker' ? '#ef4444' : crateType === 'grappler' ? '#38bdf8' : '#fbbf24',
            });
          }
        }
      }

      const phaseElapsed = Math.max(0, (time - state.phaseStartTime) / 1000);

      // Smooth Ease Values
      if (animationPhase === 'popping_chest') {
        const p = Math.min(1.0, phaseElapsed / 0.45);
        state.chestPopScale = 0.2 + 0.8 * (Math.sin(p * Math.PI * 0.9) * 1.15);
        if (p >= 0.95) state.chestPopScale = 1.0;
      } else {
        state.chestPopScale = 1.0;
      }

      if (animationPhase === 'opening') {
        const p = Math.min(1.0, phaseElapsed / 0.45);
        state.openProgress = 1 - Math.pow(1 - p, 3);
      } else if (animationPhase === 'revealed') {
        state.openProgress = 1.0;
      } else if (animationPhase === 'closing') {
        const p = Math.min(1.0, phaseElapsed / 0.35);
        state.openProgress = Math.max(0, 1 - Math.pow(p, 2));
      } else {
        state.openProgress = 0.0;
      }

      // Clear Screen
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2 + 14;

      // 1. Shake / Rumbling offset during rattling phase
      let shakeX = 0;
      let shakeY = 0;
      let shakeRot = 0;

      if (animationPhase === 'rattling') {
        const intensity = Math.max(1, shakeStage) * 3.8;
        shakeX = (Math.sin(time * 0.06) * 0.9 + Math.cos(time * 0.08) * 0.5) * intensity;
        shakeY = (Math.cos(time * 0.07) * 0.8 + Math.sin(time * 0.11) * 0.4) * intensity;
        shakeRot = Math.sin(time * 0.05) * 0.035 * shakeStage;
      }

      // Render Crate Instance with strictly verified, balanced context stack
      const renderCrateInstance = (
        posX: number,
        posY: number,
        openP: number,
        scale: number,
        rot: number,
        type: CrateType,
        renderKeyAndLoot: boolean
      ) => {
        ctx.save(); // [SAVE 1: Instance root]
        ctx.translate(posX, posY);
        ctx.scale(scale, scale);
        ctx.rotate(rot);

        // A. Floor Radial Shadow
        ctx.save(); // [SAVE A]
        const shadowGrad = ctx.createRadialGradient(0, 62, 10, 0, 62, 120);
        shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
        shadowGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.4)');
        shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = shadowGrad;
        ctx.beginPath();
        ctx.ellipse(0, 62, 115, 26, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore(); // [RESTORE A]

        // B. Theme Palette Selection
        let glowHex = '#eab308';
        let themeGradient1 = '#3f3f46';
        let themeGradient2 = '#18181b';
        let accentBorder = '#eab308';
        let crestIcon = '⚡';

        if (type === 'striker') {
          glowHex = '#ef4444';
          themeGradient1 = '#7f1d1d';
          themeGradient2 = '#260606';
          accentBorder = '#ef4444';
          crestIcon = '🥊';
        } else if (type === 'grappler') {
          glowHex = '#0ea5e9';
          themeGradient1 = '#0369a1';
          themeGradient2 = '#041f31';
          accentBorder = '#38bdf8';
          crestIcon = '🥋';
        } else if (type === 'hybrid') {
          glowHex = '#a855f7';
          themeGradient1 = '#6b21a8';
          themeGradient2 = '#1f0738';
          accentBorder = '#c084fc';
          crestIcon = '⚔️';
        } else if (type === 'origin') {
          glowHex = '#f59e0b';
          themeGradient1 = '#451a03';
          themeGradient2 = '#0c0a09';
          accentBorder = '#fbbf24';
          crestIcon = '🌐';
        }

        // C. Ambient Aura
        ctx.save(); // [SAVE C]
        const auraGrad = ctx.createRadialGradient(0, 6, 20, 0, 6, 140);
        auraGrad.addColorStop(0, `${glowHex}33`);
        auraGrad.addColorStop(0.6, `${glowHex}11`);
        auraGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(0, 6, 140, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore(); // [RESTORE C]

        // D. Geometries
        const crateW = 184;
        const baseH = 74;
        const lidH = 34;
        const baseX = -crateW / 2;
        const baseY = -14;
        const lidY = -48;
        const hingeY = lidY + 4;

        // E. Volumetric Internal Light Beams (When open)
        if (openP > 0 && renderKeyAndLoot) {
          ctx.save(); // [SAVE E]
          const beamH = 120 * openP;
          const beamGrad = ctx.createLinearGradient(0, baseY, 0, baseY - beamH);
          beamGrad.addColorStop(0, isWin ? `${styleColor}dd` : 'rgba(212, 212, 216, 0.45)');
          beamGrad.addColorStop(0.4, isWin ? `${styleColor}66` : 'rgba(161, 161, 170, 0.2)');
          beamGrad.addColorStop(1, 'rgba(0,0,0,0)');

          ctx.fillStyle = beamGrad;
          ctx.beginPath();
          ctx.moveTo(baseX + 16, baseY);
          ctx.lineTo(baseX - 30 * openP, baseY - beamH);
          ctx.lineTo(baseX + crateW + 30 * openP, baseY - beamH);
          ctx.lineTo(baseX + crateW - 16, baseY);
          ctx.closePath();
          ctx.fill();

          for (let r = 0; r < 5; r++) {
            const rayAngle = -Math.PI / 2 + (r - 2) * 0.26;
            const rayLen = (80 + Math.sin(time * 0.006 + r) * 16) * openP;
            ctx.strokeStyle = isWin ? 'rgba(255, 255, 255, 0.75)' : 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, baseY);
            ctx.lineTo(Math.cos(rayAngle) * rayLen, baseY + Math.sin(rayAngle) * rayLen);
            ctx.stroke();
          }
          ctx.restore(); // [RESTORE E]
        }

        // F. Hinged Lid Rendering
        ctx.save(); // [SAVE F]
        if (openP === 0) {
          // Closed Lid Box
          const lidGrad = ctx.createLinearGradient(baseX, lidY, baseX + crateW, lidY + lidH);
          lidGrad.addColorStop(0, themeGradient1);
          lidGrad.addColorStop(1, themeGradient2);

          ctx.fillStyle = lidGrad;
          ctx.strokeStyle = accentBorder;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(baseX - 2, lidY, crateW + 4, lidH + 2, [14, 14, 4, 4]);
          ctx.fill();
          ctx.stroke();

          // Lid Top Rim Highlight
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(baseX + 8, lidY + 4);
          ctx.lineTo(baseX + crateW - 8, lidY + 4);
          ctx.stroke();

          // Neon Lid Accent Line
          ctx.strokeStyle = accentBorder;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(baseX + 12, lidY + lidH - 6);
          ctx.lineTo(baseX + crateW - 12, lidY + lidH - 6);
          ctx.stroke();
        } else {
          // Open Hinged Lid (3D Perspective Quad)
          const angle = openP * (Math.PI * 0.58);
          const lidDepth = lidH;
          const sinA = Math.sin(angle);

          const topY = hingeY - sinA * lidDepth * 1.1;
          const frontY = hingeY;
          const lidTopW = (crateW + 4) * (1 - openP * 0.12);

          const innerLidGrad = ctx.createLinearGradient(0, topY, 0, frontY);
          innerLidGrad.addColorStop(0, '#09090b');
          innerLidGrad.addColorStop(0.6, '#18181b');
          innerLidGrad.addColorStop(1, '#27272a');

          ctx.fillStyle = innerLidGrad;
          ctx.strokeStyle = accentBorder;
          ctx.lineWidth = 2.5;

          ctx.beginPath();
          ctx.moveTo(-lidTopW / 2, topY);
          ctx.lineTo(lidTopW / 2, topY);
          ctx.lineTo((crateW + 4) / 2, frontY);
          ctx.lineTo(-(crateW + 4) / 2, frontY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Inner Lid Panel Lines
          ctx.strokeStyle = accentBorder;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-lidTopW / 2 + 16, topY + 6);
          ctx.lineTo(lidTopW / 2 - 16, topY + 6);
          ctx.moveTo(-(crateW) / 2 + 20, frontY - 4);
          ctx.lineTo((crateW) / 2 - 20, frontY - 4);
          ctx.stroke();

          // Hydraulic Pistons
          const drawHingePiston = (hx: number) => {
            ctx.save();
            ctx.fillStyle = '#52525b';
            ctx.strokeStyle = '#27272a';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(hx - 3, topY + 6, 6, Math.max(10, frontY - topY - 8), 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          };

          drawHingePiston(-(crateW / 2) + 12);
          drawHingePiston(crateW / 2 - 12);
        }
        ctx.restore(); // [RESTORE F]

        // G. Base Container Body
        ctx.save(); // [SAVE G]
        const baseGrad = ctx.createLinearGradient(baseX, baseY, baseX + crateW, baseY + baseH);
        baseGrad.addColorStop(0, themeGradient1);
        baseGrad.addColorStop(0.5, themeGradient2);
        baseGrad.addColorStop(1, '#09090b');

        ctx.fillStyle = baseGrad;
        ctx.strokeStyle = accentBorder;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.roundRect(baseX, baseY, crateW, baseH, [0, 0, 16, 16]);
        ctx.fill();
        ctx.stroke();
        ctx.restore(); // [RESTORE G]

        // H. Clean Recessed Interior Lip when open
        if (openP > 0) {
          ctx.save(); // [SAVE H]
          ctx.fillStyle = '#09090b';
          ctx.beginPath();
          ctx.roundRect(baseX + 6, baseY, crateW - 12, 6, [0, 0, 3, 3]);
          ctx.fill();
          ctx.restore(); // [RESTORE H]
        }

        // I. Hazard Stripes for Normal Crate
        if (type === 'normal') {
          ctx.save(); // [SAVE I]
          ctx.beginPath();
          ctx.rect(baseX + 6, baseY + 14, crateW - 12, 16);
          ctx.clip();
          for (let i = -20; i < crateW + 40; i += 18) {
            ctx.fillStyle = '#eab308';
            ctx.beginPath();
            ctx.moveTo(baseX + i, baseY + 14);
            ctx.lineTo(baseX + i + 9, baseY + 14);
            ctx.lineTo(baseX + i, baseY + 30);
            ctx.lineTo(baseX + i - 9, baseY + 30);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore(); // [RESTORE I]
        }

        // J. Corner Brackets
        const drawCornerBracket = (bx: number, by: number, bRot: number) => {
          ctx.save(); // [SAVE J-item]
          ctx.translate(bx, by);
          ctx.rotate(bRot);
          ctx.fillStyle = '#18181b';
          ctx.strokeStyle = '#52525b';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(-4, -4, 16, 16, 3);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#e4e4e7';
          ctx.beginPath();
          ctx.arc(4, 4, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore(); // [RESTORE J-item]
        };

        drawCornerBracket(baseX + 6, baseY + baseH - 6, -Math.PI / 2);
        drawCornerBracket(baseX + crateW - 6, baseY + baseH - 6, Math.PI);

        // K. Front Martial Crest Emblem
        ctx.save(); // [SAVE K]
        ctx.fillStyle = '#09090b';
        ctx.strokeStyle = accentBorder;
        ctx.lineWidth = 2.5;

        const emblemY = baseY + 42;
        ctx.beginPath();
        ctx.arc(0, emblemY, 19, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = `${accentBorder}66`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, emblemY, 15, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = accentBorder;
        ctx.font = '900 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(crestIcon, 0, emblemY + 1);
        ctx.restore(); // [RESTORE K]

        // L. Lock Tumbler
        const lockY = baseY - 8;
        const keyConfig = KEY_TIERS[selectedKeyTier];
        const isKeyPhase = renderKeyAndLoot && ['inserting_key', 'spinning_key', 'rattling'].includes(animationPhase);

        if (openP === 0) {
          ctx.save(); // [SAVE L]
          ctx.fillStyle = '#18181b';
          ctx.strokeStyle = accentBorder;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(-20, lockY, 40, 24, 6);
          ctx.fill();
          ctx.stroke();

          // Keyhole
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(0, lockY + 9, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(-2.5, lockY + 9, 5, 9);
          ctx.restore(); // [RESTORE L]
        } else {
          // Snapped Open Latches
          ctx.save(); // [SAVE L-open]
          ctx.fillStyle = '#27272a';
          ctx.strokeStyle = accentBorder;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(-16, lockY + 8, 32, 14, 4);
          ctx.fill();
          ctx.stroke();
          ctx.restore(); // [RESTORE L-open]
        }

        // M. Perspective Key Sequence: Circle travels to crate -> Docks into slot line -> Turns once before shaking
        if (isKeyPhase && openP === 0) {
          let keyY = lockY + 9;
          let scaleX = 1.0;
          let turnAngle = 0;
          let isLine = false;

          if (animationPhase === 'inserting_key') {
            const p = Math.min(1.0, phaseElapsed / 0.45);
            const startY = lockY + 54;
            const targetY = lockY + 9;
            // Smooth ease-out flight to lock
            const flightEase = 1 - Math.pow(1 - p, 2);
            keyY = startY - (startY - targetY) * flightEase;
            
            // Stays a crisp, solid circle during flight (0.0 to 0.75), then smoothly docks into slot line at arrival (0.75 to 1.0)
            if (p < 0.75) {
              scaleX = 1.0;
              isLine = false;
            } else {
              const dockProgress = (p - 0.75) / 0.25;
              scaleX = Math.cos(dockProgress * (Math.PI / 2));
              if (scaleX < 0.12) isLine = true;
            }
          } else if (animationPhase === 'spinning_key') {
            const p = Math.min(1.0, phaseElapsed / 0.45);
            keyY = lockY + 9;
            isLine = true;
            scaleX = 0;
            // Smooth ease-in-out single turn (180°)
            const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
            turnAngle = ease * Math.PI;
          } else if (animationPhase === 'rattling') {
            keyY = lockY + 9;
            isLine = true;
            turnAngle = Math.PI; // Remains turned in unlocked position
          }

          ctx.save(); // [SAVE M]
          ctx.translate(0, keyY);
          ctx.rotate(turnAngle);

          ctx.shadowColor = keyConfig.accent;
          ctx.shadowBlur = 12;

          if (!isLine) {
            // 1. Sleek, crisp traveling key token
            ctx.scale(Math.max(0.06, scaleX), 1.0);

            // Outer Key Token Body
            const tokenGrad = ctx.createLinearGradient(-8, -8, 8, 8);
            tokenGrad.addColorStop(0, '#ffffff');
            tokenGrad.addColorStop(0.35, keyConfig.accent);
            tokenGrad.addColorStop(1, '#09090b');

            ctx.fillStyle = tokenGrad;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Inner Keyhole Notch Slot (showing it is a key token)
            ctx.fillStyle = '#18181b';
            ctx.beginPath();
            ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(-1.5, 0, 3, 6);
          } else {
            // 2. Simple Sharp Line that turns once in the lock
            const lineLen = 10;

            // Outer Line Glow
            ctx.strokeStyle = keyConfig.accent;
            ctx.lineWidth = 3.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(0, -lineLen);
            ctx.lineTo(0, lineLen);
            ctx.stroke();

            // Inner Crisp Center Core Line
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, -lineLen + 1);
            ctx.lineTo(0, lineLen - 1);
            ctx.stroke();
          }

          ctx.restore(); // [RESTORE M]
        }

        // N. Loot Reveal Artifact
        if (openP > 0 && renderKeyAndLoot) {
          if (isWin) {
            const emergeP = Math.min(1.0, openP * 1.15);
            const orbY = baseY - 16 - emergeP * 46 + Math.sin(time * 0.005) * 6;

            ctx.save(); // [SAVE N-win]
            ctx.translate(0, orbY);

            ctx.fillStyle = '#ffffff';
            ctx.font = '900 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = styleColor || '#fbbf24';
            ctx.shadowBlur = 18;
            ctx.fillText('✨', 0, 1);
            ctx.restore(); // [RESTORE N-win]
          } else {
            const puffY = baseY - 10 - openP * 24;
            ctx.save(); // [SAVE N-empty]
            ctx.translate(0, puffY);

            const smokeGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 50 * openP);
            smokeGrad.addColorStop(0, 'rgba(161, 161, 170, 0.7)');
            smokeGrad.addColorStop(0.5, 'rgba(113, 113, 122, 0.35)');
            smokeGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = smokeGrad;

            ctx.beginPath();
            ctx.arc(-10 + Math.sin(time * 0.004) * 6, -6, 28 * openP, 0, Math.PI * 2);
            ctx.arc(10 + Math.cos(time * 0.004) * 6, -8, 32 * openP, 0, Math.PI * 2);
            ctx.arc(0, -16, 24 * openP, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore(); // [RESTORE N-empty]
          }
        }

        ctx.restore(); // [RESTORE 1: Instance root]
      };

      // MAIN RENDER PIPELINE BASED ON PHASE
      if (animationPhase === 'replacing') {
        const p = Math.min(1.0, phaseElapsed / 0.52);
        // Smooth Cubic Easing
        const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

        const travelDist = width + 100;
        const oldX = cx - ease * travelDist;
        const newX = cx + (1 - ease) * travelDist;

        // 1. Draw Old Crate (exiting smoothly to the left)
        renderCrateInstance(oldX, cy, 0, 1.0, 0, crateType, false);

        // 2. Draw New Crate (entering smoothly from the right)
        renderCrateInstance(newX, cy, 0, 1.0, 0, crateType, false);
      } else {
        // Standard Single Crate Stage
        renderCrateInstance(
          cx + shakeX,
          cy + shakeY,
          state.openProgress,
          state.chestPopScale,
          shakeRot,
          crateType,
          true
        );
      }

      // Spark Particles
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const pt = state.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vy += 120 * dt;
        pt.life -= dt / pt.maxLife;

        if (pt.life <= 0) {
          state.particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, pt.life);
        ctx.beginPath();
        ctx.arc(cx + pt.x, cy + pt.y, pt.size * pt.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore(); // End DPR scale

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [crateType, animationPhase, selectedKeyTier, shakeStage, isWin, styleColor, width, height]);

  return (
    <div className="relative flex items-center justify-center select-none pointer-events-none w-full">
      <canvas
        ref={canvasRef}
        style={{ width: `${width}px`, height: `${height}px` }}
        className="max-w-full h-auto drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)]"
      />
    </div>
  );
};
