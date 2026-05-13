"use client";

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Search, 
  Filter, 
  Download,
  Medal,
  Crown
} from 'lucide-react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';

interface StaffMember {
  staff_id: string;
  name: string;
  staff_code: string;
  role: string;
  total_sales: number;
  total_sales_quantity?: number;
  commission: number;
  status: string;
  photo_url?: string;
  store_id?: string;
  rule_name?: string;
  assigned_rule?: string;
}

interface StaffPerformancePageProps {
  isEmbedded?: boolean;
  onStaffClick?: (staffName: string) => void;
  selectedMonth?: string;
}

export default function StaffPerformance({ isEmbedded = false, onStaffClick, selectedMonth }: StaffPerformancePageProps = {}) {
  const [staffData, setStaffData] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const getImageUrl = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ;
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  useEffect(() => {
    const fetchStaffPerformance = async () => {
      setIsLoading(true);
      try {
        let params: any = {};
        if (selectedMonth) {
            const [mName, year] = selectedMonth.split(' ');
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            const monthIndex = monthNames.indexOf(mName) + 1;
            if (monthIndex > 0) {
                params.month = monthIndex;
                params.year = parseInt(year);
            }
        }
        
        const [staffRes, assignmentsRes] = await Promise.all([
          api.get('/api/staff/', { params }),
          api.get('/api/rules/assignments/list').catch(() => ({ data: [] }))
        ]);
        
        const assignmentsData = assignmentsRes.data || [];
        const assignmentMap = new Map();
        if (Array.isArray(assignmentsData)) {
            assignmentsData.forEach((a: any) => {
               assignmentMap.set(a.staff_id, a.rule_name);
            });
        }

        const updatedStaffData = staffRes.data.map((staff: StaffMember) => ({
            ...staff,
            assigned_rule: assignmentMap.get(staff.staff_id) || 'No Rule Assigned'
        }));

        setStaffData(updatedStaffData);
      } catch (err) {
        console.error("Failed to fetch staff performance", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStaffPerformance();
  }, [selectedMonth]);

  const handleExport = () => {
    const headers = ['Rank', 'Staff Member', 'Staff Code', 'Role', 'Total Sales ($)', 'Units Sold', 'Commission Earned ($)', 'Status'];
    const csvData = sortedStaff.map((staff, index) => [
      index + 1,
      `"${staff.name}"`,
      `"${staff.staff_code}"`,
      `"${staff.role}"`,
      staff.total_sales || 0,
      staff.total_sales_quantity || 0,
      staff.commission || 0,
      `"${staff.status}"`
    ]);
    
    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `performance_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredStaff = staffData.filter(staff => {
    const matchesSearch = staff.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          staff.staff_code?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'All' || staff.role === roleFilter;
    const matchesStatus = statusFilter === 'All' || (staff.status || '').toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Sorting to show highest rank (lowest rank number) first Let's sort by total_sales descending in case rank is null
  const sortedStaff = [...filteredStaff].sort((a, b) => {
    const saleA = a.total_sales || 0;
    const saleB = b.total_sales || 0;
    return saleB - saleA;
  });

  const topPerformer = sortedStaff.length > 0 ? sortedStaff[0] : null;

  const filterControls = (
    <div className="flex items-center gap-3 relative justify-end w-full md:w-auto">
      <button 
         onClick={() => setIsFilterOpen(!isFilterOpen)}
         className="flex items-center space-x-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
        <Filter className="w-4 h-4 text-slate-400" />
        <span>Filter</span>
        {(roleFilter !== 'All' || statusFilter !== 'All') && (
           <span className="w-2 h-2 rounded-full bg-[#D0A479] ml-1"></span>
        )}
      </button>

      {isFilterOpen && (
         <div className="absolute top-12 right-24 bg-white border border-slate-200 rounded-xl shadow-lg p-4 z-50 w-64 animate-in fade-in slide-in-from-top-2 text-left">
             <h4 className="font-bold text-slate-900 mb-3 text-sm">Filter Performance</h4>
             <div className="space-y-4">
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Role</label>
                    <select 
                       value={roleFilter}
                       onChange={(e) => setRoleFilter(e.target.value)}
                       className="w-full text-sm font-medium text-slate-700 border-slate-200 rounded-lg p-2.5 bg-slate-50 border focus:ring-[#D0A479]/50 focus:border-[#D0A479] transition-all">
                       <option value="All">All Roles</option>
                       <option value="Staff">Staff</option>
                       <option value="Supervisor">Supervisor</option>
                       <option value="Manager">Manager</option>
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Status</label>
                    <select 
                       value={statusFilter}
                       onChange={(e) => setStatusFilter(e.target.value)}
                       className="w-full text-sm font-medium text-slate-700 border-slate-200 rounded-lg p-2.5 bg-slate-50 border focus:ring-[#D0A479]/50 focus:border-[#D0A479] transition-all">
                       <option value="All">All Statuses</option>
                       <option value="active">Active</option>
                       <option value="inactive">Inactive</option>
                    </select>
                </div>
                <div className="pt-3 mt-4 border-t border-slate-100 flex justify-end">
                   <button 
                      onClick={() => {
                          setRoleFilter('All');
                          setStatusFilter('All');
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900 mr-4 transition-colors">
                      Reset
                   </button>
                   <button 
                      onClick={() => setIsFilterOpen(false)}
                      className="px-4 py-2 bg-[#141517] text-white text-xs font-bold rounded-lg hover:bg-[#2A2B2F] transition-colors">
                      Apply Filters
                   </button>
                </div>
             </div>
         </div>
      )}

      <button 
        onClick={handleExport}
        className="flex items-center space-x-2 px-5 py-2.5 bg-[#141517] text-white rounded-xl text-sm font-semibold hover:bg-[#2A2B2F] transition-all shadow-md shadow-black/10">
        <Download className="w-4 h-4" />
        <span>Export</span>
      </button>
    </div>
  );

  return (
    <div className={isEmbedded ? "space-y-8" : "max-w-7xl mx-auto p-6 space-y-8 bg-[#FDFDFD] min-h-screen"}>
      {/* Dynamic Controls Rendering */}
      {!isEmbedded && (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Staff Performance</h1>
            <p className="text-slate-500 mt-1">Real-time leaderboard and commission tracking</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
             <div className="w-12 h-12 border-4 border-[#D0A479] border-t-transparent rounded-full animate-spin"></div>
             <p className="text-slate-500 font-medium">Loading performance data...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-500">
          
          {/* Top Performer Highlight */}
          {!isEmbedded && topPerformer && topPerformer.total_sales > 0 && (
            <div className="bg-gradient-to-r from-[#141517] to-[#2A2B2E] rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between shadow-xl shadow-black/10 relative overflow-hidden">
              {/* Decorative Background Elements */}
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#D0A479] rounded-full opacity-10 blur-3xl"></div>
              <div className="absolute right-40 -bottom-20 w-48 h-48 bg-[#D0A479] rounded-full opacity-10 blur-2xl"></div>

              <div className="flex items-center gap-6 relative z-10 w-full mb-6 md:mb-0">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-b from-[#E6C199] to-[#C09060] p-1 shadow-lg shadow-[#D0A479]/20 flex-shrink-0">
                  <div className="h-full w-full bg-[#141517] rounded-xl flex items-center justify-center relative overflow-hidden">
                    {topPerformer.photo_url ? (
                      <img src={getImageUrl(topPerformer.photo_url)} alt={topPerformer.name} className="h-full w-full object-cover" />
                    ) : (
                      <Crown className="w-8 h-8 text-[#D0A479]" />
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-[#D0A479]/20 text-[#E6C199] text-[10px] font-black uppercase tracking-wider rounded-md border border-[#D0A479]/20">
                      Top Performer
                    </span>
                    <span className="px-2 py-0.5 bg-white/5 text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-md border border-white/5">
                      {topPerformer.store_id || 'All Stores'}
                    </span>
                  </div>
                  <h2 
                    className="text-2xl font-black text-white hover:text-white/80 transition-colors cursor-pointer"
                    onClick={() => onStaffClick && onStaffClick(topPerformer.name)}
                  >
                    {topPerformer.name}
                  </h2>
                  <p className="text-slate-400 text-sm">{topPerformer.role || 'Staff Member'} • {topPerformer.staff_code}</p>
                </div>
              </div>

              <div className="flex items-center gap-8 relative z-10 w-full md:w-auto justify-start md:justify-end">
                <div>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Sales</p>
                  <div className="flex flex-col">
                    <span className="text-3xl font-black text-white">${topPerformer.total_sales?.toLocaleString() || '0'}</span>
                    <span className="text-xs font-bold text-[#D0A479] mt-1">{topPerformer.total_sales_quantity?.toLocaleString() || '0'} Units</span>
                  </div>
                </div>
                <div className="w-px h-12 bg-white/10 hidden md:block"></div>
                <div>
                  <p className="text-[11px] text-[#D0A479] font-bold uppercase tracking-wider mb-1">Commission Earned</p>
                  <p className="text-3xl font-black text-[#E6C199]">${topPerformer.commission?.toLocaleString() || '0'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Performance Table section */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center w-full sm:w-auto">
                {/* Search */}
                <div className="relative w-full sm:w-72">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search staff..."
                    className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#D0A479]/50 focus:border-[#D0A479] sm:text-sm transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              {filterControls}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-[13px] font-bold text-slate-700 uppercase tracking-wider">
                    <th className="px-6 py-4 font-bold border-b border-slate-100">Rank</th>
                    <th className="px-6 py-4 font-bold border-b border-slate-100">Staff Member</th>
                    <th className="px-6 py-4 font-bold border-b border-slate-100">Role</th>
                    <th className="px-6 py-4 font-bold border-b border-slate-100">Assigned Rule</th>
                    <th className="px-6 py-4 font-bold border-b border-slate-100 text-right">Total Sales</th>
                    <th className="px-6 py-4 font-bold border-b border-slate-100 text-right">Commission</th>
                    <th className="px-6 py-4 font-bold border-b border-slate-100 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {sortedStaff.length > 0 ? (
                    sortedStaff.map((staff, index) => {
                      const rank = index + 1;
                      return (
                        <tr key={staff.staff_id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-black text-sm">
                              {rank === 1 ? <Crown className="w-4 h-4 text-amber-500" /> 
                               : rank === 2 ? <Medal className="w-4 h-4 text-slate-400" /> 
                               : rank === 3 ? <Medal className="w-4 h-4 text-amber-700" /> 
                               : rank}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 flex-shrink-0 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold overflow-hidden border border-slate-200">
                                {staff.photo_url ? (
                                  <img src={getImageUrl(staff.photo_url)} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  staff.name ? staff.name.charAt(0).toUpperCase() : 'U'
                                )}
                              </div>
                              <div className="ml-4">
                                <div 
                                  className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors cursor-pointer"
                                  onClick={() => onStaffClick && onStaffClick(staff.name)}
                                >
                                  {staff.name}
                                </div>
                                <div className="text-xs text-slate-500">{staff.staff_code}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-lg bg-slate-100 text-slate-600">
                              {staff.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-xs text-slate-500 font-medium">
                              {staff.assigned_rule || staff.rule_name || 'No Rule'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <div className="font-black text-slate-900">${staff.total_sales?.toLocaleString() || '0'}</div>
                            <div className="text-[10px] font-bold text-slate-400 mt-0.5">{staff.total_sales_quantity?.toLocaleString() || '0'} units</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-black text-emerald-600">
                            ${staff.commission?.toLocaleString() || '0'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {staff.status === 'active' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/50">
                                Inactive
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        <BarChart3 className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                        <p className="text-lg font-medium text-slate-900">No staff performance data found</p>
                        <p className="text-sm mt-1">Check back later or adjust your search filters.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {sortedStaff.length > 0 && (
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center text-sm text-slate-500">
                Showing {sortedStaff.length} staff members
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
