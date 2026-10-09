import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, CheckCheck, Bot, Trophy, Target, Award } from 'lucide-react';

interface SingleplayerQuestsNavRailProps {
  isHovered: boolean;
  isMobileOpen: boolean;
  mobileTab: 'quests' | 'milestones';
  setMobileTab: (tab: 'quests' | 'milestones') => void;
  onReturnToSingleplayer: () => void;
  onClaimAll: () => void;
  claimableCount: number;
  handleItemClick: (action: () => void, shouldCloseNav?: boolean) => void;
}

export const SingleplayerQuestsNavRail: React.FC<SingleplayerQuestsNavRailProps> = ({
  isHovered,
  isMobileOpen,
  mobileTab,
  setMobileTab,
  onReturnToSingleplayer,
  onClaimAll,
  claimableCount,
  handleItemClick,
}) => {
  return (
    <motion.div
      key="singleplayer_quests_mode_nav"
      initial={{ opacity: 0, x: 25 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="flex flex-col gap-1.5 w-full"
    >
      {/* 1. UNIQUE STASIS BUTTON: RETURN TO SINGLEPLAYER */}
      <button
        onClick={() => handleItemClick(onReturnToSingleplayer, true)}
        className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/50 to-zinc-900 text-cyan-300 hover:text-white hover:bg-cyan-900/60 transition-all duration-200 transform hover:scale-102 cursor-pointer group text-left relative shadow-md active:scale-95"
        title="Return to Singleplayer Hub"
      >
        <ArrowLeft className="w-5 h-5 text-cyan-400 shrink-0 transition-transform group-hover:-translate-x-1" />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className="font-display font-black italic uppercase text-xs text-cyan-300">Return</div>
          <div className="text-[9px] text-cyan-400/80 font-mono">Back to Singleplayer</div>
        </div>
      </button>

      {/* 2. UNIQUE STASIS BUTTON (BELOW RETURN): CLAIM ALL */}
      <button
        onClick={() => handleItemClick(onClaimAll)}
        disabled={claimableCount === 0}
        className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-200 transform hover:scale-102 cursor-pointer group text-left relative shadow-md active:scale-95 ${
          claimableCount > 0
            ? 'border-emerald-500/60 bg-gradient-to-r from-emerald-950/60 to-zinc-900 text-emerald-300 hover:bg-emerald-900/60 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse'
            : 'border-zinc-800 bg-zinc-950/50 text-zinc-500 cursor-not-allowed opacity-60'
        }`}
        title={claimableCount > 0 ? `Claim all ${claimableCount} rewards` : 'No rewards to claim'}
      >
        <CheckCheck className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
          claimableCount > 0 ? 'text-emerald-400' : 'text-zinc-600'
        }`} />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className="font-display font-black italic uppercase text-xs flex items-center justify-between gap-1.5">
            <span className={claimableCount > 0 ? 'text-emerald-300 font-bold' : 'text-zinc-500'}>
              Claim All
            </span>
            {claimableCount > 0 && (
              <span className="text-[8px] font-mono bg-emerald-500 text-black px-1.5 py-0.2 rounded-full font-black">
                {claimableCount}
              </span>
            )}
          </div>
          <div className="text-[9px] font-mono opacity-80 truncate">
            {claimableCount > 0 ? `${claimableCount} Ready to Claim` : 'Zero Bounties Ready'}
          </div>
        </div>
      </button>

      {/* SEPARATOR BAR */}
      <div className="w-full my-1 pt-1 border-t border-zinc-800 flex items-center justify-between px-1">
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap text-[8.5px] font-mono font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1 ${
          isHovered || isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          <Target className="w-2.5 h-2.5 text-cyan-500" />
          <span>VIEW SELECTION</span>
        </div>
      </div>

      {/* MOBILE QUESTS / MILESTONES NAV BUTTONS */}
      <div className="flex flex-col gap-1 w-full">
        {/* BUTTON 1: QUESTS (DAILY COMBAT QUESTS) */}
        <button
          onClick={() => handleItemClick(() => setMobileTab('quests'))}
          className={`w-full flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all duration-150 cursor-pointer group relative ${
            mobileTab === 'quests'
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_12px_rgba(6,182,212,0.3)]'
              : 'bg-zinc-950/60 border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
          title="Daily AI Combat Quests"
        >
          {mobileTab === 'quests' && (
            <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-cyan-400 rounded-r shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
          )}
          <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
            mobileTab === 'quests' ? 'bg-cyan-400 text-black' : 'bg-zinc-850 text-zinc-400'
          }`}>
            <Bot className="w-3 h-3" />
          </div>
          <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
            isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
          }`}>
            <div className="font-display font-black uppercase text-[11px] truncate leading-tight">
              Quests
            </div>
            <div className="text-[8px] font-mono text-zinc-500 truncate leading-none mt-0.5">
              Daily AI Combat Quests
            </div>
          </div>
        </button>

        {/* BUTTON 2: MILESTONES (CAREER MILESTONES) */}
        <button
          onClick={() => handleItemClick(() => setMobileTab('milestones'))}
          className={`w-full flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all duration-150 cursor-pointer group relative ${
            mobileTab === 'milestones'
              ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold shadow-[0_0_12px_rgba(245,158,11,0.3)]'
              : 'bg-zinc-950/60 border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
          title="Solo AI Career Milestones"
        >
          {mobileTab === 'milestones' && (
            <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-amber-400 rounded-r shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
          )}
          <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
            mobileTab === 'milestones' ? 'bg-amber-400 text-black' : 'bg-zinc-850 text-zinc-400'
          }`}>
            <Trophy className="w-3 h-3" />
          </div>
          <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
            isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
          }`}>
            <div className="font-display font-black uppercase text-[11px] truncate leading-tight">
              Milestones
            </div>
            <div className="text-[8px] font-mono text-zinc-500 truncate leading-none mt-0.5">
              Solo Career Milestones
            </div>
          </div>
        </button>
      </div>
    </motion.div>
  );
};
