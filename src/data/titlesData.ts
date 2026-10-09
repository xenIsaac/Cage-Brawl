import { PlayerStats } from '../types';
import { CareerMilestoneManager } from './careerMilestones';

export type TitleRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'obsidian';

export interface TitleItem {
  id: string;
  name: string;
  category: 'career' | 'ranked_pvp' | 'ranked_ai' | 'tournaments' | 'pantheon' | 'style';
  rarity: TitleRarity;
  description: string;
  glowClass: string;
  tagStyleClass: string;
  accentColor: string;
}

export const TITLES_CATALOG: TitleItem[] = [
  // =========================================================================
  // 1. SECTION 6.4: MASTER OFFLINE CAREER MILESTONES TITLES (THE ONLY AI TITLES)
  // =========================================================================
  {
    id: 'Dojo Master',
    name: 'Dojo Master',
    category: 'ranked_ai',
    rarity: 'epic',
    description: 'Defeat 500 AI Opponents in singleplayer combat (The Bot Slayer Stage 6).',
    glowClass: 'shadow-slate-300/30 text-slate-100 border-slate-300',
    tagStyleClass: 'bg-gradient-to-r from-zinc-200 via-white to-zinc-300 text-black font-black shadow-[0_0_15px_rgba(255,255,255,0.7)]',
    accentColor: '#ffffff',
  },
  {
    id: 'Grand Legend',
    name: 'Grand Legend',
    category: 'ranked_ai',
    rarity: 'obsidian',
    description: 'Defeat 1,000 AI Opponents in singleplayer combat (The Bot Slayer Stage 7).',
    glowClass: 'shadow-amber-500/50 text-amber-300 border-yellow-400',
    tagStyleClass: 'bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 text-black font-black shadow-[0_0_22px_rgba(245,158,11,0.85)] ring-1 ring-yellow-400/80 animate-pulse',
    accentColor: '#f59e0b',
  },
  {
    id: 'Immortal Fighter',
    name: 'Immortal Fighter',
    category: 'ranked_ai',
    rarity: 'obsidian',
    description: 'Win 250 Ranked AI matches (Ranked AI Ladder Climber Stage 6).',
    glowClass: 'shadow-red-500/50 text-amber-300 border-red-500',
    tagStyleClass: 'bg-gradient-to-r from-red-600 via-amber-400 to-yellow-500 text-black font-black shadow-[0_0_22px_rgba(245,158,11,0.85)] ring-1 ring-red-400 animate-pulse',
    accentColor: '#ef4444',
  },
  {
    id: 'Deflection God',
    name: 'Deflection God',
    category: 'ranked_ai',
    rarity: 'legendary',
    description: 'Land 250 0.19s Perfect Parries against AI opponents (The Iron Wall Stage 5).',
    glowClass: 'shadow-cyan-400/40 text-cyan-300 border-cyan-400',
    tagStyleClass: 'bg-gradient-to-r from-cyan-400 via-sky-200 to-cyan-500 text-black font-black shadow-[0_0_20px_rgba(6,182,212,0.8)] animate-pulse',
    accentColor: '#06b6d4',
  },
  {
    id: 'Untouchable',
    name: 'Untouchable',
    category: 'ranked_ai',
    rarity: 'obsidian',
    description: 'Land 500 0.19s Perfect Parries against AI opponents (The Iron Wall Stage 6).',
    glowClass: 'shadow-slate-200/50 text-cyan-200 border-white',
    tagStyleClass: 'bg-gradient-to-r from-slate-200 via-white to-cyan-300 text-black font-black shadow-[0_0_22px_rgba(255,255,255,0.85)] ring-1 ring-cyan-300 animate-pulse',
    accentColor: '#ffffff',
  },
  {
    id: 'Cataclysmic Force',
    name: 'Cataclysmic Force',
    category: 'ranked_ai',
    rarity: 'obsidian',
    description: 'Land 500 M2 Heavy Strikes on hit against AI opponents (Heavy Impact Stage 5).',
    glowClass: 'shadow-orange-500/50 text-orange-200 border-red-500',
    tagStyleClass: 'bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 text-white font-black shadow-[0_0_22px_rgba(239,68,68,0.85)] ring-1 ring-amber-400 animate-pulse',
    accentColor: '#f97316',
  },
  {
    id: 'Dynasty',
    name: 'Dynasty',
    category: 'tournaments',
    rarity: 'obsidian',
    description: 'Win 50 championships in Tournament 1 Octagon Knockout (Tournament Glory Stage 4).',
    glowClass: 'shadow-purple-500/50 text-white border-purple-400',
    tagStyleClass: 'bg-black text-white border-2 border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.9)] ring-1 ring-purple-300 animate-pulse font-black',
    accentColor: '#a855f7',
  },
  {
    id: 'Absolute Perfection',
    name: 'Absolute Perfection',
    category: 'ranked_ai',
    rarity: 'obsidian',
    description: 'Earn 50 SSS Rounds strictly against Amethyst Tier or Above AI (Flawless Mastery Stage 3).',
    glowClass: 'shadow-fuchsia-500/50 text-fuchsia-200 border-fuchsia-400',
    tagStyleClass: 'bg-gradient-to-r from-purple-600 via-fuchsia-400 to-purple-800 text-white font-black shadow-[0_0_22px_rgba(168,85,247,0.9)] ring-1 ring-fuchsia-300 animate-pulse',
    accentColor: '#d946ef',
  },
  {
    id: 'Flawless Comboist',
    name: 'Flawless Comboist',
    category: 'ranked_ai',
    rarity: 'obsidian',
    description: 'Land 500 Full M1 S1-S4 Combo Chains without missing or whiffing (Combo Specialist Stage 4).',
    glowClass: 'shadow-teal-400/40 text-cyan-200 border-cyan-400',
    tagStyleClass: 'bg-gradient-to-r from-cyan-500 via-teal-300 to-cyan-600 text-black font-black shadow-[0_0_20px_rgba(6,182,212,0.8)] animate-pulse',
    accentColor: '#0ea5e9',
  },
  {
    id: 'Fists of Fury',
    name: 'Fists of Fury',
    category: 'ranked_ai',
    rarity: 'obsidian',
    description: 'Land 3,000 cumulative M1 Strikes on target (Striking Volume Stage 5 - Ceiling Cap).',
    glowClass: 'shadow-amber-500/50 text-amber-200 border-orange-500',
    tagStyleClass: 'bg-gradient-to-r from-orange-600 via-amber-400 to-red-600 text-white font-black shadow-[0_0_22px_rgba(249,115,22,0.85)] ring-1 ring-orange-400 animate-pulse',
    accentColor: '#fb923c',
  },
  {
    id: 'Unbreakable Bastion',
    name: 'Unbreakable Bastion',
    category: 'ranked_ai',
    rarity: 'obsidian',
    description: 'Absorb 2,500 incoming enemy strikes cleanly while holding Block (The Bastion Stage 4).',
    glowClass: 'shadow-blue-500/50 text-sky-200 border-blue-400',
    tagStyleClass: 'bg-gradient-to-r from-blue-700 via-sky-400 to-slate-200 text-black font-black shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-pulse',
    accentColor: '#3b82f6',
  },

  // =========================================================================
  // 2. ONLINE PVP & DIVISION ELO TITLES
  // =========================================================================
  {
    id: 'Contender',
    name: 'Contender',
    category: 'ranked_pvp',
    rarity: 'common',
    description: 'Complete 5 Online PvP Matches.',
    glowClass: 'shadow-zinc-600/20 text-zinc-300 border-zinc-600/40',
    tagStyleClass: 'bg-zinc-900 text-zinc-300 border-zinc-700',
    accentColor: '#a1a1aa',
  },
  {
    id: 'Gladiator',
    name: 'Gladiator',
    category: 'ranked_pvp',
    rarity: 'rare',
    description: 'Win 15 Online Ranked Matches.',
    glowClass: 'shadow-orange-500/20 text-orange-400 border-orange-500/40',
    tagStyleClass: 'bg-orange-950/80 text-orange-300 border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.3)]',
    accentColor: '#f97316',
  },
  {
    id: 'Clutch King',
    name: 'Clutch King',
    category: 'ranked_pvp',
    rarity: 'epic',
    description: 'Win 3 Ranked PvP matches while under 20% Health.',
    glowClass: 'shadow-red-500/30 text-red-400 border-red-500/50',
    tagStyleClass: 'bg-red-950/90 text-red-300 border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.4)]',
    accentColor: '#ef4444',
  },
  {
    id: 'Apex Predator',
    name: 'Apex Predator',
    category: 'ranked_pvp',
    rarity: 'legendary',
    description: 'Win 50 total Online PvP Matches.',
    glowClass: 'shadow-red-600/30 text-red-300 border-red-500/60',
    tagStyleClass: 'bg-gradient-to-r from-red-950 via-zinc-900 to-red-950 text-red-200 border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.5)]',
    accentColor: '#dc2626',
  },
  {
    id: 'Undefeated',
    name: 'Undefeated',
    category: 'ranked_pvp',
    rarity: 'mythic',
    description: 'Achieve a 5-win streak in Ranked PvP.',
    glowClass: 'shadow-amber-500/40 text-amber-300 border-amber-400',
    tagStyleClass: 'bg-gradient-to-r from-amber-950 via-yellow-900 to-amber-950 text-amber-200 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-pulse',
    accentColor: '#f59e0b',
  },
  {
    id: 'Steel Aegis',
    name: 'Steel Aegis',
    category: 'ranked_pvp',
    rarity: 'epic',
    description: 'Land 40 Perfect Parries in Ranked PvP.',
    glowClass: 'shadow-cyan-600/30 text-cyan-400 border-cyan-500/40',
    tagStyleClass: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.4)]',
    accentColor: '#06b6d4',
  },
  {
    id: 'Bronze Fist',
    name: 'Bronze Fist',
    category: 'ranked_pvp',
    rarity: 'common',
    description: 'Reach 500+ ELO in Ranked Division.',
    glowClass: 'shadow-amber-700/20 text-amber-600 border-amber-700/40',
    tagStyleClass: 'bg-amber-950/60 text-amber-400 border-amber-700/60 shadow-inner',
    accentColor: '#d97706',
  },
  {
    id: 'Silver Striker',
    name: 'Silver Striker',
    category: 'ranked_pvp',
    rarity: 'rare',
    description: 'Reach 700+ ELO in Ranked Division.',
    glowClass: 'shadow-slate-400/20 text-slate-300 border-slate-400/40',
    tagStyleClass: 'bg-slate-900/90 text-slate-200 border-slate-400/60 shadow-[0_0_10px_rgba(203,213,225,0.3)]',
    accentColor: '#cbd5e1',
  },
  {
    id: 'Golden Elite',
    name: 'Golden Elite',
    category: 'ranked_pvp',
    rarity: 'epic',
    description: 'Reach 1,000+ ELO in Ranked Division.',
    glowClass: 'shadow-yellow-500/30 text-yellow-300 border-yellow-500/50',
    tagStyleClass: 'bg-gradient-to-r from-yellow-950 via-amber-900 to-yellow-950 text-yellow-200 border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.4)]',
    accentColor: '#eab308',
  },
  {
    id: 'Diamond Brawler',
    name: 'Diamond Brawler',
    category: 'ranked_pvp',
    rarity: 'legendary',
    description: 'Reach 1,600+ ELO in Ranked Division.',
    glowClass: 'shadow-cyan-500/30 text-cyan-300 border-cyan-400/50',
    tagStyleClass: 'bg-gradient-to-r from-cyan-950 via-sky-900 to-cyan-950 text-cyan-200 border-cyan-400 shadow-[0_0_18px_rgba(6,182,212,0.5)]',
    accentColor: '#06b6d4',
  },
  {
    id: 'Amethyst Grandmaster',
    name: 'Amethyst Grandmaster',
    category: 'ranked_pvp',
    rarity: 'mythic',
    description: 'Reach 1,850+ ELO in Ranked Division.',
    glowClass: 'shadow-purple-500/40 text-purple-300 border-purple-400/60',
    tagStyleClass: 'bg-gradient-to-r from-purple-950 via-fuchsia-950 to-purple-950 text-purple-200 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.6)] animate-pulse',
    accentColor: '#a855f7',
  },
  {
    id: 'Obsidian God',
    name: 'Obsidian God',
    category: 'ranked_pvp',
    rarity: 'obsidian',
    description: 'Reach 2,000+ ELO in Ranked Division.',
    glowClass: 'shadow-zinc-500/50 text-white border-zinc-300',
    tagStyleClass: 'bg-gradient-to-r from-black via-zinc-900 to-black text-white border-white shadow-[0_0_25px_rgba(255,255,255,0.8)] ring-1 ring-white/50 animate-pulse',
    accentColor: '#ffffff',
  },

  // =========================================================================
  // 3. CAREER, GACHA & STYLES
  // =========================================================================
  {
    id: 'Octagon Victor',
    name: 'Octagon Victor',
    category: 'career',
    rarity: 'common',
    description: 'Win your very first match in any game mode.',
    glowClass: 'shadow-emerald-500/20 text-emerald-400 border-emerald-500/40',
    tagStyleClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]',
    accentColor: '#10b981',
  },
  {
    id: 'Collector',
    name: 'Collector',
    category: 'career',
    rarity: 'rare',
    description: 'Perform 25 Style rolls in the Gacha Shop.',
    glowClass: 'shadow-blue-500/20 text-blue-400 border-blue-500/40',
    tagStyleClass: 'bg-blue-950/80 text-blue-300 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]',
    accentColor: '#3b82f6',
  },
  {
    id: 'Freak of Nature',
    name: 'Freak of Nature',
    category: 'career',
    rarity: 'rare',
    description: 'Roll a fighter height under 4\'6" or over 6\'7".',
    glowClass: 'shadow-pink-500/20 text-pink-400 border-pink-500/40',
    tagStyleClass: 'bg-pink-950/80 text-pink-300 border-pink-500/50 shadow-[0_0_10px_rgba(236,72,153,0.3)]',
    accentColor: '#ec4899',
  },
  {
    id: 'Legendary',
    name: 'Legendary',
    category: 'style',
    rarity: 'legendary',
    description: 'Equip any Legendary Style (Capoeira, Boxing: Champion, BJJ).',
    glowClass: 'shadow-amber-500/30 text-amber-300 border-amber-500/50',
    tagStyleClass: 'bg-gradient-to-r from-amber-950 via-yellow-950 to-amber-950 text-amber-300 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-pulse',
    accentColor: '#f59e0b',
  },
  {
    id: 'Pantheon Sovereign',
    name: 'Pantheon Sovereign',
    category: 'pantheon',
    rarity: 'obsidian',
    description: 'Conquer the 24-Hour Tier 5 Multi-Style Pantheon trial.',
    glowClass: 'shadow-emerald-500/50 text-emerald-200 border-emerald-300',
    tagStyleClass: 'bg-gradient-to-r from-emerald-950 via-black to-emerald-950 text-emerald-200 border-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.7)] ring-1 ring-emerald-400/40 animate-pulse',
    accentColor: '#34d399',
  },
];

export const AVATAR_OPTIONS = [
  { id: 'brawler_dragon', name: 'Dragon Soul', icon: '🐉', color: 'from-red-600 to-amber-600' },
  { id: 'iron_tiger', name: 'Iron Tiger', icon: '🐯', color: 'from-amber-600 to-yellow-500' },
  { id: 'cyber_skull', name: 'Cyber Skull', icon: '💀', color: 'from-cyan-600 to-blue-600' },
  { id: 'phoenix_flame', name: 'Phoenix Blaze', icon: '🔥', color: 'from-orange-600 to-red-600' },
  { id: 'shadow_ronin', name: 'Shadow Ronin', icon: '⚔️', color: 'from-purple-600 to-indigo-600' },
  { id: 'golden_champ', name: 'Gold Champion', icon: '👑', color: 'from-yellow-500 to-amber-600' },
  { id: 'octagon_fist', name: 'Iron Fist', icon: '🥊', color: 'from-zinc-600 to-zinc-400' },
  { id: 'viper_strike', name: 'Viper Protocol', icon: '🐍', color: 'from-emerald-600 to-teal-600' },
];

export const AVATAR_FRAMES = [
  { id: 'classic', name: 'Standard Zinc', borderClass: 'border-zinc-700' },
  { id: 'bronze', name: 'Bronze Contender', borderClass: 'border-amber-700 shadow-[0_0_10px_rgba(180,83,9,0.4)]' },
  { id: 'silver', name: 'Silver Gladiator', borderClass: 'border-slate-400 shadow-[0_0_12px_rgba(203,213,225,0.4)]' },
  { id: 'gold', name: 'Golden Champion', borderClass: 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)] ring-1 ring-yellow-400/50' },
  { id: 'diamond', name: 'Diamond Apex', borderClass: 'border-cyan-400 shadow-[0_0_18px_rgba(6,182,212,0.6)] ring-1 ring-cyan-400/60' },
  { id: 'obsidian', name: 'Obsidian Void', borderClass: 'border-purple-400 shadow-[0_0_22px_rgba(168,85,247,0.7)] ring-2 ring-purple-400/80 animate-pulse' },
];

export function isTitleUnlocked(titleName: string, stats: PlayerStats, email?: string): boolean {
  if (!stats) return false;
  const list = stats.unlockedTitles || [];
  if (list.includes(titleName)) return true;

  // Real-time evaluation from Career Milestones Engine
  const mState = CareerMilestoneManager.getState(email, stats);

  switch (titleName) {
    // 11 Master AI Milestone Titles (The only AI titles)
    case 'Dojo Master':
      return (mState.counts.totalAiKnockouts || 0) >= 500;
    case 'Grand Legend':
      return (mState.counts.totalAiKnockouts || 0) >= 1000;
    case 'Immortal Fighter':
      return (mState.counts.rankedAiWins || 0) >= 250;
    case 'Deflection God':
      return (mState.counts.totalPerfectParries || 0) >= 250;
    case 'Untouchable':
      return (mState.counts.totalPerfectParries || 0) >= 500;
    case 'Cataclysmic Force':
      return (mState.counts.totalM2Hits || 0) >= 500;
    case 'Dynasty':
      return (mState.counts.tournament1Wins || 0) >= 50;
    case 'Absolute Perfection':
      return (mState.counts.amethystSssRounds || 0) >= 50;
    case 'Flawless Comboist':
      return (mState.counts.fullM1ChainsConfirmed || 0) >= 500;
    case 'Fists of Fury':
      return (mState.counts.cumulativeM1Hits || 0) >= 3000;
    case 'Unbreakable Bastion':
      return (mState.counts.blockedIncomingStrikes || 0) >= 2500;

    // PvP & General
    case 'Octagon Victor':
      return (stats.totalWins || 0) >= 1 || (stats.totalKOs || 0) >= 1;
    case 'Collector':
      return (stats.totalRollsRolled || stats.totalRollsCount || 0) >= 25;
    case 'Freak of Nature':
      return stats.heightInInches < 54 || stats.heightInInches > 79;
    case 'Bronze Fist':
      return (stats.elo || 0) >= 500;
    case 'Silver Striker':
      return (stats.elo || 0) >= 700;
    case 'Golden Elite':
      return (stats.elo || 0) >= 1000;
    case 'Diamond Brawler':
      return (stats.elo || 0) >= 1600;
    case 'Amethyst Grandmaster':
      return (stats.elo || 0) >= 1850;
    case 'Obsidian God':
      return (stats.elo || 0) >= 2000;
    case 'Contender':
      return (stats.totalMatchesPlayed || 0) >= 5;
    case 'Gladiator':
      return (stats.totalWins || 0) >= 15;
    case 'Apex Predator':
      return (stats.totalWins || 0) >= 50;
    case 'Undefeated':
      return (stats.winStreak || 0) >= 5;
    case 'Steel Aegis':
      return (stats.totalMatchesPlayed || 0) >= 10;
    default:
      return false;
  }
}
