// ============================================================================
// DECLARATIVE PLUGIN TOOLKIT: defineStyle() BOILERPLATE ELIMINATOR
// Section B: Universal Style Builder with Default Fillers
// ============================================================================

import {
  StyleContract,
  StyleMetadata,
  StyleAttributeModifiers,
  StyleDurationSpeedConfig,
  StyleKinematicPose,
  CombatTelemetrySnapshot,
} from './types';
import { CombatMutationPayload } from '../combat/effects';

/**
 * Standard baseline attribute modifiers
 */
export const DEFAULT_ATTRIBUTES: StyleAttributeModifiers = {
  speed: 1.0,
  reach: 1.0,
  power: 1.0,
  defense: 1.0,
  knockback: 1.0,
  healthMax: 0,
};

/**
 * Standard baseline duration speed timing
 */
export const DEFAULT_TIMING: StyleDurationSpeedConfig = {
  s1: {
    windupSec: 0.12,
    activeSec: 0.08,
    recoverySec: 0.16,
    hitstunSec: 0.22,
    damage: 4.0,
    chipDamage: 1.2,
    knockback: 3.0,
    punchType: 'left',
    sfx: 'punch',
  },
  s2: {
    windupSec: 0.14,
    activeSec: 0.08,
    recoverySec: 0.18,
    hitstunSec: 0.24,
    damage: 4.5,
    chipDamage: 1.4,
    knockback: 3.5,
    punchType: 'right',
    sfx: 'punch',
  },
  s3: {
    windupSec: 0.16,
    activeSec: 0.08,
    recoverySec: 0.20,
    hitstunSec: 0.26,
    damage: 5.0,
    chipDamage: 1.6,
    knockback: 4.0,
    punchType: 'left',
    sfx: 'punch',
  },
  s4: {
    windupSec: 0.20,
    activeSec: 0.10,
    recoverySec: 0.28,
    hitstunSec: 0.40,
    damage: 7.0,
    chipDamage: 2.2,
    knockback: 6.5,
    punchType: 'right',
    sfx: 'heavy_impact',
  },
  postComboDelaySec: 0.30,
};

/**
 * Default headless kinematic pose
 */
export const DEFAULT_POSE: StyleKinematicPose = {
  leadLimb: { x: 12, y: -4, angleRad: 0.1, extensionRatio: 0.3 },
  rearLimb: { x: -8, y: -2, angleRad: -0.1, extensionRatio: 0.2 },
  torsoAngleRad: 0,
  hipHeightOffset: 0,
  hitboxShape: 'circle',
  hitboxOffset: { x: 16, y: 0, radius: 18 },
};

export type PartialStyleContract<TState = Record<string, unknown>> = {
  metadata: StyleMetadata;
  attributes?: Partial<StyleAttributeModifiers>;
  timing?: Partial<StyleDurationSpeedConfig>;
  createInitialState?: () => TState;
  onHitLanded?: (
    telemetry: CombatTelemetrySnapshot,
    state: TState
  ) => { payload?: CombatMutationPayload; nextState: TState };
  onAttackBlocked?: (
    telemetry: CombatTelemetrySnapshot,
    state: TState
  ) => { payload?: CombatMutationPayload; nextState: TState };
  onParrySuccessful?: (
    telemetry: CombatTelemetrySnapshot,
    state: TState
  ) => { payload?: CombatMutationPayload; nextState: TState };
  onWhiff?: (
    telemetry: CombatTelemetrySnapshot,
    state: TState
  ) => { payload?: CombatMutationPayload; nextState: TState };
  onTick?: (
    fighterId: string,
    state: TState,
    dtSec: number
  ) => { payload?: CombatMutationPayload; nextState: TState };
  evaluatePose?: (
    phase: 'idle' | 'windup' | 'active' | 'recovery',
    sequenceIndex: number,
    progress: number,
    state: TState
  ) => Partial<StyleKinematicPose>;
  heavyAttack?: Partial<StyleContract<TState>['heavyAttack']>;
  dash?: Partial<StyleContract<TState>['dash']>;
  block?: Partial<StyleContract<TState>['block']>;
};

/**
 * defineStyle<TState>()
 * The Boilerplate Eliminator: Merges global sensible defaults with concise style overrides.
 * Guarantees every style author can define a high-performance plugin in <50 lines of code.
 */
export function defineStyle<TState = Record<string, unknown>>(
  def: PartialStyleContract<TState>
): StyleContract<TState> {
  const initialFactory = def.createInitialState || (() => ({} as TState));

  return {
    metadata: {
      auraStyle: 'none',
      isTesting: false,
      ...def.metadata,
    },
    attributes: {
      ...DEFAULT_ATTRIBUTES,
      ...def.attributes,
    },
    timing: {
      ...DEFAULT_TIMING,
      ...def.timing,
      s1: { ...DEFAULT_TIMING.s1, ...def.timing?.s1 },
      s2: { ...DEFAULT_TIMING.s2, ...def.timing?.s2 },
      s3: { ...DEFAULT_TIMING.s3, ...def.timing?.s3 },
      s4: { ...DEFAULT_TIMING.s4, ...def.timing?.s4 },
    },
    createInitialState: initialFactory,

    onHitLanded: (telemetry, state) => {
      if (def.onHitLanded) {
        const res = def.onHitLanded(telemetry, state);
        return { payload: res.payload || {}, nextState: res.nextState };
      }
      return {
        payload: {
          sound: telemetry.isHeavy ? 'heavy_impact' : 'punch',
          cameraShake: telemetry.isHeavy ? 6 : 2,
        },
        nextState: state,
      };
    },

    onAttackBlocked: (telemetry, state) => {
      if (def.onAttackBlocked) {
        const res = def.onAttackBlocked(telemetry, state);
        return { payload: res.payload || {}, nextState: res.nextState };
      }
      return {
        payload: {
          sound: 'block',
          cameraShake: 1,
        },
        nextState: state,
      };
    },

    onParrySuccessful: (telemetry, state) => {
      if (def.onParrySuccessful) {
        const res = def.onParrySuccessful(telemetry, state);
        return { payload: res.payload || {}, nextState: res.nextState };
      }
      return {
        payload: {
          sound: 'parry',
          cameraShake: 8,
          postureRefund: 15,
        },
        nextState: state,
      };
    },

    onWhiff: (telemetry, state) => {
      if (def.onWhiff) {
        const res = def.onWhiff(telemetry, state);
        return { payload: res.payload || {}, nextState: res.nextState };
      }
      return { payload: { sound: 'whoosh' }, nextState: state };
    },

    onTick: def.onTick
      ? (id, state, dt) => {
          const res = def.onTick!(id, state, dt);
          return { payload: res.payload, nextState: res.nextState };
        }
      : undefined,

    evaluatePose: (phase, sequenceIndex, progress, state) => {
      const base = { ...DEFAULT_POSE };
      if (def.evaluatePose) {
        const partial = def.evaluatePose(phase, sequenceIndex, progress, state);
        return {
          ...base,
          ...partial,
          leadLimb: { ...base.leadLimb, ...partial.leadLimb },
          rearLimb: { ...base.rearLimb, ...partial.rearLimb },
          hitboxOffset: { ...base.hitboxOffset, ...partial.hitboxOffset },
        };
      }
      // Dynamic default IK kinematics based on phase and sequence
      const ext = phase === 'active' ? 0.9 : phase === 'windup' ? 0.2 : 0.4;
      const punchLimb = sequenceIndex % 2 === 0 ? 'leadLimb' : 'rearLimb';
      base[punchLimb] = {
        ...base[punchLimb],
        extensionRatio: ext,
        x: ext * 24,
      };
      return base;
    },

    heavyAttack: {
      windupSec: 0.45,
      recoverySec: 0.35,
      baseDamage: 11.0,
      chipDamage: 3.5,
      knockback: 8.5,
      cooldownSec: 4.5,
      hasSuperArmor: false,
      hasIFrames: false,
      ...def.heavyAttack,
    },

    dash: {
      durationSec: 0.32,
      cooldownSec: 3.0,
      hasIFrames: true,
      ...def.dash,
    },

    block: {
      parryWindowSec: 0.19,
      chipAbsorption: 0.70,
      blockType: 'standard',
      ...def.block,
    },
  };
}
