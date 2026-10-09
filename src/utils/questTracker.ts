export interface Quest {
  id: string;
  title: string;
  description: string;
  target: number;
  pool: 'ranked_pvp' | 'unranked_pvp' | 'ranked_ai' | 'unranked_ai' | 'milestone' | 'infinite';
  slotType?: 1 | 2 | 3;
  rewardCash: number;
  rewardRolls: number;
  rewardTitle?: string;
}

export interface QuestProgressData {
  lastDailyReset: string; // YYYY-MM-DD
  activeSlots: Record<string, string[]>; // mapping pool key -> array of 3 quest IDs

  // Ranked PvP counters
  rankedPvpWins: number;
  rankedPvpParries: number;
  rankedPvpHeavies: number;
  rankedPvpStreak: number;
  rankedPvpDominanceWins: number;
  rankedPvpHeavyFinishers: number;
  rankedPvpS4Combos: number;
  rankedPvpBlockedDamage: number;
  rankedPvpClutchWins: number;
  rankedPvpMatchesCompleted: number;
  rankedPvpFirstHits?: number;

  // Unranked PvP counters
  unrankedPvpWins: number;
  unrankedPvpLightDamage: number;
  unrankedPvpHeavies: number;
  unrankedPvpDodges: number;
  unrankedPvpMatchesCompleted: number;
  unrankedPvpParries: number;
  unrankedPvpDebuffs: number;
  unrankedPvpFirstHits: number;
  unrankedPvpCleanRounds: number;
  unrankedPvpStylesUsed: string[];

  // Ranked AI counters
  rankedAiWins: number;
  rankedAiMatchesCompleted: number;
  rankedAiParries: number;
  rankedAiHeavies: number;
  rankedAiFlawlessRounds: number;
  rankedAiS4Combos: number;
  rankedAiDebuffs: number;
  rankedAiSpeedruns: number;
  rankedAiBlockedDamage: number;
  rankedAiStreak: number;
  rankedAiLightOnlyWins: number;
  rankedAiClutchWins: number;
  rankedAiHeavyFinishers: number;
  rankedAiFirstHits: number;
  rankedAiLegendaryWins: number;
  rankedAiLightsLanded: number;
  rankedAiGuardBreaks: number;
  rankedAiBlitzWins: number;

  // Unranked AI counters
  unrankedAiWins: number;
  unrankedAiDamageDealt: number;
  unrankedAiHeavies: number;
  unrankedAiParries: number;
  unrankedAiDodges: number;
  unrankedAiS4Combos: number;
  unrankedAiMatchesCompleted: number;
  unrankedAiGuardBreaks: number;
  unrankedAiFirstHits: number;
  unrankedAiQuickFinishes: number;
  unrankedAiDominanceWins: number;
  unrankedAiBlockedDamage: number;

  // Lifetime Stats
  lifetimeWins: number;
  lifetimeDamageDealt: number;
  lifetimeHeavies: number;
  lifetimeRollsCount: number;
  lifetimeParries: number;
  lifetimeRankedMatches: number;

  // Claimed Quests
  claimed: string[]; // questIds

  // Infinite Levels and Progress (Rebirth system)
  inf_match_veteran_level: number;
  inf_match_veteran_progress: number;
  inf_damage_dealer_level: number;
  inf_damage_dealer_progress: number;
  inf_light_striker_level: number;
  inf_light_striker_progress: number;
  inf_heavy_striker_level: number;
  inf_heavy_striker_progress: number;
  inf_style_learner_level: number;
  inf_style_learner_progress: number;
  inf_grower_level: number;
  inf_grower_progress: number;
  inf_ranked_online_level: number;
  inf_ranked_online_progress: number;
  inf_ranked_ai_level: number;
  inf_ranked_ai_progress: number;
  inf_match_dominator_level: number;
  inf_match_dominator_progress: number;

  baselines?: Record<string, number>; // questId -> start value baseline when activated

  // Legacy fields for backward compatibility
  infiniteWinsClaimed?: number;
  infiniteDamageClaimed?: number;
  infiniteHeaviesClaimed?: number;
  infiniteRollsClaimed?: number;
  infiniteRankedClaimed?: number;
  firstMatchDone?: boolean;
}

export const QUESTS: Quest[] = [
  // ==========================================
  // 1. RANKED MATCHES POOL (Online Ranked)
  // ==========================================
  { id: 'ranked_elo_contender', title: 'Elo Contender', description: 'Win 3 Ranked Matches.', target: 3, pool: 'ranked_pvp', slotType: 1, rewardCash: 60, rewardRolls: 2 },
  { id: 'ranked_parry_precision', title: 'Parry Precision', description: 'Land 5 Perfect Parries in Ranked play.', target: 5, pool: 'ranked_pvp', slotType: 2, rewardCash: 50, rewardRolls: 2 },
  { id: 'ranked_executioner', title: 'Ranked Executioner', description: 'Connect 8 Heavy Attacks (M2) on hit in Ranked.', target: 8, pool: 'ranked_pvp', slotType: 3, rewardCash: 45, rewardRolls: 1 },
  { id: 'ranked_streak', title: 'Ranked Streak', description: 'Win 2 consecutive Ranked Matches.', target: 2, pool: 'ranked_pvp', slotType: 1, rewardCash: 75, rewardRolls: 3 },
  { id: 'ranked_dominance', title: 'Ranked Dominance', description: 'Win a Ranked Match taking under 25% damage.', target: 1, pool: 'ranked_pvp', slotType: 2, rewardCash: 100, rewardRolls: 4 },
  { id: 'ranked_heavy_finisher', title: 'Heavy Finisher', description: 'Defeat 2 Ranked opponents with an M2 as the final hit.', target: 2, pool: 'ranked_pvp', slotType: 3, rewardCash: 50, rewardRolls: 2 },
  { id: 'ranked_combo_specialist', title: 'Combo Specialist', description: 'Land 10 S4 Combo Finishers in Ranked.', target: 10, pool: 'ranked_pvp', slotType: 1, rewardCash: 50, rewardRolls: 2 },
  { id: 'ranked_iron_defense', title: 'Iron Defense', description: 'Block or Parry a total of 1,200 damage in Ranked.', target: 1200, pool: 'ranked_pvp', slotType: 2, rewardCash: 45, rewardRolls: 1 },
  { id: 'ranked_clutch_victory', title: 'Clutch Victory', description: 'Win a Ranked Match while under 20% Health.', target: 1, pool: 'ranked_pvp', slotType: 3, rewardCash: 70, rewardRolls: 3 },
  { id: 'ranked_veteran', title: 'Ranked Veteran', description: 'Complete 5 Ranked Matches (Win or Loss).', target: 5, pool: 'ranked_pvp', slotType: 1, rewardCash: 50, rewardRolls: 2 },

  // ==========================================
  // 2. UNRANKED / CASUAL MATCHES POOL (Online Unranked)
  // ==========================================
  { id: 'casual_victor', title: 'Casual Victor', description: 'Win 2 Unranked Matches.', target: 2, pool: 'unranked_pvp', slotType: 1, rewardCash: 35, rewardRolls: 1 },
  { id: 'casual_style_brawler', title: 'Style Brawler', description: 'Deal 600 damage using Light Attacks (S1–S4) in Unranked.', target: 600, pool: 'unranked_pvp', slotType: 2, rewardCash: 30, rewardRolls: 1 },
  { id: 'casual_heavy_pressure', title: 'Heavy Pressure', description: 'Land 5 Heavy Attacks (M2) in Unranked.', target: 5, pool: 'unranked_pvp', slotType: 3, rewardCash: 30, rewardRolls: 1 },
  { id: 'casual_evasion_artist', title: 'Evasion Artist', description: 'Dodge 6 incoming attacks using Block or Style Evasion.', target: 6, pool: 'unranked_pvp', slotType: 1, rewardCash: 30, rewardRolls: 1 },
  { id: 'casual_unranked_warmup', title: 'Unranked Warmup', description: 'Complete 3 Unranked Matches (Win or Loss).', target: 3, pool: 'unranked_pvp', slotType: 2, rewardCash: 30, rewardRolls: 1 },
  { id: 'casual_parry_practice', title: 'Parry Practice', description: 'Execute 3 Perfect Parries in Unranked.', target: 3, pool: 'unranked_pvp', slotType: 3, rewardCash: 35, rewardRolls: 1 },
  { id: 'casual_debuff_master', title: 'Debuff Master', description: 'Apply the 60% S4/M2 movement slow 8 times in Unranked.', target: 8, pool: 'unranked_pvp', slotType: 1, rewardCash: 30, rewardRolls: 1 },
  { id: 'casual_first_strike', title: 'First Strike', description: 'Land the first hit of the match in 3 Unranked games.', target: 3, pool: 'unranked_pvp', slotType: 2, rewardCash: 25, rewardRolls: 1 },
  { id: 'casual_clean_round', title: 'Clean Round', description: 'Win a round in Unranked taking under 15% damage.', target: 1, pool: 'unranked_pvp', slotType: 3, rewardCash: 60, rewardRolls: 2 },
  { id: 'casual_multi_style', title: 'Multi-Style Fighter', description: 'Complete 2 matches using 2 different fighting styles.', target: 2, pool: 'unranked_pvp', slotType: 1, rewardCash: 35, rewardRolls: 1 },

  // ==========================================
  // 3. RANKED VS AI POOL (Solo Ranked AI)
  // ==========================================
  { id: 'ai_ranked_bot_destroyer', title: 'Bot Destroyer', description: 'Defeat 3 Ranked AI opponents.', target: 3, pool: 'ranked_ai', slotType: 1, rewardCash: 30, rewardRolls: 1 },
  { id: 'ai_ranked_parry_timing', title: 'AI Parry Timing', description: 'Land 4 Perfect Parries against Ranked AI.', target: 4, pool: 'ranked_ai', slotType: 2, rewardCash: 25, rewardRolls: 1 },
  { id: 'ai_ranked_heavy_punish', title: 'Heavy AI Punish', description: 'Land 6 Heavy Attacks (M2) on Ranked AI.', target: 6, pool: 'ranked_ai', slotType: 3, rewardCash: 25, rewardRolls: 1 },
  { id: 'ai_ranked_flawless_round', title: 'Flawless AI Round', description: 'Defeat a Ranked AI taking 0 damage in a round.', target: 1, pool: 'ranked_ai', slotType: 1, rewardCash: 80, rewardRolls: 3 },
  { id: 'ai_ranked_combo_chain', title: 'AI Combo Chain', description: 'Land 6 S4 Combo Finishers on Ranked AI.', target: 6, pool: 'ranked_ai', slotType: 2, rewardCash: 25, rewardRolls: 1 },
  { id: 'ai_ranked_speed_control', title: 'Speed Control', description: 'Inflict the 60% slow debuff on Ranked AI 5 times.', target: 5, pool: 'ranked_ai', slotType: 3, rewardCash: 25, rewardRolls: 1 },
  { id: 'ai_ranked_speedrun', title: 'AI Speedrun', description: 'Defeat a Ranked AI in under 20 seconds.', target: 1, pool: 'ranked_ai', slotType: 1, rewardCash: 40, rewardRolls: 2 },
  { id: 'ai_ranked_defensive_drill', title: 'Defensive Drill', description: 'Block 800 damage from Ranked AI.', target: 800, pool: 'ranked_ai', slotType: 2, rewardCash: 20, rewardRolls: 1 },
  { id: 'ai_ranked_endurance', title: 'AI Endurance', description: 'Win 2 Ranked VS AI matches back-to-back.', target: 2, pool: 'ranked_ai', slotType: 3, rewardCash: 30, rewardRolls: 1 },
  { id: 'ai_ranked_calculated_offense', title: 'Calculated Offense', description: 'Win a Ranked AI match using only Light Attacks (S1–S4).', target: 1, pool: 'ranked_ai', slotType: 1, rewardCash: 35, rewardRolls: 1 },
  { id: 'ai_ranked_clutch', title: 'Iron Heart', description: 'Win a Ranked VS AI match while under 20% Health.', target: 1, pool: 'ranked_ai', slotType: 1, rewardCash: 40, rewardRolls: 2 },
  { id: 'ai_ranked_heavy_finisher', title: 'M2 Master Finisher', description: 'Defeat a Ranked AI opponent using a Heavy Attack (M2) as the final blow.', target: 1, pool: 'ranked_ai', slotType: 2, rewardCash: 30, rewardRolls: 1 },
  { id: 'ai_ranked_opening_strike', title: 'Lightning Opener', description: 'Land the opening strike (first hit) against Ranked AI 3 times.', target: 3, pool: 'ranked_ai', slotType: 3, rewardCash: 25, rewardRolls: 1 },
  { id: 'ai_ranked_iron_shield', title: 'Steel Wall', description: 'Block or Parry a total of 2,000 damage from Ranked AI.', target: 2000, pool: 'ranked_ai', slotType: 1, rewardCash: 35, rewardRolls: 1 },
  { id: 'ai_ranked_apex_predator', title: 'Apex Predator', description: 'Win 5 consecutive Ranked VS AI matches.', target: 5, pool: 'ranked_ai', slotType: 2, rewardCash: 60, rewardRolls: 2 },
  { id: 'ai_ranked_legendary_elite', title: 'Legendary Champion', description: 'Win a Ranked AI Match using a Legendary fighting style (Capoeira, Boxing: Champion, or BJJ).', target: 1, pool: 'ranked_ai', slotType: 3, rewardCash: 50, rewardRolls: 2 },
  { id: 'ai_ranked_lights_accumulator', title: 'Fists of Fury', description: 'Land 100 total Light Attacks on Ranked AI.', target: 100, pool: 'ranked_ai', slotType: 1, rewardCash: 30, rewardRolls: 1 },
  { id: 'ai_ranked_guard_breaker', title: 'Shield Breaker', description: 'Break a Ranked AI\'s guard/armor 3 times.', target: 3, pool: 'ranked_ai', slotType: 2, rewardCash: 30, rewardRolls: 1 },
  { id: 'ai_ranked_counter_god', title: 'Counter Mastery', description: 'Land 15 Perfect Parries against Ranked AI.', target: 15, pool: 'ranked_ai', slotType: 3, rewardCash: 40, rewardRolls: 2 },
  { id: 'ai_ranked_blitz', title: 'Unbreakable Blitz', description: 'Defeat a Ranked AI in under 15 seconds.', target: 1, pool: 'ranked_ai', slotType: 1, rewardCash: 50, rewardRolls: 2 },

  // ==========================================
  // 4. ONLINE PVP CHALLENGES (Achievement Tab)
  // ==========================================
  { id: 'online_easy_first_bout', title: 'First Octagon Step', description: 'Complete 5 Online PvP Matches.', target: 5, pool: 'milestone', rewardCash: 100, rewardRolls: 3, rewardTitle: 'Contender' },
  { id: 'online_easy_first_blood', title: 'First Blood', description: 'Score 10 opening strikes in PvP combat.', target: 10, pool: 'milestone', rewardCash: 120, rewardRolls: 3 },
  { id: 'online_med_ranked_climb', title: 'Ranked Ascender', description: 'Win 15 Online Ranked Matches.', target: 15, pool: 'milestone', rewardCash: 300, rewardRolls: 6, rewardTitle: 'Gladiator' },
  { id: 'online_med_clutch_gladiator', title: 'Heart of Iron', description: 'Win 3 Ranked PvP matches while under 20% Health.', target: 3, pool: 'milestone', rewardCash: 350, rewardRolls: 7, rewardTitle: 'Clutch King' },
  { id: 'online_hard_pvp_supremacy', title: 'PvP Overlord', description: 'Win 50 total Online PvP Matches.', target: 50, pool: 'milestone', rewardCash: 750, rewardRolls: 15, rewardTitle: 'Apex Predator' },
  { id: 'online_hard_win_streak', title: 'Unstoppable Rampage', description: 'Achieve a 5-win streak in Ranked PvP.', target: 5, pool: 'milestone', rewardCash: 600, rewardRolls: 12, rewardTitle: 'Undefeated' },
  { id: 'online_hard_parry_virtuoso', title: 'Parry Virtuoso', description: 'Land 40 Perfect Parries in Ranked PvP.', target: 40, pool: 'milestone', rewardCash: 500, rewardRolls: 10, rewardTitle: 'Steel Aegis' },

  // Career & Ranks (PvP & Styles)
  { id: 'welcome_octagon', title: 'First Victory', description: 'Win your very first match in any game mode.', target: 1, pool: 'milestone', rewardCash: 150, rewardRolls: 5, rewardTitle: 'Octagon Victor' },
  { id: 'style_collector', title: 'Style Enthusiast', description: 'Perform 25 Style rolls in the Gacha Shop.', target: 25, pool: 'milestone', rewardCash: 200, rewardRolls: 5, rewardTitle: 'Collector' },
  { id: 'legendary_practitioner', title: 'Legendary Practitioner', description: 'Equip any Legendary Style (Capoeira, Boxing: Champion, BJJ).', target: 1, pool: 'milestone', rewardCash: 300, rewardRolls: 5, rewardTitle: 'Legendary' },
  { id: 'genetic_anomaly', title: 'Genetic Anomaly', description: 'Roll a fighter height under 4\'6" or over 6\'7".', target: 1, pool: 'milestone', rewardCash: 250, rewardRolls: 5, rewardTitle: 'Freak of Nature' },
  { id: 'rookie_climb', title: 'Rookie Contender', description: 'Reach 250+ ELO in Ranked Division.', target: 250, pool: 'milestone', rewardCash: 100, rewardRolls: 2 },
  { id: 'copper_ascent', title: 'Copper Division', description: 'Reach 500+ ELO in Ranked Division.', target: 500, pool: 'milestone', rewardCash: 150, rewardRolls: 3, rewardTitle: 'Bronze Fist' },
  { id: 'silver_ascent', title: 'Silver Division', description: 'Reach 700+ ELO in Ranked Division.', target: 700, pool: 'milestone', rewardCash: 250, rewardRolls: 5, rewardTitle: 'Silver Striker' },
  { id: 'golden_elite', title: 'Gold Division', description: 'Reach 1,000+ ELO in Ranked Division.', target: 1000, pool: 'milestone', rewardCash: 400, rewardRolls: 8, rewardTitle: 'Golden Elite' },
  { id: 'diamond_brawler', title: 'Diamond Division', description: 'Reach 1,600+ ELO in Ranked Division.', target: 1600, pool: 'milestone', rewardCash: 700, rewardRolls: 15, rewardTitle: 'Diamond Brawler' },
  { id: 'amethyst_master', title: 'Amethyst Master', description: 'Reach 1,850+ ELO in Ranked Division.', target: 1850, pool: 'milestone', rewardCash: 1000, rewardRolls: 20, rewardTitle: 'Amethyst Grandmaster' },
  { id: 'obsidian_god', title: 'Obsidian Sovereign', description: 'Reach 2,000+ ELO in Ranked Division.', target: 2000, pool: 'milestone', rewardCash: 2000, rewardRolls: 30, rewardTitle: 'Obsidian God' },
];

export function getInfiniteTarget(id: string, level: number): number {
  if (level <= 0) return 0;
  const getTriangularTarget = (lvl: number) => (lvl * (lvl + 1)) / 2;

  switch (id) {
    case 'inf_match_veteran':
      return getTriangularTarget(level);
    case 'inf_damage_dealer':
      return level * 100;
    case 'inf_light_striker':
      return level * 4;
    case 'inf_heavy_striker':
      return level * 3;
    case 'inf_style_learner':
      return level * 5;
    case 'inf_grower':
      return level * 3;
    case 'inf_ranked_online':
      return getTriangularTarget(level);
    case 'inf_ranked_ai':
      return getTriangularTarget(level);
    case 'inf_match_dominator':
      return level * 5;
    default:
      return 10;
  }
}

const DEFAULT_PROGRESS: QuestProgressData = {
  lastDailyReset: '',
  activeSlots: {},

  rankedPvpWins: 0,
  rankedPvpParries: 0,
  rankedPvpHeavies: 0,
  rankedPvpStreak: 0,
  rankedPvpDominanceWins: 0,
  rankedPvpHeavyFinishers: 0,
  rankedPvpS4Combos: 0,
  rankedPvpBlockedDamage: 0,
  rankedPvpClutchWins: 0,
  rankedPvpMatchesCompleted: 0,

  unrankedPvpWins: 0,
  unrankedPvpLightDamage: 0,
  unrankedPvpHeavies: 0,
  unrankedPvpDodges: 0,
  unrankedPvpMatchesCompleted: 0,
  unrankedPvpParries: 0,
  unrankedPvpDebuffs: 0,
  unrankedPvpFirstHits: 0,
  unrankedPvpCleanRounds: 0,
  unrankedPvpStylesUsed: [],

  rankedAiWins: 0,
  rankedAiMatchesCompleted: 0,
  rankedAiParries: 0,
  rankedAiHeavies: 0,
  rankedAiFlawlessRounds: 0,
  rankedAiS4Combos: 0,
  rankedAiDebuffs: 0,
  rankedAiSpeedruns: 0,
  rankedAiBlockedDamage: 0,
  rankedAiStreak: 0,
  rankedAiLightOnlyWins: 0,
  rankedAiClutchWins: 0,
  rankedAiHeavyFinishers: 0,
  rankedAiFirstHits: 0,
  rankedAiLegendaryWins: 0,
  rankedAiLightsLanded: 0,
  rankedAiGuardBreaks: 0,
  rankedAiBlitzWins: 0,

  unrankedAiWins: 0,
  unrankedAiDamageDealt: 0,
  unrankedAiHeavies: 0,
  unrankedAiParries: 0,
  unrankedAiDodges: 0,
  unrankedAiS4Combos: 0,
  unrankedAiMatchesCompleted: 0,
  unrankedAiGuardBreaks: 0,
  unrankedAiFirstHits: 0,
  unrankedAiQuickFinishes: 0,
  unrankedAiDominanceWins: 0,
  unrankedAiBlockedDamage: 0,

  lifetimeWins: 0,
  lifetimeDamageDealt: 0,
  lifetimeHeavies: 0,
  lifetimeRollsCount: 0,
  lifetimeParries: 0,
  lifetimeRankedMatches: 0,

  claimed: [],

  // Infinite Levels and Progress
  inf_match_veteran_level: 0,
  inf_match_veteran_progress: 0,
  inf_damage_dealer_level: 0,
  inf_damage_dealer_progress: 0,
  inf_light_striker_level: 0,
  inf_light_striker_progress: 0,
  inf_heavy_striker_level: 0,
  inf_heavy_striker_progress: 0,
  inf_style_learner_level: 0,
  inf_style_learner_progress: 0,
  inf_grower_level: 0,
  inf_grower_progress: 0,
  inf_ranked_online_level: 0,
  inf_ranked_online_progress: 0,
  inf_ranked_ai_level: 0,
  inf_ranked_ai_progress: 0,
  inf_match_dominator_level: 0,
  inf_match_dominator_progress: 0,

  baselines: {},

  firstMatchDone: false,
};

export class QuestTracker {
  static getProgress(email: string): QuestProgressData {
    const key = `cagebrawl_quests_${email || 'anon'}`;
    const saved = localStorage.getItem(key);
    let data: QuestProgressData = { ...DEFAULT_PROGRESS };

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        data = { ...DEFAULT_PROGRESS, ...parsed };
      } catch (e) {
        console.error('Failed to parse quest progress', e);
      }
    }

    // Migration of legacy infinite quest claim counters to the new level system
    let migrated = false;
    if (data.infiniteWinsClaimed !== undefined && data.inf_match_veteran_level === 0) {
      data.inf_match_veteran_level = data.infiniteWinsClaimed;
      migrated = true;
    }
    if (data.infiniteDamageClaimed !== undefined && data.inf_damage_dealer_level === 0) {
      data.inf_damage_dealer_level = data.infiniteDamageClaimed;
      migrated = true;
    }
    if (data.infiniteHeaviesClaimed !== undefined && data.inf_heavy_striker_level === 0) {
      data.inf_heavy_striker_level = data.infiniteHeaviesClaimed;
      migrated = true;
    }
    if (data.infiniteRollsClaimed !== undefined && data.inf_style_learner_level === 0) {
      data.inf_style_learner_level = data.infiniteRollsClaimed;
      migrated = true;
    }
    if (data.infiniteRankedClaimed !== undefined && data.inf_ranked_online_level === 0) {
      data.inf_ranked_online_level = data.infiniteRankedClaimed;
      migrated = true;
    }

    if (migrated) {
      this.saveProgress(email, data);
    }

    // Daily Reset logic for mode pools
    const todayStr = new Date().toISOString().split('T')[0];
    if (data.lastDailyReset !== todayStr) {
      data.lastDailyReset = todayStr;
      // Filter out non-milestone claims from claimed list so pool quests can refresh daily
      data.claimed = data.claimed.filter(id => {
        const q = QUESTS.find(quest => quest.id === id);
        return q ? q.pool === 'milestone' : true;
      });
      data.baselines = {}; // Clear old baselines on daily reset
      this.ensureActiveSlots(data, true);
      this.saveProgress(email, data);
    } else {
      this.ensureActiveSlots(data, false);
    }

    return data;
  }

  static ensureActiveSlots(data: QuestProgressData, forceRefresh: boolean = false) {
    const pools: Array<'ranked_pvp' | 'unranked_pvp' | 'ranked_ai' | 'unranked_ai'> = [
      'ranked_pvp', 'unranked_pvp', 'ranked_ai', 'unranked_ai'
    ];

    if (!data.activeSlots) {
      data.activeSlots = {};
    }

    for (const p of pools) {
      const poolQuests = QUESTS.filter(q => q.pool === p);
      let active = data.activeSlots[p] || [];

      if (forceRefresh) {
        active = [];
      } else {
        active = active.filter(id => poolQuests.some(q => q.id === id));
      }

      if (active.length < 3) {
        // Find remaining unclaimed/unselected quests in this pool
        const candidates = poolQuests.filter(q => !active.includes(q.id));
        const slotTypes: (1 | 2 | 3)[] = [1, 2, 3];

        for (const st of slotTypes) {
          if (active.length >= 3) break;
          const hasType = active.some(id => poolQuests.find(q => q.id === id)?.slotType === st);
          if (!hasType) {
            const match = candidates.find(q => q.slotType === st && !data.claimed.includes(q.id))
              || candidates.find(q => q.slotType === st)
              || candidates.find(q => !data.claimed.includes(q.id))
              || candidates[0];

            if (match && !active.includes(match.id)) {
              active.push(match.id);
              const idx = candidates.findIndex(c => c.id === match.id);
              if (idx !== -1) candidates.splice(idx, 1);
            }
          }
        }

        while (active.length < 3 && candidates.length > 0) {
          const nextQ = candidates.shift();
          if (nextQ && !active.includes(nextQ.id)) {
            active.push(nextQ.id);
          }
        }
      }

      data.activeSlots[p] = active.slice(0, 3);
    }

    // Initialize baselines for any active quests that do not have one
    if (!data.baselines) {
      data.baselines = {};
    }
    for (const p of pools) {
      const active = data.activeSlots[p] || [];
      for (const questId of active) {
        if (data.baselines[questId] === undefined) {
          data.baselines[questId] = this.getAbsoluteStatValue(data, questId);
        }
      }
    }
  }

  static replaceClaimedSlot(email: string, pool: 'ranked_pvp' | 'unranked_pvp' | 'ranked_ai' | 'unranked_ai', claimedQuestId: string) {
    const data = this.getProgress(email);
    const poolQuests = QUESTS.filter(q => q.pool === pool);
    let active = data.activeSlots[pool] || [];

    const slotIdx = active.indexOf(claimedQuestId);
    if (slotIdx !== -1) {
      const claimedQ = poolQuests.find(q => q.id === claimedQuestId);
      const candidates = poolQuests.filter(q => !active.includes(q.id) && !data.claimed.includes(q.id));
      
      const replacement = candidates.find(q => q.slotType === claimedQ?.slotType) || candidates[0];
      if (replacement) {
        active[slotIdx] = replacement.id;
        // Set baseline for replacement quest
        if (!data.baselines) data.baselines = {};
        data.baselines[replacement.id] = this.getAbsoluteStatValue(data, replacement.id);
      }
    }

    data.activeSlots[pool] = active;
    this.saveProgress(email, data);
  }

  static saveProgress(email: string, data: QuestProgressData) {
    const key = `cagebrawl_quests_${email || 'anon'}`;
    localStorage.setItem(key, JSON.stringify(data));
  }

  static trackEvent(email: string, event: {
    type: 'win' | 'loss' | 'match_complete' | 'parry' | 'heavy_hit' | 's4_combo' | 'debuff_applied' | 'dodge' | 'damage_blocked' | 'damage_dealt' | 'first_hit' | 'clean_round' | 'guard_break' | 'roll' | 'style_used' | 'height_roll';
    mode?: 'ranked_pvp' | 'unranked_pvp' | 'ranked_ai' | 'unranked_ai';
    amount?: number;
    hpRemainingRatio?: number;
    finalHitWasM2?: boolean;
    matchDurationSec?: number;
    lightOnly?: boolean;
    styleId?: string;
    parriesLanded?: number;
    heaviesLanded?: number;
    lightsLanded?: number;
    damageDealtVal?: number;
  }) {
    const data = this.getProgress(email);
    const amt = event.amount ?? 1;
    const mode = event.mode || 'unranked_pvp';

    const isValidMatchMode = mode === 'ranked_pvp' || mode === 'unranked_pvp' || mode === 'ranked_ai' || mode === 'unranked_ai';

    switch (event.type) {
      case 'win':
        if (isValidMatchMode) {
          data.lifetimeWins += 1;
          data.firstMatchDone = true;

          if (mode === 'ranked_pvp') {
            data.rankedPvpWins += 1;
            data.rankedPvpStreak += 1;
            data.rankedPvpMatchesCompleted += 1;
            data.lifetimeRankedMatches += 1;
            if ((event.hpRemainingRatio ?? 1) >= 0.60) data.rankedPvpDominanceWins += 1;
            if ((event.hpRemainingRatio ?? 1) <= 0.20) data.rankedPvpClutchWins += 1;
            if (event.finalHitWasM2) data.rankedPvpHeavyFinishers += 1;
          } else if (mode === 'unranked_pvp') {
            data.unrankedPvpWins += 1;
            data.unrankedPvpMatchesCompleted += 1;
          } else if (mode === 'ranked_ai') {
            data.rankedAiWins += 1;
            data.rankedAiStreak += 1;
            data.rankedAiMatchesCompleted = (data.rankedAiMatchesCompleted || 0) + 1;
            if ((event.matchDurationSec || 999) < 30) data.rankedAiSpeedruns += 1;
            if ((event.matchDurationSec || 999) < 20) data.rankedAiBlitzWins = (data.rankedAiBlitzWins || 0) + 1;
            if (event.lightOnly) data.rankedAiLightOnlyWins += 1;
            if ((event.hpRemainingRatio ?? 1) <= 0.20) data.rankedAiClutchWins = (data.rankedAiClutchWins || 0) + 1;
            if (event.finalHitWasM2) data.rankedAiHeavyFinishers = (data.rankedAiHeavyFinishers || 0) + 1;
            if (event.styleId === 'capoeira' || event.styleId === 'boxing_champion' || event.styleId === 'bjj') {
              data.rankedAiLegendaryWins = (data.rankedAiLegendaryWins || 0) + 1;
            }
          } else if (mode === 'unranked_ai') {
            data.unrankedAiWins += 1;
            data.unrankedAiMatchesCompleted += 1;
            if ((event.matchDurationSec || 999) < 45) data.unrankedAiQuickFinishes += 1;
            if ((event.hpRemainingRatio ?? 1) >= 0.85) data.unrankedAiDominanceWins = (data.unrankedAiDominanceWins || 0) + 1;
          }
        }
        break;

      case 'loss':
        if (isValidMatchMode) {
          data.firstMatchDone = true;
          if (mode === 'ranked_pvp') {
            data.rankedPvpStreak = 0;
            data.rankedPvpMatchesCompleted += 1;
            data.lifetimeRankedMatches += 1;
          } else if (mode === 'unranked_pvp') {
            data.unrankedPvpMatchesCompleted += 1;
          } else if (mode === 'ranked_ai') {
            data.rankedAiStreak = 0;
            data.rankedAiMatchesCompleted = (data.rankedAiMatchesCompleted || 0) + 1;
          } else if (mode === 'unranked_ai') {
            data.unrankedAiMatchesCompleted += 1;
          }
        }
        break;

      case 'match_complete':
        if (isValidMatchMode) {
          data.firstMatchDone = true;
          if (mode === 'ranked_pvp') {
            data.rankedPvpMatchesCompleted += 1;
            data.lifetimeRankedMatches += 1;
          } else if (mode === 'unranked_pvp') {
            data.unrankedPvpMatchesCompleted += 1;
          } else if (mode === 'ranked_ai') {
            data.rankedAiMatchesCompleted = (data.rankedAiMatchesCompleted || 0) + 1;
          } else if (mode === 'unranked_ai') {
            data.unrankedAiMatchesCompleted += 1;
          }
        }
        break;

      case 'parry':
        if (isValidMatchMode) {
          data.lifetimeParries += amt;
          if (mode === 'ranked_pvp') data.rankedPvpParries += amt;
          else if (mode === 'unranked_pvp') data.unrankedPvpParries += amt;
          else if (mode === 'ranked_ai') data.rankedAiParries += amt;
          else if (mode === 'unranked_ai') data.unrankedAiParries += amt;
        }
        break;

      case 'heavy_hit':
        if (isValidMatchMode) {
          data.lifetimeHeavies += amt;
          if (mode === 'ranked_pvp') data.rankedPvpHeavies += amt;
          else if (mode === 'unranked_pvp') data.unrankedPvpHeavies += amt;
          else if (mode === 'ranked_ai') data.rankedAiHeavies += amt;
          else if (mode === 'unranked_ai') data.unrankedAiHeavies += amt;
        }
        break;

      case 's4_combo':
        if (isValidMatchMode) {
          if (mode === 'ranked_pvp') data.rankedPvpS4Combos += amt;
          else if (mode === 'ranked_ai') data.rankedAiS4Combos += amt;
          else if (mode === 'unranked_ai') data.unrankedAiS4Combos += amt;
        }
        break;

      case 'debuff_applied':
        if (isValidMatchMode) {
          if (mode === 'unranked_pvp') data.unrankedPvpDebuffs += amt;
          else if (mode === 'ranked_ai') data.rankedAiDebuffs += amt;
        }
        break;

      case 'dodge':
        if (isValidMatchMode) {
          if (mode === 'unranked_pvp') data.unrankedPvpDodges += amt;
          else if (mode === 'unranked_ai') data.unrankedAiDodges += amt;
        }
        break;

      case 'damage_blocked':
        if (isValidMatchMode) {
          if (mode === 'ranked_pvp') data.rankedPvpBlockedDamage += amt;
          else if (mode === 'ranked_ai') data.rankedAiBlockedDamage += amt;
          else if (mode === 'unranked_ai') data.unrankedAiBlockedDamage = (data.unrankedAiBlockedDamage || 0) + amt;
        }
        break;

      case 'damage_dealt':
        if (isValidMatchMode) {
          data.lifetimeDamageDealt += amt;
          if (mode === 'unranked_pvp' && event.lightOnly) data.unrankedPvpLightDamage += amt;
          if (mode === 'unranked_ai') data.unrankedAiDamageDealt += amt;
        }
        break;

      case 'first_hit':
        if (isValidMatchMode) {
          if (mode === 'ranked_pvp') data.rankedPvpFirstHits = (data.rankedPvpFirstHits || 0) + amt;
          else if (mode === 'unranked_pvp') data.unrankedPvpFirstHits += amt;
          else if (mode === 'unranked_ai') data.unrankedAiFirstHits += amt;
          else if (mode === 'ranked_ai') data.rankedAiFirstHits = (data.rankedAiFirstHits || 0) + amt;
        }
        break;

      case 'clean_round':
        if (isValidMatchMode) {
          if (mode === 'unranked_pvp') data.unrankedPvpCleanRounds += amt;
          else if (mode === 'ranked_ai') data.rankedAiFlawlessRounds += amt;
        }
        break;

      case 'guard_break':
        if (isValidMatchMode) {
          if (mode === 'unranked_ai') data.unrankedAiGuardBreaks += amt;
          else if (mode === 'ranked_ai') data.rankedAiGuardBreaks = (data.rankedAiGuardBreaks || 0) + amt;
        }
        break;

      case 'roll':
        data.lifetimeRollsCount += amt;
        data.inf_style_learner_progress += amt;
        break;

      case 'height_roll':
        data.inf_grower_progress += 1;
        break;

      case 'style_used':
        if (event.styleId && mode === 'unranked_pvp') {
          if (!data.unrankedPvpStylesUsed.includes(event.styleId)) {
            data.unrankedPvpStylesUsed.push(event.styleId);
          }
        }
        break;
    }

    // 2. Update NEW infinite quest progress fields based on results of the match or direct events
    if (isValidMatchMode) {
      if (event.type === 'win') {
        data.inf_match_veteran_progress += 1;
        data.inf_match_dominator_progress += 1;

        if (mode === 'ranked_pvp') {
          data.inf_ranked_online_progress += 1;
        } else if (mode === 'ranked_ai') {
          data.inf_ranked_ai_progress += 1;
        }
      } else if (event.type === 'loss') {
        if (mode === 'ranked_pvp') {
          data.inf_ranked_online_progress += 1;
        } else if (mode === 'ranked_ai') {
          data.inf_ranked_ai_progress += 1;
        }
      }

      // Add match stats if passed from the end of the match
      if (event.parriesLanded) {
        data.lifetimeParries += event.parriesLanded;
      }
      if (event.heaviesLanded) {
        data.lifetimeHeavies += event.heaviesLanded;
        data.inf_heavy_striker_progress += event.heaviesLanded;
      }
      if (event.lightsLanded) {
        data.inf_light_striker_progress += event.lightsLanded;
        if (mode === 'ranked_ai') {
          data.rankedAiLightsLanded = (data.rankedAiLightsLanded || 0) + event.lightsLanded;
        }
      }
      if (event.damageDealtVal) {
        data.lifetimeDamageDealt += event.damageDealtVal;
        data.inf_damage_dealer_progress += Math.round(event.damageDealtVal);
      }
    }

    this.saveProgress(email, data);
  }

  static getAbsoluteStatValue(data: QuestProgressData, questId: string, currentElo: number = 1000): number {
    switch (questId) {
      // 1. RANKED PVP
      case 'ranked_elo_contender': return data.rankedPvpWins;
      case 'ranked_parry_precision': return data.rankedPvpParries;
      case 'ranked_executioner': return data.rankedPvpHeavies;
      case 'ranked_streak': return data.rankedPvpStreak;
      case 'ranked_dominance': return data.rankedPvpDominanceWins;
      case 'ranked_heavy_finisher': return data.rankedPvpHeavyFinishers;
      case 'ranked_combo_specialist': return data.rankedPvpS4Combos;
      case 'ranked_iron_defense': return data.rankedPvpBlockedDamage;
      case 'ranked_clutch_victory': return data.rankedPvpClutchWins;
      case 'ranked_veteran': return data.rankedPvpMatchesCompleted;

      // 2. UNRANKED PVP
      case 'casual_victor': return data.unrankedPvpWins;
      case 'casual_style_brawler': return data.unrankedPvpLightDamage;
      case 'casual_heavy_pressure': return data.unrankedPvpHeavies;
      case 'casual_evasion_artist': return data.unrankedPvpDodges;
      case 'casual_unranked_warmup': return data.unrankedPvpMatchesCompleted;
      case 'casual_parry_practice': return data.unrankedPvpParries;
      case 'casual_debuff_master': return data.unrankedPvpDebuffs;
      case 'casual_first_strike': return data.unrankedPvpFirstHits;
      case 'casual_clean_round': return data.unrankedPvpCleanRounds;
      case 'casual_multi_style': return data.unrankedPvpStylesUsed?.length || 0;

      // 3. RANKED AI
      case 'ai_ranked_bot_destroyer': return data.rankedAiWins;
      case 'ai_ranked_parry_timing': return data.rankedAiParries;
      case 'ai_ranked_heavy_punish': return data.rankedAiHeavies;
      case 'ai_ranked_flawless_round': return data.rankedAiFlawlessRounds;
      case 'ai_ranked_combo_chain': return data.rankedAiS4Combos;
      case 'ai_ranked_speed_control': return data.rankedAiDebuffs;
      case 'ai_ranked_speedrun': return data.rankedAiSpeedruns;
      case 'ai_ranked_defensive_drill': return data.rankedAiBlockedDamage;
      case 'ai_ranked_endurance': return data.rankedAiStreak;
      case 'ai_ranked_calculated_offense': return data.rankedAiLightOnlyWins;
      case 'ai_ranked_clutch': return data.rankedAiClutchWins;
      case 'ai_ranked_heavy_finisher': return data.rankedAiHeavyFinishers;
      case 'ai_ranked_opening_strike': return data.rankedAiFirstHits;
      case 'ai_ranked_iron_shield': return data.rankedAiBlockedDamage;
      case 'ai_ranked_apex_predator': return data.rankedAiStreak;
      case 'ai_ranked_legendary_elite': return data.rankedAiLegendaryWins;
      case 'ai_ranked_lights_accumulator': return data.rankedAiLightsLanded;
      case 'ai_ranked_guard_breaker': return data.rankedAiGuardBreaks;
      case 'ai_ranked_counter_god': return data.rankedAiParries;
      case 'ai_ranked_blitz': return data.rankedAiBlitzWins;

      // 4. UNRANKED AI
      case 'ai_casual_win': return data.unrankedAiWins;
      case 'ai_casual_target_practice': return data.unrankedAiDamageDealt;
      case 'ai_casual_m2_warmup': return data.unrankedAiHeavies;
      case 'ai_casual_basic_parry': return data.unrankedAiParries;
      case 'ai_casual_evasion_drill': return data.unrankedAiDodges;
      case 'ai_casual_s4_mastery': return data.unrankedAiS4Combos;
      case 'ai_casual_warmup': return data.unrankedAiMatchesCompleted;
      case 'ai_casual_guard_control': return data.unrankedAiGuardBreaks;
      case 'ai_casual_first_hit': return data.unrankedAiFirstHits;
      case 'ai_casual_quick_finish': return data.unrankedAiQuickFinishes;
      case 'ai_casual_dominance': return data.unrankedAiDominanceWins;
      case 'ai_casual_heavy_battery': return data.unrankedAiHeavies;
      case 'ai_casual_master_counter': return data.unrankedAiParries;
      case 'ai_casual_total_destruction': return data.unrankedAiDamageDealt;
      case 'ai_casual_iron_block': return data.unrankedAiBlockedDamage;

      // 5. ACCOUNT MILESTONES & CHALLENGES
      // Easy Challenges
      case 'ai_easy_sparring': return (data.rankedAiWins + data.unrankedAiWins);
      case 'ai_easy_parry': return (data.rankedAiParries + data.unrankedAiParries);
      case 'online_easy_first_bout': return (data.rankedPvpMatchesCompleted + data.unrankedPvpMatchesCompleted);
      case 'online_easy_first_blood': return (data.unrankedPvpFirstHits + (data.rankedPvpFirstHits || 0));

      // Medium Challenges
      case 'ai_med_heavy_punisher': return (data.rankedAiHeavies + data.unrankedAiHeavies);
      case 'ai_med_flawless_spar': return (data.rankedAiFlawlessRounds + data.unrankedAiDominanceWins);
      case 'online_med_ranked_climb': return data.rankedPvpWins;
      case 'online_med_clutch_gladiator': return data.rankedPvpClutchWins;

      // Hard Challenges
      case 'ai_hard_extinction': return data.rankedAiWins;
      case 'ai_hard_blitz_master': return data.rankedAiBlitzWins;
      case 'ai_hard_untouchable_god': return data.rankedAiFlawlessRounds;
      case 'online_hard_pvp_supremacy': return (data.rankedPvpWins + data.unrankedPvpWins);
      case 'online_hard_win_streak': return data.rankedPvpStreak;
      case 'online_hard_parry_virtuoso': return data.rankedPvpParries;

      // Career & Ranks
      case 'welcome_octagon': return data.lifetimeWins;
      case 'style_collector': return data.lifetimeRollsCount;
      case 'legendary_practitioner': return 0; // handled in UI panel
      case 'genetic_anomaly': return 0; // handled in UI panel
      case 'rookie_climb': return currentElo;
      case 'copper_ascent': return currentElo;
      case 'silver_ascent': return currentElo;
      case 'golden_elite': return currentElo;
      case 'diamond_brawler': return currentElo;
      case 'amethyst_master': return currentElo;
      case 'obsidian_god': return currentElo;

      default: return 0;
    }
  }

  static getQuestStatus(email: string, quest: Quest, currentElo: number = 1000): {
    current: number;
    completed: boolean;
    claimed: boolean;
  } {
    const data = this.getProgress(email);
    const claimed = data.claimed.includes(quest.id);
    const absolute = this.getAbsoluteStatValue(data, quest.id, currentElo);
    let current = absolute;

    // Subtract baseline only for repeatable pool quests (not milestones or infinite)
    if (quest.pool !== 'milestone' && quest.pool !== 'infinite') {
      current = Math.max(0, absolute - (data.baselines?.[quest.id] ?? 0));
    }

    const completed = current >= quest.target;
    return { current, completed, claimed };
  }

  static rerollSingleQuest(
    email: string, 
    questIdToReplace: string, 
    pool: 'ranked_pvp' | 'unranked_pvp' | 'ranked_ai' | 'unranked_ai'
  ): boolean {
    const data = this.getProgress(email);
    const poolQuests = QUESTS.filter(q => q.pool === pool);
    const currentActive = data.activeSlots?.[pool] || [];

    // Find candidate quests in this pool that are NOT currently active in slots
    const candidates = poolQuests.filter(q => !currentActive.includes(q.id));
    if (candidates.length === 0) return false;

    // Pick a random candidate
    const newQuest = candidates[Math.floor(Math.random() * candidates.length)];

    // Replace questIdToReplace with newQuest.id
    const newActiveSlots = currentActive.map(id => id === questIdToReplace ? newQuest.id : id);
    if (!data.activeSlots) data.activeSlots = {};
    data.activeSlots[pool] = newActiveSlots;

    // Set baseline for the new quest
    if (!data.baselines) data.baselines = {};
    data.baselines[newQuest.id] = this.getAbsoluteStatValue(data, newQuest.id);

    this.saveProgress(email, data);
    return true;
  }

  static rerollPool(email: string, pool: 'ranked_pvp' | 'unranked_pvp' | 'ranked_ai' | 'unranked_ai'): boolean {
    const data = this.getProgress(email);
    const poolQuests = QUESTS.filter(q => q.pool === pool);
    const shuffled = [...poolQuests].sort(() => Math.random() - 0.5);
    data.activeSlots[pool] = shuffled.slice(0, 3).map(q => q.id);
    if (!data.baselines) data.baselines = {};
    for (const qId of data.activeSlots[pool]) {
      data.baselines[qId] = this.getAbsoluteStatValue(data, qId);
    }
    this.saveProgress(email, data);
    return true;
  }
}
