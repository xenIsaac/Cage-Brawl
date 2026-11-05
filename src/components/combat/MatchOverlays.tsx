import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogOut, Move, Maximize2, Settings, Volume2, VolumeX, 
  Skull, Play, Flag, X, Sliders, Bot, Trophy, Swords, Users 
} from 'lucide-react';
import { GameSettings, MatchData } from '../../types';
import { FIGHTING_STYLES } from '../../data/styles';
import { soundManager } from '../SoundManager';
import { SpectatorChamberModal } from '../arena/SpectatorChamberModal';
import { getHeightModifiers } from '../../utils/heightModifiers';

export interface MatchOverlaysProps {
  isPlaying: boolean;
  isDead: boolean;
  rankedState: string;
  showModeSelector: boolean;
  matchData?: MatchData | null;
  settings: GameSettings;
  updateSettings: (updates: Partial<GameSettings>) => void;
  isTouchDevice: boolean;
  soundEnabled: boolean;
  toggleSound: () => void;
  streak: number;
  initGame: () => void;
  handleExitArena: (target?: string) => void;
  onBackToMenu: () => void;
  handleMatchDefeat: (reason?: string) => void;
  isOfflineMatch: boolean;
  showMobileMenu: boolean;
  setShowMobileMenu: (show: boolean) => void;
  setShowFullSettings: (show: boolean) => void;
  setIsLiveHudEditing: (editing: boolean) => void;
  setShowHudEditor: (show: boolean) => void;
  stateRef: React.RefObject<any>;
  syncCombatStatesToUI: () => void;
  dummyBehavior: string;
  // Spectator chamber props
  spectatorModalOpen: boolean;
  setSpectatorModalOpen: (open: boolean) => void;
  dummyHP: number;
  playerHP: number;
  specBot1Style: string;
  setSpecBot1Style: (s: string) => void;
  specBot1Diff: string;
  setSpecBot1Diff: (d: string) => void;
  specBot1Height: number;
  setSpecBot1Height: (h: number) => void;
  specBot2Style: string;
  setSpecBot2Style: (s: string) => void;
  specBot2Diff: string;
  setSpecBot2Diff: (d: string) => void;
  specBot2Height: number;
  setSpecBot2Height: (h: number) => void;
  // Dev style switcher
  practicePlayerStyleId?: string;
  handleDevStyleChange?: (styleId: string) => void;
}

export const MatchOverlays: React.FC<MatchOverlaysProps> = ({
  isPlaying,
  isDead,
  rankedState,
  showModeSelector,
  matchData,
  settings,
  updateSettings,
  isTouchDevice,
  soundEnabled,
  toggleSound,
  streak,
  initGame,
  handleExitArena,
  onBackToMenu,
  handleMatchDefeat,
  isOfflineMatch,
  showMobileMenu,
  setShowMobileMenu,
  setShowFullSettings,
  setIsLiveHudEditing,
  setShowHudEditor,
  stateRef,
  syncCombatStatesToUI,
  dummyBehavior,
  spectatorModalOpen,
  setSpectatorModalOpen,
  dummyHP,
  playerHP,
  specBot1Style,
  setSpecBot1Style,
  specBot1Diff,
  setSpecBot1Diff,
  specBot1Height,
  setSpecBot1Height,
  specBot2Style,
  setSpecBot2Style,
  specBot2Diff,
  setSpecBot2Diff,
  specBot2Height,
  setSpecBot2Height,
  practicePlayerStyleId,
  handleDevStyleChange,
}) => {
  const getActiveSettingsMode = () => {
    if (!matchData) {
      return {
        id: 'practice_ai',
        title: 'Practice Sparring',
        desc: 'A dedicated practice zone. Test and master your styles and setups without pressure.',
        color: 'zinc',
        borderClass: 'border-zinc-700/80',
        bgClass: 'bg-zinc-900/95',
        accentClass: 'text-zinc-400',
        badgeClass: 'bg-zinc-800 text-zinc-300 border border-zinc-700/50',
        icon: <Sliders className="w-4 h-4 text-zinc-400" />
      };
    }
    
    if (matchData.isAiMatch) {
      if (matchData.aiModeType === 'ranked') {
        return {
          id: 'ranked_ai',
          title: 'Ranked VS AI',
          desc: 'Battle authorized bots to scale the leaderboard and prove your single-player superiority.',
          color: 'amber',
          borderClass: 'border-amber-500/80',
          bgClass: 'bg-gradient-to-b from-zinc-900/95 to-zinc-950/95',
          accentClass: 'text-amber-400',
          badgeClass: 'bg-amber-950/50 text-amber-400 border border-amber-500/30',
          icon: <Bot className="w-4 h-4 text-amber-400" />
        };
      } else if (matchData.aiModeType === 'tournament' || matchData.isCompetitive) {
        return {
          id: 'competitive_ai',
          title: 'Competitive AI',
          desc: 'High-stakes championship sparring against elite-tier AI tournament combatants.',
          color: 'yellow',
          borderClass: 'border-yellow-400/80',
          bgClass: 'bg-gradient-to-b from-zinc-900/95 to-black/95',
          accentClass: 'text-yellow-400',
          badgeClass: 'bg-yellow-950/50 text-yellow-400 border border-yellow-400/30',
          icon: <Trophy className="w-4 h-4 text-yellow-400 animate-pulse" />
        };
      } else {
        return {
          id: 'practice_ai',
          title: 'Casual VS AI',
          desc: 'Friendly sparring match against the AI for casual coins.',
          color: 'zinc',
          borderClass: 'border-zinc-700/80',
          bgClass: 'bg-zinc-900/95',
          accentClass: 'text-zinc-400',
          badgeClass: 'bg-zinc-800 text-zinc-300 border border-zinc-700/50',
          icon: <Sliders className="w-4 h-4 text-zinc-400" />
        };
      }
    }

    if (matchData.isCompetitive) {
      return {
        id: 'ranked_match',
        title: 'Ranked PvP Duel',
        desc: 'True online PvP. Protect your streak and win rounds to increase your global Elo rating.',
        color: 'red',
        borderClass: 'border-red-600/80',
        bgClass: 'bg-gradient-to-b from-zinc-900/95 to-black/95',
        accentClass: 'text-red-500',
        badgeClass: 'bg-red-950/60 text-red-400 border border-red-500/40',
        icon: <Swords className="w-4 h-4 text-red-500" />
      };
    }

    return {
      id: 'non_comp_match',
      title: 'Casual Duel',
      desc: 'Online casual match with no Elo penalties. Have fun and clash styles.',
      color: 'blue',
      borderClass: 'border-blue-500/80',
      bgClass: 'bg-gradient-to-b from-zinc-950/95 to-zinc-900/95',
      accentClass: 'text-blue-400',
      badgeClass: 'bg-blue-950/50 text-blue-400 border border-blue-500/30',
      icon: <Users className="w-4 h-4 text-blue-400" />
    };
  };

  return (
    <>
      {/* SPECTATOR MODE WATCH-ONLY TOP HUD */}
      {(matchData?.isAiVsAiSpectator || matchData?.isSpectator) && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex items-center gap-2 sm:gap-3 bg-zinc-950/95 border border-purple-500/80 px-4 py-2 rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.3)] backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
            <div>
              <span className="text-xs font-display font-black italic uppercase text-purple-200 tracking-wider flex items-center gap-2">
                SPECTATOR MODE
              </span>
              <span className="text-[9px] font-mono text-purple-300 block">
                {matchData.isAiVsAiSpectator 
                  ? `${matchData.opponent?.name || matchData.bot1Name || 'BOT 1'} vs ${matchData.spectatorFighter2?.name || matchData.bot2Name || 'BOT 2'}`
                  : `${matchData.player1?.name || 'P1'} vs ${matchData.player2?.name || 'P2'}`
                }
              </span>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-zinc-800" />

          <button
            onClick={() => handleExitArena('tournament')}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white border border-red-400 rounded-xl font-mono font-bold text-[10px] uppercase tracking-wider transition cursor-pointer shadow-md flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>EXIT SPECTATING</span>
          </button>
        </div>
      )}

      {/* AI VS AI POST-MATCH / SPECTATOR EDIT MODAL */}
      <SpectatorChamberModal
        isOpen={!!(matchData?.isAiVsAiSpectator && spectatorModalOpen)}
        dummyHP={dummyHP}
        playerHP={playerHP}
        specBot1Style={specBot1Style}
        setSpecBot1Style={setSpecBot1Style}
        specBot1Diff={specBot1Diff}
        setSpecBot1Diff={setSpecBot1Diff}
        specBot1Height={specBot1Height}
        setSpecBot1Height={setSpecBot1Height}
        specBot2Style={specBot2Style}
        setSpecBot2Style={setSpecBot2Style}
        specBot2Diff={specBot2Diff}
        setSpecBot2Diff={setSpecBot2Diff}
        specBot2Height={specBot2Height}
        setSpecBot2Height={setSpecBot2Height}
        onRestart={() => {
          if (matchData) {
            matchData.bot1StyleId = specBot1Style;
            matchData.bot1Difficulty = specBot1Diff as any;
            matchData.bot1HeightInInches = specBot1Height;
            matchData.bot2StyleId = specBot2Style;
            matchData.bot2Difficulty = specBot2Diff as any;
            matchData.bot2HeightInInches = specBot2Height;
          }
          setSpectatorModalOpen(false);
          initGame();
        }}
        onBackToMenu={onBackToMenu}
      />

      {/* CASUAL VS AI HEADER BANNER */}
      {!matchData?.isCompetitive && matchData?.isAiMatch && !matchData?.isAiVsAiSpectator && !(matchData as any)?.isTestGame && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex flex-col items-center bg-zinc-950/90 border border-amber-500/40 px-3 py-1.5 rounded-xl shadow-xl backdrop-blur-md">
          <span className="text-xs font-display font-black italic uppercase text-amber-400 tracking-wider">
            CASUAL VS AI • {(matchData.aiDifficulty || dummyBehavior).toUpperCase()}
          </span>
          <span className="text-[8px] font-mono text-zinc-400">UNRANKED SPARRING • PRACTICE FIGHT</span>
        </div>
      )}

      {/* TEST GAME (NO AI) LIVE BANNER */}
      {Boolean((matchData as any)?.isTestGame) && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex items-center gap-2.5 bg-zinc-950/95 border-2 border-cyan-500/80 px-3.5 py-1.5 rounded-2xl shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-xs font-black uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Test Game (No AI)</span>
          </div>
          <div className="h-3.5 w-px bg-zinc-700" />
          <button
            onClick={() => {
              soundManager.playRollTick();
              setShowHudEditor(true);
            }}
            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-mono font-bold uppercase transition flex items-center gap-1 cursor-pointer shadow active:scale-95"
            title="Reopen HUD & Controls Customizer"
          >
            <Move className="w-3 h-3" />
            <span>HUD Editor</span>
          </button>
          <button
            onClick={() => {
              soundManager.playKO();
              handleExitArena();
            }}
            className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-mono font-bold uppercase transition flex items-center gap-1 cursor-pointer shadow active:scale-95"
            title="Exit Test Game and return to Main Menu"
          >
            <LogOut className="w-3 h-3" />
            <span>Exit Test Game</span>
          </button>
        </div>
      )}

      {/* MOBILE FULLSCREEN RE-LOCK PROTECTION BADGE */}
      {isTouchDevice && typeof document !== 'undefined' && !document.fullscreenElement && rankedState === 'fighting' && (
        <button
          onClick={() => {
            document.documentElement.requestFullscreen().catch(() => {});
            soundManager.playRollTick();
          }}
          className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-amber-500 hover:bg-amber-400 text-black font-mono font-black text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.6)] flex items-center gap-1.5 animate-pulse cursor-pointer pointer-events-auto"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>TAP TO LOCK FULLSCREEN 🔒</span>
        </button>
      )}

      {/* BOTTOM RIGHT QUICK HUD CONTROLS */}
      {isPlaying && !isDead && !showModeSelector && (
        <div className="absolute right-3 bottom-3 z-20 pointer-events-auto flex items-center gap-2">
          <button
            onClick={toggleSound}
            className="p-2.5 bg-zinc-950/90 border border-zinc-800 text-zinc-400 hover:text-white transition shadow-xl rounded-lg cursor-pointer"
            title="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* YOU GOT KO'D PANEL MODAL */}
      <AnimatePresence>
        {isDead && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col justify-center items-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm border border-red-500/30 bg-zinc-900/90 p-8 text-center shadow-2xl flex flex-col items-center"
            >
              <div className="w-14 h-14 bg-red-600/10 border border-red-500 rounded-full flex items-center justify-center mb-4">
                <Skull className="w-7 h-7 text-red-500 animate-bounce" />
              </div>

              <h2 className="font-display font-black text-2xl italic text-red-500 uppercase tracking-tighter">
                MATCH OVER - YOU GOT KO&apos;D!
              </h2>
              <p className="text-zinc-500 text-xs mt-1.5 leading-relaxed">
                Sparring Dummy landing sequences are precise brawler tactics. Study opponent guard behavior and strike on counter punches.
              </p>

              <div className="bg-zinc-950 border border-zinc-850 px-4 py-2 mt-4 text-[10px] font-mono text-zinc-400 flex justify-between w-full">
                <span>Streak Achieved:</span>
                <span className="text-yellow-400 font-bold">{streak} KOs</span>
              </div>

              <div className="w-full space-y-2 mt-6">
                <button
                  onClick={initGame}
                  className="w-full py-3 bg-white text-black font-display font-black italic uppercase text-xs tracking-wider border border-white hover:bg-zinc-200 active:scale-95 transition shadow-lg"
                >
                  Restart Sparring Match
                </button>
                <button
                  onClick={() => handleExitArena()}
                  className="w-full py-3 bg-zinc-950 text-zinc-400 font-mono text-[10px] uppercase tracking-widest border border-zinc-850 hover:text-white transition"
                >
                  [ Return to Gym ]
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOBILE / IN-GAME MENU OVERLAY (NAVIGATION & SETTINGS) */}
      <AnimatePresence>
        {showMobileMenu && (() => {
          const modeInfo = getActiveSettingsMode();
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col justify-center items-center z-[99] p-3 sm:p-4 pointer-events-auto select-none"
            >
              <motion.div
                initial={{ scale: 0.94, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.94, y: 15 }}
                className={`w-full max-w-sm border ${modeInfo.borderClass} ${modeInfo.bgClass} p-4 sm:p-5 rounded-2xl shadow-2xl flex flex-col gap-3 relative max-h-[90vh] overflow-y-auto`}
              >
                <div className="flex justify-between items-center border-b border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    {modeInfo.icon}
                    <h3 className="font-display font-black text-xs sm:text-sm italic text-white uppercase tracking-wider">
                      {modeInfo.title}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setShowMobileMenu(false)}
                    className="text-zinc-400 hover:text-white font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-1 bg-zinc-950 border border-zinc-800 rounded-lg hover:border-zinc-700 transition cursor-pointer flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5 text-red-400" />
                    <span>CLOSE</span>
                  </button>
                </div>

                {/* MODE DESCRIPTION BADGE */}
                <div className="p-3 bg-zinc-950/80 border border-zinc-850 rounded-xl space-y-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                      Match Session Status
                    </span>
                    <span className={`text-[8px] font-mono px-2 py-0.5 rounded-md font-bold uppercase ${isOfflineMatch ? 'bg-amber-500 text-black shadow-[2px_2px_0px_#000000]' : modeInfo.badgeClass}`}>
                      {isOfflineMatch ? 'PAUSED' : 'ACTIVE'}
                    </span>
                  </div>
                  <p className="text-[9px] font-mono text-zinc-300 leading-normal">
                    {isOfflineMatch ? 'Match simulation, neural AI actions, and round clock are paused.' : modeInfo.desc}
                  </p>
                </div>

                {/* PAUSE RESUME ACTION BUTTON */}
                <button
                  onClick={() => {
                    soundManager.playRollTick?.();
                    setShowMobileMenu(false);
                  }}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:brightness-110 text-black font-display font-black italic uppercase text-xs sm:text-sm tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-[3px_3px_0px_#ffffff] -skew-x-6 active:scale-95 border-2 border-black"
                >
                  <Play className="w-4 h-4 fill-black text-black" />
                  <span>{isOfflineMatch ? 'RESUME MATCH' : 'RESUME'}</span>
                </button>

                {/* NAVIGATION CONTROLS */}
                <div className="space-y-2">
                  {modeInfo.id === 'practice_ai' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          const state = stateRef.current;
                          if (state?.player && state?.dummy) {
                            const pMods = getHeightModifiers(state.player.baseHeight);
                            const dMods = getHeightModifiers(state.dummy.baseHeight);
                            state.player.health = pMods.maxHealth;
                            state.dummy.health = dMods.maxHealth;
                            state.player.armorHP = 18;
                            state.dummy.armorHP = 18;
                            state.player.x = (state.arenaSize / 2) - 180;
                            state.player.y = state.arenaSize / 2;
                            state.dummy.x = (state.arenaSize / 2) + 180;
                            state.dummy.y = state.arenaSize / 2;
                            syncCombatStatesToUI();
                          }
                          setShowMobileMenu(false);
                        }}
                        className="py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-mono text-[9px] uppercase font-bold tracking-wider transition rounded-lg"
                      >
                        Reset Positions
                      </button>

                      <button
                        onClick={() => handleExitArena()}
                        className="py-2 bg-red-600/90 text-white font-display font-black italic uppercase text-[10px] tracking-wider hover:bg-red-500 transition flex items-center justify-center rounded-lg cursor-pointer"
                      >
                        Leave Practice AI
                      </button>
                    </div>
                  ) : modeInfo.id === 'ranked_match' ? (
                    <button
                      onClick={() => {
                        soundManager.playKO();
                        if (matchData?.socket && matchData.socket.readyState === WebSocket.OPEN) {
                          matchData.socket.send(JSON.stringify({ type: 'surrender' }));
                        }
                        handleMatchDefeat('SURRENDERED!');
                      }}
                      className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-display font-black italic uppercase text-xs tracking-wider border border-red-400 shadow-lg transition flex items-center justify-center gap-2 cursor-pointer rounded-lg"
                    >
                      <Flag className="w-4 h-4 animate-pulse" />
                      SURRENDER RANKED DUEL
                    </button>
                  ) : (
                    <button
                      onClick={() => handleExitArena()}
                      className="w-full py-2.5 bg-red-600/90 hover:bg-red-500 text-white font-display font-black italic uppercase text-xs tracking-wider transition flex items-center justify-center gap-2 cursor-pointer rounded-lg"
                    >
                      <LogOut className="w-4 h-4" />
                      FORFEIT MATCH & LEAVE
                    </button>
                  )}
                </div>

                {/* HUD & TOUCH PREFERENCES */}
                <div className="space-y-2.5 pt-2 border-t border-zinc-850">
                  <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest font-black block">Configuration Preferences</span>
                  
                  {/* Master Volume Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[9px] font-mono text-zinc-400 uppercase">
                      <span>Master Volume</span>
                      <span className="text-emerald-400 font-bold">{Math.round((settings.masterVolume ?? 1.0) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={settings.masterVolume ?? 1.0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        updateSettings({ masterVolume: val });
                        soundManager.setVolumes(val, settings.sfxVolume ?? 1.0);
                      }}
                      className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-zinc-950 rounded border border-zinc-800"
                    />
                  </div>

                  {/* SFX / Impact Volume Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[9px] font-mono text-zinc-400 uppercase">
                      <span>Combat SFX & Impacts</span>
                      <span className="text-cyan-400 font-bold">{Math.round((settings.sfxVolume ?? 1.0) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={settings.sfxVolume ?? 1.0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        updateSettings({ sfxVolume: val });
                        soundManager.setVolumes(settings.masterVolume ?? 1.0, val);
                      }}
                      className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-zinc-950 rounded border border-zinc-800"
                    />
                  </div>
                  
                  {/* Dedicated Lock-On & Aim Mode Toggle */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[9px] font-mono text-zinc-400 uppercase">
                      <span>Combat Aim & Lock</span>
                      <span className={(settings.cameraMode || 'standard') === 'standard' ? 'text-cyan-400 font-bold' : 'text-purple-400 font-bold'}>
                        {(settings.cameraMode || 'standard') === 'standard' ? 'STANDARD' : 'LOCK-ON (SWIPE)'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        onClick={() => { updateSettings({ cameraMode: 'standard' }); soundManager.playRollTick(); }}
                        className={`py-1.5 text-[9px] font-mono font-bold uppercase rounded border transition cursor-pointer ${
                          (settings.cameraMode || 'standard') === 'standard'
                            ? 'bg-cyan-600 border-cyan-400 text-white shadow font-black'
                            : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-white'
                        }`}
                      >
                        Standard
                      </button>
                      <button
                        onClick={() => { updateSettings({ cameraMode: 'lockon_swipe' }); soundManager.playRollTick(); }}
                        className={`py-1.5 text-[9px] font-mono font-bold uppercase rounded border transition cursor-pointer ${
                          (settings.cameraMode || 'standard') === 'lockon_swipe'
                            ? 'bg-purple-600 border-purple-400 text-white shadow font-black'
                            : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-white'
                        }`}
                      >
                        Character Lock
                      </button>
                    </div>
                  </div>

                  {/* Virtual Controls Display Mode */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[9px] font-mono text-zinc-400 uppercase">
                      <span>Virtual Touch Controls</span>
                      <span className="text-cyan-400 font-bold">{(settings.showVirtualControls || 'auto').toUpperCase()}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {(['auto', 'always', 'never'] as const).map(mode => (
                        <button
                          key={mode}
                          onClick={() => { updateSettings({ showVirtualControls: mode }); soundManager.playRollTick(); }}
                          className={`py-1 text-[9px] font-mono font-bold uppercase rounded border transition ${
                            (settings.showVirtualControls || 'auto') === mode ? 'bg-cyan-600 border-cyan-500 text-white shadow' : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mobile Camera Field Of View (FOV) */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[9px] font-mono text-zinc-400 uppercase">
                      <span className="flex items-center gap-1"><Maximize2 className="w-3 h-3 text-cyan-400" /> Camera FOV</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            updateSettings({ lockFov: !settings.lockFov });
                            soundManager.playRollTick();
                          }}
                          className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase transition flex items-center gap-0.5 ${
                            settings.lockFov ? 'bg-red-950 border border-red-500/50 text-red-400' : 'bg-zinc-950 border border-zinc-800 text-zinc-500'
                          }`}
                        >
                          {settings.lockFov ? '🔒 Locked' : '🔓 Unlocked'}
                        </button>
                        <span className="text-cyan-400 font-bold">{(settings.mobileFov || 1.3).toFixed(1)}x</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {[1.0, 1.2, 1.4, 1.6, 1.8].map(fov => {
                        const isDisabled = settings.lockFov;
                        return (
                          <button
                            key={fov}
                            disabled={isDisabled}
                            onClick={() => { updateSettings({ mobileFov: fov }); soundManager.playRollTick(); }}
                            className={`py-1 text-[8px] sm:text-[9px] font-mono font-bold uppercase rounded border transition ${
                              isDisabled
                                ? 'bg-zinc-950 border-zinc-900 text-zinc-700 cursor-not-allowed opacity-55'
                                : Math.abs((settings.mobileFov || 1.3) - fov) < 0.05
                                  ? 'bg-cyan-600 border-cyan-500 text-white shadow'
                                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                          >
                            {fov === 1.0 ? '1.0x' : `${fov}x`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mobile Pinch to Zoom Gesture Toggle */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase">Pinch-to-Zoom Gesture</span>
                    <button
                      onClick={() => {
                        updateSettings({ pinchToZoomEnabled: settings.pinchToZoomEnabled === false ? true : false });
                        soundManager.playRollTick();
                      }}
                      className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase transition ${
                        settings.pinchToZoomEnabled !== false ? 'bg-cyan-600 text-white shadow' : 'bg-zinc-950 border border-zinc-800 text-zinc-400'
                      }`}
                    >
                      {settings.pinchToZoomEnabled !== false ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Screen Shake Intensity */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[9px] font-mono text-zinc-400 uppercase">
                      <span>Screen Shake Recoil</span>
                      <span className="text-amber-400 font-bold">{Math.round((settings.screenShake || 1.0) * 100)}%</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[0, 0.5, 1.0, 1.5].map(val => (
                        <button
                          key={val}
                          onClick={() => { updateSettings({ screenShake: val }); soundManager.playRollTick(); }}
                          className={`py-1 text-[9px] font-mono font-bold uppercase rounded border transition ${
                            (settings.screenShake ?? 1.0) === val ? 'bg-amber-600 border-amber-500 text-white shadow' : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {val === 0 ? 'Off' : `${val * 100}%`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cursor Type */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[9px] font-mono text-zinc-400 uppercase">
                      <span>Combat Reticle / Cursor</span>
                      <span className="text-blue-400 font-bold">{(settings.cursorType || 'crosshair').toUpperCase()}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {(['crosshair', 'dot', 'circle'] as const).map(c => (
                        <button
                          key={c}
                          onClick={() => { updateSettings({ cursorType: c }); soundManager.playRollTick(); }}
                          className={`py-1 text-[9px] font-mono font-bold uppercase rounded border transition ${
                            (settings.cursorType || 'crosshair') === c ? 'bg-blue-600 border-blue-500 text-white shadow' : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                {/* HUD SCALE */}
                <div className="space-y-1.5 pt-2 border-t border-zinc-850">
                  <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest font-black block">HUD & Card Scale</span>
                  <div className="grid grid-cols-5 gap-1">
                    {[
                      { value: 0.5, label: '50%' },
                      { value: 0.65, label: '65%' },
                      { value: 0.8, label: '80%' },
                      { value: 1.0, label: '100%' },
                      { value: 1.2, label: '120%' },
                    ].map((item) => {
                      const currentScale = settings.hudScale !== undefined ? settings.hudScale : 0.85;
                      return (
                        <button
                          key={item.value}
                          onClick={() => {
                            updateSettings({ hudScale: item.value });
                            soundManager.playRollTick();
                          }}
                          className={`py-1 font-mono text-[9px] font-bold uppercase border tracking-tight transition rounded-lg ${
                            Math.abs(currentScale - item.value) < 0.01
                              ? 'bg-red-600 text-white border-red-500 shadow'
                              : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-900 hover:text-white'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Full Settings & HUD Reconfiguration Buttons */}
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    onClick={() => {
                      setShowFullSettings(true);
                      soundManager.playRollTick();
                    }}
                    className="py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-white font-mono font-bold uppercase text-[9px] tracking-wider transition rounded-lg flex items-center justify-center gap-1.5 shadow cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-red-500" />
                    <span>All Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      setShowFullSettings(false);
                      setIsLiveHudEditing(true);
                      soundManager.playRollTick();
                    }}
                    className="py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold uppercase text-[9px] tracking-wider transition rounded-lg flex items-center justify-center gap-1.5 shadow active:scale-95 cursor-pointer"
                  >
                    <Move className="w-3.5 h-3.5" />
                    <span>HUD Editor</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    soundManager.playKO();
                  }}
                  className="w-full py-2 bg-white text-black font-display font-black italic uppercase text-[10px] tracking-widest hover:bg-zinc-200 transition active:scale-98 rounded-lg mt-1 cursor-pointer"
                >
                  Resume Combat Match
                </button>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* DEV FIGHTING STYLE SWITCHER - QUICK TAP CHANGER (Practice mode only, toggleable in settings) */}
      {isPlaying && !isDead && !showModeSelector && !matchData?.isCompetitive && !matchData?.isAiMatch && !matchData?.isAiVsAiSpectator && settings.showDevSwitcher && handleDevStyleChange && (
        <div className="flex absolute bottom-2 left-1/2 -translate-x-1/2 z-50 bg-black/95 border border-cyan-500/50 px-3 py-1.5 shadow-2xl items-center gap-3 pointer-events-auto rounded-none max-w-[95vw] overflow-x-auto scrollbar-none">
          <div className="text-[8px] font-mono font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping shrink-0" />
            PRACTICE STYLE:
          </div>
          <div className="flex gap-1.5">
            {FIGHTING_STYLES.map(style => (
              <button
                key={style.id}
                onClick={() => handleDevStyleChange(style.id)}
                className={`px-3 py-1 text-[9px] font-mono font-black uppercase transition-all tracking-tight cursor-pointer ${
                  practicePlayerStyleId === style.id
                    ? 'bg-cyan-600 text-white border border-transparent shadow-md'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-600'
                }`}
              >
                {style.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default MatchOverlays;
