import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, Check, RotateCcw, Smartphone, Monitor, Move,
  Sliders, Plus, Minus, Grid, Lock, Shield, Sparkles, Box, Eye
} from 'lucide-react';
import { GameSettings, VirtualControlItem, UserSession } from '../types';
import { soundManager } from './SoundManager';
import { 
  DEFAULT_LANDSCAPE_LAYOUT, 
  DEFAULT_PORTRAIT_LAYOUT, 
  sanitizeLayout 
} from '../data/hudDefaults';

interface HudTestBoxProps {
  settings: GameSettings;
  updateSettings: (updates: Partial<GameSettings>) => void;
  onBackToMenu: () => void;
  currentUser?: UserSession | null;
  version?: string;
}

export default function HudTestBox({
  settings,
  updateSettings,
  onBackToMenu,
  currentUser,
  version = 'v1.7.6 Part 3'
}: HudTestBoxProps) {
  // Active orientation
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  
  // Layout states initialized from settings
  const [landscapeLayout, setLandscapeLayout] = useState<VirtualControlItem[]>(() =>
    sanitizeLayout(settings.mobileControlsLayoutLandscape || settings.mobileControlsLayout, DEFAULT_LANDSCAPE_LAYOUT)
  );
  const [portraitLayout, setPortraitLayout] = useState<VirtualControlItem[]>(() =>
    sanitizeLayout(settings.mobileControlsLayoutPortrait, DEFAULT_PORTRAIT_LAYOUT)
  );

  const currentLayout = orientation === 'landscape' ? landscapeLayout : portraitLayout;
  const setCurrentLayout = orientation === 'landscape' ? setLandscapeLayout : setPortraitLayout;

  // Selected control and dragging state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragItemRef = useRef<string | null>(null);

  // Selected control object
  const selectedControl = currentLayout.find(item => item.id === selectedId) || null;

  // Save layout
  const handleSave = useCallback(() => {
    updateSettings({
      mobileControlsLayoutLandscape: landscapeLayout,
      mobileControlsLayoutPortrait: portraitLayout,
      mobileControlsLayout: landscapeLayout,
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

    setSaveSuccess(true);
    soundManager.playLevelUp?.();
    setTimeout(() => setSaveSuccess(false), 2000);
  }, [landscapeLayout, portraitLayout, settings, currentUser, updateSettings]);

  // Reset active layout to default
  const handleReset = useCallback(() => {
    const fallback = orientation === 'landscape' ? DEFAULT_LANDSCAPE_LAYOUT : DEFAULT_PORTRAIT_LAYOUT;
    setCurrentLayout(JSON.parse(JSON.stringify(fallback)));
    soundManager.playRollTick?.();
  }, [orientation, setCurrentLayout]);

  // Update selected item properties
  const updateSelectedControl = useCallback((updates: Partial<VirtualControlItem>) => {
    if (!selectedId) return;
    setCurrentLayout(prev => prev.map(item => {
      if (item.id !== selectedId) return item;
      return {
        ...item,
        ...updates,
        x: updates.x !== undefined ? Math.round(Math.max(0, Math.min(100, updates.x))) : item.x,
        y: updates.y !== undefined ? Math.round(Math.max(0, Math.min(100, updates.y))) : item.y,
      };
    }));
  }, [selectedId, setCurrentLayout]);

  // Precision Nudge function
  const nudge = useCallback((deltaX: number, deltaY: number) => {
    if (!selectedId) return;
    setCurrentLayout(prev => prev.map(item => {
      if (item.id !== selectedId) return item;
      return {
        ...item,
        x: Math.round(Math.max(0, Math.min(100, item.x + deltaX))),
        y: Math.round(Math.max(0, Math.min(100, item.y + deltaY))),
      };
    }));
    soundManager.playRollTick?.();
  }, [selectedId, setCurrentLayout]);

  // Pointer/Touch Drag handlers
  const handlePointerDown = (id: string, e: React.PointerEvent | React.TouchEvent) => {
    e.stopPropagation();
    setSelectedId(id);
    dragItemRef.current = id;
    setIsDragging(true);
    soundManager.playRollTick?.();
  };

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!dragItemRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const relX = ((clientX - rect.left) / rect.width) * 100;
    const relY = ((clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.round(Math.max(0, Math.min(100, relX)));
    const clampedY = Math.round(Math.max(0, Math.min(100, relY)));

    const currentDraggingId = dragItemRef.current;
    setCurrentLayout(prev => prev.map(item => {
      if (item.id !== currentDraggingId) return item;
      return { ...item, x: clampedX, y: clampedY };
    }));
  }, [setCurrentLayout]);

  const handlePointerUp = useCallback(() => {
    if (dragItemRef.current) {
      dragItemRef.current = null;
      setIsDragging(false);
    }
  }, []);

  // Global listeners for dragging outside element boundaries
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (dragItemRef.current) {
        handlePointerMove(e.clientX, e.clientY);
      }
    };
    const onMouseUp = () => {
      handlePointerUp();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (dragItemRef.current && e.touches[0]) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchEnd = () => {
      handlePointerUp();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [handlePointerMove, handlePointerUp]);

  // Keyboard Arrow listeners for nudge
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedId) return;
      if (e.key === 'ArrowUp') { e.preventDefault(); nudge(0, -1); }
      if (e.key === 'ArrowDown') { e.preventDefault(); nudge(0, 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(-1, 0); }
      if (e.key === 'ArrowRight') { e.preventDefault(); nudge(1, 0); }
      if (e.key === 'Escape') { setSelectedId(null); }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, nudge]);

  // 60FPS 2D Canvas loop drawing the "Box" with locked player in center
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(parent.clientWidth * dpr);
      canvas.height = Math.floor(parent.clientHeight * dpr);
      canvas.style.width = `${parent.clientWidth}px`;
      canvas.style.height = `${parent.clientHeight}px`;
    };

    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      time += 0.03;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // 1. Dark ambient void background
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, w, h);

      // Center coordinates
      const cx = w / 2;
      const cy = h / 2;

      // 2. THE CALIBRATION BOX (Isometric floor & containment cage)
      const boxSize = Math.min(w, h) * 0.45;
      const boxLeft = cx - boxSize;
      const boxRight = cx + boxSize;
      const boxTop = cy - boxSize * 0.65;
      const boxBottom = cy + boxSize * 0.65;

      // Cage floor perspective grid
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.lineWidth = 1.5;
      const gridSteps = 8;
      for (let i = 0; i <= gridSteps; i++) {
        const x = boxLeft + (boxRight - boxLeft) * (i / gridSteps);
        ctx.beginPath();
        ctx.moveTo(x, boxTop);
        ctx.lineTo(x, boxBottom);
        ctx.stroke();

        const y = boxTop + (boxBottom - boxTop) * (i / gridSteps);
        ctx.beginPath();
        ctx.moveTo(boxLeft, y);
        ctx.lineTo(boxRight, y);
        ctx.stroke();
      }

      // Outer laser containment perimeter (The "Box")
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.lineWidth = 3;
      ctx.strokeRect(boxLeft, boxTop, boxRight - boxLeft, boxBottom - boxTop);

      // Corner containment posts
      const postSize = 12;
      ctx.fillStyle = '#ef4444';
      [[boxLeft, boxTop], [boxRight, boxTop], [boxLeft, boxBottom], [boxRight, boxBottom]].forEach(([px, py]) => {
        ctx.fillRect(px - postSize / 2, py - postSize / 2, postSize, postSize);
      });

      // Neon pulse along the boundary
      const pulse = Math.sin(time * 2) * 0.2 + 0.8;
      ctx.strokeStyle = `rgba(244, 63, 94, ${0.4 * pulse})`;
      ctx.lineWidth = 6;
      ctx.strokeRect(boxLeft - 4, boxTop - 4, (boxRight - boxLeft) + 8, (boxBottom - boxTop) + 8);

      // Overhead spotlight cone
      const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, boxSize);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
      grad.addColorStop(0.5, 'rgba(239, 68, 68, 0.04)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, boxSize, 0, Math.PI * 2);
      ctx.fill();

      // Floor text badge
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('STUCK IN BOX • CALIBRATION MODE', cx, boxBottom - 18);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('MOVEMENT LOCKED • NO AI • DRAG BUTTONS & SAVE', cx, boxBottom - 4);
      ctx.restore();

      // 3. PLAYER FIGHTER (LOCKED IN CENTER, BREATHING IDLE STANCE)
      const sway = Math.sin(time) * 3;
      const breathe = Math.sin(time * 1.5) * 2;
      const px = cx;
      const py = cy + breathe;

      // Ground shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(px, cy + 50, 36, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Legs / Torso / Arms (Stylized martial arts fighter silhouette)
      // Left leg
      ctx.strokeStyle = '#e4e4e7';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(px - 8, py + 10);
      ctx.lineTo(px - 16, py + 48);
      ctx.stroke();

      // Right leg
      ctx.beginPath();
      ctx.moveTo(px + 8, py + 10);
      ctx.lineTo(px + 20, py + 46);
      ctx.stroke();

      // Torso
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(px, py + 12);
      ctx.lineTo(px + sway * 0.3, py - 20);
      ctx.stroke();

      // Head
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(px + sway * 0.4, py - 32, 10, 0, Math.PI * 2);
      ctx.fill();

      // Left Guard Arm
      ctx.strokeStyle = '#e4e4e7';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(px - 6 + sway * 0.3, py - 14);
      ctx.lineTo(px - 18, py - 24 + sway * 0.5);
      ctx.lineTo(px - 10, py - 34);
      ctx.stroke();

      // Right Guard Arm
      ctx.beginPath();
      ctx.moveTo(px + 6 + sway * 0.3, py - 14);
      ctx.lineTo(px + 16, py - 22 + sway * 0.5);
      ctx.lineTo(px + 8, py - 32);
      ctx.stroke();

      // "LOCKED" indicator above head
      ctx.save();
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🔒 LOCKED IN BOX', px, py - 48);
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[150] bg-black text-white flex flex-col select-none overflow-hidden">
      
      {/* 1. TOP FLOATING CALIBRATION HEADER */}
      <div className="absolute top-0 inset-x-0 z-40 p-3 sm:p-4 flex items-center justify-between gap-2 pointer-events-none">
        
        {/* Back button */}
        <button
          onClick={() => {
            soundManager.playRollTick?.();
            onBackToMenu();
          }}
          className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white font-mono text-xs font-bold uppercase transition cursor-pointer shadow-lg backdrop-blur-md active:scale-95"
          title="Exit calibration and return to main menu"
        >
          <ArrowLeft className="w-4 h-4 text-zinc-300" />
          <span>Exit Box</span>
        </button>

        {/* Center Mode & Orientation Pill */}
        <div className="pointer-events-auto flex items-center gap-2 bg-zinc-950/90 border border-red-500/50 px-3.5 py-1.5 rounded-2xl shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />
            <span className="text-xs font-display font-black italic uppercase tracking-wider text-white">
              HUD Calibration Box
            </span>
          </div>

          <div className="h-4 w-px bg-zinc-800" />

          {/* Orientation Toggle */}
          <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
            <button
              onClick={() => {
                setOrientation('landscape');
                setSelectedId(null);
                soundManager.playRollTick?.();
              }}
              className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase transition cursor-pointer ${
                orientation === 'landscape'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Landscape
            </button>
            <button
              onClick={() => {
                setOrientation('portrait');
                setSelectedId(null);
                soundManager.playRollTick?.();
              }}
              className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase transition cursor-pointer ${
                orientation === 'portrait'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Portrait
            </button>
          </div>
        </div>

        {/* Right Actions: Reset & Save */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white font-mono text-xs font-bold uppercase transition cursor-pointer shadow-lg backdrop-blur-md active:scale-95"
            title="Reset layout to default"
          >
            <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-mono text-xs font-black uppercase transition cursor-pointer shadow-xl backdrop-blur-md active:scale-95 ${
              saveSuccess
                ? 'bg-emerald-500 text-white border border-emerald-300 shadow-emerald-500/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50 shadow-emerald-600/30'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>{saveSuccess ? 'Saved!' : 'Save Layout'}</span>
          </button>
        </div>
      </div>

      {/* 2. THE 2D BOX BACKGROUND CANVAS */}
      <div className="absolute inset-0 z-0">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

      {/* 3. INTERACTIVE HUD CONTAINER */}
      <div
        ref={containerRef}
        onClick={() => setSelectedId(null)}
        className={`relative z-20 flex-1 w-full h-full overflow-hidden select-none touch-none ${
          orientation === 'portrait' ? 'max-w-[480px] mx-auto border-x border-zinc-800/40' : ''
        }`}
      >
        {currentLayout.map(item => {
          const isSelected = item.id === selectedId;
          const scale = item.scale ?? 1.0;
          const opacity = item.opacity ?? 0.9;
          const radius = item.radius * scale;

          const isCard = item.id === 'player_card' || item.id === 'opponent_card';
          const isM2Cooldown = item.id === 'm2_cooldown';
          const isMenu = item.id === 'menu_settings';
          const isJoystick = item.id === 'joystick';

          const width = isCard ? radius * 3.8 : isM2Cooldown ? radius * 3.0 : isMenu ? radius * 2.4 : radius * 2.0;
          const height = isCard ? radius * 1.6 : isM2Cooldown ? radius * 1.3 : isMenu ? radius * 1.2 : radius * 2.0;

          return (
            <div
              key={item.id}
              onPointerDown={(e) => handlePointerDown(item.id, e)}
              onTouchStart={(e) => handlePointerDown(item.id, e)}
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                width: `${width}px`,
                height: `${height}px`,
                opacity: opacity,
                transform: `translate(-50%, -50%) ${isSelected ? 'scale(1.1)' : 'scale(1)'}`,
                backgroundColor: `${item.color}30`,
                borderColor: item.color,
              }}
              className={`absolute ${isCard || isM2Cooldown || isMenu ? 'rounded-2xl' : 'rounded-full'} border-2 flex flex-col items-center justify-center cursor-move transition-transform select-none ${
                isSelected 
                  ? 'ring-4 ring-white ring-offset-2 ring-offset-black z-30 shadow-[0_0_30px_rgba(255,255,255,0.7)]' 
                  : 'hover:border-white z-10 hover:shadow-lg'
              }`}
            >
              {/* BUTTON GRAPHIC */}
              {isJoystick ? (
                <div className="flex flex-col items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 rounded-full bg-pink-500/80 flex items-center justify-center shadow">
                    <Move className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[9px] font-mono font-bold text-white uppercase mt-0.5">
                    Joystick
                  </span>
                </div>
              ) : isCard ? (
                <div className="w-full px-2 py-1 flex flex-col justify-between h-full text-center pointer-events-none">
                  <span className="text-[9px] font-mono font-black uppercase text-white truncate">
                    {item.id === 'player_card' ? 'Player Card' : 'Opponent Card'}
                  </span>
                  <div className="w-full h-1.5 bg-red-500 rounded-full" />
                </div>
              ) : (
                <span className="text-[10px] sm:text-xs font-mono font-black uppercase text-white drop-shadow text-center px-1 leading-tight pointer-events-none">
                  {item.label}
                </span>
              )}

              {/* LIVE COORDINATE CHIP WHILE DRAGGING OR SELECTED */}
              {isSelected && (
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-zinc-950 text-amber-300 border border-amber-400 px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase whitespace-nowrap shadow-xl pointer-events-none">
                  X:{Math.round(item.x)}% Y:{Math.round(item.y)}%
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. FLOATING MINI-INSPECTOR TOOLBAR FOR SELECTED BUTTON */}
      {selectedControl && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 bg-zinc-950/95 border border-zinc-700 p-3 sm:p-4 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-wrap items-center justify-center gap-3 sm:gap-4 max-w-[95vw]"
        >
          {/* Item Name */}
          <div className="flex items-center gap-2 border-r border-zinc-800 pr-3">
            <span 
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow"
              style={{ backgroundColor: selectedControl.color }}
            />
            <div>
              <span className="text-xs font-display font-black uppercase text-white block">
                {selectedControl.label}
              </span>
              <span className="text-[10px] font-mono text-amber-300 font-bold">
                X: {Math.round(selectedControl.x)}% | Y: {Math.round(selectedControl.y)}%
              </span>
            </div>
          </div>

          {/* Size Controls */}
          <div className="flex items-center gap-2 border-r border-zinc-800 pr-3 text-[10px] font-mono">
            <span className="text-zinc-400 uppercase font-bold">Size:</span>
            <button
              onClick={() => updateSelectedControl({ radius: Math.max(18, selectedControl.radius - 4) })}
              className="w-6 h-6 bg-zinc-800 hover:bg-zinc-700 text-white rounded flex items-center justify-center cursor-pointer active:scale-95"
              title="Decrease size"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-bold text-white w-8 text-center">{selectedControl.radius}px</span>
            <button
              onClick={() => updateSelectedControl({ radius: Math.min(64, selectedControl.radius + 4) })}
              className="w-6 h-6 bg-zinc-800 hover:bg-zinc-700 text-white rounded flex items-center justify-center cursor-pointer active:scale-95"
              title="Increase size"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Opacity Controls */}
          <div className="flex items-center gap-2 border-r border-zinc-800 pr-3 text-[10px] font-mono">
            <span className="text-zinc-400 uppercase font-bold">Opacity:</span>
            <button
              onClick={() => updateSelectedControl({ opacity: Math.max(0.2, (selectedControl.opacity ?? 0.9) - 0.1) })}
              className="w-6 h-6 bg-zinc-800 hover:bg-zinc-700 text-white rounded flex items-center justify-center cursor-pointer active:scale-95"
              title="Decrease opacity"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-bold text-white w-8 text-center">{Math.round((selectedControl.opacity ?? 0.9) * 100)}%</span>
            <button
              onClick={() => updateSelectedControl({ opacity: Math.min(1.0, (selectedControl.opacity ?? 0.9) + 0.1) })}
              className="w-6 h-6 bg-zinc-800 hover:bg-zinc-700 text-white rounded flex items-center justify-center cursor-pointer active:scale-95"
              title="Increase opacity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Nudge Arrows */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => nudge(-1, 0)}
              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded font-mono text-xs font-bold active:scale-90 cursor-pointer"
              title="Nudge Left (1%)"
            >
              ←
            </button>
            <button
              onClick={() => nudge(0, -1)}
              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded font-mono text-xs font-bold active:scale-90 cursor-pointer"
              title="Nudge Up (1%)"
            >
              ↑
            </button>
            <button
              onClick={() => nudge(0, 1)}
              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded font-mono text-xs font-bold active:scale-90 cursor-pointer"
              title="Nudge Down (1%)"
            >
              ↓
            </button>
            <button
              onClick={() => nudge(1, 0)}
              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded font-mono text-xs font-bold active:scale-90 cursor-pointer"
              title="Nudge Right (1%)"
            >
              →
            </button>
          </div>

          {/* Deselect */}
          <button
            onClick={() => setSelectedId(null)}
            className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded text-[10px] font-mono uppercase cursor-pointer ml-1"
          >
            Done
          </button>
        </div>
      )}

      {/* 5. INSTRUCTION HINT AT VERY BOTTOM */}
      {!selectedControl && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-center">
          <p className="text-[10px] sm:text-xs font-mono text-zinc-400/90 bg-zinc-950/80 px-3 py-1 rounded-full border border-zinc-800 shadow backdrop-blur-sm">
            💡 Touch or click any button to drag and reposition it freely inside the box. Tap Save when finished.
          </p>
        </div>
      )}
    </div>
  );
}
