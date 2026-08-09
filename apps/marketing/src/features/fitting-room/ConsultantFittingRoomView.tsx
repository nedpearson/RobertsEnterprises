import React, { useState } from 'react';
import { Sparkles, Barcode, CheckCircle2, Heart, MessageSquare, Camera, Mail, Plus, X, ShieldCheck } from 'lucide-react';
import { formatCents } from '@/data/vowosData';

export default function ConsultantFittingRoomView() {
  const [selectedBride, setSelectedBride] = useState('Camille Fontenot');
  const [fittingGowns, setFittingGowns] = useState([
    { id: '1', name: 'Monique Lhuillier Bliss Gown', style: 'ML-BLISS-01', price: '$4,500', rating: 'loved', notes: 'Loved the silk satin train, fits bust perfectly.' },
    { id: '2', name: 'Ines Di Santo Atelier Gown', style: 'IDS-FALL-02', price: '$5,200', rating: 'maybe', notes: 'Neckline is gorgeous, feels slightly heavy.' },
  ]);

  const [newGownInput, setNewGownInput] = useState('');
  const [summarySent, setSummarySent] = useState(false);

  const addGownToRack = () => {
    if (!newGownInput) return;
    setFittingGowns((prev) => [
      ...prev,
      { id: Date.now().toString(), name: newGownInput, style: 'SAMPLE-BARCODE', price: '$3,800', rating: 'pending', notes: 'Barcode scanned into fitting suite.' },
    ]);
    setNewGownInput('');
  };

  const updateRating = (id: string, rating: string) => {
    setFittingGowns((prev) => prev.map((g) => (g.id === id ? { ...g, rating } : g)));
  };

  const handleSendSummary = () => {
    setSummarySent(true);
    setTimeout(() => setSummarySent(false), 4000);
  };

  return (
    <div className="space-y-6 select-none pb-12">
      
      {/* Fitting Room Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-stone-900 via-purple-950 to-stone-900 text-white p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-purple-300 bg-purple-950/60 px-3 py-1 rounded-full border border-purple-800/50">
            Consultant iPad Fitting Room Mode
          </span>
          <h1 className="font-serif text-2xl font-bold mt-2">Active Fitting Suite #2 · Ramsey Roberts</h1>
          <p className="text-xs text-stone-300 mt-1">Bride: <span className="font-bold text-white">{selectedBride}</span> (1-on-1 Consultation)</p>
        </div>

        <button
          onClick={handleSendSummary}
          className="rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-purple-500 transition-colors flex items-center gap-2 cursor-pointer self-start md:self-auto"
        >
          <Mail className="h-4 w-4" /> Send Digital Fitting Summary to Bride
        </button>
      </div>

      {summarySent && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800 text-center flex items-center justify-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>Personalized Gown Fitting Summary Email &amp; High-Res Photos sent to {selectedBride}!</span>
        </div>
      )}

      {/* Barcode Quick Scanner */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-3">
        <label className="text-xs font-bold text-stone-800 flex items-center gap-2">
          <Barcode className="h-4 w-4 text-rose-500" /> Scan Gown Barcode into Suite
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newGownInput}
            onChange={(e) => setNewGownInput(e.target.value)}
            placeholder="Scan barcode or type gown style name..."
            className="flex-1 rounded-xl border border-stone-200 px-3.5 py-2 text-xs font-semibold text-stone-900 focus:border-purple-600 focus:outline-none"
          />
          <button
            onClick={addGownToRack}
            className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white hover:bg-stone-800 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Gown
          </button>
        </div>
      </div>

      {/* Fitting Rack Items */}
      <div className="space-y-4">
        <h3 className="font-serif text-lg font-bold text-stone-900">Current Fitting Suite Rack ({fittingGowns.length} Gowns)</h3>

        <div className="grid grid-cols-1 gap-4">
          {fittingGowns.map((g) => (
            <div key={g.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                <div>
                  <h4 className="font-serif text-base font-bold text-stone-900">{g.name}</h4>
                  <p className="text-xs text-stone-500 font-mono">{g.style} · {g.price}</p>
                </div>

                {/* Rating Pills */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateRating(g.id, 'loved')}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      g.rating === 'loved' ? 'bg-rose-600 text-white shadow-xs' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    <Heart className="h-3.5 w-3.5 fill-current" /> Loved It!
                  </button>
                  <button
                    onClick={() => updateRating(g.id, 'maybe')}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      g.rating === 'maybe' ? 'bg-amber-500 text-white shadow-xs' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    Contender
                  </button>
                  <button
                    onClick={() => updateRating(g.id, 'passed')}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      g.rating === 'passed' ? 'bg-stone-700 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    Passed
                  </button>
                </div>
              </div>

              {/* Notes & Photo Attachment */}
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={g.notes}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFittingGowns((prev) => prev.map((item) => (item.id === g.id ? { ...item, notes: val } : item)));
                  }}
                  placeholder="Stylist fitting notes (fabric preference, train length...)"
                  className="flex-1 rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-800"
                />
                <button className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-100 transition-colors flex items-center gap-1.5 cursor-pointer">
                  <Camera className="h-3.5 w-3.5 text-purple-600" /> Photo
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
