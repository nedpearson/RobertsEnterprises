import { useState } from 'react';
import { 
  X, User, Calendar, MapPin, Clock, MessageSquare, 
  CreditCard, CheckCircle, ChevronRight, FileText,
  AlertTriangle
} from 'lucide-react';
import { Badge } from '@vowos/design-system';

interface MobileAppointment360Props {
  isOpen: boolean;
  onClose: () => void;
  // Passing active appointment context
  appointment?: any;
}

import { DEFAULT_SCHEDULING_SETTINGS } from '@/lib/settings';

export default function MobileAppointment360({ isOpen, onClose, appointment }: MobileAppointment360Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'intake' | 'tryon' | 'comms' | 'files'>('overview');

  if (!isOpen) return null;

  const customerName = appointment?.customer?.name || 'Unknown Customer';
  const apptDate = appointment?.start_at ? new Date(appointment.start_at).toLocaleDateString() : 'TBD';
  const apptTime = appointment?.start_at ? new Date(appointment.start_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'TBD';
  const duration = appointment?.duration || DEFAULT_SCHEDULING_SETTINGS.apptTypeConfigs[0].durationMinutes;
  const apptType = appointment?.type || 'Consultation';
  const stylist = appointment?.employee?.name || 'Unassigned';
  const room = appointment?.room?.name || 'Any';

  return (
    <div className="fixed inset-0 z-50 bg-[#faf8f5] flex flex-col animate-in slide-in-from-bottom-full duration-300">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-stone-200 sticky top-0 z-10 shadow-sm flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-stone-900">{customerName}</h2>
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">{appointment?.status || 'Active'}</Badge>
          </div>
          <p className="text-xs text-stone-500 flex items-center gap-1.5 mt-1.5">
            <Calendar className="h-3.5 w-3.5" /> {apptDate} • {apptTime}
          </p>
        </div>
        <button 
          onClick={onClose}
          className="p-2 rounded-full hover:bg-stone-100 text-stone-500 -mr-2"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 px-4 bg-white border-b border-stone-200 sticky top-[73px] z-10 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveTab('overview')}
          className={`whitespace-nowrap pb-3 pt-3 text-sm font-semibold transition-colors relative ${
            activeTab === 'overview' ? 'text-stone-900' : 'text-stone-400'
          }`}
        >
          Overview
          {activeTab === 'overview' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-900 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('intake')}
          className={`whitespace-nowrap pb-3 pt-3 text-sm font-semibold transition-colors relative ${
            activeTab === 'intake' ? 'text-stone-900' : 'text-stone-400'
          }`}
        >
          Intake
          {activeTab === 'intake' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-900 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('tryon')}
          className={`whitespace-nowrap pb-3 pt-3 text-sm font-semibold transition-colors relative ${
            activeTab === 'tryon' ? 'text-stone-900' : 'text-stone-400'
          }`}
        >
          Try-On
          {activeTab === 'tryon' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-900 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('comms')}
          className={`whitespace-nowrap pb-3 pt-3 text-sm font-semibold transition-colors relative ${
            activeTab === 'comms' ? 'text-stone-900' : 'text-stone-400'
          }`}
        >
          Comms
          {activeTab === 'comms' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-900 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`whitespace-nowrap pb-3 pt-3 text-sm font-semibold transition-colors relative ${
            activeTab === 'files' ? 'text-stone-900' : 'text-stone-400'
          }`}
        >
          Files
          {activeTab === 'files' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-900 rounded-t-full" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 pb-24">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 bg-stone-900 text-white py-2.5 rounded-xl text-sm font-semibold shadow-sm">
                <CheckCircle className="h-4 w-4" /> Start Appt
              </button>
              <button className="flex items-center justify-center gap-2 bg-white text-stone-700 border border-stone-200 py-2.5 rounded-xl text-sm font-semibold shadow-sm">
                <CreditCard className="h-4 w-4" /> Take Payment
              </button>
            </div>

            {/* Core Details */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">Appointment Details</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-stone-500">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Duration</span>
                  </div>
                  <span className="text-sm font-bold text-stone-900">{duration} mins</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-stone-500">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">Type</span>
                  </div>
                  <span className="text-sm font-bold text-stone-900">{apptType}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-stone-500">
                    <User className="h-4 w-4" />
                    <span className="text-sm">Stylist</span>
                  </div>
                  <button className="flex items-center gap-1 text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                    {stylist} <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-stone-500">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">Room</span>
                  </div>
                  <span className="text-sm font-bold text-stone-900">{room}</span>
                </div>
              </div>
            </div>

            {/* Next Actions & Tasks */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Tasks & Actions</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1 w-4 h-4 rounded border-stone-300 text-stone-900" />
                  <div>
                    <p className="text-sm font-bold text-stone-900">Confirm gown measurements</p>
                    <p className="text-xs text-stone-500">Due today</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1 w-4 h-4 rounded border-stone-300 text-stone-900" />
                  <div>
                    <p className="text-sm font-bold text-stone-900">Prepare champagne toast</p>
                    <p className="text-xs text-stone-500">Upon arrival</p>
                  </div>
                </div>
              </div>
              <button className="mt-4 text-xs font-bold text-stone-500 hover:text-stone-900">
                + Add Task
              </button>
            </div>
            
            {/* Payment Status */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Payment Status</h3>
              <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-stone-900">Consultation Fee</p>
                  <p className="text-xs text-stone-500 mt-0.5">Paid on Aug 1</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 border-none shadow-none text-[10px]">PAID $50</Badge>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'intake' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Bride Profile</h3>
              <div className="space-y-3 text-sm">
                <p><span className="font-bold text-stone-900">Style:</span> Modern Classic, Romantic</p>
                <p><span className="font-bold text-stone-900">Budget:</span> $3,500 - $5,000</p>
                <p><span className="font-bold text-stone-900">Wedding Date:</span> June 12, 2027</p>
                <p><span className="font-bold text-stone-900">Venue:</span> The Estate at Sunset</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Notes</h3>
              <p className="text-sm text-stone-600">Bride is bringing her mother and two sisters. She specifically requested to try on Monique Lhuillier styles.</p>
            </div>
          </div>
        )}

        {activeTab === 'tryon' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-stone-900">Gown Selection</p>
                <p className="text-xs text-stone-500 mt-0.5">3 gowns selected for try-on</p>
              </div>
              <button className="text-xs font-bold bg-stone-900 text-white px-3 py-1.5 rounded-lg shadow-sm">
                Add Gown
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 flex gap-3">
                <div className="w-16 h-20 bg-stone-100 rounded-xl shrink-0 border border-stone-200"></div>
                <div>
                  <p className="font-bold text-stone-900 text-sm">Monique Lhuillier - "Evelyn"</p>
                  <p className="text-xs text-stone-500 mt-0.5">Size 6 • Ivory</p>
                  <div className="mt-2 flex gap-2">
                    <Badge className="bg-emerald-100 text-emerald-700 border-none text-[10px] shadow-none">Liked</Badge>
                  </div>
                </div>
              </div>
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-stone-100 flex gap-3">
                <div className="w-16 h-20 bg-stone-100 rounded-xl shrink-0 border border-stone-200"></div>
                <div>
                  <p className="font-bold text-stone-900 text-sm">Vera Wang - "Delphine"</p>
                  <p className="text-xs text-stone-500 mt-0.5">Size 8 • White</p>
                  <div className="mt-2 flex gap-2">
                    <Badge className="bg-brand-soft text-brand-primary-hover border-none text-[10px] shadow-none">Discarded</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'comms' && (
          <div className="flex flex-col h-full min-h-[400px]">
            <div className="flex-1 space-y-4">
              <div className="flex items-end gap-2 flex-row-reverse">
                <div className="bg-stone-900 text-white p-3 rounded-2xl rounded-tr-sm text-sm max-w-[80%]">
                  Hi Emily! We are so excited for your bridal consultation tomorrow at 9:00 AM. Let us know if you have any questions!
                </div>
              </div>
              <div className="flex items-end gap-2">
                <div className="bg-white border border-stone-200 text-stone-900 p-3 rounded-2xl rounded-tl-sm text-sm max-w-[80%] shadow-sm">
                  Thank you! I'll be bringing my mom and sister. See you tomorrow!
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-2 sticky bottom-0 bg-[#faf8f5] pt-2">
              <input 
                type="text" 
                placeholder="Message Emily..." 
                className="flex-1 rounded-full border border-stone-200 px-4 py-2 text-sm focus:outline-none focus:border-stone-400"
              />
              <button className="w-10 h-10 rounded-full bg-stone-900 text-white flex items-center justify-center flex-shrink-0">
                <MessageSquare className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'files' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-2xl border border-stone-100 shadow-sm flex flex-col items-center justify-center aspect-square">
                <FileText className="h-8 w-8 text-stone-300 mb-2" />
                <span className="text-xs font-bold text-stone-700 text-center">Inspiration.pdf</span>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-stone-100 shadow-sm flex flex-col items-center justify-center aspect-square border-dashed">
                <span className="text-xs font-bold text-stone-400">+ Upload File</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


