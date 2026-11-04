// ============================================================================
// STRANGLER FIG RUNTIME BRIDGE (src/styles/bridge.ts)
// Section B: Zero-Downtime Fallback & Dual-Engine Compatibility
// ============================================================================

import { StyleContract } from './types';
import { FightingStyleModule, LightStageData } from '../combat/styles/types';
import { CombatFighter } from '../combat/types';
import { CombatMutationPayload } from '../combat/effects';

/**
 * Isolated runtime state storage for contract styles during combat
 */
const styleStateRegistry = new Map<string, Map<string, unknown>>();

function getFighterStyleState<TState>(fighterId: string, contract: StyleContract<TState>): TState {
  let styleMap = styleStateRegistry.get(contract.metadata.id);
  if (!styleMap) {
    styleMap = new Map();
    styleStateRegistry.set(contract.metadata.id, styleMap);
  }
  let state = styleMap.get(fighterId) as TState | undefined;
  if (state === undefined) {
    state = contract.createInitialState();
    styleMap.set(fighterId, state);
  }
  return state;
}

export function setFighterStyleState<TState>(
  fighterId: string,
  styleId: string,
  state: TState
): void {
  let styleMap = styleStateRegistry.get(styleId);
  if (!styleMap) {
    styleMap = new Map();
    styleStateRegistry.set(styleId, styleMap);
  }
  styleMap.set(fighterId, state);
}

export function inspectFighterStyleState(fighterId: string, styleId: string): unknown {
  return styleStateRegistry.get(styleId)?.get(fighterId);
}

export function clearStyleRuntimeState(): void {
  styleStateRegistry.clear();
}

/**
 * Adapts a modern StyleContract<TState> into a FightingStyleModule so that
 * all existing Arena, AI, and Combat systems consume it transparently with zero breaking changes.
 */
export function adaptContractToLegacyModule<TState>(
  contract: StyleContract<TState>,
  onEffectDispatched?: (payload: CombatMutationPayload) => void
): FightingStyleModule {
  const meta = contract.metadata;
  const timing = contract.timing;
  const attr = contract.attributes;

  const stageList = [timing.s1, timing.s2, timing.s3, timing.s4];

  return {
    id: meta.id,
    name: meta.name,
    isTesting: meta.isTesting,
    color: meta.color,
    secondaryColor: meta.secondaryColor,
    description: meta.description,
    passiveName: meta.passiveName,
    passiveDesc: meta.passiveDesc,
    strikeName: meta.strikeName,
    auraStyle: meta.auraStyle || 'none',

    statModifiers: {
      speed: attr.speed,
      reach: attr.reach,
      power: attr.power,
      defense: attr.defense,
      knockback: attr.knockback,
      healthMax: attr.healthMax || 0,
    },

    lightAttack: {
      comboLength: 4,
      getStageData: (stage: number): LightStageData => {
        const clampedStage = Math.max(0, Math.min(3, stage));
        const conf = stageList[clampedStage] || timing.s1;
        const punchType: 'left' | 'right' =
          conf.punchType === 'right' ? 'right' : 'left';

        return {
          damage: conf.damage,
          chipDamage: conf.chipDamage,
          windupSec: conf.windupSec,
          recoverySec: conf.recoverySec,
          knockback: conf.knockback,
          hitstunSec: conf.hitstunSec,
          punchType,
          isIFrame: conf.isIFrame || false,
          unparryable: conf.unparryable || false,
          sfx: conf.sfx,
          name: conf.name,
        };
      },
      postComboDelaySec: timing.postComboDelaySec,
    },

    heavyAttack: {
      getWindupSec: () => contract.heavyAttack.windupSec,
      getCooldownSec: () => contract.heavyAttack.cooldownSec,
      baseDamage: contract.heavyAttack.baseDamage,
      chipDamage: contract.heavyAttack.chipDamage,
      knockback: contract.heavyAttack.knockback,
      hasSuperArmor: contract.heavyAttack.hasSuperArmor,
      hasIFrames: contract.heavyAttack.hasIFrames,
      onExecute: (fighter: CombatFighter) => {
        if (contract.heavyAttack.onExecute) {
          const currentState = getFighterStyleState(fighter.id, contract);
          const { payload, nextState } = contract.heavyAttack.onExecute(currentState);
          setFighterStyleState(fighter.id, meta.id, nextState);
          if (onEffectDispatched) onEffectDispatched(payload);
        }
      },
      onWhiff: (fighter: CombatFighter) => {
        const currentState = getFighterStyleState(fighter.id, contract);
        const { payload, nextState } = contract.onWhiff(
          {
            timestampMs: Date.now(),
            attackerId: fighter.id,
            defenderId: '',
            isHeavy: true,
            sequenceIndex: 0,
            distance: 0,
            attackerHPPercent: ((fighter as any).hp ?? (fighter as any).health ?? 100) / ((fighter as any).maxHp ?? (fighter as any).maxHealth ?? 100),
            defenderHPPercent: 1.0,
            attackerPosturePercent: ((fighter as any).posture ?? (fighter as any).postureHealth ?? 100) / ((fighter as any).maxPosture ?? 100),
            defenderPosturePercent: 1.0,
            wasCounterHit: false,
            wasParried: false,
            wasBlocked: false,
          },
          currentState
        );
        setFighterStyleState(fighter.id, meta.id, nextState);
        if (onEffectDispatched) onEffectDispatched(payload);
      },
    },

    dash: {
      getCooldownSec: () => contract.dash.cooldownSec,
      durationSec: contract.dash.durationSec,
      hasIFrames: contract.dash.hasIFrames,
    },

    block: {
      type: contract.block.blockType,
      maxParryWindowSec: contract.block.parryWindowSec,
    },

    passives: {
      onHitGiven: (attacker, defender, isHeavy, stage) => {
        const currentState = getFighterStyleState(attacker.id, contract);
        const { payload, nextState } = contract.onHitLanded(
          {
            timestampMs: Date.now(),
            attackerId: attacker.id,
            defenderId: defender.id,
            isHeavy,
            sequenceIndex: stage,
            distance: 0,
            attackerHPPercent: ((attacker as any).hp ?? (attacker as any).health ?? 100) / ((attacker as any).maxHp ?? (attacker as any).maxHealth ?? 100),
            defenderHPPercent: ((defender as any).hp ?? (defender as any).health ?? 100) / ((defender as any).maxHp ?? (defender as any).maxHealth ?? 100),
            attackerPosturePercent: ((attacker as any).posture ?? (attacker as any).postureHealth ?? 100) / ((attacker as any).maxPosture ?? 100),
            defenderPosturePercent: ((defender as any).posture ?? (defender as any).postureHealth ?? 100) / ((defender as any).maxPosture ?? 100),
            wasCounterHit: false,
            wasParried: false,
            wasBlocked: false,
          },
          currentState
        );
        setFighterStyleState(attacker.id, meta.id, nextState);
        if (onEffectDispatched) onEffectDispatched(payload);
      },

      onParrySuccess: (defender, attacker) => {
        const currentState = getFighterStyleState(defender.id, contract);
        const { payload, nextState } = contract.onParrySuccessful(
          {
            timestampMs: Date.now(),
            attackerId: attacker.id,
            defenderId: defender.id,
            isHeavy: false,
            sequenceIndex: 0,
            distance: 0,
            attackerHPPercent: ((attacker as any).hp ?? (attacker as any).health ?? 100) / ((attacker as any).maxHp ?? (attacker as any).maxHealth ?? 100),
            defenderHPPercent: ((defender as any).hp ?? (defender as any).health ?? 100) / ((defender as any).maxHp ?? (defender as any).maxHealth ?? 100),
            attackerPosturePercent: ((attacker as any).posture ?? (attacker as any).postureHealth ?? 100) / ((attacker as any).maxPosture ?? 100),
            defenderPosturePercent: ((defender as any).posture ?? (defender as any).postureHealth ?? 100) / ((defender as any).maxPosture ?? 100),
            wasCounterHit: false,
            wasParried: true,
            wasBlocked: false,
          },
          currentState
        );
        setFighterStyleState(defender.id, meta.id, nextState);
        if (onEffectDispatched) onEffectDispatched(payload);
      },

      tick: (fighter) => {
        if (contract.onTick) {
          const currentState = getFighterStyleState(fighter.id, contract);
          const { payload, nextState } = contract.onTick(fighter.id, currentState, 1 / 60);
          setFighterStyleState(fighter.id, meta.id, nextState);
          if (payload && onEffectDispatched) onEffectDispatched(payload);
        }
      },
    },
  };
}
