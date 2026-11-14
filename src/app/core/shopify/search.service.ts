import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { StorefrontClient } from './storefront.client';
import { ProductCard } from './types';

const CARD = `
  id handle title availableForSale
  featuredImage { url altText width height }
  priceRange { minVariantPrice { amount currencyCode } }
`;

const PREDICTIVE_QUERY = `
  query Predictive($q: String!) @inContext(country: CL, language: ES) {
    predictiveSearch(query: $q, limit: 6, types: [PRODUCT, COLLECTION]) {
      products { ${CARD} }
      collections { id handle title }
    }
  }
`;

const SEARCH_QUERY = `
  query Search($q: String!) @inContext(country: CL, language: ES) {
    search(query: $q, first: 48, types: [PRODUCT]) {
      totalCount
      nodes { ... on Product { ${CARD} } }
    }
  }
`;

const HIDDEN = ['frontpage', 'electronics-and-accessories-example-products'];

export interface Suggestions {
  products: ProductCard[];
  collections: { id: string; handle: string; title: string }[];
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly sf = inject(StorefrontClient);

  /** Sugerencias mientras el cliente escribe */
  suggest(q: string) {
    return this.sf
      .request<{ predictiveSearch: Suggestions }>(PREDICTIVE_QUERY, { q })
      .pipe(
        map((d) => ({
          products: d.predictiveSearch.products,
          collections: d.predictiveSearch.collections.filter((c) => !HIDDEN.includes(c.handle)),
        })),
      );
  }

  /** Resultados completos para /buscar */
  search(q: string) {
    return this.sf
      .request<{ search: { totalCount: number; nodes: ProductCard[] } }>(SEARCH_QUERY, { q })
      .pipe(map((d) => d.search));
  }
}