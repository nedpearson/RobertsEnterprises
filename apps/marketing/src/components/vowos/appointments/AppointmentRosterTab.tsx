import React from 'react';
import RosterTab from '../shared/RosterTab';
import { StatusBadge } from '@/components/vowos/ui';
import { formatDate } from '@/data/vowosData';

interface AppointmentRosterTabProps {
  title: string;
  description: string;
  data: any[];
  filterFn: (a: any) => boolean;
  emptyLabel: string;
  onSelect: (a: any) => void;
}

export function AppointmentRosterTab({ title, description, data, filterFn, emptyLabel, onSelect }: AppointmentRosterTabProps) {
  
  const getCustomerName = (a: any) => {
    return a.customer?.name || (a.customer?.first_name ? `${a.customer.first_name} ${a.customer.last_name || ''}`.trim() : null) || 'Walk-in';
  };

  const getStylistName = (a: any) => {
    return a.employee?.name || a.employee?.first_name || 'Unassigned';
  };

  const getType = (a: any) => {
    return a.service?.name || a.type || 'Appointment';
  };

  return (
    <RosterTab<any>
      title={title}
      description={description}
      data={data}
      filter={filterFn}
      primaryKey={(a) => a.id}
      searchPredicate={(a, term) => getCustomerName(a).toLowerCase().includes(term) || getType(a).toLowerCase().includes(term)}
      onRowClick={onSelect}
      emptyLabel={emptyLabel}
      columns={[
        { header: 'Client', render: (a) => <span className="font-bold text-stone-900">{getCustomerName(a)}</span> },
        { header: 'Type', render: (a) => getType(a) },
        { header: 'Date', render: (a) => a.start_at ? formatDate(a.start_at) : (a.date || '—') },
        { header: 'Time', render: (a) => a.start_at ? new Date(a.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (a.time || '—') },
        { header: 'Stylist', render: (a) => getStylistName(a) },
        { header: 'Status', render: (a) => <StatusBadge status={a.status || 'new'} /> },
      ]}
    />
  );
}
