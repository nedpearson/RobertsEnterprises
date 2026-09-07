/**
 * Who has walked in.
 *
 * The consultant's view for the fifteen minutes around an appointment start:
 * the party as recorded at enquiry, each person with a tap to mark them in the
 * building. The first arrival checks the appointment in. Notes recorded against
 * a person — "do not mention price in front of her mother" — are shown here,
 * because here is where they are needed.
 */
import React from 'react';
import { useAppointmentParty, useMarkArrival } from '@/lib/services/bookingService';

interface Props {
  businessId: string | undefined;
  appointmentId: string;
}

const ROLE_LABEL: Record<string, string> = {
  BRIDE: 'Bride',
  PARTNER: 'Partner',
  MOTHER: 'Mother',
  FATHER: 'Father',
  MAID_OF_HONOUR: 'Maid of honour',
  BRIDESMAID: 'Bridesmaid',
  FAMILY: 'Family',
  FRIEND: 'Friend',
  PAYER: 'Paying',
  GUEST: 'Guest',
  OTHER: '',
};

export const ArrivalBoard: React.FC<Props> = ({ businessId, appointmentId }) => {
  const party = useAppointmentParty(businessId, appointmentId);
  const mark = useMarkArrival(businessId, appointmentId);

  if (party.isLoading) return <p className="p-3 text-sm text-gray-500">Loading the party…</p>;
  if (party.error) return <p className="p-3 text-sm text-red-600">{(party.error as Error).message}</p>;

  const members = party.data ?? [];
  if (members.length === 0) {
    return (
      <p className="p-3 text-sm text-gray-500">
        No party recorded for this appointment. Add them on the enquiry's Party tab and they carry over.
      </p>
    );
  }

  const arrived = members.filter((member) => member.arrived_at).length;
  const expected = members.filter((member) => member.attending !== false).length;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-gray-900">
          {arrived} of {expected} here
        </p>
        {arrived === 0 && <p className="text-xs text-gray-500">Tap the first person in to check the appointment in.</p>}
      </div>

      <ul className="space-y-2">
        {members.map((member) => {
          const here = Boolean(member.arrived_at);
          const name = member.full_name ?? member.fullName ?? 'Unnamed';
          const role = ROLE_LABEL[member.role] ?? member.role;
          return (
            <li
              key={member.id}
              className={`flex items-start justify-between gap-3 rounded-md border px-3 py-2 ${
                here ? 'border-green-200 bg-green-50' : 'border-gray-200'
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm text-gray-900">
                  {name}
                  {(member.is_primary ?? member.isPrimary) && (
                    <span className="ml-1.5 rounded bg-gray-900 px-1.5 py-0.5 text-[10px] font-medium uppercase text-white">
                      bride
                    </span>
                  )}
                  {role && !(member.is_primary ?? member.isPrimary) && (
                    <span className="ml-1.5 text-xs text-gray-500">{role}</span>
                  )}
                </p>
                {member.notes && <p className="mt-0.5 text-xs text-amber-800">{member.notes}</p>}
                {here && (
                  <p className="mt-0.5 text-[11px] text-green-700">
                    arrived{' '}
                    {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(
                      new Date(member.arrived_at!),
                    )}
                  </p>
                )}
              </div>
              <button
                type="button"
                disabled={mark.isPending || !member.id}
                onClick={() => member.id && mark.mutate({ memberId: member.id, arrived: !here })}
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium ${
                  here ? 'border border-gray-300 text-gray-700' : 'bg-gray-900 text-white'
                } disabled:opacity-50`}
              >
                {here ? 'Undo' : 'Arrived'}
              </button>
            </li>
          );
        })}
      </ul>

      {mark.error && <p className="text-xs text-red-600">{(mark.error as Error).message}</p>}
    </div>
  );
};

export default ArrivalBoard;
