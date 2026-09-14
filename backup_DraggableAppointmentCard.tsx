import React from 'react';
import { Badge } from '@vowos/design-system';
import { Button } from '@vowos/design-system';
import { Clock } from 'lucide-react';

interface DraggableAppointmentCardProps {
  request: any;
  onSelect: (req: any) => void;
  onAssign: (req: any) => void;
}

export function DraggableAppointmentCard({ request, onSelect, onAssign }: DraggableAppointmentCardProps) {
  const customerName = request.customer?.name || request.customer_name || 'Guest';
  const customerPhone = request.customer?.phone;
  const customerEmail = request.customer?.email;
  const serviceName = request.service?.name || request.service_name || 'Bridal Fitting';

  return (
    <div
      data-id={request.id}
      data-title={`${customerName} - ${serviceName}`}
      className="draggable-request-card p-3 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-stone-100/80 cursor-grab active:cursor-grabbing transition-all hover:border-rose-300 shadow-sm"
      onClick={() => onSelect(request)}
    >
      <div className="flex justify-between items-start mb-1">
        <span className="font-semibold text-xs text-stone-900 truncate pr-2">
          {customerName}
        </span>
        <Badge variant="outline" className="text-[10px] bg-brand-soft text-brand-primary-hover border-border-subtle shrink-0">
          Pending
        </Badge>
      </div>
      {(customerPhone || customerEmail) && (
        <p className="text-[10px] text-stone-500 mb-1 truncate">
          {customerPhone || customerEmail}
        </p>
      )}
      <p className="text-xs text-stone-600 font-medium mb-2 truncate">
        {serviceName}
      </p>
      <div className="flex items-center justify-between text-[10px] text-stone-400">
        <span className="flex items-center gap-1 truncate max-w-[120px]">
          <Clock className="h-3 w-3 shrink-0" /> 
          <span className="truncate">{request.preferred_date_1 || 'Flexible Date'}</span>
        </span>
        <Button 
          onClick={(e) => {
            e.stopPropagation();
            onAssign(request);
          }}
          size="sm"
          className="h-6 text-[10px] px-2 bg-stone-900 text-white shrink-0 ml-2"
        >
          Assign
        </Button>
      </div>
    </div>
  );
}
