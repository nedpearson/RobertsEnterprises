import { CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface SetupWidgetProps {
  progress: number;
  onContinue: () => void;
  compact?: boolean;
}

export function SetupWidget({ progress, onContinue, compact }: SetupWidgetProps) {
  if (compact) {
    return (
      <div className="w-full flex justify-center py-4 border-b border-white/10">
        <button 
          onClick={onContinue}
          className="relative h-8 w-8 rounded-full flex items-center justify-center bg-brand-primary/20 text-brand-primary hover:bg-brand-primary/30 transition-colors"
          title="Complete Setup"
        >
          <span className="text-[10px] font-bold">{progress}%</span>
          <svg className="absolute inset-0 h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
            <circle
              className="text-white/10"
              strokeWidth="8"
              stroke="currentColor"
              fill="transparent"
              r="40"
              cx="50"
              cy="50"
            />
            <circle
              className="text-brand-primary transition-all duration-500 ease-in-out"
              strokeWidth="8"
              strokeDasharray={`${progress * 2.51} 251`}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r="40"
              cx="50"
              cy="50"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="mx-3 my-4 p-4 rounded-xl bg-gradient-to-b from-brand-primary/20 to-brand-primary/5 border border-brand-primary/20 relative overflow-hidden group">
      <div className="relative z-10">
        <h3 className="font-semibold text-white mb-1">Complete Setup</h3>
        <p className="text-xs text-stone-300 mb-3">
          Finish setting up your workspace to unlock all features.
        </p>
        
        <div className="flex items-center gap-3 mb-2">
          <Progress value={progress} className="h-1.5 flex-1 bg-white/10" indicatorClassName="bg-brand-primary" />
          <span className="text-[10px] font-bold text-brand-primary">{progress}%</span>
        </div>
        
        <Button 
          onClick={onContinue}
          className="w-full h-8 text-xs font-semibold bg-brand-primary hover:bg-brand-primary-hover text-white shadow-sm mt-2"
        >
          Resume Setup
        </Button>
      </div>
      
      {/* Decorative background flare */}
      <div className="absolute -top-6 -right-6 w-24 h-24 bg-brand-primary/20 blur-2xl rounded-full group-hover:bg-brand-primary/30 transition-colors pointer-events-none" />
    </div>
  );
}
