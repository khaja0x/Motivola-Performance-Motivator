"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Users, Plus, Search, Filter, Phone, MoreHorizontal, UserCheck, UserX, Loader2, Upload, Pencil, Trash2, Eye, Download, FileSpreadsheet, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';

export default function StaffPage() {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;
  const { success: showSuccess, error: showError } = useToast();

  const [staff, setStaff] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState('All Stores');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [staffToDelete, setStaffToDelete] = useState<string | null>(null);
  const [isDeletingStaff, setIsDeletingStaff] = useState(false);
  const [showImportSection, setShowImportSection] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [staffRes, storesRes] = await Promise.all([
          api.get('/api/staff/'),
          api.get('/api/stores/')
        ]);
        setStaff(staffRes.data);
        setStores(storesRes.data);
      } catch (err) {
        console.error('Failed to fetch staff data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDeleteStaff = (staffId: string) => {
    setStaffToDelete(staffId);
  };

  const confirmDeleteStaff = async () => {
    if (!staffToDelete) return;
    setIsDeletingStaff(true);
    try {
      await api.delete(`/api/staff/${staffToDelete}`);
      setStaff(prev => prev.filter(s => s.staff_id !== staffToDelete));
      setStaffToDelete(null);
    } catch (err) {
      console.error("Failed to delete staff:", err);
      showError("Failed to delete staff member. Please try again.");
    } finally {
      setIsDeletingStaff(false);
    }
  };

  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (member.email && member.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         (member.staff_code && member.staff_code.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStore = selectedStore === 'All Stores' || member.store_id === selectedStore;
    
    const matchesStatus = selectedStatus === 'All Status' || member.status?.toLowerCase() === selectedStatus.toLowerCase(); 
    
    return matchesSearch && matchesStore && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Staff Management</h1>
          <p className="text-slate-400 text-[13px] font-medium">Manage employees in the incentive program</p>
        </div>
        <div className="flex items-center space-x-3">

           <button 
             onClick={() => setShowImportSection(!showImportSection)}
            className={`px-5 py-2.5 rounded-xl flex items-center space-x-2 transition-all text-sm font-semibold border ${
              showImportSection 
                ? 'bg-slate-100 border-slate-300 text-slate-800' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {showImportSection ? (
              <>
                <ChevronUp size={18} className="text-slate-500" />
                <span>Hide Import</span>
              </>
            ) : (
              <>
                <FileSpreadsheet size={18} className="text-[#0F764E]" />
                <span>Import</span>
              </>
            )}
          </button>

          <button 
            onClick={() => router.push(`/${tenantSlug}/staff/add`)}
            className="bg-[#C69A70] hover:bg-[#b88c62] text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-all text-[13px] font-bold shadow-lg shadow-[#C69A70]/10"
          >
            <Plus size={18} />
            <span>Add Staff</span>
          </button>
         
        </div>
      </div>

      {/* Import Section Banner */}
      {showImportSection && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm mb-8 animate-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 flex-shrink-0">
                <FileSpreadsheet className="text-[#0F764E]" size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-slate-900 text-lg">Import Employees via Excel</h3>
                <p className="text-slate-500 font-medium text-sm">Download the template, fill in the data, and upload to create multiple accounts instantly.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
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
                    const res = await api.post('/api/staff/import', formData, {
                      headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    showSuccess(`Successfully imported ${res.data.success} employees!`);
                    setTimeout(() => window.location.reload(), 1500); 
                  } catch (err: any) {
                    showError(err.response?.data?.detail || "Failed to import staff.");
                  } finally {
                    setIsImporting(false);
                    if (importFileRef.current) importFileRef.current.value = '';
                  }
                }}
              />

               <button 
                onClick={async () => {
                  try {
                    const res = await api.get('/api/staff/import/template', { responseType: 'blob' });
                    const url = window.URL.createObjectURL(new Blob([res.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', 'staff_import_template.xlsx');
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                  } catch (err) {
                    showError("Failed to download template.");
                  }
                }}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 text-xs font-bold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
              >
                <Download size={16} className="text-slate-400" />
                Template
              </button>
              
              <button 
                disabled={isImporting}
                onClick={() => importFileRef.current?.click()}
                className="bg-[#C69A70] hover:bg-[#b88c62] text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-all text-xs font-bold shadow-sm"
              >
                <Upload size={16} />
                {isImporting ? '...' : 'Upload File'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-none shadow-sm overflow-hidden text-sm">
        {/* Table Header / Action Bar */}
        <div className="p-3.5 flex items-center bg-white space-x-3 mb-1">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-60 rounded-xl border border-slate-100 outline-none transition-all text-[13px] shadow-sm focus:ring-2 focus:ring-[#C69A70]/20 focus:border-[#C69A70] bg-slate-50/50"
            />
          </div>
          <div className="relative">
            <select 
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="px-4 py-2 w-44 rounded-xl border border-slate-100 outline-none transition-all text-[13px] shadow-sm bg-slate-50/50 cursor-pointer appearance-none font-medium"
            >
              <option value="All Stores">All Stores</option>
              {stores.map(store => (
                <option key={store.store_id} value={store.store_id}>{store.store_name}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <select 
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 w-40 rounded-xl border border-slate-100 outline-none transition-all text-[13px] shadow-sm bg-slate-50/50 cursor-pointer appearance-none font-medium"
            >
              <option value="All Status">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto min-h-[200px] flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center p-12">
              <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
          ) : staff.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
              <Users size={48} className="mb-4 opacity-20" />
              <p className="font-medium text-slate-500 text-lg">No staff members found</p>
              <p className="text-sm">Click "Add Staff Member" to get started.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#fbf7f3] text-slate-500 uppercase text-[11px] font-bold tracking-wider rounded-t-xl">
                  <th className="px-6 py-4 rounded-tl-xl text-[#b49b82]">CODE</th>
                  <th className="px-6 py-4 text-[#b49b82]">STAFF</th>
                  <th className="px-6 py-4 text-[#b49b82]">STORE</th>
                  <th className="px-6 py-4 text-[#b49b82]">ROLE</th>
                  <th className="px-6 py-4 text-[#b49b82]">WHATSAPP</th>
                  <th className="px-6 py-4 text-[#b49b82]">JOINED</th>
                  <th className="px-6 py-4 text-[#b49b82]">STATUS</th>
                  <th className="px-6 py-4 rounded-tr-xl text-[#b49b82] text-right pr-10">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 mt-2">
                {filteredStaff.map((member) => (
                  <tr 
                    key={member.staff_id} 
                    className="hover:bg-[#FDF8F5] cursor-pointer transition-colors group border-b border-slate-100 last:border-0"
                    onClick={() => router.push(`/${tenantSlug}/staff/${member.staff_id}`)}
                  >
                    <td className="px-6 py-4 text-[#b49b82] font-mono text-xs italic">
                      {member.staff_code || '---'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3 text-slate-900">
                        {member.photo_url ? (
                          <img 
                            src={`${api.defaults.baseURL}${member.photo_url}`}
                            className="w-10 h-10 border border-slate-200 rounded-full object-cover bg-slate-50"
                            alt={member.name}
                          />
                        ) : (
                          <img 
                            src={`https://api.dicebear.com/7.x/notionists/svg?seed=${member.name}`}
                            className="w-10 h-10 border border-slate-200 rounded-full bg-slate-50"
                            alt="avatar"
                          />
                        )}
                        <div 
                          className="flex flex-col cursor-pointer hover:opacity-70 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/${tenantSlug}/staff/${member.staff_id}`);
                          }}
                        >
                          <span className="font-semibold text-[13px] hover:text-[#C69A70] transition-colors">{member.name}</span>
                          <span className="text-slate-400 text-xs">{member.email || `${member.name.toLowerCase().replace(' ', '.')}@vertex.com`}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-semibold text-[13px]">
                      {stores.find(s => s.store_id === member.store_id)?.store_name || 'Main Office'} 
                    </td>
                   
                    <td className="px-6 py-4">
                      <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium", member.role === "Supervisor" ? "bg-amber-50 text-amber-600" : "bg-cyan-50 text-cyan-600")}>
                        {member.role || 'Staff'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-[13px]">
                      {member.whatsapp_number}
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-[13px]">
                      {member.joining_date ? new Date(member.joining_date).toLocaleDateString() : 'Mar 15, 2024'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase",
                        member.status?.toLowerCase() === 'active' 
                          ? "bg-emerald-50 text-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.1)]" 
                          : "bg-red-50 text-red-600 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                      )}>
                        {member.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right pr-6">
                      <div className="flex items-center justify-end space-x-2">
                    
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/${tenantSlug}/staff/${member.staff_id}?mode=edit`);
                          }}
                          className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 transition-all flex items-center justify-center shadow-sm"
                          title="Edit Staff"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStaff(member.staff_id);
                          }}
                          className="p-2 bg-red-50 hover:bg-red-100 rounded-xl text-red-500 transition-all flex items-center justify-center shadow-sm"
                          title="Delete Staff"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Custom Delete Confirmation Modal */}
      {staffToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isDeletingStaff && setStaffToDelete(null)} />
          <div className="relative bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
              <Trash2 className="text-red-500" size={30} />
            </div>
            
            <div className="text-center space-y-3 mb-8">
              <h2 className="text-xl font-bold text-slate-900">Delete Staff Member</h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Are you sure you want to delete <span className="text-slate-900 font-bold">"{staff.find(s => s.staff_id === staffToDelete)?.name}"</span>? This action cannot be undone.
              </p>
            </div>
            
            <div className="flex flex-col space-y-3">
              <button 
                onClick={confirmDeleteStaff}
                disabled={isDeletingStaff}
                className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-500/20 active:scale-[0.98] disabled:opacity-50"
              >
                {isDeletingStaff ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Delete Staff'}
              </button>
              <button 
                onClick={() => setStaffToDelete(null)}
                disabled={isDeletingStaff}
                className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
