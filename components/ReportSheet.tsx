
import React, { useEffect, useState } from 'react';
import { api } from '../services/mockApi';
import { AttendanceRecord, User, AttendanceStatus } from '../types';
import { Search, Printer, ArrowLeft, Calendar, User as UserIcon, Filter, ExternalLink, FileText, MapPin, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ReportSheet: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [filterName, setFilterName] = useState('');
  const [filterMonth, setFilterMonth] = useState(''); 
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    loadData();

    // Auto-refresh every 20 seconds
    const interval = setInterval(() => {
        loadData(true);
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  const loadData = async (background = false) => {
    if (!background) setLoading(true);
    else setIsRefreshing(true);

    try {
        if (background) await api.syncFromCloud(); // Sync data
        const data = await api.getAllHistory();
        setHistory(data);
    } catch (e) {
        console.error(e);
    } finally {
        if (!background) setLoading(false);
        else setIsRefreshing(false);
    }
  };

  const filteredHistory = history.filter(record => {
    const matchName = record.name.toLowerCase().includes(filterName.toLowerCase());
    const recordMonth = record.date.split('-')[1]; 
    const matchMonth = filterMonth ? recordMonth === filterMonth : true;
    const matchDate = filterDate ? record.date === filterDate : true;
    return matchName && matchMonth && matchDate;
  });

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Sila benarkan 'Pop-up' untuk mencetak laporan.");
        return;
    }

    const rowsHtml = filteredHistory.map((rec, index) => {
        // LOGIK STATUS TERPERINCI
        let displayStatus: string = rec.status;
        let detailInfo = "";

        if (rec.status === AttendanceStatus.WORKING) {
            displayStatus = "HADIR BERTUGAS";
        } else if (rec.status === AttendanceStatus.OUTSTATION) {
            // Gabungkan Jenis Urusan (cth: MESYUARAT) dengan Keterangan (cth: Aset)
            const type = rec.outstationType || 'URUSAN LUAR';
            const reason = rec.reason ? ` (${rec.reason})` : '';
            displayStatus = `${type}${reason}`;
        } else if (rec.status === AttendanceStatus.LEAVE) {
            displayStatus = rec.leaveType || 'CUTI BERREKOD';
        }

        const timeInDisplay = rec.status === AttendanceStatus.WORKING ? rec.timeIn : '--';
        const timeOutDisplay = rec.status === AttendanceStatus.WORKING ? (rec.timeOut || '--') : '--';

        return `
            <tr>
                <td style="text-align:center;">${index + 1}</td>
                <td style="text-align:center;">${rec.date}</td>
                <td><span style="font-weight:bold;">${rec.name}</span></td>
                <td style="text-align:center;">${timeInDisplay}</td>
                <td style="text-align:center;">${timeOutDisplay}</td>
                <td style="font-size: 10px;">${displayStatus}</td>
            </tr>
        `;
    }).join('');

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Laporan Kehadiran</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
                
                body { 
                    font-family: 'Roboto', sans-serif; 
                    padding: 40px; 
                    font-size: 11px;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                
                .header-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #1e40af;
                    padding-bottom: 15px;
                    gap: 20px;
                }

                .logo {
                    width: 70px;
                    height: auto;
                }

                .school-info {
                    text-align: left;
                }
                
                h1 { 
                    color: #1e40af; /* Tajuk Biru */
                    font-size: 24px;
                    margin: 0;
                    text-transform: uppercase;
                    line-height: 1.2;
                }
                
                h2 {
                    color: #64748b;
                    font-size: 14px;
                    margin: 4px 0 0 0;
                    font-weight: 500;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                }

                .meta {
                    margin-bottom: 20px;
                    text-align: right;
                    font-size: 10px;
                    color: #555;
                }

                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 10px; 
                    border: 1px solid #000; /* Border Kotak Luar */
                }
                
                th { 
                    background-color: #f3e8ff !important; /* Latar Belakang Ungu Muda */
                    color: #6b21a8 !important; /* Label Ungu Pekat */
                    border: 1px solid #000; /* Border Kotak */
                    padding: 10px; 
                    text-align: left; 
                    text-transform: uppercase;
                    font-weight: 800;
                    font-size: 10px;
                }
                
                td { 
                    border: 1px solid #000; /* Border Kotak */
                    padding: 8px; 
                    color: #334155;
                    vertical-align: middle;
                }

                tr:nth-child(even) {
                    background-color: #f8fafc;
                }

                @media print {
                    @page { 
                        size: A4; 
                        margin: 1cm; 
                    }
                }
            </style>
        </head>
        <body>
            <div class="header-container">
                <img src="https://i.ibb.co/FbdxdqGc/skpk.png" class="logo" alt="Logo Sekolah" />
                <div class="school-info">
                    <h1>SK PEKAN KIMANIS</h1>
                    <h2>Laporan Kehadiran & Pergerakan Staf</h2>
                </div>
            </div>
            
            <div class="meta">
                Dicetak pada: <b>${new Date().toLocaleDateString('ms-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</b>
            </div>

            <table>
                <thead>
                    <tr>
                        <th width="5%" style="text-align:center;">No</th>
                        <th width="15%" style="text-align:center;">Tarikh</th>
                        <th width="30%">Nama Staf</th>
                        <th width="10%" style="text-align:center;">Masuk</th>
                        <th width="10%" style="text-align:center;">Keluar</th>
                        <th width="30%">Status / Catatan</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>

            <script>
                window.onload = function() {
                    setTimeout(function() {
                         window.print();
                    }, 500);
                }
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* HEADER */}
      <div className="bg-white px-6 py-6 shadow-sm border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Jadual Induk Kehadiran</h1>
                    <p className="text-xs text-gray-400">Sinkronasi Data Staf & Kehadiran</p>
                </div>
            </div>
            
            <div className="flex gap-3">
                <button 
                    onClick={() => loadData()}
                    className={`p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-100 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                    title="Refresh Table"
                >
                    <RefreshCw size={18} />
                </button>
                <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 text-xs uppercase tracking-wider"
                >
                    <Printer size={16} />
                    CETAK LAPORAN
                </button>
            </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* FILTERS */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6 border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
             <div className="relative flex-1 w-full">
                <UserIcon className="absolute left-3 top-3.5 text-gray-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Cari Nama..." 
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none"
                />
            </div>
            <div className="relative flex-1 w-full">
                <input 
                    type="date" 
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none"
                />
            </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-gray-200">
                            <th className="px-4 py-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Tarikh</th>
                            <th className="px-4 py-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Nama Staf</th>
                            <th className="px-4 py-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Emel</th>
                            <th className="px-4 py-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest text-center">Status</th>
                            <th className="px-4 py-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest text-center">Masuk</th>
                            <th className="px-4 py-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest text-center">Keluar</th>
                            <th className="px-4 py-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest text-center">Dokumen</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                             <tr><td colSpan={7} className="px-6 py-12 text-center text-xs text-gray-400 animate-pulse">Memuatkan data...</td></tr>
                        ) : filteredHistory.length > 0 ? (
                            filteredHistory.map((record, index) => (
                                <tr key={index} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="px-4 py-2.5">
                                        <span className="text-[11px] font-bold text-gray-700">{record.date}</span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className="text-[11px] font-bold text-gray-900">{record.name}</span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className="text-[10px] text-gray-500">{record.email}</span>
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                         <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                                                record.status === 'BEKERJA' ? 'bg-green-50 text-green-700 border-green-200' :
                                                record.status === 'CUTI' ? 'bg-pink-50 text-pink-700 border-pink-200' :
                                                'bg-blue-50 text-blue-700 border-blue-200'
                                            }`}>
                                                {record.status}
                                            </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                        <span className="text-[11px] font-medium text-gray-700">{record.timeIn || '-'}</span>
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                        <span className="text-[11px] font-medium text-gray-700">{record.timeOut || '-'}</span>
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                        {record.document ? (
                                            <a href="#" className="text-indigo-600 hover:text-indigo-800"><ExternalLink size={14} /></a>
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={7} className="px-6 py-12 text-center text-xs text-gray-400">Tiada rekod dijumpai.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
        <p className="text-[10px] text-gray-400 mt-2 text-right">Menunjukkan 500 rekod terkini</p>
      </div>
    </div>
  );
};
