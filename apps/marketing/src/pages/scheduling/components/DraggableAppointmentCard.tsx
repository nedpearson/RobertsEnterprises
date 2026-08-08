import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

interface DraggableAppointmentCardProps {
  request: any;
  onSelect: (req: any) => void;
  onAssign: (req: any) => void;
}

export function DraggableAppointmentCard({ request, onSelect, onAssign }: DraggableAppointmentCardProps) {
  return (
    <div
      data-id={request.id}
      data-title={`${request.customer?.first_name || 'Guest'} - ${request.service?.name || 'Fitting'}`}
      className="draggable-request-card p-3 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-stone-100/80 cursor-grab active:cursor-grabbing transition-all hover:border-rose-300 shadow-sm"
      onClick={() => onSelect(request)}
    >
      <div className="flex justify-between items-start mb-1">
        <span className="font-semibold text-xs text-stone-900">
          {request.customer?.first_name} {request.customer?.last_name}
        </span>
        <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200">
          Pending
        </Badge>
      </div>
      <p className="text-xs text-stone-600 font-medium mb-2">{request.service?.name || 'Bridal Fitting'}</p>
      <div className="flex items-center justify-between text-[10px] text-stone-400">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" /> {request.preferred_date_1 || 'Flexible'}
        </span>
        <Button 
          onClick={(e) => {
            e.stopPropagation();
            onAssign(request);
          }}
          size="sm"
          className="h-6 text-[10px] px-2 bg-stone-900 text-white"
        >
          Assign
        </Button>
      </div>
    </div>
  );
}
