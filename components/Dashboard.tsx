
import React, { useEffect, useState } from 'react';
import { DashboardStats, User } from '../types';
import { api } from '../services/mockApi';
import { UserCheck, Briefcase, Umbrella, UserX, ShieldCheck, MoreHorizontal, FileText, RefreshCw, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export const Dashboard: React.FC<{ user: User }> = ({ user }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lists, setLists] = useState<any>({});
  const [activeTab, setActiveTab] = useState<'working' | 'out' | 'leave' | 'pending'>('working');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const refreshData = async (background = false) => {
      if (!background) setIsSyncing(true);
      
      // 1. Sync data terkini dari Cloud
      await api.syncFromCloud();
      
      // 2. Dapatkan statistik baru
      const data = await api.getDashboardStats();
      setStats(data.stats);
      setLists(data.lists);
      
      if (!background) setIsSyncing(false);
  };

  useEffect(() => {
    // Initial Load
    refreshData();

    // Setup Live Polling (Every 10 seconds)
    const interval = setInterval(() => {
        refreshData(true);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const TabButton = ({ id, label }: { id: typeof activeTab, label: string }) => (
    <button
        onClick={() => setActiveTab(id)}
        className={`flex-1 py-3 rounded-full text-[11px] font-bold transition-all ${
            activeTab === id 
            ? 'bg-[#0f172a] text-white shadow-lg transform scale-105' 
            : 'text-gray-400 hover:text-gray-600 bg-transparent'
        }`}
    >
        {label}
    </button>
  );

  const isAdmin = user.isAdmin === 'YES' || user.email.includes('admin');

  // Calculate total outstation count
  const outTotal = stats ? (stats.outOfficial + stats.outUnofficial) : 0;

  // Chart Data Configuration
  const chartData = stats ? [
    { name: 'HADIR', value: stats.working, color: '#6366f1' },      // Indigo
    { name: 'CUTI', value: stats.leave, color: '#ec4899' },         // Pink
    { name: 'LUAR', value: outTotal, color: '#3b82f6' },           // Blue
    { name: 'BELUM', value: stats.pending, color: '#cbd5e1' }       // Slate 300
  ] : [];

  const totalUsers = stats ? stats.working + stats.leave + outTotal + stats.pending : 0;

  return (
    <div className="min-h-screen px-5 py-8 pb-32 bg-[#f8fafc]">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
         <div>
            <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Hai, {user.name.split(' ')[0]} 👋</h1>
                <div className="flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                    <div className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">LIVE</span>
                </div>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">Data dikemaskini secara masa nyata.</p>
         </div>
         <div className="flex items-center gap-3">
             {isAdmin && (
                <>
                 {/* Butang Laporan (Sheet) - Updated to match Admin Panel Button Style */}
                 <button 
                    onClick={() => navigate('/sheet')}
                    className="w-11 h-11 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-600 shadow-sm hover:bg-slate-50 hover:text-indigo-600 hover:shadow-md hover:-translate-y-1 transition-all active:scale-95"
                    title="Laporan Penuh"
                 >
                     <FileText size={20} strokeWidth={2.5} />
                 </button>
                 
                 {/* Butang Admin Panel */}
                 <button 
                    onClick={() => navigate('/admin')}
                    className="w-11 h-11 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-600 shadow-sm hover:bg-slate-50 hover:text-indigo-600 hover:shadow-md hover:-translate-y-1 transition-all active:scale-95"
                    title="Panel Pentadbir"
                 >
                     <ShieldCheck size={20} strokeWidth={2.5} />
                 </button>
                </>
             )}
             <div className="p-0.5 bg-white rounded-full shadow-sm border border-slate-100">
                <img src={user.photo} className="w-10 h-10 rounded-full object-cover" alt="Profile" />
             </div>
         </div>
      </div>

      {/* Modern Summary Cards Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {/* HADIR Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] rounded-[32px] p-5 h-44 shadow-xl shadow-indigo-200/50 group transition-all hover:shadow-2xl hover:-translate-y-1">
            {/* Abstract Decorative Circles */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute top-10 -left-8 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
            
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-all duration-700 transform group-hover:scale-110 group-hover:rotate-6">
                <UserCheck size={100} className="text-white" />
            </div>

            <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="bg-white/20 backdrop-blur-md w-fit px-3 py-1.5 rounded-full border border-white/10 shadow-sm">
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                         <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div> Hadir
                    </span>
                </div>
                <div>
                    <span className="text-5xl font-bold text-white tracking-tighter drop-shadow-sm">{stats?.working || 0}</span>
                    <p className="text-indigo-100 text-[10px] font-medium mt-1 opacity-90">Staf Bertugas</p>
                </div>
            </div>
        </div>

        {/* URUSAN LUAR Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0ea5e9] to-[#2563eb] rounded-[32px] p-5 h-44 shadow-xl shadow-blue-200/50 group transition-all hover:shadow-2xl hover:-translate-y-1">
            {/* Abstract Decorative Circles */}
            <div className="absolute -top-10 -right-8 w-28 h-28 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-4 -left-4 w-16 h-16 bg-white/10 rounded-full blur-lg"></div>

             <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-all duration-700 transform group-hover:scale-110 group-hover:rotate-6">
                <Briefcase size={100} className="text-white" />
            </div>

            <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="bg-white/20 backdrop-blur-md w-fit px-3 py-1.5 rounded-full border border-white/10 shadow-sm">
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Urusan Luar</span>
                </div>
                <div>
                    <span className="text-5xl font-bold text-white tracking-tighter drop-shadow-sm">{outTotal}</span>
                    <p className="text-blue-100 text-[10px] font-medium mt-1 opacity-90">Tugas Rasmi & Tidak Rasmi</p>
                </div>
            </div>
        </div>

        {/* CUTI Card (With Umbrella) */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#f43f5e] to-[#db2777] rounded-[32px] p-5 h-44 shadow-xl shadow-pink-200/50 group transition-all hover:shadow-2xl hover:-translate-y-1">
            {/* Abstract Decorative Circles */}
            <div className="absolute -top-12 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute top-1/2 left-4 w-12 h-12 bg-white/10 rounded-full blur-lg"></div>

            <div className="absolute -right-2 -bottom-2 opacity-10 group-hover:opacity-20 transition-all duration-700 transform group-hover:scale-110 group-hover:-rotate-12">
                <Umbrella size={110} className="text-white" />
            </div>

            <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="bg-white/20 backdrop-blur-md w-fit px-3 py-1.5 rounded-full border border-white/10 shadow-sm">
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Cuti</span>
                </div>
                <div>
                    <span className="text-5xl font-bold text-white tracking-tighter drop-shadow-sm">{stats?.leave || 0}</span>
                    <p className="text-pink-100 text-[10px] font-medium mt-1 opacity-90">Rekod Cuti Sah</p>
                </div>
            </div>
        </div>

        {/* BELUM HADIR Card */}
        <div className="relative overflow-hidden bg-white border border-slate-100 rounded-[32px] p-5 h-44 shadow-lg shadow-slate-200/50 group transition-all hover:shadow-xl hover:-translate-y-1">
             {/* Abstract Decorative Circles (Subtle Gray) */}
             <div className="absolute -top-8 -right-8 w-32 h-32 bg-slate-50 rounded-full blur-2xl"></div>
             
             <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:opacity-[0.1] transition-all duration-700 transform group-hover:scale-110 group-hover:rotate-6">
                <UserX size={100} className="text-slate-900" />
            </div>

            <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="bg-slate-100 w-fit px-3 py-1.5 rounded-full border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Belum Hadir</span>
                </div>
                <div>
                    <span className="text-5xl font-bold text-slate-700 tracking-tighter">{stats?.pending || 0}</span>
                    <p className="text-slate-400 text-[10px] font-medium mt-1">Tiada Rekod</p>
                </div>
            </div>
        </div>
      </div>

      {/* Chart & Stats Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution Chart */}
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-50">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        Analitik Kehadiran
                    </h2>
                    <p className="text-xs text-slate-400 font-medium">Visualisasi data staf sekolah</p>
                </div>
                <button 
                    onClick={() => refreshData()}
                    className={`p-2 rounded-full text-slate-400 hover:bg-slate-50 hover:text-indigo-600 transition-colors ${isSyncing ? 'animate-spin' : ''}`}
                    title="Refresh Data"
                >
                    <RefreshCw size={20} />
                </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between">
                {/* Chart */}
                <div className="w-40 h-40 relative flex-shrink-0 mb-4 sm:mb-0">
                     <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                         <span className="text-2xl font-bold text-slate-800 animate-fade-in">{totalUsers}</span>
                         <span className="text-[9px] font-bold text-slate-400 uppercase">Staf</span>
                     </div>
                     <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                             <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={65}
                                paddingAngle={4}
                                cornerRadius={6}
                                dataKey="value"
                                stroke="none"
                                isAnimationActive={true}
                                animationDuration={800}
                                animationEasing="ease-out"
                             >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                             </Pie>
                             <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '8px 12px' }}
                                itemStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#334155' }}
                                formatter={(value: number) => [`${value} Orang`, '']}
                             />
                         </PieChart>
                     </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="flex flex-col gap-3 flex-1 w-full sm:pl-4">
                    {chartData.map((item, index) => (
                        <div key={index} className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                                <span className="text-xs font-bold text-slate-600">{item.name}</span>
                            </div>
                            <span className="text-xs font-bold text-slate-400">{Math.round((item.value / totalUsers) * 100) || 0}%</span>
                        </div>
                    ))}
                </div>
            </div>
          </div>

          {/* List Section */}
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-50 min-h-[400px]">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Senarai Status</h2>
                    <p className="text-xs text-slate-400 font-medium">Semakan terperinci mengikut kategori</p>
                </div>
                {isSyncing && <Activity size={16} className="text-indigo-500 animate-pulse" />}
            </div>

            {/* Modern Tabs */}
            <div className="flex bg-slate-50 p-1.5 rounded-full mb-6 gap-1 overflow-x-auto no-scrollbar">
                <TabButton id="working" label="HADIR" />
                <TabButton id="out" label="LUAR" />
                <TabButton id="leave" label="CUTI" />
                <TabButton id="pending" label="BELUM" />
            </div>

            {/* List Items */}
            <div className="space-y-3">
                 {lists[activeTab] && lists[activeTab].length > 0 ? (
                    lists[activeTab].map((item: any, i: number) => {
                        // Normalize data structure based on updated Mock API (always object)
                        const name = item.name;
                        const photo = item.photo;
                        const detail = item.detail;
                        
                        return (
                        <div key={i} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100 group animate-fade-in">
                            {/* Replaced initial circle with Image */}
                            <img 
                                src={photo} 
                                alt={name}
                                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm transition-transform group-hover:scale-110 flex-shrink-0"
                            />
                            
                            <div className="min-w-0">
                                 <p className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors truncate">{name}</p>
                                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide truncate">
                                    {detail}
                                 </p>
                            </div>
                        </div>
                        )
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 opacity-50">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                            <UserX className="text-slate-300" size={24} />
                        </div>
                        <p className="text-slate-400 text-sm font-medium">Tiada data dijumpai.</p>
                    </div>
                )}
            </div>
          </div>
      </div>
    </div>
  );
};
