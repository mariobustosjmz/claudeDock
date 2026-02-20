import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  signal,
} from '@angular/core';
import { emit } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

@Component({
  selector: 'app-screenshot-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host {
      display: block;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
    }
  `],
  template: `
    <div
      class="fixed inset-0 cursor-crosshair select-none"
      style="background: rgba(0,0,0,0.05); z-index: 9999;"
      (mousedown)="onMouseDown($event)"
      (mousemove)="onMouseMove($event)"
      (mouseup)="onMouseUp($event)"
    >
      @if (isDragging()) {
        <div
          class="absolute border-2 border-blue-400 bg-blue-400/10 pointer-events-none"
          [style.left.px]="rect().left"
          [style.top.px]="rect().top"
          [style.width.px]="rect().width"
          [style.height.px]="rect().height"
        ></div>
        <div
          class="absolute text-white text-xs bg-black/70 px-2 py-0.5 rounded pointer-events-none"
          [style.left.px]="rect().left + 4"
          [style.top.px]="rect().top + 4"
        >
          {{ rect().width }}×{{ rect().height }}
        </div>
      }
      <div class="absolute top-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/60 px-4 py-1.5 rounded-full pointer-events-none whitespace-nowrap">
        Drag to select region · ESC to cancel
      </div>
    </div>
  `,
})
export class ScreenshotOverlayComponent implements OnInit, OnDestroy {
  private startX = 0;
  private startY = 0;
  private endX = 0;
  private endY = 0;
  private dragging = false;

  readonly isDragging = signal(false);
  readonly rect = computed(() => {
    const left = Math.min(this.startX, this.endX);
    const top = Math.min(this.startY, this.endY);
    const width = Math.abs(this.endX - this.startX);
    const height = Math.abs(this.endY - this.startY);
    return { left, top, width, height };
  });

  private escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.onEscape();
  };

  ngOnInit(): void {
    window.addEventListener('keydown', this.escHandler);
  }

  ngOnDestroy(): void {
    window.removeEventListener('keydown', this.escHandler);
  }

  onMouseDown(e: MouseEvent): void {
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.endX = e.clientX;
    this.endY = e.clientY;
    this.dragging = true;
    this.isDragging.set(true);
  }

  onMouseMove(e: MouseEvent): void {
    if (!this.dragging) return;
    this.endX = e.clientX;
    this.endY = e.clientY;
    // Force computed signal re-evaluation since endX/endY are plain properties
    this.isDragging.set(true);
  }

  async onMouseUp(e: MouseEvent): Promise<void> {
    if (!this.dragging) return;
    this.dragging = false;
    this.endX = e.clientX;
    this.endY = e.clientY;

    const r = this.rect();
    if (r.width < 10 || r.height < 10) {
      await this.closeOverlay();
      return;
    }

    await emit('screenshot-region-selected', {
      startX: r.left,
      startY: r.top,
      width: r.width,
      height: r.height,
    });
    await this.closeOverlay();
  }

  async onEscape(): Promise<void> {
    await emit('screenshot-region-cancelled', {});
    await this.closeOverlay();
  }

  private async closeOverlay(): Promise<void> {
    this.isDragging.set(false);
    const win = getCurrentWebviewWindow();
    await win.close();
  }
}
