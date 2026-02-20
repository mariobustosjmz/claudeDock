import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';
import { PanelType } from '../../../core/models/dock.model';

@Component({
  selector: 'app-dock-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="dock-btn relative flex flex-col items-center justify-center w-10 h-10 rounded-xl transition-all duration-150 group"
      [class.active]="active()"
      [title]="label()"
      (click)="clicked.emit(panelType())"
    >
      <span
        class="text-lg leading-none"
        [innerHTML]="icon()"
      ></span>
      <span
        class="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] font-medium px-2 py-0.5 rounded-md
               bg-black/80 text-white whitespace-nowrap opacity-0 group-hover:opacity-100
               transition-opacity duration-150 pointer-events-none z-50"
      >{{ label() }}</span>
    </button>
  `,
  styles: [`
    .dock-btn {
      color: rgba(255,255,255,0.6);
      background: transparent;
      border: 1px solid transparent;
      cursor: pointer;
      outline: none;
    }
    .dock-btn:hover {
      color: rgba(255,255,255,0.95);
      background: rgba(255,255,255,0.08);
      border-color: rgba(255,255,255,0.1);
    }
    .dock-btn.active {
      color: #818cf8;
      background: rgba(99,102,241,0.15);
      border-color: rgba(99,102,241,0.3);
    }
  `],
})
export class DockButtonComponent {
  readonly icon = input.required<string>();
  readonly label = input.required<string>();
  readonly panelType = input.required<PanelType>();
  readonly active = input<boolean>(false);

  readonly clicked = output<PanelType>();
}
