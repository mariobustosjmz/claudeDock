import { Injectable, computed, inject, signal } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { AnalyticsService } from '../../core/services/analytics.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { StorageService } from '../../core/services/storage.service';
import { AnnotationMarker, CaptureResult, ScreenRegion, ScreenshotEntry } from './models/screenshot.model';

@Injectable({ providedIn: 'root' })
export class ScreenshotService {
  private readonly analytics = inject(AnalyticsService);
  private readonly storage = inject(StorageService);
  private readonly permissions = inject(PermissionsService);
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
    const granted = await this.permissions.ensureScreenRecording();
    if (!granted) {
      this._lastError.set('Screen Recording permission required. Please grant it in System Preferences → Privacy & Security.');
      return;
    }
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
      await invoke<void>('copy_image_to_clipboard', { imageBase64: entry.imageBase64 });
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

  addAnnotation(id: string, x: number, y: number): void {
    this._screenshots.update((list) =>
      list.map((e) => {
        if (e.id !== id) return e;
        const existing = e.annotations ?? [];
        const marker: AnnotationMarker = { x, y, label: existing.length + 1 };
        return { ...e, annotations: [...existing, marker] };
      })
    );
    this.persistToStorage();
  }

  clearAnnotations(id: string): void {
    this._screenshots.update((list) =>
      list.map((e) => (e.id === id ? { ...e, annotations: [] } : e))
    );
    this.persistToStorage();
  }

  async copyAnnotated(entry: ScreenshotEntry): Promise<void> {
    if (!entry.annotations?.length) {
      await this.copyToClipboard(entry);
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = entry.width;
    canvas.height = entry.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = `data:image/png;base64,${entry.imageBase64}`;
    await new Promise<void>((res) => { img.onload = () => res(); });
    ctx.drawImage(img, 0, 0);

    for (const marker of entry.annotations) {
      const r = 14;
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#7c3aed';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${r}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(marker.label), marker.x, marker.y);
    }

    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
    if (blob) {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      this._copied.set(true);
      setTimeout(() => this._copied.set(false), 2000);
    }
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
      this.analytics.track('screenshot_taken');
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
