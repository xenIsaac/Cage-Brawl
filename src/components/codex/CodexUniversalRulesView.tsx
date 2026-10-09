import React, { useState } from 'react';
import { 
  Shield, Swords, Zap, Activity, Flame, Target, 
  RotateCcw, Compass, ArrowRight, CheckCircle2, AlertTriangle, 
  Sparkles, Layers, Cpu, FastForward, HeartPulse, Scale, Eye
} from 'lucide-react';

interface RuleSection {
  id: string;
  title: string;
  icon: any;
  badge: string;
  badgeColor: string;
  summary: string;
  keyPoints: { label: string; value: string; desc: string }[];
  breakdown: string;
  tips: string[];
}

export const CodexUniversalRulesView: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('striking');

  const ruleSections: RuleSection[] = [
    {
      id: 'striking',
      title: 'Striking & Attack Cadence',
      icon: Swords,
      badge: 'OFFENSE CADENCE',
      badgeColor: 'text-red-400 bg-red-950/60 border-red-800/60',
      summary: 'Light attack 4-stage cadence, heavy strike windups, unblocked hitstun frame advantage, and whiff recovery timelines.',
      keyPoints: [
        { label: '4-Stage Light Cadence', value: 'S1 → S2 → S3 → S4', desc: 'Light attacks (M1) chain in a 4-hit progression ending in an S4 Finisher with peak hitstun and pushback.' },
        { label: 'Universal Hitstun', value: '0.45s (27 Frames)', desc: 'Direct unblocked hits lock target movement, steering, and attack actions, guaranteeing frame advantage.' },
        { label: 'Heavy Windup Interruption', value: 'Vulnerable Windup', desc: 'Charging standard Heavy attacks (M2) can be interrupted by incoming strikes unless the style has Super Armor.' },
        { label: 'Whiff Recovery Lag', value: 'Attack Cooldown', desc: 'Missing strikes incurs recovery frames before initiating another action, enabling range whiff punishes.' },
      ],
      breakdown: 'Striking is governed by kinetic momentum and spacing. Light attack strings allow rapid pressure and frame traps, with S4 finishers driving opponents back. Heavy strikes demand deliberate timing: mistiming a windup against an alert opponent will result in your heavy attack being cleanly interrupted.',
      tips: [
        'Hit-confirm your light attack chain before committing to an S4 finisher.',
        'Interrupt opponent heavy attack windups with snappy light jabs before their strike active frames begin.',
        'Spaced whiff-punishing: bait an opponent attack just outside their reach, then step in during their recovery.'
      ]
    },
    {
      id: 'defense',
      title: 'Guard, Parry & Post-Block Delay',
      icon: Shield,
      badge: 'DEFENSE & RECOVERY',
      badgeColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-800/60',
      summary: 'Directional guard frontal arcs, active parry deflection, post-block attack delays, and Armor HP guard breaks.',
      keyPoints: [
        { label: 'Continuous Chain Parrying', value: '0s Block Cooldown', desc: 'Landing a Perfect Parry instantly clears block lockouts and resets the block timer to 0, allowing you to chain-parry continuous multi-hit flurries without block destruction.' },
        { label: 'Post-Block Attack Delay', value: '0.45s (27 Frames)', desc: 'Dropping active guard or recovering from a blocked hit enforces a 0.45s attack delay, preventing mindless counter-mashing.' },
        { label: 'Directional Guard Arc', value: '140° Frontal Cone', desc: 'Blocking only absorbs attacks arriving in front of your fighter. Side flanks and rear strikes completely bypass guard.' },
        { label: 'Block-to-Dash Cancel', value: 'Instant Recovery', desc: 'Pressing Dash while guarding or during post-block delay cancels guard directly into a Dash and clears the 0.45s delay.' },
        { label: 'Parry Window & Deflection', value: '0.19s Window', desc: 'Tapping block right as a strike lands deflects 100% damage and staggers the attacker. Holding block prevents parrying.' },
      ],
      breakdown: 'Defense requires proactive timing rather than static turtling. Releasing guard imposes a strict 0.45s (27 frames) post-block attack delay, during which you cannot immediately swing back. To escape safely, use the Block-to-Dash cancel to reset neutral or time a clean Parry to reverse momentum. In v1.7.6 Part 3, successful parries completely eliminate block cooldowns, enabling continuous chain parrying against rapid flurries.',
      tips: [
        'Chain-parry multi-hit combos: since successful parries reset block cooldown to 0, you can cleanly parry each incoming punch of an opponent sequence.',
        'Never drop guard and immediately mash M1; the 0.45s post-block delay will lock you out while the opponent attacks.',
        'If pressured under heavy guard, cancel your block directly into an evasive Dash to reset neutral.'
      ]
    },
    {
      id: 'movement',
      title: 'Dash, I-Frames & Dodge System',
      icon: FastForward,
      badge: 'EVASION & I-FRAMES',
      badgeColor: 'text-purple-400 bg-purple-950/60 border-purple-800/60',
      summary: 'Quickstep dashes grant complete strike invulnerability frames (I-Frames), triggering Dodge events on incoming attacks.',
      keyPoints: [
        { label: 'Quickstep Dash I-Frames', value: '18 Frames (~0.30s)', desc: 'Dashing grants full strike invulnerability (18 frames; 15 frames for Capoeira), phasing cleanly through attacks.' },
        { label: 'Dodge System (DODGED!)', value: 'Hitbox Phase', desc: 'Enemy strikes contacting during active I-Frames are completely evaded with blue sparkle bursts and audio confirmation.' },
        { label: 'Dash Cooldown', value: '1.50s (90 Frames)', desc: 'Enforces a 90-frame cooldown (58 frames / ~0.97s for Capoeira) between quickstep bursts to prevent evasive spam.' },
        { label: 'Concussion Penalty', value: '-60% Velocity', desc: 'Suffering an S4 finisher or heavy strike inflicts Concussion (1.8s), reducing dash force and movement speed by 60%.' },
      ],
      breakdown: 'The Dodge System allows skilled fighters to phase cleanly through incoming attacks. Dashing grants complete strike invulnerability across its 18-frame (~0.30s) duration. When an opponent fist connects during these I-Frames, the engine awards a clean DODGED! event with visual blue spark telemetry and zero damage taken.',
      tips: [
        'Dash forward directly through an opponent heavy windup to position yourself behind them for an unblockable rear strike.',
        'Capoeira fighters enjoy a 35% shorter dash cooldown (58 frames vs 90 frames), enabling aggressive elusive repositions.',
        'Avoid dashing while Concussed; the 60% speed penalty severely shortens your evasive distance.'
      ]
    },
    {
      id: 'stamina',
      title: 'Sprint, Stamina & Post-Sprint Delay',
      icon: Zap,
      badge: 'MOBILITY & BUFFER ENGINE',
      badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-800/60',
      summary: 'Sprint speed acceleration, 0.18s post-sprint M1 lockout, and the 1.5s Sprint Striker offensive buffer window.',
      keyPoints: [
        { label: 'Sprint Speed Boost', value: '+35% Velocity', desc: 'Holding sprint provides +35% acceleration, consuming ~13 stamina/second from the 100-stamina pool.' },
        { label: 'Post-Sprint Delay', value: '0.18s (11 Frames)', desc: 'Exiting or releasing sprint imposes a 0.18s M1 attack lockout, preventing instant sprint-rushing light punches.' },
        { label: 'Sprint Striker Buffer', value: '1.5s (90f) Hit-Buff', desc: 'Landing any strike activates a 1.5s window that completely bypasses the 0.18s lockout, allowing instant M1 attacks.' },
        { label: 'Stamina Regeneration', value: '2.0s Cooldown Delay', desc: 'Stamina regenerates at ~13.2/s after standing/walking; stopping sprint triggers a 2.0s delay before refill begins.' },
      ],
      breakdown: 'Stamina exclusively powers the Sprint system. To prevent cheap runaway hit-and-run tactics, releasing sprint imposes a 0.18s (11 frames) post-sprint M1 attack delay. However, landing any strike activates the 1.5s Sprint Striker Buffer: while this buffer is active, you can sprint and instantly attack with 0 delay. Landing an S4 finisher consumes this buffer.',
      tips: [
        'Land a poke first to activate the 1.5s Sprint Striker Buffer, allowing you to sprint in and chain attacks with zero post-sprint delay.',
        'Pressing M2 Heavy during sprint cancels sprint and locks out sprinting for the entire duration of the heavy attack.',
        'Allow the 2.0s post-sprint delay to expire so your stamina can regenerate before your next sprint pursuit.'
      ]
    },
    {
      id: 'height',
      title: 'Height & Biomechanics Scaling',
      icon: Scale,
      badge: 'GENETICS & SIZING',
      badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60',
      summary: 'Height dynamically scales arm reach, movement speed, stamina regeneration rates, and hurtbox dimensions.',
      keyPoints: [
        { label: 'Micro Tier (4\'11" - 5\'2")', value: '-26% CD & +30% Regen', desc: 'Compact agile frame: -26% attack CD, +25% execution speed, +30% stamina regen, -10% dash CD, 90 HP.' },
        { label: 'Short Tier (5\'3" - 5\'7")', value: 'High Tempo', desc: 'Fast inside fighting: -15% to -5% attack CD, +10% to +20% stamina regen, 92–98 HP.' },
        { label: 'Average Tier (5\'8" - 6\'0")', value: '1.00x Baseline', desc: 'Balanced athletic frame with standard 100 HP, 1.00x damage, 1.00x speed, and 1.80x canvas scale.' },
        { label: 'Tall Tier (6\'1" - 6\'8")', value: '+6% to +12% Power', desc: 'Extended reach: +6% to +12% damage, +1% to +2% DR, 105–110 HP, +5% dash travel distance.' },
        { label: 'Giant Tier (6\'9" - 7\'2")', value: '+18% Power & +3% DR', desc: 'Colossal frame: +18% damage, 115 HP (+15%), +3% passive DR, +10% dash distance, -35% stamina regen.' },
      ],
      breakdown: 'Fighter height introduces true biomechanical trade-offs. Taller fighters dominate outside spacing with extended reach and higher sprint speed, but regenerate stamina slower. Shorter fighters have smaller hitboxes and faster stamina refill, excelling in close-quarters inside exchanges.',
      tips: [
        'Taller fighters should utilize linear jabs and spacing to keep shorter opponents at the boundary of their reach.',
        'Shorter fighters should use quickstep dashes to close distance and fight in the inside pocket.',
        'Adjust your height in the Genetics Lab to match your preferred combat pacing.'
      ]
    },
    {
      id: 'status_effects',
      title: 'Status Effects',
      icon: Activity,
      badge: 'STATUS & DEBUFF ENGINE',
      badgeColor: 'text-rose-400 bg-rose-950/60 border-rose-800/60',
      summary: 'Comprehensive encyclopedia of all combat debuffs, impairment statuses, physical injuries, and action lockouts.',
      keyPoints: [
        { label: 'Cripple', value: '-15% Move Speed', desc: 'Slows the afflicted fighter\'s movement velocity by 15%, reducing footwork maneuverability and evasive retreat speed.' },
        { label: 'Super Cripple', value: '-60% Move & Dash / M1 & M2 Locked', desc: 'Severe kinetic trauma. Movement speed and dash distance are reduced by 60%, and all offensive strikes (both M1 light attacks and M2 heavy attacks) are strictly disabled for the duration.' },
        { label: 'Bone Fracture', value: '-40% Strike Execution Speed', desc: 'Fractured bone structure. All light strike attack windups and execution speeds are slowed down by 40% (x0.60 execution multiplier).' },
        { label: 'Broken (Armor Break)', value: 'Complete Guard Shatter', desc: 'Afflicted fighter\'s guard armor has been completely broken. Renders the fighter temporarily defenseless and staggered.' },
        { label: 'Stun', value: 'Complete Action Freeze', desc: 'Fighter is stunned and immobilized, unable to strike, steer, dash, or guard for the entire stun duration.' },
        { label: 'Downed (Spin Out)', value: 'Involuntary Rotation & Slide', desc: 'Fighter loses footing, sliding across the floor in a continuous spin. All combat actions, strikes, and defense are locked until recovery.' },
        { label: 'Trauma Stagger', value: '+60% Windups & -30% Speed', desc: 'Blunt impact trauma causes heavy physical disorientation: increases strike windup times by +60%, slows move speed by 30%, and induces drift.' },
        { label: 'Vulnerable (Over-Extended)', value: '+30% DMG Taken / No Parry', desc: 'Afflicted fighter takes +30% increased damage from all incoming hits, move speed is reduced by 60%, and parrying is entirely disabled.' },
        { label: 'Disrupted (Shaky Vision)', value: 'Sensory Distortion', desc: 'Violent head trauma causes rapid perspective vibration and screen distortion, impairing aiming precision and visual clarity.' },
        { label: 'Concussion', value: '-60% Velocity & Dash Range', desc: 'Suffering a heavy impact or finisher inflicts a 60% velocity penalty on walking speed and quickstep dash travel distance.' },
        { label: 'Exhausted', value: 'Physical Depletion', desc: 'Stamina or dodge capacity is fully spent. Movement and offensive actions are severely impaired or halted until energy recovers.' },
        { label: 'Posture Broken', value: 'Defensive Delay & Vulnerability', desc: 'Guard posture depleted. Imposes a recovery cooldown before defensive guard can be safely raised again.' }
      ],
      breakdown: 'Status effects represent real-time physical trauma, biomechanical breakdown, and kinetic consequences inflicted during exchanges. Each debuff has a distinct physiological impact: Cripples degrade mobility, Fractures impede striking speed, Stuns and Lockouts disable action queues, while Vulnerabilities expose fighters to amplified incoming damage. Recognizing active status icons and tracking remaining durations is essential for capitalizing on opponent weaknesses or surviving your own debuffs.',
      tips: [
        'Watch opponent status boxes: when they are afflicted with Bone Fracture, their attacks come out 40% slower, giving you easy reaction and parry timing.',
        'When suffering from Super Cripple, focus strictly on defensive repositioning and parrying since M1 and M2 attacks are locked.',
        'Hover over or touch any status box on the HUD to immediately inspect its name and exact remaining duration.'
      ]
    },
    {
      id: 'quests_engine',
      title: 'Quest State Engine & Gauntlet Rules',
      icon: Target,
      badge: 'SECTION 6.5 RULES',
      badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-800/60',
      summary: 'Rules of the Singleplayer Quest Engine, strict telemetry progress isolation, streak round-loss reset hook, and The Unbroken Gauntlet.',
      keyPoints: [
        { label: 'Strict Progress Isolation', value: 'Zero Pre-Buffering', desc: 'Telemetry only records objectives for the 10 quests actively displayed in your active slots. Quests waiting to cycle in cannot accumulate hidden progress.' },
        { label: 'Round-Loss Failure Hook', value: 'Immediate Streak Wipe', desc: 'Any quest requiring "without losing a round" binds to round combat events. Dropping even one round instantly resets active streak progress to 0.' },
        { label: 'T5 The Unbroken Gauntlet', value: '10 Bots (5 Segments)', desc: 'Must win 2 consecutive bots per style. After every 2-win segment, you must switch to an eligible different fighting style before the 3rd bot.' },
        { label: '3-Cycle Style Cooldown', value: 'Anti-Duplicate Memory', desc: 'Once a style completes a 2-bot segment, it enters a 3-cycle cooldown. You must win with at least 3 other distinct styles before reusing it.' },
        { label: 'The Generous Mercy Rule', value: 'No Progress / No Wipe', desc: 'Accidentally using a repeat or cooldown style will NOT wipe your 10-bot streak, but the win will not be counted until you switch to a valid style.' },
        { label: 'Skip Limitation Matrix', value: '1hr Cooldown Pools', desc: 'Tier 1 & 2: 5 skips before 1h CD; Tier 3: 2 skips before 1h CD; Tier 4: 1 skip before 1h CD; Tier 5: 1 skip following the 24h tier cooldown.' },
      ],
      breakdown: 'Section 6.5 stabilizes the Singleplayer Quest Engine with absolute telemetry isolation and explicit failure hooks. Streak quests enforce zero-tolerance round losses, while The Unbroken Gauntlet tests true multi-style martial mastery across 10 Ranked Bots with a dynamic 5-segment martial progress bar.',
      tips: [
        'Before starting Bot 3, 5, 7, or 9 in The Unbroken Gauntlet, switch styles in the menu to advance the segment without triggering the Mercy Rule.',
        'Inspect the 3-Cycle Style Cooldown pills on the quest card to verify which styles are currently in cooldown before entering the cage.',
        'Remember that skipping a quest swaps it for a random alternative in that tier without granting free completion.'
      ]
    }
  ];

  const currentSection = ruleSections.find(s => s.id === activeCategory) || ruleSections[0];

  return (
    <div className="space-y-4 max-w-5xl mx-auto select-none">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border border-zinc-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-amber-400 uppercase tracking-widest font-bold">
                COMBAT ENGINE ENCYCLOPEDIA
              </span>
              <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                UNIVERSAL RULES
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-display font-black italic uppercase text-white tracking-wide">
              OCTAGON GAMEPLAY & PHYSICS MECHANICS
            </h2>
          </div>
        </div>
        <div className="text-[10px] font-mono text-zinc-400">
          Applies uniformly across all fighting styles and modes
        </div>
      </div>

      {/* Category Pills Selector */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {ruleSections.map((section) => {
          const Icon = section.icon;
          const isActive = section.id === activeCategory;
          return (
            <button
              key={section.id}
              onClick={() => setActiveCategory(section.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition cursor-pointer border ${
                isActive
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm'
                  : 'bg-zinc-900/70 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-850'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-zinc-400'}`} />
              <span>{section.title}</span>
            </button>
          );
        })}
      </div>

      {/* Detailed Section View */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
        
        {/* Section Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-850 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-amber-400">
              <currentSection.icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-display font-black uppercase italic text-white">
                {currentSection.title}
              </h3>
              <p className="text-xs text-zinc-400 font-sans">
                {currentSection.summary}
              </p>
            </div>
          </div>

          <span className={`text-[9px] font-mono px-2.5 py-1 rounded-lg border font-bold uppercase ${currentSection.badgeColor}`}>
            {currentSection.badge}
          </span>
        </div>

        {/* Key Metrics & Rules Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {currentSection.keyPoints.map((pt, i) => (
            <div key={i} className="bg-zinc-950/90 border border-zinc-850 p-3 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-display font-black uppercase text-zinc-200 tracking-wide">
                  {pt.label}
                </span>
                <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                  {pt.value}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                {pt.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Engine Breakdown */}
        <div className="bg-zinc-950/60 border border-zinc-850/80 p-3.5 rounded-xl space-y-1">
          <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest block">
            MECHANICAL SUMMARY & ENGINE INTEGRATION
          </span>
          <p className="text-xs sm:text-[13px] text-zinc-300 font-sans leading-relaxed">
            {currentSection.breakdown}
          </p>
        </div>

        {/* Pro Tips Box */}
        <div className="bg-amber-950/15 border border-amber-500/30 p-3.5 rounded-xl space-y-2">
          <span className="text-[9px] font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>CHAMPION STRIKER TIPS</span>
          </span>
          <ul className="space-y-1.5">
            {currentSection.tips.map((tip, i) => (
              <li key={i} className="text-xs text-zinc-300 font-sans flex items-start gap-2">
                <span className="text-amber-400 font-bold shrink-0 mt-0.5">▸</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>

    </div>
  );
};
