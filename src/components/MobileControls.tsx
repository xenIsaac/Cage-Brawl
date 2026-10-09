import React, { useState, useEffect, useRef } from 'react';
import { GameSettings, VirtualControlItem } from '../types';
import { DEFAULT_LANDSCAPE_LAYOUT, DEFAULT_PORTRAIT_LAYOUT } from '../data/hudDefaults';

interface MobileControlsProps {
  settings: GameSettings;
  stateRef: React.RefObject<{
    joystickX?: number;
    joystickY?: number;
    keysPressed: Record<string, boolean>;
    player: any;
    isLMBHeld?: boolean;
  }>;
  onLightAttack: () => void;
  onLightHoldStart?: () => void;
  onLightHoldEnd?: () => void;
  onHeavyAttack: () => void;
  onBlockStart: () => void;
  onBlockEnd: () => void;
  onDash: () => void;
  onTargetSwitch?: () => void;
  showTargetSwitch?: boolean;
}

export default function MobileControls({
  settings,
  stateRef,
  onLightAttack,
  onLightHoldStart,
  onLightHoldEnd,
  onHeavyAttack,
  onBlockStart,
  onBlockEnd,
  onDash,
  onTargetSwitch,
  showTargetSwitch = false,
}: MobileControlsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Joystick local visual offset state
  const [stickOffset, setStickOffset] = useState({ x: 0, y: 0 });
  const [activeTouchId, setActiveTouchId] = useState<number | null>(null);
  const lastTouchMoveTimeRef = useRef<number>(0);
  const lastTouchTimestampRef = useRef<number>(0);

  // Screen dimensions state for responsive positioning
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Tracks active state for buttons to show pressed state
  const [pressedButtons, setPressedButtons] = useState<Record<string, boolean>>({});

  // Realtime usability state for M1 and M2
  const [canM1, setCanM1] = useState(true);
  const [canM2, setCanM2] = useState(true);
  const [heavyCD, setHeavyCD] = useState(0);
  const [maxHeavyCD, setMaxHeavyCD] = useState(240);
  const [postureCD, setPostureCD] = useState(0);
  const [maxPostureCD, setMaxPostureCD] = useState(78);

  // Helper to start holding M1
  const startLightHold = () => {
    if (stateRef.current) {
      stateRef.current.isLMBHeld = true;
    }
    if (onLightHoldStart) onLightHoldStart();
    onLightAttack();
  };

  // Helper to stop holding M1
  const stopLightHold = () => {
    if (stateRef.current) {
      stateRef.current.isLMBHeld = false;
    }
    if (onLightHoldEnd) onLightHoldEnd();
  };

  // Dedicated sprint button tracking ref
  const isSprintButtonHeldRef = useRef<boolean>(false);
  // Dedicated block button tracking ref for persistent block hold across hits
  const isBlockButtonHeldRef = useRef<boolean>(false);

  const handleSprintPress = () => {
    isSprintButtonHeldRef.current = true;
    if (stateRef.current) {
      stateRef.current.keysPressed['KeyShift'] = true;
    }
  };

  const handleSprintRelease = () => {
    isSprintButtonHeldRef.current = false;
    if (stateRef.current) {
      const isAutoSprint = settings.mobileSprintMode === 'auto_sprint';
      const rx = stateRef.current.joystickX || 0;
      const ry = stateRef.current.joystickY || 0;
      const tilt = Math.sqrt(rx * rx + ry * ry);
      // In auto-sprint mode, keep sprinting if joystick is still tilted >= 96%
      if (isAutoSprint && tilt >= 0.96) {
        stateRef.current.keysPressed['KeyShift'] = true;
      } else {
        stateRef.current.keysPressed['KeyShift'] = false;
      }
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    const handleOrientation = () => {
      handleResize();
      setTimeout(handleResize, 100);
      setTimeout(handleResize, 300);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientation);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientation);
    };
  }, []);

  const lastControlStatesRef = useRef<{ canM1?: boolean; canM2?: boolean; heavyCD?: number; maxHeavyCD?: number }>({});

  // 60FPS tick to evaluate player action availability (e.g. M1 and M2)
  useEffect(() => {
    let animId: number;
    const checkUsability = () => {
      const p = stateRef.current?.player;
      const last = lastControlStatesRef.current;
      if (!p || p.isDead) {
        if (last.canM1 !== false) { setCanM1(false); last.canM1 = false; }
        if (last.canM2 !== false) { setCanM2(false); last.canM2 = false; }
        if (last.heavyCD !== 0) { setHeavyCD(0); last.heavyCD = 0; }
      } else {
        const isStunned = (p.stunTime || 0) > 0;
        const isArmorBroken = (p.armorBreakTime || 0) > 0;
        const isPostBlockLockout = (p.postBlockAttackLockout || 0) > 0;
        const isPostS4HeavyLockout = (p.postS4HeavyLockout || 0) > 0;
        const isBlocking = p.isBlocking === true;
        const isExhausted = p.capoeiraExhausted === true;

        const isLightPunching = p.fists?.some((f: any) => f.isPunching && !f.isHeavy);
        const isHeavyPunching = p.fists?.some((f: any) => f.isPunching && f.isHeavy);
        const isHeavyWindup = (p.heavyWindup || 0) > 0;

        // Track heavy attack cooldown frames
        const hCd = p.heavyCooldown || 0;
        if (last.heavyCD !== hCd) {
          setHeavyCD(hCd);
          last.heavyCD = hCd;
        }

        // Track posture cooldown frames
        const pCd = p.postureCd || 0;
        const maxPcd = p.maxPostureCd || 78;
        if (postureCD !== pCd) {
          setPostureCD(pCd);
        }
        if (maxPostureCD !== maxPcd) {
          setMaxPostureCD(maxPcd);
        }

        // Dynamically track style-specific max cooldown frames
        let baseHeavyCD = 240;
        const styleId = p.styleId || p.style?.id;
        if (styleId === 'muay_thai') baseHeavyCD = 300;
        else if (styleId === 'ashihara') baseHeavyCD = 270;
        else if (styleId === 'shotokan') baseHeavyCD = 300;
        else if (styleId === 'capoeira') baseHeavyCD = 318;
        else if (styleId === 'slugger') baseHeavyCD = 150;
        else if (styleId === 'kyokushin') baseHeavyCD = 564;
        else if (styleId === 'kickboxing') baseHeavyCD = 192;
        else if (styleId === 'street_taekwondo') baseHeavyCD = 270;
        else if (styleId === 'keysi') baseHeavyCD = 720;
        else if (styleId === 'cqc') baseHeavyCD = 900;
        else if (styleId === 'boxing_shell') baseHeavyCD = 600;

        const effectiveMaxHeavyCD = Math.max(baseHeavyCD, hCd);
        if (last.maxHeavyCD !== effectiveMaxHeavyCD) {
          setMaxHeavyCD(effectiveMaxHeavyCD);
          last.maxHeavyCD = effectiveMaxHeavyCD;
        }

        const isShellLocked = (p.shellLockoutTimer || 0) > 0;
        const isSuperCrippled = (p.superCrippleTimer || 0) > 0;
        const isM2WhiffLocked = (p.sluggerM2WhiffLockoutTimer || 0) > 0;

        // M1 (Light) disabled check:
        const m1Disabled = 
          isStunned || 
          isArmorBroken || 
          isPostBlockLockout || 
          isBlocking || 
          isExhausted || 
          isHeavyPunching || 
          isHeavyWindup || 
          isShellLocked ||
          isSuperCrippled ||
          isM2WhiffLocked ||
          p.isPostureLocked === true ||
          (p.postureCd || 0) > 0 ||
          (p.strikeCooldown || 0) > 0 || 
          (p.lightCooldown || 0) > 0;

        const isIronBoxing = (p.styleId || p.style?.id) === 'boxing_shell';

        // M2 (Heavy) disabled check (Section 1.18: Global M2 Retraction Override enables M2 regardless of M1 retraction)
        // Iron Boxing Passive: Blocking no longer adds postdelay on M2, enabling instant M2 out of block
        const m2Disabled = 
          isStunned || 
          isArmorBroken || 
          (!isIronBoxing && isPostBlockLockout) || 
          isPostS4HeavyLockout ||
          (!isIronBoxing && isBlocking) || 
          isExhausted || 
          isHeavyPunching || 
          isHeavyWindup || 
          isShellLocked ||
          isSuperCrippled ||
          isM2WhiffLocked ||
          (p.keysiVulnerableTimer || 0) > 0 ||
          hCd > 0;

        const nextCanM1 = !m1Disabled;
        const nextCanM2 = !m2Disabled;
        if (last.canM1 !== nextCanM1) {
          setCanM1(nextCanM1);
          last.canM1 = nextCanM1;
          if (nextCanM1 && stateRef.current?.isLMBHeld) {
            onLightAttack();
          }
        }
        if (last.canM2 !== nextCanM2) {
          setCanM2(nextCanM2);
          last.canM2 = nextCanM2;
        }

        // Keep block input strictly held in engine while the virtual block button is pressed
        if (isBlockButtonHeldRef.current && stateRef.current) {
          stateRef.current.isBlockInputHeld = true;
          if (stateRef.current.player) {
            stateRef.current.player.isBlockInputHeld = true;
          }
        }
      }

      animId = requestAnimationFrame(checkUsability);
    };

    animId = requestAnimationFrame(checkUsability);
    return () => cancelAnimationFrame(animId);
  }, [stateRef]);

  // Dynamically select layout based on orientation (Portrait vs Landscape)
  const isPortraitMode = dimensions.height > dimensions.width;
  const activeDefaultLayout = isPortraitMode ? DEFAULT_PORTRAIT_LAYOUT : DEFAULT_LANDSCAPE_LAYOUT;
  const activeUserLayout = isPortraitMode 
    ? (settings.mobileControlsLayoutPortrait || DEFAULT_PORTRAIT_LAYOUT)
    : (settings.mobileControlsLayoutLandscape || settings.mobileControlsLayout || DEFAULT_LANDSCAPE_LAYOUT);

  const layoutItems = activeDefaultLayout.map(fallback => {
    const custom = activeUserLayout?.find(c => c.id === fallback.id);
    return custom || fallback;
  }).filter(item => {
    // Non-button items like cards, cooldowns, and status bar are handled separately in Arena
    if (['player_card', 'opponent_card', 'char_cards', 'm2_cooldown', 'menu_settings', 'status_bar'].includes(item.id)) return false;
    if (item.id === 'target_switch' && !showTargetSwitch) return false;
    return true;
  });

  const joystickConfig = layoutItems.find(c => c.id === 'joystick') || activeDefaultLayout.find(c => c.id === 'joystick') || { id: 'joystick', label: 'MOVE', x: 15, y: 72, radius: 45, color: '#ec4899', opacity: 0.8, scale: 1.0 };

  const getResponsiveLayout = (item: VirtualControlItem) => {
    const isMobileLandscape = dimensions.height < 500;
    const radiusScale = isMobileLandscape ? 0.90 : dimensions.width < 600 ? 0.85 : 1.0;
    const itemScale = item.scale !== undefined ? item.scale : 1.0;
    const finalRadius = item.radius * itemScale * radiusScale;
    const itemOpacity = item.opacity !== undefined ? item.opacity : (settings.hudOpacity ?? 0.85);

    return {
      left: `${item.x}%`,
      top: `${item.y}%`,
      width: `${finalRadius * 2}px`,
      height: `${finalRadius * 2}px`,
      radius: finalRadius,
      opacity: itemOpacity
    };
  };

  const handleJoystickTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const joystickElement = e.currentTarget;
    const rect = joystickElement.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const touch = Array.from(e.targetTouches).find(
      (t: any) => activeTouchId === null || t.identifier === activeTouchId
    ) || e.targetTouches[0];

    if (!touch) return;

    if (activeTouchId === null) {
      setActiveTouchId(touch.identifier);
    }

    const dx = touch.clientX - cx;
    const dy = touch.clientY - cy;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const isMobileLandscape = dimensions.height < 500;
    const radiusScale = isMobileLandscape ? 0.90 : dimensions.width < 600 ? 0.85 : 1.0;
    const maxRadius = joystickConfig.radius * radiusScale;
    let rx = dx;
    let ry = dy;

    if (distance > maxRadius) {
      rx = (dx / distance) * maxRadius;
      ry = (dy / distance) * maxRadius;
    }

    // Inject movement vector directly into game state (normalized between -1 and 1) instantly
    if (stateRef.current) {
      const tiltDist = Math.sqrt(rx * rx + ry * ry);
      stateRef.current.joystickX = rx / maxRadius;
      stateRef.current.joystickY = ry / maxRadius;

      const isAutoSprint = settings.mobileSprintMode === 'auto_sprint';
      if (isAutoSprint) {
        // 100% Auto-Sprint: triggers when joystick is pushed to maximum edge (>= 96%)
        if (tiltDist >= maxRadius * 0.96) {
          stateRef.current.keysPressed['KeyShift'] = true;
        } else if (!isSprintButtonHeldRef.current) {
          stateRef.current.keysPressed['KeyShift'] = false;
        }
      } else {
        // Button Choice (Manual): Joystick tilt NEVER forces sprint
        if (!isSprintButtonHeldRef.current) {
          stateRef.current.keysPressed['KeyShift'] = false;
        }
      }
    }

    // Throttle visual React state re-renders for joystick knob if touchThrottling is enabled
    if (settings.touchThrottling) {
      const now = performance.now();
      if (!lastTouchMoveTimeRef.current || now - lastTouchMoveTimeRef.current >= 32) {
        lastTouchMoveTimeRef.current = now;
        setStickOffset({ x: rx, y: ry });
      }
    } else {
      setStickOffset({ x: rx, y: ry });
    }
  };

  const handleJoystickEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    setStickOffset({ x: 0, y: 0 });
    setActiveTouchId(null);
    if (stateRef.current) {
      stateRef.current.joystickX = 0;
      stateRef.current.joystickY = 0;
      // Only release sprint if user is not actively holding the SPRINT button
      if (!isSprintButtonHeldRef.current) {
        stateRef.current.keysPressed['KeyShift'] = false;
      }
    }
  };

  const handleButtonPress = (id: string, action: () => void, e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (id === 'block') {
      isBlockButtonHeldRef.current = true;
    }
    setPressedButtons(prev => ({ ...prev, [id]: true }));
    action();
  };

  const handleButtonRelease = (id: string, onRelease?: () => void, e?: React.TouchEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (id === 'block') {
      isBlockButtonHeldRef.current = false;
    }
    setPressedButtons(prev => ({ ...prev, [id]: false }));
    if (onRelease) onRelease();
  };

  return (
    <div 
      ref={containerRef}
      id="mobile-touch-hud" 
      className="absolute inset-0 pointer-events-none z-30 select-none touch-none overflow-hidden"
    >
      {/* Absolute coordinates render for the virtual layouts */}
      {layoutItems.map((item) => {
        const isPressed = pressedButtons[item.id];
        const layout = getResponsiveLayout(item);

        // Determine if M1 or M2 is unavailable
        const isM1 = item.id === 'light';
        const isM2 = item.id === 'heavy';
        const isM1Disabled = isM1 && !canM1;
        const isM2Disabled = isM2 && !canM2;
        const isRedDisabled = isM1Disabled || isM2Disabled;
        
        if (item.id === 'joystick') {
          return (
            <div
              key={item.id}
              className="absolute rounded-full flex items-center justify-center pointer-events-auto select-none touch-none"
              style={{
                left: layout.left,
                top: layout.top,
                width: layout.width,
                height: layout.height,
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(24, 24, 27, 0.45)',
                border: `2.5px solid ${item.color}80`,
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(4px)',
              }}
              onTouchStart={handleJoystickTouch}
              onTouchMove={handleJoystickTouch}
              onTouchEnd={handleJoystickEnd}
              onTouchCancel={handleJoystickEnd}
            >
              {/* Center thumb stick knurl */}
              <div
                className="rounded-full shadow-lg flex items-center justify-center transition-all duration-75 pointer-events-none"
                style={{
                  width: `${layout.radius * 1.0}px`,
                  height: `${layout.radius * 1.0}px`,
                  backgroundColor: item.color,
                  transform: `translate(${stickOffset.x}px, ${stickOffset.y}px)`,
                  boxShadow: `0 0 15px ${item.color}80`,
                }}
              >
                {/* Thumb icon grip notches */}
                <div className="grid grid-cols-2 gap-1 w-3.5 h-3.5 opacity-40">
                  <div className="w-1 h-1 rounded-full bg-white"></div>
                  <div className="w-1 h-1 rounded-full bg-white"></div>
                  <div className="w-1 h-1 rounded-full bg-white"></div>
                  <div className="w-1 h-1 rounded-full bg-white"></div>
                </div>
              </div>
            </div>
          );
        }

        // Display label mapping
        const displayLabel = isM1 ? 'M1' : isM2 ? 'M2' : item.id === 'block' ? 'BLOCK' : item.id === 'dash' ? 'DASH' : item.id === 'sprint' ? 'SPRINT' : item.label;

        // Color computation: turns dark crimson & muted when disabled to prevent deceptive misclicks!
        const isSprintingActive = item.id === 'sprint' && (stateRef.current?.player?.isSprinting || stateRef.current?.keysPressed['KeyShift']);
        const borderColor = isRedDisabled ? '#991b1b' : (isSprintingActive ? '#34d399' : item.color);
        const bgColor = isRedDisabled 
          ? 'rgba(24, 12, 12, 0.85)'
          : (isSprintingActive ? 'rgba(16, 185, 129, 0.45)' : (isPressed ? `${item.color}66` : 'rgba(24, 24, 27, 0.65)'));

        const boxShadow = isRedDisabled 
          ? '0 0 10px rgba(153, 27, 27, 0.4), inset 0 0 8px rgba(0, 0, 0, 0.8)'
          : (isSprintingActive ? `0 0 25px #10b981aa, inset 0 0 12px #10b98160` : (isPressed ? `0 0 25px ${item.color}aa, inset 0 0 12px ${item.color}40` : '0 4px 16px rgba(0, 0, 0, 0.4)'));

        return (
          <button
            key={item.id}
            className={`absolute rounded-full flex flex-col items-center justify-center pointer-events-auto border-2 transition-all active:scale-90 select-none touch-none overflow-hidden ${
              isRedDisabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
            }`}
            style={{
              left: layout.left,
              top: layout.top,
              width: layout.width,
              height: layout.height,
              opacity: isRedDisabled ? Math.min(layout.opacity, 0.7) : layout.opacity,
              transform: 'translate(-50%, -50%)',
              borderColor,
              backgroundColor: bgColor,
              boxShadow,
              backdropFilter: 'blur(3px)',
            }}
            onTouchStart={(e) => {
              lastTouchTimestampRef.current = Date.now();
              if (item.id === 'light') {
                handleButtonPress(item.id, startLightHold, e);
                return;
              }
              if (isRedDisabled) return; // Prevent deceptive touches on locked heavy
              if (item.id === 'heavy') handleButtonPress(item.id, onHeavyAttack, e);
              if (item.id === 'block') handleButtonPress(item.id, onBlockStart, e);
              if (item.id === 'dash') handleButtonPress(item.id, onDash, e);
              if (item.id === 'sprint') handleButtonPress(item.id, handleSprintPress, e);
              if (item.id === 'target_switch' && onTargetSwitch) handleButtonPress(item.id, onTargetSwitch, e);
            }}
            onTouchEnd={(e) => {
              lastTouchTimestampRef.current = Date.now();
              if (item.id === 'light') handleButtonRelease(item.id, stopLightHold, e);
              else if (item.id === 'block') handleButtonRelease(item.id, onBlockEnd, e);
              else if (item.id === 'sprint') handleButtonRelease(item.id, handleSprintRelease, e);
              else handleButtonRelease(item.id, undefined, e);
            }}
            onTouchCancel={(e) => {
              lastTouchTimestampRef.current = Date.now();
              if (item.id === 'light') {
                handleButtonRelease(item.id, stopLightHold, e);
              } else if (item.id === 'block') {
                // Ignore hit-induced cancellation for mobile touch controls:
                // Only remain in block if block is currently active (not guard broken)
                const isBlockActive = !!(
                  isBlockButtonHeldRef.current &&
                  stateRef.current?.player &&
                  (stateRef.current.player.isBlocking || stateRef.current.isBlockInputHeld) &&
                  (stateRef.current.player.armorBreakTime || 0) <= 0
                );
                if (isBlockActive) {
                  e.preventDefault();
                  return;
                }
                handleButtonRelease(item.id, onBlockEnd, e);
              } else if (item.id === 'sprint') {
                handleButtonRelease(item.id, handleSprintRelease, e);
              } else {
                handleButtonRelease(item.id, undefined, e);
              }
            }}
            onMouseDown={(e) => {
              if (Date.now() - lastTouchTimestampRef.current < 600) return; // Prevent double firing on touch devices
              if (item.id === 'light') {
                handleButtonPress(item.id, startLightHold, e);
                return;
              }
              if (isRedDisabled) return;
              if (item.id === 'heavy') handleButtonPress(item.id, onHeavyAttack, e);
              if (item.id === 'block') handleButtonPress(item.id, onBlockStart, e);
              if (item.id === 'dash') handleButtonPress(item.id, onDash, e);
              if (item.id === 'sprint') handleButtonPress(item.id, handleSprintPress, e);
              if (item.id === 'target_switch' && onTargetSwitch) handleButtonPress(item.id, onTargetSwitch, e);
            }}
            onMouseUp={(e) => {
              if (Date.now() - lastTouchTimestampRef.current < 600) return;
              if (item.id === 'light') handleButtonRelease(item.id, stopLightHold, e);
              else if (item.id === 'block') handleButtonRelease(item.id, onBlockEnd, e);
              else if (item.id === 'sprint') handleButtonRelease(item.id, handleSprintRelease, e);
              else handleButtonRelease(item.id, undefined, e);
            }}
            onMouseLeave={(e) => {
              if (Date.now() - lastTouchTimestampRef.current < 600) return;
              if (item.id === 'light') {
                handleButtonRelease(item.id, stopLightHold, e);
              } else if (item.id === 'block') {
                const isBlockActive = !!(
                  isBlockButtonHeldRef.current &&
                  stateRef.current?.player &&
                  (stateRef.current.player.isBlocking || stateRef.current.isBlockInputHeld) &&
                  (stateRef.current.player.armorBreakTime || 0) <= 0
                );
                if (isBlockActive) return;
                handleButtonRelease(item.id, onBlockEnd, e);
              } else if (item.id === 'sprint') {
                handleButtonRelease(item.id, handleSprintRelease, e);
              } else {
                handleButtonRelease(item.id, undefined, e);
              }
            }}
          >
            {/* Circular Sweep Cooldown Indicator for M2 */}
            {isM2 && heavyCD > 0 && (
              <div 
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background: `conic-gradient(from 0deg, rgba(15, 23, 42, 0.8) ${(heavyCD / maxHeavyCD) * 360}deg, transparent ${(heavyCD / maxHeavyCD) * 360}deg)`,
                  zIndex: 2,
                }}
              />
            )}

            {/* Circular Sweep Cooldown Indicator for M1 Posture Recovery */}
            {isM1 && postureCD > 0 && (
              <div 
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background: `conic-gradient(from 0deg, rgba(15, 23, 42, 0.85) ${(postureCD / maxPostureCD) * 360}deg, transparent ${(postureCD / maxPostureCD) * 360}deg)`,
                  zIndex: 2,
                }}
              />
            )}

            {/* Display text inside button */}
            <span 
              className={`font-mono font-black drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.9)] uppercase pointer-events-none select-none tracking-tight leading-none z-10 ${
                isRedDisabled ? 'text-red-200 animate-pulse' : 'text-white'
              }`}
              style={{ fontSize: `${Math.max(10, layout.radius * 0.42)}px` }}
            >
              {isM2 && heavyCD > 0 ? `${(heavyCD / 60).toFixed(1)}s` : (isM1 && postureCD > 0 ? `${(postureCD / 60).toFixed(1)}s` : displayLabel)}
            </span>

            {/* Sub-label for clarity */}
            {isM1 && (
              <span className="text-[7px] font-mono font-bold text-red-300 opacity-80 pointer-events-none leading-none mt-0.5 uppercase z-10">
                {postureCD > 0 ? 'POSTURE' : (isM1Disabled ? 'LOCKED' : 'LIGHT')}
              </span>
            )}
            {isM2 && (
              <span className="text-[7px] font-mono font-bold text-amber-300 opacity-80 pointer-events-none leading-none mt-0.5 uppercase z-10">
                {isM2Disabled ? 'LOCKED' : 'HEAVY'}
              </span>
            )}
            {item.id === 'sprint' && (
              <span className="text-[7px] font-mono font-bold text-emerald-300 opacity-80 pointer-events-none leading-none mt-0.5 uppercase z-10">
                RUN
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

