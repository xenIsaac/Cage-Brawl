import React from 'react';
import QuestsAchievementsPanel from '../QuestsAchievementsPanel';
import { PlayerStats } from '../../types';

interface QuestsAchievementsViewProps {
  stats: PlayerStats;
  updateStats: (updates: Partial<PlayerStats>) => void;
  email?: string;
  activeTab?: 'achievements' | 'style_mastery';
  viewMode?: 'online' | 'ai' | 'milestones' | 'all';
  onClose?: () => void;
  isNavHidden?: boolean;
  isNavExpanded?: boolean;
}

export const QuestsAchievementsView: React.FC<QuestsAchievementsViewProps> = (props) => {
  return <QuestsAchievementsPanel {...props} />;
};
