import React from 'react';
import { MainMenuDashboard } from './mainmenu/MainMenuDashboard';
import { PlayerStats, GameSettings, GameScreen, UserSession, MatchData } from '../types';

interface MenuProps {
  stats: PlayerStats;
  updateStats: (newStats: Partial<PlayerStats>) => void;
  settings: GameSettings;
  updateSettings: (newSettings: Partial<GameSettings>) => void;
  onNavigate: (screen: GameScreen, tab?: 'vs_ai' | 'gacha' | 'spin' | 'genetics' | 'showcase' | 'history') => void;
  onStartMatch?: (matchData: MatchData) => void;
  version: string;
  currentUser: any;
  onLogout: () => void;
  onUpdateUserSession?: (updates: Partial<UserSession>) => void;
  isNavHidden?: boolean;
  isNavExpanded?: boolean;
  onOpenTrueNavigation?: () => void;
  hasInitialLoaded?: boolean;
  onInitialLoadComplete?: () => void;
}

export default function Menu(props: MenuProps) {
  return <MainMenuDashboard {...props} />;
}
