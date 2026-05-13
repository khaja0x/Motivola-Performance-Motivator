"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Loader2, CheckCircle2, X, Pencil, Trash2, FileSpreadsheet } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface StoreOut {
  store_id: string; store_name: string; store_code?: string;
  location?: string; staff_count: number; manager_name: string;
}

interface Props {
  showSuccess: (msg: string) => void;
  showError: (msg: any) => void;
  initialEditStoreId?: string | null;
  initialShowAdd?: boolean;
}

export default function StoresTeamsTab({ showSuccess, showError, initialEditStoreId, initialShowAdd }: Props) {
  const [stores, setStores] = useState<StoreOut[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [showAddStore, setShowAddStore] = useState(initialShowAdd || false);
  const [newStore, setNewStore] = useState({ store_name: '', store_code: '', location: '' });
  const [isAddingStore, setIsAddingStore] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(initialEditStoreId || null);
  const [editStoreData, setEditStoreData] = useState({ store_name: '', store_code: '', location: '' });
  const [isUpdatingStore, setIsUpdatingStore] = useState(false);
  const [showStoreImportModal, setShowStoreImportModal] = useState(false);
  const storeImportFileRef = useRef<HTMLInputElement>(null);
  const [isStoreImporting, setIsStoreImporting] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchStores = async () => {
    setIsLoadingStores(true);
    try {
      const res = await api.get('/api/stores');
      setStores(res.data);
    } catch (err) {
      console.error("Failed to fetch stores", err);
    } finally {
      setIsLoadingStores(false);
    }
  };

  useEffect(() => { fetchStores(); }, []);

  // Sync edit data if initialEditStoreId is provided
  useEffect(() => {
    if (editingStoreId && stores.length > 0) {
      const store = stores.find(s => s.store_id === editingStoreId);
      if (store) {
        setEditStoreData({
          store_name: store.store_name || '',
          store_code: store.store_code || '',
          location: store.location || ''
        });
      }
    }
  }, [editingStoreId, stores]);

  const handleAddStore = async () => {
    if (!newStore.store_name) return;
    setIsAddingStore(true);
    try {
      await api.post('/api/stores', {
        store_name: newStore.store_name?.trim(),
        store_code: newStore.store_code?.trim(),
        location: newStore.location?.trim()
      });
      setNewStore({ store_name: '', store_code: '', location: '' });
      setShowAddStore(false);
      fetchStores();
      showSuccess("Store added successfully!");
    } catch (err: any) {
      const msg = typeof err.response?.data?.detail === 'string' 
        ? err.response.data.detail 
        : err.response?.data?.detail?.[0]?.msg || "Failed to add store";
      showError(msg);
    } finally {
      setIsAddingStore(false);
    }
  };

  const deleteStore = async (id: string) => {
    setIsDeleting(true);
    try {
      await api.delete(`/api/stores/${id}`);
      fetchStores();
      setStoreToDelete(null);
      showSuccess("Store deleted successfully!");
    } catch (err: any) {
      showError(err.response?.data?.detail || "Failed to delete store. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateStore = async (id: string) => {
    setIsUpdatingStore(true);
    try {
      await api.put(`/api/stores/${id}`, {
        store_name: editStoreData.store_name?.trim(),
        store_code: editStoreData.store_code?.trim(),
        location: editStoreData.location?.trim()
      });
      setEditingStoreId(null);
      fetchStores();
      showSuccess("Store updated successfully!");
    } catch (err: any) {
      const msg = typeof err.response?.data?.detail === 'string' 
        ? err.response.data.detail 
        : err.response?.data?.detail?.[0]?.msg || "Failed to update store";
      showError(msg);
    } finally {
      setIsUpdatingStore(false);
    }
  };

  return (
    <div className="p-10 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 pb-1">Stores / Teams</h2>
        <div className="flex items-center space-x-3">
          <button onClick={() => setShowStoreImportModal(true)}
            className="px-5 py-2.5 text-[#141517] text-sm font-bold rounded-xl hover:bg-[#D0A479]/10 transition-all shadow-lg shadow-[#D0A479]/10"
          >Import</button>
          {!showAddStore && (
            <button onClick={() => setShowAddStore(true)}
              className="px-5 py-2.5 bg-[#D0A479] text-[#141517] text-xs font-bold rounded-xl flex items-center hover:bg-[#bd9756] transition-all shadow-lg shadow-[#D0A479]/10"
            >+ New</button>
          )}
        </div>
      </div>

      {/* Inline Add Form */}
      {showAddStore && (
        <div className="p-6 bg-[#FCF9F4] rounded-[1.5rem] border border-[#D0A479]/20 space-y-4 animate-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest font-black text-slate-400">Store / Team</label>
              <input type="text" placeholder="e.g. Chennai Branch" value={newStore.store_name || ""}
                onChange={(e) => setNewStore({ ...newStore, store_name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-4 focus:ring-[#D0A479]/20 outline-none text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest font-black text-slate-400">Code</label>
              <input type="text" placeholder="e.g. S004" value={newStore.store_code || ""}
                onChange={(e) => setNewStore({ ...newStore, store_code: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-4 focus:ring-[#D0A479]/20 outline-none text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest font-black text-slate-400">City</label>
              <div className="flex items-center space-x-2">
                <input type="text" placeholder="e.g. Chennai" value={newStore.location || ""}
                  onChange={(e) => setNewStore({ ...newStore, location: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-4 focus:ring-[#D0A479]/20 outline-none text-sm"
                />
                <button onClick={handleAddStore} disabled={isAddingStore}
                  className="p-2.5 bg-[#D0A479] text-white rounded-xl hover:bg-[#bd9756] transition-all disabled:opacity-50"
                >{isAddingStore ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle2 size={18} />}</button>
                <button onClick={() => setShowAddStore(false)}
                  className="p-2.5 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-red-500 hover:border-red-500/30 transition-all"
                ><X size={18} /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stores Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-y border-slate-100">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 whitespace-nowrap">Store / Team</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 whitespace-nowrap">Code</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 whitespace-nowrap">Location / City</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 whitespace-nowrap">
                Staff Count <span className="ml-1 px-1.5 py-0.5 rounded bg-[#D0A479]/20 text-[#D0A479] text-[8px] tracking-normal">AUTO</span>
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 whitespace-nowrap">
                Store Manager <span className="ml-1 px-1.5 py-0.5 rounded bg-[#D0A479]/20 text-[#D0A479] text-[8px] tracking-normal">AUTO</span>
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoadingStores ? (
              [...Array(3)].map((_, i) => (
                <tr key={i} className="animate-pulse border-b border-slate-50">
                  {[24, 16, 32, 20, 24, 8].map((w, j) => (
                    <td key={j} className="px-6 py-5"><div className={`h-4 bg-slate-100 rounded w-${w}`}></div></td>
                  ))}
                </tr>
              ))
            ) : stores.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic text-sm">No stores configured yet.</td></tr>
            ) : (
              stores.map((store) => {
                const isEditing = editingStoreId === store.store_id;
                return (
                  <tr key={store.store_id} className="hover:bg-slate-50/50 transition-colors group border-b border-slate-50 last:border-0">
                    <td className="px-6 py-5">
                      {isEditing
                        ? <input className="w-full px-3 py-2 text-[13px] font-black border border-slate-200 rounded-lg outline-none focus:border-[#D0A479]" value={editStoreData.store_name || ""} onChange={(e) => setEditStoreData({ ...editStoreData, store_name: e.target.value })} />
                        : <span className="text-[13px] font-black text-slate-900 leading-none">{store.store_name}</span>
                      }
                    </td>
                    <td className="px-6 py-5">
                      {isEditing
                        ? <input className="w-full px-3 py-2 text-[11px] font-black border border-slate-200 rounded-lg outline-none focus:border-[#D0A479]" value={editStoreData.store_code || ""} onChange={(e) => setEditStoreData({ ...editStoreData, store_code: e.target.value })} />
                        : <span className="text-[11px] font-black text-slate-400 font-mono italic">{store.store_code || '---'}</span>
                      }
                    </td>
                    <td className="px-6 py-5">
                      {isEditing
                        ? <input className="w-full px-3 py-2 text-[13px] font-bold border border-slate-200 rounded-lg outline-none focus:border-[#D0A479]" value={editStoreData.location || ""} onChange={(e) => setEditStoreData({ ...editStoreData, location: e.target.value })} />
                        : <span className="text-[13px] font-bold text-slate-500">{store.location || '---'}</span>
                      }
                    </td>
                    <td className="px-6 py-5">
                      <span className={cn("px-2.5 py-1 rounded-lg text-[11px] font-black whitespace-nowrap",
                        store.staff_count > 0 ? "bg-[#D0A479]/20 text-[#D0A479]" : "bg-slate-100 text-slate-400"
                      )}>{store.staff_count} staff</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-[13px] font-black text-slate-800 whitespace-nowrap">{store.manager_name || '---'}</span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {isEditing ? (
                          <>
                            <button onClick={() => handleUpdateStore(store.store_id)} disabled={isUpdatingStore}
                              className="p-2 bg-[#D0A479] text-white rounded-xl hover:bg-[#bd9756] transition-all"
                            >{isUpdatingStore ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 size={16} />}</button>
                            <button onClick={() => setEditingStoreId(null)}
                              className="p-2 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-red-500 hover:border-red-500/30 transition-all shadow-sm"
                            ><X size={16} /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => { setEditingStoreId(store.store_id); setEditStoreData({ store_name: store.store_name, store_code: store.store_code || '', location: store.location || '' }); }}
                              className="p-2 bg-slate-100/50 hover:bg-slate-200/50 rounded-xl text-slate-500 transition-all opacity-80 group-hover:opacity-100"
                            ><Pencil size={15} /></button>
                            <button onClick={() => setStoreToDelete(store.store_id)}
                              className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                            ><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Import Modal */}
      {showStoreImportModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">Import Stores</h3>
              <button onClick={() => setShowStoreImportModal(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"><X size={20} /></button>
            </div>
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center text-center space-y-4">
              <FileSpreadsheet size={40} className="text-slate-300" />
              <p className="text-sm font-medium text-slate-500">Upload a CSV or Excel file with store data</p>
              <input type="file" ref={storeImportFileRef} accept=".csv,.xlsx,.xls" className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  setIsStoreImporting(true);
                  const fd = new FormData(); fd.append('file', file);
                  try {
                    const res = await api.post('/api/stores/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                    showSuccess(`Imported ${res.data.success || 0} stores!`);
                    fetchStores(); setShowStoreImportModal(false);
                  } catch (err: any) { showError(err.response?.data?.detail || "Import failed"); }
                  finally { setIsStoreImporting(false); if (storeImportFileRef.current) storeImportFileRef.current.value = ''; }
                }}
              />
              <button onClick={() => storeImportFileRef.current?.click()} disabled={isStoreImporting}
                className="px-6 py-2.5 bg-[#D0A479] text-[#141517] rounded-xl text-sm font-bold hover:bg-[#bd9756] transition-all disabled:opacity-50"
              >{isStoreImporting ? 'Processing...' : 'Choose File'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {storeToDelete && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="text-red-500" size={28} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Delete Store?</h3>
              <p className="text-slate-500 mt-2 text-sm">This will permanently remove the store and cannot be undone.</p>
            </div>
            <div className="flex items-center justify-center space-x-3 pt-2">
              <button onClick={() => setStoreToDelete(null)} className="px-6 py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all">Cancel</button>
              <button onClick={() => deleteStore(storeToDelete)} disabled={isDeleting}
                className="px-6 py-3 bg-red-500 text-white rounded-2xl font-bold text-sm hover:bg-red-600 transition-all disabled:opacity-50 flex items-center"
              >{isDeleting ? <><Loader2 size={16} className="animate-spin mr-2" />Deleting...</> : 'Yes, Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
