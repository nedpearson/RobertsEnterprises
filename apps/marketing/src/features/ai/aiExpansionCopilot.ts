export interface CopilotRecommendation {
  id: string;
  type: 'MARKET' | 'FINANCE' | 'COMPLIANCE' | 'OPERATIONS';
  title: string;
  description: string;
  confidence: number;
  actionableUrl?: string;
}

export class AIExpansionCopilot {
  /**
   * Generates AI recommendations for a specific market candidate
   */
  static async analyzeMarketCandidate(marketName: string, state: string): Promise<CopilotRecommendation[]> {
    // In production, this would call OpenAI/Anthropic with Census & Places data
    return [
      {
        id: 'rec_1',
        type: 'MARKET',
        title: `High Demand in ${marketName}`,
        description: `We've detected a 24% increase in out-of-state web leads from ${state} over the last 6 months.`,
        confidence: 0.92,
        actionableUrl: '/expansion?tab=market'
      },
      {
        id: 'rec_2',
        type: 'FINANCE',
        title: 'Adjust Pro Forma for Local Real Estate',
        description: `Commercial rent in ${marketName} is 15% higher than your current average. We recommend increasing your buildout and rent assumptions.`,
        confidence: 0.88,
        actionableUrl: '/expansion?tab=financials'
      }
    ];
  }

  /**
   * Generates compliance alerts for franchisees
   */
  static async checkFranchiseCompliance(): Promise<CopilotRecommendation[]> {
    return [
      {
        id: 'rec_3',
        type: 'COMPLIANCE',
        title: 'Insurance Expiring',
        description: 'Houston franchisee COI expires in 14 days.',
        confidence: 1.0,
        actionableUrl: '/expansion?tab=franchisees'
      }
    ];
  }
}
