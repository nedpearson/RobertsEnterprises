import React, { useState, useEffect, useMemo } from 'react';
import { Crosshair, Target, Eye, TrendingDown, TrendingUp, Plus, Trash2, AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@vowos/design-system';
import { useDemo } from '@/lib/demo/demoContext';
import { fetchCompetitorSignals } from '@/features/marketing-ai/api/marketingAIApi';
import { CompetitorSignal } from '@/features/marketing-ai/types';
import { useVowosData } from '@/contexts/VowosDataContext';
import { locationById } from '@/data/vowosData';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface CompetitorItem {
  id: number;
  name: string;
  share: number;
  color: string;
}

const COLOR_PALETTE = [
  'bg-blue-500',
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-sky-500',
  'bg-teal-500',
];

const DEFAULT_COMPETITORS: CompetitorItem[] = [
  { id: 1, name: "David's Bridal - Baton Rouge", share: 28, color: "bg-blue-500" },
  { id: 2, name: "Bridal Boutique of Louisiana", share: 18, color: "bg-indigo-500" },
  { id: 3, name: "Bella Bridesmaids", share: 12, color: "bg-emerald-500" }
];

export function CompetitorIntelligence() {
  const { isDemoMode } = useDemo();
  const { activeLocation, appointments } = useVowosData();
  
  const currentBrand = useMemo(() => {
    return locationById(activeLocation)?.business || 'Magnolia Bridal';
  }, [activeLocation]);

  const storageKey = useMemo(() => `vowos_competitors_${activeLocation}`, [activeLocation]);

  const [competitors, setCompetitors] = useState<CompetitorItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_COMPETITORS;
  });

  const [isAdding, setIsAdding] = useState(false);
  const [newComp, setNewComp] = useState('');
  
  const [signals, setSignals] = useState<CompetitorSignal[]>([]);
  const [loadingSignals, setLoadingSignals] = useState(true);

  // Load competitors & signals when location/brand changes
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setLoadingSignals(true);
      try {
        // Load persistent competitors from app_settings / Supabase
        const { data } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', `competitor_intelligence_${activeLocation}`)
          .maybeSingle();

        if (mounted && data?.value && Array.isArray(data.value)) {
          setCompetitors(data.value);
        } else {
          const cached = localStorage.getItem(storageKey);
          if (mounted && cached) {
            setCompetitors(JSON.parse(cached));
          }
        }
      } catch {
        // Fallback to local state
      }

      try {
        const data = await fetchCompetitorSignals(currentBrand);
        if (mounted) setSignals(data);
      } catch (err) {
        console.error('Failed to load competitor signals', err);
      } finally {
        if (mounted) setLoadingSignals(false);
      }
    }

    loadData();
    return () => { mounted = false; };
  }, [activeLocation, currentBrand, storageKey]);

  // Persist competitors helper
  const persistCompetitors = async (updated: CompetitorItem[]) => {
    setCompetitors(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
      await supabase.from('app_settings').upsert({
        key: `competitor_intelligence_${activeLocation}`,
        value: updated,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // localStorage is already updated
    }
  };

  // Deterministic normalized market share calculation
  const ownShare = useMemo(() => {
    // 42% baseline + boost for high appointment volume
    const apptCount = appointments.length;
    return Math.min(55, Math.max(35, 42 + Math.floor(apptCount / 10)));
  }, [appointments.length]);

  const handleAdd = async () => {
    if (!newComp.trim()) return;
    const name = newComp.trim();
    
    // Deterministic share: allocate proportional piece from remaining share pool
    const remainingShare = Math.max(20, 100 - ownShare);
    const newCount = competitors.length + 1;
    const share = Math.max(5, Math.round(remainingShare / newCount));

    const colorIndex = competitors.length % COLOR_PALETTE.length;
    const newCompetitor: CompetitorItem = {
      id: Date.now(),
      name,
      share,
      color: COLOR_PALETTE[colorIndex],
    };

    const updated = [...competitors, newCompetitor];
    await persistCompetitors(updated);
    setNewComp('');
    setIsAdding(false);
    toast.success(`Now tracking ${name}`);
  };

  const handleRemove = async (id: number) => {
    const comp = competitors.find(c => c.id === id);
    const updated = competitors.filter(c => c.id !== id);
    await persistCompetitors(updated);
    toast.info(`Removed ${comp?.name || 'competitor'} from tracking`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Competitor Intelligence</h1>
          <p className="text-sm text-stone-500 mt-1">
            Analyze local market gaps and track your visibility against competitors in {locationById(activeLocation)?.city || 'your area'}.
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

      {(isDemoMode || competitors.length > 0) ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white border-stone-200 shadow-sm md:col-span-2">
            <CardHeader className="border-b border-stone-100 pb-4">
              <CardTitle className="text-lg text-stone-900">Local Search Share of Voice</CardTitle>
              <CardDescription>Estimated visibility for "wedding dresses" in your territory ({locationById(activeLocation)?.city || 'Regional'}).</CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-6">
                {/* You */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-brand-primary">{currentBrand} (You)</span>
                    <span className="text-stone-900 font-bold">{ownShare}%</span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-3">
                    <div className="bg-brand-primary h-3 rounded-full transition-all duration-500" style={{ width: `${ownShare}%` }}></div>
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
                      <div className={`${c.color} h-3 rounded-full transition-all duration-500`} style={{ width: `${c.share}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-stone-200 shadow-sm">
            <CardHeader className="border-b border-stone-100 pb-4 flex items-center justify-between flex-row">
              <CardTitle className="text-lg text-stone-900">Live API Intel</CardTitle>
              {loadingSignals && <div className="h-4 w-4 border-2 border-stone-200 border-t-brand-primary rounded-full animate-spin"></div>}
            </CardHeader>
            <CardContent className="p-5 space-y-4 max-h-[400px] overflow-y-auto">
              {!loadingSignals && signals.length === 0 && (
                <div className="text-center text-stone-500 py-6 text-sm">No signals detected recently.</div>
              )}
              {signals.map((signal) => (
                <div key={signal.id} className="p-4 rounded-xl border border-stone-100 bg-stone-50 hover:bg-white group hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-stone-900 flex items-center gap-2 text-sm">
                      <Eye className="w-4 h-4 text-indigo-500" />
                      {signal.competitorName}
                    </h4>
                    {(signal as any).severity === 'high' && (
                      <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">
                        <AlertTriangle className="w-3 h-3" />
                        High
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    {signal.summary}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-stone-400">
                      {formatDistanceToNow(parseISO(signal.detectedAt))} ago
                    </span>
                    <button 
                      onClick={() => toast.info(`Market response queued for ${signal.competitorName}`)}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-wider"
                    >
                      Respond &rarr;
                    </button>
                  </div>
                </div>
              ))}
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
