import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import { Money } from '../shopify/types';
import { BRAND } from '../shopify/brands';

type Fbq = ((...args: unknown[]) => void) & { callMethod?: Function; queue?: unknown[]; push?: unknown; loaded?: boolean; version?: string };

/** ID que usa el catálogo de Meta creado por Shopify: shopify_CL_{producto}_{variante} */
export const metaContentId = (productGid: string, variantGid: string) =>
  `shopify_CL_${productGid.split('/').pop()}_${variantGid.split('/').pop()}`;

@Injectable({ providedIn: 'root' })
export class MetaPixel {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private started = false;
  /** Eventos que llegan antes de que el píxel cargue */
  private pending: unknown[][] = [];

  /** Llamar una vez, solo en el navegador (afterNextRender en App) */
  init() {
    if (!this.isBrowser || this.started || !BRAND.metaPixelId) return;
    this.started = true;

    const w = window as unknown as { fbq?: Fbq; _fbq?: Fbq };
    if (!w.fbq) {
      const fbq: Fbq = function (...args: unknown[]) {
        fbq.callMethod ? fbq.callMethod(...args) : fbq.queue!.push(args);
      };
      fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = [];
      w.fbq = fbq; w._fbq = fbq;

      const s = this.document.createElement('script');
      s.async = true;
      s.src = 'https://connect.facebook.net/en_US/fbevents.js';
      this.document.head.appendChild(s);
    }

    w.fbq!('init', BRAND.metaPixelId);
    w.fbq!('track', 'PageView');
    this.pending.forEach((args) => w.fbq!(...args));
    this.pending = [];

    // PageView en cada cambio de página (la app Angular no recarga la página)
    let lastUrl = this.router.url;
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      if (this.router.url !== lastUrl) {
        lastUrl = this.router.url;
        this.send('track', 'PageView');
      }
    });
  }

  viewContent(productGid: string, variantGid: string, name: string, price: Money) {
    this.send('track', 'ViewContent', {
      content_ids: [metaContentId(productGid, variantGid)],
      content_type: 'product',
      content_name: name,
      value: Number(price.amount),
      currency: price.currencyCode,
    });
  }

  addToCart(productGid: string, variantGid: string, name: string, price: Money, quantity: number) {
    this.send('track', 'AddToCart', {
      content_ids: [metaContentId(productGid, variantGid)],
      content_type: 'product',
      content_name: name,
      value: Number(price.amount) * quantity,
      currency: price.currencyCode,
    });
  }

  initiateCheckout(productGid: string, variantGid: string, total: Money, quantity: number) {
    this.send('track', 'InitiateCheckout', {
      content_ids: [metaContentId(productGid, variantGid)],
      content_type: 'product',
      num_items: quantity,
      value: Number(total.amount),
      currency: total.currencyCode,
    });
  }

  /** eventId = número de pedido: evita contar dos veces la misma compra */
  purchase(productGid: string, variantGid: string, total: Money, quantity: number, orderName: string) {
    this.send(
      'track',
      'Purchase',
      {
        content_ids: [metaContentId(productGid, variantGid)],
        content_type: 'product',
        num_items: quantity,
        value: Number(total.amount),
        currency: total.currencyCode,
      },
      { eventID: `cod-${orderName}` },
    );
  }

  private send(...args: unknown[]) {
    if (!this.isBrowser) return; // en el servidor (prerender) no se envía nada
    const fbq = (window as unknown as { fbq?: Fbq }).fbq;
    if (fbq && this.started) fbq(...args);
    else this.pending.push(args);
  }
}