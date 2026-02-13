
import React, { useEffect, useState } from 'react';
import { User, SystemSettings, StaffMember, AttendanceRecord } from '../types';
import { api } from '../services/mockApi';
import { ShieldCheck, Plus, X, Search, Umbrella, Trash, Edit2, MapPin, Clock, AlertTriangle, Save, UserPlus, Camera, FileText, Calendar, Briefcase, UserMinus, Settings, Map, Bell, List, Trash2, RefreshCw } from 'lucide-react';

export const AdminDashboard: React.FC<{ currentUser: User }> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'warga' | 'sistem'>('warga');
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [searchWarga, setSearchWarga] = useState('');
  
  const POSITIONS = ['GURU BESAR', 'PENOLONG KANAN', 'GURU', 'AKP', 'GURU PELATIH'];

  // Add Staff State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<User>({
      name: '',
      email: '',
      position: 'GURU',
      photo: `https://ui-avatars.com/api/?name=New+Staff&background=random`,
      isAdmin: 'NO',
      password: '123456'
  });

  // Settings State for New Role
  const [newRoleName, setNewRoleName] = useState('');

  // UI States
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; data: StaffMember | null }>({ isOpen: false, data: null });
  const [deleteRoleModal, setDeleteRoleModal] = useState<{ isOpen: boolean; role: string | null }>({ isOpen: false, role: null });
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  // Individual Time Setting State
  const [individualTimeModal, setIndividualTimeModal] = useState<{ isOpen: boolean; staff: StaffMember | null }>({ isOpen: false, staff: null });
  const [timeForm, setTimeForm] = useState({ customClockIn: '', customClockOut: '' });

  useEffect(() => {
    loadData();

    // LIVE: Auto-refresh data every 20 seconds to see latest status
    const interval = setInterval(() => {
        loadData(true);
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  const loadData = async (background = false) => {
    if (!background) setLoading(true);
    else setIsRefreshing(true);

    try {
        if (background) await api.syncFromCloud(); // Fetch latest from cloud in background
        const s = await api.getSettings();
        setSettings(s);
        const staff = await api.getStaff();
        setStaffList(staff);
    } catch(e) {
        console.error(e);
    } finally {
        if (!background) setLoading(false);
        else setIsRefreshing(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
          const res = await api.register({ ...addForm, password: '123456' });
          if (res.success) {
              await loadData();
              setShowAddModal(false);
              setAddForm({
                name: '',
                email: '',
                position: 'GURU',
                photo: `https://ui-avatars.com/api/?name=New+Staff&background=random`,
                isAdmin: 'NO',
                password: '123456'
              });
              alert("Staf baharu berjaya didaftarkan! Kata laluan lalai: 123456");
          } else {
              alert(res.message || "Pendaftaran gagal.");
          }
      } catch (err) {
          alert("Ralat sistem.");
      } finally {
          setLoading(false);
      }
  };

  const handleConfirmDelete = async () => {
      if (!deleteModal.data) return;
      setLoading(true);
      try {
          const success = await api.deleteUser(deleteModal.data.email);
          if (success) {
              await loadData();
              setDeleteModal({ isOpen: false, data: null });
          } else {
              alert("Gagal memadam staf.");
          }
      } catch (err) {
          alert("Ralat berlaku semasa memadam.");
      } finally {
          setLoading(false);
      }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, mode: 'ADD' | 'EDIT') => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              if (mode === 'ADD') {
                  setAddForm(prev => ({ ...prev, photo: reader.result as string }));
              } else if (editingStaff) {
                  setEditingStaff(prev => prev ? ({ ...prev, photo: reader.result as string }) : null);
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingStaff) return;
      setLoading(true);
      try {
          const success = await api.adminUpdateUser(editingStaff.email, {
              name: editingStaff.name,
              position: editingStaff.position,
              isAdmin: editingStaff.isAdmin,
              photo: editingStaff.photo
          });
          if (success) {
              await loadData();
              setEditingStaff(null);
              alert("Maklumat staf berjaya dikemaskini.");
          }
      } catch (err) {
          alert("Gagal mengemaskini maklumat staf.");
      } finally {
          setLoading(false);
      }
  };

  const openTimeModal = (staff: StaffMember) => {
      setTimeForm({
          customClockIn: staff.customClockIn || '',
          customClockOut: staff.customClockOut || ''
      });
      setIndividualTimeModal({ isOpen: true, staff });
  };

  const handleSaveIndividualTime = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!individualTimeModal.staff) return;
      setLoading(true);
      try {
          // If empty string, send undefined to remove the custom time
          const updates = {
              customClockIn: timeForm.customClockIn || undefined,
              customClockOut: timeForm.customClockOut || undefined
          };
          
          const success = await api.adminUpdateUser(individualTimeModal.staff.email, updates);
          
          if (success) {
              await loadData();
              setIndividualTimeModal({ isOpen: false, staff: null });
              alert("Waktu kerja individu berjaya dikemaskini.");
          }
      } catch (err) {
          alert("Gagal mengemaskini waktu kerja.");
      } finally {
          setLoading(false);
      }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setLoading(true);
    try {
        const success = await api.updateSettings(settings);
        if (success) {
            alert("Tetapan sistem berjaya dikemaskini!");
        }
    } catch (err) {
        alert("Gagal mengemaskini tetapan.");
    } finally {
        setLoading(false);
    }
  };

  const handleAddRole = () => {
      if (!newRoleName.trim() || !settings) return;
      
      const role = newRoleName.trim().toUpperCase();
      
      if (settings.roleClockInTimes[role]) {
          alert("Jawatan ini sudah wujud.");
          return;
      }

      const updatedSettings = { ...settings };
      // Set default times
      updatedSettings.roleClockInTimes = { ...updatedSettings.roleClockInTimes, [role]: "07:30" };
      updatedSettings.roleClockOutTimes = { ...updatedSettings.roleClockOutTimes, [role]: "16:30" };
      
      setSettings(updatedSettings);
      setNewRoleName('');
  };

  const initiateDeleteRole = (role: string) => {
      setDeleteRoleModal({ isOpen: true, role });
  };

  const executeDeleteRole = () => {
      if (!settings || !deleteRoleModal.role) return;
      
      const roleToDelete = deleteRoleModal.role;
      const updatedSettings = { ...settings };
      const newIn = { ...updatedSettings.roleClockInTimes };
      const newOut = { ...updatedSettings.roleClockOutTimes };
      
      delete newIn[roleToDelete];
      delete newOut[roleToDelete];

      updatedSettings.roleClockInTimes = newIn;
      updatedSettings.roleClockOutTimes = newOut;
      setSettings(updatedSettings);
      setDeleteRoleModal({ isOpen: false, role: null });
  };

  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(searchWarga.toLowerCase()) || 
    s.email.toLowerCase().includes(searchWarga.toLowerCase())
  );

  return (
    <div className="min-h-screen px-4 py-8 max-w-lg mx-auto pb-32 bg-[#f8f9fc]">
      
      {/* HEADER CARD */}
      <div className="bg-white rounded-[32px] p-6 shadow-sm mb-6">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <ShieldCheck size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-[#0f172a]">Panel Pentadbir</h2>
                    <p className="text-xs text-gray-400 font-medium">Pengurusan sistem dan staf sekolah</p>
                </div>
            </div>
            {isRefreshing && <RefreshCw size={16} className="text-indigo-400 animate-spin mt-2" />}
          </div>

          <div className="flex bg-[#f1f5f9] p-1.5 rounded-2xl">
              <button 
                onClick={() => setActiveTab('warga')}
                className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${activeTab === 'warga' ? 'bg-[#0f172a] text-white shadow-md' : 'text-gray-400'}`}
              >
                  PENGURUSAN STAF
              </button>
              <button 
                onClick={() => setActiveTab('sistem')}
                className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${activeTab === 'sistem' ? 'bg-[#0f172a] text-white shadow-md' : 'text-gray-400'}`}
              >
                  TETAPAN SISTEM
              </button>
          </div>
      </div>

      {activeTab === 'warga' && (
          <div className="animate-fade-in space-y-4">
              <div className="flex gap-3">
                  <div className="relative flex-1">
                      <Search className="absolute left-5 top-4 text-gray-400" size={20} />
                      <input 
                        type="text" 
                        placeholder="Cari staf..." 
                        value={searchWarga}
                        onChange={(e) => setSearchWarga(e.target.value)}
                        className="w-full bg-white pl-14 pr-5 py-4 rounded-3xl text-sm font-bold text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-400"
                      />
                  </div>
                  <button 
                    onClick={() => setShowAddModal(true)}
                    className="w-14 h-14 bg-indigo-600 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-90"
                  >
                      <UserPlus size={24} />
                  </button>
              </div>

              <div className="space-y-4">
                  {filteredStaff.map((staff, idx) => (
                      <div key={idx} className="bg-white rounded-[32px] p-6 shadow-sm flex flex-col items-center text-center relative border border-transparent hover:border-indigo-100 transition-all">
                          {/* Admin Indicator (Left) */}
                          <div className="absolute top-4 left-4">
                              {staff.isAdmin === 'YES' && <ShieldCheck size={18} className="text-indigo-600" />}
                          </div>

                          {/* Status Dot */}
                          <div className={`absolute top-4 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full ${
                              staff.status === 'BEKERJA' ? 'bg-green-500' :
                              staff.status === 'CUTI' ? 'bg-pink-500' :
                              staff.status === 'URUSAN LUAR' ? 'bg-blue-500' : 'bg-slate-300'
                          }`}></div>

                          {/* Individual Time Setting Button (Top Right - Clock Icon) */}
                          <button
                                onClick={() => openTimeModal(staff)}
                                className={`absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center transition-all ${staff.customClockIn ? 'bg-indigo-600 text-white shadow-md' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                                title="Tetapkan Masa Individu"
                          >
                                <Clock size={16} />
                          </button>

                          <img src={staff.photo} className="w-20 h-20 rounded-2xl mb-3 object-cover shadow-md" alt={staff.name} />
                          <h3 className="font-bold text-gray-800 text-sm leading-tight">{staff.name.toUpperCase()}</h3>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{staff.position}</span>
                          
                          {/* Indicator if custom time is set */}
                          {staff.customClockIn && (
                              <span className="mt-2 text-[9px] font-bold text-white bg-indigo-500 px-2 py-0.5 rounded">
                                  Khas: {staff.customClockIn}
                              </span>
                          )}

                          <div className="flex w-full gap-2 mt-4">
                              <button onClick={() => setEditingStaff(staff)} className="flex-1 py-3 bg-[#f8fafc] text-slate-900 rounded-xl text-[10px] font-bold uppercase hover:bg-slate-100 transition-colors">Kemaskini</button>
                              
                              {staff.email !== currentUser.email && (
                                <button 
                                    onClick={() => setDeleteModal({ isOpen: true, data: staff })}
                                    className="w-12 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                                >
                                    <Trash size={16} />
                                </button>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {activeTab === 'sistem' && settings && (
          <div className="animate-fade-in space-y-6">
              <form onSubmit={handleUpdateSettings} className="space-y-6">
                  
                  {/* LOKASI GEOFENCE (Warna Putih dengan Teks Gelap) */}
                  <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 text-slate-900">
                      <h3 className="text-sm font-bold uppercase tracking-[0.2em] mb-6 flex items-center gap-3 text-indigo-600">
                          <Map size={20} /> Parameter Lokasi
                      </h3>
                      <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Latitud</label>
                                  <input 
                                      type="number" step="any"
                                      value={settings.targetLat}
                                      onChange={(e) => setSettings({...settings, targetLat: parseFloat(e.target.value)})}
                                      className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
                                  />
                              </div>
                              <div>
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Longitud</label>
                                  <input 
                                      type="number" step="any"
                                      value={settings.targetLon}
                                      onChange={(e) => setSettings({...settings, targetLon: parseFloat(e.target.value)})}
                                      className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
                                  />
                              </div>
                          </div>
                          <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Radius Kehadiran (Meter)</label>
                              <div className="flex items-center gap-4">
                                  <input 
                                      type="range" min="50" max="1000" step="50"
                                      value={settings.radiusMeter}
                                      onChange={(e) => setSettings({...settings, radiusMeter: parseInt(e.target.value)})}
                                      className="flex-1 accent-indigo-600"
                                  />
                                  <span className="w-16 text-center font-black text-xl text-indigo-600">{settings.radiusMeter}m</span>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* WAKTU OPERASI (Kontras: Putih Box, Teks Gelap) */}
                  <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
                      <h3 className="text-sm font-bold uppercase tracking-[0.2em] mb-6 flex items-center gap-3 text-slate-900">
                          <Clock size={20} className="text-indigo-600" /> Waktu Bekerja Rasmi
                      </h3>
                      <div className="space-y-6">
                          {Object.keys(settings.roleClockInTimes).map((role) => (
                              <div key={role} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative group">
                                  <div className="flex justify-between items-center mb-3">
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{role}</p>
                                    <button 
                                        type="button"
                                        onClick={() => initiateDeleteRole(role)}
                                        className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                        title="Padam masa jawatan ini"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                      <div>
                                          <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Waktu Masuk</label>
                                          <input 
                                              type="time"
                                              value={settings.roleClockInTimes[role]}
                                              onChange={(e) => setSettings({
                                                  ...settings, 
                                                  roleClockInTimes: { ...settings.roleClockInTimes, [role]: e.target.value }
                                              })}
                                              className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm font-bold text-slate-900"
                                          />
                                      </div>
                                      <div>
                                          <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Waktu Keluar</label>
                                          <input 
                                              type="time"
                                              value={settings.roleClockOutTimes[role]}
                                              onChange={(e) => setSettings({
                                                  ...settings, 
                                                  roleClockOutTimes: { ...settings.roleClockOutTimes, [role]: e.target.value }
                                              })}
                                              className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm font-bold text-slate-900"
                                          />
                                      </div>
                                  </div>
                              </div>
                          ))}
                          
                          {/* INPUT TAMBAH JAWATAN BARU */}
                          <div className="pt-4 border-t border-slate-100">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Tambah Jawatan & Masa</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text"
                                        value={newRoleName}
                                        onChange={(e) => setNewRoleName(e.target.value)}
                                        placeholder="Nama Jawatan (Contoh: SATPAM)"
                                        className="flex-1 bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100 uppercase"
                                    />
                                    <button 
                                        type="button"
                                        onClick={handleAddRole}
                                        disabled={!newRoleName.trim()}
                                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-100"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                          </div>
                      </div>
                  </div>

                  {/* MOD CUTI SEKOLAH (Kontras: Merah/Pink Box) */}
                  <div className={`rounded-[32px] p-8 shadow-lg transition-all duration-500 ${settings.schoolHolidayMode ? 'bg-pink-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                              <Bell size={20} />
                              <div>
                                  <h3 className="text-sm font-bold uppercase tracking-widest">Mod Cuti Sekolah</h3>
                                  <p className="text-[10px] opacity-80 font-medium">Aktifkan untuk menutup amaran lewat.</p>
                              </div>
                          </div>
                          <button 
                              type="button"
                              onClick={() => setSettings({...settings, schoolHolidayMode: !settings.schoolHolidayMode})}
                              className={`w-14 h-8 rounded-full relative transition-colors ${settings.schoolHolidayMode ? 'bg-white' : 'bg-slate-300'}`}
                          >
                              <div className={`absolute top-1 w-6 h-6 rounded-full transition-all ${settings.schoolHolidayMode ? 'right-1 bg-pink-600' : 'left-1 bg-white'}`}></div>
                          </button>
                      </div>
                  </div>

                  {/* KATEGORI (Kontras: Indigo Box) */}
                  <div className="bg-indigo-900 rounded-[32px] p-8 shadow-xl text-white">
                      <h3 className="text-sm font-bold uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                          <List size={20} /> Senarai Kategori
                      </h3>
                      <div className="space-y-6">
                          {/* 1. URUSAN RASMI (ATAS) */}
                          <div>
                              <label className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest block mb-2">Jenis Urusan Rasmi (Asingkan dengan koma)</label>
                              <textarea 
                                  value={settings.outstationTypes.join(', ')}
                                  onChange={(e) => setSettings({...settings, outstationTypes: e.target.value.split(',').map(s => s.trim())})}
                                  className="w-full bg-indigo-950 border-none px-4 py-3 rounded-2xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-indigo-400 min-h-[100px]"
                                  placeholder="Contoh: MESYUARAT, KURSUS, SEMINAR"
                              ></textarea>
                          </div>

                          {/* 2. URUSAN TIDAK RASMI (TENGAH) */}
                          <div>
                              <label className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest block mb-2">Jenis Urusan Tidak Rasmi (Asingkan dengan koma)</label>
                              <textarea 
                                  value={settings.outstationUnofficialTypes.join(', ')}
                                  onChange={(e) => setSettings({...settings, outstationUnofficialTypes: e.target.value.split(',').map(s => s.trim())})}
                                  className="w-full bg-indigo-950 border-none px-4 py-3 rounded-2xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-indigo-400 min-h-[100px]"
                                  placeholder="Contoh: RAWATAN DOKTOR, URUSAN BANK"
                              ></textarea>
                          </div>

                          {/* 3. JENIS CUTI (BAWAH SEKALI) */}
                          <div>
                              <label className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest block mb-2">Jenis Cuti (Asingkan dengan koma)</label>
                              <textarea 
                                  value={settings.leaveTypes.join(', ')}
                                  onChange={(e) => setSettings({...settings, leaveTypes: e.target.value.split(',').map(s => s.trim())})}
                                  className="w-full bg-indigo-950 border-none px-4 py-3 rounded-2xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-indigo-400 min-h-[100px]"
                                  placeholder="Contoh: CUTI REHAT KHAS, CUTI SAKIT"
                              ></textarea>
                          </div>
                      </div>
                  </div>

                  <button 
                      type="submit" 
                      disabled={loading}
                      className="w-full bg-[#0f172a] hover:bg-slate-800 text-white font-black py-6 rounded-[30px] shadow-2xl transition-all transform active:scale-95 flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-xs"
                  >
                      {loading ? 'Sila Tunggu...' : (
                          <>
                              <Save size={18} /> Simpan Semua Tetapan
                          </>
                      )}
                  </button>
              </form>
          </div>
      )}

      {/* MODAL: INDIVIDUAL TIME SETTING */}
      {individualTimeModal.isOpen && individualTimeModal.staff && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-fade-in">
              <div className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl animate-scale-up">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                         <Clock className="text-indigo-600" size={24} /> Waktu Khas
                     </h3>
                     <button onClick={() => setIndividualTimeModal({isOpen: false, staff: null})} className="p-2 bg-slate-50 text-slate-400 hover:text-red-500 rounded-full transition-colors">
                         <X size={20} />
                     </button>
                  </div>
                  
                  <div className="mb-6 flex items-center gap-4 bg-slate-50 p-4 rounded-2xl">
                       <img src={individualTimeModal.staff.photo} className="w-12 h-12 rounded-xl object-cover" alt="Staff" />
                       <div>
                           <p className="font-bold text-sm text-slate-900">{individualTimeModal.staff.name}</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase">{individualTimeModal.staff.position}</p>
                       </div>
                  </div>

                  <form onSubmit={handleSaveIndividualTime}>
                      <div className="space-y-4 mb-8">
                          <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1.5 block">Waktu Masuk Khas</label>
                              <input 
                                  type="time" 
                                  value={timeForm.customClockIn}
                                  onChange={(e) => setTimeForm({...timeForm, customClockIn: e.target.value})}
                                  className="w-full bg-slate-50 px-5 py-4 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100"
                              />
                          </div>
                          <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1.5 block">Waktu Keluar Khas</label>
                              <input 
                                  type="time" 
                                  value={timeForm.customClockOut}
                                  onChange={(e) => setTimeForm({...timeForm, customClockOut: e.target.value})}
                                  className="w-full bg-slate-50 px-5 py-4 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100"
                              />
                          </div>
                          <p className="text-[10px] text-gray-400 text-center italic">Biarkan kosong untuk ikut masa jawatan.</p>
                      </div>

                      <div className="flex flex-col gap-3">
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-5 rounded-2xl shadow-xl shadow-indigo-100 transition-all transform active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                        >
                            {loading ? 'Menyimpan...' : 'Simpan Tetapan'}
                        </button>
                        <button 
                            type="button"
                            onClick={() => setTimeForm({ customClockIn: '', customClockOut: '' })}
                            className="w-full bg-slate-100 text-slate-500 font-bold py-3 rounded-2xl uppercase tracking-widest text-[10px] hover:bg-slate-200"
                        >
                            Reset ke Default
                        </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* MODAL: PADAM STAF */}
      {deleteModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-fade-in">
              <div className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl animate-scale-up text-center">
                  <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <UserMinus size={36} className="text-red-500" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Padam Akaun Staf?</h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-8 px-2">
                      Adakah anda pasti ingin memadam <span className="font-bold text-gray-900">{deleteModal.data?.name}</span>? Tindakan ini tidak boleh dibatalkan.
                  </p>
                  <div className="flex flex-col gap-3">
                      <button 
                          onClick={handleConfirmDelete}
                          disabled={loading}
                          className="w-full py-5 bg-gradient-to-r from-[#ef4444] to-[#e11d48] text-white font-bold rounded-2xl shadow-lg shadow-red-200 uppercase tracking-widest text-xs transition-transform active:scale-95"
                      >
                          {loading ? 'Sila Tunggu...' : 'Ya, Padam Akaun'}
                      </button>
                      <button 
                          onClick={() => setDeleteModal({ isOpen: false, data: null })}
                          className="w-full py-5 bg-gray-50 text-gray-400 font-bold rounded-2xl uppercase tracking-widest text-xs hover:bg-gray-100 transition-colors"
                      >
                          Batal
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: PADAM PERANAN (JAWATAN) */}
      {deleteRoleModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-fade-in">
              <div className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl animate-scale-up text-center">
                  <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <AlertTriangle size={36} className="text-amber-500" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Padam Tetapan Jawatan?</h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-8 px-2">
                      Adakah anda pasti ingin memadam masa bekerja untuk jawatan <span className="font-bold text-gray-900">{deleteRoleModal.role}</span>?
                  </p>
                  <div className="flex flex-col gap-3">
                      <button 
                          onClick={executeDeleteRole}
                          className="w-full py-5 bg-gradient-to-r from-[#ef4444] to-[#e11d48] text-white font-bold rounded-2xl shadow-lg shadow-red-200 uppercase tracking-widest text-xs transition-transform active:scale-95"
                      >
                          Ya, Padam Tetapan
                      </button>
                      <button 
                          onClick={() => setDeleteRoleModal({ isOpen: false, role: null })}
                          className="w-full py-5 bg-gray-50 text-gray-400 font-bold rounded-2xl uppercase tracking-widest text-xs hover:bg-gray-100 transition-colors"
                      >
                          Batal
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: TAMBAH STAF BAHARU */}
      {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-fade-in">
             <div className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto no-scrollbar">
                 <div className="flex justify-between items-center mb-8">
                    <h3 className="font-bold text-2xl text-slate-900 tracking-tight flex items-center gap-2">
                        <UserPlus className="text-indigo-600" size={24} /> Daftar Staf
                    </h3>
                    <button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-50 text-slate-400 hover:text-red-500 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                 </div>

                 <form onSubmit={handleAddStaff} className="space-y-6">
                    <div className="flex flex-col items-center mb-4">
                        <div className="relative group">
                            <img src={addForm.photo} className="w-28 h-28 rounded-[36px] object-cover border-4 border-slate-50 shadow-md transition-transform group-hover:scale-105" alt="Preview" />
                            <label className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2.5 rounded-2xl shadow-lg cursor-pointer hover:bg-indigo-700 active:scale-90 transition-all">
                                <Camera size={18} />
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, 'ADD')} />
                            </label>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">Ketuk Ikon Untuk Gambar</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1.5 block">Nama Penuh</label>
                            <input 
                                type="text" 
                                required
                                value={addForm.name}
                                onChange={(e) => setAddForm({...addForm, name: e.target.value})}
                                placeholder="Contoh: Ahmad bin Abu"
                                className="w-full bg-slate-50 px-5 py-4 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1.5 block">Emel Delima (ID)</label>
                            <input 
                                type="email" 
                                required
                                value={addForm.email}
                                onChange={(e) => setAddForm({...addForm, email: e.target.value})}
                                placeholder="g-12345678@moe-dl.edu.my"
                                className="w-full bg-slate-50 px-5 py-4 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1.5 block">Jawatan</label>
                                <select 
                                    value={addForm.position}
                                    onChange={(e) => setAddForm({...addForm, position: e.target.value})}
                                    className="w-full bg-slate-50 px-4 py-4 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100"
                                >
                                    {POSITIONS.map(pos => (
                                        <option key={pos} value={pos}>{pos}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1.5 block">Akses Admin</label>
                                <select 
                                    value={addForm.isAdmin}
                                    onChange={(e) => setAddForm({...addForm, isAdmin: e.target.value as 'YES' | 'NO'})}
                                    className="w-full bg-slate-50 px-4 py-4 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100"
                                >
                                    <option value="NO">TIDAK</option>
                                    <option value="YES">YA</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-5 rounded-2xl shadow-xl shadow-indigo-100 transition-all transform active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                    >
                        {loading ? 'Sila Tunggu...' : 'Daftar Staf'}
                    </button>
                 </form>
             </div>
          </div>
      )}

      {/* EDIT STAFF MODAL */}
      {editingStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
             <div className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl scale-100 animate-slide-up max-h-[90vh] overflow-y-auto no-scrollbar">
                 <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                    <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2 tracking-tight">
                        <Edit2 className="text-indigo-600" size={20} />
                        Kemaskini Staf
                    </h3>
                    <button onClick={() => setEditingStaff(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSaveStaff} className="space-y-6">
                    <div className="flex flex-col items-center mb-2">
                        <div className="relative group">
                            <img src={editingStaff.photo} className="w-24 h-24 rounded-[32px] object-cover border-4 border-slate-50 shadow-md transition-transform group-hover:scale-105" alt="Preview" />
                            <label className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2 rounded-xl shadow-lg cursor-pointer hover:bg-indigo-700 active:scale-90 transition-all">
                                <Camera size={14} />
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, 'EDIT')} />
                            </label>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1 mb-1 block">Nama Penuh</label>
                            <input 
                                type="text" 
                                value={editingStaff.name}
                                onChange={(e) => setEditingStaff({...editingStaff, name: e.target.value})}
                                className="w-full bg-[#f8fafc] px-5 py-4 rounded-2xl text-sm font-bold text-slate-900 border border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1 mb-1 block">Jawatan</label>
                            <select
                                value={editingStaff.position}
                                onChange={(e) => setEditingStaff({...editingStaff, position: e.target.value})}
                                className="w-full bg-[#f8fafc] px-5 py-4 rounded-2xl text-sm font-bold text-slate-900 border border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                            >
                                {POSITIONS.map(pos => (
                                    <option key={pos} value={pos}>{pos}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1 mb-1 block">Akses Pentadbir</label>
                            <select
                                value={editingStaff.isAdmin}
                                onChange={(e) => setEditingStaff({...editingStaff, isAdmin: e.target.value as 'YES' | 'NO'})}
                                className="w-full bg-[#f8fafc] px-5 py-4 rounded-2xl text-sm font-bold text-slate-900 border border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                            >
                                <option value="NO">TIDAK</option>
                                <option value="YES">YA</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                         <button 
                            type="button"
                            onClick={() => setEditingStaff(null)}
                            className="flex-1 py-4 rounded-2xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors uppercase tracking-widest text-[10px]"
                         >
                             Batal
                         </button>
                         <button 
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-4 rounded-2xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors flex items-center justify-center gap-2 uppercase tracking-widest text-[10px]"
                         >
                             {loading ? '...' : 'Simpan'}
                         </button>
                    </div>
                </form>
             </div>
          </div>
      )}
    </div>
  );
};
