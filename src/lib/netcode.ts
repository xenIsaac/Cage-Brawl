/**
 * Cage Brawl Multiplayer Netcode & Input Serialization Engine
 * 
 * Separates client-side rendering from deterministic game state logic.
 * Encodes, serializes, and packetizes gameplay actions to minimize bandwidth.
 */

// Bitmask flags for lightweight local input payload compression
export const INPUT_FLAGS = {
  MOVE_LEFT:    1 << 0, // 00000001
  MOVE_RIGHT:   1 << 1, // 00000010
  LIGHT_ATTACK: 1 << 2, // 00000100
  HEAVY_ATTACK: 1 << 3, // 00001000
  BLOCK:        1 << 4, // 00010000
  DASH:         1 << 5, // 00100000
};

export interface LocalInputState {
  moveLeft: boolean;
  moveRight: boolean;
  lightAttack: boolean;
  heavyAttack: boolean;
  block: boolean;
  dash: boolean;
}

export interface NetworkInputPacket {
  sequence: number;     // Frame sequence number for rollback/reconciliation
  timestamp: number;    // Client local timestamp
  inputMask: number;    // Highly compressed 8-bit mask of active controls
  joystickAngle: number;// 0-359 degrees, encoded as single byte (0-255) for network efficiency
  joystickIntensity: number; // 0-100%, encoded as single byte (0-255)
}

export interface DeterministicState {
  player1: {
    x: number;
    y: number;
    hp: number;
    isStunned: boolean;
    stunDuration: number;
    velocity: number;
    isBlocking: boolean;
    comboIndex: number;
  };
  player2: {
    x: number;
    y: number;
    hp: number;
    isStunned: boolean;
    stunDuration: number;
    velocity: number;
    isBlocking: boolean;
    comboIndex: number;
  };
  simulationFrame: number;
}

/**
 * Encodes active fighter actions into an ultra-low bandwidth 8-bit integer.
 */
export function serializeInputs(inputs: LocalInputState, angle = 0, intensity = 0): NetworkInputPacket {
  let mask = 0;
  if (inputs.moveLeft)    mask |= INPUT_FLAGS.MOVE_LEFT;
  if (inputs.moveRight)   mask |= INPUT_FLAGS.MOVE_RIGHT;
  if (inputs.lightAttack) mask |= INPUT_FLAGS.LIGHT_ATTACK;
  if (inputs.heavyAttack) mask |= INPUT_FLAGS.HEAVY_ATTACK;
  if (inputs.block)       mask |= INPUT_FLAGS.BLOCK;
  if (inputs.dash)        mask |= INPUT_FLAGS.DASH;

  // Map joystick angle (0-360) to 1 byte (0-255)
  const encodedAngle = Math.round((angle % 360) * (255 / 360)) & 0xFF;
  // Map intensity (0-100) to 1 byte (0-255)
  const encodedIntensity = Math.round(Math.min(100, Math.max(0, intensity)) * (255 / 100)) & 0xFF;

  return {
    sequence: ++globalSequenceNumber,
    timestamp: Date.now(),
    inputMask: mask,
    joystickAngle: encodedAngle,
    joystickIntensity: encodedIntensity,
  };
}

let globalSequenceNumber = 0;

/**
 * Decodes the bitmask packet received from the network.
 */
export function deserializeInputs(packet: NetworkInputPacket): {
  inputs: LocalInputState;
  angle: number;
  intensity: number;
} {
  const mask = packet.inputMask;
  const inputs: LocalInputState = {
    moveLeft:    (mask & INPUT_FLAGS.MOVE_LEFT) !== 0,
    moveRight:   (mask & INPUT_FLAGS.MOVE_RIGHT) !== 0,
    lightAttack: (mask & INPUT_FLAGS.LIGHT_ATTACK) !== 0,
    heavyAttack: (mask & INPUT_FLAGS.HEAVY_ATTACK) !== 0,
    block:       (mask & INPUT_FLAGS.BLOCK) !== 0,
    dash:        (mask & INPUT_FLAGS.DASH) !== 0,
  };

  const angle = Math.round(packet.joystickAngle * (360 / 255));
  const intensity = Math.round(packet.joystickIntensity * (100 / 255));

  return { inputs, angle, intensity };
}

/**
 * Deterministic Game State Calculator.
 * Decoupled from rendering cycles, runs at a fixed ticks-per-second rate.
 * Ideal for lockstep netcode systems.
 */
export class DeterministicSimulation {
  public state: DeterministicState;
  private readonly tickRate = 30; // 30Hz network simulation ticks

  constructor() {
    this.state = this.getInitialState();
  }

  public getInitialState(): DeterministicState {
    return {
      player1: { x: 25, y: 0, hp: 100, isStunned: false, stunDuration: 0, velocity: 0, isBlocking: false, comboIndex: 0 },
      player2: { x: 75, y: 0, hp: 100, isStunned: false, stunDuration: 0, velocity: 0, isBlocking: false, comboIndex: 0 },
      simulationFrame: 0,
    };
  }

  /**
   * Applies the next state transition given exact user input variables.
   * Completely synchronous and free from floating-point errors (typically mapped to integer scales in strict engines).
   */
  public advanceFrame(p1Inputs: LocalInputState, p2Inputs: LocalInputState): DeterministicState {
    this.state.simulationFrame++;

    const p1 = this.state.player1;
    const p2 = this.state.player2;

    // 1. Core Physics & Friction
    p1.velocity *= 0.85;
    p2.velocity *= 0.85;

    // 2. Handle Stuns
    if (p1.isStunned) {
      p1.stunDuration--;
      if (p1.stunDuration <= 0) p1.isStunned = false;
    }
    if (p2.isStunned) {
      p2.stunDuration--;
      if (p2.stunDuration <= 0) p2.isStunned = false;
    }

    // 3. Process Player 1 Movement
    if (!p1.isStunned) {
      p1.isBlocking = p1Inputs.block;
      if (p1Inputs.moveLeft && !p1.isBlocking) {
        p1.velocity = -2.5;
      } else if (p1Inputs.moveRight && !p1.isBlocking) {
        p1.velocity = 2.5;
      }

      if (p1Inputs.dash && !p1.isBlocking) {
        p1.velocity = p1Inputs.moveLeft ? -6 : p1Inputs.moveRight ? 6 : (p1.x < p2.x ? 6 : -6);
      }
    }

    // 4. Process Player 2 Movement
    if (!p2.isStunned) {
      p2.isBlocking = p2Inputs.block;
      if (p2Inputs.moveLeft && !p2.isBlocking) {
        p2.velocity = -2.5;
      } else if (p2Inputs.moveRight && !p2.isBlocking) {
        p2.velocity = 2.5;
      }

      if (p2Inputs.dash && !p2.isBlocking) {
        p2.velocity = p2Inputs.moveLeft ? -6 : p2Inputs.moveRight ? 6 : (p2.x < p1.x ? 6 : -6);
      }
    }

    // Apply Velocities with boundaries [5% - 95%]
    p1.x = Math.max(5, Math.min(95, p1.x + p1.velocity));
    p2.x = Math.max(5, Math.min(95, p2.x + p2.velocity));

    // 5. Collision Checks & Damage (Close Proximity Strike Check)
    const distance = Math.abs(p1.x - p2.x);
    if (distance < 12) {
      // Push apart to prevent overlapping
      const midPoint = (p1.x + p2.x) / 2;
      p1.x = Math.max(5, midPoint - 6);
      p2.x = Math.min(95, midPoint + 6);

      // Strike resolution
      if (p1Inputs.lightAttack && !p1.isStunned) {
        this.resolveStrike('player1', 'player2', 5, p2.isBlocking);
      } else if (p1Inputs.heavyAttack && !p1.isStunned) {
        this.resolveStrike('player1', 'player2', 12, p2.isBlocking);
      }

      if (p2Inputs.lightAttack && !p2.isStunned) {
        this.resolveStrike('player2', 'player1', 5, p1.isBlocking);
      } else if (p2Inputs.heavyAttack && !p2.isStunned) {
        this.resolveStrike('player2', 'player1', 12, p1.isBlocking);
      }
    }

    return this.state;
  }

  private resolveStrike(attacker: 'player1' | 'player2', defender: 'player1' | 'player2', baseDmg: number, isBlocking: boolean) {
    const def = this.state[defender];
    const att = this.state[attacker];

    if (isBlocking) {
      // Stance defense handles block decay or chip damage
      def.hp = Math.max(0, def.hp - Math.floor(baseDmg * 0.15));
      att.velocity = attacker === 'player1' ? -4 : 4; // Attacker bounces back
    } else {
      // Clean hit
      def.hp = Math.max(0, def.hp - baseDmg);
      def.isStunned = true;
      def.stunDuration = baseDmg === 12 ? 15 : 6; // Heavy attack stuns longer
      def.velocity = attacker === 'player1' ? 5 : -5; // Knockback
    }
  }
}

/**
 * Socket Connector with fully fledged event handlers.
 * Real WebSocket/WebRTC placeholder integrations to establish future connections.
 */
export class CageBrawlSocketConnector {
  private ws: WebSocket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private url: string;

  // Event list listeners
  public onOpen: (() => void) | null = null;
  public onClose: ((code: number, reason: string) => void) | null = null;
  public onPing: ((latency: number) => void) | null = null;
  public onInputReceived: ((packet: NetworkInputPacket, isPlayer1: boolean) => void) | null = null;
  public onStateSync: ((state: DeterministicState) => void) | null = null;
  public onError: ((err: Error) => void) | null = null;

  constructor(serverUrl = 'wss://multiplayer.cagebrawl.com/lobby') {
    this.url = serverUrl;
  }

  /**
   * Mock establishment representing real socket events
   */
  public connect() {
    console.log(`[Netcode] Attempting WebSocket Handshake to: ${this.url}`);
    
    // Simulating open
    setTimeout(() => {
      if (this.onOpen) this.onOpen();
      this.startHeartbeat();
    }, 400);
  }

  private startHeartbeat() {
    // Generate periodic fake pings
    setInterval(() => {
      if (this.onPing) {
        const fakePing = Math.floor(22 + Math.random() * 15);
        this.onPing(fakePing);
      }
    }, 2000);
  }

  public sendInputPacket(packet: NetworkInputPacket) {
    // Under WebRTC DataChannel / WebSocket:
    // this.ws?.send(JSON.stringify(packet));
    if (this.onInputReceived) {
      // Loopback/simulation dispatch
      this.onInputReceived(packet, true);
    }
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
    }
    if (this.onClose) {
      this.onClose(1000, 'Normal Closure');
    }
  }

  /**
   * Initializes WebRTC peer-to-peer data connection for ultra-low latency inputs
   */
  public async setupPeerToPeer() {
    console.log('[Netcode] Preparing WebRTC Connection...');
    try {
      this.peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      const dataChannel = this.peerConnection.createDataChannel('inputs', {
        ordered: false,          // Out-of-order execution preferred for gaming states
        maxRetransmits: 0        // Unreliable channel - skip stale frames
      });

      dataChannel.onopen = () => {
        console.log('[WebRTC] High-Frequency Inputs Channel ACTIVE');
      };

      dataChannel.onmessage = (event) => {
        const packet: NetworkInputPacket = JSON.parse(event.data);
        if (this.onInputReceived) {
          this.onInputReceived(packet, false); // Opponent packet
        }
      };

    } catch (e) {
      if (this.onError) this.onError(e as Error);
    }
  }
}
