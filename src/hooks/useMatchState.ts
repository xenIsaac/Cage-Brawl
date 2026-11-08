import { useState } from 'react';
import { PlayerStats } from '../types';

export interface UseMatchStateOptions {
  matchData?: any;
  stats: PlayerStats;
}

export function useMatchState({ matchData, stats }: UseMatchStateOptions) {
  const [isPlaying, setIsPlaying] = useState<boolean>(() => true);
  const [dummyBehavior, setDummyBehavior] = useState<string>(() => {
    if ((matchData as any)?.isTestGame) return 'idle';
    return (matchData as any)?.dummyBehavior || (matchData as any)?.dummyConfig?.behavior || 'passive';
  });
  const [dummyM1Speed, setDummyM1Speed] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [dummyFollow, setDummyFollow] = useState<boolean>(false);
  const [dummyStyleId, setDummyStyleId] = useState<string>(() => {
    return (matchData as any)?.opponent?.styleId || 
           (matchData as any)?.opponent?.style?.id || 
           (matchData as any)?.dummyStyleId || 
           (matchData as any)?.dummyConfig?.styleId || 
           'basic';
  });
  const [dummyHeightInInches, setDummyHeightInInches] = useState<number>(70);
  const [infiniteStamina, setInfiniteStamina] = useState<boolean>(() => {
    return !!((matchData as any)?.infiniteStamina || (matchData as any)?.dummyConfig?.staminaRecovery);
  });
  const [oneHitKODummy, setOneHitKODummy] = useState(false);
  const [godMode, setGodMode] = useState<boolean>(() => {
    return !!((matchData as any)?.godMode || (matchData as any)?.dummyConfig?.healthRecovery);
  });
  const [infiniteAIStamina, setInfiniteAIStamina] = useState<boolean>(false);

  // Statistics
  const [totalDamageDealt, setTotalDamageDealt] = useState<number>(0);
  const [totalHitsLanded, setTotalHitsLanded] = useState<number>(0);
  const [totalDamageTaken, setTotalDamageTaken] = useState<number>(0);
  const [totalSwings, setTotalSwings] = useState<number>(0);
  const [totalParries, setTotalParries] = useState<number>(0);
  const [totalBlocks, setTotalBlocks] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [opponentDistance, setOpponentDistance] = useState<number>(0);
  const [freezeAI, setFreezeAI] = useState<boolean>(() => !!(matchData as any)?.isTestGame);
  const [playerCombatState, setPlayerCombatState] = useState<string>('NEUTRAL');
  const [dummyCombatState, setDummyCombatState] = useState<string>('NEUTRAL');
  const [streak, setStreak] = useState(0);
  const [isDead, setIsDead] = useState(false);

  // Practice state
  const [practicePlayerStyleId, setPracticePlayerStyleId] = useState<string>(
    () => (matchData as any)?.playerStyleId || stats.selectedStyleId || 'basic'
  );
  const [practicePlayerHeightInInches, setPracticePlayerHeightInInches] = useState<number>(
    () => stats.heightInInches || 68
  );

  // Spectator / Ranked States
  const [spectatorCount, setSpectatorCount] = useState<number>(0);
  const [spectatorCamMode, setSpectatorCamMode] = useState<'track' | 'wide' | 'p1' | 'p2'>('track');
  const [spectatorReactions, setSpectatorReactions] = useState<Array<{ id: number; text: string; emoji: string; sender: string }>>([]);
  const [rankedState, setRankedState] = useState<'countdown' | 'fighting' | 'round_over' | 'match_over'>('countdown');

  return {
    isPlaying,
    setIsPlaying,
    dummyBehavior,
    setDummyBehavior,
    dummyM1Speed,
    setDummyM1Speed,
    dummyFollow,
    setDummyFollow,
    dummyStyleId,
    setDummyStyleId,
    dummyHeightInInches,
    setDummyHeightInInches,
    infiniteStamina,
    setInfiniteStamina,
    oneHitKODummy,
    setOneHitKODummy,
    godMode,
    setGodMode,
    infiniteAIStamina,
    setInfiniteAIStamina,
    totalDamageDealt,
    setTotalDamageDealt,
    totalHitsLanded,
    setTotalHitsLanded,
    totalDamageTaken,
    setTotalDamageTaken,
    totalSwings,
    setTotalSwings,
    totalParries,
    setTotalParries,
    totalBlocks,
    setTotalBlocks,
    maxCombo,
    setMaxCombo,
    opponentDistance,
    setOpponentDistance,
    freezeAI,
    setFreezeAI,
    playerCombatState,
    setPlayerCombatState,
    dummyCombatState,
    setDummyCombatState,
    streak,
    setStreak,
    isDead,
    setIsDead,
    practicePlayerStyleId,
    setPracticePlayerStyleId,
    practicePlayerHeightInInches,
    setPracticePlayerHeightInInches,
    spectatorCount,
    setSpectatorCount,
    spectatorCamMode,
    setSpectatorCamMode,
    spectatorReactions,
    setSpectatorReactions,
    rankedState,
    setRankedState,
  };
}
