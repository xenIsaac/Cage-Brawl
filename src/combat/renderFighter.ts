import { CombatFighter } from './types';
import { GameSettings } from '../types';
import { getClampedFistPos, getIronSwayFactor } from './fistIK';
import { getHeightModifiers } from '../utils/heightModifiers';
import { getKickShoulderAngle, getKickArmIK, getKickGloveRotation } from './kickAnimation';
import { renderBlockArc } from './blockEngine';
import { renderStyleHandTrails } from './motionTrails';
import { calculateStreetBoxingTorso, calculateStreetBoxingArmIK } from './streetBoxing';
import { isImpactFrameSilhouette } from './impactFrame';

interface FlowSwayGhostFrame {
  worldX: number;
  worldY: number;
  visualAngle: number;
  radius: number;
  time: number;
  isBlackFlash: boolean;
}
const flowSwayGhostMap = new WeakMap<CombatFighter, FlowSwayGhostFrame[]>();

export interface FighterVisualTransform {
  visualAngle: number;
  lungeOffset: number;
  swayLateralOffset: number;
}

export const getFighterVisualTransform = (
  fighter: CombatFighter | any,
  gameTime: number
): FighterVisualTransform => {
  const leftFist = fighter.fists ? (fighter.fists.find((f: any) => f.punchType === 'left') || fighter.fists[0]) : undefined;
  const rightFist = fighter.fists ? (fighter.fists.find((f: any) => f.punchType === 'right') || fighter.fists[1]) : undefined;
  const leftProgress = leftFist ? leftFist.punchProgress : 0;
  const rightProgress = rightFist ? rightFist.punchProgress : 0;
  const comboStage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);

  let isBlockingActive = fighter.isBlocking || false;
  if (fighter.styleId === 'basic' && fighter.heavyWindup && fighter.heavyWindup > 0) {
    isBlockingActive = true;
  }

  const isFlowSwaySprinting = fighter.styleId === 'basic' && (fighter.isDashing || ((fighter.heavyWindup || 0) > 0));

  let visualAngle = fighter.facingAngle;
  if (fighter.styleId === 'shotokan' && fighter.attackLockedAngle !== undefined) {
    const isHeavy = rightFist && rightFist.isHeavy;
    if ((fighter.heavyWindup && fighter.heavyWindup > 0) || (rightProgress > 0 && isHeavy)) {
      visualAngle = fighter.attackLockedAngle;
    }
  }
  let lungeOffset = 0;
  let swayLateralOffset = 0;

  if (fighter.styleId === 'muay_thai') {
    const isMoving = Math.sqrt(fighter.vx * fighter.vx + fighter.vy * fighter.vy) > 0.5;
    const timeSec = gameTime * 0.05;
    const rock = Math.sin(timeSec);
    
    const idleWeight = (leftProgress > 0 || rightProgress > 0 || (fighter.heavyWindup && fighter.heavyWindup > 0) || fighter.stunTime > 0 || (fighter.armorBreakTime || 0) > 0) ? 0.08 : 1.0;
    
    // Rocking the facing angle (Yom Sam Khum march style)
    visualAngle += rock * 0.08 * idleWeight;
    // Bobbing forward and backward (marching rhythm)
    lungeOffset += rock * (isMoving ? 1.2 : 2.2) * idleWeight;

    if (fighter.heavyWindup && fighter.heavyWindup > 0) {
      // Leaning in aggressively during heavy clinch knee windup
      const maxWindup = 42;
      const ratio = Math.min(1, Math.max(0, (maxWindup - fighter.heavyWindup) / maxWindup));
      lungeOffset += Math.sin(ratio * Math.PI / 2) * fighter.radius * 0.35;
    } else {
      // Strike Specific sways and twists (elbows, knees, and shin kicks)
      if (leftProgress > 0 && leftFist?.isPunching) {
        const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
        const strikeSin = Math.sin(leftProgress * Math.PI);
        if (stage === 1) { // S2 Left Straight / Cross: Left shoulder drives forward, rotating body clockwise
          visualAngle += 0.22 * strikeSin;
          lungeOffset += strikeSin * fighter.radius * 0.35;
        } else if (stage === 3) { // S4 Left Shin Kick: Massive clockwise hip rotation and body lunge
          visualAngle += 0.52 * strikeSin;
          lungeOffset += strikeSin * fighter.radius * 0.6;
        }
      } else if (rightProgress > 0 && rightFist?.isPunching) {
        const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
        const strikeSin = Math.sin(rightProgress * Math.PI);
        const isHeavy = rightFist ? rightFist.isHeavy : false;
        
        if (isHeavy) { // Heavy Clinch Knee: Pull forward, rotate slightly to drive knee in
          visualAngle -= 0.18 * strikeSin;
          lungeOffset += strikeSin * fighter.radius * 0.85;
        } else if (stage === 0) { // S1 Right Rear Straight: Slices across, body rotates counter-clockwise
          visualAngle -= 0.20 * strikeSin;
          lungeOffset += strikeSin * fighter.radius * 0.35;
        } else if (stage === 2) { // S3 SOK TAT (Horizontal Slicing Elbow): Torso rotates smoothly into right-to-left sweep
          const ease = Math.sin(rightProgress * Math.PI * 0.5);
          visualAngle -= 0.50 * ease;
          lungeOffset += Math.sin(rightProgress * Math.PI) * fighter.radius * 0.45;
        }
      }
    }
  } else if (fighter.heavyWindup && fighter.heavyWindup > 0) {
    let maxWindup = 48;
    if (fighter.styleId === 'basic') maxWindup = fighter.hasReflexPivot ? 6 : 24;
    if (fighter.styleId === 'street_boxing') maxWindup = 24;
    if (fighter.styleId === 'slugger') maxWindup = 48;
    if (fighter.styleId === 'shotokan') maxWindup = 30;
    if (fighter.styleId === 'ashihara') maxWindup = 42;
    if (fighter.styleId === 'keysi') maxWindup = fighter.maxHeavyWindup || (fighter.keysiHasSuperArmor ? 6 : 26);
    if (fighter.styleId === 'cqc') maxWindup = 90;
    if (fighter.styleId === 'aikido') maxWindup = fighter.maxHeavyWindup || 15;
    if (fighter.styleId === 'kyokushin') maxWindup = 33; // 0.55s = 33 frames
    
    const ratio = Math.min(1, Math.max(0, (maxWindup - fighter.heavyWindup) / maxWindup));
    
    if (fighter.styleId === 'basic') {
      // Flow Boxing Sway-Dash weave & forward charge
      visualAngle += Math.sin(ratio * Math.PI * 2) * 0.35;
      lungeOffset += Math.sin(ratio * Math.PI) * fighter.radius * 0.65;
    } else if (fighter.styleId === 'kyokushin') {
      // Kyokushin Phase 1: Windup & Stance Anchor (0.55s = 33 frames)
      // Body Vector: drops 2px lower on Y-axis to ground its weight (zero swaying, zero lateral bounce)
      // Torso rotates once cleanly counter-clockwise (-0.28 rad) to coil right shoulder backward
      const pullEase = Math.sin(ratio * Math.PI * 0.5);
      visualAngle -= 0.28 * pullEase;
      swayLateralOffset += 2.0; // Grounded weight drop: 2px on Y-axis
      lungeOffset = 0; // Zero lateral bounce or swaying
    } else if (fighter.styleId === 'slugger') {
      // Massive body coil to the right during flared L heavy windup
      visualAngle += 0.55 * Math.sin(ratio * Math.PI / 2);
    } else if (fighter.styleId === 'shotokan') {
      // M2 180-degree spin during heavy attack windup!
      visualAngle += ratio * Math.PI;
    } else if (fighter.styleId === 'keysi') {
      // Keysi M2 Pensador Clinch Windup (0.5s or 0.1s primed): tight forward wedge coil
      lungeOffset += Math.sin(ratio * Math.PI) * fighter.radius * 0.18;
      visualAngle += 0.12 * Math.sin(ratio * Math.PI / 2);
    } else if (fighter.styleId === 'cqc') {
      // CQC M2 Tactical Windup: Compact cross-arm charge, slight forward tension
      lungeOffset += Math.sin(ratio * Math.PI) * fighter.radius * 0.15;
      visualAngle -= 0.10 * Math.sin(ratio * Math.PI / 2);
    } else if (fighter.styleId === 'aikido') {
      // Aikido M2 carries the exact same idle Hanmi pose without changing its stance or pose
      const baseStanceAngle = -0.48;
      const harmonicFloat = Math.sin(gameTime * 0.12566) * 1.5;
      visualAngle += baseStanceAngle;
      lungeOffset += harmonicFloat;
    }
  } else {
    if (fighter.styleId === 'shotokan' && rightFist && rightFist.isHeavy) {
      // M2 Ushiro-Mawashi-Geri execution: Face away from front (opposite direction 180 degrees)
      visualAngle += Math.PI;
    } else if (fighter.styleId === 'basic') {
      const isHeavy = (leftFist && leftFist.isHeavy && leftProgress > 0) || (rightFist && rightFist.isHeavy && rightProgress > 0);
      const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
      if (isHeavy) {
        // M2 Lead Stun Jab: Lunge forward with slight counter-rotation
        const smoothSine = Math.sin(leftProgress * Math.PI);
        visualAngle -= 0.15 * smoothSine;
        lungeOffset += smoothSine * fighter.radius * 0.70;
      } else if (leftProgress > 0 && leftFist?.isPunching) {
        if (stage === 0) {
          // SECTION 1.12 & 1.16: S1 Snapping Lead Jab (Biomechanical Offset + Torso Torque during extension)
          if (leftProgress < 0.18) {
            // Frame 1 Offset: Body circle initiates forward rotation smoothly from 0 to 5° torque
            const offsetT = leftProgress / 0.18;
            visualAngle += 0.087 * offsetT;
          } else {
            // Frames 2-5: Explodes outward smoothly from 5° to full ~20° torso torque (~0.337 rad)
            const punchT = (leftProgress - 0.18) / 0.82;
            const torque = 0.087 + Math.sin(punchT * Math.PI * 0.5) * (0.337 - 0.087);
            visualAngle += torque;
            lungeOffset += Math.sin(punchT * Math.PI * 0.5) * fighter.radius * 0.42;
          }
        } else if (stage === 3) {
          // S4: Looping overhead hook - Smooth torso torque (22° / 0.38 rad) & forward lunge during extension
          const smoothSine = Math.sin(leftProgress * Math.PI * 0.5);
          visualAngle += 0.38 * smoothSine;
          lungeOffset += smoothSine * fighter.radius * 0.55;
        }
      } else if (rightProgress > 0 && rightFist?.isPunching) {
        if (stage === 2) {
          // S3: Fast Hook Feint Slip - Snappy forward feint probe (100% exempt from linger)
          const feintSine = Math.sin(rightProgress * Math.PI);
          visualAngle += 0.24 * feintSine;
          lungeOffset += feintSine * fighter.radius * 0.28;
        } else {
          // S2: Right hook - Twist body counter-clockwise (18°-20° / -0.34 rad) during extension
          if (rightProgress < 0.18) {
            const offsetT = rightProgress / 0.18;
            visualAngle -= 0.087 * offsetT;
          } else {
            const punchT = (rightProgress - 0.18) / 0.82;
            const torque = 0.087 + Math.sin(punchT * Math.PI * 0.5) * (0.34 - 0.087);
            visualAngle -= torque;
            lungeOffset += Math.sin(punchT * Math.PI * 0.5) * fighter.radius * 0.40;
          }
        }
      }
    } else if (fighter.styleId === 'slugger') {
      const isHeavy = rightFist && rightFist.isHeavy && rightProgress > 0;
      const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
      if (isHeavy) {
        // M2 HEAVY HOOK: Rotates counter-clockwise into the sweeping right heavy hook
        const smoothSine = Math.sin(rightProgress * Math.PI);
        visualAngle -= 0.65 * smoothSine;
        lungeOffset += smoothSine * fighter.radius * 0.75;
      } else {
        if (leftProgress > 0) {
          // Left Hook M1 (S1 & S3): Sweeps across to right side (+Y), body turns clockwise (+ angle)
          const smoothSine = Math.sin(leftProgress * Math.PI);
          visualAngle += 0.50 * smoothSine;
          lungeOffset += smoothSine * fighter.radius * 0.55;
        } else if (rightProgress > 0) {
          if (stage === 3) {
            // S4 Straight Punch: Drives straight forward down center line
            const smoothSine = Math.sin(rightProgress * Math.PI);
            visualAngle -= 0.15 * smoothSine;
            lungeOffset += smoothSine * fighter.radius * 0.70;
          } else {
            // Right Hook M1 (S2): Sweeps across to left side (-Y), body turns counter-clockwise (- angle)
            const smoothSine = Math.sin(rightProgress * Math.PI);
            visualAngle -= 0.50 * smoothSine;
            lungeOffset += smoothSine * fighter.radius * 0.55;
          }
        }
      }
    } else if (fighter.styleId === 'street_boxing') {
      const { deltaVisualAngle, lungeOffset: sbLunge } = calculateStreetBoxingTorso(
        fighter,
        leftProgress,
        rightProgress,
        leftFist,
        rightFist,
        isBlockingActive
      );
      visualAngle += deltaVisualAngle;
      lungeOffset += sbLunge;
    } else if (fighter.styleId === 'ashihara') {
      const isM2Active = (fighter.ashiharaM2Stage && fighter.ashiharaM2Stage > 0) || (fighter.heavyWindup && fighter.heavyWindup > 0) || (rightFist && rightFist.isHeavy);
      const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
      if (isM2Active) {
        if (fighter.ashiharaM2Stage === 2) {
          // S2 Tsukami Drag: Lean forward into opponent
          visualAngle = fighter.facingAngle;
          lungeOffset += fighter.radius * 0.25;
        } else if (fighter.ashiharaM2Stage === 3) {
          // S3 Chudan Straight: Torso drives rear right straight cross into opponent center
          const progress = fighter.ashiharaM2Timer ? (12 - fighter.ashiharaM2Timer) / 12 : 0.5;
          const p = Math.sin(progress * Math.PI);
          visualAngle -= 0.35 * p;
          lungeOffset += p * fighter.radius * 0.45;
        }
      } else if (leftProgress > 0) {
        if (stage === 0) {
          // S1 Seiken Chudan Tsuki: Sabaki body position windup & drive
          const p = Math.sin(leftProgress * Math.PI);
          visualAngle -= 0.35 * p;
        } else if (stage === 1) {
          // S2 Gedan Mawashi Geri: Body twist into low calf kick
          const p = Math.sin(leftProgress * Math.PI);
          visualAngle += 0.4 * p;
        } else if (stage === 2) {
          // S3 Chudan Kansetsu Geri: Linear stamping kick angle
          const p = Math.sin(leftProgress * Math.PI);
          visualAngle += 0.3 * p;
        }
      } else if (rightProgress > 0 && stage === 3) {
        // S4 Ashibarai: Wide sweep rotation
        const p = Math.sin(rightProgress * Math.PI);
        visualAngle += 0.55 * p;
      }
    } else if (fighter.styleId === 'kickboxing') {
      const isSeq2 = (rightFist as any)?.kickboxingSeq2 || fighter.kickboxingIsSeq2;
      const isHeavy = rightFist && rightFist.isHeavy;
      const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
      if (fighter.heavyWindup && fighter.heavyWindup > 0) {
        if (isSeq2) {
          // Teep Chamber: Rear knee snaps vertically upward, upper torso leans back smoothly
          const maxWFrames = 18;
          const t = Math.min(1, Math.max(0, 1 - fighter.heavyWindup / maxWFrames));
          const chamberEase = Math.sin(t * Math.PI / 2); // 0 -> 1 smooth rotation entry
          visualAngle -= 0.35 * chamberEase;
          lungeOffset -= fighter.radius * 0.2 * chamberEase;
        } else {
          // Short Hook Windup: Torso coils right as right glove chambers behind ear, eased
          const maxWFrames = fighter.hasChainReaction ? 15 : 26;
          const t = Math.min(1, Math.max(0, 1 - fighter.heavyWindup / maxWFrames));
          const coilEase = Math.sin(t * Math.PI / 2); // 0 -> 1 smooth coiling right
          visualAngle += 0.32 * coilEase; // Softened from 0.40 to 0.32 for visual elegance
        }
      } else if (rightProgress > 0 && isHeavy) {
        if (isSeq2) {
          // Teep Execution: Kicking leg thrusts forward, upper torso leans back sharply with continuous smooth transition
          const strikeSin = Math.sin(rightProgress * Math.PI);
          visualAngle -= 0.35 + (0.15 * strikeSin); // Smooth blend from chamber -0.35 up to peak extension -0.50
          lungeOffset += (strikeSin * fighter.radius * 0.8) - (fighter.radius * 0.2 * (1 - strikeSin));
        } else {
          // Short Hook Execution: Torso does not rotate left (stay perfectly facing forward or centered)
          const strikeSin = Math.sin(rightProgress * Math.PI);
          lungeOffset += strikeSin * fighter.radius * 0.4;
        }
      } else if (leftProgress > 0) {
        if (stage === 0) {
          // S1 Left Jab: Snaps straight out along lead line
          const strikeSin = Math.sin(leftProgress * Math.PI);
          visualAngle += 0.15 * strikeSin;
          lungeOffset += strikeSin * fighter.radius * 0.3;
        } else if (stage === 2) {
          // S3 Calf Kick: Upper body holds steady while rear hip turns inward
          const strikeSin = Math.sin(leftProgress * Math.PI);
          visualAngle -= 0.25 * strikeSin;
        }
      } else if (rightProgress > 0) {
        if (stage === 1) {
          // S2 Right Jab: Drives straight out along center line
          const strikeSin = Math.sin(rightProgress * Math.PI);
          visualAngle -= 0.18 * strikeSin;
          lungeOffset += strikeSin * fighter.radius * 0.35;
        } else if (stage === 3) {
          // S4 Straight Punch: Torso rotates driving rear cross with high momentum
          const strikeSin = Math.sin(rightProgress * Math.PI);
          visualAngle -= 0.40 * strikeSin;
          lungeOffset += strikeSin * fighter.radius * 0.6;
        }
      }
    } else if (fighter.styleId === 'capoeira') {
      const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
      const gingaTime = ((gameTime) % 120) / 120;

      const isM2Active = (fighter.heavyWindup && fighter.heavyWindup > 0) || (rightFist && rightFist.isHeavy && rightProgress > 0);

      if (isM2Active) {
        // M2 Windup & Execution: Absolutely locked in place facing the opponent! No displacement, no spin on torso.
        visualAngle = fighter.facingAngle;
      } else if (leftProgress > 0 && stage === 0) {
        // S1 Meia Lua de Frente: Torso channels momentum
        visualAngle -= Math.sin(leftProgress * Math.PI) * 0.35;
      } else if (rightProgress > 0 && stage === 1) {
        // S2 Martelo: Torso snaps parallel
        visualAngle += Math.sin(rightProgress * Math.PI) * 0.30;
      } else if (leftProgress > 0 && stage === 2) {
        // S3 Queixada: 180 spin away
        visualAngle += leftProgress * Math.PI;
      } else if (rightProgress > 0 && stage === 3) {
        // S4 Bênção: Linear drive
        visualAngle += Math.sin(rightProgress * Math.PI) * 0.2;
      } else if (fighter.capoeiraExhausted) {
        // S-Dobrada Exhaustion Roll
        visualAngle += gameTime * 0.25;
      } else {
        // Base Ginga Stance Idle & Block Loop (Continuous fluid rhythm matching the swaying arms)
        const sway = Math.sin(gingaTime * Math.PI * 2);
        visualAngle += sway * 0.28;
        lungeOffset += Math.cos(gingaTime * Math.PI * 2) * fighter.radius * 0.12;
      }
    } else if (fighter.styleId === 'kyokushin') {
      const isHeavy = rightFist && rightFist.isHeavy;
      const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);

      const isM2Active = (fighter.kyokushinM2Stage && fighter.kyokushinM2Stage !== null) ||
                         (fighter.heavyWindup && fighter.heavyWindup > 0) ||
                         (isHeavy && (rightProgress > 0 || ((fighter as any).kyokushinM2PeakHoldTimer || 0) > 0 || ((fighter as any).kyokushinM2FreezeTimer || 0) > 0));

      if (fighter.heavyWindup && fighter.heavyWindup > 0) {
        // Phase 1: Windup & Stance Anchor (33 frames = 0.55s)
        const ratio = Math.min(1.0, Math.max(0, (33 - fighter.heavyWindup) / 33));
        visualAngle += (-0.28) * ratio; // 90° chamber rotation
        lungeOffset -= 2.0 * ratio; // Main body circle drops 2px lower on Y-axis to ground weight (zero sway/bounce)
      } else if (isM2Active) {
        const isPunching = fighter.kyokushinM2Stage === 'thrust' || rightFist?.isPunching;
        const p = fighter.kyokushinM2Progress !== undefined ? fighter.kyokushinM2Progress : rightProgress;
        const isPeakLock = fighter.kyokushinM2Stage === 'freeze' || ((fighter as any).kyokushinM2FreezeTimer || 0) > 0 || ((fighter as any).kyokushinM2PeakHoldTimer || 0) > 0;
        if (isPunching) {
          // Phase 2: Explosive Piston Thrust (snaps forward)
          visualAngle += (-0.28) * (1 - p) + 0.28 * p;
          lungeOffset += p * fighter.radius * 0.45;
        } else if (isPeakLock) {
          // Hit-Stop Freeze (Zero bounce / solid lock)
          visualAngle += 0.28;
          lungeOffset += fighter.radius * 0.45;
        } else {
          // Phase 3: Unified Retraction (Smooth deceleration back to neutral 0)
          const retractT = Math.min(1.0, Math.max(0, 1.0 - p));
          const ease = retractT * retractT * (3 - 2 * retractT); // Smoothstep
          visualAngle += 0.28 * (1 - ease);
          lungeOffset += (1 - ease) * fighter.radius * 0.45;
        }
      } else if (leftProgress > 0) {
        const strikeSin = Math.sin(leftProgress * Math.PI);
        if (stage === 0) {
          // S1: Chudan Seiken Tsuki (Lead Punch) - Snappy, fast 25% execution windup
          visualAngle += strikeSin * 0.18;
          lungeOffset += strikeSin * fighter.radius * 0.35;
        } else if (stage === 2) {
          // S3: Shotei Uchi (Open Palm) - Heavy palm thrust displacing guard line
          visualAngle += strikeSin * 0.28;
          lungeOffset += strikeSin * fighter.radius * 0.42;
        }
      } else if (rightProgress > 0) {
        const strikeSin = Math.sin(rightProgress * Math.PI);
        if (stage === 1) {
          // S2: Gedan Geri (Calf Kick) - Low shin chop attacking base
          visualAngle -= strikeSin * 0.25;
          lungeOffset += strikeSin * fighter.radius * 0.25;
        } else if (stage === 3) {
          // S4: Full-Charge Right Palm - Finisher driving forward with massive kinetic pushback
          visualAngle -= strikeSin * 0.45;
          lungeOffset += strikeSin * fighter.radius * 0.65;
        }
      } else if (isBlockingActive) {
        // Fudo Dachi Rooted Guard (100% Rooted movement)
        lungeOffset = 0;
      } else {
        const isWindupOrM2 = (fighter.heavyWindup && fighter.heavyWindup > 0) || isHeavy;
        const bounce = isWindupOrM2 ? 0 : Math.sin(gameTime * 0.12) * 1.5;
        lungeOffset += bounce;
      }
    } else if (fighter.styleId === 'keysi') {
      const isHeavy = rightFist && rightFist.isHeavy;
      const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);

      if (fighter.keysiClinchStage === 'delay') {
        // M2 Grab Delay: Smoothly pushes forward as elbows reach to clamp the enemy circle
        const p = 1 - ((fighter.keysiClinchTimer || 0) / 8);
        const pEase = Math.sin(p * Math.PI * 0.5);
        lungeOffset += fighter.radius * (0.15 + 0.30 * pEase);
      } else if (fighter.keysiClinchStage === 'clinch') {
        // M2 Clinch & Headbutt (38 frames total = ~0.63s):
        // Frames 38..22 (16 frames = ~0.27s): Clamps enemy head with elbows, only the circle coils back
        // Frames 21..14 (8 frames = ~0.13s): Circle dives violently forward into enemy head
        // Frames 13..0 (14 frames = ~0.23s): Head holds on enemy face (13..7) then releases back to Pensador guard (6..0)
        const clinchTimer = fighter.keysiClinchTimer || 0;
        if (clinchTimer > 21) {
          // Circle head coils back smoothly while arms stay locked clamping opponent
          const coilP = (38 - clinchTimer) / 16;
          const coilEase = Math.sin(coilP * Math.PI * 0.5);
          lungeOffset += (fighter.radius * 0.45) - (fighter.radius * 1.10) * coilEase;
          visualAngle -= 0.15 * coilEase;
        } else if (clinchTimer >= 14) {
          // Circle head dives forward into the opponent's face
          const diveP = (21 - clinchTimer) / 7;
          const diveEase = Math.sin(diveP * Math.PI * 0.5);
          lungeOffset += (-fighter.radius * 0.65) + (fighter.radius * 1.40) * diveEase;
          visualAngle += (-0.15) + 0.35 * diveEase;
        } else if (clinchTimer >= 7) {
          // Head stays pressed against opponent after impact
          lungeOffset += fighter.radius * 0.75;
          visualAngle += 0.20;
        } else {
          // Smooth return to neutral stance as clamp releases
          const recP = clinchTimer / 7;
          lungeOffset += (fighter.radius * 0.75) * recP;
          visualAngle += 0.20 * recP;
        }
      } else if (fighter.heavyWindup && fighter.heavyWindup > 0) {
        // Windup: Fighter leans in slightly as elbows flare wide open
        const maxW = fighter.maxHeavyWindup || (fighter.keysiHasSuperArmor ? 6 : 26);
        const ratio = Math.min(1, Math.max(0, (maxW - fighter.heavyWindup) / maxW));
        lungeOffset += Math.sin(ratio * Math.PI * 0.5) * fighter.radius * 0.15;
      } else if (isHeavy && rightProgress > 0) {
        const strikeSin = Math.sin(rightProgress * Math.PI);
        lungeOffset += strikeSin * fighter.radius * 0.40;
        visualAngle -= strikeSin * 0.25;
      } else if (leftProgress > 0) {
        const strikeSin = Math.sin(leftProgress * Math.PI);
        if (stage === 0) {
          // S1 Lead Forearm Wedge: Sharp aggressive forward wedge with torso tuck
          visualAngle += strikeSin * 0.18;
          lungeOffset += strikeSin * fighter.radius * 0.35;
        } else if (stage === 2) {
          // S3 Elbow Swing: pulls back to the right then swings to the left while rotating to the left before returning
          const p = leftProgress;
          const isForward = leftFist ? leftFist.isPunching : false;
          let rotAngle = 0;
          if (isForward) {
            if (p < 0.25) {
              // Pulls back to the right (coil)
              const t = p / 0.25;
              rotAngle = Math.sin(t * Math.PI * 0.5) * 0.20;
            } else {
              // Drives through swinging to the left while rotating to the left
              const t = (p - 0.25) / 0.75;
              const swingT = Math.sin(t * Math.PI * 0.5);
              rotAngle = 0.20 * (1 - swingT) - 0.55 * swingT;
            }
          } else {
            // Smoothly returns to neutral
            const returnT = p * p * (3 - 2 * p);
            rotAngle = -0.55 * returnT;
          }
          visualAngle += rotAngle;
          lungeOffset += strikeSin * fighter.radius * 0.40;
        }
      } else if (rightProgress > 0) {
        const strikeSin = Math.sin(rightProgress * Math.PI);
        if (stage === 1) {
          // S2 Rear Forearm Smash: Heavy rotational forearm strike
          visualAngle -= strikeSin * 0.22;
          lungeOffset += strikeSin * fighter.radius * 0.35;
        } else if (stage === 3) {
          // S4 Heavy Pocket Knee: Rotates body torso and pushes forward with deep hip lunge drive like Muay Thai Knee
          visualAngle -= strikeSin * 0.35;
          lungeOffset += strikeSin * fighter.radius * 0.80;
        }
      } else if (isBlockingActive) {
        // Crossed Forearm Guard: Solid grounded squared-up stance
        lungeOffset -= fighter.radius * 0.05;
      } else {
        // Pensador Stance Idle: Micro-weaving motion
        const weave = Math.sin(gameTime * 0.12) * 1.5;
        lungeOffset += weave;
        visualAngle += Math.sin(gameTime * 0.09) * 0.03;
      }
    } else if (fighter.styleId === 'cqc') {
      const isM2Assault = fighter.cqcM2Stage === 'assault';
      const isM2Dash = fighter.cqcM2Stage === 'dash';
      const isM2Windup = (fighter.heavyWindup && fighter.heavyWindup > 0) || fighter.cqcM2Stage === 'windup';
      const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);

      if (isM2Dash) {
        // High speed tactical lunge streak
        lungeOffset += fighter.radius * 0.85;
        if (fighter.cqcLockedAngle !== undefined) {
          visualAngle = fighter.cqcLockedAngle;
        }
      } else if (isM2Assault) {
        // CQC remains firmly looking away until the attack is over
        if (fighter.cqcLockedAngle !== undefined) {
          visualAngle = fighter.cqcLockedAngle;
        }
      } else if (isM2Windup) {
        // Windup before dash
      } else if (leftProgress > 0) {
        const strikeSin = Math.sin(leftProgress * Math.PI);
        if (stage === 0) {
          // S1 Left Open Palm: Retracts then drives forward
          lungeOffset += strikeSin * fighter.radius * 0.35;
          visualAngle += strikeSin * 0.15;
        } else if (stage === 2) {
          // S3 Forearm Strike: 45 degree rotational sweep
          visualAngle += strikeSin * 0.45;
          lungeOffset += strikeSin * fighter.radius * 0.30;
        }
      } else if (rightProgress > 0) {
        const strikeSin = Math.sin(rightProgress * Math.PI);
        if (stage === 1) {
          // S2 Right Open Palm: Fast palm thrust
          lungeOffset += strikeSin * fighter.radius * 0.35;
          visualAngle -= strikeSin * 0.15;
        } else if (stage === 3) {
          // S4 Front Straight Punch: Full linear extension thrust
          lungeOffset += strikeSin * fighter.radius * 0.55;
          visualAngle -= strikeSin * 0.20;
        }
      } else if (isBlockingActive) {
        // Tight High Tactical Guard
        lungeOffset -= fighter.radius * 0.04;
      } else {
        // Tactical Stance Idle: Subtle breathing oscillation
        const microOsc = Math.sin(gameTime * 0.10) * 0.8;
        lungeOffset += microOsc;
      }
    } else if (fighter.styleId === 'boxing_shell') {
      const isM2Active = (fighter.heavyWindup && fighter.heavyWindup > 0) || (rightProgress > 0 && rightFist && rightFist.isHeavy) || (leftProgress > 0 && leftFist && leftFist.isHeavy);
      const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);

      const baseStanceAngle = 1.05; // Iron Boxing stance base angle
      
      // Iron Boxing Stance Animation: Slower quintic smoothstep body rotation with 0.15s end pauses
      const ironSwayFactor = getIronSwayFactor(gameTime);
      const ironBodySway = ironSwayFactor * 0.18; // ~10.3 degrees total sway range

      if (isM2Active) {
        // Heavy Strike (M2): Fast Shoulder Roll (rolls ~62° to deflect before quickly pulling back into stance)
        const maxRollAngle = 62 * Math.PI / 180; // ~1.08 rad (at least 60 degrees deflection roll)
        let rollAngle = 0;
        if (fighter.heavyWindup && fighter.heavyWindup > 0) {
          const w = (8 - fighter.heavyWindup) / 8;
          // Quick initial coil: rolls lead shoulder up and back
          rollAngle = Math.sin(w * Math.PI / 2) * maxRollAngle * 0.35;
        } else {
          const isForward = rightFist ? rightFist.isPunching : false;
          if (isForward) {
            // Quick, snappy roll forward reaching 60+ degrees
            const snapT = 1 - Math.pow(1 - rightProgress, 2.6);
            rollAngle = maxRollAngle * snapT;
          } else {
            // Smoothly and quickly pulls back into stance
            const returnT = rightProgress * rightProgress * (3 - 2 * rightProgress);
            rollAngle = maxRollAngle * returnT;
          }
        }
        visualAngle -= (baseStanceAngle - rollAngle);
        lungeOffset += Math.sin((rollAngle / maxRollAngle) * Math.PI) * fighter.radius * 0.18;
      } else if (isBlockingActive) {
        // Tucked Shoulder Roll Guard (facing to the left)
        visualAngle -= 1.20;
        lungeOffset -= fighter.radius * 0.05;
      } else if (stage === 2 && leftProgress > 0) {
        // S3: Snappy & smooth body rotation to the right!
        const isForward = leftFist ? leftFist.isPunching : false;
        const sFactor = isForward 
          ? (Math.sin(leftProgress * Math.PI * 0.5) * 0.35 + (1 - Math.pow(1 - leftProgress, 2.2)) * 0.65) 
          : (leftProgress * leftProgress * (3 - 2 * leftProgress));
        const turnRight = 2.15 * sFactor; // Rotates from -1.15 through 0 to +1.00 to the right
        visualAngle -= (baseStanceAngle - turnRight);
        lungeOffset += sFactor * fighter.radius * 0.35;
      } else if (stage === 3 && leftProgress > 0) {
        // S4: Looping overhead hook - chamber pullback then deep torso rotation to the right!
        const isForward = leftFist ? leftFist.isPunching : false;
        let sFactor = 0;
        let pullback = 0;
        if (isForward) {
          if (leftProgress < 0.28) {
            const wT = leftProgress / 0.28;
            pullback = 0.25 * Math.sin(wT * Math.PI / 2);
            sFactor = 0;
          } else {
            const sT = (leftProgress - 0.28) / 0.72;
            pullback = 0.25 * Math.cos(sT * Math.PI / 2);
            sFactor = Math.sin(sT * Math.PI * 0.5) * 0.35 + (1 - Math.pow(1 - sT, 2.2)) * 0.65;
          }
        } else {
          sFactor = leftProgress * leftProgress * (3 - 2 * leftProgress);
        }
        // Deep rotation: drives through to +1.15 rad to the right
        visualAngle -= (baseStanceAngle + pullback - sFactor * 2.30);
        lungeOffset += sFactor * fighter.radius * 0.45;
      } else if (fighter.isPostureLocked && fighter.postureCd && fighter.maxPostureCd) {
        // Posture recovery alignment: stays facing forward/left with rhythmic body weave
        visualAngle -= (baseStanceAngle + ironBodySway);
        lungeOffset += Math.sin(ironSwayFactor * Math.PI * 0.5) * fighter.radius * 0.06;
      } else if (rightProgress > 0) {
        // S1 & S2: Lead Right Arm Jab - Step 1 coils back in Philly Shell, Step 2 snaps forward with straight jab!
        const isForward = rightFist ? rightFist.isPunching : false;
        const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
        const chargeLimit = stage === 0 ? 0.28 : 0.24;

        if (isForward && rightProgress < chargeLimit) {
          // Windup: Curled arm and torso pull back smoothly in chamber
          const wT = rightProgress / chargeLimit;
          const coilEase = Math.sin(wT * Math.PI * 0.5);
          visualAngle -= (baseStanceAngle + coilEase * 0.08);
          lungeOffset -= coilEase * fighter.radius * 0.08;
        } else {
          // Straight punch extension: Snaps straight forward with continuous smooth torso drive
          const snapT = isForward 
            ? Math.max(0, (rightProgress - chargeLimit) / (1.0 - chargeLimit))
            : rightProgress;
          const snapFactor = isForward 
            ? (1 - Math.pow(1 - snapT, 3.2))
            : (rightProgress * rightProgress * (3 - 2 * rightProgress));
          const torque = isForward ? (-0.08 * (1 - snapFactor) + 0.16 * snapFactor) : (0.16 * snapFactor);
          visualAngle -= (baseStanceAngle - torque);
          lungeOffset += snapFactor * fighter.radius * 0.38;
        }
      } else {
        // Stance Idle: Iron Boxing Rhythmic body sway with 0.15s pauses at ends
        visualAngle -= (baseStanceAngle + ironBodySway);
        lungeOffset += Math.sin(ironSwayFactor * Math.PI * 0.5) * fighter.radius * 0.08;
      }
    } else if (fighter.styleId === 'aikido') {
      const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
      // Aikido Hanmi Stance: Crisp triangular 28° stance angle
      const baseStanceAngle = -0.48;

      if (rightProgress > 0 && stage === 0) {
        // Sequence 1: Straight Forward Open-Palm Thrust directly towards opponent
        // Slower deliberate pullback with deep shoulder/torso coil, then explosive straight-line push along centerline
        const isForward = rightFist ? rightFist.isPunching : false;
        const windupSplit = 0.52;
        if (isForward) {
          if (rightProgress < windupSplit) {
            // Windup / Charge phase: slow deliberate pullback and deep coil in Hanmi
            const wT = rightProgress / windupSplit;
            const windupRatio = Math.sin(wT * Math.PI * 0.5);
            visualAngle += baseStanceAngle - windupRatio * 0.28;
            lungeOffset -= windupRatio * fighter.radius * 0.22;
          } else {
            // Explosive straight thrust: body drives forward into the palm strike
            const thrustT = (rightProgress - windupSplit) / (1 - windupSplit);
            const thrustEase = 1 - Math.pow(1 - thrustT, 3.2);
            visualAngle += (baseStanceAngle - 0.28) * (1 - thrustEase) + 0.18 * thrustEase;
            lungeOffset += (-0.22 * (1 - thrustEase) + thrustEase * 0.55) * fighter.radius;
          }
        } else {
          // Smooth return to Hanmi stance
          const retEase = rightProgress * rightProgress * (3 - 2 * rightProgress);
          visualAngle += baseStanceAngle * (1 - retEase) + 0.18 * retEase;
          lungeOffset += retEase * fighter.radius * 0.55;
        }
      } else if (leftProgress > 0 && (stage === 1 || leftFist?.comboStage === 1 || fighter.comboStage === 1 || fighter.comboStage === 2)) {
        // Sequence 2: Left arm sweep pullback is longer to the back, then rotates far to the right
        // Torso primes left on the long pullback, then rotates much further to the right through the full circle slash
        const isForward = leftFist ? leftFist.isPunching : false;
        const windupSplit = 0.44;
        if (isForward) {
          if (leftProgress < windupSplit) {
            const wT = leftProgress / windupSplit;
            const windupLeft = Math.sin(wT * Math.PI * 0.5);
            visualAngle += baseStanceAngle - windupLeft * 0.35;
            lungeOffset += windupLeft * fighter.radius * 0.05;
          } else {
            const sT = (leftProgress - windupSplit) / (1 - windupSplit);
            const slashEase = 0.5 - 0.5 * Math.cos(sT * Math.PI);
            visualAngle += (baseStanceAngle - 0.35) + slashEase * (1.55 - (baseStanceAngle - 0.35));
            lungeOffset += (0.05 + Math.sin(sT * Math.PI * 0.5) * 0.35) * fighter.radius;
          }
        } else {
          const retEase = leftProgress * leftProgress * (3 - 2 * leftProgress);
          visualAngle += baseStanceAngle + retEase * 1.55;
          lungeOffset += retEase * fighter.radius * 0.35;
        }
      } else if (rightProgress > 0 && stage === 2) {
        // Sequence 3: Tenkan Pivot Strike (Rotational Off-Balance)
        // Flowing, silky smooth circular body turn stepping outside opponent attack line
        const tenkanEase = Math.sin(rightProgress * Math.PI);
        visualAngle += baseStanceAngle + tenkanEase * 0.52;
        lungeOffset += tenkanEase * fighter.radius * 0.36;
      } else if (rightProgress > 0 && stage === 3) {
        // Sequence 4: Shomenuchi Palm Drive (Downward Collar Finisher)
        // Squares hips (visualAngle -> 0) while raising arm high, then chops downward into core
        const isForward = rightFist ? rightFist.isPunching : false;
        const windupSplit = 0.60;
        if (isForward) {
          if (rightProgress < windupSplit) {
            const wT = rightProgress / windupSplit;
            const elevEase = Math.sin(wT * Math.PI * 0.5);
            visualAngle += baseStanceAngle * (1 - elevEase);
            lungeOffset -= elevEase * fighter.radius * 0.15;
          } else {
            const dT = (rightProgress - windupSplit) / (1 - windupSplit);
            const chopEase = 1 - Math.pow(1 - dT, 3.5);
            visualAngle += 0; // Square with target
            lungeOffset += (-0.15 * (1 - chopEase) + chopEase * 0.65) * fighter.radius;
          }
        } else {
          const retEase = rightProgress * rightProgress * (3 - 2 * rightProgress);
          visualAngle += baseStanceAngle * (1 - retEase);
          lungeOffset += retEase * fighter.radius * 0.50;
        }
      } else if (isBlockingActive) {
        visualAngle += baseStanceAngle - 0.10;
        lungeOffset -= fighter.radius * 0.05;
      } else {
        // Idle Hanmi Stance Harmonic Float: 1.2 Hz smooth pulse (±1.5px along forward vector)
        const harmonicFloat = Math.sin(gameTime * 0.12566) * 1.5;
        visualAngle += baseStanceAngle;
        lungeOffset += harmonicFloat;
      }
    } else {
      // SECTION 1.12 & 1.16: Universal Torso Torque during extension; free rotation during retraction
      if (leftProgress > 0 && leftFist?.isPunching) {
        if (leftProgress < 0.18) {
          // Frame 1 Offset: 5° initial torque smoothly applied from 0
          const offsetT = leftProgress / 0.18;
          visualAngle += 0.087 * offsetT;
        } else {
          // Frames 2-5: Explodes to full ~18°-20° forward torso torque (~0.32 rad)
          const pT = (leftProgress - 0.18) / 0.82;
          const torque = 0.087 + Math.sin(pT * Math.PI * 0.5) * (0.32 - 0.087);
          visualAngle += torque;
          lungeOffset += Math.sin(pT * Math.PI * 0.5) * fighter.radius * 0.35;
        }
      } else if (rightProgress > 0 && rightFist?.isPunching) {
        if (rightProgress < 0.18) {
          const offsetT = rightProgress / 0.18;
          visualAngle -= 0.087 * offsetT;
        } else {
          const pT = (rightProgress - 0.18) / 0.82;
          const torque = 0.087 + Math.sin(pT * Math.PI * 0.5) * (0.32 - 0.087);
          visualAngle -= torque;
          lungeOffset += Math.sin(pT * Math.PI * 0.5) * fighter.radius * 0.35;
        }
      } else if (isBlockingActive) {
        lungeOffset -= fighter.radius * 0.05;
      }
    }
  }

  // Flow Boxing Sway Sprint Lateral Movement & Oscillation Rotation
  if (isFlowSwaySprinting) {
    const swayPhase = gameTime * 0.22;
    const swaySin = Math.sin(swayPhase);
    visualAngle += swaySin * 0.45; // Oscillate rotation left and right
    swayLateralOffset = swaySin * (fighter.radius * 0.65); // Move left and right laterally
  }

  // Universal Downed State Visual Rotation (Spin Out / Downed Slide on floor) - Disabled completely on Death
  const globalSpinTimer = (fighter.spinOutTimer || 0) > 0 ? fighter.spinOutTimer : ((fighter.kyokushinSpinOutTimer || 0) > 0 ? fighter.kyokushinSpinOutTimer : 0);
  if (!fighter.isDead && globalSpinTimer && globalSpinTimer > 0) {
    const spinProgress = (180 - globalSpinTimer) * 0.16;
    visualAngle += spinProgress;
  }

  // Boxing: Shell M2 On-Hit Spin (Target body circle spins in place for 1.5s / 90 frames)
  if (!fighter.isDead && fighter.shellSpinTimer && fighter.shellSpinTimer > 0) {
    const spinT = (90 - fighter.shellSpinTimer) / 90;
    const smoothSpin = Math.sin(spinT * Math.PI * 0.5);
    visualAngle += smoothSpin * Math.PI * 6; // Multi-rotational 360° spin out across 1.5s
  }

  // Aikido: S3 Tenkan On-Hit Rotational Off-Balance (Target rotated 20° / 0.35 rad)
  if (!fighter.isDead && fighter.aikiTenkanOffBalanceTimer && fighter.aikiTenkanOffBalanceTimer > 0) {
    const offBalanceRatio = Math.min(1.0, fighter.aikiTenkanOffBalanceTimer / 25);
    visualAngle += 0.35 * offBalanceRatio;
  }

  // Aikido Over-Head Grapple Slam: Attacker body torque during leverage phase (1.5s normalized)
  if (!fighter.isDead && fighter.styleId === 'aikido' && fighter.aikiSlamStage === 'lift') {
    const slamProgress = Math.min(1.0, Math.max(0, (90 - ((fighter as any).aikiSlamTimer || 0)) / 90));
    if (slamProgress >= 0.25 && slamProgress <= 0.70) {
      const pullT = (slamProgress - 0.25) / 0.45;
      visualAngle -= (Math.PI * 0.18) * Math.sin(pullT * Math.PI);
    }
  }

  // Aikido Over-Head Grapple Slam: Victim Downed 360° Floor Spin (0.45s / 27 frames)
  if (!fighter.isDead && fighter.aikiSpinDownTimer && fighter.aikiSpinDownTimer > 0) {
    const spinProgress = (27 - fighter.aikiSpinDownTimer) / 27;
    visualAngle += spinProgress * Math.PI * 2;
  }

  return { visualAngle, lungeOffset, swayLateralOffset };
};

/**
 * Checks if Super Armor visual effect is currently active.
 * The Super Armor visual only applies to Aikido.
 */
export function isFighterSuperArmorActive(fighter: CombatFighter): boolean {
  if (!fighter || fighter.isDead) return false;
  if (fighter.styleId !== 'aikido') return false;
  if (fighter.aikiM2StanceTimer && fighter.aikiM2StanceTimer > 0 && (fighter.aikiM2SuperArmorHits || 0) > 0) return true;
  return false;
}

export const drawFighter = (
  ctx: CanvasRenderingContext2D,
  fighter: CombatFighter,
  gameTime: number,
  settings?: GameSettings
) => {
  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // Aikido Slam Passive: Shaky Vision / Disorientation Body Jitter (1.0s)
  if (!fighter.isDead && fighter.aikiShakyVisionTimer && fighter.aikiShakyVisionTimer > 0) {
    const jitterMag = Math.min(1.0, fighter.aikiShakyVisionTimer / 60) * 3.5;
    const jx = (Math.random() * 2 - 1) * jitterMag;
    const jy = (Math.random() * 2 - 1) * jitterMag;
    ctx.translate(jx, jy);
  }

  // Aikido Over-Head Grapple Slam: Pseudo-3D Height Scaling (1.0x to 1.35x)
  if (fighter.aikiOverheadScale && fighter.aikiOverheadScale !== 1.0) {
    ctx.scale(fighter.aikiOverheadScale, fighter.aikiOverheadScale);
  }

  // Slow Disintegration Effect on Death:
  // Fades opacity and dissolves body smoothly as red, black, and white circle particles emanate
  if (fighter.isDead) {
    const disTimer = fighter.disintegrationTimer !== undefined ? fighter.disintegrationTimer : 180;
    const progress = Math.min(1.0, Math.max(0, 1.0 - (disTimer / 180)));
    ctx.globalAlpha = Math.max(0, 1.0 - progress);
  }

  if (!fighter.fists || !Array.isArray(fighter.fists) || fighter.fists.length < 2) {
    const r = (fighter.radius || 26) * 0.31;
    fighter.fists = [
      { id: 1, offsetX: 16, offsetY: -12, angle: 0, radius: r, isPunching: false, punchProgress: 0, punchType: 'left' },
      { id: 2, offsetX: 16, offsetY: 12, angle: 0, radius: r, isPunching: false, punchProgress: 0, punchType: 'right' }
    ];
  } else {
    if (!fighter.fists[0].punchType) fighter.fists[0].punchType = 'left';
    if (!fighter.fists[1].punchType) fighter.fists[1].punchType = 'right';
  }

  // Calculate dynamic visual angle of the fighter body including torque rotations from windups and punch follow-throughs
  const leftFist = fighter.fists.find(f => f.punchType === 'left') || fighter.fists[0];
  const rightFist = fighter.fists.find(f => f.punchType === 'right') || fighter.fists[1];
  const leftProgress = leftFist ? leftFist.punchProgress : 0;
  const rightProgress = rightFist ? rightFist.punchProgress : 0;
  const comboStage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);

  const isAshiharaS4IFrame = fighter.styleId === 'ashihara' && comboStage === 3 && rightProgress > 0;
  const isCapoeiraS3IFrame = fighter.styleId === 'capoeira' && comboStage === 2 && leftProgress > 0;

  let isBlockingActive = fighter.isBlocking || false;
  if (fighter.styleId === 'basic' && fighter.heavyWindup && fighter.heavyWindup > 0) {
    isBlockingActive = true;
  }

  const isFlowSwaySprinting = fighter.styleId === 'basic' && (fighter.isDashing || ((fighter.heavyWindup || 0) > 0));
  const isFlowPunchWarningRed = fighter.styleId === 'basic' && fighter.heavyWindup !== undefined && fighter.heavyWindup > 0 && fighter.heavyWindup <= 6;
  const isFlowBlackFlash = isFlowSwaySprinting && (Math.floor(gameTime * 0.22) % 2 === 0);

  const { visualAngle, lungeOffset, swayLateralOffset } = getFighterVisualTransform(fighter, gameTime);
  const isFlowRedFlash = isFlowPunchWarningRed && (Math.floor(gameTime * 0.45) % 2 === 0);

  // Super Armor Whole Body Flash Logic:
  // The Super Armor visual only applies to Aikido
  const isSuperArmorActive = fighter.styleId === 'aikido' && isFighterSuperArmorActive(fighter);
  if (isSuperArmorActive) {
    if (!fighter.superArmorPrevActive) {
      fighter.superArmorPrevActive = true;
      fighter.superArmorFlashTime = 24;
      fighter.superArmorFlashMaxTime = 24;
    } else if ((fighter.superArmorFlashTime || 0) <= 0) {
      // While continuously in super armor, smoothly re-trigger flash cycle
      fighter.superArmorFlashTime = 24;
      fighter.superArmorFlashMaxTime = 24;
    }
  } else {
    fighter.superArmorPrevActive = false;
  }

  const saFlashTime = fighter.styleId === 'aikido' ? (fighter.superArmorFlashTime || 0) : 0;
  const saFlashMax = fighter.superArmorFlashMaxTime || 24;
  const saFlashAlpha = (fighter.styleId === 'aikido' && saFlashTime > 0) ? Math.min(1.0, Math.max(0, saFlashTime / saFlashMax)) : 0;

  // Color flasher on hits, windups, parries, dodge, super armor flash, or I-Frames
  let mainColor = fighter.color;
  const isParrying = fighter.parryFlashTime !== undefined && fighter.parryFlashTime > 0;
  const isCapoeiraDodging = fighter.styleId === 'capoeira' && fighter.capoeiraDodgeFlashTime !== undefined && fighter.capoeiraDodgeFlashTime > 0;

  const isHeavyM2Punching = fighter.fists.some(f => f.isPunching && f.isHeavy);
  const isWindupIFrame = false;
  const isStrikeIFrame = isHeavyM2Punching && (fighter.styleId === 'shotokan' || fighter.styleId === 'capoeira');

  if (isParrying) {
    mainColor = '#facc15'; // solid gold yellow on parry
  } else if (isCapoeiraDodging) {
    // Rapid white flicker when dodging attacks during Ginga block (shows attack was dodged)
    const flickerWhite = (Math.floor(fighter.capoeiraDodgeFlashTime / 2) % 2 === 0);
    mainColor = flickerWhite ? '#ffffff' : fighter.color;
  } else if (fighter.damageFlashTime && fighter.damageFlashTime > 0) {
    mainColor = '#f43f5e'; // solid bright pink-red on hit
  } else if (fighter.styleId === 'basic' && (fighter.isDashing || fighter.flowS2HasIFrames || fighter.heavyWindup)) {
    if (isFlowPunchWarningRed) {
      // After 0.3s of M2 Sway Windup (6 frames remaining): Flashes red constantly to signal impending punch
      mainColor = isFlowRedFlash ? '#ef4444' : '#fee2e2';
    } else if (isFlowSwaySprinting) {
      mainColor = isFlowBlackFlash ? '#000000' : '#ffffff';
    } else {
      mainColor = '#00e5ff'; // Crisp cyan for Flow Boxing I-Frames
    }
  } else if (fighter.isDashing || (fighter.dashProgress && fighter.dashProgress > 0) || (fighter.dashWhiteFrameFlashTime && fighter.dashWhiteFrameFlashTime > 0)) {
    mainColor = '#ffffff'; // Section 2.8: White Frames (Super Armor during Dash)
  } else if (isAshiharaS4IFrame || isCapoeiraS3IFrame || isWindupIFrame || isStrikeIFrame) {
    mainColor = '#a855f7'; // Purple for I-Frames
  } else if (fighter.styleId === 'kyokushin' && ((fighter.heavyWindup && fighter.heavyWindup > 0) || isHeavyM2Punching)) {
    // Kyokushin M2 Super Armor Blue Flash (Windup & Attack execution)
    const pulseSpeed = 0.35;
    const wave = Math.sin(gameTime * pulseSpeed);
    mainColor = wave > 0 ? '#38bdf8' : '#0284c7';
  } else if (fighter.styleId === 'boxing_shell' && ((fighter.heavyWindup && fighter.heavyWindup > 0) || (fighter.fists.some(f => f.isPunching && f.isHeavy)))) {
    // Boxing: Shell Epic Purple Super Armor Flashing throughout entire M2 animation
    const pulseSpeed = 0.3;
    const wave = Math.sin(gameTime * pulseSpeed);
    mainColor = wave > 0 ? '#a855f7' : '#eab308';
  } else if (fighter.styleId === 'keysi' && fighter.keysiClinchStage === 'delay') {
    // Keysi M2 Grab Delay: Continues red and white strobe flashing as elbows reach to clamp
    const isRed = Math.floor(gameTime * 0.45) % 2 === 0;
    mainColor = isRed ? '#ef4444' : '#ffffff';
  } else if (fighter.heavyWindup && fighter.heavyWindup > 0) {
    if (fighter.styleId === 'keysi') {
      // Keysi M2 Windup: Red and white strobe flashing
      const isRed = Math.floor(gameTime * 0.45) % 2 === 0;
      mainColor = isRed ? '#ef4444' : '#ffffff';
    } else {
      // Windup Red Flashing (0.8s)
      const pulseSpeed = 0.3;
      const wave = Math.sin(gameTime * pulseSpeed);
      mainColor = wave > 0 ? '#ef4444' : fighter.color;
    }
  }

  // Draw reach boundary helper line under player
  if (fighter.isPlayer) {
    ctx.strokeStyle = isParrying ? 'rgba(234, 179, 8, 0.4)' : 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = isParrying ? 2.5 : 1;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius * 1.55, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Persistent Cripple Speed Debuff Ring (Pulsing at 1.0 Hz in dark purple)
  if (fighter.crippleTime && fighter.crippleTime > 0) {
    ctx.save();
    const pulse1Hz = Math.sin(gameTime * 0.1047) * 0.15 + 0.85;
    ctx.strokeStyle = 'rgba(147, 51, 234, 0.85)'; // Dark purple
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#9333ea';
    ctx.shadowBlur = 9;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius * 1.35 * pulse1Hz, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(168, 85, 247, 0.50)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius * 1.15, (gameTime * 0.06) % (Math.PI * 2), (gameTime * 0.06) % (Math.PI * 2) + Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Boxing: Shell Posture Recovery Boost Ring (Pulsing magenta & metallic silver aura for 3.0s)
  if (fighter.shellPostureBoostTimer && fighter.shellPostureBoostTimer > 0) {
    ctx.save();
    const pulse = Math.sin(gameTime * 0.20) * 0.12 + 1.0;
    ctx.strokeStyle = '#d946ef'; // Vivid Magenta
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#e879f9';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius * 1.45 * pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#f0abfc';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius * 1.25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Boxing: Shell Super Armor Radiant Aura (Glowing purple & amber rings throughout entire M2 animation)
  if (fighter.styleId === 'boxing_shell' && ((fighter.heavyWindup && fighter.heavyWindup > 0) || (fighter.fists.some(f => f.isPunching && f.isHeavy)))) {
    ctx.save();
    const auraPulse = Math.sin(gameTime * 0.25) * 0.12 + 1.0;
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 3.0;
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius * 1.35 * auraPulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius * 1.15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Kyokushin: Super Armor Radiant Blue Aura (Glowing electric cyan & deep azure rings throughout M2 windup and attack)
  if (fighter.styleId === 'kyokushin' && ((fighter.heavyWindup && fighter.heavyWindup > 0) || isHeavyM2Punching)) {
    ctx.save();
    const auraPulse = Math.sin(gameTime * 0.28) * 0.12 + 1.0;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3.0;
    ctx.shadowColor = '#0ea5e9';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius * 1.35 * auraPulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 9;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius * 1.15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Kyokushin M2 Debuff: Crackling Purple Electricity & Branching Lightning Effects (#A855F7 / #D8B4FE / #FFFFFF)
  if (fighter.kyokushinSpiralTimer && fighter.kyokushinSpiralTimer > 0) {
    ctx.save();
    const progressRatio = fighter.kyokushinSpiralTimer / 150;
    const alpha = Math.min(1.0, progressRatio * 1.6);

    // Fast crackle seed updates every 2 frames for rapid, sharp lightning flicker
    const crackleTick = Math.floor(gameTime / 2);
    const pseudoRand = (seed: number) => {
      const x = Math.sin(seed * 12.9898 + crackleTick * 78.233) * 43758.5453;
      return x - Math.floor(x);
    };

    // Helper to draw a jagged lightning bolt between two points with branches
    const drawLightningSegment = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      displace: number,
      branchDepth: number = 0
    ) => {
      const segs = 5;
      const points: Array<{ x: number; y: number }> = [{ x: x1, y: y1 }];
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      if (len < 2) return;
      const nx = -dy / len;
      const ny = dx / len;

      for (let i = 1; i < segs; i++) {
        const t = i / segs;
        const jMag = (pseudoRand(i * 37 + branchDepth * 91) - 0.5) * 2 * displace;
        const px = x1 + dx * t + nx * jMag;
        const py = y1 + dy * t + ny * jMag;
        points.push({ x: px, y: py });

        // Branching fork
        if (branchDepth < 1 && pseudoRand(i * 43 + 7) > 0.62) {
          const forkAngle = Math.atan2(dy, dx) + (pseudoRand(i * 19) > 0.5 ? 0.65 : -0.65);
          const forkLen = len * (0.35 + pseudoRand(i * 29) * 0.35);
          const fx2 = px + Math.cos(forkAngle) * forkLen;
          const fy2 = py + Math.sin(forkAngle) * forkLen;
          drawLightningSegment(px, py, fx2, fy2, displace * 0.6, branchDepth + 1);
        }
      }
      points.push({ x: x2, y: y2 });

      // Outer plasma glow
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let k = 1; k < points.length; k++) {
        ctx.lineTo(points[k].x, points[k].y);
      }
      ctx.strokeStyle = branchDepth === 0 ? `rgba(168, 85, 247, ${alpha * 0.9})` : `rgba(192, 132, 252, ${alpha * 0.75})`;
      ctx.lineWidth = branchDepth === 0 ? 2.8 : 1.6;
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 10;
      ctx.stroke();

      // Inner white-hot electric core
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let k = 1; k < points.length; k++) {
        ctx.lineTo(points[k].x, points[k].y);
      }
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
      ctx.lineWidth = branchDepth === 0 ? 1.2 : 0.8;
      ctx.shadowBlur = 4;
      ctx.stroke();
    };

    // 1. Primary perimeter & surface crackling lightning bolts
    const numBolts = 4;
    for (let b = 0; b < numBolts; b++) {
      const a1 = (b * (Math.PI * 2 / numBolts)) + pseudoRand(b * 13) * 0.8;
      const a2 = a1 + 0.9 + pseudoRand(b * 23) * 0.7;
      const r1 = fighter.radius * (0.80 + pseudoRand(b * 31) * 0.45);
      const r2 = fighter.radius * (0.80 + pseudoRand(b * 41) * 0.45);
      const x1 = Math.cos(a1) * r1;
      const y1 = Math.sin(a1) * r1;
      const x2 = Math.cos(a2) * r2;
      const y2 = Math.sin(a2) * r2;
      drawLightningSegment(x1, y1, x2, y2, fighter.radius * 0.28);
    }

    // 2. Cross-body electric discharge arcs
    const crossArcs = 2;
    for (let c = 0; c < crossArcs; c++) {
      const ca1 = pseudoRand(c * 53 + 100) * Math.PI * 2;
      const ca2 = ca1 + Math.PI * 0.8 + pseudoRand(c * 67 + 100) * 0.4;
      const cx1 = Math.cos(ca1) * fighter.radius * 0.9;
      const cy1 = Math.sin(ca1) * fighter.radius * 0.9;
      const cx2 = Math.cos(ca2) * fighter.radius * 0.9;
      const cy2 = Math.sin(ca2) * fighter.radius * 0.9;
      drawLightningSegment(cx1, cy1, cx2, cy2, fighter.radius * 0.22);
    }

    // 3. Crackling static spark bursts
    const sparkCount = 6;
    for (let s = 0; s < sparkCount; s++) {
      const sa = pseudoRand(s * 71 + 200) * Math.PI * 2;
      const sDist = fighter.radius * (0.95 + pseudoRand(s * 83 + 200) * 0.45);
      const sx = Math.cos(sa) * sDist;
      const sy = Math.sin(sa) * sDist;
      const sparkSize = 2.0 + pseudoRand(s * 97) * 2.2;

      // Star/diamond electric spark flash
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#d8b4fe';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(sx - sparkSize, sy);
      ctx.lineTo(sx, sy - sparkSize * 0.4);
      ctx.lineTo(sx + sparkSize, sy);
      ctx.lineTo(sx, sy + sparkSize * 0.4);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(sx, sy - sparkSize);
      ctx.lineTo(sx + sparkSize * 0.4, sy);
      ctx.lineTo(sx, sy + sparkSize);
      ctx.lineTo(sx - sparkSize * 0.4, sy);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }





  // Aikido: Red Crossed-Actions Lockout Icon flashing above victim's head circle for 0.5s
  if ((fighter.aikiLockoutTimer && fighter.aikiLockoutTimer > 0) || (fighter.aikiSpinDownTimer && fighter.aikiSpinDownTimer > 0)) {
    ctx.save();
    // Rapid flash rate for lockout urgency
    const flashPhase = (gameTime * 0.45) % (Math.PI * 2);
    const badgePulse = Math.sin(flashPhase) * 0.15 + 1.0;
    const badgeY = -fighter.radius * 1.85;

    // Glowing red aura
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 14;

    // Outer red circular perimeter ring
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, badgeY, 13 * badgePulse, 0, Math.PI * 2);
    ctx.stroke();

    // Dark crimson translucent backing plate
    ctx.fillStyle = 'rgba(220, 38, 38, 0.35)';
    ctx.beginPath();
    ctx.arc(0, badgeY, 11 * badgePulse, 0, Math.PI * 2);
    ctx.fill();

    // Red Crossed-Actions Symbol: Two bold crossed diagonal bars 'X' with white core
    const crossSize = 6.2 * badgePulse;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-crossSize, badgeY - crossSize);
    ctx.lineTo(crossSize, badgeY + crossSize);
    ctx.moveTo(crossSize, badgeY - crossSize);
    ctx.lineTo(-crossSize, badgeY + crossSize);
    ctx.stroke();

    // Sharp white core inside the red cross
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-crossSize, badgeY - crossSize);
    ctx.lineTo(crossSize, badgeY + crossSize);
    ctx.moveTo(crossSize, badgeY - crossSize);
    ctx.lineTo(-crossSize, badgeY + crossSize);
    ctx.stroke();

    ctx.restore();
  }

  // Boxing: Shell M2 Spin Lockout Indicator over target (Purple/Red Lockout badge)
  if (fighter.shellLockoutTimer && fighter.shellLockoutTimer > 0) {
    ctx.save();
    const badgePulse = Math.sin(gameTime * 0.35) * 0.15 + 1.0;
    const badgeY = -fighter.radius * 1.65;
    
    // Outer red glow ring
    ctx.strokeStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, badgeY, 11 * badgePulse, 0, Math.PI * 2);
    ctx.stroke();

    // Inner deep purple badge core
    ctx.fillStyle = '#7e22ce';
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, badgeY, 9, 0, Math.PI * 2);
    ctx.fill();

    // Lockout Padlock Symbol
    // Shackle
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, badgeY - 2.5, 3.2, Math.PI, 0);
    ctx.stroke();
    // Body
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-4, badgeY - 2.5, 8, 7);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-4, badgeY - 2.5, 8, 7);
    // Keyhole / center mark
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, badgeY + 1, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // CQC Echo Rings (3 Concentric red expanding rings during 1.5s heavy windup)
  if (fighter.styleId === 'cqc' && fighter.cqcRings && fighter.cqcRings.length > 0) {
    ctx.save();
    fighter.cqcRings.forEach((ring) => {
      if (ring.r <= 2) return;
      ctx.beginPath();
      ctx.arc(0, 0, ring.r, 0, Math.PI * 2);
      ctx.strokeStyle = ring.frozen ? '#ef4444' : 'rgba(239, 68, 68, 0.9)';
      ctx.lineWidth = ring.frozen ? 3.0 : 2.5;
      ctx.stroke();
    });
    ctx.restore();
  }

  // DRAW STATIONARY FLOOR HAND PIVOTS FOR CAPOEIRA M2 (BEFORE ROTATION)
  if (fighter.styleId === 'capoeira') {
    const isM2Active = (fighter.heavyWindup && fighter.heavyWindup > 0) || (rightProgress > 0 && rightFist && rightFist.isHeavy);
    if (isM2Active) {
      ctx.save();
      const handOffset = fighter.radius * 0.65;
      const handW = fighter.radius * 0.8;
      const handH = fighter.radius * 0.55;

      // Draw Left Hand (Planted flat)
      ctx.save();
      ctx.translate(-fighter.radius * 0.3, -handOffset);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.roundRect(-handW/2 + 2, -handH/2 + 2, handW, handH, 3);
      ctx.fill();
      ctx.fillStyle = fighter.color;
      ctx.strokeStyle = '#111115';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-handW/2, -handH/2, handW, handH, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(-handW/4, -handH/2 + 1, handW/4, handH - 2);
      ctx.restore();

      // Draw Right Hand (Planted flat)
      ctx.save();
      ctx.translate(-fighter.radius * 0.3, handOffset);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.roundRect(-handW/2 + 2, -handH/2 + 2, handW, handH, 3);
      ctx.fill();
      ctx.fillStyle = fighter.color;
      ctx.strokeStyle = '#111115';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-handW/2, -handH/2, handW, handH, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(-handW/4, -handH/2 + 1, handW/4, handH - 2);
      ctx.restore();

      ctx.restore();
    }
  }

  // Record and render Flow Boxing Sway Sprint White After-Image Ghosts
  if (isFlowSwaySprinting) {
    const cosF = Math.cos(visualAngle);
    const sinF = Math.sin(visualAngle);
    const curWorldX = fighter.x + (cosF * lungeOffset - sinF * swayLateralOffset);
    const curWorldY = fighter.y + (sinF * lungeOffset + cosF * swayLateralOffset);

    let ghosts = flowSwayGhostMap.get(fighter);
    if (!ghosts) {
      ghosts = [];
      flowSwayGhostMap.set(fighter, ghosts);
    }

    const lastTime = ghosts.length > 0 ? ghosts[ghosts.length - 1].time : 0;
    if (gameTime - lastTime >= 2) {
      ghosts.push({
        worldX: curWorldX,
        worldY: curWorldY,
        visualAngle,
        radius: fighter.radius,
        time: gameTime,
        isBlackFlash: isFlowBlackFlash
      });
      if (ghosts.length > 8) ghosts.shift();
    }

    ghosts.forEach((ghost) => {
      const age = gameTime - ghost.time;
      if (age <= 18) {
        const alpha = (1 - age / 18) * 0.68;
        ctx.save();
        ctx.translate(ghost.worldX - fighter.x, ghost.worldY - fighter.y);
        ctx.rotate(ghost.visualAngle);

        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 12;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
        ctx.lineWidth = 2.0;

        // Body circle ghost after-image
        ctx.beginPath();
        ctx.arc(0, 0, ghost.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Head circle ghost after-image
        ctx.beginPath();
        ctx.arc(ghost.radius * 0.22, 0, ghost.radius * 0.38, 0, Math.PI * 2);
        ctx.fill();

        // Blocking arm guard fists ghost after-image
        ctx.beginPath();
        ctx.arc(ghost.radius * 0.75, -ghost.radius * 0.18, ghost.radius * 0.32, 0, Math.PI * 2);
        ctx.arc(ghost.radius * 0.68, ghost.radius * 0.22, ghost.radius * 0.32, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    });
  } else {
    const ghosts = flowSwayGhostMap.get(fighter);
    if (ghosts && ghosts.length > 0) {
      ghosts.length = 0;
    }
  }

  ctx.rotate(visualAngle);
  if (lungeOffset !== 0 || swayLateralOffset !== 0) {
    ctx.translate(lungeOffset, swayLateralOffset);
  }

  // 1. Draw Body Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.arc(3, 3, fighter.radius, 0, Math.PI * 2);
  ctx.fill();

  // DRAW ASHIHARA KARATE KICKS & SWEEPS
  if (fighter.styleId === 'ashihara') {
    const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
    const isM2Active = (fighter.ashiharaM2Stage && fighter.ashiharaM2Stage > 0) || (fighter.heavyWindup && fighter.heavyWindup > 0) || (rightFist && rightFist.isHeavy);

    if (rightProgress > 0 && stage === 3 && !isM2Active) {
      const ease = Math.pow(rightProgress, 0.9);
      const startAngle = -Math.PI * 0.35;
      const endAngle = Math.PI * 0.45;
      const sweepAngle = startAngle + ease * (endAngle - startAngle);
      const dist = fighter.radius * 1.35;

      const rectX = Math.cos(sweepAngle) * dist;
      const rectY = Math.sin(sweepAngle) * dist;
      const legW = fighter.radius * 2.1;
      const legH = fighter.radius * 0.70;

      ctx.save();
      ctx.translate(rectX, rectY);
      ctx.rotate(sweepAngle);

      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.roundRect(-legW / 2, -legH / 2 + 3, legW, legH, 3);
      ctx.fill();

      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(-legW / 2, -legH / 2, legW, legH, 3);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    if (leftProgress > 0 && stage === 1 && !isM2Active) {
      const ease = Math.pow(leftProgress, 0.85);
      const kickAngle = 0.25 + ease * 0.4;
      const dist = fighter.radius * 1.35;
      const rectX = Math.cos(kickAngle) * dist + fighter.radius * 0.2;
      const rectY = Math.sin(kickAngle) * dist - fighter.radius * 0.1;

      const rectW = fighter.radius * 1.85;
      const rectH = fighter.radius * 0.72;

      ctx.save();
      ctx.translate(rectX, rectY);
      ctx.rotate(kickAngle + 0.1);

      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.roundRect(-rectW / 2, -rectH / 2 + 3, rectW, rectH, 3);
      ctx.fill();

      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(-rectW / 2, -rectH / 2, rectW, rectH, 3);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    if (leftProgress > 0 && stage === 2 && !isM2Active) {
      const ease = Math.pow(leftProgress, 0.7);
      const kickAngle = -0.15 + ease * 0.2;
      const dist = fighter.radius * (1.1 + ease * 0.35);
      const rectX = Math.cos(kickAngle) * dist + fighter.radius * 0.25;
      const rectY = Math.sin(kickAngle) * dist - fighter.radius * 0.35;

      const rectW = fighter.radius * 1.95;
      const rectH = fighter.radius * 0.74;

      ctx.save();
      ctx.translate(rectX, rectY);
      ctx.rotate(kickAngle);

      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.roundRect(-rectW / 2, -rectH / 2 + 3, rectW, rectH, 3);
      ctx.fill();

      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(-rectW / 2, -rectH / 2, rectW, rectH, 3);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    // Ashihara Karate M2 3-Stage Visuals
    if (fighter.heavyWindup && fighter.heavyWindup > 0) {
      ctx.save();
      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, fighter.radius * 1.4, -1.05, 1.05);
      ctx.stroke();

      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(0, 0, fighter.radius * 1.52, -0.75, 0.75);
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      const p1X = Math.cos(-0.85) * fighter.radius * 1.4;
      const p1Y = Math.sin(-0.85) * fighter.radius * 1.4;
      const p2X = Math.cos(0.85) * fighter.radius * 1.4;
      const p2Y = Math.sin(0.85) * fighter.radius * 1.4;
      ctx.beginPath();
      ctx.arc(p1X, p1Y, 3.5, 0, Math.PI * 2);
      ctx.arc(p2X, p2Y, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    if (fighter.ashiharaM2Stage === 2) {
      ctx.save();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.moveTo(fighter.radius * 0.9, -fighter.radius * 0.3);
      ctx.lineTo(fighter.radius * 1.45, -fighter.radius * 0.15);
      ctx.moveTo(fighter.radius * 0.9, fighter.radius * 0.3);
      ctx.lineTo(fighter.radius * 1.45, fighter.radius * 0.15);
      ctx.stroke();

      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(fighter.radius * 1.3, -fighter.radius * 0.15);
      ctx.lineTo(fighter.radius * 0.95, -fighter.radius * 0.15);
      ctx.moveTo(fighter.radius * 1.3, fighter.radius * 0.15);
      ctx.lineTo(fighter.radius * 0.95, fighter.radius * 0.15);
      ctx.stroke();

      ctx.restore();
    }

    if (fighter.ashiharaM2Stage === 3) {
      ctx.save();
      const progress = fighter.ashiharaM2Timer ? (12 - fighter.ashiharaM2Timer) / 12 : 0.5;
      const streakLen = fighter.radius * 2.2 * progress;
      
      ctx.strokeStyle = 'rgba(29, 78, 216, 0.7)';
      ctx.lineWidth = 4.0;
      ctx.beginPath();
      ctx.moveTo(fighter.radius * 0.4, 0);
      ctx.lineTo(fighter.radius * 0.4 + streakLen, 0);
      ctx.stroke();

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(fighter.radius * 0.4 + streakLen, 0, 4.0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // DRAW KICKBOXING LEGS (S3 Calf Kick & M2 Sequence 2 Teep Front Kick)
  if (fighter.styleId === 'kickboxing') {
    const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
    const isHeavy = rightFist && rightFist.isHeavy;
    const isSeq2 = (rightFist as any)?.kickboxingSeq2 || fighter.kickboxingIsSeq2;

    if (leftProgress > 0 && stage === 2 && !isHeavy) {
      const ease = Math.sin(leftProgress * Math.PI);
      const kickAngle = -0.65 + ease * 0.65;
      const dist = fighter.radius * (1.1 + ease * 0.4);
      const rectX = Math.cos(kickAngle) * dist;
      const rectY = Math.sin(kickAngle) * dist - fighter.radius * 0.25 * (1 - ease);

      const rectW = fighter.radius * 1.58;
      const rectH = fighter.radius * 0.70;

      ctx.save();
      ctx.translate(rectX, rectY);
      ctx.rotate(kickAngle);

      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.roundRect(-rectW / 2, -rectH / 2 + 3, rectW, rectH, 3);
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(-rectW / 2, -rectH / 2, rectW, rectH, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-rectW / 4, -rectH / 2 + 1, rectW / 5, rectH - 2);

      ctx.restore();
    }

    const isTeepActive = (rightProgress > 0 && isHeavy && isSeq2) || ((fighter.heavyWindup || 0) > 0 && isSeq2);
    if (isTeepActive) {
      const ease = rightProgress > 0 ? Math.sin(rightProgress * Math.PI) : 0.0;
      const isChambering = (fighter.heavyWindup || 0) > 0;

      ctx.save();
      if (isChambering) {
        const chamberW = fighter.radius * 0.85;
        const chamberH = fighter.radius * 0.63;
        const chamberX = fighter.radius * 0.35;
        const chamberY = 0;

        ctx.translate(chamberX, chamberY);
        ctx.rotate(-visualAngle + fighter.facingAngle);
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.roundRect(-chamberW / 2, -chamberH / 2 + 3, chamberW, chamberH, 3);
        ctx.fill();

        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.roundRect(-chamberW / 2, -chamberH / 2, chamberW, chamberH, 3);
        ctx.fill();
        ctx.stroke();

        const soleW = chamberW * 0.25;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(chamberW / 2 - soleW, -chamberH / 2 - 1, soleW, chamberH + 2, 2);
        ctx.fill();
        ctx.stroke();
      } else {
        const legW = fighter.radius * (0.95 + ease * 1.08);
        const legH = fighter.radius * 0.63;
        const rectX = fighter.radius * 0.20 + (legW / 2);
        const rectY = 0;

        ctx.translate(rectX, rectY);
        ctx.rotate(-visualAngle + fighter.facingAngle);

        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.roundRect(-legW / 2, -legH / 2 + 3, legW, legH, 3);
        ctx.fill();

        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.roundRect(-legW / 2, -legH / 2, legW, legH, 3);
        ctx.fill();
        ctx.stroke();

        const soleW = Math.max(8, legW * 0.18);
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(legW / 2 - soleW, -legH / 2 - 1, soleW, legH + 2, 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#dc2626';
        ctx.fillRect(legW / 2 - soleW - 4, -legH / 2 + 1, 4, legH - 2);
      }
      ctx.restore();
    }
  }

  // DRAW CAPOEIRA KICKS & MEIA LUA DE COMPASSO
  if (fighter.styleId === 'capoeira') {
    const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
    const isHeavy = rightFist && rightFist.isHeavy;

    let leftAttackT = 0;
    if (leftProgress > 0) {
      const f = fighter.fists.find(x => x.punchType === 'left');
      if (f) {
        leftAttackT = f.isPunching ? (f.punchProgress * 0.5) : (0.5 + (1.0 - f.punchProgress) * 0.5);
      }
    }

    let rightAttackT = 0;
    if (rightProgress > 0) {
      const f = fighter.fists.find(x => x.punchType === 'right');
      if (f) {
        rightAttackT = f.isPunching ? (f.punchProgress * 0.5) : (0.5 + (1.0 - f.punchProgress) * 0.5);
      }
    }

    const drawCapoeiraLeg = (
      x: number,
      y: number,
      angle: number,
      length: number,
      thickness: number
    ) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.roundRect(-length / 2, -thickness / 2 + 2, length, thickness, 3);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.roundRect(-length / 2, -thickness / 2, length * 0.72, thickness, 3);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-length / 4, -thickness / 4);
      ctx.lineTo(length / 4, -thickness / 4);
      ctx.moveTo(-length / 4, thickness / 4);
      ctx.lineTo(length / 4, thickness / 4);
      ctx.stroke();

      const footW = length * 0.28;
      const footH = thickness * 0.9;
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.roundRect(length * 0.22, -footH / 2, footW, footH, 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f97316';
      ctx.fillRect(length * 0.22, -footH / 2 + 0.5, 4, footH - 1);

      ctx.restore();
    };

    if (rightProgress > 0 && isHeavy) {
      const helicoAngle = rightProgress * Math.PI * 2.0;

      ctx.save();

      // 🌪️ TORNADO ARCS OUTSIDE THE LEGS (Sweeping outer whirlwind rings)
      const tornadoRadiusOuter = fighter.radius * 3.1;
      const tornadoRadiusMid = fighter.radius * 2.5;

      // 🌙 CAPOEIRA M2 CRESCENT LEG TRAILS ON THE TIPS (Spanning the length of the legs in yellow-orange)
      const dist = fighter.radius * 0.95;
      const legW = fighter.radius * 2.1;
      const legH = fighter.radius * 0.62;
      const rInner = Math.max(fighter.radius * 0.2, dist - legW * 0.42);
      const rOuter = dist + legW * 0.50;
      const crescentSpan = 0.95; // ~55° crescent arc trailing behind the sweep

      const drawLegCrescentTrail = (leadAngle: number) => {
        ctx.save();
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 14;

        // 1. Crescent Polygon (Tapering from full leg length at leading edge to sharp tip at tail)
        ctx.beginPath();
        const steps = 18;
        // Outer arc (from leading angle back to tail)
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const a = leadAngle - t * crescentSpan;
          const px = Math.cos(a) * rOuter;
          const py = Math.sin(a) * rOuter;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        // Inner arc (curving from tail at rOuter back to leading edge at rInner)
        for (let s = steps; s >= 0; s--) {
          const t = s / steps;
          const a = leadAngle - t * crescentSpan;
          const curR = rInner + (rOuter - rInner) * Math.pow(t, 1.4);
          const px = Math.cos(a) * curR;
          const py = Math.sin(a) * curR;
          ctx.lineTo(px, py);
        }
        ctx.closePath();

        // Glowing Yellow-Orange Gradient Fill
        const grad = ctx.createRadialGradient(0, 0, rInner, 0, 0, rOuter);
        grad.addColorStop(0.0, 'rgba(251, 146, 60, 0.45)');
        grad.addColorStop(0.6, 'rgba(245, 158, 11, 0.35)');
        grad.addColorStop(1.0, 'rgba(234, 88, 12, 0.05)');
        ctx.fillStyle = grad;
        ctx.fill();

        // 2. Outer Tip Ribbon Trail (Continuous Yellow-Orange Ribbon)
        ctx.beginPath();
        ctx.arc(0, 0, rOuter, leadAngle - crescentSpan, leadAngle, false);
        ctx.strokeStyle = '#f59e0b'; // Vivid Yellow-Orange
        ctx.lineWidth = 4.8;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Inner Light Golden High-Glow Core
        ctx.beginPath();
        ctx.arc(0, 0, rOuter, leadAngle - crescentSpan, leadAngle, false);
        ctx.strokeStyle = '#fef08a'; // Bright Light Gold
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // 3. Radial Trajectory Rib Lines (Spanning the length of the leg along the crescent)
        for (let k = 1; k <= 5; k++) {
          const alpha = (1 - k / 6) * 0.70;
          const kAngle = leadAngle - k * 0.16;
          const kInner = rInner + (rOuter - rInner) * Math.pow(k / 6, 1.4);
          ctx.beginPath();
          ctx.moveTo(Math.cos(kAngle) * kInner, Math.sin(kAngle) * kInner);
          ctx.lineTo(Math.cos(kAngle) * rOuter, Math.sin(kAngle) * rOuter);
          ctx.strokeStyle = `rgba(245, 158, 11, ${alpha})`;
          ctx.lineWidth = 3.2 * (1 - k / 6);
          ctx.stroke();
        }

        ctx.restore();
      };

      // Draw crescent trails on both spinning leg tips
      drawLegCrescentTrail(helicoAngle);
      drawLegCrescentTrail(helicoAngle - Math.PI);

      // Outer Tornado Arc 1 (Crisp pale sky white-blue air stream)
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.70)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, tornadoRadiusOuter, helicoAngle - 1.8, helicoAngle + 0.2, false);
      ctx.stroke();

      // Outer Tornado Arc 2 (Amber/Orange wind friction ribbon)
      ctx.strokeStyle = 'rgba(251, 146, 60, 0.60)';
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.arc(0, 0, tornadoRadiusOuter * 0.92, helicoAngle - Math.PI - 1.8, helicoAngle - Math.PI + 0.2, false);
      ctx.stroke();

      // Spiral Tornado Arcs (Atmospheric gust lines swirling around the perimeter)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.50)';
      ctx.lineWidth = 1.8;
      for (let ring = 0; ring < 3; ring++) {
        const r = tornadoRadiusMid + ring * (fighter.radius * 0.35);
        const startA = helicoAngle - 0.7 * ring;
        ctx.beginPath();
        ctx.arc(0, 0, r, startA - 0.9, startA, false);
        ctx.stroke();

        const startB = helicoAngle - Math.PI - 0.7 * ring;
        ctx.beginPath();
        ctx.arc(0, 0, r, startB - 0.9, startB, false);
        ctx.stroke();
      }

      // 🦵 SIMPLE RECTANGULAR LEGS (Clean geometric legs sweeping with tornado & wind trails)
      const legAngle1 = helicoAngle;
      const rectX1 = Math.cos(legAngle1) * dist;
      const rectY1 = Math.sin(legAngle1) * dist;
      drawCapoeiraLeg(rectX1, rectY1, legAngle1, legW, legH);

      const legAngle2 = helicoAngle - Math.PI;
      const rectX2 = Math.cos(legAngle2) * dist;
      const rectY2 = Math.sin(legAngle2) * dist;
      drawCapoeiraLeg(rectX2, rectY2, legAngle2, legW, legH);

      // Trailing wind wisps following behind the legs
      for (let trail = 1; trail <= 4; trail++) {
        const lagAngle1 = helicoAngle - trail * 0.18;
        const lagAngle2 = helicoAngle - Math.PI - trail * 0.18;
        const alpha = 0.5 - trail * 0.1;

        ctx.strokeStyle = `rgba(251, 146, 60, ${alpha})`;
        ctx.lineWidth = 3 - trail * 0.5;

        ctx.beginPath();
        ctx.arc(0, 0, dist * 1.6, lagAngle1 - 0.2, lagAngle1);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, dist * 1.6, lagAngle2 - 0.2, lagAngle2);
        ctx.stroke();
      }

      ctx.restore();
    }

    if (leftProgress > 0 && stage === 0 && !isHeavy) {
      const ease = Math.sin(leftAttackT * Math.PI);
      const kickAngle = -Math.PI * 0.35 + ease * Math.PI * 0.70;
      const dist = fighter.radius * (0.95 + ease * 0.40);
      const rectX = Math.cos(kickAngle) * dist;
      const rectY = Math.sin(kickAngle) * dist;

      const legW = fighter.radius * 1.90;
      const legH = fighter.radius * 0.62;

      drawCapoeiraLeg(rectX, rectY, kickAngle, legW, legH);
    }

    if (rightProgress > 0 && stage === 1 && !isHeavy) {
      const ease = Math.sin(rightAttackT * Math.PI);
      const kickAngle = Math.PI * 0.30 - ease * Math.PI * 0.60;
      const dist = fighter.radius * (0.95 + ease * 0.40);
      const rectX = Math.cos(kickAngle) * dist;
      const rectY = Math.sin(kickAngle) * dist;

      const rectW = fighter.radius * 1.90;
      const rectH = fighter.radius * 0.62;

      drawCapoeiraLeg(rectX, rectY, kickAngle, rectW, rectH);
    }

    if (leftProgress > 0 && stage === 2 && !isHeavy) {
      const ease = Math.sin(leftAttackT * Math.PI);
      const kickAngle = -Math.PI * 0.30 + ease * Math.PI * 0.60;
      const dist = fighter.radius * (0.95 + ease * 0.40);
      const rectX = Math.cos(kickAngle) * dist;
      const rectY = Math.sin(kickAngle) * dist;

      const legW = fighter.radius * 1.90;
      const legH = fighter.radius * 0.62;

      drawCapoeiraLeg(rectX, rectY, kickAngle, legW, legH);
    }

    if (rightProgress > 0 && stage === 3 && !isHeavy) {
      const ease = Math.sin(rightAttackT * Math.PI);
      const dist = fighter.radius * (0.95 + ease * 0.55);
      const rectX = dist;
      const rectY = 0;

      const rectW = fighter.radius * 1.95;
      const rectH = fighter.radius * 0.62;

      drawCapoeiraLeg(rectX, rectY, 0, rectW, rectH);
    }
  }

  // DRAW CAPOEIRA GINGA MOTION TRAIL
  if (fighter.styleId === 'capoeira' && (!fighter.stunTime || fighter.stunTime <= 0)) {
    ctx.save();
    const isDodging = fighter.capoeiraDodgeFlashTime && fighter.capoeiraDodgeFlashTime > 0;
    const trailCount = isDodging ? 5 : 3;
    for (let i = trailCount; i >= 1; i--) {
      const offsetAngle = -i * (isDodging ? 0.16 : 0.12);
      ctx.fillStyle = isDodging
        ? `rgba(255, 255, 255, ${0.40 / i})`
        : `rgba(234, 179, 8, ${0.12 / i})`;
      ctx.beginPath();
      ctx.arc(Math.cos(offsetAngle) * i * (isDodging ? 4.5 : 3), Math.sin(offsetAngle) * i * (isDodging ? 4.5 : 3), fighter.radius * (1 - i * 0.05), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // AIKIDO CENTRIFUGAL EJECTION HIGH-SPEED MOTION TRAILS
  if (fighter.aikiCentrifugalKnockbackTimer && fighter.aikiCentrifugalKnockbackTimer > 0) {
    ctx.save();
    const trailAlpha = Math.min(1.0, fighter.aikiCentrifugalKnockbackTimer / 28);
    const trailCount = 5;
    const speed = Math.hypot(fighter.vx, fighter.vy);
    for (let i = trailCount; i >= 1; i--) {
      const trailDx = speed > 0.1 ? (-fighter.vx / speed) * (i * 10) : -i * 9;
      const trailDy = speed > 0.1 ? (-fighter.vy / speed) * (i * 10) : 0;
      
      ctx.fillStyle = `rgba(56, 189, 248, ${(0.32 / i) * trailAlpha})`;
      ctx.strokeStyle = `rgba(224, 247, 250, ${(0.55 / i) * trailAlpha})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(trailDx, trailDy, fighter.radius * (1 - i * 0.05), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // DRAW STREET TAEKWONDO LEGS & CHAMBER GUARD
  if (fighter.styleId === 'street_taekwondo') {
    const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
    const isHeavy = rightFist && rightFist.isHeavy;
    const isChamberingM2 = (fighter.heavyWindup && fighter.heavyWindup > 0);
    const isM2Striking = rightProgress > 0 && isHeavy;

    const drawTaekwondoLeg = (
      x: number,
      y: number,
      angle: number,
      rectW: number,
      rectH: number
    ) => {
      // 20% increased leg width (cross-sectional thickness)
      const legWidth = rectH * 1.20;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      // Soft drop shadow for grounding
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.rect(-rectW / 2, -legWidth / 2 + 3, rectW, legWidth);
      ctx.fill();

      // Pure rectangular leg: 1 singular solid grey rectangle with crisp black outline (no segments, no roundRect)
      ctx.fillStyle = '#6b7280';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.rect(-rectW / 2, -legWidth / 2, rectW, legWidth);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    };

    if (isChamberingM2) {
      const maxWFrames = 28;
      const t = Math.min(1, Math.max(0, 1 - (fighter.heavyWindup || 0) / maxWFrames));
      const spinA = t * Math.PI * 2.0;

      const spinLegW = fighter.radius * 1.95;
      const spinLegH = fighter.radius * 0.56;
      drawTaekwondoLeg(Math.cos(spinA) * fighter.radius * 0.35, Math.sin(spinA) * fighter.radius * 0.35, spinA, spinLegW, spinLegH);
      drawTaekwondoLeg(Math.cos(spinA + Math.PI) * fighter.radius * 0.35, Math.sin(spinA + Math.PI) * fighter.radius * 0.35, spinA + Math.PI, spinLegW, spinLegH);
    } else if (isM2Striking) {
      const ease = Math.sin(rightProgress * Math.PI);
      const legW = fighter.radius * (1.5 + ease * 0.95);
      const legH = fighter.radius * 0.58;
      const rectX = fighter.radius * 0.25 + legW * 0.40;
      const rectY = fighter.radius * 0.42; // Aligned to right flank
      drawTaekwondoLeg(rectX, rectY, 0, legW, legH);
    } else if (leftProgress > 0) {
      const ease = Math.sin(leftProgress * Math.PI);
      if (stage === 0) {
        // S1 Lead Snap Kick - Left leg aligned to left flank
        const legW = fighter.radius * (1.4 + ease * 0.85);
        const legH = fighter.radius * 0.56;
        const rectX = fighter.radius * 0.20 + legW * 0.40;
        const rectY = -fighter.radius * 0.42;
        drawTaekwondoLeg(rectX, rectY, 0, legW, legH);
      } else if (stage === 2) {
        // S3 Stance Switch Jump Kick - Left leg aligned to left flank
        const legW = fighter.radius * (1.45 + ease * 0.85);
        const legH = fighter.radius * 0.56;
        const rectX = fighter.radius * 0.25 + legW * 0.40;
        const rectY = -fighter.radius * 0.45;
        drawTaekwondoLeg(rectX, rectY, 0, legW, legH);
      }
    } else if (rightProgress > 0) {
      const ease = Math.sin(rightProgress * Math.PI);
      if (stage === 1) {
        // S2 Roundhouse Whip - Right leg aligned to right flank
        const kickAngle = Math.PI * 0.30 - ease * Math.PI * 0.60;
        const dist = fighter.radius * (1.1 + ease * 0.35);
        const rectX = Math.cos(kickAngle) * dist;
        const rectY = Math.sin(kickAngle) * dist + fighter.radius * 0.25;
        const legW = fighter.radius * 2.10;
        const legH = fighter.radius * 0.56;
        drawTaekwondoLeg(rectX, rectY, kickAngle, legW, legH);
      } else if (stage === 3) {
        // S4 360 Tornado Kick - Right leg whip
        const totalProgress = rightFist?.isPunching ? (rightProgress * 0.5) : (0.5 + (1.0 - rightProgress) * 0.5);
        const kickAngle = totalProgress * Math.PI * 2.0;
        const dist = fighter.radius * 1.15;
        const rectX = Math.cos(kickAngle) * dist;
        const rectY = Math.sin(kickAngle) * dist + Math.sin(kickAngle) * fighter.radius * 0.20;
        const legW = fighter.radius * 2.25;
        const legH = fighter.radius * 0.58;
        drawTaekwondoLeg(rectX, rectY, kickAngle, legW, legH);
      }
    } else if (isBlockingActive) {
      const kneeBlockW = fighter.radius * 1.50;
      const kneeBlockH = fighter.radius * 0.65;
      const kneeX = fighter.radius * 0.50;
      const kneeY = -fighter.radius * 0.30;
      const kneeAngle = -Math.PI / 8;
      drawTaekwondoLeg(kneeX, kneeY, kneeAngle, kneeBlockW, kneeBlockH);
    }
  }


  // 2. Draw Fighter Core Circle
  const isKickboxingS1Windup = fighter.styleId === 'kickboxing' && (fighter.heavyWindup || 0) > 0 && !fighter.kickboxingIsSeq2;
  const isHitFlashing = fighter.damageFlashTime !== undefined && fighter.damageFlashTime > 0;
  const isCqcM2HitFlashing = fighter.cqcM2HitFlashTime !== undefined && fighter.cqcM2HitFlashTime > 0;
  
  if (isCqcM2HitFlashing) {
    ctx.save();
    ctx.shadowColor = '#ff0033';
    ctx.shadowBlur = 14;
  }
  
  const isImpactSilhouette = isImpactFrameSilhouette(fighter);
  ctx.fillStyle = isImpactSilhouette ? '#050505' : (isCqcM2HitFlashing ? '#ff0033' : (isHitFlashing ? '#ef4444' : (fighter.styleId === 'cqc' ? '#111111' : mainColor)));
  ctx.strokeStyle = isImpactSilhouette ? '#ffffff' : (isCqcM2HitFlashing ? '#ffffff' : (isKickboxingS1Windup ? '#ef4444' : ((fighter.styleId === 'shotokan' || fighter.styleId === 'keysi' || fighter.styleId === 'cqc') ? '#000000' : '#111115')));
  ctx.lineWidth = isImpactSilhouette ? 4.0 : (isCqcM2HitFlashing ? 5.0 : (isKickboxingS1Windup ? 4.5 : 3.5));
  ctx.beginPath();
  ctx.arc(0, 0, fighter.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (isCqcM2HitFlashing) {
    ctx.restore();
  }

  if (isParrying) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius * 1.15, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (fighter.isDashing || (fighter.dashProgress && fighter.dashProgress > 0) || (fighter.dashWhiteFrameFlashTime && fighter.dashWhiteFrameFlashTime > 0)) {
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4.5;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius + 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (fighter.styleId === 'keysi') {
    // Keysi Chamber Palette: Aggressive charcoal-black (#1A1A1A) with black outline (#000000)
    ctx.fillStyle = isParrying ? '#ffffff' : (isHitFlashing ? '#dc2626' : '#1A1A1A');
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Sharp crimson (#ef4444) and silver-grey (#94a3b8) forward-pointing chevron / wedge indicator accents on chest/shoulders
    ctx.save();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-fighter.radius * 0.24, -fighter.radius * 0.40);
    ctx.lineTo(fighter.radius * 0.30, 0);
    ctx.lineTo(-fighter.radius * 0.24, fighter.radius * 0.40);
    ctx.stroke();

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-fighter.radius * 0.32, -fighter.radius * 0.28);
    ctx.lineTo(fighter.radius * 0.16, 0);
    ctx.lineTo(-fighter.radius * 0.32, fighter.radius * 0.28);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (fighter.styleId === 'cqc') {
    // CQC Stealth Matte: Pure stealth body color (#111111) with pure black outline (#000000), no suit decal
    ctx.fillStyle = isParrying ? '#ffffff' : (isHitFlashing ? '#ef4444' : '#111111');
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (fighter.styleId === 'street_boxing') {
    // Street Boxing: Vibrant Green body (#2E7D32) with deep Dark Green outlines (#1B5E20)
    ctx.fillStyle = isParrying ? '#ffffff' : (isHitFlashing ? '#ef4444' : '#2E7D32');
    ctx.strokeStyle = '#1B5E20';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (fighter.styleId !== 'shotokan' && fighter.styleId !== 'kyokushin') {
    const isDodgingWhite = isCapoeiraDodging && ((Math.floor((fighter.capoeiraDodgeFlashTime || 0) / 2) % 2) === 0);
    ctx.fillStyle = isParrying ? '#ffffff' : (isDodgingWhite ? '#ffffff' : (isHitFlashing ? '#ef4444' : fighter.secondaryColor));
    ctx.strokeStyle = '#111115';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (fighter.styleId === 'kyokushin') {
    ctx.fillStyle = isParrying ? '#ffffff' : (isHitFlashing ? '#dc2626' : '#374151');
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, fighter.radius * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // DRAW SHOTOKAN KARATE GI DETAILS
  if (fighter.styleId === 'shotokan') {
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 1.5;
    const beltW = fighter.radius * 0.32;
    const beltH = fighter.radius * 1.35;
    ctx.beginPath();
    ctx.roundRect(fighter.radius * 0.08, -beltH / 2, beltW, beltH, 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(fighter.radius * 0.22, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillRect(fighter.radius * 0.22, 0, fighter.radius * 0.45, 3.5);
    ctx.fillRect(fighter.radius * 0.22, 3, fighter.radius * 0.38, 3);

    const lapelW = fighter.radius * 0.85;
    const lapelH = fighter.radius * 0.22;

    const idleTime = gameTime * 0.05;
    const topSlide = (leftProgress > 0 ? leftProgress * 8 : 0) + Math.sin(idleTime * 3.5) * 1.2;
    const botSlide = (rightProgress > 0 ? rightProgress * 8 : 0) + Math.cos(idleTime * 3.5) * 1.2;

    ctx.save();
    ctx.translate(fighter.radius * 0.05 + topSlide, -fighter.radius * 0.18);
    ctx.rotate(0.08);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.roundRect(0, -lapelH / 2, lapelW, lapelH, 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(fighter.radius * 0.05 + botSlide, fighter.radius * 0.18);
    ctx.rotate(-0.08);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.roundRect(0, -lapelH / 2, lapelW, lapelH, 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  // DRAW KYOKUSHIN KARATE GREY GI DETAILS
  if (fighter.styleId === 'kyokushin') {
    ctx.save();
    
    // 1. Black Obi (Belt)
    ctx.fillStyle = '#09090b';
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 1.5;
    const beltW = fighter.radius * 0.32;
    const beltH = fighter.radius * 1.35;
    ctx.beginPath();
    ctx.roundRect(fighter.radius * 0.08, -beltH / 2, beltW, beltH, 2);
    ctx.fill();
    ctx.stroke();

    // Gold/Silver Dan Rank Stripe on Belt
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(fighter.radius * 0.08 + 3, -beltH / 2 + 2, beltW - 6, 2.5);

    // Belt Knot & Hanging Ends
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.arc(fighter.radius * 0.22, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillRect(fighter.radius * 0.22, 0, fighter.radius * 0.42, 3.5);
    ctx.fillRect(fighter.radius * 0.22, 3, fighter.radius * 0.35, 3);

    // 2. Grey Gi Lapels (Left over Right)
    const lapelW = fighter.radius * 0.85;
    const lapelH = fighter.radius * 0.22;

    const idleTime = gameTime * 0.05;
    const topSlide = (leftProgress > 0 ? leftProgress * 6 : 0) + Math.sin(idleTime * 2.8) * 0.8;
    const botSlide = (rightProgress > 0 ? rightProgress * 6 : 0) + Math.cos(idleTime * 2.8) * 0.8;

    // Top Lapel (Grey Gi Fabric)
    ctx.save();
    ctx.translate(fighter.radius * 0.05 + topSlide, -fighter.radius * 0.18);
    ctx.rotate(0.08);
    ctx.fillStyle = '#52525b'; // Grey Gi
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.roundRect(0, -lapelH / 2, lapelW, lapelH, 2);
    ctx.fill();
    ctx.stroke();

    // Kyokushin Kanku emblem in purple/silver
    ctx.fillStyle = '#9333ea';
    ctx.beginPath();
    ctx.arc(lapelW * 0.45, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Bottom Lapel (Grey Gi Fabric)
    ctx.save();
    ctx.translate(fighter.radius * 0.05 + botSlide, fighter.radius * 0.18);
    ctx.rotate(-0.08);
    ctx.fillStyle = '#4b5563';
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.roundRect(0, -lapelH / 2, lapelW, lapelH, 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }


  // DRAW SEPARATE SHOTOKAN KARATE LEG
  if (fighter.styleId === 'shotokan') {
    const isHeavy = rightFist && rightFist.isHeavy;
    const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
    const isS4Kick = leftProgress > 0 && stage === 3;

    if (isS4Kick || isHeavy) {
      let legX = 0;
      let legY = 0;
      let legAngle = 0;

      if (isHeavy) {
        const kickDist = fighter.radius * (0.8 + rightProgress * 1.5);
        legX = -kickDist;
        legY = 0;
        legAngle = Math.PI;
      } else {
        const kickDist = fighter.radius * (0.8 + leftProgress * 1.5);
        legX = kickDist;
        legY = -fighter.radius * 0.45;
        legAngle = 0;
      }

      const legW = fighter.radius * 2.0;
      const legH = fighter.radius * 0.55;

      ctx.save();
      ctx.translate(legX, legY);
      ctx.rotate(legAngle);

      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.roundRect(-legW / 2, -legH / 2 + 3, legW, legH, 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(-legW / 2, -legH / 2, legW * 0.72, legH, 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-legW / 2 + 6, -legH / 4);
      ctx.lineTo(legW * 0.22 - 6, -legH / 4);
      ctx.moveTo(-legW / 2 + 6, legH / 4);
      ctx.lineTo(legW * 0.22 - 6, legH / 4);
      ctx.stroke();

      const shoeW = legW * 0.32;
      const shoeH = legH * 1.08;
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.rect(legW * 0.22, -shoeH / 2, shoeW, shoeH);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(legW * 0.22 + shoeW - 3, -shoeH / 2 + 1, 3, shoeH - 2);

      ctx.restore();
    }
  }

  // DRAW SEPARATE MUAY THAI SHIN KICK (Stage 3)
  if (fighter.styleId === 'muay_thai' && leftProgress > 0) {
    const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
    if (stage === 3) {
      const startAngle = -Math.PI * 0.45;
      const endAngle = Math.PI * 0.25;
      const ease = leftProgress * leftProgress * (3 - 2 * leftProgress);
      const currentSweepAngle = startAngle + ease * (endAngle - startAngle);
      const dist = fighter.radius * 1.35;
      
      const rectX = Math.cos(currentSweepAngle) * dist;
      const rectY = Math.sin(currentSweepAngle) * dist;
      
      const rectW = fighter.radius * 1.85;
      const rectH = fighter.radius * 0.54;

      ctx.save();
      ctx.translate(rectX, rectY);
      ctx.rotate(currentSweepAngle - Math.PI / 4);

      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.roundRect(-rectW / 2, -rectH / 2 + 3, rectW, rectH, 3);
      ctx.fill();

      ctx.fillStyle = '#dc2626';
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(-rectW / 2, -rectH / 2, rectW, rectH, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#facc15';
      ctx.fillRect(-rectW / 2 + 6, -rectH / 2 + 2, 4, rectH - 4);
      ctx.fillRect(rectW / 2 - 10, -rectH / 2 + 2, 4, rectH - 4);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-4, -rectH / 2 + 1, 8, rectH - 2);

      ctx.restore();
    }
  }

  // DRAW SEPARATE KYOKUSHIN GEDAN GERI (CALF KICK)
  if (fighter.styleId === 'kyokushin' && rightProgress > 0) {
    const isHeavy = rightFist && rightFist.isHeavy;
    const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
    if (stage === 1 && !isHeavy) {
      const p = rightProgress;
      const isForward = rightFist ? rightFist.isPunching : true;
      const windupSplit = 0.48; // First ~50% of the forward strike is windup/chamber

      // Leg geometry: Simple solid bold rectangle
      const legThickness = fighter.radius * 0.75;
      const baseLegLen = fighter.radius * 1.85;

      // Hip anchor on the right flank outside the circle
      const hipX = fighter.radius * 0.15;
      const hipY = fighter.radius * 0.65;

      let legAngle = 0;
      let curLegLen = baseLegLen;

      if (isForward) {
        if (p < windupSplit) {
          // Windup Phase: Leg is clearly slanted outward (~40° = 0.70 rad) outside the circle
          const wT = p / windupSplit;
          legAngle = 0.70; // Clearly slanted outward on the windup
          curLegLen = baseLegLen * 0.90 + (wT * baseLegLen * 0.10);
        } else {
          // Snap Phase: Snaps violently from slanted angle straight forward (0.0 rad)
          const sT = (p - windupSplit) / (1 - windupSplit);
          const snapEase = 1 - Math.pow(1 - sT, 3.5); // Rapid explosive snap
          legAngle = 0.70 * (1 - snapEase); // Snaps from 0.70 rad straight to 0.0 rad

          const extendSin = Math.sin(sT * Math.PI * 0.5);
          curLegLen = baseLegLen + extendSin * fighter.radius * 0.55;
        }
      } else {
        // Retraction: Retracts smoothly back along straight line
        legAngle = 0;
        curLegLen = baseLegLen + p * fighter.radius * 0.55;
      }

      ctx.save();
      ctx.translate(hipX, hipY);
      ctx.rotate(legAngle);

      // 1. Drop Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.rect(0, -legThickness / 2 + 3, curLegLen, legThickness);
      ctx.fill();

      // 2. Solid Charcoal Grey Gi Rectangle with crisp outline
      ctx.fillStyle = '#52525b';
      ctx.strokeStyle = '#111115';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.rect(0, -legThickness / 2, curLegLen, legThickness);
      ctx.fill();
      ctx.stroke();

      // 3. Inner Gi fabric seam highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.20)';
      ctx.fillRect(4, -legThickness / 4, curLegLen - 8, legThickness / 2);

      ctx.restore();
    }
  }


  // 3. Draw Fists using Inverse Kinematics (IK) jointed arms
  if (isBlockingActive) {
    renderBlockArc(ctx, fighter);
  }

  const fistsToRender = [...fighter.fists];
  if (fighter.styleId === 'street_boxing' && isBlockingActive) {
    // Sort so right arm renders first (underneath) and left arm (in front) renders on top,
    // ensuring right hand is visually and physically behind the left hand!
    fistsToRender.sort((a, b) => {
      const aIsLeft = a.punchType === 'left' ? 1 : 0;
      const bIsLeft = b.punchType === 'left' ? 1 : 0;
      return aIsLeft - bIsLeft;
    });
  }

  fistsToRender.forEach(fist => {
    ctx.save();

    const rightFistForM2 = fighter.fists.find(f => f.punchType === 'right');
    const isCapoeiraM2 = fighter.styleId === 'capoeira' && (
      (fighter.heavyWindup && fighter.heavyWindup > 0) ||
      (rightFistForM2 && rightFistForM2.isHeavy && rightFistForM2.punchProgress > 0)
    );
    if (isCapoeiraM2 || (fighter.styleId === 'street_taekwondo' && isBlockingActive)) {
      ctx.restore();
      return;
    }

    const isLeft = fist.punchType === 'left';
    const idleTime = Date.now() / 1000;

    let shoulderAngle = isLeft ? -Math.PI / 2.3 : Math.PI / 2.3;
    if (fighter.styleId === 'street_boxing') {
      if (isBlockingActive) {
        if (isLeft) {
          // Character straightens their left shoulder
          shoulderAngle = -Math.PI / 5.2;
        } else {
          shoulderAngle = Math.PI / 2.45;
        }
      } else if (isLeft) {
        shoulderAngle = -Math.PI / 2.65;
        const isReadyForS3OrS4 = (fighter.comboStage === 2 || fighter.comboStage === 3 || rightProgress > 0);
        if (isReadyForS3OrS4 && leftProgress === 0) {
          // "when it becomes ready for s3 the left hand pulls back into a guard."
          shoulderAngle = -Math.PI / 2.20;
        } else if (leftProgress === 0) {
          // "Animation of idle is shoulder pulling back and wrist pulling back a bit, Making it a V sideways shape before straightening"
          const vCycle = (Math.sin(idleTime * 3.5) + 1) * 0.5;
          shoulderAngle += vCycle * 0.12;
        } else if (leftProgress > 0 && !fist.isHeavy) {
          const p = fist.punchProgress;
          if (fist.isPunching) {
            if (p < 0.28) {
              // Windup: shoulder pulls back
              const chamberP = Math.sin((p / 0.28) * Math.PI * 0.5);
              shoulderAngle = (-Math.PI / 2.65) + chamberP * 0.18;
            } else {
              // Straightening it all out into the jab
              const pushP = (p - 0.28) / 0.72;
              const pushEase = Math.sin(pushP * Math.PI * 0.5);
              shoulderAngle = ((-Math.PI / 2.65) + 0.18) * (1 - pushEase) + (-Math.PI / 2.85) * pushEase;
            }
          } else {
            const retEase = Math.sin(p * Math.PI * 0.5);
            shoulderAngle = (-Math.PI / 2.65) + (-Math.PI / 2.85 - (-Math.PI / 2.65)) * retEase;
          }
        }
      } else {
        const comboStage = fist.comboStage !== undefined ? fist.comboStage : (fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1));
        if (rightProgress > 0 && !fist.isHeavy) {
          const p = fist.punchProgress;
          if (comboStage === 2) {
            // S3: "S3 doesn't seem to pull back the shoulder so the elbow looks back before straightening."
            if (fist.isPunching) {
              if (p < 0.28) {
                const chamberP = Math.sin((p / 0.28) * Math.PI * 0.5);
                shoulderAngle = (Math.PI / 2.3) + chamberP * 0.42;
              } else {
                const strikeP = (p - 0.28) / 0.72;
                const strikeEase = Math.sin(strikeP * Math.PI * 0.5);
                shoulderAngle = (Math.PI / 2.3 + 0.42) * (1 - strikeEase) + (Math.PI / 2.8) * strikeEase;
              }
            }
          } else if (comboStage === 3) {
            // S4: "It should pull the shoulder like s3 before initiating a looping hook..."
            if (fist.isPunching) {
              if (p < 0.28) {
                const chamberP = Math.sin((p / 0.28) * Math.PI * 0.5);
                shoulderAngle = (Math.PI / 2.3) + chamberP * 0.45;
              } else {
                const hookP = (p - 0.28) / 0.72;
                const hookEase = Math.sin(hookP * Math.PI * 0.5);
                shoulderAngle = (Math.PI / 2.3 + 0.45) * (1 - hookEase) + (Math.PI / 3.1) * hookEase;
              }
            } else {
              // Retraction: smoothly ease right shoulder back to stance guard/idle angle
              const retEase = Math.sin(p * Math.PI * 0.5);
              shoulderAngle = (Math.PI / 2.3) * (1 - retEase) + (Math.PI / 3.1) * retEase;
            }
          }
        }
      }
    } else if (fighter.styleId === 'boxing_shell') {
      const ironSway = getIronSwayFactor(gameTime);
      if (isLeft) {
        shoulderAngle = -Math.PI / 2.05;
        if (fist.punchProgress > 0) {
          const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
          if (stage === 2) {
            // S3: Left shoulder drives forward along the torso arc so it is not stuck way too close!
            const sFactor = Math.sin(fist.punchProgress * Math.PI / 2);
            shoulderAngle = (-Math.PI / 2.05) * (1 - sFactor) + (-0.68) * sFactor;
          } else if (stage === 3) {
            // S4: Left shoulder pulls back slightly during chamber then drives forward with the overhead strike
            let sFactor = 0;
            let pullback = 0;
            if (fist.isPunching) {
              if (fist.punchProgress < 0.28) {
                const wT = fist.punchProgress / 0.28;
                pullback = Math.sin(wT * Math.PI / 2);
              } else {
                const sT = (fist.punchProgress - 0.28) / 0.72;
                pullback = Math.cos(sT * Math.PI / 2);
                sFactor = 1 - Math.pow(1 - sT, 2.6);
              }
            } else {
              sFactor = fist.punchProgress * fist.punchProgress * (3 - 2 * fist.punchProgress);
            }
            shoulderAngle = (-Math.PI / 2.05 - pullback * 0.25) * (1 - sFactor) + (-0.55) * sFactor;
          }
        } else {
          // Iron Boxing Stance Shoulder Sway:
          // Rotating left (ironSway < 0): Left shoulder rotates slightly
          // Rotating right (ironSway > 0): Left shoulder rotates in a tiny scale
          if (ironSway < 0) {
            shoulderAngle += ironSway * 0.14;
          } else {
            shoulderAngle += ironSway * 0.04;
          }
        }
      } else {
        const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
        if (fist.punchProgress > 0 && (stage === 0 || stage === 1)) {
          // S1 & S2 Right Shoulder: Holds stable lead shoulder angle during chamber, then rotates cleanly into straight punch
          const isForward = fist.isPunching;
          const chargeLimit = stage === 0 ? 0.28 : 0.24;
          if (isForward) {
            if (fist.punchProgress < chargeLimit) {
              const wT = fist.punchProgress / chargeLimit;
              const coilRatio = Math.sin(wT * Math.PI * 0.5);
              shoulderAngle = (Math.PI / 2.05) + coilRatio * 0.15;
            } else {
              const sT = (fist.punchProgress - chargeLimit) / (1.0 - chargeLimit);
              const snapEase = 1 - Math.pow(1 - sT, 3.2);
              shoulderAngle = (Math.PI / 2.05 + 0.15) * (1 - snapEase) + (Math.PI / 2.40) * snapEase;
            }
          } else {
            const retEase = fist.punchProgress * fist.punchProgress * (3 - 2 * fist.punchProgress);
            shoulderAngle = (Math.PI / 2.05) * (1 - retEase) + (Math.PI / 2.40) * retEase;
          }
        } else if (fist.punchProgress === 0) {
          // Iron Boxing Stance Shoulder Sway:
          // Rotating right (ironSway > 0): Right shoulder rotates slightly
          // Rotating left (ironSway < 0): Right shoulder rotates in a tiny scale
          if (ironSway > 0) {
            shoulderAngle += ironSway * 0.14;
          } else {
            shoulderAngle += ironSway * 0.04;
          }
        }
      }
    } else if (fighter.styleId === 'kyokushin') {
      const isKyokushinWindup = (fighter.heavyWindup && fighter.heavyWindup > 0);
      const rightFistObj = fighter.fists ? (fighter.fists.find((f: any) => f.punchType === 'right') || fighter.fists[1]) : undefined;
      const isKyokushinM2Executing = (rightFistObj && rightFistObj.isHeavy && (rightFistObj.isPunching || rightFistObj.punchProgress > 0)) || ((fighter as any).kyokushinM2PeakHoldTimer || 0) > 0;
      const defaultLeft = -Math.PI / 2.25;
      const defaultRight = Math.PI / 2.25;

      if (isKyokushinWindup) {
        const ratio = Math.min(1.0, Math.max(0, (33 - (fighter.heavyWindup || 0)) / 33));
        if (isLeft) {
          shoulderAngle = defaultLeft - ratio * 0.06;
        } else {
          shoulderAngle = defaultRight + ratio * 0.38; // Coils right shoulder backward past ribs
        }
      } else if (isKyokushinM2Executing) {
        const isPunching = fighter.kyokushinM2Stage === 'thrust' || (rightFistObj ? rightFistObj.isPunching : false);
        const p = fighter.kyokushinM2Progress !== undefined ? fighter.kyokushinM2Progress : (rightFistObj ? rightFistObj.punchProgress : 0);
        const isPeakLock = fighter.kyokushinM2Stage === 'freeze' || ((fighter as any).kyokushinM2FreezeTimer || 0) > 0 || ((fighter as any).kyokushinM2PeakHoldTimer || 0) > 0;

        if (isPunching) {
          if (isLeft) {
            shoulderAngle = (defaultLeft - 0.06) * (1 - p) + (-Math.PI / 1.25) * p; // Left shoulder pulls back tightly with max Hikite rotation
          } else {
            shoulderAngle = (defaultRight + 0.38) * (1 - p) + (Math.PI / 2.80) * p; // Right shoulder drives forward behind fist
          }
        } else if (isPeakLock) {
          shoulderAngle = isLeft ? -Math.PI / 1.25 : Math.PI / 2.80;
        } else {
          const retractT = Math.min(1.0, Math.max(0, 1.0 - p));
          const ease = retractT * retractT * (3 - 2 * retractT); // Smoothstep deceleration
          if (isLeft) {
            shoulderAngle = (-Math.PI / 1.25) * (1 - ease) + defaultLeft * ease;
          } else {
            shoulderAngle = (Math.PI / 2.80) * (1 - ease) + defaultRight * ease;
          }
        }
      } else {
        shoulderAngle = isLeft ? defaultLeft : defaultRight;
      }
    } else if (fighter.styleId === 'capoeira') {
      const gingaTime = ((gameTime) % 120) / 120;
      const sway = Math.sin(gingaTime * Math.PI * 2); // -1 to +1
      // Organic Ginga shoulder rotation: rolls forward with guarding arm, eases back with trailing arm
      shoulderAngle += (-sway) * 0.14;
    } else if (fighter.styleId === 'aikido') {
      const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
      const isCurledForS2 = (fighter.comboStage === 1 && rightProgress === 0) || (leftProgress > 0 && (stage === 1 || stage === 0 || leftFist?.comboStage === 1));
      const curlFactor = (fighter as any).aikiCurlFactor !== undefined ? (fighter as any).aikiCurlFactor : (isCurledForS2 ? 1.0 : 0.0);
      const curlEase = 0.5 - 0.5 * Math.cos(curlFactor * Math.PI);
      const isS1Active = rightProgress > 0 && (stage === 0 || rightFist?.comboStage === 0);
      const isS2Active = leftProgress > 0 && (stage === 1 || stage === 0 || leftFist?.comboStage === 1);
      const isS3Active = rightProgress > 0 && (stage === 2 || rightFist?.comboStage === 2);
      const isS4Active = rightProgress > 0 && (stage === 3 || rightFist?.comboStage === 3);
      if (isLeft) {
        // Left shoulder: natural Hanmi rear shoulder anchor
        let sAngle = -Math.PI / 1.90;
        if (isS1Active) {
          const isForward = rightFist ? rightFist.isPunching : false;
          const windupSplit = 0.52;
          if (isForward) {
            if (rightProgress < windupSplit) {
              const wT = rightProgress / windupSplit;
              const windupRatio = Math.sin(wT * Math.PI * 0.5);
              sAngle -= windupRatio * 0.18;
            } else {
              const thrustT = (rightProgress - windupSplit) / (1 - windupSplit);
              const thrustEase = 1 - Math.pow(1 - thrustT, 3.2);
              sAngle = (-Math.PI / 1.90 - 0.18) * (1 - thrustEase) + (-Math.PI / 1.65) * thrustEase;
            }
          } else {
            const retEase = rightProgress * rightProgress * (3 - 2 * rightProgress);
            sAngle = (-Math.PI / 1.90) * (1 - retEase) + (-Math.PI / 1.65) * retEase;
          }
        } else if (isS2Active) {
          // S2: Left shoulder pulls longer to the back, then sweeps far to the right
          const isForward = leftFist ? leftFist.isPunching : false;
          const windupSplit = 0.44;
          if (isForward) {
            if (leftProgress < windupSplit) {
              const wT = leftProgress / windupSplit;
              sAngle = (-Math.PI / 1.90) - Math.sin(wT * Math.PI * 0.5) * 0.35;
            } else {
              const sT = (leftProgress - windupSplit) / (1 - windupSplit);
              const slashEase = 0.5 - 0.5 * Math.cos(sT * Math.PI);
              sAngle = (-Math.PI / 1.90 - 0.35) * (1 - slashEase) + (-Math.PI / 2.30) * slashEase;
            }
          } else {
            const retEase = leftProgress * leftProgress * (3 - 2 * leftProgress);
            sAngle = (-Math.PI / 1.90) * (1 - retEase) + (-Math.PI / 2.30) * retEase;
          }
        } else if (isS3Active) {
          const sweepSin = Math.sin(rightProgress * Math.PI);
          sAngle += sweepSin * 0.28;
        } else if (isS4Active) {
          const tuckRatio = Math.sin(rightProgress * Math.PI * 0.5);
          sAngle -= tuckRatio * 0.20;
        }
        shoulderAngle = sAngle;
      } else {
        // Right shoulder: clean lead shoulder anchor with smooth curlEase chamber
        let sAngle = (Math.PI / 2.0) * (1 - curlEase) + (Math.PI / 1.70) * curlEase;
        if (isS1Active) {
          const isForward = rightFist ? rightFist.isPunching : false;
          const windupSplit = 0.52;
          if (isForward) {
            if (rightProgress < windupSplit) {
              // Windup pullback: strong, clear shoulder pullback charging the palm thrust
              const wT = rightProgress / windupSplit;
              const windupRatio = Math.sin(wT * Math.PI * 0.5);
              sAngle = Math.PI / 2.0 + windupRatio * 0.45;
            } else {
              // Push forward: drives shoulder forward behind straight palm thrust
              const thrustT = (rightProgress - windupSplit) / (1 - windupSplit);
              const thrustEase = 1 - Math.pow(1 - thrustT, 3.2);
              sAngle = (Math.PI / 2.0 + 0.45) * (1 - thrustEase) + (Math.PI / 3.4) * thrustEase;
            }
          } else {
            // Return back into stance (curls smoothly only after S1 finishes)
            const retEase = rightProgress * rightProgress * (3 - 2 * rightProgress);
            sAngle = (Math.PI / 2.0) * (1 - retEase) + (Math.PI / 3.4) * retEase;
          }
        } else if (isS3Active) {
          const sweepSin = Math.sin(rightProgress * Math.PI);
          sAngle = (Math.PI / 2.0) - sweepSin * 0.30;
        }
        shoulderAngle = sAngle;
      }
    }
    shoulderAngle = getKickShoulderAngle(fighter, isLeft, shoulderAngle);
    const anchorRadius = fighter.radius * 0.85;
    let shoulderX = Math.cos(shoulderAngle) * anchorRadius;
    let shoulderY = Math.sin(shoulderAngle) * anchorRadius;

    if (fighter.styleId === 'kyokushin' && isBlockingActive) {
      // Kyokushin Block Animation: Scaled to match standard arm & glove proportions with smooth rounded segments & thinner wrist
      const sqSize = fist.radius * 2.2; // Match standard shoulder joint square size

      // Hand and wrist straighten pressed against side, pushed outward
      const sideX = fighter.radius * 0.82;
      const sideY = isLeft ? -fighter.radius * 0.75 : fighter.radius * 0.75;
      const isP1 = fighter.isP1 !== undefined ? fighter.isP1 : fighter.isPlayer;
      const gloveColor = isP1 ? '#ef4444' : '#2563eb';

      // 1. Draw Connecting Sleeve Segment from Shoulder to Wrist (Matching standard arm thickness)
      const armDist = Math.hypot(sideX - shoulderX, sideY - shoulderY);
      const armAngle = Math.atan2(sideY - shoulderY, sideX - shoulderX);
      const armThickness = fist.radius * 1.9; // Match standard arm thickness

      ctx.save();
      ctx.translate(shoulderX, shoulderY);
      ctx.rotate(armAngle);

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.roundRect(-2, -armThickness / 2 + 2, armDist + 4, armThickness, 3);
      ctx.fill();

      // Main Grey Gi sleeve segment with smooth rounded corners
      ctx.fillStyle = '#5A6268';
      ctx.strokeStyle = '#111115';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-2, -armThickness / 2, armDist + 4, armThickness, 3);
      ctx.fill();
      ctx.stroke();

      // Inner fabric seam highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.fillRect(4, -armThickness / 4, armDist - 8, armThickness / 2);

      ctx.restore();

      // 2. Wrist and Glove at (sideX, sideY)
      ctx.save();
      ctx.translate(sideX, sideY);

      // Wrist cuff segment (Grey Gi - Thinner width & rounded corners)
      const wristW = fist.radius * 1.1;
      const wristH = fist.radius * 1.7;
      ctx.fillStyle = '#5A6268';
      ctx.strokeStyle = '#111115';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-wristW - 0.5, -wristH / 2, wristW, wristH, 3);
      ctx.fill();
      ctx.stroke();

      // Hand / Glove segment (Matching standard glove size and rounded square block)
      const handW = fist.radius * 2.25;
      const handH = fist.radius * 2.15;
      ctx.fillStyle = gloveColor;
      ctx.strokeStyle = '#111115';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(0, -handH / 2, handW, handH, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(2, -handH / 2 + 1, handW * 0.3, handH - 2);

      ctx.restore();

      // 3. Superior Shoulder Overlay Square (Matching standard arm scale with smooth rounded corners)
      ctx.save();
      ctx.translate(shoulderX, shoulderY);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.roundRect(-sqSize / 2 + 1.5, -sqSize / 2 + 1.5, sqSize, sqSize, 3);
      ctx.fill();
      ctx.fillStyle = '#5A6268'; // Grey Gi
      ctx.strokeStyle = '#111115';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-sqSize / 2, -sqSize / 2, sqSize, sqSize, 3);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.restore();
      return;
    }

    const clampedRes = getClampedFistPos(fighter, fist, idleTime, isBlockingActive, false, gameTime);
    const fistX = clampedRes.fistX;
    const fistY = clampedRes.fistY;
    const L1 = clampedRes.L1;
    const L2 = clampedRes.L2;
    const totalL = clampedRes.totalL;

    const targetFistX = fistX;
    const targetFistY = fistY;
    const dx = targetFistX - shoulderX;
    const dy = targetFistY - shoulderY;
    const D = Math.sqrt(dx * dx + dy * dy);
    const clampedD = D;

    let elbowX = shoulderX + (targetFistX - shoulderX) * 0.5;
    let elbowY = shoulderY + (targetFistY - shoulderY) * 0.5;

    const theta = Math.atan2(targetFistY - shoulderY, targetFistX - shoulderX);

    if (clampedD < totalL) {
      const cosA = Math.max(-1, Math.min(1, (L1 * L1 + clampedD * clampedD - L2 * L2) / (2 * L1 * clampedD)));
      const A = Math.acos(cosA);
      const bendDir = isLeft ? -1 : 1;
      const elbowAngle = theta + bendDir * A;
      
      elbowX = shoulderX + L1 * Math.cos(elbowAngle);
      elbowY = shoulderY + L1 * Math.sin(elbowAngle);
    } else {
      elbowX = shoulderX + L1 * Math.cos(theta);
      elbowY = shoulderY + L1 * Math.sin(theta);
    }

    let actualFistX = targetFistX;
    let actualFistY = targetFistY;

    // Super Cripple Visual Effect: Arm convulses smoothly & randomly every few hundred ms before pausing and repeating
    if (fighter.superCrippleTimer && fighter.superCrippleTimer > 0) {
      const cycle = 30; // ~500ms cycle
      const phase = gameTime % cycle;
      const convulseDuration = 11; // ~183ms convulsion window, followed by ~317ms clean pause
      if (phase < convulseDuration) {
        // Smooth sine envelope: starts at 0, smoothly peaks at center, returns to 0
        const env = Math.sin((phase / convulseDuration) * Math.PI);
        const spasmAngle = phase * 1.45 + (isLeft ? 0 : 2.1);
        const wave = Math.sin(spasmAngle) * 2.2 + Math.sin(spasmAngle * 2.3) * 0.7;
        const convulseX = wave * env;
        const convulseY = Math.cos(spasmAngle * 1.2) * 1.6 * env;
        elbowX += convulseX * 0.5;
        elbowY += convulseY * 0.5;
        actualFistX += convulseX;
        actualFistY += convulseY;
      }
    }

    if (fighter.styleId === 'street_boxing') {
      const ik = calculateStreetBoxingArmIK(
        fighter,
        fist,
        isLeft,
        shoulderX,
        shoulderY,
        L1,
        L2,
        idleTime,
        targetFistX,
        targetFistY,
        leftProgress,
        rightProgress,
        isBlockingActive
      );
      elbowX = ik.elbowX;
      elbowY = ik.elbowY;
      actualFistX = ik.actualFistX;
      actualFistY = ik.actualFistY;
    } else if (fighter.styleId === 'kyokushin' && !isLeft) {
      const isKyokushinWindup = (fighter.heavyWindup && fighter.heavyWindup > 0);
      const rightFistObj = fighter.fists ? (fighter.fists.find((f: any) => f.punchType === 'right') || fighter.fists[1]) : undefined;
      const isM2Exec = (rightFistObj && rightFistObj.isHeavy && (rightFistObj.isPunching || rightFistObj.punchProgress > 0)) || ((fighter as any).kyokushinM2PeakHoldTimer || 0) > 0;

      if (isKyokushinWindup) {
        const ratio = Math.min(1.0, Math.max(0, (33 - (fighter.heavyWindup || 0)) / 33));
        // Chamber elbow draws back along the outer right flank (+Y), away from center
        const chamberElbowX = shoulderX - L1 * 0.95;
        const chamberElbowY = shoulderY + L1 * 0.30;
        elbowX = elbowX * (1 - ratio) + chamberElbowX * ratio;
        elbowY = elbowY * (1 - ratio) + chamberElbowY * ratio;
        actualFistX = fistX;
        actualFistY = fistY;
      } else if (isM2Exec) {
        const isPunching = rightFistObj ? rightFistObj.isPunching : false;
        const p = rightFistObj ? rightFistObj.punchProgress : 0;
        const isPeak = ((fighter as any).kyokushinM2PeakHoldTimer || 0) > 0;
        if (isPunching) {
          // Piston thrust: elbow transitions smoothly from outer chamber to straight punch line
          const chamberElbowX = shoulderX - L1 * 0.95;
          const chamberElbowY = shoulderY + L1 * 0.30;
          const thrustElbowX = shoulderX + (actualFistX - shoulderX) * 0.50;
          const thrustElbowY = shoulderY + (actualFistY - shoulderY) * 0.50;
          elbowX = chamberElbowX * (1 - p) + thrustElbowX * p;
          elbowY = chamberElbowY * (1 - p) + thrustElbowY * p;
        } else if (isPeak) {
          elbowX = shoulderX + (actualFistX - shoulderX) * 0.50;
          elbowY = shoulderY + (actualFistY - shoulderY) * 0.50;
        } else {
          // Retraction: elbow smoothly eases from straight punch back to neutral Fudo Dachi
          const retractT = Math.min(1.0, Math.max(0, 1.0 - p));
          const ease = retractT * retractT * (3 - 2 * retractT);
          const straightElbowX = shoulderX + (actualFistX - shoulderX) * 0.50;
          const straightElbowY = shoulderY + (actualFistY - shoulderY) * 0.50;
          const neutralElbowX = shoulderX + L1 * Math.cos(0.04);
          const neutralElbowY = shoulderY + L1 * Math.sin(0.04);
          elbowX = straightElbowX * (1 - ease) + neutralElbowX * ease;
          elbowY = straightElbowY * (1 - ease) + neutralElbowY * ease;
        }
      }
    } else if (fighter.styleId === 'kyokushin' && isLeft) {
      const isKyokushinWindup = (fighter.heavyWindup && fighter.heavyWindup > 0);
      const rightFistObj = fighter.fists ? (fighter.fists.find((f: any) => f.punchType === 'right') || fighter.fists[1]) : undefined;
      const isM2Exec = (rightFistObj && rightFistObj.isHeavy && (rightFistObj.isPunching || rightFistObj.punchProgress > 0)) || ((fighter as any).kyokushinM2PeakHoldTimer || 0) > 0;

      if (isKyokushinWindup) {
        // Lead probe: Left arm extends forward smoothly along measuring line
        actualFistX = fistX;
        actualFistY = fistY;
      } else if (isM2Exec) {
        const isPunching = rightFistObj ? rightFistObj.isPunching : false;
        const p = rightFistObj ? rightFistObj.punchProgress : 0;
        const isPeak = ((fighter as any).kyokushinM2PeakHoldTimer || 0) > 0;
        if (isPunching) {
          // Hikite counter-pull: left elbow and forearm pull back with distinct slant across ribs
          const probeElbowX = shoulderX + L1 * Math.cos(-0.10);
          const probeElbowY = shoulderY + L1 * Math.sin(-0.10);
          const hikiteElbowX = shoulderX - L1 * 0.92;
          const hikiteElbowY = shoulderY - L1 * 0.42;
          elbowX = probeElbowX * (1 - p) + hikiteElbowX * p;
          elbowY = probeElbowY * (1 - p) + hikiteElbowY * p;
          actualFistX = fistX;
          actualFistY = fistY;
        } else if (isPeak) {
          // Peak freeze: slanted Hikite guard locked in place
          elbowX = shoulderX - L1 * 0.92;
          elbowY = shoulderY - L1 * 0.42;
          actualFistX = fistX;
          actualFistY = fistY;
        } else {
          // Retraction: left arm glides smoothly with slanted angle from Hikite back to Fudo Dachi center-chest guard
          const retractT = Math.min(1.0, Math.max(0, 1.0 - p));
          const ease = retractT * retractT * (3 - 2 * retractT);
          const hikiteElbowX = shoulderX - L1 * 0.92;
          const hikiteElbowY = shoulderY - L1 * 0.42;
          const slantedNeutralElbowX = shoulderX + L1 * Math.cos(-0.16);
          const slantedNeutralElbowY = shoulderY + L1 * Math.sin(-0.16);
          elbowX = hikiteElbowX * (1 - ease) + slantedNeutralElbowX * ease;
          elbowY = hikiteElbowY * (1 - ease) + slantedNeutralElbowY * ease;
          actualFistX = fistX;
          actualFistY = fistY;
        }
      }
    } else if (fighter.styleId === 'shotokan' && isLeft && leftProgress > 0) {
      const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
      if (stage === 0) {
        const ep = fist.punchProgress;
        const thrustP = ep < 0.25 ? 0 : (ep - 0.25) / 0.75;
        elbowX = shoulderX + thrustP * fighter.radius * 1.85;
        elbowY = shoulderY - fighter.radius * 0.15 + thrustP * fighter.radius * 0.2;
      }
    } else if (fighter.styleId === 'muay_thai' && !isLeft && rightProgress > 0) {
      const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
      if (stage === 2 && !fist.isHeavy) {
        // S3 SOK TAT (Horizontal Slicing Elbow) - Shoulder axis rotates forward in a slicing arc from right to left
        const p = Math.sin(fist.punchProgress * Math.PI * 0.5);
        const upperArmLen = fighter.radius * (0.90 + Math.sin(p * Math.PI) * 0.20);
        const startAngle = Math.PI * 0.35; // Cocked right
        const endAngle = -Math.PI * 0.35; // Sweeps across centerline to left
        const sweepAngle = startAngle + p * (endAngle - startAngle);

        elbowX = shoulderX + upperArmLen * Math.cos(sweepAngle);
        elbowY = shoulderY + upperArmLen * Math.sin(sweepAngle);

        const acuteAngleOffset = 0.55; // Forearm folded inside towards chest
        const forearmAngle = sweepAngle + Math.PI + acuteAngleOffset; // '+' folds forearm inside towards chest
        const forearmDist = fighter.radius * 0.65;

        actualFistX = elbowX + forearmDist * Math.cos(forearmAngle);
        actualFistY = elbowY + forearmDist * Math.sin(forearmAngle);
      }
    } else if (fighter.styleId === 'aikido') {
      const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
      const isCurledForS2 = (fighter.comboStage === 1 && rightProgress === 0) || (leftProgress > 0 && (stage === 1 || stage === 0 || leftFist?.comboStage === 1));
      const curlFactor = (fighter as any).aikiCurlFactor !== undefined ? (fighter as any).aikiCurlFactor : (isCurledForS2 ? 1.0 : 0.0);
      const curlEase = 0.5 - 0.5 * Math.cos(curlFactor * Math.PI);

      if (isLeft && leftProgress > 0 && (stage === 1 || stage === 0 || leftFist?.comboStage === 1)) {
        // S2 LEFT ARM SWEEP: STRAIGHT ARM CHOP (Tegatana knife-hand blade)
        // Keep the arm completely straight throughout the swing like a blade, not bent like a punch!
        const armAngle = Math.atan2(targetFistY - shoulderY, targetFistX - shoulderX);
        elbowX = shoulderX + L1 * Math.cos(armAngle);
        elbowY = shoulderY + L1 * Math.sin(armAngle);
        actualFistX = shoulderX + (L1 + L2) * Math.cos(armAngle);
        actualFistY = shoulderY + (L1 + L2) * Math.sin(armAngle);
      } else if (!isLeft && rightProgress > 0 && (stage === 0 || rightFist?.comboStage === 0)) {
        // S1 RIGHT ARM PALM THRUST:
        // "Palm elbow should flare to its limits before pushing full force."
        const isForward = rightFist ? rightFist.isPunching : false;
        const windupSplit = 0.52;
        if (isForward) {
          if (rightProgress < windupSplit) {
            // Windup / Pullback: Palm pulls deeply into chest while elbow flares out to its mechanical limits
            const wT = rightProgress / windupSplit;
            const flareRatio = Math.sin(wT * Math.PI * 0.5);

            // Flared elbow cocking angle: pushes outwards/laterally to maximum limit
            const flareAngle = shoulderAngle + 0.85 * flareRatio;
            const flaredElbowX = shoulderX + L1 * Math.cos(flareAngle) - fighter.radius * 0.35 * flareRatio;
            const flaredElbowY = shoulderY + L1 * Math.sin(flareAngle) + fighter.radius * 0.45 * flareRatio;

            elbowX = elbowX * (1 - flareRatio) + flaredElbowX * flareRatio;
            elbowY = elbowY * (1 - flareRatio) + flaredElbowY * flareRatio;
            actualFistX = targetFistX;
            actualFistY = targetFistY;
          } else {
            // Explosive Thrust: Flared elbow snaps directly behind palm thrust delivering full force along centerline
            const thrustT = (rightProgress - windupSplit) / (1 - windupSplit);
            const thrustEase = 1 - Math.pow(1 - thrustT, 3.2);

            const startFlareAngle = shoulderAngle + 0.85;
            const startFlaredX = shoulderX + L1 * Math.cos(startFlareAngle) - fighter.radius * 0.35;
            const startFlaredY = shoulderY + L1 * Math.sin(startFlareAngle) + fighter.radius * 0.45;

            const thrustAngle = Math.atan2(targetFistY - shoulderY, targetFistX - shoulderX);
            const straightElbowX = shoulderX + L1 * Math.cos(thrustAngle);
            const straightElbowY = shoulderY + L1 * Math.sin(thrustAngle);

            elbowX = startFlaredX * (1 - thrustEase) + straightElbowX * thrustEase;
            elbowY = startFlaredY * (1 - thrustEase) + straightElbowY * thrustEase;
            actualFistX = targetFistX;
            actualFistY = targetFistY;
          }
        }
      } else if (!isLeft && rightProgress > 0 && (stage === 3 || rightFist?.comboStage === 3)) {
        // S4 SHOMENUCHI FLARING PALM DRIVE:
        // Frames 0–5 (Windup & Stance Flare): Pulls back to charge, deliberately flaring Right Elbow outward at an aggressive angle
        // Frames 6–9 (The Straight Palm Thrust): Snaps forward in piston-like linear drive straight down pipe
        const isForward = rightFist ? rightFist.isPunching : false;
        const windupSplit = 0.55;
        if (isForward) {
          if (rightProgress < windupSplit) {
            const wT = rightProgress / windupSplit;
            const flareRatio = Math.sin(wT * Math.PI * 0.5);

            const flareAngle = shoulderAngle + 0.95 * flareRatio;
            const flaredElbowX = shoulderX + L1 * Math.cos(flareAngle) - fighter.radius * 0.40 * flareRatio;
            const flaredElbowY = shoulderY + L1 * Math.sin(flareAngle) + fighter.radius * 0.55 * flareRatio;

            elbowX = elbowX * (1 - flareRatio) + flaredElbowX * flareRatio;
            elbowY = elbowY * (1 - flareRatio) + flaredElbowY * flareRatio;
            actualFistX = targetFistX;
            actualFistY = targetFistY;
          } else {
            const thrustT = (rightProgress - windupSplit) / (1 - windupSplit);
            const thrustEase = 1 - Math.pow(1 - thrustT, 3.5);

            const startFlareAngle = shoulderAngle + 0.95;
            const startFlaredX = shoulderX + L1 * Math.cos(startFlareAngle) - fighter.radius * 0.40;
            const startFlaredY = shoulderY + L1 * Math.sin(startFlareAngle) + fighter.radius * 0.55;

            const thrustAngle = Math.atan2(targetFistY - shoulderY, targetFistX - shoulderX);
            const straightElbowX = shoulderX + L1 * Math.cos(thrustAngle);
            const straightElbowY = shoulderY + L1 * Math.sin(thrustAngle);

            elbowX = startFlaredX * (1 - thrustEase) + straightElbowX * thrustEase;
            elbowY = startFlaredY * (1 - thrustEase) + straightElbowY * thrustEase;
            actualFistX = targetFistX;
            actualFistY = targetFistY;
          }
        }
      } else if (!isLeft && curlEase > 0.001 && rightProgress === 0) {
        // Curls up ONLY after S1 finishes, and uncurls ONLY after S2 finishes!
        // Smoothly blend standard geometric elbow IK with curled chamber position:
        const chamberElbowX = shoulderX + fighter.radius * 0.38;
        const chamberElbowY = shoulderY + fighter.radius * 0.34;
        elbowX = elbowX * (1 - curlEase) + chamberElbowX * curlEase;
        elbowY = elbowY * (1 - curlEase) + chamberElbowY * curlEase;
        actualFistX = targetFistX;
        actualFistY = targetFistY;
      }
    } else if (fighter.styleId === 'keysi') {
      const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
      const isStriking = (isLeft && leftProgress > 0) || (!isLeft && rightProgress > 0);
      const isHeavyStrike = fist.isHeavy && ((isLeft && leftProgress > 0) || (!isLeft && rightProgress > 0));

      if (fighter.heavyWindup && fighter.heavyWindup > 0) {
        // M2 Windup: Opens elbows away from the head to prime the clinch smoothly without teleporting
        const maxW = fighter.maxHeavyWindup || (fighter.keysiHasSuperArmor ? 6 : 26);
        const ratio = Math.min(1, Math.max(0, (maxW - fighter.heavyWindup) / maxW));
        const wEase = Math.sin(ratio * Math.PI * 0.5);

        // Neutral Pensador guard values
        const neutralElbowX = fighter.radius * 0.82;
        const neutralElbowY = fighter.radius * 0.32;
        const windupEndElbowX = fighter.radius * 0.52;
        const windupEndElbowY = fighter.radius * 1.15;

        elbowX = neutralElbowX + (windupEndElbowX - neutralElbowX) * wEase;
        const curY = neutralElbowY + (windupEndElbowY - neutralElbowY) * wEase;
        elbowY = isLeft ? -curY : curY;
        actualFistX = -fighter.radius * 0.05;
        actualFistY = isLeft ? -fighter.radius * 0.40 : fighter.radius * 0.40;
      } else if (fighter.keysiClinchStage === 'delay') {
        // M2 Grab Delay: Smoothly pushes elbows forward from windupEnd (0.52 * R, 1.15 * R) and tightens in around enemy head circle
        const p = 1 - ((fighter.keysiClinchTimer || 0) / 8);
        const pEase = Math.sin(p * Math.PI * 0.5);
        const target = fighter.keysiClinchTarget;
        const targetRadius = target ? target.radius : fighter.radius;

        const startElbowX = fighter.radius * 0.52;
        const startElbowY = fighter.radius * 1.15;
        const clampedElbowX = fighter.radius * 0.65 + targetRadius * 0.85;
        const clampedElbowY = targetRadius * 1.02;

        elbowX = startElbowX + (clampedElbowX - startElbowX) * pEase;
        const curY = startElbowY + (clampedElbowY - startElbowY) * pEase;
        elbowY = isLeft ? -curY : curY;
        actualFistX = -fighter.radius * 0.05 + (fighter.radius * 0.30) * pEase;
        actualFistY = isLeft ? -fighter.radius * 0.45 : fighter.radius * 0.45;
      } else if (fighter.keysiClinchStage === 'clinch') {
        // M2 Clinch: The arms lock in place holding the opponent's head circle!
        // Compensate for circle head's lungeOffset so the arms DO NOT move backward or forward with the circle head.
        // The elbow clamp is NOT removed until the animation finishes.
        const target = fighter.keysiClinchTarget;
        const targetRadius = target ? target.radius : fighter.radius;
        const clampedElbowX = fighter.radius * 0.65 + targetRadius * 0.85;
        const clampedElbowY = targetRadius * 1.02;
        const clinchTimer = fighter.keysiClinchTimer || 0;

        if (clinchTimer > 6) {
          // Clamp locked firmly around enemy head: arms stay anchored in place while only the circle head moves!
          elbowX = clampedElbowX - lungeOffset;
          elbowY = isLeft ? -clampedElbowY : clampedElbowY;
          actualFistX = fighter.radius * 0.25 - lungeOffset;
          actualFistY = isLeft ? -fighter.radius * 0.52 : fighter.radius * 0.52;
        } else {
          // Final recovery: clamp releases as fighter returns to neutral Pensador stance
          const relP = clinchTimer / 6;
          const targetRelElbowX = clampedElbowX - lungeOffset;
          const neutralElbowX = fighter.radius * 0.82;
          const neutralElbowY = fighter.radius * 0.32;
          elbowX = neutralElbowX + (targetRelElbowX - neutralElbowX) * relP;
          const curY = neutralElbowY + (clampedElbowY - neutralElbowY) * relP;
          elbowY = isLeft ? -curY : curY;
          actualFistX = -fighter.radius * 0.05 + (fighter.radius * 0.30) * relP;
          actualFistY = isLeft ? -fighter.radius * 0.40 : fighter.radius * 0.40;
        }
      } else if (isHeavyStrike || (!isLeft && stage === 3 && rightProgress > 0)) {
        // No arm swing for Keysi S4 Knee: Keep arms tucked in Pensador Guard Stance
        elbowX = fighter.radius * 0.82;
        elbowY = isLeft ? -fighter.radius * 0.32 : fighter.radius * 0.32;
        actualFistX = isLeft ? -fighter.radius * 0.05 : -fighter.radius * 0.05;
        actualFistY = isLeft ? -fighter.radius * 0.52 : fighter.radius * 0.52;
      } else if (isLeft && leftProgress > 0 && stage === 0) {
        // S1 Pensador Elbow Wedge: Left elbow drives sharply forward into CQC pocket
        const ease = Math.sin(fist.punchProgress * Math.PI);
        elbowX = shoulderX + (0.95 + ease * 0.85) * fighter.radius;
        elbowY = shoulderY + (0.60 - ease * 0.25) * fighter.radius;
      } else if (isLeft && leftProgress > 0 && stage === 2) {
        // S3 Horizontal Elbow Swing:
        // Arm stays bent in Pensador frame with hand locked behind temple (arm unaffected)
        // Elbow pulls back to the right, then swings forcefully across to the left
        const p = leftProgress;
        const isForward = fist.isPunching;
        let swingFactor = 0;
        let coilFactor = 0;
        if (isForward) {
          if (p < 0.25) {
            coilFactor = Math.sin((p / 0.25) * Math.PI * 0.5);
            swingFactor = 0;
          } else {
            const t = (p - 0.25) / 0.75;
            coilFactor = 1 - t;
            swingFactor = Math.sin(t * Math.PI * 0.5);
          }
        } else {
          swingFactor = p * p * (3 - 2 * p);
          coilFactor = 0;
        }

        const baseElbowX = fighter.radius * 0.82;
        const baseElbowY = -fighter.radius * 0.32;
        elbowX = baseElbowX - coilFactor * fighter.radius * 0.15 + swingFactor * fighter.radius * 0.55;
        elbowY = baseElbowY + coilFactor * fighter.radius * 0.28 - swingFactor * fighter.radius * 0.60;

        // Hand stays locked at temple/head
        actualFistX = -fighter.radius * 0.05;
        actualFistY = -fighter.radius * 0.52;
      } else if (isBlockingActive && !isStriking) {
        // Crossed Forearms Block: Forearms cross tightly in front of the chest/chin
        // Left arm crosses underneath toward the right flank
        // Right arm crosses over on top toward the left flank
        if (isLeft) {
          elbowX = fighter.radius * 0.85;
          elbowY = -fighter.radius * 0.38;
          actualFistX = fighter.radius * 0.74;
          actualFistY = fighter.radius * 0.42;
        } else {
          elbowX = fighter.radius * 0.92;
          elbowY = fighter.radius * 0.38;
          actualFistX = fighter.radius * 0.82;
          actualFistY = -fighter.radius * 0.40;
        }
      } else if (!isStriking) {
        // Pensador Guard Stance: Forward-pointing elbow wedges shielding head
        elbowX = fighter.radius * 0.82;
        elbowY = isLeft ? -fighter.radius * 0.32 : fighter.radius * 0.32;
      }
    } else if (fighter.styleId === 'cqc') {
      const isM2Active = (fighter.heavyWindup && fighter.heavyWindup > 0) || fighter.cqcM2Stage;
      const isStriking = (isLeft && leftProgress > 0) || (!isLeft && rightProgress > 0);
      if (isM2Active) {
        // CQC M2: Arms remain crossed, but not crossed over:
        // Elbows stay separated on their respective flanks (arms do NOT cross over body)
        // Forearms angle inwards, wrists and hands cross over each other
        const pulse = fighter.cqcM2Stage === 'assault' ? Math.sin((fighter.cqcAssaultTimer || 0) * 0.8) * 1.5 : 0;
        const forwardExt = (fighter.cqcM2Stage === 'dash' ? 4 : (fighter.cqcM2Stage === 'assault' ? 3 : 0)) + pulse;
        if (isLeft) {
          elbowX = fighter.radius * 0.60 + forwardExt;
          elbowY = -fighter.radius * 0.35; // Firmly on left flank (not crossed over)
          actualFistX = fighter.radius * 0.70 + forwardExt;
          actualFistY = fighter.radius * 0.22; // Wrist and hand cross over to the right
        } else {
          elbowX = fighter.radius * 0.64 + forwardExt;
          elbowY = fighter.radius * 0.35; // Firmly on right flank (not crossed over)
          actualFistX = fighter.radius * 0.76 + forwardExt;
          actualFistY = -fighter.radius * 0.22; // Wrist and hand cross over to the left
        }
      } else if (isBlockingActive && !isStriking) {
        // CQC Crossed-Arm Block: Tight tactical cross
        if (isLeft) {
          elbowX = fighter.radius * 0.62;
          elbowY = -fighter.radius * 0.30;
          actualFistX = fighter.radius * 0.70;
          actualFistY = fighter.radius * 0.16;
        } else {
          elbowX = fighter.radius * 0.66;
          elbowY = fighter.radius * 0.30;
          actualFistX = fighter.radius * 0.74;
          actualFistY = -fighter.radius * 0.16;
        }
      }
    } else if (fighter.styleId === 'boxing_shell') {
      // Right arm is lead shoulder, Left arm is non-lead
      const isLead = !isLeft;
      const progress = isLeft ? leftProgress : rightProgress;
      const isStriking = progress > 0;
      const isHeavy = fist.isHeavy;
      const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
      const sideSign = isLeft ? -1 : 1;

      if (isHeavy) {
        // Heavy Strike (M2): Fast Philly Shoulder Roll - NO HOOK / PUNCH!
        // Lead arm stays locked tightly in the shoulder-roll guard tucked across the midsection/ribs,
        // rolling with the ~62° deflection turn and snapping cleanly back into stance
        const shoulderRollAngle = 0.08;
        elbowX = shoulderX + L1 * Math.cos(shoulderRollAngle);
        elbowY = shoulderY + L1 * Math.sin(shoulderRollAngle);
        const forearmRollAngle = -Math.PI / 2.15;
        actualFistX = elbowX + L2 * Math.cos(forearmRollAngle);
        actualFistY = elbowY + L2 * Math.sin(forearmRollAngle);
      } else if (isLead) {
        // LEAD ARM (RIGHT ARM):
        if (isStriking && (stage === 0 || stage === 1)) {
          const isForward = fist.isPunching;
          const chargeLimit = stage === 0 ? 0.28 : 0.24;
          const p = fist.punchProgress;
          const straightSideAngle = stage === 1 ? 0.38 : 0.48; // Punches outward to the right side flank

          // Resting visibly curled Philly Shell arm geometry on the side flank:
          const baseElbowX = shoulderX + L1 * Math.cos(0.12);
          const baseElbowY = shoulderY + L1 * Math.sin(0.12);
          const baseFistX = baseElbowX + L2 * Math.cos(-Math.PI / 2.2);
          const baseFistY = baseElbowY + L2 * Math.sin(-Math.PI / 2.2);

          // Straight extension punching out to the side:
          const straightReachMultiplier = stage === 1 ? 1.15 : 1.10;
          const straightElbowX = shoulderX + L1 * Math.cos(straightSideAngle);
          const straightElbowY = shoulderY + L1 * Math.sin(straightSideAngle);
          const straightFistX = shoulderX + (L1 + L2) * straightReachMultiplier * Math.cos(straightSideAngle);
          const straightFistY = shoulderY + (L1 + L2) * straightReachMultiplier * Math.sin(straightSideAngle);

          if (isForward) {
            if (p < chargeLimit) {
              // Visible Curl to the side: Arm stays visibly curled and coils tightly along the side flank
              const wT = p / chargeLimit;
              const chamberEase = Math.sin(wT * Math.PI * 0.5);
              const curElbowAngle = 0.12 + 0.15 * chamberEase;
              const curForearmAngle = -Math.PI / 2.2 - 0.20 * chamberEase;
              elbowX = shoulderX + L1 * Math.cos(curElbowAngle) - fighter.radius * 0.12 * chamberEase;
              elbowY = shoulderY + L1 * Math.sin(curElbowAngle) + fighter.radius * 0.08 * chamberEase;
              actualFistX = elbowX + L2 * Math.cos(curForearmAngle);
              actualFistY = elbowY + L2 * Math.sin(curForearmAngle);
            } else {
              // Straighten and punch to the side: Explosive linear snap straight out to the side!
              const snapT = (p - chargeLimit) / (1.0 - chargeLimit);
              const snapEase = 1 - Math.pow(1 - snapT, 3.2);

              // Curled start position at end of windup on side:
              const startElbowX = shoulderX + L1 * Math.cos(0.12 + 0.15) - fighter.radius * 0.12;
              const startElbowY = shoulderY + L1 * Math.sin(0.12 + 0.15) + fighter.radius * 0.08;
              const startFistX = startElbowX + L2 * Math.cos(-Math.PI / 2.2 - 0.20);
              const startFistY = startElbowY + L2 * Math.sin(-Math.PI / 2.2 - 0.20);

              // Snaps from visible side curl into 100% straight side line punching to the side:
              elbowX = startElbowX * (1 - snapEase) + straightElbowX * snapEase;
              elbowY = startElbowY * (1 - snapEase) + straightElbowY * snapEase;
              actualFistX = startFistX * (1 - snapEase) + straightFistX * snapEase;
              actualFistY = startFistY * (1 - snapEase) + straightFistY * snapEase;
            }
          } else {
            // Retraction: Smoothly returns from straight side punch back into curled Philly Shell guard on the side
            const retEase = p * p * (3 - 2 * p);
            elbowX = baseElbowX * (1 - retEase) + straightElbowX * retEase;
            elbowY = baseElbowY * (1 - retEase) + straightElbowY * retEase;
            actualFistX = baseFistX * (1 - retEase) + straightFistX * retEase;
            actualFistY = baseFistY * (1 - retEase) + straightFistY * retEase;
          }
        } else if (leftProgress > 0 && stage === 2) {
          // S3 DYNAMIC LEAD FEINT:
          // Right lead arm rapidly feints forward in a crisp jab/probe motion during early S3
          // to draw the opponent's guard before snapping tightly back to midsection as the rear hook lands!
          const feintT = Math.min(1.0, leftProgress * 2.2);
          const feintEase = Math.sin(feintT * Math.PI);
          const feintAngle = 0.28;
          const feintReach = 1.30;
          const feintElbowX = shoulderX + L1 * Math.cos(feintAngle) * (1.0 + 0.20 * feintEase);
          const feintElbowY = shoulderY + L1 * Math.sin(feintAngle) * (1.0 + 0.20 * feintEase);
          const feintForearmAngle = (-Math.PI / 2.2) * (1 - feintEase) + (feintAngle - 0.08) * feintEase;

          elbowX = feintElbowX;
          elbowY = feintElbowY;
          actualFistX = elbowX + L2 * Math.cos(feintForearmAngle) * (1.0 + (feintReach - 1.0) * feintEase);
          actualFistY = elbowY + L2 * Math.sin(feintForearmAngle) * (1.0 + (feintReach - 1.0) * feintEase);
        } else if (leftProgress > 0 && stage === 3) {
          // S4 OVERHAND COUNTER-PULL:
          // Right lead arm stays low across ribs and pulls back tightly as kinetic counterweight
          const counterP = Math.sin(leftProgress * Math.PI);
          elbowX = shoulderX + L1 * Math.cos(0.12 - 0.15 * counterP) - fighter.radius * 0.08 * counterP;
          elbowY = shoulderY + L1 * Math.sin(0.12 - 0.15 * counterP);
          actualFistX = elbowX + L2 * Math.cos(-Math.PI / 2.2 - 0.10 * counterP);
          actualFistY = elbowY + L2 * Math.sin(-Math.PI / 2.2 - 0.10 * counterP);
        } else {
          // STANCE IDLE / GUARD:
          // Low lead arm across midsection / ribs (visibly curled up on the side)
          elbowX = shoulderX + L1 * Math.cos(0.12);
          elbowY = shoulderY + L1 * Math.sin(0.12);
          actualFistX = elbowX + L2 * Math.cos(-Math.PI / 2.2);
          actualFistY = elbowY + L2 * Math.sin(-Math.PI / 2.2);
        }
      } else {
        // NON-LEAD ARM (LEFT ARM):
        const isForward = fist.isPunching;
        if (isStriking && stage === 2) {
          // S3: Looping L-shape hook! Shoulder drives forward, upper arm loops wide, forearm forms crisp 90° L-shape
          // Snappy forward drive + smooth acceleration & deceleration + fluid retraction back to stance
          const sFactor = isForward 
            ? (Math.sin(progress * Math.PI * 0.5) * 0.35 + (1 - Math.pow(1 - progress, 2.2)) * 0.65) 
            : (progress * progress * (3 - 2 * progress));
          // Smoothly uncoil from tight cheek guard into crisp 90° hook
          const uncoil = Math.min(1.0, sFactor * 2.2);
          const smoothUncoil = uncoil * uncoil * (3 - 2 * uncoil);
          // Looping arc: curves wide on the strike path
          const loopArc = Math.sin(sFactor * Math.PI) * 0.35;
          const targetUpperAngle = 0.38 - loopArc;
          const upperAngle = 0.04 * (1 - smoothUncoil) + targetUpperAngle * smoothUncoil;
          const hookL1 = L1 * 1.15;
          const hookL2 = L2 * 1.15;
          elbowX = shoulderX + hookL1 * Math.cos(upperAngle);
          elbowY = shoulderY + hookL1 * Math.sin(upperAngle);
          // Forearm unfolds smoothly from tight cheek guard into exact unslanted 90° L-shape hook
          const startForearmAngle = Math.PI - 0.22;
          const targetForearmAngle = upperAngle + Math.PI / 2;
          const forearmAngle = startForearmAngle * (1 - smoothUncoil) + targetForearmAngle * smoothUncoil;
          actualFistX = elbowX + hookL2 * Math.cos(forearmAngle);
          actualFistY = elbowY + hookL2 * Math.sin(forearmAngle);
        } else if (isStriking && stage === 3) {
          // S4: Looping overhead hook!
          // Shoulder pulls back with arm in L shape during chamber,
          // then swings in a wide, looping overhand trajectory over the top towards target!
          let sFactor = 0;
          let pullback = 0;
          let upperAngle = 0.04;
          let forearmAngle = Math.PI - 0.22;
          let curShoulderX = shoulderX;
          let curShoulderY = shoulderY;

          if (isForward) {
            if (progress < 0.28) {
              // Chamber / Pullback: Shoulder pulls back smoothly from guard into chamber
              const wT = progress / 0.28;
              const smoothWT = wT * wT * (3 - 2 * wT);
              pullback = Math.sin(wT * Math.PI / 2);
              curShoulderX = shoulderX - pullback * fighter.radius * 0.25;
              curShoulderY = shoulderY - pullback * fighter.radius * 0.20;
              const chamberUpper = -0.55;
              upperAngle = 0.04 * (1 - smoothWT) + chamberUpper * smoothWT;
              const targetForearm = upperAngle + Math.PI / 2;
              forearmAngle = (Math.PI - 0.22) * (1 - smoothWT) + targetForearm * smoothWT;
              sFactor = 0;
            } else {
              // Looping overhand punch extend: snappy acceleration and smooth finish
              const sT = (progress - 0.28) / 0.72;
              pullback = Math.cos(sT * Math.PI / 2);
              sFactor = Math.sin(sT * Math.PI * 0.5) * 0.35 + (1 - Math.pow(1 - sT, 2.2)) * 0.65;
              curShoulderX = shoulderX - pullback * fighter.radius * 0.25 + sFactor * fighter.radius * 0.35;
              curShoulderY = shoulderY - pullback * fighter.radius * 0.20;
              const loopBaseAngle = (-0.55) * (1 - sFactor) + 0.65 * sFactor;
              const loopWiden = Math.sin(sFactor * Math.PI) * 0.42;
              upperAngle = loopBaseAngle - loopWiden;
              const relativeBend = (Math.PI / 2) * (1 - sFactor) + 0.50 * sFactor;
              forearmAngle = upperAngle + relativeBend;
            }
          } else {
            // Retraction: smoothly and cleanly pulls directly back into stance
            sFactor = progress * progress * (3 - 2 * progress);
            curShoulderX = shoulderX + sFactor * fighter.radius * 0.35;
            curShoulderY = shoulderY;
            const loopBaseAngle = (-0.55) * (1 - sFactor) + 0.65 * sFactor;
            upperAngle = 0.04 * (1 - sFactor) + loopBaseAngle * sFactor;
            const relativeBend = (Math.PI / 2) * (1 - sFactor) + 0.50 * sFactor;
            const strikeForearm = upperAngle + relativeBend;
            forearmAngle = (Math.PI - 0.22) * (1 - sFactor) + strikeForearm * sFactor;
          }

          const hookL1 = L1 * 1.15;
          const hookL2 = L2 * 1.15;
          elbowX = curShoulderX + hookL1 * Math.cos(upperAngle);
          elbowY = curShoulderY + hookL1 * Math.sin(upperAngle);
          actualFistX = elbowX + hookL2 * Math.cos(forearmAngle);
          actualFistY = elbowY + hookL2 * Math.sin(forearmAngle);
        } else {
          // STANCE IDLE / GUARD:
          // "Left arm is Incorrect, The shoulder remains straight but becomes manipulated in animation.
          //  Then the wrist is tightly closed near the shoulder. And the Shoulder is abit rotated to the left"
          // Shoulder / Upper arm extends straight forward:
          const straightAngle = 0.04;
          elbowX = shoulderX + L1 * Math.cos(straightAngle);
          elbowY = shoulderY + L1 * Math.sin(straightAngle);
          // Forearm folded tightly closed back towards the shoulder with wrist right near shoulder:
          const foldAngle = Math.PI - 0.22;
          actualFistX = elbowX + L2 * Math.cos(foldAngle);
          actualFistY = elbowY + L2 * Math.sin(foldAngle);
        }
      }
    } else {
      const kickArm = getKickArmIK(fighter, fist, isLeft, shoulderX, shoulderY, L1, L2);
      if (kickArm.isOverridden) {
        elbowX = kickArm.elbowX;
        elbowY = kickArm.elbowY;
        actualFistX = kickArm.actualFistX;
        actualFistY = kickArm.actualFistY;
      }
    }

    const armThickness = fist.radius * 1.9;

    // Enforce fixed segment lengths L1 and L2 so arms never stretch or detach
    const curUpperArmLen = Math.hypot(elbowX - shoulderX, elbowY - shoulderY);
    if (curUpperArmLen > 0) {
      elbowX = shoulderX + ((elbowX - shoulderX) / curUpperArmLen) * L1;
      elbowY = shoulderY + ((elbowY - shoulderY) / curUpperArmLen) * L1;
    }
    const curForearmLen = Math.hypot(actualFistX - elbowX, actualFistY - elbowY);
    if (curForearmLen > 0) {
      actualFistX = elbowX + ((actualFistX - elbowX) / curForearmLen) * L2;
      actualFistY = elbowY + ((actualFistY - elbowY) / curForearmLen) * L2;
    }

    const upperArmLen = L1;
    const forearmLen = L2;

    // Aikido Super Armor arm-only visual effect (Super Armor Visual ONLY applies to Aikido, arms ONLY, no Circle VFX)
    const isArmSuperArmorFlashing = fighter.styleId === 'aikido' && saFlashAlpha > 0.04 && !isHitFlashing && !isCqcM2HitFlashing;
    const isArmSuperArmorActive = fighter.styleId === 'aikido' && isFighterSuperArmorActive(fighter) && !isHitFlashing && !isCqcM2HitFlashing;

    // 1. Draw UPPER ARM block
    ctx.save();
    ctx.translate(shoulderX, shoulderY);
    ctx.rotate(Math.atan2(elbowY - shoulderY, elbowX - shoulderX));
    
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.roundRect(-2, -armThickness/2 + 2, upperArmLen + 4, armThickness, 3);
    ctx.fill();

    const isImpactSil = isImpactFrameSilhouette(fighter);
    const armFillColor = isImpactSil ? '#050505' : (isHitFlashing ? '#ef4444' : (isArmSuperArmorFlashing ? (saFlashAlpha > 0.6 ? '#bae6fd' : '#38bdf8') : (isArmSuperArmorActive ? '#38bdf8' : (fighter.styleId === 'kyokushin' ? fighter.color : (fighter.styleId === 'keysi' ? '#1A1A1A' : (fighter.styleId === 'cqc' ? '#111111' : fighter.secondaryColor))))));
    ctx.fillStyle = armFillColor;
    const isKakeUkeActive = fighter.styleId === 'ashihara' && fighter.heavyWindup && fighter.heavyWindup > 0;
    if (isArmSuperArmorFlashing) {
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 14.4 * saFlashAlpha;
    } else if (isArmSuperArmorActive) {
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 7;
    }
    ctx.strokeStyle = isImpactSil ? '#ffffff' : ((isArmSuperArmorFlashing || isArmSuperArmorActive) ? '#00e5ff' : (isKakeUkeActive ? '#1d4ed8' : (fighter.styleId === 'keysi' ? '#ef4444' : (fighter.styleId === 'cqc' ? '#000000' : '#111115'))));
    ctx.lineWidth = isImpactSil ? 3.0 : (isArmSuperArmorFlashing ? (3.5 + 1.6 * saFlashAlpha) : ((isArmSuperArmorActive || isKakeUkeActive) ? 3.5 : 2.5));
    ctx.beginPath();
    ctx.roundRect(-2, -armThickness/2, upperArmLen + 4, armThickness, 3);
    ctx.fill();
    ctx.stroke();

    // DRAW PRAJIAD (MUAY THAI ARMBAND)
    if (fighter.styleId === 'muay_thai' && isLeft) {
      const bandW = armThickness * 1.35;
      const bandH = fighter.radius * 0.28;
      
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.roundRect(1, -bandW / 2, bandH, bandW, 1.5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#dc2626';
      ctx.fillRect(1 + bandH * 0.25, -bandW / 2 + 1, bandH * 0.5, 3);
      ctx.fillRect(1 + bandH * 0.25, -1.5, bandH * 0.5, 3);
      ctx.fillRect(1 + bandH * 0.25, bandW / 2 - 4, bandH * 0.5, 3);

      ctx.save();
      const armAngle = Math.atan2(elbowY - shoulderY, elbowX - shoulderX);
      const swing = Math.sin(Date.now() / 140) * 0.18;
      ctx.rotate(-armAngle - Math.PI + swing);

      ctx.lineWidth = 2.0;
      
      ctx.strokeStyle = '#2563eb';
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.quadraticCurveTo(8, -6, 16, -2);
      ctx.stroke();

      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(16, -2, 2.0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.quadraticCurveTo(6, 6, 14, 5);
      ctx.stroke();

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(14, 5, 2.0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    ctx.restore();

    // Aikido S4 Shomenuchi: Condensed kinetic pressure ring gathers at flared right elbow during windup (Frames 0-5)
    const currentComboStage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
    if (fighter.styleId === 'aikido' && !isLeft && (currentComboStage === 3 || rightFist?.comboStage === 3) && rightProgress > 0 && rightProgress < 0.55) {
      const ringT = rightProgress / 0.55;
      const ringPulse = Math.sin(gameTime * 0.5) * 0.15 + 0.95;
      const ringRadius = (fighter.radius * 0.40) * (0.6 + 0.4 * ringT) * ringPulse;
      ctx.save();
      ctx.translate(elbowX, elbowY);
      
      // Outer kinetic pressure ring
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.85 * (1 - ringT * 0.15)})`;
      ctx.lineWidth = 2.4;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 9;
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner condensed pressure core
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Draw FOREARM block
    ctx.save();
    ctx.translate(elbowX, elbowY);
    const forearmAngle = Math.atan2(actualFistY - elbowY, actualFistX - elbowX);
    ctx.rotate(forearmAngle);

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.roundRect(-2, -armThickness/2 + 2, forearmLen + 2, armThickness, 3);
    ctx.fill();

    if (isArmSuperArmorFlashing) {
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 14.4 * saFlashAlpha;
    } else if (isArmSuperArmorActive) {
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 7;
    }
    ctx.fillStyle = isImpactSil ? '#050505' : (isCqcM2HitFlashing ? '#ff0033' : armFillColor);
    ctx.strokeStyle = isImpactSil ? '#ffffff' : (isCqcM2HitFlashing ? '#ffffff' : ((isArmSuperArmorFlashing || isArmSuperArmorActive) ? '#00e5ff' : (isKakeUkeActive ? '#1d4ed8' : (fighter.styleId === 'cqc' ? '#000000' : '#111115'))));
    ctx.lineWidth = isImpactSil ? 3.0 : (isArmSuperArmorFlashing ? (3.5 + 1.6 * saFlashAlpha) : ((isArmSuperArmorActive || isKakeUkeActive) ? 3.5 : 2.5));
    ctx.beginPath();
    ctx.roundRect(-2, -armThickness/2, forearmLen + 2, armThickness, 3);
    ctx.fill();
    ctx.stroke();

    ctx.restore();


    // 3. Draw SQUARE FIST / GLOVE at Target Location
    ctx.save();
    ctx.translate(actualFistX, actualFistY);
    let gloveRot = getKickGloveRotation(fighter, fist, isLeft, forearmAngle);
    if (fighter.styleId === 'street_boxing' || fighter.styleId === 'boxing_shell') {
      // Hands align straight with the forearm
      gloveRot = forearmAngle;
    } else if (fighter.styleId === 'basic') {
      const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
      if (isLeft && leftProgress > 0 && stage === 3) {
        // S4: Wrist remains straight in line with the forearm, with only a subtle natural slant (~8-9°)
        const slantAmount = Math.sin(leftProgress * Math.PI) * 0.15;
        gloveRot = forearmAngle - slantAmount;
      }
    } else if (fighter.styleId === 'aikido') {
      const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
      if (isLeft && leftProgress > 0 && (stage === 1 || stage === 0 || leftFist?.comboStage === 1)) {
        // S2: Left hand flows smoothly from long rear pullback before rotating far to the right like a tegatana blade slash
        const windupSplit = 0.44;
        if (leftProgress < windupSplit) {
          const wT = leftProgress / windupSplit;
          gloveRot = forearmAngle - 0.45 * Math.sin(wT * Math.PI * 0.5);
        } else {
          const sT = (leftProgress - windupSplit) / (1 - windupSplit);
          const slashEase = 0.5 - 0.5 * Math.cos(sT * Math.PI);
          gloveRot = forearmAngle + (-0.45 * (1 - slashEase) + slashEase * 0.70);
        }
      } else if (stage === 2 && ((isLeft && leftProgress > 0) || (!isLeft && rightProgress > 0))) {
        // S3 Tenkan Arm-Cross Sweep: Both square gloves curl inward toward chest profile in interlocking scissor/trap motion
        const rightFist = fighter.fists ? (fighter.fists.find(f => f.punchType === 'right') || fighter.fists[1]) : undefined;
        const prog = rightFist ? rightFist.punchProgress : 0;
        const curlMag = Math.sin(prog * Math.PI) * 0.45;
        const curlAngle = isLeft ? curlMag : -curlMag;
        gloveRot = forearmAngle + curlAngle;
      } else {
        // Hands align straight with the wrist and forearm
        gloveRot = forearmAngle;
      }
    }
    ctx.rotate(gloveRot);

    let fistW = fist.radius * 2.25;
    let fistH = fist.radius * 2.15;
    if (fighter.styleId === 'slugger') {
      fistW = fist.radius * 2.05; // Slightly shorter glove length
      fistH = fist.radius * 2.30; // +7% width increase
    }

    // Style-specific hand and limb motion trails (Iron Boxing 2x Posture Boost, CQC M2 Dash, Aikido S3 Tenkan)
    renderStyleHandTrails(
      ctx,
      fighter as any,
      isLeft,
      actualFistX,
      actualFistY,
      elbowX,
      elbowY,
      shoulderX,
      shoulderY,
      fistW,
      fistH,
      gloveRot,
      gameTime
    );

    const isP1 = fighter.isP1 !== undefined ? fighter.isP1 : fighter.isPlayer;
    const gloveColor = isImpactSil ? '#050505' : (isCqcM2HitFlashing ? '#ff0033' : (isHitFlashing ? '#f43f5e' : (isArmSuperArmorFlashing ? (saFlashAlpha > 0.6 ? '#bae6fd' : '#00e5ff') : (isArmSuperArmorActive ? '#38bdf8' : (fighter.styleId === 'street_boxing' ? '#2E7D32' : (fighter.styleId === 'boxing_shell' ? '#9333ea' : (fighter.styleId === 'keysi' ? '#1A1A1A' : (fighter.styleId === 'cqc' ? '#111111' : (isP1 ? '#ef4444' : '#2563eb')))))))));
    const stage = fighter.comboStage === 0 ? 3 : ((fighter.comboStage || 1) - 1);
    const isAikidoS2Chop = fighter.styleId === 'aikido' && isLeft && leftProgress > 0 && (stage === 1 || stage === 0 || leftFist?.comboStage === 1);
    const isOpenHandBlade = isAikidoS2Chop;

    if (isArmSuperArmorFlashing) {
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 9.6 * saFlashAlpha;
    } else if (isArmSuperArmorActive) {
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 6;
    }

    if (isOpenHandBlade) {
      // Tegatana Knife-Hand Chop Blade: sleek open-hand blade contour leading with the knife edge
      const chopW = fist.radius * 2.70;
      const chopH = fist.radius * 1.65;

      // Drop shadow
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.moveTo(-chopW * 0.45 + 2, -chopH * 0.50 + 2);
      ctx.lineTo(chopW * 0.25 + 2, -chopH * 0.50 + 2);
      ctx.lineTo(chopW * 0.60 + 2, -chopH * 0.15 + 2);
      ctx.lineTo(chopW * 0.55 + 2, chopH * 0.45 + 2);
      ctx.lineTo(-chopW * 0.45 + 2, chopH * 0.50 + 2);
      ctx.closePath();
      ctx.fill();

      // Hand Blade Base
      ctx.fillStyle = gloveColor;
      ctx.strokeStyle = isImpactSil ? '#ffffff' : (isCqcM2HitFlashing ? '#ffffff' : ((isArmSuperArmorFlashing || isArmSuperArmorActive) ? '#00e5ff' : '#111115'));
      ctx.lineWidth = isImpactSil ? 3.0 : 2.5;
      ctx.beginPath();
      ctx.moveTo(-chopW * 0.45, -chopH * 0.50);
      ctx.lineTo(chopW * 0.25, -chopH * 0.50);
      ctx.lineTo(chopW * 0.60, -chopH * 0.15); // Tapered blade tip / knife edge
      ctx.lineTo(chopW * 0.55, chopH * 0.45);
      ctx.lineTo(-chopW * 0.45, chopH * 0.50);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Sharp cutting edge highlight along the blade
      ctx.fillStyle = 'rgba(255, 255, 255, 0.60)';
      ctx.beginPath();
      ctx.moveTo(-chopW * 0.20, -chopH * 0.40);
      ctx.lineTo(chopW * 0.22, -chopH * 0.40);
      ctx.lineTo(chopW * 0.52, -chopH * 0.12);
      ctx.lineTo(chopW * 0.42, -chopH * 0.05);
      ctx.lineTo(-chopW * 0.20, -chopH * 0.20);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.roundRect(-fistW / 2 + 2, -fistH / 2 + 2, fistW, fistH, 3);
      ctx.fill();

      ctx.fillStyle = gloveColor;
      ctx.strokeStyle = isImpactSil ? '#ffffff' : (isCqcM2HitFlashing ? '#ffffff' : ((isArmSuperArmorFlashing || isArmSuperArmorActive) ? '#00e5ff' : (fighter.styleId === 'street_boxing' ? '#1B5E20' : (fighter.styleId === 'boxing_shell' ? '#c0c0c0' : (fighter.styleId === 'keysi' ? '#ef4444' : (fighter.styleId === 'cqc' ? '#000000' : '#111115'))))));
      ctx.lineWidth = isImpactSil ? 3.0 : 2.5;
      ctx.beginPath();
      ctx.roundRect(-fistW / 2, -fistH / 2, fistW, fistH, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fillRect(-fistW * 0.15, -fistH / 2 + 1, fistW * 0.3, fistH - 2);

      if (fighter.styleId === 'keysi') {
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-fistW * 0.45, -fistH / 2 + 1, 3.5, fistH - 2);
      } else if (fighter.styleId === 'boxing_shell') {
        ctx.fillStyle = '#c0c0c0'; // metallic silver guard indicator
        ctx.fillRect(-fistW * 0.45, -fistH / 2 + 1, 4.0, fistH - 2);
      }
    }

    // Aikido S4 Shomenuchi: Condensed white energy shimmer gathered at right palm during windup
    if (fighter.styleId === 'aikido' && !isLeft && stage === 3 && rightProgress > 0 && rightProgress < 0.60) {
      const shimmerT = rightProgress / 0.60;
      const shimmerPulse = Math.sin(gameTime * 0.45) * 0.2 + 0.9;
      const shimmerRadius = (fistW * 0.85) * (0.5 + 0.5 * shimmerT) * shimmerPulse;

      ctx.save();
      const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, shimmerRadius);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      grad.addColorStop(0.4, 'rgba(224, 247, 250, 0.75)');
      grad.addColorStop(1, 'rgba(0, 191, 255, 0.0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, shimmerRadius, 0, Math.PI * 2);
      ctx.fill();

      // Energy sparkles
      for (let s = 0; s < 4; s++) {
        const sa = gameTime * 0.35 + s * (Math.PI / 2);
        const sr = shimmerRadius * 0.65;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Aikido Exclusive: Hand Lockout & Wrist Trap Rings on Defender when M1/M2 is disabled
    const isTrapRingActive = !isLeft && Boolean(fighter.aikiKoteGaeshiTrapTimer && fighter.aikiKoteGaeshiTrapTimer > 0);
    const isLockoutRingActive = Boolean(fighter.aikiLockoutTimer && fighter.aikiLockoutTimer > 0);
    if (isTrapRingActive || isLockoutRingActive) {
      ctx.save();
      const ringTimer = isLockoutRingActive ? (fighter.aikiLockoutTimer || 0) : (fighter.aikiKoteGaeshiTrapTimer || 0);
      const ringAlpha = Math.min(1.0, ringTimer / 18);
      const ringPulse = Math.sin(gameTime * 0.45) * 0.12 + 0.98;
      
      const shadowColor = isLockoutRingActive ? '#38bdf8' : '#cbd5e1';
      ctx.strokeStyle = isLockoutRingActive 
        ? `rgba(0, 229, 255, ${ringAlpha * 0.85})` 
        : `rgba(226, 232, 240, ${ringAlpha * 0.9})`;
      ctx.lineWidth = 2.2;
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, fistW * 0.75 * ringPulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();

    ctx.restore();
  });

  // Stun Effect: Golden spinning stars around stunned opponent
  renderStunnedStars(ctx, fighter, gameTime);

  // Keysi Trauma Stagger Effect: Disorienting zigzag trail and wobbly indicators
  renderKeysiStaggerEffects(ctx, fighter, gameTime);

  ctx.restore();
};

function renderKeysiStaggerEffects(
  ctx: CanvasRenderingContext2D,
  fighter: CombatFighter,
  gameTime: number
) {
  if (!fighter.keysiStaggerTimer || fighter.keysiStaggerTimer <= 0) return;

  ctx.save();
  // Draw erratic yellow/red zigzag trail around head
  const staggerAlpha = Math.min(1, fighter.keysiStaggerTimer / 60);
  const pulse = Math.sin(gameTime * 0.4);
  const zigRadius = fighter.radius * (1.1 + pulse * 0.15);

  ctx.strokeStyle = `rgba(239, 68, 68, ${staggerAlpha * 0.8})`;
  ctx.lineWidth = 2.0;
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  const zigSteps = 8;
  for (let i = 0; i <= zigSteps; i++) {
    const a = (i / zigSteps) * Math.PI * 2 + gameTime * 0.2;
    const r = zigRadius + (i % 2 === 0 ? 6 : -6);
    const zx = Math.cos(a) * r;
    const zy = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(zx, zy);
    else ctx.lineTo(zx, zy);
  }
  ctx.closePath();
  ctx.stroke();

  // Floating crimson disorientation sparks
  ctx.fillStyle = `rgba(250, 204, 21, ${staggerAlpha * 0.9})`;
  for (let s = 0; s < 3; s++) {
    const sa = gameTime * 0.15 + s * ((Math.PI * 2) / 3);
    const sx = Math.cos(sa) * (fighter.radius * 0.85);
    const sy = Math.sin(sa) * (fighter.radius * 0.5) - fighter.radius * 0.4;
    ctx.beginPath();
    ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function renderStunnedStars(
  ctx: CanvasRenderingContext2D,
  fighter: CombatFighter,
  gameTime: number
) {
  // Stars only appear if they got stunned from M2s, not M1s
  const isStunnedFromM2 = Boolean(
    fighter.m2StunTimer &&
    fighter.m2StunTimer > 0 &&
    fighter.stunTime &&
    fighter.stunTime > 0
  );
  if (!isStunnedFromM2) return;

  ctx.save();
  const numStars = 4;
  const orbitRadiusX = fighter.radius * 1.35;
  const orbitRadiusY = fighter.radius * 0.75;
  const baseOrbitAngle = gameTime * 0.14; // smooth continuous spin

  for (let i = 0; i < numStars; i++) {
    const starAngle = baseOrbitAngle + (i * (Math.PI * 2 / numStars));
    const starX = Math.cos(starAngle) * orbitRadiusX;
    const starY = Math.sin(starAngle) * orbitRadiusY - (fighter.radius * 0.25);

    // Depth sorting scale and alpha
    const depthFactor = (Math.sin(starAngle) + 1) * 0.5; // 0 (back) to 1 (front)
    const starScale = 4.0 + depthFactor * 2.5;
    const starAlpha = 0.55 + depthFactor * 0.45;
    const starSelfSpin = gameTime * 0.22 + i * 1.5;

    ctx.save();
    ctx.translate(starX, starY);
    ctx.rotate(starSelfSpin);

    // Golden halo glow
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 8 + depthFactor * 5;

    // 4-Pointed Star
    ctx.fillStyle = `rgba(254, 240, 138, ${starAlpha})`;
    ctx.strokeStyle = `rgba(234, 179, 8, ${starAlpha * 0.9})`;
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    const points = 4;
    const outerR = starScale;
    const innerR = starScale * 0.35;
    for (let p = 0; p < points * 2; p++) {
      const r = (p % 2 === 0) ? outerR : innerR;
      const a = (p * Math.PI) / points;
      if (p === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Central white sparkle
    ctx.fillStyle = `rgba(255, 255, 255, ${starAlpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, starScale * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  ctx.restore();
}
