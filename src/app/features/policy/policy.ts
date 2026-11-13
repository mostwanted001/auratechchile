import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { map, of, switchMap, tap } from 'rxjs';
import { StorefrontClient } from '../../core/shopify/storefront.client';
import { SeoService } from '../../core/seo/seo.service';

const POLICIES: Record<string, { field: string; title: string; description: string }> = {
  terminos: {
    field: 'termsOfService',
    title: 'Términos y condiciones',
    description: 'Términos y condiciones de compra en AuraTech Chile: precios, pago contra entrega, envíos y garantías.',
  },
  privacidad: {
    field: 'privacyPolicy',
    title: 'Política de privacidad',
    description: 'Cómo AuraTech Chile recopila, usa y protege tus datos personales.',
  },
  envios: {
    field: 'shippingPolicy',
    title: 'Envíos',
    description: 'Envío gratis a todo Chile en 5 a 7 días hábiles, con pago contra entrega.',
  },
  reembolsos: {
    field: 'refundPolicy',
    title: 'Cambios, devoluciones y reembolsos',
    description: '30 días para devolver por arrepentimiento y garantía legal de 6 meses en AuraTech Chile.',
  },
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

type PolicyBody = { body: string } | null;

@Component({
  selector: 'app-policy',
  imports: [RouterLink],
  templateUrl: './policy.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Policy {
  private readonly sf = inject(StorefrontClient);
  readonly handle = input.required<string>();
  private readonly seo = inject(SeoService);

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

        return this.sf.request<{ shop: Record<string, PolicyBody> }>(POLICIES_QUERY).pipe(
          map((d) => {
            const p = d.shop[cfg.field];
            return p ? { title: cfg.title, body: p.body } : null;
          }),
          // SEO apenas llegan los datos (funciona con SSR)
          tap((p) => {
            if (!p) return;
            this.seo.set({ title: cfg.title, description: cfg.description, path: `/politicas/${h}` });
            this.seo.setJsonLd('page', null);
          }),
        );
      }),
    ),
  );
}