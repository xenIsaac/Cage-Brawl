# Phase 5: Target Rule Values Activation Manifest

## Summary
Phase 5 has been executed to activate the target v1.7.6 patch note rule values defined in `TARGET_RULES` across active gameplay modules.

## Activated Rules & Parameters
1. **Universal Perfect Parry Window**:
   - `PERFECT_PARRY_WINDOW_SEC`: Updated from `0.19s` to `0.12s` (120ms).
   - `PERFECT_PARRY_FRAMES`: Updated from `11 frames` to `7 frames` at 60fps.
   - **Muay Thai Iron Guard**: Total window updated from `0.39s` (23 frames) to `0.32s` (19 frames) with declared +0.20s / +12 frames bonus.

2. **Hitstun & Lockout Timings**:
   - `HITSTUN_DURATION_SEC` / `HITSTUN_M1_SEC`: Updated from `0.45s` to `0.40s` (24 frames).
   - `HITSTUN_M2_SEC` & `HITSTUN_BLOCK_SEC`: Activated at `0.30s` (18 frames).
   - `HIT_ATTACK_LOCKOUT_FRAMES`, `STEERING_LOCKOUT_FRAMES`, `HIT_MOVEMENT_LOCKOUT_FRAMES`: Updated to `24 frames`.

3. **Post-Parry & Guard Raise Timings**:
   - `POST_PARRY_ATTACKER_LOCKOUT_SEC`: `0.12s` (7 frames).
   - `POST_PARRY_DEFENDER_M1_LOCKOUT_SEC`: `0.10s` (6 frames).
   - `GUARD_RAISE_STARTUP_BASE_SEC`: `0.03s` (2 frames).
   - `GUARD_RAISE_STARTUP_SPAM_SEC`: `0.09s` (5 frames).
   - `MOVEMENT_SLOW_ON_HIT_PCT`: `60%` slow for `0.20s`.

## Verification Status
- **TypeScript Check (`tsc --noEmit`)**: ✅ Passed (0 errors)
- **Vitest Characterization Suite (`npm test`)**: ✅ 19 / 19 passed
- **Applet Compilation & Linting**: ✅ Succeeded cleanly
