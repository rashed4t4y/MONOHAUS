import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, LockKeyhole, Banknote } from 'lucide-react';
import { useStore } from '../context/Store.jsx';
import { api } from '../services/api.js';
import { Breadcrumb, Field, FormError, Loading, OrderItems, Totals } from './CommerceUI.jsx';
import '../styles/commerce.css';

function orderKey(fingerprint) {
  try { const previous = JSON.parse(sessionStorage.getItem('monohaus-checkout-attempt') || 'null'); if (previous?.fingerprint === fingerprint) return previous.key; } catch { /* Browser storage is optional. */ }
  const key = crypto.randomUUID();
  try { sessionStorage.setItem('monohaus-checkout-attempt', JSON.stringify({ fingerprint, key })); } catch { /* The in-memory key still protects this submission. */ }
  return key;
}
export default function Checkout() {
  const { user, authReady, cart, clearCart } = useStore();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState({ name: user?.name || '', email: user?.email || '', phone: '', address: '', city: '', postalCode: '', notes: '' });
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const attempted = useRef(null);
  const itemsJson = JSON.stringify(cart.map(({ productId, quantity, size, color }) => ({ productId, quantity, size, color })));
  useEffect(() => { if (user) setCustomer(previous => ({ ...previous, name: previous.name || user.name, email: previous.email || user.email })); }, [user?.id]);
  useEffect(() => {
    let active = true;
    if (!user || !cart.length) return;
    setQuote(null); setQuoteError('');
    api('/checkout/quote', { method: 'POST', body: { items: JSON.parse(itemsJson) } }).then(result => { if (active) setQuote(result); }).catch(reason => { if (active) setQuoteError(reason.message); });
    return () => { active = false; };
  }, [user?.id, itemsJson, reload]);
  const change = event => { const { name, value } = event.target; setCustomer(previous => ({ ...previous, [name]: value })); setFields(previous => ({ ...previous, [name]: '' })); };
  const submit = async event => {
    event.preventDefault();
    if (submitting.current || !quote) return;
    const invalid = {};
    for (const key of ['name', 'email', 'phone', 'address', 'city']) if (!customer[key].trim()) invalid[key] = 'Please complete this field.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) invalid.email = 'Enter a valid email address.';
    if (Object.keys(invalid).length) { setFields(invalid); setError('Please check the highlighted fields.'); return; }
    submitting.current = true; setBusy(true); setError(''); setFields({}); setUncertain(false);
    const payload = { items: JSON.parse(itemsJson), customer };
    const fingerprint = JSON.stringify(payload);
    if (attempted.current?.fingerprint !== fingerprint) attempted.current = { fingerprint, key: orderKey(fingerprint) };
    try {
      const { order } = await api('/checkout', { method: 'POST', body: { ...payload, idempotencyKey: attempted.current.key } });
      clearCart();
      try { sessionStorage.removeItem('monohaus-checkout-attempt'); } catch { /* Optional storage. */ }
      navigate(`/orders/${order.id}`, { replace: true, state: { confirmed: true } });
    } catch (reason) { setError(reason.message); setFields(reason.fields || {}); setUncertain(reason.status === 0); if (reason.status && reason.status !== 401 && reason.status !== 403) setReload(value => value + 1); }
    finally { submitting.current = false; setBusy(false); }
  };
  if (!authReady) return <div className="container commerce-page"><Loading /></div>;
  if (!user) return <div className="container commerce-page"><div className="commerce-state"><LockKeyhole size={28} /><p className="eyebrow">A LITTLE PEACE OF MIND</p><h1>Make it yours.</h1><p>Sign in to keep your order details secure and view your order history.</p><Link className="button" to="/account?next=/checkout">Sign in to checkout <ArrowRight size={17} /></Link></div></div>;
  if (!cart.length) return <div className="container commerce-page"><div className="commerce-state"><h1>Your bag is taking a breath.</h1><p>Find a few everyday essentials before checking out.</p><Link className="button" to="/shop">Explore the collection <ArrowRight size={17} /></Link></div></div>;
  return <div className="container commerce-page checkout-page"><Breadcrumb label="Checkout" /><div className="checkout-heading"><p className="eyebrow">THE FINAL DETAILS</p><h1>Almost yours.</h1><p>Thoughtful choices, ready for your everyday.</p></div><div className="checkout-layout"><form onSubmit={submit} className="checkout-form"><h2>01 / Contact & delivery</h2><p className="section-note">Required fields are marked with an asterisk.</p><FormError message={error} />{uncertain && <div className="checkout-recovery" role="status"><p>We could not confirm whether your order was saved. Retrying with unchanged details safely reuses the same request. Check your order history before changing your details or bag.</p><Link className="text-link" to="/account">Check your order history <ArrowRight size={14} /></Link></div>}<div className="commerce-form-grid"><Field label="Full name *" name="name" autoComplete="name" required maxLength={100} value={customer.name} onChange={change} error={fields.name} /><Field label="Email address *" name="email" type="email" autoComplete="email" required maxLength={254} value={customer.email} onChange={change} error={fields.email} /><Field className="span-two" label="Phone number *" name="phone" type="tel" autoComplete="tel" required maxLength={30} value={customer.phone} onChange={change} error={fields.phone} /><Field className="span-two" label="Street address *" name="address" autoComplete="street-address" required maxLength={250} value={customer.address} onChange={change} error={fields.address} /><Field label="City *" name="city" autoComplete="address-level2" required maxLength={100} value={customer.city} onChange={change} error={fields.city} /><Field label="Postal code (where applicable)" name="postalCode" autoComplete="postal-code" maxLength={20} value={customer.postalCode} onChange={change} error={fields.postalCode} /><Field className="span-two" label="Order notes (optional)" name="notes" as="textarea" rows={3} maxLength={1000} value={customer.notes} onChange={change} error={fields.notes} /></div><section className="checkout-payment"><h2>02 / Payment</h2><div className="payment-option"><Banknote size={22} /><div><strong>Cash on Delivery</strong><p>Demonstration only. No payment is collected and no goods are dispatched.</p></div><span aria-hidden="true" className="payment-selected" /></div></section><button className="button full-width" disabled={busy || !quote} type="submit">{busy ? 'Placing your order…' : 'Place demo order'} <ArrowRight size={17} /></button><p className="checkout-disclaimer"><LockKeyhole size={13} /> Your order is saved securely to your account. Prices and stock are checked by the server.</p></form><aside className="checkout-summary"><p className="eyebrow">YOUR CONSIDERED CHOICES</p><h2>In the bag.</h2><OrderItems items={quote?.items || cart} />{quoteError ? <div><FormError message={quoteError} /><p className="field-hint">Review your bag if a piece is unavailable or a selection has changed.</p><button className="button button-outline" onClick={() => setReload(value => value + 1)}>Refresh totals</button></div> : !quote ? <Loading text="Confirming prices and availability…" /> : <Totals {...quote} />}<Link className="text-link" to="/cart">Edit your bag <ArrowRight size={14} /></Link></aside></div></div>;
}



