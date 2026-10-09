import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LogOut, Volume2, VolumeX, Sliders, Smartphone, Eye, Sparkles, Move, RotateCcw, 
  Check, Flame, Shield, Swords, AlertTriangle, Monitor, Activity, Zap, Layers, RefreshCw, X, Keyboard,
  Search, Filter, ChevronRight, Gauge, HelpCircle, HardDrive, SmartphoneCharging
} from 'lucide-react';
import { GameSettings } from '../../types';
import { soundManager } from '../SoundManager';
import { isMobileDevice as detectIsMobile, isPcDevice as detectIsPc } from '../../utils/deviceDetection';
import { SettingsCategoryTab } from '../navigation/SettingsNavRail';

interface SettingsViewProps {
  settings: GameSettings;
  updateSettings: (updates: Partial<GameSettings>) => void;
  onClose: () => void;
  onOpenHudEditor?: () => void;
  onRequestResetProgress?: () => void;
  isNavHidden?: boolean;
  activeCategory?: SettingsCategoryTab;
  setActiveCategory?: (cat: SettingsCategoryTab) => void;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
}

export interface SettingDefinition {
  id: string;
  title: string;
  category: 'combat' | 'audio' | 'controls' | 'graphics' | 'hud' | 'performance' | 'system';
  description: string;
  icon: any;
  keywords: string[];
  relatedTo: string[];
}

export function SettingsView({
  settings,
  updateSettings,
  onClose,
  onOpenHudEditor,
  onRequestResetProgress,
  isNavHidden = false,
  activeCategory: parentCategory,
  setActiveCategory: setParentCategory,
  searchQuery: parentSearchQuery,
  setSearchQuery: setParentSearchQuery,
}: SettingsViewProps) {
  // Local state fallbacks if parent doesn't provide them
  const [localCategory, setLocalCategory] = useState<SettingsCategoryTab>('all');
  const [localSearch, setLocalSearch] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'settings' | 'related'>('settings');
  const [audioTesting, setAudioTesting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const activeCategory = parentCategory ?? localCategory;
  const setActiveCategory = setParentCategory ?? setLocalCategory;
  const searchQuery = parentSearchQuery ?? localSearch;
  const setSearchQuery = setParentSearchQuery ?? setLocalSearch;

  // Responsive device & orientation detection for Dynamic Scaling
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

  const handleUpdate = (updates: Partial<GameSettings>) => {
    updateSettings(updates);
    soundManager.playRollTick?.();
    if (updates.masterVolume !== undefined || updates.sfxVolume !== undefined) {
      soundManager.setVolumes?.(
        updates.masterVolume ?? settings.masterVolume ?? 1.0,
        updates.sfxVolume ?? settings.sfxVolume ?? 1.0
      );
    }
  };

  const playAudioTest = () => {
    setAudioTesting(true);
    soundManager.playPunch?.(true);
    setTimeout(() => {
      soundManager.playParry?.();
      setAudioTesting(false);
    }, 280);
  };

  // Keyboard navigation & shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        if (e.key === 'Escape') {
          target.blur();
          setSearchQuery('');
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        soundManager.playRollTick?.();
        onClose();
      } else if (e.key === '/' || (e.ctrlKey && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        searchInputRef.current?.focus();
        soundManager.playRollTick?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, setSearchQuery]);

  // Master Settings Definition Registry with Related To Links
  const settingDefinitions: SettingDefinition[] = useMemo(() => [
    {
      id: 'screenShake',
      title: 'Screen Shake Recoil',
      category: 'combat',
      description: 'Physical camera jolt and vibration on heavy strikes, counter blows, and wall impacts.',
      icon: Activity,
      keywords: ['shake', 'recoil', 'wobble', 'camera', 'vibration', 'rumble', 'nausea', 'motion'],
      relatedTo: ['Hitstop Impact Freeze', 'Mobile Camera FOV', 'Combat SFX & Impacts']
    },
    {
      id: 'hitstopEffect',
      title: 'Hitstop Impact Freeze',
      category: 'combat',
      description: 'Micro time-dilation freeze frames on brutal K.O.s and heavy hits for visceral feedback.',
      icon: Zap,
      keywords: ['hitstop', 'freeze', 'slowmo', 'impact', 'cinematic', 'dilation', 'timing'],
      relatedTo: ['Screen Shake Recoil', 'Smart Strike Lock-On Assist', 'Combat SFX & Impacts']
    },
    {
      id: 'autoTargetAssist',
      title: 'Smart Strike Lock-On Assist',
      category: 'combat',
      description: 'Softly directs strikes toward locked opponent or nearest foe when nearby.',
      icon: Swords,
      keywords: ['target', 'lock', 'aim', 'assist', 'auto', 'homing', 'steer'],
      relatedTo: ['Touch Control Scheme', 'Hitstop Impact Freeze', 'Combat Damage Numbers']
    },
    {
      id: 'damageNumbers',
      title: 'Combat Damage Numbers',
      category: 'combat',
      description: 'Displays floating damage indicators and status popups in the arena upon impact.',
      icon: Swords,
      keywords: ['damage', 'numbers', 'floating', 'combat', 'hits', 'indicators', 'dps'],
      relatedTo: ['Damage Bar Degrading', 'UI Size Scale', 'Hitstop Impact Freeze']
    },
    {
      id: 'damageBarDegradingEnabled',
      title: 'Damage Bar Degrading',
      category: 'combat',
      description: 'Visually degrades HP bar with darker red chunk that disintegrates into emptiness.',
      icon: Flame,
      keywords: ['health', 'hp', 'degrade', 'bar', 'chunk', 'red', 'disintegration'],
      relatedTo: ['Combat Damage Numbers', 'UI Size Scale', 'Low Stamina Warning']
    },
    {
      id: 'staminaWarning',
      title: 'Low Stamina Warning Pulse',
      category: 'combat',
      description: 'Pulses screen border with red aura when stamina dips below 20% to prevent exhaustion.',
      icon: AlertTriangle,
      keywords: ['stamina', 'warning', 'pulse', 'exhaustion', 'meter', 'fatigue'],
      relatedTo: ['Combat Damage Numbers', 'Master Audio Volume']
    },
    {
      id: 'comboCounter',
      title: 'Combo Counter & Rating',
      category: 'combat',
      description: 'Displays consecutive hit combo strings and stylish combat rank grades.',
      icon: Sparkles,
      keywords: ['combo', 'counter', 'rating', 'grade', 'streak', 'hits'],
      relatedTo: ['Combat Damage Numbers', 'Hitstop Impact Freeze']
    },
    // AUDIO MIX
    {
      id: 'masterVolume',
      title: 'Master Audio Volume',
      category: 'audio',
      description: 'Master multiplier for all combat sound effects, impacts, and music.',
      icon: Volume2,
      keywords: ['volume', 'master', 'sound', 'audio', 'mute', 'loud', 'quiet'],
      relatedTo: ['Combat SFX & Impacts', 'Background Music Volume', 'Screen Shake Recoil']
    },
    {
      id: 'sfxVolume',
      title: 'Combat SFX & Impacts',
      category: 'audio',
      description: 'Punch impacts, bone fractures, parry clashes, and ambient crowd sounds.',
      icon: Volume2,
      keywords: ['sfx', 'impact', 'punch', 'sound', 'clash', 'parry', 'audio', 'effects'],
      relatedTo: ['Master Audio Volume', 'Hitstop Impact Freeze', 'Screen Shake Recoil']
    },
    {
      id: 'musicVolume',
      title: 'Background Music Volume',
      category: 'audio',
      description: 'Arena battle themes, main menu synth beats, and fight victory tracks.',
      icon: Volume2,
      keywords: ['music', 'bgm', 'track', 'beat', 'theme', 'audio', 'soundtrack'],
      relatedTo: ['Master Audio Volume', 'Combat SFX & Impacts']
    },
    {
      id: 'soundEnabled',
      title: 'Global Sound System',
      category: 'audio',
      description: 'Master switch to enable or mute all game audio and sound synthesis.',
      icon: VolumeX,
      keywords: ['sound', 'audio', 'mute', 'output', 'enable', 'disable'],
      relatedTo: ['Master Audio Volume', 'Combat SFX & Impacts']
    },
    // CONTROLS & HUD
    {
      id: 'touchControlMode',
      title: 'Touch Control Scheme',
      category: 'controls',
      description: 'Virtual HUD controls, swipe gestures, or docked tactile attack buttons.',
      icon: Smartphone,
      keywords: ['controls', 'touch', 'joystick', 'buttons', 'hud', 'mobile', 'scheme'],
      relatedTo: ['UI Size Scale', 'In-Game Live HUD Editor', 'Smart Strike Lock-On Assist']
    },
    {
      id: 'cameraMode',
      title: 'Camera Aim & Lock-On Mode',
      category: 'controls',
      description: 'Top-down world relative or Character-Axis Lock-On with swipe aim direction.',
      icon: Eye,
      keywords: ['camera', 'aim', 'swipe', 'lockon', 'look', 'controls', 'axis'],
      relatedTo: ['Mobile Camera FOV', 'Swipe Aim Sensitivity', 'Pinch-to-Zoom Gesture']
    },
    {
      id: 'cameraSensitivity',
      title: 'Swipe Aim Sensitivity',
      category: 'controls',
      description: 'Adjust touch swipe responsiveness when aiming directional attacks.',
      icon: Sliders,
      keywords: ['sensitivity', 'swipe', 'aim', 'speed', 'camera', 'responsive'],
      relatedTo: ['Camera Aim & Lock-On Mode', 'Mobile Camera FOV']
    },
    {
      id: 'hapticsEnabled',
      title: 'Mobile Haptic Vibration',
      category: 'controls',
      description: 'Device tactile vibration pulses on successful parries, K.O.s, and stamina breaks.',
      icon: SmartphoneCharging,
      keywords: ['haptic', 'vibration', 'rumble', 'tactile', 'feedback', 'buzz'],
      relatedTo: ['Screen Shake Recoil', 'Combat SFX & Impacts']
    },
    {
      id: 'cursorType',
      title: 'PC Aim Cursor Reticle',
      category: 'controls',
      description: 'Target crosshair reticle style for precision mouse aiming on PC.',
      icon: CrosshairIcon,
      keywords: ['cursor', 'reticle', 'crosshair', 'mouse', 'aim', 'pc'],
      relatedTo: ['Smart Strike Lock-On Assist', 'Screen Shake Recoil']
    },
    // GRAPHICS
    {
      id: 'particleDensity',
      title: 'Particle Density & Blood Splatter',
      category: 'graphics',
      description: 'Impact spark particles, sweat droplets, aura rings, and octagon floor blood.',
      icon: Sparkles,
      keywords: ['particle', 'density', 'sparks', 'fx', 'blood', 'sweat', 'aura', 'flames'],
      relatedTo: ['Show Live FPS & Netcode Ping', 'Performance Mode / Low Graphics', 'Screen Shake Recoil']
    },
    {
      id: 'lowGraphicsMode',
      title: 'Performance Mode / Low Graphics',
      category: 'graphics',
      description: 'Disables heavy canvas bloom shaders and background overlays for max FPS.',
      icon: Monitor,
      keywords: ['performance', 'low', 'graphics', 'fps', 'shaders', 'bloom', 'smooth', 'lag'],
      relatedTo: ['Particle Density & Blood Splatter', 'Render Resolution Scale', 'Show Live FPS & Netcode Ping']
    },
    {
      id: 'disableAuraVfx',
      title: 'Disable Fighter Aura VFX',
      category: 'graphics',
      description: 'Hides martial style aura particles and floor drop shadows to boost frame rate.',
      icon: Flame,
      keywords: ['aura', 'vfx', 'shadows', 'performance', 'particles', 'lag'],
      relatedTo: ['Performance Mode / Low Graphics', 'Particle Density & Blood Splatter']
    },
    {
      id: 'arenaTheme',
      title: 'Octagon Arena Visual Theme',
      category: 'graphics',
      description: 'Visual skin and ambient lighting aesthetic of the fighting cage arena.',
      icon: Layers,
      keywords: ['theme', 'arena', 'skin', 'cage', 'lighting', 'visuals', 'neon', 'dojo'],
      relatedTo: ['Performance Mode / Low Graphics', 'Mobile Camera FOV']
    },
    // CAMERA & HUD
    {
      id: 'mobileFov',
      title: 'Camera Field of View (FOV)',
      category: 'hud',
      description: 'Camera zoom height over the octagon. Higher values give broader peripheral vision.',
      icon: Eye,
      keywords: ['fov', 'camera', 'zoom', 'view', 'elevation', 'perspective', 'wide'],
      relatedTo: ['Lock Camera FOV', 'Pinch-to-Zoom Gesture', 'UI Size Scale', 'Screen Shake Recoil']
    },
    {
      id: 'lockFov',
      title: 'Lock Camera FOV',
      category: 'hud',
      description: 'Locks camera elevation so it does not auto-zoom during cinematic closeups.',
      icon: Shield,
      keywords: ['lock', 'fov', 'camera', 'zoom', 'static', 'cinematic'],
      relatedTo: ['Camera Field of View (FOV)', 'Pinch-to-Zoom Gesture']
    },
    {
      id: 'pinchToZoomEnabled',
      title: 'Pinch-to-Zoom Gesture',
      category: 'hud',
      description: 'Allows dynamic two-finger pinch gesture to adjust arena camera zoom live.',
      icon: Move,
      keywords: ['pinch', 'zoom', 'gesture', 'camera', 'touch', 'fov'],
      relatedTo: ['Camera Field of View (FOV)', 'Lock Camera FOV']
    },
    {
      id: 'hudScale',
      title: 'UI Size Scale',
      category: 'hud',
      description: 'Scales user and enemy health cards, stamina meters, and guard indicators.',
      icon: Sliders,
      keywords: ['scale', 'size', 'hud', 'health', 'ui', 'cards', 'meters', 'display'],
      relatedTo: ['HUD Transparency / Opacity', 'Combat Damage Numbers', 'Camera Field of View (FOV)']
    },
    {
      id: 'hudOpacity',
      title: 'HUD Transparency / Opacity',
      category: 'hud',
      description: 'Controls transparency level of on-screen gauges and touch action buttons.',
      icon: Eye,
      keywords: ['opacity', 'transparency', 'alpha', 'hud', 'visible', 'buttons'],
      relatedTo: ['UI Size Scale', 'Touch Control Scheme', 'In-Game Live HUD Editor']
    },
    // PERFORMANCE
    {
      id: 'showFps',
      title: 'Show Live FPS & Netcode Ping',
      category: 'performance',
      description: 'Displays real-time frame rate, network latency ping, and frame time overlay.',
      icon: Gauge,
      keywords: ['fps', 'ping', 'latency', 'netcode', 'ms', 'stats', 'counter', 'frame'],
      relatedTo: ['Performance Mode / Low Graphics', 'Target Frame Rate Cap', 'Particle Density & Blood Splatter']
    },
    {
      id: 'targetFps',
      title: 'Target Frame Rate Cap',
      category: 'performance',
      description: 'Cap frame rate to conserve mobile battery or unlock for high-Hz displays.',
      icon: Zap,
      keywords: ['fps', 'rate', 'target', 'cap', 'refresh', 'hz', 'battery', 'performance'],
      relatedTo: ['Show Live FPS & Netcode Ping', 'Render Resolution Scale']
    },
    {
      id: 'renderResolutionScale',
      title: 'Render Resolution Scale',
      category: 'performance',
      description: 'Internal canvas downsampling factor for budget or older mobile devices.',
      icon: Monitor,
      keywords: ['resolution', 'scale', 'render', 'downsample', 'quality', 'gpu', 'sharpness'],
      relatedTo: ['Performance Mode / Low Graphics', 'Target Frame Rate Cap']
    },
    {
      id: 'touchThrottling',
      title: 'Touch Event Coalescing',
      category: 'performance',
      description: 'Batches high-frequency touch joystick updates to match display refresh rate.',
      icon: Smartphone,
      keywords: ['touch', 'throttling', 'input', 'coalesce', 'lag', 'polling', 'delay'],
      relatedTo: ['Touch Control Scheme', 'Target Frame Rate Cap']
    },
    // SYSTEM
    {
      id: 'cloudSync',
      title: 'Account Cloud Sync & Backup',
      category: 'system',
      description: 'All fighter records, style unlocks, mastery, and settings sync automatically.',
      icon: HardDrive,
      keywords: ['account', 'cloud', 'sync', 'save', 'backup', 'data', 'profile'],
      relatedTo: ['Reset Local Settings & Cache']
    },
    {
      id: 'resetProgress',
      title: 'Reset Local Settings & Cache',
      category: 'system',
      description: 'Restores all audio, camera, and combat configurations to original factory defaults.',
      icon: RotateCcw,
      keywords: ['reset', 'default', 'factory', 'clear', 'cache', 'restore'],
      relatedTo: ['Account Cloud Sync & Backup']
    }
  ], []);

  // Filter settings by Search and Category
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return settingDefinitions.filter(def => {
      // Category filter
      if (activeCategory !== 'all' && def.category !== activeCategory) {
        return false;
      }

      if (!q) return true;

      // Exact title match or keyword match
      const titleMatch = def.title.toLowerCase().includes(q);
      const descMatch = def.description.toLowerCase().includes(q);
      const keywordMatch = def.keywords.some(k => k.toLowerCase().includes(q) || q.includes(k.toLowerCase()));
      const relatedMatch = def.relatedTo.some(r => r.toLowerCase().includes(q) || q.includes(r.toLowerCase()));

      return titleMatch || descMatch || keywordMatch || relatedMatch;
    });
  }, [settingDefinitions, activeCategory, searchQuery]);

  // Derive "Related To" Suggestions dynamically from the active search or selected setting
  const relatedSettingsMap = useMemo(() => {
    const map = new Map<string, SettingDefinition>();
    if (!searchQuery.trim()) return [];

    // Find all settings linked in relatedTo of the current search results
    searchResults.forEach(res => {
      res.relatedTo.forEach(relTitle => {
        const found = settingDefinitions.find(d => d.title.toLowerCase() === relTitle.toLowerCase());
        if (found && !searchResults.some(sr => sr.id === found.id)) {
          map.set(found.id, found);
        }
      });
    });

    return Array.from(map.values());
  }, [searchResults, settingDefinitions, searchQuery]);

  // Related Topics Chips
  const popularTopics = [
    { label: 'Screen Shake', query: 'shake', icon: Activity },
    { label: 'Master Volume', query: 'volume', icon: Volume2 },
    { label: 'Camera FOV', query: 'fov', icon: Eye },
    { label: 'FPS & Ping', query: 'fps', icon: Gauge },
    { label: 'Touch HUD', query: 'touch', icon: Smartphone },
    { label: 'Hitstop', query: 'hitstop', icon: Zap },
    { label: 'Damage Numbers', query: 'damage', icon: Swords },
    { label: 'Performance', query: 'performance', icon: Sparkles },
  ];

  // Helper function to focus or jump to a related setting
  const handleSelectRelated = (relatedTitle: string) => {
    soundManager.playRollTick?.();
    setSearchQuery(relatedTitle);
    setActiveCategory('all');
  };

  return (
    <div 
      id="full-screen-settings-view"
      className={`fixed inset-0 z-[120] bg-zinc-950 text-white flex flex-col pointer-events-auto select-none overflow-hidden transition-all duration-300 ${
        isNavHidden ? 'pl-0' : 'pl-14 sm:pl-16'
      }`}
    >
      {/* ============================================================== */}
      {/* 1. TOP HEADER BAR WITH ICONIC STASIS EXIT BUTTON               */}
      {/* ============================================================== */}
      <div className={`border-b border-zinc-850 bg-gradient-to-r from-zinc-950 via-zinc-900/90 to-zinc-950 flex items-center justify-between gap-3 shrink-0 ${
        isCompactLandscape ? 'px-3 py-1.5' : 'px-4 sm:px-6 py-2.5 sm:py-3'
      }`}>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-red-950/80 border border-red-800/80 flex items-center justify-center text-red-400 shrink-0 shadow-md">
            <Sliders className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm md:text-base font-display font-black italic uppercase tracking-wider text-white">
                GAME & SYSTEM SETTINGS
              </h1>
              <span className="text-[8px] sm:text-[9px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/40 px-1.5 py-0.5 rounded uppercase">
                V1.7.6 MATRIX
              </span>
            </div>
            {!isCompactLandscape && (
              <p className="text-[10px] font-mono text-zinc-400 hidden sm:block">
                Combat Physics, Low-Latency Engine, Sound Mix & Touch HUD
              </p>
            )}
          </div>
        </div>

        {/* TOP ACTIONS: AUDIO TEST & STASIS EXIT BUTTON */}
        <div className="flex items-center gap-2">
          {/* Quick Sound Test */}
          <button
            onClick={playAudioTest}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-mono font-bold uppercase transition cursor-pointer active:scale-95 ${
              audioTesting
                ? 'bg-amber-500/30 text-amber-200 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-800'
            }`}
            title="Preview Impact & Parry Audio"
          >
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Test Audio</span>
          </button>

          {/* STASIS EXIT BUTTON (Iconic Stasis styling) */}
          <button
            onClick={() => {
              soundManager.playRollTick?.();
              onClose();
            }}
            className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-red-950/90 via-red-900/60 to-zinc-900 hover:from-red-900 hover:to-zinc-850 border border-red-500/50 hover:border-red-400 text-red-200 hover:text-white rounded-xl text-xs font-display font-black italic uppercase tracking-wider transition-all duration-200 shadow-md active:scale-95 group cursor-pointer"
            title="Exit Settings & Return to Main Menu"
          >
            <LogOut className="w-4 h-4 text-red-400 rotate-180 transition-transform group-hover:scale-110" />
            <div className="flex flex-col text-left leading-none">
              <span className="text-[11px] font-black tracking-wide text-red-300 group-hover:text-white">EXIT / RETURN</span>
              <span className="text-[8px] font-mono text-red-400/80">Main Menu</span>
            </div>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. SEARCH BAR & "RELATED TO" TOPIC SYSTEM                      */}
      {/* ============================================================== */}
      <div className={`border-b border-zinc-850 bg-zinc-950/90 flex flex-col gap-2 shrink-0 ${
        isCompactLandscape ? 'px-3 py-1.5' : 'px-4 sm:px-6 py-2'
      }`}>
        <div className="flex items-center gap-2">
          {/* Tactical Search Input */}
          <div className="relative flex-1 flex items-center">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings, physics, audio, controls, FOV, shake, FPS... (Press / or Ctrl+K)"
              className="w-full bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 focus:border-cyan-400 text-white placeholder-zinc-500 text-xs font-mono pl-9 pr-8 py-1.5 sm:py-2 rounded-xl focus:outline-none transition shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                  soundManager.playRollTick?.();
                }}
                className="absolute right-2.5 text-zinc-400 hover:text-white p-1 cursor-pointer transition"
                title="Clear Search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Matches Count Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] font-mono font-bold text-zinc-400 shrink-0">
            <span className="text-cyan-400">{searchResults.length}</span>
            <span>Configs</span>
          </div>
        </div>

        {/* RELATED TOPICS CHIPS BAR (Only visible if not ultra-compact or when searching) */}
        {(!isCompactLandscape || searchQuery) && (
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-0.5 select-none">
            <span className="text-[8px] font-mono uppercase font-black tracking-wider text-cyan-400 flex items-center gap-1 shrink-0 mr-1">
              <Sparkles className="w-2.5 h-2.5 text-amber-400" />
              <span>Related To:</span>
            </span>
            {popularTopics.map((topic) => {
              const Icon = topic.icon;
              const isSelected = searchQuery.toLowerCase() === topic.query.toLowerCase();
              return (
                <button
                  key={topic.query}
                  onClick={() => {
                    handleSelectRelated(topic.query);
                  }}
                  className={`text-[9px] font-mono px-2 py-1 rounded-lg transition cursor-pointer border flex items-center gap-1 shrink-0 ${
                    isSelected
                      ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400 font-bold shadow-sm'
                      : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  <Icon className="w-2.5 h-2.5 text-cyan-400" />
                  <span>#{topic.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 3. MAIN WORKSPACE WITH DYNAMIC SCALING GRID                     */}
      {/* ============================================================== */}
      <div className={`flex-1 overflow-y-auto custom-scrollbar min-h-0 bg-zinc-950/40 w-full ${
        isCompactLandscape ? 'p-2 sm:p-3' : 'p-3 sm:p-5 lg:p-6'
      }`}>
        <div className="max-w-6xl mx-auto space-y-4">
          
          {/* SEARCH SUMMARY BANNER IF ACTIVE */}
          {searchQuery && (
            <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-between text-xs font-mono text-cyan-300">
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Showing search results for &ldquo;<strong className="text-white">{searchQuery}</strong>&rdquo;</span>
                <span className="text-[10px] text-zinc-400">({searchResults.length} matches)</span>
              </div>
              <button
                onClick={() => setSearchQuery('')}
                className="text-[10px] font-bold text-cyan-400 hover:text-white underline cursor-pointer"
              >
                Clear Filter
              </button>
            </div>
          )}

          {/* NO RESULTS FOUND STATE */}
          {searchResults.length === 0 && (
            <div className="p-8 text-center rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <HelpCircle className="w-8 h-8 text-zinc-500 mx-auto" />
              <h3 className="text-sm font-display font-black uppercase text-zinc-300">No Direct Settings Found</h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                No configurations matched &ldquo;{searchQuery}&rdquo;. Try clicking one of the Related To tags above or explore categories.
              </p>
              <div className="flex justify-center gap-2 pt-2">
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-mono font-bold uppercase transition"
                >
                  View All Settings
                </button>
              </div>
            </div>
          )}

          {/* DYNAMIC SCALING GRID: 
              In Landscape: 2 or 3 dense columns to eliminate vertical scrolling.
              In Portrait: Single column or 2 columns with thumb-friendly hit targets.
          */}
          <div className={`grid gap-2.5 sm:gap-3.5 ${
            isLandscape 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
              : 'grid-cols-1 sm:grid-cols-2'
          }`}>
            {searchResults.map((def) => {
              const Icon = def.icon;

              return (
                <div 
                  key={def.id}
                  className={`p-3 sm:p-3.5 rounded-2xl bg-zinc-900/85 hover:bg-zinc-900 border border-zinc-800/90 hover:border-zinc-700/80 transition-all flex flex-col justify-between shadow-sm relative group ${
                    isCompactLandscape ? 'min-h-[95px] space-y-1.5' : 'min-h-[120px] space-y-2.5'
                  }`}
                >
                  {/* TOP HEADER: ICON, TITLE & CATEGORY BADGE */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-red-400 shrink-0 shadow-inner">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <h4 className="text-xs font-display font-black uppercase text-white tracking-wide">
                          {def.title}
                        </h4>
                      </div>
                      <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase bg-zinc-950/80 px-1.5 py-0.5 rounded border border-zinc-800/80 shrink-0">
                        {def.category}
                      </span>
                    </div>

                    <p className={`text-[10px] text-zinc-400 font-sans mt-1 leading-snug line-clamp-2 ${
                      isCompactLandscape ? 'hidden' : 'block'
                    }`}>
                      {def.description}
                    </p>
                  </div>

                  {/* CONTROLS RENDERER ACCORDING TO SETTING TYPE */}
                  <div className="pt-1 border-t border-zinc-800/60">
                    {/* 1. SCREEN SHAKE SLIDER */}
                    {def.id === 'screenShake' && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-zinc-400">Shake Recoil:</span>
                          <span className="font-bold text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/50">
                            {Math.round((settings.screenShake ?? 1.0) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="2.0"
                          step="0.1"
                          value={settings.screenShake ?? 1.0}
                          onChange={(e) => handleUpdate({ screenShake: parseFloat(e.target.value) })}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                        <div className="flex justify-between text-[8px] font-mono text-zinc-500">
                          <span onClick={() => handleUpdate({ screenShake: 0 })} className="cursor-pointer hover:text-white">0%</span>
                          <span onClick={() => handleUpdate({ screenShake: 0.5 })} className="cursor-pointer hover:text-white">50%</span>
                          <span onClick={() => handleUpdate({ screenShake: 1.0 })} className="cursor-pointer hover:text-white">100%</span>
                          <span onClick={() => handleUpdate({ screenShake: 1.5 })} className="cursor-pointer hover:text-white">150%</span>
                          <span onClick={() => handleUpdate({ screenShake: 2.0 })} className="cursor-pointer hover:text-white">200%</span>
                        </div>
                      </div>
                    )}

                    {/* 2. HITSTOP EFFECT TOGGLE */}
                    {def.id === 'hitstopEffect' && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-zinc-400">Time Dilation Freeze</span>
                        <button
                          onClick={() => handleUpdate({ hitstopEffect: settings.hitstopEffect === false ? true : false })}
                          className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer border ${
                            settings.hitstopEffect !== false 
                              ? 'bg-amber-600 text-white border-amber-500 shadow' 
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {settings.hitstopEffect !== false ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>
                    )}

                    {/* 3. AUTO TARGET ASSIST TOGGLE */}
                    {def.id === 'autoTargetAssist' && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-zinc-400">Soft Lock-On Steering</span>
                        <button
                          onClick={() => handleUpdate({ autoTargetAssist: settings.autoTargetAssist === false ? true : false })}
                          className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer border ${
                            settings.autoTargetAssist !== false 
                              ? 'bg-red-600 text-white border-red-500 shadow' 
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {settings.autoTargetAssist !== false ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>
                    )}

                    {/* 4. DAMAGE NUMBERS TOGGLE */}
                    {def.id === 'damageNumbers' && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-zinc-400">Floating Damage Text</span>
                        <button
                          onClick={() => handleUpdate({ damageNumbers: settings.damageNumbers === false ? true : false })}
                          className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer border ${
                            settings.damageNumbers !== false 
                              ? 'bg-red-600 text-white border-red-500 shadow' 
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {settings.damageNumbers !== false ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>
                    )}

                    {/* 5. DAMAGE BAR DEGRADING TOGGLE */}
                    {def.id === 'damageBarDegradingEnabled' && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-zinc-400">Delayed Red HP Chunk</span>
                        <button
                          onClick={() => handleUpdate({ damageBarDegradingEnabled: settings.damageBarDegradingEnabled === false ? true : false })}
                          className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer border ${
                            settings.damageBarDegradingEnabled !== false 
                              ? 'bg-rose-600 text-white border-rose-500 shadow' 
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {settings.damageBarDegradingEnabled !== false ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>
                    )}

                    {/* 6. LOW STAMINA WARNING */}
                    {def.id === 'staminaWarning' && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-zinc-400">Critical Exhaustion Pulse</span>
                        <button
                          onClick={() => handleUpdate({ staminaWarning: settings.staminaWarning === false ? true : false })}
                          className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer border ${
                            settings.staminaWarning !== false 
                              ? 'bg-purple-600 text-white border-purple-500 shadow' 
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {settings.staminaWarning !== false ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>
                    )}

                    {/* 7. COMBO COUNTER */}
                    {def.id === 'comboCounter' && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-zinc-400">Hit Streak Grades</span>
                        <button
                          onClick={() => handleUpdate({ comboCounter: settings.comboCounter === false ? true : false })}
                          className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer border ${
                            settings.comboCounter !== false 
                              ? 'bg-amber-600 text-white border-amber-500 shadow' 
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {settings.comboCounter !== false ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>
                    )}

                    {/* 8. MASTER VOLUME SLIDER */}
                    {def.id === 'masterVolume' && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-zinc-400">Master Gain:</span>
                          <span className="font-bold text-emerald-400">{Math.round((settings.masterVolume ?? 1.0) * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1.0"
                          step="0.05"
                          value={settings.masterVolume ?? 1.0}
                          onChange={(e) => handleUpdate({ masterVolume: parseFloat(e.target.value) })}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>
                    )}

                    {/* 9. SFX VOLUME SLIDER */}
                    {def.id === 'sfxVolume' && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-zinc-400">Impact SFX:</span>
                          <span className="font-bold text-amber-400">{Math.round((settings.sfxVolume ?? 1.0) * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1.0"
                          step="0.05"
                          value={settings.sfxVolume ?? 1.0}
                          onChange={(e) => handleUpdate({ sfxVolume: parseFloat(e.target.value) })}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>
                    )}

                    {/* 10. MUSIC VOLUME SLIDER */}
                    {def.id === 'musicVolume' && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-zinc-400">BGM Beat:</span>
                          <span className="font-bold text-purple-400">{Math.round((settings.musicVolume ?? 0.8) * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1.0"
                          step="0.05"
                          value={settings.musicVolume ?? 0.8}
                          onChange={(e) => handleUpdate({ musicVolume: parseFloat(e.target.value) })}
                          className="w-full accent-purple-500 cursor-pointer"
                        />
                      </div>
                    )}

                    {/* 11. SOUND ENABLED TOGGLE */}
                    {def.id === 'soundEnabled' && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-zinc-400">Global Audio Master</span>
                        <button
                          onClick={() => handleUpdate({ soundEnabled: !settings.soundEnabled })}
                          className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer border ${
                            settings.soundEnabled 
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow' 
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {settings.soundEnabled ? 'Active' : 'Muted'}
                        </button>
                      </div>
                    )}

                    {/* 12. TOUCH CONTROL SCHEME */}
                    {def.id === 'touchControlMode' && (
                      <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                        <span className="text-zinc-400">Mode:</span>
                        <div className="flex gap-1">
                          {(['virtual', 'swipe'] as const).map(mode => (
                            <button
                              key={mode}
                              onClick={() => handleUpdate({ touchControlMode: 'virtual' })}
                              className={`px-2.5 py-1 rounded border uppercase font-bold transition cursor-pointer ${
                                (settings.touchControlMode || 'virtual') === mode
                                  ? 'bg-cyan-600 text-white border-cyan-400'
                                  : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                              }`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 13. CAMERA MODE */}
                    {def.id === 'cameraMode' && (
                      <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                        <span className="text-zinc-400">Aim:</span>
                        <div className="flex gap-1">
                          {[
                            { id: 'standard', label: 'Top-Down' },
                            { id: 'lockon_swipe', label: 'Lock-On Swipe' }
                          ].map(mode => (
                            <button
                              key={mode.id}
                              onClick={() => handleUpdate({ cameraMode: mode.id as any })}
                              className={`px-2 py-1 rounded border uppercase font-bold text-[9px] transition cursor-pointer ${
                                (settings.cameraMode || 'standard') === mode.id
                                  ? 'bg-cyan-600 text-white border-cyan-400'
                                  : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                              }`}
                            >
                              {mode.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 14. SWIPE SENSITIVITY */}
                    {def.id === 'cameraSensitivity' && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-zinc-400">Swipe Aim:</span>
                          <span className="font-bold text-cyan-400">{(settings.cameraSensitivity ?? 1.0).toFixed(1)}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.2"
                          max="3.0"
                          step="0.1"
                          value={settings.cameraSensitivity ?? 1.0}
                          onChange={(e) => handleUpdate({ cameraSensitivity: parseFloat(e.target.value) })}
                          className="w-full accent-cyan-500 cursor-pointer"
                        />
                      </div>
                    )}

                    {/* 15. HAPTICS VIBRATION */}
                    {def.id === 'hapticsEnabled' && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-zinc-400">Tactile Feedback</span>
                        <button
                          onClick={() => handleUpdate({ hapticsEnabled: settings.hapticsEnabled === false ? true : false })}
                          className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer border ${
                            settings.hapticsEnabled !== false 
                              ? 'bg-purple-600 text-white border-purple-500 shadow' 
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {settings.hapticsEnabled !== false ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>
                    )}

                    {/* 16. CURSOR TYPE */}
                    {def.id === 'cursorType' && (
                      <div className="grid grid-cols-5 gap-1 text-[9px] font-mono">
                        {(['crosshair', 'dot', 'circle', 'minimal', 'diamond'] as const).map(c => (
                          <button
                            key={c}
                            onClick={() => handleUpdate({ cursorType: c })}
                            className={`py-1 rounded border uppercase font-bold text-center transition cursor-pointer ${
                              (settings.cursorType || 'crosshair') === c
                                ? 'bg-cyan-600 text-white border-cyan-400'
                                : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* 17. PARTICLE DENSITY */}
                    {def.id === 'particleDensity' && (
                      <div className="grid grid-cols-4 gap-1 text-[9px] font-mono">
                        {(['low', 'medium', 'high', 'ultra'] as const).map(d => (
                          <button
                            key={d}
                            onClick={() => handleUpdate({ particleDensity: d })}
                            className={`py-1 rounded border uppercase font-bold text-center transition cursor-pointer ${
                              (settings.particleDensity || 'high') === d
                                ? 'bg-red-600 text-white border-red-500'
                                : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* 18. LOW GRAPHICS MODE */}
                    {def.id === 'lowGraphicsMode' && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-zinc-400">Boost Engine FPS</span>
                        <button
                          onClick={() => handleUpdate({ lowGraphicsMode: !settings.lowGraphicsMode })}
                          className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer border ${
                            settings.lowGraphicsMode 
                              ? 'bg-yellow-600 text-white border-yellow-500 shadow' 
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {settings.lowGraphicsMode ? 'Active (Low FX)' : 'Off (Full FX)'}
                        </button>
                      </div>
                    )}

                    {/* 19. DISABLE AURA VFX */}
                    {def.id === 'disableAuraVfx' && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-zinc-400">Aura Particles</span>
                        <button
                          onClick={() => handleUpdate({ disableAuraVfx: !settings.disableAuraVfx })}
                          className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer border ${
                            settings.disableAuraVfx 
                              ? 'bg-zinc-800 text-zinc-400 border-zinc-700' 
                              : 'bg-amber-600 text-white border-amber-500 shadow'
                          }`}
                        >
                          {settings.disableAuraVfx ? 'Disabled' : 'Enabled'}
                        </button>
                      </div>
                    )}

                    {/* 20. ARENA THEME */}
                    {def.id === 'arenaTheme' && (
                      <div className="grid grid-cols-2 gap-1 text-[9px] font-mono">
                        {[
                          { id: 'classic_cage', label: 'Classic Cage' },
                          { id: 'neon_underground', label: 'Neon Cyber' },
                          { id: 'tokyo_dojo', label: 'Tokyo Dojo' },
                          { id: 'championship', label: 'Championship' }
                        ].map(theme => (
                          <button
                            key={theme.id}
                            onClick={() => handleUpdate({ arenaTheme: theme.id as any })}
                            className={`py-1 px-1.5 rounded border uppercase font-bold text-center truncate transition cursor-pointer ${
                              (settings.arenaTheme || 'classic_cage') === theme.id
                                ? 'bg-red-600 text-white border-red-500'
                                : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                            }`}
                          >
                            {theme.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* 21. MOBILE FOV */}
                    {def.id === 'mobileFov' && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-zinc-400">Elevation:</span>
                          <span className="font-bold text-cyan-400">{(settings.mobileFov ?? 1.3).toFixed(1)}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.8"
                          max="1.8"
                          step="0.05"
                          value={settings.mobileFov ?? 1.3}
                          onChange={(e) => handleUpdate({ mobileFov: parseFloat(e.target.value) })}
                          className="w-full accent-cyan-500 cursor-pointer"
                        />
                      </div>
                    )}

                    {/* 22. LOCK FOV */}
                    {def.id === 'lockFov' && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-zinc-400">Static Camera Elevation</span>
                        <button
                          onClick={() => handleUpdate({ lockFov: !settings.lockFov })}
                          className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer border ${
                            settings.lockFov 
                              ? 'bg-cyan-600 text-white border-cyan-400 shadow' 
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {settings.lockFov ? 'Locked' : 'Dynamic'}
                        </button>
                      </div>
                    )}

                    {/* 23. PINCH TO ZOOM */}
                    {def.id === 'pinchToZoomEnabled' && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-zinc-400">Touch Gesture Zoom</span>
                        <button
                          onClick={() => handleUpdate({ pinchToZoomEnabled: settings.pinchToZoomEnabled === false ? true : false })}
                          className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer border ${
                            settings.pinchToZoomEnabled !== false 
                              ? 'bg-cyan-600 text-white border-cyan-400 shadow' 
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {settings.pinchToZoomEnabled !== false ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>
                    )}

                    {/* 24. HUD SCALE */}
                    {def.id === 'hudScale' && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-zinc-400">Card Scale:</span>
                          <span className="font-bold text-blue-400">{Math.round((settings.hudScale ?? 0.85) * 100)}%</span>
                        </div>
                        <div className="grid grid-cols-5 gap-1 text-[9px] font-mono">
                          {[0.5, 0.65, 0.85, 1.0, 1.2].map(scale => (
                            <button
                              key={scale}
                              onClick={() => handleUpdate({ hudScale: scale })}
                              className={`py-1 rounded border uppercase font-bold transition cursor-pointer ${
                                Math.abs((settings.hudScale ?? 0.85) - scale) < 0.05
                                  ? 'bg-blue-600 text-white border-blue-400'
                                  : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                              }`}
                            >
                              {Math.round(scale * 100)}%
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 25. HUD OPACITY */}
                    {def.id === 'hudOpacity' && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-zinc-400">Alpha Opacity:</span>
                          <span className="font-bold text-amber-400">{Math.round((settings.hudOpacity ?? 0.85) * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.3"
                          max="1.0"
                          step="0.05"
                          value={settings.hudOpacity ?? 0.85}
                          onChange={(e) => handleUpdate({ hudOpacity: parseFloat(e.target.value) })}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>
                    )}

                    {/* 26. SHOW FPS & NETCODE */}
                    {def.id === 'showFps' && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-zinc-400">Live Diagnostic Monitor</span>
                        <button
                          onClick={() => handleUpdate({ showFps: !settings.showFps })}
                          className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer border ${
                            settings.showFps 
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow' 
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {settings.showFps ? 'Showing' : 'Hidden'}
                        </button>
                      </div>
                    )}

                    {/* 27. TARGET FPS */}
                    {def.id === 'targetFps' && (
                      <div className="grid grid-cols-3 gap-1 text-[9px] font-mono">
                        {[
                          { id: '30', label: '30 FPS' },
                          { id: '60', label: '60 FPS' },
                          { id: 'uncapped', label: 'Uncapped' }
                        ].map(rate => (
                          <button
                            key={rate.id}
                            onClick={() => handleUpdate({ targetFps: rate.id as any })}
                            className={`py-1 rounded border uppercase font-bold text-center transition cursor-pointer ${
                              (settings.targetFps || '60') === rate.id
                                ? 'bg-cyan-600 text-white border-cyan-400'
                                : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                            }`}
                          >
                            {rate.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* 28. RENDER RESOLUTION SCALE */}
                    {def.id === 'renderResolutionScale' && (
                      <div className="grid grid-cols-4 gap-1 text-[9px] font-mono">
                        {[0.6, 0.75, 0.85, 1.0].map(scale => (
                          <button
                            key={scale}
                            onClick={() => handleUpdate({ renderResolutionScale: scale as any })}
                            className={`py-1 rounded border uppercase font-bold text-center transition cursor-pointer ${
                              (settings.renderResolutionScale || 1.0) === scale
                                ? 'bg-cyan-600 text-white border-cyan-400'
                                : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                            }`}
                          >
                            {Math.round(scale * 100)}%
                          </button>
                        ))}
                      </div>
                    )}

                    {/* 29. TOUCH THROTTLING */}
                    {def.id === 'touchThrottling' && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-zinc-400">Coalesce Touch</span>
                        <button
                          onClick={() => handleUpdate({ touchThrottling: !settings.touchThrottling })}
                          className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer border ${
                            settings.touchThrottling 
                              ? 'bg-purple-600 text-white border-purple-500 shadow' 
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {settings.touchThrottling ? 'Active' : 'Off'}
                        </button>
                      </div>
                    )}

                    {/* 30. CLOUD SYNC */}
                    {def.id === 'cloudSync' && (
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-zinc-400">Storage State:</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Synced & Active
                        </span>
                      </div>
                    )}

                    {/* 31. RESET PROGRESS */}
                    {def.id === 'resetProgress' && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-zinc-400">Factory Config</span>
                        <button
                          onClick={() => setShowResetConfirm(true)}
                          className="px-2.5 py-1 bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-300 hover:text-white rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer"
                        >
                          Reset Defaults
                        </button>
                      </div>
                    )}
                  </div>

                  {/* BOTTOM: "RELATED TO" SYSTEM BADGES */}
                  <div className="pt-1.5 border-t border-zinc-800/40 flex items-center gap-1 flex-wrap">
                    <span className="text-[7.5px] font-mono text-cyan-400 uppercase font-bold flex items-center gap-0.5">
                      <Sparkles className="w-2 h-2 text-amber-400" />
                      Related:
                    </span>
                    {def.relatedTo.map((rel) => (
                      <button
                        key={rel}
                        onClick={() => handleSelectRelated(rel)}
                        className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-zinc-950/80 hover:bg-cyan-950/60 border border-zinc-800 hover:border-cyan-500/50 text-zinc-400 hover:text-cyan-200 transition cursor-pointer truncate max-w-[150px]"
                        title={`Click to view setting: ${rel}`}
                      >
                        {rel}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ============================================================== */}
          {/* 4. "RELATED SETTINGS" RECOMMENDED DISCOVERY SECTION           */}
          {/* ============================================================== */}
          {searchQuery && relatedSettingsMap.length > 0 && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-zinc-900/90 via-zinc-950 to-zinc-900/90 border border-cyan-500/30 space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-display font-black uppercase text-white tracking-wide">
                    RELATED SETTINGS YOU MAY WANT TO TWEAK
                  </h3>
                </div>
                <span className="text-[9px] font-mono text-cyan-400 uppercase">
                  Connected to &ldquo;{searchQuery}&rdquo;
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {relatedSettingsMap.map((relDef) => {
                  const RelIcon = relDef.icon;
                  return (
                    <div 
                      key={`rel-${relDef.id}`}
                      onClick={() => handleSelectRelated(relDef.title)}
                      className="p-2.5 rounded-xl bg-zinc-900/70 hover:bg-zinc-850 border border-zinc-800 hover:border-cyan-500/50 transition cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-cyan-400 shrink-0">
                          <RelIcon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h5 className="text-[11px] font-display font-bold uppercase text-zinc-200 group-hover:text-white truncate">
                            {relDef.title}
                          </h5>
                          <span className="text-[8px] font-mono text-zinc-500 uppercase">
                            {relDef.category}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. FOOTER STATUS BAR WITH RESPONSIVE SHORTCUT HINTS            */}
      {/* ============================================================== */}
      <div className="px-4 py-2 border-t border-zinc-850 bg-zinc-950 text-[10px] font-mono text-zinc-400 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-zinc-300 font-bold uppercase">
            {isLandscape ? 'DYNAMIC LANDSCAPE SCALING ACTIVE' : 'PORTRAIT RESPONSIVE FLOW ACTIVE'}
          </span>
        </div>
        <div className="flex items-center gap-3 text-zinc-500 text-[9px]">
          <span className="hidden sm:inline">Press [/] or Ctrl+K to Search</span>
          <span>Press ESC or Tap Stasis Exit to Return</span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 6. RESET CONFIRMATION MODAL                                    */}
      {/* ============================================================== */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-zinc-900 border border-red-500/50 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-display font-black text-sm uppercase text-white">Restore Factory Settings?</h3>
            </div>
            <p className="text-xs text-zinc-400 font-sans leading-relaxed">
              This will restore all combat physics, audio volumes, camera FOV, and performance settings to default values.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-mono font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowResetConfirm(false);
                  onRequestResetProgress?.();
                  handleUpdate({
                    screenShake: 1.0,
                    hitstopEffect: true,
                    autoTargetAssist: true,
                    damageNumbers: true,
                    damageBarDegradingEnabled: true,
                    staminaWarning: true,
                    comboCounter: true,
                    masterVolume: 1.0,
                    sfxVolume: 1.0,
                    musicVolume: 0.8,
                    soundEnabled: true,
                    mobileFov: 1.3,
                    hudScale: 0.85,
                    hudOpacity: 0.85,
                    particleDensity: 'high',
                    showFps: false,
                  });
                  soundManager.playKO?.();
                }}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-mono font-bold uppercase transition cursor-pointer shadow"
              >
                Reset Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Fallback Icon component if needed
function CrosshairIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="22" y1="12" x2="18" y2="12" />
      <line x1="6" y1="12" x2="2" y2="12" />
      <line x1="12" y1="6" x2="12" y2="2" />
      <line x1="12" y1="22" x2="12" y2="18" />
    </svg>
  );
}
