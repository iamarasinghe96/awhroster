import type { Holiday } from "./types";

export const NSW_PUBLIC_HOLIDAYS: Holiday[] = [
  // 2026
  { date: "2026-01-01", name: "New Year's Day" },
  { date: "2026-01-26", name: "Australia Day" },
  { date: "2026-04-03", name: "Good Friday" },
  { date: "2026-04-04", name: "Easter Saturday" },
  { date: "2026-04-05", name: "Easter Sunday" },
  { date: "2026-04-06", name: "Easter Monday" },
  { date: "2026-04-25", name: "Anzac Day" },
  { date: "2026-04-27", name: "Anzac Day (Additional Day)" },
  { date: "2026-06-08", name: "King's Birthday" },
  { date: "2026-08-03", name: "Bank Holiday" },
  { date: "2026-10-05", name: "Labour Day" },
  { date: "2026-12-25", name: "Christmas Day" },
  { date: "2026-12-26", name: "Boxing Day" },
  { date: "2026-12-28", name: "Boxing Day (Additional Day)" },
  // 2027
  { date: "2027-01-01", name: "New Year's Day" },
  { date: "2027-01-26", name: "Australia Day" },
  { date: "2027-03-26", name: "Good Friday" },
  { date: "2027-03-27", name: "Easter Saturday" },
  { date: "2027-03-28", name: "Easter Sunday" },
  { date: "2027-03-29", name: "Easter Monday" },
  { date: "2027-04-25", name: "Anzac Day" },
  { date: "2027-04-26", name: "Anzac Day (Additional Day)" },
  { date: "2027-06-14", name: "King's Birthday" },
  { date: "2027-08-02", name: "Bank Holiday" },
  { date: "2027-10-04", name: "Labour Day" },
  { date: "2027-12-25", name: "Christmas Day" },
  { date: "2027-12-26", name: "Boxing Day" },
  { date: "2027-12-27", name: "Christmas Day (Additional Day)" },
  { date: "2027-12-28", name: "Boxing Day (Additional Day)" },
];

export function getHoliday(dateStr: string): Holiday | undefined {
  return NSW_PUBLIC_HOLIDAYS.find((h) => h.date === dateStr);
}

export function isHoliday(dateStr: string): boolean {
  return NSW_PUBLIC_HOLIDAYS.some((h) => h.date === dateStr);
}

export function getHolidaysForMonth(yearMonth: string): Holiday[] {
  return NSW_PUBLIC_HOLIDAYS.filter((h) => h.date.startsWith(yearMonth));
}
