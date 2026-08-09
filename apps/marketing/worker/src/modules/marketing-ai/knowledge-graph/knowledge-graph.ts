export interface KnowledgeNode {
  id: string;
  type: 'brand' | 'location' | 'campaign' | 'creative' | 'product' | 'lead' | 'appointment' | 'order' | 'trend' | 'competitor';
  label: string;
  attributes: Record<string, any>;
}

export interface KnowledgeEdge {
  sourceId: string;
  targetId: string;
  relationship: 'GENERATED_LEAD' | 'BOOKED_APPOINTMENT' | 'PROMOTED_PRODUCT' | 'ATTRIBUTED_SALE' | 'FATIGUED_BY' | 'ALIGNS_WITH_TREND';
  weight?: number;
}

export class MarketingKnowledgeGraph {
  private nodes: Map<string, KnowledgeNode> = new Map();
  private edges: KnowledgeEdge[] = [];

  constructor() {
    this.seedMockGraph();
  }

  private seedMockGraph() {
    // Add sample nodes
    this.nodes.set('brand_proper', { id: 'brand_proper', type: 'brand', label: 'Proper & Company', attributes: {} });
    this.nodes.set('loc_br', { id: 'loc_br', type: 'location', label: 'Baton Rouge', attributes: {} });
    this.nodes.set('loc_cov', { id: 'loc_cov', type: 'location', label: 'Covington', attributes: {} });

    this.nodes.set('camp_summer_linen', { id: 'camp_summer_linen', type: 'campaign', label: 'Proper Summer Linen Edit', attributes: { provider: 'meta', spendCents: 450000 } });
    this.nodes.set('creative_linen_reel', { id: 'creative_linen_reel', type: 'creative', label: 'Linen Dress Styling Video', attributes: { format: 'reels', brandFit: 94 } });
    this.nodes.set('prod_linen_midi', { id: 'prod_linen_midi', type: 'product', label: 'Coastal Linen Midi Dress', attributes: { priceCents: 18800, marginPct: 62.5 } });

    // Add edges
    this.edges.push({ sourceId: 'camp_summer_linen', targetId: 'creative_linen_reel', relationship: 'PROMOTED_PRODUCT', weight: 1.0 });
    this.edges.push({ sourceId: 'creative_linen_reel', targetId: 'prod_linen_midi', relationship: 'PROMOTED_PRODUCT', weight: 1.0 });
  }

  public queryAttributedGrossProfitByCreative(creativeId: string): { grossProfitCents: number; completedAppointments: number } {
    return {
      grossProfitCents: 1250000,
      completedAppointments: 18
    };
  }

  public getUnpromotedHighMarginProducts(): Array<{ id: string; label: string; marginPct: number }> {
    return [
      { id: 'prod_silk_wrap', label: 'Silk Wrap Reception Dress', marginPct: 68.0 },
      { id: 'prod_pearl_clutch', label: 'Handcrafted Pearl Clutch', marginPct: 72.0 }
    ];
  }
}
