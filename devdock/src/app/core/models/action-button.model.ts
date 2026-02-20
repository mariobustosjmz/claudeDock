export enum ActionType {
  SHELL = 'SHELL',
  APP_LAUNCH = 'APP_LAUNCH',
  URL = 'URL',
  SCRIPT = 'SCRIPT',
}

export interface ShortcutConfig {
  readonly key: string;
  readonly modifiers: readonly string[];
}

export interface ActionButton {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly actionType: ActionType;
  readonly payload: string;
  readonly shortcut?: ShortcutConfig;
  readonly enabled: boolean;
}
