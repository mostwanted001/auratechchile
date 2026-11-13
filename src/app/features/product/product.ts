import { ChangeDetectionStrategy, Component, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { MoneyPipe } from '../../shared/ui/product-card/money.pipe';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { StorefrontClient } from '../../core/shopify/storefront.client';
import { ProductDetail } from '../../core/shopify/types';
import { tap, switchMap, map } from 'rxjs';
import { NgOptimizedImage } from '@angular/common';
import { CartStore } from '../../core/cart/cart.store';
import { RouterLink } from '@angular/router';
import { CodModal } from './cod-modal/cod-modal';
import { SeoService } from '../../core/seo/seo.service';
import { BRAND } from '../../core/shopify/brands';

 const PRODUCT_QUERY = `
  query Product($handle: String!) @inContext(country: CL, language: ES) {
    product(handle: $handle) {
      id handle title description descriptionHtml
      seo { title description }
      images(first: 10) { nodes { url altText width height } }
      options { name optionValues { name } }
      variants(first: 50) {
        nodes {
          id title availableForSale
          selectedOptions { name value }
          price { amount currencyCode }
          compareAtPrice { amount currencyCode }
          image { url altText width height }
        }
      }
    }
  }
`;


@Component({
  imports: [MoneyPipe, NgOptimizedImage, CodModal],
  selector: 'app-product',
  styleUrl: './product.css',
  templateUrl: './product.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})



export class Product {
  private readonly sf = inject(StorefrontClient);

  private readonly seo = inject(SeoService);


  private applySeo(p: ProductDetail) {
    const vs = p.variants.nodes;
    const v = vs.find((x) => x.availableForSale) ?? vs[0];
    if (!v) return;

    this.seo.set({
      title: p.seo.title || p.title,
      description: p.seo.description || p.description,
      path: `/products/${p.handle}`,
      image: p.images.nodes[0]?.url,
      type: 'product',
    });

    this.seo.setJsonLd('page', {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.title,
      description: p.description,
      image: p.images.nodes.map((i) => i.url),
      brand: { '@type': 'Brand', name: BRAND.name },
      offers: {
        '@type': 'Offer',
        url: `https://auratechchile.cl/products/${p.handle}`,
        priceCurrency: v.price.currencyCode,
        price: Number(v.price.amount),
        availability: v.availableForSale ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        shippingDetails: {
          '@type': 'OfferShippingDetails',
          shippingRate: { '@type': 'MonetaryAmount', value: 0, currency: 'CLP' },
          shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'CL' },
        },
      },
    });
  }




  /** Llega desde la URL /products/:handle */
  readonly handle = input.required<string>();

  protected readonly product = toSignal(
    toObservable(this.handle).pipe(
      switchMap((handle) =>
        this.sf.request<{ product: ProductDetail | null }>(PRODUCT_QUERY, { handle }),
      ),
      map((d) => d.product),
      tap((p) => p && this.applySeo(p)),   // ← SEO apenas llegan los datos
    ),
  );


  protected readonly variant = computed(() => {
    const vs = this.product()?.variants.nodes ?? [];
    return vs.find((v) => v.availableForSale) ?? vs[0] ?? null;
  });

  /** Foto grande: arranca en la primera y cambia al tocar una miniatura.
      Se reinicia sola si navegas a otro producto. */
  protected readonly activeImage = linkedSignal(() => this.product()?.images.nodes[0] ?? null);

  protected readonly quantity = signal(1);

  protected readonly onSale = computed(() => {
    const v = this.variant();
    return !!v?.compareAtPrice && Number(v.compareAtPrice.amount) > Number(v.price.amount);
  });

  protected changeQty(delta: number) {
    this.quantity.update((q) => Math.min(10, Math.max(1, q + delta)));
  }

  protected readonly cart = inject(CartStore);

  protected addToCart() {
    const v = this.variant();
    if (v) this.cart.add(v.id, this.quantity());
  }

  protected buyNow() {
    const v = this.variant();
    if (v) this.cart.buyNow(v.id, this.quantity());
  }

  protected readonly codOpen = signal(false);


}




