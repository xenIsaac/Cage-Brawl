/**
 * COUNTDOWN ANTI-FPS DROP ENGINE (UNIVERSAL PERFORMANCE FIX)
 * Pre-warms and pre-rasterizes off-screen static canvas buffers for round countdown graphics ("3", "2", "1", "FIGHT!").
 * Eliminates DOM node instantiations, dynamic font re-layouts, and garbage collection spikes during match starts.
 */

interface CachedCanvas {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

const bufferCache: Record<string, CachedCanvas> = {};

/**
 * Pre-rasterizes text graphics into off-screen canvas memory buffers.
 */
export function prewarmCountdownBuffers(): void {
  if (typeof window === 'undefined') return;

  const items = [
    { text: '3', color: '#ef4444', glow: '#dc2626' },
    { text: '2', color: '#f59e0b', glow: '#d97706' },
    { text: '1', color: '#eab308', glow: '#ca8a04' },
    { text: 'FIGHT!', color: '#22c55e', glow: '#16a34a' }
  ];

  items.forEach(({ text, color, glow }) => {
    if (bufferCache[text]) return;

    const width = 400;
    const height = 200;
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;

    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.save();

    // Subtle radial glow backdrop
    const glowGrad = ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, 120);
    glowGrad.addColorStop(0, `${color}40`);
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, width, height);

    // High-contrast text glow
    ctx.shadowColor = glow;
    ctx.shadowBlur = 24;

    // Stylized Persona typography
    ctx.fillStyle = color;
    ctx.font = '900 italic 96px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.strokeText(text, width / 2, height / 2);

    ctx.restore();

    bufferCache[text] = {
      canvas: offscreen,
      width,
      height
    };
  });
}

/**
 * Draws pre-cached countdown texture to destination canvas with zero runtime allocations.
 */
export function drawCachedCountdown(
  ctx: CanvasRenderingContext2D,
  text: string,
  alpha: number,
  centerX: number,
  centerY: number
): void {
  const cached = bufferCache[text];
  if (!cached) {
    // Fallback if not pre-cached yet
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = '#ef4444';
    ctx.font = '900 italic 80px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, centerX, centerY);
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.drawImage(
    cached.canvas,
    centerX - cached.width / 2,
    centerY - cached.height / 2
  );
  ctx.restore();
}

// Automatically trigger pre-warming on module load
prewarmCountdownBuffers();
