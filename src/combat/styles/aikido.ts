import { FightingStyleModule, LightStageData } from './types';
import { CombatFighter } from '../types';

export const aikidoStyle: FightingStyleModule = {
  id: 'aikido',
  name: 'Aikido',
  isTesting: false, // Fully active and rollable in style gacha
  color: '#0284c7',
  secondaryColor: '#38bdf8',
  description: 'A non-aggressive, deflective martial art centered around open-hand Hanmi stances, Kinetic Intercept clash slams, Tenkan Aiki Flow M2 stance triggers, and momentum-redirection over-head slams.',
  passiveName: 'Tenchi Counter, Kinetic Intercept, Tenkan Flow & Resonant Vortex',
  passiveDesc: '[ Tenchi Parry Counter ]: Parrying grants a 0.20s window to press M1 and execute a 10 DMG Over-Head Slam. [ Kinetic Intercept ]: M1 strike clashes (excl. S3) have a 30% Chance to trigger a 10 DMG Slam. [ Tenkan Aiki Flow ]: Landing M1 S3 grants a Free M2 Stance Boost (15s separate CD, reduced by 2s per M1 hit). [ Aiki Redirection Stance ]: M2 grants +15% Damage Resistance & 2-Hit Super Armor, enhancing S4 into full 22 DMG Guard Break Slam. [ Over-Head Slam Control ]: 0.45s spin-out, 1.0s shaky vision & 1.0s Super Cripple. [ Resonant Vortex ]: Attacking spinning targets doubles spin duration to 0.6s. [ Centrifugal Ejection ]: Landing M1 S4 on spinning targets deals 2x Knockback.',
  strikeName: 'Open-Palm Strikes & Momentum Slams',
  statModifiers: {
    speed: 1.00,
    reach: 1.00,
    power: 1.00,
    defense: 0.95, // Base defense multiplier x0.95
    knockback: 0.80, // x0.80 reduced knockback to keep targets trapped in grapple range
    healthMax: 0,
  },
  auraStyle: 'ring',
  lightAttackEffect: '4-Sequence Flow: S1 Irimi Open-Palm (4.0 HP), S2 Kote-Gaeshi Slap (4.0 HP; Wrist Trap), S3 Tenkan Arm-Cross Sweep (0.0 HP; 0.3s Spin-Out), S4 Shomenuchi Flaring Palm Drive (8.0 HP; 2x Knockback vs Spinning targets).',
  heavyAttackEffect: 'Aiki Redirection Stance (5.0s duration): +15% Damage Resistance, 2-hit Super Armor, 40% clash parry chance, and converts S4 into 22 Base DMG Guard-Breaking Over-Head Slam (0.45s spin-out, 1s shaky vision, 1s Super Cripple). 13s CD on hit / 9s on whiff.',

  lightAttack: {
    comboLength: 4,
    getStageData: (stage: number): LightStageData => {
      const damages = [4.0, 4.0, 0.0, 8.0];
      const chips = [0.8, 0.8, 0.0, 1.5];
      const punchType: 'left' | 'right' = stage === 1 ? 'left' : 'right';
      return {
        damage: damages[stage] !== undefined ? damages[stage] : 4.0,
        chipDamage: chips[stage] !== undefined ? chips[stage] : 0.8,
        windupSec: 0.12 + stage * 0.02,
        recoverySec: 0.16,
        knockback: stage === 3 ? 6.0 : (stage === 2 ? 0.0 : 3.5 + stage * 0.2),
        hitstunSec: stage === 3 ? 0.35 : (stage === 2 ? 0.30 : 0.25),
        punchType,
        sfx: 'open_palm',
      };
    },
    postComboDelaySec: 0.25,
  },

  heavyAttack: {
    getWindupSec: () => 0.15,
    getCooldownSec: () => 13.0,
    baseDamage: 22.0,
    chipDamage: 4.0,
    knockback: 6.0,
    hasSuperArmor: true,
  },

  dash: {
    getCooldownSec: () => 3.0,
    durationSec: 0.35,
    hasIFrames: true,
  },

  block: {
    type: 'standard',
    maxParryWindowSec: 0.15,
  },

  passives: {
    modifyDamageTaken: (defender: CombatFighter, _attacker: CombatFighter, baseDmg: number) => {
      // While M2 Aiki Redirection Stance is active, +15% Damage Resistance (takes 0.85x damage)
      if (defender.aikiM2StanceTimer && defender.aikiM2StanceTimer > 0) {
        return baseDmg * 0.85;
      }
      return baseDmg;
    }
  },
};


