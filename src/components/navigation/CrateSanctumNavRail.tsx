import React from 'react';
import { motion } from 'motion/react';
import { 
  LogOut, Key, ShoppingBag, Dna, Box, Sparkles
} from 'lucide-react';

export type CrateSanctumTab = 'crates' | 'shop' | 'genetics';

interface CrateSanctumNavRailProps {
  isHovered: boolean;
  isMobileOpen: boolean;
  activeSubTab: CrateSanctumTab;
  setActiveSubTab: (tab: CrateSanctumTab) => void;
  onExitToMenu: () => void;
  handleItemClick: (action: () => void, shouldCloseNav?: boolean) => void;
}

export const CrateSanctumNavRail: React.FC<CrateSanctumNavRailProps> = ({
  isHovered,
  isMobileOpen,
  activeSubTab,
  setActiveSubTab,
  onExitToMenu,
  handleItemClick,
}) => {
  const isExpanded = isHovered || isMobileOpen;

  return (
    <motion.div
      key="crate_sanctum_nav"
      initial={{ opacity: 0, x: 25 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="flex flex-col gap-1.5 w-full"
    >
      {/* 1. STASIS BUTTON: ONLY 1 STASIS BEING EXIT */}
      <button
        onClick={() => handleItemClick(onExitToMenu, true)}
        className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-red-500/40 bg-red-950/40 text-red-300 hover:text-white hover:bg-red-900/60 transition-all duration-200 transform hover:scale-102 cursor-pointer group text-left relative shadow-md active:scale-95"
        title="Exit Crate Sanctum & Return to Main Menu"
      >
        <LogOut className="w-5 h-5 text-red-400 shrink-0 rotate-180 transition-transform group-hover:scale-110" />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isExpanded ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className="font-display font-black italic uppercase text-xs text-red-300">Exit / Return</div>
          <div className="text-[9px] text-red-400/80 font-mono">Back to Main Menu</div>
        </div>
      </button>

      {/* 2. SEPARATOR BAR UNDER STASIS BUTTON */}
      <div className="w-full my-1 pt-1 border-t border-zinc-800 flex items-center justify-between px-1">
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap text-[8.5px] font-mono font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1 ${
          isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          <Box className="w-2.5 h-2.5 text-amber-500" />
          <span>CRATE SANCTUM</span>
        </div>
      </div>

      {/* 3. CORE TABS: ONLY FIGHTER CRATES, KEY STORE, AND GENETICS LAB */}
      <div className="flex flex-col gap-1 w-full">
        {/* TAB 1: FIGHTER CRATES */}
        <button
          onClick={() => handleItemClick(() => setActiveSubTab('crates'), false)}
          className={`w-full flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all duration-150 cursor-pointer group relative ${
            activeSubTab === 'crates'
              ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-[0_0_12px_rgba(245,158,11,0.25)]'
              : 'bg-zinc-950/60 border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
          title="Fighter Crates (Unbox Styles)"
        >
          {activeSubTab === 'crates' && (
            <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-amber-400 rounded-r shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
          )}
          <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
            activeSubTab === 'crates' ? 'bg-amber-400 text-black' : 'bg-zinc-850 text-amber-400'
          }`}>
            <Key className="w-3 h-3" />
          </div>
          <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
            isExpanded ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
          }`}>
            <div className="font-display font-black uppercase text-[11px] truncate leading-tight">
              Fighter Crates
            </div>
            <div className="text-[8px] font-mono text-zinc-500 truncate leading-none mt-0.5">
              Unbox Styles & Odds
            </div>
          </div>
        </button>

        {/* TAB 2: KEY STORE */}
        <button
          onClick={() => handleItemClick(() => setActiveSubTab('shop'), false)}
          className={`w-full flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all duration-150 cursor-pointer group relative ${
            activeSubTab === 'shop'
              ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-[0_0_12px_rgba(245,158,11,0.25)]'
              : 'bg-zinc-950/60 border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
          title="Key Store (Buy & Convert Keys)"
        >
          {activeSubTab === 'shop' && (
            <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-amber-400 rounded-r shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
          )}
          <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
            activeSubTab === 'shop' ? 'bg-amber-400 text-black' : 'bg-zinc-850 text-amber-400'
          }`}>
            <ShoppingBag className="w-3 h-3" />
          </div>
          <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
            isExpanded ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
          }`}>
            <div className="font-display font-black uppercase text-[11px] truncate leading-tight">
              Key Store
            </div>
            <div className="text-[8px] font-mono text-zinc-500 truncate leading-none mt-0.5">
              Buy & Convert Keys
            </div>
          </div>
        </button>

        {/* TAB 3: GENETICS LAB */}
        <button
          onClick={() => handleItemClick(() => setActiveSubTab('genetics'), false)}
          className={`w-full flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all duration-150 cursor-pointer group relative ${
            activeSubTab === 'genetics'
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow-[0_0_12px_rgba(16,185,129,0.25)]'
              : 'bg-zinc-950/60 border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
          title="Genetics Lab (Height & Stat Calibration)"
        >
          {activeSubTab === 'genetics' && (
            <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-emerald-400 rounded-r shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
          )}
          <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
            activeSubTab === 'genetics' ? 'bg-emerald-400 text-black' : 'bg-zinc-850 text-emerald-400'
          }`}>
            <Dna className="w-3 h-3 animate-pulse" />
          </div>
          <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
            isExpanded ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
          }`}>
            <div className="font-display font-black uppercase text-[11px] truncate leading-tight">
              Genetics Lab
            </div>
            <div className="text-[8px] font-mono text-zinc-500 truncate leading-none mt-0.5">
              Height & Modifiers
            </div>
          </div>
        </button>
      </div>
    </motion.div>
  );
};
