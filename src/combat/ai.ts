import { Fighter } from '../types';
import { CombatFighter, ArenaState } from './types';
import { getHeightModifiers } from '../utils/heightModifiers';
import { FIGHTING_STYLES } from '../data/styles';
import { soundManager } from '../components/SoundManager';
import { 
  updateFighterSteering,
  BASE_MOVEMENT_SPEED,
  BASE_COMBO_RESET_FRAMES,
  CAPOEIRA_COMBO_RESET_FRAMES,
  getStyleM1BetweenCooldown,
  getStylePostureCooldown,
  applyFighterPostureCooldown,
  grantFighterPostureReduction,
  executeIronBoxingS4InstantChain,
  applyGlobalM2RetractionOverride,
} from './combatEngine';

export interface AiCallbacks {
  spawnFloatingText: (x: number, y: number, text: string, color: string, isNetworkReceived?: boolean) => void;
  triggerFighterDash: (fighter: Fighter, target?: Fighter) => void;
}

export interface AiOptions {
  m1Speed?: 'slow' | 'medium' | 'fast';
  follow?: boolean;
}

/**
 * Normalizes an angle into [-Math.PI, Math.PI] range
 */
export const normalizeAngle = (a: number): number => {
  let res = a;
  while (res > Math.PI) res -= Math.PI * 2;
  while (res < -Math.PI) res += Math.PI * 2;
  return res;
};

/**
 * Section 3: 120-degree frontal vision cone limitation (±60° / ±Math.PI / 3).
 * Attacks coming from behind or blind angles bypass the bot's parry awareness completely.
 */
export const isOpponentInVisionCone = (fighter: CombatFighter, opponent: CombatFighter): boolean => {
  const dx = opponent.x - fighter.x;
  const dy = opponent.y - fighter.y;
  const angleToOpponent = Math.atan2(dy, dx);
  const diff = Math.abs(normalizeAngle(fighter.facingAngle - angleToOpponent));
  return diff <= (Math.PI / 3);
};

/**
 * Section 2: Visual Perception Delay (12-Frame Reaction Buffer / ~0.20s).
 * Strictly physics & state perception only (Zero input-reading).
 * During startup frames 0–11, the AI is physically blinded to incoming attacks.
 * At Frame 12+ (~0.20s threshold), visual perception allows defensive evaluation.
 */
export const evaluateOpponentAttackPerception = (
  fighter: CombatFighter,
  opponent: CombatFighter
): {
  isAttackActive: boolean;
  isVisuallyPerceived: boolean;
  isLightStrike: boolean;
  isHeavyWindup: boolean;
  isHeavyStrike: boolean;
  strikeId: string | null;
} => {
  const activeFist = opponent.fists.find(f => (f.isPunching || f.punchProgress > 0) && !f.hasHit);
  const isHeavyWindup = (opponent.heavyWindup || 0) > 0;
  const isLightStrike = !!(activeFist && !activeFist.isHeavy);
  const isHeavyStrike = !!(activeFist && activeFist.isHeavy);
  const isAttackActive = !!(activeFist || isHeavyWindup);

  if (!isAttackActive) {
    fighter.aiPerceivedAttackTicks = 0;
    fighter.aiLastObservedStrikeId = undefined;
    return {
      isAttackActive: false,
      isVisuallyPerceived: false,
      isLightStrike: false,
      isHeavyWindup: false,
      isHeavyStrike: false,
      strikeId: null
    };
  }

  // Generate unique ID for current attack instance to count frames cleanly without input snooping
  const currentStrikeId = isHeavyWindup 
    ? `heavy_windup_${opponent.heavyWindup}` 
    : `${activeFist?.punchType}_stage${activeFist?.comboStage || 0}_${activeFist?.isHeavy ? 'H' : 'L'}`;

  if (fighter.aiLastObservedStrikeId !== currentStrikeId) {
    fighter.aiLastObservedStrikeId = currentStrikeId;
    fighter.aiPerceivedAttackTicks = 1;
  } else {
    fighter.aiPerceivedAttackTicks = (fighter.aiPerceivedAttackTicks || 0) + 1;
  }

  // 12-Frame Reaction Threshold (~0.20s): AI is blinded during frames 0-11
  const ticks = fighter.aiPerceivedAttackTicks || 0;
  const punchTime = activeFist?.punchTimeSec || 0;
  const isVisuallyPerceived = ticks >= 12 || punchTime >= 0.19;

  return {
    isAttackActive,
    isVisuallyPerceived,
    isLightStrike,
    isHeavyWindup,
    isHeavyStrike,
    strikeId: currentStrikeId
  };
};

export const executeAiLightStrike = (fighter: CombatFighter, opponent: CombatFighter, state: ArenaState): boolean => {
  const canExecuteLight = 
    (fighter.lightCooldown || 0) <= 0 && 
    (fighter.postureCd || 0) <= 0 &&
    !fighter.isPostureLocked &&
    (fighter.strikeCooldown || 0) <= 0 && 
    (fighter.heavyWindup || 0) <= 0 &&
    (fighter.stunTime || 0) <= 0 && 
    !(fighter.parriedStun && fighter.parriedStun > 0) &&
    (fighter.armorBreakTime || 0) <= 0 && 
    (fighter.postBlockAttackLockout || 0) <= 0 &&
    !fighter.isDashing &&
    (fighter.dashProgress || 0) <= 0 &&
    (fighter.postDashAttackLockout || 0) <= 0 &&
    !(fighter.spinOutTimer && fighter.spinOutTimer > 0) &&
    !(fighter.kyokushinSpinOutTimer && fighter.kyokushinSpinOutTimer > 0) &&
    !(fighter.shellLockoutTimer && fighter.shellLockoutTimer > 0) &&
    !(fighter.shellSpinTimer && fighter.shellSpinTimer > 0) &&
    !fighter.capoeiraExhausted &&
    !(fighter.keysiAttackLockout && fighter.keysiAttackLockout > 0) &&
    !(fighter.cqcAttackLockout && fighter.cqcAttackLockout > 0) &&
    !fighter.aikiSlamStage &&
    !fighter.aikiSlamUninterruptible &&
    !(fighter.aikiLockoutTimer && fighter.aikiLockoutTimer > 0) &&
    !(fighter.aikiSpinDownTimer && fighter.aikiSpinDownTimer > 0) &&
    !fighter.keysiClinchStage &&
    !fighter.fists.some(f => f.isPunching);

  if (!canExecuteLight) return false;

  if (fighter.styleId === 'aikido' && fighter.aikiCounterSlamWindow && fighter.aikiCounterSlamWindow > 0) {
    fighter.aikiCounterSlamWindow = 0;
    fighter.aikiSlamStage = 'clamp';
    fighter.aikiSlamDamage = 10.0;
    fighter.aikiSlamTimer = 90;
    fighter.aikiSlamFrame = 0;
    fighter.aikiSlamBaseAngle = fighter.facingAngle;
    fighter.aikiSlamTarget = opponent as any;
    fighter.aikiIsFreeSlam = true;
    fighter.aikiSlamUninterruptible = true;
    opponent.aikiSlamUninterruptible = true;
    opponent.aikiSlamVictimStage = 'clamp';
    opponent.aikiOverheadScale = 1.0;
    fighter.vx = 0;
    fighter.vy = 0;
    opponent.vx = 0;
    opponent.vy = 0;
    fighter.fists.forEach(f => { f.isPunching = false; f.punchProgress = 0; f.lingerTimer = 0; f.isLingerActive = false; });
    opponent.fists.forEach(f => { f.isPunching = false; f.punchProgress = 0; f.lingerTimer = 0; f.isLingerActive = false; });
    soundManager.playParry();
    return true;
  }

  fighter.isBlocking = false;
  fighter.fists.forEach(f => {
    f.isHeavy = false;
    f.hasHit = false;
  });
  const currentStage = fighter.comboStage || 0;
  const concussLunge = (fighter.concussTime && fighter.concussTime > 0) ? 0.40 : 1.0;

  if (fighter.styleId === 'muay_thai') {
    if (currentStage === 0 || currentStage === 2) {
      const f = fighter.fists.find(拳 => 拳.punchType === 'right');
      if (f) { f.isPunching = true; f.punchProgress = 0; f.comboStage = currentStage; }
    } else {
      const f = fighter.fists.find(拳 => 拳.punchType === 'left');
      if (f) { f.isPunching = true; f.punchProgress = 0; f.comboStage = currentStage; }
    }
  } else if (fighter.styleId === 'kyokushin') {
    // KYOKUSHIN 4-COMBO MATRIX:
    // S1 (Stage 0): Left Fist (Chudan Seiken Tsuki)
    // S2 (Stage 1): Right Kick (Gedan Geri Calf Kick)
    // S3 (Stage 2): Left Palm (Shotei Uchi Open Palm)
    // S4 (Stage 3): Right Palm (Full-Charge Right Palm Finisher)
    if (currentStage === 0 || currentStage === 2) {
      const f = fighter.fists.find(拳 => 拳.punchType === 'left');
      if (f) { f.isPunching = true; f.punchProgress = 0; f.comboStage = currentStage; }
    } else {
      const f = fighter.fists.find(拳 => 拳.punchType === 'right');
      if (f) { f.isPunching = true; f.punchProgress = 0; f.comboStage = currentStage; }
    }
  } else if (fighter.styleId === 'slugger') {
    if (currentStage === 0 || currentStage === 2) {
      const f = fighter.fists.find(拳 => 拳.punchType === 'left');
      if (f) { f.isPunching = true; f.punchProgress = 0; f.comboStage = currentStage; }
    } else {
      const f = fighter.fists.find(拳 => 拳.punchType === 'right');
      if (f) { f.isPunching = true; f.punchProgress = 0; f.comboStage = currentStage; }
    }

  } else if (fighter.styleId === 'shotokan') {
    if (currentStage === 0) {
      const f = fighter.fists.find(拳 => 拳.punchType === 'left');
      if (f) { f.isPunching = true; f.punchProgress = 0; f.comboStage = 0; }
      fighter.vx += Math.cos(fighter.facingAngle) * (3.6 * concussLunge);
      fighter.vy += Math.sin(fighter.facingAngle) * (3.6 * concussLunge);
    } else if (currentStage === 1) {
      const f = fighter.fists.find(拳 => 拳.punchType === 'right');
      if (f) { f.isPunching = true; f.punchProgress = 0; f.comboStage = 1; }
      fighter.vx += Math.cos(fighter.facingAngle) * (3.2 * concussLunge);
      fighter.vy += Math.sin(fighter.facingAngle) * (3.2 * concussLunge);
    } else if (currentStage === 2) {
      const f = fighter.fists.find(拳 => 拳.punchType === 'left');
      if (f) { f.isPunching = true; f.punchProgress = 0; f.comboStage = 2; }
      fighter.vx += Math.cos(fighter.facingAngle) * (3.2 * concussLunge);
      fighter.vy += Math.sin(fighter.facingAngle) * (3.2 * concussLunge);
    } else if (currentStage === 3) {
      const f = fighter.fists.find(拳 => 拳.punchType === 'left');
      if (f) { f.isPunching = true; f.punchProgress = 0; f.comboStage = 3; }
      fighter.vx += Math.cos(fighter.facingAngle) * (2.2 * concussLunge);
      fighter.vy += Math.sin(fighter.facingAngle) * (2.2 * concussLunge);
    }
  } else if (fighter.styleId === 'ashihara') {
    if (currentStage === 1 || currentStage === 3) {
      const f = fighter.fists.find(拳 => 拳.punchType === 'right');
      if (f) { f.isPunching = true; f.punchProgress = 0; f.comboStage = currentStage; }
    } else {
      const f = fighter.fists.find(拳 => 拳.punchType === 'left');
      if (f) { f.isPunching = true; f.punchProgress = 0; f.comboStage = currentStage; }
    }
  } else if (fighter.styleId === 'capoeira') {
    if (currentStage === 0 || currentStage === 2) {
      const f = fighter.fists.find(拳 => 拳.punchType === 'left');
      if (f) { f.isPunching = true; f.punchProgress = 0; f.comboStage = currentStage; }
    } else {
      const f = fighter.fists.find(拳 => 拳.punchType === 'right');
      if (f) { f.isPunching = true; f.punchProgress = 0; f.comboStage = currentStage; }
    }
  } else if (fighter.styleId === 'street_taekwondo') {
    if (currentStage === 0 || currentStage === 2) {
      const f = fighter.fists.find(拳 => 拳.punchType === 'left');
      if (f) { f.isPunching = true; f.punchProgress = 0; f.comboStage = currentStage; }
      if (currentStage === 2) {
        fighter.tkdIFrameTimer = 24;
      }
    } else {
      const f = fighter.fists.find(拳 => 拳.punchType === 'right');
      if (f) { f.isPunching = true; f.punchProgress = 0; f.comboStage = currentStage; }
    }
  } else if (fighter.styleId === 'boxing_shell') {
    if (currentStage === 3) {
      executeIronBoxingS4InstantChain(fighter);
    }
    fighter.shellRetractionHoldTimer = 0;
    fighter.shellS3Primed = false;
    if (currentStage === 0 || currentStage === 1) {
      const f = fighter.fists.find(拳 => 拳.punchType === 'right');
      if (f) { f.isPunching = true; f.punchProgress = 0; f.comboStage = currentStage; }
    } else {
      const f = fighter.fists.find(拳 => 拳.punchType === 'left');
      if (f) { f.isPunching = true; f.punchProgress = 0; f.comboStage = currentStage; }
    }
  } else if (fighter.styleId === 'street_boxing') {
    if (currentStage === 0 || currentStage === 1) {
      const f = fighter.fists.find(拳 => 拳.punchType === 'left');
      if (f) { f.isPunching = true; f.punchProgress = 0; f.comboStage = currentStage; }
    } else if (currentStage === 2) {
      const f = fighter.fists.find(拳 => 拳.punchType === 'right');
      if (f) { f.isPunching = true; f.punchProgress = 0; f.comboStage = 2; }
    } else if (currentStage === 3) {
      const f = fighter.fists.find(拳 => 拳.punchType === 'right');
      if (f) { f.isPunching = true; f.punchProgress = 0; f.comboStage = 3; }
    }
  } else if (fighter.styleId === 'keysi') {
    // KEYSI 4-STAGE CQC CHAIN:
    // S1 (Stage 0): Lead Forearm Wedge (Left Fist - 4.5 HP)
    // S2 (Stage 1): Rear Forearm Smash (Right Fist - 4.5 HP)
    // S3 (Stage 2): Descending Elbow (Left Fist - 7.2 HP)
    // S4 (Stage 3): Heavy Pocket Knee (Right Fist - 9.6 HP, Primes M2!)
    if (currentStage === 0 || currentStage === 2) {
      const f = fighter.fists.find(拳 => 拳.punchType === 'left');
      if (f) { f.isPunching = true; f.punchProgress = 0; f.comboStage = currentStage; f.hasHit = false; }
    } else {
      const f = fighter.fists.find(拳 => 拳.punchType === 'right');
      if (f) { f.isPunching = true; f.punchProgress = 0; f.comboStage = currentStage; f.hasHit = false; }
    }
  } else if (fighter.styleId === 'basic') {
    if (currentStage === 0) {
      const f = fighter.fists.find(拳 => 拳.punchType === 'left');
      if (f) { f.isPunching = true; f.punchProgress = 0; f.comboStage = 0; }
    } else if (currentStage === 1) {
      const f = fighter.fists.find(拳 => 拳.punchType === 'right');
      if (f) { f.isPunching = true; f.punchProgress = 0; f.comboStage = 1; }
      if (fighter.flowS1Whiffed) {
        fighter.flowS2HasIFrames = true;
        fighter.flowS1Whiffed = false;
      }
    } else if (currentStage === 2) {
      const f = fighter.fists.find(拳 => 拳.punchType === 'right');
      if (f) { f.isPunching = true; f.punchProgress = 0; f.comboStage = 2; }
    } else if (currentStage === 3) {
      const f = fighter.fists.find(拳 => 拳.punchType === 'left');
      if (f) { f.isPunching = true; f.punchProgress = 0; f.comboStage = 3; }
    }
  } else if (fighter.styleId === 'aikido') {
    if (currentStage === 1) {
      const f = fighter.fists.find(拳 => 拳.punchType === 'left');
      if (f) { f.isPunching = true; f.punchProgress = 0; f.comboStage = currentStage; }
    } else {
      const f = fighter.fists.find(拳 => 拳.punchType === 'right');
      if (f) { f.isPunching = true; f.punchProgress = 0; f.comboStage = currentStage; }
    }
  } else {
    if (currentStage === 0 || currentStage === 2) {
      const f = fighter.fists.find(拳 => 拳.punchType === 'left');
      if (f) { f.isPunching = true; f.punchProgress = 0; f.comboStage = currentStage; f.hasHit = false; }
    } else {
      const f = fighter.fists.find(拳 => 拳.punchType === 'right');
      if (f) { f.isPunching = true; f.punchProgress = 0; f.comboStage = currentStage; f.hasHit = false; }
    }
  }

  fighter.kyokushinM2FreezeTimer = 0;
  const comboStages = 4;
  fighter.comboStage = (currentStage + 1) % comboStages;
  if (fighter.comboStage === 0) {
    fighter.aikiManualM2UsedInSequence = false;
  }
  fighter.comboResetTimer = fighter.styleId === 'capoeira' ? CAPOEIRA_COMBO_RESET_FRAMES : (fighter.styleId === 'slugger' ? 140 : BASE_COMBO_RESET_FRAMES);

  if (fighter.styleId === 'shotokan' && currentStage === 1) {
    fighter.shotokanRenZukiPending = true;
  }

  if (fighter.styleId === 'slugger' && fighter.hasKineticCounter && currentStage === 0) {
    fighter.hasKineticCounter = false;
    const punchingFist = fighter.fists.find(f => f.isPunching);
    if (punchingFist) punchingFist.isKineticCounter = true;
  }

  const fMods = getHeightModifiers(fighter.baseHeight);
  let momentumMult = 1.0;
  if (fighter.hasKickMomentum) {
    momentumMult = 1.08;
    if (fighter.comboStage === 0) {
      fighter.hasKickMomentum = false;
    }
  }

  if (fighter.styleId === 'kickboxing' && currentStage === 2) {
    fighter.vx += Math.cos(fighter.facingAngle) * 3.0;
    fighter.vy += Math.sin(fighter.facingAngle) * 3.0;
  }

  if (fighter.comboStage === 0) {
    applyFighterPostureCooldown(fighter, fMods.speedFactor, momentumMult);

    let s4HeavyDelay = 18;
    if (fighter.styleId === 'muay_thai') s4HeavyDelay = 9;
    if (fighter.styleId === 'slugger') s4HeavyDelay = 36;
    if (fighter.styleId === 'ashihara') s4HeavyDelay = 0;
    if (fighter.styleId === 'shotokan') s4HeavyDelay = 40;
    if (fighter.styleId === 'kyokushin') s4HeavyDelay = 20;
    if (fighter.styleId === 'capoeira') s4HeavyDelay = 6;
    if (fighter.styleId === 'kickboxing') s4HeavyDelay = 12;
    if (fighter.styleId === 'street_taekwondo') s4HeavyDelay = 20;
    if (fighter.styleId === 'keysi') s4HeavyDelay = 18;
    if (fighter.styleId === 'cqc') s4HeavyDelay = 12;
    fighter.postS4HeavyLockout = Math.round(s4HeavyDelay / fMods.speedFactor);
  } else {
    const betweenCooldown = getStyleM1BetweenCooldown(fighter.styleId, currentStage);
    fighter.lightCooldown = Math.round(betweenCooldown / (fMods.speedFactor * momentumMult));
    fighter.postureCd = 0;
    fighter.isPostureLocked = false;
    fighter.postS4HeavyLockout = 0;
  }

  return true;
};

export const executeAiHeavyStrike = (fighter: CombatFighter, opponent: CombatFighter, state: ArenaState): boolean => {
  const isKickboxingSeq2Ready = fighter.styleId === 'kickboxing' && (
    (fighter.kickboxingSeq2Ready && (fighter.kickboxingSeq2Window || 0) > 0) ||
    (fighter.kickboxingAutoSeq2Timer && fighter.kickboxingAutoSeq2Timer > 0)
  );

  const isIronBoxing = fighter.styleId === 'boxing_shell';

  const canExecuteHeavy = 
    (isKickboxingSeq2Ready || ((fighter.heavyCooldown || 0) <= 0 && (fighter.keysiVulnerableTimer || 0) <= 0)) && 
    (fighter.postS4HeavyLockout || 0) <= 0 && 
    (fighter.strikeCooldown || 0) <= 0 && 
    (fighter.heavyWindup || 0) <= 0 &&
    (fighter.stunTime || 0) <= 0 && 
    !(fighter.parriedStun && fighter.parriedStun > 0) &&
    (fighter.armorBreakTime || 0) <= 0 && 
    (isIronBoxing || (fighter.postBlockAttackLockout || 0) <= 0) &&
    !fighter.isDashing &&
    (fighter.dashProgress || 0) <= 0 &&
    (fighter.postDashAttackLockout || 0) <= 0 &&
    !(fighter.styleId === 'aikido' && fighter.aikiM2StanceTimer && fighter.aikiM2StanceTimer > 0) &&
    !(fighter.spinOutTimer && fighter.spinOutTimer > 0) &&
    !(fighter.kyokushinSpinOutTimer && fighter.kyokushinSpinOutTimer > 0) &&
    !(fighter.shellLockoutTimer && fighter.shellLockoutTimer > 0) &&
    !(fighter.shellSpinTimer && fighter.shellSpinTimer > 0) &&
    !fighter.capoeiraExhausted &&
    !(fighter.keysiAttackLockout && fighter.keysiAttackLockout > 0) &&
    !(fighter.cqcAttackLockout && fighter.cqcAttackLockout > 0) &&
    !fighter.fists.some(f => f.isPunching || f.punchProgress > 0);

  if (!canExecuteHeavy) return false;

  // Section 1.18: Global M2 Retraction Override
  applyGlobalM2RetractionOverride(fighter);
  fighter.isBlocking = false;
  const fMods = getHeightModifiers(fighter.baseHeight);

  if (isKickboxingSeq2Ready) {
    fighter.heavyWindup = 9;
    fighter.kickboxingIsSeq2 = true;
    fighter.kickboxingSeq2Ready = false;
    fighter.kickboxingSeq2Window = 0;
    fighter.kickboxingAutoSeq2Timer = 0;
    fighter.strikeCooldown = 0;
    fighter.fists.forEach(f => {
      f.isPunching = false;
      f.punchProgress = 0;
      f.lingerTimer = 0;
      f.isLingerActive = false;
      f.isHeavy = false;
    });
    return true;
  }

  let heavyWindupFrames = 48;
  if (fighter.styleId === 'street_boxing') {
    heavyWindupFrames = 24;
    fighter.isDashing = false;
    fighter.dashProgress = 0;
    fighter.streetBoxingM2Stage = 1;
    fighter.streetBoxingM2Hits = 0;
    fighter.streetBoxingUnbreakable = false;
    fighter.streetBoxingM2NextTimer = 0;
  }
  if (fighter.styleId === 'muay_thai') { heavyWindupFrames = 27; }
  if (fighter.styleId === 'ashihara') { heavyWindupFrames = 27; fighter.ashiharaM2Stage = 1; opponent.parryLockoutTimer = 60; }
  if (fighter.styleId === 'shotokan') {
    heavyWindupFrames = 30;
    fighter.isDashing = true;
    fighter.dashProgress = 30;
    const concussLunge = (fighter.concussTime && fighter.concussTime > 0) ? 0.40 : 1.0;
    const dashForce = 6.5 * concussLunge;
    fighter.vx = Math.cos(fighter.facingAngle) * dashForce;
    fighter.vy = Math.sin(fighter.facingAngle) * dashForce;
    fighter.attackLockedAngle = fighter.facingAngle;
  }
  if (fighter.styleId === 'basic') {
    if (fighter.hasReflexPivot) {
      heavyWindupFrames = 6;
      fighter.hasReflexPivot = false;
    } else {
      heavyWindupFrames = 24;
    }
    fighter.isDashing = false;
    fighter.dashProgress = 0;
    fighter.dashAngle = undefined;
    fighter.attackLockedAngle = fighter.facingAngle;
    const forwardSpeed = 7.5 * fMods.speedFactor;
    fighter.vx = Math.cos(fighter.facingAngle) * forwardSpeed;
    fighter.vy = Math.sin(fighter.facingAngle) * forwardSpeed;
  }
  if (fighter.styleId === 'capoeira') { heavyWindupFrames = 48; }
  if (fighter.styleId === 'slugger') { heavyWindupFrames = 48; }
  if (fighter.styleId === 'kyokushin') { heavyWindupFrames = 33; }
  if (fighter.styleId === 'boxing_shell') { heavyWindupFrames = 11; }
  if (fighter.styleId === 'keysi') {
    if (fighter.keysiM2Primed) {
      heavyWindupFrames = 6;
      fighter.keysiM2Primed = false;
      fighter.keysiHasSuperArmor = true;
      fighter.maxHeavyWindup = 6;
    } else {
      heavyWindupFrames = 26;
      fighter.keysiHasSuperArmor = false;
      fighter.maxHeavyWindup = 26;
    }
  }
  if (fighter.styleId === 'cqc') {
    heavyWindupFrames = 90;
    fighter.cqcM2Stage = 'windup';
    fighter.cqcWindupTimer = 90;
    fighter.cqcLockedTarget = null;
    fighter.cqcRings = Array.from({ length: 8 }, (_, i) => ({
      r: 0,
      maxR: Math.round(((i + 1) / 8) * 272),
      frozen: false
    }));
  }
  if (fighter.styleId === 'aikido') {
    heavyWindupFrames = 9;
    fighter.aikiM2StanceTimer = 300;
    fighter.aikiM2SuperArmorHits = 2;
    fighter.aikiM2HitLanded = false;
    fighter.aikiManualM2UsedInSequence = true;
  }
  if (fighter.styleId === 'street_taekwondo') {
    heavyWindupFrames = 26;
    fighter.tkdSpinDashActive = true;
    fighter.isDashing = true;
    fighter.dashProgress = heavyWindupFrames;
    const dashForce = 8.0 * fMods.speedFactor;
    fighter.vx = Math.cos(fighter.facingAngle) * dashForce;
    fighter.vy = Math.sin(fighter.facingAngle) * dashForce;
    fighter.attackLockedAngle = fighter.facingAngle;
  }
  if (fighter.styleId === 'kickboxing') {
    fighter.kickboxingIsSeq2 = false;
    if (fighter.hasChainReaction) {
      heavyWindupFrames = 15;
      fighter.hasChainReaction = false;
    } else {
      heavyWindupFrames = 26;
    }
  }

  if (fighter.keysiStaggerTimer && fighter.keysiStaggerTimer > 0) {
    heavyWindupFrames = Math.round(heavyWindupFrames * 1.60);
  }

  fighter.heavyWindup = heavyWindupFrames;
  return true;
};

export const navigateAiToSparringRange = (
  fighter: CombatFighter,
  opponent: CombatFighter,
  targetDistance: number = 80,
  speedMultiplier: number = 1.0
) => {
  if ((fighter.hitMovementLock && fighter.hitMovementLock > 0) || (fighter.parriedStun && fighter.parriedStun > 0) || (fighter.stunTime && fighter.stunTime > 0)) {
    fighter.isSprinting = false;
    return;
  }
  const effectiveTarget = (fighter.styleId === 'keysi' || fighter.styleId === 'cqc') ? 48 : targetDistance;
  const dx = opponent.x - fighter.x;
  const dy = opponent.y - fighter.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  const canSprint = (fighter.stamina || 100) > 15 && !fighter.isBlocking && (fighter.heavyWindup || 0) <= 0 && (fighter.stunTime || 0) <= 0 && (fighter.armorBreakTime || 0) <= 0 && (!fighter.postSprintDisable || fighter.postSprintDisable <= 0);
  if (dist > effectiveTarget + 40 && canSprint) {
    fighter.isSprinting = true;
  } else if (dist < effectiveTarget + 15 || fighter.isBlocking || (fighter.heavyWindup || 0) > 0) {
    fighter.isSprinting = false;
  }

  const sprintBoost = fighter.isSprinting ? 1.35 : 1.0;

  if (dist > effectiveTarget + 6) {
    const angle = Math.atan2(dy, dx);
    const accel = 0.32 * speedMultiplier * sprintBoost;
    fighter.vx += Math.cos(angle) * accel;
    fighter.vy += Math.sin(angle) * accel;
  } else if (dist < effectiveTarget - 16) {
    const angle = Math.atan2(dy, dx);
    const pushBack = 0.25 * speedMultiplier;
    fighter.vx -= Math.cos(angle) * pushBack;
    fighter.vy -= Math.sin(angle) * pushBack;
  }
  
  const maxSpd = BASE_MOVEMENT_SPEED * speedMultiplier * sprintBoost;
  const curSpd = Math.sqrt(fighter.vx * fighter.vx + fighter.vy * fighter.vy);
  if (curSpd > maxSpd) {
    fighter.vx = (fighter.vx / curSpd) * maxSpd;
    fighter.vy = (fighter.vy / curSpd) * maxSpd;
  }
};

/**
 * Main AI Behavior Engine (v1.7.6 Part 4: Fair-Play & Humanized Combat)
 */
export const updateFighterAI = (
  fighter: CombatFighter,
  opponent: CombatFighter,
  behaviorTier: string,
  state: ArenaState,
  callbacks: AiCallbacks,
  options?: AiOptions
) => {
  if (!fighter || fighter.isDead || !opponent || opponent.isDead || (fighter.stunTime && fighter.stunTime > 0) || fighter.capoeiraExhausted || (fighter.spinOutTimer && fighter.spinOutTimer > 0) || (fighter.kyokushinSpinOutTimer && fighter.kyokushinSpinOutTimer > 0) || (fighter.shellLockoutTimer && fighter.shellLockoutTimer > 0) || (fighter.shellSpinTimer && fighter.shellSpinTimer > 0) || fighter.aikiSlamStage || fighter.aikiSlamUninterruptible || (fighter.aikiLockoutTimer && fighter.aikiLockoutTimer > 0) || (fighter.aikiSpinDownTimer && fighter.aikiSpinDownTimer > 0)) return;

  const { spawnFloatingText, triggerFighterDash } = callbacks;

  // Section 4: Natural Defense: When the PLAYER Parries the AI
  // The bot is NOT artificially paralyzed. It assesses its situation dynamically with full human survival agency:
  if (fighter.parriedStun && fighter.parriedStun > 0) {
    fighter.isSprinting = false;
    if (!fighter.isDashing) {
      fighter.vx = 0;
      fighter.vy = 0;
    }
    if (!fighter.aiPostParryDecided) {
      const roll = Math.random();
      if (behaviorTier === 'amethyst') {
        fighter.aiPostParryChoice = roll < 0.38 ? 'counter_parry' : (roll < 0.72 ? 'evade_dash' : 'guard_backpedal');
      } else if (behaviorTier === 'diamond') {
        fighter.aiPostParryChoice = roll < 0.28 ? 'counter_parry' : (roll < 0.62 ? 'evade_dash' : 'guard_backpedal');
      } else if (behaviorTier === 'gold') {
        fighter.aiPostParryChoice = roll < 0.18 ? 'counter_parry' : (roll < 0.50 ? 'evade_dash' : 'guard_backpedal');
      } else if (behaviorTier === 'silver') {
        fighter.aiPostParryChoice = roll < 0.08 ? 'counter_parry' : (roll < 0.38 ? 'evade_dash' : 'guard_backpedal');
      } else {
        fighter.aiPostParryChoice = 'guard_backpedal';
      }
      fighter.aiPostParryDecided = true;
    }

    const perception = evaluateOpponentAttackPerception(fighter, opponent);
    const inVision = isOpponentInVisionCone(fighter, opponent);

    // Reaction 1 — The Counter-Parry: If player throws predictable counter-hit, time a parry
    if (fighter.aiPostParryChoice === 'counter_parry' && inVision && perception.isAttackActive && perception.isVisuallyPerceived) {
      if ((fighter.blockLockout || 0) <= 0) {
        fighter.isBlocking = true;
        fighter.blockTimer = 0; // Fresh parry window
      }
    }
    // Reaction 2 — Evasive Dash-Out: Use White Frames to slip away from pocket
    else if (fighter.aiPostParryChoice === 'evade_dash' && (!fighter.dashCooldown || fighter.dashCooldown <= 0) && !fighter.isDashing) {
      triggerFighterDash(fighter, opponent);
    }
    // Reaction 3 — Guard: Immediately raise guard to absorb chip damage in the pocket
    else if (fighter.aiPostParryChoice === 'guard_backpedal') {
      if ((fighter.blockLockout || 0) <= 0) {
        fighter.isBlocking = true;
        fighter.blockTimer = Math.max(fighter.blockTimer || 0, 18);
      }
      fighter.isSprinting = false;
      // Parried Stun Rule: Cannot walk away while parried! Stays in the pocket with guard raised.
    }
    return;
  } else {
    fighter.aiPostParryDecided = false;
  }

  // Increment clock timers
  if (fighter.armorBreakTime && fighter.armorBreakTime > 0) {
    fighter.armorBreakTime--;
    fighter.isBlocking = false;
    return; // stunned
  }

  // If winding up a heavy attack, allow authoritative physics to progress windup & execute
  if (fighter.heavyWindup && fighter.heavyWindup > 0) {
    return;
  }

  // 0. TEST AI (INFINITE HP) - DOES NOTHING BUT STAY STILL, NOTHING ELSE
  if (behaviorTier === 'test_ai') {
    fighter.vx = 0;
    fighter.vy = 0;
    fighter.targetX = fighter.x;
    fighter.targetY = fighter.y;
    fighter.isBlocking = false;
    fighter.isDashing = false;
    fighter.isSprinting = false;
    fighter.health = fighter.maxHealth;
    fighter.isDead = false;
    fighter.armorHP = 18;
    fighter.armorBreakTime = 0;
    fighter.stunTime = 0;
    fighter.fists.forEach(f => {
      f.isPunching = false;
      f.punchProgress = 0;
      f.isHeavy = false;
      f.hasHit = false;
    });
    return;
  }

  // 1. PASSIVE DUMMY
  if (behaviorTier === 'passive') {
    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    updateFighterSteering(fighter, Math.atan2(dy, dx));
    if (options?.follow) {
      navigateAiToSparringRange(fighter, opponent, (fighter.radius + opponent.radius) * 1.5, 0.85);
    } else {
      fighter.vx *= 0.8;
      fighter.vy *= 0.8;
    }
    fighter.isBlocking = false;
    
    if (state.gameTime % 4 === 0 && (fighter.armorHP || 18) < 18) {
      fighter.armorHP = Math.min(18, (fighter.armorHP || 18) + 0.2);
    }
    return;
  }

  // 2. ACTIVE GUARD: MINDLESS
  if (behaviorTier === 'active_guard_mindless') {
    if (!fighter.mindlessAngleSet) {
      fighter.facingAngle = Math.PI;
      fighter.mindlessAngleSet = true;
    }
    fighter.vx *= 0.8;
    fighter.vy *= 0.8;
    fighter.isBlocking = true;
    if (state.gameTime % 6 === 0 && (fighter.armorHP || 0) < 18) {
      fighter.armorHP = Math.min(18, (fighter.armorHP || 0) + 0.35);
    }
    return;
  }

  // 3. ACTIVE GUARD: SENTIENT (or legacy 'block')
  if (behaviorTier === 'active_guard_sentient' || behaviorTier === 'block') {
    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    updateFighterSteering(fighter, Math.atan2(dy, dx));
    if (options?.follow) {
      navigateAiToSparringRange(fighter, opponent, (fighter.radius + opponent.radius) * 1.5, 0.85);
    } else {
      fighter.vx *= 0.8;
      fighter.vy *= 0.8;
    }
    fighter.isBlocking = true;
    
    if (state.gameTime % 6 === 0 && (fighter.armorHP || 0) < 18) {
      fighter.armorHP = Math.min(18, (fighter.armorHP || 0) + 0.35);
    }
    return;
  }

  // 4. ACTIVE GUARD: AUTO PARRY (Practice Dojo Auto Parry Mode)
  if (behaviorTier === 'auto_parry') {
    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    // Direct, instant angle tracking so directional block checks never get bypassed by flank movement
    fighter.facingAngle = Math.atan2(dy, dx);

    if (options?.follow) {
      navigateAiToSparringRange(fighter, opponent, (fighter.radius + opponent.radius) * 1.5, 0.7);
    } else {
      fighter.vx *= 0.8;
      fighter.vy *= 0.8;
    }

    // Clear all lockout debuffs so Practice Auto Parry dummy is always 100% primed to parry
    fighter.parryLockoutTimer = 0;
    fighter.keysiVulnerableTimer = 0;
    fighter.blockLockout = 0;
    fighter.postBlockAttackLockout = 0;
    fighter.ashiharaParryLockout = 0;

    const activeFists = opponent.fists.filter(f => (f.isPunching || f.punchProgress > 0) && !f.hasHit);
    const isHeavyWindup = (opponent.heavyWindup || 0) > 0;
    const isHeavyStrikeActive = activeFists.some(f => f.isHeavy);
    const isLightStrikeActive = activeFists.some(f => !f.isHeavy);
    const isCqcM2 = opponent.cqcM2Stage !== null && opponent.cqcM2Stage !== undefined;
    const isKeysiClinch = (opponent.styleId === 'keysi' && (opponent.keysiClinchStage !== null || opponent.keysiM2Primed));

    if (isCqcM2) {
      if (opponent.cqcM2Stage === 'assault') {
        fighter.isBlocking = true;
        fighter.cqcWasBlockingAtHit4 = false;
        fighter.blockTimer = 0;
      } else {
        fighter.isBlocking = true;
        fighter.blockTimer = 0;
      }
    } else if (isHeavyWindup) {
      // During heavy windups, hold guard ready and continuously reset blockTimer to 0
      // so when the heavy strike releases, the 0.19s parry window is 100% fresh
      fighter.isBlocking = true;
      fighter.blockTimer = 0;
    } else if (isHeavyStrikeActive || isLightStrikeActive || isKeysiClinch) {
      // Active strike in flight: maintain tight guard with fresh 0.19s parry window
      fighter.isBlocking = true;
      fighter.blockTimer = 0;
    } else {
      fighter.isBlocking = false;
      fighter.blockTimer = 0;
    }

    if (state.gameTime % 6 === 0 && (fighter.armorHP || 0) < 18) {
      fighter.armorHP = Math.min(18, (fighter.armorHP || 0) + 0.35);
    }
    return;
  }

  // 5. ACTIVE ATTACK: ATTACK M1
  if (behaviorTier === 'attack_m1') {
    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    updateFighterSteering(fighter, Math.atan2(dy, dx));
    if (options?.follow) {
      navigateAiToSparringRange(fighter, opponent, (fighter.radius + opponent.radius) * 1.5, 0.9);
    } else {
      fighter.vx *= 0.8;
      fighter.vy *= 0.8;
    }

    fighter.decisionTimer = (fighter.decisionTimer || 0) - 1;

    const m1Speed = options?.m1Speed || 'medium';
    let inputDelay = 28;
    if (m1Speed === 'slow') inputDelay = 58;
    if (m1Speed === 'fast') inputDelay = 10;

    if (fighter.decisionTimer <= 0) {
      const executed = executeAiLightStrike(fighter, opponent, state);
      if (executed) {
        fighter.decisionTimer = inputDelay;
      }
    }
    return;
  }

  // 6. ACTIVE ATTACK: ATTACK M2
  if (behaviorTier === 'attack_m2') {
    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    updateFighterSteering(fighter, Math.atan2(dy, dx));
    if (options?.follow) {
      navigateAiToSparringRange(fighter, opponent, (fighter.radius + opponent.radius) * 1.5, 0.9);
    } else {
      fighter.vx *= 0.8;
      fighter.vy *= 0.8;
    }

    if ((fighter.heavyCooldown || 0) <= 0 && (fighter.heavyWindup || 0) <= 0) {
      executeAiHeavyStrike(fighter, opponent, state);
    }
    return;
  }

  // 7. ACTIVE ATTACK: ATTACK M1 ON USER BLOCK
  if (behaviorTier === 'attack_m1_on_block') {
    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    updateFighterSteering(fighter, Math.atan2(dy, dx));
    if (options?.follow) {
      navigateAiToSparringRange(fighter, opponent, (fighter.radius + opponent.radius) * 1.5, 0.95);
    } else {
      fighter.vx *= 0.8;
      fighter.vy *= 0.8;
    }

    const userIsGuarding = opponent.isBlocking && (opponent.armorBreakTime || 0) <= 0;
    if (userIsGuarding) {
      executeAiLightStrike(fighter, opponent, state);
    }
    return;
  }

  // 8. ACTIVE ATTACK: ATTACK M2 ON USER BLOCK
  if (behaviorTier === 'attack_m2_on_block') {
    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    updateFighterSteering(fighter, Math.atan2(dy, dx));
    if (options?.follow) {
      navigateAiToSparringRange(fighter, opponent, (fighter.radius + opponent.radius) * 1.5, 0.95);
    } else {
      fighter.vx *= 0.8;
      fighter.vy *= 0.8;
    }

    const userIsGuarding = opponent.isBlocking && (opponent.armorBreakTime || 0) <= 0;
    if (userIsGuarding) {
      if ((fighter.heavyCooldown || 0) <= 0 && (fighter.heavyWindup || 0) <= 0) {
        executeAiHeavyStrike(fighter, opponent, state);
      }
    }
    return;
  }

  // 9. RANKED SPARRING AI TIERS (Rookie, Silver, Gold, Diamond, Amethyst)
  if (behaviorTier === 'rookie' || behaviorTier === 'silver' || behaviorTier === 'gold' || behaviorTier === 'diamond' || behaviorTier === 'amethyst') {
    const dx = opponent.x - fighter.x;
    const dy = opponent.y - fighter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angleToOpponent = Math.atan2(dy, dx);
    
    updateFighterSteering(fighter, angleToOpponent);
    fighter.decisionTimer = (fighter.decisionTimer || 0) - 1;

    // Section 1 & 2: Observable Visual Perception (Zero Input-Reading)
    const perception = evaluateOpponentAttackPerception(fighter, opponent);
    const inVisionCone = isOpponentInVisionCone(fighter, opponent);

    const oppIsBlocking = opponent.isBlocking && (opponent.armorBreakTime || 0) <= 0;
    const oppIsParrying = (opponent.parryFlashTime && opponent.parryFlashTime > 0) || (opponent.styleId === 'ashihara' && (opponent.heavyWindup || 0) > 0);
    const oppWhiffing = opponent.fists.some(f => f.isPunching && !f.hasHit && f.punchProgress > 0.45) || (opponent.postBlockAttackLockout || 0) > 0;
    const oppIsVulnerable = (opponent.postureCd && opponent.postureCd > 0) || opponent.isPostureLocked || (opponent.armorBreakTime || 0) > 0 || (opponent.stunTime || 0) > 0 || (opponent.concussTime || 0) > 0;

    const fighterCanDash = (!fighter.dashCooldown || fighter.dashCooldown <= 0) && !fighter.isDashing && (!fighter.concussTime || fighter.concussTime <= 0) && (fighter.stunTime || 0) <= 0 && (fighter.armorBreakTime || 0) <= 0;
    const fighterCanBlock = (fighter.armorBreakTime || 0) <= 0 && (fighter.stunTime || 0) <= 0 && !fighter.capoeiraExhausted && (fighter.postBlockAttackLockout || 0) <= 0;
    const fighterCanHeavy = (fighter.heavyCooldown || 0) <= 0 && (fighter.keysiVulnerableTimer || 0) <= 0 && (fighter.postS4HeavyLockout || 0) <= 0 && (fighter.strikeCooldown || 0) <= 0 && (fighter.heavyWindup || 0) <= 0 && (fighter.stunTime || 0) <= 0 && (fighter.armorBreakTime || 0) <= 0;

    if ((fighter.feintTimer || 0) > 0) {
      fighter.feintTimer = (fighter.feintTimer || 0) - 1;
      if (fighter.feintTimer === 0) {
        fighter.isFeinting = false;
      }
    }
    if ((fighter.feintCooldown || 0) > 0) {
      fighter.feintCooldown = (fighter.feintCooldown || 0) - 1;
    }

    // --- STYLE-SPECIFIC COUNTER DEFENSE MATRIX ---
    // 1. Ashihara Sabaki Counter
    if (fighter.styleId === 'ashihara' && fighterCanHeavy && inVisionCone && perception.isAttackActive && perception.isVisuallyPerceived && dist < (fighter.radius + opponent.radius) * 2.3) {
      if (!(fighter.ashiharaParryLockout && fighter.ashiharaParryLockout > 0)) {
        const parryChance = behaviorTier === 'amethyst' ? 0.38 : behaviorTier === 'diamond' ? 0.26 : behaviorTier === 'gold' ? 0.15 : behaviorTier === 'silver' ? 0.06 : 0.01;
        if (Math.random() < parryChance) {
          fighter.isBlocking = false;
          fighter.heavyWindup = 27;
          fighter.ashiharaM2Stage = 1;
          fighter.ashiharaM2Timer = 27;
          fighter.ashiharaParryLockout = 48;
          return;
        }
      }
    }

    // 2. Iron Boxing (Philly Shell) M2 Shoulder Roll Parry Counter
    if (fighter.styleId === 'boxing_shell' && fighterCanHeavy && inVisionCone && perception.isAttackActive && perception.isVisuallyPerceived && dist < (fighter.radius + opponent.radius) * 2.2) {
      const shellParryChance = behaviorTier === 'amethyst' ? 0.36 : behaviorTier === 'diamond' ? 0.24 : behaviorTier === 'gold' ? 0.14 : behaviorTier === 'silver' ? 0.05 : 0.01;
      if (Math.random() < shellParryChance) {
        fighter.isBlocking = false;
        fighter.heavyWindup = 11;
        return;
      }
    }

    // 4. Shotokan Ushiro-Mawashi-Geri I-Frame Kick Counter
    if (fighter.styleId === 'shotokan' && fighterCanHeavy && inVisionCone && (perception.isLightStrike || perception.isHeavyWindup) && perception.isVisuallyPerceived && dist < (fighter.radius + opponent.radius) * 2.2) {
      const kickChance = behaviorTier === 'amethyst' ? 0.32 : behaviorTier === 'diamond' ? 0.20 : behaviorTier === 'gold' ? 0.12 : behaviorTier === 'silver' ? 0.04 : 0.01;
      if (Math.random() < kickChance) {
        fighter.isBlocking = false;
        fighter.heavyWindup = 26;
        return;
      }
    }

    // Section 3: Rhythmic Internal Metronome & Humanized Reactionary Guard
    // Whiff Vulnerabilities & Feint Traps (Flow Boxing S3, Sway Sprint feint, or player feint)
    const oppIsFeinting = opponent.isFeinting || (opponent.styleId === 'basic' && (opponent.comboStage === 2 || (opponent.dashProgress && opponent.dashProgress > 0)));

    if (oppIsFeinting && inVisionCone && dist < (fighter.radius + opponent.radius) * 2.5 && Math.random() < (behaviorTier === 'amethyst' ? 0.60 : behaviorTier === 'diamond' ? 0.50 : 0.35)) {
      // Baited by feint! Fires early parry whose 0.19s window will expire before follow-up lands
      fighter.isBlocking = true;
      fighter.blockTimer = 0;
    } else if (perception.isAttackActive && perception.isVisuallyPerceived && fighterCanBlock) {
      // 12-Frame Reaction Threshold Reached (~0.20s physiological limit)
      const parryRoll = Math.random();
      const parryProb = 
        !inVisionCone ? 0.0 : // Vision Cone Limitation (120° frontal cone: 0% parry from blind angles / behind)
        behaviorTier === 'amethyst' ? 0.24 :
        behaviorTier === 'diamond' ? 0.16 :
        behaviorTier === 'gold' ? 0.08 :
        behaviorTier === 'silver' ? 0.03 : 0.0;

      const blockProb = 
        behaviorTier === 'amethyst' ? 0.80 :
        behaviorTier === 'diamond' ? 0.68 :
        behaviorTier === 'gold' ? 0.54 :
        behaviorTier === 'silver' ? 0.38 : 0.22;

      if (perception.isLightStrike) {
        if (parryRoll < parryProb) {
          fighter.isBlocking = true;
          fighter.blockTimer = 0; // Timed parry window
        } else if (parryRoll < blockProb) {
          fighter.isBlocking = true;
          fighter.blockTimer = Math.max(fighter.blockTimer || 0, 18); // Regular block
        }
      } else if (perception.isHeavyWindup || perception.isHeavyStrike) {
        const dodgeRoll = Math.random();
        const dodgeProb = 
          behaviorTier === 'amethyst' ? 0.68 :
          behaviorTier === 'diamond' ? 0.52 :
          behaviorTier === 'gold' ? 0.36 :
          behaviorTier === 'silver' ? 0.20 : 0.08;

        if (dodgeRoll < dodgeProb && fighterCanDash) {
          triggerFighterDash(fighter, opponent);
        } else {
          const blockRoll = Math.random();
          const blockProb = 
            behaviorTier === 'amethyst' ? 0.30 :
            behaviorTier === 'diamond' ? 0.45 :
            behaviorTier === 'gold' ? 0.60 : 0.45;
          fighter.isBlocking = blockRoll < blockProb;
          if (fighter.isBlocking) {
            fighter.blockTimer = Math.max(fighter.blockTimer || 0, 18);
          }
        }
      }
    } else if (!perception.isAttackActive && fighter.isBlocking) {
      const dropGuardProb = 
        behaviorTier === 'amethyst' ? 0.55 :
        behaviorTier === 'diamond' ? 0.40 :
        behaviorTier === 'gold' ? 0.25 :
        behaviorTier === 'silver' ? 0.15 : 0.08;

      if (Math.random() < dropGuardProb) {
        fighter.isBlocking = false;
      }
    }

    // --- OFFENSIVE & TACTICAL DECISIONS ---
    if (fighter.decisionTimer <= 0) {
      if (behaviorTier === 'rookie') fighter.decisionTimer = 12 + Math.random() * 12; 
      else if (behaviorTier === 'silver') fighter.decisionTimer = 7 + Math.random() * 8; 
      else if (behaviorTier === 'gold') fighter.decisionTimer = 4 + Math.random() * 5; 
      else if (behaviorTier === 'diamond') fighter.decisionTimer = 2 + Math.random() * 3; 
      else if (behaviorTier === 'amethyst') fighter.decisionTimer = 1 + Math.random() * 2;

      let reachMult = 1.0;
      if (fighter.styleId === 'slugger' || fighter.styleId === 'capoeira') reachMult = 1.25;
      if (fighter.styleId === 'shotokan' || fighter.styleId === 'street_taekwondo' || fighter.styleId === 'kickboxing') reachMult = 1.15;
      if (fighter.styleId === 'muay_thai') reachMult = 0.85;
      if (fighter.styleId === 'keysi') reachMult = 0.55;

      const isKeysi = fighter.styleId === 'keysi';
      const strikeRange = isKeysi 
        ? (fighter.radius + opponent.radius + 24) // Inside pocket (~72px)
        : (fighter.radius + opponent.radius) * 2.2 * reachMult;
      const inMeleeRange = dist <= strikeRange;

      const isKickboxingSeq2Ready = fighter.styleId === 'kickboxing' && (
        (fighter.kickboxingSeq2Ready && (fighter.kickboxingSeq2Window || 0) > 0) ||
        (fighter.kickboxingAutoSeq2Timer && fighter.kickboxingAutoSeq2Timer > 0)
      );

      const isIronBoxing = fighter.styleId === 'boxing_shell';

      const canExecuteHeavy = 
        (isKickboxingSeq2Ready || ((fighter.heavyCooldown || 0) <= 0 && (fighter.keysiVulnerableTimer || 0) <= 0)) && 
        (fighter.postS4HeavyLockout || 0) <= 0 && 
        (fighter.strikeCooldown || 0) <= 0 && 
        (fighter.heavyWindup || 0) <= 0 &&
        (fighter.stunTime || 0) <= 0 && 
        (fighter.armorBreakTime || 0) <= 0 && 
        (isIronBoxing || (fighter.postBlockAttackLockout || 0) <= 0) &&
        !(fighter.spinOutTimer && fighter.spinOutTimer > 0) &&
        !(fighter.kyokushinSpinOutTimer && fighter.kyokushinSpinOutTimer > 0) &&
        !(fighter.shellLockoutTimer && fighter.shellLockoutTimer > 0) &&
        !(fighter.shellSpinTimer && fighter.shellSpinTimer > 0) &&
        !fighter.capoeiraExhausted &&
        !(fighter.keysiAttackLockout && fighter.keysiAttackLockout > 0) &&
        !(fighter.cqcAttackLockout && fighter.cqcAttackLockout > 0) &&
        !fighter.fists.some(f => f.isPunching);

      const canFeint = (!fighter.feintCooldown || fighter.feintCooldown <= 0) && !fighter.isFeinting && !fighter.isBlocking && (fighter.heavyWindup || 0) <= 0 && !fighter.fists.some(f => f.isPunching) && (!fighter.concussTime || fighter.concussTime <= 0) && !(fighter.shellLockoutTimer && fighter.shellLockoutTimer > 0);

      // 1. Kickboxing Dazing Hook -> Seq 2 Teep Kick Priority Confirm
      if (isKickboxingSeq2Ready && canExecuteHeavy && dist < strikeRange * 1.3) {
        executeAiHeavyStrike(fighter, opponent, state);
        return;
      }

      // 2. CQC Tactical Scan Initiation
      if (fighter.styleId === 'cqc' && canExecuteHeavy && dist > strikeRange * 0.9 && dist < 192 && Math.random() < (behaviorTier === 'amethyst' ? 0.70 : behaviorTier === 'diamond' ? 0.55 : 0.35)) {
        executeAiHeavyStrike(fighter, opponent, state);
        return;
      }

      // 3. AI Feint & Baiting
      if (canFeint && (behaviorTier === 'amethyst' || behaviorTier === 'diamond' || behaviorTier === 'gold') && dist < strikeRange * 1.5 && dist > strikeRange * 0.65) {
        const feintProb = behaviorTier === 'amethyst' ? 0.30 : behaviorTier === 'diamond' ? 0.20 : 0.12;
        if (Math.random() < feintProb) {
          fighter.isFeinting = true;
          fighter.feintTimer = 10 + Math.floor(Math.random() * 4);
          fighter.feintCooldown = 150 + Math.floor(Math.random() * 50);
          fighter.isBlocking = false;
          soundManager.playDash();
        }
      }

      // 4. Whiff / Parried Punishment Exploitation (Section 5: Fair Punishment)
      const oppParriedLag = (opponent.parriedStun && opponent.parriedStun > 0) || (opponent.postBlockAttackLockout || 0) > 0;
      if (oppParriedLag && dist < strikeRange * 1.5) {
        const punishRoll = Math.random();
        // Option A: Fast Lead M1 Punish
        if (punishRoll < 0.60) {
          if (inMeleeRange) {
            executeAiLightStrike(fighter, opponent, state);
            return;
          } else if (fighterCanDash) {
            triggerFighterDash(fighter, opponent);
          }
        }
        // Option B: Heavy M2 Punish (if opponent in heavy lag)
        else if (punishRoll < 0.88 && canExecuteHeavy) {
          if (inMeleeRange) {
            executeAiHeavyStrike(fighter, opponent, state);
            return;
          } else if (fighterCanDash) {
            triggerFighterDash(fighter, opponent);
          }
        }
        // Option C: Bait & Neutral Reset
        else {
          fighter.isBlocking = false;
        }
      }

      if (oppWhiffing && dist < strikeRange * 1.5 && canExecuteHeavy) {
        const punishProb = behaviorTier === 'amethyst' ? 0.98 : behaviorTier === 'diamond' ? 0.88 : behaviorTier === 'gold' ? 0.70 : (behaviorTier === 'silver' ? 0.48 : 0.28);
        if (Math.random() < punishProb) {
          if (dist > strikeRange * 0.8 && fighterCanDash) {
            triggerFighterDash(fighter, opponent);
          }
          if (dist <= strikeRange) {
            executeAiHeavyStrike(fighter, opponent, state);
          }
        }
      }

      // 5. Punish Vulnerable / Posture Locked Opponents
      if (oppIsVulnerable && dist < strikeRange * 1.8) {
        if (dist > strikeRange * 0.8 && fighterCanDash) {
          triggerFighterDash(fighter, opponent);
        }
        if (inMeleeRange) {
          if (canExecuteHeavy && Math.random() < 0.65) {
            executeAiHeavyStrike(fighter, opponent, state);
          } else {
            executeAiLightStrike(fighter, opponent, state);
          }
          return;
        }
      }

      // 6. In-Melee Range Action Selection
      if (inMeleeRange && !fighter.isFeinting) {
        const roll = Math.random();

        // Keysi Clinch Surge Priority: If primed from dash/S4, immediately fire 0.1s super armor M2 headbutt!
        if (isKeysi && fighter.keysiM2Primed && canExecuteHeavy) {
          executeAiHeavyStrike(fighter, opponent, state);
          return;
        }

        let attemptDodge = behaviorTier === 'amethyst' ? 0.22 : behaviorTier === 'diamond' ? 0.18 : behaviorTier === 'gold' ? 0.14 : (behaviorTier === 'silver' ? 0.08 : 0.04);
        let attemptHeavy = behaviorTier === 'amethyst' ? 0.45 : behaviorTier === 'diamond' ? 0.40 : behaviorTier === 'gold' ? 0.34 : (behaviorTier === 'silver' ? 0.28 : 0.20);
        let attemptLight = behaviorTier === 'amethyst' ? 0.98 : behaviorTier === 'diamond' ? 0.92 : behaviorTier === 'gold' ? 0.86 : (behaviorTier === 'silver' ? 0.78 : 0.65);

        if (isKeysi) {
          attemptHeavy = 0.50;
          attemptLight = 0.99; // Relentless inside pocket combos
        }

        if (oppIsBlocking) {
          attemptHeavy = Math.min(0.75, attemptHeavy + 0.30);
          attemptLight = 0.98;
        }

        const parryBaitHesitate = oppIsParrying && (behaviorTier === 'amethyst' || behaviorTier === 'diamond' || behaviorTier === 'gold') && Math.random() < 0.35;

        if (roll < attemptDodge && fighterCanDash && (perception.isHeavyWindup || fighter.health < 40)) {
          triggerFighterDash(fighter, opponent);
        } else if (!parryBaitHesitate && roll < attemptHeavy && canExecuteHeavy) {
          executeAiHeavyStrike(fighter, opponent, state);
        } else if (!parryBaitHesitate && roll < attemptLight) {
          executeAiLightStrike(fighter, opponent, state);
        } else {
          if ((fighter.lightCooldown || 0) > 0 || (fighter.strikeCooldown || 0) > 0 || (fighter.heavyCooldown || 0) > 0) {
            fighter.isBlocking = fighterCanBlock;
          }
        }
      } else {
        fighter.isBlocking = false;

        // Keysi AI: Intercepting Slip Dash into pocket to prime M2 Clinch
        if (isKeysi && dist > 55 && dist < 240 && fighterCanDash && Math.random() < (behaviorTier === 'amethyst' ? 0.65 : behaviorTier === 'diamond' ? 0.50 : 0.35)) {
          triggerFighterDash(fighter, opponent);
        }

        // Iron Boxing: Tactical Dash for Posture Refund
        if (fighter.styleId === 'boxing_shell' && (fighter.postureCd || 0) > 20 && fighterCanDash && Math.random() < 0.40) {
          triggerFighterDash(fighter, opponent);
        }

        const dashEntryDistance = (fighter.styleId === 'shotokan' || fighter.styleId === 'street_boxing' || fighter.styleId === 'cqc') ? 220 : 250;
        if ((behaviorTier === 'amethyst' || behaviorTier === 'diamond' || behaviorTier === 'gold') && dist > dashEntryDistance && fighterCanDash && (!fighter.concussTime || fighter.concussTime <= 0) && Math.random() < (behaviorTier === 'amethyst' ? 0.45 : behaviorTier === 'diamond' ? 0.35 : 0.22)) {
          const rushAngle = angleToOpponent + (Math.random() * 0.2 - 0.1);
          const styleObj = FIGHTING_STYLES.find(s => s.id === fighter.styleId) || FIGHTING_STYLES[0];
          let styleSpeed = styleObj.statModifiers?.speed ?? 1.0;
          if (fighter.styleId === 'kyokushin') styleSpeed = 1.0;
          const rushForce = 8.5 * styleSpeed;
          fighter.vx = Math.cos(rushAngle) * rushForce;
          fighter.vy = Math.sin(rushAngle) * rushForce;
          fighter.isDashing = true;
          fighter.dashProgress = 9;
          fighter.dashCooldown = fighter.styleId === 'capoeira' ? 58 : 90;
          if (fighter.styleId === 'boxing_shell') {
            const maxPosture = fighter.maxPostureCd || 72;
            const refundAmount = Math.max(1, Math.round(maxPosture * 0.10));
            if (fighter.postureCd && fighter.postureCd > 0) {
              fighter.postureCd = Math.max(0, fighter.postureCd - refundAmount);
              fighter.isPostureLocked = fighter.postureCd > 0;
            }
            grantFighterPostureReduction(fighter, 0.10, true);
          }
          soundManager.playDash();
        }
      }
    }

    // --- DYNAMIC MOVEMENT & RING CONTROL (FOOTSIES) ---
    if (!fighter.isBlocking && (fighter.heavyWindup || 0) <= 0 && (!fighter.hitMovementLock || fighter.hitMovementLock <= 0) && (!fighter.parriedStun || fighter.parriedStun <= 0) && (!fighter.stunTime || fighter.stunTime <= 0)) {
      const styleObj = FIGHTING_STYLES.find(s => s.id === fighter.styleId) || FIGHTING_STYLES[0];
      let styleSpeed = styleObj.statModifiers?.speed ?? 1.0;
      if (fighter.styleId === 'kyokushin') styleSpeed = 1.0;

      const canSprint = (fighter.stamina || 100) > 15 && (!fighter.postSprintDisable || fighter.postSprintDisable <= 0);
      if (dist > 120 && canSprint) {
        fighter.isSprinting = true;
      } else if (dist < 90 || fighter.isBlocking || (fighter.heavyWindup || 0) > 0) {
        fighter.isSprinting = false;
      }

      const sprintBoost = fighter.isSprinting ? 1.35 : 1.0;

      let speed = 
        (behaviorTier === 'amethyst' ? 3.05 :
        behaviorTier === 'diamond' ? 2.70 :
        behaviorTier === 'gold' ? 2.35 :
        behaviorTier === 'silver' ? 2.00 : 1.65) * styleSpeed * sprintBoost;

      let acceleration = 
        (behaviorTier === 'amethyst' ? 0.44 :
        behaviorTier === 'diamond' ? 0.37 :
        behaviorTier === 'gold' ? 0.30 :
        behaviorTier === 'silver' ? 0.23 : 0.18) * styleSpeed * sprintBoost;

      if (fighter.concussTime && fighter.concussTime > 0) {
        speed *= 0.40;
        acceleration *= 0.40;
      }

      if (fighter.crippleTime && fighter.crippleTime > 0) {
        speed *= 0.85;
        acceleration *= 0.85;
      }

      let targetVx = (dx / (dist || 1));
      let targetVy = (dy / (dist || 1));

      // Tactical Footsies (In-and-Out & Lateral Circling)
      if (fighter.isFeinting) {
        targetVx = targetVx * 0.35;
        targetVy = targetVy * 0.35;
        speed = Math.min(speed, 1.0);
      } else if (fighter.styleId === 'keysi') {
        // Keysi aggressively penetrates forward directly into the pocket
        targetVx = (dx / (dist || 1));
        targetVy = (dy / (dist || 1));
      } else if ((behaviorTier === 'amethyst' || behaviorTier === 'diamond' || behaviorTier === 'gold') && dist < 180 && dist > 70) {
        const strafeDirection = Math.sin(state.gameTime * 0.06) > 0 ? 1 : -1;
        const perpX = -targetVy * strafeDirection * 0.70;
        const perpY = targetVx * strafeDirection * 0.70;
        targetVx = (targetVx * 0.70 + perpX);
        targetVy = (targetVy * 0.70 + perpY);
      }

      fighter.vx += targetVx * acceleration;
      fighter.vy += targetVy * acceleration;

      const currentSpeed = Math.sqrt(fighter.vx * fighter.vx + fighter.vy * fighter.vy);
      if (currentSpeed > speed) {
        fighter.vx = (fighter.vx / currentSpeed) * speed;
        fighter.vy = (fighter.vy / currentSpeed) * speed;
      }
    } else {
      fighter.vx *= 0.82;
      fighter.vy *= 0.82;
    }

    if (state.gameTime % 10 === 0 && (fighter.armorHP || 0) < 18 && !fighter.isBlocking) {
      fighter.armorHP = Math.min(18, (fighter.armorHP || 0) + 0.35);
    }
    
    if ((fighter.stunTime && fighter.stunTime > 0) || (fighter.parriedStun && fighter.parriedStun > 0) || (fighter.hitMovementLock && fighter.hitMovementLock > 0)) {
      fighter.isSprinting = false;
      if (!fighter.isDashing) {
        if (Math.abs(fighter.vx) < 1.0) fighter.vx = 0;
        if (Math.abs(fighter.vy) < 1.0) fighter.vy = 0;
      }
    }
    if (fighter.capoeiraExhausted) {
      fighter.vx = 0;
      fighter.vy = 0;
    }
  }
};
