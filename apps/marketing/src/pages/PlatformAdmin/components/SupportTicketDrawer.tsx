import React, { useState, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  getSupportTicketDetails,
  updateSupportTicket,
  postSupportMessage,
} from '@/lib/platform/platformDataSource';
import {
  Headphones,
  Clock,
  Send,
  Lock,
  User,
  Building2,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Sparkles,
  Tag,
  ShieldAlert,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SupportTicketDrawerProps {
  ticket: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTicketUpdated?: () => void;
}

export function SupportTicketDrawer({
  ticket,
  open,
  onOpenChange,
  onTicketUpdated,
}: SupportTicketDrawerProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState(ticket?.status || 'NEW');
  const [priority, setPriority] = useState(ticket?.priority || 'NORMAL');
  const [severity, setSeverity] = useState(ticket?.severity || 'Normal');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (ticket) {
      setStatus(ticket.status || 'NEW');
      setPriority(ticket.priority || 'NORMAL');
      setSeverity(ticket.severity || 'Normal');
      loadMessages(ticket.id);
    } else {
      setMessages([]);
    }
  }, [ticket]);

  const loadMessages = async (ticketId: string) => {
    try {
      setLoadingMessages(true);
      const { messages: fetched } = await getSupportTicketDetails(ticketId);
      setMessages(fetched || []);
    } catch (err: any) {
      console.error('Failed to load ticket messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket?.id || isUpdating) return;
    setIsUpdating(true);
    setStatus(newStatus);

    try {
      const res = await updateSupportTicket(ticket.id, { status: newStatus });
      if (res.success) {
        toast({
          title: 'Ticket Status Updated',
          description: `Ticket marked as ${newStatus.replace(/_/g, ' ')}.`,
        });
        onTicketUpdated?.();
      } else {
        toast({
          title: 'Update Failed',
          description: res.message || 'Failed to update ticket status.',
          variant: 'destructive',
        });
        setStatus(ticket.status || 'NEW');
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to update ticket.',
        variant: 'destructive',
      });
      setStatus(ticket.status || 'NEW');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (!ticket?.id || isUpdating) return;
    setIsUpdating(true);
    setPriority(newPriority);

    try {
      const res = await updateSupportTicket(ticket.id, { priority: newPriority });
      if (res.success) {
        toast({
          title: 'Ticket Priority Updated',
          description: `Priority set to ${newPriority}.`,
        });
        onTicketUpdated?.();
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to update priority.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSeverityChange = async (newSeverity: string) => {
    if (!ticket?.id || isUpdating) return;
    setIsUpdating(true);
    setSeverity(newSeverity);

    try {
      const res = await updateSupportTicket(ticket.id, { severity: newSeverity });
      if (res.success) {
        toast({
          title: 'Ticket Severity Updated',
          description: `Severity set to ${newSeverity}.`,
        });
        onTicketUpdated?.();
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to update severity.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket?.id || !replyText.trim() || isSending) return;

    setIsSending(true);
    const content = replyText.trim();

    try {
      const res = await postSupportMessage(ticket.id, content, isInternalNote);
      if (res.success) {
        toast({
          title: isInternalNote ? 'Internal Note Saved' : 'Reply Sent',
          description: isInternalNote
            ? 'Internal staff note added to ticket history.'
            : 'Customer reply recorded and dispatched.',
        });
        setReplyText('');
        // Add message optimistically
        setMessages((prev) => [
          ...prev,
          res.supportMessage || {
            id: `msg_${Date.now()}`,
            ticket_id: ticket.id,
            message: content,
            is_internal_note: isInternalNote,
            created_at: new Date().toISOString(),
          },
        ]);
        onTicketUpdated?.();
      } else {
        toast({
          title: 'Failed to Send',
          description: res.message || 'Failed to record message.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Send Error',
        description: err.message || 'Failed to post message.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'Critical':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Critical</Badge>;
      case 'High':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">High</Badge>;
      case 'Question':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Question</Badge>;
      default:
        return <Badge variant="outline" className="bg-stone-50 text-stone-700 border-stone-200">Normal</Badge>;
    }
  };

  if (!ticket) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0 flex flex-col h-full bg-stone-50/50">
        {/* Header */}
        <div className="p-6 border-b border-stone-200 bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-2">
              <Headphones className="w-5 h-5 text-stone-700" />
              <span className="font-mono text-xs font-semibold text-stone-500">
                {ticket.id.substring(0, 8).toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-stone-100">
                {ticket.category}
              </Badge>
              {getSeverityBadge(severity)}
            </div>
          </div>
          <SheetTitle className="text-xl font-serif text-stone-900 leading-snug">
            {ticket.subject}
          </SheetTitle>
          <SheetDescription className="text-xs text-stone-500 mt-1 flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5" />
            {ticket.organizations?.name || 'Organization Level'}
            <span>·</span>
            <Clock className="w-3.5 h-3.5" />
            Opened {formatDistanceToNow(new Date(ticket.created_at || Date.now()), { addSuffix: true })}
          </SheetDescription>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Quick Actions & Triage Controls */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-white rounded-xl border border-stone-200 shadow-xs">
            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5 block">
                Status
              </Label>
              <Select value={status} onValueChange={handleStatusChange} disabled={isUpdating}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEW">New</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="WAITING_ON_CUSTOMER">Waiting on Client</SelectItem>
                  <SelectItem value="WAITING_ON_PROVIDER">Waiting on Provider</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5 block">
                Priority
              </Label>
              <Select value={priority} onValueChange={handlePriorityChange} disabled={isUpdating}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5 block">
                Severity
              </Label>
              <Select value={severity} onValueChange={handleSeverityChange} disabled={isUpdating}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Question">Question</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Ticket Description */}
          <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-xs">
            <h4 className="text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-stone-500" />
              Ticket Description
            </h4>
            <p className="text-sm text-stone-800 whitespace-pre-wrap leading-relaxed">
              {ticket.description}
            </p>
          </div>

          {/* Conversation History / Message Thread */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-stone-700 uppercase tracking-wider flex items-center justify-between">
              <span>Activity & Thread</span>
              <span className="text-[11px] font-normal text-stone-400">
                {messages.length} message{messages.length === 1 ? '' : 's'}
              </span>
            </h4>

            {loadingMessages ? (
              <div className="p-8 text-center text-xs text-stone-400 bg-white rounded-xl border border-stone-200">
                Loading conversation thread...
              </div>
            ) : messages.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-400 bg-white rounded-xl border border-dashed border-stone-200">
                No replies or notes recorded yet. Post the first response below.
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isNote = msg.is_internal_note;
                  return (
                    <div
                      key={msg.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isNote
                          ? 'bg-amber-50/70 border-amber-200/80 text-amber-950'
                          : 'bg-white border-stone-200 text-stone-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {isNote ? (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
                              <Lock className="w-3 h-3" />
                              Internal Staff Note
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px] font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                              <User className="w-3 h-3 text-stone-500" />
                              Response
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-stone-400">
                          {msg.created_at ? formatDistanceToNow(new Date(msg.created_at), { addSuffix: true }) : 'just now'}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reply / Internal Note Form */}
          <form onSubmit={handleSendMessage} className="p-4 bg-white rounded-xl border border-stone-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="reply-text" className="text-xs font-semibold text-stone-800">
                {isInternalNote ? 'Add Internal Staff Note' : 'Send Customer Reply'}
              </Label>
              <div className="flex items-center gap-2">
                <Switch
                  id="internal-toggle"
                  checked={isInternalNote}
                  onCheckedChange={setIsInternalNote}
                />
                <Label htmlFor="internal-toggle" className="text-xs text-stone-600 cursor-pointer flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-600" /> Internal Note
                </Label>
              </div>
            </div>

            <Textarea
              id="reply-text"
              placeholder={
                isInternalNote
                  ? 'Write an internal note for platform operators (hidden from tenant)...'
                  : 'Type your message to reply to the client...'
              }
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={3}
              className="text-xs resize-none"
            />

            <div className="flex justify-between items-center pt-1">
              <p className="text-[11px] text-stone-400">
                {isInternalNote
                  ? '🔒 Note is stored privately in support_messages.'
                  : '✉️ Reply will be recorded in the tenant support center.'}
              </p>
              <Button
                type="submit"
                size="sm"
                className={`text-xs h-8 ${isInternalNote ? 'bg-amber-700 hover:bg-amber-800 text-white' : 'bg-stone-900 text-white'}`}
                disabled={!replyText.trim() || isSending}
              >
                <Send className="w-3 h-3 mr-1.5" />
                {isSending ? 'Saving...' : isInternalNote ? 'Save Note' : 'Send Reply'}
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
