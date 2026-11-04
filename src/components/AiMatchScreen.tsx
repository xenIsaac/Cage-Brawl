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
import { useResponsiveLayout } from '../utils/useResponsiveLayout';
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
  const { isPortrait, isLandscape, isMobile, isCompactLandscape } = useResponsiveLayout();

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

  // Dynamic Adaptive Viewport Padding - gives mobile full width while rail overlays smoothly
  const isNarrowScreen = typeof window !== 'undefined' && (window.innerWidth < 1024 || isCompactLandscape);

  const dynamicPaddingLeft = isNavHidden || isMobile || isNarrowScreen
    ? '0.75rem' // Clean slim padding on mobile/narrow - rail floats as overlay without squishing
    : isNavExpanded
      ? '16.5rem' // 264px when rail expands on desktop PC
      : '4.75rem'; // 76px when rail collapsed on desktop PC

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
      {/* 2. TOP GLOBAL PERSONA HEADER & EXIT BUTTON                     */}
      {/* ============================================================== */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-b-2 border-red-600 pb-2 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* PERSONA BADGE */}
          <div className="bg-red-600 text-black px-2.5 py-1 -skew-x-12 font-display font-black italic text-xs sm:text-sm tracking-wider shadow-[2px_2px_0px_#ffffff] shrink-0">
            SOLO // 01
          </div>

          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-display font-black italic uppercase text-white tracking-tighter -skew-x-12 truncate">
              SINGLEPLAYER • {modeSide === 'competitive' ? 'COMPETITIVE' : 'CASUAL'}
            </h1>
          </div>

          {/* MODE TOGGLE SLIDE */}
          <button
            onClick={handleToggleModeSide}
            className={`px-2.5 py-1 text-xs font-display font-black italic uppercase tracking-wider -skew-x-12 transition-all cursor-pointer ${
              modeSide === 'competitive'
                ? 'bg-amber-400 text-black shadow-[2px_2px_0px_#ffffff]'
                : 'bg-cyan-400 text-black shadow-[2px_2px_0px_#ffffff]'
            }`}
          >
            SWITCH TO {modeSide === 'competitive' ? 'CASUAL' : 'COMPETITIVE'}
          </button>
        </div>

        {/* PERSONA SUB-MODE SLIDE DECK */}
        <div className="flex items-center gap-1 sm:gap-1.5 -skew-x-12">
          {modeSide === 'competitive' ? (
            <>
              {[
                { id: 'ranked_ai', label: '01 // RANKED LADDER' },
                { id: 'tournament', label: '02 // 8-MAN TOURNEY' },
                { id: 'boss_raids', label: '03 // BOSS RAIDS' },
              ].map(tab => {
                const isActive = compSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      soundManager.playRollTick();
                      setCompSubTab(tab.id as any);
                    }}
                    className={`px-2 sm:px-3 py-1 text-[11px] sm:text-xs font-display font-black italic uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-white text-black shadow-[3px_3px_0px_#ef4444]'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </>
          ) : (
            <>
              {[
                { id: 'casual_1v1', label: '01 // 1V1 SPARRING' },
                { id: 'ai_vs_ai', label: '02 // AI VS AI SIM' },
                { id: 'upcoming', label: '03 // ARENAS' },
              ].map(tab => {
                const isActive = casualSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      soundManager.playRollTick();
                      setCasualSubTab(tab.id as any);
                    }}
                    className={`px-2 sm:px-3 py-1 text-[11px] sm:text-xs font-display font-black italic uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-cyan-400 text-black shadow-[3px_3px_0px_#ffffff]'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* CURRENCY & PERSONA RETURN / EXIT BUTTON */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Rulebook */}
          <button
            onClick={() => { soundManager.playRollTick(); setShowRulebookModal(true); }}
            className="px-2.5 py-1 bg-zinc-900 hover:bg-white text-amber-400 hover:text-black border border-amber-500/40 text-xs font-display font-black italic uppercase -skew-x-12 transition cursor-pointer shadow-[2px_2px_0px_#000000]"
            title="Single Player Rulebook"
          >
            RULES
          </button>

          {/* Quests Button */}
          {onOpenQuests && (
            <button
              onClick={() => { soundManager.playRollTick(); onOpenQuests(); }}
              className="px-2.5 py-1 bg-zinc-900 hover:bg-cyan-400 text-cyan-300 hover:text-black border border-cyan-500/40 text-xs font-display font-black italic uppercase -skew-x-12 transition cursor-pointer shadow-[2px_2px_0px_#000000]"
              title="Quests"
            >
              QUESTS
            </button>
          )}

          {/* Cash */}
          <div className="bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-xs font-mono font-bold text-emerald-400 -skew-x-12">
            ${stats.cash.toLocaleString()}
          </div>

          {/* PROMINENT PERSONA RETURN / EXIT BUTTON */}
          <button
            onClick={() => {
              soundManager.playRollTick();
              onBackToMenu();
            }}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 bg-red-600 hover:bg-white text-black font-display font-black italic uppercase tracking-wider text-xs sm:text-sm -skew-x-12 shadow-[3px_3px_0px_#ffffff] hover:shadow-[3px_3px_0px_#ef4444] transition-all duration-150 cursor-pointer active:scale-95 group shrink-0"
            title="Return to Main Menu"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-black group-hover:scale-110" />
            <span>RETURN // MENU</span>
          </button>
        </div>
      </div>

      <div className="relative z-10 flex-1 my-0.5 sm:my-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
        <div className="flex-1 min-w-0 min-h-0 pr-0.5 flex flex-col justify-between">
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
                className="flex flex-col justify-between"
              >
                {/* Hero Ranked Banner with Compact Landscape Split & Persona 5 Aesthetics */}
                <div className="bg-black border-2 border-red-600 p-2.5 sm:p-3 shadow-[4px_4px_0px_#ef4444] relative overflow-hidden flex flex-col justify-between -skew-x-1 my-auto">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/15 blur-2xl pointer-events-none" />
                  <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-amber-500/10 blur-xl pointer-events-none" />

                  {/* Header Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 border-b-2 border-red-600/60 pb-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-red-600 text-black border-2 border-white -skew-x-12 flex items-center justify-center font-black shadow-[2px_2px_0px_#000000]">
                        <Swords className="w-3.5 h-3.5 text-black" />
                      </div>
                      <div>
                        <span className="text-[8px] font-mono text-red-500 uppercase font-black tracking-widest block leading-none">
                          // COMPETITIVE LADDER
                        </span>
                        <h2 className="text-sm sm:text-base font-display font-black italic uppercase text-white tracking-tight leading-tight mt-0.5">
                          Ranked AI 1v1 Ladder
                        </h2>
                      </div>
                    </div>

                    <span className="text-[8px] font-mono font-black text-emerald-400 bg-black border border-emerald-400 px-2 py-0.5 -skew-x-12 uppercase shadow-[2px_2px_0px_#10b981]">
                      DEDICATED AI ELO
                    </span>
                  </div>

                  {/* Dynamic Adaptive Content: 2-Column in Landscape, Stacked in Portrait */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 my-2">
                    {/* LEFT COLUMN: Summary & Player Rank */}
                    <div className="space-y-1.5 flex flex-col justify-between">
                      <p className="text-[10px] sm:text-[11px] text-zinc-300 font-mono leading-relaxed bg-zinc-950/90 border border-zinc-800 p-2 -skew-x-1">
                        Climb offline rank divisions. Higher AI ELO matches smarter bots with reactive parries, whiff punishes & anti-parry feints.
                      </p>

                      <div className="bg-zinc-950 border border-zinc-700 p-2 -skew-x-2 shadow-[3px_3px_0px_#000000] flex items-center justify-between">
                        <div>
                          <span className="text-[8px] font-mono text-zinc-400 uppercase font-bold tracking-wider block">// YOUR AI RANK</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-sm sm:text-base">{rankInfo.icon}</span>
                            <span className="text-xs font-display font-black italic uppercase" style={{ color: rankInfo.color }}>
                              {rankInfo.tierName}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs sm:text-sm font-mono font-black text-amber-400 block">{currentAiElo} ELO</span>
                          <span className="text-[7.5px] font-mono text-zinc-400 uppercase tracking-wider">Division Rating</span>
                        </div>
                      </div>

                      {/* Format Specs */}
                      <div className="flex items-center gap-1 text-[8px] font-mono">
                        <span className="bg-black px-2 py-0.5 -skew-x-6 border border-zinc-700 text-zinc-200 font-bold shadow-[2px_2px_0px_#000000]">🥊 Best of 5 (3 KOs)</span>
                        <span className="bg-black px-2 py-0.5 -skew-x-6 border border-zinc-700 text-zinc-200 font-bold shadow-[2px_2px_0px_#000000]">⏱️ 3 Mins / Round</span>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Opponent Tier, Stakes & Direct Action Button */}
                    <div className="space-y-1.5 flex flex-col justify-between">
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="bg-zinc-950 border border-zinc-800 p-2 -skew-x-2 shadow-[2px_2px_0px_#000000]">
                          <span className="text-[8px] font-mono text-zinc-400 uppercase font-bold tracking-wider block">// MATCHED TIER</span>
                          <span className="text-xs font-display font-black italic uppercase block mt-0.5 truncate" style={{ color: rankedOpponentConfig.color }}>
                            {rankedOpponentConfig.label}
                          </span>
                          <span className="text-[7.5px] font-mono text-zinc-400 line-clamp-1 mt-0.5">
                            {rankedOpponentConfig.desc}
                          </span>
                        </div>

                        <div className="bg-zinc-950 border border-zinc-800 p-2 -skew-x-2 shadow-[2px_2px_0px_#000000]">
                          <span className="text-[8px] font-mono text-zinc-400 uppercase font-bold tracking-wider block">// STAKES & PURSE</span>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-xs font-mono font-black text-emerald-400">+${rankedOpponentConfig.cashReward}</span>
                            <span className="text-xs font-mono font-black text-amber-400">+{winPreview} ELO</span>
                          </div>
                          <span className="text-[7.5px] font-mono text-red-400 font-bold block mt-0.5">
                            Defeat: -{lossPreview.eloLoss} ELO
                          </span>
                        </div>
                      </div>

                      {/* Primary Enter Match Action Button */}
                      <button
                        onClick={() => {
                          soundManager.playKO?.();
                          handleStartRankedAiMatch();
                        }}
                        className="w-full py-2.5 sm:py-3 bg-red-600 hover:bg-white text-black font-display font-black italic uppercase text-xs sm:text-sm tracking-widest -skew-x-12 shadow-[4px_4px_0px_#ffffff] hover:shadow-[4px_4px_0px_#ef4444] transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer border-2 border-black mt-1 group shrink-0"
                      >
                        <Swords className="w-4 h-4 text-black group-hover:rotate-12 transition-transform" />
                        <span>ENTER RANKED 1V1 MATCH</span>
                        <span>▶▶</span>
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
                {/* Tournament 1 Octagon Knockout with Persona 5 Styling */}
                <div className="bg-black border-2 border-amber-500 p-2.5 sm:p-4 shadow-[6px_6px_0px_#f59e0b] relative overflow-hidden flex-1 flex flex-col justify-between -skew-x-1">
                  <div className="flex items-center justify-between border-b-2 border-amber-500/60 pb-2 sm:pb-3 flex-wrap gap-2 shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 bg-amber-500 text-black border-2 border-white -skew-x-12 flex items-center justify-center font-black shadow-[3px_3px_0px_#000000]">
                        <Trophy className="w-4 h-4 text-black" />
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-amber-500 uppercase font-black tracking-widest block leading-none">
                          // OCTAGON TOURNAMENT LADDER
                        </span>
                        <h3 className="text-base sm:text-lg md:text-xl font-display font-black italic uppercase text-white mt-0.5">
                          Tournament 1: Octagon Knockout
                        </h3>
                      </div>
                    </div>

                    <span className="text-[9px] font-mono font-black bg-black text-emerald-400 border-2 border-emerald-400 px-3 py-1 -skew-x-12 uppercase shadow-[2px_2px_0px_#10b981]">
                      9 Competitors (8 AI + 1 Player)
                    </span>
                  </div>

                  {/* Dynamic 2-Column Landscape Split */}
                  <div className="grid grid-cols-1 landscape:grid-cols-2 gap-2.5 sm:gap-3 my-auto py-1">
                    {/* Left Column: Description & Prizes */}
                    <div className="space-y-2 flex flex-col justify-between">
                      <p className="text-[11px] sm:text-xs text-zinc-300 font-mono leading-relaxed bg-zinc-950/90 border border-zinc-800 p-2.5 -skew-x-1">
                        Single-elimination championship bracket. Other AI matches simulate in real-time. Win all 3 rounds to take the full $1,000 Cash purse and 5 Roll Tickets!
                      </p>

                      {/* Rewards Row */}
                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        <div className="bg-zinc-950 p-2 -skew-x-3 border-2 border-zinc-800 shadow-[2px_2px_0px_#000000]">
                          <span className="text-[7.5px] font-mono text-zinc-400 uppercase block font-bold">Top 8 (Round 1)</span>
                          <span className="text-xs font-mono font-black text-amber-400">+$500 Cash</span>
                        </div>
                        <div className="bg-zinc-950 p-2 -skew-x-3 border-2 border-zinc-800 shadow-[2px_2px_0px_#000000]">
                          <span className="text-[7.5px] font-mono text-zinc-400 uppercase block font-bold">Top 4 (Round 2)</span>
                          <span className="text-xs font-mono font-black text-amber-400">+$750 Cash</span>
                        </div>
                        <div className="bg-zinc-950 p-2 -skew-x-3 border-2 border-amber-400 shadow-[3px_3px_0px_#f59e0b]">
                          <span className="text-[7.5px] font-mono text-emerald-400 uppercase font-black">1st (Champion)</span>
                          <span className="text-xs font-mono font-black text-emerald-400">+$1k + 5 Tickets</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Error/Status & Enter Button & Tournament 2 Teaser */}
                    <div className="space-y-2 flex flex-col justify-between">
                      {entryFeeErrorMsg && (
                        <div className="text-[9px] font-mono text-red-300 bg-red-950 border-2 border-red-600 p-2 -skew-x-3 shadow-[2px_2px_0px_#000000] flex items-center gap-1.5 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          <span>{entryFeeErrorMsg}</span>
                        </div>
                      )}

                      <button
                        onClick={handleEnterTournamentClick}
                        className="w-full py-3 sm:py-3.5 bg-amber-500 hover:bg-white text-black font-display font-black italic uppercase text-xs sm:text-sm md:text-base tracking-widest -skew-x-12 shadow-[5px_5px_0px_#ffffff] hover:shadow-[5px_5px_0px_#f59e0b] transition-all transform active:scale-95 border-2 border-black flex items-center justify-center gap-2 cursor-pointer group"
                      >
                        <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-black group-hover:rotate-12 transition-transform" />
                        <span>
                          {tournamentBracket.status === 'in_progress' && tournamentBracket.entryFeePaid
                            ? 'RESUME ACTIVE BRACKET'
                            : 'ENTER TOURNAMENT 1 ($750 CASH)'}
                        </span>
                      </button>

                      {/* Tournament 2 Teaser */}
                      <div className="bg-zinc-950 border-2 border-zinc-800 p-2 sm:p-2.5 -skew-x-3 shadow-[2px_2px_0px_#000000] flex items-center justify-between gap-2 text-xs text-zinc-400">
                        <div className="flex items-center gap-2 min-w-0">
                          <Award className="w-4 h-4 text-amber-500 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[10px] sm:text-xs font-display font-black italic uppercase text-zinc-200 block truncate">
                              Tournament 2: Grand Championship
                            </span>
                            <span className="text-[8px] font-mono text-zinc-400 truncate block">
                              Multi-bracket grand championship • Exclusive titles
                            </span>
                          </div>
                        </div>
                        <span className="text-[8px] font-mono font-black bg-black text-zinc-400 border border-zinc-700 px-2 py-0.5 -skew-x-12 uppercase shrink-0">
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
                <div className="bg-black border-2 border-rose-600 p-2.5 sm:p-4 shadow-[6px_6px_0px_#e11d48] relative overflow-hidden flex-1 flex flex-col justify-between -skew-x-1">
                  <div className="flex items-center justify-between border-b-2 border-rose-600/60 pb-2 sm:pb-3 shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 bg-rose-600 text-black border-2 border-white -skew-x-12 flex items-center justify-center font-black shadow-[3px_3px_0px_#000000]">
                        <Skull className="w-4 h-4 text-black" />
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-rose-500 uppercase font-black tracking-widest block leading-none">
                          // MYTHICAL BOSS CHAMBER
                        </span>
                        <h3 className="text-base sm:text-lg md:text-xl font-display font-black italic uppercase text-white mt-0.5">
                          VS AI Boss Raids
                        </h3>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono font-black bg-black text-rose-400 border-2 border-rose-500 px-3 py-1 -skew-x-12 uppercase shadow-[2px_2px_0px_#e11d48]">
                      <Lock className="w-2.5 h-2.5 inline mr-1" /> Upcoming Mode
                    </span>
                  </div>

                  <p className="text-[11px] sm:text-xs text-zinc-300 font-mono my-1 leading-relaxed bg-zinc-950/90 border border-zinc-800 p-2.5 -skew-x-1">
                    Challenge colossal AI Titans imbued with custom kinetic auras, massive posture armor thresholds, and multi-phase strike choreography.
                  </p>

                  <div className="grid grid-cols-1 landscape:grid-cols-2 gap-2.5 sm:gap-3 my-auto py-1">
                    <div className="bg-zinc-950 border-2 border-rose-900/80 p-2.5 sm:p-3 -skew-x-3 shadow-[3px_3px_0px_#000000] space-y-1">
                      <span className="text-[9px] font-mono font-black text-rose-400 uppercase block">// BOSS 1: THE ASURA MONK</span>
                      <p className="text-[9.5px] sm:text-[10px] text-zinc-300 font-mono leading-normal">Master of Kyokushin armor & unrelenting full-contact strikes with 300 HP and unbreakable posture.</p>
                    </div>
                    <div className="bg-zinc-950 border-2 border-purple-900/80 p-2.5 sm:p-3 -skew-x-3 shadow-[3px_3px_0px_#000000] space-y-1">
                      <span className="text-[9px] font-mono font-black text-purple-400 uppercase block">// BOSS 2: PHANTOM OF KEYSI</span>
                      <p className="text-[9.5px] sm:text-[10px] text-zinc-300 font-mono leading-normal">Close-quarters shadow combatant featuring zero-startup pensador lunges and auto-parry feints.</p>
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
                className="flex flex-col justify-between"
              >
                <div className="bg-black border-2 border-cyan-500 p-2.5 sm:p-3 shadow-[4px_4px_0px_#06b6d4] relative overflow-hidden flex flex-col justify-between -skew-x-1 my-auto">
                  <div className="flex items-center justify-between border-b-2 border-cyan-500/60 pb-2 flex-wrap gap-1.5 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-cyan-400 text-black border-2 border-white -skew-x-12 flex items-center justify-center font-black shadow-[2px_2px_0px_#000000]">
                        <Swords className="w-3.5 h-3.5 text-black" />
                      </div>
                      <div>
                        <span className="text-[8px] font-mono text-cyan-400 uppercase font-black tracking-widest block leading-none">
                          // RISK-FREE SPARRING
                        </span>
                        <h2 className="text-sm sm:text-base font-display font-black italic uppercase text-white tracking-tight mt-0.5">
                          Custom Casual Sparring
                        </h2>
                      </div>
                    </div>
                    <span className="text-[8px] font-mono font-black text-cyan-300 bg-black border border-cyan-500 px-2 py-0.5 -skew-x-12 uppercase shadow-[2px_2px_0px_#06b6d4]">
                      NO ELO AT STAKE
                    </span>
                  </div>

                  {/* Dynamic 2-Column Landscape Split */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 my-2">
                    {/* Left Column: Description & Difficulty Selection */}
                    <div className="space-y-1.5 flex flex-col justify-between">
                      <p className="text-[10px] sm:text-[11px] text-zinc-300 font-mono leading-relaxed bg-zinc-950/90 border border-zinc-800 p-2 -skew-x-1">
                        Refine counter mechanics against your chosen AI difficulty tier in a full Best of 5 match. Opponent styles are randomized.
                      </p>

                      <div className="space-y-1">
                        <span className="text-[8px] font-mono font-black text-cyan-400 uppercase tracking-wider block">
                          // SELECT OPPONENT AI DIFFICULTY:
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
                              className={`p-1 sm:p-1.5 -skew-x-6 text-left border transition cursor-pointer flex flex-col justify-between ${
                                selectedCasualDifficulty === diff.id
                                  ? 'bg-cyan-400 text-black border-white shadow-[2px_2px_0px_#000000]'
                                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-[9px] sm:text-[10px] font-display font-black italic uppercase truncate ${
                                  selectedCasualDifficulty === diff.id ? 'text-black' : ''
                                }`} style={{ color: selectedCasualDifficulty === diff.id ? '#000000' : diff.color }}>
                                  {diff.label}
                                </span>
                                {selectedCasualDifficulty === diff.id && (
                                  <CheckCircle2 className="w-2.5 h-2.5 text-black shrink-0" />
                                )}
                              </div>
                              <span className={`text-[7px] font-mono mt-0.5 truncate block ${
                                selectedCasualDifficulty === diff.id ? 'text-zinc-900 font-bold' : 'text-zinc-500'
                              }`}>
                                {diff.desc}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Rewards & Start Match Button */}
                    <div className="space-y-1.5 flex flex-col justify-between">
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="bg-zinc-950 border border-zinc-800 p-2 -skew-x-2 shadow-[2px_2px_0px_#000000]">
                          <span className="text-[8px] font-mono text-zinc-400 uppercase font-bold tracking-wider block">// VICTORY REWARD</span>
                          <span className="text-xs font-mono font-black text-emerald-400 mt-0.5 block">+$120 Cash • +1 Roll</span>
                        </div>
                        <div className="bg-zinc-950 border border-zinc-800 p-2 -skew-x-2 shadow-[2px_2px_0px_#000000]">
                          <span className="text-[8px] font-mono text-zinc-400 uppercase font-bold tracking-wider block">// STYLE ROSTER</span>
                          <span className="text-xs font-mono font-bold text-zinc-200 mt-0.5 block">Randomized (10 Styles)</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          soundManager.playKO?.();
                          handleStartCasualAiMatch();
                        }}
                        className="w-full py-2.5 sm:py-3 bg-cyan-400 hover:bg-white text-black font-display font-black italic uppercase text-xs sm:text-sm tracking-widest -skew-x-12 shadow-[4px_4px_0px_#ffffff] hover:shadow-[4px_4px_0px_#06b6d4] transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer border-2 border-black mt-1 group shrink-0"
                      >
                        <Swords className="w-4 h-4 text-black group-hover:rotate-12 transition-transform" />
                        <span>START CASUAL SPARRING MATCH</span>
                        <span>▶▶</span>
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
                <div className="bg-black border-2 border-purple-500 p-2.5 sm:p-4 shadow-[6px_6px_0px_#a855f7] relative overflow-hidden flex-1 flex flex-col justify-between -skew-x-1">
                  <div className="flex items-center justify-between border-b-2 border-purple-500/60 pb-2 sm:pb-3 flex-wrap gap-2 shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 bg-purple-500 text-black border-2 border-white -skew-x-12 flex items-center justify-center font-black shadow-[3px_3px_0px_#000000]">
                        <Eye className="w-4 h-4 text-black" />
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-purple-400 uppercase font-black tracking-widest block leading-none">
                          // SPECTATOR ARENA
                        </span>
                        <h2 className="text-base sm:text-lg md:text-xl font-display font-black italic uppercase text-white tracking-tight mt-0.5">
                          AI vs AI Simulation Chamber
                        </h2>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono font-black text-purple-300 bg-black border-2 border-purple-500 px-3 py-1 -skew-x-12 uppercase shadow-[2px_2px_0px_#a855f7]">
                      SPECTATOR MODE
                    </span>
                  </div>

                  {/* DUAL BOT CONFIGURATION: 2 COLUMNS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 my-auto py-1">
                    {/* BOT ALPHA */}
                    <div className="bg-zinc-950 border-2 border-blue-500/80 p-2.5 -skew-x-3 shadow-[3px_3px_0px_#000000] space-y-1.5">
                      <div className="flex items-center justify-between text-[9px] font-mono font-black text-blue-400 uppercase">
                        <span>FIGHTER ALPHA (BLUE)</span>
                        <span className="text-zinc-300">{spectatorBot1Diff.toUpperCase()}</span>
                      </div>
                      <div className="flex gap-1 overflow-x-auto pb-0.5 custom-scrollbar">
                        {(['rookie', 'silver', 'gold', 'diamond', 'amethyst'] as AiDifficulty[]).map(d => (
                          <button
                            key={`b1_${d}`}
                            onClick={() => { soundManager.playRollTick(); setSpectatorBot1Diff(d); }}
                            className={`px-1.5 py-0.5 -skew-x-6 text-[7.5px] font-mono uppercase font-black transition cursor-pointer border ${
                              spectatorBot1Diff === d ? 'bg-blue-500 text-black border-white' : 'bg-black text-zinc-400 border-zinc-800 hover:text-white'
                            }`}
                          >
                            {d.toUpperCase()}
                          </button>
                        ))}
                      </div>
                      <select
                        value={spectatorBot1Style}
                        onChange={(e) => setSpectatorBot1Style(e.target.value)}
                        className="w-full bg-black border-2 border-zinc-700 text-zinc-200 text-[11px] p-1 font-mono focus:outline-none -skew-x-2"
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
                    <div className="bg-zinc-950 border-2 border-red-500/80 p-2.5 -skew-x-3 shadow-[3px_3px_0px_#000000] space-y-1.5">
                      <div className="flex items-center justify-between text-[9px] font-mono font-black text-red-400 uppercase">
                        <span>FIGHTER BETA (RED)</span>
                        <span className="text-zinc-300">{spectatorBot2Diff.toUpperCase()}</span>
                      </div>
                      <div className="flex gap-1 overflow-x-auto pb-0.5 custom-scrollbar">
                        {(['rookie', 'silver', 'gold', 'diamond', 'amethyst'] as AiDifficulty[]).map(d => (
                          <button
                            key={`b2_${d}`}
                            onClick={() => { soundManager.playRollTick(); setSpectatorBot2Diff(d); }}
                            className={`px-1.5 py-0.5 -skew-x-6 text-[7.5px] font-mono uppercase font-black transition cursor-pointer border ${
                              spectatorBot2Diff === d ? 'bg-red-500 text-black border-white' : 'bg-black text-zinc-400 border-zinc-800 hover:text-white'
                            }`}
                          >
                            {d.toUpperCase()}
                          </button>
                        ))}
                      </div>
                      <select
                        value={spectatorBot2Style}
                        onChange={(e) => setSpectatorBot2Style(e.target.value)}
                        className="w-full bg-black border-2 border-zinc-700 text-zinc-200 text-[11px] p-1 font-mono focus:outline-none -skew-x-2"
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
                    className="w-full py-3 sm:py-3.5 bg-purple-500 hover:bg-white text-black font-display font-black italic uppercase text-xs sm:text-sm md:text-base tracking-widest -skew-x-12 shadow-[5px_5px_0px_#ffffff] hover:shadow-[5px_5px_0px_#a855f7] transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer border-2 border-black mt-1 group"
                  >
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-black group-hover:scale-110 transition-transform" />
                    <span>LAUNCH AI VS AI SIMULATION</span>
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
                <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm sm:text-base font-display font-black italic uppercase text-white">
                      // UPCOMING CASUAL COMBAT MODES
                    </h3>
                  </div>
                  <span className="text-[9px] font-mono font-black text-emerald-400 bg-black border-2 border-emerald-400 px-3 py-0.5 -skew-x-12 uppercase shadow-[2px_2px_0px_#10b981]">
                    ROADMAP
                  </span>
                </div>

                {/* 3 UPCOMING CARDS: In landscape 3 columns, in portrait stacked */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-auto py-1">
                  
                  {/* CARD 1: HOT POTATO */}
                  <div className="bg-black border-2 border-orange-500 -skew-x-3 p-3 flex flex-col justify-between space-y-2 shadow-[4px_4px_0px_#f97316]">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="w-7 h-7 bg-orange-500 text-black border border-white -skew-x-12 flex items-center justify-center font-black">
                          <FlameKindling className="w-3.5 h-3.5 text-black" />
                        </div>
                        <span className="text-[8px] font-mono font-black bg-orange-500 text-black px-1.5 py-0.5 -skew-x-12 uppercase">
                          HOT POTATO
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-display font-black italic uppercase text-white">
                        Hot Potato Tag
                      </h4>
                      <p className="text-[9px] sm:text-[10px] text-zinc-300 font-mono leading-relaxed">
                        A volatile kinetic orb passes between fighters on successful strike clashes and parries. When the timer hits 0, whoever holds the orb suffers an instant Posture Break explosion!
                      </p>
                    </div>

                    <div className="pt-1.5 border-t border-zinc-800 flex items-center justify-between text-[8px] font-mono text-zinc-400">
                      <span>Status: In Development</span>
                      <span className="text-orange-400 font-black">Planned v1.8</span>
                    </div>
                  </div>

                  {/* CARD 2: 2V2 TAG TEAM */}
                  <div className="bg-black border-2 border-cyan-500 -skew-x-3 p-3 flex flex-col justify-between space-y-2 shadow-[4px_4px_0px_#06b6d4]">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="w-7 h-7 bg-cyan-400 text-black border border-white -skew-x-12 flex items-center justify-center font-black">
                          <Users className="w-3.5 h-3.5 text-black" />
                        </div>
                        <span className="text-[8px] font-mono font-black bg-cyan-400 text-black px-1.5 py-0.5 -skew-x-12 uppercase">
                          DUO TAG
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-display font-black italic uppercase text-white">
                        2v2 AI Tag Team
                      </h4>
                      <p className="text-[9px] sm:text-[10px] text-zinc-300 font-mono leading-relaxed">
                        Pair up with an allied AI fighter to brawl against a rival duo. Perform corner tags, assist knockdowns, and synchronize devastating double-team counter-punishes.
                      </p>
                    </div>

                    <div className="pt-1.5 border-t border-zinc-800 flex items-center justify-between text-[8px] font-mono text-zinc-400">
                      <span>Status: Prototyping</span>
                      <span className="text-cyan-400 font-black">Planned v1.8</span>
                    </div>
                  </div>

                  {/* CARD 3: ENDURANCE & TALLY */}
                  <div className="bg-black border-2 border-emerald-500 -skew-x-3 p-3 flex flex-col justify-between space-y-2 shadow-[4px_4px_0px_#10b981]">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="w-7 h-7 bg-emerald-400 text-black border border-white -skew-x-12 flex items-center justify-center font-black">
                          <Activity className="w-3.5 h-3.5 text-black" />
                        </div>
                        <span className="text-[8px] font-mono font-black bg-emerald-400 text-black px-1.5 py-0.5 -skew-x-12 uppercase">
                          ENDURANCE
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-display font-black italic uppercase text-white">
                        Endurance & Tally
                      </h4>
                      <p className="text-[9px] sm:text-[10px] text-zinc-300 font-mono leading-relaxed">
                        Endless survival gauntlet. Fight escalating waves of AI opponents with persistent HP and posture attrition. Record your high-score tally on local leaderboard milestones!
                      </p>
                    </div>

                    <div className="pt-1.5 border-t border-zinc-800 flex items-center justify-between text-[8px] font-mono text-zinc-400">
                      <span>Status: Wave Scaling</span>
                      <span className="text-emerald-400 font-black">Planned v1.8</span>
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
            isMobileView={isMobile}
            lastAftermatchData={lastAftermatchData}
            showAftermatchModal={showAftermatchModal}
            setShowAftermatchModal={setShowAftermatchModal}
          />
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* 5. TOURNAMENT FORFEIT WARNING MODAL (PERSONA 5 STYLING) */}
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
              className="w-full max-w-md bg-black border-4 border-red-600 p-5 -skew-x-2 shadow-[8px_8px_0px_#ef4444] space-y-4 text-center"
            >
              <div className="w-12 h-12 bg-red-600 text-black border-2 border-white -skew-x-12 flex items-center justify-center font-black mx-auto shadow-[4px_4px_0px_#000000]">
                <AlertTriangle className="w-7 h-7 text-black" />
              </div>

              <div>
                <h3 className="text-xl font-display font-black italic uppercase text-white tracking-wider">
                  // ABANDON TOURNAMENT ENTRY?
                </h3>
                <p className="text-xs font-mono text-zinc-300 mt-2 leading-relaxed bg-zinc-950 border-2 border-zinc-800 p-3 -skew-x-3 shadow-[3px_3px_0px_#000000]">
                  Exiting will forfeit your tournament entry ($750 Cash lost) and reset all bracket progress.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleConfirmForfeit}
                  className="py-3 bg-red-600 hover:bg-white text-black font-display font-black italic uppercase text-xs tracking-wider -skew-x-12 border-2 border-black shadow-[4px_4px_0px_#ffffff] hover:shadow-[4px_4px_0px_#ef4444] cursor-pointer transition active:scale-95"
                >
                  Confirm Forfeit
                </button>
                <button
                  onClick={() => setShowForfeitModal(false)}
                  className="py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-display font-black italic uppercase text-xs tracking-wider -skew-x-12 border-2 border-zinc-600 shadow-[4px_4px_0px_#000000] cursor-pointer transition active:scale-95"
                >
                  Stay in Bracket
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
