import products from "./catalog.json";
export { products };
export class ApiError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.status = status;
  }
}
export function resolveLine(line) {
  if (!line || typeof line !== "object" || Array.isArray(line))
    throw new ApiError("invalid_product");
  const product = products.find((p) => p.id === line.productId);
  const variant = product?.variants.find((v) => v.id === line.variantId);
  if (!product || !variant) throw new ApiError("invalid_product");
  if (
    !Number.isInteger(line.quantity) ||
    line.quantity < 1 ||
    line.quantity > 10
  )
    throw new ApiError("invalid_quantity");
  if (!variant.available) throw new ApiError("unavailable");
  return {
    productId: product.id,
    variantId: variant.id,
    quantity: line.quantity,
    name: product.name,
    nameAr: product.nameAr,
    label: variant.label,
    price: variant.price,
    image: product.images[0],
  };
}
export function quote(cart) {
  if (!Array.isArray(cart) || cart.length > 20)
    throw new ApiError("invalid_cart");
  const seen = new Set();
  const items = cart.map((line) => {
    const item = resolveLine(line);
    if (seen.has(item.variantId)) throw new ApiError("invalid_cart");
    seen.add(item.variantId);
    return item;
  });
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const shipping = subtotal === 0 || subtotal >= 100000 ? 0 : 2500;
  return {
    items,
    subtotal,
    shipping,
    total: subtotal + shipping,
    vat: Math.round((subtotal + shipping) / 21),
  };
}
export function validateProfile(p) {
  if (
    !p ||
    !["fresh", "floral", "woody", "spiced", "sweet", "oud"].includes(
      p.family,
    ) ||
    !["perfume", "oud", "oil", "any"].includes(p.format) ||
    ![15000, 35000, 1000000].includes(p.budget)
  )
    throw new ApiError("invalid_profile");
  return { family: p.family, format: p.format, budget: p.budget };
}
