"use client";

import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Shift, Doctor } from "@/lib/types";
import { SHIFT_PRESETS, UNIT_OPTIONS } from "@/lib/types";
import { calculateHours } from "@/lib/scheduleUtils";
import { format, parseISO } from "date-fns";

interface Props {
  shift: Shift;
  doctor: Doctor;
  onSave: (updated: Shift) => void;
  onDelete: (id: string) => void;
  onDuplicate: (newShifts: Shift[]) => void;
  onClose: () => void;
}

export default function ShiftModal({ shift, doctor, onSave, onDelete, onDuplicate, onClose }: Props) {
  const [form, setForm] = useState({ ...shift });
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [dupDates, setDupDates] = useState<string[]>([""]);

  const hours = calculateHours(form.startTime, form.endTime);

  const applyPreset = (key: string) => {
    const preset = SHIFT_PRESETS[key];
    setForm({ ...form, type: preset.type, startTime: preset.startTime, endTime: preset.endTime });
  };

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  const handleDelete = () => {
    if (confirm("Remove this shift?")) {
      onDelete(shift.id);
      onClose();
    }
  };

  const setDupDate = (i: number, val: string) => {
    const next = [...dupDates];
    next[i] = val;
    setDupDates(next);
  };
  const addDupDate = () => setDupDates([...dupDates, ""]);
  const removeDupDate = (i: number) => setDupDates(dupDates.filter((_, idx) => idx !== i));

  const validDupDates = dupDates.filter(Boolean);

  const handleDuplicate = () => {
    if (!validDupDates.length) return;
    const newShifts: Shift[] = validDupDates.map((date) => ({
      ...form,
      id: uuidv4(),
      date,
    }));
    onDuplicate(newShifts);
    onClose();
  };

  const dateLabel = format(parseISO(shift.date), "EEEE, d MMMM yyyy");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div
          className="px-6 py-4 text-white"
          style={{ background: `linear-gradient(135deg, ${doctor.color}, ${doctor.color}cc)` }}
        >
          <h2 className="font-bold">{doctor.name}</h2>
          <p className="text-sm opacity-80">{dateLabel}</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Shift type presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Shift Type
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {Object.entries(SHIFT_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition ${
                    form.type === preset.type
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
                  }`}
                >
                  {key === "day" ? "Day" : key === "evening" ? "Evening" : key === "oncall" ? "On-Call" : key === "short" ? "Short" : key === "off" ? "Off" : "Req. Off"}
                </button>
              ))}
            </div>
          </div>

          {/* Time range */}
          {!["off", "request_off"].includes(form.type) && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Time Range
                <span className="ml-2 normal-case text-blue-600 font-bold">
                  {hours > 0 ? `${hours}h` : "–"}
                </span>
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-0.5 block">Start</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <span className="text-slate-400 mt-4">–</span>
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-0.5 block">End</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Visual time bar */}
              {hours > 0 && (
                <div className="mt-2 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{
                      marginLeft: `${(parseInt(form.startTime) / 24) * 100}%`,
                      width: `${(hours / 24) * 100}%`,
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Unit */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Unit / Location
            </label>
            <select
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Notes
            </label>
            <input
              type="text"
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes…"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Duplicate panel */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowDuplicate(!showDuplicate)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              <span>📋 Duplicate to other dates</span>
              <span className="text-slate-400 text-xs">{showDuplicate ? "▲" : "▼"}</span>
            </button>

            {showDuplicate && (
              <div className="px-4 pb-4 pt-1 bg-slate-50 space-y-2 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  Copies this shift (with any changes above) to each selected date.
                  Existing shifts on those dates are skipped.
                </p>
                {dupDates.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="date"
                      value={d}
                      onChange={(e) => setDupDate(i, e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {dupDates.length > 1 && (
                      <button
                        onClick={() => removeDupDate(i)}
                        className="text-red-400 hover:text-red-600 text-lg leading-none px-1"
                        title="Remove"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={addDupDate}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + Add another date
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={handleDuplicate}
                    disabled={!validDupDates.length}
                    className="px-4 py-1.5 bg-blue-600 disabled:opacity-40 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
                  >
                    Copy to {validDupDates.length} date{validDupDates.length !== 1 ? "s" : ""}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={handleDelete}
              className="px-3 py-2 text-red-600 border border-red-200 rounded-lg text-sm hover:bg-red-50 transition"
            >
              🗑 Remove
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
