import { Injectable, signal, computed, effect, inject } from '@angular/core';
import {
  DockConfig,
  PanelType,
  DEFAULT_DOCK_CONFIG,
} from '../models/dock.model';
import { StorageService } from './storage.service';

const DOCK_STORE = 'dock';
const CONFIG_KEY = 'config';

@Injectable({ providedIn: 'root' })
export class DockStateService {
  private readonly storage = inject(StorageService);

  readonly config = signal<DockConfig>(DEFAULT_DOCK_CONFIG);
  readonly activePanel = signal<PanelType>(PanelType.NONE);
  readonly isVisible = signal<boolean>(true);
  readonly isDragging = signal<boolean>(false);

  constructor() {
    this.loadConfig();
    effect(() => {
      const cfg = this.config();
      this.storage.set(DOCK_STORE, CONFIG_KEY, cfg).catch(console.error);
    });
  }

  setActivePanel(panel: PanelType): void {
    this.activePanel.set(
      this.activePanel() === panel ? PanelType.NONE : panel,
    );
  }

  toggleVisibility(): void {
    this.isVisible.update((v) => !v);
  }

  updateConfig(partial: Partial<DockConfig>): void {
    this.config.update((cfg) => ({ ...cfg, ...partial }));
  }

  private async loadConfig(): Promise<void> {
    const saved = await this.storage.get<DockConfig>(DOCK_STORE, CONFIG_KEY).catch(() => null);
    if (saved) {
      this.config.set({ ...DEFAULT_DOCK_CONFIG, ...saved });
    }
  }
}
