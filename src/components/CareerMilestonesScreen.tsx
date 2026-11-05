import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, CheckCheck, Sparkles, Zap, Shield, Flame, ChevronRight, 
  DollarSign, Lock, Award, Bot, TrendingUp, 
  Star, Swords, ShieldAlert, Crown, CheckCircle, RotateCcw
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
import { useResponsiveLayout } from '../utils/useResponsiveLayout';

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
  onClaimableCountChange,
}: CareerMilestonesScreenProps) {
  const { isMobile } = useResponsiveLayout();
  const [milestoneState, setMilestoneState] = useState<MilestoneProgressState>(() => 
    CareerMilestoneManager.syncWithStats(email, stats)
  );
  const [activeTrackIndex, setActiveTrackIndex] = useState<number>(0);
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
    <div className="w-full h-full bg-zinc-950 text-white flex flex-col select-none overflow-hidden relative font-sans">
      {/* HALPTONE BG ACCENT */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

      {/* HEADER & TELEMETRY */}
      <header className="px-4 sm:px-6 py-3 border-b-4 border-white bg-black flex items-center justify-between gap-3 shrink-0 z-20 shadow-[0_4px_0px_#000000]">
        <div className="flex items-center gap-2.5">
          <div className="bg-red-600 text-black px-3 py-1 font-display font-black italic text-xs uppercase -skew-x-12 shadow-[2px_2px_0px_#ffffff] flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-black" />
            <span>CAREER</span>
          </div>
          <div>
            <h1 className="text-sm sm:text-lg font-display font-black italic uppercase text-white tracking-wider">
              PERMANENT COMBAT MILESTONES
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {claimableCount > 0 && (
            <button
              onClick={handleClaimAll}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-400 hover:bg-white text-black font-display font-black italic uppercase text-xs -skew-x-12 shadow-[3px_3px_0px_#000000] animate-pulse transition cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>CLAIM ALL ({claimableCount})</span>
            </button>
          )}

          <button
            onClick={() => {
              soundManager.playRollTick?.();
              refreshState();
              showToast('Milestones synchronized with stats!', 'info');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-white hover:text-black border-2 border-white text-white rounded-none -skew-x-12 text-xs font-mono font-bold uppercase transition cursor-pointer shadow-[2px_2px_0px_#000000]"
            title="Refresh state"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>SYNC</span>
          </button>
        </div>
      </header>

      {/* MILESTONE TRACKS: PERSONA TROPHY CALLING CARD CAROUSEL (ZERO SCROLLING) */}
      <main className="flex-1 flex flex-col p-2 sm:p-3 bg-zinc-950 relative overflow-hidden select-none justify-between min-h-0">
        {/* TOP TRACK SELECTOR STRIP */}
        <div className="flex items-center justify-between pb-1.5 border-b-2 border-white/20 shrink-0 relative z-10 px-1 sm:px-2">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            {CAREER_MILESTONE_TRACKS.map((t, idx) => {
              const isCurrent = activeTrackIndex === idx;
              const currentVal = milestoneState.counts[t.statKey] || 0;
              const claimedList = milestoneState.claimedStages[t.id] || [];
              const hasClaimable = t.stages.some(s => currentVal >= s.target && !claimedList.includes(s.stageNumber));
              const isMastered = claimedList.length >= t.stages.length;

              return (
                <button
                  key={t.id}
                  onClick={() => {
                    soundManager.playRollTick?.();
                    setActiveTrackIndex(idx);
                  }}
                  className={`px-2 py-0.5 text-[11px] font-display font-black italic uppercase -skew-x-12 cursor-pointer transition border flex items-center gap-1 shrink-0 ${
                    isCurrent
                      ? 'bg-red-600 text-black border-white shadow-[2px_2px_0px_#ffffff]'
                      : isMastered
                      ? 'bg-zinc-900 text-emerald-400 border-emerald-500/50'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  <span>0{idx + 1}</span>
                  {hasClaimable && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
                </button>
              );
            })}
          </div>

          {/* Carousel Next / Prev Controls */}
          <div className="flex items-center gap-1 shrink-0 pl-1">
            <button
              onClick={() => {
                soundManager.playRollTick?.();
                setActiveTrackIndex(prev => (prev > 0 ? prev - 1 : CAREER_MILESTONE_TRACKS.length - 1));
              }}
              className="px-1.5 py-0.5 bg-zinc-900 hover:bg-white hover:text-black border border-white text-white font-mono font-bold text-[10px] -skew-x-12 cursor-pointer shadow-[1px_1px_0px_#000000] active:scale-95 transition"
              title="Previous Track"
            >
              ◀
            </button>
            <span className="text-[10px] font-mono font-black text-amber-400 px-0.5 -skew-x-6">
              0{activeTrackIndex + 1}/0{CAREER_MILESTONE_TRACKS.length}
            </span>
            <button
              onClick={() => {
                soundManager.playRollTick?.();
                setActiveTrackIndex(prev => (prev < CAREER_MILESTONE_TRACKS.length - 1 ? prev + 1 : 0));
              }}
              className="px-1.5 py-0.5 bg-zinc-900 hover:bg-white hover:text-black border border-white text-white font-mono font-bold text-[10px] -skew-x-12 cursor-pointer shadow-[1px_1px_0px_#000000] active:scale-95 transition"
              title="Next Track"
            >
              ▶
            </button>
          </div>
        </div>

        {/* 1-SQUARE-HIGH PERSONA TROPHY CARD WITH CAROUSEL DEPTH SHADOWS */}
        <div className="flex-1 flex items-center justify-center relative py-1 min-h-0">
          {/* CAROUSEL DEPTH GHOST CARDS (STRICTLY Z-0, HIDDEN ON COMPACT LANDSCAPE SO NEVER COVERS BUTTONS) */}
          <div className="hidden xl:block absolute left-4 lg:left-8 w-60 h-[70%] bg-black/60 border-2 border-zinc-800 -skew-x-6 opacity-20 pointer-events-none scale-90 -translate-x-6 shadow-[-10px_10px_0px_#000000] z-0" />
          <div className="hidden xl:block absolute right-4 lg:right-8 w-60 h-[70%] bg-black/60 border-2 border-zinc-800 -skew-x-6 opacity-20 pointer-events-none scale-90 translate-x-6 shadow-[10px_10px_0px_#000000] z-0" />

          {(() => {
            const track = CAREER_MILESTONE_TRACKS[activeTrackIndex % CAREER_MILESTONE_TRACKS.length];
            const currentVal = milestoneState.counts[track.statKey] || 0;
            const claimedList = milestoneState.claimedStages[track.id] || [];
            const highestStage = track.stages[track.stages.length - 1];
            const displayVal = track.ceilingCap ? Math.min(track.ceilingCap, currentVal) : currentVal;
            const maxTarget = highestStage.target;
            const trackPercent = Math.min(100, Math.round((displayVal / maxTarget) * 100));

            const activeStage = 
              track.stages.find(s => currentVal >= s.target && !claimedList.includes(s.stageNumber)) ||
              track.stages.find(s => !claimedList.includes(s.stageNumber)) ||
              null;

            const isAllCompleted = claimedList.length >= track.stages.length;
            const canClaimStage = activeStage && currentVal >= activeStage.target;

            return (
              <AnimatePresence mode="wait">
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.16 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -35) {
                      soundManager.playRollTick?.();
                      setActiveTrackIndex(prev => (prev < CAREER_MILESTONE_TRACKS.length - 1 ? prev + 1 : 0));
                    } else if (info.offset.x > 35) {
                      soundManager.playRollTick?.();
                      setActiveTrackIndex(prev => (prev > 0 ? prev - 1 : CAREER_MILESTONE_TRACKS.length - 1));
                    }
                  }}
                  className="w-full max-w-lg lg:max-w-xl bg-black border-3 sm:border-4 border-white shadow-[6px_6px_0px_#E60012] p-3 sm:p-4.5 flex flex-col justify-between relative z-10 -skew-x-2 select-none cursor-grab active:cursor-grabbing max-h-[300px] sm:max-h-[360px] md:max-h-[400px]"
                >
                  {/* CARD TOP META */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-red-600 text-black font-display font-black italic text-[11px] uppercase px-2 py-0.5 -skew-x-12 shadow-[2px_2px_0px_#ffffff]">
                          TRACK 0{activeTrackIndex + 1}
                        </span>
                        <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 bg-zinc-900 text-amber-400 border border-zinc-700 uppercase -skew-x-6">
                          {isAllCompleted ? 'MASTERED' : `STAGE 0${activeStage?.stageNumber || 1} / 0${track.stages.length}`}
                        </span>
                      </div>

                      {isAllCompleted ? (
                        <span className="text-[11px] font-mono font-black text-black bg-emerald-400 px-2.5 py-0.5 -skew-x-6 shadow-[2px_2px_0px_#ffffff]">
                          ★ MASTERED ★
                        </span>
                      ) : canClaimStage ? (
                        <span className="text-[11px] font-mono font-black text-black bg-amber-400 px-2.5 py-0.5 -skew-x-6 animate-pulse shadow-[2px_2px_0px_#ffffff]">
                          ★ STAGE READY ★
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-zinc-300 bg-zinc-900 border border-zinc-700 px-2 py-0.5 -skew-x-6">
                          IN PROGRESS
                        </span>
                      )}
                    </div>

                    {/* Track Title with Icon */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-red-600 border-2 border-white flex items-center justify-center text-black -skew-x-12 shadow-[2px_2px_0px_#ffffff] shrink-0">
                        {getIcon(track.iconName)}
                      </div>
                      <div>
                        <h2 className="font-display font-black italic uppercase text-base sm:text-xl text-white tracking-wide leading-tight">
                          {track.categoryName}
                        </h2>
                        {activeStage && (
                          <p className="text-[11px] sm:text-xs font-mono text-zinc-300 pt-0.5 leading-snug line-clamp-1">
                            Goal: {activeStage.targetLabel}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CARD REWARD & TELEMETRY */}
                  <div className="space-y-2 pt-2 border-t-2 border-white/20 mt-2">
                    {/* OVERALL TRACK PROGRESS */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between items-center text-[10px] sm:text-xs font-mono text-zinc-300">
                        <span>LIFETIME STAT</span>
                        <span className="font-bold text-white text-xs sm:text-sm">{displayVal} / {maxTarget}</span>
                      </div>
                      <div className="w-full h-2 sm:h-2.5 bg-black border-2 border-white p-0.5 overflow-hidden">
                        <div
                          className="h-full transition-all duration-300 bg-amber-400"
                          style={{ width: `${trackPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* STAGE DOTS STEPPER */}
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[8.5px] font-mono text-zinc-400 uppercase">
                        STAGES ({claimedList.length}/{track.stages.length})
                      </span>
                      <div className="flex items-center gap-1">
                        {track.stages.map(s => {
                          const isClaimed = claimedList.includes(s.stageNumber);
                          const isCurrent = activeStage?.stageNumber === s.stageNumber;
                          return (
                            <div
                              key={s.stageNumber}
                              className={`h-1.5 border border-white transition-all duration-200 ${
                                isClaimed
                                  ? 'w-3.5 bg-emerald-400'
                                  : isCurrent
                                  ? 'w-4 bg-amber-400 animate-pulse'
                                  : 'w-1.5 bg-zinc-800'
                              }`}
                              title={`Stage ${s.stageNumber}: ${s.name}`}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* PAYOUT ROW & PROPERLY PLACED BUTTON */}
                    <div className="flex items-center justify-between pt-0.5">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-mono text-zinc-400 uppercase">
                          {isAllCompleted ? 'TITLE' : 'YIELD'}
                        </span>
                        {isAllCompleted ? (
                          <div className="flex items-center gap-1 pt-0.5">
                            <Crown className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-[10px] font-mono font-black text-amber-300 bg-black border border-amber-500 px-1.5 py-0.2 -skew-x-6">
                              « {highestStage.rewardTitle || 'LEGEND'} »
                            </span>
                          </div>
                        ) : activeStage ? (
                          <div className="flex items-center gap-1.5 font-mono font-bold text-xs sm:text-sm">
                            <span className="text-emerald-400">+${activeStage.rewardCash.toLocaleString()}</span>
                            {activeStage.rewardKey && (
                              <span className="text-amber-300 font-mono text-[8.5px] px-1 py-0.2 bg-black border border-amber-500 -skew-x-6">
                                +{activeStage.rewardKey.label}
                              </span>
                            )}
                            {activeStage.rewardTitle && (
                              <span className="text-amber-300 font-mono text-[8.5px] px-1 py-0.2 bg-black border border-amber-500 -skew-x-6 hidden sm:inline">
                                «{activeStage.rewardTitle}»
                              </span>
                            )}
                          </div>
                        ) : null}
                      </div>

                      {/* ACTION BUTTON (NEVER HIDDEN BEHIND CAROUSEL) */}
                      <div>
                        {isAllCompleted ? (
                          <span className="px-3 py-1 bg-black border border-emerald-500 text-emerald-400 text-xs font-mono font-bold uppercase -skew-x-6">
                            ✓ COMPLETED
                          </span>
                        ) : canClaimStage && activeStage ? (
                          <button
                            onClick={() => handleClaimStage(track, activeStage)}
                            className="px-4 py-1.5 bg-amber-400 hover:bg-white text-black font-display font-black italic uppercase text-xs sm:text-sm -skew-x-12 shadow-[2px_2px_0px_#000000] animate-pulse cursor-pointer active:scale-95"
                          >
                            CLAIM STAGE
                          </button>
                        ) : (
                          <span className="px-2.5 py-1 bg-black border border-zinc-800 text-zinc-500 text-[11px] font-mono font-bold uppercase -skew-x-6">
                            {currentVal} / {activeStage?.target || 0}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CAROUSEL STEPPER DOTS */}
                  <div className="flex items-center justify-center gap-1 pt-1">
                    {CAREER_MILESTONE_TRACKS.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          soundManager.playRollTick?.();
                          setActiveTrackIndex(idx);
                        }}
                        className={`h-1.5 transition-all duration-200 cursor-pointer ${
                          idx === activeTrackIndex ? 'w-4 bg-red-600' : 'w-1 bg-zinc-700 hover:bg-zinc-500'
                        }`}
                      />
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            );
          })()}
        </div>
      </main>

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
