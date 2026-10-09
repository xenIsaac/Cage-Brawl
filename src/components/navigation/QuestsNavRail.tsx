import React from 'react';
import { motion } from 'motion/react';
import { LogOut, Award, Sparkles } from 'lucide-react';

interface QuestsNavRailProps {
  isHovered: boolean;
  isMobileOpen: boolean;
  achievementsSubTab: 'achievements' | 'style_mastery';
  setAchievementsSubTab?: (tab: 'achievements' | 'style_mastery') => void;
  onExitToMenu: () => void;
  handleItemClick: (action: () => void, shouldCloseNav?: boolean) => void;
}

export const QuestsNavRail: React.FC<QuestsNavRailProps> = ({
  isHovered,
  isMobileOpen,
  achievementsSubTab,
  setAchievementsSubTab,
  onExitToMenu,
  handleItemClick,
}) => {
  return (
    <motion.div
      key="quests_mode_nav"
      initial={{ opacity: 0, x: 25 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="flex flex-col gap-1.5 w-full"
    >
      {/* ITEM 1: EXIT / RETURN TO MENU */}
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
          <div className="text-[9px] text-red-400/80 font-mono">Main Menu</div>
        </div>
      </button>

      {/* ITEM 2: ACHIEVEMENTS */}
      <button
        onClick={() => handleItemClick(() => {
          if (setAchievementsSubTab) setAchievementsSubTab('achievements');
        })}
        className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all duration-200 transform hover:scale-102 cursor-pointer group relative ${
          achievementsSubTab === 'achievements'
            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-[0_0_15px_rgba(245,158,11,0.3)]'
            : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
        }`}
        title="Achievements & Trophies"
      >
        {achievementsSubTab === 'achievements' && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-amber-400 rounded-r shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
        )}
        <Award className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${achievementsSubTab === 'achievements' ? 'text-amber-400' : 'text-zinc-400'}`} />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className="font-display font-black italic uppercase text-xs text-white">Achievements</div>
          <div className="text-[9px] text-zinc-400 font-mono">Trophies & Vault</div>
        </div>
      </button>

      {/* ITEM 3: STYLE MASTERY */}
      <button
        onClick={() => handleItemClick(() => {
          if (setAchievementsSubTab) setAchievementsSubTab('style_mastery');
        })}
        className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all duration-200 transform hover:scale-102 cursor-pointer group relative ${
          achievementsSubTab === 'style_mastery'
            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-[0_0_15px_rgba(245,158,11,0.3)]'
            : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
        }`}
        title="Style Mastery Badges"
      >
        {achievementsSubTab === 'style_mastery' && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-amber-400 rounded-r shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
        )}
        <Sparkles className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${achievementsSubTab === 'style_mastery' ? 'text-amber-400' : 'text-zinc-400'}`} />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className="font-display font-black italic uppercase text-xs text-white">Style Mastery</div>
          <div className="text-[9px] text-zinc-400 font-mono">Mastery Badges</div>
        </div>
      </button>
    </motion.div>
  );
};
