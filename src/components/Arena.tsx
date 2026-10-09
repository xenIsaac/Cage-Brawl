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
import HudEditorModal from './HudEditorModal';
import LiveHudEditor from './LiveHudEditor';
import { StatusBar, ActiveStatusItem, extractFighterStatuses } from './StatusBar';
import { SettingsModal } from './SettingsModal';
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
import { QuestTracker } from '../utils/questTracker';
import { OfflineQuestManager } from '../data/offlineQuests';
import { CareerMilestoneManager } from '../data/careerMilestones';
import { isMobileDevice } from '../utils/deviceDetection';
import { drawArenaFloor as drawArenaFloorModule, renderParticlesAndTexts as renderParticlesAndTextsModule } from '../combat/renderArena';
import { drawFighter as drawFighterModule, getFighterVisualTransform } from '../combat/renderFighter';
import { updateFighterAI as updateFighterAIModule } from '../combat/ai';
import { getCapoeiraKickEase, getFistRelativePos, getClampedFistPos } from '../combat/fistIK';
import { checkDirectionalBlock } from '../combat/blockEngine';
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
  HITSTUN_FRAMES,
  HIT_ATTACK_LOCKOUT_FRAMES
} from '../combat/combatEngine';
import { ModeSelectorOverlay } from './arena/ModeSelectorOverlay';
import { SpectatorChamberModal } from './arena/SpectatorChamberModal';
import { TrainingDrawer } from './arena/TrainingDrawer';
import { drawHitboxOverlay } from '../combat/hitboxOverlay';
import { getStrikeHitboxInfo } from '../combat/hitboxCalculator';
import { 
  triggerSluggerImpactFrame, 
  triggerSluggerBlockImpactFrame,
  triggerKyokushinImpactFrame,
  updateImpactFrame, 
  isImpactFrameActive, 
  renderImpactFrameBackground, 
  renderImpactFrameForeground 
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

  const getMatchModeKey = (): 'ranked_pvp' | 'unranked_pvp' | 'ranked_ai' | 'unranked_ai' => {
    if (matchData?.isAiMatch) {
      return (matchData.aiModeType === 'ranked' || matchData.aiModeType === 'tournament') ? 'ranked_ai' : 'unranked_ai';
    }
    return matchData?.isCompetitive ? 'ranked_pvp' : 'unranked_pvp';
  };
  
  // Game states
  const [isPlaying, setIsPlaying] = useState(() => !!matchData);
  const [showModeSelector, setShowModeSelector] = useState(() => !matchData);
  const [dummyBehavior, setDummyBehavior] = useState<string>(() => (matchData as any)?.isTestGame ? 'idle' : 'passive');
  const [dummyM1Speed, setDummyM1Speed] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [dummyFollow, setDummyFollow] = useState<boolean>(false);
  const [dummyStyleId, setDummyStyleId] = useState<string>('basic');
  const [dummyHeightInInches, setDummyHeightInInches] = useState<number>(70);
  const [infiniteStamina, setInfiniteStamina] = useState(false);
  const [oneHitKODummy, setOneHitKODummy] = useState(false);
  const [godMode, setGodMode] = useState<boolean>(false);
  const [infiniteAIStamina, setInfiniteAIStamina] = useState<boolean>(false);
  const [isTrainingHudOpen, setIsTrainingHudOpen] = useState<boolean>(true);
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
  const [showControlsHelp, setShowControlsHelp] = useState(true);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showHudEditor, setShowHudEditor] = useState<boolean>(false);
  const [isLiveHudEditing, setIsLiveHudEditing] = useState<boolean>(() => !!(matchData as any)?.startWithLiveHud);
  const [showFullSettings, setShowFullSettings] = useState<boolean>(false);

  const isLiveHudEditingRef = useRef(false);
  isLiveHudEditingRef.current = isLiveHudEditing;

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [isPortrait, setIsPortrait] = useState(() => typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false);

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
  const [practicePlayerStyleId, setPracticePlayerStyleId] = useState<string>(() => stats.selectedStyleId || 'basic');
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
        // Simulation speed locked at base 1.0x
        const speedMultiplier = 1.0;
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

  const isFighterInIFrames = (target: (Fighter & { heavyWindup?: number; isDashing?: boolean }) | null | undefined): boolean => {
    if (!target) return false;
    const isAshiharaFlowSweep = target.styleId === 'ashihara' && target.fists.some(f => f.isPunching && !f.isHeavy && f.comboStage === 3);
    const isCapoeiraS3Dodge = target.styleId === 'capoeira' && target.fists.some(f => f.isPunching && !f.isHeavy && f.comboStage === 2);
    const isHeavyPunching = target.fists.some(f => (f.isPunching || f.punchProgress > 0) && f.isHeavy);
    const isWindupIFrameStyle = target.styleId === 'basic';
    const isStrikeIFrameStyle = target.styleId === 'shotokan' || target.styleId === 'capoeira';

    const isFlowSprintSway = target.styleId === 'basic' && !!target.flowSprintSwayActive;
    const isFlowS2IFrame = target.styleId === 'basic' && !!target.flowS2HasIFrames && target.fists.some(f => f.isPunching && !f.isHeavy && f.comboStage === 1);

    return !!(
      (isWindupIFrameStyle && (target.heavyWindup || 0) > 0) ||
      (isStrikeIFrameStyle && isHeavyPunching) ||
      isAshiharaFlowSweep ||
      isCapoeiraS3Dodge ||
      isFlowSprintSway ||
      isFlowS2IFrame
    );
  };

  const applyFighterHit = (
    attacker: Fighter & { comboStage?: number; heavyWindup?: number; kickboxingAutoSeq2Timer?: number },
    defender: Fighter & { isBlocking?: boolean; armorHP?: number; armorBreakTime?: number; damageFlashTime?: number; concussTime?: number; isDashing?: boolean; armorRegenLockout?: number },
    isHeavy: boolean,
    comboStage?: number,
    strikePos?: { x: number; y: number }
  ) => {
    if (defender.isDead || (attacker.parriedStun && attacker.parriedStun > 0)) return;
    // Section 2.8: You cannot hit anyone or initiate attacks during dash duration
    if (attacker.isDashing || (attacker.dashProgress && attacker.dashProgress > 0)) return;

    // Ashihara Karate Sabaki Tsukami Counter (3-Stage M2 System):
    // Mawashi Uke active parry stance takes TOP PRIORITY when hit so it never gets misidentified as a dodge!
    if (defender.styleId === 'ashihara' && (defender.ashiharaM2Stage === 2 || defender.ashiharaM2Stage === 3 || (defender.parryFlashTime || 0) > 0)) {
      // Mid-counter sequence invulnerability: deflect incoming attack without resetting counter state
      spawnFloatingText(defender.x, defender.y - 30, 'SABAKI DEFLECTION!', '#1d4ed8');
      soundManager.playParry();
      return;
    }

    // Aikido Passive: Kinetic Intercept (Clash Counter Slam)
    // Clashing/intersecting your M1 hitbox with an incoming enemy hitbox has a 30% Chance to automatically trigger Over-Head Counter Slam (10 DMG).
    // M1 S3 (Tenkan Arm-Cross) is strictly excluded.
    const activeDefenderM1 = defender.fists.find(f => (f.isPunching || f.punchProgress > 0.05) && !f.isHeavy);
    const defenderM1Stage = activeDefenderM1 ? (activeDefenderM1.comboStage ?? (defender.comboStage === 0 ? 3 : (defender.comboStage - 1))) : -1;
    if (defender.styleId === 'aikido' && !isHeavy && activeDefenderM1 && defenderM1Stage !== 2) {
      if (Math.random() < 0.30) {
        attacker.parryFlashTime = 18;
        attacker.stunTime = 30;
        attacker.heavyWindup = 0;
        attacker.fists.forEach(f => { f.isPunching = false; f.punchProgress = 0; });
        soundManager.playParry();
        spawnFloatingText(defender.x, defender.y - 35, 'KINETIC INTERCEPT! (10 DMG CLASH SLAM)', '#0284c7');

        defender.aikiSlamStage = 'clamp';
        defender.aikiSlamDamage = 10.0;
        defender.aikiSlamTimer = 90;
        defender.aikiSlamFrame = 0;
        defender.aikiSlamBaseAngle = defender.facingAngle;
        defender.aikiSlamTarget = attacker;
        defender.aikiIsFreeSlam = true;
        defender.aikiSlamUninterruptible = true;
        attacker.aikiSlamUninterruptible = true;
        attacker.aikiSlamVictimStage = 'clamp';
        attacker.aikiOverheadScale = 1.0;
        defender.vx = 0; defender.vy = 0;
        attacker.vx = 0; attacker.vy = 0;
        defender.fists.forEach(f => { f.isPunching = false; f.punchProgress = 0; });
        attacker.fists.forEach(f => { f.isPunching = false; f.punchProgress = 0; });
        stateRef.current.hitstopTime = 3;
        syncCombatStatesToUI();
        return; // Deflect & Counter Slam!
      }
    }

    if (defender.styleId === 'ashihara' && ((defender.heavyWindup && defender.heavyWindup > 0) || defender.ashiharaM2Stage === 1)) {
      if (defender.isPlayer) {
        matchParriesLandedRef.current += 1;
        roundParriesLandedRef.current += 1;
        QuestTracker.trackEvent(userEmail, {
          type: 'parry',
          mode: getMatchModeKey()
        });
      }
      defender.parryFlashTime = 18;
      defender.parryBlockGraceTimer = 90;
      defender.afterParryGraceTimer = 90;
      defender.postBlockAttackLockout = 0;
      defender.strikeCooldown = 0;
      
      // Interrupt attacker's active lunge/attack
      const isLightPunchingAshi = attacker.fists.some(f => f.isPunching && !f.isHeavy);
      const wasAttackerHeavy = !isLightPunchingAshi && (isHeavy || (attacker.heavyWindup && attacker.heavyWindup > 0) || (attacker.styleId === 'keysi' && (attacker.keysiClinchStage !== null || (attacker.heavyWindup && attacker.heavyWindup > 0))));
      if (wasAttackerHeavy) {
        applyHeavyWhiffPenalty(attacker);
      }
      attacker.heavyWindup = 0;
      attacker.keysiClinchStage = null;
      attacker.keysiClinchTarget = null;
      attacker.keysiM2Primed = false;
      attacker.fists.forEach(f => {
        f.isPunching = false;
        f.punchProgress = 0;
        f.isHeavy = false;
      });
      
      // Pull attacker close to the defender (Tsukami Drag)
      const pullDist = defender.radius + attacker.radius + 8;
      const pullAngle = Math.atan2(attacker.y - defender.y, attacker.x - defender.x);
      attacker.x = defender.x + Math.cos(pullAngle) * pullDist;
      attacker.y = defender.y + Math.sin(pullAngle) * pullDist;
      
      // Strip guard from attacker immediately
      attacker.isBlocking = false;
      attacker.blockLockout = 51;
      attacker.stunTime = 51;
      attacker.parriedStun = 51;
      attacker.strikeCooldown = 51;
      attacker.parryLockoutTimer = 60; // 1s (60 frames) Parry Disable Passive
      spawnFloatingText(attacker.x, attacker.y - 45, 'PARRY DISABLED (1s)', '#ef4444');

      // Calculate Stage 2 Tsukami Drag Damage: 3.0 HP base * 0.90 power modifier = 2.7 Net HP
      const ashiharaMods = getHeightModifiers(defender.baseHeight);
      const s2Dmg = Math.round(3.0 * ashiharaMods.damageFactor * 0.90 * 10) / 10;
      if (matchData?.gamemode !== 'sustain_attack' && matchData?.gamemode !== 'hot_potato') {
        attacker.health = Math.max(0, attacker.health - s2Dmg);
      }
      attacker.damageFlashTime = 12;
      applyDamageCombatLocks(attacker);

      // Enter M2 S2 (Tsukami Drag): 0.15s (9 frames transition)
      defender.ashiharaM2Stage = 2;
      defender.ashiharaM2Timer = 9;
      defender.heavyWindup = 0;
      defender.heavyCooldown = 0; // Sabaki Counter-Loop instant refund

      // Effects, Hit-Stop & Floating Text
      soundManager.playParry();
      soundManager.playDash();
      stateRef.current.shakeAmount = 8 * settings.screenShake;
      
      spawnFloatingText(attacker.x, attacker.y - 25, `-${s2Dmg} HP`, '#facc15');
      
      // Spawn blue & gold spark particles at wrist grab point
      for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 2;
        stateRef.current.particles.push({
          id: `ashihara_grab_${Math.random()}`,
          x: (defender.x + attacker.x) / 2,
          y: (defender.y + attacker.y) / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: Math.random() * 3.5 + 2,
          color: i % 2 === 0 ? '#1d4ed8' : '#facc15',
          alpha: 1.0,
          life: 0,
          maxLife: 35,
          type: 'spark'
        });
      }
      
      syncCombatStatesToUI();
      return; // Damage completely nullified & Mawashi Uke deflection executed!
    }

    if (defender.styleId === 'boxing_shell' && ((defender.heavyWindup && defender.heavyWindup > 0) || defender.fists.some(f => f.isPunching && f.isHeavy))) {
      // Iron Boxing M2 Parry: Triggered when hit by opponent during M2 Shoulder Roll!
      // Cannot be parried by attacker. Redirects attacker's strike with the shoulder, spins them out for 1.5s, and grants 2x posture boost.
      if (defender.isPlayer) {
        matchParriesLandedRef.current += 1;
        roundParriesLandedRef.current += 1;
        stateRef.current.totalParries = (stateRef.current.totalParries || 0) + 1;
        setTotalParries(stateRef.current.totalParries);
        QuestTracker.trackEvent(userEmail, {
          type: 'parry',
          mode: getMatchModeKey()
        });
      }
      defender.parryFlashTime = 18;
      defender.parryBlockGraceTimer = 90;
      defender.afterParryGraceTimer = 90;
      defender.postBlockAttackLockout = 0;
      defender.strikeCooldown = 0;

      // Interrupt attacker's active lunge/attack
      const isLightPunchingShell = attacker.fists.some(f => f.isPunching && !f.isHeavy);
      const wasAttackerHeavy = !isLightPunchingShell && (isHeavy || (attacker.heavyWindup && attacker.heavyWindup > 0) || (attacker.styleId === 'keysi' && (attacker.keysiClinchStage !== null || (attacker.heavyWindup && attacker.heavyWindup > 0))));
      if (wasAttackerHeavy) {
        applyHeavyWhiffPenalty(attacker);
      }
      attacker.heavyWindup = 0;
      attacker.keysiClinchStage = null;
      attacker.keysiClinchTarget = null;
      attacker.keysiM2Primed = false;
      attacker.fists.forEach(f => {
        f.isPunching = false;
        f.punchProgress = 0;
        f.isHeavy = false;
        f.hasHit = false;
      });
      if (attacker.isDashing) {
        attacker.isDashing = false;
        attacker.dashProgress = 0;
      }

      // Conclude defender's M2 as a successful parry counter
      defender.heavyWindup = 0;
      defender.fists.forEach(f => {
        f.isPunching = false;
        f.punchProgress = 0;
        f.isHeavy = false;
        f.hasHit = false;
      });
      defender.heavyCooldown = 360; // 6.0s Hit Cooldown

      // Pull attacker close / redirect trajectory
      const dx = attacker.x - defender.x;
      const dy = attacker.y - defender.y;
      const dist = Math.hypot(dx, dy) || 1;
      const closeDist = defender.radius + attacker.radius + 8;
      attacker.x = defender.x + (dx / dist) * closeDist;
      attacker.y = defender.y + (dy / dist) * closeDist;
      attacker.vx = (dx / dist) * 2.0;
      attacker.vy = (dy / dist) * 2.0;

      // Stagger effect on attacker (1.5s hitstun, lockout)
      attacker.shellSpinTimer = 0;
      attacker.stunTime = Math.max(attacker.stunTime || 0, 90);
      attacker.strikeCooldown = Math.max(attacker.strikeCooldown || 0, 90);
      attacker.shellLockoutTimer = 90;
      attacker.damageFlashTime = 10;
      attacker.isBlocking = false;
      attacker.blockLockout = 60;

      // Defender gets 2x Posture Recovery Boost (3.0s)
      defender.shellPostureBoostTimer = 180;

      // Sound & Screen FX
      soundManager.playParry();
      soundManager.playRollTick();
      stateRef.current.hitstopTime = 3;
      stateRef.current.shakeAmount = 8 * settings.screenShake;

      spawnFloatingText(attacker.x, attacker.y - 35, 'SHOULDER DEFLECTED & STAGGERED (1.5s)', '#d946ef');
      spawnFloatingText(defender.x, defender.y - 35, 'POSTURE RECOVERY BOOST 2X (3.0s)', '#d946ef');

      // Purple/silver spark particles burst at impact
      for (let i = 0; i < 14; i++) {
        const angle = (i / 14) * Math.PI * 2;
        const speed = Math.random() * 3.5 + 1.5;
        stateRef.current.particles.push({
          id: `shell_m2_parry_${Math.random()}`,
          x: (defender.x + attacker.x) / 2,
          y: (defender.y + attacker.y) / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: Math.random() * 2.5 + 1.5,
          color: i % 2 === 0 ? '#a855f7' : '#c0c0c0',
          alpha: 1.0,
          life: 0,
          maxLife: 24,
          type: 'spark'
        });
      }

      syncCombatStatesToUI();
      return; // Damage completely nullified & Shoulder deflection parry executed!
    }

    // Check I-Frame dodge next!
    // Street Boxing: Slip Drive (Heavy M2 initiation dash & strike natively grant built-in I-Frames)
    // Shotokan: Ushiro-Mawashi-Geri (Spinning hook kick grants built-in I-Frames during spin & kick)
    // Capoeira: Meia Lua de Compasso (Helicopter sweep grants built-in I-Frames during active sweep execution)
    // Ashihara: Kake-Uke Parry Stance & Flow Sweep grant built-in I-Frames
    // Street Taekwondo: S3 Stance Switch Kick & Counter-Bait grant built-in I-Frames
    const isIFrameDashing = isFighterInIFrames(defender);

    if (isIFrameDashing) {
      if (defender.isPlayer) {
        QuestTracker.trackEvent(userEmail, {
          type: 'dodge',
          mode: getMatchModeKey()
        });
      }
      soundManager.playDash(); // play dodge swoosh
      spawnFloatingText(defender.x, defender.y - 30, 'DODGED!', '#38bdf8');
      
      // Trigger Passives on Successful Dodge:
      if (defender.styleId === 'basic') {
        defender.hasReflexPivot = true;
      }
      if (defender.styleId === 'slugger') {
        defender.hasKineticCounter = true;
      }

      // Attacker whiff penalty when heavy attack is dodged by i-frames
      if (isHeavy) {
        applyHeavyWhiffPenalty(attacker);
      } else if (attacker.styleId === 'capoeira' && !attacker.capoeiraWhiffBonusActive) {
        attacker.capoeiraWhiffBonusActive = true;
      }
      syncCombatStatesToUI();

      // Spawn beautiful blue sparkle particles
      const state = stateRef.current;
      for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2 + 1;
        state.particles.push({
          id: `dodge_spark_${Math.random()}`,
          x: defender.x,
          y: defender.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: Math.random() * 2.5 + 1.5,
          color: '#38bdf8',
          alpha: 1.0,
          life: 0,
          maxLife: 20,
          type: 'spark'
        });
      }
      return; // Immune to hit!
    }

    const prevConcuss = defender.concussTime || 0;
    const prevCripple = defender.crippleTime || 0;
    const prevArmorBreak = defender.armorBreakTime || 0;

    // DIRECTIONAL BLOCK ENGINE EVALUATION:
    // Block only protects within the designated arc in front.
    // Flank / back-dash attacks outside the arc bypass guard entirely and deal full direct damage.
    const blockCheck = checkDirectionalBlock(defender, attacker, strikePos);
    const isStreetBoxingUnbreakable = isStreetBoxingFlurryUnparryable(attacker, isHeavy);
    const isEffectivelyBlocked = isStreetBoxingUnbreakable ? false : blockCheck.isBlocked;

    // PERFECT PARRY SYSTEM CHECK:
    // Base Perfect Parry window: 0.19s (190ms).
    // Iron Guard (Muay Thai): extends Perfect Parry window by +0.20s (so 0.0s to 0.39s)
    const blockTimeSec = (defender.blockTimer || 0) / 60;
    const maxParryWindow = defender.styleId === 'muay_thai' ? (PERFECT_PARRY_WINDOW_SEC + 0.20) : PERFECT_PARRY_WINDOW_SEC;
    const isCqcM2Unparriable = attacker.styleId === 'cqc' && attacker.cqcM2Stage === 'assault';
    const canParry = (!defender.parryLockoutTimer || defender.parryLockoutTimer <= 0) && (!defender.keysiVulnerableTimer || defender.keysiVulnerableTimer <= 0) && !isCqcM2Unparriable && !(attacker.styleId === 'basic' && comboStage === 3 && attacker.flowS3ParryBaited) && !isStreetBoxingUnbreakable;
    const isParry = isEffectivelyBlocked && blockTimeSec >= 0.0 && blockTimeSec <= maxParryWindow && canParry;

    if (isParry) {
      // In online PvP or local game, debounce rapid duplicate collision triggers across single animation frames
      const now = performance.now();
      if (now - lastParryTimestampRef.current < 45) {
        return;
      }
      lastParryTimestampRef.current = now;

      // PARRY ACTION TRIGGERED!
      if (defender.isPlayer) {
        matchParriesLandedRef.current += 1;
        roundParriesLandedRef.current += 1;
        stateRef.current.totalParries = (stateRef.current.totalParries || 0) + 1;
        setTotalParries(stateRef.current.totalParries);
        QuestTracker.trackEvent(userEmail, {
          type: 'parry',
          mode: getMatchModeKey()
        });
      }
      defender.parryFlashTime = 18; // 0.3s visual gold-shine glow duration
      defender.parryBlockGraceTimer = 90; // Post-parry grace window allowing instant counter-attack
      defender.afterParryGraceTimer = 90; // 1.5s post-parry grace window removing basic attack post-block delay
      defender.postBlockAttackLockout = 0;
      defender.strikeCooldown = 0;
      defender.blockLockout = 0; // 0s block lockout for continuous chain parrying
      defender.parryLockoutTimer = 0; // 0s parry lockout - parry constantly without destruction
      defender.blockTimer = 0; // Reset block timer to 0 so defender re-enters fresh Perfect Parry window immediately
      defender.blockUseCount = 0; // Successful parry resets block tap count
      
      if (defender.styleId === 'street_boxing') {
        defender.streetBoxingCounterSurge = true;
        spawnFloatingText(defender.x, defender.y - 25, 'SNAPPING COUNTER (+80% SPEED)', '#22c55e');
      } else if (defender.styleId === 'boxing_shell') {
        if (defender.postureCd && defender.postureCd > 0) {
          defender.postureCd = Math.round(defender.postureCd * 0.55);
        } else {
          defender.shellParryResetPending = true;
        }
        spawnFloatingText(defender.x, defender.y - 25, 'DEFLECTIVE RESET (-45%)', '#c0c0c0');
      } else if (defender.styleId === 'aikido') {
        defender.aikiCounterSlamWindow = 12; // 0.2s reaction window
        spawnFloatingText(defender.x, defender.y - 25, 'TENCHI COUNTER READY! (M1 SLAM)', '#38bdf8');
      }

      // Check Street Taekwondo Counter-Bait (0.8s I-Frames if parried during M2 initiation/spin-dash)
      // Check if the strike that was parried was a heavy / M2 attack
      const isAttackerHeavyAttack = !!(
        isHeavy ||
        attacker.fists.some(f => f.isHeavy) ||
        (attacker.heavyWindup && attacker.heavyWindup > 0) ||
        (attacker.styleId === 'kyokushin' && (attacker.kyokushinM2PeakHoldTimer || 0) > 0) ||
        (attacker.styleId === 'keysi' && (attacker.keysiClinchStage !== null || (attacker.heavyWindup && attacker.heavyWindup > 0))) ||
        (attacker.styleId === 'cqc' && attacker.cqcM2Stage !== null)
      );

      // Cancel attacker's active attack (light/heavy punches, windup, and Keysi clamp/clinch)
      attacker.heavyWindup = 0;
      attacker.keysiClinchStage = null;
      attacker.keysiClinchTarget = null;
      attacker.keysiM2Primed = false;
      attacker.attackLockedAngle = undefined;
      if (attacker.styleId === 'kyokushin') {
        attacker.kyokushinM2PeakHoldTimer = 0;
        attacker.kyokushinM2FreezeTimer = 0;
        attacker.kyokushinM2Stage = null;
      }
      attacker.fists.forEach(f => {
        f.isPunching = false;
        f.punchProgress = 0;
        f.isHeavy = false;
        f.lingerTimer = 0;
        f.isLingerActive = false;
        f.hasHit = true; // Mark all fists as hit so no other limb double-triggers collision
      });

      if (isAttackerHeavyAttack) {
        if (attacker.styleId === 'street_boxing') {
          attacker.streetBoxingM2Stage = 0;
          attacker.streetBoxingM2Hits = 0;
          attacker.streetBoxingUnbreakable = false;
          attacker.streetBoxingM2NextTimer = 0;
        } else if (attacker.styleId === 'kickboxing') {
          attacker.kickboxingIsSeq2 = false;
          attacker.kickboxingSeq2Ready = false;
          attacker.kickboxingSeq2Window = 0;
          attacker.kickboxingAutoSeq2Timer = 0;
        }
        applyHeavyWhiffPenalty(attacker);
      }
      
      const pStun = attacker.styleId === 'keysi' ? 42 : 48;
      attacker.stunTime = 0; // Getting parried does NOT lock out Block input!
      attacker.parriedStun = pStun; // Staggers movement and attacks (48 frames = 0.8s)
      attacker.strikeCooldown = pStun; // Strike recoil lag
      attacker.hitMovementLock = pStun; // Staggers movement
      attacker.hitSteeringLock = pStun; // Staggers steering lock
      attacker.isBlocking = false;
      attacker.blockLockout = 0; // Retains ability to buffer or execute a Counter-Parry!

      // Counter-Parry handling: if defender was parried and lands a parry, break out of parried stun
      const isCounterParry = !!(defender.parriedStun && defender.parriedStun > 0);
      if (isCounterParry) {
        defender.parriedStun = 0;
      }

      // Perfect Parry: Zero Knockback on both defender and attacker
      attacker.vx = 0;
      attacker.vy = 0;
      defender.vx = 0;
      defender.vy = 0;

      // Play metallic parry chime audio hook
      soundManager.playParry();
      stateRef.current.shakeAmount = 8 * settings.screenShake;

      spawnFloatingText(defender.x, defender.y - 35, isCounterParry ? 'COUNTER-PARRY!' : 'PARRY!', '#facc15');

      // Spawn concentric perfect-parry visual shockwave rings
      stateRef.current.particles.push({
        id: `parry_ring_outer_${Math.random()}`,
        x: defender.x,
        y: defender.y,
        vx: 0,
        vy: 0,
        radius: 10,
        color: '#facc15', // Gold ring
        alpha: 1.0,
        life: 0,
        maxLife: 20,
        type: 'parry_ring'
      });

      stateRef.current.particles.push({
        id: `parry_ring_inner_${Math.random()}`,
        x: defender.x,
        y: defender.y,
        vx: 0,
        vy: 0,
        radius: 4,
        color: '#ffffff', // Hot white core ring
        alpha: 1.0,
        life: 0,
        maxLife: 14,
        type: 'parry_ring'
      });

      // Spawn bright high-velocity directional perfect-parry sparkle lines
      const sparkCount = 14;
      for (let i = 0; i < sparkCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 4.5; // Dynamic fast speed
        const isWhite = Math.random() < 0.35; // 35% hot white sparks
        stateRef.current.particles.push({
          id: `parry_spark_${Math.random()}`,
          x: defender.x,
          y: defender.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: Math.random() * 2 + 1.5,
          color: isWhite ? '#ffffff' : '#facc15',
          alpha: 1.0,
          life: 0,
          maxLife: Math.round(Math.random() * 15 + 15),
          type: 'spark'
        });
      }

      // Sync and terminate early - defender takes absolute ZERO damage or shield damage!
      syncCombatStatesToUI();
      return;
    }

    // Capoeira Esquiva Dodge Stack system:
    if (defender.styleId === 'capoeira' && isEffectivelyBlocked) {
      const stacks = defender.capoeiraDodgeStacks !== undefined ? defender.capoeiraDodgeStacks : 3;
      if (stacks > 0 && !defender.capoeiraExhausted) {
        defender.capoeiraDodgeStacks = stacks - 1;
        defender.capoeiraRegenTimer = 0;
        defender.capoeiraDodgeFlashTime = 16;
        soundManager.playDash();
        const state = stateRef.current;
        for (let i = 0; i < 8; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 3 + 2;
          state.particles.push({
            id: `capoeira_dodge_${Math.random()}`,
            x: defender.x,
            y: defender.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: Math.random() * 3 + 1.5,
            color: Math.random() < 0.5 ? '#ca8a04' : '#16a34a',
            alpha: 1.0,
            life: 0,
            maxLife: 25,
            type: 'spark'
          });
        }
        
        // Check Exhaustion penalty if all 3 consumed
        if (defender.capoeiraDodgeStacks === 0) {
          const dx = defender.x - attacker.x;
          const dy = defender.y - attacker.y;
          const dist = Math.hypot(dx, dy) || 1;
          const kbX = dx / dist;
          const kbY = dy / dist;
          
          defender.vx = kbX * 10;
          defender.vy = kbY * 10;
          
          defender.capoeiraExhausted = true;
          defender.capoeiraExhaustTimer = 60; // 1.0s unable to move/attack/block
          defender.strikeCooldown = Math.max(60, defender.strikeCooldown || 0); // 1.0s attack lockout
          defender.isBlocking = false;
          
          soundManager.playKO();
        }
        
        syncCombatStatesToUI();
        return; // Complete damage/chip nullification!
      } else {
        defender.isBlocking = false;
      }
    }

    // Aikido Passive: Aiki Redirection Stance (True 2-Hit Super Armor) hit absorption
    const isAikidoSuperArmor = defender.styleId === 'aikido' && Boolean(defender.aikiM2StanceTimer && defender.aikiM2StanceTimer > 0 && (defender.aikiM2SuperArmorHits || 0) > 0);
    if (isAikidoSuperArmor) {
      defender.aikiM2SuperArmorHits = Math.max(0, (defender.aikiM2SuperArmorHits || 1) - 1);
      soundManager.playParry();
      spawnFloatingText(defender.x, defender.y - 30, `SUPER ARMOR ABSORBED! (${defender.aikiM2SuperArmorHits} REMAINING)`, '#0284c7');
      defender.superArmorFlashTime = 24;
      defender.superArmorFlashMaxTime = 24;
    }

    // New Rule: NON I-Frame Heavy's get interrupted when hit!
    const isChargingOrExecutingHeavy = (defender.heavyWindup && defender.heavyWindup > 0) || 
                                       defender.fists.some(f => f.isPunching && f.isHeavy);
    if (isChargingOrExecutingHeavy) {
      // Kyokushin Karate M2 Buff: During the Windup, Kyokushin Karate will not get their M2 Interrupted but will still receive damage.
      const isKyokushinWindup = defender.styleId === 'kyokushin' && (defender.heavyWindup && defender.heavyWindup > 0);
      const isCqc = defender.styleId === 'cqc';
      // CQC: Only interruptible during the first 0.24s (14.4 frames) of windup (when heavyWindup > 75.6 of 90 frames); after cancel limit (<= 75.6 frames), dash, and assault, gains Super Armor
      const isCqcSuperArmor = isCqc && ((defender.cqcM2Stage === 'windup' && (defender.heavyWindup || 0) <= 75.6) || defender.cqcM2Stage === 'dash' || defender.cqcM2Stage === 'assault');
      const isShellSuperArmor = defender.styleId === 'boxing_shell' && ((defender.heavyWindup || 0) > 0 || defender.fists.some(f => f.isPunching && f.isHeavy));
      const isKeysiSuperArmor = defender.styleId === 'keysi' && !!defender.keysiHasSuperArmor;

      if (!isKyokushinWindup && !isCqcSuperArmor && !isShellSuperArmor && !isKeysiSuperArmor && !isAikidoSuperArmor) {
        if (defender.heavyWindup && defender.heavyWindup > 0) {
          applyHeavyWhiffPenalty(defender);
        }
        if (isCqc) {
          defender.cqcM2Stage = null;
          defender.cqcRings = undefined;
          defender.cqcLockedTarget = null;
          defender.cqcLockedAngle = undefined;
          spawnFloatingText(defender.x, defender.y - 30, 'CQC CANCELLED', '#ef4444');
        }
        defender.heavyWindup = 0;
        defender.fists.forEach(f => {
          f.isPunching = false;
          f.punchProgress = 0;
          f.isHeavy = false;
        });
        defender.strikeCooldown = Math.max(HIT_ATTACK_LOCKOUT_FRAMES, defender.strikeCooldown || 0);
      }
    }

    // Taking hits while holding block does NOT reset block timer, strictly preventing parrying while simply blocking

    // Update Stamina Engine & Sprint Striker Buffer (1.5s hit-buff window refreshed, or cleared on S4)
    const isS4Finisher = !isHeavy && comboStage === 3;
    onLandedHitStaminaUpdate(attacker as CombatFighter, isS4Finisher);

    // Standard Knockback push values (11 frames block recoil if blocked; direct hits receive full 0.45s HITSTUN_FRAMES)
    // True 2-Hit Super Armor: Completely immune to sudden stuns/staggers while Super Armor absorbs hit
    if (!isAikidoSuperArmor) {
      defender.stunTime = 11;
    } else {
      defender.stunTime = 0;
    }
    const dx = defender.x - attacker.x;
    const dy = defender.y - attacker.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const kbX = dx / dist;
    const kbY = dy / dist;

    // Calculate height damage scaling based on attacker height
    const attackerMods = getHeightModifiers(attacker.baseHeight);
    
    // Passives Damage Multipliers:
    // Glass Brawler (Slugger): +40% damage dealt, +15% damage taken
    // Iron Guard (Muay Thai): 5% incoming damage reduction
    // In-Fighting Precision (Shotokan): +10% damage at close proximity
    // Kyokushin Karate: +8% damage dealt, 10% incoming damage reduction
    let attackerDmgMult = 1.0;
    if (attacker.styleId === 'slugger') attackerDmgMult *= 1.4;
    if (attacker.styleId === 'kyokushin') {
      if (attacker.kyokushinBlockStoredPowerTimer && attacker.kyokushinBlockStoredPowerTimer > 0) {
        attackerDmgMult *= 1.05; // Bone-Crushing Attrition (+5% Overall Damage for 1.0s after exiting block)
      }
      if (isHeavy && attacker.kyokushinM2AbsorbedHits && attacker.kyokushinM2AbsorbedHits > 0) {
        attackerDmgMult *= (1.0 + 0.05 * attacker.kyokushinM2AbsorbedHits); // Super M2 Kinetic Absorption (+5% per absorbed hit)
      }
    }
    if (attacker.styleId === 'shotokan') {
      const hitDist = Math.hypot(attacker.x - defender.x, attacker.y - defender.y);
      if (hitDist <= 75) attackerDmgMult *= 1.10;
    }
    if (attacker.styleId === 'capoeira' && attacker.capoeiraWhiffBonusActive) {
      attackerDmgMult *= 1.20;
      attacker.capoeiraWhiffBonusActive = false;
    }
    if (attacker.styleId === 'basic' && !isHeavy && (attacker.flowStrikerBuffTimer || 0) > 0) {
      attackerDmgMult *= 1.10;
      attacker.flowStrikerBuffTimer = 0;
    }

    let defenderDmgMult = 1.0;
    const defenderHeightMods = getHeightModifiers(defender.baseHeight);
    if (defenderHeightMods.damageReduction > 0) {
      defenderDmgMult *= (1.0 - defenderHeightMods.damageReduction);
    }
    if (defender.styleId === 'slugger') defenderDmgMult *= 1.15;
    if (defender.styleId === 'muay_thai') defenderDmgMult *= 0.95;
    if (defender.styleId === 'kyokushin') {
      const dr = defender.kyokushinConditioningDR !== undefined ? defender.kyokushinConditioningDR : 0.10;
      defenderDmgMult *= (1.0 - dr); // Full-Contact Conditioning degrading armor DR (10% down to 0%)
      defender.kyokushinConditioningDR = Math.max(0, dr - 0.01); // Degrades by 1% per hit taken
      defender.kyokushinOutOfCombatTimer = 0;
    }
    if (attacker.styleId === 'kyokushin') {
      attacker.kyokushinOutOfCombatTimer = 0;
    }
    if (defender.styleId === 'aikido') {
      if (defender.aikiM2StanceTimer && defender.aikiM2StanceTimer > 0) {
        defenderDmgMult *= 0.85; // +15% Damage Resistance boost (x1.10 defense = 0.85 damage taken multiplier)
      } else {
        defenderDmgMult *= 1.05; // Soft physical profile (x0.95 defense = 1.05 damage taken multiplier)
      }
    }
    if (defender.keysiVulnerableTimer && defender.keysiVulnerableTimer > 0) defenderDmgMult *= 1.30; // Over-Extended Vulnerability (+30% DMG taken)
    if (attacker.boneFractureTimer && attacker.boneFractureTimer > 0 && !isHeavy) attackerDmgMult *= 0.40; // Bone Fracture (-60% M1 Damage penalty)

    // Aggressive Attrition (Muay Thai): Double chip damage across light sequence strikes
    const isMuayThai = attacker.styleId === 'muay_thai';
    const isSlugger = attacker.styleId === 'slugger';
    const isShotokan = attacker.styleId === 'shotokan';
    const chipMultiplier = (isMuayThai && !isHeavy) ? 2.0 : 1.0;

    let rawBaseDamage = isHeavy ? 10 : (comboStage === 3 ? 6 : 5);
    let rawChipDamage = (isHeavy ? 8 : (comboStage === 3 ? 1.5 : 1.0)) * chipMultiplier;

    if (isSlugger) {
      if (isHeavy) {
        rawBaseDamage = 16.0;
        rawChipDamage = 9.6; // +20% Increased Chip Damage on M2 Block
      } else {
        // Slugger 4-combo Sequence: S1: 6.5 HP, S2: 7.0 HP, S3: 7.5 HP, S4: 10.5 HP
        if (comboStage === 0) {
          rawBaseDamage = 6.5;
          rawChipDamage = 1.3;
        } else if (comboStage === 1) {
          rawBaseDamage = 7.0;
          rawChipDamage = 1.4;
        } else if (comboStage === 2) {
          rawBaseDamage = 7.5;
          rawChipDamage = 1.5;
        } else if (comboStage === 3) {
          rawBaseDamage = 10.5;
          rawChipDamage = 2.1;
        }
      }
    } else if (isShotokan) {
      if (isHeavy) {
        rawBaseDamage = 13.0; // Ushiro-Mawashi-Geri
        rawChipDamage = 8.0;
      } else {
        // Shotokan 4-Sequence Matrix:
        // S1 (Stage 0): Empi-Uchi (Elbow) 5.0 HP
        // S2 (Stage 1): Ren-Zuki Part 1 3.0 HP
        // S3 (Stage 2): Ren-Zuki Part 2 3.0 HP
        // S4 (Stage 3): Mae-Geri (Front Snap Kick) 7.0 HP
        if (comboStage === 0) {
          rawBaseDamage = 5.0;
          rawChipDamage = 1.0;
        } else if (comboStage === 1 || comboStage === 2) {
          rawBaseDamage = 3.0;
          rawChipDamage = 1.0;
        } else if (comboStage === 3) {
          rawBaseDamage = 7.0;
          rawChipDamage = 2.0;
        }
      }
    } else if (attacker.styleId === 'ashihara') {
      if (isHeavy) {
        // Ashihara heavy (M2) parry does not deal direct damage
        rawBaseDamage = 0.0;
        rawChipDamage = 0.0;
      } else {
        // Ashihara 4-Combo Light Strike Sequence:
        // S1 (Stage 0): Seiken Chudan Tsuki 4.0 HP, 0.8 Chip
        // S2 (Stage 1): Gedan Mawashi Geri 4.0 HP, 0.8 Chip
        // S3 (Stage 2): Chudan Kansetsu Geri 4.0 HP, 0.8 Chip
        // S4 (Stage 3): Ashibarai 5.0 HP, 1.0 Chip
        if (comboStage === 0 || comboStage === 1 || comboStage === 2) {
          rawBaseDamage = 4.0;
          rawChipDamage = 0.8;
        } else if (comboStage === 3) {
          rawBaseDamage = 5.0;
          rawChipDamage = 1.0;
        }
      }
    } else if (attacker.styleId === 'capoeira') {
      if (isHeavy) {
        rawBaseDamage = 16.0;
        rawChipDamage = 11.0; // Dynamic heavy chip
      } else {
        // Capoeira 4-Combo Light Strike Sequence:
        // S1 (Stage 0): Meia Lua de Frente 8.0 HP
        // S2 (Stage 1): Martelo 8.0 HP
        // S3 (Stage 2): Queixada 8.0 HP
        // S4 (Stage 3): Bênção 10.0 HP
        if (comboStage === 0 || comboStage === 1 || comboStage === 2) {
          rawBaseDamage = 8.0;
          rawChipDamage = 2.0;
        } else if (comboStage === 3) {
          rawBaseDamage = 10.0;
          rawChipDamage = 3.0;
        }
      }
    } else if (attacker.styleId === 'kickboxing') {
      if (isHeavy) {
        const activeFist = attacker.fists.find(f => f.isPunching);
        const isSeq2 = (activeFist as any)?.kickboxingSeq2 || attacker.kickboxingIsSeq2;
        if (isSeq2) {
          rawBaseDamage = 14.0;
          rawChipDamage = 14.4; // 80% Armor Chip
        } else {
          rawBaseDamage = 8.0;
          rawChipDamage = 3.6;  // 20% Armor Chip
        }
      } else {
        if (comboStage === 0 || comboStage === 1) {
          rawBaseDamage = 5.5;
          rawChipDamage = 1.0;
        } else if (comboStage === 2) {
          rawBaseDamage = 6.5;
          rawChipDamage = 1.2;
        } else if (comboStage === 3) {
          rawBaseDamage = 9.0;
          rawChipDamage = 2.0;
        }
      }
    } else if (attacker.styleId === 'kyokushin') {
      if (isHeavy) {
        rawBaseDamage = 10.0;
        rawChipDamage = 3.0;
        if (attacker.kyokushinBlockStoredPowerTimer && attacker.kyokushinBlockStoredPowerTimer > 0) {
          rawChipDamage *= 1.50; // Bone-Crushing Attrition (+50% Chip Damage)
        }
      } else {
        // Kyokushin Normalized 4-Combo Light Sequence (1.00x Baseline):
        // S1-S3: 5.0 HP, 1.0 Chip
        // S4: 7.5 HP, 1.5 Chip
        if (comboStage === 0 || comboStage === 1 || comboStage === 2) {
          rawBaseDamage = 5.0;
          rawChipDamage = 1.0;
        } else if (comboStage === 3) {
          rawBaseDamage = 7.5;
          rawChipDamage = 1.5;
        }
        if (attacker.kyokushinBlockStoredPowerTimer && attacker.kyokushinBlockStoredPowerTimer > 0) {
          rawChipDamage *= 1.50; // Bone-Crushing Attrition (+50% Chip Damage)
        }
      }
    } else if (attacker.styleId === 'keysi') {
      if (isHeavy) {
        // Pensador Elbow Clinch to Headbutt (14.0 HP Base, 7.0 Chip)
        rawBaseDamage = 14.0;
        rawChipDamage = 7.0;
      } else {
        // Keysi 4-Combo Sequence:
        // S1: Lead Forearm Wedge (4.5 HP, 2.2 Chip)
        // S2: Rear Forearm Smash (4.5 HP, 2.2 Chip)
        // S3: Descending Elbow (7.2 HP, 3.6 Chip) (+20% Brutal Escalation)
        // S4: Heavy Pocket Knee (9.6 HP, 4.8 Chip) (+20% Brutal Escalation)
        if (comboStage === 0 || comboStage === 1) {
          rawBaseDamage = 4.5;
          rawChipDamage = 2.2;
        } else if (comboStage === 2) {
          rawBaseDamage = 7.2;
          rawChipDamage = 3.6;
        } else if (comboStage === 3) {
          rawBaseDamage = 9.6;
          rawChipDamage = 4.8;
        }
      }
    } else if (attacker.styleId === 'cqc') {
      if (isHeavy) {
        rawBaseDamage = 14.0;
        rawChipDamage = 5.0;
      } else {
        // CQC 4-Sequence Matrix:
        // S1: Left Open Palm 6.0 HP, 0.8 Chip
        // S2: Right Open Palm 6.0 HP, 0.8 Chip
        // S3: Forearm Strike 7.0 HP, 1.2 Chip
        // S4: Front Straight Punch 9.0 HP, 2.0 Chip
        if (comboStage === 0 || comboStage === 1) {
          rawBaseDamage = 6.0;
          rawChipDamage = 0.8;
        } else if (comboStage === 2) {
          rawBaseDamage = 7.0;
          rawChipDamage = 1.2;
        } else if (comboStage === 3) {
          rawBaseDamage = 9.0;
          rawChipDamage = 2.0;
        }
      }
    } else if (attacker.styleId === 'boxing_shell') {
      if (isHeavy) {
        // Boxing Shell M2 Shoulder Roll deals NO direct damage or chip damage
        rawBaseDamage = 0.0;
        rawChipDamage = 0.0;
      } else {
        // Boxing Shell 4-Combo Sequence:
        // S1: 4.5 HP, S2: 4.5 HP, S3: 5.5 HP, S4: 7.5 HP
        if (comboStage === 0 || comboStage === 1) {
          rawBaseDamage = 4.5;
          rawChipDamage = 0.8;
        } else if (comboStage === 2) {
          rawBaseDamage = 5.5;
          rawChipDamage = 1.0;
        } else if (comboStage === 3) {
          rawBaseDamage = 7.5;
          rawChipDamage = 1.5;
        }
      }
    } else if (attacker.styleId === 'basic') {
      if (isHeavy) {
        // M2 Sway-Dash Straight: 11.0 HP Direct, 70% AP Guard Damage (7.7 AP Chip)
        rawBaseDamage = 11.0;
        rawChipDamage = 7.7;
      } else {
        // Flow Boxing 4-Combo Sequence:
        // S1 (Stage 0): Snapping Lead Jab 4.5 HP, 0.8 Chip
        // S2 (Stage 1): Right Hook 5.0 HP, 1.0 Chip
        // S3 (Stage 2): Right Hook Feint 0.0 HP, 0.0 Chip (Parry Trap Bait)
        // S4 (Stage 3): Left Looping Hook 7.5 HP (15.0 HP 2x unparryable if S3 parry-baited)
        if (comboStage === 0) {
          rawBaseDamage = 4.5;
          rawChipDamage = 0.8;
        } else if (comboStage === 1) {
          rawBaseDamage = 5.0;
          rawChipDamage = 1.0;
        } else if (comboStage === 2) {
          rawBaseDamage = 0.0;
          rawChipDamage = 0.0;
        } else if (comboStage === 3) {
          if (attacker.flowS3ParryBaited) {
            rawBaseDamage = 15.0; // 2x Damage
            rawChipDamage = 3.0;
          } else {
            rawBaseDamage = 7.5;
            rawChipDamage = 1.5;
          }
        }
      }
    } else if (attacker.styleId === 'street_boxing') {
      if (isHeavy) {
        if (attacker.streetBoxingM2Stage === 3) {
          rawBaseDamage = 6.0;
          rawChipDamage = 2.0;
        } else {
          rawBaseDamage = 3.5;
          rawChipDamage = 1.0;
        }
      } else {
        // Street Boxing 4-Combo Sequence:
        // S1 (Stage 0): Lead Left Poke Jab 3.5 HP, 0.7 Chip
        // S2 (Stage 1): Rapid Left Jab 3.5 HP, 0.7 Chip
        // S3 (Stage 2): Rear Straight 4.5 HP, 1.0 Chip
        // S4 (Stage 3): Brawling Left Hook 6.0 HP, 1.5 Chip
        if (comboStage === 0 || comboStage === 1) {
          rawBaseDamage = 3.5;
          rawChipDamage = 0.7;
        } else if (comboStage === 2) {
          rawBaseDamage = 4.5;
          rawChipDamage = 1.0;
        } else if (comboStage === 3) {
          rawBaseDamage = 6.0;
          rawChipDamage = 1.5;
        }
      }
    } else if (attacker.styleId === 'aikido') {
      if (isHeavy) {
        rawBaseDamage = 0.0;
        rawChipDamage = 0.0;
      } else {
        // Aikido 4-Combo Sequence:
        // S1 (Stage 0): Irimi Open-Palm 4.0 HP
        // S2 (Stage 1): Kote-Gaeshi Slap 4.0 HP
        // S3 (Stage 2): Tenkan Arm-Cross Sweep 0.0 HP (Pure Setup)
        // S4 (Stage 3): Shomenuchi Flaring Palm Drive 8.0 HP
        if (comboStage === 0 || comboStage === 1) {
          rawBaseDamage = 4.0;
          rawChipDamage = 0.8;
        } else if (comboStage === 2) {
          rawBaseDamage = 0.0;
          rawChipDamage = 0.0;
        } else if (comboStage === 3) {
          rawBaseDamage = 8.0;
          rawChipDamage = 1.5;
        }
      }
    }
    
    const isMuayThaiHeavy = isHeavy && attacker.styleId === 'muay_thai';
    const isSluggerHeavy = isHeavy && isSlugger;
    const isKickboxingHeavy = isHeavy && attacker.styleId === 'kickboxing';
    const isKyokushinHeavy = isHeavy && attacker.styleId === 'kyokushin';
    
    const damageVal = rawBaseDamage * attackerMods.damageFactor * attackerDmgMult * defenderDmgMult;
    const chipVal = rawChipDamage * attackerMods.damageFactor * attackerDmgMult * defenderDmgMult;
    
    const formattedDamage = Math.round(damageVal * 10) / 10;
    const formattedChip = Math.round(chipVal * 10) / 10;

    // Track match analytics for Post Match HUD
    const appliedDmg = isEffectivelyBlocked ? formattedChip : formattedDamage;
    if (attacker.isPlayer) {
      matchDamageDealtRef.current = Math.round((matchDamageDealtRef.current + appliedDmg) * 10) / 10;
      roundDamageDealtRef.current = Math.round((roundDamageDealtRef.current + appliedDmg) * 10) / 10;
      sliceDamageDealtRef.current = (sliceDamageDealtRef.current || 0) + appliedDmg;
      setMatchDamageDealt(matchDamageDealtRef.current);
      setMatchHitsLanded(prev => prev + 1);
      if (isHeavy) {
        matchHeaviesLandedRef.current += 1;
        roundHeaviesLandedRef.current += 1;
      } else {
        matchLightsLandedRef.current += 1;
        roundLightsLandedRef.current += 1;
      }

      const activeMode = getMatchModeKey();

      // Track first hit
      if (!matchFirstHitOccurredRef.current) {
        matchFirstHitOccurredRef.current = true;
        QuestTracker.trackEvent(userEmail, {
          type: 'first_hit',
          mode: activeMode
        });
      }

      // Track damage dealt
      QuestTracker.trackEvent(userEmail, {
        type: 'damage_dealt',
        amount: Math.round(appliedDmg),
        mode: activeMode,
        lightOnly: !isHeavy
      });

      // Track heavy hit
      if (isHeavy) {
        QuestTracker.trackEvent(userEmail, {
          type: 'heavy_hit',
          mode: activeMode
        });
      }

      // Track S4 combo finisher
      if (!isHeavy && comboStage === 3) {
        matchM1ChainsRef.current += 1;
        QuestTracker.trackEvent(userEmail, {
          type: 's4_combo',
          mode: activeMode
        });
      }

      // Track Whiff Punisher (hitting AI during heavy cooldown / whiff recovery)
      if ((defender.heavyCooldown || 0) > 0 || (defender.keysiVulnerableTimer || 0) > 0 || (defender.ashiharaRecoveryTimer || 0) > 0) {
        matchWhiffPunishesRef.current += 1;
      }

      // Track Counter King (interrupting enemy M1 strike startup with M2 heavy)
      if (isHeavy && defender.fists.some(f => f.isPunching && !f.isHeavy)) {
        matchCounterHitsRef.current += 1;
      }

      // Track Guard Breaks
      if (defender.armorBreakTime === 60 || (isEffectivelyBlocked && (defender.armorHP || 0) <= 0)) {
        matchGuardBreaksRef.current += 1;
      }
    } else {
      if (!matchFirstHitOccurredRef.current) {
        matchFirstHitOccurredRef.current = true;
      }
      if (defender.isPlayer) {
        if (isEffectivelyBlocked && !isParry) {
          matchBlockedStrikesRef.current += 1;
        }
        matchDamageTakenRef.current = Math.round((matchDamageTakenRef.current + appliedDmg) * 10) / 10;
        setMatchDamageTaken(matchDamageTakenRef.current);
        roundDamageTakenRef.current = Math.round((roundDamageTakenRef.current + appliedDmg) * 10) / 10;
        sliceDamageTakenRef.current = (sliceDamageTakenRef.current || 0) + appliedDmg;
        const currentHp = Math.max(0, defender.health - appliedDmg);
        const maxHp = defender.maxHealth || 100;
        const hpPct = Math.round((currentHp / maxHp) * 100);
        minPlayerHpPctRef.current = Math.min(minPlayerHpPctRef.current, hpPct);
      }
    }

    // (Perfect parry check moved to the top of applyFighterHit to allow Capoeira style to parry)
    // Apply Universal Hit-Stun Steering Lock (0.45s), Movement Lock (0.45s), and Hitstun/Attack Lockout (0.45s) upon taking damage
    applyDamageCombatLocks(defender, isEffectivelyBlocked);

    const isDefenderCqcSuperArmor = defender.styleId === 'cqc' && ((defender.cqcM2Stage === 'windup' && (defender.heavyWindup || 0) <= 75.6) || defender.cqcM2Stage === 'dash' || defender.cqcM2Stage === 'assault');
    if (!isEffectivelyBlocked && defender.styleId === 'cqc' && !isDefenderCqcSuperArmor) {
      defender.cqcM2Stage = null;
      defender.cqcLockedTarget = null;
      defender.cqcRings = undefined;
      defender.isDashing = false;
      defender.dashProgress = 0;
    }
    if (attacker.styleId === 'cqc' && (attacker.heavyWindup || 0) > 0) {
      attacker.cqcM2Stage = null;
      attacker.cqcLockedTarget = null;
      attacker.cqcRings = undefined;
      attacker.isDashing = false;
      attacker.dashProgress = 0;
    }

    if (isEffectivelyBlocked) {
      // DEFENDER IS BLOCKING WITHIN FORWARD ARC!
      // Dynamic HP-Linked Impact Vignette for Guard Hits
      const defenderHpPct = (defender.health / defender.maxHealth) * 100;
      if (defenderHpPct > 70) {
        // High HP (>70%): NO Viewport Vignette. Metallic spark at glove contact point. Micro screen-shake (1px).
        stateRef.current.shakeAmount = Math.max(stateRef.current.shakeAmount, 1 * settings.screenShake);
        for (let i = 0; i < 6; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 3 + 1;
          stateRef.current.particles.push({
            id: `metallic_spark_${Math.random()}`,
            x: defender.x,
            y: defender.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: Math.random() * 2.5 + 1.5,
            color: '#cbd5e1',
            alpha: 1.0,
            life: 0,
            maxLife: 12,
            type: 'spark'
          });
        }
      } else if (defenderHpPct >= 30) {
        // Mid HP (30%-70%): Flash ORANGE Vignette (rgba(255, 120, 0, 0.40)) for 4 frames. Heavy kinetic shockwave.
        if (defender.isPlayer || stateRef.current.matchData?.isAiVsAiSpectator) {
          stateRef.current.blockVignetteType = 'orange';
          stateRef.current.blockVignetteTimer = 4;
          stateRef.current.blockVignetteMaxFrames = 4;
        }
        stateRef.current.shakeAmount = Math.max(stateRef.current.shakeAmount, 3 * settings.screenShake);
        for (let i = 0; i < 8; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 4 + 2;
          stateRef.current.particles.push({
            id: `shockwave_${Math.random()}`,
            x: defender.x,
            y: defender.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: Math.random() * 3 + 2,
            color: '#fb923c',
            alpha: 1.0,
            life: 0,
            maxLife: 15,
            type: 'spark'
          });
        }
      } else {
        // Low HP (<30%): Flash RED Vignette (rgba(220, 0, 0, 0.65)) for 6 frames. Heavy bone-impact flash. High screen-shake.
        if (defender.isPlayer || stateRef.current.matchData?.isAiVsAiSpectator) {
          stateRef.current.blockVignetteType = 'red';
          stateRef.current.blockVignetteTimer = 6;
          stateRef.current.blockVignetteMaxFrames = 6;
        }
        stateRef.current.shakeAmount = Math.max(stateRef.current.shakeAmount, 5 * settings.screenShake);
        for (let i = 0; i < 12; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 5 + 2;
          stateRef.current.particles.push({
            id: `bone_impact_${Math.random()}`,
            x: defender.x,
            y: defender.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: Math.random() * 4 + 2,
            color: '#ef4444',
            alpha: 1.0,
            life: 0,
            maxLife: 20,
            type: 'spark'
          });
        }
      }

      if (defender.isPlayer) {
        const blockedDamage = Math.max(0, formattedDamage - formattedChip);
        QuestTracker.trackEvent(userEmail, {
          type: 'damage_blocked',
          mode: getMatchModeKey(),
          amount: Math.round(blockedDamage)
        });
      }

      if (defender.styleId === 'kyokushin') {
        // Kyokushin Fudo Dachi Guard: Absorbs up to 4 hits cleanly without canceling block.
        // 5th light attack OR 1 Heavy Attack (M2) breaches the guard!
        const totalChipDmg = formattedChip;

        defender.health = Math.max(0, defender.health - totalChipDmg);
        defender.armorHP = 18;
        defender.armorBreakTime = 0;
        defender.damageFlashTime = isHeavy ? 10 : 5;
        const stage = comboStage ?? 0;
        const kbAmount = isHeavy ? 4 : (stage === 3 ? 3 : 0);
        defender.vx = kbX * kbAmount;
        defender.vy = kbY * kbAmount;

        // Mark stored power active for Bone-Crushing Attrition (+50% Chip, +5% Dmg upon exiting block)
        defender.kyokushinBlockStoredPowerActive = true;

        if (isHeavy) {
          // Trigger Kyokushin Punch Gust if attacker is Kyokushin
          if (isKyokushinHeavy) {
            spawnKyokushinPunchGust(attacker, defender);
          }

          // Apply heavy cooldown to the attacker who struck the block so M2 cooldown is preserved
          if (attacker.styleId === 'kyokushin') {
            attacker.heavyCooldown = 480; // 8.0s on hit
          } else if (attacker.styleId === 'kickboxing') {
            attacker.heavyCooldown = 192;
          } else if (attacker.styleId === 'boxing_shell') {
            attacker.heavyCooldown = 360;
          } else if (attacker.styleId === 'capoeira') {
            attacker.heavyCooldown = 318;
          } else if (attacker.styleId === 'keysi') {
            attacker.heavyCooldown = 720;
          } else if (attacker.styleId === 'slugger') {
            attacker.heavyCooldown = 720; // 12.0s Hit Cooldown
          } else if (attacker.styleId === 'ashihara') {
            attacker.heavyCooldown = 270;
          } else if (attacker.styleId === 'shotokan') {
            attacker.heavyCooldown = 300;
          } else if (attacker.styleId === 'muay_thai') {
            attacker.heavyCooldown = 300;
          } else {
            attacker.heavyCooldown = 240;
          }
        }

        let isBreached = false;
        if (isHeavy) {
          isBreached = true;
        } else {
          defender.kyokushinBlockHitsTaken = (defender.kyokushinBlockHitsTaken || 0) + 1;
          if (defender.kyokushinBlockHitsTaken >= 5) {
            isBreached = true;
          }
        }

        if (isBreached) {
          defender.isBlocking = false;
          defender.armorBreakTime = 180; // 3.0s guard break lockout
          defender.blockLockout = 180;
          defender.blockTimer = 0;
          defender.kyokushinBlockHitsTaken = 0;
          spawnFloatingText(defender.x, defender.y - 30, 'GUARD BREACHED! (3.0s)', '#dc2626');
          soundManager.playKO();
          stateRef.current.shakeAmount = 10 * settings.screenShake;
          for (let i = 0; i < 18; i++) {
            const angle = (i / 18) * Math.PI * 2;
            const speed = Math.random() * 4 + 2;
            stateRef.current.particles.push({
              id: `kyokushin_breach_${Math.random()}`,
              x: defender.x,
              y: defender.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              radius: Math.random() * 3 + 2,
              color: i % 2 === 0 ? '#dc2626' : '#5A6268',
              alpha: 1.0,
              life: 0,
              maxLife: 30,
              type: 'spark'
            });
          }
        } else {
          // Block stays fully active and unbroken for hits 1-4
          defender.isBlocking = true;
          defender.blockLockout = 0;
          defender.stunTime = 0;
          soundManager.playRollTick();
          spawnFloatingText(defender.x, defender.y - 5, `-${totalChipDmg} HP (${defender.kyokushinBlockHitsTaken}/4)`, '#cbd5e1');
        }

        syncCombatStatesToUI();
        return;
      }

      if (isMuayThaiHeavy) {
        // MUAY THAI HEAVY: CLINCH KNEE CHIP
        defender.health = Math.max(0, defender.health - formattedChip);
        
        // Massive chip damage to armor (Aggressive Attrition)
        const armorDamage = chipVal * 1.5;
        defender.armorHP = Math.max(0, (defender.armorHP || 18) - armorDamage);
        
        defender.damageFlashTime = 8;
        defender.vx = kbX * 4;
        defender.vy = kbY * 4;

        soundManager.playRollTick();
        stateRef.current.shakeAmount = 8 * settings.screenShake;

        spawnFloatingText(defender.x, defender.y - 5, `-${formattedChip} CHIP HP`, '#f8fafc');

        if (defender.armorHP <= 0) {
          // Break armor with heavy knee -> Stun
          defender.isBlocking = false;
          defender.stunTime = 60; // 1.0s Stun
          defender.armorBreakTime = 60;
          
          if (defender.isPlayer) {
            stateRef.current.visionBlurTime = 60;
          }

          stateRef.current.shakeAmount = 12 * settings.screenShake;
          soundManager.playKO();
        }
      } else if (isKickboxingHeavy) {
        const activeFist = attacker.fists.find(f => f.isPunching);
        const isSeq2 = (activeFist as any)?.kickboxingSeq2 || attacker.kickboxingIsSeq2;
        if (isSeq2) {
          // 🎯 Sequence 2 On-Hit Branch (Teep): 80% Armor Chip (14.4 HP)
          const currentArmor = defender.armorHP !== undefined ? defender.armorHP : 18;
          const maxArmor = 18;
          const canBreakGuard = currentArmor <= (maxArmor * 0.80) + 0.1;
          
          defender.health = Math.max(0, defender.health - formattedChip);
          defender.damageFlashTime = 12;
          defender.concussTime = 108; // 60% slow for 1.8s
          
          if (canBreakGuard) {
            defender.armorHP = 0;
            defender.isBlocking = false;
            defender.armorBreakTime = 60; // 1.0s stagger
            defender.stunTime = 30;
          } else {
            defender.armorHP = Math.max(1.0, currentArmor - 14.4);
            defender.armorBreakTime = 0;
          }
          
          defender.vx = kbX * 18;
          defender.vy = kbY * 18;
          soundManager.playPunch(true);
          stateRef.current.shakeAmount = 14 * settings.screenShake;
          stateRef.current.hitstopTime = 4; // 4-frame impact freeze on S2 Teep
          attacker.heavyCooldown = 192; // 3.2s cooldown
          attacker.kickboxingIsSeq2 = false;
          spawnFloatingText(defender.x, defender.y - 10, `-${formattedChip} CHIP`, '#f8fafc');
        } else {
          // Sequence 1 (Short Hook on block): Chips 20% max armor (3.6 HP), suppresses Armor Regen for 0.9s (54 frames), micro-dazes, queues S2 in 0.15s
          defender.health = Math.max(0, defender.health - formattedChip);
          const currentArmor = defender.armorHP !== undefined ? defender.armorHP : 18;
          defender.armorHP = Math.max(0, currentArmor - 3.6);
          defender.armorRegenLockout = 54; // 0.9s suppression!
          defender.stunTime = 12; // Micro-daze
          defender.damageFlashTime = 8;
          stateRef.current.hitstopTime = 2;
          attacker.kickboxingAutoSeq2Timer = 9; // 0.15s auto-trigger S2 Rapid Chamber
          attacker.kickboxingSeq2Ready = true;
          attacker.kickboxingSeq2Window = 45;
          // Short hook knockback (20% knockback passive not activated on S1)
          defender.vx = kbX * 6;
          defender.vy = kbY * 6;
          soundManager.playPunch(true);
          stateRef.current.shakeAmount = 8 * settings.screenShake;
          spawnFloatingText(defender.x, defender.y - 10, `-${formattedChip} CHIP`, '#f8fafc');
        }
      } else if (isHeavy && attacker.styleId === 'boxing_shell') {
        // Boxing Shell M2 against standard block: It's just a Push (Not a Parry).
        // 2x Posture is NOT applied, and the enemy is simply knockbacked a short distance with NO spin out.
        defender.damageFlashTime = 8;
        defender.vx = kbX * 5.0;
        defender.vy = kbY * 5.0;
        defender.shellSpinTimer = 0;
        defender.shellLockoutTimer = 0;
        attacker.heavyCooldown = 360; // 6.0s CD
        soundManager.playPunch(false);
        stateRef.current.shakeAmount = 4 * settings.screenShake;
        spawnFloatingText(defender.x, defender.y - 30, 'DEFLECTIVE PUSH', '#94a3b8');
      } else if (isHeavy) {
        // HEAVY ATTACK INSTANTLY ARMOR BREAKS!
        defender.armorHP = 0;
        defender.isBlocking = false;
        defender.armorBreakTime = 60; // 1.0 second stagger
        defender.health = Math.max(0, defender.health - formattedChip); // Chip damage
        
        // Lockouts: 1.0s stagger, 0.45s attack disable, 0.3s block lockout
        defender.stunTime = Math.max(defender.stunTime || 0, 60);
        defender.strikeCooldown = Math.max(defender.strikeCooldown || 0, HIT_ATTACK_LOCKOUT_FRAMES);
        if ((defender.blockLockout || 0) <= 0) defender.blockLockout = 18;
        defender.heavyWindup = 0;
        defender.fists.forEach(f => {
          f.isPunching = false;
          f.punchProgress = 0;
        });

        // Huge knockback (Far knockback for Capoeira M2 sweep, high knockback for Street Boxing final hook)
        const heavyKb = attacker.styleId === 'capoeira' ? 15 : (attacker.styleId === 'kyokushin' ? 14 : (attacker.styleId === 'street_boxing' ? (attacker.streetBoxingM2Stage === 3 ? 15 : 3) : 12));
        defender.vx = kbX * heavyKb;
        defender.vy = kbY * heavyKb;
        defender.damageFlashTime = 15;

        // Feedback
        soundManager.playKO();
        stateRef.current.shakeAmount = 14 * settings.screenShake;
        
        if (defender.isPlayer) {
          stateRef.current.visionBlurTime = 108; // 1.8s
        }
        defender.concussTime = 108; // Universal Rule: M2 slows movement by 60%
        if (attacker.styleId === 'kyokushin') {
          defender.crippleTime = 720; // 12.0s Leg Cripple slow (-15% speed)
          spawnKyokushinPunchGust(attacker, defender);
        }

        spawnFloatingText(defender.x, defender.y - 5, `-${formattedChip} CHIP HP`, '#f8fafc');

        if (attacker.styleId === 'kyokushin') {
          attacker.heavyCooldown = 480; // 8.0s on hit
        } else {
          let baseHeavyCD = 240;
          if (attacker.styleId === 'muay_thai') baseHeavyCD = 300;
          else if (attacker.styleId === 'ashihara') baseHeavyCD = 270;
          else if (attacker.styleId === 'shotokan') baseHeavyCD = 300;
          else if (attacker.styleId === 'capoeira') baseHeavyCD = 318;
          else if (attacker.styleId === 'slugger') {
            baseHeavyCD = 720;
            defender.boneFractureTimer = 210; // 3.5s Bone Fracture on M2 block (210 frames)
            const hitX = strikePos?.x ?? ((attacker.x + defender.x) / 2);
            const hitY = strikePos?.y ?? ((attacker.y + defender.y) / 2);
            triggerSluggerBlockImpactFrame(attacker, defender, hitX, hitY, kbX, kbY);
            spawnFloatingText(defender.x, defender.y - 30, 'M2 BLOCKED! BONE FRACTURE (3.5s)', '#dc2626');
            soundManager.playRollTick();
          }
          else if (attacker.styleId === 'kickboxing') baseHeavyCD = 192;
          else if (attacker.styleId === 'keysi') baseHeavyCD = 720;
          attacker.heavyCooldown = baseHeavyCD;
        }
      } else {
        // Light punch against blocking shield
        defender.health = Math.max(0, defender.health - formattedChip);
        
        // Armor HP takes hit damage, reduced by 10% (Durability Type 1). Keysi Guard Cracker deals +20% AP damage
        const armorDamage = damageVal * 0.9 * (attacker.styleId === 'keysi' ? 1.20 : 1.0);
        defender.armorHP = Math.max(0, (defender.armorHP || 18) - armorDamage);
        
        defender.damageFlashTime = 5;
        const stage = comboStage ?? 0;
        defender.vx = kbX * (stage === 3 ? 4 : 0);
        defender.vy = kbY * (stage === 3 ? 4 : 0);

        soundManager.playRollTick(); // metal armor ping
        
        if (attacker.styleId === 'slugger') {
          attacker.sluggerM1WhiffDragCount = 0;
          attacker.sluggerWhiffedStages = [];
          defender.boneFractureTimer = (defender.boneFractureTimer || 0) + 36; // 0.6s stack (36 frames)
          spawnFloatingText(defender.x, defender.y - 30, `BONE FRACTURE +0.6s (${((defender.boneFractureTimer) / 60).toFixed(1)}s)!`, '#f59e0b');
        } else {
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedChip} CHIP HP`, '#cbd5e1');
        }

        if (defender.armorHP > 0) {
          defender.isBlocking = true;
        } else {
          // Shield breaks!
          defender.isBlocking = false;
          defender.armorBreakTime = 60; // 1.0s stagger
          defender.stunTime = Math.max(defender.stunTime || 0, 60);
          
          // Interrupt active windups/attacks on shield break
          defender.strikeCooldown = Math.max(defender.strikeCooldown || 0, HIT_ATTACK_LOCKOUT_FRAMES);
          if ((defender.blockLockout || 0) <= 0) defender.blockLockout = 18;
          defender.heavyWindup = 0;
          defender.fists.forEach(f => {
            f.isPunching = false;
            f.punchProgress = 0;
          });

          stateRef.current.shakeAmount = 8 * settings.screenShake;
          soundManager.playKO();
        }
      }
    } else {
      // DEFENDER IS NOT BLOCKING (OR GUARD BROKEN / FLANKED / BACK-DASHED OUTSIDE ARC) - DIRECT DAMAGE TAKEN
      if (blockCheck.isFlankHit) {
        spawnFloatingText(defender.x, defender.y - 32, 'GUARD BYPASSED!', '#f97316');
        for (let i = 0; i < 8; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 4 + 2;
          stateRef.current.particles.push({
            id: `flank_spark_${Math.random()}`,
            x: defender.x,
            y: defender.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: Math.random() * 3 + 1.5,
            color: '#f97316',
            alpha: 1.0,
            life: 0,
            maxLife: 20,
            type: 'spark'
          });
        }
      }

      // Hot Potato passing logic: Pass potato to defender on clean hit
      if (matchData?.gamemode === 'hot_potato') {
        const isAttackerPotatoHolder = 
          (attacker.isPlayer && stateRef.current.potatoHolder === 'player') ||
          (!attacker.isPlayer && stateRef.current.potatoHolder === 'dummy');
        
        if (isAttackerPotatoHolder) {
          const nextHolder = defender.isPlayer ? 'player' : 'dummy';
          stateRef.current.potatoHolder = nextHolder;
          stateRef.current.potatoFuseTimer = 20 * 60; // Reset fuse timer to 20 seconds
          setPotatoFuseLeft(20);
          setPotatoHolderState(nextHolder);
          spawnFloatingText(defender.x, defender.y - 35, '🥔 POTATO PASSED! (20s)', '#f59e0b');
          soundManager.playDash();
          for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 2;
            stateRef.current.particles.push({
              id: `potato_pass_${Math.random()}`,
              x: defender.x,
              y: defender.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              radius: Math.random() * 3 + 1.5,
              color: '#f59e0b',
              alpha: 1.0,
              life: 0,
              maxLife: 22,
              type: 'spark'
            });
          }
        }
      }

      // Escape Clause: Getting hit with physical Knockback immediately cancels out the M2 2.0s lockout duration
      if (defender.sluggerM2WhiffLockoutTimer && defender.sluggerM2WhiffLockoutTimer > 0) {
        defender.sluggerM2WhiffLockoutTimer = 0;
        spawnFloatingText(defender.x, defender.y - 35, 'KNOCKBACK RECOVERY!', '#38bdf8');
      }

      // Track direct strike landed on defender before dashing (for combo-interrupted dash counter)
      if (!defender.isDashing && (!defender.dashProgress || defender.dashProgress <= 0)) {
        defender.lastHitBeforeDashTimer = 120; // ~2.0s window for M1 combo follow-up
      }

      // Check Super Armor: Kyokushin during heavy windup, CQC after 0.24s windup, during dash, and through 5-hit assault
      const isKyokushinSuperArmor = defender.styleId === 'kyokushin' && (defender.heavyWindup || 0) > 0;
      const isCqcWindupSuperArmor = defender.styleId === 'cqc' && defender.cqcM2Stage === 'windup' && (defender.heavyWindup || 0) > 0 && (defender.heavyWindup || 0) <= 75.6;
      const isCqcActiveSuperArmor = defender.styleId === 'cqc' && (defender.cqcM2Stage === 'dash' || defender.cqcM2Stage === 'assault');
      const isShellSuperArmor = defender.styleId === 'boxing_shell' && ((defender.heavyWindup || 0) > 0 || defender.fists.some(f => f.isPunching && f.isHeavy));
      const isKeysiSuperArmor = defender.styleId === 'keysi' && !!defender.keysiHasSuperArmor;

      // Section 2.8: White Frames & Combo-Interrupted Dash Rule
      const isDashActive = !!(defender.isDashing || (defender.dashProgress && defender.dashProgress > 0));
      const isComboInterruptedDash = isDashActive && !isHeavy && !!(defender.dashInitiatedAfterHit && defender.lastHitBeforeDashTimer && defender.lastHitBeforeDashTimer > 0);
      const isDashWhiteFrames = isDashActive && !isComboInterruptedDash;

      if (isComboInterruptedDash) {
        // Section 2.8: The "Combo-Interrupted Dash" Rule (M1 Chaining Counter)
        // Strike A hit before dash -> panic dash initiated -> Strike B connected -> DASH INTERRUPTED & SHATTERED!
        defender.isDashing = false;
        defender.dashProgress = 0;
        defender.dashHitDelayedStopTimer = 0;
        defender.vx = 0;
        defender.vy = 0;
        defender.dashWhiteFrameFlashTime = 0;
        defender.dashInitiatedAfterHit = false;
        defender.lastHitBeforeDashTimer = 0;
        soundManager.playKO();
        spawnFloatingText(defender.x, defender.y - 35, 'DASH INTERRUPTED! (COMBO COUNTER)', '#ef4444');
      } else if (isDashWhiteFrames) {
        defender.dashHitDelayedStopTimer = 6; // 0.10s (6 frames @ 60fps) carry-through before momentum stops dead
        defender.dashWhiteFrameFlashTime = 8;
        spawnFloatingText(defender.x, defender.y - 35, 'WHITE FRAME (0.1s STOP)', '#ffffff');
      }

      const hasSuperArmor = isKyokushinSuperArmor || isCqcWindupSuperArmor || isCqcActiveSuperArmor || isShellSuperArmor || isKeysiSuperArmor || isDashWhiteFrames;

      if (!hasSuperArmor) {
        // Lockouts: 0.45s hitstun, 0.45s attack disable (cannot attack when hit), 0.3s block lockout (does NOT reset if active)
        defender.stunTime = Math.max(defender.stunTime || 0, HITSTUN_FRAMES);
        defender.strikeCooldown = Math.max(defender.strikeCooldown || 0, HIT_ATTACK_LOCKOUT_FRAMES);
        if (attacker.styleId !== 'cqc' || isHeavy) {
          if ((defender.blockLockout || 0) <= 0) {
            defender.blockLockout = 18;
          }
          defender.isBlocking = false;
        }
        defender.heavyWindup = 0;
        defender.fists.forEach(f => {
          f.isPunching = false;
          f.punchProgress = 0;
        });
        if (defender.styleId === 'cqc' && defender.cqcM2Stage === 'windup') {
          defender.cqcM2Stage = null;
          defender.cqcRings = undefined;
          defender.cqcLockedTarget = null;
          spawnFloatingText(defender.x, defender.y - 35, 'CQC CANCELLED!', '#ef4444');
        }
      } else {
        if (isKyokushinSuperArmor) {
          defender.kyokushinM2AbsorbedHits = (defender.kyokushinM2AbsorbedHits || 0) + 1;
          // Kinetic Counter-Charge: Instantly stuns attacker for 0.2s (12 frames)
          attacker.stunTime = Math.max(attacker.stunTime || 0, 12);
          attacker.strikeCooldown = Math.max(attacker.strikeCooldown || 0, 12);
          spawnFloatingText(attacker.x, attacker.y - 30, 'MICRO-STUNNED! (0.2s)', '#dc2626');
          spawnFloatingText(defender.x, defender.y - 35, `KINETIC ABSORPTION (+5% DMG x${defender.kyokushinM2AbsorbedHits})`, '#5A6268');
        } else {
          spawnFloatingText(defender.x, defender.y - 35, 'SUPER ARMOR', '#f59e0b');
        }
        if (defender.styleId === 'aikido') {
          defender.superArmorFlashTime = 24;
          defender.superArmorFlashMaxTime = 24;
        }
      }

      if (isHeavy) {
        // HEAVY ATTACK DIRECT HIT
        if (attacker.styleId !== 'boxing_shell') {
          defender.health = Math.max(0, defender.health - formattedDamage);
        }
        defender.damageFlashTime = 15;
        
        if (attacker.styleId === 'muay_thai') {
          // MUAY THAI CLINCH KNEE: CLEAN HIT STUN
          defender.stunTime = 96; // 1.6s
          defender.blockLockout = 96 + 48; // Guard lockout after stun
          
          if (defender.isPlayer) {
            stateRef.current.visionBlurTime = 96;
          }

          // Octagon-style clinch push (low knockback as they are in the clinch)
          defender.vx = kbX * 5;
          defender.vy = kbY * 5;
          attacker.heavyCooldown = 300;
        } else if (attacker.styleId === 'slugger') {
          // SLUGGER HEAVY: SONIC BOOM HOOK & M2 CATACLYSM
          const hitX = strikePos?.x ?? ((attacker.x + defender.x) / 2);
          const hitY = strikePos?.y ?? ((attacker.y + defender.y) / 2);
          triggerSluggerImpactFrame(attacker, defender, hitX, hitY, kbX, kbY);

          attacker.heavyCooldown = 720; // 12.0s Hit Cooldown
          spawnFloatingText(defender.x, defender.y - 30, 'M2 CATACLYSM!', '#d97706');
          soundManager.playKO();
          stateRef.current.shakeAmount = 22 * settings.screenShake;
        } else if (attacker.styleId === 'capoeira') {
          // CAPOEIRA HEAVY: MEIA LUA DE COMPASSO HELICOPTER SWEEP (HIGH KNOCKBACK & CONCUSSION DAZE)
          const dazeDuration = 108; // 1.8s (108 frames) daze duration
          defender.vx = kbX * 15; // Balanced knockback on hit
          defender.vy = kbY * 15;
          stateRef.current.shakeAmount = 18 * settings.screenShake;
          if (defender.isPlayer) {
            stateRef.current.visionBlurTime = dazeDuration;
          }
          defender.concussTime = dazeDuration;
          defender.spinOutTimer = 0;
          defender.kyokushinSpinOutTimer = 0;
          defender.stunTime = Math.max(defender.stunTime || 0, dazeDuration);
          spawnFloatingText(defender.x, defender.y - 35, 'CONCUSSION DAZE (1.8s)!', '#f97316');
          soundManager.playRollTick();
          attacker.heavyCooldown = 318;
        } else if (attacker.styleId === 'kyokushin') {
          // KYOKUSHIN HEAVY: GYAKU-ZUKI / GLIDING RIGHT PALM (12.0s Cripple slow, 2.5s Purple Electrical Spiral)
          const hitX = strikePos?.x ?? ((attacker.x + defender.x) / 2);
          const hitY = strikePos?.y ?? ((attacker.y + defender.y) / 2);

          // Purple Electrical Spiral debuff (2.5s = 150 frames)
          defender.kyokushinSpiralTimer = 150;
          defender.crippleTime = 720; // 12.0s Cripple slow

          attacker.heavyCooldown = 480; // 8.0s on hit
          spawnFloatingText(defender.x, defender.y - 30, 'GYAKU-ZUKI! CRIPPLE (12s)', '#a855f7');
          soundManager.playKO();
          spawnKyokushinPunchGust(attacker, defender);

          // On-Hit Feedback:
          // 1. Hit-Stop: 3-frame absolute time-freeze on both characters to deliver maximum impact weight
          stateRef.current.hitstopTime = 3;
          // 2. Screen Recoil: Hard, directional screen shake (7px along the line of punch)
          stateRef.current.shakeAmount = 7 * settings.screenShake;
          // 3. Particle FX: Dense white kinetic pressure rings blast outward from contact point
          for (let r = 0; r < 3; r++) {
            stateRef.current.particles.push({
              id: `kyokushin_ring_${Math.random()}`,
              x: hitX,
              y: hitY,
              vx: 0,
              vy: 0,
              radius: 14 + r * 16,
              color: '#ffffff',
              alpha: 1.0,
              life: 0,
              maxLife: 16,
              type: 'shockwave'
            } as any);
          }
        } else if (attacker.styleId === 'kickboxing') {
          const activeFist = attacker.fists.find(f => f.isPunching);
          const isSeq2 = (activeFist as any)?.kickboxingSeq2 || attacker.kickboxingIsSeq2;
          if (isSeq2) {
            // 🎯 S2 Teep Direct Hit: 4 Frames Impact Freeze, Concussion Slow, Large Knockback
            defender.vx = kbX * 18;
            defender.vy = kbY * 18;
            defender.stunTime = Math.max(defender.stunTime || 0, HITSTUN_FRAMES);
            stateRef.current.hitstopTime = 4;
            attacker.heavyCooldown = 192; // 3.2s
            attacker.kickboxingIsSeq2 = false;
          } else {
            // S1 Short Hook Direct Hit: Micro-daze, 0.9s Armor Regen Lockout, queues S2 in 0.15s
            defender.vx = kbX * 6; // No 20% passive bonus on S1
            defender.vy = kbY * 6;
            defender.armorRegenLockout = 54; // 0.9s suppression
            defender.stunTime = Math.max(defender.stunTime || 0, HITSTUN_FRAMES); // 0.45s hitstun
            stateRef.current.hitstopTime = 2;
            attacker.kickboxingAutoSeq2Timer = 9; // 0.15s auto-trigger S2 Rapid Chamber
            attacker.kickboxingSeq2Ready = true;
            attacker.kickboxingSeq2Window = 45;
          }
        } else if (attacker.styleId === 'keysi') {
          // KEYSI HEAVY: PENSADOR DRIVE (1.1s Complete Attack Lockout & Guard Shatter)
          defender.vx = kbX * 12;
          defender.vy = kbY * 12;
          defender.stunTime = Math.max(defender.stunTime || 0, 66); // 1.1s daze stun
          defender.strikeCooldown = Math.max(defender.strikeCooldown || 0, 66);
          defender.heavyCooldown = Math.max(defender.heavyCooldown || 0, 66);
          defender.keysiAttackLockout = 66; // 1.1s attack lockout
          stateRef.current.hitstopTime = 4;
          attacker.heavyCooldown = 720; // 12.0s CD on hit
          spawnFloatingText(defender.x, defender.y - 35, 'ATTACK LOCKOUT (1.1s)', '#ef4444');
          spawnFloatingText(attacker.x, attacker.y - 35, 'PENSADOR DRIVE', '#3b82f6');
        } else if (attacker.styleId === 'boxing_shell') {
          // SHOULDER PUSH (Opponent was too close and Iron Boxing user wasn't hit during the attack):
          // Can be Parried (checked in directional block/parry above).
          // If direct hit: deals knockback a short distance with NO spin out and NO 2x posture boost.
          defender.damageFlashTime = 8;
          defender.vx = kbX * 6.0;
          defender.vy = kbY * 6.0;
          defender.stunTime = Math.max(defender.stunTime || 0, 18);
          defender.strikeCooldown = Math.max(defender.strikeCooldown || 0, 18);
          defender.shellSpinTimer = 0;
          defender.shellLockoutTimer = 0;
          attacker.heavyCooldown = 360; // 6.0s Hit Cooldown
          soundManager.playPunch(false);
          stateRef.current.shakeAmount = 4 * settings.screenShake;
          spawnFloatingText(defender.x, defender.y - 35, 'SHOULDER PUSH', '#94a3b8');
          
          // Subtle silver spark particles
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const speed = Math.random() * 2.5 + 1.0;
            stateRef.current.particles.push({
              id: `shell_push_impact_${Math.random()}`,
              x: defender.x,
              y: defender.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              radius: Math.random() * 2.0 + 1.0,
              color: '#cbd5e1',
              alpha: 1.0,
              life: 0,
              maxLife: 16,
              type: 'spark'
            });
          }
        } else if (attacker.styleId === 'basic') {
          // Flow Boxing M2: Shadow Step Strike (0.3s stun = 18 frames)
          defender.vx = kbX * 10;
          defender.vy = kbY * 10;
          defender.stunTime = Math.max(defender.stunTime || 0, 18); // 0.3s stun
          defender.strikeCooldown = Math.max(defender.strikeCooldown || 0, 18);
          defender.blockLockout = Math.max(defender.blockLockout || 0, 18);
          stateRef.current.hitstopTime = 4;
          attacker.heavyCooldown = 540; // 9.0s CD on hit
          spawnFloatingText(defender.x, defender.y - 35, 'STUNNED (0.3s)!', '#38bdf8');
        } else if (attacker.styleId === 'street_boxing') {
          // Street Boxing M2 Pocket Flurry (Section 1.18 Auto-Burst State Machine):
          const stage = attacker.streetBoxingM2Stage || 1;
          if (stage === 1) {
            lockStreetBoxingAutoBurstQueue(attacker, defender);
            // Hit-Confirm Guarantee: Landing the 1st right jab locks opponent into hit-stun
            defender.stunTime = Math.max(defender.stunTime || 0, 24);
            defender.strikeCooldown = Math.max(defender.strikeCooldown || 0, 24);
            defender.blockLockout = Math.max(defender.blockLockout || 0, 24);
            defender.isBlocking = false;
            defender.vx = kbX * 0.8;
            defender.vy = kbY * 0.8;
            stateRef.current.hitstopTime = 2;
            attacker.heavyCooldown = 780; // 13.0s Total Hit Cooldown
            spawnFloatingText(attacker.x, attacker.y - 30, 'POCKET FLURRY (1/3)!', '#f59e0b');
          } else if (stage === 2) {
            attacker.streetBoxingM2Hits = 2;
            attacker.streetBoxingUnbreakable = true;
            defender.stunTime = Math.max(defender.stunTime || 0, 24);
            defender.strikeCooldown = Math.max(defender.strikeCooldown || 0, 24);
            defender.blockLockout = Math.max(defender.blockLockout || 0, 24);
            defender.isBlocking = false;
            defender.vx = kbX * 0.8;
            defender.vy = kbY * 0.8;
            stateRef.current.hitstopTime = 2;
            attacker.heavyCooldown = 780;
            spawnFloatingText(attacker.x, attacker.y - 30, 'POCKET FLURRY (2/3)!', '#f59e0b');
          } else {
            // Stage 3 Left Hook Finisher:
            attacker.streetBoxingM2Hits = 3;
            attacker.streetBoxingUnbreakable = false;
            defender.vx = kbX * 15.0;
            defender.vy = kbY * 15.0;
            defender.stunTime = Math.max(defender.stunTime || 0, 28);
            defender.strikeCooldown = Math.max(defender.strikeCooldown || 0, 28);
            defender.damageFlashTime = 15;
            defender.concussTime = 60;
            stateRef.current.hitstopTime = 4;
            attacker.heavyCooldown = 780; // 13.0s Total Hit Cooldown

            // Posture Reset: Landing all 3 hits shaves Posture recovery down to 0.1s
            attacker.postureOverdriveActive = true;
            attacker.pendingPostureReduction = 0.95;
            applyFighterPostureCooldown(attacker);
            attacker.postureCd = 6; // 0.1s (6 frames @ 60fps)
            attacker.maxPostureCd = 6;
            attacker.lightCooldown = 6;
            attacker.strikeCooldown = 6;
            attacker.isPostureLocked = true;
            spawnFloatingText(attacker.x, attacker.y - 35, 'POSTURE RESET (0.1s)!', '#22c55e');
          }
        } else {
          // Huge pushback for standard heavy
          defender.vx = kbX * 14;
          defender.vy = kbY * 14;
          stateRef.current.hitstopTime = 4; // Visceral heavy hitstop freeze
          
          let baseHeavyCD = 240;
          if (attacker.styleId === 'ashihara') baseHeavyCD = 270;
          else if (attacker.styleId === 'shotokan') baseHeavyCD = 300;
          attacker.heavyCooldown = baseHeavyCD;
        }

        soundManager.playPunch(true);
        stateRef.current.shakeAmount = 18 * settings.screenShake;

        if (defender.isPlayer) {
          stateRef.current.visionBlurTime = 108; // 1.8s concussion
        }
        
        // Universal Rule: M2 Heavy Attack slows movement by 60%
        defender.concussTime = 108;
        
        if (attacker.styleId !== 'boxing_shell') {
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#ef4444');
        }
      } else {
        // LIGHT ATTACK DIRECT HIT
        defender.health = Math.max(0, defender.health - formattedDamage);
        defender.damageFlashTime = 8;

        const stage = comboStage ?? 0;
        const isSlugger = attacker.styleId === 'slugger';
        
        // Universal Rule: Taking S4 Damage (stage 3 combo finisher) slows movement of user hit by 60%
        if (stage === 3) {
          defender.concussTime = 108;
        }

        if (attacker.styleId === 'slugger') {
          // Air-Displacement Impact Cone particle FX + high-speed white exit lines straight through the victim
          stateRef.current.particles.push({
            id: `slugger_air_cone_${Math.random()}`,
            x: defender.x,
            y: defender.y,
            vx: Math.cos(attacker.facingAngle) * 7,
            vy: Math.sin(attacker.facingAngle) * 7,
            radius: 36,
            color: '#e2e8f0',
            alpha: 0.95,
            life: 0,
            maxLife: 18,
            type: 'aiki_ejection_cone',
            facingAngle: attacker.facingAngle
          } as any);

          // White high-velocity impact lines blasting out through the victim's back
          for (let i = 0; i < 10; i++) {
            const spreadAngle = attacker.facingAngle + (Math.random() * 0.4 - 0.2);
            const lineSpeed = Math.random() * 11 + 7;
            stateRef.current.particles.push({
              id: `slugger_air_line_${Math.random()}`,
              x: defender.x + Math.cos(attacker.facingAngle) * 8,
              y: defender.y + Math.sin(attacker.facingAngle) * 8,
              vx: Math.cos(spreadAngle) * lineSpeed,
              vy: Math.sin(spreadAngle) * lineSpeed,
              radius: Math.random() * 3 + 2,
              color: i % 2 === 0 ? '#ffffff' : '#e2e8f0',
              alpha: 1.0,
              life: 0,
              maxLife: 16,
              type: 'spark'
            });
          }

          attacker.sluggerM1WhiffDragCount = 0;
          attacker.sluggerWhiffedStages = [];

          if (stage === 3) {
            defender.vx = kbX * 18.0;
            defender.vy = kbY * 18.0;
            stateRef.current.hitstopTime = 4;
          } else {
            defender.vx = kbX * 8.0;
            defender.vy = kbY * 8.0;
            stateRef.current.hitstopTime = 2;
          }

          attacker.sluggerM1ChainCount = (attacker.sluggerM1ChainCount || 0) + 1;
          if (attacker.sluggerM1ChainCount >= 6) {
            defender.superCrippleTimer = 180; // 3.0s Super Cripple from Kinetic Overdrive (6 landed M1s)
            attacker.sluggerM1ChainCount = 0;
            spawnFloatingText(defender.x, defender.y - 30, 'KINETIC OVERDRIVE! (SUPER CRIPPLE 3.0s)', '#d97706');
            soundManager.playKO();
          } else {
            spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP (${attacker.sluggerM1ChainCount}/6)`, '#f3f4f6');
          }
        } else if (attacker.styleId === 'kyokushin') {
          if (stage === 0) {
            // Sequence 1 (Stage 0): Chudan Seiken Tsuki (Lead Punch)
            defender.vx = kbX * 3.5;
            defender.vy = kbY * 3.5;
            stateRef.current.hitstopTime = 2;
          } else if (stage === 1) {
            // Sequence 2 (Stage 1): Gedan Geri (Calf Kick) - Low shin chop attacking base
            defender.vx = kbX * 4.0;
            defender.vy = kbY * 4.0;
            stateRef.current.hitstopTime = 3;
          } else if (stage === 2) {
            // Sequence 3 (Stage 2): Shotei Uchi (Open Palm) - Heavy palm thrust displacing guard line
            defender.vx = kbX * 5.0;
            defender.vy = kbY * 5.0;
            stateRef.current.hitstopTime = 3;
          } else if (stage === 3) {
            // Sequence 4 (Stage 3): Full-Charge Right Palm (Finisher) - Massive kinetic pushback
            defender.vx = kbX * 16.0;
            defender.vy = kbY * 16.0;
            stateRef.current.hitstopTime = 4;
          }
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#fca5a5');
        } else if (attacker.styleId === 'capoeira') {
          if (stage === 0) {
            stateRef.current.hitstopTime = 2;
          } else if (stage === 1) {
          } else if (stage === 2) {
          } else if (stage === 3) {
            defender.vx = kbX * 16;
            defender.vy = kbY * 16;
            stateRef.current.hitstopTime = 4;
          } else {
            defender.vx = kbX * 3;
            defender.vy = kbY * 3;
          }
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#fca5a5');

          for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3.5 + 1.5;
            stateRef.current.particles.push({
              id: `capoeira_gold_dust_${Math.random()}`,
              x: defender.x,
              y: defender.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              radius: Math.random() * 3 + 1.5,
              color: Math.random() < 0.6 ? '#ca8a04' : '#facc15',
              alpha: 1.0,
              life: 0,
              maxLife: 22,
              type: 'spark'
            });
          }
        } else if (attacker.styleId === 'kickboxing') {
          if (stage === 3) {
            defender.vx = kbX * 11;
            defender.vy = kbY * 11;
            attacker.hasChainReaction = true;
          } else {
            defender.vx = kbX * 3;
            defender.vy = kbY * 3;
          }
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#fca5a5');
        } else if (attacker.styleId === 'ashihara') {
          if (stage === 2) {
            // Chudan Kansetsu Geri: 0.45s (27 frames) stun
            defender.stunTime = Math.max(defender.stunTime || 0, HITSTUN_FRAMES);
            defender.strikeCooldown = Math.max(defender.strikeCooldown || 0, HIT_ATTACK_LOCKOUT_FRAMES);
            // Freeze target's velocity to lock in place
            defender.vx = 0;
            defender.vy = 0;
          } else if (stage === 3) {
            // Ashibarai Sweep: 0.45s (27 frames) stun + slight sweeps knockback
            defender.stunTime = Math.max(defender.stunTime || 0, HITSTUN_FRAMES);
            defender.strikeCooldown = Math.max(defender.strikeCooldown || 0, HIT_ATTACK_LOCKOUT_FRAMES);
            defender.vx = kbX * 3.5;
            defender.vy = kbY * 3.5;
            stateRef.current.hitstopTime = 2;
          } else {
            // S1/S2: low knockback to keep them in range
            defender.vx = kbX * 1.5;
            defender.vy = kbY * 1.5;
          }
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#fca5a5');
        } else if (attacker.styleId === 'cqc') {
          if (stage === 0 || stage === 1 || stage === 2) {
            defender.vx = kbX * 1.5;
            defender.vy = kbY * 1.5;
            attacker.cqcSpeedBonus = Math.min((attacker.cqcSpeedBonus || 0) + 9, 27);
            spawnFloatingText(attacker.x, attacker.y - 30, 'ACCELERATION (+0.15s)', '#cbd5e1');
          } else if (stage === 3) {
            defender.vx = kbX * 12;
            defender.vy = kbY * 12;
            stateRef.current.hitstopTime = 3;
            attacker.postureCd = Math.round((attacker.postureCd || 0) * 0.75);
            attacker.cqcSpeedBonus = 0;
            spawnFloatingText(attacker.x, attacker.y - 30, 'POSTURE CD -25%', '#22c55e');
          }
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#fca5a5');

          for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3.5 + 1;
            stateRef.current.particles.push({
              id: `cqc_spark_${Math.random()}`,
              x: defender.x,
              y: defender.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              radius: Math.random() * 2.5 + 1.5,
              color: i % 2 === 0 ? '#ef4444' : '#cbd5e1',
              alpha: 1.0,
              life: 0,
              maxLife: 16,
              type: 'spark'
            });
          }
        } else if (attacker.styleId === 'muay_thai') {
          if (stage === 0) {
            defender.vx = kbX * 1.5;
            defender.vy = kbY * 1.5;
          } else if (stage === 1) {
            defender.vx = kbX * 2.0;
            defender.vy = kbY * 2.0;
          } else if (stage === 2) {
            // S3 Sok Tat Slicing Elbow: Sharp cutting impact, 3 frames hitstop
            defender.vx = kbX * 3.5;
            defender.vy = kbY * 3.5;
            stateRef.current.hitstopTime = 3;
          } else if (stage === 3) {
            // S4 Roundhouse Shin Kick: Heavy knockback launcher + slow
            defender.vx = kbX * 12;
            defender.vy = kbY * 12;
            stateRef.current.hitstopTime = 4;
          }
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#fca5a5');
        } else if (isSlugger && stage === 3) {
          // Slugger Stage 3 (S4): Crushing Knockback
          defender.vx = kbX * 14.5;
          defender.vy = kbY * 14.5;
          stateRef.current.hitstopTime = 3;
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#fca5a5');
        } else if (attacker.styleId === 'shotokan' && stage === 3) {
          // Shotokan Stage 3 Mae-Geri Front Snap Kick: Heavy Knockback Launcher (+10% Kinetic Impact)
          defender.vx = kbX * 11.5;
          defender.vy = kbY * 11.5;
          stateRef.current.hitstopTime = 3;
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#fca5a5');
        } else if (attacker.styleId === 'keysi') {
          if (stage === 3) {
            // S4 Heavy Pocket Knee: Primes M2 Clinch windup to 0.1s + Super Armor. Low knockback to keep opponent in pocket.
            attacker.keysiM2Primed = true;
            defender.vx = kbX * 2.0;
            defender.vy = kbY * 2.0;
            stateRef.current.hitstopTime = 3;
            spawnFloatingText(attacker.x, attacker.y - 30, 'CLINCH PRIMED!', '#ef4444');
          } else if (stage === 2) {
            // S3 Descending Elbow (+20% Boost)
            defender.vx = kbX * 1.5;
            defender.vy = kbY * 1.5;
            stateRef.current.hitstopTime = 2;
          } else {
            // S1 & S2 Forearm Wedges
            defender.vx = kbX * 1.0;
            defender.vy = kbY * 1.0;
            stateRef.current.hitstopTime = 2;
          }
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#fca5a5');
        } else if (attacker.styleId === 'boxing_shell') {
          if (stage === 3) {
            // S4 Looping Overhead Hook finisher
            defender.vx = kbX * 9.5;
            defender.vy = kbY * 9.5;
            stateRef.current.hitstopTime = 3;
          } else if (stage === 2) {
            // S3 Looping Hook
            defender.vx = kbX * 2.5;
            defender.vy = kbY * 2.5;
            stateRef.current.hitstopTime = 2;
          } else {
            // S1 & S2 Snappy Jabs (keep opponent in the pocket)
            defender.vx = kbX * 1.0;
            defender.vy = kbY * 1.0;
            stateRef.current.hitstopTime = 2;
          }
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#fca5a5');
        } else if (attacker.styleId === 'basic') {
          if (stage === 3) {
            // S4 Looping Overhead Hook finisher
            if (attacker.flowS3ParryBaited) {
              // Boosted: 2x DMG (15.0), unparryable, inflicts 5s Cripple (300 frames)
              defender.crippleTime = Math.max(defender.crippleTime || 0, 300);
              defender.vx = kbX * 12.0;
              defender.vy = kbY * 12.0;
              stateRef.current.hitstopTime = 4;
              stateRef.current.shakeAmount = 14 * settings.screenShake;
              attacker.flowS3ParryBaited = false; // Boost removed after hitting
              spawnFloatingText(defender.x, defender.y - 30, 'FEINT TRAP PUNISH! (5s CRIPPLE)', '#ef4444');
            } else {
              defender.vx = kbX * 8.5;
              defender.vy = kbY * 8.5;
              stateRef.current.hitstopTime = 3;
              attacker.flowS3ParryBaited = false;
            }
          } else if (stage === 1) {
            // S2 Right Hook
            defender.vx = kbX * 2.0;
            defender.vy = kbY * 2.0;
            stateRef.current.hitstopTime = 2;
          } else {
            // S1 Snapping Jab
            defender.vx = kbX * 1.2;
            defender.vy = kbY * 1.2;
            stateRef.current.hitstopTime = 2;
          }
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#fca5a5');
        } else if (attacker.styleId === 'street_boxing') {
          // In-Pocket Cling: All M1 attacks deal x0.40 knockback
          if (stage === 3) {
            defender.vx = kbX * 3.5;
            defender.vy = kbY * 3.5;
            stateRef.current.hitstopTime = 3;
          } else if (stage === 2) {
            defender.vx = kbX * 1.0;
            defender.vy = kbY * 1.0;
            stateRef.current.hitstopTime = 2;
          } else {
            defender.vx = kbX * 0.5;
            defender.vy = kbY * 0.5;
            stateRef.current.hitstopTime = 1;
          }
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#86efac');
        } else if (attacker.styleId === 'aikido') {
          // Tenkan Aiki Flow - Hit Acceleration: Landing any M1 light attack reduces S3 Free M2 cooldown by 2.0s (120 frames)
          if (attacker.aikiS3FreeM2CdTimer && attacker.aikiS3FreeM2CdTimer > 0) {
            attacker.aikiS3FreeM2CdTimer = Math.max(0, attacker.aikiS3FreeM2CdTimer - 120);
            if (attacker.aikiS3FreeM2CdTimer === 0) {
              spawnFloatingText(attacker.x, attacker.y - 40, 'TENKAN FLOW READY!', '#38bdf8');
            }
          }

          // Passive 5: Resonant Vortex (Stagger Extension)
          // "If you attack an opponent who is currently suffering from a hitstun/stagger state, the duration is extended to 0.6 seconds."
          const targetIsStaggered = (defender.stunTime && defender.stunTime > 0) || (defender.superCrippleTimer && defender.superCrippleTimer > 0);
          if (targetIsStaggered) {
            defender.stunTime = Math.max(defender.stunTime || 0, 36); // Reapplied and extended to 0.6s (36 frames)
            defender.isPostureLocked = true;
            defender.isBlocking = false;
            spawnFloatingText(defender.x, defender.y - 45, 'RESONANT VORTEX (0.6s)!', '#38bdf8');
          }

          if (stage === 0) {
            // S1 Irimi Palm: Clean straight hit
            defender.vx = kbX * 1.5;
            defender.vy = kbY * 1.5;
            stateRef.current.hitstopTime = 2;
            spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#38bdf8');
          } else if (stage === 1) {
            // S2 Kote-Gaeshi Slap: Traps opponent's lead wrist (glove pulled down 10px off-center)
            defender.vx = kbX * 1.5;
            defender.vy = kbY * 1.5;
            defender.aikiKoteGaeshiTrapTimer = 24;
            stateRef.current.hitstopTime = 2;
            spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#38bdf8');
            spawnFloatingText(defender.x, defender.y - 30, 'WRIST TRAP!', '#e2e8f0');

            // Silver impact ring particles
            stateRef.current.particles.push({
              id: `aiki_silver_ring_${Math.random()}`,
              x: defender.x,
              y: defender.y,
              vx: 0,
              vy: 0,
              radius: 14,
              color: '#e2e8f0',
              alpha: 1.0,
              life: 0,
              maxLife: 16,
              type: 'shockwave'
            });
          } else if (stage === 2) {
            // S3 Tenkan Arm-Cross Sweep:
            // - Staggers opponent into 0.3s Off-Balance hitstun (18 frames)
            // - Tenkan Aiki Flow: Grants Free M2 Stance Boost if off CD (15s baseline CD)
            defender.vx = 0;
            defender.vy = 0;
            stateRef.current.hitstopTime = 2;
            spawnFloatingText(defender.x, defender.y - 5, '0.0 HP (SETUP)', '#e0f2fe');

            if (!targetIsStaggered) {
              defender.stunTime = Math.max(defender.stunTime || 0, 18); // 0.3s (18 frames) Stagger
              defender.isPostureLocked = true;
              defender.isBlocking = false;
              spawnFloatingText(defender.x, defender.y - 30, 'OFF-BALANCE STAGGER (0.3s)!', '#38bdf8');
            }

            // Passive 2: Tenkan Aiki Flow (S3 Free M2 Trigger)
            // If M2 was used before free M2 in this sequence, will wait for next sequence and doesn't activate free M2
            if (!attacker.aikiManualM2UsedInSequence && (attacker.aikiS3FreeM2CdTimer || 0) <= 0) {
              attacker.aikiM2StanceTimer = 300; // 5.0s M2 Stance Boost
              attacker.aikiM2SuperArmorHits = 2;
              attacker.aikiFreeM2Active = true;
              attacker.aikiS3FreeM2CdTimer = 900; // 15.0s baseline CD
              spawnFloatingText(attacker.x, attacker.y - 50, 'TENKAN AIKI FLOW! (FREE M2 BOOST)', '#38bdf8');
            }

            // On-Hit Feedback: Two curved, semi-transparent white/cyan wind arcs clash at the center
            const clashMidX = (attacker.x + defender.x) / 2;
            const clashMidY = (attacker.y + defender.y) / 2;
            stateRef.current.particles.push({
              id: `aiki_wind_arc_1_${Math.random()}`,
              x: clashMidX,
              y: clashMidY,
              vx: 0,
              vy: 0,
              radius: 26,
              color: '#e0f7fa',
              alpha: 0.9,
              life: 0,
              maxLife: 16,
              type: 'aiki_wind_arc_right'
            });
            stateRef.current.particles.push({
              id: `aiki_wind_arc_2_${Math.random()}`,
              x: clashMidX,
              y: clashMidY,
              vx: 0,
              vy: 0,
              radius: 26,
              color: '#38bdf8',
              alpha: 0.9,
              life: 0,
              maxLife: 16,
              type: 'aiki_wind_arc_left'
            });
          } else if (stage === 3) {
            // S4 Shomenuchi Flaring Palm Drive:
            if (attacker.aikiM2StanceTimer && attacker.aikiM2StanceTimer > 0) {
              // M2 Redirection Stance Active (S4 Enhanced): Uninterruptible Guard-Breaking Slam transition with red shield fracture shards!
              attacker.aikiSlamStage = 'clamp';
              attacker.aikiSlamDamage = 22.0;
              attacker.aikiSlamTimer = 90;
              attacker.aikiSlamFrame = 0;
              attacker.aikiSlamBaseAngle = attacker.facingAngle;
              attacker.aikiSlamTarget = defender;
              attacker.aikiM2HitLanded = true;
              attacker.aikiIsFreeSlam = !!attacker.aikiFreeM2Active;
              attacker.aikiSlamUninterruptible = true;
              defender.aikiSlamUninterruptible = true;
              defender.aikiSlamVictimStage = 'clamp';
              defender.aikiOverheadScale = 1.0;
              attacker.vx = 0;
              attacker.vy = 0;
              defender.vx = 0;
              defender.vy = 0;
              attacker.isPostureLocked = false;
              attacker.postureCd = 0;
              attacker.lightCooldown = 0;
              attacker.strikeCooldown = 0;
              attacker.fists.forEach(f => {
                f.isPunching = false;
                f.punchProgress = 0;
              });
              defender.fists.forEach(f => {
                f.isPunching = false;
                f.punchProgress = 0;
              });
              stateRef.current.hitstopTime = 3;
              soundManager.playParry();
              spawnFloatingText(attacker.x, attacker.y - 35, 'AIKI OVER-HEAD SLAM!', '#0284c7');

              // Red shield fracture shards
              for (let i = 0; i < 14; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 4.5 + 2.0;
                stateRef.current.particles.push({
                  id: `aiki_red_shard_${Math.random()}`,
                  x: defender.x,
                  y: defender.y,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  radius: Math.random() * 3.5 + 2.0,
                  color: i % 2 === 0 ? '#ef4444' : '#b91c1c',
                  alpha: 1.0,
                  life: 0,
                  maxLife: 24,
                  type: 'spark'
                });
              }
            } else if (targetIsStaggered) {
              // Passive 2: Centrifugal Ejection (Kinetic Palm Amplification)
              // "Landing your M1 S4 Palm Drive against an opponent who is actively in a stunned/staggered state inflicts 2x Massive Physical Knockback."
              // "A massive directional shockwave cone erupts forward, launching the spinning victim across the arena with high-speed motion trails. Initiates Posture Cooldown."
              defender.vx = kbX * 25.0; // 2x Massive Physical Knockback
              defender.vy = kbY * 25.0;
              defender.aikiCentrifugalKnockbackTimer = 28; // High-speed motion trails
              stateRef.current.hitstopTime = 4;
              stateRef.current.shakeAmount = 10 * settings.screenShake;

              // Initiates Posture Cooldown
              attacker.isPostureLocked = true;
              attacker.postureCd = 24; // 0.4s Posture Cooldown
              attacker.maxPostureCd = 24;

              spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#38bdf8');
              spawnFloatingText(defender.x, defender.y - 30, 'CENTRIFUGAL EJECTION (2x KB)!', '#38bdf8');
              soundManager.playPunch(true);

              // Directional shockwave cone erupts forward
              stateRef.current.particles.push({
                id: `aiki_ejection_cone_${Math.random()}`,
                x: attacker.x,
                y: attacker.y,
                vx: Math.cos(attacker.facingAngle) * 6,
                vy: Math.sin(attacker.facingAngle) * 6,
                radius: 36,
                color: '#38bdf8',
                alpha: 1.0,
                life: 0,
                maxLife: 20,
                type: 'aiki_ejection_cone',
                facingAngle: attacker.facingAngle
              } as any);
            } else {
              // S4 Standard: 5px screen shake, radial cyan/white shockwave, target driven backward 25px
              defender.vx = kbX * 12.5;
              defender.vy = kbY * 12.5;
              stateRef.current.hitstopTime = 3;
              stateRef.current.shakeAmount = 5 * settings.screenShake;
              spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#38bdf8');

              stateRef.current.particles.push({
                id: `aiki_shomenuchi_shockwave_${Math.random()}`,
                x: defender.x,
                y: defender.y,
                vx: 0,
                vy: 0,
                radius: 22,
                color: '#e0f7fa',
                alpha: 1.0,
                life: 0,
                maxLife: 20,
                type: 'shockwave'
              });
            }
          }
        } else if (!isSlugger && stage === 3) {
          // Knockback moment!
          if (!isAikidoSuperArmor) {
            defender.vx = kbX * 9;
            defender.vy = kbY * 9;
          }
          stateRef.current.hitstopTime = 2;
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#fca5a5');
        } else {
          if (!isAikidoSuperArmor) {
            defender.vx = 0;
            defender.vy = 0;
          }
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#fca5a5');
        }

        soundManager.playPunch(false);
      }
    }

    if (isAikidoSuperArmor) {
      defender.stunTime = 0;
      defender.m2StunTimer = 0;
      defender.hitMovementLock = 0;
      defender.hitSteeringLock = 0;
      defender.spinOutTimer = 0;
      defender.kyokushinSpinOutTimer = 0;
      defender.aikiSpinDownTimer = 0;
    } else if (isHeavy && (defender.stunTime || 0) > 0) {
      defender.m2StunTimer = defender.stunTime;
    } else if (!isHeavy) {
      defender.m2StunTimer = 0;
    }

    const dealt = isEffectivelyBlocked ? formattedChip : formattedDamage;
    if (defender.isPlayer && isEffectivelyBlocked && !isParry) {
      stateRef.current.totalBlocks = (stateRef.current.totalBlocks || 0) + 1;
      setTotalBlocks(stateRef.current.totalBlocks);
    }

    if (attacker.isPlayer) {
      stateRef.current.sustainPlayerDamage = (stateRef.current.sustainPlayerDamage || 0) + dealt;
      setSustainPlayerDamage(stateRef.current.sustainPlayerDamage);
    } else {
      stateRef.current.sustainOpponentDamage = (stateRef.current.sustainOpponentDamage || 0) + dealt;
      setSustainOpponentDamage(stateRef.current.sustainOpponentDamage);
    }

    if (attacker.isPlayer && !defender.isPlayer) {
      stateRef.current.totalDamageDealt = (stateRef.current.totalDamageDealt || 0) + dealt;
      stateRef.current.totalHitsLanded = (stateRef.current.totalHitsLanded || 0) + 1;
      setTotalDamageDealt(stateRef.current.totalDamageDealt);
      setTotalHitsLanded(stateRef.current.totalHitsLanded);

      const nextCombo = (stateRef.current.currentCombo || 0) + 1;
      stateRef.current.currentCombo = nextCombo;
      if (nextCombo > (stateRef.current.maxCombo || 0)) {
        stateRef.current.maxCombo = nextCombo;
        setMaxCombo(nextCombo);
      }
    } else if (!attacker.isPlayer && defender.isPlayer) {
      stateRef.current.totalDamageTaken = (stateRef.current.totalDamageTaken || 0) + dealt;
      setTotalDamageTaken(stateRef.current.totalDamageTaken);
      stateRef.current.currentCombo = 0;
    }

    // Sustain Attack & Hot Potato Gamemodes: 100% Attack Negation (health never drops from strikes/combat damage)
    if (matchData?.gamemode === 'sustain_attack' || matchData?.gamemode === 'hot_potato') {
      const defMods = getHeightModifiers(defender.baseHeight);
      defender.health = defMods.maxHealth;
    }

    if (defender.isPlayer && stateRef.current.godMode) {
      const playerMods = getHeightModifiers(defender.baseHeight);
      defender.health = playerMods.maxHealth;
    }

    if (!defender.isPlayer && dummyBehavior === 'test_ai') {
      const defMods = getHeightModifiers(defender.baseHeight);
      defender.health = defMods.maxHealth;
      defender.isDead = false;
      defender.vx = 0;
      defender.vy = 0;
    }

    if (stateRef.current.oneHitKO && !defender.isPlayer && dummyBehavior !== 'test_ai') {
      defender.health = 0;
    }

    // Check KO
    if (defender.health <= 0 && (!(!defender.isPlayer && dummyBehavior === 'test_ai'))) {
      defender.health = 0;
      defender.isDead = true;
      triggerKOCinematic(attacker, defender);
    }

    // Track side effects that happened during the hit:
    if (attacker.isPlayer) {
      if (((defender.concussTime || 0) > prevConcuss) || ((defender.crippleTime || 0) > prevCripple)) {
        QuestTracker.trackEvent(userEmail, {
          type: 'debuff_applied',
          mode: getMatchModeKey()
        });
      }
      if ((defender.armorBreakTime || 0) > prevArmorBreak) {
        QuestTracker.trackEvent(userEmail, {
          type: 'guard_break',
          mode: getMatchModeKey()
        });
      }
    }

    // Sync values back to React states
    syncCombatStatesToUI();
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
    let dashCooldown = Math.round(90 * (playerHeightMods.dashCooldownModifier || 1.0));

    if (player.styleId === 'capoeira') {
      dashProgress = 15; // Shorter, tighter esquiva dodge progress
      dashForce = 8.58 * (playerHeightMods.dashDistanceModifier || 1.0);   // Compact deliberate velocity matching close-range Ginga
      dashCooldown = Math.round(58 * (playerHeightMods.dashCooldownModifier || 1.0));
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
    let dashCooldown = Math.round(90 * (fighterHeightMods.dashCooldownModifier || 1.0));

    if (fighter.styleId === 'capoeira') {
      dashProgress = 15;
      dashForce = 8.58 * (fighterHeightMods.dashDistanceModifier || 1.0);
      dashCooldown = Math.round(58 * (fighterHeightMods.dashCooldownModifier || 1.0));
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

  // Left click trigger Light strike (Basic 4-Combo Sequence)
  const triggerPlayerLightAttack = () => {
    const state = stateRef.current;
    if (matchData?.isAiVsAiSpectator) return;
    if (state.cinematicZoomActive || state.matchEnded || isImpactFrameActive()) return;
    if ((matchData?.isCompetitive || matchData?.isAiMatch) && state.rankedState !== 'fighting') return;
    const player = state.player;
    const dummy = state.dummy;
    if (!player || player.isDead || (dummy && dummy.isDead) || player.stunTime > 0 || (player.parriedStun || 0) > 0 || (player.strikeCooldown || 0) > 0 || (player.armorBreakTime || 0) > 0 || (player.kyokushinSpinOutTimer || 0) > 0 || (player.cqcAttackLockout || 0) > 0 || player.aikiSlamStage || player.aikiSlamUninterruptible || (player.aikiLockoutTimer && player.aikiLockoutTimer > 0) || (player.aikiSpinDownTimer && player.aikiSpinDownTimer > 0) || (player.superCrippleTimer && player.superCrippleTimer > 0) || (player.sluggerM2WhiffLockoutTimer && player.sluggerM2WhiffLockoutTimer > 0)) {
      if (player && player.superCrippleTimer && player.superCrippleTimer > 0) {
        spawnFloatingText(player.x, player.y - 30, 'SUPER CRIPPLED! (ATTACKS DISABLED)', '#dc2626');
      }
      return;
    }

    // Section 2.8: You cannot attack during dash or for 0.30s (18 frames) after exiting dash
    if (player.isDashing || (player.dashProgress && player.dashProgress > 0) || (player.postDashAttackLockout && player.postDashAttackLockout > 0)) {
      return;
    }

    // Posture System: Active Posture Cooldown Locks M1 Light Attacks
    if ((player.postureCd && player.postureCd > 0) || player.isPostureLocked) {
      return;
    }

    // Section 2.8: Post-Block Action Delay (0.10s = 6 frames attack lockout)
    if (player.postBlockAttackLockout && player.postBlockAttackLockout > 0) {
      const isAfterParry = (player.afterParryGraceTimer || 0) > 0 || (player.parryFlashTime || 0) > 0 || (player.parryBlockGraceTimer || 0) > 0;
      if (isAfterParry) {
        player.postBlockAttackLockout = 0;
      } else {
        if ((player.lastBlockDelayTextTimer || 0) <= 0) {
          player.lastBlockDelayTextTimer = 6;
          spawnFloatingText(player.x, player.y - 30, 'POST-BLOCK DELAY (0.1s)', '#f59e0b');
        }
        return;
      }
    }
    if (player.isBlocking) {
      player.isBlocking = false;
      setIsPlayerBlocking(false);
      const isAfterParry = (player.afterParryGraceTimer || 0) > 0 || (player.parryFlashTime || 0) > 0 || (player.parryBlockGraceTimer || 0) > 0;
      if (player.styleId === 'capoeira' || isAfterParry) {
        player.postBlockAttackLockout = 0;
      } else {
        player.postBlockAttackLockout = 6; // Section 2.8: Dropping active guard imposes 0.10s attack delay
        if ((player.lastBlockDelayTextTimer || 0) <= 0) {
          player.lastBlockDelayTextTimer = 6;
          spawnFloatingText(player.x, player.y - 30, 'POST-BLOCK DELAY (0.1s)', '#f59e0b');
        }
        return;
      }
    }

    // Rule 2: Heavy Attack Animation Lockout (Windup + Active Hitbox + Recovery Frames)
    const isHeavyPunching = player.fists.some(f => (f.isPunching || f.punchProgress > 0) && f.isHeavy);
    const isHeavyExecuting = (player.heavyWindup || 0) > 0 || isHeavyPunching || (player.ashiharaM2Stage && player.ashiharaM2Stage > 0) || (player.ashiharaRecoveryTimer && player.ashiharaRecoveryTimer > 0) || (player.cqcM2Stage && player.cqcM2Stage !== null) || !!player.keysiClinchStage;
    if (isHeavyExecuting) return;

    // SECTION 1.16: ASYNCHRONOUS RETRACTION - The next sequence strike NEVER waits for the previous strike to finish retracting!
    // True Asynchronous Limbs: Only gate if a punch is actively extending forward (isPunching === true).
    // As soon as a strike reaches peak reach and starts retracting, the next strike launches INSTANTLY on Frame 1!
    const isPunchExtending = player.fists.some(f => f.isPunching) || ((player.shellRetractionHoldTimer || 0) > 0);
    if (isPunchExtending) return;

    // Check strike cooldown (stun/interruption)
    if (player.strikeCooldown && player.strikeCooldown > 0) return;
    // Check light attack cooldown
    if (player.lightCooldown && player.lightCooldown > 0) return;

    // Aikido Tenchi Counter Slam Trigger via M1 during 0.2s parry window
    if (player.styleId === 'aikido' && player.aikiCounterSlamWindow && player.aikiCounterSlamWindow > 0) {
      const target = dummy && !dummy.isDead ? dummy : null;
      if (target) {
        player.aikiCounterSlamWindow = 0;
        player.aikiSlamStage = 'clamp';
        player.aikiSlamDamage = 10.0;
        player.aikiSlamTimer = 90;
        player.aikiSlamFrame = 0;
        player.aikiSlamBaseAngle = player.facingAngle;
        player.aikiSlamTarget = target;
        player.aikiIsFreeSlam = true;
        player.aikiSlamUninterruptible = true;
        target.aikiSlamUninterruptible = true;
        target.aikiSlamVictimStage = 'clamp';
        target.aikiOverheadScale = 1.0;
        player.vx = 0;
        player.vy = 0;
        target.vx = 0;
        target.vy = 0;
        player.isPostureLocked = false;
        player.postureCd = 0;
        player.lightCooldown = 0;
        player.strikeCooldown = 0;
        player.fists.forEach(f => {
          f.isPunching = false;
          f.punchProgress = 0;
        });
        target.fists.forEach(f => {
          f.isPunching = false;
          f.punchProgress = 0;
        });
        soundManager.playParry();
        spawnFloatingText(player.x, player.y - 30, 'AIKI OVER-HEAD SLAM!', '#0284c7');
        return;
      }
    }

    // Check Sprint state / M1 sprint lockout
    if (!handleSprintM1Cancel(player)) {
      return;
    }

    player.kyokushinM2FreezeTimer = 0; // Clear post-M2 freeze pose on M1 attack

    // Reset fist heavy flags for light attack sequence
    player.fists.forEach(f => {
      f.isHeavy = false;
    });

    // Get current sequence combo stage
    let currentStage = player.comboStage || 0;
    if (player.styleId === 'capoeira' && player.comboResetTimer && player.comboResetTimer <= 40) {
      currentStage = 0;
      spawnFloatingText(player.x, player.y - 30, 'RHYTHM RESET!', '#ca8a04');
    }

    stateRef.current.totalSwings = (stateRef.current.totalSwings || 0) + 1;
    setTotalSwings(stateRef.current.totalSwings);

    // Trigger glove lunges visually
    if (player.styleId === 'street_boxing') {
      // STREET BOXING 4-COMBO SEQUENCE:
      // S1 (Stage 0): Commits Left Hand (Lead Stiff Poke Jab)
      // S2 (Stage 1): Commits Left Hand (Rapid Left Jab)
      // S3 (Stage 2): Pulls back right shoulder and strikes straight with right arm
      // S4 (Stage 3): Pulls back right shoulder and initiates a right hook
      if (currentStage === 0 || currentStage === 1) {
        const leftFist = player.fists.find(f => f.punchType === 'left');
        if (leftFist) { leftFist.isPunching = true; leftFist.punchProgress = 0; leftFist.isHeavy = false; leftFist.comboStage = currentStage; leftFist.hasHit = false; }
      } else if (currentStage === 2) {
        const rightFist = player.fists.find(f => f.punchType === 'right');
        if (rightFist) { rightFist.isPunching = true; rightFist.punchProgress = 0; rightFist.isHeavy = false; rightFist.comboStage = 2; rightFist.hasHit = false; }
      } else if (currentStage === 3) {
        const rightFist = player.fists.find(f => f.punchType === 'right');
        if (rightFist) { rightFist.isPunching = true; rightFist.punchProgress = 0; rightFist.isHeavy = false; rightFist.comboStage = 3; rightFist.hasHit = false; }
      }
    } else if (player.styleId === 'muay_thai') {
      // MUAY THAI 4-COMBO SEQUENCE: S1: Right, S2: Left, S3: Right, S4: Left
      if (currentStage === 0 || currentStage === 2) {
        const rightFist = player.fists.find(f => f.punchType === 'right');
        if (rightFist) { rightFist.isPunching = true; rightFist.punchProgress = 0; rightFist.comboStage = currentStage; }
      } else {
        const leftFist = player.fists.find(f => f.punchType === 'left');
        if (leftFist) { leftFist.isPunching = true; leftFist.punchProgress = 0; leftFist.comboStage = currentStage; }
      }
    } else if (player.styleId === 'slugger') {
      // SLUGGER 4-COMBO SEQUENCE: S1: Left Swing, S2: Right Swing, S3: Left Swing, S4: Heavy Right Cleave
      if (currentStage === 0 || currentStage === 2) {
        const leftFist = player.fists.find(f => f.punchType === 'left');
        if (leftFist) { leftFist.isPunching = true; leftFist.punchProgress = 0; leftFist.comboStage = currentStage; }
      } else {
        const rightFist = player.fists.find(f => f.punchType === 'right');
        if (rightFist) { rightFist.isPunching = true; rightFist.punchProgress = 0; rightFist.comboStage = currentStage; }
      }
    } else if (player.styleId === 'shotokan') {
      // SHOTOKAN 4-COMBO MATRIX:
      // S1: Left (Empi-Uchi Elbow)
      // S2: Right (Ren-Zuki 1)
      // S3: Left (Ren-Zuki 2)
      // S4: Left Mae-Geri Kick (PUNCH REMOVED! Only kick allowed, moved to left)
      if (currentStage === 0) {
        const leftFist = player.fists.find(f => f.punchType === 'left');
        if (leftFist) { leftFist.isPunching = true; leftFist.punchProgress = 0; leftFist.comboStage = 0; }
        // Move model forward/rightward
        player.vx += Math.cos(player.facingAngle) * 3.6;
        player.vy += Math.sin(player.facingAngle) * 3.6;
      } else if (currentStage === 1) {
        const rightFist = player.fists.find(f => f.punchType === 'right');
        if (rightFist) { rightFist.isPunching = true; rightFist.punchProgress = 0; rightFist.comboStage = 1; }
        // Move model forward/rightward
        player.vx += Math.cos(player.facingAngle) * 3.2;
        player.vy += Math.sin(player.facingAngle) * 3.2;
      } else if (currentStage === 2) {
        const leftFist = player.fists.find(f => f.punchType === 'left');
        if (leftFist) { leftFist.isPunching = true; leftFist.punchProgress = 0; leftFist.comboStage = 2; }
        // Move model forward/rightward
        player.vx += Math.cos(player.facingAngle) * 3.2;
        player.vy += Math.sin(player.facingAngle) * 3.2;
      } else if (currentStage === 3) {
        const leftFist = player.fists.find(f => f.punchType === 'left');
        if (leftFist) { leftFist.isPunching = true; leftFist.punchProgress = 0; leftFist.comboStage = 3; }
        // S4 Movement: Tiny pull back before lunging to kick!
        player.vx -= Math.cos(player.facingAngle) * 2.2;
        player.vy -= Math.sin(player.facingAngle) * 2.2;
        setTimeout(() => {
          if (stateRef.current.player) {
            stateRef.current.player.vx += Math.cos(stateRef.current.player.facingAngle) * 4.6;
            stateRef.current.player.vy += Math.sin(stateRef.current.player.facingAngle) * 4.6;
          }
        }, 50);
      }
    } else if (player.styleId === 'ashihara') {
      // ASHIHARA COMBO MATRIX:
      // S1 (Stage 0): Left Fist (Seiken Chudan Tsuki)
      // S2 (Stage 1): Right Kick (Gedan Mawashi Geri)
      // S3 (Stage 2): Left Kick (Chudan Kansetsu Geri)
      // S4 (Stage 3): Right Sweep (Ashibarai) - Grants Flow Sweep I-Frames & 0s M2 recovery
      if (currentStage === 0 || currentStage === 2) {
        const leftFist = player.fists.find(f => f.punchType === 'left');
        if (leftFist) { leftFist.isPunching = true; leftFist.punchProgress = 0; leftFist.comboStage = currentStage; leftFist.hasHit = false; }
      } else {
        const rightFist = player.fists.find(f => f.punchType === 'right');
        if (rightFist) { rightFist.isPunching = true; rightFist.punchProgress = 0; rightFist.comboStage = currentStage; rightFist.hasHit = false; }
      }
      if (currentStage === 3) {
        // S4 Ashibarai rotational sweep micro-step
        player.vx += Math.cos(player.facingAngle) * 2.5;
        player.vy += Math.sin(player.facingAngle) * 2.5;
        spawnFloatingText(player.x, player.y - 30, 'FLOW SWEEP (I-FRAMES)', '#38bdf8');
      }    } else if (player.styleId === 'capoeira') {
      // CAPOEIRA GINGA FLOW SEQUENCE:
      // S1: Left (Meia Lua de Frente), S2: Right (Martelo), S3: Left (Queixada), S4: Right (Bênção)
      if (currentStage === 0 || currentStage === 2) {
        const leftFist = player.fists.find(f => f.punchType === 'left');
        if (leftFist) { leftFist.isPunching = true; leftFist.punchProgress = 0; leftFist.comboStage = currentStage; }
      } else {
        const rightFist = player.fists.find(f => f.punchType === 'right');
        if (rightFist) { rightFist.isPunching = true; rightFist.punchProgress = 0; rightFist.comboStage = currentStage; }
      }
    } else if (player.styleId === 'kickboxing') {
      // KICKBOXING 4-SEQUENCE MATRIX:
      // S1: Left Jab, S2: Right Jab, S3: Left Calf Kick (Low Leg Sweep), S4: Right Straight (Finisher)
      if (currentStage === 0 || currentStage === 2) {
        const leftFist = player.fists.find(f => f.punchType === 'left');
        if (leftFist) { leftFist.isPunching = true; leftFist.punchProgress = 0; leftFist.comboStage = currentStage; }
        if (currentStage === 2) {
          // S3 Calf Kick forward step momentum so the low sweep connects cleanly
          player.vx += Math.cos(player.facingAngle) * 3.0;
          player.vy += Math.sin(player.facingAngle) * 3.0;
        }
      } else {
        const rightFist = player.fists.find(f => f.punchType === 'right');
        if (rightFist) { rightFist.isPunching = true; rightFist.punchProgress = 0; rightFist.comboStage = currentStage; }
      }
    } else if (player.styleId === 'kyokushin') {
      // KYOKUSHIN 4-COMBO MATRIX:
      // S1 (Stage 0): Left Fist (Chudan Seiken Tsuki)
      // S2 (Stage 1): Right Kick (Gedan Geri Calf Kick)
      // S3 (Stage 2): Left Palm (Shotei Uchi Open Palm)
      // S4 (Stage 3): Right Palm (Full-Charge Right Palm Finisher)
      if (currentStage === 0 || currentStage === 2) {
        const leftFist = player.fists.find(f => f.punchType === 'left');
        if (leftFist) { leftFist.isPunching = true; leftFist.punchProgress = 0; leftFist.comboStage = currentStage; leftFist.hasHit = false; }
      } else {
        const rightFist = player.fists.find(f => f.punchType === 'right');
        if (rightFist) { rightFist.isPunching = true; rightFist.punchProgress = 0; rightFist.comboStage = currentStage; rightFist.hasHit = false; }
      }
    } else if (player.styleId === 'aikido') {
      // AIKIDO OPEN-PALM FLOW:
      // S1 (Stage 0): Lead Right Hand Straight Forward Open-Palm Thrust
      // S2 (Stage 1): Trailing Left Hand Kote-Gaeshi Circular Slap
      // S3 (Stage 2): Right Hand Tenkan Pivot Forearm/Palm Thrust
      // S4 (Stage 3): Right Hand Shomenuchi Palm Drive (Downward Collar Finisher)
      if (currentStage === 1) {
        const leftFist = player.fists.find(f => f.punchType === 'left');
        if (leftFist) { leftFist.isPunching = true; leftFist.punchProgress = 0; leftFist.comboStage = currentStage; leftFist.hasHit = false; }
      } else {
        const rightFist = player.fists.find(f => f.punchType === 'right');
        if (rightFist) { rightFist.isPunching = true; rightFist.punchProgress = 0; rightFist.comboStage = currentStage; rightFist.hasHit = false; }
      }
    } else if (player.styleId === 'boxing_shell') {
      // SECTION 1.18 - FIX 1: Iron Boxing S4 Chain Lag Elimination
      // Inputting M1 for S4 during S3's 0.30s DS window instantly aborts S3 recovery on Frame 1.
      // S3 pulls back at accelerated speed while S4 launches without delay.
      if (currentStage === 3) {
        executeIronBoxingS4InstantChain(player);
      } else {
        player.shellRetractionHoldTimer = 0;
        player.shellS3Primed = false;
      }

      // BOXING: SHELL - Right arm is lead shoulder, Left arm is non-lead
      // S1 & S2: Lead arm (RIGHT fist) straight side jabs
      // S3: Non-lead arm (LEFT fist) hook, body rotates right, left arm L shape
      // S4: Non-lead arm (LEFT fist) overhead hook
      if (currentStage === 0 || currentStage === 1) {
        const rightFist = player.fists.find(f => f.punchType === 'right');
        if (rightFist) {
          rightFist.isPunching = true;
          rightFist.punchProgress = 0;
          rightFist.hasHit = false;
          rightFist.comboStage = currentStage;
        }
      } else if (currentStage === 2) {
        const leftFist = player.fists.find(f => f.punchType === 'left');
        if (leftFist) {
          leftFist.isPunching = true;
          leftFist.punchProgress = 0;
          leftFist.hasHit = false;
          leftFist.comboStage = currentStage;
        }
      } else {
        const leftFist = player.fists.find(f => f.punchType === 'left');
        if (leftFist) {
          leftFist.isPunching = true;
          leftFist.punchProgress = 0;
          leftFist.hasHit = false;
          leftFist.comboStage = currentStage;
        }
      }
    } else if (player.styleId === 'basic') {
      // FLOW BOXING 4-COMBO SEQUENCE:
      // S1 (Stage 0): Snapping Lead Jab (Left fist)
      // S2 (Stage 1): Right Hook (Right fist) - Gains 0.4s I-Frames if S1 whiffed
      // S3 (Stage 2): Right Hook Feint (Right fist) - 0 DMG, longer windup feint
      // S4 (Stage 3): Left Looping Hook (Left fist) - Finisher (2x DMG + Unparryable + 5s Cripple if S3 parry-baited)
      if (currentStage === 0) {
        const leftFist = player.fists.find(f => f.punchType === 'left');
        if (leftFist) { leftFist.isPunching = true; leftFist.punchProgress = 0; leftFist.comboStage = 0; leftFist.hasHit = false; }
      } else if (currentStage === 1) {
        const rightFist = player.fists.find(f => f.punchType === 'right');
        if (rightFist) { rightFist.isPunching = true; rightFist.punchProgress = 0; rightFist.comboStage = 1; rightFist.hasHit = false; }
        if (player.flowS1Whiffed) {
          player.flowS2HasIFrames = true;
          player.flowS1Whiffed = false;
        }
      } else if (currentStage === 2) {
        const rightFist = player.fists.find(f => f.punchType === 'right');
        if (rightFist) { rightFist.isPunching = true; rightFist.punchProgress = 0; rightFist.comboStage = 2; rightFist.hasHit = false; }
      } else if (currentStage === 3) {
        const leftFist = player.fists.find(f => f.punchType === 'left');
        if (leftFist) { leftFist.isPunching = true; leftFist.punchProgress = 0; leftFist.comboStage = 3; leftFist.hasHit = false; }
        if (player.flowS3ParryBaited) {
          spawnFloatingText(player.x, player.y - 30, 'FEINT TRAP UNLEASHED (2X DMG)', '#ef4444');
        }
      }
    } else {
      // Default: S1: Left, S2: Right, S3: Left, S4: Right
      if (currentStage === 0 || currentStage === 2) {
        const leftFist = player.fists.find(f => f.punchType === 'left');
        if (leftFist) { leftFist.isPunching = true; leftFist.punchProgress = 0; leftFist.comboStage = currentStage; leftFist.hasHit = false; }
      } else {
        const rightFist = player.fists.find(f => f.punchType === 'right');
        if (rightFist) { rightFist.isPunching = true; rightFist.punchProgress = 0; rightFist.comboStage = currentStage; rightFist.hasHit = false; }
      }
    }

    // Sound manager play quick whoosh/jab
    soundManager.playDash();

    // Advance combo stage and refresh reset clock
    const comboStages = 4;
    player.comboStage = (currentStage + 1) % comboStages;
    if (player.comboStage === 0) {
      player.aikiManualM2UsedInSequence = false;
    }
    player.comboResetTimer = player.styleId === 'capoeira' ? CAPOEIRA_COMBO_RESET_FRAMES : (player.styleId === 'slugger' ? 140 : BASE_COMBO_RESET_FRAMES);

    // Ren-Zuki Auto-Burst: S2 automatically chains into S3
    if (player.styleId === 'shotokan' && currentStage === 1) {
      player.shotokanRenZukiPending = true;
    }

    // Trigger Kinetic Counter passive on Slugger S1
    if (player.styleId === 'slugger' && player.hasKineticCounter && currentStage === 0) {
      player.hasKineticCounter = false;
      const punchingFist = player.fists.find(f => f.isPunching);
      if (punchingFist) punchingFist.isKineticCounter = true;
      spawnFloatingText(player.x, player.y - 30, 'KINETIC COUNTER!', '#f59e0b');
    }

    // Light attack cooldown depending strictly on style & height/speedFactor
    const playerMods = getHeightModifiers(player.baseHeight);
    const momentumMult = 1.0;
    
    if (player.comboStage === 0) {
      // S4 Finisher Sequence Completed -> Initiate Formal Posture Cooldown
      applyFighterPostureCooldown(player, playerMods.speedFactor, momentumMult);

      // Separate M2 post-S4 usability delay (Heavy Attack recovery lockout after S4 defined per style script)
      const s4HeavyDelay = getStylePostS4HeavyDelay(player.styleId);
      player.postS4HeavyLockout = Math.round(s4HeavyDelay / playerMods.speedFactor);
    } else {
      // Sequence 1-3 Cooldown (Between Strikes)
      const betweenCooldown = getStyleM1BetweenCooldown(player.styleId, currentStage);
      if (player.styleId === 'kickboxing' && (currentStage === 0 || currentStage === 1)) {
        spawnFloatingText(player.x, player.y - 30, 'CADENCE OPENING (10% FAST)', '#d1d5db');
      }
      player.lightCooldown = Math.round(betweenCooldown / (playerMods.speedFactor * momentumMult));
      player.postureCd = 0;
      player.isPostureLocked = false;
      player.postS4HeavyLockout = 0;
    }
    
    syncCombatStatesToUI();
    sendImmediateWsGameState();
  };

  // Right click trigger Heavy strike (Right hook with 0.8s windup)
  const triggerPlayerHeavyAttack = () => {
    const state = stateRef.current;
    if (matchData?.isAiVsAiSpectator) return;
    if (state.cinematicZoomActive || state.matchEnded || isImpactFrameActive()) return;
    if ((matchData?.isCompetitive || matchData?.isAiMatch) && state.rankedState !== 'fighting') return;
    const player = state.player;
    const dummy = state.dummy;
    if (!player || player.isDead || (dummy && dummy.isDead) || player.stunTime > 0 || (player.parriedStun || 0) > 0 || (player.strikeCooldown || 0) > 0 || (player.armorBreakTime || 0) > 0 || (player.kyokushinSpinOutTimer || 0) > 0 || (player.cqcAttackLockout || 0) > 0 || (player.shellLockoutTimer || 0) > 0 || (player.keysiVulnerableTimer || 0) > 0 || player.aikiSlamStage || player.aikiSlamUninterruptible || (player.aikiLockoutTimer && player.aikiLockoutTimer > 0) || (player.aikiSpinDownTimer && player.aikiSpinDownTimer > 0) || (player.superCrippleTimer && player.superCrippleTimer > 0) || (player.sluggerM2WhiffLockoutTimer && player.sluggerM2WhiffLockoutTimer > 0)) {
      if (player && player.superCrippleTimer && player.superCrippleTimer > 0) {
        spawnFloatingText(player.x, player.y - 30, 'SUPER CRIPPLED! (ATTACKS DISABLED)', '#dc2626');
      }
      return;
    }

    // Section 2.8: You cannot attack during dash or for 0.30s (18 frames) after exiting dash
    if (player.isDashing || (player.dashProgress && player.dashProgress > 0) || (player.postDashAttackLockout && player.postDashAttackLockout > 0)) {
      return;
    }

    // Strict Cooldown & State Check: Cannot M2 if heavyCooldown is active, exhausted, keysi vulnerable, or post-S4 heavy lockout is active
    const isKickboxingSeq2Ready = player.styleId === 'kickboxing' && (
      (player.kickboxingSeq2Ready && (player.kickboxingSeq2Window || 0) > 0) ||
      (player.kickboxingAutoSeq2Timer && player.kickboxingAutoSeq2Timer > 0)
    );
    if (!isKickboxingSeq2Ready && ((player.heavyCooldown || 0) > 0 || (player.strikeCooldown || 0) > 0 || (player.postS4HeavyLockout || 0) > 0 || (player.keysiVulnerableTimer || 0) > 0)) return;
    if (player.styleId === 'capoeira' && player.capoeiraExhausted) return;
    if (player.styleId === 'aikido' && player.aikiM2StanceTimer && player.aikiM2StanceTimer > 0) return;

    // SECTION 1.18 - FIX 3: Global M2 Retraction Override
    // Initiating an M2 Heavy Strike at any point immediately cancels any active M1 retraction or DS timer.
    // The recovering arm is instantly cleared to neutral, and the M2 windup initiates on Frame 1.
    applyGlobalM2RetractionOverride(player);

    // Section 2.8: Post-Block Action Delay (0.10s = 6 frames attack lockout)
    // Iron Boxing (boxing_shell) Passive: Blocking no longer adds postdelay on M2, dropping guard directly into M2!
    const isIronBoxing = player.styleId === 'boxing_shell';
    const isAfterParry = (player.afterParryGraceTimer || 0) > 0 || (player.parryFlashTime || 0) > 0 || (player.parryBlockGraceTimer || 0) > 0;
    if (!isIronBoxing && player.postBlockAttackLockout && player.postBlockAttackLockout > 0) {
      if (isAfterParry) {
        player.postBlockAttackLockout = 0;
      } else {
        if ((player.lastBlockDelayTextTimer || 0) <= 0) {
          player.lastBlockDelayTextTimer = 6;
          spawnFloatingText(player.x, player.y - 30, 'POST-BLOCK DELAY (0.1s)', '#f59e0b');
        }
        return;
      }
    }
    if (player.isBlocking) {
      player.isBlocking = false;
      setIsPlayerBlocking(false);
      if (!isIronBoxing && !isAfterParry && player.styleId !== 'capoeira') {
        player.postBlockAttackLockout = 6; // Section 2.8: Dropping active guard imposes 0.10s attack delay
        if ((player.lastBlockDelayTextTimer || 0) <= 0) {
          player.lastBlockDelayTextTimer = 6;
          spawnFloatingText(player.x, player.y - 30, 'POST-BLOCK DELAY (0.1s)', '#f59e0b');
        }
        return;
      } else {
        player.postBlockAttackLockout = 0;
      }
    }

    // Rule 2: Heavy Attack Animation Lockout (Windup + Active Hitbox + Recovery Frames)
    const isHeavyPunching = player.fists.some(f => f.isPunching && f.isHeavy);
    const isHeavyExecuting = (player.heavyWindup || 0) > 0 || isHeavyPunching || (player.ashiharaM2Stage && player.ashiharaM2Stage > 0) || (player.ashiharaRecoveryTimer && player.ashiharaRecoveryTimer > 0) || (player.cqcM2Stage && player.cqcM2Stage !== null) || !!player.keysiClinchStage;
    if (!isKickboxingSeq2Ready && isHeavyExecuting) return;

    // Prevent double-attack trigger if heavy attack is actively extending forward
    const isHeavyExtending = player.fists.some(f => f.isPunching && f.isHeavy) || ((player.shellRetractionHoldTimer || 0) > 0);
    if (!isKickboxingSeq2Ready && isHeavyExtending) return;

    // Charge heavy hook
    handleSprintM2Cancel(player, 60);
    const playerMods = getHeightModifiers(player.baseHeight);
    stateRef.current.totalSwings = (stateRef.current.totalSwings || 0) + 1;
    setTotalSwings(stateRef.current.totalSwings);
    
    let windupFrames = 48;
    if (player.styleId === 'street_boxing') {
      windupFrames = 24; // Normalized standard windup (~0.4s)
      player.isDashing = false; // No Iframes!
      player.dashProgress = 0;
      player.streetBoxingM2Stage = 1;
      player.streetBoxingM2Hits = 0;
      player.streetBoxingUnbreakable = false;
      player.streetBoxingM2NextTimer = 0;
    } else if (player.styleId === 'shotokan') {
      windupFrames = 30; // 0.5s spinning hook kick windup
      player.isDashing = true;
      player.dashProgress = 30; // I-Frame Blitz Dash during spin
      const dashForce = 6.5;
      player.vx = Math.cos(player.facingAngle) * dashForce;
      player.vy = Math.sin(player.facingAngle) * dashForce;
      player.attackLockedAngle = player.facingAngle; // LOCK THE ATTACK DIRECTION!
    } else if (player.styleId === 'ashihara') {
      if (player.ashiharaParryLockout && player.ashiharaParryLockout > 0) {
        return;
      }
      windupFrames = 27; // 0.45s Mawashi Uke active parry window
      player.ashiharaM2Stage = 1;
      player.ashiharaM2Timer = 27;
      player.ashiharaParryLockout = 48; // 0.8s (48 frames) lockout to stop accidental misclick during parry
      if (dummy) {
        dummy.parryLockoutTimer = 60; // 1s Parry Disable Passive
        spawnFloatingText(dummy.x, dummy.y - 45, 'PARRY DISABLED (1s)', '#ef4444');
      }
    } else if (player.styleId === 'basic') {
      windupFrames = 24; // 0.4s (24 frames) Sway Sprint M2
      player.isDashing = false;
      player.dashProgress = 0;
      player.dashAngle = undefined;
      player.attackLockedAngle = player.facingAngle; // Direction locked towards aimed direction at the instant M2 is pressed
      const forwardSpeed = 7.5 * playerMods.speedFactor;
      player.vx = Math.cos(player.attackLockedAngle) * forwardSpeed;
      player.vy = Math.sin(player.attackLockedAngle) * forwardSpeed;
    } else if (player.styleId === 'capoeira') {
      windupFrames = 30; // 0.5s spinning wheel kick windup
    } else if (player.styleId === 'kickboxing') {
      if (isKickboxingSeq2Ready) {
        windupFrames = 18; // 0.3s (18 Frames) Knee Chamber Teep Front Kick windup
        player.kickboxingIsSeq2 = true;
        player.kickboxingSeq2Ready = false;
        player.kickboxingSeq2Window = 0;
        player.kickboxingAutoSeq2Timer = 0;
        player.strikeCooldown = 0;
        player.fists.forEach(f => {
          f.isPunching = false;
          f.punchProgress = 0;
          f.isHeavy = false;
        });
      } else {
        player.kickboxingIsSeq2 = false;
        if (player.hasChainReaction) {
          windupFrames = 15; // 0.25s windup via Chain Reaction
          player.hasChainReaction = false;
        } else {
          windupFrames = 26; // 0.44s windup standard (buffed from 30 frames/0.5s)
        }
      }
    } else if (player.styleId === 'keysi') {
      player.isDashing = false;
      player.dashProgress = 0;
      player.vx = 0;
      player.vy = 0;
      if (player.keysiM2Primed) {
        windupFrames = 6; // 0.10s rapid windup (6 frames @ 60 FPS)
        player.keysiM2Primed = false;
        player.keysiHasSuperArmor = true;
        player.maxHeavyWindup = 6;
        spawnFloatingText(player.x, player.y - 30, 'CLINCH SURGE (0.1s)!', '#ef4444');
      } else {
        windupFrames = 26; // 0.43s standard windup
        player.keysiHasSuperArmor = false;
        player.maxHeavyWindup = 26;
      }
    } else if (player.styleId === 'cqc') {
      windupFrames = 90; // 1.5s tactical sonar windup (90 frames)
      player.cqcM2Stage = 'windup';
      player.cqcWindupTimer = 90;
      player.cqcLockedTarget = null;
      // 8 Echo Rings with 20% decreased max range (272px)
      player.cqcRings = Array.from({ length: 8 }, (_, i) => ({
        r: 0,
        maxR: Math.round(((i + 1) / 8) * 272),
        frozen: false
      }));
      spawnFloatingText(player.x, player.y - 30, 'ECHO SCANNING (8 RINGS)...', '#ef4444');
    } else if (player.styleId === 'kyokushin') {
      windupFrames = 33; // 0.55s Kinetic Absorption Heavy Strike windup
    } else if (player.styleId === 'aikido') {
      windupFrames = 9; // 0.15s stance activation
      player.aikiM2StanceTimer = 300; // 5.0s stance buff duration
      player.aikiM2SuperArmorHits = 2; // 2-Hit Super Armor
      player.aikiM2HitLanded = false;
      player.aikiManualM2UsedInSequence = true;
      soundManager.playParry();
      spawnFloatingText(player.x, player.y - 30, 'AIKI REDIRECTION STANCE', '#0284c7');
    }

    // Heavy Windup Passives:
    // 1. Basic [ Reflex Pivot ]: 0.1s windup after dodging
    if (player.hasReflexPivot) {
      windupFrames = 6;
      player.hasReflexPivot = false;
      if (player.styleId === 'basic') {
        player.isDashing = false;
        player.dashProgress = 0;
        player.dashAngle = undefined;
        player.attackLockedAngle = player.facingAngle;
        const forwardSpeed = 7.5 * playerMods.speedFactor;
        player.vx = Math.cos(player.attackLockedAngle) * forwardSpeed;
        player.vy = Math.sin(player.attackLockedAngle) * forwardSpeed;
      }
    } 
    // 2. Muay Thai [ Breach Pressure ]: 0.1s windup if opponent is holding block
    else if (player.styleId === 'muay_thai' && dummy && dummy.isBlocking) {
      windupFrames = 6;
    } else if (player.styleId === 'muay_thai') {
      windupFrames = 27; // 0.445s Clinch Knee Strike windup
    } else if (player.styleId === 'slugger') {
      windupFrames = 48;
    } else if (player.styleId === 'boxing_shell') {
      windupFrames = 11; // 0.18s (11 frames) Shoulder deflection roll chamber before push to allow parry counter
    }

    if (player.keysiStaggerTimer && player.keysiStaggerTimer > 0) {
      windupFrames = Math.round(windupFrames * 1.60);
    }

    player.fists.forEach(f => {
      f.hasHit = false;
    });
    player.heavyWindup = windupFrames;
    
    syncCombatStatesToUI();
    sendImmediateWsGameState();
  };

  // Complete heavy hook action after windup finishes
  const applyHeavyWhiffPenalty = (fighter: Fighter) => {
    const fighterMods = getHeightModifiers(fighter.baseHeight);
    const speed = fighterMods.speedFactor;

    if (fighter.styleId === 'basic') {
      fighter.heavyCooldown = Math.max(fighter.heavyCooldown || 0, 840); // 14.0s whiff
      fighter.strikeCooldown = Math.max(fighter.strikeCooldown || 0, 30);
      spawnFloatingText(fighter.x, fighter.y - 30, 'WHIFF RECOVERY (14.0s)', '#ef4444');
    } else if (fighter.styleId === 'muay_thai') {
      fighter.heavyCooldown = Math.max(fighter.heavyCooldown || 0, 180); // 3.0s whiff
      fighter.stunTime = Math.max(fighter.stunTime || 0, 40);
      spawnFloatingText(fighter.x, fighter.y - 30, 'WHIFF RECOVERY (3.0s)', '#ef4444');
    } else if (fighter.styleId === 'keysi') {
      const baseWhiffCd = 720; // 12.0s whiff CD
      fighter.keysiVulnerableTimer = 300; // 5.0s Over-Extended Vulnerability
      fighter.keysiWhiffCooldownQueued = true;
      fighter.keysiQueuedWhiffCd = baseWhiffCd;
      fighter.heavyCooldown = 300 + baseWhiffCd; // 1020 frames (17.0s total): heavy CD active during vulnerability + subsequent 12s CD
      fighter.strikeCooldown = Math.max(fighter.strikeCooldown || 0, 36); // 0.60s strike lockout
      fighter.keysiHasSuperArmor = false;
      fighter.heavyWindup = 0;
      fighter.keysiClinchStage = null;
      fighter.keysiClinchTarget = null;
      spawnFloatingText(fighter.x, fighter.y - 30, 'OVER-EXTENDED! (+30% DMG / -60% SPD)', '#ef4444');
    } else if (fighter.styleId === 'aikido') {
      fighter.heavyCooldown = Math.max(fighter.heavyCooldown || 0, 540); // 9.0s whiff cooldown
      spawnFloatingText(fighter.x, fighter.y - 30, 'STANCE WHIFF (9.0s CD)', '#ef4444');
    } else if (fighter.styleId === 'ashihara') {
      fighter.heavyCooldown = Math.max(fighter.heavyCooldown || 0, 300); // 5.0s whiff
      fighter.ashiharaRecoveryTimer = 30; // 0.5s recovery lockout on whiff
      spawnFloatingText(fighter.x, fighter.y - 30, 'SABAKI COUNTER WHIFF (5.0s)', '#ef4444');
    } else if (fighter.styleId === 'shotokan') {
      fighter.heavyCooldown = Math.max(fighter.heavyCooldown || 0, 720); // 12.0s whiff
      fighter.crippleTime = Math.max(fighter.crippleTime || 0, 60);
      spawnFloatingText(fighter.x, fighter.y - 30, 'BACK KICK WHIFF (12.0s)', '#ef4444');
    } else if (fighter.styleId === 'kyokushin') {
      fighter.heavyCooldown = Math.max(fighter.heavyCooldown || 0, 564); // 9.4s whiff
      fighter.stunTime = Math.max(fighter.stunTime || 0, 40);
      spawnFloatingText(fighter.x, fighter.y - 30, 'WHIFF RECOVERY (9.4s)', '#ef4444');
    } else if (fighter.styleId === 'capoeira') {
      fighter.heavyCooldown = Math.max(fighter.heavyCooldown || 0, 360); // 6.0s whiff
      fighter.capoeiraWhiffBonusActive = true;
      spawnFloatingText(fighter.x, fighter.y - 30, 'WHIFF RECOVERY (6.0s)', '#ca8a04');
    } else if (fighter.styleId === 'slugger') {
      fighter.heavyCooldown = Math.max(fighter.heavyCooldown || 0, 480); // 8.0s whiff
      fighter.stunTime = Math.max(fighter.stunTime || 0, 72);
      spawnFloatingText(fighter.x, fighter.y - 30, 'HAYMAKER WHIFF (8.0s)', '#dc2626');
    } else if (fighter.styleId === 'kickboxing') {
      const isSeq2 = !!fighter.kickboxingIsSeq2;
      fighter.kickboxingSeq2Ready = false;
      fighter.kickboxingSeq2Window = 0;
      fighter.heavyCooldown = Math.max(fighter.heavyCooldown || 0, 660); // 11.0s whiff
      const recoveryFrames = isSeq2 ? 48 : 36;
      fighter.stunTime = Math.max(fighter.stunTime || 0, recoveryFrames);
      fighter.blockLockout = Math.max(fighter.blockLockout || 0, recoveryFrames);
      fighter.strikeCooldown = Math.max(fighter.strikeCooldown || 0, recoveryFrames);
      spawnFloatingText(fighter.x, fighter.y - 30, 'WHIFF RECOVERY (11.0s)', '#ef4444');
    } else if (fighter.styleId === 'cqc') {
      fighter.heavyCooldown = Math.max(fighter.heavyCooldown || 0, 900); // 15.0s
      fighter.strikeCooldown = Math.max(fighter.strikeCooldown || 0, 36);
      spawnFloatingText(fighter.x, fighter.y - 30, 'CQC RECOVERY (15.0s)', '#ef4444');
    } else if (fighter.styleId === 'boxing_shell') {
      fighter.heavyCooldown = Math.max(fighter.heavyCooldown || 0, 600); // 10.0s whiff cooldown
      fighter.strikeCooldown = Math.max(fighter.strikeCooldown || 0, 24);
      spawnFloatingText(fighter.x, fighter.y - 30, 'WHIFF RECOVERY (10.0s)', '#ef4444');
    } else if (fighter.styleId === 'street_boxing') {
      fighter.heavyCooldown = Math.max(fighter.heavyCooldown || 0, 480); // 8.0s (480 frames) whiff cooldown
      fighter.strikeCooldown = Math.max(fighter.strikeCooldown || 0, 18);
      fighter.streetBoxingM2Stage = 0;
      fighter.streetBoxingM2Hits = 0;
      fighter.streetBoxingM2NextTimer = 0;
      fighter.streetBoxingUnbreakable = false;
      spawnFloatingText(fighter.x, fighter.y - 30, 'WHIFF RECOVERY (8.0s)', '#ef4444');
    }
  };

  const executePlayerHeavyAttack = () => {
    const state = stateRef.current;
    const player = state.player;
    const dummy = state.dummy;
    if (!player || player.isDead) return;

    if (player.styleId === 'ashihara') {
      player.heavyWindup = 0;
      player.ashiharaM2Stage = 0;
      player.ashiharaRecoveryTimer = 30; // 0.5s recovery lockout on whiff
      player.heavyCooldown = 270; // 4.5s (270 frames) Cooldown on whiff
      spawnFloatingText(player.x, player.y - 30, 'MAWASHI UKE WHIFF (0.5s)', '#ef4444');
      syncCombatStatesToUI();
      return;
    }

    if (player.styleId === 'keysi') {
      player.heavyWindup = 0;
      player.keysiClinchStage = 'delay';
      player.keysiClinchTimer = 8; // smooth grab initiation delay
      player.keysiClinchTarget = dummy && !dummy.isDead ? dummy : null;
      soundManager.playDash();
      syncCombatStatesToUI();
      return;
    }

    if (player.styleId === 'cqc') {
      player.heavyWindup = 0;
      const target = player.cqcLockedTarget || (dummy && !dummy.isDead && Math.hypot(dummy.x - player.x, dummy.y - player.y) <= 272 ? dummy : null);
      if (target && !target.isDead) {
        player.cqcM2Stage = 'dash';
        player.cqcLockedTarget = target;
        player.isDashing = true;

        const startX = player.x;
        const startY = player.y;
        const dashAngle = Math.atan2(target.y - startY, target.x - startX);
        const distToTarget = Math.hypot(target.x - startX, target.y - startY);
        const passThroughDist = distToTarget + target.radius + player.radius + 20;

        player.cqcDashStartX = startX;
        player.cqcDashStartY = startY;
        player.cqcDashEndX = startX + Math.cos(dashAngle) * passThroughDist;
        player.cqcDashEndY = startY + Math.sin(dashAngle) * passThroughDist;
        player.cqcDashTotalFrames = 18; // ~0.30s smooth visible glide
        player.dashProgress = 18;
        player.facingAngle = dashAngle;
        player.cqcRings = undefined;
        player.heavyCooldown = 900; // 15.0s cooldown set on dash initiation

        soundManager.playDash();
        spawnFloatingText(player.x, player.y - 30, 'TACTICAL BLITZ!', '#ef4444');
      } else {
        player.cqcM2Stage = null;
        player.cqcRings = undefined;
        player.cqcLockedTarget = null;
        player.isDashing = false;
        player.dashProgress = 0;
        applyHeavyWhiffPenalty(player);
      }
      syncCombatStatesToUI();
      return;
    }

    if (player.styleId === 'aikido') {
      player.heavyWindup = 0;
      player.aikiM2StanceTimer = 300; // 5.0s stance duration
      player.aikiM2SuperArmorHits = 2; // 2-hit Super Armor
      player.aikiM2HitLanded = false;
      player.heavyCooldown = 780; // 13.0s CD
      soundManager.playParry();
      spawnFloatingText(player.x, player.y - 30, 'AIKI REDIRECTION STANCE (5.0s)', '#0284c7');
      syncCombatStatesToUI();
      return;
    }

    // Reset all fists state to guarantee single fist attack and prevent duplicate hits
    player.fists.forEach(f => {
      f.isPunching = false;
      f.punchProgress = 0;
      f.isHeavy = false;
      f.hasHit = false;
    });

    // Unlock locked direction
    player.attackLockedAngle = undefined;

    // Visual glove lunging: Flow Boxing uses lead jab ('left'), Street Boxing uses 'left' hook on stage 3, others use 'right'
    const punchType = player.styleId === 'basic' ? 'left' : ((player.styleId === 'street_boxing' && player.streetBoxingM2Stage === 3) ? 'left' : 'right');
    const fist = player.fists.find(f => f.punchType === punchType) || player.fists[0];
    if (fist) {
      fist.isPunching = true;
      fist.punchProgress = 0;
      fist.isHeavy = true;
      fist.hasHit = false;
      (fist as any).kickboxingSeq2 = !!player.kickboxingIsSeq2;
    }

    if (player.styleId === 'street_boxing') {
      player.isDashing = false;
      player.dashProgress = 0;
      if (!player.streetBoxingM2Stage) player.streetBoxingM2Stage = 1;
    }

    if (player.styleId === 'kyokushin') {
      const rightFist = player.fists.find(f => f.punchType === 'right');
      const leftFist = player.fists.find(f => f.punchType === 'left');
      if (rightFist) {
        rightFist.isPunching = true;
        rightFist.punchProgress = 0;
        rightFist.isHeavy = true;
        rightFist.hasHit = false;
      }
      if (leftFist) {
        leftFist.isPunching = false;
        leftFist.punchProgress = 0;
        leftFist.isHeavy = false;
        leftFist.hasHit = true; // STRICTLY DISABLED HITBOX: aesthetic counterbalance and guard frame only
      }
      player.kyokushinM2PeakHoldTimer = 0;
      const glideSpeed = 5.0;
      player.vx += Math.cos(player.facingAngle) * glideSpeed;
      player.vy += Math.sin(player.facingAngle) * glideSpeed;
    }

    if (player.styleId === 'capoeira') {
      soundManager.playCapoeiraWhoosh();
    } else {
      soundManager.playDash();
    }

    player.heavyWindup = 0;

    // Maintain active I-Frames through execution phase for evasive M2 styles (Capoeira has built-in I-frames without gliding dash)
    if (player.styleId === 'shotokan') {
      player.isDashing = true;
      player.dashProgress = 24; // 24 frames (~0.4s) of active punch/kick I-frame protection
    }

    player.lightCooldown = 24; // 0.4s light attack lockout after heavy

    syncCombatStatesToUI();
  };

  // Sparring Dummy AI Heavy Attack Execution
  const executeDummyHeavyAttack = () => {
    const state = stateRef.current;
    const dummy = state.dummy;
    const player = state.player;
    if (!dummy || dummy.isDead) return;

    if (dummy.styleId === 'ashihara') {
      dummy.heavyWindup = 0;
      dummy.ashiharaM2Stage = 0;
      dummy.ashiharaRecoveryTimer = 30; // 0.5s recovery lockout on whiff
      dummy.heavyCooldown = 270; // 4.5s (270 frames) Cooldown on whiff
      spawnFloatingText(dummy.x, dummy.y - 30, 'MAWASHI UKE WHIFF (0.5s)', '#ef4444');
      syncCombatStatesToUI();
      return;
    }

    if (dummy.styleId === 'keysi') {
      dummy.heavyWindup = 0;
      dummy.keysiClinchStage = 'delay';
      dummy.keysiClinchTimer = 8; // smooth grab initiation delay
      dummy.keysiClinchTarget = player && !player.isDead ? player : null;
      soundManager.playDash();
      syncCombatStatesToUI();
      return;
    }

    if (dummy.styleId === 'cqc') {
      dummy.heavyWindup = 0;
      const target = dummy.cqcLockedTarget || (player && !player.isDead && Math.hypot(player.x - dummy.x, player.y - dummy.y) <= 272 ? player : null);
      if (target && !target.isDead) {
        dummy.cqcM2Stage = 'dash';
        dummy.cqcLockedTarget = target;
        dummy.isDashing = true;

        const startX = dummy.x;
        const startY = dummy.y;
        const dashAngle = Math.atan2(target.y - startY, target.x - startX);
        const distToTarget = Math.hypot(target.x - startX, target.y - startY);
        const passThroughDist = distToTarget + target.radius + dummy.radius + 20;

        dummy.cqcDashStartX = startX;
        dummy.cqcDashStartY = startY;
        dummy.cqcDashEndX = startX + Math.cos(dashAngle) * passThroughDist;
        dummy.cqcDashEndY = startY + Math.sin(dashAngle) * passThroughDist;
        dummy.cqcDashTotalFrames = 18; // ~0.30s smooth visible glide
        dummy.dashProgress = 18;
        dummy.facingAngle = dashAngle;
        dummy.cqcRings = undefined;
        dummy.heavyCooldown = 900; // 15.0s cooldown set on dash initiation

        soundManager.playDash();
        spawnFloatingText(dummy.x, dummy.y - 30, 'TACTICAL BLITZ!', '#ef4444');
      } else {
        dummy.cqcM2Stage = null;
        dummy.cqcRings = undefined;
        dummy.cqcLockedTarget = null;
        dummy.isDashing = false;
        dummy.dashProgress = 0;
        applyHeavyWhiffPenalty(dummy);
      }
      syncCombatStatesToUI();
      return;
    }

    if (dummy.styleId === 'aikido') {
      dummy.heavyWindup = 0;
      dummy.aikiM2StanceTimer = 300; // 5.0s stance duration
      dummy.aikiM2SuperArmorHits = 2; // 2-hit Super Armor
      dummy.aikiM2HitLanded = false;
      dummy.heavyCooldown = 780; // 13.0s CD
      soundManager.playParry();
      spawnFloatingText(dummy.x, dummy.y - 30, 'AIKI REDIRECTION STANCE (5.0s)', '#0284c7');
      syncCombatStatesToUI();
      return;
    }

    dummy.fists.forEach(f => {
      f.isPunching = false;
      f.punchProgress = 0;
      f.isHeavy = false;
      f.hasHit = false;
    });

    // Unlock locked direction
    dummy.attackLockedAngle = undefined;

    const punchType = dummy.styleId === 'basic' ? 'left' : ((dummy.styleId === 'street_boxing' && dummy.streetBoxingM2Stage === 3) ? 'left' : 'right');
    const fist = dummy.fists.find(f => f.punchType === punchType) || dummy.fists[0];
    if (fist) {
      fist.isPunching = true;
      fist.punchProgress = 0;
      fist.isHeavy = true;
      fist.hasHit = false;
      (fist as any).kickboxingSeq2 = !!dummy.kickboxingIsSeq2;
    }

    if (dummy.styleId === 'street_boxing') {
      dummy.isDashing = false;
      dummy.dashProgress = 0;
      if (!dummy.streetBoxingM2Stage) dummy.streetBoxingM2Stage = 1;
    }

    if (dummy.styleId === 'kyokushin') {
      const rightFist = dummy.fists.find(f => f.punchType === 'right');
      const leftFist = dummy.fists.find(f => f.punchType === 'left');
      if (rightFist) {
        rightFist.isPunching = true;
        rightFist.punchProgress = 0;
        rightFist.isHeavy = true;
        rightFist.hasHit = false;
      }
      if (leftFist) {
        leftFist.isPunching = false;
        leftFist.punchProgress = 0;
        leftFist.isHeavy = false;
        leftFist.hasHit = true; // STRICTLY DISABLED HITBOX: aesthetic counterbalance and guard frame only
      }
      dummy.kyokushinM2PeakHoldTimer = 0;
      const glideSpeed = 5.0;
      dummy.vx += Math.cos(dummy.facingAngle) * glideSpeed;
      dummy.vy += Math.sin(dummy.facingAngle) * glideSpeed;
    }

    if (dummy.styleId === 'capoeira') {
      soundManager.playCapoeiraWhoosh();
    } else {
      soundManager.playDash();
    }
    dummy.heavyWindup = 0;

    if (dummy.styleId === 'shotokan') {
      dummy.isDashing = true;
      dummy.dashProgress = 24;
    }

    dummy.lightCooldown = 24;
    syncCombatStatesToUI();
  };

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
    if (!isPlaying || isDead || stateRef.current.cinematicZoomActive || stateRef.current.matchEnded || stateRef.current.player?.isDead || stateRef.current.dummy?.isDead) return;

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
    if (!isPlaying || isDead || stateRef.current.cinematicZoomActive || stateRef.current.matchEnded || stateRef.current.player?.isDead || stateRef.current.dummy?.isDead) return;

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

  // Main Arena Physics Update Loop
  const updatePhysics = () => {
    const state = stateRef.current;
    const player = state.player;
    const dummy = state.dummy;
    const arenaSize = state.arenaSize;

    if ((matchData?.isCompetitive || matchData?.isAiMatch) && state.rankedState !== 'fighting') {
      if (player) {
        player.vx = 0;
        player.vy = 0;
        resetFighterRoundState(player);
      }
      if (dummy) {
        dummy.vx = 0;
        dummy.vy = 0;
        resetFighterRoundState(dummy);
      }
      state.shakeAmount = 0;
      state.visionBlurTime = 0;
      state.shakyVisionTimer = 0;
      return;
    }

    if (state.infiniteStamina) {
      if (player) {
        player.strikeCooldown = 0;
        player.lightCooldown = 0;
        player.heavyCooldown = 0;
        player.dashCooldown = 0;
        player.capoeiraExhausted = false;
        player.capoeiraStacks = 3;
      }
      if (dummy) {
        dummy.strikeCooldown = 0;
        dummy.lightCooldown = 0;
        dummy.heavyCooldown = 0;
        dummy.dashCooldown = 0;
        dummy.capoeiraExhausted = false;
        dummy.capoeiraStacks = 3;
      }
    }

    if (dummy && dummyBehavior === 'test_ai') {
      dummy.health = dummy.maxHealth;
      dummy.isDead = false;
      dummy.vx = 0;
      dummy.vy = 0;
      dummy.targetX = dummy.x;
      dummy.targetY = dummy.y;
      dummy.isBlocking = false;
      dummy.isDashing = false;
      dummy.isSprinting = false;
      dummy.fists.forEach(f => {
        f.isPunching = false;
        f.punchProgress = 0;
        f.isHeavy = false;
        f.hasHit = false;
      });
    }

    // Slugger M2 Cataclysm Impact Frame & Slow-Motion sequence
    updateImpactFrame(state.gameTime);

    // 0. Hitstop frame freeze
    if (state.hitstopTime > 0) {
      state.hitstopTime--;
      return;
    }

    // 1. Screenshake, shaky vision and vision blur decay
    if (state.shakeAmount > 0) {
      state.shakeAmount *= 0.9;
      if (state.shakeAmount < 0.1) state.shakeAmount = 0;
    }
    if (state.visionBlurTime > 0) {
      state.visionBlurTime--;
    }
    if (state.shakyVisionTimer > 0) {
      state.shakyVisionTimer--;
    }

    // Hot Potato Gamemode Fuse Countdown & Explosion Logic
    if (matchData?.gamemode === 'hot_potato' && state.rankedState === 'fighting') {
      state.potatoFuseTimer = (state.potatoFuseTimer !== undefined ? state.potatoFuseTimer : 1200) - 1;
      const fuseSeconds = Math.max(0, Math.ceil(state.potatoFuseTimer / 60));
      setPotatoFuseLeft(fuseSeconds);

      if (state.potatoFuseTimer <= 0) {
        state.potatoFuseTimer = 1200;
        const victim = state.potatoHolder === 'player' ? state.player : state.dummy;
        const winner = state.potatoHolder === 'player' ? 'opponent' : 'player';

        if (victim) {
          victim.health = 0;
          victim.isDead = true;

          // Huge explosion particle burst
          for (let i = 0; i < 35; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 8 + 3;
            state.particles.push({
              id: `potato_boom_${Math.random()}`,
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

          state.shakeAmount = 30 * settings.screenShake;
          soundManager.playKO();
          spawnFloatingText(victim.x, victim.y - 45, '💥 POTATO EXPLODED!', '#ef4444');
          handleRoundWinner(winner);
        }
      }
    }

    // 2. Update Player Physics
    if (player && !player.isDead) {
      // Forward vector and posture tracking for Ranked Evaluation Matrix
      if (state.rankedState === 'fighting' && dummy && !dummy.isDead) {
        matchTotalFramesRef.current += 1;
        const dx = dummy.x - player.x;
        const dy = dummy.y - player.y;
        const dot = player.vx * dx + player.vy * dy;
        if (dot > 0.05) {
          matchForwardFramesRef.current += 1;
        }
        if (dummy.isPostureLocked && (dummy.postureCd || 0) >= 60) {
          matchPostureBreaksRef.current = Math.max(matchPostureBreaksRef.current, 1);
        }
        const maxP = player.maxPostureCd || 78;
        const curPosturePct = Math.round(Math.max(0, (maxP - (player.postureCd || 0)) / maxP) * 100);
        if (curPosturePct < playerMinPosturePctRef.current) {
          playerMinPosturePctRef.current = curPosturePct;
        }
      }

      // Stun/Stagger timers decay
      if (player.armorBreakTime && player.armorBreakTime > 0) {
        player.armorBreakTime--;
        player.isBlocking = false;
      }

      // Block duration and parry visual flashing
      if (player.isBlocking && (player.armorBreakTime || 0) <= 0) {
        player.blockTimer = (player.blockTimer || 0) + 1;
      } else {
        player.blockTimer = 0;
      }

      if ((player.spinOutTimer && player.spinOutTimer > 0) || (player.kyokushinSpinOutTimer && player.kyokushinSpinOutTimer > 0)) {
        if (player.spinOutTimer) player.spinOutTimer--;
        if (player.kyokushinSpinOutTimer) player.kyokushinSpinOutTimer--;
        player.facingAngle += (Math.PI * 2) / 18; // Involuntary rapid 360° rotation in place for 0.3s (18 frames)
        player.isBlocking = false;
        player.heavyWindup = 0;
        player.fists.forEach(f => {
          f.isPunching = false;
          f.punchProgress = 0;
        });
        if ((!player.spinOutTimer || player.spinOutTimer === 0) && (!player.kyokushinSpinOutTimer || player.kyokushinSpinOutTimer === 0)) {
          player.postBlockAttackLockout = 27; // 0.45s Post-Block Action Delay AFTER downed slide
        }
      }

      if (player.aikiCentrifugalKnockbackTimer && player.aikiCentrifugalKnockbackTimer > 0) {
        player.aikiCentrifugalKnockbackTimer--;
      }

      if (player.kyokushinM2FreezeTimer && player.kyokushinM2FreezeTimer > 0) {
        player.kyokushinM2FreezeTimer--;
      }

      if (player.parryFlashTime && player.parryFlashTime > 0) {
        player.parryFlashTime--;
      }

      // Heavy windup timing
      if (player.heavyWindup && player.heavyWindup > 0) {
        player.heavyWindup--;
        
        if ((player.styleId === 'kickboxing' && player.kickboxingIsSeq2) || player.styleId === 'basic') {
          // Keep forward momentum during Flow Boxing Sway Sprint M2 or Kickboxing S2 rapid chamber
          if (player.styleId === 'basic' && player.attackLockedAngle !== undefined) {
            const pMods = getHeightModifiers(player.baseHeight);
            const forwardSpeed = 7.5 * pMods.speedFactor;
            player.vx = Math.cos(player.attackLockedAngle) * forwardSpeed;
            player.vy = Math.sin(player.attackLockedAngle) * forwardSpeed;
            player.facingAngle = player.attackLockedAngle;
          }
        } else {
          player.vx = 0;
          player.vy = 0;
        }

        if (player.heavyWindup === 0) {
          executePlayerHeavyAttack();
        }
      }

      if (player.ashiharaRecoveryTimer && player.ashiharaRecoveryTimer > 0) {
        player.ashiharaRecoveryTimer--;
      }
      if (player.ashiharaParryLockout && player.ashiharaParryLockout > 0) {
        player.ashiharaParryLockout--;
      }
      if (player.parryLockoutTimer && player.parryLockoutTimer > 0) {
        player.parryLockoutTimer--;
      }

      // Damage flashing decays
      if (player.damageFlashTime > 0) player.damageFlashTime--;
      if (player.superArmorFlashTime && player.superArmorFlashTime > 0) player.superArmorFlashTime--;
      if (player.cqcM2HitFlashTime && player.cqcM2HitFlashTime > 0) player.cqcM2HitFlashTime--;
      if (player.capoeiraDodgeFlashTime && player.capoeiraDodgeFlashTime > 0) player.capoeiraDodgeFlashTime--;

      // Concussion slow timer decay
      if (player.concussTime && player.concussTime > 0) player.concussTime--;

      if (player.stunTime && player.stunTime > 0) player.stunTime--;
      if (player.m2StunTimer && player.m2StunTimer > 0) {
        player.m2StunTimer--;
        if (!player.stunTime || player.stunTime <= 0) player.m2StunTimer = 0;
      }
      if (player.parriedStun && player.parriedStun > 0) player.parriedStun--;
      if (player.cqcAttackLockout && player.cqcAttackLockout > 0) player.cqcAttackLockout--;
      if (player.keysiAttackLockout && player.keysiAttackLockout > 0) player.keysiAttackLockout--;
      if (player.pensadorLungeWindow && player.pensadorLungeWindow > 0) player.pensadorLungeWindow--;
      if (player.hitSteeringLock && player.hitSteeringLock > 0) player.hitSteeringLock--;
      if (player.hitMovementLock && player.hitMovementLock > 0) player.hitMovementLock--;
      if (player.blockLockout && player.blockLockout > 0) {
        player.blockLockout--;
        player.isBlocking = false;
        setIsPlayerBlocking(false);
      }

      if (player.blockUseResetTimer && player.blockUseResetTimer > 0) {
        player.blockUseResetTimer--;
        if (player.blockUseResetTimer <= 0) {
          player.blockUseCount = 0;
        }
      }

      // Defensive Input Buffering: holding block during stun queues guard and raises on Frame 1 recovery
      const isBlockInputActive = !!(state.isBlockInputHeld || state.keysPressed?.['KeyF'] || player.isBlockInputHeld);
      if (isBlockInputActive) {
        if (!player.isBlocking && canFighterRaiseGuard(player)) {
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
          // Instantaneous Frame 1 recovery block activation!
          player.isBlocking = true;
          player.blockTimer = 0;
          setIsPlayerBlocking(true);
        }
      } else {
        if (player.isBlocking) {
          player.isBlocking = false;
          player.kyokushinBlockHitsTaken = 0;
          player.blockLockout = Math.max(player.blockLockout || 0, BLOCK_COOLDOWN_FRAMES);
          // Section 2.8: Post-Block Attack Re-Initiation Delay (0.10s = 6 frames)
          player.postBlockAttackLockout = Math.max(player.postBlockAttackLockout || 0, 6);
          setIsPlayerBlocking(false);
        }
      }

      // Section 2.8 Timers decay & Delayed Momentum Stop
      if (player.lastHitBeforeDashTimer && player.lastHitBeforeDashTimer > 0) player.lastHitBeforeDashTimer--;
      if (player.postM1BlockLockout && player.postM1BlockLockout > 0) player.postM1BlockLockout--;
      if (player.postDashAttackLockout && player.postDashAttackLockout > 0) player.postDashAttackLockout--;
      if (player.dashWhiteFrameFlashTime && player.dashWhiteFrameFlashTime > 0) player.dashWhiteFrameFlashTime--;
      if (player.dashHitDelayedStopTimer && player.dashHitDelayedStopTimer > 0) {
        player.dashHitDelayedStopTimer--;
        if (player.dashHitDelayedStopTimer === 0) {
          // Exactly 0.10s after impact, dash momentum stops dead in its tracks!
          player.vx = 0;
          player.vy = 0;
          player.isDashing = false;
          player.dashProgress = 0;
          player.postDashAttackLockout = 18; // 0.30s Post-Dash Attack Lockout
          spawnFloatingText(player.x, player.y - 30, 'MOMENTUM HALTED!', '#ef4444');
        }
      }

      // Post-Block Action Delay decay & tracking
      if (player.postBlockAttackLockout && player.postBlockAttackLockout > 0) {
        player.postBlockAttackLockout--;
      }
      if (player.parryBlockGraceTimer && player.parryBlockGraceTimer > 0) {
        player.parryBlockGraceTimer--;
      }
      if (player.wasBlocking && !player.isBlocking) {
        player.cqcWasBlockingAtHit4 = false;
        player.blockLockout = Math.max(player.blockLockout || 0, BLOCK_COOLDOWN_FRAMES);
        if ((player.parryFlashTime || 0) <= 0 && (player.parryBlockGraceTimer || 0) <= 0 && (!player.kyokushinSpinOutTimer || player.kyokushinSpinOutTimer <= 0)) {
          if ((player.postBlockAttackLockout || 0) <= 0) {
            player.postBlockAttackLockout = 6; // Section 2.8: 0.10s Post-Block Action Delay
          }
        } else if ((player.kyokushinSpinOutTimer || 0) > 0) {
          player.postBlockAttackLockout = 0;
        } else {
          player.postBlockAttackLockout = 0;
        }
      }
      player.wasBlocking = player.isBlocking;

      // Crippling slow timer decay
      if (player.crippleTime && player.crippleTime > 0) player.crippleTime--;
      if (player.shellLockoutTimer && player.shellLockoutTimer > 0) player.shellLockoutTimer--;
      if (player.shellSpinTimer && player.shellSpinTimer > 0) player.shellSpinTimer--;
      if (player.shellPostureBoostTimer && player.shellPostureBoostTimer > 0) player.shellPostureBoostTimer--;

      // Kickboxing Seq 2 Window decay
      if (player.kickboxingSeq2Window && player.kickboxingSeq2Window > 0) {
        player.kickboxingSeq2Window--;
        if (player.kickboxingSeq2Window === 0) {
          player.kickboxingSeq2Ready = false;
          if (player.styleId === 'kickboxing') {
            player.heavyCooldown = 270;
          }
        }
      }

      // Aikido player updates (Tenkan Aiki Flow, M2 Stance, Counter Slam window, Slam animation)
      if (player.styleId === 'aikido') {
        if (player.aikiS3FreeM2CdTimer && player.aikiS3FreeM2CdTimer > 0) {
          player.aikiS3FreeM2CdTimer--;
        }
        if (player.aikiM2StanceTimer && player.aikiM2StanceTimer > 0) {
          player.aikiM2StanceTimer--;
          if (player.aikiM2StanceTimer === 0) {
            if (!player.aikiM2HitLanded && !player.aikiFreeM2Active) {
              player.heavyCooldown = 540; // 9.0s whiff cooldown on manual M2
              spawnFloatingText(player.x, player.y - 30, 'STANCE EXPIRED (9.0s WHIFF CD)', '#ef4444');
            }
            player.aikiM2SuperArmorHits = 0;
            player.aikiM2HitLanded = false;
            player.aikiFreeM2Active = false;
          }
        }
        if (player.aikiCounterSlamWindow && player.aikiCounterSlamWindow > 0) {
          player.aikiCounterSlamWindow--;
        }
        // Smooth Aikido S2 chamber curl/uncurl transition
        const pLeftFist = player.fists ? (player.fists.find(f => f.punchType === 'left') || player.fists[0]) : undefined;
        const pRightFist = player.fists ? (player.fists.find(f => f.punchType === 'right') || player.fists[1]) : undefined;
        const pLeftProg = pLeftFist ? pLeftFist.punchProgress : 0;
        const pRightProg = pRightFist ? pRightFist.punchProgress : 0;
        const pStage = player.comboStage === 0 ? 3 : ((player.comboStage || 1) - 1);
        const pTargetCurl = ((player.comboStage === 1 && pRightProg === 0) || (pLeftProg > 0 && (pStage === 1 || pLeftFist?.comboStage === 1))) ? 1.0 : 0.0;
        const pCurrentCurl = player.aikiCurlFactor !== undefined ? player.aikiCurlFactor : 0.0;
        const pCurlSpeed = 0.10;
        if (pCurrentCurl < pTargetCurl) {
          player.aikiCurlFactor = Math.min(pTargetCurl, pCurrentCurl + pCurlSpeed);
        } else if (pCurrentCurl > pTargetCurl) {
          player.aikiCurlFactor = Math.max(pTargetCurl, pCurrentCurl - pCurlSpeed);
        }
        if (player.aikiSlamStage) {
          player.vx = 0;
          player.vy = 0;
          player.aikiSlamUninterruptible = true;
          if (player.aikiSlamTimer && player.aikiSlamTimer > 0) {
            player.aikiSlamTimer--;
            // Total slam duration: 1.5s = 90 ticks at 60 FPS
            const progress = Math.min(1.0, Math.max(0, (90 - player.aikiSlamTimer) / 90));
            player.aikiSlamFrame = Math.floor(progress * 90);
            const target = player.aikiSlamTarget || dummy;
            if (target && !target.isDead) {
              target.vx = 0;
              target.vy = 0;
              target.aikiSlamUninterruptible = true;

              // Face each other directly; neither fighter moves during the slam
              const angleToTarget = Math.atan2(target.y - player.y, target.x - player.x);
              player.facingAngle = angleToTarget;
              target.facingAngle = angleToTarget + Math.PI;

              if (progress < 0.25) {
                // Phase 1: The Wrist Clamp & Mutual Lockout (0s - 0.375s)
                player.aikiSlamStage = 'clamp';
                target.aikiSlamVictimStage = 'clamp';
                target.aikiOverheadScale = 1.0;
              } else if (progress < 0.70) {
                // Phase 2: Leverage & Overhead Elevation (0.375s - 1.05s)
                player.aikiSlamStage = 'lift';
                target.aikiSlamVictimStage = 'airborne';
                const liftT = (progress - 0.25) / 0.45;
                // Elevate target pseudo-3D height smoothly
                target.aikiOverheadScale = 1.0 + 0.35 * Math.sin(liftT * Math.PI);
              } else if (!player.aikiSlamImpactDone) {
                // Phase 3: Impact & Detonation at ~1.05s
                player.aikiSlamImpactDone = true;
                player.aikiSlamStage = 'slam';
                target.aikiSlamVictimStage = 'downed';
                target.aikiOverheadScale = 1.0;

                const slamDmg = player.aikiSlamDamage ?? 22.0;
                target.health = Math.max(0, target.health - slamDmg);
                target.damageFlashTime = 14;
                soundManager.playPunch(true);
                stateRef.current.shakeAmount = 14 * settings.screenShake;
                spawnFloatingText(target.x, target.y - 30, `OVER-HEAD SLAM! (${slamDmg.toFixed(0)} DMG)`, '#0284c7');

                stateRef.current.particles.push({
                  id: `aiki_slam_shockwave_${Math.random()}`,
                  x: target.x,
                  y: target.y,
                  vx: 0,
                  vy: 0,
                  radius: 40,
                  color: '#00E5FF',
                  alpha: 1.0,
                  life: 0,
                  maxLife: 22,
                  type: 'aiki_dual_shockwave'
                } as any);

                for (let i = 0; i < 14; i++) {
                  const pAngle = Math.random() * Math.PI * 2;
                  const pSpeed = Math.random() * 4.5 + 2.0;
                  stateRef.current.particles.push({
                    id: `aiki_slam_dust_${Math.random()}`,
                    x: target.x,
                    y: target.y,
                    vx: Math.cos(pAngle) * pSpeed,
                    vy: Math.sin(pAngle) * pSpeed,
                    radius: Math.random() * 3 + 2,
                    color: Math.random() > 0.4 ? '#00E5FF' : '#ffffff',
                    alpha: 0.9,
                    life: 0,
                    maxLife: 18,
                    type: 'spark'
                  } as any);
                }

                target.spinOutTimer = 0;
                target.kyokushinSpinOutTimer = 0;
                target.aikiSpinDownTimer = 0;
                target.superCrippleTimer = Math.max(target.superCrippleTimer || 0, 60); // 1.0s Super Cripple (M1/M2 locked & -60% speed)
                target.aikiLockoutTimer = 60;      // 1.0s M1 and M2 attack lockout
                target.aikiShakyVisionTimer = 60;  // 1.0s shaky vision disruption
                if (target.isPlayer) {
                  stateRef.current.shakyVisionTimer = 60;
                }
                target.stunTime = Math.max(target.stunTime || 0, 27);
              } else {
                // Follow-through downed state (1.05s - 1.50s)
                player.aikiSlamStage = 'slam';
                target.aikiSlamVictimStage = 'downed';
                target.aikiOverheadScale = 1.0;
              }
            }

            if (player.aikiSlamTimer === 0) {
              player.aikiSlamStage = null;
              player.aikiSlamTarget = null;
              player.aikiSlamFrame = undefined;
              player.aikiSlamBaseAngle = undefined;
              player.aikiSlamImpactDone = undefined;
              player.aikiSlamUninterruptible = false;
              if (target) {
                target.aikiSlamUninterruptible = false;
                target.aikiSlamVictimStage = null;
                target.aikiOverheadScale = 1.0;
              }
              const wasFreeSlam = !!(player.aikiFreeM2Active || player.aikiIsFreeSlam);
              player.aikiM2StanceTimer = 0;
              player.aikiFreeM2Active = false;
              player.aikiIsFreeSlam = false;
              if (!wasFreeSlam) {
                player.heavyCooldown = 300; // 5.0s M2 CD only for manual M2 slam!
              }
            }
          }
        }
      }

      // Universal timer updates for dummy & player
      if (dummy.aikiTenkanOffBalanceTimer && dummy.aikiTenkanOffBalanceTimer > 0) {
        dummy.aikiTenkanOffBalanceTimer--;
      }
      if (dummy.aikiKoteGaeshiTrapTimer && dummy.aikiKoteGaeshiTrapTimer > 0) {
        dummy.aikiKoteGaeshiTrapTimer--;
      }
      if (dummy.aikiLockoutTimer && dummy.aikiLockoutTimer > 0) {
        dummy.aikiLockoutTimer--;
      }
      if (dummy.aikiSpinDownTimer && dummy.aikiSpinDownTimer > 0) {
        dummy.aikiSpinDownTimer--;
      }
      if (dummy.aikiShakyVisionTimer && dummy.aikiShakyVisionTimer > 0) {
        dummy.aikiShakyVisionTimer--;
      }
      if (player.aikiTenkanOffBalanceTimer && player.aikiTenkanOffBalanceTimer > 0) {
        player.aikiTenkanOffBalanceTimer--;
      }
      if (player.aikiKoteGaeshiTrapTimer && player.aikiKoteGaeshiTrapTimer > 0) {
        player.aikiKoteGaeshiTrapTimer--;
      }
      if (player.aikiLockoutTimer && player.aikiLockoutTimer > 0) {
        player.aikiLockoutTimer--;
      }
      if (player.aikiSpinDownTimer && player.aikiSpinDownTimer > 0) {
        player.aikiSpinDownTimer--;
      }
      if (player.aikiShakyVisionTimer && player.aikiShakyVisionTimer > 0) {
        player.aikiShakyVisionTimer--;
      }

      // Capoeira player updates (exhaustion and stack regeneration)
      if (player.styleId === 'capoeira') {
        const playerStacks = player.capoeiraDodgeStacks !== undefined ? player.capoeiraDodgeStacks : 3;
        
        // 1. Handle Exhaustion countdown
        if (player.capoeiraExhausted) {
          if (player.capoeiraExhaustTimer && player.capoeiraExhaustTimer > 0) {
            player.capoeiraExhaustTimer--;
            player.isBlocking = false; // force false
            if (player.capoeiraExhaustTimer === 0) {
              player.capoeiraExhausted = false;
              // Instantly restore 1 stack upon exiting exhaustion so they aren't defenseless
              player.capoeiraDodgeStacks = 1;
              player.capoeiraRegenTimer = 0;
              spawnFloatingText(player.x, player.y - 30, 'RECOVERED! (1/3 Stacks)', '#ca8a04');
              syncCombatStatesToUI();
            }
          }
        }
        
        // 2. Handle Stack Regeneration when not blocking, not exhausted, and stacks < 3
        if (!player.isBlocking && !player.capoeiraExhausted && playerStacks < 3) {
          player.capoeiraRegenTimer = (player.capoeiraRegenTimer || 0) + 1;
          if (player.capoeiraRegenTimer >= 300) { // 5.0 seconds (300 frames)
            player.capoeiraDodgeStacks = playerStacks + 1;
            player.capoeiraRegenTimer = 0;
            spawnFloatingText(player.x, player.y - 30, `STOCKED DODGE! (${player.capoeiraDodgeStacks}/3)`, '#16a34a');
            syncCombatStatesToUI();
          }
        } else if (playerStacks === 3) {
          player.capoeiraRegenTimer = 0;
        }
      }


      // Combo reset countdown
      if (player.comboResetTimer && player.comboResetTimer > 0) {
        player.comboResetTimer--;
        if (player.comboResetTimer === 0) {
          player.comboStage = 0; // reset chain
          player.sluggerM1WhiffDragCount = 0;
          player.sluggerWhiffedStages = [];
          player.aikiManualM2UsedInSequence = false;
          player.shellS3Primed = false;
          player.shellS4ReturnTimer = 0;
          player.flowS3ParryBaited = false;
          player.flowS1Whiffed = false;
          player.flowS2HasIFrames = false;
          syncCombatStatesToUI();
        }
      }

      if (player.shellS4ReturnTimer && player.shellS4ReturnTimer > 0) {
        player.shellS4ReturnTimer--;
      }

      // Kickboxing Auto-Sequence 2 Timer (0.15s after S1 finishes / hits)
      if (player.kickboxingAutoSeq2Timer && player.kickboxingAutoSeq2Timer > 0) {
        player.kickboxingAutoSeq2Timer--;
        if (player.kickboxingAutoSeq2Timer === 0) {
          player.heavyWindup = 9; // 1️⃣ Rapid Chamber (0.15s / 9 Frames)
          player.kickboxingIsSeq2 = true;
          player.kickboxingSeq2Ready = false;
          player.kickboxingSeq2Window = 0;
          player.strikeCooldown = 0;
          player.fists.forEach(f => {
            f.isPunching = false;
            f.punchProgress = 0;
            f.isHeavy = false;
            f.hasHit = false;
          });
          // S2 Lunges forward slightly to reach the opponent
          player.vx += Math.cos(player.facingAngle) * 3.5;
          player.vy += Math.sin(player.facingAngle) * 3.5;
        }
      }

      // SECTION 1.18 - FIX 2: Street Boxing M2 Flurry Auto-Burst State Machine (Player)
      if (tickStreetBoxingAutoBurst(player)) {
        // Micro-step to maintain pocket cling
        player.vx += Math.cos(player.facingAngle) * 2.0;
        player.vy += Math.sin(player.facingAngle) * 2.0;
        soundManager.playDash();
      }

      // Ashihara M2 3-Stage Sequence Progression (Player)
      if (player.styleId === 'ashihara') {
        if (player.ashiharaM2Stage === 2 && player.ashiharaM2Timer && player.ashiharaM2Timer > 0) {
          player.ashiharaM2Timer--;
          // Tsukami Pull: interpolate target forward toward player
          if (dummy && !dummy.isDead) {
            const pullAngle = Math.atan2(dummy.y - player.y, dummy.x - player.x);
            const targetDist = player.radius + dummy.radius + 8;
            dummy.x = player.x + Math.cos(pullAngle) * targetDist;
            dummy.y = player.y + Math.sin(pullAngle) * targetDist;
          }
          if (player.ashiharaM2Timer === 0) {
            // Transition from M2 S2 (Tsukami Drag) to M2 S3 (Chudan Straight)
            player.ashiharaM2Stage = 3;
            player.ashiharaM2Timer = 12; // 0.20s execution
            // Activate rear fist for Straight Slim Square thrust
            const rearFist = player.fists.find(f => f.punchType === 'right') || player.fists[1] || player.fists[0];
            if (rearFist) {
              rearFist.isPunching = true;
              rearFist.punchProgress = 0.05;
              rearFist.isHeavy = true;
              rearFist.hasHit = false;
              (rearFist as any).ashiharaS3 = true;
            }
            soundManager.playPunch(true);
          }
        } else if (player.ashiharaM2Stage === 3 && player.ashiharaM2Timer && player.ashiharaM2Timer > 0) {
          player.ashiharaM2Timer--;
          // Animate rear fist straight punch forward
          const rearFist = player.fists.find(f => f.punchType === 'right') || player.fists[1] || player.fists[0];
          if (rearFist) {
            rearFist.isPunching = true;
            rearFist.punchProgress = Math.min(1.0, 1.0 - (player.ashiharaM2Timer / 12));
            rearFist.isHeavy = true;
            (rearFist as any).ashiharaS3 = true;

            // Deliver S3 impact at midway / peak extension (frame 6)
            if (player.ashiharaM2Timer === 6 && !rearFist.hasHit) {
              rearFist.hasHit = true;
              if (dummy && !dummy.isDead) {
                const ashiharaMods = getHeightModifiers(player.baseHeight);
                const s3Dmg = Math.round(13.0 * ashiharaMods.damageFactor * 0.90 * 10) / 10;
                if (matchData?.gamemode !== 'sustain_attack' && matchData?.gamemode !== 'hot_potato') {
                  dummy.health = Math.max(0, dummy.health - s3Dmg);
                }
                applyDamageCombatLocks(dummy);
                dummy.damageFlashTime = 16;
                dummy.stunTime = 51; // 0.85s Stagger Stun!
                dummy.strikeCooldown = 51;
                dummy.blockLockout = 51;
                dummy.isBlocking = false;
                
                // Sabaki Cooldown refund:
                player.heavyCooldown = 0;
                player.heavyWindup = 0;
                
                stateRef.current.shakeAmount = 14 * settings.screenShake;
                stateRef.current.hitStopFrames = 2; // 2-frame hit-stop impact
                soundManager.playPunch(true);
                spawnFloatingText(dummy.x, dummy.y - 25, `-${s3Dmg} HP`, '#ef4444');
                
                // Blue & Gold kinetic sparks
                for (let i = 0; i < 16; i++) {
                  const angle = player.facingAngle + (Math.random() - 0.5) * 1.2;
                  const speed = Math.random() * 6 + 3;
                  stateRef.current.particles.push({
                    id: `ashihara_s3_${Math.random()}`,
                    x: dummy.x,
                    y: dummy.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    radius: Math.random() * 3.5 + 2,
                    color: i % 2 === 0 ? '#1d4ed8' : '#facc15',
                    alpha: 1.0,
                    life: 0,
                    maxLife: 35,
                    type: 'spark'
                  });
                }
              }
            }
          }
          if (player.ashiharaM2Timer === 0) {
            player.ashiharaM2Stage = 0;
            if (rearFist) {
              rearFist.isPunching = false;
              rearFist.punchProgress = 0;
              rearFist.isHeavy = false;
              (rearFist as any).ashiharaS3 = false;
            }
            syncCombatStatesToUI();
          }
        }
      }

      // CQC M2 Echo Rings & Rear Blitz Assault Sequence (Player)
      if (player.styleId === 'cqc') {
        if (player.cqcM2Stage === 'windup' || (player.heavyWindup && player.heavyWindup > 0)) {
          const totalWindup = 90;
          const currentWindup = player.heavyWindup ?? player.cqcWindupTimer ?? 0;
          const elapsed = Math.max(0, totalWindup - currentWindup);

          // 8 Echo Rings with 20% decreased max range (272px)
          const MAX_RANGE = 272;
          const ringRadii: number[] = [];
          const rings = Array.from({ length: 8 }, (_, i) => {
            const maxR = Math.round(((i + 1) / 8) * MAX_RANGE);
            const startFrame = i * 9;
            const expandDuration = 18;
            let r = 0;
            if (elapsed >= startFrame) {
              const rElapsed = Math.min(expandDuration, elapsed - startFrame);
              r = Math.min(maxR, (rElapsed / expandDuration) * maxR);
            }
            ringRadii.push(r);
            return {
              r,
              maxR,
              frozen: !!player.cqcLockedTarget
            };
          });

          if (dummy && !dummy.isDead) {
            const dist = Math.hypot(dummy.x - player.x, dummy.y - player.y);
            const activeMaxR = Math.max(...ringRadii, 100);
            if (dist <= activeMaxR + dummy.radius && !player.cqcLockedTarget) {
              player.cqcLockedTarget = dummy;
              spawnFloatingText(dummy.x, dummy.y - 35, 'ECHO LOCKON!', '#ef4444');
              soundManager.playParry();
            }
          }

          player.cqcRings = rings;

          if ((player.heavyWindup || 0) <= 0 && player.cqcM2Stage === 'windup') {
            player.cqcM2Stage = null;
            player.cqcRings = undefined;
          }
        } else if (player.cqcM2Stage === 'dash') {
          const target = player.cqcLockedTarget || (dummy && !dummy.isDead ? dummy : null);
          if (target && !target.isDead) {
            const total = player.cqcDashTotalFrames || 18;
            const curFrame = Math.max(0, player.dashProgress || 0);
            const rawT = Math.min(1, Math.max(0, 1 - (curFrame / total)));
            // Smooth hermite glide interpolation
            const t = rawT * rawT * (3 - 2 * rawT);

            const startX = player.cqcDashStartX ?? player.x;
            const startY = player.cqcDashStartY ?? player.y;
            const endX = player.cqcDashEndX ?? player.x;
            const endY = player.cqcDashEndY ?? player.y;

            player.x = startX + (endX - startX) * t;
            player.y = startY + (endY - startY) * t;
            const glideAngle = Math.atan2(endY - startY, endX - startX);
            player.facingAngle = glideAngle;

            // Physical glide velocity
            player.vx = Math.cos(glideAngle) * 9.5;
            player.vy = Math.sin(glideAngle) * 9.5;

            target.vx = 0;
            target.vy = 0;
            if (target.styleId === 'ashihara') {
              target.stunTime = 0;
              target.hitMovementLock = 0;
              target.hitSteeringLock = 0;
            } else {
              target.stunTime = Math.max(target.stunTime || 0, 30);
              target.hitMovementLock = Math.max(target.hitMovementLock || 0, 30);
              target.hitSteeringLock = Math.max(target.hitSteeringLock || 0, 30);
            }

            if (target.styleId === 'ashihara' && ((target.heavyWindup && target.heavyWindup > 0) || (target.ashiharaM2Stage && target.ashiharaM2Stage >= 1))) {
              player.cqcM2Stage = null;
              player.cqcLockedTarget = null;
              player.cqcLockedAngle = undefined;
              player.cqcRings = undefined;
              player.isDashing = false;
              player.dashProgress = 0;
              player.heavyCooldown = 900;

              target.ashiharaM2Stage = 2;
              target.ashiharaM2Timer = 9;
              target.heavyWindup = 0;
              target.heavyCooldown = 0;

              soundManager.playParry();
              soundManager.playDash();
              stateRef.current.shakeAmount = 10 * settings.screenShake;
              spawnFloatingText(target.x, target.y - 35, 'SABAKI COUNTERED CQC BLITZ!', '#1d4ed8');
              return;
            }

            if (target.styleId === 'boxing_shell' && ((target.heavyWindup && target.heavyWindup > 0) || target.fists.some(f => f.isPunching && f.isHeavy))) {
              player.cqcM2Stage = null;
              player.cqcLockedTarget = null;
              player.cqcLockedAngle = undefined;
              player.cqcRings = undefined;
              player.isDashing = false;
              player.dashProgress = 0;
              player.heavyCooldown = 900;

              player.shellSpinTimer = 0;
              player.stunTime = 90;
              player.strikeCooldown = 90;
              player.shellLockoutTimer = 90;
              player.damageFlashTime = 10;
              player.isBlocking = false;
              player.blockLockout = 60;

              target.heavyWindup = 0;
              target.fists.forEach(f => { f.isPunching = false; f.punchProgress = 0; f.isHeavy = false; });
              target.heavyCooldown = 360;
              target.shellPostureBoostTimer = 180;
              target.parryFlashTime = 18;

              soundManager.playParry();
              soundManager.playRollTick();
              stateRef.current.shakeAmount = 10 * settings.screenShake;
              spawnFloatingText(player.x, player.y - 35, 'SHOULDER DEFLECTED & STAGGERED (1.5s)', '#d946ef');
              spawnFloatingText(target.x, target.y - 35, 'POSTURE RECOVERY BOOST 2X (3.0s)', '#d946ef');
              return;
            }

            stateRef.current.particles.push({
              id: `cqc_dash_p_${Math.random()}`,
              x: player.x,
              y: player.y,
              vx: -Math.cos(glideAngle) * (Math.random() * 2 + 1),
              vy: -Math.sin(glideAngle) * (Math.random() * 2 + 1),
              radius: player.radius * 0.45,
              color: '#ef4444',
              alpha: 0.55,
              life: 0,
              maxLife: 16,
              type: 'spark'
            });

            if (player.dashProgress === undefined || player.dashProgress <= 0) {
              const startX = player.cqcDashStartX ?? player.x;
              const startY = player.cqcDashStartY ?? player.y;

              // Smoothly land on the end position
              player.x = endX;
              player.y = endY;
              player.vx = 0;
              player.vy = 0;

              // Attacker continuously faces the enemy
              const angleToTarget = Math.atan2(target.y - player.y, target.x - player.x);
              player.facingAngle = angleToTarget;
              player.cqcLockedAngle = angleToTarget;

              // Check if opponent properly blocked head-on (passed through their frontal guard)
              const incomingDir = Math.atan2(startY - target.y, startX - target.x);
              const angleDiff = Math.abs(Math.atan2(Math.sin(target.facingAngle - incomingDir), Math.cos(target.facingAngle - incomingDir)));
              const isHeadOnGuard = !!(target.isBlocking && (target.armorBreakTime || 0) <= 0 && (target.blockLockout || 0) <= 0 && angleDiff < (Math.PI * 0.5));

              player.cqcAssaultBlocked = isHeadOnGuard;
              player.cqcM2Stage = 'assault';
              player.cqcAssaultHit = 1;
              player.cqcAssaultTimer = 12; // 0.2s (12 frames) before 1st hit
              player.isDashing = false;
              player.dashProgress = 0;
              player.cqcRings = undefined;

              if (isHeadOnGuard) {
                // Guard intact: blocks the attack
                target.stunTime = 0;
                target.blockLockout = 0;
                target.isBlocking = true;
                target.hitSteeringLock = 0;
                target.hitMovementLock = 0;
                soundManager.playBlock();
                spawnFloatingText(target.x, target.y - 35, 'GUARD BLOCKED!', '#38bdf8');
              } else {
                // Did not block head-on: full damage & block disabled until 5th attack!
                target.isBlocking = false;
                target.blockLockout = 70; // Block disabled until 5th attack
                target.stunTime = 15;
                target.cqcAttackLockout = 15;
                target.vx = 0;
                target.vy = 0;
                target.hitSteeringLock = 15;
                target.hitMovementLock = 15;
                spawnFloatingText(target.x, target.y - 35, 'CQC ASSAULT (5-HIT)', '#ef4444');
                soundManager.playPunch(true);
              }
            } else {
              player.dashProgress--;
            }
          } else {
            player.cqcM2Stage = null;
            player.cqcLockedTarget = null;
            player.cqcLockedAngle = undefined;
            player.cqcAssaultBlocked = false;
            player.isDashing = false;
            player.dashProgress = 0;
            player.cqcRings = undefined;
            player.heavyCooldown = Math.max(player.heavyCooldown || 0, 900);
          }
        } else if (player.cqcM2Stage === 'assault') {
          const target = player.cqcLockedTarget || (dummy && !dummy.isDead ? dummy : null);
          if (target && !target.isDead) {
            // Attacker stays in place and tracks rotation facing the enemy
            player.vx = 0;
            player.vy = 0;
            const angleToTarget = Math.atan2(target.y - player.y, target.x - player.x);
            player.facingAngle = angleToTarget;
            player.cqcLockedAngle = angleToTarget;
            target.vx = 0;
            target.vy = 0;

            const isBlockedAssault = !!player.cqcAssaultBlocked;

            if (player.cqcAssaultHit && player.cqcAssaultHit < 5) {
              if (isBlockedAssault) {
                target.isBlocking = true;
                target.blockLockout = 0;
              } else {
                target.isBlocking = false;
                target.blockLockout = 15;
                target.stunTime = Math.max(target.stunTime || 0, 15);
                target.hitSteeringLock = Math.max(target.hitSteeringLock || 0, 15);
                target.hitMovementLock = Math.max(target.hitMovementLock || 0, 15);
              }
            }

            if (player.cqcAssaultTimer === undefined || player.cqcAssaultTimer <= 0) {
              const pMods = getHeightModifiers(player.baseHeight);
              const hitIndex = player.cqcAssaultHit || 1;
              const isTargetImmune = isFighterInIFrames(target);

              if (hitIndex < 4) {
                // Hits 1, 2, 3: Hits every 0.2s (12 frames)
                if (isBlockedAssault) {
                  // Blocked hit: damages 86% of Armor HP (AP) on Hit 1, with chip damage
                  if (hitIndex === 1 && !isTargetImmune) {
                    const curArmor = target.armorHP !== undefined ? target.armorHP : 18;
                    const armorDmg = Math.round(curArmor * 0.86 * 10) / 10;
                    target.armorHP = Math.max(0, Math.round((curArmor - armorDmg) * 10) / 10);
                    target.armorRegenLockout = Math.max(target.armorRegenLockout || 0, 90);
                    spawnFloatingText(target.x, target.y - 45, `-${armorDmg} AP (86%)`, '#38bdf8');
                  }

                  const chipDmg = isTargetImmune ? 0 : Math.round(0.6 * pMods.damageFactor * 10) / 10;
                  if (!isTargetImmune && matchData?.gamemode !== 'sustain_attack' && matchData?.gamemode !== 'hot_potato') {
                    if (target.isPlayer && stateRef.current.godMode) {
                      // God mode
                    } else if (stateRef.current.oneHitKO && !target.isPlayer) {
                      target.health = 0;
                    } else {
                      target.health = Math.max(0, target.health - chipDmg);
                    }
                  }
                  target.damageFlashTime = 8;
                  target.blockTimer = (target.blockTimer || 0) + 12;
                  target.isBlocking = true;
                  target.blockLockout = 0;
                  target.stunTime = 0;
                  soundManager.playBlock();

                  if (isTargetImmune) {
                    spawnFloatingText(target.x, target.y - 30, 'IMMUNE (0 HP)', '#38bdf8');
                  } else {
                    stateRef.current.totalDamageDealt = (stateRef.current.totalDamageDealt || 0) + chipDmg;
                    stateRef.current.totalHitsLanded = (stateRef.current.totalHitsLanded || 0) + 1;
                    setTotalDamageDealt(stateRef.current.totalDamageDealt);
                    setTotalHitsLanded(stateRef.current.totalHitsLanded);
                  }

                  for (let i = 0; i < 4; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const spd = Math.random() * 3 + 1.5;
                    stateRef.current.particles.push({
                      id: `cqc_blk_spk_${Math.random()}`,
                      x: target.x,
                      y: target.y,
                      vx: Math.cos(angle) * spd,
                      vy: Math.sin(angle) * spd,
                      radius: Math.random() * 2 + 1,
                      color: '#38bdf8',
                      alpha: 1.0,
                      life: 0,
                      maxLife: 12,
                      type: 'spark'
                    });
                  }
                } else {
                  // Unblocked hit: AP is NOT deducted when block does not face head-on; takes direct unblocked damage
                  const dmg = isTargetImmune ? 0 : Math.round(2.5 * pMods.damageFactor * 10) / 10;
                  if (!isTargetImmune && matchData?.gamemode !== 'sustain_attack' && matchData?.gamemode !== 'hot_potato') {
                    if (target.isPlayer && stateRef.current.godMode) {
                      // God mode
                    } else if (stateRef.current.oneHitKO && !target.isPlayer) {
                      target.health = 0;
                    } else {
                      target.health = Math.max(0, target.health - dmg);
                    }
                  }
                  target.damageFlashTime = 12;
                  target.cqcM2HitFlashTime = 14;
                  target.cqcAttackLockout = 15;
                  target.stunTime = Math.max(target.stunTime || 0, 15);
                  target.isBlocking = false;
                  target.blockLockout = 15;
                  stateRef.current.shakeAmount = 6 * settings.screenShake;
                  soundManager.playPunch(false);

                  if (isTargetImmune) {
                    spawnFloatingText(target.x, target.y - 30, 'IMMUNE (0 HP)', '#38bdf8');
                  } else {
                    stateRef.current.totalDamageDealt = (stateRef.current.totalDamageDealt || 0) + dmg;
                    stateRef.current.totalHitsLanded = (stateRef.current.totalHitsLanded || 0) + 1;
                    setTotalDamageDealt(stateRef.current.totalDamageDealt);
                    setTotalHitsLanded(stateRef.current.totalHitsLanded);
                  }

                  for (let i = 0; i < 5; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const spd = Math.random() * 4 + 2;
                    stateRef.current.particles.push({
                      id: `cqc_assault_spk_${Math.random()}`,
                      x: target.x,
                      y: target.y,
                      vx: Math.cos(angle) * spd,
                      vy: Math.sin(angle) * spd,
                      radius: Math.random() * 2.5 + 1.5,
                      color: i % 2 === 0 ? '#ef4444' : '#cbd5e1',
                      alpha: 1.0,
                      life: 0,
                      maxLife: 15,
                      type: 'spark'
                    });
                  }
                }

                syncCombatStatesToUI();

                if (!target.isPlayer && dummyBehavior === 'test_ai') {
                  target.health = target.maxHealth;
                  target.isDead = false;
                  target.vx = 0;
                  target.vy = 0;
                } else if (target.health <= 0) {
                  target.health = 0;
                  target.isDead = true;
                  triggerKOCinematic(player, target);
                  player.cqcM2Stage = null;
                  player.cqcLockedTarget = null;
                  player.cqcAssaultBlocked = false;
                  player.cqcRings = undefined;
                  player.isDashing = false;
                  player.dashProgress = 0;
                  syncCombatStatesToUI();
                  return;
                }

                player.cqcAssaultHit = hitIndex + 1;
                player.cqcAssaultTimer = 12; // 0.2s (12 frames) between hits
              } else if (hitIndex === 4) {
                // Hit 4: Lands, then sets up 0.25s window before Hit 5
                if (isBlockedAssault) {
                  const chipDmg = isTargetImmune ? 0 : Math.round(0.6 * pMods.damageFactor * 10) / 10;
                  if (!isTargetImmune && matchData?.gamemode !== 'sustain_attack' && matchData?.gamemode !== 'hot_potato') {
                    if (target.isPlayer && stateRef.current.godMode) {
                      // God mode
                    } else if (stateRef.current.oneHitKO && !target.isPlayer) {
                      target.health = 0;
                    } else {
                      target.health = Math.max(0, target.health - chipDmg);
                    }
                  }
                  target.damageFlashTime = 8;
                  soundManager.playBlock();
                  if (isTargetImmune) {
                    spawnFloatingText(target.x, target.y - 30, 'IMMUNE (0 HP)', '#38bdf8');
                  } else {
                    stateRef.current.totalDamageDealt = (stateRef.current.totalDamageDealt || 0) + chipDmg;
                    stateRef.current.totalHitsLanded = (stateRef.current.totalHitsLanded || 0) + 1;
                    setTotalDamageDealt(stateRef.current.totalDamageDealt);
                    setTotalHitsLanded(stateRef.current.totalHitsLanded);
                  }
                } else {
                  const dmg = isTargetImmune ? 0 : Math.round(2.5 * pMods.damageFactor * 10) / 10;
                  if (!isTargetImmune && matchData?.gamemode !== 'sustain_attack' && matchData?.gamemode !== 'hot_potato') {
                    if (target.isPlayer && stateRef.current.godMode) {
                      // God mode
                    } else if (stateRef.current.oneHitKO && !target.isPlayer) {
                      target.health = 0;
                    } else {
                      target.health = Math.max(0, target.health - dmg);
                    }
                  }
                  target.damageFlashTime = 12;
                  target.cqcM2HitFlashTime = 14;
                  stateRef.current.shakeAmount = 6 * settings.screenShake;
                  soundManager.playPunch(false);

                  if (isTargetImmune) {
                    spawnFloatingText(target.x, target.y - 30, 'IMMUNE (0 HP)', '#38bdf8');
                  } else {
                    stateRef.current.totalDamageDealt = (stateRef.current.totalDamageDealt || 0) + dmg;
                    stateRef.current.totalHitsLanded = (stateRef.current.totalHitsLanded || 0) + 1;
                    setTotalDamageDealt(stateRef.current.totalDamageDealt);
                    setTotalHitsLanded(stateRef.current.totalHitsLanded);
                  }

                  for (let i = 0; i < 5; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const spd = Math.random() * 4 + 2;
                    stateRef.current.particles.push({
                      id: `cqc_assault_spk_${Math.random()}`,
                      x: target.x,
                      y: target.y,
                      vx: Math.cos(angle) * spd,
                      vy: Math.sin(angle) * spd,
                      radius: Math.random() * 2.5 + 1.5,
                      color: i % 2 === 0 ? '#ef4444' : '#cbd5e1',
                      alpha: 1.0,
                      life: 0,
                      maxLife: 15,
                      type: 'spark'
                    });
                  }
                }

                syncCombatStatesToUI();

                if (!target.isPlayer && dummyBehavior === 'test_ai') {
                  target.health = target.maxHealth;
                  target.isDead = false;
                  target.vx = 0;
                  target.vy = 0;
                } else if (target.health <= 0) {
                  target.health = 0;
                  target.isDead = true;
                  triggerKOCinematic(player, target);
                  player.cqcM2Stage = null;
                  player.cqcLockedTarget = null;
                  player.cqcAssaultBlocked = false;
                  player.cqcRings = undefined;
                  player.isDashing = false;
                  player.dashProgress = 0;
                  syncCombatStatesToUI();
                  return;
                }

                player.cqcAssaultHit = 5;
                // 5th hit initiates after 0.25s (15 frames)
                player.cqcAssaultTimer = 15;
                target.blockLockout = 0; // Un-disables block before Hit 5
                target.stunTime = 0; // Un-stun so opponent can raise guard to parry
                target.hitSteeringLock = 0;
                target.hitMovementLock = 0;
                target.cqcAttackLockout = 0;
                // If defender was already holding block before the Hit 5 telegraph window, record it so merely holding block does not parry
                target.cqcWasBlockingAtHit4 = target.isBlocking;
                spawnFloatingText(target.x, target.y - 45, 'DEFEND HIT 5 (0.25s)!', '#fbbf24');
              } else if (hitIndex === 5) {
                // Hit 5 lands: Evaluate Perfect Parry vs Unblocked/Regular Block
                const blockCheck = checkDirectionalBlock(target, player);
                const isDirectionalBlocked = blockCheck.isBlocked;
                const blockTimeFrames = target.blockTimer || 0;
                const maxParryFrames = target.styleId === 'muay_thai' ? 23 : 11;
                const canParry = (!target.parryLockoutTimer || target.parryLockoutTimer <= 0) && !target.cqcWasBlockingAtHit4;
                const isParry = isDirectionalBlocked && target.isBlocking && (target.armorBreakTime || 0) <= 0 && canParry && blockTimeFrames <= maxParryFrames;

                if (isParry) {
                  // Successful Perfect Parry on Hit 5: Parried strike deals 0 damage to the opponent!
                  target.damageFlashTime = 12;
                  target.parryFlashTime = 18;
                  target.parryBlockGraceTimer = 90;
                  target.afterParryGraceTimer = 90;
                  target.postBlockAttackLockout = 0;
                  target.strikeCooldown = 0;
                  target.vx = 0;
                  target.vy = 0;
                  soundManager.playParry();
                  spawnFloatingText(target.x, target.y - 30, 'PARRIED!', '#f59e0b');

                  if (target.isPlayer) {
                    matchParriesLandedRef.current += 1;
                    roundParriesLandedRef.current += 1;
                    stateRef.current.totalParries = (stateRef.current.totalParries || 0) + 1;
                    setTotalParries(stateRef.current.totalParries);
                    QuestTracker.trackEvent(userEmail, {
                      type: 'parry',
                      mode: getMatchModeKey()
                    });
                  }
                } else {
                  // Unblocked / Not Parried: Check if target is in I-Frames
                  const fullDmg = isTargetImmune ? 0 : Math.round(4.0 * pMods.damageFactor * 10) / 10;
                  if (!isTargetImmune && matchData?.gamemode !== 'sustain_attack' && matchData?.gamemode !== 'hot_potato') {
                    if (target.isPlayer && stateRef.current.godMode) {
                      // God mode
                    } else if (stateRef.current.oneHitKO && !target.isPlayer) {
                      target.health = 0;
                    } else {
                      target.health = Math.max(0, target.health - fullDmg);
                    }
                  }
                  target.damageFlashTime = 18;
                  target.isBlocking = false;
                  target.stunTime = 0; // Guard is allowed
                  target.blockLockout = 0; // Guard is allowed (can still block)
                  target.hitMovementLock = 51; // Movement disabled for 0.85s
                  target.cqcAttackLockout = 51; // Attack disabled for 0.85s
                  target.hitSteeringLock = 0;

                  const kbAngle = player.facingAngle;
                  target.vx = Math.cos(kbAngle) * 1.5;
                  target.vy = Math.sin(kbAngle) * 1.5;
                  soundManager.playPunch(true);

                  player.postureCd = 0;
                  player.isPostureLocked = false;
                  spawnFloatingText(player.x, player.y - 30, 'POSTURE CD RESET (0.0s)', '#22c55e');

                  if (isTargetImmune) {
                    spawnFloatingText(target.x, target.y - 30, 'IMMUNE (0 HP)', '#38bdf8');
                  } else {
                    spawnFloatingText(target.x, target.y - 30, `-${fullDmg} HP`, '#ef4444');
                    stateRef.current.totalDamageDealt = (stateRef.current.totalDamageDealt || 0) + fullDmg;
                    stateRef.current.totalHitsLanded = (stateRef.current.totalHitsLanded || 0) + 1;
                    setTotalDamageDealt(stateRef.current.totalDamageDealt);
                    setTotalHitsLanded(stateRef.current.totalHitsLanded);
                  }
                }

                stateRef.current.shakeAmount = 14 * settings.screenShake;
                stateRef.current.hitStopFrames = 2;

                if (!target.isPlayer && dummyBehavior === 'test_ai') {
                  target.health = target.maxHealth;
                  target.isDead = false;
                  target.vx = 0;
                  target.vy = 0;
                } else if (target.health <= 0) {
                  target.health = 0;
                  target.isDead = true;
                  triggerKOCinematic(player, target);
                }

                // Back to normal after the 5th attack
                player.cqcM2Stage = null;
                player.cqcLockedTarget = null;
                player.cqcLockedAngle = undefined;
                player.cqcRings = undefined;
                player.isDashing = false;
                player.dashProgress = 0;
                player.heavyCooldown = 900; // 15.0s cooldown
                player.strikeCooldown = 0; // Attacker can immediately follow up
                player.lightCooldown = 0;
                syncCombatStatesToUI();
              }
            } else {
              player.cqcAssaultTimer--;
            }
          } else {
            player.cqcM2Stage = null;
            player.cqcLockedTarget = null;
            player.cqcLockedAngle = undefined;
            player.cqcRings = undefined;
            player.isDashing = false;
            player.dashProgress = 0;
            player.heavyCooldown = Math.max(player.heavyCooldown || 0, 900);
            player.strikeCooldown = 0;
            player.lightCooldown = 0;
            syncCombatStatesToUI();
          }
        }
      }

      // Keysi M2 Clinch State Machine (Player)
      if (player.styleId === 'keysi') {
        if (player.keysiClinchStage === 'delay') {
          if (player.keysiClinchTimer && player.keysiClinchTimer > 0) {
            player.keysiClinchTimer--;
            player.vx = 0;
            player.vy = 0;
            if (player.keysiClinchTimer === 0) {
              const target = player.keysiClinchTarget || (dummy && !dummy.isDead ? dummy : null);
              if (target && !target.isDead) {
                const dist = Math.hypot(target.x - player.x, target.y - player.y);
                const inPocketRange = dist <= (player.radius + target.radius + 24); // ~72px pocket clinch range
                const blockCheck = checkDirectionalBlock(target, player);
                const blockTimeSec = (target.blockTimer || 0) / 60;
                const canParry = (!target.parryLockoutTimer || target.parryLockoutTimer <= 0) && (!target.keysiVulnerableTimer || target.keysiVulnerableTimer <= 0);
                const isParry = inPocketRange && blockCheck.isBlocked && target.isBlocking && (target.armorBreakTime || 0) <= 0 && canParry && blockTimeSec >= 0.0 && blockTimeSec <= PERFECT_PARRY_WINDOW_SEC;

                if (isParry) {
                  // Opponent parried the clinch grab the moment the elbow hits! Zero knockback!
                  target.parryFlashTime = 18;
                  target.parryBlockGraceTimer = 90;
                  target.afterParryGraceTimer = 90;
                  target.postBlockAttackLockout = 0;
                  target.strikeCooldown = 0;
                  target.vx = 0;
                  target.vy = 0;
                  player.vx = 0;
                  player.vy = 0;
                  soundManager.playParry();
                  spawnFloatingText(target.x, target.y - 30, 'PARRIED!', '#f59e0b');
                  player.heavyWindup = 0;
                  player.keysiClinchStage = null;
                  player.keysiClinchTarget = null;
                  applyHeavyWhiffPenalty(player);
                } else if (inPocketRange) {
                  // If enemy was holding block during the clamp: Shatters guard (AP) and initiates attack instantly
                  if (target.isBlocking) {
                    target.armorHP = 0;
                    target.armorBreakTime = 60;
                    soundManager.playGuardBreak();
                    spawnFloatingText(target.x, target.y - 30, 'GUARD BROKEN! (AP SHATTERED)', '#ef4444');
                  }

                  // Clinch Connected! The closed elbows immobilize the victim and disable all buttons
                  player.keysiClinchStage = 'clinch';
                  player.keysiClinchTimer = 38; // 38 frames (~0.63s) full headbutt sequence
                  player.keysiClinchTarget = target;
                  player.heavyCooldown = 900; // 15.0s cooldown on hit
                  target.stunTime = Math.max(target.stunTime || 0, 48);
                  target.blockLockout = Math.max(target.blockLockout || 0, 48);
                  target.strikeCooldown = Math.max(target.strikeCooldown || 0, 48);
                  target.heavyCooldown = Math.max(target.heavyCooldown || 0, 48);
                  target.lightCooldown = Math.max(target.lightCooldown || 0, 48);
                  target.dashCooldown = Math.max(target.dashCooldown || 0, 48);
                  target.isBlocking = false;
                  target.vx = 0;
                  target.vy = 0;
                  soundManager.playParry();
                  spawnFloatingText(target.x, target.y - 35, 'HEAD CLAMPED!', '#ef4444');
                } else {
                  // Whiffed outside pocket range
                  player.keysiClinchStage = null;
                  player.keysiClinchTarget = null;
                  applyHeavyWhiffPenalty(player);
                }
              } else {
                player.keysiClinchStage = null;
                player.keysiClinchTarget = null;
                applyHeavyWhiffPenalty(player);
              }
            }
          }
        } else if (player.keysiClinchStage === 'clinch') {
          if (player.keysiClinchTimer && player.keysiClinchTimer > 0) {
            player.keysiClinchTimer--;
            player.vx = 0;
            player.vy = 0;
            const target = player.keysiClinchTarget || (dummy && !dummy.isDead ? dummy : null);
            if (target && !target.isDead) {
              // Clamp pulls opponent inward and locks him firmly in place
              const clinchDist = player.radius + target.radius + 4;
              const desiredX = player.x + Math.cos(player.facingAngle) * clinchDist;
              const desiredY = player.y + Math.sin(player.facingAngle) * clinchDist;
              target.x += (desiredX - target.x) * 0.45;
              target.y += (desiredY - target.y) * 0.45;
              target.vx = 0;
              target.vy = 0;
              target.stunTime = Math.max(target.stunTime || 0, 15);
              target.blockLockout = Math.max(target.blockLockout || 0, 15);
              target.strikeCooldown = Math.max(target.strikeCooldown || 0, 15);
              target.heavyCooldown = Math.max(target.heavyCooldown || 0, 15);
              target.lightCooldown = Math.max(target.lightCooldown || 0, 15);
              target.dashCooldown = Math.max(target.dashCooldown || 0, 15);
              target.isBlocking = false;
            }
            // Frame 15: Headbutt impact delivery!
            if (player.keysiClinchTimer === 15) {
              if (target && !target.isDead) {
                const pMods = getHeightModifiers(player.baseHeight);
                const isTargetImmune = isFighterInIFrames(target);
                const headbuttDmg = isTargetImmune ? 0 : Math.round(14.0 * pMods.damageFactor * 10) / 10;
                if (!isTargetImmune && matchData?.gamemode !== 'sustain_attack' && matchData?.gamemode !== 'hot_potato') {
                  if (target.isPlayer && stateRef.current.godMode) {
                    // God mode
                  } else if (stateRef.current.oneHitKO && !target.isPlayer) {
                    target.health = 0;
                  } else {
                    target.health = Math.max(0, target.health - headbuttDmg);
                  }
                }
                applyDamageCombatLocks(target);
                target.damageFlashTime = 16;
                target.keysiStaggerTimer = 240; // 4.0s Trauma Stagger!
                target.vx = 0;
                target.vy = 0;
                stateRef.current.shakeAmount = 16 * settings.screenShake;
                stateRef.current.hitStopFrames = 3;
                soundManager.playPunch(true);
                if (isTargetImmune) {
                  spawnFloatingText(target.x, target.y - 35, 'IMMUNE (0 HP)', '#38bdf8');
                } else {
                  spawnFloatingText(target.x, target.y - 35, `-${headbuttDmg} HP (TRAUMA STAGGER!)`, '#ef4444');
                  stateRef.current.totalDamageDealt = (stateRef.current.totalDamageDealt || 0) + headbuttDmg;
                  stateRef.current.totalHitsLanded = (stateRef.current.totalHitsLanded || 0) + 1;
                  setTotalDamageDealt(stateRef.current.totalDamageDealt);
                  setTotalHitsLanded(stateRef.current.totalHitsLanded);
                }

                // Crimson & Silver bone impact sparks
                for (let i = 0; i < 14; i++) {
                  const angle = Math.random() * Math.PI * 2;
                  const speed = Math.random() * 5 + 2.5;
                  stateRef.current.particles.push({
                    id: `keysi_headbutt_${Math.random()}`,
                    x: target.x,
                    y: target.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    radius: Math.random() * 3 + 1.5,
                    color: i % 2 === 0 ? '#ef4444' : '#e2e8f0',
                    alpha: 1.0,
                    life: 0,
                    maxLife: 30,
                    type: 'spark'
                  });
                }

                if (!target.isPlayer && dummyBehavior === 'test_ai') {
                  target.health = target.maxHealth;
                  target.isDead = false;
                  target.vx = 0;
                  target.vy = 0;
                } else if (target.health <= 0) {
                  target.health = 0;
                  target.isDead = true;
                  triggerKOCinematic(player, target);
                }
              }
            }
            if (player.keysiClinchTimer === 0) {
              player.keysiClinchStage = null;
              player.keysiClinchTarget = null;
              player.strikeCooldown = 0;
              player.lightCooldown = 0;
              syncCombatStatesToUI();
            }
          }
        }
      }

      // Keysi Dash Interception / Collision Check (Player)
      if (player.isDashing && player.styleId === 'keysi' && dummy && !dummy.isDead) {
        const dist = Math.hypot(dummy.x - player.x, dummy.y - player.y);
        if (dist <= player.radius + dummy.radius + 22) {
          player.keysiM2Primed = true; // Passive still applies!
          const farThreshold = player.radius + dummy.radius + 80;
          const wasFarDistanced = (player.dashStartDist || 0) > farThreshold;
          if (wasFarDistanced) {
            player.isDashing = false;
            player.dashProgress = 0;
            player.vx = 0;
            player.vy = 0;
            soundManager.playRollTick();
            spawnFloatingText(player.x, player.y - 30, 'POCKET INTERCEPT (CLINCH PRIMED!)', '#ef4444');
            for (let i = 0; i < 6; i++) {
              const angle = Math.random() * Math.PI * 2;
              stateRef.current.particles.push({
                id: `keysi_dash_col_${Math.random()}`,
                x: (player.x + dummy.x) / 2,
                y: (player.y + dummy.y) / 2,
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3,
                radius: 2,
                color: i % 2 === 0 ? '#ef4444' : '#94a3b8',
                alpha: 1.0,
                life: 0,
                maxLife: 15,
                type: 'spark'
              });
            }
          } else if (!player.keysiCloseDashPrimed) {
            player.keysiCloseDashPrimed = true;
            soundManager.playRollTick();
            spawnFloatingText(player.x, player.y - 30, 'POCKET SLIP (CLINCH PRIMED!)', '#ef4444');
            for (let i = 0; i < 6; i++) {
              const angle = Math.random() * Math.PI * 2;
              stateRef.current.particles.push({
                id: `keysi_dash_col_close_${Math.random()}`,
                x: (player.x + dummy.x) / 2,
                y: (player.y + dummy.y) / 2,
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3,
                radius: 2,
                color: i % 2 === 0 ? '#ef4444' : '#94a3b8',
                alpha: 1.0,
                life: 0,
                maxLife: 15,
                type: 'spark'
              });
            }
          }
        }
      }

      // Armor block shield recharge when not blocking
      if (player.armorRegenLockout && player.armorRegenLockout > 0) {
        player.armorRegenLockout--;
      } else if (!player.isBlocking && (player.armorBreakTime || 0) <= 0) {
        if ((player.armorHP || 0) < 18) {
          // Calculate height-dependent regen interval in frames (0.8s at 68 in, max shortest 0.4s)
          const seconds = Math.max(0.4, 0.8 + (player.baseHeight - 68) * 0.05);
          const intervalFrames = Math.round(seconds * 60);

          player.armorRegenTimer = (player.armorRegenTimer || 0) + 1;
          if (player.armorRegenTimer >= intervalFrames) {
            player.armorHP = Math.min(18, (player.armorHP || 0) + 1);
            player.armorRegenTimer = 0;
            syncCombatStatesToUI();
          }
        } else {
          player.armorRegenTimer = 0;
        }
      } else {
        player.armorRegenTimer = 0;
      }

      // Steer movement and facing towards mouse pointer or lock-on target
      const isMobileActive = ((settings.touchControlMode ?? 'virtual') === 'virtual') && (settings.showVirtualControls === 'always' || (settings.showVirtualControls === 'auto' && isTouchDevice));

      // Dash timings decay
      if (player.dashCooldown && player.dashCooldown > 0) {
        player.dashCooldown--;
      }
      if (player.dashProgress && player.dashProgress > 0 && player.cqcM2Stage !== 'dash') {
        player.dashProgress--;

        // Spawn afterimages during dash
        if (player.dashProgress % 3 === 0) {
          stateRef.current.particles.push({
            id: `player_dash_ghost_${Math.random()}`,
            x: player.x,
            y: player.y,
            vx: 0,
            vy: 0,
            radius: player.radius,
            color: player.styleId === 'basic' ? '#00e5ff' : player.color,
            alpha: 0.40,
            life: 0,
            maxLife: 14,
            type: 'afterimage',
            facingAngle: player.facingAngle
          } as any);
        }

        if (player.styleId === 'basic') {
          const frame = 48 - player.dashProgress;
          const styleObj = FIGHTING_STYLES.find(s => s.id === 'basic') || FIGHTING_STYLES[0];
          const styleSpeed = styleObj.statModifiers?.speed ?? 1.15;
          let forwardSpeed = 1.95 * styleSpeed; // Slower, tightly paced dash momentum with longer sway path
          if (player.concussTime && player.concussTime > 0) forwardSpeed *= 0.40;

          const lateralAmp = 2.4 * Math.sin((frame / 12) * Math.PI);
          const moveAngle = player.dashAngle !== undefined ? player.dashAngle : player.facingAngle;

          // When Flow Boxing dashes backward, maintain front facing towards lock-on opponent or target
          if ((settings.cameraMode === 'lockon_swipe' || isMobileActive) && dummy && !dummy.isDead) {
            player.facingAngle = Math.atan2(dummy.y - player.y, dummy.x - player.x);
          }

          const fX = Math.cos(moveAngle);
          const fY = Math.sin(moveAngle);
          const pX = Math.cos(moveAngle + Math.PI / 2);
          const pY = Math.sin(moveAngle + Math.PI / 2);

          player.vx = fX * forwardSpeed + pX * lateralAmp;
          player.vy = fY * forwardSpeed + pY * lateralAmp;
          player.vx *= 0.94;
          player.vy *= 0.94;
        } else {
          // Dash has progressive friction
          player.vx *= 0.91;
          player.vy *= 0.91;
        }

        if (player.dashProgress === 0) {
          player.isDashing = false;
          player.dashAngle = undefined; // Reset dashAngle so it never leaks into attacks
          player.postDashAttackLockout = 18; // Section 2.8: 0.30s Post-Dash Attack Lockout
          if (player.styleId === 'basic') {
            player.flowStrikerBuffTimer = 18; // [ Striker Buff ]: Exiting Pendulum Dash grants 0.3s +10% M1 DMG
            spawnFloatingText(player.x, player.y - 30, 'STRIKER BUFF (+10%)', '#00e5ff');
          } else {
            player.vx *= 0.5;
            player.vy *= 0.5;
          }
        }
      }

      // WASD / Arrow Key / Joystick detection for movement
      const keys = state.keysPressed || {};
      let moveX = 0;
      let moveY = 0;

      const isLockedFromMoving = !!(
        state.cinematicZoomActive ||
        player.isDead ||
        state.matchEnded ||
        (dummy && dummy.isDead) ||
        player.stunTime > 0 ||
        player.parriedStun > 0 ||
        player.capoeiraExhausted ||
        (player.kyokushinSpinOutTimer && player.kyokushinSpinOutTimer > 0) ||
        (player.hitMovementLock && player.hitMovementLock > 0) ||
        player.aikiSlamStage ||
        player.aikiSlamUninterruptible ||
        (player.aikiLockoutTimer && player.aikiLockoutTimer > 0) ||
        (player.aikiSpinDownTimer && player.aikiSpinDownTimer > 0) ||
        isImpactFrameActive()
      );

      if (!isLockedFromMoving) {
        if (isMobileActive && state.joystickX !== undefined && state.joystickY !== undefined && (state.joystickX !== 0 || state.joystickY !== 0)) {
          moveX = state.joystickX;
          moveY = state.joystickY;
        } else {
          if (keys['KeyW'] || keys['ArrowUp']) moveY -= 1;
          if (keys['KeyS'] || keys['ArrowDown']) moveY += 1;
          if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
          if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;
        }
      } else {
        moveX = 0;
        moveY = 0;
        player.isDashing = false;
        player.dashProgress = 0;
      }

      // In Lock-On mode: Movement depends on where you're facing!
      // Forward moves in facing direction, Backward backpedals, Left/Right strafes
      if (settings.cameraMode === 'lockon_swipe' && (moveX !== 0 || moveY !== 0)) {
        const F = player.facingAngle;
        const forward = -moveY; // Up/W is forward relative to character facing
        const strafe = moveX;   // Right/D is strafe right
        moveX = forward * Math.cos(F) - strafe * Math.sin(F);
        moveY = forward * Math.sin(F) + strafe * Math.cos(F);
      }

      // Facing angle direction (bypassed during Kyokushin spin-out, CQC M2, and Keysi clinch):
      const isCqcActive = !!player.cqcM2Stage || (player.styleId === 'cqc' && ((player.heavyWindup || 0) > 0));
      const isKeysiClinchActive = !!player.keysiClinchStage;
      if (isKeysiClinchActive) {
        const target = player.keysiClinchTarget || (dummy && !dummy.isDead ? dummy : null);
        if (target && !target.isDead) {
          player.facingAngle = Math.atan2(target.y - player.y, target.x - player.x);
        }
      } else if (isCqcActive) {
        const target = player.cqcLockedTarget || (dummy && !dummy.isDead ? dummy : null);
        if (target && !target.isDead) {
          const aimAngle = Math.atan2(target.y - player.y, target.x - player.x);
          player.facingAngle = aimAngle;
          player.cqcLockedAngle = aimAngle;
        } else if (player.cqcLockedAngle !== undefined) {
          player.facingAngle = player.cqcLockedAngle;
        }
      } else if (!player.kyokushinSpinOutTimer || player.kyokushinSpinOutTimer <= 0) {
        let targetAngle = player.facingAngle;
        if (settings.cameraMode === 'lockon_swipe') {
          // In Character Lock-On mode:
          // The character locks on to the opponent in front (or maintains locked angle if opponent absent)
          if (dummy && !dummy.isDead) {
            targetAngle = Math.atan2(dummy.y - player.y, dummy.x - player.x);
          } else {
            targetAngle = player.facingAngle;
          }
        } else if (isMobileActive) {
          // Smart lock-on targeting: if dummy exists and is alive, auto face it during fight.
          // Otherwise, face movement direction.
          if (dummy && !dummy.isDead) {
            const dxToDummy = dummy.x - player.x;
            const dyToDummy = dummy.y - player.y;
            targetAngle = Math.atan2(dyToDummy, dxToDummy);
          } else if (moveX !== 0 || moveY !== 0) {
            targetAngle = Math.atan2(moveY, moveX);
          }
        } else if (matchData?.isAiVsAiSpectator) {
          // SPECTATOR MODE DEDICATED LOCK-ON:
          // Left AI (player) locks onto Right AI (dummy) instead of human mouse cursor
          if (dummy && !dummy.isDead) {
            const dxToDummy = dummy.x - player.x;
            const dyToDummy = dummy.y - player.y;
            targetAngle = Math.atan2(dyToDummy, dxToDummy);
          }
        } else {
          // Normal mouse-based continuous steering
          const viewCenterX = state.width / 2;
          const viewCenterY = state.height / 2;
          const worldMouseX = state.mouseX - viewCenterX + player.x;
          const worldMouseY = state.mouseY - viewCenterY + player.y;
          const dx = worldMouseX - player.x;
          const dy = worldMouseY - player.y;
          targetAngle = Math.atan2(dy, dx);
        }

        // Apply universal steering physics: clamped angular turn rate, dash override, 0.3s hit-stun steering lock
        updateFighterSteering(player, targetAngle);
      }

      const hasMoveInput = moveX !== 0 || moveY !== 0;

      // Universal Stamina Engine & Sprint State Update
      const isSprintKeyHeld = !!(keys['ShiftLeft'] || keys['ShiftRight'] || keys['KeyShift'] || keys['Shift']);
      const sprintRes = updateFighterStaminaAndTimers(player, hasMoveInput, isSprintKeyHeld, state.infiniteStamina);

      if (dummy && !dummy.isDead) {
        const dummyHasMove = Math.abs(dummy.vx) > 0.05 || Math.abs(dummy.vy) > 0.05;
        updateFighterStaminaAndTimers(dummy, dummyHasMove, !!dummy.isSprinting, state.infiniteAIStamina || state.infiniteStamina);
      }

      const canMoveDuringWindup = player.styleId === 'shotokan' && player.heavyWindup > 0;
      const isCqcBusy = player.styleId === 'cqc' && (player.cqcM2Stage === 'windup' || player.cqcM2Stage === 'dash' || player.cqcM2Stage === 'assault');
      const isKeysiBusy = !!player.keysiClinchStage;

      // Move player if WASD is pressed, and not charging heavy / staggered (except Shotokan which can move during heavy)
      const isPendulumDashing = player.styleId === 'basic' && !!(player.isDashing || (player.dashProgress && player.dashProgress > 0));
      if (hasMoveInput && !isPendulumDashing && ((player.heavyWindup || 0) <= 0 || canMoveDuringWindup) && !isCqcBusy && !isKeysiBusy && (player.armorBreakTime || 0) <= 0 && (!player.kyokushinSpinOutTimer || player.kyokushinSpinOutTimer <= 0) && (!player.shellLockoutTimer || player.shellLockoutTimer <= 0)) {
        // Normal pace or block/shield slow-walk
        const playerMods = getHeightModifiers(player.baseHeight);
        const styleObj = FIGHTING_STYLES.find(s => s.id === player.styleId) || FIGHTING_STYLES[0];
        let styleSpeed = styleObj.statModifiers?.speed ?? 1.0;
        if (player.styleId === 'kyokushin') styleSpeed = 1.0; // Movement speed is unaffected by speed passive modifier
        const baseSpeed = BASE_MOVEMENT_SPEED * styleSpeed * sprintRes.speedMultiplier;
        let speedMult = 1.0;
        if (player.sluggerM2WhiffLockoutTimer && player.sluggerM2WhiffLockoutTimer > 0) speedMult *= 0.20; // -80% Movement Speed on Slugger M2 Whiff
        if (player.concussTime && player.concussTime > 0) speedMult *= 0.40; // 60% movement speed slowdown
        if (player.crippleTime && player.crippleTime > 0) speedMult *= 0.85;
        if (player.keysiVulnerableTimer && player.keysiVulnerableTimer > 0) speedMult *= 0.40; // -60% speed penalty during Over-Extended
        if (player.keysiStaggerTimer && player.keysiStaggerTimer > 0) speedMult *= 0.70; // -30% speed penalty during Trauma Stagger

        let speed = player.isBlocking ? baseSpeed * 0.3 : baseSpeed;
        const isHeavyActive = player.fists.some(f => f.punchProgress > 0 && f.isHeavy);
        if (isHeavyActive) {
          if (player.styleId === 'shotokan') {
            speed *= 0.85; // High responsiveness (15% reduction) during back kick execution
          } else {
            speed *= 0.25; // 75% speed reduction during right click heavy punches
          }
        } else if (canMoveDuringWindup) {
          speed *= 0.85; // Move fluidly during the 180 spin windup
        }
        speed *= speedMult;

        // Normalize movement vector so diagonal isn't faster
        const moveLen = Math.sqrt(moveX * moveX + moveY * moveY);
        let normX = moveX / moveLen;
        let normY = moveY / moveLen;

        // Trauma Stagger chaotic lateral drift
        if (player.keysiStaggerTimer && player.keysiStaggerTimer > 0) {
          const driftAngle = (player.keysiStaggerTimer * 0.25);
          normX += Math.sin(driftAngle) * 0.25;
          normY += Math.cos(driftAngle) * 0.25;
          const driftLen = Math.hypot(normX, normY) || 1;
          normX /= driftLen;
          normY /= driftLen;
        }
        
        const force = BASE_MOVEMENT_FORCE * speedMult * styleSpeed * sprintRes.speedMultiplier;
        player.vx += normX * force;
        player.vy += normY * force;

        // Cap speed (while dashing, allow high burst speed, normal walk cap is speed)
        const maxAllowedSpeed = player.isDashing ? 18.0 : speed;
        const currentSpeed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
        if (currentSpeed > maxAllowedSpeed) {
          player.vx = (player.vx / currentSpeed) * maxAllowedSpeed;
          player.vy = (player.vy / currentSpeed) * maxAllowedSpeed;
        }
        player.vx *= 0.88;
        player.vy *= 0.88;
      } else {
        // Friction decay (Use smooth slide friction 0.94 during spinout or stun so knockback carries smoothly)
        const playerFriction = ((player.kyokushinSpinOutTimer && player.kyokushinSpinOutTimer > 0) || (player.stunTime && player.stunTime > 0)) ? 0.94 : 0.82;
        player.vx *= playerFriction;
        player.vy *= playerFriction;
      }

      // Attack strike cooldown decay
      if (player.strikeCooldown && player.strikeCooldown > 0) {
        player.strikeCooldown--;
      }
      if (player.lightCooldown && player.lightCooldown > 0) {
        player.lightCooldown--;
      }
      if (player.postureCd && player.postureCd > 0) {
        const decrement = (player.shellPostureBoostTimer && player.shellPostureBoostTimer > 0) ? 2 : 1;
        player.postureCd = Math.max(0, player.postureCd - decrement);
        player.isPostureLocked = player.postureCd > 0;
      } else {
        player.isPostureLocked = false;
        // If posture resets or combo chain resets when not mid-punch, clear feint trap boost & reset momentum drag
        const isPunching = player.fists.some(f => f.isPunching || f.punchProgress > 0);
        if (!isPunching && player.comboStage === 0) {
          player.flowS3ParryBaited = false;
          player.sluggerM1WhiffDragCount = 0;
          player.sluggerWhiffedStages = [];
        }
      }
      if (player.shotokanRenZukiPending && (!player.lightCooldown || player.lightCooldown <= 0) && (!player.postureCd || player.postureCd <= 0)) {
        player.shotokanRenZukiPending = false;
        if (player.comboStage === 2 && !player.stunTime && !player.isDead) {
          triggerPlayerLightAttack();
        }
      }
      // Hold M1 buffered / continuous attack execution:
      if (!isLockedFromMoving && state.isLMBHeld && (!player.lightCooldown || player.lightCooldown <= 0) && (!player.postureCd || player.postureCd <= 0) && !player.isPostureLocked && (!player.strikeCooldown || player.strikeCooldown <= 0) && !player.isBlocking && (player.stunTime || 0) <= 0 && (player.armorBreakTime || 0) <= 0 && !player.capoeiraExhausted && (!player.postBlockAttackLockout || player.postBlockAttackLockout <= 0) && (!player.shellLockoutTimer || player.shellLockoutTimer <= 0)) {
        const isHeavyPunching = player.fists.some(f => (f.isPunching || f.punchProgress > 0) && f.isHeavy);
        const isHeavyExecuting = (player.heavyWindup || 0) > 0 || isHeavyPunching || (player.ashiharaM2Stage && player.ashiharaM2Stage > 0) || (player.cqcM2Stage && player.cqcM2Stage !== null) || !!player.keysiClinchStage;
        const isLightPunching = player.fists.some(f => f.isPunching && !f.isHeavy) && (!player.shellRetractionHoldTimer || player.shellRetractionHoldTimer <= 0);
        if (!isHeavyExecuting && !isLightPunching) {
          triggerPlayerLightAttack();
        }
      }
      if (player.heavyCooldown && player.heavyCooldown > 0) {
        player.heavyCooldown--;
      }
      if (player.postS4HeavyLockout && player.postS4HeavyLockout > 0) {
        player.postS4HeavyLockout--;
      }
      if (player.superCrippleTimer && player.superCrippleTimer > 0) {
        player.superCrippleTimer--;
      }
      if (player.kyokushinSpiralTimer && player.kyokushinSpiralTimer > 0) {
        player.kyokushinSpiralTimer--;
      }
      if (player.boneFractureTimer && player.boneFractureTimer > 0) {
        player.boneFractureTimer--;
      }
      if (player.keysiStaggerTimer && player.keysiStaggerTimer > 0) {
        player.keysiStaggerTimer--;
      }
      if (player.keysiVulnerableTimer && player.keysiVulnerableTimer > 0) {
        player.keysiVulnerableTimer--;
        if (player.keysiVulnerableTimer === 0 && player.keysiQueuedWhiffCd && player.keysiQueuedWhiffCd > 0) {
          player.heavyCooldown = player.keysiQueuedWhiffCd;
          player.keysiQueuedWhiffCd = 0;
        }
      }

      // Apply coordinates displacement
      player.x += player.vx;
      player.y += player.vy;

      // Bound player inside octagon ring
      const radiusLim = (arenaSize / 2) - player.radius - 8;
      const centerDist = Math.sqrt((player.x - (arenaSize / 2)) ** 2 + (player.y - (arenaSize / 2)) ** 2);
      if (centerDist > radiusLim) {
        const angle = Math.atan2(player.y - (arenaSize / 2), player.x - (arenaSize / 2));
        player.x = (arenaSize / 2) + radiusLim * Math.cos(angle);
        player.y = (arenaSize / 2) + radiusLim * Math.sin(angle);
        player.vx *= -0.3; // bounce
        player.vy *= -0.3;
      }

      // Fists visuals tracking animation
      const playerMods = getHeightModifiers(player.baseHeight);
      player.fists.forEach(fist => {
        const stage = player.comboStage === 0 ? 3 : (player.comboStage - 1);
        const isShinKick = player.styleId === 'muay_thai' && fist.punchType === 'left' && stage === 3;

        let basePunchSpeed = 0.17;
        let baseReturnSpeed = 0.12;
        
        if (fist.isKineticCounter) {
          basePunchSpeed = 0.18; // Calibrated rapid execution for Kinetic Counter
          baseReturnSpeed = 0.11;
        } else if (isShinKick) {
          basePunchSpeed = 0.035; // Calibrated heavy Thai shin kick
          baseReturnSpeed = 0.11;
        } else if (fist.isHeavy) {
          if (player.styleId === 'street_boxing') {
            basePunchSpeed = 0.1381; // Standardized Execution Speed
            baseReturnSpeed = 0.12; // Calibrated Snappy Flurry Retraction
          }
          else if (player.styleId === 'slugger') {
            let execMult = 1.0;
            if (player.boneFractureTimer && player.boneFractureTimer > 0) {
              execMult *= 0.60; // Bone Fracture: -40% Execution Speed
            }
            basePunchSpeed = 0.075 * 0.68 * execMult;
            baseReturnSpeed = 0.055 * 0.68 * execMult;
          }
          else if (player.styleId === 'capoeira') { basePunchSpeed = 0.075; baseReturnSpeed = 0.055; }
          else if (player.styleId === 'shotokan') { basePunchSpeed = 0.09; baseReturnSpeed = 0.07; }
          else if (player.styleId === 'ashihara') { basePunchSpeed = 0.085; baseReturnSpeed = 0.065; }
          else if (player.styleId === 'kyokushin') { 
            basePunchSpeed = 0.20; // 5 Frames Explosive Piston Thrust (~0.08s)
            baseReturnSpeed = 0.10; // 10 Frames Deliberate Clean Revert
          }
          else if (player.styleId === 'keysi') { basePunchSpeed = 0.14; baseReturnSpeed = 0.10; }
          else if (player.styleId === 'kickboxing') {
            const isSeq2 = (fist as any)?.kickboxingSeq2 || player.kickboxingIsSeq2;
            if (isSeq2) {
              basePunchSpeed = 0.33; // 3 Frames Teep Thrust
              baseReturnSpeed = 0.10; // 10 Frames over-extension
            } else {
              basePunchSpeed = 0.33; // 3 Frames Short Hook Execution
              baseReturnSpeed = 0.16; // 6 Frames over-swing
            }
          }
          else if (player.styleId === 'boxing_shell') {
            basePunchSpeed = 0.22; // Quick shoulder roll turn (~4-5 frames)
            baseReturnSpeed = 0.18; // Quick snap back recovery (~5-6 frames)
          }
          else { basePunchSpeed = 0.08; baseReturnSpeed = 0.06; }
        } else {
          const fistStage = fist.comboStage !== undefined ? fist.comboStage : (player.comboStage === 0 ? 3 : Math.max(0, player.comboStage - 1));
          const m1 = getStyleM1Speeds(player.styleId, fistStage);
          basePunchSpeed = m1.punchSpeed;
          baseReturnSpeed = m1.returnSpeed;
          if (player.styleId === 'slugger') {
            let execMult = 1.0;
            if (player.sluggerM1WhiffDragCount && player.sluggerM1WhiffDragCount > 0) {
              execMult *= Math.max(0.30, 1.0 - (0.20 * player.sluggerM1WhiffDragCount));
            }
            if (player.boneFractureTimer && player.boneFractureTimer > 0) {
              execMult *= 0.60; // Bone Fracture: -40% Execution Speed
            }
            basePunchSpeed *= execMult;
            baseReturnSpeed *= execMult;
          } else if (player.styleId === 'street_boxing') {
            // Street Boxing strictly adheres to universal execution speed baseline
          } else if (player.styleId === 'boxing_shell') {
            const stage = fist.comboStage !== undefined ? fist.comboStage : (player.comboStage === 0 ? 3 : player.comboStage - 1);
            if (stage === 0 || stage === 1) {
              basePunchSpeed = m1.punchSpeed * 1.50; // Snapping Lead Execution: 50% faster Execution Speed for S1 & S2 (~66.7ms / ~4.0f)
              baseReturnSpeed = m1.returnSpeed * 1.50;
            } else {
              basePunchSpeed = m1.punchSpeed; // Iron Boxing: 100.0ms (~6.0 frames)
              baseReturnSpeed = m1.returnSpeed;
            }
          }
        }

        if (fist.isPunching) {
          if (fist.punchProgress === 0) {
            fist.hasHit = false;
            fist.punchTimeSec = 0;
            fist.lingerTimer = 0;
            fist.isLingerActive = false;

            // SECTION 1.4: Opposing Torque Transition
            // If the opposing limb was holding in Chamber Linger (or still extended),
            // cancel its linger hold so it smoothly retracts simultaneously as a kinetic counterweight!
            player.fists.forEach(otherFist => {
              if (otherFist.id !== fist.id && otherFist.lingerTimer && otherFist.lingerTimer > 0) {
                otherFist.lingerTimer = 0;
                otherFist.isLingerActive = false;
              }
            });

            // SECTION 1.4: Zero Double-Travel
            // Capture current 2D canvas coordinates dynamically for the 3-frame slerp decouple
            if (fist.currentSpatialX !== undefined && fist.currentSpatialY !== undefined && (!fist.blendTimer || fist.blendTimer <= 0)) {
              fist.blendStartX = fist.currentSpatialX;
              fist.blendStartY = fist.currentSpatialY;
              fist.blendTimer = 3;
            }
          }
          fist.punchTimeSec = (fist.punchTimeSec || 0) + (1 / 60);
          const momentumMultiplier = 1.0;
          // SECTION 1.17: Pure Style Execution - Decoupled from height scaling
          const punchSpeed = basePunchSpeed * momentumMultiplier;
          fist.punchProgress += punchSpeed;
          if (fist.punchProgress >= 1.0) {
            fist.punchProgress = 1.0;
            fist.isPunching = false;
            fist.lingerTimer = 0;
            fist.isLingerActive = false;
          }
        } else if (fist.punchProgress > 0) {
          if (player.styleId === 'kyokushin' && fist.isHeavy && (player.kyokushinM2PeakHoldTimer || 0) > 0) {
            player.kyokushinM2PeakHoldTimer!--;
            fist.punchProgress = 1.0; // Rigid Lock: Freeze solid at peak! Zero spring-back or rubber-banding
            return;
          }
          // SECTION 1.18: Duration Speed (DS) Matrix & Asynchronous Combo Acceleration (2.5x)
          fist.punchTimeSec = (fist.punchTimeSec || 0) + (1 / 60);
          const isComboAccelerating = player.fists.some(other => other.id !== fist.id && other.isPunching);
          const isExempt = !fist.isHeavy && ((player.styleId === 'basic' && fist.comboStage === 2) || (player.styleId === 'aikido' && fist.comboStage === 2));
          const fistStage = fist.comboStage !== undefined ? fist.comboStage : (player.comboStage === 0 ? 3 : Math.max(0, player.comboStage - 1));
          const returnDelta = calculateAsymmetricalRetractionDelta(fist.punchProgress, baseReturnSpeed, 1.0, isComboAccelerating, isExempt, player.styleId, fistStage, fist.isHeavy);
          fist.punchProgress -= returnDelta;
          if (fist.punchProgress <= 0.01) {
            fist.punchProgress = 0;
            fist.lingerTimer = 0;
            fist.isLingerActive = false;
            fist.punchTimeSec = 0;
            if (player.styleId === 'kyokushin' && fist.isHeavy) {
              player.kyokushinM2PeakHoldTimer = 0;
            }
            if (!fist.isHeavy) {
              player.postM1BlockLockout = 9; // Section 2.8: 0.15s Block Lockout (CanBlock = false)
            }
            if (player.styleId === 'slugger' && !fist.isHeavy) {
              if ((player.comboResetTimer || 0) < 110) {
                player.comboResetTimer = 110;
              }
              if (!fist.hasHit) {
                const wStage = fist.comboStage !== undefined ? fist.comboStage : 0;
                if (!player.sluggerWhiffedStages) player.sluggerWhiffedStages = [];
                if (!player.sluggerWhiffedStages.includes(wStage)) {
                  player.sluggerWhiffedStages.push(wStage);
                  player.sluggerM1WhiffDragCount = Math.min(3, player.sluggerWhiffedStages.length);
                  spawnFloatingText(player.x, player.y - 30, `MOMENTUM DRAG (-${player.sluggerM1WhiffDragCount * 20}%)`, '#f59e0b');
                }
              }
            }
            if (player.styleId === 'capoeira' && !fist.hasHit && !player.capoeiraWhiffBonusActive) {
              player.capoeiraWhiffBonusActive = true;
              spawnFloatingText(player.x, player.y - 30, 'FLOW RECOVERY READY!', '#ca8a04');
            }
            if (player.styleId === 'basic' && !fist.isHeavy) {
              if (fist.comboStage === 0 && !fist.hasHit) {
                player.flowS1Whiffed = true;
              } else if (fist.comboStage === 1) {
                player.flowS2HasIFrames = false;
              } else if (fist.comboStage === 3) {
                // S4 completed / missed: remove boost
                player.flowS3ParryBaited = false;
              }
            }
            if (fist.isHeavy) {
              if (player.styleId === 'street_boxing') {
                const stage = player.streetBoxingM2Stage || 1;
                if (stage === 1) {
                  if (fist.hasHit) {
                    player.streetBoxingM2NextTimer = 3;
                  } else {
                    player.streetBoxingM2Stage = 0;
                    player.streetBoxingM2Hits = 0;
                    player.streetBoxingUnbreakable = false;
                    applyHeavyWhiffPenalty(player);
                  }
                } else if (stage === 2) {
                  player.streetBoxingM2NextTimer = 3;
                } else {
                  player.streetBoxingM2Stage = 0;
                  player.streetBoxingUnbreakable = false;
                  if (!fist.hasHit && (player.streetBoxingM2Hits || 0) < 3) {
                    applyHeavyWhiffPenalty(player);
                  }
                }
              } else if (player.styleId === 'kickboxing') {
                const isSeq2 = (fist as any)?.kickboxingSeq2 || player.kickboxingIsSeq2;
                if (!isSeq2) {
                  // S1 finished its hook (whether hit or missed) - queue S2 after 0.15s (9 frames)
                  if (!player.kickboxingAutoSeq2Timer) {
                    player.kickboxingAutoSeq2Timer = 9;
                  }
                } else {
                  // S2 finished
                  if (!fist.hasHit) {
                    applyHeavyWhiffPenalty(player);
                  }
                  player.kickboxingIsSeq2 = false;
                }
              } else {
                if (!fist.hasHit) {
                  applyHeavyWhiffPenalty(player);
                }
              }
              fist.isHeavy = false;
              player.attackLockedAngle = undefined; // RESET THE LOCKED ANGLE!
            }
            fist.isKineticCounter = false;
            fist.hasHit = false; // Reset hit flag when punch is fully retracted
          }
        } else {
          fist.punchProgress = 0;
          if (fist.isHeavy) {
            if (player.styleId === 'street_boxing') {
              if (!fist.hasHit && (player.streetBoxingM2Hits || 0) === 0) {
                applyHeavyWhiffPenalty(player);
              }
              player.streetBoxingM2Stage = 0;
              player.streetBoxingUnbreakable = false;
            } else if (!fist.hasHit) {
              applyHeavyWhiffPenalty(player);
            }
            fist.isHeavy = false;
            player.attackLockedAngle = undefined; // RESET THE LOCKED ANGLE!
          }
          fist.isKineticCounter = false;
          fist.hasHit = false;
        }
      });

      // Synchronize Kyokushin Left Arm counterbalance motion with Right Fist M2
      if (player.styleId === 'kyokushin') {
        const rf = player.fists.find(f => f.punchType === 'right');
        const lf = player.fists.find(f => f.punchType === 'left');
        if (rf && (rf.isHeavy || (player.kyokushinM2PeakHoldTimer || 0) > 0) && lf) {
          lf.punchProgress = rf.punchProgress;
          lf.isPunching = rf.isPunching;
          lf.hasHit = true; // Strictly disabled hitbox
        }
      }
    }

    // 3. Update Sparring Dummy Physics
    if (dummy && !dummy.isDead) {
      if (dummy.ashiharaRecoveryTimer && dummy.ashiharaRecoveryTimer > 0) {
        dummy.ashiharaRecoveryTimer--;
      }
      if (dummy.ashiharaParryLockout && dummy.ashiharaParryLockout > 0) {
        dummy.ashiharaParryLockout--;
      }
      if (dummy.parryLockoutTimer && dummy.parryLockoutTimer > 0) {
        dummy.parryLockoutTimer--;
      }

      // Dummy Heavy Windup timing
      if (dummy.heavyWindup && dummy.heavyWindup > 0) {
        dummy.heavyWindup--;
        if ((dummy.styleId === 'kickboxing' && dummy.kickboxingIsSeq2) || dummy.styleId === 'basic') {
          // Allow forward dash momentum
          if (dummy.styleId === 'basic' && dummy.attackLockedAngle !== undefined) {
            const dummyMods = getHeightModifiers(dummy.baseHeight);
            const forwardSpeed = 7.5 * dummyMods.speedFactor;
            dummy.vx = Math.cos(dummy.attackLockedAngle) * forwardSpeed;
            dummy.vy = Math.sin(dummy.attackLockedAngle) * forwardSpeed;
            dummy.facingAngle = dummy.attackLockedAngle;
          }
        } else {
          dummy.vx = 0;
          dummy.vy = 0;
        }

        if (dummy.heavyWindup === 0) {
          executeDummyHeavyAttack();
        }
      }

      if (dummy.damageFlashTime && dummy.damageFlashTime > 0) dummy.damageFlashTime--;
      if (dummy.superArmorFlashTime && dummy.superArmorFlashTime > 0) dummy.superArmorFlashTime--;
      if (dummy.cqcM2HitFlashTime && dummy.cqcM2HitFlashTime > 0) dummy.cqcM2HitFlashTime--;
      if (dummy.capoeiraDodgeFlashTime && dummy.capoeiraDodgeFlashTime > 0) dummy.capoeiraDodgeFlashTime--;

      // Concussion slow timer decay
      if (dummy.concussTime && dummy.concussTime > 0) dummy.concussTime--;

      if (dummy.stunTime && dummy.stunTime > 0) dummy.stunTime--;
      if (dummy.m2StunTimer && dummy.m2StunTimer > 0) {
        dummy.m2StunTimer--;
        if (!dummy.stunTime || dummy.stunTime <= 0) dummy.m2StunTimer = 0;
      }
      if (dummy.parriedStun && dummy.parriedStun > 0) dummy.parriedStun--;
      if (dummy.cqcAttackLockout && dummy.cqcAttackLockout > 0) dummy.cqcAttackLockout--;
      if (dummy.keysiAttackLockout && dummy.keysiAttackLockout > 0) dummy.keysiAttackLockout--;
      if (dummy.pensadorLungeWindow && dummy.pensadorLungeWindow > 0) dummy.pensadorLungeWindow--;
      if (dummy.hitSteeringLock && dummy.hitSteeringLock > 0) dummy.hitSteeringLock--;
      if (dummy.hitMovementLock && dummy.hitMovementLock > 0) dummy.hitMovementLock--;
      if (dummy.blockLockout && dummy.blockLockout > 0) {
        dummy.blockLockout--;
        dummy.isBlocking = false;
      }

      // Section 2.8 Timers decay & Delayed Momentum Stop
      if (dummy.lastHitBeforeDashTimer && dummy.lastHitBeforeDashTimer > 0) dummy.lastHitBeforeDashTimer--;
      if (dummy.postM1BlockLockout && dummy.postM1BlockLockout > 0) dummy.postM1BlockLockout--;
      if (dummy.postDashAttackLockout && dummy.postDashAttackLockout > 0) dummy.postDashAttackLockout--;
      if (dummy.dashWhiteFrameFlashTime && dummy.dashWhiteFrameFlashTime > 0) dummy.dashWhiteFrameFlashTime--;
      if (dummy.dashHitDelayedStopTimer && dummy.dashHitDelayedStopTimer > 0) {
        dummy.dashHitDelayedStopTimer--;
        if (dummy.dashHitDelayedStopTimer === 0) {
          dummy.vx = 0;
          dummy.vy = 0;
          dummy.isDashing = false;
          dummy.dashProgress = 0;
          dummy.postDashAttackLockout = 18;
          spawnFloatingText(dummy.x, dummy.y - 30, 'MOMENTUM HALTED!', '#ef4444');
        }
      }

      // Post-Block Action Delay decay & tracking
      if (dummy.postBlockAttackLockout && dummy.postBlockAttackLockout > 0) {
        dummy.postBlockAttackLockout--;
      }
      if (dummy.parryBlockGraceTimer && dummy.parryBlockGraceTimer > 0) {
        dummy.parryBlockGraceTimer--;
      }
      if (dummy.afterParryGraceTimer && dummy.afterParryGraceTimer > 0) {
        dummy.afterParryGraceTimer--;
      }
      if (dummy.blockUseResetTimer && dummy.blockUseResetTimer > 0) {
        dummy.blockUseResetTimer--;
        if (dummy.blockUseResetTimer <= 0) {
          dummy.blockUseCount = 0;
        }
      }
      if (dummy.wasBlocking && !dummy.isBlocking) {
        dummy.cqcWasBlockingAtHit4 = false;
        dummy.blockLockout = Math.max(dummy.blockLockout || 0, BLOCK_COOLDOWN_FRAMES);
        if ((dummy.parryFlashTime || 0) <= 0 && (dummy.parryBlockGraceTimer || 0) <= 0 && (!dummy.kyokushinSpinOutTimer || dummy.kyokushinSpinOutTimer <= 0)) {
          if ((dummy.postBlockAttackLockout || 0) <= 0) {
            dummy.postBlockAttackLockout = 6; // Section 2.8: 0.10s Post-Block Action Delay
          }
        } else if ((dummy.kyokushinSpinOutTimer || 0) > 0) {
          dummy.postBlockAttackLockout = 0;
        } else {
          dummy.postBlockAttackLockout = 0;
        }
      }
      dummy.wasBlocking = dummy.isBlocking;

      // Crippling slow timer decay
      if (dummy.crippleTime && dummy.crippleTime > 0) dummy.crippleTime--;
      if (dummy.shellLockoutTimer && dummy.shellLockoutTimer > 0) dummy.shellLockoutTimer--;
      if (dummy.shellSpinTimer && dummy.shellSpinTimer > 0) dummy.shellSpinTimer--;
      if (dummy.shellPostureBoostTimer && dummy.shellPostureBoostTimer > 0) dummy.shellPostureBoostTimer--;

      // Aikido dummy updates (Tenkan Aiki Flow, M2 Stance, Counter Slam window, Slam animation)
      if (dummy.styleId === 'aikido') {
        if (dummy.aikiS3FreeM2CdTimer && dummy.aikiS3FreeM2CdTimer > 0) {
          dummy.aikiS3FreeM2CdTimer--;
        }
        if (dummy.aikiM2StanceTimer && dummy.aikiM2StanceTimer > 0) {
          dummy.aikiM2StanceTimer--;
          if (dummy.aikiM2StanceTimer === 0) {
            if (!dummy.aikiM2HitLanded && !dummy.aikiFreeM2Active) {
              dummy.heavyCooldown = 540; // 9.0s whiff cooldown on manual M2
              spawnFloatingText(dummy.x, dummy.y - 30, 'STANCE EXPIRED (9.0s WHIFF CD)', '#ef4444');
            }
            dummy.aikiM2SuperArmorHits = 0;
            dummy.aikiM2HitLanded = false;
            dummy.aikiFreeM2Active = false;
          }
        }
        if (dummy.aikiCounterSlamWindow && dummy.aikiCounterSlamWindow > 0) {
          dummy.aikiCounterSlamWindow--;
        }
        // Smooth Aikido S2 chamber curl/uncurl transition
        const dLeftFist = dummy.fists ? (dummy.fists.find(f => f.punchType === 'left') || dummy.fists[0]) : undefined;
        const dRightFist = dummy.fists ? (dummy.fists.find(f => f.punchType === 'right') || dummy.fists[1]) : undefined;
        const dLeftProg = dLeftFist ? dLeftFist.punchProgress : 0;
        const dRightProg = dRightFist ? dRightFist.punchProgress : 0;
        const dStage = dummy.comboStage === 0 ? 3 : ((dummy.comboStage || 1) - 1);
        const dTargetCurl = ((dummy.comboStage === 1 && dRightProg === 0) || (dLeftProg > 0 && (dStage === 1 || dLeftFist?.comboStage === 1))) ? 1.0 : 0.0;
        const dCurrentCurl = dummy.aikiCurlFactor !== undefined ? dummy.aikiCurlFactor : 0.0;
        const dCurlSpeed = 0.10;
        if (dCurrentCurl < dTargetCurl) {
          dummy.aikiCurlFactor = Math.min(dTargetCurl, dCurrentCurl + dCurlSpeed);
        } else if (dCurrentCurl > dTargetCurl) {
          dummy.aikiCurlFactor = Math.max(dTargetCurl, dCurrentCurl - dCurlSpeed);
        }
        if (dummy.aikiSlamStage) {
          dummy.vx = 0;
          dummy.vy = 0;
          dummy.aikiSlamUninterruptible = true;
          if (dummy.aikiSlamTimer && dummy.aikiSlamTimer > 0) {
            dummy.aikiSlamTimer--;
            // Total slam duration: 1.5s = 90 ticks at 60 FPS
            const progress = Math.min(1.0, Math.max(0, (90 - dummy.aikiSlamTimer) / 90));
            dummy.aikiSlamFrame = Math.floor(progress * 90);
            const target = dummy.aikiSlamTarget || player;
            if (target && !target.isDead) {
              target.vx = 0;
              target.vy = 0;
              target.aikiSlamUninterruptible = true;

              // Face each other directly; neither fighter moves during the slam
              const angleToTarget = Math.atan2(target.y - dummy.y, target.x - dummy.x);
              dummy.facingAngle = angleToTarget;
              target.facingAngle = angleToTarget + Math.PI;

              if (progress < 0.25) {
                // Phase 1: The Wrist Clamp & Mutual Lockout (0s - 0.375s)
                dummy.aikiSlamStage = 'clamp';
                target.aikiSlamVictimStage = 'clamp';
                target.aikiOverheadScale = 1.0;
              } else if (progress < 0.70) {
                // Phase 2: Leverage & Overhead Elevation (0.375s - 1.05s)
                dummy.aikiSlamStage = 'lift';
                target.aikiSlamVictimStage = 'airborne';
                const liftT = (progress - 0.25) / 0.45;
                // Elevate target pseudo-3D height smoothly
                target.aikiOverheadScale = 1.0 + 0.35 * Math.sin(liftT * Math.PI);
              } else if (!dummy.aikiSlamImpactDone) {
                // Phase 3: Impact & Detonation at ~1.05s
                dummy.aikiSlamImpactDone = true;
                dummy.aikiSlamStage = 'slam';
                target.aikiSlamVictimStage = 'downed';
                target.aikiOverheadScale = 1.0;

                const slamDmg = dummy.aikiSlamDamage ?? 22.0;
                target.health = Math.max(0, target.health - slamDmg);
                target.damageFlashTime = 14;
                soundManager.playPunch(true);
                stateRef.current.shakeAmount = 14 * settings.screenShake;
                spawnFloatingText(target.x, target.y - 30, `OVER-HEAD SLAM! (${slamDmg.toFixed(0)} DMG)`, '#0284c7');

                stateRef.current.particles.push({
                  id: `aiki_slam_shockwave_${Math.random()}`,
                  x: target.x,
                  y: target.y,
                  vx: 0,
                  vy: 0,
                  radius: 40,
                  color: '#00E5FF',
                  alpha: 1.0,
                  life: 0,
                  maxLife: 22,
                  type: 'aiki_dual_shockwave'
                } as any);

                for (let i = 0; i < 14; i++) {
                  const pAngle = Math.random() * Math.PI * 2;
                  const pSpeed = Math.random() * 4.5 + 2.0;
                  stateRef.current.particles.push({
                    id: `aiki_slam_dust_${Math.random()}`,
                    x: target.x,
                    y: target.y,
                    vx: Math.cos(pAngle) * pSpeed,
                    vy: Math.sin(pAngle) * pSpeed,
                    radius: Math.random() * 3 + 2,
                    color: Math.random() > 0.4 ? '#00E5FF' : '#ffffff',
                    alpha: 0.9,
                    life: 0,
                    maxLife: 18,
                    type: 'spark'
                  } as any);
                }

                target.spinOutTimer = 0;
                target.kyokushinSpinOutTimer = 0;
                target.aikiSpinDownTimer = 0;
                target.superCrippleTimer = Math.max(target.superCrippleTimer || 0, 60); // 1.0s Super Cripple (M1/M2 locked & -60% speed)
                target.aikiLockoutTimer = 60;      // 1.0s M1 and M2 attack lockout
                target.aikiShakyVisionTimer = 60;  // 1.0s shaky vision disruption
                if (target.isPlayer) {
                  stateRef.current.shakyVisionTimer = 60;
                }
                target.stunTime = Math.max(target.stunTime || 0, 27);
              } else {
                // Follow-through downed state (1.05s - 1.50s)
                dummy.aikiSlamStage = 'slam';
                target.aikiSlamVictimStage = 'downed';
                target.aikiOverheadScale = 1.0;
              }
            }

            if (dummy.aikiSlamTimer === 0) {
              dummy.aikiSlamStage = null;
              dummy.aikiSlamTarget = null;
              dummy.aikiSlamFrame = undefined;
              dummy.aikiSlamBaseAngle = undefined;
              dummy.aikiSlamImpactDone = undefined;
              dummy.aikiSlamUninterruptible = false;
              if (target) {
                target.aikiSlamUninterruptible = false;
                target.aikiSlamVictimStage = null;
                target.aikiOverheadScale = 1.0;
              }
              const wasFreeSlam = !!(dummy.aikiFreeM2Active || dummy.aikiIsFreeSlam);
              dummy.aikiM2StanceTimer = 0;
              dummy.aikiFreeM2Active = false;
              dummy.aikiIsFreeSlam = false;
              if (!wasFreeSlam) {
                dummy.heavyCooldown = 300; // 5.0s M2 CD only for manual M2 slam!
              }
            }
          }
        }
      }

      // Capoeira dummy updates (exhaustion and stack regeneration)
      if (dummy.styleId === 'capoeira') {
        const dummyStacks = dummy.capoeiraDodgeStacks !== undefined ? dummy.capoeiraDodgeStacks : 3;
        
        // 1. Handle Exhaustion countdown
        if (dummy.capoeiraExhausted) {
          if (dummy.capoeiraExhaustTimer && dummy.capoeiraExhaustTimer > 0) {
            dummy.capoeiraExhaustTimer--;
            dummy.isBlocking = false; // force false
            if (dummy.capoeiraExhaustTimer === 0) {
              dummy.capoeiraExhausted = false;
              // Instantly restore 1 stack upon exiting exhaustion so they aren't defenseless
              dummy.capoeiraDodgeStacks = 1;
              dummy.capoeiraRegenTimer = 0;
              spawnFloatingText(dummy.x, dummy.y - 30, 'RECOVERED! (1/3 Stacks)', '#ca8a04');
              syncCombatStatesToUI();
            }
          }
        }
        
        // 2. Handle Stack Regeneration when not blocking, not exhausted, and stacks < 3
        if (!dummy.isBlocking && !dummy.capoeiraExhausted && dummyStacks < 3) {
          dummy.capoeiraRegenTimer = (dummy.capoeiraRegenTimer || 0) + 1;
          if (dummy.capoeiraRegenTimer >= 300) { // 5.0 seconds (300 frames)
            dummy.capoeiraDodgeStacks = dummyStacks + 1;
            dummy.capoeiraRegenTimer = 0;
            spawnFloatingText(dummy.x, dummy.y - 30, `STOCKED DODGE! (${dummy.capoeiraDodgeStacks}/3)`, '#16a34a');
            syncCombatStatesToUI();
          }
        } else if (dummyStacks === 3) {
          dummy.capoeiraRegenTimer = 0;
        }
      }

      // Block duration and parry visual flashing
      if (dummy.isBlocking && (dummy.armorBreakTime || 0) <= 0) {
        dummy.blockTimer = (dummy.blockTimer || 0) + 1;
      } else {
        dummy.blockTimer = 0;
      }

      if ((dummy.spinOutTimer && dummy.spinOutTimer > 0) || (dummy.kyokushinSpinOutTimer && dummy.kyokushinSpinOutTimer > 0)) {
        if (dummy.spinOutTimer) dummy.spinOutTimer--;
        if (dummy.kyokushinSpinOutTimer) dummy.kyokushinSpinOutTimer--;
        dummy.facingAngle += (Math.PI * 2) / 18; // Involuntary rapid 360° rotation in place for 0.3s (18 frames)
        dummy.isBlocking = false;
        dummy.heavyWindup = 0;
        dummy.fists.forEach(f => {
          f.isPunching = false;
          f.punchProgress = 0;
        });
        if ((!dummy.spinOutTimer || dummy.spinOutTimer === 0) && (!dummy.kyokushinSpinOutTimer || dummy.kyokushinSpinOutTimer === 0)) {
          dummy.postBlockAttackLockout = 27; // 0.45s Post-Block Action Delay AFTER downed slide
        }
      }

      if (dummy.aikiCentrifugalKnockbackTimer && dummy.aikiCentrifugalKnockbackTimer > 0) {
        dummy.aikiCentrifugalKnockbackTimer--;
      }

      if (dummy.kyokushinM2FreezeTimer && dummy.kyokushinM2FreezeTimer > 0) {
        dummy.kyokushinM2FreezeTimer--;
      }

      if (dummy.parryFlashTime && dummy.parryFlashTime > 0) {
        dummy.parryFlashTime--;
      }

      // Kickboxing Auto-Sequence 2 Timer (0.15s after S1 finishes / hits)
      if (dummy.kickboxingAutoSeq2Timer && dummy.kickboxingAutoSeq2Timer > 0) {
        dummy.kickboxingAutoSeq2Timer--;
        if (dummy.kickboxingAutoSeq2Timer === 0) {
          const dMods = getHeightModifiers(dummy.baseHeight);
          dummy.heavyWindup = 9; // 1️⃣ Rapid Chamber (0.15s / 9 Frames)
          dummy.kickboxingIsSeq2 = true;
          dummy.kickboxingSeq2Ready = false;
          dummy.kickboxingSeq2Window = 0;
          dummy.strikeCooldown = 0;
          dummy.fists.forEach(f => {
            f.isPunching = false;
            f.punchProgress = 0;
            f.isHeavy = false;
            f.hasHit = false;
          });
          // S2 Lunges forward slightly to reach opponent
          dummy.vx += Math.cos(dummy.facingAngle) * 3.5;
          dummy.vy += Math.sin(dummy.facingAngle) * 3.5;
          spawnFloatingText(dummy.x, dummy.y - 30, 'RAPID CHAMBER...', '#ef4444');
        }
      }

      // SECTION 1.18 - FIX 2: Street Boxing M2 Flurry Auto-Burst State Machine (Dummy)
      if (tickStreetBoxingAutoBurst(dummy)) {
        // Micro-step to maintain pocket cling
        dummy.vx += Math.cos(dummy.facingAngle) * 2.0;
        dummy.vy += Math.sin(dummy.facingAngle) * 2.0;
        soundManager.playDash();
      }

      // Ashihara M2 3-Stage Sequence Progression (Dummy)
      if (dummy.styleId === 'ashihara') {
        if (dummy.ashiharaM2Stage === 2 && dummy.ashiharaM2Timer && dummy.ashiharaM2Timer > 0) {
          dummy.ashiharaM2Timer--;
          if (player && !player.isDead) {
            const pullAngle = Math.atan2(player.y - dummy.y, player.x - dummy.x);
            const targetDist = dummy.radius + player.radius + 8;
            player.x = dummy.x + Math.cos(pullAngle) * targetDist;
            player.y = dummy.y + Math.sin(pullAngle) * targetDist;
          }
          if (dummy.ashiharaM2Timer === 0) {
            dummy.ashiharaM2Stage = 3;
            dummy.ashiharaM2Timer = 12;
            const rearFist = dummy.fists.find(f => f.punchType === 'right') || dummy.fists[1] || dummy.fists[0];
            if (rearFist) {
              rearFist.isPunching = true;
              rearFist.punchProgress = 0.05;
              rearFist.isHeavy = true;
              rearFist.hasHit = false;
              (rearFist as any).ashiharaS3 = true;
            }
            soundManager.playPunch(true);
          }
        } else if (dummy.ashiharaM2Stage === 3 && dummy.ashiharaM2Timer && dummy.ashiharaM2Timer > 0) {
          dummy.ashiharaM2Timer--;
          const rearFist = dummy.fists.find(f => f.punchType === 'right') || dummy.fists[1] || dummy.fists[0];
          if (rearFist) {
            rearFist.isPunching = true;
            rearFist.punchProgress = Math.min(1.0, 1.0 - (dummy.ashiharaM2Timer / 12));
            rearFist.isHeavy = true;
            (rearFist as any).ashiharaS3 = true;

            if (dummy.ashiharaM2Timer === 6 && !rearFist.hasHit) {
              rearFist.hasHit = true;
              if (player && !player.isDead) {
                const ashiharaMods = getHeightModifiers(dummy.baseHeight);
                const s3Dmg = Math.round(13.0 * ashiharaMods.damageFactor * 0.90 * 10) / 10;
                if (matchData?.gamemode !== 'sustain_attack' && matchData?.gamemode !== 'hot_potato') {
                  player.health = Math.max(0, player.health - s3Dmg);
                }
                applyDamageCombatLocks(player);
                player.damageFlashTime = 16;
                player.stunTime = 51;
                player.strikeCooldown = 51;
                player.blockLockout = 51;
                player.isBlocking = false;
                
                dummy.heavyCooldown = 0;
                dummy.heavyWindup = 0;
                
                stateRef.current.shakeAmount = 14 * settings.screenShake;
                stateRef.current.hitStopFrames = 2;
                soundManager.playPunch(true);
                spawnFloatingText(player.x, player.y - 25, `-${s3Dmg} HP`, '#ef4444');
                
                for (let i = 0; i < 16; i++) {
                  const angle = dummy.facingAngle + (Math.random() - 0.5) * 1.2;
                  const speed = Math.random() * 6 + 3;
                  stateRef.current.particles.push({
                    id: `ashihara_s3_dummy_${Math.random()}`,
                    x: player.x,
                    y: player.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    radius: Math.random() * 3.5 + 2,
                    color: i % 2 === 0 ? '#1d4ed8' : '#facc15',
                    alpha: 1.0,
                    life: 0,
                    maxLife: 35,
                    type: 'spark'
                  });
                }
              }
            }
          }
          if (dummy.ashiharaM2Timer === 0) {
            dummy.ashiharaM2Stage = 0;
            if (rearFist) {
              rearFist.isPunching = false;
              rearFist.punchProgress = 0;
              rearFist.isHeavy = false;
              (rearFist as any).ashiharaS3 = false;
            }
            syncCombatStatesToUI();
          }
        }
      }

      // CQC M2 Echo Rings & Rear Blitz Assault Sequence (Dummy)
      if (dummy.styleId === 'cqc') {
        if (dummy.cqcM2Stage || ((dummy.heavyWindup || 0) > 0)) {
          if (player && !player.isDead) {
            const angleToTarget = Math.atan2(player.y - dummy.y, player.x - dummy.x);
            dummy.facingAngle = angleToTarget;
            dummy.cqcLockedAngle = angleToTarget;
          }
        }
        if (dummy.cqcM2Stage === 'windup' || (dummy.heavyWindup && dummy.heavyWindup > 0)) {
          const totalWindup = 90;
          const currentWindup = dummy.heavyWindup ?? dummy.cqcWindupTimer ?? 0;
          const elapsed = Math.max(0, totalWindup - currentWindup);

          // 8 Echo Rings with 20% decreased max range (272px)
          const MAX_RANGE = 272;
          const ringRadii: number[] = [];
          const rings = Array.from({ length: 8 }, (_, i) => {
            const maxR = Math.round(((i + 1) / 8) * MAX_RANGE);
            const startFrame = i * 9;
            const expandDuration = 18;
            let r = 0;
            if (elapsed >= startFrame) {
              const rElapsed = Math.min(expandDuration, elapsed - startFrame);
              r = Math.min(maxR, (rElapsed / expandDuration) * maxR);
            }
            ringRadii.push(r);
            return {
              r,
              maxR,
              frozen: !!dummy.cqcLockedTarget
            };
          });

          if (player && !player.isDead) {
            const dist = Math.hypot(player.x - dummy.x, player.y - dummy.y);
            const activeMaxR = Math.max(...ringRadii, 100);
            if (dist <= activeMaxR + player.radius && !dummy.cqcLockedTarget) {
              dummy.cqcLockedTarget = player;
              spawnFloatingText(player.x, player.y - 35, 'ECHO LOCKON!', '#ef4444');
              soundManager.playParry();
            }
          }

          dummy.cqcRings = rings;
        } else if (dummy.cqcM2Stage === 'dash') {
          const target = dummy.cqcLockedTarget || (player && !player.isDead ? player : null);
          if (target && !target.isDead) {
            const total = dummy.cqcDashTotalFrames || 18;
            const curFrame = Math.max(0, dummy.dashProgress || 0);
            const rawT = Math.min(1, Math.max(0, 1 - (curFrame / total)));
            // Smooth hermite glide interpolation
            const t = rawT * rawT * (3 - 2 * rawT);

            const startX = dummy.cqcDashStartX ?? dummy.x;
            const startY = dummy.cqcDashStartY ?? dummy.y;
            const endX = dummy.cqcDashEndX ?? dummy.x;
            const endY = dummy.cqcDashEndY ?? dummy.y;

            dummy.x = startX + (endX - startX) * t;
            dummy.y = startY + (endY - startY) * t;
            const glideAngle = Math.atan2(endY - startY, endX - startX);
            dummy.facingAngle = glideAngle;

            // Physical glide velocity
            dummy.vx = Math.cos(glideAngle) * 9.5;
            dummy.vy = Math.sin(glideAngle) * 9.5;

            // Target stays steady and frozen - no knockback, no movement
            target.vx = 0;
            target.vy = 0;
            if (target.styleId === 'ashihara') {
              target.stunTime = 0;
              target.hitMovementLock = 0;
              target.hitSteeringLock = 0;
            } else {
              target.stunTime = Math.max(target.stunTime || 0, 30);
              target.hitMovementLock = Math.max(target.hitMovementLock || 0, 30);
              target.hitSteeringLock = Math.max(target.hitSteeringLock || 0, 30);
            }

            if (target.styleId === 'ashihara' && ((target.heavyWindup && target.heavyWindup > 0) || (target.ashiharaM2Stage && target.ashiharaM2Stage >= 1))) {
              dummy.cqcM2Stage = null;
              dummy.cqcLockedTarget = null;
              dummy.cqcLockedAngle = undefined;
              dummy.cqcRings = undefined;
              dummy.isDashing = false;
              dummy.dashProgress = 0;
              dummy.heavyCooldown = 900;

              target.ashiharaM2Stage = 2;
              target.ashiharaM2Timer = 9;
              target.heavyWindup = 0;
              target.heavyCooldown = 0;

              soundManager.playParry();
              soundManager.playDash();
              stateRef.current.shakeAmount = 10 * settings.screenShake;
              spawnFloatingText(target.x, target.y - 35, 'SABAKI COUNTERED CQC BLITZ!', '#1d4ed8');
              return;
            }

            if (target.styleId === 'boxing_shell' && ((target.heavyWindup && target.heavyWindup > 0) || target.fists.some(f => f.isPunching && f.isHeavy))) {
              dummy.cqcM2Stage = null;
              dummy.cqcLockedTarget = null;
              dummy.cqcLockedAngle = undefined;
              dummy.cqcRings = undefined;
              dummy.isDashing = false;
              dummy.dashProgress = 0;
              dummy.heavyCooldown = 900;

              dummy.shellSpinTimer = 0;
              dummy.stunTime = 90;
              dummy.strikeCooldown = 90;
              dummy.shellLockoutTimer = 90;
              dummy.damageFlashTime = 10;
              dummy.isBlocking = false;
              dummy.blockLockout = 60;

              target.heavyWindup = 0;
              target.fists.forEach(f => { f.isPunching = false; f.punchProgress = 0; f.isHeavy = false; });
              target.heavyCooldown = 360;
              target.shellPostureBoostTimer = 180;
              target.parryFlashTime = 18;

              soundManager.playParry();
              soundManager.playRollTick();
              stateRef.current.shakeAmount = 10 * settings.screenShake;
              spawnFloatingText(dummy.x, dummy.y - 35, 'SHOULDER DEFLECTED & STAGGERED (1.5s)', '#d946ef');
              spawnFloatingText(target.x, target.y - 35, 'POSTURE RECOVERY BOOST 2X (3.0s)', '#d946ef');
              return;
            }

            stateRef.current.particles.push({
              id: `cqc_dash_d_${Math.random()}`,
              x: dummy.x,
              y: dummy.y,
              vx: -Math.cos(glideAngle) * (Math.random() * 2 + 1),
              vy: -Math.sin(glideAngle) * (Math.random() * 2 + 1),
              radius: dummy.radius * 0.45,
              color: '#ef4444',
              alpha: 0.55,
              life: 0,
              maxLife: 16,
              type: 'spark'
            });

            if (dummy.dashProgress === undefined || dummy.dashProgress <= 0) {
              const startX = dummy.cqcDashStartX ?? dummy.x;
              const startY = dummy.cqcDashStartY ?? dummy.y;

              // Smoothly land on the end position
              dummy.x = endX;
              dummy.y = endY;
              dummy.vx = 0;
              dummy.vy = 0;

              // Attacker continuously faces the enemy
              const angleToTarget = Math.atan2(target.y - dummy.y, target.x - dummy.x);
              dummy.facingAngle = angleToTarget;
              dummy.cqcLockedAngle = angleToTarget;

              // Check if opponent properly blocked head-on (passed through frontal guard)
              const incomingDir = Math.atan2(startY - target.y, startX - target.x);
              const angleDiff = Math.abs(Math.atan2(Math.sin(target.facingAngle - incomingDir), Math.cos(target.facingAngle - incomingDir)));
              const isHeadOnGuard = !!(target.isBlocking && (target.armorBreakTime || 0) <= 0 && (target.blockLockout || 0) <= 0 && angleDiff < (Math.PI * 0.5));

              dummy.cqcAssaultBlocked = isHeadOnGuard;
              dummy.cqcM2Stage = 'assault';
              dummy.cqcAssaultHit = 1;
              dummy.cqcAssaultTimer = 12; // 0.2s (12 frames) before 1st hit
              dummy.isDashing = false;
              dummy.dashProgress = 0;
              dummy.cqcRings = undefined;

              if (isHeadOnGuard) {
                // Guard intact: blocks the attack
                target.stunTime = 0;
                target.blockLockout = 0;
                target.isBlocking = true;
                target.hitSteeringLock = 0;
                target.hitMovementLock = 0;
                soundManager.playBlock();
                spawnFloatingText(target.x, target.y - 35, 'GUARD BLOCKED!', '#38bdf8');
              } else {
                // Did not block head-on: full damage & block disabled until 5th attack!
                target.isBlocking = false;
                target.blockLockout = 70; // Block disabled until 5th attack
                target.stunTime = 15;
                target.cqcAttackLockout = 15;
                target.vx = 0;
                target.vy = 0;
                target.hitSteeringLock = 15;
                target.hitMovementLock = 15;
                spawnFloatingText(target.x, target.y - 35, 'CQC ASSAULT (5-HIT)', '#ef4444');
                soundManager.playPunch(true);
              }
            } else {
              dummy.dashProgress--;
            }
          } else {
            dummy.cqcM2Stage = null;
            dummy.cqcLockedTarget = null;
            dummy.cqcLockedAngle = undefined;
            dummy.cqcAssaultBlocked = false;
            dummy.isDashing = false;
            dummy.dashProgress = 0;
            dummy.cqcRings = undefined;
            dummy.heavyCooldown = Math.max(dummy.heavyCooldown || 0, 900);
          }
        } else if (dummy.cqcM2Stage === 'assault') {
          const target = dummy.cqcLockedTarget || (player && !player.isDead ? player : null);
          if (target && !target.isDead) {
            // Attacker stays in place and tracks rotation facing the enemy
            dummy.vx = 0;
            dummy.vy = 0;
            const angleToTarget = Math.atan2(target.y - dummy.y, target.x - dummy.x);
            dummy.facingAngle = angleToTarget;
            dummy.cqcLockedAngle = angleToTarget;
            target.vx = 0;
            target.vy = 0;

            const isBlockedAssault = !!dummy.cqcAssaultBlocked;

            if (dummy.cqcAssaultHit && dummy.cqcAssaultHit < 5) {
              if (isBlockedAssault) {
                target.isBlocking = true;
                target.blockLockout = 0;
              } else {
                target.isBlocking = false;
                target.blockLockout = 15;
                target.stunTime = Math.max(target.stunTime || 0, 15);
                target.hitSteeringLock = Math.max(target.hitSteeringLock || 0, 15);
                target.hitMovementLock = Math.max(target.hitMovementLock || 0, 15);
              }
            }

            if (dummy.cqcAssaultTimer === undefined || dummy.cqcAssaultTimer <= 0) {
              const dMods = getHeightModifiers(dummy.baseHeight);
              const hitIndex = dummy.cqcAssaultHit || 1;
              const isTargetImmune = isFighterInIFrames(target);

              if (hitIndex < 4) {
                // Hits 1, 2, 3: Hits every 0.2s (12 frames)
                const fist = dummy.fists[(hitIndex - 1) % 2];
                if (fist) {
                  fist.isPunching = true;
                  fist.punchProgress = 0.2;
                  fist.hasHit = true;
                  fist.isHeavy = false;
                }

                if (isBlockedAssault) {
                  // Blocked hit: damages 86% of Armor HP (AP) on Hit 1, with chip damage
                  if (hitIndex === 1 && !isTargetImmune) {
                    const curArmor = target.armorHP !== undefined ? target.armorHP : 18;
                    const armorDmg = Math.round(curArmor * 0.86 * 10) / 10;
                    target.armorHP = Math.max(0, Math.round((curArmor - armorDmg) * 10) / 10);
                    target.armorRegenLockout = Math.max(target.armorRegenLockout || 0, 90);
                    spawnFloatingText(target.x, target.y - 45, `-${armorDmg} AP (86%)`, '#38bdf8');
                  }

                  const chipDmg = isTargetImmune ? 0 : Math.round(0.6 * dMods.damageFactor * 10) / 10;
                  if (!isTargetImmune && matchData?.gamemode !== 'sustain_attack' && matchData?.gamemode !== 'hot_potato') {
                    if (target.isPlayer && stateRef.current.godMode) {
                      // God mode
                    } else if (stateRef.current.oneHitKO && !target.isPlayer) {
                      target.health = 0;
                    } else {
                      target.health = Math.max(0, target.health - chipDmg);
                    }
                  }
                  target.damageFlashTime = 8;
                  target.blockTimer = (target.blockTimer || 0) + 12;
                  target.isBlocking = true;
                  target.blockLockout = 0;
                  target.stunTime = 0;
                  soundManager.playBlock();

                  if (isTargetImmune) {
                    spawnFloatingText(target.x, target.y - 30, 'IMMUNE (0 HP)', '#38bdf8');
                  }

                  for (let i = 0; i < 4; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const spd = Math.random() * 3 + 1.5;
                    stateRef.current.particles.push({
                      id: `cqc_blk_spk_d_${Math.random()}`,
                      x: target.x,
                      y: target.y,
                      vx: Math.cos(angle) * spd,
                      vy: Math.sin(angle) * spd,
                      radius: Math.random() * 2 + 1,
                      color: '#38bdf8',
                      alpha: 1.0,
                      life: 0,
                      maxLife: 12,
                      type: 'spark'
                    });
                  }
                } else {
                  // Unblocked hit: AP is NOT deducted when block does not face head-on; takes direct unblocked damage
                  const dmg = isTargetImmune ? 0 : Math.round(2.5 * dMods.damageFactor * 10) / 10;
                  if (!isTargetImmune && matchData?.gamemode !== 'sustain_attack' && matchData?.gamemode !== 'hot_potato') {
                    if (target.isPlayer && stateRef.current.godMode) {
                      // God mode
                    } else if (stateRef.current.oneHitKO && !target.isPlayer) {
                      target.health = 0;
                    } else {
                      target.health = Math.max(0, target.health - dmg);
                    }
                  }
                  target.damageFlashTime = 12;
                  target.cqcM2HitFlashTime = 14;
                  target.cqcAttackLockout = 15;
                  target.stunTime = Math.max(target.stunTime || 0, 15);
                  target.isBlocking = false;
                  target.blockLockout = 15;
                  stateRef.current.shakeAmount = 6 * settings.screenShake;
                  soundManager.playPunch(false);

                  if (isTargetImmune) {
                    spawnFloatingText(target.x, target.y - 30, 'IMMUNE (0 HP)', '#38bdf8');
                  }

                  for (let i = 0; i < 5; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const spd = Math.random() * 4 + 2;
                    stateRef.current.particles.push({
                      id: `cqc_assault_spk_d_${Math.random()}`,
                      x: target.x,
                      y: target.y,
                      vx: Math.cos(angle) * spd,
                      vy: Math.sin(angle) * spd,
                      radius: Math.random() * 2.5 + 1.5,
                      color: i % 2 === 0 ? '#ef4444' : '#cbd5e1',
                      alpha: 1.0,
                      life: 0,
                      maxLife: 15,
                      type: 'spark'
                    });
                  }
                }

                syncCombatStatesToUI();

                if (target.health <= 0) {
                  target.health = 0;
                  target.isDead = true;
                  triggerKOCinematic(dummy, target);
                  dummy.cqcM2Stage = null;
                  dummy.cqcLockedTarget = null;
                  dummy.cqcAssaultBlocked = false;
                  dummy.cqcRings = undefined;
                  dummy.isDashing = false;
                  dummy.dashProgress = 0;
                  syncCombatStatesToUI();
                  return;
                }

                dummy.cqcAssaultHit = hitIndex + 1;
                dummy.cqcAssaultTimer = 12; // 0.2s (12 frames) between hits
              } else if (hitIndex === 4) {
                // Hit 4: Lands, then sets up 0.25s window before Hit 5
                const fist = dummy.fists[1];
                if (fist) {
                  fist.isPunching = true;
                  fist.punchProgress = 0.2;
                  fist.hasHit = true;
                  fist.isHeavy = false;
                }

                if (isBlockedAssault) {
                  const chipDmg = isTargetImmune ? 0 : Math.round(0.6 * dMods.damageFactor * 10) / 10;
                  if (!isTargetImmune && matchData?.gamemode !== 'sustain_attack' && matchData?.gamemode !== 'hot_potato') {
                    if (target.isPlayer && stateRef.current.godMode) {
                      // God mode
                    } else if (stateRef.current.oneHitKO && !target.isPlayer) {
                      target.health = 0;
                    } else {
                      target.health = Math.max(0, target.health - chipDmg);
                    }
                  }
                  target.damageFlashTime = 8;
                  soundManager.playBlock();
                  if (isTargetImmune) {
                    spawnFloatingText(target.x, target.y - 30, 'IMMUNE (0 HP)', '#38bdf8');
                  }
                } else {
                  const dmg = isTargetImmune ? 0 : Math.round(2.5 * dMods.damageFactor * 10) / 10;
                  if (!isTargetImmune && matchData?.gamemode !== 'sustain_attack' && matchData?.gamemode !== 'hot_potato') {
                    if (target.isPlayer && stateRef.current.godMode) {
                      // God mode
                    } else if (stateRef.current.oneHitKO && !target.isPlayer) {
                      target.health = 0;
                    } else {
                      target.health = Math.max(0, target.health - dmg);
                    }
                  }
                  target.damageFlashTime = 12;
                  target.cqcM2HitFlashTime = 14;
                  stateRef.current.shakeAmount = 6 * settings.screenShake;
                  soundManager.playPunch(false);

                  if (isTargetImmune) {
                    spawnFloatingText(target.x, target.y - 30, 'IMMUNE (0 HP)', '#38bdf8');
                  }

                  for (let i = 0; i < 5; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const spd = Math.random() * 4 + 2;
                    stateRef.current.particles.push({
                      id: `cqc_assault_spk_d_${Math.random()}`,
                      x: target.x,
                      y: target.y,
                      vx: Math.cos(angle) * spd,
                      vy: Math.sin(angle) * spd,
                      radius: Math.random() * 2.5 + 1.5,
                      color: i % 2 === 0 ? '#ef4444' : '#cbd5e1',
                      alpha: 1.0,
                      life: 0,
                      maxLife: 15,
                      type: 'spark'
                    });
                  }
                }

                syncCombatStatesToUI();

                if (target.health <= 0) {
                  target.health = 0;
                  target.isDead = true;
                  triggerKOCinematic(dummy, target);
                  dummy.cqcM2Stage = null;
                  dummy.cqcLockedTarget = null;
                  dummy.cqcAssaultBlocked = false;
                  dummy.cqcRings = undefined;
                  dummy.isDashing = false;
                  dummy.dashProgress = 0;
                  syncCombatStatesToUI();
                  return;
                }

                dummy.cqcAssaultHit = 5;
                // 5th hit initiates after 0.25s (15 frames)
                dummy.cqcAssaultTimer = 15;
                target.blockLockout = 0; // Un-disables block before Hit 5
                target.stunTime = 0; // Un-stun so opponent can raise guard to parry
                target.hitSteeringLock = 0;
                target.hitMovementLock = 0;
                target.cqcAttackLockout = 0;
                // If defender was already holding block before the Hit 5 telegraph window, record it so merely holding block does not parry
                target.cqcWasBlockingAtHit4 = target.isBlocking;
                spawnFloatingText(target.x, target.y - 45, 'DEFEND HIT 5 (0.25s)!', '#fbbf24');
              } else if (hitIndex === 5) {
                  // Hit 5 lands after 0.15s delay
                  const fist = dummy.fists[0];
                  if (fist) {
                    fist.isPunching = true;
                    fist.punchProgress = 0.2;
                    fist.hasHit = true;
                    fist.isHeavy = true;
                  }

                  // Evaluate Perfect Parry vs Unblocked/Regular Block
                  const blockCheck = checkDirectionalBlock(target, dummy);
                  const isDirectionalBlocked = blockCheck.isBlocked;
                  const blockTimeFrames = target.blockTimer || 0;
                  const maxParryFrames = target.styleId === 'muay_thai' ? 23 : 11;
                  const canParry = (!target.parryLockoutTimer || target.parryLockoutTimer <= 0) && !target.cqcWasBlockingAtHit4;
                  const isParry = isDirectionalBlocked && target.isBlocking && (target.armorBreakTime || 0) <= 0 && canParry && blockTimeFrames <= maxParryFrames;

                  if (isParry) {
                    // Successful Perfect Parry on Hit 5: Parried strike deals 0 damage to the opponent!
                    target.damageFlashTime = 12;
                    target.parryFlashTime = 18;
                    target.parryBlockGraceTimer = 90;
                    target.afterParryGraceTimer = 90;
                    target.postBlockAttackLockout = 0;
                    target.strikeCooldown = 0;
                    target.blockLockout = 0;
                    target.parryLockoutTimer = 0;
                    target.blockTimer = 0;
                    target.blockUseCount = 0;
                    target.vx = 0;
                    target.vy = 0;
                    soundManager.playParry();
                    spawnFloatingText(target.x, target.y - 30, 'PARRIED!', '#f59e0b');

                    if (target.isPlayer) {
                      matchParriesLandedRef.current += 1;
                      roundParriesLandedRef.current += 1;
                      stateRef.current.totalParries = (stateRef.current.totalParries || 0) + 1;
                      setTotalParries(stateRef.current.totalParries);
                      QuestTracker.trackEvent(userEmail, {
                        type: 'parry',
                        mode: getMatchModeKey()
                      });
                    }
                  } else {
                    // Unblocked / Not Parried: Check if target is in I-Frames
                    const fullDmg = isTargetImmune ? 0 : Math.round(4.0 * dMods.damageFactor * 10) / 10;
                    if (!isTargetImmune && matchData?.gamemode !== 'sustain_attack' && matchData?.gamemode !== 'hot_potato') {
                      if (target.isPlayer && stateRef.current.godMode) {
                        // God mode
                      } else if (stateRef.current.oneHitKO && !target.isPlayer) {
                        target.health = 0;
                      } else {
                        target.health = Math.max(0, target.health - fullDmg);
                      }
                    }
                    target.damageFlashTime = 18;
                    target.isBlocking = false;
                    target.stunTime = 0; // Guard is allowed
                    target.blockLockout = 0; // Guard is allowed (can still block)
                    target.hitMovementLock = 51; // Movement disabled for 0.85s
                    target.cqcAttackLockout = 51; // Attack disabled for 0.85s
                    target.hitSteeringLock = 0;

                    const kbAngle = dummy.facingAngle;
                    target.vx = Math.cos(kbAngle) * 1.5;
                    target.vy = Math.sin(kbAngle) * 1.5;
                    soundManager.playPunch(true);

                    dummy.postureCd = 0;
                    dummy.isPostureLocked = false;
                    spawnFloatingText(dummy.x, dummy.y - 30, 'POSTURE CD RESET (0.0s)', '#22c55e');

                    if (isTargetImmune) {
                      spawnFloatingText(target.x, target.y - 30, 'IMMUNE (0 HP)', '#38bdf8');
                    } else {
                      spawnFloatingText(target.x, target.y - 30, `-${fullDmg} HP`, '#ef4444');
                    }
                  }

                  stateRef.current.shakeAmount = 14 * settings.screenShake;
                  stateRef.current.hitStopFrames = 2;

                  if (target.health <= 0) {
                    target.health = 0;
                    target.isDead = true;
                    triggerKOCinematic(dummy, target);
                  }

                  // Back to normal after the 5th attack
                  dummy.cqcM2Stage = null;
                  dummy.cqcLockedTarget = null;
                  dummy.cqcLockedAngle = undefined;
                  dummy.cqcRings = undefined;
                  dummy.isDashing = false;
                  dummy.dashProgress = 0;
                  dummy.heavyCooldown = 900; // 15.0s cooldown
                  dummy.strikeCooldown = 0; // Attacker can immediately follow up
                  dummy.lightCooldown = 0;
                  dummy.fists.forEach(f => {
                    f.isPunching = false;
                    f.punchProgress = 0;
                    f.isHeavy = false;
                    f.hasHit = false;
                  });
                  syncCombatStatesToUI();
                }
            } else {
              dummy.cqcAssaultTimer--;
            }
          } else {
            dummy.cqcM2Stage = null;
            dummy.cqcLockedTarget = null;
            dummy.cqcRings = undefined;
            dummy.isDashing = false;
            dummy.dashProgress = 0;
            dummy.heavyCooldown = Math.max(dummy.heavyCooldown || 0, 900);
            dummy.strikeCooldown = 0;
            dummy.lightCooldown = 0;
            dummy.fists.forEach(f => {
              f.isPunching = false;
              f.punchProgress = 0;
              f.isHeavy = false;
              f.hasHit = false;
            });
            syncCombatStatesToUI();
          }
        }
      }

      // Keysi M2 Clinch State Machine (Dummy)
      if (dummy.styleId === 'keysi') {
        if (dummy.keysiClinchStage === 'delay') {
          if (dummy.keysiClinchTimer && dummy.keysiClinchTimer > 0) {
            dummy.keysiClinchTimer--;
            dummy.vx = 0;
            dummy.vy = 0;
            if (dummy.keysiClinchTimer === 0) {
              const target = dummy.keysiClinchTarget || (player && !player.isDead ? player : null);
              if (target && !target.isDead) {
                const dist = Math.hypot(target.x - dummy.x, target.y - dummy.y);
                const inPocketRange = dist <= (dummy.radius + target.radius + 24);
                const blockCheck = checkDirectionalBlock(target, dummy);
                const blockTimeSec = (target.blockTimer || 0) / 60;
                const canParry = (!target.parryLockoutTimer || target.parryLockoutTimer <= 0) && (!target.keysiVulnerableTimer || target.keysiVulnerableTimer <= 0);
                const isParry = inPocketRange && blockCheck.isBlocked && target.isBlocking && (target.armorBreakTime || 0) <= 0 && canParry && blockTimeSec >= 0.0 && blockTimeSec <= PERFECT_PARRY_WINDOW_SEC;

                if (isParry) {
                  // Opponent parried the clinch grab the moment the elbow hits! Zero knockback!
                  target.parryFlashTime = 18;
                  target.parryBlockGraceTimer = 90;
                  target.afterParryGraceTimer = 90;
                  target.postBlockAttackLockout = 0;
                  target.strikeCooldown = 0;
                  target.vx = 0;
                  target.vy = 0;
                  dummy.vx = 0;
                  dummy.vy = 0;
                  soundManager.playParry();
                  spawnFloatingText(target.x, target.y - 30, 'PARRIED!', '#f59e0b');
                  dummy.heavyWindup = 0;
                  dummy.keysiClinchStage = null;
                  dummy.keysiClinchTarget = null;
                  applyHeavyWhiffPenalty(dummy);
                } else if (inPocketRange) {
                  // If enemy was holding block during the clamp: Shatters guard (AP) and initiates attack instantly
                  if (target.isBlocking) {
                    target.armorHP = 0;
                    target.armorBreakTime = 60;
                    soundManager.playGuardBreak();
                    spawnFloatingText(target.x, target.y - 30, 'GUARD BROKEN! (AP SHATTERED)', '#ef4444');
                  }

                  // Clinch Connected! The closed elbows immobilize the victim and disable all buttons
                  dummy.keysiClinchStage = 'clinch';
                  dummy.keysiClinchTimer = 38; // 38 frames (~0.63s) full headbutt sequence
                  dummy.keysiClinchTarget = target;
                  dummy.heavyCooldown = 900;
                  target.stunTime = Math.max(target.stunTime || 0, 48);
                  target.blockLockout = Math.max(target.blockLockout || 0, 48);
                  target.strikeCooldown = Math.max(target.strikeCooldown || 0, 48);
                  target.heavyCooldown = Math.max(target.heavyCooldown || 0, 48);
                  target.lightCooldown = Math.max(target.lightCooldown || 0, 48);
                  target.dashCooldown = Math.max(target.dashCooldown || 0, 48);
                  target.isBlocking = false;
                  target.vx = 0;
                  target.vy = 0;
                  soundManager.playParry();
                  spawnFloatingText(target.x, target.y - 35, 'HEAD CLAMPED!', '#ef4444');
                } else {
                  dummy.keysiClinchStage = null;
                  dummy.keysiClinchTarget = null;
                  applyHeavyWhiffPenalty(dummy);
                }
              } else {
                dummy.keysiClinchStage = null;
                dummy.keysiClinchTarget = null;
                applyHeavyWhiffPenalty(dummy);
              }
            }
          }
        } else if (dummy.keysiClinchStage === 'clinch') {
          if (dummy.keysiClinchTimer && dummy.keysiClinchTimer > 0) {
            dummy.keysiClinchTimer--;
            dummy.vx = 0;
            dummy.vy = 0;
            const target = dummy.keysiClinchTarget || (player && !player.isDead ? player : null);
            if (target && !target.isDead) {
              // Clamp pulls opponent inward and locks him firmly in place
              const clinchDist = dummy.radius + target.radius + 4;
              const desiredX = dummy.x + Math.cos(dummy.facingAngle) * clinchDist;
              const desiredY = dummy.y + Math.sin(dummy.facingAngle) * clinchDist;
              target.x += (desiredX - target.x) * 0.45;
              target.y += (desiredY - target.y) * 0.45;
              target.vx = 0;
              target.vy = 0;
              target.stunTime = Math.max(target.stunTime || 0, 15);
              target.blockLockout = Math.max(target.blockLockout || 0, 15);
              target.strikeCooldown = Math.max(target.strikeCooldown || 0, 15);
              target.heavyCooldown = Math.max(target.heavyCooldown || 0, 15);
              target.lightCooldown = Math.max(target.lightCooldown || 0, 15);
              target.dashCooldown = Math.max(target.dashCooldown || 0, 15);
              target.isBlocking = false;
            }
            // Frame 15: Headbutt impact delivery!
            if (dummy.keysiClinchTimer === 15) {
              if (target && !target.isDead) {
                const dMods = getHeightModifiers(dummy.baseHeight);
                const isTargetImmune = isFighterInIFrames(target);
                const headbuttDmg = isTargetImmune ? 0 : Math.round(14.0 * dMods.damageFactor * 10) / 10;
                if (!isTargetImmune && matchData?.gamemode !== 'sustain_attack' && matchData?.gamemode !== 'hot_potato') {
                  if (target.isPlayer && stateRef.current.godMode) {
                    // God mode
                  } else if (stateRef.current.oneHitKO && !target.isPlayer) {
                    target.health = 0;
                  } else {
                    target.health = Math.max(0, target.health - headbuttDmg);
                  }
                }
                applyDamageCombatLocks(target);
                target.damageFlashTime = 16;
                target.keysiStaggerTimer = 240; // 4.0s Trauma Stagger!
                target.vx = 0;
                target.vy = 0;
                stateRef.current.shakeAmount = 16 * settings.screenShake;
                stateRef.current.hitStopFrames = 3;
                soundManager.playPunch(true);
                if (isTargetImmune) {
                  spawnFloatingText(target.x, target.y - 35, 'IMMUNE (0 HP)', '#38bdf8');
                } else {
                  spawnFloatingText(target.x, target.y - 35, `-${headbuttDmg} HP (TRAUMA STAGGER!)`, '#ef4444');
                }

                // Crimson & Silver bone impact sparks
                for (let i = 0; i < 14; i++) {
                  const angle = Math.random() * Math.PI * 2;
                  const speed = Math.random() * 5 + 2.5;
                  stateRef.current.particles.push({
                    id: `keysi_headbutt_d_${Math.random()}`,
                    x: target.x,
                    y: target.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    radius: Math.random() * 3 + 1.5,
                    color: i % 2 === 0 ? '#ef4444' : '#e2e8f0',
                    alpha: 1.0,
                    life: 0,
                    maxLife: 30,
                    type: 'spark'
                  });
                }

                if (target.health <= 0) {
                  target.health = 0;
                  target.isDead = true;
                  triggerKOCinematic(dummy, target);
                }
              }
            }
            if (dummy.keysiClinchTimer === 0) {
              dummy.keysiClinchStage = null;
              dummy.keysiClinchTarget = null;
              dummy.strikeCooldown = 0;
              dummy.lightCooldown = 0;
              syncCombatStatesToUI();
            }
          }
        }
      }

      // Keysi Dash Interception / Collision Check (Dummy)
      if (dummy.isDashing && dummy.styleId === 'keysi' && player && !player.isDead) {
        const dist = Math.hypot(player.x - dummy.x, player.y - dummy.y);
        if (dist <= dummy.radius + player.radius + 22) {
          dummy.keysiM2Primed = true; // Passive still applies!
          const farThreshold = dummy.radius + player.radius + 80;
          const wasFarDistanced = (dummy.dashStartDist || 0) > farThreshold;
          if (wasFarDistanced) {
            dummy.isDashing = false;
            dummy.dashProgress = 0;
            dummy.vx = 0;
            dummy.vy = 0;
            soundManager.playRollTick();
            spawnFloatingText(dummy.x, dummy.y - 30, 'POCKET INTERCEPT (CLINCH PRIMED!)', '#ef4444');
            for (let i = 0; i < 6; i++) {
              const angle = Math.random() * Math.PI * 2;
              stateRef.current.particles.push({
                id: `keysi_dash_col_d_${Math.random()}`,
                x: (dummy.x + player.x) / 2,
                y: (dummy.y + player.y) / 2,
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3,
                radius: 2,
                color: i % 2 === 0 ? '#ef4444' : '#94a3b8',
                alpha: 1.0,
                life: 0,
                maxLife: 15,
                type: 'spark'
              });
            }
          } else if (!dummy.keysiCloseDashPrimed) {
            dummy.keysiCloseDashPrimed = true;
            soundManager.playRollTick();
            spawnFloatingText(dummy.x, dummy.y - 30, 'POCKET SLIP (CLINCH PRIMED!)', '#ef4444');
            for (let i = 0; i < 6; i++) {
              const angle = Math.random() * Math.PI * 2;
              stateRef.current.particles.push({
                id: `keysi_dash_col_d_close_${Math.random()}`,
                x: (dummy.x + player.x) / 2,
                y: (dummy.y + player.y) / 2,
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3,
                radius: 2,
                color: i % 2 === 0 ? '#ef4444' : '#94a3b8',
                alpha: 1.0,
                life: 0,
                maxLife: 15,
                type: 'spark'
              });
            }
          }
        }
      }

      // Armor block shield recharge when not blocking
      if (dummy.armorRegenLockout && dummy.armorRegenLockout > 0) {
        dummy.armorRegenLockout--;
      } else if (!dummy.isBlocking && (dummy.armorBreakTime || 0) <= 0) {
        if ((dummy.armorHP || 0) < 18) {
          // Calculate height-dependent regen interval in frames (0.8s at 68 in, max shortest 0.4s)
          const seconds = Math.max(0.4, 0.8 + (dummy.baseHeight - 68) * 0.05);
          const intervalFrames = Math.round(seconds * 60);

          dummy.armorRegenTimer = (dummy.armorRegenTimer || 0) + 1;
          if (dummy.armorRegenTimer >= intervalFrames) {
            dummy.armorHP = Math.min(18, (dummy.armorHP || 0) + 1);
            dummy.armorRegenTimer = 0;
            syncCombatStatesToUI();
          }
        } else {
          dummy.armorRegenTimer = 0;
        }
      } else {
        dummy.armorRegenTimer = 0;
      }

      // Dash timings decay
      if (dummy.dashCooldown && dummy.dashCooldown > 0) {
        dummy.dashCooldown--;
      }
      if (dummy.dashProgress && dummy.dashProgress > 0 && dummy.cqcM2Stage !== 'dash') {
        dummy.dashProgress--;

        // Spawn afterimages during dummy dash
        if (dummy.dashProgress % 3 === 0) {
          stateRef.current.particles.push({
            id: `dummy_dash_ghost_${Math.random()}`,
            x: dummy.x,
            y: dummy.y,
            vx: 0,
            vy: 0,
            radius: dummy.radius,
            color: dummy.styleId === 'basic' ? '#00e5ff' : dummy.color,
            alpha: 0.40,
            life: 0,
            maxLife: 14,
            type: 'afterimage',
            facingAngle: dummy.facingAngle
          } as any);
        }

        if (dummy.styleId === 'basic') {
          const frame = 48 - dummy.dashProgress;
          const styleObj = FIGHTING_STYLES.find(s => s.id === 'basic') || FIGHTING_STYLES[0];
          const styleSpeed = styleObj.statModifiers?.speed ?? 1.15;
          let forwardSpeed = 1.95 * styleSpeed; // Slower, tightly paced dash momentum with longer sway path
          if (dummy.concussTime && dummy.concussTime > 0) forwardSpeed *= 0.40;

          const lateralAmp = 2.4 * Math.sin((frame / 12) * Math.PI);
          const moveAngle = dummy.dashAngle !== undefined ? dummy.dashAngle : dummy.facingAngle;
          if (player && !player.isDead) {
            dummy.facingAngle = Math.atan2(player.y - dummy.y, player.x - dummy.x); // Maintain front facing at opponent even while back dashing
          }

          const fX = Math.cos(moveAngle);
          const fY = Math.sin(moveAngle);
          const pX = Math.cos(moveAngle + Math.PI / 2);
          const pY = Math.sin(moveAngle + Math.PI / 2);

          dummy.vx = fX * forwardSpeed + pX * lateralAmp;
          dummy.vy = fY * forwardSpeed + pY * lateralAmp;
          dummy.vx *= 0.94;
          dummy.vy *= 0.94;
        } else {
          // Dash has progressive friction
          dummy.vx *= 0.91;
          dummy.vy *= 0.91;
        }

        if (dummy.dashProgress === 0) {
          dummy.isDashing = false;
          dummy.dashAngle = undefined; // Reset dashAngle so it never leaks into attacks
          dummy.postDashAttackLockout = 18; // Section 2.8: 0.30s Post-Dash Attack Lockout
          if (dummy.styleId === 'basic') {
            dummy.flowStrikerBuffTimer = 18;
          } else {
            dummy.vx *= 0.5;
            dummy.vy *= 0.5;
          }
        }
      }

      // Attack strike cooldown decay
      if (dummy.strikeCooldown && dummy.strikeCooldown > 0) {
        dummy.strikeCooldown--;
      }
      if (dummy.lightCooldown && dummy.lightCooldown > 0) {
        dummy.lightCooldown--;
      }
      if (dummy.postureCd && dummy.postureCd > 0) {
        const decrement = (dummy.shellPostureBoostTimer && dummy.shellPostureBoostTimer > 0) ? 2 : 1;
        dummy.postureCd = Math.max(0, dummy.postureCd - decrement);
        dummy.isPostureLocked = dummy.postureCd > 0;
      } else {
        dummy.isPostureLocked = false;
        // If posture resets or combo chain resets when not mid-punch, clear feint trap boost & reset momentum drag
        const isPunching = dummy.fists.some(f => f.isPunching || f.punchProgress > 0);
        if (!isPunching && dummy.comboStage === 0) {
          dummy.flowS3ParryBaited = false;
          dummy.sluggerM1WhiffDragCount = 0;
          dummy.sluggerWhiffedStages = [];
        }
      }
      if (dummy.comboResetTimer && dummy.comboResetTimer > 0) {
        dummy.comboResetTimer--;
        if (dummy.comboResetTimer === 0) {
          dummy.comboStage = 0;
          dummy.sluggerM1WhiffDragCount = 0;
          dummy.sluggerWhiffedStages = [];
          dummy.shellS3Primed = false;
          dummy.shellS4ReturnTimer = 0;
          dummy.flowS3ParryBaited = false;
          dummy.flowS1Whiffed = false;
          dummy.flowS2HasIFrames = false;
        }
      }
      if (dummy.shellS4ReturnTimer && dummy.shellS4ReturnTimer > 0) {
        dummy.shellS4ReturnTimer--;
      }
      if (dummy.shotokanRenZukiPending && (!dummy.lightCooldown || dummy.lightCooldown <= 0) && (!dummy.postureCd || dummy.postureCd <= 0)) {
        dummy.shotokanRenZukiPending = false;
        if (dummy.comboStage === 2 && !dummy.stunTime && !dummy.isDead) {
          const leftFist = dummy.fists.find(f => f.punchType === 'left');
          if (leftFist) { leftFist.isPunching = true; leftFist.punchProgress = 0; leftFist.comboStage = 2; }
          soundManager.playDash();
          dummy.comboStage = 3;
          const dummyMods = getHeightModifiers(dummy.baseHeight);
          dummy.lightCooldown = Math.round(getStyleM1BetweenCooldown('shotokan', 2) / dummyMods.speedFactor);
        }
      }
      if (dummy.heavyCooldown && dummy.heavyCooldown > 0) {
        dummy.heavyCooldown--;
      }
      if (dummy.postS4HeavyLockout && dummy.postS4HeavyLockout > 0) {
        dummy.postS4HeavyLockout--;
      }
      if (dummy.superCrippleTimer && dummy.superCrippleTimer > 0) {
        dummy.superCrippleTimer--;
      }
      if (dummy.kyokushinSpiralTimer && dummy.kyokushinSpiralTimer > 0) {
        dummy.kyokushinSpiralTimer--;
      }
      if (dummy.boneFractureTimer && dummy.boneFractureTimer > 0) {
        dummy.boneFractureTimer--;
      }
      if (dummy.keysiStaggerTimer && dummy.keysiStaggerTimer > 0) {
        dummy.keysiStaggerTimer--;
      }
      if (dummy.keysiVulnerableTimer && dummy.keysiVulnerableTimer > 0) {
        dummy.keysiVulnerableTimer--;
        if (dummy.keysiVulnerableTimer === 0 && dummy.keysiQueuedWhiffCd && dummy.keysiQueuedWhiffCd > 0) {
          dummy.heavyCooldown = dummy.keysiQueuedWhiffCd;
          dummy.keysiQueuedWhiffCd = 0;
        }
      }
      if (dummy.kickboxingSeq2Window && dummy.kickboxingSeq2Window > 0) {
        dummy.kickboxingSeq2Window--;
        if (dummy.kickboxingSeq2Window === 0) {
          dummy.kickboxingSeq2Ready = false;
          if (dummy.styleId === 'kickboxing') {
            dummy.heavyCooldown = 270;
          }
        }
      }

      dummy.x += dummy.vx;
      dummy.y += dummy.vy;

      if (state.freezeAI) {
        dummy.vx = 0;
        dummy.vy = 0;
      }

      // Friction (Use smooth slide friction 0.94 during spinout or stun so knockback carries smoothly across arena)
      const isDummyStunned = (
        (dummy.kyokushinSpinOutTimer && dummy.kyokushinSpinOutTimer > 0) ||
        (dummy.stunTime && dummy.stunTime > 0) ||
        (dummy.parriedStun && dummy.parriedStun > 0) ||
        (dummy.hitMovementLock && dummy.hitMovementLock > 0)
      );
      const dummyFriction = isDummyStunned ? 0.94 : 0.88;
      dummy.vx *= dummyFriction;
      dummy.vy *= dummyFriction;

      // Universal Rule: Concussion (S4/M2 hit) 60% movement speed slowdown enforcement (Bypassed during spinout or stun so knockback slides smoothly)
      if (dummy.concussTime && dummy.concussTime > 0 && (dummy.damageFlashTime || 0) <= 0 && !dummy.isDashing && (!dummy.kyokushinSpinOutTimer || dummy.kyokushinSpinOutTimer <= 0) && (!dummy.stunTime || dummy.stunTime <= 0)) {
        const concussedMaxSpeed = BASE_MOVEMENT_SPEED * 0.40;
        const curSpd = Math.sqrt(dummy.vx * dummy.vx + dummy.vy * dummy.vy);
        if (curSpd > concussedMaxSpeed) {
          dummy.vx = (dummy.vx / curSpd) * concussedMaxSpeed;
          dummy.vy = (dummy.vy / curSpd) * concussedMaxSpeed;
        }
      }

      // Boundary cage bounding
      const radiusLim = (arenaSize / 2) - dummy.radius - 8;
      const centerDist = Math.sqrt((dummy.x - (arenaSize / 2)) ** 2 + (dummy.y - (arenaSize / 2)) ** 2);
      if (centerDist > radiusLim) {
        const angle = Math.atan2(dummy.y - (arenaSize / 2), dummy.x - (arenaSize / 2));
        dummy.x = (arenaSize / 2) + radiusLim * Math.cos(angle);
        dummy.y = (arenaSize / 2) + radiusLim * Math.sin(angle);
        dummy.vx *= -0.3;
        dummy.vy *= -0.3;
      }

      // Fists lunge animations
      const dummyMods = getHeightModifiers(dummy.baseHeight);
      dummy.fists.forEach(fist => {
        const stage = dummy.comboStage === 0 ? 3 : (dummy.comboStage - 1);
        const isShinKick = dummy.styleId === 'muay_thai' && fist.punchType === 'left' && stage === 3;

        let basePunchSpeed = 0.17;
        let baseReturnSpeed = 0.12;
        
        if (fist.isKineticCounter) {
          basePunchSpeed = 0.18;
          baseReturnSpeed = 0.11;
        } else if (isShinKick) {
          basePunchSpeed = 0.035;
          baseReturnSpeed = 0.11;
        } else if (fist.isHeavy) {
          if (dummy.styleId === 'street_boxing') {
            basePunchSpeed = 0.1381; // Standardized Kyokushin Baseline Execution Speed
            baseReturnSpeed = (1.0 / 66) * 0.85;
          }
          else if (dummy.styleId === 'slugger') {
            let execMult = 1.0;
            if (dummy.boneFractureTimer && dummy.boneFractureTimer > 0) {
              execMult *= 0.60;
            }
            basePunchSpeed = 0.075 * 0.68 * execMult;
            baseReturnSpeed = 0.055 * 0.68 * execMult;
          }
          else if (dummy.styleId === 'capoeira') { basePunchSpeed = 0.075; baseReturnSpeed = 0.055; }
          else if (dummy.styleId === 'shotokan') { basePunchSpeed = 0.09; baseReturnSpeed = 0.07; }
          else if (dummy.styleId === 'ashihara') { basePunchSpeed = 0.085; baseReturnSpeed = 0.065; }
          else if (dummy.styleId === 'kyokushin') { 
            basePunchSpeed = 0.20; // 5 Frames Explosive Piston Thrust (~0.08s)
            baseReturnSpeed = 0.10; // 10 Frames Deliberate Clean Revert
          }
          else if (dummy.styleId === 'keysi') { basePunchSpeed = 0.14; baseReturnSpeed = 0.10; }
          else if (dummy.styleId === 'kickboxing') {
            const isSeq2 = (fist as any)?.kickboxingSeq2 || dummy.kickboxingIsSeq2;
            if (isSeq2) {
              basePunchSpeed = 0.33; // 3 Frames Teep Thrust
              baseReturnSpeed = 0.10; // 10 Frames over-extension
            } else {
              basePunchSpeed = 0.33; // 3 Frames Short Hook Execution
              baseReturnSpeed = 0.16; // 6 Frames over-swing
            }
          }
          else if (dummy.styleId === 'boxing_shell') {
            basePunchSpeed = 0.22; // Quick shoulder roll turn (~4-5 frames)
            baseReturnSpeed = 0.18; // Quick snap back recovery (~5-6 frames)
          }
          else { basePunchSpeed = 0.08; baseReturnSpeed = 0.06; }
        } else {
          const fistStage = fist.comboStage !== undefined ? fist.comboStage : (dummy.comboStage === 0 ? 3 : Math.max(0, dummy.comboStage - 1));
          const m1 = getStyleM1Speeds(dummy.styleId, fistStage);
          basePunchSpeed = m1.punchSpeed;
          baseReturnSpeed = m1.returnSpeed;
          if (dummy.styleId === 'slugger') {
            let execMult = 1.0;
            if (dummy.sluggerM1WhiffDragCount && dummy.sluggerM1WhiffDragCount > 0) {
              execMult *= Math.max(0.30, 1.0 - (0.20 * dummy.sluggerM1WhiffDragCount));
            }
            if (dummy.boneFractureTimer && dummy.boneFractureTimer > 0) {
              execMult *= 0.60;
            }
            basePunchSpeed *= execMult;
            baseReturnSpeed *= execMult;
          } else if (dummy.styleId === 'street_boxing') {
            // Street Boxing strictly adheres to universal execution speed baseline
          } else if (dummy.styleId === 'boxing_shell') {
            const stage = fist.comboStage !== undefined ? fist.comboStage : (dummy.comboStage === 0 ? 3 : dummy.comboStage - 1);
            if (stage === 0 || stage === 1) {
              basePunchSpeed = m1.punchSpeed * 1.50; // Snapping Lead Execution: 50% faster Execution Speed for S1 & S2 (~66.7ms / ~4.0f)
              baseReturnSpeed = m1.returnSpeed * 1.50;
            } else {
              basePunchSpeed = m1.punchSpeed; // Iron Boxing: 100.0ms (~6.0 frames)
              baseReturnSpeed = m1.returnSpeed;
            }
          }
        }

        if (fist.isPunching) {
          if (fist.punchProgress === 0) {
            fist.hasHit = false;
            fist.punchTimeSec = 0;
            fist.lingerTimer = 0;
            fist.isLingerActive = false;

            // SECTION 1.4: Opposing Torque Transition
            // If the opposing limb was holding in Chamber Linger (or still extended),
            // cancel its linger hold so it smoothly retracts simultaneously as a kinetic counterweight!
            dummy.fists.forEach(otherFist => {
              if (otherFist.id !== fist.id && otherFist.lingerTimer && otherFist.lingerTimer > 0) {
                otherFist.lingerTimer = 0;
                otherFist.isLingerActive = false;
              }
            });

            // SECTION 1.4: Zero Double-Travel
            // Capture current 2D canvas coordinates dynamically for the 3-frame slerp decouple
            if (fist.currentSpatialX !== undefined && fist.currentSpatialY !== undefined && (!fist.blendTimer || fist.blendTimer <= 0)) {
              fist.blendStartX = fist.currentSpatialX;
              fist.blendStartY = fist.currentSpatialY;
              fist.blendTimer = 3;
            }
          }
          fist.punchTimeSec = (fist.punchTimeSec || 0) + (1 / 60);
          const momentumMultiplier = 1.0;
          // SECTION 1.17: Pure Style Execution - Decoupled from height scaling
          const punchSpeed = basePunchSpeed * momentumMultiplier;
          fist.punchProgress += punchSpeed;
          if (fist.punchProgress >= 1.0) {
            fist.punchProgress = 1.0;
            fist.isPunching = false;
            fist.lingerTimer = 0;
            fist.isLingerActive = false;
          }
        } else if (fist.punchProgress > 0) {
          if (dummy.styleId === 'kyokushin' && fist.isHeavy && (dummy.kyokushinM2PeakHoldTimer || 0) > 0) {
            dummy.kyokushinM2PeakHoldTimer!--;
            fist.punchProgress = 1.0; // Rigid Lock: Freeze solid at peak! Zero spring-back or rubber-banding
            return;
          }
          // SECTION 1.18: Duration Speed (DS) Matrix & Asynchronous Combo Acceleration (2.5x)
          fist.punchTimeSec = (fist.punchTimeSec || 0) + (1 / 60);
          const isComboAccelerating = dummy.fists.some(other => other.id !== fist.id && other.isPunching);
          const isExempt = !fist.isHeavy && ((dummy.styleId === 'basic' && fist.comboStage === 2) || (dummy.styleId === 'aikido' && fist.comboStage === 2));
          const fistStage = fist.comboStage !== undefined ? fist.comboStage : (dummy.comboStage === 0 ? 3 : Math.max(0, dummy.comboStage - 1));
          const returnDelta = calculateAsymmetricalRetractionDelta(fist.punchProgress, baseReturnSpeed, 1.0, isComboAccelerating, isExempt, dummy.styleId, fistStage, fist.isHeavy);
          fist.punchProgress -= returnDelta;
          if (fist.punchProgress <= 0.01) {
            fist.punchProgress = 0;
            fist.lingerTimer = 0;
            fist.isLingerActive = false;
            fist.punchTimeSec = 0;
            if (dummy.styleId === 'kyokushin' && fist.isHeavy) {
              dummy.kyokushinM2PeakHoldTimer = 0;
            }
            if (!fist.isHeavy) {
              dummy.postM1BlockLockout = 9; // Section 2.8: 0.15s Block Lockout (CanBlock = false)
            }
            if (dummy.styleId === 'slugger' && !fist.isHeavy) {
              if ((dummy.comboResetTimer || 0) < 110) {
                dummy.comboResetTimer = 110;
              }
              if (!fist.hasHit) {
                const wStage = fist.comboStage !== undefined ? fist.comboStage : 0;
                if (!dummy.sluggerWhiffedStages) dummy.sluggerWhiffedStages = [];
                if (!dummy.sluggerWhiffedStages.includes(wStage)) {
                  dummy.sluggerWhiffedStages.push(wStage);
                  dummy.sluggerM1WhiffDragCount = Math.min(3, dummy.sluggerWhiffedStages.length);
                  spawnFloatingText(dummy.x, dummy.y - 30, `MOMENTUM DRAG (-${dummy.sluggerM1WhiffDragCount * 20}%)`, '#f59e0b');
                }
              }
            }
            if (dummy.styleId === 'capoeira' && !fist.hasHit && !dummy.capoeiraWhiffBonusActive) {
              dummy.capoeiraWhiffBonusActive = true;
              spawnFloatingText(dummy.x, dummy.y - 30, 'FLOW RECOVERY READY!', '#ca8a04');
            }
            if (dummy.styleId === 'basic' && !fist.isHeavy) {
              if (fist.comboStage === 0 && !fist.hasHit) {
                dummy.flowS1Whiffed = true;
              } else if (fist.comboStage === 1) {
                dummy.flowS2HasIFrames = false;
              } else if (fist.comboStage === 3) {
                // S4 completed / missed: remove boost
                dummy.flowS3ParryBaited = false;
              }
            }
            if (fist.isHeavy) {
              if (dummy.styleId === 'street_boxing') {
                const stage = dummy.streetBoxingM2Stage || 1;
                if (stage === 1) {
                  if (fist.hasHit) {
                    dummy.streetBoxingM2NextTimer = 3;
                  } else {
                    dummy.streetBoxingM2Stage = 0;
                    dummy.streetBoxingM2Hits = 0;
                    dummy.streetBoxingUnbreakable = false;
                    applyHeavyWhiffPenalty(dummy);
                  }
                } else if (stage === 2) {
                  dummy.streetBoxingM2NextTimer = 3;
                } else {
                  dummy.streetBoxingM2Stage = 0;
                  dummy.streetBoxingUnbreakable = false;
                  if (!fist.hasHit && (dummy.streetBoxingM2Hits || 0) < 3) {
                    applyHeavyWhiffPenalty(dummy);
                  }
                }
              } else if (dummy.styleId === 'kickboxing') {
                const isSeq2 = (fist as any)?.kickboxingSeq2 || dummy.kickboxingIsSeq2;
                if (!isSeq2) {
                  // S1 finished its hook (whether hit or missed) - queue S2 after 0.15s (9 frames)
                  if (!dummy.kickboxingAutoSeq2Timer) {
                    dummy.kickboxingAutoSeq2Timer = 9;
                  }
                } else {
                  // S2 finished
                  if (!fist.hasHit) {
                    applyHeavyWhiffPenalty(dummy);
                  }
                  dummy.kickboxingIsSeq2 = false;
                }
              } else {
                if (!fist.hasHit) {
                  applyHeavyWhiffPenalty(dummy);
                }
              }
              fist.isHeavy = false;
              dummy.attackLockedAngle = undefined; // RESET THE LOCKED ANGLE!
            }
            fist.isKineticCounter = false;
            fist.hasHit = false; // Reset hit flag
          }
        } else {
          fist.punchProgress = 0;
          if (fist.isHeavy) {
            if (dummy.styleId === 'street_boxing') {
              if (!fist.hasHit && (dummy.streetBoxingM2Hits || 0) === 0) {
                applyHeavyWhiffPenalty(dummy);
              }
              dummy.streetBoxingM2Stage = 0;
              dummy.streetBoxingUnbreakable = false;
            } else if (!fist.hasHit) {
              applyHeavyWhiffPenalty(dummy);
            }
            fist.isHeavy = false;
            dummy.attackLockedAngle = undefined; // RESET THE LOCKED ANGLE!
          }
          fist.isKineticCounter = false;
          fist.hasHit = false;
        }
      });

      // Synchronize Kyokushin Left Arm counterbalance motion with Right Fist M2
      if (dummy.styleId === 'kyokushin') {
        const rf = dummy.fists.find(f => f.punchType === 'right');
        const lf = dummy.fists.find(f => f.punchType === 'left');
        if (rf && (rf.isHeavy || (dummy.kyokushinM2PeakHoldTimer || 0) > 0) && lf) {
          lf.punchProgress = rf.punchProgress;
          lf.isPunching = rf.isPunching;
          lf.hasHit = true; // Strictly disabled hitbox
        }
      }
    }

    // 4. Update visual particle objects
    state.particles.forEach(p => {
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      p.alpha = 1.0 - (p.life / p.maxLife);
    });
    // Remove dead particles & enforce safe 120 particle pool cap for zero-impact FPS optimization
    state.particles = state.particles.filter(p => p.life < p.maxLife);
    if (state.particles.length > 120) {
      state.particles = state.particles.slice(state.particles.length - 120);
    }
  };

function checkLineSegmentToCircle(
  x1: number, y1: number,
  x2: number, y2: number,
  cx: number, cy: number,
  r: number
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return Math.hypot(cx - x1, cy - y1) <= r;
  }
  const t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / lenSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(cx - projX, cy - projY) <= r;
}

  // Avoid overlap collision pushing and handle per-frame parts-based hitboxes
  const detectSparringCollisions = () => {
    const state = stateRef.current;
    if ((matchData?.isCompetitive || matchData?.isAiMatch) && state.rankedState !== 'fighting') return;
    const player = state.player;
    const dummy = state.dummy;
    if (!player || player.isDead || !dummy || dummy.isDead) return;

    // 1. Physical body overlap collision pushing (disabled during CQC M2 dash and assault to allow smooth pass-through without pushing)
    const isCqcActive = (player.cqcM2Stage !== null && player.cqcM2Stage !== undefined) ||
                        (dummy.cqcM2Stage !== null && dummy.cqcM2Stage !== undefined);
    if (!isCqcActive) {
      const dx = dummy.x - player.x;
      const dy = dummy.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = player.radius + dummy.radius;

      if (dist < minDist) {
        const overlap = minDist - dist;
        const pushX = (dx / (dist || 1)) * overlap * 0.5;
        const pushY = (dy / (dist || 1)) * overlap * 0.5;

        player.x -= pushX;
        player.y -= pushY;
        dummy.x += pushX;
        dummy.y += pushY;
      }
    }

    // 2. "Parts as Hurt Objects" - Check fist hitboxes every frame during punch
    const idleTime = Date.now() / 1000;

    // Player hitting Dummy
    player.fists.forEach(fist => {
      // 🛠️ 1. Hitbox Bug Fix: Left Arm Isolation
      // Left Arm / Left Glove has its hitbox completely disabled throughout the entire M2 animation.
      if (player.styleId === 'kyokushin' && fist.punchType === 'left' && (fist.isHeavy || (player.heavyWindup && player.heavyWindup > 0) || player.fists.some(f => f.punchType === 'right' && f.isHeavy))) {
        return;
      }
      if ((fist.isPunching || fist.punchProgress > 0) && !fist.hasHit) {
        const hitbox = getStrikeHitboxInfo(player, fist, idleTime, state.gameTime);
        if (!hitbox.isActiveHitWindow) return;

        const stage = hitbox.stage;
        const hitRadius = hitbox.hitRadius;
        const hitBuffer = hitbox.hitBuffer;
        const strikeX = hitbox.strikeX;
        const strikeY = hitbox.strikeY;
        const sampleFractions = hitbox.sampleFractions;

        // Retrieve full visual transforms (lunge, sway, torso twist/rotations) to perfectly align collision with visual model
        const { visualAngle: pVisualAngle, lungeOffset: pLunge, swayLateralOffset: pSway } = getFighterVisualTransform(player, state.gameTime);
        const pCos = Math.cos(pVisualAngle);
        const pSin = Math.sin(pVisualAngle);
        const playerCenterX = player.x + pLunge * pCos - pSway * pSin;
        const playerCenterY = player.y + pLunge * pSin + pSway * pCos;

        const worldFistX = playerCenterX + (strikeX * pCos - strikeY * pSin);
        const worldFistY = playerCenterY + (strikeX * pSin + strikeY * pCos);

        // Retrieve dummy visual transforms for exact hurtbox center
        const { visualAngle: dVisualAngle, lungeOffset: dLunge, swayLateralOffset: dSway } = getFighterVisualTransform(dummy, state.gameTime);
        const dummyCenterX = dummy.x + dLunge * Math.cos(dVisualAngle) - dSway * Math.sin(dVisualAngle);
        const dummyCenterY = dummy.y + dLunge * Math.sin(dVisualAngle) + dSway * Math.cos(dVisualAngle);

        // Check distance to dummy center from strike tip
        const hdx = dummyCenterX - worldFistX;
        const hdy = dummyCenterY - worldFistY;
        const hdist = Math.sqrt(hdx * hdx + hdy * hdy);

        let strikePos: { x: number; y: number } | undefined = undefined;
        let hasOverlap = hdist <= dummy.radius + hitRadius + hitBuffer;

        if (player.styleId === 'boxing_shell' && fist.isHeavy) {
          // Shoulder Roll Push: Point-blank clinch contact ~10px beyond radii
          const centerDist = Math.hypot(dummyCenterX - playerCenterX, dummyCenterY - playerCenterY);
          hasOverlap = (centerDist <= player.radius + dummy.radius + 10) && fist.punchProgress >= 0.20 && fist.punchProgress <= 0.80;
          if (hasOverlap) {
            strikePos = {
              x: playerCenterX + (dummyCenterX - playerCenterX) * 0.5,
              y: playerCenterY + (dummyCenterY - playerCenterY) * 0.5
            };
          }
        } else if (player.styleId === 'basic' && !fist.isHeavy) {
          if (stage === 0 && fist.punchProgress < 0.25) {
            hasOverlap = false;
          } else if (stage === 2) {
            // S3 is a pure feint (0 DMG)
            hasOverlap = false;
            // Check Parry Baiting if opponent is within CLOSE melee threat range (+40) and blocking / parrying
            const distToDummy = Math.hypot(dummy.x - player.x, dummy.y - player.y);
            if (distToDummy <= player.radius + dummy.radius + 40 && (dummy.isBlocking || (dummy.blockTimer || 0) > 0)) {
              if (!player.flowS3ParryBaited) {
                player.flowS3ParryBaited = true;
                spawnFloatingText(player.x, player.y - 30, 'FEINT BAITED! S4 PRIMED', '#ef4444');
                soundManager.playParry();
              }
            }
          }
        }

        if (hasOverlap && !strikePos) {
          strikePos = { x: worldFistX, y: worldFistY };
        }

        // Street Boxing Hit-Confirm Guarantee: Landing 1st jab makes follow-ups guaranteed hits on hit-stunned opponent
        if (!hasOverlap && player.styleId === 'street_boxing' && fist.isHeavy && player.streetBoxingUnbreakable) {
          const distToDummy = Math.hypot(dummy.x - player.x, dummy.y - player.y);
          if (distToDummy <= player.radius + dummy.radius + 80 && fist.punchProgress >= 0.20) {
            hasOverlap = true;
            strikePos = { x: dummyCenterX, y: dummyCenterY };
          }
        }

        // Multi-point hand / arm / leg segment sampling along full extension reach vector
        if (!hasOverlap && !(player.styleId === 'boxing_shell' && fist.isHeavy) && !(player.styleId === 'basic' && !fist.isHeavy && stage === 2)) {
          for (let s = 0; s < sampleFractions.length; s++) {
            const frac = sampleFractions[s];
            const segX = strikeX * frac;
            const segY = strikeY * frac;
            const worldSegX = playerCenterX + (segX * pCos - segY * pSin);
            const worldSegY = playerCenterY + (segX * pSin + segY * pCos);
            const sdx = dummyCenterX - worldSegX;
            const sdy = dummyCenterY - worldSegY;
            const sdist = Math.sqrt(sdx * sdx + sdy * sdy);
            if (sdist <= dummy.radius + hitRadius + hitBuffer) {
              hasOverlap = true;
              strikePos = { x: worldSegX, y: worldSegY };
              break;
            }
          }
          if (!hasOverlap) {
            hasOverlap = checkLineSegmentToCircle(
              playerCenterX, playerCenterY,
              worldFistX, worldFistY,
              dummyCenterX, dummyCenterY,
              dummy.radius + hitRadius + hitBuffer
            );
            if (hasOverlap && !strikePos) {
              strikePos = { x: worldFistX, y: worldFistY };
            }
          }
        }

        // Continuous angular sweep sub-step sampling for Capoeira M2 spinning kick
        if (!hasOverlap && player.styleId === 'capoeira' && fist.isHeavy) {
          const pMods = getHeightModifiers(player.baseHeight);
          const pSpeed = 0.075 * pMods.speedFactor;
          const prevP = Math.max(0, fist.punchProgress - pSpeed);
          const currP = fist.punchProgress;
          const sweepRadius = player.radius * 1.90;
          const subCount = 6;
          for (let k = 0; k <= subCount; k++) {
            const subP = prevP + (currP - prevP) * (k / subCount);
            const subHelico = subP * Math.PI * 2.0;
            const subRelX = Math.cos(subHelico) * sweepRadius;
            const subRelY = Math.sin(subHelico) * sweepRadius;
            const subFractions = [0.40, 0.60, 0.80, 1.0, 1.10];
            for (let sf = 0; sf < subFractions.length; sf++) {
              const frac = subFractions[sf];
              const segX = subRelX * frac;
              const segY = subRelY * frac;
              const worldSegX = playerCenterX + (segX * pCos - segY * pSin);
              const worldSegY = playerCenterY + (segX * pSin + segY * pCos);
              const sdx = dummyCenterX - worldSegX;
              const sdy = dummyCenterY - worldSegY;
              if (Math.hypot(sdx, sdy) <= dummy.radius + hitRadius + hitBuffer) {
                hasOverlap = true;
                strikePos = { x: worldSegX, y: worldSegY };
                break;
              }
            }
            if (hasOverlap) break;
          }
        }

        // If fist/foot overlaps dummy's radius + buffer
        if (hasOverlap) {
          fist.hasHit = true;
          applyFighterHit(player, dummy, fist.isHeavy, fist.comboStage ?? player.comboStage, strikePos);
        }
      }
    });

    // Dummy hitting Player
    dummy.fists.forEach(fist => {
      // 🛠️ 1. Hitbox Bug Fix: Left Arm Isolation
      // Left Arm / Left Glove has its hitbox completely disabled throughout the entire M2 animation.
      if (dummy.styleId === 'kyokushin' && fist.punchType === 'left' && (fist.isHeavy || (dummy.heavyWindup && dummy.heavyWindup > 0) || dummy.fists.some(f => f.punchType === 'right' && f.isHeavy))) {
        return;
      }
      if ((fist.isPunching || fist.punchProgress > 0) && !fist.hasHit) {
        const hitbox = getStrikeHitboxInfo(dummy, fist, idleTime, state.gameTime);
        if (!hitbox.isActiveHitWindow) return;

        const stage = hitbox.stage;
        const hitRadius = hitbox.hitRadius;
        const hitBuffer = hitbox.hitBuffer;
        const strikeX = hitbox.strikeX;
        const strikeY = hitbox.strikeY;
        const sampleFractions = hitbox.sampleFractions;

        // Retrieve full visual transforms (lunge, sway, torso twist/rotations) to perfectly align collision with visual model
        const { visualAngle: dVisualAngle, lungeOffset: dLunge, swayLateralOffset: dSway } = getFighterVisualTransform(dummy, state.gameTime);
        const dCos = Math.cos(dVisualAngle);
        const dSin = Math.sin(dVisualAngle);
        const dummyCenterX = dummy.x + dLunge * dCos - dSway * dSin;
        const dummyCenterY = dummy.y + dLunge * dSin + dSway * dCos;

        const worldFistX = dummyCenterX + (strikeX * dCos - strikeY * dSin);
        const worldFistY = dummyCenterY + (strikeX * dSin + strikeY * dCos);

        // Retrieve player visual transforms for exact hurtbox center
        const { visualAngle: pVisualAngle, lungeOffset: pLunge, swayLateralOffset: pSway } = getFighterVisualTransform(player, state.gameTime);
        const playerCenterX = player.x + pLunge * Math.cos(pVisualAngle) - pSway * Math.sin(pVisualAngle);
        const playerCenterY = player.y + pLunge * Math.sin(pVisualAngle) + pSway * Math.cos(pVisualAngle);

        // Check distance to player center from strike tip
        const hdx = playerCenterX - worldFistX;
        const hdy = playerCenterY - worldFistY;
        const hdist = Math.sqrt(hdx * hdx + hdy * hdy);

        let strikePos: { x: number; y: number } | undefined = undefined;
        let hasOverlap = hdist <= player.radius + hitRadius + hitBuffer;

        if (dummy.styleId === 'boxing_shell' && fist.isHeavy) {
          // Shoulder Roll Push: Point-blank clinch contact ~10px beyond radii
          const centerDist = Math.hypot(playerCenterX - dummyCenterX, playerCenterY - dummyCenterY);
          hasOverlap = (centerDist <= dummy.radius + player.radius + 10) && fist.punchProgress >= 0.20 && fist.punchProgress <= 0.80;
          if (hasOverlap) {
            strikePos = {
              x: dummyCenterX + (playerCenterX - dummyCenterX) * 0.5,
              y: dummyCenterY + (playerCenterY - dummyCenterY) * 0.5
            };
          }
        } else if (dummy.styleId === 'basic' && !fist.isHeavy) {
          const stage = fist.comboStage ?? (dummy.comboStage === 0 ? 3 : dummy.comboStage - 1);
          if (stage === 0 && fist.punchProgress < 0.25) {
            hasOverlap = false;
          } else if (stage === 2) {
            // S3 is a pure feint (0 DMG)
            hasOverlap = false;
            // Check Parry Baiting if player is within CLOSE melee threat range (+40) and blocking / parrying
            const distToPlayer = Math.hypot(player.x - dummy.x, player.y - dummy.y);
            if (distToPlayer <= dummy.radius + player.radius + 40 && (player.isBlocking || (player.blockTimer || 0) > 0)) {
              if (!dummy.flowS3ParryBaited) {
                dummy.flowS3ParryBaited = true;
                spawnFloatingText(dummy.x, dummy.y - 30, 'FEINT BAITED! S4 PRIMED', '#ef4444');
                soundManager.playParry();
              }
            }
          }
        }

        if (hasOverlap && !strikePos) {
          strikePos = { x: worldFistX, y: worldFistY };
        }

        // Street Boxing Hit-Confirm Guarantee: Landing 1st jab makes follow-ups guaranteed hits on hit-stunned opponent
        if (!hasOverlap && dummy.styleId === 'street_boxing' && fist.isHeavy && dummy.streetBoxingUnbreakable) {
          const distToPlayer = Math.hypot(player.x - dummy.x, player.y - dummy.y);
          if (distToPlayer <= dummy.radius + player.radius + 80 && fist.punchProgress >= 0.20) {
            hasOverlap = true;
            strikePos = { x: playerCenterX, y: playerCenterY };
          }
        }

        // Multi-point hand / arm / leg segment sampling along full extension reach vector
        if (!hasOverlap && !(dummy.styleId === 'boxing_shell' && fist.isHeavy) && !(dummy.styleId === 'basic' && !fist.isHeavy && stage === 2)) {
          for (let s = 0; s < sampleFractions.length; s++) {
            const frac = sampleFractions[s];
            const segX = strikeX * frac;
            const segY = strikeY * frac;
            const worldSegX = dummyCenterX + (segX * dCos - segY * dSin);
            const worldSegY = dummyCenterY + (segX * dSin + segY * dCos);
            const sdx = playerCenterX - worldSegX;
            const sdy = playerCenterY - worldSegY;
            const sdist = Math.sqrt(sdx * sdx + sdy * sdy);
            if (sdist <= player.radius + hitRadius + hitBuffer) {
              hasOverlap = true;
              strikePos = { x: worldSegX, y: worldSegY };
              break;
            }
          }
          if (!hasOverlap) {
            hasOverlap = checkLineSegmentToCircle(
              dummyCenterX, dummyCenterY,
              worldFistX, worldFistY,
              playerCenterX, playerCenterY,
              player.radius + hitRadius + hitBuffer
            );
            if (hasOverlap && !strikePos) {
              strikePos = { x: worldFistX, y: worldFistY };
            }
          }
        }

        // Continuous angular sweep sub-step sampling for Capoeira M2 spinning kick
        if (!hasOverlap && dummy.styleId === 'capoeira' && fist.isHeavy) {
          const dMods = getHeightModifiers(dummy.baseHeight);
          const dSpeed = 0.075 * dMods.speedFactor;
          const prevP = Math.max(0, fist.punchProgress - dSpeed);
          const currP = fist.punchProgress;
          const sweepRadius = dummy.radius * 1.90;
          const subCount = 6;
          for (let k = 0; k <= subCount; k++) {
            const subP = prevP + (currP - prevP) * (k / subCount);
            const subHelico = subP * Math.PI * 2.0;
            const subRelX = Math.cos(subHelico) * sweepRadius;
            const subRelY = Math.sin(subHelico) * sweepRadius;
            const subFractions = [0.40, 0.60, 0.80, 1.0, 1.10];
            for (let sf = 0; sf < subFractions.length; sf++) {
              const frac = subFractions[sf];
              const segX = subRelX * frac;
              const segY = subRelY * frac;
              const worldSegX = dummyCenterX + (segX * dCos - segY * dSin);
              const worldSegY = dummyCenterY + (segX * dSin + segY * dCos);
              const sdx = playerCenterX - worldSegX;
              const sdy = playerCenterY - worldSegY;
              if (Math.hypot(sdx, sdy) <= player.radius + hitRadius + hitBuffer) {
                hasOverlap = true;
                strikePos = { x: worldSegX, y: worldSegY };
                break;
              }
            }
            if (hasOverlap) break;
          }
        }

        if (hasOverlap) {
          fist.hasHit = true;
          applyFighterHit(dummy, player, fist.isHeavy, fist.comboStage ?? dummy.comboStage, strikePos);
        }
      }
    });
  };

  // -----------------------------------------------------
  // CANVAS RENDERING LOGIC (60 FPS)
  // -----------------------------------------------------
  const renderGame = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const state = stateRef.current;
    const player = state.player;
    const dummy = state.dummy;
    const baseDpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const dpr = baseDpr * (settings.renderResolutionScale || 1.0);

    // Clear physical backing store completely
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save 1: DPR scale layer for 100% full-screen coordinate space
    ctx.save();
    ctx.scale(dpr, dpr);

    // Save 2: Camera world space transform layer
    ctx.save();

    // Screenshake translate transformation offset
    const isPlayerVisionShaky = Boolean((state.shakyVisionTimer && state.shakyVisionTimer > 0) || (player && (player.aikiShakyVisionTimer || 0) > 0));
    if (state.shakeAmount > 0 || isPlayerVisionShaky) {
      const shakeMag = Math.max(state.shakeAmount, isPlayerVisionShaky ? (8.0 * settings.screenShake) : 0);
      const sx = (Math.random() * 2 - 1) * shakeMag;
      const sy = (Math.random() * 2 - 1) * shakeMag;
      ctx.translate(sx, sy);
    }

    // Camera positioning with dynamic cinematic support
    let zoomToUse = state.cameraZoom;
    if (state.cinematicZoomActive) {
      const targetX = state.cinematicTargetX ?? (player?.x || 500);
      const targetY = state.cinematicTargetY ?? (player?.y || 500);
      state.cameraX += (targetX - state.cameraX) * 0.15;
      state.cameraY += (targetY - state.cameraY) * 0.15;
      
      // Interpolate zoom smoothly to 3.5x
      state.cinematicCurrentZoom = state.cinematicCurrentZoom || state.cameraZoom;
      state.cinematicCurrentZoom += (3.5 - state.cinematicCurrentZoom) * 0.12;
      zoomToUse = state.cinematicCurrentZoom;
    } else {
      if (player && dummy) {
        const targetX = (player.x + dummy.x) / 2;
        const targetY = (player.y + dummy.y) / 2;
        const dx = targetX - state.cameraX;
        const dy = targetY - state.cameraY;
        state.cameraX += Math.abs(dx) < 0.02 ? dx : dx * 0.10;
        state.cameraY += Math.abs(dy) < 0.02 ? dy : dy * 0.10;
      } else if (player) {
        const dx = player.x - state.cameraX;
        const dy = player.y - state.cameraY;
        state.cameraX += Math.abs(dx) < 0.02 ? dx : dx * 0.10;
        state.cameraY += Math.abs(dy) < 0.02 ? dy : dy * 0.10;
      }
      state.cinematicCurrentZoom = state.cameraZoom;
      zoomToUse = state.cameraZoom;
    }

    const cx = state.width / 2 - state.cameraX * zoomToUse;
    const cy = state.height / 2 - state.cameraY * zoomToUse;

    ctx.translate(cx, cy);
    ctx.scale(zoomToUse, zoomToUse);

    // A. Draw octagonal grid mat arena
    drawArenaFloor(ctx, state.arenaSize);

    // Slugger M2 Impact Frame pure-white background & black shockwaves
    renderImpactFrameBackground(ctx, state.arenaSize);

    // Helper to render fighter with targeting indicators
    const renderFighterItem = (f: Fighter, isDummy: boolean) => {
      drawFighter(ctx, f);
      if (settings.cameraMode === 'lockon_swipe' && !f.isDead) {
        ctx.save();
        if (isDummy) {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
          ctx.lineWidth = 2;
          const r = (f.radius || 26) + 10;
          const bLen = 8;
          ctx.beginPath();
          ctx.moveTo(f.x - r, f.y - r + bLen);
          ctx.lineTo(f.x - r, f.y - r);
          ctx.lineTo(f.x - r + bLen, f.y - r);
          ctx.moveTo(f.x + r - bLen, f.y - r);
          ctx.lineTo(f.x + r, f.y - r);
          ctx.lineTo(f.x + r, f.y - r + bLen);
          ctx.moveTo(f.x - r, f.y + r - bLen);
          ctx.lineTo(f.x - r, f.y + r);
          ctx.lineTo(f.x - r + bLen, f.y + r);
          ctx.moveTo(f.x + r - bLen, f.y + r);
          ctx.lineTo(f.x + r, f.y + r);
          ctx.lineTo(f.x + r, f.y + r - bLen);
          ctx.stroke();
        } else {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.lineWidth = 1.5;
          const pR = (f.radius || 26) + 6;
          const fX = f.x + Math.cos(f.facingAngle) * (pR + 12);
          const fY = f.y + Math.sin(f.facingAngle) * (pR + 12);
          const lX = f.x + Math.cos(f.facingAngle + 2.5) * pR;
          const lY = f.y + Math.sin(f.facingAngle + 2.5) * pR;
          const rX = f.x + Math.cos(f.facingAngle - 2.5) * pR;
          const rY = f.y + Math.sin(f.facingAngle - 2.5) * pR;
          ctx.beginPath();
          ctx.moveTo(lX, lY);
          ctx.lineTo(fX, fY);
          ctx.lineTo(rX, rY);
          ctx.stroke();
        }
        ctx.restore();
      }
    };

    // Dynamic Z-Index Elevation: Determine if victim should be rendered OVER attacker
    const isDummyOverPlayer = dummy && player && (
      dummy.aikiSlamVictimStage === 'airborne' ||
      (player.aikiSlamStage && player.aikiSlamFrame !== undefined && player.aikiSlamFrame >= 15 && player.aikiSlamFrame <= 18 && (player.aikiSlamTarget === dummy || !player.aikiSlamTarget))
    );

    const isPlayerOverDummy = player && dummy && (
      player.aikiSlamVictimStage === 'airborne' ||
      (dummy.aikiSlamStage && dummy.aikiSlamFrame !== undefined && dummy.aikiSlamFrame >= 15 && dummy.aikiSlamFrame <= 18 && (dummy.aikiSlamTarget === player || !dummy.aikiSlamTarget))
    );

    if (isDummyOverPlayer && player && dummy) {
      // 1. Draw Player underneath
      renderFighterItem(player, false);

      // 2. Draw vertical projection Drop Shadow onto Player below
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 12;
      const shadowScale = (dummy.aikiOverheadScale || 1.35) * 0.95;
      ctx.beginPath();
      ctx.ellipse(0, 0, dummy.radius * shadowScale, dummy.radius * shadowScale * 0.85, player.facingAngle, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 3. Draw Dummy OVER Player
      renderFighterItem(dummy, true);
    } else if (isPlayerOverDummy && dummy && player) {
      // 1. Draw Dummy underneath
      renderFighterItem(dummy, true);

      // 2. Draw vertical projection Drop Shadow onto Dummy below
      ctx.save();
      ctx.translate(dummy.x, dummy.y);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 12;
      const shadowScale = (player.aikiOverheadScale || 1.35) * 0.95;
      ctx.beginPath();
      ctx.ellipse(0, 0, player.radius * shadowScale, player.radius * shadowScale * 0.85, dummy.facingAngle, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 3. Draw Player OVER Dummy
      renderFighterItem(player, false);
    } else {
      // Standard render order: Dummy first, Player second
      if (dummy) renderFighterItem(dummy, true);
      if (player) renderFighterItem(player, false);
    }

    // Aikido Over-Head Grapple Slam: Visual overlays (Wrist Clamp Brackets & Tension Gripping Line)
    const activeAttacker = (player && player.aikiSlamStage) ? player : ((dummy && dummy.aikiSlamStage) ? dummy : null);
    if (activeAttacker && activeAttacker.aikiSlamStage) {
      const activeVictim = activeAttacker === player ? (player.aikiSlamTarget || dummy) : (dummy.aikiSlamTarget || player);
      const progress = Math.min(1.0, Math.max(0, (90 - (activeAttacker.aikiSlamTimer || 0)) / 90));
      if (activeVictim && !activeVictim.isDead) {
        const uAngle = activeAttacker.facingAngle;
        const uCos = Math.cos(uAngle);
        const uSin = Math.sin(uAngle);
        const uRad = activeAttacker.radius;
        const tAngle = activeVictim.facingAngle;
        const tCos = Math.cos(tAngle);
        const tSin = Math.sin(tAngle);
        const tRad = activeVictim.radius;

        // Attacker's gripping right hand in world coordinates
        let uHandX = activeAttacker.x + uCos * (uRad * 1.85) - uSin * (uRad * 0.10);
        let uHandY = activeAttacker.y + uSin * (uRad * 1.85) + uCos * (uRad * 0.10);
        if (progress >= 0.25 && progress <= 0.70) {
          const t = (progress - 0.25) / 0.45;
          const forwardOff = (uRad * 1.85) * (1 - t * 0.85);
          const latOff = (uRad * 0.10) + (uRad * 0.35) * t;
          uHandX = activeAttacker.x + uCos * forwardOff - uSin * latOff;
          uHandY = activeAttacker.y + uSin * forwardOff + uCos * latOff;
        } else if (progress > 0.70) {
          const t = (progress - 0.70) / 0.30;
          const rearDist = -uRad * (0.2 + 0.9 * t);
          uHandX = activeAttacker.x + uCos * rearDist - uSin * (uRad * 0.20);
          uHandY = activeAttacker.y + uSin * rearDist + uCos * (uRad * 0.20);
        }

        // Victim's gripped forward hand in world coordinates
        const tHandX = activeVictim.x + tCos * (tRad * 1.65) - tSin * (-tRad * 0.10);
        const tHandY = activeVictim.y + tSin * (tRad * 1.65) + tCos * (-tRad * 0.10);

        if (progress < 0.25) {
          // Phase 1: The Wrist Clamp & Aiki Lock Brackets (#00E5FF)
          const clampProgress = Math.min(1.0, progress / 0.10);
          const bracketDist = 16 - 8 * clampProgress;
          const cxGrip = (uHandX + tHandX) * 0.5;
          const cyGrip = (uHandY + tHandY) * 0.5;
          const clampAngle = Math.atan2(tHandY - uHandY, tHandX - uHandX);

          ctx.save();
          ctx.translate(cxGrip, cyGrip);
          ctx.rotate(clampAngle);
          ctx.strokeStyle = '#00E5FF';
          ctx.shadowColor = '#00E5FF';
          ctx.shadowBlur = 10;
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'square';

          // Left bracket
          ctx.beginPath();
          ctx.moveTo(-bracketDist + 5, -8);
          ctx.lineTo(-bracketDist, -8);
          ctx.lineTo(-bracketDist, 8);
          ctx.lineTo(-bracketDist + 5, 8);
          ctx.stroke();

          // Right bracket
          ctx.beginPath();
          ctx.moveTo(bracketDist - 5, -8);
          ctx.lineTo(bracketDist, -8);
          ctx.lineTo(bracketDist, 8);
          ctx.lineTo(bracketDist - 5, 8);
          ctx.stroke();

          // White inner accents
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(-bracketDist + 3, -6);
          ctx.lineTo(-bracketDist + 1, -6);
          ctx.lineTo(-bracketDist + 1, 6);
          ctx.lineTo(-bracketDist + 3, 6);
          ctx.moveTo(bracketDist - 3, -6);
          ctx.lineTo(bracketDist - 1, -6);
          ctx.lineTo(bracketDist - 1, 6);
          ctx.lineTo(bracketDist - 3, 6);
          ctx.stroke();

          ctx.restore();
        } else if (progress < 0.85) {
          // Phase 2 & 3: Single-Hand Gripping Line (Glowing kinetic tension line)
          ctx.save();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 3.0;
          ctx.shadowColor = '#00E5FF';
          ctx.shadowBlur = 12;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(uHandX, uHandY);
          ctx.lineTo(tHandX, tHandY);
          ctx.stroke();

          // Cyan core glow accent
          ctx.strokeStyle = '#00E5FF';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(uHandX, uHandY);
          ctx.lineTo(tHandX, tHandY);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // Hitbox & Wireframe Collision Overlay for Sparring Lab
    if (showHitboxes && !matchData?.isCompetitive && !matchData?.isAiMatch && !matchData?.isAiVsAiSpectator) {
      drawHitboxOverlay(ctx, player, dummy, state.gameTime);
    }

    // Gamemode: Draw Hot Potato floating above holder
    if (matchData?.gamemode === 'hot_potato' && state.rankedState === 'fighting') {
      const holder = state.potatoHolder === 'player' ? player : dummy;
      if (holder && !holder.isDead) {
        const fuseSec = Math.max(0, Math.ceil((state.potatoFuseTimer !== undefined ? state.potatoFuseTimer : 1200) / 60));
        const isCritical = fuseSec <= 5;
        const pulse = Math.sin(state.gameTime * 0.2) * 3;
        const floatY = holder.y - holder.radius - 24 + pulse;

        ctx.save();
        // Fiery background aura glow
        ctx.beginPath();
        ctx.arc(holder.x, floatY + 2, isCritical ? 18 + pulse : 13, 0, Math.PI * 2);
        ctx.fillStyle = isCritical ? 'rgba(239, 68, 68, 0.45)' : 'rgba(245, 158, 11, 0.35)';
        ctx.fill();

        // Potato Emoji
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🥔', holder.x, floatY);

        // Fuse Timer Tag
        ctx.font = '900 10px monospace';
        ctx.fillStyle = isCritical ? '#ef4444' : '#fbbf24';
        ctx.fillText(`${fuseSec}s`, holder.x, floatY - 14);
        ctx.restore();
      }
    }

    // D. Draw Particles and floating text indicators
    renderParticlesAndTexts(ctx);

    // Slugger M2 Impact Frame slow-motion particles exiting behind enemy
    renderImpactFrameForeground(ctx);

    // Restore 2: Exit world space, returning to DPR scaled screen space
    ctx.restore();

    // Screen-space overlays (vignettes & finishing blow text) covering 100% of logical screen
    if (state.cinematicZoomActive) {
      const maxDim = Math.max(state.width, state.height);
      const grad = ctx.createRadialGradient(
        state.width / 2, state.height / 2, maxDim * 0.1,
        state.width / 2, state.height / 2, maxDim * 0.75
      );
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.5, 'rgba(153, 27, 27, 0.25)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.88)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, state.width, state.height);

      ctx.save();
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 italic 36px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FINISHING BLOW!', state.width / 2, state.height / 2 - 120);
      ctx.restore();
    } else if (state.matchEnded || (player && player.isDead) || (dummy && dummy.isDead)) {
      // Vignette overlay for post-match victory / defeat state in both portrait and landscape
      const maxDim = Math.max(state.width, state.height);
      const grad = ctx.createRadialGradient(
        state.width / 2, state.height / 2, maxDim * 0.15,
        state.width / 2, state.height / 2, maxDim * 0.8
      );
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.05)');
      grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.45)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, state.width, state.height);
    }

    // Dynamic HP-Linked Block Vignette Canvas Overlay
    if (state.blockVignetteTimer && state.blockVignetteTimer > 0) {
      state.blockVignetteTimer--;
      const maxFrames = state.blockVignetteMaxFrames || 4;
      const fadeFrames = maxFrames === 6 ? 3 : 2;
      let alpha = 1.0;
      if (state.blockVignetteTimer < fadeFrames) {
        alpha = state.blockVignetteTimer / fadeFrames;
      }
      
      const baseAlpha = state.blockVignetteType === 'red' ? 0.65 : 0.40;
      const currentAlpha = baseAlpha * alpha;
      const rgbStr = state.blockVignetteType === 'red' ? '220, 0, 0' : '255, 120, 0';

      const maxDim = Math.max(state.width, state.height);
      const grad = ctx.createRadialGradient(
        state.width / 2, state.height / 2, maxDim * 0.35,
        state.width / 2, state.height / 2, maxDim * 0.75
      );
      grad.addColorStop(0, `rgba(${rgbStr}, 0)`);
      grad.addColorStop(0.5, `rgba(${rgbStr}, ${currentAlpha * 0.4})`);
      grad.addColorStop(1, `rgba(${rgbStr}, ${currentAlpha})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, state.width, state.height);
    }

    // CQC Tactical Shadow Aura Vignette during M2 initiation and assault
    const isCqcM2Active = (player && player.styleId === 'cqc' && ((player.heavyWindup || 0) > 0 || player.cqcM2Stage)) ||
                          (dummy && dummy.styleId === 'cqc' && ((dummy.heavyWindup || 0) > 0 || dummy.cqcM2Stage));
    if (isCqcM2Active) {
      const maxDim = Math.max(state.width, state.height);
      const grad = ctx.createRadialGradient(
        state.width / 2, state.height / 2, maxDim * 0.25,
        state.width / 2, state.height / 2, maxDim * 0.8
      );
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.5, 'rgba(15, 23, 42, 0.35)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.75)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, state.width, state.height);
    }

    // E. Draw Custom Cursor
    if (state.mouseX > -100 && state.mouseY > -100) {
      let canAttack = true;
      if (player && !player.isDead) {
        const isHeavyPunching = player.fists.some(f => f.isPunching && f.isHeavy);
        const isHeavyExecuting = (player.heavyWindup || 0) > 0 || isHeavyPunching || (player.ashiharaM2Stage && player.ashiharaM2Stage > 0) || (player.cqcM2Stage && player.cqcM2Stage !== null) || !!player.keysiClinchStage;
        const isLightExecuting = player.fists.some(f => f.isPunching && !f.isHeavy);
        
        const cannotLight = player.stunTime > 0 || (player.armorBreakTime || 0) > 0 || (player.postBlockAttackLockout || 0) > 0 || player.capoeiraExhausted || isHeavyExecuting || (player.strikeCooldown || 0) > 0 || (player.lightCooldown || 0) > 0 || player.isBlocking;
        
        // M2 ignores retraction and activates immediately on Frame 1
        const cannotHeavy = player.stunTime > 0 || (player.armorBreakTime || 0) > 0 || ((player.postBlockAttackLockout || 0) > 0 && player.styleId !== 'boxing_shell') || (player.postS4HeavyLockout || 0) > 0 || player.capoeiraExhausted || (player.strikeCooldown || 0) > 0 || (player.heavyCooldown || 0) > 0 || (player.isBlocking && player.styleId !== 'boxing_shell');
        
        if (cannotLight && cannotHeavy) {
            canAttack = false;
        }
      }

      const cursorType = settings.cursorType || 'crosshair';
      const cursorColorName = settings.cursorColor || 'red';
      const cx = state.mouseX;
      const cy = state.mouseY;

      const colorMap: Record<string, string> = {
        white: '#ffffff',
        red: '#ef4444',
        cyan: '#06b6d4',
        amber: '#f59e0b',
        emerald: '#10b981',
        purple: '#a855f7',
      };
      const activeColor = canAttack ? (colorMap[cursorColorName] || '#ffffff') : '#ef4444';

      ctx.strokeStyle = activeColor;
      ctx.fillStyle = activeColor;
      ctx.lineWidth = 1.75;

      if (cursorType === 'crosshair') {
        ctx.beginPath();
        ctx.moveTo(cx - 9, cy);
        ctx.lineTo(cx - 3, cy);
        ctx.moveTo(cx + 3, cy);
        ctx.lineTo(cx + 9, cy);
        ctx.moveTo(cx, cy - 9);
        ctx.lineTo(cx, cy - 3);
        ctx.moveTo(cx, cy + 3);
        ctx.lineTo(cx, cy + 9);
        ctx.stroke();
      } else if (cursorType === 'circle') {
        ctx.beginPath();
        ctx.arc(cx, cy, 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (cursorType === 'dot') {
        ctx.beginPath();
        ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (cursorType === 'diamond') {
        ctx.beginPath();
        ctx.moveTo(cx, cy - 7);
        ctx.lineTo(cx + 7, cy);
        ctx.lineTo(cx, cy + 7);
        ctx.lineTo(cx - 7, cy);
        ctx.closePath();
        ctx.stroke();
      } else if (cursorType === 'minimal') {
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Restore 1: Exit DPR scale layer
    ctx.restore();
  };

  const drawArenaFloor = (ctx: CanvasRenderingContext2D, size: number) => {
    drawArenaFloorModule(ctx, size, settings);
  };

  const drawFighter = (ctx: CanvasRenderingContext2D, fighter: Fighter) => {
    drawFighterModule(ctx, fighter as any, stateRef.current.gameTime, settings);
  };

  const renderParticlesAndTexts = (ctx: CanvasRenderingContext2D) => {
    renderParticlesAndTextsModule(ctx, stateRef.current.particles, settings);
  };



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

    // 4. Return to appropriate menu
    const targetDest = destination || (isTournament ? 'tournament' : 'MENU');
    onBackToMenu(targetDest);
  };

  const getStyleInitials = (styleId: string) => {
    switch (styleId) {
      case 'street_boxing': return 'SB';
      case 'shotokan': return 'SK';
      case 'slugger': return 'SL';
      case 'muay_thai': return 'MT';
      case 'ashihara': return 'AK';
      case 'capoeira': return 'CP';
      case 'kickboxing': return 'KB';
      case 'street_taekwondo': return 'TK';
      case 'kyokushin': return 'KK';
      default: return 'BS';
    }
  };

  const getStyleRarityColor = (_rarity?: string) => {
    return 'text-amber-400 border-amber-500/40 bg-amber-950/40';
  };

  const getHeavySkillName = (styleId: string) => {
    switch (styleId) {
      case 'basic': return 'Shadow Step Strike';
      case 'street_boxing': return 'Pocket Flurry';
      case 'shotokan': return 'Back Kick';
      case 'slugger': return 'Charged Heavy Hook';
      case 'muay_thai': return 'Clinch Knee Strike';
      case 'ashihara': return 'Sabaki Tsukami Counter';
      case 'capoeira': return 'Meia Lua de Compasso';
      case 'kickboxing': return 'Dazing Hook to Teep';
      case 'street_taekwondo': return 'Undergoing Rework';
      case 'kyokushin': return 'Gedan Mawashi Geri';
      case 'keysi': return 'Pensador Drive';
      case 'cqc': return 'Tactical CQC Assault';
      case 'boxing_shell': return 'Shoulder Roll';
      case 'aikido': return 'Aiki Redirection Stance';
      default: return 'Heavy Right Hook';
    }
  };

  const getMaxHeavyCooldown = (styleId: string) => {
    switch (styleId) {
      case 'slugger': return 720;
      case 'basic': return 840;
      case 'kickboxing': return 660;
      case 'street_boxing': return 780;
      case 'keysi': return 720;
      case 'muay_thai': return 420;
      case 'ashihara': return 480;
      case 'shotokan': return 720;
      case 'kyokushin': return 600;
      case 'capoeira': return 480;
      case 'street_taekwondo': return 312;
      case 'cqc': return 900;
      case 'boxing_shell': return 600;
      case 'aikido': return 780;
      default: return 480;
    }
  };

  const getHeavySkillIcon = (styleId: string) => {
    switch (styleId) {
      case 'street_boxing': return '⚡';
      case 'shotokan': return '💫';
      case 'slugger': return '💥';
      case 'muay_thai': return '🦵';
      case 'ashihara': return '🛡️';
      case 'capoeira': return '🔄';
      case 'kickboxing': return '🥊';
      case 'street_taekwondo': return '⚠️';
      case 'kyokushin': return '🥋';
      case 'keysi': return '🛡️';
      case 'cqc': return '♟️';
      case 'boxing_shell': return '🔄';
      case 'aikido': return '🛡️';
      default: return '🥊';
    }
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

      {/* MOBILE TOUCH VIRTUAL CONTROLS OVERLAY (Only rendered in Virtual Controls mode) */}
      {isPlaying && !isDead && rankedState !== 'match_over' && !showModeSelector && !matchData?.isAiVsAiSpectator && !matchData?.isSpectator && ((settings.touchControlMode ?? 'virtual') === 'virtual') && (settings.showVirtualControls === 'always' || (settings.showVirtualControls === 'auto' && isTouchDevice)) && !isLiveHudEditing && (
        <MobileControls
          settings={settings}
          stateRef={stateRef}
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
      )}

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

      {/* PORTAL MODE SELECTOR OVERLAY */}
      <ModeSelectorOverlay
        show={showModeSelector}
        version={version}
        practiceModalTab={practiceModalTab}
        setPracticeModalTab={setPracticeModalTab}
        dummyStyleId={dummyStyleId}
        setDummyStyleId={setDummyStyleId}
        practicePlayerStyleId={practicePlayerStyleId}
        onPracticePlayerStyleChange={handlePracticePlayerStyleChange}
        dummyBehavior={dummyBehavior}
        setDummyBehavior={setDummyBehavior}
        godMode={godMode}
        setGodMode={setGodMode}
        infiniteStamina={infiniteStamina}
        setInfiniteStamina={setInfiniteStamina}
        infiniteAIStamina={infiniteAIStamina}
        setInfiniteAIStamina={setInfiniteAIStamina}
        oneHitKODummy={oneHitKODummy}
        setOneHitKODummy={setOneHitKODummy}
        onExitArena={handleExitArena}
        onInitiateCombat={() => {
          setShowModeSelector(false);
          setIsPlaying(true);
          initGame();
        }}
        isNavHidden={isNavHidden}
      />

      {/* COMBAT HUD OVERLAY PANEL */}
      {isPlaying && !isDead && rankedState !== 'match_over' && !showModeSelector && (
        <div className="absolute inset-0 pointer-events-none z-10 p-1 sm:p-2 flex flex-col justify-between overflow-hidden">
          
          {/* SPECTATOR MODE WATCH-ONLY TOP HUD */}
          {(matchData?.isAiVsAiSpectator || matchData?.isSpectator) && (
            <>
              {/* TOP CENTER SPECTATOR BANNER */}
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
            </>
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
          {isTouchDevice && !document.fullscreenElement && rankedState === 'fighting' && (
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


          
          {/* RANKED & AI COUNTDOWN & OVERLAYS */}
          {(matchData?.isCompetitive || matchData?.isAiMatch) && rankedState === 'countdown' && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center pointer-events-auto overflow-hidden select-none">
              {/* Radial background pulse */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.15)_0%,transparent_70%)] animate-pulse" />
              
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="text-center space-y-4 p-8 max-w-sm w-full bg-zinc-950/95 border-2 border-red-500 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.3)] relative"
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-red-600 text-[10px] font-mono font-black text-white rounded-full tracking-widest uppercase shadow-md">
                  {matchData?.isCompetitive ? 'RANKED DUEL' : 'AI STANDOFF'}
                </div>
                
                <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest block font-bold mt-2">
                  ROUND {roundNumber}
                </span>

                <div className="h-32 flex items-center justify-center relative overflow-visible">
                  <AnimatePresence mode="popLayout">
                    <motion.h2
                      key={rankedCountdown}
                      initial={{ scale: 0.2, rotate: -15, opacity: 0 }}
                      animate={{ scale: [1.3, 1.0], rotate: 0, opacity: 1 }}
                      exit={{ scale: 2.0, rotate: 15, opacity: 0 }}
                      transition={{ type: "spring", damping: 11, stiffness: 180 }}
                      className={`text-8xl font-display font-black italic tracking-wider drop-shadow-[0_0_20px_rgba(239,68,68,0.5)] ${
                        rankedCountdown === 0 ? 'text-yellow-400' : 'text-white'
                      }`}
                    >
                      {rankedCountdown === 0 ? 'FIGHT!' : rankedCountdown}
                    </motion.h2>
                  </AnimatePresence>
                </div>

                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                  {rankedCountdown === 0 ? 'Clash of Styles has Initiated!' : 'Unleash your custom combat style'}
                </p>
              </motion.div>
            </div>
          )}

          {/* FIGHT! SHOUT BANNER (DISAPPEARS SLOWLY WHILE FIGHTING STARTS IMMEDIATELY) */}
          <AnimatePresence>
            {showFightBanner && (
              <motion.div
                key="fight-shout-banner"
                initial={{ opacity: 1, scale: 1.4, y: -10 }}
                animate={{ opacity: [1, 1, 0.7, 0], scale: [1.4, 1.05, 1.0, 0.95], y: 0 }}
                transition={{ duration: 1.8, times: [0, 0.35, 0.7, 1.0], ease: "easeOut" }}
                onAnimationComplete={() => setShowFightBanner(false)}
                className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none select-none overflow-hidden"
              >
                <div className="flex flex-col items-center justify-center p-6 bg-zinc-950/70 backdrop-blur-sm rounded-3xl border-2 border-amber-500/60 shadow-[0_0_80px_rgba(245,158,11,0.5)]">
                  <span className="text-[10px] sm:text-xs font-mono font-black text-amber-400 uppercase tracking-widest mb-1 px-3.5 py-1 bg-black/90 rounded-full border border-amber-500/50">
                    ROUND {roundNumber} • ENGAGE COMBAT
                  </span>
                  <motion.h1
                    initial={{ filter: "drop-shadow(0 0 35px rgba(245, 158, 11, 0.9))" }}
                    animate={{ filter: "drop-shadow(0 0 10px rgba(245, 158, 11, 0.2))" }}
                    transition={{ duration: 1.8 }}
                    className="text-7xl sm:text-9xl font-display font-black italic tracking-widest text-yellow-400 uppercase drop-shadow-[0_0_40px_rgba(245,158,11,0.9)]"
                  >
                    FIGHT!
                  </motion.h1>
                  <p className="text-[10px] sm:text-xs font-mono font-bold text-red-300 uppercase tracking-wider mt-1 bg-red-950/90 px-4 py-1 rounded-full border border-red-500/60 shadow-lg">
                    ⚡ CLASH OF STYLES HAS INITIATED!
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* TOP FIGHTERS HUD & CUSTOMIZABLE HUD ELEMENTS */}
          {(() => {
            const activeLayout = isPortrait 
              ? (settings.mobileControlsLayoutPortrait || DEFAULT_PORTRAIT_LAYOUT)
              : (settings.mobileControlsLayoutLandscape || settings.mobileControlsLayout || DEFAULT_LANDSCAPE_LAYOUT);

            const playerCardItem = activeLayout?.find(i => i.id === 'player_card');
            const opponentCardItem = activeLayout?.find(i => i.id === 'opponent_card');
            const legacyCardsItem = activeLayout?.find(i => i.id === 'char_cards');
            const m2Item = activeLayout?.find(i => i.id === 'm2_cooldown');
            const menuItem = activeLayout?.find(i => i.id === 'menu_settings');
            const statusBarItem = activeLayout?.find(i => i.id === 'status_bar');

            const baseHudScale = settings.hudScale !== undefined ? settings.hudScale : 0.85;
            const uiScaleMultiplier = baseHudScale / 0.85;
            const portraitWidthScale = isPortrait && typeof window !== 'undefined' ? Math.min(1.0, Math.max(0.55, window.innerWidth / 500)) : 1.0;

            const pCardX = playerCardItem ? playerCardItem.x : (legacyCardsItem ? Math.max(12, legacyCardsItem.x - 28) : (isPortrait ? 25 : 22));
            const pCardY = playerCardItem ? playerCardItem.y : (legacyCardsItem ? legacyCardsItem.y : (isPortrait ? 7 : 6));
            const pCardItemScale = playerCardItem?.scale ?? legacyCardsItem?.scale ?? 0.85;
            const pCardScale = pCardItemScale * uiScaleMultiplier * portraitWidthScale;
            const pCardOpacity = playerCardItem?.opacity ?? legacyCardsItem?.opacity ?? (settings.hudOpacity ?? 0.85);

            const oppCardX = opponentCardItem ? opponentCardItem.x : (legacyCardsItem ? Math.min(88, legacyCardsItem.x + 28) : (isPortrait ? 75 : 78));
            const oppCardY = opponentCardItem ? opponentCardItem.y : (legacyCardsItem ? legacyCardsItem.y : (isPortrait ? 7 : 6));
            const oppCardItemScale = opponentCardItem?.scale ?? legacyCardsItem?.scale ?? 0.85;
            const oppCardScale = oppCardItemScale * uiScaleMultiplier * portraitWidthScale;
            const oppCardOpacity = opponentCardItem?.opacity ?? legacyCardsItem?.opacity ?? (settings.hudOpacity ?? 0.85);

            const statusX = statusBarItem ? statusBarItem.x : pCardX;
            const statusY = statusBarItem ? statusBarItem.y : (isPortrait ? (pCardY + 9.5) : (pCardY + 10.5));
            const oppStatusY = statusBarItem ? statusBarItem.y : (isPortrait ? (oppCardY + 9.5) : (oppCardY + 10.5));
            const statusScale = (statusBarItem?.scale ?? pCardItemScale) * uiScaleMultiplier * 0.75;
            const oppStatusScale = (statusBarItem?.scale ?? oppCardItemScale) * uiScaleMultiplier * 0.75;
            const statusOpacity = statusBarItem?.opacity ?? (settings.hudOpacity ?? 0.95);

            const m2X = m2Item ? m2Item.x : 10;
            const m2Y = m2Item ? m2Item.y : 40;
            const m2Scale = m2Item?.scale ?? 1.0;
            const m2Opacity = m2Item?.opacity ?? 0.95;

            const menuX = menuItem ? menuItem.x : (isPortrait ? 90 : 94);
            const menuY = menuItem ? menuItem.y : 5;
            const menuScale = (menuItem?.scale ?? 1.0) * uiScaleMultiplier;
            const menuOpacity = menuItem?.opacity ?? 0.95;

            return (
              <>
                {/* LOCAL PLAYER CARD & DEDICATED STATUS BAR */}
                {!isLiveHudEditing && (
                  <div 
                    className="absolute z-20 pointer-events-none transition-all duration-75 flex flex-col items-start gap-1"
                    style={{
                      top: `${pCardY}%`,
                      left: `${pCardX}%`,
                      transform: `translate(-50%, 0) scale(${pCardScale})`,
                      transformOrigin: 'top center',
                      width: '270px',
                      maxWidth: '92vw',
                    }}
                  >
                  <div 
                    className="w-full bg-zinc-950/85 backdrop-blur-md border border-zinc-800/80 p-1.5 sm:p-2.5 pointer-events-auto flex gap-1.5 sm:gap-2.5 shadow-2xl relative rounded-xl transition-all"
                    style={{
                      opacity: pCardOpacity,
                    }}
                  >
                  {/* PORTRAIT */}
                  <div 
                    className="w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-zinc-900 border flex flex-col items-center justify-center relative shrink-0 overflow-hidden rounded-lg shadow-inner"
                    style={{ borderColor: activeStyle.secondaryColor || '#ef4444' }}
                  >
                    <span className="font-display font-black text-xs sm:text-base italic" style={{ color: activeStyle.color || '#ffffff' }}>
                      {getStyleInitials(activeStyle.id)}
                    </span>
                  </div>

                  {/* CARD DETAILS */}
                  <div className="flex-1 flex flex-col gap-0.5 sm:gap-1 min-w-0">
                    {/* Header info */}
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-white font-display font-black italic uppercase tracking-wide text-[9px] sm:text-xs flex items-center gap-1 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
                        <span className="truncate">
                          {matchData?.isAiVsAiSpectator ? (matchData.opponent?.name || matchData.bot1Name || 'BOT 1') : 'YOU'}
                        </span>
                      </span>
                      <span className="text-[6px] sm:text-[8px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 border shrink-0 text-zinc-300 border-zinc-700 bg-zinc-900/80 rounded">
                        {activeStyle.name}
                      </span>
                    </div>

                    {/* Main Health Bar */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[8px] sm:text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                        <span>HP</span>
                        <span className="text-red-400">{Math.floor(playerHP)}/{playerMaxHP}</span>
                      </div>
                      <div className="w-full bg-zinc-900 h-1.5 sm:h-2 border border-zinc-800 overflow-hidden rounded-full relative shadow-inner">
                        {settings.damageBarDegradingEnabled !== false && playerRedHP > playerHP + 0.05 && (
                          <div 
                            className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-red-950 via-rose-950 to-amber-700/90 border-r-2 border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9),0_0_12px_rgba(239,68,68,0.8)] z-0 transition-none overflow-hidden"
                            style={{ width: `${Math.max(0, Math.min(100, (playerRedHP / playerMaxHP) * 100))}%` }}
                          >
                            <div className="w-full h-full bg-[linear-gradient(90deg,transparent_0%,rgba(245,158,11,0.35)_100%)] animate-pulse" />
                          </div>
                        )}
                        <div 
                          className="relative z-10 bg-gradient-to-r from-red-600 to-rose-500 h-full transition-all duration-75 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                          style={{ width: `${Math.max(0, Math.min(100, (playerHP / playerMaxHP) * 100))}%` }}
                        />
                      </div>
                    </div>

                    {/* Guard or Dodge Indicator */}
                    {activeStyle.id === 'capoeira' ? (
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-[8px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <Shield className={`w-2.5 h-2.5 ${playerCapoeiraExhausted ? 'text-red-500 animate-pulse' : 'text-amber-500'}`} />
                            {playerCapoeiraExhausted ? 'EXHAUSTED' : 'ESQUIVA'}
                          </span>
                          <span className={playerCapoeiraExhausted ? 'text-red-500 font-bold' : 'text-amber-500 font-bold'}>
                            {playerCapoeiraStacks}/3
                          </span>
                        </div>
                        <div className="flex gap-1 h-1">
                          {[0, 1, 2].map((idx) => (
                            <div 
                              key={idx} 
                              className={`flex-1 h-full border transition-all duration-150 ${
                                playerCapoeiraExhausted 
                                  ? 'bg-red-950/60 border-red-800' 
                                  : idx < playerCapoeiraStacks 
                                    ? 'bg-amber-500 border-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.6)]' 
                                    : 'bg-zinc-900 border-zinc-800/50'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    ) : activeStyle.id === 'kyokushin' ? (
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-[8px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <Shield className="w-2.5 h-2.5 text-orange-500" />
                            CONDITIONING
                          </span>
                          <span className="text-orange-400 font-bold">
                            DIRECT HP
                          </span>
                        </div>
                        <div className="w-full bg-zinc-900 h-1 sm:h-1.5 border border-zinc-800 overflow-hidden rounded-full">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-600 to-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)] w-full"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-[8px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <Shield className={`w-2.5 h-2.5 ${playerArmorBreakTime > 0 ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`} />
                            {playerArmorBreakTime > 0 ? 'BROKEN' : 'GUARD'}
                          </span>
                          <span className={playerArmorBreakTime > 0 ? 'text-red-500 font-bold' : 'text-cyan-400 font-bold'}>
                            {playerArmorBreakTime > 0 ? '0 AP' : `${Math.round(playerArmor)} AP`}
                          </span>
                        </div>
                        <div className="w-full bg-zinc-900 h-1 sm:h-1.5 border border-zinc-800 overflow-hidden rounded-full">
                          <div 
                            className={`h-full transition-all duration-75 ${playerArmorBreakTime > 0 ? 'bg-red-600/20' : 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]'}`}
                            style={{ width: `${playerArmorBreakTime > 0 ? 0 : (playerArmor / 18) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Stamina Engine & Sprint Bar */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[8px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <Flame className={`w-2.5 h-2.5 ${playerIsSprinting ? 'text-amber-400 animate-pulse' : 'text-amber-500'}`} />
                          {playerIsSprinting ? 'SPRINTING' : 'STAMINA'}
                          {playerSprintStrikerBuffer > 0 && (
                            <span className="text-[7px] text-emerald-400 font-extrabold bg-emerald-950/80 px-1 border border-emerald-500/40 rounded animate-pulse">
                              STRIKER BUFF ({(playerSprintStrikerBuffer / 60).toFixed(1)}s)
                            </span>
                          )}
                        </span>
                        <span className="text-amber-400 font-bold">
                          {Math.round(playerStamina)}/100
                        </span>
                      </div>
                      <div className="w-full bg-zinc-900 h-1 sm:h-1.5 border border-zinc-800 overflow-hidden rounded-full">
                        <div 
                          className={`h-full transition-all duration-75 ${playerIsSprinting ? 'bg-gradient-to-r from-amber-500 to-yellow-300 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]'}`}
                          style={{ width: `${Math.max(0, Math.min(100, playerStamina))}%` }}
                        />
                      </div>
                    </div>

                    {/* Dash / Dodge Cooldown */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[8px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <Zap className={`w-2.5 h-2.5 ${playerDashCooldown > 0 ? 'text-zinc-600' : 'text-fuchsia-400'}`} />
                          Dodge (E)
                        </span>
                        <span className={playerDashCooldown > 0 ? 'text-zinc-400' : 'text-fuchsia-400 font-bold'}>
                          {playerDashCooldown > 0 ? `${(playerDashCooldown / 60).toFixed(1)}s` : 'READY'}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-900 h-1 border border-zinc-800 overflow-hidden rounded-full">
                        {(() => {
                          const maxDashCd = stateRef.current.player?.styleId === 'capoeira' ? 58 : 90;
                          return (
                            <div 
                              className={`h-full transition-all duration-75 ${playerDashCooldown > 0 ? 'bg-zinc-700' : 'bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.5)]'}`}
                              style={{ width: `${playerDashCooldown > 0 ? Math.max(0, ((maxDashCd - playerDashCooldown) / maxDashCd) * 100) : 100}%` }}
                            />
                          );
                        })()}
                      </div>
                    </div>

                    {/* Status effects decoupled to Dedicated Combat Status Bar beneath gauge cluster */}
                  </div>
                  </div>

                  {/* DEDICATED PLAYER STATUS BAR (Anchored cleanly beneath gauge cluster) */}
                  <div className="w-full flex justify-start pl-8 sm:pl-12 pointer-events-auto">
                    <StatusBar 
                      statuses={playerActiveStatuses}
                      align="left"
                      label={activeStyle?.name ? `${activeStyle.name.toUpperCase()}` : undefined}
                      fighterName={matchData?.isAiVsAiSpectator ? (matchData.opponent?.name || matchData.bot1Name || 'BOT 1') : 'YOU'}
                    />
                  </div>
                </div>
                )}

                {/* CENTER VS BADGE AND FOV / MENU CONTROLS */}
                <div 
                  className="absolute top-1.5 z-20 pointer-events-none flex flex-col items-center justify-center transition-all duration-150 gap-1"
                  style={{ 
                    left: '50%',
                    transform: `translate(-50%, 0) scale(${Math.min(pCardScale, oppCardScale)})`,
                    transformOrigin: 'top center',
                  }}
                >
                  {(matchData?.isCompetitive || matchData?.isAiMatch || matchData?.isRealMatch) && (
                    <div className="flex flex-col items-center gap-1">
                      <div className={`px-2.5 py-1 text-center rounded-xl pointer-events-auto flex items-center gap-2.5 font-mono text-[10px] sm:text-xs shadow-2xl transition-all duration-300 ${
                        rankedState === 'round_over'
                          ? 'bg-zinc-950 border-2 border-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.35)] scale-105'
                          : 'bg-zinc-950/90 border border-zinc-800'
                      }`}>
                        {/* Fighter 1 / Player Score Badge */}
                        <div className="flex items-center gap-1.5 text-blue-400">
                          <span className="font-bold text-[9px] sm:text-[10px] tracking-wider truncate max-w-[60px] sm:max-w-[80px]">
                            {matchData?.isAiVsAiSpectator ? (matchData.opponent?.name || matchData.bot1Name || 'BOT 1') : 'YOU'}
                          </span>
                          <motion.span 
                            key={`p-score-${playerScore}`}
                            initial={{ scale: 1.4, color: '#60a5fa' }}
                            animate={{ scale: 1, color: '#ffffff' }}
                            className="px-2 py-0.5 bg-blue-950 border border-blue-700 text-white rounded-md font-black text-xs sm:text-sm shadow-inner"
                          >
                            {playerScore}
                          </motion.span>
                        </div>

                        {/* Integrated Round & Timer / Break Countdown */}
                        <div className="flex flex-col items-center min-w-[65px] sm:min-w-[80px]">
                          <span className="text-[8px] sm:text-[9px] text-yellow-400 font-black uppercase tracking-widest">
                            {rankedState === 'round_over' ? 'NEXT ROUND' : `ROUND ${roundNumber}`}
                          </span>
                          <span className={`text-xs sm:text-sm font-black font-display tracking-wide ${
                            rankedState === 'round_over' ? 'text-yellow-400 font-mono text-sm sm:text-base animate-pulse' : 'text-red-400'
                          }`}>
                            {rankedState === 'round_over'
                              ? `${rankedCountdown}s`
                              : `${Math.floor(roundTimeLeft / 60)}:${String(roundTimeLeft % 60).padStart(2, '0')}`
                            }
                          </span>
                          <span className="text-[7px] text-zinc-500 font-mono font-bold tracking-tighter">
                            FIRST TO {matchData?.targetScore || (matchData?.isAiVsAiSpectator ? 2 : 3)}
                          </span>
                        </div>

                        {/* Fighter 2 / Opponent Score Badge */}
                        <div className="flex items-center gap-1.5 text-red-400">
                          <motion.span 
                            key={`opp-score-${opponentScore}`}
                            initial={{ scale: 1.4, color: '#f87171' }}
                            animate={{ scale: 1, color: '#ffffff' }}
                            className="px-2 py-0.5 bg-red-950 border border-red-700 text-white rounded-md font-black text-xs sm:text-sm shadow-inner"
                          >
                            {opponentScore}
                          </motion.span>
                          <span className="font-bold text-[9px] sm:text-[10px] tracking-wider truncate max-w-[60px] sm:max-w-[80px]">
                            {matchData?.isAiVsAiSpectator ? (matchData.spectatorFighter2?.name || matchData.bot2Name || 'BOT 2') : 'OPP'}
                          </span>
                        </div>
                      </div>

                      {/* Gamemode Live Trackers */}
                      {matchData?.gamemode === 'sustain_attack' && (
                        <div className="flex items-center gap-2 px-2 py-0.5 bg-zinc-950/90 border border-cyan-500/40 rounded-md font-mono text-[8px] sm:text-[9px] text-cyan-400 shadow-lg">
                          <span className="font-black text-cyan-300">SUSTAIN:</span>
                          <span className="text-blue-300 font-bold">YOU: {Math.round(sustainPlayerDamage)}</span>
                          <span className="text-zinc-600">|</span>
                          <span className="text-red-300 font-bold">OPP: {Math.round(sustainOpponentDamage)}</span>
                        </div>
                      )}

                      {matchData?.gamemode === 'hot_potato' && (
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 bg-zinc-950/90 border rounded-md font-mono text-[8px] sm:text-[9px] shadow-lg ${
                          potatoHolderState === 'player' ? 'border-red-500 text-red-400 animate-pulse' : 'border-amber-500 text-amber-400'
                        }`}>
                          <span>🥔</span>
                          <span className="font-black">HOLDER: {potatoHolderState === 'player' ? 'YOU (HIT ENEMY!)' : 'OPPONENT'}</span>
                          <span className="px-1 py-0.2 bg-black text-white rounded font-black text-[9px]">{potatoFuseLeft}s</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ENEMY SPARRING PARTNER CARD & DEDICATED STATUS BAR */}
                {!isLiveHudEditing && (
                <div 
                  className="absolute z-20 pointer-events-none transition-all duration-75 flex flex-col items-end gap-1"
                  style={{
                    top: `${oppCardY}%`,
                    left: `${oppCardX}%`,
                    transform: `translate(-50%, 0) scale(${oppCardScale})`,
                    transformOrigin: 'top center',
                    width: '270px',
                    maxWidth: '92vw',
                  }}
                >
                  <div 
                    className="w-full bg-zinc-950/85 backdrop-blur-md border border-zinc-800/80 p-1.5 sm:p-2.5 pointer-events-auto flex gap-1.5 sm:gap-2.5 shadow-2xl relative rounded-xl transition-all"
                    style={{
                      opacity: oppCardOpacity,
                    }}
                  >
                  {/* OPPONENT PORTRAIT */}
                  <div 
                    className="w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-zinc-900 border flex flex-col items-center justify-center relative shrink-0 overflow-hidden rounded-lg order-last shadow-inner"
                    style={{ borderColor: dummyStyle?.secondaryColor || '#ef4444' }}
                  >
                    <span className="font-display font-black text-xs sm:text-base italic" style={{ color: dummyStyle?.color || '#ffffff' }}>
                      {getStyleInitials(dummyStyle?.id || 'basic')}
                    </span>
                  </div>
                  {/* CARD DETAILS */}
                  <div className="flex-1 flex flex-col gap-0.5 sm:gap-1 min-w-0">
                    {/* Header info */}
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[6px] sm:text-[8px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 border shrink-0 text-zinc-300 border-zinc-700 bg-zinc-900/80 rounded">
                        {dummyStyle?.name || 'Flow Boxing'}
                      </span>
                      <span className="text-zinc-400 font-display font-black italic uppercase tracking-wide text-[9px] sm:text-xs flex items-center gap-1 truncate justify-end">
                        <span className="truncate">
                          {matchData?.isAiVsAiSpectator 
                            ? (matchData.spectatorFighter2?.name || matchData.bot2Name || 'BOT 2') 
                            : matchData && matchData.isCompetitive 
                              ? `@${matchData.opponent.name}` 
                              : dummyBehavior === 'test_ai' 
                                ? 'TEST AI (INFINITE HP)' 
                                : 'ENEMY'}
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-ping shrink-0" />
                      </span>
                    </div>

                    {/* Main Health Bar */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[8px] sm:text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                        <span className={dummyBehavior === 'test_ai' ? 'text-emerald-400 font-black' : 'text-red-400'}>
                          {dummyBehavior === 'test_ai' ? '∞ / ∞' : `${Math.floor(dummyHP)}/${dummyMaxHP}`}
                        </span>
                        <span>{dummyBehavior === 'test_ai' ? 'INFINITE HP' : 'HP'}</span>
                      </div>
                      <div className="w-full bg-zinc-900 h-1.5 sm:h-2 border border-zinc-800 overflow-hidden rounded-full relative shadow-inner">
                        {settings.damageBarDegradingEnabled !== false && dummyRedHP > dummyHP + 0.05 && dummyBehavior !== 'test_ai' && (
                          <div 
                            className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-red-950 via-rose-950 to-amber-700/90 border-r-2 border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9),0_0_12px_rgba(239,68,68,0.8)] z-0 transition-none overflow-hidden"
                            style={{ width: `${Math.max(0, Math.min(100, (dummyRedHP / dummyMaxHP) * 100))}%` }}
                          >
                            <div className="w-full h-full bg-[linear-gradient(90deg,transparent_0%,rgba(245,158,11,0.35)_100%)] animate-pulse" />
                          </div>
                        )}
                        <div 
                          className={`relative z-10 h-full transition-all duration-75 ${
                            dummyBehavior === 'test_ai'
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                              : 'bg-gradient-to-r from-red-600 to-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                          }`}
                          style={{ width: dummyBehavior === 'test_ai' ? '100%' : `${Math.max(0, Math.min(100, (dummyHP / dummyMaxHP) * 100))}%` }}
                        />
                      </div>
                    </div>

                    {/* Guard or Dodge Indicator */}
                    {dummyStyle?.id === 'capoeira' ? (
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-[8px] sm:text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                          <span className={dummyCapoeiraExhausted ? 'text-red-500 font-bold' : 'text-amber-500 font-bold'}>
                            {dummyCapoeiraStacks}/3
                          </span>
                          <span className="flex items-center gap-1 justify-end">
                            {dummyCapoeiraExhausted ? 'EXHAUSTED' : 'ESQUIVA'}
                            <Shield className={`w-2.5 h-2.5 ${dummyCapoeiraExhausted ? 'text-red-500 animate-pulse' : 'text-amber-500'}`} />
                          </span>
                        </div>
                        <div className="flex gap-1 h-1">
                          {[0, 1, 2].map((idx) => (
                            <div 
                              key={idx} 
                              className={`flex-1 h-full border transition-all duration-150 ${
                                dummyCapoeiraExhausted 
                                  ? 'bg-red-950/60 border-red-800' 
                                  : idx < dummyCapoeiraStacks 
                                    ? 'bg-amber-500 border-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.6)]' 
                                    : 'bg-zinc-900 border-zinc-800/50'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    ) : dummyStyle?.id === 'kyokushin' ? (
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-[8px] sm:text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                          <span className="text-orange-400 font-bold">
                            DIRECT HP
                          </span>
                          <span className="flex items-center gap-1 justify-end">
                            CONDITIONING
                            <Shield className="w-2.5 h-2.5 text-orange-500" />
                          </span>
                        </div>
                        <div className="w-full bg-zinc-900 h-1 sm:h-1.5 border border-zinc-800 overflow-hidden rounded-full">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-600 to-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)] w-full"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-[8px] sm:text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                          <span className={dummyArmorBreakTime > 0 ? 'text-red-500 font-bold' : 'text-yellow-500 font-bold'}>
                            {dummyArmorBreakTime > 0 ? '0 AP' : `${Math.round(dummyArmor)} AP`}
                          </span>
                          <span className="flex items-center gap-1 justify-end">
                            {dummyArmorBreakTime > 0 ? 'BROKEN' : 'GUARD'}
                            <Shield className={`w-2.5 h-2.5 ${dummyArmorBreakTime > 0 ? 'text-red-500 animate-pulse' : 'text-yellow-500'}`} />
                          </span>
                        </div>
                        <div className="w-full bg-zinc-900 h-1 sm:h-1.5 border border-zinc-800 overflow-hidden rounded-full">
                          <div 
                            className={`h-full transition-all duration-75 ${dummyArmorBreakTime > 0 ? 'bg-red-600/20' : 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]'}`}
                            style={{ width: `${dummyArmorBreakTime > 0 ? 0 : (dummyArmor / 18) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Enemy Stamina Bar */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[8px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                        <span className="text-amber-400 font-bold">
                          {Math.round(dummyStamina)}/100
                        </span>
                        <span className="flex items-center gap-1 justify-end">
                          {dummyIsSprinting ? 'SPRINTING' : 'STAMINA'}
                          <Flame className={`w-2.5 h-2.5 ${dummyIsSprinting ? 'text-amber-400 animate-pulse' : 'text-amber-500'}`} />
                        </span>
                      </div>
                      <div className="w-full bg-zinc-900 h-1 sm:h-1.5 border border-zinc-800 overflow-hidden rounded-full">
                        <div 
                          className={`h-full transition-all duration-75 ${dummyIsSprinting ? 'bg-gradient-to-r from-amber-500 to-yellow-300 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]'}`}
                          style={{ width: `${Math.max(0, Math.min(100, dummyStamina))}%` }}
                        />
                      </div>
                    </div>

                    {/* Dummy Status effects decoupled to Dedicated Combat Status Bar beneath gauge cluster */}
                  </div>
                </div>

                {/* DEDICATED OPPONENT STATUS BAR (Anchored cleanly beneath gauge cluster) */}
                <div className="w-full flex justify-end pr-8 sm:pr-12 pointer-events-auto">
                  <StatusBar 
                    statuses={dummyActiveStatuses}
                    align="right"
                    label={dummyStyle?.name ? `${dummyStyle.name.toUpperCase()}` : undefined}
                    fighterName={matchData?.isAiVsAiSpectator ? (matchData.spectatorFighter2?.name || matchData.bot2Name || 'BOT 2') : matchData?.isCompetitive ? `@${matchData.opponent.name}` : 'ENEMY'}
                  />
                </div>
              </div>
              )}

                {/* MIDDLE-LEFT SKILL BAR (Only shown when local player heavy skill on cooldown - repositionable via HUD Editor) */}
                <div 
                  className="absolute flex flex-col items-start gap-4 z-20 pointer-events-none transition-all duration-75"
                  style={{
                    left: `${m2X}%`,
                    top: `${m2Y}%`,
                    transform: `translate(-50%, -50%) scale(${m2Scale})`,
                    opacity: m2Opacity,
                  }}
                >
            <AnimatePresence>
              {playerHeavyCooldown > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: -50, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -50, scale: 0.9 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 120 }}
                  className="bg-zinc-950/95 border-2 border-red-500 p-3.5 flex items-center gap-3.5 shadow-[0_0_25px_rgba(239,68,68,0.35)] rounded-none pointer-events-auto"
                >
                  <div className="relative w-12 h-12 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden select-none">
                    <div 
                      className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-red-600/40 to-rose-500/10 origin-bottom transition-all duration-75"
                      style={{ height: `${(playerHeavyCooldown / getMaxHeavyCooldown(activeStyle.id)) * 100}%` }}
                    />
                    <span className="relative z-10 text-xl font-bold">
                      {getHeavySkillIcon(activeStyle.id)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest font-black leading-none">HEAVY (M2) CD</span>
                    <span className="text-xs font-display font-black text-white italic uppercase leading-none mt-1.5">
                      {getHeavySkillName(activeStyle.id)}
                    </span>
                    <span className="text-xs font-mono text-red-400 font-black mt-1">
                      {(playerHeavyCooldown / 60).toFixed(1)}s
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* IN-GAME MENU BUTTON (PUSHED TO TOP RIGHT) */}
          {!isLiveHudEditing && (
            <div 
              className="absolute z-30 pointer-events-auto transition-all duration-75"
              style={{
                top: `${menuY}%`,
                left: `${menuX}%`,
                transform: `translate(-50%, -50%) scale(${menuScale})`,
                opacity: menuOpacity,
              }}
            >
              <button
                onClick={() => {
                  setShowMobileMenu(true);
                  soundManager.playRollTick();
                }}
                className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-zinc-950/90 hover:bg-zinc-900 border border-zinc-800 hover:border-red-500 text-[9px] sm:text-[10px] font-mono text-zinc-300 hover:text-white uppercase tracking-wider font-bold shrink-0 flex items-center gap-1.5 active:scale-95 transition-all rounded-lg shadow-xl cursor-pointer backdrop-blur-md"
                title="Open In-Game Menu (Settings & HUD Editor)"
              >
                <Settings className="w-3.5 h-3.5 text-red-500" />
                <span>MENU</span>
              </button>
            </div>
          )}
        </>
      );
    })()}

          {/* DYNAMIC COMBAT ALERT STATS BAR (Shield alert on break / Stamina low warning) */}
          {playerArmorBreakTime > 0 ? (
            <div className="mt-4 bg-red-600/20 border border-red-500 px-6 py-2 rounded-none flex items-center gap-2 animate-bounce pointer-events-auto">
              <ShieldAlert className="w-4 h-4 text-red-500 animate-spin" />
              <span className="text-red-500 text-xs font-mono uppercase font-black tracking-widest">STAGGERED! GUARD SHIELD BROKEN</span>
            </div>
          ) : settings.staminaWarning && playerCapoeiraExhausted ? (
            <div className="mt-4 bg-amber-600/20 border border-amber-500 px-4 py-1.5 rounded-none flex items-center gap-2 animate-pulse pointer-events-auto">
              <Zap className="w-3.5 h-3.5 text-amber-500 animate-spin" />
              <span className="text-amber-500 text-xs font-mono uppercase font-black tracking-widest">ESQUIVA EXHAUSTION (LOW STAMINA)</span>
            </div>
          ) : null}

          {/* SHOW FPS OVERLAY (If enabled in settings) */}
          {settings.showFps && (
            <div className="absolute top-2 right-2 px-2 py-1 bg-zinc-950/80 border border-zinc-800 rounded font-mono text-[9px] text-emerald-400 font-bold tracking-wider pointer-events-none z-30 flex items-center gap-1.5 shadow">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span>60 FPS</span>
              <span className="text-zinc-500">|</span>
              <span className="text-zinc-400">16ms</span>
            </div>
          )}

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
      />

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
                    <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-md font-bold uppercase ${modeInfo.badgeClass}`}>
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-[9px] font-mono text-zinc-300 leading-normal">
                    {modeInfo.desc}
                  </p>
                </div>

                {/* NAVIGATION CONTROLS */}
                <div className="space-y-2">
                  {modeInfo.id === 'practice_ai' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          const state = stateRef.current;
                          if (state.player && state.dummy) {
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
                    className="py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-white font-mono font-bold uppercase text-[9px] tracking-wider transition rounded-lg flex items-center justify-center gap-1.5 shadow"
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
                  className="w-full py-2 bg-white text-black font-display font-black italic uppercase text-[10px] tracking-widest hover:bg-zinc-200 transition active:scale-98 rounded-lg mt-1"
                >
                  Resume Combat Match
                </button>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* FULL SETTINGS MODAL */}
      {showFullSettings && (
        <SettingsModal
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

      {/* DEV FIGHTING STYLE SWITCHER - QUICK TAP CHANGER (Practice mode only, toggleable in settings) */}
      {isPlaying && !isDead && !showModeSelector && !matchData?.isCompetitive && !matchData?.isAiMatch && !matchData?.isAiVsAiSpectator && settings.showDevSwitcher && (
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

    </div>
  );
}
