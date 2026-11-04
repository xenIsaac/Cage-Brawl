import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Swords, Trophy, Dices, Ruler, BookOpen, Settings, Volume2, VolumeX, 
  RotateCcw, LogOut, Shield, Zap, Flame, Sparkles, User, RefreshCcw, 
  Maximize, Minimize, X, Check, AlertTriangle, ChevronRight, Activity, Award, Target, Move, Users, Info,
  Bot, Lock, Clock, Calendar, Dna, Menu as MenuIcon, Play, HelpCircle
} from 'lucide-react';
import { PlayerStats, GameSettings, GameScreen, UserSession, MatchData } from '../../types';
import { FIGHTING_STYLES } from '../../data/styles';
import { AI_CHALLENGERS } from '../../data/aiChallengers';
import { soundManager } from '../SoundManager';
import { getRankInfo } from '../../utils/elo';
import { getHeightModifiers, formatHeight } from '../../utils/heightModifiers';
import { wsService } from '../../services/websocket';
import { QuestTracker } from '../../utils/questTracker';

// Sub-views from mainmenu folder
import { MainMenuModalType } from './types';
import { SettingsView } from './SettingsView';
import { PracticeDojoView } from './PracticeDojoView';
import { QuestsAchievementsView } from './QuestsAchievementsView';
import { AccountCenterView } from './AccountCenterView';
import { OnlinePlayersView } from './OnlinePlayersView';
import { GameInfoView } from './GameInfoView';
import { CodexView } from './CodexView';
import { UpdateLogsModal } from './UpdateLogsModal';
import { useResponsiveLayout } from '../../utils/useResponsiveLayout';

interface MainMenuDashboardProps {
  stats: PlayerStats;
  updateStats: (newStats: Partial<PlayerStats>) => void;
  settings: GameSettings;
  updateSettings: (newSettings: Partial<GameSettings>) => void;
  onNavigate: (screen: GameScreen, tab?: 'vs_ai' | 'gacha' | 'spin' | 'genetics' | 'showcase' | 'history') => void;
  onStartMatch?: (matchData: MatchData) => void;
  version: string;
  currentUser: any;
  onLogout: () => void;
  onUpdateUserSession?: (updates: Partial<UserSession>) => void;
  isNavHidden?: boolean;
  isNavExpanded?: boolean;
  onOpenTrueNavigation?: () => void;
  hasInitialLoaded?: boolean;
  onInitialLoadComplete?: () => void;
}

/* DYNAMIC BACKGROUND CANVAS: WHITE, BLACK AND DYNAMIC ACCENT CIRCLES MOVING FROM LEFT AND RIGHT */
interface ParticleCanvasProps {
  activeColor?: string;
}

const ParticleCanvas: React.FC<ParticleCanvasProps> = React.memo(({ activeColor = '#ef4444' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeColorRef = useRef(activeColor);
  activeColorRef.current = activeColor;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let cssWidth = window.innerWidth;
    let cssHeight = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const setupCanvasSize = () => {
      if (!canvas) return;
      cssWidth = window.innerWidth;
      cssHeight = window.innerHeight;
      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);
    };

    setupCanvasSize();

    const handleResize = () => {
      setupCanvasSize();
    };

    window.addEventListener('resize', handleResize);

    interface Particle {
      x: number;
      y: number;
      radius: number;
      speedX: number;
      speedY: number;
      color: string;
      strokeColor?: string;
      glowColor?: string;
      baseAlpha: number;
      direction: 'left-to-right' | 'right-to-left';
      type: 'colored' | 'white' | 'black';
      hasColoredBorder?: boolean;
    }

    const particleCount = Math.min(Math.max(Math.floor(cssWidth / 14), 45), 110);
    const particles: Particle[] = [];

    const createParticle = (index: number, initialX?: number): Particle => {
      const rand = Math.random();
      const direction: 'left-to-right' | 'right-to-left' = index % 2 === 0 ? 'left-to-right' : 'right-to-left';
      const dirMultiplier = direction === 'left-to-right' ? 1 : -1;

      let type: 'colored' | 'white' | 'black';
      let color: string;
      let strokeColor: string | undefined;
      let glowColor: string | undefined;
      let radius: number;
      let speedX: number;
      let baseAlpha: number;
      let hasColoredBorder = false;

      if (rand < 0.42) {
        // Dynamic Accent Colored Particle
        type = 'colored';
        color = activeColorRef.current || '#ef4444';
        strokeColor = '#ffffff';
        glowColor = activeColorRef.current || '#ef4444';
        radius = Math.random() * 5 + 3;
        speedX = (Math.random() * 1.5 + 0.6) * dirMultiplier;
        baseAlpha = Math.random() * 0.35 + 0.6;
      } else if (rand < 0.75) {
        // White Particle
        type = 'white';
        color = 'rgba(255, 255, 255, 0.95)';
        strokeColor = 'rgba(255, 255, 255, 0.8)';
        glowColor = 'rgba(255, 255, 255, 0.35)';
        radius = Math.random() * 4 + 2;
        speedX = (Math.random() * 1.4 + 0.5) * dirMultiplier;
        baseAlpha = Math.random() * 0.35 + 0.6;
      } else {
        // Black Particle (Dark fill with crisp glowing white or accent border)
        type = 'black';
        color = 'rgba(10, 10, 14, 0.98)';
        hasColoredBorder = Math.random() > 0.45;
        strokeColor = hasColoredBorder ? (activeColorRef.current || '#ef4444') : 'rgba(255, 255, 255, 0.9)';
        glowColor = hasColoredBorder ? (activeColorRef.current || '#ef4444') : 'rgba(255, 255, 255, 0.25)';
        radius = Math.random() * 7 + 4;
        speedX = (Math.random() * 1.8 + 0.8) * dirMultiplier;
        baseAlpha = Math.random() * 0.3 + 0.7;
      }

      return {
        x: initialX !== undefined ? initialX : Math.random() * cssWidth,
        y: Math.random() * cssHeight,
        radius,
        speedX,
        speedY: (Math.random() - 0.5) * 0.35,
        color,
        strokeColor,
        glowColor,
        baseAlpha,
        direction,
        type,
        hasColoredBorder,
      };
    };

    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle(i));
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);

      const curColor = activeColorRef.current || '#ef4444';

      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;

        // Wrap particles smoothly when going off screen
        if (p.speedX > 0 && p.x - p.radius > cssWidth) {
          p.x = -p.radius * 2;
          p.y = Math.random() * cssHeight;
        } else if (p.speedX < 0 && p.x + p.radius < 0) {
          p.x = cssWidth + p.radius * 2;
          p.y = Math.random() * cssHeight;
        }

        if (p.y < -p.radius) p.y = cssHeight + p.radius;
        if (p.y > cssHeight + p.radius) p.y = -p.radius;

        ctx.save();
        ctx.globalAlpha = p.baseAlpha;

        let fillColor = p.color;
        let strokeColor = p.strokeColor;
        let glowColor = p.glowColor;

        if (p.type === 'colored') {
          fillColor = curColor;
          strokeColor = '#ffffff';
          glowColor = curColor;
        } else if (p.type === 'black' && p.hasColoredBorder) {
          strokeColor = curColor;
          glowColor = curColor;
        }

        if (glowColor) {
          ctx.shadowBlur = p.radius * 2;
          ctx.shadowColor = glowColor;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        if (strokeColor) {
          ctx.lineWidth = 1.4;
          ctx.strokeStyle = strokeColor;
          ctx.stroke();
        }

        ctx.restore();
      });

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
      style={{ width: '100%', height: '100%' }}
    />
  );
});

// Clean up any persistent storage flags from previous builds so startup loading is never suppressed
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('cage_brawl_intro_done');
    sessionStorage.removeItem('cage_brawl_intro_done');
    delete (window as any).__CAGE_BRAWL_BOOTED;
  } catch (e) {}
}

let hasMainMenuIntroPlayed = false;

export const MainMenuDashboard: React.FC<MainMenuDashboardProps> = ({
  stats,
  updateStats,
  settings,
  updateSettings,
  onNavigate,
  onStartMatch,
  version,
  currentUser,
  onLogout,
  onUpdateUserSession,
  isNavHidden = false,
  isNavExpanded = false,
  hasInitialLoaded = false,
  onInitialLoadComplete,
}) => {
  // Only skip if already loaded in this active app session
  const isAlreadyLoaded = hasInitialLoaded || hasMainMenuIntroPlayed;

  const [activeModal, setActiveModal] = useState<MainMenuModalType>(null);
  const [showUpdateLogsModal, setShowUpdateLogsModal] = useState<boolean>(false);
  type BootPhase = 'phase1_octagon' | 'phase2_gemini' | 'phase3_loading' | 'phase4_ready' | 'transitioned';

  const [introPhase, setIntroPhase] = useState<BootPhase>(() => {
    return isAlreadyLoaded ? 'transitioned' : 'phase1_octagon';
  });
  const [phase1Fading, setPhase1Fading] = useState<boolean>(false);
  const [phase2Fading, setPhase2Fading] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [isBarSlidingOut, setIsBarSlidingOut] = useState<boolean>(false);
  const [isTitleDetonating, setIsTitleDetonating] = useState<boolean>(false);

  const [hoveredNavIndex, setHoveredNavIndex] = useState<number | null>(null);
  const { isPortrait, isLandscape, isMobile, isCompactLandscape } = useResponsiveLayout();
  
  const markIntroDone = () => {
    hasMainMenuIntroPlayed = true;
    onInitialLoadComplete?.();
  };

  // PHASE 1: Octagon Engine Splash Timeline (8.0s duration + 3.0s fade-out)
  useEffect(() => {
    if (introPhase !== 'phase1_octagon') return;
    setPhase1Fading(false);

    const fadeTimer = setTimeout(() => {
      setPhase1Fading(true);
    }, 5000);

    const nextPhaseTimer = setTimeout(() => {
      setIntroPhase('phase2_gemini');
    }, 8000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(nextPhaseTimer);
    };
  }, [introPhase]);

  // PHASE 2: Gemini Attribution Splash Timeline (6.0s duration + 3.0s fade-out)
  useEffect(() => {
    if (introPhase !== 'phase2_gemini') return;
    setPhase2Fading(false);

    const fadeTimer = setTimeout(() => {
      setPhase2Fading(true);
    }, 3000);

    const nextPhaseTimer = setTimeout(() => {
      setIntroPhase('phase3_loading');
    }, 6000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(nextPhaseTimer);
    };
  }, [introPhase]);

  // PHASE 3: Active System Loading & Title Detonation Timeline
  useEffect(() => {
    if (introPhase !== 'phase3_loading') return;
    setLoadingProgress(0);
    setIsBarSlidingOut(false);
    setIsTitleDetonating(false);

    const startTime = Date.now();
    const duration = 1800; // Real asset initialization progress

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, Math.floor((elapsed / duration) * 100));
      setLoadingProgress(progress);

      if (progress >= 100) {
        clearInterval(interval);
        // Completion Event (100% Trigger)
        setIsBarSlidingOut(true);
        setIsTitleDetonating(true);
        soundManager.playKO?.();

        setTimeout(() => {
          setIsTitleDetonating(false);
          setIntroPhase('phase4_ready');
        }, 650);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [introPhase]);

  // Immediate System Connection
  useEffect(() => {
    if (introPhase === 'phase4_ready' || introPhase === 'phase3_loading') {
      try {
        wsService.connect(currentUser, stats);
        QuestTracker.getProgress(stats);
      } catch (e) {}
    }
  }, [currentUser, stats, introPhase]);

  const handleLaunchPracticeDojo = useCallback((matchData: MatchData) => {
    setActiveModal(null);
    if (onStartMatch) {
      onStartMatch(matchData);
    } else {
      onNavigate('ARENA');
    }
  }, [onStartMatch, onNavigate]);

  const userName = currentUser?.fighterName || 'Fighter';

  const activeStyle = FIGHTING_STYLES.find(s => s.id === stats.selectedStyleId) || FIGHTING_STYLES[0];
  const rankInfo = getRankInfo(stats.elo || 0);

  // Navigation Items with authentic Persona typography, icons, and categories
  const NAV_ITEMS = [
    { 
      id: 'singleplayer', 
      index: '01', 
      label: 'Singleplayer', 
      subtitle: 'RANKED AI & TOURNAMENT', 
      desc: 'Ranked AI 1v1 ladder with reactive bots, 8-Man brackets & boss raids.',
      icon: Swords, 
      color: '#ef4444', 
      action: () => onNavigate('AI_MATCH') 
    },
    { 
      id: 'ranked', 
      index: '02', 
      label: 'Ranked 1v1', 
      subtitle: 'LIVE PVP OCTAGON', 
      desc: 'Real-time WebSocket competitive ladder. Climb divisions and win cash.',
      icon: Trophy, 
      color: '#fbbf24', 
      action: () => onNavigate('MATCHMAKING') 
    },
    { 
      id: 'crates', 
      index: '03', 
      label: 'Crates', 
      subtitle: 'STYLE GACHA & VAULT', 
      desc: 'Instant unboxing, key fusion, 5-hour wishlist and 14 style unlocks.',
      icon: Dices, 
      color: '#c084fc', 
      action: () => onNavigate('ROLLING', 'crates') 
    },
    { 
      id: 'dojo', 
      index: '04', 
      label: 'Practice Dojo', 
      subtitle: 'SPARRING & MATRIX', 
      desc: 'Sandbox combat dummy, frame data visualizer, and slow-mo matrix replay.',
      icon: Zap, 
      color: '#34d399', 
      action: () => setActiveModal('practice_dojo') 
    },
    { 
      id: 'codex', 
      index: '05', 
      label: 'Codex', 
      subtitle: 'FRAME DATA & COMBOS', 
      desc: 'Detailed breakdown of all 14 styles, guard frames, counters, and perks.',
      icon: BookOpen, 
      color: '#60a5fa', 
      action: () => setActiveModal('codex') 
    },
    { 
      id: 'quests', 
      index: '06', 
      label: 'Quests', 
      subtitle: 'BOUNTIES & MILESTONES', 
      desc: 'Daily combat challenges, milestone achievements, and purse bonuses.',
      icon: Award, 
      color: '#22d3ee', 
      action: () => setActiveModal('quests') 
    },
    { 
      id: 'profile', 
      index: '07', 
      label: 'Profile', 
      subtitle: 'IDENTITY & TITLES', 
      desc: 'Fighter passport, customized avatar banners, and animated title flairs.',
      icon: User, 
      color: '#e879f9', 
      action: () => setActiveModal('account') 
    },
    { 
      id: 'settings', 
      index: '08', 
      label: 'Settings', 
      subtitle: 'CONTROLS & AUDIO', 
      desc: 'Low-latency physics tuning, sound mixer, touch HUD editor & keybinds.',
      icon: Settings, 
      color: '#ffffff', 
      action: () => setActiveModal('settings') 
    },
  ];

  const [selectedNavId, setSelectedNavId] = useState<string>('singleplayer');
  const activeItem = NAV_ITEMS.find(i => i.id === selectedNavId) || NAV_ITEMS[0];
  const activeColor = activeItem.color;

  const handleNavClick = (item: typeof NAV_ITEMS[0]) => {
    soundManager.playRollTick?.();
    if (selectedNavId === item.id) {
      soundManager.playKO?.();
      item.action();
    } else {
      setSelectedNavId(item.id);
    }
  };

  return (
    <div 
      id="main-menu-dashboard"
      onScroll={(e) => { e.currentTarget.scrollLeft = 0; }}
      className="relative w-full max-w-full h-full h-[100dvh] max-h-[100dvh] bg-zinc-950 text-white flex flex-col justify-center items-center overflow-hidden overflow-x-hidden select-none transition-all duration-300"
    >
      {/* 1. DYNAMIC BACKGROUND PARTICLES */}
      <ParticleCanvas activeColor={activeColor} />

      {/* PERSONA WATERMARK ACCENTS IN BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0 opacity-10">
        <div className="absolute -top-12 -right-12 font-display font-black italic text-8xl md:text-9xl text-white tracking-tighter -skew-x-12 select-none">
          TAKE YOUR SHOT
        </div>
        <div className="absolute -bottom-8 -left-8 font-display font-black italic text-7xl md:text-9xl text-red-600 tracking-tighter -skew-x-12 select-none">
          ALL-OUT BRAWL
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 8.2 & PRE-MENU GATEWAY OVERLAY                                   */}
      {/* ========================================================================= */}
      {introPhase !== 'transitioned' && (
        <div className="fixed inset-0 z-50 bg-[#000000] overflow-hidden select-none flex flex-col items-center justify-center">

          {/* PHASE 1: OCTAGON LOGO EMBLEM SPLASH */}
          {introPhase === 'phase1_octagon' && (
            <div 
              onClick={() => setIntroPhase('phase2_gemini')}
              className={`w-full h-full flex flex-col items-center justify-center cursor-pointer transition-opacity duration-[2000ms] ${
                phase1Fading ? 'opacity-0' : 'opacity-100'
              }`}
            >
              {/* Geometric Octagon Vector Logo */}
              <div className="relative flex items-center justify-center mb-6">
                <div className="w-32 h-32 sm:w-44 sm:h-44 relative flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-red-600/20 blur-2xl animate-pulse pointer-events-none" />
                  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_35px_#ef4444] animate-pulse">
                    <polygon 
                      points="30,5 70,5 95,30 95,70 70,95 30,95 5,70 5,30" 
                      fill="none" 
                      stroke="#ef4444" 
                      strokeWidth="3.5"
                      strokeLinejoin="round"
                    />
                    <polygon 
                      points="34,11 66,11 89,34 89,66 66,89 34,89 11,66 11,34" 
                      fill="none" 
                      stroke="#ffffff" 
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                      opacity="0.8"
                    />
                    <circle cx="50" cy="50" r="14" fill="#ef4444" opacity="0.9" />
                    <polygon points="50,40 58,55 42,55" fill="#000000" />
                  </svg>
                </div>
              </div>

              {/* Sequential Typographic Drop Characters: "OCTAGON ENGINE" */}
              <div className="flex items-center gap-1.5 sm:gap-2 mt-2">
                {"OCTAGON ENGINE".split("").map((char, idx) => (
                  <span
                    key={idx}
                    className={`font-display font-black italic text-2xl sm:text-4xl md:text-5xl uppercase tracking-wider inline-block ${
                      char === " " ? "w-3 sm:w-5" : "animate-drop-weight"
                    }`}
                    style={{
                      animationDelay: `${idx * 0.12}s`,
                      color: idx < 7 ? '#ef4444' : '#ffffff'
                    }}
                  >
                    {char}
                  </span>
                ))}
              </div>

              <div className="absolute bottom-6 text-[9px] font-mono text-zinc-600 uppercase tracking-widest animate-pulse">
                TAP TO SKIP INTRO ▶
              </div>
            </div>
          )}

          {/* PHASE 2: GEMINI ATTRIBUTION SPLASH WITH ACCURATE BRAND COLORS & SHINES */}
          {introPhase === 'phase2_gemini' && (
            <div 
              onClick={() => setIntroPhase('phase3_loading')}
              className={`w-full h-full flex flex-col items-center justify-center cursor-pointer transition-opacity duration-[2000ms] ${
                phase2Fading ? 'opacity-0' : 'opacity-100'
              }`}
            >
              {/* Iconic Four-Point Gemini Star with Multi-Color Aura & Light Glints */}
              <div className="relative mb-8 flex items-center justify-center group">
                {/* Multi-layered radial glow aura */}
                <div className="absolute w-52 h-52 sm:w-72 sm:h-72 rounded-full bg-gradient-to-tr from-[#1a73e8]/30 via-[#9b51e0]/30 to-[#e91e63]/30 blur-3xl animate-pulse pointer-events-none" />
                <div className="absolute w-32 h-32 sm:w-44 sm:h-44 rounded-full bg-[#38bdf8]/20 blur-xl animate-ping pointer-events-none" style={{ animationDuration: '3s' }} />

                {/* 4-point micro glints / light flares */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#ffffff] to-transparent opacity-80 blur-[0.5px] animate-pulse" />
                  <div className="h-full w-0.5 bg-gradient-to-b from-transparent via-[#ffffff] to-transparent opacity-80 blur-[0.5px] animate-pulse" />
                </div>

                {/* Main Gemini Star SVG */}
                <div className="w-28 h-28 sm:w-40 sm:h-40 relative flex items-center justify-center z-10 drop-shadow-[0_0_30px_rgba(66,133,244,0.9)]">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <defs>
                      <linearGradient id="geminiGradientAccurate" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4285f4" />
                        <stop offset="35%" stopColor="#9b51e0" />
                        <stop offset="70%" stopColor="#e91e63" />
                        <stop offset="100%" stopColor="#38bdf8" />
                      </linearGradient>
                      <radialGradient id="geminiCenterShine" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                        <stop offset="50%" stopColor="#ffffff" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#4285f4" stopOpacity="0" />
                      </radialGradient>
                    </defs>

                    {/* Main 4-point Gemini star path */}
                    <path 
                      d="M50,5 C52,35 65,48 95,50 C65,52 52,65 50,95 C48,65 35,52 5,50 C35,48 48,35 50,5 Z" 
                      fill="url(#geminiGradientAccurate)"
                    />

                    {/* Bright core shine */}
                    <circle cx="50" cy="50" r="16" fill="url(#geminiCenterShine)" className="animate-pulse" />

                    {/* Micro sparkle center diamond */}
                    <polygon points="50,42 53,50 50,58 47,50" fill="#ffffff" opacity="0.9" />
                  </svg>
                </div>
              </div>

              {/* Made with Gemini Typography */}
              <div className="text-center space-y-1.5 z-10">
                <h2 className="text-3xl sm:text-5xl font-display font-black italic uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#4285f4] via-[#9b51e0] to-[#e91e63] tracking-widest drop-shadow-[0_0_20px_rgba(155,81,224,0.4)] -skew-x-6">
                  Made with Gemini
                </h2>
                <p className="text-[10px] sm:text-xs font-mono text-cyan-300 font-bold uppercase tracking-widest opacity-90">
                  AI STUDIO BUILD &bull; POWERED ENGINE
                </p>
              </div>

              <div className="absolute bottom-6 text-[9px] font-mono text-zinc-600 uppercase tracking-widest animate-pulse">
                TAP TO SKIP INTRO ▶
              </div>
            </div>
          )}

          {/* PHASE 3 & 4: ACTIVE SYSTEM LOADING & POST-LOADING PRE-MENU GATEWAY */}
          {(introPhase === 'phase3_loading' || introPhase === 'phase4_ready') && (
            <div className="w-full h-full bg-zinc-950 flex flex-col justify-between p-4 sm:p-8 select-none overflow-hidden relative">
              
              {/* HALFTONE BACKGROUND PATTERN */}
              <div className="absolute inset-0 pointer-events-none opacity-20">
                <div 
                  className="w-full h-full"
                  style={{
                    backgroundImage: 'radial-gradient(circle, #ef4444 1.5px, transparent 1.5px)',
                    backgroundSize: '16px 16px'
                  }}
                />
              </div>

              {/* TOP HEADER */}
              <div className="flex items-center justify-end w-full max-w-7xl mx-auto pointer-events-none z-10">
                <div className="text-[10px] font-mono text-zinc-500 tracking-wider hidden sm:block uppercase">
                  INITIALIZING CAGE BRAWL
                </div>
              </div>

              {/* PHASE 3 VERTICAL PROGRESS BAR (THE LEFT METER) */}
              {introPhase === 'phase3_loading' && (
                <div 
                  className={`fixed left-0 top-0 bottom-0 z-30 w-3.5 bg-zinc-900 border-r border-red-600/80 shadow-[4px_0_20px_#ef4444] transition-all duration-700 ease-out ${
                    isBarSlidingOut ? 'translate-x-[100vw] opacity-0' : 'translate-x-0 opacity-100'
                  }`}
                >
                  <div 
                    className="w-full bg-gradient-to-t from-red-600 via-rose-500 to-amber-400 transition-all duration-75 ease-out shadow-[0_0_12px_#ef4444]"
                    style={{ height: `${loadingProgress}%` }}
                  />
                  <div className="absolute left-6 bottom-8 font-mono font-black text-xs sm:text-sm text-red-500 bg-black/90 border border-red-500 px-2 py-1 -skew-x-12 shadow-[2px_2px_0px_#ffffff] whitespace-nowrap">
                    INITIALIZING... {loadingProgress}%
                  </div>
                </div>
              )}

              {/* MAIN CONTENT AREA: CAGEBRAWL TITLE ON LEFT, ACTION BUTTONS SLIDING IN ON RIGHT */}
              <div className="flex-1 flex flex-col lg:flex-row items-center justify-between w-full max-w-6xl mx-auto gap-8 z-20 my-auto px-2 sm:px-6">
                
                {/* LEFT SIDE TITLE LOCK */}
                <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                  <h1 
                    className={`text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-display font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 drop-shadow-[6px_6px_0px_#000000] uppercase leading-none select-none ${
                      isTitleDetonating 
                        ? 'animate-title-detonation' 
                        : introPhase === 'phase4_ready' 
                          ? 'animate-dynamic-spot' 
                          : '-skew-x-12 scale-100'
                    }`}
                  >
                    CAGE BRAWL
                  </h1>

                  <p className="text-[10px] sm:text-xs font-mono font-bold text-zinc-400 mt-2 uppercase tracking-wider">
                    WELCOME, COMBATANT @{userName.toUpperCase()}
                  </p>
                </div>

                {/* RIGHT SIDE: PHASE 4 ACTION BUTTONS SLIDING IN FROM RIGHT */}
                <div className="flex flex-col items-center lg:items-end w-full sm:w-auto">
                  {introPhase === 'phase4_ready' && (
                    <div className="flex flex-col gap-3.5 items-center lg:items-end w-full sm:w-auto animate-slideInRight">
                      {/* 1. PLAY BRAWL BUTTON */}
                      <button
                        onClick={() => {
                          soundManager.playKO?.();
                          setIntroPhase('transitioned');
                          markIntroDone();
                        }}
                        className="w-52 sm:w-64 py-3 bg-red-600 hover:bg-white text-black font-display font-black italic text-lg sm:text-xl uppercase tracking-wider -skew-x-12 shadow-[4px_4px_0px_#ffffff] hover:shadow-[4px_4px_0px_#ef4444] active:scale-95 transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 group"
                      >
                        <Play className="w-5 h-5 fill-black text-black group-hover:scale-110 transition-transform" />
                        <span>PLAY BRAWL</span>
                      </button>

                      {/* 2. UPDATE LOGS BUTTON */}
                      <button
                        onClick={() => {
                          soundManager.playRollTick?.();
                          setShowUpdateLogsModal(true);
                        }}
                        className="w-52 sm:w-64 py-3 bg-amber-400 hover:bg-white text-black font-display font-black italic text-lg sm:text-xl uppercase tracking-wider -skew-x-12 shadow-[4px_4px_0px_#ffffff] hover:shadow-[4px_4px_0px_#f59e0b] active:scale-95 transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 group"
                      >
                        <BookOpen className="w-5 h-5 fill-black text-black group-hover:scale-110 transition-transform" />
                        <span>UPDATE LOGS</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* BOTTOM BAR: VERSION NUMBER ON BOTTOM RIGHT */}
              <div className="flex items-center justify-between w-full max-w-7xl mx-auto z-20 pt-2">
                <div className="text-[9px] font-mono text-zinc-600 hidden sm:block uppercase">
                  CAGE BRAWL SYSTEM • ALL RIGHTS RESERVED
                </div>
                <div className="ml-auto bg-black text-amber-400 font-mono font-black italic text-xs px-3 py-1 border border-zinc-800 -skew-x-12 shadow-[2px_2px_0px_#000000]">
                  {version}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. TRANSITIONED STATE: PERSONA COLLAGE OVERHAUL (DYNAMIC PORTRAIT / LANDSCAPE, NO SCROLLING) */}
      {introPhase === 'transitioned' && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="z-20 absolute inset-0 w-full max-w-full h-full pointer-events-none overflow-hidden overflow-x-hidden flex flex-col justify-between select-none"
          style={{ '--active-theme-color': activeColor } as React.CSSProperties}
        >
          {/* A. COLLAGE BACKDROP CUTOUTS & HALFTONE SLICES */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
            {/* Diagonal Comic Slash Layer dynamically colored by active button color */}
            <div 
              className="absolute -top-32 -left-20 w-[130%] h-64 -rotate-6 transform -skew-x-12 opacity-85 border-b-4 border-black transition-all duration-500 ease-out pointer-events-none"
              style={{
                backgroundColor: activeColor,
                boxShadow: `0 10px 45px ${activeColor}88`,
                backgroundImage: 'radial-gradient(circle, #000000 1.5px, transparent 1.5px)',
                backgroundSize: '12px 12px'
              }}
            />
            {/* Dynamic ambient color glow in background */}
            <div 
              className="absolute top-1/4 -left-20 w-96 h-96 rounded-full blur-[110px] opacity-25 pointer-events-none transition-all duration-700 ease-out"
              style={{ backgroundColor: activeColor }}
            />
            {/* Angled Caution Tape Ribbon with Dynamic Tag */}
            <div 
              className="absolute top-28 -right-16 w-96 h-10 rotate-12 transform -skew-x-12 border-2 border-black flex items-center justify-center font-display font-black text-black tracking-widest text-xs shadow-[4px_4px_0px_#000000] transition-colors duration-500 pointer-events-none"
              style={{ backgroundColor: activeColor === '#ffffff' ? '#fbbf24' : '#ffffff' }}
            >
              ✦ ALL-OUT BRAWL // {activeItem.label.toUpperCase()} ✦
            </div>
            {/* Bottom Dark Carbon Slab with Dynamic Accent Line */}
            <div 
              className="absolute -bottom-24 -right-12 w-[85%] h-56 bg-zinc-950/90 -rotate-3 transform -skew-x-12 border-t-4 pointer-events-none transition-colors duration-500"
              style={{ borderColor: activeColor }}
            />
            
            {/* Cutout Comic Typography Watermarks */}
            <div className="absolute bottom-6 right-8 font-display font-black italic text-7xl md:text-9xl text-white/5 tracking-tighter -skew-x-12 pointer-events-none">
              TAKE YOUR HEART
            </div>
          </div>

          {/* B. RESPONSIVE ORIENTATION CONDITIONAL: PORTRAIT (MOBILE) VS LANDSCAPE (DESKTOP / WIDE) */}
          {isPortrait ? (
            /* ======================================================== */
            /* PORTRAIT / MOBILE EXPERIENCE: NO PAGE SCROLLING, CLOSE-UP ACCORDION */
            /* ======================================================== */
            <div className="relative z-20 w-full max-w-full h-full flex flex-col justify-between p-2.5 sm:p-4 pointer-events-auto select-none overflow-hidden overflow-x-hidden box-border">
              
              {/* TOP HEADER: COMBATANT PASSPORT STRIP */}
              <div 
                className="w-full max-w-full shrink-0 flex items-center justify-between gap-2 p-2 bg-black border-2 -skew-x-6 shadow-[3px_3px_0px_#000000] transition-colors duration-300 box-border"
                style={{ borderColor: activeColor }}
              >
                <div className="flex items-center gap-2 truncate min-w-0">
                  <div 
                    className="w-7 h-7 text-black border border-white flex items-center justify-center font-black text-xs shrink-0 transition-colors duration-300"
                    style={{ backgroundColor: activeColor }}
                  >
                    <User className="w-4 h-4 text-black" />
                  </div>
                  <div className="truncate min-w-0">
                    <div className="font-display font-black italic uppercase text-white text-xs truncate leading-none">
                      {userName}
                    </div>
                    <div className="text-[8px] font-mono text-zinc-400 truncate uppercase mt-0.5">
                      {stats.selectedTitle || 'ROOKIE BRAWLER'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 text-amber-400 font-mono text-[9px] font-bold">
                    ${stats.cash.toLocaleString()}
                  </span>
                  <span 
                    className="px-1.5 py-0.5 text-black font-mono text-[9px] font-black uppercase transition-colors duration-300"
                    style={{ backgroundColor: activeColor }}
                  >
                    {stats.aiElo || 100} ELO
                  </span>
                </div>
              </div>

              {/* CENTER COLLAGE HERO CUTOUT */}
              <div className="shrink-0 my-1 flex flex-col items-center text-center relative pointer-events-none select-none max-w-full overflow-hidden">
                <div 
                  className="inline-block bg-black border font-mono font-black italic text-[9px] px-2 py-0.5 uppercase tracking-widest -skew-x-12 mb-0.5 shadow-[2px_2px_0px_#000000] transition-colors duration-300 truncate max-w-full"
                  style={{ color: activeColor, borderColor: activeColor }}
                >
                  ✦ PHANTOM PROTOCOL // {activeItem.label.toUpperCase()} ✦
                </div>
                <h1 className="text-4xl sm:text-5xl font-display font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 drop-shadow-[4px_4px_0px_#000000] uppercase leading-none select-none -skew-x-12">
                  CAGE BRAWL
                </h1>
              </div>

              {/* SCROLLABLE MENU STRIP WITH CLOSE-UP TAP ENLARGEMENT */}
              <div className="w-full max-w-full flex-1 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar px-1 py-1 gap-2 overscroll-contain box-border select-none">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isSelected = selectedNavId === item.id;
                  const isDarkText = item.color === '#ffffff' || item.color === '#fbbf24' || item.color === '#22d3ee' || item.color === '#34d399';

                  if (isSelected) {
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleNavClick(item)}
                        className="w-[calc(100%-8px)] mx-auto p-3 -skew-x-6 border-2 border-white shadow-[4px_4px_0px_#000000] cursor-pointer transition-all duration-200 animate-personaPop box-border select-none"
                        style={{ 
                          backgroundColor: item.color, 
                          color: isDarkText ? '#000000' : '#ffffff' 
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate min-w-0">
                            <span className="text-[10px] font-mono font-black px-1.5 py-0.5 bg-black text-white -skew-x-6 shrink-0">
                              //{item.index}
                            </span>
                            <Icon className="w-5 h-5 shrink-0" />
                            <span className="font-display font-black italic uppercase text-lg leading-none tracking-tight truncate">
                              {item.label}
                            </span>
                          </div>
                          <span className="text-[8px] font-mono font-black uppercase px-2 py-0.5 bg-black text-yellow-400 -skew-x-6 shrink-0">
                            CLOSE-UP FOCUS
                          </span>
                        </div>

                        {/* Briefing Description Box */}
                        <div className="mt-2 text-[10px] font-mono font-bold bg-black/20 p-2 border-l-3 border-black leading-snug break-words line-clamp-2 select-none">
                          {item.desc}
                        </div>

                        {/* Direct Confirm Launch Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            soundManager.playKO?.();
                            item.action();
                          }}
                          className="mt-2.5 w-full py-2 px-3 bg-black hover:bg-zinc-900 text-white font-display font-black text-xs uppercase tracking-wider -skew-x-6 shadow-[3px_3px_0px_#ffffff] flex items-center justify-center gap-2 active:scale-95 cursor-pointer select-none"
                        >
                          <Swords className="w-3.5 h-3.5 text-yellow-400" />
                          <span>ENTER {item.label.toUpperCase()}</span>
                          <span>▶▶</span>
                        </button>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item)}
                      className="w-[calc(100%-8px)] mx-auto relative p-2 text-left select-none transition-all duration-150 cursor-pointer active:scale-95 -skew-x-6 border-2 bg-zinc-950/90 text-zinc-300 border-zinc-850 hover:border-zinc-600 shadow-[2px_2px_0px_#000000] flex items-center justify-between gap-2 group box-border"
                    >
                      <div className="flex items-center gap-2 truncate min-w-0">
                        <span 
                          className="text-[9px] font-mono font-black px-1.5 py-0.5 -skew-x-6 shrink-0 bg-zinc-900"
                          style={{ color: item.color }}
                        >
                          //{item.index}
                        </span>
                        <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" style={{ color: item.color }} />
                        <div className="truncate min-w-0">
                          <span className="font-display font-black italic uppercase text-xs truncate leading-tight block text-white group-hover:text-zinc-100">
                            {item.label}
                          </span>
                          <span className="text-[8px] font-mono text-zinc-400 truncate uppercase block leading-none">
                            {item.subtitle}
                          </span>
                        </div>
                      </div>
                      <span className="text-[8px] font-mono text-zinc-500 font-bold shrink-0">
                        TAP TO EXPAND ▶
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* COMPACT FOOTER STATUS TICKET */}
              <div className="w-full max-w-full shrink-0 pt-2 flex items-center justify-between text-[8px] font-mono text-zinc-400 uppercase select-none">
                <span className="flex items-center gap-1 truncate">
                  <span 
                    className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
                    style={{ backgroundColor: activeColor }}
                  />
                  STYLE: <strong className="text-white truncate">{activeStyle.name}</strong>
                </span>
                <span className="shrink-0">V{version} // STASIS LOCKED</span>
              </div>

            </div>
          ) : (
            /* ======================================================== */
            /* LANDSCAPE / WIDESCREEN COLLAGE: SCROLLABLE CLOSE-UP NAVIGATION */
            /* ======================================================== */
            <div className="relative z-20 w-full max-w-full h-full flex items-center justify-between px-4 sm:px-8 md:px-12 pointer-events-auto select-none overflow-hidden overflow-x-hidden gap-4 sm:gap-6 box-border">
              
              {/* LEFT COLUMN: THE SCROLLABLE CLOSE-UP NAVIGATION COLLAGE */}
              <div className="flex-1 min-w-0 max-w-[530px] flex flex-col justify-center h-full py-2 z-30 overflow-hidden overflow-x-hidden box-border">
                {/* PROTOCOL HEADER TAG */}
                <div 
                  className="inline-flex items-center gap-2 px-3 py-1 font-display font-black italic text-[11px] uppercase tracking-wider -skew-x-12 w-fit mb-2 shadow-[3px_3px_0px_#000000] transition-colors duration-300 truncate max-w-full"
                  style={{ 
                    backgroundColor: activeColor === '#ffffff' ? '#fbbf24' : activeColor, 
                    color: '#000000' 
                  }}
                >
                  <span>▶</span>
                  <span className="truncate">OCTAGON PROTOCOL // {activeItem.label.toUpperCase()} SELECTED</span>
                </div>

                {/* SCROLLABLE LIST OF PERSONA BUTTONS WITH CLOSE-UP EXPANSION */}
                <nav className="flex flex-col gap-2.5 overflow-y-auto overflow-x-hidden max-h-[76vh] pr-4 pl-1 py-1 custom-scrollbar select-none overscroll-contain w-full max-w-full box-border">
                  {NAV_ITEMS.map((item, idx) => {
                    const isSelected = selectedNavId === item.id;
                    const isHovered = hoveredNavIndex === idx;
                    const Icon = item.icon;
                    const isDarkText = item.color === '#ffffff' || item.color === '#fbbf24' || item.color === '#22d3ee' || item.color === '#34d399';

                    if (isSelected) {
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleNavClick(item)}
                          className="relative text-left select-none -skew-x-12 border-2 border-white shadow-[5px_5px_0px_#000000] p-3 sm:p-3.5 cursor-pointer transition-all duration-200 w-[calc(100%-14px)] max-w-[calc(100%-14px)] ml-1 mr-3 scale-[1.01] animate-personaPop box-border"
                          style={{
                            backgroundColor: item.color,
                            color: isDarkText ? '#000000' : '#ffffff'
                          }}
                        >
                          <div className="flex items-center justify-between gap-2 sm:gap-3">
                            <div className="flex items-center gap-2.5 min-w-0 truncate">
                              <span className="font-mono font-black italic text-xs tracking-wider px-2 py-0.5 bg-black text-white shrink-0">
                                //{item.index}
                              </span>

                              <Icon className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />

                              <div className="min-w-0 truncate">
                                <span className="font-display font-black italic uppercase tracking-tighter block text-xl sm:text-2xl leading-none truncate">
                                  {item.label}
                                </span>
                                <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider block mt-0.5 leading-none font-bold opacity-85 truncate">
                                  {item.subtitle}
                                </span>
                              </div>
                            </div>

                            <span className="px-2 py-0.5 bg-black text-yellow-400 font-mono font-black text-[9px] sm:text-[10px] uppercase -skew-x-6 shrink-0 shadow-[2px_2px_0px_#ffffff]">
                              CLOSE-UP
                            </span>
                          </div>

                          {/* Close-Up Briefing & Tactical Summary */}
                          <div className="mt-2 p-2 bg-black/20 border-l-4 border-black text-xs font-mono font-bold leading-relaxed break-words line-clamp-2 select-none">
                            {item.desc}
                          </div>

                          {/* Quick Launch CTA Strip */}
                          <div className="mt-2.5 flex items-center justify-between gap-2 pt-1 border-t border-black/20">
                            <span className="text-[8.5px] font-mono uppercase font-black tracking-wider opacity-80 truncate">
                              TAP AGAIN OR ENTER TO LAUNCH
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                soundManager.playKO?.();
                                item.action();
                              }}
                              className="py-1 px-3.5 bg-black hover:bg-zinc-900 text-white font-display font-black italic uppercase text-xs tracking-wider -skew-x-6 shadow-[2px_2px_0px_#ffffff] transition active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0 select-none"
                            >
                              <span>ENTER {item.label.toUpperCase()}</span>
                              <span>▶▶</span>
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={item.id}
                        onMouseEnter={() => {
                          setHoveredNavIndex(idx);
                          soundManager.playRollTick?.();
                        }}
                        onMouseLeave={() => setHoveredNavIndex(null)}
                        onClick={() => handleNavClick(item)}
                        className={`group relative text-left select-none transition-all duration-150 cursor-pointer -skew-x-12 border-2 w-[calc(100%-14px)] max-w-[calc(100%-14px)] ml-1 mr-3 box-border ${
                          isHovered 
                            ? 'translate-x-1 border-white shadow-[3px_3px_0px_#ffffff] bg-black' 
                            : 'bg-black/90 text-zinc-300 border-zinc-800 hover:border-zinc-700 shadow-[2px_2px_0px_#000000]'
                        }`}
                      >
                        <div className="relative px-3 sm:px-4 py-2 flex items-center justify-between gap-2 sm:gap-3">
                          <div className="flex items-center gap-2.5 min-w-0 truncate">
                            {/* Numbered Tag */}
                            <span 
                              className="font-mono font-black italic text-xs tracking-wider px-1.5 py-0.5 transition-colors bg-zinc-900 shrink-0"
                              style={{ color: item.color }}
                            >
                              //{item.index}
                            </span>

                            <Icon 
                              className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:scale-110 shrink-0" 
                              style={{ color: item.color }}
                            />

                            {/* Label & Subtitle */}
                            <div className="min-w-0 truncate">
                              <span className="font-display font-black italic uppercase tracking-tighter block leading-none text-base sm:text-lg text-white group-hover:text-zinc-100 truncate">
                                {item.label}
                              </span>
                              <span className="text-[8px] sm:text-[9px] font-mono uppercase tracking-wider block mt-0.5 leading-none text-zinc-400 truncate">
                                {item.subtitle}
                              </span>
                            </div>
                          </div>

                          {/* Hover / Tap Hint */}
                          <span 
                            className="font-mono font-black text-xs transition-opacity shrink-0"
                            style={{ color: item.color }}
                          >
                            SELECT ▶
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* RIGHT COLUMN: HERO GRAPHIC COLLAGE & FIGHTER PASSPORT */}
              <div className="flex-1 min-w-0 max-w-[480px] flex flex-col justify-center items-center text-center h-full py-2 z-20 overflow-hidden overflow-x-hidden box-border">
                {/* HERO TITLE COLLAGE */}
                <div className="relative mb-2 flex flex-col items-center max-w-full">
                  <div 
                    className="inline-block bg-black border-2 font-mono font-black italic text-xs px-3 py-1 uppercase tracking-widest -skew-x-12 mb-1.5 shadow-[3px_3px_0px_#000000] transition-colors duration-300 truncate max-w-full"
                    style={{ color: activeColor, borderColor: activeColor }}
                  >
                    ✦ ALL-OUT BRAWL // OCTAGON SHOWDOWN ✦
                  </div>

                  <h1 className={`${
                    isCompactLandscape ? 'text-4xl lg:text-5xl' : 'text-5xl lg:text-6xl xl:text-7xl'
                  } font-display font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 drop-shadow-[5px_5px_0px_#000000] uppercase leading-none select-none animate-dynamic-spot -skew-x-12`}>
                    CAGE BRAWL
                  </h1>
                </div>

                {/* COMBATANT PASSPORT ID TICKET WITH DYNAMIC COLOR GLOW */}
                <div 
                  className="w-full max-w-md bg-black border-2 p-3 sm:p-4 -skew-x-3 relative overflow-hidden transition-all duration-300 box-border"
                  style={{
                    borderColor: activeColor,
                    boxShadow: `5px 5px 0px ${activeColor}`
                  }}
                >
                  <div className="flex items-center justify-between border-b-2 border-zinc-800 pb-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-2.5 h-2.5 transform rotate-45 transition-colors duration-300"
                        style={{ backgroundColor: activeColor }}
                      />
                      <span className="text-[10px] font-mono font-black uppercase text-white tracking-widest">
                        // COMBATANT PASSPORT
                      </span>
                    </div>
                    <span 
                      className="px-2 py-0.5 text-black font-mono text-[9px] font-black uppercase -skew-x-12 transition-colors duration-300"
                      style={{ backgroundColor: activeColor }}
                    >
                      ACTIVE
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-left">
                    <div className="min-w-0 truncate">
                      <div className="font-display font-black italic text-lg sm:text-xl text-white uppercase tracking-wider truncate">
                        {userName}
                      </div>
                      <div className="text-[9px] font-mono text-zinc-400 uppercase truncate">
                        TITLE: <strong className="text-amber-400">{stats.selectedTitle || 'ROOKIE BRAWLER'}</strong>
                      </div>
                      <div className="text-[9px] font-mono text-zinc-400 uppercase mt-0.5 truncate">
                        DISCIPLINE: <strong className="text-cyan-400">{activeStyle.name}</strong>
                      </div>
                    </div>

                    <div className="text-right space-y-1 shrink-0">
                      <div className="px-2 py-1 bg-zinc-900 border border-zinc-700 text-xs font-mono font-bold text-amber-400">
                        ${stats.cash.toLocaleString()}
                      </div>
                      <div className="text-[9px] font-mono text-zinc-400">
                        AI ELO: <strong className="text-emerald-400">{stats.aiElo || 100}</strong>
                      </div>
                    </div>
                  </div>

                  {/* ACTIVE FOCUS DESTINATION & LAUNCH BUTTON AT BOTTOM OF PASSPORT */}
                  <div 
                    onClick={() => {
                      soundManager.playKO?.();
                      activeItem.action();
                    }}
                    className="mt-3 pt-2.5 border-t border-zinc-800 flex items-center justify-between text-left gap-2 group cursor-pointer hover:bg-zinc-900/60 p-1.5 rounded transition"
                  >
                    <div className="truncate min-w-0">
                      <span className="text-[8px] font-mono text-zinc-400 uppercase block">ACTIVE DESTINATION</span>
                      <span 
                        className="font-display font-black italic text-xs sm:text-sm uppercase truncate block"
                        style={{ color: activeColor }}
                      >
                        {activeItem.label} // {activeItem.subtitle}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        soundManager.playKO?.();
                        activeItem.action();
                      }}
                      className="py-1.5 px-3.5 bg-red-600 hover:bg-white text-black font-display font-black italic text-xs uppercase -skew-x-6 shrink-0 shadow-[3px_3px_0px_#ffffff] group-hover:shadow-[3px_3px_0px_#ef4444] active:scale-95 transition-all duration-150 cursor-pointer flex items-center gap-1.5"
                    >
                      <span>LAUNCH</span>
                      <span className="text-xs">▶▶</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {/* DYNAMIC KEYFRAME FOR MOVING AROUND ON THE SAME SPOT AND PERSONA EFFECTS */}
      <style>{`
        @keyframes dynamicSpotFloat {
          0% {
            transform: translate(0px, 0px) rotate(0deg) scale(1) skewX(-12deg);
          }
          20% {
            transform: translate(14px, -12px) rotate(1.2deg) scale(1.02) skewX(-12deg);
          }
          40% {
            transform: translate(-12px, 14px) rotate(-1.5deg) scale(0.98) skewX(-12deg);
          }
          60% {
            transform: translate(16px, 10px) rotate(1deg) scale(1.03) skewX(-12deg);
          }
          80% {
            transform: translate(-14px, -8px) rotate(-1deg) scale(1.01) skewX(-12deg);
          }
          100% {
            transform: translate(0px, 0px) rotate(0deg) scale(1) skewX(-12deg);
          }
        }
        .animate-dynamic-spot {
          animation: dynamicSpotFloat 4.8s ease-in-out infinite;
          will-change: transform;
        }
        @keyframes navFadeIn {
          from {
            opacity: 0;
            transform: translateX(-24px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-navFadeIn {
          animation: navFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes personaPop {
          0% {
            opacity: 0;
            transform: scale(0.85) rotate(-3deg);
          }
          70% {
            transform: scale(1.04) rotate(1deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(-1deg);
          }
        }
        .animate-personaPop {
          animation: personaPop 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes dropWeight {
          0% {
            opacity: 0;
            transform: translateY(-90px) scale(1.4);
          }
          60% {
            opacity: 1;
            transform: translateY(12px) scale(0.95);
          }
          80% {
            transform: translateY(-4px) scale(1.02);
          }
          100% {
            opacity: 1;
            transform: translateY(0px) scale(1);
          }
        }
        .animate-drop-weight {
          animation: dropWeight 0.55s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes titleDetonation {
          0% {
            transform: scale(1) skewX(-12deg);
            filter: drop-shadow(0 0 0px transparent);
          }
          35% {
            transform: scale(1.35) skewX(-12deg);
            filter: drop-shadow(0 0 45px #ef4444) drop-shadow(0 0 75px #f59e0b);
          }
          70% {
            transform: scale(0.96) skewX(-12deg);
            filter: drop-shadow(0 0 20px #ef4444);
          }
          100% {
            transform: scale(1) skewX(-12deg);
            filter: drop-shadow(0 0 0px transparent);
          }
        }
        .animate-title-detonation {
          animation: titleDetonation 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slideInRight {
          0% {
            opacity: 0;
            transform: translateX(120px) skewX(-12deg);
          }
          100% {
            opacity: 1;
            transform: translateX(0px) skewX(-12deg);
          }
        }
        .animate-slideInRight {
          animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes stripeScroll {
          from {
            background-position: 0 0;
          }
          to {
            background-position: 28px 0;
          }
        }
        .animate-stripe-scroll {
          animation: stripeScroll 0.8s linear infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.4);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--active-theme-color, #ef4444);
          border-radius: 4px;
          border: 1px solid rgba(0, 0, 0, 0.5);
          transition: background-color 0.3s ease;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #ffffff;
        }
        #main-menu-dashboard,
        #main-menu-dashboard * {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
          -webkit-touch-callout: none !important;
        }
      `}</style>

      {/* Embedded CSS for smooth subtle floating movement and white-to-red gradient animation */}
      <style>{`
        @keyframes colorShift {
          0% {
            background-position: 0% 50%;
            filter: drop-shadow(0 0 25px rgba(255, 255, 255, 0.4)) drop-shadow(0 0 45px rgba(239, 68, 68, 0.6));
          }
          50% {
            background-position: 100% 50%;
            filter: drop-shadow(0 0 35px rgba(239, 68, 68, 0.8)) drop-shadow(0 0 60px rgba(220, 38, 38, 0.5));
          }
          100% {
            background-position: 0% 50%;
            filter: drop-shadow(0 0 25px rgba(255, 255, 255, 0.4)) drop-shadow(0 0 45px rgba(239, 68, 68, 0.6));
          }
        }
        @keyframes bounceSubtle {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-8px) scale(1.02);
          }
        }
        .animate-color-shift {
          animation: colorShift 4s ease-in-out infinite;
        }
        .animate-bounce-subtle {
          animation: bounceSubtle 5s ease-in-out infinite;
        }
      `}</style>

      {/* ========================================================= */}
      {/* 5. FULL-SCREEN SUB-VIEWS FROM MAINMENU SCRIPTS */}
      {/* ========================================================= */}

      {/* PRACTICE DOJO HUB */}
      {activeModal === 'practice_dojo' && (
        <PracticeDojoView
          stats={stats}
          updateStats={updateStats}
          onLaunchDojo={handleLaunchPracticeDojo}
          onClose={() => setActiveModal(null)}
          isNavHidden={isNavHidden}
        />
      )}

      {/* SETTINGS VIEW */}
      {activeModal === 'settings' && (
        <SettingsView
          settings={settings}
          updateSettings={updateSettings}
          onClose={() => setActiveModal(null)}
          isNavHidden={isNavHidden}
        />
      )}

      {/* QUESTS & ACHIEVEMENTS VIEW */}
      {activeModal === 'quests' && (
        <QuestsAchievementsView
          stats={stats}
          updateStats={updateStats}
          email={currentUser?.email || ''}
          onClose={() => setActiveModal(null)}
          isNavHidden={isNavHidden}
          isNavExpanded={isNavExpanded}
        />
      )}

      {/* ACCOUNT CENTER VIEW */}
      {activeModal === 'account' && (
        <AccountCenterView
          stats={stats}
          updateStats={updateStats}
          currentUser={currentUser}
          onUpdateUserSession={onUpdateUserSession || (() => {})}
          onClose={() => setActiveModal(null)}
          onLogout={onLogout}
          onOpenOnlinePlayers={() => setActiveModal('online_players')}
          isNavHidden={isNavHidden}
        />
      )}

      {/* ONLINE PLAYERS LOBBY VIEW */}
      {activeModal === 'online_players' && (
        <OnlinePlayersView
          currentUser={currentUser}
          stats={stats}
          onClose={() => setActiveModal(null)}
          onStartMatch={handleLaunchPracticeDojo}
          onStart1v1Match={() => onNavigate('MATCHMAKING')}
          isNavHidden={isNavHidden}
        />
      )}

      {/* GAME INFO & CHANGELOG VIEW */}
      {activeModal === 'game_info' && (
        <GameInfoView
          version={version}
          onClose={() => setActiveModal(null)}
          isNavHidden={isNavHidden}
        />
      )}

      {/* MARTIAL CODEX VIEW */}
      {activeModal === 'codex' && (
        <CodexView
          isOpen={true}
          onClose={() => setActiveModal(null)}
          equippedStyleId={stats.selectedStyleId || 'basic'}
          isNavHidden={isNavHidden}
          isNavExpanded={isNavExpanded}
        />
      )}

      {/* UPDATE LOGS & VERSION ARCHIVE MODAL (SECTION 8.1 & 8.2 SPECIFICATION) */}
      {showUpdateLogsModal && (
        <UpdateLogsModal
          onClose={(proceedToMenu) => {
            setShowUpdateLogsModal(false);
            if (proceedToMenu && introPhase === 'phase4_ready') {
              setIntroPhase('transitioned');
              markIntroDone();
            }
          }}
          isPreMenu={introPhase === 'phase4_ready'}
        />
      )}
    </div>
  );
};
