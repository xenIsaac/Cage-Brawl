import { CombatFighter } from './types';

export interface BlockArcConfig {
  /** Half of the total angular width of the block arc in radians */
  halfArc: number;
  /** Whether the block covers all 360 degrees (e.g. Kyokushin Full-Contact Conditioning) */
  isOmnidirectional: boolean;
  /** Visual arc radius multiplier relative to fighter radius */
  arcRadiusMultiplier: number;
  /** Visual forward offset multiplier along fighter facing axis relative to fighter radius */
  forwardOffsetMultiplier?: number;
  /** Start angle for rendering relative to fighter facing angle */
  arcStartAngle: number;
  /** End angle for rendering relative to fighter facing angle */
  arcEndAngle: number;
  /** Center angle offset of the block arc relative to fighter facing angle (default 0 = straight forward) */
  centerAngleOffset?: number;
  /** Name/description of the block stance arc */
  description: string;
}

/**
 * Returns the directional block configuration based on fighting style.
 * - Standard / Universal (Default): 86° (±0.75 rad) frontal yellow arc.
 * - Capoeira: 286° (±2.50 rad) near-circle wide arc (allows dodging from sides/flanks; rear blind spot).
 * - Kyokushin: 360° (full omnidirectional) Full-Contact Conditioning body bracing.
 * - Iron Boxing (Philly Shell): Right-side block shield (covering lead right flank & shoulder, not front).
 */
export function getBlockArcConfig(styleId?: string): BlockArcConfig {
  if (styleId === 'kyokushin') {
    return {
      halfArc: Math.PI,
      isOmnidirectional: true,
      arcRadiusMultiplier: 1.25,
      arcStartAngle: 0,
      arcEndAngle: Math.PI * 2,
      centerAngleOffset: 0,
      description: 'Full-Contact 360° Conditioning Bracing',
    };
  }

  if (styleId === 'capoeira') {
    return {
      halfArc: 2.50, // ~143° each side, 286° near-circle arc
      isOmnidirectional: false,
      arcRadiusMultiplier: 1.30,
      arcStartAngle: -2.50,
      arcEndAngle: 2.50,
      centerAngleOffset: 0,
      description: 'Acrobatic Ginga Wide Arc (Front + Sides)',
    };
  }

  if (styleId === 'keysi') {
    return {
      halfArc: 1.60, // ~92° each side, 184° Pensador shell covering front and lateral head strikes
      isOmnidirectional: false,
      arcRadiusMultiplier: 1.22,
      arcStartAngle: -1.60,
      arcEndAngle: 1.60,
      centerAngleOffset: 0,
      description: 'Pensador Triangular Wedge Arc',
    };
  }

  if (styleId === 'boxing_shell') {
    // Iron Boxing (Philly Shell): Block shield is on the right side (~49° / +0.85 rad), protecting the lead right shoulder/flank
    return {
      halfArc: 0.75, // ~86° width covering the right flank/shoulder
      isOmnidirectional: false,
      arcRadiusMultiplier: 1.25,
      arcStartAngle: 0.10,
      arcEndAngle: 1.60,
      centerAngleOffset: 0.85,
      description: 'Philly Shell Right-Shoulder Guard Arc',
    };
  }

  if (styleId === 'street_boxing') {
    // Street Boxing: Extended Poke Guard stance with straightened left shoulder & far slanted fists.
    // Project the block shield forward to cleanly cover and encapsulate the extended hands.
    return {
      halfArc: 0.78, // ~45° each side (~90° frontal defense cone)
      isOmnidirectional: false,
      arcRadiusMultiplier: 1.55,
      forwardOffsetMultiplier: 0.45,
      arcStartAngle: -0.78,
      arcEndAngle: 0.78,
      centerAngleOffset: 0,
      description: 'Extended Stiff-Arm Forward Block Shield',
    };
  }

  // Universal / Standard fighting styles (Basic, Slugger, Muay Thai, Ashihara, Shotokan, Kickboxing, Street Taekwondo, and future styles)
  return {
    halfArc: 0.75, // ~43° each side, 86° frontal defense cone
    isOmnidirectional: false,
    arcRadiusMultiplier: 1.25,
    arcStartAngle: -0.75,
    arcEndAngle: 0.75,
    centerAngleOffset: 0,
    description: 'Frontal Guard Arc',
  };
}

/**
 * Normalizes an angle into the [-PI, PI] range.
 */
export function normalizeAngle(angle: number): number {
  let a = angle;
  while (a < -Math.PI) a += Math.PI * 2;
  while (a > Math.PI) a -= Math.PI * 2;
  return a;
}

/**
 * Calculates if an attack coming from attacker coordinates lands inside the defender's block arc.
 * Supports a custom strikePos (the exact point of impact) for high precision, and has 
 * robust clinch-range bypass prevention when fighters are in close contact.
 */
export function isAttackWithinBlockArc(
  defender: { x: number; y: number; facingAngle: number; styleId?: string },
  attacker: { x: number; y: number; facingAngle?: number },
  strikePos?: { x: number; y: number }
): boolean {
  const config = getBlockArcConfig(defender.styleId);
  if (config.isOmnidirectional) {
    return true;
  }

  // 1. Resolve target contact point: Prefer the actual strike coordinate (foot/fist) if available
  const targetPos = strikePos || attacker;
  const dx = targetPos.x - defender.x;
  const dy = targetPos.y - defender.y;
  const dist = Math.hypot(dx, dy);

  // 2. Clinch / Overlap Close-Range Bypass Prevention:
  // If the strike or attacker body center is extremely close to the defender (within 55px),
  // they are in a clinch where coordinates can easily cross over.
  const centerOffset = config.centerAngleOffset || 0;
  const centerAngle = defender.facingAngle + centerOffset;

  if (dist < 55 && attacker.facingAngle !== undefined) {
    if (Math.abs(centerOffset) > 0.1) {
      // Offset guard (e.g. Philly Shell Right Guard): check if attack vector enters right flank
      const angleToAttacker = Math.atan2(dy, dx);
      const angleDiff = Math.abs(normalizeAngle(angleToAttacker - centerAngle));
      if (angleDiff <= config.halfArc) {
        return true;
      }
    } else {
      const faceAngleDiff = Math.abs(normalizeAngle(defender.facingAngle - attacker.facingAngle));
      // Math.PI represents perfectly opposite faces. We allow a comfortable ±1.4 radian window.
      const isFacingEachOther = Math.abs(faceAngleDiff - Math.PI) <= 1.4;
      if (isFacingEachOther) {
        return true;
      }
    }
  }

  // 3. Normal / Long-Range Blocking:
  // Calculate angle from defender to target position
  const angleToTarget = Math.atan2(dy, dx);
  const angleDiff = Math.abs(normalizeAngle(angleToTarget - centerAngle));

  return angleDiff <= config.halfArc;
}

export interface DirectionalBlockResult {
  /** True only if defender is holding block, not broken, and the attack lands inside the block arc */
  isBlocked: boolean;
  /** Whether the attack vector fell within the defender's frontal/active arc */
  isWithinArc: boolean;
  /** True if the defender was attempting to block, but got flanked / back-dashed outside the block arc */
  isFlankHit: boolean;
}

/**
 * Validates directional blocking for incoming strikes.
 * Returns whether the attack was successfully blocked or if the guard was bypassed from flank/rear.
 */
export function checkDirectionalBlock(
  defender: { x: number; y: number; facingAngle: number; isBlocking?: boolean; armorBreakTime?: number; styleId?: string },
  attacker: { x: number; y: number; facingAngle?: number },
  strikePos?: { x: number; y: number }
): DirectionalBlockResult {
  const isHoldingGuard = !!defender.isBlocking && (defender.armorBreakTime || 0) <= 0;
  if (!isHoldingGuard) {
    return {
      isBlocked: false,
      isWithinArc: false,
      isFlankHit: false,
    };
  }

  const isWithinArc = isAttackWithinBlockArc(defender, attacker, strikePos);
  return {
    isBlocked: isWithinArc,
    isWithinArc,
    isFlankHit: !isWithinArc, // Holding guard, but attacked outside the block arc (e.g. back-dashed/flanked)
  };
}

/**
 * Draws the visual block arc / shield barrier on canvas matching the mathematical hitbox.
 */
export function renderBlockArc(
  ctx: CanvasRenderingContext2D,
  fighter: CombatFighter
) {
  const config = getBlockArcConfig(fighter.styleId);
  ctx.save();

  const forwardOffset = fighter.radius * (config.forwardOffsetMultiplier || 0);
  if (forwardOffset !== 0) {
    ctx.translate(forwardOffset, 0);
  }

  const rStart = fighter.radius * config.arcRadiusMultiplier;

  if (config.isOmnidirectional) {
    // Kyokushin Full-Contact Conditioning: 360-degree protective barrier
    
    // 1. Soft concentric energy radial gradient fill
    const radGrad = ctx.createRadialGradient(
      0, 0, fighter.radius * 0.7, 
      0, 0, rStart
    );
    radGrad.addColorStop(0, 'rgba(234, 179, 8, 0.0)');
    radGrad.addColorStop(0.6, 'rgba(234, 179, 8, 0.04)');
    radGrad.addColorStop(1, 'rgba(234, 179, 8, 0.10)');
    
    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(0, 0, rStart, 0, Math.PI * 2);
    ctx.fill();

    // 2. Thick Glow Outer Stroke
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.22)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, rStart, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Sharp Core Stroke (high visibility)
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, rStart, 0, Math.PI * 2);
    ctx.stroke();

    // 4. Secondary subtle pulsing outer ring
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.14)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius * (config.arcRadiusMultiplier + 0.12), 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Standard Frontal Arc or Capoeira Wide Ginga Arc
    
    // 1. Soft radial energy wedge fill for intuitive defense feedback
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, rStart, config.arcStartAngle, config.arcEndAngle);
    ctx.closePath();
    
    const radGrad = ctx.createRadialGradient(
      0, 0, fighter.radius * 0.7, 
      0, 0, rStart
    );
    radGrad.addColorStop(0, 'rgba(234, 179, 8, 0.0)');
    radGrad.addColorStop(0.65, 'rgba(234, 179, 8, 0.03)');
    radGrad.addColorStop(1, 'rgba(234, 179, 8, 0.10)');
    
    ctx.fillStyle = radGrad;
    ctx.fill();

    // 2. Layered strokes for modern glowing energy bar effect
    // Layer A: Thick glow backing (fuzzy amber)
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.22)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, rStart, config.arcStartAngle, config.arcEndAngle);
    ctx.stroke();

    // Layer B: Sharp glowing golden-white core line (high contrast)
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.88)';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, rStart, config.arcStartAngle, config.arcEndAngle);
    ctx.stroke();

    // 3. Precision tactical notch boundary ticks (brackets showing actual block angle limits)
    const tickLen = 4;
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'butt';

    // Start angle notch line
    ctx.beginPath();
    ctx.moveTo(
      Math.cos(config.arcStartAngle) * (rStart - tickLen), 
      Math.sin(config.arcStartAngle) * (rStart - tickLen)
    );
    ctx.lineTo(
      Math.cos(config.arcStartAngle) * (rStart + tickLen), 
      Math.sin(config.arcStartAngle) * (rStart + tickLen)
    );
    ctx.stroke();

    // End angle notch line
    ctx.beginPath();
    ctx.moveTo(
      Math.cos(config.arcEndAngle) * (rStart - tickLen), 
      Math.sin(config.arcEndAngle) * (rStart - tickLen)
    );
    ctx.lineTo(
      Math.cos(config.arcEndAngle) * (rStart + tickLen), 
      Math.sin(config.arcEndAngle) * (rStart + tickLen)
    );
    ctx.stroke();
  }

  ctx.restore();
}
