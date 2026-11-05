/**
 * SECTION 8.4: CINEMATIC COUNTDOWN REWORK & CAMERA ZOOM PIPELINE
 * Pre-warms and pre-rasterizes off-screen static canvas buffers for heavy Persona-styled
 * countdown numerals ("3", "2", "1") and the angular sliding "FIGHT!" Persona Banner.
 * Zero-allocation drawing guarantees 60 FPS performance without garbage collection stutters.
 */

interface CachedCanvas {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

const bufferCache: Record<string, CachedCanvas> = {};

/**
 * Pre-rasterizes Persona-styled text and banner graphics into off-screen canvas buffers.
 */
export function prewarmCountdownBuffers(): void {
  if (typeof window === 'undefined') return;

  // 1. Numerals: "3", "2", "1"
  const numerals = [
    { text: '3', color: '#ef4444', border: '#ffffff', shadow: '#000000' },
    { text: '2', color: '#f59e0b', border: '#ffffff', shadow: '#000000' },
    { text: '1', color: '#eab308', border: '#ffffff', shadow: '#000000' }
  ];

  numerals.forEach(({ text, color, border, shadow }) => {
    if (bufferCache[text]) return;

    const width = 360;
    const height = 360;
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;

    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.save();

    // Skew matrix for Persona angular comic aesthetic (-12 degrees skew)
    ctx.translate(width / 2, height / 2);
    ctx.transform(1, 0, -0.21, 1, 0, 0);

    // Heavy Drop Shadow Offset
    ctx.fillStyle = shadow;
    ctx.font = '900 italic 180px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 10, 10);

    // Outer Thick White Border Stroke
    ctx.strokeStyle = border;
    ctx.lineWidth = 16;
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 2;
    ctx.strokeText(text, 0, 0);

    // Inner Solid Persona Color Fill
    ctx.fillStyle = color;
    ctx.fillText(text, 0, 0);

    ctx.restore();

    bufferCache[text] = {
      canvas: offscreen,
      width,
      height
    };
  });

  // 2. Persona "FIGHT!" Banner
  if (!bufferCache['FIGHT_BANNER']) {
    const width = 640;
    const height = 180;
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;

    const ctx = offscreen.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, width, height);
      ctx.save();

      const cx = width / 2;
      const cy = height / 2;

      // Heavy Black Shadow Box Offset
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.moveTo(35 + 8, 15 + 8);
      ctx.lineTo(width - 15 + 8, 15 + 8);
      ctx.lineTo(width - 35 + 8, height - 15 + 8);
      ctx.lineTo(15 + 8, height - 15 + 8);
      ctx.closePath();
      ctx.fill();

      // Red Outer Skewed Polygon Card (-12 deg angle)
      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(35, 15);
      ctx.lineTo(width - 15, 15);
      ctx.lineTo(width - 35, height - 15);
      ctx.lineTo(15, height - 15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner Black Accent Core Strip
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.moveTo(48, 28);
      ctx.lineTo(width - 28, 28);
      ctx.lineTo(width - 48, height - 28);
      ctx.lineTo(28, height - 28);
      ctx.closePath();
      ctx.fill();

      // "FIGHT!" Text inside Banner
      ctx.translate(cx, cy);
      ctx.transform(1, 0, -0.21, 1, 0, 0);

      // Text Stroke
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 12;
      ctx.font = '900 italic 84px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText('FIGHT!', 0, 0);

      // Text Fill
      ctx.fillStyle = '#ef4444';
      ctx.fillText('FIGHT!', 0, 0);

      ctx.restore();

      bufferCache['FIGHT_BANNER'] = {
        canvas: offscreen,
        width,
        height
      };
    }
  }
}

/**
 * Draws pre-cached Persona countdown numeral texture.
 */
export function drawCachedCountdownNumeral(
  ctx: CanvasRenderingContext2D,
  stepNum: number,
  alpha: number,
  centerX: number,
  centerY: number,
  scale: number = 1.0
): void {
  const text = String(stepNum);
  const cached = bufferCache[text];
  if (!cached) return;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.translate(centerX, centerY);
  if (scale !== 1.0) {
    ctx.scale(scale, scale);
  }
  ctx.drawImage(
    cached.canvas,
    -cached.width / 2,
    -cached.height / 2
  );
  ctx.restore();
}

/**
 * Draws the angular Persona "FIGHT!" Banner sliding in violently across the screen.
 */
export function drawCachedFightBanner(
  ctx: CanvasRenderingContext2D,
  slideProgress: number, // 0.0 (off-screen right) to 1.0 (centered)
  alpha: number,
  centerX: number,
  centerY: number
): void {
  const cached = bufferCache['FIGHT_BANNER'];
  if (!cached) return;

  // Violent slide-in offset from right
  const offsetX = (1 - Math.min(1, Math.max(0, slideProgress))) * 800;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.translate(centerX + offsetX, centerY);
  ctx.drawImage(
    cached.canvas,
    -cached.width / 2,
    -cached.height / 2
  );
  ctx.restore();
}

// Automatically trigger pre-warming on module load
prewarmCountdownBuffers();
