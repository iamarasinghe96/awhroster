import type { CalendarEvent } from "./types";
import { getDay } from "date-fns";
import { parseISO } from "date-fns";

export let APP_EVENTS: CalendarEvent[] = [];

export function updateEvents(list: CalendarEvent[]): void {
  APP_EVENTS = list;
}

export function getEventsForDay(dateStr: string): CalendarEvent[] {
  const dow = getDay(parseISO(dateStr));
  return APP_EVENTS.filter((e) => {
    if (e.recurrence === "weekly") return e.dayOfWeek === dow;
    if (e.recurrence === "specific") return e.dates?.includes(dateStr) ?? false;
    return false;
  });
}

export function getEventsForDayAndRole(dateStr: string, role: string): CalendarEvent[] {
  return getEventsForDay(dateStr).filter(
    (e) => e.recipients === "all" || e.recipients === role
  );
}
