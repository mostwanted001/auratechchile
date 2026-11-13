import { createCodOrder } from '../../edge/cod-validation';
import type { Env } from '../../edge/env';
import { adminGraphql } from '../../edge/shopify-admin';

/* Límite por IP con Workers KV: máximo 5 pedidos por hora */
async function tooManyRequests(env: Env, ip: string): Promise<boolean> {
  const key = `rl:cod:${ip}`;
  const count = Number((await env.AURA_KV.get(key)) ?? 0) + 1;
  await env.AURA_KV.put(key, String(count), { expirationTtl: 3600 });
  return count > 5;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json().catch(() => null);
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';

  const result = await createCodOrder(body, {
    admin: (query, variables) => adminGraphql(env, query, variables),
    testMode: env.COD_TEST_MODE === 'true',
    isRateLimited: () => tooManyRequests(env, ip),
  });

  return Response.json(result.body, { status: result.status });
};