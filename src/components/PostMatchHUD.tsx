import React, { useState, useEffect } from 'react';
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
  Dices,
  ChevronDown,
  ChevronUp,
  Shield,
  Zap,
  Target,
  BarChart3
} from 'lucide-react';
import { FightingStyle, PlayerStats, MatchData, RoundReport, RankedAiEloBreakdown } from '../types';
import { getRankInfo } from '../utils/elo';
import { soundManager } from './SoundManager';

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
  rankedAiBreakdown?: RankedAiEloBreakdown | null;
  roundReports?: RoundReport[];
}

const QUICK_CHAT_OPTIONS = [
  'GG! 🥊',
  'Well Played! 🔥',
  'Close Match! ⚡',
  'Rematch Me! ⚔️',
  'Good defense! 🛡️',
  'One more round!'
];

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
  onGoToGacha,
  onSendChatMessage,
  hudScale = 1.0,
  parriesLanded = 0,
  heaviesLanded = 0,
  lightsLanded = 0,
  rankedAiBreakdown = null,
  roundReports = [],
}: PostMatchHUDProps) {
  const isPlayerWinner = matchWinner === 'player';
  const isAiMatch = Boolean(matchData?.isAiMatch);
  const isOnlineMatch = Boolean(matchData?.isRealMatch || (matchData?.isCompetitive && !isAiMatch));
  const isRankedAi = isAiMatch && matchData?.aiModeType === 'ranked';
  const isTournamentAi = isAiMatch && matchData?.aiModeType === 'tournament';
  const isOnlineRanked = isOnlineMatch && Boolean(matchData?.isCompetitive);

  // Collapsible Evaluation Accordion State (default collapsed)
  // When true: Header and Reward rows collapse to grant maximum viewport space to scrollable telemetry
  const [isEvaluationExpanded, setIsEvaluationExpanded] = useState<boolean>(false);
  
  // Micro Screen-Shake Trigger for Heavy Stamp 2
  const [microShake, setMicroShake] = useState<boolean>(false);

  // Online quick chat state
  const [, setLocalChatList] = useState<Array<{ sender: string; text: string; time: string; isSelf?: boolean }>>([]);

  // Calculate ELO values
  const currentElo = isAiMatch ? (playerStats.aiElo ?? 100) : (playerStats.elo ?? 0);
  const rankInfo = getRankInfo(currentElo);

  // Drop-Stamp Audio & Screen-Shake Pipeline Trigger
  useEffect(() => {
    // Stamp 1: Header Drop (t = 0ms)
    try {
      soundManager.playPunch?.();
    } catch (e) {}

    // Stamp 2: Evaluation Grade Slams Down (t = 120ms) + 3px Micro-Shake
    const t2 = setTimeout(() => {
      try {
        soundManager.playParry?.();
      } catch (e) {}
      setMicroShake(true);
      setTimeout(() => setMicroShake(false), 140);
    }, 120);

    // Stamp 3: Rewards Row Drops (t = 220ms, 320ms, 420ms)
    const t3a = setTimeout(() => {
      try { soundManager.playRollTick?.(); } catch (e) {}
    }, 220);
    const t3b = setTimeout(() => {
      try { soundManager.playRollTick?.(); } catch (e) {}
    }, 320);
    const t3c = setTimeout(() => {
      try { soundManager.playRollTick?.(); } catch (e) {}
    }, 420);

    return () => {
      clearTimeout(t2);
      clearTimeout(t3a);
      clearTimeout(t3b);
      clearTimeout(t3c);
    };
  }, []);

  // Performance Rating (Clean, Simple, Professional)
  const calculateGrade = () => {
    if (rankedAiBreakdown?.performanceGrade) {
      const g = rankedAiBreakdown.performanceGrade;
      if (g === 'SSS') return { grade: 'SSS', text: 'Grade SSS • Flawless', color: 'text-rose-400', border: 'border-rose-500/70', bg: 'bg-rose-500/15', glow: 'shadow-rose-500/20' };
      if (g === 'SS') return { grade: 'SS', text: 'Grade SS • Master', color: 'text-purple-400', border: 'border-purple-500/70', bg: 'bg-purple-500/15', glow: 'shadow-purple-500/20' };
      if (g === 'S') return { grade: 'S', text: 'Grade S • Dominant', color: 'text-amber-400', border: 'border-amber-500/70', bg: 'bg-amber-500/15', glow: 'shadow-amber-500/20' };
      if (g === 'A') return { grade: 'A', text: 'Grade A • Decisive', color: 'text-emerald-400', border: 'border-emerald-500/70', bg: 'bg-emerald-500/15', glow: 'shadow-emerald-500/20' };
      if (g === 'B') return { grade: 'B', text: 'Grade B • Contested', color: 'text-blue-400', border: 'border-blue-500/70', bg: 'bg-blue-500/15', glow: 'shadow-blue-500/20' };
      return { grade: 'C', text: 'Grade C • Bout Concluded', color: 'text-zinc-400', border: 'border-zinc-600', bg: 'bg-zinc-800/40', glow: 'shadow-zinc-700/20' };
    }

    if (!isPlayerWinner) {
      if (playerScore > 0) return { grade: 'B', text: 'Grade B • Contested', color: 'text-blue-400', border: 'border-blue-500/70', bg: 'bg-blue-500/15', glow: 'shadow-blue-500/20' };
      return { grade: 'C', text: 'Grade C • Defeat', color: 'text-zinc-400', border: 'border-zinc-700', bg: 'bg-zinc-800/40', glow: 'shadow-zinc-800/20' };
    }
    if (opponentScore === 0 && damageTaken < 30) {
      return { grade: 'S+', text: 'Grade S+ • Clean Sweep', color: 'text-amber-400', border: 'border-amber-500/70', bg: 'bg-amber-500/15', glow: 'shadow-amber-500/20' };
    }
    if (opponentScore === 0) {
      return { grade: 'S', text: 'Grade S • Flawless', color: 'text-yellow-400', border: 'border-yellow-500/70', bg: 'bg-yellow-500/15', glow: 'shadow-yellow-500/20' };
    }
    if (damageDealt > 150 && hitsLanded >= 12) {
      return { grade: 'A+', text: 'Grade A+ • Dominant', color: 'text-emerald-400', border: 'border-emerald-500/70', bg: 'bg-emerald-500/15', glow: 'shadow-emerald-500/20' };
    }
    return { grade: 'A', text: 'Grade A • Victory', color: 'text-emerald-400', border: 'border-emerald-500/70', bg: 'bg-emerald-500/15', glow: 'shadow-emerald-500/20' };
  };

  const performanceGrade = calculateGrade();

  // Rewards breakdown based on mode (Direct and simple)
  const getRewardEstimates = () => {
    if (isRankedAi) {
      const diff = matchData?.aiDifficulty || 'silver';
      const rewardCashMap: Record<string, number> = { rookie: 220, silver: 300, gold: 400, diamond: 550, amethyst: 800 };
      const cash = isPlayerWinner ? (rewardCashMap[diff] || 300) : Math.round((rewardCashMap[diff] || 300) * 0.35);
      const rolls = isPlayerWinner ? 1 : 0;
      let eloChange = isPlayerWinner ? `+${rankInfo.baseGain} AI ELO` : `-${Math.max(1, Math.round(rankInfo.baseGain * 0.6))} AI ELO`;
      if (rankedAiBreakdown) {
        eloChange = isPlayerWinner ? `+${rankedAiBreakdown.totalEloChange} AI ELO` : `-${Math.abs(rankedAiBreakdown.totalEloChange)} AI ELO`;
      }
      return { cash, rolls, eloChange, keyLabel: isPlayerWinner ? '1 Iron Key' : null };
    }
    if (isTournamentAi) {
      const round = matchData?.tournamentRound || 'quarter';
      let cash = 500;
      let rolls = 1;
      let keyLabel: string | null = null;
      if (round === 'final') {
        cash = isPlayerWinner ? 1000 : 800;
        rolls = isPlayerWinner ? 5 : 3;
        keyLabel = isPlayerWinner ? '2 Gold Keys' : '1 Gold Key';
      } else if (round === 'semi') {
        cash = isPlayerWinner ? 600 : 350;
        rolls = isPlayerWinner ? 2 : 1;
        keyLabel = '1 Iron Key';
      } else {
        cash = isPlayerWinner ? 350 : 200;
        rolls = isPlayerWinner ? 1 : 0;
      }
      return { cash, rolls, eloChange: null, keyLabel };
    }
    if (isOnlineMatch) {
      const cash = isPlayerWinner ? 250 : 75;
      const rolls = isPlayerWinner ? 2 : 1;
      const eloChange = matchData?.isCompetitive
        ? (isPlayerWinner ? `+${rankInfo.baseGain} ELO` : `-${Math.max(1, Math.round(rankInfo.baseGain * 0.6))} ELO`)
        : null;
      return { cash, rolls, eloChange, keyLabel: null };
    }
    // Casual VS AI
    return {
      cash: isPlayerWinner ? 120 : 40,
      rolls: 0,
      eloChange: null,
      keyLabel: isPlayerWinner ? '1 Iron Key' : null
    };
  };

  const rewards = getRewardEstimates();

  const handleSendChat = (text: string) => {
    if (!text.trim()) return;
    const msg = {
      sender: 'You',
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSelf: true
    };
    setLocalChatList(prev => [...prev, msg]);
    if (onSendChatMessage) {
      onSendChatMessage(text.trim());
    }
    soundManager.playRollTick?.();
  };

  const opponentName = matchData?.opponent?.name || (isAiMatch ? `AI Bot (${(matchData?.aiDifficulty || 'Silver').toUpperCase()})` : 'Opponent');
  const opponentStyle = matchData?.opponent?.style;

  // Drop-Stamp Animation Keyframe Generator
  const dropStampAnimation = (delay: number) => ({
    initial: {
      scale: 2.0,
      scaleY: 1.0,
      scaleX: 1.0,
      y: -32,
      opacity: 0,
    },
    animate: {
      scale: [2.0, 1.0, 1.05, 1.0],
      scaleY: [1.0, 1.0, 0.95, 1.0],
      scaleX: [1.0, 1.0, 1.05, 1.0],
      y: [-32, 0, 1, 0],
      opacity: [0, 1, 1, 1],
    },
    transition: {
      duration: 0.24,
      delay,
      ease: [0.175, 0.885, 0.32, 1.275],
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 bg-black/90 backdrop-blur-2xl z-[140] flex items-center justify-center p-2 sm:p-4 md:p-6 select-none overflow-hidden pointer-events-auto transition-transform ${
        microShake ? 'translate-x-[2px] -translate-y-[2px]' : ''
      }`}
    >
      <motion.div
        initial={{ scale: 0.94, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 12 }}
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        style={{
          transform: `scale(${Math.max(0.75, Math.min(1.15, hudScale))})`,
          transformOrigin: 'center center',
        }}
        className="w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.95)] ring-1 ring-white/10 overflow-hidden flex flex-col relative my-auto max-h-[96dvh]"
      >
        {/* TOP SHARP ACCENT LINE */}
        <div 
          className={`h-1 w-full shrink-0 ${
            isPlayerWinner 
              ? 'bg-gradient-to-r from-amber-500 via-emerald-400 to-teal-400 shadow-[0_0_15px_rgba(16,185,129,0.7)]' 
              : isTournamentAi
                ? 'bg-gradient-to-r from-amber-600 via-orange-500 to-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.7)]'
                : 'bg-gradient-to-r from-red-600 via-rose-600 to-zinc-700 shadow-[0_0_15px_rgba(239,68,68,0.7)]'
          }`} 
        />

        {/* MAIN BODY CONTAINER: Responsive Landscape & Portrait Layout */}
        <div className="p-3 sm:p-5 flex flex-col md:flex-row gap-3.5 overflow-hidden max-h-[calc(96dvh-4px)]">
          
          {/* ================================================================ */}
          {/* LEFT COLUMN: MATCH OUTCOME, ACCORDION EVALUATION & REWARDS ROW   */}
          {/* ================================================================ */}
          <div className="flex-1 min-w-0 flex flex-col gap-2.5 overflow-hidden">
            
            {/* 1. COMPACT MATCH OUTCOME HEADER (Hidden when evaluation is expanded) */}
            <AnimatePresence>
              {!isEvaluationExpanded && (
                <motion.div 
                  key="match-outcome-header"
                  initial={{ height: 0, opacity: 0, scale: 0.95 }}
                  animate={{ height: 'auto', opacity: 1, scale: 1 }}
                  exit={{ height: 0, opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  {...(!isEvaluationExpanded ? dropStampAnimation(0.0) : {})}
                  className="p-3 sm:p-3.5 bg-zinc-900/90 border border-zinc-800 rounded-xl flex items-center justify-between shadow-lg overflow-hidden shrink-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center border shrink-0 shadow-md ${
                      isPlayerWinner 
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' 
                        : isTournamentAi
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                          : 'bg-red-500/15 border-red-500/40 text-red-400'
                    }`}>
                      {isPlayerWinner ? (
                        <Trophy className="w-5 h-5 animate-bounce" />
                      ) : isTournamentAi ? (
                        <Award className="w-5 h-5" />
                      ) : (
                        <Skull className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                          {isRankedAi 
                            ? 'RANKED AI LADDER' 
                            : isTournamentAi 
                              ? `TOURNAMENT • ${(matchData?.tournamentRound || 'quarter').toUpperCase()} ROUND` 
                              : isOnlineRanked 
                                ? '1V1 COMPETITIVE' 
                                : (isAiMatch ? 'CASUAL AI MATCH' : 'ARENA MATCH')}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-bold uppercase tracking-wider border ${
                          isPlayerWinner 
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60' 
                            : isTournamentAi
                              ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                              : 'bg-red-950/80 text-red-300 border-red-700/60'
                        }`}>
                          {isPlayerWinner ? 'VICTORY' : 'DEFEAT'}
                        </span>
                      </div>

                      <h1 className="font-display font-black text-lg sm:text-xl italic tracking-tight uppercase text-white flex items-center gap-2 mt-0.5">
                        <span>{isPlayerWinner ? 'VICTORY' : 'DEFEAT'}</span>
                        <span className="text-zinc-400 text-sm sm:text-base font-mono font-bold not-italic">
                          [{playerScore} - {opponentScore}]
                        </span>
                      </h1>

                      <div className="text-[9px] font-mono text-zinc-400 truncate mt-0.5">
                        vs <span className="text-zinc-200 font-semibold">{opponentName}</span> • <span className="text-zinc-400">{opponentStyle?.name || 'MMA Style'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Player Style Badge */}
                  <div className="hidden sm:flex flex-col items-end shrink-0 pl-2">
                    <div className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-right font-mono text-[8.5px] text-zinc-400">
                      <span className="text-zinc-500">STYLE:</span>
                      <div className="text-amber-400 font-bold uppercase text-[9.5px]">{activeStyle.name}</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 2. INTERACTIVE PERFORMANCE EVALUATION (Expands & Becomes Scrollable) */}
            <motion.div 
              {...dropStampAnimation(0.12)}
              className={`bg-zinc-900/90 border rounded-xl overflow-hidden shadow-xl flex flex-col transition-all duration-200 ${
                isEvaluationExpanded 
                  ? 'border-amber-500/50 ring-1 ring-amber-500/20 flex-1 min-h-0' 
                  : 'border-zinc-800 shrink-0'
              }`}
            >
              {/* Tappable Evaluation Header */}
              <button
                onClick={() => {
                  soundManager.playRollTick?.();
                  setIsEvaluationExpanded(prev => !prev);
                }}
                className={`w-full p-2.5 sm:p-3 bg-gradient-to-r from-zinc-900 via-zinc-850 to-zinc-900 hover:bg-zinc-800/80 flex items-center justify-between transition cursor-pointer text-left border-b ${
                  isEvaluationExpanded ? 'border-zinc-700/80' : 'border-zinc-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg border ${performanceGrade.border} ${performanceGrade.bg} ${performanceGrade.glow} flex items-center justify-center font-display font-black text-base italic ${performanceGrade.color} shadow-md shrink-0`}>
                    {performanceGrade.grade}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-white">
                        PERFORMANCE EVALUATION
                      </span>
                      <span className="text-[8.5px] font-mono font-semibold text-amber-400">
                        {isEvaluationExpanded ? '[TAP TO COLLAPSE]' : '[TAP TO EXPAND]'}
                      </span>
                    </div>
                    <div className="text-[9px] font-mono text-zinc-400">
                      Match Rating: <span className={`${performanceGrade.color} font-bold`}>{performanceGrade.text}</span> ({roundReports.length || 1} Rounds)
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-zinc-400">
                  <span className="text-[8.5px] font-mono uppercase font-bold hidden sm:inline text-zinc-400">
                    {isEvaluationExpanded ? 'Hide Telemetry' : 'View Telemetry'}
                  </span>
                  {isEvaluationExpanded ? (
                    <ChevronUp className="w-4 h-4 text-amber-400 transition-transform" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-white transition-transform" />
                  )}
                </div>
              </button>

              {/* Scrollable Telemetry Breakdown Content */}
              <AnimatePresence>
                {isEvaluationExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="flex-1 overflow-hidden flex flex-col min-h-0 bg-zinc-950/90"
                  >
                    {/* SCROLLABLE CONTAINER */}
                    <div className="p-3 space-y-3 overflow-y-auto max-h-[52vh] sm:max-h-[58vh] md:max-h-[62vh] custom-scrollbar pr-2">
                      
                      {/* Round-by-Round Breakdown Cards */}
                      {roundReports && roundReports.length > 0 ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1">
                            <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                              <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                              Round Breakdown
                            </span>
                            <span className="text-[8.5px] font-mono text-zinc-500">
                              Total Rounds: {roundReports.length}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {roundReports.map((rep) => {
                              const isRoundWon = rep.winner === 'player';
                              const roundTotalDmg = Math.max(1, rep.damageDealt + rep.damageTaken);
                              const roundPlayerPct = Math.round((rep.damageDealt / roundTotalDmg) * 100);
                              
                              const gradeColors: Record<string, { badge: string; border: string }> = {
                                'SSS': { badge: 'bg-rose-500/20 text-rose-300 border-rose-500/50', border: 'border-rose-500/30' },
                                'SS': { badge: 'bg-purple-500/20 text-purple-300 border-purple-500/50', border: 'border-purple-500/30' },
                                'S+': { badge: 'bg-amber-500/20 text-amber-300 border-amber-400/50', border: 'border-amber-500/30' },
                                'S': { badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/50', border: 'border-yellow-500/30' },
                                'A+': { badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50', border: 'border-emerald-500/30' },
                                'A': { badge: 'bg-teal-500/20 text-teal-300 border-teal-400/50', border: 'border-teal-500/30' },
                                'B': { badge: 'bg-blue-500/20 text-blue-300 border-blue-400/50', border: 'border-blue-500/30' },
                                'C': { badge: 'bg-zinc-800 text-zinc-400 border-zinc-700', border: 'border-zinc-800' }
                              };
                              const colorScheme = gradeColors[rep.grade] || gradeColors['B'];

                              return (
                                <div 
                                  key={rep.roundNumber}
                                  className={`p-2.5 bg-zinc-900/90 border ${colorScheme.border} rounded-lg space-y-1.5 shadow-sm`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-mono font-black text-white uppercase">
                                        R{rep.roundNumber}
                                      </span>
                                      <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded font-bold uppercase border ${
                                        isRoundWon ? 'bg-emerald-950 text-emerald-300 border-emerald-700/50' : 'bg-rose-950 text-rose-300 border-rose-700/50'
                                      }`}>
                                        {isRoundWon ? 'WON' : 'LOST'}
                                      </span>
                                      {rep.isFlawless && (
                                        <span className="text-[7.5px] font-mono px-1 rounded bg-amber-500/20 text-amber-300 font-bold uppercase border border-amber-500/40">
                                          FLAWLESS
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[8.5px] font-mono text-zinc-400">
                                        {rep.durationSec}s
                                      </span>
                                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${colorScheme.badge}`}>
                                        [{rep.grade}]
                                      </span>
                                    </div>
                                  </div>

                                  {/* Damage Share bar */}
                                  <div className="space-y-0.5">
                                    <div className="flex justify-between text-[7.5px] font-mono font-bold text-zinc-400">
                                      <span className="text-cyan-400">DEALT: {rep.damageDealt} HP</span>
                                      <span className="text-rose-400">TAKEN: {rep.damageTaken} HP</span>
                                    </div>
                                    <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden flex border border-zinc-800">
                                      <div className="h-full bg-cyan-400" style={{ width: `${roundPlayerPct}%` }} />
                                      <div className="h-full bg-rose-500" style={{ width: `${100 - roundPlayerPct}%` }} />
                                    </div>
                                  </div>

                                  {/* Metrics */}
                                  <div className="grid grid-cols-4 gap-1 text-[7.5px] font-mono text-center">
                                    <div className="bg-zinc-950 p-1 rounded border border-zinc-800/80">
                                      <span className="text-zinc-500 block text-[7px]">DOM</span>
                                      <span className="text-emerald-400 font-bold">{rep.dominancePct ?? 50}%</span>
                                    </div>
                                    <div className="bg-zinc-950 p-1 rounded border border-zinc-800/80">
                                      <span className="text-zinc-500 block text-[7px]">PARRY</span>
                                      <span className="text-purple-400 font-bold">{rep.parriesLanded}</span>
                                    </div>
                                    <div className="bg-zinc-950 p-1 rounded border border-zinc-800/80">
                                      <span className="text-zinc-500 block text-[7px]">LIGHT</span>
                                      <span className="text-cyan-400 font-bold">{rep.lightsLanded}</span>
                                    </div>
                                    <div className="bg-zinc-950 p-1 rounded border border-zinc-800/80">
                                      <span className="text-zinc-500 block text-[7px]">HEAVY</span>
                                      <span className="text-amber-400 font-bold">{rep.heaviesLanded}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex justify-between text-[9px] font-mono text-zinc-400 border-b border-zinc-800 pb-1">
                            <span>Damage Dealt: <b className="text-cyan-400">{Math.round(damageDealt)} HP</b></span>
                            <span>Damage Taken: <b className="text-rose-400">{Math.round(damageTaken)} HP</b></span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center font-mono text-[9px]">
                            <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                              <span className="text-zinc-500 block text-[8px]">LIGHT STRIKES</span>
                              <span className="text-cyan-400 font-bold text-xs">{lightsLanded ?? hitsLanded}</span>
                            </div>
                            <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                              <span className="text-zinc-500 block text-[8px]">HEAVY STRIKES</span>
                              <span className="text-amber-400 font-bold text-xs">{heaviesLanded ?? 0}</span>
                            </div>
                            <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                              <span className="text-zinc-500 block text-[8px]">PARRIES</span>
                              <span className="text-purple-400 font-bold text-xs">{parriesLanded ?? 0}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Summary Aggregates */}
                      <div className="p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-lg flex items-center justify-between text-[8.5px] font-mono text-zinc-400">
                        <div className="flex items-center gap-3">
                          <span>Total Dealt: <b className="text-cyan-400">{Math.round(damageDealt)} HP</b></span>
                          <span>Total Taken: <b className="text-rose-400">{Math.round(damageTaken)} HP</b></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>Parries: <b className="text-purple-400">{parriesLanded}</b></span>
                          <span>Strikes: <b className="text-amber-400">{lightsLanded + heaviesLanded}</b></span>
                        </div>
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* 3. REWARDS ROW: SEQUENTIAL DROPPING CARDS (Hidden when evaluation is expanded) */}
            <AnimatePresence>
              {!isEvaluationExpanded && (
                <motion.div 
                  key="rewards-row"
                  initial={{ height: 0, opacity: 0, scale: 0.95 }}
                  animate={{ height: 'auto', opacity: 1, scale: 1 }}
                  exit={{ height: 0, opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-2 overflow-hidden shrink-0"
                >
                  {/* Reward Card 1: Cash Reward */}
                  <motion.div 
                    {...(!isEvaluationExpanded ? dropStampAnimation(0.22) : {})}
                    className="p-2.5 sm:p-3 bg-zinc-900/90 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 shadow-sm"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                      <Coins className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[8px] font-mono text-zinc-400 uppercase tracking-wider block truncate">
                        CASH REWARD
                      </span>
                      <span className="font-mono font-bold text-emerald-400 text-sm sm:text-base leading-tight block">
                        +${rewards.cash.toLocaleString()}
                      </span>
                    </div>
                  </motion.div>

                  {/* Reward Card 2: Keys / Rolls */}
                  <motion.div 
                    {...(!isEvaluationExpanded ? dropStampAnimation(0.32) : {})}
                    className="p-2.5 sm:p-3 bg-zinc-900/90 border border-cyan-500/30 rounded-xl flex items-center gap-2.5 shadow-sm"
                  >
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                      <Dices className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[8px] font-mono text-zinc-400 uppercase tracking-wider block truncate">
                        KEYS & ROLLS
                      </span>
                      <span className="font-mono font-bold text-cyan-400 text-sm sm:text-base leading-tight block truncate">
                        {rewards.keyLabel || (rewards.rolls > 0 ? `+${rewards.rolls} ROLLS` : 'NONE')}
                      </span>
                    </div>
                  </motion.div>

                  {/* Reward Card 3: Rating / Streak */}
                  <motion.div 
                    {...(!isEvaluationExpanded ? dropStampAnimation(0.42) : {})}
                    className="p-2.5 sm:p-3 bg-zinc-900/90 border border-amber-500/30 rounded-xl flex items-center gap-2.5 shadow-sm"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[8px] font-mono text-zinc-400 uppercase tracking-wider block truncate">
                        {rewards.eloChange ? 'RATING DELTA' : 'WIN STREAK'}
                      </span>
                      <span className="font-mono font-bold text-amber-400 text-sm sm:text-base leading-tight block truncate">
                        {rewards.eloChange || `${streak} KOs`}
                      </span>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick Chat for Online Match */}
            {isOnlineMatch && !isEvaluationExpanded && (
              <div className="p-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between shrink-0">
                <span className="text-[8.5px] font-mono uppercase text-zinc-400 font-bold">Quick Chat</span>
                <div className="flex gap-1">
                  {QUICK_CHAT_OPTIONS.slice(0, 4).map(phrase => (
                    <button
                      key={phrase}
                      onClick={() => handleSendChat(phrase)}
                      className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-[8.5px] font-mono text-zinc-300 rounded cursor-pointer transition"
                    >
                      {phrase}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* ================================================================ */}
          {/* RIGHT COLUMN / MOBILE BOTTOM: ACTION BUTTONS (STAMP 4: t = 480ms) */}
          {/* ================================================================ */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.28, delay: 0.44, ease: 'easeOut' }}
            className="w-full md:w-48 lg:w-52 shrink-0 flex flex-col justify-center gap-2 bg-zinc-900/90 p-3 rounded-xl border border-zinc-800 shadow-xl"
          >
            <span className="text-[8.5px] font-mono text-zinc-400 uppercase tracking-wider text-center block font-bold">
              ACTIONS
            </span>

            {/* 1. [ NEXT AI ]: Primary High-Contrast Red Action */}
            {onNextAiOpponent && (
              <button
                onClick={() => {
                  soundManager.playLevelUp?.();
                  onNextAiOpponent();
                }}
                className="w-full py-2.5 sm:py-3 px-3 bg-red-600 hover:bg-red-500 text-white font-mono font-bold uppercase text-xs tracking-wider rounded-lg shadow-md shadow-red-600/30 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer border border-red-400/50"
              >
                <Swords className="w-4 h-4" />
                <span>NEXT AI</span>
              </button>
            )}

            {/* 2. [ REMATCH ]: Secondary Blue Action */}
            <button
              onClick={() => {
                soundManager.playRollTick?.();
                onVoteRematch();
              }}
              disabled={rematchRequested || opponentDisconnected}
              className={`w-full py-2.5 sm:py-3 px-3 rounded-lg font-mono font-bold uppercase text-xs tracking-wider transition flex items-center justify-center gap-2 shadow-md active:scale-95 cursor-pointer border ${
                rematchRequested
                  ? 'bg-emerald-600 text-white border-emerald-400 cursor-default animate-pulse'
                  : opponentDisconnected
                    ? 'bg-zinc-850 text-zinc-500 border-zinc-800 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400/50 shadow-blue-600/20'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>{rematchRequested ? 'REMATCHING...' : (isOnlineMatch ? 'REMATCH' : 'REMATCH')}</span>
            </button>

            {/* 3. [ CHAMBER ]: Quick Access to Gacha/Keys (Amber) */}
            {onGoToGacha && (
              <button
                onClick={() => {
                  soundManager.playRollTick?.();
                  onGoToGacha();
                }}
                className="w-full py-2 sm:py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold uppercase text-xs tracking-wider rounded-lg shadow-md shadow-amber-500/20 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer border border-amber-300"
              >
                <Dices className="w-4 h-4 text-black" />
                <span>CHAMBER</span>
              </button>
            )}

            {/* 4. [ EXIT TO HUB ]: Return (Grey Action) */}
            <button
              onClick={() => {
                soundManager.playRollTick?.();
                onLeaveMatch();
              }}
              className="w-full py-2 sm:py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg font-mono font-bold uppercase text-xs tracking-wider transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 border border-zinc-700"
            >
              <LogOut className="w-4 h-4 text-zinc-400" />
              <span>EXIT TO HUB</span>
            </button>
          </motion.div>

        </div>

      </motion.div>
    </motion.div>
  );
}
