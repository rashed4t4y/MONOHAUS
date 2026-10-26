import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, session, authEvents } from '../services/api.js';
const Store = createContext(null);
function initialCart() {
  try {
    const data = JSON.parse(localStorage.getItem('monohaus-cart') || '[]');
    return Array.isArray(data) ? data.filter(item => item && typeof item.key === 'string' && Number.isInteger(item.productId) && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99 && Number.isInteger(item.price) && item.price >= 0).slice(0, 50) : [];
  } catch { return []; }
}
export function StoreProvider({ children }) {
  const [cart, setCart] = useState(initialCart);
  const [cartIsOpen, setCartIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [toast, setToast] = useState(null);
  const notify = useCallback(message => setToast({ message, id: Date.now() }), []);
  const refreshUser = useCallback(async () => {
    try { const data = await session(); setUser(data.user); return data.user; }
    finally { setAuthReady(true); }
  }, []);
  useEffect(() => { refreshUser().catch(() => {}); }, [refreshUser]);
  useEffect(() => { const expired = () => setUser(null); authEvents.addEventListener('expired', expired); return () => authEvents.removeEventListener('expired', expired); }, []);
  useEffect(() => { try { localStorage.setItem('monohaus-cart', JSON.stringify(cart)); } catch {} }, [cart]);
  useEffect(() => { if (toast) { const id = setTimeout(() => setToast(null), 4000); return () => clearTimeout(id); } }, [toast]);
  function addToCart(product, { quantity = 1, size = '', color = '' } = {}) {
    if (!product.stock) { notify('This piece is currently sold out.'); return false; }
    size ||= product.sizes?.[0] || ''; color ||= product.colors?.[0] || '';
    const key = product.id + ':' + size + ':' + color;
    const allQuantity = cart.filter(item => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0);
    if (allQuantity + quantity > product.stock) { notify('Only ' + product.stock + ' available. Check the quantity in your bag.'); return false; }
    setCart(items => {
      const existing = items.find(item => item.key === key);
      return existing ? items.map(item => item.key === key ? { ...item, quantity: item.quantity + quantity } : item) : [...items, { key, productId: product.id, name: product.name, image: product.image, price: product.salePrice ?? product.price, quantity, size, color, stock: product.stock }];
    });
    notify(product.name + ' added to your bag.'); return true;
  }
  function updateQuantity(key, quantity) {
    if (quantity < 1) return;
    const target = cart.find(item => item.key === key); if (!target) return;
    const others = cart.filter(item => item.productId === target.productId && item.key !== key).reduce((sum, item) => sum + item.quantity, 0);
    if (quantity + others > target.stock || quantity > 99) return notify('The requested quantity exceeds available stock.');
    setCart(items => items.map(item => item.key === key ? { ...item, quantity } : item));
  }
  async function login(email, password) { const data = await api('/auth/login', { method: 'POST', body: { email, password } }); setUser(data.user); return data.user; }
  async function register(name, email, password) { const data = await api('/auth/register', { method: 'POST', body: { name, email, password } }); setUser(data.user); return data.user; }
  async function logout() { await api('/auth/logout', { method: 'POST' }); setUser(null); notify('You have been signed out.'); }
  const value = { user, setUser, authReady, refreshUser, login, register, logout, cart, addToCart, updateQuantity, removeFromCart: key => setCart(items => items.filter(item => item.key !== key)), clearCart: () => setCart([]), cartCount: cart.reduce((s, i) => s + i.quantity, 0), cartSubtotal: cart.reduce((s, i) => s + i.price * i.quantity, 0), cartIsOpen, openCart: () => setCartIsOpen(true), closeCart: () => setCartIsOpen(false), toast, notify };
  return <Store.Provider value={value}>{children}</Store.Provider>;
}
export const useStore = () => useContext(Store);


