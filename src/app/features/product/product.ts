import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { MoneyPipe } from '../../shared/ui/product-card/money.pipe';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { StorefrontClient } from '../../core/shopify/storefront.client';
import { ProductDetail } from '../../core/shopify/types';
import { map, switchMap } from 'rxjs';
import { NgOptimizedImage } from '@angular/common';
import { CartStore } from '../../core/cart/cart.store';
import { RouterLink } from '@angular/router';
import { CodModal } from './cod-modal/cod-modal';


const PRODUCT_QUERY = `
  query Product($handle: String!) @inContext(country: CL, language: ES) {
    product(handle: $handle) {
      id handle title description descriptionHtml
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
  imports: [MoneyPipe, NgOptimizedImage, RouterLink, CodModal],
  selector: 'app-product',
  styleUrl: './product.css',
  templateUrl: './product.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})



export class Product {
  private readonly sf = inject(StorefrontClient);

  /** Llega desde la URL /products/:handle */
  readonly handle = input.required<string>();

  protected readonly product = toSignal(
    toObservable(this.handle).pipe(
      switchMap((handle) =>
        this.sf.request<{ product: ProductDetail | null }>(PRODUCT_QUERY, { handle }),
      ),
      map((d) => d.product),
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




