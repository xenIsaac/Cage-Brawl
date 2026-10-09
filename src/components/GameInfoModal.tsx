import React from 'react';
import { 
  Info, ArrowLeft, Terminal, Shield, Zap, Sparkles, CheckCircle2, RefreshCw, Cpu, Activity
} from 'lucide-react';
import { soundManager } from './SoundManager';

interface GameInfoModalProps {
  version: string;
  onClose: () => void;
  isNavHidden?: boolean;
}

interface M1StatProps {
  damageValue: string;
  damagePct: number;
  damageColor?: string;
  speedValue: string;
  speedPct: number;
  speedColor?: string;
  knockbackValue: string;
  knockbackPct: number;
  rangeValue: string;
  sequenceSteps: { stage: string; name: string; note?: string }[];
}

function M1StyleStatBar({
  damageValue,
  damagePct,
  damageColor = 'bg-emerald-500',
  speedValue,
  speedPct,
  speedColor = 'bg-amber-500',
  knockbackValue,
  knockbackPct,
  rangeValue,
  sequenceSteps
}: M1StatProps) {
  return (
    <div className="space-y-3 pt-1">
      {/* VISUAL STAT BARS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-xs">
        {/* M1 Damage Bar */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-2.5 rounded-xl space-y-1.5 shadow-inner">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-400 font-bold uppercase tracking-wider">M1 Strike Damage</span>
            <span className="text-emerald-400 font-black">{damageValue}</span>
          </div>
          <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800/80 p-0.5">
            <div 
              className={`${damageColor} h-full rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(100, Math.max(10, damagePct))}%` }}
            />
          </div>
        </div>

        {/* Execution Speed Bar */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-2.5 rounded-xl space-y-1.5 shadow-inner">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-400 font-bold uppercase tracking-wider">Execution / Inter-Combo Pace</span>
            <span className="text-amber-400 font-black">{speedValue}</span>
          </div>
          <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800/80 p-0.5">
            <div 
              className={`${speedColor} h-full rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(100, Math.max(10, speedPct))}%` }}
            />
          </div>
        </div>

        {/* Knockback Force Bar */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-2.5 rounded-xl space-y-1.5 shadow-inner">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-400 font-bold uppercase tracking-wider">Knockback Displacement</span>
            <span className="text-cyan-400 font-black">{knockbackValue}</span>
          </div>
          <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800/80 p-0.5">
            <div 
              className="bg-cyan-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(10, knockbackPct))}%` }}
            />
          </div>
        </div>

        {/* Hitbox Arc & Reach */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-2.5 rounded-xl flex items-center justify-between shadow-inner">
          <span className="text-zinc-400 font-bold uppercase text-[11px] tracking-wider">Hitbox Reach & Geometry</span>
          <span className="text-purple-300 font-black text-xs bg-purple-950/80 border border-purple-800/80 px-2.5 py-0.5 rounded-lg shadow-sm">
            {rangeValue}
          </span>
        </div>
      </div>

      {/* VISUAL 4-STAGE SEQUENCE CHAIN */}
      <div className="space-y-1.5 pt-1">
        <div className="text-[11px] font-mono text-zinc-400 font-bold uppercase tracking-wider flex items-center justify-between">
          <span>4-Stage M1 Sequence Chain</span>
          <span className="text-[10px] text-cyan-400 font-mono">Dynamic Flow</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
          {sequenceSteps.map((step, idx) => (
            <div key={idx} className="bg-zinc-900/90 border border-cyan-500/30 p-2.5 rounded-xl space-y-1 shadow-sm hover:border-cyan-500/60 transition">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-cyan-300 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800/80">
                  {step.stage}
                </span>
                <span className="text-[9px] text-zinc-500 font-bold">Stage {idx + 1}</span>
              </div>
              <div className="text-xs font-bold text-white leading-tight">{step.name}</div>
              {step.note && <div className="text-[10px] text-zinc-400 leading-snug">{step.note}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GameInfoModal({ version, onClose, isNavHidden = false }: GameInfoModalProps) {
  const formattedVersion = version.startsWith('v') ? version : `v${version}`;

  return (
    <div className={`fixed inset-0 z-[120] bg-zinc-950 text-white flex flex-col select-none overflow-hidden transition-all duration-300 ${
      isNavHidden ? 'pl-0' : 'pl-14 sm:pl-16'
    }`}>
      {/* 1. TOP HEADER BAR */}
      <div className="px-4 sm:px-8 py-3.5 border-b border-zinc-800/80 bg-zinc-900/80 backdrop-blur-xl flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-950/80 border border-red-800/60 flex items-center justify-center text-red-400 font-black italic text-base sm:text-lg shadow-inner">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-xl font-display font-black italic uppercase tracking-wider text-white">
                Game Info & Patch Notes
              </h1>
              <span className="text-[10px] font-mono font-bold bg-sky-500/10 text-sky-300 border border-sky-500/30 px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                {formattedVersion}
              </span>
            </div>
            <p className="text-[10px] sm:text-xs font-mono text-zinc-400">
              Direct Rework Specifications, Buffs/Nerfs & Netcode Fixes
            </p>
          </div>
        </div>

        {/* Back Button */}
        <button
          onClick={() => {
            soundManager.playRollTick();
            onClose();
          }}
          className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-lg text-[10px] sm:text-xs font-mono font-bold uppercase transition cursor-pointer active:scale-95 shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Menu</span>
        </button>
      </div>

      {/* 2. MAIN SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 custom-scrollbar max-w-7xl w-full mx-auto">
        
        {/* FULL BOX CONTAINER HEADER */}
        <div className="bg-zinc-900/90 border-2 border-sky-500/40 p-4 sm:p-5 rounded-2xl flex items-center justify-between flex-wrap gap-3 shadow-[0_0_25px_rgba(14,165,233,0.15)]">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-sky-400 animate-pulse" />
            <div>
              <div className="text-xs font-mono text-sky-400 font-black uppercase tracking-wider">Patch Release</div>
              <div className="text-lg sm:text-2xl font-display font-black italic uppercase text-white tracking-wide">
                1.7.5 Part 3 Notes
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800">
            <span>Direct Overview</span>
            <span className="text-sky-400 font-bold">• Active Build</span>
          </div>
        </div>

        {/* MAIN DUAL COLUMN CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: REWORKS & FIXES BOXES */}
          <div className="lg:col-span-8 space-y-5">

            {/* BOX 1: KYOKUSHIN STYLE REWORKED */}
            <div className="bg-zinc-900/80 border-2 border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-md">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-mono font-bold uppercase">
                    REWORKED
                  </span>
                  <h2 className="text-base sm:text-lg font-display font-black italic uppercase text-white tracking-wide">
                    Kyokushin Style Reworked
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
                  Full-Contact Brawler
                </span>
              </div>

              {/* Passive & Stats */}
              <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 space-y-2">
                <div className="text-xs font-mono font-bold uppercase text-amber-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Passive & Stats</span>
                </div>
                <ul className="text-xs font-mono text-zinc-300 space-y-1.5 pl-4 list-disc marker:text-amber-400">
                  <li>
                    <strong className="text-white">Full-Contact Conditioning:</strong> Starts with 10% innate Damage Reduction (DR). Each hit sustained shaves off -1% DR down to 0%. Restores to 10% DR after 10.0s out of combat without taking damage.
                  </li>
                  <li>
                    <strong className="text-white">Snapping Windup:</strong> Striking attacks snap into motion +25% faster during active execution.
                  </li>
                  <li>
                    <strong className="text-white">Fudo Dachi Stance:</strong> 0% movement speed while blocking. Absorbs up to 4 hits cleanly; 5th light hit or 1 Heavy Attack Breaches Guard (3.0s guard breach lockout). Absorbing hits costs 10% HP chip + 10%/sec held.
                  </li>
                  <li>
                    <strong className="text-white">Kinetic Attrition:</strong> Absorbing hits in Fudo Dachi charges stored power. Exiting block gives +50% Chip Damage & +5% Overall Damage for 1.0s.
                  </li>
                </ul>
              </div>

              {/* M1 & Stats */}
              <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 space-y-3">
                <div className="text-xs font-mono font-bold uppercase text-cyan-400 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>M1 Combo & Stats</span>
                </div>
                <M1StyleStatBar 
                  damageValue="1.00x Base (10.0 HP/hit)"
                  damagePct={68}
                  speedValue="0.80x Pace (-20% Penalty)"
                  speedPct={80}
                  knockbackValue="1.15x Medium Heavy"
                  knockbackPct={78}
                  rangeValue="0.52-0.58x Forward Sweep"
                  sequenceSteps={[
                    { stage: 'S1', name: 'Chudan Tsuki', note: 'Lead Straight Punch' },
                    { stage: 'S2', name: 'Gedan Geri', note: 'Low Calf Kick (Leg Anim)' },
                    { stage: 'S3', name: 'Shotei Uchi', note: 'Open Palm Thrust' },
                    { stage: 'S4', name: 'Full Palm Burst', note: 'Full-Charge Finisher' }
                  ]}
                />
              </div>

              {/* M2 & Stats */}
              <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 space-y-2">
                <div className="text-xs font-mono font-bold uppercase text-red-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>M2 Heavy & Stats</span>
                </div>
                <ul className="text-xs font-mono text-zinc-300 space-y-1.5 pl-4 list-disc marker:text-red-400">
                  <li>
                    <strong className="text-white">Sonic Air Shockwave Hook:</strong> 0.55s Windup with Super Armor and Electric Blue Aura. Absorbing hits increases final strike DMG by +5% per hit taken and inflicts 0.2s micro-stun on attacker.
                  </li>
                  <li>
                    <strong className="text-white">Backside Shockwave:</strong> Unblocked or blocked hits unleash a supersonic compressed air shockwave bursting from the backside of the victim along the strike vector.
                  </li>
                  <li>
                    <strong className="text-white">Cooldown:</strong> 8.0s on Hit | 9.4s on Whiff.
                  </li>
                </ul>
              </div>
            </div>

            {/* BOX 2: SLUGGER STYLE REWORKED */}
            <div className="bg-zinc-900/80 border-2 border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-md">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold uppercase">
                    REWORKED
                  </span>
                  <h2 className="text-base sm:text-lg font-display font-black italic uppercase text-white tracking-wide">
                    Slugger Style Reworked
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
                  Kinetic Super-Heavyweight
                </span>
              </div>

              {/* Passive & Stats */}
              <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 space-y-2">
                <div className="text-xs font-mono font-bold uppercase text-amber-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Passive & Stats</span>
                </div>
                <ul className="text-xs font-mono text-zinc-300 space-y-1.5 pl-4 list-disc marker:text-amber-400">
                  <li>
                    <strong className="text-white">Kinetic Super-Heavyweight:</strong> 1.25x Base Damage | 0.68x Execution Speed (-32% heavy windup & combo speed).
                  </li>
                  <li>
                    <strong className="text-white">Kinetic Overdrive:</strong> Landing 6 M1 strikes activates Kinetic Overdrive, inflicting a <span className="text-emerald-400 font-bold">3.0s Super Cripple</span> (1.2s &gt; 3.0s) disabling opponent attacks.
                  </li>
                  <li>
                    <strong className="text-white">Bone-Crushing Attrition:</strong> Blocked M1s inflict Bone Fracture for <span className="text-emerald-400 font-bold">0.6s per stack</span> (0.4s &gt; 0.6s), reducing enemy M1 damage by -60% & execution speed by -40%.
                  </li>
                  <li>
                    <strong className="text-white">Haymaker Over-Commitment:</strong> Whiffing M2 Cataclysm triggers Haymaker Over-Commitment (-80% Movement Speed & 2.0s Action Lockout).
                  </li>
                  <li>
                    <strong className="text-white">Momentum Drag:</strong> Whiffing M1 strikes builds momentum drag, slowing recovery frames per missed strike.
                  </li>
                </ul>
              </div>

              {/* M1 & Stats */}
              <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 space-y-3">
                <div className="text-xs font-mono font-bold uppercase text-cyan-400 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>M1 Combo & Stats</span>
                </div>
                <M1StyleStatBar 
                  damageValue="1.25x Super-Heavy (12.5 HP/hit)"
                  damagePct={88}
                  damageColor="bg-rose-500"
                  speedValue="0.68x Slow (-32% Windup)"
                  speedPct={68}
                  speedColor="bg-orange-500"
                  knockbackValue="1.40x Kinetic Blast"
                  knockbackPct={95}
                  rangeValue="Air-Displacement Cone"
                  sequenceSteps={[
                    { stage: 'S1', name: 'Oversized Lead Hook', note: 'Air Displacement Wave' },
                    { stage: 'S2', name: 'Gut Right Cross', note: 'Body Concussion' },
                    { stage: 'S3', name: 'Looping Overhand', note: 'Downward Guard Crush' },
                    { stage: 'S4', name: 'Kinetic Shatter', note: 'Shatter Ground Finisher' }
                  ]}
                />
              </div>

              {/* M2 & Stats */}
              <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 space-y-2">
                <div className="text-xs font-mono font-bold uppercase text-red-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>M2 Heavy & Stats</span>
                </div>
                <ul className="text-xs font-mono text-zinc-300 space-y-1.5 pl-4 list-disc marker:text-red-400">
                  <li>
                    <strong className="text-white">Sonic Boom Cataclysm Hook:</strong> 0.80s Heavy Windup with Super Armor and Sonic Air Displacement.
                  </li>
                  <li>
                    <strong className="text-white">On Hit:</strong> Inflicts 1.0s Super Cripple + High Knockback.
                  </li>
                  <li>
                    <strong className="text-white">On Block:</strong> Deals +20% Chip Damage & inflicts <span className="text-emerald-400 font-bold">3.5s Bone Fracture</span> (1.8s &gt; 3.5s).
                  </li>
                  <li>
                    <strong className="text-white">On Whiff:</strong> Triggers 2.0s Haymaker Over-Commitment Lockout & -80% Move Speed.
                  </li>
                  <li>
                    <strong className="text-white">Cooldown:</strong> 6.0s on Hit | 8.0s on Whiff.
                  </li>
                </ul>
              </div>
            </div>

            {/* BOX 3: STYLE BUFFS & STAT CHANGES (x > y) */}
            <div className="bg-zinc-900/80 border-2 border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-md">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold uppercase">
                    BUFFS & STATS
                  </span>
                  <h2 className="text-base sm:text-lg font-display font-black italic uppercase text-white tracking-wide">
                    Style Buffs & Stat Changes (Old &gt; New)
                  </h2>
                </div>
              </div>

              {/* Aikido Buffs */}
              <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 space-y-2">
                <div className="text-xs font-mono font-bold uppercase text-sky-400 flex items-center justify-between">
                  <span>Aikido Style Buffs</span>
                  <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded border border-sky-500/40">BUFFED</span>
                </div>
                <ul className="text-xs font-mono text-zinc-300 space-y-1.5 pl-4 list-disc marker:text-sky-400">
                  <li>
                    <strong className="text-white">M2 Grapple Slam Base Damage:</strong> Base DMG: <span className="text-rose-400">12.0 HP</span> &gt; <span className="text-emerald-400 font-bold">22.0 HP</span>.
                  </li>
                  <li>
                    <strong className="text-white">M2 Grapple Slam Spin-Out:</strong> Duration: <span className="text-rose-400">0.30s</span> &gt; <span className="text-emerald-400 font-bold">0.45s</span>.
                  </li>
                  <li>
                    <strong className="text-white">Disruption & Super Cripple:</strong> Status: <span className="text-rose-400">0.0s</span> &gt; <span className="text-emerald-400 font-bold">1.0s</span> (Inflicts 1.0s Super Cripple: -60% speed & M1/M2 disabled).
                  </li>
                </ul>
              </div>
            </div>

            {/* BOX 3: HEIGHT SYSTEM & GENETICS BALANCING (v1.7.6 Part 3) */}
            <div className="bg-zinc-900/80 border-2 border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-md">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold uppercase">
                    GENETICS V1.7.6 P3
                  </span>
                  <h2 className="text-base sm:text-lg font-display font-black italic uppercase text-white tracking-wide">
                    Height System & Genetics Balancing
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
                  4'11" – 7'2" Matrix
                </span>
              </div>

              {/* Master Height Mechanics Overview */}
              <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 space-y-2">
                <div className="text-xs font-mono font-bold uppercase text-cyan-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Biomechanical Height Attributes & Scaling Laws</span>
                </div>
                <ul className="text-xs font-mono text-zinc-300 space-y-1.5 pl-4 list-disc marker:text-cyan-400">
                  <li>
                    <strong className="text-white">5 Distinct Tiers:</strong> Micro (4'11"–5'2" • 0.2%) | Short (5'3"–5'7" • 25%) | Average (5'8"–6'0" • 65%) | Tall (6'1"–6'8" • 9.5%) | Giant (6'9"–7'2" • 0.3%).
                  </li>
                  <li>
                    <strong className="text-white">Attack Speed & Execution:</strong> Shorter fighters execute strikes up to +25% faster with -26% cooldown duration; taller fighters swing with heavy kinetic inertia (+30% attack duration & cooldown).
                  </li>
                  <li>
                    <strong className="text-white">Stamina Regeneration Dynamics:</strong> Micro regenerates stamina +30% faster (1.30x); Giant tires under heavy mass (-35% slower regeneration).
                  </li>
                  <li>
                    <strong className="text-white">Dash Kinematics:</strong> Micro gets rapid recovery (-10% Dash CD, -15% distance); Giant covers massive ground (+10% Dash distance, +5% Dash CD).
                  </li>
                  <li>
                    <strong className="text-white">Damage & Absorption:</strong> Giant yields +18% strike damage and +3.0% passive mass damage reduction (DR); Micro relies on volume and rapid pacing (90 HP, 0.90x DMG).
                  </li>
                  <li>
                    <strong className="text-white">Visual Scale Enhancement:</strong> Standard baseline scaled to 1.80x canvas profile with sub-standard gentle curve (1.68x minimum), ensuring all fighter heights remain clear, readable, and substantial.
                  </li>
                </ul>
              </div>

              {/* 5-Tier Breakdown Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="bg-zinc-950/90 border border-pink-500/30 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-pink-400">
                    <span>MICRO (4'11" – 5'2")</span>
                    <span className="text-[10px] bg-pink-500/20 px-2 py-0.5 rounded border border-pink-500/40">0.2% RATE</span>
                  </div>
                  <div className="text-[11px] font-mono text-zinc-300 space-y-1">
                    <div>• <strong>HP:</strong> 90 HP (-10% pool)</div>
                    <div>• <strong>Speed:</strong> -26% Attack CD & +25% Exec</div>
                    <div>• <strong>Stamina:</strong> +30% Rapid Refill Rate</div>
                    <div>• <strong>Dash:</strong> -10% CD (~1.35s) • -15% Dist</div>
                    <div>• <strong>Scale:</strong> 1.68x Compact Stature</div>
                  </div>
                </div>

                <div className="bg-zinc-950/90 border border-cyan-500/30 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-cyan-400">
                    <span>SHORT (5'3" – 5'7")</span>
                    <span className="text-[10px] bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/40">25.0% RATE</span>
                  </div>
                  <div className="text-[11px] font-mono text-zinc-300 space-y-1">
                    <div>• <strong>HP:</strong> 92 – 98 HP</div>
                    <div>• <strong>Speed:</strong> -15% to -5% Attack CD</div>
                    <div>• <strong>Stamina:</strong> +10% to +20% Refill Rate</div>
                    <div>• <strong>Dash:</strong> -5% CD • -8% Dist</div>
                    <div>• <strong>Scale:</strong> 1.72x – 1.78x Stature</div>
                  </div>
                </div>

                <div className="bg-zinc-950/90 border border-zinc-700/60 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-white">
                    <span>AVERAGE (5'8" – 6'0")</span>
                    <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">65.0% RATE</span>
                  </div>
                  <div className="text-[11px] font-mono text-zinc-300 space-y-1">
                    <div>• <strong>HP:</strong> 100 HP (Standard baseline)</div>
                    <div>• <strong>Speed:</strong> 1.00x Attack CD & Exec</div>
                    <div>• <strong>Stamina:</strong> 1.00x Base Refill</div>
                    <div>• <strong>Dash:</strong> 1.50s Base CD • 1.00x Dist</div>
                    <div>• <strong>Scale:</strong> 1.80x Baseline Profile</div>
                  </div>
                </div>

                <div className="bg-zinc-950/90 border border-amber-500/30 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-amber-400">
                    <span>TALL (6'1" – 6'8")</span>
                    <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40">9.5% RATE</span>
                  </div>
                  <div className="text-[11px] font-mono text-zinc-300 space-y-1">
                    <div>• <strong>HP:</strong> 105 – 110 HP</div>
                    <div>• <strong>Power:</strong> +6% to +12% DMG • +1–2% DR</div>
                    <div>• <strong>Stamina:</strong> -10% to -20% Refill</div>
                    <div>• <strong>Dash:</strong> +5% Burst Distance</div>
                    <div>• <strong>Scale:</strong> 1.86x – 1.98x Reach</div>
                  </div>
                </div>

                <div className="bg-zinc-950/90 border border-fuchsia-500/30 rounded-xl p-3.5 space-y-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-fuchsia-400">
                    <span>GIANT (6'9" – 7'2")</span>
                    <span className="text-[10px] bg-fuchsia-500/20 px-2 py-0.5 rounded border border-fuchsia-500/40">0.3% RATE</span>
                  </div>
                  <div className="text-[11px] font-mono text-zinc-300 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>• <strong>HP & DR:</strong> 115 HP (+15%) • +3.0% Passive DR</div>
                    <div>• <strong>Power & Stride:</strong> +18% Strike DMG • +5% Stride</div>
                    <div>• <strong>Dash Kinematics:</strong> +10% Distance • +5% CD (~1.575s)</div>
                    <div>• <strong>Scale & Trade-off:</strong> 2.07x Scale • -35% Stamina Regen • +30% CD</div>
                  </div>
                </div>
              </div>
            </div>

            {/* BOX 4: ONLINE PVP & NETCODE FIXES */}
            <div className="bg-zinc-900/80 border-2 border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-md">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-mono font-bold uppercase">
                    NETCODE & FIXES
                  </span>
                  <h2 className="text-base sm:text-lg font-display font-black italic uppercase text-white tracking-wide">
                    Online PvP & Netcode Fixes
                  </h2>
                </div>
              </div>

              <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 space-y-2">
                <div className="text-xs font-mono font-bold uppercase text-purple-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Parry Input & Movement Fixes (Old &gt; New)</span>
                </div>
                <ul className="text-xs font-mono text-zinc-300 space-y-2 pl-4 list-disc marker:text-purple-400">
                  <li>
                    <strong className="text-white">Parry Input Reliability:</strong> Fixed guard key auto-repeat bug. Key auto-repeat no longer locks out block or parry (<span className="text-emerald-400 font-bold">1-tap and double-tap parries trigger cleanly</span>).
                  </li>
                  <li>
                    <strong className="text-white">Universal Block Refresh Window:</strong> Randomized <span className="text-cyan-400 font-bold">2–3 block taps</span> trigger a subtle <span className="text-emerald-400 font-bold">0.3s refresh window</span> (18 frames) before guard can be re-raised, preventing mindless parry mashing while keeping legit chain-parries crisp.
                  </li>
                  <li>
                    <strong className="text-white">Block Timer Sync:</strong> <span className="text-rose-400">Unsynced</span> &gt; <span className="text-emerald-400 font-bold">Synced via WebSocket</span> (0.19s Perfect Parry window registers accurately online).
                  </li>
                  <li>
                    <strong className="text-white">Opponent Movement Mode:</strong> <span className="text-rose-400">Raw Snap (Choppy Jitter)</span> &gt; <span className="text-emerald-400 font-bold">65% Lerp Position Smoothing</span>.
                  </li>
                  <li>
                    <strong className="text-white">Network Packet Frequency:</strong> <span className="text-rose-400">25 FPS (40ms)</span> &gt; <span className="text-emerald-400 font-bold">50 FPS (20ms)</span> with zero-latency immediate dispatches on M1, M2, Dash, and Guard state changes.
                  </li>
                </ul>
              </div>
            </div>

            {/* BOX 4: OTHER FIXES & SYSTEM NOTES */}
            <div className="bg-zinc-900/80 border-2 border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-md">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-0.5 rounded bg-zinc-700/40 text-zinc-300 border border-zinc-600/40 text-[10px] font-mono font-bold uppercase">
                    SYSTEM FIXES
                  </span>
                  <h2 className="text-base sm:text-lg font-display font-black italic uppercase text-white tracking-wide">
                    Other Fixes & System Notes
                  </h2>
                </div>
              </div>

              <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 space-y-2">
                <ul className="text-xs font-mono text-zinc-300 space-y-2 pl-4 list-disc marker:text-zinc-500">
                  <li>
                    <strong className="text-white">Mobile Guard Persistence:</strong> Continuous touch hold guard active. Mobile players holding block no longer drop guard upon impact during multi-hit strikes.
                  </li>
                  <li>
                    <strong className="text-white">M2 Attacker Cooldown Bug:</strong> Opponents striking Kyokushin guard no longer bypass heavy attack cooldowns; full cooldowns preserved across all styles.
                  </li>
                  <li>
                    <strong className="text-white">Engine Architecture:</strong> Fighting style kinematics, strike animations, and visual motion trails decoupled into isolated modular style scripts for smooth performance.
                  </li>
                </ul>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: QUICK CONTROL CHEAT SHEET */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-zinc-900/80 border-2 border-zinc-800 p-5 rounded-2xl space-y-4 shadow-md">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2 border-b border-zinc-800 pb-2">
                <Terminal className="w-4 h-4" />
                Default Control Mapping
              </h3>

              <div className="space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/80">
                  <span className="text-zinc-400">Movement</span>
                  <span className="text-white font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">W / A / S / D</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/80">
                  <span className="text-zinc-400">Light Attack (M1)</span>
                  <span className="text-cyan-400 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">Left Click / J</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/80">
                  <span className="text-zinc-400">Heavy Attack (M2)</span>
                  <span className="text-red-400 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">Right Click / K</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/80">
                  <span className="text-zinc-400">Guard (Block)</span>
                  <span className="text-amber-400 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">Space / L</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/80">
                  <span className="text-zinc-400">Flash Parry</span>
                  <span className="text-emerald-400 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">F / Tap Block</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/80">
                  <span className="text-zinc-400">Dash / Evade</span>
                  <span className="text-purple-400 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">Q / E</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/80">
                  <span className="text-zinc-400">Sprint</span>
                  <span className="text-emerald-400 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">Shift</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-zinc-400">Taunt Stance</span>
                  <span className="text-zinc-300 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">G</span>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/80 border-2 border-zinc-800 p-5 rounded-2xl space-y-2.5 shadow-md">
              <h4 className="text-xs font-display font-black italic uppercase text-white flex items-center justify-between">
                <span>Height Balancing (v1.7.6 P3 Final)</span>
                <span className="text-[10px] text-cyan-400 font-mono">4'11" – 7'2"</span>
              </h4>
              <div className="text-[11px] font-mono text-zinc-300 space-y-1.5 leading-relaxed">
                <div>
                  <strong className="text-pink-400">Micro (4'11"–5'2" • 0.2%):</strong> 1.68x scale, 90 HP, +30% Stamina Regen, -10% Dash CD, -26% Attack CD, +25% Exec, -15% Dash dist, -10% DMG.
                </div>
                <div>
                  <strong className="text-cyan-400">Short (5'3"–5'7" • 25%):</strong> 1.72x–1.78x scale, 92–98 HP, +10% to +20% Stamina Regen, -15% to -5% CD, +5% to +15% Exec.
                </div>
                <div>
                  <strong className="text-white">Average (5'8"–6'0" • 65%):</strong> 1.80x base scale, 100 HP, 1.00x baseline combat attributes.
                </div>
                <div>
                  <strong className="text-amber-400">Tall (6'1"–6'8" • 9.5%):</strong> 1.86x–1.98x scale, 105–110 HP, +6% to +12% DMG, +1% to +2% DR, +5% Dash dist.
                </div>
                <div>
                  <strong className="text-fuchsia-400">Giant (6'9"–7'2" • 0.3%):</strong> 2.07x scale, 115 HP, +3.0% DR, +18% DMG, +10% Dash dist, +5% Stride, -35% Stamina Regen, +30% CD, +5% Dash CD.
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 3. BOTTOM FOOTER BAR */}
      <div className="px-4 sm:px-8 py-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between shrink-0 text-xs font-mono text-zinc-500">
        <div>CAGE BRAWL • PATCH NOTES BUILD {formattedVersion}</div>
        <div className="flex items-center gap-2 text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>ONLINE PVP SYNCED</span>
        </div>
      </div>
    </div>
  );
}
