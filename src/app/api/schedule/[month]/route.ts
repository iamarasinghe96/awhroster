import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { MonthlySchedule } from "@/lib/types";

function getSchedulePath(month: string): string {
  return path.join(process.cwd(), "data", "schedules", `${month}.json`);
}

export async function GET(
  _req: Request,
  { params }: { params: { month: string } }
) {
  const { month } = params;
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Invalid month format" }, { status: 400 });
  }

  const filePath = getSchedulePath(month);
  if (!fs.existsSync(filePath)) {
    const empty: MonthlySchedule = { month, lastModified: new Date().toISOString(), shifts: [] };
    return NextResponse.json(empty);
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as MonthlySchedule;
  return NextResponse.json(data);
}

export async function POST(
  req: Request,
  { params }: { params: { month: string } }
) {
  const { month } = params;
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Invalid month format" }, { status: 400 });
  }

  const body = (await req.json()) as { shifts: MonthlySchedule["shifts"] };
  const schedule: MonthlySchedule = {
    month,
    lastModified: new Date().toISOString(),
    shifts: body.shifts ?? [],
  };

  const filePath = getSchedulePath(month);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(schedule, null, 2), "utf-8");

  return NextResponse.json(schedule);
}
