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

interface MainMenuDashboardProps {
  stats: PlayerStats;
  updateStats: (newStats: Partial<PlayerStats>) => void;
  settings: GameSettings;
  updateSettings: (newSettings: Partial<GameSettings>) => void;
  onNavigate: (screen: GameScreen, tab?: 'vs_ai' | 'gacha' | 'spin' | 'genetics' | 'showcase' | 'history') => void;
  version: string;
  currentUser: any;
  onLogout: () => void;
  onUpdateUserSession?: (updates: Partial<UserSession>) => void;
  isNavHidden?: boolean;
  isNavExpanded?: boolean;
}

/* DYNAMIC BACKGROUND CANVAS: WHITE, BLACK AND RED CIRCLES MOVING FROM LEFT AND RIGHT */
const ParticleCanvas: React.FC = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
      type: 'red' | 'white' | 'black';
    }

    const particleCount = Math.min(Math.max(Math.floor(cssWidth / 14), 45), 110);
    const particles: Particle[] = [];

    const createParticle = (index: number, initialX?: number): Particle => {
      const rand = Math.random();
      const direction: 'left-to-right' | 'right-to-left' = index % 2 === 0 ? 'left-to-right' : 'right-to-left';
      const dirMultiplier = direction === 'left-to-right' ? 1 : -1;

      let type: 'red' | 'white' | 'black';
      let color: string;
      let strokeColor: string | undefined;
      let glowColor: string | undefined;
      let radius: number;
      let speedX: number;
      let baseAlpha: number;

      if (rand < 0.4) {
        // Red Particle
        type = 'red';
        color = 'rgba(239, 68, 68, 0.9)';
        strokeColor = 'rgba(248, 113, 113, 0.95)';
        glowColor = 'rgba(239, 68, 68, 0.45)';
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
        // Black Particle (Dark fill with crisp glowing white or red border)
        type = 'black';
        color = 'rgba(10, 10, 14, 0.98)';
        const borderIsRed = Math.random() > 0.5;
        strokeColor = borderIsRed ? 'rgba(239, 68, 68, 0.95)' : 'rgba(255, 255, 255, 0.9)';
        glowColor = borderIsRed ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.25)';
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
      };
    };

    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle(i));
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);

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

        if (p.glowColor) {
          ctx.shadowBlur = p.radius * 2;
          ctx.shadowColor = p.glowColor;
        }

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        if (p.strokeColor) {
          ctx.lineWidth = 1.4;
          ctx.strokeStyle = p.strokeColor;
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

export const MainMenuDashboard: React.FC<MainMenuDashboardProps> = ({
  stats,
  updateStats,
  settings,
  updateSettings,
  onNavigate,
  version,
  currentUser,
  onLogout,
  onUpdateUserSession,
  isNavHidden = false,
  isNavExpanded = false,
}) => {
  const [activeModal, setActiveModal] = useState<MainMenuModalType>(null);
  
  // Sync with websocket connection
  useEffect(() => {
    wsService.connect(currentUser, stats);
  }, [currentUser, stats]);

  const handleLaunchPracticeDojo = useCallback((matchData: MatchData) => {
    setActiveModal(null);
    onNavigate('ARENA');
  }, [onNavigate]);

  return (
    <div 
      id="main-menu-dashboard"
      className={`relative w-full h-full max-h-screen bg-zinc-950 text-white flex flex-col justify-center items-center overflow-hidden select-none transition-all duration-200 ${
        isNavHidden ? 'pl-0' : 'pl-14 sm:pl-16'
      }`}
    >
      {/* 1. DYNAMIC BACKGROUND PARTICLES (WHITE, BLACK, AND RED MOVING FROM LEFT AND RIGHT) */}
      <ParticleCanvas />

      {/* 2. EXACT CENTER: ANIMATED CAGE BRAWL TEXT MOVING WITH WHITE AND RED */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center px-4 w-full max-w-4xl mx-auto my-auto select-none pointer-events-none">
        
        {/* Animated CAGE BRAWL Title with white and red color motion */}
        <div className="relative flex flex-col items-center justify-center animate-bounce-subtle">
          
          {/* Ambient Glow Background Pulse */}
          <div className="absolute -inset-8 bg-red-600/15 rounded-full blur-3xl animate-pulse pointer-events-none" />

          {/* Main Title Heading with white and red animated gradient motion */}
          <h1 
            className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-display font-black italic uppercase tracking-wider text-transparent bg-clip-text drop-shadow-[0_0_35px_rgba(239,68,68,0.7)] transition-all duration-300 select-none animate-color-shift"
            style={{
              backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #fca5a5 25%, #ef4444 50%, #dc2626 75%, #ffffff 100%)',
              backgroundSize: '250% 250%',
            }}
          >
            CAGE BRAWL
          </h1>
        </div>
      </main>

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
    </div>
  );
};
