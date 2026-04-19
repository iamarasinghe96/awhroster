"use client";

import { useState, useEffect, useCallback } from "react";
import { format, addMonths, subMonths } from "date-fns";
import type { Doctor, Shift, MonthlySchedule } from "@/lib/types";
import AdminCalendar from "@/components/admin/AdminCalendar";
import DoctorPanel from "@/components/admin/DoctorPanel";
import AddDoctorModal from "@/components/admin/AddDoctorModal";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function AdminPage() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    // Default to current month
    return new Date();
  });
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [schedule, setSchedule] = useState<MonthlySchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [filterRole, setFilterRole] = useState("All");
  const [showHolidayKey, setShowHolidayKey] = useState(false);

  const monthKey = format(currentMonth, "yyyy-MM");

  // ── Fetch doctors ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/doctors")
      .then((r) => r.json())
      .then((d) => setDoctors(d.doctors ?? []));
  }, []);

  // ── Fetch schedule for current month ──────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    fetch(`/api/schedule/${monthKey}`)
      .then((r) => r.json())
      .then((data: MonthlySchedule) => {
        setSchedule(data);
        setLoading(false);
      });
  }, [monthKey]);

  // ── Save schedule ─────────────────────────────────────────────────────────
  const saveSchedule = useCallback(
    async (shifts: Shift[]) => {
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/schedule/${monthKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shifts }),
        });
        if (!res.ok) throw new Error("Save failed");
        const saved: MonthlySchedule = await res.json();
        setSchedule(saved);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2500);
      } catch {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    },
    [monthKey]
  );

  const handleShiftsChange = useCallback(
    (newShifts: Shift[]) => {
      setSchedule((prev) => (prev ? { ...prev, shifts: newShifts } : null));
      saveSchedule(newShifts);
    },
    [saveSchedule]
  );

  // ── Doctor management ──────────────────────────────────────────────────────
  const handleAddDoctor = async (data: Omit<Doctor, "id">) => {
    const res = await fetch("/api/doctors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const newDoc: Doctor = await res.json();
    setDoctors((prev) => [...prev, newDoc]);
    setShowAddDoctor(false);
  };

  const handleDeleteDoctor = async (id: string) => {
    await fetch(`/api/doctors/${id}`, { method: "DELETE" });
    setDoctors((prev) => prev.filter((d) => d.id !== id));
    // Also remove their shifts
    if (schedule) {
      const newShifts = schedule.shifts.filter((s) => s.doctorId !== id);
      handleShiftsChange(newShifts);
    }
  };

  const handleExportCSV = () => {
    window.location.href = `/api/export/csv?admin=true&month=${monthKey}`;
  };

  const handleExportDoctorCSV = (doctorId: string) => {
    window.location.href = `/api/export/csv?doctorId=${doctorId}&month=${monthKey}`;
  };

  const shifts = schedule?.shifts ?? [];
  const lastModified = schedule?.lastModified
    ? new Date(schedule.lastModified).toLocaleString("en-AU")
    : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top header */}
      <header className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between flex-wrap gap-3 z-40 sticky top-0">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-base font-bold leading-tight">AWH Roaster — Admin</h1>
            <p className="text-slate-400 text-xs">Albury Base Hospital · Medicine</p>
          </div>
          <a
            href="/"
            className="text-slate-400 hover:text-white text-xs border border-slate-600 hover:border-slate-400 rounded px-2 py-1 transition"
          >
            ← Doctor View
          </a>
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 text-sm transition"
          >
            ‹
          </button>
          <div className="text-center min-w-[140px]">
            <div className="font-bold text-sm">{format(currentMonth, "MMMM yyyy")}</div>
            {lastModified && (
              <div className="text-[10px] text-slate-400">Saved {lastModified}</div>
            )}
          </div>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 text-sm transition"
          >
            ›
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition ml-1"
          >
            Today
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Save status */}
          <span
            className={`text-xs px-2 py-1 rounded-full transition ${
              saveStatus === "saving"
                ? "bg-amber-700 text-amber-100"
                : saveStatus === "saved"
                ? "bg-emerald-700 text-emerald-100"
                : saveStatus === "error"
                ? "bg-red-700 text-red-100"
                : "hidden"
            }`}
          >
            {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "✓ Saved" : "✕ Error"}
          </span>

          <button
            onClick={() => setShowHolidayKey(!showHolidayKey)}
            className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-green-300 transition"
            title="Public Holidays"
          >
            PH Key
          </button>

          <button
            onClick={handleExportCSV}
            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition"
          >
            ⬇ CSV (All)
          </button>
        </div>
      </header>

      {/* Holiday key dropdown */}
      {showHolidayKey && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-3">
          <h3 className="text-xs font-bold text-green-800 mb-2">NSW Public Holidays 2026–2027</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1 text-xs text-green-700">
            {[
              "1 Jan 2026 – New Year's Day", "26 Jan 2026 – Australia Day",
              "3 Apr 2026 – Good Friday", "4 Apr 2026 – Easter Saturday",
              "5 Apr 2026 – Easter Sunday", "6 Apr 2026 – Easter Monday",
              "25 Apr 2026 – Anzac Day", "27 Apr 2026 – Anzac Day (Add.)",
              "8 Jun 2026 – King's Birthday", "3 Aug 2026 – Bank Holiday",
              "5 Oct 2026 – Labour Day", "25 Dec 2026 – Christmas Day",
              "26 Dec 2026 – Boxing Day", "28 Dec 2026 – Boxing Day (Add.)",
              "1 Jan 2027 – New Year's Day", "26 Jan 2027 – Australia Day",
              "26 Mar 2027 – Good Friday", "27 Mar 2027 – Easter Saturday",
              "28 Mar 2027 – Easter Sunday", "29 Mar 2027 – Easter Monday",
              "25 Apr 2027 – Anzac Day", "26 Apr 2027 – Anzac Day (Add.)",
              "14 Jun 2027 – King's Birthday", "2 Aug 2027 – Bank Holiday",
              "4 Oct 2027 – Labour Day", "25 Dec 2027 – Christmas Day",
              "26 Dec 2027 – Boxing Day", "27 Dec 2027 – Xmas (Add.)",
              "28 Dec 2027 – Boxing Day (Add.)",
            ].map((h) => (
              <span key={h} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                {h}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar – doctor panel */}
        <DoctorPanel
          doctors={doctors}
          monthShifts={shifts}
          onAddDoctor={() => setShowAddDoctor(true)}
          onEditDoctor={(doc) => setEditingDoctor(doc)}
          onDeleteDoctor={handleDeleteDoctor}
          filterRole={filterRole}
          onFilterRole={setFilterRole}
        />

        {/* Calendar area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <div className="text-2xl mb-2 animate-spin">⟳</div>
                Loading schedule…
              </div>
            </div>
          ) : (
            <AdminCalendar
              doctors={filterRole === "All" ? doctors : doctors.filter((d) => d.role === filterRole)}
              shifts={shifts}
              currentMonth={currentMonth}
              onShiftsChange={handleShiftsChange}
            />
          )}
        </main>
      </div>

      {/* Legend bar */}
      <footer className="bg-white border-t border-slate-200 px-4 py-2 flex flex-wrap gap-3 items-center text-xs text-slate-500 z-10">
        <span className="font-semibold text-slate-700">Shifts:</span>
        {[
          { label: "Day 08:00–17:00 (9h)", color: "bg-blue-100 text-blue-800" },
          { label: "Evening 14:00–22:00 (8h)", color: "bg-purple-100 text-purple-800" },
          { label: "On-Call 12:00–22:00 (10h)", color: "bg-violet-100 text-violet-800" },
          { label: "Short/Teaching 08:00–12:00 (4h)", color: "bg-amber-100 text-amber-800" },
          { label: "Public Holiday", color: "bg-green-100 text-green-800" },
          { label: "Request Off", color: "bg-orange-100 text-orange-700" },
        ].map(({ label, color }) => (
          <span key={label} className={`px-2 py-0.5 rounded-full ${color}`}>{label}</span>
        ))}
        <span className="ml-auto text-slate-400">
          Target: ~160h/month (40h/wk) · Red = over 160h · Orange = under 140h
        </span>
      </footer>

      {/* Modals */}
      {showAddDoctor && (
        <AddDoctorModal
          onClose={() => setShowAddDoctor(false)}
          onAdd={handleAddDoctor}
        />
      )}

      {editingDoctor && (
        <AddDoctorModal
          title={`Edit – ${editingDoctor.name}`}
          initialValues={editingDoctor}
          onClose={() => setEditingDoctor(null)}
          onAdd={async (data) => {
            const res = await fetch(`/api/doctors/${editingDoctor.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            const updated: Doctor = await res.json();
            setDoctors((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
            setEditingDoctor(null);
          }}
        />
      )}
    </div>
  );
}
