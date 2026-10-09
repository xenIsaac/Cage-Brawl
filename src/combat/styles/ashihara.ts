import { FightingStyleModule, LightStageData } from './types';
import { CombatFighter } from '../types';

export const ashiharaStyle: FightingStyleModule = {
  id: 'ashihara',
  name: 'Ashihara Karate',
  isTesting: true, // In testing, usable in Practice AI exclusively
  color: '#172554',
  secondaryColor: '#1d4ed8',
  description: 'A redirective counter-martial style focusing on Sabaki: 3-stage reactive counter-throw (Mawashi Uke ➔ Tsukami Drag ➔ Chudan Straight) delivering a 0.85s stagger stun.',
  passiveName: 'Sabaki Counter-Loop & Flow Sweep',
  passiveDesc: '[ Sabaki Counter-Loop ]: Heavy Strike (M2) 3-stage reactive counter-throw. Successful parry instantly refunds M2 CD. [ Parry Lockout ]: Initiating or landing M2 disables opponent parrying for 1.0s to prevent counter-parries. [ Flow Sweep ]: S4 Ashibarai light sweep grants Invincibility (I-Frames) during execution.',
  strikeName: 'Chudan Tsuki, Mawashi-Geri & Ashibarai',
  statModifiers: {
    speed: 0.90,
    reach: 1.00,
    power: 0.90,
    defense: 1.00,
    knockback: 0.80,
    healthMax: 0,
  },
  auraStyle: 'none',
  lightAttackEffect: '4-Sequence Combo (0s recovery on S4). Can initiate M2 after S4 instantly (Parry Counterflow / Sabaki recovery bypass).',
  heavyAttackEffect: 'Sabaki Tsukami Counter (4.5s CD / 0.5s Whiff): 3-Stage M2 System. M2 S1 Mawashi Uke (0.45s active parry, disables opponent parrying for 1.0s) ➔ M2 S2 Tsukami Drag (3.0 HP arm drag & pull) ➔ M2 S3 Chudan Straight (13.0 HP base damage, 0.85s Stagger Stun, instant CD refund).',

  lightAttack: {
    comboLength: 4,
    getStageData: (stage: number): LightStageData => {
      const damages = [4.0, 4.5, 5.5, 7.0];
      const punchType: 'left' | 'right' = stage % 2 === 0 ? 'left' : 'right';

      return {
        damage: damages[stage] || 4.0,
        chipDamage: 2.5,
        windupSec: 0.12 + stage * 0.02,
        recoverySec: stage === 3 ? 0.0 : 0.16, // Flow sweep 0s recovery
        knockback: stage === 3 ? 8.0 : 4.5,
        hitstunSec: stage === 3 ? 0.40 : 0.25,
        punchType,
        isIFrame: stage === 3, // S4 Ashibarai grants I-Frames
        sfx: stage === 3 ? 'sweep' : 'karate_punch',
      };
    },
    postComboDelaySec: 0.0, // Instant M2 counterflow
  },

  heavyAttack: {
    getWindupSec: () => 0.45,
    getCooldownSec: (hit: boolean) => hit ? 4.5 : 0.5,
    baseDamage: 13.0,
    chipDamage: 7.0,
    knockback: 10.0,
    onExecute: (fighter: CombatFighter, opp?: CombatFighter | null) => {
      fighter.ashiharaM2Stage = 1;
      if (opp) {
        opp.parryLockoutTimer = 60; // 1.0s parry lockout
      }
    },
    onHit: (attacker: CombatFighter, defender: CombatFighter) => {
      defender.stunTime = Math.max(defender.stunTime || 0, 51); // 0.85s stagger stun
      attacker.heavyCooldown = 0; // Sabaki instant refund
    }
  },

  dash: {
    getCooldownSec: () => 3.5,
    durationSec: 0.35,
    hasIFrames: true,
  },

  block: {
    type: 'standard',
    maxParryWindowSec: 0.15,
  }
};
