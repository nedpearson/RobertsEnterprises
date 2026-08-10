import React from 'react';
import { format } from 'date-fns';
import { MessageSquare, Mail, Phone, Clock, FileText, CheckCircle2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@vowos/design-system';
import type { Communication } from '@/lib/communications';

interface UnifiedCommunicationTimelineProps {
  communications: Communication[];
}

export default function UnifiedCommunicationTimeline({ communications }: UnifiedCommunicationTimelineProps) {
  if (communications.length === 0) {
    return (
      <div className="text-center py-8 text-stone-500">
        <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-20" />
        <p>No communication history yet.</p>
      </div>
    );
  }

  const getIcon = (channel: string) => {
    switch (channel) {
      case 'sms': return <MessageSquare className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      case 'phone': return <Phone className="w-4 h-4" />;
      case 'system_event': return <CheckCircle2 className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getColor = (channel: string, direction: string) => {
    if (channel === 'system_event') return 'bg-stone-100 text-stone-600 border-stone-200';
    if (direction === 'outbound') return 'bg-brand-soft text-brand-primary-hover border-border-subtle';
    return 'bg-status-info/10 text-blue-700 border-blue-200';
  };

  return (
    <div className="space-y-6">
      {communications.map((comm) => (
        <div key={comm.id} className="flex gap-4">
          <div className="mt-1 flex-shrink-0">
            <Avatar className="w-8 h-8 border border-stone-200">
              <AvatarFallback className={getColor(comm.channel, comm.direction)}>
                {getIcon(comm.channel)}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-stone-900">
                {comm.direction === 'outbound' ? 'To: Customer' : 'From: Customer'}
                {comm.sender_name && <span className="text-stone-500 font-normal ml-2">via {comm.sender_name}</span>}
              </p>
              <div className="flex items-center text-xs text-stone-500">
                <Clock className="w-3 h-3 mr-1" />
                {format(new Date(comm.created_at), 'MMM d, h:mm a')}
              </div>
            </div>
            <div className={`text-sm p-3 rounded-lg border ${getColor(comm.channel, comm.direction)}`}>
              <div className="font-semibold text-xs mb-1 uppercase tracking-wider opacity-70">
                {comm.channel} {comm.is_automated && ' • Automated'}
              </div>
              <div className="whitespace-pre-wrap">{comm.body || 'No content.'}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
