"use client";

import React, { useState, useCallback } from 'react';
import Cropper, { Point, Area } from 'react-easy-crop';
import { getCroppedImg } from '@/lib/cropUtils';

interface PhotoCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImage: Blob) => void;
  onCancel: () => void;
}

const PhotoCropper: React.FC<PhotoCropperProps> = ({ imageSrc, onCropComplete, onCancel }) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropChange = (crop: Point) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onRotationChange = (rotation: number) => {
    setRotation(rotation);
  };

  const onCropCompleteInternal = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleApply = async () => {
    if (!croppedAreaPixels) return;
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      if (croppedImage) {
        onCropComplete(croppedImage);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel} />
      
      <div className="relative bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white">
          <h3 className="font-bold text-slate-900 ml-2">Crop Photo</h3>
          <button 
            onClick={onCancel}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold rounded-lg transition-colors border border-slate-200"
          >
            Close
          </button>
        </div>

        {/* Cropper Container */}
        <div className="relative w-full h-[350px] bg-[#1a1c22]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={onCropChange}
            onCropComplete={onCropCompleteInternal}
            onZoomChange={onZoomChange}
            onRotationChange={onRotationChange}
          />
        </div>

        {/* Controls */}
        <div className="p-6 bg-white space-y-6">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Zoom</span>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => onZoomChange(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#C69A70]"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Rotate</span>
                <span>{rotation}°</span>
              </div>
              <input
                type="range"
                value={rotation}
                min={0}
                max={360}
                step={1}
                aria-labelledby="Rotation"
                onChange={(e) => onRotationChange(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#C69A70]"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="px-4 py-2 bg-slate-50 border border-slate-100 text-slate-600 text-[11px] font-bold rounded-lg hover:bg-slate-100 transition-colors"
            >
              Rotate 90°
            </button>
            <button 
              onClick={() => {
                setZoom(1);
                setRotation(0);
                setCrop({ x: 0, y: 0 });
              }}
              className="px-4 py-2 bg-slate-50 border border-slate-100 text-slate-600 text-[11px] font-bold rounded-lg hover:bg-slate-100 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button 
            onClick={onCancel}
            className="px-6 py-2 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors bg-slate-100"
          >
            Cancel
          </button>
          <button 
            onClick={handleApply}
            className="px-8 py-2 rounded-xl font-bold bg-[#0F764E] text-white hover:bg-[#0c6140] shadow-sm transition-all"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhotoCropper;
