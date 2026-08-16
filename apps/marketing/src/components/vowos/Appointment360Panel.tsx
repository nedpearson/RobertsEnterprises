import React, { useState } from 'react';
import { X, User, Calendar, MessageSquare, Paperclip, CheckSquare, CreditCard, Clock, MapPin } from 'lucide-react';
import { Button } from '@vowos/design-system';
import { Badge } from '@vowos/design-system';
import { ScrollArea } from '@vowos/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@vowos/design-system';
import { format } from 'date-fns';

import UnifiedCommunicationTimeline from './UnifiedCommunicationTimeline';
import UnifiedCommunicationComposer from './UnifiedCommunicationComposer';
import AppointmentFiles from './AppointmentFiles';
import type { Appointment } from '@/lib/appointment360';
import { Communication, sendCommunication } from '@/lib/communications';
import { FileRecord, uploadFile } from '@/lib/files';

interface Appointment360PanelProps {
  appointment: Appointment | null;
  onClose: () => void;
  onUpdate?: (id: string, updates: Partial<Appointment>) => void;
}

export default function Appointment360Panel({ appointment, onClose, onUpdate }: Appointment360PanelProps) {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    duration: 90,
    type: appointment?.type || 'Bridal Consultation',
    employee: appointment?.employee?.name || '',
    room: appointment?.room?.name || '',
  });

  if (!appointment) return null;

  const handleSendComm = async (channel: 'sms' | 'email' | 'phone', content: string) => {
    setIsSending(true);
    try {
      if (appointment.customer_id) {
        const comm = await sendCommunication({
          direction: 'outbound',
          channel,
          body: content,
          status: 'sent',
          recipient_identifier: appointment.customer_id,
        });
        setCommunications(prev => [...prev, comm as Communication]);
      }
    } catch (err) {
      console.error('Failed to send communication', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const metadata = {
        appointment_id: appointment.id,
        customer_id: appointment.customer_id,
        category: 'general',
        privacy_level: 'public',
        retention_status: 'active',
        business_id: appointment.business_id || 'default'
      };
      const uploaded = await uploadFile(file, metadata);
      setFiles(prev => [...prev, uploaded as FileRecord]);
    } catch (err) {
      console.error('Failed to upload file', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(appointment.id, {
        type: editData.type,
        employee: { name: editData.employee },
        room: { name: editData.room },
      });
    }
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col h-full bg-white border-l shadow-2xl w-full max-w-md absolute right-0 top-0 bottom-0 z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-stone-50">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-semibold text-stone-900">
              {appointment.customer?.name || 'Unknown Customer'}
            </h2>
            <Badge variant="outline" className="bg-status-warning/10 text-status-warning border-status-warning/20">
              {appointment.status}
            </Badge>
          </div>
          <p className="text-sm text-stone-500 mt-1 flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            {format(new Date(appointment.start_at), 'MMM d, yyyy')} • {format(new Date(appointment.start_at), 'h:mm a')}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
          <X className="w-5 h-5 text-stone-500" />
        </Button>
      </div>

      {/* Quick Info Bar */}
      <div className="grid grid-cols-2 gap-4 p-4 border-b bg-white text-sm">
        <div>
          <p className="text-stone-500 text-xs mb-1 uppercase tracking-wider">Assigned To</p>
          <div className="flex items-center font-medium">
            <User className="w-4 h-4 mr-1.5 text-stone-400" />
            {appointment.employee?.name || 'Unassigned'}
          </div>
        </div>
        <div>
          <p className="text-stone-500 text-xs mb-1 uppercase tracking-wider">Room</p>
          <div className="flex items-center font-medium">
            <MapPin className="w-4 h-4 mr-1.5 text-stone-400" />
            {appointment.room?.name || 'Any'}
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full justify-start border-b rounded-none px-4 h-12 bg-transparent space-x-6 overflow-x-auto">
          <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-brand-primary rounded-none px-0 h-full bg-transparent">Overview</TabsTrigger>
          <TabsTrigger value="comms" className="data-[state=active]:border-b-2 data-[state=active]:border-brand-primary rounded-none px-0 h-full bg-transparent">Comms</TabsTrigger>
          <TabsTrigger value="files" className="data-[state=active]:border-b-2 data-[state=active]:border-brand-primary rounded-none px-0 h-full bg-transparent">Files</TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:border-b-2 data-[state=active]:border-brand-primary rounded-none px-0 h-full bg-transparent">Tasks</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 bg-stone-50/30">
          <TabsContent value="overview" className="p-4 m-0 space-y-6 focus-visible:ring-0">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="w-full justify-start text-stone-600 bg-white">
                <CheckSquare className="w-4 h-4 mr-2" />
                Check In
              </Button>
              <Button variant="outline" className="w-full justify-start text-stone-600 bg-white">
                <CreditCard className="w-4 h-4 mr-2" />
                Take Payment
              </Button>
            </div>
            
            <div className="bg-white rounded-lg border p-4 space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-medium text-stone-900">Appointment Details</h3>
                <Button variant="ghost" size="sm" onClick={() => isEditing ? handleSave() : setIsEditing(true)}>
                  {isEditing ? 'Save' : 'Edit'}
                </Button>
              </div>
              <div className="space-y-3">
                {isEditing ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-stone-500 text-sm">Duration (mins)</span>
                      <input type="number" className="border rounded px-2 py-1 text-sm w-24" value={editData.duration} onChange={e => setEditData({...editData, duration: Number(e.target.value)})} />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-stone-500 text-sm">Type</span>
                      <input type="text" className="border rounded px-2 py-1 text-sm w-40" value={editData.type} onChange={e => setEditData({...editData, type: e.target.value})} />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-stone-500 text-sm">Stylist</span>
                      <select 
                        className="border rounded px-2 py-1 text-sm w-40 bg-white" 
                        value={editData.employee} 
                        onChange={e => setEditData({...editData, employee: e.target.value})}
                      >
                        <option value="">Unassigned</option>
                        <option value="Ramsey Roberts">Ramsey Roberts</option>
                        <option value="Stylist Mia">Stylist Mia</option>
                        <option value="Lauren">Lauren</option>
                        <option value="Ashley">Ashley</option>
                      </select>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-stone-500 text-sm">Room</span>
                      <input type="text" className="border rounded px-2 py-1 text-sm w-40" value={editData.room} onChange={e => setEditData({...editData, room: e.target.value})} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-stone-500 text-sm">Duration</span>
                      <span className="text-stone-900 text-sm font-medium">90 mins</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500 text-sm">Type</span>
                      <span className="text-stone-900 text-sm font-medium">{appointment.type || 'Bridal Consultation'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500 text-sm">Stylist</span>
                      <span className="text-stone-900 text-sm font-medium">{appointment.employee?.name || 'Unassigned'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500 text-sm">Room</span>
                      <span className="text-stone-900 text-sm font-medium">{appointment.room?.name || 'Any'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="comms" className="p-4 m-0 space-y-6 focus-visible:ring-0">
            <UnifiedCommunicationComposer onSend={handleSendComm} isSending={isSending} />
            <div className="pt-2">
              <h3 className="text-sm font-medium text-stone-900 mb-4 px-1">Communication History</h3>
              <UnifiedCommunicationTimeline communications={communications} />
            </div>
          </TabsContent>

          <TabsContent value="files" className="p-4 m-0 space-y-6 focus-visible:ring-0">
            <AppointmentFiles files={files} onUpload={handleFileUpload} isUploading={isUploading} />
          </TabsContent>
          
          <TabsContent value="tasks" className="p-4 m-0 focus-visible:ring-0">
            <div className="text-center py-8 text-stone-500">
              <CheckSquare className="w-8 h-8 mx-auto mb-3 opacity-20" />
              <p>No tasks associated with this appointment.</p>
              <Button variant="outline" className="mt-4" size="sm">
                Add Task
              </Button>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
