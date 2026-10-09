import React from 'react';
import { FightingStyle } from '../../types';
import { Zap } from 'lucide-react';
import { CODEX_INTEL } from '../../data/codexData';

interface CodexPassivesViewProps {
  style: FightingStyle;
}

export const CodexPassivesView: React.FC<CodexPassivesViewProps> = ({ style }) => {
  const intel = CODEX_INTEL[style.id];
  const passives = intel?.passives || [];

  return (
    <div className="space-y-3">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-900 border border-amber-500/30 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-inner">
            <Zap className="w-4 h-4 fill-amber-400" />
          </div>
          <div>
            <span className="text-[9px] font-mono text-amber-400 uppercase tracking-widest block font-bold">
              INNATE PASSIVES • {passives.length} TRAITS
            </span>
            <h3 className="text-base font-display font-black italic uppercase text-white tracking-tight">
              {style.passiveName}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono font-bold bg-zinc-950 text-zinc-300 border border-zinc-800 px-2.5 py-1 rounded-lg uppercase">
            0 Stamina Cost • Autonomous Trigger
          </span>
        </div>
      </div>

      {/* Sharp, Straightforward Passive Cards */}
      <div className="space-y-2.5">
        {passives.map((passive, index) => (
          <div
            key={index}
            className="bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 p-3.5 rounded-xl space-y-2 transition shadow-sm"
          >
            {/* Trait Header Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40 font-mono font-bold text-[10px] flex items-center justify-center">
                  {index + 1}
                </span>
                <h4 className="text-sm font-display font-black italic uppercase text-white tracking-wide">
                  {passive.name}
                </h4>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 font-mono text-[9px]">
                <span className="bg-zinc-950 text-cyan-300 border border-cyan-800/50 px-2 py-0.5 rounded font-bold uppercase">
                  {passive.type}
                </span>
                <span className="bg-amber-950/50 text-amber-300 border border-amber-700/50 px-2 py-0.5 rounded font-bold">
                  Trigger: {passive.trigger}
                </span>
              </div>
            </div>

            {/* Direct & Sharp Mechanical Specification */}
            <p className="text-xs sm:text-[13px] text-zinc-200 font-sans leading-relaxed pt-0.5">
              {passive.mechanicalBreakdown}
            </p>
          </div>
        ))}

        {passives.length === 0 && (
          <div className="text-center py-6 text-zinc-400 text-xs font-mono">
            Standard baseline stance mechanics.
          </div>
        )}
      </div>

      {/* Autonomous Trigger Logic */}
      <div className="bg-zinc-900/80 border border-zinc-800 p-3 rounded-xl flex items-center justify-between gap-3 text-xs text-zinc-400">
        <span className="font-mono text-[9px] uppercase tracking-wider font-bold text-amber-400">
          AUTONOMOUS SYSTEM:
        </span>
        <span className="text-[11px] font-sans text-zinc-300 leading-tight">
          Passives trigger automatically during combat when conditions are satisfied without consuming stamina or posture.
        </span>
      </div>
    </div>
  );
};
