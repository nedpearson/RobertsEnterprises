import React, { useState } from 'react';
import { Heart, Sparkles, Truck, CheckCircle2, Clock, DollarSign, Calendar, MapPin, ShoppingBag, ShieldCheck, ArrowRight } from 'lucide-react';
import { formatCents, formatDate } from '@/data/vowosData';
import { FavoritesGallery } from './components/FavoritesGallery';

export default function BridePortalView() {
  const [activeTab, setActiveTab] = useState<'status' | 'wishlist' | 'invoice'>('status');
  const [wishlist, setWishlist] = useState<string[]>(['Monique Lhuillier Bliss Gown', 'Ines Di Santo Silk Veil']);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const brideOrder = {
    brideName: 'Camille Fontenot',
    weddingDate: '2026-11-14',
    boutique: 'I Do Bridal Couture — Baton Rouge',
    gownName: 'Monique Lhuillier Bliss Silk Gown',
    gownStyle: 'ML-2026-BLISS',
    gownImage: 'https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&q=80&w=600',
    totalCents: 450000,
    paidCents: 150000,
    balanceCents: 300000,
    steps: [
      { title: 'Order Confirmed', date: '2026-06-15', done: true, desc: 'Measurements & deposit received' },
      { title: 'Atelier Hand-Sewing', date: '2026-07-10', done: true, desc: 'Fabric cutting & beadwork underway in Milan' },
      { title: 'Quality & Fit Inspection', date: '2026-08-05', done: false, active: true, desc: 'Master tailor inspection & hand pressing' },
      { title: 'Shipped to Boutique', date: '2026-08-15', done: false, desc: 'In transit to I Do Bridal Couture BR' },
      { title: 'First Fitting Appointment', date: '2026-08-25', done: false, desc: 'Ready for 1-on-1 boutique fitting' },
    ],
  };

  const catalogGowns = [
    { name: 'Ines Di Santo Couture Silk Gown', style: 'IDS-FALL-01', image: 'https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&q=80&w=400', price: '$5,200' },
    { name: 'Monique Lhuillier Cathedral Lace Veil', style: 'ML-VEIL-04', image: 'https://images.unsplash.com/photo-1546804784-896d0dca3800?auto=format&fit=crop&q=80&w=400', price: '$1,200' },
    { name: 'Proper & Co. Pearl Embellished Heels', style: 'PROPER-HEEL-02', image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=80&w=400', price: '$450' },
  ];

  const toggleWishlist = (name: string) => {
    setWishlist((prev) => (prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]));
  };

  const handlePayBalance = () => {
    setPaymentSuccess(true);
    setTimeout(() => setPaymentSuccess(false), 5000);
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 select-none pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-rose-950 to-stone-900 text-white px-6 py-10 shadow-lg">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-rose-300 bg-rose-950/60 px-3 py-1 rounded-full border border-rose-800/50">
              VowOS Self-Service Digital Bride Portal
            </span>
            <h1 className="font-serif text-3xl font-bold mt-2">Welcome, {brideOrder.brideName}</h1>
            <p className="text-xs text-stone-300 mt-1 flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-rose-400" /> Wedding Date: {formatDate(brideOrder.weddingDate)}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-rose-400" /> {brideOrder.boutique}</span>
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-right min-w-[200px]">
            <span className="text-[10px] uppercase font-bold text-stone-300">Remaining Balance</span>
            <p className="font-serif text-2xl font-bold text-emerald-400 mt-0.5">{formatCents(brideOrder.balanceCents)}</p>
            <p className="text-[10px] text-stone-300">Total: {formatCents(brideOrder.totalCents)}</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 mt-8 space-y-8">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-200 gap-2">
          {[
            { id: 'status', label: 'Gown Order & Delivery Tracker', icon: Truck },
            { id: 'wishlist', label: 'Fitting Room Wishlist', icon: Heart, badge: wishlist.length },
            { id: 'invoice', label: 'Invoice & Payments', icon: DollarSign },
          ].map((t: any) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`-mb-px border-b-2 px-4 py-3 text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === t.id
                  ? 'border-rose-600 text-rose-600 bg-white rounded-t-xl shadow-xs'
                  : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-stone-100/60 rounded-t-xl'
              }`}
            >
              <t.icon className="h-4 w-4" />
              <span>{t.label}</span>
              {t.badge !== undefined && (
                <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab 1: Order Tracker */}
        {activeTab === 'status' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm flex flex-col md:flex-row gap-6 items-center">
              <img
                src={brideOrder.gownImage}
                alt={brideOrder.gownName}
                className="h-48 w-36 object-cover rounded-xl shadow-md border border-stone-200 flex-shrink-0"
              />
              <div className="space-y-2 flex-1">
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  Custom Couture Order
                </span>
                <h2 className="font-serif text-2xl font-bold text-stone-900">{brideOrder.gownName}</h2>
                <p className="text-xs text-stone-500 font-mono">Style Code: {brideOrder.gownStyle}</p>

                <div className="pt-3 border-t border-stone-100 text-xs text-stone-600 space-y-1">
                  <p><span className="font-bold text-stone-900">Estimated Delivery:</span> August 15, 2026</p>
                  <p><span className="font-bold text-stone-900">Assigned Stylist:</span> Ramsey Roberts</p>
                </div>
              </div>
            </div>

            {/* Timeline Steps */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-6">
              <h3 className="font-serif text-lg font-bold text-stone-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-rose-500" /> Live Gown Journey Timeline
              </h3>

              <div className="relative pl-6 border-l-2 border-stone-200 space-y-8">
                {brideOrder.steps.map((s, idx) => (
                  <div key={s.title} className="relative">
                    <div className={`absolute -left-[31px] top-0 h-6 w-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                      s.done
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : s.active
                        ? 'bg-rose-600 border-rose-600 text-white animate-pulse'
                        : 'bg-white border-stone-300 text-stone-400'
                    }`}>
                      {s.done ? '✓' : idx + 1}
                    </div>

                    <div>
                      <div className="flex items-center gap-3">
                        <h4 className={`text-sm font-bold ${s.active ? 'text-rose-600' : 'text-stone-900'}`}>{s.title}</h4>
                        <span className="text-[11px] font-medium text-stone-400">{formatDate(s.date)}</span>
                        {s.active && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            Current Stage
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 mt-1">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Wishlist Selector */}
        {activeTab === 'wishlist' && (
          <FavoritesGallery 
            wishlist={wishlist} 
            onToggleWishlist={toggleWishlist} 
          />
        )}

        {/* Tab 3: Online Invoice & Payments */}
        {activeTab === 'invoice' && (
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-stone-900">Invoice #INV-2026-081</h3>
                <p className="text-xs text-stone-500">I Do Bridal Couture — Baton Rouge</p>
              </div>
              <span className="bg-amber-50 text-amber-700 border border-amber-200 font-bold px-3 py-1 rounded-full text-xs">
                Partial Payment Received
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span className="text-stone-600">Monique Lhuillier Bliss Silk Gown</span>
                <span className="font-bold text-stone-900">$4,500.00</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span className="text-emerald-700 font-medium">Initial Deposit (Paid 2026-06-15)</span>
                <span className="font-bold text-emerald-700">-$1,500.00</span>
              </div>
              <div className="flex justify-between py-2 text-sm font-bold text-stone-900 border-t border-stone-200">
                <span>Remaining Balance Due:</span>
                <span className="text-rose-600">$3,000.00</span>
              </div>
            </div>

            <button
              onClick={handlePayBalance}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3.5 text-xs font-bold text-white shadow-lg hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="h-4 w-4" /> Pay Remaining Balance ($3,000.00) via Apple Pay / Card
            </button>

            {paymentSuccess && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 text-center flex items-center justify-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span>Payment of $3,000.00 processed successfully! Confirmation sent to camille@example.com.</span>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
