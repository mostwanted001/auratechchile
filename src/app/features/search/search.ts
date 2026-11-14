import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { map, of, switchMap, tap } from 'rxjs';
import { SeoService } from '../../core/seo/seo.service';
import { SearchService } from '../../core/shopify/search.service';
import { ProductCard } from '../../shared/ui/product-card/product-card';

@Component({
  selector: 'app-search',
  imports: [RouterLink, ProductCard],
  templateUrl: './search.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Search {
  private readonly searchSvc = inject(SearchService);

  /** Viene de ?q= en la URL */
  readonly q = input<string>('');

  protected readonly results = toSignal(
    toObservable(this.q).pipe(
      map((q) => (q ?? '').trim()),
      switchMap((q) => (q ? this.searchSvc.search(q) : of(null))),
    ),
  );

  constructor() {
    inject(SeoService).set({ title: 'Buscar', description: 'Busca productos en AuraTech Chile.', path: '/buscar' });
    // Las páginas de búsqueda no deben aparecer en Google
    inject(Meta).updateTag({ name: 'robots', content: 'noindex, follow' });
  }
}