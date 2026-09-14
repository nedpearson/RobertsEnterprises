import React from 'react';
import { Badge } from '@vowos/design-system';
import { Button } from '@vowos/design-system';
import { Clock, Sparkles } from 'lucide-react';

interface DraggableAppointmentCardProps {
  request: any;
  onSelect: (req: any) => void;
  onAssign: (req: any) => void;
}

export function DraggableAppointmentCard({ request, onSelect, onAssign }: DraggableAppointmentCardProps) {
  const customerName = request.customer?.name || request.customer_name || 'Guest';
  const serviceName = request.service?.name || request.service_name || 'Bridal Fitting';
  
  // Try to determine the requested time or mark as flexible
  const requestedTime = request.preferred_time_1 || 'Flexible';
  const requestedDate = request.preferred_date_1 || 'TBD';

  return (
    <div
      data-id={request.id}
      data-title={`${customerName} - ${serviceName}`}
      className="draggable-request-card p-2.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 cursor-grab active:cursor-grabbing transition-all hover:border-rose-300 shadow-sm mb-2"
      onClick={() => onSelect(request)}
    >
      <div className="flex justify-between items-start mb-1">
        <span className="font-semibold text-xs text-stone-900 truncate pr-2">
          {customerName}
        </span>
        <Badge variant="outline" className="text-[9px] px-1 py-0 bg-brand-soft text-brand-primary-hover border-border-subtle shrink-0">
          {request.status === 'submitted' ? 'New' : 'Pending'}
        </Badge>
      </div>
      
      <p className="text-[10px] text-stone-600 font-medium mb-1.5 truncate">
        {serviceName} • {request.location_id ? 'I Do Bridal Couture' : 'All Boutiques'}
      </p>
      
      <div className="flex items-center gap-1.5 text-[10px] text-stone-500 bg-stone-100/60 p-1 rounded mb-2">
        <Clock className="h-3 w-3 shrink-0 text-stone-400" />
        <span className="font-medium truncate">{requestedDate} @ {requestedTime}</span>
      </div>

      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">
          <Sparkles className="h-2.5 w-2.5" />
          <span>AI Ready</span>
        </div>
        <Button 
          onClick={(e) => {
            e.stopPropagation();
            onAssign(request);
          }}
          size="sm"
          className="h-6 text-[10px] px-2.5 bg-rose-700 hover:bg-rose-800 text-white shrink-0"
        >
          Assign
        </Button>
      </div>
    </div>
  );
}
