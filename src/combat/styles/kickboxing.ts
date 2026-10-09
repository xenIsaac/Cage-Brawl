import { FightingStyleModule, LightStageData } from './types';
import { CombatFighter } from '../types';

export const kickboxingStyle: FightingStyleModule = {
  id: 'kickboxing',
  name: 'Kickboxing',
  isTesting: false,
  color: '#dc2626',
  secondaryColor: '#ffffff',
  description: 'An athletic, striking-focused martial art that trades footwork speed for extended kicking reach, heavy punches, and specialized armor-stripping mixups.',
  passiveName: 'Cadence Opening, Heavy Momentum & Chain Reaction',
  passiveDesc: '[ Cadence Opening ]: S1 & S2 jabs execute 10% faster. [ Heavy Momentum ]: S4 combo finisher deals +20% increased physical knockback distance. [ Chain Reaction ]: Landing full S1-S4 combo reduces next M2 Sequence 1 windup from 0.44s down to 0.25s.',
  strikeName: 'S1 Jab → S2 Jab → S3 Calf Kick → S4 Straight Punch',
  statModifiers: {
    speed: 0.90,
    reach: 1.15,
    power: 1.15,
    defense: 1.00,
    knockback: 1.10,
    healthMax: 0,
  },
  auraStyle: 'none',
  lightAttackEffect: '4-Sequence Combo (S1 Jab, S2 Jab, S3 Calf Kick, S4 Straight Punch). Cadence Opening boosts S1 & S2 jab speed by 10%. Heavy Momentum boosts S4 knockback by +20%. Chain Reaction lowers next M2 Seq 1 windup to 0.25s.',
  heavyAttackEffect: 'Dazing Hook to Teep (4.5s CD / 3.2s Whiff): Sequence 1 Short Hook (0.44s / 0.25s windup, 20% Armor Chip, unlocks Seq 2). Sequence 2 Front Kick / Teep (0.2s windup, 80% Armor Chip, breaks guard if <=80% HP, 1.8s Concussion). Whiffing S1 or S2 triggers 3.2s Lockout State.',

  lightAttack: {
    comboLength: 4,
    getStageData: (stage: number): LightStageData => {
      const damages = [4.0, 4.0, 6.0, 8.0];
      const punchType: 'left' | 'right' = stage % 2 === 0 ? 'left' : 'right';
      // Cadence Opening: S1 & S2 jabs 10% faster
      const windup = (stage === 0 || stage === 1) ? (0.12 * 0.9) : (0.14 + stage * 0.02);
      const kb = stage === 3 ? (10.0 * 1.20) : 5.0; // Heavy Momentum +20% kb on S4

      return {
        damage: damages[stage] || 4.0,
        chipDamage: 2.8,
        windupSec: windup,
        recoverySec: 0.18,
        knockback: kb,
        hitstunSec: stage === 3 ? 0.42 : 0.26,
        punchType,
        sfx: stage === 2 ? 'kick' : 'jab',
      };
    },
    onComboFinish: (fighter: CombatFighter) => {
      fighter.hasChainReaction = true;
    },
    postComboDelaySec: 0.20,
  },

  heavyAttack: {
    getWindupSec: (fighter: CombatFighter): number => {
      if (fighter.kickboxingIsSeq2) return 0.20;
      if (fighter.hasChainReaction) return 0.25;
      return 0.44;
    },
    getCooldownSec: (hit: boolean): number => {
      return hit ? 4.5 : 3.2;
    },
    baseDamage: 12.0,
    chipDamage: 8.0,
    knockback: 12.0,
    onExecute: (fighter: CombatFighter) => {
      fighter.hasChainReaction = false;
    },
    onHit: (attacker: CombatFighter, defender: CombatFighter) => {
      if (attacker.kickboxingIsSeq2) {
        defender.concussTime = 108; // 1.8s concussion
      }
    }
  },

  dash: {
    getCooldownSec: () => 3.2,
    durationSec: 0.35,
    hasIFrames: true,
  },

  block: {
    type: 'standard',
    maxParryWindowSec: 0.15,
  }
};
