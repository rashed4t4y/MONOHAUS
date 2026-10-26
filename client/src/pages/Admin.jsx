import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Package, Pencil, Plus, Search, ShieldCheck, X } from 'lucide-react';
import { useStore } from '../context/Store.jsx';
import { api } from '../services/api.js';
import { money } from '../utils/format.js';
import { Field, FormError, Loading, OrderItems, Status, Totals } from './CommerceUI.jsx';
import '../styles/commerce.css';
const emptyProduct = { name: '', description: '', category: 'Clothing', sku: '', price: '', salePrice: '', stock: '0', image: '/assets/', colors: '', sizes: '', images: '', isNew: false, featured: false };
const transitions = { pending: ['processing', 'cancelled'], processing: ['shipped', 'cancelled'], shipped: ['delivered'], delivered: [], cancelled: [] };
function editable(product) { return { ...product, price: (product.price / 100).toFixed(2), salePrice: product.salePrice == null ? '' : (product.salePrice / 100).toFixed(2), colors: product.colors.join(', '), sizes: product.sizes.join(', '), images: product.images.join(', ') }; }
function ProductEditor({ initial, onClose, onSaved }) {
  const [values, setValues] = useState(initial ? editable(initial) : { ...emptyProduct });
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);
  const change = event => { const { name, value, checked, type } = event.target; setValues(previous => ({ ...previous, [name]: type === 'checkbox' ? checked : value })); setFields(previous => ({ ...previous, [name]: '' })); };
  const save = async event => {
    event.preventDefault(); if (busy) return; setBusy(true); setError(''); setFields({});
    const split = value => value.split(',').map(part => part.trim()).filter(Boolean);
    const body = { name: values.name, description: values.description, category: values.category, sku: values.sku, price: Math.round(Number(values.price) * 100), salePrice: values.salePrice === '' ? null : Math.round(Number(values.salePrice) * 100), stock: Number(values.stock), image: values.image, colors: split(values.colors), sizes: split(values.sizes), images: split(values.images), isNew: values.isNew, featured: values.featured };
    try { await api(initial ? `/admin/products/${initial.id}` : '/admin/products', { method: initial ? 'PATCH' : 'POST', body }); onSaved(initial ? 'Product updated.' : 'Product created.'); }
    catch (reason) { setError(reason.message); setFields(reason.fields || {}); }
    finally { setBusy(false); }
  };
  return <section className="admin-editor"><div className="commerce-section-title"><div><p className="eyebrow">PRODUCT DETAILS</p><h2>{initial ? 'Refine this piece.' : 'Add something considered.'}</h2></div><button className="admin-icon-button" onClick={onClose} aria-label="Close product editor"><X size={21} /></button></div><form onSubmit={save}><FormError message={error} /><div className="commerce-form-grid"><Field label="Product name" name="name" required maxLength={120} value={values.name} onChange={change} error={fields.name} /><Field label="SKU" name="sku" required maxLength={64} value={values.sku} onChange={change} error={fields.sku} /><Field className="span-two" label="Description" name="description" as="textarea" rows={3} required maxLength={2000} value={values.description} onChange={change} error={fields.description} /><label className="commerce-field"><span>Category</span><select name="category" value={values.category} onChange={change}>{['Clothing', 'Footwear', 'Sneakers', 'Bags', 'Accessories', 'Watches', 'Lifestyle'].map(category => <option key={category} value={category}>{category}</option>)}</select>{fields.category && <small className="field-error">{fields.category}</small>}</label><Field label="Stock quantity" name="stock" type="number" min="0" max="100000" step="1" required value={values.stock} onChange={change} error={fields.stock} /><Field label="Price (USD)" name="price" type="number" min="0.01" max="100000" step="0.01" required value={values.price} onChange={change} error={fields.price} /><Field label="Sale price (USD, optional)" name="salePrice" type="number" min="0.01" max="100000" step="0.01" value={values.salePrice} onChange={change} error={fields.salePrice} /><Field className="span-two" label="Main image path" name="image" required maxLength={400} value={values.image} onChange={change} error={fields.image} /><Field label="Colors (comma separated)" name="colors" maxLength={400} value={values.colors} onChange={change} error={fields.colors} /><Field label="Sizes (comma separated)" name="sizes" maxLength={400} value={values.sizes} onChange={change} error={fields.sizes} /><Field className="span-two" label="Additional image paths (comma separated)" name="images" maxLength={2000} value={values.images} onChange={change} error={fields.images} /><div className="admin-checkboxes span-two"><label><input name="isNew" type="checkbox" checked={values.isNew} onChange={change} />New arrival</label><label><input name="featured" type="checkbox" checked={values.featured} onChange={change} />Featured piece</label></div></div><p className="field-hint">Use licensed photographs stored in client/public/assets, with a path such as /assets/linen-shirt.jpg. Images are not uploaded through this editor.</p><div className="commerce-actions"><button className="button" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save product'}<ArrowRight size={17} /></button><button className="button button-outline" disabled={busy} type="button" onClick={onClose}>Cancel</button></div></form></section>;
}
function AdminOrder({ order, onUpdated }) {
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const save = async event => {
    event.preventDefault(); if (!status || busy) return;
    if (status === 'cancelled' && !confirm) { setConfirm(true); return; }
    setBusy(true); setError('');
    try { await api(`/admin/orders/${order.id}`, { method: 'PATCH', body: { status } }); onUpdated('Order status updated.'); setStatus(''); }
    catch (reason) { setError(reason.message); }
    finally { setBusy(false); setConfirm(false); }
  };
  return <details className="admin-order"><summary><span><strong>{order.reference}</strong><small>{order.customer.name} · {new Date(order.createdAt).toLocaleDateString()}</small></span><Status status={order.status} /><strong>{money(order.total)}</strong></summary><div className="admin-order-content"><div><h3>Order items</h3><OrderItems items={order.items} /><Totals {...order} /></div><div><h3>Customer & delivery</h3><p>{order.customer.name}<br />{order.customer.email}<br />{order.customer.phone}</p><p>{order.customer.address}<br />{order.customer.city} {order.customer.postalCode}</p>{order.customer.notes && <p>Note: {order.customer.notes}</p>}<FormError message={error} />{transitions[order.status]?.length ? <form onSubmit={save} className="admin-status-form"><label className="commerce-field"><span>Update status</span><select value={status} required onChange={event => { setStatus(event.target.value); setConfirm(false); }}><option value="">Choose next status</option>{transitions[order.status].map(value => <option key={value} value={value}>{value}</option>)}</select></label>{confirm && <p className="field-hint">Cancel this order and return its quantities to stock? This action cannot be undone.</p>}<button className="button" disabled={!status || busy}>{busy ? 'Updating…' : confirm ? 'Confirm cancellation' : 'Update order'}</button></form> : <p className="field-hint">This order has reached its final status.</p>}</div></div></details>;
}
export default function Admin() {
  const { user, authReady, notify } = useStore();
  const [tab, setTab] = useState('products');
  const [data, setData] = useState(null);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [editor, setEditor] = useState(null);
  const [archiving, setArchiving] = useState(null);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    if (user?.role !== 'admin') return;
    setData(null); setError('');
    const path = tab === 'products' ? `/admin/products?search=${encodeURIComponent(search)}&page=${page}&limit=20` : `/admin/orders?page=${page}`;
    api(path).then(result => { if (active) setData(result); }).catch(reason => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [user?.id, tab, search, page, reload]);
  const updated = message => { notify(message); setEditor(null); setReload(value => value + 1); };
  const archive = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try { await api(`/admin/products/${archiving.id}`, { method: 'DELETE', body: { confirmation } }); setArchiving(null); setConfirmation(''); updated('Product archived. Existing order records are preserved.'); }
    catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  };
  if (!authReady) return <div className="container commerce-page"><Loading /></div>;
  if (!user) return <div className="container commerce-page"><div className="commerce-state"><ShieldCheck size={28} /><h1>Behind the collection.</h1><p>Sign in with an administrator account to manage MONOHAUS.</p><Link className="button" to="/account?next=/admin">Administrator sign in <ArrowRight size={16} /></Link></div></div>;
  if (user.role !== 'admin') return <div className="container commerce-page"><div className="commerce-state"><ShieldCheck size={28} /><h1>This space is private.</h1><p>Your account does not have administrator access.</p><Link className="button" to="/account">Your account <ArrowRight size={16} /></Link></div></div>;
  return <div className="container commerce-page admin-page"><div className="account-heading"><div><p className="eyebrow">MONOHAUS / ADMINISTRATION</p><h1>Behind the collection.</h1><p>Considered pieces. Every detail in order.</p></div><Link className="text-link" to="/shop">View storefront <ArrowRight size={16} /></Link></div><div className="admin-tabs"><button className={tab === 'products' ? 'active' : ''} onClick={() => { setTab('products'); setPage(1); setEditor(null); }}>Products</button><button className={tab === 'orders' ? 'active' : ''} onClick={() => { setTab('orders'); setPage(1); setEditor(null); }}>Orders</button></div><FormError message={error} />{editor !== null && <ProductEditor key={editor.id || 'new'} initial={editor.id ? editor : null} onClose={() => setEditor(null)} onSaved={updated} />}{tab === 'products' && <div className="admin-toolbar"><form className="catalog-search" onSubmit={event => { event.preventDefault(); setSearch(query); setPage(1); }}><label className="sr-only" htmlFor="admin-search">Search products</label><Search size={17} /><input id="admin-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search products or SKU" /><button aria-label="Search products"><ArrowRight size={17} /></button></form><button className="button" onClick={() => setEditor({})}><Plus size={17} />Add product</button></div>}
    {archiving && <section className="archive-confirmation"><h2>Archive {archiving.name}?</h2><p>This removes the piece from the storefront and preserves existing orders. Products in active orders cannot be archived.</p><form onSubmit={archive}><Field label={`Type ${archiving.sku} to confirm`} name="archive-confirmation" required value={confirmation} onChange={event => setConfirmation(event.target.value)} /><div className="commerce-actions"><button className="button" disabled={busy || confirmation !== archiving.sku}>{busy ? 'Archiving…' : 'Archive product'}</button><button className="button button-outline" type="button" onClick={() => { setArchiving(null); setConfirmation(''); }}>Keep product</button></div></form></section>}
    {!data || !Array.isArray(data[tab]) ? error ? <button className="button button-outline" onClick={() => setReload(value => value + 1)}>Try again</button> : <Loading text="Opening the workroom…" /> : tab === 'products' ? <><div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Product management table. Scroll horizontally to see all columns."><table className="admin-table"><thead><tr><th>Piece</th><th>Price</th><th>Stock</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{data.products.map(product => <tr key={product.id}><td><div className="admin-product-name"><img src={product.image} alt="" width="48" height="60" /><div><strong>{product.name}</strong><small>{product.sku} · {product.category}</small></div></div></td><td>{money(product.salePrice ?? product.price)}</td><td>{product.stock}</td><td>{product.active === false ? 'Archived' : product.stock ? 'Active' : 'Sold out'}</td><td><div className="admin-row-actions"><button className="admin-icon-button" aria-label={`Edit ${product.name}`} onClick={() => { setEditor(product); setArchiving(null); window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }}><Pencil size={16} /></button>{product.active !== false && <button className="text-link" onClick={() => { setArchiving(product); setConfirmation(''); }}>Archive</button>}</div></td></tr>)}</tbody></table></div>{!data.products.length && <div className="commerce-state"><Package size={28} /><p>No products found.</p></div>}{data.pages > 1 && <nav className="catalog-pagination" aria-label="Admin product pages"><button className="button button-outline" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button><span>{page} / {data.pages}</span><button className="button button-outline" disabled={page >= data.pages} onClick={() => setPage(value => value + 1)}>Next</button></nav>}</> : data.orders.length ? <><div className="admin-orders">{data.orders.map(order => <AdminOrder key={`${order.id}-${order.status}`} order={order} onUpdated={updated} />)}</div>{data.pages > 1 && <nav className="catalog-pagination" aria-label="Admin order pages"><button className="button button-outline" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button><span>{page} / {data.pages}</span><button className="button button-outline" disabled={page >= data.pages} onClick={() => setPage(value => value + 1)}>Next</button></nav>}</> : <div className="commerce-state"><Package size={28} /><h2>All quiet here.</h2><p>New orders will appear in this space.</p></div>}
  </div>;
}




