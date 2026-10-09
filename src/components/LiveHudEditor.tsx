import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Move, RotateCcw, Check, X, Plus, Minus, Sliders, 
  Smartphone, Monitor, Sparkles, Layers, Shield, Zap, Swords, Flame,
  ArrowUp, ArrowDown, ArrowLeft as ArrowLeftIcon, ArrowRight as ArrowRightIcon,
  ChevronUp, ChevronDown, User, Minimize2, Settings, Activity, Skull, Bone
} from 'lucide-react';
import { GameSettings, VirtualControlItem, UserSession, FightingStyle } from '../types';
import { soundManager } from './SoundManager';
import { 
  DEFAULT_LANDSCAPE_LAYOUT, 
  DEFAULT_PORTRAIT_LAYOUT, 
  sanitizeLayout 
} from '../data/hudDefaults';

interface LiveHudEditorProps {
  settings: GameSettings;
  updateSettings: (updates: Partial<GameSettings>) => void;
  isPortrait: boolean;
  onClose: () => void;
  currentUser?: UserSession | null;
  activeStyle?: FightingStyle;
  dummyStyle?: FightingStyle | null;
  playerName?: string;
  opponentName?: string;
  playerHP?: number;
  playerMaxHP?: number;
  dummyHP?: number;
  dummyMaxHP?: number;
  playerArmor?: number;
  playerStamina?: number;
}

function getStyleInitials(id?: string): string {
  if (!id) return 'F';
  if (id.includes('_')) return id.split('_').map(w => w[0]).join('').toUpperCase().slice(0, 3);
  return id.substring(0, 3).toUpperCase();
}

function getStyleBadgeColor(): string {
  return 'text-amber-300 border-amber-500/50 bg-amber-950/40';
}

export default function LiveHudEditor({
  settings,
  updateSettings,
  isPortrait,
  onClose,
  currentUser,
  activeStyle,
  dummyStyle,
  playerName,
  opponentName,
  playerHP,
  playerMaxHP,
  dummyHP,
  dummyMaxHP,
  playerArmor,
  playerStamina,
}: LiveHudEditorProps) {
  // Current orientation tracking (allows manual orientation override or auto sync)
  const [activeOrientation, setActiveOrientation] = useState<'portrait' | 'landscape'>(
    isPortrait ? 'portrait' : 'landscape'
  );

  // Sync orientation if window rotates
  useEffect(() => {
    setActiveOrientation(isPortrait ? 'portrait' : 'landscape');
  }, [isPortrait]);

  // Working copy of layouts so user can cancel or save
  const [landscapeLayout, setLandscapeLayout] = useState<VirtualControlItem[]>(() => 
    sanitizeLayout(settings.mobileControlsLayoutLandscape || settings.mobileControlsLayout, DEFAULT_LANDSCAPE_LAYOUT)
  );
  const [portraitLayout, setPortraitLayout] = useState<VirtualControlItem[]>(() => 
    sanitizeLayout(settings.mobileControlsLayoutPortrait, DEFAULT_PORTRAIT_LAYOUT)
  );

  const currentLayout = activeOrientation === 'portrait' ? portraitLayout : landscapeLayout;
  const setCurrentLayout = activeOrientation === 'portrait' ? setPortraitLayout : setLandscapeLayout;

  // Selected item ID
  const [selectedId, setSelectedId] = useState<string>('light');

  // Precision Step percentage: 10%, 5%, 1%
  const [precisionStep, setPrecisionStep] = useState<10 | 5 | 1>(5);

  // Single-touch lock references: GUARANTEES only 1 control can be moved at a time to prevent bugging!
  const activeTouchIdRef = useRef<number | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragItemName, setDragItemName] = useState<string | null>(null);

  // Pointer delta tracking for free range movement anywhere on cards/buttons
  const dragStartPointerRef = useRef<{ clientX: number; clientY: number }>({ clientX: 0, clientY: 0 });
  const dragStartItemPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Alignment guide & horizontal-only freeze state for Character Cards
  const isCardAlignLockedRef = useRef<boolean>(false);
  const alignTargetYRef = useRef<number>(0);
  const pushTimerStartRef = useRef<number | null>(null);
  const hasBrokenOffRef = useRef<boolean>(false);

  const [alignmentGuide, setAlignmentGuide] = useState<{
    visible: boolean;
    y: number;
    pushProgress: number;
    pushDirection: 'up' | 'down' | null;
  }>({
    visible: false,
    y: 0,
    pushProgress: 0,
    pushDirection: null,
  });

  // Sub-row inspector collapse state
  const [isToolbarMinimized, setIsToolbarMinimized] = useState<boolean>(false);

  // Floating Circle Minimized state: Collapses the ENTIRE editor tab into ONE sleek circle
  const [isCircleMinimized, setIsCircleMinimized] = useState<boolean>(false);

  // Global UI size scale multiplier (affects health, stamina and character cards)
  const baseHudScale = settings.hudScale !== undefined ? settings.hudScale : 0.85;
  const uiScaleMultiplier = baseHudScale / 0.85;

  // Selected item reference
  const selectedItem = currentLayout.find(i => i.id === selectedId) || currentLayout[0];

  // Helper to update selected item
  const updateSelectedItem = useCallback((updates: Partial<VirtualControlItem>) => {
    setCurrentLayout(prev => prev.map(item => {
      if (item.id !== selectedId) return item;
      return { ...item, ...updates };
    }));
  }, [selectedId, setCurrentLayout]);

  // Precision Nudge function
  const nudgeOffset = useCallback((deltaX: number, deltaY: number) => {
    setCurrentLayout(prev => prev.map(item => {
      if (item.id !== selectedId) return item;
      const newX = Math.max(3, Math.min(97, Math.round((item.x + deltaX) * 10) / 10));
      const newY = Math.max(3, Math.min(97, Math.round((item.y + deltaY) * 10) / 10));
      return { ...item, x: newX, y: newY };
    }));
    soundManager.playRollTick?.();
  }, [selectedId, setCurrentLayout]);

  // Arrow Keys Keyboard Listener for live in-game nudging
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        nudgeOffset(0, -precisionStep);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        nudgeOffset(0, precisionStep);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        nudgeOffset(-precisionStep, 0);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nudgeOffset(precisionStep, 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [precisionStep, nudgeOffset]);

  // Helper to adjust scale (+/- 5%)
  const handleScaleChange = (delta: number) => {
    if (!selectedItem) return;
    const currentScale = selectedItem.scale ?? 1.0;
    const newScale = Math.max(0.5, Math.min(1.6, Math.round((currentScale + delta) * 100) / 100));
    updateSelectedItem({ scale: newScale });
    soundManager.playRollTick?.();
  };

  // Helper to adjust opacity (+/- 10%)
  const handleOpacityChange = (delta: number) => {
    if (!selectedItem) return;
    const currentOpacity = selectedItem.opacity ?? 0.85;
    const newOpacity = Math.max(0.2, Math.min(1.0, Math.round((currentOpacity + delta) * 100) / 100));
    updateSelectedItem({ opacity: newOpacity });
    soundManager.playRollTick?.();
  };

  // Reset to default layout for current orientation
  const handleResetLayout = () => {
    if (activeOrientation === 'portrait') {
      setPortraitLayout(JSON.parse(JSON.stringify(DEFAULT_PORTRAIT_LAYOUT)));
    } else {
      setLandscapeLayout(JSON.parse(JSON.stringify(DEFAULT_LANDSCAPE_LAYOUT)));
    }
    soundManager.playRollTick?.();
  };

  // Save changes to persistent settings (including account storage)
  const handleSave = () => {
    updateSettings({
      mobileControlsLayoutLandscape: landscapeLayout,
      mobileControlsLayoutPortrait: portraitLayout,
      mobileControlsLayout: landscapeLayout, // backward compatibility
    });

    try {
      localStorage.setItem('mma_game_settings', JSON.stringify({
        ...settings,
        mobileControlsLayoutLandscape: landscapeLayout,
        mobileControlsLayoutPortrait: portraitLayout,
        mobileControlsLayout: landscapeLayout,
      }));

      if (currentUser?.email) {
        localStorage.setItem(`mma_game_settings_${currentUser.email}`, JSON.stringify({
          ...settings,
          mobileControlsLayoutLandscape: landscapeLayout,
          mobileControlsLayoutPortrait: portraitLayout,
          mobileControlsLayout: landscapeLayout,
        }));
      }
    } catch (e) {
      console.warn('Could not save to local storage', e);
    }

    soundManager.playLevelUp?.();
    onClose();
  };

  // Drag start handler - ENFORCES SINGLE-TOUCH LOCK & FREE-RANGE DELTA TRACKING
  const handleDragStart = (id: string, e: React.TouchEvent | React.MouseEvent) => {
    let clientX = 0;
    let clientY = 0;

    // If it's a touch event, lock onto the first touch only
    if ('touches' in e) {
      if (activeTouchIdRef.current !== null) {
        // Another touch is already active! Reject new touch to avoid multi-touch jitter
        return;
      }
      const touch = e.touches[0];
      activeTouchIdRef.current = touch.identifier;
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    draggingIdRef.current = id;
    setSelectedId(id);
    setIsDragging(true);

    const item = currentLayout.find(i => i.id === id);
    if (item) {
      setDragItemName(item.label);
      dragStartItemPosRef.current = { x: item.x, y: item.y };
    }
    dragStartPointerRef.current = { clientX, clientY };

    // Reset alignment locks
    isCardAlignLockedRef.current = false;
    pushTimerStartRef.current = null;
    hasBrokenOffRef.current = false;
    setAlignmentGuide({ visible: false, y: 0, pushProgress: 0, pushDirection: null });

    soundManager.playRollTick?.();
  };

  // Drag move handler - uses delta percentages relative to live viewport for smooth free-range dragging
  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!draggingIdRef.current) return;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      let touch: React.Touch | null = null;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === activeTouchIdRef.current) {
          touch = e.touches[i];
          break;
        }
      }
      if (!touch) return; // Ignore movement from secondary fingers
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const screenW = window.innerWidth || 1;
    const screenH = window.innerHeight || 1;

    // Delta tracking from grab start position: allows true free-range movement without jumping to corner
    const deltaXPct = ((clientX - dragStartPointerRef.current.clientX) / screenW) * 100;
    const deltaYPct = ((clientY - dragStartPointerRef.current.clientY) / screenH) * 100;

    const rawX = Math.max(3, Math.min(97, dragStartItemPosRef.current.x + deltaXPct));
    const rawY = Math.max(3, Math.min(97, dragStartItemPosRef.current.y + deltaYPct));

    const idToUpdate = draggingIdRef.current;
    let finalX = rawX;
    let finalY = rawY;

    // CHARACTER CARDS ALIGNMENT & HORIZONTAL-ONLY FREEZE LOGIC
    if (idToUpdate === 'player_card' || idToUpdate === 'opponent_card') {
      const otherCardId = idToUpdate === 'player_card' ? 'opponent_card' : 'player_card';
      const otherCard = currentLayout.find(i => i.id === otherCardId);

      if (otherCard) {
        const targetY = otherCard.y;
        const distY = Math.abs(rawY - targetY);

        if (!hasBrokenOffRef.current) {
          // Snap threshold: within 2.5% of other card's Y position
          if (!isCardAlignLockedRef.current && distY <= 2.5) {
            isCardAlignLockedRef.current = true;
            alignTargetYRef.current = targetY;
            pushTimerStartRef.current = null;
            soundManager.playRollTick?.();
          }

          if (isCardAlignLockedRef.current) {
            // Freezes once aligned and only allows horizontal moving
            finalY = alignTargetYRef.current;

            // Check vertical push away from alignment line
            const verticalDisplacement = rawY - alignTargetYRef.current;
            const isPushingVertically = Math.abs(verticalDisplacement) > 1.8;

            if (isPushingVertically) {
              const now = Date.now();
              if (pushTimerStartRef.current === null) {
                pushTimerStartRef.current = now;
              }
              const elapsed = now - pushTimerStartRef.current;
              const progress = Math.min(1, elapsed / 1500); // 1.5 seconds

              if (elapsed >= 1500) {
                // Break off alignment after 1.5s continuous push!
                isCardAlignLockedRef.current = false;
                hasBrokenOffRef.current = true;
                pushTimerStartRef.current = null;
                finalY = rawY;
                soundManager.playLevelUp?.();
                setAlignmentGuide({ visible: false, y: targetY, pushProgress: 0, pushDirection: null });
              } else {
                setAlignmentGuide({
                  visible: true,
                  y: alignTargetYRef.current,
                  pushProgress: progress,
                  pushDirection: verticalDisplacement < 0 ? 'up' : 'down',
                });
              }
            } else {
              // Reset push timer if user is not pushing vertically
              pushTimerStartRef.current = null;
              setAlignmentGuide({
                visible: true,
                y: alignTargetYRef.current,
                pushProgress: 0,
                pushDirection: null,
              });
            }
          } else {
            setAlignmentGuide({ visible: false, y: 0, pushProgress: 0, pushDirection: null });
          }
        } else {
          // Card was broken off: free movement. Reset break-off if user moves far away (> 7%)
          if (distY > 7.0) {
            hasBrokenOffRef.current = false;
          }
          setAlignmentGuide({ visible: false, y: 0, pushProgress: 0, pushDirection: null });
        }
      }
    }

    setCurrentLayout(prev => prev.map(item => {
      if (item.id === idToUpdate) {
        return {
          ...item,
          x: Math.round(finalX * 10) / 10,
          y: Math.round(finalY * 10) / 10,
        };
      }
      return item;
    }));
  };

  // Drag end handler - releases single-touch lock and hides alignment line
  const handleDragEnd = (e?: React.TouchEvent | React.MouseEvent) => {
    if (e && 'changedTouches' in e && activeTouchIdRef.current !== null) {
      let match = false;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchIdRef.current) {
          match = true;
          break;
        }
      }
      if (!match) return; // Released a secondary finger, keep dragging primary
    }

    activeTouchIdRef.current = null;
    draggingIdRef.current = null;
    setIsDragging(false);
    setDragItemName(null);

    // Reset alignment locks and hide alignment line
    isCardAlignLockedRef.current = false;
    pushTimerStartRef.current = null;
    hasBrokenOffRef.current = false;
    setAlignmentGuide({ visible: false, y: 0, pushProgress: 0, pushDirection: null });
  };

  // Global listeners for mouse move and touch end to prevent stuck drag
  useEffect(() => {
    const handleGlobalTouchEnd = (e: TouchEvent) => {
      if (activeTouchIdRef.current !== null) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === activeTouchIdRef.current) {
            handleDragEnd();
            break;
          }
        }
      }
    };

    const handleGlobalMouseUp = () => {
      if (draggingIdRef.current) {
        handleDragEnd();
      }
    };

    window.addEventListener('touchend', handleGlobalTouchEnd);
    window.addEventListener('touchcancel', handleGlobalTouchEnd);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('touchend', handleGlobalTouchEnd);
      window.removeEventListener('touchcancel', handleGlobalTouchEnd);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  const isCardSelected = selectedItem?.id === 'player_card' || selectedItem?.id === 'opponent_card';

  return (
    <div 
      className="fixed inset-0 z-[120] select-none touch-none overflow-hidden"
      onTouchMove={handleDragMove}
      onTouchEnd={handleDragEnd}
      onMouseMove={handleDragMove}
      onMouseUp={() => handleDragEnd()}
    >
      {/* Subtle editor grid background over live arena */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] pointer-events-none" />

      {/* 1. FLOATING MINIMIZED CIRCLE (When user minimizes the tab into one circle) */}
      {isCircleMinimized && (
        <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-50 pointer-events-auto flex items-center gap-2 select-none animate-fade-in">
          {/* Status Hint Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950/90 border border-purple-500/40 rounded-full text-[10px] font-mono text-purple-300 shadow-xl backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
            <span>HUD Tab Minimized • Drag buttons anywhere</span>
          </div>

          {/* Quick Save pill button */}
          <button
            onClick={handleSave}
            title="Save layout and exit"
            className="h-11 px-3.5 bg-emerald-600/95 hover:bg-emerald-500 border border-emerald-400 text-white rounded-full font-mono font-black text-[10px] uppercase tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.5)] flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Save</span>
          </button>

          {/* The Minimized Circle Button */}
          <button
            onClick={() => {
              setIsCircleMinimized(false);
              soundManager.playRollTick?.();
            }}
            title="Tap to expand HUD Toolbar"
            className="w-12 h-12 rounded-full bg-zinc-950/95 border-2 border-purple-400 hover:border-purple-300 shadow-[0_0_25px_rgba(168,85,247,0.7)] flex flex-col items-center justify-center cursor-pointer active:scale-90 hover:scale-105 transition-all text-white group relative"
          >
            <Sliders className="w-5 h-5 text-purple-300 group-hover:rotate-45 transition-transform" />
            <span className="text-[7px] font-mono font-black text-purple-200 uppercase leading-none mt-0.5 tracking-tight">
              HUD
            </span>
            {/* Radar pulse notification ping */}
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500 border border-zinc-950"></span>
            </span>
          </button>
        </div>
      )}

      {/* 2. FULL FLOATING TOP TOOLBAR & CONTROLS DOCK (When not minimized) */}
      {!isCircleMinimized && (
        <div className="absolute top-2 left-2 right-2 sm:left-4 sm:right-4 z-50 pointer-events-auto flex flex-col items-center">
          <div className="w-full max-w-3xl bg-zinc-950/95 border border-purple-500/60 shadow-2xl rounded-2xl backdrop-blur-xl p-2.5 sm:p-3 flex flex-col gap-2 transition-all">
            
            {/* Bar Header: Title, Orientation, Minimize Toggle & Action Buttons */}
            <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-2 flex-wrap">
              
              {/* Title & Mode Indicator */}
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
                </span>
                <div>
                  <h2 className="text-xs sm:text-sm font-display font-black italic uppercase text-white tracking-wider flex items-center gap-1.5">
                    <Move className="w-3.5 h-3.5 text-purple-400" />
                    Live In-Game HUD Editor
                  </h2>
                  <div className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-400">
                    <span className="uppercase text-purple-300 font-bold">
                      {activeOrientation === 'portrait' ? '📱 Portrait Active' : '🖥️ Landscape Active'}
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-amber-400 font-bold">Step: {precisionStep}%</span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-300">Drag 1 at a time</span>
                  </div>
                </div>
              </div>

              {/* Step Size Selector in Toolbar */}
              <div className="flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-800 text-[9px] font-mono">
                <span className="text-zinc-400 uppercase font-bold mr-0.5">Step:</span>
                {([10, 5, 1] as const).map(step => (
                  <button
                    key={step}
                    onClick={() => {
                      setPrecisionStep(step);
                      soundManager.playRollTick?.();
                    }}
                    className={`px-1.5 py-0.5 rounded font-black transition cursor-pointer ${
                      precisionStep === step
                        ? 'bg-amber-500 text-black shadow font-black'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {step}%
                  </button>
                ))}
              </div>

              {/* Top Right Action Buttons */}
              <div className="flex items-center gap-1.5">
                {/* Minimize Tab into One Circle Button */}
                <button
                  onClick={() => {
                    setIsCircleMinimized(true);
                    soundManager.playRollTick?.();
                  }}
                  title="Minimize editor tab into one floating circle"
                  className="px-2 py-1 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/60 text-purple-200 hover:text-white rounded-lg text-[10px] font-mono font-bold uppercase transition flex items-center gap-1.5 cursor-pointer shadow active:scale-95"
                >
                  <Minimize2 className="w-3.5 h-3.5 text-purple-300" />
                  <span className="hidden sm:inline">Minimize Tab</span>
                </button>

                {/* Sub-row collapse toggle */}
                <button
                  onClick={() => setIsToolbarMinimized(!isToolbarMinimized)}
                  title="Collapse inspector row"
                  className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-300 rounded-lg text-[10px] font-mono font-bold uppercase transition flex items-center gap-1 cursor-pointer"
                >
                  {isToolbarMinimized ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>

                {/* Reset button */}
                <button
                  onClick={handleResetLayout}
                  title="Reset layout to default"
                  className="p-1.5 sm:px-2 sm:py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-300 hover:text-white rounded-lg text-[10px] font-mono font-bold uppercase transition flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </button>

                {/* Cancel button */}
                <button
                  onClick={onClose}
                  title="Discard changes and exit"
                  className="p-1.5 sm:px-2.5 sm:py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-400 hover:text-red-400 rounded-lg text-[10px] font-mono font-bold uppercase transition flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cancel</span>
                </button>

                {/* Save & Exit button */}
                <button
                  onClick={handleSave}
                  title="Save layout and resume match"
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-mono font-black uppercase tracking-wider transition flex items-center gap-1 cursor-pointer shadow-lg shadow-emerald-600/30 active:scale-95"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save & Exit</span>
                </button>
              </div>
            </div>

            {/* Controls Bar: Selected Item Inspector & Scale Slider/Steppers */}
            {!isToolbarMinimized && selectedItem && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                
                {/* Selected Control Label Badge */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold">Selected:</span>
                  <span 
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase flex items-center gap-1.5 border"
                    style={{
                      backgroundColor: `${selectedItem.color}22`,
                      borderColor: `${selectedItem.color}88`,
                      color: '#ffffff'
                    }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedItem.color }} />
                    {selectedItem.label}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500">
                    (X:{Math.round(selectedItem.x)}%, Y:{Math.round(selectedItem.y)}%)
                  </span>
                </div>

                {/* Directional Nudges */}
                <div className="flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-800">
                  <span className="text-[9px] font-mono text-zinc-400 uppercase font-bold mr-1">Nudge:</span>
                  <button
                    onClick={() => nudgeOffset(-precisionStep, 0)}
                    className="w-5 h-5 bg-zinc-800 hover:bg-amber-600 rounded flex items-center justify-center text-xs font-bold cursor-pointer"
                    title="Shift Left"
                  >
                    <ArrowLeftIcon className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => nudgeOffset(0, -precisionStep)}
                    className="w-5 h-5 bg-zinc-800 hover:bg-amber-600 rounded flex items-center justify-center text-xs font-bold cursor-pointer"
                    title="Shift Up"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => nudgeOffset(0, precisionStep)}
                    className="w-5 h-5 bg-zinc-800 hover:bg-amber-600 rounded flex items-center justify-center text-xs font-bold cursor-pointer"
                    title="Shift Down"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => nudgeOffset(precisionStep, 0)}
                    className="w-5 h-5 bg-zinc-800 hover:bg-amber-600 rounded flex items-center justify-center text-xs font-bold cursor-pointer"
                    title="Shift Right"
                  >
                    <ArrowRightIcon className="w-3 h-3" />
                  </button>
                </div>

                {/* UI Size Scale Stepper (shown especially when Player Card or Opponent Card is selected) */}
                {isCardSelected && (
                  <div className="flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-800">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase font-bold mr-1">UI Size:</span>
                    {[0.5, 0.65, 0.8, 1.0, 1.2].map(scale => {
                      const active = Math.abs((settings.hudScale ?? 0.85) - scale) < 0.02;
                      return (
                        <button
                          key={scale}
                          onClick={() => {
                            updateSettings({ hudScale: scale });
                            soundManager.playRollTick?.();
                          }}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition cursor-pointer ${
                            active
                              ? 'bg-blue-600 text-white shadow font-black'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {Math.round(scale * 100)}%
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Scale Adjuster Steppers */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-800">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase font-bold mr-1">Scale:</span>
                    <button
                      onClick={() => handleScaleChange(-0.05)}
                      className="w-5 h-5 bg-zinc-800 hover:bg-zinc-700 text-white rounded flex items-center justify-center text-xs font-bold cursor-pointer transition active:scale-90"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] font-mono font-bold text-cyan-300 w-10 text-center">
                      {Math.round((selectedItem.scale ?? 1.0) * 100)}%
                    </span>
                    <button
                      onClick={() => handleScaleChange(0.05)}
                      className="w-5 h-5 bg-zinc-800 hover:bg-zinc-700 text-white rounded flex items-center justify-center text-xs font-bold cursor-pointer transition active:scale-90"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Opacity Adjuster Stepper */}
                  <div className="flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-800">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase font-bold mr-1">Alpha:</span>
                    <button
                      onClick={() => handleOpacityChange(-0.1)}
                      className="w-5 h-5 bg-zinc-800 hover:bg-zinc-700 text-white rounded flex items-center justify-center text-xs font-bold cursor-pointer transition active:scale-90"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] font-mono font-bold text-amber-300 w-8 text-center">
                      {Math.round((selectedItem.opacity ?? 0.85) * 100)}%
                    </span>
                    <button
                      onClick={() => handleOpacityChange(0.1)}
                      className="w-5 h-5 bg-zinc-800 hover:bg-zinc-700 text-white rounded flex items-center justify-center text-xs font-bold cursor-pointer transition active:scale-90"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* Quick Item Picker Strip (Scrollable) */}
            <div className="flex items-center gap-1 overflow-x-auto py-0.5 border-t border-zinc-900 scrollbar-none">
              {currentLayout.map(item => {
                const isSelected = item.id === selectedId;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedId(item.id);
                      soundManager.playRollTick?.();
                    }}
                    className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-tight shrink-0 transition cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-purple-500 text-white shadow font-black'
                        : 'bg-zinc-900/90 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.label.split(' ')[0]}
                  </button>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* FLOATING DRAG HINT BADGE */}
      {isDragging && dragItemName && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-50 pointer-events-none bg-purple-950/90 border border-purple-400/80 text-purple-200 px-3 py-1 rounded-full font-mono text-[10px] font-bold uppercase shadow-2xl flex items-center gap-1.5 animate-pulse">
          <Move className="w-3 h-3 text-purple-400" />
          <span>Moving: {dragItemName} (Touch locked)</span>
        </div>
      )}

      {/* CARD ALIGNMENT LINE (Appears only when moving, freezes horizontally, 1.5s push breaks it off) */}
      {alignmentGuide.visible && (
        <div 
          className="absolute inset-x-0 z-50 pointer-events-none flex items-center justify-center transition-all duration-75"
          style={{ top: `${alignmentGuide.y}%` }}
        >
          {/* Laser guide line spanning the entire width */}
          <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_16px_rgba(34,211,238,1)]" />
          
          {/* Status badge */}
          <div className="absolute px-3 py-1 bg-zinc-950/95 border border-cyan-400 rounded-full shadow-2xl flex items-center gap-2 text-cyan-300 font-mono text-[9px] uppercase font-bold tracking-wider select-none backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
            <span>CARDS ALIGNED ({Math.round(alignmentGuide.y)}% Y)</span>
            {alignmentGuide.pushProgress > 0 ? (
              <div className="flex items-center gap-1.5 pl-2 border-l border-cyan-400/40 text-amber-400 font-black">
                <span>BREAKING {Math.round(alignmentGuide.pushProgress * 100)}%</span>
                <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-400 to-red-500 transition-all duration-75"
                    style={{ width: `${alignmentGuide.pushProgress * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <span className="text-zinc-400 text-[8px] font-normal lowercase">(push up/down 1.5s to break)</span>
            )}
          </div>
        </div>
      )}

      {/* RENDER ALL LIVE INTERACTIVE CONTROLS ON SCREEN */}
      {currentLayout.map(item => {
        const isSelected = item.id === selectedId;
        const itemScale = item.scale ?? 1.0;
        const itemOpacity = item.opacity ?? 0.85;

        const isPlayerCard = item.id === 'player_card';
        const isOpponentCard = item.id === 'opponent_card';
        const isCard = isPlayerCard || isOpponentCard;
        const isM2Cooldown = item.id === 'm2_cooldown';
        const isMenu = item.id === 'menu_settings';
        const isStatusBar = item.id === 'status_bar';
        const isJoystick = item.id === 'joystick';

        // ACCURATE USER & ENEMY CARD RENDERING
        if (isCard) {
          const effectiveCardScale = (item.scale ?? 0.85) * uiScaleMultiplier;

          return (
            <div
              key={item.id}
              onTouchStart={(e) => handleDragStart(item.id, e)}
              onMouseDown={(e) => handleDragStart(item.id, e)}
              className="absolute z-30 cursor-move select-none touch-none transition-all duration-75"
              style={{
                top: `${item.y}%`,
                left: `${item.x}%`,
                transform: `translate(-50%, 0) scale(${effectiveCardScale})`,
                transformOrigin: 'top center',
                width: '270px',
                maxWidth: '92vw',
                opacity: isDragging && draggingIdRef.current !== item.id ? 0.6 : itemOpacity,
              }}
            >
              {isPlayerCard ? (
                /* ACCURATE LOCAL PLAYER CARD */
                <div 
                  className={`w-full bg-zinc-950/90 backdrop-blur-md border ${
                    isSelected 
                      ? 'border-purple-400 ring-2 ring-purple-400 shadow-[0_0_30px_rgba(192,132,252,0.8)]' 
                      : 'border-zinc-800/90 hover:border-zinc-700'
                  } p-1.5 sm:p-2.5 flex gap-1.5 sm:gap-2.5 shadow-2xl relative rounded-xl transition-all`}
                >
                  {/* Selected Item Helper Tag */}
                  {isSelected && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-purple-950 text-purple-200 border border-purple-400 px-2 py-0.2 rounded-full text-[8px] font-mono font-bold uppercase tracking-wider shadow whitespace-nowrap z-50">
                      User Card • Drag to move
                    </div>
                  )}

                  {/* PORTRAIT */}
                  <div 
                    className="w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-zinc-900 border flex flex-col items-center justify-center relative shrink-0 overflow-hidden rounded-lg"
                    style={{ borderColor: activeStyle?.secondaryColor || '#ef4444' }}
                  >
                    <span className="font-display font-black text-xs sm:text-base italic" style={{ color: activeStyle?.color || '#ffffff' }}>
                      {getStyleInitials(activeStyle?.id || 'boxing')}
                    </span>
                    <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[6px] sm:text-[8px] text-amber-400 text-center font-mono py-0.5">
                      STD
                    </span>
                  </div>

                  {/* CARD DETAILS */}
                  <div className="flex-1 flex flex-col gap-0.5 sm:gap-1 min-w-0">
                    {/* Header info */}
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-white font-display font-black italic uppercase tracking-wide text-[9px] sm:text-xs flex items-center gap-1 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
                        <span className="truncate">{playerName || 'YOU'}</span>
                      </span>
                      <span className={`text-[6px] sm:text-[8px] font-mono font-bold uppercase tracking-widest px-1 py-0.5 border shrink-0 ${getStyleBadgeColor()}`}>
                        {activeStyle?.name || 'Boxing'}
                      </span>
                    </div>

                    {/* Main Health Bar */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[8px] sm:text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                        <span>HP</span>
                        <span className="text-red-400">{Math.floor(playerHP ?? 100)}/{playerMaxHP ?? 100}</span>
                      </div>
                      <div className="w-full bg-zinc-900 h-1.5 sm:h-2 border border-zinc-800 overflow-hidden rounded-full">
                        <div 
                          className="bg-gradient-to-r from-red-600 to-rose-500 h-full"
                          style={{ width: `${Math.max(0, ((playerHP ?? 100) / (playerMaxHP ?? 100)) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Guard Bar */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[8px] sm:text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <Shield className="w-2.5 h-2.5 text-cyan-400" />
                          GUARD
                        </span>
                        <span className="text-cyan-400 font-bold">{Math.round(playerArmor ?? 18)} AP</span>
                      </div>
                      <div className="w-full bg-zinc-900 h-1 sm:h-1.5 border border-zinc-800 overflow-hidden rounded-full">
                        <div 
                          className="h-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                          style={{ width: `${((playerArmor ?? 18) / 18) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Stamina Bar */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[8px] sm:text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <Flame className="w-2.5 h-2.5 text-amber-500" />
                          STAMINA
                        </span>
                        <span className="text-amber-400 font-bold">{Math.round(playerStamina ?? 100)}/100</span>
                      </div>
                      <div className="w-full bg-zinc-900 h-1 sm:h-1.5 border border-zinc-800 overflow-hidden rounded-full">
                        <div 
                          className="h-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]"
                          style={{ width: `${Math.max(0, Math.min(100, playerStamina ?? 100))}%` }}
                        />
                      </div>
                    </div>

                    {/* Dodge Bar */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[8px] sm:text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5 text-fuchsia-400" />
                          Dodge (E)
                        </span>
                        <span className="text-fuchsia-400 font-bold">READY</span>
                      </div>
                      <div className="w-full bg-zinc-900 h-1 border border-zinc-800 overflow-hidden rounded-full">
                        <div className="h-full bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.5)] w-full" />
                      </div>
                    </div>
                  </div>

                  {/* Corner Drag Handles */}
                  {isSelected && (
                    <>
                      <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-purple-400 rounded-sm" />
                      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-purple-400 rounded-sm" />
                      <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-purple-400 rounded-sm" />
                      <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-purple-400 rounded-sm" />
                    </>
                  )}
                </div>
              ) : (
                /* ACCURATE ENEMY SPARRING PARTNER CARD */
                <div 
                  className={`w-full bg-zinc-950/90 backdrop-blur-md border ${
                    isSelected 
                      ? 'border-purple-400 ring-2 ring-purple-400 shadow-[0_0_30px_rgba(192,132,252,0.8)]' 
                      : 'border-zinc-800/90 hover:border-zinc-700'
                  } p-1.5 sm:p-2.5 flex gap-1.5 sm:gap-2.5 shadow-2xl relative rounded-xl transition-all`}
                >
                  {/* Selected Item Helper Tag */}
                  {isSelected && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-purple-950 text-purple-200 border border-purple-400 px-2 py-0.2 rounded-full text-[8px] font-mono font-bold uppercase tracking-wider shadow whitespace-nowrap z-50">
                      Enemy Card • Drag to move
                    </div>
                  )}

                  {/* OPPONENT PORTRAIT (Rigid & Symmetric) */}
                  <div 
                    className="w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-zinc-900 border flex flex-col items-center justify-center relative shrink-0 overflow-hidden rounded-lg order-last"
                    style={{ borderColor: dummyStyle?.secondaryColor || '#ef4444' }}
                  >
                    <span className="font-display font-black text-xs sm:text-base italic" style={{ color: dummyStyle?.color || '#ffffff' }}>
                      {getStyleInitials(dummyStyle?.id || 'basic')}
                    </span>
                    <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[6px] sm:text-[8px] text-amber-400 text-center font-mono py-0.5">
                      STD
                    </span>
                  </div>

                  {/* CARD DETAILS */}
                  <div className="flex-1 flex flex-col gap-0.5 sm:gap-1 min-w-0">
                    {/* Header info */}
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-[6px] sm:text-[8px] font-mono font-bold uppercase tracking-widest px-1 py-0.5 border shrink-0 ${getStyleBadgeColor()}`}>
                        {dummyStyle?.name || 'Flow Boxing'}
                      </span>
                      <span className="text-zinc-400 font-display font-black italic uppercase tracking-wide text-[9px] sm:text-xs flex items-center gap-1 truncate justify-end">
                        <span className="truncate">{opponentName || 'ENEMY'}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-ping shrink-0" />
                      </span>
                    </div>

                    {/* Main Health Bar */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[8px] sm:text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                        <span className="text-red-400">{Math.floor(dummyHP ?? 100)}/{dummyMaxHP ?? 100}</span>
                        <span>HP</span>
                      </div>
                      <div className="w-full bg-zinc-900 h-1.5 sm:h-2 border border-zinc-800 overflow-hidden rounded-full">
                        <div 
                          className="bg-gradient-to-r from-red-600 to-rose-500 h-full"
                          style={{ width: `${Math.max(0, ((dummyHP ?? 100) / (dummyMaxHP ?? 100)) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Guard Bar */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[8px] sm:text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                        <span className="text-cyan-400 font-bold">18 AP</span>
                        <span className="flex items-center gap-1 justify-end">
                          GUARD
                          <Shield className="w-2.5 h-2.5 text-cyan-400" />
                        </span>
                      </div>
                      <div className="w-full bg-zinc-900 h-1 sm:h-1.5 border border-zinc-800 overflow-hidden rounded-full">
                        <div className="h-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)] w-full" />
                      </div>
                    </div>

                    {/* Stamina Bar */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[8px] sm:text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                        <span className="text-amber-400 font-bold">100/100</span>
                        <span className="flex items-center gap-1 justify-end">
                          STAMINA
                          <Flame className="w-2.5 h-2.5 text-amber-500" />
                        </span>
                      </div>
                      <div className="w-full bg-zinc-900 h-1 sm:h-1.5 border border-zinc-800 overflow-hidden rounded-full">
                        <div className="h-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)] w-full" />
                      </div>
                    </div>

                    {/* Dodge Bar */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[8px] sm:text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                        <span className="text-fuchsia-400 font-bold">READY</span>
                        <span className="flex items-center gap-1 justify-end">
                          Dodge (E)
                          <Zap className="w-2.5 h-2.5 text-fuchsia-400" />
                        </span>
                      </div>
                      <div className="w-full bg-zinc-900 h-1 border border-zinc-800 overflow-hidden rounded-full">
                        <div className="h-full bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.5)] w-full" />
                      </div>
                    </div>
                  </div>

                  {/* Corner Drag Handles */}
                  {isSelected && (
                    <>
                      <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-purple-400 rounded-sm" />
                      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-purple-400 rounded-sm" />
                      <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-purple-400 rounded-sm" />
                      <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-purple-400 rounded-sm" />
                    </>
                  )}
                </div>
              )}
            </div>
          );
        }

        // FULL M2 COOLDOWN CARD RENDERING (Replaces pill with full authentic card)
        if (isM2Cooldown) {
          return (
            <div
              key={item.id}
              onTouchStart={(e) => handleDragStart(item.id, e)}
              onMouseDown={(e) => handleDragStart(item.id, e)}
              className={`absolute cursor-move select-none touch-none transition-transform z-30 ${
                isSelected 
                  ? 'ring-4 ring-purple-400 ring-offset-2 ring-offset-black scale-105 shadow-[0_0_30px_rgba(192,132,252,0.6)]' 
                  : 'shadow-xl hover:scale-[1.02]'
              }`}
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                transform: `translate(-50%, -50%) scale(${itemScale})`,
                opacity: isDragging && draggingIdRef.current !== item.id ? 0.6 : itemOpacity,
              }}
            >
              {/* FULL M2 CARD (Matches in-game Arena cooldown card) */}
              <div className="bg-zinc-950/95 border-2 border-red-500 p-3 flex items-center gap-3.5 shadow-[0_0_25px_rgba(239,68,68,0.35)] rounded-none pointer-events-auto select-none min-w-[175px]">
                <div className="relative w-11 h-11 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden select-none">
                  <div 
                    className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-red-600/40 to-rose-500/10 origin-bottom"
                    style={{ height: '65%' }}
                  />
                  <span className="relative z-10 text-xl font-bold">
                    🥊
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest font-black leading-none">HEAVY (M2) CD</span>
                  <span className="text-xs font-display font-black text-white italic uppercase leading-none mt-1.5">
                    {activeStyle?.name ? `${activeStyle.name} Heavy` : 'Heavy Hook'}
                  </span>
                  <span className="text-xs font-mono text-red-400 font-black mt-1">
                    2.4s
                  </span>
                </div>
              </div>

              {isSelected && (
                <>
                  <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-purple-400 rounded-sm" />
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-purple-400 rounded-sm" />
                  <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-purple-400 rounded-sm" />
                  <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-purple-400 rounded-sm" />
                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-purple-950 text-purple-300 border border-purple-400 px-1.5 py-0.2 rounded text-[7px] font-mono uppercase whitespace-nowrap shadow">
                    Drag M2 Card
                  </span>
                </>
              )}
            </div>
          );
        }

        // DEDICATED STATUS BAR RENDERING
        if (isStatusBar) {
          const effectiveStatusScale = itemScale * uiScaleMultiplier;
          return (
            <div
              key={item.id}
              onTouchStart={(e) => handleDragStart(item.id, e)}
              onMouseDown={(e) => handleDragStart(item.id, e)}
              className={`absolute cursor-move select-none touch-none transition-transform z-30 ${
                isSelected 
                  ? 'ring-4 ring-purple-400 ring-offset-2 ring-offset-black scale-105 shadow-[0_0_30px_rgba(192,132,252,0.6)]' 
                  : 'shadow-xl hover:scale-[1.02]'
              }`}
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                transform: `translate(-50%, 0) scale(${effectiveStatusScale})`,
                transformOrigin: 'top center',
                opacity: isDragging && draggingIdRef.current !== item.id ? 0.6 : itemOpacity,
              }}
            >
              {/* STATUS BAR PREVIEW: Small straight rectangle with boxes inside */}
              <div className="bg-zinc-950/85 border border-zinc-800/80 px-1.5 py-1 rounded-lg flex items-center gap-1 shadow-2xl backdrop-blur-md">
                <div className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-md border border-red-500 bg-red-950/90 flex flex-col items-center justify-center p-0.5 shadow">
                  <Skull className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                  <span className="text-[7px] font-mono font-black text-red-300">2.5s</span>
                </div>
                <div className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-md border border-amber-500 bg-amber-950/90 flex flex-col items-center justify-center p-0.5 shadow">
                  <Bone className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span className="text-[7px] font-mono font-black text-amber-300">3.0s</span>
                </div>
                <div className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-md border border-teal-500 bg-teal-950/90 flex flex-col items-center justify-center p-0.5 shadow">
                  <Activity className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
                  <span className="text-[7px] font-mono font-black text-teal-300">4.2s</span>
                </div>
              </div>

              {isSelected && (
                <>
                  <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-purple-400 rounded-sm" />
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-purple-400 rounded-sm" />
                  <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-purple-400 rounded-sm" />
                  <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-purple-400 rounded-sm" />
                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-purple-950 text-purple-300 border border-purple-400 px-1.5 py-0.2 rounded text-[7px] font-mono uppercase whitespace-nowrap shadow">
                    Drag Status Bar
                  </span>
                </>
              )}
            </div>
          );
        }

        // Compute element dimensions for non-card controls
        let widthPx = item.radius * 2.0 * itemScale;
        let heightPx = item.radius * 2.0 * itemScale;
        
        if (isMenu) {
          widthPx = Math.max(70, item.radius * 2.8 * itemScale);
          heightPx = Math.max(28, item.radius * 1.4 * itemScale);
        }

        return (
          <div
            key={item.id}
            onTouchStart={(e) => handleDragStart(item.id, e)}
            onMouseDown={(e) => handleDragStart(item.id, e)}
            className={`absolute flex flex-col items-center justify-center cursor-move select-none touch-none transition-transform ${
              isMenu ? 'rounded-xl' : 'rounded-full'
            } ${
              isSelected 
                ? 'ring-4 ring-purple-400 ring-offset-2 ring-offset-black z-40 scale-105 shadow-[0_0_30px_rgba(192,132,252,0.6)]' 
                : 'border-2 border-white/40 hover:border-white z-20 shadow-lg'
            }`}
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              width: `${widthPx}px`,
              height: `${heightPx}px`,
              transform: 'translate(-50%, -50%)',
              backgroundColor: `${item.color}${Math.round(itemOpacity * 255).toString(16).padStart(2, '0')}`,
              opacity: isDragging && draggingIdRef.current !== item.id ? 0.6 : 1.0,
            }}
          >
            {isJoystick ? (
              <div className="relative w-full h-full rounded-full flex items-center justify-center border-2 border-pink-400/80 bg-zinc-950/40">
                <div 
                  className="w-1/2 h-1/2 rounded-full bg-pink-500/90 shadow-md flex items-center justify-center text-white"
                >
                  <Move className="w-3 h-3 text-white" />
                </div>
                <span className="absolute -bottom-4 bg-black/90 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold text-pink-300 uppercase whitespace-nowrap border border-pink-500/40">
                  {item.label}
                </span>
              </div>
            ) : isMenu ? (
              <div className="w-full h-full bg-zinc-950/90 border border-zinc-700/80 hover:border-red-500 rounded-lg flex items-center justify-center gap-1 text-[8px] font-mono font-black text-zinc-200 uppercase px-2 shadow">
                <Settings className="w-3 h-3 text-red-500" />
                <span>MENU</span>
              </div>
            ) : (
              <div className="relative w-full h-full rounded-full flex flex-col items-center justify-center text-white font-mono font-black text-center">
                <span className="text-[10px] sm:text-xs drop-shadow leading-tight">
                  {item.id === 'light' ? 'M1' : item.id === 'heavy' ? 'M2' : item.id === 'block' ? 'BLOCK' : item.id === 'dash' ? 'DASH' : item.id === 'sprint' ? 'SPRINT' : 'TARGET'}
                </span>
                <span className="text-[7px] text-zinc-200 font-normal">
                  {Math.round(itemScale * 100)}%
                </span>
                {isSelected && (
                  <span className="absolute -bottom-4 bg-purple-950 text-purple-300 border border-purple-400 px-1 py-0.2 rounded text-[7px] font-mono uppercase whitespace-nowrap shadow">
                    Drag Me
                  </span>
                )}
              </div>
            )}

            {isSelected && (
              <>
                <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-purple-400 rounded-sm" />
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-purple-400 rounded-sm" />
                <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-purple-400 rounded-sm" />
                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-purple-400 rounded-sm" />
              </>
            )}
          </div>
        );
      })}

      {/* BOTTOM SAFE AREA INSTRUCTION FOOTER (Only shown when toolbar is not minimized to maximize screen space) */}
      {!isCircleMinimized && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none z-40 bg-zinc-950/90 px-4 py-1.5 rounded-full border border-purple-500/40 text-[9px] font-mono text-zinc-300 text-center shadow-2xl flex items-center gap-2">
          <span className="text-amber-400 font-bold">Arrow Keys (↑ ↓ ← →)</span> nudge by {precisionStep}% • Touch & drag to move • Tap "Minimize Tab" for full clear view
        </div>
      )}
    </div>
  );
}
