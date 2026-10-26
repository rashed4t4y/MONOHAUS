import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X, Minus, Plus, ArrowRight, ShoppingBag } from 'lucide-react';
import { useStore } from '../context/Store.jsx';
import { money } from '../utils/format.js';
import Image from './Image.jsx';
export default function CartDrawer() {
  const { cart, cartCount, cartSubtotal, cartIsOpen, closeCart, updateQuantity, removeFromCart } = useStore();
  const dialog = useRef(null);
  useEffect(() => { if (cartIsOpen && !dialog.current.open) dialog.current.showModal(); else if (!cartIsOpen && dialog.current.open) dialog.current.close(); }, [cartIsOpen]);
  useEffect(() => { if (!cartIsOpen) return; const old = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = old; }; }, [cartIsOpen]);
  return <dialog ref={dialog} className="cart-drawer" aria-labelledby="bag-title" onClose={closeCart} onClick={event => { if (event.target === event.currentTarget) closeCart(); }}>
    <div className="cart-shell"><div className="drawer-heading"><h2 id="bag-title">Your bag <span>({cartCount})</span></h2><button className="icon-button" aria-label="Close shopping bag" onClick={closeCart}><X/></button></div>
    {cart.length ? <>
      <div className="shipping-progress"><p>{cartSubtotal >= 15000 ? 'Your order qualifies for complimentary shipping.' : money(15000 - cartSubtotal) + ' away from complimentary shipping.'}</p><div><span style={{ width: Math.min(cartSubtotal / 15000 * 100, 100) + '%' }}/></div></div>
      <div className="cart-items">{cart.map(item => <div className="cart-item" key={item.key}>
        <Link to={'/product/' + item.productId} onClick={closeCart}><Image src={item.image} alt={item.name} width="100" height="130"/></Link>
        <div className="cart-item-info"><Link to={'/product/' + item.productId} onClick={closeCart}>{item.name}</Link><p>{[item.color, item.size].filter(Boolean).join(' / ')}</p><strong>{money(item.price)}</strong><div className="cart-item-controls"><div className="quantity-control"><button aria-label={'Decrease ' + item.name} disabled={item.quantity <= 1} onClick={() => updateQuantity(item.key, item.quantity - 1)}><Minus size={13}/></button><span>{item.quantity}</span><button aria-label={'Increase ' + item.name} onClick={() => updateQuantity(item.key, item.quantity + 1)}><Plus size={13}/></button></div><button className="text-button" onClick={() => removeFromCart(item.key)}>Remove</button></div></div>
      </div>)}</div>
      <div className="cart-bottom"><div className="cart-total"><span>Subtotal</span><strong>{money(cartSubtotal)}</strong></div><p className="muted small">Shipping is $8, or free on orders $150+. Final totals are confirmed at checkout.</p><Link className="button full-width" to="/checkout" onClick={closeCart}>Continue to checkout <ArrowRight size={18}/></Link><button className="text-button continue-shopping" onClick={closeCart}>Continue exploring</button></div>
    </> : <div className="empty-bag"><ShoppingBag size={40} strokeWidth={1}/><h3>A little room for something good.</h3><p className="muted">Find the pieces you’ll reach for every day.</p><Link className="button" to="/shop" onClick={closeCart}>Explore the collection <ArrowRight size={18}/></Link></div>}
    </div>
  </dialog>;
}
