import React, { useState, useEffect } from 'react';
import { 
  Play, Swords, Shield, Target, Activity, Zap, RotateCcw, 
  Sparkles, Check, ArrowLeft, X, Bot, Eye, Settings, Compass,
  Sliders, Flame, ChevronRight, Keyboard, Monitor, Smartphone
} from 'lucide-react';
import { PlayerStats, FightingStyle, MatchData } from '../../types';
import { FIGHTING_STYLES } from '../../data/styles';
import { soundManager } from '../SoundManager';
import { DummyConfig } from './types';

import { isPcDevice as detectIsPc, isMobileDevice } from '../../utils/deviceDetection';

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

  const [isPcDevice, setIsPcDevice] = useState<boolean>(() => {
    return detectIsPc() || (typeof window !== 'undefined' && window.innerWidth >= 1024);
  });

  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerHeight > window.innerWidth && isMobileDevice();
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsPcDevice(detectIsPc() || window.innerWidth >= 1024);
      setIsPortrait(window.innerHeight > window.innerWidth && isMobileDevice());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    } as any;

    onLaunchDojo(matchData);
  };

  // Keyboard navigation for PC Station
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
  }, [selectedPlayerStyleId, dummyConfig, handleLaunch, onClose]);

  return (
    <div
      id="full-screen-dojo-hub"
      className={`fixed inset-0 z-[120] bg-zinc-950 text-white flex flex-col pointer-events-auto select-none overflow-hidden transition-all duration-300 ${
        isNavHidden ? 'pl-0' : 'pl-14 sm:pl-16'
      }`}
    >
      {/* 1. TOP COMMAND HEADER */}
      <div className="px-4 sm:px-6 py-3 border-b border-zinc-850 bg-gradient-to-r from-zinc-950 via-zinc-900/90 to-zinc-950 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-md">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-display font-black italic uppercase tracking-wider text-white">
                PRACTICE & TRAINING DOJO
              </h1>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                OCTAGON LAB
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-zinc-400 font-mono hidden sm:block">
              Free sparring sandbox • Frame-data drills • Custom dummy AI simulation
            </p>
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleLaunch}
            className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white rounded-xl text-xs font-mono font-black uppercase tracking-wider transition cursor-pointer shadow-lg shadow-cyan-600/30 active:scale-95 flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Launch Dojo</span>
            <span className="hidden md:inline text-[9px] font-mono opacity-60">[T]</span>
          </button>

          <button
            onClick={() => {
              soundManager.playRollTick?.();
              onClose();
            }}
            className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition cursor-pointer"
            title="Exit Dojo Hub (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE: PC 3-COLUMN STATION vs MOBILE DYNAMIC TABS */}
      {isPcDevice ? (
        /* PC MULTI-COLUMN COMMAND WORKSTATION */
        <div className="flex-1 grid grid-cols-12 overflow-hidden min-h-0 divide-x divide-zinc-850">
          
          {/* COLUMN 1: FIGHTER STYLE SELECTION (4 cols) */}
          <div className="col-span-4 h-full flex flex-col bg-zinc-950/90 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
              <span className="text-xs font-display font-black uppercase text-zinc-300 flex items-center gap-1.5">
                <Swords className="w-4 h-4 text-cyan-400" />
                <span>1. Your Combat Style</span>
              </span>
              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase">
                {playerStyle.name}
              </span>
            </div>

            <div className="space-y-2">
              {FIGHTING_STYLES.map(style => {
                const isSelected = style.id === selectedPlayerStyleId;
                const isUndergoingRework = style.reworkStatus === 'undergoing_rework';
                const isUndergoingDev = style.reworkStatus === 'undergoing_development';
                const isUnavailable = isUndergoingRework || isUndergoingDev;
                const statusLabel = isUndergoingDev 
                  ? 'UNDERGOING DEVELOPMENT' 
                  : (isUndergoingRework ? 'UNDERGOING REWORK' : null);

                return (
                  <button
                    key={style.id}
                    disabled={isUnavailable}
                    onClick={() => {
                      if (isUnavailable) return;
                      setSelectedPlayerStyleId(style.id);
                      soundManager.playRollTick?.();
                    }}
                    className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between gap-3 ${
                      isUnavailable
                        ? 'opacity-40 cursor-not-allowed bg-zinc-950/40 border-zinc-900'
                        : isSelected
                          ? 'bg-cyan-950/60 border-cyan-500/70 shadow-md ring-1 ring-cyan-400/40 cursor-pointer'
                          : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 border border-white/20"
                        style={{ backgroundColor: style.color || '#333' }}
                      >
                        {style.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-display font-black uppercase text-white truncate flex items-center gap-1.5">
                          <span>{style.name}</span>
                          {statusLabel && (
                            <span className={`text-[7.5px] font-mono uppercase font-bold px-1.5 py-0.2 rounded border ${
                              isUndergoingDev
                                ? 'bg-cyan-950 text-cyan-400 border-cyan-500/40'
                                : 'bg-amber-950 text-amber-400 border-amber-500/40'
                            }`}>
                              {statusLabel}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400 truncate">
                          7.69% Drop • Speed: {(style.statModifiers.speed * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-cyan-500 text-black flex items-center justify-center text-[10px] font-black shrink-0">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* COLUMN 2: TRAINING DUMMY & BEHAVIOR MATRIX (4 cols) */}
          <div className="col-span-4 h-full flex flex-col bg-zinc-950/70 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
              <span className="text-xs font-display font-black uppercase text-zinc-300 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-amber-400" />
                <span>2. Sparring Dummy Config</span>
              </span>
              <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">
                {dummyStyle.name}
              </span>
            </div>

            {/* Dummy Style Picker Strip */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold">
                Dummy Fighting Style:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {FIGHTING_STYLES.filter(s => s.reworkStatus !== 'undergoing_rework' && s.reworkStatus !== 'undergoing_development').map(style => {
                  const isSelected = style.id === dummyConfig.styleId;
                  return (
                    <button
                      key={style.id}
                      onClick={() => {
                        setDummyConfig(prev => ({ ...prev, styleId: style.id }));
                        soundManager.playRollTick?.();
                      }}
                      className={`p-2 rounded-xl text-left border text-[11px] font-display font-bold uppercase transition flex items-center gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-amber-950/60 border-amber-500 text-amber-200'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: style.color }} />
                      <span className="truncate">{style.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dummy Behavior State Selector */}
            <div className="space-y-2 pt-2 border-t border-zinc-850">
              <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold">
                AI Behavior Routine:
              </label>
              <div className="space-y-1.5 font-mono text-xs">
                {[
                  { id: 'test_ai', label: '0. Test AI (Infinite HP)', desc: 'Dummy stays completely still with infinite HP for limitless combo testing.', key: '[0]' },
                  { id: 'idle', label: '1. Stationary / Idle', desc: 'Dummy stands in stance without acting for raw frame string testing.', key: '[1]' },
                  { id: 'block_only', label: '2. Permanent Guard & Parry', desc: 'Dummy permanently blocks to test guard break and chip damage.', key: '[2]' },
                  { id: 'counter', label: '3. Counter-Striker AI', desc: 'Dummy punishes whiffs and tests reaction speeds.', key: '[3]' },
                  { id: 'aggressive', label: '4. Full Combat AI Sparring', desc: 'Active aggressive sparring partner with full moveset.', key: '[4]' },
                ].map(b => {
                  const isSel = dummyConfig.behavior === b.id;
                  return (
                    <button
                      key={b.id}
                      onClick={() => {
                        setDummyConfig(prev => ({ ...prev, behavior: b.id as any }));
                        soundManager.playRollTick?.();
                      }}
                      className={`w-full p-2.5 rounded-xl border text-left transition cursor-pointer flex items-start justify-between gap-2 ${
                        isSel
                          ? 'bg-purple-950/60 border-purple-500/80 text-purple-200 shadow-sm'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs flex items-center gap-1.5">
                          <span>{b.label}</span>
                          <span className="text-[9px] opacity-60 text-purple-300">{b.key}</span>
                        </div>
                        <div className="text-[10px] text-zinc-400 font-sans mt-0.5">
                          {b.desc}
                        </div>
                      </div>
                      {isSel && <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* COLUMN 3: SIMULATION RULES & QUICK LAUNCH TELEMETRY (4 cols) */}
          <div className="col-span-4 h-full flex flex-col bg-zinc-950/90 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
              <span className="text-xs font-display font-black uppercase text-zinc-300 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>3. Simulation Parameters</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                ACTIVE LAB
              </span>
            </div>

            {/* Quick Parameter Toggles */}
            <div className="space-y-2 text-xs font-mono">
              <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 cursor-pointer">
                <span className="text-zinc-300">Instant Health Regeneration</span>
                <input
                  type="checkbox"
                  checked={dummyConfig.healthRecovery}
                  onChange={(e) => setDummyConfig(prev => ({ ...prev, healthRecovery: e.target.checked }))}
                  className="w-4 h-4 accent-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 cursor-pointer">
                <span className="text-zinc-300">Infinite / Fast Stamina</span>
                <input
                  type="checkbox"
                  checked={dummyConfig.staminaRecovery}
                  onChange={(e) => setDummyConfig(prev => ({ ...prev, staminaRecovery: e.target.checked }))}
                  className="w-4 h-4 accent-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 cursor-pointer">
                <span className="text-zinc-300">Instant M2 Heavy Strike Ready</span>
                <input
                  type="checkbox"
                  checked={dummyConfig.infiniteSuper}
                  onChange={(e) => setDummyConfig(prev => ({ ...prev, infiniteSuper: e.target.checked }))}
                  className="w-4 h-4 accent-emerald-500"
                />
              </label>
            </div>

            {/* Launch Hero Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/70 via-zinc-900 to-zinc-950 border border-cyan-500/50 space-y-3 mt-4 shadow-xl">
              <div className="flex items-center gap-2 text-xs font-display font-black uppercase text-cyan-300">
                <Target className="w-4 h-4 text-cyan-400" />
                <span>Ready to Spar</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                Jump into the Octagon with <strong className="text-white">{playerStyle.name}</strong> against <strong className="text-white">{dummyStyle.name}</strong> to master dodge cancels and frame traps.
              </p>

              <button
                onClick={handleLaunch}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white rounded-xl text-xs font-mono font-black uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Enter Practice Dojo [Space]</span>
              </button>
            </div>

            {/* Keyboard Shortcuts Guide */}
            <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-850 space-y-1.5 text-[10px] font-mono text-zinc-400">
              <div className="flex items-center gap-1 font-bold uppercase text-zinc-300">
                <Keyboard className="w-3.5 h-3.5 text-purple-400" />
                <span>Quick Hotkeys</span>
              </div>
              <div className="flex justify-between">
                <span>Launch Match:</span>
                <span className="text-cyan-300 font-bold">[T] or [Space]</span>
              </div>
              <div className="flex justify-between">
                <span>Set Dummy Behavior:</span>
                <span className="text-zinc-200 font-bold">[1] [2] [3] [4]</span>
              </div>
              <div className="flex justify-between">
                <span>Close Hub:</span>
                <span className="text-red-300 font-bold">[ESC]</span>
              </div>
            </div>

          </div>

        </div>
      ) : !isPortrait ? (
        /* MOBILE DYNAMIC LANDSCAPE WORKSPACE (ELIMINATES VERTICAL SCROLLING) */
        <div className="flex-1 grid grid-cols-12 gap-2.5 p-2.5 min-h-0 overflow-hidden">
          {/* Column 1: Styles (4 cols) */}
          <div className="col-span-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-2.5 flex flex-col justify-between overflow-y-auto custom-scrollbar">
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 flex items-center justify-between">
                <span>1. Your Style</span>
                <span className="text-cyan-400 truncate max-w-[90px]">{playerStyle.name}</span>
              </span>
              <div className="flex flex-wrap gap-1">
                {FIGHTING_STYLES.map(s => {
                  const isSel = s.id === selectedPlayerStyleId;
                  const isUndergoingRework = s.reworkStatus === 'undergoing_rework';
                  const isUndergoingDev = s.reworkStatus === 'undergoing_development';
                  const isUnavailable = isUndergoingRework || isUndergoingDev;

                  return (
                    <button
                      key={s.id}
                      disabled={isUnavailable}
                      onClick={() => {
                        if (isUnavailable) return;
                        setSelectedPlayerStyleId(s.id);
                        soundManager.playRollTick?.();
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-display font-black uppercase transition flex items-center gap-1 border ${
                        isUnavailable
                          ? 'opacity-40 cursor-not-allowed bg-zinc-950 text-zinc-500 border-zinc-900'
                          : isSel
                            ? 'bg-cyan-500 text-black border-cyan-400 font-black shadow-sm cursor-pointer'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 cursor-pointer'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="truncate max-w-[65px]">{s.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
              <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 flex items-center justify-between">
                <span>2. Dummy Style</span>
                <span className="text-amber-400 truncate max-w-[90px]">{dummyStyle.name}</span>
              </span>
              <div className="flex flex-wrap gap-1">
                {FIGHTING_STYLES.filter(s => s.reworkStatus !== 'undergoing_rework' && s.reworkStatus !== 'undergoing_development').map(s => {
                  const isSel = s.id === dummyConfig.styleId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setDummyConfig(prev => ({ ...prev, styleId: s.id }));
                        soundManager.playRollTick?.();
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-display font-black uppercase transition flex items-center gap-1 border cursor-pointer ${
                        isSel
                          ? 'bg-amber-500 text-black border-amber-400 font-black shadow-sm'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="truncate max-w-[65px]">{s.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Column 2: Behavior & Regens (5 cols) */}
          <div className="col-span-5 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-2.5 flex flex-col justify-between overflow-y-auto custom-scrollbar">
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 block">
                3. Dummy Routine:
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                {[
                  { id: 'idle', label: '1. Idle Stance' },
                  { id: 'block_only', label: '2. Permanent Guard' },
                  { id: 'counter', label: '3. Counter-Strike' },
                  { id: 'aggressive', label: '4. Sparring AI' },
                ].map(b => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setDummyConfig(prev => ({ ...prev, behavior: b.id as any }));
                      soundManager.playRollTick?.();
                    }}
                    className={`py-1.5 px-2 rounded-xl border text-left font-bold uppercase transition flex items-center justify-between cursor-pointer ${
                      dummyConfig.behavior === b.id
                        ? 'bg-purple-950 border-purple-500 text-purple-200 shadow-sm'
                        : 'bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span className="truncate">{b.label}</span>
                    {dummyConfig.behavior === b.id && <Check className="w-3 h-3 text-purple-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
              <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 block">
                4. Simulation Sandbox:
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                <button
                  onClick={() => setDummyConfig(p => ({ ...p, healthRecovery: !p.healthRecovery }))}
                  className={`py-1.5 px-2 rounded-xl border text-center font-bold uppercase transition cursor-pointer ${
                    dummyConfig.healthRecovery
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                  }`}
                >
                  HP Regen: {dummyConfig.healthRecovery ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => setDummyConfig(p => ({ ...p, staminaRecovery: !p.staminaRecovery }))}
                  className={`py-1.5 px-2 rounded-xl border text-center font-bold uppercase transition cursor-pointer ${
                    dummyConfig.staminaRecovery
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                  }`}
                >
                  Stamina: {dummyConfig.staminaRecovery ? 'MAX' : 'NORMAL'}
                </button>
              </div>
            </div>
          </div>

          {/* Column 3: Launch Hero (3 cols) */}
          <div className="col-span-3 bg-gradient-to-br from-cyan-950/70 via-zinc-900 to-zinc-950 border border-cyan-500/50 rounded-2xl p-2.5 flex flex-col justify-between shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[11px] font-display font-black uppercase text-cyan-300">
                <Target className="w-3.5 h-3.5 text-cyan-400" />
                <span>Octagon Spar</span>
              </div>
              <p className="text-[9.5px] text-zinc-300 leading-tight font-sans line-clamp-3">
                Master strike spacing with <strong className="text-white">{playerStyle.name}</strong> vs <strong className="text-white">{dummyStyle.name}</strong>.
              </p>
            </div>

            <button
              onClick={handleLaunch}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 text-white rounded-xl text-xs font-mono font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-600/30 active:scale-95 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Enter Dojo</span>
            </button>
          </div>
        </div>
      ) : (
        /* MOBILE TOUCH-FRIENDLY PORTRAIT DYNAMIC VIEW */
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          
          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 custom-scrollbar">
            
            {/* Player Style Selector Carousel */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold flex items-center justify-between">
                <span>Your Style:</span>
                <span className="text-cyan-400">{playerStyle.name}</span>
              </label>
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
                {FIGHTING_STYLES.map(s => {
                  const isSel = s.id === selectedPlayerStyleId;
                  const isUndergoingRework = s.reworkStatus === 'undergoing_rework';
                  const isUndergoingDev = s.reworkStatus === 'undergoing_development';
                  const isUnavailable = isUndergoingRework || isUndergoingDev;
                  const chipLabel = isUndergoingDev 
                    ? 'DEV' 
                    : (isUndergoingRework ? 'REWORK' : null);

                  return (
                    <button
                      key={s.id}
                      disabled={isUnavailable}
                      onClick={() => {
                        if (isUnavailable) return;
                        setSelectedPlayerStyleId(s.id);
                        soundManager.playRollTick?.();
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-display font-black uppercase shrink-0 transition flex items-center gap-1.5 border ${
                        isUnavailable
                          ? 'opacity-40 cursor-not-allowed bg-zinc-950 text-zinc-500 border-zinc-900'
                          : isSel
                            ? 'bg-cyan-500 text-black shadow-md border-cyan-400 font-black cursor-pointer'
                            : 'bg-zinc-900/90 text-zinc-400 border-zinc-800 cursor-pointer'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <span>{s.name}</span>
                      {chipLabel && (
                        <span className={`text-[7px] font-mono px-1 py-0.2 rounded border ${
                          isUndergoingDev
                            ? 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40'
                            : 'text-amber-400 border-amber-500/40 bg-amber-950/40'
                        }`}>
                          {chipLabel}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dummy Style Selector Carousel */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold flex items-center justify-between">
                <span>Dummy Style:</span>
                <span className="text-amber-400">{dummyStyle.name}</span>
              </label>
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
                {FIGHTING_STYLES.filter(s => s.reworkStatus !== 'undergoing_rework' && s.reworkStatus !== 'undergoing_development').map(s => {
                  const isSel = s.id === dummyConfig.styleId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setDummyConfig(prev => ({ ...prev, styleId: s.id }));
                        soundManager.playRollTick?.();
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-display font-black uppercase shrink-0 transition flex items-center gap-1.5 border cursor-pointer ${
                        isSel
                          ? 'bg-amber-500 text-black shadow-md border-amber-400 font-black'
                          : 'bg-zinc-900/90 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <span>{s.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dummy Behavior Chips */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold">
                Dummy Routine:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {[
                  { id: 'test_ai', label: '0. Test AI' },
                  { id: 'idle', label: '1. Idle' },
                  { id: 'block_only', label: '2. Guard' },
                  { id: 'counter', label: '3. Counter' },
                  { id: 'aggressive', label: '4. Sparring AI' },
                ].map(b => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setDummyConfig(prev => ({ ...prev, behavior: b.id as any }));
                      soundManager.playRollTick?.();
                    }}
                    className={`py-2 px-3 rounded-xl border text-left font-bold uppercase transition flex items-center justify-between ${
                      dummyConfig.behavior === b.id
                        ? 'bg-purple-950 border-purple-500 text-purple-200'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <span>{b.label}</span>
                    {dummyConfig.behavior === b.id && <Check className="w-3.5 h-3.5 text-purple-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulation Parameter Toggles */}
            <div className="space-y-1.5 pt-2">
              <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold">
                Regeneration:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <button
                  onClick={() => setDummyConfig(p => ({ ...p, healthRecovery: !p.healthRecovery }))}
                  className={`p-2.5 rounded-xl border text-center font-bold uppercase transition ${
                    dummyConfig.healthRecovery
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                  }`}
                >
                  HP Regen: {dummyConfig.healthRecovery ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => setDummyConfig(p => ({ ...p, staminaRecovery: !p.staminaRecovery }))}
                  className={`p-2.5 rounded-xl border text-center font-bold uppercase transition ${
                    dummyConfig.staminaRecovery
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                  }`}
                >
                  Stamina: {dummyConfig.staminaRecovery ? 'MAX' : 'NORMAL'}
                </button>
              </div>
            </div>

          </div>

          {/* Bottom Launch Button Dock */}
          <div className="p-3 bg-zinc-950/95 border-t border-zinc-850 shrink-0">
            <button
              onClick={handleLaunch}
              className="w-full py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 text-white rounded-xl text-xs font-mono font-black uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 active:scale-95"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Launch Practice Dojo</span>
            </button>
          </div>

        </div>
      )}

      {/* 3. FOOTER STATUS BAR */}
      <div className="px-4 py-1.5 border-t border-zinc-850 bg-zinc-950 text-[9px] font-mono text-zinc-400 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-zinc-300 font-bold uppercase">OCTAGON SPAR LAB</span>
          <span className="text-zinc-600 hidden sm:inline">•</span>
          <span className="text-zinc-400 hidden sm:inline">Dummy Routine: {dummyConfig.behavior.toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-500">
          <span>Press ESC or Tap ✕ to Exit</span>
        </div>
      </div>
    </div>
  );
};
