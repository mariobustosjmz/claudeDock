import { Injectable, computed, inject, signal } from '@angular/core';
import { StorageService } from '../../../core/services/storage.service';
import { PromptHistoryEntry } from '../models/prompt-history.model';
import { StructuredPrompt } from '../models/prompt.model';

@Injectable({ providedIn: 'root' })
export class PromptHistoryService {
  private readonly storage = inject(StorageService);
  private readonly STORE_NAME = 'prompt-history';
  private readonly STORE_KEY = 'entries';
  private readonly MAX_ENTRIES = 100;

  private readonly _entries = signal<PromptHistoryEntry[]>([]);
  private readonly _searchQuery = signal('');

  readonly searchQuery = this._searchQuery.asReadonly();
  readonly filteredEntries = computed(() => {
    const q = this._searchQuery().toLowerCase().trim();
    if (!q) return this._entries();
    return this._entries().filter(
      (e) =>
        e.rawInput.toLowerCase().includes(q) ||
        e.result.action.toLowerCase().includes(q) ||
        e.result.context.toLowerCase().includes(q) ||
        (e.projectName?.toLowerCase().includes(q) ?? false)
    );
  });

  constructor() {
    this.loadFromStorage();
  }

  async save(rawInput: string, result: StructuredPrompt, projectName?: string): Promise<void> {
    const entry: PromptHistoryEntry = {
      id: `ph_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      rawInput,
      result,
      projectName,
      tags: [],
      createdAt: Date.now(),
    };

    this._entries.update((list) => [entry, ...list].slice(0, this.MAX_ENTRIES));
    await this.storage.set(this.STORE_NAME, this.STORE_KEY, this._entries());
  }

  deleteEntry(id: string): void {
    this._entries.update((list) => list.filter((e) => e.id !== id));
    this.storage.set(this.STORE_NAME, this.STORE_KEY, this._entries()).catch(console.error);
  }

  setSearchQuery(q: string): void {
    this._searchQuery.set(q);
  }

  private async loadFromStorage(): Promise<void> {
    const saved = await this.storage.get<PromptHistoryEntry[]>(this.STORE_NAME, this.STORE_KEY);
    if (saved) this._entries.set(saved);
  }
}
