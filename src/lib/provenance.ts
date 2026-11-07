// Source control for every fact the workbench shows.
// Merge rule from the deck (Appendix A2): evidence = authority × freshness × reliability.
// Highest wins; if the top two differ by under 10%, Maria decides; her confirmation scores 3, the maximum.

export const TODAY = new Date("2026-11-09T08:00:00");

export type SrcId = "D1" | "D2" | "D3" | "D4" | "D5" | "D6" | "D7" | "D8" | "D9" | "D10" | "D11" | "D12" | "D13" | "MARIA";

type Source = { id: SrcId; name: string; family: string; accuracy: number; cadence: string; recordType: string; lineage: { label: string; detail: string }[] };

// accuracy ratings 1–3 from Appendix A1
export const SOURCES: Record<SrcId, Source> = {
  D1: { id: "D1", name: "834 eligibility file", family: "Plan’s own records", accuracy: 2, cadence: "Monthly to daily files", recordType: "834 enrollment record", lineage: [{ label: "State / CMS enrollment", detail: "Member coverage" }, { label: "834 eligibility file", detail: "Daily delta" }] },
  D2: { id: "D2", name: "Hospital ADT feed", family: "Clinical events", accuracy: 2.5, cadence: "Real time", recordType: "HL7 ADT message", lineage: [{ label: "Hospital ADT system", detail: "Admit / discharge event" }, { label: "HL7 A01 / A03 feed", detail: "Real-time, CMS CoP" }] },
  D3: { id: "D3", name: "Discharge summary", family: "Clinical events", accuracy: 2, cadence: "Days to weeks", recordType: "C-CDA discharge summary", lineage: [{ label: "Hospital EHR", detail: "Discharging clinician" }, { label: "HIE", detail: "C-CDA discharge summary" }] },
  D4: { id: "D4", name: "Pharmacy claim", family: "Medications", accuracy: 3, cadence: "Daily", recordType: "NCPDP pharmacy claim", lineage: [{ label: "Pharmacy counter", detail: "Dispensed" }, { label: "PBM switch", detail: "NCPDP claim, adjudicated" }] },
  D5: { id: "D5", name: "Surescripts med history", family: "Medications", accuracy: 2, cadence: "Real-time query", recordType: "Surescripts medication history", lineage: [{ label: "Prescriber EHR", detail: "e-prescription" }, { label: "Surescripts", detail: "Medication history query" }] },
  D6: { id: "D6", name: "Medical claims", family: "Claims and analytics", accuracy: 2.5, cadence: "40–45 days", recordType: "837 medical claim", lineage: [{ label: "Provider billing", detail: "Coded encounter" }, { label: "837 claim", detail: "ICD-10, adjudicated" }] },
  D7: { id: "D7", name: "Lab results", family: "Clinical events", accuracy: 2.5, cadence: "1–3 days", recordType: "HL7 ORU lab result", lineage: [{ label: "Lab system", detail: "Result" }, { label: "HL7 ORU", detail: "LOINC coded" }] },
  D8: { id: "D8", name: "Risk model", family: "Claims and analytics", accuracy: 1.5, cadence: "Monthly", recordType: "Risk model output", lineage: [{ label: "Claims history", detail: "Monthly run" }, { label: "Risk model", detail: "LACE-style score" }] },
  D9: { id: "D9", name: "HEDIS gap engine", family: "Claims and analytics", accuracy: 2, cadence: "Monthly, deadlines daily", recordType: "HEDIS gap list", lineage: [{ label: "Claims + alerts", detail: "Measure inputs" }, { label: "HEDIS engine", detail: "Gap and deadline" }] },
  D10: { id: "D10", name: "Care management record", family: "Plan’s own records", accuracy: 2, cadence: "Live", recordType: "Care management record", lineage: [{ label: "Care team", detail: "Notes and fields" }, { label: "Care management system", detail: "Live record" }] },
  D11: { id: "D11", name: "Health risk assessment", family: "Plan’s own records", accuracy: 1.5, cadence: "Yearly", recordType: "Health risk assessment response", lineage: [{ label: "Member survey", detail: "Self-reported" }, { label: "HRA vendor", detail: "Yearly cycle" }] },
  D12: { id: "D12", name: "Contact data vendor", family: "Contact and social", accuracy: 1, cadence: "Logs live; vendor monthly", recordType: "Contact data append", lineage: [{ label: "Contact vendor", detail: "Phone append" }, { label: "Monthly file", detail: "Appended numbers" }] },
  D13: { id: "D13", name: "Prior auth (UM)", family: "Plan’s own records", accuracy: 2.5, cadence: "Live", recordType: "UM prior authorization", lineage: [{ label: "Provider request", detail: "Equipment / service" }, { label: "UM system", detail: "Review status" }] },
  MARIA: { id: "MARIA", name: "Maria R., RN", family: "Clinician confirmation", accuracy: 3, cadence: "On each signed call", recordType: "Signed call note", lineage: [{ label: "Maria’s call", detail: "Heard from the patient or caregiver" }, { label: "Signed note", detail: "Clinician confirmed" }] },
};

export type FieldType = "med_status" | "med_pickup" | "diagnosis" | "event" | "phone" | "language" | "caregiver" | "housing" | "function" | "other";

// authority 1–3 by field (Appendix A2); Maria-confirmed is always 3; unlisted sources score 1
const AUTH: Record<FieldType, Partial<Record<SrcId, number>>> = {
  med_status: { D3: 3, D5: 2, D4: 1 },
  med_pickup: { D5: 2, D4: 3 },
  diagnosis: { D3: 3, D6: 2, D2: 1 },
  event: { D3: 2, D6: 1, D2: 3 },
  phone: { D1: 1, D12: 2, D10: 2, D2: 2 },
  language: { D1: 2, D10: 2 },
  caregiver: { D3: 2, D11: 2, D10: 2 },
  housing: { D3: 2, D11: 2, D10: 2 },
  function: { D3: 2, D11: 2, D10: 2 },
  other: {},
};

export type PVersion = {
  id: string;
  value: string;
  src: SrcId;
  observed: string; // ISO date the fact was true
  received?: string; // ISO date it reached HiLabs
  ref: string; // source record id
  kind: "ingest" | "confirmed" | "revert";
  org?: string; // the organisation behind the record
  note?: string;
  flagged?: boolean;
};

export type PFact = { key: string; patientId: string; label: string; group: string; type: FieldType; versions: PVersion[] };

export type Scored = { v: PVersion; authority: number; freshness: number; reliability: number; score: number; ageDays: number; superseded?: boolean };
export type Decision = { ranked: Scored[]; winner: Scored; runnerUp?: Scored; tie: boolean };

const day = 86400000;
export const ageDays = (iso: string) => Math.max(0, Math.round((TODAY.getTime() - new Date(iso + "T08:00:00").getTime()) / day));
const freshness = (days: number) => (days <= 7 ? 1 : days <= 90 ? 0.5 : 0.25);

/** Age bands, the same cut-offs as the freshness score: fresh up to a week, ageing up to 3 months, then out of date. */
export type Band = "fresh" | "ageing" | "old";
export const bandOf = (days: number): Band => (days <= 7 ? "fresh" : days <= 90 ? "ageing" : "old");
export const BANDS: Record<Band, { label: string; hint: string }> = {
  fresh: { label: "Fresh", hint: "within a week" },
  ageing: { label: "Ageing", hint: "within 3 months" },
  old: { label: "Outdated", hint: "older, ask again" },
};
/** Days between when a fact was true and when it reached HiLabs. */
export const lateDays = (v: { observed: string; received?: string }) =>
  v.received ? Math.max(0, Math.round((new Date(v.received).getTime() - new Date(v.observed).getTime()) / day)) : 0;
export const lateLabel = (n: number) => (n <= 0 ? "" : n === 1 ? "Arrived 1 day late" : n < 14 ? `Arrived ${n} days late` : `Arrived ${Math.round(n / 7)} weeks late`);

export function scoreOf(v: PVersion, type: FieldType): Scored {
  const a = ageDays(v.observed);
  if (v.src === "MARIA") return { v, authority: 3, freshness: freshness(a), reliability: 1, score: 3 * freshness(a), ageDays: a };
  const authority = AUTH[type][v.src] ?? 1;
  const reliability = SOURCES[v.src].accuracy / 3;
  const f = freshness(a);
  return { v, authority, freshness: f, reliability, score: v.flagged ? 0 : Math.round(authority * f * reliability * 100) / 100, ageDays: a };
}

export function decide(f: PFact): Decision {
  // within one source only its latest record counts; older ones are superseded, not conflicts
  const latest = new Map<SrcId, string>();
  [...f.versions]
    .filter((v) => !v.flagged)
    .sort((a, b) => (a.observed < b.observed ? 1 : a.observed > b.observed ? -1 : f.versions.indexOf(b) - f.versions.indexOf(a)))
    .forEach((v) => {
      if (!latest.has(v.src)) latest.set(v.src, v.id);
    });
  const ranked = f.versions
    .map((v) => ({ ...scoreOf(v, f.type), superseded: !v.flagged && latest.get(v.src) !== v.id }))
    .sort((x, y) => Number(!!x.superseded) - Number(!!y.superseded) || y.score - x.score || (x.v.observed < y.v.observed ? 1 : -1));
  const winner = ranked[0];
  const runnerUp = ranked.find((r) => !r.superseded && !r.v.flagged && r.v.value !== winner.v.value);
  // Maria's latest word always stands; otherwise a near-tie on different values goes to her
  const tie = winner.v.src !== "MARIA" && !!runnerUp && runnerUp.score > 0 && winner.score - runnerUp.score < winner.score * 0.1;
  return { ranked, winner, runnerUp, tie };
}

export const fmtDate = (iso: string) => {
  const d = new Date(iso + "T08:00:00");
  const sameYear = d.getFullYear() === TODAY.getFullYear();
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
};

export const ageLabel = (iso: string) => {
  const a = ageDays(iso);
  return a === 0 ? "today" : a === 1 ? "yesterday" : a < 14 ? `${a} days ago` : a < 60 ? `${Math.round(a / 7)} weeks ago` : a < 365 ? `${Math.round(a / 30)} months ago` : "over a year ago";
};

/** The raw source record behind one version (shown on the history page). */
export function rawRecord(v: PVersion, f: PFact): [string, string][] {
  const s = SOURCES[v.src];
  return [
    ["source", `${s.name}${v.org ? ` · ${v.org}` : ""}`],
    ["record_type", s.recordType],
    ["record_id", v.ref],
    ["member", f.patientId],
    ["field", f.label],
    ["value", v.value],
    ["observed", v.observed],
    ["received", v.received ?? v.observed],
    ...(v.received && v.received !== v.observed ? [["arrival_lag", `${Math.round((new Date(v.received).getTime() - new Date(v.observed).getTime()) / day)} days`] as [string, string]] : []),
    ["ingest", s.id === "MARIA" ? "signed in workbench" : "HiLabs standardise · codes mapped · member matched"],
    ...(v.note ? [["note", v.note] as [string, string]] : []),
  ];
}

/* ------------------------------------------------------------------ */
/* Facts with more than one source (hand-built from the deck/annex)    */
/* ------------------------------------------------------------------ */

const F = (key: string, patientId: string, group: string, label: string, type: FieldType, versions: Omit<PVersion, "kind">[]): PFact => ({
  key,
  patientId,
  group,
  label,
  type,
  versions: versions.map((v) => ({ ...v, kind: "ingest" })),
});

export const FACTS: Record<string, PFact> = Object.fromEntries(
  [
    // ---------- Tanya ----------
    F("tanya.sertraline", "tanya-brooks", "Medicines", "Sertraline 100 mg", "med_status", [
      { id: "s1", value: "Active, 100 mg daily", src: "D5", observed: "2026-06-15", org: "Dr K. Osei’s practice", ref: "SS-MH-40417" },
      { id: "s2", value: "Stopped", src: "D3", observed: "2026-11-02", received: "2026-11-04", org: "St Clare Hospital", ref: "CCDA-STCLARE-7781" },
      { id: "s3", value: "Refilled, 30 days", src: "D4", observed: "2026-11-05", received: "2026-11-06", org: "Retail pharmacy #4471", ref: "NCPDP-5520918" },
    ]),
    F("tanya.aripiprazole", "tanya-brooks", "Medicines", "Aripiprazole 5 mg", "med_pickup", [
      { id: "a1", value: "New on discharge, 5 mg daily", src: "D5", observed: "2026-11-02", org: "St Clare Hospital", ref: "SS-MH-40652" },
      { id: "a2", value: "Picked up 3 Nov", src: "D4", observed: "2026-11-03", received: "2026-11-04", org: "Retail pharmacy #4471", ref: "NCPDP-5519302" },
    ]),
    F("tanya.housing", "tanya-brooks", "Social needs", "Housing", "housing", [
      { id: "h1", value: "Stable home, lives alone", src: "D11", observed: "2026-02-20", ref: "HRA-2026-0220-TB" },
      { id: "h2", value: "Staying with a friend", src: "D3", observed: "2026-11-02", received: "2026-11-04", org: "St Clare Hospital", ref: "CCDA-STCLARE-7781" },
    ]),
    F("tanya.conditions", "tanya-brooks", "Conditions", "Conditions", "diagnosis", [
      { id: "c1", value: "Depression (F32.9)", src: "D6", observed: "2026-09-14", received: "2026-10-27", ref: "837-88120-TB" },
      { id: "c2", value: "Major depression, anxiety", src: "D3", observed: "2026-11-02", received: "2026-11-04", org: "St Clare Hospital", ref: "CCDA-STCLARE-7781" },
    ]),
    F("tanya.event", "tanya-brooks", "Recent events", "Recent hospital stay", "event", [
      { id: "e1", value: "Admitted, St Clare Behavioral Unit", src: "D2", observed: "2026-10-28", org: "St Clare Hospital", ref: "ADT-A01-998121" },
      { id: "e2", value: "St Clare Behavioral Unit, 28 Oct – 2 Nov", src: "D2", observed: "2026-11-02", org: "St Clare Hospital", ref: "ADT-A03-998770" },
    ]),
    F("tanya.phone", "tanya-brooks", "Contact", "Phone", "phone", [
      { id: "p1", value: "(555) 012-6678 · mobile", src: "D1", observed: "2026-11-01", ref: "834-TB-1101" },
      { id: "p2", value: "(555) 012-6678 · mobile", src: "D3", observed: "2026-11-02", received: "2026-11-04", org: "St Clare Hospital", ref: "CCDA-STCLARE-7781" },
    ]),

    // ---------- Walter (deck page 9 stress test) ----------
    F("walter.furosemide", "walter-briggs", "Medicines", "Furosemide", "med_status", [
      { id: "w1", value: "20 mg once daily", src: "D5", observed: "2026-03-12", org: "Dr P. Lang’s practice", ref: "SS-MH-28840" },
      { id: "w2", value: "Filled 20 mg, 30 days", src: "D4", observed: "2026-10-20", received: "2026-10-21", org: "Retail pharmacy #2290", ref: "NCPDP-5479014" },
      { id: "w3", value: "40 mg twice daily", src: "D3", observed: "2026-11-07", received: "2026-11-08", org: "Mercy General Hospital", ref: "CCDA-MERCY-4417" },
    ]),

    // ---------- Mrs Chan (annex) ----------
    F("chan.amlodipine", "lai-fong-chan", "Medicines", "Amlodipine", "med_status", [
      { id: "m1", value: "Active, one supply", src: "D5", observed: "2026-09-01", org: "Dr H. Wong", ref: "SS-MH-31877" },
      { id: "m2", value: "Filled at the first pharmacy", src: "D4", observed: "2026-10-20", received: "2026-10-21", org: "First pharmacy", ref: "NCPDP-5480211" },
      { id: "m3", value: "Filled again at a second pharmacy", src: "D4", observed: "2026-10-22", received: "2026-10-23", org: "Second pharmacy", ref: "NCPDP-5481990" },
    ]),
    F("chan.language", "lai-fong-chan", "Contact", "Language", "language", [
      { id: "l1", value: "English", src: "D1", observed: "2026-10-01", ref: "834-LFC-1001" },
      { id: "l2", value: "Cantonese, interpreter needed", src: "D10", observed: "2026-10-30", ref: "CM-LFC-3010" },
    ]),
    F("chan.mobility", "lai-fong-chan", "Functioning", "Mobility", "function", [
      { id: "f1", value: "Walks without help", src: "D11", observed: "2025-11-15", ref: "HRA-2025-1115-LFC" },
      { id: "f2", value: "Uses a walker; needs help on stairs", src: "D3", observed: "2026-10-16", received: "2026-10-19", org: "Rehab facility (SNF)", ref: "CCDA-SNF-2210" },
    ]),
    F("chan.caregiver", "lai-fong-chan", "Social needs", "Caregiver", "caregiver", [
      { id: "g1", value: "Lives alone", src: "D11", observed: "2025-11-15", ref: "HRA-2025-1115-LFC" },
      { id: "g2", value: "Daughter Grace; strain noted, “sounds exhausted, missing work”", src: "D10", observed: "2026-10-30", ref: "CM-LFC-3010" },
    ]),
    F("chan.bed", "lai-fong-chan", "Social needs", "Equipment", "other", [
      { id: "b1", value: "Hospital bed requested", src: "D13", observed: "2026-10-26", ref: "UM-PA-77310" },
      { id: "b2", value: "Hospital bed: pending, no decision", src: "D13", observed: "2026-11-09", ref: "UM-PA-77310" },
    ]),
    F("chan.event", "lai-fong-chan", "Recent events", "Recent events", "event", [
      { id: "v1", value: "Hip fracture admission", src: "D6", observed: "2026-08-12", received: "2026-09-24", ref: "837-71200-LFC" },
      { id: "v2", value: "Rehab (SNF) discharge 16 Oct", src: "D3", observed: "2026-10-16", received: "2026-10-19", org: "Rehab facility (SNF)", ref: "CCDA-SNF-2210" },
    ]),
    F("chan.conditions", "lai-fong-chan", "Conditions", "Conditions", "diagnosis", [
      { id: "d1", value: "Dementia (moderate), hip fracture, hypertension", src: "D6", observed: "2026-08-12", received: "2026-09-24", ref: "837-71200-LFC" },
    ]),
    F("chan.phone", "lai-fong-chan", "Contact", "Main contact", "phone", [
      { id: "n1", value: "(555) 016-8891 · Grace, mobile", src: "D10", observed: "2026-10-30", ref: "CM-LFC-3010" },
    ]),
  ].map((f) => [f.key, f]),
);

/* ------------------------------------------------------------------ */
/* Everything else: a single-source fact built from a label + source    */
/* ------------------------------------------------------------------ */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const iso = (d: Date) => d.toISOString().slice(0, 10);
const minus = (n: number) => iso(new Date(TODAY.getTime() - n * day));

export function ageToIso(age: string): string {
  const a = age.toLowerCase();
  let m: RegExpMatchArray | null;
  if ((m = a.match(/(\d+)\s*days?/))) return minus(+m[1]);
  if ((m = a.match(/(\d+)\s*weeks?/))) return minus(+m[1] * 7);
  if ((m = age.match(/(\d{1,2}) ([A-Z][a-z]{2})/))) return `2026-${String(MONTHS.indexOf(m[2]) + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  if ((m = age.match(/([A-Z][a-z]{2}) (\d{4})/))) return `${m[2]}-${String(MONTHS.indexOf(m[1]) + 1).padStart(2, "0")}-15`;
  if ((m = age.match(/^([A-Z][a-z]{2})$/))) return `2026-${String(MONTHS.indexOf(m[1]) + 1).padStart(2, "0")}-15`;
  if (a.includes("today") || a.includes("live")) return minus(0);
  if (a.includes("yesterday")) return minus(1);
  if (a.includes("week")) return minus(3);
  return minus(30);
}

export function srcFromName(name: string): SrcId {
  const n = name.toLowerCase();
  if (n.includes("discharge")) return "D3";
  if (n.includes("pharmacy")) return "D4";
  if (n.includes("prescription") || n.includes("med history")) return "D5";
  if (n.includes("eligib") || n.includes("member file")) return "D1";
  if (n.includes("hra") || n.includes("health form")) return "D11";
  if (n.includes("prior auth")) return "D13";
  if (n.includes("care gap") || n.includes("hedis")) return "D9";
  if (n.includes("alert") || n.includes("admit")) return "D2";
  if (n.includes("claim")) return "D6";
  if (n.includes("risk")) return "D8";
  if (n.includes("contact")) return "D12";
  if (n.includes("lab")) return "D7";
  return "D10";
}

export type Seed = { patientId: string; group: string; label: string; value: string; source: string; age: string; type?: FieldType };

export function seedFact(key: string, s: Seed): PFact {
  const src = srcFromName(s.source);
  return {
    key,
    patientId: s.patientId,
    group: s.group,
    label: s.label,
    type: s.type ?? "other",
    versions: [{ id: "x1", value: s.value, src, observed: ageToIso(s.age), ref: `${src}-${key.replace(/[^a-z0-9]/gi, "").slice(-10).toUpperCase()}`, kind: "ingest" }],
  };
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
