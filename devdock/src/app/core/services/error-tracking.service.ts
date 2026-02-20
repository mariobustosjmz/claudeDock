import { ErrorHandler, Injectable, inject } from '@angular/core';
import * as Sentry from '@sentry/angular';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ErrorTrackingService {
  initialize(): void {
    if (!environment.sentryDsn) return;
    Sentry.init({
      dsn: environment.sentryDsn,
      environment: environment.production ? 'production' : 'development',
      tracesSampleRate: 0.1,
      integrations: [Sentry.browserTracingIntegration()],
    });
  }

  setUser(id: string, email?: string): void {
    Sentry.setUser({ id, email });
  }

  clearUser(): void {
    Sentry.setUser(null);
  }

  captureError(error: unknown): void {
    if (!environment.sentryDsn) return;
    Sentry.captureException(error);
  }
}

@Injectable()
export class SentryErrorHandler implements ErrorHandler {
  private readonly sentry = inject(ErrorTrackingService);

  handleError(error: unknown): void {
    console.error(error);
    this.sentry.captureError(error);
  }
}
