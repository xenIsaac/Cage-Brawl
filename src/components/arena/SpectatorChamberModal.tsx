import React from 'react';
import { RotateCcw, Eye, Dices, ArrowLeft, Tv, Sparkles, Shield, Trophy } from 'lucide-react';
import { FIGHTING_STYLES } from '../../data/styles';
import { formatHeight } from '../../utils/heightModifiers';
import { soundManager } from '../SoundManager';

interface SpectatorChamberModalProps {
  isOpen: boolean;
  dummyHP: number;
  playerHP: number;
  specBot1Style: string;
  setSpecBot1Style: (val: string) => void;
  specBot1Diff: string;
  setSpecBot1Diff: (val: string) => void;
  specBot1Height: number;
  setSpecBot1Height: (val: number) => void;
  specBot2Style: string;
  setSpecBot2Style: (val: string) => void;
  specBot2Diff: string;
  setSpecBot2Diff: (val: string) => void;
  specBot2Height: number;
  setSpecBot2Height: (val: number) => void;
  onRestart: () => void;
  onBackToMenu: () => void;
}

export const SpectatorChamberModal: React.FC<SpectatorChamberModalProps> = ({
  isOpen,
  dummyHP,
  playerHP,
  specBot1Style,
  setSpecBot1Style,
  specBot1Diff,
  setSpecBot1Diff,
  specBot1Height,
  setSpecBot1Height,
  specBot2Style,
  setSpecBot2Style,
  specBot2Diff,
  setSpecBot2Diff,
  specBot2Height,
  setSpecBot2Height,
  onRestart,
  onBackToMenu,
}) => {
  if (!isOpen) return null;

  const handleRandomizeBoth = () => {
    soundManager.playRollTick();
    const available = FIGHTING_STYLES.filter(s => s.reworkStatus !== 'undergoing_rework' && s.reworkStatus !== 'undergoing_development');
    const randomS1 = (available[Math.floor(Math.random() * available.length)] || FIGHTING_STYLES[0]).id;
    const randomS2 = (available[Math.floor(Math.random() * available.length)] || FIGHTING_STYLES[1]).id;
    const diffs = ['rookie', 'silver', 'gold', 'diamond', 'amethyst'];
    const randomD1 = diffs[Math.floor(Math.random() * diffs.length)];
    const randomD2 = diffs[Math.floor(Math.random() * diffs.length)];
    const randomH1 = Math.floor(Math.random() * (78 - 60 + 1)) + 60;
    const randomH2 = Math.floor(Math.random() * (78 - 60 + 1)) + 60;

    setSpecBot1Style(randomS1);
    setSpecBot1Diff(randomD1);
    setSpecBot1Height(randomH1);
    setSpecBot2Style(randomS2);
    setSpecBot2Diff(randomD2);
    setSpecBot2Height(randomH2);
  };

  const bot1StyleObj = FIGHTING_STYLES.find(s => s.id === specBot1Style) || FIGHTING_STYLES[0];
  const bot2StyleObj = FIGHTING_STYLES.find(s => s.id === specBot2Style) || FIGHTING_STYLES[1];
  const availableBotStyles = FIGHTING_STYLES.filter(s => s.reworkStatus !== 'undergoing_rework' && s.reworkStatus !== 'undergoing_development');

  return (
    <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-xl z-[120] flex flex-col items-center justify-center pointer-events-auto p-4 select-none">
      <div className="max-w-2xl w-full bg-zinc-950 border border-purple-500/50 p-6 rounded-3xl shadow-[0_0_50px_rgba(168,85,247,0.2)] space-y-5 text-center relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_15px_#a855f7]" />

        {/* Title Section */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-800/80 text-purple-300 text-[10px] font-mono font-bold uppercase">
            <Tv className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            AI VS AI BROADCAST CHAMBER
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-black italic uppercase text-white tracking-wide">
            {dummyHP <= 0 ? '🏆 BOT 1 VICTORIOUS!' : playerHP <= 0 ? '🏆 BOT 2 VICTORIOUS!' : 'MATCH SETUP & CONFIGURATION'}
          </h2>
          <p className="text-xs text-zinc-400 font-mono">Customize fighter styles, AI difficulties, and height attributes for the fight.</p>
        </div>

        {/* BOT 1 & BOT 2 CONFIGURATION PANELS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          {/* BOT 1 PANEL */}
          <div 
            className="bg-zinc-900/90 border p-4 rounded-2xl space-y-3 relative overflow-hidden transition"
            style={{ borderColor: `${bot1StyleObj.color}60` }}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-display font-black italic uppercase flex items-center gap-1.5" style={{ color: bot1StyleObj.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: bot1StyleObj.color }} />
                BOT 1 (BLUE CORNER)
              </span>
              <span className="text-[10px] font-mono text-zinc-400">{formatHeight(specBot1Height)}</span>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-mono text-zinc-400 uppercase block">Fighting Style</label>
              <select
                value={specBot1Style}
                onChange={(e) => setSpecBot1Style(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
              >
                {availableBotStyles.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-mono text-zinc-400 uppercase block">AI Skill Tier</label>
              <div className="grid grid-cols-5 gap-1">
                {['rookie', 'silver', 'gold', 'diamond', 'amethyst'].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => { soundManager.playRollTick(); setSpecBot1Diff(d); }}
                    className={`py-1 text-[9px] font-mono font-bold uppercase rounded-lg border transition cursor-pointer ${
                      specBot1Diff === d ? 'bg-purple-600 border-purple-400 text-white shadow' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-[9px] font-mono text-zinc-400">
                <span>Height: <strong>{formatHeight(specBot1Height)}</strong></span>
              </div>
              <input
                type="range"
                min="59"
                max="86"
                value={specBot1Height}
                onChange={(e) => setSpecBot1Height(parseInt(e.target.value, 10))}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>
          </div>

          {/* BOT 2 PANEL */}
          <div 
            className="bg-zinc-900/90 border p-4 rounded-2xl space-y-3 relative overflow-hidden transition"
            style={{ borderColor: `${bot2StyleObj.color}60` }}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-display font-black italic uppercase flex items-center gap-1.5" style={{ color: bot2StyleObj.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: bot2StyleObj.color }} />
                BOT 2 (RED CORNER)
              </span>
              <span className="text-[10px] font-mono text-zinc-400">{formatHeight(specBot2Height)}</span>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-mono text-zinc-400 uppercase block">Fighting Style</label>
              <select
                value={specBot2Style}
                onChange={(e) => setSpecBot2Style(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
              >
                {availableBotStyles.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-mono text-zinc-400 uppercase block">AI Skill Tier</label>
              <div className="grid grid-cols-5 gap-1">
                {['rookie', 'silver', 'gold', 'diamond', 'amethyst'].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => { soundManager.playRollTick(); setSpecBot2Diff(d); }}
                    className={`py-1 text-[9px] font-mono font-bold uppercase rounded-lg border transition cursor-pointer ${
                      specBot2Diff === d ? 'bg-purple-600 border-purple-400 text-white shadow' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-[9px] font-mono text-zinc-400">
                <span>Height: <strong>{formatHeight(specBot2Height)}</strong></span>
              </div>
              <input
                type="range"
                min="59"
                max="86"
                value={specBot2Height}
                onChange={(e) => setSpecBot2Height(parseInt(e.target.value, 10))}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* RANDOMIZER BUTTON */}
        <button
          onClick={handleRandomizeBoth}
          className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-purple-500/50 text-purple-300 text-xs font-mono font-bold uppercase rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
        >
          <Dices className="w-4 h-4" />
          RANDOMIZE FIGHTERS & ATTRIBUTES
        </button>

        {/* ACTION BUTTONS */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => {
              soundManager.playRollTick();
              onRestart();
            }}
            className="py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-display font-black italic uppercase text-xs tracking-wider transition cursor-pointer shadow-[0_0_20px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            RESTART SIMULATION
          </button>

          <button
            onClick={onBackToMenu}
            className="py-3 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 rounded-xl font-display font-black italic uppercase text-xs tracking-wider transition cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            BACK TO MENU
          </button>
        </div>
      </div>
    </div>
  );
};
