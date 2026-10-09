import { FightingStyleModule, LightStageData } from './types';
import { CombatFighter } from '../types';
import { StatModifiers } from '../../types';

import { flowBoxingStyle } from './flowBoxing';
import { sluggerStyle } from './slugger';
import { kickboxingStyle } from './kickboxing';
import { streetTaekwondoStyle } from './streetTaekwondo';
import { streetBoxingStyle } from './streetBoxing';
import { keysiStyle } from './keysi';
import { muayThaiStyle } from './muayThai';
import { ashiharaStyle } from './ashihara';
import { shotokanStyle } from './shotokan';
import { kyokushinStyle } from './kyokushin';
import { boxingShellStyle } from './boxingShell';
import { capoeiraStyle } from './capoeira';
import { cqcStyle } from './cqc';
import { aikidoStyle } from './aikido';

export * from './types';
export {
  flowBoxingStyle,
  sluggerStyle,
  kickboxingStyle,
  streetTaekwondoStyle,
  streetBoxingStyle,
  keysiStyle,
  muayThaiStyle,
  ashiharaStyle,
  shotokanStyle,
  kyokushinStyle,
  boxingShellStyle,
  capoeiraStyle,
  cqcStyle,
  aikidoStyle,
};

export const STYLE_MODULES: Record<string, FightingStyleModule> = {
  basic: flowBoxingStyle,
  slugger: sluggerStyle,
  kickboxing: kickboxingStyle,
  street_taekwondo: streetTaekwondoStyle,
  street_boxing: streetBoxingStyle,
  keysi: keysiStyle,
  muay_thai: muayThaiStyle,
  ashihara: ashiharaStyle,
  shotokan: shotokanStyle,
  kyokushin: kyokushinStyle,
  boxing_shell: boxingShellStyle,
  capoeira: capoeiraStyle,
  cqc: cqcStyle,
  aikido: aikidoStyle,
};

/**
 * Get the fighting style module by ID, defaulting to flowBoxingStyle ('basic')
 */
export const getStyleModule = (styleId?: string): FightingStyleModule => {
  if (!styleId) return flowBoxingStyle;
  return STYLE_MODULES[styleId] || flowBoxingStyle;
};

/**
 * Returns whether a style is currently undergoing testing/rework (Practice AI exclusively)
 */
export const isStyleInTesting = (styleId: string): boolean => {
  const mod = getStyleModule(styleId);
  return !!mod.isTesting;
};

/**
 * Retrieve stat modifiers for a fighting style
 */
export const getStyleStatModifiers = (styleId: string): StatModifiers => {
  return getStyleModule(styleId).statModifiers;
};

/**
 * Retrieve light attack stage data (damage, windup, recovery, knockback, etc.)
 */
export const getStyleLightStage = (
  styleId: string,
  stage: number,
  fighter: CombatFighter,
  opp?: CombatFighter | null
): LightStageData => {
  const mod = getStyleModule(styleId);
  return mod.lightAttack.getStageData(stage, fighter, opp);
};

/**
 * Retrieve heavy attack windup in seconds
 */
export const getStyleHeavyWindup = (
  styleId: string,
  fighter: CombatFighter,
  opp?: CombatFighter | null
): number => {
  const mod = getStyleModule(styleId);
  return mod.heavyAttack.getWindupSec(fighter, opp);
};

/**
 * Retrieve heavy attack cooldown in seconds
 */
export const getStyleHeavyCooldown = (
  styleId: string,
  hit: boolean,
  fighter: CombatFighter
): number => {
  const mod = getStyleModule(styleId);
  return mod.heavyAttack.getCooldownSec(hit, fighter);
};

/**
 * Retrieve dash cooldown in seconds
 */
export const getStyleDashCooldown = (
  styleId: string,
  fighter: CombatFighter
): number => {
  const mod = getStyleModule(styleId);
  return mod.dash.getCooldownSec(fighter);
};

/**
 * Check if the fighter currently has Super Armor from their heavy attack
 */
export const hasStyleHeavySuperArmor = (
  styleId: string,
  fighter: CombatFighter
): boolean => {
  const mod = getStyleModule(styleId);
  if (typeof mod.heavyAttack.hasSuperArmor === 'function') {
    return mod.heavyAttack.hasSuperArmor(fighter);
  }
  return !!mod.heavyAttack.hasSuperArmor;
};

/**
 * Check if the fighter currently has IFrames from their heavy attack
 */
export const hasStyleHeavyIFrames = (
  styleId: string,
  fighter: CombatFighter
): boolean => {
  const mod = getStyleModule(styleId);
  if (typeof mod.heavyAttack.hasIFrames === 'function') {
    return mod.heavyAttack.hasIFrames(fighter);
  }
  return !!mod.heavyAttack.hasIFrames;
};

/**
 * Calculate modified damage given attacker and defender passive traits
 */
export const calculateStyleDamage = (
  attacker: CombatFighter,
  defender: CombatFighter,
  rawDamage: number,
  isHeavy: boolean
): number => {
  let dmg = rawDamage;
  const atkMod = getStyleModule(attacker.styleId);
  if (atkMod.passives?.modifyDamageDealt) {
    dmg = atkMod.passives.modifyDamageDealt(attacker, defender, dmg, isHeavy);
  }

  const defMod = getStyleModule(defender.styleId);
  if (defMod.passives?.modifyDamageTaken) {
    dmg = defMod.passives.modifyDamageTaken(defender, attacker, dmg);
  }

  return dmg;
};

/**
 * Trigger on-hit passive hooks for both attacker and defender
 */
export const triggerStyleOnHit = (
  attacker: CombatFighter,
  defender: CombatFighter,
  isHeavy: boolean,
  stage: number,
  ctx: any
): void => {
  const atkMod = getStyleModule(attacker.styleId);
  if (isHeavy) {
    atkMod.heavyAttack.onHit?.(attacker, defender, ctx);
  }
  atkMod.passives?.onHitGiven?.(attacker, defender, isHeavy, stage, ctx);

  const defMod = getStyleModule(defender.styleId);
  defMod.passives?.onHitReceived?.(defender, attacker, isHeavy, ctx);
};

/**
 * Trigger style hooks when defender successfully parries attacker
 */
export const triggerStyleParrySuccess = (
  defender: CombatFighter,
  attacker: CombatFighter
): void => {
  const defMod = getStyleModule(defender.styleId);
  defMod.passives?.onParrySuccess?.(defender, attacker);

  const atkMod = getStyleModule(attacker.styleId);
  atkMod.passives?.onParried?.(attacker, defender);
};

/**
 * Per-frame style update hook
 */
export const tickStyleMechanics = (fighter: CombatFighter): void => {
  const mod = getStyleModule(fighter.styleId);
  mod.passives?.tick?.(fighter);
};

/**
 * Retrieve post-S4 heavy lockout delay in frames (60fps) from style definition
 */
export const getStylePostS4HeavyDelay = (styleId: string): number => {
  const mod = getStyleModule(styleId);
  if (mod.lightAttack.postComboDelaySec !== undefined) {
    return Math.round(mod.lightAttack.postComboDelaySec * 60);
  }
  return 18; // Default: 0.3s (18 frames)
};

