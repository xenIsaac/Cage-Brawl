// ============================================================================
// DOJO MODE CONTROLLER (src/modes/dojo.mode.ts)
// Sandbox state, dummy behaviors, zero stakes, instant resets
// ============================================================================

export type DummyBehavior = 'passive' | 'guard' | 'counter' | 'punish';

export interface DojoSandboxConfig {
  dummyBehavior: DummyBehavior;
  infinitePlayerHP: boolean;
  infinitePlayerStamina: boolean;
  infiniteDummyHP: boolean;
  showHitboxes: boolean;
  frameInspectorActive: boolean;
}

export const DEFAULT_DOJO_CONFIG: DojoSandboxConfig = {
  dummyBehavior: 'passive',
  infinitePlayerHP: false,
  infinitePlayerStamina: false,
  infiniteDummyHP: true,
  showHitboxes: false,
  frameInspectorActive: false,
};

export class DojoModeController {
  private config: DojoSandboxConfig;

  constructor(initialConfig: Partial<DojoSandboxConfig> = {}) {
    this.config = { ...DEFAULT_DOJO_CONFIG, ...initialConfig };
  }

  public getConfig(): DojoSandboxConfig {
    return { ...this.config };
  }

  public updateConfig(partial: Partial<DojoSandboxConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  public resetDummy(): { dummyHP: number; dummyPosture: number } {
    return { dummyHP: 100, dummyPosture: 0 };
  }
}
