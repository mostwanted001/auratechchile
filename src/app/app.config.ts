import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { IMAGE_LOADER } from '@angular/common';
import { shopifyImageLoader } from './core/shopify/image-loader';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
provideHttpClient(withFetch()),
provideClientHydration(
  withEventReplay(),
  withHttpTransferCacheOptions({ includePostRequests: true })  ,
),
{ provide: IMAGE_LOADER, useValue: shopifyImageLoader },
  ]
};
