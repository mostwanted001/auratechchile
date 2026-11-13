import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, firstValueFrom, of } from 'rxjs';

export interface CodOrderInput {
  variantId: string;
  quantity: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address1: string;
  address2: string;
  region: string;
  city: string;
  note: string;
  acceptTerms: boolean;
  website: string; // campo trampa
}

export type CodOrderResult =
  | { ok: true; orderName: string; total: { amount: string; currencyCode: string } }
  | { ok: false; error: string };

@Injectable({ providedIn: 'root' })
export class CodService {
  private readonly http = inject(HttpClient);

  submit(input: CodOrderInput): Promise<CodOrderResult> {
    return firstValueFrom(
      this.http.post<CodOrderResult>('/api/cod-order', input).pipe(
        // Los errores 4xx/5xx también traen { ok:false, error } desde el servidor
        catchError((e: HttpErrorResponse) =>
          of<CodOrderResult>({ ok: false, error: e.error?.error ?? 'No pudimos enviar tu pedido. Intenta de nuevo.' }),
        ),
      ),
    );
  }
}