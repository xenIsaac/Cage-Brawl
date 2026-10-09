import React from 'react';
import HudEditorModal from '../HudEditorModal';
import { GameSettings, UserSession } from '../../types';

interface HudEditorViewProps {
  settings: GameSettings;
  updateSettings: (updates: Partial<GameSettings>) => void;
  onClose: () => void;
  isNavHidden?: boolean;
  currentUser?: UserSession | null;
  onLaunchTestGame?: () => void;
  onLaunchLiveLobby?: () => void;
}

export const HudEditorView: React.FC<HudEditorViewProps> = (props) => {
  return <HudEditorModal {...props} />;
};
