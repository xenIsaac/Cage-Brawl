/**
 * MMA Style Arena Types
 */

export type RarityType = 'standard' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'secret_mythic';

export interface StatModifiers {
  speed: number;      // Speed multiplier
  reach: number;      // Fist reach/attack range multiplier
  power: number;      // Strike damage multiplier
  defense: number;    // Damage absorption (lower is better, e.g., 0.8 means 20% reduction)
  knockback: number;  // Knockback force multiplier
  healthMax: number;  // Bonus max health
}

export interface FightingStyle {
  id: string;
  name: string;
  rarity: RarityType;
  color: string;
  secondaryColor: string;
  description: string;
  passiveName: string;
  passiveDesc: string;
  strikeName: string;
  statModifiers: StatModifiers;
  auraStyle: 'fire' | 'lightning' | 'ring' | 'spiral' | 'shield' | 'none';
  isPlaceholder?: boolean;
  lightAttackEffect?: string;
  heavyAttackEffect?: string;
  dropRate?: number; // Equal drop chance percentage for all styles
  reworkStatus?: 'active' | 'pending_rework' | 'reworked' | 'undergoing_rework' | 'undergoing_development' | 'testing';
  isBlocked?: boolean;
  reworkNotes?: string;
}

export type KeyTier = 'iron' | 'gold' | 'diamond' | 'obsidian';

export interface KeyInventory {
  iron: number;
  gold: number;
  diamond: number;
  obsidian: number;
}

export interface WishlistState {
  styleId: string | null;
  wishlistCooldownUntil: number; // Unix timestamp in ms (5 hours after obtaining target)
}

export interface PlayerStats {
  rolls: number; // Legacy alias for backward compatibility
  keys?: KeyInventory; // Key inventory: iron, gold, diamond, obsidian
  wishlist?: WishlistState; // Targeted style wishlist
  originCrateCooldownUntil?: number; // Unix timestamp in ms (3 minutes cooldown per key on Origin Crate)
  totalCratesOpened?: number; // Total crates unboxed
  cash: number;
  selectedStyleId: string;
  unlockedStyleIds?: string[];
  styleObtainedCounts?: Record<string, number>;
  heightInInches: number; // 1 inch increases visual arena scale by ~1.5%
  highScore: number;
  totalKOs: number;
  totalRollsCount: number;
  xp?: number;
  elo: number;
  lossStreak: number;
  aiElo?: number;
  aiLossStreak?: number;
  aiWins?: number;
  aiWinStreak?: number;
  aiMatchesPlayed?: number;
  timeSpentSeconds?: number;
  totalRollsRolled?: number;
  highestHeightReached?: number;
  totalMatchesPlayed?: number;
  totalWins?: number;
  winStreak?: number;
  unlockedTitles?: string[];
  selectedTitle?: string;
  savedKeybinds?: KeybindSettings;
}

export type RoundGrade = 'S+' | 'S' | 'A+' | 'A' | 'B' | 'C';
export type OverallMatchGrade = 'SSS' | 'SS' | 'S' | 'A' | 'B' | 'C';

export interface RoundReport {
  roundNumber: number;
  winner: 'player' | 'opponent';
  durationSec: number;
  damageDealt: number;
  damageTaken: number;
  parriesLanded: number;
  heaviesLanded: number;
  lightsLanded: number;
  grade: RoundGrade;
  gradeText: string;
  isFlawless: boolean;
  dominancePct?: number;
  aggressionRatio?: number;
  minPlayerHpPct?: number;
  isClutchComeback?: boolean;
  summaryBullets?: string[];
}

export interface TriggeredMilestone {
  id: string;
  codename: string;
  name: string;
  benefit: string;
  rewardType: 'GRADE_BUMP' | 'ELO_PERCENT_BOOST' | 'LOSS_PROTECTION';
  value: number;
}

export interface RankedAiEloBreakdown {
  isWin: boolean;
  baseGain: number;
  yieldPct?: number;
  baseLossPct?: number;
  performanceBonus: number;
  performanceGrade: OverallMatchGrade;
  performanceMultiplier: number;
  dominanceBonus?: number;
  dominanceGrade?: RoundGrade | OverallMatchGrade;
  streakCount: number;
  streakMultiplier: number;
  streakBonus: number;
  tierName: string;
  maxTierCap?: number;
  totalEloChange: number;
  isLossProtected?: boolean;
  lossTier?: 'normal' | 'mitigated' | 'protected' | 'crushed';
  lossMultiplier?: number;
  lossPenaltyDescription?: string;
  roundReports: RoundReport[];
  currentElo: number;
  cleanEraserActive?: boolean;
  erasedRoundNumber?: number | null;
  trajectoryScore?: number;
  totalGradeBumps?: number;
  extraEloYieldPct?: number;
  triggeredMilestones?: TriggeredMilestone[];
}

export type GameScreen = 'MENU' | 'ROLLING' | 'ARENA' | 'MATCHMAKING' | 'AI_MATCH' | 'HUD_TEST_BOX' | 'SINGLEPLAYER_QUESTS';

export interface CompetitiveOpponent {
  id?: string;
  fighterId?: string;
  name: string;
  level?: number;
  heightInInches: number;
  style: FightingStyle;
  elo: number;
  ping: number;
  team?: 'blue' | 'red';
  aiDifficulty?: 'rookie' | 'silver' | 'gold' | 'diamond' | 'amethyst';
}

export interface PartyMember {
  id: string;
  name: string;
  heightInInches: number;
  style: FightingStyle;
  elo: number;
  ping: number;
  isLeader?: boolean;
  isReady?: boolean;
}

export interface PartyData {
  id: string;
  leaderId: string;
  members: PartyMember[];
}

export type WinningConditionType = 'standard' | 'quick_match' | 'competitive' | 'quick_competitive';
export type GamemodeType = 'standard' | 'sustain_attack' | 'hot_potato';

export interface MatchData {
  isCompetitive: boolean;
  isAiMatch?: boolean;
  aiModeType?: 'ranked' | 'casual' | 'tournament' | 'spectator';
  aiDifficulty?: 'rookie' | 'silver' | 'gold' | 'diamond' | 'amethyst';
  tournamentRound?: 'quarter' | 'semi' | 'final';
  tournamentMatchId?: string;
  isAiVsAiSpectator?: boolean;
  spectatorInitialRound?: number;
  spectatorInitialHp1Pct?: number;
  spectatorInitialHp2Pct?: number;
  isSpectator?: boolean;
  bot1StyleId?: string;
  bot1Name?: string;
  bot1Difficulty?: 'rookie' | 'silver' | 'gold' | 'diamond' | 'amethyst';
  bot1HeightInInches?: number;
  bot2StyleId?: string;
  bot2Name?: string;
  bot2Difficulty?: 'rookie' | 'silver' | 'gold' | 'diamond' | 'amethyst';
  bot2HeightInInches?: number;
  spectatorFighter2?: CompetitiveOpponent;
  matchType?: '1v1_ranked' | '1v1_unranked' | '1v1_unranked_endurance' | '1v1_unranked_explosive' | '2v2_unranked';
  is2v2?: boolean;
  mapId: string;
  mapName: string;
  modeId: string;
  modeName: string;
  winningCondition?: WinningConditionType;
  gamemode?: GamemodeType;
  targetScore?: number;
  roundTimeLimit?: number;
  eloModifier?: 'reduced' | 'standard' | 'increased';
  opponent?: CompetitiveOpponent;
  player1?: CompetitiveOpponent;
  player2?: CompetitiveOpponent;
  roomId?: string;
  allies?: CompetitiveOpponent[];
  enemies?: CompetitiveOpponent[];
  allPlayers?: Array<CompetitiveOpponent & { id: string; team: 'blue' | 'red'; isSelf?: boolean }>;
  isRealMatch?: boolean;
  socket?: any;
  matchId?: string | null;
  isPlayer1?: boolean;
  playerIndex?: number;
}

export interface Fist {
  id: number;
  offsetX: number;
  offsetY: number;
  angle: number;
  radius: number;
  isPunching: boolean;
  punchProgress: number; // 0 to 1 back to 0
  punchType: 'left' | 'right';
  isHeavy?: boolean;
  hasHit?: boolean;
  comboStage?: number;
  punchTimeSec?: number;
  isKineticCounter?: boolean;
  trailHistory?: Array<{ hx: number; hy: number; ex: number; ey: number; time: number; progress: number }>;
  blendStartX?: number;
  blendStartY?: number;
  blendTimer?: number;
  currentSpatialX?: number;
  currentSpatialY?: number;
  prevSpatialX?: number;
  prevSpatialY?: number;
  blendVelX?: number; // Incoming kinetic velocity X for Hermite continuous velocity blend
  blendVelY?: number; // Incoming kinetic velocity Y for Hermite continuous velocity blend
  lingerTimer?: number; // Chamber linger frames remaining (Asymmetrical hold: S1-S2: 14f, S3: 16f, S4: 6f)
  isLingerActive?: boolean;
  apexHoldFrames?: number; // 2-frame (~33ms) kinetic impact hold at 100% reach for physical readability // True while holding in follow-through pose prior to smooth decay return
  lastUpdateGameTime?: number; // Prevents multi-read blendTimer depletion within a single frame
}

export interface Fighter {
  id: string;
  name: string;
  isPlayer: boolean;
  isP1?: boolean;
  x: number;
  y: number;
  radius: number;       // Calculated based on level and base height
  baseHeight: number;   // Height in inches
  color: string;
  secondaryColor: string;
  styleId: string;
  prevStyleId?: string;
  lastStyleId?: string;
  styleMorphProgress?: number; // 0 to 1 over 8 frames for smooth stance transitions on style switch
  health: number;
  maxHealth: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  facingAngle: number;
  isDead: boolean;
  disintegrationTimer?: number; // Frames remaining for death disintegration into red, black, and white circle particles
  score: number;
  fists: Fist[];
  strikeCooldown: number;
  lightCooldown: number;
  heavyCooldown: number;
  stunTime: number;      // Non-zero if currently stunned by an attack
  damageFlashTime: number; // For red flashing on hits
  superArmorFlashTime?: number;    // Frames remaining for whole body light blue flash during super armor
  superArmorFlashMaxTime?: number; // Initial duration to scale opacity smoothly to 0
  superArmorPrevActive?: boolean;  // State tracking for super armor activation edge
  auraAngle: number;     // Used to rotate style visual effects
  dashCooldown: number;
  isDashing: boolean;
  dashProgress: number;
  dashAngle?: number;
  dashStartDist?: number;
  keysiCloseDashPrimed?: boolean;
  
  // Stamina Engine & Sprint Striker Buffer
  stamina?: number;             // Baseline 100 Stamina Pool
  maxStamina?: number;          // 100 default
  isSprinting?: boolean;        // Active sprint state
  postSprintDisable?: number;   // 0.18s lockout timer in frames (11 frames @ 60fps)
  sprintStrikerBuffer?: number; // 1.5s hit-buff window timer in frames (90 frames @ 60fps)
  wasSprinting?: boolean;       // Sprint state tracking for exit detection
  sprintM2Lockout?: number;     // Lockout timer preventing sprint during M2 attack sequence
  
  // Universal Posture System (M1 Combo Recovery & Stance Realignment)
  postureCd?: number;                  // Active Posture Cooldown timer in frames (@ 60fps)
  maxPostureCd?: number;               // Maximum Posture Cooldown in frames for the fighter's style & speed
  postureReductionModifier?: number;   // Dynamic posture reduction multiplier (0.0 to 1.0)
  pendingPostureReduction?: number;    // One-time consumable stored posture reduction buff (0.0 to 0.995)
  canStackPostureReductions?: boolean; // Unique style passive flag allowing posture reduction stacking
  isPostureLocked?: boolean;           // True while posture is recovering (M1 light attack inputs disabled)
  
  // Custom combat fields for 1v1 Basic style sparring R&D
  comboStage?: number;      // 0 to 3
  comboResetTimer?: number; // game tick timer for chain reset
  heavyWindup?: number;     // 0 to 48 (progress frames)
  isBlocking?: boolean;     // block stance state
  armorHP?: number;         // 18 max
  armorBreakTime?: number;  // staggered stun state
  concussTime?: number;     // screen shake/blur state
  crippleTime?: number;     // slow status effect (15% slow)
  crippledLeg?: boolean;    // true if leg is crippled from leg sweep / low kick
  crippleTimer?: number;    // frames remaining on leg cripple
  m2StunTimer?: number;     // Stun duration caused by M2 (heavy attacks) for spinning stars visual effect
  behavior?: 'passive' | 'block' | 'rookie' | 'silver' | 'gold' | 'diamond' | 'amethyst' | 'test_ai' | 'attack_m1' | 'attack_m2' | 'attack_m1_on_block' | 'attack_m2_on_block' | 'auto_parry' | 'active_guard_mindless' | 'active_guard_sentient' | string; // dummy AI behavioral modes
  attackTimer?: number;     // dummy AI combat clock
  armorRegenTimer?: number; // dynamic ticker for block shield regeneration
  blockTimer?: number;      // frames spent in active blocking state
  parryFlashTime?: number;  // visual timer for showing parry gold-shine
  parriedStun?: number;     // frames the fighter is parry-stunned and cannot turn
  shotokanRenZukiPending?: boolean; // Ren-Zuki double-burst auto chain trigger
  blockLockout?: number;    // frames during which fighter cannot raise guard
  hasReflexPivot?: boolean; // Basic style passive: M2 windup down to 0.1s on next heavy
  flowS1Whiffed?: boolean;        // Flow Boxing: Whiffed S1 primes S2 I-Frames
  flowS2HasIFrames?: boolean;      // Flow Boxing: S2 possesses I-Frames from Slip Recovery
  flowS3ParryBaited?: boolean;     // Flow Boxing: Feint Trap active, S4 deals 2x DMG & unparryable
  flowSprintSwayTimer?: number;    // Flow Boxing: Sway Sprint 1.2s (72 frames) duration pool
  flowSprintSwayCooldown?: number; // Flow Boxing: Sway Sprint duration regen timer
  flowSprintAbilityLockout?: number; // Flow Boxing: 0.5s (30 frames) lockout of Sway Sprint ability after M1/M2
  flowSprintSwayActive?: boolean;   // Flow Boxing: true when actively using Sway Sprint boost & I-Frames
  flowSprintDepletedInRun?: boolean; // Flow Boxing: true if sway sprint duration reached 0 during current run
  continuousSprintFrames?: number;  // Continuous frames spent sprinting
  flowStrikerBuffTimer?: number;   // Flow Boxing: Striker Flow +10% M1 damage timer
  hasKineticCounter?: boolean; // Slugger passive: S1 light windup down to 0.1s on next combo
  attackLockedAngle?: number; // Locked angle of a spinning heavy kick
  capoeiraDodgeStacks?: number;   // 3 dodge stacks
  capoeiraRegenTimer?: number;    // regen countdown in frames (5.0s = 300 frames)
  capoeiraWhiffBonusActive?: boolean; // true if next strike gets 20% bonus damage
  capoeiraDodgeFlashTime?: number; // visual white-flicker timer when dodging during Ginga block (16 frames)
  capoeiraExhausted?: boolean;    // true if exhausted (unable to move/attack)
  capoeiraExhaustTimer?: number;  // exhaust timer (1.0s = 60 frames)
  capoeiraS3IFrameTimer?: number; // S3 M1 Gains IFrames for 0.1s (6 frames)
  ashiharaRecoveryTimer?: number; // recovery frames on whiff (3 frames)
  ashiharaParryLockout?: number;  // 0.8s (48 frames) parry lockout to prevent accidental misclick
  parryLockoutTimer?: number;     // 1.0s (60 frames) lockout disabling opponent from parrying (e.g. Ashihara M2 passive)
  ashiharaM2Stage?: number;       // Ashihara 3-Stage M2 system (1: Mawashi Uke, 2: Tsukami Drag, 3: Chudan Straight)
  ashiharaM2Timer?: number;       // Timer for active Ashihara M2 stage frames
  m2SeqReady?: boolean;           // Universal M2 Sequence 1 landed -> unlocked Sequence 2 follow-up
  m2SeqWindow?: number;           // Window in frames during which M2 Seq 2 can be executed (60 frames = 1.0s)
  m2IsSeq2?: boolean;             // Active heavy attack is Sequence 2 follow-up
  // Kickboxing specific fields
  hasChainReaction?: boolean;        // Kickboxing passive: landed full S1-S4 combo -> M2 Seq 1 windup reduced to 0.25s
  kickboxingSeq2Ready?: boolean;     // Kickboxing M2 Seq 1 landed -> unlocked Seq 2 (Teep)
  kickboxingSeq2Window?: number;     // Window in frames during which Seq 2 can be pressed (60 frames = 1.0s)
  kickboxingIsSeq2?: boolean;         // Active heavy attack is Sequence 2 (Teep)
  kickboxingLockoutTimer?: number;   // Whiff lockout duration timer (3.2s = 192 frames)
  pensadorCharges?: number;          // Keysi Pensador guard absorbed hit charges (up to 3)
  pensadorLungeWindow?: number;       // Keysi Pensador lunge window frames (up to 1.5s = 90 frames)
  keysiAttackLockout?: number;        // Lockout frames preventing guard raise after attacking in Keysi style
  // Keysi Rework Fields (CQC Clinch Trapper)
  keysiM2Primed?: boolean;            // Primed Clinch Surge: M2 has 0.1s windup + Super Armor
  keysiHasSuperArmor?: boolean;       // Super Armor active during primed M2 windup/attack
  maxHeavyWindup?: number;            // Total initial windup frames for ratio calculation
  keysiClinchStage?: 'delay' | 'clinch' | null; // Keysi M2 stage: grab delay (0.25s) or active clinch/headbutt
  keysiClinchTimer?: number;          // Active frame counter for clinch animation
  keysiClinchTarget?: Fighter | null; // Grabbed opponent
  keysiClinchHeadbuttHit?: boolean;   // Headbutt impact frame triggered
  keysiVulnerableTimer?: number;      // 5.0s (300 frames) Over-Extended Vulnerability on whiff (-60% speed, +30% dmg taken, no parry)
  keysiWhiffCooldownQueued?: boolean; // 7.0s CD queued to start when 5.0s vulnerability expires
  keysiQueuedWhiffCd?: number;        // Queued heavy cooldown frames (420 frames = 7.0s)
  keysiStaggerTimer?: number;         // 4.0s (240 frames) Trauma Stagger (+60% windups, -30% speed, chaotic drift)
  keysiStaggerDriftAngle?: number;    // Direction of chaotic drift
  keysiStaggerTrailHistory?: Array<{ x: number; y: number; time: number }>;
  kickboxingAutoSeq2Timer?: number;   // Auto-trigger S2 timer (0.15s)
  // CQC (Close Quarters Combat) fields
  cqcSpeedBonus?: number;             // Progressive M1 acceleration in frames (9 frames / 0.15s per landed hit)
  cqcM2Stage?: 'windup' | 'dash' | 'assault' | null; // CQC M2 lifecycle stage
  cqcLockedAngle?: number;            // Fixed angle looking away during CQC assault
  cqcWindupTimer?: number;            // M2 windup progress timer (90 frames down to 0)
  cqcRings?: Array<{ r: number; maxR: number; frozen: boolean }>; // 8 Echo Rings (20% decreased range, max 272px)
  cqcLockedTarget?: Fighter | null;   // First target to touch/overlap Echo Rings
  cqcDashStartX?: number;             // Dash starting X
  cqcDashStartY?: number;             // Dash starting Y
  cqcDashEndX?: number;               // Dash target X (past the opponent)
  cqcDashEndY?: number;               // Dash target Y (past the opponent)
  cqcDashTotalFrames?: number;        // Total dash frames
  cqcAssaultHit?: number;             // Active assault hit count (1 to 5)
  cqcAssaultTimer?: number;           // Timer per assault strike
  cqcAssaultBlocked?: boolean;        // True if opponent blocked CQC M2 head-on
  cqcAttackLockout?: number;          // Opponent M1/M2 disabled timer (120 frames / 2.0s)
  cqcBlockLockout?: number;           // Opponent block disabled timer during hits 1-4
  cqcM2HitFlashTime?: number;         // Visual flash timer for enemy body parts when hit by CQC M2
  // Street Taekwondo specific fields
  hasKickMomentum?: boolean;         // Street Taekwondo passive: Landing M2 boosts next M1 combo attack speed by +30%
  // Boxing: Shell fields
  shellS3Primed?: boolean;           // S3 has straightened/primed to prepare directly for S4
  shellS4ReturnTimer?: number;       // Smooth blend return animation timer from S4 to Posture/Normal Stance
  shellPostureBoostTimer?: number;   // 3.0s (180 frames) 2x Posture Recovery speed boost from landing M2
  kyokushinM2PeakHoldTimer?: number; // Freeze timer for Kyokushin M2
  kyokushinM2Stage?: 'windup' | 'thrust' | 'freeze' | 'retract' | null; // Mathematically locked 3-phase lifecycle
  kyokushinM2Progress?: number;      // Unified 0.0 to 1.0 animation progress for both arms
  kyokushinSpiralTimer?: number;     // 2.5s (150 frames) Purple Electrical Spiral debuff on hit
  // Street Boxing Rework fields
  streetBoxingM2Stage?: number;      // 0 (none), 1 (Right Jab 1), 2 (Right Jab 2), 3 (Left Hook)
  streetBoxingM2Hits?: number;       // Count of landed hits in current M2 flurry
  streetBoxingM2NextTimer?: number;  // Interval frames before next strike in flurry
  streetBoxingCounterSurge?: boolean; // Counter-Surge: next M1 execution speed +80% after parry
  streetBoxingUnbreakable?: boolean;  // Unbreakable Flurry: M2 Strikes 2 & 3 cannot be parried
  streetBoxingM2Queue?: number[];     // Section 1.18: Auto-Burst Queue [2, 3] locked on Hit 1
  streetBoxingAutoBurstActive?: boolean; // Section 1.18: Uninterruptible Auto-Burst Execution Active
  postureOverdriveActive?: boolean;  // Posture Overdrive: next posture CD reduced to 0.1s
  handTrailHistory?: {
    left: Array<{ fx: number; fy: number; ex: number; ey: number; sx: number; sy: number; time: number }>;
    right: Array<{ fx: number; fy: number; ex: number; ey: number; sx: number; sy: number; time: number }>;
  };
  cqcTrailHistory?: {
    left: Array<{ fx: number; fy: number; ex: number; ey: number; sx: number; sy: number; time: number }>;
    right: Array<{ fx: number; fy: number; ex: number; ey: number; sx: number; sy: number; time: number }>;
  };
  capoeiraLegTrailHistory?: {
    leg1: Array<{ tipX: number; tipY: number; baseX: number; baseY: number; angle: number; time: number }>;
    leg2: Array<{ tipX: number; tipY: number; baseX: number; baseY: number; angle: number; time: number }>;
  };
  shellLockoutTimer?: number;        // 1.0s (60 frames) lockout on opponent from M2 (disables M1, M2, Move, Dash)
  shellSpinTimer?: number;           // 1.0s (60 frames) spin out duration on hit opponent
  shellParryResetPending?: boolean;  // Deflective Posture Reset pending 45% reduction on next posture CD
  lastYawAngle?: number;             // Rotation tracking for Anti-spin constraint on Shoulder Roll Parry
  yawRotationAccumulator?: number;   // Accumulated rotation in last 20 frames for spin detection
  shellRetractionHoldTimer?: number; // 0.2s (12 frames) extension hold timer before retracting M1 punch
  tkdChamberFoot?: boolean;          // S1 Lead Snap Kick chamber keep state (keeps foot chambered for instant follow-up)
  tkdSpinDashTimer?: number;         // M2 S1 360 Spin Dash timer (41 frames / 0.68s)
  tkdSpinDashActive?: boolean;        // M2 S1 360 Spin Dash active flag
  tkdCounterBaitIFrames?: number;    // Counter-Bait: 0.8s (48 frames) I-Frames if opponent parries during M2 S1
  tkdIFrameTimer?: number;           // S3 Stance Switch Kick active I-Frames
  // Aikido specific fields
  aikiS3FreeM2CdTimer?: number;       // 15.0s (900 frames) cooldown for Tenkan Aiki Flow (reduced by 2.0s / 120 frames per M1 hit)
  aikiFreeM2Active?: boolean;         // True if M2 Stance Boost was granted via S3 Tenkan Flow
  aikiIsFreeSlam?: boolean;           // True if slam was triggered via free mechanics (S3 Tenkan, clash, parry) so manual M2 CD is not activated
  aikiManualM2UsedInSequence?: boolean; // True if manual M2 was used before free M2 in current combo sequence
  aikiM2StanceTimer?: number;         // Aiki Redirection Stance timer (300 frames / 5.0s)
  aikiM2SuperArmorHits?: number;      // 2-Hit Super Armor count during M2 stance
  aikiM2HitLanded?: boolean;          // True if M1 S4 slam landed during active M2 stance
  aikiCounterSlamWindow?: number;     // 0.2s (12 frames) reaction window after parry to trigger Over-Head Counter Slam via M1
  aikiSlamDamage?: number;            // Custom damage dealt by this specific slam (10.0 for Kinetic Intercept & Parry Counter, 22.0 for M2 Stance S4 Slam)
  aikiSlamStage?: 'clamp' | 'lift' | 'slam' | null; // Over-Head Grapple Slam animation stage
  aikiSlamTimer?: number;            // Active countdown frame counter for slam animation (1.5s / 90 ticks total)
  aikiSlamFrame?: number;            // Active elapsed execution frame
  aikiSlamBaseAngle?: number;        // Facing angle at initial grapple connection
  aikiSlamImpactDone?: boolean;      // True if 12 damage impact detonation has occurred
  aikiOverheadScale?: number;        // Pseudo-3D vertical height scale factor (1.0x to 1.35x)
  aikiSlamVictimStage?: 'clamp' | 'lift' | 'airborne' | 'slam' | 'downed' | null; // Victim's overhead slam state
  aikiSlamTarget?: Fighter | null;   // Target being slammed
  aikiSlamUninterruptible?: boolean; // Unique slam animation cannot be interrupted by user or enemy
  aikiLockoutTimer?: number;         // 1.0s (60 frames) M1 & M2 attack lockout on slammed target
  aikiSpinDownTimer?: number;        // 0.45s (27 frames) spinning downed state on slammed target
  aikiShakyVisionTimer?: number;     // 1.0s (60 frames) shaky vision disruption on slammed target
  aikiKoteGaeshiTrapTimer?: number;  // S2 Kote-Gaeshi wrist trap timer (pulls opponent lead glove down 10px off-center)
  aikiTenkanOffBalanceTimer?: number;// S3 Tenkan pivot off-balance timer (rotates opponent 20° and lateral nudge)
  aikiShomenuchiChargeTimer?: number;// S4 Shomenuchi palm energy gather timer
  aikiCentrifugalKnockbackTimer?: number;// Active frame counter for Centrifugal Ejection launch motion trails
  aikiCurlFactor?: number;           // Smooth 0.0 -> 1.0 transition factor for Aikido S2 chambered right arm
  tkdOffBalanceTimer?: number;       // Off-Balance Slip recovery timer
  dazeStunTimer?: number;            // Daze Stun timer from M2 S2 Snap Kick
  kyokushinBlockTime?: number;       // frames spent continuously blocking
  kyokushinConditioningDR?: number;  // Full-Contact Conditioning DR (starts at 0.10, degrades -0.01 per hit taken)
  kyokushinOutOfCombatTimer?: number; // Out of combat timer (600 frames = 10s -> restores DR back to 0.10)
  kyokushinBlockStoredPowerTimer?: number; // Bone-Crushing Attrition timer (60 frames = 1.0s after exiting block)
  kyokushinBlockStoredPowerActive?: boolean; // Flag indicating damage was absorbed during block
  kyokushinM2AbsorbedHits?: number;  // Kinetic Absorption absorbed hit count during M2 windup
  kyokushinBlockHitsTaken?: number;  // Fudo Dachi guard hits absorbed (5th light or 1 heavy breaches guard)
  spinOutTimer?: number;             // Universal Downed state / spin-out stagger timer (in frames)
  kyokushinSpinOutTimer?: number;    // Legacy alias for 0.6s fatigue spin-out stagger
  kyokushinM2FreezeTimer?: number;   // Post-M2 freeze timer looking left (28 frames)
  kyokushinBlockHits?: number;       // Block hit counter
  kyokushinNoBlockTimer?: number;    // Block Nerf Cooldown
  kyokushinSpinOutM1Lockout?: number; // M1 attack lockout after Kyokushin spin-out
  postBlockAttackLockout?: number; // 0.4s (24 frames) attack lockout delay upon dropping guard
  postS4HeavyLockout?: number;    // specific M2 delay timer after S4 finisher
  wasBlocking?: boolean;          // tracked previous frame block state
  decisionTimer?: number;        // AI decision tick countdown
  feintTimer?: number;           // AI feint duration timer
  feintCooldown?: number;        // AI feint interval cooldown
  isFeinting?: boolean;          // AI feint state flag
  // AI Fair-Play & Humanized Perception Engine (v1.7.6 Part 4)
  aiPerceivedAttackTicks?: number; // Tracked visible animation ticks (must be >= 12 frames before AI can react)
  aiLastObservedStrikeId?: string; // ID / type of observed strike
  aiMetronomeRhythm?: number;     // Expected frame cadence of target's style
  aiParryReactionPending?: boolean; // Scheduled reaction trigger
  aiPostParryChoice?: 'counter_parry' | 'evade_dash' | 'guard_backpedal'; // Dynamic response when bot gets parried
  aiPostParryDecided?: boolean;   // Whether decision has been locked for current stagger
  // Combat Engine v1.7.3.7 fields
  hitSteeringLock?: number;      // 0.45s (27 frames) steering lockout on damage taken (\omega = 0)
  hitMovementLock?: number;      // 0.45s (27 frames) directional movement lockout on damage taken (v_input = 0)
  isBlockInputHeld?: boolean;    // Flag indicating block input is actively held for Frame 1 recovery buffering
  parryBlockGraceTimer?: number; // Post-parry block grace timer allowing instant counter-attack
  blockUseCount?: number;        // Track consecutive block usages
  blockRefreshThreshold?: number; // Random 2-3 block usage threshold for 0.1s refresh window
  blockUseResetTimer?: number;   // Timer resetting consecutive block counter (120 frames / 2.0s)
  afterParryGraceTimer?: number; // Post-parry grace timer removing basic attack post-block delay (90 frames / 1.5s)
  // Slugger Rework Fields
  sluggerM1ChainCount?: number;
  superCrippleTimer?: number;
  boneFractureTimer?: number;
  sluggerM1WhiffDragCount?: number;
  sluggerWhiffedStages?: number[];
  sluggerM2WhiffLockoutTimer?: number;
  // Section 2.8: Universal Combat Balancing (Parry & Dash Overhaul)
  postM1BlockLockout?: number;         // 0.15s (9 frames @ 60fps) lockout preventing block after M1 completes
  postDashAttackLockout?: number;      // 0.30s (18 frames @ 60fps) lockout preventing M1/M2 after exiting dash
  dashHitDelayedStopTimer?: number;    // 0.10s (6 frames @ 60fps) timer after being hit during dash before momentum stops dead
  dashWhiteFrameFlashTime?: number;    // Visual flash timer for White Frames super-armor during dash
  lastHitBeforeDashTimer?: number;     // Window in frames (~120 / 2s) tracking recent direct strike taken before dashing
  dashInitiatedAfterHit?: boolean;     // True if current dash was initiated after taking a direct strike (panic dash)
}

export interface FoodGem {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  value: number;
  type: 'xp' | 'cash' | 'roll';
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'aura' | 'spark' | 'ko' | 'cash' | 'exp' | 'parry_ring' | string;
}

export interface RollHistory {
  styleId: string;
  timestamp: number;
  rarity: RarityType;
}

export type VirtualControlId = 
  | 'joystick' 
  | 'light' 
  | 'heavy' 
  | 'block' 
  | 'dash' 
  | 'sprint' 
  | 'target_switch' 
  | 'char_cards' 
  | 'player_card' 
  | 'opponent_card' 
  | 'm2_cooldown' 
  | 'menu_settings'
  | 'status_bar';

export interface VirtualControlItem {
  id: VirtualControlId | string;
  label: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  radius: number; // pixel radius
  color: string;
  opacity?: number; // 0.2 to 1.0
  scale?: number; // 0.3 to 1.5
}

export interface KeybindSettings {
  block: string; // e.g. 'KeyF'
  dash: string;  // e.g. 'Space'
}

export interface GameSettings {
  soundEnabled: boolean;
  masterVolume?: number; // 0.0 to 1.0
  sfxVolume?: number; // 0.0 to 1.0
  musicVolume?: number; // 0.0 to 1.0
  screenShake: number; // multiplier: 0, 0.25, 0.5, 1, 1.5, 2.0
  showVirtualControls: 'auto' | 'always' | 'never';
  touchControlMode?: 'virtual'; // Fixed Virtual HUD controls
  cameraMode?: 'standard' | 'lockon_swipe'; // 'standard' (top-down world relative) or 'lockon_swipe' (Character-Axis Lock-On & Swipe Aim)
  cameraSensitivity?: number; // Swipe Aim Sensitivity (0.1 to 10.0, default 1.0)
  mobileControlsLayout: VirtualControlItem[];
  mobileControlsLayoutLandscape?: VirtualControlItem[];
  mobileControlsLayoutPortrait?: VirtualControlItem[];
  keybinds?: KeybindSettings;
  virtualControlScale?: number;
  gameSpeed?: number; // multiplier: 1.0 (fixed)
  cursorType: 'crosshair' | 'dot' | 'circle' | 'minimal' | 'diamond';
  cursorColor?: 'white' | 'red' | 'cyan' | 'amber' | 'emerald' | 'purple';
  showDevSwitcher?: boolean;
  hudScale?: number; // multiplier: 0.5 to 1.3
  mobileFov?: number; // FOV multiplier: 0.6x to 2.0x
  hudOpacity?: number; // 0.2 to 1.0
  pinchToZoomEnabled?: boolean; // Mobile pinch to zoom gesture toggle
  damageNumbers?: boolean; // Show pop-up floating damage text
  damageBarDegradingEnabled?: boolean; // Visually degrades HP bar with stacking delayed dark red chunk (1s disintegration)
  staminaWarning?: boolean; // Low stamina red warning pulse
  comboCounter?: boolean; // Show combo counter & rating grade
  showFps?: boolean; // Show FPS and latency counter
  hapticsEnabled?: boolean; // Mobile touch vibration feedback
  hitstopEffect?: boolean; // Micro freeze frame on heavy strikes
  autoTargetAssist?: boolean; // Soft-aim assist towards enemy in 1v1 / 2v2
  particleDensity?: 'off' | 'low' | 'medium' | 'high' | 'ultra'; // Visual particles quality
  arenaTheme?: 'classic_cage' | 'neon_underground' | 'tokyo_dojo' | 'championship'; // Octagon aesthetic
  lockFov?: boolean; // Settings option to lock/unlock camera FOV from changing
  
  // Performance Settings v1.7.4
  lowGraphicsMode?: boolean; // Disable heavy background canvas layers & bloom
  targetFps?: 'uncapped' | '60' | '30'; // Target frame rate cap
  renderResolutionScale?: 1.0 | 0.85 | 0.75 | 0.60; // Internal canvas render scale
  disableAuraVfx?: boolean; // Disable style aura particles & floor drop shadows
  touchThrottling?: boolean; // Coalesce mobile touch joystick inputs per frame
  mobileSprintMode?: 'button_only' | 'auto_sprint'; // Mobile sprint activation scheme
}

export interface UserSession {
  email?: string;
  isTestAccount: boolean;
  fighterName?: string;
  fighterId?: string;
  username?: string;
  nickname?: string;
  gmailLinked?: boolean;
  linkedEmail?: string;
  createdAt?: number;
  lastActiveTimestamp?: number;
}

export interface TournamentFighter {
  id: string;
  name: string;
  style: FightingStyle;
  heightInInches: number;
  aiDifficulty: 'rookie' | 'silver' | 'gold' | 'diamond' | 'amethyst';
  elo: number;
}

export interface TournamentMatch {
  id: string;
  round: 'quarter' | 'semi' | 'final';
  matchIndex: number;
  fighter1?: 'PLAYER' | TournamentFighter | null;
  fighter2?: 'PLAYER' | TournamentFighter | null;
  winner?: 'PLAYER' | TournamentFighter;
  isCompleted: boolean;
  // Real-Time Background Simulation State
  isSimulating?: boolean;
  simDuration?: number; // total seconds (e.g. 25-35s)
  simElapsed?: number; // elapsed seconds
  simCurrentRound?: number; // 1, 2, 3
  simFighter1HpPct?: number; // 0-100%
  simFighter2HpPct?: number; // 0-100%
  simFighter1Score?: number; // 0-3
  simFighter2Score?: number; // 0-3
}

export interface TournamentBracketState {
  id: string;
  status: 'in_progress' | 'completed' | 'eliminated';
  currentRound: 'quarter' | 'semi' | 'final';
  entryFeePaid?: boolean;
  fighters: TournamentFighter[];
  quarterMatches: TournamentMatch[];
  semiMatches: TournamentMatch[];
  finalMatch: TournamentMatch;
  playerExitRound?: 'quarter' | 'semi' | 'final';
  playerFinalPlacement?: 'champion' | 'runner_up' | 'semi_exit' | 'quarter_exit';
  claimedRewards?: boolean;
}
