import { Injectable, OnDestroy, computed, signal } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { AgentMetrics, AgentProcess } from './models/agent.model';

@Injectable({ providedIn: 'root' })
export class AgentsService implements OnDestroy {
  private readonly _agents = signal<AgentProcess[]>([]);
  private readonly _metrics = signal<Record<number, AgentMetrics>>({});
  private readonly _isPolling = signal(false);
  private readonly _lastError = signal<string | null>(null);
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private metricsTimer: ReturnType<typeof setInterval> | null = null;

  readonly agents = this._agents.asReadonly();
  readonly metrics = this._metrics.asReadonly();
  readonly isPolling = this._isPolling.asReadonly();
  readonly lastError = this._lastError.asReadonly();
  readonly agentCount = computed(() => this._agents().length);
  readonly hasAgents = computed(() => this._agents().length > 0);
  readonly totalMemoryMb = computed(() =>
    Math.round(this._agents().reduce((sum, a) => sum + a.memoryKb, 0) / 1024)
  );
  readonly totalCost = computed(() =>
    Object.values(this._metrics()).reduce((sum, m) => sum + (m.costEstimate ?? 0), 0)
  );

  startPolling(): void {
    if (this._isPolling()) return;
    this._isPolling.set(true);
    this.poll();
    this.pollTimer = setInterval(() => this.poll(), 2000);
    this.metricsTimer = setInterval(() => this.pollMetrics(), 5000);
  }

  stopPolling(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.metricsTimer) clearInterval(this.metricsTimer);
    this.pollTimer = null;
    this.metricsTimer = null;
    this._isPolling.set(false);
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private async poll(): Promise<void> {
    try {
      const agents = await invoke<AgentProcess[]>('get_running_agents');
      this._agents.set(agents);
      this._lastError.set(null);
    } catch (err) {
      // Suppress TypeError when running outside Tauri (browser dev context)
      if (err instanceof TypeError) return;
      this._lastError.set(String(err));
    }
  }

  private async pollMetrics(): Promise<void> {
    const pids = this._agents().map((a) => a.pid);
    for (const pid of pids) {
      try {
        const m = await invoke<AgentMetrics>('get_agent_metrics', { pid });
        this._metrics.update((all) => ({ ...all, [pid]: m }));
      } catch {
        // metrics are best-effort
      }
    }
  }
}
