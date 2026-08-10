import { useState } from 'react';
import { Save, Undo, RefreshCw, Loader2 } from 'lucide-react';
import { btnPrimary, btnSecondary } from '@/components/vowos/ui';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@vowos/design-system';
import { Input } from '@vowos/design-system';
import { Label } from '@vowos/design-system';

interface StickySaveBarProps {
  show: boolean;
  saving: boolean;
  onSave: (reason?: string) => void;
  onCancel: () => void;
  onReset?: () => void;
  isSensitive?: boolean;
  resetLabel?: string;
}

export function StickySaveBar({
  show,
  saving,
  onSave,
  onCancel,
  onReset,
  isSensitive = false,
  resetLabel = 'Reset to inherited',
}: StickySaveBarProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState('');

  if (!show) return null;

  const handlePreSave = () => {
    if (isSensitive) {
      setReason('');
      setConfirmOpen(true);
    } else {
      onSave();
    }
  };

  const handleConfirmSave = () => {
    setConfirmOpen(false);
    onSave(reason);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-stone-200 bg-white/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgb(0,0,0,0.06)] backdrop-blur-sm lg:left-64 animate-slide-up">
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="h-2 w-2 rounded-full bg-brand-primary animate-pulse flex-shrink-0" />
          <span className="text-sm font-medium text-stone-600">You have unsaved changes</span>
        </div>

        <div className="flex w-full sm:w-auto items-center gap-3">
          {onReset && (
            <button
              onClick={onReset}
              disabled={saving}
              className={`${btnSecondary} text-xs py-1.5 px-3 h-9 flex-1 sm:flex-none justify-center`}
              type="button"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{resetLabel}</span>
              <span className="sm:hidden">Reset</span>
            </button>
          )}

          <button
            onClick={onCancel}
            disabled={saving}
            className={`${btnSecondary} h-9 flex-1 sm:flex-none justify-center`}
            type="button"
          >
            <Undo className="h-4 w-4" />
            Cancel
          </button>

          <button
            onClick={handlePreSave}
            disabled={saving}
            className={`${btnPrimary} h-9 flex-1 sm:flex-none justify-center`}
            type="button"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Sensitive Setting Change</DialogTitle>
            <DialogDescription>
              You are changing a sensitive administrative setting. Please provide a reason for this change for the audit log.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="audit-reason" className="text-stone-700">Reason for change</Label>
            <Input
              id="audit-reason"
              placeholder="e.g. Updating organization timezone, changing booking fees..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-stone-900 border-stone-300"
            />
          </div>
          <DialogFooter>
            <button
              onClick={() => setConfirmOpen(false)}
              className={btnSecondary}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSave}
              disabled={!reason.trim()}
              className={btnPrimary}
            >
              Confirm and Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
