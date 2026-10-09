import React, { useState, useMemo } from 'react';
import { 
  Shield, Zap, Sparkles, Filter, Search, ChevronRight, CheckCircle2, 
  Info, Crosshair, Swords, Layers, HelpCircle, ArrowUpRight, Compass,
  SlidersHorizontal, Check, AlertTriangle, Clock
} from 'lucide-react';
import { FightingStyle } from '../../types';
import { 
  STYLE_CLASSIFICATIONS, 
  MASTER_CLASSIFICATION_LIST,
  TAXONOMY_KEYS_GUIDE, 
  StyleClassification,
  StyleClass,
  StyleClassCategory,
  StyleSpecialty,
  StylePlaystyle,
  StyleType,
  StyleDevStatus
} from '../../data/styleClassification';
import { soundManager } from '../SoundManager';

interface CodexIdentificationViewProps {
  style?: FightingStyle;
  onSelectStyle?: (styleId: string) => void;
  equippedStyleId?: string;
}

export const CodexIdentificationView: React.FC<CodexIdentificationViewProps> = ({
  style,
  onSelectStyle,
  equippedStyleId,
}) => {
  const currentClassification = style ? (STYLE_CLASSIFICATIONS[style.id] || null) : null;

  // Filter and Search states for Master Matrix Table
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');
  const [playstyleFilter, setPlaystyleFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showTaxonomyGuide, setShowTaxonomyGuide] = useState(false);

  // Filtered master list
  const filteredMatrix = useMemo(() => {
    return MASTER_CLASSIFICATION_LIST.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.class.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.playstyle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.status.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesClass = classFilter === 'all' || item.class === classFilter;
      const matchesCategory = categoryFilter === 'all' || item.classCategory === categoryFilter;
      const matchesSpecialty = specialtyFilter === 'all' || item.specialty === specialtyFilter;
      const matchesPlaystyle = playstyleFilter === 'all' || item.playstyle === playstyleFilter;
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      return matchesSearch && matchesClass && matchesCategory && matchesSpecialty && matchesPlaystyle && matchesType && matchesStatus;
    });
  }, [searchQuery, classFilter, categoryFilter, specialtyFilter, playstyleFilter, typeFilter, statusFilter]);

  const handleRowClick = (styleId: string) => {
    if (onSelectStyle) {
      onSelectStyle(styleId);
      soundManager.playRollTick?.();
    }
  };

  const getStatusBadge = (status: StyleDevStatus) => {
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
    <div className="space-y-6 select-none">
      
      {/* 1. CURRENT STYLE SPOTLIGHT IDENTIFICATION */}
      {currentClassification && style && (
        <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 p-4 sm:p-5 space-y-4 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Header Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3.5">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-black text-base text-white border border-white/20 shrink-0 shadow-md"
                style={{ backgroundColor: style.color || '#eab308' }}
              >
                {style.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-display font-black uppercase text-white tracking-wide">
                    {currentClassification.name} Identification Profile
                  </h3>
                  {getStatusBadge(currentClassification.status)}
                </div>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  Official Combat Taxonomy Profile & Match Archetype
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowTaxonomyGuide(!showTaxonomyGuide)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-750 text-xs font-mono text-amber-300 hover:bg-zinc-900 hover:border-amber-500/50 transition self-start sm:self-auto cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>{showTaxonomyGuide ? 'Hide Taxonomy Key Guide' : 'What Do Keys Mean?'}</span>
            </button>
          </div>

          {/* 5 Core Taxonomy Keys Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {/* 1. Class */}
            <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/80 flex flex-col justify-between space-y-1.5">
              <span className="text-[9px] font-mono uppercase text-zinc-400 font-bold tracking-wider">
                1. Class
              </span>
              <span className={`text-xs sm:text-sm font-display font-black uppercase tracking-wide ${
                currentClassification.class === 'Striker' ? 'text-amber-400' :
                currentClassification.class === 'Grappler' ? 'text-cyan-400' :
                'text-purple-400'
              }`}>
                {currentClassification.class}
              </span>
              <span className="text-[9px] text-zinc-400 line-clamp-1 font-mono">
                {currentClassification.class === 'Striker' ? 'Direct Strikes' :
                 currentClassification.class === 'Grappler' ? 'Locks & Slams' :
                 'Strikes + Clinch'}
              </span>
            </div>

            {/* 2. Class Category */}
            <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/80 flex flex-col justify-between space-y-1.5">
              <span className="text-[9px] font-mono uppercase text-zinc-400 font-bold tracking-wider">
                2. Category
              </span>
              <span className={`text-xs sm:text-sm font-display font-black uppercase tracking-wide ${
                currentClassification.classCategory === 'Light' ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {currentClassification.classCategory}
              </span>
              <span className="text-[9px] text-zinc-400 line-clamp-1 font-mono">
                {currentClassification.classCategory === 'Light' ? 'Rapid Cadence' : 'High Poise / Windup'}
              </span>
            </div>

            {/* 3. Specialty */}
            <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/80 flex flex-col justify-between space-y-1.5">
              <span className="text-[9px] font-mono uppercase text-zinc-400 font-bold tracking-wider">
                3. Specialty
              </span>
              <span className={`text-xs sm:text-sm font-display font-black uppercase tracking-wide ${
                currentClassification.specialty === 'Combo' ? 'text-blue-400' : 'text-amber-400'
              }`}>
                {currentClassification.specialty}
              </span>
              <span className="text-[9px] text-zinc-400 line-clamp-1 font-mono">
                {currentClassification.specialty === 'Combo' ? 'Volume Strings' : 'Error Exploitation'}
              </span>
            </div>

            {/* 4. Playstyle */}
            <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/80 flex flex-col justify-between space-y-1.5">
              <span className="text-[9px] font-mono uppercase text-zinc-400 font-bold tracking-wider">
                4. Playstyle
              </span>
              <span className={`text-xs sm:text-sm font-display font-black uppercase tracking-wide ${
                currentClassification.playstyle === 'Aggressive' ? 'text-red-400' :
                currentClassification.playstyle === 'Defensive' ? 'text-sky-400' :
                'text-teal-400'
              }`}>
                {currentClassification.playstyle}
              </span>
              <span className="text-[9px] text-zinc-400 line-clamp-1 font-mono">
                {currentClassification.playstyle === 'Aggressive' ? 'Forward Pressure' :
                 currentClassification.playstyle === 'Defensive' ? 'Counter & Angles' :
                 'Neutral Resets'}
              </span>
            </div>

            {/* 5. Type */}
            <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/80 flex flex-col justify-between space-y-1.5 col-span-2 sm:col-span-1">
              <span className="text-[9px] font-mono uppercase text-zinc-400 font-bold tracking-wider">
                5. Type
              </span>
              <span className={`text-xs sm:text-sm font-display font-black uppercase tracking-wide ${
                currentClassification.type === 'Street' ? 'text-orange-400' :
                currentClassification.type === 'Professional' ? 'text-indigo-400' :
                'text-fuchsia-400'
              }`}>
                {currentClassification.type}
              </span>
              <span className="text-[9px] text-zinc-400 line-clamp-1 font-mono">
                {currentClassification.type === 'Street' ? 'Unregulated' :
                 currentClassification.type === 'Professional' ? 'Sanctioned / Dojo' :
                 'Military Black-Ops'}
              </span>
            </div>
          </div>

          {/* Tactical Identity Breakdown Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800 text-xs space-y-1">
              <span className="text-[10px] font-mono uppercase text-amber-400 font-bold flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5" />
                Tactical Identity & Archetype
              </span>
              <p className="text-zinc-300 font-sans leading-relaxed">
                {currentClassification.tacticalIdentity}
              </p>
            </div>

            <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800 text-xs space-y-1">
              <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Physical Cadence & Limb Speed
              </span>
              <p className="text-zinc-300 font-sans leading-relaxed">
                {currentClassification.combatCadence}
              </p>
            </div>

            <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800 text-xs space-y-1">
              <span className="text-[10px] font-mono uppercase text-blue-400 font-bold flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5" />
                Tactical Win Condition
              </span>
              <p className="text-zinc-300 font-sans leading-relaxed">
                {currentClassification.winCondition}
              </p>
            </div>

            <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800 text-xs space-y-1">
              <span className="text-[10px] font-mono uppercase text-purple-400 font-bold flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" />
                Pacing, Spacing & Neutral Strategy
              </span>
              <p className="text-zinc-300 font-sans leading-relaxed">
                {currentClassification.spacingStrategy}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. TAXONOMY KEYS EXPLANATION GUIDE (COLLAPSIBLE / EXPANDABLE) */}
      {showTaxonomyGuide && (
        <div className="bg-zinc-900/90 rounded-2xl border border-amber-500/40 p-4 sm:p-5 space-y-4 shadow-xl animate-fade-in">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-display font-black uppercase text-white tracking-wider">
                Cage Brawl: Official Taxonomy Key Glossary
              </h4>
            </div>
            <button
              onClick={() => setShowTaxonomyGuide(false)}
              className="text-xs text-zinc-400 hover:text-white font-mono cursor-pointer"
            >
              ✕ Close Guide
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {TAXONOMY_KEYS_GUIDE.map((keyGuide) => (
              <div key={keyGuide.key} className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2.5">
                <div>
                  <h5 className="text-xs font-display font-black uppercase text-amber-400">
                    {keyGuide.label}
                  </h5>
                  <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                    {keyGuide.description}
                  </p>
                </div>

                <div className="space-y-1.5">
                  {keyGuide.values.map((v) => (
                    <div key={v.name} className={`p-2 rounded-lg border ${v.bg} ${v.border} space-y-1 text-[10px]`}>
                      <div className="flex items-center justify-between">
                        <span className={`font-mono font-bold uppercase ${v.color}`}>
                          {v.name}
                        </span>
                      </div>
                      <p className="text-zinc-300 font-sans leading-relaxed">
                        {v.description}
                      </p>
                      <div className="text-[9px] font-mono text-zinc-400">
                        <span className="text-zinc-400">Examples: </span>
                        <span className="text-zinc-200">{v.examples.slice(0, 4).join(', ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. MASTER CLASSIFICATION MATRIX & INTERACTIVE TABLE */}
      <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 p-4 sm:p-5 space-y-4 shadow-xl">
        
        {/* Table Title & Quick Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm sm:text-base font-display font-black uppercase text-white tracking-wide">
                Master Style Classification Matrix
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                {filteredMatrix.length} / {MASTER_CLASSIFICATION_LIST.length} Styles
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Click any style row to inspect its frame data, passives, and combat parameters.
            </p>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="space-y-2.5 bg-zinc-950/80 p-3 rounded-xl border border-zinc-800">
          
          {/* Search Row */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search style name, class, specialty, playstyle, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 bg-zinc-900 border border-zinc-750 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 transition font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[10px] font-mono">
            
            {/* Class Filter */}
            <div className="space-y-1">
              <span className="text-zinc-400 uppercase font-bold text-[9px] block">Class:</span>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-full bg-zinc-900 text-zinc-200 border border-zinc-750 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-500/60 cursor-pointer"
              >
                <option value="all">All Classes</option>
                <option value="Striker">Striker</option>
                <option value="Grappler">Grappler</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="space-y-1">
              <span className="text-zinc-400 uppercase font-bold text-[9px] block">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full bg-zinc-900 text-zinc-200 border border-zinc-750 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-500/60 cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="Light">Light</option>
                <option value="Heavy">Heavy</option>
              </select>
            </div>

            {/* Specialty Filter */}
            <div className="space-y-1">
              <span className="text-zinc-400 uppercase font-bold text-[9px] block">Specialty:</span>
              <select
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                className="w-full bg-zinc-900 text-zinc-200 border border-zinc-750 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-500/60 cursor-pointer"
              >
                <option value="all">All Specialties</option>
                <option value="Combo">Combo</option>
                <option value="Punish">Punish</option>
              </select>
            </div>

            {/* Playstyle Filter */}
            <div className="space-y-1">
              <span className="text-zinc-400 uppercase font-bold text-[9px] block">Playstyle:</span>
              <select
                value={playstyleFilter}
                onChange={(e) => setPlaystyleFilter(e.target.value)}
                className="w-full bg-zinc-900 text-zinc-200 border border-zinc-750 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-500/60 cursor-pointer"
              >
                <option value="all">All Playstyles</option>
                <option value="Aggressive">Aggressive</option>
                <option value="Defensive">Defensive</option>
                <option value="Passive">Passive</option>
              </select>
            </div>

            {/* Type Filter */}
            <div className="space-y-1">
              <span className="text-zinc-400 uppercase font-bold text-[9px] block">Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full bg-zinc-900 text-zinc-200 border border-zinc-750 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-500/60 cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="Street">Street</option>
                <option value="Professional">Professional</option>
                <option value="Fiction">Fiction</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="space-y-1">
              <span className="text-zinc-400 uppercase font-bold text-[9px] block">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-zinc-900 text-zinc-200 border border-zinc-750 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-500/60 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="Current (Reworked)">Current (Reworked)</option>
                <option value="Current">Current</option>
                <option value="Under Rework">Under Rework</option>
                <option value="Potential Rework">Potential Rework</option>
              </select>
            </div>

          </div>

          {/* Reset Filters button */}
          {(searchQuery || classFilter !== 'all' || categoryFilter !== 'all' || specialtyFilter !== 'all' || playstyleFilter !== 'all' || typeFilter !== 'all' || statusFilter !== 'all') && (
            <div className="flex justify-end pt-1">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setClassFilter('all');
                  setCategoryFilter('all');
                  setSpecialtyFilter('all');
                  setPlaystyleFilter('all');
                  setTypeFilter('all');
                  setStatusFilter('all');
                }}
                className="text-[10px] font-mono text-amber-400 hover:text-amber-300 underline cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>

        {/* Interactive Matrix Table */}
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/60 shadow-inner">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/90 text-zinc-400 font-mono text-[10px] uppercase tracking-wider">
                <th className="py-3 px-3.5 font-bold">Fighting Style</th>
                <th className="py-3 px-3 font-bold">Class</th>
                <th className="py-3 px-3 font-bold">Category</th>
                <th className="py-3 px-3 font-bold">Specialty</th>
                <th className="py-3 px-3 font-bold">Playstyle</th>
                <th className="py-3 px-3 font-bold">Type</th>
                <th className="py-3 px-3.5 font-bold">Development Status</th>
                <th className="py-3 px-3 text-right font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850 font-sans">
              {filteredMatrix.map((item) => {
                const isCurrentViewing = style?.id === item.styleId;
                const isEquipped = equippedStyleId === item.styleId;

                return (
                  <tr
                    key={item.styleId}
                    onClick={() => handleRowClick(item.styleId)}
                    className={`transition-colors cursor-pointer group ${
                      isCurrentViewing
                        ? 'bg-amber-500/15 border-l-4 border-l-amber-500 text-white font-medium'
                        : 'hover:bg-zinc-900/80 text-zinc-300'
                    }`}
                  >
                    {/* Style Name */}
                    <td className="py-2.5 px-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400 group-hover:scale-125 transition-transform" />
                        <div>
                          <div className="font-display font-black uppercase text-white tracking-wide text-xs flex items-center gap-1.5">
                            <span>{item.name}</span>
                            {isEquipped && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[7px] font-mono font-bold">
                                EQUIPPED
                              </span>
                            )}
                            {isCurrentViewing && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500 text-black text-[7px] font-mono font-black uppercase">
                                VIEWING
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Class */}
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        item.class === 'Striker' ? 'text-amber-300 bg-amber-950/50 border border-amber-800/40' :
                        item.class === 'Grappler' ? 'text-cyan-300 bg-cyan-950/50 border border-cyan-800/40' :
                        'text-purple-300 bg-purple-950/50 border border-purple-800/40'
                      }`}>
                        {item.class}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        item.classCategory === 'Light' ? 'text-emerald-300 bg-emerald-950/50 border border-emerald-800/40' :
                        'text-rose-300 bg-rose-950/50 border border-rose-800/40'
                      }`}>
                        {item.classCategory}
                      </span>
                    </td>

                    {/* Specialty */}
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        item.specialty === 'Combo' ? 'text-blue-300 bg-blue-950/50 border border-blue-800/40' :
                        'text-amber-300 bg-amber-950/50 border border-amber-800/40'
                      }`}>
                        {item.specialty}
                      </span>
                    </td>

                    {/* Playstyle */}
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        item.playstyle === 'Aggressive' ? 'text-red-300 bg-red-950/50 border border-red-800/40' :
                        item.playstyle === 'Defensive' ? 'text-sky-300 bg-sky-950/50 border border-sky-800/40' :
                        'text-teal-300 bg-teal-950/50 border border-teal-800/40'
                      }`}>
                        {item.playstyle}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        item.type === 'Street' ? 'text-orange-300 bg-orange-950/50 border border-orange-800/40' :
                        item.type === 'Professional' ? 'text-indigo-300 bg-indigo-950/50 border border-indigo-800/40' :
                        'text-fuchsia-300 bg-fuchsia-950/50 border border-fuchsia-800/40'
                      }`}>
                        {item.type}
                      </span>
                    </td>

                    {/* Development Status */}
                    <td className="py-2.5 px-3.5">
                      {getStatusBadge(item.status)}
                    </td>

                    {/* Action */}
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(item.styleId);
                        }}
                        className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold uppercase transition flex items-center gap-1 ml-auto cursor-pointer ${
                          isCurrentViewing
                            ? 'bg-amber-500 text-black shadow-sm font-black'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-amber-500 hover:text-black'
                        }`}
                      >
                        <span>Select</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredMatrix.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-400 font-mono text-xs">
                    No fighting styles match the selected matrix filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
