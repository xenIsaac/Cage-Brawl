export interface AIChallenger {
  id: string;
  name: string;
  level: number;
  elo: number;
  styleId: string;
  cashReward: number;
  difficulty: string;
  desc: string;
  difficultyColor: string;
  borderColor: string;
  bgColor: string;
  avatarIcon: string;
}

export const AI_CHALLENGERS: AIChallenger[] = [
  {
    id: 'marcus',
    name: 'Coach Marcus',
    level: 5,
    elo: 1000,
    styleId: 'muay_thai',
    cashReward: 20,
    difficulty: 'Bronze',
    difficultyColor: 'text-amber-600',
    borderColor: 'border-amber-600/30',
    bgColor: 'bg-amber-950/10',
    avatarIcon: '🥊',
    desc: 'The gym instructor. Focuses on patient, slow roundhouse kicks and steady clinches. Perfect for practice!'
  },
  {
    id: 'rick',
    name: 'Slick Rick',
    level: 15,
    elo: 1250,
    styleId: 'street_boxing',
    cashReward: 45,
    difficulty: 'Silver',
    difficultyColor: 'text-slate-400',
    borderColor: 'border-slate-400/30',
    bgColor: 'bg-slate-900/40',
    avatarIcon: '⚡',
    desc: 'An agile underground boxer. Relies on lightning fast slip drive dash ins and swift pocket jabs.'
  },
  {
    id: 'golem',
    name: 'Iron Golem',
    level: 30,
    elo: 1550,
    styleId: 'slugger',
    cashReward: 75,
    difficulty: 'Gold',
    difficultyColor: 'text-yellow-500',
    borderColor: 'border-yellow-500/30',
    bgColor: 'bg-yellow-950/10',
    avatarIcon: '🧱',
    desc: 'Heavyweight champion. Trades hits relentlessly, shatters shields, and has massive punch power multipliers.'
  },
  {
    id: 'jin',
    name: 'Master Jin',
    level: 50,
    elo: 1800,
    styleId: 'shotokan',
    cashReward: 120,
    difficulty: 'Diamond',
    difficultyColor: 'text-blue-400',
    borderColor: 'border-blue-400/30',
    bgColor: 'bg-blue-950/10',
    avatarIcon: '☯️',
    desc: 'Traditional karate master. Employs frame-perfect counters, spinning back kicks, and long-range reach sweeps.'
  },
  {
    id: 'replicant',
    name: 'Omega Replicant',
    level: 80,
    elo: 2150,
    styleId: 'capoeira',
    cashReward: 200,
    difficulty: 'Legendary',
    difficultyColor: 'text-purple-400',
    borderColor: 'border-purple-500/40',
    bgColor: 'bg-purple-950/10',
    avatarIcon: '👾',
    desc: 'The ultimate AI unit. Combines extreme acrobatics, spammable rhythm dodges, and active I-Frames on sweeps.'
  }
];
