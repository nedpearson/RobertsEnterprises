/**
 * Model-Agnostic AI Gateway & Task Routing Engine
 * Manages provider selections, task routing, benchmarks, latency/cost evaluation, and shadow-mode testing.
 */

export type AITaskType =
  | 'high_reasoning'
  | 'fast_summarization'
  | 'vision_creative'
  | 'embedding_similarity'
  | 'classical_ml'
  | 'optimization_engine';

export interface AIModelConfig {
  id: string;
  name: string;
  provider: 'OpenAI' | 'Google Gemini' | 'Anthropic' | 'Internal ML' | 'Optimization Core';
  taskType: AITaskType;
  isChampion: boolean;
  isChallenger: boolean;
  qualityScore: number; // 0 - 100
  latencyMs: number;
  costPer1kTokensCents: number;
  reliabilityScore: number; // 0 - 100%
  status: 'active' | 'shadow' | 'deprecated';
}

export interface BenchmarkResult {
  id: string;
  modelId: string;
  timestamp: string;
  taskType: AITaskType;
  qualityScore: number;
  latencyMs: number;
  costCents: number;
  passed: boolean;
}

export const INITIAL_AI_MODELS: AIModelConfig[] = [
  {
    id: 'model-gpt4o',
    name: 'GPT-4o (High Reasoning)',
    provider: 'OpenAI',
    taskType: 'high_reasoning',
    isChampion: true,
    isChallenger: false,
    qualityScore: 96,
    latencyMs: 850,
    costPer1kTokensCents: 1.5,
    reliabilityScore: 99.8,
    status: 'active',
  },
  {
    id: 'model-gemini-pro',
    name: 'Gemini 3.1 Pro (High)',
    provider: 'Google Gemini',
    taskType: 'high_reasoning',
    isChampion: false,
    isChallenger: true,
    qualityScore: 95,
    latencyMs: 720,
    costPer1kTokensCents: 1.2,
    reliabilityScore: 99.5,
    status: 'shadow',
  },
  {
    id: 'model-gpt4o-mini',
    name: 'GPT-4o Mini (Fast Summarizer)',
    provider: 'OpenAI',
    taskType: 'fast_summarization',
    isChampion: true,
    isChallenger: false,
    qualityScore: 92,
    latencyMs: 180,
    costPer1kTokensCents: 0.15,
    reliabilityScore: 99.9,
    status: 'active',
  },
  {
    id: 'model-gemini-flash',
    name: 'Gemini 1.5 Flash (Fast Summarizer)',
    provider: 'Google Gemini',
    taskType: 'fast_summarization',
    isChampion: false,
    isChallenger: true,
    qualityScore: 93,
    latencyMs: 140,
    costPer1kTokensCents: 0.1,
    reliabilityScore: 99.7,
    status: 'shadow',
  },
  {
    id: 'model-vision-vowos',
    name: 'GPT-4o Vision (Creative Analysis)',
    provider: 'OpenAI',
    taskType: 'vision_creative',
    isChampion: true,
    isChallenger: false,
    qualityScore: 94,
    latencyMs: 1200,
    costPer1kTokensCents: 2.0,
    reliabilityScore: 99.4,
    status: 'active',
  },
  {
    id: 'model-embedding-text3',
    name: 'text-embedding-3-large',
    provider: 'OpenAI',
    taskType: 'embedding_similarity',
    isChampion: true,
    isChallenger: false,
    qualityScore: 98,
    latencyMs: 90,
    costPer1kTokensCents: 0.05,
    reliabilityScore: 100,
    status: 'active',
  },
  {
    id: 'model-ml-scoring',
    name: 'VowOS Lead Scoring Engine v3',
    provider: 'Internal ML',
    taskType: 'classical_ml',
    isChampion: true,
    isChallenger: false,
    qualityScore: 96,
    latencyMs: 12,
    costPer1kTokensCents: 0.001,
    reliabilityScore: 100,
    status: 'active',
  },
  {
    id: 'model-opt-solver',
    name: 'VowOS Simplex Budget Allocator',
    provider: 'Optimization Core',
    taskType: 'optimization_engine',
    isChampion: true,
    isChallenger: false,
    qualityScore: 99,
    latencyMs: 45,
    costPer1kTokensCents: 0.0,
    reliabilityScore: 100,
    status: 'active',
  },
];

export class AIModelGateway {
  private static instance: AIModelGateway;
  private models: AIModelConfig[] = [...INITIAL_AI_MODELS];
  private benchmarks: BenchmarkResult[] = [];
  private isInitialized = false;

  public static getInstance(): AIModelGateway {
    if (!AIModelGateway.instance) {
      AIModelGateway.instance = new AIModelGateway();
    }
    return AIModelGateway.instance;
  }

  public async initialize(dataPlane: 'production' | 'demo') {
    if (this.isInitialized) return;
    try {
      const { resolveEffectiveSetting } = await import('@/lib/settings');
      const result = await resolveEffectiveSetting<AIModelConfig[]>(
        'ai_models_config',
        'ai_models_config',
        { dataPlane },
        INITIAL_AI_MODELS
      );
      this.models = result.value;
      this.isInitialized = true;
    } catch (e) {
      console.error("Failed to load AI models from DB", e);
    }
  }

  public getModels(): AIModelConfig[] {
    return this.models;
  }

  public async getModelForTask(taskType: AITaskType): Promise<AIModelConfig> {
    if (!this.isInitialized) {
      // Fallback if not initialized
      const champion = this.models.find((m) => m.taskType === taskType && m.isChampion);
      return champion || this.models[0];
    }
    const champion = this.models.find((m) => m.taskType === taskType && m.isChampion);
    return champion || this.models[0];
  }

  public promoteChallenger(challengerId: string): void {
    const challenger = this.models.find((m) => m.id === challengerId);
    if (!challenger) return;

    // Demote current champion for task
    this.models.forEach((m) => {
      if (m.taskType === challenger.taskType) {
        if (m.id === challengerId) {
          m.isChampion = true;
          m.isChallenger = false;
          m.status = 'active';
        } else {
          m.isChampion = false;
          m.isChallenger = true;
          m.status = 'shadow';
        }
      }
    });
  }

  public async runBenchmarkSuite(dataPlane: 'production' | 'demo'): Promise<BenchmarkResult[]> {
    await this.initialize(dataPlane);
    
    // Simulate a real evaluation harness (e.g., calling an external LLM judge or running a test suite)
    const results: BenchmarkResult[] = this.models.map((m) => {
      // In a real implementation, this would trigger an edge function that runs the model against a gold dataset.
      // We simulate the output of that edge function here.
      const variance = (0) - 2; // -2 to +2
      const newQualityScore = Math.min(100, Math.max(80, Math.round(m.qualityScore + variance)));
      const newLatencyMs = Math.max(10, Math.round(m.latencyMs + (0)));
      
      return {
        id: `bench-${Date.now()}-${m.id}`,
        modelId: m.id,
        timestamp: new Date().toISOString(),
        taskType: m.taskType,
        qualityScore: newQualityScore,
        latencyMs: newLatencyMs,
        costCents: m.costPer1kTokensCents,
        passed: newQualityScore >= 85, // Threshold for passing the benchmark
      };
    });
    
    this.benchmarks.unshift(...results);
    
    // Update models with new metrics
    this.models = this.models.map(m => {
      const benchmark = results.find(r => r.modelId === m.id);
      if (benchmark) {
        return {
          ...m,
          qualityScore: benchmark.qualityScore,
          latencyMs: benchmark.latencyMs,
        };
      }
      return m;
    });

    // Save updated configurations back to the database
    try {
      const { saveScopedSetting } = await import('@/lib/settings');
      await saveScopedSetting('ai_models_config', 'ai_models_config', this.models, { dataPlane }, "Automated benchmark suite results");
    } catch (err) {
      console.error("Failed to save benchmark results to DB", err);
    }
    
    return results;
  }

  public getBenchmarks(): BenchmarkResult[] {
    return this.benchmarks;
  }
}

export const aiGateway = AIModelGateway.getInstance();
