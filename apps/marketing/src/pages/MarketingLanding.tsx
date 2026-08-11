import { Sparkles, ArrowRight, Activity, CalendarClock, CreditCard } from 'lucide-react';
import features from '../features.json';
import './MarketingLanding.css';

export default function MarketingLanding() {
  return (
    <div className="vowos-marketing-page">
      <nav className="navbar fade-in">
        <div className="logo">
          Vow<span className="logo-accent">OS</span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <a href="/login" className="btn-secondary" style={{ textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', color: 'var(--text-main)', fontWeight: 500 }}>Sign In</a>
          <a href="/signup" className="btn-primary" style={{ textDecoration: 'none' }}>Start Free Trial</a>
        </div>
      </nav>

      <header className="hero">
        <div className="fade-in delay-1" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(99, 91, 255, 0.1)', border: '1px solid rgba(99, 91, 255, 0.2)', borderRadius: '30px', color: 'var(--accent)', fontSize: '14px', fontWeight: 600, marginBottom: '24px' }}>
          <Sparkles size={16} /> VowOS 2.0 is live
        </div>
        <h1 className="fade-in delay-2">
          The Operating System for Modern Bridal Boutiques
        </h1>
        <p className="fade-in delay-3">
          Manage appointments, unify your POS, and automatically schedule your staff in one gorgeous, integrated platform. See our latest feature releases below.
        </p>
        <div className="fade-in delay-3" style={{ display: 'flex', gap: '16px' }}>
          <a href="/signup" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            Start Free Trial <ArrowRight size={16} />
          </a>
        </div>
      </header>

      <section className="features-section">
        <h2 className="section-title fade-in">Latest Updates & Features</h2>
        
        <div className="timeline">
          {features.map((feature, index) => {
            const getIcon = (cat: string) => {
              switch(cat) {
                case 'Workforce': return <CalendarClock size={20} color="var(--accent)" />;
                case 'Payments': return <CreditCard size={20} color="var(--accent)" />;
                default: return <Activity size={20} color="var(--accent)" />;
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
      
      <footer style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: '14px', borderTop: '1px solid var(--border)' }}>
        © {new Date().getFullYear()} VowOS Systems. All rights reserved.
      </footer>
    </div>
  );
}
