import { runPhysicsSimulation } from '../combat/simulation';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, ChevronLeft, Shield, Volume2, VolumeX, 
  RotateCcw, Trophy, Sparkles, Award, Play, Users, 
  Skull, ShieldAlert, Target, Info, Flame, Zap, Settings,
  RefreshCw, LogOut, Heart, Activity, Swords, BarChart2, Check, X, Flag, Maximize2, Eye, Move,
  Bot, User, Sliders
} from 'lucide-react';
import { Fighter, FoodGem, Particle, PlayerStats, Fist, GameSettings, MatchData, UserSession, RoundReport, RankedAiEloBreakdown } from '../types';
import { FIGHTING_STYLES } from '../data/styles';
import { soundManager } from './SoundManager';
import { getRankInfo, calculateWinEloGain, calculateLossEloLoss, calculateRankedAiEloBreakdown, evaluateRoundGrade } from '../utils/elo';
import MobileControls from './MobileControls';
import { CombatHUD } from './combat/CombatHUD';
import { MatchOverlays } from './combat/MatchOverlays';
import { FighterHealthBars } from './combat/FighterHealthBars';
import { executeFighterHit, isFighterInIFrames, applyHeavyWhiffPenalty as applyHeavyWhiffPenaltyHelper, finalizeKickboxingM2Cooldown as finalizeKickboxingM2CooldownHelper } from '../combat/hitResolution';
import {
  executePlayerLightAttackTrigger,
  executePlayerHeavyAttackTrigger,
  executePlayerHeavyRelease,
  executeDummyHeavyRelease
} from '../combat/attackTriggers';
import { detectSparringCollisions as runDetectSparringCollisions } from '../combat/collisionEngine';
import { ArenaRenderer } from '../combat/ArenaRenderer';
import HudEditorModal from './HudEditorModal';
import LiveHudEditor from './LiveHudEditor';
import { StatusBar, ActiveStatusItem, extractFighterStatuses } from './StatusBar';
import { SettingsView } from './mainmenu/SettingsView';
import { CodexModal } from './CodexModal';
import PostMatchHUD from './PostMatchHUD';
import { getHeightModifiers, formatHeight } from '../utils/heightModifiers';
import { 
  updateFighterStaminaAndTimers, 
  handleSprintM1Cancel, 
  handleSprintM2Cancel, 
  onLandedHitStaminaUpdate 
} from '../combat/staminaEngine';
import { CombatFighter } from '../combat/types';
import { getStyleInitials, getStyleRarityColor, getHeavySkillName, getMaxHeavyCooldown, getHeavySkillIcon } from '../utils/styleHelpers';
import { getMatchModeKey as getMatchModeKeyUtil } from '../utils/matchMode';
import { QuestTracker } from '../utils/questTracker';
import { OfflineQuestManager } from '../data/offlineQuests';
import { CareerMilestoneManager } from '../data/careerMilestones';
import { isMobileDevice } from '../utils/deviceDetection';
import { updateFighterAI as updateFighterAIModule } from '../combat/ai';
import { getCapoeiraKickEase, getFistRelativePos, getClampedFistPos } from '../combat/fistIK';
import { checkDirectionalBlock } from '../combat/blockEngine';
import { evaluateParry } from '../combat/parry';
import { 
  PERFECT_PARRY_WINDOW_SEC, 
  BLOCK_COOLDOWN_FRAMES, 
  updateFighterSteering, 
  applyDamageCombatLocks, 
  canFighterRaiseGuard,
  resetFighterRoundState,
  BASE_MOVEMENT_SPEED,
  BASE_MOVEMENT_FORCE,
  BASE_COMBO_RESET_FRAMES,
  CAPOEIRA_COMBO_RESET_FRAMES,
  getStyleM1Speeds,
  getStyleM1BetweenCooldown,
  getStylePostureCooldown,
  calculateNetPostureCd,
  applyFighterPostureCooldown,
  grantFighterPostureReduction,
  calculateAsymmetricalRetractionDelta,
  getStyleSequenceReturnSpeed,
  calculateDSRetractionDelta,
  executeIronBoxingS4InstantChain,
  lockStreetBoxingAutoBurstQueue,
  tickStreetBoxingAutoBurst,
  isStreetBoxingFlurryUnparryable,
  applyGlobalM2RetractionOverride,
  isS2FullyRetractedToStance,
  HITSTUN_FRAMES,
  HIT_ATTACK_LOCKOUT_FRAMES
} from '../combat/combatEngine';
import { PracticeDojoView } from './mainmenu/PracticeDojoView';
import { SpectatorChamberModal } from './arena/SpectatorChamberModal';
import { TrainingDrawer } from './arena/TrainingDrawer';
import { 
  triggerSluggerImpactFrame, 
  triggerSluggerBlockImpactFrame,
  triggerKyokushinImpactFrame,
  updateImpactFrame, 
  isImpactFrameActive
} from '../combat/impactFrame';
import { getStylePostS4HeavyDelay } from '../combat/styles';
import { wsService } from '../services/websocket';
import { DEFAULT_LANDSCAPE_LAYOUT, DEFAULT_PORTRAIT_LAYOUT } from '../data/hudDefaults';

interface ArenaProps {
  stats: PlayerStats;
  updateStats: (updates: Partial<PlayerStats>) => void;
  settings: GameSettings;
  updateSettings: (updates: Partial<GameSettings>) => void;
  currentUser?: UserSession | null;
  onBackToMenu: (destination?: any) => void;
  version: string;
  matchData?: MatchData | null;
  isNavHidden?: boolean;
  onCombatStateChange?: (inCombat: boolean) => void;
  onOpenNav?: () => void;
}

export default function Arena({ stats, updateStats, settings, updateSettings, currentUser, onBackToMenu, version, matchData, isNavHidden = false, onCombatStateChange, onOpenNav }: ArenaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastWsSendTimeRef = useRef<number>(0);
  const lastCombatUIStateRef = useRef<Record<string, any>>({});

  // Resolve active user email for QuestTracker
  const userEmail = currentUser?.email || (() => {
    try {
      const saved = localStorage.getItem('mma_current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.email) return parsed.email;
      }
    } catch (e) {}
    return 'anon';
  })();

  const getMatchModeKey = () => getMatchModeKeyUtil(matchData);
  
  // Game states
  const [isPlaying, setIsPlaying] = useState(() => true);
  const [showModeSelector, setShowModeSelector] = useState(() => false);
  const [dummyBehavior, setDummyBehavior] = useState<string>(() => {
    if ((matchData as any)?.isTestGame) return 'idle';
    return (matchData as any)?.dummyBehavior || (matchData as any)?.dummyConfig?.behavior || 'passive';
  });
  const [dummyM1Speed, setDummyM1Speed] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [dummyFollow, setDummyFollow] = useState<boolean>(false);
  const [dummyStyleId, setDummyStyleId] = useState<string>(() => {
    return (matchData as any)?.opponent?.styleId || 
           (matchData as any)?.opponent?.style?.id || 
           (matchData as any)?.dummyStyleId || 
           (matchData as any)?.dummyConfig?.styleId || 
           'basic';
  });
  const [dummyHeightInInches, setDummyHeightInInches] = useState<number>(70);
  const [infiniteStamina, setInfiniteStamina] = useState<boolean>(() => {
    return !!((matchData as any)?.infiniteStamina || (matchData as any)?.dummyConfig?.staminaRecovery);
  });
  const [oneHitKODummy, setOneHitKODummy] = useState(false);
  const [godMode, setGodMode] = useState<boolean>(() => {
    return !!((matchData as any)?.godMode || (matchData as any)?.dummyConfig?.healthRecovery);
  });
  const [infiniteAIStamina, setInfiniteAIStamina] = useState<boolean>(false);
  const [isTrainingHudOpen, setIsTrainingHudOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return false;
    }
    return true;
  });
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1.0);
  const simulationSpeedRef = useRef<number>(1.0);

  const handleGameSpeedChange = (speed: number) => {
    setSimulationSpeed(speed);
    simulationSpeedRef.current = speed;
    if (stateRef.current.player) {
      spawnFloatingText(
        stateRef.current.player.x,
        stateRef.current.player.y - 35,
        `SPEED: ${speed}x`,
        speed < 1.0 ? '#f59e0b' : '#38bdf8'
      );
    }
  };

  const [totalDamageDealt, setTotalDamageDealt] = useState<number>(0);
  const [totalHitsLanded, setTotalHitsLanded] = useState<number>(0);
  const [showHitboxes, setShowHitboxes] = useState<boolean>(false);
  const [totalDamageTaken, setTotalDamageTaken] = useState<number>(0);
  const [totalSwings, setTotalSwings] = useState<number>(0);
  const [totalParries, setTotalParries] = useState<number>(0);
  const [totalBlocks, setTotalBlocks] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [opponentDistance, setOpponentDistance] = useState<number>(0);
  const [freezeAI, setFreezeAI] = useState<boolean>(() => !!(matchData as any)?.isTestGame);
  const [playerCombatState, setPlayerCombatState] = useState<string>('NEUTRAL');
  const [dummyCombatState, setDummyCombatState] = useState<string>('NEUTRAL');
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());
  const [streak, setStreak] = useState(0);
  const [isDead, setIsDead] = useState(false);
  const [showControlsHelp, setShowControlsHelp] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 1024;
  });
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showHudEditor, setShowHudEditor] = useState<boolean>(false);
  const [isLiveHudEditing, setIsLiveHudEditing] = useState<boolean>(() => !!(matchData as any)?.startWithLiveHud);
  const [showFullSettings, setShowFullSettings] = useState<boolean>(false);

  const isOfflineMatch = !matchData?.socket || !!matchData?.isAiMatch || !matchData?.isRealMatch;
  const isGamePaused = isOfflineMatch && (showMobileMenu || showFullSettings || showHudEditor);
  const isGamePausedRef = useRef(false);
  isGamePausedRef.current = isGamePaused;

  const isLiveHudEditingRef = useRef(false);
  isLiveHudEditingRef.current = isLiveHudEditing;

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [isPortrait, setIsPortrait] = useState(() => typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false);

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    const handleTouchStart = () => {
      setIsTouchDevice(true);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);

  // AI vs AI Spectator Chamber Controls State
  const [spectatorModalOpen, setSpectatorModalOpen] = useState<boolean>(false);
  const [specBot1Style, setSpecBot1Style] = useState<string>(() => matchData?.bot1StyleId || (matchData?.opponent as any)?.style?.id || 'street_boxing');
  const [specBot1Diff, setSpecBot1Diff] = useState<string>(() => matchData?.bot1Difficulty || (matchData?.opponent as any)?.aiDifficulty || 'silver');
  const [specBot1Height, setSpecBot1Height] = useState<number>(() => matchData?.bot1HeightInInches || (matchData?.opponent as any)?.heightInInches || 70);

  const [specBot2Style, setSpecBot2Style] = useState<string>(() => matchData?.bot2StyleId || (matchData?.spectatorFighter2 as any)?.style?.id || 'shotokan');
  const [specBot2Diff, setSpecBot2Diff] = useState<string>(() => matchData?.bot2Difficulty || (matchData?.spectatorFighter2 as any)?.aiDifficulty || matchData?.aiDifficulty || 'gold');
  const [specBot2Height, setSpecBot2Height] = useState<number>(() => matchData?.bot2HeightInInches || (matchData?.spectatorFighter2 as any)?.heightInInches || 70);

  // Spectator Mode & Broadcast States
  const [spectatorCount, setSpectatorCount] = useState<number>(0);
  const [spectatorCamMode, setSpectatorCamMode] = useState<'track' | 'wide' | 'p1' | 'p2'>('track');
  const [spectatorReactions, setSpectatorReactions] = useState<Array<{ id: number; text: string; emoji: string; sender: string }>>([]);

  // Temporary Practice Player Stats (Does not save to persistent user stats)
  const [practicePlayerStyleId, setPracticePlayerStyleId] = useState<string>(() => (matchData as any)?.playerStyleId || stats.selectedStyleId || 'basic');
  const [practicePlayerHeightInInches, setPracticePlayerHeightInInches] = useState<number>(() => stats.heightInInches || 68);
  const [practiceModalTab, setPracticeModalTab] = useState<'styles' | 'difficulty' | 'modifiers'>('styles');
  const [trainingHudTab, setTrainingHudTab] = useState<'style' | 'ai' | 'mods' | 'stats'>('style');

  // Ranked Competitive Match States (Best of 5, First to 3 scores, 3 mins per round)
  const [rankedState, setRankedState] = useState<'countdown' | 'fighting' | 'round_over' | 'match_over'>('countdown');
  
  const isCombatActive = (isPlaying && !showModeSelector && rankedState !== 'match_over') || (matchData !== null && rankedState !== 'match_over');

  useEffect(() => {
    if (onCombatStateChange) {
      onCombatStateChange(isCombatActive);
    }
  }, [isCombatActive, onCombatStateChange]);

  useEffect(() => {
    return () => {
      onCombatStateChange?.(false);
    };
  }, [onCombatStateChange]);

  const [rankedCountdown, setRankedCountdown] = useState<number>(3);
  const [showFightBanner, setShowFightBanner] = useState<boolean>(false);
  const [roundTimeLeft, setRoundTimeLeft] = useState<number>(180);
  const [playerScore, setPlayerScore] = useState<number>(0);
  const [opponentScore, setOpponentScore] = useState<number>(0);
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [matchWinner, setMatchWinner] = useState<'player' | 'opponent' | null>(null);
  const [rematchRequested, setRematchRequested] = useState<boolean>(false);
  const [opponentRematchRequested, setOpponentRematchRequested] = useState<boolean>(false);
  const [postMatchTimer, setPostMatchTimer] = useState<number>(30);
  const [opponentDisconnected, setOpponentDisconnected] = useState<boolean>(false);
  const [matchDamageDealt, setMatchDamageDealt] = useState<number>(0);
  const [matchDamageTaken, setMatchDamageTaken] = useState<number>(0);
  const [matchHitsLanded, setMatchHitsLanded] = useState<number>(0);
  const matchStartTimeRef = useRef<number>(Date.now());
  const matchLightsLandedRef = useRef<number>(0);
  const matchHeaviesLandedRef = useRef<number>(0);
  const matchParriesLandedRef = useRef<number>(0);
  const matchBlockedStrikesRef = useRef<number>(0);
  const matchM1ChainsRef = useRef<number>(0);
  const matchWhiffPunishesRef = useRef<number>(0);
  const matchGuardBreaksRef = useRef<number>(0);
  const matchForwardFramesRef = useRef<number>(0);
  const matchTotalFramesRef = useRef<number>(0);
  const matchPostureBreaksRef = useRef<number>(0);
  const playerMinPosturePctRef = useRef<number>(100);
  const matchCounterHitsRef = useRef<number>(0);
  const lastParryTimestampRef = useRef<number>(0);
  const matchDamageDealtRef = useRef<number>(0);
  const matchDamageTakenRef = useRef<number>(0);
  const roundDamageTakenRef = useRef<number>(0);
  const matchBlockedDamageRef = useRef<number>(0);
  const matchFirstHitOccurredRef = useRef<boolean>(false);
  const matchLastHitWasM2Ref = useRef<boolean>(false);

  // Section 5.7: Round-by-Round Telemetry & Ranked AI Elo Scaling
  const roundStartTimeRef = useRef<number>(Date.now());
  const roundDamageDealtRef = useRef<number>(0);
  const roundLightsLandedRef = useRef<number>(0);
  const roundHeaviesLandedRef = useRef<number>(0);
  const roundParriesLandedRef = useRef<number>(0);
  const timeSliceTimerRef = useRef<number>(0);
  const dominantSlicesRef = useRef<number>(0);
  const passiveSlicesRef = useRef<number>(0);
  const totalSlicesRef = useRef<number>(0);
  const minPlayerHpPctRef = useRef<number>(100);
  const sliceDamageDealtRef = useRef<number>(0);
  const sliceDamageTakenRef = useRef<number>(0);
  const roundReportsRef = useRef<RoundReport[]>([]);
  const [roundReports, setRoundReports] = useState<RoundReport[]>([]);
  const [rankedAiBreakdown, setRankedAiBreakdown] = useState<RankedAiEloBreakdown | null>(null);

  const [matchChatMessages, setMatchChatMessages] = useState<Array<{ sender: string; text: string; time: string; isSelf?: boolean }>>([]);
  const [showCodex, setShowCodex] = useState<boolean>(false);

  // Synchronized refs for safe access outside React render phase
  const statsRef = useRef(stats);
  statsRef.current = stats;
  const playerScoreRef = useRef(playerScore);
  playerScoreRef.current = playerScore;
  const opponentScoreRef = useRef(opponentScore);
  opponentScoreRef.current = opponentScore;
  const roundNumberRef = useRef(roundNumber);
  roundNumberRef.current = roundNumber;

  // Track carried health across rounds for AI bots (AI bots do NOT heal 100% on next round)
  const carriedDummyHpRef = useRef<number | null>(null);
  const carriedPlayerHpRef = useRef<number | null>(null);

  const recordMatchEnd = (winner: 'player' | 'opponent', reasonText: string = '') => {
    const playerHP = stateRef.current.player?.health || 0;
    const playerMaxHP = stateRef.current.player?.maxHealth || 100;
    const hpRemainingRatio = playerMaxHP > 0 ? playerHP / playerMaxHP : 1;
    const modeKey = getMatchModeKey();
    const matchDurationSec = Math.max(1, Math.round((Date.now() - matchStartTimeRef.current) / 1000));
    const lightOnly = matchHeaviesLandedRef.current === 0 && matchLightsLandedRef.current > 0;
    const finalHitWasM2 = matchLastHitWasM2Ref.current;
    const isFlawless = matchDamageTakenRef.current === 0 || roundDamageTakenRef.current === 0;

    if (winner === 'player') {
      QuestTracker.trackEvent(userEmail, {
        type: 'win',
        mode: modeKey,
        hpRemainingRatio,
        finalHitWasM2,
        matchDurationSec,
        lightOnly,
        styleId: stats.selectedStyleId,
        parriesLanded: matchParriesLandedRef.current,
        heaviesLanded: matchHeaviesLandedRef.current,
        lightsLanded: matchLightsLandedRef.current,
        damageDealtVal: matchDamageDealtRef.current
      });

      if (isFlawless) {
        QuestTracker.trackEvent(userEmail, {
          type: 'clean_round',
          mode: modeKey
        });
      }

      QuestTracker.trackEvent(userEmail, {
        type: 'style_used',
        mode: modeKey,
        styleId: stats.selectedStyleId
      });
    } else {
      QuestTracker.trackEvent(userEmail, {
        type: 'loss',
        mode: modeKey,
        parriesLanded: matchParriesLandedRef.current,
        heaviesLanded: matchHeaviesLandedRef.current,
        lightsLanded: matchLightsLandedRef.current,
        damageDealtVal: matchDamageDealtRef.current
      });
    }

    // Offline Quests Progression Tracking (Singleplayer vs AI & Tournament)
    if (matchData?.isAiMatch) {
      const isRankedAi = matchData.aiModeType === 'ranked';
      const isTournament = matchData.aiModeType === 'tournament';
      const isCasualAi = !isRankedAi && !isTournament;
      const isWin = winner === 'player';
      const currentRoundReports = roundReportsRef.current || [];
      const firstReport = currentRoundReports[0];

      const styleId = stats.selectedStyleId || 'basic';
      let styleClass: 'Striker' | 'Grappler' | 'Hybrid' = 'Striker';
      if (styleId === 'aikido') styleClass = 'Grappler';
      else if (styleId === 'shotokan' || styleId === 'capoeira') styleClass = 'Hybrid';

      OfflineQuestManager.recordAiMatchResult(userEmail, {
        isRankedAi,
        isTournament,
        isCasualAi,
        isWin,
        playerWonMatch: isWin,
        roundsWonPlayer: playerScoreRef.current,
        roundsWonAi: opponentScoreRef.current,
        totalHitsTaken: matchDamageTakenRef.current > 0 ? Math.ceil(matchDamageTakenRef.current / 16) : 0,
        parriesLanded: matchParriesLandedRef.current,
        heaviesLanded: matchHeaviesLandedRef.current,
        m1CombosCompleted: Math.floor((matchLightsLandedRef.current || 0) / 4),
        armorDamageDealt: Math.round(matchDamageDealtRef.current * 0.25),
        overheadGrappleSlams: styleId === 'aikido' ? (matchHeaviesLandedRef.current || 1) : 0,
        m1PocketHits: matchLightsLandedRef.current,
        ironBoxingM2Parries: styleId === 'iron_boxing' ? matchParriesLandedRef.current : 0,
        sluggerBoneFractures: styleId === 'slugger' ? (matchHeaviesLandedRef.current || 1) : 0,
        usedAikidoGrapple: styleId === 'aikido',
        usedStrikerOnlyNoGrapple: styleId !== 'aikido',
        usedStreetBoxing: styleId === 'street_boxing',
        usedIronBoxing: styleId === 'iron_boxing',
        usedSlugger: styleId === 'slugger',
        playerStyleClass: styleClass,
        round1Grade: firstReport?.grade,
        overallMatchGrade: firstReport?.grade === 'S+' ? 'SSS' : (firstReport?.grade === 'S' ? 'S' : 'A'),
        clutchLowHpRoundWin: currentRoundReports.some(r => r.winner === 'player' && r.isClutchComeback),
        fastRoundWinUnder20sWithSPlus: currentRoundReports.some(r => r.winner === 'player' && r.durationSec <= 20 && (r.grade === 'S+' || r.grade === 'S')),
        tournamentChampion: isTournament && matchData?.tournamentRound === 'final' && isWin,
        tournamentCleanSweep6_0: isTournament && matchData?.tournamentRound === 'final' && isWin && opponentScoreRef.current === 0,
        opponentTier: matchData?.aiDifficulty || 'silver',
        currentStreakWithoutLosingRound: (stats.aiWinStreak || 0) + (isWin ? 1 : 0),
      });
    }

    // Career Milestones Progression Tracking (Solo AI & General Combat)
    const isAi = Boolean(matchData?.isAiMatch);
    const isRankedAi = isAi && matchData?.aiModeType === 'ranked';
    const isTournament = isAi && matchData?.aiModeType === 'tournament';
    const isWin = winner === 'player';
    const currentRoundReports = roundReportsRef.current || [];
    const diffKey = matchData?.aiDifficulty as string | undefined;
    const isAmethystPlus = isAi && (diffKey === 'amethyst' || diffKey === 'obsidian');
    const amethystSssCount = isAmethystPlus
      ? currentRoundReports.filter(r => r.winner === 'player' && (r.grade === 'SSS' || r.grade === 'S+')).length
      : 0;

    CareerMilestoneManager.recordEvent(userEmail, {
      aiKnockoutDelta: isAi ? (isWin ? Math.max(1, playerScoreRef.current) : playerScoreRef.current) : 0,
      rankedAiWin: isRankedAi && isWin,
      perfectParriesDelta: matchParriesLandedRef.current,
      m2HitsDelta: matchHeaviesLandedRef.current,
      tournament1Win: isTournament && (matchData?.tournamentRound === 'final' || !matchData?.tournamentRound) && isWin,
      amethystSssRoundDelta: amethystSssCount,
      fullM1ChainDelta: matchM1ChainsRef.current > 0 ? matchM1ChainsRef.current : Math.floor((matchLightsLandedRef.current || 0) / 4),
      m1HitsDelta: matchLightsLandedRef.current,
      blockedStrikesDelta: matchBlockedStrikesRef.current,
    });
  };

  // Ranked & AI Match mode countdown & round timer effect
  useEffect(() => {
    if (!matchData || (!matchData.isCompetitive && !matchData.isAiMatch)) return;

    let interval: NodeJS.Timeout;

    if (rankedState === 'countdown') {
      interval = setInterval(() => {
        setRankedCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setTimeout(() => {
              const defaultRoundTime = (matchData?.gamemode === 'sustain_attack' || matchData?.gamemode === 'hot_potato')
                ? 60
                : (matchData?.roundTimeLimit || 180);
              setRankedState('fighting');
              setShowFightBanner(true);
              soundManager.playFightShout();
              setRoundTimeLeft(defaultRoundTime);
              setRankedCountdown(0);
            }, 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (rankedState === 'round_over') {
      interval = setInterval(() => {
        setRankedCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setTimeout(() => {
              initGame();
              const defaultRoundTime = (matchData?.gamemode === 'sustain_attack' || matchData?.gamemode === 'hot_potato')
                ? 60
                : (matchData?.roundTimeLimit || 180);
              // Jump directly to fighting! No 2nd timer!
              setRankedState('fighting');
              setShowFightBanner(true);
              soundManager.playFightShout();
              setRoundTimeLeft(defaultRoundTime);
              setRankedCountdown(0);
            }, 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (rankedState === 'fighting') {
      interval = setInterval(() => {
        if (isGamePausedRef.current) return;
        setRoundTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setTimeout(() => {
              if (matchData?.gamemode === 'sustain_attack') {
                const pDamage = stateRef.current.sustainPlayerDamage || 0;
                const oDamage = stateRef.current.sustainOpponentDamage || 0;
                const roundWin = pDamage >= oDamage ? 'player' : 'opponent';
                handleRoundWinner(roundWin);
              } else if (matchData?.gamemode === 'hot_potato') {
                // When match round ends (0s), immediately explode the potato on whoever is currently holding it!
                const holder = stateRef.current.potatoHolder;
                const victim = holder === 'player' ? stateRef.current.player : stateRef.current.dummy;
                const roundWin = holder === 'player' ? 'opponent' : 'player';

                if (victim) {
                  victim.health = 0;
                  victim.isDead = true;

                  // Huge explosion particle burst
                  for (let i = 0; i < 35; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = Math.random() * 8 + 3;
                    stateRef.current.particles.push({
                      id: `potato_timeout_boom_${Math.random()}`,
                      x: victim.x,
                      y: victim.y,
                      vx: Math.cos(angle) * speed,
                      vy: Math.sin(angle) * speed,
                      radius: Math.random() * 5 + 3,
                      color: i % 2 === 0 ? '#ef4444' : '#f59e0b',
                      alpha: 1.0,
                      life: 0,
                      maxLife: 45,
                      type: 'spark'
                    });
                  }

                  stateRef.current.shakeAmount = 30 * settings.screenShake;
                  soundManager.playKO();
                  spawnFloatingText(victim.x, victim.y - 45, '💥 ROUND TIMEOUT EXPLODED!', '#ef4444');
                }
                handleRoundWinner(roundWin);
              } else {
                const pHealth = stateRef.current.player?.health || 0;
                const dHealth = stateRef.current.dummy?.health || 0;
                const roundWin = pHealth > dHealth ? 'player' : (dHealth > pHealth ? 'opponent' : 'player');
                handleRoundWinner(roundWin);
              }
            }, 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (rankedState === 'match_over') {
      // Section 7.7.1: AI matches never kick the player out automatically; they leave only when they choose
      if (!matchData?.isAiMatch) {
        interval = setInterval(() => {
          setPostMatchTimer(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              setTimeout(() => {
                onBackToMenu();
              }, 0);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }

    return () => clearInterval(interval);
  }, [rankedState, matchData]);

  const handleMatchVictory = (reasonText: string = 'VICTORY!') => {
    soundManager.playKO();
    setMatchWinner('player');
    setRankedState('match_over');
    setPostMatchTimer(30);
    setShowMobileMenu(false);
    
    if (stateRef.current.dummy) {
      stateRef.current.dummy.isDead = true;
      stateRef.current.dummy.health = 0;
    }

    recordMatchEnd('player', reasonText);
    
    if (matchData?.isAiMatch) {
      if (matchData.aiModeType === 'ranked') {
        const diff = matchData.aiDifficulty || 'silver';
        const rewardCashMap: Record<string, number> = { rookie: 220, silver: 300, gold: 400, diamond: 550, amethyst: 800 };
        const bonusCash = rewardCashMap[diff] || 300;
        const eloGain = calculateWinEloGain(stats.aiElo ?? 100, false);
        const nextAiElo = (stats.aiElo ?? 100) + eloGain;
        updateStats({
          aiElo: nextAiElo,
          aiLossStreak: 0,
          aiWins: (stats.aiWins || 0) + 1,
          aiMatchesPlayed: (stats.aiMatchesPlayed || 0) + 1,
          cash: stats.cash + bonusCash
        });
        spawnFloatingText(stateRef.current.player?.x || 500, (stateRef.current.player?.y || 500) - 50, `${reasonText} +${eloGain} AI ELO | +$${bonusCash}`, '#10b981', true);
      } else if (matchData.aiModeType === 'tournament') {
        const round = matchData.tournamentRound || 'quarter';
        let bonusCash = 350;
        let bonusRolls = 1;
        let titleMsg = 'QUARTER-FINALS WON!';
        
        if (round === 'final') {
          bonusCash = 1000;
          bonusRolls = 5; // 100% Rewards: 5 Rolls Earned
          titleMsg = 'TOURNAMENT CHAMPION! 100% REWARD!';
        } else if (round === 'semi') {
          bonusCash = 600;
          bonusRolls = 2;
          titleMsg = 'SEMI-FINALS WON!';
        }

        updateStats({
          cash: stats.cash + bonusCash,
          rolls: (stats.rolls || 0) + bonusRolls,
          aiMatchesPlayed: (stats.aiMatchesPlayed || 0) + 1
        });
        spawnFloatingText(stateRef.current.player?.x || 500, (stateRef.current.player?.y || 500) - 50, `${titleMsg} +$${bonusCash} | +${bonusRolls} ROLLS!`, '#f59e0b', true);
      } else if (matchData.aiModeType === 'spectator') {
        spawnFloatingText(stateRef.current.player?.x || 500, (stateRef.current.player?.y || 500) - 50, `SPECTATOR SIMULATION COMPLETED!`, '#a855f7', true);
      } else {
        // Casual VS AI
        const bonusCash = 120;
        updateStats({
          cash: stats.cash + bonusCash,
          aiMatchesPlayed: (stats.aiMatchesPlayed || 0) + 1
        });
        spawnFloatingText(stateRef.current.player?.x || 500, (stateRef.current.player?.y || 500) - 50, `${reasonText} +$${bonusCash}`, '#3b82f6', true);
      }
    } else {
      if (matchData?.isCompetitive) {
        const eloGain = calculateWinEloGain(stats.elo ?? 0, false, matchData?.eloModifier || 'standard');
        updateStats({ elo: (stats.elo ?? 0) + eloGain, lossStreak: 0 });
        spawnFloatingText(stateRef.current.player?.x || 500, (stateRef.current.player?.y || 500) - 50, `${reasonText} +${eloGain} ELO`, '#10b981', true);
      } else {
        spawnFloatingText(stateRef.current.player?.x || 500, (stateRef.current.player?.y || 500) - 50, `${reasonText} (UNRANKED)`, '#10b981', true);
      }
    }
  };

  const handleMatchDefeat = (reasonText: string = 'DEFEAT!') => {
    soundManager.playKO();
    setMatchWinner('opponent');
    setRankedState('match_over');
    setPostMatchTimer(30);
    setShowMobileMenu(false);

    if (stateRef.current.player) {
      stateRef.current.player.isDead = true;
      stateRef.current.player.health = 0;
    }

    recordMatchEnd('opponent', reasonText);

    if (matchData?.isAiMatch) {
      if (matchData.aiModeType === 'ranked') {
        const currentLossStreak = (stats.aiLossStreak || 0) + 1;
        const { eloLoss } = calculateLossEloLoss(stats.aiElo ?? 100, currentLossStreak, false);
        const nextAiElo = Math.max(0, (stats.aiElo ?? 100) - eloLoss);
        updateStats({
          aiElo: nextAiElo,
          aiLossStreak: currentLossStreak,
          aiMatchesPlayed: (stats.aiMatchesPlayed || 0) + 1
        });
        spawnFloatingText(stateRef.current.player?.x || 500, (stateRef.current.player?.y || 500) - 50, `${reasonText} -${eloLoss} AI ELO`, '#ef4444', true);
      } else if (matchData.aiModeType === 'tournament') {
        const round = matchData.tournamentRound || 'quarter';
        let rewardPct = '50%';
        let bonusCash = 500;
        let bonusRolls = 1;
        
        if (round === 'final') {
          rewardPct = '85%';
          bonusCash = 850;
          bonusRolls = 3;
        } else if (round === 'semi') {
          rewardPct = '75%';
          bonusCash = 750;
          bonusRolls = 2;
        } else {
          rewardPct = '50%';
          bonusCash = 500;
          bonusRolls = 1;
        }

        updateStats({
          cash: stats.cash + bonusCash,
          rolls: (stats.rolls || 0) + bonusRolls,
          aiMatchesPlayed: (stats.aiMatchesPlayed || 0) + 1
        });
        spawnFloatingText(stateRef.current.player?.x || 500, (stateRef.current.player?.y || 500) - 50, `TOURNAMENT (${rewardPct} REWARD): +$${bonusCash} | +${bonusRolls} ROLLS!`, '#eab308', true);
      } else if (matchData.aiModeType === 'spectator') {
        spawnFloatingText(stateRef.current.player?.x || 500, (stateRef.current.player?.y || 500) - 50, `SPECTATOR SIMULATION COMPLETED!`, '#a855f7', true);
      } else {
        // Casual VS AI
        updateStats({
          aiMatchesPlayed: (stats.aiMatchesPlayed || 0) + 1
        });
        spawnFloatingText(stateRef.current.player?.x || 500, (stateRef.current.player?.y || 500) - 50, `${reasonText} (CASUAL)`, '#94a3b8', true);
      }
    } else {
      if (matchData?.isCompetitive) {
        const currentLossStreak = (stats.lossStreak || 0) + 1;
        const { eloLoss } = calculateLossEloLoss(stats.elo ?? 0, currentLossStreak, false);
        const nextElo = Math.max(0, (stats.elo ?? 0) - eloLoss);
        updateStats({ elo: nextElo, lossStreak: currentLossStreak });
        spawnFloatingText(stateRef.current.player?.x || 500, (stateRef.current.player?.y || 500) - 50, `${reasonText} -${eloLoss} ELO`, '#ef4444', true);
      } else {
        spawnFloatingText(stateRef.current.player?.x || 500, (stateRef.current.player?.y || 500) - 50, `${reasonText} (UNRANKED)`, '#94a3b8', true);
      }
    }
  };

  const updateTournamentBracketFromSpectate = (matchId: string, finalWinner: 'player' | 'opponent') => {
    try {
      const saved = localStorage.getItem('mma_sim_tournament_bracket_v1_7_4');
      if (saved) {
        const bracket = JSON.parse(saved);
        const allMatches = [
          ...(bracket.quarterMatches || []),
          ...(bracket.semiMatches || []),
          bracket.finalMatch
        ].filter(Boolean);
        const foundMatch = allMatches.find((m: any) => m && m.id === matchId);
        if (foundMatch) {
          foundMatch.isCompleted = true;
          foundMatch.winner = finalWinner === 'player' ? foundMatch.fighter1 : foundMatch.fighter2;
          foundMatch.isSimulating = false;

          if (bracket.quarterMatches?.[1]?.isCompleted && bracket.quarterMatches[1]?.winner) {
            if (!bracket.semiMatches[0].fighter2) bracket.semiMatches[0].fighter2 = bracket.quarterMatches[1].winner;
          }
          if (bracket.quarterMatches?.[2]?.isCompleted && bracket.quarterMatches[2]?.winner) {
            if (!bracket.semiMatches[1].fighter1) bracket.semiMatches[1].fighter1 = bracket.quarterMatches[2].winner;
          }
          if (bracket.quarterMatches?.[3]?.isCompleted && bracket.quarterMatches[3]?.winner) {
            if (!bracket.semiMatches[1].fighter2) bracket.semiMatches[1].fighter2 = bracket.quarterMatches[3].winner;
          }
          if (bracket.semiMatches?.[1]?.isCompleted && bracket.semiMatches[1]?.winner) {
            if (!bracket.finalMatch.fighter2) bracket.finalMatch.fighter2 = bracket.semiMatches[1].winner;
          }

          localStorage.setItem('mma_sim_tournament_bracket_v1_7_4', JSON.stringify(bracket));
        }
      }
    } catch (e) {
      console.error('Failed to update tournament bracket from Spectator mode', e);
    }
  };

  const handleRoundWinner = (winner: 'player' | 'opponent') => {
    soundManager.playKO();

    const currentStats = statsRef.current;
    const isRealMatch = !!(matchData && matchData.isRealMatch);
    const isP1 = !!(matchData && matchData.isPlayer1);

    const prevP = playerScoreRef.current;
    const prevO = opponentScoreRef.current;
    const currentRound = roundNumberRef.current;

    const newP = winner === 'player' ? prevP + 1 : prevP;
    const newO = winner === 'opponent' ? prevO + 1 : prevO;

    setPlayerScore(newP);
    setOpponentScore(newO);

    // Section 5.7 V2.0: Time-Slice Dominance & Performance Telemetry
    const currentRoundDuration = Math.max(1, Math.round((Date.now() - roundStartTimeRef.current) / 1000));
    const totalSlices = Math.max(1, totalSlicesRef.current);
    const dominantSlices = dominantSlicesRef.current;
    const dominancePct = Math.min(99, Math.max(5, Math.round((dominantSlices / totalSlices) * 100)));
    const aggressionRatio = dominantSlices / totalSlices;
    const minHp = minPlayerHpPctRef.current;
    const isClutchComeback = winner === 'player' && minHp <= 25 && currentRoundDuration >= 30;

    const roundEvaluated = evaluateRoundGrade(
      winner,
      roundDamageDealtRef.current,
      roundDamageTakenRef.current,
      currentRoundDuration,
      roundParriesLandedRef.current,
      dominancePct,
      minHp,
      isClutchComeback,
      roundHeaviesLandedRef.current,
      roundLightsLandedRef.current
    );

    const roundRep: RoundReport = {
      roundNumber: currentRound,
      winner,
      durationSec: currentRoundDuration,
      damageDealt: Math.round(roundDamageDealtRef.current),
      damageTaken: Math.round(roundDamageTakenRef.current),
      parriesLanded: roundParriesLandedRef.current,
      heaviesLanded: roundHeaviesLandedRef.current,
      lightsLanded: roundLightsLandedRef.current,
      grade: roundEvaluated.grade,
      gradeText: roundEvaluated.gradeText,
      isFlawless: winner === 'player' && roundDamageTakenRef.current === 0,
      dominancePct,
      aggressionRatio,
      minPlayerHpPct: minHp,
      isClutchComeback,
      summaryBullets: roundEvaluated.summaryBullets
    };

    roundReportsRef.current.push(roundRep);
    setRoundReports([...roundReportsRef.current]);

    // Reset round metrics and telemetry for next round
    roundDamageDealtRef.current = 0;
    roundDamageTakenRef.current = 0;
    roundLightsLandedRef.current = 0;
    roundHeaviesLandedRef.current = 0;
    roundParriesLandedRef.current = 0;
    timeSliceTimerRef.current = 0;
    dominantSlicesRef.current = 0;
    passiveSlicesRef.current = 0;
    totalSlicesRef.current = 0;
    minPlayerHpPctRef.current = 100;
    sliceDamageDealtRef.current = 0;
    sliceDamageTakenRef.current = 0;
    roundStartTimeRef.current = Date.now();

    // Floating KO Banner for Spectator
    if (matchData?.isAiVsAiSpectator) {
      const bot1Name = matchData.opponent?.name || matchData.bot1Name || 'BOT 1';
      const bot2Name = matchData.spectatorFighter2?.name || matchData.bot2Name || 'BOT 2';
      const roundWinnerName = winner === 'player' ? bot1Name : bot2Name;
      spawnFloatingText(
        stateRef.current.player?.x || 500,
        (stateRef.current.player?.y || 500) - 50,
        `ROUND KO: ${roundWinnerName.toUpperCase()} WINS ROUND!`,
        '#a855f7',
        true
      );
    }

    const targetScore = matchData?.targetScore || (matchData?.isAiVsAiSpectator ? 2 : 3);

    if (newP >= targetScore || newO >= targetScore) {
      const finalWinner = newP >= targetScore ? 'player' : 'opponent';
      setMatchWinner(finalWinner);
      setRankedState('match_over');

      if (matchData?.isAiVsAiSpectator) {
        const bot1Name = matchData.opponent?.name || matchData.bot1Name || 'BOT 1';
        const bot2Name = matchData.spectatorFighter2?.name || matchData.bot2Name || 'BOT 2';
        const matchWinnerName = finalWinner === 'player' ? bot1Name : bot2Name;
        
        if (matchData.tournamentMatchId) {
          updateTournamentBracketFromSpectate(matchData.tournamentMatchId, finalWinner);
        }
        localStorage.setItem('mma_tournament_notification', `Match Completed: ${matchWinnerName} won`);

        setTimeout(() => {
          handleExitArena('tournament');
        }, 1500);
        return;
      }

      const isTournament = matchData?.aiModeType === 'tournament';
      setPostMatchTimer(isTournament ? 25 : 30);

      // Trigger quest event tracking for the completed match
      recordMatchEnd(finalWinner);

      // Handle Tournament Mode Progression & Rewards (Section 5.6)
      if (isTournament) {
        const round = matchData.tournamentRound || 'quarter';
        const isWinner = finalWinner === 'player';
        
        try {
          localStorage.setItem('mma_tournament_last_aftermatch', JSON.stringify({
            round,
            winner: finalWinner,
            isWinner,
            playerScore,
            opponentScore,
            damageDealt: matchDamageDealt,
            damageTaken: matchDamageTaken,
            hitsLanded: matchHitsLanded,
            lightsLanded: matchLightsLandedRef.current,
            heaviesLanded: matchHeaviesLandedRef.current,
            parriesLanded: matchParriesLandedRef.current,
            opponentName: matchData.opponent?.name || (matchData as any).opponentName || 'Challenger',
            opponentStyle: matchData.opponent?.style?.name || (matchData as any).opponentStyle?.name || 'MMA',
            roundReports: roundReportsRef.current,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.error('Failed to save tournament aftermatch telemetry', e);
        }
        
        try {
          const saved = localStorage.getItem('mma_sim_tournament_bracket_v1_7_4');
          if (saved) {
            const bracket = JSON.parse(saved);
            if (bracket && bracket.status === 'in_progress') {
              if (round === 'quarter') {
                bracket.quarterMatches[0].isCompleted = true;
                bracket.quarterMatches[0].winner = isWinner ? 'PLAYER' : bracket.quarterMatches[0].fighter2;
                if (isWinner) {
                  bracket.semiMatches[0].fighter1 = 'PLAYER';
                  bracket.currentRound = 'semi';
                  updateStats({
                    aiMatchesPlayed: (currentStats.aiMatchesPlayed || 0) + 1
                  });
                  spawnFloatingText(stateRef.current.player?.x || 500, (stateRef.current.player?.y || 500) - 50, `ADVANCED TO SEMI-FINALS!`, '#10b981', true);
                } else {
                  bracket.status = 'eliminated';
                  bracket.playerExitRound = 'quarter';
                  bracket.playerFinalPlacement = 'quarter_exit';
                  // 5.6.5: Quarter-Finals Loss -> $500 Cash, +1 Roll (50% Reward)
                  updateStats({
                    cash: currentStats.cash + 500,
                    rolls: (currentStats.rolls || 0) + 1,
                    aiMatchesPlayed: (currentStats.aiMatchesPlayed || 0) + 1
                  });
                  spawnFloatingText(stateRef.current.player?.x || 500, (stateRef.current.player?.y || 500) - 50, `QUARTER-FINALS (50% REWARD): +$500 Cash | +1 Roll`, '#eab308', true);
                }
              } else if (round === 'semi') {
                bracket.semiMatches[0].isCompleted = true;
                bracket.semiMatches[0].winner = isWinner ? 'PLAYER' : bracket.semiMatches[0].fighter2;
                if (isWinner) {
                  bracket.finalMatch.fighter1 = 'PLAYER';
                  bracket.currentRound = 'final';
                  updateStats({
                    aiMatchesPlayed: (currentStats.aiMatchesPlayed || 0) + 1
                  });
                  spawnFloatingText(stateRef.current.player?.x || 500, (stateRef.current.player?.y || 500) - 50, `ADVANCED TO CHAMPIONSHIP FINALS!`, '#10b981', true);
                } else {
                  bracket.status = 'eliminated';
                  bracket.playerExitRound = 'semi';
                  bracket.playerFinalPlacement = 'semi_exit';
                  // 5.6.5: Semi-Finals Loss -> $750 Cash, +2 Rolls (75% Reward)
                  updateStats({
                    cash: currentStats.cash + 750,
                    rolls: (currentStats.rolls || 0) + 2,
                    aiMatchesPlayed: (currentStats.aiMatchesPlayed || 0) + 1
                  });
                  spawnFloatingText(stateRef.current.player?.x || 500, (stateRef.current.player?.y || 500) - 50, `SEMI-FINALS (75% REWARD): +$750 Cash | +2 Rolls`, '#eab308', true);
                }
              } else if (round === 'final') {
                bracket.finalMatch.isCompleted = true;
                bracket.finalMatch.winner = isWinner ? 'PLAYER' : bracket.finalMatch.fighter2;
                if (isWinner) {
                  bracket.status = 'completed';
                  bracket.playerFinalPlacement = 'champion';
                  // 5.6.5: Finals Winner (Champion) -> $1,000 Cash, +5 Rolls (100% Reward)
                  updateStats({
                    cash: currentStats.cash + 1000,
                    rolls: (currentStats.rolls || 0) + 5,
                    aiWins: (currentStats.aiWins || 0) + 1,
                    aiMatchesPlayed: (currentStats.aiMatchesPlayed || 0) + 1
                  });
                  spawnFloatingText(stateRef.current.player?.x || 500, (stateRef.current.player?.y || 500) - 50, `CHAMPION (100% REWARD): +$1,000 Cash | +5 Rolls!`, '#eab308', true);
                } else {
                  bracket.status = 'eliminated';
                  bracket.playerExitRound = 'final';
                  bracket.playerFinalPlacement = 'runner_up';
                  // 5.6.5: Finals Loss (Runner-Up) -> $800 Cash, +3 Rolls (80% Reward)
                  updateStats({
                    cash: currentStats.cash + 800,
                    rolls: (currentStats.rolls || 0) + 3,
                    aiMatchesPlayed: (currentStats.aiMatchesPlayed || 0) + 1
                  });
                  spawnFloatingText(stateRef.current.player?.x || 500, (stateRef.current.player?.y || 500) - 50, `RUNNER-UP (80% REWARD): +$800 Cash | +3 Rolls`, '#eab308', true);
                }
              }
              localStorage.setItem('mma_sim_tournament_bracket_v1_7_4', JSON.stringify(bracket));
            }
          }
        } catch (e) {
          console.error('Failed to update tournament bracket from Arena', e);
        }
      }

      // Handle Spectator AI vs AI match completion kickout
      if (matchData?.isAiVsAiSpectator && matchData?.tournamentMatchId) {
        try {
          const saved = localStorage.getItem('mma_sim_tournament_bracket_v1_7_4');
          if (saved) {
            const bracket = JSON.parse(saved);
            const allMatches = [...bracket.quarterMatches, ...bracket.semiMatches, bracket.finalMatch];
            const foundMatch = allMatches.find(m => m && m.id === matchData.tournamentMatchId);
            if (foundMatch) {
              foundMatch.isCompleted = true;
              foundMatch.winner = finalWinner === 'player' ? (foundMatch.fighter1 as any) : (foundMatch.fighter2 as any);
              foundMatch.isSimulating = false;
              if (bracket.currentRound === 'quarter') {
                const q2 = bracket.quarterMatches[1]?.winner;
                const q3 = bracket.quarterMatches[2]?.winner;
                const q4 = bracket.quarterMatches[3]?.winner;
                if (q2 && q2 !== 'PLAYER') bracket.semiMatches[0].fighter2 = q2;
                if (q3 && q4 && q3 !== 'PLAYER' && q4 !== 'PLAYER') {
                  bracket.semiMatches[1].fighter1 = q3;
                  bracket.semiMatches[1].fighter2 = q4;
                }
              } else if (bracket.currentRound === 'semi') {
                const s2 = bracket.semiMatches[1]?.winner;
                if (s2 && s2 !== 'PLAYER') bracket.finalMatch.fighter2 = s2;
              }
              localStorage.setItem('mma_sim_tournament_bracket_v1_7_4', JSON.stringify(bracket));
            }
          }
        } catch (e) {}
        localStorage.setItem('mma_tournament_notification', 'Match Completed');
        setTimeout(() => {
          handleExitArena('tournament');
        }, 1200);
      }

      if (finalWinner === 'player' && !isTournament) {
        if (matchData?.isAiMatch) {
          const playerHP = stateRef.current.player?.health || 100;
          const playerMaxHP = stateRef.current.player?.maxHealth || 100;
          const hpRatio = Math.max(0, playerHP / playerMaxHP);
          const roundReports = roundReportsRef.current || [];
          const parries = roundReports.reduce((sum, r) => sum + (r.parriesLanded || 0), 0);
          const parryBonus = Math.min(0.25, parries * 0.05);

          if (matchData.aiModeType === 'ranked') {
            const diff = matchData.aiDifficulty || 'silver';
            const rewardCashMap: Record<string, number> = { rookie: 220, silver: 300, gold: 400, diamond: 550, amethyst: 800 };
            const baseCash = rewardCashMap[diff] || 300;
            const perfMultiplier = 1.0 + (hpRatio * 0.35) + parryBonus;
            const bonusCash = Math.round(baseCash * perfMultiplier);
            const perfBonusAmount = bonusCash - baseCash;

            const currentAiElo = currentStats.aiElo ?? 100;
            const currentStreak = currentStats.aiWinStreak || 0;
            const forwardPressurePct = matchTotalFramesRef.current > 0
              ? Math.round((matchForwardFramesRef.current / matchTotalFramesRef.current) * 100)
              : 70;

            const breakdown = calculateRankedAiEloBreakdown(
              currentAiElo,
              true,
              currentStreak,
              roundReportsRef.current,
              {
                whiffPunishes: matchWhiffPunishesRef.current,
                guardBreaks: matchGuardBreaksRef.current,
                forwardPressurePct,
                fullM1Chains: matchM1ChainsRef.current,
                postureBreaks: matchPostureBreaksRef.current,
                playerMinPosturePct: playerMinPosturePctRef.current,
                counterHits: matchCounterHitsRef.current,
              }
            );
            setRankedAiBreakdown(breakdown);
            const nextAiElo = currentAiElo + breakdown.totalEloChange;
            updateStats({
              aiElo: nextAiElo,
              aiLossStreak: 0,
              aiWinStreak: currentStreak + 1,
              aiWins: (currentStats.aiWins || 0) + 1,
              aiMatchesPlayed: (currentStats.aiMatchesPlayed || 0) + 1,
              cash: currentStats.cash + bonusCash
            });
            const floatMsg = perfBonusAmount > 0 
              ? `VICTORY! +${breakdown.totalEloChange} AI ELO | +$${baseCash} (+$${perfBonusAmount} PERF)` 
              : `VICTORY! +${breakdown.totalEloChange} AI ELO | +$${bonusCash}`;
            spawnFloatingText(stateRef.current.player?.x || 500, (stateRef.current.player?.y || 500) - 50, floatMsg, '#10b981', true);
          } else {
            const diff = matchData.aiDifficulty || dummyBehavior || 'rookie';
            const casualRewardMap: Record<string, number> = {
              passive: 20, novice: 20, block: 20, rookie: 20, silver: 50, gold: 90, diamond: 140, amethyst: 200
            };
            const baseCasualCash = casualRewardMap[diff] ?? 20;
            const perfMultiplier = 0.85 + (hpRatio * 0.30) + (parryBonus * 0.5);
            const bonusCash = Math.round(baseCasualCash * perfMultiplier);

            updateStats({
              cash: currentStats.cash + bonusCash,
              aiMatchesPlayed: (currentStats.aiMatchesPlayed || 0) + 1
            });
            spawnFloatingText(stateRef.current.player?.x || 500, (stateRef.current.player?.y || 500) - 50, `VICTORY! +$${bonusCash} (${diff.toUpperCase()})`, '#3b82f6', true);
          }
        } else {
          if (matchData?.isCompetitive) {
            const eloGain = calculateWinEloGain(currentStats.elo ?? 0, false, matchData?.eloModifier || 'standard');
            updateStats({ elo: (currentStats.elo ?? 0) + eloGain, lossStreak: 0 });
            spawnFloatingText(stateRef.current.player?.x || 500, (stateRef.current.player?.y || 500) - 50, `VICTORY! +${eloGain} ELO`, '#10b981', true);
          } else {
            spawnFloatingText(stateRef.current.player?.x || 500, (stateRef.current.player?.y || 500) - 50, `VICTORY! (UNRANKED)`, '#10b981', true);
          }
        }
      } else {
        if (matchData?.isAiMatch) {
          if (matchData.aiModeType === 'ranked') {
            const currentLossStreak = (currentStats.aiLossStreak || 0);
            const currentAiElo = currentStats.aiElo ?? 100;
            const forwardPressurePct = matchTotalFramesRef.current > 0
              ? Math.round((matchForwardFramesRef.current / matchTotalFramesRef.current) * 100)
              : 45;

            const breakdown = calculateRankedAiEloBreakdown(
              currentAiElo,
              false,
              currentLossStreak,
              roundReportsRef.current,
              {
                whiffPunishes: matchWhiffPunishesRef.current,
                guardBreaks: matchGuardBreaksRef.current,
                forwardPressurePct,
                fullM1Chains: matchM1ChainsRef.current,
                postureBreaks: matchPostureBreaksRef.current,
                playerMinPosturePct: playerMinPosturePctRef.current,
                counterHits: matchCounterHitsRef.current,
              }
            );
            setRankedAiBreakdown(breakdown);
            const nextLossStreak = currentLossStreak + 1;
            const eloLoss = Math.abs(breakdown.totalEloChange);
            const nextAiElo = Math.max(0, currentAiElo - eloLoss);
            updateStats({
              aiElo: nextAiElo,
              aiWinStreak: 0,
              aiLossStreak: nextLossStreak,
              aiMatchesPlayed: (currentStats.aiMatchesPlayed || 0) + 1
            });
            spawnFloatingText(stateRef.current.player?.x || 500, (stateRef.current.player?.y || 500) - 50, `DEFEAT! -${eloLoss} AI ELO`, '#ef4444', true);
          } else {
            updateStats({
              aiMatchesPlayed: (currentStats.aiMatchesPlayed || 0) + 1
            });
            spawnFloatingText(stateRef.current.player?.x || 500, (stateRef.current.player?.y || 500) - 50, `DEFEAT! (CASUAL)`, '#94a3b8', true);
          }
        } else {
          if (matchData?.isCompetitive) {
            const currentLossStreak = (currentStats.lossStreak || 0) + 1;
            const { eloLoss } = calculateLossEloLoss(currentStats.elo ?? 0, currentLossStreak, false);
            const nextElo = Math.max(0, (currentStats.elo ?? 0) - eloLoss);
            updateStats({ elo: nextElo, lossStreak: currentLossStreak });
            spawnFloatingText(stateRef.current.player?.x || 500, (stateRef.current.player?.y || 500) - 50, `DEFEAT! -${eloLoss} ELO`, '#ef4444', true);
          } else {
            spawnFloatingText(stateRef.current.player?.x || 500, (stateRef.current.player?.y || 500) - 50, `DEFEAT! (UNRANKED)`, '#94a3b8', true);
          }
        }
      }

      if (isRealMatch && isP1 && matchData.socket) {
        const winnerCode = finalWinner === 'player' ? 'p1' : 'p2';
        (matchData.socket as WebSocket).send(JSON.stringify({
          type: 'game_event',
          event: 'round_sync',
          payload: { p1Score: newP, p2Score: newO, roundNumber: currentRound, rankedState: 'match_over', winner: winnerCode }
        }));
      }
    } else {
      const nextRound = currentRound + 1;
      setRoundNumber(nextRound);

      // Fully heal both fighters for the next round
      carriedDummyHpRef.current = null;
      carriedPlayerHpRef.current = null;

      setRankedState('round_over');
      stateRef.current.rankedState = 'round_over';
      setRankedCountdown(2);

      if (isRealMatch && isP1 && matchData.socket) {
        (matchData.socket as WebSocket).send(JSON.stringify({
          type: 'game_event',
          event: 'round_sync',
          payload: { p1Score: newP, p2Score: newO, roundNumber: nextRound, rankedState: 'round_over' }
        }));
      }
    }
  };

  useEffect(() => {
    const isMobile = isMobileDevice();
    setIsTouchDevice(isMobile || settings.showVirtualControls === 'always');
  }, [settings.showVirtualControls]);

  useEffect(() => {
    if (matchData) {
      setShowModeSelector(false);
      setIsPlaying(true);
      initGame();
    }
  }, [matchData]);

  // Immediate WebSocket state broadcast helper for zero-latency input reaction
  const sendImmediateWsGameState = useCallback(() => {
    if (
      matchData && 
      matchData.isRealMatch && 
      matchData.socket && 
      matchData.socket.readyState === WebSocket.OPEN
    ) {
      const player = stateRef.current.player;
      if (player) {
        lastWsSendTimeRef.current = performance.now();
        matchData.socket.send(JSON.stringify({
          type: 'game_state',
          state: {
            x: player.x,
            y: player.y,
            vx: player.vx,
            vy: player.vy,
            facingAngle: player.facingAngle,
            attackLockedAngle: player.attackLockedAngle,
            health: player.health,
            isBlocking: player.isBlocking,
            blockTimer: player.blockTimer || 0,
            heavyWindup: player.heavyWindup || 0,
            stunTime: player.stunTime || 0,
            strikeCooldown: player.strikeCooldown || 0,
            lightCooldown: player.lightCooldown || 0,
            postureCd: player.postureCd || 0,
            superCrippleTimer: player.superCrippleTimer || 0,
            boneFractureTimer: player.boneFractureTimer || 0,
            crippleTime: player.crippleTime || 0,
            concussTime: player.concussTime || 0,
            armorHP: player.armorHP,
            isDead: player.isDead,
            comboStage: player.comboStage,
            comboResetTimer: player.comboResetTimer,
            ashiharaM2Stage: player.ashiharaM2Stage || 0,
            ashiharaM2Timer: player.ashiharaM2Timer || 0,
            parryFlashTime: player.parryFlashTime || 0,
            parriedStun: player.parriedStun || 0,
            hitMovementLock: player.hitMovementLock || 0,
            hitSteeringLock: player.hitSteeringLock || 0,
            isDashing: player.isDashing || false,
            dashProgress: player.dashProgress || 0,
            kickboxingIsSeq2: player.kickboxingIsSeq2 || false,
            fists: player.fists.map(f => ({
              isPunching: f.isPunching,
              punchProgress: f.punchProgress,
              punchType: f.punchType,
              angle: f.angle,
              isHeavy: !!f.isHeavy
            }))
          }
        }));
      }
    }
  }, [matchData]);

  // Real PvP WebSocket Synchronization Effect
  useEffect(() => {
    if (matchData && matchData.isRealMatch && matchData.socket) {
      const socket = matchData.socket as WebSocket;
      console.log('[Arena] Listening to real-time PvP websocket packets');

      const handleSocketMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          const state = stateRef.current;

          if (data.type === 'opponent_game_state') {
            if (state.dummy && data.state) {
              const oppState = data.state;

              // Smooth 65% position lerp to eliminate choppy movement/jitter
              const distSq = (state.dummy.x - oppState.x) ** 2 + (state.dummy.y - oppState.y) ** 2;
              if (distSq > 3600) { // > 60px gap -> snap directly (teleport / round start / respawn)
                state.dummy.x = oppState.x;
                state.dummy.y = oppState.y;
              } else {
                state.dummy.x = state.dummy.x * 0.35 + oppState.x * 0.65;
                state.dummy.y = state.dummy.y * 0.35 + oppState.y * 0.65;
              }

              state.dummy.vx = oppState.vx;
              state.dummy.vy = oppState.vy;
              state.dummy.facingAngle = oppState.facingAngle;
              state.dummy.attackLockedAngle = oppState.attackLockedAngle;
              state.dummy.health = oppState.health;

              // Block & Parry Window Sync:
              // When guard is raised, immediately sync blockTimer = 0 or oppState.blockTimer
              if (!state.dummy.isBlocking && oppState.isBlocking) {
                state.dummy.blockTimer = oppState.blockTimer !== undefined ? oppState.blockTimer : 0;
              } else if (oppState.isBlocking && oppState.blockTimer !== undefined) {
                // If local blockTimer is out of sync with opponent's actual blockTimer, adjust it
                if (Math.abs((state.dummy.blockTimer || 0) - oppState.blockTimer) > 2) {
                  state.dummy.blockTimer = oppState.blockTimer;
                }
              }
              state.dummy.isBlocking = oppState.isBlocking;

              // Status debuffs & combat timers sync
              state.dummy.heavyWindup = oppState.heavyWindup;
              if (oppState.stunTime !== undefined) {
                state.dummy.stunTime = Math.max(state.dummy.stunTime || 0, oppState.stunTime || 0);
              }
              state.dummy.strikeCooldown = oppState.strikeCooldown !== undefined ? oppState.strikeCooldown : state.dummy.strikeCooldown;
              state.dummy.lightCooldown = oppState.lightCooldown !== undefined ? oppState.lightCooldown : state.dummy.lightCooldown;
              state.dummy.postureCd = oppState.postureCd !== undefined ? oppState.postureCd : state.dummy.postureCd;
              state.dummy.superCrippleTimer = oppState.superCrippleTimer !== undefined ? oppState.superCrippleTimer : state.dummy.superCrippleTimer;
              state.dummy.boneFractureTimer = oppState.boneFractureTimer !== undefined ? oppState.boneFractureTimer : state.dummy.boneFractureTimer;
              state.dummy.crippleTime = oppState.crippleTime !== undefined ? oppState.crippleTime : state.dummy.crippleTime;
              state.dummy.concussTime = oppState.concussTime !== undefined ? oppState.concussTime : state.dummy.concussTime;

              state.dummy.armorHP = oppState.armorHP;
              state.dummy.isDead = oppState.isDead;
              state.dummy.comboStage = oppState.comboStage;
              state.dummy.comboResetTimer = oppState.comboResetTimer;
              state.dummy.ashiharaM2Stage = oppState.ashiharaM2Stage || 0;
              state.dummy.ashiharaM2Timer = oppState.ashiharaM2Timer || 0;
              state.dummy.parryFlashTime = oppState.parryFlashTime || 0;
              if (oppState.parriedStun !== undefined) {
                state.dummy.parriedStun = oppState.parriedStun;
              }
              if (oppState.hitMovementLock !== undefined) {
                state.dummy.hitMovementLock = oppState.hitMovementLock;
              }
              if (oppState.hitSteeringLock !== undefined) {
                state.dummy.hitSteeringLock = oppState.hitSteeringLock;
              }
              state.dummy.isDashing = oppState.isDashing || false;
              state.dummy.dashProgress = oppState.dashProgress || 0;
              state.dummy.kickboxingIsSeq2 = oppState.kickboxingIsSeq2 || false;

              if (oppState.fists && state.dummy.fists) {
                oppState.fists.forEach((f: any, idx: number) => {
                  const dFist = state.dummy.fists[idx];
                  if (dFist) {
                    dFist.isPunching = f.isPunching;
                    if (f.isPunching) {
                      dFist.punchProgress = dFist.punchProgress * 0.25 + f.punchProgress * 0.75;
                    } else {
                      dFist.punchProgress = f.punchProgress;
                    }
                    dFist.punchType = f.punchType;
                    dFist.angle = f.angle;
                    dFist.isHeavy = !!f.isHeavy;
                  }
                });
              }
            }
          } else if (data.type === 'opponent_game_event') {
            const eventName = data.event;
            const payload = data.payload;

            if (eventName === 'round_sync') {
              const isP1 = !!matchData.isPlayer1;
              const myScore = isP1 ? payload.p1Score : payload.p2Score;
              const oppScore = isP1 ? payload.p2Score : payload.p1Score;
              setPlayerScore(myScore);
              setOpponentScore(oppScore);
              if (payload.roundNumber) setRoundNumber(payload.roundNumber);

              if (payload.rankedState === 'match_over') {
                const isWinner = (payload.winner === 'p1' && isP1) || (payload.winner === 'p2' && !isP1);
                setMatchWinner(isWinner ? 'player' : 'opponent');
                setRankedState('match_over');
                setPostMatchTimer(30);
              } else if (payload.rankedState === 'round_over') {
                setRankedState('round_over');
                setRankedCountdown(2);
              }
            } else if (eventName === 'player_died') {
              // If opponent died on their screen, trigger round win on P1
              if (matchData.isPlayer1) {
                handleRoundWinner('player');
              }
            } else if (eventName === 'spawn_text') {
              if (payload.text && payload.text.includes('PARRY')) {
                const now = performance.now();
                if (now - lastParryTimestampRef.current >= 350) {
                  lastParryTimestampRef.current = now;
                  spawnFloatingText(payload.x, payload.y, payload.text, payload.color, true);
                }
              } else {
                spawnFloatingText(payload.x, payload.y, payload.text, payload.color, true);
              }
            } else if (eventName === 'play_sound') {
              if (payload.sound === 'parry') {
                const now = performance.now();
                if (now - lastParryTimestampRef.current >= 350) {
                  lastParryTimestampRef.current = now;
                  soundManager.playParry();
                }
              } else if (payload.sound === 'hit') soundManager.playPunch();
              else if (payload.sound === 'dash') soundManager.playDash();
              else if (payload.sound === 'ko') soundManager.playKO();
            }
          } else if (data.type === 'opponent_surrendered') {
            soundManager.playKO();
            handleMatchVictory('OPPONENT SURRENDERED! VICTORY!');
          } else if (data.type === 'opponent_disconnected') {
            soundManager.playKO();
            setOpponentDisconnected(true);
            handleMatchVictory('OPPONENT DISCONNECTED! VICTORY!');
          } else if (data.type === 'room_rematch_status') {
            const isP1 = matchData.isPlayer1;
            setRematchRequested(isP1 ? !!data.p1Rematch : !!data.p2Rematch);
            setOpponentRematchRequested(isP1 ? !!data.p2Rematch : !!data.p1Rematch);
          } else if (data.type === 'room_rematch_started') {
            setPlayerScore(0);
            setOpponentScore(0);
            setRoundNumber(1);
            setMatchWinner(null);
            setMatchDamageDealt(0);
            matchLightsLandedRef.current = 0;
            matchHeaviesLandedRef.current = 0;
            matchParriesLandedRef.current = 0;
            matchBlockedStrikesRef.current = 0;
            matchM1ChainsRef.current = 0;
            matchDamageDealtRef.current = 0;
            setMatchDamageTaken(0);
            setMatchHitsLanded(0);
            setRematchRequested(false);
            setOpponentRematchRequested(false);
            setRankedState('countdown');
            setRankedCountdown(3);
            initGame();
          } else if (data.type === 'chat_message' || data.type === 'room_chat') {
            const isSelf = data.senderId === (matchData.isPlayer1 ? 'p1' : 'p2');
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setMatchChatMessages(prev => [...prev.slice(-40), {
              sender: data.senderName || (isSelf ? 'You' : (matchData.opponent?.name || 'Opponent')),
              text: data.text || '',
              time: timeStr,
              isSelf
            }]);
          }
        } catch (err) {
          console.error('[Arena] Failed to parse PvP message:', err);
        }
      };

      socket.addEventListener('message', handleSocketMessage);
      return () => {
        socket.removeEventListener('message', handleSocketMessage);
      };
    }
  }, [matchData]);
  
  useEffect(() => {
    stateRef.current.infiniteStamina = infiniteStamina;
    stateRef.current.oneHitKO = oneHitKODummy;
    stateRef.current.godMode = godMode;
    stateRef.current.infiniteAIStamina = infiniteAIStamina;
    stateRef.current.rankedState = rankedState;
  }, [infiniteStamina, oneHitKODummy, godMode, infiniteAIStamina, rankedState]);

  // React mirror of important refs for overlay rendering
  const [playerHP, setPlayerHP] = useState(100);
  const [playerMaxHP, setPlayerMaxHP] = useState(100);
  const [playerArmor, setPlayerArmor] = useState(18);
  const [dummyHP, setDummyHP] = useState(100);
  const [dummyMaxHP, setDummyMaxHP] = useState(100);
  const [dummyArmor, setDummyArmor] = useState(18);
  const [playerRedHP, setPlayerRedHP] = useState(100);
  const [dummyRedHP, setDummyRedHP] = useState(100);
  const playerRedHPRef = useRef<number>(100);
  const dummyRedHPRef = useRef<number>(100);
  const playerLastHitTimeRef = useRef<number>(0);
  const dummyLastHitTimeRef = useRef<number>(0);
  const [activeComboStage, setActiveComboStage] = useState(0);
  const [isPlayerBlocking, setIsPlayerBlocking] = useState(false);
  const [playerWindup, setPlayerWindup] = useState(0);
  const [isDummyBlocking, setIsDummyBlocking] = useState(false);
  const [dummyWindup, setDummyWindup] = useState(0);
  const [playerDashCooldown, setPlayerDashCooldown] = useState(0);

  // Stamina Engine & Sprint states
  const [playerStamina, setPlayerStamina] = useState(100);
  const [playerIsSprinting, setPlayerIsSprinting] = useState(false);
  const [playerSprintStrikerBuffer, setPlayerSprintStrikerBuffer] = useState(0);
  const [playerPostSprintDisable, setPlayerPostSprintDisable] = useState(0);
  const [dummyStamina, setDummyStamina] = useState(100);
  const [dummyIsSprinting, setDummyIsSprinting] = useState(false);

  // Capoeira states
  const [playerCapoeiraStacks, setPlayerCapoeiraStacks] = useState(3);
  const [playerCapoeiraExhausted, setPlayerCapoeiraExhausted] = useState(false);
  const [dummyCapoeiraStacks, setDummyCapoeiraStacks] = useState(3);
  const [dummyCapoeiraExhausted, setDummyCapoeiraExhausted] = useState(false);

  // Status effect timers & cooldown states (synced in real-time)
  const [playerStunTime, setPlayerStunTime] = useState(0);
  const [playerCrippleTime, setPlayerCrippleTime] = useState(0);
  const [playerKeysiStaggerTimer, setPlayerKeysiStaggerTimer] = useState(0);
  const [playerKeysiVulnerableTimer, setPlayerKeysiVulnerableTimer] = useState(0);
  const [playerArmorBreakTime, setPlayerArmorBreakTime] = useState(0);
  const [playerConcussTime, setPlayerConcussTime] = useState(0);
  const [playerCapoeiraExhaustTimer, setPlayerCapoeiraExhaustTimer] = useState(0);
  const [playerSpinOutTimer, setPlayerSpinOutTimer] = useState(0);
  const [playerHeavyCooldown, setPlayerHeavyCooldown] = useState(0);
  const [playerPostureCd, setPlayerPostureCd] = useState(0);
  const [playerMaxPostureCd, setPlayerMaxPostureCd] = useState(78);
  const [isPlayerPostureLocked, setIsPlayerPostureLocked] = useState(false);

  const [dummyStunTime, setDummyStunTime] = useState(0);
  const [dummyCrippleTime, setDummyCrippleTime] = useState(0);
  const [dummyKeysiStaggerTimer, setDummyKeysiStaggerTimer] = useState(0);
  const [dummyKeysiVulnerableTimer, setDummyKeysiVulnerableTimer] = useState(0);
  const [dummyArmorBreakTime, setDummyArmorBreakTime] = useState(0);
  const [dummyConcussTime, setDummyConcussTime] = useState(0);
  const [dummyCapoeiraExhaustTimer, setDummyCapoeiraExhaustTimer] = useState(0);
  const [dummySpinOutTimer, setDummySpinOutTimer] = useState(0);
  const [dummyPostureCd, setDummyPostureCd] = useState(0);

  // Dedicated Status Bars (Independent & Movable via Mobile HUD Editor)
  const [playerActiveStatuses, setPlayerActiveStatuses] = useState<ActiveStatusItem[]>([]);
  const [dummyActiveStatuses, setDummyActiveStatuses] = useState<ActiveStatusItem[]>([]);

  // Gamemode specific states
  const [potatoHolderState, setPotatoHolderState] = useState<'player' | 'dummy'>('player');
  const [potatoFuseLeft, setPotatoFuseLeft] = useState<number>(20);
  const [sustainPlayerDamage, setSustainPlayerDamage] = useState<number>(0);
  const [sustainOpponentDamage, setSustainOpponentDamage] = useState<number>(0);

  // Active fighting style
  const activeStyleId = matchData?.isAiVsAiSpectator 
    ? specBot1Style 
    : (!matchData?.isCompetitive && !matchData?.isAiMatch ? practicePlayerStyleId : (stats.selectedStyleId || 'basic'));
  const activeStyle = FIGHTING_STYLES.find(s => s.id === activeStyleId) || FIGHTING_STYLES[0];

  // Core Game State Ref
  const stateRef = useRef<{
    player: (Fighter & {
      comboStage: number;
      comboResetTimer: number;
      heavyWindup: number; // 0 to 48 frames (0.8s)
      isBlocking: boolean;
      armorHP: number; // 18 max
      armorBreakTime: number; // stagger stun duration
      concussTime: number; // screen blur/shake duration
      armorRegenLockout?: number;
      kickboxingAutoSeq2Timer?: number;
    }) | null;
    dummy: (Fighter & {
      comboStage: number;
      comboResetTimer: number;
      heavyWindup: number;
      isBlocking: boolean;
      armorHP: number;
      armorBreakTime: number;
      concussTime: number;
      behavior: 'passive' | 'block' | 'rookie' | 'silver' | 'gold' | 'diamond' | 'amethyst';
      attackTimer: number;
      decisionTimer: number;
      feintTimer?: number;
      feintCooldown?: number;
      isFeinting?: boolean;
      armorRegenLockout?: number;
      kickboxingAutoSeq2Timer?: number;
    }) | null;
    particles: (Particle & { text?: string; textYOffset?: number })[];
    width: number;
    height: number;
    mouseX: number;
    mouseY: number;
    cameraX: number;
    cameraY: number;
    cameraZoom: number;
    cameraAngle?: number;
    arenaSize: number;
    gameTime: number;
    shakeAmount: number;
    visionBlurTime: number;
    shakyVisionTimer: number;
    hitstopTime: number;
    keysPressed: Record<string, boolean>;
    joystickX?: number;
    joystickY?: number;
    infiniteStamina?: boolean;
    oneHitKO?: boolean;
    godMode?: boolean;
    infiniteAIStamina?: boolean;
    totalDamageDealt?: number;
    totalHitsLanded?: number;
    totalDamageTaken?: number;
    totalSwings?: number;
    totalParries?: number;
    totalBlocks?: number;
    maxCombo?: number;
    currentCombo?: number;
    freezeAI?: boolean;
    dummyFollow?: boolean;
    rankedState?: 'countdown' | 'fighting' | 'round_over' | 'match_over';
    countdownFrame?: number;
    fightBannerTimer?: number;
    isLMBHeld?: boolean;
    blockVignetteType?: 'orange' | 'red';
    blockVignetteTimer?: number;
    blockVignetteMaxFrames?: number;
    potatoHolder?: 'player' | 'dummy';
    potatoFuseTimer?: number;
    sustainPlayerDamage?: number;
    sustainOpponentDamage?: number;
  }>({
    player: null,
    dummy: null,
    particles: [],
    width: 800,
    height: 600,
    mouseX: -1000,
    mouseY: -1000,
    cameraX: 0,
    cameraY: 0,
    cameraZoom: 1.1,
    cameraAngle: 0,
    arenaSize: 1000, // compact sparring cage size
    gameTime: 0,
    shakeAmount: 0,
    visionBlurTime: 0,
    shakyVisionTimer: 0,
    hitstopTime: 0,
    keysPressed: {},
    joystickX: 0,
    joystickY: 0,
    infiniteStamina: false,
    oneHitKO: false,
    godMode: false,
    infiniteAIStamina: false,
    totalDamageDealt: 0,
    totalHitsLanded: 0,
    totalDamageTaken: 0,
    totalSwings: 0,
    totalParries: 0,
    totalBlocks: 0,
    maxCombo: 0,
    currentCombo: 0,
    freezeAI: false,
    dummyFollow: false,
    rankedState: 'countdown',
    isLMBHeld: false,
    potatoHolder: 'player',
    potatoFuseTimer: 1200,
    sustainPlayerDamage: 0,
    sustainOpponentDamage: 0,
  });

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

  // Sound toggle
  const toggleSound = () => {
    const nextState = soundManager.toggle();
    setSoundEnabled(nextState);
  };

  // Setup canvas sizes & Resize Observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      stateRef.current.width = width;
      stateRef.current.height = height;

      // Calculate dynamic cameraZoom based on screen width, height, aspect ratio & mobile FOV settings
      const isPortrait = height > width;
      const minDimension = Math.min(width, height);
      let baseZoom = 0.88;
      if (width < 640 || height < 500) {
        // Mobile screen: responsive scaling for portrait vs landscape
        if (isPortrait) {
          baseZoom = Math.max(0.52, Math.min(0.76, width / 540));
        } else {
          baseZoom = Math.max(0.58, Math.min(0.82, height / 500));
        }
      } else if (width < 1024) {
        // Tablet screen: scale zoom between 0.72 and 0.92
        baseZoom = Math.max(0.72, Math.min(0.92, minDimension / 640));
      }
      const userFov = settings.mobileFov || 1.3;
      stateRef.current.cameraZoom = baseZoom / (userFov > 0 ? userFov : 1.0);

      if (canvasRef.current) {
        const baseDpr = Math.min(window.devicePixelRatio || 1, 1.5);
        const renderScale = settings.renderResolutionScale || 1.0;
        const dpr = baseDpr * renderScale;
        canvasRef.current.width = Math.floor(width * dpr);
        canvasRef.current.height = Math.floor(height * dpr);
        canvasRef.current.style.width = `${width}px`;
        canvasRef.current.style.height = `${height}px`;
      }
    };

    updateDimensions();
    const observer = new ResizeObserver(() => updateDimensions());
    observer.observe(container);

    const handleOrientationChange = () => {
      setTimeout(updateDimensions, 100);
    };

    window.addEventListener('resize', updateDimensions);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [settings.mobileFov]);

  // Gesture listeners for FOV control: Touch Pinch on Mobile, Scroll Wheel on PC
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let touchStartDist = 0;
    let initialFov = settings.mobileFov || 1.3;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        const t1 = e.touches[e.touches.length - 2];
        const t2 = e.touches[e.touches.length - 1];
        touchStartDist = Math.hypot(
          t1.clientX - t2.clientX,
          t1.clientY - t2.clientY
        );
        initialFov = settings.mobileFov || 1.3;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2 && touchStartDist > 0 && settings.pinchToZoomEnabled !== false) {
        // Prevent default native browser pinch-to-zoom!
        e.preventDefault();

        // If FOV is locked, do not allow changes
        if (settings.lockFov === true) {
          return;
        }

        const t1 = e.touches[e.touches.length - 2];
        const t2 = e.touches[e.touches.length - 1];
        const currentDist = Math.hypot(
          t1.clientX - t2.clientX,
          t1.clientY - t2.clientY
        );
        if (currentDist > 0) {
          // Smooth, non-hyper-sensitive zoom calculation
          const distDiff = touchStartDist - currentDist;
          const fovDelta = distDiff / 320;
          const targetFov = Math.max(0.6, Math.min(2.0, initialFov + fovDelta));
          updateSettings({ mobileFov: Math.round(targetFov * 100) / 100 });
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        touchStartDist = 0;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('.overflow-y-auto, .overflow-auto, [data-scrollable], .pointer-events-auto, button, input, select')) {
        // Allow native scrolling inside UI panels, drawers, and modals!
        return;
      }
      // Smooth scroll wheel FOV on desktop
      e.preventDefault();
      if (settings.lockFov === true) {
        return;
      }
      const currentFov = settings.mobileFov || 1.3;
      const step = e.deltaY > 0 ? 0.05 : -0.05;
      const targetFov = Math.max(0.6, Math.min(2.0, currentFov + step));
      updateSettings({ mobileFov: Math.round(targetFov * 100) / 100 });
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
      container.removeEventListener('wheel', handleWheel);
    };
  }, [settings.mobileFov, settings.pinchToZoomEnabled, settings.lockFov]);

  // Mobile Fullscreen Protection: Re-request fullscreen on touch interaction if user accidentally gets unfullscreened mid-fight
  useEffect(() => {
    if (!isTouchDevice) return;

    const handleTouchReFullscreen = (e: TouchEvent) => {
      // Ignore taps on input fields or menu buttons
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.closest('.pointer-events-auto'))) {
        return;
      }
      if (isPlaying && rankedState === 'fighting' && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };

    window.addEventListener('touchstart', handleTouchReFullscreen, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchReFullscreen);
    };
  }, [isPlaying, rankedState, isTouchDevice]);

  // Keyboard controls listener for F Block, E Dodge & WASD Movement tracking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (matchData?.isAiVsAiSpectator || matchData?.isSpectator) {
          handleExitArena('tournament');
        } else {
          setShowMobileMenu(prev => !prev);
        }
        soundManager.playRollTick();
        return;
      }

      if (matchData?.isAiVsAiSpectator || matchData?.isSpectator) {
        return;
      }

      if (isGamePausedRef.current) {
        return;
      }

      const state = stateRef.current;
      if (state.cinematicZoomActive || state.matchEnded || state.player?.isDead || (state.dummy && state.dummy.isDead)) {
        return;
      }
      if ((matchData?.isCompetitive || matchData?.isAiMatch) && state.rankedState !== 'fighting') {
        return;
      }
      state.keysPressed = state.keysPressed || {};
      state.keysPressed[e.code] = true;
      if (e.key === 'Shift') {
        state.keysPressed['Shift'] = true;
      }

      const currentBlockKey = settingsRef.current.keybinds?.block || 'KeyF';
      const currentDashKey = settingsRef.current.keybinds?.dash || 'Space';

      // Prevent default page scroll on common gameplay keys to avoid jumping in iframe
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyF', 'KeyT', 'Tab', 'ShiftLeft', 'ShiftRight', currentBlockKey, currentDashKey].includes(e.code) || e.key === 'Shift') {
        e.preventDefault();
      }

      if (e.code === 'KeyT' || e.code === 'Tab') {
        handleTargetSwitch();
      }

      if (e.code === currentBlockKey || e.code === 'KeyF') {
        state.isBlockInputHeld = true;
        const player = state.player;
        if (player) {
          player.isBlockInputHeld = true;
          if (!e.repeat) {
            // If already in 0.3s lockout, spamming keeps guard canceled and refreshes the lockout
            if (player.blockLockout && player.blockLockout > 0) {
              player.isBlocking = false;
              player.blockLockout = 18;
              setIsPlayerBlocking(false);
              sendImmediateWsGameState();
              return;
            }

            if (!player.blockRefreshThreshold) {
              player.blockRefreshThreshold = Math.floor(Math.random() * 2) + 2; // Random 2 or 3
            }
            player.blockUseCount = (player.blockUseCount || 0) + 1;
            player.blockUseResetTimer = 120; // 2.0s reset window

            // Even if spamming mid-way through blocking, immediately cancels out block for 0.3s after 2-3 times!
            if (player.blockUseCount >= player.blockRefreshThreshold) {
              player.isBlocking = false;
              player.blockTimer = 0;
              player.blockLockout = 18; // Universal 0.3s refresh lockout (18 frames)
              player.blockUseCount = 0;
              player.blockRefreshThreshold = Math.floor(Math.random() * 2) + 2; // Reroll next threshold (2 or 3)
              setIsPlayerBlocking(false);
              sendImmediateWsGameState();
            } else if (canFighterRaiseGuard(player)) {
              // Section 2.8: Attack Animation Block-Cancel (Feinting / Reflex Parries)
              const hadActivePunch = player.fists.some(f => f.isPunching && !f.isHeavy);
              if (hadActivePunch) {
                player.fists.forEach(f => {
                  f.isPunching = false;
                  f.punchProgress = 0;
                  f.lingerTimer = 0;
                  f.isLingerActive = false;
                  f.hasHit = false;
                });
                spawnFloatingText(player.x, player.y - 30, 'FEINT / CANCEL', '#38bdf8');
              }
              if (!player.isBlocking) {
                player.isBlocking = true;
                player.blockTimer = 0;
              }
              setIsPlayerBlocking(true);
              sendImmediateWsGameState();
            }
          }
        }
      }

      if (e.code === currentDashKey || (currentDashKey === 'Space' && (e.code === 'Space' || e.key === ' ')) || e.code === 'KeyE') {
        triggerPlayerDash();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (matchData?.isAiVsAiSpectator || matchData?.isSpectator) {
        return;
      }
      const state = stateRef.current;
      state.keysPressed = state.keysPressed || {};
      state.keysPressed[e.code] = false;
      if (e.key === 'Shift') {
        state.keysPressed['Shift'] = false;
      }

      const currentBlockKey = settingsRef.current.keybinds?.block || 'KeyF';
      if (e.code === currentBlockKey || e.code === 'KeyF') {
        state.isBlockInputHeld = false;
        const player = state.player;
        if (player) {
          player.isBlockInputHeld = false;
          if (player.isBlocking) {
            player.isBlocking = false;
            player.kyokushinBlockHitsTaken = 0;
            // ⏳ Block Cooldown (0.1s = 6 frames): Releasing Guard applies 0.1s block cooldown
            player.blockLockout = Math.max(player.blockLockout || 0, BLOCK_COOLDOWN_FRAMES);
            // Parry is not affected by Post Block Delay! Capoeira is instant (0 delay)
            if (player.styleId === 'capoeira') {
              player.postBlockAttackLockout = 0;
            } else if ((player.parryFlashTime || 0) <= 0 && (player.parryBlockGraceTimer || 0) <= 0) {
              player.postBlockAttackLockout = 27; // 0.45s Post-Block Action Delay
            } else {
              player.postBlockAttackLockout = 0;
            }
          }
          setIsPlayerBlocking(false);
          sendImmediateWsGameState();
        }
      }
    };

    const handleBlur = () => {
      const state = stateRef.current;
      state.keysPressed = {};
      state.isBlockInputHeld = false;
      const player = state.player;
      if (player) {
        player.isBlockInputHeld = false;
        if (player.isBlocking) {
          player.isBlocking = false;
          player.blockLockout = Math.max(player.blockLockout || 0, BLOCK_COOLDOWN_FRAMES);
        }
        setIsPlayerBlocking(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Target switching logic for 2v2 combat and sparring modes
  const handleTargetSwitch = () => {
    soundManager.playRollTick();
    const state = stateRef.current;
    state.targetEnemyIndex = ((state.targetEnemyIndex || 0) + 1) % 2;
    const player = state.player;
    const target = state.dummy;
    if (player && target && !target.isDead) {
      if (settings.cameraMode === 'lockon_swipe') {
        const lockAngle = Math.atan2(target.y - player.y, target.x - player.x);
        player.facingAngle = lockAngle;
        spawnFloatingText(player.x, player.y - 30, 'LOCKED ON', '#38bdf8');
      } else {
        spawnFloatingText(target.x, target.y - 30, 'TARGET SWITCHED', '#38bdf8');
      }
    } else if (state.dummy) {
      spawnFloatingText(state.dummy.x, state.dummy.y - 30, 'TARGET SWITCHED', '#38bdf8');
    }
  };

  // Spawn visual floating text inside the octagon
  const spawnFloatingText = (x: number, y: number, text: string, color: string, isCrit = false) => {
    if (settingsRef.current?.damageNumbers === false) return;
    if (!stateRef.current?.particles) return;
    stateRef.current.particles.push({
      id: Math.random().toString(),
      x: x + (Math.random() - 0.5) * 16,
      y,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -1.2 - Math.random() * 0.6,
      radius: 0,
      color,
      alpha: 1.0,
      life: 0,
      maxLife: 48,
      text,
      isCrit,
    } as any);
  };

  // Spawn visual punch gust air shockwave bursting from the opposite side of enemy on Kyokushin M2 hit
  const spawnKyokushinPunchGust = (attacker: Fighter, defender: Fighter) => {
    if (!stateRef.current?.particles) return;
    const strikeAngle = Math.atan2(defender.y - attacker.y, defender.x - attacker.x);
    // Origin is at the opposite side (backside) of the enemy
    const originX = defender.x + Math.cos(strikeAngle) * (defender.radius * 0.75);
    const originY = defender.y + Math.sin(strikeAngle) * (defender.radius * 0.75);

    // 1. Primary Supersonic Gust Cones
    stateRef.current.particles.push({
      id: `kyokushin_gust_${Math.random()}`,
      x: originX,
      y: originY,
      vx: Math.cos(strikeAngle) * 7.5,
      vy: Math.sin(strikeAngle) * 7.5,
      radius: 44,
      color: '#38bdf8',
      alpha: 1.0,
      life: 0,
      maxLife: 24,
      type: 'kyokushin_punch_gust',
      facingAngle: strikeAngle
    } as any);

    stateRef.current.particles.push({
      id: `kyokushin_gust_core_${Math.random()}`,
      x: originX,
      y: originY,
      vx: Math.cos(strikeAngle) * 10.0,
      vy: Math.sin(strikeAngle) * 10.0,
      radius: 58,
      color: '#ffffff',
      alpha: 1.0,
      life: 0,
      maxLife: 20,
      type: 'kyokushin_punch_gust',
      facingAngle: strikeAngle
    } as any);

    // 2. High-speed directional air streaks bursting outward from the backside
    for (let i = 0; i < 16; i++) {
      const angleOffset = (Math.random() - 0.5) * 0.65;
      const angle = strikeAngle + angleOffset;
      const speed = Math.random() * 10 + 8;
      stateRef.current.particles.push({
        id: `kyokushin_air_streak_${Math.random()}`,
        x: originX + (Math.random() - 0.5) * 10,
        y: originY + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 2.5 + 1.5,
        color: i % 2 === 0 ? '#ffffff' : '#38bdf8',
        alpha: 1.0,
        life: 0,
        maxLife: Math.floor(Math.random() * 10 + 16),
        type: 'spark'
      });
    }

    // 3. Expanding air pressure rings
    stateRef.current.particles.push({
      id: `kyokushin_air_ring_${Math.random()}`,
      x: originX,
      y: originY,
      vx: Math.cos(strikeAngle) * 2.5,
      vy: Math.sin(strikeAngle) * 2.5,
      radius: 24,
      color: '#e0f2fe',
      alpha: 0.85,
      life: 0,
      maxLife: 22,
      type: 'shockwave'
    });
  };

  // Initialize fighters inside the 1v1 Arena
  const initGame = () => {
    matchLightsLandedRef.current = 0;
    matchHeaviesLandedRef.current = 0;
    matchParriesLandedRef.current = 0;
    matchBlockedStrikesRef.current = 0;
    matchM1ChainsRef.current = 0;
    matchDamageDealtRef.current = 0;
    const arenaSize = stateRef.current.arenaSize;
    const centerX = arenaSize / 2;
    const centerY = arenaSize / 2;

    const prevPlayerCripple = 0;
    const prevDummyCripple = 0;

    const isRealPvP = !!(matchData && matchData.isRealMatch);
    const localIsP1 = isRealPvP ? !!matchData.isPlayer1 : true;

    const startLeftX = centerX - 180;
    const startRightX = centerX + 180;

    const playerStartX = localIsP1 ? startLeftX : startRightX;
    const dummyStartX = localIsP1 ? startRightX : startLeftX;
    const playerFacing = localIsP1 ? 0 : Math.PI;
    const dummyFacing = localIsP1 ? Math.PI : 0;

    const isSpectator = !!matchData?.isAiVsAiSpectator;
    const isPractice = !matchData?.isCompetitive && !matchData?.isAiMatch && !isSpectator;

    const b1StyleId = isSpectator 
      ? (matchData?.bot1StyleId || specBot1Style || (matchData?.opponent as any)?.style?.id || 'street_boxing')
      : (isPractice ? practicePlayerStyleId : (stats.selectedStyleId || 'basic'));
    let b1StyleObj = FIGHTING_STYLES.find(s => s.id === b1StyleId) || activeStyle || FIGHTING_STYLES[0];
    if (!isPractice && b1StyleObj && (b1StyleObj.reworkStatus === 'undergoing_rework' || b1StyleObj.reworkStatus === 'undergoing_development' || b1StyleObj.isBlocked)) {
      b1StyleObj = FIGHTING_STYLES.find(s => !s.isBlocked && s.reworkStatus !== 'undergoing_rework' && s.reworkStatus !== 'undergoing_development') || FIGHTING_STYLES[0];
    }
    const b1Diff = matchData?.bot1Difficulty || specBot1Diff || 'silver';

    const baseHeight = isSpectator 
      ? (matchData?.bot1HeightInInches || specBot1Height || (matchData?.opponent as any)?.heightInInches || 70) 
      : (isPractice ? practicePlayerHeightInInches : stats.heightInInches);
    const playerMods = getHeightModifiers(baseHeight);
    const playerRadius = 26 * playerMods.scaleFactor;

    // Player Fighter Setup
    const playerFists: Fist[] = [
      { id: 1, offsetX: 16, offsetY: -12, angle: 0, radius: playerRadius * 0.31, isPunching: false, punchProgress: 0, punchType: 'left' },
      { id: 2, offsetX: 16, offsetY: 12, angle: 0, radius: playerRadius * 0.31, isPunching: false, punchProgress: 0, punchType: 'right' }
    ];

    let initPlayerHealth = (isSpectator && matchData?.spectatorInitialHp1Pct)
      ? Math.max(15, Math.round(playerMods.maxHealth * (matchData.spectatorInitialHp1Pct / 100)))
      : playerMods.maxHealth;

    if (carriedPlayerHpRef.current !== null) {
      initPlayerHealth = carriedPlayerHpRef.current;
      carriedPlayerHpRef.current = null;
    }

    stateRef.current.player = {
      id: 'player_1',
      name: isSpectator ? `[BOT 1] ${b1StyleObj.name.toUpperCase()} (${b1Diff.toUpperCase()})` : 'You',
      isPlayer: !isSpectator,
      isP1: localIsP1,
      x: playerStartX,
      y: centerY,
      radius: playerRadius,
      baseHeight,
      color: b1StyleObj.color,
      secondaryColor: b1StyleObj.secondaryColor,
      styleId: b1StyleObj.id,
      health: initPlayerHealth,
      maxHealth: playerMods.maxHealth,
      vx: 0,
      vy: 0,
      targetX: playerStartX,
      targetY: centerY,
      facingAngle: playerFacing,
      isDead: false,
      score: (matchData && matchData.isCompetitive) ? 0 : (stateRef.current.player?.score || 0),
      fists: playerFists,
      strikeCooldown: 0,
      lightCooldown: 0,
      heavyCooldown: 0,
      stunTime: 0,
      damageFlashTime: 0,
      auraAngle: 0,
      dashCooldown: 0,
      isDashing: false,
      dashProgress: 0,
      // 1v1 Sparring Custom states
      comboStage: 0,
      comboResetTimer: 0,
      heavyWindup: 0,
      isBlocking: false,
      armorHP: 18,
      armorBreakTime: 0,
      concussTime: 0,
      capoeiraDodgeStacks: b1StyleObj.id === 'capoeira' ? 3 : 0,
      capoeiraDodgeFlashTime: 0,
      capoeiraExhausted: false,
      capoeiraExhaustTimer: 0,
      capoeiraRegenTimer: 0,
      capoeiraWhiffBonusActive: false,
      ashiharaRecoveryTimer: 0,
      behavior: isSpectator ? b1Diff : undefined,
      crippleTime: prevPlayerCripple
    };

    const isComp = !!(matchData && (matchData.isCompetitive || matchData.isAiMatch));
    const b2StyleId = isSpectator
      ? (matchData?.bot2StyleId || specBot2Style || (matchData?.spectatorFighter2 as any)?.style?.id || 'shotokan')
      : null;
    const b2StyleObj = b2StyleId
      ? (FIGHTING_STYLES.find(s => s.id === b2StyleId) || FIGHTING_STYLES[1])
      : null;
    const b2Diff = isSpectator
      ? (matchData?.bot2Difficulty || specBot2Diff || 'gold')
      : (matchData?.aiDifficulty || dummyBehavior || 'silver');

    const dummyName = isSpectator
      ? `[BOT 2] ${b2StyleObj?.name.toUpperCase() || 'AI'} (${b2Diff.toUpperCase()})`
      : isComp 
        ? (matchData.isAiMatch ? `[AI] ${matchData.opponent?.name || 'Bot'}` : `@${matchData.opponent?.name || 'Fighter'}`) 
        : (matchData?.isAiMatch ? `[AI] ${matchData.opponent?.name || 'Bot'}` : 'Sparring Partner');
    const dummyHeight = isSpectator 
      ? (matchData?.bot2HeightInInches || specBot2Height || (matchData?.spectatorFighter2 as any)?.heightInInches || 70) 
      : (isComp ? matchData.opponent?.heightInInches || 68 : dummyHeightInInches);

    const dummyMods = getHeightModifiers(dummyHeight);
    const dummyRadius = 26 * dummyMods.scaleFactor;

    // Dummy Fighter Setup (P2 Sparring Partner or Competitive Network Opponent)
    const dummyFists: Fist[] = [
      { id: 1, offsetX: 16, offsetY: -12, angle: 0, radius: dummyRadius * 0.31, isPunching: false, punchProgress: 0, punchType: 'left' },
      { id: 2, offsetX: 16, offsetY: 12, angle: 0, radius: dummyRadius * 0.31, isPunching: false, punchProgress: 0, punchType: 'right' }
    ];
    let dummyStyle = isSpectator 
      ? b2StyleObj 
      : ((isComp || matchData?.isAiMatch) ? matchData.opponent?.style : (FIGHTING_STYLES.find(s => s.id === dummyStyleId) || null));
    if (!isPractice && dummyStyle && (dummyStyle.reworkStatus === 'undergoing_rework' || dummyStyle.reworkStatus === 'undergoing_development' || dummyStyle.isBlocked)) {
      dummyStyle = FIGHTING_STYLES.find(s => !s.isBlocked && s.reworkStatus !== 'undergoing_rework' && s.reworkStatus !== 'undergoing_development') || FIGHTING_STYLES[0];
    }
    const oppStyleId = dummyStyle ? dummyStyle.id : dummyStyleId || 'basic';
    const oppColor = dummyStyle ? dummyStyle.color : '#475569';
    const oppSecColor = dummyStyle ? dummyStyle.secondaryColor : '#eab308';

    let activeBehavior: string = dummyBehavior;
    if (isSpectator) {
      activeBehavior = b2Diff as any;
    } else if (matchData?.isAiMatch) {
      activeBehavior = matchData.aiDifficulty || (matchData.opponent as any)?.aiDifficulty || 'silver';
    } else if (isComp && matchData?.opponent) {
      if (matchData.opponent.elo >= 1800) activeBehavior = 'amethyst';
      else if (matchData.opponent.elo >= 1500) activeBehavior = 'diamond';
      else if (matchData.opponent.elo >= 1200) activeBehavior = 'gold';
      else activeBehavior = 'silver';
    }

    setDummyBehavior(activeBehavior);

    let initDummyHealth = (isSpectator && matchData?.spectatorInitialHp2Pct)
      ? Math.max(15, Math.round(dummyMods.maxHealth * (matchData.spectatorInitialHp2Pct / 100)))
      : dummyMods.maxHealth;

    if (carriedDummyHpRef.current !== null) {
      initDummyHealth = carriedDummyHpRef.current;
      carriedDummyHpRef.current = null;
    }

    stateRef.current.dummy = {
      id: isComp ? `comp_opp_${matchData.opponent.name}` : 'dummy_partner',
      name: dummyName,
      isPlayer: false,
      isP1: !localIsP1,
      x: dummyStartX,
      y: centerY,
      radius: dummyRadius,
      baseHeight: dummyHeight,
      color: oppColor,
      secondaryColor: oppSecColor,
      styleId: oppStyleId,
      health: initDummyHealth,
      maxHealth: dummyMods.maxHealth,
      vx: 0,
      vy: 0,
      targetX: dummyStartX,
      targetY: centerY,
      facingAngle: dummyFacing,
      isDead: false,
      score: (matchData && matchData.isCompetitive) ? 0 : (stateRef.current.dummy?.score || 0),
      fists: dummyFists,
      strikeCooldown: 0,
      lightCooldown: 0,
      heavyCooldown: 0,
      stunTime: 0,
      damageFlashTime: 0,
      auraAngle: 0,
      dashCooldown: 0,
      isDashing: false,
      dashProgress: 0,
      // 1v1 Sparring Custom states
      comboStage: 0,
      comboResetTimer: 0,
      heavyWindup: 0,
      isBlocking: false,
      armorHP: 18,
      armorBreakTime: 0,
      concussTime: 0,
      capoeiraDodgeStacks: oppStyleId === 'capoeira' ? 3 : 0,
      capoeiraDodgeFlashTime: 0,
      capoeiraExhausted: false,
      capoeiraExhaustTimer: 0,
      capoeiraRegenTimer: 0,
      capoeiraWhiffBonusActive: false,
      ashiharaRecoveryTimer: 0,
      behavior: activeBehavior,
      attackTimer: 0,
      decisionTimer: 0,
      crippleTime: prevDummyCripple
    };

    if (stateRef.current.player) resetFighterRoundState(stateRef.current.player as any);
    if (stateRef.current.dummy) resetFighterRoundState(stateRef.current.dummy as any);

    stateRef.current.particles = [];
    stateRef.current.shakeAmount = 0;
    stateRef.current.visionBlurTime = 0;
    stateRef.current.shakyVisionTimer = 0;
    stateRef.current.countdownFrame = 0;
    stateRef.current.fightBannerTimer = 0;
    setIsDead(false);

    // Initialize Gamemode-specific runtime state
    if (matchData?.gamemode === 'hot_potato') {
      const initialHolder = Math.random() < 0.5 ? 'player' : 'dummy';
      stateRef.current.potatoHolder = initialHolder;
      stateRef.current.potatoFuseTimer = 20 * 60; // 20s fuse
      setPotatoHolderState(initialHolder);
      setPotatoFuseLeft(20);
    } else {
      stateRef.current.potatoHolder = undefined;
      stateRef.current.potatoFuseTimer = undefined;
    }

    if (matchData?.gamemode === 'sustain_attack') {
      stateRef.current.sustainPlayerDamage = 0;
      stateRef.current.sustainOpponentDamage = 0;
      setSustainPlayerDamage(0);
      setSustainOpponentDamage(0);
    }

    // Sync state to UI immediately
    setPlayerHP(initPlayerHealth);
    setPlayerMaxHP(playerMods.maxHealth);
    setPlayerArmor(18);
    setDummyHP(initDummyHealth);
    setDummyMaxHP(dummyMods.maxHealth);
    setDummyArmor(18);
    setActiveComboStage(0);

    if (isSpectator && matchData?.spectatorInitialRound) {
      setRoundNumber(matchData.spectatorInitialRound);
    }
  };

  // Main game execution engine
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    let accumulator = 0;
    const timestep = 1000 / 60; // 16.67 ms per physics frame

    let lastRenderTime = 0;

    const gameLoop = (now: number) => {
      const state = stateRef.current;
      const dt = now - lastTime;
      lastTime = now;

      const targetFps = settings.targetFps || 'uncapped';
      const frameInterval = targetFps === '30' ? 1000 / 30 : (targetFps === '60' ? 1000 / 60 : 0);

      if (isPlaying) {
        if (isGamePausedRef.current) {
          accumulator = 0;
        } else {
          // Simulation speed: 1.0x base, with slowdown toggle enabled for Dojo Matrix
          const isPracticeDojo = !matchData?.isCompetitive && !matchData?.isAiMatch && !matchData?.isAiVsAiSpectator;
          const speedMultiplier = isPracticeDojo ? simulationSpeedRef.current : 1.0;
          // Cap dt to prevent massive jumps when the window is out of focus
          accumulator += Math.min(100, dt) * speedMultiplier;

          if (!isLiveHudEditingRef.current) {
            while (accumulator >= timestep) {
            state.gameTime++;
            if (state.cinematicZoomActive) {
              state.cinematicTimer = (state.cinematicTimer || 0) - 1;
              state.shakeAmount = Math.max(0, state.shakeAmount - 0.25);

              // Continuous slow disintegration of the dying fighter into red, black, and white circle particles
              const deadFighter = (state.cinematicDefender && state.cinematicDefender.isDead)
                ? state.cinematicDefender
                : ((state.player && state.player.isDead) ? state.player : ((state.dummy && state.dummy.isDead) ? state.dummy : null));

              if (deadFighter) {
                deadFighter.spinOutTimer = 0; // Removed Spin Out completely
                deadFighter.kyokushinSpinOutTimer = 0;
                deadFighter.vx = 0;
                deadFighter.vy = 0;
                deadFighter.isDashing = false;
                deadFighter.isBlocking = false;
                deadFighter.disintegrationTimer = Math.max(0, (deadFighter.disintegrationTimer !== undefined ? deadFighter.disintegrationTimer : 180) - 1);

                // Spawn stream of red, black, and white circle particles as it slowly disintegrates
                const count = Math.floor(Math.random() * 3) + 2;
                for (let i = 0; i < count; i++) {
                  const angle = Math.random() * Math.PI * 2;
                  const dist = Math.random() * (deadFighter.radius || 26);
                  const colorRoll = Math.random();
                  const color = colorRoll < 0.38 ? '#ef4444' : (colorRoll < 0.72 ? '#000000' : '#ffffff');
                  state.particles.push({
                    id: `disin_stream_${Math.random()}`,
                    x: deadFighter.x + Math.cos(angle) * dist,
                    y: deadFighter.y + Math.sin(angle) * dist,
                    vx: Math.cos(angle) * (Math.random() * 1.2 + 0.3),
                    vy: Math.sin(angle) * (Math.random() * 1.2 + 0.3) - (Math.random() * 0.8 + 0.2),
                    radius: Math.random() * 4.5 + 2.5,
                    color,
                    alpha: 1.0,
                    life: 0,
                    maxLife: Math.floor(Math.random() * 45 + 30),
                    type: 'circle'
                  });
                }
              }

              // Update physics - player movement/action is strictly locked
              updatePhysics();

              state.particles.forEach((p: any) => {
                p.x += p.vx * 0.35;
                p.y += p.vy * 0.35;
                p.life++;
                p.alpha = Math.max(0, 1 - p.life / p.maxLife);
              });
              state.particles = state.particles.filter((p: any) => p.life < p.maxLife);

              if (state.cinematicTimer <= 0) {
                state.cinematicZoomActive = false;
                handleSparringKO(state.cinematicAttacker, state.cinematicDefender);
              }
            } else {
              if (state.rankedState === 'countdown') {
                state.countdownFrame = (state.countdownFrame || 0) + 1;
                const f = state.countdownFrame;
                if (f === 1 || f === 90 || f === 180) {
                  soundManager.playRollTick();
                } else if (f >= 270) {
                  state.rankedState = 'fighting';
                  state.fightBannerTimer = 48;
                  setRankedState('fighting');
                  setShowFightBanner(true);
                  soundManager.playFightShout();
                }
              }

              updatePhysics();
              detectSparringCollisions();
              updateDummyAI();
              if (matchData?.isAiVsAiSpectator) {
                updatePlayerAI();
              }

              // SECTION 5.7.1: TIME-SLICE EVALUATION MATRIX (every 120 ticks = 2s)
              timeSliceTimerRef.current = (timeSliceTimerRef.current || 0) + 1;
              if (timeSliceTimerRef.current >= 120) {
                timeSliceTimerRef.current = 0;
                totalSlicesRef.current = (totalSlicesRef.current || 0) + 1;

                const p = state.player;
                const d = state.dummy;
                if (p && d && !p.isDead && !d.isDead) {
                  const dx = d.x - p.x;
                  const dy = d.y - p.y;
                  const dist = Math.hypot(dx, dy) || 1;
                  const dirX = dx / dist;
                  const dirY = dy / dist;
                  const forwardSpeed = (p.vx * dirX + p.vy * dirY);
                  const inStrikingPocket = dist < 140;
                  const isActing = p.isAttacking || p.isHeavyAttacking || p.isDashing || p.isParrying;
                  const dealtDmg = sliceDamageDealtRef.current || 0;
                  const takenDmg = sliceDamageTakenRef.current || 0;

                  // Dominating State: Constant forward vector, positive strike clashes, consistent pressure
                  if ((forwardSpeed > 0.4 || inStrikingPocket || isActing || dealtDmg > 0) && takenDmg === 0) {
                    dominantSlicesRef.current = (dominantSlicesRef.current || 0) + 1;
                  } else if (dealtDmg > 0 && takenDmg > 0) {
                    if (dealtDmg >= takenDmg) {
                      dominantSlicesRef.current = (dominantSlicesRef.current || 0) + 1;
                    } else {
                      passiveSlicesRef.current = (passiveSlicesRef.current || 0) + 1;
                    }
                  } else if (forwardSpeed < -0.6 && dist > 200 && !isActing) {
                    // Passive / Hesitant State: Excessive backpedaling, stalled neutral
                    passiveSlicesRef.current = (passiveSlicesRef.current || 0) + 1;
                  }

                  // Reset slice damage counters
                  sliceDamageDealtRef.current = 0;
                  sliceDamageTakenRef.current = 0;
                }
              }
            }
            accumulator -= timestep;
          }
        } else {
          accumulator = 0;
        }
      }

        // Real-time WebSocket game state packet synchronization (throttled to ~50 FPS = every 20ms for high-fidelity PvP sync)
        const nowMs = performance.now();
        if (
          matchData && 
          matchData.isRealMatch && 
          matchData.socket && 
          matchData.socket.readyState === WebSocket.OPEN &&
          nowMs - lastWsSendTimeRef.current >= 20
        ) {
          lastWsSendTimeRef.current = nowMs;
          const player = state.player;
          if (player) {
            matchData.socket.send(JSON.stringify({
              type: 'game_state',
              state: {
                x: player.x,
                y: player.y,
                vx: player.vx,
                vy: player.vy,
                facingAngle: player.facingAngle,
                attackLockedAngle: player.attackLockedAngle,
                health: player.health,
                isBlocking: player.isBlocking,
                blockTimer: player.blockTimer || 0,
                heavyWindup: player.heavyWindup || 0,
                stunTime: player.stunTime || 0,
                strikeCooldown: player.strikeCooldown || 0,
                lightCooldown: player.lightCooldown || 0,
                postureCd: player.postureCd || 0,
                superCrippleTimer: player.superCrippleTimer || 0,
                boneFractureTimer: player.boneFractureTimer || 0,
                crippleTime: player.crippleTime || 0,
                concussTime: player.concussTime || 0,
                armorHP: player.armorHP,
                isDead: player.isDead,
                comboStage: player.comboStage,
                comboResetTimer: player.comboResetTimer,
                ashiharaM2Stage: player.ashiharaM2Stage || 0,
                ashiharaM2Timer: player.ashiharaM2Timer || 0,
                parryFlashTime: player.parryFlashTime || 0,
                isDashing: player.isDashing || false,
                dashProgress: player.dashProgress || 0,
                kickboxingIsSeq2: player.kickboxingIsSeq2 || false,
                fists: player.fists.map(f => ({
                  isPunching: f.isPunching,
                  punchProgress: f.punchProgress,
                  punchType: f.punchType,
                  angle: f.angle,
                  isHeavy: !!f.isHeavy
                }))
              }
            }));
          }
        }

        syncCombatStatesToUI();
      } else {
        state.gameTime++;
      }

      if (frameInterval === 0 || (now - lastRenderTime) >= frameInterval - 1) {
        lastRenderTime = now;
        renderGame();
      }
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, dummyBehavior]);

  const applyFighterHit = (
    attacker: Fighter & { comboStage?: number; heavyWindup?: number; kickboxingAutoSeq2Timer?: number },
    defender: Fighter & { isBlocking?: boolean; armorHP?: number; armorBreakTime?: number; damageFlashTime?: number; concussTime?: number; isDashing?: boolean; armorRegenLockout?: number },
    isHeavy: boolean,
    comboStage?: number,
    strikePos?: { x: number; y: number }
  ) => {
    executeFighterHit(attacker, defender, isHeavy, comboStage, strikePos, {
      stateRef,
      soundManager,
      settings,
      matchData,
      userEmail,
      dummyBehavior,
      getMatchModeKey,
      spawnFloatingText,
      spawnKyokushinPunchGust,
      triggerKOCinematic,
      syncCombatStatesToUI,
      telemetryRefs: {
        matchParriesLandedRef,
        roundParriesLandedRef,
        matchHeaviesLandedRef,
        roundHeaviesLandedRef,
        matchLightsLandedRef,
        roundLightsLandedRef,
        matchBlockedStrikesRef,
        matchM1ChainsRef,
        matchWhiffPunishesRef,
        matchGuardBreaksRef,
        matchCounterHitsRef,
        lastParryTimestampRef,
        matchDamageDealtRef,
        matchDamageTakenRef,
        roundDamageTakenRef,
        matchFirstHitOccurredRef,
        roundDamageDealtRef,
        minPlayerHpPctRef,
        sliceDamageDealtRef,
        sliceDamageTakenRef,
      },
      uiSetters: {
        setTotalParries,
        setTotalBlocks,
        setTotalDamageDealt,
        setTotalHitsLanded,
        setTotalDamageTaken,
        setMaxCombo,
        setMatchDamageDealt,
        setMatchDamageTaken,
        setMatchHitsLanded,
        setPotatoFuseLeft,
        setPotatoHolderState,
        setSustainPlayerDamage,
        setSustainOpponentDamage,
      }
    });
  };

  const triggerKOCinematic = (attacker: any, defender: any) => {
    const state = stateRef.current;
    if (state.cinematicZoomActive) return;

    soundManager.playKO();
    
    state.cinematicZoomActive = true;
    state.cinematicTargetX = defender?.x ?? 500;
    state.cinematicTargetY = defender?.y ?? 500;
    state.cinematicTimer = 180; // 180 frames = 3.0s smooth slow motion KO disintegration
    state.cinematicAttacker = attacker;
    state.cinematicDefender = defender;
    
    if (attacker) {
      attacker.vx = 0;
      attacker.vy = 0;
      attacker.isDashing = false;
      attacker.dashProgress = 0;
    }

    if (defender) {
      defender.spinOutTimer = 0; // Removed Spin Out completely on death
      defender.kyokushinSpinOutTimer = 0;
      defender.disintegrationTimer = 180;
      defender.vx = 0;
      defender.vy = 0;
      defender.isDashing = false;
      defender.dashProgress = 0;
      defender.isBlocking = false;
      defender.fists.forEach((f: any) => {
        f.isPunching = false;
        f.punchProgress = 0;
      });
    }
    
    state.shakeAmount = 14;
    
    // Spawn initial burst of red, black, and white circle particles for slow disintegration
    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 1.5 + Math.random() * 3.5;
      const colorRoll = Math.random();
      const color = colorRoll < 0.38 ? '#ef4444' : (colorRoll < 0.72 ? '#000000' : '#ffffff');
      state.particles.push({
        id: `ko_disin_${Math.random()}`,
        x: defender ? defender.x + (Math.random() - 0.5) * (defender.radius * 0.8) : 500,
        y: defender ? defender.y + (Math.random() - 0.5) * (defender.radius * 0.8) : 500,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.4,
        radius: 3.5 + Math.random() * 4.5,
        color,
        alpha: 1,
        life: 0,
        maxLife: 60 + Math.random() * 40,
        type: 'circle'
      });
    }
  };

  // Triggered when a player or dummy gets knocked out
  const handleSparringKO = (attacker: any, defender: any) => {
    soundManager.playKO();
    spawnKOExplosion(defender);

    const isAiVsAi = !!matchData?.isAiVsAiSpectator;
    const isComp = !!(matchData && (matchData.isCompetitive || matchData.isAiMatch || matchData.isAiVsAiSpectator));
    if (isComp) {
      handleRoundWinner(defender.isPlayer ? 'opponent' : 'player');
      return;
    }

    const isRealPvP = !!(matchData && matchData.isRealMatch);
    const localIsP1 = isRealPvP ? !!matchData.isPlayer1 : true;

    const startLeftX = (stateRef.current.arenaSize / 2) - 180;
    const startRightX = (stateRef.current.arenaSize / 2) + 180;

    const playerRespawnX = localIsP1 ? startLeftX : startRightX;
    const dummyRespawnX = localIsP1 ? startRightX : startLeftX;

    if (defender.isPlayer) {
      // Player got defeated - Auto Heal & Respawn without Match Over modal in practice
      setStreak(0);
      spawnFloatingText(defender.x, defender.y - 40, 'ROUND DEFEAT! RESPAWNED', '#ef4444');

      if (isComp) {
        // Process Ranked Elo Loss
        const currentLossStreak = (stats.lossStreak || 0) + 1;
        const { eloLoss, lossTier } = calculateLossEloLoss(stats.elo || 0, currentLossStreak, false);
        const nextElo = Math.max(0, (stats.elo || 0) - eloLoss);
        updateStats({ elo: nextElo, lossStreak: currentLossStreak });

        let lossText = `-${eloLoss} ELO LOSS`;
        if (lossTier === 'protected') lossText += ' (LOSS PROTECTION)';
        else if (lossTier === 'mitigated') lossText += ' (LOSS MITIGATED)';
        spawnFloatingText(defender.x, defender.y - 60, lossText, '#f87171');
      }

      setTimeout(() => {
        const state = stateRef.current;
        if (state.player && isPlaying) {
          const playerMods = getHeightModifiers(state.player.baseHeight);
          state.player.health = playerMods.maxHealth;
          state.player.maxHealth = playerMods.maxHealth;
          state.player.armorHP = 18;
          state.player.isDead = false;
          state.player.x = playerRespawnX;
          state.player.y = state.arenaSize / 2;
          state.player.vx = 0;
          state.player.vy = 0;
          state.player.armorBreakTime = 0;
          state.player.stunTime = 0;
          state.player.concussTime = 0;
          state.player.crippleTime = 0;
          state.player.comboStage = 0;
          state.player.heavyWindup = 0;
          state.player.strikeCooldown = 0;
          state.player.lightCooldown = 0;
          state.player.postS4HeavyLockout = 0;
          state.player.heavyCooldown = 0;
          state.player.isBlocking = false;
          syncCombatStatesToUI();
          spawnFloatingText(state.player.x, state.player.y - 20, 'RESTORED TO 100% HP', '#10b981');
        }
      }, 1000);
    } else {
      // Sparring Dummy defeated! Reward the player
      const rewardCash = 200;

      const nextStreak = streak + 1;
      setStreak(nextStreak);
      const nextHighScore = Math.max(stats.highScore || 0, nextStreak);

      // Process Ranked Elo Win Gain ONLY in Competitive Mode
      const winGain = isComp ? calculateWinEloGain(stats.elo || 0, false) : 0;
      const nextElo = isComp ? (stats.elo || 0) + winGain : (stats.elo || 0);

      updateStats({
        cash: stats.cash + rewardCash,
        highScore: nextHighScore,
        ...(isComp ? { elo: nextElo, lossStreak: 0 } : {})
      });

      spawnFloatingText(defender.x, defender.y - 20, `VICTORY! +$${rewardCash}`, '#10b981');
      if (isComp && winGain > 0) {
        spawnFloatingText(attacker.x, attacker.y - 70, `+${winGain} ELO WIN!`, '#eab308');
      }

      // Auto-recover/respawn dummy in Practice Mode after 1.5 seconds
      setTimeout(() => {
        const state = stateRef.current;
        if (state.dummy && isPlaying) {
          const dummyMods = getHeightModifiers(state.dummy.baseHeight);
          state.dummy.health = dummyMods.maxHealth;
          state.dummy.maxHealth = dummyMods.maxHealth;
          state.dummy.armorHP = 18;
          state.dummy.isDead = false;
          state.dummy.x = dummyRespawnX;
          state.dummy.y = state.arenaSize / 2;
          state.dummy.vx = 0;
          state.dummy.vy = 0;
          state.dummy.armorBreakTime = 0;
          state.dummy.comboStage = 0;
          state.dummy.heavyWindup = 0;
          state.dummy.strikeCooldown = 0;
          state.dummy.lightCooldown = 0;
          state.dummy.postS4HeavyLockout = 0;
          state.dummy.heavyCooldown = 0;
          state.dummy.isBlocking = false;
          syncCombatStatesToUI();
          spawnFloatingText(state.dummy.x, state.dummy.y - 20, 'READY FOR ROUND 2', '#facc15');
        }
      }, 1500);
    }
  };

  const spawnKOExplosion = (fighter: Fighter) => {
    const state = stateRef.current;
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4.5 + 1.5;
      const colorRoll = Math.random();
      const color = colorRoll < 0.38 ? '#ef4444' : (colorRoll < 0.72 ? '#000000' : '#ffffff');
      state.particles.push({
        id: `ko_disin_exp_${Math.random()}`,
        x: fighter.x + (Math.random() - 0.5) * (fighter.radius || 26),
        y: fighter.y + (Math.random() - 0.5) * (fighter.radius || 26),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        radius: Math.random() * 5 + 3,
        color,
        alpha: 1.0,
        life: 0,
        maxLife: Math.random() * 45 + 30,
        type: 'circle'
      });
    }
  };

  const triggerPlayerDash = () => {
    const state = stateRef.current;
    if (matchData?.isAiVsAiSpectator) return;
    if (state.cinematicZoomActive || state.matchEnded) return;
    if ((matchData?.isCompetitive || matchData?.isAiMatch) && state.rankedState !== 'fighting') return;
    const player = state.player;
    if (!player || player.isDead || (state.dummy && state.dummy.isDead) || (player.dashCooldown || 0) > 0 || player.stunTime > 0 || (player.armorBreakTime || 0) > 0 || (player.kyokushinSpinOutTimer || 0) > 0 || (player.shellLockoutTimer || 0) > 0 || player.aikiSlamStage || player.aikiSlamUninterruptible || (player.aikiLockoutTimer && player.aikiLockoutTimer > 0) || (player.aikiSpinDownTimer && player.aikiSpinDownTimer > 0)) return;

    if (!state.infiniteStamina && (player.stamina ?? 100) < 15) {
      spawnFloatingText(player.x, player.y - 30, 'NO STAMINA!', '#ef4444');
      return;
    }
    if (!state.infiniteStamina) {
      player.stamina = Math.max(0, (player.stamina ?? 100) - 15);
    }

    // Dodge direction: if WASD or joystick is pressed, calculate dash angle
    const keys = state.keysPressed || {};
    let moveX = 0;
    let moveY = 0;
    if (keys['KeyW'] || keys['ArrowUp']) moveY -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) moveY += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;

    const isMobileActive = ((settings.touchControlMode ?? 'virtual') === 'virtual') && (settings.showVirtualControls === 'always' || (settings.showVirtualControls === 'auto' && isTouchDevice));
    if (isMobileActive && state.joystickX !== undefined && state.joystickY !== undefined && (state.joystickX !== 0 || state.joystickY !== 0)) {
      moveX = state.joystickX;
      moveY = state.joystickY;
    }

    let dashAngle = player.facingAngle;
    if (moveX !== 0 || moveY !== 0) {
      if (settings.cameraMode === 'lockon_swipe') {
        const F = player.facingAngle;
        const forward = -moveY; // Up/W is forward relative to facing
        const strafe = moveX;   // Right/D is strafe right
        const relX = forward * Math.cos(F) - strafe * Math.sin(F);
        const relY = forward * Math.sin(F) + strafe * Math.cos(F);
        dashAngle = Math.atan2(relY, relX);
      } else {
        dashAngle = Math.atan2(moveY, moveX);
      }
    } else {
      const velSpeed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
      if (velSpeed > 0.5) {
        dashAngle = Math.atan2(player.vy, player.vx);
      }
    }

    // Short distance burst dash - calibrated for snappy and tactile movement!
    const styleObj = FIGHTING_STYLES.find(s => s.id === player.styleId) || FIGHTING_STYLES[0];
    const styleSpeed = styleObj.statModifiers?.speed ?? 1.0;
    const playerHeightMods = getHeightModifiers(player.baseHeight);
    
    player.dashAngle = dashAngle;
    let dashProgress = 18; // 18 frames (~0.30s) of deliberate kinetic stride
    let dashForce = 10.12 * styleSpeed * (playerHeightMods.dashDistanceModifier || 1.0); // Boosted 10% universally
    let dashCooldown = Math.round(180 * (playerHeightMods.dashCooldownModifier || 1.0)); // 3.0s standard CD

    if (player.styleId === 'capoeira') {
      dashProgress = 15; // Shorter, tighter esquiva dodge progress
      dashForce = 8.58 * (playerHeightMods.dashDistanceModifier || 1.0);   // Compact deliberate velocity matching close-range Ginga
      dashCooldown = Math.round(120 * (playerHeightMods.dashCooldownModifier || 1.0)); // 2.0s Capoeira CD
    } else if (player.styleId === 'basic') {
      dashProgress = 48;  // 0.8s Pendulum Dash (48 frames @ 60 FPS)
      dashForce = 2.145 * styleSpeed * (playerHeightMods.dashDistanceModifier || 1.0); // Slower, tightly controlled pacing with slightly longer sway
      dashCooldown = Math.round(480 * (playerHeightMods.dashCooldownModifier || 1.0)); // 8.0s cooldown
    }

    // Universal Rule: Concussion (S4/M2 hit) applies 60% movement speed slowdown to dashes as well
    if (player.concussTime && player.concussTime > 0) {
      dashForce *= 0.40;
      dashProgress = Math.max(6, Math.round(dashProgress * 0.6));
    }

    player.vx = Math.cos(dashAngle) * dashForce;
    player.vy = Math.sin(dashAngle) * dashForce;

    player.isDashing = true;
    player.dashProgress = dashProgress;
    player.dashCooldown = dashCooldown;
    player.dashInitiatedAfterHit = !!(player.lastHitBeforeDashTimer && player.lastHitBeforeDashTimer > 0);
    player.dashStartDist = state.dummy && !state.dummy.isDead ? Math.hypot(state.dummy.x - player.x, state.dummy.y - player.y) : undefined;
    player.keysiCloseDashPrimed = false;
    
    if (player.styleId === 'boxing_shell') {
      // Evasive Posture Refund: Dashing immediately refunds 10% Posture / Posture Cooldown
      const maxPosture = player.maxPostureCd || getStylePostureCooldown('boxing_shell');
      const refundAmount = Math.max(1, Math.round(maxPosture * 0.10));
      if (player.postureCd && player.postureCd > 0) {
        player.postureCd = Math.max(0, player.postureCd - refundAmount);
        player.isPostureLocked = player.postureCd > 0;
      }
      grantFighterPostureReduction(player, 0.10, true);
      spawnFloatingText(player.x, player.y - 30, 'POSTURE REFUND (+10%)', '#c084fc');
    }

    if (player.styleId === 'keysi') {
      // Intercepting Slip Dash primes Clinch Surge (0.1s windup + Super Armor)
      player.keysiM2Primed = true;
      spawnFloatingText(player.x, player.y - 30, 'CLINCH PRIMED (0.1s)!', '#ef4444');
    }

    // 💨 Block-to-Dash Cancel:
    // Pressing Dash while holding Block (or during post-block recovery lag) instantly cancels Guard into Dash!
    if (player.isBlocking) {
      player.isBlocking = false;
      setIsPlayerBlocking(false);
      player.blockLockout = Math.max(player.blockLockout || 0, BLOCK_COOLDOWN_FRAMES);
    }
    player.postBlockAttackLockout = 0; // Clears post-block recovery lag

    // Play dodge audio/effect
    soundManager.playDash();
    
    // Spawn initial dash afterimage
    state.particles.push({
      id: `dash_afterimage_${Math.random()}`,
      x: player.x,
      y: player.y,
      vx: 0,
      vy: 0,
      radius: player.radius,
      color: player.styleId === 'basic' ? '#00e5ff' : player.color,
      alpha: 0.50,
      life: 0,
      maxLife: 15,
      type: 'afterimage',
      facingAngle: player.facingAngle
    } as any);

    if (player.styleId === 'basic') {
      spawnFloatingText(player.x, player.y - 30, 'PENDULUM DASH!', '#00e5ff');
    } else {
      spawnFloatingText(player.x, player.y - 30, 'DASH!', '#f472b6');
    }
    syncCombatStatesToUI();
    sendImmediateWsGameState();
  };

  const triggerFighterDash = (fighter: Fighter, target?: Fighter) => {
    const state = stateRef.current;
    if (!fighter || fighter.isDead || (fighter.dashCooldown || 0) > 0 || (fighter.stunTime || 0) > 0 || (fighter.armorBreakTime || 0) > 0 || (fighter.kyokushinSpinOutTimer || 0) > 0 || (fighter.shellLockoutTimer || 0) > 0) return;

    let escapeAngle = fighter.facingAngle + Math.PI + (Math.random() * 0.8 - 0.4);
    if (target) {
      const angleToTarget = Math.atan2(target.y - fighter.y, target.x - fighter.x);
      escapeAngle = angleToTarget + Math.PI + (Math.random() * 0.8 - 0.4);
    }

    const styleObj = FIGHTING_STYLES.find(s => s.id === fighter.styleId) || FIGHTING_STYLES[0];
    const styleSpeed = styleObj.statModifiers?.speed ?? 1.0;
    const fighterHeightMods = getHeightModifiers(fighter.baseHeight);
    
    fighter.dashAngle = escapeAngle;
    let dashProgress = 18; // 18 frames (~0.30s) of deliberate kinetic stride
    let dashForce = 10.12 * styleSpeed * (fighterHeightMods.dashDistanceModifier || 1.0); // Boosted 10% universally
    let dashCooldown = Math.round(180 * (fighterHeightMods.dashCooldownModifier || 1.0)); // 3.0s standard CD

    if (fighter.styleId === 'capoeira') {
      dashProgress = 15;
      dashForce = 8.58 * (fighterHeightMods.dashDistanceModifier || 1.0);
      dashCooldown = Math.round(120 * (fighterHeightMods.dashCooldownModifier || 1.0)); // 2.0s Capoeira CD
    } else if (fighter.styleId === 'basic') {
      dashProgress = 48; // 0.8s Pendulum Dash (48 frames @ 60 FPS)
      dashForce = 2.145 * styleSpeed * (fighterHeightMods.dashDistanceModifier || 1.0); // Slower, tightly controlled pacing with slightly longer sway
      dashCooldown = Math.round(480 * (fighterHeightMods.dashCooldownModifier || 1.0)); // 8.0s cooldown
    }

    // Universal Rule: Concussion (S4/M2 hit) applies 60% movement speed slowdown to dashes as well
    if (fighter.concussTime && fighter.concussTime > 0) {
      dashForce *= 0.40;
      dashProgress = Math.max(6, Math.round(dashProgress * 0.6));
    }

    fighter.vx = Math.cos(escapeAngle) * dashForce;
    fighter.vy = Math.sin(escapeAngle) * dashForce;

    fighter.isDashing = true;
    fighter.dashProgress = dashProgress;
    fighter.dashCooldown = dashCooldown;
    fighter.dashInitiatedAfterHit = !!(fighter.lastHitBeforeDashTimer && fighter.lastHitBeforeDashTimer > 0);
    fighter.dashStartDist = target && !target.isDead ? Math.hypot(target.x - fighter.x, target.y - fighter.y) : undefined;
    fighter.keysiCloseDashPrimed = false;

    if (fighter.styleId === 'boxing_shell') {
      // Evasive Posture Refund: Dashing immediately refunds 10% Posture / Posture Cooldown
      const maxPosture = fighter.maxPostureCd || getStylePostureCooldown('boxing_shell');
      const refundAmount = Math.max(1, Math.round(maxPosture * 0.10));
      if (fighter.postureCd && fighter.postureCd > 0) {
        fighter.postureCd = Math.max(0, fighter.postureCd - refundAmount);
        fighter.isPostureLocked = fighter.postureCd > 0;
      }
      grantFighterPostureReduction(fighter, 0.10, true);
      spawnFloatingText(fighter.x, fighter.y - 30, 'POSTURE REFUND (+10%)', '#c084fc');
    }

    if (fighter.styleId === 'keysi') {
      fighter.keysiM2Primed = true;
    }

    // 💨 Block-to-Dash Cancel for AI/fighter:
    if (fighter.isBlocking) {
      fighter.isBlocking = false;
      fighter.blockLockout = Math.max(fighter.blockLockout || 0, BLOCK_COOLDOWN_FRAMES);
    }
    fighter.postBlockAttackLockout = 0;

    // Play sound and spawn initial afterimage
    soundManager.playDash();
    state.particles.push({
      id: `fighter_dash_afterimage_${Math.random()}`,
      x: fighter.x,
      y: fighter.y,
      vx: 0,
      vy: 0,
      radius: fighter.radius,
      color: fighter.styleId === 'basic' ? '#00e5ff' : fighter.color,
      alpha: 0.50,
      life: 0,
      maxLife: 15,
      type: 'afterimage',
      facingAngle: fighter.facingAngle
    } as any);

    spawnFloatingText(fighter.x, fighter.y - 30, 'DASH!', '#f472b6');
  };

  const triggerDummyDash = () => {
    const state = stateRef.current;
    if (state.dummy && state.player) {
      triggerFighterDash(state.dummy, state.player);
    }
  };

  // Sync core loop ref states to React states for HUD overlays
  const syncCombatStatesToUI = () => {
    const state = stateRef.current;
    const last = lastCombatUIStateRef.current;
    const now = Date.now();

    if (state.player) {
      const p = state.player;
      if (last.playerHealth !== p.health) {
        if (last.playerHealth !== undefined && p.health < last.playerHealth) {
          playerLastHitTimeRef.current = now;
        } else if (p.health > playerRedHPRef.current) {
          playerRedHPRef.current = p.health;
        }
        setPlayerHP(p.health);
        last.playerHealth = p.health;
      }

      // Smooth degradation incineration step calculation every frame
      let pRed = playerRedHPRef.current;
      if (p.health >= pRed) {
        pRed = p.health;
        playerRedHPRef.current = p.health;
      } else if (now - playerLastHitTimeRef.current > 300) {
        const diff = pRed - p.health;
        const step = Math.max(0.12, diff * 0.07);
        pRed = Math.max(p.health, pRed - step);
        playerRedHPRef.current = pRed;
      }

      if (last.playerRedHP !== pRed) {
        setPlayerRedHP(pRed);
        last.playerRedHP = pRed;
      }

      if (last.playerMaxHealth !== p.maxHealth) { setPlayerMaxHP(p.maxHealth); last.playerMaxHealth = p.maxHealth; }
      if (last.playerArmor !== p.armorHP) { setPlayerArmor(p.armorHP || 18); last.playerArmor = p.armorHP; }
      if (last.playerComboStage !== p.comboStage) { setActiveComboStage(p.comboStage || 0); last.playerComboStage = p.comboStage; }
      if (last.playerIsBlocking !== p.isBlocking) { setIsPlayerBlocking(p.isBlocking || false); last.playerIsBlocking = p.isBlocking; }
      if (last.playerHeavyWindup !== p.heavyWindup) { setPlayerWindup(p.heavyWindup || 0); last.playerHeavyWindup = p.heavyWindup; }
      if (last.playerDashCooldown !== p.dashCooldown) { setPlayerDashCooldown(p.dashCooldown || 0); last.playerDashCooldown = p.dashCooldown; }
      const pStacks = p.styleId === 'capoeira' ? (p.capoeiraDodgeStacks !== undefined ? p.capoeiraDodgeStacks : 3) : 0;
      const pExhausted = p.styleId === 'capoeira' ? (p.capoeiraExhausted || false) : false;
      if (last.playerCapoeiraStacks !== pStacks) { setPlayerCapoeiraStacks(pStacks); last.playerCapoeiraStacks = pStacks; }
      if (last.playerCapoeiraExhausted !== pExhausted) { setPlayerCapoeiraExhausted(pExhausted); last.playerCapoeiraExhausted = pExhausted; }

      if (last.playerStunTime !== p.stunTime) { setPlayerStunTime(p.stunTime || 0); last.playerStunTime = p.stunTime; }
      if (last.playerCrippleTime !== p.crippleTime) { setPlayerCrippleTime(p.crippleTime || 0); last.playerCrippleTime = p.crippleTime; }
      if (last.playerKeysiStaggerTimer !== p.keysiStaggerTimer) { setPlayerKeysiStaggerTimer(p.keysiStaggerTimer || 0); last.playerKeysiStaggerTimer = p.keysiStaggerTimer; }
      if (last.playerKeysiVulnerableTimer !== p.keysiVulnerableTimer) { setPlayerKeysiVulnerableTimer(p.keysiVulnerableTimer || 0); last.playerKeysiVulnerableTimer = p.keysiVulnerableTimer; }
      if (last.playerArmorBreakTime !== p.armorBreakTime) { setPlayerArmorBreakTime(p.armorBreakTime || 0); last.playerArmorBreakTime = p.armorBreakTime; }
      if (last.playerConcussTime !== p.concussTime) { setPlayerConcussTime(p.concussTime || 0); last.playerConcussTime = p.concussTime; }
      if (last.playerCapoeiraExhaustTimer !== p.capoeiraExhaustTimer) { setPlayerCapoeiraExhaustTimer(p.capoeiraExhaustTimer || 0); last.playerCapoeiraExhaustTimer = p.capoeiraExhaustTimer; }
      const pSpin = (p.spinOutTimer || 0) > 0 ? p.spinOutTimer : ((p.kyokushinSpinOutTimer || 0) > 0 ? p.kyokushinSpinOutTimer : 0);
      if (last.playerSpinOutTimer !== pSpin) { setPlayerSpinOutTimer(pSpin || 0); last.playerSpinOutTimer = pSpin; }
      if (last.playerHeavyCooldown !== p.heavyCooldown) { setPlayerHeavyCooldown(p.heavyCooldown || 0); last.playerHeavyCooldown = p.heavyCooldown; }
      if (last.playerPostureCd !== p.postureCd) { setPlayerPostureCd(p.postureCd || 0); last.playerPostureCd = p.postureCd; }
      if (last.playerMaxPostureCd !== p.maxPostureCd) { setPlayerMaxPostureCd(p.maxPostureCd || 78); last.playerMaxPostureCd = p.maxPostureCd; }
      if (last.isPlayerPostureLocked !== p.isPostureLocked) { setIsPlayerPostureLocked(p.isPostureLocked || false); last.isPlayerPostureLocked = p.isPostureLocked; }
      if (last.playerStamina !== p.stamina) { setPlayerStamina(p.stamina ?? 100); last.playerStamina = p.stamina ?? 100; }
      if (last.playerIsSprinting !== p.isSprinting) { setPlayerIsSprinting(p.isSprinting || false); last.playerIsSprinting = p.isSprinting || false; }
      if (last.playerSprintStrikerBuffer !== p.sprintStrikerBuffer) { setPlayerSprintStrikerBuffer(p.sprintStrikerBuffer || 0); last.playerSprintStrikerBuffer = p.sprintStrikerBuffer || 0; }
      if (last.playerPostSprintDisable !== p.postSprintDisable) { setPlayerPostSprintDisable(p.postSprintDisable || 0); last.playerPostSprintDisable = p.postSprintDisable || 0; }
    }
    if (state.dummy) {
      const d = state.dummy;
      if (last.dummyHealth !== d.health) {
        if (last.dummyHealth !== undefined && d.health < last.dummyHealth) {
          dummyLastHitTimeRef.current = now;
        } else if (d.health > dummyRedHPRef.current) {
          dummyRedHPRef.current = d.health;
        }
        setDummyHP(d.health);
        last.dummyHealth = d.health;
      }

      // Smooth degradation incineration step calculation every frame
      let dRed = dummyRedHPRef.current;
      if (d.health >= dRed) {
        dRed = d.health;
        dummyRedHPRef.current = d.health;
      } else if (now - dummyLastHitTimeRef.current > 300) {
        const diff = dRed - d.health;
        const step = Math.max(0.12, diff * 0.07);
        dRed = Math.max(d.health, dRed - step);
        dummyRedHPRef.current = dRed;
      }

      if (last.dummyRedHP !== dRed) {
        setDummyRedHP(dRed);
        last.dummyRedHP = dRed;
      }

      if (last.dummyMaxHealth !== d.maxHealth) { setDummyMaxHP(d.maxHealth); last.dummyMaxHealth = d.maxHealth; }
      if (last.dummyArmor !== d.armorHP) { setDummyArmor(d.armorHP || 18); last.dummyArmor = d.armorHP; }
      if (last.dummyIsBlocking !== d.isBlocking) { setIsDummyBlocking(d.isBlocking || false); last.dummyIsBlocking = d.isBlocking; }
      if (last.dummyHeavyWindup !== d.heavyWindup) { setDummyWindup(d.heavyWindup || 0); last.dummyHeavyWindup = d.heavyWindup; }
      const dStacks = d.styleId === 'capoeira' ? (d.capoeiraDodgeStacks !== undefined ? d.capoeiraDodgeStacks : 3) : 0;
      const dExhausted = d.styleId === 'capoeira' ? (d.capoeiraExhausted || false) : false;
      if (last.dummyCapoeiraStacks !== dStacks) { setDummyCapoeiraStacks(dStacks); last.dummyCapoeiraStacks = dStacks; }
      if (last.dummyCapoeiraExhausted !== dExhausted) { setDummyCapoeiraExhausted(dExhausted); last.dummyCapoeiraExhausted = dExhausted; }
      if (last.dummyStamina !== d.stamina) { setDummyStamina(d.stamina ?? 100); last.dummyStamina = d.stamina ?? 100; }
      if (last.dummyIsSprinting !== d.isSprinting) { setDummyIsSprinting(d.isSprinting || false); last.dummyIsSprinting = d.isSprinting || false; }

      if (last.dummyStunTime !== d.stunTime) { setDummyStunTime(d.stunTime || 0); last.dummyStunTime = d.stunTime; }
      if (last.dummyCrippleTime !== d.crippleTime) { setDummyCrippleTime(d.crippleTime || 0); last.dummyCrippleTime = d.crippleTime; }
      if (last.dummyKeysiStaggerTimer !== d.keysiStaggerTimer) { setDummyKeysiStaggerTimer(d.keysiStaggerTimer || 0); last.dummyKeysiStaggerTimer = d.keysiStaggerTimer; }
      if (last.dummyKeysiVulnerableTimer !== d.keysiVulnerableTimer) { setDummyKeysiVulnerableTimer(d.keysiVulnerableTimer || 0); last.dummyKeysiVulnerableTimer = d.keysiVulnerableTimer; }
      if (last.dummyArmorBreakTime !== d.armorBreakTime) { setDummyArmorBreakTime(d.armorBreakTime || 0); last.dummyArmorBreakTime = d.armorBreakTime; }
      if (last.dummyConcussTime !== d.concussTime) { setDummyConcussTime(d.concussTime || 0); last.dummyConcussTime = d.concussTime; }
      if (last.dummyCapoeiraExhaustTimer !== d.capoeiraExhaustTimer) { setDummyCapoeiraExhaustTimer(d.capoeiraExhaustTimer || 0); last.dummyCapoeiraExhaustTimer = d.capoeiraExhaustTimer; }
      const dSpin = (d.spinOutTimer || 0) > 0 ? d.spinOutTimer : ((d.kyokushinSpinOutTimer || 0) > 0 ? d.kyokushinSpinOutTimer : 0);
      if (last.dummySpinOutTimer !== dSpin) { setDummySpinOutTimer(dSpin || 0); last.dummySpinOutTimer = dSpin; }
      if (last.dummyPostureCd !== d.postureCd) { setDummyPostureCd(d.postureCd || 0); last.dummyPostureCd = d.postureCd; }
    }

    // Real-time synchronization of Dedicated Status Bars
    if (state.player) {
      const pStatuses = extractFighterStatuses(state.player, state.shakyVisionTimer);
      setPlayerActiveStatuses(pStatuses);
    } else {
      setPlayerActiveStatuses([]);
    }

    if (state.dummy) {
      const dStatuses = extractFighterStatuses(state.dummy);
      setDummyActiveStatuses(dStatuses);
    } else {
      setDummyActiveStatuses([]);
    }

    if (state.player && state.dummy) {
      const dist = Math.round(Math.hypot(state.dummy.x - state.player.x, state.dummy.y - state.player.y));
      if (last.opponentDistance === undefined || Math.abs(last.opponentDistance - dist) >= 2) {
        setOpponentDistance(dist);
        last.opponentDistance = dist;
      }

      let pState = 'NEUTRAL';
      if (state.player.stunTime && state.player.stunTime > 0) pState = 'STUNNED';
      else if (state.player.isBlocking) pState = 'BLOCKING';
      else if (state.player.isDashing) pState = 'DASHING';
      else if (state.player.heavyWindup && state.player.heavyWindup > 0) pState = 'HEAVY WINDUP';
      else if (state.player.fists.some(f => f.isPunching)) pState = 'STRIKING';
      if (last.playerCombatState !== pState) {
        setPlayerCombatState(pState);
        last.playerCombatState = pState;
      }

      let dState = 'NEUTRAL';
      if (state.dummy.stunTime && state.dummy.stunTime > 0) dState = 'STUNNED';
      else if (state.dummy.isBlocking) dState = 'BLOCKING';
      else if (state.dummy.isDashing) dState = 'DASHING';
      else if (state.dummy.heavyWindup && state.dummy.heavyWindup > 0) dState = 'HEAVY WINDUP';
      else if (state.dummy.fists.some(f => f.isPunching)) dState = 'STRIKING';
      if (last.dummyCombatState !== dState) {
        setDummyCombatState(dState);
        last.dummyCombatState = dState;
      }
    }
  };

  // -----------------------------------------------------
  // SECTION 9.1 BLOCK #2: ATTACK TRIGGERS & HEAVY ACTIONS
  // -----------------------------------------------------
  const finalizeKickboxingM2Cooldown = useCallback((fighter: Fighter) => {
    finalizeKickboxingM2CooldownHelper(fighter, spawnFloatingText, soundManager);
  }, [spawnFloatingText]);

  const applyHeavyWhiffPenalty = useCallback((fighter: Fighter) => {
    applyHeavyWhiffPenaltyHelper(fighter, spawnFloatingText, soundManager);
  }, [spawnFloatingText]);

  const getAttackTriggersContext = useCallback(() => ({
    stateRef,
    soundManager,
    matchData,
    isImpactFrameActive,
    spawnFloatingText,
    syncCombatStatesToUI,
    setIsPlayerBlocking,
    setTotalSwings,
    sendImmediateWsGameState,
    applyHeavyWhiffPenalty: (f: any) => applyHeavyWhiffPenaltyHelper(f, spawnFloatingText, soundManager)
  }), [matchData, sendImmediateWsGameState, spawnFloatingText, syncCombatStatesToUI, setIsPlayerBlocking, setTotalSwings, isImpactFrameActive]);

  // Left click trigger Light strike (Basic 4-Combo Sequence)
  const triggerPlayerLightAttack = useCallback(() => {
    executePlayerLightAttackTrigger(getAttackTriggersContext());
  }, [getAttackTriggersContext]);

  // Right click trigger Heavy strike (Right hook with 0.8s windup)
  const triggerPlayerHeavyAttack = useCallback(() => {
    executePlayerHeavyAttackTrigger(getAttackTriggersContext());
  }, [getAttackTriggersContext]);

  // Complete heavy hook action after windup finishes
  const executePlayerHeavyAttack = useCallback(() => {
    executePlayerHeavyRelease(getAttackTriggersContext());
  }, [getAttackTriggersContext]);

  // Sparring Dummy AI Heavy Attack Execution
  const executeDummyHeavyAttack = useCallback(() => {
    executeDummyHeavyRelease(getAttackTriggersContext());
  }, [getAttackTriggersContext]);

  // Event handlers for mouse movement & steering
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const state = stateRef.current;
    state.mouseX = mx;
    state.mouseY = my;

    if (settings.cameraMode === 'lockon_swipe' && touchDragRef.current.isDragging) {
      const deltaX = e.clientX - touchDragRef.current.startX;
      touchDragRef.current.startX = e.clientX;
      touchDragRef.current.startY = e.clientY;
      const sensitivity = settings.cameraSensitivity ?? 1.0;
      const player = state.player;
      if (player && deltaX !== 0 && player.attackLockedAngle === undefined) {
        // Swiping right (deltaX > 0) turns character to the left
        // Swiping left (deltaX < 0) turns character to the right
        player.facingAngle -= deltaX * sensitivity * 0.007;
        while (player.facingAngle > Math.PI) player.facingAngle -= Math.PI * 2;
        while (player.facingAngle < -Math.PI) player.facingAngle += Math.PI * 2;
      }
    }
  };

  const handleMouseLeave = () => {
    const state = stateRef.current;
    state.mouseX = -1000;
    state.mouseY = -1000;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Already handled in handleMouseDown
  };

  const lastCanvasTouchTimeRef = useRef<number>(0);
  const activeAimTouchIdRef = useRef<number | null>(null);
  const touchDragRef = useRef<{ isDragging: boolean; startX: number; startY: number }>({ isDragging: false, startX: 0, startY: 0 });
  const mouseDownInfoRef = useRef<{ x: number; y: number; time: number; button: number } | null>(null);
  const lastStanceDirRef = useRef<'none' | 'left' | 'right' | 'front'>('none');
  const stanceTapCountRef = useRef<number>(0);
  const lastStanceTapTimeRef = useRef<number>(0);
  const wasMovingDirRef = useRef<boolean>(false);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isPlaying || isDead || isGamePausedRef.current || stateRef.current.cinematicZoomActive || stateRef.current.matchEnded || stateRef.current.player?.isDead || stateRef.current.dummy?.isDead) return;

    // In Lock-On mode: dragging aims character left/right along character axis; quick click triggers attack
    if (settings.cameraMode === 'lockon_swipe') {
      touchDragRef.current = { isDragging: true, startX: e.clientX, startY: e.clientY };
      mouseDownInfoRef.current = { x: e.clientX, y: e.clientY, time: Date.now(), button: e.button };
      return;
    }

    // Mutually Exclusive Control Scheme: In Virtual Mode on touch devices, ignore direct canvas clicks so virtual buttons take exclusive control
    const isVirtualModeActive = (settings.touchControlMode ?? 'virtual') === 'virtual';
    if (isVirtualModeActive && isTouchDevice) {
      return;
    }

    if (e.button === 0) {
      // Left Click
      stateRef.current.isLMBHeld = true;
      triggerPlayerLightAttack();
    } else if (e.button === 2) {
      // Right Click
      triggerPlayerHeavyAttack();
    }
  };

  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isPlaying || isDead || isGamePausedRef.current || stateRef.current.cinematicZoomActive || stateRef.current.matchEnded || stateRef.current.player?.isDead || stateRef.current.dummy?.isDead) return;

    if (settings.cameraMode === 'lockon_swipe' && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      activeAimTouchIdRef.current = touch.identifier;
      touchDragRef.current = { isDragging: true, startX: touch.clientX, startY: touch.clientY };
    }
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isPlaying || isDead) return;

    if (settings.cameraMode === 'lockon_swipe' && touchDragRef.current.isDragging && e.touches.length > 0) {
      let touch: React.Touch | null = null;
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches.item(i);
        if (t && t.identifier === activeAimTouchIdRef.current) {
          touch = t;
          break;
        }
      }
      if (!touch && e.touches.length > 0) {
        touch = e.touches.item(0);
      }
      if (!touch) return;
      const deltaX = touch.clientX - touchDragRef.current.startX;
      touchDragRef.current.startX = touch.clientX;
      touchDragRef.current.startY = touch.clientY;
      const sensitivity = settings.cameraSensitivity ?? 1.0;
      const player = stateRef.current.player;
      if (player && deltaX !== 0) {
        // Swiping right (deltaX > 0) turns character to the left
        // Swiping left (deltaX < 0) turns character to the right
        player.facingAngle -= deltaX * sensitivity * 0.007;
        while (player.facingAngle > Math.PI) player.facingAngle -= Math.PI * 2;
        while (player.facingAngle < -Math.PI) player.facingAngle += Math.PI * 2;
      }
    }
  };

  const handleCanvasTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (activeAimTouchIdRef.current !== null) {
      let ended = false;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches.item(i);
        if (t && t.identifier === activeAimTouchIdRef.current) {
          ended = true;
          break;
        }
      }
      if (ended || e.touches.length === 0) {
        touchDragRef.current.isDragging = false;
        activeAimTouchIdRef.current = null;
      }
    } else {
      touchDragRef.current.isDragging = false;
    }
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      stateRef.current.isLMBHeld = false;
    }
    if (settings.cameraMode === 'lockon_swipe') {
      touchDragRef.current.isDragging = false;
      const info = mouseDownInfoRef.current;
      if (info && info.button === e.button) {
        const dist = Math.hypot(e.clientX - info.x, e.clientY - info.y);
        const elapsed = Date.now() - info.time;
        if (dist < 8 && elapsed < 300) {
          if (e.button === 0) {
            triggerPlayerLightAttack();
          } else if (e.button === 2) {
            triggerPlayerHeavyAttack();
          }
        }
      }
      mouseDownInfoRef.current = null;
    }
  };

  useEffect(() => {
    const onUp = (e: MouseEvent) => handleMouseUp(e);
    const onBlur = () => { stateRef.current.isLMBHeld = false; };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // Prevent browser context menu inside the MMA sparring area
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // Player 1 AI control loop (Used during Spectator Mode AI vs AI)
  const updatePlayerAI = () => {
    if (!matchData?.isAiVsAiSpectator) return;
    const state = stateRef.current;
    if (state.player && state.dummy) {
      const b1Diff = matchData?.bot1Difficulty || specBot1Diff || 'silver';
      updateFighterAIModule(state.player as any, state.dummy as any, b1Diff as any, state as any, { spawnFloatingText, triggerFighterDash });
    }
  };

  // 1v1 Sparring dummy AI logic
  const updateDummyAI = () => {
    const isRealPvP = !!(matchData && matchData.isRealMatch);
    if (isRealPvP) return;

    const state = stateRef.current;
    if (state.dummy && state.player && !state.freezeAI && !isImpactFrameActive()) {
      const b2Diff = matchData?.isAiVsAiSpectator 
        ? (matchData?.bot2Difficulty || specBot2Diff || 'gold') 
        : dummyBehavior;
      updateFighterAIModule(state.dummy as any, state.player as any, b2Diff as any, state as any, { spawnFloatingText, triggerFighterDash }, { m1Speed: dummyM1Speed, follow: state.dummyFollow });
    }
  };

  // Main Arena Physics Update Loop (Phase 3B: Evicted to src/combat/simulation/)
  const updatePhysics = () => {
    runPhysicsSimulation(stateRef.current, {
      matchData,
      dummyBehavior,
      settings: settingsRef.current,
      soundManager,
      spawnFloatingText,
      handleRoundWinner,
      setPotatoFuseLeft,
      userEmail,
      syncCombatStatesToUI,
      isTouchDevice,
      triggerKOCinematic,
      triggerPlayerLightAttack,
      executePlayerHeavyAttack,
      executeDummyHeavyAttack,
      setIsPlayerBlocking,
      setTotalDamageDealt,
      setTotalHitsLanded,
      setTotalParries,
      matchTotalFramesRef,
      matchForwardFramesRef,
      matchParriesLandedRef,
      roundParriesLandedRef,
      matchPostureBreaksRef,
      playerMinPosturePctRef,
      QuestTracker,
    });
  };

  // -----------------------------------------------------
  // SECTION 9.1 BLOCK #3: COLLISION & HITBOX ENGINE
  // -----------------------------------------------------
  const detectSparringCollisions = useCallback(() => {
    runDetectSparringCollisions({
      stateRef,
      matchData,
      soundManager,
      spawnFloatingText,
      onFighterHit: (attacker, defender, isHeavy, comboStage, strikePos) => {
        applyFighterHit(attacker, defender, isHeavy, comboStage, strikePos);
      }
    });
  }, [matchData, spawnFloatingText]);

  // -----------------------------------------------------
  // SECTION 9.2: CANVAS RENDERING PIPELINE (ArenaRenderer)
  // -----------------------------------------------------
  const renderGame = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ArenaRenderer.drawFrame({
      ctx,
      state: stateRef.current,
      settings,
      matchData,
      showHitboxes
    });
  }, [settings, matchData, showHitboxes]);


  // Temporary Fighting Style changer for AI Practice (Does NOT save to stats)
  const handlePracticePlayerStyleChange = (styleId: string) => {
    const selectedStyle = FIGHTING_STYLES.find(s => s.id === styleId);
    if (!selectedStyle) return;

    // 1. Update practice-only React state (does not persist to stats)
    setPracticePlayerStyleId(styleId);
    
    // 2. Play sound effect
    soundManager.playUpgradeHeight();
    
    // 3. Immediately update active player in stateRef
    const state = stateRef.current;
    if (state && state.player) {
      const player = state.player;
      player.styleId = selectedStyle.id;
      player.color = selectedStyle.color;
      player.secondaryColor = selectedStyle.secondaryColor;
      
      const baseH = player.baseHeight || 68;
      const mods = getHeightModifiers(baseH);
      const styleBonus = selectedStyle.statModifiers?.healthMax || 0;
      
      const maxHP = Math.round(mods.maxHealth * (1 + styleBonus / 100));
      player.maxHealth = maxHP;
      player.health = Math.min(player.health, maxHP);
      player.comboStage = 0;
      player.heavyWindup = 0;
      player.heavyCooldown = 0;
      player.lightCooldown = 0;
      player.strikeCooldown = 0;
      player.stunTime = 0;
      player.armorBreakTime = 0;
      player.postBlockAttackLockout = 0;
      player.postS4HeavyLockout = 0;
      player.blockLockout = 0;
      player.crippleTime = 0;
      player.concussTime = 0;
      player.isBlocking = false;
      player.wasBlocking = false;
      player.isDashing = false;
      player.dashProgress = 0;
      player.attackLockedAngle = undefined;

      // Reset Capoeira & Ashihara specific state flags
      player.capoeiraExhausted = false;
      player.capoeiraExhaustTimer = 0;
      player.capoeiraDodgeStacks = selectedStyle.id === 'capoeira' ? 3 : 0;
      player.capoeiraDodgeFlashTime = 0;
      player.capoeiraRegenTimer = 0;
      player.capoeiraWhiffBonusActive = false;
      player.capoeiraS3IFrameTimer = 0;
      player.ashiharaRecoveryTimer = 0;
      
      // Re-initialize fists for the new style structure
      player.fists = [
        { id: 1, offsetX: 16, offsetY: -12, angle: 0, radius: player.radius * 0.28, isPunching: false, punchProgress: 0, punchType: 'left' },
        { id: 2, offsetX: 16, offsetY: 12, angle: 0, radius: player.radius * 0.28, isPunching: false, punchProgress: 0, punchType: 'right' }
      ];

      spawnFloatingText(
        player.x,
        player.y - 35,
        `PRACTICE STYLE: ${selectedStyle.name.toUpperCase()}`,
        selectedStyle.color
      );
      syncCombatStatesToUI();
    }
  };

  // Temporary Height changer for AI Practice (Does NOT save to stats)
  const handlePracticePlayerHeightChange = (newHeight: number) => {
    setPracticePlayerHeightInInches(newHeight);
    const state = stateRef.current;
    if (state && state.player) {
      const player = state.player;
      const playerMods = getHeightModifiers(newHeight);
      player.baseHeight = newHeight;
      player.radius = 26 * playerMods.scaleFactor;
      
      const currentStyle = FIGHTING_STYLES.find(s => s.id === player.styleId);
      const styleBonus = currentStyle?.statModifiers?.healthMax || 0;
      const newMaxHP = Math.round(playerMods.maxHealth * (1 + styleBonus / 100));
      const oldMax = player.maxHealth || newMaxHP;
      const oldHealth = player.health;
      player.maxHealth = newMaxHP;
      player.health = Math.round((oldHealth / oldMax) * newMaxHP);

      player.fists = [
        { id: 1, offsetX: 16, offsetY: -12, angle: 0, radius: player.radius * 0.28, isPunching: false, punchProgress: 0, punchType: 'left' },
        { id: 2, offsetX: 16, offsetY: 12, angle: 0, radius: player.radius * 0.28, isPunching: false, punchProgress: 0, punchType: 'right' }
      ];

      spawnFloatingText(
        player.x,
        player.y - 35,
        `PRACTICE HEIGHT: ${Math.floor(newHeight / 12)}'${newHeight % 12}"`,
        '#38bdf8'
      );
      syncCombatStatesToUI();
    }
  };

  // Instant fighting style changer for developer testing / quick switcher
  const handleDevStyleChange = (styleId: string) => {
    handlePracticePlayerStyleChange(styleId);
  };

  const handleDummyStyleChange = (styleId: string) => {
    setDummyStyleId(styleId);
    const selectedStyle = FIGHTING_STYLES.find(s => s.id === styleId);
    if (selectedStyle && stateRef.current.dummy) {
      const dummy = stateRef.current.dummy;
      dummy.styleId = selectedStyle.id;
      dummy.color = selectedStyle.color;
      dummy.secondaryColor = selectedStyle.secondaryColor;
      dummy.comboStage = 0;
      dummy.heavyWindup = 0;
      dummy.heavyCooldown = 0;
      dummy.lightCooldown = 0;
      dummy.strikeCooldown = 0;
      dummy.stunTime = 0;
      dummy.armorBreakTime = 0;
      dummy.postBlockAttackLockout = 0;
      dummy.postS4HeavyLockout = 0;
      dummy.blockLockout = 0;
      dummy.crippleTime = 0;
      dummy.concussTime = 0;
      dummy.isBlocking = false;
      dummy.wasBlocking = false;
      dummy.isDashing = false;
      dummy.dashProgress = 0;
      dummy.attackLockedAngle = undefined;

      // Reset Capoeira & Ashihara specific state flags
      dummy.capoeiraExhausted = false;
      dummy.capoeiraExhaustTimer = 0;
      dummy.capoeiraDodgeStacks = selectedStyle.id === 'capoeira' ? 3 : 0;
      dummy.capoeiraDodgeFlashTime = 0;
      dummy.capoeiraRegenTimer = 0;
      dummy.capoeiraWhiffBonusActive = false;
      dummy.capoeiraS3IFrameTimer = 0;
      dummy.ashiharaRecoveryTimer = 0;
      spawnFloatingText(
        stateRef.current.dummy.x,
        stateRef.current.dummy.y - 35,
        `AI STYLE: ${selectedStyle.name.toUpperCase()}`,
        selectedStyle.color
      );
    }
  };

  const handleDummyHeightChange = (newHeight: number) => {
    setDummyHeightInInches(newHeight);
    if (stateRef.current.dummy) {
      const dummyMods = getHeightModifiers(newHeight);
      stateRef.current.dummy.baseHeight = newHeight;
      stateRef.current.dummy.radius = 26 * dummyMods.scaleFactor;
      
      const oldMax = stateRef.current.dummy.maxHealth;
      const oldHealth = stateRef.current.dummy.health;
      stateRef.current.dummy.maxHealth = dummyMods.maxHealth;
      stateRef.current.dummy.health = Math.round((oldHealth / oldMax) * dummyMods.maxHealth);
      
      spawnFloatingText(
        stateRef.current.dummy.x,
        stateRef.current.dummy.y - 35,
        `AI HEIGHT: ${Math.floor(newHeight / 12)}'${newHeight % 12}"`,
        '#22d3ee'
      );
      syncCombatStatesToUI();
    }
  };

  const handleResetTrainingSession = () => {
    const state = stateRef.current;
    if (state.player && state.dummy) {
      const playerMods = getHeightModifiers(state.player.baseHeight);
      const dummyMods = getHeightModifiers(state.dummy.baseHeight);

      // Reset Player
      state.player.health = playerMods.maxHealth;
      state.player.maxHealth = playerMods.maxHealth;
      state.player.armorHP = 18;
      state.player.isDead = false;
      state.player.x = (state.arenaSize / 2) - 180;
      state.player.y = state.arenaSize / 2;
      state.player.vx = 0;
      state.player.vy = 0;
      state.player.armorBreakTime = 0;
      state.player.stunTime = 0;
      state.player.m2StunTimer = 0;
      state.player.concussTime = 0;
      state.player.crippleTime = 0;
      state.player.comboStage = 0;
      state.player.heavyWindup = 0;
      state.player.strikeCooldown = 0;
      state.player.lightCooldown = 0;
      state.player.postS4HeavyLockout = 0;
      state.player.heavyCooldown = 0;
      state.player.isBlocking = false;

      // Reset Dummy
      state.dummy.health = dummyMods.maxHealth;
      state.dummy.maxHealth = dummyMods.maxHealth;
      state.dummy.armorHP = 18;
      state.dummy.isDead = false;
      state.dummy.x = (state.arenaSize / 2) + 180;
      state.dummy.y = state.arenaSize / 2;
      state.dummy.vx = 0;
      state.dummy.vy = 0;
      state.dummy.armorBreakTime = 0;
      state.dummy.stunTime = 0;
      state.dummy.m2StunTimer = 0;
      state.dummy.concussTime = 0;
      state.dummy.crippleTime = 0;
      state.dummy.comboStage = 0;
      state.dummy.heavyWindup = 0;
      state.dummy.strikeCooldown = 0;
      state.dummy.lightCooldown = 0;
      state.dummy.postS4HeavyLockout = 0;
      state.dummy.heavyCooldown = 0;
      state.dummy.isBlocking = false;

      syncCombatStatesToUI();
      soundManager.playLevelUp();
      spawnFloatingText(state.player.x, state.player.y - 30, 'SPARRING SESSION RESET', '#10b981');
    }
  };

  const handleCenterDummy = () => {
    const state = stateRef.current;
    if (!state.player || !state.dummy) return;
    const p = state.player;
    const d = state.dummy;
    d.x = p.x + Math.cos(p.facingAngle) * 140;
    d.y = p.y + Math.sin(p.facingAngle) * 140;
    d.vx = 0;
    d.vy = 0;
    d.facingAngle = p.facingAngle + Math.PI;
    soundManager.playRollTick();
    spawnFloatingText(d.x, d.y - 30, 'AI DUMMY CENTERED', '#22d3ee');
  };

  const handleClearTelemetry = () => {
    stateRef.current.totalDamageDealt = 0;
    stateRef.current.totalDamageTaken = 0;
    stateRef.current.totalHitsLanded = 0;
    stateRef.current.totalSwings = 0;
    stateRef.current.totalParries = 0;
    stateRef.current.totalBlocks = 0;
    stateRef.current.maxCombo = 0;
    stateRef.current.currentCombo = 0;
    setTotalDamageDealt(0);
    setTotalDamageTaken(0);
    setTotalHitsLanded(0);
    setTotalSwings(0);
    setTotalParries(0);
    setTotalBlocks(0);
    setMaxCombo(0);
    soundManager.playRollTick();
    if (stateRef.current.player) {
      spawnFloatingText(stateRef.current.player.x, stateRef.current.player.y - 30, 'TELEMETRY CLEARED', '#38bdf8');
    }
  };

  const handleRefreshM1Sequence = () => {
    const state = stateRef.current;
    if (state.player) {
      state.player.comboStage = 0;
      state.player.comboResetTimer = 0;
      state.player.lightCooldown = 0;
      state.player.postureCd = 0;
      state.player.maxPostureCd = 0;
      state.player.isPostureLocked = false;
      state.player.postSprintDisable = 0;
      state.player.postBlockAttackLockout = 0;
      syncCombatStatesToUI();
      spawnFloatingText(state.player.x, state.player.y - 35, 'M1 SEQUENCE & POSTURE REFRESHED!', '#22d3ee');
    }
  };

  const handleResetM2Cooldown = () => {
    const state = stateRef.current;
    if (state.player) {
      state.player.heavyCooldown = 0;
      state.player.strikeCooldown = 0;
      state.player.postS4HeavyLockout = 0;
      state.player.ashiharaRecoveryTimer = 0;
      state.player.m2SeqWindow = 0;
      state.player.m2SeqReady = false;
      state.player.kickboxingSeq2Window = 0;
      state.player.kickboxingSeq2Ready = false;
      syncCombatStatesToUI();
      spawnFloatingText(state.player.x, state.player.y - 35, 'M2 COOLDOWN RESET!', '#f59e0b');
    }
  };

  // Back trigger to exit matching and fully reset Arena state
  const handleExitArena = (destinationArg?: any) => {
    const destination = typeof destinationArg === 'string' ? destinationArg : undefined;
    // 1. If this was a tournament match and player left/forfeited mid-fight:
    const isTournament = matchData?.aiModeType === 'tournament' || matchData?.isAiVsAiSpectator;
    if (matchData?.aiModeType === 'tournament' && !matchWinner) {
      try {
        const saved = localStorage.getItem('mma_sim_tournament_bracket_v1_7_4');
        if (saved) {
          const bracket = JSON.parse(saved);
          if (bracket && bracket.status === 'in_progress') {
            bracket.status = 'eliminated';
            bracket.playerExitRound = matchData.tournamentRound || 'quarter';
            bracket.playerFinalPlacement = matchData.tournamentRound === 'final' ? 'runner_up' : matchData.tournamentRound === 'semi' ? 'semi_exit' : 'quarter_exit';
            localStorage.setItem('mma_sim_tournament_bracket_v1_7_4', JSON.stringify(bracket));
          }
        }
      } catch (e) {}
    }

    // 2. Cleanly reset stateRef to avoid dirty state on re-entry
    const state = stateRef.current;
    if (state) {
      state.player = null;
      state.dummy = null;
      state.particles = [];
      state.totalDamageDealt = 0;
      state.totalDamageTaken = 0;
      state.totalHitsLanded = 0;
      state.totalSwings = 0;
      state.totalParries = 0;
      state.totalBlocks = 0;
      state.maxCombo = 0;
      state.currentCombo = 0;
      state.sustainPlayerDamage = 0;
      state.sustainOpponentDamage = 0;
      state.potatoHolder = undefined;
      state.potatoFuseTimer = undefined;
      state.keysPressed = {};
    }

    // 3. Reset React states
    setIsPlaying(false);
    setRankedState('countdown');
    setRankedCountdown(3);
    setPlayerScore(0);
    setOpponentScore(0);
    setRoundNumber(1);
    setMatchWinner(null);
    setRematchRequested(false);
    setOpponentRematchRequested(false);
    setShowMobileMenu(false);
    setShowModeSelector(false);
    simulationSpeedRef.current = 1.0;
    setSimulationSpeed(1.0);

    // 4. Return to appropriate menu
    const targetDest = destination || (isTournament ? 'tournament' : 'MENU');
    onBackToMenu(targetDest);
  };



  const dummyStyle = stateRef.current?.dummy 
    ? FIGHTING_STYLES.find(s => s.id === stateRef.current.dummy?.styleId) 
    : (FIGHTING_STYLES.find(s => s.id === dummyStyleId) || FIGHTING_STYLES[0]);

  return (
    <div id="arena-root" ref={containerRef} className="relative w-full h-full h-[100dvh] max-h-[100dvh] bg-zinc-950 flex flex-col overflow-hidden font-sans select-none touch-none overscroll-none">
      
      {/* 2D CANVAS WITH VISUAL BLUR CLASS TRIGGER ON HEAVY HIT CONCUSSIOn */}
      <canvas 
        ref={canvasRef}
        id="arena-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleCanvasTouchStart}
        onTouchMove={handleCanvasTouchMove}
        onTouchEnd={handleCanvasTouchEnd}
        onTouchCancel={handleCanvasTouchEnd}
        onContextMenu={handleContextMenu}
        className="w-full h-full cursor-none"
        style={{
          filter: (stateRef.current.visionBlurTime > 0 || (stateRef.current.shakyVisionTimer && stateRef.current.shakyVisionTimer > 0) || (stateRef.current.player && (stateRef.current.player.aikiShakyVisionTimer || 0) > 0))
            ? `blur(${Math.max(stateRef.current.visionBlurTime > 0 ? Math.min(5, stateRef.current.visionBlurTime / 20) : 0, 1.5)}px)`
            : 'none',
          transition: 'filter 0.1s ease-out'
        }}
      />

      {/* LOCAL CLIENT-SIDE VISUAL IMPAIRMENT OVERLAYS (STRICTLY ISOLATED TO CLIENT INSTANCE) */}
      {isPlaying && !isDead && !showModeSelector && (
        <div className="absolute inset-0 pointer-events-none z-[5]">
          {/* Critical Low Health vignette warnings */}
          {playerHP < playerMaxHP * 0.35 && (
            <div className="absolute inset-0 border-[16px] border-red-600/25 animate-pulse" />
          )}
          
          {/* Yellow stun vignette and flash */}
          {playerStunTime > 0 && (
            <div className="absolute inset-0 bg-yellow-500/5 mix-blend-overlay shadow-[inset_0_0_120px_rgba(234,179,8,0.45)] animate-pulse" />
          )}

          {/* Purple concussed / blind edge vignette */}
          {playerConcussTime > 0 && (
            <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(168,85,247,0.35)]" />
          )}

          {/* Red shield broken warning pulse */}
          {playerArmorBreakTime > 0 && (
            <div className="absolute inset-0 bg-red-950/10 shadow-[inset_0_0_100px_rgba(239,68,68,0.35)] animate-pulse" />
          )}
        </div>
      )}

      {/* MOBILE TOUCH VIRTUAL CONTROLS OVERLAY (Extracted to CombatHUD) */}
      <CombatHUD
        settings={settings}
        stateRef={stateRef}
        isPlaying={isPlaying}
        isDead={isDead}
        rankedState={rankedState}
        showModeSelector={showModeSelector}
        matchData={matchData}
        isLiveHudEditing={isLiveHudEditing}
        isTouchDevice={isTouchDevice}
        isPortrait={isPortrait}
        onLightAttack={triggerPlayerLightAttack}
        onLightHoldStart={() => {
          stateRef.current.isLMBHeld = true;
        }}
        onLightHoldEnd={() => {
          stateRef.current.isLMBHeld = false;
        }}
        onHeavyAttack={triggerPlayerHeavyAttack}
        onBlockStart={() => {
          const state = stateRef.current;
          state.isBlockInputHeld = true;
          const player = state.player;
          if (player) {
            player.isBlockInputHeld = true;
            if (player.blockLockout && player.blockLockout > 0) {
              player.isBlocking = false;
              player.blockLockout = 18;
              setIsPlayerBlocking(false);
              return;
            }

            if (!player.blockRefreshThreshold) {
              player.blockRefreshThreshold = Math.floor(Math.random() * 2) + 2;
            }
            player.blockUseCount = (player.blockUseCount || 0) + 1;
            player.blockUseResetTimer = 120;

            // Even if spamming mid-way through blocking, immediately cancels out block for 0.3s after 2-3 times!
            if (player.blockUseCount >= player.blockRefreshThreshold) {
              player.isBlocking = false;
              player.blockTimer = 0;
              player.blockLockout = 18; // Universal 0.3s refresh lockout (18 frames)
              player.blockUseCount = 0;
              player.blockRefreshThreshold = Math.floor(Math.random() * 2) + 2;
              setIsPlayerBlocking(false);
            } else if (canFighterRaiseGuard(player)) {
              // Section 2.8: Attack Animation Block-Cancel (Feinting / Reflex Parries)
              const hadActivePunch = player.fists.some(f => f.isPunching && !f.isHeavy);
              if (hadActivePunch) {
                player.fists.forEach(f => {
                  f.isPunching = false;
                  f.punchProgress = 0;
                  f.lingerTimer = 0;
                  f.isLingerActive = false;
                  f.hasHit = false;
                });
                spawnFloatingText(player.x, player.y - 30, 'FEINT / CANCEL', '#38bdf8');
              }
              if (!player.isBlocking) {
                player.isBlocking = true;
                player.blockTimer = 0;
              }
              setIsPlayerBlocking(true);
            }
          }
        }}
        onBlockEnd={() => {
          const state = stateRef.current;
          state.isBlockInputHeld = false;
          const player = state.player;
          if (player) {
            player.isBlockInputHeld = false;
            if (player.isBlocking) {
              player.isBlocking = false;
              player.kyokushinBlockHitsTaken = 0;
              player.blockLockout = Math.max(player.blockLockout || 0, BLOCK_COOLDOWN_FRAMES);
              const isAfterParry = (player.afterParryGraceTimer || 0) > 0 || (player.parryFlashTime || 0) > 0 || (player.parryBlockGraceTimer || 0) > 0;
              if (player.styleId === 'capoeira' || isAfterParry) {
                player.postBlockAttackLockout = 0;
              } else {
                player.postBlockAttackLockout = 6; // Section 2.8: 0.10s Post-Block Action Delay
              }
            }
            setIsPlayerBlocking(false);
          }
        }}
        onDash={triggerPlayerDash}
        onTargetSwitch={handleTargetSwitch}
      />

      {/* LIVE IN-GAME HUD CUSTOMIZER (DIRECT ACTIVE SCREEN CONTROL MOVER & SCALER) */}
      {isLiveHudEditing && (
        <LiveHudEditor
          settings={settings}
          updateSettings={updateSettings}
          isPortrait={isPortrait}
          currentUser={currentUser}
          activeStyle={activeStyle}
          dummyStyle={dummyStyle}
          playerName={matchData?.isAiVsAiSpectator ? (matchData.opponent?.name || matchData.bot1Name || 'BOT 1') : 'YOU'}
          opponentName={matchData?.isAiVsAiSpectator ? (matchData.spectatorFighter2?.name || matchData.bot2Name || 'BOT 2') : matchData && matchData.isCompetitive ? `@${matchData.opponent.name}` : 'ENEMY'}
          playerHP={playerHP}
          playerMaxHP={playerMaxHP}
          dummyHP={dummyHP}
          dummyMaxHP={dummyMaxHP}
          playerArmor={playerArmor}
          playerStamina={playerStamina}
          onClose={() => {
            setIsLiveHudEditing(false);
            soundManager.playRollTick();
          }}
        />
      )}

      {/* PRACTICE DOJO HUB OVERLAY (IF RE-OPENED) */}
      {showModeSelector && (
        <PracticeDojoView
          stats={stats}
          updateStats={updateStats}
          onLaunchDojo={(data) => {
            setShowModeSelector(false);
            setIsPlaying(true);
            if (data.opponent?.styleId) setDummyStyleId(data.opponent.styleId);
            if ((data as any).dummyBehavior) setDummyBehavior((data as any).dummyBehavior);
            if ((data as any).playerStyleId) setPracticePlayerStyleId((data as any).playerStyleId);
            initGame();
          }}
          onClose={() => handleExitArena()}
          isNavHidden={isNavHidden}
        />
      )}

      {/* COMBAT HUD OVERLAY PANEL */}
      {isPlaying && !isDead && rankedState !== 'match_over' && !showModeSelector && (
        <div className="absolute inset-0 pointer-events-none z-10 p-1 sm:p-2 flex flex-col justify-between overflow-hidden">
          
          {/* IN-MATCH OVERLAYS & MODALS (Extracted to MatchOverlays) */}
          <MatchOverlays
            isPlaying={isPlaying}
            isDead={isDead}
            rankedState={rankedState}
            showModeSelector={showModeSelector}
            matchData={matchData}
            settings={settings}
            updateSettings={updateSettings}
            isTouchDevice={isTouchDevice}
            soundEnabled={soundEnabled}
            toggleSound={toggleSound}
            streak={streak}
            initGame={initGame}
            handleExitArena={handleExitArena}
            onBackToMenu={onBackToMenu}
            handleMatchDefeat={handleMatchDefeat}
            isOfflineMatch={isOfflineMatch}
            showMobileMenu={showMobileMenu}
            setShowMobileMenu={setShowMobileMenu}
            setShowFullSettings={setShowFullSettings}
            setIsLiveHudEditing={setIsLiveHudEditing}
            setShowHudEditor={setShowHudEditor}
            stateRef={stateRef}
            syncCombatStatesToUI={syncCombatStatesToUI}
            dummyBehavior={dummyBehavior}
            spectatorModalOpen={spectatorModalOpen}
            setSpectatorModalOpen={setSpectatorModalOpen}
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
            practicePlayerStyleId={practicePlayerStyleId}
            handleDevStyleChange={handleDevStyleChange}
          />


          


          {/* TOP FIGHTERS HUD & CUSTOMIZABLE HUD ELEMENTS (Extracted to FighterHealthBars) */}
          <FighterHealthBars
            settings={settings}
            isPortrait={isPortrait}
            isLiveHudEditing={isLiveHudEditing}
            matchData={matchData}
            activeStyle={activeStyle}
            dummyStyle={dummyStyle}
            playerHP={playerHP}
            playerMaxHP={playerMaxHP}
            playerRedHP={playerRedHP}
            playerArmor={playerArmor}
            playerArmorBreakTime={playerArmorBreakTime}
            playerStamina={playerStamina}
            playerIsSprinting={playerIsSprinting}
            playerSprintStrikerBuffer={playerSprintStrikerBuffer}
            playerDashCooldown={playerDashCooldown}
            playerCapoeiraStacks={playerCapoeiraStacks}
            playerCapoeiraExhausted={playerCapoeiraExhausted}
            playerActiveStatuses={playerActiveStatuses}
            dummyHP={dummyHP}
            dummyMaxHP={dummyMaxHP}
            dummyRedHP={dummyRedHP}
            dummyArmor={dummyArmor}
            dummyArmorBreakTime={dummyArmorBreakTime}
            dummyStamina={dummyStamina}
            dummyIsSprinting={dummyIsSprinting}
            dummyCapoeiraStacks={dummyCapoeiraStacks}
            dummyCapoeiraExhausted={dummyCapoeiraExhausted}
            dummyBehavior={dummyBehavior}
            dummyActiveStatuses={dummyActiveStatuses}
            playerScore={playerScore}
            opponentScore={opponentScore}
            roundNumber={roundNumber}
            roundTimeLeft={roundTimeLeft}
            rankedCountdown={rankedCountdown}
            rankedState={rankedState}
            sustainPlayerDamage={sustainPlayerDamage}
            sustainOpponentDamage={sustainOpponentDamage}
            potatoHolderState={potatoHolderState}
            potatoFuseLeft={potatoFuseLeft}
            playerHeavyCooldown={playerHeavyCooldown}
            stateRef={stateRef}
            setShowMobileMenu={setShowMobileMenu}
          />

        </div>
      )}

      {/* POST MATCH HUD OVERLAY (Ranked AI, Ranked Online PvP, Tournaments, Casual) */}
      {rankedState === 'match_over' && (
        <PostMatchHUD
          matchWinner={matchWinner}
          playerScore={playerScore}
          opponentScore={opponentScore}
          matchData={matchData}
          playerStats={stats}
          activeStyle={activeStyle}
          damageDealt={matchDamageDealt}
          damageTaken={matchDamageTaken}
          hitsLanded={matchHitsLanded}
          streak={matchData?.isAiMatch ? (stats.aiWins || 0) : (stats.winStreak || 0)}
          postMatchTimer={postMatchTimer}
          rematchRequested={rematchRequested}
          opponentRematchRequested={opponentRematchRequested}
          opponentDisconnected={opponentDisconnected}
          parriesLanded={matchParriesLandedRef.current}
          heaviesLanded={matchHeaviesLandedRef.current}
          lightsLanded={matchLightsLandedRef.current}
          rankedAiBreakdown={rankedAiBreakdown}
          roundReports={roundReports}
          totalSwings={totalSwings || stateRef.current.totalSwings || matchHitsLanded}
          playerFinalHp={stateRef.current.player?.health ?? (matchWinner === 'player' ? 70 : 0)}
          playerMaxHp={stateRef.current.player?.maxHealth ?? 100}
          matchDurationSec={Math.max(1, Math.round((Date.now() - matchStartTimeRef.current) / 1000))}
          guardBreaksLanded={matchGuardBreaksRef.current}
          onUpdateStats={updateStats}
          onVoteRematch={() => {
            soundManager.playRollTick();
            if (matchData && matchData.isRealMatch && matchData.socket && matchData.socket.readyState === WebSocket.OPEN) {
              setRematchRequested(true);
              matchData.socket.send(JSON.stringify({
                type: 'vote_rematch',
                vote: true
              }));
            } else {
              setRematchRequested(true);
              setTimeout(() => setOpponentRematchRequested(true), 1500);
              setTimeout(() => {
                setPlayerScore(0);
                setOpponentScore(0);
                setRoundNumber(1);
                setMatchWinner(null);
                setMatchDamageDealt(0);
                matchLightsLandedRef.current = 0;
                matchHeaviesLandedRef.current = 0;
                matchParriesLandedRef.current = 0;
                matchBlockedStrikesRef.current = 0;
                matchM1ChainsRef.current = 0;
                matchDamageDealtRef.current = 0;
                setMatchDamageTaken(0);
                setMatchHitsLanded(0);
                roundReportsRef.current = [];
                setRoundReports([]);
                setRankedAiBreakdown(null);
                roundDamageDealtRef.current = 0;
                roundDamageTakenRef.current = 0;
                roundLightsLandedRef.current = 0;
                roundHeaviesLandedRef.current = 0;
                roundParriesLandedRef.current = 0;
                roundStartTimeRef.current = Date.now();
                setRematchRequested(false);
                setOpponentRematchRequested(false);
                setRankedState('countdown');
                setRankedCountdown(3);
                initGame();
              }, 2500);
            }
          }}
          onLeaveMatch={() => handleExitArena()}
          onNextAiOpponent={() => {
            soundManager.playLevelUp();
            const aiNames = [
              'Kurogane_AI', 'Iron_Lotus', 'Viper_Protocol', 'Shadow_Striker', 'Titan_Brawler',
              'Cyber_Baku', 'Ghost_Feather', 'Ronin_Zero', 'Apex_Predator', 'Volt_Haymaker',
              'Zenith_Striker', 'Ryu_Nomad', 'Omega_Knee', 'Blaze_Tengu', 'Aegis_Champion'
            ];
            const randomName = aiNames[Math.floor(Math.random() * aiNames.length)];
            const randomStyle = FIGHTING_STYLES[Math.floor(Math.random() * FIGHTING_STYLES.length)];
            const randomHeight = 62 + Math.floor(Math.random() * 21); // 62 to 82 inches (5'2" - 6'10")
            
            if (matchData) {
              matchData.opponent = {
                id: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                name: randomName,
                heightInInches: randomHeight,
                style: randomStyle,
                elo: Math.max(100, (stats.aiElo || 100) + Math.floor(Math.random() * 80) - 40),
                ping: 0,
                aiDifficulty: matchData.aiDifficulty || 'silver'
              };
            }

            setPlayerScore(0);
            setOpponentScore(0);
            setRoundNumber(1);
            setMatchWinner(null);
            setMatchDamageDealt(0);
            matchLightsLandedRef.current = 0;
            matchHeaviesLandedRef.current = 0;
            matchParriesLandedRef.current = 0;
            matchBlockedStrikesRef.current = 0;
            matchM1ChainsRef.current = 0;
            matchDamageDealtRef.current = 0;
            setMatchDamageTaken(0);
            setMatchHitsLanded(0);
            roundReportsRef.current = [];
            setRoundReports([]);
            setRankedAiBreakdown(null);
            roundDamageDealtRef.current = 0;
            roundDamageTakenRef.current = 0;
            roundLightsLandedRef.current = 0;
            roundHeaviesLandedRef.current = 0;
            roundParriesLandedRef.current = 0;
            roundStartTimeRef.current = Date.now();
            setRematchRequested(false);
            setOpponentRematchRequested(false);
            setRankedState('countdown');
            setRankedCountdown(3);
            initGame();
          }}
          onGoToGacha={onBackToMenu}
          onOpenCodex={() => setShowCodex(true)}
          onSendChatMessage={(text) => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setMatchChatMessages(prev => [...prev.slice(-40), {
              sender: 'You',
              text,
              time: timeStr,
              isSelf: true
            }]);
            if (matchData && matchData.isRealMatch && matchData.socket && matchData.socket.readyState === WebSocket.OPEN) {
              matchData.socket.send(JSON.stringify({
                type: 'chat_message',
                text,
                senderId: matchData.isPlayer1 ? 'p1' : 'p2',
                senderName: 'You'
              }));
            }
          }}
          chatMessages={matchChatMessages}
          hudScale={settings.hudScale}
        />
      )}

      {/* BUILT-IN SIDE-DOCKED AI TRAINING HUD */}
      <TrainingDrawer
        show={!matchData?.isCompetitive && !matchData?.isAiMatch && !matchData?.isAiVsAiSpectator && isPlaying && !isDead && !showModeSelector}
        isTrainingHudOpen={isTrainingHudOpen}
        setIsTrainingHudOpen={setIsTrainingHudOpen}
        trainingHudTab={trainingHudTab}
        setTrainingHudTab={setTrainingHudTab}
        practicePlayerStyleId={practicePlayerStyleId}
        onPracticePlayerStyleChange={handlePracticePlayerStyleChange}
        practicePlayerHeightInInches={practicePlayerHeightInInches}
        onPracticePlayerHeightChange={handlePracticePlayerHeightChange}
        isNavHidden={isNavHidden}
        dummyStyleId={dummyStyleId}
        onDummyStyleChange={handleDummyStyleChange}
        dummyBehavior={dummyBehavior}
        onDummyBehaviorChange={(tier) => {
          setDummyBehavior(tier as any);
          if (stateRef.current.dummy) {
            stateRef.current.dummy.behavior = tier as any;
            stateRef.current.dummy.isBlocking = (tier === 'active_guard_sentient' || tier === 'active_guard_mindless' || tier === 'block');
            stateRef.current.dummy.mindlessAngleSet = false;
            stateRef.current.dummy.decisionTimer = tier === 'amethyst' ? 2 : tier === 'diamond' ? 5 : 10;
          }
          soundManager.playRollTick();
        }}
        dummyM1Speed={dummyM1Speed}
        onDummyM1SpeedChange={setDummyM1Speed}
        dummyFollow={dummyFollow}
        onDummyFollowChange={(val) => {
          const next = typeof val === 'function' ? val(dummyFollow) : val;
          setDummyFollow(next);
          stateRef.current.dummyFollow = next;
          soundManager.playRollTick();
        }}
        dummyHeightInInches={dummyHeightInInches}
        onDummyHeightChange={handleDummyHeightChange}
        godMode={godMode}
        setGodMode={setGodMode}
        infiniteStamina={infiniteStamina}
        setInfiniteStamina={setInfiniteStamina}
        infiniteAIStamina={infiniteAIStamina}
        setInfiniteAIStamina={setInfiniteAIStamina}
        oneHitKODummy={oneHitKODummy}
        setOneHitKODummy={setOneHitKODummy}
        onRefreshM1Sequence={handleRefreshM1Sequence}
        onResetM2Cooldown={handleResetM2Cooldown}
        totalDamageDealt={totalDamageDealt}
        totalHitsLanded={totalHitsLanded}
        showHitboxes={showHitboxes}
        setShowHitboxes={setShowHitboxes}
        totalDamageTaken={totalDamageTaken}
        totalSwings={totalSwings}
        totalParries={totalParries}
        totalBlocks={totalBlocks}
        maxCombo={maxCombo}
        opponentDistance={opponentDistance}
        playerCombatState={playerCombatState}
        dummyCombatState={dummyCombatState}
        freezeAI={freezeAI}
        setFreezeAI={(val) => {
          setFreezeAI(val);
          stateRef.current.freezeAI = typeof val === 'function' ? val(stateRef.current.freezeAI || false) : val;
        }}
        onCenterDummy={handleCenterDummy}
        onClearTelemetry={handleClearTelemetry}
        onResetTrainingSession={handleResetTrainingSession}
        onExitArena={handleExitArena}
        getStyleRarityColor={getStyleRarityColor}
        gameSpeed={simulationSpeed}
        onGameSpeedChange={handleGameSpeedChange}
      />

      {/* FULL SETTINGS MODAL */}
      {showFullSettings && (
        <SettingsView
          settings={settings}
          updateSettings={updateSettings}
          onClose={() => setShowFullSettings(false)}
          onOpenHudEditor={() => {
            setShowFullSettings(false);
            setShowMobileMenu(false);
            setIsLiveHudEditing(true);
          }}
        />
      )}

      {/* HUD EDITOR MODAL */}
      {showHudEditor && (
        <HudEditorModal
          settings={settings}
          updateSettings={updateSettings}
          onClose={() => setShowHudEditor(false)}
        />
      )}

      {/* CODEX MODAL */}
      {showCodex && (
        <CodexModal
          isOpen={showCodex}
          onClose={() => setShowCodex(false)}
          equippedStyleId={stats.selectedStyleId}
          isNavHidden={isNavHidden}
          isInsideArena={true}
          onEquipStyle={(styleId) => {
            updateStats({ selectedStyleId: styleId });
            handlePracticePlayerStyleChange(styleId);
          }}
          onTestInDojo={(styleId) => {
            updateStats({ selectedStyleId: styleId });
            handlePracticePlayerStyleChange(styleId);
            setShowCodex(false);
          }}
        />
      )}

          </div>
  );
}