import { HttpError } from './errors.js';
export const CATEGORIES = ['Clothing', 'Footwear', 'Sneakers', 'Bags', 'Accessories', 'Watches', 'Lifestyle'];
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const text = value => typeof value === 'string' ? value.trim() : '';
export const validEmail = value => typeof value === 'string' && value.length <= 254 && EMAIL.test(value);
export function validatedCustomer(input = {}) {
  const customer = Object.fromEntries(['name', 'email', 'phone', 'address', 'city', 'postalCode', 'notes'].map(key => [key, text(input?.[key])]));
  customer.email = customer.email.toLowerCase();
  const fields = {};
  if (customer.name.length < 2 || customer.name.length > 100) fields.name = 'Enter a name between 2 and 100 characters.';
  if (!validEmail(customer.email)) fields.email = 'Enter a valid email address.';
  if (!/^[+\d() .-]{7,25}$/.test(customer.phone) || customer.phone.replace(/\D/g, '').length < 7) fields.phone = 'Enter a valid phone number.';
  if (customer.address.length < 5 || customer.address.length > 250) fields.address = 'Enter a street address between 5 and 250 characters.';
  if (customer.city.length < 2 || customer.city.length > 100) fields.city = 'Enter a city between 2 and 100 characters.';
  if (customer.postalCode.length > 20) fields.postalCode = 'Use 20 characters or fewer.';
  if (customer.notes.length > 1000) fields.notes = 'Use 1,000 characters or fewer.';
  if (Object.keys(fields).length) throw new HttpError(422, 'Please check your shipping information.', fields);
  return customer;
}
export function validatedProduct(input, existing) {
  const data = { ...existing, ...input }; const fields = {}; const out = {};
  for (const [key, min, max] of [['name', 2, 120], ['description', 10, 4000], ['sku', 3, 50]]) {
    out[key] = text(data[key]);
    if (out[key].length < min || out[key].length > max) fields[key] = `Use between ${min} and ${max} characters.`;
  }
  out.sku = out.sku.toUpperCase();
  if (!/^[A-Z0-9_-]+$/.test(out.sku)) fields.sku = 'Use letters, numbers, hyphens or underscores.';
  out.category = text(data.category);
  if (!CATEGORIES.includes(out.category)) fields.category = 'Choose a valid category.';
  for (const [key, min, max] of [['price', 1, 10000000], ['stock', 0, 100000]]) {
    out[key] = data[key];
    if (!Number.isSafeInteger(out[key]) || out[key] < min || out[key] > max) fields[key] = `Enter a whole number from ${min} to ${max}${key === 'price' ? ' in cents' : ''}.`;
  }
  out.salePrice = data.salePrice ?? null;
  if (out.salePrice !== null && (!Number.isSafeInteger(out.salePrice) || out.salePrice < 1 || out.salePrice >= out.price)) fields.salePrice = 'Sale price must be positive whole cents below the regular price.';
  const imagePattern = /^\/assets\/[a-zA-Z0-9_\-/]+\.(?:jpg|jpeg|png|webp|svg)$/;
  out.image = text(data.image);
  if (!imagePattern.test(out.image) || out.image.includes('..')) fields.image = 'Choose a local /assets/ image path.';
  for (const key of ['images', 'sizes', 'colors']) {
    out[key] = data[key] ?? [];
    if (!Array.isArray(out[key]) || out[key].length > 16 || out[key].some(value => typeof value !== 'string' || !value.trim() || value.length > (key === 'images' ? 250 : 40))) { fields[key] = 'Enter a list of up to 16 nonempty values.'; continue; }
    out[key] = [...new Set(out[key].map(value => value.trim()))];
    if (key === 'images' && out[key].some(value => !imagePattern.test(value) || value.includes('..'))) fields.images = 'Gallery images must use local /assets/ paths.';
  }
  for (const key of ['isNew', 'featured']) { out[key] = data[key] ?? false; if (typeof out[key] !== 'boolean') fields[key] = 'Use true or false.'; }
  if (Object.keys(fields).length) throw new HttpError(422, 'Please check the product details.', fields);
  return out;
}
