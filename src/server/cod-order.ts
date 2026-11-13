import type { Request, Response } from 'express';
import { createCodOrder } from '../../edge/cod-validation';
import { adminGraphql } from './shopify-admin';

/* Límite por IP en memoria (suficiente para desarrollo local) */
const attempts = new Map<string, number[]>();
function tooManyRequests(ip: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(ip) ?? []).filter((t) => now - t < 60 * 60_000);
  recent.push(now);
  attempts.set(ip, recent);
  return recent.length > 5;
}

export async function codOrderHandler(req: Request, res: Response) {
  const result = await createCodOrder(req.body, {
    admin: adminGraphql,
    testMode: process.env['COD_TEST_MODE'] === 'true',
    isRateLimited: async () => tooManyRequests(req.ip ?? 'unknown'),
  });
  res.status(result.status).json(result.body);
}