import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Check, Minus, Plus, Truck } from 'lucide-react';
import { api } from '../services/api.js';
import { money } from '../utils/format.js';
import { useStore } from '../context/Store.jsx';
import ProductGrid from '../components/ProductGrid.jsx';
import { Breadcrumb, ErrorState, FormError, Loading } from './CommerceUI.jsx';
import '../styles/commerce.css';
export default function Product() {
  const { id } = useParams();
  const { addToCart, openCart } = useStore();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [reload, setReload] = useState(0);
  const [selectedImage, setSelectedImage] = useState('');
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  useEffect(() => {
    let active = true; setData(null); setError(''); setActionError(''); setQuantity(1); setSize('');
    api(`/products/${encodeURIComponent(id)}`).then(result => { if (active) { setData(result); setSelectedImage(result.product.image); setColor(result.product.colors?.[0] || ''); } }).catch(reason => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [id, reload]);
  if (error) return <div className="container commerce-page"><ErrorState error={error} retry={() => setReload(value => value + 1)} /></div>;
  if (!data) return <div className="container commerce-page"><Loading /></div>;
  const { product, related } = data;
  const gallery = [...new Set([product.image, ...(product.images || [])])];
  const add = async () => {
    if (product.sizes?.length && !size) { setActionError('Please choose your size.'); return; }
    setActionError('');
    try { const added = await addToCart(product, { quantity, size, color }); if (added !== false) openCart(); } catch (reason) { setActionError(reason.message); }
  };
  return <div className="container commerce-page product-page"><Breadcrumb label={product.name} />
    <div className="product-detail"><div className="product-gallery"><div className="product-main-image"><img src={selectedImage} alt={`${product.name}${color ? ` in ${color}` : ''}`} width="900" height="1100" fetchPriority="high" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/assets/fallback.svg'; }} />{product.isNew && <span className="product-editorial-label">NEW PERSPECTIVE</span>}</div>{gallery.length > 1 && <div className="product-thumbnails" aria-label="Product photographs">{gallery.map((image, index) => <button key={image} aria-label={`View photograph ${index + 1}`} aria-pressed={selectedImage === image} onClick={() => setSelectedImage(image)}><img src={image} alt={`${product.name}, view ${index + 1}`} width="80" height="96" /></button>)}</div>}</div>
    <div className="product-information"><p className="eyebrow">{product.category} / THE EVERYDAY COLLECTION</p><h1>{product.name}</h1><p className="detail-price">{money(product.salePrice ?? product.price)}{product.salePrice != null && <del>{money(product.price)}</del>}</p><p className="product-description">{product.description}</p>
      {!!product.colors?.length && <fieldset className="variant-select"><legend>Color <span>{color}</span></legend><div>{product.colors.map(option => <button type="button" key={option} className={color === option ? 'selected' : ''} aria-pressed={color === option} onClick={() => setColor(option)}>{option}</button>)}</div></fieldset>}
      {!!product.sizes?.length && <fieldset className="variant-select"><legend>Size <span>{size || 'Select your size'}</span></legend><div>{product.sizes.map(option => <button type="button" key={option} className={size === option ? 'selected' : ''} aria-pressed={size === option} onClick={() => { setSize(option); setActionError(''); }}>{option}</button>)}</div></fieldset>}
      <FormError message={actionError} /><div className="product-purchase"><div className="quantity-control"><button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity(value => value - 1)}><Minus size={16} /></button><output aria-live="polite" aria-label="Quantity">{quantity}</output><button type="button" aria-label="Increase quantity" disabled={quantity >= Math.min(product.stock, 20)} onClick={() => setQuantity(value => value + 1)}><Plus size={16} /></button></div><button className="button" disabled={!product.stock} onClick={add}>{product.stock ? 'Add to bag' : 'Sold out'} <ArrowRight size={18} /></button></div>
      <p className="stock-note"><Check size={14} />{product.stock ? `In stock · ${product.stock < 6 ? `only ${product.stock} remaining` : 'ready for your everyday'}` : 'Currently unavailable'}</p><div className="product-shipping"><Truck size={20} /><div><strong>A little less to think about.</strong><p>Complimentary shipping on orders of $150 or more. Otherwise $8.</p><Link to="/policies/shipping">Shipping details <ArrowRight size={13} /></Link></div></div>
      <details className="product-details-disclosure"><summary>The details</summary><p>{product.description}</p><p>SKU: {product.sku}</p><p>Product photography is illustrative of this fictional collection. See our image credits for the original photographers.</p></details><details className="product-details-disclosure"><summary>Payment & ordering</summary><p>This is a demonstration store. Orders are recorded locally with Cash on Delivery; no payment is collected and no goods are dispatched.</p></details>
    </div></div>
    {!!related?.length && <section className="related-products"><div className="commerce-section-title"><div><p className="eyebrow">BETTER TOGETHER</p><h2>A few good companions.</h2></div><Link className="text-link" to={`/shop?category=${encodeURIComponent(product.category)}`}>Explore the edit <ArrowRight size={17} /></Link></div><ProductGrid products={related} /></section>}
  </div>;
}

