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
      {/* 1. EXIT / RETURN BUTTON (PERSONA 5 STYLING) */}
      <button
        onClick={() => handleItemClick(onExit, true)}
        className="w-full flex items-center gap-3 p-2.5 -skew-x-12 border-2 border-black bg-red-600 text-black hover:bg-white transition-all duration-200 transform hover:scale-102 cursor-pointer group text-left relative shadow-[3px_3px_0px_#ffffff] hover:shadow-[3px_3px_0px_#ef4444] active:scale-95"
        title="Exit Fighter Profile"
      >
        <LogOut className="w-5 h-5 text-black shrink-0 rotate-180 transition-transform group-hover:scale-110" />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className="font-display font-black italic uppercase text-xs text-black">Exit // Return</div>
          <div className="text-[9px] text-zinc-900 font-mono font-bold">Main Menu</div>
        </div>
      </button>

      {/* 2. PUBLIC PROFILE TAB */}
      <button
        onClick={() => handleItemClick(() => setActiveTab('public'))}
        className={`w-full flex items-center gap-3 p-2.5 -skew-x-6 border-2 text-left transition-all duration-200 transform hover:scale-102 cursor-pointer group relative ${
          activeTab === 'public'
            ? 'bg-cyan-400 border-white text-black font-black shadow-[3px_3px_0px_#000000]'
            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
        }`}
        title="Public Profile & Online Card"
      >
        <Globe className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${activeTab === 'public' ? 'text-black' : 'text-zinc-400'}`} />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className={`font-display font-black italic uppercase text-xs ${activeTab === 'public' ? 'text-black' : 'text-white'}`}>Public Profile</div>
          <div className={`text-[9px] font-mono ${activeTab === 'public' ? 'text-zinc-900 font-bold' : 'text-zinc-400'}`}>Combat Tag & Card</div>
        </div>
      </button>

      {/* 3. PRIVATE & SECURITY TAB */}
      <button
        onClick={() => handleItemClick(() => setActiveTab('private'))}
        className={`w-full flex items-center gap-3 p-2.5 -skew-x-6 border-2 text-left transition-all duration-200 transform hover:scale-102 cursor-pointer group relative ${
          activeTab === 'private'
            ? 'bg-emerald-400 border-white text-black font-black shadow-[3px_3px_0px_#000000]'
            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
        }`}
        title="Private & Security"
      >
        <ShieldCheck className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${activeTab === 'private' ? 'text-black' : 'text-zinc-400'}`} />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className={`font-display font-black italic uppercase text-xs ${activeTab === 'private' ? 'text-black' : 'text-white'}`}>Private & Data</div>
          <div className={`text-[9px] font-mono ${activeTab === 'private' ? 'text-zinc-900 font-bold' : 'text-zinc-400'}`}>Link & Data Purge</div>
        </div>
      </button>

      {/* 4. CUSTOMIZATION TAB */}
      <button
        onClick={() => handleItemClick(() => setActiveTab('customization'))}
        className={`w-full flex items-center gap-3 p-2.5 -skew-x-6 border-2 text-left transition-all duration-200 transform hover:scale-102 cursor-pointer group relative ${
          activeTab === 'customization'
            ? 'bg-purple-500 border-white text-black font-black shadow-[3px_3px_0px_#000000]'
            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
        }`}
        title="Customization (Avatar, Frame, Tag)"
      >
        <Palette className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${activeTab === 'customization' ? 'text-black' : 'text-zinc-400'}`} />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className={`font-display font-black italic uppercase text-xs ${activeTab === 'customization' ? 'text-black' : 'text-white'}`}>Customization</div>
          <div className={`text-[9px] font-mono ${activeTab === 'customization' ? 'text-zinc-900 font-bold' : 'text-zinc-400'}`}>Avatar & Tag Name</div>
        </div>
      </button>

      {/* 5. TITLES TAB */}
      <button
        onClick={() => handleItemClick(() => setActiveTab('titles'))}
        className={`w-full flex items-center gap-3 p-2.5 -skew-x-6 border-2 text-left transition-all duration-200 transform hover:scale-102 cursor-pointer group relative ${
          activeTab === 'titles'
            ? 'bg-amber-400 border-white text-black font-black shadow-[3px_3px_0px_#000000]'
            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
        }`}
        title="Titles & Badges Vault"
      >
        <Crown className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${activeTab === 'titles' ? 'text-black' : 'text-zinc-400'}`} />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className={`font-display font-black italic uppercase text-xs ${activeTab === 'titles' ? 'text-black' : 'text-white'}`}>Titles Vault</div>
          <div className={`text-[9px] font-mono ${activeTab === 'titles' ? 'text-zinc-900 font-bold' : 'text-zinc-400'}`}>Equip & Color Glow</div>
        </div>
      </button>
    </motion.div>
  );
};
