export interface CssChange {
  readonly selector: string;
  readonly property: string;
  readonly value: string;
  readonly timestamp: number;
}
