"use client";
import React, { useState } from 'react';
import { Building2, Database, Loader2, X, Eye, Clock, Zap, Star, CheckCircle2, AlertCircle } from 'lucide-react';
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

export default function WhatsAppTab({
  formData, handleInputChange, setFormData, isEditMode, isSaving, successMsg, errorMsg, saveChanges
}: Props) {
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <div className="p-10 space-y-10">
      <div className="flex items-center justify-between border-b border-slate-100 pb-6">
        <h2 className="text-lg font-bold text-slate-900">WhatsApp & Engagement</h2>
      </div>

      <div className="space-y-8">
        {/* API Key */}
        <div className="space-y-3">
          <label className="text-[13px] font-bold text-slate-700 block">WhatsApp API Key</label>
          <div className="relative group">
            <input
              type={showApiKey ? "text" : "password"}
              name="whatsapp_api_key"
              placeholder="••••••••••••••••••••••••••••••••"
              maxLength={255}
              value={formData.whatsapp_api_key || ""}
              onChange={handleInputChange}
              disabled={!isEditMode}
              className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-[#D0A479]/20 focus:border-[#D0A479] outline-none transition-all text-sm disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed shadow-sm pr-12"
            />
            <button type="button" onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showApiKey ? <X size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
          {/* Sender ID */}
          <div className="space-y-3">
            <label className="text-[13px] font-bold text-slate-700 block">Sender ID</label>
            <input type="text" name="whatsapp_sender_id" maxLength={50} placeholder="e.g. 109384729"
              value={formData.whatsapp_sender_id || ""} onChange={handleInputChange} disabled={!isEditMode}
              className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-[#D0A479]/20 focus:border-[#D0A479] outline-none transition-all text-sm disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed shadow-sm"
            />
          </div>

          {/* Nudge Time */}
          <div className="space-y-3">
            <label className="text-[13px] font-bold text-slate-700 block">Daily Nudge Time</label>
            <div className="relative">
              <select name="daily_nudge_time" value={formData.daily_nudge_time ?? "09:00"} onChange={handleInputChange} disabled={!isEditMode}
                className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-[#D0A479]/20 focus:border-[#D0A479] outline-none transition-all text-sm bg-white disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed appearance-none shadow-sm pr-12"
              >
                <option value="08:00">08:00 AM</option>
                <option value="09:00">09:00 AM</option>
                <option value="10:00">10:00 AM</option>
                <option value="11:00">11:00 AM</option>
              </select>
              <Clock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            </div>
          </div>
        </div>

        {/* AI Tone */}
        <div className="space-y-4">
          <label className="text-[13px] font-bold text-slate-700 block">AI Tone</label>
          <div className="flex flex-wrap gap-4">
            {[
              { name: 'Professional', icon: Building2 },
              { name: 'Energetic', icon: Zap },
              { name: 'Competitive', icon: Star }
            ].map((tone) => (
              <button key={tone.name}
                onClick={() => isEditMode && setFormData((prev: any) => ({ ...prev, ai_tone: tone.name }))}
                className={cn(
                  "flex items-center px-6 py-2.5 rounded-2xl border font-bold text-[13px] transition-all",
                  formData.ai_tone === tone.name
                    ? "bg-[#D0A479]/10 border-[#D0A479] text-[#141517]"
                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                )}
              >
                <tone.icon size={16} className={cn("mr-2", formData.ai_tone === tone.name ? "text-[#D0A479]" : "text-slate-400")} />
                {tone.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Save Row */}
      <div className="pt-8 border-t border-slate-50 flex items-center justify-between">
        <p className={cn("text-xs font-semibold transition-all flex items-center",
          successMsg ? "text-emerald-600" : errorMsg ? "text-red-600" : "text-slate-400"
        )}>
          {successMsg ? (<><CheckCircle2 size={14} className="mr-1.5" /> {successMsg}</>) :
           errorMsg ? (<><AlertCircle size={14} className="mr-1.5" /> {errorMsg}</>) :
           "Changes are saved locally"}
        </p>
        <button onClick={saveChanges} disabled={isSaving}
          className="flex items-center px-8 py-3.5 bg-[#D0A479] hover:bg-[#b88c62] text-[#141517] rounded-2xl text-[13px] font-black transition-all shadow-xl shadow-[#D0A479]/20 disabled:opacity-50"
        >
          {isSaving ? (<><Loader2 size={18} className="animate-spin mr-2" /> Saving...</>) :
           (<><Database size={18} className="mr-2" /> {isEditMode ? 'Save All Changes' : 'Edit Configuration'}</>)}
        </button>
      </div>
    </div>
  );
}
