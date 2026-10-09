import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, X, Swords, Shield, Zap, Scale, Trophy, RotateCcw, 
  Sparkles, TrendingUp, AlertTriangle, CheckCircle2, ChevronRight,
  Flame, Cpu, Activity, Info, Search, Crown, Target, FastForward,
  Timer, Layers, BarChart3, HelpCircle, ArrowRight
} from 'lucide-react';

interface RulebookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type MainTab = 'global_rules' | 'ranked_evaluation';

type GlobalCategory = 
  | 'all'
  | 'defense_parry'
  | 'striking'
  | 'mobility_dash'
  | 'stamina_sprint'
  | 'genetics_height';

type RankedCategory =
  | 'all'
  | 'elo_percentage'
  | 'division_matrix'
  | 'performance_grades'
  | 'loss_mitigation'
  | 'timeslice_metrics'
  | 'match_format';

export const RulebookModal: React.FC<RulebookModalProps> = ({ isOpen, onClose }) => {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('global_rules');
  const [globalCategory, setGlobalCategory] = useState<GlobalCategory>('all');
  const [rankedCategory, setRankedCategory] = useState<RankedCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden font-sans text-zinc-200"
        >
          {/* TOP MODAL HEADER */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-amber-400 uppercase font-bold tracking-widest">
                    OCTAGON COMBAT CODEX
                  </span>
                  <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase">
                    Official Rulebook
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-display font-black italic uppercase text-white tracking-wide">
                  Master Game Rules & Ranked Evaluation
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition cursor-pointer"
              title="Close Rulebook"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* PRIMARY 2-TAB SELECTOR */}
          <div className="px-4 sm:px-6 py-2.5 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between gap-3 shrink-0">
            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
              {/* TAB 1: GLOBAL RULES */}
              <button
                onClick={() => { setActiveMainTab('global_rules'); setSearchQuery(''); }}
                className={`px-4 sm:px-5 py-2 rounded-xl font-display font-black italic uppercase text-xs sm:text-sm tracking-wider flex items-center justify-center gap-2 transition cursor-pointer border ${
                  activeMainTab === 'global_rules'
                    ? 'bg-gradient-to-r from-cyan-600/30 via-zinc-900 to-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-md shadow-cyan-950/40'
                    : 'bg-zinc-950/60 border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-850'
                }`}
              >
                <Shield className={`w-4 h-4 ${activeMainTab === 'global_rules' ? 'text-cyan-400' : 'text-zinc-500'}`} />
                <span>1. Global Rules</span>
              </button>

              {/* TAB 2: RANKED EVALUATION */}
              <button
                onClick={() => { setActiveMainTab('ranked_evaluation'); setSearchQuery(''); }}
                className={`px-4 sm:px-5 py-2 rounded-xl font-display font-black italic uppercase text-xs sm:text-sm tracking-wider flex items-center justify-center gap-2 transition cursor-pointer border ${
                  activeMainTab === 'ranked_evaluation'
                    ? 'bg-gradient-to-r from-amber-600/30 via-zinc-900 to-amber-500/20 border-amber-500/60 text-amber-300 shadow-md shadow-amber-950/40'
                    : 'bg-zinc-950/60 border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-850'
                }`}
              >
                <TrendingUp className={`w-4 h-4 ${activeMainTab === 'ranked_evaluation' ? 'text-amber-400' : 'text-zinc-500'}`} />
                <span>2. Ranked Evaluation</span>
              </button>
            </div>

            {/* Quick Search */}
            <div className="hidden md:flex items-center gap-2 bg-zinc-950/90 border border-zinc-800 rounded-xl px-3 py-1.5 w-64">
              <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeMainTab === 'global_rules' ? "Search global rules..." : "Search Elo & evaluation..."}
                className="bg-transparent text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none w-full font-mono"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-zinc-500 hover:text-white text-xs">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* TAB CONTENT AREA */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-6">
            {activeMainTab === 'global_rules' ? (
              /* ============================================================ */
              /* TAB 1: GLOBAL RULES                                         */
              /* ============================================================ */
              <div className="space-y-6">
                {/* Intro Banner */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/30 via-zinc-900/40 to-cyan-950/20 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-sm font-display font-black italic uppercase text-cyan-300">
                        Universal Combat Physics & Mechanics
                      </h3>
                    </div>
                    <p className="text-xs font-mono text-zinc-400 max-w-2xl leading-relaxed">
                      Fundamental, universal rules governing every exchange in the Octagon. 100% deterministic physics with zero RNG, zero random critical strikes, and frame-accurate hitboxes.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800 text-[10px] font-mono text-cyan-400 shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Deterministic Engine</span>
                  </div>
                </div>

                {/* Subcategory Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono">
                  {[
                    { id: 'all', label: 'All Global Rules' },
                    { id: 'defense_parry', label: 'Guard & Parry' },
                    { id: 'striking', label: 'Striking & Cadence' },
                    { id: 'mobility_dash', label: 'Dash & I-Frames' },
                    { id: 'stamina_sprint', label: 'Sprint & Stamina' },
                    { id: 'genetics_height', label: 'Height Biomechanics' },
                  ].map((pill) => (
                    <button
                      key={pill.id}
                      onClick={() => setGlobalCategory(pill.id as GlobalCategory)}
                      className={`px-3 py-1.5 rounded-lg border whitespace-nowrap transition cursor-pointer ${
                        globalCategory === pill.id
                          ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 font-bold'
                          : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>

                {/* 1. GUARD, PARRY & POST-BLOCK DELAY */}
                {(globalCategory === 'all' || globalCategory === 'defense_parry') && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">
                            DEFENSE & RECOVERY
                          </span>
                          <h4 className="text-sm sm:text-base font-display font-black italic uppercase text-white">
                            Directional Guard, Active Parry & Post-Block Delay
                          </h4>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 px-2.5 py-1 rounded-lg">
                        140° Arc
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs font-mono">
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Post-Block Attack Delay</span>
                        <span className="text-sm font-bold text-amber-400">0.45s (27 Frames)</span>
                        <p className="text-[11px] text-zinc-400 leading-tight">Releasing guard or recovering from a blocked strike enforces a 0.45s attack delay, preventing mindless counter-mashing.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Directional Guard Cone</span>
                        <span className="text-sm font-bold text-cyan-400">140° Frontal Arc</span>
                        <p className="text-[11px] text-zinc-400 leading-tight">Guard only protects against incoming strikes within your 140° frontal vision cone. Flank and rear strikes bypass guard.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Block-to-Dash Cancel</span>
                        <span className="text-sm font-bold text-emerald-400">Instant Reset</span>
                        <p className="text-[11px] text-zinc-400 leading-tight">Pressing Dash while holding guard cancels guard immediately into an evasive quickstep, clearing the 0.45s delay.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Active Parry Timing</span>
                        <span className="text-sm font-bold text-purple-400">Tap Deflection</span>
                        <p className="text-[11px] text-zinc-400 leading-tight">Tapping guard right as an attack connects triggers a Parry: 100% damage nullified and attacker staggered. Holding guard prevents parrying.</p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-850 text-xs font-mono text-zinc-400 space-y-1">
                      <span className="text-amber-400 font-bold block">💡 Tactical Defense Doctrine:</span>
                      <p>Never drop block and immediately mash M1 — the 0.45s delay will leave you vulnerable. If trapped under heavy strike pressure, cancel your block into a Dash to reposition safely.</p>
                    </div>
                  </div>
                )}

                {/* 2. STRIKING & ATTACK CADENCE */}
                {(globalCategory === 'all' || globalCategory === 'striking') && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30">
                          <Swords className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-red-400 font-bold uppercase tracking-wider block">
                            OFFENSE & HITSTUN
                          </span>
                          <h4 className="text-sm sm:text-base font-display font-black italic uppercase text-white">
                            Striking Cadence, Universal Hitstun & Concussion
                          </h4>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-red-950/60 border border-red-800/60 text-red-300 px-2.5 py-1 rounded-lg">
                        S1 ➔ S4 String
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs font-mono">
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">4-Stage Light Chain</span>
                        <span className="text-sm font-bold text-red-400">S1 ➔ S2 ➔ S3 ➔ S4</span>
                        <p className="text-[11px] text-zinc-400 leading-tight">M1 attacks chain sequentially through 4 strikes. S4 acts as the finisher with peak kinetic force and pushback.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Universal Hitstun</span>
                        <span className="text-sm font-bold text-amber-400">0.45s (27 Frames)</span>
                        <p className="text-[11px] text-zinc-400 leading-tight">Landing an unblocked strike locks target movement, steering, and attack actions, granting true frame advantage.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Heavy Windup Interruption</span>
                        <span className="text-sm font-bold text-purple-400">Vulnerable Windup</span>
                        <p className="text-[11px] text-zinc-400 leading-tight">Charging M2 Heavy attacks can be cleanly interrupted by incoming strikes unless the fighter has Super Armor.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Concussion Slowdown</span>
                        <span className="text-sm font-bold text-cyan-400">1.8s (-60% Speed)</span>
                        <p className="text-[11px] text-zinc-400 leading-tight">Suffering an S4 finisher or heavy strike inflicts Concussion for 1.8s, reducing dash force and movement speed by 60%.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. DASH, I-FRAMES & DODGE SYSTEM */}
                {(globalCategory === 'all' || globalCategory === 'mobility_dash') && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
                          <FastForward className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-purple-400 font-bold uppercase tracking-wider block">
                            MOBILITY & EVASION
                          </span>
                          <h4 className="text-sm sm:text-base font-display font-black italic uppercase text-white">
                            Quickstep Dashing, I-Frames & Dodge Confirmations
                          </h4>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-purple-950/60 border border-purple-800/60 text-purple-300 px-2.5 py-1 rounded-lg">
                        18-Frame I-Frames
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs font-mono">
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Quickstep Invulnerability</span>
                        <span className="text-sm font-bold text-purple-400">18 Frames (~0.30s)</span>
                        <p className="text-[11px] text-zinc-400 leading-tight">Dashing grants complete strike invulnerability frames (18f standard; 15f for Capoeira), phasing cleanly through hits.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">DODGED! Visual Trigger</span>
                        <span className="text-sm font-bold text-cyan-400">Kinetic Spark Phase</span>
                        <p className="text-[11px] text-zinc-400 leading-tight">Enemy strikes contacting during active I-Frames trigger visual blue sparkle confirmation and award 0 damage.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Dash Cooldown</span>
                        <span className="text-sm font-bold text-amber-400">1.50s (90 Frames)</span>
                        <p className="text-[11px] text-zinc-400 leading-tight">90-frame cooldown prevents evasive spam (Capoeira enjoys a 35% faster 58-frame / ~0.97s cooldown).</p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Zero Collision Phase</span>
                        <span className="text-sm font-bold text-emerald-400">Slip Through</span>
                        <p className="text-[11px] text-zinc-400 leading-tight">During active dash frames, you slip directly past opponents to establish unblockable rear positioning.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. SPRINT, STAMINA & BUFFER ENGINE */}
                {(globalCategory === 'all' || globalCategory === 'stamina_sprint') && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-amber-400 font-bold uppercase tracking-wider block">
                            STAMINA & AGGRESSION
                          </span>
                          <h4 className="text-sm sm:text-base font-display font-black italic uppercase text-white">
                            Sprint Velocity, Post-Sprint Delay & Sprint Striker Buffer
                          </h4>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-amber-950/60 border border-amber-800/60 text-amber-300 px-2.5 py-1 rounded-lg">
                        1.5s Hit Buffer
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs font-mono">
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Sprint Acceleration</span>
                        <span className="text-sm font-bold text-amber-400">+35% Velocity</span>
                        <p className="text-[11px] text-zinc-400 leading-tight">Consumes ~13 stamina/second from the 100-stamina pool for rapid gap closing.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Post-Sprint Lockout</span>
                        <span className="text-sm font-bold text-red-400">0.18s (11 Frames)</span>
                        <p className="text-[11px] text-zinc-400 leading-tight">Releasing sprint enforces a 0.18s M1 attack delay to eliminate mindless sprint-and-punch spam.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Sprint Striker Buffer</span>
                        <span className="text-sm font-bold text-emerald-400">1.5s Hit Buff</span>
                        <p className="text-[11px] text-zinc-400 leading-tight">Landing any strike unlocks a 1.5s window that eliminates the 0.18s lockout, enabling fluid sprint chasing.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Stamina Refill Delay</span>
                        <span className="text-sm font-bold text-cyan-400">2.0s Cooldown</span>
                        <p className="text-[11px] text-zinc-400 leading-tight">Stopping sprint requires a 2.0s resting delay before stamina begins regenerating at ~13.2/s.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. GENETICS & HEIGHT BIOMECHANICS */}
                {(globalCategory === 'all' || globalCategory === 'genetics_height') && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <Scale className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">
                            GENETICS & SIZING
                          </span>
                          <h4 className="text-sm sm:text-base font-display font-black italic uppercase text-white">
                            Height Tiers, Reach Scaling & Stamina Regeneration
                          </h4>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 px-2.5 py-1 rounded-lg">
                        Physical Sizing
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Micro Tier (3'8" – 4'5")</span>
                        <span className="text-sm font-bold text-emerald-400">+25% Stamina Regen</span>
                        <p className="text-[11px] text-zinc-400 leading-tight">Smaller hurtbox, +25% faster stamina refill, -10% movement speed, +15% damage taken.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Standard Athletic (4'6" – 6'7")</span>
                        <span className="text-sm font-bold text-cyan-400">1.00x Balanced</span>
                        <p className="text-[11px] text-zinc-400 leading-tight">Baseline reach, standard hurtbox, balanced 1.00x movement velocity and stamina rates.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Giant Tier (6'8" – 7'6")</span>
                        <span className="text-sm font-bold text-amber-400">+10% Reach & Speed</span>
                        <p className="text-[11px] text-zinc-400 leading-tight">Extended reach, +10% sprint velocity, larger target hurtbox, -25% slower stamina refill.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ============================================================ */
              /* TAB 2: RANKED EVALUATION                                    */
              /* ============================================================ */
              <div className="space-y-6">
                {/* Intro Banner */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/30 via-zinc-900/40 to-amber-950/20 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-400" />
                      <h3 className="text-sm font-display font-black italic uppercase text-amber-300">
                        Percentage-Based Elo Progression Engine (V3.0)
                      </h3>
                    </div>
                    <p className="text-xs font-mono text-zinc-400 max-w-2xl leading-relaxed">
                      Zero hard caps. Rating gains and losses scale dynamically as percentage multipliers of your current Elo, weighted by performance grading and continuous 2-second time-slice telemetry.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800 text-[10px] font-mono text-amber-400 shrink-0">
                    <Crown className="w-3.5 h-3.5" />
                    <span>Elo V3.0 Standard</span>
                  </div>
                </div>

                {/* Subcategory Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono">
                  {[
                    { id: 'all', label: 'All Ranked Rules' },
                    { id: 'elo_percentage', label: '% Scaling Math' },
                    { id: 'division_matrix', label: 'Division Risk Matrix' },
                    { id: 'performance_grades', label: 'Performance Grades (SSS-C)' },
                    { id: 'loss_mitigation', label: 'Loss Mitigation' },
                    { id: 'timeslice_metrics', label: 'Time-Slice Metrics' },
                    { id: 'match_format', label: 'Best-of-5 Format' },
                  ].map((pill) => (
                    <button
                      key={pill.id}
                      onClick={() => setRankedCategory(pill.id as RankedCategory)}
                      className={`px-3 py-1.5 rounded-lg border whitespace-nowrap transition cursor-pointer ${
                        rankedCategory === pill.id
                          ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-bold'
                          : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>

                {/* 1. PERCENTAGE-BASED ELO SCALING FORMULA */}
                {(rankedCategory === 'all' || rankedCategory === 'elo_percentage') && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <Activity className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-amber-400 font-bold uppercase tracking-wider block">
                            ELO CALCULATION ENGINE
                          </span>
                          <h4 className="text-sm sm:text-base font-display font-black italic uppercase text-white">
                            Mathematical Rating Scaling & Stake Dynamics
                          </h4>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-amber-950/60 border border-amber-800/60 text-amber-300 px-2.5 py-1 rounded-lg">
                        Dynamic Pool %
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800 space-y-2">
                        <span className="text-emerald-400 font-bold uppercase block text-xs">Victory Elo Formula</span>
                        <div className="p-2 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-emerald-300 font-bold">
                          ΔElo = Current_Elo × Base_Tier_% × Grade_Mult × Streak_Bonus
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          A Copper/Bronze fighter (500 Elo) scoring Grade SSS earns +8.0% (+40 Elo). An Obsidian Apex (2400 Elo) scoring Grade SSS earns +3.5% (+84 Elo).
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800 space-y-2">
                        <span className="text-red-400 font-bold uppercase block text-xs">Defeat Penalty Formula</span>
                        <div className="p-2 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-red-300 font-bold">
                          ΔElo = - (Current_Elo × Tier_Loss_% × Loss_Grade_Mult)
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          Loss penalties escalate as you climb divisions, making high-tier rank defense ruthless. Hard-fought losses with high performance grade reduce the penalty by up to 60%.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. DIVISION RISK MATRIX */}
                {(rankedCategory === 'all' || rankedCategory === 'division_matrix') && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
                          <Crown className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-purple-400 font-bold uppercase tracking-wider block">
                            TIER STAKE MATRIX
                          </span>
                          <h4 className="text-sm sm:text-base font-display font-black italic uppercase text-white">
                            Division Yield & Penalty Multipliers
                          </h4>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-purple-950/60 border border-purple-800/60 text-purple-300 px-2.5 py-1 rounded-lg">
                        6 Tiers
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs font-mono border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-800 text-zinc-400 text-[10px] uppercase">
                            <th className="text-left py-2 px-3">Division</th>
                            <th className="text-left py-2 px-3">Elo Range</th>
                            <th className="text-left py-2 px-3 text-emerald-400">Win Yield %</th>
                            <th className="text-left py-2 px-3 text-red-400">Loss Penalty %</th>
                            <th className="text-left py-2 px-3 text-amber-400">Risk Profile</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-850">
                          <tr className="hover:bg-zinc-900/40">
                            <td className="py-2.5 px-3 font-bold text-amber-600">🥉 Copper / Bronze</td>
                            <td className="py-2.5 px-3 text-zinc-300">0 – 699</td>
                            <td className="py-2.5 px-3 text-emerald-400 font-bold">+3.0% to +8.0%</td>
                            <td className="py-2.5 px-3 text-red-400">-1.0% to -2.0%</td>
                            <td className="py-2.5 px-3 text-emerald-300">Forgiving Acceleration</td>
                          </tr>
                          <tr className="hover:bg-zinc-900/40">
                            <td className="py-2.5 px-3 font-bold text-zinc-300">🥈 Silver</td>
                            <td className="py-2.5 px-3 text-zinc-300">700 – 999</td>
                            <td className="py-2.5 px-3 text-emerald-400 font-bold">+2.5% to +6.5%</td>
                            <td className="py-2.5 px-3 text-red-400">-2.0% to -3.5%</td>
                            <td className="py-2.5 px-3 text-cyan-300">Balanced Progression</td>
                          </tr>
                          <tr className="hover:bg-zinc-900/40">
                            <td className="py-2.5 px-3 font-bold text-amber-400">🥇 Gold</td>
                            <td className="py-2.5 px-3 text-zinc-300">1000 – 1499</td>
                            <td className="py-2.5 px-3 text-emerald-400 font-bold">+2.0% to +5.5%</td>
                            <td className="py-2.5 px-3 text-red-400">-3.0% to -5.0%</td>
                            <td className="py-2.5 px-3 text-amber-300">Competitive Parity</td>
                          </tr>
                          <tr className="hover:bg-zinc-900/40">
                            <td className="py-2.5 px-3 font-bold text-cyan-400">💎 Diamond</td>
                            <td className="py-2.5 px-3 text-zinc-300">1500 – 1849</td>
                            <td className="py-2.5 px-3 text-emerald-400 font-bold">+1.5% to +4.5%</td>
                            <td className="py-2.5 px-3 text-red-400">-4.0% to -6.5%</td>
                            <td className="py-2.5 px-3 text-purple-300">High Stakes Precision</td>
                          </tr>
                          <tr className="hover:bg-zinc-900/40">
                            <td className="py-2.5 px-3 font-bold text-purple-400">🔮 Amethyst</td>
                            <td className="py-2.5 px-3 text-zinc-300">1850 – 2199</td>
                            <td className="py-2.5 px-3 text-emerald-400 font-bold">+1.2% to +4.0%</td>
                            <td className="py-2.5 px-3 text-red-400">-5.5% to -8.0%</td>
                            <td className="py-2.5 px-3 text-red-300">Harsh Penalties</td>
                          </tr>
                          <tr className="hover:bg-zinc-900/40">
                            <td className="py-2.5 px-3 font-bold text-red-500">👑 Obsidian Apex</td>
                            <td className="py-2.5 px-3 text-zinc-300">2200+</td>
                            <td className="py-2.5 px-3 text-emerald-400 font-bold">+1.0% to +3.5%</td>
                            <td className="py-2.5 px-3 text-red-400">-7.0% to -10.0%</td>
                            <td className="py-2.5 px-3 text-red-400 font-bold">Apex Crucible</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3. PERFORMANCE GRADING CURVE */}
                {(rankedCategory === 'all' || rankedCategory === 'performance_grades') && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <Trophy className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">
                            MATCH EVALUATION GRADES
                          </span>
                          <h4 className="text-sm sm:text-base font-display font-black italic uppercase text-white">
                            Victory Performance Curve (Grade SSS ➔ Grade C)
                          </h4>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 px-2.5 py-1 rounded-lg">
                        SSS ➔ C Scale
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs font-mono">
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-amber-500/40 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-display font-black italic text-amber-400 text-sm">GRADE SSS</span>
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">100% Yield</span>
                        </div>
                        <span className="text-[10px] text-zinc-400 block font-bold">Flawless Masterclass</span>
                        <p className="text-[11px] text-zinc-400">Clean 3-0 sweep, zero rounds dropped, high pocket aggression & parry conversion rate.</p>
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-purple-500/40 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-display font-black italic text-purple-400 text-sm">GRADE SS</span>
                          <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">85% Yield</span>
                        </div>
                        <span className="text-[10px] text-zinc-400 block font-bold">Dominant Sweep</span>
                        <p className="text-[11px] text-zinc-400">3-0 or 3-1 victory with superior damage output, high offensive control, and under 1.5 min total bout time.</p>
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-cyan-500/40 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-display font-black italic text-cyan-400 text-sm">GRADE S</span>
                          <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded">70% Yield</span>
                        </div>
                        <span className="text-[10px] text-zinc-400 block font-bold">Decisive Mastery</span>
                        <p className="text-[11px] text-zinc-400">3-1 series victory with clean neutral spacing and positive strike accuracy ratio.</p>
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-display font-black italic text-zinc-200 text-sm">GRADE A</span>
                          <span className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded">50% Yield</span>
                        </div>
                        <span className="text-[10px] text-zinc-400 block font-bold">Competitive Victory</span>
                        <p className="text-[11px] text-zinc-400">3-2 narrow series split or moderate strike efficiency in a contested back-and-forth duel.</p>
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-display font-black italic text-zinc-400 text-sm">GRADE B</span>
                          <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">30% Yield</span>
                        </div>
                        <span className="text-[10px] text-zinc-400 block font-bold">Scrappy Series</span>
                        <p className="text-[11px] text-zinc-400">Low strike accuracy, high damage taken across multiple extended rounds.</p>
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-display font-black italic text-zinc-500 text-sm">GRADE C</span>
                          <span className="text-[10px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">10% Yield</span>
                        </div>
                        <span className="text-[10px] text-zinc-400 block font-bold">Stalled / Barely Won</span>
                        <p className="text-[11px] text-zinc-400">Exhaustive defensive stalling, round timer timeouts, or negative combat momentum.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. LOSS MITIGATION & DAMAGE CURVE */}
                {(rankedCategory === 'all' || rankedCategory === 'loss_mitigation') && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-red-400 font-bold uppercase tracking-wider block">
                            DEFEAT PROTECTION
                          </span>
                          <h4 className="text-sm sm:text-base font-display font-black italic uppercase text-white">
                            Loss Mitigation & Performance Shield
                          </h4>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-red-950/60 border border-red-800/60 text-red-300 px-2.5 py-1 rounded-lg">
                        Up to -60% Loss Relief
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs font-mono">
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-emerald-500/40 space-y-1">
                        <span className="text-[10px] text-emerald-400 uppercase font-bold block">Defeat Grade S</span>
                        <span className="text-sm font-bold text-emerald-400">-60% Loss Penalty</span>
                        <p className="text-[11px] text-zinc-400 leading-tight">Clutch heartbreaker (2-3 round split with high damage dealt) shields 60% of Elo losses.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-cyan-500/40 space-y-1">
                        <span className="text-[10px] text-cyan-400 uppercase font-bold block">Defeat Grade A</span>
                        <span className="text-sm font-bold text-cyan-400">-30% Loss Penalty</span>
                        <p className="text-[11px] text-zinc-400 leading-tight">Hard-fought war taking 1-2 rounds shields 30% of standard Elo penalty.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                        <span className="text-[10px] text-zinc-400 uppercase font-bold block">Defeat Grade B</span>
                        <span className="text-sm font-bold text-zinc-300">1.0x Standard Loss</span>
                        <p className="text-[11px] text-zinc-400 leading-tight">Standard defeat without significant mitigation or penalty amplification.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-red-500/40 space-y-1">
                        <span className="text-[10px] text-red-400 uppercase font-bold block">Defeat Grade C</span>
                        <span className="text-sm font-bold text-red-400">1.5x Amplified Loss</span>
                        <p className="text-[11px] text-zinc-400 leading-tight">Swept 0-3 with zero aggression or excessive stalling amplifies loss penalty by 1.5x.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. 2-SECOND TIME-SLICE COMBAT METRICS */}
                {(rankedCategory === 'all' || rankedCategory === 'timeslice_metrics') && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                          <BarChart3 className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">
                            TELEMETRY SAMPLING
                          </span>
                          <h4 className="text-sm sm:text-base font-display font-black italic uppercase text-white">
                            Continuous 2-Second Time-Slice Combat Matrix
                          </h4>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 px-2.5 py-1 rounded-lg">
                        120-Frame Slices
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                        <span className="text-[10px] text-cyan-400 uppercase font-bold block">Forward Pressure Index</span>
                        <p className="text-[11px] text-zinc-300 leading-relaxed">
                          Continuously samples forward movement vector relative to opponent position, penalizing passive boundary stalling.
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                        <span className="text-[10px] text-amber-400 uppercase font-bold block">Pocket Dominance %</span>
                        <p className="text-[11px] text-zinc-300 leading-relaxed">
                          Tracks time spent inside strike range actively trading or parrying vs fleeing neutral distance.
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                        <span className="text-[10px] text-purple-400 uppercase font-bold block">Parry & Frame Trap Ratio</span>
                        <p className="text-[11px] text-zinc-300 leading-relaxed">
                          Measures successful reactive parries and frame-advantage conversions to elevate performance score.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. RANKED MATCH FORMATS & RULES */}
                {(rankedCategory === 'all' || rankedCategory === 'match_format') && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <Timer className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-amber-400 font-bold uppercase tracking-wider block">
                            MATCH SPECIFICATIONS
                          </span>
                          <h4 className="text-sm sm:text-base font-display font-black italic uppercase text-white">
                            Ranked Match Regulations & Format
                          </h4>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-amber-950/60 border border-amber-800/60 text-amber-300 px-2.5 py-1 rounded-lg">
                        Best of 5
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Series Format</span>
                        <span className="text-sm font-bold text-white">Best of 5 (First to 3)</span>
                        <p className="text-[11px] text-zinc-400">First fighter to secure 3 round victories wins the match and claims Elo rating.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Round Duration</span>
                        <span className="text-sm font-bold text-amber-400">3:00 Mins (180s)</span>
                        <p className="text-[11px] text-zinc-400">Rounds run on a strict 180-second clock; highest remaining HP wins upon timeout.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Division Promotion</span>
                        <span className="text-sm font-bold text-emerald-400">Instant Milestone</span>
                        <p className="text-[11px] text-zinc-400">Crossing Elo thresholds instantly promotes tier rank and updates match purse rewards.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* FOOTER BAR */}
          <div className="px-4 sm:px-6 py-3 bg-zinc-900 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-zinc-400 shrink-0">
            <div className="flex items-center gap-2 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Octagon Rulebook Active • Version 3.0 Standard</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-black italic uppercase text-xs transition cursor-pointer shadow-sm active:scale-95"
            >
              Understood & Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
