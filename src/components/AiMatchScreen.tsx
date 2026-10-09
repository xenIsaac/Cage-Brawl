import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, Swords, Trophy, Shield, Skull, Flame, Sparkles, 
  ArrowLeft, Lock, Award, Zap, ChevronRight, CheckCircle2,
  AlertTriangle, RefreshCw, Star, Info, Target, Eye, X,
  Radio, Cpu, Layers, Timer, Users, Activity, Play, ChevronLeft,
  FlameKindling, Crosshair, ArrowRight, BookOpen
} from 'lucide-react';
import { PlayerStats, MatchData, GameSettings, UserSession, TournamentBracketState, TournamentFighter, TournamentMatch } from '../types';
import { FIGHTING_STYLES } from '../data/styles';
import { soundManager } from './SoundManager';
import { getRankInfo, calculateWinEloGain, calculateLossEloLoss } from '../utils/elo';
import { formatHeight } from '../utils/heightModifiers';
import { isMobileDevice } from '../utils/deviceDetection';
import { TournamentLadderModal } from './arena/TournamentLadderModal';
import { RulebookModal } from './singleplayer/RulebookModal';

interface AiMatchScreenProps {
  stats: PlayerStats;
  updateStats: (updates: Partial<PlayerStats>) => void;
  settings: GameSettings;
  updateSettings: (updates: Partial<GameSettings>) => void;
  currentUser: UserSession | null;
  onBackToMenu: () => void;
  onStartMatch: (matchData: MatchData) => void;
  onOpenQuests?: () => void;
  isNavHidden?: boolean;
  setIsNavHidden?: (hidden: boolean) => void;
  isNavExpanded?: boolean;
  version?: string;
  modeSide?: SingleplayerSide;
  setModeSide?: (side: SingleplayerSide) => void;
  compSubTab?: CompetitiveSubTab;
  setCompSubTab?: (tab: CompetitiveSubTab) => void;
  casualSubTab?: CasualSubTab;
  setCasualSubTab?: (tab: CasualSubTab) => void;
  selectedCasualDifficulty?: AiDifficulty;
  setSelectedCasualDifficulty?: (diff: AiDifficulty) => void;
}

export type SingleplayerSide = 'competitive' | 'casual';
export type CompetitiveSubTab = 'ranked_ai' | 'tournament' | 'boss_raids';
export type CasualSubTab = 'casual_1v1' | 'ai_vs_ai' | 'upcoming';
export type AiDifficulty = 'rookie' | 'silver' | 'gold' | 'diamond' | 'amethyst';

const AI_OPPONENT_NAMES = [
  'Kurogane_AI', 'Iron_Lotus', 'Viper_Protocol', 'Shadow_Striker', 'Titan_Brawler',
  'Cyber_Baku', 'Ghost_Feather', 'Ronin_Zero', 'Apex_Predator', 'Volt_Haymaker',
  'Zenith_Striker', 'Ryu_Nomad', 'Omega_Knee', 'Blaze_Tengu', 'Aegis_Champion'
];

export default function AiMatchScreen({
  stats,
  updateStats,
  settings,
  updateSettings,
  currentUser,
  onBackToMenu,
  onStartMatch,
  onOpenQuests,
  isNavHidden = false,
  setIsNavHidden,
  isNavExpanded = false,
  version = '1.7.5 Part 3',
  modeSide: externalModeSide,
  setModeSide: externalSetModeSide,
  compSubTab: externalCompSubTab,
  setCompSubTab: externalSetCompSubTab,
  casualSubTab: externalCasualSubTab,
  setCasualSubTab: externalSetCasualSubTab,
  selectedCasualDifficulty: externalSelectedCasualDifficulty,
  setSelectedCasualDifficulty: externalSetSelectedCasualDifficulty,
}: AiMatchScreenProps) {
  const checkMobile = () => isMobileDevice();

  const [isPortrait, setIsPortrait] = useState<boolean>(window.innerHeight > window.innerWidth);
  const [isMobileView, setIsMobileView] = useState<boolean>(checkMobile());

  // Navigation state fallbacks
  const [internalModeSide, setInternalModeSide] = useState<SingleplayerSide>('competitive');
  const [internalCompSubTab, setInternalCompSubTab] = useState<CompetitiveSubTab>('ranked_ai');
  const [internalCasualSubTab, setInternalCasualSubTab] = useState<CasualSubTab>('casual_1v1');
  const [internalSelectedCasualDifficulty, setInternalSelectedCasualDifficulty] = useState<AiDifficulty>('silver');

  const modeSide = externalModeSide ?? internalModeSide;
  const setModeSide = externalSetModeSide ?? setInternalModeSide;
  const compSubTab = externalCompSubTab ?? internalCompSubTab;
  const setCompSubTab = externalSetCompSubTab ?? setInternalCompSubTab;
  const casualSubTab = externalCasualSubTab ?? internalCasualSubTab;
  const setCasualSubTab = externalSetCasualSubTab ?? setInternalCasualSubTab;
  const selectedCasualDifficulty = externalSelectedCasualDifficulty ?? internalSelectedCasualDifficulty;
  const setSelectedCasualDifficulty = externalSetSelectedCasualDifficulty ?? setInternalSelectedCasualDifficulty;

  const [showRulebookModal, setShowRulebookModal] = useState<boolean>(false);

  // Dynamic Adaptive Viewport Padding - protects mobile & landscape from squishing
  const isMobile = isMobileView || checkMobile();
  const isNarrowScreen = typeof window !== 'undefined' && (window.innerWidth < 1024 || (!isPortrait && window.innerHeight < 600));

  const dynamicPaddingLeft = isNavHidden
    ? '0.75rem'
    : (isMobile || isNarrowScreen)
      ? '4.25rem' // Fixed slim padding on mobile/landscape - rail floats as overlay without squishing!
      : isNavExpanded
        ? '16.5rem' // 264px when rail expands on desktop PC
        : '4.75rem'; // 76px when rail collapsed

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(checkMobile());
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // --- TOURNAMENT STATE & ENGINE ---
  const [showTournamentModal, setShowTournamentModal] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('mma_sim_tournament_bracket_v1_7_4');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Boolean(parsed?.status === 'in_progress' && parsed?.entryFeePaid);
      }
    } catch (e) {}
    return false;
  });

  const rollWeightedTournamentDifficulty = (): AiDifficulty => {
    const roll = Math.random() * 100;
    if (roll < 5) return 'rookie';
    if (roll < 30) return 'silver';
    if (roll < 70) return 'gold';
    if (roll < 95) return 'diamond';
    return 'amethyst';
  };

  const createNewTournamentBracket = (): TournamentBracketState => {
    const activeStyles = FIGHTING_STYLES.filter(s => s.reworkStatus !== 'undergoing_rework' && s.reworkStatus !== 'undergoing_development');
    const generatedFighters: TournamentFighter[] = Array.from({ length: 8 }).map((_, i) => {
      const diff = rollWeightedTournamentDifficulty();
      const styleObj = activeStyles[Math.floor(Math.random() * activeStyles.length)] || FIGHTING_STYLES[0];
      const name = AI_OPPONENT_NAMES[i % AI_OPPONENT_NAMES.length] + (i >= AI_OPPONENT_NAMES.length ? `_${i + 1}` : '');
      const diffLevelMap = { rookie: 3, silver: 7, gold: 12, diamond: 18, amethyst: 25 };
      return {
        id: `tourney_fighter_${Date.now()}_${i}`,
        name,
        style: styleObj,
        heightInInches: 66 + Math.floor(Math.random() * 8),
        aiDifficulty: diff,
        elo: diffLevelMap[diff] * 90
      };
    });

    const quarterMatches: TournamentMatch[] = [
      { id: 'qf_1', round: 'quarter', matchIndex: 0, fighter1: 'PLAYER', fighter2: generatedFighters[0], isCompleted: false },
      { id: 'qf_2', round: 'quarter', matchIndex: 1, fighter1: generatedFighters[1], fighter2: generatedFighters[2], isCompleted: false, simDuration: 26, simElapsed: 0, simCurrentRound: 1, simFighter1HpPct: 100, simFighter2HpPct: 100 },
      { id: 'qf_3', round: 'quarter', matchIndex: 2, fighter1: generatedFighters[3], fighter2: generatedFighters[4], isCompleted: false, simDuration: 29, simElapsed: 0, simCurrentRound: 1, simFighter1HpPct: 100, simFighter2HpPct: 100 },
      { id: 'qf_4', round: 'quarter', matchIndex: 3, fighter1: generatedFighters[5], fighter2: generatedFighters[6], isCompleted: false, simDuration: 32, simElapsed: 0, simCurrentRound: 1, simFighter1HpPct: 100, simFighter2HpPct: 100 }
    ];

    const semiMatches: TournamentMatch[] = [
      { id: 'sf_1', round: 'semi', matchIndex: 0, fighter1: 'PLAYER', fighter2: undefined, isCompleted: false },
      { id: 'sf_2', round: 'semi', matchIndex: 1, fighter1: undefined, fighter2: undefined, isCompleted: false, simDuration: 30, simElapsed: 0, simCurrentRound: 1, simFighter1HpPct: 100, simFighter2HpPct: 100 }
    ];

    const finalMatch: TournamentMatch = {
      id: 'final_1',
      round: 'final',
      matchIndex: 0,
      fighter1: undefined,
      fighter2: undefined,
      isCompleted: false
    };

    return {
      id: `bracket_${Date.now()}`,
      status: 'in_progress',
      currentRound: 'quarter',
      entryFeePaid: true,
      fighters: generatedFighters,
      quarterMatches,
      semiMatches,
      finalMatch
    };
  };

  const [tournamentBracket, setTournamentBracket] = useState<TournamentBracketState>(() => {
    try {
      const saved = localStorage.getItem('mma_sim_tournament_bracket_v1_7_4');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.quarterMatches && parsed.quarterMatches.length === 4) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load tournament bracket', e);
    }
    const fresh = createNewTournamentBracket();
    fresh.entryFeePaid = false;
    return fresh;
  });

  const [entryFeeErrorMsg, setEntryFeeErrorMsg] = useState<string | null>(null);
  const [showForfeitModal, setShowForfeitModal] = useState<boolean>(false);
  const [preMatchCountdown, setPreMatchCountdown] = useState<number>(3);
  const [showAftermatchModal, setShowAftermatchModal] = useState<boolean>(false);
  const [lastAftermatchData, setLastAftermatchData] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('mma_tournament_last_aftermatch');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const prevRivalsReadyRef = useRef<boolean>(false);
  const [resultsCountdown, setResultsCountdown] = useState<number>(10);
  const [tournamentNotification, setTournamentNotification] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('mma_sim_tournament_bracket_v1_7_4', JSON.stringify(tournamentBracket));
    } catch (e) {
      console.error('Failed to save tournament bracket', e);
    }
  }, [tournamentBracket]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('mma_sim_tournament_bracket_v1_7_4');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.quarterMatches && parsed.quarterMatches.length === 4) {
          setTournamentBracket(parsed);
          if (parsed.status === 'in_progress' && parsed.entryFeePaid) {
            setShowTournamentModal(true);
          }
        }
      }
    } catch (e) {
      console.error('Failed to restore tournament bracket state', e);
    }

    try {
      const aftermatch = localStorage.getItem('mma_tournament_last_aftermatch');
      if (aftermatch) {
        setLastAftermatchData(JSON.parse(aftermatch));
      }
    } catch (e) {}

    const notif = localStorage.getItem('mma_tournament_notification');
    if (notif) {
      setTournamentNotification(notif);
      localStorage.removeItem('mma_tournament_notification');
      const timer = setTimeout(() => setTournamentNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Background tournament simulation with monotonic HP degradation per round (zero mid-round healing)
  useEffect(() => {
    if (!showTournamentModal && tournamentBracket.status !== 'in_progress') return;

    const interval = setInterval(() => {
      if (tournamentBracket.status === 'completed' || tournamentBracket.status === 'eliminated') {
        if (showTournamentModal) {
          setResultsCountdown(prev => {
            if (prev <= 1) {
              setShowTournamentModal(false);
              return 10;
            }
            return prev - 1;
          });
        }
        return;
      }

      setTournamentBracket(prev => {
        if (prev.status !== 'in_progress') return prev;
        const next = { ...prev };
        const diffWeights = { rookie: 1, silver: 2, gold: 3.2, diamond: 4.5, amethyst: 6 };

        const simulateMatch = (match: TournamentMatch): { match: TournamentMatch; winner?: TournamentFighter } => {
          if (match.isCompleted || match.fighter1 === 'PLAYER' || match.fighter2 === 'PLAYER' || !match.fighter1 || !match.fighter2) {
            return { match };
          }
          const m = { ...match };
          const duration = m.simDuration || 24;
          const elapsed = (m.simElapsed || 0) + 1;
          m.simDuration = duration;
          m.simElapsed = elapsed;
          m.isSimulating = true;

          const f1 = m.fighter1 as TournamentFighter;
          const f2 = m.fighter2 as TournamentFighter;

          // 3-Round Standard MMA Simulation Engine
          const roundDuration = Math.max(6, Math.floor(duration / 3)); // ~8s per round
          const currentRound = Math.min(3, Math.floor(elapsed / roundDuration) + 1);
          const roundElapsed = elapsed % roundDuration;
          const roundProgress = roundElapsed / roundDuration;
          m.simCurrentRound = currentRound;

          const base1 = (diffWeights[f1.aiDifficulty] || 2) * 12;
          const base2 = (diffWeights[f2.aiDifficulty] || 2) * 12;
          const s1 = FIGHTING_STYLES.find(s => s.id === f1.style.id);
          const s2 = FIGHTING_STYLES.find(s => s.id === f2.style.id);
          const hDiff1 = ((f1.heightInInches || 70) - 70) * 0.8;
          const hDiff2 = ((f2.heightInInches || 70) - 70) * 0.8;
          const pow1 = (s1?.statModifiers?.power || 1.0) * 10;
          const pow2 = (s2?.statModifiers?.power || 1.0) * 10;

          const rating1 = base1 + pow1 + hDiff1;
          const rating2 = base2 + pow2 + hDiff2;
          const advantage = Math.max(-0.6, Math.min(0.6, (rating1 - rating2) / 60));

          // Damage rates per round based on matchup rating
          const f1DamageRate = Math.max(35, Math.min(85, 60 - advantage * 30));
          const f2DamageRate = Math.max(35, Math.min(85, 60 + advantage * 30));

          if (roundElapsed === 0) {
            // Fresh round started: FULL RESET of HP to 100% after previous round ends
            m.simFighter1HpPct = 100;
            m.simFighter2HpPct = 100;
          } else {
            // Damage strictly decreases during the round - strictly NO mid-round healing
            const targetHp1 = Math.max(10, Math.round(100 - (roundProgress * f1DamageRate)));
            const targetHp2 = Math.max(10, Math.round(100 - (roundProgress * f2DamageRate)));
            m.simFighter1HpPct = Math.min(m.simFighter1HpPct ?? 100, targetHp1);
            m.simFighter2HpPct = Math.min(m.simFighter2HpPct ?? 100, targetHp2);
          }

          // At the end of each round, award round point to the fighter with higher HP
          if (roundElapsed === roundDuration - 1) {
            if ((m.simFighter1HpPct || 50) >= (m.simFighter2HpPct || 50)) {
              m.simFighter1Score = (m.simFighter1Score || 0) + 1;
            } else {
              m.simFighter2Score = (m.simFighter2Score || 0) + 1;
            }
          }

          // Match complete at total duration
          if (elapsed >= duration) {
            m.isCompleted = true;
            m.isSimulating = false;
            m.simFighter1HpPct = 0;
            m.simFighter2HpPct = 0;

            const totalScores = (m.simFighter1Score || 0) + (m.simFighter2Score || 0);
            if (totalScores < 3) {
              if ((m.simFighter1HpPct || 50) >= (m.simFighter2HpPct || 50)) {
                m.simFighter1Score = (m.simFighter1Score || 0) + 1;
              } else {
                m.simFighter2Score = (m.simFighter2Score || 0) + 1;
              }
            }

            const winner = (m.simFighter1Score || 0) >= (m.simFighter2Score || 0) ? f1 : f2;
            m.winner = winner;
            return { match: m, winner };
          }
          return { match: m };
        };

        let updatedQFs = [...next.quarterMatches];
        for (let i = 1; i < 4; i++) {
          if (!updatedQFs[i].isCompleted && updatedQFs[i].fighter1 && updatedQFs[i].fighter2) {
            const res = simulateMatch(updatedQFs[i]);
            updatedQFs[i] = res.match;
            if (res.winner) {
              setTournamentNotification(`${res.winner.name} won Quarter-Final ${i + 1}!`);
            }
          }
        }
        next.quarterMatches = updatedQFs;

        const qf2Win = next.quarterMatches[1].winner as TournamentFighter | undefined;
        const qf3Win = next.quarterMatches[2].winner as TournamentFighter | undefined;
        const qf4Win = next.quarterMatches[3].winner as TournamentFighter | undefined;

        if (qf2Win && !next.semiMatches[0].fighter2) next.semiMatches[0].fighter2 = qf2Win;
        if (qf3Win && !next.semiMatches[1].fighter1) next.semiMatches[1].fighter1 = qf3Win;
        if (qf4Win && !next.semiMatches[1].fighter2) next.semiMatches[1].fighter2 = qf4Win;

        if (!next.semiMatches[1].isCompleted && next.semiMatches[1].fighter1 && next.semiMatches[1].fighter2) {
          const res = simulateMatch(next.semiMatches[1]);
          next.semiMatches[1] = res.match;
          if (res.winner) {
            setTournamentNotification(`${res.winner.name} won Semi-Final 2!`);
            next.finalMatch.fighter2 = res.winner;
          }
        }

        const sf2Win = next.semiMatches[1].winner as TournamentFighter | undefined;
        if (sf2Win && !next.finalMatch.fighter2) {
          next.finalMatch.fighter2 = sf2Win;
        }

        return { ...next };
      });

      if (showTournamentModal) {
        const curRound = tournamentBracket.currentRound;
        let playerMatchUncompleted = false;
        let oppFighter: TournamentFighter | null = null;
        let rivalsReady = true;

        if (curRound === 'quarter' && !tournamentBracket.quarterMatches[0].isCompleted) {
          playerMatchUncompleted = true;
          oppFighter = tournamentBracket.quarterMatches[0].fighter2 as TournamentFighter;
        } else if (curRound === 'semi' && !tournamentBracket.semiMatches[0].isCompleted) {
          const allQfsDone = tournamentBracket.quarterMatches.every(m => m.isCompleted);
          if (allQfsDone) {
            playerMatchUncompleted = true;
            oppFighter = tournamentBracket.semiMatches[0].fighter2 as TournamentFighter;
          } else {
            rivalsReady = false;
          }
        } else if (curRound === 'final' && !tournamentBracket.finalMatch.isCompleted) {
          const sf2Done = tournamentBracket.semiMatches[1].isCompleted;
          if (sf2Done) {
            playerMatchUncompleted = true;
            oppFighter = tournamentBracket.finalMatch.fighter2 as TournamentFighter;
          } else {
            rivalsReady = false;
          }
        }

        // When all fighters qualify and rivals become ready, reset countdown to 3 seconds!
        if (!prevRivalsReadyRef.current && rivalsReady && playerMatchUncompleted) {
          setPreMatchCountdown(3);
        }
        prevRivalsReadyRef.current = rivalsReady;

        // Auto-dispatches to octagon in 3 seconds once all fighters finish and qualify
        if (playerMatchUncompleted && oppFighter && rivalsReady) {
          setPreMatchCountdown(prev => {
            if (prev <= 1) {
              handleStartPlayerTournamentMatch(curRound, oppFighter!);
              return 3;
            }
            return prev - 1;
          });
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [showTournamentModal, tournamentBracket]);

  const handleEnterTournamentClick = () => {
    soundManager.playRollTick();
    setEntryFeeErrorMsg(null);

    if (tournamentBracket.status === 'in_progress' && tournamentBracket.entryFeePaid) {
      setShowTournamentModal(true);
      return;
    }

    if ((stats.cash || 0) < 750) {
      soundManager.playRollTick();
      setEntryFeeErrorMsg(`Insufficient Funds: Tournament 1 requires $750 Cash entry fee! (You have $${stats.cash || 0})`);
      return;
    }

    updateStats({ cash: (stats.cash || 0) - 750 });
    const fresh = createNewTournamentBracket();
    fresh.entryFeePaid = true;
    fresh.status = 'in_progress';
    fresh.currentRound = 'quarter';
    setTournamentBracket(fresh);
    setPreMatchCountdown(3);
    setResultsCountdown(10);
    setShowTournamentModal(true);
  };

  const handleAttemptCloseTournament = () => {
    soundManager.playRollTick();
    if (tournamentBracket.status === 'in_progress') {
      setShowForfeitModal(true);
    } else {
      setShowTournamentModal(false);
    }
  };

  const handleConfirmForfeit = () => {
    soundManager.playRollTick();
    setShowForfeitModal(false);
    setShowTournamentModal(false);
    localStorage.removeItem('mma_sim_tournament_bracket_v1_7_4');
    const fresh = createNewTournamentBracket();
    fresh.entryFeePaid = false;
    setTournamentBracket(fresh);
  };

  const handleStartPlayerTournamentMatch = (round: 'quarter' | 'semi' | 'final', opponentFighter: TournamentFighter) => {
    soundManager.playRollTick();
    const opponent = {
      id: opponentFighter.id,
      name: opponentFighter.name,
      level: Math.floor(opponentFighter.elo / 80) || 12,
      heightInInches: opponentFighter.heightInInches,
      style: opponentFighter.style,
      elo: opponentFighter.elo,
      ping: 0,
      aiDifficulty: opponentFighter.aiDifficulty
    };

    const matchData: MatchData = {
      isCompetitive: true,
      isAiMatch: true,
      aiModeType: 'tournament',
      tournamentRound: round,
      aiDifficulty: opponentFighter.aiDifficulty,
      matchType: '1v1_ranked',
      mapId: 'octagon',
      mapName: 'Octagon Arena',
      modeId: 'tournament_ai_1v1',
      modeName: `VS AI Tournament 1 (${round.toUpperCase()})`,
      opponent,
      isRealMatch: false
    };

    setShowTournamentModal(false);
    onStartMatch(matchData);
  };

  // --- SPECTATOR CHAMBER STATE ---
  const [spectatorBot1Diff, setSpectatorBot1Diff] = useState<AiDifficulty>('silver');
  const [spectatorBot1Style, setSpectatorBot1Style] = useState<string>('street_boxing');
  const [spectatorBot1Height, setSpectatorBot1Height] = useState<number>(70);
  const [spectatorBot2Diff, setSpectatorBot2Diff] = useState<AiDifficulty>('gold');
  const [spectatorBot2Style, setSpectatorBot2Style] = useState<string>('flow_boxing');
  const [spectatorBot2Height, setSpectatorBot2Height] = useState<number>(70);

  const handleStartSpectatorMatch = () => {
    soundManager.playRollTick();
    const bot1StyleObj = FIGHTING_STYLES.find(s => s.id === spectatorBot1Style) || FIGHTING_STYLES[0];
    const bot2StyleObj = FIGHTING_STYLES.find(s => s.id === spectatorBot2Style) || FIGHTING_STYLES[1];

    const bot1 = {
      id: `bot1_${Date.now()}`,
      name: `AI_Alpha`,
      level: 15,
      heightInInches: spectatorBot1Height,
      style: bot1StyleObj,
      elo: 1000,
      ping: 0,
      aiDifficulty: spectatorBot1Diff
    };

    const bot2 = {
      id: `bot2_${Date.now()}`,
      name: `AI_Beta`,
      level: 15,
      heightInInches: spectatorBot2Height,
      style: bot2StyleObj,
      elo: 1000,
      ping: 0,
      aiDifficulty: spectatorBot2Diff
    };

    const matchData: MatchData = {
      isCompetitive: false,
      isAiMatch: true,
      aiModeType: 'spectator',
      isAiVsAiSpectator: true,
      mapId: 'octagon',
      mapName: 'Octagon Arena',
      modeId: 'ai_vs_ai_spectator',
      modeName: 'AI vs AI Spectator Chamber',
      opponent: bot1,
      spectatorFighter2: bot2,
      bot1StyleId: spectatorBot1Style,
      bot1Difficulty: spectatorBot1Diff,
      bot1HeightInInches: spectatorBot1Height,
      bot2StyleId: spectatorBot2Style,
      bot2Difficulty: spectatorBot2Diff,
      bot2HeightInInches: spectatorBot2Height,
      isRealMatch: false
    };
    onStartMatch(matchData);
  };

  // --- ELO & RANKED STATS ---
  const currentAiElo = stats.aiElo ?? 100;
  const rankInfo = getRankInfo(currentAiElo, false);
  const winPreview = calculateWinEloGain(currentAiElo, false);
  const lossPreview = calculateLossEloLoss(currentAiElo, stats.aiLossStreak ?? 0, false);

  const getRankedAiDifficulty = (elo: number): { tier: AiDifficulty; label: string; color: string; desc: string; cashReward: number } => {
    if (elo >= 1500) {
      return { tier: 'amethyst', label: 'Amethyst Grandmaster', color: '#d946ef', desc: 'Master AI with anti-parry feints, orbital footwork & bait counters', cashReward: 800 };
    }
    if (elo >= 1000) {
      return { tier: 'diamond', label: 'Diamond Elite', color: '#06b6d4', desc: 'Elite AI with active Ashihara parries, reflex dodges & whiff punishers', cashReward: 550 };
    }
    if (elo >= 600) {
      return { tier: 'gold', label: 'Gold Advanced', color: '#eab308', desc: 'Advanced AI with combo counters, heavy punishers & approach feints', cashReward: 400 };
    }
    if (elo >= 300) {
      return { tier: 'silver', label: 'Silver Intermediate', color: '#94a3b8', desc: 'Intermediate AI with rapid 4-combo chains & dash spacing', cashReward: 300 };
    }
    return { tier: 'rookie', label: 'Rookie Contender', color: '#ef4444', desc: 'Balanced AI fundamentals with reactive blocking & spacing', cashReward: 220 };
  };

  const rankedOpponentConfig = getRankedAiDifficulty(currentAiElo);

  const generateAiOpponent = (difficulty: AiDifficulty, isRanked: boolean) => {
    const randomName = AI_OPPONENT_NAMES[Math.floor(Math.random() * AI_OPPONENT_NAMES.length)];
    const activeStyles = FIGHTING_STYLES.filter(s => s.reworkStatus !== 'undergoing_rework' && s.reworkStatus !== 'undergoing_development');
    const randomStyle = activeStyles[Math.floor(Math.random() * activeStyles.length)] || FIGHTING_STYLES[0];
    let opponentElo = currentAiElo + Math.floor(Math.random() * 80) - 40;
    if (opponentElo < 100) opponentElo = 100;

    let oppLevel = Math.max(1, Math.floor(currentAiElo / 100) + Math.floor(Math.random() * 3));
    if (!isRanked) {
      const diffLevelMap = { rookie: 3, silver: 7, gold: 12, diamond: 18, amethyst: 25 };
      oppLevel = diffLevelMap[difficulty];
      opponentElo = diffLevelMap[difficulty] * 80;
    }

    return {
      id: `ai_${Date.now()}_${difficulty}`,
      name: `${randomName}`,
      level: oppLevel,
      heightInInches: 68 + Math.floor(Math.random() * 6),
      style: randomStyle,
      elo: opponentElo,
      ping: 0,
      aiDifficulty: difficulty
    };
  };

  const handleStartRankedAiMatch = () => {
    soundManager.playRollTick();
    const opponent = generateAiOpponent(rankedOpponentConfig.tier, true);
    const matchData: MatchData = {
      isCompetitive: true,
      isAiMatch: true,
      aiModeType: 'ranked',
      aiDifficulty: rankedOpponentConfig.tier,
      matchType: '1v1_ranked',
      mapId: 'octagon',
      mapName: 'Octagon Arena',
      modeId: 'ranked_ai_1v1',
      modeName: 'VS AI Ranked 1v1',
      opponent,
      isRealMatch: false
    };
    onStartMatch(matchData);
  };

  const handleStartCasualAiMatch = () => {
    soundManager.playRollTick();
    const opponent = generateAiOpponent(selectedCasualDifficulty, false);
    const matchData: MatchData = {
      isCompetitive: false,
      isAiMatch: true,
      aiModeType: 'casual',
      aiDifficulty: selectedCasualDifficulty,
      matchType: '1v1_unranked',
      mapId: 'octagon',
      mapName: 'Octagon Arena',
      modeId: 'casual_ai_1v1',
      modeName: `Casual VS AI (${selectedCasualDifficulty.toUpperCase()})`,
      opponent,
      isRealMatch: false
    };
    onStartMatch(matchData);
  };

  // Toggle Mode Side function with sound
  const handleToggleModeSide = () => {
    soundManager.playRollTick();
    setModeSide(prev => (prev === 'competitive' ? 'casual' : 'competitive'));
  };

  return (
    <div 
      id="singleplayer-screen" 
      style={{ paddingLeft: dynamicPaddingLeft }}
      className="w-full h-full max-h-screen overflow-hidden pr-2 sm:pr-4 py-1.5 sm:py-2.5 bg-zinc-950 text-white select-none relative flex flex-col justify-between font-sans transition-[padding-left] duration-300 ease-out"
    >
      
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* ============================================================== */}
      {/* FLOATING UNFOLD ARROW TAB FOR SINGLEPLAYER UI (WHEN NAV IS HIDDEN) */}
      {/* ============================================================== */}
      {isNavHidden && setIsNavHidden && (
        <button
          onClick={() => {
            soundManager.playRollTick();
            setIsNavHidden(false);
          }}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-[150] py-4 px-2.5 bg-gradient-to-r from-red-950 via-zinc-900 to-zinc-950 hover:from-red-900 hover:to-zinc-900 border-y border-r-2 border-red-500 hover:border-red-400 rounded-r-2xl shadow-[0_0_30px_rgba(239,68,68,0.7)] flex flex-col items-center gap-1.5 cursor-pointer group active:scale-95 transition-all duration-200"
          title="Unfold Navigation Rail"
          aria-label="Unfold Navigation Rail"
        >
          <ChevronRight className="w-5 h-5 text-red-400 group-hover:text-white group-hover:translate-x-1 transition-transform animate-pulse" />
          <span className="text-[8px] font-mono font-black uppercase text-red-300 group-hover:text-white [writing-mode:vertical-lr] tracking-widest">
            UNFOLD
          </span>
        </button>
      )}

      {/* ============================================================== */}
      {/* 2. TOP GLOBAL HEADER */}
      {/* ============================================================== */}
      <div className="relative z-10 flex items-center justify-between gap-2 border-b border-zinc-850 pb-1.5 sm:pb-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {/* Header Unfold Button (Visible when Nav is Hidden) */}
          {isNavHidden && setIsNavHidden && (
            <button
              onClick={() => {
                soundManager.playRollTick();
                setIsNavHidden(false);
              }}
              className="px-2 py-1 rounded-xl bg-red-600/20 border border-red-500/60 text-red-300 hover:text-white hover:bg-red-600/40 transition cursor-pointer flex items-center gap-1 shadow-[0_0_12px_rgba(239,68,68,0.3)] animate-pulse shrink-0 active:scale-95"
              title="Unfold Navigation Rail"
            >
              <ChevronRight className="w-3.5 h-3.5 text-red-400" />
              <span className="text-[9px] font-mono font-black uppercase pr-0.5">UNFOLD</span>
            </button>
          )}

          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl border flex items-center justify-center shadow-sm shrink-0 ${
            modeSide === 'competitive'
              ? 'bg-red-500/20 text-red-400 border-red-500/40'
              : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
          }`}>
            {modeSide === 'competitive' ? <Trophy className="w-3.5 h-3.5 text-amber-400" /> : <Bot className="w-3.5 h-3.5 text-cyan-400" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base font-display font-black italic uppercase text-white tracking-tight truncate">
                Singleplayer • {modeSide === 'competitive' ? 'Competitive' : 'Casuals'}
              </h1>
              <span className={`text-[7.5px] sm:text-[8px] font-mono font-bold uppercase px-1.5 py-0.2 rounded-md border shrink-0 ${
                modeSide === 'competitive'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              }`}>
                {modeSide === 'competitive' 
                  ? (compSubTab === 'ranked_ai' ? 'Ranked 1v1 Elo' : compSubTab === 'tournament' ? 'Tournament Bracket' : 'Boss Raids')
                  : (casualSubTab === 'casual_1v1' ? 'Casual 1v1 Sparring' : casualSubTab === 'ai_vs_ai' ? 'AI vs AI Sim' : 'Upcoming Arenas')}
              </span>
            </div>
            <p className="text-[9px] font-mono text-zinc-400 truncate hidden xs:block">
              {modeSide === 'competitive'
                ? 'Competitive Stance Combat • Dedicated Offline Elo Rating & Tournament Pursuits'
                : 'Zero-Risk Custom Sparring • Multi-Tier Difficulty AI & Neural Simulation'}
            </p>
          </div>
        </div>

        {/* Currency & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Hide / Unfold Rail Toggle */}
          {setIsNavHidden && (
            <button
              onClick={() => {
                soundManager.playRollTick();
                setIsNavHidden(!isNavHidden);
              }}
              className={`px-2 py-1 rounded-xl border text-[10px] font-mono font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-sm ${
                isNavHidden
                  ? 'bg-red-600/20 border-red-500/60 text-red-300 hover:bg-red-600/30 shadow-[0_0_12px_rgba(239,68,68,0.3)] animate-pulse'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
              title={isNavHidden ? 'Unfold Navigation Rail' : 'Hide Navigation Rail'}
            >
              <ChevronRight className={`w-3 h-3 transition-transform ${isNavHidden ? '' : 'rotate-180 text-zinc-500'}`} />
              <span className="uppercase text-[9px]">{isNavHidden ? 'Unfold' : 'Hide'}</span>
            </button>
          )}

          {/* Rulebook Button */}
          <button
            onClick={() => { soundManager.playRollTick(); setShowRulebookModal(true); }}
            className="px-2.5 py-1 bg-gradient-to-r from-amber-600/20 via-zinc-900 to-amber-600/10 hover:from-amber-600/30 hover:to-amber-500/20 text-amber-300 hover:text-amber-200 border border-amber-500/40 hover:border-amber-400 rounded-xl transition text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer shadow-md shadow-amber-950/20 active:scale-95"
            title="Single Player Rulebook - Complete Game & Engine Rules"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-display font-black italic uppercase tracking-wider text-[10px]">Rules</span>
          </button>

          {/* Cash */}
          <div className="bg-zinc-900/90 border border-amber-500/30 px-2 py-1 rounded-xl flex items-center gap-1 shadow-sm">
            <span className="text-amber-400 font-mono font-bold text-[11px]">$</span>
            <span className="font-mono font-bold text-[11px] text-white">{stats.cash.toLocaleString()}</span>
          </div>

          {/* Quests Button */}
          {onOpenQuests && (
            <button
              onClick={() => { soundManager.playRollTick(); onOpenQuests(); }}
              className="px-2 py-1 bg-zinc-900 hover:bg-cyan-500/10 border border-cyan-500/30 hover:border-cyan-500/60 text-cyan-300 rounded-xl transition text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer shadow-sm active:scale-95"
              title="Singleplayer Combat Quests"
            >
              <Target className="w-3 h-3 text-cyan-400" />
              <span className="hidden md:inline uppercase text-[9px]">Quests</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. DEDICATED FULL-WIDTH MAIN VIEW CANVAS (DRIVEN BY LEFT RAIL) */}
      {/* ============================================================== */}
      <div className="relative z-10 flex-1 my-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 min-w-0 min-h-0 overflow-y-auto landscape:overflow-hidden custom-scrollbar pr-1 flex flex-col">
          <AnimatePresence mode="wait">
            
            {/* ------------------------------------------------------------ */}
            {/* SIDE 1: COMPETITIVE SUB-TABS */}
            {/* ------------------------------------------------------------ */}
            {modeSide === 'competitive' && compSubTab === 'ranked_ai' && (
              <motion.div
                key="comp-ranked"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.22 }}
                className="h-full flex flex-col justify-between"
              >
                {/* Hero Ranked Banner with Dynamic Landscape 2-Column Split */}
                <div className="bg-gradient-to-br from-zinc-900/95 via-zinc-950 to-zinc-900/95 border-2 border-red-500/50 rounded-2xl p-3 sm:p-4 md:p-5 shadow-2xl relative overflow-hidden flex-1 flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

                  {/* Header Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2 sm:pb-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                        <Swords className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                      <div>
                        <span className="text-[8.5px] font-mono text-red-400 uppercase font-bold tracking-widest block leading-none">
                          COMPETITIVE LADDER
                        </span>
                        <h2 className="text-base sm:text-xl md:text-2xl font-display font-black italic uppercase text-white tracking-tight leading-tight mt-0.5">
                          Ranked AI 1v1 Ladder
                        </h2>
                      </div>
                    </div>

                    <span className="text-[8.5px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-full uppercase">
                      Dedicated AI ELO
                    </span>
                  </div>

                  {/* Dynamic Adaptive Content: 2-Column in Landscape, Stacked in Portrait */}
                  <div className="grid grid-cols-1 landscape:grid-cols-2 gap-2.5 sm:gap-3 my-auto py-1">
                    {/* LEFT COLUMN: Summary & Player Rank */}
                    <div className="space-y-2 flex flex-col justify-between">
                      <p className="text-[11px] sm:text-xs text-zinc-400 leading-relaxed">
                        Climb offline rank divisions. Higher AI ELO automatically matches you with smarter opponents featuring reactive parries, whiff punishes, and anti-parry feints.
                      </p>

                      <div className="bg-zinc-950/80 border border-zinc-800 p-2.5 sm:p-3 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-[8px] font-mono text-zinc-500 uppercase block">Your AI Rank</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-base sm:text-lg">{rankInfo.icon}</span>
                            <span className="text-xs sm:text-sm font-display font-black italic uppercase" style={{ color: rankInfo.color }}>
                              {rankInfo.tierName}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] sm:text-xs font-mono font-black text-amber-400 block">{currentAiElo} ELO</span>
                          <span className="text-[7.5px] font-mono text-zinc-500 uppercase">Division Rating</span>
                        </div>
                      </div>

                      {/* Format Specs */}
                      <div className="flex items-center gap-1.5 text-[8.5px] sm:text-[9px] font-mono text-zinc-400">
                        <span className="bg-zinc-900/90 px-2 py-0.5 rounded-lg border border-zinc-800">🥊 Best of 5 (First to 3 KOs)</span>
                        <span className="bg-zinc-900/90 px-2 py-0.5 rounded-lg border border-zinc-800">⏱️ 3 Mins / Round</span>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Opponent Tier, Stakes & Direct Action Button */}
                    <div className="space-y-2 flex flex-col justify-between">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-zinc-950/80 border border-zinc-800 p-2.5 rounded-xl">
                          <span className="text-[8px] font-mono text-zinc-500 uppercase block">Matched Tier</span>
                          <span className="text-xs sm:text-sm font-display font-black italic uppercase block mt-0.5" style={{ color: rankedOpponentConfig.color }}>
                            {rankedOpponentConfig.label}
                          </span>
                          <span className="text-[8px] font-mono text-zinc-400 line-clamp-1 mt-0.5">
                            {rankedOpponentConfig.desc}
                          </span>
                        </div>

                        <div className="bg-zinc-950/80 border border-zinc-800 p-2.5 rounded-xl">
                          <span className="text-[8px] font-mono text-zinc-500 uppercase block">Stakes & Purse</span>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-xs sm:text-sm font-mono font-bold text-emerald-400">+${rankedOpponentConfig.cashReward}</span>
                            <span className="text-xs sm:text-sm font-mono font-bold text-amber-400">+{winPreview} ELO</span>
                          </div>
                          <span className="text-[8px] font-mono text-red-400 block mt-0.5">
                            Defeat: -{lossPreview.eloLoss} ELO
                          </span>
                        </div>
                      </div>

                      {/* Primary Enter Match Action Button */}
                      <button
                        onClick={handleStartRankedAiMatch}
                        className="w-full py-2.5 sm:py-3.5 bg-gradient-to-r from-red-600 via-red-500 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white rounded-xl font-display font-black italic uppercase text-xs sm:text-sm tracking-wider transition transform active:scale-98 shadow-xl shadow-red-900/30 flex items-center justify-center gap-2 cursor-pointer mt-1"
                      >
                        <Swords className="w-4 h-4 text-white animate-pulse" />
                        Enter Ranked 1v1 Match
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {modeSide === 'competitive' && compSubTab === 'tournament' && (
              <motion.div
                key="comp-tournament"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.22 }}
                className="h-full flex flex-col justify-between"
              >
                {/* Tournament 1 Octagon Knockout with Landscape 2-Column Split */}
                <div className="bg-gradient-to-br from-zinc-900/95 via-zinc-950 to-zinc-900/95 border-2 border-amber-500/50 rounded-2xl p-3 sm:p-4 md:p-5 shadow-2xl relative overflow-hidden flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2 sm:pb-3 flex-wrap gap-2 shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                        <Trophy className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[8.5px] font-mono text-amber-400 uppercase font-bold tracking-widest block leading-none">
                          OCTAGON TOURNAMENT LADDER
                        </span>
                        <h3 className="text-base sm:text-lg md:text-xl font-display font-black italic uppercase text-white mt-0.5">
                          Tournament 1: Octagon Knockout
                        </h3>
                      </div>
                    </div>

                    <span className="text-[8px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full uppercase">
                      9 Competitors (8 AI + 1 Player)
                    </span>
                  </div>

                  {/* Dynamic 2-Column Landscape Split */}
                  <div className="grid grid-cols-1 landscape:grid-cols-2 gap-2.5 sm:gap-3 my-auto py-1">
                    {/* Left Column: Description & Prizes */}
                    <div className="space-y-2 flex flex-col justify-between">
                      <p className="text-[11px] sm:text-xs text-zinc-400 leading-relaxed">
                        Single-elimination championship bracket. Other AI matches simulate in real-time. Win all 3 rounds to take the full $1,000 Cash purse and 5 Roll Tickets!
                      </p>

                      {/* Rewards Row */}
                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        <div className="bg-zinc-950/80 p-2 rounded-xl border border-zinc-800">
                          <span className="text-[7.5px] font-mono text-zinc-500 uppercase block">Top 8 (Round 1)</span>
                          <span className="text-xs font-mono font-bold text-amber-400">+$500 Cash</span>
                        </div>
                        <div className="bg-zinc-950/80 p-2 rounded-xl border border-zinc-800">
                          <span className="text-[7.5px] font-mono text-zinc-500 uppercase block">Top 4 (Round 2)</span>
                          <span className="text-xs font-mono font-bold text-amber-400">+$750 Cash</span>
                        </div>
                        <div className="bg-zinc-950/80 p-2 rounded-xl border border-amber-500/40">
                          <span className="text-[7.5px] font-mono text-emerald-400 uppercase font-bold">1st (Champion)</span>
                          <span className="text-xs font-mono font-bold text-emerald-400">+$1k + 5 Tickets</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Error/Status & Enter Button & Tournament 2 Teaser */}
                    <div className="space-y-2 flex flex-col justify-between">
                      {entryFeeErrorMsg && (
                        <div className="text-[9px] font-mono text-red-400 bg-red-950/80 border border-red-800 p-2 rounded-xl flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          <span>{entryFeeErrorMsg}</span>
                        </div>
                      )}

                      <button
                        onClick={handleEnterTournamentClick}
                        className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 hover:brightness-110 text-white rounded-xl font-display font-black italic uppercase text-xs sm:text-sm tracking-wider transition cursor-pointer flex items-center justify-center gap-2 shadow-xl shadow-amber-950/40"
                      >
                        <Trophy className="w-4 h-4 text-white" />
                        {tournamentBracket.status === 'in_progress' && tournamentBracket.entryFeePaid
                          ? 'Resume Active Tournament Bracket'
                          : 'Enter Tournament 1 ($750 Cash)'}
                      </button>

                      {/* Tournament 2 Teaser */}
                      <div className="bg-zinc-900/60 border border-zinc-850 p-2 sm:p-2.5 rounded-xl flex items-center justify-between gap-2 text-xs text-zinc-400">
                        <div className="flex items-center gap-2 min-w-0">
                          <Award className="w-4 h-4 text-zinc-500 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[10px] sm:text-xs font-display font-black italic uppercase text-zinc-300 block truncate">
                              Tournament 2: Grand Championship
                            </span>
                            <span className="text-[8px] font-mono text-zinc-500 truncate block">
                              Multi-bracket grand championship • Exclusive titles
                            </span>
                          </div>
                        </div>
                        <span className="text-[7.5px] font-mono font-bold bg-zinc-950 text-zinc-500 border border-zinc-800 px-1.5 py-0.5 rounded uppercase shrink-0">
                          Coming Soon
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {modeSide === 'competitive' && compSubTab === 'boss_raids' && (
              <motion.div
                key="comp-bosses"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.22 }}
                className="h-full flex flex-col justify-between"
              >
                <div className="bg-gradient-to-br from-zinc-900/95 via-rose-950/20 to-zinc-900/95 border-2 border-rose-500/40 rounded-2xl p-3 sm:p-4 md:p-5 shadow-2xl relative overflow-hidden flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2 sm:pb-3 shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                        <Skull className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[8.5px] font-mono text-rose-400 uppercase font-bold tracking-widest block leading-none">
                          MYTHICAL BOSS CHAMBER
                        </span>
                        <h3 className="text-base sm:text-lg md:text-xl font-display font-black italic uppercase text-white mt-0.5">
                          VS AI Boss Raids
                        </h3>
                      </div>
                    </div>
                    <span className="text-[8px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full uppercase">
                      <Lock className="w-2.5 h-2.5 inline mr-1" /> Upcoming Mode
                    </span>
                  </div>

                  <p className="text-[11px] sm:text-xs text-zinc-400 my-1 leading-relaxed">
                    Challenge colossal AI Titans imbued with custom kinetic auras, massive posture armor thresholds, and multi-phase strike choreography.
                  </p>

                  <div className="grid grid-cols-1 landscape:grid-cols-2 gap-2.5 sm:gap-3 my-auto py-1">
                    <div className="bg-zinc-950/80 border border-zinc-800 p-2.5 sm:p-3 rounded-xl space-y-1">
                      <span className="text-[8.5px] font-mono font-bold text-rose-400 uppercase block">Boss 1: The Asura Monk</span>
                      <p className="text-[9.5px] sm:text-[10px] text-zinc-400 leading-normal">Master of Kyokushin armor & unrelenting full-contact strikes with 300 HP and unbreakable posture.</p>
                    </div>
                    <div className="bg-zinc-950/80 border border-zinc-800 p-2.5 sm:p-3 rounded-xl space-y-1">
                      <span className="text-[8.5px] font-mono font-bold text-purple-400 uppercase block">Boss 2: Phantom of Keysi</span>
                      <p className="text-[9.5px] sm:text-[10px] text-zinc-400 leading-normal">Close-quarters shadow combatant featuring zero-startup pensador lunges and auto-parry feints.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ------------------------------------------------------------ */}
            {/* SIDE 2: NON-COMPETITIVE (CASUAL) SUB-TABS */}
            {/* ------------------------------------------------------------ */}
            {modeSide === 'casual' && casualSubTab === 'casual_1v1' && (
              <motion.div
                key="casual-1v1"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.22 }}
                className="h-full flex flex-col justify-between"
              >
                <div className="bg-gradient-to-br from-zinc-900/95 via-zinc-950 to-zinc-900/95 border-2 border-cyan-500/40 rounded-2xl p-3 sm:p-4 md:p-5 shadow-2xl relative overflow-hidden flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2 sm:pb-3 flex-wrap gap-2 shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                        <Swords className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[8.5px] font-mono text-cyan-400 uppercase font-bold tracking-widest block leading-none">
                          RISK-FREE SPARRING
                        </span>
                        <h2 className="text-base sm:text-lg md:text-xl font-display font-black italic uppercase text-white tracking-tight mt-0.5">
                          Custom Casual Sparring
                        </h2>
                      </div>
                    </div>
                    <span className="text-[8px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full uppercase">
                      No ELO At Stake
                    </span>
                  </div>

                  {/* Dynamic 2-Column Landscape Split */}
                  <div className="grid grid-cols-1 landscape:grid-cols-2 gap-2.5 sm:gap-3 my-auto py-1">
                    {/* Left Column: Description & Difficulty Selection */}
                    <div className="space-y-2 flex flex-col justify-between">
                      <p className="text-[11px] sm:text-xs text-zinc-400 leading-relaxed">
                        Refine counter mechanics against your chosen AI difficulty tier in a full Best of 5 match. Opponent styles are randomized across martial arts.
                      </p>

                      <div className="space-y-1">
                        <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                          Select Opponent AI Difficulty:
                        </span>

                        <div className="grid grid-cols-5 gap-1">
                          {[
                            { id: 'rookie', label: 'Rookie', color: '#ef4444', desc: 'Guards' },
                            { id: 'silver', label: 'Silver', color: '#94a3b8', desc: 'Combos' },
                            { id: 'gold', label: 'Gold', color: '#eab308', desc: 'Punish' },
                            { id: 'diamond', label: 'Diamond', color: '#06b6d4', desc: 'Parries' },
                            { id: 'amethyst', label: 'Amethyst', color: '#d946ef', desc: 'Master' }
                          ].map((diff) => (
                            <button
                              key={diff.id}
                              onClick={() => { soundManager.playRollTick(); setSelectedCasualDifficulty(diff.id as AiDifficulty); }}
                              className={`p-1.5 sm:p-2 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                                selectedCasualDifficulty === diff.id
                                  ? 'bg-zinc-850 border-cyan-500 ring-1 ring-cyan-500 shadow-md'
                                  : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] sm:text-xs font-display font-black italic uppercase truncate" style={{ color: diff.color }}>
                                  {diff.label}
                                </span>
                                {selectedCasualDifficulty === diff.id && (
                                  <CheckCircle2 className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                                )}
                              </div>
                              <span className="text-[7.5px] font-mono text-zinc-500 mt-0.5 truncate block">
                                {diff.desc}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Rewards & Start Match Button */}
                    <div className="space-y-2 flex flex-col justify-between">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-zinc-950/80 border border-zinc-800 p-2 sm:p-2.5 rounded-xl">
                          <span className="text-[8px] font-mono text-zinc-500 uppercase block">Victory Reward</span>
                          <span className="text-xs font-mono font-bold text-emerald-400 mt-0.5 block">+$120 Cash • +1 Roll</span>
                        </div>
                        <div className="bg-zinc-950/80 border border-zinc-800 p-2 sm:p-2.5 rounded-xl">
                          <span className="text-[8px] font-mono text-zinc-500 uppercase block">Style Roster</span>
                          <span className="text-xs font-mono text-zinc-300 mt-0.5 block">Randomized (10 Styles)</span>
                        </div>
                      </div>

                      <button
                        onClick={handleStartCasualAiMatch}
                        className="w-full py-2.5 sm:py-3.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl font-display font-black italic uppercase text-xs sm:text-sm tracking-wider transition transform active:scale-98 shadow-xl shadow-cyan-900/30 flex items-center justify-center gap-2 cursor-pointer mt-1"
                      >
                        <Swords className="w-4 h-4 text-white" />
                        Start Casual Sparring Match
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {modeSide === 'casual' && casualSubTab === 'ai_vs_ai' && (
              <motion.div
                key="casual-ai-vs-ai"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.22 }}
                className="h-full flex flex-col justify-between"
              >
                <div className="bg-gradient-to-br from-zinc-900/95 via-purple-950/20 to-zinc-900/95 border-2 border-purple-500/40 rounded-2xl p-3 sm:p-4 md:p-5 shadow-2xl relative overflow-hidden flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2 sm:pb-3 flex-wrap gap-2 shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                        <Eye className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[8.5px] font-mono text-purple-400 uppercase font-bold tracking-widest block leading-none">
                          SPECTATOR ARENA
                        </span>
                        <h2 className="text-base sm:text-lg md:text-xl font-display font-black italic uppercase text-white tracking-tight mt-0.5">
                          AI vs AI Simulation Chamber
                        </h2>
                      </div>
                    </div>
                    <span className="text-[8px] font-mono text-purple-300 bg-purple-950/80 border border-purple-800/60 px-2 py-0.5 rounded-full uppercase">
                      Spectator Mode
                    </span>
                  </div>

                  {/* DUAL BOT CONFIGURATION: 2 COLUMNS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 my-auto py-1">
                    {/* BOT ALPHA */}
                    <div className="bg-zinc-950/80 border border-blue-500/40 p-2 sm:p-2.5 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-[9px] font-mono font-bold text-blue-400 uppercase">
                        <span>Fighter Alpha (Blue)</span>
                        <span className="text-zinc-400">{spectatorBot1Diff.toUpperCase()}</span>
                      </div>
                      <div className="flex gap-1 overflow-x-auto pb-0.5 custom-scrollbar">
                        {(['rookie', 'silver', 'gold', 'diamond', 'amethyst'] as AiDifficulty[]).map(d => (
                          <button
                            key={`b1_${d}`}
                            onClick={() => { soundManager.playRollTick(); setSpectatorBot1Diff(d); }}
                            className={`px-1.5 py-0.5 rounded text-[7.5px] font-mono uppercase font-bold transition cursor-pointer ${
                              spectatorBot1Diff === d ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                            }`}
                          >
                            {d[0].toUpperCase() + d.slice(1)}
                          </button>
                        ))}
                      </div>
                      <select
                        value={spectatorBot1Style}
                        onChange={(e) => setSpectatorBot1Style(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-[11px] rounded-lg p-1 font-mono focus:outline-none"
                      >
                        {FIGHTING_STYLES.filter(s => s.reworkStatus !== 'undergoing_rework' && s.reworkStatus !== 'undergoing_development').map(s => (
                          <option key={`b1_s_${s.id}`} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <div className="flex items-center justify-between text-[8px] font-mono text-zinc-400">
                        <span>Height: <strong className="text-white">{formatHeight(spectatorBot1Height)}</strong></span>
                        <input
                          type="range"
                          min="59"
                          max="86"
                          value={spectatorBot1Height}
                          onChange={(e) => setSpectatorBot1Height(Number(e.target.value))}
                          className="w-20 accent-blue-500 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* BOT BETA */}
                    <div className="bg-zinc-950/80 border border-red-500/40 p-2 sm:p-2.5 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-[9px] font-mono font-bold text-red-400 uppercase">
                        <span>Fighter Beta (Red)</span>
                        <span className="text-zinc-400">{spectatorBot2Diff.toUpperCase()}</span>
                      </div>
                      <div className="flex gap-1 overflow-x-auto pb-0.5 custom-scrollbar">
                        {(['rookie', 'silver', 'gold', 'diamond', 'amethyst'] as AiDifficulty[]).map(d => (
                          <button
                            key={`b2_${d}`}
                            onClick={() => { soundManager.playRollTick(); setSpectatorBot2Diff(d); }}
                            className={`px-1.5 py-0.5 rounded text-[7.5px] font-mono uppercase font-bold transition cursor-pointer ${
                              spectatorBot2Diff === d ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                            }`}
                          >
                            {d[0].toUpperCase() + d.slice(1)}
                          </button>
                        ))}
                      </div>
                      <select
                        value={spectatorBot2Style}
                        onChange={(e) => setSpectatorBot2Style(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-[11px] rounded-lg p-1 font-mono focus:outline-none"
                      >
                        {FIGHTING_STYLES.filter(s => s.reworkStatus !== 'undergoing_rework' && s.reworkStatus !== 'undergoing_development').map(s => (
                          <option key={`b2_s_${s.id}`} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <div className="flex items-center justify-between text-[8px] font-mono text-zinc-400">
                        <span>Height: <strong className="text-white">{formatHeight(spectatorBot2Height)}</strong></span>
                        <input
                          type="range"
                          min="59"
                          max="86"
                          value={spectatorBot2Height}
                          onChange={(e) => setSpectatorBot2Height(Number(e.target.value))}
                          className="w-20 accent-red-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleStartSpectatorMatch}
                    className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-display font-black italic uppercase text-xs sm:text-sm tracking-wider transition cursor-pointer flex items-center justify-center gap-2 shadow-xl shadow-purple-950/40 mt-1"
                  >
                    <Eye className="w-4 h-4 text-white" />
                    Launch AI vs AI Simulation
                  </button>
                </div>
              </motion.div>
            )}

            {modeSide === 'casual' && casualSubTab === 'upcoming' && (
              <motion.div
                key="casual-upcoming"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.22 }}
                className="h-full flex flex-col justify-between"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm sm:text-base font-display font-black italic uppercase text-white">
                      Upcoming Casual Combat Modes
                    </h3>
                  </div>
                  <span className="text-[8px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-full uppercase">
                    Roadmap
                  </span>
                </div>

                {/* 3 UPCOMING CARDS: In landscape 3 columns, in portrait stacked */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-auto py-1">
                  
                  {/* CARD 1: HOT POTATO */}
                  <div className="bg-gradient-to-br from-zinc-900/90 via-orange-950/20 to-zinc-950 border border-orange-500/40 rounded-2xl p-3 flex flex-col justify-between space-y-2 shadow-md">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="w-7 h-7 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
                          <FlameKindling className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[7.5px] font-mono font-bold bg-orange-950 text-orange-400 border border-orange-800 px-1.5 py-0.2 rounded uppercase">
                          Hot Potato
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-display font-black italic uppercase text-white">
                        Hot Potato Tag
                      </h4>
                      <p className="text-[9px] sm:text-[10px] text-zinc-400 leading-relaxed">
                        A volatile kinetic orb passes between fighters on successful strike clashes and parries. When the timer hits 0, whoever holds the orb suffers an instant Posture Break explosion!
                      </p>
                    </div>

                    <div className="pt-1.5 border-t border-zinc-800/80 flex items-center justify-between text-[7.5px] font-mono text-zinc-500">
                      <span>Status: In Development</span>
                      <span className="text-orange-400 font-bold">Planned v1.8</span>
                    </div>
                  </div>

                  {/* CARD 2: 2V2 TAG TEAM */}
                  <div className="bg-gradient-to-br from-zinc-900/90 via-cyan-950/20 to-zinc-950 border border-cyan-500/40 rounded-2xl p-3 flex flex-col justify-between space-y-2 shadow-md">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                          <Users className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[7.5px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800 px-1.5 py-0.2 rounded uppercase">
                          Duo Tag
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-display font-black italic uppercase text-white">
                        2v2 AI Tag Team
                      </h4>
                      <p className="text-[9px] sm:text-[10px] text-zinc-400 leading-relaxed">
                        Pair up with an allied AI fighter to brawl against a rival duo. Perform corner tags, assist knockdowns, and synchronize devastating double-team counter-punishes.
                      </p>
                    </div>

                    <div className="pt-1.5 border-t border-zinc-800/80 flex items-center justify-between text-[7.5px] font-mono text-zinc-500">
                      <span>Status: Prototyping</span>
                      <span className="text-cyan-400 font-bold">Planned v1.8</span>
                    </div>
                  </div>

                  {/* CARD 3: ENDURANCE & TALLY */}
                  <div className="bg-gradient-to-br from-zinc-900/90 via-emerald-950/20 to-zinc-950 border border-emerald-500/40 rounded-2xl p-3 flex flex-col justify-between space-y-2 shadow-md">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                          <Activity className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[7.5px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.2 rounded uppercase">
                          Endurance
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-display font-black italic uppercase text-white">
                        Endurance & Tally
                      </h4>
                      <p className="text-[9px] sm:text-[10px] text-zinc-400 leading-relaxed">
                        Endless survival gauntlet. Fight escalating waves of AI opponents with persistent HP and posture attrition. Record your high-score tally on local leaderboard milestones!
                      </p>
                    </div>

                    <div className="pt-1.5 border-t border-zinc-800/80 flex items-center justify-between text-[7.5px] font-mono text-zinc-500">
                      <span>Status: Wave Scaling</span>
                      <span className="text-emerald-400 font-bold">Planned v1.8</span>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>

      {/* ============================================================== */}
      {/* 4. AI TOURNAMENT CHAMPIONSHIP LADDER & AFTERMATCH SYSTEM */}
      {/* ============================================================== */}
      <AnimatePresence>
        {showTournamentModal && (
          <TournamentLadderModal
            bracket={tournamentBracket}
            preMatchCountdown={preMatchCountdown}
            onStartPlayerMatch={handleStartPlayerTournamentMatch}
            onCloseTournament={handleAttemptCloseTournament}
            tournamentNotification={tournamentNotification}
            stats={stats}
            isPortrait={isPortrait}
            isMobileView={isMobileView}
            lastAftermatchData={lastAftermatchData}
            showAftermatchModal={showAftermatchModal}
            setShowAftermatchModal={setShowAftermatchModal}
          />
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* 5. TOURNAMENT FORFEIT WARNING MODAL */}
      {/* ============================================================== */}
      <AnimatePresence>
        {showForfeitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md p-4 flex items-center justify-center select-none"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-md bg-zinc-950 border-2 border-red-600/80 rounded-3xl p-5 shadow-2xl space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-700/80 flex items-center justify-center text-red-400 mx-auto">
                <AlertTriangle className="w-7 h-7 text-red-400" />
              </div>

              <div>
                <h3 className="text-lg font-display font-black italic uppercase text-white tracking-wide">
                  ABANDON TOURNAMENT ENTRY?
                </h3>
                <p className="text-xs font-mono text-zinc-300 mt-2 leading-relaxed bg-zinc-900/80 border border-zinc-800 p-3 rounded-xl">
                  Exiting will forfeit your tournament entry ($750 Cash lost) and reset all bracket progress.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={handleConfirmForfeit}
                  className="py-2.5 bg-red-600 hover:bg-red-500 text-white font-display font-black italic uppercase text-xs rounded-xl cursor-pointer shadow-lg transition"
                >
                  Confirm Forfeit & Exit
                </button>
                <button
                  onClick={() => setShowForfeitModal(false)}
                  className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-display font-black italic uppercase text-xs rounded-xl cursor-pointer transition"
                >
                  Stay in Tournament
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* 6. SINGLEPLAYER COMPREHENSIVE RULEBOOK MODAL */}
      {/* ============================================================== */}
      <RulebookModal
        isOpen={showRulebookModal}
        onClose={() => setShowRulebookModal(false)}
      />

      {/* FOOTER */}
      <div className="relative z-10 pt-1 border-t border-zinc-900 flex items-center justify-between text-[8px] font-mono text-zinc-500">
        <span>Singleplayer Neural Engine • Version {version}</span>
        <span>Local Offline Persistence Active</span>
      </div>

    </div>
  );
}
