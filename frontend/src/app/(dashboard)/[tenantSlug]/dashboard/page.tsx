"use client";

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { TrendingUp, Package, Users, DollarSign, Calculator, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    total_sales: 0,
    total_units: 0,
    total_commissions: 0,
    active_staff: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // ... (fetchDashboardData)
  const fetchDashboardData = async () => {
    try {
      const [statsRes, staffRes] = await Promise.all([
        api.get('/api/incentives/stats'),
        api.get('/api/staff/')
      ]);
      setStats({
        ...statsRes.data,
        active_staff: staffRes.data.filter((s: any) => s.status === 'active').length
      });
    } catch (err) {
      console.error('Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecalculate = async () => {
    setIsLoading(true);
    try {
      await api.post('/api/incentives/calculate-all');
      await fetchDashboardData();
    } catch (err) {
      alert('Recalculation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendUpdates = async () => {
    setIsSending(true);
    try {
      const res = await api.post('/api/incentives/send-updates');
      alert(`Successfully sent updates to ${res.data.sent_count} staff members!`);
    } catch (err) {
      alert('Failed to send WhatsApp updates');
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const statConfig = [
    { label: 'Total Sales', value: `$${stats.total_sales.toLocaleString()}`, icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Units Sold', value: stats.total_units.toLocaleString(), icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Active Staff', value: stats.active_staff.toString(), icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Total Commission', value: `$${stats.total_commissions.toLocaleString()}`, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Performance Overview</h1>
          <p className="text-slate-500 mt-1">Real-time tracking of sales and incentives</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleSendUpdates}
            disabled={isSending || stats.total_commissions === 0}
            className="bg-[#C69A70] hover:bg-[#b88c62] text-white px-5 py-2.5 rounded-xl flex items-center space-x-2 transition-all text-sm font-semibold disabled:opacity-50"
          >
            <Send size={18} />
            <span>{isSending ? 'Sending...' : 'Notify via WhatsApp'}</span>
          </button>
          <button 
            onClick={handleRecalculate}
            disabled={isLoading}
            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl flex items-center space-x-2 transition-all text-sm font-semibold disabled:opacity-50"
          >
            <Calculator size={18} />
            <span>{isLoading ? 'Calculating...' : 'Recalculate Now'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statConfig.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2 rounded-xl", stat.bg, stat.color)}>
                <stat.icon size={20} />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Performance Snapshot</h2>
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Month: March 2024</span>
          </div>
        </div>
        <div className="p-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
              <TrendingUp size={32} />
            </div>
            <h4 className="text-lg font-bold text-slate-900">No calculation history yet</h4>
            <p className="text-slate-500 text-sm">
              Upload sales data and create commission rules to see detailed performance breakdowns for your team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
