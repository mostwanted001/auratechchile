import { Money } from './../../../core/shopify/types';
import { Component, input } from '@angular/core';
import { ProductCard as Product } from '../../../core/shopify/types';
import { RouterEvent, RouterLink } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { MoneyPipe } from './money.pipe';

@Component({
  imports: [RouterLink,NgOptimizedImage, MoneyPipe],
  selector: 'app-product-card',
  styleUrl: './product-card.css',
  templateUrl: './product-card.html',
})
export class ProductCard {
  readonly product = input.required<Product>();
  readonly priority = input(false);
}
