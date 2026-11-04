export interface UpdateLogEntry {
  id: string;
  type: 'new' | 'balancing' | 'bugfix' | 'ui_ux' | 'historical';
  title: string;
  targetName?: string;
  summary: string;
  details?: string[];
}

export interface UpdateRelease {
  version: string;
  date: string;
  title: string;
  subtitle: string;
  entries: UpdateLogEntry[];
}

export const UPDATE_LOGS_DATA: UpdateRelease[] = [
  {
    version: 'v1.7.6 Finale',
    date: 'November 4, 2026',
    title: 'THE FINALE HAS ARRIVED',
    subtitle: 'Universal Pacing, Kickboxing Rework & System Optimization',
    entries: [
      {
        id: 'finale_arrival',
        type: 'new',
        title: '[+] The Finale Has Arrived',
        summary: 'v1.7.6 officially concludes with the release of the Finale! This update brings a massive overhaul to universal combat pacing, refined defensive timings, new combat arts, and an overhaul of our single-player progression systems.',
        details: [
          'Introduced dedicated In-Game Update Logs system accessible prior to the Main Menu.',
          'Synchronized responsive layout scaling across all devices in both portrait and landscape orientations.'
        ]
      },
      {
        id: 'legacy_archive',
        type: 'historical',
        title: '[*] Legacy Version Archive',
        summary: 'Due to rapid foundational shifts during development, detailed logs for previous versions could not be retrieved. Moving forward from the Finale, all updates will be tracked cleanly and permanently right here!',
      },
      {
        id: 'kickboxing_rework',
        type: 'balancing',
        title: '[Kickboxing]',
        targetName: 'Kickboxing Discipline',
        summary: 'Complete mechanical tune-up to elevate rhythmic pressure, combo rhythm, and heavy strike tactical windows.',
        details: [
          'Stat / Timing: M2 Cooldown -> Tier 1 (4.5s), Tier 2 (3.5s), Tier 3 (2.2s), Tier 4 (1.5s). Adjusted heavy strike recovery to reward clean spacing.',
          'New Passive: "Cadence Opening" — Landing unblocked M1 strikes grants a rhythmic tempo bonus to subsequent combo follow-ups.',
          'Reworked Passive: "Chain Reaction" — Completing full combo strings refunds stamina and reduces active skill cooldowns.',
          'AI Behavior: Kickboxing bots now utilize rhythm spacing, baiting guard drops before initiating heavy M2 strikes.'
        ]
      },
      {
        id: 'ui_passport',
        type: 'ui_ux',
        title: '[Combatant Passport]',
        targetName: 'Passport Navigation',
        summary: 'Streamlined the Passport card by removing obsolete Enter Arena & Roll shortcuts.',
        details: [
          'The bottom LAUNCH button is now fully interactive and launches whichever navigation tab is currently selected.',
          'Eliminated redundant modal wrappers and consolidated menu view controllers for instant responsiveness.'
        ]
      },
      {
        id: 'ui_loading',
        type: 'ui_ux',
        title: '[Loading Sequence & Landing View]',
        targetName: 'Intro Sequence',
        summary: 'Restored the 0% to 100% initial progress loading bar followed by a sleek black flash transition.',
        details: [
          'Added direct access to the LOGS viewer right from the pre-main menu landing screen.',
          'Zero-scroll discipline enforced across portrait and landscape screens.'
        ]
      },
      {
        id: 'bugfixes_v176',
        type: 'bugfix',
        title: '[System & Combat Fixes]',
        targetName: 'Stability',
        summary: 'Fixed touch input delays, UI overlay layering, and spectator camera focus issues.',
        details: [
          'Bug Fixed: Resolved touch control button sticky state during rapid mobile tapping.',
          'Bug Fixed: Fixed ELO calculation edge cases in singleplayer AI match reports.'
        ]
      }
    ]
  }
];
