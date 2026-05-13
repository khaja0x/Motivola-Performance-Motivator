"use client";

import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, ArrowRight, Download, History, XCircle } from 'lucide-react';

import api from '@/lib/api';
import { cn } from '@/lib/utils';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [errorDetails, setErrorDetails] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadStatus('idle');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/api/sales/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadStatus('success');
      setMessage(response.data.message);
      setErrorDetails(response.data.errors || []);
    } catch (err: any) {
      setUploadStatus('error');
      setMessage(err.response?.data?.detail || 'Failed to upload file.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Upload Sales Data</h1>
          <p className="text-slate-500 text-sm">Import transactions to calculate commissions and updates</p>
        </div>
        <button className="flex items-center space-x-2 text-slate-600 hover:text-blue-600 transition-colors text-sm font-semibold">
          <History size={18} />
          <span>View Import History</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {/* Upload Dropzone */}
          <div className={cn(
            "bg-white border-2 border-dashed rounded-2xl p-12 text-center transition-all",
            uploadStatus === 'success' ? "border-emerald-200 bg-emerald-50/10" : 
            uploadStatus === 'error' ? "border-red-200 bg-red-50/10" :
            "border-slate-200 hover:border-blue-400"
          )}>
            {uploadStatus === 'success' ? (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Import Successful!</h3>
                <p className="text-slate-500">{message}</p>
                
                {errorDetails.length > 0 && (
                  <div className="mt-4 p-4 bg-amber-50 rounded-lg text-left border border-amber-100">
                    <p className="text-xs font-bold text-amber-700 uppercase mb-2">Some rows failed:</p>
                    <ul className="text-xs text-amber-600 list-disc pl-4 space-y-1">
                      {errorDetails.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  </div>
                )}

                <div className="pt-4 flex items-center justify-center gap-4">
                  <button 
                    onClick={() => { setUploadStatus('idle'); setFile(null); }}
                    className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-4 py-2"
                  >
                    Upload Another
                  </button>
                </div>
              </div>
            ) : uploadStatus === 'error' ? (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Import Failed</h3>
                <p className="text-red-500 text-sm">{message}</p>
                <button 
                  onClick={() => setUploadStatus('idle')}
                  className="mt-4 bg-slate-900 text-white px-6 py-2 rounded-lg text-sm font-semibold"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Upload size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {file ? file.name : "Select Sales File"}
                </h3>
                <p className="text-slate-500 max-w-xs mx-auto text-sm">
                  {file 
                    ? `Size: ${(file.size / 1024).toFixed(2)} KB. Ready to upload.` 
                    : "Drag and drop your CSV or Excel file here, or click to browse files."
                  }
                </p>
                <div className="pt-6">
                  <input 
                    type="file" 
                    className="hidden" 
                    id="file-upload" 
                    onChange={handleFileChange}
                    accept=".csv,.xlsx,.xls"
                  />
                  {!file ? (
                    <label 
                      htmlFor="file-upload"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center w-fit mx-auto space-x-2 cursor-pointer"
                    >
                      Browse Files
                      <ArrowRight size={18} />
                    </label>
                  ) : (
                    <button 
                      onClick={handleUpload}
                      disabled={isUploading}
                      className={cn(
                        "bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center mx-auto space-x-2",
                        isUploading && "opacity-70 cursor-not-allowed"
                      )}
                    >
                      {isUploading ? "Uploading..." : "Start Import"}
                      {!isUploading && <CheckCircle2 size={18} />}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Validation Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-start space-x-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <AlertCircle size={24} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">Before you upload</h4>
              <p className="text-slate-500 text-sm mt-1">
                Ensure your file includes `staff_id`, `amount`, `quantity`, and `sale_date`. IDs must match existing staff in the system.
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar / Template */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
            <h3 className="font-bold text-lg mb-4 flex items-center">
              <FileText size={20} className="mr-2 text-blue-400" />
              Template
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              Download our CSV template to ensure your data format matches our requirements.
            </p>
            <button className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl flex items-center justify-center space-x-3 transition-colors border border-slate-700">
              <Download size={18} />
              <span className="font-bold">Download Template</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h4 className="font-bold text-slate-900 mb-4">Supported Formats</h4>
            <div className="space-y-3">
              {[
                { label: 'CSV (Comma Separated)', icon: 'CSV' },
                { label: 'Excel Workbooks', icon: 'XLSX' }
              ].map((f, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                  <span className="text-sm font-medium text-slate-700">{f.label}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-500">
                    {f.icon}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
