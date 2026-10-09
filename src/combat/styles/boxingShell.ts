import { FightingStyleModule, LightStageData } from './types';
import { CombatFighter } from '../types';

export const boxingShellStyle: FightingStyleModule = {
  id: 'boxing_shell',
  name: 'Iron Boxing',
  isTesting: false,
  color: '#9333ea',
  secondaryColor: '#c0c0c0',
  description: 'A rhythmically swaying, evasive counter-punching stance. Trades raw power for lightning execution, shoulder deflection mechanics, and rhythmic body weaving.',
  passiveName: 'Right-Flank Philly Shell Shield, Snapping Lead Execution & Shoulder Roll',
  passiveDesc: '[ Right-Flank Philly Shell Shield ]: Active Block Shield is anchored to the lead right flank and shoulder instead of the front. [ Snapping Lead Execution ]: S1 & S2 jabs have +50% execution speed. [ Instant Guard-Drop M2 ]: Zero post-block lockout when rolling into Shoulder Roll. [ Shoulder Roll Acceleration ]: Landing M2 speeds up Posture recovery.',
  strikeName: 'Iron Jabs, Straights, Hooks & Shoulder Roll',
  statModifiers: {
    speed: 1.15,
    reach: 1.00,
    power: 0.85,
    defense: 0.90,
    knockback: 0.80,
    healthMax: 0,
  },
  auraStyle: 'none',
  lightAttackEffect: '4-Combo Sequence Matrix: S1 Right Spring Lead Jab (4.5 HP, +50% Execution Speed), S2 Right Spring Follow-Up Straight (4.5 HP, +50% Execution Speed), S3 Left Upper-Jab (5.5 HP), S4 Left Iron Cross Straight (7.5 HP).',
  heavyAttackEffect: 'Shoulder Roll (6.0s CD on hit / 10.0s Whiff): Executes a 60° shoulder deflection roll with Super Armor. Deflects incoming strikes into a Deflective Parry.',

  lightAttack: {
    comboLength: 4,
    getStageData: (stage: number): LightStageData => {
      const damages = [4.5, 4.5, 5.5, 7.5];
      // S1 (0) & S2 (1): Right Hand Lead Jabs. S3 (2) & S4 (3): Left Hand Rear Punches.
      const punchType: 'left' | 'right' = (stage === 0 || stage === 1) ? 'right' : 'left';
      // Snapping Lead Execution: S1 & S2 jabs have +50% execution speed (half windup)
      const baseWindup = 0.12 + stage * 0.02;
      const windup = (stage === 0 || stage === 1) ? baseWindup * 0.50 : baseWindup;

      return {
        damage: damages[stage] || 4.5,
        chipDamage: 2.2,
        windupSec: windup,
        recoverySec: 0.12,
        knockback: stage === 3 ? 8.0 : 4.0,
        hitstunSec: stage === 3 ? 0.38 : 0.22,
        punchType,
        sfx: 'jab',
      };
    },
    postComboDelaySec: 0.15,
  },

  heavyAttack: {
    getWindupSec: () => 0.13, // 8 frames
    getCooldownSec: (hit: boolean) => hit ? 6.0 : 10.0,
    baseDamage: 0.0,
    chipDamage: 0.0,
    knockback: 2.0,
    hasSuperArmor: true, // Super Armor during roll
    onHit: (attacker: CombatFighter, defender: CombatFighter) => {
      defender.stunTime = Math.max(defender.stunTime || 0, 90); // 1.5s spin-out stun
      attacker.shellPostureBoostTimer = 180; // 3.0s posture recovery boost
    }
  },

  dash: {
    getCooldownSec: () => 3.2,
    durationSec: 0.35,
    hasIFrames: true,
  },

  block: {
    type: 'philly_shell',
    maxParryWindowSec: 0.15,
  }
};
