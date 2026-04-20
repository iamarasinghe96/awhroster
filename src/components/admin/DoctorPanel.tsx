"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Doctor, Shift } from "@/lib/types";
import { getDoctorTotalHours } from "@/lib/scheduleUtils";

interface DraggableDoctorCardProps {
  doctor: Doctor;
  monthShifts: Shift[];
  onEdit: (doctor: Doctor) => void;
  onDelete: (id: string) => void;
}

function DraggableDoctorCard({ doctor, monthShifts, onEdit, onDelete }: DraggableDoctorCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `doctor-${doctor.id}`,
    data: { type: "doctor", doctor },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  const totalHours = getDoctorTotalHours(monthShifts, doctor.id);
  const shiftsCount = monthShifts.filter(
    (s) => s.doctorId === doctor.id && !["off", "request_off"].includes(s.type)
  ).length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition group"
    >
      <div
        {...listeners}
        {...attributes}
        className="px-3 py-2.5 flex items-center gap-2.5 cursor-grab active:cursor-grabbing hover:bg-slate-50"
      >
        <div className="text-slate-300 select-none text-xs">⠃⠇</div>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: doctor.color }}
        >
          {doctor.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-800 truncate">{doctor.name}</div>
          <div className="text-xs text-slate-500 truncate">
            {doctor.role} – {doctor.unit}
          </div>
          {doctor.position && (
            <div className="text-xs text-slate-400 truncate">{doctor.position}</div>
          )}
        </div>
      </div>

      <div className="px-3 pb-2.5 flex items-center justify-between">
        <div className="flex gap-3 text-xs">
          <span className="text-blue-700 font-semibold">{totalHours}h</span>
          <span className="text-slate-400">{shiftsCount} shift{shiftsCount !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={() => onEdit(doctor)}
            className="text-xs text-slate-500 hover:text-blue-600 px-1.5 py-0.5 rounded hover:bg-blue-50"
          >
            Edit
          </button>
          <button
            onClick={() => {
              if (confirm(`Remove ${doctor.name}?`)) onDelete(doctor.id);
            }}
            className="text-xs text-slate-500 hover:text-red-600 px-1.5 py-0.5 rounded hover:bg-red-50"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

interface Props {
  doctors: Doctor[];
  monthShifts: Shift[];
  onAddDoctor: () => void;
  onEditDoctor: (doctor: Doctor) => void;
  onDeleteDoctor: (id: string) => void;
  filterRole: string;
  onFilterRole: (role: string) => void;
}

export default function DoctorPanel({
  doctors,
  monthShifts,
  onAddDoctor,
  onEditDoctor,
  onDeleteDoctor,
  filterRole,
  onFilterRole,
}: Props) {
  const roles = ["All", "Intern", "HMO", "Registrar", "Consultant"];

  const filtered = filterRole === "All" ? doctors : doctors.filter((d) => d.role === filterRole);
  const totalMonthHours = monthShifts
    .filter((s) => !["off", "request_off"].includes(s.type))
    .reduce((acc, s) => {
      const [sh, sm] = s.startTime.split(":").map(Number);
      const [eh, em] = s.endTime.split(":").map(Number);
      const h = (eh * 60 + em - sh * 60 - sm) / 60;
      return acc + (h > 0 ? h : 0);
    }, 0);

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col bg-slate-50 border-r border-slate-200 h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-slate-700">Medical Staff</h2>
          <button
            onClick={onAddDoctor}
            className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            + Add
          </button>
        </div>
        <div className="text-xs text-slate-400">
          {doctors.length} doctors · {Math.round(totalMonthHours)}h scheduled this month
        </div>
      </div>

      <div className="px-3 py-2 border-b border-slate-200 bg-white flex gap-1 overflow-x-auto">
        {roles.map((r) => (
          <button
            key={r}
            onClick={() => onFilterRole(r)}
            className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap transition ${
              filterRole === r
                ? "bg-blue-600 text-white"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
        <p className="text-xs text-amber-700">
          Drag a doctor card onto any calendar cell to schedule a shift
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">No doctors found</p>
        )}
        {filtered.map((doc) => (
          <DraggableDoctorCard
            key={doc.id}
            doctor={doc}
            monthShifts={monthShifts}
            onEdit={onEditDoctor}
            onDelete={onDeleteDoctor}
          />
        ))}
      </div>
    </aside>
  );
}
