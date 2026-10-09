import { FightingStyle } from '../types';
import { STYLE_CLASSIFICATIONS, StyleClassification } from './styleClassification';
import { FIGHTING_STYLES } from './styles';

export type KeyTier = 'iron' | 'gold' | 'diamond' | 'obsidian';

export interface KeyTierConfig {
  id: KeyTier;
  name: string;
  cost: number | null; // null if unpurchasable (Obsidian)
  luckModifier: number; // -0.15, 0.00, +0.10, +0.30
  luckLabel: string;
  luckBadge: string;
  acquisitionSource: string;
  color: string;
  bg: string;
  border: string;
  glow: string;
  accent: string;
  description: string;
}

export const KEY_TIERS: Record<KeyTier, KeyTierConfig> = {
  iron: {
    id: 'iron',
    name: 'Iron Key',
    cost: 50,
    luckModifier: -0.15,
    luckLabel: '-15% Luck Penalty',
    luckBadge: '-15%',
    acquisitionSource: 'Direct Shop Purchase ($50 Cash)',
    color: 'text-zinc-300',
    bg: 'bg-zinc-850',
    border: 'border-zinc-600',
    glow: 'shadow-zinc-700/30',
    accent: '#71717a',
    description: 'Forged iron key with minor mechanical resistance. Applies a -15% luck penalty on crate drop rates.'
  },
  gold: {
    id: 'gold',
    name: 'Gold Key',
    cost: 100,
    luckModifier: 0.00,
    luckLabel: 'Base (0% Modifier)',
    luckBadge: '±0%',
    acquisitionSource: 'Direct Shop Purchase ($100 Cash) / Basic Quests',
    color: 'text-amber-300',
    bg: 'bg-amber-950/80',
    border: 'border-amber-500/80',
    glow: 'shadow-amber-500/30',
    accent: '#f59e0b',
    description: 'Standard polished gold key providing true baseline drop probabilities for all fighter crates.'
  },
  diamond: {
    id: 'diamond',
    name: 'Diamond Key',
    cost: 200,
    luckModifier: 0.10,
    luckLabel: '+10% Luck Boost',
    luckBadge: '+10%',
    acquisitionSource: 'Direct Shop Purchase ($200 Cash) / Ranked Quests',
    color: 'text-cyan-300',
    bg: 'bg-cyan-950/80',
    border: 'border-cyan-500/80',
    glow: 'shadow-cyan-500/40',
    accent: '#06b6d4',
    description: 'Precision-cut crystalline key granting an empowered +10% luck boost to all style win chances.'
  },
  obsidian: {
    id: 'obsidian',
    name: 'Obsidian Key',
    cost: null,
    luckModifier: 0.30,
    luckLabel: '+30% Luck Boost',
    luckBadge: '+30%',
    acquisitionSource: 'Exclusive High-Tier Tournament Victory Rewards',
    color: 'text-purple-300',
    bg: 'bg-purple-950/90',
    border: 'border-purple-500/90',
    glow: 'shadow-purple-600/50',
    accent: '#a855f7',
    description: 'Ultra-rare forged dark matter key. Bestows a massive +30% luck boost to crate drop rates.'
  }
};

export type CrateType = 'normal' | 'striker' | 'grappler' | 'hybrid' | 'origin';

export interface CrateConfig {
  id: CrateType;
  name: string;
  subtitle: string;
  tagline: string;
  category: 'universal' | 'class' | 'origin';
  baseWinRate: number; // 0.30 (Normal), 0.60 (Class), 0.90 (Origin)
  baseFailureRate: number; // 0.70 (Normal), 0.40 (Class), 0.10 (Origin)
  description: string;
  color: string;
  accentColor: string;
  bgGradient: string;
  borderColor: string;
  badgeLabel: string;
  badgeColor: string;
  emblem: string;
  poolDescription: string;
  features: string[];
}

export const CRATE_CATALOG: Record<CrateType, CrateConfig> = {
  normal: {
    id: 'normal',
    name: 'Normal Crate',
    subtitle: 'Universal Style Pool',
    tagline: 'Standard crate containing every style currently in Cage Brawl with 5-Hour Wishlist target booster.',
    category: 'universal',
    baseWinRate: 0.30,
    baseFailureRate: 0.70,
    description: 'Contains every style currently in the game. Features the Wishlist System for targeted +30% relative style probability boost.',
    color: '#eab308',
    accentColor: '#ca8a04',
    bgGradient: 'from-zinc-900 via-zinc-950 to-zinc-900',
    borderColor: 'border-yellow-500/50',
    badgeLabel: 'UNIVERSAL POOL',
    badgeColor: 'bg-yellow-950/80 text-yellow-300 border-yellow-500/60',
    emblem: 'hazard_steel',
    poolDescription: 'All 14 fighting styles in the game roster.',
    features: [
      'Base Failure Rate: 70% (30% Style Win Rate)',
      '1-Style Wishlist System (+30% Target Boost)',
      '5-Hour Real-Time Wishlist Cooldown upon obtaining target'
    ]
  },
  striker: {
    id: 'striker',
    name: 'Striker Crate',
    subtitle: 'Combat Class: Striker',
    tagline: 'Targeted archetype crate dropping exclusively Striker combat disciplines.',
    category: 'class',
    baseWinRate: 0.60,
    baseFailureRate: 0.40,
    description: 'High-probability archetype crate dropping exclusively Striker fighting styles with reduced failure rate.',
    color: '#ef4444',
    accentColor: '#dc2626',
    bgGradient: 'from-red-950/70 via-zinc-950 to-red-950/40',
    borderColor: 'border-red-500/60',
    badgeLabel: 'CLASS: STRIKER',
    badgeColor: 'bg-red-950/80 text-red-300 border-red-500/60',
    emblem: 'dual_fist',
    poolDescription: 'Flow Boxing, Street Boxing, Slugger, Kyokushin, Iron Boxing, Muay Thai, Kickboxing, Shotokan, Capoeira, Street TKD.',
    features: [
      'Reduced Failure Rate: 40% (60% Style Win Rate)',
      'Only drops Striker styles',
      'Excludes Grapplers and Hybrids'
    ]
  },
  grappler: {
    id: 'grappler',
    name: 'Grappler Crate',
    subtitle: 'Combat Class: Grappler',
    tagline: 'Targeted archetype crate dropping exclusively Grappling and Throw systems.',
    category: 'class',
    baseWinRate: 0.60,
    baseFailureRate: 0.40,
    description: 'High-probability archetype crate dropping exclusively Grappler fighting styles with joint-lock and throw mechanics.',
    color: '#0284c7',
    accentColor: '#0369a1',
    bgGradient: 'from-sky-950/70 via-zinc-950 to-blue-950/40',
    borderColor: 'border-sky-500/60',
    badgeLabel: 'CLASS: GRAPPLER',
    badgeColor: 'bg-sky-950/80 text-sky-300 border-sky-500/60',
    emblem: 'joint_lock',
    poolDescription: 'Aikido (and upcoming Grapplers).',
    features: [
      'Reduced Failure Rate: 40% (60% Style Win Rate)',
      'Only drops Grappler styles',
      'Excludes Strikers and Hybrids'
    ]
  },
  hybrid: {
    id: 'hybrid',
    name: 'Hybrid Crate',
    subtitle: 'Combat Class: Hybrid',
    tagline: 'Targeted archetype crate dropping styles blending striking strings with clinch & takedowns.',
    category: 'class',
    baseWinRate: 0.60,
    baseFailureRate: 0.40,
    description: 'High-probability archetype crate dropping exclusively Hybrid fighting styles combining striking and clinch mechanics.',
    color: '#a855f7',
    accentColor: '#9333ea',
    bgGradient: 'from-purple-950/70 via-zinc-950 to-purple-950/40',
    borderColor: 'border-purple-500/60',
    badgeLabel: 'CLASS: HYBRID',
    badgeColor: 'bg-purple-950/80 text-purple-300 border-purple-500/60',
    emblem: 'blade_fist',
    poolDescription: 'Keysi, CQC, Ashihara Karate.',
    features: [
      'Reduced Failure Rate: 40% (60% Style Win Rate)',
      'Only drops Hybrid styles',
      'Excludes Pure Strikers and Pure Grapplers'
    ]
  },
  origin: {
    id: 'origin',
    name: 'Origin Crate',
    subtitle: 'Discipline Roulette',
    tagline: 'Elite tier container with only 10% failure rate, categorized by martial origin pools.',
    category: 'origin',
    baseWinRate: 0.90,
    baseFailureRate: 0.10,
    description: 'Premium carbon-fiber crate with lowest failure rate in the game (10%), partitioned into Street, Professional, and Fiction discipline pools.',
    color: '#f59e0b',
    accentColor: '#d97706',
    bgGradient: 'from-amber-950/80 via-zinc-950 to-amber-950/50',
    borderColor: 'border-amber-400/80',
    badgeLabel: 'DISCIPLINE ROULETTE',
    badgeColor: 'bg-amber-900/80 text-amber-200 border-amber-400/80',
    emblem: 'compass_reticle',
    poolDescription: 'Street Pool (30%) • Professional Pool (30%) • Fiction Pool (30%) • 10% Empty.',
    features: [
      'Lowest Failure Rate: Only 10% Chance of Nothing',
      '3-Minute Cooldown per Key',
      'Street Pool (30%): Street Boxing, Slugger, Keysi, Capoeira, Street TKD',
      'Professional Pool (30%): Flow Boxing, Iron Boxing, Kyokushin, Aikido, Ashihara, Muay Thai, Kickboxing, Shotokan',
      'Fiction Pool (30%): CQC'
    ]
  }
};

export const CRATE_LIST: CrateConfig[] = Object.values(CRATE_CATALOG);

export interface CrateRollResult {
  isWin: boolean;
  style: FightingStyle | null;
  originPool?: 'Street' | 'Professional' | 'Fiction';
  crateType: CrateType;
  keyTier: KeyTier;
  effectiveWinRate: number;
  outcomeMessage: string;
  isWishlistedHit?: boolean;
}

/**
 * Calculates the dynamic win probability based on crate tier and key luck multiplier.
 */
export function calculateEffectiveWinRate(crateId: CrateType, keyTier: KeyTier): number {
  const crate = CRATE_CATALOG[crateId];
  const key = KEY_TIERS[keyTier];
  const baseRate = crate.baseWinRate;
  const luckModifier = key.luckModifier;

  // Base rate scaled by relative luck modifier
  const calculated = baseRate * (1 + luckModifier);
  return Math.min(0.98, Math.max(0.05, calculated));
}

/**
 * Executes a simulated or real Crate Roll resolving style win vs empty container.
 */
export function executeCrateUnbox(
  crateId: CrateType,
  keyTier: KeyTier,
  wishlistStyleId: string | null,
  availableStyles: FightingStyle[]
): CrateRollResult {
  const crate = CRATE_CATALOG[crateId];
  const key = KEY_TIERS[keyTier];
  const effectiveWinRate = calculateEffectiveWinRate(crateId, keyTier);

  const rollVal = Math.random();
  const isWin = rollVal <= effectiveWinRate;

  if (!isWin) {
    return {
      isWin: false,
      style: null,
      crateType: crateId,
      keyTier,
      effectiveWinRate,
      outcomeMessage: 'Crate Empty — Better Luck Next Time.'
    };
  }

  // Win occurred: Select appropriate style from the crate's candidate pool
  let candidateStyles: FightingStyle[] = [];
  let chosenOriginPool: 'Street' | 'Professional' | 'Fiction' | undefined = undefined;

  if (crateId === 'normal') {
    candidateStyles = availableStyles;
  } else if (crateId === 'striker') {
    candidateStyles = availableStyles.filter(s => {
      const cls = STYLE_CLASSIFICATIONS[s.id];
      return cls && cls.class === 'Striker';
    });
  } else if (crateId === 'grappler') {
    candidateStyles = availableStyles.filter(s => {
      const cls = STYLE_CLASSIFICATIONS[s.id];
      return cls && cls.class === 'Grappler';
    });
  } else if (crateId === 'hybrid') {
    candidateStyles = availableStyles.filter(s => {
      const cls = STYLE_CLASSIFICATIONS[s.id];
      return cls && cls.class === 'Hybrid';
    });
  } else if (crateId === 'origin') {
    // 3 Origin pools (Street 30%, Professional 30%, Fiction 30% relative)
    const originPick = Math.random();
    if (originPick < 0.3333) {
      chosenOriginPool = 'Street';
      candidateStyles = availableStyles.filter(s => STYLE_CLASSIFICATIONS[s.id]?.type === 'Street');
    } else if (originPick < 0.6666) {
      chosenOriginPool = 'Professional';
      candidateStyles = availableStyles.filter(s => STYLE_CLASSIFICATIONS[s.id]?.type === 'Professional');
    } else {
      chosenOriginPool = 'Fiction';
      candidateStyles = availableStyles.filter(s => STYLE_CLASSIFICATIONS[s.id]?.type === 'Fiction');
    }
  }

  // Fallback if filtered pool is empty
  if (candidateStyles.length === 0) {
    candidateStyles = availableStyles;
  }

  // Handle Wishlist boost (+30% relative probability on Normal crate)
  let selectedStyle: FightingStyle;
  let isWishlistedHit = false;

  if (crateId === 'normal' && wishlistStyleId && candidateStyles.some(s => s.id === wishlistStyleId)) {
    const weights = candidateStyles.map(s => (s.id === wishlistStyleId ? 1.30 : 1.0));
    const totalWeight = weights.reduce((acc, w) => acc + w, 0);
    let randWeight = Math.random() * totalWeight;

    let picked = candidateStyles[0];
    for (let i = 0; i < candidateStyles.length; i++) {
      if (randWeight <= weights[i]) {
        picked = candidateStyles[i];
        break;
      }
      randWeight -= weights[i];
    }
    selectedStyle = picked;
    isWishlistedHit = selectedStyle.id === wishlistStyleId;
  } else {
    // Uniform random pick from pool
    const randomIndex = Math.floor(Math.random() * candidateStyles.length);
    selectedStyle = candidateStyles[randomIndex];
    isWishlistedHit = wishlistStyleId === selectedStyle.id;
  }

  return {
    isWin: true,
    style: selectedStyle,
    originPool: chosenOriginPool,
    crateType: crateId,
    keyTier,
    effectiveWinRate,
    outcomeMessage: `Unlocked ${selectedStyle.name}!`,
    isWishlistedHit
  };
}

/**
 * 5-Hour Wishlist Cooldown in milliseconds
 */
export const WISHLIST_COOLDOWN_MS = 5 * 60 * 60 * 1000;

/**
 * 3-Minute Origin Crate Cooldown in milliseconds (per key / unbox)
 */
export const ORIGIN_CRATE_COOLDOWN_MS = 3 * 60 * 1000;
