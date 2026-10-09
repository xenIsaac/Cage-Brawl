import React, { useState, useEffect } from 'react';
import { 
  Info, LogOut, Sparkles, Terminal, Shield, Zap, CheckCircle2, 
  RefreshCw, Cpu, Activity, Move, Layers, Smartphone, Swords, 
  Sliders, Gauge, Eye, Flame, Award, History, Bookmark
} from 'lucide-react';
import { soundManager } from '../SoundManager';
import { GameInfoTab } from '../navigation/GameInfoNavRail';

interface GameInfoViewProps {
  version: string;
  onClose: () => void;
  isNavHidden?: boolean;
  activeTab?: GameInfoTab;
  setActiveTab?: (tab: GameInfoTab) => void;
}

export function GameInfoView({
  version,
  onClose,
  isNavHidden = false,
  activeTab = 'latest',
  setActiveTab,
}: GameInfoViewProps) {
  const [isLandscape, setIsLandscape] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth > window.innerHeight;
  });

  const [isCompactLandscape, setIsCompactLandscape] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth > window.innerHeight && window.innerHeight < 600;
  });

  useEffect(() => {
    const handleResize = () => {
      const landscape = window.innerWidth > window.innerHeight;
      setIsLandscape(landscape);
      setIsCompactLandscape(landscape && window.innerHeight < 600);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Keyboard navigation & ESC handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        soundManager.playRollTick?.();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      id="full-screen-game-info-view"
      className={`fixed inset-0 z-[120] bg-zinc-950 text-white flex flex-col pointer-events-auto select-none overflow-hidden transition-all duration-300 ${
        isNavHidden ? 'pl-0' : 'pl-14 sm:pl-16'
      }`}
    >
      {/* ============================================================== */}
      {/* 1. TOP HEADER BAR WITH ICONIC STASIS EXIT BUTTON               */}
      {/* ============================================================== */}
      <div className={`border-b border-zinc-850 bg-gradient-to-r from-zinc-950 via-zinc-900/90 to-zinc-950 flex items-center justify-between gap-3 shrink-0 ${
        isCompactLandscape ? 'px-3 py-1.5' : 'px-4 sm:px-6 py-2.5 sm:py-3'
      }`}>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-950/80 border border-amber-800/80 flex items-center justify-center text-amber-400 shrink-0 shadow-md">
            <Info className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm md:text-base font-display font-black italic uppercase tracking-wider text-white">
                GAME INTEL & SYSTEM MATRIX
              </h1>
              <span className="text-[8px] sm:text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded uppercase">
                {version || 'v1.7.6 Part 3'}
              </span>
            </div>
            {!isCompactLandscape && (
              <p className="text-[10px] font-mono text-zinc-400 hidden sm:block">
                Navigation Architecture, Dynamic Scaling, Combat Mechanics & Matrix Changelogs
              </p>
            )}
          </div>
        </div>

        {/* TOP ACTIONS: STASIS EXIT BUTTON */}
        <button
          onClick={() => {
            soundManager.playRollTick?.();
            onClose();
          }}
          className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-red-950/90 via-red-900/60 to-zinc-900 hover:from-red-900 hover:to-zinc-850 border border-red-500/50 hover:border-red-400 text-red-200 hover:text-white rounded-xl text-xs font-display font-black italic uppercase tracking-wider transition-all duration-200 shadow-md active:scale-95 group cursor-pointer"
          title="Exit Game Info & Return to Main Menu"
        >
          <LogOut className="w-4 h-4 text-red-400 rotate-180 transition-transform group-hover:scale-110" />
          <div className="flex flex-col text-left leading-none">
            <span className="text-[11px] font-black tracking-wide text-red-300 group-hover:text-white">EXIT / RETURN</span>
            <span className="text-[8px] font-mono text-red-400/80">Main Menu</span>
          </div>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 2. MAIN CONTENT AREA (DYNAMIC SCALING & SCROLL ELIMINATION)    */}
      {/* ============================================================== */}
      <div className={`flex-1 overflow-y-auto custom-scrollbar min-h-0 bg-zinc-950/40 w-full ${
        isCompactLandscape ? 'p-2 sm:p-3' : 'p-3 sm:p-5 lg:p-6'
      }`}>
        <div className="max-w-6xl mx-auto space-y-4">
          
          {/* LATEST UPDATE TAB (v1.7.6 Part 3) */}
          {activeTab === 'latest' ? (
            <div className="space-y-4">
              {/* HERO BANNER */}
              <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-950/40 via-zinc-900/90 to-zinc-950 p-4 sm:p-6 shadow-xl">
                <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 opacity-10 pointer-events-none">
                  <Terminal className="w-64 h-64 text-amber-400" />
                </div>
                <div className="relative z-10 space-y-2 max-w-3xl">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold uppercase">
                    <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
                    <span>v1.7.6 PART 3: COMBAT MATRIX & RULES FINALIZED</span>
                  </div>
                  <h2 className="text-base sm:text-xl font-display font-black italic uppercase tracking-wider text-white">
                    CHAIN PARRYING, BIOMETRIC ONBOARDING & QUEST ENGINE MATRIX
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans">
                    Universal game rules finalized: continuous zero-cooldown chain parrying, 100% equal random style enrollment, strict quest progress isolation, and The Unbroken Gauntlet endurance engine.
                  </p>
                </div>
              </div>

              {/* DYNAMIC SCALING FEATURE MATRIX GRID */}
              <div className={`grid gap-3 ${
                isLandscape ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'
              }`}>
                {/* CARD 1: ZERO-COOLDOWN CHAIN PARRYING */}
                <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-amber-500/40 space-y-2.5 shadow-md">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-950 border border-amber-800/80 flex items-center justify-center text-amber-400 shrink-0">
                      <Shield className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-display font-black uppercase text-white">
                      Zero-CD Chain Parries
                    </h3>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans leading-snug">
                    Landing a Perfect Parry (0.19s) instantly wipes block lockouts and resets the block timer to 0. Defend continuous multi-hit flurries and combo sequences without block destruction.
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1 border-t border-zinc-800/80 text-[8.5px] font-mono text-amber-400">
                    <span className="bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">#ZeroBlockCD</span>
                    <span className="bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">#FlurryDefense</span>
                  </div>
                </div>

                {/* CARD 2: NEW ACCOUNT RANDOMIZATION */}
                <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-cyan-500/40 space-y-2.5 shadow-md">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-800/80 flex items-center justify-center text-cyan-400 shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-display font-black uppercase text-white">
                      Biometric & Style Genesis
                    </h3>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans leading-snug">
                    New accounts automatically enroll with randomized fighter height (4&apos;6&quot; to 6&apos;7&quot;) and a starting style selected with 100% equal random probability across all styles in the catalog.
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1 border-t border-zinc-800/80 text-[8.5px] font-mono text-cyan-400">
                    <span className="bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">#100%FairSpread</span>
                    <span className="bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">#Genetics4ft6To6ft7</span>
                  </div>
                </div>

                {/* CARD 3: TIER 5 THE UNBROKEN GAUNTLET */}
                <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-emerald-500/40 space-y-2.5 shadow-md">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-800/80 flex items-center justify-center text-emerald-400 shrink-0">
                      <Swords className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-display font-black uppercase text-white">
                      T5 Unbroken Gauntlet
                    </h3>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans leading-snug">
                    10 Ranked Bots in 5 distinct 2-win segments. Requires switching styles after every 2 wins. Enforces a 3-Cycle Style Cooldown memory buffer and the Generous Mercy Rule.
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1 border-t border-zinc-800/80 text-[8.5px] font-mono text-emerald-400">
                    <span className="bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">#MercyRule</span>
                    <span className="bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">#3CycleCooldown</span>
                  </div>
                </div>

                {/* CARD 4: STRICT PROGRESS ISOLATION */}
                <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-950 border border-purple-800/80 flex items-center justify-center text-purple-400 shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-display font-black uppercase text-white">
                      Strict Progress Isolation
                    </h3>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans leading-snug">
                    Zero pre-buffering: quests not currently active in your 10 displayed slots cannot accumulate hidden progress. Streak quests bind to strict round-loss reset failure hooks.
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1 border-t border-zinc-800/80 text-[8.5px] font-mono text-purple-400">
                    <span className="bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">#ZeroPreBuffer</span>
                    <span className="bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">#RoundLossReset</span>
                  </div>
                </div>

                {/* CARD 5: DEDICATED DAUGHTER RAILS */}
                <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-display font-black uppercase text-white">
                      Daughter Navigation Rails
                    </h3>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans leading-snug">
                    Unified docked rails across Singleplayer, Codex, Quests, Settings, and Game Info with iconic Stasis Exit buttons, anti-folding discipline, and zero scroll waste.
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1 border-t border-zinc-800/80 text-[8.5px] font-mono text-zinc-400">
                    <span className="bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">#StasisExit</span>
                    <span className="bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">#DenseLandscape</span>
                  </div>
                </div>

                {/* CARD 6: PART 4 UPCOMING TEASER */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/30 to-zinc-900/90 border border-amber-500/30 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-950 border border-amber-700/80 flex items-center justify-center text-amber-300 shrink-0">
                      <Flame className="w-4 h-4 animate-pulse" />
                    </div>
                    <h3 className="text-xs font-display font-black uppercase text-amber-300">
                      Part 4: Upcoming Evolution
                    </h3>
                  </div>
                  <p className="text-[11px] text-zinc-300 font-sans leading-snug">
                    Part 3 finalized! Prepare for Part 4: tournament season rankings, custom martial title codex, expanded archetype synergy trials, and new combat archetypes.
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1 border-t border-zinc-800/80 text-[8.5px] font-mono text-amber-400">
                    <span className="bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">#Part4Incoming</span>
                    <span className="bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">#NextSeason</span>
                  </div>
                </div>
              </div>

              {/* CORE MARTIAL SPECIFICATIONS OVERVIEW */}
              <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-display font-black uppercase text-white tracking-wide">
                      ENGINE ARCHITECTURE & COMBAT RULES
                    </h3>
                  </div>
                  <span className="text-[9px] font-mono text-amber-400 uppercase font-bold">
                    Official 1.7.6 Part 3 Specifications
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-850 space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase">Physics Loop</span>
                    <p className="font-bold text-emerald-400">60 Hz Lockstep</p>
                    <span className="text-[9px] text-zinc-400">Deterministic tick execution</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-850 space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase">Parry Window</span>
                    <p className="font-bold text-amber-400">0.19s (11 Frames)</p>
                    <span className="text-[9px] text-zinc-400">0s Block CD on parry success</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-850 space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase">Hitstop Duration</span>
                    <p className="font-bold text-purple-400">4 Frames (66ms)</p>
                    <span className="text-[9px] text-zinc-400">Visceral impact time dilation</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-850 space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase">New Account Height</span>
                    <p className="font-bold text-cyan-400">54&quot; – 79&quot; (4&apos;6&quot;–6&apos;7&quot;)</p>
                    <span className="text-[9px] text-zinc-400">100% Equal style distribution</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* OLDER VERSIONS TAB (Kept empty/clean archive repository as requested) */
            <div className="p-8 text-center rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <History className="w-8 h-8 text-zinc-500 mx-auto" />
              <h3 className="text-sm font-display font-black uppercase text-zinc-300">
                Archived Release Notes
              </h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto font-mono">
                Repository archive slot is empty. All current mechanics, physics, and architecture updates are unified in Latest Update (Part 3).
              </p>
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => {
                    soundManager.playRollTick?.();
                    if (setActiveTab) setActiveTab('latest');
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-mono font-bold uppercase transition cursor-pointer shadow"
                >
                  View Latest Update (Part 3)
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. FOOTER STATUS BAR                                           */}
      {/* ============================================================== */}
      <div className="px-4 py-2 border-t border-zinc-850 bg-zinc-950 text-[10px] font-mono text-zinc-400 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-zinc-300 font-bold uppercase">
            {version || 'V1.7.6 PART 3 MATRIX'}
          </span>
        </div>
        <div className="text-zinc-500 text-[9px]">
          Press ESC or Tap Stasis Exit to Return
        </div>
      </div>
    </div>
  );
}
