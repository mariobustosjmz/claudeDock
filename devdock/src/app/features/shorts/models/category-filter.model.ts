import { ShortCategory } from './short.model';

export interface CategoryFilter {
  readonly label: string;
  readonly value: ShortCategory | null;
}
