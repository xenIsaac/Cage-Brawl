export type StyleClass = 'Striker' | 'Grappler' | 'Hybrid';
export type StyleClassCategory = 'Light' | 'Heavy';
export type StyleSpecialty = 'Combo' | 'Punish';
export type StylePlaystyle = 'Aggressive' | 'Defensive' | 'Passive';
export type StyleType = 'Street' | 'Professional' | 'Fiction';
export type StyleDevStatus = 'Current (Reworked)' | 'Current' | 'Under Rework' | 'Potential Rework';

export interface StyleClassification {
  styleId: string;
  name: string;
  class: StyleClass;
  classCategory: StyleClassCategory;
  specialty: StyleSpecialty;
  playstyle: StylePlaystyle;
  type: StyleType;
  status: StyleDevStatus;
  tacticalIdentity: string;
  combatCadence: string;
  winCondition: string;
  spacingStrategy: string;
  originDescription: string;
}

export interface TaxonomyKeyInfo {
  key: string;
  label: string;
  description: string;
  values: {
    name: string;
    description: string;
    examples: string[];
    color: string;
    bg: string;
    border: string;
  }[];
}

export const TAXONOMY_KEYS_GUIDE: TaxonomyKeyInfo[] = [
  {
    key: 'class',
    label: '1. Class (Combat System)',
    description: 'Defines the fighter\'s core offensive toolkit, combat mechanics, and engagement philosophy.',
    values: [
      {
        name: 'Striker',
        description: 'Focuses on direct punches, kicks, elbows, and knee impacts with clean kinematic hitboxes and spacing control.',
        examples: ['Flow Boxing', 'Street Boxing', 'Slugger', 'Kyokushin', 'Iron Boxing', 'Muay Thai', 'Kickboxing', 'Shotokan', 'Capoeira', 'Street Taekwondo'],
        color: 'text-amber-300',
        bg: 'bg-amber-950/40',
        border: 'border-amber-500/40'
      },
      {
        name: 'Grappler',
        description: 'Focuses on joint locks, momentum off-balancing, throws, and unblockable counter slams (e.g. Aiki Tenchi Nage).',
        examples: ['Aikido'],
        color: 'text-cyan-300',
        bg: 'bg-cyan-950/40',
        border: 'border-cyan-500/40'
      },
      {
        name: 'Hybrid',
        description: 'Seamlessly blends striking strings with direct clinch/grapple mechanics, trapping frames, and takedowns.',
        examples: ['Keysi', 'CQC', 'Ashihara Karate'],
        color: 'text-purple-300',
        bg: 'bg-purple-950/40',
        border: 'border-purple-500/40'
      }
    ]
  },
  {
    key: 'classCategory',
    label: '2. Class Category (Physical Weight & Cadence)',
    description: 'Dictates the physical weight profile, execution startup delay, limb speed, and guard-pushback mass.',
    values: [
      {
        name: 'Light',
        description: 'Rapid limb speeds, low startup tick delays, low recovery lag, and high evasion agility.',
        examples: ['Flow Boxing', 'Street Boxing', 'Iron Boxing', 'Aikido', 'Keysi', 'Ashihara Karate', 'Shotokan Karate', 'Street Taekwondo'],
        color: 'text-emerald-300',
        bg: 'bg-emerald-950/40',
        border: 'border-emerald-500/40'
      },
      {
        name: 'Heavy',
        description: 'Slower, deliberate high-impact windups, crushing guard pushback, armor conditioning, and high poise mass.',
        examples: ['Slugger', 'Kyokushin Karate', 'CQC', 'Muay Thai', 'Kickboxing', 'Capoeira'],
        color: 'text-rose-300',
        bg: 'bg-rose-950/40',
        border: 'border-rose-500/40'
      }
    ]
  },
  {
    key: 'specialty',
    label: '3. Specialty (Tactical Win Condition)',
    description: 'The core tactical pathway through which the fighting style secures round dominance and breaks the opponent.',
    values: [
      {
        name: 'Combo',
        description: 'Wins through sustained hit-volume, relentless sequential strings, tight frame traps, and guard posture melting.',
        examples: ['Flow Boxing', 'Street Boxing', 'Kickboxing', 'Muay Thai', 'CQC', 'Capoeira', 'Street Taekwondo'],
        color: 'text-blue-300',
        bg: 'bg-blue-950/40',
        border: 'border-blue-500/40'
      },
      {
        name: 'Punish',
        description: 'Wins by capitalizing on opponent mistakes, parries, whiff recovery locks, and catastrophic guard breaches.',
        examples: ['Slugger', 'Kyokushin Karate', 'Iron Boxing', 'Aikido', 'Keysi', 'Ashihara Karate', 'Shotokan Karate'],
        color: 'text-amber-300',
        bg: 'bg-amber-950/40',
        border: 'border-amber-500/40'
      }
    ]
  },
  {
    key: 'playstyle',
    label: '4. Playstyle (Pacing & Spacing Strategy)',
    description: 'Defines optimal combat spacing, neutral pacing, vector movement patterns, and engagement distance.',
    values: [
      {
        name: 'Aggressive',
        description: 'Suffocating forward vector pressure, inside-pocket sticking, relentless forward momentum, and guard erosion.',
        examples: ['Street Boxing', 'Slugger', 'Kyokushin', 'Keysi', 'CQC', 'Muay Thai', 'Kickboxing', 'Street Taekwondo'],
        color: 'text-red-400',
        bg: 'bg-red-950/40',
        border: 'border-red-500/40'
      },
      {
        name: 'Defensive',
        description: 'Angles, counter-punching, timed parry-fishing, shoulder rolls, and joint/flank deflections.',
        examples: ['Flow Boxing', 'Iron Boxing', 'Aikido', 'Ashihara Karate'],
        color: 'text-sky-300',
        bg: 'bg-sky-950/40',
        border: 'border-sky-500/40'
      },
      {
        name: 'Passive',
        description: 'Space control, neutral resetting, baiting whiffs, rhythm manipulation, and sudden counter-explosions.',
        examples: ['Shotokan Karate', 'Capoeira'],
        color: 'text-teal-300',
        bg: 'bg-teal-950/40',
        border: 'border-teal-500/40'
      }
    ]
  },
  {
    key: 'type',
    label: '5. Type (Combat Origin & Heritage)',
    description: 'The martial lineage, discipline roots, and institutional foundation of the fighting system.',
    values: [
      {
        name: 'Street',
        description: 'Pragmatic, gritty, uncodified, high-stakes street combat arts developed for unregulated survival.',
        examples: ['Street Boxing', 'Slugger', 'Keysi', 'Capoeira', 'Street Taekwondo'],
        color: 'text-orange-300',
        bg: 'bg-orange-950/40',
        border: 'border-orange-500/40'
      },
      {
        name: 'Professional',
        description: 'Traditional dojo disciplines, classical martial arts, or sanctioned combat sport federations.',
        examples: ['Flow Boxing', 'Kyokushin Karate', 'Aikido', 'Iron Boxing', 'Ashihara Karate', 'Muay Thai', 'Kickboxing', 'Shotokan Karate'],
        color: 'text-indigo-300',
        bg: 'bg-indigo-950/40',
        border: 'border-indigo-500/40'
      },
      {
        name: 'Fiction',
        description: 'Elite military black-ops, cinematic tactical CQC, or specialized speculative combat engines.',
        examples: ['CQC'],
        color: 'text-fuchsia-300',
        bg: 'bg-fuchsia-950/40',
        border: 'border-fuchsia-500/40'
      }
    ]
  }
];

export const STYLE_CLASSIFICATIONS: Record<string, StyleClassification> = {
  basic: {
    styleId: 'basic',
    name: 'Flow Boxing',
    class: 'Striker',
    classCategory: 'Light',
    specialty: 'Combo',
    playstyle: 'Defensive',
    type: 'Professional',
    status: 'Current (Reworked)',
    tacticalIdentity: 'Evasive Out-Boxer utilizing pendulum footwork, afterimage slip I-frames, and feint parry traps.',
    combatCadence: 'Lightweight & Snappy (1.15x Speed, 0.20s startup tick delays).',
    winCondition: 'Sustained hit-volume strings and S3 Feint Trap baiting into unparryable 2x DMG S4 punish.',
    spacingStrategy: 'Out-boxer perimeter spacing with rhythmic pendulum weaves and Reflex Pivot counters.',
    originDescription: 'Sanctioned professional boxing adapted into fluid, evasive out-boxing.'
  },
  street_boxing: {
    styleId: 'street_boxing',
    name: 'Street Boxing',
    class: 'Striker',
    classCategory: 'Light',
    specialty: 'Combo',
    playstyle: 'Aggressive',
    type: 'Street',
    status: 'Current (Reworked)',
    tacticalIdentity: 'Aggressive In-Fighter with Stiff Poke Guard, In-Pocket Cling, Unparryable Flurry, and Snapping Counter.',
    combatCadence: 'Rapid forward jabs and inside-pocket burst hooks.',
    winCondition: 'Inside cling forward momentum to breach guard and execute guaranteed hit-confirm follow-ups.',
    spacingStrategy: 'Zero-distance pocket sticking, staying glued to the opponent\'s chest.',
    originDescription: 'Gritty, unregulated underground street brawling boxing.'
  },
  slugger: {
    styleId: 'slugger',
    name: 'Slugger',
    class: 'Striker',
    classCategory: 'Heavy',
    specialty: 'Punish',
    playstyle: 'Aggressive',
    type: 'Street',
    status: 'Current (Reworked)',
    tacticalIdentity: 'Kinetic Super-Heavyweight brawler with devastating Sonic Boom M2, Kinetic Overdrive, and Bone Fracture attrition.',
    combatCadence: 'Heavy & Deliberate (0.68x Speed, high startup windups, massive pushback).',
    winCondition: 'Landing crushing Haymakers and accumulating Bone Fracture stacks to cripple opponent defense.',
    spacingStrategy: 'Forward aggressive vector, cutting off cage angles to trap enemies against the perimeter.',
    originDescription: 'Heavy-handed street slugger discipline relying on brute momentum.'
  },
  kyokushin: {
    styleId: 'kyokushin',
    name: 'Kyokushin Karate',
    class: 'Striker',
    classCategory: 'Heavy',
    specialty: 'Punish',
    playstyle: 'Aggressive',
    type: 'Professional',
    status: 'Current (Reworked)',
    tacticalIdentity: 'Heavy Full-Contact Brawler featuring Degrading Armor Conditioning (10% DR), Kinetic Counter-Charge, and Rooted Fudo Dachi.',
    combatCadence: 'Crushing full-contact power strikes with unyielding forward stance momentum.',
    winCondition: 'Absorbing incoming hits through Super Armor conditioning and retaliating with catastrophic Guard Breach palms.',
    spacingStrategy: 'Mid-to-close heavy trades, refusing to yield ground.',
    originDescription: 'Traditional full-contact knockdown karate founded on severe conditioning and destructive power.'
  },
  keysi: {
    styleId: 'keysi',
    name: 'Keysi',
    class: 'Hybrid',
    classCategory: 'Light',
    specialty: 'Punish',
    playstyle: 'Aggressive',
    type: 'Street',
    status: 'Current (Reworked)',
    tacticalIdentity: 'CQC Clinch Trapper with Pensador wedge defense, +50% intercepting slip dash, and Pensador Elbow Clinch to Headbutt with 4s Stagger.',
    combatCadence: 'Explosive double-elbow guard charges and close-quarters tight strikes.',
    winCondition: 'Halting dashes on collision into immediate Clinch Headbutt to inflict catastrophic 4.0s Stagger.',
    spacingStrategy: 'Aggressive close-range cage entrapment using double-elbow wedge shields.',
    originDescription: 'Close-quarters urban street defense method designed for 360-degree close-range survival.'
  },
  aikido: {
    styleId: 'aikido',
    name: 'Aikido',
    class: 'Grappler',
    classCategory: 'Light',
    specialty: 'Punish',
    playstyle: 'Defensive',
    type: 'Professional',
    status: 'Current (Reworked)',
    tacticalIdentity: 'Deflective Counter-Grappler with Tenchi Parry Counter (10 DMG), Kinetic Intercept (10 DMG 30% clash slam), Tenkan Aiki Flow, and Aiki Redirection (22 DMG Guard Break Slam).',
    combatCadence: 'Lightweight circular Hanmi stances, flowing palm thrusts, and rapid redirection throws.',
    winCondition: 'Turning opponent committed attacks into unblockable counter slams and 1.0s Super Cripple locks.',
    spacingStrategy: 'Defensive perimeter circle-strafe, fishing for timed parries and M1 clash intersections.',
    originDescription: 'Classical Japanese martial art focused on redirecting opponent energy into joint locks and throws.'
  },
  boxing_shell: {
    styleId: 'boxing_shell',
    name: 'Iron Boxing',
    class: 'Striker',
    classCategory: 'Light',
    specialty: 'Punish',
    playstyle: 'Defensive',
    type: 'Professional',
    status: 'Current',
    tacticalIdentity: 'Philly Shell shoulder roll master with lead flank guard, +50% lead jab execution, and instant guard-drop Shoulder Roll.',
    combatCadence: 'Rapid snapping lead jabs combined with rhythmic shoulder rolling.',
    winCondition: 'Deflecting opponent power strikes on the lead shoulder and landing lightning counter-cross punishes.',
    spacingStrategy: 'Bladed side-stance spacing, protecting center-line with the lead shoulder.',
    originDescription: 'Elite professional boxing Philly Shell defensive methodology.'
  },
  cqc: {
    styleId: 'cqc',
    name: 'CQC',
    class: 'Hybrid',
    classCategory: 'Heavy',
    specialty: 'Combo',
    playstyle: 'Aggressive',
    type: 'Fiction',
    status: 'Current',
    tacticalIdentity: 'Military Close Quarters Combat specialist with tactical multi-ring lock-on dashes and brutal 4-hit takedowns.',
    combatCadence: 'Heavy, decisive tactical strikes and grapple takedowns.',
    winCondition: 'Locking onto targets with radar rings and executing uninterruptible assault sequences.',
    spacingStrategy: 'Relentless tactical closing of distance from mid to grapple range.',
    originDescription: 'Spec-ops military combat system engineered for rapid neutralization.'
  },
  ashihara: {
    styleId: 'ashihara',
    name: 'Ashihara Karate',
    class: 'Hybrid',
    classCategory: 'Light',
    specialty: 'Punish',
    playstyle: 'Defensive',
    type: 'Professional',
    status: 'Under Rework',
    tacticalIdentity: 'Sabaki positioning karate blending circular blind-spot angles, Mawashi Uke parry catches, and sweep takedowns.',
    combatCadence: 'Circular footwork and snapping deflection traps.',
    winCondition: 'Stepping into opponent blind-spots to trigger unblockable Sabaki sweeps.',
    spacingStrategy: 'Diagonal flanking movement around opponent attack vectors.',
    originDescription: 'Practical knockdown karate discipline founded on the Sabaki positioning method.'
  },
  muay_thai: {
    styleId: 'muay_thai',
    name: 'Muay Thai',
    class: 'Striker',
    classCategory: 'Heavy',
    specialty: 'Combo',
    playstyle: 'Aggressive',
    type: 'Professional',
    status: 'Potential Rework',
    tacticalIdentity: 'The Art of Eight Limbs: heavy shin kicks, spear knees, and crushing elbow combinations.',
    combatCadence: 'Heavy impact rhythm with bone-cracking multi-limb force.',
    winCondition: 'Breaking opponent guard posture with heavy shin kicks and devastating clinch knees.',
    spacingStrategy: 'Marching forward pressure into mid-range kick and clinch distance.',
    originDescription: 'Traditional Thai combat sport and martial art of eight limbs.'
  },
  kickboxing: {
    styleId: 'kickboxing',
    name: 'Kickboxing',
    class: 'Striker',
    classCategory: 'Heavy',
    specialty: 'Combo',
    playstyle: 'Aggressive',
    type: 'Professional',
    status: 'Potential Rework',
    tacticalIdentity: 'Dutch-style continuous volume kickboxing chaining heavy punches into low calf kick sweeps.',
    combatCadence: 'High-cadence punch-kick alternating combinations.',
    winCondition: 'Chaining S1/S2 high punches directly into S3 low leg sweeps to knock down opponent guard.',
    spacingStrategy: 'Active mid-range pocket pressure with aggressive forward combos.',
    originDescription: 'Sanctioned stand-up combat sport blending western boxing and karate kicking.'
  },
  shotokan: {
    styleId: 'shotokan',
    name: 'Shotokan Karate',
    class: 'Striker',
    classCategory: 'Light',
    specialty: 'Punish',
    playstyle: 'Passive',
    type: 'Professional',
    status: 'Potential Rework',
    tacticalIdentity: 'Traditional long-range karate with deep Zenkutsu Dachi lunges and explosive Ichi-Geki straight punches.',
    combatCadence: 'Burst acceleration from deep rooted stances into explosive linear thrusts.',
    winCondition: 'Spacing at maximum reach to execute one-hit decisive counter-thrusts on enemy windups.',
    spacingStrategy: 'Long-range neutral spacing, darting in and out of strike range.',
    originDescription: 'Classical Japanese karate style characterized by deep stances and linear power.'
  },
  capoeira: {
    styleId: 'capoeira',
    name: 'Capoeira',
    class: 'Striker',
    classCategory: 'Heavy',
    specialty: 'Combo',
    playstyle: 'Passive',
    type: 'Street',
    status: 'Potential Rework',
    tacticalIdentity: 'Acrobatic Ginga rhythm momentum, 360-degree sweep kicks, and fluid evasive dodging.',
    combatCadence: 'Swaying, rhythmic circular momentum with sweeping centrifugal power.',
    winCondition: 'Building Ginga flow momentum stacks to release massive Meia Lua spinning kicks.',
    spacingStrategy: 'Continuous rhythmic dancing sways outside the opponent\'s linear strike zone.',
    originDescription: 'Afro-Brazilian martial art combining dance, acrobatics, and rhythm.'
  },
  street_taekwondo: {
    styleId: 'street_taekwondo',
    name: 'Street Taekwondo',
    class: 'Striker',
    classCategory: 'Light',
    specialty: 'Combo',
    playstyle: 'Aggressive',
    type: 'Street',
    status: 'Potential Rework',
    tacticalIdentity: 'High-flying spinning kick strings, dynamic stance switches with I-frames, and flying roundhouses.',
    combatCadence: 'Rapid, aerial kicking strings with deceptive angle changes.',
    winCondition: 'Baiting opponent counters during stance switches to land unblockable jumping kicks.',
    spacingStrategy: 'Dynamic mid-range kicking arcs with sudden forward spin dashes.',
    originDescription: 'Acrobatic street-adapted Korean kicking discipline.'
  }
};

export const MASTER_CLASSIFICATION_LIST: StyleClassification[] = Object.values(STYLE_CLASSIFICATIONS);

export const getStyleClassification = (styleId: string): StyleClassification => {
  return STYLE_CLASSIFICATIONS[styleId] || {
    styleId,
    name: styleId,
    class: 'Striker',
    classCategory: 'Light',
    specialty: 'Combo',
    playstyle: 'Aggressive',
    type: 'Street',
    status: 'Current',
    tacticalIdentity: 'Standard combat style',
    combatCadence: 'Standard cadence',
    winCondition: 'Standard win condition',
    spacingStrategy: 'Standard spacing',
    originDescription: 'Standard discipline'
  };
};
