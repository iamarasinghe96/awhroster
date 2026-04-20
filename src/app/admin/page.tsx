"use client";

import { useState, useEffect, useCallback } from "react";
import { format, addMonths, subMonths } from "date-fns";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";
import type { Doctor, Shift, MonthlySchedule } from "@/lib/types";
import AdminCalendar from "@/components/admin/AdminCalendar";
import DoctorPanel from "@/components/admin/DoctorPanel";
import AddDoctorModal from "@/components/admin/AddDoctorModal";
import {
  loadDoctors,
  loadSchedule,
  saveScheduleLocal,
  saveDoctorsLocal,
  exportScheduleJSON,
  exportDoctorsJSON,
  clearScheduleLocal,
  downloadFile,
} from "@/lib/clientStorage";
import { generateAdminCSV } from "@/lib/scheduleUtils";

type SaveStatus = "idle" | "saving" | "saved";

export default function AdminPage() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [schedule, setSchedule] = useState<MonthlySchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [filterRole, setFilterRole] = useState("All");
  const [showHolidayKey, setShowHolidayKey] = useState(false);
  const [showDeployHelp, setShowDeployHelp] = useState(false);

  const monthKey = format(currentMonth, "yyyy-MM");

  useEffect(() => {
    loadDoctors().then(setDoctors);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadSchedule(monthKey).then((data) => {
      setSchedule(data);
      setLoading(false);
    });
  }, [monthKey]);

  // ── Save to localStorage ───────────────────────────────────────────────────
  const persistShifts = useCallback(
    (shifts: Shift[]) => {
      const updated: MonthlySchedule = {
        month: monthKey,
        lastModified: new Date().toISOString(),
        shifts,
      };
      saveScheduleLocal(updated);
      setSchedule(updated);
      setSaveStatus("saving");
      // Visual feedback
      setTimeout(() => setSaveStatus("saved"), 300);
      setTimeout(() => setSaveStatus("idle"), 2500);
    },
    [monthKey]
  );

  const handleShiftsChange = useCallback(
    (newShifts: Shift[]) => persistShifts(newShifts),
    [persistShifts]
  );

  // ── Doctor management (localStorage) ──────────────────────────────────────
  const handleAddDoctor = (data: Omit<Doctor, "id">) => {
    const newDoc: Doctor = { ...data, id: uuidv4() };
    const updated = [...doctors, newDoc];
    setDoctors(updated);
    saveDoctorsLocal(updated);
    setShowAddDoctor(false);
  };

  const handleEditDoctor = (data: Omit<Doctor, "id">) => {
    if (!editingDoctor) return;
    const updated = doctors.map((d) =>
      d.id === editingDoctor.id ? { ...data, id: d.id } : d
    );
    setDoctors(updated);
    saveDoctorsLocal(updated);
    setEditingDoctor(null);
  };

  const handleDeleteDoctor = (id: string) => {
    const updated = doctors.filter((d) => d.id !== id);
    setDoctors(updated);
    saveDoctorsLocal(updated);
    if (schedule) {
      handleShiftsChange(schedule.shifts.filter((s) => s.doctorId !== id));
    }
  };

  // ── Exports ────────────────────────────────────────────────────────────────
  const handleExportScheduleJSON = () => {
    if (!schedule) return;
    exportScheduleJSON(schedule);
  };

  const handleExportDoctorsJSON = () => {
    exportDoctorsJSON(doctors);
  };

  const handleExportCSV = () => {
    const shifts = schedule?.shifts ?? [];
    const csv = generateAdminCSV(shifts, doctors);
    downloadFile(csv, `roster_admin_${monthKey}.csv`, "text/csv; charset=utf-8");
  };

  const handleResetFromPublished = async () => {
    if (!confirm("Reset this month from the published (deployed) schedule? Local changes will be lost.")) return;
    clearScheduleLocal(monthKey);
    setLoading(true);
    const fresh = await loadSchedule(monthKey);
    setSchedule(fresh);
    setLoading(false);
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
            <h1 className="text-base font-bold leading-tight">
              AWH Roaster — Admin
            </h1>
            <p className="text-slate-400 text-xs">
              Albury Base Hospital · Medicine
            </p>
          </div>
          <Link
            href="/"
            className="text-slate-400 hover:text-white text-xs border border-slate-600 hover:border-slate-400 rounded px-2 py-1 transition"
          >
            ← Doctor View
          </Link>
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
            <div className="font-bold text-sm">
              {format(currentMonth, "MMMM yyyy")}
            </div>
            {lastModified && (
              <div className="text-[10px] text-slate-400">
                Saved {lastModified}
              </div>
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
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-xs px-2 py-1 rounded-full transition ${
              saveStatus === "saving"
                ? "bg-amber-700 text-amber-100"
                : saveStatus === "saved"
                ? "bg-emerald-700 text-emerald-100"
                : "hidden"
            }`}
          >
            {saveStatus === "saving" ? "Saving…" : "✓ Saved locally"}
          </span>

          <button
            onClick={() => setShowDeployHelp(!showDeployHelp)}
            className="text-xs px-2 py-1 rounded bg-blue-700 hover:bg-blue-600 text-blue-100 transition"
          >
            ⬆ Deploy
          </button>

          <button
            onClick={() => setShowHolidayKey(!showHolidayKey)}
            className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-green-300 transition"
          >
            PH Key
          </button>

          <button
            onClick={handleExportCSV}
            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition"
          >
            ⬇ CSV
          </button>
        </div>
      </header>

      {/* Deploy help panel */}
      {showDeployHelp && (
        <div className="bg-blue-950 border-b border-blue-800 px-5 py-4 text-sm text-blue-100">
          <div className="flex items-start justify-between gap-4 max-w-4xl">
            <div>
              <p className="font-bold text-white mb-1">
                How to publish schedule changes to doctors:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-blue-200 text-xs">
                <li>
                  Click <strong className="text-white">Export Schedule JSON</strong> → save the downloaded{" "}
                  <code className="bg-blue-900 px-1 rounded">{monthKey}.json</code> file
                </li>
                <li>
                  Place the file in{" "}
                  <code className="bg-blue-900 px-1 rounded">
                    public/data/schedules/{monthKey}.json
                  </code>{" "}
                  in the repository
                </li>
                <li>
                  Commit &amp; push → GitHub Actions will rebuild and deploy automatically
                </li>
                <li>Doctors refresh the site to see the updated schedule</li>
              </ol>
            </div>
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <button
                onClick={handleExportScheduleJSON}
                className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-white whitespace-nowrap"
              >
                Export Schedule JSON
              </button>
              <button
                onClick={handleExportDoctorsJSON}
                className="text-xs px-3 py-1.5 bg-slate-600 hover:bg-slate-500 rounded text-white whitespace-nowrap"
              >
                Export Doctors JSON
              </button>
              <button
                onClick={handleResetFromPublished}
                className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 whitespace-nowrap"
              >
                Reset from Published
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Holiday key */}
      {showHolidayKey && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-3">
          <h3 className="text-xs font-bold text-green-800 mb-2">
            NSW Public Holidays 2026–2027
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1 text-xs text-green-700">
            {[
              "1 Jan 2026 – New Year's Day",
              "26 Jan 2026 – Australia Day",
              "3 Apr 2026 – Good Friday",
              "4 Apr 2026 – Easter Saturday",
              "5 Apr 2026 – Easter Sunday",
              "6 Apr 2026 – Easter Monday",
              "25 Apr 2026 – Anzac Day",
              "27 Apr 2026 – Anzac Day (Add.)",
              "8 Jun 2026 – King's Birthday",
              "3 Aug 2026 – Bank Holiday",
              "5 Oct 2026 – Labour Day",
              "25 Dec 2026 – Christmas Day",
              "26 Dec 2026 – Boxing Day",
              "28 Dec 2026 – Boxing Day (Add.)",
              "1 Jan 2027 – New Year's Day",
              "26 Jan 2027 – Australia Day",
              "26 Mar 2027 – Good Friday",
              "27 Mar 2027 – Easter Saturday",
              "28 Mar 2027 – Easter Sunday",
              "29 Mar 2027 – Easter Monday",
              "25 Apr 2027 – Anzac Day",
              "26 Apr 2027 – Anzac Day (Add.)",
              "14 Jun 2027 – King's Birthday",
              "2 Aug 2027 – Bank Holiday",
              "4 Oct 2027 – Labour Day",
              "25 Dec 2027 – Christmas Day",
              "26 Dec 2027 – Boxing Day",
              "27 Dec 2027 – Xmas (Add.)",
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
        <DoctorPanel
          doctors={doctors}
          monthShifts={shifts}
          onAddDoctor={() => setShowAddDoctor(true)}
          onEditDoctor={(doc) => setEditingDoctor(doc)}
          onDeleteDoctor={handleDeleteDoctor}
          filterRole={filterRole}
          onFilterRole={setFilterRole}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <div className="text-2xl mb-2">⟳</div>
                Loading schedule…
              </div>
            </div>
          ) : (
            <AdminCalendar
              doctors={
                filterRole === "All"
                  ? doctors
                  : doctors.filter((d) => d.role === filterRole)
              }
              shifts={shifts}
              currentMonth={currentMonth}
              onShiftsChange={handleShiftsChange}
            />
          )}
        </main>
      </div>

      {/* Legend */}
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
          <span key={label} className={`px-2 py-0.5 rounded-full ${color}`}>
            {label}
          </span>
        ))}
        <span className="ml-auto text-slate-400">
          Changes are saved locally. Use ⬆ Deploy to publish to doctors.
        </span>
      </footer>

      {showAddDoctor && (
        <AddDoctorModal onClose={() => setShowAddDoctor(false)} onAdd={handleAddDoctor} />
      )}

      {editingDoctor && (
        <AddDoctorModal
          title={`Edit – ${editingDoctor.name}`}
          initialValues={editingDoctor}
          onClose={() => setEditingDoctor(null)}
          onAdd={handleEditDoctor}
        />
      )}
    </div>
  );
}
