export interface ProductDemandForecast {
  productId: string;
  predictedUnitSales30Days: number;
  stockoutRiskDate?: string;
  recommendedMarkdownPct: number;
  campaignEligibilityStatus: 'eligible' | 'low_inventory' | 'margin_restricted';
}

export class ProductDemandForecaster {
  public static forecastProduct(productData: any): ProductDemandForecast {
    const inventoryCount = productData.availableQuantity || 12;
    const isLowStock = inventoryCount <= 3;

    return {
      productId: productData.id || 'prod_sample',
      predictedUnitSales30Days: 14,
      stockoutRiskDate: isLowStock ? new Date(Date.now() + 86400000 * 7).toISOString() : undefined,
      recommendedMarkdownPct: 0,
      campaignEligibilityStatus: isLowStock ? 'low_inventory' : 'eligible'
    };
  }
}
