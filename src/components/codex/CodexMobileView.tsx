import React, { useState } from 'react';
import { 
  Swords, Zap, TrendingUp, Flame, Sparkles, 
  CheckCircle2, Menu, X, Filter, ChevronDown, ChevronRight,
  Shield, Compass, Cpu, Layers, Check, AlertTriangle, Clock
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

interface CodexMobileViewProps {
  styles: FightingStyle[];
  selectedStyleId: string;
  selectedStyle?: FightingStyle;
  equippedStyleId?: string;
  activeTab: CodexTab;
  isPortrait: boolean;
  onSelectStyle: (id: string) => void;
  onTabChange: (tab: CodexTab) => void;
  isInsideArena?: boolean;
}

export const CodexMobileView: React.FC<CodexMobileViewProps> = ({
  styles,
  selectedStyleId,
  selectedStyle,
  equippedStyleId,
  activeTab,
  isPortrait,
  onSelectStyle,
  onTabChange,
  isInsideArena,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isUniversalSelected = selectedStyleId === 'universal_rules';
  const currentIntel = selectedStyle ? CODEX_INTEL[selectedStyle.id] : null;
  const classification = selectedStyle ? STYLE_CLASSIFICATIONS[selectedStyle.id] : null;
  const isEquipped = selectedStyle && equippedStyleId === selectedStyle.id;

  const handleSelect = (id: string) => {
    onSelectStyle(id);
    setDrawerOpen(false);
    soundManager.playRollTick?.();
  };

  const getStatusBadge = (status?: StyleDevStatus) => {
    if (!status) return null;
    switch (status) {
      case 'Current (Reworked)':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[8px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/50">
            <CheckCircle2 className="w-2 h-2 text-emerald-400" />
            Reworked
          </span>
        );
      case 'Current':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[8px] font-mono font-bold bg-blue-950/80 text-blue-300 border border-blue-500/50">
            <Check className="w-2 h-2 text-blue-400" />
            Current
          </span>
        );
      case 'Under Rework':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[8px] font-mono font-bold bg-amber-950/90 text-amber-300 border border-amber-500/60">
            <AlertTriangle className="w-2 h-2 text-amber-400" />
            ⚠️ Rework
          </span>
        );
      case 'Potential Rework':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[8px] font-mono font-bold bg-zinc-900 text-zinc-400 border border-zinc-700">
            <Clock className="w-2 h-2 text-zinc-400" />
            ⏳ Roadmap
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.2 rounded-full text-[8px] font-mono font-bold bg-zinc-900 text-zinc-400 border border-zinc-750">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative select-none">
      
      {/* 1. TOP STYLE SELECTOR BAR / CAROUSEL STRIP */}
      <div className="px-3 py-2 border-b border-zinc-850 bg-zinc-950 flex items-center justify-between gap-2 shrink-0">
        
        {/* Active Style Quick Chip & Drawer Trigger */}
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white hover:bg-zinc-850 hover:border-amber-500/50 transition shrink-0 cursor-pointer active:scale-95 shadow-sm"
        >
          {isUniversalSelected ? (
            <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 bg-amber-500 text-black border border-amber-400">
              <Cpu className="w-3.5 h-3.5" />
            </div>
          ) : (
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 border border-white/40"
              style={{ backgroundColor: selectedStyle?.color || '#333' }}
            >
              {selectedStyle?.name.charAt(0) || 'S'}
            </div>
          )}
          <span className="text-xs font-display font-black uppercase whitespace-nowrap max-w-[120px] sm:max-w-[160px] truncate">
            {isUniversalSelected ? 'Universal Rules' : selectedStyle?.name || 'Select'}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-0.5" />
        </button>

        {/* Quick Style Chips Carousel (Scrollable) */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {/* Universal Rules Pill */}
          <button
            onClick={() => onSelectStyle('universal_rules')}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold uppercase shrink-0 transition flex items-center gap-1 cursor-pointer ${
              isUniversalSelected
                ? 'bg-amber-500 text-black font-black shadow-md'
                : 'bg-zinc-900 text-amber-400 border border-zinc-800'
            }`}
          >
            <Cpu className="w-3 h-3" />
            <span>Rules</span>
          </button>

          {styles.map(s => {
            const isSel = !isUniversalSelected && s.id === selectedStyle?.id;
            return (
              <button
                key={s.id}
                onClick={() => onSelectStyle(s.id)}
                className={`px-2 py-1 rounded-lg text-[9px] font-mono font-bold uppercase shrink-0 transition flex items-center gap-1 cursor-pointer ${
                  isSel
                    ? 'bg-amber-500 text-black shadow-md font-black'
                    : 'bg-zinc-900/90 text-zinc-400 border border-zinc-800'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span>{s.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. BODY CONTENT: UNIVERSAL RULES OR STYLE SPECS */}
      {isUniversalSelected ? (
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 custom-scrollbar min-h-0 bg-zinc-950/40">
          <CodexUniversalRulesView />
        </div>
      ) : selectedStyle ? (
        <>
          {/* STYLE SPOTLIGHT HEADER */}
          <div className="px-3 sm:px-4 py-2 bg-gradient-to-r from-zinc-900/80 via-zinc-950 to-zinc-950 border-b border-zinc-850 flex items-center justify-between gap-2 shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                {classification ? (
                  <>
                    <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded bg-zinc-900 text-amber-300 border border-zinc-750 uppercase">
                      {classification.class} • {classification.classCategory}
                    </span>
                    <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded bg-zinc-900 text-cyan-300 border border-zinc-750 uppercase">
                      {classification.specialty}
                    </span>
                    {getStatusBadge(classification.status)}
                  </>
                ) : (
                  currentIntel && (
                    <span className="text-[9px] font-mono text-zinc-400">
                      {currentIntel.archetype} • {currentIntel.difficulty}
                    </span>
                  )
                )}

                {isEquipped && (
                  <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                    EQUIPPED
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 font-sans line-clamp-1 mt-0.5">
                {classification?.tacticalIdentity || selectedStyle.description}
              </p>
            </div>
          </div>

          {/* HORIZONTAL TAB SWITCHER */}
          <div className="px-3 py-1.5 border-b border-zinc-850 bg-zinc-950 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            <button
              onClick={() => onTabChange('identification')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-display font-bold uppercase whitespace-nowrap transition border cursor-pointer ${
                activeTab === 'identification'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                  : 'bg-zinc-900/60 text-zinc-400 border-zinc-850'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Identity</span>
            </button>

            <button
              onClick={() => onTabChange('moves')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-display font-bold uppercase whitespace-nowrap transition border cursor-pointer ${
                activeTab === 'moves'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                  : 'bg-zinc-900/60 text-zinc-400 border-zinc-850'
              }`}
            >
              <Swords className="w-3 h-3" />
              <span>Moves</span>
            </button>

            <button
              onClick={() => onTabChange('passive')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-display font-bold uppercase whitespace-nowrap transition border cursor-pointer ${
                activeTab === 'passive'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                  : 'bg-zinc-900/60 text-zinc-400 border-zinc-850'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Passives</span>
            </button>

            <button
              onClick={() => onTabChange('stats')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-display font-bold uppercase whitespace-nowrap transition border cursor-pointer ${
                activeTab === 'stats'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                  : 'bg-zinc-900/60 text-zinc-400 border-zinc-850'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              <span>Stats</span>
            </button>

            <button
              onClick={() => onTabChange('tactics')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-display font-bold uppercase whitespace-nowrap transition border cursor-pointer ${
                activeTab === 'tactics'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                  : 'bg-zinc-900/60 text-zinc-400 border-zinc-850'
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>Tactics</span>
            </button>
          </div>

          {/* SCROLLABLE TAB CONTENT BODY */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 custom-scrollbar min-h-0 bg-zinc-950/40">
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

      {/* 3. FULL-SCREEN SLIDE-OVER STYLES DRAWER (MOBILE) */}
      {drawerOpen && (
        <div className="absolute inset-0 z-50 flex">
          <div className="w-4/5 max-w-sm h-full bg-zinc-950 shadow-2xl flex flex-col border-r border-zinc-800 animate-slide-right">
            <div className="p-3 border-b border-zinc-850 flex items-center justify-between bg-zinc-900">
              <span className="text-xs font-display font-black uppercase text-white tracking-wider">
                Select Fighting Style
              </span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <CodexSidebar
                styles={styles}
                selectedStyleId={selectedStyleId}
                onSelectStyle={handleSelect}
                equippedStyleId={equippedStyleId}
              />
            </div>
          </div>
          <div
            onClick={() => setDrawerOpen(false)}
            className="flex-1 bg-black/60 backdrop-blur-xs"
          />
        </div>
      )}

    </div>
  );
};

