import React from 'react';
import { 
  Swords, Trophy, Dices, Zap, BookOpen, Award, User, Settings, Info 
} from 'lucide-react';
import { soundManager } from '../SoundManager';

interface MainMenuNavRailProps {
  isHovered: boolean;
  isMobileOpen: boolean;
  currentScreen: string;
  activeModal: string | null;
  rollSubTab?: string;
  expandedSubMenu: string | null;
  setExpandedSubMenu: (val: string | null) => void;
  onNavigateScreen: (screen: any, tab?: any) => void;
  onOpenModal: (modal: any) => void;
  onCloseModal: () => void;
  handleItemClick: (e: any, action: () => void) => void;
}

export const MainMenuNavRail: React.FC<MainMenuNavRailProps> = ({
  isHovered,
  isMobileOpen,
  currentScreen,
  activeModal,
  onNavigateScreen,
  onOpenModal,
  handleItemClick,
}) => {
  const isExpanded = isHovered || isMobileOpen;

  const items = [
    {
      id: 'singleplayer',
      label: 'Singleplayer',
      icon: Swords,
      color: 'text-red-400',
      active: currentScreen === 'AI_MATCH',
      action: () => onNavigateScreen('AI_MATCH'),
    },
    {
      id: 'ranked',
      label: 'Ranked 1v1',
      icon: Trophy,
      color: 'text-amber-400',
      active: currentScreen === 'MATCHMAKING',
      action: () => onNavigateScreen('MATCHMAKING'),
    },
    {
      id: 'crates',
      label: 'Crates & Vault',
      icon: Dices,
      color: 'text-purple-400',
      active: currentScreen === 'ROLLING',
      action: () => onNavigateScreen('ROLLING', 'crates'),
    },
    {
      id: 'codex',
      label: 'Codex',
      icon: BookOpen,
      color: 'text-blue-400',
      active: activeModal === 'codex',
      action: () => onOpenModal('codex'),
    },
    {
      id: 'quests',
      label: 'Quests',
      icon: Award,
      color: 'text-cyan-400',
      active: activeModal === 'quests',
      action: () => onOpenModal('quests'),
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      color: 'text-fuchsia-400',
      active: activeModal === 'account',
      action: () => onOpenModal('account'),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      color: 'text-white',
      active: activeModal === 'settings',
      action: () => onOpenModal('settings'),
    },
    {
      id: 'info',
      label: 'Game Info',
      icon: Info,
      color: 'text-zinc-400',
      active: activeModal === 'info',
      action: () => onOpenModal('info'),
    },
  ];

  return (
    <div className="flex flex-col gap-1 w-full">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={(e) => handleItemClick(e, item.action)}
            className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl transition cursor-pointer select-none ${
              item.active
                ? 'bg-red-600/20 border border-red-500/50 text-white font-bold'
                : 'hover:bg-zinc-900/80 text-zinc-400 hover:text-white border border-transparent'
            }`}
          >
            <Icon className={`w-5 h-5 shrink-0 ${item.color}`} />
            {isExpanded && (
              <span className="text-xs font-mono font-black uppercase tracking-wider truncate">
                {item.label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
