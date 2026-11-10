export const updateScreenAndGamemodePhysics = (
  state: any,
  matchData: any,
  settings: any,
  soundManager: any,
  spawnFloatingText: any,
  handleRoundWinner: any,
  setPotatoFuseLeft: any
): void => {
    // 1. Screenshake, shaky vision and vision blur decay
    if (state.shakeAmount > 0) {
      state.shakeAmount *= 0.9;
      if (state.shakeAmount < 0.1) state.shakeAmount = 0;
    }
    if (state.visionBlurTime > 0) {
      state.visionBlurTime--;
    }
    if (state.shakyVisionTimer > 0) {
      state.shakyVisionTimer--;
    }

    // Hot Potato Gamemode Fuse Countdown & Explosion Logic
    if (matchData?.gamemode === 'hot_potato' && state.rankedState === 'fighting') {
      state.potatoFuseTimer = (state.potatoFuseTimer !== undefined ? state.potatoFuseTimer : 1200) - 1;
      const fuseSeconds = Math.max(0, Math.ceil(state.potatoFuseTimer / 60));
      setPotatoFuseLeft(fuseSeconds);

      if (state.potatoFuseTimer <= 0) {
        state.potatoFuseTimer = 1200;
        const victim = state.potatoHolder === 'player' ? state.player : state.dummy;
        const winner = state.potatoHolder === 'player' ? 'opponent' : 'player';

        if (victim) {
          victim.health = 0;
          victim.isDead = true;

          // Huge explosion particle burst
          for (let i = 0; i < 35; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 8 + 3;
            state.particles.push({
              id: `potato_boom_${Math.random()}`,
              x: victim.x,
              y: victim.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              radius: Math.random() * 5 + 3,
              color: i % 2 === 0 ? '#ef4444' : '#f59e0b',
              alpha: 1.0,
              life: 0,
              maxLife: 45,
              type: 'spark'
            });
          }

          state.shakeAmount = 30 * settings.screenShake;
          soundManager.playKO();
          spawnFloatingText(victim.x, victim.y - 45, '💥 POTATO EXPLODED!', '#ef4444');
          handleRoundWinner(winner);
        }
      }
    }


};
