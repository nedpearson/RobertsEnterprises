import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@vowos/design-system';
import { Button } from '@vowos/design-system';
import { toast } from 'sonner';
import { AlertTriangle, Clock, MapPin, User, Calendar, CheckCircle2, Sparkles, ChevronRight } from 'lucide-react';
import { getAIRecommendations } from '@/lib/services/aiSchedulingEngine';

interface AssignmentReviewSheetProps {
  request: any | null;
  staff: any[];
  onClose: () => void;
  onConfirm: (assignmentDetails: any) => Promise<void>;
  context: any; 
}

export function AssignmentReviewSheet({ request, staff, onClose, onConfirm, context }: AssignmentReviewSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [overrideReason, setOverrideReason] = useState('');
  const [isOverriding, setIsOverriding] = useState(false);
  
  // If drag-and-drop was used, these are pre-populated. Otherwise, we start null and let user pick.
  const [selectedStylistId, setSelectedStylistId] = useState<string | null>(null);
  const [selectedStartAt, setSelectedStartAt] = useState<string | null>(null);

  useEffect(() => {
    if (request) {
      setSelectedStylistId(request.proposedEmployeeId || null);
      setSelectedStartAt(request.proposedStartAt || null);
    }
  }, [request]);

  if (!request) return null;

  const requestedDate = request.preferred_date_1 || 'TBD';
  const requestedTime = request.preferred_time_1 || 'Flexible';
  const customerName = request.customer?.name || request.customer_name || 'Guest';

  // AI evaluation based on requested date (if we haven't selected a time yet, we evaluate general availability)
  const evalDate = selectedStartAt || (requestedDate !== 'TBD' ? new Date(requestedDate).toISOString() : new Date().toISOString());
  
  const recommendations = getAIRecommendations(
    evalDate,
    selectedStartAt ? new Date(selectedStartAt).toISOString().split('T')[1].substring(0,8) : null,
    request.location_id,
    90,
    context
  );

  const isSelectionPhase = !selectedStylistId || !selectedStartAt;
  const proposedStylist = staff.find(s => s.id === selectedStylistId);
  const proposedStart = selectedStartAt ? new Date(selectedStartAt) : null;
  const thisStylistRec = recommendations.find(r => r.stylistId === selectedStylistId);
  const conflicts = thisStylistRec?.blockingConflicts || [];
  const warnings = thisStylistRec?.warnings || [];

  const handleSave = async (status: string) => {
    if (!selectedStylistId || !selectedStartAt) return;
    
    setIsSubmitting(true);
    try {
      await onConfirm({
        requestId: request.id,
        employeeId: selectedStylistId,
        startAt: selectedStartAt,
        endAt: new Date(new Date(selectedStartAt).getTime() + 90 * 60 * 1000).toISOString(),
        notify: notifyCustomer,
        status
      });
      toast.success('Assignment confirmed');
      onClose();
    } catch (err) {
      toast.error('Failed to save assignment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStylistSelect = (stylistId: string, timeISO: string) => {
    setSelectedStylistId(stylistId);
    setSelectedStartAt(timeISO);
  };

  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isSelectionPhase ? 'Assign Stylist' : 'Review Assignment'}</DialogTitle>
          <DialogDescription>
            {isSelectionPhase 
              ? `Select an available stylist for ${customerName}'s appointment.` 
              : `Confirm the scheduled time and stylist for ${customerName}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Requested Details (Always visible) */}
          <div className="flex flex-col sm:flex-row gap-4 p-4 bg-stone-50 rounded-xl border border-stone-200">
            <div className="flex-1">
              <p className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider mb-1">Requested</p>
              <div className="flex items-center gap-1.5 text-sm font-medium text-stone-900">
                <Clock className="h-4 w-4 text-stone-400" />
                {requestedDate} @ {requestedTime}
              </div>
            </div>
            {!isSelectionPhase && proposedStart && (
              <div className="flex-1">
                <p className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider mb-1">Scheduled</p>
                <div className="flex items-center gap-1.5 text-sm font-medium text-brand-primary">
                  <Calendar className="h-4 w-4 text-brand-primary/70" />
                  {proposedStart.toLocaleDateString()} @ {proposedStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            )}
          </div>

          {isSelectionPhase ? (
            <div className="space-y-3 mt-4">
              <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" /> AI Recommendations
              </h4>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={onClose}
                  className="flex flex-col text-left p-3 rounded-xl border border-stone-200 bg-stone-50 hover:bg-white hover:border-brand-primary transition-all cursor-pointer mb-2 items-center justify-center border-dashed"
                >
                  <span className="font-bold text-stone-600 text-sm">Choose Stylist Manually</span>
                </button>
                {recommendations.map(rec => (
                  <button 
                    key={rec.stylistId}
                    onClick={() => handleStylistSelect(rec.stylistId, rec.recommendedTime)}
                    
                    className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                      rec.blockingConflicts.length > 0 
                        ? 'opacity-50 border-stone-200 bg-stone-50 cursor-not-allowed' 
                        : 'border-stone-200 bg-white hover:border-brand-primary hover:shadow-md cursor-pointer'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full mb-1">
                      <span className="font-bold text-stone-900 text-sm flex items-center gap-2">
                        <User className="h-4 w-4 text-stone-400" />
                        {rec.stylistName}
                      </span>
                      {rec.blockingConflicts.length === 0 && (
                        <span className="text-xs font-semibold text-brand-primary bg-brand-soft px-2 py-0.5 rounded-full">
                          {new Date(rec.recommendedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    {rec.reasons.length > 0 && (
                      <p className="text-xs text-stone-500 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" /> {rec.reasons[0]}
                      </p>
                    )}
                    {rec.blockingConflicts.length > 0 && (
                      <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-3 w-3" /> {rec.blockingConflicts[0]}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Stylist & Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider mb-1">Stylist</p>
                  {proposedStylist ? (
                    <div className="flex items-center gap-1.5 text-sm font-medium text-stone-900">
                      <User className="h-4 w-4 text-stone-400" />
                      {proposedStylist.first_name || 'Unknown'} {proposedStylist.last_name || ''}
                    </div>
                  ) : (
                    <div className="text-sm font-medium text-amber-600">
                      Manual Assignment (Drag & Drop)
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider mb-1">Boutique</p>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-stone-900">
                    <MapPin className="h-4 w-4 text-stone-400" />
                    {request.location_id ? 'I Do Bridal Couture' : 'All Boutiques'}
                  </div>
                </div>
              </div>

              {/* AI Warnings / Conflicts */}
                            {conflicts.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-red-800 font-semibold text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      Blocking Conflicts Detected
                    </div>
                    <ul className="text-xs text-red-700 list-disc pl-5">
                      {conflicts.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                  <div className="pt-2 border-t border-red-200/50">
                    <div className="flex items-center gap-2 mb-2">
                      <input 
                        type="checkbox" 
                        id="override" 
                        checked={isOverriding}
                        onChange={(e) => setIsOverriding(e.target.checked)}
                        className="rounded border-red-300 text-red-600 focus:ring-red-600"
                      />
                      <label htmlFor="override" className="text-sm font-semibold text-red-800">
                        Manager Override
                      </label>
                    </div>
                    {isOverriding && (
                      <textarea 
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="Required: Reason for override..."
                        className="w-full text-xs p-2 rounded border border-red-200 bg-white"
                        rows={2}
                      />
                    )}
                  </div>
                </div>
              )}
              
              {conflicts.length === 0 && warnings.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-800 font-semibold text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    Scheduling Warnings
                  </div>
                  <ul className="text-xs text-amber-700 list-disc pl-5">
                    {warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}

              {conflicts.length === 0 && warnings.length === 0 && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Perfect match. No conflicts found.
                </div>
              )}

              <div className="flex items-center gap-2 mt-4">
                <input 
                  type="checkbox" 
                  id="notify" 
                  checked={notifyCustomer}
                  onChange={(e) => setNotifyCustomer(e.target.checked)}
                  className="rounded border-stone-300 text-brand-primary focus:ring-brand-primary"
                />
                <label htmlFor="notify" className="text-sm text-stone-700">
                  Send email & SMS confirmation to customer
                </label>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button variant="outline" onClick={isSelectionPhase ? onClose : () => { setSelectedStylistId(null); setSelectedStartAt(null); }} disabled={isSubmitting}>
            {isSelectionPhase ? 'Cancel' : 'Back'}
          </Button>
          {!isSelectionPhase && (
            <>
              <Button 
                variant="outline" 
                onClick={() => handleSave('pending')} 
                disabled={isSubmitting || (conflicts.length > 0 && (!isOverriding || !overrideReason.trim()))}
              >
                Save as Pending
              </Button>
              <Button 
                onClick={() => handleSave('confirmed')} 
                disabled={isSubmitting || (conflicts.length > 0 && (!isOverriding || !overrideReason.trim()))}
                className="bg-brand-primary hover:bg-brand-primary-hover text-white"
              >
                {isSubmitting ? 'Saving...' : 'Confirm Assignment'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
