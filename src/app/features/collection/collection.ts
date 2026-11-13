import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { map, switchMap, tap } from 'rxjs';
import { StorefrontClient } from '../../core/shopify/storefront.client';
import { ProductCard as Product } from '../../core/shopify/types';
import { ProductCard } from '../../shared/ui/product-card/product-card';
import { SeoService } from '../../core/seo/seo.service';

const CARD = `
  id handle title availableForSale
  featuredImage { url altText width height }
  priceRange { minVariantPrice { amount currencyCode } }
`;

const COLLECTION_QUERY = `
  query Collection($handle: String!, $sortKey: ProductCollectionSortKeys, $reverse: Boolean, $filters: [ProductFilter!])
  @inContext(country: CL, language: ES) {
    collection(handle: $handle) {
      title description
      products(first: 48, sortKey: $sortKey, reverse: $reverse, filters: $filters) { nodes { ${CARD} } }
    }
  }
`;

const ALL_QUERY = `
  query All($sortKey: ProductSortKeys, $reverse: Boolean, $query: String)
  @inContext(country: CL, language: ES) {
    products(first: 48, sortKey: $sortKey, reverse: $reverse, query: $query) { nodes { ${CARD} } }
  }
`;

/** Opciones de orden: claves en español para la URL (?orden=precio-asc) */
const SORTS = {
  'mas-vendidos': { label: 'Más vendidos', col: 'BEST_SELLING', all: 'BEST_SELLING', reverse: false },
  'novedades': { label: 'Novedades', col: 'CREATED', all: 'CREATED_AT', reverse: true },
  'precio-asc': { label: 'Precio: menor a mayor', col: 'PRICE', all: 'PRICE', reverse: false },
  'precio-desc': { label: 'Precio: mayor a menor', col: 'PRICE', all: 'PRICE', reverse: true },
} as const;
type SortKey = keyof typeof SORTS;

interface View {
  title: string;
  description: string;
  products: Product[];
}

@Component({
  selector: 'app-collection',
  imports: [RouterLink, RouterLinkActive, ProductCard],
  templateUrl: './collection.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Collection {
  private readonly sf = inject(StorefrontClient);
  private readonly router = inject(Router);

  private readonly seo = inject(SeoService);



  // Vienen de la URL: /collections/:handle?orden=...&disponible=1
  readonly handle = input<string>();
  readonly orden = input<string>();
  readonly disponible = input<string>();

  protected readonly sorts = Object.entries(SORTS).map(([key, s]) => ({ key, label: s.label }));
  protected readonly sort = computed<SortKey>(() => (this.orden() as SortKey) in SORTS ? (this.orden() as SortKey) : 'mas-vendidos');
  protected readonly onlyAvailable = computed(() => this.disponible() === '1');

  protected readonly chips = [
    { label: 'Todo', link: '/catalogo' },
    { label: 'Seguridad y exterior', link: '/collections/seguridad-del-hogar' },
    { label: 'Hogar y orden', link: '/collections/hogar-y-orden' },
    { label: 'Bienestar', link: '/collections/bienestar' },
  ];

  /** Todo lo que define qué productos mostrar, en un solo signal */
  private readonly params = computed(() => ({
    handle: this.handle(),
    sort: SORTS[this.sort()],
    onlyAvailable: this.onlyAvailable(),
  }));

  protected readonly view = toSignal(
    toObservable(this.params).pipe(
      switchMap(({ handle, sort, onlyAvailable }) =>
        handle
          ? this.sf
              .request<{ collection: { title: string; description: string; products: { nodes: Product[] } } | null }>(
                COLLECTION_QUERY,
                {
                  handle,
                  sortKey: sort.col,
                  reverse: sort.reverse,
                  filters: onlyAvailable ? [{ available: true }] : [],
                },
              )
              .pipe(
                map((d): View | null =>
                  d.collection
                    ? { title: d.collection.title, description: d.collection.description, products: d.collection.products.nodes }
                    : null,
                ),
              )
          : this.sf
              .request<{ products: { nodes: Product[] } }>(ALL_QUERY, {
                sortKey: sort.all,
                reverse: sort.reverse,
                query: onlyAvailable ? 'available_for_sale:true' : null,
              })
              .pipe(
                map((d): View => ({
                  title: 'Catálogo',
                  description: 'Todos nuestros productos para tu hogar, con envío gratis a todo Chile.',
                  products: d.products.nodes,
                })),
                tap((v) => {
                  if (!v) return;
                  this.seo.set({
                    title: v.title,
                    description: v.description || `${v.title}: productos con envío gratis a todo Chile y pago contra entrega.`,
                    path: this.handle() ? `/collections/${this.handle()}` : '/catalogo',
                    image: v.products[0]?.featuredImage?.url,
                  });
                  this.seo.setJsonLd('page', null);
                }),
              ),
      ),
    ),

  );

  /** Cambia los filtros en la URL; el resto se actualiza solo */
  protected setParams(params: { orden?: string | null; disponible?: string | null }) {
    this.router.navigate([], { queryParams: params, queryParamsHandling: 'merge', replaceUrl: true });
  }
}