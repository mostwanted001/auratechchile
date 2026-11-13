import type { Env } from './env';

async function getToken(env: Env): Promise<string> {
  const cached = await env.AURA_KV.get('admin_token');
  if (cached) return cached;

  const res = await fetch(`https://${env.SHOPIFY_STORE_DOMAIN}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.SHOPIFY_ADMIN_CLIENT_ID,
      client_secret: env.SHOPIFY_ADMIN_CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Token Admin (${res.status}): ${await res.text()}`);

  const { access_token, expires_in } = (await res.json()) as { access_token: string; expires_in: number };
  // Lo guardamos 5 minutos menos de lo que dura
  await env.AURA_KV.put('admin_token', access_token, { expirationTtl: Math.max(60, expires_in - 300) });
  return access_token;
}

export async function adminGraphql<T>(env: Env, query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`https://${env.SHOPIFY_STORE_DOMAIN}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': await getToken(env) },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Admin API ${res.status}`);
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '));
  return json.data as T;
}