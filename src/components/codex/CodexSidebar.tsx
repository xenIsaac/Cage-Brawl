import React, { useState } from 'react';
import { FightingStyle } from '../../types';
import { Search, Shield, Zap, Sparkles, Filter, Cpu, BookOpen, Layers, CheckCircle2 } from 'lucide-react';
import { CODEX_INTEL } from '../../data/codexData';
import { STYLE_CLASSIFICATIONS } from '../../data/styleClassification';

export type SortOption = 'name' | 'speed' | 'power' | 'reach';

interface CodexSidebarProps {
  styles: FightingStyle[];
  selectedStyleId: string;
  onSelectStyle: (styleId: string) => void;
  equippedStyleId?: string;
}

export const CodexSidebar: React.FC<CodexSidebarProps> = ({
  styles,
  selectedStyleId,
  onSelectStyle,
  equippedStyleId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name');

  // Filter styles
  const filteredStyles = styles.filter(style => {
    const intel = CODEX_INTEL[style.id];
    const classification = STYLE_CLASSIFICATIONS[style.id];
    const matchesSearch = style.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      style.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (intel?.archetype.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (classification?.class.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (classification?.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (classification?.playstyle.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (classification?.type.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesClass = selectedClassFilter === 'all' || (classification && classification.class.toLowerCase() === selectedClassFilter.toLowerCase());
    return matchesSearch && matchesClass;
  });

  // Sort styles
  const sortedStyles = [...filteredStyles].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === 'speed') {
      return b.statModifiers.speed - a.statModifiers.speed;
    }
    if (sortBy === 'power') {
      return b.statModifiers.power - a.statModifiers.power;
    }
    if (sortBy === 'reach') {
      return b.statModifiers.reach - a.statModifiers.reach;
    }
    return 0;
  });

  const isUniversalSelected = selectedStyleId === 'universal_rules';

  return (
    <div className="flex flex-col h-full bg-zinc-950/95 border-r border-zinc-850/80 text-zinc-100 select-none">
      
      {/* 1. TOP SPECIAL BUTTON: GAME UNIVERSAL RULES */}
      <div className="p-3 border-b border-zinc-850 bg-zinc-900/40">
        <button
          onClick={() => onSelectStyle('universal_rules')}
          className={`w-full p-3 rounded-xl border transition-all flex items-center justify-between gap-3 text-left group cursor-pointer ${
            isUniversalSelected
              ? 'bg-gradient-to-r from-amber-950/70 to-zinc-900 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.2)] ring-1 ring-amber-500/60'
              : 'bg-zinc-900/90 border-zinc-800 hover:border-amber-500/40 hover:bg-zinc-850'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
              isUniversalSelected
                ? 'bg-amber-500 text-black border-amber-400 font-bold'
                : 'bg-zinc-800 text-amber-400 border-zinc-700 group-hover:border-amber-500/50'
            }`}>
              <Cpu className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-display font-black uppercase text-white tracking-wide truncate">
                Game Universal Rules
              </div>
              <div className="text-[9px] font-mono text-zinc-400 truncate">
                Combat physics, parry & frames
              </div>
            </div>
          </div>

          <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shrink-0 uppercase">
            RULES
          </span>
        </button>
      </div>

      {/* 2. SEARCH & FILTER CONTROLS */}
      <div className="p-3 border-b border-zinc-850 space-y-2 shrink-0">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search style, class, specialty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-zinc-900/90 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 transition font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Sorting & Filter Controls */}
        <div className="flex items-center justify-between gap-2 text-[10px] bg-zinc-900/60 p-1.5 rounded-lg border border-zinc-850">
          <div className="flex items-center gap-1.5 text-zinc-400 min-w-0 flex-1">
            <Filter className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="font-mono uppercase font-bold text-[9px] shrink-0">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-zinc-950 text-zinc-200 border border-zinc-750 rounded px-2 py-0.5 text-[10px] font-mono focus:outline-none focus:border-amber-500/60 cursor-pointer flex-1 min-w-0 truncate"
            >
              <option value="name">Name (A-Z)</option>
              <option value="speed">Speed Rating</option>
              <option value="power">Power Rating</option>
              <option value="reach">Reach Rating</option>
            </select>
          </div>
        </div>

        {/* Quick Class Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          {['all', 'Striker', 'Grappler', 'Hybrid'].map((cls) => {
            const count = cls === 'all' 
              ? styles.length 
              : styles.filter(s => STYLE_CLASSIFICATIONS[s.id]?.class.toLowerCase() === cls.toLowerCase()).length;
            return (
              <button
                key={cls}
                onClick={() => setSelectedClassFilter(cls === selectedClassFilter ? 'all' : cls)}
                className={`px-2 py-0.5 rounded-full text-[9px] font-mono capitalize whitespace-nowrap transition border cursor-pointer ${
                  selectedClassFilter.toLowerCase() === cls.toLowerCase()
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                    : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
              >
                {cls === 'all' ? `All (${styles.length})` : `${cls} (${count})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. STYLE LISTINGS */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {sortedStyles.map((style) => (
          <StyleListItem
            key={style.id}
            style={style}
            isSelected={selectedStyleId === style.id}
            isEquipped={equippedStyleId === style.id}
            onSelect={() => onSelectStyle(style.id)}
          />
        ))}

        {sortedStyles.length === 0 && (
          <div className="text-center py-8 text-zinc-400 text-xs font-mono">
            No martial styles match your search.
          </div>
        )}
      </div>
    </div>
  );
};

interface StyleListItemProps {
  style: FightingStyle;
  isSelected: boolean;
  isEquipped: boolean;
  onSelect: () => void;
}

const StyleListItem: React.FC<StyleListItemProps> = ({
  style,
  isSelected,
  isEquipped,
  onSelect,
}) => {
  const intel = CODEX_INTEL[style.id];
  const classification = STYLE_CLASSIFICATIONS[style.id];

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-2.5 rounded-xl border transition-all relative overflow-hidden group cursor-pointer ${
        isSelected
          ? 'bg-zinc-900 border-amber-500/80 shadow-[0_0_12px_rgba(245,158,11,0.2)] ring-1 ring-amber-500/50'
          : 'bg-zinc-900/40 border-zinc-850/60 hover:bg-zinc-900/80 hover:border-zinc-750'
      }`}
    >
      {isSelected && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: style.secondaryColor || style.color || '#eab308' }}
        />
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0 shadow-sm"
            style={{ backgroundColor: style.color }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-display font-black tracking-tight truncate ${
                isSelected ? 'text-white' : 'text-zinc-200 group-hover:text-white'
              }`}>
                {style.name}
              </span>
              {isEquipped && (
                <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[7px] font-mono font-bold border border-amber-500/40 shrink-0">
                  EQUIPPED
                </span>
              )}
              {classification?.status === 'Under Rework' && (
                <span className="px-1 py-0.2 rounded bg-amber-950/80 text-amber-400 text-[7px] font-mono font-bold border border-amber-500/40 shrink-0">
                  REWORK
                </span>
              )}
            </div>
            {classification && (
              <span className="text-[9px] font-mono text-zinc-400 block truncate">
                {classification.class} • {classification.classCategory} • {classification.specialty}
              </span>
            )}
          </div>
        </div>

        {classification && (
          <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border shrink-0 font-bold ${
            classification.class === 'Striker' ? 'text-amber-400 bg-amber-950/40 border-amber-800/40' :
            classification.class === 'Grappler' ? 'text-cyan-400 bg-cyan-950/40 border-cyan-800/40' :
            'text-purple-400 bg-purple-950/40 border-purple-800/40'
          }`}>
            {classification.class}
          </span>
        )}
      </div>
    </button>
  );
};
