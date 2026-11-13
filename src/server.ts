import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { codOrderHandler } from './server/cod-order';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.set('trust proxy', true);

const STORE = process.env['SHOPIFY_STORE_DOMAIN'];
const VERSION = process.env['SHOPIFY_API_VERSION'] ?? '2026-10';
const PRIVATE_TOKEN = process.env['SHOPIFY_STOREFRONT_PRIVATE_TOKEN'];

app.post('/api/storefront', express.json({ limit: '50kb' }), async (req, res) => {
  if (!STORE || !PRIVATE_TOKEN) {
    res.status(500).json({ errors: [{ message: 'Faltan variables de entorno de Shopify' }] });
    return;
  }

  const { query, variables } = req.body ?? {};
  if (typeof query !== 'string') {
    res.status(400).json({ errors: [{ message: 'Query inválida' }] });
    return;
  }

  try {
    const upstream = await fetch(`https://${STORE}/api/${VERSION}/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Shopify-Storefront-Private-Token': PRIVATE_TOKEN,
        ...(req.ip ? { 'Shopify-Storefront-Buyer-IP': req.ip } : {}),
      },
      body: JSON.stringify({ query, variables }),
    });
    res.status(upstream.status).type('application/json').send(await upstream.text());
  } catch (err) {
    console.error('[storefront]', err);
    res.status(502).json({ errors: [{ message: 'No se pudo contactar a Shopify' }] });
  }
});


const SITE = 'https://auratechchile.cl';

app.get('/sitemap.xml', async (_req, res) => {
  try {
    const r = await fetch(`https://${STORE}/api/${VERSION}/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Shopify-Storefront-Private-Token': PRIVATE_TOKEN! },
      body: JSON.stringify({
        query: `{
          products(first: 250) { nodes { handle updatedAt } }
          collections(first: 50) { nodes { handle updatedAt } }
        }`,
      }),
    });
    const { data } = (await r.json()) as {
      data: { products: { nodes: { handle: string; updatedAt: string }[] }; collections: { nodes: { handle: string; updatedAt: string }[] } };
    };

    const hidden = ['frontpage', 'electronics-and-accessories-example-products'];
    const urls: { loc: string; lastmod?: string; priority: string }[] = [
      { loc: '/', priority: '1.0' },
      { loc: '/catalogo', priority: '0.8' },
      { loc: '/contacto', priority: '0.5' },
      ...['envios', 'reembolsos', 'terminos', 'privacidad'].map((h) => ({ loc: `/politicas/${h}`, priority: '0.3' })),
      ...data.collections.nodes
        .filter((c) => !hidden.includes(c.handle))
        .map((c) => ({ loc: `/collections/${c.handle}`, lastmod: c.updatedAt, priority: '0.8' })),
      ...data.products.nodes.map((p) => ({ loc: `/products/${p.handle}`, lastmod: p.updatedAt, priority: '0.9' })),
    ];

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls
        .map((u) => `  <url><loc>${SITE}${u.loc}</loc>${'lastmod' in u && u.lastmod ? `<lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : ''}<priority>${u.priority}</priority></url>`)
        .join('\n') +
      `\n</urlset>`;

    res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(xml);
  } catch (err) {
    console.error('[sitemap]', err);
    res.status(500).send('Error generando sitemap');
  }
});


app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

app.post('/api/cod-order', express.json({ limit: '10kb' }), codOrderHandler);
