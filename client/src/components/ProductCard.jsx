import { Link } from 'react-router-dom';
import { Plus, ArrowUpRight } from 'lucide-react';
import Image from './Image.jsx';
import { money } from '../utils/format.js';
import { useStore } from '../context/Store.jsx';
export default function ProductCard({ product }) {
  const { addToCart } = useStore();
  const variants = product.sizes?.length > 0 || product.colors?.length > 1;
  return <article className="product-card">
    <div className="product-visual">
      <Link to={'/product/' + product.id} aria-label={'View ' + product.name}><Image src={product.image} alt={product.name + (product.colors?.[0] ? ' in ' + product.colors[0] : '')} loading="lazy" width="700" height="900" /></Link>
      {product.isNew && <span className="product-tag">New arrival</span>}
      {!product.stock ? <span className="soldout-tag">Sold out</span> : variants ? <Link to={'/product/' + product.id} className="quick-add" aria-label={'Choose options for ' + product.name}><ArrowUpRight size={18} /><span>Choose options</span></Link> : <button className="quick-add" onClick={() => addToCart(product)} aria-label={'Add ' + product.name + ' to bag'}><Plus size={18} /><span>Add to bag</span></button>}
    </div>
    <div className="product-meta"><div><p className="product-category">{product.category}</p><Link className="product-name" to={'/product/' + product.id}>{product.name}</Link></div><p className="product-price">{product.salePrice != null && <del>{money(product.price)}</del>}{money(product.salePrice ?? product.price)}</p></div>
  </article>;
}
