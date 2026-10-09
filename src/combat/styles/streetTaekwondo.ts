import { FightingStyleModule, LightStageData } from './types';
import { CombatFighter } from '../types';

export const streetTaekwondoStyle: FightingStyleModule = {
  id: 'street_taekwondo',
  name: 'Street Taekwondo',
  isTesting: true,
  color: '#ea580c',
  secondaryColor: '#f97316',
  description: 'Undergoing Rework: All old mechanics removed. Preparing for complete overhaul.',
  passiveName: 'Undergoing Rework',
  passiveDesc: 'This style is currently undergoing a complete rework.',
  strikeName: 'Taekwondo Strikes',
  statModifiers: {
    speed: 1.0,
    reach: 1.0,
    power: 1.0,
    defense: 1.0,
    knockback: 1.0,
    healthMax: 0,
  },
  auraStyle: 'none',
  lightAttackEffect: 'Undergoing rework.',
  heavyAttackEffect: 'Undergoing rework.',

  lightAttack: {
    comboLength: 4,
    getStageData: (stage: number): LightStageData => {
      const damages = [4.0, 4.0, 4.5, 6.5];
      const punchType: 'left' | 'right' = stage % 2 === 0 ? 'left' : 'right';

      return {
        damage: damages[stage] || 4.0,
        chipDamage: 1.5,
        windupSec: 0.14 + stage * 0.02,
        recoverySec: 0.18,
        knockback: stage === 3 ? 6.0 : 3.5,
        hitstunSec: stage === 3 ? 0.35 : 0.22,
        punchType,
        isIFrame: false,
        sfx: 'kick',
      };
    },
    postComboDelaySec: 0.30,
  },

  heavyAttack: {
    getWindupSec: () => 0.45,
    getCooldownSec: (hit: boolean) => hit ? 4.5 : 5.0,
    baseDamage: 10.0,
    chipDamage: 4.0,
    knockback: 8.0,
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
};

