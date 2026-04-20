"use client";

import { useState } from "react";
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

function buildPrompt(doctors: Doctor[]): string {
  const doctorList = doctors
    .map((d) => `  - ID: "${d.id}" | Name: "${d.name}" | Role: ${d.role} | Default Unit: "${d.unit}"`)
    .join("\n");

  return `You are extracting a medical ward roster from a PDF.

Known doctors in this system:
${doctorList}

Extract ALL shifts visible in the entire PDF -- every page, every date.

RULES:
- Match each person in the PDF to a Doctor ID by name (partial/fuzzy match is fine)
- Skip anyone not in the doctor list above
- "date" must be "YYYY-MM-DD" format -- read the actual dates from the PDF
- "startTime" and "endTime" must be "HH:mm" 24-hour format (e.g. 0800-1700 becomes "08:00" and "17:00")
- For "type" use exactly one of:
    "day"            standard day shift (e.g. 0800-1700, 0800-1600)
    "evening"        evening shift (e.g. 1400-2200, 1500-2200)
    "oncall"         on-call shift (e.g. 1200-2200, weekends)
    "short"          short/teaching shift (e.g. 0800-1200, 0800-1300)
    "off"            day off (marked OFF) -- use startTime/endTime "00:00"
    "request_off"    requested day off (marked Request OFF) -- use startTime/endTime "00:00"
    "public_holiday" public holiday (marked PH or Public Holiday) -- use startTime/endTime "00:00"
- "unit" use the doctor's default unit unless the PDF says otherwise
- Assign IDs sequentially: "g001", "g002", "g003", ...
- Include "notes" only if the PDF has specific notes for that shift

Return ONLY a valid JSON array -- no markdown, no explanation, no code blocks:
[
  {"id":"g001","doctorId":"<ID>","date":"2026-03-23","startTime":"08:00","endTime":"17:00","type":"day","unit":"Unit 1"},
  ...
]`;
}

type Step = "prompt" | "paste" | "preview";

export default function GeminiImportModal({
  doctors,
  monthKey,
  existingShifts,
  onImport,
  onClose,
}: Props) {
  const [step, setStep] = useState<Step>("prompt");
  const [copied, setCopied] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [parseError, setParseError] = useState("");
  const [extracted, setExtracted] = useState<Shift[]>([]);
  const [mode, setMode] = useState<"replace" | "merge">("replace");

  const prompt = buildPrompt(doctors);
  const monthLabel = format(parseISO(monthKey + "-01"), "MMMM yyyy");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleParse = () => {
    setParseError("");
    try {
      const cleaned = jsonText
        .replace(/^```(?:json)?\n?/m, "")
        .replace(/\n?```$/m, "")
        .trim();
      const parsed: Shift[] = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) throw new Error("Expected a JSON array");

      const validIds = new Set(doctors.map((d) => d.id));
      const valid = parsed.filter(
        (s) => validIds.has(s.doctorId) && typeof s.date === "string"
      );

      if (valid.length === 0) throw new Error("No valid shifts found -- check that doctor names match");

      setExtracted(valid);
      setStep("preview");
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleConfirm = () => {
    onImport(extracted, mode);
    onClose();
  };

  const doctorMap = Object.fromEntries(doctors.map((d) => [d.id, d]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-800">Import Roster from PDF</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Use Gemini or ChatGPT to extract shifts for <strong>{monthLabel}</strong>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">x</button>
        </div>

        <div className="flex border-b border-slate-100 text-xs">
          {(["prompt", "paste", "preview"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`flex-1 py-2 text-center font-medium transition ${
                step === s
                  ? "text-violet-700 border-b-2 border-violet-600 bg-violet-50"
                  : "text-slate-400"
              }`}
            >
              {i + 1}. {s === "prompt" ? "Copy Prompt" : s === "paste" ? "Paste JSON" : "Preview & Apply"}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {step === "prompt" && (
            <>
              <div className="bg-violet-50 border border-violet-200 rounded-lg px-4 py-3 text-sm text-violet-800 space-y-1">
                <p className="font-semibold">How to use:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs text-violet-700">
                  <li>Click <strong>Copy Prompt</strong> below</li>
                  <li>Open <strong>gemini.google.com</strong> or ChatGPT</li>
                  <li>Attach your roster <strong>PDF file</strong></li>
                  <li>Paste the prompt and send</li>
                  <li>Come back here and paste the JSON response</li>
                </ol>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Generated Prompt</label>
                  <button
                    onClick={handleCopy}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                      copied
                        ? "bg-emerald-600 text-white"
                        : "bg-violet-600 hover:bg-violet-700 text-white"
                    }`}
                  >
                    {copied ? "Copied!" : "Copy Prompt"}
                  </button>
                </div>
                <textarea
                  readOnly
                  value={prompt}
                  rows={12}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-600 bg-slate-50 resize-none focus:outline-none"
                />
              </div>
            </>
          )}

          {step === "paste" && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-700">
                Paste the JSON array that Gemini or ChatGPT returned. It should start with{" "}
                <code className="bg-blue-100 px-1 rounded">[</code> and end with{" "}
                <code className="bg-blue-100 px-1 rounded">]</code>.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Paste JSON here</label>
                <textarea
                  value={jsonText}
                  onChange={(e) => { setJsonText(e.target.value); setParseError(""); }}
                  rows={14}
                  placeholder={'[\n  {"id":"g001","doctorId":"...","date":"' + monthKey + '-01","startTime":"08:00","endTime":"17:00","type":"day","unit":"Unit 1"},\n  ...\n]'}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>

              {parseError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                  <strong>Parse error:</strong> {parseError}
                </div>
              )}
            </>
          )}

          {step === "preview" && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">{extracted.length} shifts extracted</p>
                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="mode" value="replace" checked={mode === "replace"} onChange={() => setMode("replace")} />
                    <span className="font-medium">Replace month</span>
                    <span className="text-slate-400">
                      (clears {existingShifts.filter((s) => s.date.startsWith(monthKey)).length} existing)
                    </span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="mode" value="merge" checked={mode === "merge"} onChange={() => setMode("merge")} />
                    <span className="font-medium">Merge</span>
                  </label>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                <table className="w-full border-collapse">
                  <thead>
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
                          <td className="px-2 py-1 font-medium text-slate-700">
                            {doc ? (
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: doc.color }} />
                                {doc.name.split(" ").slice(0, 2).join(" ")}
                              </span>
                            ) : (
                              <span className="text-red-500">{s.doctorId}</span>
                            )}
                          </td>
                          <td className="px-2 py-1 text-slate-600">{format(parseISO(s.date), "EEE d MMM")}</td>
                          <td className="px-2 py-1 text-slate-600">
                            {["off", "request_off", "public_holiday"].includes(s.type)
                              ? "-"
                              : `${s.startTime}-${s.endTime}`}
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

        <div className="px-5 py-3 border-t border-slate-200 flex justify-between items-center gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition">
            Cancel
          </button>
          <div className="flex gap-2">
            {step === "paste" && (
              <button onClick={() => setStep("prompt")} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition">
                Back
              </button>
            )}
            {step === "preview" && (
              <button onClick={() => setStep("paste")} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition">
                Back
              </button>
            )}
            {step === "prompt" && (
              <button onClick={() => setStep("paste")} className="px-5 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition">
                Next: Paste JSON
              </button>
            )}
            {step === "paste" && (
              <button
                onClick={handleParse}
                disabled={!jsonText.trim()}
                className="px-5 py-2 text-sm bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-lg font-medium transition"
              >
                Parse and Preview
              </button>
            )}
            {step === "preview" && (
              <button onClick={handleConfirm} className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition">
                Apply {extracted.length} Shifts
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
