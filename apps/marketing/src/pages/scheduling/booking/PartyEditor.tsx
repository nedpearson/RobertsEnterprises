/**
 * Who is actually coming.
 *
 * The request carries `number_of_guests` — an integer. The card renders it as
 * "1 Bride + Guests", which tells a consultant nothing they can act on. Four
 * people are arriving: which one is the bride, which is her mother, who is
 * paying, who uses a wheelchair, who cannot have the champagne.
 *
 * Captured against the enquiry and carried onto the appointment when it is
 * booked, so it survives the thing it describes becoming real.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useRequestParty, useSaveRequestParty, type PartyRole } from '@/lib/services/bookingService';

interface Props {
  businessId: string | undefined;
  requestId: string;
  /** Pre-fills the bride from the enquiry so the common case is one click. */
  customerName?: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  guestCount?: number | null;
}

interface Row {
  fullName: string;
  role: PartyRole;
  isPrimary: boolean;
  email: string | null;
  phone: string | null;
  notes: string | null;
  attending: boolean;
}

const ROLES: Array<{ value: PartyRole; label: string }> = [
  { value: 'BRIDE', label: 'Bride' },
  { value: 'PARTNER', label: 'Partner' },
  { value: 'MOTHER', label: 'Mother' },
  { value: 'FATHER', label: 'Father' },
  { value: 'MAID_OF_HONOUR', label: 'Maid of honour' },
  { value: 'BRIDESMAID', label: 'Bridesmaid' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'FRIEND', label: 'Friend' },
  { value: 'PAYER', label: 'Paying' },
  { value: 'GUEST', label: 'Guest' },
  { value: 'OTHER', label: 'Other' },
];

const input = 'w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-900 focus:outline-none';

export const PartyEditor: React.FC<Props> = ({
  businessId,
  requestId,
  customerName,
  customerEmail,
  customerPhone,
  guestCount,
}) => {
  const party = useRequestParty(businessId, requestId);
  const save = useSaveRequestParty(businessId, requestId);
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!party.data) return;
    if (party.data.length > 0) {
      setRows(
        party.data.map((member) => ({
          fullName: member.full_name ?? member.fullName ?? '',
          role: member.role,
          isPrimary: Boolean(member.is_primary ?? member.isPrimary),
          email: member.email,
          phone: member.phone,
          notes: member.notes,
          attending: member.attending !== false,
        })),
      );
      return;
    }
    // Nothing recorded yet: seed the bride from the enquiry itself rather than
    // making someone retype what the form already told us.
    setRows([
      {
        fullName: customerName || '',
        role: 'BRIDE',
        isPrimary: true,
        email: customerEmail ?? null,
        phone: customerPhone ?? null,
        notes: null,
        attending: true,
      },
    ]);
  }, [party.data, customerName, customerEmail, customerPhone]);

  const expected = useMemo(() => (guestCount && guestCount > 0 ? guestCount : null), [guestCount]);
  const attending = (rows ?? []).filter((row) => row.attending).length;

  if (party.isLoading || !rows) return <p className="p-3 text-sm text-gray-500">Loading the party…</p>;

  const update = (index: number, patch: Partial<Row>) => {
    setRows((current) =>
      (current ?? []).map((row, position) => {
        if (position !== index) {
          // Primary is exclusive; the database enforces it too, with a partial
          // unique index. Doing it here as well keeps the form from ever
          // submitting something the database will reject.
          return patch.isPrimary ? { ...row, isPrimary: false } : row;
        }
        return { ...row, ...patch };
      }),
    );
  };

  const addRow = () =>
    setRows((current) => [
      ...(current ?? []),
      { fullName: '', role: 'GUEST', isPrimary: false, email: null, phone: null, notes: null, attending: true },
    ]);

  const removeRow = (index: number) =>
    setRows((current) => (current ?? []).filter((_, position) => position !== index));

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-gray-500">
          {attending} attending
          {expected !== null && attending !== expected && (
            <span className="ml-1 text-amber-700">· the form said {expected}</span>
          )}
        </p>
        <button type="button" onClick={addRow} className="text-xs font-medium text-gray-700 underline">
          Add someone
        </button>
      </div>

      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={index} className="rounded-md border border-gray-200 p-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr,1.2fr,auto,auto]">
              <input
                className={input}
                placeholder="Name"
                value={row.fullName}
                onChange={(event) => update(index, { fullName: event.target.value })}
              />
              <select
                className={input}
                value={row.role}
                onChange={(event) => update(index, { role: event.target.value as PartyRole })}
              >
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-gray-600">
                <input
                  type="radio"
                  name={`primary-${requestId}`}
                  checked={row.isPrimary}
                  onChange={() => update(index, { isPrimary: true })}
                />
                Bride
              </label>
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="text-xs text-gray-400 hover:text-red-600"
                aria-label={`Remove ${row.fullName || 'this person'}`}
              >
                Remove
              </button>
            </div>
            <input
              className={`${input} mt-2`}
              placeholder="Anything the consultant should know before they walk in"
              value={row.notes ?? ''}
              onChange={(event) => update(index, { notes: event.target.value || null })}
            />
          </div>
        ))}
      </div>

      {save.error && <p className="text-xs text-red-600">{(save.error as Error).message}</p>}

      <button
        type="button"
        disabled={save.isPending}
        onClick={() => save.mutate(rows.filter((row) => row.fullName.trim()))}
        className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {save.isPending ? 'Saving…' : 'Save party'}
      </button>
    </div>
  );
};

export default PartyEditor;
