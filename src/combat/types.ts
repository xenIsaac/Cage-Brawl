import { Fighter, Fist, Particle, PlayerStats, GameSettings, MatchData, UserSession, FightingStyle } from '../types';

export type AiBehaviorType =
  | 'test_ai'
  | 'passive'
  | 'block'
  | 'rookie'
  | 'silver'
  | 'gold'
  | 'diamond'
  | 'amethyst'
  | 'attack_m1'
  | 'attack_m2'
  | 'attack_m1_on_block'
  | 'attack_m2_on_block'
  | 'auto_parry'
  | 'active_guard_mindless'
  | 'active_guard_sentient';

export interface CombatFighter extends Fighter {
  staminaRegenDelay?: number;
  lastSprintDelayTextTimer?: number;
  lastBlockDelayTextTimer?: number;
  comboStage?: number;
  comboResetTimer?: number;
  heavyWindup?: number;
  isBlocking?: boolean;
  armorHP?: number;
  armorBreakTime?: number;
  concussTime?: number;
  crippleTime?: number;
  behavior?: AiBehaviorType;
  attackTimer?: number;
  armorRegenTimer?: number;
  armorRegenLockout?: number;
  blockTimer?: number;
  parryFlashTime?: number;
  shotokanRenZukiPending?: boolean;
  blockLockout?: number;
  hasReflexPivot?: boolean;
  hasKineticCounter?: boolean;
  attackLockedAngle?: number;
  capoeiraDodgeStacks?: number;
  capoeiraRegenTimer?: number;
  capoeiraWhiffBonusActive?: boolean;
  capoeiraDodgeFlashTime?: number;
  capoeiraExhausted?: boolean;
  capoeiraExhaustTimer?: number;
  capoeiraS3IFrameTimer?: number;
  ashiharaRecoveryTimer?: number;
  ashiharaParryLockout?: number;
  ashiharaM2Stage?: number;
  ashiharaM2Timer?: number;
  m2SeqReady?: boolean;
  m2SeqWindow?: number;
  m2IsSeq2?: boolean;
  hasChainReaction?: boolean;
  kickboxingSeq2Ready?: boolean;
  kickboxingSeq2Window?: number;
  kickboxingIsSeq2?: boolean;
  cqcM2Stage?: 'windup' | 'dash' | 'assault' | null;
  cqcWindupTimer?: number;
  cqcLockedTarget?: CombatFighter | null;
  cqcLockedAngle?: number;
  cqcAssaultHit?: number;
  cqcAssaultTimer?: number;
  cqcAssaultBlocked?: boolean;
  cqcWasBlockingAtHit4?: boolean;
  cqcM2HitFlashTime?: number;
  superArmorFlashTime?: number;
  superArmorFlashMaxTime?: number;
  superArmorPrevActive?: boolean;
  cqcAttackLockout?: number;
  cqcRings?: Array<{ r: number; maxR: number; frozen: boolean }>;
  kickboxingLockoutTimer?: number;
  kickboxingAutoSeq2Timer?: number;
  hasKickMomentum?: boolean;
  tkdChamberFoot?: boolean;
  tkdSpinDashTimer?: number;
  tkdSpinDashActive?: boolean;
  tkdCounterBaitIFrames?: number;
  tkdIFrameTimer?: number;
  tkdOffBalanceTimer?: number;
  pensadorLungeWindow?: number;
  pensadorCharges?: number;
  pensadorRechargeTimer?: number;
  pensadorLungeActive?: boolean;
  keysiAttackLockout?: number;
  keysiM2Primed?: boolean;
  keysiHasSuperArmor?: boolean;
  maxHeavyWindup?: number;
  keysiClinchStage?: 'delay' | 'clinch' | null;
  keysiClinchTimer?: number;
  keysiClinchTarget?: CombatFighter | null;
  keysiClinchHeadbuttHit?: boolean;
  keysiVulnerableTimer?: number;
  keysiWhiffCooldownQueued?: boolean;
  keysiQueuedWhiffCd?: number;
  keysiStaggerTimer?: number;
  keysiStaggerDriftAngle?: number;
  keysiStaggerTrailHistory?: Array<{ x: number; y: number; time: number }>;
  dazeStunTimer?: number;
  postBlockAttackLockout?: number;
  postS4HeavyLockout?: number;
  shellPostureBoostTimer?: number;
  snappingCounterReady?: boolean;
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
  wasBlocking?: boolean;
  decisionTimer?: number;
  feintTimer?: number;
  feintCooldown?: number;
  isFeinting?: boolean;
  mindlessAngleSet?: boolean;
  hitSteeringLock?: number;
  hitMovementLock?: number;
  isBlockInputHeld?: boolean;
  blockUseCount?: number;
  blockRefreshThreshold?: number;
  blockUseResetTimer?: number;
  afterParryGraceTimer?: number;
  // Slugger Rework Fields
  sluggerM1ChainCount?: number;
  superCrippleTimer?: number;
  boneFractureTimer?: number;
  sluggerM1WhiffDragCount?: number;
  sluggerWhiffedStages?: number[];
  sluggerM2WhiffLockoutTimer?: number;
  // AI Fair-Play & Humanized Perception Engine (v1.7.6 Part 4)
  aiPerceivedAttackTicks?: number;
  aiLastObservedStrikeId?: string;
  aiMetronomeRhythm?: number;
  aiParryReactionPending?: boolean;
  aiPostParryChoice?: 'counter_parry' | 'evade_dash' | 'guard_backpedal';
  aiPostParryDecided?: boolean;
}

export interface FloatingTextParticle extends Particle {
  text?: string;
  textYOffset?: number;
}

export interface ArenaState {
  player: CombatFighter | null;
  dummy: CombatFighter | null;
  particles: FloatingTextParticle[];
  width: number;
  height: number;
  mouseX: number;
  mouseY: number;
  cameraX: number;
  cameraY: number;
  cameraZoom: number;
  arenaSize: number;
  gameTime: number;
  shakeAmount: number;
  visionBlurTime: number;
  hitstopTime: number;
  keysPressed: Record<string, boolean>;
  isBlockInputHeld?: boolean;
  joystickX?: number;
  joystickY?: number;
  infiniteStamina?: boolean;
  oneHitKO?: boolean;
  godMode?: boolean;
  infiniteAIStamina?: boolean;
  totalDamageDealt?: number;
  totalHitsLanded?: number;
  rankedState?: 'countdown' | 'fighting' | 'round_over' | 'match_over';
  isLMBHeld?: boolean;
  targetEnemyIndex?: number;
  cinematicZoomActive?: boolean;
  cinematicTimer?: number;
  cinematicAttacker?: CombatFighter | null;
  cinematicDefender?: CombatFighter | null;
}
