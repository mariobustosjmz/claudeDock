import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { PromptService } from '../prompt/prompt.service';
import { VoiceService } from './voice.service';

@Component({
  selector: 'app-voice',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  template: `
    <div class="flex flex-col gap-4 p-3 h-full items-center">
      <h2 class="text-sm font-semibold text-white/90 self-start w-full">Voice Input</h2>

      <!-- Record button -->
      <button
        class="w-20 h-20 rounded-full flex items-center justify-center text-2xl transition-all duration-200 select-none"
        [class]="buttonClass()"
        (click)="toggleRecording()"
        [disabled]="service.state() === 'transcribing'"
      >
        @switch (service.state()) {
          @case ('idle') { 🎤 }
          @case ('recording') { ⏹ }
          @case ('transcribing') { ⏳ }
          @case ('done') { 🎤 }
        }
      </button>

      <p class="text-xs text-white/50">
        @switch (service.state()) {
          @case ('idle') { Tap to start recording }
          @case ('recording') { Recording… tap to stop }
          @case ('transcribing') { Transcribing audio… }
          @case ('done') { Transcription complete }
        }
      </p>

      @if (service.lastError()) {
        <p class="text-xs text-red-400 bg-red-400/10 rounded px-2 py-1 w-full text-center">
          {{ service.lastError() }}
        </p>
      }

      @if (service.hasText()) {
        <div class="w-full flex-1 flex flex-col gap-2 min-h-0">
          <textarea
            class="w-full flex-1 min-h-20 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white resize-none focus:outline-none focus:border-indigo-400/50"
            readonly
            [value]="service.transcription()"
          ></textarea>
          @if (service.duration()) {
            <p class="text-xs text-white/30 text-right">
              {{ service.duration()! | number:'1.1-1' }}s recorded
            </p>
          }
          <div class="flex gap-2">
            <button
              class="flex-1 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              (click)="sendToOptimizer()"
            >
              → Send to Optimizer
            </button>
            <button
              class="px-3 py-1.5 rounded-lg text-xs bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
              (click)="service.clearTranscription()"
            >Clear</button>
          </div>
          @if (sentToOptimizer()) {
            <p class="text-xs text-green-400 bg-green-400/10 rounded px-2 py-1 w-full text-center">
              ✓ Sent to Optimizer! Switch to the Prompt tab to see the result.
            </p>
          }
        </div>
      }
    </div>
  `,
})
export class VoiceComponent {
  readonly service = inject(VoiceService);
  private readonly promptService = inject(PromptService);
  private readonly _sentToOptimizer = signal(false);
  readonly sentToOptimizer = this._sentToOptimizer.asReadonly();

  buttonClass(): string {
    switch (this.service.state()) {
      case 'recording':
        return 'bg-red-600 animate-pulse scale-110 shadow-lg shadow-red-500/40 cursor-pointer';
      case 'transcribing':
        return 'bg-yellow-600/50 cursor-wait opacity-70';
      default:
        return 'bg-white/10 hover:bg-indigo-600/40 hover:scale-105 cursor-pointer';
    }
  }

  async toggleRecording(): Promise<void> {
    const state = this.service.state();
    if (state === 'idle' || state === 'done') {
      await this.service.startRecording();
    } else if (state === 'recording') {
      await this.service.stopAndTranscribe();
    }
  }

  async sendToOptimizer(): Promise<void> {
    const text = this.service.transcription();
    if (!text.trim()) return;
    const result = await this.promptService.optimize({ rawPrompt: text });
    if (result) {
      this._sentToOptimizer.set(true);
      this.service.clearTranscription();
      setTimeout(() => this._sentToOptimizer.set(false), 2000);
    }
  }
}
