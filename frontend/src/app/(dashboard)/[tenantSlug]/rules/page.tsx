"use client";

import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, MoreHorizontal, X, Save } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface Slab {
  min_value: number;
  max_value?: number | null;
  commission_value: number;
}

interface Rule {
  rule_id: string;
  rule_name: string;
  basis_type: 'Amount' | 'Quantity';
  commission_mode: 'Percentage' | 'Fixed';
  slabs: any[];
}

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New Rule Form State
  const [newRule, setNewRule] = useState({
    rule_name: '',
    basis_type: 'Amount' as const,
    commission_mode: 'Percentage' as const,
    slabs: [{ min_value: 0, max_value: null, commission_value: 0 }] as Slab[]
  });

  const fetchRules = async () => {
    try {
      const response = await api.get('/api/rules/');
      setRules(response.data);
    } catch (err) {
      console.error('Failed to fetch rules');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleAddSlab = () => {
    setNewRule({
      ...newRule,
      slabs: [...newRule.slabs, { min_value: 0, max_value: null, commission_value: 0 }]
    });
  };

  const handleSlabChange = (index: number, field: keyof Slab, value: any) => {
    const updatedSlabs = [...newRule.slabs];
    updatedSlabs[index] = { ...updatedSlabs[index], [field]: value };
    setNewRule({ ...newRule, slabs: updatedSlabs });
  };

  const handleSaveRule = async () => {
    try {
      await api.post('/api/rules/', newRule);
      setIsModalOpen(false);
      fetchRules();
      setNewRule({
        rule_name: '',
        basis_type: 'Amount',
        commission_mode: 'Percentage',
        slabs: [{ min_value: 0, max_value: null, commission_value: 0 }]
      });
    } catch (err) {
      alert('Failed to save rule');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Commission Rules</h1>
          <p className="text-slate-500 text-sm">Define how your team earns their incentives</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-hover text-sm font-semibold shadow-sm"
        >
          <Plus size={18} />
          <span>Create New Rule</span>
        </button>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : rules.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <FileText size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No rules yet</h3>
          <p className="text-slate-500 mb-6">Create your first commission structure to start tracking performance.</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="text-blue-600 font-bold hover:underline"
          >
            + Create Rule
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                  <th className="px-6 py-4">Rule Name</th>
                  <th className="px-6 py-4">Basis</th>
                  <th className="px-6 py-4">Mode</th>
                  <th className="px-6 py-4">Slabs</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rules.map((rule) => (
                  <tr key={rule.rule_id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                          <FileText size={18} />
                        </div>
                        <span className="font-semibold text-slate-900">{rule.rule_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium text-xs">
                        {rule.basis_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium text-xs">
                        {rule.commission_mode}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{rule.slabs.length} slabs defined</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                        <MoreHorizontal size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE RULE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-900">Create Commission Rule</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-bold text-slate-700">Rule Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Seasonal Sales Bonus"
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newRule.rule_name}
                    onChange={(e) => setNewRule({...newRule, rule_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Calculation Basis</label>
                  <select 
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none"
                    value={newRule.basis_type}
                    onChange={(e) => setNewRule({...newRule, basis_type: e.target.value as any})}
                  >
                    <option value="Amount">Total Sale Amount ($)</option>
                    <option value="Quantity">Total Units Sold (Qty)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Commission Mode</label>
                  <select 
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none"
                    value={newRule.commission_mode}
                    onChange={(e) => setNewRule({...newRule, commission_mode: e.target.value as any})}
                  >
                    <option value="Percentage">Percentage of Amount (%)</option>
                    <option value="Fixed">Fixed Amount ($)</option>
                  </select>
                </div>
              </div>

              {/* Slabs */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900">Tiered Slabs</h4>
                  <button 
                    onClick={handleAddSlab}
                    className="text-sm font-bold text-blue-600 hover:text-blue-700"
                  >
                    + Add Slab
                  </button>
                </div>
                
                <div className="space-y-3">
                  {newRule.slabs.map((slab, idx) => (
                    <div key={idx} className="flex items-end gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex-1 space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Min {newRule.basis_type}</label>
                        <input 
                          type="number" 
                          className="w-full px-3 py-1.5 rounded-md border border-slate-200 text-sm" 
                          value={slab.min_value}
                          onChange={(e) => handleSlabChange(idx, 'min_value', parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Max {newRule.basis_type}</label>
                        <input 
                          type="number" 
                          className="w-full px-3 py-1.5 rounded-md border border-slate-200 text-sm" 
                          placeholder="Infinity"
                          value={slab.max_value || ''}
                          onChange={(e) => handleSlabChange(idx, 'max_value', e.target.value ? parseFloat(e.target.value) : null)}
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">
                          {newRule.commission_mode === 'Percentage' ? 'Comm %' : 'Comm Amount'}
                        </label>
                        <input 
                          type="number" 
                          className="w-full px-3 py-1.5 rounded-md border border-slate-200 text-sm font-bold text-blue-600" 
                          value={slab.commission_value}
                          onChange={(e) => handleSlabChange(idx, 'commission_value', parseFloat(e.target.value))}
                        />
                      </div>
                      <button 
                        onClick={() => {
                          const updated = newRule.slabs.filter((_, i) => i !== idx);
                          setNewRule({...newRule, slabs: updated});
                        }}
                        className="p-1.5 text-slate-300 hover:text-red-500 mb-0.5"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 rounded-lg text-sm font-bold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveRule}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg text-sm font-bold shadow-lg shadow-blue-200 flex items-center space-x-2"
              >
                <Save size={18} />
                <span>Save Rule</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
