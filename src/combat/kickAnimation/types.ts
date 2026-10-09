import { CombatFighter } from '../types';
import { Fist } from '../../types';

export interface KickAttackInfo {
  isKick: boolean;
  isStandardKick: boolean;
  isCapoeiraKick: boolean;
  kickStage: number;
  isHeavyKick: boolean;
  activeProgress: number;
  attackProgress: number;
  isLeftLimb: boolean;
  snapEasing: number;
}
