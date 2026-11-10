# Phase 3C: Exhaustive Line-by-Line Diff (`playerPhysics.ts` vs `dummyPhysics.ts`)

**Status:** COMPLETE — Waiting for review before Step 3D (`updateFighter`) and Step 3E (`combat/styles/<id>/state.ts`).

## 1. Measurement Methodology & File Baseline
- **Player file:** `src/combat/simulation/playerPhysics.ts` — **2,146 lines** (`wc -l`: 2,145 newlines; 103,611 bytes)
- **Opponent file:** `src/combat/simulation/dummyPhysics.ts` — **1,851 lines** (`wc -l`: 1,850 newlines; 85,944 bytes)
- **Line-count delta:** `+295` lines in `playerPhysics.ts` (`~1,600+` shared lines across timer decay, heavy windup, block drop, Aikido slam, Capoeira stacks, Ashihara M2, CQC M2, Keysi Clinch & Dash Intercept, Armor regen, Dash decay, Fist animation/retraction, and Kyokushin lock).
- **Method:** Normalized `player` -> `SELF`, `dummy` -> `OTHER`, and local prefix variables (`pMods`/`dMods`, `pLeft`/`dLeft`, etc.) and ran `diff -u` across the entire files:
  - **53 total unified diff hunks** (`1,451` raw diff lines)
  - **46 non-comment functional/cosmetic diff hunks**
- **Cross-check scope:** Inspected `src/combat/ai.ts`, `src/combat/attackTriggers.ts`, `src/combat/hitResolution.ts`, `src/combat/combatEngine.ts`, and `src/components/Arena.tsx` to separate genuine physics bugs/asymmetries from behavior intentionally delegated to `ai.ts`.

> All line numbers below follow the exact 1-indexed line numbering in `src/combat/simulation/playerPhysics.ts` (**P**) and `src/combat/simulation/dummyPhysics.ts` (**D**).

---

## 2. Category A — Genuine Bugs, Omissions, & Behavioral Asymmetries

These differences represent real divergence in combat rules or state hygiene between `SELF = player` and `SELF = dummy`, unrelated to human vs. AI input handling.

| # | Bug / Asymmetry | `playerPhysics.ts` (P) | `dummyPhysics.ts` (D) | Impact & Merge Resolution |
|---|---|---|---|---|
| **A1** | **`afterParryGraceTimer` never decrements on Player** | **Absent** (only written as `target` at P:1252, P:1130; read in `attackTriggers.ts:91,104,530` & `Arena.tsx:4134`) | **D:126–128** decrements `dummy.afterParryGraceTimer--` | **CRITICAL:** Once Player lands one parry, `player.afterParryGraceTimer = 90` stays `90` until round reset (permanently bypasses post-block attack delay). Dummy decays properly over 1.5s. In 3D: decrement `self.afterParryGraceTimer--` for both fighters. |
| **A2** | **Street Boxing M2 `baseReturnSpeed` 9.3x slower on Dummy** | **P:1860** `baseReturnSpeed = 0.12;` | **D:1567** `baseReturnSpeed = (1.0 / 66) * 0.85;` (`~0.01288`) | **CRITICAL:** Identical style moves (`street_boxing` M2 flurry) retract ~9.3x slower on dummy than player, drastically changing vulnerability windows. Review required in 3D/Phase 5 to confirm intended canonical value (`0.12` vs `(1/66)*0.85`). |
| **A3** | **`armorBreakTime` not decremented in `dummyPhysics.ts`** | **P:69–73** decrements `player.armorBreakTime--` & forces `player.isBlocking = false` | **Absent** in D (delegated to `ai.ts:694–698`, skipped during `freezeAI` at `ai.ts:634`) | Under `freezeAI` or non-AI dummy test modes, `dummy.armorBreakTime` never recovers. Move `armorBreakTime` decay into unified `updateFighter`. |
| **A4** | **Idle Friction & Unconditional Friction Divergence (`0.82` vs `0.88`)** | **P:1732–1737** Only runs in `else` (no WASD input): `0.94` if `(kyokushinSpinOutTimer > 0 \|\| stunTime > 0)` else `0.82` (note: moving uses `0.88` at P:1730) | **D:1500–1509** Unconditional every tick after `x += vx`: `0.94` if `(kyokushinSpinOutTimer > 0 \|\| stunTime > 0 \|\| parriedStun > 0 \|\| hitMovementLock > 0)` else `0.88` | **REAL PHYSICS DIFF:** Player slides less when idle (`0.82` vs `0.88`) and does NOT get `0.94` knockback slide during `parriedStun` or `hitMovementLock`; Dummy also applies `0.88` friction on top of `ai.ts` velocity every tick (plus double-applies `0.82` * `0.88` when idle in AI). Preserve exact parity or flag for Phase 5 tuning. |
| **A5** | **Kyokushin guard-hit counter `kyokushinBlockHitsTaken` never reset on Dummy guard drop** | **P:215** clears `player.kyokushinBlockHitsTaken = 0;` on block release | **Absent** in D (`D:135–148` guard drop does not clear `kyokushinBlockHitsTaken`; not cleared in `ai.ts` either) | Against Kyokushin, if dummy releases guard after 3 blocked hits and blocks again later, its counter stays at 3 instead of resetting to 0 (`hitResolution.ts:1569`). Clear in unified `wasBlocking && !isBlocking` transition. |
| **A6** | **`aikiManualM2UsedInSequence` not reset on `comboResetTimer === 0` for Dummy** | **P:513** resets `player.aikiManualM2UsedInSequence = false;` inside `comboResetTimer === 0` | **Absent** at **D:1423–1432** (only reset on S1 trigger at `ai.ts:351`) | If dummy uses manual Aikido M2, lets combo timer expire without triggering S1, and attacks later, flag state can desync unless S1 explicitly resets it. |
| **A7** | **Aikido debuffs (`aikiTenkanOffBalanceTimer`, `aikiKoteGaeshiTrapTimer`, `aikiLockoutTimer`, `aikiSpinDownTimer`, `aikiShakyVisionTimer`) & Dummy stamina coupled to Player alive check** | **P:439–469** decrements those 5 Aikido timers for BOTH `dummy` (P:440–454) and `player` (P:455–469); **P:1664–1667** ticks `updateFighterStaminaAndTimers(dummy, ...)` | **Absent** in D (zero Aikido debuff timer decrements; zero `updateFighterStaminaAndTimers` call) | If `player.isDead` (e.g. multi-fighter or post-KO simulation tick), dummy stops decaying Aikido debuffs and stops updating stamina. In 3D, each fighter owns its own 5 Aikido timers and its own `updateFighterStaminaAndTimers` call. |
| **A8** | **Dummy `freezeAI`, velocity debuff clamps, and missing speed penalties (`sluggerM2WhiffLockoutTimer`, `keysiVulnerableTimer`, `keysiStaggerTimer`)** | **P:1683–1689** applies `sluggerM2WhiffLockoutTimer` (0.20x), `aikiM2ActiveWindow` (0.10x), `aikiWhiffSlowTimer` (0.30x), `concussTime` (0.40x), `crippleTime` (0.85x), `keysiVulnerableTimer` (0.40x), `keysiStaggerTimer` (0.70x) to `speedMult` & `force` | **D:1495–1498** zeroes `vx`/`vy` under `state.freezeAI`; **D:1511–1536** clamps speed directly for `concussTime` (0.40x), `aikiM2ActiveWindow` (0.10x), and `aikiWhiffSlowTimer` (0.30x) | `sluggerM2WhiffLockoutTimer`, `keysiVulnerableTimer`, and `keysiStaggerTimer` velocity slows never apply to dummy in either `dummyPhysics.ts` or `ai.ts` (`crippleTime` is in `ai.ts:1292`). |
| **A9** | **CQC Windup Facing Lock timing (`D:506–512` vs `P:1599–1614`)** | Facing locked to target during steering block at **P:1606–1614** (AFTER CQC logic runs at P:654) | **D:506–512** snaps `dummy.facingAngle` & `cqcLockedAngle` at the TOP of the CQC block (BEFORE CQC windup/dash/assault logic) | During `windup`/`dash`, dummy's `facingAngle` updates before ring/dash logic runs, whereas player's updates later in the frame. |
| **A10** | **CQC Windup Expiry Cleanup Missing in Dummy** | **P:692–695** resets `player.cqcM2Stage = null; player.cqcRings = undefined;` if `heavyWindup <= 0 && cqcM2Stage === 'windup'` | **Absent** after **D:548** | If CQC windup reaches `0` without transitioning stage (e.g., interrupted), dummy's `cqcRings` overlay can linger. |
| **A11** | **CQC Assault Fist Visuals Missing in Player; Cleanup Inverse Bugs on Abort & Finish** | **Absent** in **P:892–1213** (no fist swing animation during Assault Hits 1–5; **P:1220** DOES clear `cqcLockedAngle = undefined` on abort, does NOT clear `fists` on finish/abort) | **D:748–754, 868–874, 960–966** animate `dummy.fists` on Hits 1–5; **D:1056–1061 & 1076–1081** reset `fists`; **D:1068–1070 OMITS `dummy.cqcLockedAngle = undefined`** on abort | Player fists hang idle visually during CQC 5-hit barrage while dummy alternates punches; on target death/abort, dummy leaks `cqcLockedAngle`. |
| **A12** | **CQC Hit 5 Perfect Parry Extra Defender Resets on Dummy-Attack vs Player-Attack** | **P:1127–1135** resets `damageFlashTime`, `parryFlashTime`, `parryBlockGraceTimer`, `afterParryGraceTimer`, `postBlockAttackLockout`, `strikeCooldown`, `vx`, `vy` | **D:976–988** ALSO resets **`target.blockLockout = 0; target.parryLockoutTimer = 0; target.blockTimer = 0; target.blockUseCount = 0;`** | Player parrying Dummy's CQC Hit 5 immediately gets `blockLockout`, `parryLockoutTimer`, `blockTimer`, and `blockUseCount` wiped clean; Dummy parrying Player's CQC Hit 5 does NOT! |
| **A13** | **Shotokan `shotokanRenZukiPending` Direct Fist Mutation vs Full Trigger Pipeline** | **P:1772–1777** invokes `triggerPlayerLightAttack()` (enforces stamina cost, posture cooldown, `comboResetTimer`, audio/UI sync) | **D:1437–1447** mutates `leftFist` directly (`comboStage = 2`, `lightCooldown`), **bypassing stamina drain, posture CD, and `comboResetTimer`** | Dummy's Ren-Zuki chain strike is free of stamina/posture buildup compared to player. |
| **A14** | **Pendulum Dash (`styleId === 'basic'`) Facing Gate & Striker Buff Text** | **P:1516** locks facing to opponent only if `(settings.cameraMode === 'lockon_swipe' \|\| isMobileActive)`; **P:1541** spawns `'STRIKER BUFF (+10%)'` text | **D:1356** unconditionally locks facing to `player`; **D:1380** sets `flowStrikerBuffTimer = 18` with **no floating text** | In mouse free-aim mode, Player does not auto-face opponent during Pendulum Dash; Dummy always auto-faces. |
| **A15** | **Kickboxing Auto-Sequence 2 Floating Text & Dead Variable** | **P:530–547** no `pMods`, no floating text | **D:387** creates unused `const dMods = getHeightModifiers(dummy.baseHeight);`; **D:404** spawns `'RAPID CHAMBER...'` floating text | Minor visual/dead-code asymmetry. |
| **A16** | **Truthy Guard on `damageFlashTime`** | **P:149** `if (player.damageFlashTime > 0)` | **D:78** `if (dummy.damageFlashTime && dummy.damageFlashTime > 0)` | Defensive null-safety difference (`D:78` is safer if uninitialized). |
| **A17** | **Double Armor Regen Risk on Dummy (Interaction with `ai.ts`)** | **P:1456–1475** regens `+1` Armor HP per height-scaled interval (0.4s–0.8s) | **D:1301–1320** regens identical `+1` Armor HP AND `ai.ts:1330–1332` ALSO adds `+0.35` AP every 10 frames (`+2.1 AP/s`)! | Dummy actually regenerates Armor HP faster than player due to `ai.ts` stacking on top of `dummyPhysics.ts`. |

---

## 3. Category B — Intentional Player / Input / UI / Gamemode / Mode-Flag Splits

These blocks represent genuine differences between a human-controlled fighter (`isPlayer === true`) and an AI-controlled opponent (`isPlayer === false`), which should be parameterized cleanly via capability flags or callbacks on `FighterRuntimeContext` in Step 3D rather than duplicated in two monolithic files.

| # | Concern | `playerPhysics.ts` (P) | `dummyPhysics.ts` (D) | 3D Unification Plan |
|---|---|---|---|---|
| **B1** | **Context & Metrics Refs** | **P:29–42** destructures `isTouchDevice`, `triggerPlayerLightAttack`, `executePlayerHeavyAttack`, `setIsPlayerBlocking`, `setTotalDamageDealt`, `setTotalHitsLanded`, `matchTotalFramesRef`, `matchForwardFramesRef`, `matchPostureBreaksRef`, `playerMinPosturePctRef` | **D:28** destructures `executeDummyHeavyAttack` | Unify via `executeHeavyAttack: () => void`, optional human-metrics recorder hooks (`onDamageDealt`, `onBlockChange`), and shared `parryTracker`. |
| **B2** | **Ranked Evaluation Matrix Frame Sampling** | **P:50–67** accumulates `matchTotalFramesRef`, `matchForwardFramesRef`, `matchPostureBreaksRef`, `playerMinPosturePctRef` during `state.rankedState === 'fighting'` | **Absent** in D | Keep as optional `recordPlayerEvaluationFrame(self, other, state)` callback only when `self.isPlayer`. |
| **B3** | **Defensive Input Buffering & Block-Cancel Feints** | **P:181–221** reads `state.isBlockInputHeld \|\| state.keysPressed?.['KeyF'] \|\| player.isBlockInputHeld`; checks `canFighterRaiseGuard(player)`; cancels M1 (`FEINT / CANCEL`) or M2 (`M2 FEINT / CANCELLED` + `applyHeavyWhiffPenalty`); raises/drops block + calls `setIsPlayerBlocking` | **Absent** in D (`ai.ts` drives `dummy.isBlocking`; D:135–148 only detects `wasBlocking && !isBlocking` transition; **P:171** also calls `setIsPlayerBlocking(false)` inside `blockLockout`) | Extract into `processPlayerBlockInput(self, state, callbacks)` invoked only when `callbacks.hasHumanBlockInput` (`!isAiControlled`). |
| **B4** | **Movement Input, Camera-Relative Transform, Steering & Acceleration** | **P:1478, 1549–1737** computes `isMobileActive`, reads WASD/Arrows/joystick, applies `isLockedFromMoving`, transforms lockon WASD (`P:1590–1596`), locks facing for Keysi/CQC/LockOn/Mobile/Spectator/Mouse (`P:1599–1655`), computes movement vector, trauma stagger drift (`P:1710–1717`), force, speed cap (`P:1673–1731`) | **Handled externally in `src/combat/ai.ts`**; D runs only `x += vx`, `freezeAI` stop, friction, and post-clamp (`D:1492–1536`) | Separate movement decision/acceleration (`applyPlayerMovementAndSteering`) from shared post-integration physics (`applyPostMovePhysics` with unified friction/bounds). |
| **B5** | **Hold-LMB Continuous M1 Attack Buffer** | **P:1778–1787** triggers `triggerPlayerLightAttack()` when `state.isLMBHeld` & unlocked (`shellRetractionHoldTimer` check) | **Absent** in D | Gate behind `if (state.isLMBHeld && callbacks.onLightAttack && ...)` for human input only. |
| **B6** | **TKD Double-Tap Queued by Holding LMB** | **P:1992** `if (player.tkdDoubleTapQueued \|\| state.isLMBHeld)` | **D:1699** `if (dummy.tkdDoubleTapQueued)` | Check `self.tkdDoubleTapQueued \|\| (callbacks.isPrimaryAttackHeld?.() ?? false)`. |
| **B7** | **TKD Confusion Camera Blur Effect** | **P:1815–1818** sets `stateRef.current.visionBlurTime = 12` every 45 frames while `tkdConfusionTimer > 0` | **D:1473–1475** decrements `tkdConfusionTimer` only (no screen blur) | Trigger screen blur only when `self.isPlayer` (`if (self.isPlayer && self.tkdConfusionTimer % 45 === 0)`). |
| **B8** | **UI Telemetry Counters (`totalDamageDealt`, `totalHitsLanded`)** | Incremented on **CQC Assault Hits 1–4** (`P:924–927, 971–974, 1037–1040, 1061–1064`), **CQC Hit 5** (`P:1181–1184`), and **Keysi Headbutt** (`P:1353–1356`) | **Absent** in D (dummy damage to player does not count toward player's `totalDamageDealt`) | Emit via `callbacks.onHitDealt?.(dmg)` when `self.isPlayer`. |
| **B9** | **`test_ai` Target Invulnerability Guard** | **P:998–1003, 1088–1093, 1191–1196** (CQC Hits 1–5) & **P:1378–1383** (Keysi Headbutt): heals `target` to `maxHealth` if `!target.isPlayer && dummyBehavior === 'test_ai'` | **Absent** in D (`target` is player, so `!target.isPlayer` wouldn't fire; AI check wouldn't hurt if shared!) | Safe to run universally: `if (!target.isPlayer && dummyBehavior === 'test_ai')` works identically inside unified `updateFighter`. |

*(Note: Both files ALREADY identically guard `target.isPlayer` for `shakyVisionTimer` at P:366 / D:242, `godMode`/`oneHitKO` at P:906,951,1024,1045,1152,1333 / D:768,808,879,895,1005,1187, and `QuestTracker`/parry counters at P:1138 / D:991.)*

---

## 4. Category C — Structural Execution Order Differences

Even when identical code runs in both files, five timer/state blocks appear in a different vertical order within the function body, shifting intra-tick ordering relative to nearby checks:

1. **Ashihara Recovery & Parry Lockouts:**
   - **P:138–146** (runs **after** heavy windup tick at `P:110–136`)
   - **D:41–49** (runs **before** heavy windup tick at `D:52–76`)
2. **Block Duration (`blockTimer`), SpinOut (`spinOutTimer` / `kyokushinSpinOutTimer`), Aikido Knockback (`aikiCentrifugalKnockbackTimer`), Kyokushin Freeze (`kyokushinM2FreezeTimer`), & Parry Flash (`parryFlashTime`):**
   - **P:75–107** (runs **before** heavy windup and **before** `wasBlocking` transition at `P:248`)
   - **D:349–381** (runs **after** Capoeira regen at `D:316–347` — meaning in **D:138**, `wasBlocking && !isBlocking` reads **previous tick's** `parryFlashTime` & `kyokushinSpinOutTimer` BEFORE D:356–381 decrements them, whereas in **P:251** `wasBlocking && !isBlocking` reads **already-decremented** values from P:82–107!)
3. **`blockUseResetTimer`:**
   - **P:174–179** (immediately after `blockLockout`, BEFORE block input buffering `P:182` and BEFORE `wasBlocking` `P:248`)
   - **D:129–134** (immediately after `afterParryGraceTimer`, right BEFORE `wasBlocking` `D:135`)
4. **Kickboxing Seq 2 Window (`kickboxingSeq2Window`):**
   - **P:269–278** (runs before Aikido & Capoeira updates)
   - **D:1482–1490** (runs at the bottom of timer decay after `tkdLeadStaggerTimer`, right before `dummy.x += dummy.vx`)
5. **Combo Reset (`comboResetTimer`) & Shell S4 Return Timer (`shellS4ReturnTimer`):**
   - **P:506–525** (runs right after Capoeira at `P:472–503` and **before** Knockdown/Styles/Fist loops — also calls `syncCombatStatesToUI()` at `P:519`)
   - **D:1421–1436** (runs right after `postureCd` at `D:1403–1420` — omits `syncCombatStatesToUI()` and `aikiManualM2UsedInSequence = false`)

---

## 5. Category D — Cosmetic Identifier & Comment Differences (Zero Behavioral Effect)

### Particle ID Prefixes (`9` particle emitters)
| Emitter | `playerPhysics.ts` ID Prefix | Line | `dummyPhysics.ts` ID Prefix | Line |
|---|---|---|---|---|
| Ashihara S3 Sparks | `ashihara_s3_` | P:624 | `ashihara_s3_dummy_` | D:475 |
| CQC Dash Trail | `cqc_dash_p_` | P:784 | `cqc_dash_d_` | D:638 |
| CQC Blocked Sparks | `cqc_blk_spk_` | P:934 | `cqc_blk_spk_d_` | D:791 |
| CQC Assault Sparks | `cqc_assault_spk_` | P:981, 1071 | `cqc_assault_spk_d_` | D:833, 916 |
| Keysi Headbutt Sparks | `keysi_headbutt_` | P:1364 | `keysi_headbutt_d_` | D:1214 |
| Keysi Far Dash Intercept | `keysi_dash_col_` | P:1418 | `keysi_dash_col_d_` | D:1263 |
| Keysi Close Dash Slip | `keysi_dash_col_close_` | P:1438 | `keysi_dash_col_d_close_` | D:1283 |
| Dash Ghost Afterimage | `player_dash_ghost_` | P:1490 | `dummy_dash_ghost_` | D:1332 |
| TKD M2 Chop Trail | `tkd_m2_trail_` | P:1973 | `dummy_tkd_m2_trail_` | D:1680 |

### Local Variable Naming Differences
- **Aikido S2 curl variables:** `pLeftFist`, `pRightFist`, `pLeftProg`, `pRightProg`, `pStage`, `pTargetCurl`, `pCurrentCurl`, `pCurlSpeed` (**P:309–321**) vs `dLeftFist`, `dRightFist`, `dLeftProg`, `dRightProg`, `dStage`, `dTargetCurl`, `dCurrentCurl`, `dCurlSpeed` (**D:185–197**).
- **Capoeira stack cache:** `playerStacks` (**P:473–500**) vs `dummyStacks` (**D:317–344**).
- **Modifier / friction locals:** `pMods`/`playerMods` (**P:122, 598, 888, 1329, 1677, 1843**), `playerFriction` (**P:1734**) vs `dMods`/`dummyMods` (**D:62, 387, 742, 1183, 1444, 1550**), `dummyFriction` (**D:1507**).
- **Minor inline comment phrasing:** e.g. `// Standardized Execution Speed` vs `// Standardized Kyokushin Baseline Execution Speed`, `// bounce`, `// 0.30s Post-Dash Attack Lockout`.

---

## 6. Recommended Step 3D Unification Plan (Pending Review)

To achieve zero regression against `03b_replay.json` during Step 3D (`updateFighter(self, other, state, dt, context)`):
1. **Unify Pure Timer & Style State Machines:** All shared timers (`armorBreakTime`, `afterParryGraceTimer`, `parryFlashTime`, `heavyWindup`, `ashiharaM2Stage`, `cqcM2Stage`, `keysiClinchStage`, `capoeiraDodgeStacks`, `aikido`, `street_boxing`, `kickboxing`, `kyokushin`, `fists`) run identically for both `self` and `other`.
2. **Decide Before/During Merge on the Discovered Bugs (A1–A17):**
   - Explicitly decide whether **A1 (`afterParryGraceTimer`)**, **A2 (`street_boxing` M2 `baseReturnSpeed`)**, **A3 (`armorBreakTime`)**, **A4 (`0.82` vs `0.88` idle friction)**, **A5 (`kyokushinBlockHitsTaken` reset)**, **A12 (CQC Hit 5 parry resets)**, and **A13 (Shotokan Ren-Zuki)** should preserve exact `03b_replay.json` parity (`self.isPlayer` flag during 3D, then normalize in Phase 5 balance pass) OR align immediately with a documented replay baseline refresh. Keeping **3D strictly behavior-preserving (`03b_replay.json` identical)** and fixing bugs A1–A17 in a dedicated sub-step prevents silent regressions during the structural merge.
3. **Parameterize Human Input / Telemetry via `FighterHooks`:**
   - Move `recordRankedEvaluation`, `processHumanBlockInput`, `processHumanMovementAndSteering`, `isLMBHeld` auto-M1, `visionBlurTime` screen effect, and `totalDamageDealt` callbacks behind explicit `self.isPlayer` / `FighterHooks` boundaries so `updateFighter` handles 100% of shared simulation rules in ~1,900 lines (eliminating ~1,650 duplicate lines).

**Stopping here for review before executing Step 3D and Step 3E.**
