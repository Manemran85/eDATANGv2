
import React, { useEffect, useState } from 'react';
import { StaffMember, AttendanceStatus, AttendanceRecord, User } from '../types';
import { api } from '../services/mockApi';
import { Search, Filter, Phone, MessageCircle, ArrowLeft, Calendar, FileText, ExternalLink, X, Clock, RefreshCw } from 'lucide-react';

export const Directory: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Drill-down State
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [staffHistory, setStaffHistory] = useState<AttendanceRecord[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);

  // Admin Check
  const isAdmin = currentUser.isAdmin === 'YES' || currentUser.email.toLowerCase().includes('admin');

  const loadStaffData = async (background = false) => {
      if (!background) setIsRefreshing(true);
      
      // Sync cloud data first
      await api.syncFromCloud();
      // Then get staff
      const data = await api.getStaff();
      setStaff(data);
      
      setLoading(false);
      if (!background) setIsRefreshing(false);
  };

  useEffect(() => {
    loadStaffData();

    // Auto-refresh every 15 seconds to update status
    const interval = setInterval(() => {
        loadStaffData(true);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const handleStaffClick = async (person: StaffMember) => {
      // Access Control: Only admins can view details
      if (!isAdmin) return;

      setSelectedStaff(person);
      setHistoryLoading(true);
      const history = await api.getHistory(person.email);
      setStaffHistory(history);
      setHistoryLoading(false);
  };

  const filteredStaff = staff.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.position.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'ALL' || s.status === filter;
    return matchesSearch && matchesFilter;
  });

  const filteredHistory = staffHistory.filter(h => {
      if (startDate && h.date < startDate) return false;
      if (endDate && h.date > endDate) return false;
      return true;
  });

  const getStatusColor = (status: AttendanceStatus) => {
    switch(status) {
        case AttendanceStatus.WORKING: return 'bg-green-100 text-black border-green-200';
        case AttendanceStatus.OUTSTATION: return 'bg-blue-100 text-black border-blue-200';
        case AttendanceStatus.LEAVE: return 'bg-red-100 text-black border-red-200';
        default: return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  const getWhatsAppLink = (phone: string | undefined) => {
      if (!phone) return '#';
      let clean = phone.replace(/\D/g, '');
      if (clean.startsWith('0')) {
          clean = '6' + clean;
      }
      return `https://wa.me/${clean}`;
  };

  const openDocument = (data: string) => {
      const win = window.open();
      if (win) {
          win.document.write(`<iframe src="${data}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
      }
  };

  if (selectedStaff) {
      return (
          <div className="min-h-screen px-4 py-8 max-w-lg mx-auto pb-32 bg-[#f8f9fc] animate-fade-in">
              <button 
                onClick={() => setSelectedStaff(null)}
                className="flex items-center gap-2 text-indigo-600 font-bold text-sm mb-6 hover:translate-x-1 transition-transform"
              >
                  <ArrowLeft size={18} /> Kembali ke Senarai Staf
              </button>

              <div className="bg-white p-6 rounded-[32px] shadow-sm mb-6 border border-gray-100 flex items-center gap-4">
                  <img src={selectedStaff.photo} className="w-16 h-16 rounded-2xl object-cover shadow-sm" alt={selectedStaff.name} />
                  <div>
                      <h3 className="font-bold text-gray-900 leading-tight">{selectedStaff.name}</h3>
                      <p className="text-xs text-gray-400 font-medium">{selectedStaff.position}</p>
                  </div>
              </div>

              {/* Filters for History */}
              <div className="bg-white p-5 rounded-[28px] shadow-sm mb-6 border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 pl-1">Tapis Mengikut Tarikh</p>
                  <div className="grid grid-cols-2 gap-3">
                      <div>
                          <label className="text-[9px] font-bold text-gray-300 uppercase mb-1 block pl-1">Mula</label>
                          <input 
                              type="date" 
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              className="w-full bg-gray-50 p-3 rounded-xl text-xs font-bold text-slate-900 outline-none"
                          />
                      </div>
                      <div>
                          <label className="text-[9px] font-bold text-gray-300 uppercase mb-1 block pl-1">Tamat</label>
                          <input 
                              type="date" 
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              className="w-full bg-gray-50 p-3 rounded-xl text-xs font-bold text-slate-900 outline-none"
                          />
                      </div>
                  </div>
              </div>

              {/* History List */}
              <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 mb-4">Log Kehadiran</h4>
                  {historyLoading ? (
                      <div className="text-center py-8 text-gray-300 animate-pulse">Memuatkan sejarah...</div>
                  ) : filteredHistory.length > 0 ? (
                      filteredHistory.map((item) => (
                          <div key={item.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-50 animate-slide-up">
                              <div className="flex justify-between items-start mb-3">
                                  <div>
                                      <p className="text-sm font-bold text-gray-900">{item.date}</p>
                                      <p className="text-[10px] text-gray-400 font-medium uppercase">{item.name}</p>
                                  </div>
                                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${getStatusColor(item.status)}`}>
                                      {item.status}
                                  </span>
                              </div>
                              
                              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                                  <div className="flex items-center gap-1.5 text-gray-400">
                                      <Clock size={12} />
                                      {item.status === AttendanceStatus.WORKING ? (
                                        <span className="text-[10px] font-bold uppercase">{item.timeIn}</span>
                                      ) : (
                                        <span className="text-[10px] font-bold uppercase text-gray-300">--:--</span>
                                      )}
                                  </div>
                                  
                                  {item.document ? (
                                      <button 
                                        onClick={() => openDocument(item.document!)}
                                        className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl text-[10px] font-bold hover:bg-indigo-100 transition-colors"
                                      >
                                          <FileText size={14} /> Lihat Dokumen
                                      </button>
                                  ) : (
                                      <span className="text-[10px] text-gray-300 font-bold uppercase italic">Tiada Dokumen</span>
                                  )}
                              </div>
                          </div>
                      ))
                  ) : (
                      <div className="bg-white p-8 rounded-3xl text-center border border-dashed border-gray-200">
                          <p className="text-gray-400 text-xs font-medium">Tiada rekod dijumpai bagi tempoh ini.</p>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-lg mx-auto pb-32">
      <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Senarai Staf</h2>
          <button onClick={() => loadStaffData()} className={`p-2 rounded-full text-slate-400 hover:bg-white transition-all ${isRefreshing ? 'animate-spin text-indigo-500' : ''}`}>
              <RefreshCw size={20} />
          </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
        <input 
            type="text" 
            className="w-full pl-12 pr-4 py-3.5 rounded-[24px] bg-white text-gray-900 border border-gray-100 shadow-sm outline-none focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-gray-300"
            placeholder="Cari nama atau jawatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
         {['ALL', 'BEKERJA', 'URUSAN LUAR', 'CUTI'].map(f => (
             <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`whitespace-nowrap px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${filter === f ? 'bg-[#0f172a] text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-100'}`}
             >
                {f === 'ALL' ? 'Semua' : f}
             </button>
         ))}
      </div>

      <div className="space-y-3">
        {loading ? (
            <div className="text-center py-12 text-gray-300 animate-pulse">Memuatkan maklumat staf...</div>
        ) : filteredStaff.length > 0 ? (
            filteredStaff.map((person, idx) => (
                <div 
                    key={idx} 
                    className={`bg-white p-4 rounded-[28px] shadow-sm border border-gray-50 flex items-center gap-4 transition-all ${isAdmin ? 'hover:shadow-md active:scale-95 cursor-pointer' : 'cursor-default'}`}
                    onClick={(e) => { 
                        if (isAdmin) {
                            handleStaffClick(person); 
                        }
                    }}
                >
                    <div className="relative">
                        <img 
                            src={person.photo} 
                            alt={person.name} 
                            className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-sm transition-transform group-hover:scale-110 flex-shrink-0" 
                            onClick={(e) => { 
                                if (isAdmin) {
                                    e.stopPropagation(); 
                                    handleStaffClick(person); 
                                }
                            }}
                        />
                        {person.status === AttendanceStatus.WORKING && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-800 truncate leading-tight mb-0.5">{person.name}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-2">{person.position}</p>
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border uppercase ${getStatusColor(person.status)}`}>
                            {person.status}
                        </span>
                    </div>
                    <div className="flex flex-col gap-2">
                        <a 
                            href={person.phoneNumber ? `tel:${person.phoneNumber}` : '#'}
                            className={`p-2.5 rounded-xl transition-all ${person.phoneNumber ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:scale-90 shadow-sm' : 'bg-gray-50 text-gray-200 cursor-not-allowed'}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!person.phoneNumber) e.preventDefault();
                            }}
                            title="Hubungi"
                        >
                             <Phone size={16} />
                        </a>
                        
                        <a 
                            href={getWhatsAppLink(person.phoneNumber)}
                            target={person.phoneNumber ? "_blank" : undefined}
                            rel="noopener noreferrer"
                            className={`p-2.5 rounded-xl transition-all ${person.phoneNumber ? 'bg-green-50 text-green-600 hover:bg-green-100 active:scale-90 shadow-sm' : 'bg-gray-50 text-gray-200 cursor-not-allowed'}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!person.phoneNumber) e.preventDefault();
                            }}
                            title="WhatsApp"
                        >
                             <MessageCircle size={16} />
                        </a>
                    </div>
                </div>
            ))
        ) : (
            <div className="text-center py-12 bg-white rounded-[32px] border border-dashed border-gray-200">
                <p className="text-gray-300 text-xs font-medium">Tiada staf dijumpai.</p>
            </div>
        )}
      </div>
    </div>
  );
};
