import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class StorefrontClient {
  private readonly http = inject(HttpClient);

  request<T>(query: string, variables: Record<string, unknown> = {}): Observable<T> {
    return this.http
      .post<{ data?: T; errors?: { message: string }[] }>('/api/storefront', { query, variables })
      .pipe(
        map((res) => {
          if (res.errors?.length) throw new Error(res.errors.map((e) => e.message).join('; '));
          return res.data as T;
        }),
      );
  }
}