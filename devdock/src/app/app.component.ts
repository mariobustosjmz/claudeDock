import { Component, ChangeDetectionStrategy } from '@angular/core';
import { DockShellComponent } from './features/dock/dock-shell.component';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DockShellComponent],
  template: `<app-dock-shell />`,
})
export class AppComponent {}
