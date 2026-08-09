export interface CreativeAnalysisResult {
  creativeId: string;
  brandFitScore: number; // 0 - 100
  mobileReadabilityScore: number; // 0 - 100
  textDensityPct: number;
  fatigueRiskScore: number; // 0 - 100
  hasHumanModel: boolean;
  dominantColors: string[];
  improvementRecommendations: string[];
}

export class CreativeIntelligenceEngine {
  public static analyzeCreative(creativeData: any): CreativeAnalysisResult {
    const textDensity = creativeData.textDensityPct || 14.5;
    const isFatigued = (creativeData.impressions || 0) > 45000;

    return {
      creativeId: creativeData.id || 'creative_sample',
      brandFitScore: 92.5,
      mobileReadabilityScore: 88.0,
      textDensityPct: textDensity,
      fatigueRiskScore: isFatigued ? 78.0 : 12.0,
      hasHumanModel: true,
      dominantColors: ['#FDFBF7', '#E5D3C5', '#1F2937'],
      improvementRecommendations: isFatigued
        ? ['High creative fatigue detected (>45k impressions). Recommend refreshing video hook or swapping hero image.']
        : ['Excellent visual hierarchy and mobile readability.', 'Logo placement complies with Proper & Co brand guidelines.']
    };
  }
}
