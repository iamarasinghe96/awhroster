"use client";

import { useState, useCallback } from "react";
import {
  format,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  getDay,
  isToday,
} from "date-fns";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { v4 as uuidv4 } from "uuid";
import type { CalendarEvent, Doctor, Shift, ShiftType } from "@/lib/types";
import { SHIFT_COLORS } from "@/lib/types";
import { calculateHours, createShift } from "@/lib/scheduleUtils";
import { getHoliday, isHoliday } from "@/lib/holidays";
import ShiftModal from "./ShiftModal";
import HolidayBadge from "@/components/common/HolidayBadge";

// ─── Shift card (shared rendering) ───────────────────────────────────────────
function ShiftCard({ shift, faded = false }: { shift: Shift; faded?: boolean }) {
  const colors = SHIFT_COLORS[shift.type];
  const hours = !["off", "request_off", "public_holiday"].includes(shift.type)
    ? calculateHours(shift.startTime, shift.endTime)
    : null;
  return (
    <div className={`rounded p-1 text-[10px] leading-tight h-full border ${colors.bg} ${colors.text} ${colors.border} ${faded ? "opacity-30" : ""}`}>
      {shift.type === "off" ? (
        <span className="text-gray-400 font-medium">OFF</span>
      ) : shift.type === "request_off" ? (
        <span className="font-medium text-orange-600">Req.OFF</span>
      ) : shift.type === "public_holiday" ? (
        <span className="font-medium">PH</span>
      ) : (
        <>
          <div className="font-semibold">{shift.startTime}–{shift.endTime}</div>
          <div className="font-bold text-sm">{hours}h</div>
          <div className="opacity-75 truncate">{shift.unit}</div>
        </>
      )}
      {shift.notes && <div className="opacity-60 truncate mt-0.5">{shift.notes}</div>}
    </div>
  );
}

// ─── Draggable shift inside a cell ────────────────────────────────────────────
function DraggableShift({ shift, doctor, onClick }: { shift: Shift; doctor: Doctor; onClick?: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `shift-${shift.id}`,
    data: { type: "shift", shift, doctor },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className="h-full cursor-grab active:cursor-grabbing"
      title="Drag to copy · Click to edit"
    >
      <ShiftCard shift={shift} faded={isDragging} />
    </div>
  );
}

// ─── Droppable calendar cell ──────────────────────────────────────────────────
function CalendarCell({
  cellId,
  doctor,
  shift,
  date,
  isWeekend,
  holiday,
  draggedShift,
  onClick,
}: {
  cellId: string;
  doctor: Doctor;
  shift?: Shift;
  date: string;
  isWeekend: boolean;
  holiday?: ReturnType<typeof getHoliday>;
  draggedShift?: Shift | null;
  onClick?: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: cellId });

  return (
    <div
      ref={setNodeRef}
      className={`
        border-r border-b border-slate-100 min-h-[68px] p-1 transition-all relative
        ${isWeekend ? "bg-slate-50/70" : "bg-white"}
        ${holiday ? "bg-green-50/50" : ""}
        ${isOver && !shift ? "bg-blue-50 ring-2 ring-inset ring-blue-400" : ""}
      `}
    >
      {shift ? (
        <DraggableShift shift={shift} doctor={doctor} onClick={onClick} />
      ) : isOver && draggedShift ? (
        <div className="opacity-60 pointer-events-none">
          <ShiftCard shift={draggedShift} />
        </div>
      ) : (
        <div className={`h-full flex items-center justify-center text-[10px] ${isOver ? "text-blue-400" : "text-slate-200"}`}>
          {isOver ? "Copy here" : ""}
        </div>
      )}
    </div>
  );
}

// ─── Doctor row label ─────────────────────────────────────────────────────────
function DoctorRowLabel({
  doctor,
  totalHours,
  shiftCount,
}: {
  doctor: Doctor;
  totalHours: number;
  shiftCount: number;
}) {
  const avgWeekly = totalHours > 0 ? Math.round((totalHours / 4.33) * 10) / 10 : 0;
  const isOverTarget = totalHours > 160;
  const isUnderTarget = totalHours < 140 && shiftCount > 0;

  return (
    <div className="flex items-center gap-2 px-2 py-1 h-full">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
        style={{ backgroundColor: doctor.color }}
      >
        {doctor.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-slate-700 truncate leading-tight">
          {doctor.name}
        </div>
        <div className="text-[9px] text-slate-500 truncate">{doctor.unit}</div>
        <div className={`text-[9px] font-bold leading-tight ${isOverTarget ? "text-red-600" : isUnderTarget ? "text-orange-500" : "text-emerald-600"}`}>
          {totalHours}h · ~{avgWeekly}h/wk
        </div>
      </div>
    </div>
  );
}

// ─── Dynamic events row ───────────────────────────────────────────────────────
function EventsRow({ days, events }: { days: Date[]; events: CalendarEvent[] }) {
  if (events.length === 0) return null;
  return (
    <tr className="border-b border-slate-100">
      <td className="sticky left-0 z-10 bg-teal-50 border-r border-slate-200 px-2 py-1 w-44 min-w-[176px]">
        <span className="text-[10px] font-semibold text-teal-700">Events</span>
      </td>
      {days.map((day) => {
        const dow = getDay(day);
        const dateStr = format(day, "yyyy-MM-dd");
        const dayEvents = events.filter((e) =>
          e.recurrence === "weekly" ? e.dayOfWeek === dow :
          e.recurrence === "specific" ? (e.dates?.includes(dateStr) ?? false) : false
        );
        return (
          <td key={dateStr}
            className={`border-r border-b border-slate-100 text-[9px] p-1 min-w-[90px] ${dayEvents.length ? "bg-teal-50/40" : "bg-white"}`}>
            {dayEvents.map((evt) => (
              <div key={evt.id}
                className="rounded px-1 py-0.5 font-medium mb-0.5 text-white truncate text-[9px]"
                style={{ backgroundColor: evt.color }}
                title={`${evt.title} ${evt.startTime}–${evt.endTime}${evt.notes ? ` · ${evt.notes}` : ""} (${evt.recipients})`}>
                {evt.title} {evt.startTime}–{evt.endTime}
              </div>
            ))}
          </td>
        );
      })}
      <td className="border-r border-slate-100 bg-teal-50 min-w-[100px]" />
    </tr>
  );
}

// ─── Main Admin Calendar ──────────────────────────────────────────────────────
interface Props {
  doctors: Doctor[];
  shifts: Shift[];
  currentMonth: Date;
  events: CalendarEvent[];
  onShiftsChange: (shifts: Shift[]) => void;
}

export default function AdminCalendar({
  doctors,
  shifts,
  currentMonth,
  events,
  onShiftsChange,
}: Props) {
  const [editingShift, setEditingShift] = useState<{ shift: Shift; doctor: Doctor } | null>(null);
  const [draggedDoctor, setDraggedDoctor] = useState<Doctor | null>(null);
  const [draggedShift, setDraggedShift] = useState<Shift | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getShift = useCallback(
    (doctorId: string, dateStr: string): Shift | undefined =>
      shifts.find((s) => s.doctorId === doctorId && s.date === dateStr),
    [shifts]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === "doctor") setDraggedDoctor(data.doctor as Doctor);
    if (data?.type === "shift") setDraggedShift(data.shift as Shift);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const prevDraggedShift = draggedShift;
    setDraggedDoctor(null);
    setDraggedShift(null);

    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overId = String(over.id);
    if (!overId.startsWith("cell-")) return;

    const parts = overId.split("-");
    const dateStr = parts.slice(-3).join("-"); // "yyyy-MM-dd"
    const targetDoctorId = parts.slice(1, -3).join("-");

    if (activeData?.type === "shift") {
      // Shift drag → copy to target cell
      const src = activeData.shift as Shift;
      if (src.doctorId === targetDoctorId && src.date === dateStr) return;
      if (getShift(targetDoctorId, dateStr)) return; // don't overwrite
      onShiftsChange([...shifts, { ...src, id: uuidv4(), doctorId: targetDoctorId, date: dateStr }]);
      return;
    }

    if (activeData?.type === "doctor") {
      // Doctor drag → create new shift
      const doctor: Doctor = activeData.doctor as Doctor;
      if (getShift(targetDoctorId, dateStr)) return;
      const holiday = isHoliday(dateStr);
      const type: ShiftType = holiday ? "public_holiday" : "day";
      const newShift = createShift(
        targetDoctorId, dateStr, doctor.unit, type,
        type === "day" ? "08:00" : "00:00",
        type === "day" ? "17:00" : "00:00"
      );
      onShiftsChange([...shifts, newShift]);
    }
  };

  const handleShiftSave = (updated: Shift) => {
    onShiftsChange(shifts.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleShiftDelete = (id: string) => {
    onShiftsChange(shifts.filter((s) => s.id !== id));
  };

  const handleShiftDuplicate = (newShifts: Shift[]) => {
    const existingKeys = new Set(shifts.map((s) => `${s.doctorId}|${s.date}`));
    const toAdd = newShifts.filter((s) => !existingKeys.has(`${s.doctorId}|${s.date}`));
    onShiftsChange([...shifts, ...toAdd]);
  };

  // Summary: total hours per doctor for this month
  const monthKey = format(currentMonth, "yyyy-MM");
  const doctorHours = doctors.reduce<Record<string, { total: number; count: number }>>((acc, d) => {
    const doctorShifts = shifts.filter(
      (s) => s.doctorId === d.id && s.date.startsWith(monthKey) && !["off", "request_off"].includes(s.type)
    );
    acc[d.id] = {
      total: doctorShifts.reduce((sum, s) => sum + calculateHours(s.startTime, s.endTime), 0),
      count: doctorShifts.length,
    };
    return acc;
  }, {});

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-auto roster-scroll">
          <table className="border-collapse min-w-max w-full">
            <thead className="sticky top-0 z-20">
              {/* Month/week header row */}
              <tr className="bg-slate-800 text-white">
                <th className="sticky left-0 z-30 bg-slate-800 text-left px-3 py-2 text-xs font-semibold w-44 min-w-[176px] border-r border-slate-600">
                  Doctor / Staff
                </th>
                {days.map((day) => {
                  const dow = getDay(day);
                  const isWeekend = dow === 0 || dow === 6;
                  const dateStr = format(day, "yyyy-MM-dd");
                  const holiday = getHoliday(dateStr);
                  const today = isToday(day);
                  return (
                    <th
                      key={dateStr}
                      className={`text-center px-1 py-1 min-w-[90px] border-r border-slate-600 ${
                        isWeekend ? "bg-slate-700" : "bg-slate-800"
                      } ${today ? "bg-blue-800" : ""} ${holiday ? "bg-green-900" : ""}`}
                    >
                      <div className={`text-[10px] font-bold uppercase ${holiday ? "text-green-300" : isWeekend ? "text-slate-400" : "text-slate-300"}`}>
                        {format(day, "EEE")}
                      </div>
                      <div className={`text-sm font-bold ${today ? "text-yellow-300" : "text-white"}`}>
                        {format(day, "d")}
                      </div>
                      {holiday && (
                        <div className="text-[9px] text-green-300 leading-tight truncate px-0.5">
                          PH
                        </div>
                      )}
                    </th>
                  );
                })}
                <th className="sticky right-0 z-10 bg-slate-700 text-xs font-semibold px-3 py-2 min-w-[100px] border-l border-slate-600 whitespace-nowrap">
                  Month Total
                </th>
              </tr>
            </thead>

            <tbody>
              {/* Events row */}
              <EventsRow days={days} events={events} />

              {/* Doctor rows */}
              {doctors.map((doctor) => {
                const stats = doctorHours[doctor.id] ?? { total: 0, count: 0 };
                return (
                  <tr key={doctor.id} className="border-b border-slate-100 hover:bg-slate-50/30 transition">
                    {/* Doctor label */}
                    <td className="sticky left-0 z-10 bg-white border-r border-slate-200 min-h-[68px]">
                      <DoctorRowLabel
                        doctor={doctor}
                        totalHours={stats.total}
                        shiftCount={stats.count}
                      />
                    </td>

                    {/* Day cells */}
                    {days.map((day) => {
                      const dateStr = format(day, "yyyy-MM-dd");
                      const dow = getDay(day);
                      const isWeekend = dow === 0 || dow === 6;
                      const holiday = getHoliday(dateStr);
                      const shift = getShift(doctor.id, dateStr);
                      const cellId = `cell-${doctor.id}-${dateStr}`;

                      return (
                        <td key={dateStr} className="p-0 min-w-[90px]">
                          <CalendarCell
                            cellId={cellId}
                            doctor={doctor}
                            shift={shift}
                            date={dateStr}
                            isWeekend={isWeekend}
                            holiday={holiday}
                            draggedShift={draggedShift}
                            onClick={() => shift && setEditingShift({ shift, doctor })}
                          />
                        </td>
                      );
                    })}

                    {/* Hours summary */}
                    <td className="sticky right-0 z-10 bg-slate-50 border-l border-slate-200 px-3 text-center min-w-[100px]">
                      <div className={`text-sm font-bold ${stats.total > 160 ? "text-red-600" : stats.total >= 140 ? "text-emerald-600" : "text-slate-600"}`}>
                        {stats.total}h
                      </div>
                      <div className="text-[10px] text-slate-400">{stats.count} shifts</div>
                      {stats.total > 160 && (
                        <div className="text-[9px] text-red-500 font-medium">Over target</div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Daily total row */}
              <tr className="bg-slate-100 border-t-2 border-slate-300">
                <td className="sticky left-0 z-10 bg-slate-100 border-r border-slate-300 px-3 py-1.5">
                  <span className="text-xs font-bold text-slate-600">Daily Coverage</span>
                </td>
                {days.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const dayShifts = shifts.filter(
                    (s) => s.date === dateStr && !["off", "request_off"].includes(s.type)
                  );
                  const dayHours = dayShifts.reduce(
                    (sum, s) => sum + calculateHours(s.startTime, s.endTime),
                    0
                  );
                  const coverCount = dayShifts.length;
                  return (
                    <td key={dateStr} className="text-center px-1 py-1 border-r border-slate-200 min-w-[90px]">
                      <div className="text-xs font-bold text-slate-700">{dayHours > 0 ? `${dayHours}h` : "–"}</div>
                      <div className="text-[10px] text-slate-400">{coverCount > 0 ? `${coverCount} staff` : ""}</div>
                    </td>
                  );
                })}
                <td className="sticky right-0 z-10 bg-slate-100 border-l border-slate-300 px-3 text-center">
                  <div className="text-xs font-bold text-slate-700">
                    {Object.values(doctorHours).reduce((s, v) => s + v.total, 0)}h
                  </div>
                  <div className="text-[9px] text-slate-400">total</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {draggedShift && (
            <div className="shadow-2xl rounded w-[90px] opacity-95 ring-2 ring-blue-400">
              <ShiftCard shift={draggedShift} />
            </div>
          )}
          {draggedDoctor && !draggedShift && (
            <div className="drag-overlay bg-white rounded-xl border-2 border-blue-500 px-3 py-2 shadow-2xl w-48">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: draggedDoctor.color }}
                >
                  {draggedDoctor.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800 truncate">{draggedDoctor.name}</div>
                  <div className="text-xs text-blue-600 font-medium">08:00–17:00 (9h)</div>
                </div>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Shift edit modal */}
      {editingShift && (
        <ShiftModal
          shift={editingShift.shift}
          doctor={editingShift.doctor}
          onSave={handleShiftSave}
          onDelete={handleShiftDelete}
          onDuplicate={handleShiftDuplicate}
          onClose={() => setEditingShift(null)}
        />
      )}
    </>
  );
}
