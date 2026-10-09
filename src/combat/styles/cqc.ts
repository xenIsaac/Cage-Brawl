import { FightingStyleModule, LightStageData } from './types';
import { CombatFighter } from '../types';

export const cqcStyle: FightingStyleModule = {
  id: 'cqc',
  name: 'CQC',
  isTesting: false,
  color: '#111111',
  secondaryColor: '#38bdf8',
  description: 'An elite, military-grade hand-to-hand combat system discarding traditional stances for brutal tactical efficiency, joint-trapping, and high-speed rear blitzes.',
  passiveName: 'Tactical Acceleration, Posture Loop, Lockout Assault & Super Armor Blitz',
  passiveDesc: '[ Tactical Acceleration ]: Landing consecutive M1 strikes progressively accelerates light combo speed (+0.15s per hit). [ Posture Loop ]: Landing full S1-S4 combo refunds 25% Posture CD. Landing M2 resets Posture CD to 0.0s. [ Lockout Assault ]: M2 rear blitz disables opponent M1/M2 attacks for 2.0s. [ Super Armor Blitz ]: Gains Super Armor during dash and 5-hit combo execution.',
  strikeName: 'Open Palms, Forearm Strike & Tactical Assault',
  statModifiers: {
    speed: 1.00,
    reach: 0.90,
    power: 1.00,
    defense: 1.10,
    knockback: 0.75,
    healthMax: 0,
  },
  auraStyle: 'ring',
  lightAttackEffect: '4-Combo Tactical Palm Matrix: S1 Left Open Palm, S2 Right Open Palm, S3 Forearm Strike, S4 Front Straight Punch.',
  heavyAttackEffect: 'Tactical CQC Assault (15.0s CD / 14.0 DMG): Echo Ring windup locking onto target, executing rapid 5-hit tactical rear assault with Super Armor.',

  lightAttack: {
    comboLength: 4,
    getStageData: (stage: number): LightStageData => {
      const damages = [4.5, 4.5, 5.5, 8.0];
      const punchType: 'left' | 'right' = stage % 2 === 0 ? 'left' : 'right';

      return {
        damage: damages[stage] || 4.5,
        chipDamage: 2.8,
        windupSec: 0.12 + stage * 0.015,
        recoverySec: 0.14,
        knockback: stage === 3 ? 8.5 : 4.0,
        hitstunSec: stage === 3 ? 0.40 : 0.24,
        punchType,
        sfx: stage === 2 ? 'forearm' : 'open_palm',
      };
    },
    onComboFinish: (fighter: CombatFighter) => {
      // Posture Loop: refunds 25% Posture CD
      if (fighter.postureCd && fighter.postureCd > 0) {
        fighter.postureCd *= 0.75;
      }
    },
    postComboDelaySec: 0.20,
  },

  heavyAttack: {
    getWindupSec: () => 0.50,
    getCooldownSec: () => 15.0,
    baseDamage: 14.0,
    chipDamage: 8.0,
    knockback: 10.0,
    hasSuperArmor: true, // Super Armor Blitz
    onHit: (attacker: CombatFighter, defender: CombatFighter) => {
      defender.cqcAttackLockout = 120; // 2.0s lockout of opponent M1/M2
      attacker.postureCd = 0; // Resets Posture CD to 0.0s
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
