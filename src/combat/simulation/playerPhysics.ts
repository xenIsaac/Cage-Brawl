import { getHeightModifiers } from '../../utils/heightModifiers';
import { updateFighterStaminaAndTimers } from '../staminaEngine';
import { isFighterInIFrames, applyHeavyWhiffPenalty as applyHeavyWhiffPenaltyHelper, finalizeKickboxingM2Cooldown as finalizeKickboxingM2CooldownHelper } from '../hitResolution';
import { evaluateParry } from '../parry';
import { FIGHTING_STYLES } from '../../data/styles';
import { BASE_MOVEMENT_FORCE, BASE_MOVEMENT_SPEED, BLOCK_COOLDOWN_FRAMES } from '../rules';
import { applyDamageCombatLocks, canFighterRaiseGuard, updateFighterSteering, calculateAsymmetricalRetractionDelta, getStyleM1BetweenCooldown, getStyleM1Speeds } from '../combatEngine';
import { checkDirectionalBlock } from '../blockEngine';
import { isImpactFrameActive } from '../impactFrame';
import { tickStreetBoxingAutoBurst } from '../combat.fixes';
import { getMatchModeKey } from '../../utils/matchMode';

export const updatePlayerPhysics = (
  state: any,
  player: any,
  dummy: any,
  arenaSize: number,
  context: any = {}
): void => {
  const stateRef = { current: state };
  const {
    matchData,
    dummyBehavior = 'passive',
    settings = { screenShake: 1 },
    soundManager,
    spawnFloatingText = () => {},
    userEmail = 'anon',
    syncCombatStatesToUI = () => {},
    isTouchDevice = false,
    triggerKOCinematic = () => {},
    triggerPlayerLightAttack = () => {},
    executePlayerHeavyAttack = () => {},
    setIsPlayerBlocking = () => {},
    setTotalDamageDealt = () => {},
    setTotalHitsLanded = () => {},
    setTotalParries = () => {},
    matchTotalFramesRef = { current: 0 },
    matchForwardFramesRef = { current: 0 },
    matchParriesLandedRef = { current: 0 },
    roundParriesLandedRef = { current: 0 },
    matchPostureBreaksRef = { current: 0 },
    playerMinPosturePctRef = { current: 100 },
    QuestTracker = { trackEvent: () => {} },
  } = context;

  const finalizeKickboxingM2Cooldown = (f: any) => finalizeKickboxingM2CooldownHelper(f, spawnFloatingText, soundManager);
  const applyHeavyWhiffPenalty = (f: any) => applyHeavyWhiffPenaltyHelper(f, spawnFloatingText, soundManager);
    // 2. Update Player Physics
    if (player && !player.isDead) {
      // Forward vector and posture tracking for Ranked Evaluation Matrix
      if (state.rankedState === 'fighting' && dummy && !dummy.isDead) {
        matchTotalFramesRef.current += 1;
        const dx = dummy.x - player.x;
        const dy = dummy.y - player.y;
        const dot = player.vx * dx + player.vy * dy;
        if (dot > 0.05) {
          matchForwardFramesRef.current += 1;
        }
        if (dummy.isPostureLocked && (dummy.postureCd || 0) >= 60) {
          matchPostureBreaksRef.current = Math.max(matchPostureBreaksRef.current, 1);
        }
        const maxP = player.maxPostureCd || 78;
        const curPosturePct = Math.round(Math.max(0, (maxP - (player.postureCd || 0)) / maxP) * 100);
        if (curPosturePct < playerMinPosturePctRef.current) {
          playerMinPosturePctRef.current = curPosturePct;
        }
      }

      // Stun/Stagger timers decay
      if (player.armorBreakTime && player.armorBreakTime > 0) {
        player.armorBreakTime--;
        player.isBlocking = false;
      }

      // Block duration and parry visual flashing
      if (player.isBlocking && (player.armorBreakTime || 0) <= 0) {
        player.blockTimer = (player.blockTimer || 0) + 1;
      } else {
        player.blockTimer = 0;
      }

      if ((player.spinOutTimer && player.spinOutTimer > 0) || (player.kyokushinSpinOutTimer && player.kyokushinSpinOutTimer > 0)) {
        if (player.spinOutTimer) player.spinOutTimer--;
        if (player.kyokushinSpinOutTimer) player.kyokushinSpinOutTimer--;
        player.facingAngle += (Math.PI * 2) / 18; // Involuntary rapid 360° rotation in place for 0.3s (18 frames)
        player.isBlocking = false;
        player.heavyWindup = 0;
        player.fists.forEach(f => {
          f.isPunching = false;
          f.punchProgress = 0;
        });
        if ((!player.spinOutTimer || player.spinOutTimer === 0) && (!player.kyokushinSpinOutTimer || player.kyokushinSpinOutTimer === 0)) {
          player.postBlockAttackLockout = 27; // 0.45s Post-Block Action Delay AFTER downed slide
        }
      }

      if (player.aikiCentrifugalKnockbackTimer && player.aikiCentrifugalKnockbackTimer > 0) {
        player.aikiCentrifugalKnockbackTimer--;
      }

      if (player.kyokushinM2FreezeTimer && player.kyokushinM2FreezeTimer > 0) {
        player.kyokushinM2FreezeTimer--;
      }

      if (player.parryFlashTime && player.parryFlashTime > 0) {
        player.parryFlashTime--;
      }

      // Heavy windup timing
      if (player.heavyWindup && player.heavyWindup > 0) {
        player.heavyWindup--;
        if (player.styleId === 'street_taekwondo') {
          const maxW = player.maxHeavyWindup || 21;
          const wRatio = (maxW - player.heavyWindup) / maxW;
          // Phase 2: The Right Arc Feint (0.15s – 0.35s / 0.20s Duration)
          player.tkdFeintWindowActive = wRatio >= 0.4286 && wRatio < 1.0;
        }
        
        if ((player.styleId === 'kickboxing' && player.kickboxingIsSeq2) || player.styleId === 'basic') {
          // Keep forward momentum during Flow Boxing Sway Sprint M2 or Kickboxing S2 rapid chamber
          if (player.styleId === 'basic' && player.attackLockedAngle !== undefined) {
            const pMods = getHeightModifiers(player.baseHeight);
            const forwardSpeed = 7.5 * pMods.speedFactor;
            player.vx = Math.cos(player.attackLockedAngle) * forwardSpeed;
            player.vy = Math.sin(player.attackLockedAngle) * forwardSpeed;
            player.facingAngle = player.attackLockedAngle;
          }
        } else {
          player.vx = 0;
          player.vy = 0;
        }

        if (player.heavyWindup === 0) {
          executePlayerHeavyAttack();
        }
      }

      if (player.ashiharaRecoveryTimer && player.ashiharaRecoveryTimer > 0) {
        player.ashiharaRecoveryTimer--;
      }
      if (player.ashiharaParryLockout && player.ashiharaParryLockout > 0) {
        player.ashiharaParryLockout--;
      }
      if (player.parryLockoutTimer && player.parryLockoutTimer > 0) {
        player.parryLockoutTimer--;
      }

      // Damage flashing decays
      if (player.damageFlashTime > 0) player.damageFlashTime--;
      if (player.superArmorFlashTime && player.superArmorFlashTime > 0) player.superArmorFlashTime--;
      if (player.cqcM2HitFlashTime && player.cqcM2HitFlashTime > 0) player.cqcM2HitFlashTime--;
      if (player.capoeiraDodgeFlashTime && player.capoeiraDodgeFlashTime > 0) player.capoeiraDodgeFlashTime--;

      // Concussion slow timer decay
      if (player.concussTime && player.concussTime > 0) player.concussTime--;

      if (player.stunTime && player.stunTime > 0) player.stunTime--;
      if (player.m2StunTimer && player.m2StunTimer > 0) {
        player.m2StunTimer--;
        if (!player.stunTime || player.stunTime <= 0) player.m2StunTimer = 0;
      }
      if (player.parriedStun && player.parriedStun > 0) player.parriedStun--;
      if (player.cqcAttackLockout && player.cqcAttackLockout > 0) player.cqcAttackLockout--;
      if (player.keysiAttackLockout && player.keysiAttackLockout > 0) player.keysiAttackLockout--;
      if (player.pensadorLungeWindow && player.pensadorLungeWindow > 0) player.pensadorLungeWindow--;
      if (player.hitSteeringLock && player.hitSteeringLock > 0) player.hitSteeringLock--;
      if (player.hitMovementLock && player.hitMovementLock > 0) player.hitMovementLock--;
      if (player.blockLockout && player.blockLockout > 0) {
        player.blockLockout--;
        player.isBlocking = false;
        setIsPlayerBlocking(false);
      }

      if (player.blockUseResetTimer && player.blockUseResetTimer > 0) {
        player.blockUseResetTimer--;
        if (player.blockUseResetTimer <= 0) {
          player.blockUseCount = 0;
        }
      }

      // Defensive Input Buffering: holding block during stun queues guard and raises on Frame 1 recovery
      const isBlockInputActive = !!(state.isBlockInputHeld || state.keysPressed?.['KeyF'] || player.isBlockInputHeld);
      if (isBlockInputActive) {
        if (!player.isBlocking && canFighterRaiseGuard(player)) {
          // Section 2.8: Attack Animation Block-Cancel (Feinting / Reflex Parries)
          const hadActivePunch = player.fists.some(f => f.isPunching && !f.isHeavy);
          const hadActiveHeavy = (player.heavyWindup && player.heavyWindup > 0) || player.fists.some(f => f.isPunching && f.isHeavy);
          if (hadActiveHeavy) {
            applyHeavyWhiffPenalty(player);
            player.heavyWindup = 0;
            player.fists.forEach(f => {
              f.isPunching = false;
              f.punchProgress = 0;
              f.isHeavy = false;
            });
            spawnFloatingText(player.x, player.y - 30, 'M2 FEINT / CANCELLED', '#ef4444');
          } else if (hadActivePunch) {
            player.fists.forEach(f => {
              f.isPunching = false;
              f.punchProgress = 0;
              f.lingerTimer = 0;
              f.isLingerActive = false;
              f.hasHit = false;
            });
            spawnFloatingText(player.x, player.y - 30, 'FEINT / CANCEL', '#38bdf8');
          }
          // Instantaneous Frame 1 recovery block activation!
          player.isBlocking = true;
          player.blockTimer = 0;
          setIsPlayerBlocking(true);
        }
      } else {
        if (player.isBlocking) {
          player.isBlocking = false;
          player.kyokushinBlockHitsTaken = 0;
          player.blockLockout = Math.max(player.blockLockout || 0, BLOCK_COOLDOWN_FRAMES);
          // Section 2.8: Post-Block Attack Re-Initiation Delay (0.10s = 6 frames)
          player.postBlockAttackLockout = Math.max(player.postBlockAttackLockout || 0, 6);
          setIsPlayerBlocking(false);
        }
      }

      // Section 2.8 Timers decay & Delayed Momentum Stop
      if (player.lastHitBeforeDashTimer && player.lastHitBeforeDashTimer > 0) player.lastHitBeforeDashTimer--;
      if (player.postM1BlockLockout && player.postM1BlockLockout > 0) player.postM1BlockLockout--;
      if (player.postDashAttackLockout && player.postDashAttackLockout > 0) player.postDashAttackLockout--;
      if (player.dashWhiteFrameFlashTime && player.dashWhiteFrameFlashTime > 0) player.dashWhiteFrameFlashTime--;
      if (player.dashHitDelayedStopTimer && player.dashHitDelayedStopTimer > 0) {
        player.dashHitDelayedStopTimer--;
        if (player.dashHitDelayedStopTimer === 0) {
          // Exactly 0.10s after impact, dash momentum stops dead in its tracks!
          player.vx = 0;
          player.vy = 0;
          player.isDashing = false;
          player.dashProgress = 0;
          player.postDashAttackLockout = 18; // 0.30s Post-Dash Attack Lockout
          spawnFloatingText(player.x, player.y - 30, 'MOMENTUM HALTED!', '#ef4444');
        }
      }

      // Post-Block Action Delay decay & tracking
      if (player.postBlockAttackLockout && player.postBlockAttackLockout > 0) {
        player.postBlockAttackLockout--;
      }
      if (player.parryBlockGraceTimer && player.parryBlockGraceTimer > 0) {
        player.parryBlockGraceTimer--;
      }
      if (player.wasBlocking && !player.isBlocking) {
        player.cqcWasBlockingAtHit4 = false;
        player.blockLockout = Math.max(player.blockLockout || 0, BLOCK_COOLDOWN_FRAMES);
        if ((player.parryFlashTime || 0) <= 0 && (player.parryBlockGraceTimer || 0) <= 0 && (!player.kyokushinSpinOutTimer || player.kyokushinSpinOutTimer <= 0)) {
          if ((player.postBlockAttackLockout || 0) <= 0) {
            player.postBlockAttackLockout = 6; // Section 2.8: 0.10s Post-Block Action Delay
          }
        } else if ((player.kyokushinSpinOutTimer || 0) > 0) {
          player.postBlockAttackLockout = 0;
        } else {
          player.postBlockAttackLockout = 0;
        }
      }
      player.wasBlocking = player.isBlocking;

      // Crippling slow timer decay
      if (player.crippleTime && player.crippleTime > 0) player.crippleTime--;
      if (player.shellLockoutTimer && player.shellLockoutTimer > 0) player.shellLockoutTimer--;
      if (player.shellSpinTimer && player.shellSpinTimer > 0) player.shellSpinTimer--;
      if (player.shellPostureBoostTimer && player.shellPostureBoostTimer > 0) player.shellPostureBoostTimer--;

      // Kickboxing Seq 2 Window decay
      if (player.kickboxingSeq2Window && player.kickboxingSeq2Window > 0) {
        player.kickboxingSeq2Window--;
        if (player.kickboxingSeq2Window === 0) {
          player.kickboxingSeq2Ready = false;
          if (player.styleId === 'kickboxing') {
            finalizeKickboxingM2Cooldown(player);
          }
        }
      }

      // Aikido player updates (Tenkan Aiki Flow, M2 Stance, Counter Slam window, Slam animation)
      if (player.styleId === 'aikido') {
        if (player.aikiPassiveSlamCd && player.aikiPassiveSlamCd > 0) {
          player.aikiPassiveSlamCd--;
        }
        if (player.aikiSlamReactiveWindow && player.aikiSlamReactiveWindow > 0) {
          player.aikiSlamReactiveWindow--;
        }
        if (player.aikiM2ActiveWindow && player.aikiM2ActiveWindow > 0) {
          player.aikiM2ActiveWindow--;
          if (player.aikiM2ActiveWindow === 0) {
            // M2 Active Parry Whiffed!
            player.aikiM2Guarding = false;
            player.heavyCooldown = 420; // 7.0s Whiff CD
            player.aikiWhiffSlowTimer = 60; // 1.0s -70% movement slow
            player.strikeCooldown = Math.max(player.strikeCooldown || 0, 60); // 1.0s M1/M2/Parry lockout
            player.lightCooldown = Math.max(player.lightCooldown || 0, 60);
            player.parryLockoutTimer = Math.max(player.parryLockoutTimer || 0, 60);
            spawnFloatingText(player.x, player.y - 30, 'M2 WHIFF (-70% SPEED, 7.0s CD)', '#ef4444');
          }
        }
        if (player.aikiWhiffSlowTimer && player.aikiWhiffSlowTimer > 0) {
          player.aikiWhiffSlowTimer--;
        }
        if (player.aikiConfusionTimer && player.aikiConfusionTimer > 0) {
          player.aikiConfusionTimer--;
        }

        // Smooth Aikido S2 chamber curl/uncurl transition
        const pLeftFist = player.fists ? (player.fists.find(f => f.punchType === 'left') || player.fists[0]) : undefined;
        const pRightFist = player.fists ? (player.fists.find(f => f.punchType === 'right') || player.fists[1]) : undefined;
        const pLeftProg = pLeftFist ? pLeftFist.punchProgress : 0;
        const pRightProg = pRightFist ? pRightFist.punchProgress : 0;
        const pStage = player.comboStage === 0 ? 3 : ((player.comboStage || 1) - 1);
        const pTargetCurl = ((player.comboStage === 1 && pRightProg === 0) || (pLeftProg > 0 && (pStage === 1 || pLeftFist?.comboStage === 1))) ? 1.0 : 0.0;
        const pCurrentCurl = player.aikiCurlFactor !== undefined ? player.aikiCurlFactor : 0.0;
        const pCurlSpeed = 0.10;
        if (pCurrentCurl < pTargetCurl) {
          player.aikiCurlFactor = Math.min(pTargetCurl, pCurrentCurl + pCurlSpeed);
        } else if (pCurrentCurl > pTargetCurl) {
          player.aikiCurlFactor = Math.max(pTargetCurl, pCurrentCurl - pCurlSpeed);
        }
        if (player.aikiSlamStage) {
          player.vx = 0;
          player.vy = 0;
          player.aikiSlamUninterruptible = true;
          if (player.aikiSlamTimer && player.aikiSlamTimer > 0) {
            player.aikiSlamTimer--;
            // Total slam duration: 1.5s = 90 ticks at 60 FPS
            const progress = Math.min(1.0, Math.max(0, (90 - player.aikiSlamTimer) / 90));
            player.aikiSlamFrame = Math.floor(progress * 90);
            const target = player.aikiSlamTarget || dummy;
            if (target && !target.isDead) {
              target.vx = 0;
              target.vy = 0;
              target.aikiSlamUninterruptible = true;

              // Face each other directly; neither fighter moves during the slam
              const angleToTarget = Math.atan2(target.y - player.y, target.x - player.x);
              player.facingAngle = angleToTarget;
              target.facingAngle = angleToTarget + Math.PI;

              if (progress < 0.25) {
                // Phase 1: The Wrist Clamp & Mutual Lockout (0s - 0.375s)
                player.aikiSlamStage = 'clamp';
                target.aikiSlamVictimStage = 'clamp';
                target.aikiOverheadScale = 1.0;
              } else if (progress < 0.70) {
                // Phase 2: Leverage & Overhead Elevation (0.375s - 1.05s)
                player.aikiSlamStage = 'lift';
                target.aikiSlamVictimStage = 'airborne';
                const liftT = (progress - 0.25) / 0.45;
                // Elevate target pseudo-3D height smoothly
                target.aikiOverheadScale = 1.0 + 0.35 * Math.sin(liftT * Math.PI);
              } else if (!player.aikiSlamImpactDone) {
                // Phase 3: Impact & Detonation at ~1.05s
                player.aikiSlamImpactDone = true;
                player.aikiSlamStage = 'slam';
                target.aikiSlamVictimStage = 'downed';
                target.aikiOverheadScale = 1.0;

                // Flat Slam Damage (6.0 HP passive counter or 8.0 HP M2 counter)
                const slamDmg = player.aikiSlamDamage ?? 6.0;
                target.health = Math.max(0, target.health - slamDmg);
                target.damageFlashTime = 14;
                target.aikiConfusionTimer = 120; // 2.0s Neuro-Disruption (Confusion)
                if (target.isPlayer) {
                  stateRef.current.shakyVisionTimer = 120;
                }
                soundManager.playPunch(true);
                stateRef.current.shakeAmount = 14 * settings.screenShake;
                spawnFloatingText(target.x, target.y - 30, `OVER-HEAD SLAM! (${slamDmg.toFixed(1)} FLAT)`, '#0284c7');
                spawnFloatingText(target.x, target.y - 50, 'NEURO-DISRUPTION! (2.0s CONFUSION)', '#38bdf8');

                stateRef.current.particles.push({
                  id: `aiki_slam_shockwave_${Math.random()}`,
                  x: target.x,
                  y: target.y,
                  vx: 0,
                  vy: 0,
                  radius: 40,
                  color: '#00E5FF',
                  alpha: 1.0,
                  life: 0,
                  maxLife: 22,
                  type: 'aiki_dual_shockwave'
                } as any);

                for (let i = 0; i < 14; i++) {
                  const pAngle = Math.random() * Math.PI * 2;
                  const pSpeed = Math.random() * 4.5 + 2.0;
                  stateRef.current.particles.push({
                    id: `aiki_slam_dust_${Math.random()}`,
                    x: target.x,
                    y: target.y,
                    vx: Math.cos(pAngle) * pSpeed,
                    vy: Math.sin(pAngle) * pSpeed,
                    radius: Math.random() * 3 + 2,
                    color: Math.random() > 0.4 ? '#00E5FF' : '#ffffff',
                    alpha: 0.9,
                    life: 0,
                    maxLife: 18,
                    type: 'spark'
                  } as any);
                }

                target.spinOutTimer = 0;
                target.kyokushinSpinOutTimer = 0;
                target.aikiSpinDownTimer = 0;
                target.superCrippleTimer = Math.max(target.superCrippleTimer || 0, 60); // 1.0s Super Cripple (M1/M2 locked & -60% speed)
                target.aikiLockoutTimer = 60;      // 1.0s M1 and M2 attack lockout
                target.aikiShakyVisionTimer = 60;  // 1.0s shaky vision disruption
                target.stunTime = Math.max(target.stunTime || 0, 27);
              } else {
                // Follow-through downed state (1.05s - 1.50s)
                player.aikiSlamStage = 'slam';
                target.aikiSlamVictimStage = 'downed';
                target.aikiOverheadScale = 1.0;
              }
            }

            if (player.aikiSlamTimer === 0) {
              player.aikiSlamStage = null;
              player.aikiSlamTarget = null;
              player.aikiSlamFrame = undefined;
              player.aikiSlamBaseAngle = undefined;
              player.aikiSlamImpactDone = undefined;
              player.aikiSlamUninterruptible = false;
              if (target) {
                target.aikiSlamUninterruptible = false;
                target.aikiSlamVictimStage = null;
                target.aikiOverheadScale = 1.0;
              }
              player.aikiIsFreeSlam = false;
            }
          }
        }
      }

      // Universal timer updates for dummy & player
      if (dummy.aikiTenkanOffBalanceTimer && dummy.aikiTenkanOffBalanceTimer > 0) {
        dummy.aikiTenkanOffBalanceTimer--;
      }
      if (dummy.aikiKoteGaeshiTrapTimer && dummy.aikiKoteGaeshiTrapTimer > 0) {
        dummy.aikiKoteGaeshiTrapTimer--;
      }
      if (dummy.aikiLockoutTimer && dummy.aikiLockoutTimer > 0) {
        dummy.aikiLockoutTimer--;
      }
      if (dummy.aikiSpinDownTimer && dummy.aikiSpinDownTimer > 0) {
        dummy.aikiSpinDownTimer--;
      }
      if (dummy.aikiShakyVisionTimer && dummy.aikiShakyVisionTimer > 0) {
        dummy.aikiShakyVisionTimer--;
      }
      if (player.aikiTenkanOffBalanceTimer && player.aikiTenkanOffBalanceTimer > 0) {
        player.aikiTenkanOffBalanceTimer--;
      }
      if (player.aikiKoteGaeshiTrapTimer && player.aikiKoteGaeshiTrapTimer > 0) {
        player.aikiKoteGaeshiTrapTimer--;
      }
      if (player.aikiLockoutTimer && player.aikiLockoutTimer > 0) {
        player.aikiLockoutTimer--;
      }
      if (player.aikiSpinDownTimer && player.aikiSpinDownTimer > 0) {
        player.aikiSpinDownTimer--;
      }
      if (player.aikiShakyVisionTimer && player.aikiShakyVisionTimer > 0) {
        player.aikiShakyVisionTimer--;
      }

      // Capoeira player updates (exhaustion and stack regeneration)
      if (player.styleId === 'capoeira') {
        const playerStacks = player.capoeiraDodgeStacks !== undefined ? player.capoeiraDodgeStacks : 3;
        
        // 1. Handle Exhaustion countdown
        if (player.capoeiraExhausted) {
          if (player.capoeiraExhaustTimer && player.capoeiraExhaustTimer > 0) {
            player.capoeiraExhaustTimer--;
            player.isBlocking = false; // force false
            if (player.capoeiraExhaustTimer === 0) {
              player.capoeiraExhausted = false;
              // Instantly restore 1 stack upon exiting exhaustion so they aren't defenseless
              player.capoeiraDodgeStacks = 1;
              player.capoeiraRegenTimer = 0;
              spawnFloatingText(player.x, player.y - 30, 'RECOVERED! (1/3 Stacks)', '#ca8a04');
              syncCombatStatesToUI();
            }
          }
        }
        
        // 2. Handle Stack Regeneration when not blocking, not exhausted, and stacks < 3
        if (!player.isBlocking && !player.capoeiraExhausted && playerStacks < 3) {
          player.capoeiraRegenTimer = (player.capoeiraRegenTimer || 0) + 1;
          if (player.capoeiraRegenTimer >= 300) { // 5.0 seconds (300 frames)
            player.capoeiraDodgeStacks = playerStacks + 1;
            player.capoeiraRegenTimer = 0;
            spawnFloatingText(player.x, player.y - 30, `STOCKED DODGE! (${player.capoeiraDodgeStacks}/3)`, '#16a34a');
            syncCombatStatesToUI();
          }
        } else if (playerStacks === 3) {
          player.capoeiraRegenTimer = 0;
        }
      }


      // Combo reset countdown
      if (player.comboResetTimer && player.comboResetTimer > 0) {
        player.comboResetTimer--;
        if (player.comboResetTimer === 0) {
          player.comboStage = 0; // reset chain
          player.sluggerM1WhiffDragCount = 0;
          player.sluggerWhiffedStages = [];
          player.aikiManualM2UsedInSequence = false;
          player.shellS3Primed = false;
          player.shellS4ReturnTimer = 0;
          player.flowS3ParryBaited = false;
          player.flowS1Whiffed = false;
          player.flowS2HasIFrames = false;
          syncCombatStatesToUI();
        }
      }

      if (player.shellS4ReturnTimer && player.shellS4ReturnTimer > 0) {
        player.shellS4ReturnTimer--;
      }

      // Kickboxing Auto-Sequence 2 Timer (0.15s after S1 finishes / hits)
      if (player.kickboxingAutoSeq2Timer && player.kickboxingAutoSeq2Timer > 0) {
        player.kickboxingAutoSeq2Timer--;
        if (player.kickboxingAutoSeq2Timer === 0) {
          let exec = 0.95;
          if (player.kickboxingCadenceTimer && player.kickboxingCadenceTimer > 0) exec *= 1.15;
          player.heavyWindup = Math.round(9 / exec); // Rapid Chamber (scaled by execution speed)
          player.kickboxingIsSeq2 = true;
          player.kickboxingSeq2Ready = false;
          player.kickboxingSeq2Window = 0;
          player.strikeCooldown = 0;
          player.fists.forEach(f => {
            f.isPunching = false;
            f.punchProgress = 0;
            f.isHeavy = false;
            f.hasHit = false;
          });
          // S2 Lunges forward slightly to reach the opponent
          player.vx += Math.cos(player.facingAngle) * 3.5;
          player.vy += Math.sin(player.facingAngle) * 3.5;
        }
      }

      // SECTION 1.18 - FIX 2: Street Boxing M2 Flurry Auto-Burst State Machine (Player)
      if (tickStreetBoxingAutoBurst(player)) {
        // Micro-step to maintain pocket cling
        player.vx += Math.cos(player.facingAngle) * 2.0;
        player.vy += Math.sin(player.facingAngle) * 2.0;
        soundManager.playDash();
      }

      // Ashihara M2 3-Stage Sequence Progression (Player)
      if (player.styleId === 'ashihara') {
        if (player.ashiharaM2Stage === 2 && player.ashiharaM2Timer && player.ashiharaM2Timer > 0) {
          player.ashiharaM2Timer--;
          // Tsukami Pull: interpolate target forward toward player
          if (dummy && !dummy.isDead) {
            const pullAngle = Math.atan2(dummy.y - player.y, dummy.x - player.x);
            const targetDist = player.radius + dummy.radius + 8;
            dummy.x = player.x + Math.cos(pullAngle) * targetDist;
            dummy.y = player.y + Math.sin(pullAngle) * targetDist;
          }
          if (player.ashiharaM2Timer === 0) {
            // Transition from M2 S2 (Tsukami Drag) to M2 S3 (Chudan Straight)
            player.ashiharaM2Stage = 3;
            player.ashiharaM2Timer = 12; // 0.20s execution
            // Activate rear fist for Straight Slim Square thrust
            const rearFist = player.fists.find(f => f.punchType === 'right') || player.fists[1] || player.fists[0];
            if (rearFist) {
              rearFist.isPunching = true;
              rearFist.punchProgress = 0.05;
              rearFist.isHeavy = true;
              rearFist.hasHit = false;
              (rearFist as any).ashiharaS3 = true;
            }
            soundManager.playPunch(true);
          }
        } else if (player.ashiharaM2Stage === 3 && player.ashiharaM2Timer && player.ashiharaM2Timer > 0) {
          player.ashiharaM2Timer--;
          // Animate rear fist straight punch forward
          const rearFist = player.fists.find(f => f.punchType === 'right') || player.fists[1] || player.fists[0];
          if (rearFist) {
            rearFist.isPunching = true;
            rearFist.punchProgress = Math.min(1.0, 1.0 - (player.ashiharaM2Timer / 12));
            rearFist.isHeavy = true;
            (rearFist as any).ashiharaS3 = true;

            // Deliver S3 impact at midway / peak extension (frame 6)
            if (player.ashiharaM2Timer === 6 && !rearFist.hasHit) {
              rearFist.hasHit = true;
              if (dummy && !dummy.isDead) {
                const ashiharaMods = getHeightModifiers(player.baseHeight);
                const s3Dmg = Math.round(13.0 * ashiharaMods.damageFactor * 0.90 * 10) / 10;
                if (matchData?.gamemode !== 'sustain_attack' && matchData?.gamemode !== 'hot_potato') {
                  dummy.health = Math.max(0, dummy.health - s3Dmg);
                }
                applyDamageCombatLocks(dummy);
                dummy.damageFlashTime = 16;
                dummy.stunTime = 51; // 0.85s Stagger Stun!
                dummy.strikeCooldown = 51;
                dummy.blockLockout = 51;
                dummy.isBlocking = false;
                
                // Sabaki Cooldown refund:
                player.heavyCooldown = 0;
                player.heavyWindup = 0;
                
                stateRef.current.shakeAmount = 14 * settings.screenShake;
                stateRef.current.hitStopFrames = 2; // 2-frame hit-stop impact
                soundManager.playPunch(true);
                spawnFloatingText(dummy.x, dummy.y - 25, `-${s3Dmg} HP`, '#ef4444');
                
                // Blue & Gold kinetic sparks
                for (let i = 0; i < 16; i++) {
                  const angle = player.facingAngle + (Math.random() - 0.5) * 1.2;
                  const speed = Math.random() * 6 + 3;
                  stateRef.current.particles.push({
                    id: `ashihara_s3_${Math.random()}`,
                    x: dummy.x,
                    y: dummy.y,
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
              }
            }
          }
          if (player.ashiharaM2Timer === 0) {
            player.ashiharaM2Stage = 0;
            if (rearFist) {
              rearFist.isPunching = false;
              rearFist.punchProgress = 0;
              rearFist.isHeavy = false;
              (rearFist as any).ashiharaS3 = false;
            }
            syncCombatStatesToUI();
          }
        }
      }

      // CQC M2 Echo Rings & Rear Blitz Assault Sequence (Player)
      if (player.styleId === 'cqc') {
        if (player.cqcM2Stage === 'windup' || (player.heavyWindup && player.heavyWindup > 0)) {
          const totalWindup = 90;
          const currentWindup = player.heavyWindup ?? player.cqcWindupTimer ?? 0;
          const elapsed = Math.max(0, totalWindup - currentWindup);

          // 8 Echo Rings with 20% decreased max range (272px)
          const MAX_RANGE = 272;
          const ringRadii: number[] = [];
          const rings = Array.from({ length: 8 }, (_, i) => {
            const maxR = Math.round(((i + 1) / 8) * MAX_RANGE);
            const startFrame = i * 9;
            const expandDuration = 18;
            let r = 0;
            if (elapsed >= startFrame) {
              const rElapsed = Math.min(expandDuration, elapsed - startFrame);
              r = Math.min(maxR, (rElapsed / expandDuration) * maxR);
            }
            ringRadii.push(r);
            return {
              r,
              maxR,
              frozen: !!player.cqcLockedTarget
            };
          });

          if (dummy && !dummy.isDead) {
            const dist = Math.hypot(dummy.x - player.x, dummy.y - player.y);
            const activeMaxR = Math.max(...ringRadii, 100);
            if (dist <= activeMaxR + dummy.radius && !player.cqcLockedTarget) {
              player.cqcLockedTarget = dummy;
              spawnFloatingText(dummy.x, dummy.y - 35, 'ECHO LOCKON!', '#ef4444');
              soundManager.playParry();
            }
          }

          player.cqcRings = rings;

          if ((player.heavyWindup || 0) <= 0 && player.cqcM2Stage === 'windup') {
            player.cqcM2Stage = null;
            player.cqcRings = undefined;
          }
        } else if (player.cqcM2Stage === 'dash') {
          const target = player.cqcLockedTarget || (dummy && !dummy.isDead ? dummy : null);
          if (target && !target.isDead) {
            const total = player.cqcDashTotalFrames || 18;
            const curFrame = Math.max(0, player.dashProgress || 0);
            const rawT = Math.min(1, Math.max(0, 1 - (curFrame / total)));
            // Smooth hermite glide interpolation
            const t = rawT * rawT * (3 - 2 * rawT);

            const startX = player.cqcDashStartX ?? player.x;
            const startY = player.cqcDashStartY ?? player.y;
            const endX = player.cqcDashEndX ?? player.x;
            const endY = player.cqcDashEndY ?? player.y;

            player.x = startX + (endX - startX) * t;
            player.y = startY + (endY - startY) * t;
            const glideAngle = Math.atan2(endY - startY, endX - startX);
            player.facingAngle = glideAngle;

            // Physical glide velocity
            player.vx = Math.cos(glideAngle) * 9.5;
            player.vy = Math.sin(glideAngle) * 9.5;

            target.vx = 0;
            target.vy = 0;
            if (target.styleId === 'ashihara') {
              target.stunTime = 0;
              target.hitMovementLock = 0;
              target.hitSteeringLock = 0;
            } else {
              target.stunTime = Math.max(target.stunTime || 0, 30);
              target.hitMovementLock = Math.max(target.hitMovementLock || 0, 30);
              target.hitSteeringLock = Math.max(target.hitSteeringLock || 0, 30);
            }

            if (target.styleId === 'ashihara' && ((target.heavyWindup && target.heavyWindup > 0) || (target.ashiharaM2Stage && target.ashiharaM2Stage >= 1))) {
              player.cqcM2Stage = null;
              player.cqcLockedTarget = null;
              player.cqcLockedAngle = undefined;
              player.cqcRings = undefined;
              player.isDashing = false;
              player.dashProgress = 0;
              player.heavyCooldown = 900;

              target.ashiharaM2Stage = 2;
              target.ashiharaM2Timer = 9;
              target.heavyWindup = 0;
              target.heavyCooldown = 0;

              soundManager.playParry();
              soundManager.playDash();
              stateRef.current.shakeAmount = 10 * settings.screenShake;
              spawnFloatingText(target.x, target.y - 35, 'SABAKI COUNTERED CQC BLITZ!', '#1d4ed8');
              return;
            }

            if (target.styleId === 'boxing_shell' && ((target.heavyWindup && target.heavyWindup > 0) || target.fists.some(f => f.isPunching && f.isHeavy))) {
              player.cqcM2Stage = null;
              player.cqcLockedTarget = null;
              player.cqcLockedAngle = undefined;
              player.cqcRings = undefined;
              player.isDashing = false;
              player.dashProgress = 0;
              player.heavyCooldown = 900;

              player.shellSpinTimer = 0;
              player.stunTime = 90;
              player.strikeCooldown = 90;
              player.shellLockoutTimer = 90;
              player.damageFlashTime = 10;
              player.isBlocking = false;
              player.blockLockout = 60;

              target.heavyWindup = 0;
              target.fists.forEach(f => { f.isPunching = false; f.punchProgress = 0; f.isHeavy = false; });
              target.heavyCooldown = 360;
              target.shellPostureBoostTimer = 180;
              target.parryFlashTime = 18;

              soundManager.playParry();
              soundManager.playRollTick();
              stateRef.current.shakeAmount = 10 * settings.screenShake;
              spawnFloatingText(player.x, player.y - 35, 'SHOULDER DEFLECTED & STAGGERED (1.5s)', '#d946ef');
              spawnFloatingText(target.x, target.y - 35, 'POSTURE RECOVERY BOOST 2X (3.0s)', '#d946ef');
              return;
            }

            stateRef.current.particles.push({
              id: `cqc_dash_p_${Math.random()}`,
              x: player.x,
              y: player.y,
              vx: -Math.cos(glideAngle) * (Math.random() * 2 + 1),
              vy: -Math.sin(glideAngle) * (Math.random() * 2 + 1),
              radius: player.radius * 0.45,
              color: '#ef4444',
              alpha: 0.55,
              life: 0,
              maxLife: 16,
              type: 'spark'
            });

            if (player.dashProgress === undefined || player.dashProgress <= 0) {
              const startX = player.cqcDashStartX ?? player.x;
              const startY = player.cqcDashStartY ?? player.y;

              // Smoothly land on the end position
              player.x = endX;
              player.y = endY;
              player.vx = 0;
              player.vy = 0;

              // Attacker continuously faces the enemy
              const angleToTarget = Math.atan2(target.y - player.y, target.x - player.x);
              player.facingAngle = angleToTarget;
              player.cqcLockedAngle = angleToTarget;

              // Check if opponent properly blocked head-on (passed through their frontal guard)
              const incomingDir = Math.atan2(startY - target.y, startX - target.x);
              const angleDiff = Math.abs(Math.atan2(Math.sin(target.facingAngle - incomingDir), Math.cos(target.facingAngle - incomingDir)));
              const isHeadOnGuard = !!(target.isBlocking && (target.armorBreakTime || 0) <= 0 && (target.blockLockout || 0) <= 0 && angleDiff < (Math.PI * 0.5));

              player.cqcAssaultBlocked = isHeadOnGuard;
              player.cqcM2Stage = 'assault';
              player.cqcAssaultHit = 1;
              player.cqcAssaultTimer = 12; // 0.2s (12 frames) before 1st hit
              player.isDashing = false;
              player.dashProgress = 0;
              player.cqcRings = undefined;

              if (isHeadOnGuard) {
                // Guard intact: blocks the attack
                target.stunTime = 0;
                target.blockLockout = 0;
                target.isBlocking = true;
                target.hitSteeringLock = 0;
                target.hitMovementLock = 0;
                soundManager.playBlock();
                spawnFloatingText(target.x, target.y - 35, 'GUARD BLOCKED!', '#38bdf8');
              } else {
                // Did not block head-on: full damage & block disabled until 5th attack!
                target.isBlocking = false;
                target.blockLockout = 70; // Block disabled until 5th attack
                target.stunTime = 15;
                target.cqcAttackLockout = 15;
                target.vx = 0;
                target.vy = 0;
                target.hitSteeringLock = 15;
                target.hitMovementLock = 15;
                spawnFloatingText(target.x, target.y - 35, 'CQC ASSAULT (5-HIT)', '#ef4444');
                soundManager.playPunch(true);
              }
            } else {
              player.dashProgress--;
            }
          } else {
            player.cqcM2Stage = null;
            player.cqcLockedTarget = null;
            player.cqcLockedAngle = undefined;
            player.cqcAssaultBlocked = false;
            player.isDashing = false;
            player.dashProgress = 0;
            player.cqcRings = undefined;
            player.heavyCooldown = Math.max(player.heavyCooldown || 0, 900);
          }
        } else if (player.cqcM2Stage === 'assault') {
          const target = player.cqcLockedTarget || (dummy && !dummy.isDead ? dummy : null);
          if (target && !target.isDead) {
            // Attacker stays in place and tracks rotation facing the enemy
            player.vx = 0;
            player.vy = 0;
            const angleToTarget = Math.atan2(target.y - player.y, target.x - player.x);
            player.facingAngle = angleToTarget;
            player.cqcLockedAngle = angleToTarget;
            target.vx = 0;
            target.vy = 0;

            const isBlockedAssault = !!player.cqcAssaultBlocked;

            if (player.cqcAssaultHit && player.cqcAssaultHit < 5) {
              if (isBlockedAssault) {
                target.isBlocking = true;
                target.blockLockout = 0;
              } else {
                target.isBlocking = false;
                target.blockLockout = 15;
                target.stunTime = Math.max(target.stunTime || 0, 15);
                target.hitSteeringLock = Math.max(target.hitSteeringLock || 0, 15);
                target.hitMovementLock = Math.max(target.hitMovementLock || 0, 15);
              }
            }

            if (player.cqcAssaultTimer === undefined || player.cqcAssaultTimer <= 0) {
              const pMods = getHeightModifiers(player.baseHeight);
              const hitIndex = player.cqcAssaultHit || 1;
              const isTargetImmune = isFighterInIFrames(target);

              if (hitIndex < 4) {
                // Hits 1, 2, 3: Hits every 0.2s (12 frames)
                if (isBlockedAssault) {
                  // Blocked hit: damages 86% of Armor HP (AP) on Hit 1, with chip damage
                  if (hitIndex === 1 && !isTargetImmune) {
                    const curArmor = target.armorHP !== undefined ? target.armorHP : 18;
                    const armorDmg = Math.round(curArmor * 0.86 * 10) / 10;
                    target.armorHP = Math.max(0, Math.round((curArmor - armorDmg) * 10) / 10);
                    target.armorRegenLockout = Math.max(target.armorRegenLockout || 0, 90);
                    spawnFloatingText(target.x, target.y - 45, `-${armorDmg} AP (86%)`, '#38bdf8');
                  }

                  const chipDmg = isTargetImmune ? 0 : Math.round(0.6 * pMods.damageFactor * 10) / 10;
                  if (!isTargetImmune && matchData?.gamemode !== 'sustain_attack' && matchData?.gamemode !== 'hot_potato') {
                    if (target.isPlayer && stateRef.current.godMode) {
                      // God mode
                    } else if (stateRef.current.oneHitKO && !target.isPlayer) {
                      target.health = 0;
                    } else {
                      target.health = Math.max(0, target.health - chipDmg);
                    }
                  }
                  target.damageFlashTime = 8;
                  target.blockTimer = (target.blockTimer || 0) + 12;
                  target.isBlocking = true;
                  target.blockLockout = 0;
                  target.stunTime = 0;
                  soundManager.playBlock();

                  if (isTargetImmune) {
                    spawnFloatingText(target.x, target.y - 30, 'IMMUNE (0 HP)', '#38bdf8');
                  } else {
                    stateRef.current.totalDamageDealt = (stateRef.current.totalDamageDealt || 0) + chipDmg;
                    stateRef.current.totalHitsLanded = (stateRef.current.totalHitsLanded || 0) + 1;
                    setTotalDamageDealt(stateRef.current.totalDamageDealt);
                    setTotalHitsLanded(stateRef.current.totalHitsLanded);
                  }

                  for (let i = 0; i < 4; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const spd = Math.random() * 3 + 1.5;
                    stateRef.current.particles.push({
                      id: `cqc_blk_spk_${Math.random()}`,
                      x: target.x,
                      y: target.y,
                      vx: Math.cos(angle) * spd,
                      vy: Math.sin(angle) * spd,
                      radius: Math.random() * 2 + 1,
                      color: '#38bdf8',
                      alpha: 1.0,
                      life: 0,
                      maxLife: 12,
                      type: 'spark'
                    });
                  }
                } else {
                  // Unblocked hit: AP is NOT deducted when block does not face head-on; takes direct unblocked damage
                  const dmg = isTargetImmune ? 0 : Math.round(2.5 * pMods.damageFactor * 10) / 10;
                  if (!isTargetImmune && matchData?.gamemode !== 'sustain_attack' && matchData?.gamemode !== 'hot_potato') {
                    if (target.isPlayer && stateRef.current.godMode) {
                      // God mode
                    } else if (stateRef.current.oneHitKO && !target.isPlayer) {
                      target.health = 0;
                    } else {
                      target.health = Math.max(0, target.health - dmg);
                    }
                  }
                  target.damageFlashTime = 12;
                  target.cqcM2HitFlashTime = 14;
                  target.cqcAttackLockout = 15;
                  target.stunTime = Math.max(target.stunTime || 0, 15);
                  target.isBlocking = false;
                  target.blockLockout = 15;
                  stateRef.current.shakeAmount = 6 * settings.screenShake;
                  soundManager.playPunch(false);

                  if (isTargetImmune) {
                    spawnFloatingText(target.x, target.y - 30, 'IMMUNE (0 HP)', '#38bdf8');
                  } else {
                    stateRef.current.totalDamageDealt = (stateRef.current.totalDamageDealt || 0) + dmg;
                    stateRef.current.totalHitsLanded = (stateRef.current.totalHitsLanded || 0) + 1;
                    setTotalDamageDealt(stateRef.current.totalDamageDealt);
                    setTotalHitsLanded(stateRef.current.totalHitsLanded);
                  }

                  for (let i = 0; i < 5; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const spd = Math.random() * 4 + 2;
                    stateRef.current.particles.push({
                      id: `cqc_assault_spk_${Math.random()}`,
                      x: target.x,
                      y: target.y,
                      vx: Math.cos(angle) * spd,
                      vy: Math.sin(angle) * spd,
                      radius: Math.random() * 2.5 + 1.5,
                      color: i % 2 === 0 ? '#ef4444' : '#cbd5e1',
                      alpha: 1.0,
                      life: 0,
                      maxLife: 15,
                      type: 'spark'
                    });
                  }
                }

                syncCombatStatesToUI();

                if (!target.isPlayer && dummyBehavior === 'test_ai') {
                  target.health = target.maxHealth;
                  target.isDead = false;
                  target.vx = 0;
                  target.vy = 0;
                } else if (target.health <= 0) {
                  target.health = 0;
                  target.isDead = true;
                  triggerKOCinematic(player, target);
                  player.cqcM2Stage = null;
                  player.cqcLockedTarget = null;
                  player.cqcAssaultBlocked = false;
                  player.cqcRings = undefined;
                  player.isDashing = false;
                  player.dashProgress = 0;
                  syncCombatStatesToUI();
                  return;
                }

                player.cqcAssaultHit = hitIndex + 1;
                player.cqcAssaultTimer = 12; // 0.2s (12 frames) between hits
              } else if (hitIndex === 4) {
                // Hit 4: Lands, then sets up 0.25s window before Hit 5
                if (isBlockedAssault) {
                  const chipDmg = isTargetImmune ? 0 : Math.round(0.6 * pMods.damageFactor * 10) / 10;
                  if (!isTargetImmune && matchData?.gamemode !== 'sustain_attack' && matchData?.gamemode !== 'hot_potato') {
                    if (target.isPlayer && stateRef.current.godMode) {
                      // God mode
                    } else if (stateRef.current.oneHitKO && !target.isPlayer) {
                      target.health = 0;
                    } else {
                      target.health = Math.max(0, target.health - chipDmg);
                    }
                  }
                  target.damageFlashTime = 8;
                  soundManager.playBlock();
                  if (isTargetImmune) {
                    spawnFloatingText(target.x, target.y - 30, 'IMMUNE (0 HP)', '#38bdf8');
                  } else {
                    stateRef.current.totalDamageDealt = (stateRef.current.totalDamageDealt || 0) + chipDmg;
                    stateRef.current.totalHitsLanded = (stateRef.current.totalHitsLanded || 0) + 1;
                    setTotalDamageDealt(stateRef.current.totalDamageDealt);
                    setTotalHitsLanded(stateRef.current.totalHitsLanded);
                  }
                } else {
                  const dmg = isTargetImmune ? 0 : Math.round(2.5 * pMods.damageFactor * 10) / 10;
                  if (!isTargetImmune && matchData?.gamemode !== 'sustain_attack' && matchData?.gamemode !== 'hot_potato') {
                    if (target.isPlayer && stateRef.current.godMode) {
                      // God mode
                    } else if (stateRef.current.oneHitKO && !target.isPlayer) {
                      target.health = 0;
                    } else {
                      target.health = Math.max(0, target.health - dmg);
                    }
                  }
                  target.damageFlashTime = 12;
                  target.cqcM2HitFlashTime = 14;
                  stateRef.current.shakeAmount = 6 * settings.screenShake;
                  soundManager.playPunch(false);

                  if (isTargetImmune) {
                    spawnFloatingText(target.x, target.y - 30, 'IMMUNE (0 HP)', '#38bdf8');
                  } else {
                    stateRef.current.totalDamageDealt = (stateRef.current.totalDamageDealt || 0) + dmg;
                    stateRef.current.totalHitsLanded = (stateRef.current.totalHitsLanded || 0) + 1;
                    setTotalDamageDealt(stateRef.current.totalDamageDealt);
                    setTotalHitsLanded(stateRef.current.totalHitsLanded);
                  }

                  for (let i = 0; i < 5; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const spd = Math.random() * 4 + 2;
                    stateRef.current.particles.push({
                      id: `cqc_assault_spk_${Math.random()}`,
                      x: target.x,
                      y: target.y,
                      vx: Math.cos(angle) * spd,
                      vy: Math.sin(angle) * spd,
                      radius: Math.random() * 2.5 + 1.5,
                      color: i % 2 === 0 ? '#ef4444' : '#cbd5e1',
                      alpha: 1.0,
                      life: 0,
                      maxLife: 15,
                      type: 'spark'
                    });
                  }
                }

                syncCombatStatesToUI();

                if (!target.isPlayer && dummyBehavior === 'test_ai') {
                  target.health = target.maxHealth;
                  target.isDead = false;
                  target.vx = 0;
                  target.vy = 0;
                } else if (target.health <= 0) {
                  target.health = 0;
                  target.isDead = true;
                  triggerKOCinematic(player, target);
                  player.cqcM2Stage = null;
                  player.cqcLockedTarget = null;
                  player.cqcAssaultBlocked = false;
                  player.cqcRings = undefined;
                  player.isDashing = false;
                  player.dashProgress = 0;
                  syncCombatStatesToUI();
                  return;
                }

                player.cqcAssaultHit = 5;
                // 5th hit initiates after 0.25s (15 frames)
                player.cqcAssaultTimer = 15;
                target.blockLockout = 0; // Un-disables block before Hit 5
                target.stunTime = 0; // Un-stun so opponent can raise guard to parry
                target.hitSteeringLock = 0;
                target.hitMovementLock = 0;
                target.cqcAttackLockout = 0;
                // If defender was already holding block before the Hit 5 telegraph window, record it so merely holding block does not parry
                target.cqcWasBlockingAtHit4 = target.isBlocking;
                spawnFloatingText(target.x, target.y - 45, 'DEFEND HIT 5 (0.25s)!', '#fbbf24');
              } else if (hitIndex === 5) {
                // Hit 5 lands: Evaluate Perfect Parry vs Unblocked/Regular Block
                const blockCheck = checkDirectionalBlock(target, player);
                const isDirectionalBlocked = blockCheck.isBlocked;
                const blockTimeFrames = target.blockTimer || 0;
                const isParry = evaluateParry(target, player, isDirectionalBlocked, blockTimeFrames, { isFrames: true });

                if (isParry) {
                  // Successful Perfect Parry on Hit 5: Parried strike deals 0 damage to the opponent!
                  target.damageFlashTime = 12;
                  target.parryFlashTime = 18;
                  target.parryBlockGraceTimer = 90;
                  target.afterParryGraceTimer = 90;
                  target.postBlockAttackLockout = 0;
                  target.strikeCooldown = 0;
                  target.vx = 0;
                  target.vy = 0;
                  soundManager.playParry();
                  spawnFloatingText(target.x, target.y - 30, 'PARRIED!', '#f59e0b');

                  if (target.isPlayer) {
                    matchParriesLandedRef.current += 1;
                    roundParriesLandedRef.current += 1;
                    stateRef.current.totalParries = (stateRef.current.totalParries || 0) + 1;
                    setTotalParries(stateRef.current.totalParries);
                    QuestTracker.trackEvent(userEmail, {
                      type: 'parry',
                      mode: getMatchModeKey()
                    });
                  }
                } else {
                  // Unblocked / Not Parried: Check if target is in I-Frames
                  const fullDmg = isTargetImmune ? 0 : Math.round(4.0 * pMods.damageFactor * 10) / 10;
                  if (!isTargetImmune && matchData?.gamemode !== 'sustain_attack' && matchData?.gamemode !== 'hot_potato') {
                    if (target.isPlayer && stateRef.current.godMode) {
                      // God mode
                    } else if (stateRef.current.oneHitKO && !target.isPlayer) {
                      target.health = 0;
                    } else {
                      target.health = Math.max(0, target.health - fullDmg);
                    }
                  }
                  target.damageFlashTime = 18;
                  target.isBlocking = false;
                  target.stunTime = 0; // Guard is allowed
                  target.blockLockout = 0; // Guard is allowed (can still block)
                  target.hitMovementLock = 51; // Movement disabled for 0.85s
                  target.cqcAttackLockout = 51; // Attack disabled for 0.85s
                  target.hitSteeringLock = 0;

                  const kbAngle = player.facingAngle;
                  target.vx = Math.cos(kbAngle) * 1.5;
                  target.vy = Math.sin(kbAngle) * 1.5;
                  soundManager.playPunch(true);

                  player.postureCd = 0;
                  player.isPostureLocked = false;
                  spawnFloatingText(player.x, player.y - 30, 'POSTURE CD RESET (0.0s)', '#22c55e');

                  if (isTargetImmune) {
                    spawnFloatingText(target.x, target.y - 30, 'IMMUNE (0 HP)', '#38bdf8');
                  } else {
                    spawnFloatingText(target.x, target.y - 30, `-${fullDmg} HP`, '#ef4444');
                    stateRef.current.totalDamageDealt = (stateRef.current.totalDamageDealt || 0) + fullDmg;
                    stateRef.current.totalHitsLanded = (stateRef.current.totalHitsLanded || 0) + 1;
                    setTotalDamageDealt(stateRef.current.totalDamageDealt);
                    setTotalHitsLanded(stateRef.current.totalHitsLanded);
                  }
                }

                stateRef.current.shakeAmount = 14 * settings.screenShake;
                stateRef.current.hitStopFrames = 2;

                if (!target.isPlayer && dummyBehavior === 'test_ai') {
                  target.health = target.maxHealth;
                  target.isDead = false;
                  target.vx = 0;
                  target.vy = 0;
                } else if (target.health <= 0) {
                  target.health = 0;
                  target.isDead = true;
                  triggerKOCinematic(player, target);
                }

                // Back to normal after the 5th attack
                player.cqcM2Stage = null;
                player.cqcLockedTarget = null;
                player.cqcLockedAngle = undefined;
                player.cqcRings = undefined;
                player.isDashing = false;
                player.dashProgress = 0;
                player.heavyCooldown = 900; // 15.0s cooldown
                player.strikeCooldown = 0; // Attacker can immediately follow up
                player.lightCooldown = 0;
                syncCombatStatesToUI();
              }
            } else {
              player.cqcAssaultTimer--;
            }
          } else {
            player.cqcM2Stage = null;
            player.cqcLockedTarget = null;
            player.cqcLockedAngle = undefined;
            player.cqcRings = undefined;
            player.isDashing = false;
            player.dashProgress = 0;
            player.heavyCooldown = Math.max(player.heavyCooldown || 0, 900);
            player.strikeCooldown = 0;
            player.lightCooldown = 0;
            syncCombatStatesToUI();
          }
        }
      }

      // Keysi M2 Clinch State Machine (Player)
      if (player.styleId === 'keysi') {
        if (player.keysiClinchStage === 'delay') {
          if (player.keysiClinchTimer && player.keysiClinchTimer > 0) {
            player.keysiClinchTimer--;
            player.vx = 0;
            player.vy = 0;
            if (player.keysiClinchTimer === 0) {
              const target = player.keysiClinchTarget || (dummy && !dummy.isDead ? dummy : null);
              if (target && !target.isDead) {
                const dist = Math.hypot(target.x - player.x, target.y - player.y);
                const inPocketRange = dist <= (player.radius + target.radius + 24); // ~72px pocket clinch range
                const blockCheck = checkDirectionalBlock(target, player);
                const blockTimeSec = (target.blockTimer || 0) / 60;
                const isParry = inPocketRange && evaluateParry(target, player, blockCheck.isBlocked, blockTimeSec);

                if (isParry) {
                  // Opponent parried the clinch grab the moment the elbow hits! Zero knockback!
                  target.parryFlashTime = 18;
                  target.parryBlockGraceTimer = 90;
                  target.afterParryGraceTimer = 90;
                  target.postBlockAttackLockout = 0;
                  target.strikeCooldown = 0;
                  target.vx = 0;
                  target.vy = 0;
                  player.vx = 0;
                  player.vy = 0;
                  soundManager.playParry();
                  spawnFloatingText(target.x, target.y - 30, 'PARRIED!', '#f59e0b');
                  player.heavyWindup = 0;
                  player.keysiClinchStage = null;
                  player.keysiClinchTarget = null;
                  applyHeavyWhiffPenalty(player);
                } else if (inPocketRange) {
                  // If enemy was holding block during the clamp: Shatters guard (AP) and initiates attack instantly
                  if (target.isBlocking) {
                    target.armorHP = 0;
                    target.armorBreakTime = 60;
                    soundManager.playGuardBreak();
                    spawnFloatingText(target.x, target.y - 30, 'GUARD BROKEN! (AP SHATTERED)', '#ef4444');
                  }

                  // Clinch Connected! The closed elbows immobilize the victim and disable all buttons
                  player.keysiClinchStage = 'clinch';
                  player.keysiClinchTimer = 38; // 38 frames (~0.63s) full headbutt sequence
                  player.keysiClinchTarget = target;
                  player.heavyCooldown = 900; // 15.0s cooldown on hit
                  target.stunTime = Math.max(target.stunTime || 0, 48);
                  target.blockLockout = Math.max(target.blockLockout || 0, 48);
                  target.strikeCooldown = Math.max(target.strikeCooldown || 0, 48);
                  target.heavyCooldown = Math.max(target.heavyCooldown || 0, 48);
                  target.lightCooldown = Math.max(target.lightCooldown || 0, 48);
                  target.dashCooldown = Math.max(target.dashCooldown || 0, 48);
                  target.isBlocking = false;
                  target.vx = 0;
                  target.vy = 0;
                  soundManager.playParry();
                  spawnFloatingText(target.x, target.y - 35, 'HEAD CLAMPED!', '#ef4444');
                } else {
                  // Whiffed outside pocket range
                  player.keysiClinchStage = null;
                  player.keysiClinchTarget = null;
                  applyHeavyWhiffPenalty(player);
                }
              } else {
                player.keysiClinchStage = null;
                player.keysiClinchTarget = null;
                applyHeavyWhiffPenalty(player);
              }
            }
          }
        } else if (player.keysiClinchStage === 'clinch') {
          if (player.keysiClinchTimer && player.keysiClinchTimer > 0) {
            player.keysiClinchTimer--;
            player.vx = 0;
            player.vy = 0;
            const target = player.keysiClinchTarget || (dummy && !dummy.isDead ? dummy : null);
            if (target && !target.isDead) {
              // Clamp pulls opponent inward and locks him firmly in place
              const clinchDist = player.radius + target.radius + 4;
              const desiredX = player.x + Math.cos(player.facingAngle) * clinchDist;
              const desiredY = player.y + Math.sin(player.facingAngle) * clinchDist;
              target.x += (desiredX - target.x) * 0.45;
              target.y += (desiredY - target.y) * 0.45;
              target.vx = 0;
              target.vy = 0;
              target.stunTime = Math.max(target.stunTime || 0, 15);
              target.blockLockout = Math.max(target.blockLockout || 0, 15);
              target.strikeCooldown = Math.max(target.strikeCooldown || 0, 15);
              target.heavyCooldown = Math.max(target.heavyCooldown || 0, 15);
              target.lightCooldown = Math.max(target.lightCooldown || 0, 15);
              target.dashCooldown = Math.max(target.dashCooldown || 0, 15);
              target.isBlocking = false;
            }
            // Frame 15: Headbutt impact delivery!
            if (player.keysiClinchTimer === 15) {
              if (target && !target.isDead) {
                const pMods = getHeightModifiers(player.baseHeight);
                const isTargetImmune = isFighterInIFrames(target);
                const headbuttDmg = isTargetImmune ? 0 : Math.round(14.0 * pMods.damageFactor * 10) / 10;
                if (!isTargetImmune && matchData?.gamemode !== 'sustain_attack' && matchData?.gamemode !== 'hot_potato') {
                  if (target.isPlayer && stateRef.current.godMode) {
                    // God mode
                  } else if (stateRef.current.oneHitKO && !target.isPlayer) {
                    target.health = 0;
                  } else {
                    target.health = Math.max(0, target.health - headbuttDmg);
                  }
                }
                applyDamageCombatLocks(target);
                target.damageFlashTime = 16;
                target.keysiStaggerTimer = 240; // 4.0s Trauma Stagger!
                target.vx = 0;
                target.vy = 0;
                stateRef.current.shakeAmount = 16 * settings.screenShake;
                stateRef.current.hitStopFrames = 3;
                soundManager.playPunch(true);
                if (isTargetImmune) {
                  spawnFloatingText(target.x, target.y - 35, 'IMMUNE (0 HP)', '#38bdf8');
                } else {
                  spawnFloatingText(target.x, target.y - 35, `-${headbuttDmg} HP (TRAUMA STAGGER!)`, '#ef4444');
                  stateRef.current.totalDamageDealt = (stateRef.current.totalDamageDealt || 0) + headbuttDmg;
                  stateRef.current.totalHitsLanded = (stateRef.current.totalHitsLanded || 0) + 1;
                  setTotalDamageDealt(stateRef.current.totalDamageDealt);
                  setTotalHitsLanded(stateRef.current.totalHitsLanded);
                }

                // Crimson & Silver bone impact sparks
                for (let i = 0; i < 14; i++) {
                  const angle = Math.random() * Math.PI * 2;
                  const speed = Math.random() * 5 + 2.5;
                  stateRef.current.particles.push({
                    id: `keysi_headbutt_${Math.random()}`,
                    x: target.x,
                    y: target.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    radius: Math.random() * 3 + 1.5,
                    color: i % 2 === 0 ? '#ef4444' : '#e2e8f0',
                    alpha: 1.0,
                    life: 0,
                    maxLife: 30,
                    type: 'spark'
                  });
                }

                if (!target.isPlayer && dummyBehavior === 'test_ai') {
                  target.health = target.maxHealth;
                  target.isDead = false;
                  target.vx = 0;
                  target.vy = 0;
                } else if (target.health <= 0) {
                  target.health = 0;
                  target.isDead = true;
                  triggerKOCinematic(player, target);
                }
              }
            }
            if (player.keysiClinchTimer === 0) {
              player.keysiClinchStage = null;
              player.keysiClinchTarget = null;
              player.strikeCooldown = 0;
              player.lightCooldown = 0;
              syncCombatStatesToUI();
            }
          }
        }
      }

      // Keysi Dash Interception / Collision Check (Player)
      if (player.isDashing && player.styleId === 'keysi' && dummy && !dummy.isDead) {
        const dist = Math.hypot(dummy.x - player.x, dummy.y - player.y);
        if (dist <= player.radius + dummy.radius + 22) {
          player.keysiM2Primed = true; // Passive still applies!
          const farThreshold = player.radius + dummy.radius + 80;
          const wasFarDistanced = (player.dashStartDist || 0) > farThreshold;
          if (wasFarDistanced) {
            player.isDashing = false;
            player.dashProgress = 0;
            player.vx = 0;
            player.vy = 0;
            soundManager.playRollTick();
            spawnFloatingText(player.x, player.y - 30, 'POCKET INTERCEPT (CLINCH PRIMED!)', '#ef4444');
            for (let i = 0; i < 6; i++) {
              const angle = Math.random() * Math.PI * 2;
              stateRef.current.particles.push({
                id: `keysi_dash_col_${Math.random()}`,
                x: (player.x + dummy.x) / 2,
                y: (player.y + dummy.y) / 2,
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3,
                radius: 2,
                color: i % 2 === 0 ? '#ef4444' : '#94a3b8',
                alpha: 1.0,
                life: 0,
                maxLife: 15,
                type: 'spark'
              });
            }
          } else if (!player.keysiCloseDashPrimed) {
            player.keysiCloseDashPrimed = true;
            soundManager.playRollTick();
            spawnFloatingText(player.x, player.y - 30, 'POCKET SLIP (CLINCH PRIMED!)', '#ef4444');
            for (let i = 0; i < 6; i++) {
              const angle = Math.random() * Math.PI * 2;
              stateRef.current.particles.push({
                id: `keysi_dash_col_close_${Math.random()}`,
                x: (player.x + dummy.x) / 2,
                y: (player.y + dummy.y) / 2,
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3,
                radius: 2,
                color: i % 2 === 0 ? '#ef4444' : '#94a3b8',
                alpha: 1.0,
                life: 0,
                maxLife: 15,
                type: 'spark'
              });
            }
          }
        }
      }

      // Armor block shield recharge when not blocking
      if (player.armorRegenLockout && player.armorRegenLockout > 0) {
        player.armorRegenLockout--;
      } else if (!player.isBlocking && (player.armorBreakTime || 0) <= 0) {
        if ((player.armorHP || 0) < 18) {
          // Calculate height-dependent regen interval in frames (0.8s at 68 in, max shortest 0.4s)
          const seconds = Math.max(0.4, 0.8 + (player.baseHeight - 68) * 0.05);
          const intervalFrames = Math.round(seconds * 60);

          player.armorRegenTimer = (player.armorRegenTimer || 0) + 1;
          if (player.armorRegenTimer >= intervalFrames) {
            player.armorHP = Math.min(18, (player.armorHP || 0) + 1);
            player.armorRegenTimer = 0;
            syncCombatStatesToUI();
          }
        } else {
          player.armorRegenTimer = 0;
        }
      } else {
        player.armorRegenTimer = 0;
      }

      // Steer movement and facing towards mouse pointer or lock-on target
      const isMobileActive = ((settings.touchControlMode ?? 'virtual') === 'virtual') && (settings.showVirtualControls === 'always' || (settings.showVirtualControls === 'auto' && isTouchDevice));

      // Dash timings decay
      if (player.dashCooldown && player.dashCooldown > 0) {
        player.dashCooldown--;
      }
      if (player.dashProgress && player.dashProgress > 0 && player.cqcM2Stage !== 'dash') {
        player.dashProgress--;

        // Spawn afterimages during dash
        if (player.dashProgress % 3 === 0) {
          stateRef.current.particles.push({
            id: `player_dash_ghost_${Math.random()}`,
            x: player.x,
            y: player.y,
            vx: 0,
            vy: 0,
            radius: player.radius,
            color: player.styleId === 'basic' ? '#00e5ff' : player.color,
            alpha: 0.40,
            life: 0,
            maxLife: 14,
            type: 'afterimage',
            facingAngle: player.facingAngle
          } as any);
        }

        if (player.styleId === 'basic') {
          const frame = 48 - player.dashProgress;
          const styleObj = FIGHTING_STYLES.find(s => s.id === 'basic') || FIGHTING_STYLES[0];
          const styleSpeed = styleObj.statModifiers?.speed ?? 1.15;
          let forwardSpeed = 1.95 * styleSpeed; // Slower, tightly paced dash momentum with longer sway path
          if (player.concussTime && player.concussTime > 0) forwardSpeed *= 0.40;

          const lateralAmp = 2.4 * Math.sin((frame / 12) * Math.PI);
          const moveAngle = player.dashAngle !== undefined ? player.dashAngle : player.facingAngle;

          // When Flow Boxing dashes backward, maintain front facing towards lock-on opponent or target
          if ((settings.cameraMode === 'lockon_swipe' || isMobileActive) && dummy && !dummy.isDead) {
            player.facingAngle = Math.atan2(dummy.y - player.y, dummy.x - player.x);
          }

          const fX = Math.cos(moveAngle);
          const fY = Math.sin(moveAngle);
          const pX = Math.cos(moveAngle + Math.PI / 2);
          const pY = Math.sin(moveAngle + Math.PI / 2);

          player.vx = fX * forwardSpeed + pX * lateralAmp;
          player.vy = fY * forwardSpeed + pY * lateralAmp;
          player.vx *= 0.94;
          player.vy *= 0.94;
        } else {
          // Dash has progressive friction
          player.vx *= 0.91;
          player.vy *= 0.91;
        }

        if (player.dashProgress === 0) {
          player.isDashing = false;
          player.dashAngle = undefined; // Reset dashAngle so it never leaks into attacks
          player.postDashAttackLockout = 18; // Section 2.8: 0.30s Post-Dash Attack Lockout
          if (player.styleId === 'basic') {
            player.flowStrikerBuffTimer = 18; // [ Striker Buff ]: Exiting Pendulum Dash grants 0.3s +10% M1 DMG
            spawnFloatingText(player.x, player.y - 30, 'STRIKER BUFF (+10%)', '#00e5ff');
          } else {
            player.vx *= 0.5;
            player.vy *= 0.5;
          }
        }
      }

      // WASD / Arrow Key / Joystick detection for movement
      const keys = state.keysPressed || {};
      let moveX = 0;
      let moveY = 0;

      const isLockedFromMoving = !!(
        state.cinematicZoomActive ||
        player.isDead ||
        state.matchEnded ||
        (dummy && dummy.isDead) ||
        player.stunTime > 0 ||
        player.parriedStun > 0 ||
        player.capoeiraExhausted ||
        (player.kyokushinSpinOutTimer && player.kyokushinSpinOutTimer > 0) ||
        (player.hitMovementLock && player.hitMovementLock > 0) ||
        player.aikiSlamStage ||
        player.aikiSlamUninterruptible ||
        (player.aikiLockoutTimer && player.aikiLockoutTimer > 0) ||
        (player.aikiSpinDownTimer && player.aikiSpinDownTimer > 0) ||
        isImpactFrameActive()
      );

      if (!isLockedFromMoving) {
        if (isMobileActive && state.joystickX !== undefined && state.joystickY !== undefined && (state.joystickX !== 0 || state.joystickY !== 0)) {
          moveX = state.joystickX;
          moveY = state.joystickY;
        } else {
          if (keys['KeyW'] || keys['ArrowUp']) moveY -= 1;
          if (keys['KeyS'] || keys['ArrowDown']) moveY += 1;
          if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
          if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;
        }
      } else {
        moveX = 0;
        moveY = 0;
        player.isDashing = false;
        player.dashProgress = 0;
      }

      // In Lock-On mode: Movement depends on where you're facing!
      // Forward moves in facing direction, Backward backpedals, Left/Right strafes
      if (settings.cameraMode === 'lockon_swipe' && (moveX !== 0 || moveY !== 0)) {
        const F = player.facingAngle;
        const forward = -moveY; // Up/W is forward relative to character facing
        const strafe = moveX;   // Right/D is strafe right
        moveX = forward * Math.cos(F) - strafe * Math.sin(F);
        moveY = forward * Math.sin(F) + strafe * Math.cos(F);
      }

      // Facing angle direction (bypassed during Kyokushin spin-out, CQC M2, and Keysi clinch):
      const isCqcActive = !!player.cqcM2Stage || (player.styleId === 'cqc' && ((player.heavyWindup || 0) > 0));
      const isKeysiClinchActive = !!player.keysiClinchStage;
      if (isKeysiClinchActive) {
        const target = player.keysiClinchTarget || (dummy && !dummy.isDead ? dummy : null);
        if (target && !target.isDead) {
          player.facingAngle = Math.atan2(target.y - player.y, target.x - player.x);
        }
      } else if (isCqcActive) {
        const target = player.cqcLockedTarget || (dummy && !dummy.isDead ? dummy : null);
        if (target && !target.isDead) {
          const aimAngle = Math.atan2(target.y - player.y, target.x - player.x);
          player.facingAngle = aimAngle;
          player.cqcLockedAngle = aimAngle;
        } else if (player.cqcLockedAngle !== undefined) {
          player.facingAngle = player.cqcLockedAngle;
        }
      } else if (!player.kyokushinSpinOutTimer || player.kyokushinSpinOutTimer <= 0) {
        let targetAngle = player.facingAngle;
        if (settings.cameraMode === 'lockon_swipe') {
          // In Character Lock-On mode:
          // The character locks on to the opponent in front (or maintains locked angle if opponent absent)
          if (dummy && !dummy.isDead) {
            targetAngle = Math.atan2(dummy.y - player.y, dummy.x - player.x);
          } else {
            targetAngle = player.facingAngle;
          }
        } else if (isMobileActive) {
          // Smart lock-on targeting: if dummy exists and is alive, auto face it during fight.
          // Otherwise, face movement direction.
          if (dummy && !dummy.isDead) {
            const dxToDummy = dummy.x - player.x;
            const dyToDummy = dummy.y - player.y;
            targetAngle = Math.atan2(dyToDummy, dxToDummy);
          } else if (moveX !== 0 || moveY !== 0) {
            targetAngle = Math.atan2(moveY, moveX);
          }
        } else if (matchData?.isAiVsAiSpectator) {
          // SPECTATOR MODE DEDICATED LOCK-ON:
          // Left AI (player) locks onto Right AI (dummy) instead of human mouse cursor
          if (dummy && !dummy.isDead) {
            const dxToDummy = dummy.x - player.x;
            const dyToDummy = dummy.y - player.y;
            targetAngle = Math.atan2(dyToDummy, dxToDummy);
          }
        } else {
          // Normal mouse-based continuous steering
          const viewCenterX = state.width / 2;
          const viewCenterY = state.height / 2;
          const worldMouseX = state.mouseX - viewCenterX + player.x;
          const worldMouseY = state.mouseY - viewCenterY + player.y;
          const dx = worldMouseX - player.x;
          const dy = worldMouseY - player.y;
          targetAngle = Math.atan2(dy, dx);
        }

        // Apply universal steering physics: clamped angular turn rate, dash override, 0.3s hit-stun steering lock
        updateFighterSteering(player, targetAngle);
      }

      const hasMoveInput = moveX !== 0 || moveY !== 0;

      // Universal Stamina Engine & Sprint State Update
      const isSprintKeyHeld = !!(keys['ShiftLeft'] || keys['ShiftRight'] || keys['KeyShift'] || keys['Shift']);
      const sprintRes = updateFighterStaminaAndTimers(player, hasMoveInput, isSprintKeyHeld, state.infiniteStamina);

      if (dummy && !dummy.isDead) {
        const dummyHasMove = Math.abs(dummy.vx) > 0.05 || Math.abs(dummy.vy) > 0.05;
        updateFighterStaminaAndTimers(dummy, dummyHasMove, !!dummy.isSprinting, state.infiniteAIStamina || state.infiniteStamina);
      }

      const canMoveDuringWindup = player.styleId === 'shotokan' && player.heavyWindup > 0;
      const isCqcBusy = player.styleId === 'cqc' && (player.cqcM2Stage === 'windup' || player.cqcM2Stage === 'dash' || player.cqcM2Stage === 'assault');
      const isKeysiBusy = !!player.keysiClinchStage;

      // Move player if WASD is pressed, and not charging heavy / staggered (except Shotokan which can move during heavy)
      const isPendulumDashing = player.styleId === 'basic' && !!(player.isDashing || (player.dashProgress && player.dashProgress > 0));
      if (hasMoveInput && !isPendulumDashing && ((player.heavyWindup || 0) <= 0 || canMoveDuringWindup) && !isCqcBusy && !isKeysiBusy && (player.armorBreakTime || 0) <= 0 && (!player.kyokushinSpinOutTimer || player.kyokushinSpinOutTimer <= 0) && (!player.shellLockoutTimer || player.shellLockoutTimer <= 0)) {
        // Normal pace or block/shield slow-walk
        const playerMods = getHeightModifiers(player.baseHeight);
        const styleObj = FIGHTING_STYLES.find(s => s.id === player.styleId) || FIGHTING_STYLES[0];
        let styleSpeed = styleObj.statModifiers?.speed ?? 1.0;
        if (player.styleId === 'kyokushin') styleSpeed = 1.0; // Movement speed is unaffected by speed passive modifier
        const baseSpeed = BASE_MOVEMENT_SPEED * styleSpeed * sprintRes.speedMultiplier;
        let speedMult = 1.0;
        if (player.sluggerM2WhiffLockoutTimer && player.sluggerM2WhiffLockoutTimer > 0) speedMult *= 0.20; // -80% Movement Speed on Slugger M2 Whiff
        if (player.aikiM2ActiveWindow && player.aikiM2ActiveWindow > 0) speedMult *= 0.10; // -90% Movement Speed on Aikido M2 Active Window (0.10x crawl)
        if (player.aikiWhiffSlowTimer && player.aikiWhiffSlowTimer > 0) speedMult *= 0.30; // -70% Movement Speed on Aikido M2 Whiff (1.0s)
        if (player.concussTime && player.concussTime > 0) speedMult *= 0.40; // 60% movement speed slowdown
        if (player.crippleTime && player.crippleTime > 0) speedMult *= 0.85;
        if (player.keysiVulnerableTimer && player.keysiVulnerableTimer > 0) speedMult *= 0.40; // -60% speed penalty during Over-Extended
        if (player.keysiStaggerTimer && player.keysiStaggerTimer > 0) speedMult *= 0.70; // -30% speed penalty during Trauma Stagger

        let speed = player.isBlocking ? baseSpeed * 0.3 : baseSpeed;
        const isHeavyActive = player.fists.some(f => f.punchProgress > 0 && f.isHeavy);
        if (isHeavyActive) {
          if (player.styleId === 'shotokan') {
            speed *= 0.85; // High responsiveness (15% reduction) during back kick execution
          } else {
            speed *= 0.25; // 75% speed reduction during right click heavy punches
          }
        } else if (canMoveDuringWindup) {
          speed *= 0.85; // Move fluidly during the 180 spin windup
        }
        speed *= speedMult;

        // Normalize movement vector so diagonal isn't faster
        const moveLen = Math.sqrt(moveX * moveX + moveY * moveY);
        let normX = moveX / moveLen;
        let normY = moveY / moveLen;

        // Trauma Stagger chaotic lateral drift
        if (player.keysiStaggerTimer && player.keysiStaggerTimer > 0) {
          const driftAngle = (player.keysiStaggerTimer * 0.25);
          normX += Math.sin(driftAngle) * 0.25;
          normY += Math.cos(driftAngle) * 0.25;
          const driftLen = Math.hypot(normX, normY) || 1;
          normX /= driftLen;
          normY /= driftLen;
        }
        
        const force = BASE_MOVEMENT_FORCE * speedMult * styleSpeed * sprintRes.speedMultiplier;
        player.vx += normX * force;
        player.vy += normY * force;

        // Cap speed (while dashing, allow high burst speed, normal walk cap is speed)
        const maxAllowedSpeed = player.isDashing ? 18.0 : speed;
        const currentSpeed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
        if (currentSpeed > maxAllowedSpeed) {
          player.vx = (player.vx / currentSpeed) * maxAllowedSpeed;
          player.vy = (player.vy / currentSpeed) * maxAllowedSpeed;
        }
        player.vx *= 0.88;
        player.vy *= 0.88;
      } else {
        // Friction decay (Use smooth slide friction 0.94 during spinout or stun so knockback carries smoothly)
        const playerFriction = ((player.kyokushinSpinOutTimer && player.kyokushinSpinOutTimer > 0) || (player.stunTime && player.stunTime > 0)) ? 0.94 : 0.82;
        player.vx *= playerFriction;
        player.vy *= playerFriction;
      }

      // Attack strike cooldown decay
      if (player.strikeCooldown && player.strikeCooldown > 0) {
        player.strikeCooldown--;
      }
      if (player.lightCooldown && player.lightCooldown > 0) {
        let dec = 1;
        if (player.styleId === 'kickboxing' && player.kickboxingCadenceTimer && player.kickboxingCadenceTimer > 0) {
          // Cadence Opening: +20% Attack Speed (extra recovery tick every 5th frame)
          if (stateRef.current.gameTime % 5 === 0) dec = 2;
        }
        player.lightCooldown = Math.max(0, player.lightCooldown - dec);
      }
      if (player.kickboxingCadenceTimer && player.kickboxingCadenceTimer > 0) {
        player.kickboxingCadenceTimer--;
      }
      if (player.postureCd && player.postureCd > 0) {
        let decrement = (player.shellPostureBoostTimer && player.shellPostureBoostTimer > 0) ? 2 : 1;
        if (player.deflectiveCadenceTimer && player.deflectiveCadenceTimer > 0) {
          // Deflective Cadence (+30% Posture Regeneration speed for 8.0s)
          if (stateRef.current.gameTime % 3 === 0) decrement += 1;
        }
        player.postureCd = Math.max(0, player.postureCd - decrement);
        player.isPostureLocked = player.postureCd > 0;
      } else {
        player.isPostureLocked = false;
        // If posture resets or combo chain resets when not mid-punch, clear feint trap boost & reset momentum drag
        const isPunching = player.fists.some(f => f.isPunching || f.punchProgress > 0);
        if (!isPunching && player.comboStage === 0) {
          player.flowS3ParryBaited = false;
          player.sluggerM1WhiffDragCount = 0;
          player.sluggerWhiffedStages = [];
        }
      }
      if (player.shotokanRenZukiPending && (!player.lightCooldown || player.lightCooldown <= 0) && (!player.postureCd || player.postureCd <= 0)) {
        player.shotokanRenZukiPending = false;
        if (player.comboStage === 2 && !player.stunTime && !player.isDead) {
          triggerPlayerLightAttack();
        }
      }
      // Hold M1 buffered / continuous attack execution:
      if (!isLockedFromMoving && state.isLMBHeld && (!player.lightCooldown || player.lightCooldown <= 0) && (!player.postureCd || player.postureCd <= 0) && !player.isPostureLocked && (!player.strikeCooldown || player.strikeCooldown <= 0) && !player.isBlocking && (player.stunTime || 0) <= 0 && (player.armorBreakTime || 0) <= 0 && !player.capoeiraExhausted && (!player.postBlockAttackLockout || player.postBlockAttackLockout <= 0) && (!player.shellLockoutTimer || player.shellLockoutTimer <= 0)) {
        const isHeavyPunching = player.fists.some(f => (f.isPunching || f.punchProgress > 0.05) && f.isHeavy);
        const isHeavyExecuting = (player.heavyWindup || 0) > 0 || isHeavyPunching || (player.ashiharaM2Stage && player.ashiharaM2Stage > 0) || (player.cqcM2Stage && player.cqcM2Stage !== null) || !!player.keysiClinchStage;
        const isLightPunching = player.fists.some(f => (f.isPunching || f.punchProgress > 0.05) && !f.isHeavy) && (!player.shellRetractionHoldTimer || player.shellRetractionHoldTimer <= 0);
        if (!isHeavyExecuting && !isLightPunching) {
          triggerPlayerLightAttack();
          player.lightCooldown = Math.max(player.lightCooldown || 0, 18);
        }
      }
      if (player.heavyCooldown && player.heavyCooldown > 0) {
        player.heavyCooldown--;
      }
      if (player.postS4HeavyLockout && player.postS4HeavyLockout > 0) {
        player.postS4HeavyLockout--;
      }
      if (player.superCrippleTimer && player.superCrippleTimer > 0) {
        player.superCrippleTimer--;
      }
      if (player.kyokushinSpiralTimer && player.kyokushinSpiralTimer > 0) {
        player.kyokushinSpiralTimer--;
      }
      if (player.boneFractureTimer && player.boneFractureTimer > 0) {
        player.boneFractureTimer--;
      }
      if (player.keysiStaggerTimer && player.keysiStaggerTimer > 0) {
        player.keysiStaggerTimer--;
      }
      if (player.keysiVulnerableTimer && player.keysiVulnerableTimer > 0) {
        player.keysiVulnerableTimer--;
        if (player.keysiVulnerableTimer === 0 && player.keysiQueuedWhiffCd && player.keysiQueuedWhiffCd > 0) {
          player.heavyCooldown = player.keysiQueuedWhiffCd;
          player.keysiQueuedWhiffCd = 0;
        }
      }
      if (player.tkdConfusionTimer && player.tkdConfusionTimer > 0) {
        player.tkdConfusionTimer--;
        // Intermittent motion blur pulses during Confusion State (3.0s)
        if (player.tkdConfusionTimer % 45 === 0) {
          stateRef.current.visionBlurTime = 12;
        }
      }
      if (player.deflectiveCadenceTimer && player.deflectiveCadenceTimer > 0) {
        player.deflectiveCadenceTimer--;
      }
      if (player.tkdLeadStaggerTimer && player.tkdLeadStaggerTimer > 0) {
        player.tkdLeadStaggerTimer--;
      }

      // Apply coordinates displacement
      player.x += player.vx;
      player.y += player.vy;

      // Bound player inside octagon ring
      const radiusLim = (arenaSize / 2) - player.radius - 8;
      const centerDist = Math.sqrt((player.x - (arenaSize / 2)) ** 2 + (player.y - (arenaSize / 2)) ** 2);
      if (centerDist > radiusLim) {
        const angle = Math.atan2(player.y - (arenaSize / 2), player.x - (arenaSize / 2));
        player.x = (arenaSize / 2) + radiusLim * Math.cos(angle);
        player.y = (arenaSize / 2) + radiusLim * Math.sin(angle);
        player.vx *= -0.3; // bounce
        player.vy *= -0.3;
      }

      // Fists visuals tracking animation
      const playerMods = getHeightModifiers(player.baseHeight);
      player.fists.forEach(fist => {
        const stage = player.comboStage === 0 ? 3 : (player.comboStage - 1);
        const isShinKick = player.styleId === 'muay_thai' && fist.punchType === 'left' && stage === 3;

        let basePunchSpeed = 0.17;
        let baseReturnSpeed = 0.12;
        
        if (fist.isKineticCounter) {
          basePunchSpeed = 0.18; // Calibrated rapid execution for Kinetic Counter
          baseReturnSpeed = 0.11;
        } else if (isShinKick) {
          basePunchSpeed = 0.035; // Calibrated heavy Thai shin kick
          baseReturnSpeed = 0.11;
        } else if (fist.isHeavy) {
          if (player.styleId === 'street_boxing') {
            basePunchSpeed = 0.1381; // Standardized Execution Speed
            baseReturnSpeed = 0.12; // Calibrated Snappy Flurry Retraction
          }
          else if (player.styleId === 'slugger') {
            let execMult = 1.0;
            if (player.boneFractureTimer && player.boneFractureTimer > 0) {
              execMult *= 0.60; // Bone Fracture: -40% Execution Speed
            }
            basePunchSpeed = 0.075 * 0.68 * execMult;
            baseReturnSpeed = 0.055 * 0.68 * execMult;
          }
          else if (player.styleId === 'capoeira') { basePunchSpeed = 0.075; baseReturnSpeed = 0.055; }
          else if (player.styleId === 'shotokan') { basePunchSpeed = 0.09; baseReturnSpeed = 0.07; }
          else if (player.styleId === 'ashihara') { basePunchSpeed = 0.085; baseReturnSpeed = 0.065; }
          else if (player.styleId === 'kyokushin') { 
            basePunchSpeed = 0.20; // 5 Frames Explosive Piston Thrust (~0.08s)
            baseReturnSpeed = 0.10; // 10 Frames Deliberate Clean Revert
          }
          else if (player.styleId === 'keysi') { basePunchSpeed = 0.14; baseReturnSpeed = 0.10; }
          else if (player.styleId === 'kickboxing') {
            const isSeq2 = (fist as any)?.kickboxingSeq2 || player.kickboxingIsSeq2;
            let execMult = 0.95; // Base Attack Execution: 0.95x
            if (player.kickboxingCadenceTimer && player.kickboxingCadenceTimer > 0) {
              execMult *= 1.15; // Cadence Opening: +15% Attack Execution
            }
            if (isSeq2) {
              basePunchSpeed = 0.33 * execMult; // Teep Thrust
              baseReturnSpeed = 0.10 * execMult; // 10 Frames over-extension
            } else {
              basePunchSpeed = 0.33 * execMult; // Short Hook Execution
              baseReturnSpeed = 0.16 * execMult; // 6 Frames over-swing
            }
          }
          else if (player.styleId === 'boxing_shell') {
            basePunchSpeed = 0.22; // Quick shoulder roll turn (~4-5 frames)
            baseReturnSpeed = 0.18; // Quick snap back recovery (~5-6 frames)
          }
          else if (player.styleId === 'street_taekwondo') {
            basePunchSpeed = 0.1667; // 6 Frames (~0.10s) downward snap (100% standard speed)
            baseReturnSpeed = 0.0333; // 30 Frames (0.50s DS) decelerating recovery (100% standard speed)
          }
          else { basePunchSpeed = 0.08; baseReturnSpeed = 0.06; }
        } else {
          const fistStage = fist.comboStage !== undefined ? fist.comboStage : (player.comboStage === 0 ? 3 : Math.max(0, player.comboStage - 1));
          const m1 = getStyleM1Speeds(player.styleId, fistStage);
          basePunchSpeed = m1.punchSpeed;
          baseReturnSpeed = m1.returnSpeed;
          if (player.styleId === 'slugger') {
            let execMult = 1.0;
            if (player.sluggerM1WhiffDragCount && player.sluggerM1WhiffDragCount > 0) {
              execMult *= Math.max(0.30, 1.0 - (0.20 * player.sluggerM1WhiffDragCount));
            }
            if (player.boneFractureTimer && player.boneFractureTimer > 0) {
              execMult *= 0.60; // Bone Fracture: -40% Execution Speed
            }
            basePunchSpeed *= execMult;
            baseReturnSpeed *= execMult;
          } else if (player.styleId === 'street_boxing') {
            // Street Boxing strictly adheres to universal execution speed baseline
          } else if (player.styleId === 'boxing_shell') {
            const stage = fist.comboStage !== undefined ? fist.comboStage : (player.comboStage === 0 ? 3 : player.comboStage - 1);
            if (stage === 0 || stage === 1) {
              basePunchSpeed = m1.punchSpeed * 1.50; // Snapping Lead Execution: 50% faster Execution Speed for S1 & S2 (~66.7ms / ~4.0f)
              baseReturnSpeed = m1.returnSpeed * 1.50;
            } else {
              basePunchSpeed = m1.punchSpeed; // Iron Boxing: 100.0ms (~6.0 frames)
              baseReturnSpeed = m1.returnSpeed;
            }
          } else if (player.styleId === 'kickboxing') {
            let execMult = 0.95; // Base Attack Execution: 0.95x
            if (player.kickboxingCadenceTimer && player.kickboxingCadenceTimer > 0) {
              execMult *= 1.15; // Cadence Opening: +15% Attack Execution
            }
            basePunchSpeed *= execMult;
            baseReturnSpeed *= execMult;
          }
        }

        if (fist.isPunching) {
          if (fist.punchProgress === 0) {
            fist.hasHit = false;
            fist.punchTimeSec = 0;
            fist.lingerTimer = 0;
            fist.isLingerActive = false;

            // SECTION 1.4: Opposing Torque Transition
            // If the opposing limb was holding in Chamber Linger (or still extended),
            // cancel its linger hold so it smoothly retracts simultaneously as a kinetic counterweight!
            player.fists.forEach(otherFist => {
              if (otherFist.id !== fist.id && otherFist.lingerTimer && otherFist.lingerTimer > 0) {
                otherFist.lingerTimer = 0;
                otherFist.isLingerActive = false;
              }
            });

            // SECTION 1.4: Zero Double-Travel
            // Capture current 2D canvas coordinates dynamically for the 3-frame slerp decouple
            if (fist.currentSpatialX !== undefined && fist.currentSpatialY !== undefined && (!fist.blendTimer || fist.blendTimer <= 0)) {
              fist.blendStartX = fist.currentSpatialX;
              fist.blendStartY = fist.currentSpatialY;
              fist.blendTimer = 3;
            }
          }
          fist.punchTimeSec = (fist.punchTimeSec || 0) + (1 / 60);
          const momentumMultiplier = 1.0;
          // SECTION 1.17: Pure Style Execution - Decoupled from height scaling
          const punchSpeed = basePunchSpeed * momentumMultiplier;
          fist.punchProgress += punchSpeed;
          if (player.styleId === 'street_taekwondo' && fist.isHeavy && fist.isPunching && Math.random() < 0.65) {
            const legDist = player.radius * 1.85 * (1.35 * Math.sin(fist.punchProgress * Math.PI * 0.5));
            const chopProg = Math.sin(fist.punchProgress * Math.PI * 0.5);
            const localChopAngle = 1.57 - chopProg * (1.57 - (-0.26)); // Sweeps from side flank to far and a little further
            const chopAngle = player.facingAngle + localChopAngle;
            state.particles.push({
              id: `tkd_m2_trail_${Math.random()}`,
              x: player.x + Math.cos(chopAngle) * legDist,
              y: player.y + Math.sin(chopAngle) * legDist,
              vx: (Math.random() - 0.5) * 1.5,
              vy: (Math.random() - 0.5) * 1.5,
              radius: Math.random() * 2.5 + 1.5,
              color: '#FFD600',
              alpha: 0.95,
              life: 0,
              maxLife: 16,
              type: 'spark'
            });
          }
          if (fist.punchProgress >= 1.0) {
            fist.punchProgress = 1.0;
            fist.isPunching = false;
            fist.lingerTimer = 0;
            fist.isLingerActive = false;
            if (player.styleId === 'street_taekwondo' && fist.comboStage === 0 && !fist.isHeavy) {
              if (player.tkdDoubleTapQueued || state.isLMBHeld) {
                player.tkdChamberRetracting = true;
              }
            }
          }
        } else if (fist.punchProgress > 0) {
          if (player.styleId === 'street_taekwondo' && fist.comboStage === 0 && !fist.isHeavy && player.tkdChamberRetracting) {
            // S1 ➔ S2 Quick Chamber Retraction toward ~40% extension
            const snapRetDelta = Math.max(0.06, baseReturnSpeed * 2.5);
            fist.punchProgress -= snapRetDelta;
            if (fist.punchProgress <= 0.40) {
              fist.punchProgress = 0.40;
              player.tkdChamberRetracting = false;
              player.tkdDoubleTapQueued = false;
              // IMMEDIATE S2 LAUNCH from cocked chamber:
              fist.isPunching = true;
              fist.comboStage = 1;
              fist.hasHit = false;
              fist.punchTimeSec = 0;
              player.comboStage = 2; // Next will be S3
              player.lightCooldown = 0; // Zero input lag
              soundManager.playDash();
            }
            return;
          }
          if (player.styleId === 'kyokushin' && fist.isHeavy && (player.kyokushinM2PeakHoldTimer || 0) > 0) {
            player.kyokushinM2PeakHoldTimer!--;
            fist.punchProgress = 1.0; // Rigid Lock: Freeze solid at peak! Zero spring-back or rubber-banding
            return;
          }
          // SECTION 1.18: Duration Speed (DS) Matrix & Asynchronous Combo Acceleration (2.5x)
          fist.punchTimeSec = (fist.punchTimeSec || 0) + (1 / 60);
          const isComboAccelerating = player.fists.some(other => other.id !== fist.id && other.isPunching);
          const isExempt = !fist.isHeavy && ((player.styleId === 'basic' && fist.comboStage === 2) || (player.styleId === 'aikido' && fist.comboStage === 2));
          const fistStage = fist.comboStage !== undefined ? fist.comboStage : (player.comboStage === 0 ? 3 : Math.max(0, player.comboStage - 1));
          const returnDelta = calculateAsymmetricalRetractionDelta(fist.punchProgress, baseReturnSpeed, 1.0, isComboAccelerating, isExempt, player.styleId, fistStage, fist.isHeavy);
          fist.punchProgress -= returnDelta;
          if (fist.punchProgress <= 0.01) {
            fist.punchProgress = 0;
            fist.lingerTimer = 0;
            fist.isLingerActive = false;
            fist.punchTimeSec = 0;
            if (player.styleId === 'kyokushin' && fist.isHeavy) {
              player.kyokushinM2PeakHoldTimer = 0;
            }
            if (!fist.isHeavy) {
              player.postM1BlockLockout = 9; // Section 2.8: 0.15s Block Lockout (CanBlock = false)
            }
            if (player.styleId === 'slugger' && !fist.isHeavy) {
              if ((player.comboResetTimer || 0) < 110) {
                player.comboResetTimer = 110;
              }
              if (!fist.hasHit) {
                const wStage = fist.comboStage !== undefined ? fist.comboStage : 0;
                if (!player.sluggerWhiffedStages) player.sluggerWhiffedStages = [];
                if (!player.sluggerWhiffedStages.includes(wStage)) {
                  player.sluggerWhiffedStages.push(wStage);
                  player.sluggerM1WhiffDragCount = Math.min(3, player.sluggerWhiffedStages.length);
                  spawnFloatingText(player.x, player.y - 30, `MOMENTUM DRAG (-${player.sluggerM1WhiffDragCount * 20}%)`, '#f59e0b');
                }
              }
            }
            if (player.styleId === 'capoeira' && !fist.hasHit && !player.capoeiraWhiffBonusActive) {
              player.capoeiraWhiffBonusActive = true;
              spawnFloatingText(player.x, player.y - 30, 'FLOW RECOVERY READY!', '#ca8a04');
            }
            if (player.styleId === 'basic' && !fist.isHeavy) {
              if (fist.comboStage === 0 && !fist.hasHit) {
                player.flowS1Whiffed = true;
              } else if (fist.comboStage === 1) {
                player.flowS2HasIFrames = false;
              } else if (fist.comboStage === 3) {
                // S4 completed / missed: remove boost
                player.flowS3ParryBaited = false;
              }
            }
            if (fist.isHeavy) {
              if (player.styleId === 'street_boxing') {
                const stage = player.streetBoxingM2Stage || 1;
                if (stage === 1) {
                  if (fist.hasHit) {
                    player.streetBoxingM2NextTimer = 3;
                  } else {
                    player.streetBoxingM2Stage = 0;
                    player.streetBoxingM2Hits = 0;
                    player.streetBoxingUnbreakable = false;
                    applyHeavyWhiffPenalty(player);
                  }
                } else if (stage === 2) {
                  player.streetBoxingM2NextTimer = 3;
                } else {
                  player.streetBoxingM2Stage = 0;
                  player.streetBoxingUnbreakable = false;
                  if (!fist.hasHit && (player.streetBoxingM2Hits || 0) < 3) {
                    applyHeavyWhiffPenalty(player);
                  }
                }
              } else if (player.styleId === 'kickboxing') {
                const isSeq2 = (fist as any)?.kickboxingSeq2 || player.kickboxingIsSeq2;
                if (!isSeq2) {
                  // S1 finished its hook (whether hit or missed) - queue S2 after 0.15s (9 frames)
                  if (!player.kickboxingAutoSeq2Timer) {
                    player.kickboxingAutoSeq2Timer = 9;
                  }
                } else {
                  // S2 finished
                  if (!fist.hasHit) {
                    applyHeavyWhiffPenalty(player);
                  }
                  player.kickboxingIsSeq2 = false;
                }
              } else {
                if (!fist.hasHit) {
                  applyHeavyWhiffPenalty(player);
                }
              }
              fist.isHeavy = false;
              player.attackLockedAngle = undefined; // RESET THE LOCKED ANGLE!
            }
            fist.isKineticCounter = false;
            fist.hasHit = false; // Reset hit flag when punch is fully retracted
          }
        } else {
          fist.punchProgress = 0;
          if (fist.isHeavy) {
            if (player.styleId === 'street_boxing') {
              if (!fist.hasHit && (player.streetBoxingM2Hits || 0) === 0) {
                applyHeavyWhiffPenalty(player);
              }
              player.streetBoxingM2Stage = 0;
              player.streetBoxingUnbreakable = false;
            } else if (!fist.hasHit) {
              applyHeavyWhiffPenalty(player);
            }
            fist.isHeavy = false;
            player.attackLockedAngle = undefined; // RESET THE LOCKED ANGLE!
          }
          fist.isKineticCounter = false;
          fist.hasHit = false;
        }
      });

      // Synchronize Kyokushin Left Arm counterbalance motion with Right Fist M2
      if (player.styleId === 'kyokushin') {
        const rf = player.fists.find(f => f.punchType === 'right');
        const lf = player.fists.find(f => f.punchType === 'left');
        if (rf && (rf.isHeavy || (player.kyokushinM2PeakHoldTimer || 0) > 0) && lf) {
          lf.punchProgress = rf.punchProgress;
          lf.isPunching = rf.isPunching;
          lf.hasHit = true; // Strictly disabled hitbox
        }
      }
    }
  };
