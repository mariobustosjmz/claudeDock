import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { AppTheme } from '../../features/settings/models/settings.model';

export type ResolvedTheme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  private get mediaQuery(): MediaQueryList {
    return (this.document.defaultView ?? window).matchMedia('(prefers-color-scheme: dark)');
  }

  apply(theme: AppTheme): void {
    const resolved: ResolvedTheme = theme === 'system' ? this.getOsTheme() : theme;
    this.document.documentElement.classList.toggle('dark', resolved === 'dark');
    this.document.documentElement.classList.toggle('light', resolved === 'light');
  }

  getOsTheme(): ResolvedTheme {
    return this.mediaQuery.matches ? 'dark' : 'light';
  }

  listenForOsChanges(callback: (theme: ResolvedTheme) => void): () => void {
    const handler = (e: MediaQueryListEvent): void => {
      callback(e.matches ? 'dark' : 'light');
    };
    this.mediaQuery.addEventListener('change', handler);
    return () => this.mediaQuery.removeEventListener('change', handler);
  }
}
