import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { firstValueFrom } from 'rxjs';
import { SettingsService } from '../settings/settings.service';
import {
  GroqRequest,
  GroqResponse,
  OptimizeRequest,
  ProjectContext,
  StructuredPrompt,
} from './models/prompt.model';
import { PromptHistoryService } from './services/prompt-history.service';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

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
  private readonly http = inject(HttpClient);
  private readonly settings = inject(SettingsService);
  private readonly history = inject(PromptHistoryService);

  private readonly _isOptimizing = signal(false);
  private readonly _lastError = signal<string | null>(null);
  private readonly _currentResult = signal<StructuredPrompt | null>(null);
  private readonly _responseTime = signal<number | null>(null);

  readonly isOptimizing = this._isOptimizing.asReadonly();
  readonly lastError = this._lastError.asReadonly();
  readonly currentResult = this._currentResult.asReadonly();
  readonly responseTime = this._responseTime.asReadonly();
  readonly hasResult = computed(() => this._currentResult() !== null);

  async optimize(request: OptimizeRequest): Promise<StructuredPrompt | null> {
    const apiKey = this.getGroqApiKey();
    if (!apiKey) {
      this._lastError.set('Groq API key not configured. Set it in Settings.');
      return null;
    }

    this._isOptimizing.set(true);
    this._lastError.set(null);
    const startTime = performance.now();

    try {
      const projectContext = await this.buildProjectContext();
      const userContent = projectContext
        ? `Developer prompt: "${request.rawPrompt}"\n\nProject context:\n${projectContext}`
        : `Developer prompt: "${request.rawPrompt}"`;

      const body: GroqRequest = {
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        temperature: 0.3,
        max_tokens: 512,
      };

      const headers = new HttpHeaders({
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      });

      const response = await firstValueFrom(
        this.http.post<GroqResponse>(GROQ_API_URL, body, { headers })
      );

      const rawJson = response.choices[0]?.message?.content ?? '';
      const structured = this.parseStructuredResponse(rawJson);
      this._currentResult.set(structured);
      this._responseTime.set(Math.round(performance.now() - startTime));
      this.history.save(request.rawPrompt, structured).catch(console.error);
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

  private getGroqApiKey(): string | undefined {
    return this.settings.settings().apiKeys['groq'] || undefined;
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
