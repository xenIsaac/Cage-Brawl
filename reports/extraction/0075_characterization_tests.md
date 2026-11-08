# Phase 0.75: Characterization Tests Report

## Summary
Characterization tests have been implemented and executed using Vitest (`npm test`). 19 tests were created to lock in baseline gameplay behavior across parry windows, hitstun, lockouts, posture recovery, and target rules.

## Test Results
- **Test Runner**: Vitest v5.1.0
- **Total Tests**: 19 / 19 Passed
- **Test Suite Path**: `tests/rules.characterization.test.ts`

### Covered Rule Behaviors
1. **Universal Parry Windows**:
   - Standard parry window (0.19s / 11 frames @ 60fps)
   - Style-specific parry window (Muay Thai Iron Guard bonus: +0.20s / 12 frames, total 0.39s / 23 frames)
   - Evaluator accuracy for frame-based vs second-based checks.

2. **Hitstun & Lockout Timings**:
   - `HITSTUN_DURATION_SEC` (0.45s)
   - `HIT_ATTACK_LOCKOUT_FRAMES` (27 frames)
   - `POST_PARRY_COUNTER_FREEZE_SEC` (0.22s) & `POST_PARRY_DEFENDER_RECOVERY_SEC` (0.06s)

3. **Guard & Posture Rules**:
   - Guard raise eligibility under lockout/stun conditions
   - Net posture cooldown calculations (`calculateNetPostureCd`)

4. **Target Rules Spec Validation**:
   - Verification of `TARGET_RULES` definitions in `src/combat/rules.ts` for Phase 5 alignment.

## Status & Next Steps
Phase 0.75 is complete and verified. Moving directly to Phase 0.9 (Verification Bundle setup: metrics, function map, body hashes, and replay test infrastructure).
