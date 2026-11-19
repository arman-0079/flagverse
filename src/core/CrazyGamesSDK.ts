import { AudioManager } from './AudioManager';

export type CrazyGamesEnvironment = 'crazygames' | 'local' | 'disabled';
export type CrazyGamesAdType = 'midgame' | 'rewarded';

export interface CrazyGamesUser {
  username: string;
  profilePictureUrl?: string;
}

export interface CrazyGamesGameSettings {
  disableChat?: boolean;
  muteAudio?: boolean;
  useTestAds?: boolean;
}

export interface CrazyGamesAdCallbacks {
  adStarted?: () => void;
  adFinished?: () => void;
  adError?: (error: unknown, errorData?: unknown) => void;
}

export interface CrazyGamesSDKv3 {
  environment?: CrazyGamesEnvironment;
  init?: () => Promise<void>;
  game?: {
    gameplayStart?: () => void;
    gameplayStop?: () => void;
    happytime?: () => void;
    loadingStart?: () => void;
    loadingStop?: () => void;
    settings?: CrazyGamesGameSettings;
    addSettingsChangeListener?: (listener: (settings: CrazyGamesGameSettings) => void) => void;
    removeSettingsChangeListener?: (listener: (settings: CrazyGamesGameSettings) => void) => void;
  };
  ad?: {
    requestAd?: (type: CrazyGamesAdType, callbacks: CrazyGamesAdCallbacks) => void;
    hasAdblock?: () => Promise<boolean>;
  };
  data?: {
    getItem?: (key: string) => string | null;
    setItem?: (key: string, value: string) => void;
    removeItem?: (key: string) => void;
    clear?: () => void;
  };
  user?: {
    isUserAccountAvailable?: boolean | (() => Promise<boolean>);
    getUser?: () => Promise<CrazyGamesUser | null>;
    showAuthPrompt?: () => Promise<CrazyGamesUser | null>;
    addAuthListener?: (listener: (user: CrazyGamesUser | null) => void) => void;
    removeAuthListener?: (listener: (user: CrazyGamesUser | null) => void) => void;
  };
}

interface CrazyGamesGlobal {
  SDK?: CrazyGamesSDKv3;
}

export interface AdHookOptions {
  onPause?: () => void;
  onResume?: () => void;
}

export interface AudioMuteAdapter {
  setExternalMute: (muted: boolean) => void;
}

export class CrazyGamesBridge {
  private initPromise: Promise<boolean> | null = null;
  private initialized = false;
  private gameplayActive = false;
  private loadingActive = false;
  private adActive = false;
  private portalMuted = false;
  private settingsListenerAttached = false;
  private readonly getSdkImpl: () => CrazyGamesSDKv3 | undefined;
  private readonly audio: AudioMuteAdapter;

  constructor(
    getSdkImpl?: () => CrazyGamesSDKv3 | undefined,
    audio: AudioMuteAdapter = AudioManager
  ) {
    this.getSdkImpl =
      getSdkImpl ||
      (() => {
        if (typeof window === 'undefined') return undefined;
        return (window as unknown as { CrazyGames?: CrazyGamesGlobal }).CrazyGames?.SDK;
      });
    this.audio = audio;
  }

  private get sdk(): CrazyGamesSDKv3 | undefined {
    return this.getSdkImpl();
  }

  private syncExternalMute(): void {
    this.audio.setExternalMute(this.portalMuted || this.adActive);
  }

  public getEnvironment(): CrazyGamesEnvironment {
    const env = this.sdk?.environment;
    if (env === 'crazygames' || env === 'local' || env === 'disabled') {
      return env;
    }
    return 'disabled';
  }

  public isSdkActive(): boolean {
    const env = this.getEnvironment();
    return this.initialized && (env === 'crazygames' || env === 'local');
  }

  public async init(): Promise<boolean> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const sdk = this.sdk;
      if (!sdk?.init) {
        this.initialized = false;
        return false;
      }
      try {
        await sdk.init();
        this.initialized = true;

        // Sync initial CrazyGames portal mute setting & listen for runtime updates
        if (typeof sdk.game?.settings?.muteAudio === 'boolean') {
          this.portalMuted = sdk.game.settings.muteAudio;
          this.syncExternalMute();
        }
        if (!this.settingsListenerAttached && sdk.game?.addSettingsChangeListener) {
          this.settingsListenerAttached = true;
          sdk.game.addSettingsChangeListener((nextSettings) => {
            if (typeof nextSettings?.muteAudio === 'boolean') {
              this.portalMuted = nextSettings.muteAudio;
              this.syncExternalMute();
            }
          });
        }

        // Flush gameplayStart if a mode already mounted before SDK init finished
        if (this.isSdkActive() && this.gameplayActive) {
          try {
            sdk.game?.gameplayStart?.();
          } catch {
            // No-op
          }
        }
        return this.isSdkActive();
      } catch {
        this.initialized = false;
        return false;
      }
    })();

    return this.initPromise;
  }

  public loadingStart(): void {
    if (this.loadingActive) return;
    this.loadingActive = true;
    if (!this.isSdkActive()) return;
    try {
      this.sdk?.game?.loadingStart?.();
    } catch {
      // Standalone / offline safe no-op
    }
  }

  public loadingStop(): void {
    if (!this.loadingActive) return;
    this.loadingActive = false;
    if (!this.isSdkActive()) return;
    try {
      this.sdk?.game?.loadingStop?.();
    } catch {
      // Standalone / offline safe no-op
    }
  }

  public gameplayStart(): void {
    if (this.gameplayActive) return;
    this.gameplayActive = true;
    if (!this.isSdkActive()) return;
    try {
      this.sdk?.game?.gameplayStart?.();
    } catch {
      // No-op
    }
  }

  public gameplayStop(): void {
    if (!this.gameplayActive) return;
    this.gameplayActive = false;
    if (!this.isSdkActive()) return;
    try {
      this.sdk?.game?.gameplayStop?.();
    } catch {
      // No-op
    }
  }

  public happytime(): void {
    if (!this.isSdkActive()) return;
    try {
      this.sdk?.game?.happytime?.();
    } catch {
      // No-op
    }
  }

  public requestMidgameAd(options?: AdHookOptions): Promise<boolean> {
    return this.requestAdInternal('midgame', options);
  }

  public requestRewardedAd(options?: AdHookOptions): Promise<boolean> {
    return this.requestAdInternal('rewarded', options);
  }

  private requestAdInternal(type: CrazyGamesAdType, options?: AdHookOptions): Promise<boolean> {
    const sdk = this.sdk;
    if (!this.isSdkActive() || !sdk?.ad?.requestAd) {
      return Promise.resolve(false);
    }

    return new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (rewardedOrShown: boolean) => {
        if (settled) return;
        settled = true;
        this.adActive = false;
        this.syncExternalMute();
        options?.onResume?.();
        resolve(rewardedOrShown);
      };

      try {
        sdk.ad!.requestAd!(type, {
          adStarted: () => {
            this.adActive = true;
            this.syncExternalMute();
            options?.onPause?.();
          },
          adFinished: () => {
            finish(true);
          },
          adError: () => {
            finish(false);
          },
        });
      } catch {
        finish(false);
      }
    });
  }

  public dataGetItem(key: string): string | null {
    if (!this.isSdkActive() || !this.sdk?.data?.getItem) return null;
    try {
      return this.sdk.data.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  public dataSetItem(key: string, value: string): boolean {
    if (!this.isSdkActive() || !this.sdk?.data?.setItem) return false;
    try {
      this.sdk.data.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  public dataRemoveItem(key: string): boolean {
    if (!this.isSdkActive() || !this.sdk?.data?.removeItem) return false;
    try {
      this.sdk.data.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  public async isUserAccountAvailable(): Promise<boolean> {
    if (!this.isSdkActive() || !this.sdk?.user) return false;
    try {
      const avail = this.sdk.user.isUserAccountAvailable;
      if (typeof avail === 'function') {
        return Boolean(await avail());
      }
      return Boolean(avail);
    } catch {
      return false;
    }
  }

  public async getUser(): Promise<CrazyGamesUser | null> {
    if (!(await this.isUserAccountAvailable()) || !this.sdk?.user?.getUser) {
      return null;
    }
    try {
      return (await this.sdk.user.getUser()) ?? null;
    } catch {
      return null;
    }
  }

  public addAuthListener(listener: (user: CrazyGamesUser | null) => void): () => void {
    if (!this.isSdkActive() || !this.sdk?.user?.addAuthListener) {
      return () => {};
    }
    try {
      this.sdk.user.addAuthListener(listener);
      return () => {
        try {
          this.sdk?.user?.removeAuthListener?.(listener);
        } catch {
          // No-op
        }
      };
    } catch {
      return () => {};
    }
  }
}

export function createCrazyGamesBridge(
  getSdkImpl: () => CrazyGamesSDKv3 | undefined,
  audio: AudioMuteAdapter
): CrazyGamesBridge {
  return new CrazyGamesBridge(getSdkImpl, audio);
}

export const CrazyGamesSDK = new CrazyGamesBridge();
