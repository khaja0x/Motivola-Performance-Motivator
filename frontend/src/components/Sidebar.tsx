"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useParams } from 'next/navigation';
import Cookies from 'js-cookie';
import { 
  LayoutGrid, 
  Settings, 
  FileText, 
  LogOut,
  Target,
  Star,
  Moon,
  TrendingUp,
  Trophy,
  BarChart3,
  Activity,
  Coins,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface SidebarProps {
  isOpen?: boolean;
  setIsOpen?: (isOpen: boolean) => void;
}

export function Sidebar({ isOpen = false, setIsOpen }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params.tenantSlug as string || 'default';
  const [user, setUser] = useState<{ full_name: string; role: string; email: string } | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const token = Cookies.get(`token_${tenantSlug}`) || Cookies.get('token');
      if (!token) return;
      
      try {
        const res = await api.get('/api/auth/me');
        setUser(res.data);
      } catch (err) {
        console.error("Failed to fetch user in sidebar", err);
      }
    };
    fetchUser();
  }, [tenantSlug]);

  const menuItems = [
    { name: 'Dashboard', icon: LayoutGrid, href: `/${tenantSlug}/dashboard` },
    { name: 'Targets', icon: Target, href: `/${tenantSlug}/targets` },
    { name: 'Sales Data', icon: Coins, href: `/${tenantSlug}/sales-data` },
    { name: 'Challenges', icon: Star, href: `/${tenantSlug}/challenges` },
    { name: 'Incentive Summary', icon: Trophy, href: `/${tenantSlug}/incentives-summary` },
    { name: 'Configuration', icon: Settings, href: `/${tenantSlug}/settings` },
  ];


  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    Cookies.remove('token');
    if (tenantSlug) {
      Cookies.remove(`token_${tenantSlug}`);
    }
    router.push('/login');
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity" 
          onClick={() => setIsOpen?.(false)}
        />
      )}

      <div className={cn(
        "flex flex-col h-full w-64 bg-[#141517] text-white flex-shrink-0 border-r border-[#D0A479]/10 z-50 transition-transform duration-300 ease-in-out",
        "absolute md:relative inset-y-0 left-0",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Sidebar Branding */}
      <div className="flex items-center space-x-3 px-4 mb-10 mt-8">
        <div className="bg-[#D0A479] p-2 rounded-xl shadow-lg shadow-[#D0A479]/20">
          <Zap size={24} className="text-[#141517] fill-[#141517]" />
        </div>
        <h1 className="text-xl font-black text-white tracking-tight">Motivola</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 mt-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen?.(false)}
              className={cn(
                "flex items-center px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium",
                isActive 
                  ? "bg-[#D0A479] text-white shadow-md shadow-[#D0A479]/20" 
                  : "text-slate-500 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className={cn("mr-3 h-5 w-5", isActive ? "text-white" : "text-slate-500 group-hover:text-white")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Profile Section */}
      <div className="p-4 border-t border-white/5">
        {/* User Card */}
        <div className="flex items-center px-2 py-3 mb-4">
          <div className="h-10 w-10 min-w-[40px] rounded-full bg-[#D0A479] flex items-center justify-center text-sm font-bold text-[#141517] shadow-lg shadow-[#D0A479]/10 mr-3">
            {user ? getInitials(user.full_name || user.email) : '...'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate leading-tight">
              {user?.full_name || 'Admin User'}
            </p>
            <p className="text-[11px] font-medium text-slate-500 capitalize">
              {user?.role || 'User'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button className="flex items-center justify-center py-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all group">
            <Moon size={16} className="text-slate-400 group-hover:text-white mr-2" />
            <span className="text-[11px] font-bold text-slate-400 group-hover:text-white">Dark</span>
          </button>
          
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center py-2.5 bg-white/5 hover:bg-red-500/10 rounded-xl transition-all group"
          >
            <LogOut size={16} className="text-slate-400 group-hover:text-red-400 mr-2" />
            <span className="text-[11px] font-bold text-slate-400 group-hover:text-red-400">Logout</span>
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1b1e] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl transform transition-all">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-red-500/20 p-2 rounded-full">
                <LogOut className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-white">Confirm Logout</h3>
            </div>
            <p className="text-sm text-slate-400 mb-6">Are you sure you want to log out of your account?</p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmLogout}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-500/20 transition-all"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
