import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { PreviewService } from './preview.service';
import { UpgradePromptComponent } from '../../shared/components/upgrade-prompt.component';

const COLOR_PROPERTIES = new Set([
  'color', 'background-color', 'backgroundColor', 'border-color',
  'borderColor', 'outline-color', 'outlineColor', 'text-decoration-color',
]);

const NUMERIC_PROPERTIES = new Set([
  'font-size', 'fontSize', 'padding', 'margin', 'width', 'height',
  'border-radius', 'borderRadius', 'line-height', 'lineHeight',
  'letter-spacing', 'letterSpacing', 'opacity',
]);

@Component({
  selector: 'app-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UpgradePromptComponent],
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
        @if (isPro()) {
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
              @if (isColorProperty()) {
                <input
                  type="color"
                  class="h-7 w-10 rounded cursor-pointer bg-transparent border border-white/20 p-0.5"
                  [value]="cssValue() || '#000000'"
                  (input)="onCssValueInput($event)"
                />
              } @else if (isNumericProperty()) {
                <div class="flex gap-1 items-center flex-1">
                  <input
                    type="range"
                    class="flex-1 accent-violet-500"
                    min="0"
                    max="100"
                    [value]="numericValue()"
                    (input)="onRangeInput($event)"
                  />
                  <span class="text-xs text-white/50 w-10 text-right">{{ cssValue() }}</span>
                </div>
              } @else {
                <input
                  class="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/20"
                  placeholder="value (e.g. red)"
                  [value]="cssValue()"
                  (input)="onCssValueInput($event)"
                />
              }
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
                  <button class="text-xs text-white/30 hover:text-white/50" (click)="clearChanges()">Clear</button>
                </div>
                @for (change of preview.cssChanges(); track change.timestamp) {
                  <div class="text-xs text-white/40 font-mono truncate">
                    {{ change.selector }} → {{ change.property }}: {{ change.value }}
                  </div>
                }
              </div>
              <button
                class="w-full py-1.5 rounded-lg text-xs font-medium bg-emerald-600/70 hover:bg-emerald-500/80 text-white transition-all"
                (click)="addToPrompt()"
              >
                ✦ Add to Prompt
              </button>
            }
          </div>
        } @else {
          <app-upgrade-prompt />
        }
      }
    </div>
  `,
})
export class PreviewComponent {
  protected readonly preview = inject(PreviewService);
  private readonly authService = inject(AuthService);
  protected readonly urlInput = signal('');
  protected readonly cssSelector = signal('');
  protected readonly cssProperty = signal('');
  protected readonly cssValue = signal('');
  protected readonly inspectorOn = signal(false);
  protected readonly isPro = this.authService.isPro;

  protected readonly isColorProperty = computed(() => COLOR_PROPERTIES.has(this.cssProperty()));
  protected readonly isNumericProperty = computed(() => NUMERIC_PROPERTIES.has(this.cssProperty()));
  protected readonly numericValue = computed(() => {
    const v = parseInt(this.cssValue(), 10);
    return isNaN(v) ? 0 : v;
  });

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
    const success = await this.preview.toggleInspector(next);
    if (success) {
      this.inspectorOn.set(next);
    }
  }

  protected clearChanges(): void {
    this.preview.clearChanges();
  }

  protected addToPrompt(): void {
    this.preview.addChangesToPrompt();
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

  protected onRangeInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    const prop = this.cssProperty();
    const unit = prop === 'opacity' ? '' : prop === 'letter-spacing' ? 'em' : 'px';
    this.cssValue.set(`${val}${unit}`);
  }
}
