
import React, { useEffect, useState } from 'react';
import { User, AttendanceRecord, SystemSettings } from '../types';
import { api } from '../services/mockApi';
import { LogOut, Clock, CalendarCheck, User as UserIcon, Settings, Edit3, X, Save, Camera, Lock, Upload, FileText, Smartphone, Tablet, Monitor } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProfileProps {
  user: User;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
}

export const Profile: React.FC<ProfileProps> = ({ user, onLogout, onUpdateUser }) => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  
  const POSITIONS = ['GURU BESAR', 'PENOLONG KANAN', 'GURU', 'AKP', 'GURU PELATIH'];

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<User>({ ...user });
  const [saving, setSaving] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const data = await api.getHistory(user.email);
      
      // Sort strictly by Date and Time Descending (Newest First)
      // This guarantees that when a new record comes in, it sits at index 0
      const sortedData = data.sort((a, b) => {
        const timeA = new Date(`${a.date} ${a.timeIn}`).getTime();
        const timeB = new Date(`${b.date} ${b.timeIn}`).getTime();
        return timeB - timeA;
      });

      // LIMIT TO 5: Strictly slice the top 5 records.
      // This automatically removes the 6th (oldest of the set) when a new one is added.
      setHistory(sortedData.slice(0, 5)); 
      
      const s = await api.getSettings();
      setSettings(s);

      const today = new Date().toISOString().split('T')[0];
      const todayRec = data.find(r => r.date === today);
      if (todayRec) setTodayRecord(todayRec);
    };
    fetchData();
  }, [user.email]);

  const getTimeColor = (timeStr: string | undefined, type: 'IN' | 'OUT') => {
      if (!settings || !timeStr) return 'text-black'; 

      const userRole = user.role || user.position || 'GURU'; 
      const targetTimeStr = type === 'IN'
          ? (settings.roleClockInTimes[userRole] || settings.roleClockInTimes['GURU'] || settings.clockInTime)
          : (settings.roleClockOutTimes[userRole] || settings.roleClockOutTimes['GURU'] || settings.clockOutTime);

      if(!targetTimeStr) return 'text-black';

      try {
          const [tHour, tMin] = targetTimeStr.split(':').map(Number);
          const targetMinutes = tHour * 60 + tMin;

          const [time, modifier] = timeStr.split(' ');
          let [hours, minutes] = time.split(':');
          let h = parseInt(hours, 10);
          if (h === 12 && modifier === 'AM') h = 0;
          if (h !== 12 && modifier === 'PM') h += 12;
          const actualMinutes = h * 60 + parseInt(minutes, 10);

          if (type === 'IN') {
              return actualMinutes > targetMinutes ? 'text-red-600' : 'text-green-600';
          } else {
              return actualMinutes < targetMinutes ? 'text-red-600' : 'text-green-600';
          }
      } catch (e) {
          return 'text-black';
      }
  };

  const handleEditClick = () => {
      setEditForm({ ...user });
      setShowPasswordInput(false);
      setIsEditing(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setEditForm(prev => ({ ...prev, photo: reader.result as string }));
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
          const res = await api.updateProfile(editForm);
          if (res.success) {
              onUpdateUser(res.user);
              alert("Profil berjaya dikemaskini!");
              setIsEditing(false); 
          }
      } catch (error) {
          alert("Gagal mengemaskini profil.");
      } finally {
          setSaving(false);
      }
  };

  // Helper to render device icon
  const renderDeviceIcon = (deviceType?: string) => {
      const className = "text-slate-300";
      const size = 12;
      switch (deviceType) {
          case 'Mobile': return <Smartphone size={size} className={className} />;
          case 'Tablet': return <Tablet size={size} className={className} />;
          case 'PC': return <Monitor size={size} className={className} />;
          default: return null;
      }
  };

  return (
    <div className="min-h-screen">
      <div className="h-48 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-b-[40px] relative">
        <div className="absolute top-4 right-4">
             <button onClick={onLogout} className="text-white/80 hover:text-white bg-white/10 p-2 rounded-full backdrop-blur-sm">
                <LogOut size={20} />
             </button>
        </div>
      </div>

      <div className="px-6 -mt-20 pb-24 max-w-lg mx-auto">
        <div className="bg-white rounded-3xl shadow-xl p-6 text-center relative z-10">
          <div className="w-28 h-28 mx-auto -mt-20 mb-4 p-1 bg-white rounded-full shadow-lg relative">
             <img src={user.photo} alt={user.name} className="w-full h-full object-cover rounded-full" />
          </div>
          
          <h1 className="text-xl font-bold text-gray-800">{user.name}</h1>
          <p className="text-sm text-gray-500 font-medium">{user.position} {user.jobGrade ? `(${user.jobGrade})` : ''}</p>
          <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 text-xs rounded-full mt-2 border border-indigo-100">
            {user.email}
          </span>

          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100">
            <div className="text-center border-r border-gray-100">
                <p className="text-xs text-black mb-1">Check-In Hari Ini</p>
                <p className={`text-lg font-bold flex justify-center items-center gap-1 ${todayRecord && todayRecord.status === 'BEKERJA' ? getTimeColor(todayRecord.timeIn, 'IN') : 'text-gray-400'}`}>
                    <Clock size={16} />
                    {todayRecord && todayRecord.status === 'BEKERJA' ? todayRecord.timeIn : '--:--'}
                </p>
            </div>
            <div className="text-center">
                <p className="text-xs text-black mb-1">Status</p>
                <p className="text-lg font-bold text-black">
                    {todayRecord ? (todayRecord.status === 'BEKERJA' ? 'HADIR' : todayRecord.status) : 'PENDING'}
                </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
            <button 
                onClick={handleEditClick}
                className="flex-1 bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-center gap-2 text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
                <Edit3 size={18} />
                <span className="text-sm font-medium">Kemaskini Profil</span>
            </button>
            
            <button onClick={onLogout} className="flex-1 bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 transition-colors">
                <LogOut size={18} />
                <span className="text-sm font-medium">Log Keluar</span>
            </button>
        </div>

        <div className="mt-6 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText size={16} className="text-indigo-600"/> Maklumat Perkhidmatan
            </h3>
            <div className="space-y-4">
                <div className="border-b border-gray-50 pb-2">
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Nama Penuh</label>
                    <p className="text-sm font-bold text-gray-800">{user.name}</p>
                </div>
                <div className="border-b border-gray-50 pb-2">
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">No. Telefon</label>
                    <p className="text-sm font-bold text-gray-800">{user.phoneNumber || '-'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 border-b border-gray-50 pb-2">
                     <div>
                        <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Jawatan</label>
                        <p className="text-sm font-bold text-gray-800">{user.position}</p>
                     </div>
                     <div>
                        <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Gred</label>
                        <p className="text-sm font-bold text-gray-800">{user.jobGrade || '-'}</p>
                     </div>
                </div>
                <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Tarikh Lantikan Pertama</label>
                    <p className="text-sm font-bold text-gray-800">{user.appointmentDate || '-'}</p>
                </div>
            </div>
        </div>

        <div className="mt-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CalendarCheck className="text-indigo-600" />
                Aktiviti Terkini
            </h3>
            
            <div className="space-y-3">
                {history.length > 0 ? (
                    history.map((item) => (
                        <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-50 flex justify-between items-center animate-slide-up">
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-10 rounded-full ${item.status === 'BEKERJA' ? 'bg-green-400' : 'bg-blue-400'}`}></div>
                                <div>
                                    <p className="font-bold text-gray-700 text-sm">{item.date}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <p className="text-[10px] text-gray-400 font-medium uppercase">{item.status}</p>
                                        {item.deviceType && (
                                            <>
                                                <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                                                <div className="flex items-center gap-1">
                                                    {renderDeviceIcon(item.deviceType)}
                                                    <span className="text-[9px] text-slate-300 font-bold uppercase tracking-tighter">{item.deviceType}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`block font-bold text-sm ${item.status === 'BEKERJA' ? getTimeColor(item.timeIn, 'IN') : 'text-gray-400'}`}>
                                    {item.status === 'BEKERJA' ? `IN: ${item.timeIn}` : ''}
                                </span>
                                {item.timeOut && item.status === 'BEKERJA' && (
                                    <span className={`block text-[10px] font-bold mt-0.5 ${getTimeColor(item.timeOut, 'OUT')}`}>
                                        OUT: {item.timeOut}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 text-gray-400">Tiada rekod dijumpai.</div>
                )}
            </div>
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm">
            <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                    <h3 className="font-bold text-lg text-gray-800">Kemaskini Profil</h3>
                    <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="flex flex-col items-center justify-center mb-6">
                        <div className="relative w-24 h-24 mb-3">
                            <img src={editForm.photo} className="w-full h-full rounded-full object-cover border-4 border-gray-50 shadow-sm" alt="Profile" />
                            <label className="absolute bottom-0 right-0 bg-indigo-600 p-2 rounded-full text-white cursor-pointer hover:bg-indigo-700 shadow-md">
                                <Camera size={16} />
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={handleFileChange} 
                                />
                            </label>
                        </div>
                        <p className="text-xs text-gray-400">Ketuk ikon kamera untuk tukar gambar</p>
                    </div>

                    <div className="border-t border-b border-gray-50 py-4">
                        {!showPasswordInput ? (
                             <button 
                                type="button"
                                onClick={() => setShowPasswordInput(true)}
                                className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                             >
                                <Lock size={18} />
                                Tukar Kata Laluan
                             </button>
                        ) : (
                            <div className="animate-fade-in">
                                <label className="block text-xs font-bold text-gray-900 uppercase mb-1">Kata Laluan Baru</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="password"
                                        value={editForm.password || ''} 
                                        onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                                        className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-200 text-gray-900 border border-gray-200"
                                        placeholder="Masukkan kata laluan baru"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPasswordInput(false)}
                                        className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700"
                                    >
                                        Batal
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-900 uppercase mb-1">Nama Penuh</label>
                        <input 
                            type="text"
                            value={editForm.name} 
                            onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                            className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-200 text-gray-900 border border-gray-200"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-900 uppercase mb-1">Emel Delima (ID Pengguna)</label>
                        <input 
                            type="email"
                            value={user.email} 
                            readOnly
                            className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm outline-none text-gray-500 cursor-not-allowed border border-gray-200"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-900 uppercase mb-1">No. Telefon</label>
                        <input 
                            type="tel"
                            value={editForm.phoneNumber || ''} 
                            onChange={(e) => setEditForm({...editForm, phoneNumber: e.target.value})}
                            className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-200 text-gray-900 border border-gray-200"
                            placeholder="Contoh: 012-3456789"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-900 uppercase mb-1">Jawatan</label>
                            <select 
                                value={editForm.position} 
                                onChange={(e) => setEditForm({...editForm, position: e.target.value})}
                                className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-200 text-gray-900 border border-gray-200"
                            >
                                {POSITIONS.map(pos => (
                                    <option key={pos} value={pos}>{pos}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-900 uppercase mb-1">Gred</label>
                            <input 
                                type="text"
                                value={editForm.jobGrade || ''} 
                                onChange={(e) => setEditForm({...editForm, jobGrade: e.target.value})}
                                className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-200 text-gray-900 border border-gray-200"
                                placeholder="Contoh: DG44"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-900 uppercase mb-1">Tarikh Lantikan Pertama</label>
                        <input 
                            type="date"
                            value={editForm.appointmentDate || ''} 
                            onClick={(e) => (e.target as HTMLInputElement).showPicker()}
                            onChange={(e) => setEditForm({...editForm, appointmentDate: e.target.value})}
                            className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-200 text-gray-900 border border-gray-200 cursor-pointer"
                        />
                    </div>

                    <div className="pt-4 pb-2">
                        <button 
                            type="submit" 
                            disabled={saving}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                        >
                            {saving ? 'Menyimpan...' : (
                                <>
                                    <Save size={18} /> Simpan Perubahan
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
