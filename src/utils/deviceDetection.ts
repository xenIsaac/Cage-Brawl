/**
 * Comprehensive Device & Browser Detection Engine
 * 
 * Prevents false-positive mobile classifications on desktop/laptop PCs in browsers
 * like Brave, Chrome, Edge, and Firefox.
 * 
 * Root causes of false-positive mobile classification on PC:
 * 1. Brave Shields Farbling / Anti-Fingerprinting: Brave often randomizes or reports
 *    `navigator.maxTouchPoints > 0` (e.g. 1 or 5) or defines `window.ontouchstart` to prevent
 *    hardware fingerprinting.
 * 2. Windows PC Touchscreen Digitizers & Styluses: Modern laptops (Surface, Dell XPS,
 *    Lenovo Yoga, HP Spectre), drawing tablets (Wacom, Huion), and touchscreen monitors
 *    report `navigator.maxTouchPoints > 0` even though the user operates a full PC with
 *    mouse & keyboard.
 * 3. Split-screen, tiled, or iframe window sizes: Desktop windows resized below 1024px
 *    were previously mistaken for mobile devices when combined with touchpoints.
 */

/**
 * Accurately determines if the user is running on an actual mobile device
 * (smartphone or mobile tablet such as Android, iPhone, iPad).
 * 
 * Returns false on PC (Windows, macOS, Linux, ChromeOS PC), even if Brave Shields
 * are active, a touchscreen is present, or the browser window is narrow.
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const navAny = navigator as any;

  // 1. W3C Client Hints Standard: navigator.userAgentData.mobile
  // Supported natively by Chromium-based browsers (Brave, Chrome, Edge, Opera).
  // On desktop PCs, `userAgentData.mobile` is explicitly `false`.
  if (navAny.userAgentData && typeof navAny.userAgentData.mobile === 'boolean') {
    if (navAny.userAgentData.mobile === false) {
      return false; // Guaranteed PC / Desktop by the browser engine
    }
    if (navAny.userAgentData.mobile === true) {
      return true; // Guaranteed Mobile phone/tablet
    }
  }

  const ua = navigator.userAgent || '';

  // 2. Explicit Mobile Device User-Agent Signatures
  const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS|FxiOS/i.test(ua);

  // Explicit Desktop OS Signatures
  const isWindowsPC = /Windows NT/i.test(ua);
  const isMacPC = /Macintosh/i.test(ua);
  const isLinuxPC = /X11; Linux|Linux x86_64|Ubuntu|Fedora/i.test(ua);
  const isCrOS = /CrOS/i.test(ua) && !/Mobile/i.test(ua);

  // iPadOS 13+ detection (reports Macintosh in UA, but has touch and lacks fine pointer)
  const isIPad = (
    isMacPC &&
    typeof navigator.maxTouchPoints === 'number' &&
    navigator.maxTouchPoints > 1 &&
    !(window.matchMedia?.('(pointer: fine)').matches ?? false)
  );

  if (isIPad) {
    return true;
  }

  // If UA indicates a desktop OS and not an explicit mobile UA, it is a PC
  if ((isWindowsPC || isMacPC || isLinuxPC || isCrOS) && !isMobileUA) {
    return false;
  }

  if (isMobileUA) {
    return true;
  }

  // 3. Pointer & Hover Media Queries
  // Desktops almost always have a primary fine pointer (mouse/trackpad cursor) and hover support
  const hasFinePointer = window.matchMedia?.('(pointer: fine)').matches ?? false;
  const canHover = window.matchMedia?.('(hover: hover)').matches ?? false;
  const isCoarseOnly = window.matchMedia?.('(pointer: coarse) and (hover: none)').matches ?? false;

  if (hasFinePointer && canHover) {
    return false; // Desktop PC with mouse/trackpad
  }

  if (isCoarseOnly) {
    return true; // Touchscreen smartphone/tablet
  }

  // 4. Physical Screen Geometry Fallback (not window.innerWidth)
  if (typeof screen !== 'undefined' && screen.width && screen.height) {
    const minPhysicalDim = Math.min(screen.width, screen.height);
    if (minPhysicalDim >= 800 && hasFinePointer) {
      return false;
    }
  }

  return false;
}

/**
 * Returns true if the device is a Desktop or Laptop PC.
 */
export function isPcDevice(): boolean {
  return !isMobileDevice();
}

/**
 * Determines whether virtual on-screen touch controls should be shown in the Arena.
 * 
 * In 'auto' mode:
 * - Mobile devices -> true
 * - PC / Desktop -> false (players use Keyboard & Mouse)
 */
export function shouldShowVirtualControls(
  setting: 'auto' | 'always' | 'never' = 'auto',
  touchControlMode: 'virtual' | 'lockon_swipe' = 'virtual'
): boolean {
  if (touchControlMode !== 'virtual') return false;
  if (setting === 'always') return true;
  if (setting === 'never') return false;
  // 'auto' mode: only active on genuine mobile devices
  return isMobileDevice();
}
