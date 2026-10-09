import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  RotateCcw, Check, Smartphone, Monitor, 
  Keyboard, Zap, Swords, Plus, Minus, Sliders, ArrowLeft,
  Move, ArrowUp, ArrowDown, ArrowLeft as ArrowLeftIcon, ArrowRight as ArrowRightIcon,
  Play, Grid, Compass, User, Flame, Maximize2, Sparkles, Box
} from 'lucide-react';
import { GameSettings, VirtualControlItem, KeybindSettings, UserSession } from '../types';
import { soundManager } from './SoundManager';
import { 
  DEFAULT_LANDSCAPE_LAYOUT, 
  DEFAULT_PORTRAIT_LAYOUT, 
  DEFAULT_KEYBINDS, 
  formatKeyCode, 
  sanitizeLayout 
} from '../data/hudDefaults';

interface HudEditorModalProps {
  settings: GameSettings;
  updateSettings: (updates: Partial<GameSettings>) => void;
  onClose: () => void;
  currentUser?: UserSession | null;
  isNavHidden?: boolean;
  onLaunchLiveLobby?: () => void;
  onLaunchTestGame?: () => void;
}

export type HudEditMode = 'modifier' | 'pc';
export type PrecisionStep = 10 | 5 | 1;

export default function HudEditorModal({ 
  settings, 
  updateSettings, 
  onClose,
  currentUser,
  isNavHidden = false,
  onLaunchLiveLobby,
  onLaunchTestGame,
}: HudEditorModalProps) {
  // Primary edit mode:
  // - 'modifier': Full HUD & Controls Manager with embedded Tactical Offset Studio
  // - 'pc': Keyboard & Mouse Keybinds
  const [activeTab, setActiveTab] = useState<HudEditMode>('modifier');

  // Phone UI orientation variant
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');

  // Offset Step percentage: 10%, 5%, or 1%
  const [precisionStep, setPrecisionStep] = useState<PrecisionStep>(5);

  // Viewport expand state (collapses side panel to give 100% of workspace to viewport)
  const [isExpandedViewport, setIsExpandedViewport] = useState(false);

  // Keybinds state
  const [keybinds, setKeybinds] = useState<KeybindSettings>(() => ({
    block: settings.keybinds?.block || DEFAULT_KEYBINDS.block,
    dash: settings.keybinds?.dash || DEFAULT_KEYBINDS.dash,
  }));
  const [listeningAction, setListeningAction] = useState<'block' | 'dash' | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showGridLines, setShowGridLines] = useState(true);

  // 100% Separate layout states initialized with deep cloning
  const [landscapeLayout, setLandscapeLayout] = useState<VirtualControlItem[]>(() => 
    sanitizeLayout(settings.mobileControlsLayoutLandscape || settings.mobileControlsLayout, DEFAULT_LANDSCAPE_LAYOUT)
  );
  const [portraitLayout, setPortraitLayout] = useState<VirtualControlItem[]>(() => 
    sanitizeLayout(settings.mobileControlsLayoutPortrait, DEFAULT_PORTRAIT_LAYOUT)
  );

  const currentLayout = orientation === 'landscape' ? landscapeLayout : portraitLayout;
  const setCurrentLayout = orientation === 'landscape' ? setLandscapeLayout : setPortraitLayout;

  const [selectedId, setSelectedId] = useState<string>('light');
  const previewRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const activeTouchIdRef = useRef<number | null>(null);

  const selectedItem = currentLayout.find(i => i.id === selectedId) || currentLayout[0] || {
    id: 'light',
    label: 'M1 Light',
    x: 82,
    y: 72,
    radius: 34,
    color: '#ef4444',
    scale: 1.0,
    opacity: 0.9,
  };

  const handleUpdateSelected = useCallback((updates: Partial<VirtualControlItem>) => {
    setCurrentLayout(prev => prev.map(item => {
      if (item.id !== selectedId) return item;
      return { 
        ...item, 
        ...updates,
        x: updates.x !== undefined ? Math.round(updates.x) : item.x,
        y: updates.y !== undefined ? Math.round(updates.y) : item.y,
      };
    }));
  }, [selectedId, setCurrentLayout]);

  // Precision Offset Nudge function (shifts X or Y by percentage with clean integer rounding)
  const nudgeOffset = useCallback((deltaX: number, deltaY: number) => {
    setCurrentLayout(prev => prev.map(item => {
      if (item.id !== selectedId) return item;
      const newX = Math.max(0, Math.min(100, Math.round(item.x + deltaX)));
      const newY = Math.max(0, Math.min(100, Math.round(item.y + deltaY)));
      return { ...item, x: newX, y: newY };
    }));
    soundManager.playRollTick?.();
  }, [selectedId, setCurrentLayout]);

  // Keyboard Arrow Keys Listener for Precision Offset shifting
  useEffect(() => {
    if (activeTab === 'pc') return;

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
  }, [nudgeOffset, precisionStep, activeTab]);

  // Handle Keybind rebinding
  useEffect(() => {
    if (!listeningAction) return;

    const handleCapture = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.code === 'Escape') {
        setListeningAction(null);
        return;
      }

      setKeybinds(prev => ({
        ...prev,
        [listeningAction]: e.code
      }));
      setListeningAction(null);
      soundManager.playRollTick?.();
    };

    window.addEventListener('keydown', handleCapture, { capture: true });
    return () => window.removeEventListener('keydown', handleCapture, { capture: true });
  }, [listeningAction]);

  // Drag handlers for the interactive screen sandbox
  const handleDragStart = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      if (activeTouchIdRef.current !== null) return;
      const touch = e.changedTouches[0];
      if (!touch) return;
      activeTouchIdRef.current = touch.identifier;
    }

    setSelectedId(id);
    setIsDragging(id);
    soundManager.playRollTick?.();
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !previewRef.current) return;

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
      if (!touch) return;
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const rect = previewRef.current.getBoundingClientRect();
    const rawX = ((clientX - rect.left) / rect.width) * 100;
    const rawY = ((clientY - rect.top) / rect.height) * 100;

    let finalX = Math.round(rawX);
    let finalY = Math.round(rawY);

    if (showGridLines && precisionStep >= 5) {
      finalX = Math.round(finalX / precisionStep) * precisionStep;
      finalY = Math.round(finalY / precisionStep) * precisionStep;
    }

    finalX = Math.max(2, Math.min(98, finalX));
    finalY = Math.max(2, Math.min(98, finalY));

    setCurrentLayout(prev => prev.map(item => {
      if (item.id === isDragging) {
        return {
          ...item,
          x: finalX,
          y: finalY,
        };
      }
      return item;
    }));
  };

  const handleDragEnd = () => {
    activeTouchIdRef.current = null;
    setIsDragging(null);
  };

  // Adjusters for Scale, Opacity, and Radius
  const adjustScale = (delta: number) => {
    const cur = selectedItem.scale ?? 1.0;
    const next = Math.max(0.5, Math.min(1.6, Math.round((cur + delta) * 100) / 100));
    handleUpdateSelected({ scale: next });
    soundManager.playRollTick?.();
  };

  const adjustOpacity = (delta: number) => {
    const cur = selectedItem.opacity ?? 0.85;
    const next = Math.max(0.2, Math.min(1.0, Math.round((cur + delta) * 100) / 100));
    handleUpdateSelected({ opacity: next });
    soundManager.playRollTick?.();
  };

  const adjustRadius = (delta: number) => {
    const cur = selectedItem.radius;
    const next = Math.max(18, Math.min(64, cur + delta));
    handleUpdateSelected({ radius: next });
    soundManager.playRollTick?.();
  };

  // Curated Presets strictly for active layout
  const handleApplyPreset = (type: 'default' | 'claw' | 'wide' | 'compact' | 'lefthanded') => {
    const base = orientation === 'landscape' ? DEFAULT_LANDSCAPE_LAYOUT : DEFAULT_PORTRAIT_LAYOUT;
    let modified = JSON.parse(JSON.stringify(base)) as VirtualControlItem[];

    if (type === 'claw') {
      modified = modified.map(i => {
        if (i.id === 'heavy') return { ...i, y: Math.max(20, i.y - 20), x: Math.min(92, i.x + 2) };
        if (i.id === 'block') return { ...i, y: Math.max(20, i.y - 20), x: Math.max(68, i.x - 6) };
        if (i.id === 'dash') return { ...i, y: Math.min(88, i.y + 4) };
        return i;
      });
    } else if (type === 'wide') {
      modified = modified.map(i => ({
        ...i,
        scale: 1.15,
        radius: Math.round(i.radius * 1.1),
      }));
    } else if (type === 'compact') {
      modified = modified.map(i => {
        if (i.id !== 'joystick' && i.id !== 'menu_settings' && i.id !== 'player_card' && i.id !== 'opponent_card') {
          return { ...i, x: Math.min(94, i.x + 4), y: Math.min(94, i.y + 4), scale: 0.9 };
        }
        return i;
      });
    } else if (type === 'lefthanded') {
      modified = modified.map(i => {
        if (i.id === 'joystick') return { ...i, x: 82 };
        if (i.id === 'light') return { ...i, x: 18 };
        if (i.id === 'heavy') return { ...i, x: 28 };
        if (i.id === 'block') return { ...i, x: 10 };
        if (i.id === 'dash') return { ...i, x: 26 };
        return i;
      });
    }

    // Ensure all coordinates are rounded integers
    modified = modified.map(i => ({
      ...i,
      x: Math.round(i.x),
      y: Math.round(i.y),
    }));

    setCurrentLayout(modified);
    soundManager.playRollTick?.();
  };

  // Reset active layout
  const handleResetActiveLayout = () => {
    const fallback = orientation === 'landscape' ? DEFAULT_LANDSCAPE_LAYOUT : DEFAULT_PORTRAIT_LAYOUT;
    setCurrentLayout(JSON.parse(JSON.stringify(fallback)));
    soundManager.playRollTick?.();
  };

  // Save Layouts with Account Synchronization
  const handleSaveLayouts = () => {
    updateSettings({
      mobileControlsLayoutLandscape: landscapeLayout,
      mobileControlsLayoutPortrait: portraitLayout,
      mobileControlsLayout: landscapeLayout,
      keybinds: keybinds,
    });

    try {
      localStorage.setItem('mma_game_settings', JSON.stringify({
        ...settings,
        mobileControlsLayoutLandscape: landscapeLayout,
        mobileControlsLayoutPortrait: portraitLayout,
        mobileControlsLayout: landscapeLayout,
        keybinds: keybinds,
      }));

      if (currentUser?.email) {
        localStorage.setItem(`mma_game_settings_${currentUser.email}`, JSON.stringify({
          ...settings,
          mobileControlsLayoutLandscape: landscapeLayout,
          mobileControlsLayoutPortrait: portraitLayout,
          mobileControlsLayout: landscapeLayout,
          keybinds: keybinds,
        }));
      }
    } catch (e) {
      console.warn('Could not save to local storage', e);
    }

    setSaveSuccess(true);
    soundManager.playLevelUp?.();
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2000);
  };

  // Launch Test Game (saves current layout, then launches actual game with no AI)
  const handleTestGameClick = () => {
    handleSaveLayouts();
    soundManager.playRollTick?.();
    if (onLaunchTestGame) {
      onLaunchTestGame();
    } else if (onLaunchLiveLobby) {
      onLaunchLiveLobby();
    }
  };

  const handleResetKeybinds = () => {
    setKeybinds(DEFAULT_KEYBINDS);
    soundManager.playRollTick?.();
  };

  const fighterAccountName = currentUser?.fighterName || currentUser?.email || 'Local Fighter Account';

  return (
    <div className={`fixed inset-0 z-[120] bg-zinc-950 text-white flex flex-col select-none overflow-hidden transition-all duration-300 ${
      isNavHidden ? 'pl-0' : 'pl-0 sm:pl-16'
    }`}>
      {/* 1. TOP HEADER & MAIN NAVIGATION */}
      <div className="px-4 sm:px-6 py-3 border-b border-zinc-850 bg-gradient-to-r from-zinc-900/90 via-zinc-950 to-zinc-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
        
        {/* Title & Account Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-950/80 border border-purple-600/40 flex items-center justify-center text-purple-400 shrink-0 shadow-lg">
            <Move className="w-5 h-5 text-purple-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-display font-black italic uppercase tracking-wider text-white">
                HUD & Controls Customizer
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full uppercase">
                <User className="w-2.5 h-2.5" />
                {fighterAccountName}
              </span>
            </div>
            <p className="text-[11px] font-mono text-zinc-400">
              Customize virtual touch buttons, coordinates, and desktop keybindings
            </p>
          </div>
        </div>

        {/* Primary Edit Modes & Global Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          
          {/* PRIMARY EDIT MODE SWITCHER */}
          <div className="flex items-center gap-1 p-1 bg-zinc-900/90 rounded-xl border border-zinc-800">
            <button
              onClick={() => {
                setActiveTab('modifier');
                soundManager.playRollTick?.();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'modifier'
                  ? 'bg-purple-600 text-white shadow-md border border-purple-400'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Touch HUD</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('pc');
                soundManager.playRollTick?.();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'pc'
                  ? 'bg-cyan-600 text-white shadow-md border border-cyan-400'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>PC Keybinds</span>
            </button>
          </div>

          {/* CALIBRATION BOX (STUCK IN A BOX) BUTTON */}
          <button
            onClick={handleTestGameClick}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-mono font-black uppercase transition cursor-pointer active:scale-95 shadow-lg shadow-red-500/20 border border-red-400/40"
            title="Launch separate calibration room where you are stuck in a box with no AI, move buttons freely and save"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Calibration Box 🎮</span>
          </button>

          {/* SAVE BUTTON */}
          <button
            onClick={handleSaveLayouts}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-mono font-black uppercase transition cursor-pointer shadow-lg active:scale-95 shrink-0 ${
              saveSuccess
                ? 'bg-emerald-500 text-white border border-emerald-300 shadow-emerald-500/20'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>{saveSuccess ? 'Saved!' : 'Save & Sync'}</span>
          </button>

          {/* CLOSE BUTTON */}
          <button
            onClick={() => {
              soundManager.playRollTick?.();
              onClose();
            }}
            className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-850 text-zinc-400 hover:text-white border border-zinc-800 transition cursor-pointer"
            title="Close HUD Manager"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MAIN CONTENT WORKSPACE */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-5 space-y-4 custom-scrollbar">
        
        {/* SUB-HEADER: ORIENTATION TOGGLE & PRESETS & STEP SIZE */}
        {activeTab === 'modifier' && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800 shrink-0">
            
            {/* ORIENTATION TOGGLE */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase text-zinc-400 font-bold">
                Orientation:
              </span>
              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                <button
                  onClick={() => {
                    setOrientation('landscape');
                    soundManager.playRollTick?.();
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase transition cursor-pointer ${
                    orientation === 'landscape'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Landscape (Wide)
                </button>

                <button
                  onClick={() => {
                    setOrientation('portrait');
                    soundManager.playRollTick?.();
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase transition cursor-pointer ${
                    orientation === 'portrait'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Portrait (Tall)
                </button>
              </div>
            </div>

            {/* CURATED PRESETS & RESET */}
            <div className="flex items-center gap-1.5 text-xs font-mono flex-wrap">
              <span className="text-xs font-mono uppercase text-zinc-400 font-bold mr-1">
                Presets:
              </span>
              <button
                onClick={() => handleApplyPreset('default')}
                className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-800 transition cursor-pointer"
              >
                Default
              </button>
              <button
                onClick={() => handleApplyPreset('claw')}
                className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-850 text-zinc-300 rounded-lg border border-zinc-800 transition cursor-pointer"
              >
                3-Finger Claw
              </button>
              <button
                onClick={() => handleApplyPreset('wide')}
                className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-850 text-zinc-300 rounded-lg border border-zinc-800 transition cursor-pointer"
              >
                Wide Spacing
              </button>
              <button
                onClick={() => handleApplyPreset('compact')}
                className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-850 text-zinc-300 rounded-lg border border-zinc-800 transition cursor-pointer"
              >
                Compact
              </button>
              <button
                onClick={handleResetActiveLayout}
                className="px-3 py-1 bg-rose-950/70 hover:bg-rose-900 border border-rose-500/40 text-rose-300 rounded-lg transition cursor-pointer flex items-center gap-1 ml-1"
                title={`Reset ${orientation} layout to default`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. HUD & CONTROLS MODIFIER (GRID VIEW WITH GENEROUS SPACING) */}
        {activeTab === 'modifier' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* LEFT / CENTER: SPATIAL CANVAS STAGE (CLEAR ASPECT RATIO, NEVER SQUISHED) */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col bg-zinc-900/70 rounded-3xl border border-zinc-800 p-3 sm:p-5 shadow-2xl space-y-3">
              
              {/* TOP CANVAS CONTROLS STRIP */}
              <div className="w-full flex items-center justify-between pb-2 text-xs font-mono text-zinc-400 border-b border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white uppercase flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                    {orientation === 'landscape' ? 'Landscape Viewport (16:9 Stage)' : 'Portrait Viewport (9:16 Stage)'}
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-400 hidden sm:inline">Drag buttons or click to adjust</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowGridLines(!showGridLines)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 border transition cursor-pointer ${
                      showGridLines ? 'bg-purple-950/60 text-purple-300 border-purple-500/40' : 'bg-zinc-950 text-zinc-500 border-zinc-800'
                    }`}
                  >
                    <Grid className="w-3 h-3" />
                    <span>Grid</span>
                  </button>

                  <button
                    onClick={handleTestGameClick}
                    className="px-3 py-1 rounded-lg text-xs font-mono font-black uppercase flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white border border-red-400/40 shadow cursor-pointer active:scale-95"
                    title="Launch separate calibration room where you are stuck in a box with no AI"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Enter Box</span>
                  </button>
                </div>
              </div>

              {/* EXPANSIVE CANVAS STAGE WITH CONTROLLED NATURAL ASPECT RATIO */}
              <div className="w-full flex items-center justify-center p-1 sm:p-2 relative">
                <div
                  ref={previewRef}
                  onMouseMove={handleDragMove}
                  onMouseUp={handleDragEnd}
                  onTouchMove={handleDragMove}
                  onTouchEnd={handleDragEnd}
                  onTouchCancel={handleDragEnd}
                  className={`relative bg-zinc-950 rounded-2xl border-2 border-zinc-700/80 overflow-hidden shadow-2xl touch-none select-none flex items-center justify-center transition-all ${
                    orientation === 'landscape' 
                      ? 'w-full aspect-[16/9] min-h-[300px] max-h-[540px]' 
                      : 'w-full max-w-[340px] aspect-[9/16] min-h-[460px] mx-auto'
                  }`}
                  style={{
                    backgroundImage: showGridLines 
                      ? 'radial-gradient(circle, rgba(255,255,255,0.12) 1.5px, transparent 1.5px)' 
                      : 'none',
                    backgroundSize: '24px 24px',
                  }}
                >
                  {/* Subtle Center Arena Guide */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
                    <div className="w-32 h-32 rounded-full border border-dashed border-zinc-500 flex items-center justify-center">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                        Screen Center
                      </span>
                    </div>
                  </div>

                  {/* VIRTUAL CONTROLS ON CANVAS */}
                  {currentLayout.map((item) => {
                    const isSelected = item.id === selectedId;
                    const scale = item.scale ?? 1.0;
                    const opacity = item.opacity ?? 0.85;
                    const baseHudScale = settings.hudScale !== undefined ? settings.hudScale : 0.85;
                    const uiScaleMultiplier = baseHudScale / 0.85;

                    const isCard = item.id === 'player_card' || item.id === 'opponent_card';
                    const isM2Cooldown = item.id === 'm2_cooldown';
                    const isMenu = item.id === 'menu_settings';
                    const isStatusBar = item.id === 'status_bar';
                    const isJoystick = item.id === 'joystick';

                    const effectiveItemScale = isCard ? scale * uiScaleMultiplier : scale;
                    const radius = item.radius * effectiveItemScale;

                    const width = isCard ? radius * 3.6 : isM2Cooldown ? radius * 2.8 : isStatusBar ? radius * 3.0 : isMenu ? radius * 2.2 : radius * 1.9;
                    const height = isCard ? radius * 1.5 : isM2Cooldown ? radius * 1.2 : isStatusBar ? radius * 1.0 : isMenu ? radius * 1.1 : radius * 1.9;

                    return (
                      <div
                        key={item.id}
                        onMouseDown={(e) => handleDragStart(item.id, e)}
                        onTouchStart={(e) => handleDragStart(item.id, e)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(item.id);
                          soundManager.playRollTick?.();
                        }}
                        style={{
                          left: `${item.x}%`,
                          top: `${item.y}%`,
                          width: `${width}px`,
                          height: `${height}px`,
                          opacity: opacity,
                          transform: `translate(-50%, -50%) ${isSelected ? 'scale(1.08)' : 'scale(1)'}`,
                          backgroundColor: `${item.color}35`,
                          borderColor: item.color,
                        }}
                        className={`absolute ${isCard || isM2Cooldown || isStatusBar || isMenu ? 'rounded-2xl' : 'rounded-full'} border-2 flex flex-col items-center justify-center cursor-move transition-transform select-none ${
                          isSelected
                            ? 'ring-4 ring-white ring-offset-2 ring-offset-zinc-950 z-30 shadow-[0_0_25px_rgba(255,255,255,0.7)]'
                            : 'hover:border-white z-10'
                        }`}
                      >
                        {isJoystick ? (
                          <div className="flex flex-col items-center justify-center pointer-events-none">
                            <Move className="w-5 h-5 text-white drop-shadow" />
                            <span className="text-[10px] font-mono font-bold text-white uppercase mt-0.5">
                              Joystick
                            </span>
                          </div>
                        ) : isCard ? (
                          <div className="w-full px-2 py-1 flex flex-col justify-between h-full text-center pointer-events-none">
                            <span className="text-[10px] font-mono font-black uppercase text-white truncate">
                              {item.id === 'player_card' ? 'Player Card' : 'Opponent Card'}
                            </span>
                            <div className="w-full h-1.5 bg-red-500 rounded-full" />
                          </div>
                        ) : isStatusBar ? (
                          <div className="w-full px-1.5 py-1 flex items-center justify-center gap-1 h-full pointer-events-none">
                            <span className="w-4 h-4 rounded-md bg-red-950/90 border border-red-500 shadow-sm flex items-center justify-center text-[7px] text-red-300 font-bold">
                              SC
                            </span>
                            <span className="w-4 h-4 rounded-md bg-amber-950/90 border border-amber-500 shadow-sm flex items-center justify-center text-[7px] text-amber-300 font-bold">
                              BF
                            </span>
                            <span className="w-4 h-4 rounded-md bg-teal-950/90 border border-teal-500 shadow-sm flex items-center justify-center text-[7px] text-teal-300 font-bold">
                              CR
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] font-mono font-black uppercase text-white drop-shadow text-center px-1 leading-tight pointer-events-none">
                            {item.label}
                          </span>
                        )}

                        {/* COORDINATE BADGE WHEN SELECTED */}
                        {isSelected && (
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-zinc-950 text-amber-300 border border-amber-400 px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase whitespace-nowrap shadow-lg pointer-events-none">
                            X:{Math.round(item.x)}% Y:{Math.round(item.y)}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* FOOTER CANVAS CALLOUT / BANNER */}
              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 text-xs font-mono text-zinc-400 border-t border-zinc-800/80">
                <div className="flex items-center gap-1.5">
                  <span>Selected:</span>
                  <strong className="text-white bg-zinc-800 px-2 py-0.5 rounded">{selectedItem.label}</strong>
                  <span className="text-amber-400 font-bold">(X: {Math.round(selectedItem.x)}%, Y: {Math.round(selectedItem.y)}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-[11px]">Use Arrow keys to nudge</span>
                  <button
                    onClick={handleTestGameClick}
                    className="text-red-400 hover:text-red-300 font-bold underline cursor-pointer ml-1"
                  >
                    Open Calibration Box →
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT: CONTROL TUNING INSPECTOR PANEL (NEVER SQUISHED) */}
            <div className="lg:col-span-5 xl:col-span-4 flex flex-col bg-zinc-900/80 rounded-3xl border border-zinc-800 p-4 sm:p-5 space-y-4 shadow-2xl">
              
              {/* ACTIVE ITEM SPOTLIGHT HEADER */}
              <div className="p-3.5 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-3">
                <div className="flex justify-between items-center border-b border-zinc-850 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span 
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: selectedItem.color }}
                    />
                    <h3 className="text-sm font-display font-black uppercase text-white tracking-wide">
                      {selectedItem.label}
                    </h3>
                  </div>
                  <span className="text-xs font-mono px-2.5 py-1 rounded bg-purple-950 text-purple-300 border border-purple-500/40 font-bold">
                    X: {Math.round(selectedItem.x)}% | Y: {Math.round(selectedItem.y)}%
                  </span>
                </div>

                {/* DIRECTIONAL NUDGE D-PAD */}
                <div className="flex flex-col items-center justify-center p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-2">
                  <div className="text-[11px] font-mono text-zinc-400 uppercase font-bold flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-amber-400" />
                    <span>Nudge Position ({precisionStep}% Step)</span>
                  </div>

                  {/* CROSS D-PAD */}
                  <div className="flex flex-col items-center gap-1.5 py-1">
                    {/* UP */}
                    <button
                      onClick={() => nudgeOffset(0, -precisionStep)}
                      className="w-11 h-9 bg-zinc-800 hover:bg-amber-500 hover:text-black border border-zinc-700 text-zinc-200 rounded-lg flex items-center justify-center font-bold transition active:scale-90 cursor-pointer shadow"
                      title={`Shift Up by -${precisionStep}%`}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>

                    {/* LEFT - CENTER - RIGHT */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => nudgeOffset(-precisionStep, 0)}
                        className="w-11 h-9 bg-zinc-800 hover:bg-amber-500 hover:text-black border border-zinc-700 text-zinc-200 rounded-lg flex items-center justify-center font-bold transition active:scale-90 cursor-pointer shadow"
                        title={`Shift Left by -${precisionStep}%`}
                      >
                        <ArrowLeftIcon className="w-4 h-4" />
                      </button>

                      <div className="w-11 h-9 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-center text-xs font-mono font-black text-amber-400">
                        {precisionStep}%
                      </div>

                      <button
                        onClick={() => nudgeOffset(precisionStep, 0)}
                        className="w-11 h-9 bg-zinc-800 hover:bg-amber-500 hover:text-black border border-zinc-700 text-zinc-200 rounded-lg flex items-center justify-center font-bold transition active:scale-90 cursor-pointer shadow"
                        title={`Shift Right by +${precisionStep}%`}
                      >
                        <ArrowRightIcon className="w-4 h-4" />
                      </button>
                    </div>

                    {/* DOWN */}
                    <button
                      onClick={() => nudgeOffset(0, precisionStep)}
                      className="w-11 h-9 bg-zinc-800 hover:bg-amber-500 hover:text-black border border-zinc-700 text-zinc-200 rounded-lg flex items-center justify-center font-bold transition active:scale-90 cursor-pointer shadow"
                      title={`Shift Down by +${precisionStep}%`}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* SIZE / OPACITY STEPPERS */}
                <div className="space-y-2.5 pt-2 border-t border-zinc-850">
                  {/* RADIUS (BASE SIZE) */}
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-zinc-400 font-bold">Button Size:</span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => adjustRadius(-2)} 
                        className="w-7 h-7 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white flex items-center justify-center active:scale-90 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-emerald-400 font-bold w-12 text-center">
                        {Math.round(selectedItem.radius)}px
                      </span>
                      <button 
                        onClick={() => adjustRadius(2)} 
                        className="w-7 h-7 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white flex items-center justify-center active:scale-90 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* OPACITY */}
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-zinc-400 font-bold">Transparency:</span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => adjustOpacity(-0.1)} 
                        className="w-7 h-7 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white flex items-center justify-center active:scale-90 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-purple-400 font-bold w-12 text-center">
                        {Math.round((selectedItem.opacity ?? 0.85) * 100)}%
                      </span>
                      <button 
                        onClick={() => adjustOpacity(0.1)} 
                        className="w-7 h-7 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white flex items-center justify-center active:scale-90 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* FAST SELECTOR LIST OF ALL CONTROLS */}
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase text-zinc-400 font-bold flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-purple-400" />
                  <span>Select Any Control:</span>
                </span>
                
                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto custom-scrollbar p-1">
                  {currentLayout.map(item => {
                    const isSelected = selectedId === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSelectedId(item.id);
                          soundManager.playRollTick?.();
                        }}
                        className={`p-2.5 rounded-xl text-xs font-mono text-left transition cursor-pointer border flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-purple-900/80 border-purple-400 text-white font-black shadow-lg ring-1 ring-purple-400'
                            : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0" 
                            style={{ backgroundColor: item.color }} 
                          />
                          <span className="truncate">{item.label}</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                          {Math.round(item.x)}%
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CALIBRATION BOX CALLOUT CARD */}
              <div className="p-4 bg-gradient-to-r from-red-950/60 via-zinc-950 to-zinc-950 border border-red-500/40 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-2 text-red-400 font-mono text-xs font-bold uppercase">
                  <Box className="w-4 h-4 text-red-400" />
                  <span>Stuck in a Box (Calibration)</span>
                </div>
                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  Enter an isolated room where you are locked in a box, movement is disabled, there is no AI, and you can freely move buttons and save.
                </p>
                <button
                  onClick={handleTestGameClick}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-mono font-black uppercase transition flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 active:scale-95 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Enter Calibration Box 🎮</span>
                </button>
              </div>

            </div>

          </div>
        )}

        {/* 3. MODE 2: PC KEYBOARD KEYBINDS */}
        {activeTab === 'pc' && (
          <div className="flex-1 flex flex-col space-y-4 p-4 sm:p-6 bg-zinc-900/60 rounded-3xl border border-zinc-800/90 overflow-y-auto custom-scrollbar min-h-0">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-display font-black uppercase text-white tracking-wider flex items-center gap-2">
                  <Keyboard className="w-4 h-4 text-cyan-400" />
                  <span>PC Keyboard & Mouse Keybinds</span>
                </h3>
                <p className="text-[11px] font-mono text-zinc-400">
                  Remap key actions for desktop arena combat. Click a button and press your new key.
                </p>
              </div>

              <button
                onClick={handleResetKeybinds}
                className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Keybinds</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* BLOCK KEYBIND */}
              <div className="p-4 bg-zinc-950/90 rounded-2xl border border-zinc-800 flex justify-between items-center shadow">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center justify-center text-cyan-400">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-white block">Guard / Block</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Absorb incoming strikes & parry</span>
                  </div>
                </div>

                <button
                  onClick={() => setListeningAction('block')}
                  className={`px-4 py-2 rounded-xl font-mono text-xs font-black uppercase transition border cursor-pointer ${
                    listeningAction === 'block'
                      ? 'bg-amber-500 text-black border-amber-300 animate-pulse'
                      : 'bg-zinc-900 border-zinc-700 text-cyan-300 hover:border-cyan-400'
                  }`}
                >
                  {listeningAction === 'block' ? 'Press Any Key...' : formatKeyCode(keybinds.block)}
                </button>
              </div>

              {/* DASH KEYBIND */}
              <div className="p-4 bg-zinc-950/90 rounded-2xl border border-zinc-800 flex justify-between items-center shadow">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center justify-center text-purple-400">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-white block">Dodge / Dash</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Quick evasive sprint burst</span>
                  </div>
                </div>

                <button
                  onClick={() => setListeningAction('dash')}
                  className={`px-4 py-2 rounded-xl font-mono text-xs font-black uppercase transition border cursor-pointer ${
                    listeningAction === 'dash'
                      ? 'bg-amber-500 text-black border-amber-300 animate-pulse'
                      : 'bg-zinc-900 border-zinc-700 text-purple-300 hover:border-purple-400'
                  }`}
                >
                  {listeningAction === 'dash' ? 'Press Any Key...' : formatKeyCode(keybinds.dash)}
                </button>
              </div>

              {/* M1 FIXED INFO */}
              <div className="p-4 bg-zinc-950/50 rounded-2xl border border-zinc-900 flex justify-between items-center opacity-85">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-center text-red-400">
                    <Swords className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-white block">Light Attack (M1)</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Rapid strike combinations</span>
                  </div>
                </div>
                <span className="px-3 py-1.5 bg-zinc-900 text-zinc-300 rounded-lg font-mono text-xs font-bold border border-zinc-800">
                  Left Click
                </span>
              </div>

              {/* M2 FIXED INFO */}
              <div className="p-4 bg-zinc-950/50 rounded-2xl border border-zinc-900 flex justify-between items-center opacity-85">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-400">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-white block">Heavy Attack (M2)</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Guard-breaking finisher</span>
                  </div>
                </div>
                <span className="px-3 py-1.5 bg-zinc-900 text-zinc-300 rounded-lg font-mono text-xs font-bold border border-zinc-800">
                  Right Click
                </span>
              </div>

              {/* MOVEMENT INFO */}
              <div className="p-4 bg-zinc-950/50 rounded-2xl border border-zinc-900 flex justify-between items-center opacity-85">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400">
                    <Keyboard className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-white block">Movement</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Omnidirectional footwork</span>
                  </div>
                </div>
                <span className="px-3 py-1.5 bg-zinc-900 text-zinc-300 rounded-lg font-mono text-xs font-bold border border-zinc-800">
                  W A S D / Arrow Keys
                </span>
              </div>

              {/* TAUNT / EMOTE INFO */}
              <div className="p-4 bg-zinc-950/50 rounded-2xl border border-zinc-900 flex justify-between items-center opacity-85">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-pink-500/10 border border-pink-500/30 rounded-xl flex items-center justify-center text-pink-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-white block">Taunt / Style Flourish</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Arena emote & posture challenge</span>
                  </div>
                </div>
                <span className="px-3 py-1.5 bg-zinc-900 text-zinc-300 rounded-lg font-mono text-xs font-bold border border-zinc-800">
                  T Key
                </span>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
