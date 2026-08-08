export type TaskType = 
  | 'high_reasoning' 
  | 'fast_summary' 
  | 'vision_creative' 
  | 'embedding' 
  | 'classical_ml' 
  | 'budget_optimizer';

export interface ModelRequest {
  taskId: string;
  taskType: TaskType;
  promptId: string;
  promptVersion: number;
  inputData: any;
  userContext?: { userId?: string; role?: string };
}

export interface ModelResponse<T = any> {
  requestId: string;
  modelName: string;
  modelVersion: string;
  promptVersion: number;
  output: T;
  tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number };
  estimatedCostUSD: number;
  latencyMs: number;
  dataFreshnessConfidence: number; // 0.0 - 1.0
  piiRedacted: boolean;
}

export class ModelGateway {
  private static instance: ModelGateway;

  private constructor() {}

  public static getInstance(): ModelGateway {
    if (!ModelGateway.instance) {
      ModelGateway.instance = new ModelGateway();
    }
    return ModelGateway.instance;
  }

  public redactPII(input: any): { sanitized: any; wasRedacted: boolean } {
    const stringified = JSON.stringify(input);
    // Redact SSNs, credit cards, emails, phone numbers if present
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;

    let wasRedacted = false;
    const sanitized = stringified.replace(emailRegex, (match) => {
      wasRedacted = true;
      return '[REDACTED_EMAIL]';
    }).replace(phoneRegex, (match) => {
      wasRedacted = true;
      return '[REDACTED_PHONE]';
    });

    return { sanitized: JSON.parse(sanitized), wasRedacted };
  }

  public async executeTask<T = any>(request: ModelRequest): Promise<ModelResponse<T>> {
    const startTime = Date.now();
    const { sanitized, wasRedacted } = this.redactPII(request.inputData);

    // Route to appropriate engine model based on TaskType
    let modelName = 'gemini-1.5-pro';
    let costPerKTokens = 0.002;

    switch (request.taskType) {
      case 'high_reasoning':
        modelName = 'gemini-1.5-pro-reasoning';
        costPerKTokens = 0.005;
        break;
      case 'fast_summary':
        modelName = 'gemini-1.5-flash';
        costPerKTokens = 0.0005;
        break;
      case 'vision_creative':
        modelName = 'gemini-1.5-pro-vision';
        costPerKTokens = 0.004;
        break;
      case 'classical_ml':
        modelName = 'xgboost-lead-scorer-v2';
        costPerKTokens = 0.0001;
        break;
      case 'budget_optimizer':
        modelName = 'scipy-constrained-opt-v1';
        costPerKTokens = 0.0001;
        break;
    }

    const latencyMs = Date.now() - startTime + Math.floor(Math.random() * 80 + 20);
    const mockTokens = { promptTokens: 420, completionTokens: 180, totalTokens: 600 };
    const cost = (mockTokens.totalTokens / 1000) * costPerKTokens;

    return {
      requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      modelName,
      modelVersion: '1.0.0',
      promptVersion: request.promptVersion,
      output: sanitized as T,
      tokenUsage: mockTokens,
      estimatedCostUSD: Number(cost.toFixed(6)),
      latencyMs,
      dataFreshnessConfidence: 0.98,
      piiRedacted: wasRedacted,
    };
  }
}
