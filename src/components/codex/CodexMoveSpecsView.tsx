import React from 'react';
import { FightingStyle } from '../../types';
import { Swords, Shield, Clock, Zap, Target, Sparkles } from 'lucide-react';
import { CODEX_INTEL, MoveSpec } from '../../data/codexData';

interface CodexMoveSpecsViewProps {
  style: FightingStyle;
}

export const CodexMoveSpecsView: React.FC<CodexMoveSpecsViewProps> = ({ style }) => {
  const intel = CODEX_INTEL[style.id];
  const moves = intel?.moves || [];

  return (
    <div className="space-y-4">
      {/* Overview Specs Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-zinc-400 uppercase">
        <div className="flex items-center gap-2">
          <Swords className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-bold text-white">TECHNIQUE SPECIFICATIONS & FRAME TIMINGS</span>
        </div>
        <span className="text-amber-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
          60 FPS Combat Engine Benchmark
        </span>
      </div>

      {/* Individual Move Cards */}
      <div className="space-y-3">
        {moves.map((move, index) => (
          <MoveCard key={index} move={move} />
        ))}
      </div>

      {/* Frame Data & Posture Reference Summary */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
          <span className="text-xs font-display font-bold uppercase text-white tracking-wide">
            Frame Data Quick Reference Table
          </span>
          <span className="text-[9px] font-mono text-zinc-400">1 frame = 16.6ms</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-850 bg-zinc-950/90" style={{ scrollbarWidth: 'thin' }}>
          <table className="w-full text-left font-mono text-[9px] sm:text-[10px]">
            <thead className="bg-zinc-900 text-zinc-400 uppercase border-b border-zinc-800">
              <tr>
                <th className="p-2 sm:p-2.5">Move</th>
                <th className="p-2 sm:p-2.5">Damage</th>
                <th className="p-2 sm:p-2.5">Startup</th>
                <th className="p-2 sm:p-2.5">Recovery</th>
                <th className="p-2 sm:p-2.5">Hitstun</th>
                <th className="p-2 sm:p-2.5">I-Frames / Armor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {moves.map((m, idx) => (
                <tr key={idx} className="hover:bg-zinc-900/60 transition">
                  <td className="p-2 sm:p-2.5 font-bold text-white flex items-center gap-1.5">
                    <span className={`px-1 rounded text-[8px] font-bold ${
                      m.code === 'M2' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      m.code === 'S4' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                      'bg-zinc-800 text-zinc-300'
                    }`}>
                      {m.code}
                    </span>
                    <span className="truncate">{m.name}</span>
                  </td>
                  <td className="p-2 sm:p-2.5 font-bold text-rose-400">{m.damageLabel}</td>
                  <td className="p-2 sm:p-2.5 text-cyan-300">{m.startupSpeed}</td>
                  <td className="p-2 sm:p-2.5 text-yellow-300">{m.recoverySeconds}s</td>
                  <td className="p-2 sm:p-2.5 text-emerald-300">{m.hitstunSeconds}s</td>
                  <td className="p-2 sm:p-2.5">
                    {m.superArmor ? (
                      <span className="text-amber-400 font-bold">Super Armor</span>
                    ) : m.iFrames !== 'None' ? (
                      <span className="text-purple-400 font-bold">{m.iFrames}</span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface MoveCardProps {
  move: MoveSpec;
}

const MoveCard: React.FC<MoveCardProps> = ({ move }) => {
  const isHeavy = move.code === 'M2';
  const isFinisher = move.code === 'S4';

  return (
    <div className={`p-4 rounded-2xl border transition shadow-sm space-y-3 ${
      isHeavy
        ? 'bg-gradient-to-r from-amber-950/30 via-zinc-900/90 to-zinc-900/90 border-amber-500/40'
        : isFinisher
        ? 'bg-zinc-900/90 border-red-500/30'
        : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-750'
    }`}>
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-850 pb-2.5">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-lg text-xs font-mono font-black border ${
            isHeavy ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' :
            isFinisher ? 'bg-red-500/20 text-red-300 border-red-500/50' :
            'bg-zinc-800 text-zinc-200 border-zinc-700'
          }`}>
            {move.code}
          </span>
          <h4 className="text-sm font-display font-black uppercase text-white tracking-wide">
            {move.name}
          </h4>
          <span className="text-[9px] font-mono text-zinc-400 uppercase">
            • {move.type}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Super Armor or I-Frames Badge */}
          {move.superArmor && (
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono font-bold">
              SUPER ARMOR
            </span>
          )}
          {move.iFrames !== 'None' && (
            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-mono font-bold">
              {move.iFrames}
            </span>
          )}

          {/* Damage Badge */}
          <span className="px-2.5 py-0.5 rounded-lg bg-rose-950/60 text-rose-300 border border-rose-800/50 text-xs font-mono font-bold">
            {move.damageLabel}
          </span>
        </div>
      </div>

      {/* Specifications Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
        <div className="bg-zinc-950/80 p-2 rounded-xl border border-zinc-850">
          <span className="text-[8px] text-zinc-400 block uppercase font-bold">Startup</span>
          <span className="text-cyan-300 font-bold">{move.startupSpeed}</span>
        </div>
        <div className="bg-zinc-950/80 p-2 rounded-xl border border-zinc-850">
          <span className="text-[8px] text-zinc-400 block uppercase font-bold">Recovery</span>
          <span className="text-yellow-300 font-bold">{move.recoverySeconds}s ({Math.round(move.recoverySeconds * 60)}f)</span>
        </div>
        <div className="bg-zinc-950/80 p-2 rounded-xl border border-zinc-850">
          <span className="text-[8px] text-zinc-400 block uppercase font-bold">Hitstun</span>
          <span className="text-emerald-300 font-bold">{move.hitstunSeconds}s ({Math.round(move.hitstunSeconds * 60)}f)</span>
        </div>
        <div className="bg-zinc-950/80 p-2 rounded-xl border border-zinc-850">
          <span className="text-[8px] text-zinc-400 block uppercase font-bold">Guard Impact</span>
          <span className="text-amber-300 font-bold truncate block">{move.guardChip}</span>
        </div>
      </div>

      {/* Description & Tactical Role */}
      <div className="space-y-1 text-xs font-sans">
        <p className="text-zinc-300 leading-snug">
          {move.description}
        </p>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono">
          <Target className="w-3 h-3 text-amber-400 shrink-0" />
          <span>Role: <strong className="text-zinc-200">{move.tacticalRole}</strong></span>
        </div>
      </div>
    </div>
  );
};
