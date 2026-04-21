"use client";

import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { CalendarEvent } from "@/lib/types";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PRESET_COLORS = ["#0d9488", "#0ea5e9", "#7c3aed", "#dc2626", "#ea580c", "#16a34a", "#d97706", "#db2777"];
const RECIPIENT_OPTIONS: Array<{ value: CalendarEvent["recipients"]; label: string }> = [
  { value: "all", label: "Everyone" },
  { value: "Intern", label: "Interns only" },
  { value: "HMO", label: "HMOs only" },
  { value: "Registrar", label: "Registrars only" },
  { value: "Consultant", label: "Consultants only" },
];

const BLANK: Omit<CalendarEvent, "id"> = {
  title: "",
  startTime: "08:00",
  endTime: "09:00",
  recurrence: "weekly",
  dayOfWeek: 1,
  dates: [],
  recipients: "all",
  color: "#0d9488",
};

interface Props {
  events: CalendarEvent[];
  onSave: (events: CalendarEvent[]) => void;
  onClose: () => void;
}

export default function EventsModal({ events, onSave, onClose }: Props) {
  const [list, setList] = useState<CalendarEvent[]>(events);
  const [form, setForm] = useState<Omit<CalendarEvent, "id"> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [datesInput, setDatesInput] = useState("");

  const openNew = () => {
    setForm({ ...BLANK });
    setEditingId(null);
    setDatesInput("");
  };

  const openEdit = (evt: CalendarEvent) => {
    setForm({ title: evt.title, startTime: evt.startTime, endTime: evt.endTime,
      recurrence: evt.recurrence, dayOfWeek: evt.dayOfWeek, dates: evt.dates,
      recipients: evt.recipients, color: evt.color, notes: evt.notes });
    setEditingId(evt.id);
    setDatesInput((evt.dates ?? []).join("\n"));
  };

  const handleDelete = (id: string) => {
    setList(list.filter((e) => e.id !== id));
    if (editingId === id) { setForm(null); setEditingId(null); }
  };

  const handleFormSave = () => {
    if (!form || !form.title.trim()) return;
    const dates = form.recurrence === "specific"
      ? datesInput.split(/[\n,]+/).map((d) => d.trim()).filter(Boolean)
      : [];
    const evt: CalendarEvent = { ...form, id: editingId ?? uuidv4(), dates };
    setList(editingId ? list.map((e) => e.id === editingId ? evt : e) : [...list, evt]);
    setForm(null);
    setEditingId(null);
  };

  const labelFor = (r: CalendarEvent["recipients"]) =>
    RECIPIENT_OPTIONS.find((o) => o.value === r)?.label ?? r;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-800">Manage Calendar Events</h2>
            <p className="text-xs text-slate-500 mt-0.5">Teaching sessions, meetings, recurring events</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">x</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Event list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700">Events ({list.length})</span>
              <button onClick={openNew}
                className="text-xs px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition">
                + Add Event
              </button>
            </div>
            {list.length === 0 && <p className="text-xs text-slate-400 italic">No events yet.</p>}
            <div className="space-y-1.5">
              {list.map((evt) => (
                <div key={evt.id}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${
                    editingId === evt.id ? "border-teal-400 bg-teal-50" : "border-slate-100 bg-slate-50"
                  }`}>
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: evt.color }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-slate-700">{evt.title}</span>
                    <span className="ml-2 text-[10px] text-slate-500">
                      {evt.startTime}–{evt.endTime}
                      {" · "}
                      {evt.recurrence === "weekly"
                        ? `Every ${DAY_NAMES[evt.dayOfWeek ?? 0]}`
                        : `${(evt.dates ?? []).length} dates`}
                      {" · "}
                      {labelFor(evt.recipients)}
                    </span>
                  </div>
                  <button onClick={() => openEdit(evt)}
                    className="text-[10px] px-2 py-1 border border-slate-300 rounded hover:bg-white transition">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(evt.id)}
                    className="text-[10px] px-2 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50 transition">
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add / Edit form */}
          {form && (
            <div className="border border-teal-200 rounded-xl p-4 bg-teal-50/30 space-y-3">
              <h3 className="text-xs font-bold text-teal-800">{editingId ? "Edit Event" : "New Event"}</h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Event Title</label>
                  <input type="text" value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. HMO Teaching"
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Start Time</label>
                  <input type="time" value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">End Time</label>
                  <input type="time" value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Recurrence</label>
                  <div className="flex gap-4 mb-2">
                    {(["weekly", "specific"] as const).map((r) => (
                      <label key={r} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="radio" checked={form.recurrence === r}
                          onChange={() => setForm({ ...form, recurrence: r })} />
                        {r === "weekly" ? "Weekly (every…)" : "Specific Dates"}
                      </label>
                    ))}
                  </div>
                  {form.recurrence === "weekly" && (
                    <select value={form.dayOfWeek ?? 1}
                      onChange={(e) => setForm({ ...form, dayOfWeek: Number(e.target.value) })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                      {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  )}
                  {form.recurrence === "specific" && (
                    <textarea value={datesInput}
                      onChange={(e) => setDatesInput(e.target.value)}
                      rows={3}
                      placeholder="One date per line (YYYY-MM-DD)"
                      className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none" />
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Show to</label>
                  <select value={form.recipients}
                    onChange={(e) => setForm({ ...form, recipients: e.target.value as CalendarEvent["recipients"] })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                    {RECIPIENT_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Color</label>
                  <div className="flex gap-1.5 flex-wrap pt-1">
                    {PRESET_COLORS.map((c) => (
                      <button key={c} onClick={() => setForm({ ...form, color: c })}
                        className={`w-6 h-6 rounded-full border-2 transition ${
                          form.color === c ? "border-slate-700 scale-110" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Notes (optional)</label>
                  <input type="text" value={form.notes ?? ""}
                    onChange={(e) => setForm({ ...form, notes: e.target.value || undefined })}
                    placeholder="Optional note shown on the event"
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => { setForm(null); setEditingId(null); }}
                  className="px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition">
                  Discard
                </button>
                <button onClick={handleFormSave} disabled={!form.title.trim()}
                  className="px-4 py-1.5 text-xs bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white rounded-lg font-medium transition">
                  {editingId ? "Update Event" : "Add Event"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 flex justify-between items-center">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition">
            Cancel
          </button>
          <button onClick={() => onSave(list)}
            className="px-5 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition">
            Save Events ({list.length})
          </button>
        </div>
      </div>
    </div>
  );
}
