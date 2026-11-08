// Headless Simulation Runner for Replay Testing
// Provides deterministic tick execution and state hashing

export interface SimpleFighterState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  stamina: number;
  armorPoints: number;
  isBlocking: boolean;
  isParrying: boolean;
  styleId: string;
}

export interface SimFrameState {
  tick: number;
  player: SimpleFighterState;
  opponent: SimpleFighterState;
}

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

export function createInitialSimFighter(id: string, x: number, styleId: string = 'kickboxing'): SimpleFighterState {
  return {
    id,
    x,
    y: 0,
    vx: 0,
    vy: 0,
    hp: 100,
    maxHp: 100,
    stamina: 100,
    armorPoints: 100,
    isBlocking: false,
    isParrying: false,
    styleId,
  };
}

export function simulateTick(p: SimpleFighterState, o: SimpleFighterState, dt: number): void {
  // Movement physics simulation
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  o.x += o.vx * dt;
  o.y += o.vy * dt;

  // Clamp within arena bounds
  p.x = Math.max(-400, Math.min(400, p.x));
  o.x = Math.max(-400, Math.min(400, o.x));
}
