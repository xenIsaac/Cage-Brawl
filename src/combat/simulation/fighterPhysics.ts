// Unified Fighter Physics & State Simulation module (src/combat/simulation/fighterPhysics.ts)

import { updateFighterStaminaAndTimers } from '../staminaEngine';

export interface FighterPhysicsContext {
  dt: number;
  arenaSize: number;
  infiniteStamina?: boolean;
}

export function updateFighterPhysics(
  self: any,
  opponent: any,
  context: FighterPhysicsContext
): void {
  if (!self) return;

  const { dt, arenaSize, infiniteStamina } = context;

  // 1. Stamina & Timer updates
  const hasMoveInput = Math.abs(self.vx || 0) > 0.1 || Math.abs(self.vy || 0) > 0.1;
  const isSprintInputHeld = !!self.isSprinting;
  updateFighterStaminaAndTimers(self, hasMoveInput, isSprintInputHeld, !!infiniteStamina);

  if (infiniteStamina) {
    self.strikeCooldown = 0;
    self.lightCooldown = 0;
    self.heavyCooldown = 0;
    self.dashCooldown = 0;
    self.capoeiraExhausted = false;
  }

  // 2. Velocity & position integration
  self.x += self.vx * dt * 60;
  self.y += self.vy * dt * 60;

  // Apply ground/friction drag
  const drag = self.isDashing ? 0.92 : 0.85;
  self.vx *= drag;
  self.vy *= drag;

  if (Math.abs(self.vx) < 0.01) self.vx = 0;
  if (Math.abs(self.vy) < 0.01) self.vy = 0;

  // 3. Stun / lockout timer decay
  if (self.stunTime > 0) {
    self.stunTime = Math.max(0, self.stunTime - dt);
  }
  if (self.armorBreakTime > 0) {
    self.armorBreakTime = Math.max(0, self.armorBreakTime - dt);
  }
  if (self.blockLockout > 0) {
    self.blockLockout = Math.max(0, self.blockLockout - dt);
  }

  // 4. Style-specific timer decays (Capoeira, Ashihara, Muay Thai)
  if (self.capoeiraS3IFrameTimer > 0) {
    self.capoeiraS3IFrameTimer = Math.max(0, self.capoeiraS3IFrameTimer - dt);
  }
  if (self.ashiharaRecoveryTimer > 0) {
    self.ashiharaRecoveryTimer = Math.max(0, self.ashiharaRecoveryTimer - dt);
  }

  // 5. Arena boundary clamping
  const margin = self.radius || 26;
  self.x = Math.max(margin, Math.min(arenaSize - margin, self.x));
  self.y = Math.max(margin, Math.min(arenaSize - margin, self.y));
}
