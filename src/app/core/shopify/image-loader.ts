import { ImageLoaderConfig } from '@angular/common';

export function shopifyImageLoader({ src, width }: ImageLoaderConfig): string {
  if (!src.startsWith('https://cdn.shopify.com')) return src;   // 1. locales: salen tal cual

  const url = new URL(src);                                      // 2. solo URLs de Shopify
  if (width) url.searchParams.set('width', String(width));
  return url.toString();
}