import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogOut, SlidersHorizontal, ShieldAlert, Swords, 
  Search, ChevronDown 
} from 'lucide-react';
import { FIGHTING_STYLES } from '../../data/styles';
import { STYLE_CLASSIFICATIONS } from '../../data/styleClassification';
import { CODEX_SORT_CATEGORIES, CodexSortMode } from '../LeftNavRail';

interface CodexNavRailProps {
  isHovered: boolean;
  isMobileOpen: boolean;
  codexSortMode: CodexSortMode;
  handleCycleSortMode: () => void;
  codexSelectedCategory: string;
  setCodexSelectedCategory?: (cat: string) => void;
  codexSelectedStyleId?: string;
  setCodexSelectedStyleId?: (id: string) => void;
  onCloseModal: () => void;
  onOpenGameRules?: () => void;
  handleItemClick: (action: () => void, shouldCloseNav?: boolean) => void;
  equippedStyleId?: string;
}

export const CodexNavRail: React.FC<CodexNavRailProps> = ({
  isHovered,
  isMobileOpen,
  codexSortMode,
  handleCycleSortMode,
  codexSelectedCategory,
  setCodexSelectedCategory,
  codexSelectedStyleId,
  setCodexSelectedStyleId,
  onCloseModal,
  onOpenGameRules,
  handleItemClick,
  equippedStyleId,
}) => {
  const [codexExpandedCategory, setCodexExpandedCategory] = useState<string | null>(null);
  const [codexRailSearch, setCodexRailSearch] = useState('');

  // Auto-fold unfolded categories when rail enters Minimized Mode
  React.useEffect(() => {
    if (!isHovered && !isMobileOpen) {
      setCodexExpandedCategory(null);
      setCodexRailSearch('');
    }
  }, [isHovered, isMobileOpen]);

  // Handle Codex search input with auto-hunting category unfold
  const handleCodexRailSearch = (query: string) => {
    setCodexRailSearch(query);
    if (!query.trim()) return;

    const q = query.trim().toLowerCase();
    const matchedStyle = FIGHTING_STYLES.find(st => 
      st.name.toLowerCase().includes(q) || 
      st.id.toLowerCase().includes(q) ||
      st.description.toLowerCase().includes(q)
    );

    if (matchedStyle) {
      if (setCodexSelectedStyleId) setCodexSelectedStyleId(matchedStyle.id);
      const info = STYLE_CLASSIFICATIONS[matchedStyle.id];
      if (info) {
        let targetCat = 'all';
        if (codexSortMode === 'class') targetCat = info.class;
        else if (codexSortMode === 'origin') targetCat = info.type;
        else if (codexSortMode === 'specialty') targetCat = info.specialty;
        else if (codexSortMode === 'tier') targetCat = info.classCategory;

        setCodexExpandedCategory(targetCat);
        if (setCodexSelectedCategory) setCodexSelectedCategory(targetCat);
      }
    }
  };

  // Helper to get styles for a specific category
  const getStylesForCategory = (catId: string) => {
    if (catId === 'all') return FIGHTING_STYLES;
    return FIGHTING_STYLES.filter(st => {
      const info = STYLE_CLASSIFICATIONS[st.id];
      if (!info) return false;
      if (codexSortMode === 'class') return info.class === catId;
      if (codexSortMode === 'origin') return info.type === catId;
      if (codexSortMode === 'specialty') return info.specialty === catId;
      if (codexSortMode === 'tier') return info.classCategory === catId;
      return false;
    });
  };

  return (
    <motion.div
      key="codex_mode_nav"
      initial={{ opacity: 0, x: 25 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="flex flex-col gap-1.5 w-full"
    >
      {/* 3 STASIS BUTTONS */}
      {/* 1. EXIT / RETURN */}
      <button
        onClick={() => handleItemClick(onCloseModal, true)}
        className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-red-500/40 bg-red-950/40 text-red-300 hover:text-white hover:bg-red-900/60 transition-all duration-200 transform hover:scale-102 cursor-pointer group text-left relative shadow-md active:scale-95"
        title="Exit Codex"
      >
        <LogOut className="w-5 h-5 text-red-400 shrink-0 rotate-180 transition-transform group-hover:scale-110" />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className="font-display font-black italic uppercase text-xs text-red-300">Exit / Return</div>
          <div className="text-[9px] text-red-400/80 font-mono">Close Codex</div>
        </div>
      </button>

      {/* 2. ROLL SORT CRITERIA */}
      <button
        onClick={() => handleItemClick(handleCycleSortMode)}
        className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-amber-500/40 bg-amber-950/40 text-amber-300 hover:text-white hover:bg-amber-900/60 transition-all duration-200 transform hover:scale-102 cursor-pointer group text-left relative shadow-md active:scale-95"
        title={`Current Sort: ${codexSortMode.toUpperCase()} (Click to Cycle)`}
      >
        <SlidersHorizontal className="w-5 h-5 text-amber-400 shrink-0 transition-transform group-hover:rotate-90 duration-300" />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className="font-display font-black italic uppercase text-xs text-amber-300 flex items-center gap-1.5">
            <span>Roll Sort: {codexSortMode.toUpperCase()}</span>
          </div>
          <div className="text-[9px] text-amber-400/80 font-mono">Cycle Sorting View</div>
        </div>
      </button>

      {/* 3. GAME RULES (UNIVERSAL HANDBOOK) */}
      <button
        onClick={() => handleItemClick(() => {
          if (onOpenGameRules) onOpenGameRules();
        })}
        className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-200 transform hover:scale-102 cursor-pointer group text-left relative shadow-md active:scale-95 ${
          codexSelectedCategory === 'universal_rules'
            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold shadow-[0_0_15px_rgba(6,182,212,0.3)]'
            : 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300 hover:text-white hover:bg-cyan-900/60'
        }`}
        title="Universal Combat Rules & Frame Data Handbook"
      >
        <ShieldAlert className="w-5 h-5 text-cyan-400 shrink-0 transition-transform group-hover:scale-110" />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className="font-display font-black italic uppercase text-xs text-cyan-300 flex items-center justify-between">
            <span>Game Rules</span>
            <span className="text-[8px] font-mono bg-cyan-950 px-1 rounded border border-cyan-500/40">
              SPECS
            </span>
          </div>
          <div className="text-[9px] text-cyan-400/80 font-mono">Frames & Mechanics</div>
        </div>
      </button>

      {/* SEPARATOR BAR UNDER STASIS BUTTONS */}
      <div className="w-full my-1 pt-1 border-t border-zinc-800 flex items-center justify-between px-1">
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap text-[8.5px] font-mono font-black uppercase tracking-wider text-zinc-500 ${
          isHovered || isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          CRITERIA: {codexSortMode.toUpperCase()}
        </div>
      </div>

      {/* STYLES ROSTER LIST WITH ACCORDION FOLD/UNFOLD */}
      <div className="flex flex-col gap-1 w-full max-h-[44vh] overflow-y-auto custom-scrollbar pr-0.5">
        {/* ALL STYLES BUTTON */}
        <button
          onClick={() => handleItemClick(() => {
            if (setCodexSelectedCategory) setCodexSelectedCategory('all');
            setCodexExpandedCategory(null);
          })}
          className={`w-full flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all duration-150 cursor-pointer group relative ${
            codexSelectedCategory === 'all'
              ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-[0_0_12px_rgba(245,158,11,0.25)]'
              : 'bg-zinc-950/60 border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
          title="All Fighting Styles"
        >
          {codexSelectedCategory === 'all' && (
            <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-amber-400 rounded-r shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
          )}

          <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
            codexSelectedCategory === 'all' ? 'bg-amber-400 text-black' : 'bg-zinc-850 text-zinc-400'
          }`}>
            <Swords className="w-3 h-3" />
          </div>

          <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
            isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
          }`}>
            <div className="font-display font-black uppercase text-[11px] truncate leading-tight">
              All Styles
            </div>
            <div className="text-[8px] font-mono text-zinc-500 truncate leading-none mt-0.5">
              {FIGHTING_STYLES.length} Martial Disciplines
            </div>
          </div>
        </button>

        {/* SEARCH STYLE INPUT UNDER ALL STYLES (AUTO-HUNTS SUBTAB) */}
        <div className={`transition-all duration-300 overflow-hidden ${
          isHovered || isMobileOpen ? 'opacity-100 max-h-12 py-1' : 'opacity-0 max-h-0 pointer-events-none'
        }`}>
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={codexRailSearch}
              onChange={(e) => handleCodexRailSearch(e.target.value)}
              placeholder="Search style (auto-unfolds)..."
              className="w-full pl-6 pr-5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition"
            />
            {codexRailSearch && (
              <button
                onClick={() => handleCodexRailSearch('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-[10px]"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* CATEGORIES WITH FOLD/UNFOLD STYLE LINEUP */}
        {(CODEX_SORT_CATEGORIES[codexSortMode] || CODEX_SORT_CATEGORIES.class)
          .filter(cat => cat.id !== 'all')
          .map((cat) => {
            const isCatSelected = codexSelectedCategory === cat.id;
            const isUnfolded = codexExpandedCategory === cat.id;
            const stylesInCat = getStylesForCategory(cat.id);
            const Icon = cat.icon || Swords;

            return (
              <div key={cat.id} className="flex flex-col gap-0.5">
                {/* CATEGORY ACCORDION HEADER BUTTON */}
                <button
                  onClick={() => handleItemClick(() => {
                    setCodexExpandedCategory(prev => prev === cat.id ? null : cat.id);
                    if (setCodexSelectedCategory) setCodexSelectedCategory(cat.id);
                  })}
                  className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all duration-150 cursor-pointer group relative ${
                    isCatSelected
                      ? `${cat.bg} ${cat.activeBorder} ${cat.color} font-bold shadow-[0_0_12px_rgba(245,158,11,0.25)]`
                      : 'bg-zinc-950/70 border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                  title={`${cat.label} (${stylesInCat.length} styles)`}
                >
                  {isCatSelected && (
                    <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-amber-400 rounded-r shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                  )}

                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                      isCatSelected ? 'bg-amber-400 text-black' : 'bg-zinc-850 text-zinc-400'
                    }`}>
                      <Icon className="w-3 h-3" />
                    </div>

                    <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
                      isHovered || isMobileOpen ? 'opacity-100 max-w-[140px]' : 'opacity-0 max-w-0 pointer-events-none'
                    }`}>
                      <div className="font-display font-black uppercase text-[11px] truncate leading-tight flex items-center gap-1.5">
                        <span>{cat.label}</span>
                        <span className="text-[8px] font-mono opacity-60">({stylesInCat.length})</span>
                      </div>
                      <div className="text-[8px] font-mono text-zinc-500 truncate leading-none mt-0.5">
                        {cat.subLabel}
                      </div>
                    </div>
                  </div>

                  <div className={`transition-all duration-300 shrink-0 ${
                    isHovered || isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 text-zinc-500 group-hover:text-zinc-300 ${
                      isUnfolded ? 'rotate-180 text-amber-400' : ''
                    }`} />
                  </div>
                </button>

                {/* UNFOLDED STYLES LINEUP ACCORDION */}
                <AnimatePresence>
                  {isUnfolded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="overflow-hidden pl-3.5 pr-0.5 flex flex-col gap-1 border-l border-zinc-800/80 ml-2.5 my-1"
                    >
                      {stylesInCat.map(st => {
                        const isStyleActive = codexSelectedStyleId === st.id;
                        const isEquipped = equippedStyleId === st.id;

                        return (
                          <button
                            key={st.id}
                            onClick={() => handleItemClick(() => {
                              if (setCodexSelectedStyleId) setCodexSelectedStyleId(st.id);
                              if (setCodexSelectedCategory) setCodexSelectedCategory(cat.id);
                            })}
                            className={`w-full flex items-center gap-2 p-1.5 rounded-lg border text-left transition-all cursor-pointer group ${
                              isStyleActive
                                ? 'bg-zinc-900 border-amber-400 text-white shadow-sm'
                                : 'bg-zinc-950/80 border-zinc-850/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                            }`}
                          >
                            <div 
                              className="w-4 h-4 rounded-md flex items-center justify-center font-display font-black text-[9px] text-white shrink-0 shadow-inner"
                              style={{ backgroundColor: st.color }}
                            >
                              {st.name.charAt(0)}
                            </div>

                            <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap min-w-0 flex-1 ${
                              isHovered || isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                            }`}>
                              <div className="font-display font-bold text-[10px] uppercase truncate flex items-center justify-between gap-1">
                                <span className="truncate">{st.name}</span>
                                {isEquipped && (
                                  <span className="text-[7px] font-mono px-1 rounded bg-amber-500/30 text-amber-300 border border-amber-500/40">
                                    EQ
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
      </div>
    </motion.div>
  );
};
