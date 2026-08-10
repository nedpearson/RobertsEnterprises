import { useState } from 'react';
import { BridalReferral, getBridalReferrals, createBridalReferral } from '../api/referralApi';
import { Modal, btnPrimary, btnSecondary } from '@/components/vowos/ui';
import { formatCents } from '@/data/vowosData';
import { Gift, Sparkles, CheckCircle2, UserPlus, Copy, Heart, Link2 } from 'lucide-react';
import { toast } from '@vowos/design-system';

interface ReferralEngineModalProps {
  open: boolean;
  onClose: () => void;
  brideName?: string;
}

export default function ReferralEngineModal({ open, onClose, brideName = 'Whitney Guidry' }: ReferralEngineModalProps) {
  const [referrals, setReferrals] = useState<BridalReferral[]>(getBridalReferrals());
  const [referredName, setReferredName] = useState('');
  const [referredEmail, setReferredEmail] = useState('');
  const [relationship, setRelationship] = useState<'Bridesmaid' | 'Mother of the Bride' | 'Friend' | 'Sister'>('Bridesmaid');

  if (!open) return null;

  const handleSendInvite = () => {
    if (!referredName.trim() || !referredEmail.trim()) return;
    createBridalReferral({
      referringBrideName: brideName,
      referredName,
      referredEmail,
      relationship,
    });
    setReferrals(getBridalReferrals());
    setReferredName('');
    setReferredEmail('');
    toast({ title: 'Bridal Referral Invite Sent!', description: `Invitation sent to ${referredName}. $50 reward credit pending booking.` });
  };

  const code = `${brideName.split(' ')[0].toUpperCase()}50`;

  return (
    <Modal open={true} onClose={onClose} title={`Bridal Referral & LTV Rewards — ${brideName}`}>
      <div className="space-y-5 max-w-lg select-none">
        {/* Referral Card Hero */}
        <div className="rounded-2xl bg-gradient-to-r from-rose-900 via-stone-900 to-rose-950 p-5 text-white shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-300 uppercase tracking-widest">
              <Gift className="h-4 w-4 text-brand-primary" /> Share the Love Referral Program
            </div>
            <span className="rounded-full bg-brand-primary/30 border border-brand-primary/50 px-2.5 py-0.5 text-[11px] font-bold text-rose-200">
              $50 Store Credit Reward
            </span>
          </div>

          <p className="text-xs text-stone-200 leading-relaxed">
            Give your bridesmaids, mother, and friends $50 off their fitting or Proper &amp; Co order. Earn $50 in store credit for every completed booking!
          </p>

          <div className="flex items-center justify-between bg-black/40 border border-brand-primary/30 p-2.5 rounded-xl text-xs font-mono text-white">
            <span>Referral Code: <span className="font-bold text-rose-300">{code}</span></span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`https://robertsenterprises.vowos.com/#ref=${code}`);
                toast({ title: 'Referral Link Copied!', description: 'Link copied to clipboard.' });
              }}
              className="text-rose-300 hover:text-white flex items-center gap-1 font-sans font-bold"
            >
              <Copy className="h-3.5 w-3.5" /> Copy Link
            </button>
          </div>
        </div>

        {/* Invite Form */}
        <div className="space-y-3 bg-stone-50 p-4 rounded-2xl border border-stone-200 text-xs">
          <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
            <UserPlus className="h-4 w-4 text-brand-primary" /> Invite Bridesmaid or Family Member
          </h4>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Name"
              value={referredName}
              onChange={(e) => setReferredName(e.target.value)}
              className="rounded-xl border border-stone-300 bg-white p-2 font-bold text-stone-900 focus:outline-none"
            />
            <input
              type="email"
              placeholder="Email address"
              value={referredEmail}
              onChange={(e) => setReferredEmail(e.target.value)}
              className="rounded-xl border border-stone-300 bg-white p-2 font-bold text-stone-900 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value as any)}
              className="rounded-xl border border-stone-300 bg-white p-2 font-bold text-stone-900 focus:outline-none"
            >
              <option value="Bridesmaid">Bridesmaid</option>
              <option value="Mother of the Bride">Mother of the Bride</option>
              <option value="Sister">Sister</option>
              <option value="Friend">Friend</option>
            </select>

            <button onClick={handleSendInvite} className={btnPrimary}>
              Send $50 Invite →
            </button>
          </div>
        </div>

        {/* Referrals List */}
        <div className="space-y-2 text-xs">
          <h4 className="font-bold text-stone-900">Active Referrals ({referrals.length})</h4>
          <div className="space-y-2">
            {referrals.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3">
                <div>
                  <p className="font-bold text-stone-900">{r.referredName} ({r.relationship})</p>
                  <p className="text-[11px] text-stone-400">{r.referredEmail}</p>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    {r.status}
                  </span>
                  <p className="text-[11px] font-bold text-stone-700 mt-0.5">Reward: {formatCents(r.rewardCreditsCents)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
