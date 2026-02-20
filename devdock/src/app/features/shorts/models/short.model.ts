export type ShortCategory = 'prompt-engineering' | 'agent-usage' | 'shortcuts' | 'debugging';

export interface Short {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly url: string;
  readonly category: ShortCategory;
  readonly durationSeconds: number;
  readonly tags: readonly string[];
}
