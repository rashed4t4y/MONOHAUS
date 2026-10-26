import { Component, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import Home from './pages/Home.jsx';
import Cart from './pages/Cart.jsx';
import Catalog from './pages/Catalog.jsx';
import Product from './pages/Product.jsx';
import Checkout from './pages/Checkout.jsx';
import Account from './pages/Account.jsx';
import Admin from './pages/Admin.jsx';
import Order from './pages/Order.jsx';
import { About, Collections, Policy, Contact, NotFound } from './pages/Information.jsx';
import { useStore } from './context/Store.jsx';
class ErrorBoundary extends Component {
 state = { error: false };
 static getDerivedStateFromError() { return { error: true }; }
 render() { return this.state.error ? <main className="container not-found"><h1>Something needs a moment.</h1><p>Please reload to return to the store. Your saved bag will remain available.</p><button className="button" onClick={() => window.location.reload()}>Reload the store</button></main> : this.props.children; }
}
function RouteEffects() {
 const { pathname, search, key } = useLocation();
 useEffect(() => {
   window.scrollTo({ top: 0, behavior: 'instant' });
   document.title = pathname === '/' ? 'MONOHAUS — Less, but better.' : (pathname.split('/')[1] || 'Store').replace(/^./, c => c.toUpperCase()) + ' — MONOHAUS';
   const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } }), { threshold: 0.08 });
   document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
   return () => observer.disconnect();
 }, [pathname, search, key]);
 return null;
}
export default function App() {
 const { toast } = useStore();
 return <ErrorBoundary><a href="#main-content" className="skip-link">Skip to content</a><RouteEffects/><Header/><main id="main-content"><Routes><Route path="/" element={<Home/>}/><Route path="/shop" element={<Catalog/>}/><Route path="/product/:id" element={<Product/>}/><Route path="/cart" element={<Cart/>}/><Route path="/checkout" element={<Checkout/>}/><Route path="/account" element={<Account/>}/><Route path="/admin" element={<Admin/>}/><Route path="/orders/:id" element={<Order/>}/><Route path="/about" element={<About/>}/><Route path="/collections" element={<Collections/>}/><Route path="/policies/:slug" element={<Policy/>}/><Route path="/contact" element={<Contact/>}/><Route path="*" element={<NotFound/>}/></Routes></main><Footer/><CartDrawer/>{toast && <div className="toast" key={toast.id} role="status"><Check size={18}/><span>{toast.message}</span></div>}</ErrorBoundary>;
}


