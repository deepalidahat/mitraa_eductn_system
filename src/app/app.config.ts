import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import localeEnIn from '@angular/common/locales/en-IN';
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { TitleStrategy, provideRouter, withComponentInputBinding, withInMemoryScrolling, withRouterConfig } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { SessionTimeoutService } from '@core/auth/session-timeout.service';
import { authInterceptor, errorInterceptor, loadingInterceptor } from '@core/http/interceptors';
import { AppTitleStrategy } from '@core/navigation/title-strategy';
import { AppConfigService } from '@core/services/app-config.service';
import { PreferencesService } from '@core/services/preferences.service';
import { routes } from './app.routes';

registerLocaleData(localeEnIn);

// Zoneless change detection is the default in Angular 21 (no zone.js polyfill).
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
    ),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, loadingInterceptor, errorInterceptor])),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    provideAppInitializer(() => {
      inject(PreferencesService); // apply theme / accessibility prefs before first paint
      inject(SessionTimeoutService).start();
      return firstValueFrom(inject(AppConfigService).load());
    }),
  ],
};
