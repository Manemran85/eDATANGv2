
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Auth } from './components/Auth';
import { Profile } from './components/Profile';
import { Dashboard } from './components/Dashboard';
import { ClockIn } from './components/ClockIn';
import { History } from './components/History';
import { Directory } from './components/Directory';
import { AdminDashboard } from './components/AdminDashboard';
import { ReportSheet } from './components/ReportSheet';
import { Navigation } from './components/Navigation';
import { User } from './types';
import { api } from './services/mockApi';

// Protected Route Wrapper
interface ProtectedRouteProps {
  children?: React.ReactNode;
  user: User | null;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, user }) => {
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  return <>{children}</>;
};

const AppContent = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Check local storage for session
    const storedSession = localStorage.getItem('userSession');
    if (storedSession) {
      try {
        const sessionUser = JSON.parse(storedSession) as User;
        
        // 1. Set user immediately to ensure access
        setUser(sessionUser);

        // 2. Try to update user data from local database (if available)
        const storedUsersStr = localStorage.getItem('skpk_users');
        if (storedUsersStr) {
          const allUsers = JSON.parse(storedUsersStr) as User[];
          const freshUser = allUsers.find(u => u.email === sessionUser.email);
          
          if (freshUser) {
            // Update session with latest data (in case name/position/admin changed)
            setUser(freshUser);
            localStorage.setItem('userSession', JSON.stringify(freshUser));
          }
          // NOTE: If user not found in local list, we DO NOT log them out.
          // We assume the session is valid until they manually logout or cloud sync updates it.
        } 
        
        // 3. BACKGROUND SYNC
        // Sync users from cloud to get latest details
        api.syncUsersFromCloud().then(() => {
             // After sync, check again if we have updates for the current user
             const updatedUsersStr = localStorage.getItem('skpk_users');
             if (updatedUsersStr) {
                const users = JSON.parse(updatedUsersStr) as User[];
                const updatedUser = users.find(u => u.email === sessionUser.email);
                if (updatedUser) {
                    setUser(updatedUser);
                    localStorage.setItem('userSession', JSON.stringify(updatedUser));
                }
             }
        });
        
        api.syncFromCloud();

      } catch (e) {
        console.error("Session corrupted", e);
        // Only logout if the session data itself is corrupted
        localStorage.removeItem('userSession');
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  // ---------------------------------------------------------------------------
  // LOGIK NOTIFIKASI LEWAT (LATE NOTIFICATION LOGIC)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!user) return;

    // Minta kebenaran notifikasi sebaik sahaja pengguna log masuk
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    const checkLateArrival = async () => {
      try {
          const now = new Date();
          const day = now.getDay();

          // 1. Semak Hari Bekerja (0 = Ahad, 6 = Sabtu). Hanya jalankan Isnin (1) - Jumaat (5)
          if (day === 0 || day === 6) return;

          // 2. Dapatkan Tetapan Sistem
          const settings = await api.getSettings();

          // 3. Jika Mod Cuti Sekolah ON, hentikan proses (tiada notifikasi)
          if (settings.schoolHolidayMode) return;

          // 4. Semak jika notifikasi sudah dihantar hari ini untuk elak spam
          const todayStr = now.toISOString().split('T')[0];
          const storageKey = `notified_late_${user.email}_${todayStr}`;
          if (sessionStorage.getItem(storageKey)) return;

          // 5. Semak Rekod Kehadiran (Adakah sudah Clock In?)
          const history = await api.getHistory(user.email);
          const hasRecord = history.find(h => h.date === todayStr);
          
          // Jika sudah ada rekod (Hadir/Cuti/Luar), tidak perlu notifikasi
          if (hasRecord) return;

          // 6. Bandingkan Masa Semasa dengan Masa Masuk Rasmi
          const userRole = user.role || user.position || 'GURU';
          // Dapatkan masa masuk ikut jawatan, atau default GURU, atau default 07:30
          const targetTimeStr = settings.roleClockInTimes[userRole] || settings.roleClockInTimes['GURU'] || "07:30";

          const [tHour, tMin] = targetTimeStr.split(':').map(Number);
          const targetTime = new Date();
          targetTime.setHours(tHour, tMin, 0, 0);

          // Jika masa sekarang melebihi waktu masuk
          if (now > targetTime) {
            const message = "SILA CLOCK IN SEKARANG, ANDA TELAH LEWAT";

            // Hantar Notifikasi
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("Sistem Kehadiran Pintar", {
                body: message,
                icon: "https://i.ibb.co/FbdxdqGc/skpk.png",
                tag: "late-notification"
              });
            } else {
              // Fallback jika notifikasi diblock atau tidak disokong
              alert(message);
            }

            // Tandakan sudah dinotifikasi hari ini dalam Session Storage
            sessionStorage.setItem(storageKey, 'true');
          }
      } catch (err) {
          // Swallow errors to prevent "Uncaught" in console during background checks
          console.warn("Background check skipped (Offline/Error):", err);
      }
    };

    // Jalankan semakan setiap 1 minit (60000ms)
    const intervalId = setInterval(checkLateArrival, 60000);
    
    // Jalankan sekali sebaik sahaja component mount
    checkLateArrival();

    return () => clearInterval(intervalId);
  }, [user]); // Re-run effect if user changes

  const handleLogin = (userData: User) => {
    localStorage.setItem('userSession', JSON.stringify(userData));
    setUser(userData);
    
    // TRIGGER AUTO-SYNC ON LOGIN
    api.syncUsersFromCloud();
    api.syncFromCloud();
  };

  const handleUpdateUser = (updatedUser: User) => {
    localStorage.setItem('userSession', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('userSession');
    setUser(null);
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-indigo-600 font-bold animate-pulse tracking-widest text-xs uppercase">Sila Tunggu...</p>
    </div>
  );

  const isAuthPage = location.pathname === '/auth';

  return (
    <div className="min-h-screen bg-gray-100 pb-32 md:pb-0 md:pl-20 transition-all duration-300">
      <Routes>
        <Route path="/auth" element={user ? <Navigate to="/" /> : <Auth onLogin={handleLogin} />} />
        
        <Route path="/" element={
          <ProtectedRoute user={user}>
            <Dashboard user={user!} />
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute user={user}>
            <Profile user={user!} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />
          </ProtectedRoute>
        } />
        
        <Route path="/clockin" element={
          <ProtectedRoute user={user}>
            <ClockIn user={user!} />
          </ProtectedRoute>
        } />

        <Route path="/history" element={
          <ProtectedRoute user={user}>
            <History user={user!} />
          </ProtectedRoute>
        } />

        <Route path="/directory" element={
          <ProtectedRoute user={user}>
            <Directory currentUser={user!} />
          </ProtectedRoute>
        } />

        <Route path="/admin" element={
          <ProtectedRoute user={user}>
            {user?.isAdmin === 'YES' || user?.email.includes('admin') ? (
              <AdminDashboard currentUser={user!} />
            ) : (
              <div className="p-8 flex flex-col items-center justify-center min-h-[80vh] text-center">
                <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m14.5 9-5 5"/><path d="m9.5 9 5 5"/></svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Akses Ditolak</h3>
                <p className="mt-2 text-gray-500 max-w-xs">Hanya Pentadbir sahaja yang mempunyai kebenaran untuk mengakses bahagian ini.</p>
                <button 
                  onClick={() => window.location.hash = '#/'}
                  className="mt-8 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 transition-transform active:scale-95"
                >
                  Kembali ke Dashboard
                </button>
              </div>
            )}
          </ProtectedRoute>
        } />

        <Route path="/sheet" element={
          <ProtectedRoute user={user}>
            {user?.isAdmin === 'YES' || user?.email.includes('admin') ? (
              <ReportSheet currentUser={user!} />
            ) : (
               <Navigate to="/" replace />
            )}
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {!isAuthPage && user && <Navigation isAdmin={user.isAdmin === 'YES' || user.email.includes('admin')} />}
    </div>
  );
};

export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}
