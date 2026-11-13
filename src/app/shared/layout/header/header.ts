import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { BRAND } from '../../../core/shopify/brands';
import { NgOptimizedImage } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, tap } from 'rxjs';
import { CartStore } from '../../../core/cart/cart.store';


@Component({
  imports: [RouterLink, RouterLinkActive, NgOptimizedImage],
  selector: 'app-header',
  styleUrl: './header.css',
  templateUrl: './header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:scroll)': 'onScroll()' },
})
export class Header {
  private readonly router = inject(Router);

  protected readonly cart = inject(CartStore);

  protected readonly nav = [
    { label: 'Inicio', link: '/' },
    { label: 'Seguridad', link: '/collections/seguridad-del-hogar' },
    { label: 'Hogar y orden', link: '/collections/hogar-y-orden' },
    { label: 'Bienestar', link: '/collections/bienestar' },
    { label: 'Catálogo', link: '/catalogo' },
    { label: 'Contacto', link: '/contacto' },
  ];

  protected readonly brand = BRAND;
  protected readonly menuOpen = signal(false);
  /** ¿El usuario bajó más de 24px? */
  private readonly scrolled = signal(false);
  /** ¿Estamos en el home? */
  protected readonly isHome = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      tap(() => this.menuOpen.set(false)),           // cierra el menú al navegar
      map(() => this.router.url.split('?')[0] === '/'),
    ),
    { initialValue: this.router.url.split('?')[0] === '/' },
  );



  /** Header sólido si NO es el home, o si ya se hizo scroll */
  protected readonly solid = computed(() => !this.isHome() || this.scrolled());

  protected onScroll() {
    this.scrolled.set(window.scrollY > 24);
  }

}
