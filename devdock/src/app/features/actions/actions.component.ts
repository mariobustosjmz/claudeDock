import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ActionsService } from './actions.service';
import { ActionsSettingsComponent } from './components/actions-settings.component';
import { ContextMenuService } from '../../core/services/context-menu.service';
import { ActionButton } from '../../core/models/action-button.model';

@Component({
  selector: 'app-actions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ActionsSettingsComponent],
  template: `
    <div class="flex flex-col h-full">
      <!-- Quick-launch grid -->
      @if (actionsService.buttons().length > 0) {
        <div class="p-3 grid grid-cols-4 gap-2 border-b border-white/8">
          @for (btn of actionsService.buttons(); track btn.id) {
            @if (btn.enabled) {
              <button
                class="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition-all active:scale-95"
                [title]="btn.name"
                (click)="actionsService.executeAction(btn)"
                (contextmenu)="onButtonRightClick($event, btn)"
              >
                <span class="text-xl">{{ btn.icon }}</span>
                <span class="text-[10px] text-white/60 truncate w-full text-center">{{ btn.name }}</span>
              </button>
            }
          }
        </div>
      }
      <!-- Settings / CRUD -->
      <app-actions-settings />
    </div>
  `,
})
export class ActionsComponent {
  protected readonly actionsService = inject(ActionsService);
  private readonly contextMenu = inject(ContextMenuService);

  protected onButtonRightClick(event: MouseEvent, btn: ActionButton): void {
    event.preventDefault();
    this.contextMenu
      .showActionButtonMenu(
        () => this.actionsService.startEdit(btn.id),
        () => this.actionsService.removeButton(btn.id),
        () => this.actionsService.moveButtonUp(btn.id),
        () => this.actionsService.moveButtonDown(btn.id),
      )
      .catch(console.error);
  }
}
