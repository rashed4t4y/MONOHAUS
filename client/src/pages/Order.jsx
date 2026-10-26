import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowRight, Check, LockKeyhole } from 'lucide-react';
import { api } from '../services/api.js';
import { useStore } from '../context/Store.jsx';
import { Breadcrumb, ErrorState, Loading, OrderItems, Status, Totals } from './CommerceUI.jsx';
import '../styles/commerce.css';
export default function Order() {
  const { id } = useParams();
  const { user, authReady } = useStore();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    if (!user) return;
    setOrder(null); setError('');
    api(`/orders/${encodeURIComponent(id)}`).then(result => { if (active) setOrder(result.order); }).catch(reason => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [id, user?.id, reload]);
  if (!authReady) return <div className="container commerce-page"><Loading /></div>;
  if (!user) return <div className="container commerce-page"><div className="commerce-state"><LockKeyhole size={28} /><h1>Your order, kept private.</h1><p>Sign in to view your order history.</p><Link className="button" to="/account">Sign in <ArrowRight size={16} /></Link></div></div>;
  if (error) return <div className="container commerce-page"><ErrorState error={error} retry={() => setReload(value => value + 1)} back="/account" /></div>;
  if (!order) return <div className="container commerce-page"><Loading text="Finding your order…" /></div>;
  return <div className="container commerce-page order-page"><Breadcrumb label={order.reference} parent="Your account" to="/account" /><div className="order-heading">{location.state?.confirmed && <div className="order-check"><Check size={26} /></div>}<p className="eyebrow">{location.state?.confirmed ? 'YOUR ORDER IS CONFIRMED' : 'YOUR MONOHAUS ORDER'}</p><h1>{location.state?.confirmed ? 'A good choice.' : 'The details, considered.'}</h1><p>{order.reference} · {new Date(order.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</p><Status status={order.status} /></div><div className="order-detail-layout"><section className="order-detail-card"><h2>Your essentials</h2><OrderItems items={order.items} /><Totals {...order} /></section><aside className="order-delivery"><h2>Delivery details</h2><p><strong>{order.customer.name}</strong><br />{order.customer.address}<br />{order.customer.city} {order.customer.postalCode}</p><p>{order.customer.email}<br />{order.customer.phone}</p>{order.customer.notes && <><h3>Your note</h3><p>{order.customer.notes}</p></>}<h3>Cash on Delivery · Demo</h3><p className="field-hint">Your order has been recorded. This fictional store does not collect payment or dispatch goods. No confirmation email has been sent.</p><Link className="text-link" to="/shop">Keep exploring <ArrowRight size={16} /></Link></aside></div></div>;
}

