import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ScreenshotEntry } from './models/screenshot.model';
import { ScreenshotService } from './screenshot.service';
import { ContextMenuService } from '../../core/services/context-menu.service';

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
            <div
              class="group relative rounded-lg overflow-hidden border border-white/10 transition-colors cursor-context-menu"
              [class]="annotatingId() === entry.id ? 'border-violet-500/60 cursor-crosshair' : 'hover:border-indigo-400/40'"
              (contextmenu)="onScreenshotRightClick($event, entry)"
            >
              <!-- Image + SVG annotation overlay -->
              <div class="relative" (click)="onImageClick($event, entry)">
                <img
                  [src]="'data:image/png;base64,' + entry.imageBase64"
                  [alt]="entry.width + 'x' + entry.height"
                  class="w-full object-cover max-h-28 block"
                />
                @if (entry.annotations?.length) {
                  <svg class="absolute inset-0 w-full h-full pointer-events-none" [attr.viewBox]="'0 0 ' + entry.width + ' ' + entry.height" preserveAspectRatio="none">
                    @for (m of entry.annotations; track m.label) {
                      <circle [attr.cx]="m.x" [attr.cy]="m.y" r="14" fill="#7c3aed" />
                      <text [attr.x]="m.x" [attr.y]="m.y" text-anchor="middle" dominant-baseline="central" fill="white" font-size="14" font-weight="bold">{{ m.label }}</text>
                    }
                  </svg>
                }
              </div>

              <!-- Actions toolbar -->
              <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-2 py-1.5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <span class="text-white/50 text-xs">{{ entry.width }}x{{ entry.height }}</span>
                <div class="flex gap-1">
                  <button
                    class="text-xs px-2 py-0.5 rounded transition-colors"
                    [class]="annotatingId() === entry.id ? 'bg-violet-700 text-white' : 'bg-violet-600/70 hover:bg-violet-500 text-white'"
                    (click)="toggleAnnotate(entry.id, $event)"
                  >{{ annotatingId() === entry.id ? '✓ Done' : '# Mark' }}</button>
                  @if (entry.annotations?.length) {
                    <button
                      class="text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-0.5 rounded"
                      (click)="copyAnnotated(entry, $event)"
                    >Copy+</button>
                    <button
                      class="text-xs bg-white/10 hover:bg-white/20 text-white/50 px-1.5 py-0.5 rounded"
                      (click)="clearAnnotations(entry.id, $event)"
                    >✕#</button>
                  }
                  <button
                    class="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-0.5 rounded"
                    (click)="copy(entry, $event)"
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
  protected readonly service = inject(ScreenshotService);
  private readonly contextMenu = inject(ContextMenuService);
  protected readonly annotatingId = signal<string | null>(null);

  async capture(): Promise<void> {
    await this.service.openOverlay();
  }

  async copy(entry: ScreenshotEntry, event?: Event): Promise<void> {
    event?.stopPropagation();
    await this.service.copyToClipboard(entry);
  }

  async copyAnnotated(entry: ScreenshotEntry, event?: Event): Promise<void> {
    event?.stopPropagation();
    await this.service.copyAnnotated(entry);
  }

  delete(id: string): void {
    if (this.annotatingId() === id) this.annotatingId.set(null);
    this.service.deleteEntry(id);
  }

  toggleAnnotate(id: string, event: Event): void {
    event.stopPropagation();
    this.annotatingId.update((cur) => (cur === id ? null : id));
  }

  clearAnnotations(id: string, event: Event): void {
    event.stopPropagation();
    this.service.clearAnnotations(id);
  }

  onImageClick(event: MouseEvent, entry: ScreenshotEntry): void {
    if (this.annotatingId() !== entry.id) return;
    const img = (event.currentTarget as HTMLElement).querySelector('img');
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const relX = ((event.clientX - rect.left) / rect.width) * entry.width;
    const relY = ((event.clientY - rect.top) / rect.height) * entry.height;
    this.service.addAnnotation(entry.id, Math.round(relX), Math.round(relY));
  }

  protected onScreenshotRightClick(event: MouseEvent, entry: ScreenshotEntry): void {
    event.preventDefault();
    this.contextMenu
      .showScreenshotMenu(
        () => this.copy(entry).catch(console.error),
        () => this.delete(entry.id),
      )
      .catch(console.error);
  }
}
