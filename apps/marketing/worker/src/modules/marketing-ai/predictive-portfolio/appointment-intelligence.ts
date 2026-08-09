export interface AppointmentIntelligenceResult {
  appointmentId: string;
  confirmationProbability: number;
  noShowRiskPct: number;
  saleProbability: number;
  expectedSaleCents: number;
  recommendedActions: string[];
}

export class AppointmentIntelligenceModel {
  public static analyzeAppointment(apptData: any): AppointmentIntelligenceResult {
    const isWeekend = apptData.dayOfWeek === 'Saturday' || apptData.dayOfWeek === 'Sunday';
    const noShowRisk = isWeekend ? 8.5 : 18.2;

    return {
      appointmentId: apptData.id || 'appt_sample',
      confirmationProbability: 0.94,
      noShowRiskPct: noShowRisk,
      saleProbability: 0.72,
      expectedSaleCents: 245000,
      recommendedActions: [
        'Send SMS confirmation 48 hours prior with direct boutique directions',
        'Assign Senior Stylist based on budget preference tags'
      ]
    };
  }
}
