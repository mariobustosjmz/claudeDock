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

    if (selected === 'edit') onEdit();
    else if (selected === 'move_up') onMoveUp();
    else if (selected === 'move_down') onMoveDown();
    else if (selected === 'delete') onDelete();
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

    if (selected === 'copy') onCopy();
    else if (selected === 'delete') onDelete();
  }

  /**
   * Invokes the Rust command to show the popup menu, then resolves with
   * the selected item id once the `context-menu-selected` event arrives.
   * Resolves with null if the menu is dismissed without a selection.
   */
  private async showAndWait(items: ContextMenuItemDef[]): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
      let unlisten: (() => void) | null = null;

      const cleanup = (): void => {
        if (unlisten) {
          unlisten();
          unlisten = null;
        }
      };

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
