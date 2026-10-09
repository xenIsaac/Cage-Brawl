import { FightingStyle } from '../types';
import {
  STYLE_MODULES,
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
  FightingStyleModule,
} from '../combat/styles';

export {
  STYLE_MODULES,
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

/**
 * Helper to build a FightingStyle entry from a modular FightingStyleModule
 */
function createFightingStyle(
  module: FightingStyleModule,
  options: {
    reworkStatus?: 'active' | 'pending_rework' | 'reworked' | 'undergoing_rework' | 'undergoing_development' | 'testing';
    reworkNotes?: string;
    isBlocked?: boolean;
  }
): FightingStyle {
  return {
    id: module.id,
    name: module.name,
    rarity: 'standard',
    dropRate: 7.69,
    reworkStatus: options.reworkStatus ?? (module.isTesting ? 'testing' : 'active'),
    reworkNotes: options.reworkNotes,
    isBlocked: options.isBlocked ?? module.isTesting ?? false,
    color: module.color,
    secondaryColor: module.secondaryColor,
    description: module.description,
    passiveName: module.passiveName,
    passiveDesc: module.passiveDesc,
    strikeName: module.strikeName,
    statModifiers: module.statModifiers,
    auraStyle: module.auraStyle,
    lightAttackEffect: module.lightAttackEffect,
    heavyAttackEffect: module.heavyAttackEffect,
  };
}

/**
 * Fighting Styles Master Registry
 * Decoupled into individual scripts under src/combat/styles/
 */
export const FIGHTING_STYLES: FightingStyle[] = [
  createFightingStyle(flowBoxingStyle, {
    reworkStatus: 'reworked',
    reworkNotes: 'Evasive Out-Boxer archetype active. Features Pendulum Dash I-Frames & 4-Sway rhythm, Feint Trap S3/S4 parry baiting, Slip Recovery S1/S2 I-Frames & Reflex Pivot M2.',
  }),
  createFightingStyle(sluggerStyle, {
    reworkStatus: 'reworked',
    reworkNotes: 'Slugger Rework Active: Kinetic Super-Heavyweight featuring x0.68 Execution Speed, Air-Displacement cones, Sonic Boom M2, Kinetic Overdrive (6 landed M1s -> 3.0s Super Cripple), Bone-Crushing Attrition (0.6s stacks; -60% M1 Dmg / -40% Exec Speed), M2 Cataclysm (1.0s Super Cripple / +20% Chip / 3.5s Bone Fracture on block), Haymaker Over-Commitment (M2 Whiff penalty: -80% Move Speed & 2.0s Lockout), and Momentum Drag.',
    isBlocked: false,
  }),
  createFightingStyle(kickboxingStyle, {
    reworkStatus: 'pending_rework',
    reworkNotes: 'Prepared for Dutch kickboxing low-kick combo loop rework.',
  }),
  createFightingStyle(streetTaekwondoStyle, {
    reworkStatus: 'undergoing_rework',
    reworkNotes: 'Undergoing Rework: All old mechanics removed. Preparing for complete overhaul.',
    isBlocked: true,
  }),
  createFightingStyle(streetBoxingStyle, {
    reworkStatus: 'active',
    reworkNotes: 'Street Boxing: Aggressive In-Fighter with Stiff Poke Guard, In-Pocket Cling, Unparryable Flurry, M2 Posture Blitz, and Snapping Counter.',
  }),
  createFightingStyle(keysiStyle, {
    reworkStatus: 'active',
    reworkNotes: 'Keysi Rework (CQC Clinch Trapper): Features Pensador wedge stance, 4-combo chain with S3/S4 Brutal Escalation, +50% intercepting slip dash halting on collision, and Pensador Elbow Clinch to Headbutt with 4s Stagger.',
  }),
  createFightingStyle(muayThaiStyle, {
    reworkStatus: 'pending_rework',
    reworkNotes: 'Prepared for clinch knee strike & multi-limb armor chip overhaul.',
  }),
  createFightingStyle(ashiharaStyle, {
    reworkStatus: 'undergoing_rework',
    reworkNotes: 'Undergoing Rework: Usable exclusively in Practice AI during testing.',
    isBlocked: true,
  }),
  createFightingStyle(shotokanStyle, {
    reworkStatus: 'pending_rework',
    reworkNotes: 'Prepared for linear Zenkutsu-Dachi blitz & Ichi-Geki acceleration balance.',
  }),
  createFightingStyle(kyokushinStyle, {
    reworkStatus: 'reworked',
    reworkNotes: 'Kyokushin Karate Rework Active: Heavy Full-Contact Brawler featuring Degrading Armor Conditioning (10% DR), Snapping Windup (+25% speed), Bone-Crushing Attrition (+50% chip / +5% dmg), Super M2 Kinetic Counter-Charge (+5% dmg / hit + 0.2s micro-stun), and Rooted Fudo Dachi Guard Breach system.',
    isBlocked: false,
  }),
  createFightingStyle(boxingShellStyle, {
    reworkStatus: 'reworked',
    reworkNotes: 'Iron Boxing Rework Active: S1 & S2 Right Hand Spring Jab animation (charges and coils in a spring pullback before snapping straight out along the side perspective), S3/S4 Left Rear Cross, Right-Flank Philly Shell Shield & 60° Shoulder Deflection Roll.',
  }),
  createFightingStyle(capoeiraStyle, {
    reworkStatus: 'pending_rework',
    reworkNotes: 'Prepared for Ginga rhythm momentum & Meia Lua wheel kick expansion.',
  }),
  createFightingStyle(cqcStyle, {
    reworkStatus: 'pending_rework',
    reworkNotes: 'Prepared for tactical rear blitz & multi-ring lock-on system rework.',
  }),
  createFightingStyle(aikidoStyle, {
    reworkStatus: 'active',
    reworkNotes: 'Aikido (Deflective Counter-Grappler): Tenchi Parry Counter (10 DMG, 0.2s M1 reaction), Kinetic Intercept (10 DMG 30% clash slam, excl. S3), Tenkan Aiki Flow (S3 Free M2 Boost, 15s CD, -2s per M1 hit), Aiki Redirection (+15% DR, 2-Hit SA, S4 22 DMG Guard Break Slam).',
  }),
];

/**
 * Check if a style is valid for the Gacha Roll system.
 * Reworked, blocked, or in-testing styles CANNOT be rolled!
 */
export const isStyleRollable = (style: FightingStyle): boolean => {
  if (style.isBlocked) return false;
  if (
    style.reworkStatus === 'undergoing_rework' ||
    style.reworkStatus === 'undergoing_development' ||
    style.reworkStatus === 'testing'
  ) {
    return false;
  }
  return true;
};

/**
 * Check if a style is in testing/rework (usable exclusively in Practice AI).
 */
export const isStyleInTesting = (style: FightingStyle | string): boolean => {
  const found = typeof style === 'string'
    ? FIGHTING_STYLES.find(s => s.id === style)
    : style;
  if (!found) return false;
  return (
    !!found.isBlocked ||
    found.reworkStatus === 'undergoing_rework' ||
    found.reworkStatus === 'undergoing_development' ||
    found.reworkStatus === 'testing'
  );
};

/**
 * Returns all styles available in the Gacha Roll pool.
 */
export const getRollableStyles = (): FightingStyle[] => {
  return FIGHTING_STYLES.filter(isStyleRollable);
};

export const RARITY_LABELS = {
  standard: { name: 'Martial Stance', chance: 0.0769, color: 'text-amber-400 bg-amber-950/40 border-amber-500/40' },
  uncommon: { name: 'Martial Stance', chance: 0.0769, color: 'text-amber-400 bg-amber-950/40 border-amber-500/40' },
  rare: { name: 'Martial Stance', chance: 0.0769, color: 'text-amber-400 bg-amber-950/40 border-amber-500/40' },
  epic: { name: 'Martial Stance', chance: 0.0769, color: 'text-amber-400 bg-amber-950/40 border-amber-500/40' },
  legendary: { name: 'Martial Stance', chance: 0.0769, color: 'text-amber-400 bg-amber-950/40 border-amber-500/40' },
  mythic: { name: 'Martial Stance', chance: 0.0769, color: 'text-amber-400 bg-amber-950/40 border-amber-500/40' },
  secret_mythic: { name: 'Martial Stance', chance: 0.0769, color: 'text-amber-400 bg-amber-950/40 border-amber-500/40' },
};
