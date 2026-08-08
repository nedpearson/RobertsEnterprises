export interface DataQualityReport {
  brand: string;
  location?: string;
  overallConfidenceScore: number; // 0 - 100
  freshnessScore: number; // 0 - 100
  attributionCompletenessPct: number;
  issuesDetected: Array<{
    type: 'missing_provider_data' | 'stale_inventory' | 'spend_mismatch' | 'attribution_gap';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
  }>;
  evaluatedAt: string;
}

export class DataQualityEngine {
  public static evaluateQuality(brand: string, location?: string): DataQualityReport {
    // In production, this inspects raw event ingestion tables and compares provider spend vs VowOS ledger
    const mockIssues: DataQualityReport['issuesDetected'] = [
      {
        type: 'attribution_gap',
        severity: 'medium',
        message: '12% of recent direct appointment bookings lack UTM campaign tracking tags.'
      }
    ];

    const freshnessScore = 96.5;
    const attributionCompletenessPct = 88.0;
    const overallConfidenceScore = Number(((freshnessScore + attributionCompletenessPct) / 2).toFixed(1));

    return {
      brand,
      location,
      overallConfidenceScore,
      freshnessScore,
      attributionCompletenessPct,
      issuesDetected: mockIssues,
      evaluatedAt: new Date().toISOString()
    };
  }
}
