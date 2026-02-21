import { Injectable, signal, inject, effect, DestroyRef } from '@angular/core';
import { StorageService } from '../../core/services/storage.service';
import { TauriBridgeService } from '../../core/services/tauri-bridge.service';
import { ThemeService } from '../../core/services/theme.service';
import { AppSettings, AppTheme, DEFAULT_SETTINGS } from './models/settings.model';

const SETTINGS_STORE = 'settings';
const SETTINGS_KEY = 'app_settings';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly storage = inject(StorageService);
  private readonly tauri = inject(TauriBridgeService);
  private readonly themeService = inject(ThemeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly settings = signal<AppSettings>(DEFAULT_SETTINGS);

  constructor() {
    this.loadSettings();

    effect(() => {
      const s = this.settings();
      this.storage.set(SETTINGS_STORE, SETTINGS_KEY, s).catch(console.error);
    });

    const removeOsListener = this.themeService.listenForOsChanges(() => {
      if (this.settings().theme === 'system') {
        this.themeService.apply('system');
      }
    });

    this.destroyRef.onDestroy(removeOsListener);
  }

  updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.settings.update((s) => ({ ...s, [key]: value }));

    if (key === 'theme') {
      this.themeService.apply(value as AppTheme);
    }

    if (key === 'launchAtLogin') {
      this.tauri
        .invoke('plugin:autostart|enable', {})
        .catch(console.error);
    }
  }

  updateApiKey(provider: string, key: string): void {
    this.settings.update((s) => ({
      ...s,
      apiKeys: { ...s.apiKeys, [provider]: key },
    }));
  }

  private async loadSettings(): Promise<void> {
    const saved = await this.storage
      .get<AppSettings>(SETTINGS_STORE, SETTINGS_KEY)
      .catch(() => null);
    if (saved) {
      const merged: AppSettings = { ...DEFAULT_SETTINGS, ...saved };
      this.settings.set(merged);
      this.themeService.apply(merged.theme);
    } else {
      this.themeService.apply(DEFAULT_SETTINGS.theme);
    }
  }
}
