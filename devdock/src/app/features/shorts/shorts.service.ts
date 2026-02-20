import { Injectable, signal, computed, inject } from '@angular/core';
import { AgentsService } from '../agents/agents.service';
import { Short, ShortCategory } from './models/short.model';
import { SHORTS_CATALOG } from './shorts-catalog';

@Injectable({ providedIn: 'root' })
export class ShortsService {
  private readonly agentsService = inject(AgentsService);

  private readonly _currentIndex = signal(0);
  private readonly _filterCategory = signal<ShortCategory | null>(null);

  readonly filterCategory = this._filterCategory.asReadonly();

  readonly suggestedShorts = computed((): readonly Short[] => {
    const agents = this.agentsService.agents();
    const agentNames = agents.map(a => a.agentType.toLowerCase());

    const relevant = SHORTS_CATALOG.filter(s =>
      s.tags.some(tag => agentNames.some(name => tag.includes(name) || name.includes(tag)))
    );
    const rest = SHORTS_CATALOG.filter(s => !relevant.includes(s));
    return [...relevant, ...rest];
  });

  readonly filteredShorts = computed((): readonly Short[] => {
    const cat = this._filterCategory();
    const base = this.suggestedShorts();
    return cat ? base.filter(s => s.category === cat) : base;
  });

  readonly currentShort = computed((): Short | null => {
    const list = this.filteredShorts();
    if (list.length === 0) return null;
    const idx = Math.min(this._currentIndex(), list.length - 1);
    return list[idx];
  });

  readonly currentIndex = this._currentIndex.asReadonly();
  readonly totalCount = computed(() => this.filteredShorts().length);

  setFilter(category: ShortCategory | null): void {
    this._filterCategory.set(category);
    this._currentIndex.set(0);
  }

  next(): void {
    const max = this.filteredShorts().length - 1;
    this._currentIndex.update(i => Math.min(i + 1, max));
  }

  prev(): void {
    this._currentIndex.update(i => Math.max(i - 1, 0));
  }
}
