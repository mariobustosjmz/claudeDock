import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ScreenshotEntry } from './models/screenshot.model';
import { ScreenshotService } from './screenshot.service';

@Component({
  selector: 'app-screenshot',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-3 p-3 h-full">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-white/90">Screenshot</h2>
        <button
          class="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
          [class]="service.isCapturing()
            ? 'bg-yellow-500/20 text-yellow-300 cursor-wait'
            : 'bg-indigo-600 hover:bg-indigo-500 text-white'"
          (click)="capture()"
          [disabled]="service.isCapturing()"
        >
          @if (service.isCapturing()) { Capturing... } @else { + Capture }
        </button>
      </div>

      @if (service.lastError()) {
        <p class="text-xs text-red-400 bg-red-400/10 rounded px-2 py-1">
          {{ service.lastError() }}
        </p>
      }

      @if (service.copied()) {
        <p class="text-xs text-green-400 bg-green-400/10 rounded px-2 py-1 text-center">
          Copied to clipboard
        </p>
      }

      @if (service.screenshots().length === 0) {
        <div class="flex-1 flex items-center justify-center text-white/30 text-xs text-center">
          No screenshots yet.<br>Click Capture to select a region.
        </div>
      } @else {
        <div class="flex-1 overflow-y-auto space-y-2">
          @for (entry of service.screenshots(); track entry.id) {
            <div class="group relative rounded-lg overflow-hidden border border-white/10 hover:border-indigo-400/40 transition-colors">
              <img
                [src]="'data:image/png;base64,' + entry.imageBase64"
                [alt]="entry.width + 'x' + entry.height"
                class="w-full object-cover max-h-28"
              />
              <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <span class="text-white/50 text-xs">{{ entry.width }}x{{ entry.height }}</span>
                <div class="flex gap-1">
                  <button
                    class="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-0.5 rounded"
                    (click)="copy(entry)"
                  >Copy</button>
                  <button
                    class="text-xs bg-red-600/70 hover:bg-red-500 text-white px-1.5 py-0.5 rounded"
                    (click)="delete(entry.id)"
                  >X</button>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ScreenshotComponent {
  readonly service = inject(ScreenshotService);

  async capture(): Promise<void> {
    await this.service.openOverlay();
  }

  async copy(entry: ScreenshotEntry): Promise<void> {
    await this.service.copyToClipboard(entry);
  }

  delete(id: string): void {
    this.service.deleteEntry(id);
  }
}
