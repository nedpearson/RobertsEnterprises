import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, AlertCircle, History } from 'lucide-react';
import { TimeEntry, TimeEntrySegment, TimeEntryCorrection } from '@/lib/services/workforceStore';
import { format } from 'date-fns';

interface Timecard360Props {
  entry: TimeEntry;
  segments: TimeEntrySegment[];
  corrections: TimeEntryCorrection[];
  onClose: () => void;
  onSubmitCorrection: (correction: Partial<TimeEntryCorrection>) => void;
  onApproveCorrection: (correctionId: string) => void;
  onVoid: (entryId: string) => void;
}

export function Timecard360({ entry, segments, corrections, onClose, onSubmitCorrection, onApproveCorrection, onVoid }: Timecard360Props) {
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [correctionType, setCorrectionType] = useState<TimeEntryCorrection['type']>('wrong_time');
  const [correctionReason, setCorrectionReason] = useState('');

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl border-t-4 border-t-blue-600">
      <CardHeader className="bg-gray-50 border-b flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-xl flex items-center gap-2">
            Timecard 360
            <Badge variant={entry.approved ? "default" : "secondary"}>{entry.approved ? 'Approved' : 'Unapproved'}</Badge>
            <Badge variant="outline">{entry.status.toUpperCase()}</Badge>
          </CardTitle>
          <div className="text-sm text-gray-500 mt-1">Employee: <span className="font-semibold text-gray-800">{entry.employeeName}</span></div>
          <div className="text-sm text-gray-500">Date: {format(new Date(entry.clockIn), 'MMM d, yyyy')}</div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>×</Button>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Core Times */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-100 rounded-lg p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-green-600" />
            <div>
              <div className="text-xs text-green-700 font-semibold uppercase tracking-wider">Clock In</div>
              <div className="text-lg font-mono">{format(new Date(entry.clockIn), 'HH:mm:ss')}</div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-blue-600" />
            <div>
              <div className="text-xs text-blue-700 font-semibold uppercase tracking-wider">Clock Out</div>
              <div className="text-lg font-mono">{entry.clockOut ? format(new Date(entry.clockOut), 'HH:mm:ss') : 'Active'}</div>
            </div>
          </div>
        </div>

        {/* Location & Segments */}
        <div>
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><MapPin className="w-4 h-4"/> Location Allocation</h3>
          {segments.length > 0 ? (
            <div className="space-y-2">
              {segments.map(seg => (
                <div key={seg.id} className="flex justify-between items-center text-sm border p-2 rounded">
                  <span>Loc: {seg.locationId} <Badge variant="outline" className="ml-2 text-[10px]">{seg.departmentId}</Badge></span>
                  <span>{Math.round(seg.paidMinutes / 60 * 100) / 100} hrs</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm border p-2 rounded bg-gray-50">
              Primary Location: {entry.originalLocationId} (100% allocation)
            </div>
          )}
        </div>

        {/* Corrections History */}
        {corrections.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><History className="w-4 h-4"/> Corrections & Approvals</h3>
            <div className="space-y-2">
              {corrections.map(c => (
                <div key={c.id} className="p-3 border rounded text-sm bg-yellow-50">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium">{c.type.replace('_', ' ')}</span>
                    <Badge variant={c.status === 'pending' ? 'secondary' : c.status === 'approved' ? 'default' : 'destructive'}>{c.status}</Badge>
                  </div>
                  <div className="text-gray-600 mb-2">{c.reason}</div>
                  {c.status === 'pending' && (
                    <Button size="sm" onClick={() => onApproveCorrection(c.id)}>Approve</Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Correction Form */}
        {showCorrectionForm ? (
          <div className="border p-4 rounded-lg bg-gray-50 space-y-4">
            <h4 className="font-semibold text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Submit Correction Request</h4>
            
            <div>
              <Label>Correction Type</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={correctionType} onChange={e => setCorrectionType(e.target.value as any)}>
                <option value="missed_in">Missed Clock In</option>
                <option value="missed_out">Missed Clock Out</option>
                <option value="wrong_time">Wrong Time</option>
                <option value="wrong_location">Wrong Location</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <Label>Reason / Notes</Label>
              <Textarea 
                value={correctionReason}
                onChange={e => setCorrectionReason(e.target.value)}
                placeholder="Explain the discrepancy..."
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowCorrectionForm(false)}>Cancel</Button>
              <Button onClick={() => {
                onSubmitCorrection({ type: correctionType, reason: correctionReason });
                setShowCorrectionForm(false);
              }}>Submit Request</Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCorrectionForm(true)}>Request Correction</Button>
            <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => onVoid(entry.id)}>Void Record</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
