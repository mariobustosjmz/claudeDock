import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
} from '@angular/core';
import { ShortsService } from './shorts.service';
import { ShortCategory } from './models/short.model';
import { CategoryFilter } from './models/category-filter.model';

const CATEGORIES: readonly CategoryFilter[] = [
  { label: 'All', value: null },
  { label: 'Prompts', value: 'prompt-engineering' },
  { label: 'Agents', value: 'agent-usage' },
  { label: 'Shortcuts', value: 'shortcuts' },
  { label: 'Debug', value: 'debugging' },
];

@Component({
  selector: 'app-shorts',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shorts-panel p-3 flex flex-col gap-3">
      <div class="flex items-center gap-2">
        <span class="text-xs font-semibold text-white/40 uppercase tracking-wider">Learn · AI Coding Tips</span>
        @if (agentActivityBadge()) {
          <button
            class="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-violet-600/80 text-white animate-pulse"
            (click)="dismissBadge()"
          >
            ⚡ Agent active
          </button>
        }
      </div>

      <div class="flex gap-1.5 flex-wrap">
        @for (cat of categories; track cat.label) {
          <button
            class="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
            [class]="filterCategory() === cat.value
              ? 'bg-violet-600 text-white'
              : 'bg-white/8 text-white/50 hover:bg-white/12 hover:text-white/80'"
            (click)="setFilter(cat.value)"
          >
            {{ cat.label }}
          </button>
        }
      </div>

      @if (currentShort(); as short) {
        <div class="flex flex-col gap-2 p-3 rounded-xl bg-white/5 border border-white/8">
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-white leading-snug">{{ short.title }}</p>
              <p class="text-xs text-white/50 mt-0.5 leading-relaxed">{{ short.description }}</p>
            </div>
            <span class="text-xs text-white/30 shrink-0">{{ formattedDuration() }}</span>
          </div>

          <div class="flex items-center gap-1.5 flex-wrap">
            @for (tag of short.tags; track tag) {
              <span class="px-1.5 py-0.5 rounded text-xs bg-white/8 text-white/40">{{ tag }}</span>
            }
          </div>

          <a
            [href]="short.url"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-violet-600/80 hover:bg-violet-500 text-white text-sm font-medium transition-all"
          >
            ▶ Watch Short
          </a>
        </div>
      } @else {
        <p class="text-xs text-white/30 text-center py-4">No tips in this category</p>
      }

      <div class="flex items-center justify-between">
        <button
          class="px-3 py-1.5 rounded-lg text-xs bg-white/8 hover:bg-white/12 text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          [disabled]="currentIndex() === 0"
          (click)="prev()"
        >
          ← Prev
        </button>
        <span class="text-xs text-white/30">
          {{ currentIndex() + 1 }} / {{ totalCount() }}
        </span>
        <button
          class="px-3 py-1.5 rounded-lg text-xs bg-white/8 hover:bg-white/12 text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          [disabled]="currentIndex() === totalCount() - 1"
          (click)="next()"
        >
          Next →
        </button>
      </div>
    </div>
  `,
})
export class ShortsComponent {
  private readonly shortsService = inject(ShortsService);
  protected readonly categories = CATEGORIES;

  protected readonly filterCategory = this.shortsService.filterCategory;
  protected readonly currentShort = this.shortsService.currentShort;
  protected readonly currentIndex = this.shortsService.currentIndex;
  protected readonly totalCount = this.shortsService.totalCount;
  protected readonly agentActivityBadge = this.shortsService.agentActivityBadge;

  protected readonly formattedDuration = computed(() => {
    const s = this.shortsService.currentShort();
    if (!s) return '';
    const m = Math.floor(s.durationSeconds / 60);
    const sec = s.durationSeconds % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  });

  protected setFilter(value: ShortCategory | null): void {
    this.shortsService.setFilter(value);
  }

  protected prev(): void {
    this.shortsService.prev();
  }

  protected next(): void {
    this.shortsService.next();
  }

  protected dismissBadge(): void {
    this.shortsService.clearActivityBadge();
  }
}
