// ============================================================================
// HIT RESOLUTION & DAMAGE PIPELINE (src/combat/hitResolution.ts)
// Section 9.1: Evicted from Arena.tsx to ensure 100% deterministic combat math
// ============================================================================

import { Fighter, Fist, GameSettings, MatchData } from "../types";
import { CombatFighter } from "./types";
import { onLandedHitStaminaUpdate } from "./staminaEngine";
import { QuestTracker } from "../utils/questTracker";
import { triggerSluggerImpactFrame, triggerSluggerBlockImpactFrame } from "./impactFrame";
import { checkDirectionalBlock } from "./blockEngine";
import { 
  PERFECT_PARRY_WINDOW_SEC, 
  applyDamageCombatLocks, 
  applyFighterPostureCooldown, 
  lockStreetBoxingAutoBurstQueue, 
  isStreetBoxingFlurryUnparryable, 
  HITSTUN_FRAMES, 
  HIT_ATTACK_LOCKOUT_FRAMES 
} from "./combatEngine";
import { evaluateParry } from "./parry";
import { getHeightModifiers } from "../utils/heightModifiers";

export interface HitResolutionContext {
  stateRef: { current: any };
  soundManager: any;
  settings: GameSettings;
  matchData?: MatchData | null;
  userEmail: string;
  dummyBehavior: string;
  getMatchModeKey: () => "ranked_pvp" | "unranked_pvp" | "ranked_ai" | "unranked_ai";
  spawnFloatingText: (x: number, y: number, text: string, color: string, isCrit?: boolean) => void;
  spawnKyokushinPunchGust: (attacker: any, defender: any) => void;
  triggerKOCinematic: (attacker: any, defender: any) => void;
  syncCombatStatesToUI: () => void;
  telemetryRefs: {
    matchParriesLandedRef: { current: number };
    roundParriesLandedRef: { current: number };
    matchHeaviesLandedRef: { current: number };
    roundHeaviesLandedRef: { current: number };
    matchLightsLandedRef: { current: number };
    roundLightsLandedRef: { current: number };
    matchBlockedStrikesRef: { current: number };
    matchM1ChainsRef: { current: number };
    matchWhiffPunishesRef: { current: number };
    matchGuardBreaksRef: { current: number };
    matchCounterHitsRef: { current: number };
    lastParryTimestampRef: { current: number };
    matchDamageDealtRef: { current: number };
    matchDamageTakenRef: { current: number };
    roundDamageTakenRef: { current: number };
    matchFirstHitOccurredRef: { current: boolean | number };
    roundDamageDealtRef: { current: number };
    minPlayerHpPctRef: { current: number };
    sliceDamageDealtRef: { current: number };
    sliceDamageTakenRef: { current: number };
  };
  uiSetters: {
    setTotalParries: (v: any) => void;
    setTotalBlocks: (v: any) => void;
    setTotalDamageDealt: (v: any) => void;
    setTotalHitsLanded: (v: any) => void;
    setTotalDamageTaken: (v: any) => void;
    setMaxCombo: (v: any) => void;
    setMatchDamageDealt: (v: any) => void;
    setMatchDamageTaken: (v: any) => void;
    setMatchHitsLanded: (v: any) => void;
    setPotatoFuseLeft?: (v: any) => void;
    setPotatoHolderState?: (v: any) => void;
    setSustainPlayerDamage?: (v: any) => void;
    setSustainOpponentDamage?: (v: any) => void;
  };
}

export function isFighterInIFrames(target: (Fighter & { heavyWindup?: number; isDashing?: boolean }) | null | undefined): boolean {
    if (!target) return false;
    const isAshiharaFlowSweep = target.styleId === 'ashihara' && target.fists.some(f => f.isPunching && !f.isHeavy && f.comboStage === 3);
    const isCapoeiraS3Dodge = target.styleId === 'capoeira' && target.fists.some(f => f.isPunching && !f.isHeavy && f.comboStage === 2);
    const isHeavyPunching = target.fists.some(f => (f.isPunching || f.punchProgress > 0) && f.isHeavy);
    const isWindupIFrameStyle = target.styleId === 'basic';
    const isStrikeIFrameStyle = target.styleId === 'shotokan' || target.styleId === 'capoeira';

    const isFlowSprintSway = target.styleId === 'basic' && !!target.flowSprintSwayActive;
    const isFlowS2IFrame = target.styleId === 'basic' && !!target.flowS2HasIFrames && target.fists.some(f => f.isPunching && !f.isHeavy && f.comboStage === 1);
    const isAikidoSlamming = target.styleId === 'aikido' && !!target.aikiSlamStage;

    return !!(
      (isWindupIFrameStyle && (target.heavyWindup || 0) > 0) ||
      (isStrikeIFrameStyle && isHeavyPunching) ||
      isAshiharaFlowSweep ||
      isCapoeiraS3Dodge ||
      isFlowSprintSway ||
      isFlowS2IFrame ||
      isAikidoSlamming
    );
}


export function finalizeKickboxingM2Cooldown(
  fighter: Fighter,
  spawnFloatingText?: (x: number, y: number, text: string, color: string) => void,
  soundManager?: any
): void {
  const s1 = !!fighter.kickboxingS1Hit;
  const s2 = !!fighter.kickboxingS2Hit;
  let cdFrames = 480;
  let outcomeText = "";
  let textColor = "#ef4444";

  if (s1 && s2) {
    cdFrames = 360;
    outcomeText = "BOTH HIT (6.0s CD)";
    textColor = "#22c55e";
    fighter.kickboxingCadenceTimer = 300;
    if (spawnFloatingText) spawnFloatingText(fighter.x, fighter.y - 35, "CADENCE OPENING (+15% EXEC / +20% SPD)", "#22c55e");
    if (soundManager?.playParry) soundManager.playParry();
  } else if (s1 && !s2) {
    cdFrames = 240;
    outcomeText = "S1 HIT / S2 WHIFF (4.0s CD)";
    textColor = "#38bdf8";
    if (spawnFloatingText) spawnFloatingText(fighter.x, fighter.y - 30, outcomeText, textColor);
  } else if (!s1 && s2) {
    cdFrames = 300;
    outcomeText = "S2 HIT / S1 WHIFF (5.0s CD)";
    textColor = "#f59e0b";
    if (spawnFloatingText) spawnFloatingText(fighter.x, fighter.y - 30, outcomeText, textColor);
  } else {
    cdFrames = 480;
    outcomeText = "BOTH WHIFF (8.0s CD)";
    textColor = "#ef4444";
    if (spawnFloatingText) spawnFloatingText(fighter.x, fighter.y - 30, outcomeText, textColor);
  }

  fighter.heavyCooldown = cdFrames;
  fighter.kickboxingIsSeq2 = false;
  fighter.kickboxingSeq2Ready = false;
  fighter.kickboxingSeq2Window = 0;
  fighter.kickboxingAutoSeq2Timer = 0;
  fighter.kickboxingS1Hit = false;
  fighter.kickboxingS2Hit = false;
}

export function applyHeavyWhiffPenalty(
  fighter: Fighter,
  spawnFloatingText?: (x: number, y: number, text: string, color: string) => void,
  soundManager?: any
): void {
  if (fighter.styleId === "basic") {
    fighter.heavyCooldown = Math.max(fighter.heavyCooldown || 0, 840);
    fighter.strikeCooldown = Math.max(fighter.strikeCooldown || 0, 30);
    if (spawnFloatingText) spawnFloatingText(fighter.x, fighter.y - 30, "WHIFF RECOVERY (14.0s)", "#ef4444");
  } else if (fighter.styleId === "muay_thai") {
    fighter.heavyCooldown = Math.max(fighter.heavyCooldown || 0, 180);
    fighter.stunTime = Math.max(fighter.stunTime || 0, 40);
    if (spawnFloatingText) spawnFloatingText(fighter.x, fighter.y - 30, "WHIFF RECOVERY (3.0s)", "#ef4444");
  } else if (fighter.styleId === "keysi") {
    const baseWhiffCd = 720;
    fighter.keysiVulnerableTimer = 300;
    fighter.keysiWhiffCooldownQueued = true;
    fighter.keysiQueuedWhiffCd = baseWhiffCd;
    fighter.heavyCooldown = 300 + baseWhiffCd;
    fighter.strikeCooldown = Math.max(fighter.strikeCooldown || 0, 36);
    fighter.keysiHasSuperArmor = false;
    fighter.heavyWindup = 0;
    fighter.keysiClinchStage = null;
    fighter.keysiClinchTarget = null;
    if (spawnFloatingText) spawnFloatingText(fighter.x, fighter.y - 30, "OVER-EXTENDED! (+30% DMG / -60% SPD)", "#ef4444");
  } else if (fighter.styleId === "aikido") {
    fighter.heavyCooldown = Math.max(fighter.heavyCooldown || 0, 420);
    fighter.aikiWhiffSlowTimer = 60;
    fighter.strikeCooldown = Math.max(fighter.strikeCooldown || 0, 60);
    fighter.lightCooldown = Math.max(fighter.lightCooldown || 0, 60);
    fighter.parryLockoutTimer = Math.max(fighter.parryLockoutTimer || 0, 60);
    if (spawnFloatingText) spawnFloatingText(fighter.x, fighter.y - 30, "M2 WHIFF (-70% SPEED, 7.0s CD)", "#ef4444");
  } else if (fighter.styleId === "ashihara") {
    fighter.heavyCooldown = Math.max(fighter.heavyCooldown || 0, 300);
    fighter.ashiharaRecoveryTimer = 30;
    if (spawnFloatingText) spawnFloatingText(fighter.x, fighter.y - 30, "SABAKI COUNTER WHIFF (5.0s)", "#ef4444");
  } else if (fighter.styleId === "shotokan") {
    fighter.heavyCooldown = Math.max(fighter.heavyCooldown || 0, 720);
    fighter.crippleTime = Math.max(fighter.crippleTime || 0, 60);
    if (spawnFloatingText) spawnFloatingText(fighter.x, fighter.y - 30, "BACK KICK WHIFF (12.0s)", "#ef4444");
  } else if (fighter.styleId === "kyokushin") {
    fighter.heavyCooldown = Math.max(fighter.heavyCooldown || 0, 564);
    fighter.stunTime = Math.max(fighter.stunTime || 0, 40);
    if (spawnFloatingText) spawnFloatingText(fighter.x, fighter.y - 30, "WHIFF RECOVERY (9.4s)", "#ef4444");
  } else if (fighter.styleId === "capoeira") {
    fighter.heavyCooldown = Math.max(fighter.heavyCooldown || 0, 360);
    fighter.capoeiraWhiffBonusActive = true;
    if (spawnFloatingText) spawnFloatingText(fighter.x, fighter.y - 30, "WHIFF RECOVERY (6.0s)", "#ca8a04");
  } else if (fighter.styleId === "slugger") {
    fighter.heavyCooldown = Math.max(fighter.heavyCooldown || 0, 480);
    fighter.stunTime = Math.max(fighter.stunTime || 0, 72);
    if (spawnFloatingText) spawnFloatingText(fighter.x, fighter.y - 30, "HAYMAKER WHIFF (8.0s)", "#dc2626");
  } else if (fighter.styleId === "kickboxing") {
    const isSeq2 = !!fighter.kickboxingIsSeq2;
    finalizeKickboxingM2Cooldown(fighter, spawnFloatingText, soundManager);
    const recoveryFrames = isSeq2 ? 36 : 24;
    fighter.stunTime = Math.max(fighter.stunTime || 0, recoveryFrames);
    fighter.blockLockout = Math.max(fighter.blockLockout || 0, recoveryFrames);
    fighter.strikeCooldown = Math.max(fighter.strikeCooldown || 0, recoveryFrames);
  } else if (fighter.styleId === "cqc") {
    fighter.heavyCooldown = Math.max(fighter.heavyCooldown || 0, 900);
    fighter.strikeCooldown = Math.max(fighter.strikeCooldown || 0, 36);
    if (spawnFloatingText) spawnFloatingText(fighter.x, fighter.y - 30, "CQC RECOVERY (15.0s)", "#ef4444");
  } else if (fighter.styleId === "boxing_shell") {
    fighter.heavyCooldown = Math.max(fighter.heavyCooldown || 0, 600);
    fighter.strikeCooldown = Math.max(fighter.strikeCooldown || 0, 24);
    if (spawnFloatingText) spawnFloatingText(fighter.x, fighter.y - 30, "WHIFF RECOVERY (10.0s)", "#ef4444");
  } else if (fighter.styleId === "street_boxing") {
    fighter.heavyCooldown = Math.max(fighter.heavyCooldown || 0, 480);
    fighter.strikeCooldown = Math.max(fighter.strikeCooldown || 0, 18);
    fighter.streetBoxingM2Stage = 0;
    fighter.streetBoxingM2Hits = 0;
    fighter.streetBoxingM2NextTimer = 0;
    fighter.streetBoxingUnbreakable = false;
    if (spawnFloatingText) spawnFloatingText(fighter.x, fighter.y - 30, "WHIFF RECOVERY (8.0s)", "#ef4444");
  } else if (fighter.styleId === "street_taekwondo") {
    fighter.heavyCooldown = Math.max(fighter.heavyCooldown || 0, 240);
    if (spawnFloatingText) spawnFloatingText(fighter.x, fighter.y - 30, "WHIFF RECOVERY (4.0s)", "#ef4444");
  }
}

export function executeFighterHit(
  attacker: Fighter & { comboStage?: number; heavyWindup?: number; kickboxingAutoSeq2Timer?: number },
  defender: Fighter & { isBlocking?: boolean; armorHP?: number; armorBreakTime?: number; damageFlashTime?: number; concussTime?: number; isDashing?: boolean; armorRegenLockout?: number },
  isHeavy: boolean,
  comboStage: number | undefined,
  strikePos: { x: number; y: number } | undefined,
  ctx: HitResolutionContext
): void {
  const {
    stateRef,
    soundManager,
    settings,
    matchData,
    userEmail,
    dummyBehavior,
    getMatchModeKey,
    spawnFloatingText,
    spawnKyokushinPunchGust,
    triggerKOCinematic,
    syncCombatStatesToUI,
    telemetryRefs: {
      matchParriesLandedRef,
      roundParriesLandedRef,
      matchHeaviesLandedRef,
      roundHeaviesLandedRef,
      matchLightsLandedRef,
      roundLightsLandedRef,
      matchBlockedStrikesRef,
      matchM1ChainsRef,
      matchWhiffPunishesRef,
      matchGuardBreaksRef,
      matchCounterHitsRef,
      lastParryTimestampRef,
      matchDamageDealtRef,
      matchDamageTakenRef,
      roundDamageTakenRef,
      matchFirstHitOccurredRef,
      roundDamageDealtRef,
      minPlayerHpPctRef,
      sliceDamageDealtRef,
      sliceDamageTakenRef,
    },
    uiSetters: {
      setTotalParries,
      setTotalBlocks,
      setTotalDamageDealt,
      setTotalHitsLanded,
      setTotalDamageTaken,
      setMaxCombo,
      setMatchDamageDealt,
      setMatchDamageTaken,
      setMatchHitsLanded,
      setPotatoFuseLeft,
      setPotatoHolderState,
      setSustainPlayerDamage,
      setSustainOpponentDamage,
    }
  } = ctx;

    if (defender.isDead || (attacker.parriedStun && attacker.parriedStun > 0)) return;
    // Section 2.8: You cannot hit anyone or initiate attacks during dash duration
    if (attacker.isDashing || (attacker.dashProgress && attacker.dashProgress > 0)) return;

    // Ashihara Karate Sabaki Tsukami Counter (3-Stage M2 System):
    // Mawashi Uke active parry stance takes TOP PRIORITY when hit so it never gets misidentified as a dodge!
    if (defender.styleId === 'ashihara' && (defender.ashiharaM2Stage === 2 || defender.ashiharaM2Stage === 3 || (defender.parryFlashTime || 0) > 0)) {
      // Mid-counter sequence invulnerability: deflect incoming attack without resetting counter state
      spawnFloatingText(defender.x, defender.y - 30, 'SABAKI DEFLECTION!', '#1d4ed8');
      soundManager.playParry();
      return;
    }

    // Aikido: M2 Active Parry Stance (0.30s reaction window intercept)
    if (defender.styleId === 'aikido' && (defender.aikiM2ActiveWindow || 0) > 0) {
      if (defender.isPlayer) {
        matchParriesLandedRef.current += 1;
        roundParriesLandedRef.current += 1;
        stateRef.current.totalParries = (stateRef.current.totalParries || 0) + 1;
        setTotalParries(stateRef.current.totalParries);
        QuestTracker.trackEvent(userEmail, {
          type: 'parry',
          mode: getMatchModeKey()
        });
      }
      defender.parryFlashTime = 18; // Flashes light blue
      defender.damageFlashTime = 0;
      defender.aikiM2ActiveWindow = 0;
      defender.aikiM2Guarding = false;
      defender.heavyCooldown = 600; // 10.0s Hit Cooldown

      // Cancel attacker active attack
      attacker.heavyWindup = 0;
      attacker.keysiClinchStage = null;
      attacker.keysiClinchTarget = null;
      attacker.fists.forEach(f => { f.isPunching = false; f.punchProgress = 0; });
      defender.fists.forEach(f => { f.isPunching = false; f.punchProgress = 0; });

      soundManager.playParry();
      spawnFloatingText(defender.x, defender.y - 35, 'ACTIVE PARRY INTERCEPT! (8.0 SLAM)', '#38bdf8');

      // Grabs & Slams immediately dealing 8.0 HP Flat Slam Damage
      defender.aikiSlamStage = 'clamp';
      defender.aikiSlamDamage = 8.0; // 8.0 HP Flat Slam Damage
      defender.aikiSlamTimer = 90;
      defender.aikiSlamFrame = 0;
      defender.aikiSlamBaseAngle = defender.facingAngle;
      defender.aikiSlamTarget = attacker;
      defender.aikiIsFreeSlam = true;
      defender.aikiSlamUninterruptible = true;
      attacker.aikiSlamUninterruptible = true;
      attacker.aikiSlamVictimStage = 'clamp';
      attacker.aikiOverheadScale = 1.0;
      defender.vx = 0; defender.vy = 0;
      attacker.vx = 0; attacker.vy = 0;
      stateRef.current.hitstopTime = 3;
      syncCombatStatesToUI();
      return; // Intercept confirmed!
    }

    // Aikido: Sequence 2 (S2) Built-In Parry (Active Parry for the first 0.30s of startup)
    const isAikiS2StartupParry = defender.styleId === 'aikido' && defender.fists.some(f => 
      f.isPunching && !f.isHeavy && (f.comboStage === 1 || (f.comboStage === undefined && (defender.comboStage === 2 || defender.comboStage === 1))) && f.punchProgress < 0.45
    );
    if (isAikiS2StartupParry) {
      if (defender.isPlayer) {
        matchParriesLandedRef.current += 1;
        roundParriesLandedRef.current += 1;
        stateRef.current.totalParries = (stateRef.current.totalParries || 0) + 1;
        setTotalParries(stateRef.current.totalParries);
        QuestTracker.trackEvent(userEmail, {
          type: 'parry',
          mode: getMatchModeKey()
        });
      }
      defender.parryFlashTime = 18;
      defender.damageFlashTime = 0;
      attacker.stunTime = 30;
      attacker.heavyWindup = 0;
      attacker.fists.forEach(f => { f.isPunching = false; f.punchProgress = 0; });
      defender.fists.forEach(f => { f.isPunching = false; f.punchProgress = 0; });
      soundManager.playParry();

      if ((defender.aikiPassiveSlamCd || 0) <= 0) {
        defender.aikiSlamReactiveWindow = 30; // Opens 0.5s reaction window!
        spawnFloatingText(defender.x, defender.y - 35, 'KOTE-GAESHI TRAP! SLAM READY [M1]', '#38bdf8');
      } else {
        spawnFloatingText(defender.x, defender.y - 35, 'KOTE-GAESHI TRAP! DEFLECTED', '#38bdf8');
      }
      stateRef.current.hitstopTime = 3;
      syncCombatStatesToUI();
      return;
    }

    if (defender.styleId === 'ashihara' && ((defender.heavyWindup && defender.heavyWindup > 0) || defender.ashiharaM2Stage === 1)) {
      if (defender.isPlayer) {
        matchParriesLandedRef.current += 1;
        roundParriesLandedRef.current += 1;
        QuestTracker.trackEvent(userEmail, {
          type: 'parry',
          mode: getMatchModeKey()
        });
      }
      defender.parryFlashTime = 18;
      defender.parryBlockGraceTimer = 90;
      defender.afterParryGraceTimer = 90;
      defender.postBlockAttackLockout = 0;
      defender.strikeCooldown = 0;
      
      // Interrupt attacker's active lunge/attack
      const isLightPunchingAshi = attacker.fists.some(f => f.isPunching && !f.isHeavy);
      const wasAttackerHeavy = !isLightPunchingAshi && (isHeavy || (attacker.heavyWindup && attacker.heavyWindup > 0) || (attacker.styleId === 'keysi' && (attacker.keysiClinchStage !== null || (attacker.heavyWindup && attacker.heavyWindup > 0))));
      if (wasAttackerHeavy) {
        applyHeavyWhiffPenalty(attacker);
      }
      attacker.heavyWindup = 0;
      attacker.keysiClinchStage = null;
      attacker.keysiClinchTarget = null;
      attacker.keysiM2Primed = false;
      attacker.fists.forEach(f => {
        f.isPunching = false;
        f.punchProgress = 0;
        f.isHeavy = false;
      });
      
      // Pull attacker close to the defender (Tsukami Drag)
      const pullDist = defender.radius + attacker.radius + 8;
      const pullAngle = Math.atan2(attacker.y - defender.y, attacker.x - defender.x);
      attacker.x = defender.x + Math.cos(pullAngle) * pullDist;
      attacker.y = defender.y + Math.sin(pullAngle) * pullDist;
      
      // Strip guard from attacker immediately
      attacker.isBlocking = false;
      attacker.blockLockout = 51;
      attacker.stunTime = 51;
      attacker.parriedStun = 51;
      attacker.strikeCooldown = 51;
      attacker.parryLockoutTimer = 60; // 1s (60 frames) Parry Disable Passive
      spawnFloatingText(attacker.x, attacker.y - 45, 'PARRY DISABLED (1s)', '#ef4444');

      // Calculate Stage 2 Tsukami Drag Damage: 3.0 HP base * 0.90 power modifier = 2.7 Net HP
      const ashiharaMods = getHeightModifiers(defender.baseHeight);
      const s2Dmg = Math.round(3.0 * ashiharaMods.damageFactor * 0.90 * 10) / 10;
      if (matchData?.gamemode !== 'sustain_attack' && matchData?.gamemode !== 'hot_potato') {
        attacker.health = Math.max(0, attacker.health - s2Dmg);
      }
      attacker.damageFlashTime = 12;
      applyDamageCombatLocks(attacker);

      // Enter M2 S2 (Tsukami Drag): 0.15s (9 frames transition)
      defender.ashiharaM2Stage = 2;
      defender.ashiharaM2Timer = 9;
      defender.heavyWindup = 0;
      defender.heavyCooldown = 0; // Sabaki Counter-Loop instant refund

      // Effects, Hit-Stop & Floating Text
      soundManager.playParry();
      soundManager.playDash();
      stateRef.current.shakeAmount = 8 * settings.screenShake;
      
      spawnFloatingText(attacker.x, attacker.y - 25, `-${s2Dmg} HP`, '#facc15');
      
      // Spawn blue & gold spark particles at wrist grab point
      for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 2;
        stateRef.current.particles.push({
          id: `ashihara_grab_${Math.random()}`,
          x: (defender.x + attacker.x) / 2,
          y: (defender.y + attacker.y) / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: Math.random() * 3.5 + 2,
          color: i % 2 === 0 ? '#1d4ed8' : '#facc15',
          alpha: 1.0,
          life: 0,
          maxLife: 35,
          type: 'spark'
        });
      }
      
      syncCombatStatesToUI();
      return; // Damage completely nullified & Mawashi Uke deflection executed!
    }

    if (defender.styleId === 'boxing_shell' && ((defender.heavyWindup && defender.heavyWindup > 0) || defender.fists.some(f => f.isPunching && f.isHeavy))) {
      // Iron Boxing M2 Parry: Triggered when hit by opponent during M2 Shoulder Roll!
      // Cannot be parried by attacker. Redirects attacker's strike with the shoulder, spins them out for 1.5s, and grants 2x posture boost.
      if (defender.isPlayer) {
        matchParriesLandedRef.current += 1;
        roundParriesLandedRef.current += 1;
        stateRef.current.totalParries = (stateRef.current.totalParries || 0) + 1;
        setTotalParries(stateRef.current.totalParries);
        QuestTracker.trackEvent(userEmail, {
          type: 'parry',
          mode: getMatchModeKey()
        });
      }
      defender.parryFlashTime = 18;
      defender.parryBlockGraceTimer = 90;
      defender.afterParryGraceTimer = 90;
      defender.postBlockAttackLockout = 0;
      defender.strikeCooldown = 0;

      // Interrupt attacker's active lunge/attack
      const isLightPunchingShell = attacker.fists.some(f => f.isPunching && !f.isHeavy);
      const wasAttackerHeavy = !isLightPunchingShell && (isHeavy || (attacker.heavyWindup && attacker.heavyWindup > 0) || (attacker.styleId === 'keysi' && (attacker.keysiClinchStage !== null || (attacker.heavyWindup && attacker.heavyWindup > 0))));
      if (wasAttackerHeavy) {
        applyHeavyWhiffPenalty(attacker);
      }
      attacker.heavyWindup = 0;
      attacker.keysiClinchStage = null;
      attacker.keysiClinchTarget = null;
      attacker.keysiM2Primed = false;
      attacker.fists.forEach(f => {
        f.isPunching = false;
        f.punchProgress = 0;
        f.isHeavy = false;
        f.hasHit = false;
      });
      if (attacker.isDashing) {
        attacker.isDashing = false;
        attacker.dashProgress = 0;
      }

      // Conclude defender's M2 as a successful parry counter
      defender.heavyWindup = 0;
      defender.fists.forEach(f => {
        f.isPunching = false;
        f.punchProgress = 0;
        f.isHeavy = false;
        f.hasHit = false;
      });
      defender.heavyCooldown = 360; // 6.0s Hit Cooldown

      // Pull attacker close / redirect trajectory
      const dx = attacker.x - defender.x;
      const dy = attacker.y - defender.y;
      const dist = Math.hypot(dx, dy) || 1;
      const closeDist = defender.radius + attacker.radius + 8;
      attacker.x = defender.x + (dx / dist) * closeDist;
      attacker.y = defender.y + (dy / dist) * closeDist;
      attacker.vx = (dx / dist) * 2.0;
      attacker.vy = (dy / dist) * 2.0;

      // Stagger effect on attacker (1.5s hitstun, lockout)
      attacker.shellSpinTimer = 0;
      attacker.stunTime = Math.max(attacker.stunTime || 0, 90);
      attacker.strikeCooldown = Math.max(attacker.strikeCooldown || 0, 90);
      attacker.shellLockoutTimer = 90;
      attacker.damageFlashTime = 10;
      attacker.isBlocking = false;
      attacker.blockLockout = 60;

      // Defender gets 2x Posture Recovery Boost (3.0s)
      defender.shellPostureBoostTimer = 180;

      // Sound & Screen FX
      soundManager.playParry();
      soundManager.playRollTick();
      stateRef.current.hitstopTime = 3;
      stateRef.current.shakeAmount = 8 * settings.screenShake;

      spawnFloatingText(attacker.x, attacker.y - 35, 'SHOULDER DEFLECTED & STAGGERED (1.5s)', '#d946ef');
      spawnFloatingText(defender.x, defender.y - 35, 'POSTURE RECOVERY BOOST 2X (3.0s)', '#d946ef');

      // Purple/silver spark particles burst at impact
      for (let i = 0; i < 14; i++) {
        const angle = (i / 14) * Math.PI * 2;
        const speed = Math.random() * 3.5 + 1.5;
        stateRef.current.particles.push({
          id: `shell_m2_parry_${Math.random()}`,
          x: (defender.x + attacker.x) / 2,
          y: (defender.y + attacker.y) / 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: Math.random() * 2.5 + 1.5,
          color: i % 2 === 0 ? '#a855f7' : '#c0c0c0',
          alpha: 1.0,
          life: 0,
          maxLife: 24,
          type: 'spark'
        });
      }

      syncCombatStatesToUI();
      return; // Damage completely nullified & Shoulder deflection parry executed!
    }

    // Check I-Frame dodge next!
    // Street Boxing: Slip Drive (Heavy M2 initiation dash & strike natively grant built-in I-Frames)
    // Shotokan: Ushiro-Mawashi-Geri (Spinning hook kick grants built-in I-Frames during spin & kick)
    // Capoeira: Meia Lua de Compasso (Helicopter sweep grants built-in I-Frames during active sweep execution)
    // Ashihara: Kake-Uke Parry Stance & Flow Sweep grant built-in I-Frames
    // Street Taekwondo: S3 Stance Switch Kick & Counter-Bait grant built-in I-Frames
    const isIFrameDashing = isFighterInIFrames(defender);

    if (isIFrameDashing) {
      if (defender.isPlayer) {
        QuestTracker.trackEvent(userEmail, {
          type: 'dodge',
          mode: getMatchModeKey()
        });
      }
      soundManager.playDash(); // play dodge swoosh
      spawnFloatingText(defender.x, defender.y - 30, 'DODGED!', '#38bdf8');
      
      // Trigger Passives on Successful Dodge:
      if (defender.styleId === 'basic') {
        defender.hasReflexPivot = true;
      }
      if (defender.styleId === 'slugger') {
        defender.hasKineticCounter = true;
      }

      // Attacker whiff penalty when heavy attack is dodged by i-frames
      if (isHeavy) {
        applyHeavyWhiffPenalty(attacker);
      } else if (attacker.styleId === 'capoeira' && !attacker.capoeiraWhiffBonusActive) {
        attacker.capoeiraWhiffBonusActive = true;
      }
      syncCombatStatesToUI();

      // Spawn beautiful blue sparkle particles
      const state = stateRef.current;
      for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2 + 1;
        state.particles.push({
          id: `dodge_spark_${Math.random()}`,
          x: defender.x,
          y: defender.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: Math.random() * 2.5 + 1.5,
          color: '#38bdf8',
          alpha: 1.0,
          life: 0,
          maxLife: 20,
          type: 'spark'
        });
      }
      return; // Immune to hit!
    }

    const prevConcuss = defender.concussTime || 0;
    const prevCripple = defender.crippleTime || 0;
    const prevArmorBreak = defender.armorBreakTime || 0;

    // DIRECTIONAL BLOCK ENGINE EVALUATION:
    // Block only protects within the designated arc in front.
    // Flank / back-dash attacks outside the arc bypass guard entirely and deal full direct damage.
    const blockCheck = checkDirectionalBlock(defender, attacker, strikePos);
    const isStreetBoxingUnbreakable = isStreetBoxingFlurryUnparryable(attacker, isHeavy);
    const isEffectivelyBlocked = isStreetBoxingUnbreakable ? false : blockCheck.isBlocked;

    // PERFECT PARRY SYSTEM CHECK:
    const blockTimeSec = (defender.blockTimer || 0) / 60;
    const isParry = evaluateParry(defender, attacker, isEffectivelyBlocked, blockTimeSec, { comboStage });

    if (isParry) {
      // In online PvP or local game, debounce rapid duplicate collision triggers across single animation frames
      const now = performance.now();
      if (now - lastParryTimestampRef.current < 45) {
        return;
      }
      lastParryTimestampRef.current = now;

      // PARRY ACTION TRIGGERED!
      if (defender.isPlayer) {
        matchParriesLandedRef.current += 1;
        roundParriesLandedRef.current += 1;
        stateRef.current.totalParries = (stateRef.current.totalParries || 0) + 1;
        setTotalParries(stateRef.current.totalParries);
        QuestTracker.trackEvent(userEmail, {
          type: 'parry',
          mode: getMatchModeKey()
        });
      }
      defender.parryFlashTime = 18; // 0.3s visual gold-shine glow duration
      defender.parryBlockGraceTimer = 90; // Post-parry grace window allowing instant counter-attack
      defender.afterParryGraceTimer = 90; // 1.5s post-parry grace window removing basic attack post-block delay
      defender.postBlockAttackLockout = 0;
      defender.strikeCooldown = 0;
      defender.blockLockout = 0; // 0s block lockout for continuous chain parrying
      defender.parryLockoutTimer = 0; // 0s parry lockout - parry constantly without destruction
      defender.blockTimer = 0; // Reset block timer to 0 so defender re-enters fresh Perfect Parry window immediately
      defender.blockUseCount = 0; // Successful parry resets block tap count
      
      if (defender.styleId === 'street_boxing') {
        defender.streetBoxingCounterSurge = true;
        spawnFloatingText(defender.x, defender.y - 25, 'SNAPPING COUNTER (+80% SPEED)', '#22c55e');
      } else if (defender.styleId === 'boxing_shell') {
        if (defender.postureCd && defender.postureCd > 0) {
          defender.postureCd = Math.round(defender.postureCd * 0.55);
        } else {
          defender.shellParryResetPending = true;
        }
        spawnFloatingText(defender.x, defender.y - 25, 'DEFLECTIVE RESET (-45%)', '#c0c0c0');
      } else if (defender.styleId === 'aikido') {
        if ((defender.aikiPassiveSlamCd || 0) <= 0) {
          defender.aikiSlamReactiveWindow = 30; // 0.5s reaction window
          spawnFloatingText(defender.x, defender.y - 25, 'REACTIVE SLAM READY! [M1]', '#38bdf8');
        }
      } else if (defender.styleId === 'street_taekwondo') {
        // [ Deflective Cadence (Parry Posture Surge) ]: Accelerates Posture Regeneration speed by +30% for 8.0 seconds
        defender.deflectiveCadenceTimer = 480;
        spawnFloatingText(defender.x, defender.y - 25, 'DEFLECTIVE CADENCE (+30% POSTURE REGEN 8.0s)', '#FF6B00');
      }

      // Check Street Taekwondo Brazilian Feint Trap
      if (attacker.styleId === 'street_taekwondo' && attacker.tkdFeintWindowActive) {
        attacker.tkdFeintTrapped = true;
        defender.spinOutTimer = 60; // 1.0s Spin-Out
        defender.tkdConfusionTimer = 180; // 3.0s Confusion
        spawnFloatingText(defender.x, defender.y - 30, 'FEINT TRAPPED! SPIN-OUT (1.0s) & CONFUSION (3.0s)', '#FFD600');
        spawnFloatingText(attacker.x, attacker.y - 50, 'FEINT TRAPPED! TRUE KICK EMPOWERED', '#FFD600');
      }
      // Check if the strike that was parried was a heavy / M2 attack
      const isAttackerHeavyAttack = !!(
        isHeavy ||
        attacker.fists.some(f => f.isHeavy) ||
        (attacker.heavyWindup && attacker.heavyWindup > 0) ||
        (attacker.styleId === 'kyokushin' && (attacker.kyokushinM2PeakHoldTimer || 0) > 0) ||
        (attacker.styleId === 'keysi' && (attacker.keysiClinchStage !== null || (attacker.heavyWindup && attacker.heavyWindup > 0))) ||
        (attacker.styleId === 'cqc' && attacker.cqcM2Stage !== null)
      );

      // Cancel attacker's active attack (light/heavy punches, windup, and Keysi clamp/clinch)
      // Note: If attacker is in the 0.20s Street Taekwondo Brazilian Kick feint window,
      // the opponent just fell for the feint! Do NOT cancel the kick; let it chop down with Neuro-Trauma!
      if (!(attacker.styleId === 'street_taekwondo' && attacker.tkdFeintWindowActive)) {
        attacker.heavyWindup = 0;
      }
      attacker.keysiClinchStage = null;
      attacker.keysiClinchTarget = null;
      attacker.keysiM2Primed = false;
      attacker.attackLockedAngle = undefined;
      if (attacker.styleId === 'kyokushin') {
        attacker.kyokushinM2PeakHoldTimer = 0;
        attacker.kyokushinM2FreezeTimer = 0;
        attacker.kyokushinM2Stage = null;
      }
      attacker.fists.forEach(f => {
        f.isPunching = false;
        f.punchProgress = 0;
        f.isHeavy = false;
        f.lingerTimer = 0;
        f.isLingerActive = false;
        f.hasHit = true; // Mark all fists as hit so no other limb double-triggers collision
      });

      if (isAttackerHeavyAttack) {
        if (attacker.styleId === 'street_boxing') {
          attacker.streetBoxingM2Stage = 0;
          attacker.streetBoxingM2Hits = 0;
          attacker.streetBoxingUnbreakable = false;
          attacker.streetBoxingM2NextTimer = 0;
        } else if (attacker.styleId === 'kickboxing') {
          attacker.kickboxingIsSeq2 = false;
          attacker.kickboxingSeq2Ready = false;
          attacker.kickboxingSeq2Window = 0;
          attacker.kickboxingAutoSeq2Timer = 0;
        }
        applyHeavyWhiffPenalty(attacker);
      }
      
      const pStun = attacker.styleId === 'keysi' ? 42 : 48;
      attacker.stunTime = 0; // Getting parried does NOT lock out Block input!
      attacker.parriedStun = pStun; // Staggers movement and attacks (48 frames = 0.8s)
      attacker.strikeCooldown = pStun; // Strike recoil lag
      attacker.hitMovementLock = pStun; // Staggers movement
      attacker.hitSteeringLock = pStun; // Staggers steering lock
      attacker.isBlocking = false;
      attacker.blockLockout = 0; // Retains ability to buffer or execute a Counter-Parry!

      // Counter-Parry handling: if defender was parried and lands a parry, break out of parried stun
      const isCounterParry = !!(defender.parriedStun && defender.parriedStun > 0);
      if (isCounterParry) {
        defender.parriedStun = 0;
      }

      // Perfect Parry: Zero Knockback on both defender and attacker
      attacker.vx = 0;
      attacker.vy = 0;
      defender.vx = 0;
      defender.vy = 0;

      // Play metallic parry chime audio hook
      soundManager.playParry();
      stateRef.current.shakeAmount = 8 * settings.screenShake;

      spawnFloatingText(defender.x, defender.y - 35, isCounterParry ? 'COUNTER-PARRY!' : 'PARRY!', '#facc15');

      // Spawn concentric perfect-parry visual shockwave rings
      stateRef.current.particles.push({
        id: `parry_ring_outer_${Math.random()}`,
        x: defender.x,
        y: defender.y,
        vx: 0,
        vy: 0,
        radius: 10,
        color: '#facc15', // Gold ring
        alpha: 1.0,
        life: 0,
        maxLife: 20,
        type: 'parry_ring'
      });

      stateRef.current.particles.push({
        id: `parry_ring_inner_${Math.random()}`,
        x: defender.x,
        y: defender.y,
        vx: 0,
        vy: 0,
        radius: 4,
        color: '#ffffff', // Hot white core ring
        alpha: 1.0,
        life: 0,
        maxLife: 14,
        type: 'parry_ring'
      });

      // Spawn bright high-velocity directional perfect-parry sparkle lines
      const sparkCount = 14;
      for (let i = 0; i < sparkCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 4.5; // Dynamic fast speed
        const isWhite = Math.random() < 0.35; // 35% hot white sparks
        stateRef.current.particles.push({
          id: `parry_spark_${Math.random()}`,
          x: defender.x,
          y: defender.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: Math.random() * 2 + 1.5,
          color: isWhite ? '#ffffff' : '#facc15',
          alpha: 1.0,
          life: 0,
          maxLife: Math.round(Math.random() * 15 + 15),
          type: 'spark'
        });
      }

      // Sync and terminate early - defender takes absolute ZERO damage or shield damage!
      syncCombatStatesToUI();
      return;
    }

    // Capoeira Esquiva Dodge Stack system:
    if (defender.styleId === 'capoeira' && isEffectivelyBlocked) {
      const stacks = defender.capoeiraDodgeStacks !== undefined ? defender.capoeiraDodgeStacks : 3;
      if (stacks > 0 && !defender.capoeiraExhausted) {
        defender.capoeiraDodgeStacks = stacks - 1;
        defender.capoeiraRegenTimer = 0;
        defender.capoeiraDodgeFlashTime = 16;
        soundManager.playDash();
        const state = stateRef.current;
        for (let i = 0; i < 8; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 3 + 2;
          state.particles.push({
            id: `capoeira_dodge_${Math.random()}`,
            x: defender.x,
            y: defender.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: Math.random() * 3 + 1.5,
            color: Math.random() < 0.5 ? '#ca8a04' : '#16a34a',
            alpha: 1.0,
            life: 0,
            maxLife: 25,
            type: 'spark'
          });
        }
        
        // Check Exhaustion penalty if all 3 consumed
        if (defender.capoeiraDodgeStacks === 0) {
          const dx = defender.x - attacker.x;
          const dy = defender.y - attacker.y;
          const dist = Math.hypot(dx, dy) || 1;
          const kbX = dx / dist;
          const kbY = dy / dist;
          
          defender.vx = kbX * 10;
          defender.vy = kbY * 10;
          
          defender.capoeiraExhausted = true;
          defender.capoeiraExhaustTimer = 60; // 1.0s unable to move/attack/block
          defender.strikeCooldown = Math.max(60, defender.strikeCooldown || 0); // 1.0s attack lockout
          defender.isBlocking = false;
          
          soundManager.playKO();
        }
        
        syncCombatStatesToUI();
        return; // Complete damage/chip nullification!
      } else {
        defender.isBlocking = false;
      }
    }

    // Aikido Passive: Aiki Redirection Stance (True 2-Hit Super Armor) hit absorption
    const isAikidoSuperArmor = defender.styleId === 'aikido' && Boolean(defender.aikiM2StanceTimer && defender.aikiM2StanceTimer > 0 && (defender.aikiM2SuperArmorHits || 0) > 0);
    if (isAikidoSuperArmor) {
      defender.aikiM2SuperArmorHits = Math.max(0, (defender.aikiM2SuperArmorHits || 1) - 1);
      soundManager.playParry();
      spawnFloatingText(defender.x, defender.y - 30, `SUPER ARMOR ABSORBED! (${defender.aikiM2SuperArmorHits} REMAINING)`, '#0284c7');
      defender.superArmorFlashTime = 24;
      defender.superArmorFlashMaxTime = 24;
    }

    // New Rule: NON I-Frame Heavy's get interrupted when hit!
    const isChargingOrExecutingHeavy = (defender.heavyWindup && defender.heavyWindup > 0) || 
                                       defender.fists.some(f => f.isPunching && f.isHeavy);
    if (isChargingOrExecutingHeavy) {
      // Kyokushin Karate M2 Buff: During the Windup, Kyokushin Karate will not get their M2 Interrupted but will still receive damage.
      const isKyokushinWindup = defender.styleId === 'kyokushin' && (defender.heavyWindup && defender.heavyWindup > 0);
      const isCqc = defender.styleId === 'cqc';
      // CQC: Only interruptible during the first 0.24s (14.4 frames) of windup (when heavyWindup > 75.6 of 90 frames); after cancel limit (<= 75.6 frames), dash, and assault, gains Super Armor
      const isCqcSuperArmor = isCqc && ((defender.cqcM2Stage === 'windup' && (defender.heavyWindup || 0) <= 75.6) || defender.cqcM2Stage === 'dash' || defender.cqcM2Stage === 'assault');
      const isShellSuperArmor = defender.styleId === 'boxing_shell' && ((defender.heavyWindup || 0) > 0 || defender.fists.some(f => f.isPunching && f.isHeavy));
      const isKeysiSuperArmor = defender.styleId === 'keysi' && !!defender.keysiHasSuperArmor;

      if (!isKyokushinWindup && !isCqcSuperArmor && !isShellSuperArmor && !isKeysiSuperArmor && !isAikidoSuperArmor) {
        if (defender.heavyWindup && defender.heavyWindup > 0) {
          applyHeavyWhiffPenalty(defender);
        }
        if (isCqc) {
          defender.cqcM2Stage = null;
          defender.cqcRings = undefined;
          defender.cqcLockedTarget = null;
          defender.cqcLockedAngle = undefined;
          spawnFloatingText(defender.x, defender.y - 30, 'CQC CANCELLED', '#ef4444');
        }
        defender.heavyWindup = 0;
        defender.fists.forEach(f => {
          f.isPunching = false;
          f.punchProgress = 0;
          f.isHeavy = false;
        });
        defender.strikeCooldown = Math.max(HIT_ATTACK_LOCKOUT_FRAMES, defender.strikeCooldown || 0);
      }
    }

    // Taking hits while holding block does NOT reset block timer, strictly preventing parrying while simply blocking

    // Update Stamina Engine & Sprint Striker Buffer (1.5s hit-buff window refreshed, or cleared on S4)
    const isS4Finisher = !isHeavy && comboStage === 3;
    onLandedHitStaminaUpdate(attacker as CombatFighter, isS4Finisher);

    // Standard Knockback push values (11 frames block recoil if blocked; direct hits receive full 0.45s HITSTUN_FRAMES)
    // True 2-Hit Super Armor: Completely immune to sudden stuns/staggers while Super Armor absorbs hit
    if (!isAikidoSuperArmor) {
      defender.stunTime = 11;
    } else {
      defender.stunTime = 0;
    }
    const dx = defender.x - attacker.x;
    const dy = defender.y - attacker.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const kbX = dx / dist;
    const kbY = dy / dist;

    // Calculate height damage scaling based on attacker height
    const attackerMods = getHeightModifiers(attacker.baseHeight);
    
    // Passives Damage Multipliers:
    // Glass Brawler (Slugger): +40% damage dealt, +15% damage taken
    // Iron Guard (Muay Thai): 5% incoming damage reduction
    // In-Fighting Precision (Shotokan): +10% damage at close proximity
    // Kyokushin Karate: +8% damage dealt, 10% incoming damage reduction
    let attackerDmgMult = 1.0;
    if (attacker.styleId === 'slugger') attackerDmgMult *= 1.4;
    if (attacker.styleId === 'kyokushin') {
      if (attacker.kyokushinBlockStoredPowerTimer && attacker.kyokushinBlockStoredPowerTimer > 0) {
        attackerDmgMult *= 1.05; // Bone-Crushing Attrition (+5% Overall Damage for 1.0s after exiting block)
      }
      if (isHeavy && attacker.kyokushinM2AbsorbedHits && attacker.kyokushinM2AbsorbedHits > 0) {
        attackerDmgMult *= (1.0 + 0.05 * attacker.kyokushinM2AbsorbedHits); // Super M2 Kinetic Absorption (+5% per absorbed hit)
      }
    }
    if (attacker.styleId === 'shotokan') {
      const hitDist = Math.hypot(attacker.x - defender.x, attacker.y - defender.y);
      if (hitDist <= 75) attackerDmgMult *= 1.10;
    }
    if (attacker.styleId === 'capoeira' && attacker.capoeiraWhiffBonusActive) {
      attackerDmgMult *= 1.20;
      attacker.capoeiraWhiffBonusActive = false;
    }
    if (attacker.styleId === 'basic' && !isHeavy && (attacker.flowStrikerBuffTimer || 0) > 0) {
      attackerDmgMult *= 1.10;
      attacker.flowStrikerBuffTimer = 0;
    }
    if (attacker.styleId === 'kickboxing') {
      attackerDmgMult *= 1.05; // Kickboxing Base Stats: Damage 1.05x
    }

    let defenderDmgMult = 1.0;
    const defenderHeightMods = getHeightModifiers(defender.baseHeight);
    if (defenderHeightMods.damageReduction > 0) {
      defenderDmgMult *= (1.0 - defenderHeightMods.damageReduction);
    }
    if (defender.styleId === 'slugger') defenderDmgMult *= 1.15;
    if (defender.styleId === 'muay_thai') defenderDmgMult *= 0.95;
    if (defender.styleId === 'kyokushin') {
      const dr = defender.kyokushinConditioningDR !== undefined ? defender.kyokushinConditioningDR : 0.10;
      defenderDmgMult *= (1.0 - dr); // Full-Contact Conditioning degrading armor DR (10% down to 0%)
      defender.kyokushinConditioningDR = Math.max(0, dr - 0.01); // Degrades by 1% per hit taken
      defender.kyokushinOutOfCombatTimer = 0;
    }
    if (attacker.styleId === 'kyokushin') {
      attacker.kyokushinOutOfCombatTimer = 0;
    }
    if (defender.styleId === 'aikido') {
      if (defender.aikiM2StanceTimer && defender.aikiM2StanceTimer > 0) {
        defenderDmgMult *= 0.85; // +15% Damage Resistance boost (x1.10 defense = 0.85 damage taken multiplier)
      } else {
        defenderDmgMult *= 1.05; // Soft physical profile (x0.95 defense = 1.05 damage taken multiplier)
      }
    }
    if (defender.keysiVulnerableTimer && defender.keysiVulnerableTimer > 0) defenderDmgMult *= 1.30; // Over-Extended Vulnerability (+30% DMG taken)
    if (attacker.boneFractureTimer && attacker.boneFractureTimer > 0 && !isHeavy) attackerDmgMult *= 0.40; // Bone Fracture (-60% M1 Damage penalty)

    // Aggressive Attrition (Muay Thai): Double chip damage across light sequence strikes
    const isMuayThai = attacker.styleId === 'muay_thai';
    const isSlugger = attacker.styleId === 'slugger';
    const isShotokan = attacker.styleId === 'shotokan';
    const chipMultiplier = (isMuayThai && !isHeavy) ? 2.0 : 1.0;

    let rawBaseDamage = isHeavy ? 10 : (comboStage === 3 ? 6 : 5);
    let rawChipDamage = (isHeavy ? 8 : (comboStage === 3 ? 1.5 : 1.0)) * chipMultiplier;

    if (isSlugger) {
      if (isHeavy) {
        rawBaseDamage = 16.0;
        rawChipDamage = 9.6; // +20% Increased Chip Damage on M2 Block
      } else {
        // Slugger 4-combo Sequence: S1: 6.5 HP, S2: 7.0 HP, S3: 7.5 HP, S4: 10.5 HP
        if (comboStage === 0) {
          rawBaseDamage = 6.5;
          rawChipDamage = 1.3;
        } else if (comboStage === 1) {
          rawBaseDamage = 7.0;
          rawChipDamage = 1.4;
        } else if (comboStage === 2) {
          rawBaseDamage = 7.5;
          rawChipDamage = 1.5;
        } else if (comboStage === 3) {
          rawBaseDamage = 10.5;
          rawChipDamage = 2.1;
        }
      }
    } else if (isShotokan) {
      if (isHeavy) {
        rawBaseDamage = 13.0; // Ushiro-Mawashi-Geri
        rawChipDamage = 8.0;
      } else {
        // Shotokan 4-Sequence Matrix:
        // S1 (Stage 0): Empi-Uchi (Elbow) 5.0 HP
        // S2 (Stage 1): Ren-Zuki Part 1 3.0 HP
        // S3 (Stage 2): Ren-Zuki Part 2 3.0 HP
        // S4 (Stage 3): Mae-Geri (Front Snap Kick) 7.0 HP
        if (comboStage === 0) {
          rawBaseDamage = 5.0;
          rawChipDamage = 1.0;
        } else if (comboStage === 1 || comboStage === 2) {
          rawBaseDamage = 3.0;
          rawChipDamage = 1.0;
        } else if (comboStage === 3) {
          rawBaseDamage = 7.0;
          rawChipDamage = 2.0;
        }
      }
    } else if (attacker.styleId === 'ashihara') {
      if (isHeavy) {
        // Ashihara heavy (M2) parry does not deal direct damage
        rawBaseDamage = 0.0;
        rawChipDamage = 0.0;
      } else {
        // Ashihara 4-Combo Light Strike Sequence:
        // S1 (Stage 0): Seiken Chudan Tsuki 4.0 HP, 0.8 Chip
        // S2 (Stage 1): Gedan Mawashi Geri 4.0 HP, 0.8 Chip
        // S3 (Stage 2): Chudan Kansetsu Geri 4.0 HP, 0.8 Chip
        // S4 (Stage 3): Ashibarai 5.0 HP, 1.0 Chip
        if (comboStage === 0 || comboStage === 1 || comboStage === 2) {
          rawBaseDamage = 4.0;
          rawChipDamage = 0.8;
        } else if (comboStage === 3) {
          rawBaseDamage = 5.0;
          rawChipDamage = 1.0;
        }
      }
    } else if (attacker.styleId === 'capoeira') {
      if (isHeavy) {
        rawBaseDamage = 16.0;
        rawChipDamage = 11.0; // Dynamic heavy chip
      } else {
        // Capoeira 4-Combo Light Strike Sequence:
        // S1 (Stage 0): Meia Lua de Frente 8.0 HP
        // S2 (Stage 1): Martelo 8.0 HP
        // S3 (Stage 2): Queixada 8.0 HP
        // S4 (Stage 3): Bênção 10.0 HP
        if (comboStage === 0 || comboStage === 1 || comboStage === 2) {
          rawBaseDamage = 8.0;
          rawChipDamage = 2.0;
        } else if (comboStage === 3) {
          rawBaseDamage = 10.0;
          rawChipDamage = 3.0;
        }
      }
    } else if (attacker.styleId === 'kickboxing') {
      if (isHeavy) {
        const activeFist = attacker.fists.find(f => f.isPunching);
        const isSeq2 = (activeFist as any)?.kickboxingSeq2 || attacker.kickboxingIsSeq2;
        if (isSeq2) {
          rawBaseDamage = 14.0;
          rawChipDamage = 14.4; // 80% Armor Chip
        } else {
          rawBaseDamage = 8.0;
          rawChipDamage = 3.6;  // 20% Armor Chip
        }
      } else {
        if (comboStage === 0 || comboStage === 1) {
          rawBaseDamage = 5.5;
          rawChipDamage = 1.0;
        } else if (comboStage === 2) {
          rawBaseDamage = 6.5;
          rawChipDamage = 1.2;
        } else if (comboStage === 3) {
          rawBaseDamage = 9.0;
          rawChipDamage = 2.0;
        }
      }
    } else if (attacker.styleId === 'kyokushin') {
      if (isHeavy) {
        rawBaseDamage = 10.0;
        rawChipDamage = 3.0;
        if (attacker.kyokushinBlockStoredPowerTimer && attacker.kyokushinBlockStoredPowerTimer > 0) {
          rawChipDamage *= 1.50; // Bone-Crushing Attrition (+50% Chip Damage)
        }
      } else {
        // Kyokushin Normalized 4-Combo Light Sequence (1.00x Baseline):
        // S1-S3: 5.0 HP, 1.0 Chip
        // S4: 7.5 HP, 1.5 Chip
        if (comboStage === 0 || comboStage === 1 || comboStage === 2) {
          rawBaseDamage = 5.0;
          rawChipDamage = 1.0;
        } else if (comboStage === 3) {
          rawBaseDamage = 7.5;
          rawChipDamage = 1.5;
        }
        if (attacker.kyokushinBlockStoredPowerTimer && attacker.kyokushinBlockStoredPowerTimer > 0) {
          rawChipDamage *= 1.50; // Bone-Crushing Attrition (+50% Chip Damage)
        }
      }
    } else if (attacker.styleId === 'keysi') {
      if (isHeavy) {
        // Pensador Elbow Clinch to Headbutt (14.0 HP Base, 7.0 Chip)
        rawBaseDamage = 14.0;
        rawChipDamage = 7.0;
      } else {
        // Keysi 4-Combo Sequence:
        // S1: Lead Forearm Wedge (4.5 HP, 2.2 Chip)
        // S2: Rear Forearm Smash (4.5 HP, 2.2 Chip)
        // S3: Descending Elbow (7.2 HP, 3.6 Chip) (+20% Brutal Escalation)
        // S4: Heavy Pocket Knee (9.6 HP, 4.8 Chip) (+20% Brutal Escalation)
        if (comboStage === 0 || comboStage === 1) {
          rawBaseDamage = 4.5;
          rawChipDamage = 2.2;
        } else if (comboStage === 2) {
          rawBaseDamage = 7.2;
          rawChipDamage = 3.6;
        } else if (comboStage === 3) {
          rawBaseDamage = 9.6;
          rawChipDamage = 4.8;
        }
      }
    } else if (attacker.styleId === 'cqc') {
      if (isHeavy) {
        rawBaseDamage = 14.0;
        rawChipDamage = 5.0;
      } else {
        // CQC 4-Sequence Matrix:
        // S1: Left Open Palm 6.0 HP, 0.8 Chip
        // S2: Right Open Palm 6.0 HP, 0.8 Chip
        // S3: Forearm Strike 7.0 HP, 1.2 Chip
        // S4: Front Straight Punch 9.0 HP, 2.0 Chip
        if (comboStage === 0 || comboStage === 1) {
          rawBaseDamage = 6.0;
          rawChipDamage = 0.8;
        } else if (comboStage === 2) {
          rawBaseDamage = 7.0;
          rawChipDamage = 1.2;
        } else if (comboStage === 3) {
          rawBaseDamage = 9.0;
          rawChipDamage = 2.0;
        }
      }
    } else if (attacker.styleId === 'boxing_shell') {
      if (isHeavy) {
        // Boxing Shell M2 Shoulder Roll deals NO direct damage or chip damage
        rawBaseDamage = 0.0;
        rawChipDamage = 0.0;
      } else {
        // Boxing Shell 4-Combo Sequence:
        // S1: 4.5 HP, S2: 4.5 HP, S3: 5.5 HP, S4: 7.5 HP
        if (comboStage === 0 || comboStage === 1) {
          rawBaseDamage = 4.5;
          rawChipDamage = 0.8;
        } else if (comboStage === 2) {
          rawBaseDamage = 5.5;
          rawChipDamage = 1.0;
        } else if (comboStage === 3) {
          rawBaseDamage = 7.5;
          rawChipDamage = 1.5;
        }
      }
    } else if (attacker.styleId === 'basic') {
      if (isHeavy) {
        // M2 Sway-Dash Straight: 11.0 HP Direct, 70% AP Guard Damage (7.7 AP Chip)
        rawBaseDamage = 11.0;
        rawChipDamage = 7.7;
      } else {
        // Flow Boxing 4-Combo Sequence:
        // S1 (Stage 0): Snapping Lead Jab 4.5 HP, 0.8 Chip
        // S2 (Stage 1): Right Hook 5.0 HP, 1.0 Chip
        // S3 (Stage 2): Right Hook Feint 0.0 HP, 0.0 Chip (Parry Trap Bait)
        // S4 (Stage 3): Left Looping Hook 7.5 HP (15.0 HP 2x unparryable if S3 parry-baited)
        if (comboStage === 0) {
          rawBaseDamage = 4.5;
          rawChipDamage = 0.8;
        } else if (comboStage === 1) {
          rawBaseDamage = 5.0;
          rawChipDamage = 1.0;
        } else if (comboStage === 2) {
          rawBaseDamage = 0.0;
          rawChipDamage = 0.0;
        } else if (comboStage === 3) {
          if (attacker.flowS3ParryBaited) {
            rawBaseDamage = 15.0; // 2x Damage
            rawChipDamage = 3.0;
          } else {
            rawBaseDamage = 7.5;
            rawChipDamage = 1.5;
          }
        }
      }
    } else if (attacker.styleId === 'street_boxing') {
      if (isHeavy) {
        if (attacker.streetBoxingM2Stage === 3) {
          rawBaseDamage = 6.0;
          rawChipDamage = 2.0;
        } else {
          rawBaseDamage = 3.5;
          rawChipDamage = 1.0;
        }
      } else {
        // Street Boxing 4-Combo Sequence:
        // S1 (Stage 0): Lead Left Poke Jab 3.5 HP, 0.7 Chip
        // S2 (Stage 1): Rapid Left Jab 3.5 HP, 0.7 Chip
        // S3 (Stage 2): Rear Straight 4.5 HP, 1.0 Chip
        // S4 (Stage 3): Brawling Left Hook 6.0 HP, 1.5 Chip
        if (comboStage === 0 || comboStage === 1) {
          rawBaseDamage = 3.5;
          rawChipDamage = 0.7;
        } else if (comboStage === 2) {
          rawBaseDamage = 4.5;
          rawChipDamage = 1.0;
        } else if (comboStage === 3) {
          rawBaseDamage = 6.0;
          rawChipDamage = 1.5;
        }
      }
    } else if (attacker.styleId === 'aikido') {
      if (isHeavy) {
        rawBaseDamage = 0.0;
        rawChipDamage = 0.0;
      } else {
        // Aikido 4-Combo Sequence:
        // S1 (Stage 0): Irimi Open-Palm 4.0 HP
        // S2 (Stage 1): Kote-Gaeshi Slap 4.0 HP
        // S3 (Stage 2): Left Straight Thrust 4.0 HP (Zero spin-out)
        // S4 (Stage 3): Irimi Glide-Palm 8.0 HP
        if (comboStage === 0 || comboStage === 1 || comboStage === 2) {
          rawBaseDamage = 4.0;
          rawChipDamage = 0.8;
        } else if (comboStage === 3) {
          rawBaseDamage = 8.0;
          rawChipDamage = 1.5;
        }
      }
    } else if (attacker.styleId === 'street_taekwondo') {
      if (isHeavy) {
        // M2 Brazilian Kick (Question Mark Kick): 13.0 HP Base, 4.0 Chip
        // Empowered to 18.0 HP / 6.0 Chip if defender was feint trapped!
        const isEmpowered = !!attacker.tkdFeintTrapped;
        rawBaseDamage = isEmpowered ? 18.0 : 13.0;
        rawChipDamage = isEmpowered ? 6.0 : 4.0;
      } else {
        // Street Taekwondo 4-Combo Light Sequence (M1):
        // S1: 4.8 HP (0.20s DS)
        // S2: 4.8 HP (0.20s DS)
        // S3: 6.0 HP (0.10s DS, Spinning Back Kick)
        // S4: 8.0 HP (0.25s DS, Side Whip Finisher)
        if (comboStage === 0 || comboStage === 1) {
          rawBaseDamage = 4.8;
          rawChipDamage = 1.4;
        } else if (comboStage === 2) {
          rawBaseDamage = 6.0;
          rawChipDamage = 1.8;
        } else if (comboStage === 3) {
          rawBaseDamage = 8.0;
          rawChipDamage = 2.4;
        }
      }
    }
    
    const isMuayThaiHeavy = isHeavy && attacker.styleId === 'muay_thai';
    const isSluggerHeavy = isHeavy && isSlugger;
    const isKickboxingHeavy = isHeavy && attacker.styleId === 'kickboxing';
    const isKyokushinHeavy = isHeavy && attacker.styleId === 'kyokushin';
    
    const damageVal = rawBaseDamage * attackerMods.damageFactor * attackerDmgMult * defenderDmgMult;
    const chipVal = rawChipDamage * attackerMods.damageFactor * attackerDmgMult * defenderDmgMult;
    
    const formattedDamage = Math.round(damageVal * 10) / 10;
    const formattedChip = Math.round(chipVal * 10) / 10;

    // Track match analytics for Post Match HUD
    const appliedDmg = isEffectivelyBlocked ? formattedChip : formattedDamage;
    if (attacker.isPlayer) {
      matchDamageDealtRef.current = Math.round((matchDamageDealtRef.current + appliedDmg) * 10) / 10;
      roundDamageDealtRef.current = Math.round((roundDamageDealtRef.current + appliedDmg) * 10) / 10;
      sliceDamageDealtRef.current = (sliceDamageDealtRef.current || 0) + appliedDmg;
      setMatchDamageDealt(matchDamageDealtRef.current);
      setMatchHitsLanded(prev => prev + 1);
      if (isHeavy) {
        matchHeaviesLandedRef.current += 1;
        roundHeaviesLandedRef.current += 1;
      } else {
        matchLightsLandedRef.current += 1;
        roundLightsLandedRef.current += 1;
      }

      const activeMode = getMatchModeKey();

      // Track first hit
      if (!matchFirstHitOccurredRef.current) {
        matchFirstHitOccurredRef.current = true;
        QuestTracker.trackEvent(userEmail, {
          type: 'first_hit',
          mode: activeMode
        });
      }

      // Track damage dealt
      QuestTracker.trackEvent(userEmail, {
        type: 'damage_dealt',
        amount: Math.round(appliedDmg),
        mode: activeMode,
        lightOnly: !isHeavy
      });

      // Track heavy hit
      if (isHeavy) {
        QuestTracker.trackEvent(userEmail, {
          type: 'heavy_hit',
          mode: activeMode
        });
      }

      // Track S4 combo finisher
      if (!isHeavy && comboStage === 3) {
        matchM1ChainsRef.current += 1;
        QuestTracker.trackEvent(userEmail, {
          type: 's4_combo',
          mode: activeMode
        });
      }

      // Track Whiff Punisher (hitting AI during heavy cooldown / whiff recovery)
      if ((defender.heavyCooldown || 0) > 0 || (defender.keysiVulnerableTimer || 0) > 0 || (defender.ashiharaRecoveryTimer || 0) > 0) {
        matchWhiffPunishesRef.current += 1;
      }

      // Track Counter King (interrupting enemy M1 strike startup with M2 heavy)
      if (isHeavy && defender.fists.some(f => f.isPunching && !f.isHeavy)) {
        matchCounterHitsRef.current += 1;
      }

      // Track Guard Breaks
      if (defender.armorBreakTime === 60 || (isEffectivelyBlocked && (defender.armorHP || 0) <= 0)) {
        matchGuardBreaksRef.current += 1;
      }
    } else {
      if (!matchFirstHitOccurredRef.current) {
        matchFirstHitOccurredRef.current = true;
      }
      if (defender.isPlayer) {
        if (isEffectivelyBlocked && !isParry) {
          matchBlockedStrikesRef.current += 1;
        }
        matchDamageTakenRef.current = Math.round((matchDamageTakenRef.current + appliedDmg) * 10) / 10;
        setMatchDamageTaken(matchDamageTakenRef.current);
        roundDamageTakenRef.current = Math.round((roundDamageTakenRef.current + appliedDmg) * 10) / 10;
        sliceDamageTakenRef.current = (sliceDamageTakenRef.current || 0) + appliedDmg;
        const currentHp = Math.max(0, defender.health - appliedDmg);
        const maxHp = defender.maxHealth || 100;
        const hpPct = Math.round((currentHp / maxHp) * 100);
        minPlayerHpPctRef.current = Math.min(minPlayerHpPctRef.current, hpPct);
      }
    }

    // (Perfect parry check moved to the top of applyFighterHit to allow Capoeira style to parry)
    // Apply Universal Hit-Stun Steering Lock (0.45s), Movement Lock (0.45s), and Hitstun/Attack Lockout (0.45s) upon taking damage
    applyDamageCombatLocks(defender, isEffectivelyBlocked);

    if (attacker.styleId === 'kickboxing') {
      // Passive - Chain Reaction: Every landed hit reduces M2 cooldown by 0.2s (12 frames)
      if (attacker.heavyCooldown && attacker.heavyCooldown > 0) {
        attacker.heavyCooldown = Math.max(0, attacker.heavyCooldown - 12);
        spawnFloatingText(attacker.x, attacker.y - 25, 'CHAIN REACTION (-0.2s CD)', '#f59e0b');
      }
      if (isHeavy) {
        const activeFist = attacker.fists.find(f => f.isPunching);
        const isSeq2 = (activeFist as any)?.kickboxingSeq2 || attacker.kickboxingIsSeq2;
        if (isSeq2) {
          attacker.kickboxingS2Hit = true;
        } else {
          attacker.kickboxingS1Hit = true;
        }
      }
    }

    const isDefenderCqcVulnerable = defender.styleId === 'cqc' && ((defender.cqcM2Stage === 'windup' && (defender.heavyWindup || 0) > 75.6) || (defender.heavyWindup || 0) > 75.6);
    const isDefenderCqcSuperArmor = defender.styleId === 'cqc' && !isDefenderCqcVulnerable && (defender.cqcM2Stage === 'dash' || defender.cqcM2Stage === 'assault' || (defender.cqcM2Stage === 'windup' && (defender.heavyWindup || 0) <= 75.6));
    if (!isEffectivelyBlocked && defender.styleId === 'cqc' && isDefenderCqcVulnerable) {
      defender.cqcM2Stage = null;
      defender.cqcLockedTarget = null;
      defender.cqcRings = undefined;
      defender.isDashing = false;
      defender.dashProgress = 0;
      applyHeavyWhiffPenalty(defender);
      defender.heavyWindup = 0;
      defender.stunTime = Math.max(defender.stunTime || 0, 27);
      defender.strikeCooldown = Math.max(defender.strikeCooldown || 0, 27);
      spawnFloatingText(defender.x, defender.y - 30, 'CQC INTERRUPTED!', '#ef4444');
    }

    if (isEffectivelyBlocked) {
      // DEFENDER IS BLOCKING WITHIN FORWARD ARC!
      // Dynamic HP-Linked Impact Vignette for Guard Hits
      const defenderHpPct = (defender.health / defender.maxHealth) * 100;
      if (defenderHpPct > 70) {
        // High HP (>70%): NO Viewport Vignette. Metallic spark at glove contact point. Micro screen-shake (1px).
        stateRef.current.shakeAmount = Math.max(stateRef.current.shakeAmount, 1 * settings.screenShake);
        for (let i = 0; i < 6; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 3 + 1;
          stateRef.current.particles.push({
            id: `metallic_spark_${Math.random()}`,
            x: defender.x,
            y: defender.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: Math.random() * 2.5 + 1.5,
            color: '#cbd5e1',
            alpha: 1.0,
            life: 0,
            maxLife: 12,
            type: 'spark'
          });
        }
      } else if (defenderHpPct >= 30) {
        // Mid HP (30%-70%): Flash ORANGE Vignette (rgba(255, 120, 0, 0.40)) for 4 frames. Heavy kinetic shockwave.
        if (defender.isPlayer || stateRef.current.matchData?.isAiVsAiSpectator) {
          stateRef.current.blockVignetteType = 'orange';
          stateRef.current.blockVignetteTimer = 4;
          stateRef.current.blockVignetteMaxFrames = 4;
        }
        stateRef.current.shakeAmount = Math.max(stateRef.current.shakeAmount, 3 * settings.screenShake);
        for (let i = 0; i < 8; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 4 + 2;
          stateRef.current.particles.push({
            id: `shockwave_${Math.random()}`,
            x: defender.x,
            y: defender.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: Math.random() * 3 + 2,
            color: '#fb923c',
            alpha: 1.0,
            life: 0,
            maxLife: 15,
            type: 'spark'
          });
        }
      } else {
        // Low HP (<30%): Flash RED Vignette (rgba(220, 0, 0, 0.65)) for 6 frames. Heavy bone-impact flash. High screen-shake.
        if (defender.isPlayer || stateRef.current.matchData?.isAiVsAiSpectator) {
          stateRef.current.blockVignetteType = 'red';
          stateRef.current.blockVignetteTimer = 6;
          stateRef.current.blockVignetteMaxFrames = 6;
        }
        stateRef.current.shakeAmount = Math.max(stateRef.current.shakeAmount, 5 * settings.screenShake);
        for (let i = 0; i < 12; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 5 + 2;
          stateRef.current.particles.push({
            id: `bone_impact_${Math.random()}`,
            x: defender.x,
            y: defender.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: Math.random() * 4 + 2,
            color: '#ef4444',
            alpha: 1.0,
            life: 0,
            maxLife: 20,
            type: 'spark'
          });
        }
      }

      if (defender.isPlayer) {
        const blockedDamage = Math.max(0, formattedDamage - formattedChip);
        QuestTracker.trackEvent(userEmail, {
          type: 'damage_blocked',
          mode: getMatchModeKey(),
          amount: Math.round(blockedDamage)
        });
      }

      if (defender.styleId === 'kyokushin') {
        // Kyokushin Fudo Dachi Guard: Absorbs up to 4 hits cleanly without canceling block.
        // 5th light attack OR 1 Heavy Attack (M2) breaches the guard!
        const totalChipDmg = formattedChip;

        defender.health = Math.max(0, defender.health - totalChipDmg);
        defender.armorHP = 18;
        defender.armorBreakTime = 0;
        defender.damageFlashTime = isHeavy ? 10 : 5;
        const stage = comboStage ?? 0;
        const kbAmount = isHeavy ? 4 : (stage === 3 ? 3 : 0);
        defender.vx = kbX * kbAmount;
        defender.vy = kbY * kbAmount;

        // Mark stored power active for Bone-Crushing Attrition (+50% Chip, +5% Dmg upon exiting block)
        defender.kyokushinBlockStoredPowerActive = true;

        if (isHeavy) {
          // Trigger Kyokushin Punch Gust if attacker is Kyokushin
          if (isKyokushinHeavy) {
            spawnKyokushinPunchGust(attacker, defender);
          }

          // Apply heavy cooldown to the attacker who struck the block so M2 cooldown is preserved
          if (attacker.styleId === 'kyokushin') {
            attacker.heavyCooldown = 480; // 8.0s on hit
          } else if (attacker.styleId === 'kickboxing') {
            attacker.heavyCooldown = 192;
          } else if (attacker.styleId === 'boxing_shell') {
            attacker.heavyCooldown = 360;
          } else if (attacker.styleId === 'capoeira') {
            attacker.heavyCooldown = 318;
          } else if (attacker.styleId === 'keysi') {
            attacker.heavyCooldown = 720;
          } else if (attacker.styleId === 'slugger') {
            attacker.heavyCooldown = 720; // 12.0s Hit Cooldown
          } else if (attacker.styleId === 'ashihara') {
            attacker.heavyCooldown = 270;
          } else if (attacker.styleId === 'shotokan') {
            attacker.heavyCooldown = 300;
          } else if (attacker.styleId === 'muay_thai') {
            attacker.heavyCooldown = 300;
          } else {
            attacker.heavyCooldown = 240;
          }
        }

        let isBreached = false;
        if (isHeavy) {
          isBreached = true;
        } else {
          defender.kyokushinBlockHitsTaken = (defender.kyokushinBlockHitsTaken || 0) + 1;
          if (defender.kyokushinBlockHitsTaken >= 5) {
            isBreached = true;
          }
        }

        if (isBreached) {
          defender.isBlocking = false;
          defender.armorBreakTime = 180; // 3.0s guard break lockout
          defender.blockLockout = 180;
          defender.blockTimer = 0;
          defender.kyokushinBlockHitsTaken = 0;
          spawnFloatingText(defender.x, defender.y - 30, 'GUARD BREACHED! (3.0s)', '#dc2626');
          soundManager.playKO();
          stateRef.current.shakeAmount = 10 * settings.screenShake;
          for (let i = 0; i < 18; i++) {
            const angle = (i / 18) * Math.PI * 2;
            const speed = Math.random() * 4 + 2;
            stateRef.current.particles.push({
              id: `kyokushin_breach_${Math.random()}`,
              x: defender.x,
              y: defender.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              radius: Math.random() * 3 + 2,
              color: i % 2 === 0 ? '#dc2626' : '#5A6268',
              alpha: 1.0,
              life: 0,
              maxLife: 30,
              type: 'spark'
            });
          }
        } else {
          // Block stays fully active and unbroken for hits 1-4
          defender.isBlocking = true;
          defender.blockLockout = 0;
          defender.stunTime = 0;
          soundManager.playRollTick();
          spawnFloatingText(defender.x, defender.y - 5, `-${totalChipDmg} HP (${defender.kyokushinBlockHitsTaken}/4)`, '#cbd5e1');
        }

        syncCombatStatesToUI();
        return;
      }

      if (isMuayThaiHeavy) {
        // MUAY THAI HEAVY: CLINCH KNEE CHIP
        defender.health = Math.max(0, defender.health - formattedChip);
        
        // Massive chip damage to armor (Aggressive Attrition)
        const armorDamage = chipVal * 1.5;
        defender.armorHP = Math.max(0, (defender.armorHP || 18) - armorDamage);
        
        defender.damageFlashTime = 8;
        defender.vx = kbX * 4;
        defender.vy = kbY * 4;

        soundManager.playRollTick();
        stateRef.current.shakeAmount = 8 * settings.screenShake;

        spawnFloatingText(defender.x, defender.y - 5, `-${formattedChip} CHIP HP`, '#f8fafc');

        if (defender.armorHP <= 0) {
          // Break armor with heavy knee -> Stun
          defender.isBlocking = false;
          defender.stunTime = 60; // 1.0s Stun
          defender.armorBreakTime = 60;
          
          if (defender.isPlayer) {
            stateRef.current.visionBlurTime = 60;
          }

          stateRef.current.shakeAmount = 12 * settings.screenShake;
          soundManager.playKO();
        }
      } else if (isKickboxingHeavy) {
        const activeFist = attacker.fists.find(f => f.isPunching);
        const isSeq2 = (activeFist as any)?.kickboxingSeq2 || attacker.kickboxingIsSeq2;
        if (isSeq2) {
          // 🎯 Sequence 2 On-Hit Branch (Teep): 80% Armor Chip (14.4 HP)
          const currentArmor = defender.armorHP !== undefined ? defender.armorHP : 18;
          const maxArmor = 18;
          const canBreakGuard = currentArmor <= (maxArmor * 0.80) + 0.1;
          
          defender.health = Math.max(0, defender.health - formattedChip);
          defender.damageFlashTime = 12;
          defender.concussTime = 108; // 60% slow for 1.8s
          
          if (canBreakGuard) {
            defender.armorHP = 0;
            defender.isBlocking = false;
            defender.armorBreakTime = 60; // 1.0s stagger
            defender.stunTime = 30;
          } else {
            defender.armorHP = Math.max(1.0, currentArmor - 14.4);
            defender.armorBreakTime = 0;
          }
          
          defender.vx = kbX * 18;
          defender.vy = kbY * 18;
          soundManager.playPunch(true);
          stateRef.current.shakeAmount = 14 * settings.screenShake;
          stateRef.current.hitstopTime = 4; // 4-frame impact freeze on S2 Teep
          attacker.kickboxingS2Hit = true;
          finalizeKickboxingM2Cooldown(attacker);
          spawnFloatingText(defender.x, defender.y - 10, `-${formattedChip} CHIP`, '#f8fafc');
        } else {
          // Sequence 1 (Short Hook on block): Chips 20% max armor (3.6 HP), suppresses Armor Regen for 0.9s (54 frames), micro-dazes, queues S2 in 0.15s
          defender.health = Math.max(0, defender.health - formattedChip);
          const currentArmor = defender.armorHP !== undefined ? defender.armorHP : 18;
          defender.armorHP = Math.max(0, currentArmor - 3.6);
          defender.armorRegenLockout = 54; // 0.9s suppression!
          defender.stunTime = 12; // Micro-daze
          defender.damageFlashTime = 8;
          stateRef.current.hitstopTime = 2;
          attacker.kickboxingAutoSeq2Timer = 9; // 0.15s auto-trigger S2 Rapid Chamber
          attacker.kickboxingSeq2Ready = true;
          attacker.kickboxingSeq2Window = 45;
          // Short hook knockback (20% knockback passive not activated on S1)
          defender.vx = kbX * 6;
          defender.vy = kbY * 6;
          soundManager.playPunch(true);
          stateRef.current.shakeAmount = 8 * settings.screenShake;
          spawnFloatingText(defender.x, defender.y - 10, `-${formattedChip} CHIP`, '#f8fafc');
        }
      } else if (isHeavy && attacker.styleId === 'boxing_shell') {
        // Boxing Shell M2 against standard block: It's just a Push (Not a Parry).
        // 2x Posture is NOT applied, and the enemy is simply knockbacked a short distance with NO spin out.
        defender.damageFlashTime = 8;
        defender.vx = kbX * 5.0;
        defender.vy = kbY * 5.0;
        defender.shellSpinTimer = 0;
        defender.shellLockoutTimer = 0;
        attacker.heavyCooldown = 360; // 6.0s CD
        soundManager.playPunch(false);
        stateRef.current.shakeAmount = 4 * settings.screenShake;
        spawnFloatingText(defender.x, defender.y - 30, 'DEFLECTIVE PUSH', '#94a3b8');
      } else if (isHeavy) {
        // HEAVY ATTACK INSTANTLY ARMOR BREAKS!
        defender.armorHP = 0;
        defender.isBlocking = false;
        defender.armorBreakTime = 60; // 1.0 second stagger
        defender.health = Math.max(0, defender.health - formattedChip); // Chip damage
        
        // Lockouts: 1.0s stagger, 0.45s attack disable, 0.3s block lockout
        defender.stunTime = Math.max(defender.stunTime || 0, 60);
        defender.strikeCooldown = Math.max(defender.strikeCooldown || 0, HIT_ATTACK_LOCKOUT_FRAMES);
        if ((defender.blockLockout || 0) <= 0) defender.blockLockout = 18;
        defender.heavyWindup = 0;
        defender.fists.forEach(f => {
          f.isPunching = false;
          f.punchProgress = 0;
        });

        // Huge knockback (Far knockback for Capoeira M2 sweep, high knockback for Street Boxing final hook)
        const heavyKb = attacker.styleId === 'capoeira' ? 15 : (attacker.styleId === 'kyokushin' ? 14 : (attacker.styleId === 'street_boxing' ? (attacker.streetBoxingM2Stage === 3 ? 15 : 3) : 12));
        defender.vx = kbX * heavyKb;
        defender.vy = kbY * heavyKb;
        defender.damageFlashTime = 15;

        // Feedback
        soundManager.playKO();
        stateRef.current.shakeAmount = 14 * settings.screenShake;
        
        if (defender.isPlayer) {
          stateRef.current.visionBlurTime = 108; // 1.8s
        }
        defender.concussTime = 108; // Universal Rule: M2 slows movement by 60%
        if (attacker.styleId === 'kyokushin') {
          defender.crippleTime = 720; // 12.0s Leg Cripple slow (-15% speed)
          spawnKyokushinPunchGust(attacker, defender);
        }

        spawnFloatingText(defender.x, defender.y - 5, `-${formattedChip} CHIP HP`, '#f8fafc');

        if (attacker.styleId === 'kyokushin') {
          attacker.heavyCooldown = 480; // 8.0s on hit
        } else {
          let baseHeavyCD = 240;
          if (attacker.styleId === 'muay_thai') baseHeavyCD = 300;
          else if (attacker.styleId === 'ashihara') baseHeavyCD = 270;
          else if (attacker.styleId === 'shotokan') baseHeavyCD = 300;
          else if (attacker.styleId === 'capoeira') baseHeavyCD = 318;
          else if (attacker.styleId === 'slugger') {
            baseHeavyCD = 720;
            defender.boneFractureTimer = 210; // 3.5s Bone Fracture on M2 block (210 frames)
            const hitX = strikePos?.x ?? ((attacker.x + defender.x) / 2);
            const hitY = strikePos?.y ?? ((attacker.y + defender.y) / 2);
            triggerSluggerBlockImpactFrame(attacker, defender, hitX, hitY, kbX, kbY);
            spawnFloatingText(defender.x, defender.y - 30, 'M2 BLOCKED! BONE FRACTURE (3.5s)', '#dc2626');
            soundManager.playRollTick();
          }
          else if (attacker.styleId === 'kickboxing') baseHeavyCD = 360;
          else if (attacker.styleId === 'street_taekwondo') baseHeavyCD = 420; // 7.0s (420 frames) Hit Cooldown
          else if (attacker.styleId === 'keysi') {
            baseHeavyCD = 720;
            attacker.keysiHasSuperArmor = false;
          }
          attacker.heavyCooldown = baseHeavyCD;
        }
      } else {
        // Light punch against blocking shield
        defender.health = Math.max(0, defender.health - formattedChip);
        
        // Armor HP takes hit damage, reduced by 10% (Durability Type 1). Keysi Guard Cracker deals +20% AP damage
        const armorDamage = damageVal * 0.9 * (attacker.styleId === 'keysi' ? 1.20 : 1.0);
        defender.armorHP = Math.max(0, (defender.armorHP || 18) - armorDamage);
        
        defender.damageFlashTime = 5;
        const stage = comboStage ?? 0;
        defender.vx = kbX * (stage === 3 ? 4 : 0);
        defender.vy = kbY * (stage === 3 ? 4 : 0);

        soundManager.playRollTick(); // metal armor ping
        
        if (attacker.styleId === 'slugger') {
          attacker.sluggerM1WhiffDragCount = 0;
          attacker.sluggerWhiffedStages = [];
          defender.boneFractureTimer = (defender.boneFractureTimer || 0) + 36; // 0.6s stack (36 frames)
          spawnFloatingText(defender.x, defender.y - 30, `BONE FRACTURE +0.6s (${((defender.boneFractureTimer) / 60).toFixed(1)}s)!`, '#f59e0b');
        } else {
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedChip} CHIP HP`, '#cbd5e1');
        }

        if (defender.armorHP > 0) {
          defender.isBlocking = true;
        } else {
          // Shield breaks!
          defender.isBlocking = false;
          defender.armorBreakTime = 60; // 1.0s stagger
          defender.stunTime = Math.max(defender.stunTime || 0, 60);
          
          // Interrupt active windups/attacks on shield break
          defender.strikeCooldown = Math.max(defender.strikeCooldown || 0, HIT_ATTACK_LOCKOUT_FRAMES);
          if ((defender.blockLockout || 0) <= 0) defender.blockLockout = 18;
          defender.heavyWindup = 0;
          defender.fists.forEach(f => {
            f.isPunching = false;
            f.punchProgress = 0;
          });

          stateRef.current.shakeAmount = 8 * settings.screenShake;
          soundManager.playKO();
        }
      }
    } else {
      // DEFENDER IS NOT BLOCKING (OR GUARD BROKEN / FLANKED / BACK-DASHED OUTSIDE ARC) - DIRECT DAMAGE TAKEN
      if (blockCheck.isFlankHit) {
        spawnFloatingText(defender.x, defender.y - 32, 'GUARD BYPASSED!', '#f97316');
        for (let i = 0; i < 8; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 4 + 2;
          stateRef.current.particles.push({
            id: `flank_spark_${Math.random()}`,
            x: defender.x,
            y: defender.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: Math.random() * 3 + 1.5,
            color: '#f97316',
            alpha: 1.0,
            life: 0,
            maxLife: 20,
            type: 'spark'
          });
        }
      }

      // Hot Potato passing logic: Pass potato to defender on clean hit
      if (matchData?.gamemode === 'hot_potato') {
        const isAttackerPotatoHolder = 
          (attacker.isPlayer && stateRef.current.potatoHolder === 'player') ||
          (!attacker.isPlayer && stateRef.current.potatoHolder === 'dummy');
        
        if (isAttackerPotatoHolder) {
          const nextHolder = defender.isPlayer ? 'player' : 'dummy';
          stateRef.current.potatoHolder = nextHolder;
          stateRef.current.potatoFuseTimer = 20 * 60; // Reset fuse timer to 20 seconds
          setPotatoFuseLeft(20);
          setPotatoHolderState(nextHolder);
          spawnFloatingText(defender.x, defender.y - 35, '🥔 POTATO PASSED! (20s)', '#f59e0b');
          soundManager.playDash();
          for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 2;
            stateRef.current.particles.push({
              id: `potato_pass_${Math.random()}`,
              x: defender.x,
              y: defender.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              radius: Math.random() * 3 + 1.5,
              color: '#f59e0b',
              alpha: 1.0,
              life: 0,
              maxLife: 22,
              type: 'spark'
            });
          }
        }
      }

      // Escape Clause: Getting hit with physical Knockback immediately cancels out the M2 2.0s lockout duration
      if (defender.sluggerM2WhiffLockoutTimer && defender.sluggerM2WhiffLockoutTimer > 0) {
        defender.sluggerM2WhiffLockoutTimer = 0;
        spawnFloatingText(defender.x, defender.y - 35, 'KNOCKBACK RECOVERY!', '#38bdf8');
      }

      // Track direct strike landed on defender before dashing (for combo-interrupted dash counter)
      if (!defender.isDashing && (!defender.dashProgress || defender.dashProgress <= 0)) {
        defender.lastHitBeforeDashTimer = 120; // ~2.0s window for M1 combo follow-up
      }

      // Check Super Armor: Kyokushin during heavy windup, CQC after 0.24s windup, during dash, and through 5-hit assault
      const isKyokushinSuperArmor = defender.styleId === 'kyokushin' && (defender.heavyWindup || 0) > 0;
      const isCqcWindupSuperArmor = defender.styleId === 'cqc' && defender.cqcM2Stage === 'windup' && (defender.heavyWindup || 0) > 0 && (defender.heavyWindup || 0) <= 75.6;
      const isCqcActiveSuperArmor = defender.styleId === 'cqc' && (defender.cqcM2Stage === 'dash' || defender.cqcM2Stage === 'assault');
      const isShellSuperArmor = defender.styleId === 'boxing_shell' && ((defender.heavyWindup || 0) > 0 || defender.fists.some(f => f.isPunching && f.isHeavy));
      const isKeysiSuperArmor = defender.styleId === 'keysi' && !!defender.keysiHasSuperArmor;

      // Section 2.8: White Frames & Combo-Interrupted Dash Rule
      const isDashActive = !!(defender.isDashing || (defender.dashProgress && defender.dashProgress > 0));
      const isComboInterruptedDash = isDashActive && !isHeavy && !!(defender.dashInitiatedAfterHit && defender.lastHitBeforeDashTimer && defender.lastHitBeforeDashTimer > 0);
      const isDashWhiteFrames = isDashActive && !isComboInterruptedDash;

      if (isComboInterruptedDash) {
        // Section 2.8: The "Combo-Interrupted Dash" Rule (M1 Chaining Counter)
        // Strike A hit before dash -> panic dash initiated -> Strike B connected -> DASH INTERRUPTED & SHATTERED!
        defender.isDashing = false;
        defender.dashProgress = 0;
        defender.dashHitDelayedStopTimer = 0;
        defender.vx = 0;
        defender.vy = 0;
        defender.dashWhiteFrameFlashTime = 0;
        defender.dashInitiatedAfterHit = false;
        defender.lastHitBeforeDashTimer = 0;
        soundManager.playKO();
        spawnFloatingText(defender.x, defender.y - 35, 'DASH INTERRUPTED! (COMBO COUNTER)', '#ef4444');
      } else if (isDashWhiteFrames) {
        defender.dashHitDelayedStopTimer = 6; // 0.10s (6 frames @ 60fps) carry-through before momentum stops dead
        defender.dashWhiteFrameFlashTime = 8;
        spawnFloatingText(defender.x, defender.y - 35, 'WHITE FRAME (0.1s STOP)', '#ffffff');
      }

      const hasSuperArmor = isKyokushinSuperArmor || isCqcWindupSuperArmor || isCqcActiveSuperArmor || isShellSuperArmor || isKeysiSuperArmor || isDashWhiteFrames;

      if (!hasSuperArmor) {
        // Lockouts: 0.45s hitstun, 0.45s attack disable (cannot attack when hit), 0.3s block lockout (does NOT reset if active)
        defender.stunTime = Math.max(defender.stunTime || 0, HITSTUN_FRAMES);
        defender.strikeCooldown = Math.max(defender.strikeCooldown || 0, HIT_ATTACK_LOCKOUT_FRAMES);

        // Street Taekwondo S2 Passive: The Lead Stagger Trap
        // Landing M1 S2 (Chambered Slanted Kick) increases victim's post-hit attack recovery delay by +40%
        if (attacker.styleId === 'street_taekwondo' && !isHeavy) {
          if (comboStage === 1) {
            defender.stunTime = Math.round(defender.stunTime * 1.40);
            defender.strikeCooldown = Math.round(defender.strikeCooldown * 1.40);
            defender.tkdLeadStaggerTimer = 30; // 0.5s natural decay if S3 not thrown/whiffs
            attacker.tkdLeadStaggerActive = true;
            spawnFloatingText(defender.x, defender.y - 35, 'LEAD STAGGER TRAP (+40% DELAY)', '#06B6D4');
          } else if (comboStage === 2) {
            // Purge condition: The moment M1 S3 connects with enemy, this +40% delay penalty is instantly consumed and wiped
            if (defender.tkdLeadStaggerTimer && defender.tkdLeadStaggerTimer > 0) {
              defender.tkdLeadStaggerTimer = 0;
              attacker.tkdLeadStaggerActive = false;
              spawnFloatingText(attacker.x, attacker.y - 50, 'LEAD STAGGER CONSUMED!', '#FFD600');
            }
          }
        }
        if (attacker.styleId !== 'cqc' || isHeavy) {
          if ((defender.blockLockout || 0) <= 0) {
            defender.blockLockout = 18;
          }
          defender.isBlocking = false;
        }
        defender.heavyWindup = 0;
        defender.fists.forEach(f => {
          f.isPunching = false;
          f.punchProgress = 0;
        });
        if (defender.styleId === 'cqc' && defender.cqcM2Stage === 'windup') {
          defender.cqcM2Stage = null;
          defender.cqcRings = undefined;
          defender.cqcLockedTarget = null;
          spawnFloatingText(defender.x, defender.y - 35, 'CQC CANCELLED!', '#ef4444');
        }
      } else {
        if (isKyokushinSuperArmor) {
          defender.kyokushinM2AbsorbedHits = (defender.kyokushinM2AbsorbedHits || 0) + 1;
          // Kinetic Counter-Charge: Instantly stuns attacker for 0.2s (12 frames)
          attacker.stunTime = Math.max(attacker.stunTime || 0, 12);
          attacker.strikeCooldown = Math.max(attacker.strikeCooldown || 0, 12);
          spawnFloatingText(attacker.x, attacker.y - 30, 'MICRO-STUNNED! (0.2s)', '#dc2626');
          spawnFloatingText(defender.x, defender.y - 35, `KINETIC ABSORPTION (+5% DMG x${defender.kyokushinM2AbsorbedHits})`, '#5A6268');
        } else {
          spawnFloatingText(defender.x, defender.y - 35, 'SUPER ARMOR', '#f59e0b');
        }
        if (defender.styleId === 'aikido') {
          defender.superArmorFlashTime = 24;
          defender.superArmorFlashMaxTime = 24;
        }
      }

      if (isHeavy) {
        // HEAVY ATTACK DIRECT HIT
        if (attacker.styleId !== 'boxing_shell') {
          defender.health = Math.max(0, defender.health - formattedDamage);
        }
        defender.damageFlashTime = 15;
        
        if (attacker.styleId === 'muay_thai') {
          // MUAY THAI CLINCH KNEE: CLEAN HIT STUN
          defender.stunTime = 96; // 1.6s
          defender.blockLockout = 96 + 48; // Guard lockout after stun
          
          if (defender.isPlayer) {
            stateRef.current.visionBlurTime = 96;
          }

          // Octagon-style clinch push (low knockback as they are in the clinch)
          defender.vx = kbX * 5;
          defender.vy = kbY * 5;
          attacker.heavyCooldown = 300;
        } else if (attacker.styleId === 'slugger') {
          // SLUGGER HEAVY: SONIC BOOM HOOK & M2 CATACLYSM
          const hitX = strikePos?.x ?? ((attacker.x + defender.x) / 2);
          const hitY = strikePos?.y ?? ((attacker.y + defender.y) / 2);
          triggerSluggerImpactFrame(attacker, defender, hitX, hitY, kbX, kbY);

          attacker.heavyCooldown = 720; // 12.0s Hit Cooldown
          spawnFloatingText(defender.x, defender.y - 30, 'M2 CATACLYSM!', '#d97706');
          soundManager.playKO();
          stateRef.current.shakeAmount = 22 * settings.screenShake;
        } else if (attacker.styleId === 'capoeira') {
          // CAPOEIRA HEAVY: MEIA LUA DE COMPASSO HELICOPTER SWEEP (HIGH KNOCKBACK & CONCUSSION DAZE)
          const dazeDuration = 108; // 1.8s (108 frames) daze duration
          defender.vx = kbX * 15; // Balanced knockback on hit
          defender.vy = kbY * 15;
          stateRef.current.shakeAmount = 18 * settings.screenShake;
          if (defender.isPlayer) {
            stateRef.current.visionBlurTime = dazeDuration;
          }
          defender.concussTime = dazeDuration;
          defender.spinOutTimer = 0;
          defender.kyokushinSpinOutTimer = 0;
          defender.stunTime = Math.max(defender.stunTime || 0, dazeDuration);
          spawnFloatingText(defender.x, defender.y - 35, 'CONCUSSION DAZE (1.8s)!', '#f97316');
          soundManager.playRollTick();
          attacker.heavyCooldown = 318;
        } else if (attacker.styleId === 'kyokushin') {
          // KYOKUSHIN HEAVY: GYAKU-ZUKI / GLIDING RIGHT PALM (12.0s Cripple slow, 2.5s Purple Electrical Spiral)
          const hitX = strikePos?.x ?? ((attacker.x + defender.x) / 2);
          const hitY = strikePos?.y ?? ((attacker.y + defender.y) / 2);

          // Purple Electrical Spiral debuff (2.5s = 150 frames)
          defender.kyokushinSpiralTimer = 150;
          defender.crippleTime = 720; // 12.0s Cripple slow

          attacker.heavyCooldown = 480; // 8.0s on hit
          spawnFloatingText(defender.x, defender.y - 30, 'GYAKU-ZUKI! CRIPPLE (12s)', '#a855f7');
          soundManager.playKO();
          spawnKyokushinPunchGust(attacker, defender);

          // On-Hit Feedback:
          // 1. Hit-Stop: 3-frame absolute time-freeze on both characters to deliver maximum impact weight
          stateRef.current.hitstopTime = 3;
          // 2. Screen Recoil: Hard, directional screen shake (7px along the line of punch)
          stateRef.current.shakeAmount = 7 * settings.screenShake;
          // 3. Particle FX: Dense white kinetic pressure rings blast outward from contact point
          for (let r = 0; r < 3; r++) {
            stateRef.current.particles.push({
              id: `kyokushin_ring_${Math.random()}`,
              x: hitX,
              y: hitY,
              vx: 0,
              vy: 0,
              radius: 14 + r * 16,
              color: '#ffffff',
              alpha: 1.0,
              life: 0,
              maxLife: 16,
              type: 'shockwave'
            } as any);
          }
        } else if (attacker.styleId === 'kickboxing') {
          const activeFist = attacker.fists.find(f => f.isPunching);
          const isSeq2 = (activeFist as any)?.kickboxingSeq2 || attacker.kickboxingIsSeq2;
          if (isSeq2) {
            // 🎯 S2 Teep Direct Hit: 4 Frames Impact Freeze, Concussion Slow, Large Knockback
            defender.vx = kbX * 18;
            defender.vy = kbY * 18;
            defender.stunTime = Math.max(defender.stunTime || 0, HITSTUN_FRAMES);
            stateRef.current.hitstopTime = 4;
            attacker.kickboxingS2Hit = true;
            finalizeKickboxingM2Cooldown(attacker);
          } else {
            // S1 Short Hook Direct Hit: Micro-daze, 0.9s Armor Regen Lockout, queues S2 in 0.15s
            defender.vx = kbX * 6; // No 20% passive bonus on S1
            defender.vy = kbY * 6;
            defender.armorRegenLockout = 54; // 0.9s suppression
            defender.stunTime = Math.max(defender.stunTime || 0, HITSTUN_FRAMES); // 0.45s hitstun
            stateRef.current.hitstopTime = 2;
            attacker.kickboxingAutoSeq2Timer = 9; // 0.15s auto-trigger S2 Rapid Chamber
            attacker.kickboxingSeq2Ready = true;
            attacker.kickboxingSeq2Window = 45;
          }
        } else if (attacker.styleId === 'keysi') {
          // KEYSI HEAVY: PENSADOR DRIVE (1.1s Complete Attack Lockout & Guard Shatter)
          defender.vx = kbX * 12;
          defender.vy = kbY * 12;
          defender.stunTime = Math.max(defender.stunTime || 0, 66); // 1.1s daze stun
          defender.strikeCooldown = Math.max(defender.strikeCooldown || 0, 66);
          defender.heavyCooldown = Math.max(defender.heavyCooldown || 0, 66);
          defender.keysiAttackLockout = 66; // 1.1s attack lockout
          stateRef.current.hitstopTime = 4;
          attacker.heavyCooldown = 720; // 12.0s CD on hit
          spawnFloatingText(defender.x, defender.y - 35, 'ATTACK LOCKOUT (1.1s)', '#ef4444');
          spawnFloatingText(attacker.x, attacker.y - 35, 'PENSADOR DRIVE', '#3b82f6');
        } else if (attacker.styleId === 'boxing_shell') {
          // SHOULDER PUSH (Opponent was too close and Iron Boxing user wasn't hit during the attack):
          // Can be Parried (checked in directional block/parry above).
          // If direct hit: deals knockback a short distance with NO spin out and NO 2x posture boost.
          defender.damageFlashTime = 8;
          defender.vx = kbX * 6.0;
          defender.vy = kbY * 6.0;
          defender.stunTime = Math.max(defender.stunTime || 0, 18);
          defender.strikeCooldown = Math.max(defender.strikeCooldown || 0, 18);
          defender.shellSpinTimer = 0;
          defender.shellLockoutTimer = 0;
          attacker.heavyCooldown = 360; // 6.0s Hit Cooldown
          soundManager.playPunch(false);
          stateRef.current.shakeAmount = 4 * settings.screenShake;
          spawnFloatingText(defender.x, defender.y - 35, 'SHOULDER PUSH', '#94a3b8');
          
          // Subtle silver spark particles
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const speed = Math.random() * 2.5 + 1.0;
            stateRef.current.particles.push({
              id: `shell_push_impact_${Math.random()}`,
              x: defender.x,
              y: defender.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              radius: Math.random() * 2.0 + 1.0,
              color: '#cbd5e1',
              alpha: 1.0,
              life: 0,
              maxLife: 16,
              type: 'spark'
            });
          }
        } else if (attacker.styleId === 'street_taekwondo') {
          // STREET TAEKWONDO HEAVY: BRAZILIAN KICK (QUESTION MARK KICK)
          defender.vx = kbX * 12;
          defender.vy = kbY * 12;
          attacker.heavyCooldown = 420; // 7.0s (420 frames) Hit Cooldown
          stateRef.current.hitstopTime = 4;
          stateRef.current.shakeAmount = 14 * settings.screenShake;
          soundManager.playHeavyImpact();

          // Phase 1: The Spin-Out (1.0s = 60 frames)
          defender.spinOutTimer = 60;
          // Phase 2: The Confusion State (3.0s = 180 frames)
          defender.tkdConfusionTimer = 180;
          if (defender.isPlayer) {
            stateRef.current.visionBlurTime = 60;
          }

          if (attacker.tkdFeintTrapped) {
            spawnFloatingText(defender.x, defender.y - 35, 'NEURO-TRAUMA: SPIN-OUT (1.0s) & CONFUSION (3.0s)', '#FF6B00');
            spawnFloatingText(attacker.x, attacker.y - 50, 'FEINT TRAPPED! (+33% DMG)', '#FFD600');
          } else {
            spawnFloatingText(defender.x, defender.y - 35, 'BRAZILIAN KICK! SPIN-OUT & CONFUSION', '#FF6B00');
          }
          attacker.tkdFeintTrapped = false;

          // Chamber Palette VFX: Orange (#FF6B00) and Electric-Yellow (#FFD600) burst
          for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const speed = Math.random() * 4.5 + 2;
            stateRef.current.particles.push({
              id: `tkd_m2_hit_${Math.random()}`,
              x: (attacker.x + defender.x) / 2,
              y: (attacker.y + defender.y) / 2,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              radius: Math.random() * 2.5 + 1.5,
              color: i % 2 === 0 ? '#FF6B00' : '#FFD600',
              alpha: 1.0,
              life: 0,
              maxLife: 22,
              type: 'spark'
            });
          }
        } else if (attacker.styleId === 'basic') {
          // Flow Boxing M2: Shadow Step Strike (0.3s stun = 18 frames)
          defender.vx = kbX * 10;
          defender.vy = kbY * 10;
          defender.stunTime = Math.max(defender.stunTime || 0, 18); // 0.3s stun
          defender.strikeCooldown = Math.max(defender.strikeCooldown || 0, 18);
          defender.blockLockout = Math.max(defender.blockLockout || 0, 18);
          stateRef.current.hitstopTime = 4;
          attacker.heavyCooldown = 540; // 9.0s CD on hit
          spawnFloatingText(defender.x, defender.y - 35, 'STUNNED (0.3s)!', '#38bdf8');
        } else if (attacker.styleId === 'street_boxing') {
          // Street Boxing M2 Pocket Flurry (Section 1.18 Auto-Burst State Machine):
          const stage = attacker.streetBoxingM2Stage || 1;
          if (stage === 1) {
            lockStreetBoxingAutoBurstQueue(attacker, defender);
            // Hit-Confirm Guarantee: Landing the 1st right jab locks opponent into hit-stun
            defender.stunTime = Math.max(defender.stunTime || 0, 24);
            defender.strikeCooldown = Math.max(defender.strikeCooldown || 0, 24);
            defender.blockLockout = Math.max(defender.blockLockout || 0, 24);
            defender.isBlocking = false;
            defender.vx = kbX * 0.8;
            defender.vy = kbY * 0.8;
            stateRef.current.hitstopTime = 2;
            attacker.heavyCooldown = 780; // 13.0s Total Hit Cooldown
            spawnFloatingText(attacker.x, attacker.y - 30, 'POCKET FLURRY (1/3)!', '#f59e0b');
          } else if (stage === 2) {
            attacker.streetBoxingM2Hits = 2;
            attacker.streetBoxingUnbreakable = true;
            defender.stunTime = Math.max(defender.stunTime || 0, 24);
            defender.strikeCooldown = Math.max(defender.strikeCooldown || 0, 24);
            defender.blockLockout = Math.max(defender.blockLockout || 0, 24);
            defender.isBlocking = false;
            defender.vx = kbX * 0.8;
            defender.vy = kbY * 0.8;
            stateRef.current.hitstopTime = 2;
            attacker.heavyCooldown = 780;
            spawnFloatingText(attacker.x, attacker.y - 30, 'POCKET FLURRY (2/3)!', '#f59e0b');
          } else {
            // Stage 3 Left Hook Finisher:
            attacker.streetBoxingM2Hits = 3;
            attacker.streetBoxingUnbreakable = false;
            defender.vx = kbX * 15.0;
            defender.vy = kbY * 15.0;
            defender.stunTime = Math.max(defender.stunTime || 0, 28);
            defender.strikeCooldown = Math.max(defender.strikeCooldown || 0, 28);
            defender.damageFlashTime = 15;
            defender.concussTime = 60;
            stateRef.current.hitstopTime = 4;
            attacker.heavyCooldown = 780; // 13.0s Total Hit Cooldown

            // Posture Reset: Landing all 3 hits shaves Posture recovery down to 0.1s
            attacker.postureOverdriveActive = true;
            attacker.pendingPostureReduction = 0.95;
            applyFighterPostureCooldown(attacker);
            attacker.postureCd = 6; // 0.1s (6 frames @ 60fps)
            attacker.maxPostureCd = 6;
            attacker.lightCooldown = 6;
            attacker.strikeCooldown = 6;
            attacker.isPostureLocked = true;
            spawnFloatingText(attacker.x, attacker.y - 35, 'POSTURE RESET (0.1s)!', '#22c55e');
          }
        } else {
          // Zero knockback for Street Taekwondo M2; standard pushback for other styles
          if (attacker.styleId === 'street_taekwondo') {
            defender.vx = 0;
            defender.vy = 0;
          } else {
            defender.vx = kbX * 14;
            defender.vy = kbY * 14;
          }
          stateRef.current.hitstopTime = 4; // Visceral heavy hitstop freeze
          
          let baseHeavyCD = 240;
          if (attacker.styleId === 'ashihara') baseHeavyCD = 270;
          else if (attacker.styleId === 'shotokan') baseHeavyCD = 300;
          else if (attacker.styleId === 'street_taekwondo') baseHeavyCD = 420; // 7.0s (420 frames) Hit Cooldown
          attacker.heavyCooldown = baseHeavyCD;
        }

        soundManager.playPunch(true);
        stateRef.current.shakeAmount = 18 * settings.screenShake;

        if (defender.isPlayer) {
          stateRef.current.visionBlurTime = 108; // 1.8s concussion
        }
        
        // Universal Rule: M2 Heavy Attack slows movement by 60%
        defender.concussTime = 108;
        
        if (attacker.styleId !== 'boxing_shell') {
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#ef4444');
        }
      } else {
        // LIGHT ATTACK DIRECT HIT
        defender.health = Math.max(0, defender.health - formattedDamage);
        defender.damageFlashTime = 8;

        const stage = comboStage ?? 0;
        const isSlugger = attacker.styleId === 'slugger';
        
        // Universal Rule: Taking S4 Damage (stage 3 combo finisher) slows movement of user hit by 60%
        if (stage === 3) {
          defender.concussTime = 108;
        }

        if (attacker.styleId === 'slugger') {
          // Air-Displacement Impact Cone particle FX + high-speed white exit lines straight through the victim
          stateRef.current.particles.push({
            id: `slugger_air_cone_${Math.random()}`,
            x: defender.x,
            y: defender.y,
            vx: Math.cos(attacker.facingAngle) * 7,
            vy: Math.sin(attacker.facingAngle) * 7,
            radius: 36,
            color: '#e2e8f0',
            alpha: 0.95,
            life: 0,
            maxLife: 18,
            type: 'aiki_ejection_cone',
            facingAngle: attacker.facingAngle
          } as any);

          // White high-velocity impact lines blasting out through the victim's back
          for (let i = 0; i < 10; i++) {
            const spreadAngle = attacker.facingAngle + (Math.random() * 0.4 - 0.2);
            const lineSpeed = Math.random() * 11 + 7;
            stateRef.current.particles.push({
              id: `slugger_air_line_${Math.random()}`,
              x: defender.x + Math.cos(attacker.facingAngle) * 8,
              y: defender.y + Math.sin(attacker.facingAngle) * 8,
              vx: Math.cos(spreadAngle) * lineSpeed,
              vy: Math.sin(spreadAngle) * lineSpeed,
              radius: Math.random() * 3 + 2,
              color: i % 2 === 0 ? '#ffffff' : '#e2e8f0',
              alpha: 1.0,
              life: 0,
              maxLife: 16,
              type: 'spark'
            });
          }

          attacker.sluggerM1WhiffDragCount = 0;
          attacker.sluggerWhiffedStages = [];

          if (stage === 3) {
            defender.vx = kbX * 18.0;
            defender.vy = kbY * 18.0;
            stateRef.current.hitstopTime = 4;
          } else {
            defender.vx = kbX * 8.0;
            defender.vy = kbY * 8.0;
            stateRef.current.hitstopTime = 2;
          }

          attacker.sluggerM1ChainCount = (attacker.sluggerM1ChainCount || 0) + 1;
          if (attacker.sluggerM1ChainCount >= 6) {
            defender.superCrippleTimer = 180; // 3.0s Super Cripple from Kinetic Overdrive (6 landed M1s)
            attacker.sluggerM1ChainCount = 0;
            spawnFloatingText(defender.x, defender.y - 30, 'KINETIC OVERDRIVE! (SUPER CRIPPLE 3.0s)', '#d97706');
            soundManager.playKO();
          } else {
            spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP (${attacker.sluggerM1ChainCount}/6)`, '#f3f4f6');
          }
        } else if (attacker.styleId === 'kyokushin') {
          if (stage === 0) {
            // Sequence 1 (Stage 0): Chudan Seiken Tsuki (Lead Punch)
            defender.vx = kbX * 3.5;
            defender.vy = kbY * 3.5;
            stateRef.current.hitstopTime = 2;
          } else if (stage === 1) {
            // Sequence 2 (Stage 1): Gedan Geri (Calf Kick) - Low shin chop attacking base
            defender.vx = kbX * 4.0;
            defender.vy = kbY * 4.0;
            stateRef.current.hitstopTime = 3;
          } else if (stage === 2) {
            // Sequence 3 (Stage 2): Shotei Uchi (Open Palm) - Heavy palm thrust displacing guard line
            defender.vx = kbX * 5.0;
            defender.vy = kbY * 5.0;
            stateRef.current.hitstopTime = 3;
          } else if (stage === 3) {
            // Sequence 4 (Stage 3): Full-Charge Right Palm (Finisher) - Massive kinetic pushback
            defender.vx = kbX * 16.0;
            defender.vy = kbY * 16.0;
            stateRef.current.hitstopTime = 4;
          }
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#fca5a5');
        } else if (attacker.styleId === 'capoeira') {
          if (stage === 0) {
            stateRef.current.hitstopTime = 2;
          } else if (stage === 1) {
          } else if (stage === 2) {
          } else if (stage === 3) {
            defender.vx = kbX * 16;
            defender.vy = kbY * 16;
            stateRef.current.hitstopTime = 4;
          } else {
            defender.vx = kbX * 3;
            defender.vy = kbY * 3;
          }
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#fca5a5');

          for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3.5 + 1.5;
            stateRef.current.particles.push({
              id: `capoeira_gold_dust_${Math.random()}`,
              x: defender.x,
              y: defender.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              radius: Math.random() * 3 + 1.5,
              color: Math.random() < 0.6 ? '#ca8a04' : '#facc15',
              alpha: 1.0,
              life: 0,
              maxLife: 22,
              type: 'spark'
            });
          }
        } else if (attacker.styleId === 'kickboxing') {
          if (stage === 3) {
            defender.vx = kbX * 11;
            defender.vy = kbY * 11;
            attacker.hasChainReaction = true;
          } else {
            defender.vx = kbX * 3;
            defender.vy = kbY * 3;
          }
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#fca5a5');
        } else if (attacker.styleId === 'ashihara') {
          if (stage === 2) {
            // Chudan Kansetsu Geri: 0.45s (27 frames) stun
            defender.stunTime = Math.max(defender.stunTime || 0, HITSTUN_FRAMES);
            defender.strikeCooldown = Math.max(defender.strikeCooldown || 0, HIT_ATTACK_LOCKOUT_FRAMES);
            // Freeze target's velocity to lock in place
            defender.vx = 0;
            defender.vy = 0;
          } else if (stage === 3) {
            // Ashibarai Sweep: 0.45s (27 frames) stun + slight sweeps knockback
            defender.stunTime = Math.max(defender.stunTime || 0, HITSTUN_FRAMES);
            defender.strikeCooldown = Math.max(defender.strikeCooldown || 0, HIT_ATTACK_LOCKOUT_FRAMES);
            defender.vx = kbX * 3.5;
            defender.vy = kbY * 3.5;
            stateRef.current.hitstopTime = 2;
          } else {
            // S1/S2: low knockback to keep them in range
            defender.vx = kbX * 1.5;
            defender.vy = kbY * 1.5;
          }
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#fca5a5');
        } else if (attacker.styleId === 'cqc') {
          if (stage === 0 || stage === 1 || stage === 2) {
            defender.vx = kbX * 1.5;
            defender.vy = kbY * 1.5;
            attacker.cqcSpeedBonus = Math.min((attacker.cqcSpeedBonus || 0) + 9, 27);
            spawnFloatingText(attacker.x, attacker.y - 30, 'ACCELERATION (+0.15s)', '#cbd5e1');
          } else if (stage === 3) {
            defender.vx = kbX * 12;
            defender.vy = kbY * 12;
            stateRef.current.hitstopTime = 3;
            attacker.postureCd = Math.round((attacker.postureCd || 0) * 0.75);
            attacker.cqcSpeedBonus = 0;
            spawnFloatingText(attacker.x, attacker.y - 30, 'POSTURE CD -25%', '#22c55e');
          }
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#fca5a5');

          for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3.5 + 1;
            stateRef.current.particles.push({
              id: `cqc_spark_${Math.random()}`,
              x: defender.x,
              y: defender.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              radius: Math.random() * 2.5 + 1.5,
              color: i % 2 === 0 ? '#ef4444' : '#cbd5e1',
              alpha: 1.0,
              life: 0,
              maxLife: 16,
              type: 'spark'
            });
          }
        } else if (attacker.styleId === 'muay_thai') {
          if (stage === 0) {
            defender.vx = kbX * 1.5;
            defender.vy = kbY * 1.5;
          } else if (stage === 1) {
            defender.vx = kbX * 2.0;
            defender.vy = kbY * 2.0;
          } else if (stage === 2) {
            // S3 Sok Tat Slicing Elbow: Sharp cutting impact, 3 frames hitstop
            defender.vx = kbX * 3.5;
            defender.vy = kbY * 3.5;
            stateRef.current.hitstopTime = 3;
          } else if (stage === 3) {
            // S4 Roundhouse Shin Kick: Heavy knockback launcher + slow
            defender.vx = kbX * 12;
            defender.vy = kbY * 12;
            stateRef.current.hitstopTime = 4;
          }
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#fca5a5');
        } else if (isSlugger && stage === 3) {
          // Slugger Stage 3 (S4): Crushing Knockback
          defender.vx = kbX * 14.5;
          defender.vy = kbY * 14.5;
          stateRef.current.hitstopTime = 3;
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#fca5a5');
        } else if (attacker.styleId === 'shotokan' && stage === 3) {
          // Shotokan Stage 3 Mae-Geri Front Snap Kick: Heavy Knockback Launcher (+10% Kinetic Impact)
          defender.vx = kbX * 11.5;
          defender.vy = kbY * 11.5;
          stateRef.current.hitstopTime = 3;
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#fca5a5');
        } else if (attacker.styleId === 'keysi') {
          if (stage === 3) {
            // S4 Heavy Pocket Knee: Primes M2 Clinch windup to 0.1s + Super Armor. Low knockback to keep opponent in pocket.
            attacker.keysiM2Primed = true;
            defender.vx = kbX * 2.0;
            defender.vy = kbY * 2.0;
            stateRef.current.hitstopTime = 3;
            spawnFloatingText(attacker.x, attacker.y - 30, 'CLINCH PRIMED!', '#ef4444');
          } else if (stage === 2) {
            // S3 Descending Elbow (+20% Boost)
            defender.vx = kbX * 1.5;
            defender.vy = kbY * 1.5;
            stateRef.current.hitstopTime = 2;
          } else {
            // S1 & S2 Forearm Wedges
            defender.vx = kbX * 1.0;
            defender.vy = kbY * 1.0;
            stateRef.current.hitstopTime = 2;
          }
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#fca5a5');
        } else if (attacker.styleId === 'boxing_shell') {
          if (stage === 3) {
            // S4 Looping Overhead Hook finisher
            defender.vx = kbX * 9.5;
            defender.vy = kbY * 9.5;
            stateRef.current.hitstopTime = 3;
          } else if (stage === 2) {
            // S3 Looping Hook
            defender.vx = kbX * 2.5;
            defender.vy = kbY * 2.5;
            stateRef.current.hitstopTime = 2;
          } else {
            // S1 & S2 Snappy Jabs (keep opponent in the pocket)
            defender.vx = kbX * 1.0;
            defender.vy = kbY * 1.0;
            stateRef.current.hitstopTime = 2;
          }
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#fca5a5');
        } else if (attacker.styleId === 'basic') {
          if (stage === 3) {
            // S4 Looping Overhead Hook finisher
            if (attacker.flowS3ParryBaited) {
              // Boosted: 2x DMG (15.0), unparryable, inflicts 5s Cripple (300 frames)
              defender.crippleTime = Math.max(defender.crippleTime || 0, 300);
              defender.vx = kbX * 12.0;
              defender.vy = kbY * 12.0;
              stateRef.current.hitstopTime = 4;
              stateRef.current.shakeAmount = 14 * settings.screenShake;
              attacker.flowS3ParryBaited = false; // Boost removed after hitting
              spawnFloatingText(defender.x, defender.y - 30, 'FEINT TRAP PUNISH! (5s CRIPPLE)', '#ef4444');
            } else {
              defender.vx = kbX * 8.5;
              defender.vy = kbY * 8.5;
              stateRef.current.hitstopTime = 3;
              attacker.flowS3ParryBaited = false;
            }
          } else if (stage === 1) {
            // S2 Right Hook
            defender.vx = kbX * 2.0;
            defender.vy = kbY * 2.0;
            stateRef.current.hitstopTime = 2;
          } else {
            // S1 Snapping Jab
            defender.vx = kbX * 1.2;
            defender.vy = kbY * 1.2;
            stateRef.current.hitstopTime = 2;
          }
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#fca5a5');
        } else if (attacker.styleId === 'street_boxing') {
          // In-Pocket Cling: All M1 attacks deal x0.40 knockback
          if (stage === 3) {
            defender.vx = kbX * 3.5;
            defender.vy = kbY * 3.5;
            stateRef.current.hitstopTime = 3;
          } else if (stage === 2) {
            defender.vx = kbX * 1.0;
            defender.vy = kbY * 1.0;
            stateRef.current.hitstopTime = 2;
          } else {
            defender.vx = kbX * 0.5;
            defender.vy = kbY * 0.5;
            stateRef.current.hitstopTime = 1;
          }
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#86efac');
        } else if (attacker.styleId === 'aikido') {
          if (stage === 0) {
            // S1 Irimi Palm: Clean straight open-palm entry
            defender.vx = kbX * 2.0;
            defender.vy = kbY * 2.0;
            stateRef.current.hitstopTime = 2;
            spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#38bdf8');
          } else if (stage === 1) {
            // S2 Kote-Gaeshi Slap: Circular open-palm slap
            defender.vx = kbX * 2.0;
            defender.vy = kbY * 2.0;
            stateRef.current.hitstopTime = 2;
            spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#38bdf8');
          } else if (stage === 2) {
            // S3 Left Straight Thrust: Linear forward thrust, ZERO spin-out effect
            defender.spinOutTimer = 0;
            defender.kyokushinSpinOutTimer = 0;
            defender.vx = kbX * 3.0;
            defender.vy = kbY * 3.0;
            stateRef.current.hitstopTime = 2;
            spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#38bdf8');
          } else if (stage === 3) {
            // S4 Irimi Glide-Palm: Heavy straight open-palm drive with high pushback
            defender.vx = kbX * 12.5;
            defender.vy = kbY * 12.5;
            stateRef.current.hitstopTime = 3;
            stateRef.current.shakeAmount = 6 * settings.screenShake;
            soundManager.playPunch(true);
            spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#38bdf8');
            spawnFloatingText(defender.x, defender.y - 30, 'GLIDE-PALM DRIVE!', '#0284c7');

            stateRef.current.particles.push({
              id: `aiki_glide_shockwave_${Math.random()}`,
              x: defender.x,
              y: defender.y,
              vx: 0,
              vy: 0,
              radius: 24,
              color: '#38bdf8',
              alpha: 1.0,
              life: 0,
              maxLife: 20,
              type: 'shockwave'
            });
          }
        } else if (!isSlugger && stage === 3) {
          // Knockback moment!
          if (!isAikidoSuperArmor) {
            defender.vx = kbX * 9;
            defender.vy = kbY * 9;
          }
          stateRef.current.hitstopTime = 2;
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#fca5a5');
        } else {
          if (!isAikidoSuperArmor) {
            defender.vx = 0;
            defender.vy = 0;
          }
          spawnFloatingText(defender.x, defender.y - 5, `-${formattedDamage} HP`, '#fca5a5');
        }

        soundManager.playPunch(false);
      }
    }

    if (isAikidoSuperArmor) {
      defender.stunTime = 0;
      defender.m2StunTimer = 0;
      defender.hitMovementLock = 0;
      defender.hitSteeringLock = 0;
      defender.spinOutTimer = 0;
      defender.kyokushinSpinOutTimer = 0;
      defender.aikiSpinDownTimer = 0;
    } else if (isHeavy && (defender.stunTime || 0) > 0) {
      defender.m2StunTimer = defender.stunTime;
    } else if (!isHeavy) {
      defender.m2StunTimer = 0;
    }

    const dealt = isEffectivelyBlocked ? formattedChip : formattedDamage;
    if (defender.isPlayer && isEffectivelyBlocked && !isParry) {
      stateRef.current.totalBlocks = (stateRef.current.totalBlocks || 0) + 1;
      setTotalBlocks(stateRef.current.totalBlocks);
    }

    if (attacker.isPlayer) {
      stateRef.current.sustainPlayerDamage = (stateRef.current.sustainPlayerDamage || 0) + dealt;
      setSustainPlayerDamage(stateRef.current.sustainPlayerDamage);
    } else {
      stateRef.current.sustainOpponentDamage = (stateRef.current.sustainOpponentDamage || 0) + dealt;
      setSustainOpponentDamage(stateRef.current.sustainOpponentDamage);
    }

    if (attacker.isPlayer && !defender.isPlayer) {
      stateRef.current.totalDamageDealt = (stateRef.current.totalDamageDealt || 0) + dealt;
      stateRef.current.totalHitsLanded = (stateRef.current.totalHitsLanded || 0) + 1;
      setTotalDamageDealt(stateRef.current.totalDamageDealt);
      setTotalHitsLanded(stateRef.current.totalHitsLanded);

      const nextCombo = (stateRef.current.currentCombo || 0) + 1;
      stateRef.current.currentCombo = nextCombo;
      if (nextCombo > (stateRef.current.maxCombo || 0)) {
        stateRef.current.maxCombo = nextCombo;
        setMaxCombo(nextCombo);
      }
    } else if (!attacker.isPlayer && defender.isPlayer) {
      stateRef.current.totalDamageTaken = (stateRef.current.totalDamageTaken || 0) + dealt;
      setTotalDamageTaken(stateRef.current.totalDamageTaken);
      stateRef.current.currentCombo = 0;
    }

    // Sustain Attack & Hot Potato Gamemodes: 100% Attack Negation (health never drops from strikes/combat damage)
    if (matchData?.gamemode === 'sustain_attack' || matchData?.gamemode === 'hot_potato') {
      const defMods = getHeightModifiers(defender.baseHeight);
      defender.health = defMods.maxHealth;
    }

    if (defender.isPlayer && stateRef.current.godMode) {
      const playerMods = getHeightModifiers(defender.baseHeight);
      defender.health = playerMods.maxHealth;
    }

    if (!defender.isPlayer && dummyBehavior === 'test_ai') {
      const defMods = getHeightModifiers(defender.baseHeight);
      defender.health = defMods.maxHealth;
      defender.isDead = false;
      defender.vx = 0;
      defender.vy = 0;
    }

    if (stateRef.current.oneHitKO && !defender.isPlayer && dummyBehavior !== 'test_ai') {
      defender.health = 0;
    }

    // Check KO
    if (defender.health <= 0 && (!(!defender.isPlayer && dummyBehavior === 'test_ai'))) {
      defender.health = 0;
      defender.isDead = true;
      triggerKOCinematic(attacker, defender);
    }

    // Track side effects that happened during the hit:
    if (attacker.isPlayer) {
      if (((defender.concussTime || 0) > prevConcuss) || ((defender.crippleTime || 0) > prevCripple)) {
        QuestTracker.trackEvent(userEmail, {
          type: 'debuff_applied',
          mode: getMatchModeKey()
        });
      }
      if ((defender.armorBreakTime || 0) > prevArmorBreak) {
        QuestTracker.trackEvent(userEmail, {
          type: 'guard_break',
          mode: getMatchModeKey()
        });
      }
    }

    // Sync values back to React states
    syncCombatStatesToUI();
  }

