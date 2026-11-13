export interface Env {
  SHOPIFY_STORE_DOMAIN: string;
  SHOPIFY_API_VERSION: string;
  SHOPIFY_STOREFRONT_PRIVATE_TOKEN: string;
  SHOPIFY_ADMIN_CLIENT_ID: string;
  SHOPIFY_ADMIN_CLIENT_SECRET: string;
  COD_TEST_MODE: string;
  AURA_KV: KVNamespace; // límite por IP y caché del token Admin
}