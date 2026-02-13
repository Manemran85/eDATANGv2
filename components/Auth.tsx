
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/mockApi';
import { ArrowRight, User as UserIcon, Mail, ShieldCheck, LogIn } from 'lucide-react';

interface AuthProps {
  onLogin: (user: User) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Device Accounts State (Loaded from LocalStorage)
  const [deviceAccounts, setDeviceAccounts] = useState<User[]>([]);

  useEffect(() => {
      // 1. Sync users from cloud immediately on mount
      api.syncUsersFromCloud().then(() => {
          // 2. Then load from local storage
          const storedUsers = localStorage.getItem('skpk_users');
          if (storedUsers) {
              try {
                  const parsed = JSON.parse(storedUsers);
                  if (Array.isArray(parsed)) {
                      setDeviceAccounts(parsed);
                  }
              } catch (e) {
                  console.error("Error reading device accounts", e);
              }
          }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await api.login(email, password);
      if (res.success && res.user) {
        onLogin(res.user);
      } else {
        alert(res.message || 'Log masuk gagal. Sila semak emel atau kata laluan. (Default: 123456)');
      }
    } catch (error) {
      alert('Ralat sistem berlaku.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-slate-50 overflow-hidden">
      
      {/* BRANDING PANEL */}
      <div className="w-full md:w-1/2 bg-[#0f172a] text-white p-8 md:p-12 flex flex-col justify-between relative overflow-hidden min-h-[35vh] md:min-h-screen shrink-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10 flex flex-col h-full justify-center">
            <div className="flex items-center gap-4 mb-8">
                <div className="bg-white p-2 rounded-2xl shadow-xl">
                    <img src="https://i.ibb.co/FbdxdqGc/skpk.png" alt="Logo" className="w-12 h-12 object-contain" />
                </div>
                <div>
                    <h2 className="font-extrabold text-xl tracking-tight leading-none">SK PEKAN KIMANIS</h2>
                    <p className="text-indigo-400 text-[10px] font-bold tracking-[0.2em] mt-1 uppercase">Papar, Sabah</p>
                </div>
            </div>
            
            <div className="mb-6">
                <h1 className="text-4xl md:text-6xl font-black leading-[1.1] mb-6">
                    Sistem Pengurusan <br/>
                    <span className="text-indigo-400">Kehadiran Staf.</span>
                </h1>
                <p className="text-slate-400 text-sm md:text-lg max-w-sm font-medium leading-relaxed opacity-90">
                    Sistem pengurusan kehadiran pintar berasaskan lokasi dan identiti digital.
                </p>
            </div>
        </div>

        <div className="relative z-10 text-[10px] text-slate-500 font-bold tracking-widest hidden md:block">
            © 2026 SKPK CLOUD • VERSION 2.5.0
        </div>
      </div>

      {/* FORM PANEL */}
      <div className="w-full md:w-1/2 bg-white flex flex-col justify-center p-6 md:p-20 -mt-8 md:mt-0 rounded-t-[40px] md:rounded-none z-20 shadow-2xl md:shadow-none h-full md:h-auto pb-8">
         <div className="max-w-md mx-auto w-full">
            
            <div className="mb-10">
                <h2 className="text-3xl font-black text-slate-900 mb-2">
                    Log Masuk.
                </h2>
                <p className="text-slate-500 font-medium">Sila masukkan ID Delima dan kata laluan anda.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Emel Delima</label>
                    <input
                        type="email"
                        required
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 text-slate-900 border border-slate-50 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none transition-all font-bold text-sm"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nama@moe-dl.edu.my"
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Kata Laluan</label>
                    <input
                        type="password"
                        required
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 text-slate-900 border border-slate-50 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none transition-all font-bold text-sm"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-100 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 mt-4 uppercase tracking-widest text-xs"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <>
                        Log Masuk Sistem 
                        <ArrowRight size={16} strokeWidth={3} />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-8 text-center border-b-4 border-slate-50 pb-6">
                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                    Akses Terhad untuk Staf SKPK Sahaja
                 </p>
            </div>

         </div>
      </div>

    </div>
  );
};
