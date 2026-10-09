import { FightingStyleModule, LightStageData } from './types';
import { CombatFighter } from '../types';

export const kyokushinStyle: FightingStyleModule = {
  id: 'kyokushin',
  name: 'Kyokushin Karate',
  isTesting: false,
  color: '#5A6268',
  secondaryColor: '#C0C0C0',
  description: 'Heavy full-contact brawler using degrading armor conditioning, kinetic absorption M2 counter-charges, and a rooted Fudo Dachi guard breach system.',
  passiveName: 'Full-Contact Conditioning & Kinetic Absorption',
  passiveDesc: 'Starts with 10% DR that degrades -1% per hit taken (restores after 10s out of combat). Attack execution is +25% faster, but recovery is -20% slower. Super M2 absorbs hits (+5% dmg each, 0.2s attacker micro-stun). Rooted Fudo Dachi guard breaches on 4 hits or 1 heavy with escalating vitality cost on blocked hits.',
  strikeName: 'Full-Contact Karate',
  statModifiers: {
    speed: 0.80,     // -20% slower movement and inter-combo cooldown recovery
    reach: 1.00,     // Standard reach
    power: 1.00,     // Normalized baseline damage
    defense: 1.00,   // Dynamic defense governed by conditioning & block
    knockback: 1.15, // Heavy physical impact momentum (+15%)
    healthMax: 0,    // +0 Max HP
  },
  auraStyle: 'none',
  lightAttackEffect: 'Full-Contact 4-hit combination (+25% faster windup, +15% knockback).',
  heavyAttackEffect: 'Kinetic Absorption Heavy Strike (0.55s windup with Super Armor & Micro-Stun counter-charge; 8.0s hit CD, 9.4s whiff CD).',

  lightAttack: {
    comboLength: 4,
    getStageData: (stage: number): LightStageData => {
      const punchType: 'left' | 'right' = stage % 2 === 0 ? 'left' : 'right';

      if (stage === 0) {
        // Sequence 1: Chudan Seiken Tsuki (Lead Punch) - 5.5 HP
        return {
          damage: 5.5,
          chipDamage: 1.1,
          windupSec: 0.09,     // 25% faster windup
          recoverySec: 0.25,   // 20% slower recovery
          knockback: 5.75,     // +15% knockback momentum
          hitstunSec: 0.25,
          punchType: 'left',
          sfx: 'karate_punch',
        };
      } else if (stage === 1) {
        // Sequence 2: Gedan Geri (Calf Kick) - 6.0 HP
        return {
          damage: 6.0,
          chipDamage: 1.2,
          windupSec: 0.09,
          recoverySec: 0.28,
          knockback: 6.25,
          hitstunSec: 0.28,
          punchType: 'right',
          sfx: 'karate_punch',
        };
      } else if (stage === 2) {
        // Sequence 3: Shotei Uchi (Open Palm) - 6.5 HP
        return {
          damage: 6.5,
          chipDamage: 1.3,
          windupSec: 0.09,
          recoverySec: 0.28,
          knockback: 6.75,
          hitstunSec: 0.30,
          punchType: 'left',
          sfx: 'karate_punch',
        };
      } else {
        // Sequence 4: Full-Charge Right Palm (Finisher) - 9.0 HP
        return {
          damage: 9.0,
          chipDamage: 1.8,
          windupSec: 0.12,   // 25% faster windup
          recoverySec: 0.35, // 20% slower recovery
          knockback: 8.50,   // Massive kinetic pushback (+15%)
          hitstunSec: 0.38,
          punchType: 'right',
          sfx: 'karate_heavy_punch',
        };
      }
    },
    postComboDelaySec: 0.30,
  },

  heavyAttack: {
    getWindupSec: () => 0.55, // 0.55-second M2 windup
    getCooldownSec: () => 8.0, // 8.0s on hit, 9.4s on whiff
    baseDamage: 10.0,
    chipDamage: 3.0,
    knockback: 10.5, // Heavy Palm Impact & High Kinetic Pushback
    hasSuperArmor: (fighter: CombatFighter) => {
      return (fighter.heavyWindup || 0) > 0;
    },
    onExecute: (fighter: CombatFighter) => {
      fighter.kyokushinM2AbsorbedHits = 0;
    },
  },

  dash: {
    getCooldownSec: () => 3.5,
    durationSec: 0.35,
    hasIFrames: true,
  },

  block: {
    type: 'rooted', // 100% Rooted movement speed while blocking
    maxParryWindowSec: 0.15,
  },

  passives: {
    modifyDamageDealt: (attacker: CombatFighter, defender: CombatFighter, baseDmg: number, isHeavy: boolean): number => {
      let dmg = baseDmg;

      // Bone-Crushing Attrition: +5% Overall Damage for 1.0s after exiting block
      if (attacker.kyokushinBlockStoredPowerTimer && attacker.kyokushinBlockStoredPowerTimer > 0) {
        dmg *= 1.05;
      }

      // Super M2 Kinetic Absorption: +5% damage per hit absorbed during M2 windup
      if (isHeavy && attacker.kyokushinM2AbsorbedHits && attacker.kyokushinM2AbsorbedHits > 0) {
        dmg *= (1 + 0.05 * attacker.kyokushinM2AbsorbedHits);
      }

      return dmg;
    },

    modifyDamageTaken: (defender: CombatFighter, attacker: CombatFighter, baseDmg: number): number => {
      // Full-Contact Conditioning (Degrading Armor): Starts at 10% DR, degrades -1% per hit taken down to 0%
      const dr = defender.kyokushinConditioningDR !== undefined ? defender.kyokushinConditioningDR : 0.10;
      return baseDmg * (1.0 - dr);
    },

    onHitGiven: (attacker: CombatFighter): void => {
      // Resets out-of-combat timer
      attacker.kyokushinOutOfCombatTimer = 0;
    },

    onHitReceived: (defender: CombatFighter): void => {
      // Full-Contact Conditioning: Taking damage degrades reduction by 1% per hit taken (down to 0%)
      const currentDR = defender.kyokushinConditioningDR !== undefined ? defender.kyokushinConditioningDR : 0.10;
      defender.kyokushinConditioningDR = Math.max(0, currentDR - 0.01);
      defender.kyokushinOutOfCombatTimer = 0;
    },

    tick: (fighter: CombatFighter): void => {
      // 1. Out-of-Combat Regeneration: 10.0 continuous seconds (600 frames at 60fps) restores DR back to 10%
      fighter.kyokushinOutOfCombatTimer = (fighter.kyokushinOutOfCombatTimer || 0) + 1;
      if (fighter.kyokushinOutOfCombatTimer >= 600) {
        fighter.kyokushinConditioningDR = 0.10;
      }

      // 2. Bone-Crushing Attrition buff timer tick (1.0s = 60 frames after leaving block)
      if (fighter.kyokushinBlockStoredPowerTimer && fighter.kyokushinBlockStoredPowerTimer > 0) {
        fighter.kyokushinBlockStoredPowerTimer--;
      }

      // 3. Fudo Dachi continuous block timer & leaving block stored power trigger
      if (fighter.isBlocking) {
        fighter.kyokushinBlockTime = (fighter.kyokushinBlockTime || 0) + 1;
        fighter.wasBlocking = true;
      } else if (fighter.wasBlocking) {
        fighter.wasBlocking = false;
        fighter.kyokushinBlockTime = 0;
        // Exiting block grants +50% Increased Chip Damage and +5% Overall Damage for 1.0s if hits were absorbed
        if (fighter.kyokushinBlockStoredPowerActive) {
          fighter.kyokushinBlockStoredPowerTimer = 60; // 1.0s duration
          fighter.kyokushinBlockStoredPowerActive = false;
        }
      }
    },
  },
};

