import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogOut, RefreshCw, Trophy, Swords, Skull, 
  ChevronDown, Radio, Sparkles, Target, Award, EyeOff, ChevronLeft 
} from 'lucide-react';
import { SingleplayerSide, CompetitiveSubTab, CasualSubTab, AiDifficulty } from '../AiMatchScreen';

interface SingleplayerNavRailProps {
  isHovered: boolean;
  isMobileOpen: boolean;
  singleplayerModeSide: SingleplayerSide;
  setSingleplayerModeSide?: (side: SingleplayerSide) => void;
  singleplayerCompSubTab: CompetitiveSubTab;
  setSingleplayerCompSubTab?: (tab: CompetitiveSubTab) => void;
  singleplayerCasualSubTab: CasualSubTab;
  setSingleplayerCasualSubTab?: (tab: CasualSubTab) => void;
  singleplayerDifficulty: AiDifficulty;
  setSingleplayerDifficulty?: (diff: AiDifficulty) => void;
  onExitToMenu: () => void;
  onOpenQuests: () => void;
  onToggleHide?: () => void;
  handleItemClick: (action: () => void, shouldCloseNav?: boolean) => void;
}

export const SingleplayerNavRail: React.FC<SingleplayerNavRailProps> = ({
  isHovered,
  isMobileOpen,
  singleplayerModeSide,
  setSingleplayerModeSide,
  singleplayerCompSubTab,
  setSingleplayerCompSubTab,
  singleplayerCasualSubTab,
  setSingleplayerCasualSubTab,
  singleplayerDifficulty,
  setSingleplayerDifficulty,
  onExitToMenu,
  onOpenQuests,
  onToggleHide,
  handleItemClick,
}) => {
  return (
    <motion.div
      key="singleplayer_mode_nav"
      initial={{ opacity: 0, x: 25 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="flex flex-col gap-1.5 w-full"
    >
      {/* 1. STASIS BUTTON: EXIT / RETURN */}
      <button
        onClick={() => handleItemClick(onExitToMenu, true)}
        className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-red-500/40 bg-red-950/40 text-red-300 hover:text-white hover:bg-red-900/60 transition-all duration-200 transform hover:scale-102 cursor-pointer group text-left relative shadow-md active:scale-95"
        title="Exit to Main Menu"
      >
        <LogOut className="w-5 h-5 text-red-400 shrink-0 rotate-180 transition-transform group-hover:scale-110" />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className="font-display font-black italic uppercase text-xs text-red-300">Exit / Return</div>
          <div className="text-[9px] text-red-400/80 font-mono">Back to Main Menu</div>
        </div>
      </button>

      {/* 2. STASIS BUTTON: SWAP MODE (COMPETITIVE <-> CASUALS) */}
      <button
        onClick={() => handleItemClick(() => {
          if (setSingleplayerModeSide) {
            const nextSide = singleplayerModeSide === 'competitive' ? 'casual' : 'competitive';
            setSingleplayerModeSide(nextSide);
          }
        })}
        className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-200 transform hover:scale-102 cursor-pointer group text-left relative shadow-md active:scale-95 ${
          singleplayerModeSide === 'competitive'
            ? 'border-amber-500/50 bg-gradient-to-r from-amber-950/50 to-zinc-900 text-amber-300 hover:bg-amber-900/50'
            : 'border-cyan-500/50 bg-gradient-to-r from-cyan-950/50 to-zinc-900 text-cyan-300 hover:bg-cyan-900/50'
        }`}
        title={`Swap Mode: Currently in ${singleplayerModeSide === 'competitive' ? 'Competitive' : 'Casuals'}`}
      >
        <RefreshCw className={`w-5 h-5 shrink-0 transition-transform group-hover:rotate-180 duration-500 ${
          singleplayerModeSide === 'competitive' ? 'text-amber-400' : 'text-cyan-400'
        }`} />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className="font-display font-black italic uppercase text-xs flex items-center gap-1.5">
            <span>Swap: {singleplayerModeSide === 'competitive' ? 'COMPETITIVE' : 'CASUALS'}</span>
          </div>
          <div className="text-[9px] font-mono opacity-80">
            {singleplayerModeSide === 'competitive' ? 'Tap for Casuals' : 'Tap for Competitive'}
          </div>
        </div>
      </button>

      {/* 3. QUESTS BUTTON (DIRECTLY UNDER SWAP) */}
      <button
        onClick={() => handleItemClick(onOpenQuests)}
        className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/40 to-zinc-900 text-cyan-300 hover:text-white hover:bg-cyan-900/50 transition-all duration-200 transform hover:scale-102 cursor-pointer group text-left relative shadow-md active:scale-95"
        title="Single Player Quests & Bounties"
      >
        <Target className="w-5 h-5 text-cyan-400 shrink-0 transition-transform group-hover:scale-110" />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className="font-display font-black italic uppercase text-xs text-cyan-300 flex items-center justify-between">
            <span>Quests</span>
            <span className="text-[8px] font-mono bg-cyan-950 px-1 rounded border border-cyan-500/40 font-bold">
              BOUNTIES
            </span>
          </div>
          <div className="text-[9px] text-cyan-400/80 font-mono">Combat Trials & Milestones</div>
        </div>
      </button>

      {/* SEPARATOR BAR UNDER STASIS BUTTONS */}
      <div className="w-full my-1 pt-1 border-t border-zinc-800 flex items-center justify-between px-1">
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap text-[8.5px] font-mono font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1 ${
          isHovered || isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          {singleplayerModeSide === 'competitive' ? (
            <>
              <Trophy className="w-2.5 h-2.5 text-amber-500" />
              <span>REALM: COMPETITIVE</span>
            </>
          ) : (
            <>
              <Swords className="w-2.5 h-2.5 text-cyan-500" />
              <span>REALM: CASUALS</span>
            </>
          )}
        </div>
      </div>

      {/* INTEGRATED SINGLEPLAYER MODES (UNDERNEATH SEPARATOR) */}
      <div className="flex flex-col gap-1 w-full max-h-[44vh] overflow-y-auto custom-scrollbar pr-0.5">
        {singleplayerModeSide === 'competitive' ? (
          <>
            {/* 1. RANKED 1v1 ELO */}
            <button
              onClick={() => handleItemClick(() => {
                if (setSingleplayerCompSubTab) setSingleplayerCompSubTab('ranked_ai');
              })}
              className={`w-full flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all duration-150 cursor-pointer group relative ${
                singleplayerCompSubTab === 'ranked_ai'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                  : 'bg-zinc-950/60 border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
              title="Ranked 1v1 Elo"
            >
              {singleplayerCompSubTab === 'ranked_ai' && (
                <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-amber-400 rounded-r shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
              )}
              <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                singleplayerCompSubTab === 'ranked_ai' ? 'bg-amber-400 text-black' : 'bg-zinc-850 text-zinc-400'
              }`}>
                <Trophy className="w-3 h-3" />
              </div>
              <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
                isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
              }`}>
                <div className="font-display font-black uppercase text-[11px] truncate leading-tight">
                  Ranked 1v1 Elo
                </div>
                <div className="text-[8px] font-mono text-zinc-500 truncate leading-none mt-0.5">
                  Elo Rating Stakes
                </div>
              </div>
            </button>

            {/* 2. TOURNAMENT BRACKET */}
            <button
              onClick={() => handleItemClick(() => {
                if (setSingleplayerCompSubTab) setSingleplayerCompSubTab('tournament');
              })}
              className={`w-full flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all duration-150 cursor-pointer group relative ${
                singleplayerCompSubTab === 'tournament'
                  ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300 font-bold shadow-[0_0_12px_rgba(234,179,8,0.25)]'
                  : 'bg-zinc-950/60 border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
              title="Tournament Bracket"
            >
              {singleplayerCompSubTab === 'tournament' && (
                <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-yellow-400 rounded-r shadow-[0_0_6px_rgba(234,179,8,0.8)]" />
              )}
              <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                singleplayerCompSubTab === 'tournament' ? 'bg-yellow-400 text-black' : 'bg-zinc-850 text-zinc-400'
              }`}>
                <Award className="w-3 h-3" />
              </div>
              <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
                isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
              }`}>
                <div className="font-display font-black uppercase text-[11px] truncate leading-tight">
                  Tournament
                </div>
                <div className="text-[8px] font-mono text-zinc-500 truncate leading-none mt-0.5">
                  8-Fighter Bracket
                </div>
              </div>
            </button>

            {/* 3. BOSS RAIDS */}
            <button
              onClick={() => handleItemClick(() => {
                if (setSingleplayerCompSubTab) setSingleplayerCompSubTab('boss_raids');
              })}
              className={`w-full flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all duration-150 cursor-pointer group relative ${
                singleplayerCompSubTab === 'boss_raids'
                  ? 'bg-red-500/20 border-red-500 text-red-300 font-bold shadow-[0_0_12px_rgba(239,68,68,0.25)]'
                  : 'bg-zinc-950/60 border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
              title="Boss Raids"
            >
              {singleplayerCompSubTab === 'boss_raids' && (
                <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-red-500 rounded-r shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
              )}
              <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                singleplayerCompSubTab === 'boss_raids' ? 'bg-red-500 text-black' : 'bg-zinc-850 text-zinc-400'
              }`}>
                <Skull className="w-3 h-3" />
              </div>
              <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
                isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
              }`}>
                <div className="font-display font-black uppercase text-[11px] truncate leading-tight">
                  Boss Raids
                </div>
                <div className="text-[8px] font-mono text-zinc-500 truncate leading-none mt-0.5">
                  Challenger Boss Trials
                </div>
              </div>
            </button>
          </>
        ) : (
          <>
            {/* 1. CASUAL 1v1 SPARRING */}
            <button
              onClick={() => handleItemClick(() => {
                if (setSingleplayerCasualSubTab) setSingleplayerCasualSubTab('casual_1v1');
              })}
              className={`w-full flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all duration-150 cursor-pointer group relative ${
                singleplayerCasualSubTab === 'casual_1v1'
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                  : 'bg-zinc-950/60 border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
              title="Casual 1v1 Sparring"
            >
              {singleplayerCasualSubTab === 'casual_1v1' && (
                <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-cyan-400 rounded-r shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
              )}
              <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                singleplayerCasualSubTab === 'casual_1v1' ? 'bg-cyan-400 text-black' : 'bg-zinc-850 text-zinc-400'
              }`}>
                <Swords className="w-3 h-3" />
              </div>
              <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
                isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
              }`}>
                <div className="font-display font-black uppercase text-[11px] truncate leading-tight">
                  Casual 1v1
                </div>
                <div className="text-[8px] font-mono text-zinc-500 truncate leading-none mt-0.5">
                  Sparring Arena
                </div>
              </div>
            </button>

            {/* 2. AI vs AI SPECTATOR */}
            <button
              onClick={() => handleItemClick(() => {
                if (setSingleplayerCasualSubTab) setSingleplayerCasualSubTab('ai_vs_ai');
              })}
              className={`w-full flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all duration-150 cursor-pointer group relative ${
                singleplayerCasualSubTab === 'ai_vs_ai'
                  ? 'bg-purple-500/20 border-purple-500 text-purple-300 font-bold shadow-[0_0_12px_rgba(168,85,247,0.25)]'
                  : 'bg-zinc-950/60 border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
              title="AI vs AI Spectator"
            >
              {singleplayerCasualSubTab === 'ai_vs_ai' && (
                <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-purple-400 rounded-r shadow-[0_0_6px_rgba(168,85,247,0.8)]" />
              )}
              <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                singleplayerCasualSubTab === 'ai_vs_ai' ? 'bg-purple-400 text-black' : 'bg-zinc-850 text-zinc-400'
              }`}>
                <Radio className="w-3 h-3" />
              </div>
              <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
                isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
              }`}>
                <div className="font-display font-black uppercase text-[11px] truncate leading-tight">
                  AI vs AI Sim
                </div>
                <div className="text-[8px] font-mono text-zinc-500 truncate leading-none mt-0.5">
                  Spectator Chamber
                </div>
              </div>
            </button>

            {/* 3. UPCOMING ARENAS */}
            <button
              onClick={() => handleItemClick(() => {
                if (setSingleplayerCasualSubTab) setSingleplayerCasualSubTab('upcoming');
              })}
              className={`w-full flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all duration-150 cursor-pointer group relative ${
                singleplayerCasualSubTab === 'upcoming'
                  ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 font-bold shadow-[0_0_12px_rgba(99,102,241,0.25)]'
                  : 'bg-zinc-950/60 border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
              title="Upcoming Arenas"
            >
              {singleplayerCasualSubTab === 'upcoming' && (
                <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-indigo-400 rounded-r shadow-[0_0_6px_rgba(99,102,241,0.8)]" />
              )}
              <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                singleplayerCasualSubTab === 'upcoming' ? 'bg-indigo-400 text-black' : 'bg-zinc-850 text-zinc-400'
              }`}>
                <Sparkles className="w-3 h-3" />
              </div>
              <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
                isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
              }`}>
                <div className="font-display font-black uppercase text-[11px] truncate leading-tight">
                  Special Arena
                </div>
                <div className="text-[8px] font-mono text-zinc-500 truncate leading-none mt-0.5">
                  Custom Stipulations
                </div>
              </div>
            </button>
          </>
        )}
      </div>

      {/* 4. HIDE RAIL ACTION BUTTON */}
      {onToggleHide && (
        <div className="pt-1 mt-1 border-t border-zinc-800/80 w-full">
          <button
            onClick={() => handleItemClick(onToggleHide)}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-850 text-zinc-400 hover:text-white transition-all cursor-pointer text-left group"
            title="Hide Navigation Rail (Unfold with arrow tab)"
          >
            <ChevronLeft className="w-4 h-4 text-zinc-400 group-hover:-translate-x-0.5 transition-transform shrink-0" />
            <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
              isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
            }`}>
              <div className="font-display font-bold uppercase text-[10px] text-zinc-300">
                Hide Rail
              </div>
              <div className="text-[7.5px] text-zinc-500 font-mono">
                Click arrow tab to unfold
              </div>
            </div>
          </button>
        </div>
      )}
    </motion.div>
  );
};
