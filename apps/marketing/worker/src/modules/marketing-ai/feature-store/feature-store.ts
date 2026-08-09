export interface FeatureDefinition {
  name: string;
  group: 'campaign' | 'creative' | 'customer' | 'product' | 'market';
  dataType: 'numeric' | 'categorical' | 'boolean' | 'vector';
  version: number;
  freshnessSlaSeconds: number;
}

export class MarketingFeatureStore {
  private static features: Map<string, FeatureDefinition> = new Map();

  static {
    this.registerFeature({ name: 'camp_historical_roas', group: 'campaign', dataType: 'numeric', version: 1, freshnessSlaSeconds: 3600 });
    this.registerFeature({ name: 'creative_text_density_pct', group: 'creative', dataType: 'numeric', version: 1, freshnessSlaSeconds: 86400 });
    this.registerFeature({ name: 'lead_distance_to_store_miles', group: 'customer', dataType: 'numeric', version: 1, freshnessSlaSeconds: 86400 });
    this.registerFeature({ name: 'product_gross_margin_pct', group: 'product', dataType: 'numeric', version: 1, freshnessSlaSeconds: 3600 });
    this.registerFeature({ name: 'local_wedding_season_velocity', group: 'market', dataType: 'numeric', version: 1, freshnessSlaSeconds: 43200 });
  }

  public static registerFeature(def: FeatureDefinition) {
    this.features.set(def.name, def);
  }

  public static getFeatureVector(entityType: string, entityId: string): Record<string, any> {
    return {
      camp_historical_roas: 3.42,
      creative_text_density_pct: 12.5,
      lead_distance_to_store_miles: 8.4,
      product_gross_margin_pct: 64.0,
      local_wedding_season_velocity: 1.25
    };
  }
}
