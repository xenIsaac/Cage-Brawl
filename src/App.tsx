import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, Trophy, ArrowLeft } from 'lucide-react';
import { PlayerStats, GameScreen, GameSettings, VirtualControlItem, UserSession, MatchData } from './types';
import Menu from './components/Menu';
import RollSystem from './components/RollSystem';
import Arena from './components/Arena';
import LoginScreen from './components/LoginScreen';
import NamingScreen from './components/NamingScreen';
import MatchmakingScreen from './components/MatchmakingScreen';
import AiMatchScreen from './components/AiMatchScreen';
import SingleplayerQuestsScreen from './components/SingleplayerQuestsScreen';
import CareerMilestonesScreen from './components/CareerMilestonesScreen';
import Incoming1v1InviteModal from './components/Incoming1v1InviteModal';
import LeftNavRail, { ModalType, CodexSortMode } from './components/LeftNavRail';
import { 
  CodexView, 
  AccountCenterView, 
  QuestsAchievementsView, 
  OnlinePlayersView, 
  SettingsView, 
  GameInfoView 
} from './components/mainmenu';
import { SettingsCategoryTab } from './components/navigation/SettingsNavRail';
import { GameInfoTab } from './components/navigation/GameInfoNavRail';
import { FighterProfileTab } from './components/navigation/FighterProfileNavRail';
import HudTestBox from './components/HudTestBox';
import { soundManager } from './components/SoundManager';
import { wsService, PendingInvite } from './services/websocket';
import { 
  DEFAULT_LANDSCAPE_LAYOUT, 
  DEFAULT_PORTRAIT_LAYOUT, 
  DEFAULT_KEYBINDS, 
  sanitizeLayout 
} from './data/hudDefaults';
import { getRollableStyles, FIGHTING_STYLES } from './data/styles';
import { isMobileDevice as detectIsMobile } from './utils/deviceDetection';

// Dynamic version number
const GAME_VERSION = 'v1.7.6 Part 3';

const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  masterVolume: 1.0,
  sfxVolume: 1.0,
  musicVolume: 0.8,
  screenShake: 1.0,
  showVirtualControls: 'auto',
  touchControlMode: 'virtual',
  mobileControlsLayout: DEFAULT_LANDSCAPE_LAYOUT,
  mobileControlsLayoutLandscape: DEFAULT_LANDSCAPE_LAYOUT,
  mobileControlsLayoutPortrait: DEFAULT_PORTRAIT_LAYOUT,
  keybinds: DEFAULT_KEYBINDS,
  gameSpeed: 1.0,
  cursorType: 'crosshair',
  cursorColor: 'red',
  showDevSwitcher: false,
  hudScale: 0.85,
  mobileFov: 1.3,
  hudOpacity: 0.8,
  pinchToZoomEnabled: true,
  damageNumbers: true,
  damageBarDegradingEnabled: true,
  staminaWarning: true,
  comboCounter: true,
  showFps: false,
  hapticsEnabled: true,
  hitstopEffect: true,
  autoTargetAssist: true,
  particleDensity: 'high',
  arenaTheme: 'classic_cage',
  lockFov: false,
  lowGraphicsMode: false,
  targetFps: 'uncapped',
  renderResolutionScale: 1.0,
  disableAuraVfx: false,
  touchThrottling: false,
  mobileSprintMode: 'button_only',
};

export const getStatsStorageKey = (email?: string, username?: string): string => {
  const id = email?.trim().toLowerCase() || username?.trim().toLowerCase() || 'default_user';
  return `mma_fighter_stats_${id}`;
};

const loadStatsForUser = (email?: string, username?: string): PlayerStats => {
  const primaryKey = getStatsStorageKey(email, username);
  let saved = localStorage.getItem(primaryKey);
  
  // Fallback checks for legacy keys
  if (!saved && email) {
    saved = localStorage.getItem(`mma_fighter_stats_${email}`);
  }
  if (!saved && username) {
    saved = localStorage.getItem(`mma_fighter_stats_${username}`);
  }
  if (!saved) {
    saved = localStorage.getItem('mma_fighter_stats_');
  }
  if (!saved) {
    saved = localStorage.getItem('mma_fighter_stats_dev@cagebrawl.com');
  }

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        const selectedStyle = parsed.selectedStyleId || 'basic';
        return {
          rolls: typeof parsed.rolls === 'number' ? parsed.rolls : 0,
          cash: typeof parsed.cash === 'number' ? parsed.cash : 0,
          selectedStyleId: selectedStyle,
          unlockedStyleIds: Array.isArray(parsed.unlockedStyleIds) && parsed.unlockedStyleIds.length > 0
            ? parsed.unlockedStyleIds
            : [selectedStyle],
          styleObtainedCounts: parsed.styleObtainedCounts && typeof parsed.styleObtainedCounts === 'object'
            ? parsed.styleObtainedCounts
            : { [selectedStyle]: 1 },
          heightInInches: typeof parsed.heightInInches === 'number' ? parsed.heightInInches : 68,
          keys: {
            iron: parsed.keys?.iron ?? (parsed.rolls ? Math.max(0, parsed.rolls) : 2),
            gold: parsed.keys?.gold ?? 1,
            diamond: parsed.keys?.diamond ?? 0,
            obsidian: parsed.keys?.obsidian ?? 0,
          },
          wishlist: parsed.wishlist ? {
            styleId: parsed.wishlist.styleId ?? null,
            wishlistCooldownUntil: typeof parsed.wishlist.wishlistCooldownUntil === 'number' ? parsed.wishlist.wishlistCooldownUntil : 0,
          } : undefined,
          originCrateCooldownUntil: typeof parsed.originCrateCooldownUntil === 'number' ? parsed.originCrateCooldownUntil : 0,
          totalCratesOpened: typeof parsed.totalCratesOpened === 'number' ? parsed.totalCratesOpened : 0,
          highScore: typeof parsed.highScore === 'number' ? parsed.highScore : 0,
          totalKOs: typeof parsed.totalKOs === 'number' ? parsed.totalKOs : 0,
          totalRollsCount: typeof parsed.totalRollsCount === 'number' ? parsed.totalRollsCount : 0,
          xp: typeof parsed.xp === 'number' ? parsed.xp : 0,
          elo: typeof parsed.elo === 'number' ? parsed.elo : 0,
          lossStreak: typeof parsed.lossStreak === 'number' ? parsed.lossStreak : 0,
          aiElo: typeof parsed.aiElo === 'number' ? parsed.aiElo : 100,
          aiLossStreak: typeof parsed.aiLossStreak === 'number' ? parsed.aiLossStreak : 0,
          aiWins: typeof parsed.aiWins === 'number' ? parsed.aiWins : 0,
          aiWinStreak: typeof parsed.aiWinStreak === 'number' ? parsed.aiWinStreak : 0,
          aiMatchesPlayed: typeof parsed.aiMatchesPlayed === 'number' ? parsed.aiMatchesPlayed : 0,
          timeSpentSeconds: typeof parsed.timeSpentSeconds === 'number' ? parsed.timeSpentSeconds : 0,
          totalRollsRolled: typeof parsed.totalRollsRolled === 'number' ? parsed.totalRollsRolled : 0,
          highestHeightReached: typeof parsed.highestHeightReached === 'number' ? parsed.highestHeightReached : (parsed.heightInInches ?? 68),
          totalMatchesPlayed: typeof parsed.totalMatchesPlayed === 'number' ? parsed.totalMatchesPlayed : 0,
          totalWins: typeof parsed.totalWins === 'number' ? parsed.totalWins : 0,
          winStreak: typeof parsed.winStreak === 'number' ? parsed.winStreak : 0,
          unlockedTitles: Array.isArray(parsed.unlockedTitles) ? parsed.unlockedTitles : [],
          selectedTitle: parsed.selectedTitle ?? '',
          savedKeybinds: parsed.savedKeybinds,
        };
      }
    } catch (e) {
      console.error('Error parsing user stats:', e);
    }
  }

  // 1.7.6 Part 3: New accounts get randomized height and fighting style (100% equal random chance across all styles)
  const rollableStyles = getRollableStyles();
  const randomStyle = rollableStyles.length > 0
    ? rollableStyles[Math.floor(Math.random() * rollableStyles.length)].id
    : (FIGHTING_STYLES.length > 0 ? FIGHTING_STYLES[Math.floor(Math.random() * FIGHTING_STYLES.length)].id : 'flow_boxing');

  // Random height between 54" (4'6") and 79" (6'7")
  const randomHeight = Math.floor(Math.random() * (79 - 54 + 1)) + 54;

  return {
    rolls: 0,
    cash: 0,
    selectedStyleId: randomStyle,
    unlockedStyleIds: [randomStyle],
    styleObtainedCounts: { [randomStyle]: 1 },
    heightInInches: randomHeight,
    highestHeightReached: randomHeight,
    keys: { iron: 2, gold: 1, diamond: 0, obsidian: 0 },
    totalCratesOpened: 0,
    highScore: 0,
    totalKOs: 0,
    totalRollsCount: 0,
    xp: 0,
    elo: 0,
    lossStreak: 0,
    aiElo: 100,
    aiLossStreak: 0,
    aiWins: 0,
    aiWinStreak: 0,
    aiMatchesPlayed: 0,
    timeSpentSeconds: 0,
    totalRollsRolled: 0,
    totalMatchesPlayed: 0,
    totalWins: 0,
    winStreak: 0,
    unlockedTitles: [],
    selectedTitle: '',
  };
};

const autoGenerateTestName = (email: string): string => {
  const SEED_TAKEN_NAMES = [
    'conor_mcgregor', 'gsp_legend', 'jon_jones', 'fedor', 'chael_sonnen', 'gareth', 'dev_brawler', 'alex_pereira', 'sugar_sean'
  ];
  let taken: string[] = SEED_TAKEN_NAMES;
  const rawTaken = localStorage.getItem('mma_taken_names');
  if (rawTaken) {
    try {
      taken = JSON.parse(rawTaken);
    } catch (e) {
      taken = SEED_TAKEN_NAMES;
    }
  }

  let uniqueName = '';
  let candidateLower = '';
  while (!uniqueName) {
    const len = Math.floor(Math.random() * 5) + 4;
    const min = Math.pow(10, len - 1);
    const max = Math.pow(10, len) - 1;
    const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
    const candidateName = `TEST_${randomNum}`;
    candidateLower = candidateName.toLowerCase();
    if (!taken.includes(candidateLower)) {
      uniqueName = candidateName;
    }
  }

  taken.push(candidateLower);
  localStorage.setItem('mma_taken_names', JSON.stringify(taken));
  localStorage.setItem(`mma_fighter_name_map_${email}`, uniqueName);
  return uniqueName;
};

const loadSettingsForUser = (email?: string): GameSettings => {
  let saved = email ? localStorage.getItem(`mma_game_settings_${email}`) : null;
  if (!saved) {
    saved = localStorage.getItem('mma_game_settings');
  }
  let loaded: GameSettings = { ...DEFAULT_SETTINGS };
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      loaded = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        mobileControlsLayout: sanitizeLayout(parsed.mobileControlsLayoutLandscape || parsed.mobileControlsLayout, DEFAULT_LANDSCAPE_LAYOUT),
        mobileControlsLayoutLandscape: sanitizeLayout(parsed.mobileControlsLayoutLandscape || parsed.mobileControlsLayout, DEFAULT_LANDSCAPE_LAYOUT),
        mobileControlsLayoutPortrait: sanitizeLayout(parsed.mobileControlsLayoutPortrait, DEFAULT_PORTRAIT_LAYOUT),
        keybinds: parsed.keybinds || DEFAULT_KEYBINDS,
      };
    } catch (e) {
      loaded = DEFAULT_SETTINGS;
    }
  }
  return loaded;
};

export function getOrGenerateFighterId(email?: string): string {
  const key = `mma_fighter_id_${email || 'anon'}`;
  let fid = localStorage.getItem(key);
  if (!fid) {
    if (email) {
      let hash = 0;
      for (let i = 0; i < email.length; i++) {
        hash = (hash << 5) - hash + email.charCodeAt(i);
        hash |= 0;
      }
      const num = 1000 + (Math.abs(hash) % 9000);
      fid = `FID-${num}`;
    } else {
      fid = `FID-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    localStorage.setItem(key, fid);
  }
  return fid;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('mma_current_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email) {
          let savedName = localStorage.getItem(`mma_fighter_name_map_${parsed.email}`);
          if (!savedName && parsed.isTestAccount) {
            savedName = autoGenerateTestName(parsed.email);
          }
          if (savedName) {
            parsed.fighterName = savedName;
          }
          parsed.fighterId = getOrGenerateFighterId(parsed.email);
        }
        return parsed;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [screen, setScreen] = useState<GameScreen>('MENU');
  const [isNavHidden, setIsNavHidden] = useState(false);
  const [isNavExpanded, setIsNavExpanded] = useState(false);
  const [isInCombat, setIsInCombat] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [achievementsSubTab, setAchievementsSubTab] = useState<'achievements' | 'style_mastery'>('achievements');
  const [codexSortMode, setCodexSortMode] = useState<CodexSortMode>('class');
  const [codexSelectedCategory, setCodexSelectedCategory] = useState<string>('all');
  const [codexSelectedStyleId, setCodexSelectedStyleId] = useState<string>('basic');
  const [singleplayerModeSide, setSingleplayerModeSide] = useState<'competitive' | 'casual'>('competitive');
  const [singleplayerCompSubTab, setSingleplayerCompSubTab] = useState<'ranked_ai' | 'tournament' | 'boss_raids'>('ranked_ai');
  const [singleplayerCasualSubTab, setSingleplayerCasualSubTab] = useState<'casual_1v1' | 'ai_vs_ai' | 'upcoming'>('casual_1v1');
  const [singleplayerDifficulty, setSingleplayerDifficulty] = useState<'rookie' | 'silver' | 'gold' | 'diamond' | 'amethyst'>('silver');
  const [singleplayerQuestMobileTab, setSingleplayerQuestMobileTab] = useState<'quests' | 'milestones'>('quests');
  const [singleplayerQuestClaimableCount, setSingleplayerQuestClaimableCount] = useState<number>(0);
  const [singleplayerQuestClaimAllTrigger, setSingleplayerQuestClaimAllTrigger] = useState<number>(0);
  const [settingsCategory, setSettingsCategory] = useState<SettingsCategoryTab>('all');
  const [settingsSearchQuery, setSettingsSearchQuery] = useState<string>('');
  const [gameInfoTab, setGameInfoTab] = useState<GameInfoTab>('latest');
  const [fighterProfileTab, setFighterProfileTab] = useState<FighterProfileTab>('public');
  const [questsModalMode, setQuestsModalMode] = useState<'ai' | 'milestones' | 'all'>('milestones');
  const [activeMatchData, setActiveMatchData] = useState<MatchData | null>(null);
  const [rollInitialTab, setRollInitialTab] = useState<'vs_ai' | 'gacha'>('gacha');
  const [rollSubTab, setRollSubTab] = useState<'crates' | 'shop' | 'wishlist' | 'genetics' | 'vault' | 'spin' | 'showcase' | 'history'>('crates');
  const [isPortrait, setIsPortrait] = useState(false);
  const [bypassPortrait, setBypassPortrait] = useState(false);
  const [portraitCountdown, setPortraitCountdown] = useState(10);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    return !!document.fullscreenElement;
  });
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(() => {
    return detectIsMobile();
  });

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Differentiate Active Gameplay (VS AI, VS Online, Practice Mode, Test Game) from UI and Main Menu by script & class
  useEffect(() => {
    const isGameplay = screen === 'ARENA';
    document.documentElement.classList.toggle('in-active-gameplay', isGameplay);
    document.body.dataset.gameState = isGameplay ? 'active-gameplay' : 'main-menu';
  }, [screen]);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Error attempting to enable fullscreen:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.warn('Error attempting to exit fullscreen:', err);
        });
      }
    }
    soundManager.playRollTick();
  };

  // Incoming 1v1 Invite Modal State
  const [pending1v1Invite, setPending1v1Invite] = useState<PendingInvite | null>(null);

  const [stats, setStats] = useState<PlayerStats>(() => {
    const userSaved = localStorage.getItem('mma_current_user');
    if (userSaved) {
      try {
        const parsedUser = JSON.parse(userSaved);
        if (parsedUser) {
          return loadStatsForUser(parsedUser.email, parsedUser.username);
        }
      } catch (e) {}
    }
    return loadStatsForUser();
  });

  const [settings, setSettings] = useState<GameSettings>(() => {
    return loadSettingsForUser(currentUser?.email || currentUser?.username);
  });

  // Connect to persistent WebSocket when logged in
  useEffect(() => {
    if (currentUser && currentUser.fighterName) {
      wsService.connect(currentUser, stats);

      const unsubscribe = wsService.addListener((type, payload) => {
        if (type === 'receive_1v1_invite') {
          setPending1v1Invite(payload);
          soundManager.playKO();
        } else if (type === 'match_found') {
          setPending1v1Invite(null);
          setActiveMatchData({
            isCompetitive: true,
            mapId: 'octagon',
            mapName: 'Octagon Arena',
            modeId: 'normal',
            modeName: 'Normal Match',
            opponent: payload.opponent,
            isRealMatch: true,
            socket: wsService.getRawSocket(),
            matchId: payload.matchId,
            isPlayer1: payload.isPlayer1
          });
          setScreen('MATCHMAKING');
        }
      });

      return () => unsubscribe();
    }
  }, [currentUser, stats]);

  // Orientation & Device Type monitoring
  useEffect(() => {
    const handleOrientationCheck = () => {
      const isMobile = detectIsMobile();
      setIsMobileDevice(isMobile);
      const isTallRatio = window.innerHeight > window.innerWidth;
      // Portrait prompt/mode is only for genuine mobile phone/tablet users
      setIsPortrait(isTallRatio && isMobile);
    };

    handleOrientationCheck();
    window.addEventListener('resize', handleOrientationCheck);
    window.addEventListener('orientationchange', handleOrientationCheck);
    return () => {
      window.removeEventListener('resize', handleOrientationCheck);
      window.removeEventListener('orientationchange', handleOrientationCheck);
    };
  }, []);

  // 10-second auto-bypass timer
  useEffect(() => {
    if (isPortrait && !bypassPortrait) {
      setPortraitCountdown(10);
      const interval = setInterval(() => {
        setPortraitCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setBypassPortrait(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPortrait, bypassPortrait]);

  // Persistent Stats Saving across sessions
  useEffect(() => {
    if (currentUser) {
      const storageKey = getStatsStorageKey(currentUser.email, currentUser.username);
      localStorage.setItem(storageKey, JSON.stringify(stats));
      if (currentUser.email) {
        localStorage.setItem(`mma_fighter_stats_${currentUser.email}`, JSON.stringify(stats));
      }
      if (currentUser.username) {
        localStorage.setItem(`mma_fighter_stats_${currentUser.username}`, JSON.stringify(stats));
      }
    }
  }, [stats, currentUser]);

  useEffect(() => {
    localStorage.setItem('mma_game_settings', JSON.stringify(settings));
    if (currentUser?.email) {
      localStorage.setItem(`mma_game_settings_${currentUser.email}`, JSON.stringify(settings));
    }
    if (currentUser?.username) {
      localStorage.setItem(`mma_game_settings_${currentUser.username}`, JSON.stringify(settings));
    }
    soundManager.setEnabled(settings.soundEnabled);
    soundManager.setVolumes(
      settings.masterVolume !== undefined ? settings.masterVolume : 1.0,
      settings.sfxVolume !== undefined ? settings.sfxVolume : 1.0
    );
  }, [settings, currentUser]);

  const updateStats = (updates: Partial<PlayerStats>) => {
    setStats(prev => ({ ...prev, ...updates }));
  };

  const handleLoginSuccess = (session: UserSession) => {
    const accIdentifier = session.email || session.username;
    let savedName = localStorage.getItem(`mma_fighter_name_map_${accIdentifier}`);
    if (!savedName && session.isTestAccount) {
      savedName = autoGenerateTestName(accIdentifier);
    }
    const fid = getOrGenerateFighterId(accIdentifier);
    const enrichedSession = {
      ...session,
      fighterId: fid,
      fighterName: savedName || session.fighterName || session.username || 'Fighter'
    };
    setCurrentUser(enrichedSession);
    localStorage.setItem('mma_current_user', JSON.stringify(enrichedSession));
    setStats(loadStatsForUser(session.email, session.username));
    setSettings(loadSettingsForUser(session.email || session.username));
  };

  // Keep WebSocket user activity status in real-time sync across screens
  useEffect(() => {
    if (!currentUser) return;
    if (screen === 'MENU') {
      wsService.updateStatus('idle', 'Online Idle');
    } else if (screen === 'MATCHMAKING') {
      wsService.updateStatus('searching', 'Searching PvP Match');
    } else if (screen === 'AI_MATCH') {
      wsService.updateStatus('playing_ai', 'In AI Hub');
    } else if (screen === 'ARENA') {
      if (activeMatchData?.isRealMatch) {
        wsService.updateStatus('playing_online', activeMatchData?.modeName || 'In 1v1 PvP Match');
      } else if (activeMatchData?.isAiMatch) {
        wsService.updateStatus('playing_ai', activeMatchData?.modeName || 'In VS AI Match');
      } else {
        wsService.updateStatus('practice', 'In Combat Arena');
      }
    } else if (screen === 'ROLLING') {
      wsService.updateStatus('idle', 'Spinning Styles');
    } else if (screen === 'HUD_TEST_BOX') {
      wsService.updateStatus('practice', 'Testing Controls HUD');
    }
  }, [screen, activeMatchData, currentUser]);

  const handleNameChosen = (chosenName: string) => {
    setCurrentUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, fighterName: chosenName };
      localStorage.setItem('mma_current_user', JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdateUserSession = (updates: Partial<UserSession>) => {
    setCurrentUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem('mma_current_user', JSON.stringify(updated));
      return updated;
    });
  };

  // Track time spent
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      setStats((prev) => ({
        ...prev,
        timeSpentSeconds: (prev.timeSpentSeconds || 0) + 1
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleLogout = () => {
    wsService.disconnect();
    setCurrentUser(null);
    localStorage.removeItem('mma_current_user');
    soundManager.playRollTick();
  };

  const updateSettings = (updates: Partial<GameSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const handleNavigate = (nextScreen: GameScreen, tab?: 'vs_ai' | 'gacha' | 'crates' | 'shop' | 'wishlist' | 'genetics' | 'vault' | 'spin' | 'showcase' | 'history') => {
    setIsInCombat(false);
    if (nextScreen === 'ARENA' || nextScreen === 'HUD_TEST_BOX') {
      setIsNavHidden(true);
    } else {
      setIsNavHidden(false);
    }
    if (nextScreen !== 'ARENA') {
      setActiveMatchData(null);
    }
    if (tab === 'crates' || tab === 'shop' || tab === 'wishlist' || tab === 'genetics' || tab === 'vault' || tab === 'spin' || tab === 'showcase' || tab === 'history') {
      setRollSubTab(tab);
      setRollInitialTab('gacha');
    } else if (tab) {
      setRollInitialTab(tab);
    } else if (nextScreen === 'ROLLING') {
      setRollInitialTab('gacha');
      setRollSubTab('crates');
    }
    setScreen(nextScreen);
    soundManager.playRollTick();
  };

  const handleBackToMenu = (destinationArg?: any) => {
    setActiveMatchData(null);
    setIsInCombat(false);
    setIsNavHidden(false);
    const destination = typeof destinationArg === 'string' ? destinationArg : undefined;
    if (destination === 'tournament' || destination === 'AI_MATCH') {
      setScreen('AI_MATCH');
    } else if (destination && destination !== 'MENU') {
      setScreen(destination as GameScreen);
    } else {
      setScreen('MENU');
    }
    soundManager.playRollTick();
  };

  const handleFullscreenAndBypass = () => {
    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        (element as any).webkitRequestFullscreen();
      } else if ((element as any).msRequestFullscreen) {
        (element as any).msRequestFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen error:', e);
    }
    setBypassPortrait(true);
    soundManager.playKO();
  };

  return (
    <div className="w-full h-screen h-[100dvh] max-h-[100dvh] overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans select-none relative touch-none overscroll-none">
      {!currentUser ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : !currentUser.fighterName ? (
        <NamingScreen email={currentUser.email} onNameChosen={handleNameChosen} />
      ) : (
        <>
          {/* TOP RIGHT FULLSCREEN BUTTON (EXCLUSIVE TO MOBILE - NEVER SHOWN ON PC) */}
          {isMobileDevice && !isFullscreen && (
            <button
              onClick={handleToggleFullscreen}
              className="fixed top-3 right-3 z-[70] flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-950/90 border border-zinc-700/80 text-zinc-300 hover:text-white hover:border-zinc-500 font-mono text-xs shadow-lg backdrop-blur-md transition cursor-pointer"
              title="Go Fullscreen"
              aria-label="Toggle Fullscreen"
            >
              <Smartphone className="w-4 h-4 text-amber-400" />
              <span>Fullscreen</span>
            </button>
          )}

          {/* INCOMING 1v1 INVITE OVERLAY MODAL */}
          {pending1v1Invite && (
            <Incoming1v1InviteModal
              invite={pending1v1Invite}
              onAccept={() => setPending1v1Invite(null)}
              onDecline={() => setPending1v1Invite(null)}
            />
          )}

          {/* GLOBAL LEFT NAVIGATION RAIL (ONLY RENDERED OUTSIDE ACTIVE ARENA GAMEPLAY) */}
          {screen !== 'ARENA' && (
            <LeftNavRail
              currentScreen={screen}
              activeModal={activeModal}
              rollSubTab={rollSubTab}
              achievementsSubTab={achievementsSubTab}
              setAchievementsSubTab={setAchievementsSubTab}
              onNavigateScreen={(targetScreen, subTab) => {
                setActiveModal(null);
                handleNavigate(targetScreen, subTab);
              }}
              onOpenModal={(modal) => {
                if (modal === 'quests') {
                  setAchievementsSubTab('achievements');
                } else if (modal === 'settings') {
                  setSettingsCategory('all');
                  setSettingsSearchQuery('');
                } else if (modal === 'info') {
                  setGameInfoTab('latest');
                }
                setActiveModal(modal);
              }}
              onCloseModal={() => setActiveModal(null)}
              version={GAME_VERSION}
              isFullyHidden={isNavHidden}
              setIsFullyHidden={setIsNavHidden}
              isInCombat={false}
              stats={stats}
              email={currentUser?.email}
              onNavExpandChange={setIsNavExpanded}
              codexSortMode={codexSortMode}
              setCodexSortMode={setCodexSortMode}
              codexSelectedCategory={codexSelectedCategory}
              setCodexSelectedCategory={setCodexSelectedCategory}
              codexSelectedStyleId={codexSelectedStyleId}
              setCodexSelectedStyleId={setCodexSelectedStyleId}
              singleplayerModeSide={singleplayerModeSide}
              setSingleplayerModeSide={setSingleplayerModeSide}
              singleplayerCompSubTab={singleplayerCompSubTab}
              setSingleplayerCompSubTab={setSingleplayerCompSubTab}
              singleplayerCasualSubTab={singleplayerCasualSubTab}
              setSingleplayerCasualSubTab={setSingleplayerCasualSubTab}
              singleplayerDifficulty={singleplayerDifficulty}
              setSingleplayerDifficulty={setSingleplayerDifficulty}
              onOpenGameRules={() => setCodexSelectedCategory('universal_rules')}
              onOpenSingleplayerQuests={() => handleNavigate('SINGLEPLAYER_QUESTS')}
              singleplayerQuestMobileTab={singleplayerQuestMobileTab}
              setSingleplayerQuestMobileTab={setSingleplayerQuestMobileTab}
              onSingleplayerQuestClaimAll={() => setSingleplayerQuestClaimAllTrigger(prev => prev + 1)}
              singleplayerQuestClaimableCount={singleplayerQuestClaimableCount}
              onReturnToSingleplayerHub={() => handleNavigate('AI_MATCH')}
              settingsActiveCategory={settingsCategory}
              setSettingsActiveCategory={setSettingsCategory}
              settingsSearchQuery={settingsSearchQuery}
              setSettingsSearchQuery={setSettingsSearchQuery}
              gameInfoActiveTab={gameInfoTab}
              setGameInfoActiveTab={setGameInfoTab}
              fighterProfileActiveTab={fighterProfileTab}
              setFighterProfileActiveTab={setFighterProfileTab}
              crateSanctumSubTab={rollSubTab as any}
              setCrateSanctumSubTab={(tab) => setRollSubTab(tab as any)}
            />
          )}

          {/* ACTIVE MODAL OVERLAYS */}
          {activeModal === 'codex' && (
            <CodexView 
              isOpen={true} 
              onClose={() => setActiveModal(null)} 
              equippedStyleId={stats.selectedStyleId} 
              isNavHidden={isNavHidden}
              isNavExpanded={isNavExpanded}
              sortMode={codexSortMode}
              setSortMode={setCodexSortMode}
              selectedCategory={codexSelectedCategory}
              setSelectedCategory={setCodexSelectedCategory}
              selectedStyleId={codexSelectedStyleId}
              onSelectStyle={setCodexSelectedStyleId}
            />
          )}
          {activeModal === 'quests' && (
            <QuestsAchievementsView 
              stats={stats} 
              updateStats={updateStats} 
              email={currentUser?.email}
              activeTab={achievementsSubTab}
              onClose={() => {
                setActiveModal(null);
                handleNavigate('MENU');
              }} 
              isNavHidden={isNavHidden}
              isNavExpanded={isNavExpanded}
            />
          )}
          {activeModal === 'account' && (
            <AccountCenterView 
              stats={stats} 
              updateStats={updateStats} 
              currentUser={currentUser} 
              onLogout={handleLogout} 
              onUpdateUserSession={handleUpdateUserSession} 
              onClose={() => setActiveModal(null)} 
              isNavHidden={isNavHidden}
              activeProfileTab={fighterProfileTab}
              setActiveProfileTab={setFighterProfileTab}
            />
          )}
          {activeModal === 'players' && (
            <OnlinePlayersView 
              currentUser={currentUser}
              stats={stats}
              onClose={() => setActiveModal(null)} 
              isNavHidden={isNavHidden}
            />
          )}
          {activeModal === 'settings' && (
            <SettingsView 
              settings={settings} 
              updateSettings={updateSettings} 
              onClose={() => setActiveModal(null)} 
              isNavHidden={isNavHidden}
              activeCategory={settingsCategory}
              setActiveCategory={setSettingsCategory}
              searchQuery={settingsSearchQuery}
              setSearchQuery={setSettingsSearchQuery}
              onRequestResetProgress={() => {
                localStorage.removeItem(`mma_settings_${currentUser?.email || currentUser?.username || 'guest'}`);
              }}
            />
          )}
          {activeModal === 'info' && (
            <GameInfoView 
              version={GAME_VERSION} 
              onClose={() => setActiveModal(null)} 
              isNavHidden={isNavHidden}
              activeTab={gameInfoTab}
              setActiveTab={setGameInfoTab}
            />
          )}

          <AnimatePresence mode="wait">
            {screen === 'MENU' && (
              <motion.div
                key="menu-screen"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="w-full flex-1 flex flex-col"
              >
                <Menu 
                  stats={stats} 
                  updateStats={updateStats} 
                  settings={settings}
                  updateSettings={updateSettings}
                  onNavigate={handleNavigate}
                  version={GAME_VERSION}
                  currentUser={currentUser}
                  onLogout={handleLogout}
                  onUpdateUserSession={handleUpdateUserSession}
                  isNavHidden={isNavHidden}
                  isNavExpanded={isNavExpanded}
                />
              </motion.div>
            )}

            {screen === 'ROLLING' && (
              <motion.div
                key="rolling-screen"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="w-full flex-1 flex flex-col"
              >
                <RollSystem 
                  stats={stats} 
                  updateStats={updateStats} 
                  onBackToMenu={handleBackToMenu}
                  version={GAME_VERSION}
                  initialSubTab={rollSubTab}
                  onSubTabChange={(tab) => setRollSubTab(tab as any)}
                  isNavHidden={isNavHidden}
                />
              </motion.div>
            )}

            {screen === 'MATCHMAKING' && (
              <motion.div
                key="matchmaking-screen"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="w-full flex-1 flex flex-col"
              >
                <MatchmakingScreen
                  stats={stats}
                  updateStats={updateStats}
                  settings={settings}
                  updateSettings={updateSettings}
                  currentUser={currentUser}
                  onBackToMenu={handleBackToMenu}
                  onNavigateToRoll={() => handleNavigate('ROLLING', 'gacha')}
                  onOpenQuests={() => setActiveModal('quests')}
                  onStartMatch={(data) => {
                    setActiveMatchData(data || null);
                    setScreen('ARENA');
                  }}
                  initialMatchData={activeMatchData}
                  isNavHidden={isNavHidden}
                />
              </motion.div>
            )}

            {screen === 'AI_MATCH' && (
              <motion.div
                key="ai-match-screen"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="w-full flex-1 flex flex-col"
              >
                <AiMatchScreen
                  stats={stats}
                  updateStats={updateStats}
                  settings={settings}
                  updateSettings={updateSettings}
                  currentUser={currentUser}
                  onBackToMenu={handleBackToMenu}
                  onOpenQuests={() => handleNavigate('SINGLEPLAYER_QUESTS')}
                  onStartMatch={(data) => {
                    setActiveMatchData(data || null);
                    setScreen('ARENA');
                  }}
                  isNavHidden={isNavHidden}
                  setIsNavHidden={setIsNavHidden}
                  isNavExpanded={isNavExpanded}
                  modeSide={singleplayerModeSide}
                  setModeSide={setSingleplayerModeSide}
                  compSubTab={singleplayerCompSubTab}
                  setCompSubTab={setSingleplayerCompSubTab}
                  casualSubTab={singleplayerCasualSubTab}
                  setCasualSubTab={setSingleplayerCasualSubTab}
                  selectedCasualDifficulty={singleplayerDifficulty}
                  setSelectedCasualDifficulty={setSingleplayerDifficulty}
                />
              </motion.div>
            )}

            {screen === 'SINGLEPLAYER_QUESTS' && (
              <motion.div
                key={singleplayerQuestMobileTab === 'milestones' ? 'career-milestones-screen' : 'singleplayer-quests-screen'}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="w-full flex-1 flex flex-col"
              >
                {singleplayerQuestMobileTab === 'milestones' ? (
                  <CareerMilestonesScreen
                    stats={stats}
                    updateStats={updateStats}
                    email={currentUser?.email}
                    onReturnToSingleplayerHub={() => handleNavigate('AI_MATCH')}
                    isNavHidden={isNavHidden}
                    setIsNavHidden={setIsNavHidden}
                    onClaimableCountChange={setSingleplayerQuestClaimableCount}
                  />
                ) : (
                  <SingleplayerQuestsScreen
                    stats={stats}
                    updateStats={updateStats}
                    email={currentUser?.email}
                    onReturnToSingleplayerHub={() => handleNavigate('AI_MATCH')}
                    isNavHidden={isNavHidden}
                    setIsNavHidden={setIsNavHidden}
                    mobileTab={singleplayerQuestMobileTab}
                    setMobileTab={setSingleplayerQuestMobileTab}
                    claimAllTrigger={singleplayerQuestClaimAllTrigger}
                    onClaimableCountChange={setSingleplayerQuestClaimableCount}
                    onUnfoldNav={() => setIsNavHidden(false)}
                  />
                )}
              </motion.div>
            )}

            {screen === 'ARENA' && (
              <motion.div
                key="arena-screen"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="w-full flex-1 flex flex-col"
              >
                <Arena 
                  stats={stats} 
                  updateStats={updateStats} 
                  settings={settings}
                  updateSettings={updateSettings}
                  currentUser={currentUser}
                  onBackToMenu={handleBackToMenu}
                  version={GAME_VERSION}
                  matchData={activeMatchData}
                  isNavHidden={isNavHidden}
                  onCombatStateChange={setIsInCombat}
                  onOpenNav={() => setIsNavHidden(false)}
                />
              </motion.div>
            )}

            {screen === 'HUD_TEST_BOX' && (
              <motion.div
                key="hud-test-box-screen"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="w-full flex-1 flex flex-col"
              >
                <HudTestBox
                  settings={settings}
                  updateSettings={updateSettings}
                  onBackToMenu={() => {
                    setIsNavHidden(false);
                    handleBackToMenu();
                  }}
                  currentUser={currentUser}
                  version={GAME_VERSION}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
