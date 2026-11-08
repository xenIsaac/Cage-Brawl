import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Skull, 
  RotateCcw, 
  LogOut, 
  Flame, 
  Coins, 
  Award, 
  Swords,
  Shield, 
  Zap, 
  Target, 
  Clock, 
  FastForward,
  ChevronRight,
  Sparkles,
  Info,
  X
} from 'lucide-react';
import { FightingStyle, PlayerStats, MatchData, RoundReport, RankedAiEloBreakdown } from '../types';
import { soundManager } from './SoundManager';
import { 
  evaluateMatchPerformance, 
  OverallCombatGrade, 
  PillarGrade, 
  MatchEvaluationResult 
} from '../combat/evaluationEngine';
import { 
  evaluateMatchMedals, 
  calculateMedalsTotalCash, 
  mergeLifetimeMedals, 
  EarnedMedalResult,
  MedalTier,
  MedalDefinition
} from '../combat/medalsEngine';

interface PostMatchHUDProps {
  matchWinner: 'player' | 'opponent' | null;
  playerScore: number;
  opponentScore: number;
  matchData?: MatchData | null;
  playerStats: PlayerStats;
  activeStyle: FightingStyle;
  damageDealt: number;
  damageTaken: number;
  hitsLanded: number;
  streak: number;
  postMatchTimer: number;
  rematchRequested: boolean;
  opponentRematchRequested: boolean;
  opponentDisconnected: boolean;
  onVoteRematch: () => void;
  onLeaveMatch: () => void;
  onNextAiOpponent?: () => void;
  onGoToGacha?: () => void;
  onOpenCodex?: () => void;
  onSendChatMessage?: (text: string) => void;
  chatMessages?: Array<{ sender: string; text: string; time: string; isSelf?: boolean }>;
  hudScale?: number;
  parriesLanded?: number;
  heaviesLanded?: number;
  lightsLanded?: number;
  guardBreaksLanded?: number;
  rankedAiBreakdown?: RankedAiEloBreakdown | null;
  roundReports?: RoundReport[];
  totalSwings?: number;
  playerFinalHp?: number;
  playerMaxHp?: number;
  matchDurationSec?: number;
  earlyDamageDealtPct?: number;
  onUpdateStats?: (updates: Partial<PlayerStats>) => void;
}

export default function PostMatchHUD({
  matchWinner,
  playerScore,
  opponentScore,
  matchData,
  playerStats,
  activeStyle,
  damageDealt,
  damageTaken,
  hitsLanded,
  streak,
  rematchRequested,
  opponentDisconnected,
  onVoteRematch,
  onLeaveMatch,
  onNextAiOpponent,
  parriesLanded = 0,
  heaviesLanded = 0,
  lightsLanded = 0,
  guardBreaksLanded = 0,
  rankedAiBreakdown = null,
  roundReports = [],
  totalSwings,
  playerFinalHp,
  playerMaxHp = 100,
  matchDurationSec = 35,
  earlyDamageDealtPct = 50,
  onUpdateStats,
}: PostMatchHUDProps) {
  const isPlayerWinner = matchWinner === 'player';
  const isAiMatch = Boolean(matchData?.isAiMatch);
  const isOnlineMatch = Boolean(matchData?.isRealMatch || (matchData?.isCompetitive && !isAiMatch));
  const isRankedAi = isAiMatch && matchData?.aiModeType === 'ranked';
  const isTournamentAi = isAiMatch && matchData?.aiModeType === 'tournament';

  // Micro Screen-Shake Trigger for Persona Explosion Stamp
  const [microShake, setMicroShake] = useState<boolean>(false);

  // Inspector modal for inspecting a tapped/clicked medal in the tray
  const [inspectedMedal, setInspectedMedal] = useState<EarnedMedalResult | null>(null);

  // Animation Stage Pipeline:
  // Phase 0: Init (0ms)
  // Phase 1: Pillar A — Strike Accuracy (%) ticks up (100ms)
  // Phase 2: Pillar B — Defense & Health Retained (%) ticks up (550ms)
  // Phase 3: Pillar C — Match Pacing reveals (1000ms)
  // Phase 4: Overall Combat Grade Explosion Stamp + Sound (1500ms)
  // Phase 5: Medals Tray Gravity Drop Sequence starts (2000ms)
  // Phase 6: Cash Payout (Base + Medals yield counter) (2600ms)
  // Phase 7: Action Navigation Buttons Slide In (3100ms)
  const [animPhase, setAnimPhase] = useState<number>(0);

  // Number tick counters for smooth telemetry counters
  const [displayedAccuracy, setDisplayedAccuracy] = useState<number>(1);
  const [displayedHpRetained, setDisplayedHpRetained] = useState<number>(1);
  const [displayedCash, setDisplayedCash] = useState<number>(0);

  // Run the 3-Pillar Evaluation Engine (Section 8.8)
  const evaluation: MatchEvaluationResult = useMemo(() => {
    let computedEarlyPct = earlyDamageDealtPct;
    if (roundReports && roundReports.length > 1) {
      const firstRoundDmg = roundReports[0].damageDealt;
      const totalDmg = roundReports.reduce((acc, r) => acc + r.damageDealt, 0);
      if (totalDmg > 0) {
        computedEarlyPct = Math.round((firstRoundDmg / totalDmg) * 100);
      }
    }

    const resolvedHp = playerFinalHp !== undefined ? playerFinalHp : (isPlayerWinner ? 65 : 0);
    const resolvedSwings = totalSwings || (hitsLanded > 0 ? Math.round(hitsLanded * 1.35) : 10);

    return evaluateMatchPerformance({
      isPlayerWinner,
      strikesLanded: hitsLanded,
      strikesThrown: resolvedSwings,
      playerFinalHp: resolvedHp,
      playerMaxHp,
      durationSec: matchDurationSec,
      earlyDamageDealtPct: computedEarlyPct,
      isTournament: isTournamentAi,
      isRanked: isRankedAi || Boolean(matchData?.isCompetitive),
    });
  }, [
    isPlayerWinner,
    hitsLanded,
    totalSwings,
    playerFinalHp,
    playerMaxHp,
    matchDurationSec,
    earlyDamageDealtPct,
    roundReports,
    isTournamentAi,
    isRankedAi,
    matchData?.isCompetitive,
  ]);

  // Clean, integer-rounded player final HP to avoid floating point anomalies (e.g. 69.10000000000002)
  const roundedPlayerHp = useMemo(() => {
    return Math.round(evaluation.pillarB.playerFinalHp);
  }, [evaluation.pillarB.playerFinalHp]);

  // Section 8.9: Independent Stackable Medals Evaluation
  const earnedMedals: EarnedMedalResult[] = useMemo(() => {
    return evaluateMatchMedals({
      isPlayerWinner,
      damageDealt,
      damageTaken,
      hitsLanded,
      totalSwings: totalSwings || (hitsLanded > 0 ? Math.round(hitsLanded * 1.35) : 10),
      parriesLanded,
      heaviesLanded,
      lightsLanded,
      guardBreaksLanded,
      playerFinalHp: playerFinalHp !== undefined ? playerFinalHp : (isPlayerWinner ? 65 : 0),
      playerMaxHp,
      roundReports,
      opponentKnockouts: isPlayerWinner ? 1 : 0,
    });
  }, [
    isPlayerWinner,
    damageDealt,
    damageTaken,
    hitsLanded,
    totalSwings,
    parriesLanded,
    heaviesLanded,
    lightsLanded,
    guardBreaksLanded,
    playerFinalHp,
    playerMaxHp,
    roundReports,
  ]);

  const medalsBonusCash = useMemo(() => calculateMedalsTotalCash(earnedMedals), [earnedMedals]);
  const combinedCashPayout = useMemo(() => evaluation.cashPayout + medalsBonusCash, [evaluation.cashPayout, medalsBonusCash]);

  // Once-per-match persistence to PlayerStats
  const medalsSavedRef = useRef<boolean>(false);
  useEffect(() => {
    if (!medalsSavedRef.current && onUpdateStats && earnedMedals.length > 0) {
      medalsSavedRef.current = true;
      const updatedMedals = mergeLifetimeMedals(playerStats.medals || {}, earnedMedals);
      onUpdateStats({
        medals: updatedMedals,
        cash: (playerStats.cash || 0) + medalsBonusCash,
      });
    }
  }, [earnedMedals, medalsBonusCash, onUpdateStats, playerStats.cash, playerStats.medals]);

  // Timed Sequenced Animation Pipeline
  useEffect(() => {
    // Phase 1: Pillar A Accuracy Tick (t = 100ms)
    const t1 = setTimeout(() => {
      setAnimPhase(1);
      try { soundManager.playRollTick?.(); } catch (e) {}
    }, 100);

    // Phase 2: Pillar B Defense Tick (t = 550ms)
    const t2 = setTimeout(() => {
      setAnimPhase(2);
      try { soundManager.playRollTick?.(); } catch (e) {}
    }, 550);

    // Phase 3: Pillar C Time Pacing (t = 1000ms)
    const t3 = setTimeout(() => {
      setAnimPhase(3);
      try { soundManager.playParry?.(); } catch (e) {}
    }, 1000);

    // Phase 4: Overall Combat Grade Kinetic Scale Explosion (t = 1500ms)
    const t4 = setTimeout(() => {
      setAnimPhase(4);
      setMicroShake(true);
      try {
        soundManager.playHeavyImpact?.();
      } catch (e) {}
      setTimeout(() => setMicroShake(false), 200);
    }, 1500);

    // Phase 5: Medals Tray Gravity Drop Sequence (t = 2000ms)
    const t5 = setTimeout(() => {
      setAnimPhase(5);
      try {
        const hasGold = earnedMedals.some(m => m.medal.tier === 'gold');
        const hasSilver = earnedMedals.some(m => m.medal.tier === 'silver' || m.medal.tier === 'copper');
        if (hasGold) {
          soundManager.playLevelUp?.();
        } else if (hasSilver) {
          soundManager.playParry?.();
        } else if (earnedMedals.length > 0) {
          soundManager.playRollTick?.();
        }
      } catch (e) {}
    }, 2000);

    // Phase 6: Cash Payout (Base + Medals yield counter) (t = 2600ms)
    const t6 = setTimeout(() => {
      setAnimPhase(6);
      try { 
        (soundManager as any).playCoins?.() ?? soundManager.playRollTick?.(); 
      } catch (e) {}
    }, 2600);

    // Phase 7: Delayed Action Buttons Reveal (t = 3100ms)
    const t7 = setTimeout(() => {
      setAnimPhase(7);
      try { soundManager.playRollTick?.(); } catch (e) {}
    }, 3100);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
      clearTimeout(t7);
    };
  }, [earnedMedals]);

  // Ticking number animation for Pillar A (Accuracy)
  useEffect(() => {
    if (animPhase >= 1) {
      const target = evaluation.pillarA.accuracyPct;
      let current = 1;
      const step = Math.max(1, Math.ceil(target / 12));
      const interval = setInterval(() => {
        current = Math.min(target, current + step);
        setDisplayedAccuracy(current);
        if (current >= target) {
          clearInterval(interval);
        }
      }, 20);
      return () => clearInterval(interval);
    }
  }, [animPhase, evaluation.pillarA.accuracyPct]);

  // Ticking number animation for Pillar B (HP Retained)
  useEffect(() => {
    if (animPhase >= 2) {
      const target = evaluation.pillarB.hpRetainedPct;
      let current = 1;
      const step = Math.max(1, Math.ceil(target / 12));
      const interval = setInterval(() => {
        current = Math.min(target, current + step);
        setDisplayedHpRetained(current);
        if (current >= target) {
          clearInterval(interval);
        }
      }, 20);
      return () => clearInterval(interval);
    }
  }, [animPhase, evaluation.pillarB.hpRetainedPct]);

  // Ticking number animation for Cash Payout (Base + Medals)
  useEffect(() => {
    if (animPhase >= 6) {
      const target = combinedCashPayout;
      let current = 0;
      const step = Math.max(5, Math.ceil(target / 16));
      const interval = setInterval(() => {
        current = Math.min(target, current + step);
        setDisplayedCash(current);
        if (current >= target) {
          clearInterval(interval);
        }
      }, 20);
      return () => clearInterval(interval);
    }
  }, [animPhase, combinedCashPayout]);

  // Fast-forward animation when user clicks skip
  const handleFastForward = () => {
    setAnimPhase(7);
    setDisplayedAccuracy(evaluation.pillarA.accuracyPct);
    setDisplayedHpRetained(evaluation.pillarB.hpRetainedPct);
    setDisplayedCash(combinedCashPayout);
    try { soundManager.playRollTick?.(); } catch (e) {}
  };

  // Persona 5 Rank Stamp Thematic Colors & Hard Drop Shadows
  const gradeStyles = useMemo(() => {
    const g = evaluation.overallGrade;
    if (g === 'S+' || g === 'S') {
      return {
        bg: 'bg-amber-400 text-black',
        border: 'border-2 border-black',
        shadow: 'shadow-[3px_3px_0px_#ffffff]',
        tagBg: 'bg-black text-amber-300',
        glow: 'drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]',
      };
    }
    if (g === 'A+' || g === 'A' || g === 'A-') {
      return {
        bg: 'bg-red-600 text-white',
        border: 'border-2 border-black',
        shadow: 'shadow-[3px_3px_0px_#ffffff]',
        tagBg: 'bg-black text-red-400',
        glow: 'drop-shadow-[0_0_12px_rgba(239,68,68,0.6)]',
      };
    }
    if (g === 'B+' || g === 'B' || g === 'B-') {
      return {
        bg: 'bg-cyan-400 text-black',
        border: 'border-2 border-black',
        shadow: 'shadow-[3px_3px_0px_#ffffff]',
        tagBg: 'bg-black text-cyan-300',
        glow: 'drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]',
      };
    }
    return {
      bg: 'bg-zinc-800 text-white',
      border: 'border-2 border-black',
      shadow: 'shadow-[3px_3px_0px_#71717a]',
      tagBg: 'bg-black text-zinc-400',
      glow: 'drop-shadow-[0_0_6px_rgba(113,113,122,0.4)]',
    };
  }, [evaluation.overallGrade]);

  // Persona Pillar grade stamp chips
  const getPillarBadgeStyle = (grade: PillarGrade) => {
    switch (grade) {
      case 'S':
        return 'bg-amber-400 text-black border-2 border-black shadow-[2px_2px_0px_#ffffff]';
      case 'A':
        return 'bg-red-600 text-white border-2 border-black shadow-[2px_2px_0px_#ffffff]';
      case 'B':
        return 'bg-cyan-400 text-black border-2 border-black shadow-[2px_2px_0px_#ffffff]';
      case 'C':
      default:
        return 'bg-zinc-800 text-zinc-300 border-2 border-black shadow-[2px_2px_0px_#000000]';
    }
  };

  // Persona Medal Tier Pill Styles
  const getMedalTierPillStyle = (tier: MedalTier) => {
    switch (tier) {
      case 'gold':
        return 'bg-amber-400 text-black border-2 border-black shadow-[2px_2px_0px_#ffffff]';
      case 'silver':
        return 'bg-slate-200 text-black border-2 border-black shadow-[2px_2px_0px_#94a3b8]';
      case 'copper':
        return 'bg-orange-600 text-white border-2 border-black shadow-[2px_2px_0px_#000000]';
      case 'base':
      default:
        return 'bg-zinc-900 text-zinc-200 border-2 border-zinc-700 shadow-[2px_2px_0px_#000000]';
    }
  };

  const opponentName = matchData?.opponent?.name || (isAiMatch ? `AI (${(matchData?.aiDifficulty || 'Silver').toUpperCase()})` : 'Opponent');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={`fixed inset-0 z-[140] pointer-events-auto flex items-center justify-center p-2 sm:p-4 select-none bg-black/85 backdrop-blur-md overflow-hidden ${
        microShake ? 'translate-x-[2px] -translate-y-[2px]' : ''
      }`}
    >
      {/* Background Halftone Persona Graphic Matrix */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
      <div className="absolute -left-20 top-0 bottom-0 w-48 bg-red-600/15 -skew-x-[25deg] pointer-events-none" />
      <div className="absolute -right-20 top-0 bottom-0 w-48 bg-white/5 -skew-x-[25deg] pointer-events-none" />

      {/* ================================================================ */}
      {/* MASTER CONTAINER: SPLIT 2-COLUMN PERSONA 5 EVALUATION TERMINAL   */}
      {/* Dynamic Scaling: Ranking on Left, Medals on Right (Zero-Scroll)  */}
      {/* ================================================================ */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        className="w-full max-w-5xl h-full max-h-[96dvh] sm:max-h-[92dvh] flex flex-col justify-between bg-black/95 border-2 sm:border-4 border-red-600 shadow-[0_0_50px_rgba(0,0,0,0.95)] p-2.5 sm:p-4 relative z-20 overflow-hidden"
      >
        {/* Dynamic Top Red Cutout Accent Ribbon */}
        <div className="absolute top-0 right-0 left-0 h-1 sm:h-1.5 bg-gradient-to-r from-red-600 via-amber-400 to-red-600 pointer-events-none" />

        {/* ------------------------------------------------------------- */}
        {/* 1. TOP HEADER RIBBON: MATCH STATUS & OPPONENT METRICS         */}
        {/* ------------------------------------------------------------- */}
        <div className="flex items-center justify-between pb-2 border-b-2 border-zinc-900 shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-red-600 text-black font-display font-black italic text-xs -skew-x-12 shadow-[2px_2px_0px_#ffffff]">
              POST-MATCH
            </span>
            <span className="font-display font-black italic tracking-wider text-xs sm:text-base text-white uppercase -skew-x-6">
              COMBAT EVALUATION
            </span>
            <span className="hidden sm:inline text-[9px] font-mono text-zinc-400">
              // TELEMETRY PROTOCOL
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 bg-zinc-950 border border-zinc-700 -skew-x-6 text-[10px] font-mono">
              <span className="text-zinc-500 font-bold">VS</span>
              <span className="text-amber-300 font-black">{opponentName}</span>
            </div>

            {streak > 1 && isPlayerWinner && (
              <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-red-600 text-black font-display font-black italic text-[10px] -skew-x-12 shadow-[2px_2px_0px_#ffffff] border border-black">
                <Flame className="w-3 h-3 fill-black" />
                <span>{streak} KO STREAK</span>
              </div>
            )}

            {animPhase < 7 && (
              <button
                onClick={handleFastForward}
                className="px-2.5 py-0.5 bg-zinc-900 hover:bg-white text-zinc-300 hover:text-black border-2 border-zinc-700 -skew-x-12 text-[10px] font-mono font-black flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-[2px_2px_0px_#000000]"
              >
                <FastForward className="w-3 h-3 text-amber-400" />
                <span>SKIP</span>
              </button>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 2. MAIN SPLIT BODY: RANKING ON LEFT // MEDALS ON RIGHT        */}
        {/* ------------------------------------------------------------- */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-3 py-2 overflow-hidden min-h-0">

          {/* =========================================================== */}
          {/* LEFT PANEL (COL 1-5): COMBAT RATING & 3-PILLAR TELEMETRY    */}
          {/* =========================================================== */}
          <div className="md:col-span-5 flex flex-col gap-1.5 sm:gap-2 overflow-y-auto custom-scrollbar pr-1 min-h-0">
            
            {/* OVERALL COMBAT RATING EMBLEM (PERSONA RANK STAMP) */}
            <div className="p-2 sm:p-2.5 bg-zinc-950 border-2 border-white -skew-x-3 shadow-[4px_4px_0px_#ef4444] relative flex items-center justify-between shrink-0 overflow-hidden">
              <div className="space-y-0.5 z-10">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-none -skew-x-12" />
                  <span className="text-[8.5px] font-mono font-black tracking-widest text-zinc-400 uppercase">
                    OVERALL COMBAT GRADE
                  </span>
                </div>
                <div className="font-display font-black italic text-xs sm:text-sm text-white uppercase leading-tight truncate">
                  {evaluation.title}
                </div>
                <div className="text-[8px] font-mono text-amber-300 font-bold">
                  [{evaluation.pillarA.grade}] ACC &bull; [{evaluation.pillarB.grade}] DEF &bull; [{evaluation.pillarC.grade}] TIME
                </div>
              </div>

              {/* Kinetic Persona Explosive Rank Stamp */}
              {animPhase >= 4 ? (
                <motion.div
                  initial={{ scale: 0.25, opacity: 0, rotate: -12 }}
                  animate={{ scale: [0.25, 1.2, 1.0], opacity: 1, rotate: [-12, 4, 0] }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className={`px-3 py-1 -skew-x-12 font-display font-black italic text-2xl sm:text-3xl tracking-tighter shrink-0 ${gradeStyles.bg} ${gradeStyles.border} ${gradeStyles.shadow}`}
                >
                  <span>{evaluation.overallGrade}</span>
                </motion.div>
              ) : (
                <div className="h-8 px-2 flex items-center justify-center shrink-0">
                  <span className="text-[8.5px] font-mono text-zinc-500 animate-pulse">
                    CALCULATING...
                  </span>
                </div>
              )}
            </div>

            {/* 3-PILLAR TELEMETRY ROWS */}
            <div className="flex flex-col gap-1 sm:gap-1.5 shrink-0">
              
              {/* PILLAR A: STRIKE ACCURACY */}
              <motion.div
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: animPhase >= 1 ? 1 : 0.25, x: animPhase >= 1 ? 0 : -15 }}
                transition={{ duration: 0.15 }}
                className={`p-1.5 sm:p-2 -skew-x-3 border-2 transition-all duration-200 flex items-center justify-between shadow-[2px_2px_0px_#000000] ${
                  animPhase >= 1 ? 'bg-zinc-950 border-zinc-700' : 'bg-black/60 border-zinc-900 opacity-30'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-mono font-black text-amber-400 px-1 py-0.2 bg-zinc-900 -skew-x-6">
                    //01 ACC
                  </span>
                  <div>
                    <span className="font-display font-black italic text-xs text-white uppercase leading-none block">
                      ACCURACY
                    </span>
                    <span className="text-[7.5px] font-mono text-zinc-400 leading-none">
                      {evaluation.pillarA.strikesLanded}/{evaluation.pillarA.strikesThrown} Strikes
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-black text-sm sm:text-base text-white tracking-tight">
                    {displayedAccuracy}%
                  </span>
                  {animPhase >= 1 && (
                    <motion.div
                      initial={{ scale: 1.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', damping: 16, stiffness: 350 }}
                      className={`w-5 h-5 -skew-x-12 flex items-center justify-center font-display font-black italic text-[11px] ${getPillarBadgeStyle(evaluation.pillarA.grade)}`}
                    >
                      <span>{evaluation.pillarA.grade}</span>
                    </motion.div>
                  )}
                </div>
              </motion.div>

              {/* PILLAR B: DEFENSE & HP RETAINED (ROUNDED HP TO FIX FLOAT BUG) */}
              <motion.div
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: animPhase >= 2 ? 1 : 0.25, x: animPhase >= 2 ? 0 : -15 }}
                transition={{ duration: 0.15 }}
                className={`p-1.5 sm:p-2 -skew-x-3 border-2 transition-all duration-200 flex items-center justify-between shadow-[2px_2px_0px_#000000] ${
                  animPhase >= 2 ? 'bg-zinc-950 border-zinc-700' : 'bg-black/60 border-zinc-900 opacity-30'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-mono font-black text-emerald-400 px-1 py-0.2 bg-zinc-900 -skew-x-6">
                    //02 DEF
                  </span>
                  <div>
                    <span className="font-display font-black italic text-xs text-white uppercase leading-none block">
                      HEALTH RETAINED
                    </span>
                    <span className="text-[7.5px] font-mono text-zinc-400 leading-none">
                      {roundedPlayerHp} HP &bull; {evaluation.pillarB.gradeLabel}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-black text-sm sm:text-base text-white tracking-tight">
                    {displayedHpRetained}%
                  </span>
                  {animPhase >= 2 && (
                    <motion.div
                      initial={{ scale: 1.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', damping: 16, stiffness: 350 }}
                      className={`w-5 h-5 -skew-x-12 flex items-center justify-center font-display font-black italic text-[11px] ${getPillarBadgeStyle(evaluation.pillarB.grade)}`}
                    >
                      <span>{evaluation.pillarB.grade}</span>
                    </motion.div>
                  )}
                </div>
              </motion.div>

              {/* PILLAR C: MATCH PACING */}
              <motion.div
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: animPhase >= 3 ? 1 : 0.25, x: animPhase >= 3 ? 0 : -15 }}
                transition={{ duration: 0.15 }}
                className={`p-1.5 sm:p-2 -skew-x-3 border-2 transition-all duration-200 flex items-center justify-between shadow-[2px_2px_0px_#000000] ${
                  animPhase >= 3 ? 'bg-zinc-950 border-zinc-700' : 'bg-black/60 border-zinc-900 opacity-30'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-mono font-black text-cyan-400 px-1 py-0.2 bg-zinc-900 -skew-x-6">
                    //03 TIME
                  </span>
                  <div>
                    <span className="font-display font-black italic text-xs text-white uppercase leading-none block">
                      MATCH PACING
                    </span>
                    <span className="text-[7.5px] font-mono text-zinc-400 leading-none">
                      {evaluation.pillarC.gradeLabel} ({evaluation.pillarC.durationSec}s)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-black text-sm sm:text-base text-white tracking-tight">
                    {evaluation.pillarC.durationFormatted}
                  </span>
                  {animPhase >= 3 && (
                    <motion.div
                      initial={{ scale: 1.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', damping: 16, stiffness: 350 }}
                      className={`w-5 h-5 -skew-x-12 flex items-center justify-center font-display font-black italic text-[11px] ${getPillarBadgeStyle(evaluation.pillarC.grade)}`}
                    >
                      <span>{evaluation.pillarC.grade}</span>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* CLASH CASH PURSE PAYOUT REWARD STRIP */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: animPhase >= 6 ? 1 : 0.25, y: animPhase >= 6 ? 0 : 8 }}
              transition={{ duration: 0.15 }}
              className={`p-1.5 sm:p-2 -skew-x-3 border-2 flex items-center justify-between transition-all duration-200 shadow-[3px_3px_0px_#10b981] shrink-0 ${
                animPhase >= 6 ? 'bg-black border-emerald-400' : 'bg-black/60 border-zinc-900 opacity-30'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 bg-emerald-400 text-black flex items-center justify-center -skew-x-12 shrink-0">
                  <Coins className="w-3 h-3" />
                </div>
                <div>
                  <span className="text-[8px] font-mono font-black text-emerald-400 block uppercase leading-none">
                    // PURSE AUTHORIZED
                  </span>
                  <span className="text-[7px] font-mono text-zinc-400 leading-none">
                    Base: ${evaluation.cashPayout} &bull; Medals: +${medalsBonusCash}
                  </span>
                </div>
              </div>

              <div className="font-display font-black italic text-base sm:text-lg text-emerald-300 tracking-tight">
                +${displayedCash.toLocaleString()}
              </div>
            </motion.div>

          </div>

          {/* =========================================================== */}
          {/* RIGHT PANEL (COL 6-12): MEDAL ACCREDITATION SHOWCASE TRAY   */}
          {/* =========================================================== */}
          <div className="md:col-span-7 flex flex-col justify-between bg-zinc-950/90 border-2 border-zinc-800 -skew-x-2 shadow-[3px_3px_0px_#000000] p-2 sm:p-2.5 overflow-hidden">
            
            {/* Medals Tray Header */}
            <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-zinc-800 shrink-0">
              <span className="text-[9px] font-mono font-black uppercase text-amber-400 flex items-center gap-1">
                <Award className="w-3.5 h-3.5" /> // MEDAL ACCREDITATIONS
              </span>
              <span className="text-[8.5px] font-mono text-emerald-400 font-bold">
                {earnedMedals.length > 0 ? `+${earnedMedals.reduce((sum, m) => sum + m.count, 0)} Stacks (+$${medalsBonusCash})` : '0 Feats'}
              </span>
            </div>

            {/* Medals Grid / Staggered Drop Chips */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-[90px]">
              {animPhase >= 5 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {earnedMedals.length > 0 ? (
                    earnedMedals.map((earned, index) => (
                      <motion.button
                        key={earned.medal.id}
                        initial={{ y: -15, opacity: 0, scale: 0.8 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        transition={{ 
                          type: 'spring', 
                          damping: 14, 
                          stiffness: 300, 
                          delay: index * 0.04 
                        }}
                        onClick={() => {
                          soundManager.playRollTick?.();
                          setInspectedMedal(earned);
                        }}
                        className={`p-1 -skew-x-12 flex items-center justify-between gap-1 text-[9px] font-mono font-black transition-all hover:scale-105 active:scale-95 cursor-pointer truncate ${getMedalTierPillStyle(earned.medal.tier)}`}
                      >
                        <div className="flex items-center gap-1 truncate">
                          <span className="text-xs select-none shrink-0">{earned.medal.icon}</span>
                          <span className="truncate">{earned.medal.name}</span>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <span className="px-1 py-0.2 bg-black text-white text-[7.5px]">
                            x{earned.count}
                          </span>
                          <span className="text-[7.5px] opacity-90 font-bold">
                            +${earned.totalCash}
                          </span>
                        </div>
                      </motion.button>
                    ))
                  ) : (
                    <div className="col-span-full py-4 text-center">
                      <span className="text-[8.5px] font-mono text-zinc-500 italic">
                        Zero medal triggers achieved during this bout.
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <span className="text-[8.5px] font-mono text-zinc-600 animate-pulse">
                    CALCULATING MEDAL FEATS...
                  </span>
                </div>
              )}
            </div>

            <div className="pt-1 border-t border-zinc-900 text-[7.5px] font-mono text-zinc-500 flex items-center justify-between shrink-0">
              <span>Tap any medal to inspect feat criteria</span>
              <span className="text-amber-400 font-bold">INDEPENDENT STACKING ACTIVE</span>
            </div>

          </div>

        </div>

        {/* ------------------------------------------------------------- */}
        {/* 3. FOOTER: SLANTED PERSONA NAVIGATION ACTION BUTTONS          */}
        {/* ------------------------------------------------------------- */}
        <div className="pt-2 border-t-2 border-zinc-900 shrink-0">
          <AnimatePresence>
            {animPhase >= 7 ? (
              <motion.div
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 15, opacity: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 280 }}
                className="flex items-center gap-2"
              >
                {/* 1. PRIMARY ACTION: [ NEXT FIGHT ] or [ REMATCH ] */}
                {onNextAiOpponent ? (
                  <button
                    onClick={() => {
                      soundManager.playLevelUp?.();
                      onNextAiOpponent();
                    }}
                    className="flex-1 py-2 sm:py-2.5 px-3 bg-red-600 hover:bg-white text-black font-display font-black italic uppercase text-xs sm:text-sm tracking-wider transition-all duration-150 flex items-center justify-center gap-1.5 -skew-x-12 shadow-[3px_3px_0px_#ffffff] hover:shadow-[3px_3px_0px_#ef4444] border-2 border-black active:scale-95 cursor-pointer"
                  >
                    <Swords className="w-4 h-4 text-black" />
                    <span>NEXT FIGHT</span>
                  </button>
                ) : isOnlineMatch ? (
                  <button
                    onClick={() => {
                      soundManager.playRollTick?.();
                      onVoteRematch();
                    }}
                    disabled={rematchRequested || opponentDisconnected}
                    className={`flex-1 py-2 sm:py-2.5 px-3 font-display font-black italic uppercase text-xs sm:text-sm tracking-wider transition-all duration-150 flex items-center justify-center gap-1.5 -skew-x-12 border-2 border-black active:scale-95 cursor-pointer ${
                      rematchRequested
                        ? 'bg-emerald-400 text-black shadow-[3px_3px_0px_#ffffff] animate-pulse'
                        : opponentDisconnected
                          ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                          : 'bg-cyan-400 hover:bg-white text-black shadow-[3px_3px_0px_#ffffff]'
                    }`}
                  >
                    <RotateCcw className="w-4 h-4 text-black" />
                    <span>{rematchRequested ? 'WAITING...' : 'REMATCH'}</span>
                  </button>
                ) : null}

                {/* 2. SECONDARY ACTION: [ MENU ] */}
                <button
                  onClick={() => {
                    soundManager.playRollTick?.();
                    onLeaveMatch();
                  }}
                  className="py-2 sm:py-2.5 px-4 bg-black hover:bg-zinc-900 text-zinc-300 hover:text-white font-mono font-bold uppercase text-xs -skew-x-12 shadow-[2px_2px_0px_#000000] border-2 border-zinc-700 active:scale-95 cursor-pointer flex items-center justify-center gap-1 transition-all"
                >
                  <LogOut className="w-3.5 h-3.5 text-zinc-400" />
                  <span>MENU</span>
                </button>
              </motion.div>
            ) : (
              <div className="py-2 text-center">
                <span className="text-[8.5px] font-mono text-zinc-500 uppercase tracking-widest animate-pulse">
                  // AUTHORIZING BOUT TELEMETRY...
                </span>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* ============================================================= */}
        {/* MODAL INSPECTOR: TAPPED MEDAL DETAILS DIALOG                  */}
        {/* ============================================================= */}
        <AnimatePresence>
          {inspectedMedal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3"
              onClick={() => setInspectedMedal(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 15 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-xs bg-black border-2 border-amber-400 -skew-x-3 p-4 shadow-[6px_6px_0px_#f59e0b] relative text-left"
              >
                <button
                  onClick={() => setInspectedMedal(null)}
                  className="absolute top-2 right-2 p-1 bg-zinc-900 hover:bg-white text-zinc-400 hover:text-black cursor-pointer border border-zinc-700 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-2.5 pb-2 border-b border-zinc-800">
                  <div className="text-3xl p-1.5 bg-zinc-950 border border-amber-400">
                    {inspectedMedal.medal.icon}
                  </div>
                  <div>
                    <span className="text-[8px] font-mono uppercase tracking-widest text-amber-400 font-bold block">
                      {inspectedMedal.medal.tier} TIER FEAT
                    </span>
                    <h3 className="text-sm font-display font-black italic uppercase text-white">
                      {inspectedMedal.medal.name}
                    </h3>
                  </div>
                </div>

                <div className="mt-2.5 space-y-2 text-[10px] font-mono">
                  <p className="text-zinc-300">
                    {inspectedMedal.medal.description}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-1.5 pt-1 text-[9px]">
                    <div className="p-1.5 bg-zinc-950 border border-zinc-800">
                      <span className="text-zinc-500 block font-bold">STACKS:</span>
                      <span className="font-black text-xs text-white">x{inspectedMedal.count}</span>
                    </div>
                    <div className="p-1.5 bg-zinc-950 border border-emerald-900">
                      <span className="text-emerald-500 block font-bold">YIELD:</span>
                      <span className="font-black text-xs text-emerald-400">+${inspectedMedal.totalCash}</span>
                    </div>
                  </div>

                  <div className="p-1.5 bg-zinc-950 border border-zinc-800 text-[8.5px] text-zinc-400">
                    <span className="text-amber-300 font-bold">TRACKS:</span> {inspectedMedal.medal.statTracked}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-zinc-800">
                  <button
                    onClick={() => setInspectedMedal(null)}
                    className="w-full py-1.5 bg-amber-400 hover:bg-white text-black font-display font-black italic uppercase text-[10px] tracking-wider transition cursor-pointer border border-black shadow-[2px_2px_0px_#ffffff]"
                  >
                    DISMISS
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </motion.div>
  );
}
