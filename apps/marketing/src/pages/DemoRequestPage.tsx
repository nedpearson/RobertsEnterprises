import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft } from 'lucide-react';

export default function DemoRequestPage() {
  const [leadType, setLeadType] = useState('DEMO');
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', company: '', phone: '' });
  const [submitted, setSubmitted] = useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('type') === 'PLAN') {
      setLeadType('PLAN_REQUEST');
    }
  }, []);

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // REAL Supabase insert as requested by user to remove mock
    const { error } = await supabase.from('platform_leads').insert([{
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      company_name: formData.company,
      phone: formData.phone,
      lead_type: leadType
    }]);
    
    if (error) {
      console.error(error);
      alert("There was an issue submitting your request. Please try again or contact support.");
      return;
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#080B12] text-white flex items-center justify-center p-4" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="max-w-md w-full bg-white/5 border border-white/10 p-8 rounded-2xl text-center">
          <h2 className="text-3xl font-semibold mb-4 text-white">Thank You</h2>
          <p className="text-stone-300 mb-8">Your request has been received. Our team will be in touch shortly to complete your onboarding.</p>
          <a href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-stone-200 transition-colors">
            <ArrowLeft size={18} /> Return to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080B12] text-white flex items-center justify-center p-4" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="max-w-md w-full">
        <div className="mb-8">
          <a href="/" className="inline-flex items-center gap-2 text-stone-400 hover:text-white transition-colors">
            <ArrowLeft size={16} /> Back
          </a>
        </div>
        
        <div className="bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-sm">
          <h1 className="text-3xl font-semibold mb-2 text-white">
            {leadType === 'DEMO' ? 'Book a Demo' : 'Request a Plan'}
          </h1>
          <p className="text-stone-400 mb-8">
            Tell us about your boutique, and we'll help you find the perfect fit.
          </p>

          <form onSubmit={handleLeadSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">First Name</label>
                <input type="text" required className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-colors" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Last Name</label>
                <input type="text" required className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-colors" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Email Address</label>
              <input type="email" required className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-colors" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Company / Boutique Name</label>
              <input type="text" required className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-colors" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Phone Number</label>
              <input type="tel" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-colors" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>

            <button type="submit" className="w-full bg-white text-black font-medium text-lg px-4 py-3 rounded-lg mt-6 hover:bg-stone-200 transition-colors">
              Submit Request
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
