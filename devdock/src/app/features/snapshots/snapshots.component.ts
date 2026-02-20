import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { SnapshotsService } from './snapshots.service';
import { WorkspaceSnapshot } from './models/snapshot.model';

@Component({
  selector: 'app-snapshots',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  template: `
    <div class="snapshots-panel p-3 flex flex-col gap-3">
      <div class="text-xs font-semibold text-white/40 uppercase tracking-wider">
        Workspace Snapshots
      </div>

      <!-- Capture -->
      <div class="flex gap-2">
        <input
          class="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/25"
          placeholder="Snapshot name…"
          [value]="snapName()"
          (input)="onNameInput($event)"
          (keydown.enter)="capture()"
        />
        <button
          class="px-3 py-2 rounded-lg text-sm font-medium transition-all"
          [class]="snapshots.isCapturing() ? 'bg-white/10 text-white/40 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'"
          [disabled]="snapshots.isCapturing() || !snapName()"
          (click)="capture()"
        >
          {{ snapshots.isCapturing() ? '…' : 'Save' }}
        </button>
      </div>

      @if (snapshots.error()) {
        <p class="text-xs text-red-400">{{ snapshots.error() }}</p>
      }

      <!-- Snapshot list -->
      @if (snapshots.count() === 0) {
        <p class="text-xs text-white/30 text-center py-2">No snapshots yet</p>
      } @else {
        <div class="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
          @for (snap of snapshots.snapshots(); track snap.id) {
            <div class="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/8 group">
              <div class="flex-1 min-w-0">
                <p class="text-sm text-white truncate">{{ snap.name }}</p>
                <p class="text-xs text-white/40">
                  {{ snap.windows.length }} windows · {{ snap.created_at * 1000 | date:'MMM d, h:mm a' }}
                </p>
              </div>
              <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  class="px-2 py-1 rounded text-xs bg-violet-600/80 hover:bg-violet-500 text-white"
                  [disabled]="snapshots.isRestoring()"
                  (click)="restore(snap)"
                >
                  Restore
                </button>
                <button
                  class="px-2 py-1 rounded text-xs bg-white/10 hover:bg-red-600/60 text-white/60 hover:text-white"
                  (click)="delete(snap.id)"
                >
                  ✕
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class SnapshotsComponent implements OnInit {
  protected readonly snapshots = inject(SnapshotsService);
  protected readonly snapName = signal('');

  ngOnInit(): void {
    this.snapshots.loadSnapshots();
  }

  protected onNameInput(event: Event): void {
    this.snapName.set((event.target as HTMLInputElement).value);
  }

  protected async capture(): Promise<void> {
    const name = this.snapName().trim();
    if (!name) return;
    await this.snapshots.captureSnapshot(name);
    this.snapName.set('');
  }

  protected async restore(snap: WorkspaceSnapshot): Promise<void> {
    await this.snapshots.restoreSnapshot(snap);
  }

  protected async delete(id: string): Promise<void> {
    await this.snapshots.deleteSnapshot(id);
  }
}
