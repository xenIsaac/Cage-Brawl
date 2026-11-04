import { FightingStyleModule, LightStageData } from './types';
import { CombatFighter } from '../types';

export const aikidoStyle: FightingStyleModule = {
  id: 'aikido',
  name: 'Aikido',
  isTesting: false,
  color: '#0284c7',
  secondaryColor: '#38bdf8',
  description: 'A non-aggressive, deflective martial art centered around open-hand Hanmi stances, reactive parry counter slams, and momentum-redirection over-head throws.',
  passiveName: 'Reactive Slam Window, Flat Slam Damage & Neuro-Disruption',
  passiveDesc: '[ The 15s Reactive Slam Window ]: Successfully Parrying opens a 0.5s reaction window. Press M1 within 0.5s to trigger Over-Head Counter Slam (6.0 HP Flat Slam Damage). 15.0s independent cooldown. [ Flat Slam Damage ]: Over-Head Slams deal dedicated Slam Damage 100% immune to height/genetics scaling (Passive: 6.0 HP, M2: 8.0 HP). [ Neuro-Disruption (Confusion) ]: Slams inflict 2.0s Confusion (visual blurs, camera sway, and clone duplicates). [ Super Armor Removal ]: Super Armor is completely removed from Aikido across all moves.',
  strikeName: 'Open-Palm Strikes & Active Parry Counter Slams',
  statModifiers: {
    speed: 1.00,
    reach: 1.00,
    power: 1.00,
    defense: 0.95,
    knockback: 0.80,
    healthMax: 0,
  },
  auraStyle: 'ring',
  lightAttackEffect: '4-Sequence Flow: S1 Irimi Open-Palm (4.0 HP), S2 Kote-Gaeshi Slap (4.0 HP; 0.30s Built-In Parry), S3 Left Straight Thrust (4.0 HP; Zero Spin-Out), S4 Irimi Glide-Palm (~15px Mini-Dash, 8.0 HP; High Pushback).',
  heavyAttackEffect: 'Active Parry Stance (0.70s active window): On intercept, flashes light blue with full I-frames, grabs & slams for 8.0 HP Flat Slam Damage and 2.0s Confusion (10.0s CD). On whiff, disables attacks & parry with -70% slow for 1.0s (7.0s CD).',

  lightAttack: {
    comboLength: 4,
    getStageData: (stage: number): LightStageData => {
      const damages = [4.0, 4.0, 4.0, 8.0];
      const chips = [0.8, 0.8, 0.8, 1.5];
      const punchType: 'left' | 'right' = (stage === 1 || stage === 2) ? 'left' : 'right';
      return {
        damage: damages[stage] !== undefined ? damages[stage] : 4.0,
        chipDamage: chips[stage] !== undefined ? chips[stage] : 0.8,
        windupSec: stage === 2 ? 0.105 : (0.12 + stage * 0.02),
        recoverySec: 0.16,
        knockback: stage === 3 ? 12.0 : 3.5,
        hitstunSec: stage === 3 ? 0.35 : 0.25,
        punchType,
        sfx: 'open_palm',
      };
    },
    postComboDelaySec: 0.25,
  },

  heavyAttack: {
    getWindupSec: () => 0.0,
    getCooldownSec: () => 10.0,
    baseDamage: 8.0,
    chipDamage: 0.0,
    knockback: 6.0,
    hasSuperArmor: false,
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

  passives: {},
};


