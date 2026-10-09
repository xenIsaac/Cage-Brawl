import { VirtualControlItem, KeybindSettings } from '../types';

export const DEFAULT_KEYBINDS: KeybindSettings = {
  block: 'KeyF',
  dash: 'Space'
};

export const DEFAULT_LANDSCAPE_LAYOUT: VirtualControlItem[] = [
  { id: 'joystick', label: 'Move Stick', x: 15, y: 72, radius: 45, color: '#ec4899', opacity: 0.85, scale: 1.0 },
  { id: 'light', label: 'Light (M1)', x: 82, y: 72, radius: 34, color: '#ef4444', opacity: 0.9, scale: 1.0 },
  { id: 'heavy', label: 'Heavy (M2)', x: 91, y: 56, radius: 34, color: '#f59e0b', opacity: 0.9, scale: 1.0 },
  { id: 'block', label: 'Block', x: 73, y: 84, radius: 28, color: '#06b6d4', opacity: 0.85, scale: 1.0 },
  { id: 'dash', label: 'Dash / Dodge', x: 88, y: 84, radius: 28, color: '#a855f7', opacity: 0.85, scale: 1.0 },
  { id: 'sprint', label: 'Sprint', x: 62, y: 84, radius: 26, color: '#10b981', opacity: 0.85, scale: 1.0 },
  { id: 'target_switch', label: 'Switch Target', x: 80, y: 42, radius: 28, color: '#38bdf8', opacity: 0.85, scale: 1.0 },
  { id: 'player_card', label: 'Your Card (P1)', x: 22, y: 7, radius: 32, color: '#3b82f6', opacity: 0.85, scale: 0.85 },
  { id: 'opponent_card', label: 'Enemy Card (P2)', x: 78, y: 7, radius: 32, color: '#ef4444', opacity: 0.85, scale: 0.85 },
  { id: 'status_bar', label: 'Status Bar', x: 22, y: 19, radius: 26, color: '#f97316', opacity: 0.9, scale: 1.0 },
  { id: 'm2_cooldown', label: 'M2 Cooldown', x: 10, y: 40, radius: 28, color: '#f59e0b', opacity: 0.9, scale: 1.0 },
  { id: 'menu_settings', label: 'Menu / Settings', x: 92, y: 6, radius: 25, color: '#10b981', opacity: 0.8, scale: 0.9 },
];

export const DEFAULT_PORTRAIT_LAYOUT: VirtualControlItem[] = [
  { id: 'joystick', label: 'Move Stick', x: 20, y: 78, radius: 46, color: '#ec4899', opacity: 0.85, scale: 1.0 },
  { id: 'light', label: 'Light (M1)', x: 78, y: 74, radius: 36, color: '#ef4444', opacity: 0.9, scale: 1.0 },
  { id: 'heavy', label: 'Heavy (M2)', x: 86, y: 60, radius: 34, color: '#f59e0b', opacity: 0.9, scale: 1.0 },
  { id: 'block', label: 'Block', x: 62, y: 84, radius: 28, color: '#06b6d4', opacity: 0.85, scale: 1.0 },
  { id: 'dash', label: 'Dash / Dodge', x: 84, y: 88, radius: 28, color: '#a855f7', opacity: 0.85, scale: 1.0 },
  { id: 'sprint', label: 'Sprint', x: 44, y: 88, radius: 26, color: '#10b981', opacity: 0.85, scale: 1.0 },
  { id: 'target_switch', label: 'Switch Target', x: 68, y: 64, radius: 26, color: '#38bdf8', opacity: 0.85, scale: 0.95 },
  { id: 'player_card', label: 'Your Card (P1)', x: 24, y: 7, radius: 30, color: '#3b82f6', opacity: 0.85, scale: 0.75 },
  { id: 'opponent_card', label: 'Enemy Card (P2)', x: 76, y: 7, radius: 30, color: '#ef4444', opacity: 0.85, scale: 0.75 },
  { id: 'status_bar', label: 'Status Bar', x: 24, y: 19, radius: 26, color: '#f97316', opacity: 0.9, scale: 1.0 },
  { id: 'm2_cooldown', label: 'M2 Cooldown', x: 14, y: 35, radius: 28, color: '#f59e0b', opacity: 0.9, scale: 0.95 },
  { id: 'menu_settings', label: 'Menu / Settings', x: 88, y: 5, radius: 24, color: '#10b981', opacity: 0.8, scale: 0.85 },
];

export function formatKeyCode(code: string): string {
  if (!code) return 'UNBOUND';
  if (code.startsWith('Key')) return code.slice(3).toUpperCase();
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'Space') return 'SPACE';
  if (code === 'ShiftLeft') return 'L-SHIFT';
  if (code === 'ShiftRight') return 'R-SHIFT';
  if (code === 'ControlLeft') return 'L-CTRL';
  if (code === 'ControlRight') return 'R-CTRL';
  if (code === 'AltLeft') return 'L-ALT';
  if (code === 'AltRight') return 'R-ALT';
  if (code === 'Tab') return 'TAB';
  if (code === 'Enter') return 'ENTER';
  if (code === 'Backspace') return 'BKSP';
  if (code === 'Escape') return 'ESC';
  return code.toUpperCase();
}

export function sanitizeLayout(
  customLayout: VirtualControlItem[] | undefined,
  fallbackLayout: VirtualControlItem[]
): VirtualControlItem[] {
  if (!customLayout || !Array.isArray(customLayout) || customLayout.length === 0) {
    return JSON.parse(JSON.stringify(fallbackLayout));
  }

  return fallbackLayout.map(fallback => {
    // Check if directly exists
    const match = customLayout.find(c => c.id === fallback.id);
    if (match) {
      return {
        ...fallback,
        ...match,
        x: Math.round(match.x ?? fallback.x),
        y: Math.round(match.y ?? fallback.y),
        scale: match.scale ?? fallback.scale ?? 1.0,
        opacity: match.opacity ?? fallback.opacity ?? 0.85,
      };
    }
    // Backward compatibility: If char_cards existed in customLayout, map to player_card / opponent_card
    if (fallback.id === 'player_card') {
      const legacyCard = customLayout.find(c => c.id === 'char_cards');
      if (legacyCard) {
        return {
          ...fallback,
          x: Math.max(10, legacyCard.x - 25),
          y: legacyCard.y,
          scale: legacyCard.scale ?? fallback.scale,
          opacity: legacyCard.opacity ?? fallback.opacity,
        };
      }
    }
    if (fallback.id === 'opponent_card') {
      const legacyCard = customLayout.find(c => c.id === 'char_cards');
      if (legacyCard) {
        return {
          ...fallback,
          x: Math.min(90, legacyCard.x + 25),
          y: legacyCard.y,
          scale: legacyCard.scale ?? fallback.scale,
          opacity: legacyCard.opacity ?? fallback.opacity,
        };
      }
    }

    return { ...fallback };
  });
}
