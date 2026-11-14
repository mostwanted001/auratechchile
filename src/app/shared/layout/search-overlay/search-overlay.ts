import { NgOptimizedImage } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, Component, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';
import { SearchService, Suggestions } from '../../../core/shopify/search.service';
import { MoneyPipe } from '../../ui/product-card/money.pipe';


type State = { status: 'idle' } | { status: 'loading' } | { status: 'done'; data: Suggestions };

@Component({
  selector: 'app-search-overlay',
  imports: [RouterLink, NgOptimizedImage, MoneyPipe],
  templateUrl: './search-overlay.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class SearchOverlay {
  private readonly searchSvc = inject(SearchService);
  private readonly router = inject(Router);
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');

  readonly closed = output<void>();
  protected readonly query = signal('');

  /** Espera 250 ms después de la última tecla, y cancela la búsqueda anterior si el cliente sigue escribiendo */
  protected readonly state = toSignal(
    toObservable(this.query).pipe(
      map((q) => q.trim()),
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((q): import('rxjs').Observable<State> =>
        q.length < 2
          ? of({ status: 'idle' })
          : this.searchSvc.suggest(q).pipe(
              map((data): State => ({ status: 'done', data })),
              catchError(() => of<State>({ status: 'done', data: { products: [], collections: [] } })),
              startWith<State>({ status: 'loading' }),
            ),
      ),
    ),
    { initialValue: { status: 'idle' } as State },
  );

  protected readonly popular = ['Cámara', 'Robot aspirador', 'Luces solares', 'Cepillo'];

  constructor() {
    afterNextRender(() => this.input().nativeElement.focus());
  }

  protected goToResults(q = this.query()) {
    const term = q.trim();
    if (!term) return;
    this.router.navigate(['/buscar'], { queryParams: { q: term } });
    this.closed.emit();
  }
}
