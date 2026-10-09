import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import { Menu as MenuIcon, ChevronRight, Lock, Swords, Target, Sparkles, Layers, Flame, Award, BookOpen, ShieldAlert, Zap } from 'lucide-react';
import { soundManager } from './SoundManager';
import { PlayerStats, GameScreen } from '../types';
import { isMobileDevice } from '../utils/deviceDetection';

// Daughter Navigation Scripts
import { SingleplayerNavRail } from './navigation/SingleplayerNavRail';
import { CodexNavRail } from './navigation/CodexNavRail';
import { QuestsNavRail } from './navigation/QuestsNavRail';
import { MainMenuNavRail } from './navigation/MainMenuNavRail';
import { SingleplayerQuestsNavRail } from './navigation/SingleplayerQuestsNavRail';
import { SettingsNavRail, SettingsCategoryTab } from './navigation/SettingsNavRail';
import { GameInfoNavRail, GameInfoTab } from './navigation/GameInfoNavRail';
import { CrateSanctumNavRail, CrateSanctumTab } from './navigation/CrateSanctumNavRail';
import { FighterProfileNavRail, FighterProfileTab } from './navigation/FighterProfileNavRail';

export type ScreenType = GameScreen;
export type ModalType = 'codex' | 'quests' | 'account' | 'players' | 'settings' | 'hud' | 'info' | null;
export type CodexSortMode = 'class' | 'origin' | 'specialty' | 'tier';

export const CODEX_SORT_CATEGORIES: Record<CodexSortMode, { id: string; label: string; subLabel: string; color: string; bg: string; border: string; activeBorder: string; icon: any }[]> = {
  class: [
    { id: 'all', label: 'All Styles', subLabel: 'Complete Roster', color: 'text-amber-300', bg: 'bg-amber-500/20', border: 'border-amber-500/40', activeBorder: 'border-amber-400', icon: Swords },
    { id: 'Striker', label: 'Striker', subLabel: 'Direct Impacts', color: 'text-amber-400', bg: 'bg-gradient-to-r from-amber-950/80 to-zinc-900', border: 'border-amber-500/30', activeBorder: 'border-amber-400', icon: Swords },
    { id: 'Grappler', label: 'Grappler', subLabel: 'Locks & Throws', color: 'text-cyan-400', bg: 'bg-gradient-to-r from-cyan-950/80 to-zinc-900', border: 'border-cyan-500/30', activeBorder: 'border-cyan-400', icon: Target },
    { id: 'Hybrid', label: 'Hybrid', subLabel: 'Mixed Arts', color: 'text-purple-400', bg: 'bg-gradient-to-r from-purple-950/80 to-zinc-900', border: 'border-purple-500/30', activeBorder: 'border-purple-400', icon: Sparkles },
  ],
  origin: [
    { id: 'all', label: 'All Styles', subLabel: 'Worldwide Lineage', color: 'text-amber-300', bg: 'bg-amber-500/20', border: 'border-amber-500/40', activeBorder: 'border-amber-400', icon: Layers },
    { id: 'Street', label: 'Street Combat', subLabel: 'Underground Brawling', color: 'text-rose-400', bg: 'bg-gradient-to-r from-rose-950/80 to-zinc-900', border: 'border-rose-500/30', activeBorder: 'border-rose-400', icon: Flame },
    { id: 'Professional', label: 'Professional Ring', subLabel: 'Sanctioned Disciplines', color: 'text-emerald-400', bg: 'bg-gradient-to-r from-emerald-950/80 to-zinc-900', border: 'border-emerald-500/30', activeBorder: 'border-emerald-400', icon: Award },
    { id: 'Fiction', label: 'Traditional / Lore', subLabel: 'Ancient Martial Lineage', color: 'text-indigo-400', bg: 'bg-gradient-to-r from-indigo-950/80 to-zinc-900', border: 'border-indigo-500/30', activeBorder: 'border-indigo-400', icon: BookOpen },
  ],
  specialty: [
    { id: 'all', label: 'All Styles', subLabel: 'Tactical Directives', color: 'text-amber-300', bg: 'bg-amber-500/20', border: 'border-amber-500/40', activeBorder: 'border-amber-400', icon: Layers },
    { id: 'Combo', label: 'Combo Strings', subLabel: 'High Volume Pressure', color: 'text-yellow-400', bg: 'bg-gradient-to-r from-yellow-950/80 to-zinc-900', border: 'border-yellow-500/30', activeBorder: 'border-yellow-400', icon: Swords },
    { id: 'Punish', label: 'Punish & Counters', subLabel: 'Heavy Whiff Exploits', color: 'text-red-400', bg: 'bg-gradient-to-r from-red-950/80 to-zinc-900', border: 'border-red-500/30', activeBorder: 'border-red-400', icon: ShieldAlert },
  ],
  tier: [
    { id: 'all', label: 'All Styles', subLabel: 'Physical Cadence', color: 'text-amber-300', bg: 'bg-amber-500/20', border: 'border-amber-500/40', activeBorder: 'border-amber-400', icon: Layers },
    { id: 'Light', label: 'Light Class', subLabel: 'Rapid Startup & Agile', color: 'text-cyan-300', bg: 'bg-gradient-to-r from-cyan-950/80 to-zinc-900', border: 'border-cyan-500/30', activeBorder: 'border-cyan-400', icon: Zap },
    { id: 'Heavy', label: 'Heavy Class', subLabel: 'Armor & Poise Mass', color: 'text-amber-300', bg: 'bg-gradient-to-r from-amber-950/80 to-zinc-900', border: 'border-amber-500/30', activeBorder: 'border-amber-400', icon: Swords },
  ],
};

interface LeftNavRailProps {
  currentScreen: ScreenType;
  activeModal: ModalType;
  rollSubTab?: 'crates' | 'shop' | 'genetics' | 'spin';
  achievementsSubTab?: 'achievements' | 'style_mastery';
  setAchievementsSubTab?: (tab: 'achievements' | 'style_mastery') => void;
  codexSortMode?: CodexSortMode;
  setCodexSortMode?: (mode: CodexSortMode) => void;
  codexSelectedCategory?: string;
  setCodexSelectedCategory?: (cat: string) => void;
  codexSelectedStyleId?: string;
  setCodexSelectedStyleId?: (id: string) => void;
  singleplayerModeSide?: 'competitive' | 'casual';
  setSingleplayerModeSide?: (mode: 'competitive' | 'casual') => void;
  singleplayerCompSubTab?: 'ranked_ai' | 'tournament' | 'boss_raids';
  setSingleplayerCompSubTab?: (tab: 'ranked_ai' | 'tournament' | 'boss_raids') => void;
  singleplayerCasualSubTab?: 'casual_1v1' | 'ai_vs_ai' | 'upcoming';
  setSingleplayerCasualSubTab?: (tab: 'casual_1v1' | 'ai_vs_ai' | 'upcoming') => void;
  singleplayerDifficulty?: 'rookie' | 'silver' | 'gold' | 'diamond' | 'amethyst';
  setSingleplayerDifficulty?: (diff: 'rookie' | 'silver' | 'gold' | 'diamond' | 'amethyst') => void;
  onOpenGameRules?: () => void;
  onOpenSingleplayerQuests?: () => void;
  singleplayerQuestMobileTab?: 'quests' | 'milestones';
  setSingleplayerQuestMobileTab?: (tab: 'quests' | 'milestones') => void;
  onSingleplayerQuestClaimAll?: () => void;
  singleplayerQuestClaimableCount?: number;
  onReturnToSingleplayerHub?: () => void;
  settingsActiveCategory?: SettingsCategoryTab;
  setSettingsActiveCategory?: (cat: SettingsCategoryTab) => void;
  settingsSearchQuery?: string;
  setSettingsSearchQuery?: (q: string) => void;
  gameInfoActiveTab?: GameInfoTab;
  setGameInfoActiveTab?: (tab: GameInfoTab) => void;
  fighterProfileActiveTab?: FighterProfileTab;
  setFighterProfileActiveTab?: (tab: FighterProfileTab) => void;
  crateSanctumSubTab?: CrateSanctumTab;
  setCrateSanctumSubTab?: (tab: CrateSanctumTab) => void;
  onNavigateScreen: (screen: ScreenType, subTab?: 'crates' | 'shop' | 'genetics' | 'spin') => void;
  onOpenModal: (modal: ModalType) => void;
  onCloseModal: () => void;
  version: string;
  isFullyHidden: boolean;
  setIsFullyHidden: (hidden: boolean) => void;
  isInCombat?: boolean;
  stats?: PlayerStats;
  email?: string;
  onNavExpandChange?: (expanded: boolean) => void;
}

export default function LeftNavRail({
  currentScreen,
  activeModal,
  rollSubTab = 'spin',
  achievementsSubTab = 'achievements',
  setAchievementsSubTab,
  fighterProfileActiveTab = 'public',
  setFighterProfileActiveTab,
  onNavigateScreen,
  onOpenModal,
  onCloseModal,
  version,
  isFullyHidden,
  setIsFullyHidden,
  isInCombat = false,
  stats,
  email = '',
  onNavExpandChange,
  codexSortMode = 'class',
  setCodexSortMode,
  codexSelectedCategory = 'all',
  setCodexSelectedCategory,
  codexSelectedStyleId,
  setCodexSelectedStyleId,
  singleplayerModeSide = 'competitive',
  setSingleplayerModeSide,
  singleplayerCompSubTab = 'ranked_ai',
  setSingleplayerCompSubTab,
  singleplayerCasualSubTab = 'casual_1v1',
  setSingleplayerCasualSubTab,
  singleplayerDifficulty = 'silver',
  setSingleplayerDifficulty,
  onOpenGameRules,
  onOpenSingleplayerQuests,
  singleplayerQuestMobileTab = 'quests',
  setSingleplayerQuestMobileTab,
  onSingleplayerQuestClaimAll,
  singleplayerQuestClaimableCount = 0,
  onReturnToSingleplayerHub,
  settingsActiveCategory = 'all',
  setSettingsActiveCategory,
  settingsSearchQuery = '',
  setSettingsSearchQuery,
  gameInfoActiveTab = 'latest',
  setGameInfoActiveTab,
  crateSanctumSubTab = 'crates',
  setCrateSanctumSubTab,
}: LeftNavRailProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedSubMenu, setExpandedSubMenu] = useState<'mastery' | null>(null);
  const [backdropInteractive, setBackdropInteractive] = useState(false);
  const lastOpenTimeRef = useRef<number>(0);

  // Auto-fold any unfolded buttons/submenus when navigation is in Minimized Mode
  useEffect(() => {
    if (!isHovered && !isMobileOpen) {
      setExpandedSubMenu(null);
    }
  }, [isHovered, isMobileOpen]);

  // Cycle Codex Sort Mode
  const handleCycleSortMode = () => {
    if (!setCodexSortMode) return;
    const nextMap: Record<CodexSortMode, CodexSortMode> = {
      class: 'origin',
      origin: 'specialty',
      specialty: 'tier',
      tier: 'class',
    };
    const next = nextMap[codexSortMode] || 'class';
    setCodexSortMode(next);
    if (setCodexSelectedCategory) setCodexSelectedCategory('all');
    soundManager.playRollTick?.();
  };

  // Safe navigation item click handler
  const handleItemClick = (action: () => void, shouldCloseNav: boolean = false) => {
    setIsFullyHidden(false);
    action();
    soundManager.playRollTick?.();
    // "Unfolding/folding navtab ui Buttons Do not fold the Navigation tab. (it folds when you tap the triple line.)"
    // Only close drawer if explicitly intended (e.g. exit/return to another screen, or clicking backdrop)
    if (shouldCloseNav && (isMobileDevice() || window.innerWidth < 1024)) {
      setIsMobileOpen(false);
      setIsHovered(false);
    }
  };

  // Notify parent component when rail expands or collapses
  // CRITICAL: On mobile or landscape devices, the rail expands as an overlay drawer and NEVER squishes/pushes the main UI!
  useEffect(() => {
    if (onNavExpandChange) {
      const isMobile = isMobileDevice();
      const isNarrowOrLandscape = window.innerWidth < 1024 || (window.innerHeight < 600 && window.innerWidth < 1200);
      
      if (isMobile || isNarrowOrLandscape) {
        // Floating overlay mode - do not squish UI!
        onNavExpandChange(false);
      } else {
        onNavExpandChange(!isInCombat && (isMobileOpen || isHovered));
      }
    }
  }, [isHovered, isMobileOpen, isInCombat, onNavExpandChange]);

  const openMobileMenu = () => {
    setIsMobileOpen(true);
    setBackdropInteractive(false);
    setTimeout(() => {
      setBackdropInteractive(true);
    }, 400);
  };

  return (
    <>
      {/* FLOATING UNFOLD ARROW TAB (When rail is fully hidden) */}
      {isFullyHidden && (
        <button
          onClick={() => {
            if (isInCombat) return;
            setIsFullyHidden(false);
            openMobileMenu();
            soundManager.playRollTick?.();
          }}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-[150] py-4 px-2.5 bg-gradient-to-r from-red-950 via-zinc-900 to-zinc-950 hover:from-red-900 hover:to-zinc-900 border-y border-r-2 border-red-500 hover:border-red-400 rounded-r-2xl shadow-[0_0_30px_rgba(239,68,68,0.7)] flex flex-col items-center gap-1.5 cursor-pointer group active:scale-95 transition-all duration-200"
          title="Unfold Navigation Rail"
          aria-label="Unfold Navigation Rail"
        >
          <ChevronRight className="w-5 h-5 text-red-400 group-hover:text-white group-hover:translate-x-1 transition-transform animate-pulse" />
          <span className="text-[8px] font-mono font-black uppercase text-red-300 group-hover:text-white [writing-mode:vertical-lr] tracking-widest">
            UNFOLD
          </span>
        </button>
      )}

      {/* MOBILE BACKDROP OVERLAY */}
      {isMobileOpen && (
        <div 
          onClick={() => {
            if (!backdropInteractive) return;
            setIsMobileOpen(false);
            setIsHovered(false);
            setExpandedSubMenu(null);
            soundManager.playRollTick();
          }}
          className={`fixed inset-0 z-[125] bg-black/60 backdrop-blur-xs transition-opacity duration-300 ${
            backdropInteractive ? 'cursor-pointer pointer-events-auto' : 'pointer-events-none'
          }`}
          aria-hidden="true"
        />
      )}

      {/* DOCKED LEFT NAVIGATION RAIL */}
      <aside 
        onMouseEnter={() => {
          if (isInCombat) return;
          // Only trigger hover on actual mouse pointer devices (prevents touch tap from sticking in hovered state!)
          if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(hover: hover)').matches) {
            setIsHovered(true);
          }
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          setExpandedSubMenu(null);
        }}
        className={`fixed left-0 top-0 bottom-0 z-[130] bg-zinc-950/95 border-r border-zinc-800/80 backdrop-blur-2xl shadow-[16px_0_40px_rgba(0,0,0,0.9)] transition-all duration-200 ease-out flex flex-col justify-between py-3 px-2 overflow-y-auto overflow-x-hidden custom-scrollbar select-none ${
          isFullyHidden
            ? '-translate-x-full pointer-events-none invisible'
            : 'translate-x-0'
        } ${
          !isInCombat && (isMobileOpen || isHovered)
            ? 'w-64'
            : 'w-14 sm:w-16'
        } ${isInCombat ? 'pointer-events-none opacity-45' : ''}`}
      >
        {/* TOP BRANDING & NAVIGATION HEADER */}
        <div className="flex flex-col gap-3 shrink-0">
          <div className="flex items-center gap-3 px-1 min-h-[40px]">
            <button
              onClick={() => {
                if (isInCombat) return;
                const now = Date.now();
                if (now - lastOpenTimeRef.current < 350 && lastOpenTimeRef.current > 0) {
                  // Double tap puts rail on Hide Mode
                  setIsFullyHidden(true);
                  setIsMobileOpen(false);
                  setIsHovered(false);
                  soundManager.playRollTick();
                  lastOpenTimeRef.current = 0;
                  return;
                }
                lastOpenTimeRef.current = now;

                if (isFullyHidden) {
                  setIsFullyHidden(false);
                  openMobileMenu();
                } else if (isMobileOpen) {
                  setIsMobileOpen(false);
                  setIsHovered(false);
                } else {
                  openMobileMenu();
                }
                soundManager.playRollTick();
              }}
              onDoubleClick={() => {
                if (isInCombat) return;
                setIsFullyHidden(true);
                setIsMobileOpen(false);
                setIsHovered(false);
                soundManager.playRollTick();
              }}
              disabled={isInCombat}
              title={isInCombat ? 'Combat in progress - Navigation locked' : 'Click to Toggle / Double Click for Hide Mode'}
              className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shrink-0 transition ${
                isInCombat
                  ? 'bg-zinc-900/80 border border-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-red-600/20 border border-red-500/40 hover:bg-red-600/30 text-red-400 cursor-pointer active:scale-95'
              }`}
            >
              {isInCombat ? (
                <Lock className="w-4 h-4 text-amber-500/80" />
              ) : (
                <MenuIcon className="w-5 h-5" />
              )}
            </button>

            <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap flex items-center justify-between w-full ${
              isHovered || isMobileOpen ? 'opacity-100 max-w-[180px]' : 'opacity-0 max-w-0 pointer-events-none'
            }`}>
              <div>
                <h2 className="text-sm font-display font-black italic uppercase tracking-wider text-white">
                  CAGE BRAWL
                </h2>
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">
                  System Hub
                </span>
              </div>
              <button
                onClick={() => {
                  setIsFullyHidden(false);
                  setIsMobileOpen(false);
                  setIsHovered(false);
                  setExpandedSubMenu(null);
                  soundManager.playRollTick();
                }}
                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer active:scale-95"
                title="Retract to Rail"
                aria-label="Retract to Rail"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>

          {isInCombat && (
            <div className="w-full flex items-center justify-center py-0.5">
              <span className="text-[8px] font-mono font-black uppercase tracking-wider text-amber-400 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                <span className={isMobileOpen || isHovered ? 'inline' : 'hidden'}>COMBAT</span>
              </span>
            </div>
          )}

          <div className="w-full h-px bg-zinc-800/80" />

          {/* MAIN TABS LIST WITH SMOOTH DAUGHTER TRANSITION */}
          <nav className="flex flex-col gap-1.5 font-mono text-xs overflow-hidden">
            <AnimatePresence initial={false}>
              {/* DAUGHTER 0: FIGHTER PROFILE NAV RAIL */}
              {activeModal === 'account' ? (
                <FighterProfileNavRail
                  isHovered={isHovered}
                  isMobileOpen={isMobileOpen}
                  activeTab={fighterProfileActiveTab}
                  setActiveTab={(tab) => {
                    if (setFighterProfileActiveTab) setFighterProfileActiveTab(tab);
                  }}
                  onExit={() => {
                    setIsFullyHidden(false);
                    onCloseModal();
                  }}
                  handleItemClick={handleItemClick}
                />
              ) : activeModal === 'quests' ? (
                /* DAUGHTER 1: QUESTS NAV RAIL */
                <QuestsNavRail
                  isHovered={isHovered}
                  isMobileOpen={isMobileOpen}
                  achievementsSubTab={achievementsSubTab}
                  setAchievementsSubTab={setAchievementsSubTab}
                  onExitToMenu={() => {
                    setIsFullyHidden(false);
                    onCloseModal();
                    onNavigateScreen('MENU');
                  }}
                  handleItemClick={handleItemClick}
                />
              ) : activeModal === 'codex' ? (
                /* DAUGHTER 2: CODEX NAV RAIL */
                <CodexNavRail
                  isHovered={isHovered}
                  isMobileOpen={isMobileOpen}
                  codexSortMode={codexSortMode}
                  handleCycleSortMode={handleCycleSortMode}
                  codexSelectedCategory={codexSelectedCategory}
                  setCodexSelectedCategory={setCodexSelectedCategory}
                  codexSelectedStyleId={codexSelectedStyleId}
                  setCodexSelectedStyleId={setCodexSelectedStyleId}
                  onCloseModal={onCloseModal}
                  onOpenGameRules={onOpenGameRules}
                  handleItemClick={handleItemClick}
                  equippedStyleId={stats?.selectedStyleId}
                />
              ) : activeModal === 'settings' ? (
                /* DAUGHTER 2B: SETTINGS NAV RAIL */
                <SettingsNavRail
                  isHovered={isHovered}
                  isMobileOpen={isMobileOpen}
                  activeCategory={settingsActiveCategory}
                  setActiveCategory={setSettingsActiveCategory || (() => {})}
                  searchQuery={settingsSearchQuery}
                  setSearchQuery={setSettingsSearchQuery || (() => {})}
                  onExit={() => {
                    setIsFullyHidden(false);
                    onCloseModal();
                  }}
                  handleItemClick={handleItemClick}
                />
              ) : activeModal === 'info' ? (
                /* DAUGHTER 2C: GAME INFO NAV RAIL */
                <GameInfoNavRail
                  isHovered={isHovered}
                  isMobileOpen={isMobileOpen}
                  activeTab={gameInfoActiveTab}
                  setActiveTab={setGameInfoActiveTab || (() => {})}
                  onExit={() => {
                    setIsFullyHidden(false);
                    onCloseModal();
                  }}
                  handleItemClick={handleItemClick}
                />
              ) : currentScreen === 'ROLLING' && !activeModal ? (
                /* DAUGHTER 2D: CRATE SANCTUM NAV RAIL */
                <CrateSanctumNavRail
                  isHovered={isHovered}
                  isMobileOpen={isMobileOpen}
                  activeSubTab={crateSanctumSubTab as any || 'crates'}
                  setActiveSubTab={(tab) => {
                    if (setCrateSanctumSubTab) setCrateSanctumSubTab(tab);
                  }}
                  onExitToMenu={() => {
                    setIsFullyHidden(false);
                    onCloseModal();
                    onNavigateScreen('MENU');
                  }}
                  handleItemClick={handleItemClick}
                />
              ) : currentScreen === 'SINGLEPLAYER_QUESTS' && !activeModal ? (
                /* DAUGHTER 3A: SINGLEPLAYER QUESTS NAV RAIL */
                <SingleplayerQuestsNavRail
                  isHovered={isHovered}
                  isMobileOpen={isMobileOpen}
                  mobileTab={singleplayerQuestMobileTab}
                  setMobileTab={setSingleplayerQuestMobileTab || (() => {})}
                  onReturnToSingleplayer={() => {
                    setIsFullyHidden(false);
                    if (onReturnToSingleplayerHub) {
                      onReturnToSingleplayerHub();
                    } else {
                      onNavigateScreen('AI_MATCH');
                    }
                  }}
                  onClaimAll={onSingleplayerQuestClaimAll || (() => {})}
                  claimableCount={singleplayerQuestClaimableCount || 0}
                  handleItemClick={handleItemClick}
                />
              ) : currentScreen === 'AI_MATCH' && !activeModal ? (
                /* DAUGHTER 3: SINGLEPLAYER NAV RAIL (WITH QUESTS UNDER SWAP) */
                <SingleplayerNavRail
                  isHovered={isHovered}
                  isMobileOpen={isMobileOpen}
                  singleplayerModeSide={singleplayerModeSide}
                  setSingleplayerModeSide={setSingleplayerModeSide}
                  singleplayerCompSubTab={singleplayerCompSubTab}
                  setSingleplayerCompSubTab={setSingleplayerCompSubTab}
                  singleplayerCasualSubTab={singleplayerCasualSubTab}
                  setSingleplayerCasualSubTab={setSingleplayerCasualSubTab}
                  singleplayerDifficulty={singleplayerDifficulty}
                  setSingleplayerDifficulty={setSingleplayerDifficulty}
                  onExitToMenu={() => {
                    setIsFullyHidden(false);
                    onCloseModal();
                    onNavigateScreen('MENU');
                  }}
                  onOpenQuests={() => {
                    setIsFullyHidden(false);
                    if (onOpenSingleplayerQuests) {
                      onOpenSingleplayerQuests();
                    } else {
                      onNavigateScreen('SINGLEPLAYER_QUESTS' as any);
                    }
                  }}
                  onToggleHide={() => {
                    setIsFullyHidden(true);
                    setIsMobileOpen(false);
                    setIsHovered(false);
                    soundManager.playRollTick?.();
                  }}
                  handleItemClick={handleItemClick}
                />
              ) : (
                /* DAUGHTER 4: MAIN MENU NAV RAIL */
                <MainMenuNavRail
                  isHovered={isHovered}
                  isMobileOpen={isMobileOpen}
                  currentScreen={currentScreen}
                  activeModal={activeModal}
                  rollSubTab={rollSubTab}
                  expandedSubMenu={expandedSubMenu}
                  setExpandedSubMenu={setExpandedSubMenu}
                  onNavigateScreen={onNavigateScreen}
                  onOpenModal={onOpenModal}
                  onCloseModal={onCloseModal}
                  handleItemClick={handleItemClick}
                />
              )}
            </AnimatePresence>
          </nav>
        </div>

        {/* BOTTOM FOOTER VERSION */}
        <div className="pt-3 border-t border-zinc-900 flex items-center justify-between shrink-0 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className={`text-[10px] font-mono text-zinc-500 uppercase transition-all duration-300 ${
              isHovered || isMobileOpen ? 'opacity-100' : 'opacity-0 sm:hidden'
            }`}>
              {version} ONLINE
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
