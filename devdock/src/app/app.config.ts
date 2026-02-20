import {
  ApplicationConfig,
  ErrorHandler,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
  APP_INITIALIZER,
  inject,
} from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideHttpClient } from "@angular/common/http";

import { routes } from "./app.routes";
import { AuthService } from "./core/services/auth.service";
import { UpdateService } from "./core/services/update.service";
import {
  ErrorTrackingService,
  SentryErrorHandler,
} from "./core/services/error-tracking.service";

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    { provide: ErrorHandler, useClass: SentryErrorHandler },
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const errorTracking = inject(ErrorTrackingService);
        const auth = inject(AuthService);
        return () => {
          errorTracking.initialize();
          return auth.initialize();
        };
      },
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const update = inject(UpdateService);
        return () => update.checkForUpdate();
      },
      multi: true,
    },
  ],
};
