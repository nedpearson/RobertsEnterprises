import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, UploadCloud, CheckCircle2, AlertTriangle, FileSpreadsheet, Loader2 } from 'lucide-react';
import { parseRawText, validateCustomerRow } from '@/lib/migration/importParsers';
import { toast } from 'sonner';

interface WizardProps {
  entityType: string;
  onCancel: () => void;
  onComplete: () => void;
}

type Step = 'UPLOAD' | 'MAP' | 'VALIDATE' | 'DRY_RUN' | 'COMMIT';

export default function ImportWorkflowWizard({ entityType, onCancel, onComplete }: WizardProps) {
  const [step, setStep] = useState<Step>('UPLOAD');
  const [isProcessing, setIsProcessing] = useState(false);
  const [rawRows, setRawRows] = useState<any[]>([]);

  const handleSimulateUpload = () => {
    setIsProcessing(true);
    setTimeout(() => {
      // Mock parsing a 50-row CSV
      const mockCsv = "firstName,lastName,email\n" + Array.from({length: 50}, (_, i) => `Jane${i},Doe${i},jane${i}@example.com`).join("\n");
      setRawRows(parseRawText(mockCsv));
      setIsProcessing(false);
      setStep('MAP');
    }, 1000);
  };

  const handleSimulateValidation = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setStep('VALIDATE');
    }, 800);
  };

  const handleSimulateDryRun = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setStep('DRY_RUN');
    }, 1200);
  };

  const handleSimulateCommit = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      toast.success(`Successfully imported ${rawRows.length} ${entityType}`);
      onComplete();
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-3xl animate-in slide-in-from-right-4 duration-300">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onCancel} className="text-stone-500">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div>
          <h2 className="text-xl font-serif text-stone-800 capitalize">Import {entityType}</h2>
          <p className="text-sm text-stone-500">Step {['UPLOAD', 'MAP', 'VALIDATE', 'DRY_RUN', 'COMMIT'].indexOf(step) + 1} of 5</p>
        </div>
      </div>

      <Card className="shadow-xs border-stone-200/60">
        <CardHeader>
          <CardTitle>
            {step === 'UPLOAD' && 'Upload Data File'}
            {step === 'MAP' && 'Map Fields'}
            {step === 'VALIDATE' && 'Validation Results'}
            {step === 'DRY_RUN' && 'Dry Run Confirmation'}
          </CardTitle>
          <CardDescription>
            {step === 'UPLOAD' && 'Select a CSV or XLSX file containing your historical data.'}
            {step === 'MAP' && `We found ${rawRows.length} rows. Map your columns to VowOS properties.`}
            {step === 'VALIDATE' && 'Review errors and warnings before proceeding.'}
            {step === 'DRY_RUN' && 'The data is staged and ready to be inserted into the live database.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'UPLOAD' && (
            <div className="border-2 border-dashed border-stone-200 rounded-lg p-12 text-center hover:bg-stone-50 transition-colors cursor-pointer" onClick={handleSimulateUpload}>
              {isProcessing ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-8 h-8 text-brand-primary animate-spin mb-4" />
                  <p className="text-sm font-medium text-stone-600">Parsing file...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <FileSpreadsheet className="w-10 h-10 text-stone-300 mb-4" />
                  <p className="text-sm font-medium text-stone-800 mb-1">Click to browse or drag file here</p>
                  <p className="text-xs text-stone-500">Supports .csv, .xlsx up to 5MB</p>
                </div>
              )}
            </div>
          )}

          {step === 'MAP' && (
             <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 border-b border-stone-100 pb-2 text-sm font-medium text-stone-500">
                  <div>Source Column (CSV)</div>
                  <div>Sample Data</div>
                  <div>VowOS Field</div>
                </div>
                {['firstName', 'lastName', 'email'].map((col, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-4 items-center">
                    <div className="text-sm font-mono bg-stone-100 px-2 py-1 rounded w-fit">{col}</div>
                    <div className="text-sm text-stone-500 truncate">{rawRows[0][col]}</div>
                    <div>
                      <select className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                        <option value={col}>{col}</option>
                      </select>
                    </div>
                  </div>
                ))}
             </div>
          )}

          {step === 'VALIDATE' && (
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-1 bg-emerald-50 border border-emerald-200 p-4 rounded-lg flex flex-col items-center justify-center text-emerald-800">
                  <CheckCircle2 className="w-6 h-6 mb-2" />
                  <span className="text-2xl font-bold">{rawRows.length}</span>
                  <span className="text-xs font-medium uppercase tracking-wider">Valid Rows</span>
                </div>
                <div className="flex-1 bg-amber-50 border border-amber-200 p-4 rounded-lg flex flex-col items-center justify-center text-amber-800">
                  <AlertTriangle className="w-6 h-6 mb-2" />
                  <span className="text-2xl font-bold">0</span>
                  <span className="text-xs font-medium uppercase tracking-wider">Warnings</span>
                </div>
              </div>
              <p className="text-sm text-stone-600 text-center">All rows passed strict validation rules. No duplicates found in the live database.</p>
            </div>
          )}

          {step === 'DRY_RUN' && (
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-6 text-center">
              <UploadCloud className="w-12 h-12 text-brand-primary mx-auto mb-4" />
              <h3 className="text-lg font-serif text-stone-800 mb-2">Ready for Import</h3>
              <p className="text-sm text-stone-500 max-w-md mx-auto">
                You are about to insert <strong>{rawRows.length}</strong> {entityType} into your live database. 
                This action is logged and can be rolled back by VowOS Support if a critical error occurs.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end gap-3 border-t border-stone-100 bg-stone-50/50 pt-4">
          {step !== 'UPLOAD' && (
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
          )}
          {step === 'MAP' && (
            <Button onClick={handleSimulateValidation} disabled={isProcessing} className="bg-stone-900 text-white">
              {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Run Validation
            </Button>
          )}
          {step === 'VALIDATE' && (
            <Button onClick={handleSimulateDryRun} disabled={isProcessing} className="bg-stone-900 text-white">
              {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Proceed to Dry Run
            </Button>
          )}
          {step === 'DRY_RUN' && (
            <Button onClick={handleSimulateCommit} disabled={isProcessing} className="bg-brand-primary text-white hover:bg-brand-primary/90">
              {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Commit Import
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
