// Headless Simulation Runner for Replay Testing
// Calls the real extracted runPhysicsSimulation from src/combat/simulation
import crypto from 'node:crypto';
import { runPhysicsSimulation, SimulationContext } from '../combat/simulation';
import { updateFighterAI } from '../combat/ai';
import { FIGHTING_STYLES } from '../data/styles';
import {
  executePlayerLightAttackTrigger,
  executePlayerHeavyAttackTrigger,
  executePlayerHeavyRelease,
  executeDummyHeavyRelease,
} from '../combat/attackTriggers';

export class SeededRNG {
  private seed: number;

  constructor(seed: number = 123456789) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

export interface HeadlessScenarioConfig {
  name: string;
  styleA: string;
  styleB: string;
  ticks: number;
  playerHp?: number;
  opponentHp?: number;
  playerBehavior?: string;
  opponentBehavior?: string;
  forceBlockSpam?: boolean;
}

export interface HeadlessScenarioResult {
  scenario: string;
  hash: string;
  totalTicks: number;
  playerFinalHp: number;
  opponentFinalHp: number;
  koOccurred: boolean;
}

export function createFighter(
  id: string,
  isPlayer: boolean,
  x: number,
  styleId: string,
  initialHp: number = 100,
  maxHp: number = 100,
  behavior: string = 'gold'
): any {
  const styleObj = FIGHTING_STYLES.find(s => s.id === styleId) || FIGHTING_STYLES[0];
  const radius = 26;
  return {
    id,
    name: isPlayer ? 'Player' : 'Opponent',
    isPlayer,
    isP1: isPlayer,
    x,
    y: 0,
    vx: 0,
    vy: 0,
    targetX: x,
    targetY: 0,
    facingAngle: isPlayer ? 0 : Math.PI,
    radius,
    baseHeight: 70,
    color: styleObj.color || '#3b82f6',
    secondaryColor: styleObj.secondaryColor || '#60a5fa',
    styleId: styleObj.id,
    health: initialHp,
    maxHealth: maxHp,
    isDead: false,
    score: 0,
    fists: [
      { id: 1, offsetX: 16, offsetY: -12, angle: 0, radius: radius * 0.31, isPunching: false, punchProgress: 0, punchType: 'left' },
      { id: 2, offsetX: 16, offsetY: 12, angle: 0, radius: radius * 0.31, isPunching: false, punchProgress: 0, punchType: 'right' },
    ],
    strikeCooldown: 0,
    lightCooldown: 0,
    heavyCooldown: 0,
    stunTime: 0,
    damageFlashTime: 0,
    auraAngle: 0,
    dashCooldown: 0,
    isDashing: false,
    dashProgress: 0,
    comboStage: 0,
    comboResetTimer: 0,
    heavyWindup: 0,
    isBlocking: false,
    armorHP: 18,
    armorBreakTime: 0,
    concussTime: 0,
    behavior,
    attackTimer: 0,
    decisionTimer: 0,
    stamina: 100,
    maxStamina: 100,
    postureCd: 0,
    maxPostureCd: 30,
    isPostureLocked: false,
  };
}

export function createSimulationState(
  styleA: string,
  styleB: string,
  playerHp: number = 100,
  opponentHp: number = 100,
  playerBehavior: string = 'gold',
  opponentBehavior: string = 'gold'
): any {
  return {
    player: createFighter('player_1', true, -90, styleA, playerHp, 100, playerBehavior),
    dummy: createFighter('dummy_1', false, 90, styleB, opponentHp, 100, opponentBehavior),
    particles: [],
    width: 800,
    height: 600,
    mouseX: 90,
    mouseY: 0,
    cameraX: 0,
    cameraY: 0,
    cameraZoom: 1.0,
    arenaSize: 1000,
    gameTime: 0,
    shakeAmount: 0,
    visionBlurTime: 0,
    shakyVisionTimer: 0,
    hitstopTime: 0,
    keysPressed: {},
    rankedState: 'fighting',
    isLMBHeld: false,
    freezeAI: false,
    dummyFollow: false,
    potatoFuseTimer: 1200,
    potatoHolder: 'player',
  };
}

export function runHeadlessScenario(config: HeadlessScenarioConfig): HeadlessScenarioResult {
  const originalRandom = Math.random;
  const rng = new SeededRNG(42 + config.name.length * 31);
  Math.random = () => rng.next();

  let koOccurred = false;

  try {
    const state = createSimulationState(
      config.styleA,
      config.styleB,
      config.playerHp ?? 100,
      config.opponentHp ?? 100,
      config.playerBehavior ?? 'gold',
      config.opponentBehavior ?? 'gold'
    );

const createMockSoundManager = () => new Proxy({}, {
  get: () => () => {}
});

    const mockSound = createMockSoundManager();

    const getTriggerContext = () => ({
      stateRef: { current: state },
      isSpectator: false,
      isPractice: false,
      soundManager: mockSound,
      spawnFloatingText: () => {},
      settings: { screenShake: 1, dynamicHitStun: true },
      matchData: null,
      keysPressedRef: { current: {} },
      activeStyle: FIGHTING_STYLES.find(s => s.id === state.player.styleId) || FIGHTING_STYLES[0],
      activeStyleId: state.player.styleId,
      comboTimeoutRef: { current: null },
      setTotalSwings: () => {},
      isTouchDevice: false,
      setDummyBehavior: () => {},
      dummyStyleId: state.dummy.styleId,
      syncCombatStatesToUI: () => {},
      sendImmediateWsGameState: () => {},
      setIsPlayerBlocking: (b: boolean) => {
        if (state.player) state.player.isBlocking = b;
      },
      applyHeavyWhiffPenalty: () => {},
      isImpactFrameActive: () => false,
    });

    const context: SimulationContext = {
      matchData: null,
      dummyBehavior: config.opponentBehavior ?? 'gold',
      settings: { screenShake: 1 },
      soundManager: mockSound,
      spawnFloatingText: () => {},
      handleRoundWinner: () => {
        koOccurred = true;
      },
      setPotatoFuseLeft: () => {},
      userEmail: 'headless@test.local',
      syncCombatStatesToUI: () => {},
      triggerKOCinematic: () => {
        koOccurred = true;
      },
      triggerPlayerLightAttack: () => {
        executePlayerLightAttackTrigger(getTriggerContext() as any);
      },
      executePlayerHeavyAttack: () => {
        executePlayerHeavyRelease(getTriggerContext() as any);
      },
      executeDummyHeavyAttack: () => {
        executeDummyHeavyRelease(getTriggerContext() as any);
      },
      setIsPlayerBlocking: (b: boolean) => {
        if (state.player) state.player.isBlocking = b;
      },
    };

    const hashList: string[] = [];

    for (let tick = 0; tick < config.ticks; tick++) {
      state.gameTime = tick;

      // Update AI decisions for dummy
      if (state.dummy && !state.dummy.isDead) {
        updateFighterAI(
          state.dummy,
          state.player,
          config.opponentBehavior ?? 'gold',
          state,
          {
            spawnFloatingText: () => {},
            triggerFighterDash: () => {},
          }
        );
      }

      // Update AI decisions for player
      if (state.player && !state.player.isDead) {
        updateFighterAI(
          state.player,
          state.dummy,
          config.playerBehavior ?? 'gold',
          state,
          {
            spawnFloatingText: () => {},
            triggerFighterDash: () => {},
          }
        );
      }

      // Block spam scenario custom input injection
      if (config.forceBlockSpam && state.dummy) {
        if (tick % 25 === 0) {
          state.dummy.isBlocking = !state.dummy.isBlocking;
        }
      }

      // Check KO condition
      if (state.player.health <= 0 || state.dummy.health <= 0) {
        koOccurred = true;
      }

      // Run extracted simulation
      runPhysicsSimulation(state, context);

      // Capture deterministic state every 5 ticks or on key frames
      if (tick % 5 === 0 || tick === config.ticks - 1) {
        const p = state.player;
        const d = state.dummy;
        const frameSnapshot = [
          tick,
          p.x.toFixed(2),
          p.y.toFixed(2),
          p.vx.toFixed(2),
          p.vy.toFixed(2),
          p.health.toFixed(1),
          p.isBlocking ? 1 : 0,
          p.comboStage,
          p.facingAngle.toFixed(2),
          d.x.toFixed(2),
          d.y.toFixed(2),
          d.vx.toFixed(2),
          d.vy.toFixed(2),
          d.health.toFixed(1),
          d.isBlocking ? 1 : 0,
          d.comboStage,
          d.facingAngle.toFixed(2),
        ].join(',');

        const frameHash = crypto.createHash('sha256').update(frameSnapshot).digest('hex').substring(0, 8);
        hashList.push(frameHash);
      }
    }

    const scenarioHash = crypto.createHash('sha256').update(hashList.join(':')).digest('hex').substring(0, 16);

    return {
      scenario: config.name,
      hash: scenarioHash,
      totalTicks: config.ticks,
      playerFinalHp: Math.round(state.player.health * 10) / 10,
      opponentFinalHp: Math.round(state.dummy.health * 10) / 10,
      koOccurred,
    };
  } finally {
    Math.random = originalRandom;
  }
}

export const HEADLESS_SCENARIOS: HeadlessScenarioConfig[] = [
  { name: 'Kickboxing vs Kickboxing', styleA: 'kickboxing', styleB: 'kickboxing', ticks: 3000 },
  { name: 'Muay Thai vs Ashihara', styleA: 'muay_thai', styleB: 'ashihara', ticks: 3000 },
  { name: 'CQC vs Kyokushin', styleA: 'cqc', styleB: 'kyokushin', ticks: 3000 },
  { name: 'Keysi vs Capoeira', styleA: 'keysi', styleB: 'capoeira', ticks: 3000 },
  { name: 'Parry Heavy Combat', styleA: 'muay_thai', styleB: 'kickboxing', ticks: 3000, playerBehavior: 'diamond', opponentBehavior: 'diamond' },
  { name: 'Block Spam Combat', styleA: 'kyokushin', styleB: 'boxing_shell', ticks: 3000, forceBlockSpam: true },
  { name: 'KO Scenario', styleA: 'cqc', styleB: 'kyokushin', ticks: 3000, opponentHp: 10, playerBehavior: 'diamond' },
];

export function runAllHeadlessScenarios(): HeadlessScenarioResult[] {
  return HEADLESS_SCENARIOS.map(runHeadlessScenario);
}
