// ============================================================================
// UNIVERSAL HITBOX PIPELINE (src/combat/hitbox_pipeline.ts)
// Section A & B: Modular Combat Engine & Plugin Architecture
// ============================================================================

export interface HitboxFrameConfig {
  startupDelaySec: number; // Standard: 0.08s
  activeDurationSec: number; // Standard: 0.30s
  recoverySec: number;
}

export function isHitboxActive(
  elapsedSec: number,
  config: HitboxFrameConfig = { startupDelaySec: 0.08, activeDurationSec: 0.30, recoverySec: 0.20 }
): boolean {
  return elapsedSec >= config.startupDelaySec && elapsedSec <= (config.startupDelaySec + config.activeDurationSec);
}
