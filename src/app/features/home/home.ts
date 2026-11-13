import { Component, inject } from '@angular/core';
import { ProductCard } from '../../shared/ui/product-card/product-card';
import { StorefrontClient } from '../../core/shopify/storefront.client';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProductCard as Product } from '../../core/shopify/types';
import { map } from 'rxjs';
import { Hero } from './hero/hero';
import { Guarantees } from './guarantees/guarantees';
import { CodSteps } from './cod-steps/cod-steps';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';
import { BRAND } from '../../core/shopify/brands';

const HOME_QUERY = `
  query Home @inContext(country: CL, language: ES) {
    products(first: 12) {
      nodes {
        id handle title
        featuredImage { url altText width height }
        priceRange { minVariantPrice { amount currencyCode } }
      }
    }
  }
`;


@Component({
  imports: [ProductCard, Hero, Guarantees, CodSteps, RouterLink],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home {
  private readonly sf = inject(StorefrontClient);
  private readonly seo = inject(SeoService);


  constructor() {
    this.seo.set({
      title: BRAND.name,
      description: 'Cámaras de seguridad WiFi, robots aspiradores, iluminación solar y bienestar. Envío gratis a todo Chile y pago contra entrega.',
      path: '/',
    });
    this.seo.setJsonLd('page', {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: BRAND.name,
      url: 'https://auratechchile.cl',
      logo: 'https://auratechchile.cl/logo.png',
      contactPoint: { '@type': 'ContactPoint', telephone: '+56944347226', contactType: 'customer service', areaServed: 'CL', availableLanguage: 'es' },
      sameAs: Object.values(BRAND.social),
    });
  }


  protected readonly products = toSignal(
    this.sf.request<{ products: { nodes: Product[] } }>(HOME_QUERY).pipe(map((d) => d.products.nodes)),
    { initialValue: [] },
  );
}
