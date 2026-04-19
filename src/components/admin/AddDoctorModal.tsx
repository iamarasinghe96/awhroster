"use client";

import { useState } from "react";
import type { DoctorRole } from "@/lib/types";
import { UNIT_OPTIONS } from "@/lib/types";

interface Props {
  onClose: () => void;
  onAdd: (doctor: {
    name: string;
    role: DoctorRole;
    unit: string;
    position?: string;
    color: string;
    email?: string;
  }) => void;
  initialValues?: {
    name?: string;
    role?: DoctorRole;
    unit?: string;
    position?: string;
    color?: string;
    email?: string;
  };
  title?: string;
}

const COLORS = [
  "#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#14B8A6",
  "#EC4899", "#EF4444", "#6366F1", "#F97316", "#06B6D4",
  "#65A30D", "#D97706", "#F43F5E", "#059669", "#7C3AED",
  "#DC2626", "#0891B2", "#4F46E5", "#B45309", "#BE185D",
];

const ROLES: DoctorRole[] = ["Intern", "HMO", "Registrar", "Consultant"];

export default function AddDoctorModal({ onClose, onAdd, initialValues, title }: Props) {
  const [form, setForm] = useState({
    name: initialValues?.name ?? "",
    role: (initialValues?.role ?? "Intern") as DoctorRole,
    unit: initialValues?.unit ?? "Unit 1",
    position: initialValues?.position ?? "",
    color: initialValues?.color ?? COLORS[Math.floor(Math.random() * COLORS.length)],
    email: initialValues?.email ?? "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onAdd({ ...form, position: form.position || undefined, email: form.email || undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4 text-white">
          <h2 className="text-lg font-bold">{title ?? "Add New Doctor"}</h2>
          <p className="text-blue-200 text-sm">Fill in the doctor's details</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Jane Smith"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as DoctorRole })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit *</label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Position / Specialty</label>
            <input
              type="text"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              placeholder="e.g. Oncology/HAEM HMO"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email (optional)</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="doctor@hospital.org.au"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Calendar Colour</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    form.color === c ? "ring-2 ring-offset-2 ring-slate-600 scale-110" : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              Add Doctor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
