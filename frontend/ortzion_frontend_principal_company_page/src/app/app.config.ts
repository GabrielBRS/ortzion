import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import {
  TitleStrategy,
  provideRouter,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';

import { routes } from './app.routes';
import { AppTitleStrategy } from './core/seo/app-title-strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    // Se o seu app.config.ts original tinha provideZonelessChangeDetection(),
    // recoloque a linha aqui — todos os componentes deste esqueleto são OnPush.
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      withViewTransitions(),
    ),
    provideClientHydration(withEventReplay()),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
  ],
};
