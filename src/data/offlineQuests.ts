import { KeyTier, PlayerStats } from '../types';

export type OfflineQuestTier = 1 | 2 | 3 | 4 | 5;

export interface OfflineQuest {
  id: string;
  tier: OfflineQuestTier;
  tierName: string;
  tierSubtitle: string;
  tierBadge: string;
  title: string;
  description: string;
  scope: 'single_match' | 'cumulative' | 'round' | 'tournament' | 'streak' | 'multi_style';
  target: number;
  targetUnit: string;
  skipFee: number;
  rewardCash: number;
  rewardKey?: {
    tier: KeyTier;
    count: number;
    label: string;
  };
  extraKeys?: Array<{
    tier: KeyTier;
    count: number;
    label: string;
  }>;
  isRankedOnly?: boolean;
}

export interface UnbrokenGauntletSegment {
  segmentIndex: number; // 1 to 5
  styleId: string;
  styleName: string;
  styleColor: string;
  completedAt: number;
}

export interface UnbrokenGauntletSubProgress {
  currentSegmentWins: number; // 0 to 2 wins in current segment
  currentSegmentStyle: string; // Style used in current 2-win segment
  completedSegments: UnbrokenGauntletSegment[];
  styleHistory: string[]; // Chronological list of completed styleIds
}

export interface OfflineQuestProgressItem {
  current: number;
  completed: boolean;
  claimed: boolean;
  skipped: boolean;
  unlockedAt?: number;
  completedAt?: number;
  claimedAt?: number;
  subProgress?: Record<string, any>;
}

export interface StylePaletteItem {
  id: string;
  name: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export const STYLE_PALETTES: Record<string, StylePaletteItem> = {
  flow_boxing: { id: 'flow_boxing', name: 'Flow Boxing', color: '#00E5FF', bgClass: 'bg-[#00E5FF]', textClass: 'text-[#00E5FF]', borderClass: 'border-[#00E5FF]' },
  street_boxing: { id: 'street_boxing', name: 'Street Boxing', color: '#2E7D32', bgClass: 'bg-[#2E7D32]', textClass: 'text-[#2E7D32]', borderClass: 'border-[#2E7D32]' },
  kyokushin: { id: 'kyokushin', name: 'Kyokushin Karate', color: '#5A6268', bgClass: 'bg-[#5A6268]', textClass: 'text-[#5A6268]', borderClass: 'border-[#5A6268]' },
  slugger: { id: 'slugger', name: 'Slugger', color: '#D35400', bgClass: 'bg-[#D35400]', textClass: 'text-[#D35400]', borderClass: 'border-[#D35400]' },
  aikido: { id: 'aikido', name: 'Aikido', color: '#1B2A47', bgClass: 'bg-[#1B2A47]', textClass: 'text-[#1B2A47]', borderClass: 'border-[#1B2A47]' },
  keysi: { id: 'keysi', name: 'Keysi', color: '#8B0000', bgClass: 'bg-[#8B0000]', textClass: 'text-[#8B0000]', borderClass: 'border-[#8B0000]' },
  iron_boxing: { id: 'iron_boxing', name: 'Iron Boxing', color: '#C0C0C0', bgClass: 'bg-[#C0C0C0]', textClass: 'text-[#C0C0C0]', borderClass: 'border-[#C0C0C0]' },
  cqc: { id: 'cqc', name: 'CQC', color: '#111111', bgClass: 'bg-[#111111]', textClass: 'text-zinc-300', borderClass: 'border-zinc-700' },
  muay_thai: { id: 'muay_thai', name: 'Muay Thai', color: '#E11D48', bgClass: 'bg-[#E11D48]', textClass: 'text-[#E11D48]', borderClass: 'border-[#E11D48]' },
  capoeira: { id: 'capoeira', name: 'Capoeira', color: '#F59E0B', bgClass: 'bg-[#F59E0B]', textClass: 'text-[#F59E0B]', borderClass: 'border-[#F59E0B]' },
  boxing_champion: { id: 'boxing_champion', name: 'Boxing: Champion', color: '#FACC15', bgClass: 'bg-[#FACC15]', textClass: 'text-[#FACC15]', borderClass: 'border-[#FACC15]' },
  bjj: { id: 'bjj', name: 'BJJ', color: '#9333EA', bgClass: 'bg-[#9333EA]', textClass: 'text-[#9333EA]', borderClass: 'border-[#9333EA]' },
  taekwondo: { id: 'taekwondo', name: 'Taekwondo', color: '#06B6D4', bgClass: 'bg-[#06B6D4]', textClass: 'text-[#06B6D4]', borderClass: 'border-[#06B6D4]' },
  street_taekwondo: { id: 'street_taekwondo', name: 'Street Taekwondo', color: '#06B6D4', bgClass: 'bg-[#06B6D4]', textClass: 'text-[#06B6D4]', borderClass: 'border-[#06B6D4]' },
  shotokan: { id: 'shotokan', name: 'Shotokan Karate', color: '#EA580C', bgClass: 'bg-[#EA580C]', textClass: 'text-[#EA580C]', borderClass: 'border-[#EA580C]' },
  ashihara: { id: 'ashihara', name: 'Ashihara Karate', color: '#D97706', bgClass: 'bg-[#D97706]', textClass: 'text-[#D97706]', borderClass: 'border-[#D97706]' },
  kickboxing: { id: 'kickboxing', name: 'Kickboxing', color: '#DC2626', bgClass: 'bg-[#DC2626]', textClass: 'text-[#DC2626]', borderClass: 'border-[#DC2626]' },
  boxing_shell: { id: 'boxing_shell', name: 'Boxing Shell', color: '#475569', bgClass: 'bg-[#475569]', textClass: 'text-[#475569]', borderClass: 'border-[#475569]' },
  basic: { id: 'basic', name: 'Flow Boxing', color: '#64748B', bgClass: 'bg-[#64748B]', textClass: 'text-[#64748B]', borderClass: 'border-[#64748B]' },
};

export function getStyleInfo(styleId: string): StylePaletteItem {
  return STYLE_PALETTES[styleId] || {
    id: styleId,
    name: styleId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    color: '#A1A1AA',
    bgClass: 'bg-zinc-500',
    textClass: 'text-zinc-300',
    borderClass: 'border-zinc-500',
  };
}

export type OfflineQuestProgressMap = Record<string, OfflineQuestProgressItem>;

export interface TierLifecycleConfig {
  tier: OfflineQuestTier;
  capacity: number;
  recycleCooldownMs: number;
  hyperCycleMaxCharges: number;
  hyperCycleRechargeMs: number;
  protectedProgress: boolean;
  tierTitle: string;
  tierBadge: string;
  rewardSpectrum: string;
}

export const TIER_CONFIGS: Record<OfflineQuestTier, TierLifecycleConfig> = {
  1: {
    tier: 1,
    capacity: 3,
    recycleCooldownMs: 5 * 60 * 1000, // 5 minutes
    hyperCycleMaxCharges: 3,
    hyperCycleRechargeMs: 10 * 60 * 1000, // 10 minutes recharge pool
    protectedProgress: true,
    tierTitle: 'Tier 1: Fundamentals',
    tierBadge: 'Common / Fast',
    rewardSpectrum: '+$100 to +$150 Cash • Iron Keys',
  },
  2: {
    tier: 2,
    capacity: 3,
    recycleCooldownMs: 20 * 60 * 1000, // 20 minutes
    hyperCycleMaxCharges: 2,
    hyperCycleRechargeMs: 10 * 60 * 1000, // 10 minutes recharge pool
    protectedProgress: true,
    tierTitle: 'Tier 2: Performance & Execution',
    tierBadge: 'Intermediate',
    rewardSpectrum: '+$180 to +$300 Cash • Iron & Gold Keys',
  },
  3: {
    tier: 3,
    capacity: 2,
    recycleCooldownMs: 60 * 60 * 1000, // 1 hour
    hyperCycleMaxCharges: 0,
    hyperCycleRechargeMs: 0,
    protectedProgress: true,
    tierTitle: 'Tier 3: Archetype Mastery',
    tierBadge: 'Advanced',
    rewardSpectrum: '+$250 to +$500 Cash • Gold Keys',
  },
  4: {
    tier: 4,
    capacity: 1,
    recycleCooldownMs: 3 * 60 * 60 * 1000, // 3 hours (Hard Timer)
    hyperCycleMaxCharges: 0,
    hyperCycleRechargeMs: 0,
    protectedProgress: false,
    tierTitle: 'Tier 4: Apex Gauntlets',
    tierBadge: 'Legendary / Hardcore',
    rewardSpectrum: '+$550 to +$1,200 Cash • Diamond & Obsidian Keys',
  },
  5: {
    tier: 5,
    capacity: 1,
    recycleCooldownMs: 24 * 60 * 60 * 1000, // 24 hours (Daily Hard Timer)
    hyperCycleMaxCharges: 0,
    hyperCycleRechargeMs: 0,
    protectedProgress: false,
    tierTitle: 'Tier 5: Multi-Style Pantheon',
    tierBadge: 'Apex 24h Gauntlet',
    rewardSpectrum: '+$1,200 to +$2,000 Cash • Diamond & Obsidian Keys',
  },
};

export const REVISED_OFFLINE_QUESTS: OfflineQuest[] = [
  // =========================================================================
  // TIER 1: COMBAT FUNDAMENTALS (Common / Fast) - 3 Active Slots
  // =========================================================================
  {
    id: 'parry_rhythm',
    tier: 1,
    tierName: 'Tier 1: Combat Fundamentals',
    tierSubtitle: 'Fast, single-match execution goals.',
    tierBadge: 'Common / Fast',
    title: 'Parry Rhythm',
    description: 'Land 6 Perfect Parries (0.19s) against any AI in a single match.',
    scope: 'single_match',
    target: 6,
    targetUnit: 'Parries',
    skipFee: 50,
    rewardCash: 120,
  },
  {
    id: 'guard_attrition',
    tier: 1,
    tierName: 'Tier 1: Combat Fundamentals',
    tierSubtitle: 'Fast, single-match execution goals.',
    tierBadge: 'Common / Fast',
    title: 'Guard Attrition',
    description: 'Deplete a total of 60 Armor HP (AP) against blocking AI.',
    scope: 'cumulative',
    target: 60,
    targetUnit: 'AP Depleted',
    skipFee: 50,
    rewardCash: 100,
  },
  {
    id: 'counter_precision',
    tier: 1,
    tierName: 'Tier 1: Combat Fundamentals',
    tierSubtitle: 'Fast, single-match execution goals.',
    tierBadge: 'Common / Fast',
    title: 'Counter Precision',
    description: 'Defeat an AI bot while taking fewer than 4 landed hits in a match.',
    scope: 'single_match',
    target: 1,
    targetUnit: 'Match',
    skipFee: 50,
    rewardCash: 150,
    rewardKey: {
      tier: 'iron',
      count: 1,
      label: '1 Iron Key',
    },
  },
  {
    id: 'momentum_striker',
    tier: 1,
    tierName: 'Tier 1: Combat Fundamentals',
    tierSubtitle: 'Fast, single-match execution goals.',
    tierBadge: 'Common / Fast',
    title: 'Momentum Striker',
    description: 'Land a full 4-sequence M1 combo 3 times in a single match.',
    scope: 'single_match',
    target: 3,
    targetUnit: 'Combos',
    skipFee: 50,
    rewardCash: 110,
  },
  {
    id: 'heavy_impact',
    tier: 1,
    tierName: 'Tier 1: Combat Fundamentals',
    tierSubtitle: 'Fast, single-match execution goals.',
    tierBadge: 'Common / Fast',
    title: 'Heavy Impact',
    description: 'Connect with 4 M2 Heavy Strikes on hit against any AI.',
    scope: 'single_match',
    target: 4,
    targetUnit: 'M2 Hits',
    skipFee: 50,
    rewardCash: 125,
  },

  // =========================================================================
  // TIER 2: PERFORMANCE & TARGETED EXECUTION (Intermediate) - 3 Active Slots
  // =========================================================================
  {
    id: 'aiki_elevation',
    tier: 2,
    tierName: 'Tier 2: Performance & Targeted Execution',
    tierSubtitle: 'Single-match tactical goals and performance ratings.',
    tierBadge: 'Intermediate',
    title: 'Aiki Elevation',
    description: 'Land 3 Over-Head Grapple Slams using Aikido in a single match.',
    scope: 'single_match',
    target: 3,
    targetUnit: 'Slams',
    skipFee: 75,
    rewardCash: 200,
    rewardKey: {
      tier: 'iron',
      count: 1,
      label: '1 Iron Key',
    },
  },
  {
    id: 'dominant_opener',
    tier: 2,
    tierName: 'Tier 2: Performance & Targeted Execution',
    tierSubtitle: 'Single-match tactical goals and performance ratings.',
    tierBadge: 'Intermediate',
    title: 'Dominant Opener',
    description: 'Earn an S Grade or higher on Round 1 Evaluation in Ranked AI.',
    scope: 'round',
    target: 1,
    targetUnit: 'Round',
    skipFee: 75,
    rewardCash: 200,
    rewardKey: {
      tier: 'iron',
      count: 1,
      label: '1 Iron Key',
    },
    isRankedOnly: true,
  },
  {
    id: 'technical_series',
    tier: 2,
    tierName: 'Tier 2: Performance & Targeted Execution',
    tierSubtitle: 'Single-match tactical goals and performance ratings.',
    tierBadge: 'Intermediate',
    title: 'Technical Series',
    description: 'Achieve an Overall Match Grade of S in Ranked AI.',
    scope: 'single_match',
    target: 1,
    targetUnit: 'Match',
    skipFee: 75,
    rewardCash: 250,
    rewardKey: {
      tier: 'iron',
      count: 1,
      label: '1 Iron Key',
    },
    isRankedOnly: true,
  },
  {
    id: 'street_pressure',
    tier: 2,
    tierName: 'Tier 2: Performance & Targeted Execution',
    tierSubtitle: 'Single-match tactical goals and performance ratings.',
    tierBadge: 'Intermediate',
    title: 'Street Pressure',
    description: 'Land 15 M1 attacks inside the pocket using Street Boxing in a single match.',
    scope: 'single_match',
    target: 15,
    targetUnit: 'Pocket Hits',
    skipFee: 75,
    rewardCash: 200,
    rewardKey: {
      tier: 'iron',
      count: 1,
      label: '1 Iron Key',
    },
  },
  {
    id: 'the_great_comeback',
    tier: 2,
    tierName: 'Tier 2: Performance & Targeted Execution',
    tierSubtitle: 'Single-match tactical goals and performance ratings.',
    tierBadge: 'Intermediate',
    title: 'The Great Comeback',
    description: 'Win a Ranked AI round with an S Grade after dropping below 25% HP.',
    scope: 'round',
    target: 1,
    targetUnit: 'Round',
    skipFee: 100,
    rewardCash: 300,
    rewardKey: {
      tier: 'gold',
      count: 1,
      label: '1 Gold Key',
    },
    isRankedOnly: true,
  },
  {
    id: 'pure_striker',
    tier: 2,
    tierName: 'Tier 2: Performance & Targeted Execution',
    tierSubtitle: 'Single-match tactical goals and performance ratings.',
    tierBadge: 'Intermediate',
    title: 'Pure Striker',
    description: 'Win a match without using any Grapples or Throws (Striker Class only).',
    scope: 'single_match',
    target: 1,
    targetUnit: 'Match',
    skipFee: 75,
    rewardCash: 180,
    rewardKey: {
      tier: 'iron',
      count: 1,
      label: '1 Iron Key',
    },
  },

  // =========================================================================
  // TIER 3: ARCHETYPE MASTERY & COMPETITION (Advanced) - 2 Active Slots
  // =========================================================================
  {
    id: 'perfectionists_crown',
    tier: 3,
    tierName: 'Tier 3: Archetype Mastery & Competition',
    tierSubtitle: 'Strict style conditions and high-tier competitive goals.',
    tierBadge: 'Advanced',
    title: "Perfectionist's Crown",
    description: 'Achieve an Overall Match Grade of SSS in Ranked AI.',
    scope: 'single_match',
    target: 1,
    targetUnit: 'Match',
    skipFee: 150,
    rewardCash: 450,
    rewardKey: {
      tier: 'gold',
      count: 1,
      label: '1 Gold Key',
    },
    isRankedOnly: true,
  },
  {
    id: 'tournament_conqueror',
    tier: 3,
    tierName: 'Tier 3: Archetype Mastery & Competition',
    tierSubtitle: 'Strict style conditions and high-tier competitive goals.',
    tierBadge: 'Advanced',
    title: 'Tournament Conqueror',
    description: 'Win Tournament 1 (Octagon Knockout) as Champion.',
    scope: 'tournament',
    target: 1,
    targetUnit: 'Championship',
    skipFee: 150,
    rewardCash: 500,
    rewardKey: {
      tier: 'gold',
      count: 1,
      label: '1 Gold Key',
    },
  },
  {
    id: 'shoulder_deflection',
    tier: 3,
    tierName: 'Tier 3: Archetype Mastery & Competition',
    tierSubtitle: 'Strict style conditions and high-tier competitive goals.',
    tierBadge: 'Advanced',
    title: 'Shoulder Deflection',
    description: 'Execute 2 successful M2 Parries using Iron Boxing in a single match.',
    scope: 'single_match',
    target: 2,
    targetUnit: 'M2 Parries',
    skipFee: 100,
    rewardCash: 250,
    rewardKey: {
      tier: 'gold',
      count: 1,
      label: '1 Gold Key',
    },
  },
  {
    id: 'bone_cracker',
    tier: 3,
    tierName: 'Tier 3: Archetype Mastery & Competition',
    tierSubtitle: 'Strict style conditions and high-tier competitive goals.',
    tierBadge: 'Advanced',
    title: 'Bone Cracker',
    description: 'Inflict Bone Fracture 4 times using Slugger in a single match.',
    scope: 'single_match',
    target: 4,
    targetUnit: 'Fractures',
    skipFee: 100,
    rewardCash: 250,
    rewardKey: {
      tier: 'gold',
      count: 1,
      label: '1 Gold Key',
    },
  },
  {
    id: 'grapplers_domain',
    tier: 3,
    tierName: 'Tier 3: Archetype Mastery & Competition',
    tierSubtitle: 'Strict style conditions and high-tier competitive goals.',
    tierBadge: 'Advanced',
    title: "Grappler's Domain",
    description: 'Win 2 Ranked AI matches using only Grappler Class styles (Aikido).',
    scope: 'cumulative',
    target: 2,
    targetUnit: 'Ranked Wins',
    skipFee: 100,
    rewardCash: 260,
    rewardKey: {
      tier: 'gold',
      count: 1,
      label: '1 Gold Key',
    },
    isRankedOnly: true,
  },
  {
    id: 'unbroken_streak',
    tier: 3,
    tierName: 'Tier 3: Archetype Mastery & Competition',
    tierSubtitle: 'Strict style conditions and high-tier competitive goals.',
    tierBadge: 'Advanced',
    title: 'Unbroken Streak',
    description: 'Win 3 consecutive Ranked AI matches without losing a single round.',
    scope: 'streak',
    target: 3,
    targetUnit: 'Clean Matches',
    skipFee: 125,
    rewardCash: 350,
    rewardKey: {
      tier: 'gold',
      count: 1,
      label: '1 Gold Key',
    },
    isRankedOnly: true,
  },

  // =========================================================================
  // TIER 4: THE APEX GAUNTLETS (Legendary / True Hardcore) - 1 Active Slot (3h Hard Timer)
  // =========================================================================
  {
    id: 'pacing_master',
    tier: 4,
    tierName: 'Tier 4: The Apex Gauntlets',
    tierSubtitle: 'Brutal feats of skill, speedruns, and grueling Ranked AI endurance.',
    tierBadge: 'Legendary / True Hardcore',
    title: 'Pacing Master',
    description: 'Win any Ranked AI round in under 20 seconds with an S+ Grade.',
    scope: 'round',
    target: 1,
    targetUnit: 'Round',
    skipFee: 200,
    rewardCash: 600,
    rewardKey: {
      tier: 'diamond',
      count: 1,
      label: '1 Diamond Key',
    },
    isRankedOnly: true,
  },
  {
    id: 'twenty_bot_gauntlet',
    tier: 4,
    tierName: 'Tier 4: The Apex Gauntlets',
    tierSubtitle: 'Brutal feats of skill, speedruns, and grueling Ranked AI endurance.',
    tierBadge: 'Legendary / True Hardcore',
    title: 'The 20-Bot Gauntlet',
    description: 'Defeat a cumulative total of 20 Ranked AI Bots (Ranked AI only).',
    scope: 'cumulative',
    target: 20,
    targetUnit: 'Ranked Bots',
    skipFee: 250,
    rewardCash: 800,
    rewardKey: {
      tier: 'diamond',
      count: 1,
      label: '1 Diamond Key',
    },
    isRankedOnly: true,
  },
  {
    id: 'flawless_sweep',
    tier: 4,
    tierName: 'Tier 4: The Apex Gauntlets',
    tierSubtitle: 'Brutal feats of skill, speedruns, and grueling Ranked AI endurance.',
    tierBadge: 'Legendary / True Hardcore',
    title: 'Flawless Sweep (Obsidian Trial)',
    description: 'Win Tournament 1 without losing a single round across the entire bracket (6-0 round sweep).',
    scope: 'tournament',
    target: 1,
    targetUnit: 'Sweep Championship',
    skipFee: 350,
    rewardCash: 1200,
    rewardKey: {
      tier: 'obsidian',
      count: 1,
      label: '1 Obsidian Key',
    },
  },
  {
    id: 'apex_predator',
    tier: 4,
    tierName: 'Tier 4: The Apex Gauntlets',
    tierSubtitle: 'Brutal feats of skill, speedruns, and grueling Ranked AI endurance.',
    tierBadge: 'Legendary / True Hardcore',
    title: 'Apex Predator',
    description: 'Defeat an Amethyst Tier AI Bot in Ranked AI with an S+ Grade.',
    scope: 'single_match',
    target: 1,
    targetUnit: 'Match',
    skipFee: 250,
    rewardCash: 750,
    rewardKey: {
      tier: 'diamond',
      count: 1,
      label: '1 Diamond Key',
    },
    isRankedOnly: true,
  },
  {
    id: 'master_of_all_trades',
    tier: 4,
    tierName: 'Tier 4: The Apex Gauntlets',
    tierSubtitle: 'Brutal feats of skill, speedruns, and grueling Ranked AI endurance.',
    tierBadge: 'Legendary / True Hardcore',
    title: 'Master of All Trades',
    description: 'Win 1 Ranked AI match with a Striker, 1 with a Grappler, and 1 with a Hybrid.',
    scope: 'cumulative',
    target: 3,
    targetUnit: 'Archetypes',
    skipFee: 175,
    rewardCash: 550,
    rewardKey: {
      tier: 'diamond',
      count: 1,
      label: '1 Diamond Key',
    },
    isRankedOnly: true,
  },

  // =========================================================================
  // TIER 5: MULTI-STYLE PANTHEON (The 24-Hour Gauntlet) - 1 Active Slot (24h Hard Timer)
  // =========================================================================
  {
    id: 'the_octagon_triad',
    tier: 5,
    tierName: 'Tier 5: Multi-Style Pantheon',
    tierSubtitle: 'The 24-Hour Gauntlet of multi-style combat mastery.',
    tierBadge: 'Apex 24h Gauntlet',
    title: 'The Octagon Triad',
    description: 'Win 3 consecutive Ranked AI matches without dropping a single round: Match 1 (Flow Boxing), Match 2 (Kyokushin), and Match 3 (Aikido) — all requiring an individual round evaluation of Grade S+.',
    scope: 'multi_style',
    target: 3,
    targetUnit: 'Triad Bouts',
    skipFee: 500,
    rewardCash: 1600,
    rewardKey: {
      tier: 'obsidian',
      count: 1,
      label: '1 Obsidian Key',
    },
    isRankedOnly: true,
  },
  {
    id: 'clinch_and_shatter',
    tier: 5,
    tierName: 'Tier 5: Multi-Style Pantheon',
    tierSubtitle: 'The 24-Hour Gauntlet of multi-style combat mastery.',
    tierBadge: 'Apex 24h Gauntlet',
    title: 'Clinch & Shatter',
    description: 'In Ranked AI: Inflict Bone Fracture 5 times using Slugger, then switch styles and land 5 Clinch Headbutts using Keysi in the following match.',
    scope: 'multi_style',
    target: 10,
    targetUnit: 'Executions (5 Fracture + 5 Headbutt)',
    skipFee: 400,
    rewardCash: 1200,
    rewardKey: {
      tier: 'diamond',
      count: 1,
      label: '1 Diamond Key',
    },
    extraKeys: [
      {
        tier: 'gold',
        count: 1,
        label: '1 Gold Key',
      },
    ],
    isRankedOnly: true,
  },
  {
    id: 'the_unbroken_gauntlet',
    tier: 5,
    tierName: 'Tier 5: Multi-Style Pantheon',
    tierSubtitle: 'The 24-Hour Gauntlet of multi-style combat mastery.',
    tierBadge: 'Apex 24h Gauntlet',
    title: 'The Unbroken Gauntlet',
    description: 'Defeat 10 consecutive Ranked AI Bots without losing a single round, switching to a different fighting style after every 2 wins.',
    scope: 'multi_style',
    target: 10,
    targetUnit: 'Consecutive Bots',
    skipFee: 600,
    rewardCash: 2000,
    rewardKey: {
      tier: 'obsidian',
      count: 1,
      label: '1 Obsidian Key',
    },
    isRankedOnly: true,
  },
  {
    id: 'discipline_fusion',
    tier: 5,
    tierName: 'Tier 5: Multi-Style Pantheon',
    tierSubtitle: 'The 24-Hour Gauntlet of multi-style combat mastery.',
    tierBadge: 'Apex 24h Gauntlet',
    title: 'Discipline Fusion',
    description: 'Win 3 consecutive Ranked AI matches in a row achieving an Overall Match Grade of SSS: Match 1 with a Striker Class, Match 2 with a Grappler Class, and Match 3 with a Hybrid Class.',
    scope: 'multi_style',
    target: 3,
    targetUnit: 'SSS Tier Bouts',
    skipFee: 550,
    rewardCash: 1800,
    rewardKey: {
      tier: 'obsidian',
      count: 1,
      label: '1 Obsidian Key',
    },
    isRankedOnly: true,
  },
  {
    id: 'total_combat_mastery',
    tier: 5,
    tierName: 'Tier 5: Multi-Style Pantheon',
    tierSubtitle: 'The 24-Hour Gauntlet of multi-style combat mastery.',
    tierBadge: 'Apex 24h Gauntlet',
    title: 'Total Combat Mastery',
    description: 'In Ranked AI: Land 5 M2 Shoulder Parries (Iron Boxing), 3 Over-Head Slams (Aikido), and 6 Unparryable M2 strikes (Street Boxing) across your 24-hour cycle.',
    scope: 'multi_style',
    target: 14,
    targetUnit: 'Techniques (5 Parry + 3 Slam + 6 M2)',
    skipFee: 400,
    rewardCash: 1300,
    rewardKey: {
      tier: 'diamond',
      count: 2,
      label: '2 Diamond Keys',
    },
    isRankedOnly: true,
  },
];

export interface TierRuntimeState {
  nextRecycleTime: number; // Unix timestamp
  hyperCycleCharges: number;
  nextHyperRechargeTime: number; // Unix timestamp
  skipCharges?: number;
  nextSkipRechargeTime?: number; // Unix timestamp
}

export interface OfflineHubState {
  activeSlots: Record<OfflineQuestTier, string[]>;
  tierTimers: Record<OfflineQuestTier, TierRuntimeState>;
  progress: OfflineQuestProgressMap;
}

export const TIER_SKIP_CONFIG: Record<OfflineQuestTier, { maxSkips: number; cooldownMs: number; followsTierCd?: boolean }> = {
  1: { maxSkips: 5, cooldownMs: 60 * 60 * 1000 },
  2: { maxSkips: 5, cooldownMs: 60 * 60 * 1000 },
  3: { maxSkips: 2, cooldownMs: 60 * 60 * 1000 },
  4: { maxSkips: 1, cooldownMs: 60 * 60 * 1000 },
  5: { maxSkips: 1, cooldownMs: 24 * 60 * 60 * 1000, followsTierCd: true },
};

const STORAGE_PREFIX = 'cagebrawl_offline_hub_v6.5_';

export class OfflineQuestManager {
  static getStorageKey(email?: string): string {
    const cleanEmail = email?.trim().toLowerCase() || 'anon_user';
    return `${STORAGE_PREFIX}${cleanEmail}`;
  }

  /**
   * Completely restarts all player quests to update to the latest engine specifications
   */
  static resetAllQuests(email?: string): OfflineHubState {
    const cleanEmail = email?.trim().toLowerCase() || 'anon_user';
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.getStorageKey(email));
      localStorage.removeItem(`cagebrawl_offline_hub_v3.4_${cleanEmail}`);
    }
    const fresh = this.getHubState(email);
    this.saveHubState(email, fresh);
    return fresh;
  }

  static getHubState(email?: string): OfflineHubState {
    const now = Date.now();
    const defaultState: OfflineHubState = {
      activeSlots: {
        1: [],
        2: [],
        3: [],
        4: [],
        5: [],
      },
      tierTimers: {
        1: { nextRecycleTime: now + TIER_CONFIGS[1].recycleCooldownMs, hyperCycleCharges: 3, nextHyperRechargeTime: 0 },
        2: { nextRecycleTime: now + TIER_CONFIGS[2].recycleCooldownMs, hyperCycleCharges: 2, nextHyperRechargeTime: 0 },
        3: { nextRecycleTime: now + TIER_CONFIGS[3].recycleCooldownMs, hyperCycleCharges: 0, nextHyperRechargeTime: 0 },
        4: { nextRecycleTime: now + TIER_CONFIGS[4].recycleCooldownMs, hyperCycleCharges: 0, nextHyperRechargeTime: 0 },
        5: { nextRecycleTime: now + TIER_CONFIGS[5].recycleCooldownMs, hyperCycleCharges: 0, nextHyperRechargeTime: 0 },
      },
      progress: {},
    };

    // Initialize progress map defaults for all quests
    for (const q of REVISED_OFFLINE_QUESTS) {
      defaultState.progress[q.id] = {
        current: 0,
        completed: false,
        claimed: false,
        skipped: false,
      };
    }

    if (typeof localStorage === 'undefined') return defaultState;

    const key = this.getStorageKey(email);
    const saved = localStorage.getItem(key);
    let state = defaultState;

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          state = {
            activeSlots: { ...defaultState.activeSlots, ...parsed.activeSlots },
            tierTimers: { ...defaultState.tierTimers, ...parsed.tierTimers },
            progress: { ...defaultState.progress, ...parsed.progress },
          };
        }
      } catch (e) {
        console.error('Failed to parse offline hub state:', e);
      }
    }

    // Process rotations, timers, protected progress, and capacity
    this.reconcileHubState(state);
    this.saveHubState(email, state);
    return state;
  }

  static saveHubState(email: string | undefined, state: OfflineHubState) {
    if (typeof localStorage === 'undefined') return;
    const key = this.getStorageKey(email);
    localStorage.setItem(key, JSON.stringify(state));

    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('offline_quests_updated', { detail: state }));
      } catch (e) {
        // ignore in non-browser env
      }
    }
  }

  /**
   * Reconciles timers, hyper-cycle recharge, protected progress, and hard timers
   */
  static reconcileHubState(state: OfflineHubState) {
    const now = Date.now();
    const tiers: OfflineQuestTier[] = [1, 2, 3, 4, 5];

    for (const tier of tiers) {
      const config = TIER_CONFIGS[tier];
      const timer = state.tierTimers[tier] || {
        nextRecycleTime: now + config.recycleCooldownMs,
        hyperCycleCharges: config.hyperCycleMaxCharges,
        nextHyperRechargeTime: 0,
      };

      // Check Hyper-Cycle 10-Minute Recharge Pool
      if (config.hyperCycleMaxCharges > 0 && timer.hyperCycleCharges < config.hyperCycleMaxCharges) {
        if (timer.nextHyperRechargeTime <= now && timer.nextHyperRechargeTime > 0) {
          timer.hyperCycleCharges = config.hyperCycleMaxCharges;
          timer.nextHyperRechargeTime = 0;
        }
      }

      // Reconcile Skip Charges & 1-Hour Cooldown
      const skipConfig = TIER_SKIP_CONFIG[tier];
      if (timer.skipCharges === undefined) {
        timer.skipCharges = skipConfig.maxSkips;
        timer.nextSkipRechargeTime = 0;
      }
      if (timer.skipCharges < skipConfig.maxSkips && timer.nextSkipRechargeTime && timer.nextSkipRechargeTime > 0) {
        if (now >= timer.nextSkipRechargeTime) {
          timer.skipCharges = skipConfig.maxSkips;
          timer.nextSkipRechargeTime = 0;
        }
      }

      // Check Recycle Cooldown Expiry
      const isTimerExpired = now >= timer.nextRecycleTime;

      let currentActive = state.activeSlots[tier] || [];

      if (isTimerExpired) {
        // Recycle slots that are NOT protected
        currentActive = currentActive.filter(questId => {
          const p = state.progress[questId];
          const q = REVISED_OFFLINE_QUESTS.find(quest => quest.id === questId);
          if (!q) return false;

          // Hard timer on T4 / T5: No protected progress, wipe and recycle!
          if (!config.protectedProgress) {
            // Reset progress for this quest
            if (p && !p.claimed) {
              p.current = 0;
              p.completed = false;
              p.skipped = false;
            }
            return false;
          }

          // Protected Progress on T1, T2, T3: Keep if partial progress exists and not claimed
          if (p && p.current > 0 && !p.claimed) {
            return true; // Protected!
          }

          return false; // Can recycle
        });

        // Reset timer
        timer.nextRecycleTime = now + config.recycleCooldownMs;
      }

      // Fill empty slots up to capacity with No-Duplicate Guarantee
      const tierQuests = REVISED_OFFLINE_QUESTS.filter(q => q.tier === tier);
      const availableCandidates = tierQuests.filter(q => !currentActive.includes(q.id));

      while (currentActive.length < config.capacity && availableCandidates.length > 0) {
        // Pick random candidate not in use
        const randIdx = Math.floor(Math.random() * availableCandidates.length);
        const chosen = availableCandidates.splice(randIdx, 1)[0];
        currentActive.push(chosen.id);

        // Initialize progress item if needed
        if (!state.progress[chosen.id]) {
          state.progress[chosen.id] = { current: 0, completed: false, claimed: false, skipped: false };
        }
      }

      state.activeSlots[tier] = currentActive;
      state.tierTimers[tier] = timer;
    }
  }

  static getProgress(email?: string): OfflineQuestProgressMap {
    const hub = this.getHubState(email);
    return hub.progress;
  }

  /**
   * Skips a quest by swapping it to a new random quest in the tier.
   * Limitations:
   * - Tier 1: 5 skips before 1-hour CD
   * - Tier 2: 5 skips before 1-hour CD
   * - Tier 3: 2 skips before 1-hour CD
   * - Tier 4: 1 skip before 1-hour CD
   * - Tier 5: 1 skip before following the tier's current cooldown
   */
  static skipQuest(
    email: string | undefined,
    questId: string,
    stats: PlayerStats,
    updateStats: (updates: Partial<PlayerStats>) => void
  ): { success: boolean; message: string; newQuestTitle?: string } {
    const quest = REVISED_OFFLINE_QUESTS.find(q => q.id === questId);
    if (!quest) return { success: false, message: 'Quest not found.' };

    const hub = this.getHubState(email);
    const tier = quest.tier;
    const skipConfig = TIER_SKIP_CONFIG[tier];
    const timer = hub.tierTimers[tier];

    if (timer.skipCharges === undefined) {
      timer.skipCharges = skipConfig.maxSkips;
      timer.nextSkipRechargeTime = 0;
    }

    // Check if skip charges are available
    if (timer.skipCharges <= 0) {
      const now = Date.now();
      const timeLeftMs = Math.max(0, (timer.nextSkipRechargeTime || 0) - now);
      const mins = Math.ceil(timeLeftMs / (60 * 1000));
      return {
        success: false,
        message: `Skip limit reached for Tier ${tier} (${skipConfig.maxSkips}/${skipConfig.maxSkips} used). Recharge in ${mins}m.`,
      };
    }

    const item = hub.progress[questId] || { current: 0, completed: false, claimed: false, skipped: false };

    if (item.completed || item.claimed) {
      return { success: false, message: 'Quest is already completed.' };
    }

    if (stats.cash < quest.skipFee) {
      return { success: false, message: `Insufficient Cash ($${stats.cash} / $${quest.skipFee} required).` };
    }

    // Deduct Cash Fee
    updateStats({
      cash: stats.cash - quest.skipFee,
    });

    // Deduct 1 Skip Charge
    timer.skipCharges--;
    if (timer.skipCharges <= 0) {
      if (skipConfig.followsTierCd) {
        // Tier 5: follows the CD of the tier currently in
        timer.nextSkipRechargeTime = timer.nextRecycleTime;
      } else {
        timer.nextSkipRechargeTime = Date.now() + skipConfig.cooldownMs;
      }
    }

    // Reset progress on the skipped quest
    hub.progress[questId] = { current: 0, completed: false, claimed: false, skipped: false };

    // Find candidates for random swap from this tier (excluding currently active quests)
    const tierQuests = REVISED_OFFLINE_QUESTS.filter(q => q.tier === tier);
    let candidates = tierQuests.filter(q => !hub.activeSlots[tier].includes(q.id) && q.id !== questId);

    if (candidates.length === 0) {
      candidates = tierQuests.filter(q => q.id !== questId);
    }

    if (candidates.length === 0) {
      candidates = tierQuests;
    }

    const replacement = candidates[Math.floor(Math.random() * candidates.length)];

    // Swap in active slots
    hub.activeSlots[tier] = hub.activeSlots[tier].map(id => (id === questId ? replacement.id : id));
    hub.progress[replacement.id] = { current: 0, completed: false, claimed: false, skipped: false };

    this.saveHubState(email, hub);

    const skipsLeft = timer.skipCharges;
    const skipMsg = skipsLeft > 0 
      ? `(${skipsLeft}/${skipConfig.maxSkips} skips left)`
      : `(0/${skipConfig.maxSkips} skips left - 1hr CD active)`;

    return {
      success: true,
      message: `Swapped "${quest.title}" for "${replacement.title}"! ${skipMsg}`,
      newQuestTitle: replacement.title,
    };
  }

  /**
   * Manually abandons an active quest (forfeiting partial progress to free the slot)
   */
  static abandonQuest(
    email: string | undefined,
    questId: string
  ): { success: boolean; message: string } {
    const quest = REVISED_OFFLINE_QUESTS.find(q => q.id === questId);
    if (!quest) return { success: false, message: 'Quest not found.' };

    const hub = this.getHubState(email);
    const tier = quest.tier;
    const active = hub.activeSlots[tier] || [];

    if (!active.includes(questId)) {
      return { success: false, message: 'Quest is not currently active.' };
    }

    // Reset progress
    if (hub.progress[questId]) {
      hub.progress[questId].current = 0;
      hub.progress[questId].completed = false;
      hub.progress[questId].skipped = false;
    }

    // Remove from active slots
    hub.activeSlots[tier] = active.filter(id => id !== questId);

    // Roll replacement if candidate exists
    const candidates = REVISED_OFFLINE_QUESTS.filter(q => q.tier === tier && !hub.activeSlots[tier].includes(q.id) && q.id !== questId);
    if (candidates.length > 0) {
      const nextQ = candidates[Math.floor(Math.random() * candidates.length)];
      hub.activeSlots[tier].push(nextQ.id);
    }

    this.saveHubState(email, hub);
    return { success: true, message: `Abandoned "${quest.title}". A new quest has taken its place.` };
  }

  /**
   * Claims rewards and triggers the Hyper-Cycle engine for instant replacement
   */
  static claimQuest(
    email: string | undefined,
    questId: string,
    stats: PlayerStats,
    updateStats: (updates: Partial<PlayerStats>) => void
  ): { success: boolean; message: string; cash: number; keyText?: string } {
    const quest = REVISED_OFFLINE_QUESTS.find(q => q.id === questId);
    if (!quest) return { success: false, message: 'Quest not found.', cash: 0 };

    const hub = this.getHubState(email);
    const item = hub.progress[questId];

    if (!item || !item.completed) {
      return { success: false, message: 'Quest requirements not yet completed.', cash: 0 };
    }

    if (item.claimed) {
      return { success: false, message: 'Quest rewards already claimed.', cash: 0 };
    }

    // Credit Cash
    let newCash = stats.cash + quest.rewardCash;

    // Credit Key
    const updatedKeys = {
      iron: stats.keys?.iron ?? (stats.rolls ? Math.max(0, stats.rolls) : 2),
      gold: stats.keys?.gold ?? 1,
      diamond: stats.keys?.diamond ?? 0,
      obsidian: stats.keys?.obsidian ?? 0,
    };

    const keyParts: string[] = [];
    if (quest.rewardKey) {
      const kt = quest.rewardKey.tier;
      updatedKeys[kt] = (updatedKeys[kt] || 0) + quest.rewardKey.count;
      keyParts.push(`+${quest.rewardKey.count} ${kt.toUpperCase()} KEY`);
    }

    if (quest.extraKeys) {
      for (const ek of quest.extraKeys) {
        updatedKeys[ek.tier] = (updatedKeys[ek.tier] || 0) + ek.count;
        keyParts.push(`+${ek.count} ${ek.tier.toUpperCase()} KEY`);
      }
    }

    updateStats({
      cash: newCash,
      keys: updatedKeys,
      rolls: (stats.rolls || 0) + (quest.rewardKey ? quest.rewardKey.count : 0),
    });

    item.claimed = true;
    item.claimedAt = Date.now();
    hub.progress[questId] = item;

    // Trigger Hyper-Cycle instant replacement logic
    const tier = quest.tier;
    const config = TIER_CONFIGS[tier];
    const timer = hub.tierTimers[tier];

    if (config.hyperCycleMaxCharges > 0 && timer.hyperCycleCharges > 0) {
      timer.hyperCycleCharges--;
      if (timer.hyperCycleCharges === 0 && timer.nextHyperRechargeTime === 0) {
        timer.nextHyperRechargeTime = Date.now() + config.hyperCycleRechargeMs;
      }

      // Roll replacement immediately into this slot
      hub.activeSlots[tier] = hub.activeSlots[tier].filter(id => id !== questId);
      const candidates = REVISED_OFFLINE_QUESTS.filter(q => q.tier === tier && !hub.activeSlots[tier].includes(q.id) && !hub.progress[q.id]?.claimed);
      if (candidates.length > 0) {
        const replacement = candidates[Math.floor(Math.random() * candidates.length)];
        hub.activeSlots[tier].push(replacement.id);
        if (!hub.progress[replacement.id]) {
          hub.progress[replacement.id] = { current: 0, completed: false, claimed: false, skipped: false };
        }
      }
    }

    this.saveHubState(email, hub);

    const keyText = keyParts.length > 0 ? keyParts.join(' & ') : undefined;
    const fullMsg = `Claimed ${quest.title}! +$${quest.rewardCash}${keyText ? ` & ${keyText}` : ''}`;
    return { success: true, message: fullMsg, cash: quest.rewardCash, keyText };
  }

  /**
   * Claims all ready completed quests in one batch
   */
  static claimAll(
    email: string | undefined,
    stats: PlayerStats,
    updateStats: (updates: Partial<PlayerStats>) => void
  ): { count: number; totalCash: number; keysSummary: string } {
    const hub = this.getHubState(email);
    let totalCash = 0;
    let claimedCount = 0;

    const updatedKeys = {
      iron: stats.keys?.iron ?? (stats.rolls ? Math.max(0, stats.rolls) : 2),
      gold: stats.keys?.gold ?? 1,
      diamond: stats.keys?.diamond ?? 0,
      obsidian: stats.keys?.obsidian ?? 0,
    };

    const keysAdded: Record<string, number> = {};

    for (const q of REVISED_OFFLINE_QUESTS) {
      const item = hub.progress[q.id];
      if (item && item.completed && !item.claimed) {
        item.claimed = true;
        item.claimedAt = Date.now();
        totalCash += q.rewardCash;
        claimedCount++;

        if (q.rewardKey) {
          const kt = q.rewardKey.tier;
          updatedKeys[kt] = (updatedKeys[kt] || 0) + q.rewardKey.count;
          keysAdded[kt] = (keysAdded[kt] || 0) + q.rewardKey.count;
        }

        if (q.extraKeys) {
          for (const ek of q.extraKeys) {
            updatedKeys[ek.tier] = (updatedKeys[ek.tier] || 0) + ek.count;
            keysAdded[ek.tier] = (keysAdded[ek.tier] || 0) + ek.count;
          }
        }
      }
    }

    if (claimedCount > 0) {
      this.reconcileHubState(hub);
      this.saveHubState(email, hub);
      updateStats({
        cash: stats.cash + totalCash,
        keys: updatedKeys,
      });
    }

    const keySummaryParts = Object.entries(keysAdded).map(([k, count]) => `+${count} ${k.toUpperCase()}`);
    const keysSummary = keySummaryParts.length > 0 ? keySummaryParts.join(', ') : '';

    return { count: claimedCount, totalCash, keysSummary };
  }

  /**
   * Records match/round results against AI bots to progress offline quests
   * Implements Section 6.5: Strict Isolation, Round Loss Reset Hook, and T5 Unbroken Gauntlet Engine
   */
  static recordAiMatchResult(
    email: string | undefined,
    event: {
      isRankedAi: boolean;
      isTournament: boolean;
      isCasualAi: boolean;
      isWin: boolean;
      playerWonMatch: boolean;
      roundsWonPlayer: number;
      roundsWonAi: number;
      playerLostRound?: boolean;
      totalHitsTaken: number;
      parriesLanded: number;
      heaviesLanded: number;
      m1CombosCompleted: number;
      armorDamageDealt: number;
      overheadGrappleSlams: number;
      m1PocketHits: number;
      ironBoxingM2Parries: number;
      sluggerBoneFractures: number;
      keysiClinchHeadbutts?: number;
      streetBoxingUnparryableM2?: number;
      usedAikidoGrapple: boolean;
      usedStrikerOnlyNoGrapple: boolean;
      usedStreetBoxing: boolean;
      usedIronBoxing: boolean;
      usedSlugger: boolean;
      usedKeysi?: boolean;
      playerStyleId?: string;
      playerStyleClass?: 'Striker' | 'Grappler' | 'Hybrid';
      round1Grade?: string; // 'S+' | 'S' | 'A' ...
      overallMatchGrade?: string; // 'SSS' | 'SS' | 'S' ...
      clutchLowHpRoundWin?: boolean;
      fastRoundWinUnder20sWithSPlus?: boolean;
      tournamentChampion?: boolean;
      tournamentCleanSweep6_0?: boolean;
      opponentTier?: string;
      currentStreakWithoutLosingRound?: number;
    }
  ) {
    const hub = this.getHubState(email);
    let changed = false;

    // 6.5.1 STRICT PROGRESS ISOLATION: Telemetry only updates active quests in displayed slots
    const allActiveIds = new Set(Object.values(hub.activeSlots).flat());

    const updateItem = (id: string, delta: number, isAbsolute: boolean = false) => {
      // Must be currently active in one of the 10 slots
      if (!allActiveIds.has(id)) return;

      const q = REVISED_OFFLINE_QUESTS.find(quest => quest.id === id);
      if (!q) return;
      const item = hub.progress[id] || { current: 0, completed: false, claimed: false, skipped: false };
      if (item.claimed || item.skipped) return;

      const prev = item.current;
      item.current = isAbsolute ? Math.max(item.current, delta) : item.current + delta;
      if (item.current >= q.target) {
        item.current = q.target;
        item.completed = true;
        item.completedAt = Date.now();
      }
      if (item.current !== prev) changed = true;
    };

    // 6.5.1 STRICT FAILURE HOOK: Dropping a round instantly wipes streak-based quests
    const droppedRound = (event.roundsWonAi > 0) || Boolean(event.playerLostRound) || (!event.isWin && (event.isRankedAi || event.isTournament));

    if (droppedRound) {
      if (allActiveIds.has('unbroken_streak')) {
        const item = hub.progress['unbroken_streak'];
        if (item && item.current > 0 && !item.completed) {
          item.current = 0;
          changed = true;
        }
      }

      if (allActiveIds.has('the_unbroken_gauntlet')) {
        const item = hub.progress['the_unbroken_gauntlet'];
        if (item && item.current > 0 && !item.completed) {
          item.current = 0;
          item.subProgress = {
            currentSegmentWins: 0,
            currentSegmentStyle: '',
            completedSegments: [],
            styleHistory: [],
          };
          changed = true;
        }
      }

      if (allActiveIds.has('discipline_fusion')) {
        const item = hub.progress['discipline_fusion'];
        if (item && item.current > 0 && !item.completed) {
          localStorage.removeItem(`pantheon_fusion_${email || 'anon'}`);
          item.current = 0;
          changed = true;
        }
      }
    }

    // TIER 1
    if (event.parriesLanded >= 6) updateItem('parry_rhythm', 6, true);
    if (event.armorDamageDealt > 0) updateItem('guard_attrition', event.armorDamageDealt);
    if (event.isWin && event.totalHitsTaken < 4) updateItem('counter_precision', 1, true);
    if (event.m1CombosCompleted >= 3) updateItem('momentum_striker', 3, true);
    if (event.heaviesLanded >= 4) updateItem('heavy_impact', 4, true);

    // TIER 2
    if (event.usedAikidoGrapple && event.overheadGrappleSlams >= 3) updateItem('aiki_elevation', 3, true);
    if (event.isRankedAi && (event.round1Grade === 'S+' || event.round1Grade === 'S')) updateItem('dominant_opener', 1, true);
    if (event.isRankedAi && (event.overallMatchGrade === 'SSS' || event.overallMatchGrade === 'SS' || event.overallMatchGrade === 'S')) updateItem('technical_series', 1, true);
    if (event.usedStreetBoxing && event.m1PocketHits >= 15) updateItem('street_pressure', 15, true);
    if (event.isRankedAi && event.clutchLowHpRoundWin) updateItem('the_great_comeback', 1, true);
    if (event.isWin && event.usedStrikerOnlyNoGrapple) updateItem('pure_striker', 1, true);

    // TIER 3
    if (event.isRankedAi && event.overallMatchGrade === 'SSS') updateItem('perfectionists_crown', 1, true);
    if (event.isTournament && event.tournamentChampion) updateItem('tournament_conqueror', 1, true);
    if (event.usedIronBoxing && event.ironBoxingM2Parries >= 2) updateItem('shoulder_deflection', 2, true);
    if (event.usedSlugger && event.sluggerBoneFractures >= 4) updateItem('bone_cracker', 4, true);
    if (event.isRankedAi && event.isWin && event.playerStyleClass === 'Grappler') updateItem('grapplers_domain', 1);
    if (event.isRankedAi && event.isWin && (event.roundsWonAi || 0) === 0 && (event.currentStreakWithoutLosingRound || 0) >= 3) {
      updateItem('unbroken_streak', 3, true);
    }

    // TIER 4
    if (event.isRankedAi && event.fastRoundWinUnder20sWithSPlus) updateItem('pacing_master', 1, true);
    if (event.isRankedAi && event.isWin) updateItem('twenty_bot_gauntlet', 1);
    if (event.isTournament && event.tournamentCleanSweep6_0) updateItem('flawless_sweep', 1, true);
    if (event.isRankedAi && event.isWin && event.opponentTier === 'amethyst' && (event.overallMatchGrade === 'SSS' || event.overallMatchGrade === 'S+')) updateItem('apex_predator', 1, true);
    if (event.isRankedAi && event.isWin && event.playerStyleClass && allActiveIds.has('master_of_all_trades')) {
      const savedArch = localStorage.getItem(`moat_tracker_${email || 'anon'}`) || '';
      const set = new Set(savedArch.split(',').filter(Boolean));
      set.add(event.playerStyleClass);
      localStorage.setItem(`moat_tracker_${email || 'anon'}`, Array.from(set).join(','));
      updateItem('master_of_all_trades', set.size, true);
    }

    // TIER 5 (MULTI-STYLE PANTHEON)
    // 1. The Octagon Triad (Flow Boxing -> Kyokushin -> Aikido with Grade S+)
    if (allActiveIds.has('the_octagon_triad') && event.isRankedAi && event.isWin && (event.round1Grade === 'S+' || event.overallMatchGrade === 'SSS' || event.overallMatchGrade === 'S+')) {
      const triadKey = `pantheon_triad_${email || 'anon'}`;
      let triadState = parseInt(localStorage.getItem(triadKey) || '0', 10);
      const styleId = event.playerStyleId;

      if (triadState === 0 && (styleId === 'basic' || styleId === 'flow_boxing')) {
        triadState = 1;
      } else if (triadState === 1 && (styleId === 'kyokushin' || styleId === 'kickboxing')) {
        triadState = 2;
      } else if (triadState === 2 && styleId === 'aikido') {
        triadState = 3;
      }
      localStorage.setItem(triadKey, triadState.toString());
      updateItem('the_octagon_triad', triadState, true);
    }

    // 2. Clinch & Shatter (5 Fracture Slugger + 5 Clinch Headbutts Keysi)
    if (allActiveIds.has('clinch_and_shatter') && event.isRankedAi) {
      let sluggerCount = event.sluggerBoneFractures || (event.usedSlugger ? 1 : 0);
      let keysiCount = event.keysiClinchHeadbutts || (event.usedKeysi ? 1 : 0);
      if (sluggerCount > 0 || keysiCount > 0) {
        updateItem('clinch_and_shatter', sluggerCount + keysiCount);
      }
    }

    // 3. 6.5.2 THE UNBROKEN GAUNTLET (10 Bots, 5 Segments of 2 Wins, 3-Cycle Style Cooldown Memory & Generous Mercy Rule)
    if (allActiveIds.has('the_unbroken_gauntlet') && event.isRankedAi && event.isWin && (event.roundsWonAi || 0) === 0 && !event.playerLostRound) {
      const gauntletItem = hub.progress['the_unbroken_gauntlet'] || { current: 0, completed: false, claimed: false, skipped: false };
      if (!gauntletItem.completed && !gauntletItem.claimed) {
        const sub: UnbrokenGauntletSubProgress = (gauntletItem.subProgress as any) || {
          currentSegmentWins: 0,
          currentSegmentStyle: '',
          completedSegments: [],
          styleHistory: [],
        };
        if (!sub.completedSegments) sub.completedSegments = [];
        if (!sub.styleHistory) sub.styleHistory = [];

        const currentStyle = event.playerStyleId || 'basic';

        if (sub.currentSegmentWins === 0) {
          // Starting a new 2-win segment: Check 3-Cycle Style Cooldown Memory Buffer
          const recent3 = sub.styleHistory.slice(-3);
          const isInCooldown = recent3.includes(currentStyle);

          if (isInCooldown) {
            // Generous Mercy Rule: Progress NOT reset, but win does NOT count
            // Player must switch to a different, eligible style
          } else {
            // Valid 1st Win of this segment
            sub.currentSegmentStyle = currentStyle;
            sub.currentSegmentWins = 1;
            gauntletItem.current = sub.completedSegments.length * 2 + 1;
            gauntletItem.subProgress = sub;
            changed = true;
          }
        } else if (sub.currentSegmentWins === 1) {
          // Win 2 of current segment: Must be played with the same style as Win 1
          if (currentStyle === sub.currentSegmentStyle) {
            // Valid 2nd Win! Complete this 2-bot segment
            const info = getStyleInfo(currentStyle);
            sub.completedSegments.push({
              segmentIndex: sub.completedSegments.length + 1,
              styleId: currentStyle,
              styleName: info.name,
              styleColor: info.color,
              completedAt: Date.now(),
            });
            sub.styleHistory.push(currentStyle);
            sub.currentSegmentWins = 0;
            sub.currentSegmentStyle = '';

            gauntletItem.current = sub.completedSegments.length * 2;
            if (gauntletItem.current >= 10) {
              gauntletItem.current = 10;
              gauntletItem.completed = true;
              gauntletItem.completedAt = Date.now();
            }
            gauntletItem.subProgress = sub;
            changed = true;
          } else {
            // Generous Mercy Rule: Played with different style before finishing 2nd win of this segment
            // Progress NOT reset, but win does NOT count
          }
        }
      }
    }

    // 4. Discipline Fusion (3 consecutive SSS: Striker -> Grappler -> Hybrid)
    if (allActiveIds.has('discipline_fusion') && event.isRankedAi && event.isWin && (event.overallMatchGrade === 'SSS' || event.round1Grade === 'S+')) {
      const fusionKey = `pantheon_fusion_${email || 'anon'}`;
      let fusionState = parseInt(localStorage.getItem(fusionKey) || '0', 10);
      if (fusionState === 0 && event.playerStyleClass === 'Striker') fusionState = 1;
      else if (fusionState === 1 && event.playerStyleClass === 'Grappler') fusionState = 2;
      else if (fusionState === 2 && event.playerStyleClass === 'Hybrid') fusionState = 3;
      localStorage.setItem(fusionKey, fusionState.toString());
      updateItem('discipline_fusion', fusionState, true);
    }

    // 5. Total Combat Mastery (5 Iron Boxing parries, 3 Aikido slams, 6 Street Boxing M2s)
    if (allActiveIds.has('total_combat_mastery') && event.isRankedAi) {
      const techTotal = (event.ironBoxingM2Parries || 0) + (event.overheadGrappleSlams || 0) + (event.streetBoxingUnparryableM2 || 0);
      if (techTotal > 0) {
        updateItem('total_combat_mastery', techTotal);
      }
    }

    if (changed) {
      this.saveHubState(email, hub);
    }
  }
}
