import sys
import re

file = "apps/marketing/src/components/vowos/settings/tabs/AIModelSettingsTab.tsx"
with open(file, "r", encoding="utf8") as f:
    code = f.read()

code = code.replace(
    "import { toast } from 
'@vowos/design-system'
;",
    "import { toast, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from 
'@vowos/design-system'
;"
)

state_hooks = """  const [promoteTarget, setPromoteTarget] = useState<string | null>(null);
  const [promoteStrategy, setPromoteStrategy] = useState<
'instant'
 | 
'gradual'
 | 
'shadow'
>(
'instant'
);
  const [isPromoting, setIsPromoting] = useState(false);"""

code = code.replace(
    "const [isBenchmarking, setIsBenchmarking] = useState(false);",
    "const [isBenchmarking, setIsBenchmarking] = useState(false);\n" + state_hooks
)

new_handle_promote = """  const confirmPromote = async () => {
    if (!promoteTarget) return;
    setIsPromoting(true);

    if (promoteStrategy === 
'instant'
) {
      await new Promise(r => setTimeout(r, 600));
      setModels(currentModels => {
        const challenger = currentModels.find(m => m.id === promoteTarget);
        if (!challenger) return currentModels;
        
        return currentModels.map(m => {
          if (m.taskType === challenger.taskType) {
            if (m.id === promoteTarget) {
              return { ...m, isChampion: true, isChallenger: false, status: 
'active'
 };
            } else {
              return { ...m, isChampion: false, isChallenger: true, status: 
'shadow'
 };
            }
          }
          return m;
        });
      });
      onDirtyChange(true);
      toast.success(
'Model promoted to Champion'
);
    } else if (promoteStrategy === 
'gradual'
) {
      await new Promise(r => setTimeout(r, 1500));
      toast.success(
'Canary rollout configured. Shifting 10% of traffic.'
);
    } else if (promoteStrategy === 
'shadow'
) {
      await new Promise(r => setTimeout(r, 1500));
      toast.success(
'Shadow evaluation started against past 30 days of data. Results will appear in 24 hours.'
);
    }

    setIsPromoting(false);
    setPromoteTarget(null);
  };

  const handlePromoteClick = (modelId: string) => {
    setPromoteTarget(modelId);
    setPromoteStrategy(
'instant'
);
  };
"""

code = re.sub(r"  const handlePromote = \([^}]+?\n    \}\);\n  \};\n", new_handle_promote, code, count=1, flags=re.MULTILINE | re.DOTALL)

code = code.replace(
    "onClick={() => handlePromote(m.id)}",
    "onClick={() => handlePromoteClick(m.id)}"
)

modal_code = """
      <Dialog open={!!promoteTarget} onOpenChange={(open) => !open && setPromoteTarget(null)}>
        <DialogContent className=
'max-w-md'
>
          <DialogHeader>
            <DialogTitle>Promote Model</DialogTitle>
            <DialogDescription>
              Choose how you want to promote this challenger model.
            </DialogDescription>
          </DialogHeader>

          <div className=
'space-y-4 py-4'
>
            <label className=
'flex items-start gap-3 rounded-xl border border-stone-200 p-4 cursor-pointer hover:bg-stone-50 transition-colors'
>
              <input 
                type=
'radio'
 
                name=
'strategy'
 
                checked={promoteStrategy === 
'instant'
} 
                onChange={() => setPromoteStrategy(
'instant'
)}
                className=
'mt-1'

              />
              <div>
                <p className=
'font-semibold text-stone-900 text-sm'
>Instant Swap</p>
                <p className=
'text-xs text-stone-500 mt-1'
>Immediately route 100% of traffic for this task type to the new model.</p>
              </div>
            </label>

            <label className=
'flex items-start gap-3 rounded-xl border border-stone-200 p-4 cursor-pointer hover:bg-stone-50 transition-colors'
>
              <input 
                type=
'radio'
 
                name=
'strategy'
 
                checked={promoteStrategy === 
'gradual'
} 
                onChange={() => setPromoteStrategy(
'gradual'
)}
                className=
'mt-1'

              />
              <div>
                <p className=
'font-semibold text-stone-900 text-sm'
>Gradual Rollout (Canary)</p>
                <p className=
'text-xs text-stone-500 mt-1'
>Route 10% of traffic initially, automatically ramping to 100% over 7 days based on latency and error rates.</p>
              </div>
            </label>

            <label className=
'flex items-start gap-3 rounded-xl border border-stone-200 p-4 cursor-pointer hover:bg-stone-50 transition-colors'
>
              <input 
                type=
'radio'
 
                name=
'strategy'
 
                checked={promoteStrategy === 
'shadow'
} 
                onChange={() => setPromoteStrategy(
'shadow'
)}
                className=
'mt-1'

              />
              <div>
                <p className=
'font-semibold text-stone-900 text-sm'
>Shadow Evaluation (Past Data)</p>
                <p className=
'text-xs text-stone-500 mt-1'
>Replay the last 30 days of data against this model. Only promote if the quality score matches or exceeds the champion.</p>
              </div>
            </label>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <button className={btnSecondary} disabled={isPromoting}>Cancel</button>
            </DialogClose>
            <button className={btnPrimary} onClick={confirmPromote} disabled={isPromoting}>
              {isPromoting ? (
                <><Loader2 className=
'h-4 w-4 animate-spin'
 /> Processing...</>
              ) : (
                
'Confirm Promotion'

              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
"""

code = code.replace(
    "    </div>\n  );\n}",
    modal_code + "    </div>\n  );\n}"
)

with open(file, "w", encoding="utf8") as f:
    f.write(code)

print("Patched.")
