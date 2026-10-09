/**
 * Procedural Sound Generator using Web Audio API
 * Warm, balanced audio engine with automatic master compression,
 * low-pass filtering, and sound throttling to eliminate harshness and audio stacking.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterFilter: BiquadFilterNode | null = null;
  
  private enabled: boolean = true;
  private masterVolume: number = 1.0;
  private sfxVolume: number = 1.0;
  private lastPlayTimes: Map<string, number> = new Map();

  private init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();

        // 1. Master Gain Node
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.getEffectiveVolume(), this.ctx.currentTime);

        // 2. Dynamics Compressor Node (prevents clipping, distortion, and loud spikes when multiple sounds fire)
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-18, this.ctx.currentTime); // -18dB threshold
        this.compressor.knee.setValueAtTime(10, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(6, this.ctx.currentTime); // 6:1 compression ratio
        this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime); // Fast 3ms attack
        this.compressor.release.setValueAtTime(0.08, this.ctx.currentTime); // 80ms release

        // 3. Master Low-Pass Filter Node (smooths out harsh high-frequency noise while preserving bright metallic chimes up to 6800Hz)
        this.masterFilter = this.ctx.createBiquadFilter();
        this.masterFilter.type = 'lowpass';
        this.masterFilter.frequency.setValueAtTime(6800, this.ctx.currentTime); // 6.8 kHz cutoff
        this.masterFilter.Q.setValueAtTime(0.7, this.ctx.currentTime);

        // Chain: Input -> MasterGain -> Compressor -> MasterFilter -> Destination
        this.masterGain.connect(this.compressor);
        this.compressor.connect(this.masterFilter);
        this.masterFilter.connect(this.ctx.destination);
      }
    } catch (e) {
      console.warn('Web Audio API is not supported in this environment:', e);
    }
  }

  setVolumes(master: number, sfx: number) {
    this.masterVolume = Math.max(0, Math.min(1, master));
    this.sfxVolume = Math.max(0, Math.min(1, sfx));
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.getEffectiveVolume(), this.ctx.currentTime);
    }
  }

  getEffectiveVolume() {
    // 0.70 master scaling to ensure comfortable default listening levels
    return Math.max(0, Math.min(1, this.masterVolume * this.sfxVolume * 0.70));
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled && this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.enabled;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (this.enabled && this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  isEnabled() {
    return this.enabled;
  }

  /**
   * Rate limits sound effects to prevent overlapping audio stacking / ear blasting
   */
  private shouldThrottle(soundId: string, minIntervalMs: number): boolean {
    const now = performance.now();
    const last = this.lastPlayTimes.get(soundId) || 0;
    if (now - last < minIntervalMs) {
      return true; // throttle sound
    }
    this.lastPlayTimes.set(soundId, now);
    return false;
  }

  private connectToMaster(node: AudioNode) {
    if (this.masterGain) {
      node.connect(this.masterGain);
    } else if (this.ctx) {
      node.connect(this.ctx.destination);
    }
  }

  playTone(freq: number, type: OscillatorType, duration: number, gainVals: number[], times: number[]) {
    this.init();
    if (!this.ctx || !this.enabled) return;
    
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const effectiveVol = this.getEffectiveVolume();
    if (effectiveVol <= 0.001) return;

    // Smooth out harsh square/sawtooth waves into pleasant triangles
    const safeType = (type === 'sawtooth' || type === 'square') ? 'triangle' : type;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = safeType;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gainNode.gain.setValueAtTime(gainVals[0] * effectiveVol, this.ctx.currentTime);
    for (let i = 1; i < gainVals.length; i++) {
      gainNode.gain.linearRampToValueAtTime(gainVals[i] * effectiveVol, this.ctx.currentTime + times[i - 1]);
    }

    osc.connect(gainNode);
    this.connectToMaster(gainNode);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playPunch(isHeavy: boolean = false) {
    if (isHeavy) {
      this.playM2Heavy();
    } else {
      this.playM1Punch();
    }
  }

  playM1Punch() {
    if (this.shouldThrottle('punch_m1', 45)) return; // 45ms throttle for snappy combo M1s
    this.init();
    if (!this.ctx || !this.enabled) return;

    const now = this.ctx.currentTime;
    const effectiveVol = this.getEffectiveVolume();
    if (effectiveVol <= 0.001) return;

    // Snappy, punchy M1 pitch drop (190Hz -> 42Hz fast sine)
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.06);

    gainNode.gain.setValueAtTime(0.18 * effectiveVol, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gainNode);
    this.connectToMaster(gainNode);

    osc.start(now);
    osc.stop(now + 0.06);

    // Crisp impact glove snap (bandpass filter at 680Hz)
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.035);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(680, now);
    noiseFilter.Q.setValueAtTime(1.8, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.05 * effectiveVol, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    this.connectToMaster(noiseGain);

    noise.start(now);
    noise.stop(now + 0.035);
  }

  playHeavyImpact() {
    this.playM2Heavy();
  }

  playM2Heavy() {
    if (this.shouldThrottle('punch_m2', 80)) return; // 80ms throttle
    this.init();
    if (!this.ctx || !this.enabled) return;

    const now = this.ctx.currentTime;
    const effectiveVol = this.getEffectiveVolume();
    if (effectiveVol <= 0.001) return;

    // 1. Deep Sub-Bass Impact Thud (140Hz -> 22Hz triangle)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();

    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(140, now);
    subOsc.frequency.exponentialRampToValueAtTime(22, now + 0.22);

    subGain.gain.setValueAtTime(0.28 * effectiveVol, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    subOsc.connect(subGain);
    this.connectToMaster(subGain);

    subOsc.start(now);
    subOsc.stop(now + 0.22);

    // 2. Mid Power Crack (280Hz -> 48Hz sine sweep)
    const midOsc = this.ctx.createOscillator();
    const midGain = this.ctx.createGain();

    midOsc.type = 'sine';
    midOsc.frequency.setValueAtTime(280, now);
    midOsc.frequency.exponentialRampToValueAtTime(48, now + 0.12);

    midGain.gain.setValueAtTime(0.22 * effectiveVol, now);
    midGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    midOsc.connect(midGain);
    this.connectToMaster(midGain);

    midOsc.start(now);
    midOsc.stop(now + 0.12);

    // 3. Heavy Low-Pass Contact Noise Thump
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(420, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.08 * effectiveVol, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    this.connectToMaster(noiseGain);

    noise.start(now);
    noise.stop(now + 0.08);
  }

  playDash() {
    if (this.shouldThrottle('dash', 70)) return; // 70ms throttle
    this.init();
    if (!this.ctx || !this.enabled) return;

    const now = this.ctx.currentTime;
    const effectiveVol = this.getEffectiveVolume();
    if (effectiveVol <= 0.001) return;

    // Smooth air swoosh
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.10);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(100, now);
    filter.frequency.exponentialRampToValueAtTime(320, now + 0.10);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.035 * effectiveVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.10);

    noise.connect(filter);
    filter.connect(gain);
    this.connectToMaster(gain);

    noise.start(now);
    noise.stop(now + 0.10);
  }

  playCapoeiraWhoosh() {
    if (this.shouldThrottle('capoeira_whoosh', 100)) return;
    this.init();
    if (!this.ctx || !this.enabled) return;

    const now = this.ctx.currentTime;
    const effectiveVol = this.getEffectiveVolume();
    if (effectiveVol <= 0.001) return;

    // Kinetic Leg Arc Wind Swoosh (Meia Lua de Compasso whipping wind arc)
    const duration = 0.32;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Resonant bandpass filter sweeping from 120Hz -> 850Hz -> 140Hz
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(1.6, now);
    filter.frequency.setValueAtTime(120, now);
    filter.frequency.exponentialRampToValueAtTime(850, now + 0.14);
    filter.frequency.exponentialRampToValueAtTime(140, now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01 * effectiveVol, now);
    gain.gain.linearRampToValueAtTime(0.14 * effectiveVol, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    this.connectToMaster(gain);

    noise.start(now);
    noise.stop(now + duration);

    // Deep Sub-Bass Wind Gust Sweep (160Hz -> 38Hz)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(160, now);
    subOsc.frequency.exponentialRampToValueAtTime(38, now + duration);

    subGain.gain.setValueAtTime(0.09 * effectiveVol, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    subOsc.connect(subGain);
    this.connectToMaster(subGain);

    subOsc.start(now);
    subOsc.stop(now + duration);
  }

  playRollTick() {
    if (this.shouldThrottle('tick', 35)) return; // 35ms throttle
    // Soft, organic keyclick (380Hz -> 200Hz sine drop)
    this.playTone(380, 'sine', 0.018, [0.025, 0.0], [0.015]);
  }

  playRollSuccess(rarity: 'standard' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'secret_mythic') {
    if (this.shouldThrottle('roll_success', 150)) return;
    this.init();
    if (!this.ctx || !this.enabled) return;

    if (rarity === 'standard') {
      this.playTone(440, 'sine', 0.1, [0.06, 0.0], [0.08]); // A4
      setTimeout(() => this.playTone(554.37, 'sine', 0.12, [0.06, 0.0], [0.10]), 70); // C#5
    } else if (rarity === 'uncommon') {
      this.playTone(493.88, 'sine', 0.1, [0.06, 0.0], [0.08]); // B4
      setTimeout(() => this.playTone(622.25, 'sine', 0.12, [0.06, 0.0], [0.10]), 70); // D#5
    } else if (rarity === 'rare') {
      this.playTone(440, 'sine', 0.1, [0.06, 0.0], [0.08]);
      setTimeout(() => this.playTone(554.37, 'sine', 0.1, [0.06, 0.0], [0.08]), 60);
      setTimeout(() => this.playTone(659.25, 'sine', 0.15, [0.07, 0.0], [0.12]), 120);
    } else if (rarity === 'epic') {
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          this.playTone(freq, 'sine', 0.2, [0.06, 0.0], [0.18]);
        }, idx * 70);
      });
    } else if (rarity === 'legendary') {
      // Legendary warm chord cascade
      const notes = [440, 554.37, 659.25, 880, 1108.73];
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          this.playTone(freq, 'triangle', 0.25, [0.06, 0.0], [0.22]);
        }, idx * 55);
      });
    } else {
      // Mythic: Deep cinematic sub gong + high harmonic resonant chime cascade
      this.playTone(65, 'sine', 0.6, [0.18, 0.0], [0.55]);
      const notes = [220, 330, 440, 660, 880, 1320];
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          this.playTone(freq, 'triangle', 0.35, [0.08, 0.0], [0.30]);
        }, idx * 45);
      });
    }
  }

  playUpgradeHeight() {
    if (this.shouldThrottle('upgrade', 100)) return;
    this.init();
    if (!this.ctx || !this.enabled) return;

    // Upward warm pitch bend
    const now = this.ctx.currentTime;
    const effectiveVol = this.getEffectiveVolume();
    if (effectiveVol <= 0.001) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(380, now + 0.20);

    gainNode.gain.setValueAtTime(0.06 * effectiveVol, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.20);

    osc.connect(gainNode);
    this.connectToMaster(gainNode);

    osc.start(now);
    osc.stop(now + 0.20);
  }

  playLevelUp() {
    if (this.shouldThrottle('levelup', 200)) return;
    const notes = [329.63, 440, 554.37, 659.25]; // E4, A4, C#5, E5
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'sine', 0.30, [0.06, 0.0], [0.25]);
      }, idx * 75);
    });
  }

  playKO() {
    if (this.shouldThrottle('ko', 250)) return; // 250ms throttle prevents double KO boom
    this.init();
    if (!this.ctx || !this.enabled) return;

    const now = this.ctx.currentTime;
    const effectiveVol = this.getEffectiveVolume();
    if (effectiveVol <= 0.001) return;
    
    // Deep warm sub-bass impact thud
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(85, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.50);

    gainNode.gain.setValueAtTime(0.15 * effectiveVol, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.50);

    osc.connect(gainNode);
    this.connectToMaster(gainNode);

    osc.start(now);
    osc.stop(now + 0.50);
  }

  playFightShout() {
    if (this.shouldThrottle('fight_shout', 400)) return; // 400ms throttle
    this.init();
    if (!this.ctx || !this.enabled) return;

    const now = this.ctx.currentTime;
    const effectiveVol = this.getEffectiveVolume();
    if (effectiveVol <= 0.001) return;

    // Rich cinematic gong/horn (Triangle + Sine sub)
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(180, now);
    osc1.frequency.exponentialRampToValueAtTime(75, now + 0.40);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(240, now);
    osc2.frequency.exponentialRampToValueAtTime(90, now + 0.40);

    gainNode.gain.setValueAtTime(0.12 * effectiveVol, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    this.connectToMaster(gainNode);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);

    // Warm deep sub gong accompaniment
    this.playTone(110, 'sine', 0.40, [0.14, 0.0], [0.35]);
  }

  playParry() {
    if (this.shouldThrottle('parry', 80)) return; // 80ms throttle
    this.init();
    if (!this.ctx || !this.enabled) return;

    const now = this.ctx.currentTime;
    const effectiveVol = this.getEffectiveVolume();
    if (effectiveVol <= 0.001) return;

    // Bright, High-Pitched Metallic Cling Overtones (Inharmonic ratios for crisp blade/shield ping)
    const freqs = [2650, 3880, 5120, 6850];
    const decays = [0.32, 0.24, 0.18, 0.12];
    const gains = [0.22, 0.15, 0.09, 0.05];

    freqs.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gainNode = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gainNode.gain.setValueAtTime(gains[i] * effectiveVol, now);
      gainNode.gain.exponentialRampToValueAtTime(0.0005, now + decays[i]);

      osc.connect(gainNode);
      this.connectToMaster(gainNode);

      osc.start(now);
      osc.stop(now + decays[i]);
    });

    // High-Frequency Metallic Ring Snap (Sharp Bandpass Ping)
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.025);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(4500, now);
    filter.Q.setValueAtTime(5.0, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12 * effectiveVol, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    noise.connect(filter);
    filter.connect(noiseGain);
    this.connectToMaster(noiseGain);

    noise.start(now);
    noise.stop(now + 0.025);
  }

  playBlock() {
    if (this.shouldThrottle('block', 60)) return;
    this.init();
    if (!this.ctx || !this.enabled) return;

    const now = this.ctx.currentTime;
    const effectiveVol = this.getEffectiveVolume();
    if (effectiveVol <= 0.001) return;

    // Solid, heavy dull guard impact thud (lowered pitch 310Hz -> 80Hz)
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(310, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

    gainNode.gain.setValueAtTime(0.20 * effectiveVol, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gainNode);
    this.connectToMaster(gainNode);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  playGuardBreak() {
    if (this.shouldThrottle('guard_break', 80)) return;
    this.playM2Heavy();
    // High-impact glass/armor shatter tone
    this.playTone(850, 'triangle', 0.22, [0.18, 0.0], [0.20]);
    this.playTone(420, 'sawtooth' as OscillatorType, 0.28, [0.14, 0.0], [0.25]);
  }

  playGemCollected(type: 'xp' | 'cash' | 'roll') {
    if (this.shouldThrottle(`gem_${type}`, 35)) return;
    if (type === 'xp') {
      this.playTone(520, 'sine', 0.04, [0.03, 0.0], [0.03]);
    } else if (type === 'cash') {
      this.playTone(660, 'sine', 0.05, [0.03, 0.0], [0.04]);
    } else {
      this.playTone(780, 'sine', 0.05, [0.03, 0.0], [0.04]);
    }
  }

  // Crate & Key Unboxing Sound Procedures
  playChestPop() {
    this.playTone(220, 'triangle', 0.12, [0.18, 0.0], [0.10]);
    this.playTone(110, 'sine', 0.20, [0.15, 0.0], [0.16]);
  }

  playKeyInsert() {
    this.playTone(1200, 'triangle', 0.08, [0.12, 0.0], [0.06]);
    this.playTone(880, 'sine', 0.12, [0.10, 0.0], [0.09]);
  }

  playCrateLatch() {
    this.playTone(340, 'triangle', 0.07, [0.18, 0.0], [0.05]);
    this.playTone(680, 'sine', 0.06, [0.12, 0.0], [0.04]);
  }

  playCrateRattle(stage: number = 1) {
    const freq = 120 + stage * 45;
    const vol = 0.12 + stage * 0.06;
    this.playTone(freq, 'sawtooth', 0.10, [vol, 0.0], [0.08]);
    this.playTone(freq * 0.5, 'triangle', 0.14, [vol * 0.8, 0.0], [0.12]);
  }

  playCrateWin() {
    // Triumphant harmonic chime
    this.playTone(523.25, 'triangle', 0.45, [0.22, 0.0], [0.40]); // C5
    setTimeout(() => this.playTone(659.25, 'triangle', 0.45, [0.24, 0.0], [0.40]), 80); // E5
    setTimeout(() => this.playTone(783.99, 'triangle', 0.55, [0.26, 0.0], [0.50]), 160); // G5
    setTimeout(() => this.playTone(1046.50, 'sine', 0.65, [0.28, 0.0], [0.60]), 240); // C6
  }

  playCrateEmpty() {
    // Dull hollow mechanical thud
    this.playTone(160, 'triangle', 0.25, [0.15, 0.0], [0.20]);
    this.playTone(110, 'sine', 0.35, [0.12, 0.0], [0.30]);
  }

  playCrateClose() {
    if (this.shouldThrottle('crate_close', 100)) return;
    // Heavy mechanical lid shut & latch lock
    this.playTone(280, 'triangle', 0.12, [0.22, 0.0], [0.10]);
    this.playTone(140, 'sine', 0.18, [0.18, 0.0], [0.14]);
    this.playTone(85, 'triangle', 0.22, [0.25, 0.0], [0.18]);
  }

  playCrateSlide() {
    if (this.shouldThrottle('crate_slide', 100)) return;
    // Smooth pneumatic conveyor sliding whoosh
    this.playTone(220, 'sine', 0.24, [0.08, 0.0], [0.22]);
    this.playTone(440, 'triangle', 0.14, [0.05, 0.0], [0.12]);
  }
}

export const soundManager = new SoundManager();
