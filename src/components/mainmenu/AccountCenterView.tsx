import React from 'react';
import AccountCenterModal from '../AccountCenterModal';
import { PlayerStats, UserSession } from '../../types';
import { FighterProfileTab } from '../navigation/FighterProfileNavRail';

interface AccountCenterViewProps {
  stats: PlayerStats;
  updateStats: (updates: Partial<PlayerStats>) => void;
  currentUser: UserSession | null;
  onUpdateUserSession: (sessionUpdates: Partial<UserSession>) => void;
  onClose: () => void;
  onLogout?: () => void;
  onOpenOnlinePlayers?: () => void;
  isNavHidden?: boolean;
  activeProfileTab?: FighterProfileTab;
  setActiveProfileTab?: (tab: FighterProfileTab) => void;
}

export const AccountCenterView: React.FC<AccountCenterViewProps> = (props) => {
  return <AccountCenterModal {...props} />;
};
