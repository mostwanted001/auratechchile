import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-cod-steps',
  imports: [RouterLink],
  templateUrl: './cod-steps.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodSteps {
  protected readonly steps = [
    {
      title: 'Pides en 1 minuto',
      text: 'Elige tu producto y completa tus datos. No ingresas tarjeta ni pagas nada online.',
      icon: 'M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 8Z M9 8V6a3 3 0 0 1 6 0v2',
    },
    {
      title: 'Te llega en 5 a 7 días',
      text: 'Despachamos gratis a todo Chile y te avisamos cuando tu pedido va en camino.',
      icon: 'M3 7h13v10H3z M16 10h3l2 3v4h-5 M7 18.5a1.5 1.5 0 1 0 0-.01 M18 18.5a1.5 1.5 0 1 0 0-.01',
    },
    {
      title: 'Pagas al recibir',
      text: 'Revisas tu pedido y pagas en ese momento. Si no llega, no pagas nada.',
      icon: 'M3 7h18v10H3z M3 11h18 M7 15h3',
    },
  ];
}