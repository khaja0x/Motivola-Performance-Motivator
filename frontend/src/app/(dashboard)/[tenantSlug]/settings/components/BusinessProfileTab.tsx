"use client";
import React, { useState } from 'react';
import { Building2, Upload, Loader2, Database, Plus, Trash2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  formData: Record<string, any>;
  handleInputChange: React.ChangeEventHandler<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
  triggerLogoUpload: () => void;
  handleRemoveLogo: () => Promise<void>;
  handleViewLogo: () => void;
  getFullUrl: (path: string | undefined | null) => string | null;
  isEditMode: boolean;
  isSaving: boolean;
  successMsg: string;
  errorMsg: string;
  saveChanges: () => void;
}

export default function BusinessProfileTab({
  formData, handleInputChange, triggerLogoUpload,
  handleRemoveLogo, handleViewLogo,
  getFullUrl, isEditMode, isSaving,
  successMsg, errorMsg, saveChanges
}: Props) {
  const [isLogoMenuOpen, setIsLogoMenuOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const onRemoveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRemoving(true);
    try {
      await handleRemoveLogo();
      setIsLogoMenuOpen(false);
    } finally {
      setIsRemoving(false);
    }
  };

  const onViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleViewLogo();
    setIsLogoMenuOpen(false);
  };

  const onUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerLogoUpload();
    setIsLogoMenuOpen(false);
  };

  return (
    <div className="p-8 lg:p-12 relative overflow-visible bg-white rounded-[2rem]">
      
      {/* Header section with Logo in the Top Right Corner */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-12 gap-8">
        <div className="space-y-3">
          <div className="flex items-center space-x-4 mb-1">
            <div className="w-1.5 h-10 bg-[#D0A479] rounded-full shadow-[0_0_15px_rgba(208,164,121,0.5)]" />
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Business Profile</h2>
          </div>
          <p className="text-slate-500 text-[15px] font-medium ml-6 border-l border-slate-100 pl-4 max-w-xl">
            Configure your enterprise's core identity, regional settings, and operational parameters.
          </p>
        </div>

        {/* Improved Logo Section - Top Right */}
        <div className="flex flex-col items-end group relative z-20">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 pr-1">Company Token</label>
          <div className="relative">
            <div className={cn(
              "w-40 h-40 rounded-[2.5rem] bg-slate-50 border-2 border-slate-100 flex items-center justify-center overflow-hidden transition-all duration-500 shadow-sm group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] group-hover:border-[#D0A479]/20 group-hover:bg-white",
              !formData.logo_url && "border-dashed"
            )}>
              {formData.logo_url ? (
                <img 
                  src={getFullUrl(formData.logo_url) || ""} 
                  alt="Logo"
                  className="w-full h-full object-contain p-6 transition-transform duration-700 group-hover:scale-110"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon') as HTMLElement;
                    if (fallback) fallback.classList.remove('hidden');
                  }}
                />
              ) : null}
              
              <div className={cn("flex flex-col items-center fallback-icon transition-all duration-500", formData.logo_url ? "hidden" : "text-slate-300 group-hover:text-[#D0A479] group-hover:translate-y-[-4px]")}>
                <Building2 size={44} strokeWidth={1.2} />
                <span className="text-[10px] font-black mt-3 uppercase tracking-widest opacity-40">No Logo</span>
              </div>

              {isRemoving && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-md flex items-center justify-center z-10 transition-all">
                  <div className="flex flex-col items-center">
                    <Loader2 className="animate-spin text-[#D0A479]" size={32} strokeWidth={3} />
                    <span className="text-[9px] font-black text-slate-400 mt-3 tracking-[0.3em]">REMOVING...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Button - Modern Floating Toggle */}
            {isEditMode && (
              <div className="absolute -bottom-1 -right-1 z-30" onMouseLeave={() => setIsLogoMenuOpen(false)}>
                {/* Invisible bridge to prevent closing when moving to menu */}
                {isLogoMenuOpen && <div className="absolute bottom-10 right-0 w-full h-10 bg-transparent" />}
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLogoMenuOpen(!isLogoMenuOpen);
                  }}
                  disabled={isRemoving}
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-500 border-4 border-white active:scale-95",
                    isLogoMenuOpen ? "bg-slate-900 text-white rotate-[135deg]" : "bg-[#D0A479] text-[#141517] hover:scale-110 hover:shadow-[#D0A479]/40"
                  )}
                >
                  <Plus size={24} strokeWidth={2.5} />
                </button>

                {/* Dropdown Menu */}
                {isLogoMenuOpen && (
                  <div 
                    className="absolute bottom-[calc(100%+8px)] right-0 w-56 bg-white rounded-[1.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] border border-slate-100 py-3 z-50 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200"
                  >
                    <button 
                      onClick={onUploadClick}
                      className="w-full flex items-center px-5 py-3 text-[13px] font-bold text-slate-700 hover:bg-slate-50 hover:text-[#D0A479] transition-all"
                    >
                      <Upload size={18} className="mr-3 opacity-60" />
                      {formData.logo_url ? 'Replace Image' : 'Upload New Logo'}
                    </button>
                    {formData.logo_url && (
                      <>
                        <button 
                          onClick={onViewClick}
                          className="w-full flex items-center px-5 py-3 text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-all"
                        >
                          <Eye size={18} className="mr-3 opacity-60" />
                          Expand View
                        </button>
                        <div className="mx-4 my-1 border-t border-slate-50" />
                        <button 
                          onClick={onRemoveClick}
                          className="w-full flex items-center px-5 py-3 text-[13px] font-bold text-red-500 hover:bg-red-50 transition-all"
                        >
                          <Trash2 size={18} className="mr-3 opacity-60" />
                          Delete Branding
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          {isEditMode && <p className="text-[10px] text-slate-400 font-bold mt-8 tracking-tighter opacity-60">High-res PNG or SVG recommended</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">

        {/* Company Name */}
        <div className="space-y-3 lg:col-span-2">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center ml-1">
            Legal Entity Name <span className="text-[#D0A479] ml-1">*</span>
          </label>
          <div className="relative group">
            <input type="text" name="company_name" maxLength={100}
              value={formData.company_name || ""} onChange={handleInputChange} disabled={!isEditMode}
              placeholder="e.g. Global Logistics Inc."
              className="w-full px-6 py-5 rounded-[1.25rem] border-2 border-slate-100 bg-slate-50/20 focus:bg-white focus:border-[#D0A479] focus:ring-[6px] focus:ring-[#D0A479]/5 outline-none transition-all text-lg font-black text-slate-900 disabled:bg-slate-50/50 disabled:text-slate-500 disabled:cursor-not-allowed group-hover:border-slate-200"
            />
          </div>
        </div>

        {/* Brand Display Name */}
        <div className="space-y-3">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
            Brand Alias <span className="text-[#D0A479]/40 lowercase italic font-medium ml-1">(Public)</span>
          </label>
          <input type="text" name="brand_display_name" placeholder="e.g. AcmePay" maxLength={50}
            value={formData.brand_display_name || ""} onChange={handleInputChange} disabled={!isEditMode}
            className="w-full px-6 py-5 rounded-[1.25rem] border-2 border-slate-100 bg-slate-50/20 focus:bg-white focus:border-[#D0A479] focus:ring-[6px] focus:ring-[#D0A479]/5 outline-none transition-all text-base font-bold text-slate-900 disabled:bg-slate-50/50 group-hover:border-slate-200"
          />
        </div>

        {/* Section Divider */}
        <div className="col-span-full flex items-center space-x-4 my-2 opacity-30">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-400 to-transparent" />
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Operational Parameters</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-400 to-transparent" />
        </div>

        {/* Base Currency */}
        <div className="space-y-3">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Functional Currency</label>
          <div className="relative group">
            <select name="currency" value={formData.currency || "USD"} onChange={handleInputChange} disabled={!isEditMode}
              className="w-full px-6 py-5 rounded-[1.25rem] border-2 border-slate-100 bg-slate-50/20 focus:bg-white focus:border-[#D0A479] outline-none transition-all text-base font-black text-slate-900 appearance-none disabled:bg-slate-50/50 disabled:cursor-not-allowed cursor-pointer group-hover:border-slate-200"
            >
              <option value="USD">USD — US Dollar</option>
              <option value="INR">INR — Indian Rupee</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="AED">AED — UAE Dirham</option>
            </select>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:rotate-180 transition-transform">
              <Plus className="rotate-45" size={16} strokeWidth={4} />
            </div>
          </div>
        </div>

        {/* Industry Type */}
        <div className="space-y-3">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Business Domain</label>
          <div className="relative group">
            <select name="industry" value={formData.industry || "Retail"} onChange={handleInputChange} disabled={!isEditMode}
              className="w-full px-6 py-5 rounded-[1.25rem] border-2 border-slate-100 bg-slate-50/20 focus:bg-white focus:border-[#D0A479] outline-none transition-all text-base font-black text-slate-900 appearance-none disabled:bg-slate-50/50 cursor-pointer group-hover:border-slate-200"
            >
              <option value="Retail">Retail Management</option>
              <option value="Finance & Banking">Finance & Fintech</option>
              <option value="Real Estate">Property & Real Estate</option>
              <option value="Hospitality">Tourism & Hospitality</option>
            </select>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
               <div className="w-1.5 h-1.5 rounded-full bg-[#D0A479]" />
            </div>
          </div>
        </div>

        {/* Timezone */}
        <div className="space-y-3">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Universal Timezone</label>
          <select name="timezone" value={formData.timezone || "UTC"} onChange={handleInputChange} disabled={!isEditMode}
            className="w-full px-6 py-5 rounded-[1.25rem] border-2 border-slate-100 bg-slate-50/20 focus:bg-white focus:border-[#D0A479] outline-none transition-all text-base font-black text-slate-900 disabled:bg-slate-50/50"
          >
            <option value="UTC">UTC (Universal Time)</option>
            <option value="Asia/Kolkata">IST (Kolkata, India)</option>
            <option value="Asia/Dubai">GST (Dubai, UAE)</option>
            <option value="America/New_York">EST (New York, USA)</option>
          </select>
        </div>

        {/* Fiscal Year Start */}
        <div className="space-y-3">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Financial Year Start</label>
          <select name="fiscal_year_start" value={formData.fiscal_year_start || "April"} onChange={handleInputChange} disabled={!isEditMode}
            className="w-full px-6 py-5 rounded-[1.25rem] border-2 border-slate-100 bg-slate-50/20 focus:bg-white focus:border-[#D0A479] outline-none transition-all text-base font-black text-slate-900 disabled:bg-slate-50/50"
          >
            <option value="January">January Cycle</option>
            <option value="April">April Cycle</option>
            <option value="July">July Cycle</option>
            <option value="October">October Cycle</option>
          </select>
        </div>

        {/* Default Sales Cycle */}
        <div className="space-y-3">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Default Audit Cycle</label>
          <select name="default_sales_cycle" value={formData.default_sales_cycle || "Monthly"} onChange={handleInputChange} disabled={!isEditMode}
            className="w-full px-6 py-5 rounded-[1.25rem] border-2 border-slate-100 bg-slate-50/20 focus:bg-white focus:border-[#D0A479] outline-none transition-all text-base font-black text-slate-900 disabled:bg-slate-50/50"
          >
            <option value="Weekly">Weekly Review</option>
            <option value="Bi-Weekly">Bi-Weekly Sync</option>
            <option value="Monthly">Monthly Close</option>
            <option value="Quarterly">Quarterly Audit</option>
          </select>
        </div>

        {/* Tax ID */}
        <div className="space-y-3">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Taxation ID / GSTIN</label>
          <input type="text" name="tax_id" maxLength={15} placeholder="e.g. 29AABCU9603R1ZX"
            value={formData.tax_id || ""} onChange={handleInputChange} disabled={!isEditMode}
            className="w-full px-6 py-5 rounded-[1.25rem] border-2 border-slate-100 bg-slate-50/20 focus:bg-white focus:border-[#D0A479] outline-none transition-all text-[15px] font-black tracking-wider text-[#D0A479] disabled:bg-slate-50/50 disabled:text-slate-400"
          />
        </div>

        {/* Full Width Address */}
        <div className="col-span-full space-y-3">
          <div className="flex items-center justify-between ml-1">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Global Headquarters</label>
            {isEditMode && (
              <span className={cn("text-[10px] font-black flex items-center px-3 py-1 rounded-full", (formData.address || '').length > 180 ? "bg-red-50 text-red-500" : "bg-slate-50 text-slate-400")}>
                {(formData.address || '').length} / 200 Characters
              </span>
            )}
          </div>
          <textarea name="address" value={formData.address || ""} onChange={handleInputChange}
            rows={5} maxLength={200} disabled={!isEditMode}
            placeholder="Type the full physical address of your registered headquarters..."
            className="w-full px-8 py-6 rounded-[2rem] border-2 border-slate-100 bg-slate-50/20 focus:bg-white focus:border-[#D0A479] focus:ring-[8px] focus:ring-[#D0A479]/5 outline-none transition-all text-lg font-medium text-slate-900 resize-none disabled:bg-slate-50/50 leading-relaxed"
          />
        </div>

      </div>

      {/* Modern Action Footer */}
      <div className="mt-20 px-8 py-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-8 group/footer">
        <div className="flex items-center space-x-6">
          <div className={cn(
            "w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.1)]",
            successMsg ? "bg-emerald-500 shadow-emerald-500/40 animate-bounce" : errorMsg ? "bg-red-500 shadow-red-500/40 animate-pulse" : "bg-slate-300"
          )} />
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status Report</span>
            <p className={cn("text-sm font-black tracking-tight transition-all",
              successMsg ? "text-emerald-700" : errorMsg ? "text-red-700" : "text-slate-600"
            )}>
              {successMsg || errorMsg || (isEditMode ? "Modifications pending submission" : "Configuration is locked & secured")}
            </p>
          </div>
        </div>
        
        <button 
          onClick={saveChanges} 
          disabled={isSaving}
          className="group relative flex items-center px-12 py-5 overflow-hidden rounded-[1.25rem] transition-all duration-500 active:scale-95"
        >
          {/* Button Background with Hover Effect */}
          <div className="absolute inset-0 bg-[#D0A479] transition-transform duration-500 group-hover:scale-110" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          
          <div className="relative flex items-center text-[#141517] font-black text-sm uppercase tracking-[0.2em]">
            {isSaving ? (
              <><Loader2 className="animate-spin mr-3" size={24} strokeWidth={3} /> UPDATING...</>
            ) : (
              <>
                <Database size={22} className="mr-3 transition-transform group-hover:translate-y-[-2px]" />
                {isEditMode ? 'Commit Profiles' : 'Unlock Settings'}
              </>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
