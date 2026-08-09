import { useEffect, useState } from 'react';
import { Cpu, Sparkles, CheckCircle2, RefreshCw, Zap, ShieldCheck, DollarSign, Award, Layers, Loader2 } from 'lucide-react';
import { AIModelConfig, AITaskType, BenchmarkResult, INITIAL_AI_MODELS } from '@/features/ai/modelGateway';
import { toast } from '@/components/ui/use-toast';
import { btnPrimary, btnSecondary } from '@/components/vowos/ui';
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

export default function AIModelSettingsTab({
  onDirtyChange,
  registerSaveRef,
  resetTrigger,
}: AIModelSettingsTabProps) {
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState<AIModelConfig[]>(INITIAL_AI_MODELS);
  const [dbModels, setDbModels] = useState<AIModelConfig[]>(INITIAL_AI_MODELS);

  const loadSettings = async () => {
    setLoading(true);
    const dataPlane = getActiveDataPlane();
    const result = await resolveEffectiveSetting<AIModelConfig[]>(
      'ai_models_config',
      'ai_models_config',
      { dataPlane },
      INITIAL_AI_MODELS
    );
    setModels(result.value);
    setDbModels(result.value);
    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, [resetTrigger]);

  const isDirty = JSON.stringify(models) !== JSON.stringify(dbModels);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty]);

  const handleSave = async (reason?: string): Promise<boolean> => {
    try {
      const dataPlane = getActiveDataPlane();
      await saveScopedSetting('ai_models_config', 'ai_models_config', models, { dataPlane }, reason);
      
      toast({
        title: 'AI Models saved',
        description: 'AI model configurations have been updated successfully.',
      });
      setDbModels(models);
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
  }, [models]);

  const handlePromote = (modelId: string, modelName: string) => {
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

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading AI model configs...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900">AI Model Gateway & Task Routing Management</h3>
            <p className="text-xs text-stone-500">
              Configure task routing, benchmark quality vs latency, and manage Champion/Challenger models safely.
            </p>
          </div>
        </div>

      </div>

      {/* Model Roster by Task Type */}
      <div className="space-y-4">
        {Object.entries(TASK_LABELS).map(([taskKey, { label, desc }]) => {
          const taskModels = models.filter((m) => m.taskType === taskKey);
          return (
            <div key={taskKey} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-rose-500" /> {label} Task Routing
                  </h4>
                  <p className="text-xs text-stone-500">{desc}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {taskModels.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-xl border p-4 transition-all ${
                      m.isChampion
                        ? 'border-emerald-300 bg-emerald-50/40 ring-1 ring-emerald-400/30'
                        : 'border-stone-200 bg-stone-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-stone-900">{m.name}</p>
                          {m.isChampion && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              <Award className="h-3 w-3" /> Champion
                            </span>
                          )}
                          {m.isChallenger && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                              Challenger (Shadow)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-400 mt-0.5">Provider: {m.provider}</p>
                      </div>

                      {m.isChallenger && (
                        <button
                          onClick={() => handlePromote(m.id, m.name)}
                          className="rounded-lg bg-stone-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-stone-800 transition-colors"
                        >
                          Promote
                        </button>
                      )}
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
                        <p className="text-xs font-bold text-stone-800">${m.costPer1kTokensCents.toFixed(3)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
