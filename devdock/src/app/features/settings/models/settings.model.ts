import { DockPosition } from '../../../core/models/dock.model';

export interface AppSettings {
  readonly dockPosition: DockPosition;
  readonly autoHide: boolean;
  readonly autoHideDelay: number;
  readonly launchAtLogin: boolean;
  readonly theme: 'dark' | 'light';
  readonly apiKeys: Readonly<Record<string, string>>;
}

export const DEFAULT_SETTINGS: AppSettings = {
  dockPosition: DockPosition.FLOATING,
  autoHide: false,
  autoHideDelay: 1000,
  launchAtLogin: false,
  theme: 'dark',
  apiKeys: {},
};
