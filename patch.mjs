import fs from 'fs';
const file = 'apps/marketing/src/components/vowos/settings/tabs/AIModelSettingsTab.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add Dialog imports
code = code.replace(
  "import { toast } from '@vowos/design-system';",
  "import { toast, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@vowos/design-system';"
);

// 2. Add State for the modal
const stateHooks = \
  const [promoteTarget, setPromoteTarget] = useState<string | null>(null);
  const [promoteStrategy, setPromoteStrategy] = useState<'instant' | 'gradual' | 'shadow'>('instant');
  const [isPromoting, setIsPromoting] = useState(false);
\;
code = code.replace(
  "const [isBenchmarking, setIsBenchmarking] = useState(false);",
  "const [isBenchmarking, setIsBenchmarking] = useState(false);" + stateHooks
);

// 3. Update handlePromote
const newHandlePromote = \
  const confirmPromote = async () => {
    if (!promoteTarget) return;
    setIsPromoting(true);

    if (promoteStrategy === 'instant') {
      await new Promise(r => setTimeout(r, 600));
      setModels(currentModels => {
        const challenger = currentModels.find(m => m.id === promoteTarget);
        if (!challenger) return currentModels;
        
        return currentModels.map(m => {
          if (m.taskType === challenger.taskType) {
            if (m.id === promoteTarget) {
              return { ...m, isChampion: true, isChallenger: false, status: 'active' };
            } else {
              return { ...m, isChampion: false, isChallenger: true, status: 'shadow' };
            }
          }
          return m;
        });
      });
      toast.success('Model promoted to Champion');
    } else if (promoteStrategy === 'gradual') {
      await new Promise(r => setTimeout(r, 1500));
      toast.success('Canary rollout configured. Shifting 10% of traffic.');
    } else if (promoteStrategy === 'shadow') {
      await new Promise(r => setTimeout(r, 1500));
      toast.success('Shadow evaluation started against past 30 days of data. Results will appear in 24 hours.');
    }

    setIsPromoting(false);
    setPromoteTarget(null);
  };

  const handlePromoteClick = (modelId: string) => {
    setPromoteTarget(modelId);
    setPromoteStrategy('instant');
  };
\;

code = code.replace(
  /const handlePromote = \([^]+?\}\;/g,
  newHandlePromote
);

// 4. Update the actual promote button click handler
code = code.replace(
  /onClick=\{\(\) \=\> handlePromote\(m\.id\)\}/g,
  "onClick={() => handlePromoteClick(m.id)}"
);

// 5. Add the Dialog at the end of the return statement
const modalCode = \
      <Dialog open={!!promoteTarget} onOpenChange={(open) => !open && setPromoteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Promote Model</DialogTitle>
            <DialogDescription>
              Choose how you want to promote this challenger model.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <label className="flex items-start gap-3 rounded-xl border border-stone-200 p-4 cursor-pointer hover:bg-stone-50 transition-colors">
              <input 
                type="radio" 
                name="strategy" 
                checked={promoteStrategy === 'instant'} 
                onChange={() => setPromoteStrategy('instant')}
                className="mt-1"
              />
              <div>
                <p className="font-semibold text-stone-900 text-sm">Instant Swap</p>
                <p className="text-xs text-stone-500 mt-1">Immediately route 100% of traffic for this task type to the new model.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-stone-200 p-4 cursor-pointer hover:bg-stone-50 transition-colors">
              <input 
                type="radio" 
                name="strategy" 
                checked={promoteStrategy === 'gradual'} 
                onChange={() => setPromoteStrategy('gradual')}
                className="mt-1"
              />
              <div>
                <p className="font-semibold text-stone-900 text-sm">Gradual Rollout (Canary)</p>
                <p className="text-xs text-stone-500 mt-1">Route 10% of traffic initially, automatically ramping to 100% over 7 days based on latency and error rates.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-stone-200 p-4 cursor-pointer hover:bg-stone-50 transition-colors">
              <input 
                type="radio" 
                name="strategy" 
                checked={promoteStrategy === 'shadow'} 
                onChange={() => setPromoteStrategy('shadow')}
                className="mt-1"
              />
              <div>
                <p className="font-semibold text-stone-900 text-sm">Shadow Evaluation (Past Data)</p>
                <p className="text-xs text-stone-500 mt-1">Replay the last 30 days of data against this model. Only promote if the quality score matches or exceeds the champion.</p>
              </div>
            </label>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <button className={btnSecondary} disabled={isPromoting}>Cancel</button>
            </DialogClose>
            <button className={btnPrimary} onClick={confirmPromote} disabled={isPromoting}>
              {isPromoting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
              ) : (
                'Confirm Promotion'
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
\;

code = code.replace(
  /    <\/div>\s*  \);\s*\}/,
  modalCode + "\\n}"
);

fs.writeFileSync(file, code);
