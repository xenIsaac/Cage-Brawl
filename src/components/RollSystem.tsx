import React from 'react';
import CrateUnboxingSystem from './CrateUnboxingSystem';
import { PlayerStats } from '../types';

interface RollSystemProps {
  stats: PlayerStats;
  updateStats: (newStats: Partial<PlayerStats>) => void;
  onBackToMenu: () => void;
  version: string;
  initialSubTab?: any;
  onSubTabChange?: (tab: 'crates' | 'shop' | 'genetics') => void;
  isNavHidden?: boolean;
}

export default function RollSystem(props: RollSystemProps) {
  let mappedSubTab: 'crates' | 'shop' | 'genetics' = 'crates';
  if (props.initialSubTab === 'shop') mappedSubTab = 'shop';
  else if (props.initialSubTab === 'genetics') mappedSubTab = 'genetics';

  return <CrateUnboxingSystem {...props} initialSubTab={mappedSubTab} onSubTabChange={props.onSubTabChange} />;
}
