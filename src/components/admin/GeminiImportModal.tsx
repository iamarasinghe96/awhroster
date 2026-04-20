"use client";

import { useState, useRef } from "react";
import { format, parseISO } from "date-fns";
import type { Doctor, Shift } from "@/lib/types";
import { SHIFT_COLORS } from "@/lib/types";

interface Props {
  doctors: Doctor[];
  monthKey: string;
  existingShifts: Shift[];
  onImport: (shifts: Shift[], mode: "replace" | "merge") => void;
  onClose: () => void;
}

const GEMINI_KEY_STORAGE = "awhroaster-gemini-key";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

function buildPrompt(doctors: Doctor[], monthKey: string): string {
  const monthLabel = format(parseISO(monthKey + "-01"), "MMMM yyyy");
  const doctorList = doctors
    .map((d) => `  - ID: "${d.id}" | Name: "${d.name}" | Role: ${d.role} | Default Unit: "${d.unit}"`)
    .join("\n");
  return `You are extracting a medical ward roster from a PDF file for ${monthLabel}.

Doctors in this system:
${doctorList}

Extract every shift entry visible in the PDF for ${monthLabel} (${monthKey}).

Rules:
- Match each person in the PDF to a Doctor ID by name (fuzzy/partial match is fine)
- Skip anyone who does not match a known doctor
- "date" must be "YYYY-MM-DD" format within ${monthKey}
- "startTime" / "endTime" must be "HH:mm" 24-hour format
- For "type" use exactly one of:
    "day"            standard day shift (~08:00-17:00)
    "evening"        evening shift (~14:00-22:00)
    "oncall"         on-call (~12:00-22:00, weekends)
    "short"          short/teaching (~08:00-12:00)
    "off"            scheduled day off  (startTime/endTime "00:00")
    "request_off"    requested day off  (startTime/endTime "00:00")
    "public_holiday" public holiday     (startTime/endTime "00:00")
- "unit" use the doctor default unit unless the PDF says otherwise
- Assign IDs sequentially: "g001", "g002", ...
- Include "notes" only if the PDF has specific notes for that shift

Return ONLY a valid JSON array, no markdown, no explanation:
[{"id":"g001","doctorId":"1","date":"${monthKey}-01","startTime":"08:00","endTime":"17:00","type":"day","unit":"Unit 1"}]`;
}

type Step = "input" | "loading" | "preview" | "error";

export default function GeminiImportModal({ doctors, monthKey, existingShifts, onImport, onClose }: Props) {
  const [apiKey, setApiKey] = useState<string>(
    typeof window !== "undefined" ? localStorage.getItem(GEMINI_KEY_STORAGE) ?? "" : ""
  );
  const [saveKey, setSaveKey] = useState(true);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState("");
  const [extracted, setExtracted] = useState<Shift[]>([]);
  const [mode, setMode] = useState<"replace" | "merge">("replace");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExtract = async () => {
    if (!pdfFile || !apiKey.trim()) return;
    setStep("loading");
    setError("");
    try {
      if (saveKey) localStorage.setItem(GEMINI_KEY_STORAGE, apiKey.trim());
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(pdfFile);
      });
      const res = await fetch(`${GEMINI_API_URL}?key=${apiKey.trim()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [
            { inlineData: { mimeType: "application/pdf", data: base64 } },
            { text: buildPrompt(doctors, monthKey) },
          ]}],
          generationConfig: { responseMimeType: "application/json" },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? `API error ${res.status}`);
      }
      const data = await res.json();
      const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
      const shifts: Shift[] = JSON.parse(cleaned);
      if (!Array.isArray(shifts)) throw new Error("Gemini did not return an array");
      const validIds = new Set(doctors.map((d) => d.id));
      setExtracted(shifts.filter((s) => validIds.has(s.doctorId) && s.date?.startsWith(monthKey)));
      setStep("preview");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setStep("error");
    }
  };

  const doctorMap = Object.fromEntries(doctors.map((d) => [d.id, d]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-800">Import from PDF &mdash; Gemini AI</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Extracts shifts for <strong>{format(parseISO(monthKey + "-01"), "MMMM yyyy")}</strong>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {(step === "input" || step === "error") && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gemini API Key
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
                    className="ml-2 text-blue-600 font-normal hover:underline">Get a key &rarr;</a>
                </label>
                <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <label className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 cursor-pointer">
                  <input type="checkbox" checked={saveKey} onChange={(e) => setSaveKey(e.target.checked)} />
                  Save key in browser
                </label>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Roster PDF</label>
                <div onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition">
                  {pdfFile
                    ? <div className="text-sm text-slate-700 font-medium">{pdfFile.name}</div>
                    : <><div className="text-3xl mb-1">&#128196;</div><div className="text-sm text-slate-500">Click to select PDF</div></>}
                </div>
                <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
                  onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} />
              </div>
              {step === "error" && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                  <strong>Error:</strong> {error}
                </div>
              )}
            </>
          )}

          {step === "loading" && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Gemini is reading the PDF&hellip;</p>
              <p className="text-xs text-slate-400">This may take 10&ndash;30 seconds</p>
            </div>
          )}

          {step === "preview" && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm font-semibold text-slate-700">{extracted.length} shifts extracted</p>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="mode" value="replace" checked={mode === "replace"} onChange={() => setMode("replace")} />
                    <span className="font-medium">Replace month</span>
                    <span className="text-slate-400">({existingShifts.filter(s => s.date.startsWith(monthKey)).length} existing removed)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="mode" value="merge" checked={mode === "merge"} onChange={() => setMode("merge")} />
                    <span className="font-medium">Merge</span>
                  </label>
                </div>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-auto max-h-80 text-xs">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0">
                    <tr className="bg-slate-100 text-slate-600 text-left">
                      <th className="px-2 py-1.5 font-semibold">Doctor</th>
                      <th className="px-2 py-1.5 font-semibold">Date</th>
                      <th className="px-2 py-1.5 font-semibold">Time</th>
                      <th className="px-2 py-1.5 font-semibold">Type</th>
                      <th className="px-2 py-1.5 font-semibold">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extracted.map((s) => {
                      const doc = doctorMap[s.doctorId];
                      const colors = SHIFT_COLORS[s.type];
                      return (
                        <tr key={s.id} className="border-t border-slate-100">
                          <td className="px-2 py-1 font-medium">
                            {doc ? (
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: doc.color }} />
                                {doc.name.split(" ").slice(0, 2).join(" ")}
                              </span>
                            ) : <span className="text-red-500">{s.doctorId}</span>}
                          </td>
                          <td className="px-2 py-1 text-slate-600">{format(parseISO(s.date), "EEE d MMM")}</td>
                          <td className="px-2 py-1 text-slate-600">
                            {["off","request_off","public_holiday"].includes(s.type) ? "—" : `${s.startTime}–${s.endTime}`}
                          </td>
                          <td className="px-2 py-1">
                            <span className={`px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>{s.type}</span>
                          </td>
                          <td className="px-2 py-1 text-slate-500 truncate max-w-[80px]">{s.unit}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 flex justify-between items-center">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
          <div className="flex gap-2">
            {step === "preview" && (
              <button onClick={() => setStep("input")}
                className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Back</button>
            )}
            {(step === "input" || step === "error") && (
              <button onClick={handleExtract} disabled={!pdfFile || !apiKey.trim()}
                className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg font-medium">
                Extract with Gemini
              </button>
            )}
            {step === "preview" && (
              <button onClick={() => { onImport(extracted, mode); onClose(); }}
                className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium">
                Apply {extracted.length} Shifts
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
