import { Injectable, signal, computed, inject } from '@angular/core';
import { TauriBridgeService } from '../../core/services/tauri-bridge.service';
import { PromptService } from '../prompt/prompt.service';
import { CssChange } from './models/preview.model';

@Injectable({ providedIn: 'root' })
export class PreviewService {
  private readonly tauri = inject(TauriBridgeService);
  private readonly promptService = inject(PromptService);

  private readonly _url = signal('');
  private readonly _isOpen = signal(false);
  private readonly _cssChanges = signal<CssChange[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly url = this._url.asReadonly();
  readonly isOpen = this._isOpen.asReadonly();
  readonly cssChanges = this._cssChanges.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly hasChanges = computed(() => this._cssChanges().length > 0);

  async openPreview(url: string): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);
    try {
      await this.tauri.invoke<void>('open_preview_window', { url });
      this._url.set(url);
      this._isOpen.set(true);
    } catch (err) {
      this._error.set(String(err));
    } finally {
      this._isLoading.set(false);
    }
  }

  async closePreview(): Promise<void> {
    try {
      await this.tauri.invoke<void>('close_preview_window');
    } catch (err) {
      this._error.set(String(err));
    }
    this._isOpen.set(false);
    this._url.set('');
    this._cssChanges.set([]);
  }

  async applyCssChange(selector: string, property: string, value: string): Promise<void> {
    this._error.set(null);
    try {
      await this.tauri.invoke<void>('apply_css_change', { selector, property, value });
      const change: CssChange = { selector, property, value, timestamp: Date.now() };
      this._cssChanges.update(changes => [...changes, change]);
    } catch (err) {
      this._error.set(String(err));
    }
  }

  async toggleInspector(enable: boolean): Promise<boolean> {
    try {
      await this.tauri.invoke<void>('inject_inspector', { enable });
      return true;
    } catch {
      return false;
    }
  }

  clearChanges(): void {
    this._cssChanges.set([]);
  }

  addChangesToPrompt(): void {
    const changes = this._cssChanges();
    if (!changes.length) return;
    const url = this._url();
    const lines = changes.map(
      (c) => `Set ${c.selector} { ${c.property}: ${c.value} }`
    );
    const text = `Apply these CSS changes to ${url}:\n${lines.join('\n')}`;
    this.promptService.setPendingInput(text);
  }
}
