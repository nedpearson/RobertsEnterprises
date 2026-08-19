import { useState, useMemo, useEffect } from 'react';
import {
  Customer,
  formatCents,
  formatDate,
  teamMembers
} from '@/data/vowosData';
import { useVowosData } from '@/contexts/VowosDataContext';
import { fetchContracts, fetchAlterations, ContractRecord, AlterationJob } from '@/lib/contractsAlterations';
import { fetchMessages, MessageRecord } from '@/lib/messaging';
import { Users, Calendar, Shirt, FileSignature, CreditCard, Scissors, MessageSquare, FileText, Activity, ArrowLeft, ArrowRight, ExternalLink, Phone, Mail, MapPin, CheckCircle2, Clock, Sparkles, Plus } from 'lucide-react';
import { btnPrimary, StatusBadge } from './ui';
import { toast } from '@/components/ui/use-toast';

export type Bride360Tab =
  | 'overview'
  | 'appointments'
  | 'gown'
  | 'contract'
  | 'payments'
  | 'alterations'
  | 'messages'
  | 'documents'
  | 'activity'
  | 'lookbook';

interface Bride360ViewProps {
  bride: Customer;
  onBack: () => void;
  initialTab?: Bride360Tab;
  onNavigateView?: (view: string, params?: Record<string, string>) => void;
}

const LIFECYCLE_STAGES = [
  'Lead',
  'Consultation Scheduled',
  'Appointment Completed',
  'Gown Selected',
  'Contract Pending',
  'Payment in Progress',
  'Alterations',
  'Ready for Pickup',
  'Completed',
];

import BridalIdentity from './BridalIdentity';
import BridePhotoModal from './BridePhotoModal';
import { useApplicationRoute } from '@/lib/navigation/useApplicationRoute';

export default function Bride360View({ bride, onBack, initialTab = 'overview', onNavigateView }: Bride360ViewProps) {
  const [tab, setTab] = useState<Bride360Tab>(initialTab);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const { appointments = [], invoices = [], purchaseOrders = [] } = useVowosData();
  const { navigateToView } = useApplicationRoute();

  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [alterations, setAlterations] = useState<AlterationJob[]>([]);
  const [messages, setMessages] = useState<MessageRecord[]>([]);

  useEffect(() => {
    fetchContracts().then(setContracts).catch(() => {});
    fetchAlterations().then(setAlterations).catch(() => {});
    fetchMessages(bride.name).then(setMessages).catch(() => {});
  }, [bride.name]);

  // Filter bride-specific data safely
  const brideAppointments = useMemo(
    () => (appointments || []).filter((a: any) => a.customer?.toLowerCase() === bride.name.toLowerCase() || a.brideId === bride.id),
    [appointments, bride]
  );

  const brideContract = useMemo(
    () => (contracts || []).find((c) => c.customer?.toLowerCase() === bride.name.toLowerCase()),
    [contracts, bride]
  );

  const brideInvoices = useMemo(
    () => (invoices || []).filter((i: any) => i.brideName?.toLowerCase() === bride.name.toLowerCase() || i.brideId === bride.id),
    [invoices, bride]
  );

  const brideAlterations = useMemo(
    () => (alterations || []).filter((alt) => alt.customer?.toLowerCase() === bride.name.toLowerCase()),
    [alterations, bride]
  );

  const brideMessages = useMemo(
    () => (messages || []).filter((m) => m.customer?.toLowerCase() === bride.name.toLowerCase()),
    [messages, bride]
  );

  const bridePOs = useMemo(
    () => (purchaseOrders || []).filter((po: any) => po.items?.toLowerCase().includes(bride.name.toLowerCase())),
    [purchaseOrders, bride]
  );

  // Map status to stage index
  const currentStageIndex = useMemo(() => {
    if (bride.status === 'Completed') return 8;
    if (bride.status === 'Archived') return 8;
    if (brideAlterations.some((a) => a.status === 'Ready for Pickup')) return 7;
    if (brideAlterations.length > 0) return 6;
    if (brideInvoices.some((i) => i.paidCents > 0)) return 5;
    if (brideContract) return 4;
    if (bride.purchasedGown) return 3;
    if (brideAppointments.some((a) => a.status === 'Completed')) return 2;
    if (brideAppointments.length > 0) return 1;
    return 0;
  }, [bride, brideAlterations, brideInvoices, brideContract, brideAppointments]);

  const tabs: { key: Bride360Tab; label: string; icon: any; count?: number }[] = [
    { key: 'overview', label: 'Overview', icon: Users },
    { key: 'appointments', label: 'Appointments', icon: Calendar, count: brideAppointments.length },
    { key: 'gown', label: 'Gown & Measurements', icon: Shirt },
    { key: 'contract', label: 'Contract', icon: FileSignature, count: brideContract ? 1 : 0 },
    { key: 'payments', label: 'Payments', icon: CreditCard, count: brideInvoices.length },
    { key: 'alterations', label: 'Alterations', icon: Scissors, count: brideAlterations.length },
    { key: 'messages', label: 'Messages', icon: MessageSquare, count: brideMessages.length },
    { key: 'documents', label: 'Documents', icon: FileText },
    { key: 'activity', label: 'Activity Log', icon: Activity },
    { key: 'lookbook', label: 'Digital Lookbook', icon: Sparkles },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors bg-white border border-stone-200 rounded-lg px-3 py-1.5 shadow-2xs"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Brides
        </button>
        <span className="text-xs text-stone-500 font-medium">Bride 360 Unified Record · ID: {bride.id}</span>
      </div>

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-stone-900 via-stone-800 to-rose-950 p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-5">
            <BridalIdentity
              customer={bride}
              size="xl"
              showEditOverlay
              onPhotoClick={() => setPhotoModalOpen(true)}
            />
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-rose-500/20 px-3 py-0.5 text-xs font-semibold text-rose-300 ring-1 ring-inset ring-rose-500/40">
                  {bride.status} Bride
                </span>
                {bride.stylist && (
                  <span className="text-xs text-stone-300">
                    Stylist: <strong className="text-white">{bride.stylist}</strong>
                  </span>
                )}
              </div>
              <h1 className="font-serif text-3xl font-bold tracking-tight text-white">{bride.name}</h1>
              <div className="flex flex-wrap gap-4 text-xs text-stone-300 pt-1">
                {bride.weddingDate && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-rose-400" />
                    <span>Wedding: {formatDate(bride.weddingDate)}</span>
                  </div>
                )}
                {bride.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-rose-400" />
                    <span>{bride.email}</span>
                  </div>
                )}
                {bride.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-rose-400" />
                    <span>{bride.phone}</span>
                  </div>
                )}
                {bride.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-rose-400" />
                    <span>{bride.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                const link = `${window.location.origin}/portal/${bride.id}?t=${bride.portalToken}`;
                navigator.clipboard.writeText(link);
                toast({ title: 'Link copied!', description: 'Private portal link copied to clipboard.' });
              }}
              className="rounded-xl bg-violet-500/20 px-4 py-2 text-xs font-semibold text-violet-300 hover:bg-violet-500/30 transition-colors border border-violet-500/30"
              title="Copy private portal link"
            >
              Copy Portal Link
            </button>
            <button
              onClick={() => navigateToView('appointments')}
              className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-rose-600 transition-colors"
            >
              + Book Fitting
            </button>
            <button
              onClick={() => navigateToView('sales', { tab: 'payments' })}
              className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-colors border border-white/20"
            >
              Collect Payment
            </button>
          </div>
        </div>

        {/* Lifecycle Stage Tracker */}
        <div className="mt-8 border-t border-white/10 pt-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-300/80 mb-3">
            Bride Lifecycle Journey
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
            {LIFECYCLE_STAGES.map((stage, idx) => {
              const isPassed = idx <= currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              let targetTab: Bride360Tab = 'overview';
              if (stage.includes('Appointment') || stage.includes('Consultation')) targetTab = 'appointments';
              else if (stage === 'Gown Selected') targetTab = 'gown';
              else if (stage === 'Contract Pending') targetTab = 'contract';
              else if (stage === 'Payment in Progress') targetTab = 'payments';
              else if (stage === 'Alterations' || stage === 'Ready for Pickup') targetTab = 'alterations';

              return (
                <div
                  key={stage}
                  onClick={() => setTab(targetTab)}
                  className={`flex flex-col items-center rounded-xl p-2 text-center transition-all cursor-pointer hover:opacity-80 ${
                    isCurrent
                      ? 'bg-rose-500 text-white font-bold shadow-lg ring-2 ring-rose-300'
                      : isPassed
                      ? 'bg-white/15 text-stone-200'
                      : 'bg-white/5 text-stone-500'
                  }`}
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] mb-1">
                    {isPassed ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-3.5 w-3.5" />}
                  </div>
                  <span className="text-[10px] leading-tight line-clamp-2">{stage}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs Subnav */}
      <div className="flex overflow-x-auto border-b border-stone-200 gap-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors ${
                active
                  ? 'border-rose-500 text-rose-600 font-semibold bg-rose-50/50'
                  : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-800'
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? 'text-rose-600' : 'text-stone-400'}`} />
              {t.label}
              {t.count !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    active ? 'bg-rose-500 text-white font-bold' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
        {tab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-stone-900 border-b pb-2">Boutique Summary</h3>
              <div className="space-y-2 text-xs text-stone-600">
                <p><strong>Selected Gown:</strong> {bride.purchasedGown || 'None recorded yet'}</p>
                <p><strong>Budget:</strong> ${bride.budget || 'N/A'}</p>
                <p><strong>Boutique Store:</strong> {bride.location || 'Baton Rouge'}</p>
                <p><strong>Assigned Stylist:</strong> {bride.stylist || 'Unassigned'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-stone-900 border-b pb-2">Contract & Balances</h3>
              <div className="space-y-2 text-xs text-stone-600">
                <p><strong>Contract Status:</strong> {brideContract ? brideContract.status : 'No contract'}</p>
                <p><strong>Total Invoiced:</strong> ${formatCents(brideInvoices.reduce((a, c) => a + c.totalCents, 0))}</p>
                <p><strong>Balance Due:</strong> ${formatCents(brideInvoices.reduce((a, c) => a + c.balanceCents, 0))}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-stone-900 border-b pb-2">Next Scheduled Action</h3>
              <div 
                className="rounded-xl bg-stone-50 p-4 border border-stone-200 text-xs cursor-pointer hover:bg-stone-100 hover:border-stone-300 transition-colors"
                onClick={() => setTab('appointments')}
              >
                {brideAppointments.length > 0 ? (
                  <div>
                    <div className="flex justify-between items-start">
                      <p className="font-semibold text-stone-900">{brideAppointments[0].type} Appointment</p>
                      <ArrowRight className="h-3 w-3 text-stone-400" />
                    </div>
                    <p className="text-stone-500 mt-1">{formatDate(brideAppointments[0].date)} at {brideAppointments[0].time}</p>
                    <p className="text-stone-500">Stylist: {brideAppointments[0].stylist}</p>
                  </div>
                ) : (
                  <p className="text-stone-500 italic">No upcoming appointment scheduled yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'appointments' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-stone-900 border-b pb-2">Appointment History</h3>
            {brideAppointments.length === 0 ? (
              <p className="text-xs text-stone-500 italic py-6 text-center">No appointments found.</p>
            ) : (
              <div className="space-y-2">
                {brideAppointments.map((appt) => (
                  <div 
                    key={appt.id} 
                    onClick={() => navigateToView('appointments', { brideName: bride.name, mode: 'list' })}
                    className="rounded-xl bg-stone-50 p-4 border border-stone-200 text-xs flex items-center justify-between cursor-pointer hover:bg-stone-100 hover:border-stone-300 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-stone-900 flex items-center gap-1.5">{appt.type} <ExternalLink className="h-3 w-3 text-stone-400" /></p>
                      <p className="text-stone-500">{formatDate(appt.date)} at {appt.time}</p>
                      <p className="text-stone-500">Stylist: {appt.stylist}</p>
                    </div>
                    <span className="rounded-full bg-stone-200 text-stone-700 px-2.5 py-1 text-[11px] font-semibold">
                      {appt.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'gown' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-stone-900">Gown & Fit Profile</h3>
            <div 
              onClick={() => navigateToView('inventory', { tab: 'purchase_orders' })}
              className="rounded-xl bg-stone-50 p-4 border border-stone-200 text-xs space-y-2 cursor-pointer hover:bg-stone-100 hover:border-stone-300 transition-colors"
            >
              <div className="flex justify-between items-start">
                <p><strong>Chosen Style:</strong> {bride.purchasedGown || 'Not selected'}</p>
                <ExternalLink className="h-3 w-3 text-stone-400" />
              </div>
              <p><strong>Purchase Orders:</strong> {bridePOs.length} POs associated</p>
            </div>
          </div>
        )}
        {tab === 'contract' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-stone-900">Bridal Agreement Contract</h3>
            {brideContract ? (
              <div 
                onClick={() => navigateToView('sales', { tab: 'quotes' })}
                className="rounded-xl bg-stone-50 p-4 border border-stone-200 text-xs space-y-2 cursor-pointer hover:bg-stone-100 hover:border-stone-300 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <p><strong>Contract ID:</strong> {brideContract.id}</p>
                  <ExternalLink className="h-3 w-3 text-stone-400" />
                </div>
                <p><strong>Status:</strong> {brideContract.status}</p>
                <p><strong>Signed On:</strong> {brideContract.signedAt ? formatDate(brideContract.signedAt) : 'Pending Signature'}</p>
                <p><strong>Total Amount:</strong> ${formatCents(brideContract.totalCents)}</p>
              </div>
            ) : (
              <p className="text-xs text-stone-500 italic py-6 text-center">No contract generated for this bride yet.</p>
            )}
          </div>
        )}

        {tab === 'payments' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-stone-900">Invoices & Ledger Payouts</h3>
            {brideInvoices.length === 0 ? (
              <p className="text-xs text-stone-500 italic py-6 text-center">No invoices generated yet.</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {brideInvoices.map((inv) => (
                  <div 
                    key={inv.id} 
                    onClick={() => navigateToView('sales', { tab: 'payments' })}
                    className="py-3 flex items-center justify-between text-xs cursor-pointer hover:bg-stone-50 transition-colors px-2 rounded-lg -mx-2 group"
                  >
                    <div>
                      <p className="font-semibold text-stone-900 flex items-center gap-1.5">{inv.id} <ExternalLink className="h-3 w-3 text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity" /></p>
                      <p className="text-stone-500">{formatDate(inv.dueDate)} • Total: {formatCents(inv.amountCents)}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={inv.status} />
                      <p className="mt-1 font-medium text-amber-600">Bal: {formatCents(inv.amountCents - inv.paidCents)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'alterations' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-stone-900">Alterations & Fittings</h3>
            {brideAlterations.length === 0 ? (
              <p className="text-xs text-stone-500 italic py-6 text-center">No alteration fittings scheduled.</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {brideAlterations.map((alt) => (
                  <div 
                    key={alt.id} 
                    onClick={() => navigateToView('sales', { tab: 'alterations' })}
                    className="py-3 flex items-center justify-between text-xs cursor-pointer hover:bg-stone-50 transition-colors px-2 rounded-lg -mx-2 group"
                  >
                    <div>
                      <p className="font-semibold text-stone-900 flex items-center gap-1.5">Fitting #{alt.id}  Seamstress: {alt.seamstress} <ExternalLink className="h-3 w-3 text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity" /></p>
                      <p className="text-stone-500">Target Date: {formatDate(alt.fittingDate)}</p>
                    </div>
                    <span className="rounded-full bg-violet-50 text-violet-700 border border-violet-200 px-2.5 py-1 text-[11px] font-semibold">
                      {alt.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'messages' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-stone-900">Client Communications</h3>
            {brideMessages.length === 0 ? (
              <p className="text-xs text-stone-500 italic py-6 text-center">No message history recorded.</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {brideMessages.map((m) => (
                  <div 
                    key={m.id} 
                    onClick={() => navigateToView('customers', { tab: 'inbox', search: bride.name })}
                    className="py-3 text-xs space-y-1 cursor-pointer hover:bg-stone-50 transition-colors px-2 rounded-lg -mx-2 group"
                  >
                    <div className="flex justify-between text-stone-400">
                      <span className="flex items-center gap-1.5">{m.channel}  {m.direction} <ExternalLink className="h-3 w-3 text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity" /></span>
                      <span>{formatDate(m.createdAt)}</span>
                    </div>
                    <p className="text-stone-800 font-medium">{m.preview}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'documents' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-stone-900">Stored Documents & Fit Sheets</h3>
            <ul className="text-xs text-stone-600 space-y-2">
              <li className="flex items-center justify-between border-b pb-2">
                <span>Bridal Agreement Form.pdf</span>
                <button className="text-rose-600 hover:underline">Download</button>
              </li>
              <li className="flex items-center justify-between border-b pb-2">
                <span>Measurements & Fit Record.pdf</span>
                <button className="text-rose-600 hover:underline">Download</button>
              </li>
            </ul>
          </div>
        )}

        {tab === 'activity' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-stone-900">Audit & Interaction Timeline</h3>
            <div className="border-l-2 border-rose-200 pl-4 space-y-4 text-xs text-stone-600">
              <div>
                <p className="font-semibold text-stone-900">Bride Profile Created</p>
                <p className="text-[10px] text-stone-400">Added to boutique system database</p>
              </div>
              {bride.purchasedGown && (
                  <div>
                    <p className="font-semibold text-stone-900">Gown Selection Updated: {bride.purchasedGown}</p>
                    <p className="text-[10px] text-stone-400">Recorded by {bride.stylist || 'Stylist'}</p>
                  </div>
                )}
                {brideAlterations.map((alt) => (
                  <div key={alt.id}>
                    <p className="font-semibold text-stone-900">Alterations {alt.status}</p>
                    <p className="text-[10px] text-stone-400">Seamstress: {alt.seamstress} • Next Fitting: {alt.nextFitting}</p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {tab === 'lookbook' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-stone-900 to-stone-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-rose-500/10 blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row gap-6 justify-between items-start">
              <div>
                <h3 className="text-xl font-serif font-bold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-rose-400" /> AI Stylist Matchmaker
                </h3>
                <p className="text-stone-300 text-sm mt-1 max-w-xl">
                  Based on {bride.name}'s Pinterest board, budget (${bride.budget}), and venue style, our AI recommends these instock gowns for her upcoming fitting.
                </p>
              </div>
              <button 
                onClick={() => toast({ title: 'Regenerating matches...', description: 'AI is analyzing new style inputs.' })}
                className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition-colors whitespace-nowrap"
              >
                Regenerate Matches
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Recommendation 1 */}
            <div className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow group">
              <div className="aspect-[3/4] bg-stone-100 relative">
                <div className="absolute inset-0 flex items-center justify-center text-stone-300 font-serif italic">
                  [Gown Photo 1]
                </div>
                <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur">
                  98% Match
                </div>
              </div>
              <div className="p-4">
                <p className="text-xs text-stone-500 uppercase tracking-wider font-bold mb-1">Milla Nova</p>
                <h4 className="font-serif font-bold text-stone-900 mb-2">The "Camilla" Ballgown</h4>
                <div className="flex justify-between items-center">
                  <p className="text-sm font-bold text-rose-600">$2,400</p>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                    In Stock: Size 10
                  </span>
                </div>
                <button 
                  onClick={() => navigateToView('inventory', { tab: 'catalog' })}
                  className="w-full mt-3 border border-stone-200 text-stone-600 text-xs font-bold py-1.5 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  Pull for Fitting
                </button>
              </div>
            </div>
            
            {/* Recommendation 2 */}
            <div className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow group">
              <div className="aspect-[3/4] bg-stone-100 relative">
                <div className="absolute inset-0 flex items-center justify-center text-stone-300 font-serif italic">
                  [Gown Photo 2]
                </div>
                <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur">
                  92% Match
                </div>
              </div>
              <div className="p-4">
                <p className="text-xs text-stone-500 uppercase tracking-wider font-bold mb-1">Martina Liana</p>
                <h4 className="font-serif font-bold text-stone-900 mb-2">Style 1442 A-Line</h4>
                <div className="flex justify-between items-center">
                  <p className="text-sm font-bold text-rose-600">$3,100</p>
                  <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                    Sample Only
                  </span>
                </div>
                <button className="w-full mt-3 border border-stone-200 text-stone-600 text-xs font-bold py-1.5 rounded-lg hover:bg-stone-50 transition-colors">
                  Pull for Fitting
                </button>
              </div>
            </div>

            {/* Lookbook Moodboard */}
            <div className="border border-stone-200 rounded-xl p-4 bg-stone-50 flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-full bg-white border border-stone-200 flex items-center justify-center mb-3 shadow-sm">
                <Plus className="h-5 w-5 text-stone-400" />
              </div>
              <h4 className="font-bold text-stone-900 text-sm mb-1">Add to Digital Lookbook</h4>
              <p className="text-xs text-stone-500 mb-4 px-4">Upload Pinterest screenshots or inspiration photos to improve AI matches.</p>
              <button 
                onClick={() => setPhotoModalOpen(true)}
                className="bg-white border border-stone-200 text-stone-700 text-xs font-bold px-4 py-2 rounded-lg hover:bg-stone-100 transition-colors"
              >
                Upload Photos
              </button>
            </div>
          </div>
        </div>
      )}

      <BridePhotoModal open={photoModalOpen} onClose={() => setPhotoModalOpen(false)} bride={bride} />
    </div>
  );
}

