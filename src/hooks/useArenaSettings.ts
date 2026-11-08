import { useState, useEffect, useRef } from 'react';
import { GameSettings } from '../types';
import { soundManager } from '../components/SoundManager';

export interface UseArenaSettingsOptions {
  settings: GameSettings;
  matchData?: any;
}

export function useArenaSettings({ settings, matchData }: UseArenaSettingsOptions) {
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1.0);
  const simulationSpeedRef = useRef<number>(1.0);
  const [showHitboxes, setShowHitboxes] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());

  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 1024;
  });

  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerHeight > window.innerWidth;
  });

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    const handleTouchStart = () => {
      setIsTouchDevice(true);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);

  const handleGameSpeedChange = (speed: number) => {
    setSimulationSpeed(speed);
    simulationSpeedRef.current = speed;
  };

  return {
    simulationSpeed,
    simulationSpeedRef,
    showHitboxes,
    setShowHitboxes,
    soundEnabled,
    setSoundEnabled,
    isTouchDevice,
    isPortrait,
    settingsRef,
    handleGameSpeedChange,
  };
}
