import { useEffect, useRef, useState } from 'react';
import { MapPin, ChevronDown, Store, Check } from 'lucide-react';
import { LOCATIONS, LocationId, LocationFilter, locationById } from '@/data/vowosData';
import { useVowosData } from '@/contexts/VowosDataContext';
import { inputCls } from './ui';

/** Small brand-colored chip identifying which store a record lives at. */
export function LocationBadge({ id, className = '' }: { id: LocationId; className?: string }) {
  const loc = locationById(id);
  const colors =
    loc.accent === 'rose'
      ? 'bg-rose-50 text-rose-700 ring-rose-200'
      : 'bg-violet-50 text-violet-700 ring-violet-200';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${colors} ${className}`}
      title={`${loc.business} — ${loc.address}`}
    >
      <MapPin className="h-3 w-3" />
      {loc.short}
    </span>
  );
}

/** Form <select> for choosing one of the four stores, grouped by business. */
export function LocationSelect({
  value,
  onChange,
  id,
  exclude,
}: {
  value: LocationId;
  onChange: (loc: LocationId) => void;
  id?: string;
  /** Optionally hide a store (e.g. the transfer's source). */
  exclude?: LocationId;
}) {
  const businesses = Array.from(new Set(LOCATIONS.map((l) => l.business)));
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as LocationId)}
      className={inputCls}
    >
      {businesses.map((biz) => (
        <optgroup key={biz} label={biz}>
          {LOCATIONS.filter((l) => l.business === biz && l.id !== exclude).map((l) => (
            <option key={l.id} value={l.id}>
              {l.city} — {biz}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

/** Header dropdown that sets the app-wide active location (or "All Locations"). */
export function LocationSwitcher() {
  const { activeLocation, setActiveLocation } = useVowosData();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const label =
    activeLocation === 'all' ? 'All Locations' : locationById(activeLocation).short;
  const businesses = Array.from(new Set(LOCATIONS.map((l) => l.business)));

  const pick = (loc: LocationFilter) => {
    setActiveLocation(loc);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:border-stone-300"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Store className="h-4 w-4 text-rose-500" />
        <span className="max-w-[150px] truncate">{label}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl">
          <button
            onClick={() => pick('all')}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-stone-50 ${
              activeLocation === 'all' ? 'font-semibold text-stone-900' : 'text-stone-600'
            }`}
          >
            <span className="flex items-center gap-2">
              <Store className="h-4 w-4 text-stone-400" />
              All Locations
            </span>
            {activeLocation === 'all' && <Check className="h-4 w-4 text-rose-500" />}
          </button>

          {businesses.map((biz) => (
            <div key={biz}>
              <p className="mt-1 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                {biz}
              </p>
              {LOCATIONS.filter((l) => l.business === biz).map((l) => (
                <button
                  key={l.id}
                  onClick={() => pick(l.id)}
                  className={`flex w-full items-start justify-between rounded-xl px-3 py-2 text-left transition-colors hover:bg-stone-50 ${
                    activeLocation === l.id ? 'bg-stone-50' : ''
                  }`}
                >
                  <span className="flex items-start gap-2">
                    <MapPin
                      className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                        l.accent === 'rose' ? 'text-rose-400' : 'text-violet-400'
                      }`}
                    />
                    <span>
                      <span
                        className={`block text-sm ${
                          activeLocation === l.id ? 'font-semibold text-stone-900' : 'text-stone-700'
                        }`}
                      >
                        {l.city}
                      </span>
                      <span className="block text-[11px] text-stone-400">
                        {l.address} · {l.hours}
                      </span>
                    </span>
                  </span>
                  {activeLocation === l.id && <Check className="mt-1 h-4 w-4 flex-shrink-0 text-rose-500" />}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
