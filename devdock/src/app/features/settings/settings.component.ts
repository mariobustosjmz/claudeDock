import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SettingsService } from './settings.service';
import { DockStateService } from '../../core/services/dock-state.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="p-4 space-y-5 overflow-y-auto max-h-80">
      <h3 class="text-sm font-semibold text-white/80 uppercase tracking-wider">Settings</h3>

      <!-- Dock Behavior -->
      <section class="space-y-3">
        <h4 class="text-xs font-medium text-white/50 uppercase tracking-wider">Dock Behavior</h4>

        <label class="flex items-center justify-between cursor-pointer">
          <span class="text-sm text-white/80">Auto-hide dock</span>
          <input
            type="checkbox"
            class="w-4 h-4 accent-indigo-500 cursor-pointer"
            [ngModel]="settings().autoHide"
            (ngModelChange)="onAutoHideChange($event)"
          />
        </label>

        @if (settings().autoHide) {
          <div>
            <label class="text-xs text-white/50 mb-1 block">
              Hide delay: {{ settings().autoHideDelay }}ms
            </label>
            <input
              type="range"
              min="500"
              max="5000"
              step="250"
              class="w-full accent-indigo-500"
              [ngModel]="settings().autoHideDelay"
              (ngModelChange)="settingsService.updateSetting('autoHideDelay', $event)"
            />
          </div>
        }
      </section>

      <!-- Startup -->
      <section class="space-y-3">
        <h4 class="text-xs font-medium text-white/50 uppercase tracking-wider">Startup</h4>
        <label class="flex items-center justify-between cursor-pointer">
          <span class="text-sm text-white/80">Launch at login</span>
          <input
            type="checkbox"
            class="w-4 h-4 accent-indigo-500 cursor-pointer"
            [ngModel]="settings().launchAtLogin"
            (ngModelChange)="settingsService.updateSetting('launchAtLogin', $event)"
          />
        </label>
      </section>

      <!-- API Keys -->
      <section class="space-y-3">
        <h4 class="text-xs font-medium text-white/50 uppercase tracking-wider">API Keys</h4>

        @for (provider of apiProviders; track provider.key) {
          <div>
            <label class="text-xs text-white/50 mb-1 block">{{ provider.label }}</label>
            <input
              type="password"
              class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              [placeholder]="provider.placeholder"
              [ngModel]="settings().apiKeys[provider.key] || ''"
              (ngModelChange)="settingsService.updateApiKey(provider.key, $event)"
            />
          </div>
        }
      </section>

      <!-- Version -->
      <p class="text-xs text-white/20 text-center pt-2">DevDock v0.1.0</p>
    </div>
  `,
})
export class SettingsComponent {
  protected readonly settingsService = inject(SettingsService);
  private readonly dockState = inject(DockStateService);

  protected readonly settings = this.settingsService.settings;

  protected readonly apiProviders = [
    { key: 'groq', label: 'Groq API Key', placeholder: 'gsk_...' },
    { key: 'openai', label: 'OpenAI API Key', placeholder: 'sk-...' },
    { key: 'deepgram', label: 'Deepgram API Key', placeholder: 'dg_...' },
  ] as const;

  protected onAutoHideChange(value: boolean): void {
    this.settingsService.updateSetting('autoHide', value);
    this.dockState.updateConfig({ autoHide: value });
  }
}
