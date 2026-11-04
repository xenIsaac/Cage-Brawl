// ============================================================================
// COMBAT MODULE BRIDGE & CORE PHYSICS (src/combat/physics.ts)
// Section A & B: Modular Combat Engine & Plugin Architecture
// ============================================================================

export interface Vector2D {
  x: number;
  y: number;
}

export interface CircularHitbox {
  x: number;
  y: number;
  radius: number;
}

/**
 * Calculates distance between two 2D points
 */
export function distanceBetween(p1: Vector2D, p2: Vector2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Detects overlap between two circular bounding volumes
 */
export function testCircleCollision(c1: CircularHitbox, c2: CircularHitbox): boolean {
  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  const distanceSq = dx * dx + dy * dy;
  const radiusSum = c1.radius + c2.radius;
  return distanceSq <= radiusSum * radiusSum;
}

/**
 * Applies friction deceleration to velocity vector
 */
export function applyFriction(velocity: Vector2D, frictionCoeff: number, dt: number): Vector2D {
  const factor = Math.max(0, 1 - frictionCoeff * dt);
  return {
    x: velocity.x * factor,
    y: velocity.y * factor,
  };
}

/**
 * Clamps coordinates within arena boundaries
 */
export function clampToArena(
  pos: Vector2D,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): Vector2D {
  return {
    x: Math.max(minX, Math.min(maxX, pos.x)),
    y: Math.max(minY, Math.min(maxY, pos.y)),
  };
}
