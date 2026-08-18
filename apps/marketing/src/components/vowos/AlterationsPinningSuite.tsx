import React, { useState, useRef } from 'react';
import { Scissors, MapPin, Printer, ShieldCheck, X, ChevronRight, Save, Undo } from 'lucide-react';
import { Modal, btnPrimary } from '@/components/vowos/ui';
import { AlterationJob } from '@/lib/contractsAlterations';

interface Pin {
  id: string;
  x: number;
  y: number;
  label: string;
  cost: number;
}

interface AlterationsPinningSuiteProps {
  open: boolean;
  onClose: () => void;
  job: AlterationJob | null;
  onSaveCost?: (jobId: string, totalCostCents: number) => void;
}

const PIN_TYPES = [
  { label: 'Hem (Front)', cost: 150 },
  { label: 'Take in Side Seams', cost: 120 },
  { label: 'French Bustle (5pt)', cost: 250 },
  { label: 'Take in Bust', cost: 95 },
  { label: 'Let out Hips', cost: 110 },
  { label: 'Shorten Straps', cost: 45 },
];

export function AlterationsPinningSuite({ open, onClose, job, onSaveCost }: AlterationsPinningSuiteProps) {
  const [pins, setPins] = useState<Pin[]>([]);
  const [activePinType, setActivePinType] = useState(PIN_TYPES[0]);
  const [view, setView] = useState<'front' | 'back'>('front');
  const [signature, setSignature] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  if (!job) return null;

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imageRef.current) return;
    
    // Calculate percentage-based coordinates to handle responsiveness
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setPins([...pins, {
      id: Math.random().toString(36).substr(2, 9),
      x,
      y,
      label: activePinType.label,
      cost: activePinType.cost
    }]);
  };

  const removePin = (id: string) => {
    setPins(pins.filter(p => p.id !== id));
  };

  const totalCost = pins.reduce((sum, pin) => sum + pin.cost, 0);

  const handleGenerateTicket = () => {
    // In a real app, this would save the pins to the database and generate a PDF
    if (onSaveCost) {
      onSaveCost(job.id, totalCost * 100);
    }
    alert(`Alteration ticket generated successfully for ${job.customer}. Total: $${totalCost}`);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Interactive Pinning Suite">
      <div className="flex flex-col h-[700px] -mx-4">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-900 text-white flex justify-between items-center -mt-4 mb-4">
          <div>
            <h2 className="font-serif text-xl font-bold">Digital Pinning: {job.gown}</h2>
            <p className="text-xs text-stone-400">Client: {job.customer} | Stylist: {job.seamstress}</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setView('front')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${view === 'front' ? 'bg-rose-500 text-white' : 'bg-stone-800 text-stone-300'}`}
            >
              Front View
            </button>
            <button 
              onClick={() => setView('back')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${view === 'back' ? 'bg-rose-500 text-white' : 'bg-stone-800 text-stone-300'}`}
            >
              Back View
            </button>
          </div>
        </div>

        <div className="flex-1 flex px-4 gap-6 overflow-hidden">
          
          {/* Left Canvas Area */}
          <div className="flex-1 bg-stone-100 rounded-2xl border border-stone-200 p-4 flex items-center justify-center relative overflow-hidden">
            <div className="relative inline-block">
              {/* Dummy Wireframe Image - In production, this would be a dynamic SVG or actual dress photo */}
              <img 
                ref={imageRef}
                src={view === 'front' 
                  ? 'https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&q=80&w=400'
                  : 'https://images.unsplash.com/photo-1546804784-896d0dca3800?auto=format&fit=crop&q=80&w=400'} 
                alt="Gown Wireframe" 
                className="max-h-[500px] w-auto object-cover rounded-xl shadow-sm border border-stone-300 cursor-crosshair opacity-80"
                onClick={handleImageClick}
              />
              
              {/* Render Pins */}
              {pins.map((pin, idx) => (
                <div 
                  key={pin.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 group z-10"
                  style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                >
                  <div className="relative flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-rose-600 drop-shadow-md fill-rose-50" />
                    <span className="absolute text-[10px] font-bold text-rose-900 mt-1">{idx + 1}</span>
                  </div>
                  
                  {/* Tooltip */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block w-max bg-stone-900 text-white text-[10px] px-2 py-1 rounded shadow-lg">
                    {pin.label} (${pin.cost})
                  </div>
                </div>
              ))}
            </div>

            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg border border-stone-200 shadow-sm text-xs text-stone-600 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-rose-500" />
              Click on the dress to drop a pin
            </div>
          </div>

          {/* Right Sidebar - Controls & Ticket */}
          <div className="w-80 flex flex-col gap-4">
            
            {/* Tool Selector */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
              <h3 className="font-bold text-stone-900 text-sm mb-3">Active Tool</h3>
              <div className="space-y-2">
                {PIN_TYPES.map(type => (
                  <button
                    key={type.label}
                    onClick={() => setActivePinType(type)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex justify-between items-center transition-colors ${
                      activePinType.label === type.label 
                        ? 'bg-rose-50 border-rose-200 border text-rose-700' 
                        : 'bg-stone-50 border-stone-200 border text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <span>{type.label}</span>
                    <span className="text-stone-400">${type.cost}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Itemized Ticket */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm flex-1 flex flex-col">
              <h3 className="font-bold text-stone-900 text-sm mb-3 border-b border-stone-100 pb-2">Digital Ticket</h3>
              
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {pins.length === 0 ? (
                  <p className="text-xs text-stone-400 italic text-center mt-4">No pins dropped yet.</p>
                ) : (
                  pins.map((pin, idx) => (
                    <div key={pin.id} className="flex items-center justify-between group text-xs border-b border-stone-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center font-bold text-[9px]">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-stone-700">{pin.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-stone-500">${pin.cost}</span>
                        <button onClick={() => removePin(pin.id)} className="text-stone-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-stone-200">
                <div className="flex justify-between items-center font-bold text-stone-900 mb-4">
                  <span>Estimated Total:</span>
                  <span className="text-emerald-600">${totalCost}</span>
                </div>
                
                <label className="flex items-center gap-2 text-[10px] text-stone-500 bg-stone-50 p-2 rounded-lg border border-stone-100 mb-3 cursor-pointer">
                  <input type="checkbox" checked={signature} onChange={(e) => setSignature(e.target.checked)} className="rounded text-rose-500 focus:ring-rose-500" />
                  <span>I authorize these alterations and the estimated cost. (Client E-Signature)</span>
                </label>

                <button 
                  onClick={handleGenerateTicket}
                  disabled={pins.length === 0 || !signature}
                  className={`${btnPrimary} w-full justify-center disabled:opacity-50`}
                >
                  <Printer className="h-4 w-4 mr-1" /> Finalize & Print Ticket
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Modal>
  );
}
