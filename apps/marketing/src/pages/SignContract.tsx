import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Gem, Loader2, AlertTriangle, CheckCircle2, PenLine, FileText, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { locationById, formatCents, formatDate } from '@/data/vowosData';
import {
  ContractRecord,
  CONTRACT_TERMS,
  CONTRACT_PDF_URL,
  mapContract,
} from '@/lib/contractsAlterations';

const inputCls =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-focus-ring';

export default function SignContract() {
  const { contractId } = useParams<{ contractId: string }>();
  const [params] = useSearchParams();
  const token = params.get('t') ?? '';

  const [contract, setContract] = useState<ContractRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [fullName, setFullName] = useState('');
  const [initials, setInitials] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [signing, setSigning] = useState(false);
  const [justSigned, setJustSigned] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!contractId || !token) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      // Tenant and customer are derived from the contract row server-side; the
      // page never reads the contracts table with the anon key.
      const { data, error } = await supabase.rpc('portal_get_contract', {
        p_contract_id: contractId,
        p_sign_token: token,
      });
      if (error || !data) {
        setNotFound(true);
      } else {
        const c = mapContract(data);
        setContract(c);
        const customerId = data.customer_id as string | null;
        if (!customerId) {
          setNotFound(true);
          setContract(null);
        } else {
          setContract(c);
          setFullName(c.signedName ?? c.customer);
        }
      }
      setLoading(false);
    };
    load();
  }, [contractId, token]);

  const loc = useMemo(() => (contract ? locationById(contract.location) : null), [contract]);
  const balance = contract ? contract.amountCents - contract.depositCents : 0;
  const alreadySigned = contract?.status === 'Signed' && !justSigned;

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;
    const name = fullName.trim();
    const inits = initials.trim().toUpperCase();
    if (name.length < 3) {
      setError('Please type your full legal name.');
      return;
    }
    if (inits.length < 2) {
      setError('Please enter your initials.');
      return;
    }
    if (!agreed) {
      setError('Please confirm you have read and agree to the terms.');
      return;
    }
    setError('');
    setSigning(true);
    const { data: signed, error: upErr } = await supabase.rpc('portal_sign_contract', {
      p_contract_id: contract.id,
      p_sign_token: token,
      p_signed_name: name,
      p_signed_initials: inits,
    });
    if (upErr || !signed) {
      setSigning(false);
      setError('We could not record your signature right now. Please try again or call the boutique.');
      return;
    }
    // The signature activity row is written inside portal_sign_contract with the
    // organization taken from the contract itself -- no client-supplied tenant.
    const signedAt = (signed as any).signed_at ?? new Date().toISOString();
    setContract({ ...contract, status: 'Signed', signedName: name, signedInitials: inits, signedAt });
    setJustSigned(true);
    setSigning(false);
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] px-4 py-10">
      <div className="mx-auto max-w-2xl">
        {/* Brand header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 shadow-lg shadow-rose-200">
            <Gem className="h-6 w-6 text-white" />
          </div>
          <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.25em] text-brand-primary">
            Boutique Secure Portal
          </p>
          <h1 className="font-serif text-2xl text-stone-900">{loc ? loc.business : 'Bridal Purchase Agreement'}</h1>
          {loc && <p className="mt-1 text-xs text-stone-500">{loc.address} · {loc.phone}</p>}
        </div>

        {loading && (
          <div className="rounded-3xl border border-stone-200 bg-white py-16 text-center shadow-sm">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-primary" />
            <p className="mt-3 text-sm text-stone-500">Loading your contract…</p>
          </div>
        )}

        {!loading && notFound && (
          <div className="rounded-3xl border border-border-subtle bg-white p-8 text-center shadow-sm">
            <AlertTriangle className="mx-auto h-8 w-8 text-brand-primary" />
            <h2 className="mt-4 font-serif text-xl text-stone-900">Contract link not found</h2>
            <p className="mt-2 text-sm text-stone-500">
              This link may have expired or been mistyped. Please contact the boutique for a fresh
              signing link.
            </p>
          </div>
        )}

        {!loading && contract && (justSigned || alreadySigned) && (
          <div className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-10 w-10 text-status-success" />
            <h2 className="mt-4 font-serif text-2xl text-stone-900">
              {justSigned ? `Thank you, ${contract.signedName?.split(' ')[0]}!` : 'This contract is signed'}
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              Purchase agreement <span className="font-semibold">{contract.id}</span> was electronically
              signed{contract.signedAt ? ` on ${formatDate(contract.signedAt.slice(0, 10))}` : ''}.
            </p>
            <div className="mx-auto mt-6 max-w-sm rounded-2xl bg-stone-50 p-5 text-left">
              <p className="text-xs uppercase tracking-wider text-stone-400">Signature on file</p>
              <p className="mt-2 font-serif text-3xl italic text-stone-800">{contract.signedName}</p>
              <p className="mt-1 text-xs text-stone-500">Initials {contract.signedInitials}</p>
              <div className="mt-4 border-t border-stone-200 pt-3 text-sm text-stone-600">
                <p>{contract.gown}</p>
                <p className="mt-1 text-xs text-stone-500">
                  Total {formatCents(contract.amountCents)} · Deposit {formatCents(contract.depositCents)} · Balance {formatCents(balance)}
                </p>
              </div>
            </div>
            <p className="mt-6 text-xs text-stone-400">
              A copy has been recorded with the boutique. Questions? Call {loc?.phone}.
            </p>
          </div>
        )}

        {!loading && contract && !justSigned && !alreadySigned && (
          <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
            {/* Summary */}
            <div className="border-b border-stone-100 bg-stone-50/60 px-6 py-5">
              <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
                Purchase Agreement {contract.id}
              </p>
              <p className="mt-1 font-serif text-lg text-stone-900">{contract.gown}</p>
              <p className="text-xs text-stone-500">Prepared for {contract.customer}</p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-white p-3 ring-1 ring-stone-100">
                  <p className="text-[10px] uppercase tracking-wider text-stone-400">Total</p>
                  <p className="mt-0.5 font-serif text-lg text-stone-900">{formatCents(contract.amountCents)}</p>
                </div>
                <div className="rounded-xl bg-white p-3 ring-1 ring-stone-100">
                  <p className="text-[10px] uppercase tracking-wider text-stone-400">Deposit</p>
                  <p className="mt-0.5 font-serif text-lg text-stone-900">{formatCents(contract.depositCents)}</p>
                </div>
                <div className="rounded-xl bg-white p-3 ring-1 ring-stone-100">
                  <p className="text-[10px] uppercase tracking-wider text-stone-400">Balance</p>
                  <p className="mt-0.5 font-serif text-lg text-stone-900">{formatCents(balance)}</p>
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="px-6 py-5">
              <h2 className="font-serif text-lg text-stone-900">Terms & Conditions</h2>
              <ol className="mt-3 space-y-3">
                {CONTRACT_TERMS.map((t, i) => (
                  <li key={t.title} className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-primary">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-stone-800">{t.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-stone-500">{t.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              {contract.specialTerms && (
                <div className="mt-4 rounded-xl border border-status-warning/20 bg-status-warning/10/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-status-warning">Special terms</p>
                  <p className="mt-1 text-sm text-stone-700">{contract.specialTerms}</p>
                </div>
              )}
              <a
                href={CONTRACT_PDF_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-brand-primary hover:text-brand-primary"
              >
                <FileText className="h-3.5 w-3.5" /> Download the full printed contract (PDF)
              </a>
            </div>

            {/* Signature block */}
            <form onSubmit={handleSign} className="border-t border-stone-100 bg-stone-50/40 px-6 py-6">
              <h2 className="flex items-center gap-2 font-serif text-lg text-stone-900">
                <PenLine className="h-4 w-4 text-brand-primary" /> Electronic signature
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-stone-500">
                    Full legal name
                  </label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={inputCls}
                    placeholder="Jane Elizabeth Smith"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-stone-500">
                    Initials
                  </label>
                  <input
                    value={initials}
                    onChange={(e) => setInitials(e.target.value.slice(0, 4))}
                    className={inputCls}
                    placeholder="JES"
                  />
                </div>
              </div>

              {/* Live signature preview */}
              <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-white px-5 py-4">
                <p className="text-[10px] uppercase tracking-wider text-stone-400">Signature preview</p>
                <p className="mt-1 min-h-[36px] font-serif text-3xl italic text-stone-800">
                  {fullName || <span className="text-stone-300">Your signature</span>}
                </p>
              </div>

              <label className="mt-4 flex items-start gap-2 text-xs text-stone-600">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-stone-300 text-brand-primary focus:ring-rose-300"
                />
                I have read and agree to all terms above, including that all sales are final and the
                deposit is non-refundable. Typing my name constitutes my legal electronic signature.
              </label>

              {error && <p className="mt-3 text-sm text-brand-primary">{error}</p>}

              <button
                type="submit"
                disabled={signing}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-primary-hover disabled:opacity-60"
              >
                {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
                {signing ? 'Recording signature…' : 'Sign agreement'}
              </button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-stone-400">
                <Lock className="h-3 w-3" /> Your signature is time-stamped and stored securely with the boutique.
              </p>
            </form>
          </div>
        )}

        <p className="mt-8 text-center text-[11px] text-stone-400">
          VowOS · The Boutique · I Do Bridal Couture + Proper &amp; Company
        </p>
      </div>
    </div>
  );
}
