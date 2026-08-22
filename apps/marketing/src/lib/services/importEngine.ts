import Papa from 'papaparse';
import { supabase } from '../supabase';
import { ImportJob, ImportStagingRecord } from '../../types/catalog';

export interface FieldMapping {
  csvHeader: string;
  mappedField: string; // 'style_number', 'color', 'size', 'cost_cents', 'retail_cents'
}

type WorkerPreview = {
  mapping: Record<string, string>;
  totalRows: number;
  errors: number;
  warnings: number;
  preview: Array<{ rowNumber: number; mapped: Record<string, unknown> & { warnings: string[]; errors: string[] } }>;
};

async function fulfillmentRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sign in again to import a catalog.');
  const apiUrl = import.meta.env.VITE_API_URL || '';
  const response = await fetch(`${apiUrl}/api/fulfillment${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || 'The import service could not process this catalog.');
  return payload;
}

export const importEngine = {
  async parseCSV(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data);
        },
        error: (error: any) => {
          reject(error);
        }
      });
    });
  },

  async previewImport(vendorId: string, rawData: Record<string, unknown>[], mapping?: Record<string, string>): Promise<WorkerPreview> {
    return fulfillmentRequest<WorkerPreview>('/catalog-imports/preview', { vendorId, rows: rawData, mapping });
  },

  async commitImport(vendorId: string, fileName: string, rawData: Record<string, unknown>[], mapping: FieldMapping[]) {
    const normalizedMapping = Object.fromEntries(
      mapping.filter((entry) => entry.csvHeader && entry.mappedField && entry.mappedField !== 'ignore').map((entry) => [entry.csvHeader, entry.mappedField]),
    );
    return fulfillmentRequest<{ batchId: string; imported: number; warnings: number; errors: number }>('/catalog-imports/commit', {
      vendorId, fileName, rows: rawData, mapping: normalizedMapping,
    });
  }
};
