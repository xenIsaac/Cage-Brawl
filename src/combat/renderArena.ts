import { GameSettings } from '../types';
import { FloatingTextParticle } from './types';

export const drawArenaFloor = (
  ctx: CanvasRenderingContext2D,
  size: number,
  settings: GameSettings
) => {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 14; // Beautiful 14px padding so cage border is fully visible & unclipped
  const sides = 8;
  const angleOffset = Math.PI / 8; // Rotated by 22.5 degrees so flat edges align perfectly parallel to screen borders

  const preset = settings.graphicsPreset || 'normal';

  // Tier 1: Barebones (Ultra Performance / Competitive Minimalist)
  if (preset === 'barebones') {
    // Flat pitch-black floor surface (#000000)
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const angle = (i * 2 * Math.PI) / sides + angleOffset;
      ctx.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
    }
    ctx.closePath();
    ctx.fill();

    // Simple thin white/grey grid lines (#1F242D)
    ctx.strokeStyle = '#1F242D';
    ctx.lineWidth = 1;
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const angle = (i * 2 * Math.PI) / sides + angleOffset;
      ctx.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
    }
    ctx.closePath();
    ctx.clip();

    const step = 60;
    for (let x = 0; x < size; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (let y = 0; y < size; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
    ctx.restore();

    // Octagon boundaries: flat solid unlit border lines (#2D3748) with 0 glow
    ctx.strokeStyle = '#2D3748';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const angle = (i * 2 * Math.PI) / sides + angleOffset;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    return;
  }

  // Tier 2 (Medium) & Tier 3 (Normal)
  const theme = settings.arenaTheme || 'classic_cage';

  let matColor = '#09090b';
  let wireColor = '#1d1d20';
  let postColor = '#27272a';
  let tapeColor = '#ef4444';

  if (theme === 'neon_underground') {
    matColor = '#05050f';
    wireColor = '#0f172a';
    postColor = '#3b82f6';
    tapeColor = '#06b6d4';
  } else if (theme === 'tokyo_dojo') {
    matColor = '#140c06';
    wireColor = '#29180c';
    postColor = '#78350f';
    tapeColor = '#f59e0b';
  } else if (theme === 'championship') {
    matColor = '#0a0a05';
    wireColor = '#1c1917';
    postColor = '#ca8a04';
    tapeColor = '#eab308';
  }

  // 1. Deep charcoal/dark-grey floor mat background fill
  ctx.fillStyle = matColor;
  ctx.beginPath();
  for (let i = 0; i <= sides; i++) {
    const angle = (i * 2 * Math.PI) / sides + angleOffset;
    ctx.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
  }
  ctx.closePath();
  ctx.fill();

  // 1b. Directional Overhead Arena Cage Lighting (High-contrast theatrical spotlight - Normal Tier Only)
  if (preset === 'normal') {
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const angle = (i * 2 * Math.PI) / sides + angleOffset;
      ctx.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
    }
    ctx.closePath();
    ctx.clip();

    const spotGradient = ctx.createRadialGradient(centerX, centerY - 20, 10, centerX, centerY, radius * 0.95);
    spotGradient.addColorStop(0, 'rgba(255, 255, 255, 0.07)');
    spotGradient.addColorStop(0.4, 'rgba(239, 68, 68, 0.03)');
    spotGradient.addColorStop(0.85, 'rgba(0, 0, 0, 0.35)');
    spotGradient.addColorStop(1, 'rgba(0, 0, 0, 0.70)');
    ctx.fillStyle = spotGradient;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();
  }

  // 2. Draw cage fence wireframe grid
  ctx.strokeStyle = wireColor; // Sleek wire mesh lines
  ctx.lineWidth = 1;
  const step = preset === 'medium' ? 60 : 40;
  ctx.save();
  // Clip drawing inside the octagon
  ctx.beginPath();
  for (let i = 0; i <= sides; i++) {
    const angle = (i * 2 * Math.PI) / sides + angleOffset;
    ctx.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
  }
  ctx.closePath();
  ctx.clip();

  for (let x = 0; x < size; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  for (let y = 0; y < size; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Thick Steel Cage Outer Borders
  ctx.strokeStyle = postColor;
  ctx.lineWidth = preset === 'medium' ? 6 : 10;
  ctx.beginPath();
  for (let i = 0; i <= sides; i++) {
    const angle = (i * 2 * Math.PI) / sides + angleOffset;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  // 4. Inner Neon Warning Tape Line
  ctx.save();
  if (preset === 'normal') {
    ctx.shadowColor = tapeColor;
    ctx.shadowBlur = 12;
  }
  ctx.strokeStyle = tapeColor;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  for (let i = 0; i <= sides; i++) {
    const angle = (i * 2 * Math.PI) / sides + angleOffset;
    const insetRadius = radius - 4;
    const x = centerX + insetRadius * Math.cos(angle);
    const y = centerY + insetRadius * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // 5. Authentic UFC-Style Corner Pads (Solid cylindrical foam bumper pads)
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides + angleOffset;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    let padColor = '#e4e4e7';
    if (i === 0) padColor = '#ef4444';
    else if (i === 4) padColor = '#3b82f6';

    if (preset === 'normal') {
      // Draw shadow
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.arc(x + 2, y + 2, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw pad base (flat fill for Medium tier)
    ctx.fillStyle = padColor;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();

    if (preset === 'normal') {
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // 6. Center ring decal line graphics
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 150, 0, Math.PI * 2);
  ctx.stroke();

  // Red sector lines
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.08)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX - 250, centerY);
  ctx.lineTo(centerX + 250, centerY);
  ctx.moveTo(centerX, centerY - 250);
  ctx.lineTo(centerX, centerY + 250);
  ctx.stroke();

  // Center MMA decal logo text
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.font = 'black italic uppercase 48px "Space Grotesk", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MMA SPARRING', centerX, centerY + 14);
};

export const renderParticlesAndTexts = (
  ctx: CanvasRenderingContext2D,
  particles: FloatingTextParticle[],
  settings: GameSettings
) => {
  const preset = settings.graphicsPreset || 'normal';
  const particleDensity = settings.particleDensity || 'high';

  particles.forEach((p, idx) => {
    if (p.text) {
      if (settings.damageNumbers === false || preset === 'barebones') return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color || '#ffffff';
      const isCrit = (p as any).isCrit;
      ctx.font = isCrit ? '900 italic 16px "Plus Jakarta Sans", sans-serif' : '700 13px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      if (isCrit && preset === 'normal') {
        ctx.shadowColor = p.color || '#ef4444';
        ctx.shadowBlur = 10;
      }
      ctx.fillText(p.text, p.x, p.y + (p.textYOffset || 0));
      ctx.restore();
      return;
    } else {
      if (preset === 'barebones') return; // Suppress visual particles in Barebones
      if (particleDensity === 'off') return;
      if (preset === 'medium' && idx % 3 !== 0) return; // 60% particle reduction in Medium
      if (particleDensity === 'low' && idx % 3 !== 0) return;
      if (particleDensity === 'medium' && idx % 2 !== 0) return;
      if (p.type === 'aura' && settings.disableAuraVfx) return;
      
      ctx.save();
      ctx.globalAlpha = p.alpha;
      if (p.type === 'parry_ring') {
        if (settings.lowGraphicsMode || preset === 'medium') {
          const currentRadius = p.radius + (p.life / p.maxLife) * 30;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          const currentRadius = p.radius + (p.life / p.maxLife) * 45;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 3.5 * (1 - p.life / p.maxLife);
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (p.type === 'aiki_wind_arc_right' || p.type === 'aiki_wind_arc_left') {
        const progress = Math.min(1.0, p.life / p.maxLife);
        const currentRadius = p.radius * (0.8 + 0.8 * progress);
        const arcSpread = Math.PI * 0.70;
        const isRight = p.type === 'aiki_wind_arc_right';
        const baseAngle = isRight ? (-Math.PI * 0.5 + progress * 0.4) : (Math.PI * 0.5 - progress * 0.4);
        ctx.strokeStyle = p.color || '#38bdf8';
        ctx.lineWidth = 3.5 * (1 - progress);
        if (preset === 'normal') {
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 8;
        }
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentRadius, baseAngle, baseAngle + arcSpread);
        ctx.stroke();
      } else if (p.type === 'aiki_ejection_cone') {
        const progress = Math.min(1.0, p.life / p.maxLife);
        const currentDist = p.radius * (1.0 + 3.0 * progress);
        const coneAngle = (p as any).facingAngle || 0;
        const halfSpread = 0.55;
        if (preset === 'normal') {
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 14;
        }
        
        // Outer shockwave cone
        ctx.strokeStyle = `rgba(56, 189, 248, ${(1 - progress) * 0.85})`;
        ctx.lineWidth = 4.0 * (1 - progress);
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentDist, coneAngle - halfSpread, coneAngle + halfSpread);
        ctx.stroke();

        if (preset === 'normal') {
          // Inner bright white shockwave core
          ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - progress) * 0.95})`;
          ctx.lineWidth = 2.0 * (1 - progress);
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentDist * 0.85, coneAngle - halfSpread * 0.8, coneAngle + halfSpread * 0.8);
          ctx.stroke();
        }
      } else if (p.type === 'aiki_dual_shockwave') {
        const progress = Math.min(1.0, p.life / p.maxLife);
        const r1 = p.radius * (0.6 + 2.4 * progress);
        if (preset === 'normal') {
          ctx.shadowColor = '#00E5FF';
          ctx.shadowBlur = 16;
        }
        ctx.strokeStyle = `rgba(0, 229, 255, ${(1 - progress) * 0.70})`;
        ctx.lineWidth = 4.5 * (1 - progress);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r1, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'kyokushin_punch_gust') {
        const progress = Math.min(1.0, p.life / p.maxLife);
        const coneAngle = (p as any).facingAngle || 0;
        const currentDist = p.radius * (0.6 + 2.8 * progress);
        const halfSpread = 0.45;

        if (preset === 'normal') {
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 14;
        }

        ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - progress) * 0.95})`;
        ctx.lineWidth = 3.8 * (1 - progress);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentDist, coneAngle - halfSpread, coneAngle + halfSpread);
        ctx.stroke();
      } else if (p.type === 'afterimage') {
        ctx.restore();
        return;
      } else if (p.type === 'shockwave') {
        const progress = Math.min(1.0, p.life / p.maxLife);
        const currentRadius = p.radius * (0.8 + 1.4 * progress);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3.0 * (1 - progress);
        if (preset === 'normal') {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'spark') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.radius;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x - p.vx * 1.8, p.y - p.vy * 1.8);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  });
};
