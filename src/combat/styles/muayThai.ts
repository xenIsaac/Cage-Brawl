import { FightingStyleModule, LightStageData } from './types';
import { CombatFighter } from '../types';

export const muayThaiStyle: FightingStyleModule = {
  id: 'muay_thai',
  name: 'Muay Thai',
  isTesting: false,
  color: '#1d4ed8',
  secondaryColor: '#dc2626',
  description: 'The "Art of Eight Limbs," a devastating close-quarters combat style utilizing elbows, knees, and shins.',
  passiveName: 'Aggressive Attrition, Iron Guard & Breach Pressure',
  passiveDesc: '[ Aggressive Attrition ]: Deals double base chip damage across light sequence strikes. [ Iron Guard ]: 5% damage reduction & +0.2s Perfect Parry window. [ Breach Pressure ]: 0.1s Heavy windup against blocking opponents.',
  strikeName: 'Elbow, Knee & Shin Kick',
  statModifiers: {
    speed: 1.15,
    reach: 0.75,
    power: 1.10,
    defense: 1.00,
    knockback: 0.80,
    healthMax: 0,
  },
  auraStyle: 'none',
  lightAttackEffect: 'Devastating 4-Combo Sequence with heavy rhythm. Double chip damage through guards (Aggressive Attrition).',
  heavyAttackEffect: 'Clinch Knee Strike (5.0s CD / 4.5s Whiff): Short-range CQC knee. 0.1s windup against blocking opponents (Breach Pressure). Inflicts massive chip damage.',

  lightAttack: {
    comboLength: 4,
    getStageData: (stage: number): LightStageData => {
      const damages = [4.5, 5.0, 6.0, 8.5];
      const punchType: 'left' | 'right' = stage % 2 === 0 ? 'left' : 'right';

      return {
        damage: damages[stage] || 4.5,
        chipDamage: 5.5, // Aggressive Attrition: Double chip damage
        windupSec: 0.11 + stage * 0.02,
        recoverySec: 0.15,
        knockback: stage === 3 ? 9.0 : 4.5,
        hitstunSec: stage === 3 ? 0.40 : 0.26,
        punchType,
        sfx: stage >= 2 ? 'kick' : 'elbow',
      };
    },
    postComboDelaySec: 0.15,
  },

  heavyAttack: {
    getWindupSec: (_fighter: CombatFighter, opp?: CombatFighter | null) => {
      // Breach Pressure: 0.1s windup against blocking opponents
      if (opp && opp.isBlocking) return 0.10;
      return 0.38;
    },
    getCooldownSec: (hit: boolean) => hit ? 5.0 : 4.5,
    baseDamage: 12.0,
    chipDamage: 8.5,
    knockback: 10.0,
  },

  dash: {
    getCooldownSec: () => 3.2,
    durationSec: 0.35,
    hasIFrames: true,
  },

  block: {
    type: 'standard',
    maxParryWindowSec: 0.35, // Iron Guard: +0.2s Perfect Parry window
  },

  passives: {
    modifyDamageTaken: (_defender: CombatFighter, _attacker: CombatFighter, baseDmg: number) => {
      return baseDmg * 0.95; // Iron Guard 5% damage reduction
    }
  }
};
