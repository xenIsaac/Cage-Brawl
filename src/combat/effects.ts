// ============================================================================
// DECLARATIVE COMBAT EFFECT SCHEMA (src/combat/effects.ts)
// Section B: Pure Sensory & Impact Payloads (Zero Direct Side Effects)
// ============================================================================

export type SoundEffectId =
  | 'punch'
  | 'heavy_impact'
  | 'kick'
  | 'whoosh'
  | 'block'
  | 'parry'
  | 'guard_break'
  | 'dash'
  | 'ko'
  | 'fight_shout'
  | 'capoeira_whoosh'
  | 'taekwondo_snap'
  | 'taekwondo_whirl'
  | 'none';

export type ParticleVFXType =
  | 'hit_spark'
  | 'heavy_blast'
  | 'block_sparks'
  | 'parry_flash'
  | 'dust_cloud'
  | 'speed_lines'
  | 'kinetic_shockwave'
  | 'flame_burst'
  | 'aura_burst';

export interface CameraShakePayload {
  intensity: number;      // Shake radius / magnitude in pixels
  durationFrames: number; // Duration of shake in 60fps frames
  decay?: number;         // Falloff per frame (default: 0.9)
}

export interface ParticlePayload {
  type: ParticleVFXType;
  x?: number;             // Optional override coordinate
  y?: number;
  count?: number;         // Number of particles emitted
  color?: string;         // Hex or rgba override
  scale?: number;         // Size scale multiplier
}

export interface SoundPayload {
  id: SoundEffectId;
  volumeMultiplier?: number;
  playbackRate?: number;
}

export interface StyleStatusEffect {
  type: 'bleed' | 'burn' | 'concussion' | 'slow' | 'hyper_focus' | 'parry_vulnerable';
  durationFrames: number;
  potency?: number;
  stackCount?: number;
}

/**
 * Declarative Combat Mutation Payload
 * Pure mathematical / sensory data returned by style event hooks.
 * The central combat loop validates and executes these payloads deterministically.
 */
export interface CombatMutationPayload {
  // Mechanical mutations
  damageMultiplier?: number;
  bonusFlatDamage?: number;
  chipDamageMultiplier?: number;
  postureRefund?: number;
  postureDamageBonus?: number;
  pushbackDelta?: number;
  staminaCostDelta?: number;
  hitstunDeltaSec?: number;
  applyStatus?: StyleStatusEffect;

  // Sensory mutations (Zero side-effects, purely declarative)
  sound?: SoundPayload | SoundEffectId;
  cameraShake?: CameraShakePayload | number; // Number shorthand = intensity (duration=10)
  particles?: ParticlePayload[];
  customBannerText?: string;
}

/**
 * Normalizes camera shake payload to standard format
 */
export function normalizeCameraShake(
  shake?: CameraShakePayload | number
): CameraShakePayload | null {
  if (!shake) return null;
  if (typeof shake === 'number') {
    return {
      intensity: shake,
      durationFrames: 10,
      decay: 0.88,
    };
  }
  return {
    intensity: shake.intensity,
    durationFrames: shake.durationFrames,
    decay: shake.decay ?? 0.88,
  };
}

/**
 * Normalizes sound payload to standard format
 */
export function normalizeSound(
  sound?: SoundPayload | SoundEffectId
): SoundPayload | null {
  if (!sound || sound === 'none') return null;
  if (typeof sound === 'string') {
    return { id: sound, volumeMultiplier: 1.0, playbackRate: 1.0 };
  }
  return {
    id: sound.id,
    volumeMultiplier: sound.volumeMultiplier ?? 1.0,
    playbackRate: sound.playbackRate ?? 1.0,
  };
}
