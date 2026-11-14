import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, computed, inject, input, output, signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CodService } from '../../../core/cod/cod.service';
import { REGIONES } from '../../../core/cod/regiones';
import { Money, ShopifyImage } from '../../../core/shopify/types';
import { MoneyPipe } from '../../../shared/ui/product-card/money.pipe';
import { MetaPixel } from '../../../core/analytics/meta-pixel';


@Component({
  selector: 'app-cod-modal',
  imports: [ReactiveFormsModule, NgOptimizedImage, RouterLink, MoneyPipe],
  templateUrl: './cod-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'close()' },
})
export class CodModal {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly cod = inject(CodService);
  private readonly pixel = inject(MetaPixel);
  // Datos del producto que vienen de la página de producto
  readonly variantId = input.required<string>();
  readonly title = input.required<string>();
  readonly price = input.required<Money>();
  readonly image = input<ShopifyImage | null>(null);
  readonly initialQty = input(1);
  readonly closed = output<void>();

  readonly productId = input.required<string>();

  protected readonly regiones = REGIONES;
  protected readonly qty = signal(1);
  protected readonly sending = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly orderName = signal<string | null>(null); // éxito

  protected readonly total = computed<Money>(() => ({
    amount: String(Number(this.price().amount) * this.qty()),
    currencyCode: this.price().currencyCode,
  }));

  protected readonly form = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.pattern(/^(\+?56)?\s?9[\s-]?[2-9](\d[\s-]?){7}$/)]],
    email: ['', [Validators.required, Validators.email]],
    address1: ['', [Validators.required, Validators.minLength(5)]],
    address2: [''],
    region: ['', Validators.required],
    city: ['', [Validators.required, Validators.minLength(2)]],
    note: [''],
    acceptTerms: [false, Validators.requiredTrue],
    website: [''], // trampa para bots (oculto)
  });

  ngOnInit() {
    this.qty.set(this.initialQty());
    this.pixel.initiateCheckout(this.productId(), this.variantId(), this.total(), this.qty());
  }

  protected changeQty(d: number) {
    this.qty.update((q) => Math.min(10, Math.max(1, q + d)));
  }

  /** Muestra el error de un campo solo si el usuario ya lo tocó */
  protected invalid(name: keyof typeof this.form.controls) {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  protected async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.sending.set(true);
    this.serverError.set(null);

    const result = await this.cod.submit({
      ...this.form.getRawValue(),
      variantId: this.variantId(),
      quantity: this.qty(),
    });

    this.sending.set(false);
    if ('error' in result) {
      this.serverError.set(result.error);
    } else {
      this.orderName.set(result.orderName);this.pixel.purchase(this.productId(), this.variantId(), this.total(), this.qty(), result.orderName);

    }
  }

  protected close() {
    if (!this.sending()) this.closed.emit();
  }
}