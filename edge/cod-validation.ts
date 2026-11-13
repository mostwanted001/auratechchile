/* =====================================================================
   Lógica de pedidos contra entrega, compartida entre:
   - src/server/cod-order.ts      (Express, desarrollo local)
   - functions/api/cod-order.ts   (Cloudflare, producción)
   ===================================================================== */

/** Regiones de Chile (ISO 3166-2:CL, el código que usa Shopify) */
export const REGIONES: Record<string, string> = {
  AP: 'Arica y Parinacota', TA: 'Tarapacá', AN: 'Antofagasta', AT: 'Atacama',
  CO: 'Coquimbo', VS: 'Valparaíso', RM: 'Región Metropolitana', LI: "O'Higgins",
  ML: 'Maule', NB: 'Ñuble', BI: 'Biobío', AR: 'La Araucanía', LR: 'Los Ríos',
  LL: 'Los Lagos', AI: 'Aysén', MA: 'Magallanes',
};

/** Cómo hablar con la Admin API (cada entorno entrega su versión) */
export type AdminGraphql = <T>(query: string, variables?: Record<string, unknown>) => Promise<T>;

export interface CodDeps {
  admin: AdminGraphql;
  testMode: boolean;
  /** Devuelve true si esta IP ya superó el límite */
  isRateLimited: () => Promise<boolean>;
}

export type CodBody =
  | { ok: true; orderName: string; total?: { amount: string; currencyCode: string } }
  | { ok: false; error: string };

export interface CodResult {
  status: number;
  body: CodBody;
}

/* ---------- Validación ---------- */
const str = (v: unknown, min: number, max: number) =>
  typeof v === 'string' && v.trim().length >= min && v.trim().length <= max ? v.trim() : null;

/** Acepta 9 8765 4321, +56987654321, etc. Devuelve +569XXXXXXXX (celulares chilenos parten en 92–99) */
function normalizePhone(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const digits = v.replace(/\D/g, '').replace(/^56/, '');
  return /^9[2-9]\d{7}$/.test(digits) ? `+56${digits}` : null;
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

type OrderCreatePayload = {
  orderCreate: {
    order: { id: string; name: string; totalPriceSet: { shopMoney: { amount: string; currencyCode: string } } } | null;
    userErrors: { field: string[] | null; message: string }[];
  };
};

/* ---------- Caso de uso ---------- */
export async function createCodOrder(input: unknown, deps: CodDeps): Promise<CodResult> {
  const b = (input ?? {}) as Record<string, unknown>;

  // 1. Trampa para bots: respondemos "ok" para no darles pistas
  if (b['website']) return { status: 200, body: { ok: true, orderName: '#0000' } };

  // 2. Límite por IP
  if (await deps.isRateLimited()) {
    return { status: 429, body: { ok: false, error: 'Demasiados intentos. Escríbenos por WhatsApp.' } };
  }

  // 3. Validar
  const firstName = str(b['firstName'], 2, 60);
  const lastName = str(b['lastName'], 2, 60);
  const phone = normalizePhone(b['phone']);
  const email = isEmail(b['email']) ? (b['email'] as string).trim().toLowerCase() : null;
  const address1 = str(b['address1'], 5, 120);
  const address2 = typeof b['address2'] === 'string' ? b['address2'].trim().slice(0, 60) : '';
  const region = typeof b['region'] === 'string' && REGIONES[b['region']] ? b['region'] : null;
  const city = str(b['city'], 2, 60);
  const note = typeof b['note'] === 'string' ? b['note'].trim().slice(0, 300) : '';
  const q = b['quantity'];
  const quantity = typeof q === 'number' && Number.isInteger(q) && q >= 1 && q <= 10 ? q : null;
  const vId = b['variantId'];
  const variantId = typeof vId === 'string' && vId.startsWith('gid://shopify/ProductVariant/') ? vId : null;

  const missing = Object.entries({
    nombre: firstName, apellido: lastName, teléfono: phone, correo: email,
    dirección: address1, región: region, comuna: city, cantidad: quantity, producto: variantId,
  }).filter(([, v]) => !v).map(([k]) => k);

  if (missing.length || b['acceptTerms'] !== true) {
    return {
      status: 400,
      body: { ok: false, error: missing.length ? `Revisa: ${missing.join(', ')}` : 'Debes aceptar los términos y condiciones' },
    };
  }

  try {
    // 4. Precio REAL desde Shopify (nunca el que viene del navegador)
    const { productVariant: v } = await deps.admin<{
      productVariant: { id: string; price: string; availableForSale: boolean; product: { title: string; status: string } } | null;
    }>(VARIANT_QUERY, { id: variantId });

    if (!v || v.product.status !== 'ACTIVE' || !v.availableForSale) {
      return { status: 409, body: { ok: false, error: 'Este producto no está disponible en este momento.' } };
    }

    // 5. Crear el pedido (con o sin teléfono en los campos validados por Shopify)
    const createOrder = (withPhone: boolean) => {
      const address = {
        firstName, lastName, address1, address2, city,
        provinceCode: region, countryCode: 'CL',
        ...(withPhone ? { phone } : {}),
      };
      return deps.admin<OrderCreatePayload>(ORDER_CREATE, {
        order: {
          currency: 'CLP',
          email,
          ...(withPhone ? { phone } : {}),
          lineItems: [{
            variantId: v.id,
            quantity,
            priceSet: { shopMoney: { amount: v.price, currencyCode: 'CLP' } },
          }],
          shippingAddress: address,
          billingAddress: address,
          shippingLines: [{ title: 'Envío gratis', priceSet: { shopMoney: { amount: '0', currencyCode: 'CLP' } } }],
          financialStatus: 'PENDING',
          customer: { toUpsert: { email, firstName, lastName } },
          note: [withPhone ? '' : `Teléfono: ${phone}`, note].filter(Boolean).join('\n') || undefined,
          tags: ['contra-entrega', 'web-angular'],
          sourceName: 'web-angular',
          test: deps.testMode,
        },
        options: { inventoryBehaviour: 'DECREMENT_OBEYING_POLICY', sendReceipt: true },
      });
    };

    let { orderCreate } = await createOrder(true);

    // Si Shopify rechaza solo el teléfono, reintentamos sin él (queda en la nota)
    if (orderCreate.userErrors.some((e) => e.field?.includes('phone'))) {
      console.warn('[cod-order] teléfono rechazado por Shopify, reintentando sin él:', phone);
      ({ orderCreate } = await createOrder(false));
    }

    if (orderCreate.userErrors.length || !orderCreate.order) {
      console.error('[cod-order] userErrors', orderCreate.userErrors);
      return {
        status: 422,
        body: { ok: false, error: 'No pudimos crear tu pedido. Revisa tus datos o escríbenos por WhatsApp.' },
      };
    }

    return {
      status: 200,
      body: { ok: true, orderName: orderCreate.order.name, total: orderCreate.order.totalPriceSet.shopMoney },
    };
  } catch (err) {
    console.error('[cod-order]', err);
    return { status: 502, body: { ok: false, error: 'Hubo un problema. Intenta de nuevo o escríbenos por WhatsApp.' } };
  }
}