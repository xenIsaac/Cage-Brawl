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

export const updateDummyPhysics = (
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
    syncCombatStatesToUI = () => {},
    executeDummyHeavyAttack = () => {},
    userEmail = 'anon',
    triggerKOCinematic = () => {},
    roundParriesLandedRef = { current: 0 },
    setTotalParries = () => {},
    matchParriesLandedRef = { current: 0 },
    QuestTracker = { trackEvent: () => {} },
  } = context;

  const finalizeKickboxingM2Cooldown = (f: any) => finalizeKickboxingM2CooldownHelper(f, spawnFloatingText, soundManager);
  const applyHeavyWhiffPenalty = (f: any) => applyHeavyWhiffPenaltyHelper(f, spawnFloatingText, soundManager);
    // 3. Update Sparring Dummy Physics
    if (dummy && !dummy.isDead) {
      if (dummy.ashiharaRecoveryTimer && dummy.ashiharaRecoveryTimer > 0) {
        dummy.ashiharaRecoveryTimer--;
      }
      if (dummy.ashiharaParryLockout && dummy.ashiharaParryLockout > 0) {
        dummy.ashiharaParryLockout--;
      }
      if (dummy.parryLockoutTimer && dummy.parryLockoutTimer > 0) {
        dummy.parryLockoutTimer--;
      }

      // Dummy Heavy Windup timing
      if (dummy.heavyWindup && dummy.heavyWindup > 0) {
        dummy.heavyWindup--;
        if (dummy.styleId === 'street_taekwondo') {
          const maxW = dummy.maxHeavyWindup || 21;
          const wRatio = (maxW - dummy.heavyWindup) / maxW;
          dummy.tkdFeintWindowActive = wRatio >= 0.4286 && wRatio < 1.0;
        }
        if ((dummy.styleId === 'kickboxing' && dummy.kickboxingIsSeq2) || dummy.styleId === 'basic') {
          // Allow forward dash momentum
          if (dummy.styleId === 'basic' && dummy.attackLockedAngle !== undefined) {
            const dummyMods = getHeightModifiers(dummy.baseHeight);
            const forwardSpeed = 7.5 * dummyMods.speedFactor;
            dummy.vx = Math.cos(dummy.attackLockedAngle) * forwardSpeed;
            dummy.vy = Math.sin(dummy.attackLockedAngle) * forwardSpeed;
            dummy.facingAngle = dummy.attackLockedAngle;
          }
        } else {
          dummy.vx = 0;
          dummy.vy = 0;
        }

        if (dummy.heavyWindup === 0) {
          executeDummyHeavyAttack();
        }
      }

      if (dummy.damageFlashTime && dummy.damageFlashTime > 0) dummy.damageFlashTime--;
      if (dummy.superArmorFlashTime && dummy.superArmorFlashTime > 0) dummy.superArmorFlashTime--;
      if (dummy.cqcM2HitFlashTime && dummy.cqcM2HitFlashTime > 0) dummy.cqcM2HitFlashTime--;
      if (dummy.capoeiraDodgeFlashTime && dummy.capoeiraDodgeFlashTime > 0) dummy.capoeiraDodgeFlashTime--;

      // Concussion slow timer decay
      if (dummy.concussTime && dummy.concussTime > 0) dummy.concussTime--;

      if (dummy.stunTime && dummy.stunTime > 0) dummy.stunTime--;
      if (dummy.m2StunTimer && dummy.m2StunTimer > 0) {
        dummy.m2StunTimer--;
        if (!dummy.stunTime || dummy.stunTime <= 0) dummy.m2StunTimer = 0;
      }
      if (dummy.parriedStun && dummy.parriedStun > 0) dummy.parriedStun--;
      if (dummy.cqcAttackLockout && dummy.cqcAttackLockout > 0) dummy.cqcAttackLockout--;
      if (dummy.keysiAttackLockout && dummy.keysiAttackLockout > 0) dummy.keysiAttackLockout--;
      if (dummy.pensadorLungeWindow && dummy.pensadorLungeWindow > 0) dummy.pensadorLungeWindow--;
      if (dummy.hitSteeringLock && dummy.hitSteeringLock > 0) dummy.hitSteeringLock--;
      if (dummy.hitMovementLock && dummy.hitMovementLock > 0) dummy.hitMovementLock--;
      if (dummy.blockLockout && dummy.blockLockout > 0) {
        dummy.blockLockout--;
        dummy.isBlocking = false;
      }

      // Section 2.8 Timers decay & Delayed Momentum Stop
      if (dummy.lastHitBeforeDashTimer && dummy.lastHitBeforeDashTimer > 0) dummy.lastHitBeforeDashTimer--;
      if (dummy.postM1BlockLockout && dummy.postM1BlockLockout > 0) dummy.postM1BlockLockout--;
      if (dummy.postDashAttackLockout && dummy.postDashAttackLockout > 0) dummy.postDashAttackLockout--;
      if (dummy.dashWhiteFrameFlashTime && dummy.dashWhiteFrameFlashTime > 0) dummy.dashWhiteFrameFlashTime--;
      if (dummy.dashHitDelayedStopTimer && dummy.dashHitDelayedStopTimer > 0) {
        dummy.dashHitDelayedStopTimer--;
        if (dummy.dashHitDelayedStopTimer === 0) {
          dummy.vx = 0;
          dummy.vy = 0;
          dummy.isDashing = false;
          dummy.dashProgress = 0;
          dummy.postDashAttackLockout = 18;
          spawnFloatingText(dummy.x, dummy.y - 30, 'MOMENTUM HALTED!', '#ef4444');
        }
      }

      // Post-Block Action Delay decay & tracking
      if (dummy.postBlockAttackLockout && dummy.postBlockAttackLockout > 0) {
        dummy.postBlockAttackLockout--;
      }
      if (dummy.parryBlockGraceTimer && dummy.parryBlockGraceTimer > 0) {
        dummy.parryBlockGraceTimer--;
      }
      if (dummy.afterParryGraceTimer && dummy.afterParryGraceTimer > 0) {
        dummy.afterParryGraceTimer--;
      }
      if (dummy.blockUseResetTimer && dummy.blockUseResetTimer > 0) {
        dummy.blockUseResetTimer--;
        if (dummy.blockUseResetTimer <= 0) {
          dummy.blockUseCount = 0;
        }
      }
      if (dummy.wasBlocking && !dummy.isBlocking) {
        dummy.cqcWasBlockingAtHit4 = false;
        dummy.blockLockout = Math.max(dummy.blockLockout || 0, BLOCK_COOLDOWN_FRAMES);
        if ((dummy.parryFlashTime || 0) <= 0 && (dummy.parryBlockGraceTimer || 0) <= 0 && (!dummy.kyokushinSpinOutTimer || dummy.kyokushinSpinOutTimer <= 0)) {
          if ((dummy.postBlockAttackLockout || 0) <= 0) {
            dummy.postBlockAttackLockout = 6; // Section 2.8: 0.10s Post-Block Action Delay
          }
        } else if ((dummy.kyokushinSpinOutTimer || 0) > 0) {
          dummy.postBlockAttackLockout = 0;
        } else {
          dummy.postBlockAttackLockout = 0;
        }
      }
      dummy.wasBlocking = dummy.isBlocking;

      // Crippling slow timer decay
      if (dummy.crippleTime && dummy.crippleTime > 0) dummy.crippleTime--;
      if (dummy.shellLockoutTimer && dummy.shellLockoutTimer > 0) dummy.shellLockoutTimer--;
      if (dummy.shellSpinTimer && dummy.shellSpinTimer > 0) dummy.shellSpinTimer--;
      if (dummy.shellPostureBoostTimer && dummy.shellPostureBoostTimer > 0) dummy.shellPostureBoostTimer--;

      // Aikido dummy updates (Revisioned: 15s Reactive Slam Window, Active Parry Stance window, Whiff penalty)
      if (dummy.styleId === 'aikido') {
        if (dummy.aikiPassiveSlamCd && dummy.aikiPassiveSlamCd > 0) {
          dummy.aikiPassiveSlamCd--;
        }
        if (dummy.aikiSlamReactiveWindow && dummy.aikiSlamReactiveWindow > 0) {
          dummy.aikiSlamReactiveWindow--;
        }
        if (dummy.aikiM2ActiveWindow && dummy.aikiM2ActiveWindow > 0) {
          dummy.aikiM2ActiveWindow--;
          if (dummy.aikiM2ActiveWindow === 0) {
            // M2 Active Parry Whiffed!
            dummy.aikiM2Guarding = false;
            dummy.heavyCooldown = 420; // 7.0s Whiff CD
            dummy.aikiWhiffSlowTimer = 60; // 1.0s -70% movement slow
            dummy.strikeCooldown = Math.max(dummy.strikeCooldown || 0, 60); // 1.0s M1/M2/Parry lockout
            dummy.lightCooldown = Math.max(dummy.lightCooldown || 0, 60);
            dummy.parryLockoutTimer = Math.max(dummy.parryLockoutTimer || 0, 60);
            spawnFloatingText(dummy.x, dummy.y - 30, 'M2 WHIFF (-70% SPEED, 7.0s CD)', '#ef4444');
          }
        }
        if (dummy.aikiWhiffSlowTimer && dummy.aikiWhiffSlowTimer > 0) {
          dummy.aikiWhiffSlowTimer--;
        }
        if (dummy.aikiConfusionTimer && dummy.aikiConfusionTimer > 0) {
          dummy.aikiConfusionTimer--;
        }

        // Smooth Aikido S2 chamber curl/uncurl transition
        const dLeftFist = dummy.fists ? (dummy.fists.find(f => f.punchType === 'left') || dummy.fists[0]) : undefined;
        const dRightFist = dummy.fists ? (dummy.fists.find(f => f.punchType === 'right') || dummy.fists[1]) : undefined;
        const dLeftProg = dLeftFist ? dLeftFist.punchProgress : 0;
        const dRightProg = dRightFist ? dRightFist.punchProgress : 0;
        const dStage = dummy.comboStage === 0 ? 3 : ((dummy.comboStage || 1) - 1);
        const dTargetCurl = ((dummy.comboStage === 1 && dRightProg === 0) || (dLeftProg > 0 && (dStage === 1 || dLeftFist?.comboStage === 1))) ? 1.0 : 0.0;
        const dCurrentCurl = dummy.aikiCurlFactor !== undefined ? dummy.aikiCurlFactor : 0.0;
        const dCurlSpeed = 0.10;
        if (dCurrentCurl < dTargetCurl) {
          dummy.aikiCurlFactor = Math.min(dTargetCurl, dCurrentCurl + dCurlSpeed);
        } else if (dCurrentCurl > dTargetCurl) {
          dummy.aikiCurlFactor = Math.max(dTargetCurl, dCurrentCurl - dCurlSpeed);
        }
        if (dummy.aikiSlamStage) {
          dummy.vx = 0;
          dummy.vy = 0;
          dummy.aikiSlamUninterruptible = true;
          if (dummy.aikiSlamTimer && dummy.aikiSlamTimer > 0) {
            dummy.aikiSlamTimer--;
            // Total slam duration: 1.5s = 90 ticks at 60 FPS
            const progress = Math.min(1.0, Math.max(0, (90 - dummy.aikiSlamTimer) / 90));
            dummy.aikiSlamFrame = Math.floor(progress * 90);
            const target = dummy.aikiSlamTarget || player;
            if (target && !target.isDead) {
              target.vx = 0;
              target.vy = 0;
              target.aikiSlamUninterruptible = true;

              // Face each other directly; neither fighter moves during the slam
              const angleToTarget = Math.atan2(target.y - dummy.y, target.x - dummy.x);
              dummy.facingAngle = angleToTarget;
              target.facingAngle = angleToTarget + Math.PI;

              if (progress < 0.25) {
                // Phase 1: The Wrist Clamp & Mutual Lockout (0s - 0.375s)
                dummy.aikiSlamStage = 'clamp';
                target.aikiSlamVictimStage = 'clamp';
                target.aikiOverheadScale = 1.0;
              } else if (progress < 0.70) {
                // Phase 2: Leverage & Overhead Elevation (0.375s - 1.05s)
                dummy.aikiSlamStage = 'lift';
                target.aikiSlamVictimStage = 'airborne';
                const liftT = (progress - 0.25) / 0.45;
                // Elevate target pseudo-3D height smoothly
                target.aikiOverheadScale = 1.0 + 0.35 * Math.sin(liftT * Math.PI);
              } else if (!dummy.aikiSlamImpactDone) {
                // Phase 3: Impact & Detonation at ~1.05s
                dummy.aikiSlamImpactDone = true;
                dummy.aikiSlamStage = 'slam';
                target.aikiSlamVictimStage = 'downed';
                target.aikiOverheadScale = 1.0;

                // Flat Slam Damage (6.0 HP passive counter or 8.0 HP M2 counter)
                const slamDmg = dummy.aikiSlamDamage ?? 6.0;
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
                dummy.aikiSlamStage = 'slam';
                target.aikiSlamVictimStage = 'downed';
                target.aikiOverheadScale = 1.0;
              }
            }

            if (dummy.aikiSlamTimer === 0) {
              dummy.aikiSlamStage = null;
              dummy.aikiSlamTarget = null;
              dummy.aikiSlamFrame = undefined;
              dummy.aikiSlamBaseAngle = undefined;
              dummy.aikiSlamImpactDone = undefined;
              dummy.aikiSlamUninterruptible = false;
              if (target) {
                target.aikiSlamUninterruptible = false;
                target.aikiSlamVictimStage = null;
                target.aikiOverheadScale = 1.0;
              }
              dummy.aikiIsFreeSlam = false;
            }
          }
        }
      }

      // Capoeira dummy updates (exhaustion and stack regeneration)
      if (dummy.styleId === 'capoeira') {
        const dummyStacks = dummy.capoeiraDodgeStacks !== undefined ? dummy.capoeiraDodgeStacks : 3;
        
        // 1. Handle Exhaustion countdown
        if (dummy.capoeiraExhausted) {
          if (dummy.capoeiraExhaustTimer && dummy.capoeiraExhaustTimer > 0) {
            dummy.capoeiraExhaustTimer--;
            dummy.isBlocking = false; // force false
            if (dummy.capoeiraExhaustTimer === 0) {
              dummy.capoeiraExhausted = false;
              // Instantly restore 1 stack upon exiting exhaustion so they aren't defenseless
              dummy.capoeiraDodgeStacks = 1;
              dummy.capoeiraRegenTimer = 0;
              spawnFloatingText(dummy.x, dummy.y - 30, 'RECOVERED! (1/3 Stacks)', '#ca8a04');
              syncCombatStatesToUI();
            }
          }
        }
        
        // 2. Handle Stack Regeneration when not blocking, not exhausted, and stacks < 3
        if (!dummy.isBlocking && !dummy.capoeiraExhausted && dummyStacks < 3) {
          dummy.capoeiraRegenTimer = (dummy.capoeiraRegenTimer || 0) + 1;
          if (dummy.capoeiraRegenTimer >= 300) { // 5.0 seconds (300 frames)
            dummy.capoeiraDodgeStacks = dummyStacks + 1;
            dummy.capoeiraRegenTimer = 0;
            spawnFloatingText(dummy.x, dummy.y - 30, `STOCKED DODGE! (${dummy.capoeiraDodgeStacks}/3)`, '#16a34a');
            syncCombatStatesToUI();
          }
        } else if (dummyStacks === 3) {
          dummy.capoeiraRegenTimer = 0;
        }
      }

      // Block duration and parry visual flashing
      if (dummy.isBlocking && (dummy.armorBreakTime || 0) <= 0) {
        dummy.blockTimer = (dummy.blockTimer || 0) + 1;
      } else {
        dummy.blockTimer = 0;
      }

      if ((dummy.spinOutTimer && dummy.spinOutTimer > 0) || (dummy.kyokushinSpinOutTimer && dummy.kyokushinSpinOutTimer > 0)) {
        if (dummy.spinOutTimer) dummy.spinOutTimer--;
        if (dummy.kyokushinSpinOutTimer) dummy.kyokushinSpinOutTimer--;
        dummy.facingAngle += (Math.PI * 2) / 18; // Involuntary rapid 360° rotation in place for 0.3s (18 frames)
        dummy.isBlocking = false;
        dummy.heavyWindup = 0;
        dummy.fists.forEach(f => {
          f.isPunching = false;
          f.punchProgress = 0;
        });
        if ((!dummy.spinOutTimer || dummy.spinOutTimer === 0) && (!dummy.kyokushinSpinOutTimer || dummy.kyokushinSpinOutTimer === 0)) {
          dummy.postBlockAttackLockout = 27; // 0.45s Post-Block Action Delay AFTER downed slide
        }
      }

      if (dummy.aikiCentrifugalKnockbackTimer && dummy.aikiCentrifugalKnockbackTimer > 0) {
        dummy.aikiCentrifugalKnockbackTimer--;
      }

      if (dummy.kyokushinM2FreezeTimer && dummy.kyokushinM2FreezeTimer > 0) {
        dummy.kyokushinM2FreezeTimer--;
      }

      if (dummy.parryFlashTime && dummy.parryFlashTime > 0) {
        dummy.parryFlashTime--;
      }

      // Kickboxing Auto-Sequence 2 Timer (0.15s after S1 finishes / hits)
      if (dummy.kickboxingAutoSeq2Timer && dummy.kickboxingAutoSeq2Timer > 0) {
        dummy.kickboxingAutoSeq2Timer--;
        if (dummy.kickboxingAutoSeq2Timer === 0) {
          const dMods = getHeightModifiers(dummy.baseHeight);
          let exec = 0.95;
          if (dummy.kickboxingCadenceTimer && dummy.kickboxingCadenceTimer > 0) exec *= 1.15;
          dummy.heavyWindup = Math.round(9 / exec); // Rapid Chamber (scaled by execution speed)
          dummy.kickboxingIsSeq2 = true;
          dummy.kickboxingSeq2Ready = false;
          dummy.kickboxingSeq2Window = 0;
          dummy.strikeCooldown = 0;
          dummy.fists.forEach(f => {
            f.isPunching = false;
            f.punchProgress = 0;
            f.isHeavy = false;
            f.hasHit = false;
          });
          // S2 Lunges forward slightly to reach opponent
          dummy.vx += Math.cos(dummy.facingAngle) * 3.5;
          dummy.vy += Math.sin(dummy.facingAngle) * 3.5;
          spawnFloatingText(dummy.x, dummy.y - 30, 'RAPID CHAMBER...', '#ef4444');
        }
      }

      // SECTION 1.18 - FIX 2: Street Boxing M2 Flurry Auto-Burst State Machine (Dummy)
      if (tickStreetBoxingAutoBurst(dummy)) {
        // Micro-step to maintain pocket cling
        dummy.vx += Math.cos(dummy.facingAngle) * 2.0;
        dummy.vy += Math.sin(dummy.facingAngle) * 2.0;
        soundManager.playDash();
      }

      // Ashihara M2 3-Stage Sequence Progression (Dummy)
      if (dummy.styleId === 'ashihara') {
        if (dummy.ashiharaM2Stage === 2 && dummy.ashiharaM2Timer && dummy.ashiharaM2Timer > 0) {
          dummy.ashiharaM2Timer--;
          if (player && !player.isDead) {
            const pullAngle = Math.atan2(player.y - dummy.y, player.x - dummy.x);
            const targetDist = dummy.radius + player.radius + 8;
            player.x = dummy.x + Math.cos(pullAngle) * targetDist;
            player.y = dummy.y + Math.sin(pullAngle) * targetDist;
          }
          if (dummy.ashiharaM2Timer === 0) {
            dummy.ashiharaM2Stage = 3;
            dummy.ashiharaM2Timer = 12;
            const rearFist = dummy.fists.find(f => f.punchType === 'right') || dummy.fists[1] || dummy.fists[0];
            if (rearFist) {
              rearFist.isPunching = true;
              rearFist.punchProgress = 0.05;
              rearFist.isHeavy = true;
              rearFist.hasHit = false;
              (rearFist as any).ashiharaS3 = true;
            }
            soundManager.playPunch(true);
          }
        } else if (dummy.ashiharaM2Stage === 3 && dummy.ashiharaM2Timer && dummy.ashiharaM2Timer > 0) {
          dummy.ashiharaM2Timer--;
          const rearFist = dummy.fists.find(f => f.punchType === 'right') || dummy.fists[1] || dummy.fists[0];
          if (rearFist) {
            rearFist.isPunching = true;
            rearFist.punchProgress = Math.min(1.0, 1.0 - (dummy.ashiharaM2Timer / 12));
            rearFist.isHeavy = true;
            (rearFist as any).ashiharaS3 = true;

            if (dummy.ashiharaM2Timer === 6 && !rearFist.hasHit) {
              rearFist.hasHit = true;
              if (player && !player.isDead) {
                const ashiharaMods = getHeightModifiers(dummy.baseHeight);
                const s3Dmg = Math.round(13.0 * ashiharaMods.damageFactor * 0.90 * 10) / 10;
                if (matchData?.gamemode !== 'sustain_attack' && matchData?.gamemode !== 'hot_potato') {
                  player.health = Math.max(0, player.health - s3Dmg);
                }
                applyDamageCombatLocks(player);
                player.damageFlashTime = 16;
                player.stunTime = 51;
                player.strikeCooldown = 51;
                player.blockLockout = 51;
                player.isBlocking = false;
                
                dummy.heavyCooldown = 0;
                dummy.heavyWindup = 0;
                
                stateRef.current.shakeAmount = 14 * settings.screenShake;
                stateRef.current.hitStopFrames = 2;
                soundManager.playPunch(true);
                spawnFloatingText(player.x, player.y - 25, `-${s3Dmg} HP`, '#ef4444');
                
                for (let i = 0; i < 16; i++) {
                  const angle = dummy.facingAngle + (Math.random() - 0.5) * 1.2;
                  const speed = Math.random() * 6 + 3;
                  stateRef.current.particles.push({
                    id: `ashihara_s3_dummy_${Math.random()}`,
                    x: player.x,
                    y: player.y,
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
          if (dummy.ashiharaM2Timer === 0) {
            dummy.ashiharaM2Stage = 0;
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

      // CQC M2 Echo Rings & Rear Blitz Assault Sequence (Dummy)
      if (dummy.styleId === 'cqc') {
        if (dummy.cqcM2Stage || ((dummy.heavyWindup || 0) > 0)) {
          if (player && !player.isDead) {
            const angleToTarget = Math.atan2(player.y - dummy.y, player.x - dummy.x);
            dummy.facingAngle = angleToTarget;
            dummy.cqcLockedAngle = angleToTarget;
          }
        }
        if (dummy.cqcM2Stage === 'windup' || (dummy.heavyWindup && dummy.heavyWindup > 0)) {
          const totalWindup = 90;
          const currentWindup = dummy.heavyWindup ?? dummy.cqcWindupTimer ?? 0;
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
              frozen: !!dummy.cqcLockedTarget
            };
          });

          if (player && !player.isDead) {
            const dist = Math.hypot(player.x - dummy.x, player.y - dummy.y);
            const activeMaxR = Math.max(...ringRadii, 100);
            if (dist <= activeMaxR + player.radius && !dummy.cqcLockedTarget) {
              dummy.cqcLockedTarget = player;
              spawnFloatingText(player.x, player.y - 35, 'ECHO LOCKON!', '#ef4444');
              soundManager.playParry();
            }
          }

          dummy.cqcRings = rings;
        } else if (dummy.cqcM2Stage === 'dash') {
          const target = dummy.cqcLockedTarget || (player && !player.isDead ? player : null);
          if (target && !target.isDead) {
            const total = dummy.cqcDashTotalFrames || 18;
            const curFrame = Math.max(0, dummy.dashProgress || 0);
            const rawT = Math.min(1, Math.max(0, 1 - (curFrame / total)));
            // Smooth hermite glide interpolation
            const t = rawT * rawT * (3 - 2 * rawT);

            const startX = dummy.cqcDashStartX ?? dummy.x;
            const startY = dummy.cqcDashStartY ?? dummy.y;
            const endX = dummy.cqcDashEndX ?? dummy.x;
            const endY = dummy.cqcDashEndY ?? dummy.y;

            dummy.x = startX + (endX - startX) * t;
            dummy.y = startY + (endY - startY) * t;
            const glideAngle = Math.atan2(endY - startY, endX - startX);
            dummy.facingAngle = glideAngle;

            // Physical glide velocity
            dummy.vx = Math.cos(glideAngle) * 9.5;
            dummy.vy = Math.sin(glideAngle) * 9.5;

            // Target stays steady and frozen - no knockback, no movement
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
              dummy.cqcM2Stage = null;
              dummy.cqcLockedTarget = null;
              dummy.cqcLockedAngle = undefined;
              dummy.cqcRings = undefined;
              dummy.isDashing = false;
              dummy.dashProgress = 0;
              dummy.heavyCooldown = 900;

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
              dummy.cqcM2Stage = null;
              dummy.cqcLockedTarget = null;
              dummy.cqcLockedAngle = undefined;
              dummy.cqcRings = undefined;
              dummy.isDashing = false;
              dummy.dashProgress = 0;
              dummy.heavyCooldown = 900;

              dummy.shellSpinTimer = 0;
              dummy.stunTime = 90;
              dummy.strikeCooldown = 90;
              dummy.shellLockoutTimer = 90;
              dummy.damageFlashTime = 10;
              dummy.isBlocking = false;
              dummy.blockLockout = 60;

              target.heavyWindup = 0;
              target.fists.forEach(f => { f.isPunching = false; f.punchProgress = 0; f.isHeavy = false; });
              target.heavyCooldown = 360;
              target.shellPostureBoostTimer = 180;
              target.parryFlashTime = 18;

              soundManager.playParry();
              soundManager.playRollTick();
              stateRef.current.shakeAmount = 10 * settings.screenShake;
              spawnFloatingText(dummy.x, dummy.y - 35, 'SHOULDER DEFLECTED & STAGGERED (1.5s)', '#d946ef');
              spawnFloatingText(target.x, target.y - 35, 'POSTURE RECOVERY BOOST 2X (3.0s)', '#d946ef');
              return;
            }

            stateRef.current.particles.push({
              id: `cqc_dash_d_${Math.random()}`,
              x: dummy.x,
              y: dummy.y,
              vx: -Math.cos(glideAngle) * (Math.random() * 2 + 1),
              vy: -Math.sin(glideAngle) * (Math.random() * 2 + 1),
              radius: dummy.radius * 0.45,
              color: '#ef4444',
              alpha: 0.55,
              life: 0,
              maxLife: 16,
              type: 'spark'
            });

            if (dummy.dashProgress === undefined || dummy.dashProgress <= 0) {
              const startX = dummy.cqcDashStartX ?? dummy.x;
              const startY = dummy.cqcDashStartY ?? dummy.y;

              // Smoothly land on the end position
              dummy.x = endX;
              dummy.y = endY;
              dummy.vx = 0;
              dummy.vy = 0;

              // Attacker continuously faces the enemy
              const angleToTarget = Math.atan2(target.y - dummy.y, target.x - dummy.x);
              dummy.facingAngle = angleToTarget;
              dummy.cqcLockedAngle = angleToTarget;

              // Check if opponent properly blocked head-on (passed through frontal guard)
              const incomingDir = Math.atan2(startY - target.y, startX - target.x);
              const angleDiff = Math.abs(Math.atan2(Math.sin(target.facingAngle - incomingDir), Math.cos(target.facingAngle - incomingDir)));
              const isHeadOnGuard = !!(target.isBlocking && (target.armorBreakTime || 0) <= 0 && (target.blockLockout || 0) <= 0 && angleDiff < (Math.PI * 0.5));

              dummy.cqcAssaultBlocked = isHeadOnGuard;
              dummy.cqcM2Stage = 'assault';
              dummy.cqcAssaultHit = 1;
              dummy.cqcAssaultTimer = 12; // 0.2s (12 frames) before 1st hit
              dummy.isDashing = false;
              dummy.dashProgress = 0;
              dummy.cqcRings = undefined;

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
              dummy.dashProgress--;
            }
          } else {
            dummy.cqcM2Stage = null;
            dummy.cqcLockedTarget = null;
            dummy.cqcLockedAngle = undefined;
            dummy.cqcAssaultBlocked = false;
            dummy.isDashing = false;
            dummy.dashProgress = 0;
            dummy.cqcRings = undefined;
            dummy.heavyCooldown = Math.max(dummy.heavyCooldown || 0, 900);
          }
        } else if (dummy.cqcM2Stage === 'assault') {
          const target = dummy.cqcLockedTarget || (player && !player.isDead ? player : null);
          if (target && !target.isDead) {
            // Attacker stays in place and tracks rotation facing the enemy
            dummy.vx = 0;
            dummy.vy = 0;
            const angleToTarget = Math.atan2(target.y - dummy.y, target.x - dummy.x);
            dummy.facingAngle = angleToTarget;
            dummy.cqcLockedAngle = angleToTarget;
            target.vx = 0;
            target.vy = 0;

            const isBlockedAssault = !!dummy.cqcAssaultBlocked;

            if (dummy.cqcAssaultHit && dummy.cqcAssaultHit < 5) {
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

            if (dummy.cqcAssaultTimer === undefined || dummy.cqcAssaultTimer <= 0) {
              const dMods = getHeightModifiers(dummy.baseHeight);
              const hitIndex = dummy.cqcAssaultHit || 1;
              const isTargetImmune = isFighterInIFrames(target);

              if (hitIndex < 4) {
                // Hits 1, 2, 3: Hits every 0.2s (12 frames)
                const fist = dummy.fists[(hitIndex - 1) % 2];
                if (fist) {
                  fist.isPunching = true;
                  fist.punchProgress = 0.2;
                  fist.hasHit = true;
                  fist.isHeavy = false;
                }

                if (isBlockedAssault) {
                  // Blocked hit: damages 86% of Armor HP (AP) on Hit 1, with chip damage
                  if (hitIndex === 1 && !isTargetImmune) {
                    const curArmor = target.armorHP !== undefined ? target.armorHP : 18;
                    const armorDmg = Math.round(curArmor * 0.86 * 10) / 10;
                    target.armorHP = Math.max(0, Math.round((curArmor - armorDmg) * 10) / 10);
                    target.armorRegenLockout = Math.max(target.armorRegenLockout || 0, 90);
                    spawnFloatingText(target.x, target.y - 45, `-${armorDmg} AP (86%)`, '#38bdf8');
                  }

                  const chipDmg = isTargetImmune ? 0 : Math.round(0.6 * dMods.damageFactor * 10) / 10;
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
                  }

                  for (let i = 0; i < 4; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const spd = Math.random() * 3 + 1.5;
                    stateRef.current.particles.push({
                      id: `cqc_blk_spk_d_${Math.random()}`,
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
                  const dmg = isTargetImmune ? 0 : Math.round(2.5 * dMods.damageFactor * 10) / 10;
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
                  }

                  for (let i = 0; i < 5; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const spd = Math.random() * 4 + 2;
                    stateRef.current.particles.push({
                      id: `cqc_assault_spk_d_${Math.random()}`,
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

                if (target.health <= 0) {
                  target.health = 0;
                  target.isDead = true;
                  triggerKOCinematic(dummy, target);
                  dummy.cqcM2Stage = null;
                  dummy.cqcLockedTarget = null;
                  dummy.cqcAssaultBlocked = false;
                  dummy.cqcRings = undefined;
                  dummy.isDashing = false;
                  dummy.dashProgress = 0;
                  syncCombatStatesToUI();
                  return;
                }

                dummy.cqcAssaultHit = hitIndex + 1;
                dummy.cqcAssaultTimer = 12; // 0.2s (12 frames) between hits
              } else if (hitIndex === 4) {
                // Hit 4: Lands, then sets up 0.25s window before Hit 5
                const fist = dummy.fists[1];
                if (fist) {
                  fist.isPunching = true;
                  fist.punchProgress = 0.2;
                  fist.hasHit = true;
                  fist.isHeavy = false;
                }

                if (isBlockedAssault) {
                  const chipDmg = isTargetImmune ? 0 : Math.round(0.6 * dMods.damageFactor * 10) / 10;
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
                  }
                } else {
                  const dmg = isTargetImmune ? 0 : Math.round(2.5 * dMods.damageFactor * 10) / 10;
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
                  }

                  for (let i = 0; i < 5; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const spd = Math.random() * 4 + 2;
                    stateRef.current.particles.push({
                      id: `cqc_assault_spk_d_${Math.random()}`,
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

                if (target.health <= 0) {
                  target.health = 0;
                  target.isDead = true;
                  triggerKOCinematic(dummy, target);
                  dummy.cqcM2Stage = null;
                  dummy.cqcLockedTarget = null;
                  dummy.cqcAssaultBlocked = false;
                  dummy.cqcRings = undefined;
                  dummy.isDashing = false;
                  dummy.dashProgress = 0;
                  syncCombatStatesToUI();
                  return;
                }

                dummy.cqcAssaultHit = 5;
                // 5th hit initiates after 0.25s (15 frames)
                dummy.cqcAssaultTimer = 15;
                target.blockLockout = 0; // Un-disables block before Hit 5
                target.stunTime = 0; // Un-stun so opponent can raise guard to parry
                target.hitSteeringLock = 0;
                target.hitMovementLock = 0;
                target.cqcAttackLockout = 0;
                // If defender was already holding block before the Hit 5 telegraph window, record it so merely holding block does not parry
                target.cqcWasBlockingAtHit4 = target.isBlocking;
                spawnFloatingText(target.x, target.y - 45, 'DEFEND HIT 5 (0.25s)!', '#fbbf24');
              } else if (hitIndex === 5) {
                  // Hit 5 lands after 0.15s delay
                  const fist = dummy.fists[0];
                  if (fist) {
                    fist.isPunching = true;
                    fist.punchProgress = 0.2;
                    fist.hasHit = true;
                    fist.isHeavy = true;
                  }

                  // Evaluate Perfect Parry vs Unblocked/Regular Block
                  const blockCheck = checkDirectionalBlock(target, dummy);
                  const isDirectionalBlocked = blockCheck.isBlocked;
                  const blockTimeFrames = target.blockTimer || 0;
                  const isParry = evaluateParry(target, dummy, isDirectionalBlocked, blockTimeFrames, { isFrames: true });

                  if (isParry) {
                    // Successful Perfect Parry on Hit 5: Parried strike deals 0 damage to the opponent!
                    target.damageFlashTime = 12;
                    target.parryFlashTime = 18;
                    target.parryBlockGraceTimer = 90;
                    target.afterParryGraceTimer = 90;
                    target.postBlockAttackLockout = 0;
                    target.strikeCooldown = 0;
                    target.blockLockout = 0;
                    target.parryLockoutTimer = 0;
                    target.blockTimer = 0;
                    target.blockUseCount = 0;
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
                    const fullDmg = isTargetImmune ? 0 : Math.round(4.0 * dMods.damageFactor * 10) / 10;
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

                    const kbAngle = dummy.facingAngle;
                    target.vx = Math.cos(kbAngle) * 1.5;
                    target.vy = Math.sin(kbAngle) * 1.5;
                    soundManager.playPunch(true);

                    dummy.postureCd = 0;
                    dummy.isPostureLocked = false;
                    spawnFloatingText(dummy.x, dummy.y - 30, 'POSTURE CD RESET (0.0s)', '#22c55e');

                    if (isTargetImmune) {
                      spawnFloatingText(target.x, target.y - 30, 'IMMUNE (0 HP)', '#38bdf8');
                    } else {
                      spawnFloatingText(target.x, target.y - 30, `-${fullDmg} HP`, '#ef4444');
                    }
                  }

                  stateRef.current.shakeAmount = 14 * settings.screenShake;
                  stateRef.current.hitStopFrames = 2;

                  if (target.health <= 0) {
                    target.health = 0;
                    target.isDead = true;
                    triggerKOCinematic(dummy, target);
                  }

                  // Back to normal after the 5th attack
                  dummy.cqcM2Stage = null;
                  dummy.cqcLockedTarget = null;
                  dummy.cqcLockedAngle = undefined;
                  dummy.cqcRings = undefined;
                  dummy.isDashing = false;
                  dummy.dashProgress = 0;
                  dummy.heavyCooldown = 900; // 15.0s cooldown
                  dummy.strikeCooldown = 0; // Attacker can immediately follow up
                  dummy.lightCooldown = 0;
                  dummy.fists.forEach(f => {
                    f.isPunching = false;
                    f.punchProgress = 0;
                    f.isHeavy = false;
                    f.hasHit = false;
                  });
                  syncCombatStatesToUI();
                }
            } else {
              dummy.cqcAssaultTimer--;
            }
          } else {
            dummy.cqcM2Stage = null;
            dummy.cqcLockedTarget = null;
            dummy.cqcRings = undefined;
            dummy.isDashing = false;
            dummy.dashProgress = 0;
            dummy.heavyCooldown = Math.max(dummy.heavyCooldown || 0, 900);
            dummy.strikeCooldown = 0;
            dummy.lightCooldown = 0;
            dummy.fists.forEach(f => {
              f.isPunching = false;
              f.punchProgress = 0;
              f.isHeavy = false;
              f.hasHit = false;
            });
            syncCombatStatesToUI();
          }
        }
      }

      // Keysi M2 Clinch State Machine (Dummy)
      if (dummy.styleId === 'keysi') {
        if (dummy.keysiClinchStage === 'delay') {
          if (dummy.keysiClinchTimer && dummy.keysiClinchTimer > 0) {
            dummy.keysiClinchTimer--;
            dummy.vx = 0;
            dummy.vy = 0;
            if (dummy.keysiClinchTimer === 0) {
              const target = dummy.keysiClinchTarget || (player && !player.isDead ? player : null);
              if (target && !target.isDead) {
                const dist = Math.hypot(target.x - dummy.x, target.y - dummy.y);
                const inPocketRange = dist <= (dummy.radius + target.radius + 24);
                const blockCheck = checkDirectionalBlock(target, dummy);
                const blockTimeSec = (target.blockTimer || 0) / 60;
                const isParry = inPocketRange && evaluateParry(target, dummy, blockCheck.isBlocked, blockTimeSec);

                if (isParry) {
                  // Opponent parried the clinch grab the moment the elbow hits! Zero knockback!
                  target.parryFlashTime = 18;
                  target.parryBlockGraceTimer = 90;
                  target.afterParryGraceTimer = 90;
                  target.postBlockAttackLockout = 0;
                  target.strikeCooldown = 0;
                  target.vx = 0;
                  target.vy = 0;
                  dummy.vx = 0;
                  dummy.vy = 0;
                  soundManager.playParry();
                  spawnFloatingText(target.x, target.y - 30, 'PARRIED!', '#f59e0b');
                  dummy.heavyWindup = 0;
                  dummy.keysiClinchStage = null;
                  dummy.keysiClinchTarget = null;
                  applyHeavyWhiffPenalty(dummy);
                } else if (inPocketRange) {
                  // If enemy was holding block during the clamp: Shatters guard (AP) and initiates attack instantly
                  if (target.isBlocking) {
                    target.armorHP = 0;
                    target.armorBreakTime = 60;
                    soundManager.playGuardBreak();
                    spawnFloatingText(target.x, target.y - 30, 'GUARD BROKEN! (AP SHATTERED)', '#ef4444');
                  }

                  // Clinch Connected! The closed elbows immobilize the victim and disable all buttons
                  dummy.keysiClinchStage = 'clinch';
                  dummy.keysiClinchTimer = 38; // 38 frames (~0.63s) full headbutt sequence
                  dummy.keysiClinchTarget = target;
                  dummy.heavyCooldown = 900;
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
                  dummy.keysiClinchStage = null;
                  dummy.keysiClinchTarget = null;
                  applyHeavyWhiffPenalty(dummy);
                }
              } else {
                dummy.keysiClinchStage = null;
                dummy.keysiClinchTarget = null;
                applyHeavyWhiffPenalty(dummy);
              }
            }
          }
        } else if (dummy.keysiClinchStage === 'clinch') {
          if (dummy.keysiClinchTimer && dummy.keysiClinchTimer > 0) {
            dummy.keysiClinchTimer--;
            dummy.vx = 0;
            dummy.vy = 0;
            const target = dummy.keysiClinchTarget || (player && !player.isDead ? player : null);
            if (target && !target.isDead) {
              // Clamp pulls opponent inward and locks him firmly in place
              const clinchDist = dummy.radius + target.radius + 4;
              const desiredX = dummy.x + Math.cos(dummy.facingAngle) * clinchDist;
              const desiredY = dummy.y + Math.sin(dummy.facingAngle) * clinchDist;
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
            if (dummy.keysiClinchTimer === 15) {
              if (target && !target.isDead) {
                const dMods = getHeightModifiers(dummy.baseHeight);
                const isTargetImmune = isFighterInIFrames(target);
                const headbuttDmg = isTargetImmune ? 0 : Math.round(14.0 * dMods.damageFactor * 10) / 10;
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
                }

                // Crimson & Silver bone impact sparks
                for (let i = 0; i < 14; i++) {
                  const angle = Math.random() * Math.PI * 2;
                  const speed = Math.random() * 5 + 2.5;
                  stateRef.current.particles.push({
                    id: `keysi_headbutt_d_${Math.random()}`,
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

                if (target.health <= 0) {
                  target.health = 0;
                  target.isDead = true;
                  triggerKOCinematic(dummy, target);
                }
              }
            }
            if (dummy.keysiClinchTimer === 0) {
              dummy.keysiClinchStage = null;
              dummy.keysiClinchTarget = null;
              dummy.strikeCooldown = 0;
              dummy.lightCooldown = 0;
              syncCombatStatesToUI();
            }
          }
        }
      }

      // Keysi Dash Interception / Collision Check (Dummy)
      if (dummy.isDashing && dummy.styleId === 'keysi' && player && !player.isDead) {
        const dist = Math.hypot(player.x - dummy.x, player.y - dummy.y);
        if (dist <= dummy.radius + player.radius + 22) {
          dummy.keysiM2Primed = true; // Passive still applies!
          const farThreshold = dummy.radius + player.radius + 80;
          const wasFarDistanced = (dummy.dashStartDist || 0) > farThreshold;
          if (wasFarDistanced) {
            dummy.isDashing = false;
            dummy.dashProgress = 0;
            dummy.vx = 0;
            dummy.vy = 0;
            soundManager.playRollTick();
            spawnFloatingText(dummy.x, dummy.y - 30, 'POCKET INTERCEPT (CLINCH PRIMED!)', '#ef4444');
            for (let i = 0; i < 6; i++) {
              const angle = Math.random() * Math.PI * 2;
              stateRef.current.particles.push({
                id: `keysi_dash_col_d_${Math.random()}`,
                x: (dummy.x + player.x) / 2,
                y: (dummy.y + player.y) / 2,
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
          } else if (!dummy.keysiCloseDashPrimed) {
            dummy.keysiCloseDashPrimed = true;
            soundManager.playRollTick();
            spawnFloatingText(dummy.x, dummy.y - 30, 'POCKET SLIP (CLINCH PRIMED!)', '#ef4444');
            for (let i = 0; i < 6; i++) {
              const angle = Math.random() * Math.PI * 2;
              stateRef.current.particles.push({
                id: `keysi_dash_col_d_close_${Math.random()}`,
                x: (dummy.x + player.x) / 2,
                y: (dummy.y + player.y) / 2,
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
      if (dummy.armorRegenLockout && dummy.armorRegenLockout > 0) {
        dummy.armorRegenLockout--;
      } else if (!dummy.isBlocking && (dummy.armorBreakTime || 0) <= 0) {
        if ((dummy.armorHP || 0) < 18) {
          // Calculate height-dependent regen interval in frames (0.8s at 68 in, max shortest 0.4s)
          const seconds = Math.max(0.4, 0.8 + (dummy.baseHeight - 68) * 0.05);
          const intervalFrames = Math.round(seconds * 60);

          dummy.armorRegenTimer = (dummy.armorRegenTimer || 0) + 1;
          if (dummy.armorRegenTimer >= intervalFrames) {
            dummy.armorHP = Math.min(18, (dummy.armorHP || 0) + 1);
            dummy.armorRegenTimer = 0;
            syncCombatStatesToUI();
          }
        } else {
          dummy.armorRegenTimer = 0;
        }
      } else {
        dummy.armorRegenTimer = 0;
      }

      // Dash timings decay
      if (dummy.dashCooldown && dummy.dashCooldown > 0) {
        dummy.dashCooldown--;
      }
      if (dummy.dashProgress && dummy.dashProgress > 0 && dummy.cqcM2Stage !== 'dash') {
        dummy.dashProgress--;

        // Spawn afterimages during dummy dash
        if (dummy.dashProgress % 3 === 0) {
          stateRef.current.particles.push({
            id: `dummy_dash_ghost_${Math.random()}`,
            x: dummy.x,
            y: dummy.y,
            vx: 0,
            vy: 0,
            radius: dummy.radius,
            color: dummy.styleId === 'basic' ? '#00e5ff' : dummy.color,
            alpha: 0.40,
            life: 0,
            maxLife: 14,
            type: 'afterimage',
            facingAngle: dummy.facingAngle
          } as any);
        }

        if (dummy.styleId === 'basic') {
          const frame = 48 - dummy.dashProgress;
          const styleObj = FIGHTING_STYLES.find(s => s.id === 'basic') || FIGHTING_STYLES[0];
          const styleSpeed = styleObj.statModifiers?.speed ?? 1.15;
          let forwardSpeed = 1.95 * styleSpeed; // Slower, tightly paced dash momentum with longer sway path
          if (dummy.concussTime && dummy.concussTime > 0) forwardSpeed *= 0.40;

          const lateralAmp = 2.4 * Math.sin((frame / 12) * Math.PI);
          const moveAngle = dummy.dashAngle !== undefined ? dummy.dashAngle : dummy.facingAngle;
          if (player && !player.isDead) {
            dummy.facingAngle = Math.atan2(player.y - dummy.y, player.x - dummy.x); // Maintain front facing at opponent even while back dashing
          }

          const fX = Math.cos(moveAngle);
          const fY = Math.sin(moveAngle);
          const pX = Math.cos(moveAngle + Math.PI / 2);
          const pY = Math.sin(moveAngle + Math.PI / 2);

          dummy.vx = fX * forwardSpeed + pX * lateralAmp;
          dummy.vy = fY * forwardSpeed + pY * lateralAmp;
          dummy.vx *= 0.94;
          dummy.vy *= 0.94;
        } else {
          // Dash has progressive friction
          dummy.vx *= 0.91;
          dummy.vy *= 0.91;
        }

        if (dummy.dashProgress === 0) {
          dummy.isDashing = false;
          dummy.dashAngle = undefined; // Reset dashAngle so it never leaks into attacks
          dummy.postDashAttackLockout = 18; // Section 2.8: 0.30s Post-Dash Attack Lockout
          if (dummy.styleId === 'basic') {
            dummy.flowStrikerBuffTimer = 18;
          } else {
            dummy.vx *= 0.5;
            dummy.vy *= 0.5;
          }
        }
      }

      // Attack strike cooldown decay
      if (dummy.strikeCooldown && dummy.strikeCooldown > 0) {
        dummy.strikeCooldown--;
      }
      if (dummy.lightCooldown && dummy.lightCooldown > 0) {
        let dec = 1;
        if (dummy.styleId === 'kickboxing' && dummy.kickboxingCadenceTimer && dummy.kickboxingCadenceTimer > 0) {
          // Cadence Opening: +20% Attack Speed (extra recovery tick every 5th frame)
          if (stateRef.current.gameTime % 5 === 0) dec = 2;
        }
        dummy.lightCooldown = Math.max(0, dummy.lightCooldown - dec);
      }
      if (dummy.kickboxingCadenceTimer && dummy.kickboxingCadenceTimer > 0) {
        dummy.kickboxingCadenceTimer--;
      }
      if (dummy.postureCd && dummy.postureCd > 0) {
        let decrement = (dummy.shellPostureBoostTimer && dummy.shellPostureBoostTimer > 0) ? 2 : 1;
        if (dummy.deflectiveCadenceTimer && dummy.deflectiveCadenceTimer > 0) {
          // Deflective Cadence (+30% Posture Regeneration speed for 8.0s)
          if (stateRef.current.gameTime % 3 === 0) decrement += 1;
        }
        dummy.postureCd = Math.max(0, dummy.postureCd - decrement);
        dummy.isPostureLocked = dummy.postureCd > 0;
      } else {
        dummy.isPostureLocked = false;
        // If posture resets or combo chain resets when not mid-punch, clear feint trap boost & reset momentum drag
        const isPunching = dummy.fists.some(f => f.isPunching || f.punchProgress > 0);
        if (!isPunching && dummy.comboStage === 0) {
          dummy.flowS3ParryBaited = false;
          dummy.sluggerM1WhiffDragCount = 0;
          dummy.sluggerWhiffedStages = [];
        }
      }
      if (dummy.comboResetTimer && dummy.comboResetTimer > 0) {
        dummy.comboResetTimer--;
        if (dummy.comboResetTimer === 0) {
          dummy.comboStage = 0;
          dummy.sluggerM1WhiffDragCount = 0;
          dummy.sluggerWhiffedStages = [];
          dummy.shellS3Primed = false;
          dummy.shellS4ReturnTimer = 0;
          dummy.flowS3ParryBaited = false;
          dummy.flowS1Whiffed = false;
          dummy.flowS2HasIFrames = false;
        }
      }
      if (dummy.shellS4ReturnTimer && dummy.shellS4ReturnTimer > 0) {
        dummy.shellS4ReturnTimer--;
      }
      if (dummy.shotokanRenZukiPending && (!dummy.lightCooldown || dummy.lightCooldown <= 0) && (!dummy.postureCd || dummy.postureCd <= 0)) {
        dummy.shotokanRenZukiPending = false;
        if (dummy.comboStage === 2 && !dummy.stunTime && !dummy.isDead) {
          const leftFist = dummy.fists.find(f => f.punchType === 'left');
          if (leftFist) { leftFist.isPunching = true; leftFist.punchProgress = 0; leftFist.comboStage = 2; }
          soundManager.playDash();
          dummy.comboStage = 3;
          const dummyMods = getHeightModifiers(dummy.baseHeight);
          dummy.lightCooldown = Math.round(getStyleM1BetweenCooldown('shotokan', 2) / dummyMods.speedFactor);
        }
      }
      if (dummy.heavyCooldown && dummy.heavyCooldown > 0) {
        dummy.heavyCooldown--;
      }
      if (dummy.postS4HeavyLockout && dummy.postS4HeavyLockout > 0) {
        dummy.postS4HeavyLockout--;
      }
      if (dummy.superCrippleTimer && dummy.superCrippleTimer > 0) {
        dummy.superCrippleTimer--;
      }
      if (dummy.kyokushinSpiralTimer && dummy.kyokushinSpiralTimer > 0) {
        dummy.kyokushinSpiralTimer--;
      }
      if (dummy.boneFractureTimer && dummy.boneFractureTimer > 0) {
        dummy.boneFractureTimer--;
      }
      if (dummy.keysiStaggerTimer && dummy.keysiStaggerTimer > 0) {
        dummy.keysiStaggerTimer--;
      }
      if (dummy.keysiVulnerableTimer && dummy.keysiVulnerableTimer > 0) {
        dummy.keysiVulnerableTimer--;
        if (dummy.keysiVulnerableTimer === 0 && dummy.keysiQueuedWhiffCd && dummy.keysiQueuedWhiffCd > 0) {
          dummy.heavyCooldown = dummy.keysiQueuedWhiffCd;
          dummy.keysiQueuedWhiffCd = 0;
        }
      }
      if (dummy.tkdConfusionTimer && dummy.tkdConfusionTimer > 0) {
        dummy.tkdConfusionTimer--;
      }
      if (dummy.deflectiveCadenceTimer && dummy.deflectiveCadenceTimer > 0) {
        dummy.deflectiveCadenceTimer--;
      }
      if (dummy.tkdLeadStaggerTimer && dummy.tkdLeadStaggerTimer > 0) {
        dummy.tkdLeadStaggerTimer--;
      }
      if (dummy.kickboxingSeq2Window && dummy.kickboxingSeq2Window > 0) {
        dummy.kickboxingSeq2Window--;
        if (dummy.kickboxingSeq2Window === 0) {
          dummy.kickboxingSeq2Ready = false;
          if (dummy.styleId === 'kickboxing') {
            finalizeKickboxingM2Cooldown(dummy);
          }
        }
      }

      dummy.x += dummy.vx;
      dummy.y += dummy.vy;

      if (state.freezeAI) {
        dummy.vx = 0;
        dummy.vy = 0;
      }

      // Friction (Use smooth slide friction 0.94 during spinout or stun so knockback carries smoothly across arena)
      const isDummyStunned = (
        (dummy.kyokushinSpinOutTimer && dummy.kyokushinSpinOutTimer > 0) ||
        (dummy.stunTime && dummy.stunTime > 0) ||
        (dummy.parriedStun && dummy.parriedStun > 0) ||
        (dummy.hitMovementLock && dummy.hitMovementLock > 0)
      );
      const dummyFriction = isDummyStunned ? 0.94 : 0.88;
      dummy.vx *= dummyFriction;
      dummy.vy *= dummyFriction;

      // Universal Rule: Concussion (S4/M2 hit) 60% movement speed slowdown enforcement (Bypassed during spinout or stun so knockback slides smoothly)
      if (dummy.concussTime && dummy.concussTime > 0 && (dummy.damageFlashTime || 0) <= 0 && !dummy.isDashing && (!dummy.kyokushinSpinOutTimer || dummy.kyokushinSpinOutTimer <= 0) && (!dummy.stunTime || dummy.stunTime <= 0)) {
        const concussedMaxSpeed = BASE_MOVEMENT_SPEED * 0.40;
        const curSpd = Math.sqrt(dummy.vx * dummy.vx + dummy.vy * dummy.vy);
        if (curSpd > concussedMaxSpeed) {
          dummy.vx = (dummy.vx / curSpd) * concussedMaxSpeed;
          dummy.vy = (dummy.vy / curSpd) * concussedMaxSpeed;
        }
      }

      // Aikido M2 Active Parry tactical crawl (0.10x) & Whiff slowdown (0.30x) enforcement
      if (dummy.aikiM2ActiveWindow && dummy.aikiM2ActiveWindow > 0) {
        const crawlMaxSpeed = BASE_MOVEMENT_SPEED * 0.10;
        const curSpd = Math.sqrt(dummy.vx * dummy.vx + dummy.vy * dummy.vy);
        if (curSpd > crawlMaxSpeed) {
          dummy.vx = (dummy.vx / curSpd) * crawlMaxSpeed;
          dummy.vy = (dummy.vy / curSpd) * crawlMaxSpeed;
        }
      } else if (dummy.aikiWhiffSlowTimer && dummy.aikiWhiffSlowTimer > 0) {
        const whiffMaxSpeed = BASE_MOVEMENT_SPEED * 0.30;
        const curSpd = Math.sqrt(dummy.vx * dummy.vx + dummy.vy * dummy.vy);
        if (curSpd > whiffMaxSpeed) {
          dummy.vx = (dummy.vx / curSpd) * whiffMaxSpeed;
          dummy.vy = (dummy.vy / curSpd) * whiffMaxSpeed;
        }
      }

      // Boundary cage bounding
      const radiusLim = (arenaSize / 2) - dummy.radius - 8;
      const centerDist = Math.sqrt((dummy.x - (arenaSize / 2)) ** 2 + (dummy.y - (arenaSize / 2)) ** 2);
      if (centerDist > radiusLim) {
        const angle = Math.atan2(dummy.y - (arenaSize / 2), dummy.x - (arenaSize / 2));
        dummy.x = (arenaSize / 2) + radiusLim * Math.cos(angle);
        dummy.y = (arenaSize / 2) + radiusLim * Math.sin(angle);
        dummy.vx *= -0.3;
        dummy.vy *= -0.3;
      }

      // Fists lunge animations
      const dummyMods = getHeightModifiers(dummy.baseHeight);
      dummy.fists.forEach(fist => {
        const stage = dummy.comboStage === 0 ? 3 : (dummy.comboStage - 1);
        const isShinKick = dummy.styleId === 'muay_thai' && fist.punchType === 'left' && stage === 3;

        let basePunchSpeed = 0.17;
        let baseReturnSpeed = 0.12;
        
        if (fist.isKineticCounter) {
          basePunchSpeed = 0.18;
          baseReturnSpeed = 0.11;
        } else if (isShinKick) {
          basePunchSpeed = 0.035;
          baseReturnSpeed = 0.11;
        } else if (fist.isHeavy) {
          if (dummy.styleId === 'street_boxing') {
            basePunchSpeed = 0.1381; // Standardized Kyokushin Baseline Execution Speed
            baseReturnSpeed = (1.0 / 66) * 0.85;
          }
          else if (dummy.styleId === 'slugger') {
            let execMult = 1.0;
            if (dummy.boneFractureTimer && dummy.boneFractureTimer > 0) {
              execMult *= 0.60;
            }
            basePunchSpeed = 0.075 * 0.68 * execMult;
            baseReturnSpeed = 0.055 * 0.68 * execMult;
          }
          else if (dummy.styleId === 'capoeira') { basePunchSpeed = 0.075; baseReturnSpeed = 0.055; }
          else if (dummy.styleId === 'shotokan') { basePunchSpeed = 0.09; baseReturnSpeed = 0.07; }
          else if (dummy.styleId === 'ashihara') { basePunchSpeed = 0.085; baseReturnSpeed = 0.065; }
          else if (dummy.styleId === 'kyokushin') { 
            basePunchSpeed = 0.20; // 5 Frames Explosive Piston Thrust (~0.08s)
            baseReturnSpeed = 0.10; // 10 Frames Deliberate Clean Revert
          }
          else if (dummy.styleId === 'keysi') { basePunchSpeed = 0.14; baseReturnSpeed = 0.10; }
          else if (dummy.styleId === 'kickboxing') {
            const isSeq2 = (fist as any)?.kickboxingSeq2 || dummy.kickboxingIsSeq2;
            let execMult = 0.95; // Base Attack Execution: 0.95x
            if (dummy.kickboxingCadenceTimer && dummy.kickboxingCadenceTimer > 0) {
              execMult *= 1.15; // Cadence Opening: +15% Attack Execution
            }
            if (isSeq2) {
              basePunchSpeed = 0.33 * execMult; // 3 Frames Teep Thrust
              baseReturnSpeed = 0.10 * execMult; // 10 Frames over-extension
            } else {
              basePunchSpeed = 0.33 * execMult; // 3 Frames Short Hook Execution
              baseReturnSpeed = 0.16 * execMult; // 6 Frames over-swing
            }
          }
          else if (dummy.styleId === 'boxing_shell') {
            basePunchSpeed = 0.22; // Quick shoulder roll turn (~4-5 frames)
            baseReturnSpeed = 0.18; // Quick snap back recovery (~5-6 frames)
          }
          else if (dummy.styleId === 'street_taekwondo') {
            basePunchSpeed = 0.1667; // 6 Frames (~0.10s) downward snap
            baseReturnSpeed = 0.0333; // 30 Frames (0.50s DS) decelerating recovery
          }
          else { basePunchSpeed = 0.08; baseReturnSpeed = 0.06; }
        } else {
          const fistStage = fist.comboStage !== undefined ? fist.comboStage : (dummy.comboStage === 0 ? 3 : Math.max(0, dummy.comboStage - 1));
          const m1 = getStyleM1Speeds(dummy.styleId, fistStage);
          basePunchSpeed = m1.punchSpeed;
          baseReturnSpeed = m1.returnSpeed;
          if (dummy.styleId === 'slugger') {
            let execMult = 1.0;
            if (dummy.sluggerM1WhiffDragCount && dummy.sluggerM1WhiffDragCount > 0) {
              execMult *= Math.max(0.30, 1.0 - (0.20 * dummy.sluggerM1WhiffDragCount));
            }
            if (dummy.boneFractureTimer && dummy.boneFractureTimer > 0) {
              execMult *= 0.60;
            }
            basePunchSpeed *= execMult;
            baseReturnSpeed *= execMult;
          } else if (dummy.styleId === 'street_boxing') {
            // Street Boxing strictly adheres to universal execution speed baseline
          } else if (dummy.styleId === 'boxing_shell') {
            const stage = fist.comboStage !== undefined ? fist.comboStage : (dummy.comboStage === 0 ? 3 : dummy.comboStage - 1);
            if (stage === 0 || stage === 1) {
              basePunchSpeed = m1.punchSpeed * 1.50; // Snapping Lead Execution: 50% faster Execution Speed for S1 & S2 (~66.7ms / ~4.0f)
              baseReturnSpeed = m1.returnSpeed * 1.50;
            } else {
              basePunchSpeed = m1.punchSpeed; // Iron Boxing: 100.0ms (~6.0 frames)
              baseReturnSpeed = m1.returnSpeed;
            }
          } else if (dummy.styleId === 'kickboxing') {
            let execMult = 0.95; // Base Attack Execution: 0.95x
            if (dummy.kickboxingCadenceTimer && dummy.kickboxingCadenceTimer > 0) {
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
            dummy.fists.forEach(otherFist => {
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
          if (dummy.styleId === 'street_taekwondo' && fist.isHeavy && fist.isPunching && Math.random() < 0.65) {
            const legDist = dummy.radius * 1.85 * (1.35 * Math.sin(fist.punchProgress * Math.PI * 0.5));
            const chopProg = Math.sin(fist.punchProgress * Math.PI * 0.5);
            const localChopAngle = 1.57 - chopProg * (1.57 - (-0.26)); // Sweeps from side flank to far and a little further
            const chopAngle = dummy.facingAngle + localChopAngle;
            state.particles.push({
              id: `dummy_tkd_m2_trail_${Math.random()}`,
              x: dummy.x + Math.cos(chopAngle) * legDist,
              y: dummy.y + Math.sin(chopAngle) * legDist,
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
            if (dummy.styleId === 'street_taekwondo' && fist.comboStage === 0 && !fist.isHeavy) {
              if (dummy.tkdDoubleTapQueued) {
                dummy.tkdChamberRetracting = true;
              }
            }
          }
        } else if (fist.punchProgress > 0) {
          if (dummy.styleId === 'street_taekwondo' && fist.comboStage === 0 && !fist.isHeavy && dummy.tkdChamberRetracting) {
            const snapRetDelta = Math.max(0.06, baseReturnSpeed * 2.5);
            fist.punchProgress -= snapRetDelta;
            if (fist.punchProgress <= 0.40) {
              fist.punchProgress = 0.40;
              dummy.tkdChamberRetracting = false;
              dummy.tkdDoubleTapQueued = false;
              fist.isPunching = true;
              fist.comboStage = 1;
              fist.hasHit = false;
              fist.punchTimeSec = 0;
              dummy.comboStage = 2;
              dummy.lightCooldown = 0;
              soundManager.playDash();
            }
            return;
          }
          if (dummy.styleId === 'kyokushin' && fist.isHeavy && (dummy.kyokushinM2PeakHoldTimer || 0) > 0) {
            dummy.kyokushinM2PeakHoldTimer!--;
            fist.punchProgress = 1.0; // Rigid Lock: Freeze solid at peak! Zero spring-back or rubber-banding
            return;
          }
          // SECTION 1.18: Duration Speed (DS) Matrix & Asynchronous Combo Acceleration (2.5x)
          fist.punchTimeSec = (fist.punchTimeSec || 0) + (1 / 60);
          const isComboAccelerating = dummy.fists.some(other => other.id !== fist.id && other.isPunching);
          const isExempt = !fist.isHeavy && ((dummy.styleId === 'basic' && fist.comboStage === 2) || (dummy.styleId === 'aikido' && fist.comboStage === 2));
          const fistStage = fist.comboStage !== undefined ? fist.comboStage : (dummy.comboStage === 0 ? 3 : Math.max(0, dummy.comboStage - 1));
          const returnDelta = calculateAsymmetricalRetractionDelta(fist.punchProgress, baseReturnSpeed, 1.0, isComboAccelerating, isExempt, dummy.styleId, fistStage, fist.isHeavy);
          fist.punchProgress -= returnDelta;
          if (fist.punchProgress <= 0.01) {
            fist.punchProgress = 0;
            fist.lingerTimer = 0;
            fist.isLingerActive = false;
            fist.punchTimeSec = 0;
            if (dummy.styleId === 'kyokushin' && fist.isHeavy) {
              dummy.kyokushinM2PeakHoldTimer = 0;
            }
            if (!fist.isHeavy) {
              dummy.postM1BlockLockout = 9; // Section 2.8: 0.15s Block Lockout (CanBlock = false)
            }
            if (dummy.styleId === 'slugger' && !fist.isHeavy) {
              if ((dummy.comboResetTimer || 0) < 110) {
                dummy.comboResetTimer = 110;
              }
              if (!fist.hasHit) {
                const wStage = fist.comboStage !== undefined ? fist.comboStage : 0;
                if (!dummy.sluggerWhiffedStages) dummy.sluggerWhiffedStages = [];
                if (!dummy.sluggerWhiffedStages.includes(wStage)) {
                  dummy.sluggerWhiffedStages.push(wStage);
                  dummy.sluggerM1WhiffDragCount = Math.min(3, dummy.sluggerWhiffedStages.length);
                  spawnFloatingText(dummy.x, dummy.y - 30, `MOMENTUM DRAG (-${dummy.sluggerM1WhiffDragCount * 20}%)`, '#f59e0b');
                }
              }
            }
            if (dummy.styleId === 'capoeira' && !fist.hasHit && !dummy.capoeiraWhiffBonusActive) {
              dummy.capoeiraWhiffBonusActive = true;
              spawnFloatingText(dummy.x, dummy.y - 30, 'FLOW RECOVERY READY!', '#ca8a04');
            }
            if (dummy.styleId === 'basic' && !fist.isHeavy) {
              if (fist.comboStage === 0 && !fist.hasHit) {
                dummy.flowS1Whiffed = true;
              } else if (fist.comboStage === 1) {
                dummy.flowS2HasIFrames = false;
              } else if (fist.comboStage === 3) {
                // S4 completed / missed: remove boost
                dummy.flowS3ParryBaited = false;
              }
            }
            if (fist.isHeavy) {
              if (dummy.styleId === 'street_boxing') {
                const stage = dummy.streetBoxingM2Stage || 1;
                if (stage === 1) {
                  if (fist.hasHit) {
                    dummy.streetBoxingM2NextTimer = 3;
                  } else {
                    dummy.streetBoxingM2Stage = 0;
                    dummy.streetBoxingM2Hits = 0;
                    dummy.streetBoxingUnbreakable = false;
                    applyHeavyWhiffPenalty(dummy);
                  }
                } else if (stage === 2) {
                  dummy.streetBoxingM2NextTimer = 3;
                } else {
                  dummy.streetBoxingM2Stage = 0;
                  dummy.streetBoxingUnbreakable = false;
                  if (!fist.hasHit && (dummy.streetBoxingM2Hits || 0) < 3) {
                    applyHeavyWhiffPenalty(dummy);
                  }
                }
              } else if (dummy.styleId === 'kickboxing') {
                const isSeq2 = (fist as any)?.kickboxingSeq2 || dummy.kickboxingIsSeq2;
                if (!isSeq2) {
                  // S1 finished its hook (whether hit or missed) - queue S2 after 0.15s (9 frames)
                  if (!dummy.kickboxingAutoSeq2Timer) {
                    dummy.kickboxingAutoSeq2Timer = 9;
                  }
                } else {
                  // S2 finished
                  if (!fist.hasHit) {
                    applyHeavyWhiffPenalty(dummy);
                  }
                  dummy.kickboxingIsSeq2 = false;
                }
              } else {
                if (!fist.hasHit) {
                  applyHeavyWhiffPenalty(dummy);
                }
              }
              fist.isHeavy = false;
              dummy.attackLockedAngle = undefined; // RESET THE LOCKED ANGLE!
            }
            fist.isKineticCounter = false;
            fist.hasHit = false; // Reset hit flag
          }
        } else {
          fist.punchProgress = 0;
          if (fist.isHeavy) {
            if (dummy.styleId === 'street_boxing') {
              if (!fist.hasHit && (dummy.streetBoxingM2Hits || 0) === 0) {
                applyHeavyWhiffPenalty(dummy);
              }
              dummy.streetBoxingM2Stage = 0;
              dummy.streetBoxingUnbreakable = false;
            } else if (!fist.hasHit) {
              applyHeavyWhiffPenalty(dummy);
            }
            fist.isHeavy = false;
            dummy.attackLockedAngle = undefined; // RESET THE LOCKED ANGLE!
          }
          fist.isKineticCounter = false;
          fist.hasHit = false;
        }
      });

      // Synchronize Kyokushin Left Arm counterbalance motion with Right Fist M2
      if (dummy.styleId === 'kyokushin') {
        const rf = dummy.fists.find(f => f.punchType === 'right');
        const lf = dummy.fists.find(f => f.punchType === 'left');
        if (rf && (rf.isHeavy || (dummy.kyokushinM2PeakHoldTimer || 0) > 0) && lf) {
          lf.punchProgress = rf.punchProgress;
          lf.isPunching = rf.isPunching;
          lf.hasHit = true; // Strictly disabled hitbox
        }
      }
    }
  };
