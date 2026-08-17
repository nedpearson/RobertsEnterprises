import React, { useState } from 'react';
import { Crosshair, Target, Eye, TrendingDown, TrendingUp, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@vowos/design-system';
import { useDemo } from '@/lib/demo/demoContext';

export function CompetitorIntelligence() {
  const { isDemoMode } = useDemo();
  const [competitors, setCompetitors] = useState([
    { id: 1, name: "David's Bridal - Baton Rouge", share: 28, color: "bg-blue-500" },
    { id: 2, name: "I Do Bridal Couture", share: 18, color: "bg-indigo-500" },
    { id: 3, name: "Bella Bridesmaids", share: 12, color: "bg-emerald-500" }
  ]);
  const [isAdding, setIsAdding] = useState(false);
  const [newComp, setNewComp] = useState('');

  const handleAdd = () => {
    if (newComp.trim()) {
      setCompetitors([...competitors, { id: Date.now(), name: newComp, share: Math.floor(Math.random() * 10) + 1, color: "bg-stone-500" }]);
      setNewComp('');
      setIsAdding(false);
    }
  };

  const handleRemove = (id: number) => {
    setCompetitors(competitors.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Competitor Intelligence</h1>
          <p className="text-sm text-stone-500 mt-1">
            Analyze local market gaps and track your visibility against competitors.
          </p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Competitor
          </button>
        )}
      </div>

      {isAdding && (
        <Card className="bg-brand-soft/30 border-brand-primary/20 shadow-sm animate-in fade-in slide-in-from-top-4">
          <CardContent className="p-4 flex items-center gap-4">
            <input 
              type="text"
              autoFocus
              value={newComp}
              onChange={(e) => setNewComp(e.target.value)}
              placeholder="Enter competitor business name or website URL..."
              className="flex-1 bg-white border border-brand-primary/20 rounded-lg px-4 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button onClick={handleAdd} className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg text-sm font-medium transition-colors">
              Start Tracking
            </button>
            <button onClick={() => setIsAdding(false)} className="px-4 py-2 bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 rounded-lg text-sm font-medium transition-colors">
              Cancel
            </button>
          </CardContent>
        </Card>
      )}

      {isDemoMode ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white border-stone-200 shadow-sm md:col-span-2">
            <CardHeader className="border-b border-stone-100 pb-4">
              <CardTitle className="text-lg text-stone-900">Local Search Share of Voice</CardTitle>
              <CardDescription>Estimated visibility for "wedding dresses" in your territory.</CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-6">
                {/* You */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-brand-primary">Magnolia Bridal (You)</span>
                    <span className="text-stone-900 font-bold">42%</span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-3">
                    <div className="bg-brand-primary h-3 rounded-full" style={{ width: '42%' }}></div>
                  </div>
                </div>
                
                {/* Competitors */}
                {competitors.map(c => (
                  <div key={c.id} className="group">
                    <div className="flex justify-between items-center text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-stone-700 font-medium">{c.name}</span>
                        <button onClick={() => handleRemove(c.id)} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-rose-50 rounded">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-stone-600 font-medium">{c.share}%</span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-3">
                      <div className={`${c.color} h-3 rounded-full`} style={{ width: `${c.share}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-stone-200 shadow-sm">
            <CardHeader className="border-b border-stone-100 pb-4">
              <CardTitle className="text-lg text-stone-900">Market Gaps Found</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 group hover:shadow-md transition-all">
                <h4 className="font-semibold text-emerald-900 flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-600" />
                  Plus Size Gowns
                </h4>
                <p className="text-xs text-emerald-800 mt-2">
                  None of your tracked competitors rank on page 1 for "plus size wedding dresses baton rouge".
                </p>
                <button className="mt-3 text-xs font-bold text-emerald-700 group-hover:text-emerald-900 transition-colors flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-emerald-200 shadow-sm">
                  Create Landing Page &rarr;
                </button>
              </div>
              
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 group hover:shadow-md transition-all">
                <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  Justin Alexander
                </h4>
                <p className="text-xs text-blue-800 mt-2">
                  "I Do Bridal Couture" recently removed Justin Alexander from their website's designer list.
                </p>
                <button className="mt-3 text-xs font-bold text-blue-700 group-hover:text-blue-900 transition-colors flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm">
                  Boost Ad Spend &rarr;
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="bg-white border-stone-200 shadow-sm">
          <CardContent className="p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-stone-50 border border-stone-100 text-stone-400">
              <Crosshair className="h-8 w-8" />
            </div>
            <h3 className="mt-6 text-lg font-medium text-stone-900">Competitor Tracking Setup Required</h3>
            <p className="mt-2 text-sm text-stone-500 max-w-md mx-auto">
              Add your key local competitors to begin analyzing search visibility share of voice and tracking market gaps.
            </p>
            <button 
              onClick={() => setIsAdding(true)}
              className="mt-6 rounded-lg bg-white border border-stone-200 px-6 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors shadow-sm"
            >
              Configure Competitors
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
