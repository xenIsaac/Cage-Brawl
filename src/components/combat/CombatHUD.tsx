import React, { useMemo } from 'react';
import { GameSettings, MatchData } from '../../types';
import MobileControls from '../MobileControls';

export interface CombatHUDProps {
  settings: GameSettings;
  stateRef: React.RefObject<any>;
  isPlaying: boolean;
  isDead: boolean;
  rankedState: string;
  showModeSelector: boolean;
  matchData?: MatchData | null;
  isLiveHudEditing: boolean;
  isTouchDevice: boolean;
  isPortrait: boolean;
  onLightAttack: () => void;
  onLightHoldStart?: () => void;
  onLightHoldEnd?: () => void;
  onHeavyAttack: () => void;
  onBlockStart: () => void;
  onBlockEnd: () => void;
  onDash: () => void;
  onTargetSwitch?: () => void;
}

/**
 * CombatHUD: Phase 1 Modular Extraction for Arena Touch HUD & Mobile Controls.
 * Handles dynamic scaling (portrait vs landscape), virtual controls overlay,
 * touch action dispatching, and zero-scroll mobile viewport adaptation.
 */
export const CombatHUD: React.FC<CombatHUDProps> = ({
  settings,
  stateRef,
  isPlaying,
  isDead,
  rankedState,
  showModeSelector,
  matchData,
  isLiveHudEditing,
  isTouchDevice,
  isPortrait,
  onLightAttack,
  onLightHoldStart,
  onLightHoldEnd,
  onHeavyAttack,
  onBlockStart,
  onBlockEnd,
  onDash,
  onTargetSwitch,
}) => {
  // Determine if virtual touch controls should be actively mounted and rendered
  const shouldRenderControls = useMemo(() => {
    if (!isPlaying || isDead || rankedState === 'match_over' || showModeSelector) {
      return false;
    }
    if (matchData?.isAiVsAiSpectator || matchData?.isSpectator) {
      return false;
    }
    if (isLiveHudEditing) {
      return false;
    }
    const touchMode = settings.touchControlMode ?? 'virtual';
    if (touchMode !== 'virtual') {
      return false;
    }
    const showPref = settings.showVirtualControls ?? 'auto';
    if (showPref === 'always') {
      return true;
    }
    if (showPref === 'auto' && isTouchDevice) {
      return true;
    }
    return false;
  }, [
    isPlaying,
    isDead,
    rankedState,
    showModeSelector,
    matchData?.isAiVsAiSpectator,
    matchData?.isSpectator,
    isLiveHudEditing,
    settings.touchControlMode,
    settings.showVirtualControls,
    isTouchDevice,
  ]);

  if (!shouldRenderControls) {
    return null;
  }

  return (
    <div 
      className={`absolute inset-0 pointer-events-none z-20 overflow-hidden select-none ${
        isPortrait ? 'touch-hud-portrait' : 'touch-hud-landscape'
      }`}
      style={{
        // Prevent accidental touch actions or gesture zoom beyond intended canvas bounds
        touchAction: 'none',
      }}
    >
      <MobileControls
        settings={settings}
        stateRef={stateRef}
        onLightAttack={onLightAttack}
        onLightHoldStart={onLightHoldStart}
        onLightHoldEnd={onLightHoldEnd}
        onHeavyAttack={onHeavyAttack}
        onBlockStart={onBlockStart}
        onBlockEnd={onBlockEnd}
        onDash={onDash}
        onTargetSwitch={onTargetSwitch}
      />
    </div>
  );
};

export default CombatHUD;
