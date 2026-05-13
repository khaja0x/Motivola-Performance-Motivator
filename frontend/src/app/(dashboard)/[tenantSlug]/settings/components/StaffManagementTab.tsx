"use client";
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Loader2, Plus, Search, Filter, Phone, Pencil, Trash2,
  FileSpreadsheet, Download, Upload, ChevronDown, ChevronUp,
  UserCheck, Users, X
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface Props {
  showSuccess: (msg: string) => void;
  showError: (msg: any) => void;
  getFullUrl: (path: string | undefined | null) => string | null;
}

export default function StaffManagementTab({ showSuccess, showError, getFullUrl }: Props) {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;

  const [staff, setStaff] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffSelectedStore, setStaffSelectedStore] = useState('All Stores');
  const [staffSelectedStatus, setStaffSelectedStatus] = useState('All Status');
  const [showStaffImportSection, setShowStaffImportSection] = useState(false);
  const staffImportFileRef = useRef<HTMLInputElement>(null);
  const [isStaffImporting, setIsStaffImporting] = useState(false);
  const [staffCurrentPage, setStaffCurrentPage] = useState(1);
  const staffPageSize = 10;
  const [staffToDelete, setStaffToDelete] = useState<string | null>(null);
  const [isDeletingStaff, setIsDeletingStaff] = useState(false);

  const fetchStaff = async () => {
    setIsLoadingStaff(true);
    try {
      const [staffRes, storesRes] = await Promise.all([api.get('/api/staff/'), api.get('/api/stores')]);
      setStaff(staffRes.data);
      setStores(storesRes.data);
    } catch (err) {
      console.error("Failed to fetch staff data", err);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  useEffect(() => { fetchStaff(); }, []);

  const filteredStaff = useMemo(() => {
    const query = staffSearchQuery.toLowerCase();
    return staff.filter(member => {
      const matchesSearch = member.name.toLowerCase().includes(query) ||
        (member.email && member.email.toLowerCase().includes(query)) ||
        (member.staff_code && member.staff_code.toLowerCase().includes(query));
      const matchesStore = staffSelectedStore === 'All Stores' || member.store_id === staffSelectedStore;
      const matchesStatus = staffSelectedStatus === 'All Status' || member.status?.toLowerCase() === staffSelectedStatus.toLowerCase();
      return matchesSearch && matchesStore && matchesStatus;
    });
  }, [staff, staffSearchQuery, staffSelectedStore, staffSelectedStatus]);

  const staffPaginated = useMemo(() => {
    const start = (staffCurrentPage - 1) * staffPageSize;
    return filteredStaff.slice(start, start + staffPageSize);
  }, [filteredStaff, staffCurrentPage]);

  useEffect(() => { setStaffCurrentPage(1); }, [staffSearchQuery, staffSelectedStore, staffSelectedStatus]);

  const confirmDeleteStaff = async () => {
    if (!staffToDelete) return;
    setIsDeletingStaff(true);
    try {
      await api.delete(`/api/staff/${staffToDelete}`);
      setStaff(prev => prev.filter(s => s.staff_id !== staffToDelete));
      setStaffToDelete(null);
      showSuccess("Staff member deleted successfully!");
    } catch (err: any) {
      showError(err.response?.data?.detail || "Failed to delete staff member. Please try again.");
    } finally {
      setIsDeletingStaff(false);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Staff Management</h2>
          <div className="h-1 w-12 bg-gradient-to-r from-[#D0A479] to-[#b88c62] rounded-full"></div>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={() => setShowStaffImportSection(!showStaffImportSection)}
            className={cn("px-6 py-3 rounded-2xl flex items-center transition-all text-[13px] font-bold border shadow-sm",
              showStaffImportSection ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            {showStaffImportSection
              ? <><ChevronUp size={16} className="text-slate-500 mr-2" />Hide Import</>
              : <><FileSpreadsheet size={16} className="text-emerald-600 mr-2" />Import</>}
          </button>
          <button onClick={() => router.push(`/${tenantSlug}/staff/add`)}
            className="px-6 py-3 bg-[#D0A479] hover:bg-[#bd9756] text-[#141517] text-[13px] font-black rounded-2xl flex items-center transition-all shadow-xl shadow-[#D0A479]/20 active:scale-95"
          >
            <Plus size={18} className="mr-2" /> Add Staff Member
          </button>
        </div>
      </div>

      {/* Import Section */}
      {showStaffImportSection && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm animate-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 flex-shrink-0">
                <FileSpreadsheet className="text-[#0F764E]" size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-slate-900 text-lg">Import Employees via Excel</h3>
                <p className="text-slate-500 text-sm font-medium">Download the template, fill in the data, and upload to create multiple accounts instantly.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input type="file" ref={staffImportFileRef} className="hidden" accept=".csv,.xlsx,.xls"
                onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  setIsStaffImporting(true);
                  const fd = new FormData(); fd.append('file', file);
                  try {
                    const res = await api.post('/api/staff/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                    showSuccess(`Successfully imported ${res.data.success} employees!`);
                    fetchStaff();
                  } catch (err: any) { showError(err.response?.data?.detail || "Failed to import staff."); }
                  finally { setIsStaffImporting(false); if (staffImportFileRef.current) staffImportFileRef.current.value = ''; }
                }}
              />
              <button onClick={async () => {
                try {
                  const res = await api.get('/api/staff/import/template', { responseType: 'blob' });
                  const url = window.URL.createObjectURL(new Blob([res.data]));
                  const link = document.createElement('a'); link.href = url;
                  link.setAttribute('download', 'staff_import_template.xlsx');
                  document.body.appendChild(link); link.click(); link.remove();
                } catch { showError("Failed to download template."); }
              }} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm">
                <Download size={18} className="text-slate-400" /> Template
              </button>
              <button disabled={isStaffImporting} onClick={() => staffImportFileRef.current?.click()}
                className="bg-[#C69A70] hover:bg-[#b88c62] text-white px-5 py-2.5 rounded-xl flex items-center space-x-2 transition-all text-sm font-semibold"
              >
                <Upload size={18} />
                <span>{isStaffImporting ? 'Processing...' : 'Upload File'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-[#FCF9F4]/50 p-6 rounded-[2rem] border border-slate-100 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Search name, code, or email..." value={staffSearchQuery}
            onChange={(e) => setStaffSearchQuery(e.target.value)}
            className="pl-12 pr-4 py-3.5 w-full rounded-2xl border border-white outline-none transition-all text-sm shadow-sm focus:ring-4 focus:ring-[#D0A479]/10 focus:border-[#D0A479]"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select value={staffSelectedStore} onChange={(e) => setStaffSelectedStore(e.target.value)}
            className="pl-11 pr-8 py-3.5 w-48 rounded-2xl border border-white outline-none transition-all text-sm shadow-sm bg-white cursor-pointer appearance-none focus:ring-4 focus:ring-[#D0A479]/10"
          >
            <option value="All Stores">All Stores</option>
            {stores.map(s => <option key={s.store_id} value={s.store_id}>{s.store_name}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative">
          <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select value={staffSelectedStatus} onChange={(e) => setStaffSelectedStatus(e.target.value)}
            className="pl-11 pr-8 py-3.5 w-44 rounded-2xl border border-white outline-none transition-all text-sm shadow-sm bg-white cursor-pointer appearance-none focus:ring-4 focus:ring-[#D0A479]/10"
          >
            <option value="All Status">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Staff Table */}
      <div className="overflow-x-auto min-h-[300px]">
        {isLoadingStaff ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-[#D0A479]" size={32} /></div>
        ) : staff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Users size={48} className="mb-4 opacity-20" />
            <p className="font-bold text-slate-500 text-lg">No staff members found</p>
            <p className="text-[13px] font-medium">Click "Add Staff Member" to get started.</p>
          </div>
        ) : (
          <table className="w-full text-left border-separate border-spacing-y-2 px-1">
            <thead>
              <tr className="text-slate-400">
                {['CODE','Staff Member','Store / Location','Official Role','WhatsApp','Joined','Status','Actions'].map(h => (
                  <th key={h} className={cn("px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em]", h === 'Actions' ? 'text-right pr-10' : '')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {staffPaginated.map((member) => (
                <tr key={member.staff_id}
                  onClick={() => router.push(`/${tenantSlug}/staff/${member.staff_id}`)}
                  className="bg-white hover:bg-[#FDF8F5] cursor-pointer transition-all group shadow-sm hover:shadow-md border border-slate-100"
                >
                  <td className="px-6 py-5 first:rounded-l-[20px] text-[#b49b82] font-black text-xs tracking-tight">{member.staff_code || '---'}</td>
                  <td className="px-6 py-5">
                    <div className="flex items-center space-x-4">
                      <div className="relative flex-shrink-0">
                        <img
                          src={getFullUrl(member.photo_url) || `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(member.name)}`}
                          className="w-11 h-11 border-2 border-white rounded-2xl object-cover bg-slate-100 shadow-sm" alt={member.name}
                          onError={(e) => { e.currentTarget.src = `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(member.name)}`; }}
                        />
                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-sm text-slate-900 leading-none mb-1.5 group-hover:text-[#D0A479] transition-colors">{member.name}</span>
                        <span className="text-slate-400 text-[11px] font-bold lowercase">{member.email || '—'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-slate-600 font-bold text-[13px]">
                    {stores.find(s => s.store_id === member.store_id)?.store_name || 'Main Office'}
                  </td>
                  <td className="px-6 py-5">
                    <span className={cn("px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider",
                      member.role === "Supervisor" ? "bg-amber-100/50 text-amber-700 border border-amber-200/50" : "bg-cyan-100/50 text-cyan-700 border border-cyan-200/50"
                    )}>{member.role || 'Staff'}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-[13px] font-black text-slate-600 font-mono tracking-tight flex items-center">
                      <Phone size={12} className="mr-2 text-slate-300" />{member.whatsapp_number}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-[13px] font-bold text-slate-400">
                      {member.hire_date ? new Date(member.hire_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className={cn("px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center w-fit",
                      member.status?.toLowerCase() === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full mr-2", member.status?.toLowerCase() === 'active' ? "bg-emerald-500" : "bg-red-500")}></span>
                      {member.status || 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right last:rounded-r-[20px] pr-6">
                    <div className="flex items-center justify-end space-x-3 opacity-200 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                      <button onClick={(e) => { e.stopPropagation(); router.push(`/${tenantSlug}/staff/${member.staff_id}?mode=edit`); }}
                        className="p-2.5 bg-white hover:bg-[#D0A479] hover:text-[#141517] rounded-xl text-slate-400 transition-all shadow-sm border border-slate-100"
                      ><Pencil size={14} /></button>
                      <button onClick={(e) => { e.stopPropagation(); setStaffToDelete(member.staff_id); }}
                        className="p-2.5 bg-white hover:bg-red-500 hover:text-white rounded-xl text-slate-400 transition-all shadow-sm border border-slate-100"
                      ><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {filteredStaff.length > staffPageSize && (
        <div className="mt-8 flex items-center justify-between px-2">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
            Showing {staffPaginated.length} of {filteredStaff.length} members
          </p>
          <div className="flex items-center space-x-3">
            <button onClick={() => setStaffCurrentPage(p => Math.max(1, p - 1))} disabled={staffCurrentPage === 1}
              className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-[#D0A479] disabled:opacity-30 transition-all"
            ><ChevronDown size={18} className="rotate-90" /></button>
            <span className="text-[13px] font-black text-slate-900 mx-2">
              {staffCurrentPage} <span className="text-slate-300 mx-1">/</span> {Math.ceil(filteredStaff.length / staffPageSize)}
            </span>
            <button onClick={() => setStaffCurrentPage(p => Math.min(Math.ceil(filteredStaff.length / staffPageSize), p + 1))}
              disabled={staffCurrentPage >= Math.ceil(filteredStaff.length / staffPageSize)}
              className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-[#D0A479] disabled:opacity-30 transition-all"
            ><ChevronDown size={18} className="-rotate-90" /></button>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {staffToDelete && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="text-red-500" size={28} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Remove Staff Member?</h3>
              <p className="text-slate-500 mt-2 text-sm">This will permanently delete the staff account and all related data.</p>
            </div>
            <div className="flex items-center justify-center space-x-3">
              <button onClick={() => setStaffToDelete(null)} className="px-6 py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all">Cancel</button>
              <button onClick={confirmDeleteStaff} disabled={isDeletingStaff}
                className="px-6 py-3 bg-red-500 text-white rounded-2xl font-bold text-sm hover:bg-red-600 transition-all disabled:opacity-50 flex items-center"
              >{isDeletingStaff ? <><Loader2 size={16} className="animate-spin mr-2" />Deleting...</> : 'Yes, Remove'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
