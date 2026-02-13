
export interface User {
  email: string;
  name: string;
  position: string;
  photo: string;
  isAdmin: 'YES' | 'NO';
  role?: string;
  jobGrade?: string;
  appointmentDate?: string;
  password?: string;
  phoneNumber?: string; 
  customClockIn?: string; // Masa Masuk Individu
  customClockOut?: string; // Masa Keluar Individu
}

export enum AttendanceStatus {
  WORKING = 'BEKERJA',
  OUTSTATION = 'URUSAN LUAR',
  LEAVE = 'CUTI',
  NONE = 'BELUM LOGIN'
}

export interface AttendanceRecord {
  id: string;
  email: string;
  name: string;
  date: string;
  timeIn: string;
  timeOut?: string;
  status: AttendanceStatus;
  reason?: string;
  location?: string;
  outstationType?: 'RASMI' | 'TIDAK_RASMI'; 
  leaveType?: string; 
  document?: string; 
  deviceType?: string; // New field for device tracking
}

export interface StaffMember {
  name: string;
  email: string;
  position: string;
  role: string;
  photo: string;
  status: AttendanceStatus;
  isAdmin: 'YES' | 'NO'; 
  outstationType?: 'RASMI' | 'TIDAK_RASMI'; 
  leaveType?: string; 
  phoneNumber?: string;
  customClockIn?: string; 
  customClockOut?: string; 
}

export interface DashboardStats {
  working: number;
  outOfficial: number;
  outUnofficial: number;
  leave: number;
  pending: number;
}

export interface RoleTimeSetting {
  [key: string]: string; 
}

export interface SystemSettings {
  targetLat: number;
  targetLon: number;
  radiusMeter: number;
  clockInTime: string; 
  clockOutTime: string; 
  schoolHolidayMode: boolean; 
  leaveTypes: string[]; 
  outstationTypes: string[]; 
  outstationUnofficialTypes: string[]; 
  roleClockInTimes: RoleTimeSetting; 
  roleClockOutTimes: RoleTimeSetting; 
}
