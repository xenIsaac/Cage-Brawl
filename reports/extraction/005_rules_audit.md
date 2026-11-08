# Rules Audit & Single Source of Truth Report (Phase 0.5)

Date: 2026-11-08  
Module: `src/combat/rules.ts`

---

## 1. Universal Combat Rules & Parameter Comparison

| Rule Parameter | Current Value in Code | Patch Notes Target (v1.7.6) | Previous File Locations | Status in Phase 0.5 |
| :--- | :--- | :--- | :--- | :--- |
| **Perfect Parry Base Window (Sec)** | `0.19s` (190ms) | `0.12s` | `combatEngine.ts`, `parry.ts`, `hitResolution.ts` | Consolidated to `PERFECT_PARRY_WINDOW_SEC` in `rules.ts` |
| **Perfect Parry Base Window (Frames)** | `11 frames` (~0.183s at 60fps) | `7 frames` (~0.12s at 60fps) | Inline `Arena.tsx` (lines 4778, 6737) | Consolidated to `PERFECT_PARRY_FRAMES` in `rules.ts` |
| **Muay Thai Iron Guard Bonus** | `+0.20s` / `+12 frames` | Unlisted in notes (Kept as passive) | Inline `Arena.tsx`, `hitResolution.ts` | Declared in `combat/styles/muayThai.ts` (`parryWindowBonusSec: 0.20`) |
| **Hit-Stun Duration** | `0.45s` (27 frames) | M1 `0.40s`, M2 `0.30s`, Block `0.30s` | `combatEngine.ts` | Exported from `rules.ts` |
| **Attack Lockout on Hit** | `27 frames` (0.45s) | M1 `0.40s`, M2 `0.30s` | `combatEngine.ts` | Exported from `rules.ts` |
| **Hit-Stun Steering Lockout** | `27 frames` (0.45s) | N/A | `combatEngine.ts` | Exported from `rules.ts` |
| **Hit-Stun Movement Lockout** | `27 frames` (0.45s) | N/A | `combatEngine.ts` | Exported from `rules.ts` |
| **Block Cooldown** | `6 frames` (0.10s) | `0.20s` (after 0.3s spam) | `combatEngine.ts` | Exported from `rules.ts` |
| **Post-M1 Block Lockout** | `9 frames` (0.15s) | N/A | `combatEngine.ts` | Exported from `rules.ts` |
| **Post-Block Attack Delay** | `6 frames` (0.10s) | N/A | `combatEngine.ts` | Exported from `rules.ts` |
| **Post-Dash Attack Lockout** | `18 frames` (0.30s) | N/A | `combatEngine.ts` | Exported from `rules.ts` |
| **Dash Hit Delayed Stop** | `6 frames` (0.10s) | N/A | `combatEngine.ts` | Exported from `rules.ts` |
| **Base Steering Turn Rate** | `0.18` rad/frame | N/A | `combatEngine.ts` | Exported from `rules.ts` |
| **Base Movement Speed** | `2.3` px/frame | N/A | `combatEngine.ts` | Exported from `rules.ts` |
| **Base Combo Reset Timer** | `120 frames` (2.0s) | N/A | `combatEngine.ts` | Exported from `rules.ts` |

---

## 2. Parry Window Unit Audit & Runtime Precedence

### Discrepancy Identified:
- **Frame-based inline checks** (`Arena.tsx` lines 4778, 6737):
  `maxParryFrames = target.styleId === 'muay_thai' ? 23 : 11`
  - Base: 11 frames = $11 / 60 \approx 0.1833\text{s}$.
  - Muay Thai Iron Guard: 23 frames = $23 / 60 \approx 0.3833\text{s}$.
- **Second-based checks** (`hitResolution.ts` line 642 & `Arena.tsx` lines 4904, 6869):
  `maxParryWindow = defender.styleId === 'muay_thai' ? (PERFECT_PARRY_WINDOW_SEC + 0.20) : PERFECT_PARRY_WINDOW_SEC`
  - Base: $0.1900\text{s}$.
  - Muay Thai Iron Guard: $0.19 + 0.20 = 0.3900\text{s}$.

### Runtime Execution Analysis:
- `Arena.tsx` collision detection runs first during spatial contact loops to trigger visual parry flash states (`parryFlashTime = 18`) and grace timers.
- `hitResolution.ts` executes inside `applyFighterHit` to calculate zero-damage cancellation and parry counter-attacks.
- **Resolution**: Unified under `evaluateParry(defender, attacker, isBlocked, blockTime, options)` in `src/combat/parry.ts`.
  - Reads `PERFECT_PARRY_WINDOW_SEC` (0.19s) or `PERFECT_PARRY_FRAMES` (11 frames) from `rules.ts`.
  - Queries `muayThaiStyle.block.parryWindowBonusSec` (0.20s / 12 frames) dynamically from the style module.
  - Replaces all 4 inline `Arena.tsx` checks and the `hitResolution.ts` check with identical runtime results.

---

## 3. Style-Specific Rule Modification Audit (`styleId ===` Branches)

| Style ID | Rule Modified | Description & Logic | Location / Handling |
| :--- | :--- | :--- | :--- |
| `muay_thai` | Parry Window | Extends parry window (+0.20s / +12 frames) via Iron Guard passive | Moved to `muayThaiStyle.block.parryWindowBonusSec` |
| `muay_thai` | Heavy Windup | Breach Pressure passive: 0.10s heavy windup if defender is blocking | Declared in `muayThaiStyle.heavyAttack.getWindupSec` |
| `ashihara` | Parry Reaction | M2 counter-parry stage & recovery lockout | Declared in `ashiharaStyle` state & passive hooks |
| `keysi` | Parry Stun / Lockout | Modified parry stun duration (42 frames vs 48 standard) | Handled in `keysiStyle` |
| `capoeira` | Block / Dodges | Capoeira Ginga rhythm dodge / block exhaustion | Declared in `capoeiraStyle` block & passive module |
| `cqc` | M2 Unparryable | CQC Assault M2 is unparryable | Evaluated in `canFighterParry` helper |
| `basic` | S3 Parry Bait | Flow Boxing S3 feint parry-bait state | Evaluated in `canFighterParry` helper |
| `street_boxing` | Flurry Unparryable | Street Boxing flurry is unparryable | Evaluated in `canFighterParry` helper |
