import {
  Component,
  ChangeDetectionStrategy,
  input,
} from '@angular/core';
import { PanelType } from '../../../core/models/dock.model';
import { ActionsComponent } from '../../actions/actions.component';
import { SettingsComponent } from '../../settings/settings.component';

@Component({
  selector: 'app-dock-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ActionsComponent, SettingsComponent],
  template: `
    <div class="dock-panel rounded-2xl overflow-hidden mb-2">
      @switch (panelType()) {
        @case ('ACTIONS') {
          <app-actions />
        }
        @case ('SETTINGS') {
          <app-settings />
        }
        @default {
          <div class="p-4">
            <p class="text-sm text-white/50 text-center">
              {{ panelType() }} — coming in Phase 2
            </p>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .dock-panel {
      background: rgba(8, 8, 14, 0.88);
      backdrop-filter: blur(28px) saturate(180%);
      -webkit-backdrop-filter: blur(28px) saturate(180%);
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: 0 -4px 24px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.3);
      min-width: 320px;
    }
  `],
})
export class DockPanelComponent {
  readonly panelType = input.required<PanelType>();
}
