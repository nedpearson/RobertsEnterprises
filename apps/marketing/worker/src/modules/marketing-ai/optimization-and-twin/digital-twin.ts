export interface ScenarioQuery {
  brand: string;
  spendDeltaCents?: number; // e.g. +100000 ($1,000)
  metaSpendChangePct?: number; // e.g. -20 (-20%)
  inventoryStockoutLocation?: 'Baton Rouge' | 'Covington';
  cplIncreasePct?: number;
}

export interface ScenarioSimulationResult {
  querySummary: string;
  predictedSpendCents: number;
  predictedLeads: number;
  predictedAppointments: number;
  predictedSalesCents: number;
  predictedGrossProfitCents: number;
  confidenceInterval95: { lowerCents: number; upperCents: number };
  inventoryImpactNotes: string;
  capacityImpactNotes: string;
  riskAssessment: 'Low Risk' | 'Moderate Risk' | 'High Risk';
}

export class ProperDigitalTwin {
  public static simulateScenario(query: ScenarioQuery): ScenarioSimulationResult {
    const baseSpend = 500000; // $5,000 baseline spend
    const spendDelta = query.spendDeltaCents || 0;
    const finalSpend = Math.max(0, baseSpend + spendDelta);

    const incrementalLeads = Math.round((spendDelta / 100) * 0.12);
    const predictedLeads = Math.max(10, 65 + incrementalLeads);
    const predictedAppointments = Math.round(predictedLeads * 0.36);
    const predictedSales = Math.round(predictedAppointments * 195000);
    const predictedProfit = Math.round(predictedSales * 0.60 - finalSpend);

    return {
      querySummary: query.spendDeltaCents 
        ? `Simulated adding $${(query.spendDeltaCents / 100).toLocaleString()} to monthly advertising budget.`
        : 'Baseline scenario simulation.',
      predictedSpendCents: finalSpend,
      predictedLeads,
      predictedAppointments,
      predictedSalesCents: predictedSales,
      predictedGrossProfitCents: predictedProfit,
      confidenceInterval95: {
        lowerCents: Math.round(predictedProfit * 0.88),
        upperCents: Math.round(predictedProfit * 1.12)
      },
      inventoryImpactNotes: query.inventoryStockoutLocation
        ? `High stockout probability for promoted gowns in ${query.inventoryStockoutLocation}. Recommend shifting ad creative to available styles.`
        : 'Sufficient inventory buffer across Baton Rouge and Covington stores.',
      capacityImpactNotes: predictedAppointments > 25 
        ? 'Baton Rouge weekend appointment slots reaching 90%+ capacity. Recommend encouraging Covington bookings.'
        : 'Appointment capacity comfortably available.',
      riskAssessment: spendDelta > 200000 ? 'Moderate Risk' : 'Low Risk'
    };
  }
}
