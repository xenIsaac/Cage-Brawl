import React from 'react';
import { FightingStyle } from '../../types';
import { Flame, ShieldAlert, CheckCircle2, Swords, Compass } from 'lucide-react';
import { CODEX_INTEL } from '../../data/codexData';

interface CodexTacticsViewProps {
  style: FightingStyle;
}

export const CodexTacticsView: React.FC<CodexTacticsViewProps> = ({ style }) => {
  const intel = CODEX_INTEL[style.id];
  if (!intel) return null;

  return (
    <div className="space-y-4">
      {/* Tactical Blueprint Pro Tip */}
      <div className="bg-gradient-to-r from-red-950/40 via-zinc-900 to-zinc-900 border border-red-500/40 p-4 rounded-2xl space-y-2 shadow-lg">
        <div className="flex items-center gap-2 text-yellow-400 text-xs font-mono font-bold uppercase tracking-wider">
          <Flame className="w-4 h-4" />
          <span>PRO CHALLENGER TACTICAL BLUEPRINT</span>
        </div>
        <p className="text-xs sm:text-[13px] text-zinc-200 italic font-sans leading-relaxed">
          "{intel.proTactics}"
        </p>
      </div>

      {/* Key Strengths & Vulnerabilities Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Strengths */}
        <div className="bg-zinc-900/90 border border-emerald-500/30 p-4 rounded-2xl space-y-2">
          <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-xs font-bold uppercase">
            <CheckCircle2 className="w-4 h-4" />
            <span>PRIMARY STRENGTHS</span>
          </div>
          <ul className="space-y-1.5 text-xs text-zinc-300 font-sans">
            {intel.keyStrengths.map((str, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold shrink-0">•</span>
                <span className="leading-snug">{str}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Vulnerabilities */}
        <div className="bg-zinc-900/90 border border-rose-500/30 p-4 rounded-2xl space-y-2">
          <div className="flex items-center gap-1.5 text-rose-400 font-mono text-xs font-bold uppercase">
            <ShieldAlert className="w-4 h-4" />
            <span>TACTICAL VULNERABILITIES</span>
          </div>
          <ul className="space-y-1.5 text-xs text-zinc-300 font-sans">
            {intel.vulnerabilities.map((vuln, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-rose-400 font-bold shrink-0">•</span>
                <span className="leading-snug">{vuln}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Matchup Breakdown */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 uppercase">
          <div className="flex items-center gap-1.5">
            <Swords className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold text-white">KEY MATCHUP ADVANTAGES & COUNTER-STRATEGIES</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {intel.matchups.map((matchup, i) => (
            <div
              key={i}
              className="bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 p-3 rounded-xl space-y-2 transition"
            >
              <div className="flex justify-between items-center border-b border-zinc-850 pb-1.5">
                <span className="font-display font-black uppercase text-xs text-white">
                  vs {matchup.vs}
                </span>
                <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded uppercase border ${
                  matchup.advantage === 'Favorable'
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/40'
                    : matchup.advantage === 'Caution'
                    ? 'bg-rose-950/60 text-rose-300 border-rose-600/40'
                    : 'bg-amber-950/60 text-amber-300 border-amber-600/40'
                }`}>
                  {matchup.advantage}
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 font-sans leading-snug">
                {matchup.strategy}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
