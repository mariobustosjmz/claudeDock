import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { UpdateService } from '../../core/services/update.service';

@Component({
  selector: 'app-update-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (updateService.available(); as info) {
      <div class="flex items-center gap-2 px-3 py-2 bg-violet-700/80 text-white text-xs rounded-xl mb-2">
        <span class="flex-1">v{{ info.version }} available</span>
        <button
          class="px-2 py-1 rounded bg-white/20 hover:bg-white/30 font-medium transition-all disabled:opacity-50"
          [disabled]="updateService.isInstalling()"
          (click)="install()"
        >
          {{ updateService.isInstalling() ? 'Installing...' : 'Update' }}
        </button>
        <button class="text-white/60 hover:text-white" (click)="updateService.dismiss()">x</button>
      </div>
    }
  `,
})
export class UpdateBannerComponent {
  protected readonly updateService = inject(UpdateService);

  protected async install(): Promise<void> {
    await this.updateService.installUpdate();
  }
}
