"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-dismiss
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, [removeToast]);

  const success = useCallback((msg: string) => addToast(msg, 'success'), [addToast]);
  const error = useCallback((msg: string) => addToast(msg, 'error'), [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div 
            key={t.id}
            className={cn(
              "pointer-events-auto min-w-[320px] max-w-md p-4 rounded-2xl shadow-2xl border flex items-center gap-4 animate-in slide-in-from-right-8 fade-in duration-300",
              t.type === 'success' && "bg-white border-emerald-100 text-slate-800 shadow-emerald-500/10",
              t.type === 'error' && "bg-white border-red-100 text-slate-800 shadow-red-500/10",
              t.type === 'info' && "bg-white border-slate-200 text-slate-800 shadow-slate-500/10"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
              t.type === 'success' && "bg-emerald-50 text-emerald-600",
              t.type === 'error' && "bg-red-50 text-red-600",
              t.type === 'info' && "bg-slate-50 text-slate-600"
            )}>
              {t.type === 'success' && <CheckCircle2 size={20} />}
              {t.type === 'error' && <AlertCircle size={20} />}
              {t.type === 'info' && <Info size={20} />}
            </div>
            
            <div className="flex-1">
              <p className="text-sm font-bold leading-tight tracking-tight">
                {t.type === 'success' ? 'Success' : t.type === 'error' ? 'Error' : 'Notification'}
              </p>
              <p className="text-[13px] text-slate-500 font-medium mt-0.5">{t.message}</p>
            </div>
            
            <button 
              onClick={() => removeToast(t.id)}
              className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-300 hover:text-slate-500 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
