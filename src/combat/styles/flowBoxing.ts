import { FightingStyleModule, LightStageData } from './types';
import { CombatFighter } from '../types';

export const flowBoxingStyle: FightingStyleModule = {
  id: 'basic',
  name: 'Flow Boxing',
  isTesting: false,
  color: '#00e5ff',
  secondaryColor: '#cbd5e1',
  description: 'A high-speed, elusive out-boxing archetype centered around feints, swaying I-frames, pendulum footwork, and parry-baiting punishes.',
  passiveName: 'Pendulum Dash, Reflex Pivot & Feint Trap',
  passiveDesc: '[ Pendulum Dash ]: Replaces Evasive Dash. 0.8s forward momentum with 4 rhythmic lateral sways & full I-Frames (8.0s CD). Exiting grants +10% M1 Striker Buff. [ Reflex Pivot ]: Dodging an attack with Pendulum Dash compresses next M2 windup to 0.1s. [ Slip Recovery ]: Whiffing M1 S1 unlocks 0.4s I-Frames on S2. [ Feint Trap ]: M1 S3 Hook Feint (0 DMG) primes M1 S4 into 2x DMG (15.0 HP) unparryable + 5.0s Cripple if opponent parry-baited.',
  strikeName: 'Snapping Jab, Feint Trap & Shadow Step Strike',
  statModifiers: {
    speed: 1.15,
    reach: 1.0,
    power: 0.85,
    defense: 0.90,
    knockback: 0.90,
    healthMax: 0,
  },
  auraStyle: 'none',
  lightAttackEffect: '4-Combo Sequence: S1 Snapping Lead Jab (4.5 HP), S2 Right Hook (5.0 HP, 0.4s I-Frames if S1 whiffed), S3 Right Hook Feint (0.0 HP, parry bait trap), S4 Left Looping Hook (7.5 HP finisher, or 15.0 HP unparryable + 5.0s Cripple if S3 parry-baited).',
  heavyAttackEffect: 'Shadow Step Strike (14.0s Whiff / 9.0s Hit CD): 0.4s forward sway sprint with full I-Frames and locked direction into a Lead Jab that stuns the opponent for 0.3s (11.0 HP direct, 7.0 AP Chip, parriable). Windup reduced to 0.1s via Reflex Pivot.',

  lightAttack: {
    comboLength: 4,
    getStageData: (stage: number, fighter: CombatFighter): LightStageData => {
      let damage = 4.5;
      let punchType: 'left' | 'right' = 'left';
      let isIFrame = false;
      let unparryable = false;

      if (stage === 0) {
        damage = 4.5;
        punchType = 'left';
      } else if (stage === 1) {
        damage = 5.0;
        punchType = 'right';
        isIFrame = !!fighter.flowS2HasIFrames;
      } else if (stage === 2) {
        damage = 0.0;
        punchType = 'right';
      } else if (stage === 3) {
        punchType = 'left';
        if (fighter.flowS3ParryBaited) {
          damage = 15.0;
          unparryable = true;
        } else {
          damage = 7.5;
        }
      }

      return {
        damage,
        chipDamage: stage === 2 ? 0 : 2.5,
        windupSec: 0.12,
        recoverySec: 0.15,
        knockback: stage === 3 ? 9.5 : 4.0,
        hitstunSec: stage === 3 ? 0.45 : 0.28,
        punchType,
        isIFrame,
        unparryable,
        sfx: stage === 2 ? 'feint' : 'jab',
      };
    },
    postComboDelaySec: 0.25,
  },

  heavyAttack: {
    getWindupSec: (fighter: CombatFighter): number => {
      // Reflex pivot compresses windup to 0.1s (6 frames)
      if (fighter.hasReflexPivot) return 0.10;
      return 0.40;
    },
    getCooldownSec: (hit: boolean): number => {
      return hit ? 9.0 : 14.0;
    },
    baseDamage: 11.0,
    chipDamage: 7.0,
    knockback: 10.0,
    hasIFrames: (fighter: CombatFighter) => !!(fighter.heavyWindup && fighter.heavyWindup > 6),
    onExecute: (fighter: CombatFighter) => {
      fighter.hasReflexPivot = false;
      fighter.flowSprintSwayActive = true;
    },
    onHit: (attacker: CombatFighter, defender: CombatFighter) => {
      attacker.flowSprintSwayActive = false;
      defender.stunTime = Math.max(defender.stunTime || 0, 18); // 0.3s stun
    },
    onWhiff: (fighter: CombatFighter) => {
      fighter.flowSprintSwayActive = false;
    }
  },

  dash: {
    getCooldownSec: () => 8.0,
    durationSec: 0.8,
    hasIFrames: true,
    onDash: (fighter: CombatFighter) => {
      fighter.flowStrikerBuffTimer = 180; // 3s striker buff
    }
  },

  block: {
    type: 'standard',
    maxParryWindowSec: 0.15,
  },

  passives: {
    modifyDamageDealt: (attacker: CombatFighter, _defender: CombatFighter, baseDmg: number, isHeavy: boolean) => {
      if (!isHeavy && (attacker.flowStrikerBuffTimer || 0) > 0) {
        return baseDmg * 1.10; // +10% M1 Striker Buff
      }
      return baseDmg;
    },
    tick: (fighter: CombatFighter) => {
      if (fighter.flowStrikerBuffTimer && fighter.flowStrikerBuffTimer > 0) {
        fighter.flowStrikerBuffTimer--;
      }
    }
  }
};
