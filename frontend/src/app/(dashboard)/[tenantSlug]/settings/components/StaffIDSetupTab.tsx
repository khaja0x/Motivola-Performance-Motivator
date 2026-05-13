"use client";
import React from 'react';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  formData: Record<string, any>;
  handleInputChange: React.ChangeEventHandler<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
  setFormData: (action: any) => void;
  isEditMode: boolean;
  isSaving: boolean;
  successMsg: string;
  errorMsg: string;
  saveChanges: () => void;
}

export default function StaffIDSetupTab({
  formData, handleInputChange, setFormData, isEditMode, isSaving, successMsg, errorMsg, saveChanges
}: Props) {
  return (
    <div className="p-10 space-y-10">
      <div className="border-b border-slate-100 pb-8">
        <h2 className="text-lg font-bold text-slate-900">Staff ID Series Setup</h2>
        <p className="text-slate-500 mt-1 text-[13px]">Configure how the system generates new Staff Codes.</p>
      </div>

      <div className="max-w-3xl space-y-12">
        {/* Generation Mode Toggle */}
        <div className="space-y-4">
          <label className="text-[13px] font-bold text-slate-800 block mb-1">Generation Mode</label>
          <div className="p-1 bg-slate-100 rounded-2xl w-fit flex items-center border border-slate-200 shadow-inner">
            <button
              onClick={() => isEditMode && setFormData((prev: any) => ({ ...prev, staff_id_generation_mode: 'Automatic' }))}
              disabled={!isEditMode}
              className={cn("px-8 py-2.5 rounded-xl text-xs font-black transition-all",
                (formData.staff_id_generation_mode || 'Automatic') === 'Automatic'
                  ? "bg-[#D0A479] text-[#141517] shadow-xl shadow-[#D0A479]/20"
                  : "text-slate-400 hover:text-slate-600"
              )}
            >Automatic</button>
            <button
              onClick={() => isEditMode && setFormData((prev: any) => ({ ...prev, staff_id_generation_mode: 'Manual' }))}
              disabled={!isEditMode}
              className={cn("px-8 py-2.5 rounded-xl text-xs font-black transition-all",
                formData.staff_id_generation_mode === 'Manual'
                  ? "bg-[#D0A479] text-[#141517] shadow-xl shadow-[#D0A479]/20"
                  : "text-slate-400 hover:text-slate-600"
              )}
            >Manual</button>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            {formData.staff_id_generation_mode === 'Manual'
              ? "Admin will manually input Staff IDs during registration."
              : "System will sequence IDs based on prefix and start number."}
          </p>
        </div>

        {/* Prefix */}
        <div className="space-y-4">
          <label className="text-[13px] font-bold text-slate-800 block mb-1">Prefix (e.g., EMP-, ABC-)</label>
          <input type="text" name="staff_id_prefix" maxLength={10} placeholder="e.g. EMP-"
            value={formData.staff_id_prefix || ""}
            onChange={handleInputChange}
            disabled={!isEditMode || formData.staff_id_generation_mode === 'Manual'}
            className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-[#D0A479]/10 focus:border-[#D0A479] outline-none transition-all text-[13px] shadow-sm disabled:bg-slate-50 disabled:text-slate-500 disabled:opacity-50"
          />
        </div>

        {/* Start Number */}
        <div className="space-y-4">
          <label className="text-[13px] font-bold text-slate-800 block mb-1">Start Number</label>
          <input type="number" name="staff_id_start_number" min="1" placeholder="e.g. 1"
            value={formData.staff_id_start_number || 1}
            onChange={handleInputChange}
            disabled={!isEditMode || formData.staff_id_generation_mode === 'Manual'}
            className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-[#D0A479]/10 focus:border-[#D0A479] outline-none transition-all text-[13px] shadow-sm disabled:bg-slate-50 disabled:text-slate-500 disabled:opacity-50"
          />
        </div>

        {/* Padding Slider */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <label className="text-[13px] font-bold text-slate-800 block">Number Padding (Digits)</label>
            <div className="w-10 h-10 rounded-xl bg-[#D0A479]/10 text-[#D0A479] font-bold flex items-center justify-center text-lg border border-[#D0A479]/20">
              {formData.staff_id_padding || 4}
            </div>
          </div>
          <div className="space-y-2">
            <input type="range" min="1" max="5" step="1" name="staff_id_padding"
              value={formData.staff_id_padding || 4}
              onChange={(e) => isEditMode && setFormData((prev: any) => ({ ...prev, staff_id_padding: parseInt(e.target.value) }))}
              disabled={!isEditMode || formData.staff_id_generation_mode === 'Manual'}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#D0A479] disabled:cursor-not-allowed disabled:opacity-50"
            />
            <div className="flex justify-between px-1">
              {[1,2,3,4,5].map(val => (
                <span key={val} className="text-[10px] font-bold text-slate-300">{val}</span>
              ))}
            </div>
            <p className="text-[12px] text-slate-400 mt-2">Controls how many digits are shown (e.g., 3 digits → 001).</p>
          </div>
        </div>

        {/* Preview Box */}
        <div className="relative group overflow-hidden rounded-[25px]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#D0A479]/5 to-transparent"></div>
          <div className="relative p-12 rounded-[25px] bg-slate-50/50 border border-[#D0A479]/10 flex flex-col items-center justify-center text-center space-y-6 shadow-sm">
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D0A479] animate-pulse"></span>
              <span className="text-[10px] font-black text-[#D0A479] tracking-[0.3em] uppercase">Next Generated ID Preview</span>
            </div>
            <div className="bg-white px-10 py-6 rounded-2xl shadow-[0_10px_30px_rgba(208,164,121,0.08)] border border-white">
              <h3 className="text-4xl font-black tracking-tight text-[#141517] font-mono">
                {formData.staff_id_prefix || ""}
                {(formData.staff_id_start_number || 1).toString().padStart(formData.staff_id_padding || 4, '0')}
                {formData.staff_id_suffix || ""}
              </h3>
            </div>
            <p className="text-[12px] text-slate-400 font-medium">Auto-increments for every new staff record created</p>
          </div>
        </div>
      </div>

      {/* Footer Save Row */}
      <div className="pt-10 border-t border-slate-50 flex items-center justify-between">
        <p className={cn("text-sm font-semibold transition-all flex items-center",
          successMsg ? "text-emerald-600" : errorMsg ? "text-red-600" : "text-slate-400"
        )}>
          {successMsg ? (<><CheckCircle2 size={16} className="mr-2" /> Settings updated successfully</>) :
           errorMsg ? (<><AlertCircle size={16} className="mr-2" /> {errorMsg}</>) :
           "All changes will affect future staff IDs"}
        </p>
        <button onClick={saveChanges} disabled={isSaving}
          className="flex items-center px-12 py-5 bg-[#D0A479] hover:bg-[#b88c62] text-[#141517] rounded-[20px] text-[13px] font-bold transition-all shadow-2xl shadow-[#D0A479]/20 disabled:opacity-50"
        >
          {isSaving ? (<><Loader2 size={20} className="animate-spin mr-3" /> Saving...</>) :
           (<>{isEditMode ? 'Save Configuration' : 'Edit Series Logic'}</>)}
        </button>
      </div>
    </div>
  );
}
