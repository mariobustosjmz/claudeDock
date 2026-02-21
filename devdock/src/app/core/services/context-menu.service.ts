import { inject, Injectable } from '@angular/core';
import { listen } from '@tauri-apps/api/event';
import { TauriBridgeService } from './tauri-bridge.service';

interface ContextMenuItemDef {
  readonly id: string;
  readonly label: string;
  readonly separator: boolean;
}

@Injectable({ providedIn: 'root' })
export class ContextMenuService {
  private readonly tauri = inject(TauriBridgeService);

  /**
   * Shows the OS native context menu for an action button.
   * Uses Tauri v2 built-in Menu API: popup_menu fires the menu, the selected
   * item id is received via the `context-menu-selected` event.
   */
  async showActionButtonMenu(
    onEdit: () => void,
    onDelete: () => void,
    onMoveUp: () => void,
    onMoveDown: () => void,
  ): Promise<void> {
    const items: ContextMenuItemDef[] = [
      { id: 'edit', label: 'Edit', separator: false },
      { id: 'move_up', label: 'Move Up', separator: false },
      { id: 'move_down', label: 'Move Down', separator: false },
      { id: 'sep', label: '', separator: true },
      { id: 'delete', label: 'Delete', separator: false },
    ];

    const selected = await this.showAndWait(items);

    if (selected === 'ctx_edit') onEdit();
    else if (selected === 'ctx_move_up') onMoveUp();
    else if (selected === 'ctx_move_down') onMoveDown();
    else if (selected === 'ctx_delete') onDelete();
  }

  /**
   * Shows the OS native context menu for a screenshot history item.
   */
  async showScreenshotMenu(
    onCopy: () => void,
    onDelete: () => void,
  ): Promise<void> {
    const items: ContextMenuItemDef[] = [
      { id: 'copy', label: 'Copy to Clipboard', separator: false },
      { id: 'sep', label: '', separator: true },
      { id: 'delete', label: 'Delete', separator: false },
    ];

    const selected = await this.showAndWait(items);

    if (selected === 'ctx_copy') onCopy();
    else if (selected === 'ctx_delete') onDelete();
  }

  /**
   * Invokes the Rust command to show the popup menu, then resolves with
   * the selected item id once the `context-menu-selected` event arrives.
   * Resolves with null if the menu is dismissed without a selection.
   */
  private async showAndWait(items: ContextMenuItemDef[]): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
      let unlisten: (() => void) | null = null;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const cleanup = (): void => {
        if (timer !== null) {
          clearTimeout(timer);
          timer = null;
        }
        if (unlisten) {
          unlisten();
          unlisten = null;
        }
      };

      const DISMISS_TIMEOUT_MS = 30_000;
      timer = setTimeout(() => {
        cleanup();
        resolve(null);
      }, DISMISS_TIMEOUT_MS);

      listen<string>('context-menu-selected', (event) => {
        cleanup();
        resolve(event.payload || null);
      })
        .then((fn) => {
          unlisten = fn;
          return this.tauri.invoke<void>('show_context_menu', { items });
        })
        .catch((err) => {
          cleanup();
          console.error('context menu error:', err);
          resolve(null);
        });
    });
  }
}
