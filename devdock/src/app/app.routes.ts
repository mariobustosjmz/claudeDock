import { Routes } from '@angular/router';
import { DockShellComponent } from './features/dock/dock-shell.component';

export const routes: Routes = [
  { path: '', component: DockShellComponent },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings.component').then(
        (m) => m.SettingsComponent,
      ),
  },
  {
    path: 'actions',
    loadComponent: () =>
      import('./features/actions/actions.component').then(
        (m) => m.ActionsComponent,
      ),
  },
  {
    path: 'screenshot-overlay',
    loadComponent: () =>
      import('./features/screenshot/screenshot-overlay.component').then(
        (m) => m.ScreenshotOverlayComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
