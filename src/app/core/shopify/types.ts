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

export interface Variant {
  id: string;
  title: string;
  availableForSale: boolean;
  selectedOptions: { name: string; value: string }[];
  price: Money;
  compareAtPrice: Money | null;
  image: ShopifyImage | null;
}

export interface ProductDetail {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  images: { nodes: ShopifyImage[] };
  options: { name: string; optionValues: { name: string }[] }[];
  variants: { nodes: Variant[] };
}

export interface CartLine {
  id: string;
  quantity: number;
  cost: { totalAmount: Money };
  merchandise: {
    id: string;
    title: string;
    image: ShopifyImage | null;
    price: Money;
    product: { handle: string; title: string };
  };
}

export interface Cart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: { subtotalAmount: Money; totalAmount: Money };
  lines: { nodes: CartLine[] };
}

export interface UserError {
  field: string[] | null;
  message: string;
}