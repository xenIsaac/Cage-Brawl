// ============================================================================
// DOJO FRAME INSPECTOR & VISUAL DIAGNOSTIC HOOK (src/combat/inspector.ts)
// Section B: Real-Time Diagnostic Visualizer for Hitboxes, Attack Phases & State
// ============================================================================

import { StyleKinematicPose } from '../styles/types';

export interface FrameDiagnosticSnapshot {
  timestampMs: number;
  frameNumber: number;
  fighterId: string;
  styleId: string;
  attackPhase: 'idle' | 'windup' | 'active' | 'recovery';
  sequenceIndex: number;
  normalizedProgress: number; // 0.0 - 1.0
  activeHitbox: {
    x: number;
    y: number;
    radius: number;
    shape: 'circle' | 'capsule' | 'sector';
    isActive: boolean;
  } | null;
  pose: StyleKinematicPose | null;
  isolatedState: Record<string, unknown> | null;
}

class FrameInspectorService {
  private enabled: boolean = false;
  private snapshots: Map<string, FrameDiagnosticSnapshot> = new Map();
  private listeners: Set<(snapshot: FrameDiagnosticSnapshot) => void> = new Set();
  private frameCounter: number = 0;

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean): void {
    this.enabled = val;
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  public recordFrame(
    fighterId: string,
    styleId: string,
    attackPhase: 'idle' | 'windup' | 'active' | 'recovery',
    sequenceIndex: number,
    progress: number,
    pose: StyleKinematicPose | null,
    isolatedState: Record<string, unknown> | null
  ): void {
    if (!this.enabled) return;

    this.frameCounter++;
    const activeHitbox = pose
      ? {
          x: pose.hitboxOffset.x,
          y: pose.hitboxOffset.y,
          radius: pose.hitboxOffset.radius,
          shape: pose.hitboxShape,
          isActive: attackPhase === 'active',
        }
      : null;

    const snapshot: FrameDiagnosticSnapshot = {
      timestampMs: performance.now(),
      frameNumber: this.frameCounter,
      fighterId,
      styleId,
      attackPhase,
      sequenceIndex,
      normalizedProgress: Math.max(0, Math.min(1, progress)),
      activeHitbox,
      pose,
      isolatedState: isolatedState ? { ...isolatedState } : null,
    };

    this.snapshots.set(fighterId, snapshot);
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  public getLatestSnapshot(fighterId: string): FrameDiagnosticSnapshot | null {
    return this.snapshots.get(fighterId) || null;
  }

  public subscribe(
    listener: (snapshot: FrameDiagnosticSnapshot) => void
  ): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Headless / Canvas Diagnostic Overlay Renderer
   * Renders color-coded frame phase boxes, hitbox radius, and isolated state inspection in Dojo
   */
  public renderOverlay(
    ctx: CanvasRenderingContext2D,
    fighterId: string,
    baseX: number,
    baseY: number,
    facing: 1 | -1
  ): void {
    if (!this.enabled) return;

    const snap = this.snapshots.get(fighterId);
    if (!snap) return;

    ctx.save();

    // 1. Color-coded attack phase ring & label
    let phaseColor = '#64748b'; // Idle: Slate
    if (snap.attackPhase === 'windup') phaseColor = '#f59e0b'; // Windup: Amber
    else if (snap.attackPhase === 'active') phaseColor = '#ef4444'; // Active: Red
    else if (snap.attackPhase === 'recovery') phaseColor = '#3b82f6'; // Recovery: Blue

    // Draw phase badge above fighter
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = phaseColor;
    ctx.fillText(
      `[${snap.attackPhase.toUpperCase()} S${snap.sequenceIndex + 1} ${(snap.normalizedProgress * 100).toFixed(0)}%]`,
      baseX,
      baseY - 70
    );

    // 2. Render Hitbox Overlay if present
    if (snap.activeHitbox && snap.activeHitbox.isActive) {
      const hx = baseX + snap.activeHitbox.x * facing;
      const hy = baseY + snap.activeHitbox.y;
      ctx.beginPath();
      ctx.arc(hx, hy, snap.activeHitbox.radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.stroke();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.fill();
      ctx.setLineDash([]);
    }

    // 3. Isolated State HUD (Slugger stacks, TKD chamber, etc.)
    if (snap.isolatedState && Object.keys(snap.isolatedState).length > 0) {
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(baseX - 50, baseY + 45, 100, 14 * Object.keys(snap.isolatedState).length + 4);
      ctx.fillStyle = '#38bdf8';
      let row = 0;
      for (const [key, val] of Object.entries(snap.isolatedState)) {
        const displayVal = typeof val === 'number' ? val.toFixed(2) : String(val);
        ctx.fillText(`${key}: ${displayVal}`, baseX - 46, baseY + 57 + row * 13);
        row++;
      }
    }

    ctx.restore();
  }
}

export const frameInspector = new FrameInspectorService();
