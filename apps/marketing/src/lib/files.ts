import { supabase } from '@/lib/supabase';

export interface FileRecord {
  id: string;
  business_id: string;
  location_id: string | null;
  customer_id: string | null;
  appointment_id: string | null;
  uploaded_by: string;
  category: string;
  description: string | null;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  thumbnail_path: string | null;
  privacy_level: string;
  retention_status: string;
  created_at: string;
}

export async function fetchFilesByAppointment(appointmentId: string) {
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('appointment_id', appointmentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as FileRecord[];
}

export async function uploadFile(
  file: File,
  metadata: Partial<FileRecord>,
  bucket: string = 'customer-uploads'
) {
  const fileExt = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  // Unique per upload. The previous key was the literal string "0.5.<ext>", so
  // every upload for a tenant overwrote the previous one in storage.
  const unique = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const scope = metadata.appointment_id ? `appointments/${metadata.appointment_id}` : 'general';
  const filePath = `${metadata.business_id}/${scope}/${unique}.${fileExt}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('files')
    .insert([
      {
        ...metadata,
        storage_path: filePath,
        mime_type: file.type,
        size_bytes: file.size,
      },
    ])
    .select();

  if (error) throw error;
  return data[0];
}
