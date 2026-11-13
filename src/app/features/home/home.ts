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

  protected readonly products = toSignal(
    this.sf.request<{ products: { nodes: Product[] } }>(HOME_QUERY).pipe(map((d) => d.products.nodes)),
    { initialValue: [] },
  );
}
