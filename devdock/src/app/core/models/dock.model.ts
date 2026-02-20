export enum DockPosition {
  TOP = 'TOP',
  BOTTOM = 'BOTTOM',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  FLOATING = 'FLOATING',
}

export interface DockSize {
  readonly width: number;
  readonly height: number;
}

export interface DockConfig {
  readonly position: DockPosition;
  readonly size: DockSize;
  readonly autoHide: boolean;
  readonly autoHideDelay: number;
  readonly theme: 'dark' | 'light';
  readonly x: number;
  readonly y: number;
}

export enum PanelType {
  SCREENSHOT = 'SCREENSHOT',
  PROMPT = 'PROMPT',
  VOICE = 'VOICE',
  AGENTS = 'AGENTS',
  PREVIEW = 'PREVIEW',
  ACTIONS = 'ACTIONS',
  SNAPSHOTS = 'SNAPSHOTS',
  SETTINGS = 'SETTINGS',
  NONE = 'NONE',
}

export const DEFAULT_DOCK_CONFIG: DockConfig = {
  position: DockPosition.FLOATING,
  size: { width: 420, height: 64 },
  autoHide: false,
  autoHideDelay: 1000,
  theme: 'dark',
  x: 100,
  y: 100,
};
