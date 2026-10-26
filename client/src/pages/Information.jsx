import { Link, useParams } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Image from '../components/Image.jsx';
const policies = {
 shipping: { title: 'Shipping & returns', sections: [
 ['A demonstration, with clear terms', 'MONOHAUS is a fictional store. Orders are saved locally to demonstrate the shopping flow, and no goods are dispatched. Do not enter a real delivery address for testing.'],
 ['Shipping calculation', 'The demonstration checkout uses a flat $8 shipping fee. Orders with a merchandise subtotal of $150 or more receive complimentary shipping. All prices are shown in US dollars; the demo does not calculate taxes.'],
 ['Returns', 'There are no real purchases or deliveries to return. In this demo, an administrator can cancel pending or processing orders and stock is returned automatically. A real store would need a published returns process and regional consumer policies before accepting orders.']
 ]},
 privacy: { title: 'Privacy, in plain language', sections: [
 ['What the local store saves', 'Your name, email address, hashed password, order contact details, order items and session are stored in the local SQLite database. Newsletter addresses are saved to a local demonstration list.'],
 ['Your browser', 'The shopping bag and display theme are kept in your browser’s local storage. Authentication uses an HttpOnly session cookie, not browser local storage. No analytics or advertising trackers are included.'],
 ['Data and deletion', 'This is a local demonstration. Use fictional personal details. The operator can remove the local database to erase all demo records when the server is stopped. Production use requires an appropriate retention and individual deletion process.']
 ]},
 terms: { title: 'Terms of the demonstration', sections: [
 ['About this store', 'MONOHAUS is a fictional fashion and lifestyle brand built as a working local software demonstration. Product names, prices and availability are sample data. Licensed photographs illustrate the sample catalog and do not imply endorsement by the photographers, models or depicted manufacturers.'],
 ['Orders and payment', 'Submitting checkout creates a database record and adjusts demonstration inventory. Cash on delivery is the only option. No payment is collected, no card details are requested, and no goods are supplied.'],
 ['Before commercial use', 'A real store requires its own product photographs and stock, business contact details, tax and shipping rules, fulfillment operations, and policies appropriate to the places it operates.']
 ]}
};
export function About() {
 return <div className="about-page"><div className="container page-intro"><p className="eyebrow">The MONOHAUS point of view</p><h1>A considered everyday.</h1><p>There is a quiet pleasure in finding just the right thing.</p></div><div className="about-editorial"><Image src="/assets/studio-rack.jpg" alt="Neutral textures and quiet everyday details" width="1000" height="1000"/><div><p className="eyebrow">Less, but better.</p><h2>Keep the pieces<br/>that feel like you.</h2><p>MONOHAUS brings clothing, footwear, bags and everyday objects into one considered edit. Familiar forms, thoughtful combinations, and a neutral palette leave room for your own point of view.</p><p>We’re drawn to simple things with presence. A useful bag. An easy layer. An object that makes the everyday a little more enjoyable.</p><Link to="/shop" className="underlined-link">Explore our edit <ArrowRight size={18}/></Link><p className="small muted demo-note">MONOHAUS is a fictional demonstration brand. No manufacturing or sustainability certifications are claimed.</p></div></div></div>;
}
export function Collections() {
 return <section className="container collections-page"><div className="page-intro"><p className="eyebrow">A wardrobe. A rhythm. A point of view.</p><h1>The considered edit.</h1><p>Thoughtful combinations for the way you move through the day.</p></div><div className="collection-grid"><Link to="/shop?category=Clothing" className="collection-tile"><Image src="/assets/hero-editorial.jpg" alt="Everyday clothing editorial" width="900" height="1100"/><div><span className="eyebrow">01 / Clothing</span><h2>Everyday, elevated. <ArrowUpRight/></h2></div></Link><Link to="/shop?category=Accessories" className="collection-tile"><Image src="/assets/black-sunglasses.jpg" alt="Black rectangular sunglasses on a white surface" width="900" height="1100"/><div><span className="eyebrow">02 / Accessories</span><h2>The small details. <ArrowUpRight/></h2></div></Link></div><div className="collection-bottom"><p>Find your next everyday favorite.</p><Link to="/shop" className="button">Shop the full collection <ArrowRight size={18}/></Link></div></section>;
}
export function Policy() {
 const { slug } = useParams(); const policy = policies[slug];
 if (!policy) return <NotFound/>;
 return <section className="container text-page"><p className="eyebrow">MONOHAUS / Good to know</p><h1>{policy.title}</h1>{policy.sections.map(([title, body]) => <section key={title}><h2>{title}</h2><p>{body}</p></section>)}<Link to="/shop" className="underlined-link">Back to the collection <ArrowRight size={17}/></Link></section>;
}
export function Contact() {
 return <section className="container text-page"><p className="eyebrow">Here to help</p><h1>Keep in touch.</h1><p>MONOHAUS is a local demonstration store. There is no customer support team and no real delivery service.</p><section><h2>Placeholder contact</h2><p>hello@monohaus.example is a reserved placeholder address. It does not receive messages.</p></section><section><h2>Your demonstration orders</h2><p>Sign in to your account to view the orders saved by this application.</p><Link className="button" to="/account">Your account <ArrowRight size={17}/></Link></section></section>;
}
export function NotFound() {
 return <section className="container not-found"><p className="eyebrow">404 / A quiet detour</p><h1>Nothing here, just yet.</h1><p>This page may have moved. There are still good things to discover.</p><Link className="button" to="/shop">Explore the collection <ArrowRight size={18}/></Link></section>;
}


