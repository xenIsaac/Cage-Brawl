import { KeyTier, PlayerStats } from '../types';

export interface MilestoneStage {
  stageNumber: number;
  name: string;
  target: number;
  targetLabel: string;
  rewardCash: number;
  rewardKey?: {
    tier: KeyTier;
    count: number;
    label: string;
  };
  rewardTitle?: string;
  titleGlowClass?: string;
}

export interface MilestoneTrack {
  id: string;
  categoryName: string;
  iconName: string;
  description: string;
  accentColor: string;
  borderColor: string;
  bgGradient: string;
  statKey: string;
  ceilingCap?: number;
  stages: MilestoneStage[];
}

export const CAREER_MILESTONE_TRACKS: MilestoneTrack[] = [
  // =========================================================================
  // 1. THE BOT SLAYER (Total AI Knockouts)
  // =========================================================================
  {
    id: 'bot_slayer',
    categoryName: '1. The Bot Slayer (Total AI Knockouts)',
    iconName: 'Bot',
    description: 'Cumulative AI opponents defeated across all singleplayer modes.',
    accentColor: '#ef4444',
    borderColor: 'border-red-500/50',
    bgGradient: 'from-red-950/40 via-zinc-900/80 to-zinc-950',
    statKey: 'totalAiKnockouts',
    stages: [
      { stageNumber: 1, name: 'First Blood', target: 1, targetLabel: '1 AI Opponent', rewardCash: 50, rewardKey: { tier: 'iron', count: 1, label: '1 Iron Key' } },
      { stageNumber: 2, name: 'Sparring Partner', target: 10, targetLabel: '10 AI Opponents', rewardCash: 150, rewardKey: { tier: 'gold', count: 1, label: '1 Gold Key' } },
      { stageNumber: 3, name: 'Octagon Regular', target: 50, targetLabel: '50 AI Opponents', rewardCash: 400, rewardKey: { tier: 'gold', count: 1, label: '1 Gold Key' } },
      { stageNumber: 4, name: 'Century Brawler', target: 100, targetLabel: '100 AI Opponents', rewardCash: 800, rewardKey: { tier: 'diamond', count: 1, label: '1 Diamond Key' } },
      { stageNumber: 5, name: 'Veteran Contender', target: 200, targetLabel: '200 AI Opponents', rewardCash: 1500, rewardKey: { tier: 'diamond', count: 1, label: '1 Diamond Key' } },
      { stageNumber: 6, name: 'Dojo Master', target: 500, targetLabel: '500 AI Opponents', rewardCash: 3000, rewardKey: { tier: 'obsidian', count: 1, label: '1 Obsidian Key' }, rewardTitle: 'Dojo Master', titleGlowClass: 'bg-gradient-to-r from-zinc-200 via-white to-zinc-300 text-black font-black shadow-[0_0_15px_rgba(255,255,255,0.7)]' },
      { stageNumber: 7, name: 'Grand Legend', target: 1000, targetLabel: '1,000 AI Opponents', rewardCash: 6000, rewardKey: { tier: 'obsidian', count: 2, label: '2 Obsidian Keys' }, rewardTitle: 'Grand Legend', titleGlowClass: 'bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 text-black font-black shadow-[0_0_22px_rgba(245,158,11,0.8)] animate-pulse' },
    ],
  },

  // =========================================================================
  // 2. RANKED AI LADDER CLIMBER
  // =========================================================================
  {
    id: 'ranked_ladder_climber',
    categoryName: '2. Ranked AI Ladder Climber',
    iconName: 'TrendingUp',
    description: 'Cumulative match victories strictly within the Ranked AI Ladder.',
    accentColor: '#f59e0b',
    borderColor: 'border-amber-500/50',
    bgGradient: 'from-amber-950/40 via-zinc-900/80 to-zinc-950',
    statKey: 'rankedAiWins',
    stages: [
      { stageNumber: 1, name: 'Ranked Initiate', target: 1, targetLabel: '1 Ranked AI Match', rewardCash: 75 },
      { stageNumber: 2, name: 'Division Climber', target: 10, targetLabel: '10 Ranked AI Matches', rewardCash: 250, rewardKey: { tier: 'iron', count: 1, label: '1 Iron Key' } },
      { stageNumber: 3, name: 'Ladder Specialist', target: 25, targetLabel: '25 Ranked AI Matches', rewardCash: 500, rewardKey: { tier: 'gold', count: 1, label: '1 Gold Key' } },
      { stageNumber: 4, name: 'Apex Contender', target: 50, targetLabel: '50 Ranked AI Matches', rewardCash: 1000, rewardKey: { tier: 'diamond', count: 1, label: '1 Diamond Key' } },
      { stageNumber: 5, name: 'Ranked Executioner', target: 100, targetLabel: '100 Ranked AI Matches', rewardCash: 2000, rewardKey: { tier: 'diamond', count: 1, label: '1 Diamond Key' } },
      { stageNumber: 6, name: 'Immortal Fighter', target: 250, targetLabel: '250 Ranked AI Matches', rewardCash: 4500, rewardKey: { tier: 'obsidian', count: 2, label: '2 Obsidian Keys' }, rewardTitle: 'Immortal Fighter', titleGlowClass: 'bg-gradient-to-r from-red-600 via-amber-400 to-yellow-500 text-black font-black shadow-[0_0_22px_rgba(245,158,11,0.8)] animate-pulse' },
    ],
  },

  // =========================================================================
  // 3. THE IRON WALL (Parry Mastery)
  // =========================================================================
  {
    id: 'iron_wall',
    categoryName: '3. The Iron Wall (Parry Mastery)',
    iconName: 'Shield',
    description: 'Cumulative 0.19s Perfect Parries executed against AI opponents.',
    accentColor: '#06b6d4',
    borderColor: 'border-cyan-500/50',
    bgGradient: 'from-cyan-950/40 via-zinc-900/80 to-zinc-950',
    statKey: 'totalPerfectParries',
    stages: [
      { stageNumber: 1, name: 'First Deflection', target: 1, targetLabel: '1 Perfect Parry', rewardCash: 50 },
      { stageNumber: 2, name: 'Reflex Timing', target: 10, targetLabel: '10 Perfect Parries', rewardCash: 150, rewardKey: { tier: 'iron', count: 1, label: '1 Iron Key' } },
      { stageNumber: 3, name: 'Sabaki Rhythm', target: 50, targetLabel: '50 Perfect Parries', rewardCash: 350, rewardKey: { tier: 'gold', count: 1, label: '1 Gold Key' } },
      { stageNumber: 4, name: 'Counter Master', target: 100, targetLabel: '100 Perfect Parries', rewardCash: 700, rewardKey: { tier: 'gold', count: 1, label: '1 Gold Key' } },
      { stageNumber: 5, name: 'Deflection God', target: 250, targetLabel: '250 Perfect Parries', rewardCash: 1500, rewardKey: { tier: 'diamond', count: 1, label: '1 Diamond Key' }, rewardTitle: 'Deflection God', titleGlowClass: 'bg-gradient-to-r from-cyan-400 via-sky-200 to-cyan-500 text-black font-black shadow-[0_0_20px_rgba(6,182,212,0.8)] animate-pulse' },
      { stageNumber: 6, name: 'Untouchable', target: 500, targetLabel: '500 Perfect Parries', rewardCash: 3000, rewardKey: { tier: 'obsidian', count: 1, label: '1 Obsidian Key' }, rewardTitle: 'Untouchable', titleGlowClass: 'bg-gradient-to-r from-slate-200 via-white to-cyan-300 text-black font-black shadow-[0_0_22px_rgba(255,255,255,0.8)] animate-pulse' },
    ],
  },

  // =========================================================================
  // 4. HEAVY IMPACT (M2 Devastation)
  // =========================================================================
  {
    id: 'heavy_impact',
    categoryName: '4. Heavy Impact (M2 Devastation)',
    iconName: 'Zap',
    description: 'Cumulative M2 Heavy Strikes landed on hit against AI opponents.',
    accentColor: '#f97316',
    borderColor: 'border-orange-500/50',
    bgGradient: 'from-orange-950/40 via-zinc-900/80 to-zinc-950',
    statKey: 'totalM2Hits',
    stages: [
      { stageNumber: 1, name: 'Heavy Opener', target: 5, targetLabel: '5 M2 Strikes', rewardCash: 75 },
      { stageNumber: 2, name: 'Haymaker Habit', target: 25, targetLabel: '25 M2 Strikes', rewardCash: 200, rewardKey: { tier: 'iron', count: 1, label: '1 Iron Key' } },
      { stageNumber: 3, name: 'Guard Shatterer', target: 100, targetLabel: '100 M2 Strikes', rewardCash: 500, rewardKey: { tier: 'gold', count: 1, label: '1 Gold Key' } },
      { stageNumber: 4, name: 'Kinetic Devastator', target: 250, targetLabel: '250 M2 Strikes', rewardCash: 1200, rewardKey: { tier: 'diamond', count: 1, label: '1 Diamond Key' } },
      { stageNumber: 5, name: 'Cataclysmic Force', target: 500, targetLabel: '500 M2 Strikes', rewardCash: 2500, rewardKey: { tier: 'obsidian', count: 1, label: '1 Obsidian Key' }, rewardTitle: 'Cataclysmic Force', titleGlowClass: 'bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 text-white font-black shadow-[0_0_22px_rgba(239,68,68,0.8)] animate-pulse' },
    ],
  },

  // =========================================================================
  // 5. TOURNAMENT GLORY (Tournament 1 Only)
  // =========================================================================
  {
    id: 'tournament_glory',
    categoryName: '5. Tournament Glory (Tournament 1 Only)',
    iconName: 'Trophy',
    description: 'Cumulative championships won strictly in Tournament 1 (Octagon Knockout).',
    accentColor: '#a855f7',
    borderColor: 'border-purple-500/50',
    bgGradient: 'from-purple-950/40 via-zinc-900/80 to-zinc-950',
    statKey: 'tournament1Wins',
    stages: [
      { stageNumber: 1, name: 'First Belt', target: 1, targetLabel: '1 Tournament 1 Championship', rewardCash: 500, rewardKey: { tier: 'gold', count: 1, label: '1 Gold Key' } },
      { stageNumber: 2, name: 'Repeated Champ', target: 5, targetLabel: '5 Tournament 1 Championships', rewardCash: 1500, rewardKey: { tier: 'diamond', count: 1, label: '1 Diamond Key' } },
      { stageNumber: 3, name: 'Undisputed', target: 20, targetLabel: '20 Tournament 1 Championships', rewardCash: 3500, rewardKey: { tier: 'obsidian', count: 1, label: '1 Obsidian Key' } },
      { stageNumber: 4, name: 'Dynasty', target: 50, targetLabel: '50 Tournament 1 Championships', rewardCash: 8000, rewardKey: { tier: 'obsidian', count: 3, label: '3 Obsidian Keys' }, rewardTitle: 'Dynasty', titleGlowClass: 'bg-black text-white border-2 border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.9)] ring-1 ring-purple-300 animate-pulse font-black' },
    ],
  },

  // =========================================================================
  // 6. FLAWLESS MASTERY (Amethyst+ AI Strict Evaluation)
  // =========================================================================
  {
    id: 'flawless_mastery',
    categoryName: '6. Flawless Mastery (Amethyst+ AI Strict Evaluation)',
    iconName: 'Star',
    description: 'Tracks cumulative Grade SSS Rounds achieved strictly against Amethyst Tier or Above AI.',
    accentColor: '#d946ef',
    borderColor: 'border-fuchsia-500/50',
    bgGradient: 'from-fuchsia-950/40 via-zinc-900/80 to-zinc-950',
    statKey: 'amethystSssRounds',
    stages: [
      { stageNumber: 1, name: 'Apex Perfection', target: 5, targetLabel: '5 SSS Rounds vs Amethyst+', rewardCash: 500, rewardKey: { tier: 'diamond', count: 1, label: '1 Diamond Key' } },
      { stageNumber: 2, name: 'Consistent Domination', target: 20, targetLabel: '20 SSS Rounds vs Amethyst+', rewardCash: 1500, rewardKey: { tier: 'diamond', count: 1, label: '1 Diamond Key' } },
      { stageNumber: 3, name: 'Absolute Machine', target: 50, targetLabel: '50 SSS Rounds vs Amethyst+', rewardCash: 4000, rewardKey: { tier: 'obsidian', count: 2, label: '2 Obsidian Keys' }, rewardTitle: 'Absolute Perfection', titleGlowClass: 'bg-gradient-to-r from-purple-600 via-fuchsia-400 to-purple-800 text-white font-black shadow-[0_0_22px_rgba(168,85,247,0.9)] animate-pulse' },
    ],
  },

  // =========================================================================
  // 7. COMBO SPECIALIST (Full M1 Chain Confirms)
  // =========================================================================
  {
    id: 'combo_specialist',
    categoryName: '7. Combo Specialist (Full M1 Chain Confirms)',
    iconName: 'Flame',
    description: 'Requires that EVERY SINGLE STRIKE (S1, S2, S3, S4) lands completely on the opponent without missing or whiffing.',
    accentColor: '#0ea5e9',
    borderColor: 'border-sky-500/50',
    bgGradient: 'from-sky-950/40 via-zinc-900/80 to-zinc-950',
    statKey: 'fullM1ChainsConfirmed',
    stages: [
      { stageNumber: 1, name: 'Clean Chain', target: 10, targetLabel: '10 Full S1–S4 Chains', rewardCash: 100, rewardKey: { tier: 'iron', count: 1, label: '1 Iron Key' } },
      { stageNumber: 2, name: 'Cadence Master', target: 50, targetLabel: '50 Full S1–S4 Chains', rewardCash: 350, rewardKey: { tier: 'gold', count: 1, label: '1 Gold Key' } },
      { stageNumber: 3, name: 'String Artist', target: 200, targetLabel: '200 Full S1–S4 Chains', rewardCash: 1000, rewardKey: { tier: 'diamond', count: 1, label: '1 Diamond Key' } },
      { stageNumber: 4, name: 'Flawless Comboist', target: 500, targetLabel: '500 Full S1–S4 Chains', rewardCash: 2500, rewardKey: { tier: 'obsidian', count: 1, label: '1 Obsidian Key' }, rewardTitle: 'Flawless Comboist', titleGlowClass: 'bg-gradient-to-r from-cyan-500 via-teal-300 to-cyan-600 text-black font-black shadow-[0_0_20px_rgba(6,182,212,0.8)] animate-pulse' },
    ],
  },

  // =========================================================================
  // 8. STRIKING VOLUME (Cumulative M1 Hits - Cap 3,000)
  // =========================================================================
  {
    id: 'striking_volume',
    categoryName: '8. Striking Volume (Cumulative M1 Hits)',
    iconName: 'Swords',
    description: 'Tracks total individual M1 strikes landed on target across all modes (Capped at 3,000 hits).',
    accentColor: '#fb923c',
    borderColor: 'border-amber-500/50',
    bgGradient: 'from-amber-950/40 via-zinc-900/80 to-zinc-950',
    statKey: 'cumulativeM1Hits',
    ceilingCap: 3000,
    stages: [
      { stageNumber: 1, name: 'First Spar', target: 100, targetLabel: '100 M1 Strikes', rewardCash: 75 },
      { stageNumber: 2, name: 'Heavy Hands', target: 500, targetLabel: '500 M1 Strikes', rewardCash: 250, rewardKey: { tier: 'iron', count: 1, label: '1 Iron Key' } },
      { stageNumber: 3, name: 'Pugilist', target: 1000, targetLabel: '1,000 M1 Strikes', rewardCash: 600, rewardKey: { tier: 'gold', count: 1, label: '1 Gold Key' } },
      { stageNumber: 4, name: 'Barrage Master', target: 2000, targetLabel: '2,000 M1 Strikes', rewardCash: 1200, rewardKey: { tier: 'diamond', count: 1, label: '1 Diamond Key' } },
      { stageNumber: 5, name: 'Fists of Fury', target: 3000, targetLabel: '3,000 M1 Strikes (Ceiling)', rewardCash: 2500, rewardKey: { tier: 'obsidian', count: 1, label: '1 Obsidian Key' }, rewardTitle: 'Fists of Fury', titleGlowClass: 'bg-gradient-to-r from-orange-600 via-amber-400 to-red-600 text-white font-black shadow-[0_0_22px_rgba(249,115,22,0.8)] animate-pulse' },
    ],
  },

  // =========================================================================
  // 9. THE BASTION (Absorbed Strikes)
  // =========================================================================
  {
    id: 'the_bastion',
    categoryName: '9. The Bastion (Absorbed Strikes)',
    iconName: 'ShieldAlert',
    description: 'Tracks cumulative incoming enemy strikes absorbed cleanly while holding Block.',
    accentColor: '#3b82f6',
    borderColor: 'border-blue-500/50',
    bgGradient: 'from-blue-950/40 via-zinc-900/80 to-zinc-950',
    statKey: 'blockedIncomingStrikes',
    stages: [
      { stageNumber: 1, name: 'Shielded', target: 50, targetLabel: 'Block 50 Incoming Strikes', rewardCash: 75 },
      { stageNumber: 2, name: 'Fortified', target: 250, targetLabel: 'Block 250 Incoming Strikes', rewardCash: 250, rewardKey: { tier: 'iron', count: 1, label: '1 Iron Key' } },
      { stageNumber: 3, name: 'Impenetrable', target: 1000, targetLabel: 'Block 1,000 Incoming Strikes', rewardCash: 800, rewardKey: { tier: 'gold', count: 1, label: '1 Gold Key' } },
      { stageNumber: 4, name: 'Unbreakable', target: 2500, targetLabel: 'Block 2,500 Incoming Strikes', rewardCash: 2500, rewardKey: { tier: 'obsidian', count: 1, label: '1 Obsidian Key' }, rewardTitle: 'Unbreakable Bastion', titleGlowClass: 'bg-gradient-to-r from-blue-700 via-sky-400 to-slate-200 text-black font-black shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-pulse' },
    ],
  },
];

export interface MilestoneProgressState {
  counts: Record<string, number>; // statKey -> current value
  claimedStages: Record<string, number[]>; // trackId -> array of claimed stageNumbers
}

const STORAGE_PREFIX = 'cagebrawl_career_milestones_v6.4_';

export class CareerMilestoneManager {
  static getStorageKey(email?: string): string {
    const cleanEmail = email?.trim().toLowerCase() || 'anon_user';
    return `${STORAGE_PREFIX}${cleanEmail}`;
  }

  static getState(email?: string, stats?: PlayerStats): MilestoneProgressState {
    const defaultState: MilestoneProgressState = {
      counts: {
        totalAiKnockouts: 0,
        rankedAiWins: 0,
        totalPerfectParries: 0,
        totalM2Hits: 0,
        tournament1Wins: 0,
        amethystSssRounds: 0,
        fullM1ChainsConfirmed: 0,
        cumulativeM1Hits: 0,
        blockedIncomingStrikes: 0,
      },
      claimedStages: {},
    };

    if (typeof localStorage === 'undefined') return defaultState;

    const key = this.getStorageKey(email);
    const saved = localStorage.getItem(key);
    let state = defaultState;

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          state = {
            counts: { ...defaultState.counts, ...parsed.counts },
            claimedStages: { ...defaultState.claimedStages, ...parsed.claimedStages },
          };
        }
      } catch (e) {
        console.error('Failed to parse career milestones state:', e);
      }
    }

    // Auto-sync baseline progress from existing lifetime stats if available
    if (stats) {
      let synced = false;
      const lifetimeKOs = Math.max(stats.totalKOs || 0, stats.aiMatchesPlayed ? Math.floor(stats.aiMatchesPlayed * 1.5) : 0);
      if (lifetimeKOs > (state.counts.totalAiKnockouts || 0)) {
        state.counts.totalAiKnockouts = lifetimeKOs;
        synced = true;
      }
      if ((stats.aiWins || 0) > (state.counts.rankedAiWins || 0)) {
        state.counts.rankedAiWins = stats.aiWins || 0;
        synced = true;
      }
      if (synced) {
        this.saveState(email, state);
      }
    }

    return state;
  }

  static syncWithStats(email?: string, stats?: PlayerStats): MilestoneProgressState {
    return this.getState(email, stats);
  }

  static saveState(email: string | undefined, state: MilestoneProgressState) {
    if (typeof localStorage === 'undefined') return;
    const key = this.getStorageKey(email);
    localStorage.setItem(key, JSON.stringify(state));

    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('career_milestones_updated', { detail: state }));
      } catch (e) {
        // ignore in non-browser env
      }
    }
  }

  static resetMilestones(email?: string): MilestoneProgressState {
    if (typeof localStorage !== 'undefined') {
      const key = this.getStorageKey(email);
      localStorage.removeItem(key);
    }
    const fresh = this.getState(email);
    this.saveState(email, fresh);
    return fresh;
  }

  /**
   * Records match events and increments the milestone trackers
   */
  static recordEvent(
    email: string | undefined,
    event: {
      aiKnockoutDelta?: number;
      rankedAiWin?: boolean;
      perfectParriesDelta?: number;
      m2HitsDelta?: number;
      tournament1Win?: boolean;
      amethystSssRoundDelta?: number;
      fullM1ChainDelta?: number;
      m1HitsDelta?: number;
      blockedStrikesDelta?: number;
    }
  ) {
    const state = this.getState(email);
    let changed = false;

    if (event.aiKnockoutDelta && event.aiKnockoutDelta > 0) {
      state.counts.totalAiKnockouts = (state.counts.totalAiKnockouts || 0) + event.aiKnockoutDelta;
      changed = true;
    }

    if (event.rankedAiWin) {
      state.counts.rankedAiWins = (state.counts.rankedAiWins || 0) + 1;
      changed = true;
    }

    if (event.perfectParriesDelta && event.perfectParriesDelta > 0) {
      state.counts.totalPerfectParries = (state.counts.totalPerfectParries || 0) + event.perfectParriesDelta;
      changed = true;
    }

    if (event.m2HitsDelta && event.m2HitsDelta > 0) {
      state.counts.totalM2Hits = (state.counts.totalM2Hits || 0) + event.m2HitsDelta;
      changed = true;
    }

    if (event.tournament1Win) {
      state.counts.tournament1Wins = (state.counts.tournament1Wins || 0) + 1;
      changed = true;
    }

    if (event.amethystSssRoundDelta && event.amethystSssRoundDelta > 0) {
      state.counts.amethystSssRounds = (state.counts.amethystSssRounds || 0) + event.amethystSssRoundDelta;
      changed = true;
    }

    if (event.fullM1ChainDelta && event.fullM1ChainDelta > 0) {
      state.counts.fullM1ChainsConfirmed = (state.counts.fullM1ChainsConfirmed || 0) + event.fullM1ChainDelta;
      changed = true;
    }

    if (event.m1HitsDelta && event.m1HitsDelta > 0) {
      const current = state.counts.cumulativeM1Hits || 0;
      state.counts.cumulativeM1Hits = Math.min(3000, current + event.m1HitsDelta);
      changed = true;
    }

    if (event.blockedStrikesDelta && event.blockedStrikesDelta > 0) {
      state.counts.blockedIncomingStrikes = (state.counts.blockedIncomingStrikes || 0) + event.blockedStrikesDelta;
      changed = true;
    }

    if (changed) {
      this.saveState(email, state);
    }
  }

  /**
   * Claims a milestone stage
   */
  static claimStage(
    email: string | undefined,
    trackId: string,
    stageNumber: number,
    stats: PlayerStats,
    updateStats: (updates: Partial<PlayerStats>) => void
  ): { success: boolean; message: string; cash: number; keyText?: string; titleUnlocked?: string } {
    const track = CAREER_MILESTONE_TRACKS.find(t => t.id === trackId);
    if (!track) return { success: false, message: 'Track not found.', cash: 0 };

    const stage = track.stages.find(s => s.stageNumber === stageNumber);
    if (!stage) return { success: false, message: 'Stage not found.', cash: 0 };

    const state = this.getState(email);
    const currentVal = state.counts[track.statKey] || 0;

    if (currentVal < stage.target) {
      return { success: false, message: `Target not reached (${currentVal}/${stage.target}).`, cash: 0 };
    }

    const claimedList = state.claimedStages[trackId] || [];
    if (claimedList.includes(stageNumber)) {
      return { success: false, message: 'Stage reward already claimed.', cash: 0 };
    }

    // Credit Cash
    const newCash = stats.cash + stage.rewardCash;

    // Credit Key
    const updatedKeys = {
      iron: stats.keys?.iron ?? (stats.rolls ? Math.max(0, stats.rolls) : 2),
      gold: stats.keys?.gold ?? 1,
      diamond: stats.keys?.diamond ?? 0,
      obsidian: stats.keys?.obsidian ?? 0,
    };

    let keyText: string | undefined;
    if (stage.rewardKey) {
      const kt = stage.rewardKey.tier;
      updatedKeys[kt] = (updatedKeys[kt] || 0) + stage.rewardKey.count;
      keyText = `+${stage.rewardKey.count} ${kt.toUpperCase()} KEY`;
    }

    // Credit Title
    const currentTitles = stats.unlockedTitles || [];
    const updatedTitles = stage.rewardTitle && !currentTitles.includes(stage.rewardTitle)
      ? [...currentTitles, stage.rewardTitle]
      : currentTitles;

    updateStats({
      cash: newCash,
      keys: updatedKeys,
      unlockedTitles: updatedTitles,
      selectedTitle: stage.rewardTitle ? stage.rewardTitle : stats.selectedTitle,
    });

    claimedList.push(stageNumber);
    state.claimedStages[trackId] = claimedList;
    this.saveState(email, state);

    let fullMsg = `Claimed ${track.categoryName} Stage ${stageNumber}! +$${stage.rewardCash}`;
    if (keyText) fullMsg += ` & ${keyText}`;
    if (stage.rewardTitle) fullMsg += ` & Unlocked Title: « ${stage.rewardTitle} »!`;

    return { success: true, message: fullMsg, cash: stage.rewardCash, keyText, titleUnlocked: stage.rewardTitle };
  }

  /**
   * Claims all ready milestone stages across all tracks
   */
  static claimAll(
    email: string | undefined,
    stats: PlayerStats,
    updateStats: (updates: Partial<PlayerStats>) => void
  ): { count: number; totalCash: number; keysSummary: string; titlesSummary: string } {
    const state = this.getState(email);
    let totalCash = 0;
    let claimedCount = 0;

    const updatedKeys = {
      iron: stats.keys?.iron ?? (stats.rolls ? Math.max(0, stats.rolls) : 2),
      gold: stats.keys?.gold ?? 1,
      diamond: stats.keys?.diamond ?? 0,
      obsidian: stats.keys?.obsidian ?? 0,
    };

    const keysAdded: Record<string, number> = {};
    const titlesAdded: string[] = [];
    let currentTitles = [...(stats.unlockedTitles || [])];

    for (const track of CAREER_MILESTONE_TRACKS) {
      const currentVal = state.counts[track.statKey] || 0;
      const claimedList = state.claimedStages[track.id] || [];

      for (const stage of track.stages) {
        if (currentVal >= stage.target && !claimedList.includes(stage.stageNumber)) {
          claimedList.push(stage.stageNumber);
          claimedCount++;
          totalCash += stage.rewardCash;

          if (stage.rewardKey) {
            const kt = stage.rewardKey.tier;
            updatedKeys[kt] = (updatedKeys[kt] || 0) + stage.rewardKey.count;
            keysAdded[kt] = (keysAdded[kt] || 0) + stage.rewardKey.count;
          }

          if (stage.rewardTitle && !currentTitles.includes(stage.rewardTitle)) {
            currentTitles.push(stage.rewardTitle);
            titlesAdded.push(stage.rewardTitle);
          }
        }
      }

      state.claimedStages[track.id] = claimedList;
    }

    if (claimedCount > 0) {
      this.saveState(email, state);
      updateStats({
        cash: stats.cash + totalCash,
        keys: updatedKeys,
        unlockedTitles: currentTitles,
        selectedTitle: titlesAdded.length > 0 ? titlesAdded[titlesAdded.length - 1] : stats.selectedTitle,
      });
    }

    const keySummaryParts = Object.entries(keysAdded).map(([k, count]) => `+${count} ${k.toUpperCase()}`);
    const keysSummary = keySummaryParts.length > 0 ? keySummaryParts.join(', ') : '';
    const titlesSummary = titlesAdded.length > 0 ? titlesAdded.join(', ') : '';

    return { count: claimedCount, totalCash, keysSummary, titlesSummary };
  }
}
