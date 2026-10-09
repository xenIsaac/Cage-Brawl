import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  User,
  Bot,
  Sliders,
  Swords,
  Target,
  RefreshCw,
  LogOut,
  ChevronRight,
  Shield,
  Zap,
  Crosshair,
  Sparkles,
  RotateCcw,
  Compass,
  Gauge,
  Activity,
  Pause,
  Play,
  Flame,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { FIGHTING_STYLES } from '../../data/styles';
import { soundManager } from '../SoundManager';

interface TrainingDrawerProps {
  show: boolean;
  isTrainingHudOpen: boolean;
  setIsTrainingHudOpen: (open: boolean) => void;
  trainingHudTab: 'style' | 'ai' | 'mods' | 'stats';
  setTrainingHudTab: (tab: 'style' | 'ai' | 'mods' | 'stats') => void;
  practicePlayerStyleId: string;
  onPracticePlayerStyleChange: (id: string) => void;
  practicePlayerHeightInInches: number;
  onPracticePlayerHeightChange: (height: number) => void;
  dummyStyleId: string;
  onDummyStyleChange: (id: string) => void;
  dummyBehavior: string;
  onDummyBehaviorChange: (tier: string) => void;
  dummyM1Speed?: 'slow' | 'medium' | 'fast';
  onDummyM1SpeedChange?: (speed: 'slow' | 'medium' | 'fast') => void;
  dummyHeightInInches: number;
  onDummyHeightChange: (height: number) => void;
  dummyFollow?: boolean;
  onDummyFollowChange?: (val: boolean | ((prev: boolean) => boolean)) => void;
  godMode: boolean;
  setGodMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  infiniteStamina: boolean;
  setInfiniteStamina: (val: boolean | ((prev: boolean) => boolean)) => void;
  infiniteAIStamina: boolean;
  setInfiniteAIStamina: (val: boolean | ((prev: boolean) => boolean)) => void;
  oneHitKODummy: boolean;
  setOneHitKODummy: (val: boolean | ((prev: boolean) => boolean)) => void;
  onRefreshM1Sequence?: () => void;
  onResetM2Cooldown?: () => void;
  totalDamageDealt: number;
  totalHitsLanded: number;
  streak?: number;
  // Enhanced Telemetry & Combat Tools
  showHitboxes?: boolean;
  setShowHitboxes?: (val: boolean | ((prev: boolean) => boolean)) => void;
  totalDamageTaken?: number;
  totalSwings?: number;
  totalParries?: number;
  totalBlocks?: number;
  maxCombo?: number;
  opponentDistance?: number;
  playerCombatState?: string;
  dummyCombatState?: string;
  freezeAI?: boolean;
  setFreezeAI?: (val: boolean | ((prev: boolean) => boolean)) => void;
  onCenterDummy?: () => void;
  onClearTelemetry?: () => void;
  onResetTrainingSession: () => void;
  onExitArena: () => void;
  getStyleRarityColor?: (rarity: string) => string;
  isNavHidden?: boolean;
}

const RANK_TIERS = [
  { id: 'bronze', label: 'Bronze Bot', badge: 'Bronze', desc: 'Basics & low aggression.' },
  { id: 'silver', label: 'Silver Bot', badge: 'Silver', desc: 'Consistent light strikes.' },
  { id: 'gold', label: 'Gold Bot', badge: 'Gold', desc: 'Aggressive pocket brawler.' },
  { id: 'platinum', label: 'Platinum Bot', badge: 'Plat', desc: 'High reaction speed & whiffs.' },
  { id: 'diamond', label: 'Diamond Bot', badge: 'Diam', desc: 'Elite tournament sparring.' },
  { id: 'amethyst', label: 'Amethyst Bot', badge: 'Ameth', desc: 'Near-instant reaction times.' },
  { id: 'master', label: 'Master Bot', badge: 'Master', desc: 'Pinnacle combat counter-AI.' },
];

export const TrainingDrawer: React.FC<TrainingDrawerProps> = ({
  show,
  isTrainingHudOpen,
  setIsTrainingHudOpen,
  trainingHudTab,
  setTrainingHudTab,
  practicePlayerStyleId,
  onPracticePlayerStyleChange,
  practicePlayerHeightInInches,
  onPracticePlayerHeightChange,
  dummyStyleId,
  onDummyStyleChange,
  dummyBehavior,
  onDummyBehaviorChange,
  dummyM1Speed = 'medium',
  onDummyM1SpeedChange,
  dummyHeightInInches,
  onDummyHeightChange,
  dummyFollow = false,
  onDummyFollowChange,
  godMode,
  setGodMode,
  infiniteStamina,
  setInfiniteStamina,
  infiniteAIStamina,
  setInfiniteAIStamina,
  oneHitKODummy,
  setOneHitKODummy,
  onRefreshM1Sequence,
  onResetM2Cooldown,
  totalDamageDealt,
  totalHitsLanded,
  showHitboxes = false,
  setShowHitboxes,
  totalDamageTaken = 0,
  totalSwings = 0,
  totalParries = 0,
  totalBlocks = 0,
  maxCombo = 0,
  opponentDistance = 0,
  playerCombatState = 'NEUTRAL',
  dummyCombatState = 'NEUTRAL',
  freezeAI = false,
  setFreezeAI,
  onCenterDummy,
  onClearTelemetry,
  onResetTrainingSession,
  onExitArena,
  getStyleRarityColor,
  isNavHidden = false,
}) => {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window !== 'undefined') {
        const isLand = window.innerWidth > window.innerHeight || (window.matchMedia?.('(orientation: landscape)').matches ?? false);
        setIsLandscape(isLand);
      }
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!show) return null;

  const getActiveBehaviorTitle = () => {
    if (dummyBehavior === 'test_ai') return 'TEST AI (INFINITE HP)';
    if (dummyBehavior === 'passive') return 'PASSIVE STAND';
    if (dummyBehavior === 'active_guard_mindless') return 'MINDLESS GUARD';
    if (dummyBehavior === 'active_guard_sentient' || dummyBehavior === 'block') return 'SENTIENT GUARD';
    if (dummyBehavior === 'auto_parry') return 'AUTO PARRY';
    if (dummyBehavior === 'attack_m1') return 'AUTO M1';
    if (dummyBehavior === 'attack_m2') return 'AUTO M2';
    if (dummyBehavior === 'attack_m1_on_block') return 'AUTO M1 (ON BLOCK)';
    if (dummyBehavior === 'attack_m2_on_block') return 'AUTO M2 (ON BLOCK)';
    const rank = RANK_TIERS.find((r) => r.id === dummyBehavior);
    if (rank) return `${rank.badge.toUpperCase()} AI`;
    return dummyBehavior.toUpperCase();
  };

  const accuracy = totalSwings > 0 ? Math.min(100, Math.round((totalHitsLanded / totalSwings) * 100)) : 0;

  let distanceCategory = 'OUTSIDE';
  let distanceColor = 'text-zinc-400 border-zinc-700 bg-zinc-900/60';
  if (opponentDistance <= 110) {
    distanceCategory = 'CQC POCKET';
    distanceColor = 'text-rose-400 border-rose-500/40 bg-rose-950/30';
  } else if (opponentDistance <= 175) {
    distanceCategory = 'INFIGHT';
    distanceColor = 'text-amber-400 border-amber-500/40 bg-amber-950/30';
  } else if (opponentDistance <= 250) {
    distanceCategory = 'MID RANGE';
    distanceColor = 'text-cyan-400 border-cyan-500/40 bg-cyan-950/30';
  }

  return (
    <div
      className={`absolute z-30 pointer-events-auto select-none transition-all duration-300 ${
        isLandscape
          ? 'top-2 sm:top-3 left-2 sm:left-3'
          : 'top-12 sm:top-16 left-2 sm:left-4'
      }`}
    >
      <AnimatePresence mode="wait">
        {isTrainingHudOpen ? (
          <motion.div
            onWheel={(e) => e.stopPropagation()}
            initial={{ opacity: 0, x: -16, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -16, scale: 0.98 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className={`bg-zinc-950/95 border border-cyan-500/30 rounded-2xl ${
              isLandscape
                ? 'w-[340px] sm:w-[380px] max-w-[calc(100vw-16px)] h-[calc(100vh-16px)] max-h-[calc(100vh-16px)]'
                : 'w-[calc(100vw-20px)] sm:w-[420px] max-h-[calc(100vh-68px)]'
            } overflow-hidden flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.85)] backdrop-blur-2xl text-zinc-300 font-mono text-[11px]`}
          >
            {/* 1. HUD HEADER */}
            <div className="p-2.5 sm:p-3 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-display font-black italic uppercase text-xs sm:text-sm text-white tracking-wide">
                      Practice Dojo Matrix
                    </span>
                    <span className="text-[8px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.2 rounded-full font-mono font-bold">
                      DOJO
                    </span>
                  </div>
                  <div className="text-[9px] text-zinc-400 flex items-center gap-1">
                    <span>Target:</span>
                    <span className="text-amber-400 font-bold truncate max-w-[150px]">
                      {getActiveBehaviorTitle()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsTrainingHudOpen(false)}
                  className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition cursor-pointer"
                  title="Minimize Dojo HUD"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 2. TAB NAVIGATION BAR */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-900/80 border-b border-zinc-800 shrink-0">
              {[
                { id: 'style', label: 'FIGHTER', icon: User },
                { id: 'ai', label: 'AI BOT', icon: Bot },
                { id: 'mods', label: 'MODS', icon: Sliders },
                { id: 'stats', label: 'DATA', icon: Activity },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = trainingHudTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setTrainingHudTab(tab.id as any);
                      soundManager.playRollTick();
                    }}
                    className={`py-1.5 px-1 rounded-xl font-mono text-[9px] font-bold uppercase transition flex items-center justify-center gap-1 cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                    }`}
                  >
                    <Icon className="w-3 h-3 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* 3. SCROLLABLE TAB CONTENT */}
            <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-2.5 custom-scrollbar">
              {/* TAB 1: PLAYER STANCE & HEIGHT */}
              {trainingHudTab === 'style' && (
                <div className="space-y-2.5">
                  <div className="bg-zinc-900/70 p-2.5 rounded-xl border border-zinc-800 space-y-1.5">
                    <span className="text-[9px] font-bold uppercase text-zinc-400 flex items-center gap-1">
                      <Swords className="w-3 h-3 text-cyan-400" />
                      Active Stance Mastery
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-0.5">
                      {FIGHTING_STYLES.map((st) => {
                        const isUndergoingRework = st.reworkStatus === 'undergoing_rework';
                        const isUndergoingDev = st.reworkStatus === 'undergoing_development' || st.reworkStatus === 'testing';
                        const isTesting = isUndergoingRework || isUndergoingDev || st.isBlocked;
                        const badgeText = isUndergoingDev 
                          ? 'DEV' 
                          : (isUndergoingRework ? 'REWORK' : (isTesting ? 'TEST' : null));

                        return (
                          <button
                            key={st.id}
                            onClick={() => {
                              soundManager.playRollTick();
                              onPracticePlayerStyleChange(st.id);
                            }}
                            className={`p-1.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                              practicePlayerStyleId === st.id
                                ? 'bg-cyan-950/70 border-cyan-400 text-white shadow-sm'
                                : isTesting
                                  ? 'bg-zinc-950/90 border-amber-900/40 hover:border-amber-700/60 text-zinc-300'
                                  : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700 text-zinc-400'
                            }`}
                          >
                            <div className="text-[9.5px] font-display font-black italic uppercase truncate flex items-center justify-between">
                              <span>{st.name}</span>
                              {badgeText && (
                                <span className={`text-[7px] font-mono border px-1 py-0.2 rounded font-bold ${
                                  isUndergoingDev
                                    ? 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40'
                                    : 'text-amber-400 border-amber-500/40 bg-amber-950/40'
                                }`}>
                                  {badgeText}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Player Height Slider */}
                  <div className="bg-zinc-900/70 p-2.5 rounded-xl border border-zinc-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="font-bold uppercase text-zinc-400">Player Stature</span>
                      <span className="text-cyan-300 font-bold">
                        {Math.floor(practicePlayerHeightInInches / 12)}'{practicePlayerHeightInInches % 12}" ({practicePlayerHeightInInches} in)
                      </span>
                    </div>
                    <input
                      type="range"
                      min="59"
                      max="86"
                      step="1"
                      value={practicePlayerHeightInInches}
                      onChange={(e) => onPracticePlayerHeightChange(parseInt(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: AI DUMMY BEHAVIOR & STYLES */}
              {trainingHudTab === 'ai' && (
                <div className="space-y-2.5">
                  {/* AI Style Selection */}
                  <div className="bg-zinc-900/70 p-2 rounded-xl border border-zinc-800 space-y-1">
                    <span className="text-[9px] font-bold uppercase text-zinc-400 flex items-center gap-1">
                      <Bot className="w-3 h-3 text-red-400" />
                      Opponent Style
                    </span>
                    <div className="grid grid-cols-2 gap-1 max-h-[110px] overflow-y-auto custom-scrollbar pr-0.5">
                      {FIGHTING_STYLES.map((st) => {
                        const isUndergoingRework = st.reworkStatus === 'undergoing_rework';
                        const isUndergoingDev = st.reworkStatus === 'undergoing_development' || st.reworkStatus === 'testing';
                        const isTesting = isUndergoingRework || isUndergoingDev || st.isBlocked;
                        const badgeText = isUndergoingDev ? 'DEV' : (isUndergoingRework ? 'REWORK' : (isTesting ? 'TEST' : null));

                        return (
                          <button
                            key={st.id}
                            onClick={() => {
                              soundManager.playRollTick();
                              onDummyStyleChange(st.id);
                            }}
                            className={`p-1.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                              dummyStyleId === st.id
                                ? 'bg-red-950/70 border-red-400 text-white shadow-sm'
                                : isTesting
                                  ? 'bg-zinc-950/90 border-amber-900/40 hover:border-amber-700/60 text-zinc-300'
                                  : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700 text-zinc-400'
                            }`}
                          >
                            <div className="text-[9px] font-display font-black italic uppercase truncate">
                              {st.name}
                            </div>
                            {badgeText && (
                              <span className="text-[6.5px] font-mono border px-1 py-0.2 rounded font-bold text-amber-400 border-amber-500/40 bg-amber-950/40">
                                {badgeText}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI Behavior Protocols */}
                  <div className="bg-zinc-900/70 p-2.5 rounded-xl border border-zinc-800 space-y-2">
                    <span className="text-[9px] font-bold uppercase text-zinc-400">Behavior Protocols</span>
                    
                    {/* Passive & Reactive */}
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { id: 'test_ai', label: 'Test AI (Infinite HP)' },
                        { id: 'passive', label: 'Passive Stand' },
                        { id: 'active_guard_sentient', label: 'Guard Block' },
                        { id: 'auto_parry', label: 'Auto Parry' },
                        { id: 'attack_m1', label: 'Continuous M1' },
                        { id: 'attack_m2', label: 'Heavy M2 Strike' },
                        { id: 'attack_m1_on_block', label: 'Punish On Block' },
                      ].map((tier) => (
                        <button
                          key={tier.id}
                          onClick={() => onDummyBehaviorChange(tier.id)}
                          className={`py-1.5 px-2 rounded-lg text-center font-mono text-[8.5px] font-bold uppercase border transition cursor-pointer ${
                            tier.id === 'test_ai' ? 'col-span-2' : ''
                          } ${
                            dummyBehavior === tier.id
                              ? tier.id === 'test_ai'
                                ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/60 shadow-sm'
                                : 'bg-red-500/25 text-red-300 border-red-500/60 shadow-sm'
                              : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                          }`}
                        >
                          {tier.label}
                        </button>
                      ))}
                    </div>

                    {/* Ranked AI Bot Roster */}
                    <div>
                      <div className="text-[8px] uppercase font-bold text-zinc-500 mb-1">Ranked Ladder Bots</div>
                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
                        {RANK_TIERS.map((rank) => (
                          <button
                            key={rank.id}
                            onClick={() => onDummyBehaviorChange(rank.id)}
                            className={`py-1.5 px-0.5 rounded-lg text-center font-mono text-[8px] font-bold uppercase border transition cursor-pointer ${
                              dummyBehavior === rank.id
                                ? 'bg-rose-950/70 text-rose-300 border-rose-500/60 shadow-sm'
                                : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:text-zinc-300'
                            }`}
                          >
                            {rank.badge}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* AI Height & Follow Command */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-zinc-900/70 p-2 rounded-xl border border-zinc-800 space-y-1">
                      <span className="text-[8.5px] font-bold uppercase text-zinc-400">Follow Command</span>
                      <button
                        onClick={() => onDummyFollowChange?.((v) => !v)}
                        className={`w-full py-1 px-1.5 rounded-lg text-[8px] font-bold uppercase border transition cursor-pointer flex items-center justify-center gap-1 ${
                          dummyFollow
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                            : 'bg-zinc-950 text-zinc-500 border-zinc-800'
                        }`}
                      >
                        <User className="w-2.5 h-2.5" />
                        <span>{dummyFollow ? 'FOLLOWING' : 'STATIONARY'}</span>
                      </button>
                    </div>

                    <div className="bg-zinc-900/70 p-2 rounded-xl border border-zinc-800 space-y-1">
                      <div className="flex items-center justify-between text-[8.5px]">
                        <span className="font-bold uppercase text-zinc-400">AI Height</span>
                        <span className="text-red-400 font-bold">
                          {Math.floor(dummyHeightInInches / 12)}'{dummyHeightInInches % 12}"
                        </span>
                      </div>
                      <input
                        type="range"
                        min="59"
                        max="86"
                        step="1"
                        value={dummyHeightInInches}
                        onChange={(e) => onDummyHeightChange(parseInt(e.target.value))}
                        className="w-full accent-red-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SPARRING MODIFIERS */}
              {trainingHudTab === 'mods' && (
                <div className="space-y-2">
                  {[
                    {
                      label: 'God Mode (Invulnerability)',
                      desc: 'Player takes 0 damage and health remains full.',
                      state: godMode,
                      toggle: () => setGodMode((v) => !v),
                    },
                    {
                      label: 'Infinite Player Stamina',
                      desc: 'Dash, block, and strike continuously without exhaustion.',
                      state: infiniteStamina,
                      toggle: () => setInfiniteStamina((v) => !v),
                    },
                    {
                      label: 'Infinite AI Dummy Stamina',
                      desc: 'Bot never exhausts guard or attack meter.',
                      state: infiniteAIStamina,
                      toggle: () => setInfiniteAIStamina((v) => !v),
                    },
                    {
                      label: '1-Hit KO Sparring Mode',
                      desc: 'Any landed strike immediately knocks out opponent.',
                      state: oneHitKODummy,
                      toggle: () => setOneHitKODummy((v) => !v),
                    },
                  ].map((mod, idx) => (
                    <button
                      key={idx}
                      onClick={mod.toggle}
                      className="w-full p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 flex items-center justify-between text-left transition cursor-pointer"
                    >
                      <div className="pr-2">
                        <div className="font-bold text-xs uppercase text-white flex items-center gap-1.5">
                          <span>{mod.label}</span>
                          {mod.state && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
                        </div>
                        <p className="text-[9px] text-zinc-400 mt-0.5 leading-snug">{mod.desc}</p>
                      </div>

                      <div
                        className={`w-8 h-4.5 rounded-full p-0.5 transition-colors shrink-0 ${
                          mod.state ? 'bg-emerald-500' : 'bg-zinc-800'
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                            mod.state ? 'translate-x-3.5' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* TAB 4: TELEMETRY & LAB CONTROLS */}
              {trainingHudTab === 'stats' && (
                <div className="space-y-2">
                  {/* Hitbox Toggle */}
                  <div
                    onClick={() => setShowHitboxes?.((prev) => !prev)}
                    className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                      showHitboxes
                        ? 'bg-cyan-950/60 border-cyan-400 text-white'
                        : 'bg-zinc-900/80 border-zinc-800 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Crosshair className="w-4 h-4 text-cyan-400" />
                      <div>
                        <div className="text-xs font-bold uppercase">Hitbox & Hurtbox Overlays</div>
                        <div className="text-[9px] text-zinc-400">Live strike ranges & collision frames</div>
                      </div>
                    </div>
                    <span className={`text-[8.5px] font-mono font-bold px-2 py-0.5 rounded ${
                      showHitboxes ? 'bg-cyan-400 text-zinc-950' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {showHitboxes ? 'ACTIVE' : 'OFF'}
                    </span>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
                    <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
                      <span className="text-[8px] uppercase text-zinc-500 font-bold block">Damage Output</span>
                      <span className="text-rose-400 font-black text-sm">{Math.round(totalDamageDealt)} HP</span>
                    </div>
                    <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
                      <span className="text-[8px] uppercase text-zinc-500 font-bold block">Accuracy</span>
                      <span className="text-cyan-400 font-black text-sm">{accuracy}%</span>
                    </div>
                    <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
                      <span className="text-[8px] uppercase text-zinc-500 font-bold block">Parries</span>
                      <span className="text-amber-400 font-black text-sm">{totalParries}</span>
                    </div>
                    <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
                      <span className="text-[8px] uppercase text-zinc-500 font-bold block">Peak Combo</span>
                      <span className="text-emerald-400 font-black text-sm">{maxCombo}x</span>
                    </div>
                  </div>

                  {/* Lab Utilities */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      onClick={onCenterDummy}
                      className="py-1.5 px-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 rounded-xl text-[9px] font-bold uppercase transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3 text-cyan-400" />
                      <span>Center Dummy</span>
                    </button>
                    <button
                      onClick={onClearTelemetry}
                      className="py-1.5 px-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 rounded-xl text-[9px] font-bold uppercase transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3 text-amber-400" />
                      <span>Clear Data</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 4. FOOTER CONTROLS */}
            <div className="p-2 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between gap-2 shrink-0">
              <button
                onClick={onResetTrainingSession}
                className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 rounded-xl font-bold uppercase text-[9px] flex items-center justify-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3 text-cyan-400" />
                <span>Full Heal</span>
              </button>
              <button
                onClick={() => onExitArena()}
                className="py-1.5 px-3 bg-red-600 hover:bg-red-500 text-white font-display font-black italic uppercase text-[9px] rounded-xl flex items-center justify-center gap-1 cursor-pointer shadow-md"
              >
                <LogOut className="w-3 h-3" />
                <span>Exit Dojo</span>
              </button>
            </div>
          </motion.div>
        ) : (
          /* MINIMIZED FLOATING DOJO BAR (LANDSCAPE OPTIMIZED) */
          <motion.div
            key="training-hud-closed"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex items-center gap-1.5 bg-zinc-950/90 border border-cyan-500/40 p-1.5 rounded-2xl shadow-2xl backdrop-blur-xl"
          >
            <button
              onClick={() => setIsTrainingHudOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 rounded-xl font-mono text-[9px] font-bold uppercase transition cursor-pointer shadow-sm active:scale-95"
            >
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>DOJO MATRIX</span>
              <Maximize2 className="w-3 h-3" />
            </button>

            {/* Quick 1-Tap Toggles on Landscape */}
            <button
              onClick={() => setGodMode((v) => !v)}
              className={`px-2 py-1.5 rounded-xl font-mono text-[8px] font-bold uppercase border transition cursor-pointer ${
                godMode ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' : 'bg-zinc-900 text-zinc-500 border-zinc-800'
              }`}
              title="Toggle God Mode"
            >
              GOD {godMode ? 'ON' : 'OFF'}
            </button>

            <button
              onClick={() => setInfiniteStamina((v) => !v)}
              className={`px-2 py-1.5 rounded-xl font-mono text-[8px] font-bold uppercase border transition cursor-pointer ${
                infiniteStamina ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' : 'bg-zinc-900 text-zinc-500 border-zinc-800'
              }`}
              title="Toggle Infinite Stamina"
            >
              INF STAM
            </button>

            <button
              onClick={onResetTrainingSession}
              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 rounded-xl transition cursor-pointer"
              title="Reset & Heal"
            >
              <RefreshCw className="w-3 h-3 text-cyan-400" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
