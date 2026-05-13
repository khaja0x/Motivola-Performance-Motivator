"use client";

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { Loader2, Menu } from 'lucide-react';
import api from '@/lib/api';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const tenantSlug = params.tenantSlug as string;

  useEffect(() => {
    const checkAuthAndTenant = async () => {
      try {
        const response = await api.get('/api/auth/me');
        const user = response.data;
        
        // Safety Guard: Compare the user's home company with the URL slug
        if (user.company.company_slug !== tenantSlug) {
          console.warn(`Unauthorized tenant access. Redirecting ${user.email} from ${tenantSlug} to ${user.company.company_slug}`);
          router.replace(`/${user.company.company_slug}/dashboard`);
          return;
        }
        
        setIsAuthorized(true);
      } catch (error) {
        console.error("Auth check failed:", error);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    if (tenantSlug) {
      checkAuthAndTenant();
    }
  }, [tenantSlug, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fdfbf7]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="animate-spin text-[#cca565]" size={40} />
          <p className="text-sm font-medium text-gray-500">Verifying secure access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) return null;

  return (
    <div className="flex h-screen bg-[#D0A479] p-0 md:p-4 lg:p-6 overflow-hidden">
      <div className="flex-1 flex overflow-hidden bg-white md:rounded-[2rem] shadow-2xl relative">
        <Sidebar isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {/* Mobile Header */}
          <div className="md:hidden flex flex-shrink-0 items-center justify-between p-4 border-b border-gray-100 bg-white z-10">
            <div className="flex items-center space-x-2">
              <div className="bg-[#D0A479] p-1.5 rounded-lg">
                <div className="w-5 h-5 bg-[#141517] rounded-sm" /> {/* Placeholder for logo */}
              </div>
              <h1 className="text-xl font-black tracking-tight text-[#141517]">Motivola</h1>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Menu size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 text-slate-900">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
