import React from 'react';
import { motion } from 'motion/react';
import { LogOut, Globe, ShieldCheck, Palette, Crown } from 'lucide-react';

export type FighterProfileTab = 'public' | 'private' | 'customization' | 'titles';

interface FighterProfileNavRailProps {
  isHovered: boolean;
  isMobileOpen: boolean;
  activeTab: FighterProfileTab;
  setActiveTab: (tab: FighterProfileTab) => void;
  onExit: () => void;
  handleItemClick: (action: () => void, shouldCloseNav?: boolean) => void;
}

export const FighterProfileNavRail: React.FC<FighterProfileNavRailProps> = ({
  isHovered,
  isMobileOpen,
  activeTab,
  setActiveTab,
  onExit,
  handleItemClick,
}) => {
  return (
    <motion.div
      key="fighter_profile_nav"
      initial={{ opacity: 0, x: 25 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="flex flex-col gap-1.5 w-full"
    >
      {/* 1. EXIT / RETURN BUTTON (AS ALWAYS) */}
      <button
        onClick={() => handleItemClick(onExit, true)}
        className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-red-500/40 bg-red-950/40 text-red-300 hover:text-white hover:bg-red-900/60 transition-all duration-200 transform hover:scale-102 cursor-pointer group text-left relative shadow-md active:scale-95"
        title="Exit Fighter Profile"
      >
        <LogOut className="w-5 h-5 text-red-400 shrink-0 rotate-180 transition-transform group-hover:scale-110" />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className="font-display font-black italic uppercase text-xs text-red-300">Exit / Return</div>
          <div className="text-[9px] text-red-400/80 font-mono">Main Menu</div>
        </div>
      </button>

      {/* 2. PUBLIC PROFILE TAB */}
      <button
        onClick={() => handleItemClick(() => setActiveTab('public'))}
        className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all duration-200 transform hover:scale-102 cursor-pointer group relative ${
          activeTab === 'public'
            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold shadow-[0_0_15px_rgba(6,182,212,0.3)]'
            : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
        }`}
        title="Public Profile & Online Card"
      >
        {activeTab === 'public' && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-cyan-400 rounded-r shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
        )}
        <Globe className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${activeTab === 'public' ? 'text-cyan-400' : 'text-zinc-400'}`} />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className="font-display font-black italic uppercase text-xs text-white">Public Profile</div>
          <div className="text-[9px] text-zinc-400 font-mono">Combat Tag & Card</div>
        </div>
      </button>

      {/* 3. PRIVATE & SECURITY TAB */}
      <button
        onClick={() => handleItemClick(() => setActiveTab('private'))}
        className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all duration-200 transform hover:scale-102 cursor-pointer group relative ${
          activeTab === 'private'
            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)]'
            : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
        }`}
        title="Private & Security"
      >
        {activeTab === 'private' && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-emerald-400 rounded-r shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
        )}
        <ShieldCheck className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${activeTab === 'private' ? 'text-emerald-400' : 'text-zinc-400'}`} />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className="font-display font-black italic uppercase text-xs text-white">Private & Data</div>
          <div className="text-[9px] text-zinc-400 font-mono">Link & Data Purge</div>
        </div>
      </button>

      {/* 4. CUSTOMIZATION TAB */}
      <button
        onClick={() => handleItemClick(() => setActiveTab('customization'))}
        className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all duration-200 transform hover:scale-102 cursor-pointer group relative ${
          activeTab === 'customization'
            ? 'bg-purple-500/20 border-purple-500 text-purple-300 font-bold shadow-[0_0_15px_rgba(168,85,247,0.3)]'
            : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
        }`}
        title="Customization (Avatar, Frame, Tag)"
      >
        {activeTab === 'customization' && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-purple-400 rounded-r shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
        )}
        <Palette className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${activeTab === 'customization' ? 'text-purple-400' : 'text-zinc-400'}`} />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className="font-display font-black italic uppercase text-xs text-white">Customization</div>
          <div className="text-[9px] text-zinc-400 font-mono">Avatar & Tag Name</div>
        </div>
      </button>

      {/* 5. TITLES TAB */}
      <button
        onClick={() => handleItemClick(() => setActiveTab('titles'))}
        className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all duration-200 transform hover:scale-102 cursor-pointer group relative ${
          activeTab === 'titles'
            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-[0_0_15px_rgba(245,158,11,0.3)]'
            : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
        }`}
        title="Titles & Badges Vault"
      >
        {activeTab === 'titles' && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-amber-400 rounded-r shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
        )}
        <Crown className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${activeTab === 'titles' ? 'text-amber-400' : 'text-zinc-400'}`} />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className="font-display font-black italic uppercase text-xs text-white">Titles Vault</div>
          <div className="text-[9px] text-zinc-400 font-mono">Equip & Color Glow</div>
        </div>
      </button>
    </motion.div>
  );
};
