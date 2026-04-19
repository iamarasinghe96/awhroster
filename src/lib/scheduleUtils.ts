import { format, parseISO, eachDayOfInterval, startOfMonth, endOfMonth, getDay } from "date-fns";
import type { Shift, Doctor, ShiftType } from "./types";
import { v4 as uuidv4 } from "uuid";

export function calculateHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff > 0 ? diff / 60 : 0;
}

export function formatHours(hours: number): string {
  if (hours === 0) return "-";
  return hours % 1 === 0 ? `${hours}h` : `${hours.toFixed(1)}h`;
}

export function shiftLabel(type: ShiftType, startTime: string, endTime: string): string {
  if (type === "off") return "OFF";
  if (type === "request_off") return "Request OFF";
  if (type === "public_holiday") return "PH";
  return `${startTime.replace(":", ":")}–${endTime.replace(":", ":")}`;
}

export function getDoctorTotalHours(shifts: Shift[], doctorId: string): number {
  return shifts
    .filter((s) => s.doctorId === doctorId && !["off", "request_off", "public_holiday"].includes(s.type))
    .reduce((acc, s) => acc + calculateHours(s.startTime, s.endTime), 0);
}

export function getDoctorShiftsForMonth(
  shifts: Shift[],
  doctorId: string,
  yearMonth: string
): Shift[] {
  return shifts.filter(
    (s) => s.doctorId === doctorId && s.date.startsWith(yearMonth)
  );
}

export function createShift(
  doctorId: string,
  date: string,
  unit: string,
  type: ShiftType = "day",
  startTime = "08:00",
  endTime = "17:00"
): Shift {
  return {
    id: uuidv4(),
    doctorId,
    date,
    startTime,
    endTime,
    type,
    unit,
  };
}

export function getWeeklyAverageHours(shifts: Shift[], doctorId: string, yearMonth: string): number {
  const monthShifts = getDoctorShiftsForMonth(shifts, doctorId, yearMonth);
  const total = getDoctorTotalHours(monthShifts, doctorId);
  const [year, month] = yearMonth.split("-").map(Number);
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(new Date(year, month - 1));
  const days = eachDayOfInterval({ start, end });
  const weeks = days.length / 7;
  return Math.round((total / weeks) * 10) / 10;
}

export function generateICalContent(shifts: Shift[], doctor: Doctor): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AWH Roaster//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${doctor.name} - Roster`,
    "X-WR-TIMEZONE:Australia/Sydney",
  ];

  for (const shift of shifts) {
    if (["off", "request_off"].includes(shift.type)) continue;
    const dateStr = shift.date.replace(/-/g, "");
    const startStr = `${dateStr}T${shift.startTime.replace(":", "")}00`;
    const endStr = `${dateStr}T${shift.endTime.replace(":", "")}00`;
    const hours = calculateHours(shift.startTime, shift.endTime);
    const summary =
      shift.type === "public_holiday"
        ? `Public Holiday - ${shift.unit}`
        : `${shift.type === "day" ? "Day" : shift.type === "evening" ? "Evening" : shift.type === "oncall" ? "On-Call" : "Short"} Shift – ${shift.unit}`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:${shift.id}@awhroaster`,
      `DTSTART;TZID=Australia/Sydney:${startStr}`,
      `DTEND;TZID=Australia/Sydney:${endStr}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${doctor.name}\\n${shift.unit}\\n${hours}h`,
      "LOCATION:Albury Base Hospital",
      `LAST-MODIFIED:${new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15)}Z`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function generateDoctorCSV(shifts: Shift[], doctor: Doctor): string {
  const header = "Date,Day,Start Time,End Time,Hours,Unit,Type,Notes";
  const rows = shifts
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => {
      const d = parseISO(s.date);
      const hours =
        ["off", "request_off", "public_holiday"].includes(s.type)
          ? 0
          : calculateHours(s.startTime, s.endTime);
      return [
        format(d, "dd/MM/yyyy"),
        format(d, "EEEE"),
        s.startTime,
        s.endTime,
        hours,
        s.unit,
        s.type.replace("_", " "),
        s.notes ?? "",
      ].join(",");
    });
  return [header, ...rows].join("\n");
}

export function generateAdminCSV(shifts: Shift[], doctors: Doctor[]): string {
  const header = "Doctor,Role,Unit,Date,Day,Start Time,End Time,Hours,Type,Notes";
  const rows = shifts
    .sort((a, b) => a.date.localeCompare(b.date) || a.doctorId.localeCompare(b.doctorId))
    .map((s) => {
      const doctor = doctors.find((d) => d.id === s.doctorId);
      if (!doctor) return null;
      const d = parseISO(s.date);
      const hours =
        ["off", "request_off", "public_holiday"].includes(s.type)
          ? 0
          : calculateHours(s.startTime, s.endTime);
      return [
        `"${doctor.name}"`,
        doctor.role,
        doctor.unit,
        format(d, "dd/MM/yyyy"),
        format(d, "EEEE"),
        s.startTime,
        s.endTime,
        hours,
        s.type.replace("_", " "),
        s.notes ?? "",
      ].join(",");
    })
    .filter(Boolean);
  return [header, ...rows].join("\n");
}
