import { FightingStyleModule, LightStageData } from './types';
import { CombatFighter } from '../types';

export const capoeiraStyle: FightingStyleModule = {
  id: 'capoeira',
  name: 'Capoeira',
  isTesting: false,
  color: '#ca8a04',
  secondaryColor: '#16a34a',
  description: 'A rhythmic, continuous flow of motion that replaces traditional defense with sweeping acrobatic dodges and heavy momentum-based kicks.',
  passiveName: 'Malícia Momentum & Flow Recovery',
  passiveDesc: '[ Malícia Momentum ]: Dash Cooldown is permanently reduced by 35%. [ Flow Recovery ]: Whiffing any attack guarantees your next landing strike to deal 20% increased damage. [ Rhythm Reset ]: stopping light attacks for 1.0s opens a 0.5s window before combo resets.',
  strikeName: 'Meia Lua, Martelo & Bênção',
  statModifiers: {
    speed: 0.85,
    reach: 1.20,
    power: 1.05,
    defense: 1.00,
    knockback: 1.25,
    healthMax: 0,
  },
  auraStyle: 'ring',
  lightAttackEffect: '4-Sequence Combo (Front Half Moon, Martelo, Queixada, Bênção). S1-S3 deal 8.0 base damage. S4 deals 10.0 base damage with heavy knockback. 1.0s stop opens a 0.5s combo reset window.',
  heavyAttackEffect: 'Meia Lua de Compasso (5.3s CD / 3.5s Whiff): Spinning wheel kick dealing 16.0 base damage.',

  lightAttack: {
    comboLength: 4,
    getStageData: (stage: number): LightStageData => {
      const damages = [8.0, 8.0, 8.0, 10.0];
      const punchType: 'left' | 'right' = stage % 2 === 0 ? 'left' : 'right';

      return {
        damage: damages[stage] || 8.0,
        chipDamage: 4.0,
        windupSec: 0.15 + stage * 0.02,
        recoverySec: 0.20,
        knockback: stage === 3 ? 15.0 : 6.0,
        hitstunSec: stage === 3 ? 0.45 : 0.28,
        punchType,
        isIFrame: stage === 2, // S3 Queixada grants I-Frames
        sfx: 'capoeira_kick',
      };
    },
    postComboDelaySec: 0.10,
  },

  heavyAttack: {
    getWindupSec: () => 0.44,
    getCooldownSec: (hit: boolean) => hit ? 5.3 : 3.5,
    baseDamage: 16.0,
    chipDamage: 9.5,
    knockback: 15.0,
    hasIFrames: true,
  },

  dash: {
    getCooldownSec: () => 3.2 * 0.65, // Malícia Momentum -35% dash CD
    durationSec: 0.40,
    hasIFrames: true,
  },

  block: {
    type: 'stacks',
    maxParryWindowSec: 0.15,
  },

  passives: {
    modifyDamageDealt: (attacker: CombatFighter, _defender: CombatFighter, baseDmg: number) => {
      if (attacker.capoeiraWhiffBonusActive) {
        return baseDmg * 1.20; // Flow Recovery +20%
      }
      return baseDmg;
    },
    onHitGiven: (attacker: CombatFighter) => {
      attacker.capoeiraWhiffBonusActive = false;
    }
  }
};
