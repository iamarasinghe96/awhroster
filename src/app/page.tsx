"use client";

import { useState, useEffect } from "react";
import type { Doctor } from "@/lib/types";
import DoctorCalendar from "@/components/doctor/DoctorCalendar";

export default function DoctorPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selected, setSelected] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/doctors")
      .then((r) => r.json())
      .then((d) => { setDoctors(d.doctors ?? []); setLoading(false); });
  }, []);

  if (selected) {
    return <DoctorCalendar doctor={selected} onBack={() => setSelected(null)} />;
  }

  const filtered = doctors.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.unit.toLowerCase().includes(search.toLowerCase()) ||
    d.role.toLowerCase().includes(search.toLowerCase())
  );

  const internDoctors = filtered.filter((d) => d.role === "Intern");
  const hmoDoctors = filtered.filter((d) => d.role === "HMO");
  const otherDoctors = filtered.filter((d) => !["Intern", "HMO"].includes(d.role));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-700 to-blue-900 text-white">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">AWH Roaster</h1>
              <p className="text-blue-200 text-sm mt-0.5">Albury Base Hospital – Medicine</p>
            </div>
            <a
              href="/admin"
              className="text-blue-200 hover:text-white text-sm border border-blue-400 hover:border-blue-200 rounded-lg px-3 py-1.5 transition"
            >
              Admin →
            </a>
          </div>
          <p className="mt-4 text-blue-100 text-sm">
            Select your name to view and export your roster
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Search */}
        <div className="relative mb-6">
          <input
            type="text"
            placeholder="Search by name, role or unit…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500">Loading doctors…</div>
        ) : (
          <div className="space-y-6">
            {[
              { label: "Interns", items: internDoctors },
              { label: "HMOs", items: hmoDoctors },
              { label: "Other", items: otherDoctors },
            ].map(
              ({ label, items }) =>
                items.length > 0 && (
                  <section key={label}>
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
                      {label}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {items.map((doc) => (
                        <button
                          key={doc.id}
                          onClick={() => setSelected(doc)}
                          className="text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-400 hover:shadow-md transition group"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                              style={{ backgroundColor: doc.color }}
                            >
                              {doc.name
                                .split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-800 group-hover:text-blue-700 truncate">
                                {doc.name}
                              </div>
                              <div className="text-xs text-slate-500 truncate">
                                {doc.role} – {doc.unit}
                              </div>
                              {doc.position && (
                                <div className="text-xs text-slate-400 truncate">{doc.position}</div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                )
            )}
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-xs text-slate-400">
        AWH Roaster – Albury Base Hospital Medicine Department
      </footer>
    </div>
  );
}
