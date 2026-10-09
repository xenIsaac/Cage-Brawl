import React from 'react';
import { 
  Swords, Zap, TrendingUp, Flame, Shield, Target, 
  Sparkles, CheckCircle2, Award, Compass, Keyboard,
  ArrowRight, ShieldAlert, Cpu, BookOpen, Layers, Check, AlertTriangle, Clock
} from 'lucide-react';
import { FightingStyle } from '../../types';
import { CODEX_INTEL } from '../../data/codexData';
import { STYLE_CLASSIFICATIONS, StyleDevStatus } from '../../data/styleClassification';
import { soundManager } from '../SoundManager';
import { CodexSidebar } from './CodexSidebar';
import { CodexIdentificationView } from './CodexIdentificationView';
import { CodexMoveSpecsView } from './CodexMoveSpecsView';
import { CodexPassivesView } from './CodexPassivesView';
import { CodexStatsMatrix } from './CodexStatsMatrix';
import { CodexTacticsView } from './CodexTacticsView';
import { CodexUniversalRulesView } from './CodexUniversalRulesView';

export type CodexTab = 'identification' | 'moves' | 'passive' | 'stats' | 'tactics';

interface CodexPcViewProps {
  styles: FightingStyle[];
  selectedStyleId: string;
  selectedStyle?: FightingStyle;
  equippedStyleId?: string;
  activeTab: CodexTab;
  onSelectStyle: (id: string) => void;
  onTabChange: (tab: CodexTab) => void;
  isInsideArena?: boolean;
}

export const CodexPcView: React.FC<CodexPcViewProps> = ({
  styles,
  selectedStyleId,
  selectedStyle,
  equippedStyleId,
  activeTab,
  onSelectStyle,
  onTabChange,
  isInsideArena,
}) => {
  const isUniversalSelected = selectedStyleId === 'universal_rules';
  const currentIntel = selectedStyle ? CODEX_INTEL[selectedStyle.id] : null;
  const classification = selectedStyle ? STYLE_CLASSIFICATIONS[selectedStyle.id] : null;
  const isEquipped = selectedStyle && equippedStyleId === selectedStyle.id;

  const getStatusBadge = (status?: StyleDevStatus) => {
    if (!status) return null;
    switch (status) {
      case 'Current (Reworked)':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/50">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
            Current (Reworked)
          </span>
        );
      case 'Current':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-blue-950/80 text-blue-300 border border-blue-500/50">
            <Check className="w-2.5 h-2.5 text-blue-400" />
            Current
          </span>
        );
      case 'Under Rework':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-950/90 text-amber-300 border border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.2)]">
            <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
            ⚠️ Under Rework
          </span>
        );
      case 'Potential Rework':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-zinc-900 text-zinc-400 border border-zinc-700">
            <Clock className="w-2.5 h-2.5 text-zinc-400" />
            ⏳ Potential Rework
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-zinc-900 text-zinc-400 border border-zinc-750">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="flex-1 grid grid-cols-12 overflow-hidden min-h-0 divide-x divide-zinc-850">
      
      {/* 1. LEFT COLUMN: STYLES DIRECTORY & UNIVERSAL RULES (3 cols) */}
      <div className="col-span-3 h-full overflow-hidden bg-zinc-950/90 flex flex-col">
        <CodexSidebar
          styles={styles}
          selectedStyleId={selectedStyleId}
          onSelectStyle={onSelectStyle}
          equippedStyleId={equippedStyleId}
        />
      </div>

      {/* 2. CENTER COLUMN: PRIMARY COMBAT ENGINE & TAB WORKSPACE (6 cols if style, 9 cols if universal rules) */}
      <div className={`${isUniversalSelected ? 'col-span-9' : 'col-span-6'} h-full flex flex-col bg-zinc-950/70 overflow-hidden`}>
        
        {isUniversalSelected ? (
          /* UNIVERSAL RULES FULL WORKSPACE */
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-zinc-950/50">
            <CodexUniversalRulesView />
          </div>
        ) : selectedStyle ? (
          <>
            {/* Style Hero Spotlight Banner */}
            <div className="px-5 py-3.5 border-b border-zinc-850 bg-gradient-to-r from-zinc-900/90 via-zinc-950 to-zinc-900/50 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className="w-11 h-11 rounded-2xl border-2 border-white/30 shrink-0 shadow-lg flex items-center justify-center font-display font-black text-lg text-white"
                  style={{ backgroundColor: selectedStyle.color || '#333' }}
                >
                  {selectedStyle.name.charAt(0)}
                </div>
                
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-display font-black uppercase text-white tracking-tight truncate">
                      {selectedStyle.name}
                    </h2>
                    
                    {/* Official Taxonomy Classification Tags (Replaces outdated rarity) */}
                    {classification && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md bg-zinc-900 text-amber-300 border border-zinc-750 uppercase">
                          {classification.class} • {classification.classCategory}
                        </span>
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md bg-zinc-900 text-cyan-300 border border-zinc-750 uppercase">
                          {classification.specialty}
                        </span>
                        {getStatusBadge(classification.status)}
                      </div>
                    )}

                    {isEquipped && (
                      <span className="text-[8px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        CURRENTLY EQUIPPED
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-400 font-sans line-clamp-1 mt-0.5">
                    {classification?.tacticalIdentity || currentIntel?.combatPhilosophy || selectedStyle.description}
                  </p>
                </div>
              </div>

              {/* Archetype / Difficulty Badges */}
              {currentIntel && (
                <div className="hidden xl:flex items-center gap-2 font-mono text-[10px] shrink-0">
                  <span className="px-2.5 py-1 rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-800 font-bold">
                    {currentIntel.archetype}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-zinc-900 text-amber-400 border border-zinc-800 font-bold">
                    {currentIntel.difficulty}
                  </span>
                </div>
              )}
            </div>

            {/* Tactical Tab Navigation Bar with Keyboard Shortcuts */}
            <div className="px-5 py-2 border-b border-zinc-850 bg-zinc-950 flex items-center gap-2 shrink-0 overflow-x-auto scrollbar-none">
              <button
                onClick={() => onTabChange('identification')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition border cursor-pointer shrink-0 ${
                  activeTab === 'identification'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                    : 'bg-zinc-900/60 text-zinc-400 border-zinc-850 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>1. Identification</span>
                <span className="text-[9px] font-mono opacity-50 ml-0.5">[1]</span>
              </button>

              <button
                onClick={() => onTabChange('moves')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition border cursor-pointer shrink-0 ${
                  activeTab === 'moves'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                    : 'bg-zinc-900/60 text-zinc-400 border-zinc-850 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Swords className="w-3.5 h-3.5" />
                <span>2. Moves & Frames</span>
                <span className="text-[9px] font-mono opacity-50 ml-0.5">[2]</span>
              </button>

              <button
                onClick={() => onTabChange('passive')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition border cursor-pointer shrink-0 ${
                  activeTab === 'passive'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                    : 'bg-zinc-900/60 text-zinc-400 border-zinc-850 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>3. Passives</span>
                <span className="text-[9px] font-mono opacity-50 ml-0.5">[3]</span>
              </button>

              <button
                onClick={() => onTabChange('stats')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition border cursor-pointer shrink-0 ${
                  activeTab === 'stats'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                    : 'bg-zinc-900/60 text-zinc-400 border-zinc-850 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>4. Stats Dynamics</span>
                <span className="text-[9px] font-mono opacity-50 ml-0.5">[4]</span>
              </button>

              <button
                onClick={() => onTabChange('tactics')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition border cursor-pointer shrink-0 ${
                  activeTab === 'tactics'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                    : 'bg-zinc-900/60 text-zinc-400 border-zinc-850 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>5. Tactics</span>
                <span className="text-[9px] font-mono opacity-50 ml-0.5">[5]</span>
              </button>
            </div>

            {/* Primary Content Viewport */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar min-h-0 bg-zinc-950/40">
              {activeTab === 'identification' && (
                <CodexIdentificationView 
                  style={selectedStyle} 
                  onSelectStyle={onSelectStyle}
                  equippedStyleId={equippedStyleId}
                />
              )}
              {activeTab === 'moves' && <CodexMoveSpecsView style={selectedStyle} />}
              {activeTab === 'passive' && <CodexPassivesView style={selectedStyle} />}
              {activeTab === 'stats' && <CodexStatsMatrix style={selectedStyle} />}
              {activeTab === 'tactics' && <CodexTacticsView style={selectedStyle} />}
            </div>
          </>
        ) : null}
      </div>

      {/* 3. RIGHT COLUMN: TACTICAL HUD INTEL (3 cols - hidden when universal rules active) */}
      {!isUniversalSelected && selectedStyle && (
        <div className="col-span-3 h-full flex flex-col bg-zinc-950/90 overflow-y-auto p-4 space-y-4 custom-scrollbar min-h-0">
          
          {/* OFFICIAL CLASSIFICATION MATRIX BREAKDOWN */}
          {classification && (
            <div className="p-3.5 bg-zinc-900/80 rounded-2xl border border-zinc-850 space-y-2.5">
              <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Style Classification</span>
                </span>
                {getStatusBadge(classification.status)}
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800/80">
                  <span className="text-zinc-500 block text-[9px]">CLASS</span>
                  <span className="text-xs font-bold text-amber-300">{classification.class}</span>
                </div>
                <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800/80">
                  <span className="text-zinc-500 block text-[9px]">CATEGORY</span>
                  <span className="text-xs font-bold text-emerald-300">{classification.classCategory}</span>
                </div>
                <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800/80">
                  <span className="text-zinc-500 block text-[9px]">SPECIALTY</span>
                  <span className="text-xs font-bold text-blue-300">{classification.specialty}</span>
                </div>
                <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800/80">
                  <span className="text-zinc-500 block text-[9px]">PLAYSTYLE</span>
                  <span className="text-xs font-bold text-sky-300">{classification.playstyle}</span>
                </div>
                <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800/80 col-span-2">
                  <span className="text-zinc-500 block text-[9px]">COMBAT ORIGIN</span>
                  <span className="text-xs font-bold text-purple-300">{classification.type}</span>
                </div>
              </div>
            </div>
          )}

          {/* COMBAT ARCHETYPE INTEL */}
          {currentIntel && (
            <div className="p-3.5 bg-zinc-900/80 rounded-2xl border border-zinc-850 space-y-2.5">
              <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-amber-400" />
                  <span>Combat Archetype</span>
                </span>
                <span className="text-xs font-mono font-bold text-amber-300">
                  {currentIntel.archetype}
                </span>
              </div>

              <div className="space-y-1.5 text-[11px] text-zinc-300">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-zinc-400">Execution Difficulty:</span>
                  <span className="text-amber-400 font-bold">{currentIntel.difficulty}</span>
                </div>
                <p className="text-zinc-400 text-[10px] leading-relaxed italic">
                  "{currentIntel.combatPhilosophy}"
                </p>
              </div>
            </div>
          )}

          {/* STAT MODIFIERS AT A GLANCE */}
          <div className="p-3.5 bg-zinc-900/80 rounded-2xl border border-zinc-800 space-y-2.5">
            <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block border-b border-zinc-850 pb-1.5">
              Core Multipliers
            </span>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-850">
                <span className="text-zinc-500 block text-[9px]">SPEED</span>
                <span className="text-xs font-bold text-cyan-300">
                  {(selectedStyle.statModifiers.speed * 100).toFixed(0)}%
                </span>
              </div>
              <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-850">
                <span className="text-zinc-500 block text-[9px]">POWER</span>
                <span className="text-xs font-bold text-red-400">
                  {(selectedStyle.statModifiers.power * 100).toFixed(0)}%
                </span>
              </div>
              <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-850">
                <span className="text-zinc-500 block text-[9px]">REACH</span>
                <span className="text-xs font-bold text-emerald-300">
                  {(selectedStyle.statModifiers.reach * 100).toFixed(0)}%
                </span>
              </div>
              <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-850">
                <span className="text-zinc-500 block text-[9px]">DEFENSE</span>
                <span className="text-xs font-bold text-purple-300">
                  {selectedStyle.statModifiers.defense < 1.0 
                    ? `+${Math.round((1 - selectedStyle.statModifiers.defense) * 100)}% Res` 
                    : `${Math.round(selectedStyle.statModifiers.defense * 100)}%`}
                </span>
              </div>
            </div>
          </div>

          {/* PC KEYBOARD SHORTCUTS MATRIX */}
          <div className="p-3.5 bg-zinc-900/50 rounded-2xl border border-zinc-850 space-y-2 text-[10px] font-mono">
            <div className="flex items-center gap-1.5 text-zinc-400 font-bold uppercase">
              <Keyboard className="w-3.5 h-3.5 text-purple-400" />
              <span>PC Navigation Shortcuts</span>
            </div>
            <div className="space-y-1 text-zinc-400">
              <div className="flex justify-between">
                <span>Switch Tabs:</span>
                <span className="text-zinc-200 font-bold">[1] [2] [3] [4] [5]</span>
              </div>
              <div className="flex justify-between">
                <span>Browse Styles:</span>
                <span className="text-zinc-200 font-bold">[W / S] or [↑ / ↓]</span>
              </div>
              <div className="flex justify-between">
                <span>Exit Codex:</span>
                <span className="text-red-300 font-bold">[ESC]</span>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

