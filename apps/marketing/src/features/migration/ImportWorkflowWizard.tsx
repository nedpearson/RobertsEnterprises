import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { generateEntityId, resolveLocationId, DEMO_LOCATION_MAP } from '@/data/vowosData';

interface WizardProps {
  entityType: string;
  onCancel: () => void;
  onComplete: () => void;
}

type Step = 'UPLOAD' | 'MAP' | 'COMMIT';

const ENTITY_FIELDS = {
  customers: [
    { value: 'name', label: 'Name (Full)' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'wedding_date', label: 'Wedding Date (YYYY-MM-DD)' },
    { value: 'stylist', label: 'Stylist / Assigned To' },
    { value: 'status', label: 'Status' },
    { value: 'spend_cents', label: 'Total Spend (Cents)' },
  ],
  products: [
    { value: 'name', label: 'Product Name' },
    { value: 'sku', label: 'SKU' },
    { value: 'designer', label: 'Designer' },
    { value: 'price_cents', label: 'Price (Cents)' },
    { value: 'stock', label: 'Stock Qty' },
    { value: 'status', label: 'Status' },
  ],
  appointments: [
    { value: 'customer', label: 'Customer Name' },
    { value: 'type', label: 'Appointment Type' },
    { value: 'date', label: 'Date (YYYY-MM-DD)' },
    { value: 'time', label: 'Time (HH:MM)' },
    { value: 'stylist', label: 'Stylist Name' },
    { value: 'status', label: 'Status' },
  ]
};

export default function ImportWorkflowWizard({ entityType, onCancel, onComplete }: WizardProps) {
  const { tenant } = useAuth();
  const [step, setStep] = useState<Step>('UPLOAD');
  const [isProcessing, setIsProcessing] = useState(false);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableFields = ENTITY_FIELDS[entityType as keyof typeof ENTITY_FIELDS] || [];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          toast.error("File is empty or could not be parsed.");
          setIsProcessing(false);
          return;
        }

        const parsedHeaders = results.meta.fields || [];
        setHeaders(parsedHeaders);
        setRawRows(results.data);

        // Auto-map if column names match exactly
        const initialMapping: Record<string, string> = {};
        parsedHeaders.forEach(h => {
          const matched = availableFields.find(f => f.value === h || f.label.toLowerCase() === h.toLowerCase());
          if (matched) {
            initialMapping[h] = matched.value;
          }
        });
        setFieldMapping(initialMapping);
        setStep('MAP');
        setIsProcessing(false);
      },
      error: (err: any) => {
        toast.error(`Failed to parse CSV: ${err.message}`);
        setIsProcessing(false);
      }
    });
  };

  const handleSimulateCommit = async () => {
    setIsProcessing(true);
    try {
      const businessId = tenant?.id;
      if (!businessId) {
        throw new Error('No active business context. Please ensure you are logged in.');
      }

      const tableName = entityType === 'products' ? 'gowns' : entityType;
      // location is often required, we can default to ido-br if we need one for customers/appointments/products
      const defaultLocId = resolveLocationId('I Do Bridal') || DEMO_LOCATION_MAP['ido-br'];

      const recordsToInsert = rawRows.map(row => {
        const record: any = {
          id: generateEntityId(),
          business_id: businessId,
        };
        
        // Inject default location if applicable and missing (will be overridden if mapped in CSV, though we didn't add location to ENTITY_FIELDS)
        if (tableName === 'customers' || tableName === 'gowns' || tableName === 'appointments') {
          record.location_id = defaultLocId;
        }

        Object.entries(fieldMapping).forEach(([csvCol, dbCol]) => {
          if (dbCol && row[csvCol] !== undefined) {
             let val = row[csvCol];
             // Simple type coercion if needed
             if (dbCol.endsWith('_cents') && typeof val === 'string') {
                 val = parseInt(val.replace(/\D/g, ''), 10);
                 if (isNaN(val)) val = 0;
             } else if (dbCol === 'stock' && typeof val === 'string') {
                 val = parseInt(val, 10);
                 if (isNaN(val)) val = 0;
             }
             record[dbCol] = val;
          }
        });

        // special fix for customers who need a location string
        if (tableName === 'customers' && !record.location) {
            record.location = 'I Do Bridal';
        }
        
        return record;
      });

      // Insert in chunks
      for (let i = 0; i < recordsToInsert.length; i += 500) {
        const chunk = recordsToInsert.slice(i, i + 500);
        const { error } = await supabase.from(tableName).insert(chunk);
        if (error) throw error;
      }

      toast.success(`Successfully imported ${rawRows.length} ${entityType}`);
      onComplete();
    } catch (err: any) {
      console.error('Import commit error:', err);
      toast.error(err.message || 'Failed to commit import');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMappingChange = (csvCol: string, dbCol: string) => {
    setFieldMapping(prev => ({ ...prev, [csvCol]: dbCol }));
  };

  return (
    <div className="space-y-6 max-w-3xl animate-in slide-in-from-right-4 duration-300">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onCancel} className="text-stone-500">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div>
          <h2 className="text-xl font-serif text-stone-800 capitalize">Import {entityType}</h2>
          <p className="text-sm text-stone-500">Step {['UPLOAD', 'MAP', 'COMMIT'].indexOf(step) + 1} of 3</p>
        </div>
      </div>

      <Card className="shadow-xs border-stone-200/60">
        <CardHeader>
          <CardTitle>
            {step === 'UPLOAD' && 'Upload Data File'}
            {step === 'MAP' && 'Map Fields'}
          </CardTitle>
          <CardDescription>
            {step === 'UPLOAD' && 'Select a CSV or XLSX file containing your historical data.'}
            {step === 'MAP' && `We found ${rawRows.length} rows. Map your columns to VowOS properties.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'UPLOAD' && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
              <div 
                className="border-2 border-dashed border-stone-200 rounded-lg p-12 text-center hover:bg-stone-50 transition-colors cursor-pointer" 
                onClick={() => fileInputRef.current?.click()}
              >
                {isProcessing ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-8 h-8 text-brand-primary animate-spin mb-4" />
                    <p className="text-sm font-medium text-stone-600">Parsing file...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <FileSpreadsheet className="w-10 h-10 text-stone-300 mb-4" />
                    <p className="text-sm font-medium text-stone-800 mb-1">Click to browse or drag file here</p>
                    <p className="text-xs text-stone-500">Supports .csv up to 5MB</p>
                  </div>
                )}
              </div>
            </>
          )}

          {step === 'MAP' && (
             <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 border-b border-stone-100 pb-2 text-sm font-medium text-stone-500">
                  <div>Source Column (CSV)</div>
                  <div>Sample Data</div>
                  <div>VowOS Field</div>
                </div>
                {headers.map((col, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-4 items-center">
                    <div className="text-sm font-mono bg-stone-100 px-2 py-1 rounded w-fit max-w-full truncate" title={col}>
                      {col}
                    </div>
                    <div className="text-sm text-stone-500 truncate" title={String(rawRows[0]?.[col] || '')}>
                      {String(rawRows[0]?.[col] || '')}
                    </div>
                    <div>
                      <select 
                        value={fieldMapping[col] || ''}
                        onChange={(e) => handleMappingChange(col, e.target.value)}
                        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">-- Ignore --</option>
                        {availableFields.map(f => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
             </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end gap-3 border-t border-stone-100 bg-stone-50/50 pt-4">
          {step !== 'UPLOAD' && (
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
          )}
          {step === 'MAP' && (
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
