import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BRAND } from '../../../core/shopify/brands';


@Component({
  selector: 'app-footer',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './footer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
  protected readonly brand = BRAND;
  protected readonly year = new Date().getFullYear();
  protected readonly waLink = `https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent('Hola AuraTech, tengo una consulta')}`;

  protected readonly shop = [
    { label: 'Seguridad y exterior', link: '/collections/seguridad-del-hogar' },
    { label: 'Hogar y orden', link: '/collections/hogar-y-orden' },
    { label: 'Bienestar', link: '/collections/bienestar' },
    { label: 'Catálogo completo', link: '/catalogo' },
  ];

  protected readonly help = [
    { label: 'Envíos', link: '/politicas/envios' },
    { label: 'Cambios y devoluciones', link: '/politicas/reembolsos' },
    { label: 'Términos y condiciones', link: '/politicas/terminos' },
    { label: 'Política de privacidad', link: '/politicas/privacidad' },
    { label: 'Contacto', link: '/contacto' },
  ];
}
