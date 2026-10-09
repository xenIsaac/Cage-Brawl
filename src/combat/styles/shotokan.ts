import { FightingStyleModule, LightStageData } from './types';
import { CombatFighter } from '../types';

export const shotokanStyle: FightingStyleModule = {
  id: 'shotokan',
  name: 'Shotokan Karate',
  isTesting: false,
  color: '#ffffff',
  secondaryColor: '#f1f5f9',
  description: 'A disciplined traditional martial art utilizing deep Zenkutsu-Dachi stances, explosive linear blitzes, and devastating kicks.',
  passiveName: 'In-Fighting Precision, Kinetic Impact & Ichi-Geki Acceleration',
  passiveDesc: '[ In-Fighting Precision ]: +10% damage at close proximity. [ Kinetic Impact ]: +10% knockback on all strikes. [ Ichi-Geki Acceleration ]: All attack animations initiate 10% faster.',
  strikeName: 'Empi-Uchi, Ren-Zuki & Mae-Geri',
  statModifiers: {
    speed: 1.10,
    reach: 1.10,
    power: 1.00,
    defense: 1.00,
    knockback: 1.10,
    healthMax: 0,
  },
  auraStyle: 'none',
  lightAttackEffect: '4-Sequence Combo (Elbow, Double Punch Burst, Front Snap Kick). Fast 10% acceleration with high pushback.',
  heavyAttackEffect: 'Back Kick (9.5s Hit / 12.0s Whiff): Explosive spinning back kick with I-Frame blitz dash, heavy knockback, screen shake & camera blur.',

  lightAttack: {
    comboLength: 4,
    getStageData: (stage: number): LightStageData => {
      const damages = [4.5, 5.0, 6.0, 8.0];
      const punchType: 'left' | 'right' = stage % 2 === 0 ? 'left' : 'right';
      // Ichi-Geki Acceleration: 10% faster initiation
      const windup = (0.11 + stage * 0.02) * 0.90;

      return {
        damage: damages[stage] || 4.5,
        chipDamage: 3.0,
        windupSec: windup,
        recoverySec: 0.16,
        knockback: (stage === 3 ? 10.0 : 5.0) * 1.10, // Kinetic Impact +10% kb
        hitstunSec: stage === 3 ? 0.40 : 0.25,
        punchType,
        sfx: stage === 2 ? 'kick' : 'karate_punch',
      };
    },
    postComboDelaySec: 0.66,
  },

  heavyAttack: {
    getWindupSec: () => 0.40 * 0.90, // Ichi-Geki 10% faster
    getCooldownSec: (hit: boolean) => hit ? 9.5 : 12.0,
    baseDamage: 13.0,
    chipDamage: 7.5,
    knockback: 14.0 * 1.10,
    hasIFrames: true,
  },

  dash: {
    getCooldownSec: () => 3.2,
    durationSec: 0.35,
    hasIFrames: true,
  },

  block: {
    type: 'standard',
    maxParryWindowSec: 0.15,
  },

  passives: {
    modifyDamageDealt: (attacker: CombatFighter, defender: CombatFighter, baseDmg: number) => {
      const dist = Math.hypot(defender.x - attacker.x, defender.y - attacker.y);
      if (dist <= attacker.radius + defender.radius + 30) {
        return baseDmg * 1.10; // In-Fighting Precision +10% at close range
      }
      return baseDmg;
    }
  }
};
