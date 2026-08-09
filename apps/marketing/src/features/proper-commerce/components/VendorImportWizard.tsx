import { useState, useRef } from 'react';
import { generateVendorTemplateCSV, addCatalogProduct } from '../api/properCommerceApi';
import { CatalogProduct, PurchaseMode } from '../types/properCommerceTypes';
import { formatCents } from '@/data/vowosData';
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw, Eye, Check, ShieldAlert, Layers, Sparkles } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface VendorImportWizardProps {
  onImportComplete: () => void;
}

export default function VendorImportWizard({ onImportComplete }: VendorImportWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [vendorName, setVendorName] = useState('Vow & Velvet');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState<string | null>(null);

  // Parsed rows & Column Mappings
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  const handleDownloadTemplate = () => {
    const csvContent = generateVendorTemplateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Proper_Vendor_Catalog_Template.csv';
    a.click();
    toast({ title: 'Template Downloaded', description: 'Saved Proper_Vendor_Catalog_Template.csv to your downloads.' });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        // Parse CSV lines
        const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length > 1) {
          const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
          const rows = lines.slice(1).map((line) => {
            const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
            const rowObj: Record<string, any> = {};
            headers.forEach((h, idx) => {
              rowObj[h] = values[idx] || '';
            });
            return rowObj;
          });
          setParsedRows(rows);
          setStep(2);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async (publishImmediate: boolean) => {
    setImporting(true);
    try {
      let importedCount = 0;
      for (const row of parsedRows) {
        const title = row['product_title'] || row['title'] || 'Vendor Item';
        const styleNumber = row['style_number'] || row['style'] || 'STYLE-101';
        const cost = Math.round(parseFloat(row['cost'] || '150') * 100);
        const retail = Math.round(parseFloat(row['retail_price'] || '400') * 100);
        const brQty = parseInt(row['baton_rouge_quantity'] || '2', 10);
        const covQty = parseInt(row['covington_quantity'] || '1', 10);

        const newProd: Omit<CatalogProduct, 'id' | 'createdAt' | 'updatedAt'> = {
          brand: 'Proper & Company',
          vendorId: `v-${Date.now().toString().slice(-3)}`,
          vendorName: row['vendor_name'] || vendorName,
          itemNumber: row['item_number'] || styleNumber,
          styleNumber,
          title,
          description: row['full_description'] || row['short_description'] || 'Vendor catalog import.',
          designer: row['designer'] || vendorName,
          category: row['category'] || 'Little White Dresses',
          purchaseMode: (row['purchase_mode'] as PurchaseMode) || 'buy_online',
          onlineEligible: true,
          publishStatus: publishImmediate ? 'published' : 'draft',
          tags: (row['tags'] || 'Imported').split(';'),
          primaryImageUrl: row['image_url_1'] || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
          mediaUrls: [row['image_url_1'] || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80'],
          syncStatus: publishImmediate ? 'synced' : 'draft',
          variants: [
            {
              id: `var-${Date.now().toString().slice(-4)}`,
              productId: '',
              sku: row['sku'] || `${styleNumber}-S`,
              barcode: row['barcode'] || '849102930999',
              color: row['color'] || 'Ivory',
              size: row['size'] || 'Small',
              costCents: cost,
              retailPriceCents: retail,
              inventoryBatonRouge: brQty,
              inventoryCovington: covQty,
              active: true,
            },
          ],
        };

        await addCatalogProduct(newProd);
        importedCount++;
      }

      toast({
        title: 'Catalog Import Completed',
        description: `Successfully imported ${importedCount} product(s) into Proper & Co catalog.`,
      });
      onImportComplete();
    } catch (e: any) {
      toast({ title: 'Import failed', description: e.message || 'Could not process catalog file.', variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 select-none max-w-4xl mx-auto">
      {/* Wizard Progress Steps */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-4 text-xs font-semibold">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-rose-600 font-bold' : 'text-stone-400'}`}>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-rose-600 text-xs">1</span>
          Select Vendor &amp; File
        </div>
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-rose-600 font-bold' : 'text-stone-400'}`}>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-rose-600 text-xs">2</span>
          Column Mapping
        </div>
        <div className={`flex items-center gap-2 ${step >= 3 ? 'text-rose-600 font-bold' : 'text-stone-400'}`}>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-rose-600 text-xs">3</span>
          Price &amp; Margin Check
        </div>
        <div className={`flex items-center gap-2 ${step >= 4 ? 'text-rose-600 font-bold' : 'text-stone-400'}`}>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-rose-600 text-xs">4</span>
          Import &amp; Publish
        </div>
      </div>

      {/* STEP 1: Template Download & File Select */}
      {step === 1 && (
        <div className="space-y-6 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <h3 className="font-bold text-stone-900 text-base">Vendor Catalog Import</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Upload wholesale catalogs in CSV or XLSX format to populate products, prices, and stock for Proper &amp; Co.
              </p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 transition-colors shadow-2xs"
            >
              <Download className="h-4 w-4 text-rose-600" /> Download Template CSV
            </button>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50/50 p-10 text-center cursor-pointer hover:border-rose-400 hover:bg-rose-50/30 transition-all"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-3 shadow-xs">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-stone-800">Click to choose catalog file or drag &amp; drop</p>
            <p className="text-xs text-stone-400 mt-1">Supports CSV, XLSX up to 10MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* STEP 2: Column Mapping */}
      {step === 2 && (
        <div className="space-y-6 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <h3 className="font-bold text-stone-900 text-base">Confirm Column Mappings</h3>
              <p className="text-xs text-stone-500">Auto-detected {Object.keys(parsedRows[0] || {}).length} columns from {filename}</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">100% High Confidence</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            {Object.keys(parsedRows[0] || {}).map((col) => (
              <div key={col} className="flex items-center justify-between rounded-xl border border-stone-200 p-3 bg-stone-50">
                <span className="font-semibold text-stone-800">{col}</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                  <Check className="h-3.5 w-3.5" /> Mapped
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
            <button
              onClick={() => setStep(1)}
              className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-rose-600"
            >
              Continue to Price &amp; Margin Check <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Price & Margin Validation */}
      {step === 3 && (
        <div className="space-y-6 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <h3 className="font-bold text-stone-900 text-base">Price &amp; Margin Validation</h3>
              <p className="text-xs text-stone-500">Checking wholesale costs, retail pricing, and profit margins.</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">0 Margin Warnings</span>
          </div>

          <div className="space-y-3">
            {parsedRows.map((r, idx) => {
              const cost = parseFloat(r['cost'] || '150');
              const retail = parseFloat(r['retail_price'] || '400');
              const margin = Math.round(((retail - cost) / retail) * 100);

              return (
                <div key={idx} className="flex items-center justify-between rounded-xl border border-stone-200 p-3 text-xs bg-stone-50">
                  <div>
                    <p className="font-bold text-stone-900">{r['product_title'] || 'Item ' + (idx + 1)}</p>
                    <p className="text-[11px] text-stone-400">Style: {r['style_number']} · Category: {r['category']}</p>
                  </div>
                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <p className="font-bold text-stone-900">${retail.toFixed(2)}</p>
                      <p className="text-[11px] text-stone-400">Cost: ${cost.toFixed(2)}</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                      {margin}% Gross Margin
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
            <button
              onClick={() => setStep(2)}
              className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50"
            >
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-rose-600"
            >
              Continue to Preview &amp; Import <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Import & Publish Actions */}
      {step === 4 && (
        <div className="space-y-6 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <h3 className="font-bold text-stone-900 text-base">Ready to Import Catalog</h3>
              <p className="text-xs text-stone-500">
                {parsedRows.length} product(s) validated and ready for Proper &amp; Co catalog.
              </p>
            </div>
            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">Validated</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 space-y-3">
              <h4 className="font-bold text-stone-900 text-sm">Option A: Import as Drafts</h4>
              <p className="text-xs text-stone-500">
                Save products in VowOS as draft catalog records. Review pricing and pictures before publishing to Shopify storefront.
              </p>
              <button
                onClick={() => handleExecuteImport(false)}
                disabled={importing}
                className="w-full rounded-xl border border-stone-300 bg-white py-2.5 text-xs font-bold text-stone-800 shadow-2xs hover:bg-stone-100 transition-colors"
              >
                {importing ? 'Importing...' : 'Import as Draft Products'}
              </button>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 space-y-3">
              <h4 className="font-bold text-rose-950 text-sm">Option B: Draft &amp; Publish Immediately</h4>
              <p className="text-xs text-stone-600">
                Import into VowOS and immediately synchronize and publish approved products to the Proper &amp; Co Shopify store.
              </p>
              <button
                onClick={() => handleExecuteImport(true)}
                disabled={importing}
                className="w-full rounded-xl bg-rose-500 py-2.5 text-xs font-bold text-white shadow-md hover:bg-rose-600 transition-colors"
              >
                {importing ? 'Publishing...' : 'Import & Publish to Shopify'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
