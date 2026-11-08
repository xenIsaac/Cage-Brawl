import { describe, it, expect } from 'vitest';
import {
  PERFECT_PARRY_WINDOW_SEC,
  PERFECT_PARRY_FRAMES,
  HITSTUN_DURATION_SEC,
  HITSTUN_FRAMES,
  HIT_ATTACK_LOCKOUT_FRAMES,
  STEERING_LOCKOUT_FRAMES,
  HIT_MOVEMENT_LOCKOUT_FRAMES,
  BLOCK_COOLDOWN_FRAMES,
  POST_M1_BLOCK_LOCKOUT_FRAMES,
  POST_BLOCK_ATTACK_DELAY_FRAMES,
  POST_DASH_ATTACK_LOCKOUT_FRAMES,
  DASH_DELAYED_STOP_FRAMES,
  BASE_STEERING_TURN_RATE,
  BASE_MOVEMENT_SPEED,
  BASE_COMBO_RESET_FRAMES,
  TARGET_RULES,
} from '../src/combat/rules';

import {
  evaluateParry,
  getStyleParryBonusSec,
  getStyleParryBonusFrames,
  getStyleParryWindowSec,
  getStyleParryWindowFrames,
  canFighterParry,
} from '../src/combat/parry';

import { canFighterRaiseGuard } from '../src/combat/combatEngine';

import {
  MAX_POSTURE_REDUCTION,
  getStylePostureCooldown,
  calculateNetPostureCd,
  grantFighterPostureReduction,
  applyFighterPostureCooldown,
} from '../src/combat/posture/postureEngine';

describe('Phase 0.75: Universal Combat Rules Characterization', () => {
  describe('1. Perfect Parry Windows & Muay Thai Iron Guard', () => {
    it('should export Phase 5 universal parry parameters (0.12s / 7 frames)', () => {
      expect(PERFECT_PARRY_WINDOW_SEC).toBe(0.12);
      expect(PERFECT_PARRY_FRAMES).toBe(7);
    });

    it('should compute standard style parry window without bonus', () => {
      expect(getStyleParryBonusSec('basic')).toBe(0);
      expect(getStyleParryBonusFrames('basic')).toBe(0);
      expect(getStyleParryWindowSec('basic')).toBe(0.12);
      expect(getStyleParryWindowFrames('basic')).toBe(7);
    });

    it('should compute Muay Thai Iron Guard declared parry window bonus (+0.20s / +12 frames)', () => {
      expect(getStyleParryBonusSec('muay_thai')).toBe(0.20);
      expect(getStyleParryBonusFrames('muay_thai')).toBe(12);
      expect(getStyleParryWindowSec('muay_thai')).toBe(0.32);
      expect(getStyleParryWindowFrames('muay_thai')).toBe(19);
    });

    it('should evaluate standard parry success accurately in seconds and frames', () => {
      const defender: any = { isBlocking: true, styleId: 'basic', parryLockoutTimer: 0, armorBreakTime: 0 };
      const attacker: any = { styleId: 'basic' };

      // Within Phase 5 base 0.12s / 7f window
      expect(evaluateParry(defender, attacker, true, 0.08)).toBe(true);
      expect(evaluateParry(defender, attacker, true, 5, { isFrames: true })).toBe(true);

      // Outside Phase 5 base window
      expect(evaluateParry(defender, attacker, true, 0.18)).toBe(false);
      expect(evaluateParry(defender, attacker, true, 10, { isFrames: true })).toBe(false);
    });

    it('should evaluate Muay Thai Iron Guard parry window extension', () => {
      const defender: any = { isBlocking: true, styleId: 'muay_thai', parryLockoutTimer: 0, armorBreakTime: 0 };
      const attacker: any = { styleId: 'basic' };

      // Extended window: 0.25s / 15 frames (would fail standard, succeeds under Iron Guard 0.32s / 19f)
      expect(evaluateParry(defender, attacker, true, 0.25)).toBe(true);
      expect(evaluateParry(defender, attacker, true, 15, { isFrames: true })).toBe(true);

      // Beyond Iron Guard 0.32s / 19f window
      expect(evaluateParry(defender, attacker, true, 0.38)).toBe(false);
      expect(evaluateParry(defender, attacker, true, 22, { isFrames: true })).toBe(false);
    });

    it('should reject parry if defender is in parry lockout or armor broken', () => {
      const defenderLocked: any = { isBlocking: true, styleId: 'basic', parryLockoutTimer: 10, armorBreakTime: 0 };
      const defenderBroken: any = { isBlocking: true, styleId: 'basic', parryLockoutTimer: 0, armorBreakTime: 30 };
      const attacker: any = { styleId: 'basic' };

      expect(evaluateParry(defenderLocked, attacker, true, 0.10)).toBe(false);
      expect(evaluateParry(defenderBroken, attacker, true, 0.10)).toBe(false);
    });
  });

  describe('2. Hitstun and Post-Hit Lockouts', () => {
    it('should assert universal hitstun duration is 0.40s (24 frames)', () => {
      expect(HITSTUN_DURATION_SEC).toBe(0.40);
      expect(HITSTUN_FRAMES).toBe(24);
    });

    it('should assert universal attack, steering, and movement lockouts are 24 frames', () => {
      expect(HIT_ATTACK_LOCKOUT_FRAMES).toBe(24);
      expect(STEERING_LOCKOUT_FRAMES).toBe(24);
      expect(HIT_MOVEMENT_LOCKOUT_FRAMES).toBe(24);
    });
  });

  describe('3. Post-Parry & Post-Action Lockouts', () => {
    it('should assert post-M1 block lockout is 9 frames (0.15s)', () => {
      expect(POST_M1_BLOCK_LOCKOUT_FRAMES).toBe(9);
    });

    it('should assert post-block attack delay is 6 frames (0.10s)', () => {
      expect(POST_BLOCK_ATTACK_DELAY_FRAMES).toBe(6);
    });

    it('should assert post-dash attack lockout is 18 frames (0.30s)', () => {
      expect(POST_DASH_ATTACK_LOCKOUT_FRAMES).toBe(18);
    });

    it('should assert dash delayed stop frames is 6 frames (0.10s)', () => {
      expect(DASH_DELAYED_STOP_FRAMES).toBe(6);
    });
  });

  describe('4. Guard Raise & Block Spam Lockout', () => {
    it('should assert block cooldown is 6 frames (0.10s)', () => {
      expect(BLOCK_COOLDOWN_FRAMES).toBe(6);
    });

    it('should prevent guard raise if fighter is stunned, post-M1 locked, or in block lockout', () => {
      const readyFighter: any = { fists: [{ punchProgress: 0 }], styleId: 'basic' };
      const postM1LockedFighter: any = { fists: [{ punchProgress: 0 }], styleId: 'basic', postM1BlockLockout: 5 };
      const stunnedFighter: any = { fists: [{ punchProgress: 0 }], styleId: 'basic', stunTime: 12 };
      const blockLockedFighter: any = { fists: [{ punchProgress: 0 }], styleId: 'basic', blockLockout: 8 };

      expect(canFighterRaiseGuard(readyFighter)).toBe(true);
      expect(canFighterRaiseGuard(postM1LockedFighter)).toBe(false);
      expect(canFighterRaiseGuard(stunnedFighter)).toBe(false);
      expect(canFighterRaiseGuard(blockLockedFighter)).toBe(false);
    });
  });

  describe('5. Posture System & Reset Formula', () => {
    it('should cap posture reduction at 99.5% (0.995)', () => {
      expect(MAX_POSTURE_REDUCTION).toBe(0.995);
    });

    it('should retrieve style base posture cooldowns', () => {
      expect(getStylePostureCooldown('basic')).toBe(78);
      expect(getStylePostureCooldown('slugger')).toBe(100);
      expect(getStylePostureCooldown('shotokan')).toBe(72);
      expect(getStylePostureCooldown('kyokushin')).toBe(90);
    });

    it('should calculate net posture cooldown correctly using reduction formula', () => {
      // Net CD = Math.max(1, Math.round((base * (1.0 - clampedReduction)) / speedFactor))
      expect(calculateNetPostureCd(100, 1.0, 1.0, 0.0)).toBe(100);
      expect(calculateNetPostureCd(100, 1.0, 1.0, 0.5)).toBe(50);
      expect(calculateNetPostureCd(100, 1.0, 1.0, 1.0)).toBe(1); // Clamped to 0.995 => 0.5 => rounded to 1
    });

    it('should consume posture reduction when posture cooldown is applied', () => {
      const fighter: any = {
        styleId: 'basic',
        pendingPostureReduction: 0.30,
        postureReductionModifier: 0.30,
      };

      const appliedCd = applyFighterPostureCooldown(fighter);
      expect(appliedCd).toBe(55); // 78 * 0.70 = 54.6 => 55
      expect(fighter.pendingPostureReduction).toBe(0);
      expect(fighter.postureReductionModifier).toBe(0);
      expect(fighter.isPostureLocked).toBe(true);
    });
  });

  describe('6. Target Patch Notes Values Reference', () => {
    it('should define target v1.7.6 values in TARGET_RULES without affecting active constants', () => {
      expect(TARGET_RULES.PERFECT_PARRY_WINDOW_SEC).toBe(0.12);
      expect(TARGET_RULES.HITSTUN_M1_SEC).toBe(0.40);
      expect(TARGET_RULES.HITSTUN_M2_SEC).toBe(0.30);
      expect(TARGET_RULES.POST_PARRY_ATTACKER_LOCKOUT_SEC).toBe(0.12);
    });
  });
});
