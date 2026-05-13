"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, 
  RefreshCw, 
  Search, 
  Filter, 
  Calendar, 
  DollarSign, 
  Package, 
  User, 
  MoreHorizontal,
  ChevronRight,
  Download,
  CheckCircle2,
  AlertCircle,
  History,
  ArrowUp
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface SaleRecord {
  id: string;
  order_no?: string;
  external_source?: string;
  external_id?: string;
  order_date: string;
  staff_id: string;
  total_amount: number;
  total_amount_incl_tax: number;
  status: string;
  is_return: boolean;
  lines: any[];
}

export default function SalesDataPage() {
  const [company, setCompany] = useState<any>(null);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [staffMap, setStaffMap] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState('all');
  const [staffFilter, setStaffFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [syncLogs, setSyncLogs] = useState<Array<{ time: string; message: string; status: 'success' | 'error' | 'warning'; imported?: number; duplicates?: number; errors?: number }>>([]);
  const [activeTab, setActiveTab] = useState<'data' | 'activity'>('data');
  
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;
  const router = useRouter();

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [salesRes, staffRes, meRes] = await Promise.all([
        api.get('/api/sales/'),
        api.get('/api/staff/'),
        api.get('/api/auth/me')
      ]);
      
      setCompany(meRes.data.company);
      setStaffMap(staffRes.data.reduce((acc: Record<string, any>, s: any) => {
        acc[s.staff_id] = s;
        return acc;
      }, {}));
      setSales(salesRes.data || []);
    } catch (err: any) {
      console.error("Failed to fetch sales data", err);
      // If we get a 500 error, it often means the tenant schema isn't fully ready or source is missing
      if (err.response?.status === 500) {
        setError("Integration configuration issue. Please check your settings.");
      } else {
        setError("Failed to load sales data. Please try again later.");
      }
      
      // Still try to fetch user info if it wasn't the cause
      try {
        const meRes = await api.get('/api/auth/me');
        setCompany(meRes.data.company);
      } catch {}
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tenantSlug]);

  const handleSync = async () => {
    setIsSyncing(true);
    const syncTime = new Date().toLocaleTimeString();
    try {
      const res = await api.post('/api/sales/sync', {});
      await fetchData();
      
      const imported = res.data.imported_count || 0;
      const duplicates = res.data.duplicate_count || 0;
      const errorCount = res.data.total_errors || 0;
      
      setSyncLogs(prev => [{
        time: syncTime,
        message: res.data.message || `Sync completed: ${imported} imported, ${duplicates} skipped.`,
        status: errorCount > 0 ? 'warning' : 'success',
        imported,
        duplicates,
        errors: errorCount
      }, ...prev]);
      
      // If we have new data, switch to data view but show a small toast or indicator
    } catch (err: any) {
      console.error("Sync failed", err);
      let detail = err.response?.data?.detail;
      if (typeof detail === 'object') {
        detail = JSON.stringify(detail);
      }
      const errorMsg = detail || "Connection failed. Please check your source URL and column mappings in Settings.";
      
      setSyncLogs(prev => [{
        time: syncTime,
        message: errorMsg,
        status: 'error'
      }, ...prev]);
      
      alert(`Sync Failed: ${errorMsg}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredSales = useMemo(() => {
    const query = searchQuery.toLowerCase();
    
    return sales.filter(sale => {
      // Search filter
      const staff = staffMap[sale.staff_id];
      const staffName = staff?.name?.toLowerCase() || '';
      const orderNo = sale.order_no?.toLowerCase() || '';
      const saleId = sale.id?.toLowerCase() || '';
      const matchesSearch = !query || staffName.includes(query) || orderNo.includes(query) || saleId.includes(query);
      
      // Staff filter
      const matchesStaff = staffFilter === 'all' || sale.staff_id === staffFilter;
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || sale.status === statusFilter;
      
      // Date filter
      let matchesDate = true;
      if (dateRange !== 'all') {
        const saleDate = new Date(sale.order_date);
        const now = new Date();
        if (dateRange === 'today') {
          matchesDate = saleDate.toDateString() === now.toDateString();
        } else if (dateRange === 'week') {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          matchesDate = saleDate >= weekAgo;
        } else if (dateRange === 'month') {
          const monthAgo = new Date();
          monthAgo.setMonth(now.getMonth() - 1);
          matchesDate = saleDate >= monthAgo;
        }
      }
      
      return matchesSearch && matchesStaff && matchesStatus && matchesDate;
    });
  }, [sales, staffMap, searchQuery, staffFilter, statusFilter, dateRange]);

  const handleExportCSV = () => {
    if (filteredSales.length === 0) return;
    
    // CSV Header
    const headers = ["Order Ref", "Date", "Staff Name", "Staff Code", "Status", "Amount", "Total Units"];
    
    // CSV Rows
    const rows = filteredSales.map(sale => {
      const staff = staffMap[sale.staff_id];
      const units = sale.lines?.reduce((sum, l) => sum + (l.quantity || 0), 0) || 0;
      return [
        `"${sale.order_no || sale.id}"`,
        `"${new Date(sale.order_date).toLocaleString()}"`,
        `"${staff?.name || 'Unknown'}"`,
        `"${staff?.staff_code || '-'}"`,
        `"${sale.status}"`,
        sale.total_amount,
        units
      ].join(",");
    });
    
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sales_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statuses = useMemo(() => {
    const s = new Set<string>();
    sales.forEach(sale => { if (sale.status) s.add(sale.status); });
    return Array.from(s);
  }, [sales]);

  const uniqueStaff = useMemo(() => {
    const s = new Set<string>();
    sales.forEach(sale => { if (sale.staff_id) s.add(sale.staff_id); });
    return Array.from(s).map(id => ({ id, name: staffMap[id]?.name || 'Unknown' })).sort((a, b) => a.name.localeCompare(b.name));
  }, [sales, staffMap]);

  const totalAmount = useMemo(() => filteredSales.reduce((sum, s) => sum + s.total_amount, 0), [filteredSales]);
  const totalUnits = useMemo(() => filteredSales.reduce((sum, s) => sum + (s.lines?.reduce((ls: number, l: any) => ls + l.quantity, 0) || 0), 0), [filteredSales]);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSales.slice(start, start + pageSize);
  }, [filteredSales, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredSales.length / pageSize);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, staffFilter, dateRange]);

  return (
    <div className="space-y-5 animate-in fade-in duration-700">
      {/* Compact Header Section */}
      <div className="bg-white p-5 md:p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl flex-shrink-0">
              <Database size={22} />
            </div>
            <div className="space-y-0.5">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Integrated Sales</h1>
              <p className="text-slate-500 font-medium text-xs flex items-center flex-wrap">
                From {company?.primary_source || 'source'}
                <span className="mx-2 text-slate-300">•</span>
                {company?.source_url ? (
                  <span className="text-emerald-600 font-bold flex items-center">
                    <CheckCircle2 size={12} className="mr-1" /> Live
                  </span>
                ) : (
                  <span className="text-amber-500 font-bold flex items-center">
                    <AlertCircle size={12} className="mr-1" /> No Connection
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="hidden md:flex items-center space-x-5 mr-5 border-r border-slate-100 pr-5">
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filtered Total</p>
                <p className="text-sm font-black text-slate-900">${totalAmount.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Units</p>
                <p className="text-sm font-black text-slate-900">{totalUnits.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Records</p>
                <p className="text-sm font-black text-slate-900">{filteredSales.length}</p>
              </div>
            </div>

            <button 
              onClick={fetchData}
              className="p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-all border border-slate-100"
              title="Refresh List"
            >
              <RefreshCw size={18} className={cn(isLoading && "animate-spin text-blue-500")} />
            </button>
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl flex items-center space-x-2 transition-all shadow-lg shadow-slate-200 group active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={16} className={cn("text-slate-400 group-hover:text-white", isSyncing && "animate-spin")} />
              <span className="font-bold text-xs uppercase tracking-wide">Sync Now</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center space-x-1 p-1 bg-slate-100/50 rounded-2xl w-fit border border-slate-100">
        <button 
          onClick={() => setActiveTab('data')}
          className={cn(
            "px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
            activeTab === 'data' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
          )}
        >
          Integrated Sales Data
        </button>
        <button 
          onClick={() => setActiveTab('activity')}
          className={cn(
            "px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
            activeTab === 'activity' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
          )}
        >
          Sync Activity Log
          {syncLogs.length > 0 && <span className="ml-2 px-1.5 py-0.5 bg-blue-500 text-white rounded-full text-[9px]">{syncLogs.length}</span>}
        </button>
      </div>

      {activeTab === 'data' ? (
        <>

      {/* Stats Quick Cards - Mobile only or fallback */}
      <div className="grid grid-cols-2 gap-4 md:hidden">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <DollarSign size={18} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sales</p>
            <h3 className="text-sm font-black text-slate-900">${totalAmount.toLocaleString()}</h3>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Package size={18} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Units</p>
            <h3 className="text-sm font-black text-slate-900">{totalUnits.toLocaleString()}</h3>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-3 col-span-2">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
            <User size={18} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Records Found</p>
            <h3 className="text-sm font-black text-slate-900">{filteredSales.length}</h3>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
        {/* Table Filters */}
        <div className="p-6 border-b border-slate-50 flex flex-wrap items-center gap-4 bg-slate-50/30">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by staff, order no, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl border border-slate-100 outline-none transition-all text-sm focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400 shadow-sm"
            />
          </div>
          
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center space-x-2 px-4 py-3 border rounded-xl text-sm font-bold transition-all shadow-sm",
              showFilters ? "bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-200" : "bg-white border-slate-100 text-slate-600 hover:bg-slate-50"
            )}
          >
            <Filter size={16} className={cn(showFilters ? "text-slate-400" : "text-slate-400")} />
            <span>Filters</span>
          </button>
          
          <button 
            onClick={handleExportCSV}
            className="flex items-center space-x-2 px-4 py-3 bg-white border border-slate-100 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download size={16} className="text-slate-400" />
            <span>Export</span>
          </button>
        </div>

        {/* Filter Bar */}
        {showFilters && (
          <div className="p-6 border-b border-slate-50 bg-white space-y-4 animate-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 px-1">
                  <User size={12} className="text-slate-400" />
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter by Staff</label>
                </div>
                <select 
                  value={staffFilter}
                  onChange={(e) => setStaffFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400 transition-all cursor-pointer appearance-none shadow-sm"
                >
                  <option value="all">All Staff Members</option>
                  {uniqueStaff.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 px-1">
                  <CheckCircle2 size={12} className="text-slate-400" />
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter by Status</label>
                </div>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400 transition-all cursor-pointer appearance-none shadow-sm"
                >
                  <option value="all">All Statuses</option>
                  {statuses.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 px-1">
                  <Calendar size={12} className="text-slate-400" />
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Range</label>
                </div>
                <select 
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400 transition-all cursor-pointer appearance-none shadow-sm"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-50">
              <button 
                onClick={() => { setStaffFilter('all'); setStatusFilter('all'); setDateRange('all'); setSearchQuery(''); }}
                className="flex items-center space-x-2 text-[11px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors py-1 px-2 hover:bg-blue-50 rounded-lg"
              >
                <RefreshCw size={12} />
                <span>Reset All Filters</span>
              </button>
            </div>
          </div>
        )}

        {/* Table Content */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-20 text-center space-y-4">
              <RefreshCw className="animate-spin text-blue-500 mx-auto" size={40} />
              <p className="text-slate-400 font-medium">Fetching integrated records...</p>
            </div>
          ) : error ? (
            <div className="p-20 text-center space-y-6">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle size={40} className="text-red-300" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-bold text-slate-900">Connection Error</h3>
                <p className="text-sm text-slate-500 mt-2 mb-6">{error}</p>
                <button 
                  onClick={() => router.push(`/${tenantSlug}/settings?tab=Data Integration`)}
                  className="px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all"
                >
                  Go to Integration Settings
                </button>
              </div>
            </div>
          ) : paginatedSales.length === 0 ? (
            <div className="p-20 text-center space-y-6">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                <Database size={40} className="text-slate-200" />
              </div>
              <div className="max-w-xs mx-auto">
                <h3 className="text-lg font-bold text-slate-900">No Sales Data Found</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {company?.source_url 
                    ? `Your ${company?.primary_source} is connected but has no records yet.` 
                    : `Connect your ${company?.primary_source || 'data source'} in settings to see data here.`}
                </p>
                {!company?.source_url && (
                  <button 
                    onClick={() => router.push(`/${tenantSlug}/settings?tab=Data Integration`)}
                    className="mt-6 px-6 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
                  >
                    Configure Integration
                  </button>
                )}
              </div>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Order Ref</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Staff Member</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedSales.map((sale) => {
                  const staff = staffMap[sale.staff_id];
                  const isExpanded = expandedRows.has(sale.id);
                  return (
                    <React.Fragment key={sale.id}>
                      <tr 
                        className={cn(
                          "group transition-all cursor-pointer",
                          isExpanded ? "bg-blue-50/30" : "hover:bg-slate-50/50"
                        )}
                        onClick={() => toggleRow(sale.id)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <ChevronRight 
                              size={14} 
                              className={cn(
                                "text-slate-400 transition-transform duration-200", 
                                isExpanded && "rotate-90 text-blue-600"
                              )} 
                            />
                            <div className="flex flex-col">
                              <span className="text-[13px] font-bold text-slate-900 leading-none mb-1">
                                {sale.order_no || `Order #${sale.id.slice(0, 8).toUpperCase()}`}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                {sale.external_source || 'Manual/Spreadsheet'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-[13px] font-bold text-slate-900">
                              {new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(sale.order_date))}
                            </span>
                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">
                              {new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(sale.order_date))}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                              {staff?.name?.[0] || '?'}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[13px] font-bold text-slate-900 leading-none mb-1 group-hover:text-blue-600 transition-colors">
                                {staff?.name || 'Unknown Staff'}
                              </span>
                              <span className="text-[11px] font-medium text-slate-400">
                                {staff?.staff_code || 'No Code'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                            sale.status === 'Completed' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-600"
                          )}>
                            {sale.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[13px] font-black text-slate-900 italic">
                            ${(sale.total_amount || (sale as any).amount || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-2 text-slate-300 hover:text-blue-600 transition-colors">
                            <MoreHorizontal size={18} />
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50/30">
                          <td colSpan={6} className="px-12 py-6 border-l-4 border-blue-500/20">
                            <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                                <Package size={14} className="mr-2" /> Order Items
                              </h4>
                              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                                <table className="w-full">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Product</th>
                                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-center">Qty</th>
                                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Unit Price</th>
                                      <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                    {(sale.lines || []).map((line, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50/30">
                                        <td className="px-6 py-4 text-[13px] font-bold text-slate-700">{line.product_name || 'Item'}</td>
                                        <td className="px-6 py-4 text-[13px] font-bold text-slate-500 text-center">{line.quantity}</td>
                                        <td className="px-6 py-4 text-[13px] font-medium text-slate-400 text-right">${line.unit_price?.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-[13px] font-black text-slate-900 text-right">${line.total_amount?.toLocaleString()}</td>
                                      </tr>
                                    ))}
                                    {(!sale.lines || sale.lines.length === 0) && (
                                      <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-sm italic">
                                          No line items available
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Table Footer */}
        <div className="p-6 border-t border-slate-50 bg-slate-50/20 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Showing {paginatedSales.length} of {filteredSales.length} filtered records ({sales.length} total)
          </p>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 text-slate-300 hover:text-slate-900 transition-colors disabled:opacity-30"
            >
              <ChevronRight size={18} className="rotate-180" />
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button 
                  key={pageNum} 
                  onClick={() => setCurrentPage(pageNum)}
                  className={cn(
                    "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                    currentPage === pageNum ? "bg-slate-900 text-white shadow-lg shadow-slate-200" : "text-slate-400 hover:bg-white hover:text-slate-900"
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
            
            {totalPages > 5 && <span className="text-slate-300">...</span>}

            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-2 text-slate-300 hover:text-slate-900 transition-colors disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </>
    ) : (
      <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-400">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Synchronization Summary</h3>
                <p className="text-slate-500 text-xs font-medium">Daily Order data sync-append progress and logs</p>
              </div>
              <div className="flex items-center space-x-2">
                 <button 
                   onClick={() => setSyncLogs([])}
                   className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors"
                 >
                   Clear Logs
                 </button>
              </div>
            </div>

            <div className="p-8">
              {syncLogs.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                    <History size={32} />
                  </div>
                  <p className="text-slate-400 font-medium text-sm">No synchronization activity recorded in this session.</p>
                  <button 
                    onClick={handleSync}
                    className="text-blue-600 font-bold text-xs hover:underline"
                  >
                    Trigger Manual Sync Now
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Daily Progress Stats Card */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Appended</p>
                      <p className="text-2xl font-black text-emerald-700">{syncLogs.reduce((s, l) => s + (l.imported || 0), 0)}</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-100">
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Duplicates Skipped</p>
                      <p className="text-2xl font-black text-amber-700">{syncLogs.reduce((s, l) => s + (l.duplicates || 0), 0)}</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-red-50/50 border border-red-100">
                      <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Errors Encountered</p>
                      <p className="text-2xl font-black text-red-700">{syncLogs.reduce((s, l) => s + (l.errors || 0), 0)}</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100">
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Total Cycles</p>
                      <p className="text-2xl font-black text-blue-700">{syncLogs.length}</p>
                    </div>
                  </div>

                  {/* Sync-Append Table */}
                  <div className="bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Time</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Event / Message</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Delta</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {syncLogs.map((log, idx) => (
                          <tr key={idx} className="hover:bg-white transition-colors">
                            <td className="px-6 py-4">
                              <span className="text-xs font-bold text-slate-500">{log.time}</span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-[13px] font-bold text-slate-800 leading-tight">{log.message}</p>
                              {log.errors ? (
                                <p className="text-[10px] text-red-500 font-medium mt-1">Check settings for mapping errors.</p>
                              ) : null}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <span className="flex items-center text-[11px] font-bold text-emerald-600">
                                  <ArrowUp size={10} className="mr-0.5" /> {log.imported || 0}
                                </span>
                                <span className="flex items-center text-[11px] font-bold text-slate-400">
                                  <RefreshCw size={10} className="mr-0.5" /> {log.duplicates || 0}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={cn(
                                "px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest",
                                log.status === 'success' ? "bg-emerald-100 text-emerald-700" :
                                log.status === 'error' ? "bg-red-100 text-red-700" :
                                "bg-amber-100 text-amber-700"
                              )}>
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Configuration Context Card */}
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 group-hover:rotate-0 transition-transform duration-1000">
              <Database size={200} />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-4 max-w-xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
                    <Database size={24} />
                  </div>
                  <h3 className="text-xl font-black tracking-tight">Integrated Source Monitoring</h3>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed font-medium">
                  The system is currently pulling from <span className="text-blue-400 font-bold">{company?.primary_source}</span>. 
                  Any changes to mappings or source URLs must be configured in the master settings panel.
                </p>
                <div className="flex items-center space-x-6">
                   <div className="space-y-1">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Last Successful Sync</p>
                     <p className="text-sm font-bold">{company?.last_sync_at ? new Date(company.last_sync_at).toLocaleString() : 'Never'}</p>
                   </div>
                   <div className="space-y-1">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Frequency</p>
                     <p className="text-sm font-bold">{company?.sync_frequency || 'Manual'}</p>
                   </div>
                </div>
              </div>
              <button 
                onClick={() => router.push(`/${tenantSlug}/settings?tab=Data Integration`)}
                className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center space-x-3 shadow-xl"
              >
                <span>Configuration panel</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
