import React from 'react';
import { motion } from 'motion/react';
import { 
  LogOut, Search, X, Swords, Volume2, Keyboard, 
  Monitor, Eye, Zap, Shield, Sparkles, Filter 
} from 'lucide-react';

export type SettingsCategoryTab = 'all' | 'combat' | 'audio' | 'controls' | 'graphics' | 'hud' | 'performance' | 'system';

interface SettingsNavRailProps {
  isHovered: boolean;
  isMobileOpen: boolean;
  activeCategory: SettingsCategoryTab;
  setActiveCategory: (cat: SettingsCategoryTab) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onExit: () => void;
  handleItemClick: (action: () => void, shouldCloseNav?: boolean) => void;
}

export const SettingsNavRail: React.FC<SettingsNavRailProps> = ({
  isHovered,
  isMobileOpen,
  activeCategory,
  setActiveCategory,
  searchQuery,
  setSearchQuery,
  onExit,
  handleItemClick,
}) => {
  const isExpanded = isHovered || isMobileOpen;

  const categories: { id: SettingsCategoryTab; label: string; sub: string; icon: any; color: string; bg: string }[] = [
    { id: 'combat', label: 'Combat & Mechanics', sub: 'Hitstop, Screen Shake & Assist', icon: Swords, color: 'text-red-400', bg: 'bg-red-500/20' },
    { id: 'audio', label: 'Audio & Sound', sub: 'Master, SFX & Audio Preview', icon: Volume2, color: 'text-amber-400', bg: 'bg-amber-500/20' },
    { id: 'controls', label: 'Controls & Keys', sub: 'PC Keybinds & Mobile HUD', icon: Keyboard, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
    { id: 'graphics', label: 'Graphics & Display', sub: 'Particles, Bloom & Resolution', icon: Monitor, color: 'text-purple-400', bg: 'bg-purple-500/20' },
    { id: 'hud', label: 'Camera & HUD', sub: 'FOV, Damage Numbers & Layout', icon: Eye, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    { id: 'performance', label: 'Performance', sub: 'Target FPS & Battery Optimization', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
    { id: 'system', label: 'System & Data', sub: 'Save Files & Progress Reset', icon: Shield, color: 'text-rose-400', bg: 'bg-rose-500/20' },
  ];

  const relatedSuggestions = [
    { label: 'Volume', tag: 'volume', cat: 'audio' as SettingsCategoryTab },
    { label: 'Shake', tag: 'shake', cat: 'combat' as SettingsCategoryTab },
    { label: 'FOV', tag: 'fov', cat: 'hud' as SettingsCategoryTab },
    { label: 'FPS', tag: 'fps', cat: 'performance' as SettingsCategoryTab },
    { label: 'Touch', tag: 'touch', cat: 'controls' as SettingsCategoryTab },
    { label: 'Damage', tag: 'damage', cat: 'combat' as SettingsCategoryTab },
    { label: 'Hitstop', tag: 'hitstop', cat: 'combat' as SettingsCategoryTab },
    { label: 'Ping', tag: 'ping', cat: 'performance' as SettingsCategoryTab },
  ];

  return (
    <motion.div
      key="settings_mode_nav"
      initial={{ opacity: 0, x: 25 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="flex flex-col gap-1.5 w-full"
    >
      {/* 1. STASIS BUTTON: EXIT / RETURN (Folds nav on click) */}
      <button
        onClick={() => handleItemClick(onExit, true)}
        className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-red-500/40 bg-red-950/40 text-red-300 hover:text-white hover:bg-red-900/60 transition-all duration-200 transform hover:scale-102 cursor-pointer group text-left relative shadow-md active:scale-95"
        title="Exit Settings & Return to Main Menu"
      >
        <LogOut className="w-5 h-5 text-red-400 shrink-0 rotate-180 transition-transform group-hover:scale-110" />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isExpanded ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className="font-display font-black italic uppercase text-xs text-red-300">Exit / Return</div>
          <div className="text-[9px] text-red-400/80 font-mono">Close Settings</div>
        </div>
      </button>

      {/* 2. STASIS SEARCH BUTTON & RELATED TO SYSTEM */}
      <div className="w-full p-2 rounded-xl border border-cyan-500/40 bg-zinc-900/90 text-cyan-300 flex flex-col gap-1.5 shadow-md">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className={`transition-all duration-300 overflow-hidden flex-1 ${
            isExpanded ? 'opacity-100' : 'opacity-0 max-w-0 pointer-events-none'
          }`}>
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search settings..."
                className="w-full bg-zinc-950/80 border border-zinc-700/80 text-white placeholder-zinc-500 text-[11px] font-mono px-2 py-1 rounded-lg focus:outline-none focus:border-cyan-400 pr-5"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1 text-zinc-400 hover:text-white p-0.5 cursor-pointer"
                  title="Clear Search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RELATED TO TAGS IN EXPANDED VIEW (Does NOT fold nav) */}
        {isExpanded && (
          <div className="pt-1 border-t border-zinc-800 flex flex-col gap-1">
            <span className="text-[7.5px] font-mono uppercase font-black tracking-wider text-cyan-400 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-amber-400" />
              <span>Related To Search:</span>
            </span>
            <div className="flex flex-wrap gap-1">
              {relatedSuggestions.map((item) => (
                <button
                  key={item.tag}
                  onClick={() => {
                    handleItemClick(() => {
                      setSearchQuery(item.tag);
                      setActiveCategory('all');
                    }, false);
                  }}
                  className={`text-[8px] font-mono px-1.5 py-0.5 rounded transition cursor-pointer border ${
                    searchQuery.toLowerCase() === item.tag.toLowerCase()
                      ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400 font-bold'
                      : 'bg-zinc-950/80 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  #{item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SEPARATOR BAR */}
      <div className="w-full my-1 pt-1 border-t border-zinc-800 flex items-center justify-between px-1">
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap text-[8.5px] font-mono font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1 ${
          isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          <Filter className="w-2.5 h-2.5 text-amber-500" />
          <span>CATEGORIES</span>
        </div>
      </div>

      {/* CATEGORY TABS LIST (Does NOT fold nav) */}
      <div className="flex flex-col gap-1 w-full max-h-[46vh] overflow-y-auto custom-scrollbar pr-0.5">
        {/* ALL SETTINGS / SEARCH RESULTS TAB */}
        <button
          onClick={() => handleItemClick(() => setActiveCategory('all'), false)}
          className={`w-full flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all duration-150 cursor-pointer group relative ${
            activeCategory === 'all'
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_12px_rgba(6,182,212,0.3)]'
              : 'bg-zinc-950/60 border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
          title="All Settings & Search View"
        >
          {activeCategory === 'all' && (
            <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-cyan-400 rounded-r shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
          )}
          <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
            activeCategory === 'all' ? 'bg-cyan-400 text-black' : 'bg-zinc-850 text-zinc-400'
          }`}>
            <Sparkles className="w-3 h-3" />
          </div>
          <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
            isExpanded ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
          }`}>
            <div className="font-display font-black uppercase text-[11px] truncate leading-tight">
              All Categories
            </div>
            <div className="text-[8px] font-mono text-zinc-500 truncate leading-none mt-0.5">
              Complete Overview
            </div>
          </div>
        </button>

        {/* INDIVIDUAL CATEGORIES */}
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => handleItemClick(() => {
                setActiveCategory(cat.id);
                setSearchQuery('');
              }, false)}
              className={`w-full flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all duration-150 cursor-pointer group relative ${
                isActive
                  ? 'bg-zinc-900 border-amber-500/80 text-white font-bold shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                  : 'bg-zinc-950/60 border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
              title={cat.label}
            >
              {isActive && (
                <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-amber-400 rounded-r shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
              )}
              <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                isActive ? `${cat.bg} ${cat.color}` : 'bg-zinc-850 text-zinc-400'
              }`}>
                <Icon className="w-3 h-3" />
              </div>
              <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
                isExpanded ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
              }`}>
                <div className="font-display font-black uppercase text-[11px] truncate leading-tight">
                  {cat.label}
                </div>
                <div className="text-[8px] font-mono text-zinc-500 truncate leading-none mt-0.5">
                  {cat.sub}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};
