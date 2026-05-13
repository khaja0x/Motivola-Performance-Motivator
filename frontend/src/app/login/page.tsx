


"use client";

import React, { useState, Suspense } from 'react';
import { Layers, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import Cookies from 'js-cookie';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Sanitize credentials
    const emailSanitized = email.trim().toLowerCase();
    const passwordSanitized = password.trim();

    try {
      const response = await api.post('/api/auth/login', {
        email: emailSanitized,
        password: passwordSanitized
      });
      
      const { access_token, company_slug } = response.data;
      
      // Store token globally (temporary) and scope it by company_slug to support multiple tabs
      // Use the scoped token primarily for all dashboard access.
      Cookies.set('token', access_token, { expires: 7 }); 
      Cookies.set(`token_${company_slug}`, access_token, { expires: 7 });
      
      router.push(`/${company_slug}/dashboard`);
    } catch (err: any) {
      console.error('Login error:', err);
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Connection failed. Please ensure the backend is running.');
      } else {
        setError('Invalid email or password');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-gradient-to-br from-[#fdfbf7] via-[#f3e5d0] to-[#dfbe89] font-sans">
      <div className="max-w-[420px] w-full z-10">
        
        <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 sm:p-10">
          
          {/* Header matching the Register page design */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="bg-[#cca565] p-2.5 rounded-[14px] mb-5">
              <Layers size={22} className="text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Welcome Back</h1>
            <p className="text-[13px] text-gray-500 mt-1.5">Sign in to your Motivola workspace</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {registered && !error && (
              <div className="p-3 text-[13px] font-medium text-emerald-600 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center">
                <CheckCircle2 size={16} className="mr-2 flex-shrink-0" />
                Account created! Please sign in.
              </div>
            )}

            {error && (
              <div className="p-3 text-[13px] font-medium text-red-600 bg-red-50 rounded-xl border border-red-100">
                {error}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-700">Email Address</label>
              <input 
                required
                type="email" 
                maxLength={100}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. alex@company.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50/50 border border-gray-100 text-[13px] text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#cca565]/30 focus:border-[#cca565] outline-none transition-all"
              />
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-medium text-gray-700">Password</label>
                <a href="#" className="text-[13px] font-semibold text-[#cca565] hover:text-[#bd9756] transition-colors">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input 
                  required
                  type={showPassword ? "text" : "password"} 
                  maxLength={50}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50/50 border border-gray-100 text-[13px] text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#cca565]/30 focus:border-[#cca565] outline-none transition-all pr-10"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#cca565] hover:bg-[#bd9756] text-white text-[13px] font-semibold py-3 rounded-xl flex items-center justify-center transition-all transform active:scale-[0.98] disabled:opacity-70 mt-6"
            >
              {isLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : 'Sign In'}
            </button>

            <div className="text-center mt-5">
              <span className="text-[13px] text-gray-500">Don't have an account? </span>
              <Link href="/register" className="text-[13px] font-semibold text-[#cca565] hover:text-[#bd9756] transition-colors">
                Create one
              </Link>
            </div>
          </form>
        </div>
      </div>

      {/* Footer matching the Register page */}
      <div className="absolute bottom-6 w-full text-center text-[11px] text-gray-500 font-medium">
        © {new Date().getFullYear()} Motivola. Built with ❤️ for peak performance.
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      // Updated the suspense fallback background to match the new theme seamlessly
      <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7]">
        <Loader2 className="animate-spin text-[#cca565]" size={32} />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}