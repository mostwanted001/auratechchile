import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BRAND } from '../../../core/shopify/brands';

@Component({
  imports: [RouterLink, NgOptimizedImage],
  selector: 'app-hero',
  styleUrl: './hero.css',
  templateUrl: './hero.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Hero {
  protected readonly perks = [
    { title: 'Paga al recibir', text: 'Pagas cuando llega a tu puerta' },
    { title: 'Envío gratis', text: 'A todo Chile' },
    { title: 'Garantía 6 meses', text: 'Compra con tranquilidad' },
  ];

  protected readonly bg = BRAND.heroBg;

}
