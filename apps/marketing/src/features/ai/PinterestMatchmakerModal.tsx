import React, { useState, useEffect } from 'react';
import { Sparkles, Upload, Loader2, Link2, Search, CheckCircle2, ChevronRight, Wand2 } from 'lucide-react';
import { Modal, btnPrimary } from '@/components/vowos/ui';

interface MatchmakerModalProps {
  open: boolean;
  onClose: () => void;
  brideName: string;
  onGownsSelected: (gowns: any[]) => void;
}

const DEMO_INVENTORY = [
  { id: '1', name: 'Monique Lhuillier Bliss', style: 'ML-BLISS-01', price: '$4,500', image: 'https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&q=80&w=400', tags: ['silk', 'a-line', 'minimalist'] },
  { id: '2', name: 'Ines Di Santo Atelier', style: 'IDS-FALL-02', price: '$5,200', image: 'https://images.unsplash.com/photo-1546804784-896d0dca3800?auto=format&fit=crop&q=80&w=400', tags: ['lace', 'mermaid', 'dramatic'] },
  { id: '3', name: 'Galia Lahav Couture', style: 'GL-2026', price: '$8,900', image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=80&w=400', tags: ['tulle', 'ballgown', 'romantic'] },
  { id: '4', name: 'Berta Privee', style: 'BP-04', price: '$7,100', image: 'https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&q=80&w=400', tags: ['fitted', 'plunge', 'modern'] },
];

export function PinterestMatchmakerModal({ open, onClose, brideName, onGownsSelected }: MatchmakerModalProps) {
  const [step, setStep] = useState<'input' | 'analyzing' | 'results'>('input');
  const [inputUrl, setInputUrl] = useState('');
  const [selectedMatches, setSelectedMatches] = useState<Set<string>>(new Set());

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setStep('input');
      setInputUrl('');
      setSelectedMatches(new Set());
    }
  }, [open]);

  const handleAnalyze = () => {
    if (!inputUrl) return;
    setStep('analyzing');
    // Simulate AI processing time
    setTimeout(() => {
      setStep('results');
    }, 3000);
  };

  const toggleMatch = (id: string) => {
    const next = new Set(selectedMatches);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedMatches(next);
  };

  const handlePushToRack = () => {
    const selectedGowns = DEMO_INVENTORY.filter(g => selectedMatches.has(g.id));
    onGownsSelected(selectedGowns);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="AI Vision Stylist">
      <div className="flex flex-col h-[600px]">
        {/* Header Area */}
        <div className="bg-gradient-to-r from-stone-900 via-purple-950 to-stone-900 text-white p-6 -mt-4 -mx-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-purple-500/20 p-2 rounded-xl backdrop-blur border border-purple-500/30">
              <Sparkles className="h-6 w-6 text-purple-300" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold">Pinterest Matchmaker</h2>
              <p className="text-xs text-purple-200 mt-0.5">Matching {brideName}'s vision with live boutique inventory.</p>
            </div>
          </div>
        </div>

        {/* Step 1: Input */}
        {step === 'input' && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6">
            <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center border-4 border-white shadow-lg mb-4">
              <Upload className="h-8 w-8 text-stone-300" />
            </div>
            <div className="text-center max-w-md">
              <h3 className="font-serif text-2xl text-stone-900 font-bold mb-2">Upload Inspiration</h3>
              <p className="text-sm text-stone-500">Paste a link to {brideName}'s Pinterest board, or upload a screenshot. Our AI vision model will extract the aesthetic and find perfect matches in stock.</p>
            </div>

            <div className="w-full max-w-md space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Link2 className="h-5 w-5 text-stone-400" />
                </div>
                <input
                  type="url"
                  className="block w-full pl-10 pr-3 py-3 border border-stone-200 rounded-xl leading-5 bg-stone-50 placeholder-stone-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors sm:text-sm font-medium text-stone-900 shadow-sm"
                  placeholder="https://pinterest.com/..."
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-stone-300 border-dashed rounded-xl cursor-pointer bg-stone-50 hover:bg-stone-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <p className="mb-2 text-sm text-stone-500"><span className="font-semibold text-purple-600">Click to upload</span> or drag and drop</p>
                    <p className="text-xs text-stone-400">PNG, JPG or WEBP (MAX. 5MB)</p>
                  </div>
                  <input type="file" className="hidden" />
                </label>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={!inputUrl}
                className={`w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white transition-colors ${
                  inputUrl ? 'bg-purple-600 hover:bg-purple-700' : 'bg-stone-300 cursor-not-allowed'
                }`}
              >
                <Wand2 className="h-4 w-4 mr-2" /> Extract Aesthetic
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Analyzing */}
        {step === 'analyzing' && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
              <div className="bg-white p-6 rounded-full shadow-2xl relative border border-stone-100">
                <Loader2 className="h-12 w-12 text-purple-600 animate-spin" />
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="font-serif text-xl font-bold text-stone-900">Vision Analysis in Progress...</h3>
              <div className="text-sm text-stone-500 font-medium space-y-1">
                <p className="flex items-center justify-center gap-2 text-emerald-600"><CheckCircle2 className="h-3 w-3" /> Extracted silhouette preferences</p>
                <p className="flex items-center justify-center gap-2 text-emerald-600"><CheckCircle2 className="h-3 w-3" /> Identified lace & fabric patterns</p>
                <p className="flex items-center justify-center gap-2 text-emerald-600 animate-pulse"><Search className="h-3 w-3" /> Querying live boutique inventory...</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 'results' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg font-bold text-stone-900">AI Inventory Matches</h3>
              <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded-full">4 high-confidence matches found</span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {DEMO_INVENTORY.map((gown) => {
                const isSelected = selectedMatches.has(gown.id);
                return (
                  <div
                    key={gown.id}
                    onClick={() => toggleMatch(gown.id)}
                    className={`flex items-start gap-4 p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected ? 'border-purple-500 bg-purple-50/30 shadow-md ring-1 ring-purple-200' : 'border-stone-200 bg-white hover:border-purple-300'
                    }`}
                  >
                    <img src={gown.image} alt={gown.name} className="w-20 h-28 object-cover rounded-lg border border-stone-200 shadow-sm" />
                    <div className="flex-1 space-y-1.5 py-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-serif font-bold text-stone-900">{gown.name}</h4>
                          <p className="text-[11px] text-stone-500 font-mono">{gown.style}</p>
                        </div>
                        <div className={`h-5 w-5 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-purple-600 border-purple-600 text-white' : 'border-stone-300'
                        }`}>
                          {isSelected && <CheckCircle2 className="h-3 w-3" />}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {gown.tags.map(tag => (
                          <span key={tag} className="text-[9px] font-bold uppercase tracking-wider text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 mt-1">
                        <Sparkles className="h-3 w-3" /> 92% aesthetic match
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-stone-100 mt-4">
              <button
                onClick={handlePushToRack}
                disabled={selectedMatches.size === 0}
                className={`${btnPrimary} w-full justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Pull {selectedMatches.size} Gown{selectedMatches.size !== 1 ? 's' : ''} to Fitting Rack <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
