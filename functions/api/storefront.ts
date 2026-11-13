import type { Env } from '../../edge/env';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json().catch(() => null)) as { query?: unknown; variables?: unknown } | null;
  if (!body || typeof body.query !== 'string' || body.query.length > 20_000) {
    return Response.json({ errors: [{ message: 'Query inválida' }] }, { status: 400 });
  }

  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  const upstream = await fetch(
    `https://${env.SHOPIFY_STORE_DOMAIN}/api/${env.SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Shopify-Storefront-Private-Token': env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN,
        ...(ip ? { 'Shopify-Storefront-Buyer-IP': ip } : {}),
      },
      body: JSON.stringify({ query: body.query, variables: body.variables }),
    },
  );

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  });
};