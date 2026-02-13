
import React, { useState, useEffect, useRef } from 'react';
import { User, AttendanceStatus, SystemSettings } from '../types';
import { api, GOOGLE_DRIVE_URL } from '../services/mockApi';
import { MapPin, Briefcase, CalendarX, Plane, Check, LogOut, Upload, Clock, User as UserIcon, FileText, Timer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ClockInProps {
  user: User;
}

export const ClockIn: React.FC<ClockInProps> = ({ user }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<AttendanceStatus>(AttendanceStatus.WORKING);
  const [gpsData, setGpsData] = useState<{ lat: number; lon: number; dist: number } | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLate, setIsLate] = useState(false);
  const [reason, setReason] = useState('');
  
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  const [showClockOutModal, setShowClockOutModal] = useState(false);

  const [outstationType, setOutstationType] = useState<'RASMI' | 'TIDAK_RASMI'>('RASMI');
  const [outstationCategory, setOutstationCategory] = useState('');
  const [outstationTitle, setOutstationTitle] = useState('');
  const [outstationLocation, setOutstationLocation] = useState('');
  const [leaveType, setLeaveType] = useState('');
  const [fileName, setFileName] = useState('Tiada fail dipilih');
  const [documentData, setDocumentData] = useState<string | undefined>(undefined);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isClockedOut, setIsClockedOut] = useState(false);
  const [submissionTime, setSubmissionTime] = useState('');
  const [clockOutTime, setClockOutTime] = useState('');
  const [workDuration, setWorkDuration] = useState(0);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [amPm, setAmPm] = useState('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getDeviceType = () => {
    const width = window.innerWidth;
    if (width < 768) return 'Mobile';
    if (width < 1024) return 'Tablet';
    return 'PC';
  };

  const parseTimeStr = (timeStr: string) => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':');
    let h = parseInt(hours, 10);
    if (h === 12 && modifier === 'AM') h = 0;
    if (h !== 12 && modifier === 'PM') h += 12;
    const d = new Date();
    d.setHours(h, parseInt(minutes, 10), 0, 0);
    return d;
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    api.getSettings().then((data) => {
        setSettings(data);
        checkLateStatus(data);
        if (data.outstationTypes.length > 0) setOutstationCategory(data.outstationTypes[0]);
        if (data.leaveTypes.length > 0) setLeaveType(data.leaveTypes[0]);
    });

    const checkActiveSession = async () => {
        const history = await api.getHistory(user.email);
        const today = new Date().toISOString().split('T')[0];
        
        // MODIFIED: Find ANY record for today, regardless of status (WORKING, OUTSTATION, LEAVE)
        const todayRecord = history.find(h => h.date === today);

        if (todayRecord) {
            setCurrentRecordId(todayRecord.id);
            setStatus(todayRecord.status); // Restore the status (e.g., LEAVE or OUTSTATION)
            setSubmissionTime(todayRecord.timeIn);
            setIsSubmitted(true); // Trigger the "Success/Submitted" view

            // Logic specific to WORKING status (Clock Out / Timer)
            if (todayRecord.status === AttendanceStatus.WORKING) {
                if (todayRecord.timeOut) {
                    setIsClockedOut(true);
                    setClockOutTime(todayRecord.timeOut);
                } else {
                    setIsClockedOut(false);
                    try {
                        const start = parseTimeStr(todayRecord.timeIn);
                        const now = new Date();
                        const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
                        setWorkDuration(diff > 0 ? diff : 0);
                    } catch (e) {
                        console.error("Error parsing time", e);
                    }
                }
            } else {
                // For OUTSTATION or LEAVE, just ensure we don't show clock out logic
                setIsClockedOut(false);
            }
        }
    };
    checkActiveSession();
  }, []);

  useEffect(() => {
      const updateClock = () => {
        const d = new Date();
        // Time with seconds for digital clock
        const timeFull = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
        const [timePart, modifier] = timeFull.split(' ');
        setCurrentTimeStr(timePart);
        setAmPm(modifier);

        const day = d.toLocaleDateString('ms-MY', { weekday: 'long' });
        const date = d.toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' });
        setCurrentDateStr(`${day.toUpperCase()}, ${date.toUpperCase()}`);
        if (settings) {
            checkLateStatus(settings);
        }
    };
    updateClock();
    const clockInterval = setInterval(updateClock, 1000);
    return () => clearInterval(clockInterval);
  }, [settings, user.role, user.position]);

  useEffect(() => {
    if (isSubmitted && !isClockedOut && status === AttendanceStatus.WORKING) {
        timerRef.current = setInterval(() => {
            setWorkDuration(prev => prev + 1);
        }, 1000);
    } else if ((isClockedOut || status !== AttendanceStatus.WORKING) && timerRef.current) {
        clearInterval(timerRef.current);
    }
    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isSubmitted, isClockedOut, status]);

  const checkLateStatus = (currentSettings: SystemSettings) => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const userRole = user.role || user.position || 'GURU'; 
      const targetTimeStr = currentSettings.roleClockInTimes[userRole] || 
                            currentSettings.roleClockInTimes['GURU'] || 
                            currentSettings.clockInTime;
      if (!targetTimeStr) return;
      const [inHour, inMin] = targetTimeStr.split(':').map(Number);
      const limitIn = inHour * 60 + inMin;
      setIsLate(currentMinutes > limitIn);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2-lat1) * Math.PI / 180;
    const Δλ = (lon2-lon1) * Math.PI / 180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  useEffect(() => {
    if (status === AttendanceStatus.WORKING && !isSubmitted) {
      if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
          (pos) => {
            if (settings) {
              const dist = calculateDistance(pos.coords.latitude, pos.coords.longitude, settings.targetLat, settings.targetLon);
              setGpsData({ lat: pos.coords.latitude, lon: pos.coords.longitude, dist });
            }
          },
          (err) => console.error(err),
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
        );
      }
    }
  }, [status, settings, isSubmitted]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocumentData(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFileName('Tiada fail dipilih');
      setDocumentData(undefined);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === AttendanceStatus.WORKING && settings) {
        if (!gpsData || gpsData.dist > settings.radiusMeter) {
             alert("Anda berada di luar kawasan sekolah!");
             return;
        }
    }

    setLoading(true);
    try {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false });

        const res = await api.clockIn({
            email: user.email,
            status,
            lat: gpsData?.lat,
            lon: gpsData?.lon,
            reason: (status === AttendanceStatus.WORKING && isLate) ? reason : undefined,
            outstationType: status === AttendanceStatus.OUTSTATION ? outstationType : undefined,
            outstationCategory: outstationCategory,
            leaveType: leaveType,
            startDate: startDate,
            endDate: endDate,
            document: documentData,
            deviceType: getDeviceType() 
        });

        if (res.success) {
            if (res.record) setCurrentRecordId(res.record.id);
            setSubmissionTime(timeString);
            setIsSubmitted(true);
            window.scrollTo(0, 0);
        }
    } catch (e) {
        alert("Ralat sistem.");
    } finally {
        setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setShowClockOutModal(false);
    setLoading(true);
    try {
        const now = new Date();
        const outTimeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        if (currentRecordId) {
            await api.updateAttendanceRecord(currentRecordId, { timeOut: outTimeStr });
        }
        setTimeout(() => {
            setClockOutTime(outTimeStr);
            setIsClockedOut(true);
            setLoading(false);
            window.scrollTo(0, 0);
        }, 800);
    } catch (e) {
        alert("Gagal melakukan Clock Out.");
        setLoading(false);
    }
  };

  const StatusButton = ({ type, label, icon: Icon, activeClass, iconColor }: any) => (
    <button 
        type="button"
        disabled={isSubmitted}
        onClick={() => setStatus(type)}
        className={`relative p-4 rounded-[24px] flex flex-col items-center justify-center gap-3 transition-all duration-300 aspect-square border shadow-sm group
            ${status === type 
                ? 'bg-[#0f172a] text-white border-transparent shadow-xl ring-4 ring-indigo-50 scale-105' 
                : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'
            }`}
    >
        <div className={`p-2 rounded-xl transition-all ${status === type ? 'bg-white/10' : 'bg-gray-50 group-hover:bg-gray-100'}`}>
            <Icon size={28} strokeWidth={2.5} className={status === type ? 'text-white' : iconColor} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fc] pb-32">
      
      {/* 2. FLOATING CONTENT CARD */}
      <div className="max-w-md mx-auto px-6 py-8 relative z-20">
        
        {/* JAM DIGITAL SECTION */}
        <div className="text-center mb-8 pt-4 animate-fade-in">
            <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase mb-1">WAKTU SEMASA</p>
            <div className="flex items-baseline justify-center gap-2 mb-2">
                <h1 className="text-6xl font-black text-slate-800 tracking-tighter leading-none tabular-nums drop-shadow-sm">
                    {currentTimeStr}
                </h1>
                <span className="text-xl font-bold text-slate-400 uppercase tracking-widest">{amPm}</span>
            </div>
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 inline-block px-4 py-1.5 rounded-full border border-indigo-100 shadow-sm">
                {currentDateStr}
            </p>
        </div>

        {/* HEADER SECTION (CLEAN TEXT) */}
        <div className="flex justify-between items-start mb-6 border-t border-slate-100 pt-6">
            <div>
                <h1 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-tight">
                    BORANG KEHADIRAN DIGITAL<br/>
                    <span className="text-slate-400">({user.role || user.position || 'GURU'})</span>
                </h1>
            </div>
            {/* BADGE TEPAT MASA / LEWAT */}
            <div className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider ${isLate ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {isLate ? 'LEWAT' : 'TEPAT MASA'}
            </div>
        </div>
        
        {isSubmitted ? (
            // SUCCESS VIEW
            <div className="animate-slide-up">
                 
                 {/* NEW: DURATION CARD (Matches Design) */}
                 {status === AttendanceStatus.WORKING && !isClockedOut && (
                     <div className="bg-[#020617] rounded-[40px] p-8 mb-6 text-center shadow-2xl relative overflow-hidden border border-slate-800">
                        {/* Glow Effect */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-16 bg-pink-500/20 blur-[50px] rounded-full pointer-events-none"></div>
                        
                        <p className="relative z-10 text-[10px] font-black text-pink-500 uppercase tracking-[0.3em] mb-4">
                            DURASI BEKERJA
                        </p>

                        <div className="relative z-10 flex items-center justify-center gap-6 mb-4">
                             <div className="relative flex items-center justify-center">
                                 <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]"></div>
                                 <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-50"></div>
                             </div>
                             <div className="font-mono text-5xl sm:text-6xl font-black text-white tracking-widest tabular-nums leading-none">
                                 {formatDuration(workDuration)}
                             </div>
                        </div>

                        <p className="relative z-10 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            MULA PADA {submissionTime}
                        </p>
                     </div>
                 )}

                 <div className="bg-white rounded-[35px] p-8 text-center shadow-xl mb-6 relative overflow-hidden border border-white/50">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-500"></div>
                        <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <Check size={40} className="text-green-500" strokeWidth={3} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Rekod Berjaya!</h3>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-widest leading-relaxed px-4">
                            Status <span className="font-bold text-indigo-600">{status}</span> anda telah direkodkan ke dalam sistem pada jam <span className="text-slate-900 font-bold">{submissionTime}</span>.
                        </p>
                </div>

                {status === AttendanceStatus.WORKING ? (
                    !isClockedOut ? (
                        <button 
                            onClick={() => setShowClockOutModal(true)}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-[24px] shadow-xl shadow-red-200 transition-all active:scale-95 flex items-center justify-center gap-3"
                        >
                            <LogOut size={20} /> CLOCK OUT
                        </button>
                    ) : (
                        <div className="bg-slate-200 rounded-[24px] p-6 text-center text-slate-500 font-bold text-sm shadow-inner">
                            Sesi Tamat pada {clockOutTime}
                        </div>
                    )
                ) : (
                    <button 
                        onClick={() => navigate('/')} 
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-[24px] shadow-xl shadow-indigo-200 transition-all active:scale-95"
                    >
                        KEMBALI KE UTAMA
                    </button>
                )}

                 {/* Clock Out Confirmation Modal */}
                 {showClockOutModal && (
                     <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
                         <div className="bg-white p-8 rounded-[32px] w-full max-w-xs text-center shadow-2xl animate-scale-up">
                             <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <LogOut size={28} />
                             </div>
                             <h3 className="font-bold text-xl text-slate-900 mb-2">Clock Out?</h3>
                             <p className="text-xs text-slate-500 mb-8">Adakah anda pasti ingin menamatkan sesi kerja hari ini?</p>
                             <div className="flex flex-col gap-3">
                                <button onClick={handleClockOut} className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-red-200 text-xs uppercase tracking-widest">Ya, Tamatkan</button>
                                <button onClick={() => setShowClockOutModal(false)} className="w-full bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest">Batal</button>
                             </div>
                         </div>
                     </div>
                 )}
            </div>
        ) : (
            // FORM VIEW
            <div className="animate-slide-up">
              <form onSubmit={handleSubmit}>
                
                {/* Status Selection Grid */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                    <StatusButton 
                        type={AttendanceStatus.WORKING} 
                        label="Bekerja" 
                        icon={Briefcase} 
                        activeClass="bg-indigo-600" 
                        iconColor="text-indigo-600" 
                    />
                    <StatusButton 
                        type={AttendanceStatus.OUTSTATION} 
                        label="Luar" 
                        icon={Plane} 
                        activeClass="bg-blue-600" 
                        iconColor="text-blue-600" 
                    />
                    <StatusButton 
                        type={AttendanceStatus.LEAVE} 
                        label="Cuti" 
                        icon={CalendarX} 
                        activeClass="bg-rose-600" 
                        iconColor="text-rose-600" 
                    />
                </div>

                {/* 1. WORKING FORM */}
                {status === AttendanceStatus.WORKING && (
                    <div className="space-y-4 mb-8">
                        {/* 1. KAD VALIDASI LOKASI (Hijau) */}
                        <div className="bg-emerald-50 rounded-[28px] p-6 flex items-start gap-4 mb-2 border border-emerald-100">
                             <div className="p-2.5 bg-white/60 rounded-full text-emerald-600 mt-1 shadow-sm flex-shrink-0">
                                <MapPin size={20} fill="currentColor" className="text-emerald-600" />
                             </div>
                             <div className="flex-1">
                                 <h4 className="text-emerald-800 font-extrabold text-[10px] uppercase tracking-widest mb-1.5">Validasi Lokasi</h4>
                                 <p className="text-emerald-700 text-xs font-medium leading-relaxed">
                                     Sila pastikan anda berada dalam radius {settings?.radiusMeter || 300}m dari pejabat.
                                     <span className="font-bold text-emerald-900 block mt-1">
                                        Had masa: {settings?.roleClockInTimes[user.role || user.position] || settings?.clockInTime || '07:30'}.
                                     </span>
                                 </p>
                             </div>
                        </div>

                        {/* 2. PENJEJAK LOKASI LANGSUNG (Putih) */}
                        <div className="bg-white rounded-[32px] p-6 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100 relative overflow-hidden mb-4">
                             
                             <div className="flex justify-between items-start mb-8 relative z-10">
                                <div className="space-y-1">
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">Penjejak Lokasi Langsung</p>
                                    <h3 className="text-xl font-bold text-slate-900 leading-tight">Status Radius<br/>Pejabat</h3>
                                </div>
                                
                                {/* Status Toggle Badge */}
                                <div className={`px-4 py-2 rounded-2xl flex flex-col items-center justify-center transition-colors shadow-sm ${
                                    gpsData && settings && gpsData.dist <= settings.radiusMeter 
                                    ? 'bg-emerald-100' : 'bg-rose-100'
                                }`}>
                                   <span className={`text-[10px] font-black uppercase tracking-wider ${
                                       gpsData && settings && gpsData.dist <= settings.radiusMeter 
                                       ? 'text-emerald-600' : 'text-rose-600'
                                   }`}>
                                     {gpsData && settings && gpsData.dist <= settings.radiusMeter ? 'DALAM' : 'LUAR'}
                                   </span>
                                   <span className={`text-[9px] font-black uppercase tracking-wider ${
                                        gpsData && settings && gpsData.dist <= settings.radiusMeter 
                                        ? 'text-emerald-600/70' : 'text-rose-600/70'
                                   }`}>
                                     RADIUS
                                   </span>
                                </div>
                             </div>

                             <div className="flex items-end justify-between mb-4 relative z-10">
                                 <div className="flex items-baseline">
                                    <span className="text-6xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">
                                        {gpsData ? Math.round(gpsData.dist) : '0'}
                                    </span>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-2">METER</span>
                                 </div>
                                 <div className="text-right mb-2">
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Radius Dibenarkan</p>
                                    <p className="text-lg font-black text-slate-800">{settings?.radiusMeter || 300}m</p>
                                 </div>
                             </div>

                             {/* Progress Bar */}
                             <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden relative">
                                <div 
                                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                                        gpsData && settings && gpsData.dist <= settings.radiusMeter 
                                        ? 'bg-emerald-500' : 'bg-rose-500'
                                    }`} 
                                    style={{ 
                                        width: `${Math.min(((gpsData?.dist || 0) / (settings?.radiusMeter || 300)) * 100, 100)}%` 
                                    }}
                                ></div>
                             </div>
                             
                             {/* Hint if finding GPS */}
                             {!gpsData && (
                                 <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-20 rounded-[32px]">
                                     <div className="bg-white px-5 py-2 rounded-full shadow-lg border border-slate-100 flex items-center gap-2">
                                         <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                         <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Mencari GPS...</span>
                                     </div>
                                 </div>
                             )}
                        </div>
                        
                        {isLate && (
                            <div className="animate-fade-in pt-2">
                                <label className="text-[10px] font-bold text-red-400 uppercase tracking-widest pl-2 mb-1 block">Sebab Kelewatan</label>
                                <textarea 
                                    value={reason} onChange={(e) => setReason(e.target.value)}
                                    placeholder="Sila nyatakan sebab anda lewat..." 
                                    className="w-full p-5 bg-white rounded-[24px] text-sm font-medium border border-red-100 focus:ring-4 focus:ring-red-50 outline-none shadow-sm text-slate-700 placeholder:text-slate-300"
                                    rows={2}
                                    required
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* 2. OUTSTATION FORM */}
                {status === AttendanceStatus.OUTSTATION && (
                    <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-blue-100/50 border border-white mb-6 space-y-4">
                         <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2 mb-1 block">Jenis Urusan</label>
                            <div className="flex bg-slate-100 p-1 rounded-xl mb-3">
                                <button type="button" onClick={() => setOutstationType('RASMI')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${outstationType === 'RASMI' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Rasmi</button>
                                <button type="button" onClick={() => setOutstationType('TIDAK_RASMI')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${outstationType === 'TIDAK_RASMI' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Tidak Rasmi</button>
                            </div>
                         </div>
                         
                         <select value={outstationCategory} onChange={(e) => setOutstationCategory(e.target.value)} className="w-full bg-slate-50 px-5 py-4 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100">
                            {(outstationType === 'RASMI' ? settings?.outstationTypes : settings?.outstationUnofficialTypes)?.map((t, i) => <option key={i} value={t}>{t}</option>)}
                         </select>
                         <input type="text" placeholder="Tajuk Urusan" value={outstationTitle} onChange={(e) => setOutstationTitle(e.target.value)} className="w-full bg-slate-50 px-5 py-4 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-slate-300" />
                         <input type="text" placeholder="Lokasi" value={outstationLocation} onChange={(e) => setOutstationLocation(e.target.value)} className="w-full bg-slate-50 px-5 py-4 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-slate-300" />
                         
                         {/* REMOVED: Google Drive Link Button for Outstation */}
                    </div>
                )}

                {/* 3. LEAVE FORM */}
                {status === AttendanceStatus.LEAVE && (
                    <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-rose-100/50 border border-white mb-6 space-y-4">
                         <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2 mb-1 block">Jenis Cuti</label>
                            <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="w-full bg-slate-50 px-5 py-4 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-rose-100">
                                {settings?.leaveTypes.map((t, i) => <option key={i} value={t}>{t}</option>)}
                            </select>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2 mb-1 block">Mula</label>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-50 px-4 py-4 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-rose-100" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2 mb-1 block">Tamat</label>
                                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-slate-50 px-4 py-4 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-rose-100" />
                            </div>
                         </div>
                         
                         {/* UPDATED: Local File Upload for Leave */}
                         <div className="mt-2">
                             <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-rose-200 rounded-[24px] cursor-pointer bg-rose-50 hover:bg-rose-100 transition-colors group">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <div className="bg-white p-2 rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                                        <Upload size={20} className="text-rose-500" />
                                    </div>
                                    <p className="text-[10px] text-rose-500 font-bold uppercase tracking-wide text-center px-4 leading-tight">
                                        {fileName !== 'Tiada fail dipilih' ? (
                                            <span className="text-rose-700 break-all line-clamp-2">{fileName}</span>
                                        ) : (
                                            'Muat Naik Dokumen/Sijil'
                                        )}
                                    </p>
                                </div>
                                <input type="file" className="hidden" onChange={handleFileChange} accept="image/*,application/pdf" />
                             </label>
                         </div>
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={loading || (status === AttendanceStatus.WORKING && (!gpsData || (settings && gpsData.dist > settings.radiusMeter)))}
                    className="w-full bg-[#0f172a] hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-6 rounded-[30px] shadow-2xl shadow-slate-300 transition-all transform active:scale-[0.98] text-xs tracking-[0.2em] uppercase flex items-center justify-center gap-3"
                >
                     {loading ? (
                         <span className="flex items-center gap-2">
                             <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                             Memproses...
                         </span>
                     ) : (
                         status === AttendanceStatus.WORKING ? 'PUNCH IN SEKARANG' : 'HANTAR REKOD'
                     )}
                </button>
              </form>
            </div>
        )}
      </div>
    </div>
  );
};
