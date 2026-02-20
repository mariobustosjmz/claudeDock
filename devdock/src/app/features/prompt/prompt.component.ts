import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StructuredPrompt } from './models/prompt.model';
import { PromptService } from './prompt.service';

@Component({
  selector: 'app-prompt',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-3 p-3 h-full">
      <h2 class="text-sm font-semibold text-white/90">Prompt Optimizer</h2>

      <textarea
        class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 resize-none focus:outline-none focus:border-indigo-400/50 transition-colors"
        rows="3"
        placeholder="Type your rough prompt… e.g. fix the sidebar overflow"
        [(ngModel)]="rawPrompt"
        (keydown.control.enter)="optimize()"
      ></textarea>

      <div class="flex items-center gap-2">
        <button
          class="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
          [class]="service.isOptimizing()
            ? 'bg-white/10 text-white/40 cursor-wait'
            : rawPrompt().trim()
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
              : 'bg-white/5 text-white/30 cursor-not-allowed'"
          (click)="optimize()"
          [disabled]="service.isOptimizing() || !rawPrompt().trim()"
        >
          @if (service.isOptimizing()) { Optimizing... } @else { Optimize }
        </button>
        @if (service.hasResult()) {
          <button
            class="px-3 py-1.5 rounded-lg text-xs bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
            (click)="clear()"
          >Clear</button>
        }
      </div>

      @if (service.lastError()) {
        <p class="text-xs text-red-400 bg-red-400/10 rounded px-2 py-1">
          {{ service.lastError() }}
        </p>
      }

      @if (service.currentResult(); as result) {
        <div class="flex-1 overflow-y-auto space-y-2">
          @if (service.responseTime()) {
            <p class="text-xs text-white/30 text-right">{{ service.responseTime() }}ms</p>
          }
          @for (field of toFields(result); track field.label) {
            <div class="bg-white/5 rounded-lg p-2 border border-white/10">
              <p class="text-xs text-indigo-400 font-medium mb-0.5">{{ field.label }}</p>
              <p class="text-xs text-white/80 leading-relaxed">{{ field.value }}</p>
            </div>
          }
          <button
            class="w-full py-1.5 rounded-lg text-xs font-medium bg-green-600/80 hover:bg-green-500 text-white transition-colors"
            (click)="copyResult(result)"
          >
            Copy Full Prompt
          </button>
        </div>
      }
    </div>
  `,
})
export class PromptComponent {
  readonly service = inject(PromptService);
  readonly rawPrompt = signal('');

  async optimize(): Promise<void> {
    const raw = this.rawPrompt().trim();
    if (!raw || this.service.isOptimizing()) return;
    await this.service.optimize({ rawPrompt: raw });
  }

  clear(): void {
    this.service.clearResult();
    this.rawPrompt.set('');
  }

  async copyResult(result: StructuredPrompt): Promise<void> {
    const text = `**Context:** ${result.context}\n**File:** ${result.file}\n**Action:** ${result.action}\n**Expected:** ${result.expected}`;
    await navigator.clipboard.writeText(text);
  }

  toFields(result: StructuredPrompt): Array<{ label: string; value: string }> {
    return [
      { label: 'Context', value: result.context },
      { label: 'File', value: result.file },
      { label: 'Action', value: result.action },
      { label: 'Expected', value: result.expected },
    ];
  }
}
