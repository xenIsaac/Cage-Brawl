# Phase 3A: In-Place Split of `updatePhysics` Manifest

## 1. Objective
Split the monolithic ~4,050 line `updatePhysics` function inside `src/components/Arena.tsx` into 5 discrete, named sub-functions in place, with zero behavioral or logic changes.

---

## 2. Sub-Function Mapping & Body Hashes

| Sub-Function Name | Original Line Range | Original Chunk Hash | In-Place Function Hash | In-Place Lines | Responsibilities |
|---|---|---|---|---|---|
| `updatePhysicsPreChecks` | 3584–3645 | `e3726a0c73db390a` | `6d7103a6ec2ec8f2` | 70 | Non-fighting round resets, infinite stamina reset, test_ai dummy freeze, impact frame sequence, hitstop decrement. |
| `updateScreenAndGamemodePhysics` | 3647–3700 | `6041df90f94d0e0f` | `25552345b50eb3ee` | 58 | Screen shake decay, vision blur decay, shaky vision timer decay, hot potato gamemode countdown and explosion. |
| `updatePlayerPhysics` | 3701–5797 | `cc723e80ffb9c958` | `59c4c2ff91820150` | 2,105 | Player stamina, movement, dash, style-specific state machines (Street Boxing, Ashihara, CQC, Keysi, Kyokushin, etc.), IK/fist updates. |
| `updateDummyPhysics` | 5799–7609 | `46da672f396b3afa` | `bb23a2d1da3f3fe7` | 1,819 | Opponent/dummy AI movement, attacks, windups, parry timers, and style mechanics. |
| `updateParticlePhysics` | 7611–7622 | `90b74b671713dcb5` | `c9dceecc05937379` | 17 | Particle lifetime increment, velocity movement, alpha calculation, dead particle filtering, and 120-pool clamp. |
| `updatePhysics` (Orchestrator) | 3578–7623 | `261205d2c4400d76` | `6880b89cd111c2ff` | 42 | Ticks `updatePhysicsPreChecks` (early exit on hitstop/pause), followed sequentially by screen, player, dummy, and particle updates. |

---

## 3. Verification & Metrics

- **Arena.tsx Line Count**: 8,603 lines (increased by 30 lines due to sub-function signatures and headers)
- **TypeScript Check**: `03a_tsc.txt` (0 errors)
- **Vite Build**: `03a_build.txt` (Build succeeded)
- **Vitest Characterization Tests**: `03a_tests.txt` (19 / 19 passed)
- **Metrics Snapshot**: `03a_metrics.json`
- **Replay Snapshot**: `03a_replay.json`
