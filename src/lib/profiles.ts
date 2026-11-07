// The full patient picture for "Open profile". Every fact carries its source and age.
// Tanya follows the wireframes; Mrs Chan follows the annex; the others are built from the call specs.
import { details, openTasks, patients } from "./data";
import { specs } from "./calls";

export type Version = { source: string; value: string; date: string; score: number; state: "current" | "conflict" | "older" };
export type Fact = { prov?: string; label?: string; value: string; source: string; age: string; tone?: "ok" | "conflict" | "stale" | "pending"; history?: { versions: Version[]; why: string } };
export type TimelineItem = {
  id: string;
  date: string;
  kind: "call" | "voicemail" | "discharge" | "refill" | "form" | "alert" | "note" | "auth";
  title: string;
  detail: string;
  call?: { duration: string; by: string; changed: { label: string; from?: string; to: string }[]; note: string; tasks: string[] };
};
export type Profile = {
  plan: string;
  language: string;
  contactLine: string;
  pcp: string;
  tier: { label: string; tone: "urgent" | "soon"; reason: string };
  alerts: Fact[];
  meds: (Fact & { name: string })[];
  conditions: Fact[];
  events: Fact[];
  gaps: (Fact & { due: string })[];
  social: Fact[];
  goals: string[];
  tasks: { text: string; owner: string; due: string }[];
  numbers: (Fact & { works: "yes" | "no" | "unknown" })[];
  bestTime: string;
  channel: string;
  consent: Fact[];
  timeline: TimelineItem[];
};

const byId = Object.fromEntries(patients.map((p) => [p.id, p]));

const rich: Record<string, Profile> = {
  "tanya-brooks": {
    plan: "Medicaid · M-52930",
    language: "English",
    contactLine: "Tanya (self) · (555) 012-6678",
    pcp: "Dr K. Osei",
    tier: { label: "Today", tone: "urgent", reason: "7-day check-up after a mental health stay is due today" },
    alerts: [
      { prov: "tanya.sertraline", value: "Sertraline: hospital stopped it on 2 Nov, pharmacy refilled it on 5 Nov", source: "Discharge note vs pharmacy claim", age: "4 days", tone: "conflict" },
      { prov: "tanya.housing", value: "Housing: hospital note says “staying with a friend”; health form says stable home", source: "Discharge note vs health form", age: "form 9 months old", tone: "stale" },
      { value: "7-day follow-up not booked yet", source: "Care gaps", age: "due today", tone: "pending" },
    ],
    meds: [
      {
        prov: "tanya.sertraline",
        name: "Sertraline 100 mg",
        value: "Stopped by the hospital",
        source: "Discharge note",
        age: "2 Nov",
        tone: "conflict",
        history: {
          versions: [
            { source: "Hospital discharge note", value: "Stopped", date: "2 Nov · arrived 4 Nov, 2 days late", score: 2.0, state: "current" },
            { source: "Pharmacy claim", value: "Refilled, 30 days", date: "5 Nov", score: 1.0, state: "conflict" },
            { source: "Prescription history", value: "Started, 100 mg daily", date: "15 Jun", score: 0.33, state: "older" },
          ],
          why: "The discharge note is the record of truth for medicines and is under a week old, so it outscores the pharmacy fill (2.00 vs 1.00).",
        },
      },
      { prov: "tanya.aripiprazole", name: "Aripiprazole 5 mg", value: "New, picked up 3 Nov", source: "Discharge note + pharmacy", age: "6 days", tone: "ok" },
    ],
    conditions: [{ prov: "tanya.conditions", value: "Major depression, anxiety", source: "Discharge note", age: "2 Nov" }],
    events: [{ prov: "tanya.event", value: "St Clare Behavioral Unit, 28 Oct – 2 Nov", source: "Admit and discharge alerts", age: "7 days" }],
    gaps: [{ value: "7-day follow-up after a mental health stay", due: "Today, 9 Nov", source: "NCQA HEDIS · care gaps", age: "today", tone: "pending" }],
    social: [
      { prov: "tanya.housing", label: "Housing", value: "Possibly staying with a friend", source: "Discharge note", age: "2 Nov", tone: "stale" },
      { label: "Transport", value: "Not known yet", source: "No source", age: "—" },
    ],
    goals: [],
    tasks: [{ text: "Book a video psychiatry visit before the 7-day mark", owner: "Maria", due: "Today" }],
    numbers: [{ prov: "tanya.phone", value: "(555) 012-6678 · mobile", source: "Eligibility file", age: "1 week", works: "unknown" }],
    bestTime: "8:30 am",
    channel: "Phone; text consent not on file",
    consent: [
      { value: "Mental health data sharing: yes", source: "Consent form", age: "signed Mar 2025", tone: "ok" },
      { value: "Text messages: not on file", source: "Contact record", age: "—", tone: "pending" },
    ],
    timeline: [
      { id: "t5", date: "5 Nov", kind: "refill", title: "Pharmacy refilled sertraline", detail: "Claim · 30 days · conflicts with the discharge note" },
      { id: "t4", date: "4 Nov", kind: "discharge", title: "Discharge note arrived", detail: "2 days late · sertraline stopped, aripiprazole added" },
      {
        id: "t3",
        date: "3 Nov",
        kind: "voicemail",
        title: "Call · voicemail left",
        detail: "No answer on (555) 012-6678 · by Maria",
        call: { duration: "0:42", by: "Maria", changed: [], note: "Called member 3 Nov, no answer. Left a voicemail asking her to call back about her medicines.", tasks: ["Try again Monday morning"] },
      },
      { id: "t2", date: "2 Nov", kind: "alert", title: "Left the hospital", detail: "St Clare Behavioral Unit · stay began 28 Oct" },
      { id: "t1", date: "Feb", kind: "form", title: "Health form completed", detail: "Stable home, lives alone · now 9 months old" },
    ],
  },

  "lai-fong-chan": {
    plan: "Dual-eligible D-SNP",
    language: "Cantonese · interpreter",
    contactLine: "Grace, daughter · (555) 016-8891",
    pcp: "Dr H. Wong",
    tier: { label: "This week", tone: "soon", reason: "Yearly review due Fri 13 Nov" },
    alerts: [
      { prov: "chan.amlodipine", value: "Amlodipine filled at two pharmacies, 20 and 22 Oct", source: "Pharmacy claims", age: "2 weeks", tone: "conflict" },
      { prov: "chan.language", value: "Language: eligibility says English, care record says Cantonese", source: "Eligibility vs care record", age: "on file", tone: "conflict" },
      { prov: "chan.mobility", value: "Health form predates the hip fracture", source: "HRA", age: "Nov 2025", tone: "stale" },
      { prov: "chan.bed", value: "Hospital-bed approval pending for 14 days", source: "Prior auth", age: "26 Oct", tone: "pending" },
    ],
    meds: [
      {
        prov: "chan.amlodipine",
        name: "Amlodipine",
        value: "Double fill: two pharmacies in one week",
        source: "Pharmacy claims",
        age: "2 weeks",
        tone: "conflict",
        history: {
          versions: [
            { source: "Prescription · Dr H. Wong", value: "Active, one supply", date: "on file", score: 2.0, state: "current" },
            { source: "Pharmacy fill (second pharmacy)", value: "Filled", date: "22 Oct", score: 1.0, state: "conflict" },
            { source: "Pharmacy fill (first pharmacy)", value: "Filled", date: "20 Oct", score: 1.0, state: "conflict" },
          ],
          why: "Two fills a week apart for one prescription; the prescription stays the record until Maria confirms which supply is in use.",
        },
      },
    ],
    conditions: [
      { prov: "chan.conditions", value: "Dementia, moderate", source: "Claims", age: "on file" },
      { prov: "chan.conditions", value: "Hip fracture", source: "Claims", age: "Aug" },
      { prov: "chan.conditions", value: "Hypertension", source: "Claims", age: "on file" },
    ],
    events: [
      { prov: "chan.event", value: "Hospital stay for the hip fracture", source: "Claims", age: "Aug" },
      { prov: "chan.event", value: "Rehab (SNF) discharge", source: "Discharge note", age: "16 Oct" },
    ],
    gaps: [{ value: "Yearly reassessment", due: "Fri 13 Nov", source: "Care gaps", age: "this week", tone: "pending" }],
    social: [
      { label: "Home", value: "Lives with daughter Grace, who works full time", source: "Care record", age: "30 Oct" },
      { prov: "chan.caregiver", label: "Caregiver", value: "Strain noted: “sounds exhausted, missing work”", source: "Care record", age: "30 Oct", tone: "stale" },
      { prov: "chan.bed", label: "Equipment", value: "Needs a hospital bed (approval pending) and a walker", source: "Prior auth", age: "26 Oct", tone: "pending" },
      { label: "Services", value: "Home physical therapy twice a week", source: "Care record", age: "Oct" },
    ],
    goals: [],
    tasks: [{ text: "Book a Cantonese interpreter for the yearly review", owner: "Maria", due: "Thu" }],
    numbers: [{ prov: "chan.phone", value: "(555) 016-8891 · Grace, mobile", source: "Care record", age: "30 Oct", works: "yes" }],
    bestTime: "12:30 pm, Grace",
    channel: "Phone via Grace; Cantonese interpreter for Mrs Chan",
    consent: [
      { value: "Authorised representative: not on file", source: "Consent record", age: "—", tone: "conflict" },
      { value: "Grace may discuss care: verbal only", source: "Care record", age: "30 Oct", tone: "pending" },
    ],
    timeline: [
      { id: "c7", date: "30 Oct", kind: "note", title: "Care record note", detail: "“Daughter sounds exhausted, missing work”" },
      { id: "c6", date: "26 Oct", kind: "auth", title: "Hospital-bed prior auth submitted", detail: "Pending · no decision after 14 days" },
      { id: "c5", date: "22 Oct", kind: "refill", title: "Amlodipine filled", detail: "Second pharmacy · double fill" },
      { id: "c4", date: "20 Oct", kind: "refill", title: "Amlodipine filled", detail: "First pharmacy" },
      { id: "c3", date: "16 Oct", kind: "discharge", title: "Discharged from rehab (SNF)", detail: "After the hip fracture" },
      { id: "c2", date: "Aug", kind: "alert", title: "Hospital stay", detail: "Hip fracture" },
      { id: "c1", date: "Nov 2025", kind: "form", title: "Yearly health form", detail: "“Walks without help” · before the fracture" },
    ],
  },
};

/** Profiles for patients without a hand-written one, assembled from what the app already knows. */
function assemble(id: string): Profile {
  const p = byId[id];
  const d = details[id];
  const s = specs[id];
  const field = (sec: string) => s.fields.filter((f) => f.section === sec && f.value);
  return {
    plan: d.plan,
    language: d.language,
    contactLine: `${p.contact} · ${d.phone}`,
    pcp: "On file",
    tier: { label: p.urgency === "today" ? "Today" : "This week", tone: p.urgency === "today" ? "urgent" : "soon", reason: p.due },
    alerts: s.noticed.map((n) => ({ prov: n.prov, value: n.text, source: n.source, age: n.age, tone: "conflict" as const })),
    meds: s.meds.map((m) => ({ prov: m.prov, name: m.name, value: m.conflict ?? "No conflicts", source: m.source, age: "on file", tone: m.conflict ? ("conflict" as const) : ("ok" as const) })),
    conditions: [],
    events: field("changed").map((f) => ({ value: f.value, source: f.source ?? "Records", age: "recent" })),
    gaps: field("gaps").map((f) => ({ value: f.label, due: f.value, source: f.source ?? "Care gaps", age: "open", tone: "pending" as const })),
    social: field("social").map((f) => ({ label: f.label, value: f.value, source: f.source ?? "Records", age: "on file" })),
    goals: [],
    tasks: openTasks.filter((t) => t.patientId === id).map((t) => ({ text: t.text, owner: "Maria", due: t.due })),
    numbers: [{ value: `${d.phone}${d.phoneNote ? ` · ${d.phoneNote}` : ""}`, source: "Contact record", age: "this week", works: "unknown" }],
    bestTime: p.bestTime,
    channel: d.language.startsWith("Spanish") ? "Phone, in Spanish" : "Phone",
    consent: [],
    timeline: s.noticed.map((n, i) => ({ id: `${id}-${i}`, date: n.age, kind: "alert" as const, title: n.text, detail: n.source })),
  };
}

export function profileFor(id: string): Profile {
  return rich[id] ?? assemble(id);
}
