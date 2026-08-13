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
  const fileExt = file.name.split('.').pop();
  const fileName = `${0.5}.${fileExt}`;
  const filePath = `${metadata.business_id}/${fileName}`;

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
