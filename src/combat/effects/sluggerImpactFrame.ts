import { Fighter } from '../../types';

export interface SluggerParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
  type: 'shard' | 'droplet' | 'streak' | 'tri_shard';
  angle: number;
  angularVelocity: number;
  length?: number;
  curveFactor?: number;
}

export interface SluggerShockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  lineWidth: number;
  alpha: number;
}

export interface SluggerSpeedline {
  angle: number;
  dist: number;
  length: number;
  width: number;
  alpha: number;
}

export interface SluggerImpactFrameState {
  isActive: boolean;
  variant: 'hit' | 'block';
  currentFrame: number;
  totalDuration: number;
  holdFrames: number;
  pullbackFrames: number;
  attacker: Fighter | null;
  defender: Fighter | null;
  hitX: number;
  hitY: number;
  impactAngle: number;
  knockback: { vx: number; vy: number };
  particles: SluggerParticle[];
  shockwaves: SluggerShockwave[];
  speedlines: SluggerSpeedline[];
  storedPositions: {
    attackerX: number;
    attackerY: number;
    defenderX: number;
    defenderY: number;
  };
}

const state: SluggerImpactFrameState = {
  isActive: false,
  variant: 'hit',
  currentFrame: 0,
  totalDuration: 120,
  holdFrames: 95,
  pullbackFrames: 25,
  attacker: null,
  defender: null,
  hitX: 0,
  hitY: 0,
  impactAngle: 0,
  knockback: { vx: 0, vy: 0 },
  particles: [],
  shockwaves: [],
  speedlines: [],
  storedPositions: {
    attackerX: 0,
    attackerY: 0,
    defenderX: 0,
    defenderY: 0
  }
};

export function isSluggerImpactActive(): boolean {
  return state.isActive;
}

export function isSluggerImpactSilhouette(): boolean {
  return state.isActive;
}

/**
 * Triggers Slugger M2 Clean Hit Impact Frame (2.0s hold, slow motion, exit particles behind enemy).
 */
export function triggerSluggerHitImpact(
  attacker: Fighter,
  defender: Fighter,
  hitX: number,
  hitY: number,
  kbX: number,
  kbY: number
): void {
  const angle = Math.atan2(defender.y - attacker.y, defender.x - attacker.x);

  state.isActive = true;
  state.variant = 'hit';
  state.currentFrame = 0;
  state.totalDuration = 120; // 2.0s
  state.holdFrames = 95;
  state.pullbackFrames = 25;
  state.attacker = attacker;
  state.defender = defender;
  state.hitX = hitX;
  state.hitY = hitY;
  state.impactAngle = angle;
  state.knockback = {
    vx: kbX * 24,
    vy: kbY * 24
  };
  state.storedPositions = {
    attackerX: attacker.x,
    attackerY: attacker.y,
    defenderX: defender.x,
    defenderY: defender.y
  };

  // Lock heavy fist at 100% extension on the enemy
  const heavyFist = attacker.fists.find(f => f.isHeavy || f.punchType === 'right') || attacker.fists[1];
  if (heavyFist) {
    heavyFist.punchProgress = 1.0;
    heavyFist.isPunching = true;
  }

  // Generate black shockwaves radiating outward
  state.shockwaves = [
    { x: hitX, y: hitY, radius: 10, maxRadius: 180, speed: 1.8, lineWidth: 8, alpha: 1.0 },
    { x: hitX, y: hitY, radius: 25, maxRadius: 260, speed: 2.2, lineWidth: 5, alpha: 0.9 },
    { x: hitX, y: hitY, radius: 45, maxRadius: 360, speed: 2.8, lineWidth: 3, alpha: 0.8 }
  ];

  // Generate radial black speedlines
  state.speedlines = [];
  const lineCount = 36;
  for (let i = 0; i < lineCount; i++) {
    const lineAngle = (i / lineCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.15;
    state.speedlines.push({
      angle: lineAngle,
      dist: Math.random() * 30 + 15,
      length: Math.random() * 90 + 60,
      width: Math.random() * 3.5 + 1.5,
      alpha: Math.random() * 0.4 + 0.6
    });
  }

  // Generate particles exiting out the OPPOSITE side in slow motion
  state.particles = [];
  const initialBurstCount = 55;
  for (let i = 0; i < initialBurstCount; i++) {
    const exitAngle = angle + (Math.random() - 0.5) * 1.05;
    const speed = Math.random() * 2.4 + 0.8;
    const typeRoll = Math.random();
    const type: 'shard' | 'droplet' | 'streak' = typeRoll < 0.45 ? 'shard' : (typeRoll < 0.8 ? 'droplet' : 'streak');

    state.particles.push({
      id: `slugger_hit_p_${Math.random()}`,
      x: defender.x + Math.cos(exitAngle) * (defender.radius * 0.6) + (Math.random() - 0.5) * 10,
      y: defender.y + Math.sin(exitAngle) * (defender.radius * 0.6) + (Math.random() - 0.5) * 10,
      vx: Math.cos(exitAngle) * speed,
      vy: Math.sin(exitAngle) * speed,
      size: Math.random() * 4.5 + 2.0,
      alpha: 1.0,
      life: 0,
      maxLife: Math.floor(Math.random() * 50 + 80),
      color: Math.random() < 0.85 ? '#000000' : '#171717',
      type,
      angle: Math.random() * Math.PI * 2,
      angularVelocity: (Math.random() - 0.5) * 0.05,
      length: Math.random() * 16 + 8
    });
  }
}

/**
 * Triggers Slugger M2 Block Variant Impact Frame.
 * Shoots triangular shards sideways that then flow/curve to the opposite side like slipstream airflow.
 */
export function triggerSluggerBlockImpact(
  attacker: Fighter,
  defender: Fighter,
  hitX: number,
  hitY: number,
  kbX: number,
  kbY: number
): void {
  const angle = Math.atan2(defender.y - attacker.y, defender.x - attacker.x);

  state.isActive = true;
  state.variant = 'block';
  state.currentFrame = 0;
  state.totalDuration = 72; // ~1.2s crisp block sequence
  state.holdFrames = 48;
  state.pullbackFrames = 24;
  state.attacker = attacker;
  state.defender = defender;
  state.hitX = hitX;
  state.hitY = hitY;
  state.impactAngle = angle;
  state.knockback = {
    vx: kbX * 7,
    vy: kbY * 7
  };
  state.storedPositions = {
    attackerX: attacker.x,
    attackerY: attacker.y,
    defenderX: defender.x,
    defenderY: defender.y
  };

  // Block impact shockwaves (compressed high-frequency shield impact rings)
  state.shockwaves = [
    { x: hitX, y: hitY, radius: 12, maxRadius: 140, speed: 2.5, lineWidth: 6, alpha: 1.0 },
    { x: hitX, y: hitY, radius: 30, maxRadius: 210, speed: 3.2, lineWidth: 4, alpha: 0.85 }
  ];

  // Radial shield deflection rays
  state.speedlines = [];
  const lineCount = 24;
  for (let i = 0; i < lineCount; i++) {
    // Deflection rays biased perpendicular to strike angle
    const sideAngle = angle + (i % 2 === 0 ? Math.PI / 2 : -Math.PI / 2) + (Math.random() - 0.5) * 0.8;
    state.speedlines.push({
      angle: sideAngle,
      dist: Math.random() * 20 + 10,
      length: Math.random() * 70 + 40,
      width: Math.random() * 3.0 + 1.2,
      alpha: Math.random() * 0.5 + 0.5
    });
  }

  // BLOCK VARIANT TRIANGULAR SHARDS:
  // Shoots triangular shards to the sides that then curve and flow to the opposite side like airflow
  state.particles = [];
  const shardCount = 48;
  for (let i = 0; i < shardCount; i++) {
    const isRightSide = i % 2 === 0;
    // Initial launch direction: out to the sides (perpendicular to impact vector)
    const lateralAngle = angle + (isRightSide ? Math.PI / 2 : -Math.PI / 2) + (Math.random() - 0.5) * 0.45;
    const lateralSpeed = Math.random() * 3.8 + 2.0;

    state.particles.push({
      id: `slugger_block_tri_${Math.random()}`,
      x: hitX + (Math.random() - 0.5) * 8,
      y: hitY + (Math.random() - 0.5) * 8,
      vx: Math.cos(lateralAngle) * lateralSpeed,
      vy: Math.sin(lateralAngle) * lateralSpeed,
      size: Math.random() * 6.5 + 3.0,
      alpha: 1.0,
      life: 0,
      maxLife: Math.floor(Math.random() * 35 + 55),
      color: '#000000',
      type: 'tri_shard',
      angle: Math.random() * Math.PI * 2,
      angularVelocity: (Math.random() - 0.5) * 0.12,
      curveFactor: (Math.random() * 0.12 + 0.15) // Airflow pull factor towards opposite side
    });
  }
}

/**
 * Updates Slugger impact frames, physics, and particle airflow.
 */
export function updateSluggerImpact(_gameTime: number): void {
  // Update particles even if sequence is ending to prevent any lingering shards
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life++;

    // In Block variant: Triangular shards shoot sideways then flow toward the opposite rear side like airflow
    if (state.variant === 'block' && p.type === 'tri_shard') {
      const airPullX = Math.cos(state.impactAngle) * (p.curveFactor || 0.18);
      const airPullY = Math.sin(state.impactAngle) * (p.curveFactor || 0.18);
      p.vx += airPullX;
      p.vy += airPullY;
      // Gentle air friction
      p.vx *= 0.96;
      p.vy *= 0.96;
    } else {
      // Hit variant slow motion drag
      p.vx *= 0.985;
      p.vy *= 0.985;
    }

    p.x += p.vx;
    p.y += p.vy;
    p.angle += p.angularVelocity;
    p.alpha = Math.max(0, 1.0 - (p.life / p.maxLife));

    if (p.life >= p.maxLife || p.alpha <= 0.01) {
      state.particles.splice(i, 1);
    }
  }

  // Update shockwaves
  for (const sw of state.shockwaves) {
    sw.radius += sw.speed;
    sw.alpha = Math.max(0, 1.0 - (sw.radius / sw.maxRadius));
  }

  if (!state.isActive) return;

  state.currentFrame++;
  const { attacker, defender, currentFrame, totalDuration, holdFrames, variant } = state;

  if (variant === 'hit') {
    // 1. Maintain attacker fist position firmly planted on the enemy
    if (attacker) {
      const heavyFist = attacker.fists.find(f => f.isHeavy || f.punchType === 'right') || attacker.fists[1];
      if (heavyFist) {
        if (currentFrame < holdFrames) {
          heavyFist.punchProgress = 1.0;
          heavyFist.isPunching = true;
        } else {
          const pullProgress = (currentFrame - holdFrames) / (totalDuration - holdFrames);
          heavyFist.punchProgress = 1.0 - pullProgress * 0.35;
          heavyFist.isPunching = false;
        }
      }

      if (currentFrame < holdFrames) {
        const shakeMag = (1.0 - currentFrame / holdFrames) * 0.8;
        attacker.x = state.storedPositions.attackerX + (Math.random() - 0.5) * shakeMag;
        attacker.y = state.storedPositions.attackerY + (Math.random() - 0.5) * shakeMag;
        attacker.vx = 0;
        attacker.vy = 0;
      }
    }

    // 2. Maintain defender in impact stun
    if (defender) {
      if (currentFrame < holdFrames) {
        const creep = (currentFrame / holdFrames) * 4.0;
        defender.x = state.storedPositions.defenderX + Math.cos(state.impactAngle) * creep;
        defender.y = state.storedPositions.defenderY + Math.sin(state.impactAngle) * creep;
        defender.vx = 0;
        defender.vy = 0;
        defender.stunTime = Math.max(defender.stunTime || 0, 30);
      }
    }

    // 3. Continuously spawn slow-motion exit particles behind defender
    if (defender && currentFrame < 50 && currentFrame % 3 === 0) {
      const exitAngle = state.impactAngle + (Math.random() - 0.5) * 0.95;
      const speed = Math.random() * 1.8 + 0.6;
      state.particles.push({
        id: `slugger_exit_stream_${Math.random()}`,
        x: defender.x + Math.cos(exitAngle) * (defender.radius * 0.8),
        y: defender.y + Math.sin(exitAngle) * (defender.radius * 0.8),
        vx: Math.cos(exitAngle) * speed,
        vy: Math.sin(exitAngle) * speed,
        size: Math.random() * 3.5 + 1.5,
        alpha: 0.9,
        life: 0,
        maxLife: 60,
        color: '#000000',
        type: Math.random() < 0.6 ? 'droplet' : 'shard',
        angle: Math.random() * Math.PI * 2,
        angularVelocity: (Math.random() - 0.5) * 0.04
      });
    }
  } else {
    // Block Variant: Guard hold with shield impact recoil
    if (defender && currentFrame < holdFrames) {
      const recoil = (currentFrame / holdFrames) * 6.0;
      defender.x = state.storedPositions.defenderX + Math.cos(state.impactAngle) * recoil;
      defender.y = state.storedPositions.defenderY + Math.sin(state.impactAngle) * recoil;
      defender.vx = 0;
      defender.vy = 0;
    }
    if (attacker && currentFrame < holdFrames) {
      const heavyFist = attacker.fists.find(f => f.isHeavy || f.punchType === 'right') || attacker.fists[1];
      if (heavyFist) {
        heavyFist.punchProgress = 1.0;
      }
    }
  }

  // Check sequence completion
  if (currentFrame >= totalDuration) {
    state.isActive = false;

    if (variant === 'hit') {
      if (defender) {
        defender.vx = state.knockback.vx;
        defender.vy = state.knockback.vy;
        defender.stunTime = 45;
        defender.superCrippleTimer = 60; // 1.0s Super Cripple applies AFTER impact frame finishes
      }
    } else {
      if (defender) {
        defender.vx = state.knockback.vx;
        defender.vy = state.knockback.vy;
      }
    }

    if (attacker) {
      const heavyFist = attacker.fists.find(f => f.isHeavy || f.punchType === 'right') || attacker.fists[1];
      if (heavyFist) {
        heavyFist.isPunching = false;
      }
    }
  }
}

/**
 * Renders Slugger impact background (stark whiteout + black shockwaves).
 */
export function renderSluggerImpactBackground(
  ctx: CanvasRenderingContext2D,
  arenaSize: number
): void {
  if (!state.isActive) return;

  const fadeFrames = state.variant === 'hit' ? 18 : 12;
  let bgAlpha = 1.0;
  if (state.currentFrame > state.totalDuration - fadeFrames) {
    bgAlpha = Math.max(0, (state.totalDuration - state.currentFrame) / fadeFrames);
  }

  ctx.save();
  ctx.fillStyle = `rgba(255, 255, 255, ${bgAlpha})`;
  ctx.fillRect(-arenaSize * 2, -arenaSize * 2, arenaSize * 5, arenaSize * 5);

  if (bgAlpha > 0.05) {
    // Black anime speedlines
    ctx.save();
    ctx.translate(state.hitX, state.hitY);
    for (const sl of state.speedlines) {
      const lAlpha = sl.alpha * bgAlpha;
      ctx.strokeStyle = `rgba(0, 0, 0, ${lAlpha})`;
      ctx.lineWidth = sl.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const sx = Math.cos(sl.angle) * sl.dist;
      const sy = Math.sin(sl.angle) * sl.dist;
      const ex = Math.cos(sl.angle) * (sl.dist + sl.length);
      const ey = Math.sin(sl.angle) * (sl.dist + sl.length);
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
    ctx.restore();

    // Shockwave rings
    for (const sw of state.shockwaves) {
      if (sw.alpha <= 0.02) continue;
      ctx.strokeStyle = `rgba(0, 0, 0, ${sw.alpha * bgAlpha})`;
      ctx.lineWidth = sw.lineWidth;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Renders Slugger foreground particles (triangular shards and slow-mo exit particles).
 */
export function renderSluggerImpactForeground(ctx: CanvasRenderingContext2D): void {
  if (state.particles.length === 0) return;

  ctx.save();
  for (const p of state.particles) {
    if (p.alpha <= 0.02) continue;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.alpha;

    if (p.type === 'tri_shard') {
      // Crisp black triangular shard
      ctx.beginPath();
      ctx.moveTo(-p.size * 0.9, -p.size * 0.7);
      ctx.lineTo(p.size * 1.3, 0);
      ctx.lineTo(-p.size * 0.5, p.size * 0.8);
      ctx.closePath();
      ctx.fill();
    } else if (p.type === 'shard') {
      ctx.beginPath();
      ctx.moveTo(-p.size * 0.8, -p.size * 0.5);
      ctx.lineTo(p.size * 1.2, 0);
      ctx.lineTo(-p.size * 0.5, p.size * 0.8);
      ctx.closePath();
      ctx.fill();
    } else if (p.type === 'streak') {
      const len = p.length || p.size * 3;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = p.size * 0.7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-len * 0.5, 0);
      ctx.lineTo(len * 0.5, 0);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
  ctx.restore();
}
