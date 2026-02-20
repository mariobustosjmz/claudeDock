import { Injectable, signal, inject, effect } from '@angular/core';
import { ActionButton, ActionType } from '../../core/models/action-button.model';
import { StorageService } from '../../core/services/storage.service';
import { TauriBridgeService } from '../../core/services/tauri-bridge.service';
import { ShortcutService } from '../../core/services/shortcut.service';

const ACTIONS_STORE = 'actions';
const BUTTONS_KEY = 'buttons';

@Injectable({ providedIn: 'root' })
export class ActionsService {
  private readonly storage = inject(StorageService);
  private readonly tauri = inject(TauriBridgeService);
  private readonly shortcuts = inject(ShortcutService);

  readonly buttons = signal<ActionButton[]>([]);

  constructor() {
    this.loadButtons();
    effect(() => {
      const btns = this.buttons();
      this.storage.set(ACTIONS_STORE, BUTTONS_KEY, btns).catch(console.error);
      this.syncShortcuts(btns);
    });
  }

  addButton(btn: ActionButton): void {
    this.buttons.update((list) => [...list, btn]);
  }

  updateButton(id: string, updates: Partial<ActionButton>): void {
    this.buttons.update((list) =>
      list.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    );
  }

  removeButton(id: string): void {
    this.buttons.update((list) => list.filter((b) => b.id !== id));
  }

  async executeAction(btn: ActionButton): Promise<void> {
    if (!btn.enabled) return;

    switch (btn.actionType) {
      case ActionType.SHELL:
        await this.tauri.invoke<string>('execute_shell', { command: btn.payload });
        break;
      case ActionType.APP_LAUNCH:
      case ActionType.URL:
        await this.tauri.invoke('open_url', { url: btn.payload });
        break;
      case ActionType.SCRIPT:
        await this.tauri.invoke<string>('execute_shell', { command: btn.payload });
        break;
    }
  }

  private async loadButtons(): Promise<void> {
    const saved = await this.storage
      .get<ActionButton[]>(ACTIONS_STORE, BUTTONS_KEY)
      .catch(() => null);
    if (saved?.length) {
      this.buttons.set(saved);
    }
  }

  private syncShortcuts(buttons: ActionButton[]): void {
    this.shortcuts.unregisterAll().catch(console.error);
    buttons
      .filter((b) => b.enabled && b.shortcut)
      .forEach((b) => {
        const sc = b.shortcut!;
        const combo = [...sc.modifiers, sc.key].join('+');
        this.shortcuts
          .register(combo, () => this.executeAction(b))
          .catch(console.error);
      });
  }
}
