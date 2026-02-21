import { DockPosition } from '../../../core/models/dock.model';
import { LlmProviderId } from '../../../core/models/llm-provider.model';

export type AppTheme = 'dark' | 'light' | 'system';

export interface AppSettings {
  readonly dockPosition: DockPosition;
  readonly autoHide: boolean;
  readonly autoHideDelay: number;
  readonly launchAtLogin: boolean;
  readonly theme: AppTheme;
  readonly apiKeys: Readonly<Partial<Record<LlmProviderId, string>>>;
  readonly llmProvider: LlmProviderId;
  readonly sttProvider: LlmProviderId;
}

export const DEFAULT_SETTINGS: AppSettings = {
  dockPosition: DockPosition.FLOATING,
  autoHide: false,
  autoHideDelay: 1000,
  launchAtLogin: false,
  theme: 'system',
  apiKeys: {},
  llmProvider: 'groq',
  sttProvider: 'groq',
};
