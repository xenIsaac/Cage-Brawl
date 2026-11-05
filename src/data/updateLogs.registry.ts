export interface UpdateLogItem {
  id: string;
  type: 'new' | 'balancing' | 'bugfix' | 'ui_ux';
  title: string;
  targetName?: string;
  summary: string;
  details?: string[];
}

export interface VersionArchiveEntry {
  version: string;
  date: string;
  title: string;
  summary: string;
  isCurrent?: boolean;
  entries: UpdateLogItem[];
}

export const UPDATE_LOGS_REGISTRY: VersionArchiveEntry[] = [
  {
    version: 'v1.7.6 Finale',
    date: 'November 4, 2026',
    title: 'The Finale Has Arrived',
    isCurrent: true,
    summary: 'v1.7.6 officially concludes with the release of the Finale! This update brings a massive overhaul to universal combat pacing, refined defensive timings, new combat arts, and an overhaul of our single-player progression systems.',
    entries: [
      {
        id: 'finale_arrival',
        type: 'new',
        title: '[+] The Finale Has Arrived',
        summary: 'The complete v1.7.6 cycle is now finalized, laying the groundwork for future competitive seasons.',
        details: [
          'Introduced In-Game Update Logs & Two-Tier Version Archive Engine.',
          'Unified combat engine state management across all singleplayer and multiplayer modes.'
        ]
      },
      {
        id: 'combat_pacing',
        type: 'balancing',
        title: '[Combat Pacing]',
        targetName: 'Universal Pacing Overhaul',
        summary: 'Standardized hit recovery and defensive timings to make neutral exchanges more deliberate and tactical.',
        details: [
          '[Kickboxing] Stat / Timing: M2 Cooldown -> Tier 1 (4.5s), Tier 2 (3.5s), Tier 3 (2.2s), Tier 4 (1.5s). Adjusted heavy strike recovery to reward clean spacing.',
          '[Kickboxing] New Passive: "Cadence Opening" — Landing unblocked M1 strikes grants a rhythmic tempo bonus to subsequent combo follow-ups.',
          '[Kickboxing] Reworked Passive: "Chain Reaction" — Completing full combo strings refunds stamina and reduces active skill cooldowns.'
        ]
      },
      {
        id: 'system_stability_fix',
        type: 'bugfix',
        title: 'Bug Fixed: "System Stability"',
        summary: 'Resolved state desyncs across menu transitions and practice modes.',
        details: [
          'Direct state cleanup when closing modal overlays to prevent stuck UI pointer traps.',
          'Resolved touch input response edge cases during multi-tap sequences on mobile devices.'
        ]
      },
      {
        id: 'persona_ui_evolution',
        type: 'ui_ux',
        title: '[+] Persona Online Arena',
        summary: 'Overhauled the multiplayer Octagon and matchmaking lobby into our high-contrast Persona collage aesthetic, featuring improved cage lighting and bold angular HUD elements.',
        details: [
          'Updated Combatant Passport: Made bottom LAUNCH button directly execute the active tab action.',
          'Redesigned player identification plates and latency indicators with sharp offset diagonal cuts and vibrant accent panels.'
        ]
      },
      {
        id: 'separated_progression_verification',
        type: 'new',
        title: '[+] Separated Progression Verification',
        summary: 'Ensured Online Quests, Career Milestones, and Account Achievements operate on fully independent, cleanly organized tracking paths.',
        details: [
          'Verified zero duplication across real-time PvP quests, cumulative career milestones, and one-time account achievements.'
        ]
      },
      {
        id: 'countdown_fps_stutter_fix',
        type: 'bugfix',
        title: 'Bug Fixed: "Countdown Stutter & FPS Drops"',
        summary: 'Pre-cached all round countdown graphics and optimized particle rendering, eliminating framerate dips and ensuring an unbroken, locked 60 FPS when the bell rings.',
        details: [
          'Pre-rasterized countdown numeric assets ("3", "2", "1", "FIGHT!") in off-screen memory buffers during scene loading.',
          'Eliminated dynamic DOM node instantiation during combat start ticks.'
        ]
      },
      {
        id: 'cinematic_persona_countdown',
        type: 'ui_ux',
        title: '[+] Cinematic Persona Countdown',
        summary: 'Reworked the round intro sequence with heavy Persona-styled numbers, a dynamic camera pan showcasing both fighters before the bell, and an angular sliding FIGHT banner.',
        details: [
          '4.5s Camera Pipeline: 1.6x zoom on Player 1 ("3"), smooth pan to Opponent ("2"), and pull-back to neutral combat perspective ("1").',
          'Violent slide-in Persona FIGHT banner with sharp diagonal cut at combat unlock.'
        ]
      },
      {
        id: 'tiered_graphics_presets',
        type: 'ui_ux',
        title: '[+] Tiered Graphics Quality Settings',
        summary: 'Added three graphics fidelity options in Settings: Barebones (pure black mat with minimal grid lines for maximum FPS), Medium (streamlined visuals with reduced particle overhead), and Normal (full visual fidelity and lighting suite).',
        details: [
          'Barebones Tier: Pure black octagon mat with minimal grid lines, unlit solid borders, suppressed non-essential particles, and zero fighter shadows.',
          'Medium Tier: Streamlined arena mat visuals with 60% particle reduction and static contact shadows.',
          'Normal Tier: Maximum visual fidelity with multi-layered cage wire fencing, theatrical spotlighting, full particle bursts, and high-precision drop shadows.'
        ]
      },
      {
        id: 'persona_progression_hub',
        type: 'ui_ux',
        title: '[+] Persona Progression Hub',
        summary: 'Completely overhauled the Quests, Milestones, and Achievements screen into a full-width Persona collage layout with three dedicated category tabs: Singleplayer Quests, Multiplayer Quests, and Achievements & Milestones.',
        details: [
          'Full-Width Stage: Purged all legacy left rail margins and cramped side padding for edge-to-edge angular Persona panels.',
          'Three Left Anchor Tabs: Angled category buttons for [ SINGLEPLAYER QUESTS ], [ MULTIPLAYER QUESTS ], and [ ACHIEVEMENTS & MILESTONES ].',
          'Dynamic Right Stage: Smooth sliding drawer stage with sharp diagonal cuts, bold border strokes, progress meters, and reward claim blocks.'
        ]
      },
      {
        id: 'countdown_camera_smoothing',
        type: 'ui_ux',
        title: 'Bug Fixed: "Countdown Camera Smoothing"',
        summary: 'Smoothed out the camera transition on Count 1, eliminating abrupt view snapping with a cinematic, gradual pull-back to full arena perspective before the bell rings.',
        details: [
          'Cubic Deceleration: Applied Zoom(t) = 1.0 + 0.6 * (1 - t)^3 formula across the 1.5s Count 1 timeframe.',
          'Viewport Smooth Glide: Interpolates camera position smoothly from Opponent coordinates to neutral arena center.'
        ]
      },
      {
        id: 'swipeable_bounty_carousel',
        type: 'ui_ux',
        title: '[+] Swipeable Bounty Carousel & Clean Quest UI',
        summary: 'Rebuilt Multiplayer Quests into a swipeable 1-square-high carousel deck with tier-based dynamic background colors and deep drop shadows while straightening all inner quest card layouts.',
        details: [
          '1-Square High Carousel Deck: Interactive swipeable card deck with left/right arrows, drag gestures, and deep drop-shadow depth.',
          'Dynamic Tier Background Colors: Background gradients dynamically update based on quest difficulty (Tier 1 Common Steel to Tier 5 Legendary Crimson).',
          'Straight Upright Quest UI: Removed slanted inner card skewing across Singleplayer and Multiplayer quest views for crisp, upright text and telemetry bars.'
        ]
      }
    ]
  },
  {
    version: 'Test(0)',
    date: 'Legacy Baseline',
    title: 'Historical Archive Test',
    isCurrent: false,
    summary: 'Placeholder archive card used to verify the multi-version navigation and scrolling pipeline.',
    entries: [
      {
        id: 'test_feature',
        type: 'new',
        title: '[+] Test Feature',
        summary: 'Mock entry verifying system initialization.',
        details: [
          'Verified card selection and two-tier view state switching.'
        ]
      },
      {
        id: 'test_style',
        type: 'balancing',
        title: '[Test Style]',
        targetName: 'Parameter: Old -> New',
        summary: 'Verification of stat comparison formatting.',
        details: [
          'Test Stat: 1.0s -> 0.8s timing test.'
        ]
      },
      {
        id: 'test_bug',
        type: 'bugfix',
        title: 'Bug Fixed: "Test Bug"',
        summary: 'Mock bug resolution entry.',
        details: [
          'Verified bug resolution badge rendering.'
        ]
      },
      {
        id: 'test_layout',
        type: 'ui_ux',
        title: '[+] Test Layout',
        summary: 'Verification of category container rendering.',
        details: [
          'Verified collapsible accordion panels and high-contrast Persona card borders.'
        ]
      }
    ]
  }
];
