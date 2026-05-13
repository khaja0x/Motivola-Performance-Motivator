"use client";
import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check, RotateCcw, ZoomIn } from 'lucide-react';

interface Props {
  image: string;
  onCropComplete: (croppedImage: Blob) => void;
  onCancel: () => void;
}

export default function ImageCropModal({ image, onCropComplete, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropChange = (crop: any) => setCrop(crop);
  const onZoomChange = (zoom: any) => setZoom(zoom);

  const onCropCompleteInternal = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async () => {
    try {
      const img = await createImage(image);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      ctx.drawImage(
        img,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      return new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/png');
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleApply = async () => {
    const croppedBlob = await getCroppedImg();
    if (croppedBlob) {
      onCropComplete(croppedBlob);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-1.5 h-6 bg-[#D0A479] rounded-full" />
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Crop Logo</h3>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400">
            <X size={24} />
          </button>
        </div>

        {/* Cropper area */}
        <div className="relative flex-1 bg-slate-100 min-h-[400px]">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={onCropChange}
            onCropComplete={onCropCompleteInternal}
            onZoomChange={onZoomChange}
          />
        </div>

        {/* Controls */}
        <div className="p-8 bg-white space-y-6">
          <div className="flex items-center space-x-6">
            <ZoomIn size={18} className="text-slate-400" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#D0A479]"
            />
            <button 
              onClick={() => setZoom(1)}
              className="p-2 hover:bg-slate-50 rounded-xl transition-all text-[#D0A479]" title="Reset Zoom"
            >
              <RotateCcw size={18} />
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <button 
              onClick={onCancel}
              className="px-8 py-4 rounded-2xl text-sm font-black text-slate-500 hover:bg-slate-50 transition-all uppercase tracking-widest"
            >
              Discard
            </button>
            <button 
              onClick={handleApply}
              className="flex items-center px-12 py-4 bg-[#D0A479] text-[#141517] rounded-2xl text-sm font-black hover:scale-105 transition-all shadow-xl shadow-[#D0A479]/20 uppercase tracking-[0.2em]"
            >
              <Check size={20} className="mr-2" strokeWidth={3} />
              Apply Crop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
