
import React from 'react';
import { NavLink } from 'react-router-dom';
import { PieChart, Fingerprint, Users, User, Plus } from 'lucide-react';

interface NavProps {
  isAdmin: boolean;
}

export const Navigation: React.FC<NavProps> = ({ isAdmin }) => {
  return (
    <>
      {/* Mobile Bottom Nav - Floating Pill Design */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[400px] z-50">
        <div className="bg-[#0f172a] text-slate-400 rounded-full shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] h-[72px] flex justify-between items-center px-6 relative border border-slate-800">
            
            {/* Left Items */}
            <div className="flex gap-8">
                <NavLink to="/" className={({ isActive }) => `flex flex-col items-center justify-center gap-1 transition-all duration-300 ${isActive ? 'text-white -translate-y-1' : 'hover:text-slate-200'}`}>
                    <PieChart size={20} strokeWidth={2.5} />
                    <span className="text-[10px] font-medium tracking-wide">Utama</span>
                </NavLink>
                <NavLink to="/history" className={({ isActive }) => `flex flex-col items-center justify-center gap-1 transition-all duration-300 ${isActive ? 'text-white -translate-y-1' : 'hover:text-slate-200'}`}>
                    <Fingerprint size={20} strokeWidth={2.5} />
                    <span className="text-[10px] font-medium tracking-wide">Rekod</span>
                </NavLink>
            </div>

            {/* Center FAB - Positioned absolute to float */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-8">
                <NavLink to="/clockin">
                    <div className="w-[64px] h-[64px] bg-[#6366f1] rounded-full border-[6px] border-[#f3f4f6] flex items-center justify-center shadow-[0_10px_25px_-5px_rgba(99,102,241,0.6)] transform active:scale-90 transition-all hover:bg-[#4f46e5]">
                        <Plus size={28} color="white" strokeWidth={3} />
                    </div>
                </NavLink>
            </div>

            {/* Right Items */}
            <div className="flex gap-8">
                <NavLink to="/directory" className={({ isActive }) => `flex flex-col items-center justify-center gap-1 transition-all duration-300 ${isActive ? 'text-white -translate-y-1' : 'hover:text-slate-200'}`}>
                    <Users size={20} strokeWidth={2.5} />
                    <span className="text-[10px] font-medium tracking-wide">Staf</span>
                </NavLink>
                <NavLink to="/profile" className={({ isActive }) => `flex flex-col items-center justify-center gap-1 transition-all duration-300 ${isActive ? 'text-white -translate-y-1' : 'hover:text-slate-200'}`}>
                    <User size={20} strokeWidth={2.5} />
                    <span className="text-[10px] font-medium tracking-wide">Profil</span>
                </NavLink>
            </div>

        </div>
      </div>
      
      {/* Desktop Sidebar */}
      <div className="hidden md:flex fixed left-0 top-0 h-full w-20 flex-col items-center py-8 bg-[#0f172a] text-gray-400 z-50 shadow-sm">
             <div className="mb-8 w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">SK</div>
             
             <div className="flex flex-col gap-8 w-full">
                <NavLink to="/" className={({ isActive }) => `flex flex-col items-center p-2 transition-colors ${isActive ? 'text-white border-l-4 border-indigo-500 bg-white/10' : 'hover:text-white'}`}><PieChart size={24} /><span className="text-[10px] mt-1">Utama</span></NavLink>
                <NavLink to="/history" className={({ isActive }) => `flex flex-col items-center p-2 transition-colors ${isActive ? 'text-white border-l-4 border-indigo-500 bg-white/10' : 'hover:text-white'}`}><Fingerprint size={24} /><span className="text-[10px] mt-1">Rekod</span></NavLink>
                <NavLink to="/clockin" className={({ isActive }) => `flex flex-col items-center p-2 transition-colors ${isActive ? 'text-white border-l-4 border-indigo-500 bg-white/10' : 'hover:text-white'}`}><Plus size={24} /><span className="text-[10px] mt-1">Hadir</span></NavLink>
                <NavLink to="/directory" className={({ isActive }) => `flex flex-col items-center p-2 transition-colors ${isActive ? 'text-white border-l-4 border-indigo-500 bg-white/10' : 'hover:text-white'}`}><Users size={24} /><span className="text-[10px] mt-1">Staf</span></NavLink>
                <NavLink to="/profile" className={({ isActive }) => `flex flex-col items-center p-2 transition-colors ${isActive ? 'text-white border-l-4 border-indigo-500 bg-white/10' : 'hover:text-white'}`}><User size={24} /><span className="text-[10px] mt-1">Profil</span></NavLink>
             </div>
      </div>
    </>
  );
};
