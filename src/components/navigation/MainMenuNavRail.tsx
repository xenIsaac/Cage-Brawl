import React from 'react';
import { motion } from 'motion/react';
import { 
  User, Key, Swords, 
  Bot, Target, BookOpen, Trophy, Users, Settings, Info 
} from 'lucide-react';
import { soundManager } from '../SoundManager';

type ScreenType = 'MENU' | 'ROLLING' | 'ARENA' | 'MATCHMAKING' | 'AI_MATCH';
type ModalType = 'settings' | 'quests' | 'account' | 'players' | 'info' | 'practice_dojo' | 'codex' | null;

interface MainMenuNavRailProps {
  isHovered: boolean;
  isMobileOpen: boolean;
  currentScreen: ScreenType;
  activeModal: ModalType;
  rollSubTab?: 'crates' | 'shop' | 'genetics' | 'spin';
  expandedSubMenu?: 'mastery' | null;
  setExpandedSubMenu?: React.Dispatch<React.SetStateAction<'mastery' | null>>;
  onNavigateScreen: (screen: ScreenType, subTab?: 'crates' | 'shop' | 'genetics' | 'spin') => void;
  onOpenModal: (modal: ModalType) => void;
  onCloseModal: () => void;
  handleItemClick: (action: () => void) => void;
}

export const MainMenuNavRail: React.FC<MainMenuNavRailProps> = ({
  isHovered,
  isMobileOpen,
  currentScreen,
  activeModal,
  rollSubTab = 'spin',
  expandedSubMenu,
  setExpandedSubMenu,
  onNavigateScreen,
  onOpenModal,
  onCloseModal,
  handleItemClick,
}) => {
  const isTabActive = (screen: ScreenType, modal?: ModalType, subTab?: string) => {
    if (modal) return activeModal === modal;
    if (activeModal !== null) return false;
    if (subTab) return currentScreen === screen && rollSubTab === subTab;
    return currentScreen === screen;
  };

  return (
    <motion.div
      key="main_mode_nav"
      initial={{ opacity: 0, x: 25 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="flex flex-col gap-1.5 w-full"
    >
      {/* TAB 1: MAIN MENU */}
      <button
        onClick={() => handleItemClick(() => {
          onCloseModal();
          onNavigateScreen('MENU');
        })}
        className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition cursor-pointer group text-left relative ${
          isTabActive('MENU')
            ? 'bg-red-600/20 border border-red-500/50 text-white font-bold'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
        }`}
      >
        {isTabActive('MENU') && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-red-500 rounded-r shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
        )}
        <User className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${isTabActive('MENU') ? 'text-red-400' : 'text-zinc-400'}`} />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className="font-display font-black italic uppercase text-xs text-white">Main Menu</div>
          <div className="text-[9px] text-zinc-500 font-mono">Fighter Arena & Dashboard</div>
        </div>
      </button>

      {/* TAB 2: CRATE SANCTUM (Direct Tap - sends you directly to Crate Sanctum with its own daughter rail) */}
      <button
        onClick={() => handleItemClick(() => {
          onCloseModal();
          onNavigateScreen('ROLLING', 'crates');
        })}
        className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition cursor-pointer group text-left relative border ${
          isTabActive('ROLLING')
            ? 'bg-amber-600/20 border-amber-500/60 text-amber-300 font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)]'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border-transparent'
        }`}
        title="Crate Sanctum (Fighter Crates, Key Store & Genetics Lab)"
      >
        {isTabActive('ROLLING') && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-amber-400 rounded-r shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
        )}
        <Key className={`w-5 h-5 text-amber-400 shrink-0 transition-transform group-hover:scale-110 group-hover:rotate-12 ${isTabActive('ROLLING') ? 'animate-pulse' : ''}`} />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className="font-display font-black italic uppercase text-xs text-white">Crate Sanctum</div>
          <div className="text-[9px] text-zinc-500 font-mono">Fighter Crates & Keys</div>
        </div>
      </button>

      {/* TAB 3: ONLINE ARENA */}
      <button
        onClick={() => handleItemClick(() => {
          onCloseModal();
          onNavigateScreen('MATCHMAKING');
        })}
        className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition cursor-pointer group text-left relative ${
          isTabActive('MATCHMAKING')
            ? 'bg-red-600/20 border border-red-500/50 text-white font-bold'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
        }`}
      >
        {isTabActive('MATCHMAKING') && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-red-500 rounded-r shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
        )}
        <Swords className={`w-5 h-5 text-red-500 shrink-0 transition-transform group-hover:scale-110 ${isTabActive('MATCHMAKING') ? 'animate-pulse' : ''}`} />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className="font-display font-black italic uppercase text-xs text-white">Online Arena</div>
          <div className="text-[9px] text-zinc-500 font-mono">Ranked & Casual Matches</div>
        </div>
      </button>

      {/* TAB 4: SINGLEPLAYER */}
      <button
        onClick={() => handleItemClick(() => {
          onCloseModal();
          onNavigateScreen('AI_MATCH');
        })}
        className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition cursor-pointer group text-left relative ${
          isTabActive('AI_MATCH')
            ? 'bg-cyan-600/20 border border-cyan-500/50 text-white font-bold'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
        }`}
      >
        {isTabActive('AI_MATCH') && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-cyan-400 rounded-r shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
        )}
        <Bot className={`w-5 h-5 text-cyan-400 shrink-0 transition-transform group-hover:scale-110 ${isTabActive('AI_MATCH') ? 'animate-pulse' : ''}`} />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className="font-display font-black italic uppercase text-xs text-white">Singleplayer</div>
          <div className="text-[9px] text-zinc-500 font-mono">Ranked, Casual & Bots</div>
        </div>
      </button>

      {/* TAB 5: PRACTICE DOJO */}
      <button
        onClick={() => handleItemClick(() => {
          onCloseModal();
          onNavigateScreen('ARENA');
        })}
        className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition cursor-pointer group text-left relative ${
          isTabActive('ARENA')
            ? 'bg-emerald-600/20 border border-emerald-500/50 text-white font-bold'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
        }`}
      >
        <Target className="w-5 h-5 text-emerald-400 shrink-0 transition-transform group-hover:scale-110" />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className="font-display font-black italic uppercase text-xs text-white">Practice Dojo</div>
          <div className="text-[9px] text-zinc-500 font-mono">Freeform AI Arena</div>
        </div>
      </button>

      {/* TAB 6: COMBAT CODEX */}
      <button
        onClick={() => handleItemClick(() => {
          onOpenModal('codex');
        })}
        className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition cursor-pointer group text-left relative ${
          isTabActive(currentScreen, 'codex')
            ? 'bg-blue-600/20 border border-blue-500/50 text-white font-bold'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
        }`}
      >
        {isTabActive(currentScreen, 'codex') && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-blue-400 rounded-r shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
        )}
        <BookOpen className="w-5 h-5 text-blue-400 shrink-0 transition-transform group-hover:scale-110" />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className="font-display font-black italic uppercase text-xs text-white">Combat Codex</div>
          <div className="text-[9px] text-zinc-500 font-mono">Martial Arts Encyclopedia</div>
        </div>
      </button>

      {/* TAB 7: QUESTS & ACHIEVEMENTS */}
      <button
        onClick={() => handleItemClick(() => {
          onOpenModal('quests');
        })}
        className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition cursor-pointer group text-left relative ${
          isTabActive(currentScreen, 'quests')
            ? 'bg-amber-600/20 border border-amber-500/50 text-white font-bold'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
        }`}
      >
        {isTabActive(currentScreen, 'quests') && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-amber-400 rounded-r shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
        )}
        <Trophy className="w-5 h-5 text-amber-400 shrink-0 transition-transform group-hover:scale-110" />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className="font-display font-black italic uppercase text-xs text-white">Quests & Badges</div>
          <div className="text-[9px] text-zinc-500 font-mono">Achievements & Rewards</div>
        </div>
      </button>

      {/* TAB 8: ONLINE FIGHTERS */}
      <button
        onClick={() => handleItemClick(() => {
          onOpenModal('players');
        })}
        className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition cursor-pointer group text-left relative ${
          isTabActive(currentScreen, 'players')
            ? 'bg-indigo-600/20 border border-indigo-500/50 text-white font-bold'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
        }`}
      >
        <Users className="w-5 h-5 text-indigo-400 shrink-0 transition-transform group-hover:scale-110" />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className="font-display font-black italic uppercase text-xs text-white">Online Lobby</div>
          <div className="text-[9px] text-zinc-500 font-mono">Fighters Online</div>
        </div>
      </button>

      {/* TAB 9: ACCOUNT CENTER */}
      <button
        onClick={() => handleItemClick(() => {
          onOpenModal('account');
        })}
        className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition cursor-pointer group text-left relative ${
          isTabActive(currentScreen, 'account')
            ? 'bg-purple-600/20 border border-purple-500/50 text-white font-bold'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
        }`}
      >
        <User className="w-5 h-5 text-purple-400 shrink-0 transition-transform group-hover:scale-110" />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className="font-display font-black italic uppercase text-xs text-white">Fighter Profile</div>
          <div className="text-[9px] text-zinc-500 font-mono">Account & History</div>
        </div>
      </button>

      {/* TAB 10: SETTINGS */}
      <button
        onClick={() => handleItemClick(() => {
          onOpenModal('settings');
        })}
        className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition cursor-pointer group text-left relative ${
          isTabActive(currentScreen, 'settings')
            ? 'bg-cyan-600/20 border border-cyan-500/50 text-white font-bold'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
        }`}
      >
        <Settings className="w-5 h-5 text-cyan-400 shrink-0 transition-transform group-hover:scale-110" />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className="font-display font-black italic uppercase text-xs text-white">Settings</div>
          <div className="text-[9px] text-zinc-500 font-mono">Controls & Audio</div>
        </div>
      </button>

      {/* TAB 11: GAME INFO */}
      <button
        onClick={() => handleItemClick(() => {
          onOpenModal('info');
        })}
        className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition cursor-pointer group text-left relative ${
          isTabActive(currentScreen, 'info')
            ? 'bg-emerald-600/20 border border-emerald-500/50 text-white font-bold'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
        }`}
      >
        <Info className="w-5 h-5 text-emerald-400 shrink-0 transition-transform group-hover:scale-110" />
        <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered || isMobileOpen ? 'opacity-100 max-w-[170px]' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <div className="font-display font-black italic uppercase text-xs text-white">Patch Notes</div>
          <div className="text-[9px] text-zinc-500 font-mono">Changelog & System</div>
        </div>
      </button>
    </motion.div>
  );
};
