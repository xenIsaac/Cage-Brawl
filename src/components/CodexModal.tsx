import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Eye, EyeOff, Swords, Zap, 
  Sparkles, Layers, Cpu, Compass, Award, Activity, 
  ShieldAlert, Shield, CheckCircle2, ChevronRight
} from 'lucide-react';
import { FIGHTING_STYLES } from '../data/styles';
import { FightingStyle } from '../types';
import { STYLE_CLASSIFICATIONS } from '../data/styleClassification';
import { soundManager } from './SoundManager';
import { isMobileDevice } from '../utils/deviceDetection';
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
}

export const CodexModal: React.FC<CodexModalProps> = ({
  isOpen,
  onClose,
  equippedStyleId,
  isNavHidden = false,
  isNavExpanded = false,
  isInsideArena = false,
  selectedCategory,
  selectedStyleId: externalSelectedStyleId,
  onSelectStyle: externalOnSelectStyle,
}) => {
  const [internalSelectedStyleId, setInternalSelectedStyleId] = useState<string>(equippedStyleId || 'basic');
  const selectedStyleId = externalSelectedStyleId ?? internalSelectedStyleId;
  const onSelectStyle = externalOnSelectStyle ?? setInternalSelectedStyleId;

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

  // Section refs for smooth in-page jumping and scroll-spy tracking
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const overviewRef = useRef<HTMLDivElement>(null);
  const techniquesRef = useRef<HTMLDivElement>(null);
  const passivesRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const tacticsRef = useRef<HTMLDivElement>(null);

  // Dynamic Adaptive Viewport Padding - NEVER squishes on mobile or landscape!
  const isMobile = isMobileDevice();
  const isNarrowScreen = typeof window !== 'undefined' && (window.innerWidth < 1024 || (isLandscape && window.innerHeight < 600));

  const dynamicPaddingLeft = isNavHidden
    ? '0.75rem'
    : (isMobile || isNarrowScreen)
      ? '4.25rem' // Fixed slim padding on mobile/landscape - rail floats as overlay without squishing!
      : isNavExpanded
        ? '16.5rem' // 264px when rail expands on desktop PC
        : '4.75rem'; // 76px when rail collapsed

  // Sync equipped style on open
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
  const primaryColor = currentStyle.color || '#f59e0b';
  const secondaryColor = currentStyle.secondaryColor || primaryColor;

  const subtabs: { id: CodexSection; label: string; icon: any; ref: React.RefObject<HTMLDivElement | null> }[] = [
    { id: 'overview', label: 'Overview', icon: BookOpen, ref: overviewRef },
    { id: 'techniques', label: 'Moves & Hitboxes', icon: Swords, ref: techniquesRef },
    { id: 'passives', label: 'Passives', icon: Zap, ref: passivesRef },
    { id: 'stats', label: 'Frame Stats', icon: Activity, ref: statsRef },
    { id: 'tactics', label: 'Combos', icon: Compass, ref: tacticsRef },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{ paddingLeft: dynamicPaddingLeft }}
      className={`fixed inset-0 z-[120] flex flex-col pointer-events-auto select-none py-1.5 sm:py-3 pr-2 sm:pr-4 transition-[padding-left] duration-300 ease-out ${
        isDojoTransparent 
          ? 'bg-black/60 backdrop-blur-xs' 
          : 'bg-zinc-950/98 backdrop-blur-2xl'
      }`}
    >
      {/* 1. FULL-WIDTH WORKSPACE CONTAINER (PURE SHOWCASE - NO X BUTTON) */}
      <div className="flex-1 bg-zinc-900/90 border border-zinc-800/90 backdrop-blur-2xl rounded-2xl flex flex-col min-h-0 overflow-hidden shadow-2xl relative">
        
        {/* TOP COMMAND HEADER WITH ADAPTIVE LANDSCAPE SUBTABS */}
        <header className="px-2.5 sm:px-4 py-1.5 sm:py-2 border-b border-zinc-850 bg-zinc-950/95 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-1.5 sm:gap-2 shrink-0 z-20">
          <div className="flex items-center justify-between gap-2 min-w-0 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div 
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-display font-black text-sm sm:text-base text-white shadow-md border border-white/20 shrink-0"
                style={{ backgroundColor: isUniversalSelected ? '#06b6d4' : primaryColor }}
              >
                {isUniversalSelected ? '📜' : currentStyle.name.charAt(0)}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xs sm:text-sm font-display font-black uppercase tracking-wider text-white truncate">
                    {isUniversalSelected ? 'COMBAT RULES HANDBOOK' : currentStyle.name}
                  </h1>
                  {isEquipped && !isUniversalSelected && (
                    <span className="text-[7px] sm:text-[8px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 font-bold uppercase shrink-0 shadow-sm">
                      Equipped
                    </span>
                  )}
                  <span className="text-[7px] sm:text-[8px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800 font-bold shrink-0 hidden md:inline">
                    MARTIAL CODEX
                  </span>
                </div>
                
                <p className="text-[8.5px] sm:text-[9.5px] text-zinc-400 font-mono hidden xl:block truncate">
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
                className={`px-2 py-0.5 rounded-lg text-[9px] sm:text-xs font-mono font-bold uppercase transition flex items-center gap-1 border cursor-pointer shrink-0 ${
                  isDojoTransparent
                    ? 'bg-purple-950/80 text-purple-300 border-purple-500/60 shadow-md'
                    : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
                title="Toggle Dojo Backdrop Transparency"
              >
                {isDojoTransparent ? <Eye className="w-3 h-3 text-purple-400" /> : <EyeOff className="w-3 h-3" />}
                <span className="hidden sm:inline">{isDojoTransparent ? 'Dojo View' : 'Opaque'}</span>
              </button>
            )}
          </div>

          {/* Quick Subtabs Anchor Navigation: Fully visible & horizontally scrollable on mobile landscape */}
          {!isUniversalSelected && (
            <div className="flex items-center gap-1 bg-zinc-950/90 p-0.5 sm:p-1 rounded-xl border border-zinc-800 shrink-0 overflow-x-auto custom-scrollbar w-full lg:w-auto justify-start sm:justify-center lg:justify-end">
              {subtabs.map((tab) => {
                const isActive = activeSection === tab.id;
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.id}
                    onClick={() => scrollToSection(tab.id, tab.ref)}
                    className={`relative flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-[9px] sm:text-[10.5px] font-mono font-bold uppercase transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 ${
                      isActive ? 'text-white font-black' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                    }`}
                  >
                    {/* Active Gradient Circle-Rectangle Overlay matching Style Colors */}
                    {isActive && (
                      <motion.div
                        layoutId="codexActiveSubtabOverlay"
                        className="absolute inset-0 rounded-lg border z-0"
                        style={{
                          background: `linear-gradient(135deg, ${primaryColor}40, ${secondaryColor}25)`,
                          borderColor: `${primaryColor}aa`,
                          boxShadow: `0 0 16px ${primaryColor}44, inset 0 0 8px ${primaryColor}22`,
                        }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}

                    <Icon 
                      className={`w-3 h-3 relative z-10 transition-colors ${
                        isActive ? 'text-white' : 'text-zinc-400'
                      }`} 
                      style={isActive ? { filter: `drop-shadow(0 0 4px ${primaryColor})` } : undefined}
                    />
                    <span className="relative z-10 tracking-tight">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </header>

        {/* 2. DEDICATED SHOWCASE VIEWPORT (FULL-WIDTH SCROLLABLE WORKSPACE WITH SCROLL-SPY) */}
        <div className="flex-1 flex flex-col min-h-0 bg-zinc-950/40 overflow-hidden">
          {isUniversalSelected ? (
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 custom-scrollbar max-w-6xl mx-auto w-full">
              <CodexUniversalRulesView />
            </div>
          ) : (
            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-5 custom-scrollbar max-w-6xl mx-auto w-full"
            >
              {/* SECTION 1: OVERVIEW & LINEAGE */}
              <div ref={overviewRef} className="space-y-3 pt-1">
                <CodexIdentificationView 
                  style={currentStyle} 
                  isEquipped={isEquipped} 
                />
              </div>

              <div className="w-full h-px bg-zinc-800/80" />

              {/* SECTION 2: TECHNIQUES & HITBOX SPECS */}
              <div ref={techniquesRef} className="space-y-3 pt-1">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                  <Swords className="w-4 h-4 text-rose-400" />
                  <h3 className="text-xs sm:text-sm font-display font-black uppercase text-white tracking-wider">
                    TECHNIQUE HITBOXES & FRAME DATA
                  </h3>
                </div>
                <CodexMoveSpecsView style={currentStyle} />
              </div>

              <div className="w-full h-px bg-zinc-800/80" />

              {/* SECTION 3: INNATE PASSIVES & PERKS */}
              <div ref={passivesRef} className="space-y-3 pt-1">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <h3 className="text-xs sm:text-sm font-display font-black uppercase text-white tracking-wider">
                    INNATE PASSIVES & STANCE PERKS
                  </h3>
                </div>
                <CodexPassivesView style={currentStyle} />
              </div>

              <div className="w-full h-px bg-zinc-800/80" />

              {/* SECTION 4: FRAME SPECS & BIOMECHANICAL MATRIX */}
              <div ref={statsRef} className="space-y-3 pt-1">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs sm:text-sm font-display font-black uppercase text-white tracking-wider">
                    KINEMATIC & FRAME DATA RADAR MATRIX
                  </h3>
                </div>
                <CodexStatsMatrix style={currentStyle} />
              </div>

              <div className="w-full h-px bg-zinc-800/80" />

              {/* SECTION 5: TACTICAL COMBOS & PRO BLUEPRINT */}
              <div ref={tacticsRef} className="space-y-3 pb-6 pt-1">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                  <Compass className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs sm:text-sm font-display font-black uppercase text-white tracking-wider">
                    TACTICAL COMBOS & BLUEPRINT
                  </h3>
                </div>
                <CodexTacticsView style={currentStyle} />
              </div>
            </div>
          )}
        </div>

        {/* 3. FOOTER STATUS BAR */}
        <footer className="px-4 py-1.5 border-t border-zinc-850 bg-zinc-950/95 text-[9px] font-mono text-zinc-400 flex items-center justify-between shrink-0 select-none z-10">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-zinc-300 font-bold uppercase">MARTIAL CODEX SHOWCASE</span>
            <span className="text-zinc-600 hidden sm:inline">•</span>
            <span className="text-zinc-400 hidden sm:inline">
              {isUniversalSelected 
                ? 'Combat Handbook Active' 
                : `Viewing: ${currentStyle.name} • Section: ${activeSection.toUpperCase()}`}
            </span>
          </div>

          <div className="flex items-center gap-2 text-zinc-500">
            <span className="text-amber-400 font-bold hidden md:inline">Navigate Styles via Left Navigation Rail</span>
            <span className="text-zinc-600 hidden md:inline">•</span>
            <span>Press ESC or Exit in Rail</span>
          </div>
        </footer>

      </div>
    </motion.div>
  );
};
