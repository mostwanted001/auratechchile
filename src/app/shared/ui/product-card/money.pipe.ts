import { Pipe, PipeTransform } from '@angular/core';
import { Money } from '../../../core/shopify/types';

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  private static fmt = new Map<string, Intl.NumberFormat>();

  transform(value: Money | null | undefined): string {
    if (!value) return '';
    let f = MoneyPipe.fmt.get(value.currencyCode);
    if (!f) {
      f = new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: value.currencyCode,
        maximumFractionDigits: value.currencyCode === 'CLP' ? 0 : 2,
      });
      MoneyPipe.fmt.set(value.currencyCode, f);
    }
    return f.format(Number(value.amount));
  }
}