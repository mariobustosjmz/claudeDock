import { Injectable, computed, inject, signal } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { AnalyticsService } from '../../core/services/analytics.service';
import { LlmService } from '../../core/services/llm.service';
import {
  OptimizeRequest,
  ProjectContext,
  StructuredPrompt,
} from './models/prompt.model';
import { PromptHistoryService } from './services/prompt-history.service';

const SYSTEM_PROMPT = `You are a developer assistant that restructures rough developer prompts into precise, structured instructions for AI coding agents.

Given a developer's rough prompt and optional project context, respond ONLY with valid JSON in this exact format:
{
  "context": "Brief description of the current situation and what the developer is working on",
  "file": "The specific file path(s) that should be modified, or 'Multiple files' if unclear",
  "action": "Precise description of what action should be taken",
  "expected": "What the expected outcome or behavior should be after the change"
}

Rules:
- Be specific and technical
- Infer file paths from context if possible
- Keep each field under 150 characters
- Do not include markdown, only raw JSON`;

@Injectable({ providedIn: 'root' })
export class PromptService {
  private readonly analytics = inject(AnalyticsService);
  private readonly llm = inject(LlmService);
  private readonly history = inject(PromptHistoryService);

  private readonly _isOptimizing = signal(false);
  private readonly _lastError = signal<string | null>(null);
  private readonly _currentResult = signal<StructuredPrompt | null>(null);
  private readonly _responseTime = signal<number | null>(null);
  private readonly _pendingInput = signal<string | null>(null);

  readonly isOptimizing = this._isOptimizing.asReadonly();
  readonly lastError = this._lastError.asReadonly();
  readonly currentResult = this._currentResult.asReadonly();
  readonly responseTime = this._responseTime.asReadonly();
  readonly hasResult = computed(() => this._currentResult() !== null);
  readonly pendingInput = this._pendingInput.asReadonly();

  setPendingInput(text: string): void {
    this._pendingInput.set(text);
  }

  clearPendingInput(): void {
    this._pendingInput.set(null);
  }

  async optimize(request: OptimizeRequest): Promise<StructuredPrompt | null> {
    this._isOptimizing.set(true);
    this._lastError.set(null);
    const startTime = performance.now();

    try {
      const projectContext = await this.buildProjectContext();
      const userContent = projectContext
        ? `Developer prompt: "${request.rawPrompt}"\n\nProject context:\n${projectContext}`
        : `Developer prompt: "${request.rawPrompt}"`;

      const rawJson = await this.llm.chatCompletion(SYSTEM_PROMPT, userContent);
      const structured = this.parseStructuredResponse(rawJson);
      this._currentResult.set(structured);
      this._responseTime.set(Math.round(performance.now() - startTime));
      this.history.save(request.rawPrompt, structured).catch(console.error);
      this.analytics.track('prompt_optimized');
      return structured;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this._lastError.set(`API error: ${message}`);
      return null;
    } finally {
      this._isOptimizing.set(false);
    }
  }

  clearResult(): void {
    this._currentResult.set(null);
    this._lastError.set(null);
    this._responseTime.set(null);
  }

  private async buildProjectContext(): Promise<string> {
    try {
      const ctx = await invoke<ProjectContext>('get_project_context', { path: null });

      const parts: string[] = [];
      if (ctx.project_name) parts.push(`Project: ${ctx.project_name}`);
      if (ctx.current_branch) parts.push(`Branch: ${ctx.current_branch}`);
      if (ctx.recent_commits.length) {
        parts.push(`Recent commits: ${ctx.recent_commits.slice(0, 3).join('; ')}`);
      }
      if (ctx.package_json?.main_dependencies.length) {
        parts.push(`Stack: ${ctx.package_json.main_dependencies.slice(0, 5).join(', ')}`);
      }
      return parts.join('\n');
    } catch {
      return '';
    }
  }

  private parseStructuredResponse(raw: string): StructuredPrompt {
    try {
      const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleaned) as StructuredPrompt;
    } catch {
      return {
        context: 'Could not parse response',
        file: 'Unknown',
        action: raw.slice(0, 200),
        expected: 'Check the raw response',
      };
    }
  }
}
