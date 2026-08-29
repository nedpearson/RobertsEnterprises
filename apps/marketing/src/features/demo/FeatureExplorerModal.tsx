import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, ChevronRight, Compass, Sparkles } from 'lucide-react';
import { FEATURE_REGISTRY, FeatureCategory } from '@/data/featureRegistry';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FeatureExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeatureExplorerModal({ isOpen, onClose }: FeatureExplorerModalProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FeatureCategory | 'ALL' | 'JOURNEYS'>('ALL');

  if (!isOpen) return null;

  const categories: (FeatureCategory | 'ALL' | 'JOURNEYS')[] = ['ALL', 'JOURNEYS', 'APPOINTMENTS', 'CUSTOMERS', 'SALES', 'INVENTORY', 'TEAM', 'GROWTH', 'REPORTING', 'CONNECTIONS', 'AI'];

  const filteredFeatures = FEATURE_REGISTRY.filter(f => {
    if (f.releaseState !== 'PRODUCTION' && f.releaseState !== 'BETA') return false;
    if (selectedCategory !== 'ALL' && f.category !== selectedCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return f.name.toLowerCase().includes(q) || f.oneSentenceValue.toLowerCase().includes(q) || f.category.toLowerCase().includes(q);
    }
    return true;
  });

  const handleOpenFeature = (route: string) => {
    navigate(route);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex h-[85vh] w-[90vw] max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-900 text-white">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900">VowOS Feature Explorer</h2>
              <p className="text-sm font-medium text-stone-500">Explore {FEATURE_REGISTRY.filter(f => f.releaseState === 'PRODUCTION' || f.releaseState === 'BETA').length} capabilities</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-stone-400 hover:bg-stone-200 hover:text-stone-900 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0 border-r border-stone-200 bg-stone-50 p-4 flex flex-col gap-2">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input 
                placeholder="Search features..." 
                className="pl-9 bg-white border-stone-200 shadow-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <ScrollArea className="flex-1">
              <div className="flex flex-col gap-1 pr-4">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${selectedCategory === cat ? 'bg-stone-900 text-white shadow-md' : 'text-stone-600 hover:bg-stone-200 hover:text-stone-900'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          
          {/* Journeys View */}
          {selectedCategory === 'JOURNEYS' && (
            <div className="flex-1 overflow-y-auto bg-stone-100 p-6">
              <div className="max-w-4xl mx-auto space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-stone-900 mb-4">Guided Demo Journeys</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm hover:border-stone-400 cursor-pointer transition-colors" onClick={() => handleOpenFeature('/demo/customers')}>
                      <h4 className="font-bold text-stone-900 mb-1">Complete Bridal Sale</h4>
                      <p className="text-sm text-stone-500 mb-4">Follow a single bride from lead capture, to appointment, to sale, and finally pickup.</p>
                      <div className="text-xs font-semibold text-stone-400">Lead → Appt → Sale → PO → Fitting</div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm hover:border-stone-400 cursor-pointer transition-colors" onClick={() => handleOpenFeature('/demo/reports')}>
                      <h4 className="font-bold text-stone-900 mb-1">Full Owner Mode</h4>
                      <p className="text-sm text-stone-500 mb-4">Experience VowOS as a multi-location owner checking health, growth, and team performance.</p>
                      <div className="text-xs font-semibold text-stone-400">Reports → Multi-Location → Staff → Growth</div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-bold text-stone-900 mb-4">VowOS Capability Map</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-bold text-blue-900 text-sm tracking-widest uppercase mb-2">Run the Business</h4>
                      {['Appointments', 'Customers', 'Sales', 'Inventory', 'Team'].map(i => <div key={i} className="text-sm font-medium text-stone-600 hover:text-stone-900 cursor-pointer">{i}</div>)}
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-bold text-emerald-900 text-sm tracking-widest uppercase mb-2">Grow the Business</h4>
                      {['Leads', 'Marketing', 'SEO', 'Reviews', 'AI'].map(i => <div key={i} className="text-sm font-medium text-stone-600 hover:text-stone-900 cursor-pointer">{i}</div>)}
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-bold text-amber-900 text-sm tracking-widest uppercase mb-2">Control the Business</h4>
                      {['Reports', 'Settings', 'Connections', 'Users', 'Modules'].map(i => <div key={i} className="text-sm font-medium text-stone-600 hover:text-stone-900 cursor-pointer">{i}</div>)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Grid */}
          {selectedCategory !== 'JOURNEYS' && (
            <div className="flex-1 overflow-y-auto bg-stone-100 p-6">
            {filteredFeatures.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Compass className="mb-4 h-12 w-12 text-stone-300" />
                <h3 className="text-lg font-bold text-stone-900">No features found</h3>
                <p className="text-sm text-stone-500">Try adjusting your search or category filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFeatures.map(f => (
                  <div key={f.id} className="group relative flex flex-col rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-all hover:border-stone-300 hover:shadow-md">
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <h4 className="font-bold text-stone-900 leading-tight">{f.name}</h4>
                      {f.releaseState === 'BETA' && <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50">BETA</Badge>}
                      {f.category === 'AI' && <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0" />}
                    </div>
                    <p className="mb-4 flex-1 text-sm text-stone-600">{f.oneSentenceValue}</p>
                    <div className="mt-auto flex items-center justify-between border-t border-stone-100 pt-4">
                      <div className="text-xs font-semibold uppercase tracking-wider text-stone-400">{f.workspace}</div>
                      <button onClick={() => handleOpenFeature(f.route)} className="flex items-center text-sm font-bold text-stone-900 opacity-0 transition-opacity group-hover:opacity-100">
                        Open <ChevronRight className="ml-1 h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
            )}
        </div>
      </div>
    </div>
  );
}
