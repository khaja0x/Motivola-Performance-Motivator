"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, MapPin, MessageSquare, Database, Users, IdCard, Coins, Loader2
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

// Import Tab Components
import BusinessProfileTab from './components/BusinessProfileTab';
import StoresTeamsTab from './components/StoresTeamsTab';
import StaffManagementTab from './components/StaffManagementTab';
import WhatsAppTab from './components/WhatsAppTab';
import DataIntegrationTab from './components/DataIntegrationTab';
import CommissionRulesTab from './components/CommissionRulesTab';
import StaffIDSetupTab from './components/StaffIDSetupTab';

// --- Types ---
interface CompanyData {
  company_name: string;
  company_slug: string;
  industry: string;
  currency: string;
  currency_symbol: string;
  timezone: string;
  brand_display_name: string;
  address: string;
  logo_url: string;
  fiscal_year_start: string;
  default_sales_cycle: string;
  tax_id: string;
  whatsapp_api_key: string;
  whatsapp_sender_id: string;
  daily_nudge_time: string;
  ai_tone: string;
  primary_source: string;
  sync_frequency: string;
  source_url: string;
  last_sync_at: string;
  staff_id_prefix: string;
  staff_id_suffix: string;
  staff_id_start_number: number;
  staff_id_padding: number;
  staff_id_generation_mode: string;
  [key: string]: any;
}

// Default values – every field is always defined to prevent controlled/uncontrolled flips
// Default values – every field is always defined to prevent controlled/uncontrolled flips
const FORM_DEFAULTS: CompanyData = {
  company_name: '', company_slug: '', industry: 'Retail', currency: 'USD',
  currency_symbol: '$', timezone: 'UTC', brand_display_name: '', address: '',
  logo_url: '', fiscal_year_start: 'April', default_sales_cycle: 'Monthly',
  tax_id: '', whatsapp_api_key: '', whatsapp_sender_id: '',
  daily_nudge_time: '09:00', ai_tone: 'Professional',
  primary_source: 'CSV Upload', sync_frequency: 'Daily',
  source_url: '', last_sync_at: '',
  staff_id_prefix: 'EMP', staff_id_suffix: '', staff_id_start_number: 1,
  staff_id_padding: 4, staff_id_generation_mode: 'Automatic',
};

/** Ensure every key from FORM_DEFAULTS has a non-null/undefined value */
const sanitizeFormData = (data: any): CompanyData => {
  const result = { ...FORM_DEFAULTS };
  if (!data || typeof data !== 'object') return result;

  Object.keys(FORM_DEFAULTS).forEach((key) => {
    const val = data[key];
    if (val !== null && val !== undefined && val !== "") {
      result[key] = val;
    } else {
      // Keep the default from FORM_DEFAULTS if the value is null/undefined/empty
      result[key] = FORM_DEFAULTS[key as keyof CompanyData];
    }
  });
  return result;
};

interface UserProfile {
  email: string;
  role: string;
  full_name?: string;
  company: CompanyData;
}

export default function ConfigurationPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;
  const searchParams = useSearchParams();
  const { success: showToastSuccess, error: showToastError } = useToast();

  const [activeTab, setActiveTab] = useState('Business Profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormDataRaw] = useState<CompanyData>({ ...FORM_DEFAULTS });

  // Cropping State
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  // Wrapped setter that sanitizes every update to guarantee no field is ever undefined
  const setFormData: React.Dispatch<React.SetStateAction<CompanyData>> = (action) => {
    setFormDataRaw(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      return sanitizeFormData(next);
    });
  };
  const logoFileRef = useRef<HTMLInputElement>(null);
  
  // Custom Hook or Component Import
  const ImageCropModal = require('./components/ImageCropModal').default;

  const showError = (msg: any) => {
    if (msg && typeof msg === 'object') {
      const formatted = Array.isArray(msg) ? msg.map((d: any) => d.msg || JSON.stringify(d)).join(', ') : JSON.stringify(msg);
      showToastError(formatted);
    } else {
      showToastError(msg || "An unexpected error occurred");
    }
  };

  const showSuccess = (msg: string) => {
    showToastSuccess(msg);
  };

  // Helper for full URLs
  const getFullUrl = (path: string | undefined | null) => {
    if (!path || typeof path !== 'string' || ["", "null", "None", "undefined"].includes(path.trim())) return null;
    if (path.startsWith('http')) return path;
    const base = (api.defaults.baseURL || "").replace(/\/$/, '');
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  };

  const TABS = [
    { name: 'Business Profile', icon: Building2 },
    { name: 'Stores / Teams', icon: MapPin },
    { name: 'Staff Management', icon: Users },
    { name: 'WhatsApp', icon: MessageSquare },
    { name: 'Data Integration', icon: Database },
    { name: 'Commission Rules', icon: Coins },
    { name: 'Staff ID Setup', icon: IdCard },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/api/auth/me');
        setProfile(response.data);
        const company = response.data.company || {};
        
        // Sanitize and explicitly set state
        setFormDataRaw(prev => {
          const merged = { ...prev, ...company };
          if (!merged.brand_display_name) {
             merged.brand_display_name = merged.company_name || prev.brand_display_name;
          }
          return sanitizeFormData(merged);
        });
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Sync tab with URL
  const handleTabChange = (tabName: string) => {
    setActiveTab(tabName);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('tab', tabName);
    router.push(`?${newParams.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && TABS.some(t => t.name === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'company_name' && (!prev.brand_display_name || prev.brand_display_name === prev.company_name)) {
        next.brand_display_name = value;
      }
      return next;
    });
    setSuccessMsg("");
  };

  const triggerLogoUpload = () => logoFileRef.current?.click();

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Read file for cropping
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
    
    // Reset file input for next time
    if (logoFileRef.current) logoFileRef.current.value = '';
  };

  const handleFinalLogoUpload = async (croppedBlob: Blob) => {
    setShowCropModal(false);
    setImageToCrop(null);
    
    const fd = new FormData();
    fd.append('file', croppedBlob, 'logo.png');
    try {
      const res = await api.post('/api/auth/company/logo', fd, { 
        headers: { 'Content-Type': 'multipart/form-data' } 
      });
      setFormData(prev => ({ ...prev, logo_url: res.data.logo_url }));
      showSuccess("Logo updated!");
    } catch (err: any) {
      showError(err.response?.data?.detail || "Logo upload failed");
    }
  };

  const handleRemoveLogo = async () => {
    try {
      await api.delete('/api/auth/company/logo');
      setFormData(prev => ({ ...prev, logo_url: '' }));
      showSuccess("Logo removed!");
    } catch (err: any) {
      showError(err.response?.data?.detail || "Logo removal failed");
    }
  };

  const handleViewLogo = () => {
    const url = getFullUrl(formData.logo_url);
    if (url) window.open(url, '_blank');
  };

  const saveChanges = async () => {
    if (!isEditMode) {
      setIsEditMode(true);
      return;
    }
    setIsSaving(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const res = await api.put('/api/auth/company', formData);
      setProfile(prev => prev ? { ...prev, company: res.data } : null);
      setSuccessMsg("Settings saved!");
      setIsEditMode(false);
      showSuccess("Configuration updated!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setErrorMsg("Failed to update settings");
      showError(err.response?.data?.detail || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#D0A479]" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#FCF9F4] -m-8 md:-m-10 min-h-screen">
      <div className="p-8 md:p-10 flex">
        <div className="flex-1 max-w-screen-2xl space-y-8 min-w-0">
          
          <div className="space-y-2 mb-8">
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Configuration</h1>
            <p className="text-slate-500 font-medium text-[13px]">Manage your organisation settings, stores, teams, and integrations.</p>
          </div>

          <div className="bg-white/60 backdrop-blur-md p-2 rounded-[22px] flex items-center space-x-2 shadow-sm border border-white mb-8 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.name;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.name}
                  onClick={() => handleTabChange(tab.name)}
                  className={cn(
                    "flex items-center space-x-2.5 px-6 py-3 rounded-2xl text-[13.5px] font-bold transition-all whitespace-nowrap group",
                    isActive ? "bg-[#D0A479] text-[#141517] shadow-lg" : "text-slate-500 hover:text-slate-900 hover:bg-white"
                  )}
                >
                  <Icon size={17} className={cn(isActive ? "text-[#141517]" : "text-slate-400 group-hover:text-slate-900")} />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[600px]">
            {activeTab === 'Business Profile' && (
              <BusinessProfileTab 
                formData={formData} handleInputChange={handleInputChange} triggerLogoUpload={triggerLogoUpload}
                handleRemoveLogo={handleRemoveLogo} handleViewLogo={handleViewLogo}
                getFullUrl={getFullUrl} isEditMode={isEditMode} isSaving={isSaving}
                successMsg={successMsg} errorMsg={errorMsg} saveChanges={saveChanges}
              />
            )}
            {activeTab === 'Stores / Teams' && (
              <StoresTeamsTab 
                showSuccess={showSuccess} showError={showError} 
                initialEditStoreId={searchParams.get('edit')} initialShowAdd={searchParams.get('add') === 'true'} 
              />
            )}
            {activeTab === 'Staff Management' && (
              <StaffManagementTab showSuccess={showSuccess} showError={showError} getFullUrl={getFullUrl} />
            )}
            {activeTab === 'WhatsApp' && (
              <WhatsAppTab 
                formData={formData} handleInputChange={handleInputChange} setFormData={setFormData}
                isEditMode={isEditMode} isSaving={isSaving} successMsg={successMsg} errorMsg={errorMsg} saveChanges={saveChanges}
              />
            )}
            {activeTab === 'Data Integration' && (
              <DataIntegrationTab formData={formData} setFormData={setFormData} showSuccess={showSuccess} showError={showError} />
            )}
            {activeTab === 'Commission Rules' && (
              <CommissionRulesTab showSuccess={showSuccess} showError={showError} />
            )}
            {activeTab === 'Staff ID Setup' && (
              <StaffIDSetupTab 
                formData={formData} handleInputChange={handleInputChange} setFormData={setFormData}
                isEditMode={isEditMode} isSaving={isSaving} successMsg={successMsg} errorMsg={errorMsg} saveChanges={saveChanges}
              />
            )}
          </div>

          <input type="file" ref={logoFileRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />

          {showCropModal && imageToCrop && (
            <ImageCropModal 
              image={imageToCrop} 
              onCropComplete={handleFinalLogoUpload} 
              onCancel={() => {
                setShowCropModal(false);
                setImageToCrop(null);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
