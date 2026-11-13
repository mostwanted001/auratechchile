import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { BRAND } from '../shopify/brands';


const ORIGIN = 'https://auratechchile.cl';
const DEFAULT_IMAGE = BRAND.heroBg;

export interface SeoData {
  title: string;
  description: string;
  path: string;            // ej: '/products/camara-...'
  image?: string | null;
  type?: 'website' | 'product';
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  set({ title, description, path, image, type = 'website' }: SeoData) {
    const fullTitle = title === BRAND.name ? `${BRAND.name} | Tecnología práctica para tu hogar` : `${title} | ${BRAND.name}`;
    const desc = description.replace(/\s+/g, ' ').trim().slice(0, 158);
    const url = ORIGIN + path;
    const img = image ?? DEFAULT_IMAGE;

    this.title.setTitle(fullTitle);

    const tags: Record<string, string> = {
      // Google
      'name:description': desc,
      // WhatsApp, Facebook, Instagram, LinkedIn (Open Graph)
      'property:og:type': type,
      'property:og:site_name': BRAND.name,
      'property:og:locale': 'es_CL',
      'property:og:title': fullTitle,
      'property:og:description': desc,
      'property:og:url': url,
      'property:og:image': img,
      // X / Twitter
      'name:twitter:card': 'summary_large_image',
      'name:twitter:title': fullTitle,
      'name:twitter:description': desc,
      'name:twitter:image': img,
    };
    for (const [key, content] of Object.entries(tags)) {
      const [attr, name] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
      this.meta.updateTag({ [attr]: name, content });
    }

    this.setCanonical(url);
  }

  /** Datos estructurados (JSON-LD) para resultados enriquecidos en Google */
  setJsonLd(id: string, data: object | null) {
    this.document.head.querySelector(`script[data-ld="${id}"]`)?.remove();
    if (!data) return;
    const s = this.document.createElement('script');
    s.type = 'application/ld+json';
    s.setAttribute('data-ld', id);
    s.textContent = JSON.stringify(data);
    this.document.head.appendChild(s);
  }

  private setCanonical(url: string) {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }
    link.href = url;
  }
}