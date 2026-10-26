import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, LogOut, Package, UserRound } from 'lucide-react';
import { useStore } from '../context/Store.jsx';
import { api } from '../services/api.js';
import { money } from '../utils/format.js';
import { Field, FormError, Loading, Status } from './CommerceUI.jsx';
import '../styles/commerce.css';

export default function Account() {
  const { user, authReady, login, register, logout } = useStore();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const [orders, setOrders] = useState(null);
  const [reload, setReload] = useState(0);
  const next = ['/checkout', '/admin'].includes(params.get('next')) ? params.get('next') : '';
  useEffect(() => {
    let active = true;
    if (user) {
      if (next) { navigate(next, { replace: true }); return; }
      setOrders(null);
      api('/account').then(result => { if (active) setOrders(result.orders); }).catch(reason => { if (active) setError(reason.message); });
    }
    return () => { active = false; };
  }, [user?.id, next, reload, navigate]);
  const change = event => { const { name, value } = event.target; setValues(previous => ({ ...previous, [name]: value })); setFields(previous => ({ ...previous, [name]: '' })); };
  const submit = async event => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(''); setFields({});
    try { if (mode === 'register') await register(values.name, values.email, values.password); else await login(values.email, values.password); setValues({ name: '', email: '', password: '' }); if (next) navigate(next, { replace: true }); }
    catch (reason) { setError(reason.message); setFields(reason.fields || {}); }
    finally { setBusy(false); }
  };
  const signOut = async () => { setBusy(true); setError(''); try { await logout(); setOrders(null); setValues({ name: '', email: '', password: '' }); } catch (reason) { setError(reason.message); } finally { setBusy(false); } };
  if (!authReady) return <div className="container commerce-page"><Loading /></div>;
  if (!user) return <div className="container commerce-page account-auth"><div className="auth-intro"><p className="eyebrow">YOUR MONOHAUS</p><h1>A place for<br />your everyday.</h1><p>Keep your details, revisit your orders, and make room for the things you love.</p><div className="auth-note"><UserRound size={21} /><p>{next === '/checkout' ? 'Sign in or create an account to securely place and access your order.' : 'A simple account. All your essentials in one place.'}</p></div></div><section className="auth-panel" aria-label="Account access"><div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} aria-pressed={mode === 'login'} onClick={() => { setMode('login'); setError(''); setFields({}); }}>Sign in</button><button className={mode === 'register' ? 'active' : ''} aria-pressed={mode === 'register'} onClick={() => { setMode('register'); setError(''); setFields({}); }}>Create account</button></div><h2>{mode === 'login' ? 'Welcome back.' : 'Make yourself at home.'}</h2><form onSubmit={submit}><FormError message={error} />{mode === 'register' && <Field label="Your name" name="name" autoComplete="name" required minLength={2} maxLength={100} value={values.name} onChange={change} error={fields.name} />}<Field label="Email address" name="email" type="email" autoComplete="email" required maxLength={254} value={values.email} onChange={change} error={fields.email} /><Field label="Password" name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={mode === 'register' ? 12 : 1} maxLength={128} value={values.password} onChange={change} error={fields.password} />{mode === 'register' && <p className="field-hint">Use at least 12 characters. A memorable phrase works well.</p>}<button className="button full-width" disabled={busy} type="submit">{busy ? 'A moment…' : mode === 'login' ? 'Sign in' : 'Create account'}<ArrowRight size={17} /></button><p className="auth-legal">By continuing, you acknowledge our <Link to="/policies/privacy">privacy policy</Link>. This is a demonstration store.</p></form></section></div>;
  return <div className="container commerce-page"><div className="account-heading"><div><p className="eyebrow">YOUR MONOHAUS</p><h1>Hello, {user.name.split(' ')[0]}.</h1><p>Good to have you here.</p></div><button className="button button-outline" disabled={busy} onClick={signOut}><LogOut size={16} />Sign out</button></div><FormError message={error} /><div className="account-layout"><aside className="profile-panel"><UserRound size={24} /><h2>Your details</h2><strong>{user.name}</strong><p>{user.email}</p><p className="field-hint">Your account keeps your order history private.</p>{user.role === 'admin' && <Link className="text-link" to="/admin">Open administration <ArrowRight size={16} /></Link>}</aside><section className="account-orders"><div className="commerce-section-title"><h2>Your orders</h2><button className="text-link" onClick={() => { setError(''); setReload(value => value + 1); }}>Refresh</button></div>{orders === null ? error ? <p>Order history is temporarily unavailable. Use Refresh to try again.</p> : <Loading text="Loading your orders…" /> : !orders.length ? <div className="commerce-state"><Package size={28} /><h3>Your story starts here.</h3><p>Your orders will appear here once you find your first essential.</p><Link className="button" to="/shop">Explore the collection <ArrowRight size={16} /></Link></div> : <div className="account-order-list">{orders.map(order => <Link to={`/orders/${order.id}`} className="account-order-row" key={order.id}><div><strong>{order.reference}</strong><small>{new Date(order.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</small></div><Status status={order.status} /><strong>{money(order.total)}</strong><ArrowRight size={18} /></Link>)}</div>}</section></div></div>;
}

