import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AgentsService } from './agents.service';

@Component({
  selector: 'app-agents',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-3 p-3 h-full">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-white/90">Agent Monitor</h2>
        <div class="flex items-center gap-2">
          @if (service.agentCount() > 0) {
            <span class="text-xs text-white/40">{{ service.totalMemoryMb() }}MB</span>
          }
          <span
            class="w-2 h-2 rounded-full"
            [class]="service.isPolling() ? 'bg-green-500 animate-pulse' : 'bg-white/20'"
          ></span>
        </div>
      </div>

      @if (service.lastError()) {
        <p class="text-xs text-red-400 bg-red-400/10 rounded px-2 py-1">
          {{ service.lastError() }}
        </p>
      }

      @if (!service.hasAgents()) {
        <div class="flex-1 flex flex-col items-center justify-center gap-2 text-center">
          <span class="text-2xl">🤖</span>
          <p class="text-xs text-white/30">No AI agents detected.<br>Start Claude Code, Cursor, or Codex.</p>
        </div>
      } @else {
        <div class="flex-1 overflow-y-auto space-y-2">
          @for (agent of service.agents(); track agent.pid) {
            <div class="bg-white/5 rounded-xl p-3 border border-white/10 space-y-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-base">{{ agentIcon(agent.agentType) }}</span>
                  <div>
                    <p class="text-xs font-semibold text-white/90">{{ agent.agentType }}</p>
                    <p class="text-xs text-white/40 truncate max-w-48">{{ shortCwd(agent.cwd) }}</p>
                  </div>
                </div>
                <span
                  class="text-xs px-2 py-0.5 rounded-full"
                  [class]="statusClass(agent.status)"
                >{{ statusLabel(agent.status) }}</span>
              </div>

              <div class="flex items-center gap-3 text-xs text-white/40">
                <span>PID {{ agent.pid }}</span>
                <span>{{ agent.memoryKb > 1024 ? ((agent.memoryKb / 1024) | number:'1.0-0') + 'MB' : agent.memoryKb + 'KB' }}</span>
                <span>{{ agent.cpuPercent | number:'1.0-1' }}% CPU</span>
              </div>

              @if (service.metrics()[agent.pid]; as m) {
                @if (!m.metricsAvailable) {
                  <span class="text-xs text-white/20 italic">metrics unavailable</span>
                } @else if (m.tokenEstimate || m.costEstimate) {
                  <div class="flex gap-3 text-xs">
                    @if (m.tokenEstimate) {
                      <span class="text-indigo-400">~{{ m.tokenEstimate | number }} tokens</span>
                    }
                    @if (m.costEstimate) {
                      <span class="text-green-400">\${{ m.costEstimate | number:'1.3-3' }}</span>
                    }
                  </div>
                }
              }
            </div>
          }
        </div>

        @if (service.totalCost() > 0) {
          <div class="flex items-center justify-between text-xs border-t border-white/10 pt-2">
            <span class="text-white/40">Total session cost</span>
            <span class="text-green-400 font-medium">\${{ service.totalCost() | number:'1.3-3' }}</span>
          </div>
        }
      }
    </div>
  `,
})
export class AgentsComponent implements OnInit, OnDestroy {
  readonly service = inject(AgentsService);

  ngOnInit(): void {
    this.service.startPolling();
  }

  ngOnDestroy(): void {
    this.service.stopPolling();
  }

  agentIcon(type: string): string {
    const icons: Record<string, string> = {
      'Claude Code': '🤖',
      'Cursor': '🖱️',
      'Codex': '⚡',
      'Aider': '🛠️',
    };
    return icons[type] ?? '🔧';
  }

  shortCwd(cwd: string | null): string {
    if (!cwd) return 'unknown';
    const parts = cwd.split('/');
    return parts.slice(-2).join('/');
  }

  statusClass(status: string): string {
    const s = status.toLowerCase();
    if (s.includes('run') || s.includes('sleep')) return 'bg-green-500/20 text-green-400';
    if (s.includes('stop') || s.includes('zombie')) return 'bg-red-500/20 text-red-400';
    return 'bg-white/10 text-white/50';
  }

  statusLabel(status: string): string {
    const s = status.toLowerCase();
    if (s.includes('run') || s.includes('sleep')) return 'running';
    if (s.includes('stop')) return 'stopped';
    if (s.includes('zombie')) return 'zombie';
    return 'idle';
  }
}
