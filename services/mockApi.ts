
import { User, AttendanceRecord, AttendanceStatus, StaffMember, DashboardStats, SystemSettings } from '../types';

// STORAGE KEYS
const KEY_USERS = 'skpk_users';
const KEY_HISTORY = 'skpk_history';
const KEY_SETTINGS = 'skpk_settings';

// CLOUD CONFIGURATION
const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSqlt8hHRNb92vCW2gILJQILKP9rY2N--6RoF8SdV8i1ELioKDq5dv6G-E1SzvmiXdW7FC8SRpwczhl/pub?output=csv";
const GOOGLE_SHEET_STAFF_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSqlt8hHRNb92vCW2gILJQILKP9rY2N--6RoF8SdV8i1ELioKDq5dv6G-E1SzvmiXdW7FC8SRpwczhl/pub?output=csv"; 

// PASTE URL GOOGLE APPS SCRIPT WEB APP ANDA DI SINI
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwpjXwdasQ-lmrze321eDID14PMSjiTUOdbU0AREKx0t9jX1RCQsuq-xnEU0iKVPFgf5w/exec"; 

const GOOGLE_DRIVE_FOLDER_ID = "1TIqfGG-4w14nR_w5iEcCQd0nhzmFd2nC";
export const GOOGLE_DRIVE_URL = `https://drive.google.com/drive/folders/${GOOGLE_DRIVE_FOLDER_ID}?usp=sharing`;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// HELPER: SAFE LOCAL STORAGE PARSER
const safeJSONParse = <T>(key: string, fallback: T): T => {
    const data = localStorage.getItem(key);
    if (!data) return fallback;
    try {
        return JSON.parse(data);
    } catch (e) {
        console.warn(`Data corrupted for ${key}, resetting.`);
        localStorage.removeItem(key);
        return fallback;
    }
};

// HELPER: SEND DATA TO GOOGLE SHEET
const postToCloud = async (action: string, payload: any) => {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes("https://script.google.com/macros/s/AKfycby8Jc_xHth6ZO1gdvnZgzei_9sJ_a9yDa8Uka69QaPp-X6BPKHFjoD43xiDULlLC4ZD9A/exec")) {
        // console.warn("Sila masukkan URL Google Apps Script dalam services/mockApi.ts untuk membolehkan simpanan Cloud.");
        return;
    }
    
    // Check if online before attempting fetch to avoid "Failed to fetch" errors
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        console.log("Offline: Skipping cloud sync.");
        return;
    }
    
    try {
        // mode: 'no-cors' diperlukan untuk menghantar data ke Google Apps Script dari browser
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', 
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action,
                ...payload
            })
        });
        console.log(`Cloud Sync Sent: ${action}`);
    } catch (e) {
        // Use warn instead of error to prevent "Uncaught" noise in console
        console.warn("Cloud Sync Warning (non-critical):", e);
    }
};

const getUsers = (): User[] => safeJSONParse(KEY_USERS, []);

const saveUsers = (users: User[]) => {
    localStorage.setItem(KEY_USERS, JSON.stringify(users));
};

const getHistoryData = (): AttendanceRecord[] => safeJSONParse(KEY_HISTORY, []);

const saveHistoryData = (history: AttendanceRecord[]) => {
    localStorage.setItem(KEY_HISTORY, JSON.stringify(history));
};

const DEFAULT_SETTINGS: SystemSettings = {
  targetLat: 5.614738,
  targetLon: 115.889279,
  radiusMeter: 300,
  clockInTime: "07:30",
  clockOutTime: "14:00",
  schoolHolidayMode: false,
  leaveTypes: [
    "CUTI REHAT KHAS", "CUTI REHAT", "CUTI SAKIT", "CUTI BERSALIN", 
    "CUTI BERPANTANG", "CUTI KUARANTIN", "CUTI UMRAH", "CUTI HAJI", "CUTI TANPA REKOD"
  ],
  outstationTypes: [
    "MESYUARAT", "KURSUS", "SEMINAR", "BENGKEL", "TAKLIMAT", 
    "PERKHEMAHAN", "PLC", "LADAP", "URUSAN GURU BESAR"
  ],
  outstationUnofficialTypes: [
      "RAWATAN DOKTOR", "KECEMASAN KELUARGA", "URUSAN BANK", "TEMUJANJI KHAS", 
      "MENGANTAR ANAK", "URUSAN PERIBADI", "LAIN-LAIN"
  ],
  roleClockInTimes: {
    "GURU BESAR": "08:30",
    "GURU": "07:30",
    "AKP": "08:30"
  },
  roleClockOutTimes: {
    "GURU BESAR": "16:00",
    "GURU": "14:30",
    "AKP": "17:00"
  }
};

export const api = {
  syncFromCloud: async (): Promise<{ success: boolean; count: number }> => {
      try {
          if (!navigator.onLine) return { success: false, count: 0 };
          
          console.log("Fetching Attendance from:", GOOGLE_SHEET_CSV_URL);
          const response = await fetch(GOOGLE_SHEET_CSV_URL);
          if (!response.ok) throw new Error("Gagal menyambung ke Sheet Kehadiran");
          
          const text = await response.text();
          const rows = text.split('\n').map(row => row.split(',')); 
          const newRecords: AttendanceRecord[] = [];
          
          for (let i = 1; i < rows.length; i++) {
              const col = rows[i];
              if (col.length < 3) continue;

              const timestamp = col[0]?.replace(/"/g, '').trim(); 
              const email = col[1]?.replace(/"/g, '').trim();
              const name = col[2]?.replace(/"/g, '').trim();
              const statusRaw = col[3]?.replace(/"/g, '').trim().toUpperCase();
              
              let status = AttendanceStatus.WORKING;
              if (statusRaw.includes('CUTI')) status = AttendanceStatus.LEAVE;
              if (statusRaw.includes('LUAR')) status = AttendanceStatus.OUTSTATION;

              let date = new Date().toISOString().split('T')[0];
              if (timestamp) {
                  const datePart = timestamp.split(' ')[0];
                  if (datePart.includes('/')) {
                     const parts = datePart.split('/');
                     if (parts.length === 3) date = `${parts[2]}-${parts[1]}-${parts[0]}`;
                  }
              }

              const record: AttendanceRecord = {
                  id: `cloud-${i}-${date}`,
                  email: email,
                  name: name,
                  date: date,
                  timeIn: col[4]?.replace(/"/g, '').trim() || "00:00",
                  timeOut: col[5]?.replace(/"/g, '').trim(),
                  status: status,
                  reason: col[6]?.replace(/"/g, '').trim(),
                  location: (col[7] && col[8]) ? `${col[7]}, ${col[8]}` : undefined,
                  document: col[9]?.replace(/"/g, '').trim(),
                  deviceType: 'Cloud Import'
              };
              newRecords.push(record);
          }

          if (newRecords.length > 0) {
              const currentHistory = getHistoryData();
              const localOnly = currentHistory.filter(h => !h.id.startsWith('cloud-'));
              const merged = [...newRecords, ...localOnly];
              merged.sort((a,b) => b.date.localeCompare(a.date));
              saveHistoryData(merged);
              return { success: true, count: newRecords.length };
          }
          return { success: true, count: 0 };
      } catch (error) {
          console.warn("Cloud Attendance Sync Error (Offline or Blocked):", error);
          return { success: false, count: 0 };
      }
  },

  syncUsersFromCloud: async (): Promise<{ success: boolean; count: number }> => {
      try {
          if (!navigator.onLine) return { success: false, count: 0 };

          console.log("Fetching Staff from:", GOOGLE_SHEET_STAFF_URL);
          const response = await fetch(GOOGLE_SHEET_STAFF_URL);
          if (!response.ok) throw new Error("Gagal menyambung ke Sheet Staf");

          const text = await response.text();
          const rows = text.split('\n').map(row => row.split(','));
          const cloudUsers: User[] = [];

          for (let i = 1; i < rows.length; i++) {
              const col = rows[i];
              if (col.length < 2) continue; 

              const email = col[0]?.replace(/"/g, '').trim();
              if (!email || !email.includes('@')) continue;

              const name = col[1]?.replace(/"/g, '').trim();
              const position = col[2]?.replace(/"/g, '').trim() || 'GURU';
              const grade = col[3]?.replace(/"/g, '').trim();
              const phone = col[4]?.replace(/"/g, '').trim();
              const isAdmin = col[5]?.replace(/"/g, '').trim().toUpperCase() === 'YES' ? 'YES' : 'NO';
              const password = col[6]?.replace(/"/g, '').trim() || '123456';
              const customIn = col[7]?.replace(/"/g, '').trim();
              const customOut = col[8]?.replace(/"/g, '').trim();

              const newUser: User = {
                  email,
                  name,
                  position,
                  jobGrade: grade,
                  phoneNumber: phone,
                  isAdmin: isAdmin as 'YES' | 'NO',
                  password,
                  photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
                  customClockIn: customIn || undefined,
                  customClockOut: customOut || undefined
              };
              cloudUsers.push(newUser);
          }

          if (cloudUsers.length > 0) {
              const currentUsers = getUsers();
              const userMap = new Map(currentUsers.map(u => [u.email, u]));
              
              cloudUsers.forEach(cloudUser => {
                  if (userMap.has(cloudUser.email)) {
                      const existing = userMap.get(cloudUser.email)!;
                      userMap.set(cloudUser.email, { ...existing, ...cloudUser, photo: existing.photo }); 
                  } else {
                      userMap.set(cloudUser.email, cloudUser);
                  }
              });

              const mergedUsers = Array.from(userMap.values());
              saveUsers(mergedUsers);
              return { success: true, count: cloudUsers.length };
          }

          return { success: true, count: 0 };
      } catch (error) {
          console.warn("Cloud User Sync Error (Offline or Blocked):", error);
          return { success: false, count: 0 };
      }
  },

  register: async (userData: User): Promise<{ success: boolean; message?: string }> => {
      await delay(800);
      const users = getUsers();
      if (users.find(u => u.email === userData.email)) {
          return { success: false, message: 'Emel telah didaftarkan.' };
      }
      
      if (userData.email === 'g-65253270@moe-dl.edu.my' || users.length === 0) {
          userData.isAdmin = 'YES';
          if (userData.email === 'g-65253270@moe-dl.edu.my') {
              userData.name = 'ROZIMAN BIN EMRAN';
          }
      } else {
          userData.isAdmin = 'NO';
      }

      if (!userData.photo) {
          userData.photo = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=random`;
      }
      users.push(userData);
      saveUsers(users);

      // SAVE TO CLOUD SHEET
      postToCloud('REGISTER_STAFF', userData);

      return { success: true };
  },

  login: async (email: string, password?: string): Promise<{ success: boolean; user?: User; message?: string }> => {
    await delay(800);
    const users = getUsers();
    
    // BACKDOOR: Updated for ROZIMAN BIN EMRAN with password 12345
    if (email === 'g-65253270@moe-dl.edu.my' && password === '12345') {
        let adminUser = users.find(u => u.email === email);
        if (!adminUser) {
            adminUser = {
                email: email,
                name: 'ROZIMAN BIN EMRAN',
                position: 'GURU BESAR',
                photo: 'https://ui-avatars.com/api/?name=ROZIMAN+BIN+EMRAN&background=0f172a&color=fff',
                isAdmin: 'YES',
                password: '12345'
            };
            users.push(adminUser);
            saveUsers(users);
            // Also sync admin creation to cloud
            postToCloud('REGISTER_STAFF', adminUser);
        } else {
            // Force correct profile details for backdoor admin
            let changed = false;
            if (adminUser.isAdmin !== 'YES') { adminUser.isAdmin = 'YES'; changed = true; }
            if (adminUser.name !== 'ROZIMAN BIN EMRAN') { adminUser.name = 'ROZIMAN BIN EMRAN'; changed = true; }
            if (adminUser.password !== '12345') { adminUser.password = '12345'; changed = true; }
            
            if (changed) saveUsers(users);
        }
        return { success: true, user: adminUser };
    }

    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        if (user.email === 'g-65253270@moe-dl.edu.my' && user.isAdmin !== 'YES') {
            user.isAdmin = 'YES';
            saveUsers(users);
        }
        return { success: true, user };
    }
    return { success: false, message: 'Emel atau kata laluan salah.' };
  },

  updateProfile: async (updatedUser: User): Promise<{ success: boolean; user: User }> => {
      await delay(500);
      const users = getUsers();
      const index = users.findIndex(u => u.email === updatedUser.email);
      if (index !== -1) {
          if (!updatedUser.password) updatedUser.password = users[index].password;
          if (updatedUser.email === 'g-65253270@moe-dl.edu.my') {
              updatedUser.isAdmin = 'YES';
              // Allow name changes but keep admin flag
          }

          users[index] = updatedUser;
          saveUsers(users);

          // SAVE TO CLOUD SHEET
          postToCloud('UPDATE_STAFF', updatedUser);

          return { success: true, user: updatedUser };
      }
      return { success: false, user: updatedUser };
  },

  deleteUser: async (email: string): Promise<boolean> => {
      await delay(500);
      if (email === 'g-65253270@moe-dl.edu.my') return false;
      
      const users = getUsers();
      const filtered = users.filter(u => u.email !== email);
      if (filtered.length < users.length) {
          saveUsers(filtered);
          const history = getHistoryData();
          const filteredHistory = history.filter(h => h.email !== email);
          saveHistoryData(filteredHistory);

          // DELETE FROM CLOUD SHEET
          postToCloud('DELETE_STAFF', { email });

          return true;
      }
      return false;
  },

  clockIn: async (data: any): Promise<{ success: boolean; record?: AttendanceRecord }> => {
    await delay(800);
    const history = getHistoryData();
    const now = new Date();
    
    const newRecord: AttendanceRecord = {
      id: Math.random().toString(36).substr(2, 9),
      email: data.email,
      name: getUsers().find(u => u.email === data.email)?.name || 'Unknown',
      date: now.toISOString().split('T')[0],
      timeIn: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      status: data.status,
      outstationType: data.outstationType,
      leaveType: data.leaveType, 
      document: data.document,
      location: data.lat ? `${data.lat.toFixed(4)}, ${data.lon.toFixed(4)}` : undefined,
      reason: data.reason,
      deviceType: data.deviceType
    };
    
    history.unshift(newRecord);
    saveHistoryData(history);

    // SAVE CLOCK IN TO CLOUD SHEET
    postToCloud('CLOCK_IN', {
        email: newRecord.email,
        name: newRecord.name,
        status: newRecord.status,
        timeIn: newRecord.timeIn,
        timeOut: "",
        reason: newRecord.reason,
        lat: data.lat,
        lon: data.lon,
        document: newRecord.document || ""
    });

    return { success: true, record: newRecord };
  },

  getHistory: async (email: string): Promise<AttendanceRecord[]> => {
    await delay(300);
    const history = getHistoryData();
    return history.filter(h => h.email === email).sort((a,b) => b.date.localeCompare(a.date));
  },

  getAllHistory: async (): Promise<AttendanceRecord[]> => {
    await delay(300);
    const history = getHistoryData();
    return history.sort((a,b) => b.date.localeCompare(a.date));
  },

  updateAttendanceRecord: async (id: string, updates: Partial<AttendanceRecord>): Promise<boolean> => {
    await delay(300);
    const history = getHistoryData();
    const index = history.findIndex(r => r.id === id);
    if (index !== -1) {
        history[index] = { ...history[index], ...updates };
        saveHistoryData(history);
        return true;
    }
    return false;
  },

  getStaff: async (): Promise<StaffMember[]> => {
    await delay(400);
    const users = getUsers();
    const history = getHistoryData();
    const today = new Date().toISOString().split('T')[0];

    const staffList: StaffMember[] = users.map(user => {
        const todayRecord = history.find(h => h.email === user.email && h.date === today);
        return {
            name: user.name,
            email: user.email,
            position: user.position,
            role: user.role || user.position,
            photo: user.photo,
            isAdmin: user.isAdmin,
            status: todayRecord ? todayRecord.status : AttendanceStatus.NONE,
            outstationType: todayRecord?.outstationType,
            leaveType: todayRecord?.leaveType,
            phoneNumber: user.phoneNumber,
            customClockIn: user.customClockIn,
            customClockOut: user.customClockOut
        };
    });

    return staffList;
  },

  adminUpdateUser: async (email: string, updates: Partial<User>): Promise<boolean> => {
      await delay(500);
      const users = getUsers();
      const index = users.findIndex(u => u.email === email);
      if (index !== -1) {
          if (email === 'g-65253270@moe-dl.edu.my') {
              updates.isAdmin = 'YES';
          }
          const updatedUser = { ...users[index], ...updates };
          users[index] = updatedUser;
          saveUsers(users);

          // SAVE TO CLOUD SHEET
          postToCloud('UPDATE_STAFF', updatedUser);

          return true;
      }
      return false;
  },

  getDashboardStats: async (): Promise<{ stats: DashboardStats, lists: any }> => {
    await delay(500);
    const staff = await api.getStaff();
    const working = staff.filter(s => s.status === AttendanceStatus.WORKING);
    const outOfficial = staff.filter(s => s.status === AttendanceStatus.OUTSTATION && (!s.outstationType || s.outstationType === 'RASMI'));
    const outUnofficial = staff.filter(s => s.status === AttendanceStatus.OUTSTATION && s.outstationType === 'TIDAK_RASMI');
    const leave = staff.filter(s => s.status === AttendanceStatus.LEAVE);
    const pending = staff.filter(s => s.status === AttendanceStatus.NONE);

    return {
        stats: { 
            working: working.length, 
            outOfficial: outOfficial.length, 
            outUnofficial: outUnofficial.length, 
            leave: leave.length, 
            pending: pending.length 
        },
        lists: {
            working: working.map(s => ({ name: s.name, photo: s.photo, detail: 'Hadir Bertugas' })),
            out: [
              ...outOfficial.map(s => ({ name: s.name, photo: s.photo, detail: 'URUSAN RASMI' })),
              ...outUnofficial.map(s => ({ name: s.name, photo: s.photo, detail: 'URUSAN TIDAK RASMI' }))
            ],
            leave: leave.map(s => ({ name: s.name, photo: s.photo, detail: s.leaveType || 'CUTI BERREKOD' })), 
            pending: pending.map(s => ({ name: s.name, photo: s.photo, detail: 'Tiada Rekod' }))
        }
    };
  },

  getSettings: async (): Promise<SystemSettings> => {
      await delay(200);
      return safeJSONParse(KEY_SETTINGS, { ...DEFAULT_SETTINGS });
  },

  updateSettings: async (newSettings: SystemSettings): Promise<boolean> => {
      await delay(300);
      localStorage.setItem(KEY_SETTINGS, JSON.stringify(newSettings));
      return true;
  }
};
