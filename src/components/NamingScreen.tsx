import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Shield, Swords, RefreshCw, AlertCircle } from 'lucide-react';
import { soundManager } from './SoundManager';

interface NamingScreenProps {
  email: string;
  onNameChosen: (name: string) => void;
}

const SEED_TAKEN_NAMES = [
  'conor_mcgregor',
  'gsp_legend',
  'jon_jones',
  'fedor',
  'chael_sonnen',
  'gareth',
  'dev_brawler',
  'alex_pereira',
  'sugar_sean'
];

export default function NamingScreen({ email, onNameChosen }: NamingScreenProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [suggestedNames, setSuggestedNames] = useState<string[]>([]);

  // Retrieve or initialize registered names list from localStorage
  const getTakenNames = (): string[] => {
    const data = localStorage.getItem('mma_taken_names');
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        return SEED_TAKEN_NAMES;
      }
    }
    // Set seeds on first run
    localStorage.setItem('mma_taken_names', JSON.stringify(SEED_TAKEN_NAMES));
    return SEED_TAKEN_NAMES;
  };

  const handleGenerateSuggestions = () => {
    const prefixes = ['The_Natural', 'Shadow', 'IronClad', 'Apex', 'CageKing', 'BoneCrusher', 'Striker', 'Ruthless'];
    const suffixes = ['_MMA', '_99', '_Fighter', '_KO', '_Warrior', '_Champ'];
    const taken = getTakenNames();
    const suggestions: string[] = [];

    while (suggestions.length < 3) {
      const pref = prefixes[Math.floor(Math.random() * prefixes.length)];
      const suff = suffixes[Math.floor(Math.random() * suffixes.length)];
      const candidate = `${pref}${suff}`.toLowerCase();
      if (!taken.includes(candidate) && !suggestions.includes(candidate)) {
        suggestions.push(candidate);
      }
    }
    setSuggestedNames(suggestions);
    soundManager.playRollTick();
  };

  useEffect(() => {
    handleGenerateSuggestions();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim().toLowerCase();

    // Validations
    if (!trimmedName) {
      setError('Please enter a fighting name.');
      soundManager.playRollTick();
      return;
    }

    if (trimmedName.length < 3) {
      setError('Name must be at least 3 characters.');
      soundManager.playRollTick();
      return;
    }

    if (trimmedName.length > 18) {
      setError('Name must be 18 characters or fewer.');
      soundManager.playRollTick();
      return;
    }

    // Alpha-numeric + underscores only
    const validPattern = /^[a-z0-9_]+$/;
    if (!validPattern.test(trimmedName)) {
      setError('Name can only contain letters, numbers, and underscores.');
      soundManager.playRollTick();
      return;
    }

    // Unique verification
    const taken = getTakenNames();
    if (taken.includes(trimmedName)) {
      setError(`"${name}" already exists! Select a unique moniker.`);
      soundManager.playRollTick();
      return;
    }

    // Register name
    const updated = [...taken, trimmedName];
    localStorage.setItem('mma_taken_names', JSON.stringify(updated));
    
    // Save mapping of email to name
    localStorage.setItem(`mma_fighter_name_map_${email}`, trimmedName);

    soundManager.playKO();
    onNameChosen(name.trim());
  };

  return (
    <div id="naming-screen-root" className="fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center p-4 lg:p-12 overflow-y-auto">
      {/* Intense red-orange atmosphere background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(255,255,255,0.012)_1px,_transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/5 rounded-full blur-[140px] pointer-events-none" />

      <motion.div
        id="naming-container"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 lg:p-8 space-y-6 relative z-10"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-yellow-950/40 border border-yellow-900/50 px-3 py-1 rounded-full text-[9px] text-yellow-500 font-mono font-black tracking-wider uppercase">
            <Shield className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />
            REGISTRATION STAGE TWO: CHOOSE MONIKER
          </div>
          <h2 className="text-2xl font-display font-black italic tracking-tighter text-white uppercase leading-none mt-2">
            SELECT YOUR FIGHTER NAME
          </h2>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            You must choose a unique martial name to represent your fighter profile in the global MMA matchmaking systems.
          </p>
        </div>

        {/* Requirements Banner */}
        <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl space-y-1">
          <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-wider block">FIGHTER CODES & PROTOCOLS</span>
          <ul className="text-[9px] text-zinc-400 space-y-1 list-disc list-inside">
            <li>Must be 3 to 18 characters long</li>
            <li>Letters, numbers, and underscores (<code className="text-yellow-500 font-mono">_</code>) only</li>
            <li>No duplicates allowed in the Global Arena</li>
          </ul>
        </div>

        {/* Input Form */}
        <form id="naming-form" onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div id="naming-error" className="p-3 bg-red-950/40 border border-red-900/40 rounded-xl text-[10px] font-mono text-red-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="fighter-name-input" className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
              ENTER DESIRED FIGHTER ID
            </label>
            <div className="relative">
              <input
                id="fighter-name-input"
                type="text"
                maxLength={18}
                placeholder="e.g. bones_jones"
                value={name}
                onChange={(e) => {
                  setName(e.target.value.replace(/\s+/g, '_')); // Automatically replace spaces with underscores for styling
                  if (error) setError('');
                }}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-3 px-4 text-sm font-mono text-white placeholder-zinc-700 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 transition-all uppercase tracking-wide"
                required
              />
            </div>
          </div>

          {/* Quick Suggestions */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider">AVAILABLE IDEAS:</span>
              <button
                type="button"
                onClick={handleGenerateSuggestions}
                className="text-[8px] font-mono text-yellow-500 hover:text-yellow-400 uppercase font-black flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-2.5 h-2.5 animate-spin-slow" />
                ROLL SUGGESTIONS
              </button>
            </div>
            
            <div id="suggestions-row" className="grid grid-cols-3 gap-2">
              {suggestedNames.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setName(sug);
                    setError('');
                    soundManager.playRollTick();
                  }}
                  className="p-2 bg-zinc-950/60 hover:bg-zinc-850 border border-zinc-850 hover:border-yellow-600/30 text-[10px] font-mono text-zinc-400 hover:text-yellow-400 rounded-lg text-center truncate transition-all cursor-pointer uppercase tracking-tighter"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          <button
            id="register-name-btn"
            type="submit"
            className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-400 active:scale-98 transition-all font-display font-black italic uppercase text-xs text-zinc-950 tracking-widest rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-6"
          >
            <Swords className="w-4 h-4 text-zinc-950" />
            SECURE FIGHTER NAME
          </button>
        </form>

        {/* Demonstration Info Footer */}
        <div className="text-[9px] font-mono text-zinc-500 text-center leading-tight">
          To test duplicate validation, try selecting a seeded legend name like <b className="text-zinc-400">fedor</b>, <b className="text-zinc-400">gareth</b>, or <b className="text-zinc-400">chael_sonnen</b>!
        </div>
      </motion.div>
    </div>
  );
}
