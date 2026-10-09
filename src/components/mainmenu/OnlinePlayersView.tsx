import React from 'react';
import OnlinePlayerListModal from '../OnlinePlayerListModal';
import { PlayerStats, UserSession, MatchData } from '../../types';

interface OnlinePlayersViewProps {
  currentUser?: UserSession;
  stats?: PlayerStats;
  onClose: () => void;
  onStartMatch?: (matchData: MatchData) => void;
  onStart1v1Match?: (opponent: any) => void;
  isNavHidden?: boolean;
}

export const OnlinePlayersView: React.FC<OnlinePlayersViewProps> = (props) => {
  return <OnlinePlayerListModal {...props} />;
};
