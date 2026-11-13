const STORE = process.env['SHOPIFY_STORE_DOMAIN'];
const VERSION = process.env['SHOPIFY_API_VERSION'] ?? '2026-10';
const CLIENT_ID = process.env['SHOPIFY_ADMIN_CLIENT_ID'];
const CLIENT_SECRET = process.env['SHOPIFY_ADMIN_CLIENT_SECRET'];

let token: string | null = null;
let expiresAt = 0;

/** Token de la Admin API vía client credentials. Dura 24 h; lo renovamos 5 min antes. */
async function getToken(): Promise<string> {
  if (token && Date.now() < expiresAt - 5 * 60_000) return token;

  if (!STORE || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Faltan variables SHOPIFY_ADMIN_CLIENT_ID / SECRET en el .env');
  }

  const res = await fetch(`https://${STORE}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`No se pudo obtener token Admin (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  token = data.access_token;
  expiresAt = Date.now() + data.expires_in * 1000;
  return token;
}

export async function adminGraphql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`https://${STORE}/admin/api/${VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': await getToken(),
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Admin API respondió ${res.status}`);

  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '));
  return json.data as T;
}