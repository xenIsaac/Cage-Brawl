import { Fighter, Fist } from '../../types';
import { CombatFighter } from '../types';

export interface FistIKContext {
  fighter: CombatFighter | Fighter;
  fist: Fist;
  idleTime: number;
  isBlockingActive: boolean;
  isCollision: boolean;
  gameTime: number;
  isLeft: boolean;
  leftProgress: number;
  rightProgress: number;
  easeProgress: number;
}

export type StyleFistIKHandler = (
  ctx: FistIKContext
) => { fistX: number; fistY: number } | null;
