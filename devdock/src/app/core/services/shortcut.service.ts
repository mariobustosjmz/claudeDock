import { Injectable } from '@angular/core';
import {
  register,
  unregister,
  unregisterAll,
  ShortcutHandler,
} from '@tauri-apps/plugin-global-shortcut';
import { AppError } from '../models/app-error.model';

@Injectable({ providedIn: 'root' })
export class ShortcutService {
  async register(shortcut: string, handler: ShortcutHandler): Promise<void> {
    try {
      await register(shortcut, handler);
    } catch (err) {
      throw new AppError(
        `Failed to register shortcut "${shortcut}"`,
        'SHORTCUT_REGISTER_ERROR',
        err,
      );
    }
  }

  async unregister(shortcut: string): Promise<void> {
    try {
      await unregister(shortcut);
    } catch (err) {
      throw new AppError(
        `Failed to unregister shortcut "${shortcut}"`,
        'SHORTCUT_UNREGISTER_ERROR',
        err,
      );
    }
  }

  async unregisterAll(): Promise<void> {
    try {
      await unregisterAll();
    } catch (err) {
      throw new AppError('Failed to unregister all shortcuts', 'SHORTCUT_UNREGISTER_ALL_ERROR', err);
    }
  }
}
