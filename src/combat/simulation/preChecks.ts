import { resetFighterRoundState } from '../combatEngine';
import { updateImpactFrame } from '../impactFrame';

export const updatePhysicsPreChecks = (
  state: any,
  player: any,
  dummy: any,
  matchData?: any,
  dummyBehavior?: string
): boolean => {
    if ((matchData?.isCompetitive || matchData?.isAiMatch) && state.rankedState !== 'fighting') {
      if (player) {
        player.vx = 0;
        player.vy = 0;
        resetFighterRoundState(player);
      }
      if (dummy) {
        dummy.vx = 0;
        dummy.vy = 0;
        resetFighterRoundState(dummy);
      }
      state.shakeAmount = 0;
      state.visionBlurTime = 0;
      state.shakyVisionTimer = 0;
      return true;
    }

    if (state.infiniteStamina) {
      if (player) {
        player.strikeCooldown = 0;
        player.lightCooldown = 0;
        player.heavyCooldown = 0;
        player.dashCooldown = 0;
        player.capoeiraExhausted = false;
        player.capoeiraStacks = 3;
      }
      if (dummy) {
        dummy.strikeCooldown = 0;
        dummy.lightCooldown = 0;
        dummy.heavyCooldown = 0;
        dummy.dashCooldown = 0;
        dummy.capoeiraExhausted = false;
        dummy.capoeiraStacks = 3;
      }
    }

    if (dummy && dummyBehavior === 'test_ai') {
      dummy.health = dummy.maxHealth;
      dummy.isDead = false;
      dummy.vx = 0;
      dummy.vy = 0;
      dummy.targetX = dummy.x;
      dummy.targetY = dummy.y;
      dummy.isBlocking = false;
      dummy.isDashing = false;
      dummy.isSprinting = false;
      dummy.fists.forEach(f => {
        f.isPunching = false;
        f.punchProgress = 0;
        f.isHeavy = false;
        f.hasHit = false;
      });
    }

    // Slugger M2 Cataclysm Impact Frame & Slow-Motion sequence
    updateImpactFrame(state.gameTime);

    // 0. Hitstop frame freeze
    if (state.hitstopTime > 0) {
      state.hitstopTime--;
      return true;
    }

    return false;

};
