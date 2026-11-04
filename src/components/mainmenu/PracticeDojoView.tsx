import React, { useState, useEffect } from 'react';
import { 
  Play, Swords, Shield, Target, Activity, Zap, RotateCcw, 
  Sparkles, Check, Bot, Eye, Settings, Flame, ChevronRight, ChevronLeft, 
  LogOut, Heart, BatteryCharging, AlertTriangle
} from 'lucide-react';
import { PlayerStats, MatchData } from '../../types';
import { FIGHTING_STYLES } from '../../data/styles';
import { soundManager } from '../SoundManager';
import { DummyConfig } from './types';
import { useResponsiveLayout } from '../../utils/useResponsiveLayout';

interface PracticeDojoViewProps {
  stats: PlayerStats;
  updateStats: (updates: Partial<PlayerStats>) => void;
  onLaunchDojo: (matchData: MatchData) => void;
  onClose: () => void;
  isNavHidden?: boolean;
}

export const PracticeDojoView: React.FC<PracticeDojoViewProps> = ({
  stats,
  updateStats,
  onLaunchDojo,
  onClose,
  isNavHidden = false,
}) => {
  const [selectedPlayerStyleId, setSelectedPlayerStyleId] = useState<string>(stats.selectedStyleId || 'basic');
  const [dummyConfig, setDummyConfig] = useState<DummyConfig>({
    styleId: 'basic',
    behavior: 'idle',
    staminaRecovery: true,
    healthRecovery: true,
    showHitboxes: false,
    infiniteSuper: false,
  });

  // Mobile / compact slide deck pagination (01: Style, 02: Dummy, 03: Sandbox)
  const [activeSlide, setActiveSlide] = useState<number>(0);

  const { isPortrait, isLandscape, isMobile, isCompactLandscape } = useResponsiveLayout();
  const isPcDevice = !isMobile;

  const playerStyle = FIGHTING_STYLES.find(s => s.id === selectedPlayerStyleId) || FIGHTING_STYLES[0];
  const dummyStyle = FIGHTING_STYLES.find(s => s.id === dummyConfig.styleId) || FIGHTING_STYLES[0];

  const handleLaunch = () => {
    soundManager.playRollTick?.();
    updateStats({ selectedStyleId: selectedPlayerStyleId });
    
    const matchData: MatchData = {
      isCompetitive: false,
      mapId: 'octagon',
      mapName: 'Practice Dojo',
      modeId: 'practice_ai',
      modeName: 'Practice Dojo',
      opponent: {
        fighterName: `Dummy (${dummyStyle.name})`,
        styleId: dummyConfig.styleId,
        elo: 1000,
        rank: 'Training Dummy',
        heightInInches: 68,
        level: 1,
      },
      dummyBehavior: dummyConfig.behavior,
      dummyStyleId: dummyConfig.styleId,
      dummyConfig: dummyConfig,
      playerStyleId: selectedPlayerStyleId,
      isPracticeMode: true,
      infiniteStamina: dummyConfig.staminaRecovery,
      godMode: dummyConfig.healthRecovery,
    } as any;

    onLaunchDojo(matchData);
  };

  // Keyboard navigation for quick access
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (e.key === 't' || e.key === 'T' || e.key === ' ') {
        e.preventDefault();
        handleLaunch();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        soundManager.playRollTick?.();
        onClose();
      } else if (e.key === '1') {
        setDummyConfig(prev => ({ ...prev, behavior: 'idle' }));
        soundManager.playRollTick?.();
      } else if (e.key === '2') {
        setDummyConfig(prev => ({ ...prev, behavior: 'block_only' }));
        soundManager.playRollTick?.();
      } else if (e.key === '3') {
        setDummyConfig(prev => ({ ...prev, behavior: 'counter' }));
        soundManager.playRollTick?.();
      } else if (e.key === '4') {
        setDummyConfig(prev => ({ ...prev, behavior: 'aggressive' }));
        soundManager.playRollTick?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPlayerStyleId, dummyConfig, onClose]);

  const SLIDE_TABS = [
    { id: 0, label: '01 // COMBAT STYLES', icon: Swords },
    { id: 1, label: '02 // DUMMY MATRIX', icon: Bot },
    { id: 2, label: '03 // LAB SETTINGS', icon: Zap },
  ];

  return (
    <div
      id="full-screen-dojo-hub"
      className="fixed inset-0 z-[120] bg-zinc-950 text-white flex flex-col pointer-events-auto select-none overflow-hidden transition-all duration-300"
    >
      {/* BACKGROUND COMIC WATERMARK */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0 opacity-5">
        <div className="absolute -top-10 -right-10 font-display font-black italic text-9xl text-white tracking-tighter -skew-x-12 select-none">
          OCTAGON LAB
        </div>
        <div className="absolute -bottom-10 -left-10 font-display font-black italic text-9xl text-red-600 tracking-tighter -skew-x-12 select-none">
          PERFECT FORM
        </div>
      </div>

      {/* 1. PERSONA COMIC COLLAGE HEADER */}
      <div className="px-3 sm:px-6 py-2.5 bg-zinc-950 border-b-2 border-white/20 flex items-center justify-between gap-2 shrink-0 z-20">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* PERSONA STAMP BADGE */}
          <div className="bg-red-600 text-black px-2.5 sm:px-3 py-1 font-display font-black italic text-xs sm:text-sm uppercase tracking-wider -skew-x-12 shadow-[3px_3px_0px_#ffffff] transform -rotate-1 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-black" />
            <span>DOJO // 04</span>
          </div>

          <div className="flex flex-col">
            <h1 className="text-sm sm:text-base md:text-lg font-display font-black italic uppercase tracking-tighter text-white -skew-x-12 leading-none">
              OCTAGON SPAR LAB
            </h1>
            <span className="text-[9px] sm:text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider hidden xs:inline">
              ✦ FRAME-DATA DRILLS & SPARRING MATRIX ✦
            </span>
          </div>
        </div>

        {/* RIGHT ACTION BUTTONS: LAUNCH & EXIT */}
        <div className="flex items-center gap-2">
          {/* PERSONA HIGH-CONTRAST LAUNCH BUTTON */}
          <button
            onClick={handleLaunch}
            className="flex items-center gap-1.5 px-3 sm:px-5 py-1.5 bg-amber-400 hover:bg-white text-black font-display font-black italic uppercase text-xs sm:text-sm tracking-wider -skew-x-12 shadow-[3px_3px_0px_#ef4444] hover:shadow-[3px_3px_0px_#000000] transition cursor-pointer active:scale-95 shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-black" />
            <span>LAUNCH DOJO</span>
            <span className="hidden md:inline text-[9px] font-mono bg-black text-amber-400 px-1 py-0.2">[T]</span>
          </button>

          {/* PROMINENT PERSONA RETURN / EXIT BUTTON */}
          <button
            onClick={() => {
              soundManager.playRollTick?.();
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 bg-red-600 hover:bg-white text-black font-display font-black italic uppercase tracking-wider text-xs sm:text-sm -skew-x-12 shadow-[3px_3px_0px_#ffffff] hover:shadow-[3px_3px_0px_#ef4444] transition-all duration-150 cursor-pointer active:scale-95 group shrink-0"
            title="Return to Menu (ESC)"
          >
            <LogOut className="w-3.5 h-3.5 rotate-180 text-black group-hover:scale-110" />
            <span className="hidden sm:inline">RETURN // MENU</span>
            <span className="sm:hidden">EXIT</span>
          </button>
        </div>
      </div>

      {/* MOBILE / COMPACT SCREEN SLIDE DECK TABS (ELIMINATES SCROLLING) */}
      {!isPcDevice && (
        <div className="px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between gap-1.5 shrink-0 z-20">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {SLIDE_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSlide === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    soundManager.playRollTick?.();
                    setActiveSlide(tab.id);
                  }}
                  className={`px-2.5 py-1 text-[11px] font-display font-black italic uppercase tracking-wider -skew-x-12 transition flex items-center gap-1 shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-red-600 text-black shadow-[2px_2px_0px_#ffffff]'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* SLIDE PAGER BUTTONS */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => {
                soundManager.playRollTick?.();
                setActiveSlide((prev) => (prev > 0 ? prev - 1 : SLIDE_TABS.length - 1));
              }}
              className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 -skew-x-12 cursor-pointer"
              title="Previous Slide"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                soundManager.playRollTick?.();
                setActiveSlide((prev) => (prev < SLIDE_TABS.length - 1 ? prev + 1 : 0));
              }}
              className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 -skew-x-12 cursor-pointer"
              title="Next Slide"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 p-3 sm:p-4 min-h-0 overflow-hidden relative z-10">
        {isPcDevice ? (
          /* ============================================================== */
          /* DESKTOP 3-COLUMN COMIC COLLAGE STATION (NO SCROLLING)          */
          /* ============================================================== */
          <div className="h-full grid grid-cols-12 gap-3.5 overflow-hidden">
            {/* COLUMN 1: FIGHTER COMBAT STYLES (4 cols) */}
            <div className="col-span-4 h-full bg-zinc-950/80 border-2 border-zinc-800 p-3.5 flex flex-col justify-between overflow-hidden shadow-[4px_4px_0px_#000000]">
              {/* Paper Tape Header */}
              <div className="flex items-center justify-between border-b-2 border-red-600/60 pb-2 mb-2 shrink-0">
                <div className="bg-black text-red-500 border border-red-500 px-2 py-0.5 text-xs font-mono font-black italic -skew-x-12 shadow-[2px_2px_0px_#ef4444]">
                  // 01 YOUR FIGHTER STANCE
                </div>
                <span className="text-xs font-display font-black italic uppercase text-amber-400 -skew-x-12">
                  {playerStyle.name}
                </span>
              </div>

              {/* Style List Cards */}
              <div className="flex-1 space-y-1.5 overflow-y-auto pr-1 custom-scrollbar min-h-0">
                {FIGHTING_STYLES.map((style) => {
                  const isSelected = style.id === selectedPlayerStyleId;
                  const isUndergoingRework = style.reworkStatus === 'undergoing_rework';
                  const isUndergoingDev = style.reworkStatus === 'undergoing_development';
                  const isUnavailable = isUndergoingRework || isUndergoingDev;

                  return (
                    <button
                      key={style.id}
                      disabled={isUnavailable}
                      onClick={() => {
                        if (isUnavailable) return;
                        setSelectedPlayerStyleId(style.id);
                        soundManager.playRollTick?.();
                      }}
                      className={`w-full p-2.5 text-left transition -skew-x-12 flex items-center justify-between gap-2 border cursor-pointer ${
                        isUnavailable
                          ? 'opacity-35 cursor-not-allowed bg-zinc-900/50 border-zinc-850'
                          : isSelected
                            ? 'bg-red-600 text-black border-white shadow-[3px_3px_0px_#ffffff]'
                            : 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-850'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-7 h-7 flex items-center justify-center font-display font-black text-xs shrink-0 border ${
                            isSelected ? 'bg-black text-white border-white' : 'border-white/20'
                          }`}
                          style={{ backgroundColor: !isSelected ? style.color : undefined }}
                        >
                          {style.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className={`text-xs font-display font-black uppercase truncate ${isSelected ? 'text-black' : 'text-white'}`}>
                            {style.name}
                          </div>
                          <div className={`text-[9.5px] font-mono truncate ${isSelected ? 'text-zinc-900 font-bold' : 'text-zinc-400'}`}>
                            Speed: {(style.statModifiers.speed * 100).toFixed(0)}% • Reach: {(style.statModifiers.reach * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <span className="font-mono font-black text-black text-xs shrink-0">
                          ▶ ACTIVE
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Style Telemetry Note */}
              <div className="mt-2 pt-2 border-t border-zinc-850 text-[10px] font-mono text-zinc-400 flex items-center justify-between shrink-0">
                <span>Torque Mechanics: Active</span>
                <span className="text-amber-400 font-bold">100% Kinetic Sync</span>
              </div>
            </div>

            {/* COLUMN 2: SPARRING DUMMY CONFIG & AI MATRIX (4 cols) */}
            <div className="col-span-4 h-full bg-zinc-950/80 border-2 border-zinc-800 p-3.5 flex flex-col justify-between overflow-hidden shadow-[4px_4px_0px_#000000]">
              {/* Paper Tape Header */}
              <div className="flex items-center justify-between border-b-2 border-amber-500/60 pb-2 mb-2 shrink-0">
                <div className="bg-black text-amber-400 border border-amber-400 px-2 py-0.5 text-xs font-mono font-black italic -skew-x-12 shadow-[2px_2px_0px_#fbbf24]">
                  // 02 DUMMY STANCE & AI ROUTINE
                </div>
                <span className="text-xs font-display font-black italic uppercase text-red-500 -skew-x-12">
                  {dummyStyle.name}
                </span>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar min-h-0">
                {/* Dummy Stance Selector */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 block">
                    Dummy Stance:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {FIGHTING_STYLES.filter(s => s.reworkStatus !== 'undergoing_rework' && s.reworkStatus !== 'undergoing_development').map((s) => {
                      const isSel = s.id === dummyConfig.styleId;
                      return (
                        <button
                          key={s.id}
                          onClick={() => {
                            setDummyConfig(prev => ({ ...prev, styleId: s.id }));
                            soundManager.playRollTick?.();
                          }}
                          className={`p-2 text-left font-display font-black text-xs uppercase -skew-x-12 border transition cursor-pointer flex items-center gap-1.5 ${
                            isSel
                              ? 'bg-amber-400 text-black border-white shadow-[2px_2px_0px_#000000]'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          <span className="w-2 h-2 shrink-0" style={{ backgroundColor: s.color }} />
                          <span className="truncate">{s.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dummy Routine Modes */}
                <div className="space-y-1.5 pt-1 border-t border-zinc-850">
                  <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 block">
                    AI Behavior Pattern:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'idle', label: '1. Idle Poke Stance', desc: 'Resting Stance Test' },
                      { id: 'block_only', label: '2. Pocket Shell', desc: 'Clamped Guard Only' },
                      { id: 'counter', label: '3. Slip Counter', desc: 'Parry & Retaliate' },
                      { id: 'aggressive', label: '4. Inside Brawler', desc: 'Predatory Shuffles' },
                    ].map((b) => {
                      const isSel = dummyConfig.behavior === b.id;
                      return (
                        <button
                          key={b.id}
                          onClick={() => {
                            setDummyConfig(prev => ({ ...prev, behavior: b.id as any }));
                            soundManager.playRollTick?.();
                          }}
                          className={`p-2 text-left -skew-x-12 border transition cursor-pointer flex flex-col justify-between ${
                            isSel
                              ? 'bg-white text-black border-red-600 shadow-[3px_3px_0px_#ef4444]'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          <span className="font-display font-black text-xs uppercase leading-tight">
                            {b.label}
                          </span>
                          <span className={`text-[9px] font-mono ${isSel ? 'text-zinc-800 font-bold' : 'text-zinc-500'}`}>
                            {b.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              <div className="mt-2 pt-2 border-t border-zinc-850 text-[10px] font-mono text-zinc-400 flex items-center justify-between shrink-0">
                <span>Guard Absorption: Clamped</span>
                <span className="text-red-500 font-bold">Pocket Shell Active</span>
              </div>
            </div>

            {/* COLUMN 3: LAB SIMULATION HUD & LAUNCH POSTER (4 cols) */}
            <div className="col-span-4 h-full bg-zinc-950/80 border-2 border-zinc-800 p-3.5 flex flex-col justify-between overflow-hidden shadow-[4px_4px_0px_#000000]">
              {/* Paper Tape Header */}
              <div className="flex items-center justify-between border-b-2 border-white/40 pb-2 mb-2 shrink-0">
                <div className="bg-white text-black border border-white px-2 py-0.5 text-xs font-mono font-black italic -skew-x-12 shadow-[2px_2px_0px_#000000]">
                  // 03 LAB PHYSICS & DRILL HUD
                </div>
                <span className="text-xs font-display font-black italic uppercase text-emerald-400 -skew-x-12">
                  READY
                </span>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar min-h-0">
                {/* Simulation Toggles */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 block">
                    Regeneration & Hitboxes:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setDummyConfig(p => ({ ...p, healthRecovery: !p.healthRecovery }))}
                      className={`p-2.5 -skew-x-12 border text-center font-display font-black uppercase text-xs transition cursor-pointer flex flex-col items-center gap-1 ${
                        dummyConfig.healthRecovery
                          ? 'bg-emerald-500 text-black border-white shadow-[2px_2px_0px_#000000]'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                      }`}
                    >
                      <Heart className="w-4 h-4" />
                      <span>HP REGEN: {dummyConfig.healthRecovery ? 'ON' : 'OFF'}</span>
                    </button>

                    <button
                      onClick={() => setDummyConfig(p => ({ ...p, staminaRecovery: !p.staminaRecovery }))}
                      className={`p-2.5 -skew-x-12 border text-center font-display font-black uppercase text-xs transition cursor-pointer flex flex-col items-center gap-1 ${
                        dummyConfig.staminaRecovery
                          ? 'bg-amber-400 text-black border-white shadow-[2px_2px_0px_#000000]'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                      }`}
                    >
                      <BatteryCharging className="w-4 h-4" />
                      <span>STAMINA: {dummyConfig.staminaRecovery ? 'MAX' : 'NORMAL'}</span>
                    </button>
                  </div>
                </div>

                {/* Matchup Telemetry Poster */}
                <div className="bg-zinc-900 border-2 border-red-600/70 p-3 -skew-x-12 space-y-2 shadow-[3px_3px_0px_#000000]">
                  <div className="text-xs font-display font-black italic uppercase text-red-500 flex items-center justify-between">
                    <span>MATCHUP DRILL</span>
                    <span className="text-white">SECTION 1.25</span>
                  </div>
                  <div className="text-xs font-mono text-zinc-300">
                    <div className="flex justify-between py-0.5 border-b border-zinc-800">
                      <span className="text-zinc-500">Player:</span>
                      <span className="text-white font-bold">{playerStyle.name}</span>
                    </div>
                    <div className="flex justify-between py-0.5 border-b border-zinc-800">
                      <span className="text-zinc-500">Opponent:</span>
                      <span className="text-amber-400 font-bold">{dummyStyle.name}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-zinc-500">Routine:</span>
                      <span className="text-emerald-400 font-bold">{dummyConfig.behavior.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Big Launch Button in Column 3 */}
              <div className="pt-2 border-t border-zinc-850 shrink-0">
                <button
                  onClick={handleLaunch}
                  className="w-full py-3 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-black font-display font-black italic text-base uppercase tracking-wider -skew-x-12 shadow-[4px_4px_0px_#ffffff] transition cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5 fill-black" />
                  <span>ENTER PRACTICE DOJO</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* MOBILE / COMPACT SLIDE DECK (ELIMINATES SCROLLING)             */
          /* ============================================================== */
          <div className="h-full flex flex-col justify-between overflow-hidden">
            {/* SLIDE 0: PLAYER COMBAT STYLES */}
            {activeSlide === 0 && (
              <div className="flex-1 bg-zinc-950/90 border-2 border-zinc-800 p-3 flex flex-col justify-between overflow-hidden shadow-[3px_3px_0px_#000000]">
                <div className="flex items-center justify-between border-b-2 border-red-600 pb-1.5 mb-2 shrink-0">
                  <span className="bg-black text-red-500 border border-red-500 px-2 py-0.5 text-xs font-mono font-black italic -skew-x-12">
                    01 // SELECT YOUR STANCE
                  </span>
                  <span className="text-xs font-display font-black text-amber-400 -skew-x-12">
                    {playerStyle.name}
                  </span>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-1.5 overflow-y-auto pr-1 custom-scrollbar min-h-0">
                  {FIGHTING_STYLES.map((style) => {
                    const isSelected = style.id === selectedPlayerStyleId;
                    const isUndergoingRework = style.reworkStatus === 'undergoing_rework';
                    const isUndergoingDev = style.reworkStatus === 'undergoing_development';
                    const isUnavailable = isUndergoingRework || isUndergoingDev;

                    return (
                      <button
                        key={style.id}
                        disabled={isUnavailable}
                        onClick={() => {
                          if (isUnavailable) return;
                          setSelectedPlayerStyleId(style.id);
                          soundManager.playRollTick?.();
                        }}
                        className={`p-2 text-left transition -skew-x-12 border flex items-center justify-between gap-1.5 cursor-pointer ${
                          isUnavailable
                            ? 'opacity-30 cursor-not-allowed bg-zinc-900 border-zinc-850'
                            : isSelected
                              ? 'bg-red-600 text-black border-white shadow-[2px_2px_0px_#ffffff]'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: style.color }} />
                          <span className="text-xs font-display font-black uppercase truncate">{style.name}</span>
                        </div>
                        {isSelected && <span className="font-mono text-[10px] font-black">✓</span>}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2 pt-2 border-t border-zinc-850 flex items-center justify-between shrink-0">
                  <span className="text-[10px] font-mono text-zinc-400">Torque: Section 1.25 Active</span>
                  <button
                    onClick={() => {
                      soundManager.playRollTick?.();
                      setActiveSlide(1);
                    }}
                    className="px-3 py-1 bg-white text-black font-display font-black italic text-xs uppercase -skew-x-12 flex items-center gap-1 cursor-pointer"
                  >
                    <span>NEXT: DUMMY</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* SLIDE 1: DUMMY STANCE & AI MATRIX */}
            {activeSlide === 1 && (
              <div className="flex-1 bg-zinc-950/90 border-2 border-zinc-800 p-3 flex flex-col justify-between overflow-hidden shadow-[3px_3px_0px_#000000]">
                <div className="flex items-center justify-between border-b-2 border-amber-500 pb-1.5 mb-2 shrink-0">
                  <span className="bg-black text-amber-400 border border-amber-400 px-2 py-0.5 text-xs font-mono font-black italic -skew-x-12">
                    02 // DUMMY STANCE & BEHAVIOR
                  </span>
                  <span className="text-xs font-display font-black text-red-500 -skew-x-12">
                    {dummyStyle.name}
                  </span>
                </div>

                <div className="flex-1 space-y-2.5 overflow-y-auto pr-1 custom-scrollbar min-h-0">
                  {/* Dummy Style Picker Strip */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold">Dummy Stance:</span>
                    <div className="grid grid-cols-2 gap-1">
                      {FIGHTING_STYLES.filter(s => s.reworkStatus !== 'undergoing_rework' && s.reworkStatus !== 'undergoing_development').map((s) => {
                        const isSel = s.id === dummyConfig.styleId;
                        return (
                          <button
                            key={s.id}
                            onClick={() => {
                              setDummyConfig(prev => ({ ...prev, styleId: s.id }));
                              soundManager.playRollTick?.();
                            }}
                            className={`p-1.5 text-left font-display font-black text-xs uppercase -skew-x-12 border cursor-pointer flex items-center gap-1 ${
                              isSel ? 'bg-amber-400 text-black border-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                            }`}
                          >
                            <span className="w-2 h-2 shrink-0" style={{ backgroundColor: s.color }} />
                            <span className="truncate">{s.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dummy Behavior */}
                  <div className="space-y-1 pt-1.5 border-t border-zinc-850">
                    <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold">Sparring Routine:</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: 'idle', label: '1. Idle Poke Stance' },
                        { id: 'block_only', label: '2. Clamped Guard' },
                        { id: 'counter', label: '3. Slip Counter' },
                        { id: 'aggressive', label: '4. Inside Brawler' },
                      ].map((b) => {
                        const isSel = dummyConfig.behavior === b.id;
                        return (
                          <button
                            key={b.id}
                            onClick={() => {
                              setDummyConfig(prev => ({ ...prev, behavior: b.id as any }));
                              soundManager.playRollTick?.();
                            }}
                            className={`p-2 text-left font-display font-black text-xs uppercase -skew-x-12 border cursor-pointer ${
                              isSel ? 'bg-white text-black border-red-600 shadow-[2px_2px_0px_#ef4444]' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                            }`}
                          >
                            {b.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-zinc-850 flex items-center justify-between shrink-0">
                  <button
                    onClick={() => {
                      soundManager.playRollTick?.();
                      setActiveSlide(0);
                    }}
                    className="px-2.5 py-1 bg-zinc-800 text-zinc-300 font-display font-black italic text-xs uppercase -skew-x-12 flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>BACK</span>
                  </button>
                  <button
                    onClick={() => {
                      soundManager.playRollTick?.();
                      setActiveSlide(2);
                    }}
                    className="px-3 py-1 bg-white text-black font-display font-black italic text-xs uppercase -skew-x-12 flex items-center gap-1 cursor-pointer"
                  >
                    <span>NEXT: SETTINGS</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* SLIDE 2: LAB SETTINGS & LAUNCH DOCK */}
            {activeSlide === 2 && (
              <div className="flex-1 bg-zinc-950/90 border-2 border-zinc-800 p-3 flex flex-col justify-between overflow-hidden shadow-[3px_3px_0px_#000000]">
                <div className="flex items-center justify-between border-b-2 border-white pb-1.5 mb-2 shrink-0">
                  <span className="bg-white text-black px-2 py-0.5 text-xs font-mono font-black italic -skew-x-12">
                    03 // LAB SETTINGS
                  </span>
                  <span className="text-xs font-display font-black text-emerald-400 -skew-x-12">
                    OCTAGON SPAR
                  </span>
                </div>

                <div className="flex-1 space-y-2.5 overflow-y-auto pr-1 custom-scrollbar min-h-0">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setDummyConfig(p => ({ ...p, healthRecovery: !p.healthRecovery }))}
                      className={`p-2.5 -skew-x-12 border text-center font-display font-black uppercase text-xs transition cursor-pointer flex flex-col items-center gap-1 ${
                        dummyConfig.healthRecovery
                          ? 'bg-emerald-500 text-black border-white shadow-[2px_2px_0px_#000000]'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                      }`}
                    >
                      <Heart className="w-4 h-4" />
                      <span>HP REGEN: {dummyConfig.healthRecovery ? 'ON' : 'OFF'}</span>
                    </button>

                    <button
                      onClick={() => setDummyConfig(p => ({ ...p, staminaRecovery: !p.staminaRecovery }))}
                      className={`p-2.5 -skew-x-12 border text-center font-display font-black uppercase text-xs transition cursor-pointer flex flex-col items-center gap-1 ${
                        dummyConfig.staminaRecovery
                          ? 'bg-amber-400 text-black border-white shadow-[2px_2px_0px_#000000]'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                      }`}
                    >
                      <BatteryCharging className="w-4 h-4" />
                      <span>STAMINA: {dummyConfig.staminaRecovery ? 'MAX' : 'NORMAL'}</span>
                    </button>
                  </div>

                  {/* Summary Poster */}
                  <div className="bg-zinc-900 border border-zinc-700 p-2.5 -skew-x-12 text-xs font-mono space-y-1">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Your Fighter:</span>
                      <span className="text-white font-bold">{playerStyle.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Opponent:</span>
                      <span className="text-amber-400 font-bold">{dummyStyle.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Routine:</span>
                      <span className="text-emerald-400 font-bold">{dummyConfig.behavior.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                {/* Mobile Launch Button */}
                <div className="pt-2 border-t border-zinc-850 shrink-0">
                  <button
                    onClick={handleLaunch}
                    className="w-full py-2.5 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 text-black font-display font-black italic text-sm uppercase tracking-wider -skew-x-12 shadow-[3px_3px_0px_#ffffff] transition cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-black" />
                    <span>LAUNCH DOJO NOW</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. COMIC COLLAGE FOOTER TELEMETRY */}
      <div className="px-3 sm:px-6 py-1.5 bg-black border-t border-zinc-800 text-[10px] font-mono text-zinc-400 flex items-center justify-between shrink-0 select-none z-20">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-red-600 transform rotate-45 animate-pulse" />
          <span className="text-white font-bold uppercase">OCTAGON SPAR LAB // SECTION 1.25</span>
          <span className="text-zinc-600 hidden sm:inline">•</span>
          <span className="text-amber-400 font-bold hidden sm:inline">{dummyConfig.behavior.toUpperCase()} ROUTINE</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <span className="hidden sm:inline">ESC / TAP ✕ TO RETURN</span>
        </div>
      </div>
    </div>
  );
};
