import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, CheckCheck, Sparkles, Zap, Shield, Flame, ChevronRight, 
  Key, DollarSign, Lock, Award, CheckCircle2, Bot, TrendingUp, 
  Star, Swords, ShieldAlert, ArrowLeft, Crown, Check, CheckCircle, RotateCcw
} from 'lucide-react';
import { PlayerStats } from '../types';
import { 
  CAREER_MILESTONE_TRACKS, 
  CareerMilestoneManager, 
  MilestoneTrack, 
  MilestoneStage, 
  MilestoneProgressState 
} from '../data/careerMilestones';
import { soundManager } from './SoundManager';

interface CareerMilestonesScreenProps {
  stats: PlayerStats;
  updateStats: (updates: Partial<PlayerStats>) => void;
  email?: string;
  onReturnToSingleplayerHub: () => void;
  isNavHidden?: boolean;
  setIsNavHidden?: (hidden: boolean) => void;
  onClaimableCountChange?: (count: number) => void;
}

export default function CareerMilestonesScreen({
  stats,
  updateStats,
  email = '',
  onReturnToSingleplayerHub,
  isNavHidden = false,
  setIsNavHidden,
  onClaimableCountChange,
}: CareerMilestonesScreenProps) {
  const [milestoneState, setMilestoneState] = useState<MilestoneProgressState>(() => 
    CareerMilestoneManager.syncWithStats(email, stats)
  );
  const [filterCategory, setFilterCategory] = useState<'all' | 'combat' | 'ranked' | 'defense' | 'tournament_combo'>('all');
  const [toastNotification, setToastNotification] = useState<{ text: string; type: 'success' | 'reward' | 'info' } | null>(null);

  useEffect(() => {
    const updated = CareerMilestoneManager.syncWithStats(email, stats);
    setMilestoneState(updated);
  }, [email, stats]);

  useEffect(() => {
    const handleUpdate = () => {
      setMilestoneState(CareerMilestoneManager.getState(email, stats));
    };
    window.addEventListener('career_milestones_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('career_milestones_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [email, stats]);

  const refreshState = () => {
    const updated = CareerMilestoneManager.syncWithStats(email, stats);
    setMilestoneState(updated);
  };

  const showToast = (text: string, type: 'success' | 'reward' | 'info' = 'success') => {
    setToastNotification({ text, type });
    setTimeout(() => setToastNotification(null), 3500);
  };

  // Calculate total claimable stages across all 9 tracks
  const claimableCount = useMemo(() => {
    let count = 0;
    for (const track of CAREER_MILESTONE_TRACKS) {
      const currentVal = milestoneState.counts[track.statKey] || 0;
      const claimedList = milestoneState.claimedStages[track.id] || [];
      for (const stage of track.stages) {
        if (currentVal >= stage.target && !claimedList.includes(stage.stageNumber)) {
          count++;
        }
      }
    }
    return count;
  }, [milestoneState]);

  useEffect(() => {
    if (onClaimableCountChange) {
      onClaimableCountChange(claimableCount);
    }
  }, [claimableCount, onClaimableCountChange]);

  const handleClaimStage = (track: MilestoneTrack, stage: MilestoneStage) => {
    const res = CareerMilestoneManager.claimStage(email, track.id, stage.stageNumber, stats, updateStats);
    if (res.success) {
      soundManager.playCrateWin();
      refreshState();
      showToast(res.message, 'reward');
    } else {
      showToast(res.message, 'info');
    }
  };

  const handleClaimAll = () => {
    const res = CareerMilestoneManager.claimAll(email, stats, updateStats);
    if (res.count > 0) {
      soundManager.playCrateWin();
      refreshState();
      showToast(
        `Claimed all ${res.count} milestones! +$${res.totalCash.toLocaleString()}${res.keysSummary ? ` & ${res.keysSummary}` : ''}${res.titlesSummary ? ` & Unlocked: ${res.titlesSummary}` : ''}`,
        'reward'
      );
    }
  };

  const keyInventory = useMemo(() => {
    return {
      iron: stats.keys?.iron ?? (stats.rolls ? Math.max(0, stats.rolls) : 2),
      gold: stats.keys?.gold ?? 1,
      diamond: stats.keys?.diamond ?? 0,
      obsidian: stats.keys?.obsidian ?? 0,
    };
  }, [stats.keys, stats.rolls]);

  const filteredTracks = useMemo(() => {
    if (filterCategory === 'all') return CAREER_MILESTONE_TRACKS;
    if (filterCategory === 'combat') return CAREER_MILESTONE_TRACKS.filter(t => t.id === 'bot_slayer' || t.id === 'heavy_impact' || t.id === 'striking_volume');
    if (filterCategory === 'ranked') return CAREER_MILESTONE_TRACKS.filter(t => t.id === 'ranked_ladder_climber' || t.id === 'flawless_mastery');
    if (filterCategory === 'defense') return CAREER_MILESTONE_TRACKS.filter(t => t.id === 'iron_wall' || t.id === 'the_bastion');
    if (filterCategory === 'tournament_combo') return CAREER_MILESTONE_TRACKS.filter(t => t.id === 'tournament_glory' || t.id === 'combo_specialist');
    return CAREER_MILESTONE_TRACKS;
  }, [filterCategory]);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Bot': return <Bot className="w-4 h-4" />;
      case 'TrendingUp': return <TrendingUp className="w-4 h-4" />;
      case 'Shield': return <Shield className="w-4 h-4" />;
      case 'Zap': return <Zap className="w-4 h-4" />;
      case 'Trophy': return <Trophy className="w-4 h-4" />;
      case 'Star': return <Star className="w-4 h-4" />;
      case 'Flame': return <Flame className="w-4 h-4" />;
      case 'Swords': return <Swords className="w-4 h-4" />;
      case 'ShieldAlert': return <ShieldAlert className="w-4 h-4" />;
      default: return <Award className="w-4 h-4" />;
    }
  };

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
                CAREER MILESTONES (PERMANENT TRACKS)
              </h1>
              <span className="text-[8px] sm:text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase">
                Section 6.4 &bull; 9 Master Tracks
              </span>
            </div>
            <p className="text-[9.5px] sm:text-[10.5px] text-zinc-400 font-mono hidden sm:block">
              Stages progress consecutively and replace completed ones. Earn Cash, Rare Keys, and Animated Titles.
            </p>
          </div>
        </div>

        {/* Currency & Actions */}
        <div className="flex items-center gap-2">
          {/* Cash Pill */}
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

          {/* Sync & Refresh Button */}
          <button
            onClick={() => {
              soundManager.playRollTick?.();
              refreshState();
              showToast('Milestones synchronized with career combat data!', 'info');
            }}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-300 hover:text-white rounded-xl text-xs font-display font-black italic uppercase tracking-wider transition cursor-pointer"
            title="Synchronize and refresh career milestones"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">SYNC</span>
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
      {/* 2. CATEGORY FILTER TABS                                        */}
      {/* ============================================================== */}
      <div className="px-4 sm:px-6 py-2 border-b border-zinc-850 bg-zinc-950/90 flex items-center gap-1.5 sm:gap-2 shrink-0 overflow-x-auto custom-scrollbar">
        {[
          { id: 'all', label: 'All 9 Tracks' },
          { id: 'combat', label: 'Combat & Knockouts' },
          { id: 'ranked', label: 'Ranked Ladder' },
          { id: 'defense', label: 'Parry & Bastion' },
          { id: 'tournament_combo', label: 'Tournament & Combos' },
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => {
              setFilterCategory(cat.id as any);
              soundManager.playRollTick?.();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition border cursor-pointer ${
              filterCategory === cat.id
                ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-sm'
                : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* ============================================================== */}
      {/* 3. 9 MASTER MILESTONE TRACKS (STAGE REPLACES PREVIOUS AFTER)   */}
      {/* ============================================================== */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 bg-gradient-to-b from-zinc-950 via-zinc-900/30 to-zinc-950">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredTracks.map(track => {
              const currentVal = milestoneState.counts[track.statKey] || 0;
              const claimedList = milestoneState.claimedStages[track.id] || [];
              const highestStage = track.stages[track.stages.length - 1];
              const displayVal = track.ceilingCap ? Math.min(track.ceilingCap, currentVal) : currentVal;
              const maxTarget = highestStage.target;
              const trackPercent = Math.min(100, Math.round((displayVal / maxTarget) * 100));

              // Find active stage that replaces previous after completion:
              // 1. First look for the lowest un-claimed stage that is reached (ready to claim)
              // 2. Or the lowest un-claimed stage that is currently in progress
              const activeStage = 
                track.stages.find(s => currentVal >= s.target && !claimedList.includes(s.stageNumber)) ||
                track.stages.find(s => !claimedList.includes(s.stageNumber)) ||
                null;

              const isAllCompleted = claimedList.length >= track.stages.length;

              return (
                <div
                  key={track.id}
                  className={`rounded-2xl border ${track.borderColor} bg-gradient-to-b ${track.bgGradient} p-4 sm:p-5 shadow-xl flex flex-col justify-between space-y-3.5 relative overflow-hidden`}
                >
                  {/* Track Header */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-zinc-950/80 border border-zinc-700 flex items-center justify-center text-white shadow">
                          {getIcon(track.iconName)}
                        </div>
                        <h2 className="font-display font-black italic uppercase text-sm sm:text-base text-white tracking-wide">
                          {track.categoryName}
                        </h2>
                      </div>

                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-zinc-300">
                        {displayVal} / {maxTarget} {track.ceilingCap ? '(Capped)' : ''}
                      </span>
                    </div>

                    <p className="text-[10px] font-mono text-zinc-400 mb-2.5">
                      {track.description}
                    </p>

                    {/* Master Progress Bar */}
                    <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-850 p-0.5 mb-3">
                      <div
                        className="h-full rounded-full transition-all duration-300 bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_8px_rgba(245,158,11,0.7)]"
                        style={{ width: `${trackPercent}%` }}
                      />
                    </div>

                    {/* Stage Progress Stepper Dots */}
                    <div className="flex items-center justify-between gap-1 mb-3 px-1">
                      <span className="text-[8.5px] font-mono font-bold text-zinc-400 uppercase">
                        {isAllCompleted ? 'All Stages Mastered' : `Stage ${activeStage?.stageNumber || 1} of ${track.stages.length}`}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {track.stages.map(s => {
                          const isClaimed = claimedList.includes(s.stageNumber);
                          const isCurrent = activeStage?.stageNumber === s.stageNumber;
                          return (
                            <div
                              key={s.stageNumber}
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                isClaimed
                                  ? 'w-3 bg-emerald-400'
                                  : isCurrent
                                  ? 'w-5 bg-amber-400 animate-pulse'
                                  : 'w-1.5 bg-zinc-800'
                              }`}
                              title={`Stage ${s.stageNumber}: ${s.name}`}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* CURRENT ACTIVE STAGE (REPLACES PREVIOUS AFTER COMPLETION) */}
                    <AnimatePresence mode="wait">
                      {isAllCompleted ? (
                        <motion.div
                          key="completed-deck"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="p-3.5 rounded-xl border border-emerald-500/50 bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-emerald-950/40 flex items-center justify-between gap-3 shadow-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                              <CheckCircle className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[8.5px] font-mono font-black uppercase text-emerald-300 bg-emerald-950 border border-emerald-500/40 px-1.5 py-0.2 rounded">
                                  MASTERED
                                </span>
                                <h3 className="font-display font-black uppercase text-xs text-white">
                                  Track Fully Conquered
                                </h3>
                              </div>
                              <span className="text-[9.5px] font-mono text-zinc-400 block pt-0.5">
                                All {track.stages.length} milestone tiers completed and rewards claimed!
                              </span>
                            </div>
                          </div>

                          {highestStage.rewardTitle && (
                            <div className="shrink-0 flex items-center gap-1">
                              <Crown className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                              <span className={`text-[8.5px] font-mono font-bold px-2 py-0.5 rounded ${highestStage.titleGlowClass || 'bg-amber-950 text-amber-300 border border-amber-500'}`}>
                                « {highestStage.rewardTitle} »
                              </span>
                            </div>
                          )}
                        </motion.div>
                      ) : activeStage ? (
                        <motion.div
                          key={`stage-${activeStage.stageNumber}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className={`p-3 sm:p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between space-y-2.5 ${
                            currentVal >= activeStage.target
                              ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/50'
                              : 'bg-zinc-950/80 border-zinc-800'
                          }`}
                        >
                          {/* Top: Active Stage Info */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded bg-zinc-800 text-amber-300 border border-zinc-700">
                                  ACTIVE STAGE {activeStage.stageNumber}
                                </span>
                                <h3 className="font-display font-black uppercase text-xs sm:text-sm text-white">
                                  {activeStage.name}
                                </h3>
                              </div>
                              <span className="text-[10px] font-mono text-zinc-300 block pt-0.5">
                                Requirement: {activeStage.targetLabel}
                              </span>

                              {/* Title Unlock Badge */}
                              {activeStage.rewardTitle && (
                                <div className="pt-1.5 flex items-center gap-1.5">
                                  <Crown className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                                  <span className={`text-[8.5px] font-mono font-bold px-2 py-0.5 rounded ${activeStage.titleGlowClass || 'bg-amber-950 text-amber-300 border border-amber-500'}`}>
                                    Unlocks Title: « {activeStage.rewardTitle} »
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Reward Yield Badge */}
                            <div className="text-right font-mono text-[9px] shrink-0">
                              <span className="text-emerald-400 font-bold block text-[11px]">
                                +${activeStage.rewardCash.toLocaleString()}
                              </span>
                              {activeStage.rewardKey && (
                                <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold mt-0.5 inline-block ${
                                  activeStage.rewardKey.tier === 'iron' ? 'bg-zinc-800 text-zinc-300 border border-zinc-700' :
                                  activeStage.rewardKey.tier === 'gold' ? 'bg-amber-950 text-amber-300 border border-amber-600/80' :
                                  activeStage.rewardKey.tier === 'diamond' ? 'bg-cyan-950 text-cyan-300 border border-cyan-600/80' :
                                  'bg-purple-950 text-purple-300 border border-purple-600/80'
                                }`}>
                                  +{activeStage.rewardKey.label}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Stage Progress Bar & Action Button */}
                          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-3">
                            <div className="flex-1 space-y-1">
                              <div className="flex justify-between text-[8px] font-mono text-zinc-400">
                                <span>Progress</span>
                                <span>{Math.min(activeStage.target, currentVal)} / {activeStage.target}</span>
                              </div>
                              <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    currentVal >= activeStage.target ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.round((currentVal / activeStage.target) * 100))}%` }}
                                />
                              </div>
                            </div>

                            {/* Claim Action */}
                            {currentVal >= activeStage.target ? (
                              <button
                                onClick={() => handleClaimStage(track, activeStage)}
                                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-display font-black uppercase text-[10px] rounded-lg shadow-md animate-pulse transition cursor-pointer active:scale-95 shrink-0"
                              >
                                CLAIM STAGE
                              </button>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 text-[8.5px] font-mono font-bold flex items-center gap-1 shrink-0">
                                <Lock className="w-2.5 h-2.5" /> IN PROGRESS
                              </span>
                            )}
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastNotification && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 p-3 px-5 rounded-2xl border text-xs font-mono font-bold shadow-2xl flex items-center gap-2.5 ${
              toastNotification.type === 'reward'
                ? 'bg-amber-950/90 border-amber-500 text-amber-200'
                : 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{toastNotification.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
