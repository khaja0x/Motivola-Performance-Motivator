"use client";

import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Loader2, Users2, Info } from 'lucide-react';
import api from '@/lib/api';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function TeamsPage() {
  const params = useParams();
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await api.get('/api/teams/');
        setTeams(response.data);
      } catch (err) {
        console.error('Failed to fetch teams:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTeams();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Team Management</h1>
          <p className="text-slate-500 mt-1">Organize your staff into high-performance teams</p>
        </div>
        <button className="bg-[#C69A70] hover:bg-[#b88c62] text-white px-5 py-2.5 rounded-xl flex items-center space-x-2 transition-all text-sm font-semibold shadow-lg shadow-[#C69A70]/20">
          <Plus size={18} />
          <span>Create Team</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center p-12">
            <Loader2 className="animate-spin text-[#C69A70]" size={32} />
          </div>
        ) : teams.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users2 size={32} className="opacity-20" />
            </div>
            <p className="font-medium text-slate-500 text-lg">No teams created yet</p>
            <p className="text-sm">Click the button above to start grouping your staff.</p>
          </div>
        ) : (
          teams.map((team) => (
            <div key={team.team_id} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-slate-50 p-3 rounded-xl group-hover:bg-[#C69A70]/10 transition-colors">
                  <Users size={24} className="text-[#C69A70]" />
                </div>
                <button className="text-slate-400 hover:text-slate-600">
                  <Info size={20} />
                </button>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">{team.team_name}</h3>
              <p className="text-slate-500 text-sm mb-4 line-clamp-2">{team.description || 'No description provided.'}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="flex -space-x-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                      JS
                    </div>
                  ))}
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                    +5
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">8 Members</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
