// ============================================================================
// 60 FPS FIXED-STEP ACCUMULATOR PIPELINE (src/combat/loop.ts)
// Section A & B: Modular Combat Engine & Plugin Architecture
// ============================================================================

export const FIXED_DELTA_TIME_SEC = 1 / 60; // 0.016666...
export const MAX_ACCUMULATOR_SEC = 0.1; // Safety clamp prevents spiral of death

export interface AccumulatorState {
  accumulator: number;
  lastTimeMs: number;
}

export function createAccumulator(): AccumulatorState {
  return {
    accumulator: 0,
    lastTimeMs: performance.now(),
  };
}

/**
 * Steps the fixed accumulator, executing the physics tick function exactly
 * as many times as accumulated frames, then returning the remaining interpolation alpha (0.0 to 1.0).
 */
export function stepAccumulator(
  state: AccumulatorState,
  currentTimeMs: number,
  tickCallback: (dt: number) => void
): number {
  const frameTimeSec = Math.min((currentTimeMs - state.lastTimeMs) / 1000, MAX_ACCUMULATOR_SEC);
  state.lastTimeMs = currentTimeMs;
  state.accumulator += frameTimeSec;

  while (state.accumulator >= FIXED_DELTA_TIME_SEC) {
    tickCallback(FIXED_DELTA_TIME_SEC);
    state.accumulator -= FIXED_DELTA_TIME_SEC;
  }

  return state.accumulator / FIXED_DELTA_TIME_SEC; // Interpolation alpha
}
