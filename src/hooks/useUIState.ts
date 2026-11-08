import { useState } from 'react';

export interface UseUIStateOptions {
  matchData?: any;
}

export function useUIState({ matchData }: UseUIStateOptions = {}) {
  const [showModeSelector, setShowModeSelector] = useState(() => false);
  const [showControlsHelp, setShowControlsHelp] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showHudEditor, setShowHudEditor] = useState<boolean>(false);
  const [isLiveHudEditing, setIsLiveHudEditing] = useState<boolean>(() => !!(matchData as any)?.startWithLiveHud);
  const [showFullSettings, setShowFullSettings] = useState<boolean>(false);
  const [spectatorModalOpen, setSpectatorModalOpen] = useState<boolean>(false);

  const [isTrainingHudOpen, setIsTrainingHudOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return false;
    }
    return true;
  });

  const [practiceModalTab, setPracticeModalTab] = useState<'styles' | 'difficulty' | 'modifiers'>('styles');
  const [trainingHudTab, setTrainingHudTab] = useState<'style' | 'ai' | 'mods' | 'stats'>('style');

  return {
    showModeSelector,
    setShowModeSelector,
    showControlsHelp,
    setShowControlsHelp,
    showMobileMenu,
    setShowMobileMenu,
    showHudEditor,
    setShowHudEditor,
    isLiveHudEditing,
    setIsLiveHudEditing,
    showFullSettings,
    setShowFullSettings,
    spectatorModalOpen,
    setSpectatorModalOpen,
    isTrainingHudOpen,
    setIsTrainingHudOpen,
    practiceModalTab,
    setPracticeModalTab,
    trainingHudTab,
    setTrainingHudTab,
  };
}
