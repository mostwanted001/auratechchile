export interface Money { amount: string; currencyCode: string; }
export interface ShopifyImage { url: string; altText: string | null; width: number; height: number; }

export interface ProductCard {
  id: string;
  handle: string;
  title: string;
  featuredImage: ShopifyImage | null;
  priceRange: { minVariantPrice: Money };
}

export interface Money {
  amount: string;
  currencyCode: string;
}

export interface ShopifyImage {
  url: string;
  altText: string | null;
  width: number;
  height: number;
}