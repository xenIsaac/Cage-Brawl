// Match Mode Key helper function extracted from Arena.tsx

export type MatchModeKey = 'ranked_pvp' | 'unranked_pvp' | 'ranked_ai' | 'unranked_ai';

export const getMatchModeKey = (matchData?: {
  isAiMatch?: boolean;
  aiModeType?: string;
  isCompetitive?: boolean;
}): MatchModeKey => {
  if (matchData?.isAiMatch) {
    return (matchData.aiModeType === 'ranked' || matchData.aiModeType === 'tournament') ? 'ranked_ai' : 'unranked_ai';
  }
  return matchData?.isCompetitive ? 'ranked_pvp' : 'unranked_pvp';
};
