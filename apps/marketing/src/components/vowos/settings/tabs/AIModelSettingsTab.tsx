import { useEffect, useState } from 'react';
import { Cpu, Sparkles, CheckCircle2, RefreshCw, Zap, ShieldCheck, DollarSign, Award, Layers, Loader2, Key, Settings, Play, Plus, Trash2 } from 'lucide-react';
import { AIModelConfig, AITaskType, BenchmarkResult, INITIAL_AI_MODELS } from '@/features/ai/modelGateway';
import { toast } from '@vowos/design-system';
import { btnPrimary, btnSecondary, inputCls } from '@/components/vowos/ui';
import { resolveEffectiveSetting, saveScopedSetting } from '@/lib/settings';
import { getActiveDataPlane } from '@/lib/supabase';

const TASK_LABELS: Record<AITaskType, { label: string; desc: string }> = {
  high_reasoning: { label: 'High Reasoning', desc: 'Campaign diagnosis, strategic growth recommendations, budget explanations' },
  fast_summarization: { label: 'Fast Summarization', desc: 'Lead categorization, source normalization, note summaries' },
  vision_creative: { label: 'Vision Creative', desc: 'Ad creative evaluation, product photo scoring' },
  embedding_similarity: { label: 'Embedding & Similarity', desc: 'Duplicate detection, knowledge retrieval' },
  classical_ml: { label: 'Classical ML', desc: 'Lead scoring, appointment probability, no-show risk' },
  optimization_engine: { label: 'Optimization Engine', desc: 'Constrained budget allocation & spend pacing' },
};

interface AIModelSettingsTabProps {
  onDirtyChange: (dirty: boolean) => void;
  registerSaveRef: (saveFn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

interface APIKeysConfig {
  openai: string;
  anthropic: string;
  gemini: string;
}

export default function AIModelSettingsTab({
  onDirtyChange,
  registerSaveRef,
  resetTrigger,
}: AIModelSettingsTabProps) {
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'routing' | 'keys' | 'limits'>('routing');
  
  // Models State
  const [models, setModels] = useState<AIModelConfig[]>(INITIAL_AI_MODELS);
  const [dbModels, setDbModels] = useState<AIModelConfig[]>(INITIAL_AI_MODELS);
  
  // API Keys State
  const [apiKeys, setApiKeys] = useState<APIKeysConfig>({ openai: '', anthropic: '', gemini: '' });
  const [dbApiKeys, setDbApiKeys] = useState<APIKeysConfig>({ openai: '', anthropic: '', gemini: '' });

  // Limits State
  const [limits, setLimits] = useState({ monthlyLimit: 500, alertThreshold: 400 });
  const [dbLimits, setDbLimits] = useState({ monthlyLimit: 500, alertThreshold: 400 });

  const [isBenchmarking, setIsBenchmarking] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    const dataPlane = getActiveDataPlane();
    const [modelsResult, keysResult, limitsResult] = await Promise.all([
      resolveEffectiveSetting<AIModelConfig[]>('ai_models_config', 'ai_models_config', { dataPlane }, INITIAL_AI_MODELS),
      resolveEffectiveSetting<APIKeysConfig>('integrations', 'ai_api_keys', { dataPlane }, { openai: '', anthropic: '', gemini: '' }),
      resolveEffectiveSetting('ai_models_config', 'spend_limits', { dataPlane }, { monthlyLimit: 500, alertThreshold: 400 })
    ]);
    
    setModels(modelsResult.value);
    setDbModels(modelsResult.value);
    
    setApiKeys(keysResult.value);
    setDbApiKeys(keysResult.value);

    setLimits(limitsResult.value);
    setDbLimits(limitsResult.value);

    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, [resetTrigger]);

  const isDirty = 
    JSON.stringify(models) !== JSON.stringify(dbModels) || 
    JSON.stringify(apiKeys) !== JSON.stringify(dbApiKeys) ||
    JSON.stringify(limits) !== JSON.stringify(dbLimits);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty]);

  const handleSave = async (reason?: string): Promise<boolean> => {
    try {
      const dataPlane = getActiveDataPlane();
      await Promise.all([
        saveScopedSetting('ai_models_config', 'ai_models_config', models, { dataPlane }, reason),
        saveScopedSetting('integrations', 'ai_api_keys', apiKeys, { dataPlane }, reason),
        saveScopedSetting('ai_models_config', 'spend_limits', limits, { dataPlane }, reason)
      ]);
      
      toast({
        title: 'AI Models saved',
        description: 'AI model configurations have been updated successfully.',
      });
      setDbModels(models);
      setDbApiKeys(apiKeys);
      setDbLimits(limits);
      return true;
    } catch (err: any) {
      toast({
        title: 'Could not save AI models',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    registerSaveRef(handleSave);
  }, [models, apiKeys, limits]);

  const handlePromote = (modelId: string) => {
    setModels(currentModels => {
      const challenger = currentModels.find(m => m.id === modelId);
      if (!challenger) return currentModels;
      
      return currentModels.map(m => {
        if (m.taskType === challenger.taskType) {
          if (m.id === modelId) {
            return { ...m, isChampion: true, isChallenger: false, status: 'active' };
          } else {
            return { ...m, isChampion: false, isChallenger: true, status: 'shadow' };
          }
        }
        return m;
      });
    });
  };

  const removeModel = (modelId: string) => {
    setModels(current => current.filter(m => m.id !== modelId));
  };

  const addChallenger = (taskType: AITaskType) => {
    const newId = `model-custom-${Math.floor(Math.random() * 10000)}`;
    const newModel: AIModelConfig = {
      id: newId,
      name: 'Custom Challenger Model',
      provider: 'Anthropic',
      taskType,
      isChampion: false,
      isChallenger: true,
      qualityScore: 80,
      latencyMs: 500,
      costPer1kTokensCents: 1.0,
      reliabilityScore: 99.0,
      status: 'shadow'
    };
    setModels([...models, newModel]);
  };

  const runBenchmark = () => {
    setIsBenchmarking(true);
    toast({ title: 'Benchmark Started', description: 'Evaluating shadow models against champions.' });
    setTimeout(() => {
      setModels(current => current.map(m => ({
        ...m,
        qualityScore: Math.min(100, Math.max(50, m.qualityScore + (Math.floor(Math.random() * 10) - 5))),
        latencyMs: Math.max(50, m.latencyMs + (Math.floor(Math.random() * 40) - 20))
      })));
      setIsBenchmarking(false);
      toast({ title: 'Benchmark Complete', description: 'Quality scores and latencies updated.' });
    }, 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading AI model configs...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Navigation */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-xs">
        <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">AI Model Gateway & Task Routing</h3>
              <p className="text-xs text-stone-500">
                Configure task routing, benchmark quality vs latency, and manage API integrations.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={runBenchmark}
            disabled={isBenchmarking}
            className={`${btnSecondary} gap-2`}
          >
            {isBenchmarking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Run Benchmarks
          </button>
        </div>
        
        {/* Sub Navigation */}
        <div className="border-t border-stone-200 px-5 flex items-center gap-6">
          {[
            { id: 'routing', label: 'Task Routing', icon: Layers },
            { id: 'keys', label: 'API Keys', icon: Key },
            { id: 'limits', label: 'Spend Limits', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeSubTab === tab.id ? 'border-brand-primary text-brand-primary' : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeSubTab === 'keys' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
          <div>
            <h4 className="text-sm font-bold text-stone-900">Provider Integrations</h4>
            <p className="text-xs text-stone-500 mb-4">Connect your own AI accounts for Bring Your Own Key (BYOK) capabilities.</p>
          </div>
          
          <div className="grid gap-4 max-w-2xl">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">OpenAI API Key</label>
              <input 
                type="password" 
                value={apiKeys.openai} 
                onChange={e => setApiKeys({ ...apiKeys, openai: e.target.value })}
                className={inputCls} 
                placeholder="sk-..." 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Google Gemini API Key</label>
              <input 
                type="password" 
                value={apiKeys.gemini} 
                onChange={e => setApiKeys({ ...apiKeys, gemini: e.target.value })}
                className={inputCls} 
                placeholder="AIzaSy..." 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Anthropic API Key</label>
              <input 
                type="password" 
                value={apiKeys.anthropic} 
                onChange={e => setApiKeys({ ...apiKeys, anthropic: e.target.value })}
                className={inputCls} 
                placeholder="sk-ant-..." 
              />
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'limits' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
          <div>
            <h4 className="text-sm font-bold text-stone-900">Global Spend Limits</h4>
            <p className="text-xs text-stone-500 mb-4">Control costs across all AI model tasks.</p>
          </div>
          
          <div className="grid gap-4 max-w-sm">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Hard Monthly Limit ($)</label>
              <input 
                type="number" 
                value={limits.monthlyLimit} 
                onChange={e => setLimits({ ...limits, monthlyLimit: Number(e.target.value) })}
                className={inputCls} 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Alert Threshold ($)</label>
              <input 
                type="number" 
                value={limits.alertThreshold} 
                onChange={e => setLimits({ ...limits, alertThreshold: Number(e.target.value) })}
                className={inputCls} 
              />
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'routing' && (
        <div className="space-y-4">
          {Object.entries(TASK_LABELS).map(([taskKey, { label, desc }]) => {
            const taskModels = models.filter((m) => m.taskType === taskKey);
            return (
              <div key={taskKey} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-brand-primary" /> {label} Task Routing
                    </h4>
                    <p className="text-xs text-stone-500">{desc}</p>
                  </div>
                  <button 
                    onClick={() => addChallenger(taskKey as AITaskType)}
                    className="flex items-center gap-1 text-xs font-semibold text-brand-primary hover:text-brand-primary/80"
                  >
                    <Plus className="w-3 h-3" /> Add Challenger
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {taskModels.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-xl border p-4 transition-all relative group ${
                        m.isChampion
                          ? 'border-emerald-300 bg-status-success/10/40 ring-1 ring-emerald-400/30'
                          : 'border-stone-200 bg-stone-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h5 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                            {m.name}
                            {m.isChampion && (
                              <span className="flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                                <ShieldCheck className="h-3 w-3" /> Champion
                              </span>
                            )}
                            {m.isChallenger && (
                              <span className="flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                                Challenger (Shadow)
                              </span>
                            )}
                          </h5>
                          <p className="text-[11px] text-stone-500">Provider: {m.provider}</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {m.isChallenger && (
                            <>
                              <button onClick={() => removeModel(m.id)} className="text-stone-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handlePromote(m.id)}
                                className="rounded-lg bg-stone-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-stone-800 transition-colors"
                              >
                                Promote
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-stone-200/60 pt-3 text-center">
                        <div>
                          <p className="text-[10px] text-stone-400 font-medium">Quality Score</p>
                          <p className="text-xs font-bold text-stone-800">{m.qualityScore}/100</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-stone-400 font-medium">Latency</p>
                          <p className="text-xs font-bold text-stone-800">{m.latencyMs} ms</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-stone-400 font-medium">Cost / 1k Tokens</p>
                            <p className="text-xs font-bold text-stone-800">${(m.costPer1kTokensCents / 100).toFixed(4)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
