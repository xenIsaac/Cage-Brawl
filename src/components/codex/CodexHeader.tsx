import React from 'react';
import { 
  BookOpen, X, Eye, EyeOff, Shield, Cpu, 
  Sparkles, Layers
} from 'lucide-react';
import { FightingStyle } from '../../types';
import { STYLE_CLASSIFICATIONS } from '../../data/styleClassification';
import { soundManager } from '../SoundManager';

interface CodexHeaderProps {
  currentStyle?: FightingStyle;
  isUniversalRulesSelected?: boolean;
  onSelectUniversalRules?: () => void;
  isEquipped?: boolean;
  isPcDevice: boolean;
  isInsideArena?: boolean;
  isDojoTransparent: boolean;
  onToggleDojoTransparent: () => void;
  onClose: () => void;
}

export const CodexHeader: React.FC<CodexHeaderProps> = ({
  currentStyle,
  isUniversalRulesSelected = false,
  onSelectUniversalRules,
  isEquipped = false,
  isPcDevice,
  isInsideArena = false,
  isDojoTransparent,
  onToggleDojoTransparent,
  onClose,
}) => {
  const classification = currentStyle ? STYLE_CLASSIFICATIONS[currentStyle.id] : null;

  return (
    <header className="px-4 sm:px-6 py-3 border-b border-zinc-850 bg-zinc-950/95 backdrop-blur-md flex items-center justify-between gap-3 shrink-0 select-none z-10">
      {/* Left: Brand / Title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-zinc-900 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
          <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-display font-black uppercase tracking-wider text-white truncate">
              MARTIAL CODEX
            </h1>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800 font-semibold shrink-0">
              ENCYCLOPEDIA
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 font-mono hidden sm:block truncate">
            {isUniversalRulesSelected 
              ? 'Universal combat physics, frame rules, and strike systems' 
              : classification 
                ? `${classification.name} • ${classification.class} (${classification.classCategory}) • ${classification.specialty} • ${classification.status}` 
                : 'Combat rules & martial style encyclopedia'}
          </p>
        </div>
      </div>

      {/* Right: Quick Controls & Close */}
      <div className="flex items-center gap-2 shrink-0">
        
        {/* DOJO BACKDROP TRANSPARENCY TOGGLE (WHEN CALLED INSIDE ARENA) */}
        {isInsideArena && (
          <button
            onClick={() => {
              onToggleDojoTransparent();
              soundManager.playRollTick?.();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition flex items-center gap-1.5 border cursor-pointer ${
              isDojoTransparent
                ? 'bg-purple-950/80 text-purple-300 border-purple-500/60 shadow-md shadow-purple-950/50'
                : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-white'
            }`}
            title="Toggle Practice Dojo background transparency"
          >
            {isDojoTransparent ? <Eye className="w-3.5 h-3.5 text-purple-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isDojoTransparent ? 'Dojo View' : 'Opaque'}</span>
          </button>
        )}

        {/* CLOSE BUTTON */}
        <button
          onClick={() => {
            soundManager.playRollTick?.();
            onClose();
          }}
          className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white border border-zinc-800 transition cursor-pointer active:scale-95"
          title="Exit Codex (ESC)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
