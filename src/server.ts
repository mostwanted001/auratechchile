import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

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
