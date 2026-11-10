export const updateParticlePhysics = (state: any): void => {
    if (!state || !state.particles) return;
    // 4. Update visual particle objects
    state.particles.forEach(p => {
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      p.alpha = 1.0 - (p.life / p.maxLife);
    });
    // Remove dead particles & enforce safe 120 particle pool cap for zero-impact FPS optimization
    state.particles = state.particles.filter(p => p.life < p.maxLife);
    if (state.particles.length > 120) {
      state.particles = state.particles.slice(state.particles.length - 120);
    }
};
