import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Database,
  ExternalLink,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import features from '../features.json';
import './MarketingLanding.css';
import { supabase } from '@/lib/supabase';

type CompetitorCell = {
  headline: string;
  detail: string;
  tone?: 'vowos' | 'standard' | 'caution';
};

type ComparisonRow = {
  capability: string;
  vowos: CompetitorCell;
  bridallive: CompetitorCell;
  bridalop: CompetitorCell;
  poppy: CompetitorCell;
  value: string;
};

const competitorRows: ComparisonRow[] = [
  {
    capability: 'Core bridal operations',
    vowos: {
      headline: 'Unified operating system',
      detail: 'CRM, appointments, POS, inventory, purchasing, workforce and communications are designed to work from one operating model.',
      tone: 'vowos',
    },
    bridallive: {
      headline: 'Available',
      detail: 'Bridal-specific customer, appointment, inventory, POS, purchasing and employee tools vary by plan.',
    },
    bridalop: {
      headline: 'Included',
      detail: 'POS, booking, inventory, invoices, contracts, alterations and reporting are included in its flat plan.',
    },
    poppy: {
      headline: 'Included',
      detail: 'Customer, appointment, inventory, purchasing, messaging and payment workflows are core features.',
    },
    value: 'One connected workflow reduces duplicate entry and makes the customer journey easier to follow from appointment through sale.',
  },
  {
    capability: 'Multi-location operations',
    vowos: {
      headline: 'Organization → business → location',
      detail: 'VowOS is structured around one organization operating multiple brands and locations with location-aware operations.',
      tone: 'vowos',
    },
    bridallive: {
      headline: 'Elite multi-store',
      detail: 'BridalLive documents linked Elite accounts that can transfer items and copy contacts between locations.',
    },
    bridalop: {
      headline: 'Unlimited locations',
      detail: 'Its published Professional plan advertises unlimited locations.',
    },
    poppy: {
      headline: 'Multi-store available',
      detail: 'Poppy advertises multi-store capabilities and discounted additional locations.',
    },
    value: 'Built for owners who want organization-wide visibility without treating every store as an unrelated business system.',
  },
  {
    capability: 'Staff & permissions',
    vowos: {
      headline: 'Role-aware experience',
      detail: 'Owners, managers and staff can be given the access and operating scope appropriate to their job.',
      tone: 'vowos',
    },
    bridallive: {
      headline: 'Plan-dependent users',
      detail: 'Published plans range from limited user counts to unlimited users on higher tiers.',
    },
    bridalop: {
      headline: 'Unlimited staff',
      detail: 'Unlimited staff are advertised in the $299/month plan.',
    },
    poppy: {
      headline: 'Unlimited users',
      detail: 'Unlimited users and customizable roles/permissions are advertised.',
    },
    value: 'VowOS is being designed around what each person needs to do, keeping daily screens simpler while preserving owner-level control.',
  },
  {
    capability: 'Appointments & booking',
    vowos: {
      headline: 'Booking + staff capacity',
      detail: 'Appointment workflows are connected to staff availability, location capacity and the customer record.',
      tone: 'vowos',
    },
    bridallive: {
      headline: 'Available',
      detail: 'Customizable appointment scheduling, appointment charging and automations are listed in BridalLive plans.',
    },
    bridalop: {
      headline: 'Included',
      detail: 'Online booking, custom forms, deposits, fitting rooms, reminders and Google Calendar are advertised.',
    },
    poppy: {
      headline: 'Included',
      detail: 'Online booking, scheduling assistance, reminders and automated workflows are advertised.',
    },
    value: 'The goal is one appointment engine feeding the same customer, communication and reporting workflow instead of disconnected scheduling data.',
  },
  {
    capability: 'Purchasing & inventory',
    vowos: {
      headline: 'Location-aware workflow',
      detail: 'Products, vendors, purchasing, receiving, inventory and transfers are connected to the operating location.',
      tone: 'vowos',
    },
    bridallive: {
      headline: 'Included by plan',
      detail: 'Inventory, vendor management, purchasing and receiving are published BridalLive capabilities.',
    },
    bridalop: {
      headline: 'Included',
      detail: 'Inventory and special-order functionality are included in its published all-feature plan.',
    },
    poppy: {
      headline: 'Included',
      detail: 'Inventory, barcode labels, purchase orders, receiving, returns and unreceives are advertised.',
    },
    value: 'Owners can connect inventory movement to the location, customer and sales workflows that caused it.',
  },
  {
    capability: 'Customer communications',
    vowos: {
      headline: 'Unified communications model',
      detail: 'Customer conversations are designed to stay connected to customer, appointment and business context.',
      tone: 'vowos',
    },
    bridallive: {
      headline: 'Available',
      detail: 'Two-way texting, templates and Smart Flow automations are published capabilities; SMS requires a Twilio account.',
    },
    bridalop: {
      headline: 'Included + usage credits',
      detail: 'SMS tools are available with published usage-credit pricing.',
    },
    poppy: {
      headline: 'Included',
      detail: 'Two-way text messaging, automated email messaging and Auto Flows are advertised.',
    },
    value: 'Less switching between inboxes and customer records means faster follow-up and better continuity for the bride.',
  },
  {
    capability: 'Ecommerce & digital selling',
    vowos: {
      headline: 'Connected-commerce architecture',
      detail: 'VowOS is built to connect tenant commerce channels to the same customer, order, inventory and reporting model. Availability depends on configured integrations.',
      tone: 'caution',
    },
    bridallive: {
      headline: 'Integrated ecommerce',
      detail: 'BridalLive offers a hosted storefront with inventory, order, customer, returns and social/Google commerce integrations.',
    },
    bridalop: {
      headline: 'Operational selling tools',
      detail: 'Its public feature set emphasizes POS, customer portal, digital contracts and payment workflows.',
    },
    poppy: {
      headline: 'Operational selling tools',
      detail: 'Its public feature set emphasizes in-store workflows, payment links, messaging and POS management.',
    },
    value: 'The VowOS direction is channel-aware operations rather than forcing the retailer to manage ecommerce as a disconnected customer database.',
  },
  {
    capability: 'SEO, marketing & revenue attribution',
    vowos: {
      headline: 'Growth OS rollout',
      detail: 'VowOS is building toward search → lead → appointment → customer → sale → revenue intelligence. Only enabled, production-ready Growth capabilities should be sold as active.',
      tone: 'caution',
    },
    bridallive: {
      headline: 'SEO + marketing services',
      detail: 'BridalLive publicly offers SEO, marketing dashboards, paid-ad services and ecommerce integrations for Google/Meta/Klaviyo.',
    },
    bridalop: {
      headline: 'Marketing integrations + AI',
      detail: 'Its published offering includes marketing integrations and an AI assistant within its flat plan.',
    },
    poppy: {
      headline: 'Source reporting',
      detail: 'Poppy advertises 41+ reports and marketing-oriented reports such as how customers heard about the store.',
    },
    value: 'VowOS is targeting the harder question: not just where traffic came from, but which activity ultimately created appointments and revenue.',
  },
  {
    capability: 'Commercial model',
    vowos: {
      headline: 'Configured to the organization',
      detail: 'Request a Plan is designed to match features, businesses, locations and integrations to the retailer instead of presenting one broad package as the only answer.',
      tone: 'vowos',
    },
    bridallive: {
      headline: 'Tiered + add-ons',
      detail: 'BridalLive publishes multiple software tiers plus separate charges for additional stores, API access, Client Portal and other services.',
    },
    bridalop: {
      headline: '$299/month flat plan',
      detail: 'BridalOp advertises one plan with unlimited staff, customers and locations, with separate SMS credit usage.',
    },
    poppy: {
      headline: '$149 then $199/month',
      detail: 'Poppy advertises $149/month for the first six months and $199/month thereafter, plus optional migration services.',
    },
    value: 'A VowOS package can focus the user experience on the capabilities the organization actually intends to use while retaining a path to expand.',
  },
];

const competitorSources = [
  { label: 'BridalLive pricing', href: 'https://www.bridallive.com/pricing' },
  { label: 'BridalLive ecommerce', href: 'https://www.bridallive.com/ecommerce' },
  { label: 'BridalOp pricing', href: 'https://bridalop.com/pricing/' },
  { label: 'Poppy Bridal pricing', href: 'https://poppy-bridal.com/pricing/' },
  { label: 'Poppy Bridal features', href: 'https://poppy-bridal.com/features/' },
];

export default function MarketingLanding() {
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadType, setLeadType] = useState('DEMO');
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', company: '', phone: '' });

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from('platform_leads').insert([
        {
          lead_type: leadType,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          company_name: formData.company,
          phone: formData.phone,
          status: 'NEW',
          source: 'Marketing Website'
        }
      ]);

      if (error) {
        console.error('Error submitting lead:', error);
        alert('There was a problem submitting your request. Please try again later.');
        return;
      }

      alert('Thank you! We will be in touch shortly.');
      setShowLeadForm(false);
      setFormData({ firstName: '', lastName: '', email: '', company: '', phone: '' });
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred. Please try again later.');
    }
  };

  return (
    <div className="vowos-marketing-page">
      <nav className="navbar fade-in">
        <div className="logo">
          Vow<span className="logo-accent">OS</span>
        </div>
        <div className="navbar-actions">
          <a href="https://demo.vowos.bridgebox.ai" className="nav-link">Live Demo</a>
          <a href="/login" className="nav-link">Sign In</a>
          <button onClick={() => { setLeadType('PLAN_REQUEST'); setShowLeadForm(true); }} className="btn-primary">Request a Plan</button>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-badge fade-in delay-1">
          <Sparkles size={16} /> Built for modern bridal retail
        </div>
        <h1 className="fade-in delay-2">
          Run the boutique. Understand the customer. Grow the business.
        </h1>
        <p className="fade-in delay-3">
          VowOS brings bridal operations into one organization-wide system—from appointments and customers to inventory, purchasing, staff, communications and reporting—with a growth layer designed to connect marketing activity to business outcomes.
        </p>
        <div className="hero-cta-group fade-in delay-3 mt-4">
          <a href="https://demo.vowos.bridgebox.ai" className="btn-primary btn-lg group">
            Explore the Live Demo <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </a>
          <button onClick={() => { setLeadType('DEMO'); setShowLeadForm(true); }} className="btn-secondary btn-lg">
            Book a Demo
          </button>
          <button onClick={() => { setLeadType('PLAN_REQUEST'); setShowLeadForm(true); }} className="btn-secondary btn-lg">
            Request a Plan
          </button>
        </div>
      </header>

      {showLeadForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl max-w-md w-full text-stone-900">
            <h2 className="text-2xl mb-4 font-semibold">{leadType === 'DEMO' ? 'Book a Demo' : 'Request a Plan'}</h2>
            <form onSubmit={handleLeadSubmit} className="space-y-4">
              <input type="text" placeholder="First Name" required className="w-full p-2 border rounded" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
              <input type="text" placeholder="Last Name" required className="w-full p-2 border rounded" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
              <input type="email" placeholder="Email Address" required className="w-full p-2 border rounded" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              <input type="text" placeholder="Company Name" required className="w-full p-2 border rounded" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} />
              <input type="tel" placeholder="Phone Number" className="w-full p-2 border rounded" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              <button type="submit" className="w-full btn-primary mt-4">Submit</button>
              <button type="button" onClick={() => setShowLeadForm(false)} className="w-full text-stone-500 mt-2">Cancel</button>
            </form>
          </div>
        </div>
      )}

      <section className="comparison-section" aria-labelledby="comparison-title">
        <div className="section-header fade-in">
          <div className="section-kicker">Compare the operating model</div>
          <h2 id="comparison-title" className="section-title">See what VowOS is built to add beyond traditional bridal software.</h2>
          <p className="section-subtitle comparison-intro">
            BridalLive, BridalOp and Poppy Bridal are established bridal-specific options. The difference VowOS is pursuing is deeper organization-wide context: the customer, location, operations and growth data working together instead of living in separate workflows.
          </p>
        </div>

        <div className="comparison-table-wrap" role="region" aria-label="Bridal software comparison" tabIndex={0}>
          <table className="comparison-table">
            <caption className="sr-only">Feature and value comparison of VowOS, BridalLive, BridalOp and Poppy Bridal.</caption>
            <thead>
              <tr>
                <th scope="col">Capability</th>
                <th scope="col" className="vowos-column">VowOS</th>
                <th scope="col">BridalLive</th>
                <th scope="col">BridalOp</th>
                <th scope="col">Poppy Bridal</th>
                <th scope="col">Why it matters</th>
              </tr>
            </thead>
            <tbody>
              {competitorRows.map((row) => (
                <tr key={row.capability}>
                  <th scope="row" className="comparison-capability">{row.capability}</th>
                  <td className={`comparison-cell vowos-column ${row.vowos.tone === 'caution' ? 'comparison-caution' : ''}`}>
                    <div className="comparison-headline"><CheckCircle2 size={16} aria-hidden="true" />{row.vowos.headline}</div>
                    <p>{row.vowos.detail}</p>
                  </td>
                  {[row.bridallive, row.bridalop, row.poppy].map((cell, index) => (
                    <td className="comparison-cell" key={`${row.capability}-${index}`}>
                      <div className="comparison-headline standard">{cell.headline}</div>
                      <p>{cell.detail}</p>
                    </td>
                  ))}
                  <td className="comparison-cell comparison-value"><p>{row.value}</p></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="comparison-disclaimer">
          <p>
            <strong>Comparison methodology:</strong> competitor information is based on publicly available product and pricing pages reviewed August 16, 2026. Competitor offerings and pricing can change. VowOS does not present roadmap-only Growth functionality as a completed production feature.
          </p>
          <div className="comparison-sources" aria-label="Comparison sources">
            {competitorSources.map((source) => (
              <a key={source.href} href={source.href} target="_blank" rel="noreferrer">
                {source.label} <ExternalLink size={12} aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>

        <div className="comparison-cta-card">
          <div>
            <span className="comparison-cta-eyebrow">The best comparison is the workflow.</span>
            <h3>See VowOS with real drilldowns before choosing your next system.</h3>
            <p>Explore the live demo, then request a plan configured around the businesses, locations and capabilities your organization actually needs.</p>
          </div>
          <div className="comparison-cta-actions">
            <a href="https://demo.vowos.bridgebox.ai" className="btn-primary">Open Live Demo <ArrowRight size={16} /></a>
            <button onClick={() => { setLeadType('PLAN_REQUEST'); setShowLeadForm(true); }} className="btn-secondary">Request a Plan</button>
          </div>
        </div>
      </section>

      <section className="value-props-section fade-in" aria-labelledby="value-title">
        <div className="section-header compact">
          <div className="section-kicker">Where VowOS adds value</div>
          <h2 id="value-title" className="section-title">Built to connect the decisions an owner actually has to make.</h2>
        </div>
        <div className="value-grid">
          <div className="value-card">
            <Database size={28} className="value-icon" />
            <h3>One organization-wide operating context</h3>
            <p>Businesses, locations, customers, appointments and inventory are modeled as parts of one organization so owners can see the whole operation without losing location-level accountability.</p>
          </div>
          <div className="value-card">
            <Users size={28} className="value-icon" />
            <h3>Configure what the team actually needs</h3>
            <p>VowOS is designed around plan entitlements, organization settings and role permissions so a powerful system does not have to become an overwhelming staff experience.</p>
          </div>
          <div className="value-card">
            <TrendingUp size={28} className="value-icon" />
            <h3>Operations plus a path to growth intelligence</h3>
            <p>The Growth OS direction connects search, marketing and lead activity to appointments and revenue. Production-ready capabilities are enabled deliberately rather than represented by placeholder dashboards.</p>
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="section-header fade-in">
          <h2 className="section-title">Latest Platform Updates</h2>
          <p className="section-subtitle">Continuous innovation built for high-touch bridal retail operations.</p>
        </div>

        <div className="timeline">
          {features.map((feature, index) => {
            const getIcon = (cat: string) => {
              switch (cat) {
                case 'Workforce': return <CalendarClock size={20} className="icon-accent" />;
                case 'Payments': return <CreditCard size={20} className="icon-accent" />;
                default: return <Activity size={20} className="icon-accent" />;
              }
            };

            return (
              <div key={feature.id} className="feature-card fade-in" style={{ animationDelay: `${0.1 + (index * 0.1)}s` }}>
                <div className="timeline-dot">
                  {getIcon(feature.category)}
                </div>
                <div className="feature-content">
                  <div className="feature-meta">
                    <span className="feature-date">{feature.date}</span>
                    <span className="feature-category">{feature.category}</span>
                  </div>
                  <h3 className="feature-title">{feature.title}</h3>
                  <p className="feature-description">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="footer">
        <div>© {new Date().getFullYear()} VowOS Systems. All rights reserved.</div>
        <div className="footer-links">
          <a href="/login">Sign In</a>
          <a href="https://demo.vowos.bridgebox.ai">Live Demo</a>
          <a href="/demo">Guided Demo</a>
        </div>
      </footer>
    </div>
  );
}
