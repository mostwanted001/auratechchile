import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-guarantees',
  templateUrl: './guarantees.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Guarantees {
  protected readonly items = [
    {
      title: 'Envío gratis',
      text: 'A todo Chile, sin monto mínimo',
      icon: 'M3 7h13v10H3z M16 10h3l2 3v4h-5 M7 18.5a1.5 1.5 0 1 0 0-.01 M18 18.5a1.5 1.5 0 1 0 0-.01',
    },
    {
      title: 'Garantía 6 meses',
      text: 'Cambio, reparación o devolución',
      icon: 'M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z M9 12l2 2 4-4',
    },
    {
      title: '10 días para devolver',
      text: 'Si no te convence, lo devuelves',
      icon: 'M3 12a9 9 0 1 0 3-6.7 M3 4v5h5',
    },
    {
      title: 'Atención por WhatsApp',
      text: 'Lunes a sábado, 9:00 a 20:00',
      icon: 'M21 12a8 8 0 0 1-11.8 7L4 20l1-5A8 8 0 1 1 21 12Z',
    },
  ];
}
