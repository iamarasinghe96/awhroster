import type { Doctor, MonthlySchedule } from "./types";

const BASE = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
const DOCTORS_KEY = "awhroaster-doctors";
const scheduleKey = (m: string) => `awhroaster-schedule-${m}`;

async function fetchJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, { cache: "no-cache" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function localGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

function localSet(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function localRemove(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key);
}

export async function loadDoctors(): Promise<Doctor[]> {
  const remote = await fetchJSON<{ doctors: Doctor[] }>("/data/doctors.json");
  if (remote?.doctors) {
    localSet(DOCTORS_KEY, remote.doctors);
    return remote.doctors;
  }
  return localGet<Doctor[]>(DOCTORS_KEY) ?? [];
}

export function saveDoctorsLocal(doctors: Doctor[]): void {
  localSet(DOCTORS_KEY, doctors);
}

export async function loadSchedule(month: string): Promise<MonthlySchedule> {
  const empty: MonthlySchedule = { month, lastModified: "", shifts: [] };

  const remote = await fetchJSON<MonthlySchedule>(
    `/data/schedules/${month}.json`
  );
  const local = localGet<MonthlySchedule>(scheduleKey(month));

  if (remote && (!local || remote.lastModified >= (local.lastModified ?? ""))) {
    localSet(scheduleKey(month), remote);
    return remote;
  }
  return local ?? empty;
}

export function saveScheduleLocal(schedule: MonthlySchedule): void {
  localSet(scheduleKey(schedule.month), {
    ...schedule,
    lastModified: new Date().toISOString(),
  });
}

export function clearScheduleLocal(month: string): void {
  localRemove(scheduleKey(month));
}

export function exportScheduleJSON(schedule: MonthlySchedule): void {
  const blob = new Blob([JSON.stringify(schedule, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${schedule.month}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportDoctorsJSON(doctors: Doctor[]): void {
  const blob = new Blob([JSON.stringify({ doctors }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "doctors.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
