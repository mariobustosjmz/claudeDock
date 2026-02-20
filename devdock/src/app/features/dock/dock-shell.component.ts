import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { DockStateService } from '../../core/services/dock-state.service';
import { TauriBridgeService } from '../../core/services/tauri-bridge.service';
import { PanelType } from '../../core/models/dock.model';
import { DockButtonComponent } from './components/dock-button.component';
import { DockPanelComponent } from './components/dock-panel.component';

interface DockItem {
  readonly icon: string;
  readonly label: string;
  readonly panel: PanelType;
}

const DOCK_ITEMS: DockItem[] = [
  { icon: '📷', label: 'Screenshot', panel: PanelType.SCREENSHOT },
  { icon: '✨', label: 'Prompt', panel: PanelType.PROMPT },
  { icon: '🎙️', label: 'Voice', panel: PanelType.VOICE },
  { icon: '🤖', label: 'Agents', panel: PanelType.AGENTS },
  { icon: '👁️', label: 'Preview', panel: PanelType.PREVIEW },
  { icon: '⚡', label: 'Actions', panel: PanelType.ACTIONS },
  { icon: '💾', label: 'Snapshots', panel: PanelType.SNAPSHOTS },
  { icon: '⚙️', label: 'Settings', panel: PanelType.SETTINGS },
  { icon: '🎬', label: 'Shorts', panel: PanelType.SHORTS },
  { icon: '👤', label: 'Account', panel: PanelType.AUTH },
];

@Component({
  selector: 'app-dock-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DockButtonComponent, DockPanelComponent],
  template: `
    <div
      class="dock-wrapper fixed"
      [class.invisible]="!dockState.isVisible()"
      [class.auto-hide]="isAutoHiding()"
    >
      <!-- Panel above dock -->
      @if (dockState.activePanel() !== 'NONE') {
        <app-dock-panel [panelType]="dockState.activePanel()" />
      }

      <!-- Main dock strip -->
      <div
        class="dock-strip flex items-center gap-1 px-3 rounded-2xl relative"
        (mousedown)="onDragStart($event)"
        (mouseenter)="onMouseEnter()"
        (mouseleave)="onMouseLeave()"
      >
        <!-- Drag handle -->
        <div
          class="drag-handle w-4 h-4 mr-1 flex items-center justify-center opacity-30 hover:opacity-60 cursor-grab active:cursor-grabbing shrink-0"
          title="Drag to move"
        >
          <svg width="8" height="16" viewBox="0 0 8 16" fill="currentColor">
            <circle cx="2" cy="2" r="1.5"/><circle cx="6" cy="2" r="1.5"/>
            <circle cx="2" cy="6" r="1.5"/><circle cx="6" cy="6" r="1.5"/>
            <circle cx="2" cy="10" r="1.5"/><circle cx="6" cy="10" r="1.5"/>
            <circle cx="2" cy="14" r="1.5"/><circle cx="6" cy="14" r="1.5"/>
          </svg>
        </div>

        @for (item of dockItems; track item.panel) {
          <app-dock-button
            [icon]="item.icon"
            [label]="item.label"
            [panelType]="item.panel"
            [active]="dockState.activePanel() === item.panel"
            (clicked)="onPanelToggle($event)"
          />
        }
      </div>
    </div>
  `,
  styles: [`
    .dock-wrapper {
      position: fixed;
      bottom: 8px;
      left: 50%;
      transform: translateX(-50%);
      width: fit-content;
      z-index: 9999;
      transition: opacity 250ms ease;
    }
    .dock-wrapper.invisible {
      opacity: 0;
      pointer-events: none;
    }
    .dock-wrapper.auto-hide {
      opacity: 0;
      pointer-events: none;
    }
    .dock-strip {
      height: 56px;
      background: rgba(8, 8, 12, 0.72);
      backdrop-filter: blur(24px) saturate(160%);
      -webkit-backdrop-filter: blur(24px) saturate(160%);
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: 0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06);
    }
    .drag-handle {
      color: rgba(255,255,255,0.7);
      cursor: grab;
    }
    .drag-handle:active {
      cursor: grabbing;
    }
  `],
})
export class DockShellComponent implements OnInit, OnDestroy {
  protected readonly dockState = inject(DockStateService);
  private readonly tauri = inject(TauriBridgeService);

  protected readonly dockItems = DOCK_ITEMS;
  protected readonly isAutoHiding = signal(false);

  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private autoHideTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly boundMouseMove = this.onMouseMove.bind(this);
  private readonly boundMouseUp = this.onMouseUp.bind(this);

  ngOnInit(): void {
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  ngOnDestroy(): void {
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
    if (this.autoHideTimer) clearTimeout(this.autoHideTimer);
  }

  protected onPanelToggle(panel: PanelType): void {
    this.dockState.setActivePanel(panel);
  }

  protected onDragStart(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('app-dock-button')) return;

    this.dockState.isDragging.set(true);
    this.dragOffsetX = event.clientX;
    this.dragOffsetY = event.clientY;
    event.preventDefault();
  }

  protected onMouseEnter(): void {
    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }
    this.isAutoHiding.set(false);
  }

  protected onMouseLeave(): void {
    if (!this.dockState.config().autoHide) return;
    const delay = this.dockState.config().autoHideDelay;
    this.autoHideTimer = setTimeout(() => {
      this.isAutoHiding.set(true);
    }, delay);
  }

  private async onMouseMove(event: MouseEvent): Promise<void> {
    if (!this.dockState.isDragging()) return;

    const dx = event.clientX - this.dragOffsetX;
    const dy = event.clientY - this.dragOffsetY;
    this.dragOffsetX = event.clientX;
    this.dragOffsetY = event.clientY;

    const cfg = this.dockState.config();
    const newX = cfg.x + dx;
    const newY = cfg.y + dy;

    this.dockState.updateConfig({ x: newX, y: newY });

    try {
      await this.tauri.invoke('set_dock_position', { x: newX, y: newY });
    } catch {
      // Position update is best-effort during drag
    }
  }

  private onMouseUp(): void {
    if (this.dockState.isDragging()) {
      this.dockState.isDragging.set(false);
    }
  }
}
