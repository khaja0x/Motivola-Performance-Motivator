"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Target, 
  Plus, 
  Search, 
  Loader2, 
  BarChart3, 
  TrendingUp, 
  CheckCircle2, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Upload,
  Download,
  Filter,
  Save,
  AlertCircle
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';

interface StaffMember {
  staff_id: string;
  name: string;
  role: string;
  staff_code: string;
  store_id: string;
  total_sales?: number;
  total_sales_quantity?: number;
}

interface TargetData {
  target_id?: string;
  entity_id: string;
  entity_type: string;
  period_type: string;
  month?: number;
  day?: number;
  week?: number;
  year: number;
  target_type: string; // Amount, Quantity
  target_amount: number;
  target_quantity: number;
  isInherited?: boolean;
}

interface TargetRowProps {
  member: StaffMember;
  target: TargetData;
  index: number;
  onTargetChange: (staffId: string, field: 'target_amount' | 'target_quantity' | 'target_type', value: string) => void;
  onApplyToAll: (sourceStaffId: string) => void;
}

const TargetRow = React.memo(({ member, target, index, onTargetChange, onApplyToAll }: TargetRowProps) => {
  return (
    <tr className="hover:bg-slate-50/50 transition-colors group">
      <td className="px-8 py-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-[#D0A479]/10 flex items-center justify-center text-[#D0A479] font-bold text-xs shadow-sm">
            {(member.name || '').split(' ').map(n => n[0]).join('').toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-slate-800 text-[13.5px] leading-tight">{member.name}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{member.staff_code}</p>
          </div>
        </div>
      </td>
      <td className="px-8 py-4">
        <span className={cn(
          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm",
          member.role === 'Supervisor' 
            ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
            : "bg-indigo-50 text-indigo-600 border border-indigo-100"
        )}>
          {member.role}
        </span>
      </td>
      <td className="px-8 py-4">
        <div className="flex items-center space-x-2">
          {/* Type Select */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl px-2 py-2 flex items-center shadow-sm">
            <select 
              value={target.target_type || 'Amount'}
              onChange={(e) => onTargetChange(member.staff_id, 'target_type', e.target.value)}
              className="bg-transparent text-sm font-black text-slate-600 outline-none w-10 text-center"
            >
              <option value="Amount">$</option>
              <option value="Quantity">#</option>
            </select>
          </div>

          {/* Value Input */}
          <div className="relative flex items-center flex-1">
            <input 
              type="number" 
              value={target.target_type === 'Quantity' ? target.target_quantity : target.target_amount || ''}
              onChange={(e) => onTargetChange(
                member.staff_id, 
                target.target_type === 'Quantity' ? 'target_quantity' : 'target_amount', 
                e.target.value
              )}
              placeholder="0"
              className="w-32 px-4 py-2 border border-slate-100 bg-slate-50 text-slate-700 rounded-xl text-sm font-bold outline-none transition-all focus:bg-white focus:ring-4 focus:ring-[#D0A479]/10 focus:border-[#D0A479]"
            />
            {index === 0 && (target.target_amount > 0 || target.target_quantity > 0) && (
              <button 
                onClick={() => onApplyToAll(member.staff_id)}
                title="Apply this value to all empty rows"
                className="ml-3 flex items-center space-x-1.5 px-3 py-2 bg-[#D0A479] text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-[#B68A5F] active:scale-95 transition-all shadow-md shadow-[#D0A479]/20 whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300"
              >
                <TrendingUp size={12} />
                <span>Same for all</span>
              </button>
            )}
          </div>
        </div>
      </td>
      <td className="px-8 py-4 text-right">
        <span className="font-bold text-slate-500 text-sm tracking-tight">
          {target.target_type === 'Quantity' 
            ? `${member.total_sales_quantity?.toLocaleString() || 0}`
            : `$${member.total_sales?.toLocaleString() || 0}`
          }
        </span>
      </td>
      <td className="px-8 py-4 text-right">
        {(() => {
          const achieved = target.target_type === 'Quantity' ? (member.total_sales_quantity || 0) : (member.total_sales || 0);
          const targetValue = target.target_type === 'Quantity' ? target.target_quantity : target.target_amount;
          let progress = 0;
          if (targetValue > 0) {
            progress = Math.min(100, Math.round((achieved / targetValue) * 100));
          }
          
          return (
            <div className="flex flex-col items-end space-y-1.5">
              <span className="text-[11px] font-black text-slate-400">{progress}%</span>
              <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={cn("h-full transition-all duration-500", progress >= 100 ? "bg-emerald-500" : "bg-[#D0A479]")}
                  style={{ width: `${progress}%` }} 
                />
              </div>
            </div>
          );
        })()}
      </td>
    </tr>
  );
});

TargetRow.displayName = 'TargetRow';


export default function TargetsPage() {
  const params = useParams();
  const { success: showSuccess, error: showError } = useToast();
  
  // State for tabs and date
  const activeTab = 'Monthly';
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Data state
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [targets, setTargets] = useState<Record<string, TargetData>>({}); // keyed by staff_id
  const [staffLoading, setStaffLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cache, setCache] = useState<Record<string, Record<string, TargetData>>>({}); // key: 'activeTab-dateString'

  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  const filteredStaff = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return staff.filter(s => {
      const matchesSearch = !query || 
        (s.name || '').toLowerCase().includes(query) ||
        (s.staff_code || '').toLowerCase().includes(query);
      
      const matchesRole = roleFilter === 'All' || 
        (s.role || '').toLowerCase() === roleFilter.toLowerCase();

      return matchesSearch && matchesRole;
    });
  }, [staff, searchQuery, roleFilter]);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    fetchStaff();
  }, [selectedDate]);

  useEffect(() => {
    fetchTargets();
  }, [selectedDate, staff]);

  const fetchStaff = async () => {
    setStaffLoading(true);
    try {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth() + 1;
      const res = await api.get(`/api/staff/?month=${month}&year=${year}`);
      setStaff(res.data);
    } catch (err) {
      console.error('Failed to fetch staff:', err);
      showError('Failed to load staff list');
    } finally {
      setStaffLoading(false);
    }
  };

  const fetchTargets = async () => {
    if (staff.length === 0) return;

    const cacheKey = `${activeTab}-${selectedDate.toDateString()}`;
    if (cache[cacheKey]) {
      setTargets(cache[cacheKey]);
      return;
    }

    setIsLoading(true);
    try {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth() + 1;
      const queryStr = `?period_type=Monthly&year=${year}&month=${month}`;

      const targetsRes = await api.get(`/api/targets/${queryStr}`);
      const targetsData: TargetData[] = targetsRes.data;

      // 2. Map targets
      const targetLookup = new Map(targetsData.map(t => [String(t.entity_id), t]));
      const targetMap: Record<string, TargetData> = {};
      
      staff.forEach(member => {
        const memberId = String(member.staff_id);
        const target = targetLookup.get(memberId);
        
        if (target) {
          targetMap[member.staff_id] = target;
        }
      });
      
      setTargets(targetMap);
      setCache(prev => ({ ...prev, [cacheKey]: targetMap }));

    } catch (err) {
      console.error('Failed to fetch targets:', err);
      showError('Failed to load targets data');
    } finally {
      setIsLoading(false);
    }
  };



  const applyToAll = React.useCallback((sourceStaffId: string) => {
    const sourceTarget = targets[sourceStaffId];
    if (!sourceTarget) return;

    const value = sourceTarget.target_type === 'Quantity' ? sourceTarget.target_quantity : sourceTarget.target_amount;
    const type = sourceTarget.target_type;

    if (value <= 0) return;

    setTargets(prev => {
      const next = { ...prev };
      filteredStaff.forEach(member => {
        if (member.staff_id === sourceStaffId) return;
        
        const currentTarget = next[member.staff_id];
        const isCurrentlyEmpty = !currentTarget || 
          (currentTarget.target_type === 'Quantity' ? !currentTarget.target_quantity : !currentTarget.target_amount);

        if (isCurrentlyEmpty) {
          next[member.staff_id] = {
            ...(currentTarget || {
              entity_id: member.staff_id,
              entity_type: 'Staff',
              period_type: 'Monthly',
              year: selectedDate.getFullYear(),
              month: selectedDate.getMonth() + 1,
            }),
            target_type: type,
            target_amount: type === 'Amount' ? value : 0,
            target_quantity: type === 'Quantity' ? value : 0,
            isInherited: false
          } as any;
        }
      });
      return next;
    });
    
    showSuccess('Target applied to all empty rows');
  }, [targets, filteredStaff, activeTab, selectedDate, showSuccess]);

  const handleTargetChange = React.useCallback((staffId: string, field: 'target_amount' | 'target_quantity' | 'target_type', value: string) => {
    setTargets(prev => {
      const existing = prev[staffId] || {
        entity_id: staffId,
        entity_type: 'Staff',
        period_type: 'Monthly',
        year: selectedDate.getFullYear(),
        month: selectedDate.getMonth() + 1,
        target_type: 'Amount',
        target_amount: 0,
        target_quantity: 0
      };

      const updated = { ...existing, isInherited: false };
      
      if (field === 'target_type') {
        updated.target_type = value;
      } else {
        const numValue = parseFloat(value) || 0;
        if (field === 'target_amount') updated.target_amount = numValue;
        if (field === 'target_quantity') updated.target_quantity = numValue;
      }

      return {
        ...prev,
        [staffId]: updated
      };
    });
  }, [activeTab, selectedDate]);


  const saveTargets = async () => {
    // Only save targets that have actual values and are not inherited
    const targetsToSave = Object.values(targets).filter(t => 
      !t.isInherited && (t.target_amount > 0 || t.target_quantity > 0)
    ).map(t => ({
      ...t,
      target_amount: t.target_type === 'Amount' ? t.target_amount : 0,
      target_quantity: t.target_type === 'Quantity' ? t.target_quantity : 0
    }));

    if (targetsToSave.length === 0) {
      showSuccess('Nothing to save');
      return;
    }

    setIsSaving(true);
    try {
      await api.post('/api/targets/bulk', targetsToSave);
      setCache({}); // Clear cache on save to force fresh fetch
      fetchTargets();

    } catch (err) {
      console.error('Failed to save targets:', err);
      showError('Failed to save targets.');
    } finally {
      setIsSaving(false);
    }
  };


  const handlePrev = () => {
    setSelectedDate(prev => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() - 1);
      return next;
    });
  };

  const handleNext = () => {
    setSelectedDate(prev => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + 1);
      return next;
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get('/api/targets/import/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'targets_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      showError('Failed to download template');
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsLoading(true);
    try {
      const res = await api.post('/api/targets/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showSuccess(`Successfully imported ${res.data.success} targets`);
      if (res.data.errors && res.data.errors.length > 0) {
        console.warn('Import errors:', res.data.errors);
      }
      setCache({}); 
      fetchTargets();

    } catch (err) {
      showError('Failed to upload file');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-2">
        <div className="space-y-1">
          <h1 className="text-[32px] font-black text-[#141517] tracking-tight">Targets</h1>
          <p className="text-slate-500 font-medium text-sm">Monthly targets assignment</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleBulkUpload} 
            className="hidden" 
            accept=".csv,.xlsx,.xls"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Upload size={16} />
            <span>Bulk Upload</span>
          </button>
          <button 
            onClick={handleDownloadTemplate}
            className="flex items-center space-x-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download size={16} />
            <span>Import Template</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] overflow-hidden">
        {/* Table Controls Header */}
        <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/20">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {/* Tabs */}
              <div className="flex bg-[#F5F1EB] p-1 rounded-2xl w-fit">
                <button
                  className="px-7 py-2 rounded-xl text-[13px] font-bold transition-all bg-[#C69A70] text-white shadow-lg shadow-[#C69A70]/20"
                >
                  Monthly
                </button>
              </div>

              {/* Search */}
              <div className="relative group min-w-[280px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#D0A479] transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="Search staff members..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-600 outline-none focus:ring-4 focus:ring-[#D0A479]/5 focus:border-[#D0A479] transition-all placeholder:text-slate-400 placeholder:font-medium shadow-sm"
                />
              </div>

              {/* Role Filter */}
              <div className="relative group min-w-[180px]">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#D0A479] transition-colors" size={16} />
                <select 
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-600 outline-none focus:ring-4 focus:ring-[#D0A479]/5 focus:border-[#D0A479] transition-all appearance-none cursor-pointer shadow-sm"
                >
                  <option value="All">All Roles</option>
                  <option value="Supervisor">Supervisors</option>
                  <option value="Staff">Staff</option>
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none rotate-90" size={14} />
              </div>
            </div>

            {/* Date Selector */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm">
                <button 
                  onClick={handlePrev}
                  className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-all font-bold"
                >
                  <ChevronLeft size={16} />
                </button>
                <div 
                  className="relative group mx-2 min-w-[140px] text-center cursor-pointer"
                  onClick={() => {
                    if (dateInputRef.current) {
                      const input = dateInputRef.current as any;
                      if (input.showPicker) {
                        input.showPicker();
                      } else {
                        input.click();
                      }
                    }
                  }}
                >
                  <input 
                    ref={dateInputRef}
                    type="month"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      setSelectedDate(new Date(val));
                    }}
                    value={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`}
                  />
                  <div className="flex items-center justify-center space-x-2 px-2 py-1 pointer-events-none">
                    <span className="text-[14px] font-bold text-slate-700">
                      {`${months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`}
                    </span>
                    <Calendar size={15} className="text-slate-400" />
                  </div>
                </div>
                <button 
                  onClick={handleNext}
                  className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-all font-bold"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Table Section */}

        {/* Table Section */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-50">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">STAFF</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">ROLE</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">TARGET</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 text-right">ACHIEVED</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 text-right">PROGRESS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {staffLoading || (isLoading && filteredStaff.length === 0) ? (
                // Skeleton Loader

                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-8 py-6"><div className="h-4 bg-slate-100 rounded w-32"></div></td>
                    <td className="px-8 py-6"><div className="h-4 bg-slate-100 rounded w-20"></div></td>
                    <td className="px-8 py-6"><div className="h-9 bg-slate-100 rounded-lg w-24"></div></td>
                    <td className="px-8 py-6 text-right"><div className="h-4 bg-slate-100 rounded w-16 ml-auto"></div></td>
                    <td className="px-8 py-6 text-right"><div className="h-2 bg-slate-100 rounded-full w-24 ml-auto"></div></td>
                  </tr>
                ))
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center opacity-30">
                      <BarChart3 size={48} className="mb-4" />
                      <p className="font-bold text-slate-500">No staff members found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member, index) => (
                  <TargetRow 
                    key={member.staff_id}
                    member={member}
                    index={index}
                    target={targets[member.staff_id] || { target_amount: 0, target_quantity: 0 } as any}
                    onTargetChange={handleTargetChange}
                    onApplyToAll={applyToAll}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="p-8 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
           <div className="flex items-center space-x-2 text-slate-400">
             <AlertCircle size={16} />
             <p className="text-[11px] font-bold">Targets are saved per month for each employee.</p>
           </div>
           
           <button 
            onClick={saveTargets}
            disabled={isSaving || isLoading}
            className="flex items-center space-x-2.5 px-8 py-3.5 bg-[#141517] text-white rounded-2xl text-sm font-bold hover:bg-black transition-all shadow-xl shadow-black/10 disabled:opacity-50"
           >
             {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
             <span>{isSaving ? 'Saving...' : 'Save Targets'}</span>
           </button>
        </div>
      </div>
    </div>
  );
}
