import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Flame, 
  Swords, 
  Target, 
  Settings, 
  Play, 
  ChevronDown, 
  ChevronRight, 
  User, 
  Bot, 
  Check, 
  Zap, 
  Shield, 
  Sparkles,
  LogOut
} from 'lucide-react';
import { FIGHTING_STYLES } from '../../data/styles';
import { FightingStyle } from '../../types';
import { soundManager } from '../SoundManager';

interface ModeSelectorOverlayProps {
  show: boolean;
  version: string;
  practiceModalTab: 'styles' | 'difficulty' | 'modifiers';
  setPracticeModalTab: (tab: 'styles' | 'difficulty' | 'modifiers') => void;
  dummyStyleId: string;
  setDummyStyleId: (id: string) => void;
  practicePlayerStyleId?: string;
  onPracticePlayerStyleChange?: (id: string) => void;
  dummyBehavior: string;
  setDummyBehavior: (behavior: any) => void;
  godMode: boolean;
  setGodMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  infiniteStamina: boolean;
  setInfiniteStamina: (val: boolean | ((prev: boolean) => boolean)) => void;
  infiniteAIStamina: boolean;
  setInfiniteAIStamina: (val: boolean | ((prev: boolean) => boolean)) => void;
  oneHitKODummy: boolean;
  setOneHitKODummy: (val: boolean | ((prev: boolean) => boolean)) => void;
  onExitArena: () => void;
  onInitiateCombat: () => void;
  isNavHidden?: boolean;
}

export const ModeSelectorOverlay: React.FC<ModeSelectorOverlayProps> = ({
  show,
  version,
  practiceModalTab,
  setPracticeModalTab,
  dummyStyleId,
  setDummyStyleId,
  practicePlayerStyleId = 'basic',
  onPracticePlayerStyleChange,
  dummyBehavior,
  setDummyBehavior,
  godMode,
  setGodMode,
  infiniteStamina,
  setInfiniteStamina,
  infiniteAIStamina,
  setInfiniteAIStamina,
  oneHitKODummy,
  setOneHitKODummy,
  onExitArena,
  onInitiateCombat,
}) => {
  // Target style subtab: 'player' (Your Style) vs 'dummy' (Enemy Style)
  const [styleTarget, setStyleTarget] = useState<'player' | 'dummy'>('player');

  const handleExitToMenu = () => {
    soundManager.playRollTick();
    onExitArena();
  };

  if (!show) return null;

  const activePlayerStyle = FIGHTING_STYLES.find((s) => s.id === practicePlayerStyleId) || FIGHTING_STYLES[0];
  const activeDummyStyle = FIGHTING_STYLES.find((s) => s.id === dummyStyleId) || FIGHTING_STYLES[0];

  const currentSelectedId = styleTarget === 'player' ? practicePlayerStyleId : dummyStyleId;

  const handleSelectStyle = (style: FightingStyle) => {
    if (styleTarget === 'player') {
      if (onPracticePlayerStyleChange) {
        onPracticePlayerStyleChange(style.id);
      }
    } else {
      setDummyStyleId(style.id);
      soundManager.playRollTick();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 text-white flex flex-col select-none overflow-hidden p-2.5 sm:p-5 landscape:p-2.5 transition-all">
      <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col h-full space-y-2 sm:space-y-3 overflow-hidden">
        
        {/* Top Header Row */}
        <div className="flex justify-between items-center border-b border-zinc-800 pb-2 sm:pb-2.5 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-red-600/20 border border-red-500/40 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.4)] shrink-0 select-none">
              <Flame className="w-5 h-5 text-red-500 fill-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            </div>
            <div>
              <h2 className="font-display font-black tracking-tight uppercase text-base sm:text-lg italic text-white flex items-center gap-2 leading-none">
                Practice Dojo <span className="text-[9px] sm:text-[10px] bg-red-600 text-white font-mono px-1.5 py-0.5 rounded not-italic font-black">NEURAL MATRIX</span>
              </h2>
              <p className="text-zinc-400 text-[9px] sm:text-[10px] font-mono leading-relaxed mt-0.5 uppercase tracking-wider">
                PROTOCOL v{version} • SYNAPSE SIMULATOR PROFILER
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="text-right font-mono text-[8px] sm:text-[9px] text-zinc-500 leading-tight hidden sm:block">
              <div className="text-emerald-400 font-bold flex items-center gap-1 justify-end">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>SYS READY</span>
              </div>
              <div>DOJO LOADOUT: ISOLATED</div>
            </div>

            {/* Clear Dedicated Exit Button */}
            <button
              onClick={handleExitToMenu}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-red-950/80 border border-zinc-700 hover:border-red-500/50 text-zinc-300 hover:text-red-300 rounded-xl text-xs font-mono font-bold uppercase transition cursor-pointer active:scale-95 shadow"
              title="Return to Main Menu"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit Dojo</span>
            </button>
          </div>
        </div>

        {/* Mobile Tab Selectors */}
        <div className="flex md:hidden grid grid-cols-4 gap-1 p-1 bg-zinc-950/80 rounded-xl border border-zinc-800 shrink-0">
          <button
            onClick={() => {
              setPracticeModalTab('styles');
              setStyleTarget('player');
              soundManager.playRollTick();
            }}
            className={`py-1.5 px-1 rounded-lg font-mono text-[8.5px] font-bold uppercase transition flex items-center justify-center gap-1 cursor-pointer truncate ${
              practiceModalTab === 'styles' && styleTarget === 'player'
                ? 'bg-red-950/80 text-red-400 border border-red-500/40 font-black shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <User className="w-3 h-3 shrink-0" />
            <span className="truncate">Your Style</span>
          </button>
          <button
            onClick={() => {
              setPracticeModalTab('styles');
              setStyleTarget('dummy');
              soundManager.playRollTick();
            }}
            className={`py-1.5 px-1 rounded-lg font-mono text-[8.5px] font-bold uppercase transition flex items-center justify-center gap-1 cursor-pointer truncate ${
              practiceModalTab === 'styles' && styleTarget === 'dummy'
                ? 'bg-amber-950/80 text-amber-400 border border-amber-500/40 font-black shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Bot className="w-3 h-3 shrink-0" />
            <span className="truncate">Enemy Style</span>
          </button>
          <button
            onClick={() => {
              setPracticeModalTab('difficulty');
              soundManager.playRollTick();
            }}
            className={`py-1.5 px-1 rounded-lg font-mono text-[8.5px] font-bold uppercase transition flex items-center justify-center gap-1 cursor-pointer truncate ${
              practiceModalTab === 'difficulty'
                ? 'bg-zinc-800 text-red-400 border border-red-500/30 font-black'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Target className="w-3 h-3 shrink-0" />
            <span className="truncate">AI Tier</span>
          </button>
          <button
            onClick={() => {
              setPracticeModalTab('modifiers');
              soundManager.playRollTick();
            }}
            className={`py-1.5 px-1 rounded-lg font-mono text-[8.5px] font-bold uppercase transition flex items-center justify-center gap-1 cursor-pointer truncate ${
              practiceModalTab === 'modifiers'
                ? 'bg-zinc-800 text-red-400 border border-red-500/30 font-black'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Settings className="w-3 h-3 shrink-0" />
            <span className="truncate">Mods</span>
          </button>
        </div>

        {/* Bento Grid Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 sm:gap-4 flex-1 overflow-hidden min-h-0">
          
          {/* Column 1: Style Selection (Player & Enemy Subtabs + Rarity Accordion) (6 Columns) */}
          <div className={`md:col-span-6 flex flex-col min-h-0 space-y-2 ${
            practiceModalTab !== 'styles' ? 'hidden md:flex' : 'flex'
          }`}>
            
            {/* Header & Subtab Switcher */}
            <div className="flex flex-col gap-1.5 shrink-0 border-b border-zinc-800 pb-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] sm:text-[11px] font-mono text-zinc-400 uppercase tracking-widest font-black flex items-center gap-2">
                  <Swords className="w-3.5 h-3.5 text-red-500" />
                  <span>1. COMBAT STYLE MATRIX ({FIGHTING_STYLES.length} STYLES)</span>
                </div>
              </div>

              {/* Subtab Buttons: Your Style vs Enemy Style */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-950/90 rounded-xl border border-zinc-800/90">
                <button
                  onClick={() => {
                    setStyleTarget('player');
                    soundManager.playRollTick();
                  }}
                  className={`p-2 rounded-lg text-left transition cursor-pointer flex items-center gap-2 ${
                    styleTarget === 'player'
                      ? 'bg-red-950/50 border border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                      : 'bg-zinc-900/40 hover:bg-zinc-900/80 border border-transparent text-zinc-400'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    styleTarget === 'player' ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-display font-black text-[10.5px] uppercase tracking-wide italic text-white truncate">
                        YOUR STYLE
                      </span>
                      <span className="text-[7.5px] font-mono uppercase px-1 py-0.2 rounded bg-zinc-900 text-red-400 font-bold border border-red-500/20 shrink-0">
                        PLAYER
                      </span>
                    </div>
                    <div className="text-[9px] font-mono text-zinc-400 truncate mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      <span className="text-zinc-200 font-bold">{activePlayerStyle.name}</span>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setStyleTarget('dummy');
                    soundManager.playRollTick();
                  }}
                  className={`p-2 rounded-lg text-left transition cursor-pointer flex items-center gap-2 ${
                    styleTarget === 'dummy'
                      ? 'bg-amber-950/50 border border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                      : 'bg-zinc-900/40 hover:bg-zinc-900/80 border border-transparent text-zinc-400'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    styleTarget === 'dummy' ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-display font-black text-[10.5px] uppercase tracking-wide italic text-white truncate">
                        ENEMY STYLE
                      </span>
                      <span className="text-[7.5px] font-mono uppercase px-1 py-0.2 rounded bg-zinc-900 text-amber-400 font-bold border border-amber-500/20 shrink-0">
                        REPLICANT
                      </span>
                    </div>
                    <div className="text-[9px] font-mono text-zinc-400 truncate mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span className="text-zinc-200 font-bold">{activeDummyStyle.name}</span>
                    </div>
                  </div>
                </button>
              </div>

              {/* Temporary Loadout Notice Banner */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-[8px] sm:text-[8.5px] font-mono text-zinc-400">
                <Sparkles className="w-3 h-3 text-red-400 shrink-0 animate-pulse" />
                <span className="truncate">
                  {styleTarget === 'player' 
                    ? '⚡ TEMPORARY SELECTION: Active inside Practice Dojo only (does not change your saved fighter profile).' 
                    : '⚡ ENEMY SELECTION: Sets the combat style and moveset for the sparring AI dummy.'}
                </span>
              </div>
            </div>

            {/* Scrollable Style Cards Grid */}
            <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar min-h-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                {FIGHTING_STYLES.map((style) => {
                  const isSelected = currentSelectedId === style.id;
                  const isUndergoingRework = style.reworkStatus === 'undergoing_rework';
                  const isUndergoingDev = style.reworkStatus === 'undergoing_development';
                  const isUnavailable = isUndergoingRework || isUndergoingDev;
                  const badgeText = isUndergoingDev 
                    ? 'DEV' 
                    : (isUndergoingRework ? 'REWORK' : null);
                  const speedMod = style.statModifiers?.speed || 1.0;
                  const reachMod = style.statModifiers?.reach || 1.0;
                  const powerMod = style.statModifiers?.power || 1.0;

                  return (
                    <button
                      key={style.id}
                      disabled={isUnavailable}
                      onClick={() => {
                        if (isUnavailable) return;
                        handleSelectStyle(style);
                      }}
                      className={`p-2 sm:p-2.5 rounded-xl border text-left transition flex flex-col justify-between relative group ${
                        isUnavailable
                          ? 'opacity-40 cursor-not-allowed bg-zinc-950/40 border-zinc-900'
                          : isSelected
                            ? 'bg-red-950/40 border-red-500 ring-1 ring-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.2)] cursor-pointer'
                            : 'bg-zinc-900/70 hover:bg-zinc-900 border-zinc-800/80 hover:border-zinc-700 cursor-pointer'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex justify-between items-start gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div 
                            className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/30"
                            style={{ backgroundColor: style.color || '#fff' }}
                          />
                          <span className="font-display font-black text-[11px] sm:text-xs uppercase italic text-white tracking-wide truncate">
                            {style.name}
                          </span>
                        </div>

                        {badgeText ? (
                          <span className={`text-[7px] font-mono uppercase font-black px-1.5 py-0.5 rounded border flex items-center gap-0.5 shrink-0 ${
                            isUndergoingDev
                              ? 'bg-cyan-950 text-cyan-400 border-cyan-500/50'
                              : 'bg-amber-950 text-amber-400 border-amber-500/50'
                          }`}>
                            <span>{badgeText}</span>
                          </span>
                        ) : isSelected ? (
                          <span className="text-[7.5px] font-mono uppercase font-black px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/50 flex items-center gap-0.5 shrink-0 animate-pulse">
                            <Check className="w-2.5 h-2.5" />
                            <span>EQUIPPED</span>
                          </span>
                        ) : null}
                      </div>

                      {/* Passive Name & Snippet */}
                      <div className="mt-1 min-w-0">
                        <div className="text-[8px] sm:text-[8.5px] font-mono font-bold text-red-400 truncate">
                          {style.passiveName}
                        </div>
                        <div className="text-[7.5px] sm:text-[8px] text-zinc-400 line-clamp-2 font-sans mt-0.5 leading-snug">
                          {style.description}
                        </div>
                      </div>

                      {/* Key Stats Row */}
                      <div className="mt-1.5 pt-1 border-t border-zinc-800/60 flex items-center justify-between text-[7px] sm:text-[7.5px] font-mono text-zinc-400">
                        <span>SPD: <strong className="text-zinc-200">{speedMod}x</strong></span>
                        <span>RCH: <strong className="text-zinc-200">{reachMod}x</strong></span>
                        <span>PWR: <strong className="text-zinc-200">{powerMod}x</strong></span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Column 2: AI Behavior & Sparring Tier (3 Columns) */}
          <div className={`md:col-span-3 flex flex-col min-h-0 space-y-2 ${
            practiceModalTab !== 'difficulty' ? 'hidden md:flex' : 'flex'
          }`}>
            <div className="text-[10px] sm:text-[11px] font-mono text-zinc-400 uppercase tracking-widest font-black flex items-center gap-2 border-b border-zinc-800/80 pb-1 shrink-0">
              <Target className="w-3.5 h-3.5 text-red-500" />
              <span>2. SPARRING PROTOCOL & TIER</span>
            </div>

            <div className="space-y-1.5 sm:space-y-2 overflow-y-auto flex-1 pr-1 custom-scrollbar min-h-0">
              {[
                { id: 'test_ai', label: 'Test AI (Infinite HP)', desc: 'Stays completely still with infinite HP. Zero attacks, movement, or guard.', stats: 'HP: ∞ • Action: None' },
                { id: 'passive', label: 'Passive Dummy', desc: 'Completely stationary. Designed for custom hit combos.', stats: 'Dodge: 0% • Parry: 0%' },
                { id: 'block', label: 'Active Guard', desc: 'Fighter maintains strict cover, parrying & blocking.', stats: 'Dodge: 0% • Parry: 15%' },
                { id: 'rookie', label: 'Rookie AI', desc: 'Standard tactical logic. Basic attack and block chains.', stats: 'Dodge: 16% • Parry: 10%' },
                { id: 'silver', label: 'Silver Competitor', desc: 'Fluid pacing. Employs dodges and active counters.', stats: 'Dodge: 30% • Parry: 20%' },
                { id: 'gold', label: 'Gold Challenger', desc: 'Aggressive stance. Uses feints and rapid whiff punishes.', stats: 'Dodge: 50% • Parry: 34%' },
                { id: 'diamond', label: 'Diamond Champion', desc: 'High-speed footwork, frame traps, tight parry windows.', stats: 'Dodge: 70% • Parry: 48%' },
                { id: 'amethyst', label: 'Amethyst Overlord', desc: 'Near frame-perfect reactions. Extreme baited counters.', stats: 'Dodge: 85% • Parry: 65%' },
              ].map((tier) => {
                const isSelected = dummyBehavior === tier.id;
                return (
                  <button
                    key={tier.id}
                    onClick={() => {
                      setDummyBehavior(tier.id as any);
                      soundManager.playRollTick();
                    }}
                    className={`w-full p-2 sm:p-2.5 rounded-xl text-left border transition cursor-pointer flex gap-2 sm:gap-3 items-center ${
                      isSelected
                        ? 'bg-zinc-900 border-white/20 shadow-[0_4px_20px_rgba(255,255,255,0.05)] ring-1 ring-white/10'
                        : 'bg-zinc-950/40 border-zinc-900 hover:bg-zinc-900/20'
                    }`}
                  >
                    <div className={`w-1.5 h-8 sm:h-9 rounded-full shrink-0 transition-all ${isSelected ? 'bg-red-500' : 'bg-zinc-800'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center gap-1">
                        <div className="font-display font-black text-[10px] sm:text-[11px] uppercase italic text-white truncate">
                          {tier.label}
                        </div>
                        <span className="text-[7px] sm:text-[8px] font-mono text-zinc-500 shrink-0">{tier.stats}</span>
                      </div>
                      <div className="text-[9px] text-zinc-400 truncate mt-0.5">{tier.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Column 3: Sandbox Modifiers & Parameters (3 Columns) */}
          <div className={`md:col-span-3 flex flex-col min-h-0 space-y-2 ${
            practiceModalTab !== 'modifiers' ? 'hidden md:flex' : 'flex'
          }`}>
            <div className="text-[10px] sm:text-[11px] font-mono text-zinc-400 uppercase tracking-widest font-black flex items-center gap-2 border-b border-zinc-800/80 pb-1 shrink-0">
              <Settings className="w-3.5 h-3.5 text-red-500" />
              <span>3. MATRIX PARAMETERS</span>
            </div>

            <div className="space-y-1.5 sm:space-y-2 overflow-y-auto flex-1 pr-1 custom-scrollbar min-h-0">
              {[
                { label: 'PLAYER GOD MODE', state: godMode, setter: setGodMode, desc: 'Bypass incoming HP damage entirely.' },
                { label: 'INFINITE STAMINA', state: infiniteStamina, setter: setInfiniteStamina, desc: 'Zero attack & dodge stamina fatigue.' },
                { label: 'INFINITE AI STAMINA', state: infiniteAIStamina, setter: setInfiniteAIStamina, desc: 'AI dummy has non-stop endurance.' },
                { label: 'ONE-HIT ELIMINATION', state: oneHitKODummy, setter: setOneHitKODummy, desc: 'Settle simulations with a single hit.' },
              ].map((modifier, index) => (
                <button
                  key={index}
                  onClick={() => {
                    modifier.setter((prev: boolean) => !prev);
                    soundManager.playRollTick();
                  }}
                  className={`w-full p-2 sm:p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                    modifier.state
                      ? 'bg-emerald-950/25 border-emerald-500/40 text-white ring-1 ring-emerald-500/20'
                      : 'bg-zinc-950/30 border-zinc-900 text-zinc-400 hover:bg-zinc-900/30'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="font-mono font-black text-[9px] sm:text-[10px] uppercase tracking-wide">{modifier.label}</div>
                    <p className="text-[8px] sm:text-[9px] text-zinc-500 mt-0.5 leading-tight">{modifier.desc}</p>
                  </div>
                  <div className={`w-6 h-3.5 sm:w-7 sm:h-4 rounded-full p-0.5 transition-colors shrink-0 ${modifier.state ? 'bg-emerald-500' : 'bg-zinc-800'}`}>
                    <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white transition-transform ${modifier.state ? 'translate-x-2.5 sm:translate-x-3' : 'translate-x-0'}`} />
                  </div>
                </button>
              ))}
            </div>

            {/* Cautionary Info Box */}
            <div className="bg-zinc-900/40 p-2 rounded-xl border border-zinc-850/60 text-[8px] sm:text-[9px] font-mono text-zinc-500 text-center uppercase tracking-wider leading-tight shrink-0">
              ⚡ Practice matrix bypasses ELO tracking for freeform experimentation.
            </div>
          </div>
        </div>

        {/* Bottom Action Button */}
        <div className="border-t border-zinc-800 pt-2 sm:pt-2.5 shrink-0 flex items-center justify-center">
          <button
            onClick={() => {
              soundManager.playPunch();
              onInitiateCombat();
            }}
            className="w-full max-w-xl py-3 px-6 bg-red-600 hover:bg-red-500 text-white font-display font-black uppercase tracking-widest italic rounded-xl text-xs sm:text-sm transition active:scale-[0.98] shadow-lg shadow-red-900/40 flex items-center justify-center gap-2 cursor-pointer animate-pulse hover:animate-none"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>INITIATE COMBAT SIMULATION</span>
          </button>
        </div>
      </div>
    </div>
  );
};
