import { Injectable, inject, signal } from '@angular/core';
import { TauriBridgeService } from './tauri-bridge.service';

export interface UpdateInfo {
  readonly version: string;
  readonly body: string;
}

@Injectable({ providedIn: 'root' })
export class UpdateService {
  private readonly tauri = inject(TauriBridgeService);

  private readonly _available = signal<UpdateInfo | null>(null);
  private readonly _isInstalling = signal(false);

  readonly available = this._available.asReadonly();
  readonly isInstalling = this._isInstalling.asReadonly();

  async checkForUpdate(): Promise<void> {
    try {
      const update = await this.tauri.invoke<UpdateInfo | null>('check_update');
      this._available.set(update);
    } catch {
      // silent — update check is best-effort
    }
  }

  async installUpdate(): Promise<void> {
    this._isInstalling.set(true);
    try {
      await this.tauri.invoke<void>('install_update');
    } catch {
      this._isInstalling.set(false);
    }
  }

  dismiss(): void {
    this._available.set(null);
  }
}
