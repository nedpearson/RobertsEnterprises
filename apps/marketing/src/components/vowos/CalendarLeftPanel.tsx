import React from 'react';
import { Search, Filter, Plus, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { Input } from '@vowos/design-system';
import { Button } from '@vowos/design-system';
import { ScrollArea } from '@vowos/design-system';
import { Badge } from '@vowos/design-system';
import type { AppointmentRequest } from '@/lib/appointment360';
import { format } from 'date-fns';

interface CalendarLeftPanelProps {
  requests: AppointmentRequest[];
  onSelectRequest: (request: AppointmentRequest) => void;
}

export default function CalendarLeftPanel({ requests, onSelectRequest }: CalendarLeftPanelProps) {
  const pendingRequests = requests.filter(r => r.status.toLowerCase() !== 'waitlist');
  const waitlist = requests.filter(r => r.status.toLowerCase() === 'waitlist');

  return (
    <div className="flex flex-col h-full bg-stone-50 border-r w-72 flex-shrink-0">
      <div className="p-4 border-b bg-white">
        <h2 className="font-semibold text-stone-900 mb-3 flex items-center justify-between">
          <span>Smart Queue</span>
          <Badge variant="secondary" className="bg-brand-soft text-brand-primary-hover">{pendingRequests.length}</Badge>
        </h2>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
          <Input 
            placeholder="Search requests..." 
            className="pl-9 bg-stone-50 border-stone-200 focus-visible:ring-focus-ring"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Action Required */}
          <div>
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3 flex items-center">
              <AlertTriangle className="w-3 h-3 mr-1 text-status-warning" />
              Action Required ({pendingRequests.length})
            </h3>
            <div className="space-y-2">
              {pendingRequests.map(req => (
                <div 
                  key={req.id}
                  onClick={() => onSelectRequest(req)}
                  className="bg-white p-3 rounded-lg border border-stone-200 shadow-sm cursor-pointer hover:border-rose-300 hover:shadow transition-all"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-stone-900 text-sm truncate pr-2">
                      {req.customer?.name || 'Unknown'}
                    </span>
                    {(req.priority === 'high' || req.priority === 'Urgent') && (
                      <span className="w-2 h-2 rounded-full bg-brand-primary flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mb-2 truncate">Bridal Consultation</p>
                  
                  {req.notes && req.notes.startsWith('AI') && (
                    <div className="mb-2 p-2 bg-indigo-50 border border-indigo-100 rounded text-xs text-indigo-700 font-medium">
                      ✨ {req.notes}
                    </div>
                  )}

                  <div className="flex items-center text-xs text-stone-400 bg-stone-50 px-2 py-1 rounded inline-flex">
                    <Clock className="w-3 h-3 mr-1" />
                    {format(new Date(req.submitted_at), 'MMM d, h:mm a')}
                  </div>
                </div>
              ))}
              {pendingRequests.length === 0 && (
                <div className="text-sm text-stone-500 text-center py-4">No pending requests</div>
              )}
            </div>
          </div>

          {/* Waitlist */}
          <div>
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3 flex items-center">
              <Clock className="w-3 h-3 mr-1 text-status-info" />
              Waitlist ({waitlist.length})
            </h3>
            <div className="space-y-2">
              {waitlist.map(req => (
                <div 
                  key={req.id}
                  onClick={() => onSelectRequest(req)}
                  className="bg-white p-3 rounded-lg border border-stone-200 shadow-sm cursor-pointer hover:border-blue-300 hover:shadow transition-all opacity-80"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-stone-900 text-sm truncate pr-2">
                      {req.customer?.name || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex items-center text-xs text-stone-400">
                    <Calendar className="w-3 h-3 mr-1" />
                    Requested: Oct 15 - 20
                  </div>
                </div>
              ))}
              {waitlist.length === 0 && (
                <div className="text-sm text-stone-500 text-center py-4">Waitlist is empty</div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t bg-white">
        <Button className="w-full bg-stone-900 hover:bg-stone-800 text-white">
          <Plus className="w-4 h-4 mr-2" />
          New Request
        </Button>
      </div>
    </div>
  );
}
