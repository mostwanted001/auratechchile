import { afterNextRender, Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './shared/layout/header/header';
import { CartStore } from './core/cart/cart.store';
import { CartDrawer } from './shared/layout/cart-drawer/cart-drawer';
import { Footer } from './shared/layout/footer/footer';
import { WhatsappButton } from './shared/ui/whatsapp-button/whatsapp-button';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, CartDrawer, Footer, WhatsappButton],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {

  private readonly cart = inject(CartStore);

  constructor() {
    // El carrito es de cada visitante: se carga solo en el navegador, nunca en el SSR
    afterNextRender(() => void this.cart.init());
  }

  protected readonly title = signal('aura-tech');
}
