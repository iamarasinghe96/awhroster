import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import type { Doctor } from "@/lib/types";

const DOCTORS_PATH = path.join(process.cwd(), "data", "doctors.json");

function readDoctors(): Doctor[] {
  const data = JSON.parse(fs.readFileSync(DOCTORS_PATH, "utf-8"));
  return data.doctors as Doctor[];
}

function writeDoctors(doctors: Doctor[]): void {
  fs.writeFileSync(DOCTORS_PATH, JSON.stringify({ doctors }, null, 2), "utf-8");
}

export async function GET() {
  const doctors = readDoctors();
  return NextResponse.json({ doctors });
}

export async function POST(req: Request) {
  const body = await req.json();
  const doctors = readDoctors();

  const newDoctor: Doctor = {
    id: uuidv4(),
    name: body.name,
    role: body.role,
    unit: body.unit,
    position: body.position,
    color: body.color ?? randomColor(),
    email: body.email,
  };

  doctors.push(newDoctor);
  writeDoctors(doctors);
  return NextResponse.json(newDoctor, { status: 201 });
}

function randomColor(): string {
  const colors = [
    "#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#14B8A6",
    "#EC4899", "#EF4444", "#6366F1", "#F97316", "#06B6D4",
    "#65A30D", "#D97706", "#F43F5E", "#059669", "#7C3AED",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
