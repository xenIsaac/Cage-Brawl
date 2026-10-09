import { Fighter } from '../../types';

export interface HandTrailPoint {
  worldFx: number;
  worldFy: number;
  worldEx: number;
  worldEy: number;
  worldSx: number;
  worldSy: number;
  handAngle: number;
  handWidth: number;
  handHeight: number;
  time: number;
  alpha: number;
}

export interface FighterTrailStore {
  left: HandTrailPoint[];
  right: HandTrailPoint[];
}

export interface TrailRenderParams {
  ctx: CanvasRenderingContext2D;
  fighter: Fighter;
  isLeft: boolean;
  worldFx: number;
  worldFy: number;
  worldEx: number;
  worldEy: number;
  worldSx: number;
  worldSy: number;
  worldHandAngle: number;
  actualFistX: number;
  actualFistY: number;
  gloveRot: number;
  fistW: number;
  fistH: number;
  gameTime: number;
}
