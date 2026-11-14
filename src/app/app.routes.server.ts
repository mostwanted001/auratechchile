
import { PrerenderFallback, RenderMode, ServerRoute } from '@angular/ssr';

/** Consulta a Shopify durante el build (usa las variables de entorno) */
async function storefront<T>(query: string): Promise<T> {
  const store = process.env['SHOPIFY_STORE_DOMAIN'];
  const version = process.env['SHOPIFY_API_VERSION'] ?? '2026-10';
  const token = process.env['SHOPIFY_STOREFRONT_PRIVATE_TOKEN'];
  if (!store || !token) throw new Error('Faltan variables de Shopify para el prerender');

  const res = await fetch(`https://${store}/api/${version}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Shopify-Storefront-Private-Token': token },
    body: JSON.stringify({ query }),
  });
  const json = (await res.json()) as { data: T };
  return json.data;
}

const HIDDEN_COLLECTIONS = ['frontpage', 'electronics-and-accessories-example-products'];

export const serverRoutes: ServerRoute[] = [
  // Páginas fijas
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'catalogo', renderMode: RenderMode.Prerender },
  { path: 'contacto', renderMode: RenderMode.Prerender },

  // Una página por cada producto de Shopify
  {
    path: 'products/:handle',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Client, // producto nuevo aún sin build → se arma en el navegador
    async getPrerenderParams() {
      const d = await storefront<{ products: { nodes: { handle: string }[] } }>(
        `{ products(first: 250) { nodes { handle } } }`,
      );
      return d.products.nodes.map((p) => ({ handle: p.handle }));
    },
  },

  // Una página por cada colección
  {
    path: 'collections/:handle',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Client,
    async getPrerenderParams() {
      const d = await storefront<{ collections: { nodes: { handle: string }[] } }>(
        `{ collections(first: 50) { nodes { handle } } }`,
      );
      return d.collections.nodes
        .filter((c) => !HIDDEN_COLLECTIONS.includes(c.handle))
        .map((c) => ({ handle: c.handle }));
    },
  },

  // Políticas
  {
    path: 'politicas/:handle',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return ['envios', 'reembolsos', 'terminos', 'privacidad'].map((handle) => ({ handle }));
    },
  },

  // Cualquier otra ruta (por ejemplo, 404): se arma en el navegador
  { path: '**', renderMode: RenderMode.Client },

  { path: 'buscar', renderMode: RenderMode.Prerender },
];
