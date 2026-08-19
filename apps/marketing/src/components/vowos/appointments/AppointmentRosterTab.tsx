import React from 'react';
import { Appointment } from '@/data/vowosData';
import { useVowosData } from '@/contexts/VowosDataContext';
import RosterTab from '../shared/RosterTab';
import { StatusBadge } from '@/components/vowos/ui';
import { format, parseISO } from 'date-fns';

interface AppointmentRosterTabProps {
  title: string;
  description: string;
  filterFn: (a: Appointment) => boolean;
  emptyLabel: string;
  onSelect: (a: Appointment) => void;
}

export function AppointmentRosterTab({ title, description, filterFn, emptyLabel, onSelect }: AppointmentRosterTabProps) {
  const { appointments, brides } = useVowosData();
  
  const getCustomerName = (customerId: string) => {
    const bride = brides.find(b => b.id === customerId);
    return bride ? bride.name : 'Walk-in';
  };

  return (
    <RosterTab<Appointment>
      title={title}
      description={description}
      data={appointments}
      filter={filterFn}
      primaryKey={(a) => a.id}
      searchPredicate={(a, term) => getCustomerName(a.customer).toLowerCase().includes(term) || a.type.toLowerCase().includes(term)}
      onRowClick={onSelect}
      emptyLabel={emptyLabel}
      columns={[
        { header: 'Client', render: (a) => <span className="font-bold text-stone-900">{getCustomerName(a.customer)}</span> },
        { header: 'Type', render: (a) => a.type },
        { header: 'Date', render: (a) => format(parseISO(a.date), 'MMM d, yyyy') },
        { header: 'Time', render: (a) => a.time },
        { header: 'Stylist', render: (a) => a.stylist },
        { header: 'Location', render: (a) => a.location },
        { header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
        { header: 'Fee Paid', render: (a) => a.feePaid ? <span className="text-emerald-600 font-medium">Yes</span> : <span className="text-stone-400">No</span> },
      ]}
    />
  );
}
