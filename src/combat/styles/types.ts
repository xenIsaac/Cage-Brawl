import { StatModifiers } from '../../types';
import { CombatFighter } from '../types';

export interface LightStageData {
  damage: number;
  chipDamage: number;
  windupSec: number;
  recoverySec: number;
  knockback: number;
  hitstunSec?: number;
  punchType: 'left' | 'right';
  isIFrame?: boolean;
  unparryable?: boolean;
  sfx?: string;
  name?: string;
}

export interface FightingStyleModule {
  id: string;
  name: string;
  isTesting?: boolean; // When true, style is usable in Practice AI exclusively
  color: string;
  secondaryColor: string;
  description: string;
  passiveName: string;
  passiveDesc: string;
  strikeName: string;
  statModifiers: StatModifiers;
  auraStyle: 'fire' | 'lightning' | 'ring' | 'spiral' | 'shield' | 'none';
  lightAttackEffect?: string;
  heavyAttackEffect?: string;

  lightAttack: {
    comboLength: number;
    getStageData: (stage: number, fighter: CombatFighter, opp?: CombatFighter | null) => LightStageData;
    onExecute?: (fighter: CombatFighter, stage: number) => void;
    onComboFinish?: (fighter: CombatFighter, opp?: CombatFighter | null) => void;
    postComboDelaySec?: number;
  };

  heavyAttack: {
    getWindupSec: (fighter: CombatFighter, opp?: CombatFighter | null) => number;
    getCooldownSec: (hit: boolean, fighter: CombatFighter) => number;
    baseDamage: number;
    chipDamage: number;
    knockback: number;
    hasSuperArmor?: boolean | ((fighter: CombatFighter) => boolean);
    hasIFrames?: boolean | ((fighter: CombatFighter) => boolean);
    onExecute?: (fighter: CombatFighter, opp?: CombatFighter | null) => void;
    onHit?: (attacker: CombatFighter, defender: CombatFighter, ctx: any) => void;
    onWhiff?: (fighter: CombatFighter) => void;
  };

  dash: {
    getCooldownSec: (fighter: CombatFighter) => number;
    durationSec: number;
    hasIFrames?: boolean;
    onDash?: (fighter: CombatFighter) => void;
  };

  block: {
    type?: 'standard' | 'rooted' | 'stacks' | 'philly_shell';
    maxParryWindowSec?: number;
    onBlockHit?: (defender: CombatFighter, attacker: CombatFighter, damage: number) => void;
  };

  passives?: {
    modifyDamageDealt?: (attacker: CombatFighter, defender: CombatFighter, baseDmg: number, isHeavy: boolean) => number;
    modifyDamageTaken?: (defender: CombatFighter, attacker: CombatFighter, baseDmg: number) => number;
    onHitGiven?: (attacker: CombatFighter, defender: CombatFighter, isHeavy: boolean, stage: number, ctx: any) => void;
    onHitReceived?: (defender: CombatFighter, attacker: CombatFighter, isHeavy: boolean, ctx: any) => void;
    onParrySuccess?: (defender: CombatFighter, attacker: CombatFighter) => void;
    onParried?: (attacker: CombatFighter, defender: CombatFighter) => void;
    tick?: (fighter: CombatFighter) => void;
  };
}
