import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogOut, Sparkles, History, ChevronDown, Rocket, 
  Layers, Terminal, CheckCircle2, Bookmark, Flame
} from 'lucide-react';

export type GameInfoTab = 'latest' | 'older_1_7_5' | 'older_1_7_0' | 'older_1_6_0' | 'older_archive';

interface GameInfoNavRailProps {
  isHovered: boolean;
  isMobileOpen: boolean;
  activeTab: GameInfoTab;
  setActiveTab: (tab: GameInfoTab) => void;
  onExit: () => void;
  handleItemClick: (action: () => void, shouldCloseNav?: boolean) => void;
}

export const GameInfoNavRail: React.FC<GameInfoNavRailProps> = ({
  isHovered,
  isMobileOpen,
  activeTab,
  setActiveTab,
  onExit,
  handleItemClick,
}) => {
  const [isOlderVersionsOpen, setIsOlderVersionsOpen] = useState(false);
  const isExpanded = isHovered || isMobileOpen;

  // Auto-fold unfolded older versions accordion when rail enters Minimized Mode
  useEffect(() => {
    if (!isHovered && !isMobileOpen) {
      setIsOlderVersionsOpen(false);
    }
  }, [isHovered, isMobileOpen]);

  const olderVersionList: { id: GameInfoTab; label: string; date: string; tag: string }[] = [
    { id: 'older_1_7_5', label: 'v1.7.5 Part 2', date: 'Combat Refactor', tag: 'Legacy' },
    { id: 'older_1_7_0', label: 'v1.7.0 Part 1', date: 'Singleplayer Hub', tag: 'Legacy' },
    { id: 'older_1_6_0', label: 'v1.6.0 Netcode', date: 'Lockstep Rollback', tag: 'Archive' },
    { id: 'older_archive', label: 'v1.5.0 Roster', date: 'Martial Styles Beta', tag: 'Archive' },
  ];

  return (
    <motion.div
      key="game_info_mode_nav"
      initial={{ opacity: 0, x: 25 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="flex flex-col gap-1.5 w-full"
    >
      {/* 1. STASIS BUTTON: ONLY 1 STASIS BEING EXIT (Folds nav on click) */}
      <button
        onClick={() => handleItemClick(onExit, true)}
        className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-red-500/40 bg-red-950/40 text-red-300 hover:text-white hover:bg-red-900/60 transition-all duration-200 transform hover:scale-102 cursor-pointer group text-left relative shadow-md active:scale-95"
        title="Exit Game Info & Return to Main Menu"
      >
        <LogOut className="w-5 h-5 text-red-400 shrink-0 rotate-180 transition-transform group-hover:scale-110" />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isExpanded ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className="font-display font-black italic uppercase text-xs text-red-300">Exit / Return</div>
          <div className="text-[9px] text-red-400/80 font-mono">Back to Main Menu</div>
        </div>
      </button>

      {/* 2. SEPARATOR BAR BELOW EXIT */}
      <div className="w-full my-1 pt-1 border-t border-zinc-800 flex items-center justify-between px-1">
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap text-[8.5px] font-mono font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1 ${
          isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          <Rocket className="w-2.5 h-2.5 text-amber-500" />
          <span>VERSION RELEASES</span>
        </div>
      </div>

      {/* 3. TAB 1: LATEST UPDATE (Always at top, does NOT fold nav on click) */}
      <button
        onClick={() => handleItemClick(() => setActiveTab('latest'), false)}
        className={`w-full flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all duration-150 cursor-pointer group relative ${
          activeTab === 'latest'
            ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold shadow-[0_0_15px_rgba(245,158,11,0.25)]'
            : 'bg-zinc-950/60 border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-900'
        }`}
        title="Latest Update (v1.7.6 Part 3: Navigation & Matrix Overhaul)"
      >
        {activeTab === 'latest' && (
          <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-amber-400 rounded-r shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
        )}
        <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
          activeTab === 'latest' ? 'bg-amber-400 text-black' : 'bg-zinc-850 text-amber-400'
        }`}>
          <Sparkles className="w-3 h-3" />
        </div>
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isExpanded ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className="font-display font-black uppercase text-[11px] truncate leading-tight flex items-center gap-1.5">
            <span>Latest Update</span>
            <span className="text-[7.5px] font-mono font-bold px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              PART 3
            </span>
          </div>
          <div className="text-[8px] font-mono text-zinc-400 truncate leading-none mt-0.5">
            v1.7.6 Final Matrix
          </div>
        </div>
      </button>

      {/* 4. BOTTOM TAB: FOLDABLE ACCORDION FOR OLDER VERSIONS (Kept empty/clean) */}
      <div className="flex flex-col gap-1 w-full mt-0.5">
        <button
          onClick={() => {
            if (isExpanded) {
              setIsOlderVersionsOpen(prev => !prev);
            } else {
              handleItemClick(() => {
                setIsOlderVersionsOpen(true);
              }, false);
            }
          }}
          className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all duration-150 cursor-pointer group relative ${
            activeTab !== 'latest' || isOlderVersionsOpen
              ? 'bg-zinc-900 border-zinc-700 text-zinc-200 font-bold'
              : 'bg-zinc-950/60 border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
          title="Older Version History (Foldable Archive)"
        >
          <div className="flex items-center gap-2.5">
            <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
              isOlderVersionsOpen ? 'bg-zinc-700 text-cyan-300' : 'bg-zinc-850 text-zinc-400'
            }`}>
              <History className="w-3 h-3" />
            </div>
            <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
              isExpanded ? 'opacity-100 max-w-[140px]' : 'opacity-0 max-w-0 pointer-events-none'
            }`}>
              <div className="font-display font-black uppercase text-[11px] truncate leading-tight flex items-center gap-1.5">
                <span>Older Versions</span>
              </div>
              <div className="text-[8px] font-mono text-zinc-500 truncate leading-none mt-0.5">
                Version Archive
              </div>
            </div>
          </div>

          <div className={`transition-all duration-300 shrink-0 ${
            isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 text-zinc-500 group-hover:text-zinc-300 ${
              isOlderVersionsOpen ? 'rotate-180 text-cyan-400' : ''
            }`} />
          </div>
        </button>

        {/* UNFOLDED OLDER VERSIONS LIST */}
        <AnimatePresence>
          {isOlderVersionsOpen && isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="overflow-hidden pl-3 pr-0.5 flex flex-col gap-1 border-l border-zinc-800/80 ml-2.5 my-1"
            >
              {olderVersionList.map(ver => {
                const isVerActive = activeTab === ver.id;
                return (
                  <button
                    key={ver.id}
                    onClick={() => handleItemClick(() => setActiveTab(ver.id), false)}
                    className={`w-full flex items-center justify-between p-1.5 rounded-lg border text-left text-[10px] font-mono transition cursor-pointer ${
                      isVerActive
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                        : 'bg-zinc-950/60 border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex flex-col truncate pr-1">
                      <span className="font-bold text-[10px] truncate">{ver.label}</span>
                      <span className="text-[7.5px] text-zinc-500 truncate">{ver.date}</span>
                    </div>
                    <span className="text-[7px] font-mono font-bold px-1 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 shrink-0">
                      {ver.tag}
                    </span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
