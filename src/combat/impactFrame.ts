import { Fighter } from '../types';
import {
  isSluggerImpactActive,
  isSluggerImpactSilhouette,
  triggerSluggerHitImpact,
  triggerSluggerBlockImpact,
  updateSluggerImpact,
  renderSluggerImpactBackground,
  renderSluggerImpactForeground
} from './effects/sluggerImpactFrame';
import {
  isKyokushinImpactActive,
  isKyokushinImpactSilhouette,
  triggerKyokushinHitImpact,
  updateKyokushinImpact,
  renderKyokushinImpactBackground,
  renderKyokushinImpactForeground
} from './effects/kyokushinImpactFrame';

/**
 * Checks if any Impact Frame sequence is currently active.
 */
export function isImpactFrameActive(): boolean {
  return isSluggerImpactActive() || isKyokushinImpactActive();
}

/**
 * Checks whether a given fighter should be rendered as a pitch-black impact silhouette.
 */
export function isImpactFrameSilhouette(_fighter?: Fighter | any): boolean {
  return isSluggerImpactSilhouette() || isKyokushinImpactSilhouette();
}

/**
 * Triggers Slugger M2 Clean Hit Impact Frame.
 */
export function triggerSluggerImpactFrame(
  attacker: Fighter,
  defender: Fighter,
  hitX: number,
  hitY: number,
  kbX: number,
  kbY: number
): void {
  triggerSluggerHitImpact(attacker, defender, hitX, hitY, kbX, kbY);
}

/**
 * Triggers Slugger M2 Block Variant Impact Frame (triangular shards flowing sideways and curving around).
 */
export function triggerSluggerBlockImpactFrame(
  attacker: Fighter,
  defender: Fighter,
  hitX: number,
  hitY: number,
  kbX: number,
  kbY: number
): void {
  triggerSluggerBlockImpact(attacker, defender, hitX, hitY, kbX, kbY);
}

/**
 * Triggers Kyokushin Karate M2 Gedan Mawashi Geri Impact Frame.
 */
export function triggerKyokushinImpactFrame(
  attacker: Fighter,
  defender: Fighter,
  hitX: number,
  hitY: number,
  kbX: number,
  kbY: number
): void {
  triggerKyokushinHitImpact(attacker, defender, hitX, hitY, kbX, kbY);
}

/**
 * Updates all active impact frame scripts each tick.
 */
export function updateImpactFrame(gameTime: number): void {
  updateSluggerImpact(gameTime);
  updateKyokushinImpact(gameTime);
}

/**
 * Renders stark pure-white screen background and black shockwaves for active styles.
 */
export function renderImpactFrameBackground(
  ctx: CanvasRenderingContext2D,
  arenaSize: number
): void {
  renderSluggerImpactBackground(ctx, arenaSize);
  renderKyokushinImpactBackground(ctx, arenaSize);
}

/**
 * Renders slow-motion foreground particles.
 */
export function renderImpactFrameForeground(ctx: CanvasRenderingContext2D): void {
  renderSluggerImpactForeground(ctx);
  renderKyokushinImpactForeground(ctx);
}
