import { FightingStyleModule, LightStageData } from './types';
import { CombatFighter } from '../types';

export const streetBoxingStyle: FightingStyleModule = {
  id: 'street_boxing',
  name: 'Street Boxing',
  isTesting: false,
  color: '#2E7D32',
  secondaryColor: '#1B5E20',
  description: 'Relentless inside-the-pocket pressure, suffocating reach disadvantages with blinding attack speed, stiff-arm measuring jabs, and unparryable flurries.',
  passiveName: 'In-Pocket Cling, M2 Posture Blitz, Unparryable Flurry & Snapping Counter',
  passiveDesc: '[ In-Pocket Cling ]: All M1 light attacks deal extremely low knockback (x0.40), keeping opponents trapped at point-blank range. [ M2 Posture Blitz ]: Successfully landing all 3 strikes of M2 reduces next Posture Cooldown to 0.1s. [ Unparryable Flurry ]: Landing M2 1st jab makes subsequent strikes CANNOT BE PARRIED. [ Snapping Counter ]: Executing a Parry boosts your next M1 execution speed by +80%.',
  strikeName: 'Pocket Flurry',
  statModifiers: {
    speed: 1.04,
    reach: 0.90,
    power: 0.75,
    defense: 0.90,
    knockback: 0.40,
    healthMax: 0,
  },
  auraStyle: 'none',
  lightAttackEffect: '4-Combo Sequence: S1 Lead Left Poke Jab (3.5 HP), S2 Rapid Left Jab (3.5 HP), S3 Rear Straight (4.5 HP), S4 Brawling Left Hook (6.0 HP). Square Glove rendering, ultra-low knockback.',
  heavyAttackEffect: 'Pocket Flurry (13.0s Hit CD / 8.0s Whiff CD): Right Jab (3.5 HP) -> Right Jab (3.5 HP) -> Left Hook (6.0 HP). Landing 1st jab makes follow-ups UNPARRYABLE. Landing all 3 triggers 0.1s Posture Blitz.',

  lightAttack: {
    comboLength: 4,
    getStageData: (stage: number, fighter: CombatFighter): LightStageData => {
      const damages = [3.5, 3.5, 4.5, 6.0];
      const punchType: 'left' | 'right' = (stage === 0 || stage === 1 || stage === 3) ? 'left' : 'right';
      let windup = 0.10 + stage * 0.02;
      if (fighter.snappingCounterReady) {
        windup *= 0.80;
      }

      return {
        damage: damages[stage] || 3.5,
        chipDamage: 2.0,
        windupSec: windup,
        recoverySec: 0.10,
        knockback: 2.5, // Ultra-low knockback (In-Pocket Cling)
        hitstunSec: 0.22,
        punchType,
        sfx: 'jab',
      };
    },
    onExecute: (fighter: CombatFighter) => {
      fighter.snappingCounterReady = false;
    },
    postComboDelaySec: 0.15,
  },

  heavyAttack: {
    getWindupSec: () => 0.35, // Grounded initiation
    getCooldownSec: (hit: boolean) => hit ? 13.0 : 8.0,
    baseDamage: 3.5,
    chipDamage: 2.0,
    knockback: 15.0, // Stage 3 Left Hook Finisher delivers high knockback (Stages 1 & 2 are sticky pocket jabs)
    onExecute: (fighter: CombatFighter) => {
      fighter.streetBoxingM2Stage = 1;
      fighter.streetBoxingM2Hits = 0;
      fighter.streetBoxingUnbreakable = false;
    },
    onHit: (attacker: CombatFighter) => {
      attacker.streetBoxingM2Hits = (attacker.streetBoxingM2Hits || 0) + 1;
      attacker.streetBoxingUnbreakable = true; // Subsequent strikes cannot be parried
      if (attacker.streetBoxingM2Hits >= 3) {
        attacker.postureOverdriveActive = true;
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
  },

  passives: {
    onParrySuccess: (defender: CombatFighter) => {
      defender.snappingCounterReady = true; // +80% execution speed on next M1
    }
  }
};
