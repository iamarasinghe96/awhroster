"use client";
import type { Holiday } from "@/lib/types";

interface Props {
  holiday: Holiday;
  compact?: boolean;
}

export default function HolidayBadge({ holiday, compact = false }: Props) {
  if (compact) {
    return (
      <span
        title={holiday.name}
        className="inline-block w-2 h-2 rounded-full bg-green-500 ml-1"
      />
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
      PH – {holiday.name}
    </span>
  );
}
