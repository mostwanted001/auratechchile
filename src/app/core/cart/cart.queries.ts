const CART_FIELDS = `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost {
      subtotalAmount { amount currencyCode }
      totalAmount { amount currencyCode }
    }
    lines(first: 50) {
      nodes {
        id
        quantity
        cost { totalAmount { amount currencyCode } }
        merchandise {
          ... on ProductVariant {
            id
            title
            image { url altText width height }
            price { amount currencyCode }
            product { handle title }
          }
        }
      }
    }
  }
`;

export const CART_QUERY = `
  query Cart($id: ID!) @inContext(country: CL, language: ES) {
    cart(id: $id) { ...CartFields }
  }
  ${CART_FIELDS}
`;

export const CART_CREATE = `
  mutation CartCreate($lines: [CartLineInput!]!) @inContext(country: CL, language: ES) {
    cartCreate(input: { lines: $lines, buyerIdentity: { countryCode: CL } }) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
  ${CART_FIELDS}
`;

export const CART_LINES_ADD = `
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) @inContext(country: CL, language: ES) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
  ${CART_FIELDS}
`;

export const CART_LINES_UPDATE = `
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) @inContext(country: CL, language: ES) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
  ${CART_FIELDS}
`;

export const CART_LINES_REMOVE = `
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) @inContext(country: CL, language: ES) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
  ${CART_FIELDS}
`;