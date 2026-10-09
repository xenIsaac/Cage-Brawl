import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, Flame, Sparkles, Trophy, 
  Swords, Zap, Crown
} from 'lucide-react';
import { PlayerStats } from '../types';

interface QuestsAchievementsPanelProps {
  stats: PlayerStats;
  updateStats: (updates: Partial<PlayerStats>) => void;
  email?: string;
  activeTab?: 'achievements' | 'style_mastery';
  onClose?: () => void;
  isNavHidden?: boolean;
  isNavExpanded?: boolean;
}

interface AchievementItem {
  id: string;
  title: string;
  description: string;
  icon: any;
  rewardCash: number;
  rewardRolls: number;
  unlocked: boolean;
  progress: number;
  target: number;
}

export default function QuestsAchievementsPanel({ 
  stats, 
  activeTab = 'achievements',
  onClose,
  isNavHidden = false,
  isNavExpanded = false,
}: QuestsAchievementsPanelProps) {

  // Dynamic Adaptive Viewport Padding: Adjusts left edge when nav expands or collapses
  const dynamicPaddingLeft = isNavHidden
    ? '1.25rem'
    : isNavExpanded
      ? '16.5rem' // 264px to perfectly clear 256px expanded rail
      : '4.75rem'; // 76px to perfectly clear 64px rail

  // Achievements Vault List
  const achievementsList: AchievementItem[] = [
    {
      id: 'first_victory',
      title: 'First Octagon Blood',
      description: 'Achieve your first KO victory in combat.',
      icon: Swords,
      rewardCash: 100,
      rewardRolls: 2,
      unlocked: (stats.totalWins || 0) >= 1 || (stats.totalKOs || 0) >= 1,
      progress: Math.min(1, stats.totalWins || 0),
      target: 1,
    },
    {
      id: 'brawler_veteran',
      title: 'Octagon Veteran',
      description: 'Complete 10 total matches in Cage Brawl.',
      icon: Trophy,
      rewardCash: 250,
      rewardRolls: 5,
      unlocked: (stats.totalMatchesPlayed || 0) >= 10,
      progress: Math.min(10, stats.totalMatchesPlayed || 0),
      target: 10,
    },
    {
      id: 'knockout_king',
      title: 'Knockout Artist',
      description: 'Score 5 total Knockouts across any game mode.',
      icon: Zap,
      rewardCash: 300,
      rewardRolls: 5,
      unlocked: (stats.totalKOs || 0) >= 5,
      progress: Math.min(5, stats.totalKOs || 0),
      target: 5,
    },
    {
      id: 'style_collector',
      title: 'Master Stance Collector',
      description: 'Unlock 3 distinct martial arts fighting styles.',
      icon: Sparkles,
      rewardCash: 500,
      rewardRolls: 10,
      unlocked: (stats.unlockedStyleIds?.length || 1) >= 3,
      progress: Math.min(3, stats.unlockedStyleIds?.length || 1),
      target: 3,
    },
    {
      id: 'apex_warrior',
      title: 'Apex Division',
      description: 'Reach Gold Tier ELO (1000+ ELO).',
      icon: Crown,
      rewardCash: 1000,
      rewardRolls: 15,
      unlocked: (stats.elo || 0) >= 1000,
      progress: Math.min(1000, stats.elo || 0),
      target: 1000,
    },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{ paddingLeft: dynamicPaddingLeft }}
      className="fixed inset-0 z-[125] bg-zinc-950/95 backdrop-blur-2xl text-white flex flex-col select-none overflow-hidden py-3 sm:py-5 lg:py-6 pr-3 sm:pr-5 lg:pr-6 transition-[padding-left] duration-300 ease-out"
    >
      {/* BACKGROUND DECORATIVE GLOWS */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:32px_32px] opacity-20 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* RIGHT MAIN HUD CONTENT BOX WITH SLIDING SCREEN TRANSITIONS */}
      <div className="flex-1 bg-zinc-900/80 border border-zinc-800/90 backdrop-blur-2xl rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col min-h-0 overflow-hidden relative z-10">
        
        {/* HUD HEADER WITH ANIMATED SLIDE */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3.5 shrink-0">
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, x: 25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -25 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="flex items-center gap-2.5"
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                activeTab === 'achievements'
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                  : 'bg-purple-500/10 border-purple-500/40 text-purple-400'
              }`}>
                {activeTab === 'achievements' ? <Award className="w-4 h-4 text-amber-400" /> : <Flame className="w-4 h-4 text-purple-400" />}
              </div>
              <div>
                <h1 className="font-display font-black italic uppercase text-base sm:text-xl text-white tracking-wide leading-none">
                  {activeTab === 'achievements' ? 'ACHIEVEMENTS & TROPHIES VAULT' : 'STYLE & STANCE MASTERY TRACK'}
                </h1>
                <p className="text-[10px] sm:text-xs font-mono text-zinc-400 mt-1">
                  {activeTab === 'achievements'
                    ? 'Unlock accomplishments across your Cage Brawl fighting career'
                    : 'Earn stance mastery XP, master unique stance combos, and unlock stance titles'
                  }
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="bg-zinc-950 border border-amber-500/30 px-3 py-1 rounded-xl flex items-center gap-1.5 font-mono text-xs shadow-sm">
            <span className="text-amber-400 font-bold">$</span>
            <span className="font-bold text-white">{stats.cash.toLocaleString()}</span>
          </div>
        </div>

        {/* HUD BODY CONTENT WITH ANIMATED SLIDING SCREEN MOVEMENT */}
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-0 relative">
          <AnimatePresence mode="wait">
            {activeTab === 'achievements' && (
              <motion.div
                key="achievements"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
              >
                {achievementsList.map(item => {
                  const Icon = item.icon;
                  const percent = Math.min(100, Math.round((item.progress / item.target) * 100));
                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border flex flex-col justify-between transition ${
                        item.unlocked
                          ? 'bg-amber-950/20 border-amber-500/60 shadow-lg ring-1 ring-amber-500/30'
                          : 'bg-zinc-950/60 border-zinc-850 opacity-80'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${item.unlocked ? 'text-amber-400' : 'text-zinc-500'}`} />
                            <span className="font-display font-black italic uppercase text-xs sm:text-sm text-white">
                              {item.title}
                            </span>
                          </div>
                          {item.unlocked ? (
                            <span className="text-[8px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                              ✓ UNLOCKED
                            </span>
                          ) : (
                            <span className="text-[8px] font-mono font-bold text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
                              LOCKED
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] sm:text-xs text-zinc-400 mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      <div className="mt-4 space-y-2 pt-2 border-t border-zinc-850">
                        <div>
                          <div className="flex justify-between items-center text-[9px] font-mono text-zinc-400 mb-1">
                            <span>Progress</span>
                            <span className="font-bold text-white">{item.progress} / {item.target}</span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                            <div
                              className={`h-full transition-all duration-300 ${item.unlocked ? 'bg-amber-400' : 'bg-zinc-600'}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[9px] font-mono font-bold text-zinc-300 pt-0.5">
                          <span className="text-emerald-400">+${item.rewardCash}</span>
                          {item.rewardRolls > 0 && <span className="text-amber-400">+{item.rewardRolls} Rolls</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}

            {activeTab === 'style_mastery' && (
              <motion.div
                key="style_mastery"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="h-full min-h-[280px] flex flex-col items-center justify-center text-center p-6 border border-purple-500/30 rounded-2xl bg-gradient-to-b from-purple-950/20 via-zinc-900/30 to-zinc-950"
              >
                <div className="w-16 h-16 rounded-2xl bg-purple-950/80 border border-purple-500/50 flex items-center justify-center text-purple-400 mb-3 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                  <Flame className="w-8 h-8 text-purple-400 animate-pulse" />
                </div>
                <span className="px-3 py-1 bg-purple-950 border border-purple-600/60 text-purple-300 font-mono font-bold text-[10px] uppercase rounded-full tracking-widest mb-2">
                  UPCOMING FEATURE
                </span>
                <h3 className="font-display font-black italic uppercase text-base sm:text-xl text-white">
                  Style Mastery & Stance Rank Track
                </h3>
                <p className="text-xs font-mono text-zinc-400 max-w-md mt-2 leading-relaxed">
                  Earn stance mastery XP, master unique martial arts combos, and unlock exclusive stance titles for your favorite fighting styles in an upcoming update!
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

    </motion.div>
  );
}
