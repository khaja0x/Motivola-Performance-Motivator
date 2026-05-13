"use client";
import React, { useState, useEffect } from 'react';
import { 
  Loader2, Plus, Brain, ChevronDown, User, X, 
  CheckCircle2, AlertCircle, Trash2, Target, 
  TrendingUp, Layers, MousePointer2 
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface Slab {
  min_value: number;
  max_value?: number;
  commission_value: number;
}

interface CommissionRule {
  rule_id: string;
  rule_name: string;
  rule_type: 'Tiered/Slab' | 'Threshold Multiplier';
  basis_type: 'Amount' | 'Quantity' | 'Target %';
  commission_mode: 'Percentage' | 'Fixed';
  slabs: Slab[];
}

interface Assignment {
  staff_id: string;
  staff_name: string;
  rule_id: string | null;
  rule_name: string;
  effective_from: string | null;
}

interface Props {
  showSuccess: (msg: string) => void;
  showError: (msg: any) => void;
}

export default function CommissionRulesTab({ showSuccess, showError }: Props) {
  const [activeCommissionTab, setActiveCommissionTab] = useState<'Rules List' | 'Assignments' | 'AI Builder'>('Rules List');
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState(true);
  
  // Rule Creation/Edit State
  const [showCreateRuleModal, setShowCreateRuleModal] = useState(false);
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [newRule, setNewRule] = useState<Omit<CommissionRule, 'rule_id'> & { rule_id?: string }>({
    rule_name: '',
    rule_type: 'Tiered/Slab',
    basis_type: 'Amount',
    commission_mode: 'Percentage',
    slabs: [{ min_value: 0, max_value: undefined, commission_value: 0 }]
  });

  // Assignments State
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [bulkAssignment, setBulkAssignment] = useState({ rule_id: '', effective_from: new Date().toISOString().split('T')[0] });
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);

  // Delete State
  const [ruleToDelete, setRuleToDelete] = useState<CommissionRule | null>(null);
  const [isDeletingRule, setIsDeletingRule] = useState(false);

  const fetchRules = async () => {
    setIsLoadingRules(true);
    try {
      const res = await api.get('/api/rules');
      setRules(res.data);
    } catch (err) {
      console.error("Failed to fetch rules", err);
    } finally {
      setIsLoadingRules(false);
    }
  };

  const fetchAssignments = async () => {
    setIsLoadingAssignments(true);
    try {
      const res = await api.get('/api/rules/assignments/list');
      setAssignments(res.data);
    } catch (err) {
      console.error("Failed to fetch assignments", err);
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  useEffect(() => {
    fetchRules();
    if (activeCommissionTab === 'Assignments') fetchAssignments();
  }, [activeCommissionTab]);

  const addSlab = () => {
    const lastSlab = newRule.slabs[newRule.slabs.length - 1];
    setNewRule({
      ...newRule,
      slabs: [...newRule.slabs, { min_value: lastSlab.max_value || 0, max_value: undefined, commission_value: 0 }]
    });
  };

  const removeSlab = (index: number) => {
    if (newRule.slabs.length <= 1) return;
    const updated = [...newRule.slabs];
    updated.splice(index, 1);
    setNewRule({ ...newRule, slabs: updated });
  };

  const updateSlab = (index: number, field: keyof Slab, value: string) => {
    const updated = [...newRule.slabs];
    updated[index] = { ...updated[index], [field]: value === "" ? undefined : Number(value) };
    setNewRule({ ...newRule, slabs: updated });
  };

  const handleCreateRule = async () => {
    if (!newRule.rule_name) {
      showError("Rule name is required.");
      return;
    }
    setIsSavingRule(true);
    try {
      if (editingRuleId) {
        await api.put(`/api/rules/${editingRuleId}`, newRule);
        showSuccess("Rule updated successfully!");
      } else {
        await api.post('/api/rules', newRule);
        showSuccess("Rule created successfully!");
      }
      setShowCreateRuleModal(false);
      setEditingRuleId(null);
      fetchRules();
    } catch (err: any) {
      showError(err.response?.data?.detail || "Something went wrong.");
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleEditRule = (rule: CommissionRule) => {
    setEditingRuleId(rule.rule_id);
    setNewRule({
      rule_name: rule.rule_name,
      rule_type: rule.rule_type,
      basis_type: rule.basis_type,
      commission_mode: rule.commission_mode,
      slabs: rule.slabs
    });
    setShowCreateRuleModal(true);
  };

  const handleConfirmDeleteRule = async () => {
    if (!ruleToDelete) return;
    setIsDeletingRule(true);
    try {
      await api.delete(`/api/rules/${ruleToDelete.rule_id}`);
      showSuccess("Rule deleted successfully!");
      setRuleToDelete(null);
      fetchRules();
      if (activeCommissionTab === 'Assignments') fetchAssignments();
    } catch (err: any) {
      showError(err.response?.data?.detail || "Check if rule is assigned to any staff member before deleting.");
    } finally {
      setIsDeletingRule(false);
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignment.rule_id) return;
    setIsBulkAssigning(true);
    try {
      await api.post('/api/rules/assign/bulk', bulkAssignment);
      showSuccess("Rule assigned to all active staff!");
      fetchAssignments();
    } catch (err) {
      showError("Failed to perform bulk assignment.");
    } finally {
      setIsBulkAssigning(false);
    }
  };

  const handleIndividualAssign = async (staffId: string, ruleId: string) => {
    try {
      await api.post('/api/rules/assign', {
        staff_id: staffId,
        rule_id: ruleId === "" ? null : ruleId,
        effective_from: new Date().toISOString().split('T')[0]
      });
      showSuccess("Assignment updated!");
      fetchAssignments();
    } catch (err) {
      showError("Failed to update assignment.");
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Commission Config</h2>
          <div className="h-1 w-12 bg-[#D0A479] rounded-full"></div>
        </div>
        
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl w-fit border border-slate-200 shadow-inner">
          {['Rules List', 'Assignments', 'AI Builder'].map((tab: any) => (
            <button
              key={tab}
              onClick={() => setActiveCommissionTab(tab)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[12px] font-black transition-all",
                activeCommissionTab === tab 
                  ? "bg-white text-[#141517] shadow-xl border border-slate-200/50" 
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeCommissionTab === 'Rules List' && (
          <button 
            onClick={() => {
              setEditingRuleId(null);
              setNewRule({
                rule_name: '',
                rule_type: 'Tiered/Slab',
                basis_type: 'Amount',
                commission_mode: 'Percentage',
                slabs: [{ min_value: 0, max_value: undefined, commission_value: 0 }]
              });
              setShowCreateRuleModal(true);
            }}
            className="px-6 py-3 bg-[#D0A479] hover:bg-[#bd9756] text-[#141517] text-[13px] font-black rounded-2xl flex items-center transition-all shadow-xl shadow-[#D0A479]/20"
          >
            <Plus size={18} className="mr-2" /> New Rule
          </button>
        )}
      </div>

      {activeCommissionTab === 'Rules List' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoadingRules ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-slate-50 border border-slate-100 rounded-3xl animate-pulse"></div>
            ))
          ) : rules.length === 0 ? (
            <div className="col-span-full py-20 text-center space-y-4">
              <Layers className="mx-auto text-slate-200" size={48} />
              <p className="text-slate-400 font-bold">No commission rules created yet.</p>
            </div>
          ) : rules.map(rule => (
            <div key={rule.rule_id} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all group flex flex-col h-full">
              <div className="flex items-start justify-between mb-6">
                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-slate-900 group-hover:text-[#D0A479] transition-colors">{rule.rule_name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-black uppercase tracking-wider">{rule.rule_type}</span>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">•</span>
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-wider",
                      rule.basis_type === 'Amount' ? "text-emerald-600" : rule.basis_type === 'Quantity' ? "text-blue-600" : "text-purple-600"
                    )}>By {rule.basis_type}</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#D0A479]/10 group-hover:text-[#D0A479] transition-all">
                  <TrendingUp size={20} />
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/50">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <th className="pb-2">Performance Range</th>
                        <th className="pb-2 text-right">Incentive</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rule.slabs.map((slab, i) => (
                        <tr key={i} className="text-[12px] font-bold text-slate-700">
                          <td className="py-2">
                            {slab.max_value ? `${slab.min_value} - ${slab.max_value}` : `${slab.min_value}+`}
                          </td>
                          <td className={cn(
                            "py-2 text-right",
                            rule.commission_mode === 'Percentage' ? "text-[#D0A479]" : "text-blue-600"
                          )}>
                            {rule.commission_mode === 'Percentage' ? `${slab.commission_value}%` : `$${slab.commission_value}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button onClick={() => handleEditRule(rule)} className="flex-1 py-3 bg-white border border-slate-200 rounded-xl text-[12px] font-bold text-slate-500 hover:bg-slate-50 transition-all">Edit</button>
                  <button onClick={() => setRuleToDelete(rule)} className="py-3 px-4 bg-red-50 text-red-600 rounded-xl text-[12px] font-bold border border-red-100/50 hover:bg-red-100 transition-all"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeCommissionTab === 'Assignments' && (
        <div className="space-y-8 pt-4">
          <div className="bg-[#FAF7F2] rounded-[1.5rem] border border-[#D0A479]/15 p-6 space-y-4 shadow-sm shadow-[#D0A479]/5">
            <div className="space-y-0.5">
              <h3 className="text-[16px] font-black text-slate-900 tracking-tight">Bulk Assignment</h3>
              <p className="text-slate-500 text-[12px] font-medium">Apply a single rule to all active staff members at once.</p>
            </div>
            <div className="flex flex-col md:flex-row items-end gap-4">
              <div className="flex-[2] space-y-1.5 w-full">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Rule</label>
                <div className="relative">
                  <select 
                    value={bulkAssignment.rule_id}
                    onChange={(e) => setBulkAssignment({ ...bulkAssignment, rule_id: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-[#D0A479]/10 bg-white focus:border-[#D0A479] outline-none transition-all text-[13px] font-bold appearance-none cursor-pointer"
                  >
                    <option value="">Select a Rule</option>
                    {rules.map(rule => <option key={rule.rule_id} value={rule.rule_id}>{rule.rule_name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>
              <div className="flex-1 space-y-1.5 w-full">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Effective From</label>
                <input type="date" value={bulkAssignment.effective_from} onChange={(e) => setBulkAssignment({ ...bulkAssignment, effective_from: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-[#D0A479]/10 bg-white focus:border-[#D0A479] outline-none text-[13px] font-bold"
                />
              </div>
              <button 
                onClick={handleBulkAssign} disabled={isBulkAssigning || !bulkAssignment.rule_id}
                className="flex-1 w-full md:w-auto px-8 py-[13.5px] bg-[#D0A479] text-[#141517] rounded-xl text-[12px] font-black shadow-lg hover:bg-[#bd9756] transition-all disabled:opacity-50"
              >
                {isBulkAssigning ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Assign to All"}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[1.5rem] border border-slate-200 overflow-hidden shadow-sm">
             <div className="px-6 py-5 border-b border-slate-50">
               <h3 className="text-[16px] font-black text-slate-900 tracking-tight">Individual Assignments</h3>
             </div>
             <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Staff</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rule</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Effective From</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingAssignments ? (
                    <tr><td colSpan={4} className="px-8 py-20 text-center"><Loader2 className="animate-spin text-[#D0A479] mx-auto mb-2" size={24} /><span className="text-slate-400 text-sm">Loading...</span></td></tr>
                  ) : assignments.length === 0 ? (
                    <tr><td colSpan={4} className="px-8 py-20 text-center text-slate-400 text-sm">No staff members found</td></tr>
                  ) : assignments.map(assign => (
                    <tr key={assign.staff_id} className="hover:bg-slate-50/30 transition-all group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#D0A479]/10 group-hover:text-[#D0A479] transition-all"><User size={16} /></div>
                          <span className="text-[13px] font-bold text-slate-700">{assign.staff_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 cursor-pointer" onClick={() => setEditingAssignmentId(assign.staff_id)}>
                        <span className={cn(
                          "px-3 py-1 rounded-lg text-[11px] font-bold",
                          assign.rule_id ? "bg-emerald-50 text-emerald-600 border border-emerald-100/30" : "bg-slate-100 text-slate-400"
                        )}>{assign.rule_name}</span>
                      </td>
                      <td className="px-6 py-4 text-[13px] font-medium text-slate-400">{assign.effective_from ? new Date(assign.effective_from).toLocaleDateString() : '—'}</td>
                      <td className="px-6 py-4 text-right">
                        {editingAssignmentId === assign.staff_id ? (
                          <div className="flex items-center justify-end gap-2">
                            <select 
                              autoFocus
                              className="px-3 py-1.5 rounded-lg border border-[#D0A479] text-[10px] font-black outline-none bg-white"
                              value={assign.rule_id || ""}
                              onChange={(e) => { handleIndividualAssign(assign.staff_id, e.target.value); setEditingAssignmentId(null); }}
                              onBlur={() => setEditingAssignmentId(null)}
                            >
                              <option value="">No Rule</option>
                              {rules.map(r => <option key={r.rule_id} value={r.rule_id}>{r.rule_name}</option>)}
                            </select>
                          </div>
                        ) : (
                          <button onClick={() => setEditingAssignmentId(assign.staff_id)} className="px-3 py-1.5 bg-slate-50 text-slate-500 border border-slate-200 rounded-lg text-[10px] font-black uppercase hover:bg-[#D0A479] hover:text-[#141517] transition-all">Change</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeCommissionTab === 'AI Builder' && (
        <div className="p-20 text-center space-y-6 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-sm border border-slate-100"><Brain className="text-[#D0A479]" size={36} /></div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-900">Natural Language Rules</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto font-medium">Our AI is preparing your commission logic workspace. Experience natural language rule generation soon.</p>
          </div>
          <button className="px-8 py-3 bg-[#D0A479] text-[#141517] rounded-xl text-[13px] font-bold shadow-lg opacity-50 cursor-not-allowed">Coming Soon</button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateRuleModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#141517]/40 backdrop-blur-sm" onClick={() => !isSavingRule && setShowCreateRuleModal(false)} />
          <div className="relative bg-white rounded-[2.5rem] w-full max-w-2xl p-10 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 h-fit max-h-[85vh] overflow-y-auto no-scrollbar">
            <button onClick={() => setShowCreateRuleModal(false)} className="absolute top-6 right-8 text-slate-400 hover:text-slate-600"><X size={24} /></button>
            <div className="text-center mb-10"><h2 className="text-2xl font-black text-slate-900">{editingRuleId ? 'Edit Rule' : 'Create Rule'}</h2></div>
            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-slate-700">Rule Name</label>
                <input type="text" value={newRule.rule_name} onChange={(e) => setNewRule({ ...newRule, rule_name: e.target.value })} placeholder="e.g. Monthly Incentive"
                  className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-[#D0A479]/10 focus:border-[#D0A479] outline-none text-[14px] font-bold"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-slate-700">Rule Type</label>
                  <select value={newRule.rule_type} onChange={(e) => setNewRule({ ...newRule, rule_type: e.target.value as any })}
                    className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 outline-none text-sm font-bold appearance-none cursor-pointer"
                  >
                    <option value="Tiered/Slab">Tiered/Slab</option>
                    <option value="Threshold Multiplier">Threshold Multiplier</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-slate-700">Basis</label>
                  <select value={newRule.basis_type} onChange={(e) => setNewRule({ ...newRule, basis_type: e.target.value as any })}
                    className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 outline-none text-sm font-bold appearance-none cursor-pointer"
                  >
                    <option value="Amount">Amount</option>
                    <option value="Quantity">Quantity</option>
                    <option value="Target %">Target %</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-slate-700">Incentive Mode</label>
                <div className="flex gap-4">
                  {['Percentage', 'Fixed'].map(m => (
                    <button key={m} onClick={() => setNewRule({ ...newRule, commission_mode: m as any })}
                      className={cn("px-6 py-3 rounded-xl text-xs font-black transition-all border", 
                        newRule.commission_mode === m ? "bg-[#D0A479] text-[#141517] border-[#D0A479]" : "bg-white text-slate-400 border-slate-200"
                      )}
                    >{m}</button>
                  ))}
                </div>
              </div>

              {newRule.rule_type === 'Tiered/Slab' ? (
                <div className="space-y-4">
                  <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wider">Slabs/Tiers</label>
                  <div className="space-y-4">
                    <div className="grid grid-cols-[1fr_1fr_1fr_50px] gap-4 px-2 text-[10px] font-black text-slate-400 uppercase">
                      <span>Min</span><span>Max</span><span>Value</span><span></span>
                    </div>
                    {newRule.slabs.map((slab, i) => (
                      <div key={i} className="grid grid-cols-[1fr_1fr_1fr_50px] gap-4 items-center">
                        <input type="number" value={slab.min_value} onChange={(e) => updateSlab(i, 'min_value', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50/50 text-[13px] font-bold" />
                        <input type="number" value={slab.max_value === undefined ? "" : slab.max_value} onChange={(e) => updateSlab(i, 'max_value', e.target.value)} placeholder="Unlimited" className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50/50 text-[13px] font-bold" />
                        <div className="relative">
                          <input type="number" value={slab.commission_value} onChange={(e) => updateSlab(i, 'commission_value', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50/50 text-[13px] font-bold pr-8" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black">{newRule.commission_mode === 'Percentage' ? '%' : '$'}</span>
                        </div>
                        <button onClick={() => removeSlab(i)} disabled={newRule.slabs.length === 1} className="p-2 text-slate-300 hover:text-red-500 disabled:opacity-0"><X size={16} /></button>
                      </div>
                    ))}
                    <button onClick={addSlab} className="w-full py-4 border-2 border-dashed border-slate-100 rounded-2xl text-[13px] font-black text-slate-400 hover:border-[#D0A479] hover:text-[#D0A479] transition-all">+ Add Slab</button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <label className="text-[11px] font-black text-slate-400 uppercase">Threshold (%)</label>
                     <input type="number" value={newRule.slabs[0].min_value} onChange={(e) => updateSlab(0, 'min_value', e.target.value)} className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-bold" />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[11px] font-black text-slate-400 uppercase">Multiplier Incentive</label>
                     <div className="relative">
                      <input type="number" value={newRule.slabs[0].commission_value} onChange={(e) => updateSlab(0, 'commission_value', e.target.value)} className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-bold pr-10" />
                      <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black">{newRule.commission_mode === 'Percentage' ? '%' : '$'}</span>
                     </div>
                   </div>
                </div>
              )}

              <div className="flex items-center gap-4 pt-4 border-t border-slate-50">
                <button onClick={() => setShowCreateRuleModal(false)} disabled={isSavingRule} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl">Cancel</button>
                <button onClick={handleCreateRule} disabled={isSavingRule} className="flex-[2] py-4 bg-[#D0A479] text-[#141517] font-bold rounded-2xl shadow-xl flex items-center justify-center">
                  {isSavingRule ? <Loader2 className="animate-spin mr-3" size={20} /> : 'Save Rule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Rule Modal */}
      {ruleToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#141517]/40 backdrop-blur-sm" onClick={() => setRuleToDelete(null)} />
          <div className="relative bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6"><Trash2 className="text-red-500" size={36} /></div>
            <div className="text-center space-y-3 mb-10">
              <h3 className="text-2xl font-black text-slate-900">Delete Rule?</h3>
              <p className="text-slate-500 text-[13px] font-medium leading-relaxed">Are you sure you want to delete <span className="text-slate-900 font-bold">"{ruleToDelete.rule_name}"</span>? This cannot be undone.</p>
            </div>
            <div className="flex flex-col space-y-3">
              <button onClick={handleConfirmDeleteRule} disabled={isDeletingRule} className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl transition-all shadow-xl shadow-red-500/20">
                {isDeletingRule ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Delete Confirm'}
              </button>
              <button onClick={() => setRuleToDelete(null)} disabled={isDeletingRule} className="w-full py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
