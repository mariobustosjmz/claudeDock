import { Injectable, signal, inject, effect } from '@angular/core';
import { StorageService } from '../../core/services/storage.service';
import { TauriBridgeService } from '../../core/services/tauri-bridge.service';
import { AppSettings, DEFAULT_SETTINGS } from './models/settings.model';

const SETTINGS_STORE = 'settings';
const SETTINGS_KEY = 'app_settings';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly storage = inject(StorageService);
  private readonly tauri = inject(TauriBridgeService);

  readonly settings = signal<AppSettings>(DEFAULT_SETTINGS);

  constructor() {
    this.loadSettings();
    effect(() => {
      const s = this.settings();
      this.storage.set(SETTINGS_STORE, SETTINGS_KEY, s).catch(console.error);
    });
  }

  updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.settings.update((s) => ({ ...s, [key]: value }));

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
      this.settings.set({ ...DEFAULT_SETTINGS, ...saved });
    }
  }
}
