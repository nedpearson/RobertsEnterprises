import React from 'react';
import { Sparkles, ArrowRight, Activity, CalendarClock, CreditCard, Shield, Zap, CheckCircle } from 'lucide-react';
import features from '../features.json';
import './MarketingLanding.css';

export default function MarketingLanding() {
  return (
    <div className="vowos-marketing-page">
      <nav className="navbar fade-in">
        <div className="logo">
          Vow<span className="logo-accent">OS</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <a href="/login" className="nav-link">Sign In</a>
          <a href="/signup" className="btn-primary">Start Free Trial</a>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-badge fade-in delay-1">
          <Sparkles size={16} /> VowOS 2.0 is live
        </div>
        <h1 className="fade-in delay-2">
          The Operating System for Modern Bridal Boutiques
        </h1>
        <p className="fade-in delay-3">
          Manage appointments, unify your POS, and automatically schedule your staff in one calm, integrated platform designed exclusively for bridal and specialty retail.
        </p>
        <div className="hero-cta-group fade-in delay-3 mt-4">
          <a href="/signup" className="btn-primary btn-lg group">
            Start Free Trial <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </a>
          <a href="/demo" className="btn-secondary btn-lg relative group overflow-hidden">
            <span className="absolute inset-0 w-full h-full bg-brand-primary/10 group-hover:bg-brand-primary/20 transition-colors" />
            <div className="relative flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-primary"></span>
              </span>
              Enter Interactive Demo
            </div>
          </a>
        </div>
      </header>

      <section className="features-section">
        <div className="section-header fade-in">
          <h2 className="section-title">Latest Platform Updates</h2>
          <p className="section-subtitle">Continuous innovation built for high-touch bridal retail operations.</p>
        </div>

        <div className="timeline">
          {features.map((feature, index) => {
            const getIcon = (cat: string) => {
              switch(cat) {
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

      <section className="value-props-section fade-in">
        <div className="value-grid">
          <div className="value-card">
            <Shield size={28} className="value-icon" />
            <h3>Multi-Tenant Architecture</h3>
            <p>Isolated customer data planes with strict enterprise security and role-based permissions.</p>
          </div>
          <div className="value-card">
            <Zap size={28} className="value-icon" />
            <h3>Real-Time Operations</h3>
            <p>Live sync across appointments, alterations, staff schedules, and POS inventory.</p>
          </div>
          <div className="value-card">
            <CheckCircle size={28} className="value-icon" />
            <h3>Designed for Bridal</h3>
            <p>Fit profiles, gown tracking, bride portals, and seamstress workflows out of the box.</p>
          </div>
        </div>
      </section>
      
      <footer className="footer">
        <div>© {new Date().getFullYear()} VowOS Systems. All rights reserved.</div>
        <div className="footer-links">
          <a href="/login">Sign In</a>
          <a href="/signup">Sign Up</a>
          <a href="/demo">Demo</a>
        </div>
      </footer>
    </div>
  );
}
