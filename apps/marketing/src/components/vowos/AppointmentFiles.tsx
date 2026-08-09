import React, { useState } from 'react';
import { Upload, File as FileIcon, X, Image as ImageIcon, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FileRecord } from '@/lib/files';
import { format } from 'date-fns';

interface AppointmentFilesProps {
  files: FileRecord[];
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
}

export default function AppointmentFiles({ files, onUpload, isUploading }: AppointmentFilesProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await onUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await onUpload(e.target.files[0]);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center ${
          dragActive ? 'border-rose-500 bg-rose-50' : 'border-stone-300 hover:bg-stone-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-8 w-8 text-stone-400 mb-2" />
        <p className="text-sm font-medium text-stone-900">
          Drag & drop files here, or click to select
        </p>
        <p className="text-xs text-stone-500 mt-1">Supports JPG, PNG, PDF (up to 10MB)</p>
        <input
          type="file"
          className="hidden"
          id="file-upload"
          onChange={handleChange}
          disabled={isUploading}
        />
        <Button asChild variant="outline" className="mt-4" disabled={isUploading}>
          <label htmlFor="file-upload" className="cursor-pointer">
            {isUploading ? 'Uploading...' : 'Browse Files'}
          </label>
        </Button>
      </div>

      <div className="space-y-3">
        {files.map((f) => (
          <div key={f.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="p-2 bg-stone-100 rounded-lg">
                {f.mime_type.startsWith('image/') ? (
                  <ImageIcon className="h-5 w-5 text-stone-600" />
                ) : (
                  <FileIcon className="h-5 w-5 text-stone-600" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">
                  {f.storage_path.split('/').pop()}
                </p>
                <p className="text-xs text-stone-500">
                  {formatSize(f.size_bytes)} • {format(new Date(f.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="text-stone-400 hover:text-stone-900">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
