import React from 'react';
import { FightingStyle } from '../../types';
import { Zap, Shield, Target, Move, Flame, Clock, Sparkles } from 'lucide-react';
import { CODEX_INTEL } from '../../data/codexData';

interface CodexStatsMatrixProps {
  style: FightingStyle;
}

export const CodexStatsMatrix: React.FC<CodexStatsMatrixProps> = ({ style }) => {
  const intel = CODEX_INTEL[style.id];
  const mods = style.statModifiers;

  // Stat specifications list with base comparisons
  const statsList = [
    {
      name: 'Strike Speed',
      value: mods.speed,
      icon: Zap,
      baseline: 1.0,
      description: 'Startup animation velocity & combo recovery rhythm',
      unit: 'x multiplier',
    },
    {
      name: 'Reach / Range',
      value: mods.reach,
      icon: Target,
      baseline: 1.0,
      description: 'Linear punch extension & kicking radius distance',
      unit: 'x multiplier',
    },
    {
      name: 'Strike Power',
      value: mods.power,
      icon: Flame,
      baseline: 1.0,
      description: 'Base physical damage output across all light & heavy attacks',
      unit: 'x multiplier',
    },
    {
      name: 'Defense / Resilience',
      value: mods.defense,
      icon: Shield,
      baseline: 1.0,
      // Note: for defense in the game, 0.90x means takes +10% damage, 1.00x is standard, 0.82x takes 10% less damage (Kyokushin)
      description: 'Damage absorption ratio & hitstun recovery resistance',
      unit: 'x multiplier',
    },
    {
      name: 'Knockback Vector',
      value: mods.knockback,
      icon: Move,
      baseline: 1.0,
      description: 'Kinetic distance target is projected on finisher impacts',
      unit: 'x multiplier',
    },
  ];

  // Dynamic status traits derived from style mechanics
  const getDynamicStatusBadges = () => {
    const badges: { label: string; type: 'buff' | 'neutral' | 'special'; desc: string }[] = [];

    if (style.id === 'slugger') {
      badges.push({ label: '+40% HYPER POWER', type: 'buff', desc: 'All strikes deal 1.40x damage' });
      badges.push({ label: 'KINETIC COUNTER', type: 'special', desc: '0.10s S1 windup after dash' });
      badges.push({ label: '+15% VULNERABILITY', type: 'neutral', desc: 'Takes +15% increased damage' });
    } else if (style.id === 'street_boxing') {
      badges.push({ label: '+22% EXECUTION SPEED', type: 'buff', desc: 'Blistering M1 and M2 execution cadence' });
      badges.push({ label: 'x0.40 POCKET CLING', type: 'buff', desc: 'Ultra-low knockback keeps enemies pinned in the pocket' });
      badges.push({ label: 'UNPARRYABLE FLURRY', type: 'special', desc: 'Landing Strike 1 makes Strikes 2 & 3 unparryable' });
      badges.push({ label: '0.1s POSTURE BLITZ', type: 'special', desc: 'Landing all 3 hits drops next Posture CD to 0.1s' });
      badges.push({ label: 'SNAPPING COUNTER', type: 'special', desc: 'Parrying grants +80% speed to next M1 strike' });
      badges.push({ label: '+10% VULNERABILITY', type: 'neutral', desc: '0.90x absorption: takes +10% increased damage' });
    } else if (style.id === 'muay_thai') {
      badges.push({ label: '2.0x CHIP ATTRITION', type: 'buff', desc: 'Double chip damage through guards' });
      badges.push({ label: '0.10s BREACH KNEE', type: 'special', desc: 'Near-instant M2 against blocking foes' });
      badges.push({ label: '+0.20s PARRY WINDOW', type: 'buff', desc: 'Iron guard broadens parry timing' });
    } else if (style.id === 'shotokan') {
      badges.push({ label: '+10% ICHI-GEKI SPEED', type: 'buff', desc: 'All strike startups execute 10% faster' });
      badges.push({ label: '+10% POINT-BLANK DMG', type: 'buff', desc: 'Bonus damage inside pocket range' });
      badges.push({ label: 'BLITZ DASH I-FRAMES', type: 'special', desc: 'M2 wheel kick blitz crosses range safely' });
    } else if (style.id === 'ashihara') {
      badges.push({ label: 'SABAKI PARRY LOOP', type: 'special', desc: 'Freeze counter & instant M2 CD refund' });
      badges.push({ label: 'PARRY SUPPRESSION', type: 'buff', desc: 'M2 disables opponent parrying for 1.0s' });
      badges.push({ label: 'INVULNERABLE SWEEP', type: 'buff', desc: 'S4 Ashibarai has 100% active I-Frames' });
    } else if (style.id === 'capoeira') {
      badges.push({ label: '35% FASTER DASHES', type: 'buff', desc: 'Malícia momentum rapid dash resets' });
      badges.push({ label: '+20% WHIFF MOMENTUM', type: 'special', desc: 'Whiffing attacks charges +20% damage' });
      badges.push({ label: 'S3 SPIN I-FRAMES', type: 'buff', desc: 'Queixada spin has built-in invulnerability' });
    } else if (style.id === 'kickboxing') {
      badges.push({ label: 'CADENCE OPENING JABS', type: 'buff', desc: 'S1/S2 execute +10% faster' });
      badges.push({ label: 'CHAIN REACTION (0.25s M2)', type: 'special', desc: 'Landing S4 drops M2 windup to 0.25s' });
      badges.push({ label: '80% ARMOR STRIP TEEP', type: 'buff', desc: 'Two-stage heavy destroys armor HP' });
    } else if (style.id === 'street_taekwondo') {
      badges.push({ label: 'COUNTER-BAIT (0.8s I-FRAMES)', type: 'buff', desc: 'Parries against spin dash trigger I-Frames' });
      badges.push({ label: '+8% COMBO ACCELERATION', type: 'buff', desc: 'Landing M2 boosts next light sequence speed' });
      badges.push({ label: 'AIRBORNE I-FRAME KICK', type: 'special', desc: 'S3 jumping kick evades low strikes' });
    } else if (style.id === 'kyokushin') {
      badges.push({ label: 'SUPER ARMOR M2', type: 'buff', desc: 'M2 windup cannot be interrupted' });
      badges.push({ label: 'UNBREAKABLE HP GUARD', type: 'buff', desc: 'Immune to standard guard breaks' });
      badges.push({ label: '12.0s LEG CRIPPLE', type: 'special', desc: 'Low kick inflicts -15% movement slow' });
    } else if (style.id === 'keysi') {
      badges.push({ label: '184° PENSADOR GUARD', type: 'buff', desc: 'Wide protective shell charges lunges' });
      badges.push({ label: 'POCKET PROXIMITY (+10%)', type: 'buff', desc: '+10% speed/power inside pocket range' });
      badges.push({ label: '1.1s ATTACK LOCKOUT', type: 'special', desc: 'M2 shatters guard and disables attacks' });
    } else if (style.id === 'boxing_shell') {
      badges.push({ label: '+50% SNAPPING LEADS', type: 'buff', desc: 'S1 & S2 jabs execute at 1.50x velocity' });
      badges.push({ label: 'SHOULDER ROLL DEFLECTION', type: 'special', desc: 'Super armor deflection spins foe out 1.5s' });
      badges.push({ label: '2x POSTURE RECOVERY', type: 'buff', desc: 'Landing M2 doubles stamina recovery speed' });
    } else if (style.id === 'cqc') {
      badges.push({ label: 'TACTICAL ACCELERATION', type: 'buff', desc: 'Each landed hit speeds combo by +0.15s' });
      badges.push({ label: '0.0s POSTURE RESET', type: 'special', desc: 'Landing M2 resets Posture CD to zero' });
      badges.push({ label: '2.0s REAR LOCKOUT BLITZ', type: 'special', desc: '5-hit assault disables opponent attacks' });
    } else {
      badges.push({ label: 'REFLEX PIVOT (0.10s M2)', type: 'special', desc: 'Dash dodge reduces M2 windup to 0.10s' });
      badges.push({ label: '1.50x KNOCKBACK S4', type: 'buff', desc: 'High pushback straight punch' });
      badges.push({ label: 'BALANCED BASELINE', type: 'neutral', desc: 'Zero penalty 1.00x stats' });
    }

    return badges;
  };

  const statusBadges = getDynamicStatusBadges();

  return (
    <div className="space-y-4">
      {/* Top Combat Profile Card */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
          <div>
            <span className="text-[9px] font-mono text-amber-400 uppercase tracking-widest font-bold block">
              COMBAT PROFILE & ARCHETYPE
            </span>
            <h3 className="text-base sm:text-lg font-display font-black uppercase text-white tracking-tight">
              {style.name} • {intel?.archetype || 'Martial Combatant'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-zinc-950 text-zinc-300 border border-zinc-800">
              Difficulty: <strong className="text-amber-400">{intel?.difficulty || 'Intermediate'}</strong>
            </span>
          </div>
        </div>

        {/* Dynamic Status Badges */}
        <div>
          <span className="text-[8px] font-mono text-zinc-400 uppercase tracking-wider block font-bold mb-1.5">
            DYNAMIC STATUS TRAITS & MODIFIERS
          </span>
          <div className="flex flex-wrap gap-1.5">
            {statusBadges.map((badge, idx) => (
              <div
                key={idx}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold border flex items-center gap-1.5 ${
                  badge.type === 'buff'
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50'
                    : badge.type === 'special'
                    ? 'bg-amber-950/60 text-amber-300 border-amber-700/50'
                    : 'bg-zinc-950 text-zinc-300 border-zinc-750'
                }`}
                title={badge.desc}
              >
                <Sparkles className="w-3 h-3 shrink-0" />
                <span>{badge.label}</span>
                <span className="text-[8px] text-zinc-400 font-normal hidden sm:inline">({badge.desc})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Numerical Stats Multipliers Matrix */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest font-bold">
            STATISTICAL MULTIPLIERS (COMPARED TO 1.00x BASELINE)
          </span>
          <span className="text-[9px] font-mono text-amber-400">1.00x = Standard Baseline</span>
        </div>

        <div className="space-y-3">
          {statsList.map((stat, idx) => {
            const Icon = stat.icon;
            const diff = stat.value - stat.baseline;
            const percentage = Math.round(diff * 100);
            const isPositive = diff > 0;
            const isNegative = diff < 0;

            // Normalize for visual progress bar (range ~ 0.5x to 1.5x)
            const barWidthPercent = Math.min(Math.max((stat.value / 1.5) * 100, 10), 100);

            return (
              <div key={idx} className="bg-zinc-950/80 border border-zinc-850 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-zinc-900 text-amber-400 border border-zinc-800">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-display font-bold uppercase text-white tracking-wide">
                        {stat.name}
                      </span>
                      <p className="text-[10px] text-zinc-400 font-sans leading-tight">
                        {stat.description}
                      </p>
                    </div>
                  </div>

                  {/* Stat Value Badge */}
                  <div className="text-right">
                    <span className="text-sm font-mono font-black text-white">
                      {stat.value.toFixed(2)}x
                    </span>
                    <span className={`block text-[9px] font-mono font-bold ${
                      isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-zinc-400'
                    }`}>
                      {isPositive ? `+${percentage}%` : isNegative ? `${percentage}%` : 'Standard'}
                    </span>
                  </div>
                </div>

                {/* Progress Visualizer Bar */}
                <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800 relative">
                  {/* Baseline 1.0x marker */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-zinc-600 z-10"
                    style={{ left: `${(1.0 / 1.5) * 100}%` }}
                    title="1.00x Baseline"
                  />
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isPositive ? 'bg-gradient-to-r from-amber-500 to-emerald-400' :
                      isNegative ? 'bg-gradient-to-r from-amber-600 to-rose-500' : 'bg-amber-400'
                    }`}
                    style={{ width: `${barWidthPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Posture & Recovery Dynamics */}
      <div className="bg-zinc-900/90 border border-amber-500/30 rounded-2xl p-4 space-y-2.5">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-display font-bold uppercase text-white tracking-wide">
            Posture Cooldown & Input Lockout Dynamics
          </span>
        </div>
        <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
          In the 60 FPS combat engine, completing your 4-strike light combo (S4) places your stance into a Posture Cooldown state. During this cooldown, M1 light attacks are locked while defensive parries, dodges, and M2 heavy strikes remain active.
        </p>
      </div>
    </div>
  );
};
