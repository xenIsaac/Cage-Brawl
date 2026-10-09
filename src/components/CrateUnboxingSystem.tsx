import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogOut, Key, ShoppingBag, Dna, Crosshair, 
  Clock, CheckCircle2, Zap, DollarSign, RefreshCcw, Sparkles, X, ChevronRight,
  Shield, Flame, Lock, Activity, Scale, Swords, FastForward, HeartPulse, Compass,
  Box, AlertTriangle, ArrowRight, ArrowLeftRight, HelpCircle
} from 'lucide-react';
import { FIGHTING_STYLES, getRollableStyles } from '../data/styles';
import { FightingStyle, PlayerStats } from '../types';
import { STYLE_CLASSIFICATIONS } from '../data/styleClassification';
import { 
  CrateType, 
  KeyTier, 
  KEY_TIERS, 
  CRATE_CATALOG, 
  CRATE_LIST, 
  CrateRollResult, 
  calculateEffectiveWinRate, 
  executeCrateUnbox,
  WISHLIST_COOLDOWN_MS,
  ORIGIN_CRATE_COOLDOWN_MS
} from '../data/crateData';
import { soundManager } from './SoundManager';
import { getHeightModifiers, formatHeight } from '../utils/heightModifiers';
import { CrateContainerCanvas, CrateAnimPhase } from './crate/CrateContainerCanvas';

interface CrateUnboxingSystemProps {
  stats: PlayerStats;
  updateStats: (newStats: Partial<PlayerStats>) => void;
  onBackToMenu: () => void;
  version: string;
  initialSubTab?: 'crates' | 'shop' | 'genetics';
  onSubTabChange?: (tab: 'crates' | 'shop' | 'genetics') => void;
  isNavHidden?: boolean;
}

export default function CrateUnboxingSystem({
  stats,
  updateStats,
  onBackToMenu,
  version,
  initialSubTab = 'crates',
  onSubTabChange,
  isNavHidden = false,
}: CrateUnboxingSystemProps) {
  const [activeSubTab, setActiveSubTab] = useState<'crates' | 'shop' | 'genetics'>(
    initialSubTab === 'shop' ? 'shop' : initialSubTab === 'genetics' ? 'genetics' : 'crates'
  );

  useEffect(() => {
    if (initialSubTab && (initialSubTab === 'crates' || initialSubTab === 'shop' || initialSubTab === 'genetics')) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [selectedCrateId, setSelectedCrateId] = useState<CrateType>('normal');
  const [selectedKeyTier, setSelectedKeyTier] = useState<KeyTier>('gold');
  
  // Animation & Unboxing State
  const [isUnboxing, setIsUnboxing] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<CrateAnimPhase>('idle');
  const [shakeStage, setShakeStage] = useState<number>(0);
  const [lastRollResult, setLastRollResult] = useState<CrateRollResult | null>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [canDismissReward, setCanDismissReward] = useState(false);
  const [showEmptyBanner, setShowEmptyBanner] = useState(false);
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [instantUnbox, setInstantUnbox] = useState(false);

  // Responsive Orientation Detection
  const [isLandscape, setIsLandscape] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth > window.innerHeight;
  });

  const [isCompactLandscape, setIsCompactLandscape] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth > window.innerHeight && window.innerHeight < 600;
  });

  useEffect(() => {
    const handleResize = () => {
      const landscape = window.innerWidth > window.innerHeight;
      setIsLandscape(landscape);
      setIsCompactLandscape(landscape && window.innerHeight < 600);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // 0.3s Cooldown on CONTINUE BRAWLING button upon obtaining style
  useEffect(() => {
    if (showRewardModal) {
      setCanDismissReward(false);
      const timer = setTimeout(() => {
        setCanDismissReward(true);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setCanDismissReward(false);
    }
  }, [showRewardModal]);

  // Centralized Animation Timers
  const animTimersRef = useRef<NodeJS.Timeout[]>([]);
  const isTransitioningRef = useRef(false);

  const clearAnimTimers = () => {
    animTimersRef.current.forEach(t => clearTimeout(t));
    animTimersRef.current = [];
  };

  const scheduleAnimStep = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      animTimersRef.current = animTimersRef.current.filter(timer => timer !== t);
      fn();
    }, ms);
    animTimersRef.current.push(t);
    return t;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAnimTimers();
    };
  }, []);

  const isBusy = isUnboxing || animationPhase !== 'idle';

  // Genetics Reroll State
  const [isRollingHeight, setIsRollingHeight] = useState(false);
  const [tempHeight, setTempHeight] = useState<number | null>(null);
  const [showHeightConfirm, setShowHeightConfirm] = useState(false);

  // Real-time Wishlist Cooldown Timer
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Key Inventory Helper
  const keyInventory = useMemo(() => {
    return {
      iron: stats.keys?.iron ?? (stats.rolls ? Math.max(0, stats.rolls) : 2),
      gold: stats.keys?.gold ?? 1,
      diamond: stats.keys?.diamond ?? 0,
      obsidian: stats.keys?.obsidian ?? 0,
    };
  }, [stats.keys, stats.rolls]);

  const selectedKeyCount = keyInventory[selectedKeyTier] || 0;

  // Wishlist State (Integrated into Normal Crate)
  const wishlistStyleId = stats.wishlist?.styleId || null;
  const wishlistCooldownUntil = stats.wishlist?.wishlistCooldownUntil || 0;
  const isWishlistOnCooldown = wishlistCooldownUntil > currentTime;
  const wishlistRemainingSec = Math.max(0, Math.ceil((wishlistCooldownUntil - currentTime) / 1000));

  // Origin Crate Cooldown (3 minutes per key)
  const originCrateCooldownUntil = stats.originCrateCooldownUntil || 0;
  const isOriginOnCooldown = originCrateCooldownUntil > currentTime;
  const originRemainingSec = Math.max(0, Math.ceil((originCrateCooldownUntil - currentTime) / 1000));

  const formatCooldown = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const selectedCrate = CRATE_CATALOG[selectedCrateId];
  const selectedKeyConfig = KEY_TIERS[selectedKeyTier];
  const effectiveWinRate = calculateEffectiveWinRate(selectedCrateId, selectedKeyTier);

  const rollableStyles = useMemo(() => getRollableStyles(), []);
  const wishlistedStyleObj = useMemo(() => {
    if (!wishlistStyleId) return null;
    return FIGHTING_STYLES.find(s => s.id === wishlistStyleId) || null;
  }, [wishlistStyleId]);

  const activeStyleObj = useMemo(() => {
    return FIGHTING_STYLES.find(s => s.id === stats.selectedStyleId) || FIGHTING_STYLES[0];
  }, [stats.selectedStyleId]);

  // Quick Key Purchase
  const handleBuyKeys = (tier: KeyTier, count: number) => {
    const config = KEY_TIERS[tier];
    if (!config.cost) return;
    const totalCost = config.cost * count;

    if (stats.cash < totalCost) {
      soundManager.playParry?.();
      return;
    }

    const updatedKeys = {
      ...keyInventory,
      [tier]: (keyInventory[tier] || 0) + count,
    };

    updateStats({
      cash: stats.cash - totalCost,
      keys: updatedKeys,
    });

    soundManager.playGemCollected?.('cash');
  };

  // Convert Keys (3 to 1 fusion)
  const handleFuseKeys = (fromTier: 'iron' | 'gold' | 'diamond', toTier: 'gold' | 'diamond' | 'obsidian') => {
    const fromCount = keyInventory[fromTier] || 0;
    if (fromCount < 3) {
      soundManager.playParry?.();
      return;
    }

    const updatedKeys = {
      ...keyInventory,
      [fromTier]: fromCount - 3,
      [toTier]: (keyInventory[toTier] || 0) + 1,
    };

    updateStats({
      keys: updatedKeys,
    });

    soundManager.playHeavyImpact?.();
  };

  // Set Wishlist Target
  const handleSetWishlist = (styleId: string | null) => {
    if (isWishlistOnCooldown && styleId !== null) return;

    updateStats({
      wishlist: {
        styleId,
        wishlistCooldownUntil: stats.wishlist?.wishlistCooldownUntil || 0,
      },
    });

    soundManager.playRollTick?.();
    setShowWishlistModal(false);
  };

  // Sequence Crate Closing and Replacement
  const handleCloseAndReplaceCrate = () => {
    if (isTransitioningRef.current || animationPhase === 'closing' || animationPhase === 'replacing') return;
    isTransitioningRef.current = true;
    clearAnimTimers();
    setShowEmptyBanner(false);
    setAnimationPhase('closing');
    soundManager.playCrateClose();

    scheduleAnimStep(() => {
      setAnimationPhase('replacing');
      soundManager.playCrateSlide();

      scheduleAnimStep(() => {
        setAnimationPhase('idle');
        setIsUnboxing(false);
        setLastRollResult(null);
        isTransitioningRef.current = false;
      }, 560);
    }, 390);
  };

  // Execute Crate Unboxing
  const handleUnboxCrate = () => {
    const isOriginBlocked = selectedCrateId === 'origin' && isOriginOnCooldown;
    if (isBusy || isTransitioningRef.current || selectedKeyCount <= 0 || isOriginBlocked) {
      if (selectedKeyCount <= 0 || isOriginBlocked) soundManager.playParry?.();
      return;
    }

    clearAnimTimers();
    setIsUnboxing(true);
    setShowEmptyBanner(false);
    setShowRewardModal(false);

    // Consume 1 key
    const updatedKeys = {
      ...keyInventory,
      [selectedKeyTier]: Math.max(0, keyInventory[selectedKeyTier] - 1),
    };

    const newStatsPayload: Partial<PlayerStats> = {
      keys: updatedKeys,
      totalCratesOpened: (stats.totalCratesOpened || 0) + 1,
      rolls: Math.max(0, (stats.rolls || 0) - 1),
    };

    if (selectedCrateId === 'origin') {
      newStatsPayload.originCrateCooldownUntil = Date.now() + ORIGIN_CRATE_COOLDOWN_MS;
    }

    updateStats(newStatsPayload);

    // If Instant Unbox is checked, skip to reveal directly
    if (instantUnbox) {
      const result = executeCrateUnbox(selectedCrateId, selectedKeyTier, wishlistStyleId, rollableStyles);
      setLastRollResult(result);
      if (result.isWin && result.style) {
        setShowRewardModal(true);
        soundManager.playCrateWin();
        if (result.style.id === wishlistStyleId) {
          updateStats({
            wishlist: {
              styleId: null,
              wishlistCooldownUntil: Date.now() + WISHLIST_COOLDOWN_MS,
            },
          });
        }
      } else {
        setShowEmptyBanner(true);
        soundManager.playCrateEmpty();
      }
      setAnimationPhase('revealed');
      return;
    }

    // Step 1: Pop up chest (450ms)
    setAnimationPhase('popping_chest');
    soundManager.playChestPop();

    // Step 2: Shove key in (450ms)
    scheduleAnimStep(() => {
      setAnimationPhase('inserting_key');
      soundManager.playKeyInsert();

      // Step 3: Spin key in lock (450ms)
      scheduleAnimStep(() => {
        setAnimationPhase('spinning_key');
        soundManager.playCrateLatch();

        // Step 4: Shakes & Latches Pop (3 stages, ~1100ms total)
        scheduleAnimStep(() => {
          setAnimationPhase('rattling');
          setShakeStage(1);
          soundManager.playCrateRattle(1);

          scheduleAnimStep(() => {
            setShakeStage(2);
            soundManager.playCrateRattle(2);

            scheduleAnimStep(() => {
              setShakeStage(3);
              soundManager.playCrateRattle(3);

              // Step 5: Open & Burst (900ms)
              scheduleAnimStep(() => {
                setAnimationPhase('opening');
                soundManager.playTone(520, 'triangle', 0.25, [0.22, 0.0], [0.2]);

                // Compute Result
                const result = executeCrateUnbox(selectedCrateId, selectedKeyTier, wishlistStyleId, rollableStyles);
                setLastRollResult(result);

                scheduleAnimStep(() => {
                  setAnimationPhase('revealed');

                  if (result.isWin && result.style) {
                    setShowRewardModal(true);
                    soundManager.playCrateWin();

                    if (result.style.id === wishlistStyleId) {
                      updateStats({
                        wishlist: {
                          styleId: null,
                          wishlistCooldownUntil: Date.now() + WISHLIST_COOLDOWN_MS,
                        },
                      });
                    }
                  } else {
                    setShowEmptyBanner(true);
                    soundManager.playCrateEmpty();
                  }
                }, 400);
              }, 450);
            }, 350);
          }, 350);
        }, 400);
      }, 450);
    }, 450);
  };

  // Genetics Calibration Roll
  const handleRollHeight = () => {
    if (isRollingHeight) return;
    setIsRollingHeight(true);
    setShowHeightConfirm(false);

    let ticks = 0;
    const interval = setInterval(() => {
      const randomH = Math.floor(Math.random() * (86 - 59 + 1)) + 59;
      setTempHeight(randomH);
      soundManager.playRollTick?.();
      ticks++;

      if (ticks > 12) {
        clearInterval(interval);
        // Weighted distribution: Micro 0.2%, Short 25%, Average 65%, Tall 9.5%, Giant 0.3%
        const roll = Math.random() * 100;
        let finalH: number;
        if (roll < 0.2) {
          finalH = Math.floor(Math.random() * (62 - 59 + 1)) + 59; // Micro: 4'11" - 5'2"
        } else if (roll < 25.2) {
          finalH = Math.floor(Math.random() * (67 - 63 + 1)) + 63; // Short: 5'3" - 5'7"
        } else if (roll < 90.2) {
          finalH = Math.floor(Math.random() * (72 - 68 + 1)) + 68; // Average: 5'8" - 6'0"
        } else if (roll < 99.7) {
          finalH = Math.floor(Math.random() * (80 - 73 + 1)) + 73; // Tall: 6'1" - 6'8"
        } else {
          finalH = Math.floor(Math.random() * (86 - 81 + 1)) + 81; // Giant: 6'9" - 7'2"
        }
        setTempHeight(finalH);
        setIsRollingHeight(false);
        setShowHeightConfirm(true);
        soundManager.playHeavyImpact?.();
      }
    }, 80);
  };

  const handleConfirmHeight = () => {
    if (tempHeight !== null) {
      updateStats({
        heightInInches: tempHeight,
      });
      setShowHeightConfirm(false);
      soundManager.playTone(880, 'sine', 0.15, [0.2, 0.0], [0.1]);
    }
  };

  const currentHeight = stats.heightInInches || 70;
  const currentHeightMods = getHeightModifiers(currentHeight);
  const previewHeight = tempHeight || currentHeight;
  const previewHeightMods = getHeightModifiers(previewHeight);

  return (
    <div 
      id="full-screen-crate-sanctum-view"
      className={`fixed inset-0 z-50 bg-zinc-950 text-white flex flex-col select-none overflow-hidden transition-all duration-300 ${
        isNavHidden ? 'pl-0' : 'pl-14 sm:pl-16'
      }`}
    >
      {/* ============================================================== */}
      {/* 1. TOP HEADER & LIVE TELEMETRY                                 */}
      {/* ============================================================== */}
      <header className={`border-b border-zinc-850 bg-gradient-to-r from-zinc-950 via-zinc-900/90 to-zinc-950 flex items-center justify-between gap-2.5 shrink-0 z-20 ${
        isCompactLandscape ? 'px-3 py-1.5' : 'px-4 sm:px-6 py-2 sm:py-2.5'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-950/80 border border-amber-800/80 flex items-center justify-center text-amber-400 shrink-0 shadow-md">
            <Box className="w-4 h-4" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-display font-black italic uppercase text-white tracking-wider">
                CRATE SANCTUM
              </h1>
              <span className="text-[8px] sm:text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase">
                {version || 'v1.7.6 Part 3'}
              </span>
            </div>
            {!isCompactLandscape && (
              <p className="text-[10px] text-zinc-400 font-mono hidden md:block">
                Fighter Crates, Key Store & Biometric Genetics Lab
              </p>
            )}
          </div>
        </div>

        {/* Live Currency & Top Stasis Exit Button */}
        <div className="flex items-center gap-2">
          {/* Active Style Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900/90 border border-zinc-800 text-[11px] font-mono shadow-inner">
            <span className="text-zinc-500 text-[9px] uppercase">Active Stance:</span>
            <span className="font-bold text-amber-400 truncate max-w-[120px]">{activeStyleObj.name}</span>
          </div>

          {/* Cash Balance */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs font-mono font-bold shadow-inner">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400">${stats.cash.toLocaleString()}</span>
          </div>

          {/* Key Quick Inventory Pills */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900/90 border border-zinc-800 text-[10px] font-mono font-bold shadow-inner">
            <span className="text-zinc-400">Fe:{keyInventory.iron}</span>
            <span className="text-amber-400">Au:{keyInventory.gold}</span>
            <span className="text-cyan-300">Dia:{keyInventory.diamond}</span>
            <span className="text-purple-300">Obs:{keyInventory.obsidian}</span>
          </div>

          {/* Instant Unbox Fast-Forward Toggle (Visible in Crates Mode) */}
          {activeSubTab === 'crates' && (
            <button
              onClick={() => {
                setInstantUnbox(!instantUnbox);
                soundManager.playRollTick?.();
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold transition border cursor-pointer ${
                instantUnbox
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-sm'
                  : 'bg-zinc-900/60 text-zinc-500 border-zinc-800 hover:text-zinc-300'
              }`}
              title="Toggle Instant Unboxing Animation Skip"
            >
              <FastForward className="w-3 h-3 text-purple-400" />
              <span className="hidden md:inline">Instant:</span>
              <span>{instantUnbox ? 'ON' : 'OFF'}</span>
            </button>
          )}

          {/* Stasis Exit Button */}
          <button
            onClick={() => {
              soundManager.playRollTick?.();
              onBackToMenu();
            }}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-red-950/90 to-red-900/60 hover:from-red-900 hover:to-zinc-900 border border-red-500/50 hover:border-red-400 text-red-200 hover:text-white rounded-xl text-[11px] font-display font-black italic uppercase tracking-wider transition-all duration-200 shadow-md active:scale-95 group cursor-pointer"
            title="Exit Crate Sanctum & Return to Main Menu"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400 rotate-180 transition-transform group-hover:scale-110" />
            <span className="hidden sm:inline">EXIT</span>
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. MAIN WORKSPACE VIEWPORT                                     */}
      {/* ============================================================== */}
      <main className={`flex-1 overflow-y-auto min-h-0 bg-gradient-to-b from-zinc-950 via-zinc-900/40 to-zinc-950 flex flex-col justify-between ${
        isCompactLandscape ? 'p-1.5' : isLandscape ? 'p-2 sm:p-3' : 'p-3 sm:p-5'
      }`}>
        
        {/* ============================================================== */}
        {/* TAB 1: FIGHTER CRATES                                          */}
        {/* ============================================================== */}
        {activeSubTab === 'crates' && (
          <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col justify-between gap-3">
            
            {/* TOP CRATE SELECTOR CARDS (ALL 5 CRATES ALWAYS FULLY VISIBLE) */}
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 shrink-0">
              {CRATE_LIST.map(crate => {
                const isSelected = selectedCrateId === crate.id;
                const isOrigin = crate.id === 'origin';
                const isBlockedOrigin = isOrigin && isOriginOnCooldown;

                return (
                  <button
                    key={crate.id}
                    disabled={isBusy}
                    onClick={() => {
                      setSelectedCrateId(crate.id);
                      soundManager.playRollTick?.();
                    }}
                    className={`relative p-2 sm:p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)] scale-[1.02]'
                        : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850'
                    } ${isBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[8px] sm:text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded ${
                          crate.id === 'striker' ? 'bg-red-950 text-red-400 border border-red-800/80' :
                          crate.id === 'grappler' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/80' :
                          crate.id === 'hybrid' ? 'bg-purple-950 text-purple-400 border border-purple-800/80' :
                          crate.id === 'origin' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80' :
                          'bg-amber-950 text-amber-400 border border-amber-800/80'
                        }`}>
                          {crate.id}
                        </span>

                        {isOrigin && (
                          <span className="text-[7.5px] font-mono font-bold text-emerald-400 hidden sm:inline">
                            100% Drop
                          </span>
                        )}
                      </div>

                      <h3 className="font-display font-black uppercase text-[10px] sm:text-xs truncate leading-tight text-white">
                        {crate.name}
                      </h3>
                      <p className="text-[8px] sm:text-[9px] text-zinc-400 font-mono truncate mt-0.5 hidden sm:block">
                        {crate.tagline}
                      </p>
                    </div>

                    {/* Origin Cooldown Status Overlay */}
                    {isBlockedOrigin && (
                      <div className="mt-1 pt-1 border-t border-red-500/40 text-[8px] font-mono font-bold text-red-400 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 animate-pulse shrink-0" />
                        <span>{formatCooldown(originRemainingSec)}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* CENTRAL WORKSPACE: UNBOXING STAGE + KEY SELECTOR + TELEMETRY */}
            <div className={`grid items-center flex-1 min-h-0 ${
              isCompactLandscape ? 'gap-1.5' : 'gap-2.5 sm:gap-3'
            } ${
              isLandscape ? 'grid-cols-12' : 'grid-cols-1'
            }`}>
              
              {/* LEFT / CENTER: 3D UNBOXING CONTAINER CANVAS */}
              <div className={`relative flex flex-col items-center justify-center rounded-3xl bg-zinc-900/60 border border-zinc-800/80 shadow-2xl overflow-hidden h-full ${
                isCompactLandscape ? 'p-1.5 col-span-7' : isLandscape ? 'p-2 sm:p-3 col-span-7' : 'p-2.5 sm:p-4 w-full'
              }`}>
                {/* Ambient Radial Aura Glow */}
                <div className="absolute -inset-10 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Canvas Container */}
                <div className="relative z-10 w-full flex items-center justify-center flex-1">
                  <CrateContainerCanvas
                    crateType={selectedCrateId}
                    animationPhase={animationPhase}
                    selectedKeyTier={selectedKeyTier}
                    shakeStage={shakeStage}
                    isWin={lastRollResult?.isWin}
                    styleColor={selectedCrateId === 'striker' ? '#ef4444' : selectedCrateId === 'grappler' ? '#38bdf8' : '#fbbf24'}
                    width={isCompactLandscape ? 180 : isLandscape ? 240 : 340}
                    height={isCompactLandscape ? 95 : isLandscape ? 130 : 210}
                  />
                </div>

                {/* Empty Crate Banner (When unboxing rolled a blank / fail) */}
                <AnimatePresence>
                  {showEmptyBanner && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="mt-2 p-2 px-4 rounded-xl bg-zinc-900 border border-zinc-700 text-center flex items-center gap-3 shadow-lg z-20"
                    >
                      <div className="text-left">
                        <div className="text-[11px] font-display font-black uppercase text-zinc-300">
                          EMPTY CHEST
                        </div>
                        <div className="text-[8.5px] font-mono text-zinc-500">
                          Try a higher Luck Key or Target Wishlist!
                        </div>
                      </div>
                      <button
                        onClick={handleCloseAndReplaceCrate}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer"
                      >
                        Slide Next
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* RIGHT: KEY TIER LUCK DECK & UNBOX TRIGGER */}
              <div className={`space-y-2.5 sm:space-y-3 ${
                isLandscape ? 'col-span-5' : 'w-full'
              }`}>
                {/* 4 KEY TIER SELECTOR */}
                <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-zinc-400 font-bold uppercase">Select Key Luck Tier</span>
                    <span className="text-amber-400 font-bold">
                      {selectedKeyConfig.luckBadge} Luck Modifier
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.keys(KEY_TIERS) as KeyTier[]).map(tierKey => {
                      const tier = KEY_TIERS[tierKey];
                      const isSelected = selectedKeyTier === tierKey;
                      const count = keyInventory[tierKey] || 0;

                      return (
                        <button
                          key={tierKey}
                          disabled={isBusy}
                          onClick={() => {
                            setSelectedKeyTier(tierKey);
                            soundManager.playRollTick?.();
                          }}
                          className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-sm'
                              : 'bg-zinc-950/70 border-zinc-850 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                          }`}
                        >
                          <div>
                            <div className="text-[10px] font-display font-black uppercase text-white">
                              {tier.name}
                            </div>
                            <div className="text-[8px] font-mono text-zinc-500">
                              {tier.luckBadge} Odds
                            </div>
                          </div>
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            count > 0 ? 'bg-zinc-850 text-amber-400' : 'bg-red-950 text-red-400 border border-red-800/60'
                          }`}>
                            x{count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* TARGET WISHLIST DRAWER (NORMAL CRATE ONLY) */}
                {selectedCrateId === 'normal' && (
                  <div className="p-2.5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-zinc-900 to-zinc-900 border border-purple-500/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Crosshair className="w-4 h-4 text-purple-400" />
                      <div>
                        <div className="text-[10px] font-display font-black uppercase text-purple-300">
                          Target Wishlist (+20% Boost)
                        </div>
                        <div className="text-[8.5px] font-mono text-zinc-400 truncate max-w-[170px]">
                          {wishlistedStyleObj ? `Locked: ${wishlistedStyleObj.name}` : 'No target style set'}
                        </div>
                      </div>
                    </div>

                    <button
                      disabled={isWishlistOnCooldown}
                      onClick={() => setShowWishlistModal(true)}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer"
                    >
                      {wishlistedStyleObj ? 'Change' : 'Set Target'}
                    </button>
                  </div>
                )}

                {/* LIVE WIN PROBABILITY TELEMETRY BAR */}
                <div className="p-2.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-1.5 shadow-inner">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-zinc-400 uppercase font-bold">Calculated Style Odds</span>
                    <span className="text-emerald-400 font-black">
                      {(effectiveWinRate * 100).toFixed(1)}% Win Rate
                    </span>
                  </div>
                  <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800 p-0.5">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(5, effectiveWinRate * 100))}%` }}
                    />
                  </div>
                </div>

                {/* MAIN UNBOX CTA BUTTON */}
                <button
                  disabled={isBusy || selectedKeyCount <= 0 || (selectedCrateId === 'origin' && isOriginOnCooldown)}
                  onClick={handleUnboxCrate}
                  className={`w-full py-3 sm:py-3.5 rounded-2xl font-display font-black italic uppercase tracking-wider text-xs sm:text-sm transition-all duration-200 shadow-xl flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                    selectedKeyCount <= 0
                      ? 'bg-zinc-800 border border-zinc-700 text-zinc-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black border border-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.4)]'
                  }`}
                >
                  <Key className="w-4 h-4 text-black" />
                  <span>
                    {selectedKeyCount <= 0
                      ? `NO ${selectedKeyTier.toUpperCase()} KEYS AVAILABLE`
                      : `OPEN ${selectedCrate.name.toUpperCase()} (USE 1 KEY)`}
                  </span>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: KEY STORE                                               */}
        {/* ============================================================== */}
        {activeSubTab === 'shop' && (
          <div className="w-full max-w-5xl mx-auto space-y-4 pb-6">
            {/* STORE BANNER */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-950 border border-amber-500/40 flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-display font-black italic uppercase text-white tracking-wide">
                  CYBERNETIC KEY COMMISSARY
                </h2>
                <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
                  Purchase keys with arena fight earnings or fuse lower-tier keys into high-rarity keys.
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono font-black text-emerald-400">
                <DollarSign className="w-4 h-4" />
                <span>${stats.cash.toLocaleString()}</span>
              </div>
            </div>

            {/* KEY PURCHASE CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(Object.keys(KEY_TIERS) as KeyTier[]).map(tierKey => {
                const tier = KEY_TIERS[tierKey];
                const count = keyInventory[tierKey] || 0;
                const cost = tier.cost || 250;
                const canAfford = stats.cash >= cost;

                return (
                  <div 
                    key={tierKey}
                    className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                          tierKey === 'iron' ? 'bg-zinc-800 text-zinc-300' :
                          tierKey === 'gold' ? 'bg-amber-950 text-amber-300 border border-amber-800/80' :
                          tierKey === 'diamond' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80' :
                          'bg-purple-950 text-purple-300 border border-purple-800/80'
                        }`}>
                          {tier.luckBadge} Luck
                        </span>
                        <span className="text-xs font-mono font-bold text-zinc-400">
                          Owned: {count}
                        </span>
                      </div>

                      <h3 className="text-xs font-display font-black uppercase text-white">
                        {tier.name}
                      </h3>
                      <p className="text-[9px] font-mono text-zinc-500 mt-0.5">
                        {tier.description}
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
                      <div className="flex items-center justify-between text-xs font-mono font-bold text-emerald-400">
                        <span>Price:</span>
                        <span>${cost.toLocaleString()}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-1 pt-1">
                        <button
                          disabled={!canAfford}
                          onClick={() => handleBuyKeys(tierKey, 1)}
                          className="py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-lg text-[9px] font-mono font-bold uppercase transition cursor-pointer"
                        >
                          +1
                        </button>
                        <button
                          disabled={stats.cash < cost * 5}
                          onClick={() => handleBuyKeys(tierKey, 5)}
                          className="py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-lg text-[9px] font-mono font-bold uppercase transition cursor-pointer"
                        >
                          +5
                        </button>
                        <button
                          disabled={stats.cash < cost * 10}
                          onClick={() => handleBuyKeys(tierKey, 10)}
                          className="py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-lg text-[9px] font-mono font-bold uppercase transition cursor-pointer"
                        >
                          +10
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* KEY FUSION / CONVERSION MATRIX */}
            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-display font-black uppercase text-white">
                  KEY TRANSMUTATION & FUSION CHAMBER
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* 3 Iron -> 1 Gold */}
                <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-850 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono font-bold text-zinc-300">3 Iron &rarr; 1 Gold</div>
                    <div className="text-[8px] font-mono text-zinc-500">Available: {keyInventory.iron} Fe</div>
                  </div>
                  <button
                    disabled={keyInventory.iron < 3}
                    onClick={() => handleFuseKeys('iron', 'gold')}
                    className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-lg text-[9px] font-mono font-bold uppercase transition cursor-pointer"
                  >
                    Fuse (3:1)
                  </button>
                </div>

                {/* 3 Gold -> 1 Diamond */}
                <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-850 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono font-bold text-zinc-300">3 Gold &rarr; 1 Diamond</div>
                    <div className="text-[8px] font-mono text-zinc-500">Available: {keyInventory.gold} Au</div>
                  </div>
                  <button
                    disabled={keyInventory.gold < 3}
                    onClick={() => handleFuseKeys('gold', 'diamond')}
                    className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-lg text-[9px] font-mono font-bold uppercase transition cursor-pointer"
                  >
                    Fuse (3:1)
                  </button>
                </div>

                {/* 3 Diamond -> 1 Obsidian */}
                <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-850 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono font-bold text-zinc-300">3 Diamond &rarr; 1 Obsidian</div>
                    <div className="text-[8px] font-mono text-zinc-500">Available: {keyInventory.diamond} Dia</div>
                  </div>
                  <button
                    disabled={keyInventory.diamond < 3}
                    onClick={() => handleFuseKeys('diamond', 'obsidian')}
                    className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-lg text-[9px] font-mono font-bold uppercase transition cursor-pointer"
                  >
                    Fuse (3:1)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: GENETICS LAB                                            */}
        {/* ============================================================== */}
        {activeSubTab === 'genetics' && (
          <div className="w-full max-w-5xl mx-auto space-y-4 pb-6">
            {/* LAB BANNER */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-950 border border-emerald-500/40 flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-base font-display font-black italic uppercase text-white tracking-wide">
                  BIOMETRIC GENETICS LAB
                </h2>
                <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
                  Calibrate your fighter&apos;s physical stature and unlock trade-off modifiers in reach, mass, and velocity.
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono font-black text-emerald-400">
                <Dna className="w-4 h-4 animate-pulse" />
                <span>ACTIVE MUTATION</span>
              </div>
            </div>

            {/* GENETICS CALIBRATION WORKSPACE */}
            <div className="grid grid-cols-1 landscape:grid-cols-2 md:grid-cols-2 gap-3">
              {/* LEFT: CHARACTER STATURE PREVIEW */}
              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-zinc-400 uppercase font-bold">Fighter Height</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {formatHeight(previewHeight)}
                    </span>
                  </div>

                  <div className="mt-4 p-6 rounded-2xl bg-zinc-950 border border-zinc-850 flex flex-col items-center justify-center text-center space-y-2">
                    <div className="text-3xl font-display font-black italic uppercase text-white tracking-wider">
                      {formatHeight(previewHeight)}
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold uppercase">
                      {previewHeightMods.label} ({previewHeightMods.heightTier})
                    </span>
                  </div>
                </div>

                {/* CALIBRATE BUTTON */}
                <div className="space-y-2">
                  <button
                    disabled={isRollingHeight}
                    onClick={handleRollHeight}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white rounded-xl font-display font-black italic uppercase tracking-wider text-xs shadow-lg transition cursor-pointer active:scale-95"
                  >
                    {isRollingHeight ? 'RESEQUENCING DNA...' : 'CALIBRATE STATURE (FREE ROLL)'}
                  </button>

                  {showHeightConfirm && (
                    <button
                      onClick={handleConfirmHeight}
                      className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-mono font-bold uppercase text-xs shadow-md transition cursor-pointer animate-pulse"
                    >
                      CONFIRM & SAVE MUTATION ({formatHeight(previewHeight)})
                    </button>
                  )}
                </div>
              </div>

              {/* RIGHT: STAT DELTA TELEMETRY */}
              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
                <h3 className="text-xs font-display font-black uppercase text-white">
                  PHYSICAL TRADE-OFF TELEMETRY
                </h3>

                <div className="space-y-2 text-xs font-mono">
                  {/* Reach Modifier */}
                  <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-850 flex items-center justify-between">
                    <span className="text-zinc-400">Strike Reach Reach:</span>
                    <span className={`font-bold ${previewHeightMods.reachBonus >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {previewHeightMods.reachBonus >= 0 ? '+' : ''}
                      {(previewHeightMods.reachBonus * 100).toFixed(1)}%
                    </span>
                  </div>

                  {/* Execution Velocity */}
                  <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-850 flex items-center justify-between">
                    <span className="text-zinc-400">Strike Frame Pace:</span>
                    <span className={`font-bold ${previewHeightMods.executionSpeedFactor >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {((previewHeightMods.executionSpeedFactor - 1) * 100) >= 0 ? '+' : ''}
                      {((previewHeightMods.executionSpeedFactor - 1) * 100).toFixed(1)}%
                    </span>
                  </div>

                  {/* Mass / Damage Factor */}
                  <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-850 flex items-center justify-between">
                    <span className="text-zinc-400">Displacement Damage:</span>
                    <span className={`font-bold ${previewHeightMods.damageFactor >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {((previewHeightMods.damageFactor - 1) * 100) >= 0 ? '+' : ''}
                      {((previewHeightMods.damageFactor - 1) * 100).toFixed(1)}%
                    </span>
                  </div>

                  {/* Stamina Recovery Rate */}
                  <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-850 flex items-center justify-between">
                    <span className="text-zinc-400">Stamina Recovery:</span>
                    <span className={`font-bold ${previewHeightMods.staminaRegenRate >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {((previewHeightMods.staminaRegenRate - 1) * 100) >= 0 ? '+' : ''}
                      {((previewHeightMods.staminaRegenRate - 1) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ============================================================== */}
      {/* 4. TARGET WISHLIST MODAL (Built into Normal Crate)             */}
      {/* ============================================================== */}
      <AnimatePresence>
        {showWishlistModal && (
          <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-xl bg-zinc-900 border border-purple-500/50 rounded-3xl p-5 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-5 h-5 text-purple-400" />
                  <h3 className="text-sm font-display font-black uppercase text-white">
                    SELECT TARGET WISHLIST STYLE
                  </h3>
                </div>
                <button
                  onClick={() => setShowWishlistModal(false)}
                  className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto custom-scrollbar grid grid-cols-2 gap-2">
                {rollableStyles.map(style => (
                  <button
                    key={style.id}
                    onClick={() => handleSetWishlist(style.id)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      wishlistStyleId === style.id
                        ? 'bg-purple-600/30 border-purple-400 text-purple-200'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-850'
                    }`}
                  >
                    <div className="font-display font-black uppercase text-xs text-white truncate">
                      {style.name}
                    </div>
                    <div className="text-[9px] font-mono text-zinc-500 capitalize">
                      {style.class} &bull; {style.tier}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* 5. STYLE UNLOCKED CELEBRATION REWARD MODAL                     */}
      {/* ============================================================== */}
      <AnimatePresence>
        {showRewardModal && lastRollResult?.style && (
          <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-lg flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className="w-full max-w-lg bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950 border border-amber-500/60 rounded-3xl p-6 text-center space-y-4 shadow-[0_0_50px_rgba(245,158,11,0.3)]"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-400 mx-auto animate-bounce">
                <Sparkles className="w-8 h-8" />
              </div>

              <div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                  NEW FIGHTING STYLE ACQUIRED!
                </span>
                <h2 className="text-2xl font-display font-black italic uppercase text-white mt-1">
                  {lastRollResult.style.name}
                </h2>
                <p className="text-xs text-zinc-400 font-mono mt-1 max-w-sm mx-auto">
                  {lastRollResult.style.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  disabled={!canDismissReward}
                  onClick={() => {
                    if (lastRollResult?.style) {
                      updateStats({ selectedStyleId: lastRollResult.style.id });
                    }
                    setShowRewardModal(false);
                    handleCloseAndReplaceCrate();
                  }}
                  className="py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-xl font-display font-black italic uppercase tracking-wider text-xs transition cursor-pointer"
                >
                  EQUIP STYLE
                </button>

                <button
                  disabled={!canDismissReward}
                  onClick={() => {
                    setShowRewardModal(false);
                    handleCloseAndReplaceCrate();
                  }}
                  className="py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 hover:text-white rounded-xl font-display font-black italic uppercase tracking-wider text-xs transition cursor-pointer"
                >
                  CONTINUE BRAWLING
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
