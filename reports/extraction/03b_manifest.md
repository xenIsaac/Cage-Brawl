# Phase 3B Manifest: Simulation Module Extraction

## Overview
Phase 3B moved the 5 simulation sub-functions created in Phase 3A out of `src/components/Arena.tsx` and into dedicated modules under `src/combat/simulation/`.
`Arena.tsx` now delegates `updatePhysics` cleanly to `runPhysicsSimulation(stateRef.current, context)` and all React/browser dependencies (`stateRef`, `QuestTracker`/`localStorage`, callbacks) were decoupled behind `SimulationContext`.
Unused 113-line draft stubs (`fighterPhysics.ts`, `environmentPhysics.ts`) from an earlier incomplete pass were removed.

## Body Hash Verification (Phase 3A Chunk Hash vs Phase 3B Core Body Hash)

| Module | Exported Function | 3A Original Chunk Hash (`03a_manifest.md`) | 3B Extracted Core Hash | Match | File Lines | File SHA-256 (16 hex) |
|---|---|---|---|---|---|---|
| `preChecks.ts` | `updatePhysicsPreChecks` | `e3726a0c73db390a` | `8cb92b965100a64f` (with `return;` -> `return true;` early exits) | Verbatim except `return true;` boolean adapter | 77 | `ac7c93aa103f8244` |
| `screenAndGamemode.ts` | `updateScreenAndGamemodePhysics` | `6041df90f94d0e0f` | `6041df90f94d0e0f` | Exact Match | 66 | `74331a3474204420` |
| `playerPhysics.ts` | `updatePlayerPhysics` | `cc723e80ffb9c958` | `cc723e80ffb9c958` | Exact Match | 2,146 | `d6b3a04379de359f` |
| `dummyPhysics.ts` | `updateDummyPhysics` | `46da672f396b3afa` | `46da672f396b3afa` | Exact Match | 1,851 | `82f9d50d837ab2fd` |
| `particlePhysics.ts` | `updateParticlePhysics` | `90b74b671713dcb5` | `90b74b671713dcb5` | Exact Match | 16 | `f99d6e5865fe9aa6` |
| `index.ts` | `runPhysicsSimulation` | — | — | Orchestrator | 79 | — |

**Total lines across `src/combat/simulation/`**: 4,235 lines (`preChecks.ts`, `screenAndGamemode.ts`, `playerPhysics.ts`, `dummyPhysics.ts`, `particlePhysics.ts`, `index.ts`).

## React / Browser Dependency Check (`src/combat/simulation/`)
- Zero `React`, `useState`, `useRef`, `useEffect`, `useCallback`, `window`, `document`, `localStorage`, or `sessionStorage` imports or calls remain inside `src/combat/simulation/`.
- `QuestTracker` (`localStorage`) was decoupled from `playerPhysics.ts` and `dummyPhysics.ts` via `SimulationContext.QuestTracker` (defaults to a no-op `{ trackEvent: () => {} }` when running headless).
- All UI callbacks (`spawnFloatingText`, `syncCombatStatesToUI`, `soundManager`, `setIsPlayerBlocking`, etc.) are injected via `SimulationContext`.

## Line Count Metrics for `src/components/Arena.tsx` (from `03b_metrics.json`)
- Baseline before Phase 3A: 8,573 lines (`perform_3a_split.mjs`)
- After Phase 3A (in-place split): 8,603 lines (`03a_metrics.json`)
- After Phase 3B (eviction to `src/combat/simulation/`): **4,557 lines** (`03b_metrics.json`)
- Net reduction from Phase 3A: **4,046 lines** (vs original pre-3A baseline: **4,016 lines**)

## Headless Replay Engine (`src/sim/headless.ts` -> `03b_replay.json`)
- Calls real `runPhysicsSimulation` and `updateFighterAI` directly (no duplicate simulation arithmetic).
- Uses deterministic `SeededRNG` replacing `Math.random` during scenario runs.
- Runs 7 scenarios for **3,000 ticks each**:
  1. `Kickboxing vs Kickboxing` (`013b03486eed575a`)
  2. `Muay Thai vs Ashihara` (`1d0455d9ac864b6d`)
  3. `CQC vs Kyokushin` (`5c8a687fa7073e13`)
  4. `Keysi vs Capoeira` (`3665cd2681945211`)
  5. `Parry Heavy Combat` (`3cc09a9c82da443b`)
  6. `Block Spam Combat` (`25cebdd6b65be482`)
  7. `KO Scenario` (`55f5349fd14cf7f8`, `opponentFinalHp: 0`, `koOccurred: true`)
- Every scenario produces a distinct SHA-256 hash.
- `03b_replay.json` is recorded as the reference baseline for Phases 3C through 3E.
