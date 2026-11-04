// ============================================================================
// CAGE BRAWL - MASTER STYLE CONTRACT & KINEMATIC TYPES (V1.7.6 MASTER SPEC)
// Section A & B: Modular Combat Engine & Declarative Plugin Toolkit
// ============================================================================

import { CombatMutationPayload } from '../combat/effects';

// ----------------------------------------------------------------------------
// 1. STYLE METADATA & STAT MODIFIERS
// ----------------------------------------------------------------------------

export type StyleClass = 'Striker' | 'Grappler' | 'Outfighter' | 'Brawler' | 'Specialist';
export type StyleCategory = 'Martial Art' | 'Street / Underground' | 'Military / Tactical' | 'Traditional';
export type StylePlaystyle = 'Aggressive' | 'Counter' | 'Defensive' | 'Fluid / Flow' | 'Heavy Pressure';
export type StyleTier = 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';

export interface StyleMetadata {
  id: string;
  name: string;
  class: StyleClass;
  category: StyleCategory;
  playstyle: StylePlaystyle;
  description: string;
  passiveName: string;
  passiveDesc: string;
  strikeName: string;
  color: string;
  secondaryColor: string;
  auraStyle?: 'fire' | 'lightning' | 'ring' | 'spiral' | 'shield' | 'none';
  isTesting?: boolean; // When true, style is usable in Practice AI exclusively
}

export interface StyleAttributeModifiers {
  speed: number;       // Multiplier (1.0 default)
  reach: number;       // Multiplier (1.0 default)
  power: number;       // Multiplier (1.0 default)
  defense: number;     // Multiplier (1.0 default)
  knockback: number;   // Multiplier (1.0 default)
  healthMax?: number;  // Additive health bonus (default 0)
}

// ----------------------------------------------------------------------------
// 2. DURATION SPEED (DS) & EXECUTION TIMING CONFIG
// ----------------------------------------------------------------------------

export interface SequenceTimingConfig {
  windupSec: number;
  activeSec: number;
  recoverySec: number;
  hitstunSec: number;
  damage: number;
  chipDamage: number;
  knockback: number;
  punchType?: 'left' | 'right' | 'kick' | 'special';
  isIFrame?: boolean;
  unparryable?: boolean;
  sfx?: string;
  name?: string;
}

export interface StyleDurationSpeedConfig {
  s1: SequenceTimingConfig;
  s2: SequenceTimingConfig;
  s3: SequenceTimingConfig;
  s4: SequenceTimingConfig;
  postComboDelaySec: number;
}

// ----------------------------------------------------------------------------
// 3. HEADLESS KINEMATICS & POSE TRANSFORMS
// ----------------------------------------------------------------------------

export interface JointTransform {
  x: number;
  y: number;
  angleRad: number;
  extensionRatio: number; // 0.0 (retracted) to 1.0 (fully extended)
}

export interface StyleKinematicPose {
  leadLimb: JointTransform;
  rearLimb: JointTransform;
  torsoAngleRad: number;
  hipHeightOffset: number;
  hitboxShape: 'circle' | 'capsule' | 'sector';
  hitboxOffset: { x: number; y: number; radius: number };
}

// ----------------------------------------------------------------------------
// 4. COMBAT TELEMETRY SNAPSHOT (Read-Only)
// ----------------------------------------------------------------------------

export interface CombatTelemetrySnapshot {
  timestampMs: number;
  attackerId: string;
  defenderId: string;
  isHeavy: boolean;
  sequenceIndex: number;
  distance: number;
  attackerHPPercent: number;
  defenderHPPercent: number;
  attackerPosturePercent: number;
  defenderPosturePercent: number;
  wasCounterHit: boolean;
  wasParried: boolean;
  wasBlocked: boolean;
}

// ----------------------------------------------------------------------------
// 5. GENERIC STATEFUL STYLE CONTRACT (StyleContract<TState>)
// ----------------------------------------------------------------------------

export interface StyleContract<TState = Record<string, unknown>> {
  metadata: StyleMetadata;
  attributes: StyleAttributeModifiers;
  timing: StyleDurationSpeedConfig;

  // Generic Isolated State Initializer
  createInitialState: () => TState;

  // Event Lifecycle Hooks (Pure Payloads, Zero Side-Effects)
  onHitLanded: (
    telemetry: CombatTelemetrySnapshot,
    state: TState
  ) => { payload: CombatMutationPayload; nextState: TState };

  onAttackBlocked: (
    telemetry: CombatTelemetrySnapshot,
    state: TState
  ) => { payload: CombatMutationPayload; nextState: TState };

  onParrySuccessful: (
    telemetry: CombatTelemetrySnapshot,
    state: TState
  ) => { payload: CombatMutationPayload; nextState: TState };

  onWhiff: (
    telemetry: CombatTelemetrySnapshot,
    state: TState
  ) => { payload: CombatMutationPayload; nextState: TState };

  onTick?: (
    fighterId: string,
    state: TState,
    dtSec: number
  ) => { payload?: CombatMutationPayload; nextState: TState };

  // Headless Kinematics Evaluator
  evaluatePose: (
    phase: 'idle' | 'windup' | 'active' | 'recovery',
    sequenceIndex: number,
    progress: number, // 0.0 -> 1.0 within phase
    state: TState
  ) => StyleKinematicPose;

  // Heavy Attack Execution Config
  heavyAttack: {
    windupSec: number;
    recoverySec: number;
    baseDamage: number;
    chipDamage: number;
    knockback: number;
    cooldownSec: number;
    hasSuperArmor?: boolean;
    hasIFrames?: boolean;
    onExecute?: (state: TState) => { payload: CombatMutationPayload; nextState: TState };
  };

  // Dash Config
  dash: {
    durationSec: number;
    cooldownSec: number;
    hasIFrames: boolean;
  };

  // Block & Parry Window
  block: {
    parryWindowSec: number; // e.g. 0.19s standard
    chipAbsorption: number; // e.g. 0.70 standard
    blockType: 'standard' | 'rooted' | 'stacks' | 'philly_shell';
  };
}
