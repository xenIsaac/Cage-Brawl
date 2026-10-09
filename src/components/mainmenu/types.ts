import { PlayerStats, GameSettings, GameScreen, FightingStyle, UserSession, MatchData } from '../../types';

export type MainMenuModalType = 
  | 'practice_dojo'
  | 'settings'
  | 'quests'
  | 'account'
  | 'online_players'
  | 'codex'
  | 'game_info'
  | 'hud_editor'
  | null;

export interface MainMenuCommonProps {
  stats: PlayerStats;
  updateStats: (updates: Partial<PlayerStats>) => void;
  settings: GameSettings;
  updateSettings: (updates: Partial<GameSettings>) => void;
  currentUser?: UserSession | null;
  onUpdateUserSession?: (updates: Partial<UserSession>) => void;
  onNavigate: (screen: GameScreen, tab?: 'vs_ai' | 'gacha' | 'spin' | 'genetics' | 'showcase' | 'history') => void;
  onStartMatch?: (matchData: MatchData) => void;
  onLogout?: () => void;
  isNavHidden?: boolean;
}

export interface DummyConfig {
  styleId: string;
  behavior: 'idle' | 'block_only' | 'counter' | 'aggressive' | 'combo_test';
  staminaRecovery: boolean;
  healthRecovery: boolean;
  showHitboxes: boolean;
  infiniteSuper: boolean;
}
