"use client";

import React, { useState } from 'react';
import { Layers, Loader2, ArrowLeft, Eye, EyeOff, Building, User, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    company_name: '',
    industry: '',
    currency: 'USD',
    currency_symbol: '$',
    timezone: 'UTC',
    company_id: ''
  });

  const CURRENCIES = [
    { code: 'USD', symbol: '$', label: 'US Dollar ($)' },
    { code: 'EUR', symbol: '€', label: 'Euro (€)' },
    { code: 'GBP', symbol: '£', label: 'British Pound (£)' },
    { code: 'INR', symbol: '₹', label: 'Indian Rupee (₹)' },
    { code: 'AED', symbol: 'د.إ', label: 'UAE Dirham (د.إ)' },
    { code: 'AUD', symbol: 'A$', label: 'Australian Dollar (A$)' },
    { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar (C$)' },
    { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar (S$)' },
  ];

  const INDUSTRIES = [
    "Retail", "B2B Sales", "Real Estate", "Automotive", "Insurance", 
    "Financial Services", "Telecommunications", "Healthcare", 
    "Hospitality", "Fitness & Wellness", "Other"
  ];

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'currency_select') {
      const selected = CURRENCIES.find(c => c.code === value);
      if (selected) {
        setFormData(prev => ({ ...prev, currency: selected.code, currency_symbol: selected.symbol }));
      }
      return;
    }

    setFormData({ ...formData, [name]: value });
  };

  const submitStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setFormData(prev => ({
      ...prev,
      company_name: prev.company_name.trim(),
      industry: prev.industry.trim()
    }));
    setStep(2);
  };

  const submitStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Sanitize data
    const emailSanitized = formData.email.trim().toLowerCase();
    const fullNameSanitized = formData.full_name.trim();
    const passwordSanitized = formData.password.trim();

    if (passwordSanitized.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await api.post('/api/auth/register', {
        company_name: formData.company_name,
        industry: formData.industry,
        currency: formData.currency,
        currency_symbol: formData.currency_symbol,
        timezone: formData.timezone,
        email: emailSanitized,
        password: passwordSanitized,
        full_name: fullNameSanitized
      });
      router.push('/login?registered=true');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to complete registration.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-gradient-to-br from-[#fdfbf7] via-[#f3e5d0] to-[#dfbe89] font-sans">
      <div className="max-w-[440px] w-full z-10 transition-all duration-500">
        
        <div className="bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-8 sm:p-12">
          
          <div className="flex flex-col items-center text-center mb-10">
            <div className="flex items-center space-x-4 mb-6">
               <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300", step === 1 ? "bg-[#cca565] shadow-lg shadow-[#cca565]/20" : "bg-emerald-50")}>
                  {step === 1 ? <Building size={20} className="text-white" /> : <CheckCircle2 size={20} className="text-emerald-500" />}
               </div>
               <div className="w-8 h-px bg-gray-200" />
               <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300", step === 2 ? "bg-[#cca565] shadow-lg shadow-[#cca565]/20" : "bg-gray-50")}>
                  <User size={20} className={cn(step === 2 ? "text-white" : "text-gray-300")} />
               </div>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {step === 1 ? 'Register Your Company' : 'Setup Admin Account'}
            </h1>
            <p className="text-[14px] text-gray-500 mt-2">
              {step === 1 ? 'Tell us about your organization' : 'Create the first administrator'}
            </p>
          </div>

          <form onSubmit={step === 1 ? submitStep1 : submitStep2} className="space-y-5">
            {error && (
              <div className="p-4 text-[13px] font-medium text-red-600 bg-red-50 rounded-2xl border border-red-100 flex items-start space-x-2 animate-in fade-in slide-in-from-top-2">
                <div className="mt-0.5">⚠️</div>
                <span>{error}</span>
              </div>
            )}
            
            {step === 1 ? (
              <div className="space-y-5 animate-in slide-in-from-right-4 duration-500">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-gray-700 uppercase tracking-wider ml-1">Company Name</label>
                  <input required name="company_name" type="text" maxLength={50} value={formData.company_name} onChange={handleChange} placeholder="e.g. Vertex Retail" className="w-full px-4 py-3 rounded-2xl bg-gray-50/80 border border-gray-100/50 text-sm focus:ring-4 focus:ring-[#cca565]/10 focus:border-[#cca565] outline-none transition-all placeholder:text-gray-300" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-gray-700 uppercase tracking-wider ml-1">Industry</label>
                  <select required name="industry" value={formData.industry} onChange={handleChange} className="w-full px-4 py-3 rounded-2xl bg-gray-50/80 border border-gray-100/50 text-sm focus:ring-4 focus:ring-[#cca565]/10 focus:border-[#cca565] outline-none transition-all appearance-none cursor-pointer">
                    <option value="" disabled>Search or select industry</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-gray-700 uppercase tracking-wider ml-1">Currency</label>
                    <select name="currency_select" value={formData.currency} onChange={handleChange} className="w-full px-4 py-3 rounded-2xl bg-gray-50/80 border border-gray-100/50 text-sm focus:ring-4 focus:ring-[#cca565]/10 focus:border-[#cca565] outline-none transition-all">
                      {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-gray-700 uppercase tracking-wider ml-1">Timezone</label>
                    <select name="timezone" value={formData.timezone} onChange={handleChange} className="w-full px-4 py-3 rounded-2xl bg-gray-50/80 border border-gray-100/50 text-sm focus:ring-4 focus:ring-[#cca565]/10 focus:border-[#cca565] outline-none transition-all">
                      <option value="UTC">UTC</option>
                      <option value="Asia/Dubai">Dubai (GST)</option>
                      <option value="Asia/Kolkata">India (IST)</option>
                      <option value="Europe/London">London (GMT)</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5 animate-in slide-in-from-right-4 duration-500">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-gray-700 uppercase tracking-wider ml-1">Full Name</label>
                  <input required name="full_name" type="text" maxLength={100} value={formData.full_name} onChange={handleChange} placeholder="John Doe" className="w-full px-4 py-3 rounded-2xl bg-gray-50/80 border border-gray-100/50 text-sm focus:ring-4 focus:ring-[#cca565]/10 focus:border-[#cca565] outline-none transition-all placeholder:text-gray-300" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-gray-700 uppercase tracking-wider ml-1">Email Address</label>
                  <input required name="email" type="email" maxLength={100} value={formData.email} onChange={handleChange} placeholder="admin@vertex.com" className="w-full px-4 py-3 rounded-2xl bg-gray-50/80 border border-gray-100/50 text-sm focus:ring-4 focus:ring-[#cca565]/10 focus:border-[#cca565] outline-none transition-all placeholder:text-gray-300" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-gray-700 uppercase tracking-wider ml-1">Password</label>
                  <div className="relative">
                    <input required name="password" type={showPassword ? "text" : "password"} minLength={8} maxLength={50} value={formData.password} onChange={handleChange} placeholder="••••••••" className="w-full px-4 py-3 rounded-2xl bg-gray-50/80 border border-gray-100/50 text-sm focus:ring-4 focus:ring-[#cca565]/10 focus:border-[#cca565] outline-none transition-all pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 space-y-4">
              <button 
                type="submit" 
                disabled={isLoading} 
                className="w-full bg-[#cca565] hover:bg-[#bd9756] text-white py-4 rounded-2xl font-bold transition-all shadow-xl shadow-[#cca565]/20 active:scale-95 disabled:opacity-50 flex items-center justify-center"
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" size={20} /> : (step === 1 ? 'Configure Company Profile' : 'Finalize Registration')}
              </button>
              
              {step === 2 && (
                <button type="button" onClick={() => setStep(1)} className="w-full flex items-center justify-center text-gray-400 font-semibold text-sm hover:text-gray-600 transition-colors">
                  <ArrowLeft size={16} className="mr-2" /> Back to Company Info
                </button>
              )}
            </div>

            <div className="text-center pt-2">
              <p className="text-sm text-gray-400">Already a member? <Link href="/login" className="text-[#cca565] font-bold hover:underline">Sign In</Link></p>
            </div>
          </form>
        </div>
      </div>
      
      <div className="absolute bottom-8 left-0 right-0 text-center text-xs text-gray-400/60 font-medium">
        SECURE ENTERPRISE ENCRYPTION ENABLED
      </div>
    </div>
  );
}