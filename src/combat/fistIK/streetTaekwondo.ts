import { FistIKContext } from './types';

export function getStreetTaekwondoFistPos(ctx: FistIKContext): { fistX: number; fistY: number } {
  const { fighter, fist, idleTime, isBlockingActive, isLeft, leftProgress } = ctx;

  // Loose Urban Bounce: hands held loose and low on the body profile
  const bounceTime = idleTime * 5.5;
  const bounceY = Math.sin(bounceTime) * 1.8;
  const bounceX = Math.cos(bounceTime * 0.5) * 1.2;

  const leftBaseX = fighter.radius * 0.48 + bounceX;
  const leftBaseY = -fighter.radius * 0.42 + bounceY;
  const rightBaseX = fighter.radius * 0.26 - bounceX * 0.8;
  const rightBaseY = fighter.radius * 0.38 - bounceY * 0.8;

  // Parrying / Blocking guard
  if (isBlockingActive) {
    return {
      fistX: isLeft ? fighter.radius * 0.50 : fighter.radius * 0.42,
      fistY: isLeft ? -fighter.radius * 0.24 : fighter.radius * 0.20,
    };
  }

  // Pure Kicking Martial Art:
  // Base neutral loose urban bounce guard on the torso.
  // Left arm S4 counter-sway and right arm S1/S2 sway are handled via clean angular kinematics in renderFighter.
  return {
    fistX: isLeft ? leftBaseX : rightBaseX,
    fistY: isLeft ? leftBaseY : rightBaseY,
  };
}
