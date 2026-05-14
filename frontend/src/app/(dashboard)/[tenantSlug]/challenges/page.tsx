"use client";

import React, { useState } from 'react';
import { 
  Trophy, 
  Plus, 
  Search, 
  Calendar,
  ChevronRight,
  Zap,
  Target,
  ArrowUpRight,
  Users,
  Clock,
  Sparkles,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useParams } from 'next/navigation';

interface Challenge {
  id: string;
  title: string;
  description: string;
  reward: string;
  type: 'Sales' | 'Units' | 'Team';
  status: 'Active' | 'Upcoming' | 'Completed';
  startDate: string;
  endDate: string;
  participants: number;
  progress?: number;
}

const mockChallenges: Challenge[] = [
  {
    id: '1',
    title: 'May Sales Sprint',
    description: 'Reach $5,000 in individual sales this month to unlock a bonus.',
    reward: '$250 Bonus',
    type: 'Sales',
    status: 'Active',
    startDate: '2026-05-01',
    endDate: '2026-05-31',
    participants: 12,
    progress: 65
  },
  {
    id: '2',
    title: 'Unit King Challenge',
    description: 'Sell 50+ units of high-margin products.',
    reward: 'Tech Kit',
    type: 'Units',
    status: 'Active',
    startDate: '2026-05-10',
    endDate: '2026-05-20',
    participants: 8,
    progress: 40
  },
  {
    id: '3',
    title: 'Weekend Warriors',
    description: 'Top performing store this weekend gets a team lunch.',
    reward: 'Team Lunch',
    type: 'Team',
    status: 'Upcoming',
    startDate: '2026-05-24',
    endDate: '2026-05-26',
    participants: 4
  }
];

export default function ChallengesPage() {
  const params = useParams();
  const [activeFilter, setActiveFilter] = useState<'All' | 'Active' | 'Upcoming' | 'Completed'>('All');

  const filteredChallenges = mockChallenges.filter(c => 
    activeFilter === 'All' ? true : c.status === activeFilter
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-2">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 mb-1">
            <div className="bg-amber-100 p-1 rounded-md">
              <Sparkles size={14} className="text-amber-600" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Gamification</span>
          </div>
          <h1 className="text-[36px] font-black text-[#141517] tracking-tight leading-none">Challenges</h1>
          <p className="text-slate-500 font-medium text-sm">Motivate your team with exciting sales goals and rewards.</p>
        </div>
        
        <button 
          className="flex items-center space-x-3 px-6 py-4 bg-[#141517] text-white rounded-2xl text-sm font-black hover:bg-black transition-all shadow-xl shadow-black/10 active:scale-95"
        >
          <Plus size={18} />
          <span>New Challenge</span>
        </button>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Active Now', value: '8', icon: Zap, color: 'bg-blue-50 text-blue-600' },
          { label: 'Total Rewards', value: '$2,450', icon: Trophy, color: 'bg-amber-50 text-amber-600' },
          { label: 'Participation', value: '92%', icon: Users, color: 'bg-emerald-50 text-emerald-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center space-x-5 group hover:border-[#D0A479]/30 transition-all">
            <div className={cn("p-4 rounded-2xl transition-transform group-hover:scale-110", stat.color)}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-2xl font-black text-slate-800">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Filter & View Controls */}
      <div className="flex items-center justify-between">
        <div className="flex bg-[#F5F1EB] p-1.5 rounded-2xl">
          {['All', 'Active', 'Upcoming', 'Completed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab as any)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[13px] font-black transition-all",
                activeFilter === tab 
                  ? "bg-white text-[#141517] shadow-sm" 
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#D0A479] transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search challenges..." 
              className="pl-10 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-[13px] font-bold text-slate-600 outline-none focus:ring-4 focus:ring-[#D0A479]/5 focus:border-[#D0A479] transition-all w-64 shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Challenges Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {filteredChallenges.map((challenge) => (
          <div key={challenge.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] overflow-hidden group hover:border-[#D0A479]/50 transition-all flex flex-col">
            <div className="p-8 flex-1">
              <div className="flex justify-between items-start mb-6">
                <div className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                  challenge.status === 'Active' ? "bg-emerald-50 text-emerald-600" : 
                  challenge.status === 'Upcoming' ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"
                )}>
                  {challenge.status}
                </div>
                <div className="bg-[#F5F1EB] p-2.5 rounded-xl group-hover:bg-[#D0A479] group-hover:text-white transition-all">
                  <ArrowUpRight size={20} />
                </div>
              </div>

              <h3 className="text-[22px] font-black text-slate-800 mb-2 leading-tight">{challenge.title}</h3>
              <p className="text-slate-500 text-[13.5px] font-medium leading-relaxed mb-8">
                {challenge.description}
              </p>

              {/* Progress Bar (if active) */}
              {challenge.status === 'Active' && challenge.progress && (
                <div className="mb-8 space-y-3">
                  <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-slate-400">
                    <span>Overall Progress</span>
                    <span className="text-slate-800">{challenge.progress}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                    <div 
                      className="h-full bg-gradient-to-r from-[#D0A479] to-[#E3C29E] rounded-full transition-all duration-1000"
                      style={{ width: `${challenge.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Details Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 text-slate-500">
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <Calendar size={14} />
                  </div>
                  <span className="text-[12px] font-bold">{new Date(challenge.endDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-3 text-slate-500">
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <Users size={14} />
                  </div>
                  <span className="text-[12px] font-bold">{challenge.participants} Joined</span>
                </div>
              </div>
            </div>

            {/* Reward Footer */}
            <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Trophy size={16} className="text-amber-500" />
                <span className="text-[13px] font-black text-slate-700">{challenge.reward}</span>
              </div>
              <button className="text-[12px] font-black text-[#D0A479] hover:text-[#B68A5F] flex items-center group">
                View Details
                <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        ))}
        
        {/* Add Challenge Placeholder Card */}
        <button className="bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 p-8 flex flex-col items-center justify-center space-y-4 hover:border-[#D0A479]/50 hover:bg-[#D0A479]/5 transition-all min-h-[300px] group">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-[#D0A479] shadow-sm transition-all">
            <Plus size={32} />
          </div>
          <div className="text-center">
            <p className="font-black text-slate-800 text-lg">Create New Challenge</p>
            <p className="text-slate-400 text-sm font-medium mt-1">Start a new competition for your team</p>
          </div>
        </button>
      </div>
    </div>
  );
}
