import { Injectable, computed, inject, signal } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { StorageService } from '../../core/services/storage.service';
import { CaptureResult, ScreenRegion, ScreenshotEntry } from './models/screenshot.model';

@Injectable({ providedIn: 'root' })
export class ScreenshotService {
  private readonly storage = inject(StorageService);
  private readonly STORE_NAME = 'screenshots';
  private readonly STORE_KEY = 'entries';
  private readonly MAX_ENTRIES = 20;

  private readonly _screenshots = signal<ScreenshotEntry[]>([]);
  private readonly _isCapturing = signal(false);
  private readonly _lastError = signal<string | null>(null);
  private readonly _copied = signal(false);
  private readonly unlisteners: Array<() => void> = [];

  readonly screenshots = this._screenshots.asReadonly();
  readonly isCapturing = this._isCapturing.asReadonly();
  readonly lastError = this._lastError.asReadonly();
  readonly copied = this._copied.asReadonly();
  readonly latestScreenshot = computed(() => this._screenshots()[0] ?? null);

  constructor() {
    this.loadFromStorage();
    this.listenForRegionSelection();
  }

  async openOverlay(): Promise<void> {
    this._lastError.set(null);
    this._isCapturing.set(true);
    try {
      await invoke('open_screenshot_overlay');
    } catch (err) {
      this._isCapturing.set(false);
      this._lastError.set(String(err));
    }
  }

  async copyToClipboard(entry: ScreenshotEntry): Promise<void> {
    try {
      await navigator.clipboard.writeText(`data:image/png;base64,${entry.imageBase64}`);
      this._copied.set(true);
      setTimeout(() => this._copied.set(false), 2000);
    } catch (err) {
      this._lastError.set(String(err));
    }
  }

  deleteEntry(id: string): void {
    this._screenshots.update((list) => list.filter((e) => e.id !== id));
    this.persistToStorage();
  }

  private listenForRegionSelection(): void {
    listen<ScreenRegion>('screenshot-region-selected', async (event) => {
      await this.captureRegion(event.payload);
    }).then(unlisten => this.unlisteners.push(unlisten));

    listen('screenshot-region-cancelled', () => {
      this._isCapturing.set(false);
    }).then(unlisten => this.unlisteners.push(unlisten));
  }

  private async captureRegion(region: ScreenRegion): Promise<void> {
    try {
      const result = await invoke<CaptureResult>('capture_region', {
        x: region.startX,
        y: region.startY,
        width: region.width,
        height: region.height,
      });

      const entry: ScreenshotEntry = {
        id: `ss_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        imageBase64: result.image_base64,
        width: result.width,
        height: result.height,
        x: result.x,
        y: result.y,
        capturedAt: Date.now(),
      };

      this._screenshots.update((list) => [entry, ...list].slice(0, this.MAX_ENTRIES));
      this.persistToStorage();
      await this.copyToClipboard(entry);
    } catch (err) {
      this._lastError.set(String(err));
    } finally {
      this._isCapturing.set(false);
    }
  }

  private async loadFromStorage(): Promise<void> {
    const saved = await this.storage.get<ScreenshotEntry[]>(this.STORE_NAME, this.STORE_KEY);
    if (saved) this._screenshots.set(saved);
  }

  private persistToStorage(): void {
    this.storage.set(this.STORE_NAME, this.STORE_KEY, this._screenshots()).catch(console.error);
  }
}
