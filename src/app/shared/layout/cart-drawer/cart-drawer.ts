import { DOCUMENT, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartStore } from '../../../core/cart/cart.store';
import { MoneyPipe } from '../../ui/product-card/money.pipe';


@Component({
  selector: 'app-cart-drawer',
  imports: [NgOptimizedImage, RouterLink, MoneyPipe],
  templateUrl: './cart-drawer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'close()' },
})
export class CartDrawer {
  protected readonly cart = inject(CartStore);
  private readonly document = inject(DOCUMENT);

  constructor() {
    // Bloquea el scroll de la página mientras el panel está abierto
    effect(() => {
      this.document.body.style.overflow = this.cart.open() ? 'hidden' : '';
    });
  }

  protected close() {
    this.cart.open.set(false);
  }
}