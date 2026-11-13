import type { Env } from '../edge/env';

const SITE = 'https://auratechchile.cl';
const HIDDEN = ['frontpage', 'electronics-and-accessories-example-products'];

type Node = { handle: string; updatedAt: string };

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const r = await fetch(`https://${env.SHOPIFY_STORE_DOMAIN}/api/${env.SHOPIFY_API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Shopify-Storefront-Private-Token': env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN,
    },
    body: JSON.stringify({
      query: `{
        products(first: 250) { nodes { handle updatedAt } }
        collections(first: 50) { nodes { handle updatedAt } }
      }`,
    }),
  });
  if (!r.ok) return new Response('Error generando sitemap', { status: 502 });

  const { data } = (await r.json()) as { data: { products: { nodes: Node[] }; collections: { nodes: Node[] } } };

  const urls: { loc: string; lastmod?: string; priority: string }[] = [
    { loc: '/', priority: '1.0' },
    { loc: '/catalogo', priority: '0.8' },
    { loc: '/contacto', priority: '0.5' },
    ...['envios', 'reembolsos', 'terminos', 'privacidad'].map((h) => ({ loc: `/politicas/${h}`, priority: '0.3' })),
    ...data.collections.nodes
      .filter((c) => !HIDDEN.includes(c.handle))
      .map((c) => ({ loc: `/collections/${c.handle}`, lastmod: c.updatedAt, priority: '0.8' })),
    ...data.products.nodes.map((p) => ({ loc: `/products/${p.handle}`, lastmod: p.updatedAt, priority: '0.9' })),
  ];

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map((u) =>
        `  <url><loc>${SITE}${u.loc}</loc>` +
        (u.lastmod ? `<lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : '') +
        `<priority>${u.priority}</priority></url>`,
      )
      .join('\n') +
    `\n</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' },
  });
};