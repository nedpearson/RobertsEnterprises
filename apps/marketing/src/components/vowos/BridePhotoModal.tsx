import { useState, useRef, useEffect } from 'react';
import { Customer } from '@/data/vowosData';
import { useVowosData } from '@/contexts/VowosDataContext';
import { Modal } from './ui';
import { Upload, Camera, RotateCcw, RotateCw, ZoomIn, ZoomOut, Trash2, Check, X, RefreshCw, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { toast } from '@vowos/design-system';

interface BridePhotoModalProps {
  open: boolean;
  onClose: () => void;
  bride: Customer;
}

export default function BridePhotoModal({ open, onClose, bride }: BridePhotoModalProps) {
  const { updateBridePhoto } = useVowosData();
  const [tab, setTab] = useState<'upload' | 'camera'>('upload');

  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sourceImage, setSourceImage] = useState<string | null>(null);

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  // Crop / Transform state
  const [zoom, setZoom] = useState(1.0);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Stop camera stream on unmount or tab switch
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
      setSourceImage(null);
      setCapturedPhoto(null);
      setZoom(1.0);
      setRotation(0);
    }
  }, [open]);

  useEffect(() => {
    if (open && tab === 'camera' && !capturedPhoto) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open, tab, facingMode, capturedPhoto]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Unable to access camera. Please check browser permissions or use file upload.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file type', description: 'Please select a valid image file (JPEG, PNG, WebP).', variant: 'destructive' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Please select an image smaller than 10MB.', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSourceImage(event.target.result as string);
        setZoom(1.0);
        setRotation(0);
      }
    };
    reader.readAsDataURL(file);
  };

  const snapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontally if front camera for natural mirror preview
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedPhoto(dataUrl);
    setSourceImage(dataUrl);
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setSourceImage(null);
    startCamera();
  };

  const handleSavePhoto = async () => {
    const imgUrl = sourceImage || capturedPhoto;
    if (!imgUrl) return;

    setSaving(true);
    try {
      // Process image onto normalized 400x400 output canvas
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imgUrl;
      await new Promise((resolve) => (img.onload = resolve));

      const canvas = document.createElement('canvas');
      const size = 400;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);

        ctx.save();
        ctx.translate(size / 2, size / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(zoom, zoom);

        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, -size / 2, -size / 2, size, size);
        ctx.restore();

        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        await updateBridePhoto(bride.id, croppedDataUrl);
        toast({ title: 'Profile photo updated', description: `Saved new photograph for ${bride.name}` });
        onClose();
      }
    } catch (err: any) {
      console.error('Failed to save bride photo:', err);
      toast({ title: 'Save failed', description: 'Could not process photograph. Please try another image.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (confirm(`Remove profile photo for ${bride.name}?`)) {
      setSaving(true);
      await updateBridePhoto(bride.id, null);
      toast({ title: 'Profile photo removed', description: `Returned ${bride.name} to initials avatar` });
      setSaving(false);
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Manage Profile Photo — ${bride.name}`}>
      <div className="space-y-5 select-none">
        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-200 gap-2">
          <button
            onClick={() => {
              setTab('upload');
              stopCamera();
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
              tab === 'upload' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Upload className="h-4 w-4" /> Upload File
          </button>
          <button
            onClick={() => {
              setTab('camera');
              setCapturedPhoto(null);
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
              tab === 'camera' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Camera className="h-4 w-4" /> Take Photo
          </button>
        </div>

        {/* Tab 1: Upload */}
        {tab === 'upload' && !sourceImage && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50/50 p-8 text-center cursor-pointer hover:border-brand-primary hover:bg-brand-soft/30 transition-all"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-primary mb-3 shadow-xs">
              <ImageIcon className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-stone-800">Click to choose or drag & drop photograph</p>
            <p className="text-xs text-stone-400 mt-1">Supports JPEG, PNG, WebP up to 10MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* Tab 2: Camera Stream */}
        {tab === 'camera' && !capturedPhoto && (
          <div className="space-y-3">
            {cameraError ? (
              <div className="rounded-xl border border-border-subtle bg-brand-soft p-4 text-center text-xs text-brand-primary space-y-2">
                <AlertCircle className="h-6 w-6 mx-auto text-brand-primary" />
                <p className="font-semibold">{cameraError}</p>
                <button
                  onClick={() => setTab('upload')}
                  className="rounded-lg bg-brand-primary text-white px-3 py-1.5 text-xs font-medium hover:bg-brand-primary-hover transition-colors"
                >
                  Switch to Upload File
                </button>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-2xl bg-stone-950 aspect-video flex items-center justify-center shadow-inner">
                <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setFacingMode((m) => (m === 'user' ? 'environment' : 'user'))}
                    className="rounded-full bg-stone-900/80 p-2.5 text-white hover:bg-stone-900 shadow-md backdrop-blur transition-colors"
                    title="Switch Camera"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={snapPhoto}
                    className="flex items-center gap-2 rounded-full bg-brand-primary px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-brand-primary-hover transition-transform active:scale-95"
                  >
                    <Camera className="h-4 w-4" /> Snap Photo
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Image Editor & Crop Controls (when source image is ready) */}
        {sourceImage && (
          <div className="space-y-4">
            <div className="relative flex justify-center bg-stone-900 p-4 rounded-2xl overflow-hidden shadow-inner">
              <div className="relative h-64 w-64 rounded-full overflow-hidden border-4 border-white shadow-2xl">
                <img
                  src={sourceImage}
                  alt="Crop preview"
                  className="h-full w-full object-cover transition-transform duration-75"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  }}
                />
              </div>
            </div>

            {/* Transform Sliders & Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-xs">
              <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                <ZoomOut className="h-4 w-4 text-stone-400" />
                <input
                  type="range"
                  min="1.0"
                  max="3.0"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-rose-500"
                />
                <ZoomIn className="h-4 w-4 text-stone-400" />
                <span className="font-semibold text-stone-700 w-8">{zoom.toFixed(1)}x</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                  className="rounded-lg border border-stone-200 bg-white p-2 text-stone-600 hover:bg-stone-100 transition-colors"
                  title="Rotate Left"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="rounded-lg border border-stone-200 bg-white p-2 text-stone-600 hover:bg-stone-100 transition-colors"
                  title="Rotate Right"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
                {capturedPhoto && (
                  <button
                    onClick={retakePhoto}
                    className="rounded-lg border border-stone-200 bg-white px-2.5 py-2 font-semibold text-stone-600 hover:bg-stone-100 transition-colors"
                  >
                    Retake
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between border-t border-stone-200 pt-4">
          {bride.profilePhotoUrl ? (
            <button
              onClick={handleRemovePhoto}
              disabled={saving}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-primary hover:text-brand-primary-hover transition-colors"
            >
              <Trash2 className="h-4 w-4" /> Remove Photo
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            {sourceImage && (
              <button
                onClick={handleSavePhoto}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-brand-primary-hover transition-colors disabled:opacity-50"
              >
                <Check className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Profile Photo'}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
