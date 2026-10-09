import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Users, Settings, Play, X, 
  Search, Swords, Check, ChevronRight, AlertTriangle,
  Trophy, Lock, Shield, Sparkles, TrendingUp, Zap, HelpCircle, Flame,
  UserPlus, Crown, LogOut, RefreshCw, Layers, Target, Timer, Bomb, Award
} from 'lucide-react';
import { PlayerStats, GameSettings, UserSession, FightingStyle, MatchData, PartyData, PartyMember, WinningConditionType, GamemodeType } from '../types';
import { FIGHTING_STYLES } from '../data/styles';
import { soundManager } from './SoundManager';
import { getRankInfo, calculateWinEloGain, calculateLossEloLoss } from '../utils/elo';
import OnlinePlayerListModal from './OnlinePlayerListModal';
import { wsService } from '../services/websocket';
import QuestsAchievementsPanel from './QuestsAchievementsPanel';

interface MatchmakingScreenProps {
  stats: PlayerStats;
  updateStats: (updates: Partial<PlayerStats>) => void;
  settings: GameSettings;
  updateSettings: (updates: Partial<GameSettings>) => void;
  currentUser: UserSession;
  onBackToMenu: () => void;
  onStartMatch: (matchData?: MatchData) => void;
  onNavigateToRoll?: () => void;
  onOpenQuests?: () => void;
  initialMatchData?: any;
  isNavHidden?: boolean;
}

const OPPONENT_NAMES = [
  'chael_sonnen_goated',
  'brawl_master_99',
  'ruthless_striker',
  'sugar_fan_01',
  'alex_poatan_fan',
  'cage_beast',
  'fedor_reborn',
  'apex_predator'
];

const DIVISION_LADDER = [
  { name: 'Rookie', range: '100 - 500 ELO', tiers: 'I - V (100 ELO/tier)', winGain: '+30', lossRule: '0.60x Protected Floor', color: '#ef4444', icon: '🥊' },
  { name: 'Copper', range: '500 - 700 ELO', tiers: 'I - IV (60 ELO/tier)', winGain: '+20', lossRule: '0.60x Protected Floor', color: '#d97706', icon: '🛡️' },
  { name: 'Silver', range: '700 - 1000 ELO', tiers: 'I - III (100 ELO/tier)', winGain: '+20', lossRule: '0.60x Protected Floor', color: '#cbd5e1', icon: '⚔️' },
  { name: 'Gold', range: '1000 - 1600 ELO', tiers: 'S - SSS (200 ELO/tier)', winGain: '+10', lossRule: '0.60x Protected Floor', color: '#eab308', icon: '🏆' },
  { name: 'Diamond', range: '1600 - 1850 ELO', tiers: 'I - V (50-100 ELO/tier)', winGain: '+5', lossRule: 'Streak 4+ (1.10x) / Streak 6+ (0.60x)', color: '#38bdf8', icon: '💎' },
  { name: 'Amethyst', range: '1850 - 2000 ELO', tiers: 'Z - ZZZ (50 ELO/tier)', winGain: '+2', lossRule: 'Streak 4+ (1.10x) / Streak 6+ (0.60x)', color: '#a855f7', icon: '🔮' },
  { name: 'Obsidian', range: '2000+ ELO', tiers: 'Limitless Apex Tier', winGain: '+3', lossRule: 'High stakes ranked combat', color: '#c084fc', icon: '👑' },
];

const WINNING_CONDITIONS_DATA: {
  id: WinningConditionType;
  title: string;
  subtitle: string;
  eloBadge: string;
  eloBadgeColor: string;
  activeColorClass: string;
}[] = [
  {
    id: 'standard',
    title: 'STANDARD',
    subtitle: 'Best of 3 • 3.0 Min',
    eloBadge: 'Standard Elo Gain',
    eloBadgeColor: 'text-zinc-400 bg-zinc-900/80 border-zinc-800',
    activeColorClass: 'bg-red-950/70 border-red-500 shadow-md ring-1 ring-red-500',
  },
  {
    id: 'quick_match',
    title: 'QUICK MATCH',
    subtitle: 'Best of 2 • 1.3 Min',
    eloBadge: 'Reduced Elo Gain',
    eloBadgeColor: 'text-amber-400 bg-amber-950/60 border-amber-800/60',
    activeColorClass: 'bg-amber-950/70 border-amber-500 shadow-md ring-1 ring-amber-500',
  },
  {
    id: 'competitive',
    title: 'COMPETITIVE',
    subtitle: 'Best of 5 • 5.0 Min',
    eloBadge: 'Increased Elo Gain',
    eloBadgeColor: 'text-purple-400 bg-purple-950/60 border-purple-800/60',
    activeColorClass: 'bg-purple-950/70 border-purple-500 shadow-md ring-1 ring-purple-500',
  },
  {
    id: 'quick_competitive',
    title: 'QUICK COMP',
    subtitle: 'Best of 5 • 1.2 Min',
    eloBadge: 'Increased Elo Gain',
    eloBadgeColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-800/60',
    activeColorClass: 'bg-cyan-950/70 border-cyan-500 shadow-md ring-1 ring-cyan-500',
  },
];

const GAMEMODES_DATA: {
  id: GamemodeType;
  title: string;
  description: string;
  eloBadge: string;
  eloBadgeColor: string;
  category: string;
  icon: any;
  activeColorClass: string;
}[] = [
  {
    id: 'standard',
    title: 'STANDARD',
    description: 'No conditions, authentic MMA striking & knockouts.',
    eloBadge: 'Standard Elo gain',
    eloBadgeColor: 'text-zinc-400',
    category: 'AUTHENTIC MMA',
    icon: Swords,
    activeColorClass: 'bg-red-950/70 border-red-500 shadow-md ring-1 ring-red-500',
  },
  {
    id: 'sustain_attack',
    title: 'SUSTAIN ATTACK',
    description: '100% Negation, damage tallied (1 min). Highest damage wins.',
    eloBadge: 'Increased Elo gain',
    eloBadgeColor: 'text-emerald-400',
    category: 'ENDURANCE & TALLY',
    icon: Shield,
    activeColorClass: 'bg-amber-950/70 border-amber-500 shadow-md ring-1 ring-amber-500',
  },
  {
    id: 'hot_potato',
    title: 'HOT POTATO',
    description: 'Random holder, hit to pass (explodes in 20s, 1 min max).',
    eloBadge: 'Chaos Knockout Rule',
    eloBadgeColor: 'text-rose-400',
    category: 'EXPLOSIVE SURVIVAL',
    icon: Bomb,
    activeColorClass: 'bg-rose-950/70 border-rose-500 shadow-md ring-1 ring-rose-500',
  },
];

function resolveWinningConditionVote(voteCounts: Record<string, number>): WinningConditionType {
  const entries = Object.entries(voteCounts).filter(([_, count]) => count > 0);
  if (entries.length === 0) {
    const allConds: WinningConditionType[] = ['standard', 'quick_match', 'competitive', 'quick_competitive'];
    return allConds[Math.floor(Math.random() * allConds.length)];
  }
  let max = 0;
  entries.forEach(([_, count]) => { if (count > max) max = count; });
  const topChoices = entries.filter(([_, count]) => count === max).map(([id]) => id as WinningConditionType);
  return topChoices[Math.floor(Math.random() * topChoices.length)];
}

function resolveGamemodeVote(voteCounts: Record<string, number>, isRanked: boolean, queueType: string): GamemodeType {
  if (isRanked) return 'standard';
  if (queueType === '1v1_unranked_endurance') return 'sustain_attack';
  if (queueType === '1v1_unranked_explosive') return 'hot_potato';

  const entries = Object.entries(voteCounts).filter(([_, count]) => count > 0);
  if (entries.length === 0) {
    const availableModes: GamemodeType[] = ['standard', 'sustain_attack', 'hot_potato'];
    return availableModes[Math.floor(Math.random() * availableModes.length)];
  }
  let max = 0;
  entries.forEach(([_, count]) => { if (count > max) max = count; });
  const topChoices = entries.filter(([_, count]) => count === max).map(([id]) => id as GamemodeType);
  return topChoices[Math.floor(Math.random() * topChoices.length)];
}

export default function MatchmakingScreen({
  stats,
  updateStats,
  settings,
  updateSettings,
  currentUser,
  onBackToMenu,
  onStartMatch,
  onNavigateToRoll,
  onOpenQuests,
  initialMatchData,
  isNavHidden = false
}: MatchmakingScreenProps) {
  const [matchState, setMatchState] = useState<'idle' | 'searching' | 'matched_fighters' | 'pre_match_lobby'>(
    initialMatchData ? 'matched_fighters' : 'idle'
  );

  // Sub-tabs: competitive (Ranked 1v1), non_competitive (Unranked 1v1 / 2v2), party (Party Squads), elo_ladder
  const [activeSubTab, setActiveSubTab] = useState<'competitive' | 'non_competitive' | 'party' | 'elo_ladder'>('competitive');
  const [nonCompMode, setNonCompMode] = useState<'1v1_classic' | '1v1_endurance' | '1v1_explosive' | '2v2'>('1v1_classic');
  const [queueType, setQueueType] = useState<'1v1_ranked' | '1v1_unranked' | '1v1_unranked_endurance' | '1v1_unranked_explosive' | '2v2_unranked'>('1v1_ranked');
  const [infoModalMode, setInfoModalMode] = useState<'1v1_classic' | '1v1_endurance' | '1v1_explosive' | '2v2' | 'general' | null>(null);

  const [queueTime, setQueueTime] = useState(0);
  const [ping, setPing] = useState(28);
  const [showPlayerList, setShowPlayerList] = useState(false);
  
  const [isRealMatch, setIsRealMatch] = useState(initialMatchData ? true : false);
  const [onlineCount, setOnlineCount] = useState(1);
  const [searchTimeoutReached, setSearchTimeoutReached] = useState(false);
  const [simulatePvPBot, setSimulatePvPBot] = useState(false);
  const simTimerRef = useRef<any>(null);
  const [matchId, setMatchId] = useState<string | null>(initialMatchData?.matchId || null);
  const [isPlayer1, setIsPlayer1] = useState(initialMatchData?.isPlayer1 ?? true);
  const [is2v2, setIs2v2] = useState(false);
  const [lobbyNotification, setLobbyNotification] = useState<string | null>(null);

  // Forfeit & Ban system state
  const [forfeitCount, setForfeitCount] = useState<number>(() => {
    const saved = localStorage.getItem('mma_consecutive_forfeits');
    return saved ? Number(saved) : 0;
  });
  const [banUntil, setBanUntil] = useState<number>(() => {
    const saved = localStorage.getItem('mma_matchmaking_ban_until');
    return saved ? Number(saved) : 0;
  });
  const [banSecondsRemaining, setBanSecondsRemaining] = useState<number>(0);
  const lastMatchmakingAttemptRef = useRef<number>(Date.now());

  // Party state
  const [party, setParty] = useState<PartyData | null>(null);

  // Single opponent (1v1) or 2v2 player list
  const [opponent, setOpponent] = useState<{
    name: string;
    level: number;
    heightInInches: number;
    style: FightingStyle;
    elo: number;
    ping: number;
  } | null>(initialMatchData?.opponent || null);

  const [allMatchPlayers, setAllMatchPlayers] = useState<any[]>([]);

  // Map selection (Octagon Arena)
  const [selectedMapId, setSelectedMapId] = useState<'octagon'>('octagon');

  // NEW: Winning Conditions & Gamemodes
  const [selectedWinningCondition, setSelectedWinningCondition] = useState<WinningConditionType>('standard');
  const [selectedGamemode, setSelectedGamemode] = useState<GamemodeType>('standard');
  const [conditionVoteCounts, setConditionVoteCounts] = useState<Record<string, number>>({ standard: 1 });
  const [gamemodeVoteCounts, setGamemodeVoteCounts] = useState<Record<string, number>>({ standard: 1 });

  // READY & Countdown States (1v1 & 2v2)
  const [isMyReady, setIsMyReady] = useState(false);
  const [isOppReady, setIsOppReady] = useState(false);
  const [readyPlayers, setReadyPlayers] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);

  const activeStyle = FIGHTING_STYLES.find(s => s.id === stats.selectedStyleId) || FIGHTING_STYLES[0];
  const myUsername = currentUser.fighterName || currentUser.username || currentUser.email.split('@')[0];
  const playerRank = getRankInfo(stats.elo ?? 0);
  const winGain = calculateWinEloGain(stats.elo ?? 0);
  const lossPreview = calculateLossEloLoss(stats.elo ?? 0, stats.lossStreak ?? 0);

  // Ban countdown and 30s inactivity strike reset timer
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      
      // Calculate remaining ban seconds
      if (banUntil > now) {
        setBanSecondsRemaining(Math.ceil((banUntil - now) / 1000));
      } else {
        if (banSecondsRemaining > 0) {
          setBanSecondsRemaining(0);
          setBanUntil(0);
          localStorage.removeItem('mma_matchmaking_ban_until');
        }
      }

      // Reset forfeit strikes if user has not attempted matchmaking for 30s while idle
      if (matchState === 'idle' && forfeitCount > 0) {
        if (now - lastMatchmakingAttemptRef.current >= 30000) {
          setForfeitCount(0);
          localStorage.setItem('mma_consecutive_forfeits', '0');
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [banUntil, banSecondsRemaining, matchState, forfeitCount]);

  // Sync initialMatchData prop whenever App passes a newly accepted 1v1 match
  useEffect(() => {
    if (initialMatchData) {
      setIsRealMatch(true);
      setMatchId(initialMatchData.matchId || null);
      setIsPlayer1(initialMatchData.isPlayer1 ?? true);
      setIs2v2(!!initialMatchData.is2v2);
      if (initialMatchData.opponent) {
        setOpponent({
          name: initialMatchData.opponent.name,
          level: initialMatchData.opponent.level,
          heightInInches: initialMatchData.opponent.heightInInches,
          style: initialMatchData.opponent.style,
          elo: initialMatchData.opponent.elo,
          ping: initialMatchData.opponent.ping || 20
        });
      }
      soundManager.playKO();
      setMatchState('matched_fighters');
      wsService.send('leave_queue');
    }
  }, [initialMatchData]);

  // Initialize and listen to WS
  useEffect(() => {
    wsService.connect(currentUser, stats);

    const unsubscribe = wsService.addListener((type, data) => {
      if (type === 'queue_status') {
        setOnlineCount(data.count || 1);
      } else if (type === 'party_updated') {
        setParty(data.party || null);
      } else if (type === 'party_disbanded') {
        setParty(null);
      } else if (type === 'match_found') {
        setIsRealMatch(true);
        setMatchId(data.matchId);
        setIsPlayer1(data.isPlayer1);
        setIs2v2(!!data.is2v2);
        
        if (data.opponent) {
          setOpponent({
            name: data.opponent.name,
            level: data.opponent.level,
            heightInInches: data.opponent.heightInInches,
            style: data.opponent.style,
            elo: data.opponent.elo,
            ping: data.opponent.ping || 24
          });
        }
        if (data.players) {
          setAllMatchPlayers(data.players);
        }

        if (data.matchType) {
          setQueueType(data.matchType);
        }

        // Dedicated gamemode sync
        if (data.matchType === '1v1_unranked_endurance') {
          setSelectedGamemode('sustain_attack');
        } else if (data.matchType === '1v1_unranked_explosive') {
          setSelectedGamemode('hot_potato');
        } else if (data.gamemode) {
          setSelectedGamemode(data.gamemode);
        } else {
          setSelectedGamemode('standard');
        }
        
        soundManager.playKO();
        setMatchState('matched_fighters');
        setConditionVoteCounts({});
        setGamemodeVoteCounts({});
      } else if (type === 'room_map_voted') {
        if (data.mapId) setSelectedMapId(data.mapId);
      } else if (type === 'room_winning_condition_voted') {
        if (data.conditionVoteCounts) setConditionVoteCounts(data.conditionVoteCounts);
      } else if (type === 'room_gamemode_voted') {
        if (data.gamemodeVoteCounts) setGamemodeVoteCounts(data.gamemodeVoteCounts);
      } else if (type === 'room_ready_status') {
        if (data.is2v2) {
          setReadyPlayers(data.readyPlayers || []);
          setIsMyReady((data.readyPlayers || []).includes(myUsername));
        } else {
          if (isPlayer1) {
            setIsMyReady(!!data.p1Ready);
            setIsOppReady(!!data.p2Ready);
          } else {
            setIsMyReady(!!data.p2Ready);
            setIsOppReady(!!data.p1Ready);
          }
        }
      } else if (type === 'match_start_countdown') {
        setCountdown(data.seconds);
        if (data.winningCondition) setSelectedWinningCondition(data.winningCondition);
        if (data.gamemode) setSelectedGamemode(data.gamemode);
        if (data.seconds === 0) {
          handleLaunchFinalMatch(data.winningCondition, data.gamemode);
        }
      } else if (type === 'opponent_surrendered') {
        setLobbyNotification('Opponent forfeited or left the lobby!');
        setTimeout(() => {
          setLobbyNotification(null);
          setMatchState('idle');
          setCountdown(null);
          setIsMyReady(false);
          setIsOppReady(false);
        }, 2500);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser, stats, isPlayer1]);

  // Countdown timer effect
  useEffect(() => {
    let timer: any;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdown === 0) {
      handleLaunchFinalMatch();
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Searching queue timer
  useEffect(() => {
    let interval: any;
    if (matchState === 'searching') {
      interval = setInterval(() => {
        setQueueTime(prev => {
          const next = prev + 1;
          if (next >= 10 && !searchTimeoutReached) {
            setSearchTimeoutReached(true);
          }
          return next;
        });
        setPing(Math.floor(Math.random() * 8) + 24);
      }, 1000);
    } else {
      setQueueTime(0);
      setSearchTimeoutReached(false);
    }
    return () => clearInterval(interval);
  }, [matchState, searchTimeoutReached]);

  const handleStartSearch = (qType: '1v1_ranked' | '1v1_unranked' | '1v1_unranked_endurance' | '1v1_unranked_explosive' | '2v2_unranked' = '1v1_ranked') => {
    if (banSecondsRemaining > 0) {
      soundManager.playRollTick();
      setLobbyNotification(`Matchmaking suspended for ${banSecondsRemaining}s due to 3 consecutive forfeits.`);
      setTimeout(() => setLobbyNotification(null), 3000);
      return;
    }

    lastMatchmakingAttemptRef.current = Date.now();
    soundManager.playRollTick();
    setQueueType(qType);

    if (qType === '1v1_unranked_endurance') {
      setSelectedGamemode('sustain_attack');
    } else if (qType === '1v1_unranked_explosive') {
      setSelectedGamemode('hot_potato');
    } else {
      setSelectedGamemode('standard');
    }

    setMatchState('searching');
    
    if (simulatePvPBot) {
      if (simTimerRef.current) clearTimeout(simTimerRef.current);
      simTimerRef.current = setTimeout(() => {
        const OPP_NAMES = ['Kurogane_AI', 'Iron_Lotus', 'Viper_Protocol', 'Shadow_Striker', 'Titan_Brawler'];
        const randomOpponentName = OPP_NAMES[Math.floor(Math.random() * OPP_NAMES.length)] + " [MOCK_PVP]";
        const activeStyles = FIGHTING_STYLES.filter(s => s.reworkStatus !== 'undergoing_rework' && s.reworkStatus !== 'undergoing_development');
        const randomStyle = activeStyles[Math.floor(Math.random() * activeStyles.length)] || FIGHTING_STYLES[0];
        const botElo = Math.max(100, (stats.elo ?? 100) + Math.floor(Math.random() * 60) - 30);
        
        setIsRealMatch(true);
        setMatchId("mock_match_id_" + Math.floor(Math.random() * 100000));
        setIsPlayer1(true);
        setIs2v2(qType === '2v2_unranked');
        
        setOpponent({
          name: randomOpponentName,
          level: Math.floor(Math.random() * 15) + 10,
          heightInInches: Math.floor(Math.random() * 14) + 64,
          style: randomStyle,
          elo: botElo,
          ping: Math.floor(Math.random() * 12) + 15
        });
        
        soundManager.playKO();
        setMatchState('matched_fighters');
      }, 1500);
    } else {
      wsService.send(`join_queue_${qType}` as any, { 
        queueType: qType, 
        elo: stats.elo ?? 0
      });
    }
  };

  const handleCancelSearch = () => {
    lastMatchmakingAttemptRef.current = Date.now();
    soundManager.playRollTick();
    if (simTimerRef.current) {
      clearTimeout(simTimerRef.current);
      simTimerRef.current = null;
    }
    wsService.send('leave_queue');
    setMatchState('idle');
  };

  const triggerBotMatch = (is2v2Bot = false) => {
    if (banSecondsRemaining > 0) return;
    lastMatchmakingAttemptRef.current = Date.now();
    soundManager.playRollTick();
    const randomOpponentName = OPPONENT_NAMES[Math.floor(Math.random() * OPPONENT_NAMES.length)];
    const activeStyles = FIGHTING_STYLES.filter(s => s.reworkStatus !== 'undergoing_rework' && s.reworkStatus !== 'undergoing_development');
    const randomStyle = activeStyles[Math.floor(Math.random() * activeStyles.length)] || FIGHTING_STYLES[0];
    const botElo = Math.max(100, (stats.elo ?? 100) + Math.floor(Math.random() * 60) - 30);
    
    setIsRealMatch(false);
    setIs2v2(is2v2Bot);
    setOpponent({
      name: randomOpponentName,
      level: Math.floor(Math.random() * 10) + 1,
      heightInInches: Math.floor(Math.random() * 14) + 64,
      style: randomStyle,
      elo: botElo,
      ping: Math.floor(Math.random() * 12) + 15
    });

    setMatchState('matched_fighters');
  };

  const handleVoteCondition = (conditionId: WinningConditionType) => {
    setSelectedWinningCondition(conditionId);
    setConditionVoteCounts(prev => {
      const updated = { ...prev };
      if (updated[selectedWinningCondition] && updated[selectedWinningCondition] > 0) {
        updated[selectedWinningCondition] -= 1;
        if (updated[selectedWinningCondition] <= 0) {
          delete updated[selectedWinningCondition];
        }
      }
      updated[conditionId] = (updated[conditionId] || 0) + 1;
      return updated;
    });

    if (isRealMatch && !matchId?.startsWith('mock_match_id_')) {
      wsService.send('vote_winning_condition', { condition: conditionId });
    } else {
      setTimeout(() => {
        const allConds: WinningConditionType[] = ['standard', 'quick_match', 'competitive', 'quick_competitive'];
        const botChoice = Math.random() < 0.5 ? conditionId : allConds[Math.floor(Math.random() * allConds.length)];
        setConditionVoteCounts(prev => ({
          ...prev,
          [botChoice]: (prev[botChoice] || 0) + 1
        }));
      }, 400);
    }
    soundManager.playRollTick();
  };

  const handleVoteGamemode = (modeId: GamemodeType) => {
    if (queueType === '1v1_ranked') return;
    setSelectedGamemode(modeId);
    setGamemodeVoteCounts(prev => {
      const updated = { ...prev };
      if (updated[selectedGamemode] && updated[selectedGamemode] > 0) {
        updated[selectedGamemode] -= 1;
        if (updated[selectedGamemode] <= 0) {
          delete updated[selectedGamemode];
        }
      }
      updated[modeId] = (updated[modeId] || 0) + 1;
      return updated;
    });

    if (isRealMatch && !matchId?.startsWith('mock_match_id_')) {
      wsService.send('vote_gamemode', { gamemode: modeId });
    } else {
      setTimeout(() => {
        const unrankedModes: GamemodeType[] = ['standard', 'sustain_attack', 'hot_potato'];
        const botChoice = Math.random() < 0.5 ? modeId : unrankedModes[Math.floor(Math.random() * unrankedModes.length)];
        setGamemodeVoteCounts(prev => ({
          ...prev,
          [botChoice]: (prev[botChoice] || 0) + 1
        }));
      }, 400);
    }
    soundManager.playRollTick();
  };

  const handleToggleReady = () => {
    soundManager.playRollTick();
    const newReady = !isMyReady;
    setIsMyReady(newReady);

    if (isRealMatch && !matchId?.startsWith('mock_match_id_')) {
      wsService.send('ready_toggle', { ready: newReady });
    } else {
      if (newReady) {
        setTimeout(() => {
          setIsOppReady(true);
          setCountdown(3);
        }, 800);
      } else {
        setIsOppReady(false);
        setCountdown(null);
      }
    }
  };

  const handleForfeitMatch = () => {
    soundManager.playRollTick();
    lastMatchmakingAttemptRef.current = Date.now();

    const isRanked = queueType === '1v1_ranked';
    let eloLoss = 0;
    if (isRanked) {
      const currentLossStreak = (stats.lossStreak || 0) + 1;
      const calc = calculateLossEloLoss(stats.elo ?? 0, currentLossStreak, false);
      eloLoss = calc.eloLoss;
      const nextElo = Math.max(0, (stats.elo ?? 0) - eloLoss);
      updateStats({ elo: nextElo, lossStreak: currentLossStreak });
    }

    // Track consecutive forfeits (3 consecutive forfeits triggers 30s ban)
    const newForfeitCount = forfeitCount + 1;
    if (newForfeitCount >= 3) {
      const newBanUntil = Date.now() + 30000;
      setBanUntil(newBanUntil);
      setBanSecondsRemaining(30);
      localStorage.setItem('mma_matchmaking_ban_until', String(newBanUntil));
      setForfeitCount(0);
      localStorage.setItem('mma_consecutive_forfeits', '0');
      setLobbyNotification(
        isRanked
          ? `⚠️ 3 FORFEITS REACHED! Matchmaking temporarily banned for 30s. -${eloLoss} ELO.`
          : `⚠️ 3 FORFEITS REACHED! Matchmaking temporarily banned for 30s. (Unranked - 0 ELO lost).`
      );
    } else {
      setForfeitCount(newForfeitCount);
      localStorage.setItem('mma_consecutive_forfeits', String(newForfeitCount));
      setLobbyNotification(
        isRanked
          ? `⚠️ MATCH FORFEITED: -${eloLoss} ELO (Strike ${newForfeitCount}/3 - 3 forfeits causes a 30s ban).`
          : `⚠️ MATCH FORFEITED (UNRANKED - 0 ELO lost): Strike ${newForfeitCount}/3 (3 forfeits causes a 30s ban).`
      );
    }

    if (isRealMatch) {
      wsService.send('surrender');
    }
    setMatchState('idle');
    setCountdown(null);
    setIsMyReady(false);
    setIsOppReady(false);

    onBackToMenu();

    setTimeout(() => {
      setLobbyNotification(null);
    }, 4000);
  };

  const handleLaunchFinalMatch = (serverCondition?: WinningConditionType, serverGamemode?: GamemodeType) => {
    if (!opponent) return;
    soundManager.playUpgradeHeight();
    
    // Reset forfeit strikes upon successfully entering and fighting
    setForfeitCount(0);
    localStorage.setItem('mma_consecutive_forfeits', '0');
    lastMatchmakingAttemptRef.current = Date.now();

    const finalCondition = serverCondition || resolveWinningConditionVote(conditionVoteCounts);
    const finalGamemode = (queueType === '1v1_ranked')
      ? 'standard'
      : (serverGamemode || resolveGamemodeVote(gamemodeVoteCounts, queueType === '1v1_ranked', queueType));

    const targetScoreMap: Record<WinningConditionType, number> = {
      standard: 3,
      quick_match: 2,
      competitive: 5,
      quick_competitive: 5
    };

    const roundTimeMap: Record<WinningConditionType, number> = {
      standard: 180,
      quick_match: 80,
      competitive: 300,
      quick_competitive: 72
    };

    let eloModifier: 'reduced' | 'standard' | 'increased' = 'standard';
    if (finalCondition === 'quick_match') {
      eloModifier = 'reduced';
    } else if (
      finalCondition === 'competitive' ||
      finalCondition === 'quick_competitive' ||
      finalGamemode === 'sustain_attack'
    ) {
      eloModifier = 'increased';
    }

    const finalRoundTimeLimit = (finalGamemode === 'sustain_attack' || finalGamemode === 'hot_potato')
      ? 60 
      : roundTimeMap[finalCondition];
    
    const isMockPvP = matchId && matchId.startsWith('mock_match_id_');
    let mockSocket: any = null;
    
    if (isMockPvP) {
      let messageHandler: any = null;
      mockSocket = {
        readyState: 1, // WebSocket.OPEN
        send: (msg: string) => {
          console.log('[MockSocket] Sent message:', msg);
          try {
            const parsed = JSON.parse(msg);
            if (parsed.type === 'vote_rematch') {
              setTimeout(() => {
                if (messageHandler) {
                  messageHandler({
                    data: JSON.stringify({
                      type: 'room_rematch_status',
                      p1Rematch: true,
                      p2Rematch: true
                    })
                  });
                  
                  setTimeout(() => {
                    messageHandler({
                      data: JSON.stringify({
                        type: 'room_rematch_started'
                      })
                    });
                  }, 1000);
                }
              }, 1000);
            }
          } catch (e) {
            console.error(e);
          }
        },
        addEventListener: (type: string, handler: any) => {
          if (type === 'message') messageHandler = handler;
        },
        removeEventListener: (type: string, handler: any) => {
          if (type === 'message') messageHandler = null;
        }
      };
    }
    
    onStartMatch({
      isCompetitive: queueType === '1v1_ranked',
      mapId: selectedMapId,
      mapName: 'Octagon Arena',
      modeId: finalGamemode,
      modeName: finalGamemode === 'sustain_attack' 
        ? 'Sustain Attack' 
        : (finalGamemode === 'hot_potato' ? 'Hot Potato' : 'Standard Combat'),
      winningCondition: finalCondition,
      gamemode: finalGamemode,
      targetScore: targetScoreMap[finalCondition],
      roundTimeLimit: finalRoundTimeLimit,
      eloModifier,
      opponent,
      isRealMatch,
      is2v2,
      socket: isMockPvP ? mockSocket : (isRealMatch ? wsService.getRawSocket() : null),
      matchId,
      isPlayer1
    });
  };

  const handleCreateParty = () => {
    soundManager.playRollTick();
    wsService.send('create_party');
  };

  const handleLeaveParty = () => {
    soundManager.playRollTick();
    wsService.send('leave_party');
    setParty(null);
  };

  const getHeightLabel = (inches: number) => {
    const feet = Math.floor(inches / 12);
    const remInches = inches % 12;
    return `${feet}'${remInches}" (${inches}")`;
  };

  return (
    <div id="matchmaking-screen" className={`w-full h-screen max-h-[100dvh] bg-zinc-950 text-white flex flex-col justify-between p-2.5 sm:p-5 landscape:p-2 landscape:py-1 ${isNavHidden ? 'pl-2.5 sm:pl-5' : 'pl-14 sm:pl-20'} font-sans relative overflow-hidden select-none`}>
      
      {/* BACKGROUND DECORATIVE GRID */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:32px_32px] opacity-20 pointer-events-none" />

      {/* TOP HEADER */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 sm:gap-3 border-b border-zinc-900 pb-2 sm:pb-3 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-2xl font-display font-black italic uppercase tracking-wider text-white flex items-center gap-1.5 sm:gap-2">
                <Swords className="w-4 h-4 sm:w-6 sm:h-6 text-red-500" />
                Online Match
              </h1>
              <span className="text-[7px] sm:text-[9px] font-mono font-bold uppercase bg-red-950/80 text-red-400 border border-red-800/60 px-1.5 sm:px-2 py-0.5 rounded-full">
                Live PvP
              </span>
            </div>
            <p className="text-[8px] sm:text-[11px] font-mono text-zinc-400 hidden xs:block">
              Global PvP Arena & Ranked Competitive League
            </p>
          </div>
        </div>

        {/* RANK BADGE, ELO & CASH */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="bg-zinc-900/90 border border-zinc-800 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl flex items-center gap-1.5 sm:gap-2 shadow-sm">
            <span className="text-xs sm:text-base">{playerRank.icon}</span>
            <div className="text-right">
              <span className="text-[7px] sm:text-[8px] font-mono text-zinc-400 uppercase block leading-none">PvP Division</span>
              <span className="text-[9px] sm:text-xs font-display font-black italic uppercase" style={{ color: playerRank.color }}>
                {playerRank.name}
              </span>
            </div>
            <div className="hidden sm:block pl-2 border-l border-zinc-800 text-left">
              <span className="text-[7px] sm:text-[8px] font-mono text-zinc-500 block leading-none">ELO</span>
              <span className="text-xs font-mono font-bold text-yellow-400">{stats.elo ?? 0}</span>
            </div>
          </div>

          <button
            onClick={() => { onBackToMenu(); soundManager.playRollTick(); }}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 rounded-xl transition text-xs font-mono font-bold uppercase cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Menu</span>
          </button>

          <div className="bg-zinc-900/90 border border-amber-500/30 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl flex items-center gap-1 sm:gap-1.5 shadow-sm">
            <span className="text-amber-400 font-mono font-bold text-xs sm:text-sm">$</span>
            <span className="font-mono font-bold text-xs sm:text-sm text-white">{stats.cash.toLocaleString()}</span>
          </div>

          <button
            onClick={() => { setShowPlayerList(true); soundManager.playRollTick(); }}
            className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-2 bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-emerald-500/30 rounded-xl transition text-[8px] sm:text-[10px] font-mono font-bold uppercase cursor-pointer shadow-sm"
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
            <span className="hidden md:inline">ONLINE ({onlineCount})</span>
          </button>
        </div>
      </div>

      {/* TEMPORARY BAN / LOBBY NOTIFICATION BANNER */}
      {banSecondsRemaining > 0 && (
        <div className="relative z-20 mx-auto max-w-xl w-full bg-red-950/95 border-2 border-red-500 p-2.5 sm:p-3 rounded-2xl flex items-center justify-between gap-3 text-left animate-pulse shadow-[0_0_25px_rgba(239,68,68,0.35)] my-1">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <div className="font-display font-black italic text-xs uppercase text-white">
                MATCHMAKING TEMPORARILY SUSPENDED
              </div>
              <div className="text-[9px] font-mono text-red-200">
                You forfeited 3 consecutive matches. Access restored in {banSecondsRemaining}s.
              </div>
            </div>
          </div>
          <div className="text-right font-mono font-black text-sm text-red-400 px-3 py-1 bg-red-900/80 rounded-xl border border-red-600">
            {banSecondsRemaining}s
          </div>
        </div>
      )}

      {lobbyNotification && (
        <div className="relative z-20 mx-auto max-w-xl w-full bg-zinc-900/95 border border-amber-500/60 text-amber-300 px-3 py-2 rounded-xl text-xs font-mono text-center shadow-lg my-1 flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{lobbyNotification}</span>
        </div>
      )}

      {/* SUB-TAB NAVIGATION SWITCHER */}
      {matchState === 'idle' && (
        <div className="relative z-10 my-1.5 sm:my-3 flex justify-center">
          <div className="inline-flex items-center bg-zinc-900/90 border border-zinc-800 p-0.5 sm:p-1 rounded-2xl gap-0.5 sm:gap-1 font-mono text-xs shadow-xl max-w-full overflow-x-auto">
            <button
              onClick={() => { setActiveSubTab('competitive'); soundManager.playRollTick(); }}
              className={`px-2.5 sm:px-4 py-1.5 rounded-xl transition flex items-center gap-1 sm:gap-1.5 cursor-pointer font-bold uppercase tracking-wider text-[9px] sm:text-xs whitespace-nowrap ${
                activeSubTab === 'competitive'
                  ? 'bg-gradient-to-r from-red-600 to-red-800 text-white shadow-lg'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Swords className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-400" />
              <span>Ranked PvP</span>
            </button>

            <button
              onClick={() => { setActiveSubTab('non_competitive'); soundManager.playRollTick(); }}
              className={`px-2.5 sm:px-4 py-1.5 rounded-xl transition flex items-center gap-1 sm:gap-1.5 cursor-pointer font-bold uppercase tracking-wider text-[9px] sm:text-xs whitespace-nowrap ${
                activeSubTab === 'non_competitive'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-800 text-white shadow-lg'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400" />
              <span>Unranked PvP</span>
            </button>

            <button
              onClick={() => { setActiveSubTab('party'); soundManager.playRollTick(); }}
              className={`px-2.5 sm:px-4 py-1.5 rounded-xl transition flex items-center gap-1 sm:gap-1.5 cursor-pointer font-bold uppercase tracking-wider text-[9px] sm:text-xs whitespace-nowrap ${
                activeSubTab === 'party'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-800 text-white shadow-lg'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-400" />
              <span>Party Squad {party ? `(${party.members.length}/4)` : ''}</span>
            </button>

            <button
              onClick={() => { setActiveSubTab('elo_ladder'); soundManager.playRollTick(); }}
              className={`px-2.5 sm:px-4 py-1.5 rounded-xl transition flex items-center gap-1 sm:gap-1.5 cursor-pointer font-bold uppercase tracking-wider text-[9px] sm:text-xs whitespace-nowrap ${
                activeSubTab === 'elo_ladder'
                  ? 'bg-gradient-to-r from-yellow-600 to-amber-800 text-white shadow-lg'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-400" />
              <span className="hidden sm:inline">ELO Ladder</span>
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="relative z-10 flex-1 my-1 sm:my-3 landscape:my-1 flex flex-col justify-center min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">

          {/* SUB-VIEW 1: COMPETITIVE (RANKED PVP) */}
          {matchState === 'idle' && activeSubTab === 'competitive' && (
            <motion.div
              key="state-competitive"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-xl landscape:max-w-4xl mx-auto w-full h-full flex flex-col justify-center overflow-y-auto pr-1 custom-scrollbar overscroll-contain"
            >
              <div className="landscape:grid landscape:grid-cols-2 landscape:gap-4 landscape:items-center space-y-3 sm:space-y-4 landscape:space-y-0">
                <div className="text-center landscape:text-left space-y-2">
                  <div className="inline-flex items-center gap-2 bg-red-950/60 border border-red-800/40 px-3 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[9px] font-mono font-bold text-red-400 uppercase tracking-widest">
                    <Swords className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-400" />
                    RANKED PVP • 1V1 COMPETITIVE
                  </div>

                  <h1 className="text-xl sm:text-3xl landscape:text-2xl font-display font-black italic uppercase text-white tracking-wider leading-none">
                    OCTAGON RANKED CLASH
                  </h1>

                  <p className="text-[10px] sm:text-xs text-zinc-400 font-mono leading-relaxed">
                    Stake your ELO against live players or sparring bots in real-time synced striking matches.
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-zinc-900/80 border border-zinc-800 p-2 rounded-xl text-left">
                      <span className="text-[8px] font-mono text-zinc-500 uppercase block">POTENTIAL REWARD</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">+{winGain} ELO GAIN</span>
                    </div>
                    <div className="bg-zinc-900/80 border border-zinc-800 p-2 rounded-xl text-left">
                      <span className="text-[8px] font-mono text-zinc-500 uppercase block">MAX RISK PENALTY</span>
                      <span className="text-xs font-mono font-bold text-red-400">-{lossPreview.eloLoss} ELO LOSS</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Simulation Toggle */}
                  <div className="bg-zinc-950/85 border border-zinc-800/80 p-3 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex-1 text-left">
                      <div className="text-[9px] font-display font-black italic uppercase text-red-500 tracking-wider">
                        DEVELOPER TEST MODE
                      </div>
                      <div className="text-[10px] font-mono text-white font-bold leading-tight mt-0.5">
                        Simulate PvP Bot (Silent)
                      </div>
                      <p className="text-[8px] sm:text-[9px] text-zinc-500 font-mono leading-normal mt-0.5">
                        Matches you with a silent bot in a fake online match to easily test post-match screens.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSimulatePvPBot(prev => !prev);
                        soundManager.playRollTick();
                      }}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        simulatePvPBot ? 'bg-red-600' : 'bg-zinc-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          simulatePvPBot ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <button
                    onClick={() => handleStartSearch('1v1_ranked')}
                    className="w-full py-3 sm:py-4 bg-red-600 hover:bg-red-500 active:scale-98 transition-all font-display font-black italic uppercase text-sm sm:text-base text-white tracking-widest rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer border border-red-400 animate-pulse hover:animate-none"
                  >
                    <Search className="w-4 h-4" />
                    FIND RANKED 1V1 OPPONENT
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* SUB-VIEW 2: CASUAL OCTAGON BRAWLS (UNRANKED 1V1 & 2V2) */}
          {matchState === 'idle' && activeSubTab === 'non_competitive' && (
            <motion.div
              key="state-non-comp"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-3xl landscape:max-w-5xl mx-auto w-full h-full flex flex-col justify-between overflow-y-auto pr-1 space-y-2 sm:space-y-3 custom-scrollbar overscroll-contain"
            >
              {/* Header with info button */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 bg-cyan-950/60 border border-cyan-800/40 px-2.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
                    <Layers className="w-3 h-3 text-cyan-400" />
                    UNRANKED PVP • 0 ELO STAKES
                  </div>
                  <h2 className="text-base sm:text-2xl font-display font-black italic uppercase text-white leading-tight mt-0.5">
                    CASUAL OCTAGON BRAWLS
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setInfoModalMode('general');
                    soundManager.playRollTick();
                  }}
                  className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-cyan-500/40 hover:border-cyan-400 text-cyan-400 rounded-xl flex items-center gap-1.5 text-[9px] sm:text-xs font-mono font-bold uppercase transition cursor-pointer shadow-sm"
                  title="View Unranked Rules & Info"
                >
                  <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
                  <span>RULES & INFO</span>
                </button>
              </div>

              {/* Mode switch pills: 4 distinct casual modes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 w-full">
                <button
                  onClick={() => { setNonCompMode('1v1_classic'); soundManager.playRollTick(); }}
                  className={`py-1.5 sm:py-2 px-2 rounded-xl font-display font-black italic uppercase text-[9px] sm:text-xs tracking-wider border transition cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 truncate ${
                    nonCompMode === '1v1_classic' ? 'bg-cyan-600 text-white border-cyan-400 shadow-md' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Swords className="w-3 h-3 shrink-0" />
                  <span className="truncate">Classic 1v1</span>
                </button>

                <button
                  onClick={() => { setNonCompMode('1v1_endurance'); soundManager.playRollTick(); }}
                  className={`py-1.5 sm:py-2 px-2 rounded-xl font-display font-black italic uppercase text-[9px] sm:text-xs tracking-wider border transition cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 truncate ${
                    nonCompMode === '1v1_endurance' ? 'bg-amber-600 text-white border-amber-400 shadow-md' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Shield className="w-3 h-3 shrink-0" />
                  <span className="truncate">Endurance & Tally</span>
                </button>

                <button
                  onClick={() => { setNonCompMode('1v1_explosive'); soundManager.playRollTick(); }}
                  className={`py-1.5 sm:py-2 px-2 rounded-xl font-display font-black italic uppercase text-[9px] sm:text-xs tracking-wider border transition cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 truncate ${
                    nonCompMode === '1v1_explosive' ? 'bg-rose-600 text-white border-rose-400 shadow-md' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Bomb className="w-3 h-3 shrink-0" />
                  <span className="truncate">Explosive 1v1</span>
                </button>

                <button
                  onClick={() => { setNonCompMode('2v2'); soundManager.playRollTick(); }}
                  className={`py-1.5 sm:py-2 px-2 rounded-xl font-display font-black italic uppercase text-[9px] sm:text-xs tracking-wider border transition cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 truncate ${
                    nonCompMode === '2v2' ? 'bg-purple-600 text-white border-purple-400 shadow-md' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3 h-3 shrink-0" />
                  <span className="truncate">Unranked 2v2</span>
                </button>
              </div>

              {/* Dynamic Mode Card */}
              {nonCompMode === '1v1_classic' && (
                <div className="bg-zinc-900/90 border border-zinc-800 p-3 sm:p-4 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-black italic uppercase text-sm sm:text-base text-cyan-400">
                          Classic Unranked 1v1 Duel
                        </h3>
                        <span className="px-2 py-0.5 bg-cyan-950 border border-cyan-800 text-cyan-400 font-mono font-bold text-[8px] sm:text-[9px] rounded">
                          0 ELO • CASUAL
                        </span>
                      </div>
                      <p className="text-[9px] sm:text-xs text-zinc-400 font-mono mt-0.5">
                        Standard striking rules. No ELO loss on forfeit (30s ban after 3 strikes).
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setInfoModalMode('1v1_classic')}
                      className="p-1.5 sm:p-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-cyan-500 text-zinc-400 hover:text-cyan-400 rounded-xl transition cursor-pointer shrink-0"
                      title="View Classic 1v1 Details"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-zinc-950 border border-cyan-500/40 p-2 sm:p-2.5 rounded-xl flex items-center gap-2">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-cyan-600 flex items-center justify-center font-bold text-xs shrink-0">
                        P1
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white uppercase truncate">{myUsername} (You)</div>
                        <div className="text-[8px] font-mono text-emerald-400 font-bold">READY (HOST)</div>
                      </div>
                    </div>

                    <div className="bg-zinc-950/50 border border-dashed border-zinc-800 p-2 sm:p-2.5 rounded-xl flex items-center gap-2 text-zinc-500">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-mono text-xs shrink-0">
                        ?
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-mono uppercase truncate">Slot 2 Open</div>
                        <div className="text-[8px] font-mono text-zinc-600">Waiting for fighter...</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-0.5">
                    <button
                      onClick={() => handleStartSearch('1v1_unranked')}
                      className="w-full py-2.5 sm:py-3 bg-cyan-600 hover:bg-cyan-500 active:scale-98 transition font-display font-black italic uppercase text-xs sm:text-sm text-white rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer border border-cyan-400"
                    >
                      <Search className="w-4 h-4" />
                      QUEUE CLASSIC UNRANKED 1V1
                    </button>
                  </div>
                </div>
              )}

              {nonCompMode === '1v1_endurance' && (
                <div className="bg-zinc-900/90 border border-amber-500/40 p-3 sm:p-4 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-black italic uppercase text-sm sm:text-base text-amber-400">
                          Endurance & Tally 1v1 (Dedicated)
                        </h3>
                        <span className="px-2 py-0.5 bg-amber-950 border border-amber-800 text-amber-400 font-mono font-bold text-[8px] sm:text-[9px] rounded">
                          100% DAMAGE NEGATION
                        </span>
                      </div>
                      <p className="text-[9px] sm:text-xs text-zinc-400 font-mono mt-0.5">
                        No knockouts! Damage tallied over 60 seconds. Highest total damage wins.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setInfoModalMode('1v1_endurance')}
                      className="p-1.5 sm:p-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500 text-zinc-400 hover:text-amber-400 rounded-xl transition cursor-pointer shrink-0"
                      title="View Endurance & Tally Details"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="bg-zinc-950 border border-zinc-800 p-2 rounded-xl text-left">
                      <span className="text-[7px] sm:text-[8px] font-mono text-zinc-500 uppercase block">DAMAGE NEGATION</span>
                      <span className="text-[11px] sm:text-xs font-mono font-bold text-emerald-400">100% (No KO)</span>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 p-2 rounded-xl text-left">
                      <span className="text-[7px] sm:text-[8px] font-mono text-zinc-500 uppercase block">WIN CONDITION</span>
                      <span className="text-[11px] sm:text-xs font-mono font-bold text-amber-400">Highest Tally (60s)</span>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 p-2 rounded-xl text-left col-span-2 sm:col-span-1">
                      <span className="text-[7px] sm:text-[8px] font-mono text-zinc-500 uppercase block">VOTING RULE</span>
                      <span className="text-[11px] sm:text-xs font-mono font-bold text-cyan-400">Winning Cond. Only</span>
                    </div>
                  </div>

                  <div className="pt-0.5">
                    <button
                      onClick={() => handleStartSearch('1v1_unranked_endurance')}
                      className="w-full py-2.5 sm:py-3 bg-amber-600 hover:bg-amber-500 active:scale-98 transition font-display font-black italic uppercase text-xs sm:text-sm text-white rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer border border-amber-400"
                    >
                      <Search className="w-4 h-4" />
                      QUEUE ENDURANCE & TALLY 1V1
                    </button>
                  </div>
                </div>
              )}

              {nonCompMode === '1v1_explosive' && (
                <div className="bg-zinc-900/90 border border-rose-500/40 p-3 sm:p-4 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-black italic uppercase text-sm sm:text-base text-rose-400">
                          Explosive Survival 1v1 (Dedicated)
                        </h3>
                        <span className="px-2 py-0.5 bg-rose-950 border border-rose-800 text-rose-400 font-mono font-bold text-[8px] sm:text-[9px] rounded">
                          HOT POTATO BOMB
                        </span>
                      </div>
                      <p className="text-[9px] sm:text-xs text-zinc-400 font-mono mt-0.5">
                        Hit opponent to pass the ticking bomb! 20s fuse explosion eliminates the holder.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setInfoModalMode('1v1_explosive')}
                      className="p-1.5 sm:p-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-rose-500 text-zinc-400 hover:text-rose-400 rounded-xl transition cursor-pointer shrink-0"
                      title="View Explosive Survival Details"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="bg-zinc-950 border border-zinc-800 p-2 rounded-xl text-left">
                      <span className="text-[7px] sm:text-[8px] font-mono text-zinc-500 uppercase block">BOMB MECHANIC</span>
                      <span className="text-[11px] sm:text-xs font-mono font-bold text-rose-400">Hit To Pass</span>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 p-2 rounded-xl text-left">
                      <span className="text-[7px] sm:text-[8px] font-mono text-zinc-500 uppercase block">FUSE TIMER</span>
                      <span className="text-[11px] sm:text-xs font-mono font-bold text-amber-400">20s Explosion</span>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 p-2 rounded-xl text-left col-span-2 sm:col-span-1">
                      <span className="text-[7px] sm:text-[8px] font-mono text-zinc-500 uppercase block">VOTING RULE</span>
                      <span className="text-[11px] sm:text-xs font-mono font-bold text-cyan-400">Winning Cond. Only</span>
                    </div>
                  </div>

                  <div className="pt-0.5">
                    <button
                      onClick={() => handleStartSearch('1v1_unranked_explosive')}
                      className="w-full py-2.5 sm:py-3 bg-rose-600 hover:bg-rose-500 active:scale-98 transition font-display font-black italic uppercase text-xs sm:text-sm text-white rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer border border-rose-400"
                    >
                      <Search className="w-4 h-4" />
                      QUEUE EXPLOSIVE SURVIVAL 1V1
                    </button>
                  </div>
                </div>
              )}

              {nonCompMode === '2v2' && (
                <div className="bg-zinc-900/90 border border-purple-500/40 p-3 sm:p-4 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-black italic uppercase text-sm sm:text-base text-purple-400">
                          Unranked 2v2 Tag-Team
                        </h3>
                        <span className="px-2.5 py-0.5 bg-purple-950 border border-purple-800 text-purple-400 font-mono font-bold text-xs rounded-lg">
                          1 / 4 PLAYERS
                        </span>
                      </div>
                      <p className="text-[9px] sm:text-xs text-zinc-400 font-mono mt-0.5">
                        Team striking chaos! All 4 fighters must ready up before the match begins.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setInfoModalMode('2v2')}
                      className="p-1.5 sm:p-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-purple-500 text-zinc-400 hover:text-purple-400 rounded-xl transition cursor-pointer shrink-0"
                      title="View 2v2 Details"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 4 Player Slots */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="bg-zinc-950 border border-blue-500/50 p-2 rounded-xl text-center">
                      <div className="text-[7px] font-mono font-bold text-blue-400 uppercase">BLUE TEAM (P1)</div>
                      <div className="text-xs font-bold text-white truncate mt-0.5">{myUsername}</div>
                      <div className="text-[8px] font-mono text-emerald-400 font-bold mt-1">✓ READY</div>
                    </div>

                    <div className="bg-zinc-950/60 border border-dashed border-blue-900/60 p-2 rounded-xl text-center text-zinc-500">
                      <div className="text-[7px] font-mono font-bold text-blue-400/60 uppercase">BLUE TEAM (P2)</div>
                      <div className="text-xs font-mono truncate mt-0.5">Ally Slot</div>
                      <div className="text-[8px] font-mono text-zinc-600 mt-1">Waiting...</div>
                    </div>

                    <div className="bg-zinc-950/60 border border-dashed border-red-900/60 p-2 rounded-xl text-center text-zinc-500">
                      <div className="text-[7px] font-mono font-bold text-red-400/60 uppercase">RED TEAM (P3)</div>
                      <div className="text-xs font-mono truncate mt-0.5">Enemy Slot 1</div>
                      <div className="text-[8px] font-mono text-zinc-600 mt-1">Waiting...</div>
                    </div>

                    <div className="bg-zinc-950/60 border border-dashed border-red-900/60 p-2 rounded-xl text-center text-zinc-500">
                      <div className="text-[7px] font-mono font-bold text-red-400/60 uppercase">RED TEAM (P4)</div>
                      <div className="text-xs font-mono truncate mt-0.5">Enemy Slot 2</div>
                      <div className="text-[8px] font-mono text-zinc-600 mt-1">Waiting...</div>
                    </div>
                  </div>

                  <div className="pt-0.5">
                    <button
                      onClick={() => handleStartSearch('2v2_unranked')}
                      className="w-full py-2.5 sm:py-3 bg-purple-600 hover:bg-purple-500 active:scale-98 transition font-display font-black italic uppercase text-xs sm:text-sm text-white rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer border border-purple-400"
                    >
                      <Search className="w-4 h-4" />
                      QUEUE UNRANKED 2V2
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* SUB-VIEW 3: PARTY SYSTEM (1.7 SQUAD FEATURE) */}
          {matchState === 'idle' && activeSubTab === 'party' && (
            <motion.div
              key="state-party"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-2xl landscape:max-w-4xl mx-auto w-full h-full flex flex-col justify-center overflow-y-auto pr-1 space-y-3 custom-scrollbar overscroll-contain"
            >
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-2 bg-purple-950/60 border border-purple-800/40 px-3 py-1 rounded-full text-[8px] sm:text-[9px] font-mono font-bold text-purple-400 uppercase tracking-widest">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  PARTY LOBBY SQUAD SYSTEM (1.7)
                </div>
                <h2 className="text-lg sm:text-2xl font-display font-black italic uppercase text-white">
                  FORM YOUR 4-PLAYER STRIKE SQUAD
                </h2>
              </div>

              {/* Party Guidance Banner */}
              <div className="bg-purple-950/30 border border-purple-800/40 p-3 rounded-2xl text-center space-y-1">
                <p className="text-xs sm:text-sm font-mono text-purple-300 font-bold">
                  💡 If there&apos;s only 1 you can inform them to 1v1, If there&apos;s 3 then you can get them to 2v2! Max parties are 4.
                </p>
                <p className="text-[10px] text-zinc-400 font-mono">
                  Invite online fighters from the Online List to group up before matchmaking.
                </p>
              </div>

              {/* Party Member Grid */}
              <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-xs font-mono font-bold text-zinc-400 uppercase">
                    Squad Roster: {party ? party.members.length : 1} / 4
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowPlayerList(true)}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold text-[10px] uppercase rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <UserPlus className="w-3 h-3" />
                      INVITE ONLINE PLAYERS
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Local player */}
                  <div className="bg-zinc-950 border border-purple-500/50 p-3 rounded-xl text-center space-y-1">
                    <Crown className="w-4 h-4 text-yellow-400 mx-auto" />
                    <div className="font-bold text-xs text-white uppercase truncate">{myUsername} (Host)</div>
                    <div className="text-[8px] font-mono text-purple-400">ELO {stats.elo ?? 0}</div>
                  </div>

                  {/* Other members */}
                  {[1, 2, 3].map(idx => {
                    const member = party?.members[idx];
                    if (member) {
                      return (
                        <div key={idx} className="bg-zinc-950 border border-zinc-700 p-3 rounded-xl text-center space-y-1">
                          <Users className="w-4 h-4 text-purple-400 mx-auto" />
                          <div className="font-bold text-xs text-white uppercase truncate">{member.username}</div>
                          <div className="text-[8px] font-mono text-purple-400">LV.{member.level} • {member.elo} ELO</div>
                        </div>
                      );
                    }
                    return (
                      <div key={idx} className="bg-zinc-950/40 border border-dashed border-zinc-800 p-3 rounded-xl text-center flex flex-col items-center justify-center text-zinc-600 space-y-1">
                        <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-mono text-[10px]">
                          +
                        </div>
                        <span className="text-[9px] font-mono">Empty Slot</span>
                      </div>
                    );
                  })}
                </div>

                {/* Quick actions based on party count */}
                <div className="pt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleStartSearch('1v1_unranked')}
                    className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 font-display font-black italic uppercase text-xs text-white rounded-xl shadow-lg transition cursor-pointer border border-cyan-400 text-center"
                  >
                    START 1V1 MATCH
                  </button>

                  <button
                    onClick={() => handleStartSearch('2v2_unranked')}
                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 font-display font-black italic uppercase text-xs text-white rounded-xl shadow-lg transition cursor-pointer border border-purple-400 text-center"
                  >
                    START 2V2 MATCH
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* SUB-VIEW 4: ELO LADDER */}
          {matchState === 'idle' && activeSubTab === 'elo_ladder' && (
            <motion.div
              key="state-elo"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-3xl mx-auto w-full h-full flex flex-col justify-center overflow-y-auto pr-1 space-y-2 custom-scrollbar overscroll-contain"
            >
              <div className="text-center space-y-0.5">
                <span className="text-[8px] sm:text-[9px] font-mono text-yellow-500 uppercase tracking-widest font-bold block">
                  OFFICIAL COMPETITIVE LEADERBOARD DIVISIONS
                </span>
                <h2 className="text-base sm:text-xl font-display font-black italic uppercase text-white leading-tight">
                  ELO PROGRESSION TIER MATRIX
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 overflow-y-auto max-h-[60vh] pr-1 custom-scrollbar overscroll-contain">
                {DIVISION_LADDER.map((div, i) => (
                  <div key={i} className="bg-zinc-900/80 border border-zinc-800 p-2 sm:p-2.5 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{div.icon}</span>
                      <div>
                        <div className="font-display font-black italic text-xs uppercase" style={{ color: div.color }}>
                          {div.name}
                        </div>
                        <div className="text-[8px] font-mono text-zinc-500">{div.range}</div>
                      </div>
                    </div>
                    <div className="text-right font-mono text-[9px]">
                      <div className="text-emerald-400 font-bold">{div.winGain} W</div>
                      <div className="text-zinc-500 text-[7px]">{div.tiers}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* STATE 2: SEARCHING FOR OPPONENT / TEAM MATES */}
          {matchState === 'searching' && (
            <motion.div
              key="state-searching"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md mx-auto w-full text-center space-y-4"
            >
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-red-500/20 animate-ping" />
                <div className="w-full h-full rounded-full border-4 border-red-500 border-t-transparent animate-spin flex items-center justify-center bg-zinc-900/80 shadow-2xl">
                  <Search className="w-8 h-8 text-red-500" />
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono text-red-400 uppercase tracking-widest font-bold block animate-pulse">
                  SCANNING GLOBAL OCTAGON LOBBY...
                </span>
                <h2 className="text-xl sm:text-2xl font-display font-black italic uppercase text-white mt-1">
                  MATCH SEARCHING ({queueTime}s)
                </h2>
                <p className="text-[10px] font-mono text-zinc-500 mt-1">
                  Queue Mode: {queueType.toUpperCase()} • Ping: {ping}ms
                </p>
              </div>

              <button
                onClick={handleCancelSearch}
                className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-red-400 font-mono font-bold text-xs uppercase rounded-xl transition cursor-pointer"
              >
                CANCEL QUEUE
              </button>
            </motion.div>
          )}

          {/* STATE 3: MATCH FOUND UI WITH DYNAMIC SCALING (PORTRAIT & LANDSCAPE OPTIMIZED) */}
          {matchState === 'matched_fighters' && opponent && (
            <motion.div
              key="state-match-found"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="max-w-4xl mx-auto w-full h-full flex flex-col justify-center min-h-0 overflow-y-auto pr-1 space-y-3"
              style={{ scrollbarWidth: 'thin' }}
            >
              {/* Header Badge */}
              <div className="text-center space-y-0.5">
                <span className="text-[9px] sm:text-[10px] font-mono font-black text-emerald-400 uppercase tracking-widest block animate-pulse">
                  ✓ COMBAT OPPONENT LOCKED IN
                </span>
                <h2 className="text-xl sm:text-3xl font-display font-black italic uppercase text-white tracking-wider leading-none">
                  MATCH FOUND • OCTAGON SHOWDOWN
                </h2>
              </div>

              {/* DYNAMIC SCALING CLASH CARDS (PORTRAIT: STACKED, LANDSCAPE: SIDE-BY-SIDE) */}
              <div className="grid grid-cols-1 landscape:grid-cols-2 gap-2 sm:gap-4 items-center">
                {/* YOUR FIGHTER CARD */}
                <div className="bg-zinc-900/95 border-2 border-blue-500 p-3 sm:p-4 rounded-2xl shadow-[0_0_25px_rgba(59,130,246,0.25)] flex items-center gap-3">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-zinc-950 border border-blue-400 flex items-center justify-center font-display font-black text-xl text-blue-400 shrink-0">
                    YOU
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-black italic text-sm sm:text-base uppercase text-white truncate">
                        {myUsername}
                      </span>
                      <span className="text-[9px] font-mono font-bold text-blue-400 bg-blue-950 px-1.5 py-0.5 rounded border border-blue-800">
                        BLUE TEAM
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400 mt-1">
                      Style: <b className="text-white uppercase">{activeStyle.name}</b>
                    </div>
                    <div className="text-[9px] font-mono text-zinc-500">
                      Height: {getHeightLabel(stats.heightInInches)} • ELO: {stats.elo ?? 0}
                    </div>
                  </div>
                </div>

                {/* OPPONENT FIGHTER CARD */}
                <div className="bg-zinc-900/95 border-2 border-red-500 p-3 sm:p-4 rounded-2xl shadow-[0_0_25px_rgba(239,68,68,0.25)] flex items-center gap-3">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-zinc-950 border border-red-400 flex items-center justify-center font-display font-black text-xl text-red-400 shrink-0">
                    OPP
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-black italic text-sm sm:text-base uppercase text-white truncate">
                        @{opponent.name}
                      </span>
                      <span className="text-[9px] font-mono font-bold text-red-400 bg-red-950 px-1.5 py-0.5 rounded border border-red-800">
                        RED TEAM
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400 mt-1">
                      Style: <b className="text-white uppercase">{opponent.style.name}</b>
                    </div>
                    <div className="text-[9px] font-mono text-zinc-500">
                      Height: {getHeightLabel(opponent.heightInInches)} • ELO: {opponent.elo}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  onClick={() => setMatchState('pre_match_lobby')}
                  className="flex-1 py-3 sm:py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-98 transition-all font-display font-black italic uppercase text-xs sm:text-sm text-white tracking-widest rounded-xl shadow-xl flex items-center justify-center gap-2 cursor-pointer border border-emerald-400"
                >
                  <Check className="w-4 h-4" />
                  PROCEED TO READY LOBBY
                </button>

                <button
                  onClick={handleForfeitMatch}
                  className="py-3 sm:py-3.5 px-5 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-400 hover:text-white active:scale-98 transition-all font-display font-black italic uppercase text-xs sm:text-sm tracking-widest rounded-xl shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  FORFEIT MATCH {forfeitCount > 0 ? `(${forfeitCount}/3 STRIKES)` : ''}
                </button>
              </div>
            </motion.div>
          )}

          {/* STATE 4: REWORKED READYING UI WITH WINNING CONDITIONS & GAMEMODES */}
          {matchState === 'pre_match_lobby' && opponent && (
            <motion.div
              key="state-pre-match"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-3xl mx-auto w-full h-full flex-1 min-h-0 overflow-y-auto pr-1 space-y-2 sm:space-y-2.5 text-left custom-scrollbar"
              style={{ scrollbarWidth: 'thin' }}
            >
              {/* Header with info button */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[8px] sm:text-[10px] font-mono font-black text-yellow-500 uppercase tracking-widest block">
                    STAGE 2: COMBAT RULESET & READY FIGHT
                  </span>
                  <h2 className="text-sm sm:text-xl font-display font-black italic uppercase text-white leading-tight">
                    MATCH CONDITIONS & GAMEMODE
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (queueType === '1v1_unranked_endurance' || selectedGamemode === 'sustain_attack') {
                      setInfoModalMode('1v1_endurance');
                    } else if (queueType === '1v1_unranked_explosive' || selectedGamemode === 'hot_potato') {
                      setInfoModalMode('1v1_explosive');
                    } else {
                      setInfoModalMode('general');
                    }
                    soundManager.playRollTick();
                  }}
                  className="px-2 sm:px-2.5 py-1 sm:py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-yellow-400 text-yellow-400 rounded-xl flex items-center gap-1.5 text-[8px] sm:text-xs font-mono font-bold uppercase transition cursor-pointer shrink-0"
                  title="Match Rules & Info"
                >
                  <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400" />
                  <span className="hidden sm:inline">MATCH INFO</span>
                </button>
              </div>

              {/* 1. WINNING CONDITIONS VOTE */}
              <div className="bg-zinc-900/90 border border-zinc-800 p-2 sm:p-3 rounded-2xl space-y-1.5 sm:space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] sm:text-[9px] font-mono text-zinc-400 uppercase font-bold flex items-center gap-1.5">
                    <Timer className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-400" />
                    1. MATCH CONDITIONS (ROUNDS & DURATION)
                  </span>
                  <span className="text-[7px] sm:text-[8px] font-mono text-zinc-500">
                    VOTE TO APPLY MATCH LENGTH
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2.5">
                  {WINNING_CONDITIONS_DATA.map((item) => {
                    const votes = conditionVoteCounts[item.id] || 0;
                    const isSelected = selectedWinningCondition === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleVoteCondition(item.id)}
                        className={`relative p-2 sm:p-2.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? item.activeColorClass
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        {/* Top Right Red Circle Vote Counter - Only appears if voted for */}
                        {votes > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-4.5 px-1 bg-red-600 border border-red-300 text-white text-[9px] font-mono font-black rounded-full flex items-center justify-center shadow-lg z-20 pointer-events-none animate-in zoom-in-75">
                            {votes}
                          </span>
                        )}
                        <div>
                          <div className="font-display font-black italic text-[11px] sm:text-xs uppercase text-white truncate">
                            {item.title}
                          </div>
                          <div className="text-[8px] sm:text-[9px] font-mono text-zinc-300 mt-0.5">
                            {item.subtitle}
                          </div>
                        </div>
                        <div className={`mt-1 sm:mt-2 text-[7px] sm:text-[8px] font-mono font-bold px-1.5 py-0.5 rounded w-fit border ${item.eloBadgeColor}`}>
                          {item.eloBadge}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. GAMEMODES SECTION: DEDICATED LOCKED OR VOTING */}
              {queueType === '1v1_unranked_endurance' ? (
                <div className="bg-zinc-900/90 border border-amber-500/40 p-2.5 sm:p-3 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] sm:text-[9px] font-mono text-amber-400 uppercase font-bold flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      2. DEDICATED GAMEMODE: SUSTAIN ATTACK (ENDURANCE & TALLY)
                    </span>
                    <span className="text-[7px] sm:text-[8px] font-mono font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60">
                      🔒 MODE PRE-LOCKED
                    </span>
                  </div>
                  <div className="bg-zinc-950 border border-amber-500/30 p-2 sm:p-2.5 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-display font-black italic uppercase text-white">
                          100% Damage Negation • Cumulative Damage Tally
                        </div>
                        <div className="text-[8px] sm:text-[9px] font-mono text-zinc-400 mt-0.5">
                          Knockouts disabled. Striking output is recorded over 60s. Highest damage wins the round!
                        </div>
                      </div>
                    </div>
                    <span className="text-[8px] font-mono font-bold text-amber-400 uppercase bg-amber-950 px-2 py-1 rounded border border-amber-800 shrink-0 hidden sm:inline">
                      Dedicated Queue
                    </span>
                  </div>
                </div>
              ) : queueType === '1v1_unranked_explosive' ? (
                <div className="bg-zinc-900/90 border border-rose-500/40 p-2.5 sm:p-3 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] sm:text-[9px] font-mono text-rose-400 uppercase font-bold flex items-center gap-1.5">
                      <Bomb className="w-3.5 h-3.5 text-rose-400" />
                      2. DEDICATED GAMEMODE: HOT POTATO (EXPLOSIVE SURVIVAL)
                    </span>
                    <span className="text-[7px] sm:text-[8px] font-mono font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/60">
                      🔒 MODE PRE-LOCKED
                    </span>
                  </div>
                  <div className="bg-zinc-950 border border-rose-500/30 p-2 sm:p-2.5 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                        <Bomb className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-display font-black italic uppercase text-white">
                          100% Damage Reduction • 20s Fuse Reset & Round Timeout Explosion
                        </div>
                        <div className="text-[8px] sm:text-[9px] font-mono text-zinc-400 mt-0.5">
                          Fighters take 0 health damage from strikes. Land clean hits to pass the potato and reset fuse to 20s. Explodes at 0s or on round end!
                        </div>
                      </div>
                    </div>
                    <span className="text-[8px] font-mono font-bold text-rose-400 uppercase bg-rose-950 px-2 py-1 rounded border border-rose-800 shrink-0 hidden sm:inline">
                      Dedicated Queue
                    </span>
                  </div>
                </div>
              ) : queueType === '1v1_ranked' ? (
                <div className="bg-zinc-900/90 border border-red-500/40 p-2.5 sm:p-3 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] sm:text-[9px] font-mono text-red-400 uppercase font-bold flex items-center gap-1.5">
                      <Swords className="w-3.5 h-3.5 text-red-400" />
                      2. GAMEMODE: STANDARD MMA COMBAT (RANKED COMPETITIVE)
                    </span>
                    <span className="text-[7px] sm:text-[8px] font-mono font-bold text-red-300 bg-red-950/80 px-2 py-0.5 rounded border border-red-800/60">
                      🔒 RANKED EXCLUSIVE
                    </span>
                  </div>
                  <div className="bg-zinc-950 border border-red-500/30 p-2 sm:p-2.5 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                        <Swords className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-display font-black italic uppercase text-white">
                          Authentic MMA Combat • No Mutators
                        </div>
                        <div className="text-[8px] sm:text-[9px] font-mono text-zinc-400 mt-0.5">
                          Ranked matches strictly use Standard combat. Mutators like Sustain Attack and Hot Potato are exclusive to Unranked play.
                        </div>
                      </div>
                    </div>
                    <span className="text-[8px] font-mono font-bold text-red-400 uppercase bg-red-950 px-2 py-1 rounded border border-red-800 shrink-0 hidden sm:inline">
                      Ranked Queue
                    </span>
                  </div>
                </div>
              ) : (
                /* OPEN GAMEMODES VOTING FOR STANDARD / RANKED / 2V2 */
                <div className="bg-zinc-900/90 border border-zinc-800 p-2 sm:p-3 rounded-2xl space-y-1.5 sm:space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] sm:text-[9px] font-mono text-zinc-400 uppercase font-bold flex items-center gap-1.5">
                      <Swords className="w-3.5 h-3.5 text-red-400" />
                      2. GAMEMODES & MUTATORS
                    </span>
                    <span className="text-[7px] sm:text-[8px] font-mono text-zinc-500">
                      SPECIAL COMBAT MECHANICS
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2.5">
                    {GAMEMODES_DATA.map((item) => {
                      const votes = gamemodeVoteCounts[item.id] || 0;
                      const isSelected = selectedGamemode === item.id;
                      const IconComp = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleVoteGamemode(item.id)}
                          className={`relative p-2 sm:p-2.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                            isSelected
                              ? item.activeColorClass
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          {/* Top Right Red Circle Vote Counter - Only appears if voted for */}
                          {votes > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-4.5 px-1 bg-red-600 border border-red-300 text-white text-[9px] font-mono font-black rounded-full flex items-center justify-center shadow-lg z-20 pointer-events-none animate-in zoom-in-75">
                              {votes}
                            </span>
                          )}
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <div className="font-display font-black italic text-[11px] sm:text-xs uppercase text-white flex items-center gap-1">
                                <IconComp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-400" />
                                {item.title}
                              </div>
                              <span className="text-[7px] font-mono text-zinc-500 uppercase px-1.5 py-0.5 bg-zinc-900 border border-zinc-800/80 rounded">
                                {item.category}
                              </span>
                            </div>
                            <div className="text-[8px] font-mono text-zinc-400 mt-0.5 leading-snug">
                              {item.description}
                            </div>
                          </div>
                          <div className={`mt-1 sm:mt-2 text-[8px] font-mono font-bold ${item.eloBadgeColor}`}>
                            {item.eloBadge}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. READY CONSENSUS & FORFEIT CONTROLS */}
              <div className="bg-zinc-900 border border-zinc-800 p-2.5 sm:p-3.5 rounded-2xl space-y-2 sm:space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] sm:text-[9px] font-mono text-zinc-400 uppercase font-bold block">
                    3. READY FIGHT CONSENSUS (MANDATORY TO START)
                  </span>
                  {forfeitCount > 0 && (
                    <span className="text-[7px] sm:text-[8px] font-mono text-red-400 font-bold bg-red-950/80 px-2 py-0.5 rounded border border-red-800/60">
                      ⚠️ Forfeit Strikes: {forfeitCount}/3 (3 = 30s ban)
                    </span>
                  )}
                </div>

                {is2v2 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 text-center">
                    <div className={`p-2 rounded-xl border ${isMyReady ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>
                      <div className="text-[7px] font-mono uppercase">YOU (BLUE)</div>
                      <div className="text-xs font-bold mt-0.5">{isMyReady ? '✓ READY' : 'NOT READY'}</div>
                    </div>
                    <div className="p-2 rounded-xl border bg-zinc-950 border-zinc-800 text-zinc-400">
                      <div className="text-[7px] font-mono uppercase">ALLY (BLUE)</div>
                      <div className="text-xs font-bold mt-0.5">✓ READY</div>
                    </div>
                    <div className={`p-2 rounded-xl border ${isOppReady ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}>
                      <div className="text-[7px] font-mono uppercase">ENEMY 1 (RED)</div>
                      <div className="text-xs font-bold mt-0.5">{isOppReady ? '✓ READY' : 'READYING...'}</div>
                    </div>
                    <div className="p-2 rounded-xl border bg-zinc-950 border-zinc-800 text-zinc-400">
                      <div className="text-[7px] font-mono uppercase">ENEMY 2 (RED)</div>
                      <div className="text-xs font-bold mt-0.5">✓ READY</div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className={`p-2 sm:p-2.5 rounded-xl border ${isMyReady ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>
                      <div className="text-[7px] sm:text-[8px] font-mono uppercase">YOUR STATUS</div>
                      <div className="text-xs sm:text-sm font-display font-black italic uppercase mt-0.5">
                        {isMyReady ? '✓ READY FIGHT' : 'NOT READY'}
                      </div>
                    </div>

                    <div className={`p-2 sm:p-2.5 rounded-xl border ${isOppReady ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>
                      <div className="text-[7px] sm:text-[8px] font-mono uppercase truncate">OPPONENT (@{opponent.name})</div>
                      <div className="text-xs sm:text-sm font-display font-black italic uppercase mt-0.5">
                        {isOppReady ? '✓ READY FIGHT' : 'WAITING...'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Ready Up & Forfeit Controls */}
                <div className="flex flex-col sm:flex-row gap-2 pt-0.5">
                  <button
                    onClick={handleToggleReady}
                    className={`flex-1 py-2.5 sm:py-3 font-display font-black italic uppercase text-xs sm:text-sm tracking-widest rounded-xl shadow-xl transition cursor-pointer border flex items-center justify-center gap-2 ${
                      isMyReady 
                        ? 'bg-amber-600 hover:bg-amber-500 border-amber-400 text-white' 
                        : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white animate-pulse'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    {isMyReady ? 'CANCEL READY' : 'READY FIGHT (MANDATORY)'}
                  </button>

                  <button
                    onClick={handleForfeitMatch}
                    className="px-4 sm:px-5 py-2.5 sm:py-3 bg-red-950/90 hover:bg-red-900 border border-red-800 text-red-400 hover:text-white text-xs font-display font-black italic uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    FORFEIT MATCH
                  </button>
                </div>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* 5-SECOND COUNTDOWN OVERLAY */}
      {countdown !== null && (
        <div className="fixed inset-0 bg-zinc-950/95 backdrop-blur-md z-[999] flex flex-col items-center justify-center p-6 text-center space-y-6">
          <div className="text-red-500 font-mono font-black text-xs uppercase tracking-widest animate-pulse">
            ALL COMBATANTS READY • OCTAGON ARENA LAUNCHING IN
          </div>

          <div className="text-8xl font-display font-black italic text-white animate-bounce drop-shadow-[0_0_35px_rgba(239,68,68,0.8)]">
            {countdown}
          </div>

          <p className="text-xs text-zinc-400 font-mono">Synchronizing state & configuring target reticles...</p>

          <button
            onClick={handleForfeitMatch}
            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs uppercase rounded-xl border border-red-400 shadow-2xl transition cursor-pointer flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            CANCEL MATCH
          </button>
        </div>
      )}

      {/* ONLINE PLAYER LIST MODAL */}
      {showPlayerList && (
        <OnlinePlayerListModal
          currentUser={currentUser}
          stats={stats}
          onClose={() => setShowPlayerList(false)}
          onStart1v1Match={(matchData) => {
            if (matchData) {
              setIsRealMatch(true);
              setMatchId(matchData.matchId);
              setIsPlayer1(matchData.isPlayer1);
              setOpponent(matchData.opponent);
              setMatchState('matched_fighters');
            }
          }}
        />
      )}

      {/* UNRANKED & GAMEMODE INFO MODAL */}
      {infoModalMode !== null && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 text-left animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 font-bold">
                  ℹ️
                </div>
                <div>
                  <h3 className="font-display font-black italic uppercase text-base sm:text-lg text-white">
                    {infoModalMode === '1v1_endurance' && 'Endurance & Tally Rules'}
                    {infoModalMode === '1v1_explosive' && 'Explosive Survival Rules'}
                    {infoModalMode === '1v1_classic' && 'Classic Unranked Rules'}
                    {infoModalMode === '2v2' && 'Unranked 2v2 Tag-Team Rules'}
                    {infoModalMode === 'general' && 'Unranked PvP Overview'}
                  </h3>
                  <span className="text-[9px] font-mono text-zinc-400">
                    Casual Octagon Striking Guidelines
                  </span>
                </div>
              </div>

              <button
                onClick={() => setInfoModalMode(null)}
                className="p-1.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-300 font-mono leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
              {infoModalMode === '1v1_endurance' && (
                <>
                  <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl space-y-1.5 text-amber-200">
                    <div className="font-bold flex items-center gap-1.5 text-amber-400">
                      <Shield className="w-4 h-4" /> 100% DAMAGE NEGATION
                    </div>
                    <p className="text-[11px]">
                      Knockouts are fully disabled! All strikes landed deal 0 health damage, but their full impact values are accumulated into a live damage score tally.
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
                    <div className="font-bold text-white">🏆 WIN CONDITION:</div>
                    <p className="text-[11px] text-zinc-400">
                      The round lasts 60 seconds. When the timer hits 0s, the fighter with the highest cumulative damage tally wins the round.
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
                    <div className="font-bold text-white">🗳️ VOTING RULES:</div>
                    <p className="text-[11px] text-zinc-400">
                      Gamemode is pre-locked to Sustain Attack. You only need to vote on the Winning Condition (Round limits).
                    </p>
                  </div>
                </>
              )}

              {infoModalMode === '1v1_explosive' && (
                <>
                  <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl space-y-1.5 text-rose-200">
                    <div className="font-bold flex items-center gap-1.5 text-rose-400">
                      <Bomb className="w-4 h-4" /> 100% DAMAGE REDUCTION & VOLATILE BOMB
                    </div>
                    <p className="text-[11px]">
                      Both fighters have 100% damage reduction — punches and kicks deal 0 health damage! The ticking hot potato is the ONLY source of elimination.
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
                    <div className="font-bold text-white">🥔 PASSING & 20s TIMER RESET:</div>
                    <p className="text-[11px] text-zinc-400">
                      Land a clean strike on your opponent to transfer the potato. Passing the potato resets its fuse timer back to 20 seconds!
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
                    <div className="font-bold text-white">💥 EXPLOSIONS (FUSE & ROUND TIMEOUT):</div>
                    <p className="text-[11px] text-zinc-400">
                      When the 20-second fuse reaches 0, OR when the match round timer ends, the potato immediately detonates on whoever is holding it, awarding the round to the survivor!
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
                    <div className="font-bold text-white">🗳️ VOTING RULES:</div>
                    <p className="text-[11px] text-zinc-400">
                      Gamemode is pre-locked to Hot Potato in this dedicated queue. You only need to vote on the Match Condition (Rounds & Duration).
                    </p>
                  </div>
                </>
              )}

              {infoModalMode === '1v1_classic' && (
                <>
                  <div className="p-3 bg-cyan-950/40 border border-cyan-800/60 rounded-xl space-y-1.5 text-cyan-200">
                    <div className="font-bold flex items-center gap-1.5 text-cyan-400">
                      <Swords className="w-4 h-4" /> CASUAL 1V1 DUEL
                    </div>
                    <p className="text-[11px]">
                      Standard striking combat without the pressure of ELO changes. Great for testing moves, combos, and sparring with friends.
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
                    <div className="font-bold text-white">⚡ NO ELO RISK:</div>
                    <p className="text-[11px] text-zinc-400">
                      Wins and losses in unranked modes do not alter your ranked ELO score.
                    </p>
                  </div>
                </>
              )}

              {infoModalMode === '2v2' && (
                <>
                  <div className="p-3 bg-purple-950/40 border border-purple-800/60 rounded-xl space-y-1.5 text-purple-200">
                    <div className="font-bold flex items-center gap-1.5 text-purple-400">
                      <Users className="w-4 h-4" /> 4-FIGHTER TEAM BRAWL
                    </div>
                    <p className="text-[11px]">
                      2 fighters on Blue Team vs 2 fighters on Red Team. Coordinate with your ally to stagger enemies and dominate the octagon!
                    </p>
                  </div>
                </>
              )}

              {infoModalMode === 'general' && (
                <>
                  <div className="p-3 bg-zinc-950 border border-cyan-500/40 rounded-xl space-y-1.5">
                    <div className="font-bold text-cyan-400">🛡️ 0 ELO STAKES & FORFEIT FAIRNESS:</div>
                    <p className="text-[11px] text-zinc-300">
                      Unranked 1v1 and 2v2 modes are designed for fun and practice. Forfeiting or leaving an unranked match does NOT eat your ELO.
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-950 border border-red-500/40 rounded-xl space-y-1.5">
                    <div className="font-bold text-red-400">⏱️ 3-FORFEIT 30-SECOND BAN:</div>
                    <p className="text-[11px] text-zinc-300">
                      To prevent match griefing and lobby disruption, abandoning 3 matches in a row will apply a temporary 30-second matchmaking cooldown.
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1.5">
                    <div className="font-bold text-yellow-400">🗳️ VOTING RULES:</div>
                    <p className="text-[11px] text-zinc-300">
                      In dedicated modes (Endurance & Tally / Explosive Survival), the gamemode mutator is fixed, so you only vote on match duration & round count. In other modes, you vote for both Winning Conditions and Gamemodes.
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setInfoModalMode(null)}
                className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-mono font-bold text-xs uppercase rounded-xl transition cursor-pointer"
              >
                GOT IT
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
