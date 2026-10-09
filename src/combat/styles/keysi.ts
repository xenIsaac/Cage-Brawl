import { FightingStyleModule, LightStageData } from './types';

/**
 * Keysi Fighting Style Module (CQC Clinch Trapper Rework)
 *
 * Archetype: CQC Clinch Trapper
 * Chamber Palette: Aggressive charcoal-black (#1A1A1A) with sharp crimson (#ef4444) and silver-grey (#94a3b8).
 * Stance Alignment (Pensador Wedge): Holds elbows pointing forward like twin shields over the head.
 *
 * Combat Attribute Modifiers:
 * - Speed: 1.10 (+10% execution and footwork speed)
 * - Reach: 0.40 (Extreme CQC penalty - must fight completely inside pocket)
 * - Knockback: 0.55 (Massive knockback reduction to keep targets glued)
 * - Power: 1.00 (Amplified on S3/S4)
 * - Defense: 1.00
 *
 * Passives:
 * 1. Brutal Escalation: S3 Elbow (7.2 HP) & S4 Knee (9.6 HP) deal +20% damage.
 * 2. Guard Cracker & Recovery: Deals +20% damage to Armor HP (AP). Parry-stun duration reduced by 0.1s.
 * 3. Intercepting Slip Dash: +50% dash travel distance, 8.0s cooldown. Halts on opponent intersection with boot-slide puff and primes M2.
 * 4. Primed Clinch Surge: Landing S4 or Dash collision turns next M2 into 0.1s windup + Super Armor.
 * 5. Trauma Stagger: M2 on-hit inflicts 4.0s Stagger (+60% windup, -30% speed, random chaotic drift).
 * 6. Over-Extended Vulnerability: M2 whiff inflicts 5.0s vulnerability (-60% speed, +30% dmg taken, no parry), followed by 7.0s whiff CD.
 */
export const keysiStyle: FightingStyleModule = {
  id: 'keysi',
  name: 'Keysi',
  isTesting: false, // Fully active and rollable
  color: '#1A1A1A',
  secondaryColor: '#ef4444',
  description: 'Suffocating inside pocket grappler that traps posture with the Pensador double-elbow wedge, crushing guards with headbutts and knee drives.',
  passiveName: 'Brutal Escalation & Trauma Clinch',
  passiveDesc: 'S3/S4 deal +20% damage. +20% armor damage. Parried stun -0.1s. +50% dash distance halting on targets & priming M2. M2 Clinch Headbutt inflicts 4s Stagger; whiff gives 5s vulnerability.',
  strikeName: 'Pensador Pocket Strike',
  statModifiers: {
    speed: 1.10,
    reach: 0.40,
    power: 1.00,
    defense: 1.00,
    knockback: 0.55,
    healthMax: 0,
  },
  auraStyle: 'none',
  lightAttackEffect: '4-combo chain: Lead Forearm Wedge (4.5), Rear Forearm Smash (4.5), Descending Elbow (7.2), Heavy Pocket Knee (9.6, primes M2).',
  heavyAttackEffect: 'Pensador Elbow Clinch to Headbutt (14.0 HP, zero knockback, inflicts 4s Stagger). Whiff inflicts 5s vulnerability + 7s CD.',

  lightAttack: {
    comboLength: 4,
    getStageData: (stage: number): LightStageData => {
      // S1: Lead Forearm Wedge (4.5 HP)
      // S2: Rear Forearm Smash (4.5 HP)
      // S3: Descending Elbow (7.2 HP = 6.0 * 1.2 Brutal Escalation)
      // S4: Heavy Pocket Knee (9.6 HP = 8.0 * 1.2 Brutal Escalation)
      const damages = [4.5, 4.5, 7.2, 9.6];
      const chipDamages = [2.2, 2.2, 3.6, 4.8];
      const windups = [0.10, 0.10, 0.14, 0.18];
      const recoveries = [0.12, 0.12, 0.16, 0.22];
      const knockbacks = [2.0, 2.0, 3.0, 2.5];
      const hitstuns = [0.25, 0.25, 0.32, 0.38];
      const punchType: 'left' | 'right' = stage % 2 === 0 ? 'left' : 'right';

      return {
        damage: damages[stage] || 4.5,
        chipDamage: chipDamages[stage] || 2.2,
        windupSec: windups[stage] || 0.10,
        recoverySec: recoveries[stage] || 0.12,
        knockback: knockbacks[stage] || 2.0,
        hitstunSec: hitstuns[stage] || 0.25,
        punchType,
        sfx: stage === 3 ? 'heavy_punch' : 'punch',
      };
    },
    postComboDelaySec: 0.30,
  },

  heavyAttack: {
    getWindupSec: (fighter?: any) => (fighter?.keysiM2Primed ? 0.10 : 0.50),
    getCooldownSec: (hit?: boolean) => (hit ? 15.0 : 7.0),
    baseDamage: 14.0,
    chipDamage: 7.0,
    knockback: 0.0, // Zero knockback
  },

  dash: {
    getCooldownSec: () => 8.0, // 8.0-second cooldown
    durationSec: 0.45,
    hasIFrames: true,
  },

  block: {
    type: 'standard',
    maxParryWindowSec: 0.15,
  },

  passives: {},
};


