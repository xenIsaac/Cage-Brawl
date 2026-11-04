// ============================================================================
// PILOT STYLE PLUGIN: STREET TAEKWONDO (src/styles/street_tkd.style.ts)
// Archetype: Aggressive Feint Striker — OFFICIAL REWORK SPECIFICATION
// ============================================================================

import { defineStyle } from './defineStyle';

export interface StreetTKDState {
  deflectiveCadenceTimerFrames: number;
  feintTrapActive: boolean;
  feintTrapArmed: boolean;
  momentumMultiplier: number;
  lastLandedStage: number;
}

export const streetTaekwondoContract = defineStyle<StreetTKDState>({
  metadata: {
    id: 'street_taekwondo',
    name: 'Street Taekwondo',
    class: 'Striker',
    category: 'Martial Art',
    playstyle: 'Aggressive',
    description: 'Trades formal dojang forms for deceptive urban angles, high-speed hip whipping, and the devastating, trajectory-shifting Brazilian Kick (Question Mark Kick).',
    passiveName: 'Neuro-Trauma Hallucination & Deflective Cadence',
    passiveDesc: 'Baits enemy parries during the Brazilian Kick feint into a 1.0s Spin-Out and 3.0s visual duplicate Confusion State. Manual parries grant +30% posture regen for 8.0s.',
    strikeName: 'Taekwondo Strikes',
    color: '#FF6B00',
    secondaryColor: '#FFD600',
    auraStyle: 'none',
    isTesting: false,
  },

  attributes: {
    speed: 1.05,      // Attack Execution Speed (AEXSPD) 1.05x (+5% limb travel velocity)
    reach: 1.15,      // Extended reach via wide, sweeping leg arcs (x1.15)
    power: 0.96,      // Fist & Kick Power x0.96 (rapid multi-kick combo tuning)
    defense: 1.00,    // Standard base absorption x1.00
    knockback: 0.85,  // Knockback Momentum x0.85 (keeps targets trapped inside kick range)
    healthMax: 0,     // Bonus Vitality +0 Max HP
  },

  timing: {
    // Sequence 1: Right Slanted Snap Kick (12f startup ~0.20s deliberate opening windup)
    s1: {
      windupSec: 0.20,
      activeSec: 0.30,
      recoverySec: 0.20,
      hitstunSec: 0.20,
      damage: 4.8,
      chipDamage: 1.4,
      knockback: 3.2,
      punchType: 'kick',
      sfx: 'taekwondo_snap',
      name: 'Right Slanted Snap Kick',
    },
    // Sequence 2: Chambered Slanted Kick (10f startup ~0.167s readable second kick)
    s2: {
      windupSec: 0.167,
      activeSec: 0.30,
      recoverySec: 0.20,
      hitstunSec: 0.22,
      damage: 4.8,
      chipDamage: 1.4,
      knockback: 3.4,
      punchType: 'kick',
      sfx: 'taekwondo_snap',
      name: 'Chambered Slanted Kick',
    },
    // Sequence 3: Spinning Back Kick (20f / ~0.333s deliberate 400° spin windup)
    s3: {
      windupSec: 0.333,
      activeSec: 0.30,
      recoverySec: 0.10,
      hitstunSec: 0.26,
      damage: 6.0,
      chipDamage: 1.8,
      knockback: 4.2,
      punchType: 'kick',
      sfx: 'taekwondo_snap',
      name: 'Spinning Back Kick (Left Leg)',
    },
    // Sequence 4: Side Whip Finisher (16f / ~0.267s coiled torque before side snap, 42f / 0.70s DS)
    s4: {
      windupSec: 0.267,
      activeSec: 0.30,
      recoverySec: 0.70,
      hitstunSec: 0.42,
      damage: 8.0,
      chipDamage: 2.4,
      knockback: 7.2,
      punchType: 'kick',
      sfx: 'heavy_impact',
      name: 'Side Whip Finisher (Left Leg)',
    },
    postComboDelaySec: 1.50, // 90 frames (~1.50s full chain recovery)
  },

  createInitialState: (): StreetTKDState => ({
    deflectiveCadenceTimerFrames: 0,
    feintTrapActive: false,
    feintTrapArmed: false,
    momentumMultiplier: 1.0,
    lastLandedStage: 0,
  }),

  onHitLanded: (telemetry, state) => {
    const isHeavyFinisher = telemetry.isHeavy;
    const isFeintTrapped = state.feintTrapArmed;

    return {
      payload: {
        damageMultiplier: isFeintTrapped ? 1.35 : 1.0,
        pushbackDelta: isHeavyFinisher ? 2.5 : 1.0,
        sound: isHeavyFinisher ? 'heavy_impact' : 'taekwondo_snap',
        cameraShake: isHeavyFinisher ? (isFeintTrapped ? 12 : 7) : 3,
        particles: [
          {
            type: isHeavyFinisher ? 'kinetic_shockwave' : 'hit_spark',
            color: '#FF6B00',
          },
          {
            type: 'hit_spark',
            color: '#FFD600',
          },
        ],
      },
      nextState: {
        ...state,
        feintTrapArmed: false,
        lastLandedStage: telemetry.sequenceIndex,
      },
    };
  },

  onAttackBlocked: (_telemetry, state) => ({
    payload: {
      sound: 'block',
      cameraShake: 2,
      chipDamageMultiplier: 1.15,
    },
    nextState: {
      ...state,
      feintTrapArmed: false,
    },
  }),

  // [ Deflective Cadence (Parry Posture Surge) ]
  // Manual parry accelerates Posture Regeneration speed by +30% for 8.0s (480 frames)
  onParrySuccessful: (_telemetry, state) => ({
    payload: {
      sound: 'parry',
      cameraShake: 8,
      postureRefund: 20,
      customBannerText: 'DEFLECTIVE CADENCE (+30% POSTURE REGEN 8.0s)',
    },
    nextState: {
      ...state,
      deflectiveCadenceTimerFrames: 480,
    },
  }),

  onWhiff: (_telemetry, state) => ({
    payload: { sound: 'whoosh' },
    nextState: {
      ...state,
      feintTrapArmed: false,
    },
  }),

  onTick: (_fighterId, state, _dtSec) => {
    if (state.deflectiveCadenceTimerFrames > 0) {
      return {
        nextState: {
          ...state,
          deflectiveCadenceTimerFrames: state.deflectiveCadenceTimerFrames - 1,
        },
      };
    }
    return { nextState: state };
  },

  evaluatePose: (phase, sequenceIndex, progress, _state) => {
    // Biomechanical kinematics: Loose Urban Bounce & Kicking-side hand swinging back
    const isKicking = phase === 'active';
    const isSequenceRight = sequenceIndex === 0 || sequenceIndex === 1;
    const kickAngle = isSequenceRight ? 0.785 : -0.785; // 45 degree slant
    const travel = isKicking ? progress : 0;

    const isS4 = sequenceIndex === 3;
    const swingBackDist = isS4 ? -26 : -14;
    const swingBackY = isS4 ? -16 : -8;
    const swingAngle = isS4 ? -0.85 : -0.4;

    return {
      leadLimb: {
        // Kicking hand swings backward in unison with hip torque (swings back further for S4)
        x: isKicking ? swingBackDist * travel : 12,
        y: isKicking ? swingBackY * travel : -8,
        angleRad: isKicking ? swingAngle : 0.1,
        extensionRatio: isKicking ? 0.3 : 0.45,
      },
      rearLimb: {
        x: isKicking ? 24 * travel * Math.cos(kickAngle) : -10,
        y: isKicking ? 20 * travel * Math.sin(kickAngle) : 6,
        angleRad: kickAngle,
        extensionRatio: isKicking ? 0.95 : 0.35,
      },
      torsoAngleRad: isKicking ? 0.22 : 0.0,
      hipHeightOffset: isKicking ? -4 : 0,
      hitboxShape: 'capsule',
      hitboxOffset: {
        x: 28,
        y: 0,
        radius: 22,
      },
    };
  },

  // M2 Heavy Strike: Brazilian Kick (Question Mark Kick / Feint Trap)
  heavyAttack: {
    windupSec: 0.35,   // 21 frames (9f Phase 1 rear load + 12f Phase 2 feint arc & pull-back)
    recoverySec: 0.28,
    baseDamage: 13.0,  // 13.0 HP Damage
    chipDamage: 4.0,
    knockback: 0.0,    // Zero Knockback
    cooldownSec: 4.0,  // 4.0s Whiff / 7.0s Hit Cooldown
    hasSuperArmor: false,
    hasIFrames: false,
    onExecute: (state) => ({
      payload: {
        sound: 'whoosh',
        customBannerText: 'BRAZILIAN KICK FEINT TRAP',
      },
      nextState: {
        ...state,
        feintTrapActive: true,
      },
    }),
  },

  dash: {
    durationSec: 0.30,
    cooldownSec: 2.8,
    hasIFrames: true,
  },

  block: {
    parryWindowSec: 0.18,
    chipAbsorption: 0.70,
    blockType: 'standard',
  },
});
