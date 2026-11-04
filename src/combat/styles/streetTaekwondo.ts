// ============================================================================
// COMBAT MODULE: STREET TAEKWONDO (src/combat/styles/streetTaekwondo.ts)
// Archetype: Aggressive Feint Striker — OFFICIAL REWORK FALLBACK MODULE
// ============================================================================

import { FightingStyleModule, LightStageData } from './types';
import { CombatFighter } from '../types';

export const streetTaekwondoStyle: FightingStyleModule = {
  id: 'street_taekwondo',
  name: 'Street Taekwondo',
  isTesting: false,
  color: '#FF6B00',
  secondaryColor: '#FFD600',
  description: 'Trades formal dojang forms for deceptive urban angles, high-speed hip whipping, and the devastating, trajectory-shifting Brazilian Kick (Question Mark Kick).',
  passiveName: 'Neuro-Trauma Hallucination & Deflective Cadence',
  passiveDesc: 'Feint-traps parries into devastating spin-outs and disorienting phantom hallucinations. Parrying grants +30% posture regen for 8.0s.',
  strikeName: 'Taekwondo Strikes',
  statModifiers: {
    speed: 1.05,      // Attack Execution Speed (AEXSPD) 1.05x
    reach: 1.00,      // Leg reach matched to Kyokushin Karate leg size (x1.00)
    power: 0.96,      // Fist & Kick Power x0.96
    defense: 1.00,    // Standard base absorption x1.00
    knockback: 0.85,  // Knockback Momentum x0.85
    healthMax: 0,     // Bonus Vitality +0 Max HP
  },
  auraStyle: 'none',
  lightAttackEffect: 'Rapid slanted whip kicks and torque spinning kicks.',
  heavyAttackEffect: 'Devastating trajectory-shifting Brazilian Kick.',

  lightAttack: {
    comboLength: 4,
    getStageData: (stage: number): LightStageData => {
      // S1: 4.8 HP, S2: 4.8 HP, S3: 6.0 HP, S4: 8.0 HP
      const damages = [4.8, 4.8, 6.0, 8.0];
      const punchType: 'left' | 'right' = stage < 2 ? 'right' : 'left';
      // S1: 0.20s DS, S2: 0.20s DS, S3: 0.10s DS, S4: 0.70s DS
      const windups = [0.10, 0.067, 0.333, 0.133];
      const recoveries = [0.20, 0.20, 0.10, 0.70];
      const knockbacks = [3.2, 3.4, 4.2, 7.2];
      const hitstuns = [0.20, 0.22, 0.26, 0.42];

      return {
        damage: damages[stage] || 4.8,
        chipDamage: 1.4,
        windupSec: windups[stage] || 0.10,
        recoverySec: recoveries[stage] || 0.20,
        knockback: knockbacks[stage] || 3.2,
        hitstunSec: hitstuns[stage] || 0.20,
        punchType,
        isIFrame: false,
        sfx: stage === 3 ? 'heavy_impact' : 'taekwondo_snap',
      };
    },
    postComboDelaySec: 1.30, // 78 frames (~1.30s)
  },

  heavyAttack: {
    getWindupSec: () => 0.35, // 21 frames total (9f Phase 1 rear load + 12f Phase 2 feint arc & pull-back)
    getCooldownSec: () => 4.0, // 4.0s whiff / 7.0s on hit
    baseDamage: 13.0, // 13.0 HP Damage
    chipDamage: 4.0,
    knockback: 0.0, // Zero Knockback
  },

  dash: {
    getCooldownSec: () => 2.8,
    durationSec: 0.30,
    hasIFrames: true,
  },

  block: {
    type: 'standard',
    maxParryWindowSec: 0.18,
  },

  passives: {
    onParrySuccess: (defender: CombatFighter) => {
      // Deflective Cadence: Accelerates Posture Regeneration speed by +30% for 8.0s (480 frames)
      defender.deflectiveCadenceTimer = 480;
    },
  },
};
