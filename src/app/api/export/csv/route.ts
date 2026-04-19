import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { Doctor, MonthlySchedule, Shift } from "@/lib/types";
import { generateDoctorCSV, generateAdminCSV } from "@/lib/scheduleUtils";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const doctorId = searchParams.get("doctorId");
  const month = searchParams.get("month");
  const admin = searchParams.get("admin") === "true";

  const doctorsData = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "doctors.json"), "utf-8")
  );
  const doctors: Doctor[] = doctorsData.doctors;

  const allShifts: Shift[] = [];
  if (month) {
    const filePath = path.join(process.cwd(), "data", "schedules", `${month}.json`);
    if (fs.existsSync(filePath)) {
      const schedule = JSON.parse(fs.readFileSync(filePath, "utf-8")) as MonthlySchedule;
      allShifts.push(...schedule.shifts);
    }
  } else {
    const schedDir = path.join(process.cwd(), "data", "schedules");
    const files = fs.readdirSync(schedDir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const schedule = JSON.parse(
        fs.readFileSync(path.join(schedDir, file), "utf-8")
      ) as MonthlySchedule;
      allShifts.push(...schedule.shifts);
    }
  }

  let csv: string;
  let filename: string;

  if (admin) {
    csv = generateAdminCSV(allShifts, doctors);
    filename = `roster_admin_${month ?? "all"}.csv`;
  } else {
    const doctor = doctors.find((d) => d.id === doctorId);
    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }
    const doctorShifts = allShifts.filter((s) => s.doctorId === doctorId);
    csv = generateDoctorCSV(doctorShifts, doctor);
    filename = `${doctor.name.replace(/\s+/g, "_")}_roster_${month ?? "all"}.csv`;
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
