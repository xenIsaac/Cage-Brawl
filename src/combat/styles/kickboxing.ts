import { FightingStyleModule, LightStageData } from './types';
import { CombatFighter } from '../types';

export const kickboxingStyle: FightingStyleModule = {
  id: 'kickboxing',
  name: 'Kickboxing',
  isTesting: false,
  color: '#dc2626',
  secondaryColor: '#ffffff',
  description: 'An aggressive, striking-focused martial art combining explosive punch-kick combinations, rapid cadence acceleration, and dynamic heavy cooldown loops.',
  passiveName: 'Cadence Opening & Chain Reaction',
  passiveDesc: '[ Base Stats ]: Damage: 1.05x | Attack Execution: 0.95x | Attack Speed: 1.10x. [ Cadence Opening ]: Landing both M2 strikes grants +15% Attack Execution and +20% Attack Speed. [ Chain Reaction ]: Every landed hit reduces M2 cooldown by 0.2s. [ Dynamic M2 Cooldowns ]: S1 Hit/S2 Whiff: 4s | S2 Hit/S1 Whiff: 5s | Both Hit: 6s | Both Whiff: 8s.',
  strikeName: 'S1 Jab → S2 Jab → S3 Calf Kick → S4 Straight Punch',
  statModifiers: {
    speed: 1.10, // Attack Speed: 1.10x
    reach: 1.04,
    power: 1.05, // Damage: 1.05x
    defense: 1.00,
    knockback: 1.05,
    executionSpeed: 0.95, // Attack Execution: 0.95x
    healthMax: 0,
  },
  auraStyle: 'none',
  lightAttackEffect: '4-Sequence Combo (S1 Jab, S2 Jab, S3 Calf Kick, S4 Straight Punch). Landing any hit reduces M2 cooldown by 0.2s via Chain Reaction.',
  heavyAttackEffect: 'Dazing Hook to Teep (Dynamic CD: 4s / 5s / 6s / 8s): Sequence 1 Short Hook (20% Armor Chip) combos into Sequence 2 Teep Kick (80% Armor Chip, 1.8s Concussion). Landing both strikes activates Cadence Opening (+15% Attack Execution & +20% Attack Speed). Every landed hit reduces M2 CD by 0.2s via Chain Reaction.',

  lightAttack: {
    comboLength: 4,
    getStageData: (stage: number, fighter?: CombatFighter): LightStageData => {
      const damages = [4.5, 4.5, 6.0, 8.5];
      const punchType: 'left' | 'right' = stage % 2 === 0 ? 'left' : 'right';
      const isCadenceActive = fighter?.kickboxingCadenceTimer && fighter.kickboxingCadenceTimer > 0;
      const execMultiplier = isCadenceActive ? (0.95 * 1.15) : 0.95;
      const baseWindup = (stage === 0 || stage === 1) ? 0.12 : (0.14 + stage * 0.02);
      const windup = baseWindup / execMultiplier;
      const kb = stage === 3 ? 10.0 : 5.0;

      return {
        damage: damages[stage] || 4.5,
        chipDamage: 2.5,
        windupSec: windup,
        recoverySec: isCadenceActive ? 0.14 : 0.17,
        knockback: kb,
        hitstunSec: stage === 3 ? 0.42 : 0.26,
        punchType,
        sfx: stage === 2 ? 'kick' : 'jab',
      };
    },
    onComboFinish: () => {},
    postComboDelaySec: 0.18,
  },

  heavyAttack: {
    getWindupSec: (fighter: CombatFighter): number => {
      const isCadenceActive = fighter.kickboxingCadenceTimer && fighter.kickboxingCadenceTimer > 0;
      const execMultiplier = isCadenceActive ? (0.95 * 1.15) : 0.95;
      if (fighter.kickboxingIsSeq2) return 0.20 / execMultiplier;
      return 0.40 / execMultiplier;
    },
    getCooldownSec: (hit: boolean, fighter?: CombatFighter): number => {
      const s1 = !!fighter?.kickboxingS1Hit;
      const s2 = !!fighter?.kickboxingS2Hit;
      if (s1 && s2) return 6.0;
      if (s1 && !s2) return 4.0;
      if (!s1 && s2) return 5.0;
      return 8.0;
    },
    baseDamage: 14.0,
    chipDamage: 14.4,
    knockback: 18.0,
    onExecute: () => {},
    onHit: (attacker: CombatFighter, defender: CombatFighter) => {
      if (attacker.kickboxingIsSeq2) {
        defender.concussTime = 108; // 1.8s concussion
      }
    }
  },

  dash: {
    getCooldownSec: () => 3.0,
    durationSec: 0.32,
    hasIFrames: true,
  },

  block: {
    type: 'standard',
    maxParryWindowSec: 0.15,
  }
};
