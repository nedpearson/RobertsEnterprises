import { formatCents } from '@/data/vowosData';

export interface BridalReferral {
  id: string;
  referringBrideId: string;
  referringBrideName: string;
  referralCode: string;
  referredName: string;
  referredEmail: string;
  relationship: 'Bridesmaid' | 'Mother of the Bride' | 'Friend' | 'Sister';
  status: 'Invited' | 'Appointment Booked' | 'Purchased' | 'Reward Issued';
  rewardCreditsCents: number;
  createdAt: string;
}

export interface CustomerLTVRecord {
  customerId: string;
  customerName: string;
  gownsSpentCents: number;
  properEcommerceSpentCents: number;
  totalLtvCents: number;
  referralsCount: number;
  preservationStatus: 'Pending Wedding' | 'Preservation Due' | 'Preserved';
}

const REFERRALS_STORAGE_KEY = 'vowos_bridal_referrals_v1';

const INITIAL_REFERRALS: BridalReferral[] = [
  {
    id: 'ref-001',
    referringBrideId: 'b1',
    referringBrideName: 'Whitney Guidry',
    referralCode: 'WHITNEY50',
    referredName: 'Sarah Jenkins',
    referredEmail: 'sarah.j@email.com',
    relationship: 'Bridesmaid',
    status: 'Purchased',
    rewardCreditsCents: 5000, // $50.00
    createdAt: '2026-07-10T10:00:00Z',
  },
  {
    id: 'ref-002',
    referringBrideId: 'b2',
    referringBrideName: 'Lauren Boudreaux',
    referralCode: 'LAUREN50',
    referredName: 'Michelle Boudreaux',
    referredEmail: 'michelle.b@email.com',
    relationship: 'Mother of the Bride',
    status: 'Appointment Booked',
    rewardCreditsCents: 5000,
    createdAt: '2026-07-15T14:30:00Z',
  },
];

export function getBridalReferrals(): BridalReferral[] {
  try {
    const raw = localStorage.getItem(REFERRALS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : INITIAL_REFERRALS;
  } catch {
    return INITIAL_REFERRALS;
  }
}

export function saveBridalReferrals(list: BridalReferral[]) {
  localStorage.setItem(REFERRALS_STORAGE_KEY, JSON.stringify(list));
}

export function createBridalReferral(data: Partial<BridalReferral>): BridalReferral {
  const list = getBridalReferrals();
  const newRef: BridalReferral = {
    id: `ref-${Date.now()}`,
    referringBrideId: data.referringBrideId || 'b1',
    referringBrideName: data.referringBrideName || 'Whitney Guidry',
    referralCode: `${(data.referringBrideName || 'BRIDE').split(' ')[0].toUpperCase()}50`,
    referredName: data.referredName || 'New Referral',
    referredEmail: data.referredEmail || 'referral@email.com',
    relationship: data.relationship || 'Bridesmaid',
    status: 'Invited',
    rewardCreditsCents: 5000, // $50.00
    createdAt: new Date().toISOString(),
  };

  const next = [newRef, ...list];
  saveBridalReferrals(next);
  return newRef;
}

export function calculateCustomerLTV(gownsCents: number, properCents: number): number {
  return gownsCents + properCents;
}
