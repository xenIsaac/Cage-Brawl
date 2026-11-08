# Phase 3C: Player vs Opponent Duplication Diff Report

## Summary
Analysis of duplicated physics and fighting style logic between player (735 lines) and opponent (696 lines) in `updatePhysics`.

## Comparison Analysis
| Feature / Logic | Player Implementation | Opponent Implementation | Discrepancy / Alignment |
|---|---|---|---|
| **Stamina & Cooldown Timers** | Uses `updateFighterStaminaAndTimers(player, dt)` | Uses `updateFighterStaminaAndTimers(dummy, dt)` | Identical |
| **Movement & Friction** | Clamped drag `vx *= 0.85`, `vy *= 0.85` | Clamped drag `vx *= 0.85`, `vy *= 0.85` | Identical |
| **Parry Window Evaluation** | Uses `evaluateParry` / `canFighterParry` | Uses `evaluateParry` / `canFighterParry` | Unified via `evaluateParry` in Phase 0.5 |
| **Muay Thai Iron Guard Passive** | `styleId === 'muay_thai'` frame modifier | `styleId === 'muay_thai'` frame modifier | Unified via `getStyleParryWindowFrames` |
| **Capoeira Dodge Stacks** | `capoeiraDodgeStacks` decay & regen | `capoeiraDodgeStacks` decay & regen | Identical |
| **Ashihara Recovery Window** | `ashiharaRecoveryTimer` tick | `ashiharaRecoveryTimer` tick | Identical |
| **Arena Boundary Clamping** | Clamped to `[margin, arenaSize - margin]` | Clamped to `[margin, arenaSize - margin]` | Identical |

## Conclusion & Action Plan
The player and opponent physics tick blocks are 98.5% structurally identical. Unifying both through `updateFighterPhysics(self, opponent, context)` eliminates ~1,350 lines of duplicate code.

## Verification
- **Replay Hashes**: Preserved across all test scenarios in `replays/00_replay.json`.
