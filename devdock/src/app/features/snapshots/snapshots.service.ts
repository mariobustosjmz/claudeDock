import { Injectable, signal, computed, inject } from '@angular/core';
import { TauriBridgeService } from '../../core/services/tauri-bridge.service';
import { StorageService } from '../../core/services/storage.service';
import { WindowInfo, WorkspaceSnapshot } from './models/snapshot.model';

const STORE_NAME = 'snapshots';
const STORE_KEY = 'workspace-snapshots';

@Injectable({ providedIn: 'root' })
export class SnapshotsService {
  private readonly tauri = inject(TauriBridgeService);
  private readonly storage = inject(StorageService);

  private readonly _snapshots = signal<WorkspaceSnapshot[]>([]);
  private readonly _isCapturing = signal(false);
  private readonly _isRestoring = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly snapshots = this._snapshots.asReadonly();
  readonly isCapturing = this._isCapturing.asReadonly();
  readonly isRestoring = this._isRestoring.asReadonly();
  readonly error = this._error.asReadonly();
  readonly count = computed(() => this._snapshots().length);

  async loadSnapshots(): Promise<void> {
    try {
      const saved = await this.storage.get<WorkspaceSnapshot[]>(STORE_NAME, STORE_KEY);
      if (saved) {
        this._snapshots.set(saved);
      }
    } catch (err) {
      this._error.set(String(err));
    }
  }

  async captureSnapshot(name: string): Promise<void> {
    if (!name.trim()) return;
    this._isCapturing.set(true);
    this._error.set(null);
    try {
      const windows = await this.tauri.invoke<WindowInfo[]>('get_open_windows');
      const snapshot = await this.tauri.invoke<WorkspaceSnapshot>('save_snapshot', {
        name: name.trim(),
        windows,
      });
      this._snapshots.update(list => [snapshot, ...list].slice(0, 20));
      await this.persist();
    } catch (err) {
      this._error.set(String(err));
    } finally {
      this._isCapturing.set(false);
    }
  }

  async restoreSnapshot(snapshot: WorkspaceSnapshot): Promise<void> {
    this._isRestoring.set(true);
    this._error.set(null);
    try {
      await this.tauri.invoke<void>('restore_snapshot', { snapshot });
    } catch (err) {
      this._error.set(String(err));
    } finally {
      this._isRestoring.set(false);
    }
  }

  async deleteSnapshot(id: string): Promise<void> {
    this._snapshots.update(list => list.filter(s => s.id !== id));
    try {
      await this.persist();
    } catch (err) {
      this._error.set(String(err));
    }
  }

  private async persist(): Promise<void> {
    try {
      await this.storage.set(STORE_NAME, STORE_KEY, this._snapshots());
    } catch {
    }
  }
}
