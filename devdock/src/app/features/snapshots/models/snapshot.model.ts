export interface WindowInfo {
  readonly app_name: string;
  readonly title: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface WorkspaceSnapshot {
  readonly id: string;
  readonly name: string;
  readonly created_at: number;
  readonly windows: readonly WindowInfo[];
}
