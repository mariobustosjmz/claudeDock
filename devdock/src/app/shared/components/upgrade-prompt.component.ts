import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { DockStateService } from '../../core/services/dock-state.service';
import { PanelType } from '../../core/models/dock.model';

@Component({
  selector: 'app-upgrade-prompt',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center gap-3 py-4 px-3">
      <span class="text-2xl">🔒</span>
      <p class="text-sm text-white/60 text-center leading-relaxed">
        This feature requires<br><strong class="text-white">DevDock Pro</strong>
      </p>
      <button
        class="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all"
        (click)="goToAccount()"
      >
        Upgrade — $4/mo
      </button>
    </div>
  `,
})
export class UpgradePromptComponent {
  private readonly dockState = inject(DockStateService);

  protected goToAccount(): void {
    this.dockState.setActivePanel(PanelType.AUTH);
  }
}
