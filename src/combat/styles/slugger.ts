import { FightingStyleModule, LightStageData } from './types';
import { CombatFighter } from '../types';

export const sluggerStyle: FightingStyleModule = {
  id: 'slugger',
  name: 'Slugger',
  isTesting: false,
  color: '#d97706',
  secondaryColor: '#334155',
  description: 'Hulking kinetic engine that trades agile footwork for destructive forward torque, air-displacement impact cones, and bone-crushing attrition.',
  passiveName: 'Kinetic Overdrive & Bone-Crushing Attrition',
  passiveDesc: '[ Kinetic Overdrive ]: 6 landed M1s inflict 3.0s Super Cripple (Disables Parry, M1, M2). [ Bone-Crushing Attrition ]: Blocked M1s inflict Bone Fracture (0.6s stack; -60% M1 Dmg, -40% Atk Exec Speed). [ M2 Cataclysm ]: Direct hit inflicts 1.0s Super Cripple; Blocked hit deals +20% Chip & 3.5s Bone Fracture. [ Haymaker Over-Commitment ]: M2 Whiff slows movement -80% and locks M1/M2/Block for 2.0s (canceled on knockback). [ Momentum Drag ]: M1 Whiff slows next M1 execution by -20% (stacks, resets on S4).',
  strikeName: 'Heavy Swing & Sonic Boom Hook',
  statModifiers: {
    speed: 1.00, // Genetics-only movement speed
    reach: 1.00, // Normal limb reach
    power: 1.35,
    defense: 1.00,
    knockback: 1.35,
    healthMax: 0,
  },
  auraStyle: 'none',
  lightAttackEffect: '4-Sequence Power Swing Combo (Square Gloves; Air-Displacement cones on hit; 0.6s Bone Fracture stacks on block).',
  heavyAttackEffect: 'Sonic Boom Hook (0.80s windup; 16.0 HP / 1.0s Super Cripple on hit; +20% Chip / 3.5s Bone Fracture on block; -80% Speed & 2.0s Lockout on whiff).',

  lightAttack: {
    comboLength: 4,
    getStageData: (stage: number, _fighter: CombatFighter): LightStageData => {
      const damages = [6.5, 7.0, 7.5, 10.5];
      const chips = [1.3, 1.4, 1.5, 2.1];
      const punchType: 'left' | 'right' = stage % 2 === 0 ? 'left' : 'right';

      return {
        damage: damages[stage] || 6.5,
        chipDamage: chips[stage] || 1.3,
        windupSec: stage === 3 ? 0.22 : 0.16,
        recoverySec: stage === 3 ? 0.40 : 0.32,
        knockback: stage === 3 ? 14.5 : 7.0,
        hitstunSec: stage === 3 ? 0.45 : 0.32,
        punchType,
        sfx: stage === 3 ? 'heavy_punch' : 'karate_heavy_punch'
      };
    },
    onExecute: (fighter: CombatFighter, stage: number) => {
      if (stage === 3) {
        // Reset M1 Whiff Drag penalties upon reaching Sequence 4
        fighter.sluggerM1WhiffDragCount = 0;
        fighter.sluggerWhiffedStages = [];
      }
    },
    postComboDelaySec: 0.45,
  },

  heavyAttack: {
    getWindupSec: () => 0.80, // 48 frames at 60 FPS
    getCooldownSec: (hit: boolean) => hit ? 12.0 : 8.0,
    baseDamage: 16.0,
    chipDamage: 9.6, // +20% Extra Chip Damage
    knockback: 16.0,
    hasSuperArmor: false,
    onExecute: (fighter: CombatFighter) => {
      fighter.heavyWindup = 48; // 0.80s windup
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
  },

  passives: {
    tick: (fighter: CombatFighter): void => {
      // Super Cripple timer tick
      if (fighter.superCrippleTimer && fighter.superCrippleTimer > 0) {
        fighter.superCrippleTimer--;
      }
      // Bone Fracture timer tick
      if (fighter.boneFractureTimer && fighter.boneFractureTimer > 0) {
        fighter.boneFractureTimer--;
      }
      // Haymaker Over-Commitment (M2 Whiff Lockout) timer tick
      if (fighter.sluggerM2WhiffLockoutTimer && fighter.sluggerM2WhiffLockoutTimer > 0) {
        fighter.sluggerM2WhiffLockoutTimer--;
      }
    }
  }
};
