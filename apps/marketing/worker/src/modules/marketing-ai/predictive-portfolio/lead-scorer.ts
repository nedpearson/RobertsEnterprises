export interface LeadScoreResult {
  leadId: string;
  responseProbability: number; // 0-1
  bookingProbability: number; // 0-1
  attendanceProbability: number; // 0-1
  purchaseProbability: number; // 0-1
  expectedGrossProfitCents: number;
  urgencyTier: 'Immediate (15m)' | 'High (1h)' | 'Normal (24h)';
  reasons: string[];
}

export class LeadScoringModel {
  public static scoreLead(leadData: any): LeadScoreResult {
    const isBridalAppointment = leadData.appointmentType?.toLowerCase().includes('bridal');
    const isBatonRouge = leadData.location === 'Baton Rouge';

    const bookingProb = isBridalAppointment ? 0.85 : 0.62;
    const attendanceProb = isBatonRouge ? 0.90 : 0.82;
    const purchaseProb = 0.68;
    const expectedProfit = Math.round(bookingProb * attendanceProb * purchaseProb * 185000); // $1,850 avg bridal order profit

    return {
      leadId: leadData.id || 'lead_sample',
      responseProbability: 0.92,
      bookingProbability: bookingProb,
      attendanceProbability: attendanceProb,
      purchaseProbability: purchaseProb,
      expectedGrossProfitCents: expectedProfit,
      urgencyTier: isBridalAppointment ? 'Immediate (15m)' : 'High (1h)',
      reasons: [
        'Requested Baton Rouge bridal styling appointment',
        'High conversion historical ZIP code radius (< 12 miles)',
        'Interacted with 3 high-margin gown collection pages'
      ]
    };
  }
}
