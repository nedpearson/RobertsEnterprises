import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@vowos/design-system';
import { Button } from '@vowos/design-system';
import { Badge } from '@vowos/design-system';
import { ScrollArea } from '@vowos/design-system';
import { toast } from 'sonner';
import { AlertTriangle, Clock, MapPin, User, Calendar, CheckCircle2, Sparkles, Lock, ChevronDown, ChevronUp, Star } from 'lucide-react';
import { getAIRecommendations } from '@/lib/services/aiSchedulingEngine';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

interface AssignmentReviewSheetProps {
  request: any | null;
  staff: any[];
  onClose: () => void;
  onConfirm: (assignmentDetails: any) => Promise<void>;
  context: any;
}

type Phase = 'ai_pick' | 'manual_pick' | 'review';

export function AssignmentReviewSheet({ request, staff, onClose, onConfirm, context }: AssignmentReviewSheetProps) {
  const [phase, setPhase] = useState<Phase>('ai_pick');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [overrideReason, setOverrideReason] = useState('');
  const [isOverriding, setIsOverriding] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [manualDate, setManualDate] = useState('');
  const [manualTime, setManualTime] = useState('10:00');
  const [manualStylistId, setManualStylistId] = useState('');
  const [selectedStylistId, setSelectedStylistId] = useState<string | null>(null);
  const [selectedStartAt, setSelectedStartAt] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (request) {
      setSelectedStylistId(request.proposedEmployeeId || null);
      setSelectedStartAt(request.proposedStartAt || null);
      // If drag-and-drop pre-populated a stylist and time, go straight to review
      if (request.proposedEmployeeId && request.proposedStartAt) {
        setPhase('review');
      } else {
        setPhase('ai_pick');
      }
    }
  }, [request]);

  if (!request) return null;

  const requestedDate = request.preferred_date_1 || 'TBD';
  const requestedTime = request.preferred_window_1 || request.preferred_time_1 || 'Flexible';
  const customerName = request.customer?.name ||
    (request.customer?.first_name ? `${request.customer.first_name} ${request.customer.last_name || ''}`.trim() : null) ||
    request.customer_name || 'Guest';

  // Resolve location name
  const locationId = request.preferred_location_id || request.location_id;
  const locationName = request.location_name ||
    (locationId?.includes('ido') ? 'I Do Bridal Couture' :
     locationId?.includes('proper') ? 'Proper & Co' : 'Main Boutique');

  // Evaluate AI recommendations
  const evalDate = selectedStartAt || (requestedDate !== 'TBD' ? new Date(requestedDate).toISOString() : new Date().toISOString());
  const recommendations = getAIRecommendations(
    evalDate,
    selectedStartAt ? new Date(selectedStartAt).toISOString().split('T')[1].substring(0, 8) : null,
    locationId,
    90,
    context
  );

  // Separate clean recs from conflicted ones
  const cleanRecs = recommendations.filter(r => r.blockingConflicts.length === 0);
  const conflictedRecs = recommendations.filter(r => r.blockingConflicts.length > 0);
  const topRec = cleanRecs[0] || recommendations[0];
  const alternatives = cleanRecs.slice(1, 4);
  const hasCleanRecs = cleanRecs.length > 0;

  const proposedStylist = staff.find(s => s.id === selectedStylistId);
  const proposedStart = selectedStartAt ? new Date(selectedStartAt) : null;
  const thisStylistRec = recommendations.find(r => r.stylistId === selectedStylistId);
  const conflicts = thisStylistRec?.blockingConflicts || [];
  const warnings = thisStylistRec?.warnings || [];

  const handleAcceptBest = () => {
    if (!topRec) return;
    setSelectedStylistId(topRec.stylistId);
    setSelectedStartAt(topRec.recommendedTime || evalDate);
    setPhase('review');
  };

  const handleSelectRec = (rec: any) => {
    setSelectedStylistId(rec.stylistId);
    setSelectedStartAt(rec.recommendedTime || evalDate);
    setPhase('review');
  };

  const handleManualConfirm = () => {
    if (!manualStylistId || !manualDate) {
      toast.error('Please select a stylist and date.');
      return;
    }
    const startISO = `${manualDate}T${manualTime}:00`;
    setSelectedStylistId(manualStylistId);
    setSelectedStartAt(startISO);
    setPhase('review');
  };

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
        status,
        overrideReason: isOverriding ? overrideReason : undefined,
      });

      // Lock assignment if requested
      if (isLocking && selectedStylistId) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from('appointment_locks').upsert({
            business_id: request.business_id,
            appointment_id: request.id,
            locked_by: user?.id,
            lock_reason: 'Manually locked by manager at assignment',
          }, { onConflict: 'appointment_id' });
        } catch { /* non-blocking */ }
      }

      toast.success(`Appointment ${status === 'confirmed' ? 'confirmed' : 'saved as pending'}!`);
      queryClient.invalidateQueries({ queryKey: ['appointment_requests'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      onClose();
    } catch (err: any) {
      toast.error('Failed to save assignment: ' + (err.message || 'Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSave = !isSubmitting && (conflicts.length === 0 || (isOverriding && overrideReason.trim().length > 5));

  const getConfidenceBadge = (confidence: string) => {
    if (confidence === 'High') return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">High Confidence</Badge>;
    if (confidence === 'Medium') return <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">Medium</Badge>;
    return <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px]">Low</Badge>;
  };

  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {phase === 'ai_pick' && <><Sparkles className="h-4 w-4 text-emerald-500" /> AI Assignment Engine</>}
            {phase === 'manual_pick' && <><User className="h-4 w-4 text-stone-500" /> Manual Assignment</>}
            {phase === 'review' && <><CheckCircle2 className="h-4 w-4 text-brand-primary" /> Review & Confirm</>}
          </DialogTitle>
          <DialogDescription>
            {phase === 'ai_pick' && `Assigning stylist for ${customerName}`}
            {phase === 'manual_pick' && `Choose any stylist and time for ${customerName}`}
            {phase === 'review' && `Confirm the appointment details for ${customerName}`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-4 py-2 px-1">

            {/* Requested Info Banner — always visible */}
            <div className="flex flex-col sm:flex-row gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
              <div className="flex-1">
                <p className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider mb-1">Requested</p>
                <div className="flex items-center gap-1.5 text-sm font-medium text-stone-800">
                  <Clock className="h-3.5 w-3.5 text-stone-400" />
                  {requestedDate === 'TBD' ? 'Flexible Date' : new Date(requestedDate).toLocaleDateString()} @ {requestedTime}
                </div>
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider mb-1">Boutique</p>
                <div className="flex items-center gap-1.5 text-sm font-medium text-stone-800">
                  <MapPin className="h-3.5 w-3.5 text-stone-400" />
                  {locationName}
                </div>
              </div>
            </div>

            {/* ─── PHASE: AI PICK ─── */}
            {phase === 'ai_pick' && (
              <div className="space-y-3">
                {!hasCleanRecs && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    <div className="flex items-center gap-1.5 font-semibold mb-1"><AlertTriangle className="h-3.5 w-3.5" /> No Fully Available Stylists</div>
                    <p>All stylists have scheduling conflicts for this date. You can still select a stylist below (with manager override) or choose manually.</p>
                  </div>
                )}

                {/* Best pick */}
                {topRec && (
                  <div className={`p-4 rounded-xl border-2 ${topRec.blockingConflicts.length === 0 ? 'border-emerald-400 bg-emerald-50/50' : 'border-amber-300 bg-amber-50/30'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-emerald-600 fill-emerald-600" />
                        <span className="font-bold text-stone-900 text-sm">{topRec.stylistName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {getConfidenceBadge(topRec.confidence)}
                        <span className="text-xs font-bold text-stone-600">{topRec.score}pts</span>
                      </div>
                    </div>
                    {topRec.recommendedTime && (
                      <p className="text-xs text-stone-600 mb-2 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(topRec.recommendedTime).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                    <div className="space-y-0.5 mb-3">
                      {topRec.reasons.map((r: string, i: number) => (
                        <p key={i} className="text-xs text-stone-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> {r}
                        </p>
                      ))}
                      {topRec.warnings?.map((w: string, i: number) => (
                        <p key={i} className="text-xs text-amber-700 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" /> {w}
                        </p>
                      ))}
                      {topRec.blockingConflicts.map((c: string, i: number) => (
                        <p key={i} className="text-xs text-red-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" /> {c}
                        </p>
                      ))}
                    </div>
                    {topRec.blockingConflicts.length === 0 ? (
                      <Button
                        onClick={handleAcceptBest}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        size="sm"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1.5" /> Accept — Assign {topRec.stylistName}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleSelectRec(topRec)}
                        variant="outline"
                        className="w-full border-amber-300 text-amber-800 hover:bg-amber-50 font-semibold"
                        size="sm"
                      >
                        Select With Override
                      </Button>
                    )}
                  </div>
                )}

                {/* Alternatives */}
                {alternatives.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowAlternatives(v => !v)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-800 w-full text-left py-1"
                    >
                      {showAlternatives ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {alternatives.length} Alternative{alternatives.length > 1 ? 's' : ''}
                    </button>
                    {showAlternatives && (
                      <div className="flex flex-col gap-2 mt-1">
                        {alternatives.map(rec => (
                          <button
                            key={rec.stylistId}
                            onClick={() => handleSelectRec(rec)}
                            className="flex items-center justify-between text-left p-3 rounded-xl border border-stone-200 bg-white hover:border-brand-primary hover:shadow-sm transition-all"
                          >
                            <div>
                              <span className="font-semibold text-stone-900 text-sm">{rec.stylistName}</span>
                              {rec.recommendedTime && (
                                <p className="text-xs text-stone-500">{new Date(rec.recommendedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {getConfidenceBadge(rec.confidence)}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Conflicted stylists (collapsed) */}
                {conflictedRecs.length > 0 && (
                  <div>
                    <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider mb-1">Unavailable Stylists</p>
                    <div className="flex flex-col gap-1">
                      {conflictedRecs.map(rec => (
                        <button
                          key={rec.stylistId}
                          onClick={() => handleSelectRec(rec)}
                          className="flex items-center justify-between text-left px-3 py-2 rounded-lg border border-stone-100 bg-stone-50/50 hover:border-amber-300 hover:bg-amber-50/30 transition-all opacity-60 hover:opacity-100"
                        >
                          <span className="text-xs font-medium text-stone-600">{rec.stylistName}</span>
                          <span className="text-[10px] text-red-600 font-medium">{rec.blockingConflicts[0]?.substring(0, 40)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-stone-100">
                  <button
                    onClick={() => setPhase('manual_pick')}
                    className="text-xs text-stone-500 hover:text-brand-primary font-medium underline underline-offset-2 w-full text-center py-1"
                  >
                    Choose Stylist & Time Manually
                  </button>
                </div>
              </div>
            )}

            {/* ─── PHASE: MANUAL PICK ─── */}
            {phase === 'manual_pick' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-1.5">Stylist</label>
                  <select
                    value={manualStylistId}
                    onChange={e => setManualStylistId(e.target.value)}
                    className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                  >
                    <option value="">Select stylist...</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.first_name} {s.last_name} ({s.role || 'Stylist'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-1.5">Date</label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={e => setManualDate(e.target.value)}
                    className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-1.5">Time</label>
                  <input
                    type="time"
                    value={manualTime}
                    onChange={e => setManualTime(e.target.value)}
                    className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                  />
                </div>
                <Button
                  onClick={handleManualConfirm}
                  className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold"
                  disabled={!manualStylistId || !manualDate}
                >
                  Continue to Review
                </Button>
              </div>
            )}

            {/* ─── PHASE: REVIEW ─── */}
            {phase === 'review' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-stone-50 rounded-lg border border-stone-100">
                    <p className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider mb-1">Stylist</p>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
                      <User className="h-4 w-4 text-stone-400" />
                      {proposedStylist ? `${proposedStylist.first_name || ''} ${proposedStylist.last_name || ''}`.trim() : 'Unknown'}
                    </div>
                  </div>
                  <div className="p-3 bg-stone-50 rounded-lg border border-stone-100">
                    <p className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider mb-1">Boutique</p>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-stone-900">
                      <MapPin className="h-4 w-4 text-stone-400" />
                      {locationName}
                    </div>
                  </div>
                  {proposedStart && (
                    <div className="col-span-2 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                      <p className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider mb-1">Appointment Time</p>
                      <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-800">
                        <Calendar className="h-4 w-4" />
                        {proposedStart.toLocaleString([], { weekday: 'short', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <p className="text-xs text-emerald-600 mt-0.5">Duration: 90 minutes</p>
                    </div>
                  )}
                </div>

                {/* Conflicts */}
                {conflicts.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-red-800 font-semibold text-sm mb-1">
                        <AlertTriangle className="h-4 w-4" /> Blocking Conflicts
                      </div>
                      <ul className="text-xs text-red-700 list-disc pl-5 space-y-0.5">
                        {conflicts.map((c: string, i: number) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>
                    <div className="pt-2 border-t border-red-200/60">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isOverriding}
                          onChange={e => setIsOverriding(e.target.checked)}
                          className="mt-0.5 rounded border-red-300 text-red-600"
                        />
                        <span className="text-sm font-semibold text-red-800">Manager Override</span>
                      </label>
                      {isOverriding && (
                        <textarea
                          value={overrideReason}
                          onChange={e => setOverrideReason(e.target.value)}
                          placeholder="Required: Explain why this override is necessary..."
                          className="mt-2 w-full text-xs p-2 rounded border border-red-200 bg-white resize-none"
                          rows={2}
                        />
                      )}
                    </div>
                  </div>
                )}

                {conflicts.length === 0 && warnings.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-1.5 text-amber-800 font-semibold text-sm mb-1">
                      <AlertTriangle className="h-4 w-4" /> Scheduling Warnings
                    </div>
                    <ul className="text-xs text-amber-700 list-disc pl-5">
                      {warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                )}

                {conflicts.length === 0 && warnings.length === 0 && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4" /> Perfect match — no conflicts found.
                  </div>
                )}

                {/* Notify + Lock */}
                <div className="space-y-2 pt-2 border-t border-stone-100">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifyCustomer}
                      onChange={e => setNotifyCustomer(e.target.checked)}
                      className="rounded border-stone-300 text-brand-primary"
                    />
                    <span className="text-sm text-stone-700">Send email & SMS confirmation to customer</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isLocking}
                      onChange={e => setIsLocking(e.target.checked)}
                      className="rounded border-stone-300 text-brand-primary"
                    />
                    <span className="text-sm text-stone-700 flex items-center gap-1">
                      <Lock className="h-3.5 w-3.5 text-stone-400" /> Lock assignment (prevent AI reassignment)
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-2 shrink-0 border-t pt-3">
          <Button
            variant="outline"
            onClick={() => {
              if (phase === 'review') {
                setSelectedStylistId(null);
                setSelectedStartAt(null);
                setPhase('ai_pick');
              } else if (phase === 'manual_pick') {
                setPhase('ai_pick');
              } else {
                onClose();
              }
            }}
            disabled={isSubmitting}
          >
            {phase === 'ai_pick' ? 'Cancel' : 'Back'}
          </Button>
          {phase === 'review' && (
            <>
              <Button
                variant="outline"
                onClick={() => handleSave('pending')}
                disabled={!canSave}
                className="border-amber-300 text-amber-800 hover:bg-amber-50"
              >
                Save as Pending
              </Button>
              <Button
                onClick={() => handleSave('confirmed')}
                disabled={!canSave}
                className="bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold"
              >
                {isSubmitting ? 'Confirming...' : 'Confirm & Notify'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
