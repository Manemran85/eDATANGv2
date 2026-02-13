
import React, { useEffect, useState } from 'react';
import { User, AttendanceRecord, AttendanceStatus, SystemSettings } from '../types';
import { api } from '../services/mockApi';
import { FileText, Star, Search, Calendar, Plane, Briefcase, CalendarX, AlertCircle } from 'lucide-react';

export const History: React.FC<{ user: User }> = ({ user }) => {
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Derived Stats
  const [stats, setStats] = useState({
    countWorking: 0,
    countOut: 0,
    countLeave: 0,
    countLate: 0
  });

  const fetchData = async () => {
    setLoading(true);
    try {
        const [data, s] = await Promise.all([
            api.getHistory(user.email),
            api.getSettings()
        ]);
        
        setHistory(data);
        setSettings(s);
        
        // Calculate Stats
        const working = data.filter(r => r.status === AttendanceStatus.WORKING).length;
        const out = data.filter(r => r.status === AttendanceStatus.OUTSTATION).length;
        const leave = data.filter(r => r.status === AttendanceStatus.LEAVE).length;

        // Calculate Late Count
        let lateCount = 0;
        data.forEach(r => {
            if (r.status === AttendanceStatus.WORKING && r.timeIn && s) {
                try {
                    // Get Target Time based on role
                    const userRole = user.role || user.position || 'GURU';
                    const targetTimeStr = s.roleClockInTimes[userRole] || s.roleClockInTimes['GURU'] || s.clockInTime;
                    const [tHour, tMin] = targetTimeStr.split(':').map(Number);
                    const targetMinutes = tHour * 60 + tMin;

                    // Get Actual Time
                    const [time, modifier] = r.timeIn.split(' ');
                    let [hours, minutes] = time.split(':');
                    let h = parseInt(hours, 10);
                    if (h === 12 && modifier === 'AM') h = 0;
                    if (h !== 12 && modifier === 'PM') h += 12;
                    const actualMinutes = h * 60 + parseInt(minutes, 10);

                    if (actualMinutes > targetMinutes) {
                        lateCount++;
                    }
                } catch (e) {
                    // Ignore parsing errors
                }
            }
        });

        setStats({
            countWorking: working,
            countOut: out,
            countLeave: leave,
            countLate: lateCount
        });

    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.email]);

  // Helper to determine Time Color
  const getTimeColor = (timeStr: string | undefined, type: 'IN' | 'OUT') => {
      if (!settings || !timeStr) return 'text-gray-500'; 

      // 1. Get Target Time (Minutes) based on User Role/Position
      const userRole = user.role || user.position || 'GURU'; 
      // Fallback chain: Specific Role -> 'GURU' -> Global Default
      const targetTimeStr = type === 'IN'
          ? (settings.roleClockInTimes[userRole] || settings.roleClockInTimes['GURU'] || settings.clockInTime)
          : (settings.roleClockOutTimes[userRole] || settings.roleClockOutTimes['GURU'] || settings.clockOutTime);

      if(!targetTimeStr) return 'text-gray-500';

      const [tHour, tMin] = targetTimeStr.split(':').map(Number);
      const targetMinutes = tHour * 60 + tMin;

      // 2. Get Actual Time (Minutes)
      try {
          const [time, modifier] = timeStr.split(' ');
          let [hours, minutes] = time.split(':');
          let h = parseInt(hours, 10);
          if (h === 12 && modifier === 'AM') h = 0;
          if (h !== 12 && modifier === 'PM') h += 12;
          const actualMinutes = h * 60 + parseInt(minutes, 10);

          // 3. Compare Logic
          if (type === 'IN') {
              // Late if Actual > Target
              return actualMinutes > targetMinutes ? 'text-red-500' : 'text-green-600';
          } else {
              // Early leave if Actual < Target
              return actualMinutes < targetMinutes ? 'text-red-500' : 'text-green-600';
          }
      } catch (e) {
          return 'text-gray-500';
      }
  };

  const filteredHistory = history.filter(item => {
      // 1. Filter by Tab Type
      if (filterType !== 'ALL' && item.status !== filterType) return false;
      
      // 2. Filter by Date Range
      if (startDate && item.date < startDate) return false;
      if (endDate && item.date > endDate) return false;

      // 3. Filter by Search Query (Date matching)
      if (searchQuery && !item.date.includes(searchQuery)) return false;

      return true;
  });

  const getStatusIcon = (status: AttendanceStatus) => {
      switch(status) {
          case AttendanceStatus.WORKING: return <Briefcase size={20} className="text-green-600" />;
          case AttendanceStatus.OUTSTATION: return <Plane size={20} className="text-blue-600" />;
          case AttendanceStatus.LEAVE: return <CalendarX size={20} className="text-red-600" />;
          default: return <AlertCircle size={20} className="text-gray-400" />;
      }
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Sila benarkan pop-up untuk memuat turun laporan.");
        return;
    }

    const rows = filteredHistory.map((item, index) => {
        let statusColor = '';
        let bgBadge = '';

        if (item.status === AttendanceStatus.WORKING) {
            statusColor = '#15803d'; // green-700
            bgBadge = '#dcfce7'; // green-100
        } else if (item.status === AttendanceStatus.OUTSTATION) {
            statusColor = '#1d4ed8'; // blue-700
            bgBadge = '#dbeafe'; // blue-100
        } else if (item.status === AttendanceStatus.LEAVE) {
            statusColor = '#be123c'; // rose-700
            bgBadge = '#ffe4e6'; // rose-100
        } else {
            statusColor = '#475569';
            bgBadge = '#f1f5f9';
        }

        // Logic display time
        const timeInDisplay = item.status === AttendanceStatus.WORKING ? item.timeIn : '--:--';
        const timeOutDisplay = item.status === AttendanceStatus.WORKING ? (item.timeOut || '--:--') : '--:--';

        return `
            <tr>
                <td style="text-align: center;">${index + 1}</td>
                <td>${item.date}</td>
                <td style="text-align: center;">${timeInDisplay}</td>
                <td style="text-align: center;">${timeOutDisplay}</td>
                <td style="text-align: center;">
                    <span style="display:inline-block; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; text-transform: uppercase; background:${bgBadge}; color:${statusColor};">
                        ${item.status}
                    </span>
                </td>
            </tr>
        `;
    }).join('');

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Laporan Kehadiran - ${user.name}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
                
                @page { size: A4; margin: 1.5cm; }
                
                body {
                    font-family: 'Poppins', sans-serif;
                    background: #fff;
                    color: #0f172a;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    padding: 20px;
                }

                /* Header Styling */
                .header-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 2px solid #e2e8f0;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .logo-section {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                .school-name {
                    font-size: 24px;
                    font-weight: 800;
                    color: #1e40af; /* Blue Title */
                    text-transform: uppercase;
                    line-height: 1.2;
                }
                .report-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .meta-box {
                    text-align: right;
                }
                .meta-label {
                    font-size: 10px;
                    font-weight: 700;
                    color: #7c3aed;
                    text-transform: uppercase;
                }
                .meta-val {
                    font-size: 12px;
                    font-weight: 600;
                    color: #334155;
                }

                /* User Info Card */
                .user-card {
                    display: flex;
                    gap: 20px;
                    margin-bottom: 30px;
                    padding: 20px;
                    background: #f8fafc;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                }
                .uc-item { flex: 1; }

                /* Table Styling - Clean Grid */
                table {
                    width: 100%;
                    border-collapse: collapse; /* Standard Grid */
                    margin-top: 20px;
                }
                
                th {
                    background-color: #f1f5f9;
                    text-align: left;
                    font-size: 10px;
                    font-weight: 800;
                    color: #475569;
                    text-transform: uppercase;
                    padding: 12px 10px;
                    border: 1px solid #cbd5e1;
                }

                td {
                    border: 1px solid #cbd5e1;
                    padding: 10px;
                    font-size: 11px;
                    color: #334155;
                    font-weight: 500;
                    vertical-align: middle;
                }

                tr:nth-child(even) {
                    background-color: #fcfcfc;
                }
                
                .footer {
                    margin-top: 50px;
                    text-align: center;
                    font-size: 10px;
                    color: #94a3b8;
                    border-top: 1px solid #e2e8f0;
                    padding-top: 10px;
                }
            </style>
        </head>
        <body>
            
            <div class="header-container">
                <div class="logo-section">
                    <img src="https://i.ibb.co/FbdxdqGc/skpk.png" style="width: 60px; height: auto;" alt="Logo" />
                    <div>
                        <div class="school-name">SK PEKAN KIMANIS</div>
                        <div class="report-title">Sistem Kehadiran Pintar</div>
                    </div>
                </div>
                <div class="meta-box">
                    <div class="meta-label">Tarikh Cetakan</div>
                    <div class="meta-val">${new Date().toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                </div>
            </div>

            <div class="user-card">
                <div class="uc-item">
                    <div class="meta-label">Nama Staf</div>
                    <div class="meta-val" style="font-size:16px">${user.name.toUpperCase()}</div>
                </div>
                <div class="uc-item">
                    <div class="meta-label">Jawatan</div>
                    <div class="meta-val">${user.position}</div>
                </div>
                <div class="uc-item">
                    <div class="meta-label">Tempoh Rekod</div>
                    <div class="meta-val">${startDate ? startDate : 'AWAL'} - ${endDate ? endDate : 'KINI'}</div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th width="10%" style="text-align:center">No</th>
                        <th width="30%">Tarikh</th>
                        <th width="20%" style="text-align:center">Masa Masuk</th>
                        <th width="20%" style="text-align:center">Masa Keluar</th>
                        <th width="20%" style="text-align:center">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>

            <div class="footer">
                Dokumen ini dijana secara automatik oleh Sistem SKPK Cloud. Tandatangan tidak diperlukan.
            </div>

            <script>
                window.onload = function() {
                    setTimeout(function() {
                         window.print();
                    }, 500);
                }
            <\/script>
        </body>
        </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen px-5 pt-8 pb-32 bg-[#f8f9fe]">
      {/* Header */}
      <div className="mb-6">
         <h1 className="text-2xl font-bold text-[#0f172a]">Rekod Saya</h1>
         <p className="text-xs text-gray-400">Log aktiviti terkini daripada pangkalan data.</p>
      </div>

      {/* Download Button */}
      <button 
        onClick={handlePrintReport}
        className="w-full bg-[#6366f1] text-white py-4 rounded-2xl shadow-lg shadow-indigo-200 font-bold text-sm flex items-center justify-center gap-2 mb-6 hover:bg-indigo-600 transition-colors active:scale-95"
      >
          <FileText size={18} />
          MUAT TURUN LAPORAN
      </button>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
          {/* 1. HADIR (Tepat Masa - Excluding Late) */}
          <div className="bg-white p-4 rounded-3xl shadow-sm flex flex-col items-center justify-center text-center h-28">
             <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">HADIR</p>
             <h3 className="text-2xl font-bold text-[#0f172a] mb-1">{Math.max(0, stats.countWorking - stats.countLate)}</h3>
             <span className="text-[9px] text-green-500 font-bold uppercase">Tepat Masa</span>
          </div>

          {/* 2. HADIR (Lewat) */}
          <div className="bg-white p-4 rounded-3xl shadow-sm flex flex-col items-center justify-center text-center h-28">
             <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">HADIR</p>
             <h3 className="text-2xl font-bold text-[#0f172a] mb-1">{stats.countLate}</h3>
             <span className="text-[9px] text-red-500 font-bold uppercase">Lewat</span>
          </div>

          {/* 3. CUTI - Text Color Orange */}
          <div className="bg-white p-4 rounded-3xl shadow-sm flex flex-col items-center justify-center text-center h-28">
             <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">CUTI</p>
             <h3 className="text-2xl font-bold text-[#0f172a] mb-1">{stats.countLeave}</h3>
             <span className="text-[9px] text-orange-500 font-bold uppercase">Log Cuti</span>
          </div>
          
          {/* 4. URUSAN LUAR */}
          <div className="bg-white p-4 rounded-3xl shadow-sm flex flex-col items-center justify-center text-center h-28">
             <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">URUSAN LUAR</p>
             <h3 className="text-2xl font-bold text-[#0f172a] mb-1">{stats.countOut}</h3>
             <span className="text-[9px] text-blue-500 font-bold uppercase">Log Aktif</span>
          </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-5 rounded-[30px] shadow-sm mb-6">
        {/* Search */}
        <div className="relative mb-5">
            <Search className="absolute left-4 top-3.5 text-gray-300" size={18} />
            <input 
                type="text" 
                placeholder="Cari tarikh..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 pl-11 pr-4 py-3 rounded-xl text-sm font-medium text-gray-900 outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
            />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5 pb-1">
            {[
                { id: 'ALL', label: 'SEMUA' },
                { id: AttendanceStatus.WORKING, label: 'BEKERJA' },
                { id: AttendanceStatus.OUTSTATION, label: 'LUAR' },
                { id: AttendanceStatus.LEAVE, label: 'CUTI' }
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setFilterType(tab.id)}
                    className={`whitespace-nowrap px-5 py-2 rounded-lg text-[10px] font-bold transition-all ${
                        filterType === tab.id 
                        ? 'bg-[#0f172a] text-white shadow-md' 
                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block pl-1">Mula</label>
                <input 
                    type="date" 
                    value={startDate}
                    onClick={(e) => (e.target as HTMLInputElement).showPicker()}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-gray-50 p-3 rounded-xl text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-indigo-200 cursor-pointer"
                />
            </div>
            <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block pl-1">Tamat</label>
                <input 
                    type="date" 
                    value={endDate}
                    onClick={(e) => (e.target as HTMLInputElement).showPicker()}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-gray-50 p-3 rounded-xl text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-indigo-200 cursor-pointer"
                />
            </div>
        </div>
      </div>

      {/* History List */}
      <div className="space-y-3">
          {filteredHistory.length > 0 ? (
              filteredHistory.map((item) => (
                  <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm flex items-center justify-between border border-gray-50">
                      <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 border border-gray-100`}>
                              {getStatusIcon(item.status)}
                          </div>
                          <div>
                              <h4 className="font-bold text-[#0f172a] text-sm">{item.date}</h4>
                              <p className="text-[10px] text-gray-400 uppercase font-medium tracking-wide">{item.status}</p>
                          </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                          <span className={`block text-xs font-bold ${item.status === AttendanceStatus.WORKING ? getTimeColor(item.timeIn, 'IN') : 'text-gray-400'}`}>
                             {item.status === AttendanceStatus.WORKING ? `IN: ${item.timeIn}` : 'TIADA REKOD MASA'}
                          </span>
                          {item.status === AttendanceStatus.WORKING && item.timeOut && (
                              <span className={`block text-xs font-bold mt-1 ${getTimeColor(item.timeOut, 'OUT')}`}>
                                  OUT: {item.timeOut}
                              </span>
                          )}
                      </div>
                  </div>
              ))
          ) : (
              <div className="text-center py-10">
                  <p className="text-gray-300 text-sm">Tiada rekod dijumpai.</p>
              </div>
          )}
      </div>
    </div>
  );
};
