import { supabase } from '../../index';

export class FileStorageEngine {
  static async uploadFile(businessId: string, locationId: string, customerId: string, appointmentId: string, uploadedBy: string, file: File, category: string, privacy: string) {
    // 1. Upload to Supabase Storage (assuming bucket 'appointment-media')
    const path = `${businessId}/${appointmentId}/${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('appointment-media')
      .upload(path, file);

    if (uploadError) throw uploadError;

    // 2. Create canonical file record
    const { data: fileRecord, error: dbError } = await supabase
      .from('files')
      .insert([{
        business_id: businessId,
        location_id: locationId,
        customer_id: customerId,
        appointment_id: appointmentId,
        uploaded_by: uploadedBy,
        category,
        mime_type: file.type,
        size_bytes: file.size,
        storage_path: path,
        privacy_level: privacy
      }])
      .select()
      .single();

    if (dbError) throw dbError;
    return fileRecord;
  }

  static async getAppointmentFiles(appointmentId: string, businessId: string) {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('appointment_id', appointmentId)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Generate signed URLs for preview
    const filesWithUrls = await Promise.all(data.map(async (file) => {
      const { data: urlData } = await supabase.storage.from('appointment-media').createSignedUrl(file.storage_path, 3600);
      return { ...file, signedUrl: urlData?.signedUrl };
    }));

    return filesWithUrls;
  }
}
