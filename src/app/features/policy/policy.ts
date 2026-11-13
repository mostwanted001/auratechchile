import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { map, of, switchMap } from 'rxjs';
import { StorefrontClient } from '../../core/shopify/storefront.client';

const POLICIES: Record<string, { field: string; title: string }> = {
  terminos: { field: 'termsOfService', title: 'Términos y condiciones' },
  privacidad: { field: 'privacyPolicy', title: 'Política de privacidad' },
  envios: { field: 'shippingPolicy', title: 'Envíos' },
  reembolsos: { field: 'refundPolicy', title: 'Cambios, devoluciones y reembolsos' },
};

const POLICIES_QUERY = `
  query Policies @inContext(country: CL, language: ES) {
    shop {
      termsOfService { title body }
      privacyPolicy { title body }
      shippingPolicy { title body }
      refundPolicy { title body }
    }
  }
`;

type PolicyData = { title: string; body: string } | null;

@Component({
  selector: 'app-policy',
  imports: [RouterLink],
  templateUrl: './policy.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Policy {
  private readonly sf = inject(StorefrontClient);
  readonly handle = input.required<string>();

  protected readonly links = [
    { label: 'Envíos', handle: 'envios' },
    { label: 'Cambios y devoluciones', handle: 'reembolsos' },
    { label: 'Términos y condiciones', handle: 'terminos' },
    { label: 'Privacidad', handle: 'privacidad' },
  ];

  protected readonly policy = toSignal(
    toObservable(this.handle).pipe(
      switchMap((h) => {
        const cfg = POLICIES[h];
        if (!cfg) return of(null);
        return this.sf
          .request<{ shop: Record<string, PolicyData> }>(POLICIES_QUERY)
          .pipe(
            map((d) => {
              const p = d.shop[cfg.field];
              return p ? { title: cfg.title, body: p.body } : null;
            }),
          );
      }),
    ),
  )
}