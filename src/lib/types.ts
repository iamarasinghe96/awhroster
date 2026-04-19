export type ShiftType =
  | "day"           // 0800-1700 (9h) - standard
  | "evening"       // 1400-2200 (8h)
  | "oncall"        // 1200-2200 (10h) - weekend on-call
  | "short"         // 0800-1200 (4h) - teaching day
  | "off"           // scheduled day off
  | "request_off"   // requested day off
  | "public_holiday"; // public holiday

export type DoctorRole = "Intern" | "HMO" | "Registrar" | "Consultant";

export interface Doctor {
  id: string;
  name: string;
  role: DoctorRole;
  unit: string;
  position?: string;
  color: string;
  email?: string;
}

export interface Shift {
  id: string;
  doctorId: string;
  date: string;      // 'YYYY-MM-DD'
  startTime: string; // 'HH:mm'
  endTime: string;   // 'HH:mm'
  type: ShiftType;
  unit: string;
  notes?: string;
}

export interface MonthlySchedule {
  month: string; // 'YYYY-MM'
  lastModified: string;
  shifts: Shift[];
}

export interface Holiday {
  date: string; // 'YYYY-MM-DD'
  name: string;
  observed?: boolean;
}

export const SHIFT_PRESETS: Record<string, { startTime: string; endTime: string; label: string; type: ShiftType }> = {
  day: { startTime: "08:00", endTime: "17:00", label: "Day (08:00–17:00)", type: "day" },
  evening: { startTime: "14:00", endTime: "22:00", label: "Evening (14:00–22:00)", type: "evening" },
  oncall: { startTime: "12:00", endTime: "22:00", label: "On-Call (12:00–22:00)", type: "oncall" },
  short: { startTime: "08:00", endTime: "12:00", label: "Short/Teaching (08:00–12:00)", type: "short" },
  off: { startTime: "00:00", endTime: "00:00", label: "Day Off", type: "off" },
  request_off: { startTime: "00:00", endTime: "00:00", label: "Request Off", type: "request_off" },
};

export const SHIFT_COLORS: Record<ShiftType, { bg: string; text: string; border: string }> = {
  day: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" },
  evening: { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-300" },
  oncall: { bg: "bg-violet-100", text: "text-violet-800", border: "border-violet-300" },
  short: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300" },
  off: { bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-200" },
  request_off: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300" },
  public_holiday: { bg: "bg-green-100", text: "text-green-800", border: "border-green-300" },
};

export const UNIT_OPTIONS = [
  "Unit 1",
  "Unit 2",
  "Unit 3",
  "Unit 4",
  "Unit 5",
  "Unit 6",
  "Oncology/HAEM",
  "ICU",
  "ED",
  "Other",
];

// Teaching sessions (auto-applied based on role)
// HMO Teaching: Every Monday 14:00-19:00
// Intern Teaching: Every Thursday 12:00-13:00
export const HMO_TEACHING_DAY = 1; // Monday (0=Sunday)
export const INTERN_TEACHING_DAY = 4; // Thursday
