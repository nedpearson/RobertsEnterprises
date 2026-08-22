import { useBusinessId } from '@/hooks/useBusinessId';
import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, ArrowRight, Settings } from 'lucide-react';
import { Vendor } from '../../types/catalog';
import { catalogService } from '../../lib/services/catalogService';
import { importEngine, FieldMapping } from '../../lib/services/importEngine';
import { toast } from 'sonner';


export function CatalogImportCenter() {
  const businessId = useBusinessId();
  const [activeStep, setActiveStep] = useState(1);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [rawData, setRawData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  
  const [mappings, setMappings] = useState<FieldMapping[]>([
    { csvHeader: '', mappedField: 'style_number' },
    { csvHeader: '', mappedField: 'name' },
    { csvHeader: '', mappedField: 'description' },
    { csvHeader: '', mappedField: 'category' },
    { csvHeader: '', mappedField: 'brand' },
    { csvHeader: '', mappedField: 'collection' },
    { csvHeader: '', mappedField: 'color' },
    { csvHeader: '', mappedField: 'size' },
    { csvHeader: '', mappedField: 'vendor_sku' },
    { csvHeader: '', mappedField: 'upc' },
    { csvHeader: '', mappedField: 'cost_cents' },
    { csvHeader: '', mappedField: 'msrp_cents' },
    { csvHeader: '', mappedField: 'store_retail_cents' },
    { csvHeader: '', mappedField: 'image_url' },
    { csvHeader: '', mappedField: 'fabric' },
    { csvHeader: '', mappedField: 'silhouette' },
    { csvHeader: '', mappedField: 'neckline' },
    { csvHeader: '', mappedField: 'lead_time_weeks' },
  ]);

  const [importing, setImporting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [preview, setPreview] = useState<{ errors: number; warnings: number; totalRows: number } | null>(null);

  useEffect(() => {
    catalogService.getVendors(businessId).then(setVendors).catch(console.error);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const uploadedFile = e.target.files[0];
    setFile(uploadedFile);
    setParsing(true);
    try {
      const data = await importEngine.parseCSV(uploadedFile);
      setRawData(data);
      if (data.length > 0) {
        setHeaders(Object.keys(data[0]));
        setPreview(null);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to parse CSV");
    } finally {
      setParsing(false);
    }
  };

  const handleMappingChange = (field: string, header: string) => {
    setMappings(prev => prev.map(m => m.mappedField === field ? { ...m, csvHeader: header } : m));
  };

  const handleImport = async () => {
    if (!selectedVendor || !file) return;
    
    // Check if style_number is mapped
    const styleMapping = mappings.find(m => m.mappedField === 'style_number');
    if (!styleMapping || !styleMapping.csvHeader) {
      toast.error("Style Number mapping is required.");
      return;
    }

    setImporting(true);
    try {
      const result = await importEngine.commitImport(selectedVendor, file.name, rawData, mappings);
      setPreview({ errors: result.errors, warnings: result.warnings, totalRows: rawData.length });
      setSuccess(true);
    } catch (err) {
      console.error(err);
      toast.error("Import failed. See console.");
    } finally {
      setImporting(false);
    }
  };

  const handlePreview = async () => {
    if (!selectedVendor || !file) return;
    setImporting(true);
    try {
      const mapping = Object.fromEntries(mappings.filter((entry) => entry.csvHeader).map((entry) => [entry.csvHeader, entry.mappedField]));
      const result = await importEngine.previewImport(selectedVendor, rawData, mapping);
      setMappings((current) => current.map((entry) => ({
        ...entry,
        csvHeader: Object.entries(result.mapping).find(([, field]) => field === entry.mappedField)?.[0] || entry.csvHeader,
      })));
      setPreview({ errors: result.errors, warnings: result.warnings, totalRows: result.totalRows });
      if (result.errors) toast.error(`${result.errors} row(s) need attention before import.`);
      else toast.success(`Review complete: ${result.totalRows} rows ready to import.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not validate this catalog.');
    } finally {
      setImporting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center p-12 bg-white rounded-xl border border-border-default shadow-sm">
        <div className="w-16 h-16 bg-green-100 text-status-success rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-serif font-light text-text-primary mb-2">Import Successful</h2>
        <p className="text-text-muted mb-8">
          The catalog data has been successfully mapped and imported into your vendor database.
        </p>
        <button
          onClick={() => { setSuccess(false); setFile(null); setRawData([]); }}
          className="px-6 py-2 bg-surface-dark text-white text-sm rounded hover:bg-surface-dark transition-colors"
        >
          Import Another File
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-light text-text-primary mb-1">Catalog Import Center</h1>
        <p className="text-text-muted">Upload vendor catalogs via CSV or Excel to automatically create products and variants.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 p-6 space-y-6 rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Select Vendor</label>
            <select
              value={selectedVendor}
              onChange={(e) => { setSelectedVendor(e.target.value); setPreview(null); }}
              className="w-full border-border-strong rounded-md shadow-sm focus:border-brand-primary focus:ring-focus-ring sm:text-sm"
            >
              <option value="">-- Choose Vendor --</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Upload File</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-border-strong border-dashed rounded-md relative hover:border-brand-primary transition-colors">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-text-muted" />
                <div className="flex text-sm text-text-secondary">
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-brand-primary hover:text-brand-primary">
                    <span>Upload a file</span>
                    <input type="file" accept=".csv,text/csv" className="sr-only" onChange={handleFileUpload} />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-text-muted">CSV up to 10MB. Review runs before any catalog data is saved.</p>
              </div>
            </div>
          </div>
          
          {file && (
            <div className="bg-surface-canvas p-4 rounded-lg flex items-center gap-3">
              <FileText className="w-5 h-5 text-text-muted" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
                <p className="text-xs text-text-muted">{rawData.length} rows found</p>
              </div>
            </div>
          )}
        </div>

        <div className="col-span-2 p-6 rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-text-primary">Field Mapping</h2>
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Settings className="w-4 h-4" />
              <span>Map columns to VowOS properties</span>
            </div>
          </div>

          {rawData.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p>Upload a file to begin mapping fields.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-12 gap-4 pb-2 border-b border-gray-100 text-xs font-medium text-text-muted uppercase tracking-wider">
                <div className="col-span-5">VowOS Property</div>
                <div className="col-span-2 text-center"></div>
                <div className="col-span-5">CSV Column</div>
              </div>

              {mappings.map((mapping) => (
                <div key={mapping.mappedField} className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-5">
                    <span className="text-sm font-medium text-text-primary capitalize">
                      {mapping.mappedField.replace('_', ' ')}
                    </span>
                    {mapping.mappedField === 'style_number' && <span className="text-red-500 ml-1">*</span>}
                  </div>
                  <div className="col-span-2 flex justify-center text-slate-300">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <div className="col-span-5">
                    <select
                      value={mapping.csvHeader}
                      onChange={(e) => handleMappingChange(mapping.mappedField, e.target.value)}
                      className="w-full border-border-strong rounded-md shadow-sm focus:border-brand-primary focus:ring-focus-ring sm:text-sm"
                    >
                      <option value="">-- Ignore --</option>
                      {headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}

              <div className="pt-6 border-t border-gray-100 flex justify-end">
                {preview && (
                  <div className="mr-auto text-sm text-text-secondary">
                    {preview.totalRows} rows reviewed · {preview.warnings} warning(s) · {preview.errors} error(s)
                  </div>
                )}
                <button
                  onClick={handlePreview}
                  disabled={importing || !selectedVendor}
                  className="mr-3 px-6 py-2 border border-border-strong text-text-primary text-sm rounded hover:bg-surface-canvas disabled:opacity-50"
                >
                  {importing ? 'Reviewing...' : 'Review Mapping'}
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || !selectedVendor || Boolean(preview?.errors)}
                  className="px-6 py-2 bg-surface-dark text-white text-sm rounded hover:bg-surface-dark transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {importing ? 'Importing...' : 'Import Reviewed Catalog'}
                  {!importing && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
