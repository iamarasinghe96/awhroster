"use client";

import { useState, useEffect, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import type { Doctor, Shift, MonthlySchedule } from "@/lib/types";
import { SHIFT_COLORS } from "@/lib/types";
import { calculateHours, getDoctorTotalHours, getWeeklyAverageHours } from "@/lib/scheduleUtils";
import { getHoliday, updateHolidays } from "@/lib/holidays";
import { loadDoctors, loadSchedule, loadHolidays, downloadFile } from "@/lib/clientStorage";
import { generateICalContent, generateDoctorCSV } from "@/lib/scheduleUtils";
import HolidayBadge from "@/components/common/HolidayBadge";

interface Props {
  doctor: Doctor;
  onBack: () => void;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ShiftCell({
  shift,
  isCurrentMonth,
  coworkers,
}: {
  shift?: Shift;
  isCurrentMonth: boolean;
  coworkers?: { doctor: Doctor; shift: Shift }[];
}) {
  if (!shift) return <div className="h-full min-h-[72px]" />;

  const colors = SHIFT_COLORS[shift.type];
  const hours =
    ["off", "request_off", "public_holiday"].includes(shift.type)
      ? null
      : calculateHours(shift.startTime, shift.endTime);
  const opacity = isCurrentMonth ? "" : "opacity-40";

  if (shift.type === "off") {
    return <div className={`text-xs text-gray-400 italic mt-1 ${opacity}`}>OFF</div>;
  }
  if (shift.type === "request_off") {
    return (
      <div className={`mt-1 text-xs rounded px-1 py-0.5 bg-orange-50 text-orange-600 border border-orange-200 ${opacity}`}>
        Request OFF
      </div>
    );
  }

  return (
    <div className={`mt-1 rounded-md px-2 py-1 border text-xs ${colors.bg} ${colors.text} ${colors.border} ${opacity}`}>
      <div className="font-semibold">
        {shift.startTime}–{shift.endTime}
      </div>
      {hours && <div>{hours}h</div>}
      <div className="truncate text-[10px] opacity-80">{shift.unit}</div>
      {shift.notes && <div className="truncate text-[10px] italic">{shift.notes}</div>}
      {coworkers && coworkers.length > 0 && (
        <div className="mt-1 pt-1 border-t border-current/20">
          <div className="text-[9px] font-semibold opacity-50 mb-0.5 uppercase tracking-wide">
            Working with
          </div>
          {coworkers.slice(0, 4).map(({ doctor: d, shift: s }) => (
            <div key={d.id} className="flex items-center gap-1 text-[10px] opacity-75 truncate">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: d.color }}
              />
              <span className="truncate font-medium">{d.name.split(" ").slice(0, 2).join(" ")}</span>
              <span className="opacity-60 flex-shrink-0">({s.startTime}–{s.endTime})</span>
            </div>
          ))}
          {coworkers.length > 4 && (
            <div className="text-[10px] opacity-50">+{coworkers.length - 4} more</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DoctorCalendar({ doctor, onBack }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<Record<string, MonthlySchedule>>({});
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  const monthKey = format(currentDate, "yyyy-MM");
  const prevMonthKey = format(subMonths(currentDate, 1), "yyyy-MM");
  const nextMonthKey = format(addMonths(currentDate, 1), "yyyy-MM");

  const fetchMonth = useCallback(
    async (key: string) => {
      if (schedules[key]) return;
      const data = await loadSchedule(key);
      setSchedules((prev) => ({ ...prev, [key]: data }));
    },
    [schedules]
  );

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchMonth(prevMonthKey),
      fetchMonth(monthKey),
      fetchMonth(nextMonthKey),
    ]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey]);

  useEffect(() => {
    loadDoctors().then(setAllDoctors);
    loadHolidays().then((h) => { if (h.length) updateHolidays(h); });
  }, []);

  const getAllShifts = (): Shift[] => [
    ...(schedules[prevMonthKey]?.shifts ?? []),
    ...(schedules[monthKey]?.shifts ?? []),
    ...(schedules[nextMonthKey]?.shifts ?? []),
  ];

  const getShiftForDay = (dateStr: string, doctorId: string): Shift | undefined =>
    getAllShifts().find((s) => s.doctorId === doctorId && s.date === dateStr);

  const toMins = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const getOverlappingCoworkers = (dateStr: string, myShift: Shift): { doctor: Doctor; shift: Shift }[] => {
    const myStart = toMins(myShift.startTime);
    const myEnd = toMins(myShift.endTime);
    return getAllShifts()
      .filter((s) => {
        if (s.date !== dateStr || s.doctorId === doctor.id) return false;
        if (["off", "request_off", "public_holiday"].includes(s.type)) return false;
        if (s.unit !== myShift.unit) return false;
        const start = toMins(s.startTime);
        const end = toMins(s.endTime);
        return start < myEnd && end > myStart;
      })
      .map((s) => ({ doctor: allDoctors.find((d) => d.id === s.doctorId)!, shift: s }))
      .filter((x) => x.doctor);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calDays = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(monthEnd),
  });

  const currentShifts = (schedules[monthKey]?.shifts ?? []).filter(
    (s) => s.doctorId === doctor.id
  );
  const totalHours = getDoctorTotalHours(currentShifts, doctor.id);
  const avgWeekly = getWeeklyAverageHours(
    schedules[monthKey]?.shifts ?? [],
    doctor.id,
    monthKey
  );

  const handleExportICal = () => {
    const allShifts = getAllShifts().filter((s) => s.doctorId === doctor.id);
    const content = generateICalContent(allShifts, doctor);
    downloadFile(
      content,
      `${doctor.name.replace(/\s+/g, "_")}_roster.ics`,
      "text/calendar; charset=utf-8"
    );
  };

  const handleExportCSV = () => {
    const content = generateDoctorCSV(currentShifts, doctor);
    downloadFile(
      content,
      `${doctor.name.replace(/\s+/g, "_")}_${monthKey}.csv`,
      "text/csv; charset=utf-8"
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-slate-500 hover:text-slate-800 text-sm flex items-center gap-1"
            >
              ← Back
            </button>
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: doctor.color }}
            />
            <div>
              <h1 className="text-lg font-bold text-slate-800">{doctor.name}</h1>
              <p className="text-sm text-slate-500">
                {doctor.role} – {doctor.unit}
              </p>
            </div>
          </div>

          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <div className="font-bold text-blue-700">{totalHours}h</div>
              <div className="text-slate-500 text-xs">Month Total</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-emerald-700">{avgWeekly}h</div>
              <div className="text-slate-500 text-xs">Weekly Avg</div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleExportICal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition"
            >
              📅 Add to Calendar
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 transition"
            >
              ⬇ Download CSV
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm hover:bg-slate-100 transition"
          >
            ← {format(subMonths(currentDate, 1), "MMM")}
          </button>
          <h2 className="text-xl font-bold text-slate-800">
            {format(currentDate, "MMMM yyyy")}
          </h2>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm hover:bg-slate-100 transition"
          >
            {format(addMonths(currentDate, 1), "MMM")} →
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-500">
            Loading schedule…
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-7 border-b border-slate-200">
              {DAY_LABELS.map((d) => (
                <div
                  key={d}
                  className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {calDays.map((day, i) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const inCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());
                const holiday = getHoliday(dateStr);
                const myShift = getShiftForDay(dateStr, doctor.id);
                const coworkers =
                  myShift && !["off", "request_off", "public_holiday"].includes(myShift.type)
                    ? getOverlappingCoworkers(dateStr, myShift)
                    : [];

                return (
                  <div
                    key={i}
                    className={`min-h-[100px] p-1.5 border-b border-r border-slate-100 ${
                      !inCurrentMonth ? "bg-slate-50/60" : ""
                    } ${isToday ? "bg-blue-50/50" : ""} ${
                      holiday ? "bg-green-50/40" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-0.5">
                      <span
                        className={`text-xs font-medium leading-none rounded-full w-5 h-5 flex items-center justify-center ${
                          isToday
                            ? "bg-blue-600 text-white"
                            : inCurrentMonth
                            ? "text-slate-700"
                            : "text-slate-400"
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                      {holiday && <HolidayBadge holiday={holiday} compact />}
                    </div>

                    {holiday && (
                      <div className="text-[9px] text-green-700 font-medium leading-tight mb-0.5 truncate">
                        {holiday.name}
                      </div>
                    )}

                    <ShiftCell
                      shift={myShift}
                      isCurrentMonth={inCurrentMonth}
                      coworkers={coworkers}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
          <span className="font-medium">Shift types:</span>
          {[
            { label: "Day 08:00–17:00", color: "bg-blue-100 text-blue-800" },
            { label: "Evening 14:00–22:00", color: "bg-purple-100 text-purple-800" },
            { label: "On-Call 12:00–22:00", color: "bg-violet-100 text-violet-800" },
            { label: "Short 08:00–12:00", color: "bg-amber-100 text-amber-800" },
            { label: "Public Holiday", color: "bg-green-100 text-green-800" },
          ].map(({ label, color }) => (
            <span key={label} className={`px-2 py-0.5 rounded-full ${color}`}>
              {label}
            </span>
          ))}
          <span className="text-slate-400">| Grayed = adjacent month</span>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Teaching: HMO Teaching – Mondays 14:00–19:00 &nbsp;|&nbsp; Intern Teaching – Thursdays 12:00–13:00
        </p>
      </main>
    </div>
  );
}
