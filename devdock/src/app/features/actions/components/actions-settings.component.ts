import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActionsService } from '../actions.service';
import { ActionButton, ActionType } from '../../../core/models/action-button.model';

function generateId(): string {
  return `btn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

@Component({
  selector: 'app-actions-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="p-4 space-y-4">
      <h3 class="text-sm font-semibold text-white/80 uppercase tracking-wider">Custom Actions</h3>

      <!-- Existing buttons -->
      <div class="space-y-2">
        @for (btn of actionsService.buttons(); track btn.id) {
          <div class="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/8">
            <span class="text-lg">{{ btn.icon }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-white/90 truncate">{{ btn.name }}</p>
              <p class="text-xs text-white/40 truncate">{{ btn.payload }}</p>
            </div>
            <button
              class="text-xs px-2 py-1 rounded bg-white/10 hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-colors"
              (click)="actionsService.removeButton(btn.id)"
            >✕</button>
          </div>
        }
        @if (actionsService.buttons().length === 0) {
          <p class="text-xs text-white/40 text-center py-2">No actions yet. Add one below.</p>
        }
      </div>

      <!-- Add new button form -->
      @if (showForm()) {
        <div class="space-y-3 p-3 rounded-xl bg-white/5 border border-white/10">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-xs text-white/50 mb-1 block">Icon (emoji)</label>
              <input
                class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                type="text"
                placeholder="⚡"
                [(ngModel)]="newIcon"
              />
            </div>
            <div>
              <label class="text-xs text-white/50 mb-1 block">Name</label>
              <input
                class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                type="text"
                placeholder="Open Terminal"
                [(ngModel)]="newName"
              />
            </div>
          </div>
          <div>
            <label class="text-xs text-white/50 mb-1 block">Type</label>
            <select
              class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              [(ngModel)]="newType"
            >
              <option value="SHELL">Shell command</option>
              <option value="URL">Open URL / App</option>
              <option value="SCRIPT">Script</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-white/50 mb-1 block">Command / URL</label>
            <input
              class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              type="text"
              placeholder="open -a Terminal"
              [(ngModel)]="newPayload"
            />
          </div>
          <div class="flex gap-2">
            <button
              class="flex-1 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium transition-colors"
              (click)="addButton()"
            >Add Action</button>
            <button
              class="py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white/70 text-sm transition-colors"
              (click)="showForm.set(false)"
            >Cancel</button>
          </div>
        </div>
      } @else {
        <button
          class="w-full py-2 rounded-lg border border-dashed border-white/20 text-white/40 hover:text-white/70 hover:border-white/40 text-sm transition-colors"
          (click)="showForm.set(true)"
        >+ Add Action</button>
      }
    </div>
  `,
})
export class ActionsSettingsComponent {
  protected readonly actionsService = inject(ActionsService);

  protected readonly showForm = signal(false);
  protected newIcon = '⚡';
  protected newName = '';
  protected newType: ActionType = ActionType.SHELL;
  protected newPayload = '';

  protected addButton(): void {
    if (!this.newName.trim() || !this.newPayload.trim()) return;

    const btn: ActionButton = {
      id: generateId(),
      name: this.newName.trim(),
      icon: this.newIcon || '⚡',
      actionType: this.newType,
      payload: this.newPayload.trim(),
      enabled: true,
    };

    this.actionsService.addButton(btn);
    this.resetForm();
  }

  private resetForm(): void {
    this.newIcon = '⚡';
    this.newName = '';
    this.newPayload = '';
    this.newType = ActionType.SHELL;
    this.showForm.set(false);
  }
}
