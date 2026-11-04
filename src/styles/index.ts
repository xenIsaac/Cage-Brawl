// ============================================================================
// CENTRAL STYLE REGISTRY & DYNAMIC LOADER (src/styles/index.ts)
// Section B: Unified Style Registry with Strangler Fig Fallback & defineStyle()
// ============================================================================

import { StyleContract } from './types';
import { FightingStyleModule } from '../combat/styles/types';
import { adaptContractToLegacyModule, inspectFighterStyleState } from './bridge';
import { streetTaekwondoContract } from './street_tkd.style';

// Modern Contract Plugin Registry
export const CONTRACT_REGISTRY: Record<string, StyleContract<any>> = {
  street_taekwondo: streetTaekwondoContract,
};

/**
 * Check if a style is managed by the modern plugin engine
 */
export function hasModernContract(styleId: string): boolean {
  return !!CONTRACT_REGISTRY[styleId];
}

/**
 * Retrieve the modern StyleContract if registered
 */
export function getModernContract(styleId: string): StyleContract<any> | null {
  return CONTRACT_REGISTRY[styleId] || null;
}

/**
 * Register or hot-swap a modern Style Plugin at runtime
 */
export function registerModernContract(contract: StyleContract<any>): void {
  CONTRACT_REGISTRY[contract.metadata.id] = contract;
}

/**
 * Strangler Fig Resolver:
 * Returns the adapted FightingStyleModule if a modern plugin is registered,
 * or null to signal that the legacy fallback should execute.
 */
export function resolveModernStyleModule(
  styleId: string
): FightingStyleModule | null {
  const contract = CONTRACT_REGISTRY[styleId];
  if (!contract) return null;
  return adaptContractToLegacyModule(contract);
}

export * from './types';
export * from './defineStyle';
export * from './bridge';
export { streetTaekwondoContract };
