export const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);
export const categories = ['Clothing', 'Footwear', 'Sneakers', 'Bags', 'Accessories', 'Watches', 'Lifestyle'];
