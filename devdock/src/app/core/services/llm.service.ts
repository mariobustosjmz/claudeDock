import { Injectable, computed, inject } from '@angular/core';
import { SettingsService } from '../../features/settings/settings.service';
import { LLM_PROVIDERS, LlmProviderId } from '../models/llm-provider.model';

@Injectable({ providedIn: 'root' })
export class LlmService {
  private readonly settings = inject(SettingsService);

  readonly chatProvider = computed(() => LLM_PROVIDERS[this.settings.settings().llmProvider]);
  readonly sttProvider = computed(() => LLM_PROVIDERS[this.settings.settings().sttProvider]);

  private getApiKey(providerId: LlmProviderId): string {
    return this.settings.settings().apiKeys[providerId] ?? '';
  }

  async chatCompletion(systemPrompt: string, userMessage: string): Promise<string> {
    const provider = this.chatProvider();
    const key = this.getApiKey(provider.id);
    if (!key) throw new Error(`No API key set for ${provider.name}`);

    const isAnthropic = provider.id === 'anthropic';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(isAnthropic
        ? { 'x-api-key': key, 'anthropic-version': '2023-06-01' }
        : { 'Authorization': `Bearer ${key}` }),
    };

    const url = isAnthropic
      ? `${provider.baseUrl}/messages`
      : `${provider.baseUrl}/chat/completions`;

    const body = isAnthropic
      ? JSON.stringify({
          model: provider.chatModel,
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        })
      : JSON.stringify({
          model: provider.chatModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
        });

    const resp = await fetch(url, { method: 'POST', headers, body });
    if (!resp.ok) {
      throw new Error(`${provider.name} API error: ${resp.status}`);
    }

    const data: unknown = await resp.json();
    return isAnthropic
      ? ((data as { content: { text: string }[] }).content[0]?.text ?? '')
      : ((data as { choices: { message: { content: string } }[] }).choices[0]?.message?.content ?? '');
  }

  async transcribeAudio(wavBase64: string, durationSeconds: number): Promise<string> {
    const provider = this.sttProvider();
    if (!provider.whisperModel) {
      throw new Error(`${provider.name} does not support speech-to-text`);
    }
    const key = this.getApiKey(provider.id);
    if (!key) throw new Error(`No API key set for ${provider.name}`);

    const bytes = Uint8Array.from(atob(wavBase64), c => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'audio/wav' });
    const form = new FormData();
    form.append('file', blob, 'audio.wav');
    form.append('model', provider.whisperModel);

    const resp = await fetch(`${provider.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}` },
      body: form,
    });
    if (!resp.ok) {
      throw new Error(`STT API error: ${resp.status}`);
    }

    const data: unknown = await resp.json();
    return (data as { text: string }).text ?? '';
  }
}
