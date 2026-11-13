import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { StorefrontClient } from '../shopify/storefront.client';
import { Cart, UserError } from '../shopify/types';
import {
  CART_CREATE,
  CART_LINES_ADD,
  CART_LINES_REMOVE,
  CART_LINES_UPDATE,
  CART_QUERY,
} from './cart.queries';

const COOKIE = 'aura_cart';
const MAX_AGE = 60 * 60 * 24 * 14; // 14 días

type Payload = { cart: Cart | null; userErrors: UserError[] };

@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly sf = inject(StorefrontClient);
  private readonly document = inject(DOCUMENT);

  // Estado privado (solo el store lo modifica)
  private readonly _cart = signal<Cart | null>(null);
  private readonly _busy = signal(false);
  private readonly _error = signal<string | null>(null);

  // Estado público de solo lectura
  readonly cart = this._cart.asReadonly();
  readonly busy = this._busy.asReadonly();
  readonly error = this._error.asReadonly();
  readonly open = signal(false); // panel lateral (Parte B)

  // Derivados
  readonly lines = computed(() => this._cart()?.lines.nodes ?? []);
  readonly count = computed(() => this._cart()?.totalQuantity ?? 0);
  readonly subtotal = computed(() => this._cart()?.cost.subtotalAmount ?? null);
  readonly isEmpty = computed(() => this.count() === 0);

  /** Recupera el carrito guardado. Llamar SOLO en el navegador. */
  async init() {
    const id = this.readCookie();
    if (!id) return;
    try {
      const { cart } = await firstValueFrom(this.sf.request<{ cart: Cart | null }>(CART_QUERY, { id }));
      cart ? this._cart.set(cart) : this.clearCookie(); // null = expiró o ya se compró
    } catch {
      this.clearCookie();
    }
  }

  /** Añadir al carrito: crea uno si no existe */
  async add(merchandiseId: string, quantity = 1) {
    const lines = [{ merchandiseId, quantity }];
    const current = this._cart();
    const ok = await this.run(async () => {
      if (current) {
        const r = await firstValueFrom(
          this.sf.request<{ cartLinesAdd: Payload }>(CART_LINES_ADD, { cartId: current.id, lines }),
        );
        return r.cartLinesAdd;
      }
      const r = await firstValueFrom(this.sf.request<{ cartCreate: Payload }>(CART_CREATE, { lines }));
      return r.cartCreate;
    });
    if (ok) this.open.set(true);
  }

  /** Pide hoy y paga al recibir: checkout solo con este producto, sin tocar el carrito actual */
  async buyNow(merchandiseId: string, quantity = 1) {
    this._busy.set(true);
    try {
      const r = await firstValueFrom(
        this.sf.request<{ cartCreate: Payload }>(CART_CREATE, { lines: [{ merchandiseId, quantity }] }),
      );
      const url = r.cartCreate.cart?.checkoutUrl;
      if (url) this.document.location.href = url;
      else this._error.set(r.cartCreate.userErrors[0]?.message ?? 'No se pudo iniciar la compra');
    } finally {
      this._busy.set(false);
    }
  }

  async updateQuantity(lineId: string, quantity: number) {
    const cart = this._cart();
    if (!cart) return;
    if (quantity <= 0) return this.remove(lineId);
    await this.run(async () => {
      const r = await firstValueFrom(
        this.sf.request<{ cartLinesUpdate: Payload }>(CART_LINES_UPDATE, {
          cartId: cart.id,
          lines: [{ id: lineId, quantity }],
        }),
      );
      return r.cartLinesUpdate;
    });
  }

  async remove(lineId: string) {
    const cart = this._cart();
    if (!cart) return;
    await this.run(async () => {
      const r = await firstValueFrom(
        this.sf.request<{ cartLinesRemove: Payload }>(CART_LINES_REMOVE, {
          cartId: cart.id,
          lineIds: [lineId],
        }),
      );
      return r.cartLinesRemove;
    });
  }

  checkout() {
    const url = this._cart()?.checkoutUrl;
    if (url) this.document.location.href = url;
  }

  // ---------- internos ----------

  private async run(op: () => Promise<Payload>): Promise<boolean> {
    this._busy.set(true);
    this._error.set(null);
    try {
      const { cart, userErrors } = await op();
      if (userErrors.length) {
        this._error.set(userErrors.map((e) => e.message).join(' '));
        return false;
      }
      if (cart) {
        this._cart.set(cart);
        this.writeCookie(cart.id);
      }
      return true;
    } catch (e) {
      console.error('[cart]', e);
      this._error.set('No pudimos actualizar tu carrito. Intenta de nuevo.');
      return false;
    } finally {
      this._busy.set(false);
    }
  }

  private readCookie(): string | null {
    const m = this.document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : null;
  }

  private writeCookie(id: string) {
    this.document.cookie = `${COOKIE}=${encodeURIComponent(id)}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax`;
  }

  private clearCookie() {
    this.document.cookie = `${COOKIE}=; Max-Age=0; Path=/`;
  }
}