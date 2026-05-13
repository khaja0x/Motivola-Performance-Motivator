"use client";
import React, { useState, useRef, useCallback } from 'react';
import { 
  Loader2, Database, Upload, AlertCircle, CheckCircle2, 
  Brain, FileSpreadsheet, RefreshCw, Layers 
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface Mapping {
  external_column: string;
  internal_field: string;
  confidence: string;
}

interface SyncLog {
  time: string;
  message: string;
  status: 'success' | 'error';
  imported?: number;
  duplicates?: number;
}

interface Props {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  showSuccess: (msg: string) => void;
  showError: (msg: any) => void;
}

export default function DataIntegrationTab({ formData, setFormData, showSuccess, showError }: Props) {
  const [manualFile, setManualFile] = useState<File | null>(null);
  const manualFileRef = useRef<HTMLInputElement>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isConnectionVerified, setIsConnectionVerified] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConfirmingMapping, setIsConfirmingMapping] = useState(false);
  
  const [columnMappings, setColumnMappings] = useState<Mapping[]>([]);
  const [internalFields, setInternalFields] = useState<string[]>([]);
  const [previewRowCount, setPreviewRowCount] = useState(0);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);

  // Reset stale state when the user switches data source type
  const handleSourceChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSource = e.target.value;
    
    // 1. Immediately clear mapping & verification states to prevent stale renders
    setIsConnectionVerified(false);
    setColumnMappings([]);
    setInternalFields([]);
    setPreviewRowCount(0);
    setManualFile(null);

    // 2. Update parent formData
    setFormData((prev: any) => ({
      ...prev,
      primary_source: newSource,
      // Ensure other fields used in controlled inputs stay defined
      source_url: prev?.source_url || ""
    }));
  }, [setFormData, setIsConnectionVerified, setColumnMappings, setInternalFields, setPreviewRowCount, setManualFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setManualFile(e.target.files[0]);
    }
  };

  const processFile = async () => {
    if (!manualFile) return;
    setIsProcessingFile(true);
    setColumnMappings([]);
    try {
      const fd = new FormData();
      fd.append('file', manualFile);
      const res = await api.post('/api/sales/preview', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setColumnMappings(res.data.mappings || []);
      setInternalFields(res.data.internal_fields || []);
      setPreviewRowCount(res.data.row_count || 0);
      setSyncLogs(prev => [{ time: new Date().toLocaleTimeString(), message: `Parsed ${res.data.row_count} rows from ${manualFile.name}`, status: 'success' }, ...prev]);
    } catch (err: any) {
      showError(err.response?.data?.detail || 'Failed to process file');
      setSyncLogs(prev => [{ time: new Date().toLocaleTimeString(), message: `Failed to parse ${manualFile.name}`, status: 'error' }, ...prev]);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const testConnection = async () => {
    if (!formData.source_url) return;
    setIsTestingConnection(true);
    try {
      await api.put('/api/auth/company', { 
        source_url: formData.source_url, 
        primary_source: formData.primary_source, 
        sync_frequency: formData.sync_frequency 
      });
      const prevRes = await api.post('/api/sales/preview');
      setColumnMappings(prevRes.data.mappings || []);
      setInternalFields(prevRes.data.internal_fields || []);
      setPreviewRowCount(prevRes.data.row_count || 0);
      setIsConnectionVerified(true);
      showSuccess("Connection successful!");
      setSyncLogs(prev => [{ time: new Date().toLocaleTimeString(), message: `Connected to ${formData.primary_source}. Found ${prevRes.data.row_count} rows.`, status: 'success' }, ...prev]);
    } catch (err: any) {
      showError(err.response?.data?.detail || "Connection test failed");
      setIsConnectionVerified(false);
      setSyncLogs(prev => [{ time: new Date().toLocaleTimeString(), message: `Connection failed`, status: 'error' }, ...prev]);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const syncNow = async () => {
    setIsSyncing(true);
    setIsConfirmingMapping(true);
    try {
      if ((formData.primary_source || 'CSV Upload') === 'CSV Upload' && manualFile) {
        const fd = new FormData();
        fd.append('file', manualFile);
        if (columnMappings.length > 0) fd.append('mappings', JSON.stringify(columnMappings));
        const res = await api.post('/api/sales/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        showSuccess(res.data.message);
        setSyncLogs(prev => [{ 
          time: new Date().toLocaleTimeString(), message: res.data.message, status: 'success',
          imported: res.data.imported_count, duplicates: res.data.duplicate_count
        }, ...prev]);
      } else {
        const res = await api.post('/api/sales/sync', { mappings: columnMappings });
        showSuccess(res.data.message);
        setFormData((prev: any) => ({ ...prev, last_sync_at: res.data.last_sync_at }));
        setSyncLogs(prev => [{ 
          time: new Date().toLocaleTimeString(), message: res.data.message || "Sync complete", status: 'success',
          imported: res.data.imported_count, duplicates: res.data.duplicate_count
        }, ...prev]);
      }
    } catch (err: any) {
      showError(err.response?.data?.detail || "Sync failed");
      setSyncLogs(prev => [{ time: new Date().toLocaleTimeString(), message: `Sync failed`, status: 'error' }, ...prev]);
    } finally {
      setIsSyncing(false);
      setIsConfirmingMapping(false);
    }
  };

  // Determine current source with robust fallback to prevent controlled/uncontrolled flips
  const currentSource = (formData?.primary_source || 'CSV Upload') as string;

  return (
    <div className="p-8 space-y-12 animate-in fade-in duration-500">
      {/* Section 1: Inbound Data Source */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 flex items-center space-x-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100/50 flex-shrink-0">
            <RefreshCw className="text-indigo-500" size={24} />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-[17px] font-black text-slate-900 tracking-tight">Inbound Data Connection</h3>
            <p className="text-[13px] text-slate-400 font-medium">Link Motivola to your ERP, POS, or simply upload a CSV file.</p>
          </div>
        </div>

        <div className="p-10 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            <div className="space-y-4">
              <label className="text-[14px] font-bold text-slate-800 flex items-center">
                <Layers className="mr-2 text-slate-400" size={16} /> Data Source
              </label>
              <select 
                name="primary_source"
                value={currentSource || "CSV Upload"} 
                onChange={handleSourceChange}
                className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 outline-none text-[13px] font-bold focus:bg-white focus:ring-4 focus:ring-[#D0A479]/10"
              >
                <option value="CSV Upload">Manual CSV Upload</option>
                <option value="Google Sheets">Google Sheets</option>
                <option value="Shopify API">Shopify API</option>
                <option value="RetailEdge POS">RetailEdge POS (Cloud)</option>
              </select>
            </div>
            {currentSource === 'CSV Upload' ? (
              <div className="space-y-4">
                <label className="text-[14px] font-bold text-slate-800 flex items-center">
                  <Upload className="mr-2 text-slate-400" size={16} /> Choose Spreadsheet
                </label>
                <input type="file" ref={manualFileRef} onChange={handleFileChange} className="hidden" accept=".csv" />
                <button onClick={() => manualFileRef.current?.click()} className="w-full px-6 py-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 font-bold text-[13px] hover:border-[#D0A479] hover:bg-[#D0A479]/5 transition-all flex items-center justify-center gap-2">
                  <FileSpreadsheet size={18} /> {manualFile ? manualFile.name : 'Select sales_data.csv'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="text-[14px] font-bold text-slate-800 flex items-center">
                  <Database className="mr-2 text-slate-400" size={16} /> Endpoint/Sheet URL
                </label>
                <input 
                  type="text" 
                  name="source_url" 
                  value={formData.source_url || ""} 
                  onChange={(e) => setFormData((prev: any) => ({...prev, source_url: e.target.value}))} 
                  placeholder="https://docs.google.com/spreadsheets/..." 
                  className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 outline-none text-[13px] font-bold" 
                />
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              {currentSource === 'CSV Upload' ? (
                <button onClick={processFile} disabled={!manualFile || isProcessingFile} className="px-8 py-3 bg-[#D0A479] text-[#141517] rounded-xl text-[13px] font-black shadow-lg hover:bg-[#bd9756] transition-all disabled:opacity-50">
                  {isProcessingFile ? <Loader2 size={16} className="animate-spin" /> : 'Process File'}
                </button>
              ) : (
                <button onClick={testConnection} disabled={!formData.source_url || isTestingConnection} className="px-8 py-3 bg-[#D0A479] text-[#141517] rounded-xl text-[13px] font-black shadow-lg hover:bg-[#bd9756] transition-all disabled:opacity-50">
                  {isTestingConnection ? <Loader2 size={16} className="animate-spin" /> : 'Test Connection'}
                </button>
              )}
              <button onClick={syncNow} disabled={currentSource === 'CSV Upload' ? (!manualFile || isSyncing) : (!isConnectionVerified || isSyncing)} className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-[13px] font-bold hover:bg-slate-50 transition-all">
                {isSyncing ? <Loader2 size={16} className="animate-spin" /> : 'Sync Now'}
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", (manualFile || isConnectionVerified) ? "bg-emerald-500" : "bg-slate-300")} />
              <span className="text-[12px] font-bold text-slate-400">
                {(manualFile || isConnectionVerified) ? 'Connected & Ready' : 'Input data source to enable sync'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Mapping */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Brain className="text-pink-400" size={24} />
            <h3 className="text-[17px] font-black text-slate-900 tracking-tight">Smart Mapping {previewRowCount > 0 && <span className="ml-2 px-2 py-0.5 bg-pink-50 text-pink-500 rounded-lg text-[10px]">{previewRowCount} rows found</span>}</h3>
          </div>
        </div>
        <div className="p-8">
          {columnMappings.length === 0 ? (
            <div className="py-16 text-center text-slate-300 italic font-medium">No external columns detected. Process source to map.</div>
          ) : (
            <div className="space-y-6">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                    <th className="px-6 py-4">External Column</th>
                    <th className="px-6 py-4">Maps to Motivola Field</th>
                    <th className="px-6 py-4 text-right">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {columnMappings.map((m, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-6 py-4 font-mono text-[13px] font-bold text-slate-600">{m.external_column}</td>
                      <td className="px-6 py-4">
                        <select 
                          value={m.internal_field || ""} 
                          onChange={(e) => {
                            const updated = [...columnMappings];
                            updated[i] = {...m, internal_field: e.target.value, confidence: 'Manual'};
                            setColumnMappings(updated);
                          }}
                          className="px-4 py-2 rounded-xl border border-slate-100 bg-slate-50 text-[12px] font-bold outline-none focus:bg-white"
                        >
                          <option value="" disabled>Select field</option>
                          {internalFields.map(f => <option key={f} value={f}>{f}</option>)}
                          <option value="ignore">ignore</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={cn("px-2 py-1 rounded-md text-[10px] font-black uppercase", 
                          m.confidence === 'High' ? "bg-emerald-100 text-emerald-600" : m.confidence === 'Medium' ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                        )}>{m.confidence}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end pt-4">
                <button onClick={syncNow} disabled={isConfirmingMapping} className="px-10 py-4 bg-[#141517] text-[#D0A479] rounded-[20px] text-xs font-black tracking-widest uppercase hover:scale-105 transition-all shadow-xl disabled:opacity-50">
                  {isConfirmingMapping ? <Loader2 className="animate-spin" /> : 'Confirm & Sync All Data'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Sync Logs */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center space-x-4">
          <RefreshCw size={20} className="text-[#CBA68A]" />
          <h3 className="text-[17px] font-black text-slate-900 tracking-tight">Recent Synchronization Trace</h3>
        </div>
        <div className="p-8 space-y-4">
          {syncLogs.length === 0 ? (
            <div className="py-10 text-center text-slate-300 font-bold italic">No sync activity recorded in this session.</div>
          ) : (
            syncLogs.map((log, i) => (
              <div key={i} className={cn("p-5 rounded-2xl border flex items-center justify-between",
                log.status === 'success' ? "bg-emerald-50/30 border-emerald-100/50" : "bg-red-50/30 border-red-100/50"
              )}>
                <div className="flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", log.status === 'success' ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600")}>
                    {log.status === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-slate-800">{log.message}</h4>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{log.time}</span>
                  </div>
                </div>
                {log.imported !== undefined && (
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[14px] font-black text-emerald-600">+{log.imported}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">New</p>
                    </div>
                    <div className="w-px h-6 bg-slate-100" />
                    <div className="text-right">
                      <p className="text-[14px] font-black text-slate-400">{log.duplicates}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Dupes</p>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
