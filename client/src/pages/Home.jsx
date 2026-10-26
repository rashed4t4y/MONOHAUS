import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Package, RotateCcw, ShieldCheck } from 'lucide-react';
import { api } from '../services/api.js';
import ProductGrid from '../components/ProductGrid.jsx';
import Image from '../components/Image.jsx';
const categoryList = ['Clothing', 'Footwear', 'Sneakers', 'Bags', 'Accessories', 'Watches'];
export default function Home() {
  const [products, setProducts] = useState([]); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState(''); const [newsletter, setNewsletter] = useState({ busy: false, message: '', error: false });
  useEffect(() => {
    const controller = new AbortController();
    api('/products?limit=24&sort=newest', { signal: controller.signal }).then(data => setProducts(data.products)).catch(error => { if (error.name !== 'AbortError') setError(error.message); }).finally(() => setLoading(false));
    return () => controller.abort();
  }, []);
  async function subscribe(event) {
    event.preventDefault(); setNewsletter({ busy: true, message: '', error: false });
    try { const data = await api('/newsletter', { method: 'POST', body: { email } }); setNewsletter({ busy: false, message: data.message || 'You’re on the local demo list. No email has been sent.', error: false }); setEmail(''); }
    catch(error) { setNewsletter({ busy: false, message: error.message, error: true }); }
  }
  const arrivals = products.filter(product => product.isNew).slice(0, 4);
  return <>
    <section className="hero">
      <div className="hero-copy"><p className="eyebrow"><span className="tiny-line"/> The everyday edit — 01</p><h1>Less,<br/>but <em>better.</em></h1><p className="hero-description">Thoughtful essentials. Quiet confidence.<br/>Good things, made part of your everyday.</p><Link to="/shop" className="button hero-cta">Explore collection <ArrowRight size={18}/></Link><div className="hero-footnote"><span>Considered style. Enduring appeal.</span><span>VOL. 01</span></div></div>
      <div className="hero-image"><Image src="/assets/hero-editorial.jpg" alt="Woman wearing a belted beige trench coat against a stone wall" fetchPriority="high" width="1200" height="1400"/><div className="hero-caption"><span>THE ART OF EVERYDAY</span><Link to="/collections">Discover the edit <ArrowUpRight size={18}/></Link></div></div>
    </section>
    <div className="brand-strip"><span>Fewer things. More meaning.</span><span className="strip-mark">✳</span><span>Everyday, considered.</span><span className="strip-mark">✳</span><span>Essentials with intention.</span></div>
    <section className="section container reveal"><div className="section-heading"><div><p className="eyebrow">Find your everyday</p><h2>A place for every piece.</h2></div><Link className="underlined-link" to="/shop">Explore all <ArrowUpRight size={17}/></Link></div><div className="category-grid">{categoryList.map((category, i) => {
      const image = products.find(product => product.category.toLowerCase() === category.toLowerCase())?.image;
      return <Link className="category-card" to={'/shop?category=' + encodeURIComponent(category)} key={category}><div><Image src={image} alt={category + ' collection'} loading="lazy" width="600" height="700"/><span className="category-number">0{i + 1}</span></div><h3>{category}<ArrowUpRight size={20}/></h3></Link>;
    })}</div></section>
    <section className="section arrivals-section container reveal"><div className="section-heading"><div><p className="eyebrow">Just added to the edit</p><h2>New & noteworthy.</h2></div><Link className="underlined-link" to="/shop?new=true">View all new arrivals <ArrowUpRight size={17}/></Link></div>
      {loading ? <div className="product-grid">{[1,2,3,4].map(i => <div className="skeleton" key={i}/>)}</div> : error ? <div className="error-state" role="alert"><p>{error}</p><Link className="underlined-link" to="/shop">Try the collection <ArrowRight size={16}/></Link></div> : <ProductGrid products={arrivals.length ? arrivals : products.slice(0, 4)}/>}
    </section>
    <section className="editorial reveal"><div className="editorial-photo"><Image src="/assets/studio-rack.jpg" alt="Quiet details and textures from the everyday edit" loading="lazy" width="1000" height="1100"/></div><div className="editorial-copy"><p className="eyebrow">The considered collection</p><h2>Nothing extra.<br/>Everything essential.</h2><p>Pieces that feel like you. Easy layers, useful objects, and the details that bring it all together. Meet a collection made for your own rhythm.</p><Link to="/collections" className="underlined-link">Discover the collection <ArrowRight size={18}/></Link><span className="editorial-index">MONOHAUS / THE EVERYDAY EDIT</span></div></section>
    <section className="brand-story container reveal"><p className="eyebrow">Our point of view</p><h2>Good design doesn’t need<br/>to ask for your attention.</h2><p>We believe in the pieces you return to. The familiar shape.<br className="desktop-break"/> The right shade. The everyday detail that makes a difference.</p><Link to="/about" className="underlined-link">A little more about us <ArrowUpRight size={17}/></Link></section>
    <div className="benefits container"><div><Package size={25} strokeWidth={1.3}/><span><strong>A little extra, on us</strong><small>Complimentary shipping on orders $150+</small></span></div><div><RotateCcw size={25} strokeWidth={1.3}/><span><strong>Room to reconsider</strong><small>Explore our demo returns policy</small></span></div><div><ShieldCheck size={25} strokeWidth={1.3}/><span><strong>Shop with clarity</strong><small>Cash on delivery. No card details.</small></span></div></div>
    <section className="newsletter"><div className="container newsletter-inner"><div><p className="eyebrow">A note from MONOHAUS</p><h2>A little less noise.<br/>A little more inspiration.</h2></div><div><form onSubmit={subscribe}><label className="sr-only" htmlFor="newsletter-email">Email address</label><input id="newsletter-email" type="email" autoComplete="email" required maxLength={254} placeholder="Your email address" value={email} onChange={event => setEmail(event.target.value)}/><button type="submit" aria-label="Subscribe to the local newsletter" disabled={newsletter.busy}>{newsletter.busy ? 'Saving…' : <ArrowRight size={23}/>}</button></form><p className="newsletter-note">A local demo list for new arrivals and considered finds. No emails are sent.</p>{newsletter.message && <p role="status" className={newsletter.error ? 'error-text' : 'success-text'}>{newsletter.message}</p>}</div></div></section>
  </>;
}

