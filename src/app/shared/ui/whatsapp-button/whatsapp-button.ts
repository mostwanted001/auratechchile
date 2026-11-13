import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { BRAND } from '../../../core/shopify/brands';


@Component({
  selector: 'app-whatsapp-button',
  templateUrl: './whatsapp-button.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhatsappButton {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  /** En la página de producto hay una barra fija abajo en mobile: subimos el botón */
  protected readonly onProduct = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url.startsWith('/products/')),
    ),
    { initialValue: this.router.url.startsWith('/products/') },
  );

  /** El mensaje incluye la página donde está el cliente, así sabes de qué producto pregunta */
  protected open() {
    const url = this.document.location.href;
    const text = this.onProduct()
      ? `Hola AuraTech, tengo una consulta sobre este producto: ${url}`
      : 'Hola AuraTech, tengo una consulta';
    window.open(`https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }
}
