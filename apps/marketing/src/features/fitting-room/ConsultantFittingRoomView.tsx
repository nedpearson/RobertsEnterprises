import React, { useState, useEffect } from 'react';
import { Sparkles, Barcode, CheckCircle2, Heart, MessageSquare, Camera, Mail, Plus, X, ShieldCheck, Wand2 } from 'lucide-react';
import { formatCents } from '@/data/vowosData';
import { PinterestMatchmakerModal } from '../ai/PinterestMatchmakerModal';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { useActiveBusinessContext } from '@/lib/services/schedulingService';

export default function ConsultantFittingRoomView() {
  const { businessId } = useActiveBusinessContext();
  const [selectedBride, setSelectedBride] = useState('Active Fitting Client');
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [fittingGowns, setFittingGowns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newGownInput, setNewGownInput] = useState('');
  const [summarySent, setSummarySent] = useState(false);
  const [matchmakerOpen, setMatchmakerOpen] = useState(false);

  useEffect(() => {
    async function initFittingRoom() {
      if (!businessId) {
        setLoading(false);
        return;
      }
      // Find an active appointment for the day (or just use latest for demo)
      const { data: appts } = await supabase
        .from('appointments')
        .select('*, customers(name)')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (appts && appts.length > 0) {
        setAppointmentId(appts[0].id);
        setSelectedBride(appts[0].customers?.name || 'Active Fitting Client');
        
        // Load gowns
        const { data: gowns } = await supabase
          .from('appointment_gowns')
          .select('*')
          .eq('appointment_id', appts[0].id)
          .order('created_at', { ascending: true });
          
        if (gowns) setFittingGowns(gowns);
      }
      setLoading(false);
    }
    initFittingRoom();
  }, [businessId]);

  const addGownToRack = async () => {
    if (!newGownInput || !appointmentId) return;
    
    if (!businessId) return;

    const { data, error } = await supabase.from('appointment_gowns').insert({
      appointment_id: appointmentId,
      business_id: businessId,
      name: newGownInput,
      style: 'SCANNED',
      price_cents: 380000,
      rating: 'pending',
      notes: 'Added to fitting suite.'
    }).select().single();

    if (!error && data) {
      setFittingGowns((prev) => [...prev, data]);
      setNewGownInput('');
    }
  };

  const updateRating = async (id: string, rating: string) => {
    const { error } = await supabase.from('appointment_gowns').update({ rating }).eq('id', id);
    if (!error) {
      setFittingGowns((prev) => prev.map((g) => (g.id === id ? { ...g, rating } : g)));
    }
  };

  const handleSendSummary = () => {
    setSummarySent(true);
    toast({ title: "Fitting Summary Sent", description: "The Bride Portal has been updated." });
    setTimeout(() => setSummarySent(false), 4000);
  };

  if (loading) return <div className="p-12 text-center text-stone-500">Initializing Fitting Suite...</div>;

  return (
    <div className="space-y-6 select-none pb-12">
      
      {/* Fitting Room Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-stone-900 via-purple-950 to-stone-900 text-white p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-purple-300 bg-purple-950/60 px-3 py-1 rounded-full border border-purple-800/50">
            Consultant iPad Fitting Room Mode
          </span>
          <h1 className="font-serif text-2xl font-bold mt-2">Active Fitting Suite #2 — Consultant</h1>
          <p className="text-xs text-stone-300 mt-1">Bride: <span className="font-bold text-white">{selectedBride}</span> (1-on-1 Consultation)</p>
        </div>

        <button
          onClick={() => setMatchmakerOpen(true)}
          className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-inner"
        >
          <Sparkles className="h-4 w-4 text-purple-300" />
          AI Pinterest Matchmaker
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Gown Rack */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-xs border border-stone-200 p-5">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2 mb-4">
              <span className="bg-stone-100 text-stone-600 p-1.5 rounded-lg"><Barcode className="h-4 w-4" /></span>
              Digital Fitting Rack
            </h2>
            
            <div className="flex gap-2 mb-6">
              <input 
                type="text"
                placeholder="Scan barcode or type gown name..."
                value={newGownInput}
                onChange={(e) => setNewGownInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addGownToRack()}
                className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              />
              <button 
                onClick={addGownToRack}
                className="bg-stone-900 hover:bg-stone-800 text-white px-5 rounded-xl font-semibold text-sm transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>

            <div className="space-y-3">
              {fittingGowns.length === 0 && (
                <div className="text-center py-8 text-stone-400 text-sm border-2 border-dashed border-stone-100 rounded-xl">
                  Rack is empty. Scan a gown to begin.
                </div>
              )}
              {fittingGowns.map((gown) => (
                <div key={gown.id} className="group relative bg-white border border-stone-200 hover:border-purple-200 hover:shadow-md transition-all rounded-xl p-4 flex flex-col sm:flex-row gap-4">
                  <div className="h-24 w-20 bg-stone-100 rounded-lg flex-shrink-0 flex items-center justify-center text-stone-300">
                    <Camera className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-stone-900 text-base">{gown.name}</h3>
                        <p className="text-xs text-stone-500 font-mono mt-0.5">{gown.style}</p>
                      </div>
                      <span className="font-bold text-stone-700 bg-stone-50 px-2.5 py-1 rounded-md text-sm border border-stone-100">
                        {gown.price_cents ? formatCents(gown.price_cents) : gown.price}
                      </span>
                    </div>
                    
                    {gown.notes && (
                      <p className="text-xs text-stone-600 mt-2 bg-stone-50 p-2 rounded-lg inline-block italic">
                        "{gown.notes}"
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button 
                        onClick={() => updateRating(gown.id, 'loved')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                          gown.rating === 'loved' ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-200' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        <Heart className={`h-3 w-3 ${gown.rating === 'loved' ? 'fill-current' : ''}`} /> Loved
                      </button>
                      <button 
                        onClick={() => updateRating(gown.id, 'maybe')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                          gown.rating === 'maybe' ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        Maybe
                      </button>
                      <button 
                        onClick={() => updateRating(gown.id, 'discarded')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                          gown.rating === 'discarded' ? 'bg-stone-200 text-stone-400 opacity-50' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        <X className="h-3 w-3" /> No
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Actions & Next Steps */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-xs border border-stone-200 p-5">
             <h3 className="font-bold text-stone-900 mb-4">Post-Appointment Summary</h3>
             <p className="text-xs text-stone-500 mb-6 leading-relaxed">
               Push the fitting notes, liked gowns, and next steps directly to the Bride Portal &amp; SMS.
             </p>
             <button 
               onClick={handleSendSummary}
               disabled={summarySent}
               className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                 summarySent ? 'bg-emerald-500 text-white' : 'bg-stone-900 text-white hover:bg-stone-800'
               }`}
             >
               {summarySent ? <><CheckCircle2 className="h-4 w-4" /> Sent to Portal</> : <><Mail className="h-4 w-4" /> Send Summary &amp; Photos</>}
             </button>
          </div>

          <div className="bg-purple-50 rounded-2xl border border-purple-100 p-5">
            <h3 className="font-bold text-purple-900 flex items-center gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-purple-600" /> Convert to Alterations
            </h3>
            <p className="text-xs text-purple-700 leading-relaxed mb-4">
              When the bride says "Yes", automatically generate a Purchase Order, measurement profile, and route the gown to the Alterations Queue.
            </p>
            <button className="w-full py-2.5 bg-white border border-purple-200 text-purple-700 rounded-xl font-bold text-xs hover:bg-purple-100 transition-colors">
              Begin Measurement Profile &rarr;
            </button>
          </div>
        </div>
      </div>

      <PinterestMatchmakerModal open={matchmakerOpen} onClose={() => setMatchmakerOpen(false)} brideName="Bride" onGownsSelected={(gowns) => {
        // Just add them locally for now
        const newAdditions = gowns.map(g => ({
          id: Date.now().toString() + Math.random().toString(36).substring(7),
          name: g.name,
          style: g.style,
          price: g.price,
          rating: 'pending',
          notes: 'Pulled via AI Pinterest Matchmaker.',
        }));
        setFittingGowns(prev => [...prev, ...newAdditions]);
        setMatchmakerOpen(false);
      }} />
    </div>
  );
}
