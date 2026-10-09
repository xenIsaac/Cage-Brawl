import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, Swords, Star, CheckCircle2, AlertTriangle, 
  X, BarChart3, Shield, Flame, Activity,
  ChevronRight, Sparkles, Zap, Award
} from 'lucide-react';
import { TournamentBracketState, TournamentFighter, TournamentMatch, PlayerStats } from '../../types';
import { FIGHTING_STYLES } from '../../data/styles';

interface TournamentLadderModalProps {
  bracket: TournamentBracketState;
  preMatchCountdown: number;
  isCountdownPaused?: boolean;
  onTogglePauseCountdown?: () => void;
  onStartPlayerMatch: (round: 'quarter' | 'semi' | 'final', opponent: TournamentFighter) => void;
  onCloseTournament: () => void;
  tournamentNotification: string | null;
  stats: PlayerStats;
  isPortrait: boolean;
  isMobileView: boolean;
  lastAftermatchData: any;
  showAftermatchModal: boolean;
  setShowAftermatchModal: (show: boolean) => void;
}

export const TournamentLadderModal: React.FC<TournamentLadderModalProps> = ({
  bracket,
  preMatchCountdown,
  isCountdownPaused,
  onTogglePauseCountdown,
  onStartPlayerMatch,
  onCloseTournament,
  tournamentNotification,
  stats,
  isPortrait,
  isMobileView,
  lastAftermatchData,
  showAftermatchModal,
  setShowAftermatchModal,
}) => {
  // Mobile stage view toggle to eliminate awkward vertical scrolling on phones
  const [mobileViewMode, setMobileViewMode] = useState<'ladder' | 'stage'>('ladder');
  const [selectedStageTab, setSelectedStageTab] = useState<'quarter' | 'semi' | 'final'>(bracket.currentRound || 'quarter');

  const curRound = bracket.currentRound;

  // Determine player's active uncompleted match
  let activePlayerMatch: TournamentMatch | null = null;
  let activeOpponent: TournamentFighter | null = null;
  let rivalsReady = true;

  if (curRound === 'quarter' && !bracket.quarterMatches[0].isCompleted) {
    activePlayerMatch = bracket.quarterMatches[0];
    activeOpponent = bracket.quarterMatches[0].fighter2 as TournamentFighter;
  } else if (curRound === 'semi' && !bracket.semiMatches[0].isCompleted) {
    activePlayerMatch = bracket.semiMatches[0];
    activeOpponent = bracket.semiMatches[0].fighter2 as TournamentFighter;
    rivalsReady = bracket.quarterMatches.every(m => m.isCompleted);
  } else if (curRound === 'final' && !bracket.finalMatch.isCompleted) {
    activePlayerMatch = bracket.finalMatch;
    activeOpponent = bracket.finalMatch.fighter2 as TournamentFighter;
    rivalsReady = bracket.semiMatches[1].isCompleted;
  }

  const isTournamentOver = bracket.status === 'completed' || bracket.status === 'eliminated';
  const isChampion = bracket.status === 'completed' && bracket.finalMatch.winner === 'PLAYER';

  // Helper for style badge color
  const getStyleColor = (styleId?: string) => {
    const s = FIGHTING_STYLES.find(st => st.id === styleId);
    return s?.color || '#cbd5e1';
  };

  // Render individual Match Card
  const renderMatchCard = (match: TournamentMatch, matchLabel: string, seedF1?: number, seedF2?: number) => {
    const isPlayerMatch = match.fighter1 === 'PLAYER' || match.fighter2 === 'PLAYER';
    const f1 = match.fighter1 === 'PLAYER' ? null : (match.fighter1 as TournamentFighter | undefined);
    const f2 = match.fighter2 === 'PLAYER' ? null : (match.fighter2 as TournamentFighter | undefined);

    const isF1Winner = match.isCompleted && match.winner === (match.fighter1 === 'PLAYER' ? 'PLAYER' : f1);
    const isF2Winner = match.isCompleted && match.winner === (match.fighter2 === 'PLAYER' ? 'PLAYER' : f2);

    return (
      <div 
        key={match.id}
        className={`relative rounded-2xl border transition-all duration-300 overflow-hidden ${
          isPlayerMatch
            ? 'bg-gradient-to-b from-zinc-950 via-emerald-950/20 to-zinc-950 border-emerald-500/70 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/30'
            : match.isCompleted
            ? 'bg-zinc-950/80 border-zinc-800/80 shadow-sm'
            : match.isSimulating
            ? 'bg-zinc-950 border-cyan-500/40 shadow-md shadow-cyan-950/20'
            : 'bg-zinc-950/60 border-zinc-800/60'
        }`}
      >
        {/* Card Header Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/90 border-b border-zinc-800/80">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono font-black text-amber-400 uppercase tracking-wider">
              {matchLabel}
            </span>
            {isPlayerMatch && (
              <span className="text-[8px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5 text-emerald-400" /> YOU
              </span>
            )}
          </div>

          <div>
            {match.isCompleted ? (
              <span className="text-[8px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                FINAL ({match.simFighter1Score ?? (isF1Winner ? 2 : 1)} - {match.simFighter2Score ?? (isF2Winner ? 2 : 1)})
              </span>
            ) : match.isSimulating ? (
              <span className="text-[8px] font-mono font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 px-1.5 py-0.2 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                R{match.simCurrentRound || 1} LIVE
              </span>
            ) : isPlayerMatch && rivalsReady ? (
              <span className="text-[8px] font-mono font-bold text-amber-300 bg-amber-950/80 border border-amber-800/80 px-1.5 py-0.2 rounded-full animate-pulse">
                NEXT UP
              </span>
            ) : (
              <span className="text-[8px] font-mono text-zinc-500 uppercase">
                SCHEDULED
              </span>
            )}
          </div>
        </div>

        {/* Competitors Area */}
        <div className="p-2.5 space-y-2">
          {/* Fighter 1 Row */}
          <div className={`space-y-1 transition-opacity ${match.isCompleted && !isF1Winner ? 'opacity-40' : 'opacity-100'}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {seedF1 && (
                  <span className="text-[8px] font-mono text-zinc-500 shrink-0">#{seedF1}</span>
                )}
                {match.fighter1 === 'PLAYER' ? (
                  <span className="text-xs font-bold text-emerald-400 truncate flex items-center gap-1">
                    <Star className="w-3 h-3 text-emerald-400 shrink-0" />
                    YOU (PLAYER)
                  </span>
                ) : (
                  <span className="text-xs font-bold text-zinc-200 truncate">
                    {f1?.name || (match.round === 'semi' ? 'Winner QF 1' : 'Winner SF 1')}
                  </span>
                )}
                {f1 && (
                  <span 
                    className="text-[8px] font-mono font-semibold px-1 rounded truncate border border-zinc-700/50"
                    style={{ color: getStyleColor(f1.style.id) }}
                  >
                    {f1.style.name}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {match.isSimulating && !isPlayerMatch && (
                  <span className="text-[9px] font-mono font-bold text-emerald-400">
                    {match.simFighter1HpPct ?? 100}%
                  </span>
                )}
                {isF1Winner && (
                  <span className="text-[8px] font-mono font-bold text-amber-400 bg-amber-950/80 px-1 py-0.5 rounded border border-amber-800">
                    WIN
                  </span>
                )}
              </div>
            </div>

            {/* Fighter 1 Monotonic HP Bar (Full reset after round, no mid-round healing) */}
            {match.isSimulating && !isPlayerMatch && (
              <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-800/80">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${match.simFighter1HpPct ?? 100}%` }}
                />
              </div>
            )}
          </div>

          {/* VS Divider */}
          <div className="flex items-center justify-center gap-2 py-0.5">
            <div className="h-[1px] bg-zinc-800/80 flex-1" />
            <span className="text-[8px] font-mono font-black text-zinc-500 tracking-wider">VS</span>
            <div className="h-[1px] bg-zinc-800/80 flex-1" />
          </div>

          {/* Fighter 2 Row */}
          <div className={`space-y-1 transition-opacity ${match.isCompleted && !isF2Winner ? 'opacity-40' : 'opacity-100'}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {seedF2 && (
                  <span className="text-[8px] font-mono text-zinc-500 shrink-0">#{seedF2}</span>
                )}
                {match.fighter2 === 'PLAYER' ? (
                  <span className="text-xs font-bold text-emerald-400 truncate flex items-center gap-1">
                    <Star className="w-3 h-3 text-emerald-400 shrink-0" />
                    YOU (PLAYER)
                  </span>
                ) : (
                  <span className="text-xs font-bold text-zinc-200 truncate">
                    {f2?.name || (match.round === 'semi' ? 'Winner QF 2' : 'Winner SF 2')}
                  </span>
                )}
                {f2 && (
                  <span 
                    className="text-[8px] font-mono font-semibold px-1 rounded truncate border border-zinc-700/50"
                    style={{ color: getStyleColor(f2.style.id) }}
                  >
                    {f2.style.name}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {match.isSimulating && !isPlayerMatch && (
                  <span className="text-[9px] font-mono font-bold text-blue-400">
                    {match.simFighter2HpPct ?? 100}%
                  </span>
                )}
                {isF2Winner && (
                  <span className="text-[8px] font-mono font-bold text-amber-400 bg-amber-950/80 px-1 py-0.5 rounded border border-amber-800">
                    WIN
                  </span>
                )}
              </div>
            </div>

            {/* Fighter 2 Monotonic HP Bar (Full reset after round, no mid-round healing) */}
            {match.isSimulating && !isPlayerMatch && (
              <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-800/80">
                <div 
                  className="bg-blue-500 h-full transition-all duration-300"
                  style={{ width: `${match.simFighter2HpPct ?? 100}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md p-2 sm:p-4 flex items-center justify-center select-none overflow-hidden"
    >
      <motion.div
        initial={{ scale: 0.96, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 15 }}
        className="w-full max-w-6xl bg-zinc-950 border-2 border-amber-500/60 rounded-3xl p-3 sm:p-5 shadow-2xl flex flex-col max-h-[96vh] relative overflow-hidden"
      >
        {/* Floating Tournament Notification */}
        {tournamentNotification && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-amber-950/90 border border-amber-500/60 px-3 py-1.5 rounded-xl text-center text-xs font-mono font-bold text-amber-300 shadow-lg flex items-center justify-center gap-2 mb-2 shrink-0"
          >
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
            <span>{tournamentNotification}</span>
          </motion.div>
        )}

        {/* 1. Header Bar with Tournament Meta, Controls & Pause/Resume */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5 mb-2.5 flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-display font-black italic uppercase text-white tracking-wide truncate">
                  OCTAGON KNOCKOUT CHAMPIONSHIP
                </h2>
                <span className="text-[9px] font-mono not-italic uppercase bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-full shrink-0">
                  8-Competitor Ladder
                </span>
              </div>
              <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
                Single Elimination Bracket • Purse: <strong className="text-emerald-400">$1,000 Cash + 5 Roll Tickets</strong>
              </p>
            </div>
          </div>

          {/* Action & Control Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Advanced Aftermatch Telemetry Button */}
            {lastAftermatchData && (
              <button
                onClick={() => setShowAftermatchModal(true)}
                className="px-3 py-1.5 bg-gradient-to-r from-blue-900/60 to-cyan-950/80 hover:brightness-120 border border-cyan-500/50 rounded-xl text-cyan-300 font-mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
                title="View detailed statistics from your previous match"
              >
                <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                <span>AFTERMATCH STATS</span>
              </button>
            )}

            {/* Exit Tournament Button */}
            <button
              onClick={onCloseTournament}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-red-950/60 border border-zinc-800 hover:border-red-600/80 rounded-xl text-zinc-400 hover:text-red-300 cursor-pointer font-mono text-xs font-bold transition flex items-center gap-1"
            >
              <span>Exit</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 2. Top Banner: Countdown / Rivals Simulation Status */}
        <div className="shrink-0 mb-3">
          {isTournamentOver ? (
            // Tournament Finished Placement Showcase
            <div className={`p-3 rounded-2xl border-2 text-center flex items-center justify-between flex-wrap gap-2 ${
              isChampion
                ? 'bg-gradient-to-r from-amber-950 via-yellow-950/60 to-amber-950 border-yellow-400 shadow-xl'
                : 'bg-zinc-900/80 border-amber-500/50'
            }`}>
              <div className="flex items-center gap-3">
                <Trophy className={`w-7 h-7 ${isChampion ? 'text-yellow-400 animate-bounce' : 'text-amber-400'}`} />
                <div className="text-left">
                  <span className="text-sm font-display font-black italic uppercase text-white tracking-wide block">
                    {isChampion ? '🏆 OCTAGON CHAMPION! 100% REWARD CLAIMED' : '🥊 TOURNAMENT RUN CONCLUDED'}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-300">
                    {isChampion 
                      ? 'Congratulations! You defeated all 3 opponents to win the Octagon Crown.' 
                      : `Placement Reward awarded to your balance. Safe travels, fighter.`}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {lastAftermatchData && (
                  <button
                    onClick={() => setShowAftermatchModal(true)}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-mono text-xs font-bold cursor-pointer"
                  >
                    View Final Telemetry
                  </button>
                )}
                <button
                  onClick={onCloseTournament}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl font-mono text-xs font-bold cursor-pointer"
                >
                  Return to Menu
                </button>
              </div>
            </div>
          ) : !rivalsReady ? (
            // Awaiting Rivals to finish simulation
            <div className="bg-gradient-to-r from-amber-950/80 via-zinc-900 to-amber-950/80 border-2 border-amber-500/60 p-2.5 sm:p-3 rounded-2xl flex items-center justify-between flex-wrap gap-3 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 font-mono font-black text-xs animate-pulse shrink-0">
                  <Activity className="w-5 h-5 text-amber-400 animate-spin" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-display font-black italic uppercase text-amber-400 tracking-wider">
                      ⏳ AWAITING RIVAL MATCHES TO FINISH...
                    </span>
                    <span className="text-[8px] font-mono uppercase bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.5 rounded">
                      LIVE SIMULATION
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-zinc-300 mt-0.5">
                    {curRound === 'semi'
                      ? 'Quarter-Final matches are battling in the Octagon. HP resets cleanly between rounds.'
                      : 'Semi-Final 2 rival bout is currently underway in the Octagon.'}
                  </p>
                </div>
              </div>

              <div className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/90 px-3 py-1 rounded-xl border border-amber-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>RIVALS FIGHTING</span>
              </div>
            </div>
          ) : activePlayerMatch && activeOpponent ? (
            // Countdown Banner: Automatic 3s Auto-Dispatching
            <div className="bg-gradient-to-r from-red-950/90 via-zinc-900 to-red-950/90 border-2 border-red-500/80 p-2.5 sm:p-3 rounded-2xl flex items-center justify-between flex-wrap gap-3 shadow-xl animate-pulse">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-red-600/30 border border-red-500 text-red-400 flex items-center justify-center font-mono font-black text-base shrink-0">
                  {preMatchCountdown}s
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-display font-black italic uppercase tracking-wider text-red-400">
                      🔥 AUTOMATIC MATCH ENTRY IN {preMatchCountdown}S...
                    </span>
                    <span className="text-[8px] font-mono uppercase bg-zinc-900 text-zinc-300 border border-zinc-700 px-1.5 py-0.5 rounded shrink-0">
                      {curRound.toUpperCase()} BOUT
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-zinc-300 mt-0.5 truncate">
                    Opponent: <strong className="text-white">{activeOpponent.name}</strong> • Style: <strong style={{ color: getStyleColor(activeOpponent.style.id) }}>{activeOpponent.style.name}</strong>
                  </p>
                </div>
              </div>

              <div className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/90 px-3 py-1.5 rounded-xl border border-emerald-800 flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>AUTO-DISPATCHING TO OCTAGON</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* 3. Mobile Navigation Controls (Elimination of Scrolling) */}
        {isMobileView && isPortrait && (
          <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 text-[10px] font-mono">
              <button
                onClick={() => setMobileViewMode('ladder')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  mobileViewMode === 'ladder' ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Full Ladder
              </button>
              <button
                onClick={() => setMobileViewMode('stage')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  mobileViewMode === 'stage' ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                By Stage
              </button>
            </div>

            {mobileViewMode === 'stage' && (
              <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 text-[10px] font-mono">
                <button
                  onClick={() => setSelectedStageTab('quarter')}
                  className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                    selectedStageTab === 'quarter' ? 'bg-zinc-800 text-amber-300' : 'text-zinc-500'
                  }`}
                >
                  QF (4)
                </button>
                <button
                  onClick={() => setSelectedStageTab('semi')}
                  className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                    selectedStageTab === 'semi' ? 'bg-zinc-800 text-amber-300' : 'text-zinc-500'
                  }`}
                >
                  SF (2)
                </button>
                <button
                  onClick={() => setSelectedStageTab('final')}
                  className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                    selectedStageTab === 'final' ? 'bg-zinc-800 text-amber-300' : 'text-zinc-500'
                  }`}
                >
                  Final (1)
                </button>
              </div>
            )}
          </div>
        )}

        {/* 4. THE TOURNAMENT LADDER VISUAL TREE */}
        <div className="flex-1 overflow-y-auto custom-scrollbar overscroll-contain pr-1">
          {/* If Mobile Stage View is Active */}
          {isMobileView && isPortrait && mobileViewMode === 'stage' ? (
            <div className="space-y-3">
              {selectedStageTab === 'quarter' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold text-amber-400 border-b border-zinc-800 pb-1">
                    <span>Quarter-Final Bouts (Top 8)</span>
                    <span className="text-zinc-500">4 Matches</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {bracket.quarterMatches.map((m, idx) => 
                      renderMatchCard(m, `QF Match #${idx + 1}`, idx * 2 + 1, idx * 2 + 2)
                    )}
                  </div>
                </div>
              )}

              {selectedStageTab === 'semi' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold text-amber-400 border-b border-zinc-800 pb-1">
                    <span>Semi-Final Bouts (Final 4)</span>
                    <span className="text-zinc-500">2 Matches</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {bracket.semiMatches.map((m, idx) => 
                      renderMatchCard(m, `Semi-Final #${idx + 1}`)
                    )}
                  </div>
                </div>
              )}

              {selectedStageTab === 'final' && (
                <div className="space-y-2.5 max-w-md mx-auto">
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold text-emerald-400 border-b border-zinc-800 pb-1">
                    <span>Grand Championship Match</span>
                    <span className="text-amber-400">$1,000 + 5 Rolls</span>
                  </div>
                  {renderMatchCard(bracket.finalMatch, 'Championship Final')}
                </div>
              )}
            </div>
          ) : (
            // Full Visual Ladder Tree with Connectors (Desktop, Landscape & Full Ladder Mobile)
            <div className="relative min-w-[700px] lg:min-w-0">
              <div className="grid grid-cols-12 gap-2 items-center">
                
                {/* Column 1: Quarter-Finals (Matches 1, 2, 3, 4) */}
                <div className="col-span-4 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold text-amber-400 uppercase border-b border-zinc-800/80 pb-1 mb-1">
                    <span>Quarter-Finals</span>
                    <span className="bg-amber-950/80 text-amber-300 border border-amber-800 px-1.5 py-0.2 rounded text-[8px]">
                      Round 1 (4)
                    </span>
                  </div>
                  {bracket.quarterMatches.map((match, idx) => 
                    renderMatchCard(match, `QF #${idx + 1}`, idx * 2 + 1, idx * 2 + 2)
                  )}
                </div>

                {/* SVG Connectors Column 1: QF -> SF */}
                <div className="col-span-1 flex flex-col justify-around h-full py-6 relative">
                  <svg className="w-full h-full min-h-[360px]" preserveAspectRatio="none" viewBox="0 0 100 400">
                    {/* Top Branch: QF1 & QF2 into SF1 */}
                    <path
                      d="M 0 55 H 50 V 105 H 100"
                      fill="none"
                      stroke={bracket.quarterMatches[0].isCompleted ? '#10b981' : '#3f3f46'}
                      strokeWidth="2.5"
                      strokeDasharray={bracket.quarterMatches[0].isCompleted ? 'none' : '4 3'}
                    />
                    <path
                      d="M 0 155 H 50 V 105 H 100"
                      fill="none"
                      stroke={bracket.quarterMatches[1].isCompleted ? '#10b981' : '#3f3f46'}
                      strokeWidth="2.5"
                      strokeDasharray={bracket.quarterMatches[1].isCompleted ? 'none' : '4 3'}
                    />

                    {/* Bottom Branch: QF3 & QF4 into SF2 */}
                    <path
                      d="M 0 255 H 50 V 305 H 100"
                      fill="none"
                      stroke={bracket.quarterMatches[2].isCompleted ? '#10b981' : '#3f3f46'}
                      strokeWidth="2.5"
                      strokeDasharray={bracket.quarterMatches[2].isCompleted ? 'none' : '4 3'}
                    />
                    <path
                      d="M 0 355 H 50 V 305 H 100"
                      fill="none"
                      stroke={bracket.quarterMatches[3].isCompleted ? '#10b981' : '#3f3f46'}
                      strokeWidth="2.5"
                      strokeDasharray={bracket.quarterMatches[3].isCompleted ? 'none' : '4 3'}
                    />
                  </svg>
                </div>

                {/* Column 2: Semi-Finals (Matches 1, 2) */}
                <div className="col-span-3 space-y-6 flex flex-col justify-around">
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold text-amber-400 uppercase border-b border-zinc-800/80 pb-1 mb-1">
                    <span>Semi-Finals</span>
                    <span className="bg-amber-950/80 text-amber-300 border border-amber-800 px-1.5 py-0.2 rounded text-[8px]">
                      Round 2 (2)
                    </span>
                  </div>

                  <div className="space-y-8">
                    {renderMatchCard(bracket.semiMatches[0], 'Semi-Final #1')}
                    {renderMatchCard(bracket.semiMatches[1], 'Semi-Final #2')}
                  </div>
                </div>

                {/* SVG Connectors Column 2: SF -> Finals */}
                <div className="col-span-1 flex flex-col justify-center h-full py-6 relative">
                  <svg className="w-full h-full min-h-[360px]" preserveAspectRatio="none" viewBox="0 0 100 400">
                    <path
                      d="M 0 105 H 50 V 205 H 100"
                      fill="none"
                      stroke={bracket.semiMatches[0].isCompleted ? '#f59e0b' : '#3f3f46'}
                      strokeWidth="2.5"
                      strokeDasharray={bracket.semiMatches[0].isCompleted ? 'none' : '4 3'}
                    />
                    <path
                      d="M 0 305 H 50 V 205 H 100"
                      fill="none"
                      stroke={bracket.semiMatches[1].isCompleted ? '#f59e0b' : '#3f3f46'}
                      strokeWidth="2.5"
                      strokeDasharray={bracket.semiMatches[1].isCompleted ? 'none' : '4 3'}
                    />
                  </svg>
                </div>

                {/* Column 3: Championship Final & Trophy Showcase */}
                <div className="col-span-3 space-y-3 flex flex-col justify-center">
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold text-emerald-400 uppercase border-b border-zinc-800/80 pb-1 mb-1">
                    <span>Championship Final</span>
                    <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-800 px-1.5 py-0.2 rounded text-[8px]">
                      Title Bout (1)
                    </span>
                  </div>

                  {/* Grand Trophy Podium Header */}
                  <div className="bg-gradient-to-r from-amber-950/60 via-yellow-950/40 to-amber-950/60 border border-amber-500/40 p-2.5 rounded-2xl text-center space-y-1 shadow-md">
                    <div className="flex items-center justify-center gap-1.5">
                      <Trophy className="w-5 h-5 text-yellow-400 animate-pulse" />
                      <span className="text-xs font-display font-black italic uppercase text-yellow-300">
                        OCTAGON BELT & TITLE
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-emerald-400 font-bold block">
                      PURSE: $1,000 CASH • +5 ROLL TICKETS
                    </span>
                  </div>

                  {renderMatchCard(bracket.finalMatch, 'Championship Final')}
                </div>

              </div>
            </div>
          )}
        </div>

        {/* 5. ADVANCED AFTERMATCH SYSTEM MODAL */}
        <AnimatePresence>
          {showAftermatchModal && lastAftermatchData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md p-3 sm:p-5 flex items-center justify-center select-none overflow-y-auto"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="w-full max-w-2xl bg-zinc-950 border-2 border-cyan-500/80 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto custom-scrollbar"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-display font-black italic uppercase text-white tracking-wide flex items-center gap-2">
                        ADVANCED AFTERMATCH TELEMETRY
                        <span className="text-[8px] font-mono not-italic uppercase bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded-full">
                          TOURNAMENT REPORT
                        </span>
                      </h3>
                      <p className="text-[10px] font-mono text-zinc-400">
                        Detailed round-by-round combat analysis & scoring metrics
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowAftermatchModal(false)}
                    className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl cursor-pointer transition border border-zinc-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Outcome Banner */}
                <div className={`p-3 rounded-2xl border flex items-center justify-between flex-wrap gap-2 ${
                  lastAftermatchData.isWinner
                    ? 'bg-emerald-950/40 border-emerald-500/60'
                    : 'bg-red-950/40 border-red-500/60'
                }`}>
                  <div className="flex items-center gap-2">
                    <Award className={`w-6 h-6 ${lastAftermatchData.isWinner ? 'text-emerald-400' : 'text-red-400'}`} />
                    <div>
                      <span className="text-xs sm:text-sm font-display font-black italic uppercase text-white tracking-wide block">
                        {lastAftermatchData.isWinner ? 'MATCH VICTORY — ADVANCED' : 'MATCH DEFEAT'}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-300">
                        Round: {lastAftermatchData.round?.toUpperCase()} • Opponent: {lastAftermatchData.opponentName} ({lastAftermatchData.opponentStyle})
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-amber-300 block">
                      SCORE: {lastAftermatchData.playerScore ?? 2} - {lastAftermatchData.opponentScore ?? 0}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-400">
                      {lastAftermatchData.isWinner ? 'Qualification Confirmed' : 'Tournament Run Concluded'}
                    </span>
                  </div>
                </div>

                {/* Combat Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
                    <span className="text-[8px] font-mono text-zinc-400 uppercase block font-bold">Damage Dealt</span>
                    <span className="text-sm font-mono font-black text-emerald-400">
                      {Math.round(lastAftermatchData.damageDealt || 0)} HP
                    </span>
                  </div>
                  <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
                    <span className="text-[8px] font-mono text-zinc-400 uppercase block font-bold">Damage Taken</span>
                    <span className="text-sm font-mono font-black text-red-400">
                      {Math.round(lastAftermatchData.damageTaken || 0)} HP
                    </span>
                  </div>
                  <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
                    <span className="text-[8px] font-mono text-zinc-400 uppercase block font-bold">Strikes Landed</span>
                    <span className="text-sm font-mono font-black text-cyan-300">
                      {lastAftermatchData.hitsLanded || 0} Hits
                    </span>
                  </div>
                  <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
                    <span className="text-[8px] font-mono text-zinc-400 uppercase block font-bold">Deflections / Parries</span>
                    <span className="text-sm font-mono font-black text-amber-400">
                      {lastAftermatchData.parriesLanded || 0} Parries
                    </span>
                  </div>
                </div>

                {/* Round-by-Round Breakdown */}
                {lastAftermatchData.roundReports && lastAftermatchData.roundReports.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold text-zinc-400 border-b border-zinc-800 pb-1">
                      <span>ROUND-BY-ROUND TELEMETRY CARDS</span>
                      <span className="text-zinc-500">{lastAftermatchData.roundReports.length} Rounds Logged</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {lastAftermatchData.roundReports.map((rep: any, idx: number) => {
                        const isWon = rep.winner === 'player';
                        const totalDmg = Math.max(1, rep.damageDealt + rep.damageTaken);
                        const playerPct = Math.round((rep.damageDealt / totalDmg) * 100);

                        return (
                          <div 
                            key={idx}
                            className={`p-3 rounded-xl border space-y-2 ${
                              isWon ? 'bg-zinc-950 border-emerald-500/50' : 'bg-zinc-950 border-red-500/40'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold text-white uppercase">
                                Round {rep.roundNumber || idx + 1}
                              </span>
                              <span className={`text-[8px] font-mono font-black px-2 py-0.5 rounded border ${
                                rep.grade === 'S+' || rep.grade === 'S' 
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              }`}>
                                GRADE: {rep.grade || 'A'}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-[9px] font-mono text-zinc-300">
                                <span>Dealt: {Math.round(rep.damageDealt)} HP</span>
                                <span>Taken: {Math.round(rep.damageTaken)} HP</span>
                              </div>
                              <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden flex border border-zinc-800">
                                <div className="bg-emerald-500 h-full" style={{ width: `${playerPct}%` }} />
                                <div className="bg-red-500 h-full" style={{ width: `${100 - playerPct}%` }} />
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[8px] font-mono text-zinc-400 pt-1 border-t border-zinc-900">
                              <span>Lights: {rep.lightsLanded ?? '-'} • Heavies: {rep.heaviesLanded ?? '-'}</span>
                              <span>Parries: {rep.parriesLanded ?? '-'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Close Button */}
                <button
                  onClick={() => setShowAftermatchModal(false)}
                  className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-display font-black italic uppercase text-xs rounded-xl cursor-pointer transition shadow-md"
                >
                  RETURN TO TOURNAMENT LADDER
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </motion.div>
  );
};
