import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, Flame, Sparkles, Trophy, 
  Swords, Zap, Crown, LogOut, Bot, Check, Target, ShieldCheck,
  ChevronLeft, ChevronRight, Clock, FastForward
} from 'lucide-react';
import { soundManager } from './SoundManager';
import { PlayerStats } from '../types';
import SingleplayerQuestsScreen from './SingleplayerQuestsScreen';
import CareerMilestonesScreen from './CareerMilestonesScreen';

interface QuestsAchievementsPanelProps {
  stats: PlayerStats;
  updateStats: (updates: Partial<PlayerStats>) => void;
  email?: string;
  activeTab?: 'singleplayer' | 'multiplayer' | 'achievements' | 'style_mastery';
  onClose?: () => void;
  isNavHidden?: boolean;
  isNavExpanded?: boolean;
}

export interface MultiplayerQuest {
  id: string;
  title: string;
  description: string;
  target: number;
  rewardCash: number;
  rewardRolls: number;
  statKey: keyof PlayerStats;
}

const MULTIPLAYER_QUESTS: MultiplayerQuest[] = [
  {
    id: 'pvp_duelist',
    title: 'PVP DUELIST',
    description: 'Win 3 Ranked PvP Duels against online opponents.',
    target: 3,
    rewardCash: 500,
    rewardRolls: 3,
    statKey: 'totalWins'
  },
  {
    id: 'streak_master',
    title: 'STREAK MASTER',
    description: 'Maintain a 3-Win Streak in Competitive PvP.',
    target: 3,
    rewardCash: 800,
    rewardRolls: 5,
    statKey: 'winStreak'
  },
  {
    id: 'knockout_master',
    title: 'KNOCKOUT MASTER',
    description: 'Score 5 total KOs across online and competitive duels.',
    target: 5,
    rewardCash: 600,
    rewardRolls: 4,
    statKey: 'totalKOs'
  },
  {
    id: 'rolls_collector',
    title: 'STYLE ROLLER',
    description: 'Perform 10 style spins in the Octagon gacha vault.',
    target: 10,
    rewardCash: 450,
    rewardRolls: 3,
    statKey: 'totalRollsCount'
  },
  {
    id: 'unbroken_challenger',
    title: 'UNBROKEN CHALLENGER',
    description: 'Complete 10 total Multiplayer Matches.',
    target: 10,
    rewardCash: 1000,
    rewardRolls: 8,
    statKey: 'totalMatchesPlayed'
  }
];

import { useResponsiveLayout } from '../utils/useResponsiveLayout';

export default function QuestsAchievementsPanel({ 
  stats, 
  updateStats,
  email = '',
  activeTab = 'singleplayer',
  onClose,
}: QuestsAchievementsPanelProps) {
  const { isPortrait, isMobile, isLandscape, isCompactLandscape } = useResponsiveLayout();
  const [activeHubTab, setActiveHubTab] = useState<'singleplayer' | 'multiplayer' | 'achievements'>(() => {
    if (activeTab === 'achievements') return 'achievements';
    if (activeTab === 'multiplayer') return 'multiplayer';
    return 'singleplayer';
  });

  // Collapsible Left Navigation Rail Dock (for landscape/desktop)
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);

  const [claimedMultiplayerQuests, setClaimedMultiplayerQuests] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`mma_claimed_mp_quests_${email || 'anon'}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [toastNotification, setToastNotification] = useState<string | null>(null);
  const [mpCarouselIndex, setMpCarouselIndex] = useState<number>(0);

  const handleClaimMultiplayerQuest = (quest: MultiplayerQuest) => {
    if (claimedMultiplayerQuests.includes(quest.id)) return;
    const currentVal = Number(stats[quest.statKey] || 0);
    if (currentVal < quest.target) return;

    const nextClaimed = [...claimedMultiplayerQuests, quest.id];
    setClaimedMultiplayerQuests(nextClaimed);
    try {
      localStorage.setItem(`mma_claimed_mp_quests_${email || 'anon'}`, JSON.stringify(nextClaimed));
    } catch (e) {}

    updateStats({
      cash: stats.cash + quest.rewardCash,
      rolls: (stats.rolls || 0) + quest.rewardRolls
    });

    soundManager.playLevelUp?.();
    setToastNotification(`Claimed ${quest.title}! +$${quest.rewardCash} Cash | +${quest.rewardRolls} Rolls`);
    setTimeout(() => setToastNotification(null), 3500);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`fixed inset-0 z-[125] bg-zinc-950 text-white flex ${
        isPortrait ? 'flex-col' : 'flex-row'
      } select-none overflow-hidden font-sans pl-0`}
    >
      {/* BACKGROUND DECORATIVE PERSONA WATERMARK & GRID */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:32px_32px] opacity-15 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {toastNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="absolute top-4 right-4 z-50 bg-amber-500 text-black font-display font-black italic uppercase px-4 py-2 -skew-x-12 shadow-[4px_4px_0px_#000000] border border-white text-xs"
          >
            {toastNotification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* 1. DYNAMIC NAVIGATION: PORTRAIT TOP BAR vs LANDSCAPE LEFT DOCK */}
      {/* ============================================================== */}
      {isPortrait ? (
        /* PORTRAIT TOP NAVIGATION BAR (Zero-scrolling, Full screen width freed) */
        <header className="w-full bg-black border-b-4 border-white p-2.5 shrink-0 z-30 shadow-[0_4px_0px_#000000] flex flex-col gap-2">
          {/* Top Row: Brand + Close */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-red-600 text-black px-2.5 py-0.5 font-display font-black italic text-xs uppercase -skew-x-12 shadow-[2px_2px_0px_#ffffff] flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-black" />
                <span>PROGRESSION</span>
              </div>
              <span className="text-xs font-mono font-black italic text-emerald-400 bg-zinc-900 border border-emerald-500/50 px-2 py-0.5 -skew-x-6">
                ${stats.cash.toLocaleString()}
              </span>
            </div>

            {onClose && (
              <button
                onClick={() => {
                  soundManager.playRollTick?.();
                  onClose();
                }}
                className="px-2.5 py-1 bg-red-600 hover:bg-white text-black font-display font-black italic uppercase text-xs -skew-x-12 shadow-[2px_2px_0px_#ffffff] flex items-center gap-1 cursor-pointer active:scale-95 transition"
              >
                <LogOut className="w-3.5 h-3.5 rotate-180" />
                <span>EXIT</span>
              </button>
            )}
          </div>

          {/* Bottom Row: 3 Non-shifting Tabs */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => {
                soundManager.playRollTick?.();
                setActiveHubTab('singleplayer');
              }}
              className={`py-2 px-1 text-center -skew-x-6 border-2 cursor-pointer transition-colors flex items-center justify-center gap-1 ${
                activeHubTab === 'singleplayer'
                  ? 'bg-red-600 border-white text-black shadow-[2px_2px_0px_#ffffff]'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-300 shadow-[2px_2px_0px_#000000]'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span className="font-display font-black italic uppercase text-[11px] tracking-tight">AI QUESTS</span>
            </button>

            <button
              onClick={() => {
                soundManager.playRollTick?.();
                setActiveHubTab('multiplayer');
              }}
              className={`py-2 px-1 text-center -skew-x-6 border-2 cursor-pointer transition-colors flex items-center justify-center gap-1 ${
                activeHubTab === 'multiplayer'
                  ? 'bg-red-600 border-white text-black shadow-[2px_2px_0px_#ffffff]'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-300 shadow-[2px_2px_0px_#000000]'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span className="font-display font-black italic uppercase text-[11px] tracking-tight">PVP BOUNTY</span>
            </button>

            <button
              onClick={() => {
                soundManager.playRollTick?.();
                setActiveHubTab('achievements');
              }}
              className={`py-2 px-1 text-center -skew-x-6 border-2 cursor-pointer transition-colors flex items-center justify-center gap-1 ${
                activeHubTab === 'achievements'
                  ? 'bg-red-600 border-white text-black shadow-[2px_2px_0px_#ffffff]'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-300 shadow-[2px_2px_0px_#000000]'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span className="font-display font-black italic uppercase text-[11px] tracking-tight">CAREER</span>
            </button>
          </div>
        </header>
      ) : (
        /* LANDSCAPE LEFT DOCK (Rock Solid, Zero Lateral Shift, Fixed Geometry, Scaled for Landscape) */
        <aside 
          className={`${
            isDockCollapsed ? 'w-14' : isCompactLandscape ? 'w-44' : 'w-52 lg:w-60'
          } border-r-2 sm:border-r-4 border-white bg-black flex flex-col p-2 sm:p-2.5 shrink-0 select-none z-20 shadow-[6px_0px_0px_#000000]`}
        >
          {/* TOP DOCK HEADER & TOGGLE */}
          <div className="flex items-center justify-between mb-2 shrink-0">
            {!isDockCollapsed && (
              <div>
                <div className="bg-red-600 text-black px-2 py-0.5 font-display font-black italic text-[11px] uppercase tracking-wider -skew-x-12 shadow-[2px_2px_0px_#ffffff] inline-flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-black" />
                  <span>BOUNTY HUB</span>
                </div>
                <h1 className="text-sm font-display font-black italic uppercase tracking-tighter text-white -skew-x-12 leading-none mt-0.5">
                  PROGRESSION
                </h1>
              </div>
            )}

            <button
              onClick={() => {
                soundManager.playRollTick?.();
                setIsDockCollapsed(!isDockCollapsed);
              }}
              className={`p-1.5 bg-zinc-900 hover:bg-white hover:text-black border border-white text-white font-mono font-black text-xs -skew-x-12 cursor-pointer shadow-[1px_1px_0px_#000000] active:scale-95 transition ${
                isDockCollapsed ? 'mx-auto' : 'ml-auto'
              }`}
              title={isDockCollapsed ? 'Expand Dock' : 'Collapse Dock'}
            >
              {isDockCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* CASH WALLET DISPLAY */}
          {!isDockCollapsed && (
            <div className="bg-zinc-900 border border-amber-400 p-1.5 mb-2 -skew-x-6 shadow-[2px_2px_0px_#000000] flex items-center justify-between shrink-0">
              <span className="text-[9px] font-mono font-black text-amber-400 uppercase tracking-widest">WALLET</span>
              <span className="text-xs font-mono font-black italic text-emerald-400">${stats.cash.toLocaleString()}</span>
            </div>
          )}

          {/* THREE ANCHOR CATEGORY BUTTONS (ZERO JITTER: IDENTICAL 2PX BORDER, 3PX SHADOW, AND NO MARGIN CHANGES) */}
          <div className="flex-1 flex flex-col gap-1.5 sm:gap-2">
            {/* TAB 1: SINGLEPLAYER QUESTS */}
            <button
              onClick={() => {
                soundManager.playRollTick?.();
                setActiveHubTab('singleplayer');
              }}
              className={`w-full ${
                isCompactLandscape ? 'h-9 px-2' : 'h-10 sm:h-11 px-2.5'
              } text-left -skew-x-6 border-2 cursor-pointer transition-colors flex items-center ${
                isDockCollapsed ? 'justify-center' : 'justify-between'
              } ${
                activeHubTab === 'singleplayer'
                  ? 'bg-red-600 border-white text-black shadow-[2px_2px_0px_#ffffff]'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 shadow-[2px_2px_0px_#000000]'
              }`}
            >
              {isDockCollapsed ? (
                <Bot className={`w-4 h-4 ${activeHubTab === 'singleplayer' ? 'text-black' : 'text-zinc-400'}`} />
              ) : (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5">
                    <Bot className={`w-3.5 h-3.5 ${activeHubTab === 'singleplayer' ? 'text-black' : 'text-cyan-400'}`} />
                    <span className="font-display font-black italic uppercase text-[11px] sm:text-xs tracking-wider">
                      SINGLEPLAYER
                    </span>
                  </div>
                  <span className={`text-[8px] font-mono font-black px-1 py-0.2 border ${
                    activeHubTab === 'singleplayer' ? 'bg-black text-white border-white' : 'bg-black text-cyan-400 border-cyan-500/50'
                  }`}>
                    AI
                  </span>
                </div>
              )}
            </button>

            {/* TAB 2: MULTIPLAYER QUESTS */}
            <button
              onClick={() => {
                soundManager.playRollTick?.();
                setActiveHubTab('multiplayer');
              }}
              className={`w-full ${
                isCompactLandscape ? 'h-9 px-2' : 'h-10 sm:h-11 px-2.5'
              } text-left -skew-x-6 border-2 cursor-pointer transition-colors flex items-center ${
                isDockCollapsed ? 'justify-center' : 'justify-between'
              } ${
                activeHubTab === 'multiplayer'
                  ? 'bg-red-600 border-white text-black shadow-[2px_2px_0px_#ffffff]'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 shadow-[2px_2px_0px_#000000]'
              }`}
            >
              {isDockCollapsed ? (
                <Swords className={`w-4 h-4 ${activeHubTab === 'multiplayer' ? 'text-black' : 'text-zinc-400'}`} />
              ) : (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5">
                    <Swords className={`w-3.5 h-3.5 ${activeHubTab === 'multiplayer' ? 'text-black' : 'text-red-400'}`} />
                    <span className="font-display font-black italic uppercase text-[11px] sm:text-xs tracking-wider">
                      MULTIPLAYER
                    </span>
                  </div>
                  <span className={`text-[8px] font-mono font-black px-1 py-0.2 border ${
                    activeHubTab === 'multiplayer' ? 'bg-black text-white border-white' : 'bg-black text-red-400 border-red-500/50'
                  }`}>
                    PVP
                  </span>
                </div>
              )}
            </button>

            {/* TAB 3: ACHIEVEMENTS & MILESTONES */}
            <button
              onClick={() => {
                soundManager.playRollTick?.();
                setActiveHubTab('achievements');
              }}
              className={`w-full ${
                isCompactLandscape ? 'h-9 px-2' : 'h-10 sm:h-11 px-2.5'
              } text-left -skew-x-6 border-2 cursor-pointer transition-colors flex items-center ${
                isDockCollapsed ? 'justify-center' : 'justify-between'
              } ${
                activeHubTab === 'achievements'
                  ? 'bg-red-600 border-white text-black shadow-[2px_2px_0px_#ffffff]'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 shadow-[2px_2px_0px_#000000]'
              }`}
            >
              {isDockCollapsed ? (
                <Trophy className={`w-4 h-4 ${activeHubTab === 'achievements' ? 'text-black' : 'text-zinc-400'}`} />
              ) : (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5">
                    <Trophy className={`w-3.5 h-3.5 ${activeHubTab === 'achievements' ? 'text-black' : 'text-amber-400'}`} />
                    <span className="font-display font-black italic uppercase text-[11px] sm:text-xs tracking-wider">
                      CAREER
                    </span>
                  </div>
                  <span className={`text-[8px] font-mono font-black px-1 py-0.2 border ${
                    activeHubTab === 'achievements' ? 'bg-black text-white border-white' : 'bg-black text-amber-400 border-amber-500/50'
                  }`}>
                    TRACKS
                  </span>
                </div>
              )}
            </button>
          </div>

          {/* PROMINENT RETURN BUTTON AT FOOTER OF DOCK */}
          <div className="mt-auto pt-2 border-t border-white/20 shrink-0">
            {onClose && (
              <button
                onClick={() => {
                  soundManager.playRollTick?.();
                  onClose();
                }}
                title="Return to Menu"
                className={`w-full py-1.5 bg-red-600 hover:bg-white text-black font-display font-black italic uppercase tracking-wider text-[11px] -skew-x-12 shadow-[2px_2px_0px_#ffffff] transition-colors cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 group ${
                  isDockCollapsed ? 'px-1' : 'px-2'
                }`}
              >
                <LogOut className="w-3.5 h-3.5 rotate-180 text-black group-hover:scale-110 shrink-0" />
                {!isDockCollapsed && <span>RETURN // MENU</span>}
              </button>
            )}
          </div>
        </aside>
      )}

      {/* ============================================================== */}
      {/* 2. DYNAMIC RIGHT CONTENT DRAWER STAGE                          */}
      {/* ============================================================== */}
      <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden relative z-10 min-w-0">
        <AnimatePresence mode="wait">
          
          {/* STAGE 1: SINGLEPLAYER QUESTS */}
          {activeHubTab === 'singleplayer' && (
            <motion.div
              key="singleplayer-stage"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="w-full h-full flex flex-col"
            >
              <SingleplayerQuestsScreen
                stats={stats}
                updateStats={updateStats}
                email={email}
                onReturnToSingleplayerHub={() => {}}
                isNavHidden={true}
              />
            </motion.div>
          )}

          {/* STAGE 2: MULTIPLAYER QUESTS (AUTHENTIC PERSONA 5 WANTED BOUNTY DECK) */}
          {activeHubTab === 'multiplayer' && (
            <motion.div
              key="multiplayer-stage"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="w-full h-full flex flex-col p-4 sm:p-6 overflow-y-auto custom-scrollbar relative justify-between"
            >
              {/* HALPTONE BG ACCENT */}
              <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

              {/* STAGE HEADER */}
              <div className="flex items-center justify-between pb-3 border-b-4 border-white mb-3 shrink-0 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="bg-red-600 text-black px-3 py-1 font-display font-black italic text-xs uppercase -skew-x-12 shadow-[2px_2px_0px_#ffffff]">
                    PVP BOUNTY
                  </div>
                  <h2 className="font-display font-black italic uppercase text-base sm:text-xl text-white tracking-wider">
                    WANTED COMBAT TARGETS
                  </h2>
                </div>

                {/* CAROUSEL CONTROLS */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      soundManager.playRollTick?.();
                      setMpCarouselIndex(prev => (prev > 0 ? prev - 1 : MULTIPLAYER_QUESTS.length - 1));
                    }}
                    className="px-3 py-1 bg-zinc-900 hover:bg-white hover:text-black border-2 border-white text-white font-mono font-bold text-xs -skew-x-12 cursor-pointer shadow-[2px_2px_0px_#000000] active:scale-95 transition"
                    title="Previous Target"
                  >
                    ◀ PREV
                  </button>
                  <span className="text-xs font-mono font-black text-amber-400 px-2 -skew-x-6">
                    0{mpCarouselIndex + 1} / 0{MULTIPLAYER_QUESTS.length}
                  </span>
                  <button
                    onClick={() => {
                      soundManager.playRollTick?.();
                      setMpCarouselIndex(prev => (prev < MULTIPLAYER_QUESTS.length - 1 ? prev + 1 : 0));
                    }}
                    className="px-3 py-1 bg-zinc-900 hover:bg-white hover:text-black border-2 border-white text-white font-mono font-bold text-xs -skew-x-12 cursor-pointer shadow-[2px_2px_0px_#000000] active:scale-95 transition"
                    title="Next Target"
                  >
                    NEXT ▶
                  </button>
                </div>
              </div>

              {/* WANTED BOUNTY CALLING CARD (FITS SCREEN PERFECTLY WITH 3D CAROUSEL DEPTH) */}
              <div className="flex-1 flex items-center justify-center py-1 relative min-h-0">
                {/* CAROUSEL DEPTH GHOST CARDS (STRICTLY Z-0, HIDDEN ON COMPACT LANDSCAPE SO NEVER COVERS BUTTONS) */}
                <div className="hidden xl:block absolute left-4 lg:left-8 w-60 h-[70%] bg-black/60 border-2 border-zinc-800 -skew-x-6 opacity-20 pointer-events-none scale-90 -translate-x-6 shadow-[-10px_10px_0px_#000000] z-0" />
                <div className="hidden xl:block absolute right-4 lg:right-8 w-60 h-[70%] bg-black/60 border-2 border-zinc-800 -skew-x-6 opacity-20 pointer-events-none scale-90 translate-x-6 shadow-[10px_10px_0px_#000000] z-0" />

                <AnimatePresence mode="wait">
                  {(() => {
                    const quest = MULTIPLAYER_QUESTS[mpCarouselIndex % MULTIPLAYER_QUESTS.length];
                    const currentVal = Number(stats[quest.statKey] || 0);
                    const isClaimed = claimedMultiplayerQuests.includes(quest.id);
                    const isCompleted = currentVal >= quest.target;
                    const progressPct = Math.min(100, Math.round((currentVal / quest.target) * 100));

                    return (
                      <motion.div
                        key={quest.id}
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.16 }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        onDragEnd={(_, info) => {
                          if (info.offset.x < -35) {
                            soundManager.playRollTick?.();
                            setMpCarouselIndex(prev => (prev < MULTIPLAYER_QUESTS.length - 1 ? prev + 1 : 0));
                          } else if (info.offset.x > 35) {
                            soundManager.playRollTick?.();
                            setMpCarouselIndex(prev => (prev > 0 ? prev - 1 : MULTIPLAYER_QUESTS.length - 1));
                          }
                        }}
                        className="w-full max-w-lg lg:max-w-xl bg-black border-3 sm:border-4 border-white shadow-[6px_6px_0px_#E60012] p-3 sm:p-4.5 flex flex-col justify-between relative z-10 -skew-x-2 select-none cursor-grab active:cursor-grabbing max-h-[300px] sm:max-h-[360px] md:max-h-[400px]"
                      >
                        {/* CARD TOP META */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="bg-red-600 text-black font-display font-black italic text-[11px] uppercase px-2 py-0.5 -skew-x-12 shadow-[2px_2px_0px_#ffffff]">
                              TARGET BOUNTY 0{mpCarouselIndex + 1}
                            </span>
                            {isClaimed ? (
                              <span className="text-[10px] font-mono font-black text-zinc-400 bg-black border border-zinc-700 px-2 py-0.5 -skew-x-6">
                                ✓ CLAIMED
                              </span>
                            ) : isCompleted ? (
                              <span className="text-[11px] font-mono font-black text-black bg-amber-400 px-2.5 py-0.5 -skew-x-6 animate-pulse shadow-[2px_2px_0px_#ffffff]">
                                ★ READY TO CLAIM ★
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono font-bold text-zinc-300 bg-zinc-900 border border-zinc-700 px-2 py-0.5 -skew-x-6">
                                IN PROGRESS
                              </span>
                            )}
                          </div>

                          <h3 className="font-display font-black italic uppercase text-base sm:text-xl text-white tracking-wide leading-tight">
                            {quest.title}
                          </h3>
                          <p className="text-[11px] sm:text-xs font-mono text-zinc-300 leading-snug line-clamp-2">
                            {quest.description}
                          </p>
                        </div>

                        {/* CARD REWARD & TELEMETRY */}
                        <div className="space-y-2 pt-2 border-t-2 border-white/20 mt-2">
                          {/* PROGRESS METER */}
                          <div className="space-y-0.5">
                            <div className="flex justify-between items-center text-[10px] sm:text-xs font-mono text-zinc-300">
                              <span>PROGRESS</span>
                              <span className="font-bold text-white text-xs sm:text-sm">{currentVal} / {quest.target}</span>
                            </div>
                            <div className="w-full h-2 sm:h-2.5 bg-black border-2 border-white p-0.5 overflow-hidden">
                              <div 
                                className="h-full transition-all duration-300 bg-amber-400"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>

                          {/* REWARD YIELD & PROMINENT CLAIM BUTTON (NEVER HIDDEN BEHIND CAROUSEL) */}
                          <div className="flex items-center justify-between pt-0.5">
                            <div className="flex flex-col">
                              <span className="text-[9px] font-mono text-zinc-400 uppercase">REWARD PAYOUT</span>
                              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-mono font-bold">
                                <span className="text-emerald-400">+${quest.rewardCash} CASH</span>
                                <span className="text-amber-400">+{quest.rewardRolls} ROLLS</span>
                              </div>
                            </div>

                            {!isClaimed && (
                              <button
                                disabled={!isCompleted}
                                onClick={() => handleClaimMultiplayerQuest(quest)}
                                className={`px-4 py-1.5 font-display font-black italic uppercase text-xs sm:text-sm -skew-x-12 transition-all cursor-pointer shadow-[2px_2px_0px_#000000] ${
                                  isCompleted
                                    ? 'bg-amber-400 hover:bg-white text-black active:scale-95 animate-pulse'
                                    : 'bg-zinc-800 text-zinc-600 border border-zinc-700 cursor-not-allowed'
                                }`}
                              >
                                CLAIM BOUNTY
                              </button>
                            )}
                          </div>
                        </div>

                        {/* CAROUSEL DOT INDICATORS */}
                        <div className="flex items-center justify-center gap-1.5 pt-1">
                          {MULTIPLAYER_QUESTS.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                soundManager.playRollTick?.();
                                setMpCarouselIndex(idx);
                              }}
                              className={`h-1.5 transition-all duration-200 cursor-pointer ${
                                idx === mpCarouselIndex ? 'w-5 bg-red-600' : 'w-1.5 bg-zinc-700 hover:bg-zinc-500'
                              }`}
                            />
                          ))}
                        </div>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* STAGE 3: ACHIEVEMENTS & MILESTONES */}
          {activeHubTab === 'achievements' && (
            <motion.div
              key="achievements-stage"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="w-full h-full flex flex-col"
            >
              <CareerMilestonesScreen
                stats={stats}
                updateStats={updateStats}
                email={email}
                onReturnToSingleplayerHub={() => {}}
                isNavHidden={true}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </motion.div>
  );
}
