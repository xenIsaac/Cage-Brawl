import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, CheckCheck, Sparkles, Zap, 
  Shield, Flame, ChevronRight, ChevronLeft, Key, DollarSign, FastForward,
  Lock, Award, CheckCircle2, AlertCircle, Swords, ArrowRight,
  Clock, RefreshCw, Trash2, ShieldCheck, AlertTriangle, Crown, Star, RotateCcw, LogOut
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
import { useResponsiveLayout } from '../utils/useResponsiveLayout';

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
  
  const { isPortrait, isLandscape, isMobile, isCompactLandscape } = useResponsiveLayout();
  const isPcDevice = !isMobile;
  // 5 Vertical Slides Navigation State (Tiers 1 to 5)
  const [activeTierSlide, setActiveTierSlide] = useState<OfflineQuestTier>(1);
  const [mobileQuestIndex, setMobileQuestIndex] = useState<number>(0);
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
    setMobileQuestIndex(0);
  };

  const handlePrevSlide = () => {
    soundManager.playRollTick?.();
    setActiveTierSlide(prev => (prev > 1 ? ((prev - 1) as OfflineQuestTier) : 5));
    setMobileQuestIndex(0);
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
    <div className="w-full h-full bg-zinc-950 text-white flex flex-col select-none overflow-hidden">
      {/* BACKGROUND COMIC WATERMARK */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0 opacity-5">
        <div className="absolute -top-12 -right-12 font-display font-black italic text-9xl text-white tracking-tighter -skew-x-12 select-none">
          BOUNTY VAULT
        </div>
        <div className="absolute -bottom-10 -left-10 font-display font-black italic text-9xl text-amber-500 tracking-tighter -skew-x-12 select-none">
          TAKE YOUR CLAIM
        </div>
      </div>

      {/* ============================================================== */}
      {/* 1. TOP HEADER & TELEMETRY                                      */}
      {/* ============================================================== */}
      {/* ============================================================== */}
      {/* 1. COMPACT UNIFIED HEADER (ONE SLIM ROW - ZERO SCREEN CLUTTER) */}
      {/* ============================================================== */}
      <header className="px-3 sm:px-5 py-2 bg-black border-b-2 sm:border-b-4 border-white flex items-center justify-between gap-2 shrink-0 z-20">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <div className="bg-red-600 text-black px-2.5 py-0.5 font-display font-black italic text-xs uppercase -skew-x-12 shadow-[2px_2px_0px_#ffffff] flex items-center gap-1 shrink-0">
            <Trophy className="w-3.5 h-3.5 text-black" />
            <span className="hidden sm:inline">AI BOUNTY</span>
          </div>

          {/* TIER CHIP SELECTORS */}
          <div className="flex items-center gap-1 shrink-0">
            {tiersList.map(tier => {
              const isCurrent = activeTierSlide === tier;
              const readyCount = tierClaimableCounts[tier];

              return (
                <button
                  key={tier}
                  onClick={() => {
                    soundManager.playRollTick?.();
                    setActiveTierSlide(tier);
                    setMobileQuestIndex(0);
                  }}
                  className={`px-2 py-0.5 text-xs font-display font-black italic uppercase -skew-x-12 transition flex items-center gap-1 cursor-pointer border ${
                    isCurrent
                      ? 'bg-red-600 text-black border-white shadow-[2px_2px_0px_#ffffff]'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  <span>T0{tier}</span>
                  {readyCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  )}
                </button>
              );
            })}
          </div>

          {/* ACTIVE TIER & TIMER META */}
          <div className="hidden md:flex items-center gap-2 text-xs font-mono ml-1">
            <span className="font-display font-black italic text-white uppercase tracking-wider text-xs">
              {currentTierConfig.tierTitle}
            </span>
            <span className="text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[10px] -skew-x-6">
              <Clock className="w-3 h-3 inline text-amber-400 mr-1" />
              {formatTimeLeft(currentTierTimer?.nextRecycleTime || 0)}
            </span>
          </div>
        </div>

        {/* ACTION BUTTONS & CAROUSEL CHEVRONS */}
        <div className="flex items-center gap-1.5 shrink-0">
          {claimableCount > 0 && (
            <button
              onClick={handleClaimAll}
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-400 hover:bg-white text-black font-display font-black italic uppercase text-xs -skew-x-12 shadow-[2px_2px_0px_#000000] animate-pulse transition cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>CLAIM ALL ({claimableCount})</span>
            </button>
          )}

          <button
            onClick={handleRestartQuests}
            className={`flex items-center gap-1 px-2 py-1 text-xs font-mono font-bold uppercase -skew-x-12 border transition cursor-pointer ${
              confirmRestart
                ? 'bg-red-600 text-white border-white animate-pulse shadow-[2px_2px_0px_#ffffff]'
                : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white shadow-[2px_2px_0px_#000000]'
            }`}
            title={confirmRestart ? 'Click again to confirm quest restart' : 'Restart rotation'}
          >
            <RotateCcw className={`w-3 h-3 ${confirmRestart ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{confirmRestart ? 'CONFIRM?' : 'RESET'}</span>
          </button>

          {/* Slide Next / Prev Controls */}
          <div className="flex items-center gap-0.5 text-zinc-400">
            <button
              onClick={handlePrevSlide}
              className="p-1 bg-zinc-900 hover:bg-white hover:text-black border border-zinc-700 text-zinc-300 -skew-x-12 transition cursor-pointer"
              title="Previous Tier Slide"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1 font-black text-amber-400 -skew-x-6">
              0{activeTierSlide}/05
            </span>
            <button
              onClick={handleNextSlide}
              className="p-1 bg-zinc-900 hover:bg-white hover:text-black border border-zinc-700 text-zinc-300 -skew-x-12 transition cursor-pointer"
              title="Next Tier Slide"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* DEDICATED RETURN BUTTON TO SINGLEPLAYER UI */}
          {onReturnToSingleplayerHub && (
            <button
              onClick={() => {
                soundManager.playRollTick?.();
                onReturnToSingleplayerHub();
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-white text-black font-display font-black italic uppercase text-xs -skew-x-12 shadow-[2px_2px_0px_#ffffff] transition cursor-pointer active:scale-95 ml-1"
              title="Return to Singleplayer UI"
            >
              <LogOut className="w-3.5 h-3.5 rotate-180 text-black" />
              <span>RETURN</span>
            </button>
          )}
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. ACTIVE TIER SLIDE: PROPORTIONALLY SCALED 1-SQUARE CAROUSEL  */}
      {/* ============================================================== */}
      <main className="flex-1 flex flex-col p-2 sm:p-3 bg-zinc-950 relative overflow-hidden select-none justify-between min-h-0">
        {/* HALPTONE BG ACCENT */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

        {/* 1-SQUARE-HIGH SWIPABLE CAROUSEL STAGE WITH DEPTH SHADOWS */}
        <div className="flex-1 flex items-center justify-center relative py-1 min-h-0">
          {/* CAROUSEL DEPTH GHOST CARDS (STRICTLY Z-0, HIDDEN ON COMPACT SCREENS SO BUTTONS NEVER GET HIDDEN) */}
          <div className="hidden xl:block absolute left-4 lg:left-8 w-60 h-[70%] bg-black/60 border-2 border-zinc-800 -skew-x-6 opacity-20 pointer-events-none scale-90 -translate-x-6 shadow-[-10px_10px_0px_#000000] z-0" />
          <div className="hidden xl:block absolute right-4 lg:right-8 w-60 h-[70%] bg-black/60 border-2 border-zinc-800 -skew-x-6 opacity-20 pointer-events-none scale-90 translate-x-6 shadow-[10px_10px_0px_#000000] z-0" />

          {currentTierQuests.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 font-mono text-sm border-2 border-dashed border-zinc-700 -skew-x-6">
              Generating target bounty poster...
            </div>
          ) : (
            (() => {
              const safeIndex = mobileQuestIndex % currentTierQuests.length;
              const quest = currentTierQuests[safeIndex];
              const p = hubState.progress[quest.id] || { current: 0, completed: false, claimed: false, skipped: false };
              const currentVal = Math.min(quest.target, p.current);
              const percent = Math.min(100, Math.round((currentVal / quest.target) * 100));
              const isClaimed = p.claimed;
              const isCompleted = p.completed;
              const canClaim = isCompleted && !isClaimed;
              const canSkip = !isCompleted && !isClaimed;

              // Dynamic Tier Color Themes (Bold Persona Calling Card styling)
              const tierStyles = {
                1: {
                  bg: 'bg-gradient-to-br from-[#1c0808] via-black to-[#0c0303]',
                  border: 'border-red-500',
                  shadow: 'shadow-[6px_6px_0px_#E60012]',
                  accent: 'text-red-400',
                  progress: 'bg-red-600',
                },
                2: {
                  bg: 'bg-gradient-to-br from-[#1a1204] via-black to-[#0e0a02]',
                  border: 'border-amber-400',
                  shadow: 'shadow-[6px_6px_0px_#FFD600]',
                  accent: 'text-amber-400',
                  progress: 'bg-amber-400',
                },
                3: {
                  bg: 'bg-gradient-to-br from-[#170624] via-black to-[#0b0312]',
                  border: 'border-purple-500',
                  shadow: 'shadow-[6px_6px_0px_#A855F7]',
                  accent: 'text-purple-400',
                  progress: 'bg-purple-500',
                },
                4: {
                  bg: 'bg-gradient-to-br from-[#041924] via-black to-[#020d12]',
                  border: 'border-cyan-400',
                  shadow: 'shadow-[6px_6px_0px_#06B6D4]',
                  accent: 'text-cyan-400',
                  progress: 'bg-cyan-400',
                },
                5: {
                  bg: 'bg-gradient-to-br from-[#041f14] via-black to-[#02100a]',
                  border: 'border-emerald-400',
                  shadow: 'shadow-[6px_6px_0px_#10B981]',
                  accent: 'text-emerald-400',
                  progress: 'bg-emerald-400',
                },
              }[quest.tier] || {
                bg: 'bg-black',
                border: 'border-white',
                shadow: 'shadow-[6px_6px_0px_#E60012]',
                accent: 'text-red-400',
                progress: 'bg-amber-400',
              };

              return (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${activeTierSlide}-${quest.id}`}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.16 }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -35) {
                        soundManager.playRollTick?.();
                        setMobileQuestIndex(prev => (prev < currentTierQuests.length - 1 ? prev + 1 : 0));
                      } else if (info.offset.x > 35) {
                        soundManager.playRollTick?.();
                        setMobileQuestIndex(prev => (prev > 0 ? prev - 1 : currentTierQuests.length - 1));
                      }
                    }}
                    className={`w-full max-w-lg lg:max-w-xl ${tierStyles.bg} border-3 sm:border-4 ${tierStyles.border} ${tierStyles.shadow} p-3 sm:p-4.5 flex flex-col justify-between relative z-10 -skew-x-2 select-none cursor-grab active:cursor-grabbing max-h-[300px] sm:max-h-[360px] md:max-h-[400px]`}
                  >
                    {/* CARD TOP META */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-red-600 text-black font-display font-black italic text-[11px] uppercase px-2 py-0.5 -skew-x-12 shadow-[2px_2px_0px_#ffffff]">
                            TARGET 0{safeIndex + 1}
                          </span>
                          <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 bg-black text-zinc-300 border border-zinc-700 uppercase -skew-x-6">
                            {quest.scope.replace('_', ' ')}
                          </span>
                        </div>

                        {/* TARGET STEPPER CHEVRONS */}
                        {currentTierQuests.length > 1 && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                soundManager.playRollTick?.();
                                setMobileQuestIndex(prev => (prev > 0 ? prev - 1 : currentTierQuests.length - 1));
                              }}
                              className="px-1.5 py-0.5 bg-zinc-900 hover:bg-white hover:text-black border border-white text-white font-mono font-bold text-[10px] -skew-x-12 cursor-pointer shadow-[1px_1px_0px_#000000] active:scale-95 transition"
                            >
                              ◀
                            </button>
                            <span className="text-[10px] font-mono font-black text-amber-400 px-1 -skew-x-6">
                              0{safeIndex + 1}/0{currentTierQuests.length}
                            </span>
                            <button
                              onClick={() => {
                                soundManager.playRollTick?.();
                                setMobileQuestIndex(prev => (prev < currentTierQuests.length - 1 ? prev + 1 : 0));
                              }}
                              className="px-1.5 py-0.5 bg-zinc-900 hover:bg-white hover:text-black border border-white text-white font-mono font-bold text-[10px] -skew-x-12 cursor-pointer shadow-[1px_1px_0px_#000000] active:scale-95 transition"
                            >
                              ▶
                            </button>
                          </div>
                        )}
                      </div>

                      <h3 className="font-display font-black italic uppercase text-base sm:text-xl text-white tracking-wide leading-tight">
                        {quest.title}
                      </h3>
                      <p className="text-[11px] sm:text-xs font-mono text-zinc-300 leading-snug line-clamp-2">
                        {quest.description}
                      </p>
                    </div>

                    {/* CARD REWARD & TELEMETRY */}
                    <div className="space-y-2 pt-2 border-t-2 border-white/20 mt-2">
                      {/* PROGRESS METER */}
                      <div className="space-y-0.5">
                        <div className="flex justify-between items-center text-[10px] sm:text-xs font-mono text-zinc-300">
                          <span>OBJECTIVE PROGRESS</span>
                          <span className="font-bold text-white text-xs sm:text-sm">{currentVal} / {quest.target}</span>
                        </div>
                        <div className="w-full h-2 sm:h-2.5 bg-black border-2 border-white p-0.5 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${tierStyles.progress}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* PAYOUT ROW & PROPERLY PLACED BUTTONS (NEVER CLIPPED OR HIDDEN) */}
                      <div className="flex items-center justify-between pt-0.5">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-mono text-zinc-400 uppercase">REWARD</span>
                          <div className="flex items-center gap-1.5 font-mono font-bold text-xs sm:text-sm">
                            <span className="text-emerald-400">+${quest.rewardCash.toLocaleString()}</span>
                            {quest.rewardKey && (
                              <span className="text-amber-300 font-mono text-[8.5px] px-1 py-0.2 bg-black border border-amber-500 -skew-x-6">
                                +{quest.rewardKey.label}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* ACTION BUTTONS */}
                        <div className="flex items-center gap-1.5">
                          {canSkip && (
                            <button
                              disabled={isSkipOnCooldown}
                              onClick={() => handleSkip(quest)}
                              className={`px-2.5 py-1 font-display font-black italic uppercase text-[11px] -skew-x-12 border transition cursor-pointer ${
                                isSkipOnCooldown
                                  ? 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed'
                                  : 'bg-zinc-800 hover:bg-white text-white hover:text-black border-zinc-600 shadow-[2px_2px_0px_#000000]'
                              }`}
                            >
                              SWAP (${quest.skipFee})
                            </button>
                          )}

                          {isClaimed ? (
                            <span className="px-3 py-1 bg-black border border-emerald-500 text-emerald-400 text-xs font-mono font-bold uppercase -skew-x-6">
                              ✓ CLAIMED
                            </span>
                          ) : canClaim ? (
                            <button
                              onClick={() => handleClaim(quest)}
                              className="px-4 py-1.5 bg-amber-400 hover:bg-white text-black font-display font-black italic uppercase text-xs sm:text-sm -skew-x-12 shadow-[2px_2px_0px_#000000] animate-pulse cursor-pointer active:scale-95"
                            >
                              CLAIM BOUNTY
                            </button>
                          ) : (
                            <span className="px-2.5 py-1 bg-black border border-zinc-800 text-zinc-500 text-[11px] font-mono font-bold uppercase -skew-x-6">
                              IN PROGRESS
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* CAROUSEL STEPPER DOTS */}
                    {currentTierQuests.length > 1 && (
                      <div className="flex items-center justify-center gap-1.5 pt-1">
                        {currentTierQuests.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              soundManager.playRollTick?.();
                              setMobileQuestIndex(idx);
                            }}
                            className={`h-1.5 transition-all duration-200 cursor-pointer ${
                              idx === safeIndex ? 'w-5 bg-red-600' : 'w-1.5 bg-zinc-700 hover:bg-zinc-500'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              );
            })()
          )}
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
