import { FightingStyle } from '../types';

export interface MoveSpec {
  code: string;
  name: string;
  type: 'Light' | 'Finisher' | 'Heavy' | 'Parry Counter' | 'Special';
  damage: number;
  damageLabel: string;
  startupFrames: number;
  startupSpeed: string;
  recoverySeconds: number;
  hitstunSeconds: number;
  iFrames: string;
  superArmor: boolean;
  guardChip: string;
  description: string;
  tacticalRole: string;
}

export interface PassiveAnalogy {
  name: string;
  trigger: string;
  type: string;
  mechanicalBreakdown: string;
  combatAnalogy: string;
  tacticalAdvantage: string;
  counterplayNote: string;
  activeFrames?: string;
}

export interface StyleCodexIntel {
  id: string;
  archetype: 'Pocket Brawler' | 'Guard Breaker' | 'Heavy Juggernaut' | 'Precision Zoner' | 'Counter-Technician' | 'Acrobatic Dancer' | 'Distance Striker' | 'Evasive Kicker' | 'Rooted Tank' | 'Pocket Trapper' | 'Tactical Assassin' | 'Iron Counter-Puncher' | 'Evasive Out-Boxer' | 'High-Volume In-Fighter' | 'Aggressive In-Fighter' | 'CQC Clinch Trapper' | 'Undergoing Rework';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  combatPhilosophy: string;
  keyStrengths: string[];
  vulnerabilities: string[];
  moves: MoveSpec[];
  passives: PassiveAnalogy[];
  proTactics: string;
  matchups: {
    vs: string;
    advantage: 'Favorable' | 'Even' | 'Caution';
    strategy: string;
  }[];
}

export const CODEX_INTEL: Record<string, StyleCodexIntel> = {
  basic: {
    id: 'basic',
    archetype: 'Evasive Out-Boxer',
    difficulty: 'Intermediate',
    combatPhilosophy: 'High-speed out-boxing centered around rhythmic pendulum footwork, afterimage swaying I-frames, intentional feint baiting, and unreactable counter punishes.',
    keyStrengths: [
      '+15% elevated movement and execution speed (x1.15 speed modifier)',
      'Pendulum Dash: 0.8s forward momentum with 4 rhythmic lateral sways & full I-Frames (8.0s CD). Exiting grants +10% M1 Striker Buff',
      'Feint Trap: S3 Hook Feint (0 DMG) baiting opponent parries empowers S4 into 2x DMG (15.0 HP) unparryable + 5.0s Cripple',
      'Slip Recovery: Whiffing S1 guarantees 0.4s I-Frames during S2 execution',
      'Reflex Pivot: Dash dodging compresses M2 Shadow Step Strike windup down to 0.1s'
    ],
    vulnerabilities: [
      '-15% base punching power (x0.85 power modifier)',
      'Defense penalty: takes +10% increased damage (0.90 defense factor)',
      '8.0s cooldown on Pendulum Dash requires calculated tactical usage'
    ],
    moves: [
      { code: 'S1', name: 'Snapping Lead Jab', type: 'Light', damage: 4.5, damageLabel: '4.5 HP', startupFrames: 12, startupSpeed: '1.15x (0.20s)', recoverySeconds: 0.06, hitstunSeconds: 0.45, iFrames: 'None', superArmor: false, guardChip: 'Standard (0.8 HP)', description: 'Fast opening jab. If it whiffs, unlocks S2 I-Frames.', tacticalRole: 'Combo starter & Slip Recovery activator' },
      { code: 'S2', name: 'Right Hook', type: 'Light', damage: 5.0, damageLabel: '5.0 HP', startupFrames: 13, startupSpeed: '1.15x (0.21s)', recoverySeconds: 0.08, hitstunSeconds: 0.45, iFrames: '0.4s (If S1 Whiffed)', superArmor: false, guardChip: 'Standard (1.0 HP)', description: 'Snappy right hook. Gains 0.4s I-Frames if S1 whiffed.', tacticalRole: 'Invulnerable trade continuation' },
      { code: 'S3', name: 'Right Hook Feint', type: 'Light', damage: 0.0, damageLabel: '0.0 HP', startupFrames: 18, startupSpeed: 'Feint Windup (0.30s)', recoverySeconds: 0.08, hitstunSeconds: 0.00, iFrames: 'None', superArmor: false, guardChip: 'None (0.0 HP)', description: 'Longer windup feint hook dealing 0 damage. Primes S4 if enemy parries.', tacticalRole: 'Parry bait & Feint Trap activator' },
      { code: 'S4', name: 'Left Looping Hook', type: 'Finisher', damage: 7.5, damageLabel: '7.5 HP (15.0 HP Trap)', startupFrames: 16, startupSpeed: '1.15x (0.26s)', recoverySeconds: 0.15, hitstunSeconds: 0.80, iFrames: 'None', superArmor: false, guardChip: 'Heavy (1.5 HP / Parry Bypass)', description: 'Finisher hook. Deals 15.0 HP, bypasses Parry, and inflicts 5.0s Cripple if S3 parry-baited.', tacticalRole: 'Unparryable punish finisher' },
      { code: 'M2', name: 'Shadow Step Strike', type: 'Heavy', damage: 11.0, damageLabel: '11.0 HP (0.3s Stun)', startupFrames: 24, startupSpeed: '14.0s Whiff / 9.0s Hit (0.10s Pivot)', recoverySeconds: 0.30, hitstunSeconds: 0.30, iFrames: '0.4s (Full Windup)', superArmor: false, guardChip: '7.0 AP Chip', description: '0.4s forward sway sprint with full I-Frames and locked direction into a lead jab that stuns the opponent for 0.3s.', tacticalRole: 'Evasive entry & 0.3s Stun initiator' }
    ],
    passives: [
      {
        name: 'Reflex Pivot',
        trigger: 'Successfully dodging an opponent\'s attack using your Dash',
        type: 'Instant Heavy Counter',
        mechanicalBreakdown: 'Successfully dodging an opponent\'s attack using your Dash reduces your next Heavy Strike (M2) windup duration down to 0.1 seconds.',
        combatAnalogy: 'Slipping outside an enemy attack and immediately firing a high-velocity straight jab while the opponent is extended.',
        tacticalAdvantage: 'Converts defensive evasion into an unreactable 0.1s piercing counter-attack.',
        counterplayNote: 'Opponents should avoid throwing high-commitment attacks without feinting first.'
      },
      {
        name: 'Slip Recovery',
        trigger: 'Whiffing or missing M1 S1',
        type: 'Evasive Flow',
        mechanicalBreakdown: 'If your first light sequence strike (M1 S1) whiffs or misses, your second light sequence strike (M1 S2) automatically gains 0.4 seconds of Invincibility Frames (I-Frames) during its execution.',
        combatAnalogy: 'Intentionally throwing a decoy jab to slip under the incoming counter-punch.',
        tacticalAdvantage: 'Allows safe whiffing to bait opponents into walking into an invulnerable S2 hook.',
        counterplayNote: 'Delay counters until S2 I-frames expire.'
      },
      {
        name: 'Pendulum Slip Dash & Striker Flow',
        trigger: 'Evasive Dash Input',
        type: 'Unique Mobility & Buff',
        mechanicalBreakdown: 'Replaces the standard dash with a forward-swaying weave lasting 0.8 seconds (swaying once every 0.2s; 4 sways total). Grants full I-Frames during the 0.8s sway motion. Exiting the dash immediately grants a 0.3-second Striker Buff, causing your next M1 strike to deal +10% more damage.',
        combatAnalogy: 'Classic rhythmic pendulum footwork weaving laterally while charging forward.',
        tacticalAdvantage: 'Extensive 0.8s I-Frame coverage and positioning with empowered M1 follow-ups.',
        counterplayNote: 'Punish during the dash cooldown window.'
      },
      {
        name: 'Feint Trap',
        trigger: 'M1 S3 Hook Feint baited enemy parry',
        type: 'Parry Counter Punishment',
        mechanicalBreakdown: 'The 3rd light sequence strike (M1 S3 Hook Feint) deals 0 damage. If the opponent attempts to Parry during S3, your M1 S4 finisher deals 2x Damage, completely bypasses Parries, and inflicts a 5.0-second Cripple debuff on hit.',
        combatAnalogy: 'Baiting the enemy guard/parry response with a shoulder feint and cracking them with an un-parryable hook.',
        tacticalAdvantage: 'Punishes parry-happy opponents severely.',
        counterplayNote: 'Do not panic parry on S3 feint windup.'
      }
    ],
    proTactics: 'Use Pendulum Dash to weave through incoming attacks. Intentionally whiff S1 to trigger S2 Slip Recovery I-Frames. Use S3 Hook Feint to bait parries; when they fall for it, punish with S4 for 15 HP unparryable damage and 5s Cripple!',
    matchups: [
      { vs: 'Street Boxing', advantage: 'Favorable', strategy: 'Use Pendulum Dash under their linear jabs and trap their parry attempts with S3 Feint.' },
      { vs: 'Slugger', advantage: 'Favorable', strategy: 'Out-maneuver their slow swings using Pendulum Dash I-Frames and punish with Reflex Pivot M2.' },
      { vs: 'Ashihara', advantage: 'Even', strategy: 'Use S3 Feint to test their Sabaki timing before committing to heavy finishers.' }
    ]
  },

  slugger: {
    id: 'slugger',
    archetype: 'Heavy Juggernaut',
    difficulty: 'Advanced',
    combatPhilosophy: 'Devastating raw physical kinetic violence: sacrifices agility and defense to demolish health bars with extended reach and high-damage haymakers.',
    keyStrengths: [
      '+40% damage amplification on all attacks via Glass Brawler',
      'Massive 1.20x reach and 1.20x knockback projection',
      'Ultra-fast 2.5s cooldown on M2 guard breaker',
      'Kinetic Counter enables instant 0.10s S1 haymakers right after a dash'
    ],
    vulnerabilities: [
      'Takes +15% increased damage from all incoming hits',
      'Slower strike speed (0.80x) with longer posture recovery'
    ],
    moves: [
      { code: 'S1', name: 'Kinetic Left Swing', type: 'Light', damage: 7.0, damageLabel: '7.0 HP (+40% Brawler)', startupFrames: 22, startupSpeed: '0.80x (0.36s / 0.10s Counter)', recoverySeconds: 0.18, hitstunSeconds: 0.45, iFrames: 'None', superArmor: false, guardChip: 'Moderate (1.8 HP)', description: 'Heavy wide-arc haymaker swing.', tacticalRole: 'High-damage horizontal zoning' },
      { code: 'S2', name: 'Kinetic Right Swing', type: 'Light', damage: 7.0, damageLabel: '7.0 HP (+40% Brawler)', startupFrames: 22, startupSpeed: '0.80x (0.36s)', recoverySeconds: 0.18, hitstunSeconds: 0.45, iFrames: 'None', superArmor: false, guardChip: 'Moderate (1.8 HP)', description: 'Crushing follow-up swing with wide sweep.', tacticalRole: 'Mid-range hit confirmation' },
      { code: 'S3', name: 'Heavy Body Blow', type: 'Light', damage: 8.0, damageLabel: '8.0 HP (+40% Brawler)', startupFrames: 24, startupSpeed: '0.75x (0.40s)', recoverySeconds: 0.22, hitstunSeconds: 0.50, iFrames: 'None', superArmor: false, guardChip: 'Heavy (2.2 HP)', description: 'Deep liver punch that destabilizes opponent balance.', tacticalRole: 'High-damage gut punch' },
      { code: 'S4', name: 'Full Haymaker', type: 'Finisher', damage: 12.0, damageLabel: '12.0 HP (+40% Brawler)', startupFrames: 28, startupSpeed: '0.70x (0.46s)', recoverySeconds: 0.30, hitstunSeconds: 1.20, iFrames: 'None', superArmor: false, guardChip: 'Severe (3.8 HP + Wall Bounce)', description: 'Massive straight punch launching enemies across the arena.', tacticalRole: 'Maximum knockback & damage payoff' },
      { code: 'M2', name: 'Charged Heavy Hook', type: 'Heavy', damage: 14.0, damageLabel: '14.0 HP (+40% Brawler)', startupFrames: 26, startupSpeed: '2.5s CD (0.44s)', recoverySeconds: 0.45, hitstunSeconds: 1.30, iFrames: 'None', superArmor: false, guardChip: 'Guard Shatter (100%)', description: 'Crushing sweeping hook with short 2.5s cooldown.', tacticalRole: 'Continuous guard pressure' }
    ],
    passives: [
      {
        name: 'Glass Brawler',
        trigger: 'Permanent Passive Modifier',
        type: 'Hyper-Power Multiplier',
        mechanicalBreakdown: 'Multiplies all outgoing base damage values by 1.40x (+40%), while increasing all incoming damage taken by 1.15x (+15%).',
        combatAnalogy: 'Like fighting with lead-weighted fists and minimal armor—every exchange is lethal and high-stakes.',
        tacticalAdvantage: 'Allows landing just 2 or 3 clean blows to completely turn a round in your favor.',
        counterplayNote: 'Opponents will try to swarm you with fast multi-hit combos to exploit your +15% damage vulnerability.'
      },
      {
        name: 'Kinetic Counter',
        trigger: 'Dash Dodge into Light Strike (S1)',
        type: 'Instant Counter-Strike',
        mechanicalBreakdown: 'Dodging an incoming punch via dash stores kinetic torque, reducing S1 windup from 22 frames down to 6 frames (0.10s).',
        combatAnalogy: 'Ducking under a punch and immediately pivoting into an unreactable counter hook with your full body weight.',
        tacticalAdvantage: 'Bypasses your native 0.80x speed penalty to instantly punish whiffed strikes with +40% damage power.',
        counterplayNote: 'Opponents should refrain from throwing linear strikes at max range without feinting.'
      }
    ],
    proTactics: 'Use your 1.20x reach to zone foes. When they rush in, dash sideways to trigger Kinetic Counter, then immediately land an instant 0.1s S1 into devastating haymakers.',
    matchups: [
      { vs: 'Street Boxing', advantage: 'Even', strategy: 'Keep them outside your 1.20x reach. If they slip inside, your 15% damage penalty makes trades dangerous.' },
      { vs: 'Shotokan', advantage: 'Caution', strategy: 'Shotokan’s 10% faster startup can interrupt your raw swings; rely on Kinetic Counter after dodging.' },
      { vs: 'Capoeira', advantage: 'Favorable', strategy: 'One clean hit with +40% brawler power can delete over a third of their HP bar.' }
    ]
  },

  street_boxing: {
    id: 'street_boxing',
    archetype: 'Aggressive In-Fighter',
    difficulty: 'Advanced',
    combatPhilosophy: 'Relentless inside-the-pocket pressure, suffocating reach disadvantages with blinding attack speed, stiff-arm measuring jabs, low knockback stickiness, and unparryable flurries.',
    keyStrengths: [
      'Blistering attack execution & footwork speed (+22% / 1.22x speed multiplier)',
      'In-Pocket Cling: Extremely Low Knockback (0.40x) keeps opponents glued at point-blank range',
      'Unparryable Flurry: Landing M2 Strike 1 makes Strikes 2 & 3 completely unparryable',
      'M2 Posture Blitz: Landing full 3-hit M2 drops upcoming Posture Cooldown to 0.1s',
      'Snapping Counter: Executing a Parry grants +80% execution speed on the very next M1'
    ],
    vulnerabilities: [
      'Low individual strike power (0.75x) requires continuous strings of punches to secure KOs',
      'Compact reach (0.90x) demands suffocating infighting range',
      'Defensive Vulnerability (0.90x / takes +10% increased damage)',
      '13.0s hit cooldown & 8.0s whiff cooldown on M2 Flurry require disciplined commitment'
    ],
    moves: [
      { code: 'S1', name: 'Lead Left Poke Jab', type: 'Light', damage: 3.5, damageLabel: '3.5 HP (0.8 Chip)', startupFrames: 9, startupSpeed: '1.22x (0.15s)', recoverySeconds: 0.05, hitstunSeconds: 0.45, iFrames: 'None', superArmor: false, guardChip: 'Low (0.8 HP)', description: 'Springs out from stiff poke stance with ultra-low knockback.', tacticalRole: 'Stiff probe & pocket anchor' },
      { code: 'S2', name: 'Rapid Left Jab', type: 'Light', damage: 3.5, damageLabel: '3.5 HP (0.8 Chip)', startupFrames: 8, startupSpeed: '1.22x (0.13s)', recoverySeconds: 0.05, hitstunSeconds: 0.45, iFrames: 'None', superArmor: false, guardChip: 'Low (0.8 HP)', description: 'Rapid left jab with instant snap retraction shoulder torque.', tacticalRole: 'Pressure reinforcement' },
      { code: 'S3', name: 'Rear Straight Punch', type: 'Light', damage: 4.5, damageLabel: '4.5 HP (1.1 Chip)', startupFrames: 11, startupSpeed: '1.22x (0.18s)', recoverySeconds: 0.06, hitstunSeconds: 0.45, iFrames: 'None', superArmor: false, guardChip: 'Standard (1.1 HP)', description: 'Drives straight from the chin guard down the pipe.', tacticalRole: 'Centerline puncture' },
      { code: 'S4', name: 'Brawling Left Hook', type: 'Finisher', damage: 6.0, damageLabel: '6.0 HP (1.5 Chip)', startupFrames: 13, startupSpeed: '1.22x (0.21s)', recoverySeconds: 0.08, hitstunSeconds: 0.55, iFrames: 'None', superArmor: false, guardChip: 'Solid (1.5 HP)', description: 'Compact inside hook with torso whip that finishes the sequence.', tacticalRole: 'Sequence finisher' },
      { code: 'M2', name: 'Pocket Flurry', type: 'Heavy', damage: 13.0, damageLabel: '3.5 + 3.5 + 6.0 HP', startupFrames: 10, startupSpeed: '13.0s CD (0.17s Windup)', recoverySeconds: 0.20, hitstunSeconds: 0.75, iFrames: 'None', superArmor: false, guardChip: 'Heavy Chip (0.8 + 0.8 + 1.5 HP)', description: 'Right Jab -> Right Jab -> Left Hook. Strike 1 can be parried; landing Strike 1 makes Strikes 2 & 3 unparryable. Landing all 3 triggers 0.1s Posture Blitz.', tacticalRole: 'Unparryable trap & posture reset' }
    ],
    passives: [
      {
        name: 'In-Pocket Cling',
        trigger: 'Landing Any M1 Light Attack',
        type: 'Knockback Dampening',
        mechanicalBreakdown: 'All M1 light attacks deal extremely low knockback, preventing the opponent from being pushed away and keeping them glued at point-blank range.',
        combatAnalogy: 'Crowding the opponent against the ropes, keeping them pinned directly inside your punching pocket.',
        tacticalAdvantage: 'Prevents target separation, guaranteeing consecutive follow-up strikes and continuous pressure.',
        counterplayNote: 'Opponents must dash sideways or time an evasive pivot to break out of the pocket.'
      },
      {
        name: 'M2 Posture Blitz',
        trigger: 'Landing all 3 strikes of M2 Heavy Attack',
        type: 'Cooldown Compression',
        mechanicalBreakdown: 'Landing all 3 strikes of your M2 Heavy Attack reduces your very next Posture Cooldown duration down to 0.1 seconds.',
        combatAnalogy: 'Maintaining an effortless breathing rhythm through an explosive flurry, resetting your stamina instantly.',
        tacticalAdvantage: 'Permits immediate re-initiation of M1 strings without traditional posture exhaustion.',
        counterplayNote: 'Interrupt or evade at least one strike of the flurry to preserve standard posture delay.'
      },
      {
        name: 'Unparryable Flurry',
        trigger: 'Landing the first right jab of M2 heavy sequence',
        type: 'Defensive Lockout',
        mechanicalBreakdown: 'Landing the first right jab of your M2 heavy sequence guarantees that the subsequent two strikes in the combo CANNOT BE PARRIED by the opponent.',
        combatAnalogy: 'Stunning the opponent’s guard with a stiff lead jab before drowning them in a follow-up combo.',
        tacticalAdvantage: 'Completely eliminates parry risk on Strikes 2 & 3 once the initial jab lands.',
        counterplayNote: 'Opponents MUST parry Strike 1 on reaction; failing to do so leaves only standard blocking or evasion.'
      },
      {
        name: 'Snapping Counter',
        trigger: 'Executing a Successful Parry',
        type: 'Reaction Amplification',
        mechanicalBreakdown: 'Successfully executing a Parry increases the execution speed of your next M1 light attack by +80% (one-time burst consumption).',
        combatAnalogy: 'A razor-sharp slip-and-counter right down the pipe before the opponent can even retract their fist.',
        tacticalAdvantage: 'Converts any successful defensive parry into an unreactable counter-punch inside point-blank range.',
        counterplayNote: 'Bait out the parry with feints or staggered rhythms to avoid feeding Snapping Counters.'
      }
    ],
    proTactics: 'Smother opponents inside the pocket. Rapidly cycle your S1-S4 jabs and hooks—since In-Pocket Cling keeps enemies glued to your chest. Time a parry to trigger Snapping Counter (+80% M1 speed) for an unreactable pocket counter, or unleash your M2 Flurry to parry-lock the enemy and trigger Posture Blitz for instant combo re-engagement.',
    matchups: [
      { vs: 'Muay Thai', advantage: 'Favorable', strategy: 'Outpace their kicks in the pocket and use Unparryable Flurry to seal their Iron Guard parry attempts.' },
      { vs: 'Slugger', advantage: 'Even', strategy: 'Stay glued inside their slow haymaker arc; use Snapping Counter to punish their heavy swings before they recover.' },
      { vs: 'Ashihara', advantage: 'Caution', strategy: 'Be mindful of Sabaki counters on Strike 1 of M2; ensure you confirm pocket positioning before committing to the flurry.' }
    ]
  },

  muay_thai: {
    id: 'muay_thai',
    archetype: 'Guard Breaker',
    difficulty: 'Intermediate',
    combatPhilosophy: 'The Art of Eight Limbs: ruthless infighting pressure, double chip attrition through shields, and an unreactable 0.1s Clinch Knee against blocking foes.',
    keyStrengths: [
      'Aggressive Attrition deals 2.0x base chip damage on all light sequence strikes (S1-S4)',
      'Breach Pressure compresses Clinch Knee (M2) windup to 0.10s against blocking targets',
      'Iron Guard provides permanent 5% damage reduction and expands parry window by +0.20s'
    ],
    vulnerabilities: [
      'Shortest base reach (0.75x) requires closing distance aggressively',
      'Reduced knockback (0.80x) requires relentless forward pressure'
    ],
    moves: [
      { code: 'S1', name: 'Long Guard Straight', type: 'Light', damage: 5.0, damageLabel: '5.0 HP (2.0x Chip)', startupFrames: 14, startupSpeed: '1.15x (0.23s)', recoverySeconds: 0.08, hitstunSeconds: 0.45, iFrames: 'None', superArmor: false, guardChip: 'Double Chip (2.0 HP)', description: 'Linear lead straight with extended long guard stance.', tacticalRole: 'Shield-melting probe' },
      { code: 'S2', name: 'Rear Power Cross', type: 'Light', damage: 5.0, damageLabel: '5.0 HP (2.0x Chip)', startupFrames: 14, startupSpeed: '1.15x (0.23s)', recoverySeconds: 0.08, hitstunSeconds: 0.45, iFrames: 'None', superArmor: false, guardChip: 'Double Chip (2.0 HP)', description: 'Power cross driving forward with double chip attrition.', tacticalRole: 'Shield attrition' },
      { code: 'S3', name: 'Sok Tat (Slicing Elbow)', type: 'Light', damage: 6.0, damageLabel: '6.0 HP (2.0x Chip)', startupFrames: 14, startupSpeed: '1.15x (0.23s)', recoverySeconds: 0.08, hitstunSeconds: 0.45, iFrames: 'None', superArmor: false, guardChip: 'Double Chip (2.4 HP)', description: 'Horizontal slicing elbow cutting through guard.', tacticalRole: 'Pocket shield shredder' },
      { code: 'S4', name: 'Roundhouse Shin Kick', type: 'Finisher', damage: 9.0, damageLabel: '9.0 HP (2.0x Chip)', startupFrames: 16, startupSpeed: '1.00x (0.27s)', recoverySeconds: 0.20, hitstunSeconds: 0.70, iFrames: 'None', superArmor: false, guardChip: 'Severe Chip (3.6 HP + 60% Slow)', description: 'Heavy kinetic shin sweep inflicting 60% movement slow.', tacticalRole: 'Attrition finisher & leg slow' },
      { code: 'M2', name: 'Clinch Knee Strike', type: 'Heavy', damage: 12.0, damageLabel: '12.0 HP', startupFrames: 24, startupSpeed: '5.0s CD (0.10s vs Guard)', recoverySeconds: 0.40, hitstunSeconds: 1.10, iFrames: 'None', superArmor: false, guardChip: 'Guard Break (Shatters)', description: 'Breach Pressure triggers near-instant 0.1s windup if opponent is guarding.', tacticalRole: 'Anti-turtle execution tool' }
    ],
    passives: [
      {
        name: 'Aggressive Attrition',
        trigger: 'Striking a Blocking Opponent',
        type: 'Shield Melter',
        mechanicalBreakdown: 'Deals 2.0x base chip damage through opponent block on all light sequence strikes (S1-S4).',
        combatAnalogy: 'Like slamming heavy steel pipes into an opponent’s forearms—even if they block, the impact destroys them.',
        tacticalAdvantage: 'Eliminates passive turtling; blocking opponents take massive damage regardless.',
        counterplayNote: 'Opponents must parry or dash away instead of holding block.'
      },
      {
        name: 'Breach Pressure',
        trigger: 'M2 Heavy against Blocking Opponents',
        type: 'Unreactable Guard Break',
        mechanicalBreakdown: 'Compresses Clinch Knee Strike windup from 24 frames down to 6 frames (0.10s) when the target is holding active guard.',
        combatAnalogy: 'Grabbing behind the neck the instant their hands go up and driving a knee through their solar plexus.',
        tacticalAdvantage: 'Creates a 50/50 dilemma: if they block your chip damage, M2 becomes an instant unreactable guard break.',
        counterplayNote: 'Release guard and dash or counter-strike when Muay Thai initiates heavy windups.'
      },
      {
        name: 'Iron Guard',
        trigger: 'Holding Block / Timing Parry',
        type: 'Conditioning Defense',
        mechanicalBreakdown: 'Provides permanent 5% passive damage mitigation and broadens the Perfect Parry window by +0.20s.',
        combatAnalogy: 'Thickened shin and forearm conditioning that absorbs force effortlessly.',
        tacticalAdvantage: 'Significantly easier parry timings and reduced attrition taken from trades.',
        counterplayNote: 'Feint attacks to bait their parry attempts.'
      }
    ],
    proTactics: 'Force the opponent to raise their guard by landing rhythmic elbow slashes with double chip damage, then instantly press M2 to catch them with an unreactable 0.1s Clinch Knee.',
    matchups: [
      { vs: 'Basic / Shotokan', advantage: 'Favorable', strategy: 'Their defensive guard becomes a liability against your double chip and 0.1s breach knee.' },
      { vs: 'Capoeira', advantage: 'Caution', strategy: 'Capoeira’s high-speed dashes and 1.20x reach can out-space your 0.75x reach outside the pocket.' },
      { vs: 'Slugger', advantage: 'Favorable', strategy: 'Interrupt their heavy windups with your crisp, rhythmic elbow strikes.' }
    ]
  },

  shotokan: {
    id: 'shotokan',
    archetype: 'Precision Zoner',
    difficulty: 'Beginner',
    combatPhilosophy: 'Ichi-Geki Hissatsu (One Hit, One Kill): deep Zenkutsu-Dachi stances, 10% faster startup across all moves, explosive linear blitzes, and high knockback.',
    keyStrengths: [
      '+10% acceleration on all strike animation startups (Ichi-Geki)',
      'Superior 1.10x reach and 1.10x knockback control',
      '+10% bonus damage when landing strikes at close proximity',
      'Ushiro-Mawashi-Geri (M2) features an invulnerable blitz dash'
    ],
    vulnerabilities: [
      'Linear strike hitboxes can be stepped around if whiffed',
      'Higher M2 whiff penalty (5.5s) if baited'
    ],
    moves: [
      { code: 'S1', name: 'Nukite Spearhand', type: 'Light', damage: 6.0, damageLabel: '6.0 HP (+10% Close)', startupFrames: 12, startupSpeed: '1.10x (0.20s)', recoverySeconds: 0.07, hitstunSeconds: 0.45, iFrames: 'None', superArmor: false, guardChip: 'Standard (1.2 HP)', description: 'High-speed piercing linear thrust with 10% accelerated startup.', tacticalRole: 'Linear frame-trap starter' },
      { code: 'S2', name: 'Ren-Zuki Double Punch', type: 'Light', damage: 6.5, damageLabel: '6.5 HP (+10% Close)', startupFrames: 13, startupSpeed: '1.20x burst (0.21s)', recoverySeconds: 0.08, hitstunSeconds: 0.45, iFrames: 'None', superArmor: false, guardChip: 'Standard (1.3 HP)', description: 'Rapid 2-hit punch burst covering intermediate range.', tacticalRole: 'Burst pressure' },
      { code: 'S3', name: 'Mae-Geri Snap Kick', type: 'Light', damage: 7.0, damageLabel: '7.0 HP (+10% Close)', startupFrames: 14, startupSpeed: '1.10x (0.23s)', recoverySeconds: 0.12, hitstunSeconds: 0.45, iFrames: 'None', superArmor: false, guardChip: 'Moderate (1.5 HP)', description: 'Long-reach front kick pushing enemies back into zoning distance.', tacticalRole: 'Mid-range zoning push' },
      { code: 'S4', name: 'Gyaku-Zuki Reverse Punch', type: 'Finisher', damage: 10.0, damageLabel: '10.0 HP (+10% Close)', startupFrames: 16, startupSpeed: '1.10x (0.27s)', recoverySeconds: 0.18, hitstunSeconds: 0.85, iFrames: 'None', superArmor: false, guardChip: 'Heavy (2.8 HP + 10% Knockback)', description: 'Explosive forward lunge punch with heavy kinetic impact.', tacticalRole: 'Linear wall drive' },
      { code: 'M2', name: 'Ushiro-Mawashi-Geri', type: 'Heavy', damage: 13.0, damageLabel: '13.0 HP', startupFrames: 22, startupSpeed: '5.0s CD (0.36s)', recoverySeconds: 0.40, hitstunSeconds: 1.20, iFrames: '0.20s Blitz Dash', superArmor: false, guardChip: 'Guard Break (Shatters)', description: 'Spinning hook kick blitz with active I-Frames and heavy knockback.', tacticalRole: 'Invulnerable distance closer' }
    ],
    passives: [
      {
        name: 'Ichi-Geki Acceleration',
        trigger: 'Permanent Tempo Modifier',
        type: 'Global Startup Acceleration',
        mechanicalBreakdown: 'Accelerates all strike animation startup frames by +10% across your entire move roster.',
        combatAnalogy: 'Exploding forward from a spring-loaded stance before the opponent can even recognize the telegraph.',
        tacticalAdvantage: 'Allows you to interrupt opposing attack startups on pure reaction.',
        counterplayNote: 'Opponents must maintain defensive spacing and avoid reckless approach dashes.'
      },
      {
        name: 'In-Fighting Precision',
        trigger: 'Striking within Close Proximity',
        type: 'Point-Blank Scaling',
        mechanicalBreakdown: 'Grants +10% bonus damage on all strikes connected inside point-blank pocket range.',
        combatAnalogy: 'Channeling full hip rotation and kiai energy into close-range reverse punches.',
        tacticalAdvantage: 'Gives Shotokan lethal versatility: commanding long-range zoning with kicks, and high DPS in the pocket.',
        counterplayNote: 'Keep Shotokan at mid-range to deny their point-blank damage bonus.'
      }
    ],
    proTactics: 'Control the center of the ring with Mae-Geri (S3) zoning kicks. When the opponent hesitates, blitz in with Ushiro-Mawashi-Geri (M2) using its I-Frames to cross distance safely.',
    matchups: [
      { vs: 'Muay Thai', advantage: 'Favorable', strategy: 'Out-range them at 1.10x reach and punish their forward marches with snappy front kicks.' },
      { vs: 'Slugger', advantage: 'Favorable', strategy: 'Your 10% faster startup easily interrupts their sluggish 0.80x windups.' },
      { vs: 'Ashihara', advantage: 'Even', strategy: 'Avoid throwing raw M2 wheel kicks directly into their Sabaki parry.' }
    ]
  },

  ashihara: {
    id: 'ashihara',
    archetype: 'Counter-Technician',
    difficulty: 'Expert',
    combatPhilosophy: 'The Art of Sabaki: blind-spot positioning, circular redirection, an invulnerable leg sweep, and an instant cooldown-refunding counter-throw.',
    keyStrengths: [
      'Sabaki Counter-Parry freezes attackers for 0.8s and instantly refunds M2 cooldown on success',
      'Parry Lockout disables opponent parrying for 1.0s upon initiating M2',
      'S4 Ashibarai leg sweep has full active invulnerability (I-Frames) with 0s recovery delay',
      'Instantly cancels S4 sweep into M2 parry stance without delay'
    ],
    vulnerabilities: [
      'Lowest raw base strike damage (0.90x)',
      'Whiffing Sabaki parry incurs a 6.0s penalty'
    ],
    moves: [
      { code: 'S1', name: 'Chudan Tsuki', type: 'Light', damage: 5.0, damageLabel: '5.0 HP', startupFrames: 15, startupSpeed: '0.90x (0.25s)', recoverySeconds: 0.10, hitstunSeconds: 0.45, iFrames: 'None', superArmor: false, guardChip: 'Standard (1.0 HP)', description: 'Measured center-line punch designed for positional dominance.', tacticalRole: 'Defensive probe' },
      { code: 'S2', name: 'Mawashi-Geri', type: 'Light', damage: 5.5, damageLabel: '5.5 HP', startupFrames: 15, startupSpeed: '0.90x (0.25s)', recoverySeconds: 0.10, hitstunSeconds: 0.45, iFrames: 'None', superArmor: false, guardChip: 'Standard (1.1 HP)', description: 'Balanced low-to-mid roundhouse keeping foes grounded.', tacticalRole: 'Mid-range check' },
      { code: 'S3', name: 'Hiza-Geri', type: 'Light', damage: 6.0, damageLabel: '6.0 HP', startupFrames: 15, startupSpeed: '0.95x (0.25s)', recoverySeconds: 0.10, hitstunSeconds: 0.45, iFrames: 'None', superArmor: false, guardChip: 'Standard (1.2 HP)', description: 'Ascending clinch knee transitioning seamlessly into the sweep.', tacticalRole: 'Sweep setup' },
      { code: 'S4', name: 'Ashibarai Leg Sweep', type: 'Finisher', damage: 8.0, damageLabel: '8.0 HP', startupFrames: 16, startupSpeed: '1.00x (0.27s)', recoverySeconds: 0.00, hitstunSeconds: 0.75, iFrames: 'Full Duration I-Frames', superArmor: false, guardChip: 'Moderate (1.8 HP)', description: 'Low sweep granting full invulnerability throughout animation. Links instantly into Sabaki Parry.', tacticalRole: 'Invulnerable evasion & counter bridge' },
      { code: 'M2', name: 'Sabaki Counter Parry', type: 'Parry Counter', damage: 13.0, damageLabel: '13.0 HP (On Counter)', startupFrames: 6, startupSpeed: '4.5s CD (0s on Parry)', recoverySeconds: 0.10, hitstunSeconds: 0.85, iFrames: '0.50s Active Parry Window', superArmor: false, guardChip: 'Counter Reflector', description: 'Intercepts incoming attacks. Nullifies damage, stuns opponent for 0.8s, disables enemy parry for 1.0s, and instantly resets M2 CD.', tacticalRole: 'Infinite counter loop engine' }
    ],
    passives: [
      {
        name: 'Sabaki Counter-Loop',
        trigger: 'Timing M2 into incoming attack',
        type: '3-Stage Reactive Counter',
        mechanicalBreakdown: 'Heavy Strike (M2) acts as a 3-stage reactive counter-throw (Mawashi Uke ➔ Tsukami Drag ➔ Chudan Straight). Successfully parrying an attack with M2 nullifies damage, drags the attacker in, delivers an unblockable punch with a 0.85-second Stagger Stun, and instantly refunds the M2 cooldown. Hard-counters CQC M2 even if CQC passes through behind you.',
        combatAnalogy: 'Stepping to the opponent’s blind spot, grabbing their extended arm, and pivoting them directly into a brutal counter-throw.',
        tacticalAdvantage: 'Allows continuous, infinite counter-parry punishes as long as reads are accurate.',
        counterplayNote: 'Feint attacks to bait their M2 parry window.'
      },
      {
        name: 'Flow Sweep',
        trigger: 'Executing S4 Ashibarai Sweep',
        type: 'Invulnerable Sweep & Counterflow',
        mechanicalBreakdown: 'The 4th light sequence strike (Ashibarai) natively gains Invincibility Frames (I-Frames) during execution and inflicts a 0.2s stun. Features instant S4 ➔ M2 counterflow bypass.',
        combatAnalogy: 'Ducking completely beneath high hooks and sweeping their lead foot out from under them.',
        tacticalAdvantage: 'Guarantees safe escape from high-damage trades with an instant bridge into Sabaki Parry.',
        counterplayNote: 'Anticipate the sweep and jump or backdash to punish.'
      }
    ],
    proTactics: 'Never chase blindly. Let the opponent commit to high-damage attacks, intercept them with Sabaki Parry (0.5s window) to freeze them, then unleash an invincible S4 sweep counter-loop.',
    matchups: [
      { vs: 'Street Boxing', advantage: 'Favorable', strategy: 'Their aggressive multi-hit strings provide easy rhythm parry opportunities for Sabaki.' },
      { vs: 'Capoeira', advantage: 'Favorable', strategy: 'Acrobatic high kicks have long telltale windups, making them prime targets for parry freezes.' },
      { vs: 'Muay Thai', advantage: 'Caution', strategy: 'Muay Thai chip damage still hurts through regular guards, so rely on raw parries.' }
    ]
  },

  capoeira: {
    id: 'capoeira',
    archetype: 'Acrobatic Dancer',
    difficulty: 'Expert',
    combatPhilosophy: 'The Ginga of Salvador: deceptive continuous dance momentum, 35% faster dash resets, whiff-amplified power kicks, and tornado wheel kicks.',
    keyStrengths: [
      'Malícia Momentum permanently reduces dash cooldown by 35%',
      'Flow Recovery grants +20% bonus damage on next landed strike after whiffing',
      'S3 Queixada spin sweep possesses 0.10s built-in I-Frames',
      'M2 Meia Lua de Compasso inflicts 1.8s concussion daze with massive knockback'
    ],
    vulnerabilities: [
      'Slow base animation speed (0.85x)',
      'High technical skill requirement to balance intentional whiff-buff loops'
    ],
    moves: [
      { code: 'S1', name: 'Meia Lua Kick', type: 'Light', damage: 8.0, damageLabel: '8.0 HP (+20% on Whiff)', startupFrames: 18, startupSpeed: '0.85x (0.30s)', recoverySeconds: 0.14, hitstunSeconds: 0.45, iFrames: 'None', superArmor: false, guardChip: 'Moderate (1.6 HP)', description: 'Sweeping crescent kick with high starting base damage.', tacticalRole: 'High-damage opener & whiff setup' },
      { code: 'S2', name: 'Martelo Hammer Kick', type: 'Light', damage: 8.0, damageLabel: '8.0 HP (+20% on Whiff)', startupFrames: 18, startupSpeed: '0.85x (0.30s)', recoverySeconds: 0.14, hitstunSeconds: 0.45, iFrames: 'None', superArmor: false, guardChip: 'Moderate (1.6 HP)', description: 'Downward momentum hammer kick.', tacticalRole: 'Continuous rhythm strike' },
      { code: 'S3', name: 'Queixada Spin Sweep', type: 'Light', damage: 8.0, damageLabel: '8.0 HP', startupFrames: 19, startupSpeed: '0.85x (0.32s)', recoverySeconds: 0.16, hitstunSeconds: 0.45, iFrames: '0.10s Built-in I-Frames', superArmor: false, guardChip: 'Moderate (1.6 HP)', description: 'Acrobatic spinning kick with protective invulnerability frames.', tacticalRole: 'Evasive spin-dodge strike' },
      { code: 'S4', name: 'Bênção Blessing Kick', type: 'Finisher', damage: 10.0, damageLabel: '10.0 HP (+20% Whiff Boost)', startupFrames: 21, startupSpeed: '0.85x (0.35s)', recoverySeconds: 0.24, hitstunSeconds: 1.00, iFrames: 'None', superArmor: false, guardChip: 'Severe (3.0 HP + Push)', description: 'Frontal push kick with heavy kinetic impulse.', tacticalRole: 'Knockback reset & zoning push' },
      { code: 'M2', name: 'Meia Lua de Compasso', type: 'Heavy', damage: 16.0, damageLabel: '16.0 HP (+20% Whiff = 19.2 HP)', startupFrames: 24, startupSpeed: '5.3s CD (0.40s)', recoverySeconds: 0.45, hitstunSeconds: 1.80, iFrames: '0.25s post-windup', superArmor: false, guardChip: 'Guard Shatter (100%)', description: 'Tornado spinning wheel kick. Inflicts 1.8s concussion daze on hit.', tacticalRole: 'Maximum damage wheel kick finisher' }
    ],
    passives: [
      {
        name: 'Malícia Momentum',
        trigger: 'Permanent Mobility Modifier',
        type: 'Hyper-Mobility Dash',
        mechanicalBreakdown: 'Dash Cooldown is permanently reduced by 35% (drops universal 1.5s dash CD down to ~0.975s).',
        combatAnalogy: 'Dancing rhythmically in the Ginga, floating in and out of striking range unpredictably.',
        tacticalAdvantage: 'Enables ultra-rapid evasive repositioning around opponent guard angles.',
        counterplayNote: 'Use wide horizontal strikes to catch rapid dashes.'
      },
      {
        name: 'Flow Recovery',
        trigger: 'Whiffing/missing any attack',
        type: 'Kinetic Damage Amplification',
        mechanicalBreakdown: 'Whiffing/missing any attack guarantees that your very next landed strike deals +20% increased damage.',
        combatAnalogy: 'Using a missed kick to spin your whole body 360 degrees, doubling the velocity of the follow-up blow.',
        tacticalAdvantage: 'Turns missed attacks into traps that empower follow-up strikes.',
        counterplayNote: 'Do not rush in blindly when Capoeira whiffs.'
      },
      {
        name: 'Cadence Cadence',
        trigger: 'Permanent Attack Mechanics',
        type: 'Heavy Power & Wide Reach',
        mechanicalBreakdown: 'Heavy base power (x1.05–x1.35) and wide sweeping reach (x1.20) balanced by slower overall execution speed (x0.85).',
        combatAnalogy: 'Sweeping long-range leg swings that carry massive rotational mass.',
        tacticalAdvantage: 'Out-ranges and hits harder than standard boxing styles.',
        counterplayNote: 'Exploit the slower execution speed to interrupt windups.'
      },
      {
        name: 'Rhythm Reset',
        trigger: 'Pausing Light Attacks for 1.0s',
        type: 'Sequence Chain Timing',
        mechanicalBreakdown: 'Stopping light sequence attacks for 1.0 second opens a 0.5-second reset window before the combo chain resets back to Stage 1.',
        combatAnalogy: 'Holding your ground mid-dance to throw off the opponent’s rhythm.',
        tacticalAdvantage: 'Allows delaying combo timing to throw off opponent parry reads.',
        counterplayNote: 'Attack during the 0.5-second reset window.'
      },
      {
        name: 'Esquiva Fluidity (Special Block)',
        trigger: 'Holding Block',
        type: 'Stackable Dodge System',
        mechanicalBreakdown: 'Replaces static block with 3 acrobatic dodge stacks (0 chip damage taken). Regenerates 1 stack every 5.0s (getting hit during regen resets timer). Consuming all 3 stacks triggers an auto-roll with a 1.0s attack lockout.',
        combatAnalogy: 'Flipping, ducking, and swaying under incoming strikes without absorbing any impact on guard.',
        tacticalAdvantage: 'Completely immune to chip damage while dodge stacks are active.',
        counterplayNote: 'Deplete all 3 stacks to force the auto-roll 1.0s attack lockout.'
      }
    ],
    proTactics: 'Dance on the perimeter with 35% faster dashes. Deliberately throw out a light attack whiff to trigger Flow Recovery (+20% DMG), then punish forward lunges with a devastating 16.0–19.2 DMG Meia Lua de Compasso.',
    matchups: [
      { vs: 'Basic / Street Boxing', advantage: 'Favorable', strategy: 'Out-mobility them with rapid dash resets and punish short punches with 1.20x reach.' },
      { vs: 'Slugger', advantage: 'Even', strategy: 'Dance outside their swing arcs; never trade hits directly due to Slugger’s +40% brawler scaling.' },
      { vs: 'Ashihara', advantage: 'Caution', strategy: 'Feint your moves with deliberate whiffs so Ashihara wastes their 0.5s parry window.' }
    ]
  },

  kickboxing: {
    id: 'kickboxing',
    archetype: 'Distance Striker',
    difficulty: 'Intermediate',
    combatPhilosophy: 'Dynamic rhythm and guard destruction: cadence opening jabs, +20% finisher knockback, and a two-stage Hook-to-Teep armor shredder.',
    keyStrengths: [
      'Cadence Opening S1 & S2 jabs bypass native 0.90x speed penalty (+10% speed)',
      'Heavy Momentum grants +20% increased physical knockback distance on S4 finisher',
      'Chain Reaction reduces next M2 Seq 1 windup down to 0.25s after landing full combo',
      'Two-stage M2 mixup (Hook -> Teep) strips 20% then 80% armor with 1.8s concussion'
    ],
    vulnerabilities: [
      'Slower baseline footwork speed (0.90x)',
      '3.2s M2 whiff cooldown penalty with 0.6s–0.8s recovery window exposure'
    ],
    moves: [
      { code: 'S1', name: 'Lead Left Jab', type: 'Light', damage: 5.5, damageLabel: '5.5 HP', startupFrames: 13, startupSpeed: '1.10x (0.21s Cadence)', recoverySeconds: 0.08, hitstunSeconds: 0.45, iFrames: 'None', superArmor: false, guardChip: 'Standard (1.1 HP)', description: 'Fast probe jab boosted 10% faster by Cadence Opening.', tacticalRole: 'Cadence opener' },
      { code: 'S2', name: 'Rear Right Jab', type: 'Light', damage: 5.5, damageLabel: '5.5 HP', startupFrames: 13, startupSpeed: '1.10x (0.21s Cadence)', recoverySeconds: 0.08, hitstunSeconds: 0.45, iFrames: 'None', superArmor: false, guardChip: 'Standard (1.1 HP)', description: 'Rapid follow-up jab keeping target pinned.', tacticalRole: 'Paced pressure' },
      { code: 'S3', name: 'Calf Kick', type: 'Light', damage: 6.5, damageLabel: '6.5 HP', startupFrames: 16, startupSpeed: '0.90x (0.27s)', recoverySeconds: 0.12, hitstunSeconds: 0.45, iFrames: 'None', superArmor: false, guardChip: 'Moderate (1.3 HP)', description: 'Low chopping kick that degrades opponent posture.', tacticalRole: 'Low posture drain' },
      { code: 'S4', name: 'Straight Punch', type: 'Finisher', damage: 9.0, damageLabel: '9.0 HP', startupFrames: 17, startupSpeed: '0.90x (0.28s)', recoverySeconds: 0.20, hitstunSeconds: 1.00, iFrames: 'None', superArmor: false, guardChip: 'Heavy (2.5 HP + 20% Push)', description: 'Heavy straight punch with +20% knockback via Heavy Momentum.', tacticalRole: 'Chain Reaction activator' },
      { code: 'M2', name: 'Dazing Hook to Teep', type: 'Heavy', damage: 14.0, damageLabel: '8.0 + 14.0 HP', startupFrames: 15, startupSpeed: '4.5s CD (0.25s Chain)', recoverySeconds: 0.60, hitstunSeconds: 1.80, iFrames: 'None', superArmor: false, guardChip: 'Armor Shred (20% -> 80%)', description: 'Two-stage heavy: Seq 1 Short Hook (20% Armor) -> Seq 2 Teep Kick (80% Armor, 1.8s Concussion).', tacticalRole: 'Total armor stripping & concussion' }
    ],
    passives: [
      {
        name: 'Cadence Opening',
        trigger: 'Executing S1 or S2 Jabs',
        type: 'Startup Acceleration',
        mechanicalBreakdown: 'S1 & S2 jabs execute 10% faster, completely bypassing the native 0.90x style speed penalty.',
        combatAnalogy: 'Flickering lightning-fast double jabs to freeze the opponent before unloading heavy low kicks.',
        tacticalAdvantage: 'Guarantees fast combo initiation despite having a heavy kickboxing stance.',
        counterplayNote: 'Parry the second jab in the cadence to break their rhythm.'
      },
      {
        name: 'Chain Reaction',
        trigger: 'Landing Full S1-S4 Combo',
        type: 'Windup Compression',
        mechanicalBreakdown: 'Landing the complete S1-S4 combo sequence reduces your next M2 Seq 1 windup from 0.44s down to 0.25s.',
        combatAnalogy: 'Using the momentum of the finishing straight punch to whip an instant short hook into an explosive front push kick.',
        tacticalAdvantage: 'Enables near-unreactable heavy mixups right after landing a full light string.',
        counterplayNote: 'Interrupt Kickboxing before they reach S4 to prevent Chain Reaction activation.'
      }
    ],
    proTactics: 'Probe with fast S1 & S2 jabs, finish the combo with S4 to activate Chain Reaction, then immediately unleash the 0.25s Short Hook into 80% armor-stripping Teep Front Kick!',
    matchups: [
      { vs: 'Muay Thai', advantage: 'Favorable', strategy: 'Use your long 1.15x reach to keep them out of clinch range and strip their armor with Teep kicks.' },
      { vs: 'Street Boxing', advantage: 'Even', strategy: 'Space them out with long jabs and calf kicks; avoid whiffing M2 when they have Slip Drive ready.' },
      { vs: 'Ashihara', advantage: 'Caution', strategy: 'Do not throw predictable Teep kicks straight into Sabaki parries; bait their parry with feints.' }
    ]
  },

  street_taekwondo: {
    id: 'street_taekwondo',
    archetype: 'Evasive Kicker',
    difficulty: 'Intermediate',
    combatPhilosophy: 'High-flying street kicking: rapid chambering, evasive jumping I-Frames, and an aggressive 360 spin-dash with Counter-Bait parry immunity.',
    keyStrengths: [
      'High mobility and evasive S3 jumping stance switches with built-in I-Frames',
      'Kick Momentum accelerates next light combo (M1) attack speed by +8% after landing M2',
      'Counter-Bait grants 0.8s of complete Invincibility (I-Frames) if parried during M2 spin'
    ],
    vulnerabilities: [
      'Reckless Style makes you take +10% increased damage and +8% longer hitstun',
      'Lower defense multiplier (0.90x) demands sharp evasive execution'
    ],
    moves: [
      { code: 'S1', name: 'Lead Snap Kick', type: 'Light', damage: 4.5, damageLabel: '4.5 HP', startupFrames: 13, startupSpeed: '1.05x (0.21s)', recoverySeconds: 0.08, hitstunSeconds: 0.45, iFrames: 'None', superArmor: false, guardChip: 'Standard (0.9 HP)', description: 'Quick long-range lead kick with rapid chambering.', tacticalRole: 'Rapid kick probe' },
      { code: 'S2', name: 'Follow-Up Snap Kick', type: 'Light', damage: 5.5, damageLabel: '5.5 HP', startupFrames: 13, startupSpeed: '1.05x (0.21s)', recoverySeconds: 0.08, hitstunSeconds: 0.45, iFrames: 'None', superArmor: false, guardChip: 'Standard (1.1 HP)', description: 'Fast high snap kick keeping target pressured.', tacticalRole: 'Combo extension' },
      { code: 'S3', name: 'Stance Switch Kick', type: 'Light', damage: 6.5, damageLabel: '6.5 HP', startupFrames: 14, startupSpeed: '1.05x (0.23s)', recoverySeconds: 0.08, hitstunSeconds: 0.45, iFrames: '0.15s Jumping I-Frames', superArmor: false, guardChip: 'Standard (1.3 HP)', description: 'Switches guard stance with jumping kick granting temporary I-Frames.', tacticalRole: 'Airborne frame dodge & kick' },
      { code: 'S4', name: 'Side Kick', type: 'Finisher', damage: 8.5, damageLabel: '8.5 HP', startupFrames: 16, startupSpeed: '1.00x (0.27s)', recoverySeconds: 0.22, hitstunSeconds: 0.90, iFrames: 'None', superArmor: false, guardChip: 'Heavy (2.2 HP + Heavy Push)', description: 'Heavy thrusting side kick driving opponent backward.', tacticalRole: 'Kinetic pushback' },
      { code: 'M2', name: 'Spin-Dash Snap Kick', type: 'Heavy', damage: 12.0, damageLabel: '12.0 HP', startupFrames: 21, startupSpeed: '4.5s CD (0.35s)', recoverySeconds: 0.35, hitstunSeconds: 1.10, iFrames: '0.80s Counter-Bait on Parry', superArmor: false, guardChip: 'Guard Break (Shatters)', description: '360° rotational blitz dash into 12.0 DMG Snap Kick. Grants 0.8s I-Frames if parried.', tacticalRole: 'Anti-parry blitz attack' }
    ],
    passives: [
      {
        name: 'Kick Momentum',
        trigger: 'Successfully landing an M2 strike',
        type: 'Execution Speed Boost',
        mechanicalBreakdown: 'Successfully landing an M2 strike increases your light attack (M1) execution speed by +30% for the next combo sequence.',
        combatAnalogy: 'Riding the kinetic energy of a landed spin-kick straight into rapid-fire snap kicks.',
        tacticalAdvantage: 'Allows rapid-fire follow-up light kick flurries.',
        counterplayNote: 'Dash back immediately after taking an M2 hit.'
      },
      {
        name: 'Reckless Style',
        trigger: 'Permanent Stance Modifier',
        type: 'High Risk / High Reward',
        mechanicalBreakdown: 'Natively increases total Damage and Speed by +5%, but increases incoming Damage taken by +10% and increases incoming Stun durations by +8%.',
        combatAnalogy: 'Fighting with explosive wild aggression, trading defensive safety for max striking speed.',
        tacticalAdvantage: 'Amplified velocity and damage on all attacks.',
        counterplayNote: 'Counter-attack aggressively to capitalize on their +10% damage penalty.'
      },
      {
        name: 'Counter-Bait',
        trigger: 'Opponent attempts to Parry during M2 initiation',
        type: 'Parry Immunity & I-Frames',
        mechanicalBreakdown: 'If an opponent attempts to Parry during your M2 initiation (S1 Spin Dash), you instantly gain 0.8 seconds of Invincibility Frames (I-Frames).',
        combatAnalogy: 'Using the rotational momentum of your spin to slip their counter-punch completely.',
        tacticalAdvantage: 'Hard counters parry-heavy opponents.',
        counterplayNote: 'Do not attempt to parry the spin dash; evade laterally.'
      },
      {
        name: 'Leg Block & Slip (Special Block)',
        trigger: 'Holding Block',
        type: 'Capped Armor & Spin Chance',
        mechanicalBreakdown: 'Reduces chip damage to 10%, but Armor HP is capped at 12 AP. Has a 5% chance on block hit to trigger an off-balance spin: avoids armor depletion for that hit, but stuns the user for 0.4s.',
        combatAnalogy: 'Raising high leg shields to absorb kicks while risking balance loss under heavy pressure.',
        tacticalAdvantage: 'High chip reduction on light hits.',
        counterplayNote: 'Deplete 12 AP quickly to shatter their block.'
      }
    ],
    proTactics: 'Leverage your S3 jumping kick for free frame evasion, and use the 360-spin dash to bait parries; even if they try to parry, your Counter-Bait passive grants you 0.8s of invincibility to deny their punish!',
    matchups: [
      { vs: 'Slugger', advantage: 'Favorable', strategy: 'Use your long 1.12x kick reach to out-space Slugger and avoid their slow heavy punches.' },
      { vs: 'Street Boxing', advantage: 'Even', strategy: 'Space them out with long snap kicks; if they get inside, your 10% damage-taken penalty hurts.' },
      { vs: 'Ashihara', advantage: 'Favorable', strategy: 'Your Counter-Bait passive is a direct counter to Sabaki parry: if they parry your spin dash, you instantly get 0.8s I-Frames to deny their parry flow.' }
    ]
  },

  kyokushin: {
    id: 'kyokushin',
    archetype: 'Undergoing Rework',
    difficulty: 'Intermediate',
    combatPhilosophy: '[UNDERGOING REWORK] Kyokushin Karate has been emptied and is undergoing a complete balance overhaul and move set redesign.',
    keyStrengths: [
      'Currently cleared and locked for rework',
      'Balanced baseline profile pending redesign'
    ],
    vulnerabilities: [
      'Undergoing active development and rebalancing'
    ],
    moves: [
      { code: 'S1-S4', name: 'Standard Combo', type: 'Light', damage: 5.0, damageLabel: '5.0 HP', startupFrames: 10, startupSpeed: '1.00x', recoverySeconds: 0.20, hitstunSeconds: 0.25, iFrames: 'None', superArmor: false, guardChip: 'Standard Chip', description: 'Basic light strike combination (Rework Pending).', tacticalRole: 'Baseline light attack' },
      { code: 'M2', name: 'Heavy Strike', type: 'Heavy', damage: 10.0, damageLabel: '10.0 HP', startupFrames: 24, startupSpeed: '3.0s CD', recoverySeconds: 0.30, hitstunSeconds: 0.50, iFrames: 'None', superArmor: false, guardChip: 'Standard Chip', description: 'Basic heavy strike (Rework Pending).', tacticalRole: 'Baseline heavy attack' }
    ],
    passives: [
      {
        name: 'Undergoing Rework',
        trigger: 'Active Development',
        type: 'Status Indicator',
        mechanicalBreakdown: 'Kyokushin Karate abilities and passive modifiers have been emptied and prepared for upcoming balance overhaul.',
        combatAnalogy: 'Re-evaluating full-contact karate mechanics for maximum competitive fairness.',
        tacticalAdvantage: 'Clean baseline foundation.',
        counterplayNote: 'Stay tuned for release updates.'
      }
    ],
    proTactics: 'Kyokushin Karate is currently undergoing a complete rework and redesign.',
    matchups: [
      { vs: 'All Styles', advantage: 'Even', strategy: 'Kyokushin is currently undergoing a balance rework.' }
    ]
  },

  keysi: {
    id: 'keysi',
    archetype: 'CQC Clinch Trapper',
    difficulty: 'Expert',
    combatPhilosophy: 'Suffocating inside pocket brawler that crashes into point-blank range with the Pensador double-elbow frame, clamps the opponent’s head circle in a brutal clinch, and smashes guards with heavy headbutts and knee drives.',
    keyStrengths: [
      'Brutal Escalation: S3 Elbow (7.2 HP) and S4 Knee (9.6 HP) deal +20% damage',
      'Guard Cracker: +20% damage against Armor HP (AP); Parry-stun penalty duration reduced by 0.1s',
      'Intercepting Slip Dash: +50% distance, halts directly on opponent intersection with boot-slide puff and primes M2',
      'Pensador Head Clamp (M2): Elbows push forward and clamp the sides of the head circle; completely immobilizes and disables all opponent actions (M1, M2, Dash, Block)',
      'Guard Shatter on Block: Blocking during the clamp shatters enemy guard (AP broken) and triggers the headbutt attack instantly',
      'Trauma Stagger: Clinch headbutt deals 14.0 HP (0 knockback) and inflicts 4.0s Stagger (+60% windup, -30% speed, chaotic directional drift)',
      'Primed Clinch Surge: Landing S4 Knee or Dash Slip collision grants 0.1s M2 windup + Super Armor'
    ],
    vulnerabilities: [
      'Shortest striking range in the entire game (0.40x reach); must stay glued inside pocket',
      'M2 Clinch Over-Extension: Whiffing or getting parried inflicts 5.0s Vulnerability (-60% speed, +30% damage taken, Parry disabled) before a 7.0s cooldown'
    ],
    moves: [
      { code: 'S1', name: 'Lead Forearm Wedge', type: 'Light', damage: 4.5, damageLabel: '4.5 HP', startupFrames: 6, startupSpeed: '1.10x (0.10s Pocket)', recoverySeconds: 0.12, hitstunSeconds: 0.25, iFrames: 'None', superArmor: false, guardChip: 'Standard (2.2 HP)', description: 'Sharp forward-pointing elbow wedge driving into target at point-blank range.', tacticalRole: 'Pocket opener' },
      { code: 'S2', name: 'Rear Forearm Smash', type: 'Light', damage: 4.5, damageLabel: '4.5 HP', startupFrames: 6, startupSpeed: '1.10x (0.10s Pocket)', recoverySeconds: 0.12, hitstunSeconds: 0.25, iFrames: 'None', superArmor: false, guardChip: 'Standard (2.2 HP)', description: 'Heavy inside forearm smash crashing through opponent guard.', tacticalRole: 'Trapping setup' },
      { code: 'S3', name: 'Horizontal Elbow Swing', type: 'Light', damage: 7.2, damageLabel: '7.2 HP', startupFrames: 8, startupSpeed: '1.10x (0.14s Pocket)', recoverySeconds: 0.16, hitstunSeconds: 0.32, iFrames: 'None', superArmor: false, guardChip: 'Heavy (+20% AP Cracker)', description: 'Hand stays anchored behind temple while elbow coils right and whips left with heavy rotational torque.', tacticalRole: 'Brutal Escalation strike' },
      { code: 'S4', name: 'Heavy Pocket Knee', type: 'Finisher', damage: 9.6, damageLabel: '9.6 HP', startupFrames: 11, startupSpeed: '1.10x (0.18s Pocket)', recoverySeconds: 0.22, hitstunSeconds: 0.38, iFrames: 'None', superArmor: false, guardChip: 'Heavy (+20% AP Cracker)', description: 'High-torque hip rotation and knee drive that primes M2 Clinch Surge for 0.1s startup with Super Armor.', tacticalRole: 'Combo finisher & M2 primer' },
      { code: 'M2', name: 'Pensador Head Clamp to Headbutt', type: 'Heavy', damage: 14.0, damageLabel: '14.0 HP', startupFrames: 30, startupSpeed: '0.50s (0.10s Primed)', recoverySeconds: 0.35, hitstunSeconds: 4.0, iFrames: 'None', superArmor: true, guardChip: 'Breaks AP & Bypasses Guard', description: 'Flares elbows open with red/white strobe flash, pushes forward to clamp enemy head circle, locks out all buttons, reels head back and dives in with a bone-shattering headbutt. Inflicts 4.0s Trauma Stagger.', tacticalRole: 'Pocket immobilization & guard cracker' }
    ],
    passives: [
      {
        name: 'Primed Clinch Surge',
        trigger: 'Landing S4 Knee or Intercepting Dash Collision',
        type: 'Startup Compressor & Super Armor',
        mechanicalBreakdown: 'Landing M1 S4 or colliding with an enemy during a Dash primes your next M2 Clinch, reducing its startup from 0.5s to 0.1s and granting active Super Armor through the windup.',
        combatAnalogy: 'Using knee impact momentum to instantly clasp the opponent’s head into a devastating clinch.',
        tacticalAdvantage: 'Guarantees inescapable pocket pressure.',
        counterplayNote: 'Parry the elbow contact moment or zone Keysi out.'
      },
      {
        name: 'Guard Shatter on Block',
        trigger: 'Opponent Holding Block During Clamp',
        type: 'Guard Breaker',
        mechanicalBreakdown: 'If the opponent is holding block when the clamp reaches them (and does not land a Perfect Parry), their Armor HP is immediately broken to 0, and the Clinch Headbutt triggers instantly.',
        combatAnalogy: 'Ripping through a guarded frame to force the head forward into the forehead smash.',
        tacticalAdvantage: 'Blocks cannot defend against the clamp.',
        counterplayNote: 'Must time a Perfect Parry the exact moment the elbow reaches you.'
      },
      {
        name: 'Trauma Stagger',
        trigger: 'Landing M2 Clinch Headbutt',
        type: 'Disorientation Debuff',
        mechanicalBreakdown: 'Landing M2 Headbutt inflicts 4.0s Trauma Stagger: +60% attack windup delay, -30% movement speed, and chaotic directional input drift.',
        combatAnalogy: 'Severe concussion causing loss of motor control and equilibrium.',
        tacticalAdvantage: 'Completely disables the victim’s ability to counter-attack or escape.',
        counterplayNote: 'Dodge or parry the M2 clamp before it locks.'
      }
    ],
    proTactics: 'Use Intercepting Slip Dash to close into pocket range and prime M2. Chain S1-S4 light combos to build damage and prime Clinch Surge, then execute M2 to clamp the opponent’s head. If they try to block, their guard will shatter automatically!',
    matchups: [
      { vs: 'Street Boxing / Slugger', advantage: 'Favorable', strategy: 'Infiltrate their reach with Intercepting Slip Dash and smother them inside phone-booth distance with Pensador wedges and head clamps.' },
      { vs: 'Kyokushin / Shotokan', advantage: 'Even', strategy: 'Bait out long kicks, slip underneath them, and shatter their guard with the Pensador head clamp.' },
      { vs: 'Capoeira / Taekwondo', advantage: 'Caution', strategy: 'Their long-range zoning and agile kicks can keep you outside pocket range. Use patient parries and Intercepting Dashes to corner them.' }
    ]
  },

  boxing_shell: {
    id: 'boxing_shell',
    archetype: 'Iron Counter-Puncher',
    difficulty: 'Advanced',
    combatPhilosophy: 'The Philly Shell & Iron Weave: bladed shoulder deflection, lightning-fast lead jabs, zero post-block delay, and a momentum-reversing Shoulder Roll.',
    keyStrengths: [
      'Snapping Lead Execution: First two sequences of M1 (S1 & S2) execute 50% faster (1.50x)',
      'Instant Guard-Drop M2: Blocking adds zero post-delay on M2; drop guard directly into Shoulder Roll',
      'Shoulder Roll (M2) deflects hits with Super Armor, pulls opponent close & spins them out for 1.5s',
      'Shoulder Roll Acceleration: Landing M2 doubles Posture Recovery speed for 3.0s with glowing magenta trails',
      'Deflective Posture Reset: Parrying reduces active Posture CD by 45%',
      'Evasive Posture Refund: Executing a Dash immediately refunds 10% Posture'
    ],
    vulnerabilities: [
      'Takes +10% increased damage (0.90x defense penalty)',
      'Reduced knockback requires disciplined close-quarters management'
    ],
    moves: [
      { code: 'S1', name: 'Snapping Lead Jab', type: 'Light', damage: 5.0, damageLabel: '5.0 HP (+50% Speed)', startupFrames: 8, startupSpeed: '1.50x (0.13s)', recoverySeconds: 0.08, hitstunSeconds: 0.45, iFrames: 'None', superArmor: false, guardChip: 'Standard (1.0 HP)', description: 'Snappy lead jab extending at 1.50x execution speed from bladed shell guard.', tacticalRole: 'Lightning fast opener' },
      { code: 'S2', name: 'Lead Straight', type: 'Light', damage: 5.0, damageLabel: '5.0 HP (+50% Speed)', startupFrames: 8, startupSpeed: '1.50x (0.13s)', recoverySeconds: 0.08, hitstunSeconds: 0.45, iFrames: 'None', superArmor: false, guardChip: 'Standard (1.0 HP)', description: 'Second fast lead straight punch executing at 1.50x speed.', tacticalRole: 'Lightning fast continuation' },
      { code: 'S3', name: 'Looping Left Hook', type: 'Light', damage: 6.5, damageLabel: '6.5 HP', startupFrames: 13, startupSpeed: '1.10x (0.21s)', recoverySeconds: 0.10, hitstunSeconds: 0.50, iFrames: 'None', superArmor: false, guardChip: 'Standard (1.3 HP)', description: 'Shoulder drives forward and upper arm loops in a tight 90° arc.', tacticalRole: 'Rotational body hook' },
      { code: 'S4', name: 'Looping Overhead Hook', type: 'Finisher', damage: 9.0, damageLabel: '9.0 HP', startupFrames: 15, startupSpeed: '1.00x (0.25s)', recoverySeconds: 0.22, hitstunSeconds: 0.85, iFrames: 'None', superArmor: false, guardChip: 'Heavy (2.2 HP)', description: 'Overhead looping hook driving through opponent guard with full hip torque.', tacticalRole: 'Torque finisher' },
      { code: 'M2', name: 'Shoulder Roll', type: 'Heavy', damage: 0.0, damageLabel: '0.0 HP (Pull & 1.5s Stagger)', startupFrames: 8, startupSpeed: '6.0s CD (0.13s)', recoverySeconds: 0.25, hitstunSeconds: 1.50, iFrames: 'Super Armor during roll', superArmor: true, guardChip: 'Unparriable Deflection', description: 'Executes 60° shoulder deflection roll. Pulls enemy into pocket range, staggers them for 1.5s, and doubles Posture Recovery speed for 3.0s.', tacticalRole: 'Super-armor deflection & pocket counter trap' }
    ],
    passives: [
      {
        name: 'Snapping Lead Execution',
        trigger: 'M1 Light Strikes (S1 & S2)',
        type: '50% Faster Startup Velocity',
        mechanicalBreakdown: 'The first two sequences of M1 (S1 Lead Jab & S2 Lead Straight) execute with +50% Faster Execution Speed (1.50x extension & retraction).',
        combatAnalogy: 'Flicking your shoulder like a whip to fire jabs that land before the opponent’s eyes can register the movement.',
        tacticalAdvantage: 'Beats opposing strike startups in head-to-head opening exchanges.',
        counterplayNote: 'Maintain a tight guard and wait for the slower S3/S4 hooks before attempting to counter.'
      },
      {
        name: 'Evasive Posture Refund',
        trigger: 'Executing a Dash',
        type: 'Posture Resource Refund',
        mechanicalBreakdown: 'Executing a Dash immediately refunds 10% of Posture / Posture Cooldown (shaves 10% off active posture lock and grants a 10% pending posture reduction buff), displaying a floating POSTURE REFUND (+10%) indicator above the character.',
        combatAnalogy: 'Resetting body balance fluidly while stepping laterally out of danger.',
        tacticalAdvantage: 'Keeps posture healthy during evasive maneuvering.',
        counterplayNote: 'Press opponent closely to prevent free dash resets.'
      },
      {
        name: 'Sideways Alignment',
        trigger: 'Permanent Defensive Stance',
        type: 'Body Orientation Guard',
        mechanicalBreakdown: 'Fighter automatically locks into a fixed sideways perspective facing to the left with an active shoulder guard.',
        combatAnalogy: 'Turning the lead shoulder toward the opponent to present a minimal target surface.',
        tacticalAdvantage: 'Reduces target profile and naturally deflects linear strikes.',
        counterplayNote: 'Use sweeping hooks to bypass the narrow sideways profile.'
      },
      {
        name: 'Dynamic Shoulder M2 & Posture Acceleration',
        trigger: 'Executing M2 Heavy Attack',
        type: 'Deflection & Posture Doubling',
        mechanicalBreakdown: 'Push (Close Proximity & Unhit): Knocks target back without a stagger; can be parried; does not grant posture buff. Parry (Hit during attack): Deflects incoming strike, pulls enemy into pocket with a 1.5s Stagger; cannot be parried; grants 2x Posture Recovery Speed for 3.0 seconds. Bypasses post-block delay entirely.',
        combatAnalogy: 'Rolling your lead shoulder up to deflect a right cross, sucking the opponent in, and staggering them off-balance.',
        tacticalAdvantage: 'Turns defensive blocking directly into an unreactable trap that doubles posture recovery.',
        counterplayNote: 'Do not throw power punches into their lead shoulder guard.'
      }
    ],
    proTactics: 'Maintain a bladed profile to deflect incoming jabs. Counter with rapid S1-S2 lead strikes before rotating deeply through with S3/S4 hooks, or drop guard straight into Shoulder Roll (M2) with zero post-block delay to pull aggressive opponents close and stagger them.',
    matchups: [
      { vs: 'Street Boxing / Slugger', advantage: 'Favorable', strategy: 'Slip their wide looping hooks with your tight bladed stance, then freeze them with Shoulder Roll.' },
      { vs: 'Muay Thai / Kickboxing', advantage: 'Even', strategy: 'Watch for mid-range kicks; time parries to trigger Deflective Posture Reset and cut their stamina.' },
      { vs: 'CQC / Keysi', advantage: 'Even', strategy: 'Punish aggressive pocket rushes by trading into Shoulder Roll Super Armor.' }
    ]
  },

  cqc: {
    id: 'cqc',
    archetype: 'Tactical Assassin',
    difficulty: 'Expert',
    combatPhilosophy: 'Close Quarters Combat: military joint locks, tactical acceleration that speeds up each hit in sequence, posture loops, and a brutal 5-hit lockout assault from behind.',
    keyStrengths: [
      'Tactical Acceleration: Landed M1 strikes progressively speed up subsequent strikes by +0.15s per hit',
      'Posture Loop: Landing full S4 finisher refunds 25% Posture CD; Landing M2 instantly resets Posture CD to 0.0s',
      'Lockout Assault: 5-Hit M2 from behind disables opponent attacks (M1 & M2) for 2.0s',
      'Super Armor Initiation: Gains Super Armor during M2 initiation and dash execution'
    ],
    vulnerabilities: [
      'Takes +10% increased damage (0.90x defense penalty)',
      'First 0.24s of M2 windup can be interrupted by incoming strikes (gains Super Armor after 0.24s)'
    ],
    moves: [
      { code: 'S1', name: 'Left Open Palm', type: 'Light', damage: 6.0, damageLabel: '6.0 HP (+0.15s on Hit)', startupFrames: 14, startupSpeed: '1.00x (0.23s)', recoverySeconds: 0.08, hitstunSeconds: 0.45, iFrames: 'None', superArmor: false, guardChip: 'Standard (1.2 HP)', description: 'Hand retracts slightly before snapping forward. Landing increases combo speed by +0.15s.', tacticalRole: 'Acceleration opener' },
      { code: 'S2', name: 'Right Open Palm', type: 'Light', damage: 6.0, damageLabel: '6.0 HP (+0.30s on Hit)', startupFrames: 12, startupSpeed: '1.15x (0.20s)', recoverySeconds: 0.08, hitstunSeconds: 0.45, iFrames: 'None', superArmor: false, guardChip: 'Standard (1.2 HP)', description: 'Fast tactical palm thrust driving forward. Landing stacks an additional +0.15s combo speed.', tacticalRole: 'Acceleration stack 2' },
      { code: 'S3', name: 'Forearm Strike', type: 'Light', damage: 7.0, damageLabel: '7.0 HP (+0.45s on Hit)', startupFrames: 10, startupSpeed: '1.30x (0.17s)', recoverySeconds: 0.09, hitstunSeconds: 0.45, iFrames: 'None', superArmor: false, guardChip: 'Standard (1.4 HP)', description: '45-degree rotational forearm strike into chest line. Stacks speed acceleration up to +0.45s.', tacticalRole: 'Acceleration stack 3' },
      { code: 'S4', name: 'Front Straight Punch', type: 'Finisher', damage: 9.0, damageLabel: '9.0 HP', startupFrames: 15, startupSpeed: '1.00x (0.25s)', recoverySeconds: 0.20, hitstunSeconds: 0.80, iFrames: 'None', superArmor: false, guardChip: 'Refunds 25% Posture CD', description: 'Full linear extension straight punch. On hit: refunds 25% Posture Cooldown and resets M1 speed to default.', tacticalRole: 'Posture refund & reset' },
      { code: 'M2', name: 'Tactical CQC Assault', type: 'Heavy', damage: 14.0, damageLabel: '14.0 HP (5 Hits)', startupFrames: 24, startupSpeed: '15.0s CD (0.40s)', recoverySeconds: 0.35, hitstunSeconds: 2.00, iFrames: 'Super Armor during dash & blitz', superArmor: true, guardChip: '2.0s Complete Attack Lockout', description: 'Emits 8 Echo Rings (20% decreased range, 272px max reach), locks on, dashes to enemy rear with Super Armor (uninterruptible after 0.24s), and executes a 5-hit lockout assault that disables attacks for 2.0s and resets Posture CD to 0.0s.', tacticalRole: 'Rear disarm & full posture reset' }
    ],
    passives: [
      {
        name: 'Tactical Acceleration',
        trigger: 'Landing Consecutive M1 Strikes',
        type: 'Combo Velocity Ramp',
        mechanicalBreakdown: 'Each consecutive M1 strike landed increases the execution speed of the next light strike by 0.15 seconds. Landing S4 or whiffing/missing resets speed back to default baseline.',
        combatAnalogy: 'Chaining rapid hand-trapping palm strikes that flow with accelerating momentum like flowing water.',
        tacticalAdvantage: 'Creates an inescapable flurry where the opponent is trapped in consecutive hitstuns.',
        counterplayNote: 'Parry the opening palm strikes or dash away before CQC reaches S3/S4 acceleration.'
      },
      {
        name: 'Posture Loop',
        trigger: 'Landing Full M1 Sequence or M2',
        type: 'Posture Cooldown Refund',
        mechanicalBreakdown: 'Landing the full M1 sequence (S1–S4) refunds 25% of your Posture Cooldown. Landing an M2 heavy attack instantly resets Posture Cooldown back to 0.0s.',
        combatAnalogy: 'Executing military-grade joint locks that leave the enemy disarmed and helpless while your stamina instantly recovers.',
        tacticalAdvantage: 'Zero stamina downtime for continuous pressure.',
        counterplayNote: 'Disrupt the combo chain before S4 or M2 connects.'
      },
      {
        name: 'Lockout Assault & Directional Guard',
        trigger: 'Landing M2 Tactical Assault',
        type: 'Rear Assault & 2.0s Disarm',
        mechanicalBreakdown: 'Landing M2 executes a 5-hit rear combo that disables the opponent\'s M1 and M2 for 2.0 seconds. Head-On Defense Rule: If the opponent is facing you head-on with block, they block the attack. If CQC passes through behind them, they take damage and their block is disabled until the 5th strike (where they regain block for a frame-tight counter opportunity). Deals 86% Armor HP damage on block.',
        combatAnalogy: 'Slipping behind an opponent to crush their joints and disarm their attacks completely.',
        tacticalAdvantage: 'Devastating 5-hit rear blitz with 2.0s attack lockout.',
        counterplayNote: 'Face CQC head-on with block or parry hit 5.'
      },
      {
        name: 'Super Armor Blitz',
        trigger: 'M2 Dash & Execution',
        type: 'Uninterruptible Assault',
        mechanicalBreakdown: 'Gains Super Armor during the dash and throughout the entire 5-hit combo execution (only removed after the 5th hit). Interrupt Window: Can only be cancelled/interrupted during the first 0.25 seconds of windup. Camera/steering is locked facing the target during execution.',
        combatAnalogy: 'Powering forward through enemy counter-strikes to lock onto their rear position.',
        tacticalAdvantage: 'Unstoppable blitz once past the initial 0.25s windup.',
        counterplayNote: 'Interrupt during the first 0.25s of windup.'
      }
    ],
    proTactics: 'Stack your Tactical Acceleration with consecutive M1 palm strikes, then unleash Tactical CQC Assault (M2). The Super Armor dash slips directly behind your target for a 5-hit lockout blitz that resets your Posture Cooldown to zero!',
    matchups: [
      { vs: 'Slugger / Street Boxing', advantage: 'Favorable', strategy: 'Your tactical acceleration and reduced knockback trap them in inescapable close-quarters lockout loops.' },
      { vs: 'Kyokushin / Ashihara', advantage: 'Even', strategy: 'Their heavy posture and guard need precise lockout blitzes; time your M2 after they commit to heavy windups.' },
      { vs: 'Shotokan / Taekwondo', advantage: 'Favorable', strategy: 'Echo Rings lock on from distance and your Super Armor dash bypasses their zoning kicks straight to their back.' }
    ]
  },

  aikido: {
    id: 'aikido',
    archetype: 'Counter-Technician',
    difficulty: 'Advanced',
    combatPhilosophy: 'The Way of Harmonizing Energy: circular wrist locks, Aiki momentum redirection, Kinetic Intercept clash slams, and unblockable overhead counter slams.',
    keyStrengths: [
      'Tenchi Counter Slam: Parrying opens a 0.20s window to press M1 and execute a 10.0 DMG Over-Head Counter Slam',
      'Kinetic Intercept: M1 strike clashes (excl. S3) have a 30% Chance to trigger a 10.0 DMG Over-Head Clash Slam',
      'Tenkan Aiki Flow: Landing M1 S3 grants a Free M2 Stance Boost (15s CD, reduced by 2s per M1 hit)',
      'Aiki Redirection State: +15% Damage Resistance and 2-hit Super Armor during M2, enhancing S4 into 22.0 DMG Guard Break Slam',
      'Over-Head Slam Control: Slams floor the enemy and apply 1.0s Super Cripple (-60% speed & attack lockout)',
      'Vision Disruption: Slam disrupts enemy vision with 1s shaky screen and inflicts Super Cripple for 1s'
    ],
    vulnerabilities: [
      'Requires precise spacing to maximize Kinetic Intercept clash reads',
      'Manual M2 is locked while Free M2 Boost is active'
    ],
    moves: [
      { code: 'S1', name: 'Irimi Open-Palm', type: 'Light', damage: 4.0, damageLabel: '4.0 HP', startupFrames: 13, startupSpeed: '1.05x (0.21s)', recoverySeconds: 0.07, hitstunSeconds: 0.40, iFrames: 'None', superArmor: false, guardChip: 'Standard (0.8 HP)', description: 'Explosive straight-line open palm thrust with flared elbow pullback.', tacticalRole: 'Aiki lead opener' },
      { code: 'S2', name: 'Kote-Gaeshi Slap', type: 'Light', damage: 4.0, damageLabel: '4.0 HP (Wrist Trap)', startupFrames: 13, startupSpeed: '1.05x (0.21s)', recoverySeconds: 0.08, hitstunSeconds: 0.45, iFrames: 'None', superArmor: false, guardChip: 'Standard (0.8 HP)', description: 'Straight-arm Tegatana knife-hand chop that traps opponent\'s lead wrist.', tacticalRole: 'Joint control & wrist trap' },
      { code: 'S3', name: 'Tenkan Arm-Cross Sweep', type: 'Light', damage: 0.0, damageLabel: '0.0 HP (Free M2 Trigger)', startupFrames: 14, startupSpeed: '1.05x (0.23s)', recoverySeconds: 0.09, hitstunSeconds: 0.50, iFrames: 'None', superArmor: false, guardChip: 'None (0.0 HP)', description: 'Double-arm crossing scissor deflection catching opponent guard and triggering Free M2 Stance Boost.', tacticalRole: 'Tenkan Aiki Flow & stance trigger' },
      { code: 'S4', name: 'Shomenuchi Flaring Palm Drive', type: 'Finisher', damage: 8.0, damageLabel: '8.0 HP (2x Knockback on Stun)', startupFrames: 16, startupSpeed: '1.00x (0.27s)', recoverySeconds: 0.22, hitstunSeconds: 0.70, iFrames: 'None', superArmor: false, guardChip: 'Heavy (1.5 HP)', description: 'Linear straight palm thrust utilizing rear elbow-flaring torque. Inflicts 2x Massive Knockback on stunned or staggered targets.', tacticalRole: 'Centrifugal ejection finisher' },
      { code: 'M2', name: 'Aiki Redirection Stance', type: 'Heavy', damage: 0.0, damageLabel: '0.0 HP (Stance & +15% DR)', startupFrames: 8, startupSpeed: '6.0s CD (0.13s)', recoverySeconds: 0.25, hitstunSeconds: 0.50, iFrames: '2-Hit Super Armor', superArmor: true, guardChip: 'None (Stance Buff)', description: 'Enters 5.0s Aiki stance: +15% Damage Resistance, 2-hit Super Armor, enhances S4 into 22.0 DMG Guard Break Slam.', tacticalRole: 'Redirection stance & defense buff' }
    ],
    passives: [
      {
        name: 'Tenchi Counter Slam (Heaven & Earth Parry Slam)',
        trigger: 'Successful Timed Parry + M1 Input',
        type: '0.20s Reaction Window Throw (10.0 DMG)',
        mechanicalBreakdown: 'Landing a successful parry opens an immediate 0.20-second (12-frame) reaction window indicated by "TENCHI COUNTER READY! (M1 SLAM)". Pressing M1 during this window converts your parry directly into a 10.0 DMG Over-Head Counter Slam (1.0s Shaky Vision, 1.0s Super Cripple). If M1 is not pressed in time, the opponent only suffers standard parry stun.',
        combatAnalogy: 'Catching the opponent\'s committed attack momentum on parry contact and instantly leveraging their off-balance posture into a rapid Tenchi Nage floor throw.',
        tacticalAdvantage: 'Guarantees an unblockable, fast counter slam against predictable attacks when buffered quickly.',
        counterplayNote: 'Feint strikes to bait out Aikido parry attempts and avoid feeding them counter slam windows.'
      },
      {
        name: 'Kinetic Intercept (Clash Counter Slam)',
        trigger: 'M1 Strike Clash (excl. S3)',
        type: '30% Clash Counter Slam (10.0 DMG)',
        mechanicalBreakdown: 'Clashing or intersecting your M1 hitbox with an incoming enemy hitbox has a 30% Chance to automatically trigger a 10.0 DMG Over-Head Counter Slam (1.0s Super Cripple). M1 S3 is strictly excluded.',
        combatAnalogy: 'Intercepting the opponent\'s arm vector mid-strike to turn their forward momentum into an immediate deflection toss.',
        tacticalAdvantage: 'Trades close-range strike clashes into unblockable throws with positioning advantage.',
        counterplayNote: 'Bait M1 strikes or use S3 Tenkan setups to avoid direct clashes.'
      },
      {
        name: 'Tenkan Aiki Flow (S3 Free M2 Trigger)',
        trigger: 'Landing M1 S3',
        type: 'Free M2 Boost & CD Reduction',
        mechanicalBreakdown: 'Landing M1 S3 directly on an opponent grants a Free M2 Stance Boost without triggering M2 Cooldown (15.0s baseline CD). Landing any M1 light attacks reduces this cooldown by 2.0s per hit. Manual M2 is locked while active.',
        combatAnalogy: 'Pivoting off a wrist redirection directly into an effortless redirection stance.',
        tacticalAdvantage: 'Free M2 stance without burning manual heavy cooldown.',
        counterplayNote: 'Dodge or block S3 to deny the free stance trigger.'
      },
      {
        name: 'Resonant Vortex',
        trigger: 'Attacking a Stunned/Staggered Opponent',
        type: 'Stagger Extension',
        mechanicalBreakdown: 'If you attack an opponent who is currently suffering from a hitstun or stagger state, the stun duration is extended to 0.6 seconds.',
        combatAnalogy: 'Feeding circular angular momentum into an already unbalance opponent to amplify their stagger.',
        tacticalAdvantage: 'Doubles the stun duration and guarantees uninterrupted combo execution.',
        counterplayNote: 'Avoid getting trapped by S3 Tenkan Arm-Cross Sweep in close quarters.'
      },
      {
        name: 'Centrifugal Ejection',
        trigger: 'Landing M1 S4 on a Stunned/Staggered Opponent',
        type: 'Kinetic Palm Amplification',
        mechanicalBreakdown: 'Landing your M1 S4 Palm Drive against an opponent who is actively in a stunned or staggered state inflicts 2x Massive Physical Knockback, launching them violently across the canvas grid with high-speed shockwave trails.',
        combatAnalogy: 'Unleashing a focused kinetic burst at the tangent of the opponent\'s off-balance stagger.',
        tacticalAdvantage: 'Huge arena-clearing knockback creating instant ring control and space.',
        counterplayNote: 'Guard or avoid the S3 setup to prevent the 2x ejection blast.'
      }
    ],
    proTactics: 'Rely on your Aiki Shield to absorb initial rushes. Activate M2 Aiki Redirection Stance before trading strikes to gain +15% Damage Resistance and a 40% auto-parry on clashes. Time parries to trigger the devastating 22.0 HP Over-Head Counter Slam, flooring the victim and blinding them with 1s shaky vision and Super Cripple!',
    matchups: [
      { vs: 'Street Boxing / Slugger', advantage: 'Favorable', strategy: 'Their aggressive forward strikes clash directly into your M2 stance, feeding your 40% auto-parry and counter slams.' },
      { vs: 'Kickboxing / Muay Thai', advantage: 'Even', strategy: 'Pop their guard with Aiki Shield intact, then redirect mid-range kicks into Over-Head Counter Slams.' },
      { vs: 'CQC / Keysi', advantage: 'Caution', strategy: 'Avoid letting CQC get behind your Aiki Shield; keep them in front to land wrist lock counter throws.' }
    ]
  }
};
