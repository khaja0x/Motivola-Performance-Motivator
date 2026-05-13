"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  MapPin, 
  Trash2, 
  Store as StoreIcon, 
  Loader2, 
  FileSpreadsheet, 
  Download, 
  Upload, 
  X,
  Users,
  Box,
  ChevronRight
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface StoreOut {
  store_id: string;
  store_name: string;
  store_code: string | null;
  location: string | null;
  staff_count: number;
  manager_name: string;
}

export default function StoresPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenantSlug as string;
  const { success: showSuccess, error: showError } = useToast();

  const [stores, setStores] = useState<StoreOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/stores');
      setStores(res.data);
    } catch (err) {
      console.error("Failed to fetch stores", err);
      showError("Failed to load stores.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStores = stores.filter(store => 
    store.store_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (store.store_code && store.store_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (store.location && store.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Store Management</h1>
          <p className="text-slate-400 text-[13px] font-medium">Organize and manage your business branches</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl flex items-center space-x-2 transition-all text-[13px] font-bold shadow-sm hover:bg-slate-50 hover:border-slate-300"
          >
            <FileSpreadsheet size={16} className="text-[#0F764E]" />
            <span>Import</span>
          </button>
          
          <button 
            onClick={() => router.push(`/${tenantSlug}/settings?tab=Stores / Teams&add=true`)}
            className="bg-[#C69A70] hover:bg-[#b88c62] text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-all text-[13px] font-bold shadow-lg shadow-[#C69A70]/10"
          >
            <Plus size={16} />
            <span>Add Store</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-3.5 shadow-sm flex items-center justify-between mb-1">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            type="text" 
            placeholder="Search stores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 w-72 rounded-xl border border-slate-100 outline-none transition-all text-[13px] shadow-sm focus:ring-2 focus:ring-[#C69A70]/20 focus:border-[#C69A70] bg-slate-50/50"
          />
        </div>
        
        <div className="flex items-center text-slate-400 text-xs font-medium">
          <Box size={14} className="mr-1.5" />
          Showing {filteredStores.length} stores
        </div>
      </div>

      {/* Grid Content */}
      {isLoading ? (
        <div className="flex items-center justify-center p-24">
          <Loader2 className="animate-spin text-[#C69A70]" size={32} />
        </div>
      ) : filteredStores.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-20 text-center animate-in fade-in duration-500">
          <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-sm">
            <StoreIcon className="text-slate-300" size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No stores found</h3>
          <p className="text-slate-400 max-w-sm mx-auto text-sm leading-relaxed mb-8">
            Start by adding your first business location or use the import feature to set up multiple branches at once.
          </p>
          <button 
             onClick={() => router.push(`/${tenantSlug}/settings?tab=Stores / Teams&add=true`)}
             className="px-6 py-3 bg-[#C69A70] text-white rounded-xl font-bold text-sm shadow-md hover:bg-[#b88c62] transition-all active:scale-95"
          >
            Create First Store
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
          {filteredStores.map((store) => (
            <div key={store.store_id} className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 overflow-hidden relative">
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3 bg-slate-50 text-slate-900 rounded-2xl group-hover:bg-[#C69A70] group-hover:text-white transition-all duration-300 shadow-sm">
                    <StoreIcon size={24} />
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => router.push(`/${tenantSlug}/settings?tab=Stores / Teams&edit=${store.store_id}`)}
                      className="p-2 text-slate-400 hover:text-[#C69A70] transition-colors"
                    >
                      <Plus size={18} />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 mb-6">
                   <div className="flex items-center justify-between">
                     <h3 className="text-lg font-black text-slate-900 tracking-tight">{store.store_name}</h3>
                     <span className="text-[10px] font-black tracking-widest text-[#C69A70] bg-[#C69A70]/5 px-2 py-1 rounded-md uppercase">
                       {store.store_code || "---"}
                     </span>
                   </div>
                  <div className="flex items-center text-slate-400 text-[13px] font-medium">
                    <MapPin size={14} className="mr-1.5 text-slate-300" />
                    {store.location || "No location set"}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-50">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Staff Count</p>
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-slate-400" />
                      <span className="text-sm font-black text-slate-900">{store.staff_count} members</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Manager</p>
                    <p className="text-sm font-black text-slate-900 truncate">{store.manager_name || '---'}</p>
                  </div>
                </div>
              </div>
              
              {/* Detailed View Link */}
              <button 
                onClick={() => router.push(`/${tenantSlug}/settings?tab=Stores / Teams`)}
                className="w-full py-3 bg-slate-50 text-slate-400 text-xs font-bold flex items-center justify-center gap-2 group-hover:bg-[#C69A70]/5 group-hover:text-[#C69A70] transition-all border-t border-slate-100"
              >
                Configure Branch Details <ChevronRight size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Store Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#141517]/40 backdrop-blur-sm" onClick={() => !isImporting && setShowImportModal(false)} />
          <div className="relative bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowImportModal(false)} 
              className="absolute top-6 right-8 text-slate-400 hover:text-slate-600 transition-all"
            >
              <X size={24} />
            </button>

            <div className="text-center space-y-3 mb-10">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Import Stores / Teams</h3>
              <p className="text-slate-500 text-[13px] font-medium leading-relaxed">
                Upload an Excel or CSV file to create multiple stores/teams simultaneously.
              </p>
            </div>

            <div className="space-y-6">
              {/* Template Download Section */}
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <FileSpreadsheet className="text-emerald-600" size={20} />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-emerald-900 font-bold text-[13px]">Use the template to avoid errors.</p>
                    <button 
                      onClick={async () => {
                        try {
                          const res = await api.get('/api/stores/import/template', { responseType: 'blob' });
                          const url = window.URL.createObjectURL(new Blob([res.data]));
                          const link = document.createElement('a');
                          link.href = url;
                          link.setAttribute('download', 'store_import_template.xlsx');
                          document.body.appendChild(link);
                          link.click();
                          link.remove();
                        } catch (err) {
                          showError("Failed to download template.");
                        }
                      }}
                      className="text-[#0F764E] font-bold text-xs flex items-center gap-1 hover:underline decoration-2"
                    >
                      <Download size={12} />
                      Download Template
                    </button>
                  </div>
                </div>
              </div>

              {/* File Upload Section */}
              <div className="relative">
                <input 
                  type="file" 
                  ref={importFileRef}
                  className="hidden" 
                  accept=".csv, .xlsx, .xls"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    setIsImporting(true);
                    const formData = new FormData();
                    formData.append('file', file);
                    
                    try {
                      const res = await api.post('/api/stores/import', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                      });
                      showSuccess(`Successfully imported ${res.data.success} stores!`);
                      setTimeout(() => {
                         setShowImportModal(false);
                         fetchStores();
                      }, 1500); 
                    } catch (err: any) {
                      showError(err.response?.data?.detail || "Failed to import stores.");
                    } finally {
                      setIsImporting(false);
                      if (importFileRef.current) importFileRef.current.value = '';
                    }
                  }}
                />
                <button 
                  onClick={() => importFileRef.current?.click()}
                  disabled={isImporting}
                  className="w-full h-16 flex items-center justify-center gap-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 hover:border-[#D0A479] hover:bg-[#D0A479]/5 transition-all group"
                >
                  {isImporting ? (
                    <Loader2 className="animate-spin text-[#D0A479]" size={24} />
                  ) : (
                    <>
                      <div className="px-3 py-1 bg-emerald-100 text-[#0F764E] text-[10px] font-bold rounded-lg group-hover:bg-[#0F764E] group-hover:text-white transition-all">
                        Choose file
                      </div>
                      <span className="text-[13px] font-bold">No file chosen</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
