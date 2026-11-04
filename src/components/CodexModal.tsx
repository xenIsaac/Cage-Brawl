import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Eye, EyeOff, Swords, Zap, 
  Sparkles, Layers, Cpu, Compass, Award, Activity, 
  ShieldAlert, Shield, CheckCircle2, ChevronRight, X, Search,
  SlidersHorizontal, Flame, Target, User, ArrowLeft
} from 'lucide-react';
import { FIGHTING_STYLES } from '../data/styles';
import { FightingStyle } from '../types';
import { STYLE_CLASSIFICATIONS } from '../data/styleClassification';
import { soundManager } from './SoundManager';
import { isMobileDevice } from '../utils/deviceDetection';
import { CODEX_SORT_CATEGORIES, CodexSortMode } from './LeftNavRail';
import { CodexUniversalRulesView } from './codex/CodexUniversalRulesView';
import { CodexMoveSpecsView } from './codex/CodexMoveSpecsView';
import { CodexPassivesView } from './codex/CodexPassivesView';
import { CodexStatsMatrix } from './codex/CodexStatsMatrix';
import { CodexTacticsView } from './codex/CodexTacticsView';
import { CodexIdentificationView } from './codex/CodexIdentificationView';

type CodexSection = 'overview' | 'techniques' | 'passives' | 'stats' | 'tactics';

interface CodexModalProps {
  isOpen: boolean;
  onClose: () => void;
  equippedStyleId: string;
  isNavHidden?: boolean;
  isNavExpanded?: boolean;
  isInsideArena?: boolean;
  selectedCategory?: string;
  setSelectedCategory?: (cat: string) => void;
  selectedStyleId?: string;
  onSelectStyle?: (id: string) => void;
  codexSortMode?: CodexSortMode;
  setCodexSortMode?: (mode: CodexSortMode) => void;
  onOpenGameRules?: () => void;
}

export const CodexModal: React.FC<CodexModalProps> = ({
  isOpen,
  onClose,
  equippedStyleId,
  isNavHidden = false,
  isNavExpanded = false,
  isInsideArena = false,
  selectedCategory: externalSelectedCategory,
  setSelectedCategory: externalSetSelectedCategory,
  selectedStyleId: externalSelectedStyleId,
  onSelectStyle: externalOnSelectStyle,
  codexSortMode: externalSortMode,
  setCodexSortMode: externalSetSortMode,
  onOpenGameRules,
}) => {
  // Internal fallback states for full self-contained operation
  const [internalSelectedStyleId, setInternalSelectedStyleId] = useState<string>(equippedStyleId || 'basic');
  const [internalSelectedCategory, setInternalSelectedCategory] = useState<string>('all');
  const [internalSortMode, setInternalSortMode] = useState<CodexSortMode>('class');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const selectedStyleId = externalSelectedStyleId ?? internalSelectedStyleId;
  const onSelectStyle = externalOnSelectStyle ?? setInternalSelectedStyleId;
  const selectedCategory = externalSelectedCategory ?? internalSelectedCategory;
  const setSelectedCategory = externalSetSelectedCategory ?? setInternalSelectedCategory;
  const sortMode = externalSortMode ?? internalSortMode;
  const setSortMode = externalSetSortMode ?? setInternalSortMode;

  const [activeSection, setActiveSection] = useState<CodexSection>('overview');
  const [isDojoTransparent, setIsDojoTransparent] = useState<boolean>(isInsideArena);
  const [isLandscape, setIsLandscape] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth > window.innerHeight;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Section refs for smooth in-page scrolling
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const overviewRef = useRef<HTMLDivElement>(null);
  const techniquesRef = useRef<HTMLDivElement>(null);
  const passivesRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const tacticsRef = useRef<HTMLDivElement>(null);

  // Cycle sorting modes
  const handleCycleSortMode = () => {
    soundManager.playRollTick?.();
    const modes: CodexSortMode[] = ['class', 'origin', 'specialty', 'tier'];
    const currentIndex = modes.indexOf(sortMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setSortMode(nextMode);
    setSelectedCategory('all');
  };

  // Sync equipped style on open if empty
  useEffect(() => {
    if (equippedStyleId && !selectedStyleId) {
      onSelectStyle(equippedStyleId);
    }
  }, [equippedStyleId, selectedStyleId, onSelectStyle]);

  const isUniversalSelected = selectedCategory === 'universal_rules' || selectedStyleId === 'universal_rules';
  const currentStyle = FIGHTING_STYLES.find(s => s.id === selectedStyleId) || FIGHTING_STYLES[0];
  const isEquipped = !isUniversalSelected && equippedStyleId === currentStyle?.id;
  const classification = currentStyle ? STYLE_CLASSIFICATIONS[currentStyle.id] : null;

  // Active scroll spy listener
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const containerTop = scrollContainerRef.current.getBoundingClientRect().top;

    const sections: { id: CodexSection; ref: React.RefObject<HTMLDivElement | null> }[] = [
      { id: 'overview', ref: overviewRef },
      { id: 'techniques', ref: techniquesRef },
      { id: 'passives', ref: passivesRef },
      { id: 'stats', ref: statsRef },
      { id: 'tactics', ref: tacticsRef },
    ];

    let current: CodexSection = 'overview';
    for (const sec of sections) {
      if (sec.ref.current) {
        const rect = sec.ref.current.getBoundingClientRect();
        if (rect.top - containerTop <= 160) {
          current = sec.id;
        }
      }
    }
    setActiveSection(current);
  }, []);

  const scrollToSection = (sectionId: CodexSection, ref: React.RefObject<HTMLDivElement | null>) => {
    soundManager.playRollTick?.();
    setActiveSection(sectionId);
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Filtered styles list based on category & search query
  const filteredStyles = useMemo(() => {
    return FIGHTING_STYLES.filter(st => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || 
        st.name.toLowerCase().includes(q) || 
        st.id.toLowerCase().includes(q) ||
        st.description.toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (selectedCategory === 'all' || !selectedCategory) return true;

      const info = STYLE_CLASSIFICATIONS[st.id];
      if (!info) return true;

      if (sortMode === 'class') return info.class === selectedCategory;
      if (sortMode === 'origin') return info.type === selectedCategory;
      if (sortMode === 'specialty') return info.specialty === selectedCategory;
      if (sortMode === 'tier') return info.classCategory === selectedCategory;
      return true;
    });
  }, [searchQuery, selectedCategory, sortMode]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        soundManager.playRollTick?.();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Style dynamic accents for glowing overlay
  const primaryColor = isUniversalSelected ? '#06b6d4' : (currentStyle.color || '#f59e0b');
  const secondaryColor = isUniversalSelected ? '#0284c7' : (currentStyle.secondaryColor || primaryColor);

  const subtabs: { id: CodexSection; label: string; icon: any; ref: React.RefObject<HTMLDivElement | null> }[] = [
    { id: 'overview', label: 'Overview', icon: BookOpen, ref: overviewRef },
    { id: 'techniques', label: 'Moves & Hitboxes', icon: Swords, ref: techniquesRef },
    { id: 'passives', label: 'Passives', icon: Zap, ref: passivesRef },
    { id: 'stats', label: 'Frame Stats', icon: Activity, ref: statsRef },
    { id: 'tactics', label: 'Combos', icon: Compass, ref: tacticsRef },
  ];

  return (
    <div className="fixed inset-0 z-[120] bg-zinc-950 text-white flex flex-col md:flex-row select-none overflow-hidden transition-all duration-300">
      
      {/* BACKGROUND HALFTONE SLICES & PERSONA WATERMARKS */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
        <div 
          className="absolute -top-32 -left-20 w-[130%] h-56 bg-red-600 -rotate-6 transform -skew-x-12 opacity-80 border-b-4 border-black pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #000000 1.5px, transparent 1.5px)',
            backgroundSize: '12px 12px'
          }}
        />
        <div className="absolute top-24 -right-16 w-80 h-8 bg-yellow-400 rotate-12 transform -skew-x-12 border-2 border-black flex items-center justify-center font-display font-black text-black tracking-widest text-[10px] shadow-[3px_3px_0px_#000000] pointer-events-none">
          ✦ MARTIAL CODEX // PERSONA SPECS ✦
        </div>
      </div>

      {/* ============================================================== */}
      {/* LEFT SIDE: EMBEDDED PERSONA NAVIGATION BLADE                   */}
      {/* ============================================================== */}
      <aside className="w-full md:w-72 lg:w-80 bg-black/95 border-b-4 md:border-b-0 md:border-r-4 border-red-600 p-3 sm:p-4 flex flex-col justify-between shrink-0 z-30 relative shadow-[6px_0px_20px_rgba(239,68,68,0.25)]">
        
        {/* TOP BRANDING & SEARCH */}
        <div className="flex flex-col gap-3 min-h-0 flex-1">
          <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 -skew-x-12 bg-red-600 text-black border-2 border-white flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000000] font-black">
                <BookOpen className="w-5 h-5 text-black" />
              </div>
              <div className="truncate">
                <h1 className="text-sm font-display font-black italic uppercase text-white tracking-wider truncate">
                  MARTIAL CODEX
                </h1>
                <p className="text-[9px] text-amber-400 font-mono font-bold truncate">
                  STYLE ARCHIVE & SPECS
                </p>
              </div>
            </div>

            {/* Quick Exit on Mobile */}
            <button
              onClick={() => {
                soundManager.playRollTick?.();
                onClose();
              }}
              className="md:hidden flex items-center justify-center w-8 h-8 -skew-x-12 bg-red-600 hover:bg-white text-black border-2 border-white shadow-[2px_2px_0px_#000000] font-black"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* SEARCH BAR */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search style or perk..."
              className="w-full bg-zinc-900/90 border border-zinc-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
            />
          </div>

          {/* ACTION BUTTONS: SORT MODE & UNIVERSAL RULES */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCycleSortMode}
              className="flex items-center justify-between px-2.5 py-1.5 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/50 -skew-x-12 text-amber-300 font-display font-black text-[10px] uppercase shadow-[2px_2px_0px_#000000] transition-all cursor-pointer"
              title="Cycle sorting mode"
            >
              <span className="truncate">SORT: {sortMode.toUpperCase()}</span>
              <SlidersHorizontal className="w-3 h-3 text-amber-400 shrink-0 ml-1" />
            </button>

            <button
              onClick={() => {
                soundManager.playRollTick?.();
                setSelectedCategory('universal_rules');
                onSelectStyle('universal_rules');
                if (onOpenGameRules) onOpenGameRules();
              }}
              className={`flex items-center justify-between px-2.5 py-1.5 -skew-x-12 font-display font-black text-[10px] uppercase shadow-[2px_2px_0px_#000000] transition-all cursor-pointer ${
                isUniversalSelected
                  ? 'bg-cyan-500 text-black border border-white'
                  : 'bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/50 text-cyan-300'
              }`}
            >
              <span className="truncate">GAME RULES</span>
              <ShieldAlert className="w-3 h-3 shrink-0 ml-1" />
            </button>
          </div>

          {/* CATEGORY SELECTOR BLADES */}
          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar py-1">
            {CODEX_SORT_CATEGORIES[sortMode]?.map((cat) => {
              const isSelected = !isUniversalSelected && selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    soundManager.playRollTick?.();
                    setSelectedCategory(cat.id);
                  }}
                  className={`px-2.5 py-1 -skew-x-12 text-[9.5px] font-mono font-bold uppercase whitespace-nowrap transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-red-600 text-black border-white shadow-[2px_2px_0px_#000000]'
                      : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* SCROLLABLE STYLES LIST */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {filteredStyles.map((st, idx) => {
              const isSelected = !isUniversalSelected && selectedStyleId === st.id;
              const isStyleEquipped = equippedStyleId === st.id;
              const indexStr = (idx + 1).toString().padStart(2, '0');
              const styleColor = st.color || '#f59e0b';

              return (
                <button
                  key={st.id}
                  onClick={() => {
                    soundManager.playRollTick?.();
                    setSelectedCategory(selectedCategory === 'universal_rules' ? 'all' : selectedCategory);
                    onSelectStyle(st.id);
                  }}
                  className={`w-full p-2.5 -skew-x-12 border-2 transition-all duration-150 cursor-pointer text-left flex items-center justify-between gap-2 group relative ${
                    isSelected
                      ? 'bg-zinc-100 text-black border-white shadow-[4px_4px_0px_#ef4444]'
                      : 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-850'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span 
                      className="text-[9px] font-mono font-black px-1.5 py-0.5 bg-black text-white -skew-x-6 shrink-0"
                      style={{ color: isSelected ? styleColor : '#a1a1aa' }}
                    >
                      {indexStr}
                    </span>
                    <div className="truncate">
                      <div className="text-xs font-display font-black italic uppercase tracking-wider truncate flex items-center gap-1">
                        <span>{st.name}</span>
                        {isStyleEquipped && (
                          <span className="text-[7px] font-mono px-1 bg-amber-500 text-black font-bold uppercase rounded-xs">
                            EQ
                          </span>
                        )}
                      </div>
                      <div className={`text-[8.5px] font-mono truncate ${isSelected ? 'text-zinc-700' : 'text-zinc-500'}`}>
                        {st.passiveName || st.strikeName || 'Martial Discipline'}
                      </div>
                    </div>
                  </div>

                  <div 
                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/40 shadow-xs"
                    style={{ backgroundColor: styleColor }}
                  />
                </button>
              );
            })}

            {filteredStyles.length === 0 && (
              <div className="p-4 text-center text-xs font-mono text-zinc-500 italic">
                No styles match "{searchQuery}"
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM EXIT BUTTON */}
        <div className="pt-3 border-t-2 border-zinc-800 mt-2 shrink-0">
          <button
            onClick={() => {
              soundManager.playRollTick?.();
              onClose();
            }}
            className="w-full py-2 bg-red-600 hover:bg-white text-black font-display font-black italic uppercase tracking-wider text-xs -skew-x-12 shadow-[3px_3px_0px_#ffffff] hover:shadow-[3px_3px_0px_#ef4444] transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 group"
          >
            <ArrowLeft className="w-4 h-4 text-black group-hover:-translate-x-1 transition-transform" />
            <span>RETURN TO MENU // ESC</span>
          </button>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* RIGHT SIDE: MAIN CODEX SHOWCASE PANE                           */}
      {/* ============================================================== */}
      <main className="flex-1 bg-zinc-950/90 relative z-10 flex flex-col min-h-0 overflow-hidden">
        
        {/* TOP COMMAND HEADER WITH SUBTABS */}
        <header className="px-3 sm:px-6 py-2.5 sm:py-3 border-b-2 border-zinc-800 bg-zinc-950/95 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2 shrink-0 z-20">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div 
                className="w-8 h-8 sm:w-9 sm:h-9 -skew-x-12 rounded-xs flex items-center justify-center font-display font-black text-sm sm:text-base text-black shadow-[2px_2px_0px_#ffffff] border border-white shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                {isUniversalSelected ? '📜' : currentStyle.name.charAt(0)}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-sm sm:text-base font-display font-black italic uppercase tracking-wider text-white truncate">
                    {isUniversalSelected ? 'COMBAT RULES HANDBOOK' : currentStyle.name}
                  </h1>
                  {isEquipped && !isUniversalSelected && (
                    <span className="text-[8px] font-mono px-2 py-0.5 bg-amber-500 text-black font-black uppercase tracking-wider -skew-x-12 shadow-[2px_2px_0px_#000000] shrink-0">
                      EQUIPPED STYLE
                    </span>
                  )}
                </div>

                <p className="text-[9.5px] text-zinc-400 font-mono hidden xl:block truncate mt-0.5">
                  {isUniversalSelected 
                    ? 'Universal combat physics, hitstun frames, parry timing & frame advantages'
                    : classification 
                      ? `${classification.class} Class • ${classification.classCategory} Weight • ${classification.specialty} Specialty • ${classification.originDescription}`
                      : currentStyle.description}
                </p>
              </div>
            </div>

            {/* DOJO BACKDROP TRANSPARENCY TOGGLE (IF INSIDE ARENA) */}
            {isInsideArena && (
              <button
                onClick={() => {
                  setIsDojoTransparent(!isDojoTransparent);
                  soundManager.playRollTick?.();
                }}
                className={`px-2.5 py-1 -skew-x-12 text-[9px] sm:text-xs font-mono font-bold uppercase transition flex items-center gap-1 border cursor-pointer shrink-0 ${
                  isDojoTransparent
                    ? 'bg-purple-950 text-purple-300 border-purple-500 shadow-[2px_2px_0px_#000000]'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                {isDojoTransparent ? <Eye className="w-3.5 h-3.5 text-purple-400" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isDojoTransparent ? 'Dojo View' : 'Opaque'}</span>
              </button>
            )}
          </div>

          {/* SUBTABS ANCHOR NAVIGATION */}
          {!isUniversalSelected && (
            <div className="flex items-center gap-1.5 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 overflow-x-auto custom-scrollbar shrink-0">
              {subtabs.map((tab) => {
                const isActive = activeSection === tab.id;
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.id}
                    onClick={() => scrollToSection(tab.id, tab.ref)}
                    className={`flex items-center gap-1.5 px-3 py-1.2 -skew-x-12 text-[10px] sm:text-xs font-mono font-bold uppercase transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
                      isActive 
                        ? 'bg-red-600 text-black font-black border border-white shadow-[2px_2px_0px_#000000]' 
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="tracking-tight">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </header>

        {/* WORKSPACE SCROLL CONTAINER */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6 custom-scrollbar">
          {isUniversalSelected ? (
            <div className="max-w-5xl mx-auto w-full">
              <CodexUniversalRulesView />
            </div>
          ) : (
            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="max-w-5xl mx-auto w-full space-y-6"
            >
              {/* SECTION 1: OVERVIEW & LINEAGE */}
              <div ref={overviewRef} className="space-y-3">
                <CodexIdentificationView 
                  style={currentStyle} 
                  isEquipped={isEquipped} 
                />
              </div>

              <div className="w-full h-0.5 bg-zinc-800/80 -skew-x-12" />

              {/* SECTION 2: TECHNIQUES & HITBOX SPECS */}
              <div ref={techniquesRef} className="space-y-3">
                <div className="flex items-center gap-2 border-b-2 border-red-600/60 pb-2">
                  <Swords className="w-4 h-4 text-rose-400" />
                  <h3 className="text-xs sm:text-sm font-display font-black italic uppercase text-white tracking-wider">
                    TECHNIQUE HITBOXES & FRAME DATA
                  </h3>
                </div>
                <CodexMoveSpecsView style={currentStyle} />
              </div>

              <div className="w-full h-0.5 bg-zinc-800/80 -skew-x-12" />

              {/* SECTION 3: INNATE PASSIVES & PERKS */}
              <div ref={passivesRef} className="space-y-3">
                <div className="flex items-center gap-2 border-b-2 border-yellow-500/60 pb-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <h3 className="text-xs sm:text-sm font-display font-black italic uppercase text-white tracking-wider">
                    INNATE PASSIVES & STANCE PERKS
                  </h3>
                </div>
                <CodexPassivesView style={currentStyle} />
              </div>

              <div className="w-full h-0.5 bg-zinc-800/80 -skew-x-12" />

              {/* SECTION 4: FRAME SPECS & BIOMECHANICAL MATRIX */}
              <div ref={statsRef} className="space-y-3">
                <div className="flex items-center gap-2 border-b-2 border-cyan-500/60 pb-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs sm:text-sm font-display font-black italic uppercase text-white tracking-wider">
                    KINEMATIC & FRAME DATA RADAR MATRIX
                  </h3>
                </div>
                <CodexStatsMatrix style={currentStyle} />
              </div>

              <div className="w-full h-0.5 bg-zinc-800/80 -skew-x-12" />

              {/* SECTION 5: TACTICAL COMBOS & PRO BLUEPRINT */}
              <div ref={tacticsRef} className="space-y-3 pb-8">
                <div className="flex items-center gap-2 border-b-2 border-purple-500/60 pb-2">
                  <Compass className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs sm:text-sm font-display font-black italic uppercase text-white tracking-wider">
                    TACTICAL COMBOS & BLUEPRINT
                  </h3>
                </div>
                <CodexTacticsView style={currentStyle} />
              </div>
            </div>
          )}
        </div>

        {/* FOOTER STATUS BAR */}
        <footer className="px-4 py-1.5 border-t border-zinc-850 bg-zinc-950/95 text-[9px] font-mono text-zinc-400 flex items-center justify-between shrink-0 select-none z-10">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-zinc-200 font-bold uppercase tracking-wider">MARTIAL CODEX SHOWCASE</span>
            <span className="text-zinc-600 hidden sm:inline">•</span>
            <span className="text-zinc-400 hidden sm:inline">
              {isUniversalSelected 
                ? 'Combat Handbook Active' 
                : `Viewing: ${currentStyle.name} • Section: ${activeSection.toUpperCase()}`}
            </span>
          </div>

          <div className="flex items-center gap-2 text-zinc-500">
            <span className="text-amber-400 font-bold hidden md:inline">Select Styles via Left Persona Navigation Blade</span>
            <span className="text-zinc-600 hidden md:inline">•</span>
            <span>ESC to Exit</span>
          </div>
        </footer>

      </main>
    </div>
  );
};
