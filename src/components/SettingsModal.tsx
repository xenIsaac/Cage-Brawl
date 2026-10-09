import React, { useState } from 'react';
import { 
  ArrowLeft, Volume2, VolumeX, Sliders, Smartphone, Eye, Sparkles, Move, RotateCcw, 
  Check, Flame, Shield, Swords, AlertTriangle, Monitor, Activity, Zap, Layers, RefreshCw, Heart
} from 'lucide-react';
import { GameSettings } from '../types';
import { soundManager } from './SoundManager';

interface SettingsModalProps {
  settings: GameSettings;
  updateSettings: (updates: Partial<GameSettings>) => void;
  onClose: () => void;
  onOpenHudEditor: () => void;
  onRequestResetProgress?: () => void;
  isNavHidden?: boolean;
}

type TabType = 'combat' | 'performance' | 'graphics' | 'audio' | 'mobile_hud' | 'system';

export function SettingsModal({
  settings,
  updateSettings,
  onClose,
  onOpenHudEditor,
  onRequestResetProgress,
  isNavHidden = false
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('combat');

  const handleUpdate = (updates: Partial<GameSettings>) => {
    updateSettings(updates);
    soundManager.playRollTick();
    if (updates.masterVolume !== undefined || updates.sfxVolume !== undefined) {
      soundManager.setVolumes(
        updates.masterVolume ?? settings.masterVolume ?? 1.0,
        updates.sfxVolume ?? settings.sfxVolume ?? 1.0
      );
    }
  };

  return (
    <div className={`fixed inset-0 z-[120] bg-zinc-950 text-white flex flex-col select-none overflow-hidden transition-all duration-300 ${
      isNavHidden ? 'pl-0' : 'pl-14 sm:pl-16'
    }`}>
      {/* 1. TOP HEADER BAR */}
      <div className="px-4 sm:px-8 py-3.5 border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-red-950 border border-red-800 flex items-center justify-center text-red-400 shrink-0 shadow-inner">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-display font-black italic uppercase tracking-wider text-white">
                Game & System Settings
              </h1>
              <span className="text-[10px] font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/30 px-2.5 py-0.5 rounded-full uppercase">
                CONFIG ENGINE
              </span>
            </div>
            <p className="text-[10px] sm:text-xs font-mono text-zinc-400">
              Combat Physics, Performance, Audio Mix & HUD Customization
            </p>
          </div>
        </div>

        {/* Back Button (Compact, no X) */}
        <button
          onClick={() => {
            soundManager.playRollTick();
            onClose();
          }}
          className="flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-lg text-[10px] sm:text-xs font-mono font-bold uppercase transition cursor-pointer shadow-sm active:scale-95 shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Menu</span>
        </button>
      </div>

      {/* 2. TAB NAVIGATION BAR */}
      <div className="px-4 sm:px-8 py-2 border-b border-zinc-800/80 bg-zinc-900/30 shrink-0">
        {/* Mobile View: Compact 3-col Grid */}
        <div className="grid grid-cols-3 gap-1 sm:hidden">
          {[
            { id: 'combat', label: 'Combat', icon: Swords },
            { id: 'performance', label: 'Engine', icon: Zap },
            { id: 'graphics', label: 'Visuals', icon: Eye },
            { id: 'audio', label: 'Audio', icon: Volume2 },
            { id: 'mobile_hud', label: 'HUD & Touch', icon: Smartphone },
            { id: 'system', label: 'System', icon: Shield },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as TabType); soundManager.playRollTick(); }}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold uppercase transition flex items-center justify-center gap-1 cursor-pointer truncate ${
                  isActive 
                    ? 'bg-red-600 text-white shadow-md border border-red-500' 
                    : 'bg-zinc-900/80 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <Icon className="w-3 h-3 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Desktop View: Full horizontal tab rail */}
        <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          {[
            { id: 'combat', label: 'Combat & Physics', icon: Swords },
            { id: 'performance', label: 'Performance', icon: Zap },
            { id: 'graphics', label: 'Graphics & Visuals', icon: Eye },
            { id: 'audio', label: 'Audio & Mix', icon: Volume2 },
            { id: 'mobile_hud', label: 'HUD & Touch Controls', icon: Smartphone },
            { id: 'system', label: 'System & Data', icon: Shield },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as TabType); soundManager.playRollTick(); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isActive 
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/20 border border-red-500' 
                    : 'bg-zinc-900/80 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. MAIN FULLSCREEN CONTENT CONTAINER */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-4 max-w-5xl mx-auto w-full custom-scrollbar">
          
          {/* TAB 1: COMBAT & PHYSICS */}
          {activeTab === 'combat' && (
            <div className="space-y-3.5 animate-fade-in">
              {/* Screen Shake Intensity */}
              <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">Screen Shake Recoil</span>
                    <span className="text-[10px] text-zinc-400">Camera physical jolt on heavy strikes and counter blows</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/50">
                    {Math.round((settings.screenShake ?? 1.0) * 100)}%
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {[
                    { val: 0, label: 'Off' },
                    { val: 0.5, label: '50%' },
                    { val: 1.0, label: '100%' },
                    { val: 1.5, label: '150%' },
                    { val: 2.0, label: 'Max (200%)' },
                  ].map(item => (
                    <button
                      key={item.val}
                      onClick={() => handleUpdate({ screenShake: item.val })}
                      className={`py-1.5 text-[10px] font-mono font-bold uppercase rounded-lg border transition cursor-pointer ${
                        (settings.screenShake ?? 1.0) === item.val
                          ? 'bg-amber-600 border-amber-500 text-white shadow-md'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hitstop Micro Freeze */}
              <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" /> Impact Hitstop / Freeze Frames
                  </span>
                  <span className="text-[10px] text-zinc-400">Micro time-dilation on brutal K.O.s and heavy hits</span>
                </div>
                <button
                  onClick={() => handleUpdate({ hitstopEffect: settings.hitstopEffect === false ? true : false })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition cursor-pointer ${
                    settings.hitstopEffect !== false ? 'bg-amber-600 text-white shadow' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {settings.hitstopEffect !== false ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {/* Soft Aim / Auto Target Assist */}
              <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-red-400" /> Smart Strike Lock-On Assist
                  </span>
                  <span className="text-[10px] text-zinc-400">Softly directs punches towards locked target when nearby</span>
                </div>
                <button
                  onClick={() => handleUpdate({ autoTargetAssist: settings.autoTargetAssist === false ? true : false })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition cursor-pointer ${
                    settings.autoTargetAssist !== false ? 'bg-red-600 text-white shadow' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {settings.autoTargetAssist !== false ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {/* Damage Numbers Display Toggle */}
              <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Swords className="w-3.5 h-3.5 text-red-400" /> Damage Numbers
                  </span>
                  <span className="text-[10px] text-zinc-400">Displays floating damage numbers out of the enemy upon being hit</span>
                </div>
                <button
                  onClick={() => handleUpdate({ damageNumbers: settings.damageNumbers === false ? true : false })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition cursor-pointer ${
                    settings.damageNumbers !== false ? 'bg-red-600 text-white shadow' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {settings.damageNumbers !== false ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {/* Damage Bar Degrading Toggle */}
              <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-400" /> Damage Bar Degrading
                  </span>
                  <span className="text-[10px] text-zinc-400">Visually degrades HP bar with darker red chunk that disintegrates into emptiness after 1s</span>
                </div>
                <button
                  onClick={() => handleUpdate({ damageBarDegradingEnabled: settings.damageBarDegradingEnabled === false ? true : false })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition cursor-pointer ${
                    settings.damageBarDegradingEnabled !== false ? 'bg-rose-600 text-white shadow' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {settings.damageBarDegradingEnabled !== false ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PERFORMANCE SETTINGS */}
          {activeTab === 'performance' && (
            <div className="space-y-3.5 animate-fade-in">
              {/* Performance Mode / Low Graphics */}
              <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" /> Low Graphics & Performance Mode
                  </span>
                  <span className="text-[10px] text-zinc-400">Disables canvas bloom, background lighting, and heavy canvas passes for maximum FPS</span>
                </div>
                <button
                  onClick={() => handleUpdate({ lowGraphicsMode: !settings.lowGraphicsMode })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition cursor-pointer ${
                    settings.lowGraphicsMode ? 'bg-amber-600 text-white shadow' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {settings.lowGraphicsMode ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {/* Particle VFX & Hit Sparks (Moved from Graphics) */}
              <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Particle VFX & Hit Sparks
                    </span>
                    <span className="text-[10px] text-zinc-400">Sweat, hit sparks, impact rings, and style aura particle density</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-400 uppercase">
                    {settings.particleDensity || 'high'}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {(['off', 'low', 'medium', 'high', 'ultra'] as const).map(lvl => (
                    <button
                      key={lvl}
                      onClick={() => handleUpdate({ particleDensity: lvl })}
                      className={`py-1.5 text-[10px] font-mono font-bold uppercase rounded-lg border transition cursor-pointer ${
                        (settings.particleDensity || 'high') === lvl
                          ? 'bg-purple-600 border-purple-500 text-white shadow-md'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Render Resolution Scale */}
              <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Monitor className="w-3.5 h-3.5 text-blue-400" /> Internal Render Resolution Scale
                    </span>
                    <span className="text-[10px] text-zinc-400">Downscales 3D/2D canvas drawing pixels for high-DPI mobile devices to prevent GPU lag</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-400 uppercase">
                    {Math.round((settings.renderResolutionScale || 1.0) * 100)}%
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[
                    { val: 1.0, label: '100% (Native)' },
                    { val: 0.85, label: '85% (Balanced)' },
                    { val: 0.75, label: '75% (Fast)' },
                    { val: 0.60, label: '60% (Ultra FPS)' },
                  ].map(item => (
                    <button
                      key={item.val}
                      onClick={() => handleUpdate({ renderResolutionScale: item.val as any })}
                      className={`py-1.5 text-[10px] font-mono font-bold uppercase rounded-lg border transition cursor-pointer ${
                        (settings.renderResolutionScale || 1.0) === item.val
                          ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target FPS Cap / Thermal Cooling */}
              <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-emerald-400" /> Framerate Cap / Thermal Cooling
                    </span>
                    <span className="text-[10px] text-zinc-400">Caps frame updates to reduce mobile phone battery drain and overheating</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400 uppercase">
                    {settings.targetFps || 'uncapped'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {[
                    { val: 'uncapped', label: 'Uncapped (Max)' },
                    { val: '60', label: 'Target 60 FPS' },
                    { val: '30', label: '30 FPS (Cooling Mode)' },
                  ].map(item => (
                    <button
                      key={item.val}
                      onClick={() => handleUpdate({ targetFps: item.val as any })}
                      className={`py-1.5 text-[10px] font-mono font-bold uppercase rounded-lg border transition cursor-pointer ${
                        (settings.targetFps || 'uncapped') === item.val
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style Auras & Dynamic Shadows */}
              <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-red-400" /> Disable Style Auras & Shadows
                  </span>
                  <span className="text-[10px] text-zinc-400">Turns off continuous fighter style aura glows and drop shadow passes</span>
                </div>
                <button
                  onClick={() => handleUpdate({ disableAuraVfx: !settings.disableAuraVfx })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition cursor-pointer ${
                    settings.disableAuraVfx ? 'bg-red-600 text-white shadow' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {settings.disableAuraVfx ? 'Disabled Auras' : 'Active'}
                </button>
              </div>

              {/* Touch Input Throttling */}
              <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-cyan-400" /> Coalesced Touch Sampling
                  </span>
                  <span className="text-[10px] text-zinc-400">Batches mobile touch joystick updates to frame ticks to reduce Chrome CPU load</span>
                </div>
                <button
                  onClick={() => handleUpdate({ touchThrottling: !settings.touchThrottling })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition cursor-pointer ${
                    settings.touchThrottling ? 'bg-cyan-600 text-white shadow' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {settings.touchThrottling ? 'Coalesced' : 'Standard'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: GRAPHICS & VISUALS */}
          {activeTab === 'graphics' && (
            <div className="space-y-3.5 animate-fade-in">
              {/* Combat Reticle Style */}
              <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">Combat Reticle / Cursor</span>
                    <span className="text-[10px] text-zinc-400">Aim pointer shape in the 3D Octagon ring</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-400 uppercase">
                    {settings.cursorType || 'crosshair'}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {(['crosshair', 'dot', 'circle', 'minimal', 'diamond'] as const).map(shape => (
                    <button
                      key={shape}
                      onClick={() => handleUpdate({ cursorType: shape })}
                      className={`py-1.5 text-[10px] font-mono font-bold uppercase rounded-lg border transition cursor-pointer ${
                        (settings.cursorType || 'crosshair') === shape
                          ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {shape}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cursor Reticle Color */}
              <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">Reticle Accent Glow Color</span>
                    <span className="text-[10px] text-zinc-400">Color styling of the active aim reticle</span>
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-1.5 pt-1">
                  {(['white', 'red', 'cyan', 'amber', 'emerald', 'purple'] as const).map(color => (
                    <button
                      key={color}
                      onClick={() => handleUpdate({ cursorColor: color })}
                      className={`py-1.5 text-[9px] font-mono font-bold uppercase rounded-lg border transition cursor-pointer ${
                        (settings.cursorColor || 'red') === color
                          ? 'bg-zinc-800 border-white text-white ring-1 ring-white shadow'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual Octagon Arena Theme */}
              <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" /> Octagon Arena Theme
                    </span>
                    <span className="text-[10px] text-zinc-400">Atmosphere, mat graphics, and lighting mood</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                  {[
                    { id: 'classic_cage', label: 'Classic Cage' },
                    { id: 'neon_underground', label: 'Neon Cyber' },
                    { id: 'tokyo_dojo', label: 'Tokyo Dojo' },
                    { id: 'championship', label: 'UFC Gold' },
                  ].map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => handleUpdate({ arenaTheme: theme.id as any })}
                      className={`py-2 text-[10px] font-mono font-bold uppercase rounded-lg border transition cursor-pointer text-center ${
                        (settings.arenaTheme || 'classic_cage') === theme.id
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {theme.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles: Floating Damage Numbers, Damage Bar Degrading & Combo Counter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-zinc-950/70 p-3 rounded-xl border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">Damage Numbers</span>
                    <span className="text-[9px] text-zinc-400">Floating pop-up damage text</span>
                  </div>
                  <button
                    onClick={() => handleUpdate({ damageNumbers: settings.damageNumbers === false ? true : false })}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase transition cursor-pointer ${
                      settings.damageNumbers !== false ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {settings.damageNumbers !== false ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="bg-zinc-950/70 p-3 rounded-xl border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">Damage Bar Degrading</span>
                    <span className="text-[9px] text-zinc-400">Stacking delayed red HP loss chunk (1s decay)</span>
                  </div>
                  <button
                    onClick={() => handleUpdate({ damageBarDegradingEnabled: settings.damageBarDegradingEnabled === false ? true : false })}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase transition cursor-pointer ${
                      settings.damageBarDegradingEnabled !== false ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {settings.damageBarDegradingEnabled !== false ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="bg-zinc-950/70 p-3 rounded-xl border border-zinc-800 flex items-center justify-between sm:col-span-2">
                  <div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">Combo Rating Grade</span>
                    <span className="text-[9px] text-zinc-400">S/A/B/C combo chain rankings</span>
                  </div>
                  <button
                    onClick={() => handleUpdate({ comboCounter: settings.comboCounter === false ? true : false })}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase transition cursor-pointer ${
                      settings.comboCounter !== false ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {settings.comboCounter !== false ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AUDIO & MIX */}
          {activeTab === 'audio' && (
            <div className="space-y-3.5 animate-fade-in">
              {/* Master Audio Toggle */}
              <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-emerald-400" /> Master Audio Output
                  </span>
                  <span className="text-[10px] text-zinc-400">Enable or disable all synthesized game sounds</span>
                </div>
                <button
                  onClick={() => handleUpdate({ soundEnabled: !settings.soundEnabled })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition cursor-pointer flex items-center gap-1.5 ${
                    settings.soundEnabled ? 'bg-emerald-600 text-white shadow-lg' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {settings.soundEnabled ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5" /> Enabled
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-3.5 h-3.5" /> Muted
                    </>
                  )}
                </button>
              </div>

              {/* Master Volume Slider */}
              <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800 space-y-1.5">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="font-bold text-white uppercase">Master Volume</span>
                  <span className="text-emerald-400 font-bold">{Math.round((settings.masterVolume ?? 1.0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.masterVolume ?? 1.0}
                  onChange={(e) => handleUpdate({ masterVolume: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-zinc-800 rounded"
                />
              </div>

              {/* SFX / Strike Impacts Volume Slider */}
              <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800 space-y-1.5">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="font-bold text-white uppercase">Combat SFX & Impacts</span>
                  <span className="text-cyan-400 font-bold">{Math.round((settings.sfxVolume ?? 1.0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.sfxVolume ?? 1.0}
                  onChange={(e) => handleUpdate({ sfxVolume: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-zinc-800 rounded"
                />
              </div>

              {/* Haptic Feedback Toggle */}
              <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-cyan-400" /> Mobile Touch Vibration / Haptics
                  </span>
                  <span className="text-[10px] text-zinc-400">Device tactile vibration on punches & blocks</span>
                </div>
                <button
                  onClick={() => handleUpdate({ hapticsEnabled: settings.hapticsEnabled === false ? true : false })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition cursor-pointer ${
                    settings.hapticsEnabled !== false ? 'bg-cyan-600 text-white shadow' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {settings.hapticsEnabled !== false ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: HUD & TOUCH CONTROLS */}
          {activeTab === 'mobile_hud' && (
            <div className="space-y-3.5 animate-fade-in">
              {/* SECTION 7.5.2: Dedicated Lock-On & Screen Swipe Camera Mode */}
              <div className="bg-gradient-to-r from-cyan-950/80 via-zinc-950 to-blue-950/80 p-3.5 rounded-xl border border-cyan-500/40 space-y-2.5 shadow-xl">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-cyan-400" /> Character Lock-On & Swipe Aim
                    </span>
                    <span className="text-[10px] text-zinc-300 block mt-0.5">
                      Character-Axis Lock-On: Swiping rotates facing orientation; movement depends on facing direction
                    </span>
                  </div>
                  <span className={`text-[10px] font-mono font-black uppercase px-2.5 py-1 rounded-lg border ${
                    (settings.cameraMode || 'standard') === 'lockon_swipe'
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-700/80'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                  }`}>
                    {(settings.cameraMode || 'standard') === 'lockon_swipe' ? 'CHARACTER LOCK-ON' : 'STANDARD CAMERA'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleUpdate({ cameraMode: 'standard' })}
                    className={`py-2 px-3 text-xs font-mono font-bold uppercase rounded-xl border transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      (settings.cameraMode || 'standard') === 'standard'
                        ? 'bg-zinc-700 border-zinc-500 text-white shadow-lg'
                        : 'bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="font-black text-xs">STANDARD</span>
                    <span className="text-[9px] font-sans text-zinc-300 normal-case">World-Relative Movement & Mouse Tracking</span>
                  </button>

                  <button
                    onClick={() => handleUpdate({ cameraMode: 'lockon_swipe' })}
                    className={`py-2 px-3 text-xs font-mono font-bold uppercase rounded-xl border transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      (settings.cameraMode || 'standard') === 'lockon_swipe'
                        ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg ring-1 ring-cyan-400/80'
                        : 'bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="font-black text-xs">LOCK-ON & SWIPE</span>
                    <span className="text-[9px] font-sans text-cyan-100/70 normal-case">Character-Axis Lock, Swipe Aim & Relative Movement</span>
                  </button>
                </div>

                {/* Camera Sensitivity Slider */}
                <div className="pt-2 border-t border-zinc-800/80 space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-bold text-zinc-300">Camera Sensitivity</span>
                    <span className="font-mono text-cyan-400 font-bold">{(settings.cameraSensitivity ?? 1.0).toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="10.0"
                    step="0.1"
                    value={settings.cameraSensitivity ?? 1.0}
                    onChange={(e) => handleUpdate({ cameraSensitivity: parseFloat(e.target.value) || 1.0 })}
                    className="w-full accent-cyan-400 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Button Reconfigurator Action Bar */}
              <div className="bg-gradient-to-r from-cyan-950/80 to-blue-950/80 p-4 rounded-xl border border-cyan-800/60 flex items-center justify-between shadow-xl">
                <div>
                  <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Move className="w-4 h-4 text-cyan-400" /> Interactive HUD & Touch Button Editor
                  </span>
                  <span className="text-[10px] text-cyan-200/80 block mt-0.5">
                    Drag, reposition, scale & adjust opacity for every virtual combat button
                  </span>
                </div>
                <button
                  onClick={onOpenHudEditor}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-mono font-black uppercase rounded-xl transition cursor-pointer shadow-lg shrink-0 ml-2"
                >
                  Open Editor
                </button>
              </div>

              {/* Mobile Sprint Mode Setting */}
              <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-emerald-400" /> Mobile Sprint Trigger
                    </span>
                    <span className="text-[10px] text-zinc-400">Choose how sprinting is activated with mobile touch controls</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400 uppercase">
                    {(settings.mobileSprintMode || 'button_only') === 'auto_sprint' ? '100% Auto-Sprint' : 'Button Choice'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleUpdate({ mobileSprintMode: 'button_only' })}
                    className={`py-2 px-3 text-xs font-mono font-bold uppercase rounded-lg border transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      (settings.mobileSprintMode || 'button_only') === 'button_only'
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-md ring-1 ring-emerald-400/50'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>Button Choice (Manual)</span>
                    <span className="text-[9px] font-sans opacity-80 normal-case">Hold SPRINT button only</span>
                  </button>
                  <button
                    onClick={() => handleUpdate({ mobileSprintMode: 'auto_sprint' })}
                    className={`py-2 px-3 text-xs font-mono font-bold uppercase rounded-lg border transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      (settings.mobileSprintMode || 'button_only') === 'auto_sprint'
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-md ring-1 ring-emerald-400/50'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>100% Auto-Sprint</span>
                    <span className="text-[9px] font-sans opacity-80 normal-case">Push joystick to full edge</span>
                  </button>
                </div>
              </div>

              {/* Virtual Controls Mode */}
              <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">Virtual Controls Display</span>
                    <span className="text-[10px] text-zinc-400">Control stick & combat buttons display mode</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
                    {settings.showVirtualControls || 'auto'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {(['auto', 'always', 'never'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => handleUpdate({ showVirtualControls: mode })}
                      className={`py-1.5 text-[10px] font-mono font-bold uppercase rounded-lg border transition cursor-pointer ${
                        (settings.showVirtualControls || 'auto') === mode
                          ? 'bg-cyan-600 border-cyan-500 text-white shadow-md'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Camera Field of View (FOV) */}
              <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">Camera FOV Zoom</span>
                    <span className="text-[10px] text-zinc-400">Combat camera distance from fighters</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/50">
                    {(settings.mobileFov || 1.3).toFixed(1)}x
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {[1.0, 1.2, 1.4, 1.6, 1.8].map(fov => (
                    <button
                      key={fov}
                      onClick={() => handleUpdate({ mobileFov: fov })}
                      className={`py-1.5 text-[10px] font-mono font-bold uppercase rounded-lg border transition cursor-pointer ${
                        Math.abs((settings.mobileFov || 1.3) - fov) < 0.05
                          ? 'bg-cyan-600 border-cyan-500 text-white shadow-md'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {fov === 1.0 ? '1.0x (Close)' : `${fov}x`}
                    </button>
                  ))}
                </div>
              </div>

              {/* HUD Base Scaling Multiplier */}
              <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">Character Card Scale</span>
                    <span className="text-[10px] text-zinc-400">Health, stamina & portrait HUD size</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-400">
                    {Math.round((settings.hudScale ?? 0.85) * 100)}%
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {[0.5, 0.65, 0.8, 1.0, 1.2].map(scale => (
                    <button
                      key={scale}
                      onClick={() => handleUpdate({ hudScale: scale })}
                      className={`py-1.5 text-[10px] font-mono font-bold uppercase rounded-lg border transition cursor-pointer ${
                        Math.abs((settings.hudScale ?? 0.85) - scale) < 0.01
                          ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {Math.round(scale * 100)}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Pinch to Zoom */}
              <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">Pinch-to-Zoom Gesture</span>
                  <span className="text-[10px] text-zinc-400">2-finger pinch gesture on mobile, mouse wheel on PC</span>
                </div>
                <button
                  onClick={() => handleUpdate({ pinchToZoomEnabled: settings.pinchToZoomEnabled === false ? true : false })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition cursor-pointer ${
                    settings.pinchToZoomEnabled !== false ? 'bg-cyan-600 text-white shadow' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {settings.pinchToZoomEnabled !== false ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: SYSTEM & ACCOUNT */}
          {activeTab === 'system' && (
            <div className="space-y-3.5 animate-fade-in">
              {/* FPS and Latency Monitor Toggle */}
              <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" /> Performance & FPS Counter
                  </span>
                  <span className="text-[10px] text-zinc-400">Display real-time frame rate & render timings</span>
                </div>
                <button
                  onClick={() => handleUpdate({ showFps: !settings.showFps })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition cursor-pointer ${
                    settings.showFps ? 'bg-emerald-600 text-white shadow' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {settings.showFps ? 'Visible' : 'Hidden'}
                </button>
              </div>

              {/* Dev Mode Switcher Toggle */}
              <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-amber-400" /> Developer Sandbox Tools
                  </span>
                  <span className="text-[10px] text-zinc-400">In-game instant style swap and debug overlay</span>
                </div>
                <button
                  onClick={() => handleUpdate({ showDevSwitcher: !settings.showDevSwitcher })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition cursor-pointer ${
                    settings.showDevSwitcher ? 'bg-amber-600 text-white shadow' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {settings.showDevSwitcher ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {/* Reset to Factory Defaults */}
              <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-zinc-400" /> Restore Default Settings
                  </span>
                  <span className="text-[10px] text-zinc-400">Reverts audio, graphics and controls to factory defaults</span>
                </div>
                <button
                  onClick={() => {
                    handleUpdate({
                      soundEnabled: true,
                      masterVolume: 1.0,
                      sfxVolume: 1.0,
                      musicVolume: 0.8,
                      screenShake: 1.0,
                      showVirtualControls: 'auto',
                      cursorType: 'crosshair',
                      cursorColor: 'red',
                      hudScale: 0.85,
                      mobileFov: 1.3,
                      damageNumbers: true,
                      staminaWarning: true,
                      comboCounter: true,
                      showFps: false,
                      hapticsEnabled: true,
                      hitstopEffect: true,
                      autoTargetAssist: true,
                      particleDensity: 'high',
                      arenaTheme: 'classic_cage'
                    });
                  }}
                  className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-bold uppercase rounded-lg transition cursor-pointer"
                >
                  Reset Defaults
                </button>
              </div>

              {/* Danger Zone: Account Reset */}
              {onRequestResetProgress && (
                <div className="bg-red-950/40 p-3.5 rounded-xl border border-red-900/60 flex items-center justify-between mt-4">
                  <div>
                    <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-500" /> Reset Fighter Progress
                    </span>
                    <span className="text-[10px] text-zinc-400">Clears all styles, stats, rolls, cash, and ELO rank</span>
                  </div>
                  <button
                    onClick={onRequestResetProgress}
                    className="px-3.5 py-2 bg-red-800 hover:bg-red-700 text-white text-xs font-mono font-bold uppercase rounded-xl transition cursor-pointer shadow-md"
                  >
                    Reset Account
                  </button>
                </div>
              )}
            </div>
          )}

      </div>
    </div>
  );
}
