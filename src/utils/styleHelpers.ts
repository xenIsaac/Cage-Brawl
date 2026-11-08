// Style Helper Functions extracted from Arena.tsx

export const getStyleInitials = (styleId: string): string => {
  switch (styleId) {
    case 'street_boxing': return 'SB';
    case 'shotokan': return 'SK';
    case 'slugger': return 'SL';
    case 'muay_thai': return 'MT';
    case 'ashihara': return 'AK';
    case 'capoeira': return 'CP';
    case 'kickboxing': return 'KB';
    case 'street_taekwondo': return 'TK';
    case 'kyokushin': return 'KK';
    default: return 'BS';
  }
};

export const getStyleRarityColor = (_rarity?: string): string => {
  return 'text-amber-400 border-amber-500/40 bg-amber-950/40';
};

export const getHeavySkillName = (styleId: string): string => {
  switch (styleId) {
    case 'basic': return 'Shadow Step Strike';
    case 'street_boxing': return 'Pocket Flurry';
    case 'shotokan': return 'Back Kick';
    case 'slugger': return 'Charged Heavy Hook';
    case 'muay_thai': return 'Clinch Knee Strike';
    case 'ashihara': return 'Sabaki Tsukami Counter';
    case 'capoeira': return 'Meia Lua de Compasso';
    case 'kickboxing': return 'Dazing Hook to Teep';
    case 'street_taekwondo': return 'Brazilian Kick';
    case 'kyokushin': return 'Gedan Mawashi Geri';
    case 'keysi': return 'Pensador Drive';
    case 'cqc': return 'Tactical CQC Assault';
    case 'boxing_shell': return 'Shoulder Roll';
    case 'aikido': return 'Aiki Redirection Stance';
    default: return 'Heavy Right Hook';
  }
};

export const getMaxHeavyCooldown = (styleId: string): number => {
  switch (styleId) {
    case 'slugger': return 720;
    case 'basic': return 840;
    case 'kickboxing': return 480;
    case 'street_boxing': return 780;
    case 'keysi': return 720;
    case 'muay_thai': return 420;
    case 'ashihara': return 480;
    case 'shotokan': return 720;
    case 'kyokushin': return 600;
    case 'capoeira': return 480;
    case 'street_taekwondo': return 420;
    case 'cqc': return 900;
    case 'boxing_shell': return 600;
    case 'aikido': return 780;
    default: return 480;
  }
};

export const getHeavySkillIcon = (styleId: string): string => {
  switch (styleId) {
    case 'street_boxing': return '⚡';
    case 'shotokan': return '💫';
    case 'slugger': return '💥';
    case 'muay_thai': return '🦵';
    case 'ashihara': return '🛡️';
    case 'capoeira': return '🔄';
    case 'kickboxing': return '🥊';
    case 'street_taekwondo': return '🥋';
    case 'kyokushin': return '🥋';
    case 'keysi': return '🛡️';
    case 'cqc': return '♟️';
    case 'boxing_shell': return '🔄';
    case 'aikido': return '🛡️';
    default: return '🥊';
  }
};
