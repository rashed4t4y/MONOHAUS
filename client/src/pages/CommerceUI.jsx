import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, LoaderCircle } from 'lucide-react';
import { money } from '../utils/format.js';

export function Loading({ text = 'A moment, please…' }) {
  return <div className="commerce-state" role="status"><LoaderCircle className="loading-spin" size={24} /><p>{text}</p></div>;
}
export function ErrorState({ error, retry, back = '/shop' }) {
  return <div className="commerce-state" role="alert"><p className="eyebrow">Something needs attention</p><h2>Let’s try that again.</h2><p>{error?.message || error || 'We couldn’t load this page.'}</p><div className="commerce-actions">{retry && <button className="button" onClick={retry}>Try again</button>}<Link className="text-link" to={back}>Back to the shop <ArrowRight size={16} /></Link></div></div>;
}
export function Field({ label, name, value, onChange, error, as = 'input', className = '', ...props }) {
  const Component = as;
  return <label className={`commerce-field ${className}`} htmlFor={name}><span>{label}</span><Component id={name} name={name} value={value} onChange={onChange} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? `${name}-error` : undefined} {...props} />{error && <small id={`${name}-error`} className="field-error">{error}</small>}</label>;
}
export function FormError({ message }) { return message ? <p className="form-error" role="alert">{message}</p> : null; }
export function Breadcrumb({ label, parent = 'Shop', to = '/shop' }) {
  return <nav className="commerce-breadcrumb" aria-label="Breadcrumb"><Link to={to}><ArrowLeft size={14} />{parent}</Link><span aria-hidden="true">/</span><span>{label}</span></nav>;
}
export function OrderItems({ items }) {
  return <div className="order-items">{items.map((item, index) => <div className="order-item" key={item.id || item.key || `${item.productId}-${index}`}><img src={item.image} alt={item.name} width="72" height="88" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/assets/fallback.svg'; }} /><div><strong>{item.name}</strong><p>{[item.color, item.size].filter(Boolean).join(' / ') || 'One size'}</p><small>Quantity {item.quantity}</small></div><span>{money(item.price * item.quantity)}</span></div>)}</div>;
}
export function Totals({ subtotal, shipping, total, estimated = false }) {
  return <dl className="order-totals"><div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div><div><dt>Shipping</dt><dd>{shipping === 0 ? 'Complimentary' : money(shipping)}</dd></div><div className="order-total"><dt>{estimated ? 'Estimated total' : 'Total'} <small>USD</small></dt><dd>{money(total)}</dd></div></dl>;
}
export function Status({ status }) { return <span className={`order-status status-${status}`}>{status}</span>; }
