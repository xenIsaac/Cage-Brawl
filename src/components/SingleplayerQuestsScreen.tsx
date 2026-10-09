import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, CheckCheck, Sparkles, Zap, 
  Shield, Flame, ChevronRight, ChevronLeft, Key, DollarSign, FastForward,
  Lock, Award, CheckCircle2, AlertCircle, Swords, ArrowRight,
  Clock, RefreshCw, Trash2, ShieldCheck, AlertTriangle, Crown, Star, RotateCcw
} from 'lucide-react';
import { PlayerStats } from '../types';
import { 
  REVISED_OFFLINE_QUESTS, 
  OfflineQuest, 
  OfflineQuestTier, 
  TIER_CONFIGS,
  TIER_SKIP_CONFIG,
  STYLE_PALETTES,
  getStyleInfo,
  UnbrokenGauntletSubProgress,
  OfflineQuestManager, 
  OfflineHubState
} from '../data/offlineQuests';
import { soundManager } from './SoundManager';

interface SingleplayerQuestsScreenProps {
  stats: PlayerStats;
  updateStats: (updates: Partial<PlayerStats>) => void;
  email?: string;
  onReturnToSingleplayerHub: () => void;
  isNavHidden?: boolean;
  setIsNavHidden?: (hidden: boolean) => void;
  mobileTab?: string;
  setMobileTab?: (tab: any) => void;
  claimAllTrigger?: number;
  onClaimableCountChange?: (count: number) => void;
  onUnfoldNav?: () => void;
}

export default function SingleplayerQuestsScreen({
  stats,
  updateStats,
  email = '',
  onReturnToSingleplayerHub,
  isNavHidden = false,
  setIsNavHidden,
  mobileTab,
  setMobileTab,
  claimAllTrigger,
  onClaimableCountChange,
  onUnfoldNav,
}: SingleplayerQuestsScreenProps) {
  const [hubState, setHubState] = useState<OfflineHubState>(() => OfflineQuestManager.getHubState(email));
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'info' | 'reward' } | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  
  // 5 Vertical Slides Navigation State (Tiers 1 to 5)
  const [activeTierSlide, setActiveTierSlide] = useState<OfflineQuestTier>(1);
  const [confirmRestart, setConfirmRestart] = useState<boolean>(false);

  // Real-time second ticker for smooth countdown timers & rotation checks
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
      setHubState(OfflineQuestManager.getHubState(email));
    }, 1000);
    return () => clearInterval(timer);
  }, [email]);

  const refreshState = () => {
    setHubState(OfflineQuestManager.getHubState(email));
  };

  const handleRestartQuests = () => {
    if (!confirmRestart) {
      setConfirmRestart(true);
      setTimeout(() => setConfirmRestart(false), 4000);
      return;
    }
    setConfirmRestart(false);
    const fresh = OfflineQuestManager.resetAllQuests(email);
    setHubState(fresh);
    soundManager.playLevelUp?.();
    showToast('All player quests restarted & updated to latest rotation!', 'success');
  };

  const showToast = (text: string, type: 'success' | 'info' | 'reward' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const formatTimeLeft = (targetTime: number) => {
    const diff = Math.max(0, targetTime - now);
    const totalSecs = Math.floor(diff / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const allActiveQuests = useMemo(() => {
    const list: OfflineQuest[] = [];
    const tiers: OfflineQuestTier[] = [1, 2, 3, 4, 5];
    for (const t of tiers) {
      const slotIds = hubState.activeSlots[t] || [];
      for (const id of slotIds) {
        const q = REVISED_OFFLINE_QUESTS.find(item => item.id === id);
        if (q) list.push(q);
      }
    }
    return list;
  }, [hubState.activeSlots]);

  // Calculate total claimable quests across all tiers
  const claimableCount = useMemo(() => {
    let count = 0;
    for (const q of allActiveQuests) {
      const p = hubState.progress[q.id];
      if (p && p.completed && !p.claimed) {
        count++;
      }
    }
    return count;
  }, [allActiveQuests, hubState.progress]);

  // Calculate ready quests per tier
  const tierClaimableCounts = useMemo(() => {
    const map: Record<OfflineQuestTier, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const q of allActiveQuests) {
      const p = hubState.progress[q.id];
      if (p && p.completed && !p.claimed) {
        map[q.tier] = (map[q.tier] || 0) + 1;
      }
    }
    return map;
  }, [allActiveQuests, hubState.progress]);

  useEffect(() => {
    if (onClaimableCountChange) {
      onClaimableCountChange(claimableCount);
    }
  }, [claimableCount, onClaimableCountChange]);

  // Handle Skip/Swap Quest with Fee and Cooldown Limitation
  const handleSkip = (quest: OfflineQuest) => {
    const res = OfflineQuestManager.skipQuest(email, quest.id, stats, updateStats);
    if (res.success) {
      soundManager.playGemCollected?.('cash');
      refreshState();
      showToast(res.message, 'success');
    } else {
      soundManager.playParry?.();
      showToast(res.message, 'info');
    }
  };

  // Handle Single Claim
  const handleClaim = (quest: OfflineQuest) => {
    const res = OfflineQuestManager.claimQuest(email, quest.id, stats, updateStats);
    if (res.success) {
      soundManager.playCrateWin();
      refreshState();
      showToast(res.message, 'reward');
    } else {
      showToast(res.message, 'info');
    }
  };

  // Handle Claim All
  const handleClaimAll = () => {
    const res = OfflineQuestManager.claimAll(email, stats, updateStats);
    if (res.count > 0) {
      soundManager.playCrateWin();
      refreshState();
      showToast(
        `Claimed all ${res.count} quests! +$${res.totalCash.toLocaleString()}${res.keysSummary ? ` & ${res.keysSummary}` : ''}`,
        'reward'
      );
    }
  };

  const prevTriggerRef = useRef(claimAllTrigger);
  useEffect(() => {
    if (claimAllTrigger !== undefined && claimAllTrigger > (prevTriggerRef.current || 0)) {
      prevTriggerRef.current = claimAllTrigger;
      handleClaimAll();
    }
  }, [claimAllTrigger]);

  const keyInventory = useMemo(() => {
    return {
      iron: stats.keys?.iron ?? (stats.rolls ? Math.max(0, stats.rolls) : 2),
      gold: stats.keys?.gold ?? 1,
      diamond: stats.keys?.diamond ?? 0,
      obsidian: stats.keys?.obsidian ?? 0,
    };
  }, [stats.keys, stats.rolls]);

  const tiersList: OfflineQuestTier[] = [1, 2, 3, 4, 5];

  const handleNextSlide = () => {
    soundManager.playRollTick?.();
    setActiveTierSlide(prev => (prev < 5 ? ((prev + 1) as OfflineQuestTier) : 1));
  };

  const handlePrevSlide = () => {
    soundManager.playRollTick?.();
    setActiveTierSlide(prev => (prev > 1 ? ((prev - 1) as OfflineQuestTier) : 5));
  };

  const currentTierConfig = TIER_CONFIGS[activeTierSlide];
  const currentSkipConfig = TIER_SKIP_CONFIG[activeTierSlide];
  const currentSlotIds = hubState.activeSlots[activeTierSlide] || [];
  const currentTierQuests = currentSlotIds
    .map(id => REVISED_OFFLINE_QUESTS.find(q => q.id === id))
    .filter((q): q is OfflineQuest => !!q);
  const currentTierTimer = hubState.tierTimers[activeTierSlide];

  const skipsAvailable = currentTierTimer?.skipCharges !== undefined ? currentTierTimer.skipCharges : currentSkipConfig.maxSkips;
  const isSkipOnCooldown = skipsAvailable <= 0 && (currentTierTimer?.nextSkipRechargeTime || 0) > now;

  const getTierTheme = (tier: OfflineQuestTier) => {
    switch (tier) {
      case 1:
        return {
          border: 'border-zinc-700/80',
          activeTab: 'bg-zinc-800 text-white border-zinc-500 shadow-md',
          headerBg: 'bg-gradient-to-r from-zinc-900 via-zinc-850 to-zinc-900',
          accent: 'text-zinc-300',
          badge: 'bg-zinc-800 text-zinc-200 border-zinc-700',
          glow: 'shadow-zinc-900/50',
        };
      case 2:
        return {
          border: 'border-amber-500/50',
          activeTab: 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]',
          headerBg: 'bg-gradient-to-r from-amber-950/70 via-zinc-900 to-amber-950/70',
          accent: 'text-amber-400',
          badge: 'bg-amber-950/80 text-amber-300 border-amber-500/50',
          glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]',
        };
      case 3:
        return {
          border: 'border-purple-500/50',
          activeTab: 'bg-purple-500/20 text-purple-300 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]',
          headerBg: 'bg-gradient-to-r from-purple-950/70 via-zinc-900 to-purple-950/70',
          accent: 'text-purple-400',
          badge: 'bg-purple-950/80 text-purple-300 border-purple-500/50',
          glow: 'shadow-[0_0_20px_rgba(168,85,247,0.15)]',
        };
      case 4:
        return {
          border: 'border-cyan-500/60',
          activeTab: 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_18px_rgba(6,182,212,0.35)]',
          headerBg: 'bg-gradient-to-r from-cyan-950/80 via-zinc-900 to-cyan-950/80',
          accent: 'text-cyan-300',
          badge: 'bg-cyan-950/90 text-cyan-300 border-cyan-400/60',
          glow: 'shadow-[0_0_25px_rgba(6,182,212,0.2)]',
        };
      case 5:
      default:
        return {
          border: 'border-emerald-500/70',
          activeTab: 'bg-emerald-500/20 text-emerald-300 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]',
          headerBg: 'bg-gradient-to-r from-emerald-950/90 via-zinc-900 to-emerald-950/90',
          accent: 'text-emerald-300',
          badge: 'bg-emerald-950/90 text-emerald-300 border-emerald-400/70',
          glow: 'shadow-[0_0_30px_rgba(16,185,129,0.25)]',
        };
    }
  };

  const activeTheme = getTierTheme(activeTierSlide);

  return (
    <div className={`fixed inset-0 z-40 bg-zinc-950 text-white flex flex-col select-none overflow-hidden transition-all duration-300 ${
      isNavHidden ? 'pl-0' : 'pl-14 sm:pl-16'
    }`}>
      {/* ============================================================== */}
      {/* 1. TOP HEADER & TELEMETRY                                      */}
      {/* ============================================================== */}
      <header className="px-4 sm:px-6 py-2.5 sm:py-3 border-b border-zinc-850 bg-gradient-to-r from-zinc-950 via-zinc-900/90 to-zinc-950 flex items-center justify-between gap-3 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-base font-display font-black italic uppercase text-white tracking-wider">
                OFFLINE TRIALS & QUEST HUB
              </h1>
              <span className="text-[8px] sm:text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase">
                {allActiveQuests.length}/10 Active Across 5 Tiers
              </span>
            </div>
            <p className="text-[9.5px] sm:text-[10.5px] text-zinc-400 font-mono hidden sm:block">
              5 Dedicated Vertical Slides: Switch between Tiers with full-height readability & zero squish.
            </p>
          </div>
        </div>

        {/* Currency Pill, Keys & Hub Return */}
        <div className="flex items-center gap-2">
          {/* Cash */}
          <div className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono font-bold text-emerald-400 shadow-inner">
            <DollarSign className="w-3.5 h-3.5" />
            <span>${stats.cash.toLocaleString()}</span>
          </div>

          {/* Key Pills */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-[10px] font-mono font-bold shadow-inner">
            <span className="text-zinc-400">Fe:{keyInventory.iron}</span>
            <span className="text-amber-400">Au:{keyInventory.gold}</span>
            <span className="text-cyan-300">Dia:{keyInventory.diamond}</span>
            <span className="text-purple-300">Obs:{keyInventory.obsidian}</span>
          </div>

          {/* Claim All Button */}
          {claimableCount > 0 && (
            <button
              onClick={handleClaimAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-display font-black italic uppercase text-xs rounded-xl shadow-lg shadow-amber-500/20 animate-pulse transition cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>CLAIM ALL ({claimableCount})</span>
            </button>
          )}

          {/* Restart All Quests Button */}
          <button
            onClick={handleRestartQuests}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 border rounded-xl text-xs font-display font-black italic uppercase tracking-wider transition cursor-pointer ${
              confirmRestart
                ? 'bg-red-600 text-white border-red-400 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-750 text-zinc-400 hover:text-red-400'
            }`}
            title={confirmRestart ? 'Click again to confirm quest restart' : 'Restart all player quests to update to latest engine'}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${confirmRestart ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {confirmRestart ? 'CONFIRM?' : 'RESTART'}
            </span>
          </button>

          {/* Return Button */}
          <button
            onClick={() => {
              soundManager.playRollTick?.();
              onReturnToSingleplayerHub();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-300 hover:text-white rounded-xl text-xs font-display font-black italic uppercase tracking-wider transition cursor-pointer"
          >
            <span>HUB</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. 5 VERTICAL SLIDE TIER SELECTOR TABS                         */}
      {/* ============================================================== */}
      <div className="px-3 sm:px-6 py-2 border-b border-zinc-850 bg-zinc-950 flex items-center justify-between gap-2 shrink-0 overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {tiersList.map(tier => {
            const config = TIER_CONFIGS[tier];
            const isCurrent = activeTierSlide === tier;
            const readyCount = tierClaimableCounts[tier];
            const theme = getTierTheme(tier);

            return (
              <button
                key={tier}
                onClick={() => {
                  soundManager.playRollTick?.();
                  setActiveTierSlide(tier);
                }}
                className={`px-3 sm:px-4 py-1.5 rounded-xl border text-xs font-display font-black italic uppercase tracking-wider transition flex items-center gap-2 cursor-pointer ${
                  isCurrent
                    ? theme.activeTab
                    : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-850'
                }`}
              >
                {tier === 5 ? (
                  <Crown className={`w-3.5 h-3.5 ${isCurrent ? 'text-emerald-300 animate-pulse' : 'text-zinc-500'}`} />
                ) : tier === 4 ? (
                  <Star className={`w-3.5 h-3.5 ${isCurrent ? 'text-cyan-300' : 'text-zinc-500'}`} />
                ) : (
                  <Trophy className={`w-3.5 h-3.5 ${isCurrent ? theme.accent : 'text-zinc-500'}`} />
                )}
                <span>Tier {tier}</span>

                {readyCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>
            );
          })}
        </div>

        {/* Slide Next / Prev Controls */}
        <div className="flex items-center gap-1 text-zinc-400">
          <button
            onClick={handlePrevSlide}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition cursor-pointer"
            title="Previous Tier Slide"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-mono px-2 font-bold">
            Slide {activeTierSlide} / 5
          </span>
          <button
            onClick={handleNextSlide}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition cursor-pointer"
            title="Next Tier Slide"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. ACTIVE VERTICAL SLIDE VIEWPORT                              */}
      {/* ============================================================== */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 bg-gradient-to-b from-zinc-950 via-zinc-900/30 to-zinc-950">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={`tier-slide-${activeTierSlide}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className={`rounded-3xl border ${activeTheme.border} ${activeTheme.glow} bg-zinc-900/80 backdrop-blur-md overflow-hidden shadow-2xl flex flex-col`}
            >
              {/* SLIDE HEADER BANNER */}
              <div className={`p-4 sm:p-6 border-b border-zinc-800 ${activeTheme.headerBg} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {activeTierSlide === 5 ? (
                      <Crown className="w-5 h-5 text-emerald-400 animate-pulse" />
                    ) : activeTierSlide === 4 ? (
                      <Star className="w-5 h-5 text-cyan-300" />
                    ) : (
                      <Trophy className={`w-5 h-5 ${activeTheme.accent}`} />
                    )}
                    <h2 className="font-display font-black italic uppercase text-base sm:text-xl text-white tracking-wider">
                      {currentTierConfig.tierTitle}
                    </h2>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${activeTheme.badge}`}>
                      {currentTierConfig.tierBadge}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-zinc-300">
                    Reward Spectrum: <span className="text-white font-bold">{currentTierConfig.rewardSpectrum}</span>
                  </p>
                </div>

                {/* Telemetry Pills: Recycle Timer, Skips Quota & Hyper-Cycle Charges */}
                <div className="flex flex-wrap items-center gap-2.5 bg-zinc-950/80 px-3.5 py-2 rounded-2xl border border-zinc-800/80">
                  {/* Recycle Countdown */}
                  <div className="flex items-center gap-1.5 text-xs font-mono">
                    <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span className="text-zinc-400">Recycle:</span>
                    <span className="font-bold text-amber-300">
                      {formatTimeLeft(currentTierTimer?.nextRecycleTime || 0)}
                    </span>
                  </div>

                  <div className="w-px h-4 bg-zinc-800 hidden sm:block" />

                  {/* Skip Limit & Cooldown */}
                  <div className="flex items-center gap-1.5 text-xs font-mono" title={`Tier ${activeTierSlide} Skip limit: ${currentSkipConfig.maxSkips} skips before 1hr CD`}>
                    <RefreshCw className={`w-3.5 h-3.5 ${isSkipOnCooldown ? 'text-zinc-600' : 'text-amber-400'}`} />
                    <span className="text-zinc-400">Skips:</span>
                    {isSkipOnCooldown ? (
                      <span className="text-red-400 font-bold text-[11px]">
                        0/{currentSkipConfig.maxSkips} (CD {formatTimeLeft(currentTierTimer?.nextSkipRechargeTime || 0)})
                      </span>
                    ) : (
                      <span className="text-amber-300 font-bold">
                        {skipsAvailable}/{currentSkipConfig.maxSkips}
                      </span>
                    )}
                  </div>

                  <div className="w-px h-4 bg-zinc-800 hidden sm:block" />

                  {/* Hyper-Cycle Charges or Safety Mode */}
                  {currentTierConfig.hyperCycleMaxCharges > 0 ? (
                    <div className="flex items-center gap-1.5 text-xs font-mono text-purple-300" title="Instant replacement charges upon claiming">
                      <FastForward className="w-4 h-4 text-purple-400" />
                      <span className="font-bold">
                        {currentTierTimer?.hyperCycleCharges || 0}/{currentTierConfig.hyperCycleMaxCharges} Hyper
                      </span>
                    </div>
                  ) : currentTierConfig.protectedProgress ? (
                    <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Protected
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-red-400 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Hard Timer
                    </span>
                  )}
                </div>
              </div>

              {/* SLIDE QUEST CARDS LIST */}
              <div className="p-4 sm:p-6 space-y-4">
                {currentTierQuests.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 font-mono text-xs border border-dashed border-zinc-800 rounded-2xl">
                    Rolling replacement quest...
                  </div>
                ) : (
                  currentTierQuests.map(quest => {
                    const p = hubState.progress[quest.id] || { current: 0, completed: false, claimed: false, skipped: false };
                    const currentVal = Math.min(quest.target, p.current);
                    const percent = Math.min(100, Math.round((currentVal / quest.target) * 100));
                    const isClaimed = p.claimed;
                    const isCompleted = p.completed;
                    const canClaim = isCompleted && !isClaimed;
                    const canSkip = !isCompleted && !isClaimed;
                    const hasProtectedProgress = currentTierConfig.protectedProgress && p.current > 0 && !isCompleted;

                    return (
                      <div
                        key={quest.id}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between space-y-3 ${
                          isClaimed
                            ? 'bg-zinc-950/40 border-zinc-900 opacity-60'
                            : canClaim
                            ? 'bg-amber-950/30 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/50'
                            : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        {/* Top Meta & Scope Badge */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[8.5px] font-mono font-black uppercase px-2 py-0.5 rounded ${activeTheme.badge}`}>
                                {quest.tierBadge}
                              </span>
                              <span className="text-[8.5px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-850 text-zinc-400 border border-zinc-750 uppercase">
                                {quest.scope.replace('_', ' ')}
                              </span>
                              {hasProtectedProgress && (
                                <span className="text-[8px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <Lock className="w-2.5 h-2.5" /> PROTECTED PROGRESS
                                </span>
                              )}
                            </div>

                            <h3 className="font-display font-black uppercase text-sm sm:text-base text-white pt-1">
                              {quest.title}
                            </h3>
                            <p className="text-xs font-mono text-zinc-400 leading-relaxed">
                              {quest.description}
                            </p>
                          </div>

                          {/* Reward Badges */}
                          <div className="text-right font-mono shrink-0 space-y-1">
                            <span className="text-emerald-400 font-bold block text-sm sm:text-base">
                              +${quest.rewardCash.toLocaleString()}
                            </span>
                            {quest.rewardKey && (
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold inline-block ${
                                quest.rewardKey.tier === 'iron' ? 'bg-zinc-800 text-zinc-200 border border-zinc-700' :
                                quest.rewardKey.tier === 'gold' ? 'bg-amber-950 text-amber-300 border border-amber-500/80' :
                                quest.rewardKey.tier === 'diamond' ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/80' :
                                'bg-purple-950 text-purple-300 border border-purple-500/80'
                              }`}>
                                +{quest.rewardKey.label}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar & Actions */}
                        <div className="pt-2 border-t border-zinc-800/80 flex flex-col space-y-3">
                          {quest.id === 'the_unbroken_gauntlet' ? (
                            /* 6.5.3 THE UNBROKEN GAUNTLET: 5-SEGMENT MULTI-COLORED MARTIAL PALETTE */
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400">
                                <span className="flex items-center gap-1 font-bold text-amber-300">
                                  <Swords className="w-3.5 h-3.5 text-amber-400" />
                                  5-Segment Martial Progression (2 Consecutive Bots per Style)
                                </span>
                                <span className="font-bold text-zinc-200">{currentVal} / 10 Bots</span>
                              </div>

                              {/* 5-Segment Martial Palette Progress Bar */}
                              <div className="grid grid-cols-5 gap-1.5 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
                                {[1, 2, 3, 4, 5].map(segIdx => {
                                  const gauntletSub: UnbrokenGauntletSubProgress = (p.subProgress as any) || {
                                    currentSegmentWins: 0,
                                    currentSegmentStyle: '',
                                    completedSegments: [],
                                    styleHistory: [],
                                  };
                                  const completedSeg = gauntletSub.completedSegments?.find(s => s.segmentIndex === segIdx);
                                  const isActiveSeg = !completedSeg && (gauntletSub.completedSegments?.length || 0) === (segIdx - 1);
                                  const currentSegWins = isActiveSeg ? (gauntletSub.currentSegmentWins || 0) : 0;
                                  const currentStyleInfo = isActiveSeg && gauntletSub.currentSegmentStyle ? getStyleInfo(gauntletSub.currentSegmentStyle) : null;

                                  return (
                                    <div
                                      key={segIdx}
                                      className="group relative flex flex-col space-y-1 cursor-default"
                                      title={completedSeg ? `Segment ${segIdx}: Completed with ${completedSeg.styleName} at ${new Date(completedSeg.completedAt).toLocaleTimeString()}` : `Segment ${segIdx}: 2 Consecutive Bot Wins`}
                                    >
                                      <div
                                        className={`h-5 rounded-lg overflow-hidden border transition-all duration-300 flex items-center justify-center relative ${
                                          completedSeg
                                            ? 'border-white/30 shadow-md ring-1 ring-white/20'
                                            : isActiveSeg
                                            ? 'border-amber-400/80 bg-zinc-900 ring-1 ring-amber-400/40'
                                            : 'border-zinc-850 bg-zinc-900/60 opacity-50'
                                        }`}
                                        style={{
                                          backgroundColor: completedSeg ? completedSeg.styleColor : undefined,
                                        }}
                                      >
                                        {/* Active Partial 1/2 Progress Bar */}
                                        {isActiveSeg && currentSegWins === 1 && currentStyleInfo && (
                                          <div
                                            className="absolute left-0 top-0 bottom-0 w-1/2 rounded-l-lg transition-all duration-300"
                                            style={{ backgroundColor: currentStyleInfo.color }}
                                          />
                                        )}

                                        {/* Segment Label */}
                                        <span className={`text-[7.5px] font-mono font-black uppercase z-10 truncate px-1 ${
                                          completedSeg ? 'text-black drop-shadow font-black' : 'text-zinc-300'
                                        }`}>
                                          {completedSeg ? completedSeg.styleName : isActiveSeg ? `${currentSegWins}/2 Wins` : `Seg ${segIdx}`}
                                        </span>
                                      </div>

                                      {/* Segment Sub-Text Telemetry */}
                                      <div className="text-[7.5px] font-mono text-center truncate text-zinc-500">
                                        {completedSeg ? (
                                          <span className="text-zinc-200 font-bold">
                                            ✓ {completedSeg.styleName.split(' ')[0]}
                                          </span>
                                        ) : isActiveSeg ? (
                                          <span className="text-amber-400 font-bold animate-pulse">
                                            {currentStyleInfo ? `1/2 with ${currentStyleInfo.name.split(' ')[0]}` : 'Ready for Bot'}
                                          </span>
                                        ) : (
                                          <span>Locked</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* 3-Cycle Style Cooldown Telemetry & Generous Mercy Status */}
                              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 text-[8.5px] font-mono text-zinc-400 border-t border-zinc-850/60">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="text-zinc-400 font-bold">3-Cycle Cooldown:</span>
                                  {((p.subProgress as any)?.styleHistory?.length || 0) > 0 ? (
                                    <div className="flex items-center gap-1">
                                      {(p.subProgress as any).styleHistory.slice(-3).map((stId: string, idx: number) => {
                                        const info = getStyleInfo(stId);
                                        return (
                                          <span
                                            key={idx}
                                            className="px-1.5 py-0.2 rounded font-bold text-[8px]"
                                            style={{ backgroundColor: `${info.color}22`, color: info.color, border: `1px solid ${info.color}55` }}
                                          >
                                            {info.name}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <span className="text-zinc-500 italic">None (All Styles Ready)</span>
                                  )}
                                </div>

                                <span className="text-[8px] text-emerald-400 font-bold">
                                  Generous Mercy Rule Active
                                </span>
                              </div>
                            </div>
                          ) : (
                            /* Standard Quest Progress Meter */
                            <div className="space-y-1">
                              <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                                <span>Target: {quest.targetUnit}</span>
                                <span className="font-bold text-zinc-200">{currentVal} / {quest.target}</span>
                              </div>
                              <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isCompleted ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Action Buttons Row */}
                          <div className="flex items-center justify-end gap-2 shrink-0 pt-1">
                            {canSkip && (
                              isSkipOnCooldown ? (
                                <button
                                  disabled
                                  className="px-3 py-1.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-500 text-xs font-mono font-bold uppercase cursor-not-allowed flex items-center gap-1.5"
                                  title="Skip limit reached for this tier. Cooldown active."
                                >
                                  <Clock className="w-3.5 h-3.5 text-zinc-600" />
                                  <span>Swap CD ({formatTimeLeft(currentTierTimer?.nextSkipRechargeTime || 0)})</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleSkip(quest)}
                                  className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-300 hover:text-white text-xs font-mono font-bold uppercase transition cursor-pointer flex items-center gap-1.5"
                                  title={`Swap this quest for a new random quest ($${quest.skipFee}). ${skipsAvailable}/${currentSkipConfig.maxSkips} skips remaining.`}
                                >
                                  <RefreshCw className="w-3 h-3 text-amber-400" />
                                  <span>Swap (${quest.skipFee})</span>
                                  <span className="text-[9px] text-zinc-400 font-normal">({skipsAvailable} left)</span>
                                </button>
                              )
                            )}

                            {isClaimed ? (
                              <span className="px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> CLAIMED
                              </span>
                            ) : canClaim ? (
                              <button
                                onClick={() => handleClaim(quest)}
                                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-display font-black uppercase text-xs rounded-xl shadow-lg animate-pulse transition cursor-pointer active:scale-95"
                              >
                                CLAIM BOUNTY
                              </button>
                            ) : (
                              <span className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 text-xs font-mono font-bold flex items-center gap-1">
                                <Lock className="w-3 h-3" /> IN PROGRESS
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 p-3 px-5 rounded-2xl border text-xs font-mono font-bold shadow-2xl flex items-center gap-2.5 ${
              notification.type === 'reward'
                ? 'bg-amber-950/90 border-amber-500 text-amber-200'
                : 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{notification.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
