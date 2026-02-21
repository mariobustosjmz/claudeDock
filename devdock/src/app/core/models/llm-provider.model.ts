export type LlmProviderId = 'groq' | 'openai' | 'anthropic';

export interface LlmProvider {
  readonly id: LlmProviderId;
  readonly name: string;
  readonly baseUrl: string;
  readonly chatModel: string;
  readonly whisperModel: string | null;
  readonly apiKeyEnvName: string;
}

export const LLM_PROVIDERS: Readonly<Record<LlmProviderId, LlmProvider>> = {
  groq: {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    chatModel: 'llama-3.3-70b-versatile',
    whisperModel: 'whisper-large-v3',
    apiKeyEnvName: 'groq',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    chatModel: 'gpt-4o-mini',
    whisperModel: 'whisper-1',
    apiKeyEnvName: 'openai',
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    chatModel: 'claude-haiku-4-5-20251001',
    whisperModel: null,
    apiKeyEnvName: 'anthropic',
  },
};

export const STT_PROVIDERS = Object.values(LLM_PROVIDERS).filter(
  (p): p is LlmProvider & { whisperModel: string } => p.whisperModel !== null,
);
