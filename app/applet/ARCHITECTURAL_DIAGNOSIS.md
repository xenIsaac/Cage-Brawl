# 🏟️ OCTAGON ARENA & MAJOR ENGINE SCRIPTS: COMPREHENSIVE ARCHITECTURAL DIAGNOSIS

This document provides a complete architectural breakdown of **Arena** and all major underlying scripts powering the application. It outlines what Arena contains, how major scripts interoperate, and their precise functional responsibilities.

---

## 1. 🏟️ WHAT "ARENA" CONTAINS (`src/components/Arena.tsx` & `src/components/arena/`)

The **Arena** module is the high-performance combat orchestration layer. When a match starts, Arena initializes the real-time simulation loop, WebGL rendering canvas, input listeners, and HUD overlays.

### Sub-Components & Modals within Arena:
1. **`src/components/Arena.tsx` (Master Orchestrator)**:
   - Manages match state machine (`countdown` ➔ `fighting` ➔ `paused` ➔ `ko` / `victory`).
   - Hooks into the 60 FPS requestAnimationFrame loop (`src/combat/loop.ts`).
   - Manages camera zoom sequences (e.g., Section 8.4 cinematic countdown camera pans).
   - Binds keyboard and mobile touch controls (`src/components/MobileControls.tsx`).
2. **`src/components/arena/ModeSelectorOverlay.tsx`**:
   - Handles rule presets and game mode parameter selection before entering the ring.
3. **`src/components/arena/TournamentLadderModal.tsx`**:
   - Displays tournament bracket progression, opponents, and round-by-round advancement during tournament mode.
4. **`src/components/arena/SpectatorChamberModal.tsx`**:
   - Enables spectator mode, camera orbit controls, and live match observing for multiplayer rooms.
5. **`src/components/arena/TrainingDrawer.tsx`**:
   - In-fight training HUD overlay (in Dojo mode) displaying real-time frame advantage, input history, hitbox wireframes, and stamina recovery metrics.

---

## 2. ⚙️ MAJOR ENGINE SCRIPTS & PIPELINES

The codebase is structured into 6 primary structural pillars. Below is the comprehensive directory of major scripts and their exact operational purpose.

### A. Core Combat Physics & Hitbox Pipeline (`src/combat/`)
*Governs deterministic 60 FPS combat calculations, collision detection, and damage states.*

- **`src/combat/combatEngine.ts`**: The central referee script processing fighter positions, inputs, active frames, health bars, and round timers.
- **`src/combat/physics.ts`**: Calculates 2D/3D momentum, pushback friction, wall bounces against the Octagon cage, and gravity on knockdown.
- **`src/combat/hitboxCalculator.ts`**: Performs polygon/box intersection tests between attacking limbs and defending guard boxes.
- **`src/combat/blockEngine.ts`**: Evaluates guard durability, parry window timing, and stun/stagger frame advantages.
- **`src/combat/staminaEngine.ts`**: Tracks breath consumption for heavy strikes, sprinting, and parries, triggering exhaustion slowdowns.
- **`src/combat/animation_engine.ts`**: Interpolates skeletal keyframes for windups, active strikes, and recovery frames.
- **`src/combat/parry.ts`**: Manages counter-attacking state windows when a defensive parry successfully deflects an incoming strike.

### B. Three.js 3D Rendering Pipeline (`src/combat/three/`)
*Renders the theatrical Persona 5 high-contrast 3D Octagon environment and skeletal fighters.*

- **`src/combat/three/SceneManager.ts`**: Initializes Three.js WebGL Renderer, camera perspective, lighting gradients, and post-processing bloom.
- **`src/combat/three/OctagonArena.ts`**: Procedurally generates the pitch-black floor canvas, glowing white grid lines, metallic cage mesh, and overhead directional spotlights.
- **`src/combat/three/Fighter3D.ts`**: Manages 3D skeletal meshes, limb hierarchy rotations, lighting shadows beneath fighters, and hit-spark particle emitters.

### C. Game Modes (`src/modes/`)
*Defines rulesets for different gameplay experiences.*

- **`src/modes/casual_ai.mode.ts`**: Standard exhibition matches against AI bots with balanced heuristics.
- **`src/modes/ranked_ai.mode.ts`**: Competitive ELO-ranked ruleset with aggressive bot decision trees.
- **`src/modes/tournament.mode.ts`**: Multi-stage bracket elimination rules.
- **`src/modes/dojo.mode.ts`**: Sandbox training rules with infinite stamina and dummy feedback.

### D. Data Layer & Quests (`src/data/`)
*Static schemas, reward tables, and progression registries.*

- **`src/data/offlineQuests.ts`**: Defines Tier 1–5 Singleplayer AI bounty quests, recycle timers, and skip fees.
- **`src/data/careerMilestones.ts`**: Defines permanent 9-track cumulative career achievements (Bot Slayer, Iron Wall, etc.).
- **`src/data/crateData.ts`**: Loot box drop tables, gacha vault probabilities, and key tier definitions.
- **`src/data/aiChallengers.ts`**: Roster of AI opponent profiles, names, styles, and portrait metadata.

### E. Utilities & Event Trackers (`src/utils/`)
*Calculators, math helpers, and progression hooks.*

- **`src/utils/questTracker.ts`**: Listens to combat victory events and automatically increments singleplayer/multiplayer quest progress counters.
- **`src/utils/evaluationEngine.ts`**: Grades match performance based on accuracy, parry rate, and speed.
- **`src/utils/useResponsiveLayout.ts`**: Monitors viewport width/height, device orientation (portrait vs landscape), and applies compact landscape scaling.
- **`src/utils/countdownBuffer.ts`**: Orchestrates the 4.5-second cinematic 3-2-1 camera zoom-in and zoom-out intro sequence.

### F. UI & Menu Components (`src/components/`)
*User interfaces, HUD editors, progression hubs, and unboxing sanctums.*

- **`src/components/Menu.tsx`**: Master navigation hub linking to matchmaking, training, codex, and settings.
- **`src/components/QuestsAchievementsPanel.tsx`**: The unified Progression Hub hosting Singleplayer Quests, Multiplayer Bounties, and Career Milestones.
- **`src/components/SingleplayerQuestsScreen.tsx`**: Dedicated AI Bounty Vault featuring swipable 1-square-high Persona calling cards and tier chips.
- **`src/components/CareerMilestonesScreen.tsx`**: Permanent career track interface with stage claimers and title unlocks.
- **`src/components/RollSystem.tsx`**: Style gacha rolling vault interface.
- **`src/components/LiveHudEditor.tsx`**: Customizable HUD layout editor.
