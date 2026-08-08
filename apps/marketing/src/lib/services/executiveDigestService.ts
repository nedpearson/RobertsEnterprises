import { formatCents } from '@/data/vowosData';

export interface ExecutiveDigestData {
  generatedAt: string;
  recipientEmail: string;
  recipientName: string;
  periodLabel: string;
  totalCollectedCents: number;
  companyGoalCents: number;
  monthlyGoalPct: number;
  momGrowthPct: number;
  topPerformingStore: string;
  adSpendROAS: number;
  totalLeadsAcquired: number;
  totalAppointmentsBooked: number;
  topSellingGowns: { name: string; brand: string; unitsSold: number; revenueCents: number }[];
  reorderAlerts: { item: string; location: string; stockLeft: number }[];
}

export function generateExecutiveDigest(): ExecutiveDigestData {
  return {
    generatedAt: new Date().toISOString(),
    recipientEmail: 'nedpearson@gmail.com',
    recipientName: 'Ramsey Roberts (Owner)',
    periodLabel: 'Monday 7:00 AM Executive Weekly Intelligence Digest',
    totalCollectedCents: 9245000, // $92,450.00
    companyGoalCents: 11800000,  // $118,000.00
    monthlyGoalPct: 78.3,
    momGrowthPct: 14.2,
    topPerformingStore: 'I Do Bridal Couture — Baton Rouge ($38,450.00)',
    adSpendROAS: 3.42,
    totalLeadsAcquired: 41,
    totalAppointmentsBooked: 12,
    topSellingGowns: [
      { name: 'Monique Lhuillier Bliss Gown', brand: 'I Do Bridal', unitsSold: 4, revenueCents: 1800000 },
      { name: 'Ines Di Santo Couture Silk Gown', brand: 'I Do Bridal', unitsSold: 3, revenueCents: 1650000 },
      { name: 'Proper & Co. Velvet Heels & Accessories', brand: 'Proper & Co', unitsSold: 18, revenueCents: 750000 },
    ],
    reorderAlerts: [
      { item: 'Monique Lhuillier Veil Sample (Ivory)', location: 'Baton Rouge', stockLeft: 1 },
      { item: 'Proper & Co. Pearl Heels (Size 8)', location: 'Covington', stockLeft: 2 },
    ],
  };
}

export async function sendExecutiveDigestEmail(): Promise<{ success: boolean; message: string }> {
  // Simulate dispatching executive email digest
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: 'Executive Weekly Intelligence Digest dispatched to Ramsey Roberts (nedpearson@gmail.com).',
      });
    }, 1000);
  });
}
