import React, { useState, useRef, useEffect } from 'react';
import { 
  Zap, ShieldAlert, Activity, Bone, Skull, AlertOctagon, 
  RotateCcw, ShieldOff, EyeOff, Wind, Lock, Flame, Shield, TrendingDown, Clock, Sparkles
} from 'lucide-react';

export interface ActiveStatusItem {
  id: string;
  name: string;
  durationSeconds: number;
  totalDurationSeconds?: number;
  source: string;              // e.g. "Slugger M2 Sonic Boom", "Keysi Clinch Trauma"
  effect: string;              // e.g. "-60% M1 Damage, -40% Execution Speed"
  color: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  icon: any;
  severity?: 'critical' | 'heavy' | 'moderate' | 'debuff' | 'buff';
}

interface StatusBarProps {
  statuses: ActiveStatusItem[];
  className?: string;
  align?: 'left' | 'right' | 'center';
  label?: string;
  fighterName?: string;
}

/**
 * 📊 SECTION 7.6: COMBAT STATUS BAR & TELEMETRY HUD
 * 
 * 7.6.1 Decoupled Status Display:
 * - Dedicated dark grey rectangle (#1C1E22 with 1px border #2A2D34) positioned beneath each fighter's gauge cluster.
 * - Minimalist square micro-icons with zero distracting countdown numbers on the in-fight bar.
 * 
 * 7.6.2 Interactive Telemetry Tooltip:
 * - PC: Hovering spawns a sleek semi-transparent Mini Tooltip.
 * - Mobile: Tapping opens tooltip, auto-closing after 2 seconds or on outside tap.
 * - Displays: Status Name, Live Countdown (e.g. 1.4s), Origin Source, and Attribute Delta.
 */
export const StatusBar: React.FC<StatusBarProps> = ({
  statuses,
  className = '',
  align = 'left',
  label,
  fighterName,
}) => {
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);
  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Clear tooltip when clicking/tapping elsewhere or after 2s on mobile
  useEffect(() => {
    const handleDocumentTouch = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveTooltipId(null);
        if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);
      }
    };

    window.addEventListener('touchstart', handleDocumentTouch, { passive: true });
    window.addEventListener('mousedown', handleDocumentTouch);
    return () => {
      window.removeEventListener('touchstart', handleDocumentTouch);
      window.removeEventListener('mousedown', handleDocumentTouch);
      if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);
    };
  }, []);

  const handleMobileTap = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    // Toggle or activate
    if (activeTooltipId === id) {
      setActiveTooltipId(null);
      if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);
      return;
    }

    setActiveTooltipId(id);
    if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);
    // 2-second auto-close as per Section 7.6.2
    touchTimeoutRef.current = setTimeout(() => {
      setActiveTooltipId(null);
    }, 2000);
  };

  const handleMouseEnter = (id: string) => {
    setActiveTooltipId(id);
  };

  const handleMouseLeave = () => {
    setActiveTooltipId(null);
  };

  const justifyClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';

  return (
    <div 
      ref={containerRef}
      className={`relative select-none pointer-events-auto flex ${justifyClass} ${className}`}
    >
      {/* 
        The Dedicated Status Bar:
        A dedicated compact dark grey rectangle (#1C1E22 with a subtle 1px border #2A2D34)
      */}
      <div 
        className={`w-fit min-h-[19px] max-w-[190px] rounded px-1.5 py-0.5 flex items-center ${justifyClass} gap-1 transition-all shadow-inner relative`}
        style={{
          backgroundColor: '#1C1E22',
          border: '1px solid #2A2D34',
        }}
      >
        {(!statuses || statuses.length === 0) ? (
          /* Empty Dedicated Status Bar: Compact sleek indicator */
          <div className="flex items-center gap-1 px-1 py-0.2 select-none opacity-40">
            <span className="w-1 h-1 rounded-full bg-zinc-500 shrink-0" />
            <span className="text-[6.5px] font-mono tracking-wider text-zinc-400 font-bold uppercase truncate">
              {label ? `${label} • IDLE` : 'STATUS IDLE'}
            </span>
          </div>
        ) : (
          /* Populated Minimalist Square Micro-Icons (Zero distracting countdown numbers on the bar) */
          statuses.map((status) => {
            const Icon = status.icon || Activity;
            const isTooltipOpen = activeTooltipId === status.id;

            return (
              <div
                key={status.id}
                className="relative group shrink-0"
                onMouseEnter={() => handleMouseEnter(status.id)}
                onMouseLeave={handleMouseLeave}
                onClick={(e) => handleMobileTap(status.id, e)}
                onTouchStart={(e) => handleMobileTap(status.id, e)}
              >
                {/* Crisp Minimalist Square Micro-Icon */}
                <button
                  type="button"
                  aria-label={status.name}
                  className={`w-4 h-4 sm:w-4.5 sm:h-4.5 rounded border flex items-center justify-center relative overflow-hidden transition-all duration-150 cursor-pointer ${status.bgColor} ${status.borderColor} ${
                    isTooltipOpen 
                      ? 'scale-110 ring-1 ring-white shadow-[0_0_6px_rgba(255,255,255,0.4)] z-30' 
                      : 'hover:scale-105 active:scale-95'
                  }`}
                >
                  <Icon className={`w-2.5 h-2.5 ${status.textColor} shrink-0`} />

                  {/* Subtle corner indicator dot for critical severity */}
                  {status.severity === 'critical' && (
                    <span className="absolute top-0.5 right-0.5 w-0.5 h-0.5 rounded-full bg-red-400 animate-ping" />
                  )}
                </button>

                {/* 
                  7.6.2 Interactive Telemetry Tooltip:
                  Sleek semi-transparent pop-up with Status Name, Remaining Duration, Origin Source, and Attribute Delta
                */}
                {isTooltipOpen && (
                  <div 
                    className={`absolute z-50 top-full mt-1.5 w-52 max-w-[80vw] p-2 rounded-lg border text-white shadow-2xl backdrop-blur-md pointer-events-none transition-all animate-in fade-in zoom-in-95 duration-100 ${
                      align === 'right' 
                        ? 'right-0 origin-top-right' 
                        : align === 'center' 
                          ? 'left-1/2 -translate-x-1/2 origin-top' 
                          : 'left-0 origin-top-left'
                    }`}
                    style={{
                      backgroundColor: 'rgba(28, 30, 34, 0.96)',
                      borderColor: '#2A2D34',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.85), 0 0 12px rgba(0, 0, 0, 0.5)',
                    }}
                  >
                    {/* Header: Micro Icon, Status Name & Live Countdown */}
                    <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-zinc-800">
                      <div className="flex items-center gap-1 min-w-0">
                        <div className={`p-0.5 rounded ${status.bgColor} border ${status.borderColor} shrink-0`}>
                          <Icon className={`w-2.5 h-2.5 ${status.textColor}`} />
                        </div>
                        <span className="font-display font-black text-[10px] uppercase tracking-wider text-white truncate">
                          {status.name}
                        </span>
                      </div>

                      {/* Live Real-Time Countdown */}
                      <div className="flex items-center gap-0.5 px-1 py-0.2 rounded bg-zinc-900 border border-zinc-700/80 text-[8px] font-mono text-zinc-300 font-bold shrink-0">
                        <Clock className="w-2 h-2 text-zinc-400" />
                        <span>{status.durationSeconds.toFixed(1)}s</span>
                      </div>
                    </div>

                    {/* Telemetry Body: Origin Source & Attribute Delta */}
                    <div className="pt-1.5 space-y-1 font-mono text-[8px]">
                      <div className="flex items-start gap-1 leading-tight">
                        <span className="text-zinc-500 font-black">•</span>
                        <div className="min-w-0">
                          <span className="text-zinc-400 font-bold uppercase tracking-wider">Status: </span>
                          <span className="text-white font-bold">{status.name.toUpperCase()}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-1 leading-tight">
                        <span className="text-zinc-500 font-black">•</span>
                        <div className="min-w-0">
                          <span className="text-zinc-400 font-bold uppercase tracking-wider">Duration: </span>
                          <span className="text-emerald-400 font-bold">{status.durationSeconds.toFixed(1)}s remaining</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-1 leading-tight">
                        <span className="text-zinc-500 font-black">•</span>
                        <div className="min-w-0">
                          <span className="text-zinc-400 font-bold uppercase tracking-wider">Source: </span>
                          <span className="text-zinc-200 font-semibold">{status.source}</span>
                        </div>
                      </div>

                      {/* Exact Effects / Attribute Delta */}
                      <div className="flex items-start gap-1 leading-tight bg-zinc-950/80 p-1.5 rounded border border-zinc-800/80">
                        <span className="text-amber-500 font-black">•</span>
                        <div className="min-w-0">
                          <span className="text-zinc-400 font-bold uppercase tracking-wider block text-[7px] mb-0.5">Effects:</span>
                          <span className="text-amber-300 font-bold leading-tight block">{status.effect}</span>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Tap hint */}
                    <div className="mt-1.5 pt-1 border-t border-zinc-850 flex justify-between items-center text-[7px] font-mono text-zinc-500 uppercase tracking-wider">
                      <span>TELEMETRY HUD</span>
                      <span>TAP (2S) / HOVER</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

/**
 * Extracts and maps all active combat status effects, debuffs, and buffs with rich telemetry data.
 */
export function extractFighterStatuses(fighter: any, shakyVisionExternal?: number): ActiveStatusItem[] {
  if (!fighter) return [];
  const list: ActiveStatusItem[] = [];

  // 1. Super Cripple (Slugger Haymaker / Aikido Redirection Slam)
  const effectiveSuperCrippleTimer = Math.max(
    fighter.superCrippleTimer || 0,
    fighter.aikiLockoutTimer || 0
  );
  if (effectiveSuperCrippleTimer > 0) {
    list.push({
      id: 'super_cripple',
      name: 'Super Cripple',
      durationSeconds: effectiveSuperCrippleTimer / 60,
      totalDurationSeconds: Math.max(3.0, effectiveSuperCrippleTimer / 60),
      source: 'Slugger Kinetic Overdrive / Aikido Slam',
      effect: 'M1, M2 & Parry Locked • -60% Movement Speed',
      color: '#ef4444',
      borderColor: 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]',
      bgColor: 'bg-red-950/90',
      textColor: 'text-red-400',
      icon: Skull,
      severity: 'critical',
    });
  }

  // 2. Bone Fracture (Slugger)
  if (fighter.boneFractureTimer && fighter.boneFractureTimer > 0) {
    list.push({
      id: 'bone_fracture',
      name: 'Bone Fracture',
      durationSeconds: fighter.boneFractureTimer / 60,
      totalDurationSeconds: 3.5,
      source: 'Slugger Heavy Attrition / Blocked M1',
      effect: '-60% M1 Damage • -40% Attack Execution Speed',
      color: '#f59e0b',
      borderColor: 'border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]',
      bgColor: 'bg-amber-950/90',
      textColor: 'text-amber-400',
      icon: Bone,
      severity: 'heavy',
    });
  }

  // 3. Trauma Stagger (Keysi)
  if (fighter.keysiStaggerTimer && fighter.keysiStaggerTimer > 0) {
    list.push({
      id: 'keysi_stagger',
      name: 'Trauma Stagger',
      durationSeconds: fighter.keysiStaggerTimer / 60,
      totalDurationSeconds: 4.0,
      source: 'Keysi M2 Clinch Headbutt',
      effect: '-30% Movement Speed • Erratic Drifting Stumble',
      color: '#e11d48',
      borderColor: 'border-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.4)]',
      bgColor: 'bg-rose-950/90',
      textColor: 'text-rose-400',
      icon: AlertOctagon,
      severity: 'heavy',
    });
  }

  // 4. Shaky Vision / Sensory Disruption
  const shaky = Math.max(fighter.aikiShakyVisionTimer || 0, shakyVisionExternal || 0);
  if (shaky > 0) {
    list.push({
      id: 'disrupted_vision',
      name: 'Sensory Disruption',
      durationSeconds: shaky / 60,
      totalDurationSeconds: 1.0,
      source: 'Aikido Over-Head Slam / Concussive Blast',
      effect: 'Violent Camera Shake • Visual Blur & Depth Loss',
      color: '#38bdf8',
      borderColor: 'border-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.4)]',
      bgColor: 'bg-sky-950/90',
      textColor: 'text-sky-400',
      icon: EyeOff,
      severity: 'moderate',
    });
  }

  // 5. Stun
  if (fighter.stunTime && fighter.stunTime > 0) {
    list.push({
      id: 'stun',
      name: 'Stunned',
      durationSeconds: fighter.stunTime / 60,
      totalDurationSeconds: 0.8,
      source: 'Parry Counter / Clean Impact Hitstun',
      effect: 'Action Lockout • Unable to Attack, Dash or Block',
      color: '#eab308',
      borderColor: 'border-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.5)]',
      bgColor: 'bg-yellow-950/90',
      textColor: 'text-yellow-400',
      icon: Zap,
      severity: 'heavy',
    });
  }

  // 7. Keysi Vulnerable
  if (fighter.keysiVulnerableTimer && fighter.keysiVulnerableTimer > 0) {
    list.push({
      id: 'keysi_vulnerable',
      name: 'Vulnerability',
      durationSeconds: fighter.keysiVulnerableTimer / 60,
      totalDurationSeconds: 5.0,
      source: 'Keysi Whiffed Clinch Window',
      effect: 'Takes +30% Increased Damage From All Strikes',
      color: '#ea580c',
      borderColor: 'border-orange-500 shadow-[0_0_8px_rgba(234,88,12,0.5)]',
      bgColor: 'bg-orange-950/90',
      textColor: 'text-orange-400',
      icon: ShieldAlert,
      severity: 'critical',
    });
  }

  // 8. Standard Cripple
  if (fighter.crippleTime && fighter.crippleTime > 0) {
    list.push({
      id: 'cripple',
      name: 'Crippled',
      durationSeconds: fighter.crippleTime / 60,
      totalDurationSeconds: 5.0,
      source: 'S4 Combo Finisher / Heavy Leg Strike',
      effect: '-60% Movement Slow • Reduced Sprint Acceleration',
      color: '#14b8a6',
      borderColor: 'border-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.4)]',
      bgColor: 'bg-teal-950/90',
      textColor: 'text-teal-400',
      icon: Activity,
      severity: 'moderate',
    });
  }

  // 9. Armor Broken
  if (fighter.armorBreakTime && fighter.armorBreakTime > 0) {
    list.push({
      id: 'armor_broken',
      name: 'Guard Broken',
      durationSeconds: fighter.armorBreakTime / 60,
      totalDurationSeconds: 1.0,
      source: 'Full Armor Depletion / Guard Breakthrough',
      effect: 'Guard Shattered • Armor Absorbs 0 Damage',
      color: '#dc2626',
      borderColor: 'border-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]',
      bgColor: 'bg-red-950/90',
      textColor: 'text-red-400',
      icon: ShieldOff,
      severity: 'heavy',
    });
  }

  // 10. Concussion
  if (fighter.concussTime && fighter.concussTime > 0) {
    list.push({
      id: 'concussion',
      name: 'Concussion',
      durationSeconds: fighter.concussTime / 60,
      totalDurationSeconds: 1.8,
      source: 'Heavy Counter-Strike to Head',
      effect: '-60% Dash Distance • Extended Dash Recovery',
      color: '#6366f1',
      borderColor: 'border-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]',
      bgColor: 'bg-indigo-950/90',
      textColor: 'text-indigo-400',
      icon: Wind,
      severity: 'moderate',
    });
  }

  // 11. Posture Broken / CD
  if (fighter.postureCd && fighter.postureCd > 0) {
    list.push({
      id: 'posture_break',
      name: 'Posture Broken',
      durationSeconds: fighter.postureCd / 60,
      totalDurationSeconds: (fighter.maxPostureCd || 78) / 60,
      source: 'Excessive Guard Absorption / Heavy Breaker',
      effect: 'Defense Depleted • Posture Recovery Frozen',
      color: '#f59e0b',
      borderColor: 'border-amber-500/60',
      bgColor: 'bg-amber-950/60',
      textColor: 'text-amber-400',
      icon: ShieldAlert,
      severity: 'debuff',
    });
  }

  // 12. Capoeira Exhausted
  if (fighter.capoeiraExhaustTimer && fighter.capoeiraExhaustTimer > 0) {
    list.push({
      id: 'capoeira_exhaust',
      name: 'Exhaustion',
      durationSeconds: fighter.capoeiraExhaustTimer / 60,
      totalDurationSeconds: 1.0,
      source: 'Capoeira Esquiva Over-Use / Depleted Energy',
      effect: 'Stamina Regeneration Halted • Ginga Dodge Disabled',
      color: '#eab308',
      borderColor: 'border-yellow-500',
      bgColor: 'bg-yellow-950/90',
      textColor: 'text-yellow-400',
      icon: Flame,
      severity: 'heavy',
    });
  }

  // 13. Slugger Momentum Drag
  if (fighter.sluggerM1WhiffDragCount && fighter.sluggerM1WhiffDragCount > 0) {
    list.push({
      id: 'slugger_drag',
      name: 'Momentum Drag',
      durationSeconds: (fighter.comboResetTimer || 60) / 60,
      totalDurationSeconds: 1.83,
      source: 'Slugger Whiffed Light Strike',
      effect: `-${fighter.sluggerM1WhiffDragCount * 20}% M1 Attack Execution Speed Penalty`,
      color: '#d97706',
      borderColor: 'border-amber-600/60',
      bgColor: 'bg-amber-950/80',
      textColor: 'text-amber-400',
      icon: TrendingDown,
      severity: 'debuff',
    });
  }

  // 14. Sprint Striker Buff (Active Buff)
  if (fighter.sprintStrikerBuffer && fighter.sprintStrikerBuffer > 0) {
    list.push({
      id: 'striker_buff',
      name: 'Striker Momentum',
      durationSeconds: fighter.sprintStrikerBuffer / 60,
      totalDurationSeconds: 0.6,
      source: 'Sustained Full Sprint Forward Momentum',
      effect: '+15% M1 Attack Damage on Next Strike',
      color: '#10b981',
      borderColor: 'border-emerald-500/60',
      bgColor: 'bg-emerald-950/80',
      textColor: 'text-emerald-400',
      icon: Zap,
      severity: 'buff',
    });
  }

  // 15. Aikido Aiki Flow (Super Armor Stance)
  if (fighter.aikiFreeM2Active || (fighter.aikiSuperArmorCharges && fighter.aikiSuperArmorCharges > 0)) {
    list.push({
      id: 'aiki_flow',
      name: 'Aiki Redirection Flow',
      durationSeconds: (fighter.aikiStanceDurationTimer || 300) / 60,
      totalDurationSeconds: 5.0,
      source: 'Tenkan Aiki Flow / Parry Intercept',
      effect: '+15% Damage Resistance • 2-Hit Super Armor Active',
      color: '#06b6d4',
      borderColor: 'border-cyan-500/60',
      bgColor: 'bg-cyan-950/80',
      textColor: 'text-cyan-400',
      icon: Shield,
      severity: 'buff',
    });
  }

  // 16. Daze Stun / Spinning Stars (Taekwondo M2 / Heavy Daze)
  const dazeTimer = Math.max(fighter.dazeStunTimer || 0, fighter.m2StunTimer || 0);
  if (dazeTimer > 0) {
    list.push({
      id: 'daze_stun',
      name: 'Daze (Spinning Stars)',
      durationSeconds: dazeTimer / 60,
      totalDurationSeconds: 1.2,
      source: 'Heavy Impact Daze / Snap Kick',
      effect: 'Spinning Stars Disorientation • Strike Lockout',
      color: '#eab308',
      borderColor: 'border-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.5)]',
      bgColor: 'bg-yellow-950/90',
      textColor: 'text-yellow-300',
      icon: Sparkles,
      severity: 'heavy',
    });
  }

  // 17. Parry Lockout (Ashihara M2 / Counter Disruption)
  if (fighter.parryLockoutTimer && fighter.parryLockoutTimer > 0) {
    list.push({
      id: 'parry_lockout',
      name: 'Parry Lockout',
      durationSeconds: fighter.parryLockoutTimer / 60,
      totalDurationSeconds: 1.0,
      source: 'Ashihara M2 / Disruptive Break',
      effect: 'Defensive Parry Temporarily Disabled',
      color: '#ef4444',
      borderColor: 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]',
      bgColor: 'bg-red-950/90',
      textColor: 'text-red-400',
      icon: Lock,
      severity: 'heavy',
    });
  }

  // 18. Whiff Lockout (Slugger M2 Whiff Penalty / Kickboxing Miss)
  const whiffLockout = Math.max(
    fighter.sluggerM2WhiffLockoutTimer || 0,
    fighter.kickboxingLockoutTimer || 0
  );
  if (whiffLockout > 0) {
    list.push({
      id: 'whiff_lockout',
      name: 'Whiff Lockout',
      durationSeconds: whiffLockout / 60,
      totalDurationSeconds: 2.0,
      source: 'Slugger M2 Whiff / Heavy Over-Commitment',
      effect: 'M1/M2/Block Locked • -80% Movement Speed',
      color: '#f43f5e',
      borderColor: 'border-rose-600 shadow-[0_0_8px_rgba(244,63,94,0.5)]',
      bgColor: 'bg-rose-950/90',
      textColor: 'text-rose-400',
      icon: Lock,
      severity: 'critical',
    });
  }

  return list;
}

export default StatusBar;
