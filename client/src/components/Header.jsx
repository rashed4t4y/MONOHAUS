import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Search, UserRound, ShoppingBag, Moon, Sun, Menu, X, ArrowRight } from 'lucide-react';
import { useStore } from '../context/Store.jsx';
export default function Header() {
  const { cartCount, openCart, user } = useStore();
  const [theme, setTheme] = useState(document.documentElement.dataset.theme || 'light');
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchDialog = useRef(null); const searchInput = useRef(null);
  const navigate = useNavigate(); const location = useLocation();
  useEffect(() => { setMenuOpen(false); searchDialog.current?.close(); }, [location.pathname, location.search]);
  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'; setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('monohaus-theme', next); } catch {}
  }
  function openSearch() { searchDialog.current.showModal(); searchInput.current?.focus(); }
  function find(event) { event.preventDefault(); navigate('/shop?search=' + encodeURIComponent(search.trim())); searchDialog.current.close(); }
  const links = <><NavLink to="/shop">Shop all</NavLink><NavLink to="/shop?new=true">New arrivals</NavLink><NavLink to="/collections">Collections</NavLink><NavLink to="/about">Our story</NavLink></>;
  return <>
    <div className="announcement"><span>Considered essentials. Everyday living.</span><span>Complimentary shipping on orders $150+</span><span>Designed for your everyday</span></div>
    <header className="site-header"><div className="header-inner">
      <button className="icon-button menu-toggle" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={21}/> : <Menu size={21}/>}</button>
      <Link to="/" className="wordmark" aria-label="MONOHAUS home">MONOHAUS<span>®</span></Link>
      <nav className="desktop-nav" aria-label="Main navigation">{links}</nav>
      <div className="header-actions">
        <button className="icon-button search-button" aria-label="Search products" onClick={openSearch}><Search size={20}/></button>
        <button className="icon-button" onClick={toggleTheme} aria-label={'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' theme'}>{theme === 'dark' ? <Sun size={19}/> : <Moon size={19}/>}</button>
        <Link className="icon-button account-link" to="/account" aria-label={user ? 'Your account' : 'Sign in'}><UserRound size={20}/></Link>
        <button className="bag-button" onClick={openCart} aria-label={'Open shopping bag, ' + cartCount + ' items'}><ShoppingBag size={20}/><span className="bag-label">Bag</span><span className="bag-count" key={cartCount}>{cartCount}</span></button>
      </div>
    </div>
    {menuOpen && <nav className="mobile-menu" id="mobile-menu" aria-label="Mobile navigation">{links}<button className="mobile-search-link" onClick={() => { setMenuOpen(false); openSearch(); }}>Search products <Search size={17}/></button><Link to="/account">My account</Link></nav>}
    </header>
    <dialog aria-labelledby="search-title" className="search-dialog" ref={searchDialog} onClick={event => { if (event.target === event.currentTarget) searchDialog.current.close(); }}>
      <div className="dialog-heading"><p id="search-title" className="eyebrow">Find your everyday essential</p><button className="icon-button" aria-label="Close search" onClick={() => searchDialog.current.close()}><X/></button></div>
      <form onSubmit={find}><label className="sr-only" htmlFor="site-search">Search products</label><Search size={23}/><input ref={searchInput} id="site-search" placeholder="What are you looking for?" value={search} onChange={event => setSearch(event.target.value)} maxLength={100}/><button className="icon-button" aria-label="Submit search"><ArrowRight/></button></form>
      <p className="muted small">Explore clothing, footwear, bags and everyday objects.</p>
    </dialog>
  </>;
}


