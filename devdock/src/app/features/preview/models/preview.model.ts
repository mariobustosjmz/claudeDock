export interface PreviewState {
  readonly url: string;
  readonly isOpen: boolean;
  readonly cssChanges: readonly CssChange[];
}

export interface CssChange {
  readonly selector: string;
  readonly property: string;
  readonly value: string;
  readonly timestamp: number;
}
