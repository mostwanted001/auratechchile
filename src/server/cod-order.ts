import type { Request, Response } from 'express';
import { adminGraphql } from './shopify-admin';

/** Regiones de Chile con su código (ISO 3166-2:CL, el que usa Shopify) */
export const REGIONES: Record<string, string> = {
  AP: 'Arica y Parinacota', TA: 'Tarapacá', AN: 'Antofagasta', AT: 'Atacama',
  CO: 'Coquimbo', VS: 'Valparaíso', RM: 'Región Metropolitana', LI: "O'Higgins",
  ML: 'Maule', NB: 'Ñuble', BI: 'Biobío', AR: 'La Araucanía', LR: 'Los Ríos',
  LL: 'Los Lagos', AI: 'Aysén', MA: 'Magallanes',
};

const TEST_MODE = process.env['COD_TEST_MODE'] === 'true';

/* ---------- Antifraude: máximo 5 pedidos por IP por hora ---------- */
const attempts = new Map<string, number[]>();
function tooManyRequests(ip: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(ip) ?? []).filter((t) => now - t < 60 * 60_000);
  recent.push(now);
  attempts.set(ip, recent);
  return recent.length > 5;
}

/* ---------- Validación ---------- */
const str = (v: unknown, min: number, max: number) =>
  typeof v === 'string' && v.trim().length >= min && v.trim().length <= max ? v.trim() : null;

/** Acepta 912345678, +56912345678, +56 9 1234 5678... y devuelve +569XXXXXXXX */
function normalizePhone(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const digits = v.replace(/\D/g, '').replace(/^56/, '');
  return /^9\d{8}$/.test(digits) ? `+56${digits}` : null;
}

const isEmail = (v: unknown) =>
  typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) && v.length <= 120;

/* ---------- GraphQL ---------- */
const VARIANT_QUERY = `
  query Variant($id: ID!) {
    productVariant(id: $id) {
      id price availableForSale
      product { title status }
    }
  }
`;

const ORDER_CREATE = `
  mutation OrderCreate($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput) {
    orderCreate(order: $order, options: $options) {
      order { id name totalPriceSet { shopMoney { amount currencyCode } } }
      userErrors { field message }
    }
  }
`;

/* ---------- Handler ---------- */
export async function codOrderHandler(req: Request, res: Response) {
  const b = req.body ?? {};

  // 1. Trampa para bots: un campo oculto que un humano nunca llena
  if (b.website) {
    res.json({ ok: true, orderName: '#0000' }); // le respondemos "ok" para no darle pistas
    return;
  }

  // 2. Límite por IP
  if (tooManyRequests(req.ip ?? 'unknown')) {
    res.status(429).json({ ok: false, error: 'Demasiados intentos. Escríbenos por WhatsApp.' });
    return;
  }

  // 3. Validar campos
  const firstName = str(b.firstName, 2, 60);
  const lastName = str(b.lastName, 2, 60);
  const phone = normalizePhone(b.phone);
  const email = isEmail(b.email) ? (b.email as string).trim().toLowerCase() : null;
  const address1 = str(b.address1, 5, 120);
  const address2 = typeof b.address2 === 'string' ? b.address2.trim().slice(0, 60) : '';
  const region = typeof b.region === 'string' && REGIONES[b.region] ? b.region : null;
  const city = str(b.city, 2, 60);
  const note = typeof b.note === 'string' ? b.note.trim().slice(0, 300) : '';
  const quantity = Number.isInteger(b.quantity) && b.quantity >= 1 && b.quantity <= 10 ? b.quantity : null;
  const variantId =
    typeof b.variantId === 'string' && b.variantId.startsWith('gid://shopify/ProductVariant/') ? b.variantId : null;

  const missing = Object.entries({
    nombre: firstName, apellido: lastName, teléfono: phone, correo: email,
    dirección: address1, región: region, comuna: city, cantidad: quantity, producto: variantId,
  }).filter(([, v]) => !v).map(([k]) => k);

  if (missing.length || b.acceptTerms !== true) {
    res.status(400).json({
      ok: false,
      error: missing.length ? `Revisa: ${missing.join(', ')}` : 'Debes aceptar los términos y condiciones',
    });
    return;
  }

  try {
    // 4. Precio REAL desde Shopify (nunca confiamos en el que viene del navegador)
    const { productVariant: v } = await adminGraphql<{
      productVariant: { id: string; price: string; availableForSale: boolean; product: { title: string; status: string } } | null;
    }>(VARIANT_QUERY, { id: variantId });

    if (!v || v.product.status !== 'ACTIVE' || !v.availableForSale) {
      res.status(409).json({ ok: false, error: 'Este producto no está disponible en este momento.' });
      return;
    }

    // 5. Crear el pedido
    const address = {
      firstName, lastName, phone, address1, address2,
      city, provinceCode: region, countryCode: 'CL',
    };

    const { orderCreate } = await adminGraphql<{
      orderCreate: {
        order: { id: string; name: string; totalPriceSet: { shopMoney: { amount: string; currencyCode: string } } } | null;
        userErrors: { field: string[]; message: string }[];
      };
    }>(ORDER_CREATE, {
      order: {
        currency: 'CLP',
        email,
        phone,
        lineItems: [{
          variantId: v.id,
          quantity,
          priceSet: { shopMoney: { amount: v.price, currencyCode: 'CLP' } },
        }],
        shippingAddress: address,
        billingAddress: address,
        shippingLines: [{
          title: 'Envío gratis',
          priceSet: { shopMoney: { amount: '0', currencyCode: 'CLP' } },
        }],
        financialStatus: 'PENDING',
        customer: { toUpsert: { email, firstName, lastName } },
        note: note || undefined,
        tags: ['contra-entrega', 'web-angular'],
        sourceName: 'web-angular',
        test: TEST_MODE,
      },
      options: {
        inventoryBehaviour: 'DECREMENT_OBEYING_POLICY',
        sendReceipt: true,
      },
    });

    if (orderCreate.userErrors.length || !orderCreate.order) {
      console.error('[cod-order] userErrors', orderCreate.userErrors);
      res.status(422).json({ ok: false, error: 'No pudimos crear tu pedido. Revisa tus datos o escríbenos por WhatsApp.' });
      return;
    }

    res.json({
      ok: true,
      orderName: orderCreate.order.name,          // ej: "#1023"
      total: orderCreate.order.totalPriceSet.shopMoney,
    });
  } catch (err) {
    console.error('[cod-order]', err);
    res.status(502).json({ ok: false, error: 'Hubo un problema. Intenta de nuevo o escríbenos por WhatsApp.' });
  }
}