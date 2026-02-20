import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { PreviewService } from './preview.service';

@Component({
  selector: 'app-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="preview-panel p-3 flex flex-col gap-3">
      <div class="text-xs font-semibold text-white/40 uppercase tracking-wider">Preview Window</div>

      <!-- URL Input -->
      <div class="flex gap-2">
        <input
          class="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/25"
          placeholder="https://example.com"
          [value]="urlInput()"
          (input)="onUrlInput($event)"
          (keydown.enter)="openPreview()"
        />
        @if (!preview.isOpen()) {
          <button
            class="px-3 py-2 rounded-lg text-sm font-medium transition-all"
            [class]="preview.isLoading() ? 'bg-white/10 text-white/40 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-500 text-white'"
            [disabled]="preview.isLoading() || !urlInput()"
            (click)="openPreview()"
          >
            {{ preview.isLoading() ? '...' : 'Open' }}
          </button>
        } @else {
          <button
            class="px-3 py-2 rounded-lg text-sm font-medium bg-red-600/80 hover:bg-red-500 text-white transition-all"
            (click)="closePreview()"
          >
            Close
          </button>
        }
      </div>

      <!-- Error -->
      @if (preview.error()) {
        <p class="text-xs text-red-400">{{ preview.error() }}</p>
      }

      <!-- CSS Editor (shown when preview is open) -->
      @if (preview.isOpen()) {
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-white/40">Live CSS</span>
            <button
              class="text-xs text-violet-400 hover:text-violet-300"
              (click)="toggleInspector()"
            >
              {{ inspectorOn() ? 'Hide Inspector' : 'Show Inspector' }}
            </button>
          </div>

          <div class="flex gap-2">
            <input
              class="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/20"
              placeholder="selector (e.g. h1)"
              [value]="cssSelector()"
              (input)="onCssSelectorInput($event)"
            />
          </div>
          <div class="flex gap-2">
            <input
              class="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/20"
              placeholder="property (e.g. color)"
              [value]="cssProperty()"
              (input)="onCssPropertyInput($event)"
            />
            <input
              class="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/20"
              placeholder="value (e.g. red)"
              [value]="cssValue()"
              (input)="onCssValueInput($event)"
            />
            <button
              class="px-2 py-1.5 rounded text-xs font-medium bg-violet-600/80 hover:bg-violet-500 text-white transition-all"
              [disabled]="!cssSelector() || !cssProperty() || !cssValue()"
              (click)="applyChange()"
            >
              Apply
            </button>
          </div>

          <!-- Applied changes -->
          @if (preview.hasChanges()) {
            <div class="flex flex-col gap-1 max-h-24 overflow-y-auto">
              <div class="flex items-center justify-between">
                <span class="text-xs text-white/30">Applied ({{ preview.cssChanges().length }})</span>
                <button class="text-xs text-white/30 hover:text-white/50" (click)="preview.clearChanges()">Clear</button>
              </div>
              @for (change of preview.cssChanges(); track change.timestamp) {
                <div class="text-xs text-white/40 font-mono truncate">
                  {{ change.selector }} → {{ change.property }}: {{ change.value }}
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class PreviewComponent {
  protected readonly preview = inject(PreviewService);
  protected readonly urlInput = signal('');
  protected readonly cssSelector = signal('');
  protected readonly cssProperty = signal('');
  protected readonly cssValue = signal('');
  protected readonly inspectorOn = signal(false);

  protected async openPreview(): Promise<void> {
    const url = this.urlInput().trim();
    if (!url) return;
    await this.preview.openPreview(url);
  }

  protected async closePreview(): Promise<void> {
    await this.preview.closePreview();
    this.inspectorOn.set(false);
  }

  protected async applyChange(): Promise<void> {
    const sel = this.cssSelector().trim();
    const prop = this.cssProperty().trim();
    const val = this.cssValue().trim();
    if (!sel || !prop || !val) return;
    await this.preview.applyCssChange(sel, prop, val);
    this.cssValue.set('');
  }

  protected async toggleInspector(): Promise<void> {
    const next = !this.inspectorOn();
    await this.preview.toggleInspector(next);
    this.inspectorOn.set(next);
  }

  protected onUrlInput(event: Event): void {
    this.urlInput.set((event.target as HTMLInputElement).value);
  }

  protected onCssSelectorInput(event: Event): void {
    this.cssSelector.set((event.target as HTMLInputElement).value);
  }

  protected onCssPropertyInput(event: Event): void {
    this.cssProperty.set((event.target as HTMLInputElement).value);
  }

  protected onCssValueInput(event: Event): void {
    this.cssValue.set((event.target as HTMLInputElement).value);
  }
}
