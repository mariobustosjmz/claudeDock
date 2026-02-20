import { PanelType } from '../../../core/models/dock.model';

export interface DockItem {
  readonly icon: string;
  readonly label: string;
  readonly panel: PanelType;
}
