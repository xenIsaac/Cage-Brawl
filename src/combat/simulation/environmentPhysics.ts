// Environment and Particles Physics Simulation module (src/combat/simulation/environmentPhysics.ts)

export interface EnvironmentPhysicsState {
  shakeAmount: number;
  visionBlurTime: number;
  shakyVisionTimer: number;
  particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;
  }>;
}

export function updateEnvironmentPhysics(state: EnvironmentPhysicsState, dt: number): void {
  // Decay screen shake
  if (state.shakeAmount > 0) {
    state.shakeAmount = Math.max(0, state.shakeAmount - dt * 15);
  }

  // Decay vision effects
  if (state.visionBlurTime > 0) {
    state.visionBlurTime = Math.max(0, state.visionBlurTime - dt);
  }
  if (state.shakyVisionTimer > 0) {
    state.shakyVisionTimer = Math.max(0, state.shakyVisionTimer - dt);
  }

  // Update particle positions and lifetimes
  if (state.particles && state.particles.length > 0) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.life -= dt;
      if (p.life <= 0) {
        state.particles.splice(i, 1);
      }
    }
  }
}
