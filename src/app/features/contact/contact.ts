import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BRAND } from '../../core/shopify/brands';
import { SeoService } from '../../core/seo/seo.service';


@Component({
  selector: 'app-contact',
  imports: [RouterLink],
  templateUrl: './contact.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Contact {
  protected readonly brand = BRAND;
  protected readonly waLink = `https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent('Hola AuraTech, tengo una consulta')}`;

  constructor() {
    inject(SeoService).set({
      title: 'Contacto',
      description: 'Escríbenos por WhatsApp o correo. Atención de lunes a sábado, de 9:00 a 20:00 h. Envío gratis y pago contra entrega en todo Chile.',
      path: '/contacto',
    });
  }


  protected readonly faqs = [
    {
      q: '¿Cuánto demora en llegar mi pedido?',
      a: 'Tu pedido llega en 5 a 7 días hábiles desde que confirmamos tu compra. Cuando sea despachado te enviaremos el número de seguimiento.',
    },
    {
      q: '¿Cuánto cuesta el envío?',
      a: 'El envío es gratis a todo Chile, en todos los pedidos y sin monto mínimo de compra.',
    },
    {
      q: '¿Cómo funciona el pago contra entrega?',
      a: 'Haces tu pedido sin pagar nada online y pagas cuando llega a tu puerta. Debe haber una persona adulta para recibirlo y pagar. El transportista puede llamarte para coordinar, así que mantén tu teléfono disponible.',
    },
    {
      q: '¿Qué medios de pago aceptan?',
      a: 'Puedes pagar al recibir tu pedido (contra entrega) o pagar online con Mercado Pago al finalizar la compra.',
    },
    {
      q: '¿Puedo devolver un producto?',
      a: 'Sí. Tienes 10 días desde que lo recibes para devolverlo por arrepentimiento, y garantía legal de 6 meses si presenta fallas.',
    },
  ];
}
