/**
 * src/combat/attackTriggers.ts
 *
 * Section 9.1 Block #2 Extraction:
 * Extracted Attack Triggers and Heavy Attack Execution Pipeline out of Arena.tsx.
 *
 * ZERO LOGIC MUTATION GUARANTEE:
 * - 100% faithful extraction of light combo ladders (S1-S4 across all 11+ styles)
 * - 100% faithful extraction of M2 heavy windup calculations and style passives
 * - 100% faithful extraction of heavy attack execution and whiff recovery
 */

import { Fighter, MatchData } from '../types';
import { CombatFighter } from './types';
import { getHeightModifiers } from '../utils/heightModifiers';
import { handleSprintM1Cancel, handleSprintM2Cancel } from './staminaEngine';
import {
  getStyleM1BetweenCooldown,
  applyFighterPostureCooldown,
  executeIronBoxingS4InstantChain,
  applyGlobalM2RetractionOverride,
  isS2FullyRetractedToStance,
  CAPOEIRA_COMBO_RESET_FRAMES,
  BASE_COMBO_RESET_FRAMES
} from './combatEngine';
import { getStylePostS4HeavyDelay } from './styles';
import { applyHeavyWhiffPenalty as applyWhiffPenaltyHelper } from './hitResolution';

export interface AttackTriggersContext {
  stateRef: { current: any };
  soundManager: any;
  matchData?: MatchData;
  isImpactFrameActive: () => boolean;
  spawnFloatingText: (x: number, y: number, text: string, color: string) => void;
  syncCombatStatesToUI: () => void;
  setIsPlayerBlocking: (val: boolean) => void;
  setTotalSwings: (val: number | ((prev: number) => number)) => void;
  sendImmediateWsGameState?: () => void;
  applyHeavyWhiffPenalty?: (fighter: any) => void;
}

/**
 * Left click trigger Light strike (Basic 4-Combo Sequence across all 11+ martial arts)
 */
export function executePlayerLightAttackTrigger(ctx: AttackTriggersContext): void {
  const {
    stateRef,
    soundManager,
    matchData,
    isImpactFrameActive,
    spawnFloatingText,
    syncCombatStatesToUI,
    setIsPlayerBlocking,
    setTotalSwings,
    sendImmediateWsGameState
  } = ctx;

  const state = stateRef.current;
  if (matchData?.isAiVsAiSpectator) return;
  if (state.cinematicZoomActive || state.matchEnded || isImpactFrameActive()) return;
  if ((matchData?.isCompetitive || matchData?.isAiMatch) && state.rankedState !== 'fighting') return;
  const player = state.player;
  const dummy = state.dummy;
  if (!player || player.isDead || (dummy && dummy.isDead) || player.stunTime > 0 || (player.parriedStun || 0) > 0 || (player.strikeCooldown || 0) > 0 || (player.armorBreakTime || 0) > 0 || (player.kyokushinSpinOutTimer || 0) > 0 || (player.cqcAttackLockout || 0) > 0 || player.aikiSlamStage || player.aikiSlamUninterruptible || (player.aikiLockoutTimer && player.aikiLockoutTimer > 0) || (player.aikiSpinDownTimer && player.aikiSpinDownTimer > 0) || (player.superCrippleTimer && player.superCrippleTimer > 0) || (player.sluggerM2WhiffLockoutTimer && player.sluggerM2WhiffLockoutTimer > 0) || (player.styleId === 'aikido' && (player.aikiM2ActiveWindow || 0) > 0 && (!player.aikiSlamReactiveWindow || player.aikiSlamReactiveWindow <= 0))) {
    if (player && player.superCrippleTimer && player.superCrippleTimer > 0) {
      spawnFloatingText(player.x, player.y - 30, 'SUPER CRIPPLED! (ATTACKS DISABLED)', '#dc2626');
    }
    return;
  }

  // Aikido Parry Attack Lockout: Cannot attack during Aikido parry / block / active M2 parry stance window (0.70s)
  if (player.styleId === 'aikido') {
    const isParryingState = player.isBlocking || !!player.aikiParryActive || ((player.aikiM2ActiveWindow || 0) > 0) || ((player.heavyWindup || 0) > 0) || ((player.parryFlashTime || 0) > 0);
    if (isParryingState && (!player.aikiSlamReactiveWindow || player.aikiSlamReactiveWindow <= 0)) {
      return;
    }
  }

  // Section 2.8: You cannot attack during dash or for 0.30s (18 frames) after exiting dash
  if (player.isDashing || (player.dashProgress && player.dashProgress > 0) || (player.postDashAttackLockout && player.postDashAttackLockout > 0)) {
    return;
  }

  // Posture System: Active Posture Cooldown Locks M1 Light Attacks
  if ((player.postureCd && player.postureCd > 0) || player.isPostureLocked) {
    return;
  }

  // Section 2.8: Post-Block Action Delay (0.10s = 6 frames attack lockout)
  if (player.postBlockAttackLockout && player.postBlockAttackLockout > 0) {
    const isAfterParry = (player.afterParryGraceTimer || 0) > 0 || (player.parryFlashTime || 0) > 0 || (player.parryBlockGraceTimer || 0) > 0;
    if (isAfterParry) {
      player.postBlockAttackLockout = 0;
    } else {
      if ((player.lastBlockDelayTextTimer || 0) <= 0) {
        player.lastBlockDelayTextTimer = 6;
      }
      return;
    }
  }
  if (player.isBlocking) {
    player.isBlocking = false;
    setIsPlayerBlocking(false);
    const isAfterParry = (player.afterParryGraceTimer || 0) > 0 || (player.parryFlashTime || 0) > 0 || (player.parryBlockGraceTimer || 0) > 0;
    if (player.styleId === 'capoeira' || isAfterParry) {
      player.postBlockAttackLockout = 0;
    } else {
      player.postBlockAttackLockout = 6; // Section 2.8: Dropping active guard imposes 0.10s attack delay
      if ((player.lastBlockDelayTextTimer || 0) <= 0) {
        player.lastBlockDelayTextTimer = 6;
      }
      return;
    }
  }

  // Rule 2: Heavy Attack Animation Lockout (Windup + Active Hitbox + Recovery Frames)
  const isHeavyPunching = player.fists.some((f: any) => (f.isPunching || f.punchProgress > 0) && f.isHeavy);
  const isHeavyExecuting = (player.heavyWindup || 0) > 0 || isHeavyPunching || (player.ashiharaM2Stage && player.ashiharaM2Stage > 0) || (player.ashiharaRecoveryTimer && player.ashiharaRecoveryTimer > 0) || (player.cqcM2Stage && player.cqcM2Stage !== null) || !!player.keysiClinchStage;
  if (isHeavyExecuting) return;

  // SECTION 1.16: ASYNCHRONOUS RETRACTION - The next sequence strike NEVER waits for the previous strike to finish retracting!
  const isPunchExtending = player.fists.some((f: any) => f.isPunching) || ((player.shellRetractionHoldTimer || 0) > 0);
  if (isPunchExtending) {
    if (player.styleId === 'street_taekwondo') {
      const rightFist = player.fists.find((f: any) => f.punchType === 'right');
      if (rightFist && (rightFist.comboStage === 0 || player.comboStage === 1)) {
        player.tkdDoubleTapQueued = true;
      }
    }
    return;
  }

  // Check strike cooldown (stun/interruption)
  if (player.strikeCooldown && player.strikeCooldown > 0) return;
  // Check light attack cooldown
  if (player.lightCooldown && player.lightCooldown > 0) {
    if (player.styleId === 'street_taekwondo') {
      const rightFist = player.fists.find((f: any) => f.punchType === 'right');
      if (rightFist && (rightFist.comboStage === 0 || player.comboStage === 1)) {
        player.tkdDoubleTapQueued = true;
        player.tkdChamberRetracting = true;
      }
    }
    return;
  }

  // Aikido Reactive Slam Window Trigger via M1 during 0.5s parry window
  if (player.styleId === 'aikido' && player.aikiSlamReactiveWindow && player.aikiSlamReactiveWindow > 0) {
    player.aikiSlamReactiveWindow = 0;
    player.aikiPassiveSlamCd = 900; // Independent 15.0s Cooldown
    const target = dummy && !dummy.isDead ? dummy : null;
    if (target) {
      player.aikiSlamStage = 'clamp';
      player.aikiSlamDamage = 6.0; // Flat Slam Damage (6.0 HP)
      player.aikiSlamTimer = 90;
      player.aikiSlamFrame = 0;
      player.aikiSlamBaseAngle = player.facingAngle;
      player.aikiSlamTarget = target;
      player.aikiIsFreeSlam = true;
      player.aikiSlamUninterruptible = true;
      target.aikiSlamUninterruptible = true;
      target.aikiSlamVictimStage = 'clamp';
      target.aikiOverheadScale = 1.0;
      player.vx = 0;
      player.vy = 0;
      target.vx = 0;
      target.vy = 0;
      player.isPostureLocked = false;
      player.postureCd = 0;
      player.lightCooldown = 0;
      player.strikeCooldown = 0;
      player.fists.forEach((f: any) => {
        f.isPunching = false;
        f.punchProgress = 0;
      });
      target.fists.forEach((f: any) => {
        f.isPunching = false;
        f.punchProgress = 0;
      });
      soundManager.playParry();
      spawnFloatingText(player.x, player.y - 30, 'OVER-HEAD COUNTER SLAM! (6.0 FLAT)', '#38bdf8');
      return;
    }
  }

  // Check Sprint state / M1 sprint lockout
  if (!handleSprintM1Cancel(player)) {
    return;
  }

  player.kyokushinM2FreezeTimer = 0; // Clear post-M2 freeze pose on M1 attack

  // Reset fist heavy flags for light attack sequence
  player.fists.forEach((f: any) => {
    f.isHeavy = false;
  });

  // Get current sequence combo stage
  let currentStage = player.comboStage || 0;
  if (player.styleId === 'capoeira' && player.comboResetTimer && player.comboResetTimer <= 40) {
    currentStage = 0;
    spawnFloatingText(player.x, player.y - 30, 'RHYTHM RESET!', '#ca8a04');
  }

  // Aikido S2 ➔ S3 Retraction Gate:
  if (player.styleId === 'aikido' && (currentStage === 1 || currentStage === 2)) {
    if (!isS2FullyRetractedToStance(player)) {
      return; // Input is queued or ignored until S2 arm reaches 0% extension
    }
  }

  stateRef.current.totalSwings = (stateRef.current.totalSwings || 0) + 1;
  setTotalSwings(stateRef.current.totalSwings);

  // Trigger glove lunges visually
  if (player.styleId === 'street_boxing') {
    if (currentStage === 0 || currentStage === 1) {
      const leftFist = player.fists.find((f: any) => f.punchType === 'left');
      if (leftFist) { leftFist.isPunching = true; leftFist.punchProgress = 0; leftFist.isHeavy = false; leftFist.comboStage = currentStage; leftFist.hasHit = false; }
    } else if (currentStage === 2) {
      const rightFist = player.fists.find((f: any) => f.punchType === 'right');
      if (rightFist) { rightFist.isPunching = true; rightFist.punchProgress = 0; rightFist.isHeavy = false; rightFist.comboStage = 2; rightFist.hasHit = false; }
    } else if (currentStage === 3) {
      const rightFist = player.fists.find((f: any) => f.punchType === 'right');
      if (rightFist) { rightFist.isPunching = true; rightFist.punchProgress = 0; rightFist.isHeavy = false; rightFist.comboStage = 3; rightFist.hasHit = false; }
    }
  } else if (player.styleId === 'muay_thai') {
    if (currentStage === 0 || currentStage === 2) {
      const rightFist = player.fists.find((f: any) => f.punchType === 'right');
      if (rightFist) { rightFist.isPunching = true; rightFist.punchProgress = 0; rightFist.comboStage = currentStage; }
    } else {
      const leftFist = player.fists.find((f: any) => f.punchType === 'left');
      if (leftFist) { leftFist.isPunching = true; leftFist.punchProgress = 0; leftFist.comboStage = currentStage; }
    }
  } else if (player.styleId === 'slugger') {
    if (currentStage === 0 || currentStage === 2) {
      const leftFist = player.fists.find((f: any) => f.punchType === 'left');
      if (leftFist) { leftFist.isPunching = true; leftFist.punchProgress = 0; leftFist.comboStage = currentStage; }
    } else {
      const rightFist = player.fists.find((f: any) => f.punchType === 'right');
      if (rightFist) { rightFist.isPunching = true; rightFist.punchProgress = 0; rightFist.comboStage = currentStage; }
    }
  } else if (player.styleId === 'shotokan') {
    if (currentStage === 0) {
      const leftFist = player.fists.find((f: any) => f.punchType === 'left');
      if (leftFist) { leftFist.isPunching = true; leftFist.punchProgress = 0; leftFist.comboStage = 0; }
      player.vx += Math.cos(player.facingAngle) * 3.6;
      player.vy += Math.sin(player.facingAngle) * 3.6;
    } else if (currentStage === 1) {
      const rightFist = player.fists.find((f: any) => f.punchType === 'right');
      if (rightFist) { rightFist.isPunching = true; rightFist.punchProgress = 0; rightFist.comboStage = 1; }
      player.vx += Math.cos(player.facingAngle) * 3.2;
      player.vy += Math.sin(player.facingAngle) * 3.2;
    } else if (currentStage === 2) {
      const leftFist = player.fists.find((f: any) => f.punchType === 'left');
      if (leftFist) { leftFist.isPunching = true; leftFist.punchProgress = 0; leftFist.comboStage = 2; }
      player.vx += Math.cos(player.facingAngle) * 3.2;
      player.vy += Math.sin(player.facingAngle) * 3.2;
    } else if (currentStage === 3) {
      const leftFist = player.fists.find((f: any) => f.punchType === 'left');
      if (leftFist) { leftFist.isPunching = true; leftFist.punchProgress = 0; leftFist.comboStage = 3; }
      player.vx -= Math.cos(player.facingAngle) * 2.2;
      player.vy -= Math.sin(player.facingAngle) * 2.2;
      setTimeout(() => {
        if (stateRef.current.player) {
          stateRef.current.player.vx += Math.cos(stateRef.current.player.facingAngle) * 4.6;
          stateRef.current.player.vy += Math.sin(stateRef.current.player.facingAngle) * 4.6;
        }
      }, 50);
    }
  } else if (player.styleId === 'ashihara') {
    if (currentStage === 0 || currentStage === 2) {
      const leftFist = player.fists.find((f: any) => f.punchType === 'left');
      if (leftFist) { leftFist.isPunching = true; leftFist.punchProgress = 0; leftFist.comboStage = currentStage; leftFist.hasHit = false; }
    } else {
      const rightFist = player.fists.find((f: any) => f.punchType === 'right');
      if (rightFist) { rightFist.isPunching = true; rightFist.punchProgress = 0; rightFist.comboStage = currentStage; rightFist.hasHit = false; }
    }
    if (currentStage === 3) {
      player.vx += Math.cos(player.facingAngle) * 2.5;
      player.vy += Math.sin(player.facingAngle) * 2.5;
      spawnFloatingText(player.x, player.y - 30, 'FLOW SWEEP (I-FRAMES)', '#38bdf8');
    }
  } else if (player.styleId === 'capoeira') {
    if (currentStage === 0 || currentStage === 2) {
      const leftFist = player.fists.find((f: any) => f.punchType === 'left');
      if (leftFist) { leftFist.isPunching = true; leftFist.punchProgress = 0; leftFist.comboStage = currentStage; }
    } else {
      const rightFist = player.fists.find((f: any) => f.punchType === 'right');
      if (rightFist) { rightFist.isPunching = true; rightFist.punchProgress = 0; rightFist.comboStage = currentStage; }
    }
  } else if (player.styleId === 'kickboxing') {
    if (currentStage === 0 || currentStage === 2) {
      const leftFist = player.fists.find((f: any) => f.punchType === 'left');
      if (leftFist) { leftFist.isPunching = true; leftFist.punchProgress = 0; leftFist.comboStage = currentStage; }
      if (currentStage === 2) {
        player.vx += Math.cos(player.facingAngle) * 3.0;
        player.vy += Math.sin(player.facingAngle) * 3.0;
      }
    } else {
      const rightFist = player.fists.find((f: any) => f.punchType === 'right');
      if (rightFist) { rightFist.isPunching = true; rightFist.punchProgress = 0; rightFist.comboStage = currentStage; }
    }
  } else if (player.styleId === 'kyokushin') {
    if (currentStage === 0 || currentStage === 2) {
      const leftFist = player.fists.find((f: any) => f.punchType === 'left');
      if (leftFist) { leftFist.isPunching = true; leftFist.punchProgress = 0; leftFist.comboStage = currentStage; leftFist.hasHit = false; }
    } else {
      const rightFist = player.fists.find((f: any) => f.punchType === 'right');
      if (rightFist) { rightFist.isPunching = true; rightFist.punchProgress = 0; rightFist.comboStage = currentStage; rightFist.hasHit = false; }
    }
  } else if (player.styleId === 'aikido') {
    if (currentStage === 1 || currentStage === 2) {
      const leftFist = player.fists.find((f: any) => f.punchType === 'left');
      if (leftFist) { leftFist.isPunching = true; leftFist.punchProgress = 0; leftFist.comboStage = currentStage; leftFist.hasHit = false; }
    } else {
      const rightFist = player.fists.find((f: any) => f.punchType === 'right');
      if (rightFist) { rightFist.isPunching = true; rightFist.punchProgress = 0; rightFist.comboStage = currentStage; rightFist.hasHit = false; }
      if (currentStage === 3) {
        player.vx += Math.cos(player.facingAngle) * 3.8;
        player.vy += Math.sin(player.facingAngle) * 3.8;
      }
    }
  } else if (player.styleId === 'boxing_shell') {
    if (currentStage === 3) {
      executeIronBoxingS4InstantChain(player);
    } else {
      player.shellRetractionHoldTimer = 0;
      player.shellS3Primed = false;
    }
    if (currentStage === 0 || currentStage === 1) {
      const rightFist = player.fists.find((f: any) => f.punchType === 'right');
      if (rightFist) {
        rightFist.isPunching = true;
        rightFist.punchProgress = 0;
        rightFist.hasHit = false;
        rightFist.comboStage = currentStage;
      }
    } else if (currentStage === 2) {
      const leftFist = player.fists.find((f: any) => f.punchType === 'left');
      if (leftFist) {
        leftFist.isPunching = true;
        leftFist.punchProgress = 0;
        leftFist.hasHit = false;
        leftFist.comboStage = currentStage;
      }
    } else {
      const leftFist = player.fists.find((f: any) => f.punchType === 'left');
      if (leftFist) {
        leftFist.isPunching = true;
        leftFist.punchProgress = 0;
        leftFist.hasHit = false;
        leftFist.comboStage = currentStage;
      }
    }
  } else if (player.styleId === 'street_taekwondo') {
    if (currentStage === 0 || currentStage === 1) {
      const leftFist = player.fists.find((f: any) => f.punchType === 'left');
      if (leftFist) {
        leftFist.isPunching = false;
        leftFist.punchProgress = 0;
        leftFist.isLingerActive = false;
      }
      const rightFist = player.fists.find((f: any) => f.punchType === 'right');
      if (rightFist) {
        rightFist.isPunching = true;
        rightFist.comboStage = currentStage;
        rightFist.hasHit = false;
        if (currentStage === 1) {
          rightFist.punchProgress = Math.max(0.40, rightFist.punchProgress);
        } else {
          rightFist.punchProgress = 0;
          player.tkdDoubleTapQueued = false;
          player.tkdChamberRetracting = false;
        }
      }
    } else {
      const rightFist = player.fists.find((f: any) => f.punchType === 'right');
      if (rightFist) {
        rightFist.isPunching = false;
        rightFist.punchProgress = 0;
        rightFist.isLingerActive = false;
      }
      player.tkdInChamber = false;
      player.tkdChamberRetracting = false;
      player.tkdDoubleTapQueued = false;
      const leftFist = player.fists.find((f: any) => f.punchType === 'left');
      if (leftFist) { leftFist.isPunching = true; leftFist.punchProgress = 0; leftFist.comboStage = currentStage; leftFist.hasHit = false; }
    }
  } else if (player.styleId === 'basic') {
    if (currentStage === 0) {
      const leftFist = player.fists.find((f: any) => f.punchType === 'left');
      if (leftFist) { leftFist.isPunching = true; leftFist.punchProgress = 0; leftFist.comboStage = 0; leftFist.hasHit = false; }
    } else if (currentStage === 1) {
      const rightFist = player.fists.find((f: any) => f.punchType === 'right');
      if (rightFist) { rightFist.isPunching = true; rightFist.punchProgress = 0; rightFist.comboStage = 1; rightFist.hasHit = false; }
      if (player.flowS1Whiffed) {
        player.flowS2HasIFrames = true;
        player.flowS1Whiffed = false;
      }
    } else if (currentStage === 2) {
      const rightFist = player.fists.find((f: any) => f.punchType === 'right');
      if (rightFist) { rightFist.isPunching = true; rightFist.punchProgress = 0; rightFist.comboStage = 2; rightFist.hasHit = false; }
    } else if (currentStage === 3) {
      const leftFist = player.fists.find((f: any) => f.punchType === 'left');
      if (leftFist) { leftFist.isPunching = true; leftFist.punchProgress = 0; leftFist.comboStage = 3; leftFist.hasHit = false; }
      if (player.flowS3ParryBaited) {
        spawnFloatingText(player.x, player.y - 30, 'FEINT TRAP UNLEASHED (2X DMG)', '#ef4444');
      }
    }
  } else {
    if (currentStage === 0 || currentStage === 2) {
      const leftFist = player.fists.find((f: any) => f.punchType === 'left');
      if (leftFist) { leftFist.isPunching = true; leftFist.punchProgress = 0; leftFist.comboStage = currentStage; leftFist.hasHit = false; }
    } else {
      const rightFist = player.fists.find((f: any) => f.punchType === 'right');
      if (rightFist) { rightFist.isPunching = true; rightFist.punchProgress = 0; rightFist.comboStage = currentStage; rightFist.hasHit = false; }
    }
  }

  soundManager.playDash();

  const comboStages = 4;
  player.comboStage = (currentStage + 1) % comboStages;
  if (player.comboStage === 0) {
    player.aikiManualM2UsedInSequence = false;
  }
  player.comboResetTimer = player.styleId === 'capoeira' ? CAPOEIRA_COMBO_RESET_FRAMES : (player.styleId === 'slugger' ? 140 : BASE_COMBO_RESET_FRAMES);

  if (player.styleId === 'shotokan' && currentStage === 1) {
    player.shotokanRenZukiPending = true;
  }

  if (player.styleId === 'slugger' && player.hasKineticCounter && currentStage === 0) {
    player.hasKineticCounter = false;
    const punchingFist = player.fists.find((f: any) => f.isPunching);
    if (punchingFist) punchingFist.isKineticCounter = true;
    spawnFloatingText(player.x, player.y - 30, 'KINETIC COUNTER!', '#f59e0b');
  }

  const playerMods = getHeightModifiers(player.baseHeight);
  const momentumMult = 1.0;

  if (player.comboStage === 0) {
    applyFighterPostureCooldown(player, playerMods.speedFactor, momentumMult);
    const s4HeavyDelay = getStylePostS4HeavyDelay(player.styleId);
    player.postS4HeavyLockout = player.styleId === 'street_taekwondo' ? 0 : Math.round(s4HeavyDelay / playerMods.speedFactor);
  } else {
    const betweenCooldown = getStyleM1BetweenCooldown(player.styleId, currentStage);
    if (player.styleId === 'kickboxing' && (currentStage === 0 || currentStage === 1)) {
      spawnFloatingText(player.x, player.y - 30, 'CADENCE OPENING (10% FAST)', '#d1d5db');
    }
    player.lightCooldown = Math.round(betweenCooldown / (playerMods.speedFactor * momentumMult));
    player.postureCd = 0;
    player.isPostureLocked = false;
    player.postS4HeavyLockout = 0;
  }

  syncCombatStatesToUI();
  if (sendImmediateWsGameState) sendImmediateWsGameState();
}

/**
 * Right click trigger Heavy strike (Right hook with 0.8s windup & style-specific M2 charging)
 */
export function executePlayerHeavyAttackTrigger(ctx: AttackTriggersContext): void {
  const {
    stateRef,
    soundManager,
    matchData,
    isImpactFrameActive,
    spawnFloatingText,
    syncCombatStatesToUI,
    setIsPlayerBlocking,
    setTotalSwings,
    sendImmediateWsGameState
  } = ctx;

  const state = stateRef.current;
  if (matchData?.isAiVsAiSpectator) return;
  if (state.cinematicZoomActive || state.matchEnded || isImpactFrameActive()) return;
  if ((matchData?.isCompetitive || matchData?.isAiMatch) && state.rankedState !== 'fighting') return;
  const player = state.player;
  const dummy = state.dummy;
  const isTkdM1Override = player?.styleId === 'street_taekwondo';
  const isStrikeCdBlocking = !isTkdM1Override && ((player?.strikeCooldown || 0) > 0);
  if (!player || player.isDead || (dummy && dummy.isDead) || player.stunTime > 0 || (player.parriedStun || 0) > 0 || isStrikeCdBlocking || (player.armorBreakTime || 0) > 0 || (player.kyokushinSpinOutTimer || 0) > 0 || (player.cqcAttackLockout || 0) > 0 || (player.shellLockoutTimer || 0) > 0 || (player.keysiVulnerableTimer || 0) > 0 || player.aikiSlamStage || player.aikiSlamUninterruptible || (player.aikiLockoutTimer && player.aikiLockoutTimer > 0) || (player.aikiSpinDownTimer && player.aikiSpinDownTimer > 0) || (player.superCrippleTimer && player.superCrippleTimer > 0) || (player.sluggerM2WhiffLockoutTimer && player.sluggerM2WhiffLockoutTimer > 0) || (player.styleId === 'aikido' && (player.aikiM2ActiveWindow || 0) > 0)) {
    if (player && player.superCrippleTimer && player.superCrippleTimer > 0) {
      spawnFloatingText(player.x, player.y - 30, 'SUPER CRIPPLED! (ATTACKS DISABLED)', '#dc2626');
    }
    return;
  }

  // Aikido Parry Attack Lockout
  if (player.styleId === 'aikido') {
    const isParryingState = player.isBlocking || !!player.aikiParryActive || ((player.aikiM2ActiveWindow || 0) > 0) || ((player.heavyWindup || 0) > 0) || ((player.parryFlashTime || 0) > 0);
    if (isParryingState) {
      return;
    }
  }

  // Section 2.8: You cannot attack during dash or for 0.30s (18 frames) after exiting dash
  if (player.isDashing || (player.dashProgress && player.dashProgress > 0) || (player.postDashAttackLockout && player.postDashAttackLockout > 0)) {
    return;
  }

  // Strict Cooldown & State Check
  const isKickboxingSeq2Ready = player.styleId === 'kickboxing' && (
    (player.kickboxingSeq2Ready && (player.kickboxingSeq2Window || 0) > 0) ||
    (player.kickboxingAutoSeq2Timer && player.kickboxingAutoSeq2Timer > 0)
  );
  const isM1LockoutActive = !isTkdM1Override && ((player.strikeCooldown || 0) > 0 || (player.postS4HeavyLockout || 0) > 0);
  if (!isKickboxingSeq2Ready && ((player.heavyCooldown || 0) > 0 || isM1LockoutActive || (player.keysiVulnerableTimer || 0) > 0)) return;
  if (player.styleId === 'capoeira' && player.capoeiraExhausted) return;
  if (player.styleId === 'aikido' && ((player.aikiM2ActiveWindow || 0) > 0 || (player.aikiWhiffSlowTimer || 0) > 0)) return;

  if (!state.infiniteStamina && (player.stamina ?? 100) < 20) {
    spawnFloatingText(player.x, player.y - 30, 'NO STAMINA!', '#ef4444');
    return;
  }
  if (!state.infiniteStamina) {
    player.stamina = Math.max(0, (player.stamina ?? 100) - 20);
  }

  // SECTION 1.18 - FIX 3: Global M2 Retraction Override
  applyGlobalM2RetractionOverride(player);

  // Section 2.8: Post-Block Action Delay
  const isIronBoxing = player.styleId === 'boxing_shell';
  const isAfterParry = (player.afterParryGraceTimer || 0) > 0 || (player.parryFlashTime || 0) > 0 || (player.parryBlockGraceTimer || 0) > 0;
  if (!isIronBoxing && player.postBlockAttackLockout && player.postBlockAttackLockout > 0) {
    if (isAfterParry) {
      player.postBlockAttackLockout = 0;
    } else {
      if ((player.lastBlockDelayTextTimer || 0) <= 0) {
        player.lastBlockDelayTextTimer = 6;
      }
      return;
    }
  }
  if (player.isBlocking) {
    player.isBlocking = false;
    setIsPlayerBlocking(false);
    if (!isIronBoxing && !isAfterParry && player.styleId !== 'capoeira') {
      player.postBlockAttackLockout = 6;
      if ((player.lastBlockDelayTextTimer || 0) <= 0) {
        player.lastBlockDelayTextTimer = 6;
      }
      return;
    } else {
      player.postBlockAttackLockout = 0;
    }
  }

  // Rule 2: Heavy Attack Animation Lockout
  const isHeavyPunching = player.fists.some((f: any) => f.isPunching && f.isHeavy);
  const isHeavyExecuting = (player.heavyWindup || 0) > 0 || isHeavyPunching || (player.ashiharaM2Stage && player.ashiharaM2Stage > 0) || (player.ashiharaRecoveryTimer && player.ashiharaRecoveryTimer > 0) || (player.cqcM2Stage && player.cqcM2Stage !== null) || !!player.keysiClinchStage;
  if (!isKickboxingSeq2Ready && isHeavyExecuting) return;

  const isHeavyExtending = player.fists.some((f: any) => f.isPunching && f.isHeavy) || ((player.shellRetractionHoldTimer || 0) > 0);
  if (!isKickboxingSeq2Ready && isHeavyExtending) return;

  // Charge heavy hook
  handleSprintM2Cancel(player, 60);
  const playerMods = getHeightModifiers(player.baseHeight);
  stateRef.current.totalSwings = (stateRef.current.totalSwings || 0) + 1;
  setTotalSwings(stateRef.current.totalSwings);

  let windupFrames = 48;
  if (player.styleId === 'street_boxing') {
    windupFrames = 24;
    player.isDashing = false;
    player.dashProgress = 0;
    player.streetBoxingM2Stage = 1;
    player.streetBoxingM2Hits = 0;
    player.streetBoxingUnbreakable = false;
    player.streetBoxingM2NextTimer = 0;
  } else if (player.styleId === 'shotokan') {
    windupFrames = 30;
    player.isDashing = true;
    player.dashProgress = 30;
    const dashForce = 6.5;
    player.vx = Math.cos(player.facingAngle) * dashForce;
    player.vy = Math.sin(player.facingAngle) * dashForce;
    player.attackLockedAngle = player.facingAngle;
  } else if (player.styleId === 'ashihara') {
    if (player.ashiharaParryLockout && player.ashiharaParryLockout > 0) {
      return;
    }
    windupFrames = 27;
    player.ashiharaM2Stage = 1;
    player.ashiharaM2Timer = 27;
    player.ashiharaParryLockout = 48;
    if (dummy) {
      dummy.parryLockoutTimer = 60;
      spawnFloatingText(dummy.x, dummy.y - 45, 'PARRY DISABLED (1s)', '#ef4444');
    }
  } else if (player.styleId === 'basic') {
    windupFrames = 24;
    player.isDashing = false;
    player.dashProgress = 0;
    player.dashAngle = undefined;
    player.attackLockedAngle = player.facingAngle;
    const forwardSpeed = 7.5 * playerMods.speedFactor;
    player.vx = Math.cos(player.attackLockedAngle) * forwardSpeed;
    player.vy = Math.sin(player.attackLockedAngle) * forwardSpeed;
  } else if (player.styleId === 'capoeira') {
    windupFrames = 30;
  } else if (player.styleId === 'kickboxing') {
    if (isKickboxingSeq2Ready) {
      let execSpeed = 0.95;
      if (player.kickboxingCadenceTimer && player.kickboxingCadenceTimer > 0) {
        execSpeed *= 1.15;
      }
      windupFrames = Math.round(18 / execSpeed);
      player.kickboxingIsSeq2 = true;
      player.kickboxingSeq2Ready = false;
      player.kickboxingSeq2Window = 0;
      player.kickboxingAutoSeq2Timer = 0;
      player.strikeCooldown = 0;
      player.fists.forEach((f: any) => {
        f.isPunching = false;
        f.punchProgress = 0;
        f.isHeavy = false;
      });
    } else {
      player.kickboxingIsSeq2 = false;
      player.kickboxingS1Hit = false;
      player.kickboxingS2Hit = false;
      let execSpeed = 0.95;
      if (player.kickboxingCadenceTimer && player.kickboxingCadenceTimer > 0) {
        execSpeed *= 1.15;
      }
      windupFrames = Math.round(24 / execSpeed);
    }
  } else if (player.styleId === 'keysi') {
    player.isDashing = false;
    player.dashProgress = 0;
    player.vx = 0;
    player.vy = 0;
    if (player.keysiM2Primed) {
      windupFrames = 6;
      player.keysiM2Primed = false;
      player.keysiHasSuperArmor = true;
      player.maxHeavyWindup = 6;
      spawnFloatingText(player.x, player.y - 30, 'CLINCH SURGE (0.1s)!', '#ef4444');
    } else {
      windupFrames = 26;
      player.keysiHasSuperArmor = false;
      player.maxHeavyWindup = 26;
    }
  } else if (player.styleId === 'cqc') {
    windupFrames = 90;
    player.cqcM2Stage = 'windup';
    player.cqcWindupTimer = 90;
    player.cqcLockedTarget = null;
    player.cqcRings = Array.from({ length: 8 }, (_, i) => ({
      r: 0,
      maxR: Math.round(((i + 1) / 8) * 272),
      frozen: false
    }));
    spawnFloatingText(player.x, player.y - 30, 'ECHO SCANNING (8 RINGS)...', '#ef4444');
  } else if (player.styleId === 'kyokushin') {
    windupFrames = 33;
  } else if (player.styleId === 'aikido') {
    windupFrames = 0;
    player.heavyWindup = 0;
    player.aikiM2ActiveWindow = 42;
    player.aikiM2Guarding = true;
    soundManager.playParry();
    spawnFloatingText(player.x, player.y - 30, 'ACTIVE PARRY STANCE (0.7s)', '#38bdf8');
    syncCombatStatesToUI();
    return;
  } else if (player.styleId === 'street_taekwondo') {
    windupFrames = 21;
    player.maxHeavyWindup = windupFrames;
    player.tkdFeintWindowActive = false;
    player.tkdFeintTrapped = false;
    player.heavyCooldown = 240;
    soundManager.playDash();
    spawnFloatingText(player.x, player.y - 30, 'BRAZILIAN KICK FEINT', '#FFD600');
  }

  // Heavy Windup Passives:
  if (player.hasReflexPivot) {
    windupFrames = 6;
    player.hasReflexPivot = false;
    if (player.styleId === 'basic') {
      player.isDashing = false;
      player.dashProgress = 0;
      player.dashAngle = undefined;
      player.attackLockedAngle = player.facingAngle;
      const forwardSpeed = 7.5 * playerMods.speedFactor;
      player.vx = Math.cos(player.attackLockedAngle) * forwardSpeed;
      player.vy = Math.sin(player.attackLockedAngle) * forwardSpeed;
    }
  } else if (player.styleId === 'muay_thai' && dummy && dummy.isBlocking) {
    windupFrames = 6;
  } else if (player.styleId === 'muay_thai') {
    windupFrames = 27;
  } else if (player.styleId === 'slugger') {
    windupFrames = 48;
  } else if (player.styleId === 'boxing_shell') {
    windupFrames = 11;
  }

  if (player.keysiStaggerTimer && player.keysiStaggerTimer > 0) {
    windupFrames = Math.round(windupFrames * 1.60);
  }

  player.fists.forEach((f: any) => {
    f.hasHit = false;
  });
  player.heavyWindup = windupFrames;

  syncCombatStatesToUI();
  if (sendImmediateWsGameState) sendImmediateWsGameState();
}

/**
 * Execute player heavy attack once heavy windup reaches 0
 */
export function executePlayerHeavyRelease(ctx: AttackTriggersContext): void {
  const {
    stateRef,
    soundManager,
    spawnFloatingText,
    syncCombatStatesToUI,
    applyHeavyWhiffPenalty: customWhiff
  } = ctx;

  const state = stateRef.current;
  const player = state.player;
  const dummy = state.dummy;
  if (!player || player.isDead) return;

  const runWhiff = customWhiff || ((f: any) => applyWhiffPenaltyHelper(f, spawnFloatingText, soundManager));

  if (player.styleId === 'ashihara') {
    player.heavyWindup = 0;
    player.ashiharaM2Stage = 0;
    player.ashiharaRecoveryTimer = 30;
    player.heavyCooldown = 270;
    spawnFloatingText(player.x, player.y - 30, 'MAWASHI UKE WHIFF (0.5s)', '#ef4444');
    syncCombatStatesToUI();
    return;
  }

  if (player.styleId === 'keysi') {
    player.heavyWindup = 0;
    player.keysiClinchStage = 'delay';
    player.keysiClinchTimer = 8;
    player.keysiClinchTarget = dummy && !dummy.isDead ? dummy : null;
    soundManager.playDash();
    syncCombatStatesToUI();
    return;
  }

  if (player.styleId === 'cqc') {
    player.heavyWindup = 0;
    const target = player.cqcLockedTarget || (dummy && !dummy.isDead && Math.hypot(dummy.x - player.x, dummy.y - player.y) <= 272 ? dummy : null);
    if (target && !target.isDead) {
      player.cqcM2Stage = 'dash';
      player.cqcLockedTarget = target;
      player.isDashing = true;

      const startX = player.x;
      const startY = player.y;
      const dashAngle = Math.atan2(target.y - startY, target.x - startX);
      const distToTarget = Math.hypot(target.x - startX, target.y - startY);
      const passThroughDist = distToTarget + target.radius + player.radius + 20;

      player.cqcDashStartX = startX;
      player.cqcDashStartY = startY;
      player.cqcDashEndX = startX + Math.cos(dashAngle) * passThroughDist;
      player.cqcDashEndY = startY + Math.sin(dashAngle) * passThroughDist;
      player.cqcDashTotalFrames = 18;
      player.dashProgress = 18;
      player.facingAngle = dashAngle;
      player.cqcRings = undefined;
      player.heavyCooldown = 900;

      soundManager.playDash();
      spawnFloatingText(player.x, player.y - 30, 'TACTICAL BLITZ!', '#ef4444');
    } else {
      player.cqcM2Stage = null;
      player.cqcRings = undefined;
      player.cqcLockedTarget = null;
      player.isDashing = false;
      player.dashProgress = 0;
      runWhiff(player);
    }
    syncCombatStatesToUI();
    return;
  }

  if (player.styleId === 'aikido') {
    player.heavyWindup = 0;
    player.aikiM2ActiveWindow = 42;
    player.aikiM2Guarding = true;
    soundManager.playParry();
    spawnFloatingText(player.x, player.y - 30, 'ACTIVE PARRY STANCE (0.7s)', '#38bdf8');
    syncCombatStatesToUI();
    return;
  }

  // Reset all fists state
  player.fists.forEach((f: any) => {
    f.isPunching = false;
    f.punchProgress = 0;
    f.isHeavy = false;
    f.hasHit = false;
  });

  player.attackLockedAngle = undefined;

  const punchType = player.styleId === 'basic' ? 'left' : ((player.styleId === 'street_boxing' && player.streetBoxingM2Stage === 3) ? 'left' : 'right');
  const fist = player.fists.find((f: any) => f.punchType === punchType) || player.fists[0];
  if (fist) {
    fist.isPunching = true;
    fist.punchProgress = 0;
    fist.isHeavy = true;
    fist.hasHit = false;
    (fist as any).kickboxingSeq2 = !!player.kickboxingIsSeq2;
  }

  if (player.styleId === 'street_boxing') {
    player.isDashing = false;
    player.dashProgress = 0;
    if (!player.streetBoxingM2Stage) player.streetBoxingM2Stage = 1;
  }

  if (player.styleId === 'kyokushin') {
    const rightFist = player.fists.find((f: any) => f.punchType === 'right');
    const leftFist = player.fists.find((f: any) => f.punchType === 'left');
    if (rightFist) {
      rightFist.isPunching = true;
      rightFist.punchProgress = 0;
      rightFist.isHeavy = true;
      rightFist.hasHit = false;
    }
    if (leftFist) {
      leftFist.isPunching = false;
      leftFist.punchProgress = 0;
      leftFist.isHeavy = false;
      leftFist.hasHit = true;
    }
    player.kyokushinM2PeakHoldTimer = 0;
    const glideSpeed = 5.0;
    player.vx += Math.cos(player.facingAngle) * glideSpeed;
    player.vy += Math.sin(player.facingAngle) * glideSpeed;
  }

  if (player.styleId === 'capoeira') {
    soundManager.playCapoeiraWhoosh();
  } else {
    soundManager.playDash();
  }

  player.heavyWindup = 0;

  if (player.styleId === 'shotokan') {
    player.isDashing = true;
    player.dashProgress = 24;
  }

  player.lightCooldown = 24;
  syncCombatStatesToUI();
}

/**
 * Execute AI sparring dummy heavy attack once windup reaches 0
 */
export function executeDummyHeavyRelease(ctx: AttackTriggersContext): void {
  const {
    stateRef,
    soundManager,
    spawnFloatingText,
    syncCombatStatesToUI,
    applyHeavyWhiffPenalty: customWhiff
  } = ctx;

  const state = stateRef.current;
  const dummy = state.dummy;
  const player = state.player;
  if (!dummy || dummy.isDead) return;

  const runWhiff = customWhiff || ((f: any) => applyWhiffPenaltyHelper(f, spawnFloatingText, soundManager));

  if (dummy.styleId === 'ashihara') {
    dummy.heavyWindup = 0;
    dummy.ashiharaM2Stage = 0;
    dummy.ashiharaRecoveryTimer = 30;
    dummy.heavyCooldown = 270;
    spawnFloatingText(dummy.x, dummy.y - 30, 'MAWASHI UKE WHIFF (0.5s)', '#ef4444');
    syncCombatStatesToUI();
    return;
  }

  if (dummy.styleId === 'keysi') {
    dummy.heavyWindup = 0;
    dummy.keysiClinchStage = 'delay';
    dummy.keysiClinchTimer = 8;
    dummy.keysiClinchTarget = player && !player.isDead ? player : null;
    soundManager.playDash();
    syncCombatStatesToUI();
    return;
  }

  if (dummy.styleId === 'cqc') {
    dummy.heavyWindup = 0;
    const target = dummy.cqcLockedTarget || (player && !player.isDead && Math.hypot(player.x - dummy.x, player.y - dummy.y) <= 272 ? player : null);
    if (target && !target.isDead) {
      dummy.cqcM2Stage = 'dash';
      dummy.cqcLockedTarget = target;
      dummy.isDashing = true;

      const startX = dummy.x;
      const startY = dummy.y;
      const dashAngle = Math.atan2(target.y - startY, target.x - startX);
      const distToTarget = Math.hypot(target.x - startX, target.y - startY);
      const passThroughDist = distToTarget + target.radius + dummy.radius + 20;

      dummy.cqcDashStartX = startX;
      dummy.cqcDashStartY = startY;
      dummy.cqcDashEndX = startX + Math.cos(dashAngle) * passThroughDist;
      dummy.cqcDashEndY = startY + Math.sin(dashAngle) * passThroughDist;
      dummy.cqcDashTotalFrames = 18;
      dummy.dashProgress = 18;
      dummy.facingAngle = dashAngle;
      dummy.cqcRings = undefined;
      dummy.heavyCooldown = 900;

      soundManager.playDash();
      spawnFloatingText(dummy.x, dummy.y - 30, 'TACTICAL BLITZ!', '#ef4444');
    } else {
      dummy.cqcM2Stage = null;
      dummy.cqcRings = undefined;
      dummy.cqcLockedTarget = null;
      dummy.isDashing = false;
      dummy.dashProgress = 0;
      runWhiff(dummy);
    }
    syncCombatStatesToUI();
    return;
  }

  if (dummy.styleId === 'aikido') {
    dummy.heavyWindup = 0;
    dummy.aikiM2ActiveWindow = 42;
    dummy.aikiM2Guarding = true;
    soundManager.playParry();
    spawnFloatingText(dummy.x, dummy.y - 30, 'ACTIVE PARRY STANCE (0.7s)', '#38bdf8');
    syncCombatStatesToUI();
    return;
  }

  dummy.fists.forEach((f: any) => {
    f.isPunching = false;
    f.punchProgress = 0;
    f.isHeavy = false;
    f.hasHit = false;
  });

  dummy.attackLockedAngle = undefined;

  const punchType = dummy.styleId === 'basic' ? 'left' : ((dummy.styleId === 'street_boxing' && dummy.streetBoxingM2Stage === 3) ? 'left' : 'right');
  const fist = dummy.fists.find((f: any) => f.punchType === punchType) || dummy.fists[0];
  if (fist) {
    fist.isPunching = true;
    fist.punchProgress = 0;
    fist.isHeavy = true;
    fist.hasHit = false;
    (fist as any).kickboxingSeq2 = !!dummy.kickboxingIsSeq2;
  }

  if (dummy.styleId === 'street_boxing') {
    dummy.isDashing = false;
    dummy.dashProgress = 0;
    if (!dummy.streetBoxingM2Stage) dummy.streetBoxingM2Stage = 1;
  }

  if (dummy.styleId === 'kyokushin') {
    const rightFist = dummy.fists.find((f: any) => f.punchType === 'right');
    const leftFist = dummy.fists.find((f: any) => f.punchType === 'left');
    if (rightFist) {
      rightFist.isPunching = true;
      rightFist.punchProgress = 0;
      rightFist.isHeavy = true;
      rightFist.hasHit = false;
    }
    if (leftFist) {
      leftFist.isPunching = false;
      leftFist.punchProgress = 0;
      leftFist.isHeavy = false;
      leftFist.hasHit = true;
    }
    dummy.kyokushinM2PeakHoldTimer = 0;
    const glideSpeed = 5.0;
    dummy.vx += Math.cos(dummy.facingAngle) * glideSpeed;
    dummy.vy += Math.sin(dummy.facingAngle) * glideSpeed;
  }

  if (dummy.styleId === 'capoeira') {
    soundManager.playCapoeiraWhoosh();
  } else {
    soundManager.playDash();
  }
  dummy.heavyWindup = 0;

  if (dummy.styleId === 'shotokan') {
    dummy.isDashing = true;
    dummy.dashProgress = 24;
  }

  dummy.lightCooldown = 24;
  syncCombatStatesToUI();
}
