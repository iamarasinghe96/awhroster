import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { Doctor, MonthlySchedule, Shift } from "@/lib/types";
import { generateICalContent } from "@/lib/scheduleUtils";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const doctorId = searchParams.get("doctorId");
  const monthsParam = searchParams.getAll("month");
  const months = monthsParam.length > 0 ? monthsParam : [];

  const doctorsData = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "doctors.json"), "utf-8")
  );
  const doctors: Doctor[] = doctorsData.doctors;
  const doctor = doctorId ? doctors.find((d) => d.id === doctorId) : null;
  if (!doctor) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  const allShifts: Shift[] = [];
  for (const month of months) {
    const filePath = path.join(process.cwd(), "data", "schedules", `${month}.json`);
    if (fs.existsSync(filePath)) {
      const schedule = JSON.parse(fs.readFileSync(filePath, "utf-8")) as MonthlySchedule;
      allShifts.push(...schedule.shifts.filter((s) => s.doctorId === doctorId));
    }
  }

  if (months.length === 0) {
    // Load all available schedule files
    const schedDir = path.join(process.cwd(), "data", "schedules");
    const files = fs.readdirSync(schedDir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const schedule = JSON.parse(
        fs.readFileSync(path.join(schedDir, file), "utf-8")
      ) as MonthlySchedule;
      allShifts.push(...schedule.shifts.filter((s) => s.doctorId === doctorId));
    }
  }

  const ical = generateICalContent(allShifts, doctor);
  return new Response(ical, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${doctor.name.replace(/\s+/g, "_")}_roster.ics"`,
    },
  });
}
