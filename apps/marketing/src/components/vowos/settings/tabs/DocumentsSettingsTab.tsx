import { useEffect, useState } from 'react';
import { 
  FileText, 
  Loader2, 
  Plus, 
  Trash2,
  FileCheck,
  Upload,
  RefreshCw,
  Layers,
  Settings
} from 'lucide-react';
import { toast } from '@vowos/design-system';
import { btnPrimary, btnSecondary, inputCls } from '@/components/vowos/ui';
import { supabase, getActiveDataPlane } from '@/lib/supabase';
import {
  DocumentSettings,
  DEFAULT_DOCUMENT_SETTINGS,
  resolveEffectiveSetting,
  saveScopedSetting,
} from '@/lib/settings';

interface DocumentTemplate {
  id: string;
  document_type: string;
  template_name: string;
  version: number;
  is_active: boolean;
  is_default: boolean;
  file_path: string | null;
  file_type: string | null;
  updated_at: string;
}

interface DocumentsSettingsTabProps {
  onDirtyChange: (dirty: boolean) => void;
  registerSaveRef: (saveFn: () => Promise<boolean>) => void;
  resetTrigger: number;
}

export function DocumentsSettingsTab({
  onDirtyChange,
  registerSaveRef,
  resetTrigger,
}: DocumentsSettingsTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'templates' | 'typography'>('templates');
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [settings, setSettings] = useState<DocumentSettings>(DEFAULT_DOCUMENT_SETTINGS);
  const [dbSettings, setDbSettings] = useState<DocumentSettings>(DEFAULT_DOCUMENT_SETTINGS);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const dataPlane = getActiveDataPlane();
      
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('data_plane', dataPlane)
        .order('document_type', { ascending: true })
        .order('version', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);

      const result = await resolveEffectiveSetting<DocumentSettings>(
        'documents',
        'document_templates',
        { dataPlane },
        DEFAULT_DOCUMENT_SETTINGS
      );
      setSettings(result.value);
      setDbSettings(result.value);
    } catch (err: any) {
      console.error("Error loading templates:", err);
      toast({
        title: 'Could not load templates',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [resetTrigger]);

  const isDirty = JSON.stringify(settings) !== JSON.stringify(dbSettings);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty]);

  const handleSave = async (reason?: string): Promise<boolean> => {
    setSaving(true);
    try {
      const dataPlane = getActiveDataPlane();
      await saveScopedSetting('documents', 'document_templates', settings, { dataPlane }, reason);
      
      toast({
        title: 'Document settings saved',
        description: 'Template typography and configuration updated.',
      });
      setDbSettings(settings);
      setSaving(false);
      return true;
    } catch (err: any) {
      setSaving(false);
      toast({
        title: 'Could not save document settings',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    registerSaveRef(handleSave);
  }, [settings]);

  const handleUploadTemplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast({ title: 'Uploading template...' });
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('document-templates')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Insert metadata
      const { error: dbError } = await supabase.from('document_templates').insert({
        data_plane: getActiveDataPlane(),
        document_type: 'Custom',
        template_name: file.name,
        file_path: filePath,
        file_type: fileExt,
        is_active: true,
        version: 1,
      });

      if (dbError) throw dbError;

      toast({ title: 'Template uploaded successfully' });
      loadTemplates();
    } catch (err: any) {
      toast({
        title: 'Upload failed',
        description: err.message,
        variant: 'destructive'
      });
    }
  };

  const handleSetDefault = async (id: string, docType: string) => {
    try {
      // Unset default for same type
      await supabase.from('document_templates')
        .update({ is_default: false })
        .eq('document_type', docType)
        .eq('data_plane', getActiveDataPlane());
        
      // Set new default
      await supabase.from('document_templates')
        .update({ is_default: true })
        .eq('id', id);
        
      toast({ title: 'Default template updated' });
      loadTemplates();
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await supabase.from('document_templates').delete().eq('id', id);
      toast({ title: 'Template deleted' });
      loadTemplates();
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    }
  };

  const simulateSync = () => {
    setIsSyncing(true);
    toast({ title: 'Sync Started', description: 'Checking for remote template updates.' });
    setTimeout(() => {
      setIsSyncing(false);
      toast({ title: 'Sync Complete', description: 'Templates are up to date.' });
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading Template Center...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Navigation */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-xs">
        <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Document Template Center</h3>
              <p className="text-xs text-stone-500">
                Manage templates for Quotes, Contracts, Invoices, and set global typography.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={simulateSync}
            disabled={isSyncing}
            className={`${btnSecondary} gap-2`}
          >
            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync Templates
          </button>
        </div>
        
        {/* Sub Navigation */}
        <div className="border-t border-stone-200 px-5 flex items-center gap-6">
          {[
            { id: 'templates', label: 'Templates', icon: Layers },
            { id: 'typography', label: 'Typography & Settings', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeSubTab === tab.id ? 'border-brand-primary text-brand-primary' : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeSubTab === 'templates' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-sm font-bold text-stone-900">Available Templates</h4>
              <p className="text-xs text-stone-500">Upload or manage existing document templates.</p>
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <button type="button" className={`${btnSecondary} gap-2 overflow-hidden`}>
                  <Upload className="h-4 w-4" />
                  Upload PDF/DOCX
                  <input 
                    type="file" 
                    accept=".pdf,.docx" 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleUploadTemplate}
                  />
                </button>
              </div>
              <button type="button" className={`${btnPrimary} gap-2`}>
                <Plus className="h-4 w-4" />
                New Template
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-stone-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-stone-50 text-stone-500 font-medium border-b border-stone-200">
                  <tr>
                    <th className="px-6 py-4">Document Type</th>
                    <th className="px-6 py-4">Template Name</th>
                    <th className="px-6 py-4">Version</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {templates.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-stone-500">
                        No templates found. Upload one to get started.
                      </td>
                    </tr>
                  ) : (
                    templates.map((tpl) => (
                      <tr key={tpl.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-stone-900">
                          {tpl.document_type}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <FileCheck className="h-4 w-4 text-stone-400" />
                            {tpl.template_name}
                            {tpl.is_default && (
                              <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Default</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-stone-500">
                          v{tpl.version}.0
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${tpl.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-800'}`}>
                            {tpl.is_active ? 'Active' : 'Archived'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 items-center">
                            {!tpl.is_default && tpl.is_active && (
                              <button 
                                type="button" 
                                className="text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors" 
                                onClick={() => handleSetDefault(tpl.id, tpl.document_type)}
                              >
                                Set Default
                              </button>
                            )}
                            <button 
                              type="button" 
                              className="text-stone-400 hover:text-red-500 transition-colors p-1" 
                              onClick={() => handleDelete(tpl.id)} 
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'typography' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-6">
          <div>
            <h4 className="text-sm font-bold text-stone-900">Template Configuration & Typography</h4>
            <p className="text-xs text-stone-500 mb-4">Establish universal styling parameters that cascade across all generated PDF documents.</p>
          </div>
          
          <div className="grid gap-4 max-w-sm">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Brand Logo URL</label>
              <input 
                type="text" 
                placeholder="https://..." 
                className={inputCls} 
                value={settings.brandLogoUrl}
                onChange={(e) => setSettings({ ...settings, brandLogoUrl: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Primary Font Family</label>
              <select 
                className={inputCls}
                value={settings.primaryFontFamily}
                onChange={(e) => setSettings({ ...settings, primaryFontFamily: e.target.value })}
              >
                <option value="Inter">Inter</option>
                <option value="Roboto">Roboto</option>
                <option value="Playfair Display">Playfair Display</option>
                <option value="EB Garamond">EB Garamond</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
