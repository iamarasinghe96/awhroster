import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { Doctor } from "@/lib/types";

const DOCTORS_PATH = path.join(process.cwd(), "data", "doctors.json");

function readDoctors(): Doctor[] {
  const data = JSON.parse(fs.readFileSync(DOCTORS_PATH, "utf-8"));
  return data.doctors as Doctor[];
}

function writeDoctors(doctors: Doctor[]): void {
  fs.writeFileSync(DOCTORS_PATH, JSON.stringify({ doctors }, null, 2), "utf-8");
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const doctors = readDoctors();
  const idx = doctors.findIndex((d) => d.id === params.id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  doctors[idx] = { ...doctors[idx], ...body, id: params.id };
  writeDoctors(doctors);
  return NextResponse.json(doctors[idx]);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const doctors = readDoctors();
  const filtered = doctors.filter((d) => d.id !== params.id);
  if (filtered.length === doctors.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  writeDoctors(filtered);
  return NextResponse.json({ ok: true });
}
