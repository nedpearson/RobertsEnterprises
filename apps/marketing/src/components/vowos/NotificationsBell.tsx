import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRightLeft, Bell, ReceiptText, Truck } from 'lucide-react';
import { useVowosData } from '@/contexts/VowosDataContext';
import { formatDate, locationById } from '@/data/vowosData';
import { ViewKey } from './Sidebar';

interface AlertItem {
  id: string;
  title: string;
  sub: string;
  view: ViewKey;
  kind: 'transfer' | 'invoice' | 'po';
}

const ICONS = {
  transfer: { Icon: ArrowRightLeft, cls: 'bg-amber-100 text-status-warning' },
  invoice: { Icon: ReceiptText, cls: 'bg-brand-soft text-brand-primary' },
  po: { Icon: Truck, cls: 'bg-sky-100 text-sky-600' },
} as const;

/**
 * Live notification bell: transfer alerts (gowns in transit awaiting receipt),
 * overdue invoices, and delayed purchase orders — scoped to the active store.
 */
export default function NotificationsBell({
  onNavigate,
}: {
  onNavigate: (view: ViewKey) => void;
}) {
  const { transfers, invoices, purchaseOrders } = useVowosData();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const todayIso = new Date().toISOString().slice(0, 10);

  const alerts = useMemo<AlertItem[]>(() => {
    const items: AlertItem[] = [];

    // ── Transfer alerts: every gown still on the road between stores ──
    transfers
      .filter((t) => t.status === 'In Transit')
      .forEach((t) => {
        items.push({
          id: `transfer-${t.id}`,
          title: `${t.qty} × ${t.gownName} in transit`,
          sub: `${locationById(t.from).short} → ${locationById(t.to).short} · sent ${formatDate(t.requested)} — awaiting receipt`,
          view: 'transfers',
          kind: 'transfer',
        });
      });

    // ── Overdue invoices ──
    invoices
      .filter((i) => i.status !== 'Paid' && (i.status === 'Overdue' || i.dueDate < todayIso))
      .forEach((i) => {
        items.push({
          id: `invoice-${i.id}`,
          title: `${i.id} for ${i.customer} is overdue`,
          sub: `${locationById(i.location).short} · was due ${formatDate(i.dueDate)}`,
          view: 'invoices',
          kind: 'invoice',
        });
      });

    // ── Delayed purchase orders ──
    purchaseOrders
      .filter((p) => p.status === 'Delayed')
      .forEach((p) => {
        items.push({
          id: `po-${p.id}`,
          title: `${p.id} from ${p.vendor} is delayed`,
          sub: `${locationById(p.location).short} · ETA was ${formatDate(p.expectedDelivery)}`,
          view: 'purchases',
          kind: 'po',
        });
      });

    return items;
  }, [transfers, invoices, purchaseOrders, todayIso]);

  const transferCount = alerts.filter((a) => a.kind === 'transfer').length;

  const pick = (view: ViewKey) => {
    setOpen(false);
    onNavigate(view);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100"
        aria-label={`Notifications (${alerts.length})`}
      >
        <Bell className="h-5 w-5" />
        {alerts.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-primary px-1 text-[10px] font-bold text-white">
            {alerts.length > 9 ? '9+' : alerts.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-2xl border border-stone-200 bg-white p-2 shadow-xl">
          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Notifications
            </p>
            {transferCount > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-status-warning">
                {transferCount} transfer{transferCount === 1 ? '' : 's'} in transit
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {alerts.map((a) => {
              const { Icon, cls } = ICONS[a.kind];
              return (
                <button
                  key={a.id}
                  onClick={() => pick(a.view)}
                  className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-stone-50"
                >
                  <span className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${cls}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span>
                    <p className="text-sm leading-snug text-stone-700">{a.title}</p>
                    <p className="mt-0.5 text-xs text-stone-400">{a.sub}</p>
                  </span>
                </button>
              );
            })}
            {alerts.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-stone-400">
                All caught up — no pending transfers, overdue invoices, or delayed orders.
              </p>
            )}
          </div>

          {transferCount > 0 && (
            <button
              onClick={() => pick('transfers')}
              className="mt-1 w-full rounded-xl border border-status-warning/20 bg-status-warning/10 px-3 py-2 text-xs font-semibold text-status-warning transition-colors hover:bg-amber-100"
            >
              Review &amp; receive pending transfers
            </button>
          )}
        </div>
      )}
    </div>
  );
}
