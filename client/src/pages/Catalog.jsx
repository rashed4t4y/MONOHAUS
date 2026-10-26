import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Search, X } from 'lucide-react';
import { api } from '../services/api.js';
import ProductGrid from '../components/ProductGrid.jsx';
import { ErrorState, Loading } from './CommerceUI.jsx';
import '../styles/commerce.css';
const categories = ['All', 'Clothing', 'Footwear', 'Sneakers', 'Bags', 'Accessories', 'Watches', 'Lifestyle'];
export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') || '');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const category = params.get('category') || '';
  const isNew = params.get('new') === 'true';
  const query = params.toString();
  useEffect(() => { setSearch(params.get('search') || ''); }, [query]);
  useEffect(() => {
    let active = true; setData(null); setError('');
    const request = new URLSearchParams(query); request.set('limit', '12');
    api(`/products?${request}`).then(result => { if (active) setData(result); }).catch(reason => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [query, reload]);
  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };
  return <div className="container commerce-page catalog-page">
    <div className="catalog-heading"><div><p className="eyebrow">THE MONOHAUS EDIT</p><h1>{isNew ? 'Fresh perspectives.' : category ? `${categories.find(item => item.toLowerCase() === category.toLowerCase()) || category}.` : 'Everyday, considered.'}</h1></div><p>Thoughtful essentials. Quiet details.<br />Find the pieces that feel like you.</p></div>
    <div className="catalog-tools"><div className="category-tabs" aria-label="Product categories">{categories.map(item => <button key={item} className={(category.toLowerCase() === item.toLowerCase() || (!category && item === 'All')) ? 'active' : ''} aria-pressed={category.toLowerCase() === item.toLowerCase() || (!category && item === 'All')} onClick={() => update('category', item === 'All' ? '' : item.toLowerCase())}>{item}</button>)}</div><form className="catalog-search" onSubmit={event => { event.preventDefault(); update('search', search.trim()); }} role="search"><label className="sr-only" htmlFor="catalog-search">Search products</label><Search size={17} /><input id="catalog-search" placeholder="Find your next essential" value={search} onChange={event => setSearch(event.target.value)} /><button type="submit" aria-label="Search products"><ArrowRight size={18} /></button></form></div>
    <div className="catalog-meta"><span>{data ? `${data.total} considered ${data.total === 1 ? 'piece' : 'pieces'}` : 'Finding your essentials…'}{isNew && <button className="filter-chip" onClick={() => update('new', '')}>New arrivals <X size={12} /></button>}{params.get('search') && <button className="filter-chip" onClick={() => update('search', '')}>“{params.get('search')}” <X size={12} /></button>}</span><label>Sort by <select value={params.get('sort') || 'newest'} onChange={event => update('sort', event.target.value)}><option value="newest">Newest first</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select></label></div>
    {error ? <ErrorState error={error} retry={() => setReload(value => value + 1)} /> : !data ? <Loading text="Gathering the collection…" /> : data.products.length ? <><ProductGrid products={data.products} />{data.pages > 1 && <nav className="catalog-pagination" aria-label="Product pages"><button className="button button-outline" disabled={data.page <= 1} onClick={() => update('page', String(data.page - 1))}><ArrowLeft size={16} /> Previous</button><span>Page {data.page} of {data.pages}</span><button className="button button-outline" disabled={data.page >= data.pages} onClick={() => update('page', String(data.page + 1))}>Next <ArrowRight size={16} /></button></nav>}</> : <div className="commerce-state"><p className="eyebrow">A fresh start</p><h2>No pieces found.</h2><p>Try a different search or explore the full collection.</p><button className="button" onClick={() => setParams({})}>View all pieces <ArrowRight size={16} /></button></div>}
  </div>;
}

