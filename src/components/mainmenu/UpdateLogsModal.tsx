import React, { useState } from 'react';
import { 
  Scroll, Sparkles, Swords, Zap, CheckCircle2, 
  ChevronDown, ChevronUp, ArrowLeft, Filter, History, Info, BookOpen, ChevronRight, Play
} from 'lucide-react';
import { UPDATE_LOGS_REGISTRY, VersionArchiveEntry, UpdateLogItem } from '../../data/updateLogs.registry';
import { soundManager } from '../SoundManager';
import { useResponsiveLayout } from '../../utils/useResponsiveLayout';

interface UpdateLogsModalProps {
  onClose: (proceedToMenu?: boolean) => void;
  isPreMenu?: boolean;
}

export const UpdateLogsModal: React.FC<UpdateLogsModalProps> = ({ onClose, isPreMenu = false }) => {
  const { isPortrait, isMobile } = useResponsiveLayout();

  // Tier State: 'archive_hub' (Version Select Hub) vs 'detail_view' (Version Detail View)
  const [activeTier, setActiveTier] = useState<'archive_hub' | 'detail_view'>('archive_hub');
  const [selectedVersion, setSelectedVersion] = useState<VersionArchiveEntry>(UPDATE_LOGS_REGISTRY[0]);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [collapsedEntries, setCollapsedEntries] = useState<Record<string, boolean>>({});

  const handleSelectVersionCard = (ver: VersionArchiveEntry) => {
    soundManager.playRollTick?.();
    setSelectedVersion(ver);
    setActiveCategoryFilter('all');
    setCollapsedEntries({});
    setActiveTier('detail_view');
  };

  const handleBackToHub = () => {
    soundManager.playRollTick?.();
    setActiveTier('archive_hub');
  };

  const toggleCollapse = (id: string) => {
    soundManager.playRollTick?.();
    setCollapsedEntries(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getCategoryBadge = (type: UpdateLogItem['type']) => {
    switch (type) {
      case 'new':
        return { label: 'NEW FEATURE', color: 'bg-emerald-500 text-black border-white', icon: Sparkles };
      case 'balancing':
        return { label: 'BALANCING & COMBAT', color: 'bg-red-600 text-white border-white', icon: Swords };
      case 'bugfix':
        return { label: 'BUG FIX', color: 'bg-amber-400 text-black border-white', icon: CheckCircle2 };
      case 'ui_ux':
        return { label: 'UI & UX', color: 'bg-cyan-400 text-black border-white', icon: Zap };
      default:
        return { label: 'UPDATE', color: 'bg-zinc-700 text-white border-white', icon: Info };
    }
  };

  const filteredEntries = selectedVersion.entries.filter(entry => {
    if (activeCategoryFilter === 'all') return true;
    return entry.type === activeCategoryFilter;
  });

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/98 backdrop-blur-2xl text-white flex flex-col justify-between p-3 sm:p-6 select-none overflow-hidden box-border">
      
      {/* HALFTONE BACKGROUND ACCENT */}
      <div className="absolute inset-0 pointer-events-none opacity-15">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: 'radial-gradient(circle, #ef4444 1.5px, transparent 1.5px)',
            backgroundSize: '16px 16px'
          }}
        />
      </div>

      {/* ========================================================================= */}
      {/* TIER 1: VERSION SELECT HUB                                               */}
      {/* ========================================================================= */}
      {activeTier === 'archive_hub' ? (
        <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-between z-10 min-h-0">
          {/* HEADER STRIP */}
          <header className="flex items-center justify-between gap-3 pb-3 border-b-2 border-red-600 shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-red-600 text-black px-3 py-1 font-display font-black italic text-sm sm:text-base tracking-wider -skew-x-12 shadow-[3px_3px_0px_#ffffff]">
                VERSION ARCHIVE
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-display font-black italic tracking-tighter uppercase text-white -skew-x-12 leading-none">
                  IN-GAME UPDATE LOGS &amp; ARCHIVE
                </h1>
                <p className="text-[10px] sm:text-xs font-mono text-zinc-400 font-bold uppercase mt-0.5">
                  SELECT A GAME VERSION CARD TO VIEW CATEGORIZED PATCH NOTES
                </p>
              </div>
            </div>

            {/* EXIT TO MAIN MENU */}
            <button
              onClick={() => {
                soundManager.playKO?.();
                onClose(true);
              }}
              className="px-4 py-2 bg-red-600 hover:bg-white text-black font-display font-black italic text-xs sm:text-sm uppercase tracking-wider -skew-x-12 shadow-[3px_3px_0px_#ffffff] hover:shadow-[3px_3px_0px_#ef4444] active:scale-95 transition-all duration-150 cursor-pointer flex items-center gap-2 group shrink-0"
            >
              <Play className="w-4 h-4 fill-black text-black group-hover:scale-110 transition-transform" />
              <span>PROCEED // MAIN MENU</span>
            </button>
          </header>

          {/* VERSION CARDS LIST */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar my-4 space-y-4 pr-1">
            {UPDATE_LOGS_REGISTRY.map(ver => (
              <div
                key={ver.version}
                onClick={() => handleSelectVersionCard(ver)}
                className={`group relative text-left select-none -skew-x-2 border-2 p-4 sm:p-5 cursor-pointer transition-all duration-200 shadow-[5px_5px_0px_#000000] box-border ${
                  ver.isCurrent
                    ? 'bg-zinc-950 border-red-600 hover:border-white shadow-[6px_6px_0px_#ef4444]'
                    : 'bg-zinc-950/90 border-zinc-800 hover:border-zinc-500'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-0.5 text-xs font-mono font-black uppercase -skew-x-12 ${
                      ver.isCurrent ? 'bg-red-600 text-black shadow-[2px_2px_0px_#ffffff]' : 'bg-zinc-800 text-zinc-300'
                    }`}>
                      {ver.version}
                    </span>
                    <h2 className="font-display font-black italic text-base sm:text-xl uppercase text-white tracking-tight">
                      {ver.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">
                      DATE: {ver.date}
                    </span>
                    {ver.isCurrent && (
                      <span className="px-2 py-0.5 bg-emerald-500 text-black font-mono font-black text-[9px] uppercase -skew-x-6">
                        ACTIVE RELEASE
                      </span>
                    )}
                  </div>
                </div>

                <p className="mt-3 text-xs sm:text-sm font-mono text-zinc-300 leading-relaxed bg-black/40 p-3 border-l-4 border-red-600">
                  "{ver.summary}"
                </p>

                <div className="mt-3.5 flex items-center justify-between pt-2 border-t border-zinc-850 text-xs font-mono font-bold">
                  <span className="text-zinc-400 text-[10px] uppercase">
                    {ver.entries.length} CATEGORIZED ENTRY PANELS
                  </span>
                  <button className="py-1.5 px-4 bg-white text-black font-display font-black italic uppercase text-xs -skew-x-6 shadow-[3px_3px_0px_#ef4444] group-hover:bg-red-600 group-hover:text-white transition flex items-center gap-1.5">
                    <span>VIEW PATCH NOTES</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* FOOTER */}
          <footer className="flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase pt-2 border-t border-zinc-800 shrink-0">
            <span>REGISTRY ENGINE // VERSION ARCHIVE</span>
            <span className="text-amber-400 font-bold">TOTAL VERSIONS: {UPDATE_LOGS_REGISTRY.length}</span>
          </footer>
        </div>
      ) : (
        /* ========================================================================= */
        /* TIER 2: VERSION DETAIL VIEW                                              */
        /* ========================================================================= */
        <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-between z-10 min-h-0">
          {/* HEADER STRIP */}
          <header className="flex items-center justify-between gap-3 pb-3 border-b-2 border-red-600 shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBackToHub}
                className="p-2 bg-zinc-900 hover:bg-white hover:text-black border border-zinc-700 text-zinc-300 -skew-x-12 transition cursor-pointer shrink-0"
                title="Back to Version Select Hub"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-red-600 text-black px-2 py-0.5 font-mono font-black text-xs uppercase -skew-x-12">
                    {selectedVersion.version}
                  </span>
                  <h1 className="text-base sm:text-xl font-display font-black italic tracking-tighter uppercase text-white -skew-x-12 leading-none">
                    {selectedVersion.title}
                  </h1>
                </div>
                <p className="text-[10px] sm:text-xs font-mono text-zinc-400 font-bold uppercase mt-1">
                  RELEASED: {selectedVersion.date} &bull; CATEGORIZED PATCH DETAILS
                </p>
              </div>
            </div>

            {/* EXIT TO MAIN MENU */}
            <button
              onClick={() => {
                soundManager.playKO?.();
                onClose(true);
              }}
              className="px-4 py-2 bg-red-600 hover:bg-white text-black font-display font-black italic text-xs sm:text-sm uppercase tracking-wider -skew-x-12 shadow-[3px_3px_0px_#ffffff] hover:shadow-[3px_3px_0px_#ef4444] active:scale-95 transition-all duration-150 cursor-pointer flex items-center gap-2 group shrink-0"
            >
              <Play className="w-4 h-4 fill-black text-black group-hover:scale-110 transition-transform" />
              <span>PROCEED // MAIN MENU</span>
            </button>
          </header>

          {/* CATEGORY FILTER TABS */}
          <div className="flex items-center gap-1.5 sm:gap-2 my-2.5 overflow-x-auto custom-scrollbar shrink-0">
            {[
              { id: 'all', label: 'ALL LOGS' },
              { id: 'new', label: 'NEW' },
              { id: 'balancing', label: 'BALANCING & COMBAT' },
              { id: 'bugfix', label: 'BUG FIXES' },
              { id: 'ui_ux', label: 'UI & UX' }
            ].map(cat => {
              const isActive = activeCategoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    soundManager.playRollTick?.();
                    setActiveCategoryFilter(cat.id);
                  }}
                  className={`px-3 py-1 text-xs font-display font-black italic uppercase tracking-wider -skew-x-12 transition-all cursor-pointer whitespace-nowrap ${
                    isActive 
                      ? 'bg-white text-black shadow-[3px_3px_0px_#ef4444]' 
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* DETAIL ENTRIES LISTING */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-3 pr-1 py-1 box-border">
            {filteredEntries.map(entry => {
              const isCollapsed = !!collapsedEntries[entry.id];
              const badge = getCategoryBadge(entry.type);
              const BadgeIcon = badge.icon;

              return (
                <div
                  key={entry.id}
                  className="bg-black border-2 border-zinc-800 hover:border-zinc-600 p-3 sm:p-4 -skew-x-2 shadow-[4px_4px_0px_#000000] transition-all duration-200"
                >
                  {/* CARD HEADER */}
                  <div 
                    onClick={() => toggleCollapse(entry.id)}
                    className="flex items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 truncate">
                      <span className={`px-2 py-0.5 text-[9px] font-mono font-black uppercase -skew-x-6 flex items-center gap-1 shrink-0 ${badge.color}`}>
                        <BadgeIcon className="w-3 h-3" />
                        <span>{badge.label}</span>
                      </span>
                      <h3 className="font-display font-black italic text-sm sm:text-base uppercase text-white truncate tracking-tight">
                        {entry.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase font-bold hidden sm:inline">
                        {isCollapsed ? 'TAP TO EXPAND' : 'TAP TO FOLD'}
                      </span>
                      {isCollapsed ? (
                        <ChevronDown className="w-4 h-4 text-zinc-400" />
                      ) : (
                        <ChevronUp className="w-4 h-4 text-zinc-400" />
                      )}
                    </div>
                  </div>

                  {/* CARD BODY CONTENT */}
                  {!isCollapsed && (
                    <div className="mt-3 pt-2.5 border-t border-zinc-850 space-y-2 animate-navFadeIn">
                      <p className="text-xs font-mono text-zinc-300 leading-relaxed bg-zinc-950 p-2.5 border-l-4 border-red-600">
                        "{entry.summary}"
                      </p>

                      {entry.details && entry.details.length > 0 && (
                        <div className="space-y-1.5 pl-2 pt-1">
                          {entry.details.map((detail, idx) => (
                            <div key={idx} className="text-[11px] font-mono text-zinc-400 flex items-start gap-2">
                              <span className="text-red-500 font-bold shrink-0">&bull;</span>
                              <span className="leading-snug">{detail}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* FOOTER */}
          <footer className="flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase pt-2 border-t border-zinc-800 shrink-0">
            <button
              onClick={handleBackToHub}
              className="text-red-400 hover:text-white font-bold flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>RETURN TO VERSION SELECT HUB</span>
            </button>
            <span className="text-amber-400 font-bold">{selectedVersion.version} PATCH DETAILS</span>
          </footer>
        </div>
      )}

    </div>
  );
};
