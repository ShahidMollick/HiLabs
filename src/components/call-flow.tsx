"use client";

import Image from "next/image";
import { useEffect, useReducer, useRef, useState } from "react";
import {
  ActivityIcon,
  AlertIcon,
  ArrowRightIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ClipboardIcon,
  CloseIcon,
  DatabaseIcon,
  EarIcon,
  EndCallIcon,
  EyeIcon,
  HeartIcon,
  HistoryIcon,
  KeypadIcon,
  LanguagesIcon,
  ListChecksIcon,
  MicIcon,
  MicOffIcon,
  MinusIcon,
  NoteIcon,
  PauseIcon,
  PeopleIcon,
  PersonAddIcon,
  PhoneIcon,
  PillIcon,
  PlayIcon,
  PlusIcon,
  QuoteIcon,
  ShieldIcon,
  SparkIcon,
  SpinnerIcon,
  TargetIcon,
  WalkIcon,
} from "./icons";
import { Stream } from "./stream";
import { Prov, useProvenance } from "./provenance";
import { BandGlyph, FreshLegend, FreshTag, LateNote } from "./freshness";
import { BANDS, TODAY, ageDays, ageToIso, bandOf, decide, type Seed } from "@/lib/provenance";
import type { Patient } from "@/lib/data";
import { sectionTitles, type CallSpec, type Field, type FollowUp, type Line, type Med, type MedStatus, type SectionKey } from "@/lib/calls";

/* ====================================================================
   State: one reducer drives the live call and the review afterwards
   ==================================================================== */

type Sugg = { value: string; prev: string; at: number; status?: MedStatus; prevStatus?: MedStatus; unsure?: FollowUp; who: string; asking?: boolean };
type Flash = { flash?: "ok" | "no"; flashKey?: number };
type LField = Field & Flash & { sugg?: Sugg; heardAt?: number; prevValue?: string };
type LMed = Med & Flash & { status?: MedStatus; detail?: string; by?: "maria" | "ai"; sugg?: Sugg; heardAt?: number; prevStatus?: MedStatus };
type LTask = { id: string; text: string; kind: "heard" | "suggested"; state: "pending" | "accepted" | "rejected"; at: number };
type LNote = { id: number; text: string; ref?: string; state: "pending" | "accepted" | "rejected" };
type Shown = { id: number; at: number; who: string; text: string; tags: string[] };

type State = {
  seq: number;
  clock: number;
  queue: Line[];
  shown: Shown[];
  plan: { id: string; text: string; auto?: boolean }[];
  covered: string[];
  fields: LField[];
  meds: LMed[];
  tasks: LTask[];
  notes: LNote[];
  booked: string[];
  noticed: CallSpec["noticed"];
};

type Action =
  | { type: "tick"; dt: number; notesOn: boolean }
  | { type: "accept"; ref: string }
  | { type: "reject"; ref: string }
  | { type: "followUp"; ref: string }
  | { type: "acceptAll" }
  | { type: "rejectAll" }
  | { type: "setMed"; key: string; status: MedStatus }
  | { type: "task"; id: string; state: LTask["state"] }
  | { type: "addPlan"; id: string; text: string }
  | { type: "togglePlan"; id: string }
  | { type: "book"; key: string };

// Demo pacing: the scripted conversation plays this many times faster than written.
const DEMO_SPEED = 2.5;

function init(spec: CallSpec): State {
  return {
    seq: 0,
    clock: 0,
    queue: spec.lines.map((l) => ({ ...l, at: Math.round((l.at / DEMO_SPEED) * 4) / 4 })).sort((a, b) => a.at - b.at),
    shown: [],
    plan: spec.plan.map((p) => ({ ...p })),
    covered: [],
    fields: spec.fields.map((f) => ({ ...f })),
    meds: spec.meds.map((m) => ({ ...m })),
    tasks: [],
    notes: [],
    booked: [],
    noticed: spec.noticed,
  };
}

const refOf = (kind: "f" | "m", key: string) => `${kind}:${key}`;
const statusLabel: Record<MedStatus, string> = { taking: "Taking", not: "Not taking", changed: "Changed" };

function applyLine(s: State, l: Line, notesOn: boolean): State {
  const tags: string[] = [];
  let { plan, covered, fields, meds, tasks, notes } = s;
  if (notesOn) {
    if (l.covers && !covered.includes(l.covers)) {
      covered = [...covered, l.covers];
      if (!plan.some((p) => p.id === l.covers)) {
        const n = s.noticed.find((x) => x.id === l.covers);
        if (n) plan = [...plan, { id: n.id, text: n.plan, auto: true }];
      }
    }
    for (const fill of l.fill ?? []) {
      const ref = refOf("f", fill.key);
      fields = fields.map((f) =>
        f.key !== fill.key ? f : { ...f, sugg: { value: fill.value, prev: f.sugg ? f.sugg.prev : f.value, at: l.at, unsure: fill.unsure, who: l.who } },
      );
      const label = s.fields.find((f) => f.key === fill.key)?.label;
      if (label) tags.push(label);
      notes = notes.map((n) => (n.ref === ref && n.state === "pending" ? { ...n, state: "rejected" } : n));
      if (fill.note && !fill.unsure) notes = [...notes, { id: notes.length, text: fill.note, ref, state: "pending" }];
    }
    for (const mf of l.meds ?? []) {
      const ref = refOf("m", mf.key);
      meds = meds.map((m) =>
        m.key !== mf.key
          ? m
          : { ...m, sugg: { value: mf.detail, prev: m.sugg ? m.sugg.prev : (m.detail ?? ""), status: mf.status, prevStatus: m.status, at: l.at, unsure: mf.unsure, who: l.who } },
      );
      const name = s.meds.find((m) => m.key === mf.key)?.name;
      if (name) tags.push(name);
      notes = notes.map((n) => (n.ref === ref && n.state === "pending" ? { ...n, state: "rejected" } : n));
      if (mf.note && !mf.unsure) notes = [...notes, { id: notes.length, text: mf.note, ref, state: "pending" }];
    }
    for (const t of l.tasks ?? []) {
      tasks = [...tasks, { id: `t${tasks.length}`, text: t.text, kind: t.kind, state: t.kind === "heard" ? "accepted" : "pending", at: l.at }];
      tags.push(t.kind === "heard" ? "Task" : "Suggested task");
    }
    if (l.note) notes = [...notes, { id: notes.length, text: l.note, state: "accepted" }];
  }
  const isKey = l.who !== "maria" && (!!l.covers || !!l.fill?.length || !!l.meds?.length || !!l.tasks?.length || !!l.note);
  const shown = isKey ? [...s.shown, { id: s.shown.length, at: l.at, who: l.who, text: l.text, tags }] : s.shown;
  return { ...s, plan, covered, fields, meds, tasks, notes, shown };
}

function settle(s: State, ref: string, accept: boolean): State {
  const [kind, key] = ref.split(":");
  const fx = { flash: accept ? ("ok" as const) : ("no" as const), flashKey: s.seq + 1 };
  const notes = s.notes.map((n) => (n.ref === ref && n.state === "pending" ? { ...n, state: accept ? ("accepted" as const) : ("rejected" as const) } : n));
  if (kind === "f") {
    return {
      ...s,
      seq: s.seq + 1,
      notes,
      fields: s.fields.map((f) => (f.key !== key || !f.sugg ? f : accept ? { ...f, ...fx, value: f.sugg.value, heardAt: f.sugg.at, prevValue: f.sugg.prev, sugg: undefined } : { ...f, ...fx, sugg: undefined })),
    };
  }
  return {
    ...s,
    seq: s.seq + 1,
    notes,
    meds: s.meds.map((m) =>
      m.key !== key || !m.sugg
        ? m
        : accept
          ? { ...m, ...fx, status: m.sugg.status, detail: m.sugg.value, by: "ai", heardAt: m.sugg.at, prevStatus: m.sugg.prevStatus, sugg: undefined }
          : { ...m, ...fx, sugg: undefined },
    ),
  };
}

function pendingRefs(s: State, includeUnsure = false) {
  return [
    ...s.fields.filter((f) => f.sugg && (includeUnsure || !f.sugg.unsure)).map((f) => refOf("f", f.key)),
    ...s.meds.filter((m) => m.sugg && (includeUnsure || !m.sugg.unsure)).map((m) => refOf("m", m.key)),
  ];
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "tick": {
      const clock = s.clock + a.dt;
      const due = s.queue.filter((l) => l.at <= clock);
      let next: State = { ...s, clock, queue: s.queue.filter((l) => l.at > clock) };
      for (const l of due) next = applyLine(next, l, a.notesOn);
      return next;
    }
    case "accept":
      return settle(s, a.ref, true);
    case "reject":
      return settle(s, a.ref, false);
    case "acceptAll":
      return pendingRefs(s).reduce((acc, r) => settle(acc, r, true), s);
    case "rejectAll":
      return pendingRefs(s).reduce((acc, r) => settle(acc, r, false), s);
    case "followUp": {
      const [kind, key] = a.ref.split(":");
      const item = kind === "f" ? s.fields.find((f) => f.key === key) : s.meds.find((m) => m.key === key);
      const fu = item?.sugg?.unsure;
      if (!item?.sugg || !fu || item.sugg.asking) return s;
      const answer: Line =
        kind === "f"
          ? { at: s.clock + 1.75, who: item.sugg.who, text: fu.answer, fill: [{ key, value: fu.value, note: fu.note }] }
          : { at: s.clock + 1.75, who: item.sugg.who, text: fu.answer, meds: [{ key, status: fu.status ?? item.sugg.status ?? "taking", detail: fu.value, note: fu.note }] };
      const mark = <T extends LField | LMed>(x: T): T => (x.key === key && x.sugg ? { ...x, sugg: { ...x.sugg, asking: true } } : x);
      return {
        ...s,
        queue: [...s.queue, { at: s.clock + 0.5, who: "maria", text: fu.ask }, answer].sort((x, y) => x.at - y.at),
        fields: kind === "f" ? s.fields.map(mark) : s.fields,
        meds: kind === "m" ? s.meds.map(mark) : s.meds,
      };
    }
    case "setMed":
      return {
        ...s,
        seq: s.seq + 1,
        meds: s.meds.map((m) => (m.key === a.key ? { ...m, status: a.status, by: "maria", sugg: undefined, flash: "ok", flashKey: s.seq + 1 } : m)),
        notes: s.notes.map((n) => (n.ref === refOf("m", a.key) && n.state === "pending" ? { ...n, state: "rejected" } : n)),
      };
    case "task":
      return { ...s, tasks: s.tasks.map((t) => (t.id === a.id ? { ...t, state: a.state } : t)) };
    case "addPlan":
      return s.plan.some((p) => p.id === a.id) ? s : { ...s, plan: [...s.plan, { id: a.id, text: a.text }] };
    case "togglePlan":
      return { ...s, covered: s.covered.includes(a.id) ? s.covered.filter((x) => x !== a.id) : [...s.covered, a.id] };
    case "book":
      return { ...s, booked: s.booked.includes(a.key) ? s.booked : [...s.booked, a.key] };
  }
}

/* ====================================================================
   Pieces
   ==================================================================== */

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
type IconC = (p: { className?: string }) => React.ReactElement;

/** Hover/focus tooltip with an optional keyboard shortcut (Material-style plain tooltip). */
function Tip({ label, kbd, children, side = "top" }: { label: string; kbd?: string; children: React.ReactNode; side?: "top" | "bottom" }) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 scale-95 rounded-md bg-[#303030] px-2 py-1 text-[11.5px] whitespace-nowrap text-white opacity-0 transition delay-0 duration-150 group-focus-within/tip:scale-100 group-focus-within/tip:opacity-100 group-hover/tip:scale-100 group-hover/tip:opacity-100 group-hover/tip:delay-300 ${
          side === "top" ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]"
        }`}
      >
        {label}
        {kbd ? <kbd className="ml-1.5 rounded bg-white/15 px-1 font-sans text-[10.5px]">{kbd}</kbd> : null}
      </span>
    </span>
  );
}

/** Material-style accordion section for the right panel. */
function AccordionSection({ open, onToggle, icon: Icon, title, badge, children }: { open: boolean; onToggle: () => void; icon: IconC; title: string; badge?: number; children: React.ReactNode }) {
  return (
    <section className="border-b border-line last:border-b-0">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-dim/60">
        <span className="grid size-8 place-items-center rounded-full bg-surface-dim text-ink-2">
          <Icon className="size-[17px]" />
        </span>
        <span className="flex-1 text-[14px] font-medium text-ink">{title}</span>
        {badge ? (
          <span key={badge} className="grid h-5 min-w-5 animate-pop place-items-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-white">
            {badge}
          </span>
        ) : null}
        <ChevronDownIcon className={`size-4 text-ink-3 transition-transform duration-200 ${open ? "" : "-rotate-90"}`} />
      </button>
      <Collapse open={open}>
        <div className="px-4 pb-4">{children}</div>
      </Collapse>
    </section>
  );
}

/** A check that draws itself; re-mount to replay. */
function CheckDraw({ className = "size-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`check-draw ${className}`} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

/** Smooth height collapse (CSS grid rows), the standard expand/collapse micro-interaction. */
function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

type ChipTone = "record" | "heard" | "suggested" | "unsure" | "conflict" | "ok" | "empty";
function Chip({ tone, icon: Icon, children }: { tone: ChipTone; icon?: IconC; children: React.ReactNode }) {
  const cls = {
    record: "bg-surface-dim text-ink-2",
    heard: "bg-tonal text-on-tonal",
    suggested: "bg-tonal text-on-tonal",
    unsure: "bg-soon-bg text-soon",
    conflict: "bg-urgent-bg text-urgent",
    ok: "bg-ok-bg text-ok",
    empty: "border border-dashed border-line text-ink-3",
  }[tone];
  return (
    <span className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[11.5px] font-medium whitespace-nowrap ${cls}`}>
      {Icon ? <Icon className="size-3.5" /> : null}
      {children}
    </span>
  );
}

/** Section header for the left column (flat, inside the one card). */
function Block({ icon: Icon, title, meta, children }: { icon: IconC; title: string; meta?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-b border-line px-5 py-4 last:border-b-0">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-[18px] text-ink-2" />
        <h3 className="flex-1 text-sm font-medium text-ink">{title}</h3>
        {meta ? <span className="text-xs text-ink-3 tabular-nums">{meta}</span> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * AI suggestion card (Copilot/Cursor pattern, Material styling):
 * old value out, new value in, Reject / Accept. Buttons wait for streaming to finish,
 * and the card collapses smoothly when decided.
 */
function Suggestion({
  prev,
  next,
  at,
  unsure,
  asking,
  onAccept,
  onReject,
  onAsk,
  instant = false,
}: {
  prev?: string;
  next: string;
  at: number;
  unsure?: boolean;
  asking?: boolean;
  onAccept: () => void;
  onReject: () => void;
  onAsk?: () => void;
  instant?: boolean;
}) {
  const [ready, setReady] = useState(instant);
  const [leaving, setLeaving] = useState<"ok" | "no" | null>(null);
  const decide = (kind: "ok" | "no") => {
    setLeaving(kind);
    setTimeout(kind === "ok" ? onAccept : onReject, 180);
  };
  const busy = !ready || asking || !!leaving;
  return (
    <Collapse open={!leaving}>
      <div data-tour={unsure ? "unsure" : undefined} className={`mt-2 animate-fade-up rounded-2xl border p-3 ${unsure ? "border-soon/25 bg-soon-bg/60" : "border-[#d3e3fd] bg-[#f4f8fe]"}`}>
        <div className="flex items-center gap-1.5 text-[12px]">
          <span className={`grid size-5 place-items-center rounded-full ${unsure ? "bg-soon/15 text-soon" : "bg-tonal text-on-tonal"}`}>
            {unsure ? <AlertIcon className="size-3" /> : <SparkIcon className="size-3" />}
          </span>
          <span className={`font-medium ${unsure ? "text-soon" : "text-on-tonal"}`}>{!ready ? "Writing…" : unsure ? "Not sure, check this" : "Suggested from the call"}</span>
          <span className="text-ink-3">· {mmss(at)}</span>
          {unsure && ready ? <span className="ml-auto text-[11.5px] text-soon/90">Not in Accept all</span> : null}
        </div>

        <div className="mt-2 flex flex-col gap-1 text-[14px] leading-snug">
          {prev ? (
            <p className="flex items-start gap-2 text-ink-3">
              <MinusIcon className="mt-[3px] size-3.5 shrink-0 text-urgent" />
              <span className="line-through decoration-urgent/40">{prev}</span>
              <span className="sr-only">(current value)</span>
            </p>
          ) : null}
          <p className="flex items-start gap-2 text-ink">
            <PlusIcon className="mt-[3px] size-3.5 shrink-0 text-ok" />
            <Stream key={next} text={next} instant={instant} onDone={() => setReady(true)} />
          </p>
        </div>

        <div className="mt-2.5 flex items-center justify-end gap-1.5">
          {unsure && onAsk ? (
            <button
              type="button"
              onClick={onAsk}
              disabled={busy}
              className="mr-auto inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[13px] font-medium text-primary transition hover:bg-primary/8 active:scale-95 disabled:text-ink-3"
            >
              {asking ? <SpinnerIcon className="size-3.5" /> : <ArrowRightIcon className="size-3.5" />}
              {asking ? "Asking…" : "Ask a follow-up"}
            </button>
          ) : null}
          <Tip label="Reject" kbd="⌘⌫">
            <button
              type="button"
              onClick={() => decide("no")}
              disabled={busy}
              className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-[13px] font-medium text-ink-2 transition hover:bg-black/5 active:scale-95 disabled:opacity-40"
            >
              <CloseIcon className="size-3.5" />
              Reject
            </button>
          </Tip>
          <Tip label="Accept" kbd="⌘↵">
            <button
              type="button"
              onClick={() => decide("ok")}
              disabled={busy}
              className="inline-flex h-8 items-center gap-1 rounded-full bg-ok px-3.5 text-[13px] font-medium text-white shadow-sm transition hover:brightness-110 hover:shadow active:scale-95 disabled:bg-ink-3/40 disabled:shadow-none"
            >
              <CheckIcon className="size-3.5" />
              Accept
            </button>
          </Tip>
        </div>
      </div>
    </Collapse>
  );
}

function CtrlButton({
  label,
  kbd,
  tone = "default",
  active,
  onClick,
  icon: Icon,
  expanded,
}: {
  label: string;
  kbd?: string;
  tone?: "default" | "danger" | "warn";
  active?: boolean;
  onClick: () => void;
  icon: IconC;
  expanded?: boolean;
}) {
  const on = { default: "bg-tonal text-on-tonal", danger: "bg-urgent text-white", warn: "bg-soon-bg text-soon" }[tone];
  return (
    <Tip label={label} kbd={kbd}>
      <button type="button" onClick={onClick} aria-pressed={active} aria-expanded={expanded} aria-label={label} className="group flex flex-col items-center gap-1">
        <span className={`grid size-12 place-items-center rounded-full transition duration-150 group-active:scale-90 ${active ? on : "bg-surface-dim text-ink-2 group-hover:bg-[#e3e8f0]"}`}>
          <Icon className="size-[22px]" />
        </span>
        <span className="text-[11.5px] text-ink-2">{label}</span>
      </button>
    </Tip>
  );
}

const SpeakerIcon = ({ className = "size-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 10v4h4l5 4V6L8 10zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
  </svg>
);

/** Small progress ring for "decided" in the wrap-up bar. */
function Ring({ value, total }: { value: number; total: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  const pct = total ? value / total : 1;
  return (
    <svg viewBox="0 0 36 36" className="size-10 -rotate-90" aria-hidden>
      <circle cx="18" cy="18" r={r} fill="none" stroke="var(--color-surface-dim)" strokeWidth="4" />
      <circle cx="18" cy="18" r={r} fill="none" stroke={pct >= 1 ? "var(--color-ok)" : "var(--color-primary)"} strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className="transition-[stroke-dashoffset] duration-500 ease-out" />
    </svg>
  );
}

/* ====================================================================
   The flow: one card for the call; on End it becomes the wrap-up in place
   ==================================================================== */

export type SignResult = { tasks: string[]; nextCall: string; confirmed: { prov: string; value: string }[] };

const sectionIcon: Record<SectionKey, IconC> = {
  changed: ActivityIcon,
  gaps: CalendarIcon,
  social: HeartIcon,
  function: WalkIcon,
  goals: TargetIcon,
};
const NEXT_OPTIONS = ["Tomorrow", "In 3 days", "In 1 week", "In 2 weeks", "No follow-up needed"];

const TODAY_ISO = TODAY.toISOString().slice(0, 10);
const BAND_TEXT = { fresh: "text-ok", ageing: "text-soon", old: "text-urgent" } as const;

export function CallFlow({
  patient: p,
  spec,
  elapsed,
  muted,
  hold,
  ended,
  onMute,
  onHold,
  onEnd,
  onSigned,
  onOpenProfile,
}: {
  patient: Patient;
  spec: CallSpec;
  elapsed: number;
  muted: boolean;
  hold: boolean;
  ended: boolean;
  onMute: () => void;
  onHold: () => void;
  onEnd: () => void;
  onSigned: (r: SignResult) => void;
  onOpenProfile: () => void;
}) {
  const [s, dispatch] = useReducer(reducer, spec, init);
  const { fact } = useProvenance();
  const seedOf = (f: LField): Seed => ({ patientId: p.id, group: sectionTitles[f.section], label: f.label, value: f.value, source: (f.source ?? "Care record").split(" · ")[0], age: (f.source ?? "").split(" · ")[1] ?? "on file" });
  /** The record a prefilled field came from: the version with the shown value, else the rule's winner. */
  const recordOf = (f: LField) => {
    const pf = fact(f.prov ?? `${p.id}.call.${f.key}`, seedOf(f));
    return pf.versions.find((v) => v.value === f.value) ?? decide(pf).winner.v;
  };
  const [notesOn, setNotesOn] = useState(true);
  const [speaker, setSpeaker] = useState(false);
  const [panel, setPanel] = useState<"keypad" | "add" | "next" | null>(null);
  const [digits, setDigits] = useState("");
  const [joined, setJoined] = useState<string[]>(spec.joined ?? []);
  const [custom, setCustom] = useState("");
  const [nextCall, setNextCall] = useState<string | null>(null);
  const [closed, setClosed] = useState<string[]>([]); // collapsed sections
  const [viewAll, setViewAll] = useState(false);
  const [total, setTotal] = useState(0);
  const [signing, setSigning] = useState<"idle" | "busy" | "done">("idle");
  const linesRef = useRef<HTMLOListElement>(null);
  const live = !ended;

  // the page behind the overlay stays put
  useEffect(() => {
    const el = document.documentElement;
    const prev = el.style.overflow;
    el.style.overflow = "hidden";
    return () => {
      el.style.overflow = prev;
    };
  }, []);

  // the conversation advances unless on hold or ended
  useEffect(() => {
    if (hold || ended) return;
    const t = setInterval(() => dispatch({ type: "tick", dt: 0.25, notesOn }), 250);
    return () => clearInterval(t);
  }, [hold, ended, notesOn]);

  // keep the newest quote in view inside its column
  useEffect(() => {
    linesRef.current?.lastElementChild?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [s.shown.length]);

  // Cursor-style keys: ⌘/Ctrl+Enter accepts the oldest suggestion, ⌘/Ctrl+Backspace rejects it; ⌘/Ctrl+D mutes
  const firstPending = pendingRefs(s)[0];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || (e.target as HTMLElement)?.closest("input, textarea")) return;
      if (e.key === "Enter" && firstPending) {
        e.preventDefault();
        dispatch({ type: "accept", ref: firstPending });
      } else if (e.key === "Backspace" && firstPending) {
        e.preventDefault();
        dispatch({ type: "reject", ref: firstPending });
      } else if (e.key.toLowerCase() === "d" && live) {
        e.preventDefault();
        onMute();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [firstPending, live, onMute]);

  const pending = pendingRefs(s, true).length;
  const sure = pendingRefs(s).length; // bulk accept only ever touches these
  const unsureN = pending - sure;
  const pendingTasks = s.tasks.filter((t) => t.kind === "suggested" && t.state === "pending").length;
  const toDecide = pending + pendingTasks;
  const canSign = toDecide === 0 && !!nextCall;
  const who = (w: string) => (w === "maria" ? "Maria" : w === "patient" ? p.name.split(" ")[0] : w);
  const first = p.name === "Lai Fong Chan" ? "Grace" : p.name.split(" ")[0];
  const decideOnly = ended && !viewAll;

  const endCall = () => {
    setTotal(Math.max(1, pendingRefs(s, true).length + s.tasks.filter((t) => t.kind === "suggested" && t.state === "pending").length));
    setViewAll(false);
    setPanel(null);
    onEnd();
  };

  const sign = () => {
    if (!canSign || signing !== "idle") return;
    setSigning("busy");
    setTimeout(() => setSigning("done"), 700);
    // answers Maria accepted that map to a tracked fact become "Confirmed by Maria" versions
    const confirmed = [
      ...s.fields.filter((f) => f.prov && f.heardAt !== undefined && f.value).map((f) => ({ prov: f.prov!, value: f.value })),
      ...s.meds.filter((m) => m.prov && m.status).map((m) => ({ prov: m.prov!, value: `${statusLabel[m.status!]}${m.detail ? `: ${m.detail}` : ""}` })),
    ];
    setTimeout(() => onSigned({ tasks: s.tasks.filter((t) => t.state === "accepted").map((t) => t.text), nextCall: nextCall!, confirmed }), 1300);
  };

  const fieldChip = (f: LField): [ChipTone, IconC | undefined, string] =>
    f.sugg?.unsure
      ? ["unsure", AlertIcon, "Check"]
      : f.sugg
        ? ["suggested", SparkIcon, "Suggested"]
        : f.heardAt !== undefined
          ? ["heard", EarIcon, `Heard ${mmss(f.heardAt)}`]
          : ["record", DatabaseIcon, "On record"];

  const toggleSection = (id: string) => setClosed((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const notCovered = (labels: string[]) =>
    labels.length ? (
      <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-3">
        Not covered yet:
        {labels.map((l) => (
          <Chip key={l} tone="empty">
            {l}
          </Chip>
        ))}
      </p>
    ) : null;

  const noteBlock = (
    <p className="text-[14px] leading-relaxed text-ink">
      Called {first === "Grace" ? "Mrs Chan’s daughter Grace" : first} on 9 November.{" "}
      {s.notes
        .filter((n) => n.state !== "rejected")
        .map((n) => (
          <span key={n.id} className={`animate-fade-up ${n.state === "pending" ? "rounded bg-[#e6f4ea] text-ink-2" : ""}`} title={n.state === "pending" ? "Waits on a suggestion" : undefined}>
            <Stream text={n.text} instant={!live} delay={180} />{" "}
          </span>
        ))}
      {live && notesOn && !hold ? <span className="inline-block h-3.5 w-0.5 animate-pulse bg-primary align-middle" aria-hidden /> : null}
    </p>
  );

  const col = "flex min-w-0 flex-col xl:min-h-0 xl:overflow-y-auto [scrollbar-width:thin]";
  const statusDot = ended ? "bg-ink-3" : hold ? "bg-soon" : "bg-ok animate-pulse";

  /* ------------------------------ render ------------------------------ */
  const medsShown = s.meds.filter((m) => !decideOnly || m.sugg);
  const tasksShown = s.tasks.filter((t) => t.state !== "rejected" && (!decideOnly || (t.kind === "suggested" && t.state === "pending")));

  return (
    <div className="flex h-[100dvh] flex-col px-3 pt-4 pb-[120px] sm:px-6 sm:pt-6">
      <div className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 animate-rise flex-col overflow-hidden rounded-[28px] bg-surface shadow-[0_30px_90px_-30px_rgb(0_0_0_/_0.6)]">
        {/* Card header */}
        <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-3.5">
          <span className={`block size-12 shrink-0 overflow-hidden rounded-full ${live ? "animate-ring" : ""}`}>
            <Image src={p.photo} alt="" width={96} height={96} className={`size-full object-cover transition ${ended ? "grayscale-[40%]" : ""}`} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-normal text-ink">
              {p.name} <span className="text-sm text-ink-3">{p.age}</span>
            </h2>
            <p className="flex items-center gap-1.5 truncate text-[13px] text-ink-3 tabular-nums" role="status">
              <span className={`size-2 shrink-0 rounded-full ${statusDot}`} aria-hidden />
              {ended ? `Call ended · ${mmss(elapsed)}` : hold ? `On hold · ${mmss(elapsed)}` : elapsed < 2 ? "Calling…" : `On call · ${mmss(elapsed)}${muted ? " · muted" : ""}${speaker ? " · speaker" : ""}`}
              <span aria-hidden>·</span>
              <span className="truncate">{spec.speaking}</span>
            </p>
          </div>
          <Tip label="Full profile, over the call" side="bottom">
            <button type="button" onClick={onOpenProfile} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-[13px] font-medium text-primary transition hover:bg-tonal/40 active:scale-95">
              <PeopleIcon className="size-4" />
              Open profile
            </button>
          </Tip>
          {live ? (
            <Tip label={notesOn ? "Pause note-taking" : "Resume note-taking"} side="bottom">
              <button
                type="button"
                onClick={() => setNotesOn((v) => !v)}
                aria-pressed={notesOn}
                className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition active:scale-95 ${notesOn ? "bg-tonal text-on-tonal" : "bg-surface-dim text-ink-2"}`}
              >
                {notesOn ? <SparkIcon className="size-4" /> : <PauseIcon className="size-4" />}
                {notesOn ? "Taking notes" : "Notes paused"}
              </button>
            </Tip>
          ) : (
            <span className="inline-flex h-9 animate-pop items-center gap-1.5 rounded-full bg-ok-bg px-3.5 text-[13px] font-medium text-ok">
              <NoteIcon className="size-4" />
              Wrap-up · nothing saved until you sign
            </span>
          )}
        </header>

        <div className="grid min-h-0 flex-1 divide-line overflow-y-auto max-xl:divide-y xl:grid-cols-[300px_minmax(0,1fr)_440px] xl:divide-x xl:overflow-hidden">
          {/* ---------- LEFT: what Maria brings ---------- */}
          <div data-tour="call-left" className={`${col} order-3 xl:order-none`}>
            <Block icon={PeopleIcon} title="Talking to">
              <p className="text-[14px] font-medium text-ink">{spec.speaking}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-2">
                <PhoneIcon className="size-3.5 text-ink-3" />
                {spec.phone}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {spec.tags.map((t) => (
                  <Chip key={t.text} tone={t.warn ? "unsure" : "record"} icon={t.warn ? AlertIcon : ShieldIcon}>
                    {t.text}
                  </Chip>
                ))}
                {joined.map((j) => (
                  <Chip key={j} tone="heard" icon={LanguagesIcon}>
                    {j.split(",")[0]} joined
                  </Chip>
                ))}
              </div>
            </Block>

            <Block icon={EyeIcon} title="Things we noticed" meta="From the data">
              <ul className="flex flex-col gap-3">
                {spec.noticed.map((n) => {
                  const inPlan = s.plan.some((x) => x.id === n.id);
                  return (
                    <li key={n.id}>
                      <p className="text-[13.5px] leading-snug text-ink">{n.text}</p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1 text-[12px] text-ink-3">
                          <DatabaseIcon className="size-3" />
                          {n.source} · {n.age}
                          {/on file|since/i.test(n.age) ? null : (
                            <span className={BAND_TEXT[bandOf(ageDays(ageToIso(n.age)))]} title={BANDS[bandOf(ageDays(ageToIso(n.age)))].label}>
                              <BandGlyph band={bandOf(ageDays(ageToIso(n.age)))} className="ml-0.5 size-2.5" />
                            </span>
                          )}
                        </span>
                        {inPlan ? (
                          <span className="inline-flex animate-pop items-center gap-1 text-[12px] font-medium text-ok">
                            <CheckIcon className="size-3.5" />
                            In plan
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => dispatch({ type: "addPlan", id: n.id, text: n.plan })}
                            className="inline-flex h-7 items-center gap-1 rounded-full border border-line px-2.5 text-[12px] font-medium text-primary transition hover:border-primary/40 hover:bg-tonal/40 active:scale-95"
                          >
                            <PlusIcon className="size-3.5" />
                            Plan
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Block>

            <Block icon={ClipboardIcon} title="Call plan" meta={`${s.plan.filter((x) => s.covered.includes(x.id)).length} of ${s.plan.length}`}>
              <ol className="-mx-2 flex flex-col">
                {s.plan.map((item) => {
                  const done = s.covered.includes(item.id);
                  return (
                    <li key={item.id} className={item.auto ? "animate-fade-up" : undefined}>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: "togglePlan", id: item.id })}
                        aria-pressed={done}
                        className="flex w-full items-start gap-2.5 rounded-xl px-2 py-1.5 text-left transition hover:bg-surface-dim active:scale-[0.99]"
                      >
                        <span className={`mt-px grid size-[18px] shrink-0 place-items-center rounded-full border-2 transition-colors duration-200 ${done ? "border-ok bg-ok text-white" : "border-ink-3/40"}`} aria-hidden>
                          {done ? <CheckDraw key={`d-${item.id}`} /> : null}
                        </span>
                        <span className="min-w-0 flex-1 text-[13.5px] leading-snug">
                          <span className={`transition-colors ${done ? "text-ink-3 line-through decoration-ink-3/50" : "text-ink"}`}>{item.text}</span>
                          {item.auto ? (
                            <span className="mt-0.5 flex items-center gap-1 text-[11.5px] text-primary">
                              <SparkIcon className="size-3" />
                              Added from the call
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              {live ? (
                <form
                  className="mt-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!custom.trim()) return;
                    dispatch({ type: "addPlan", id: `c-${custom}`, text: custom.trim() });
                    setCustom("");
                  }}
                >
                  <label className="flex h-9 items-center gap-2 rounded-full bg-surface-dim px-3 transition focus-within:bg-surface focus-within:shadow-[0_0_0_2px_rgb(11_87_208_/_0.35)]">
                    <PlusIcon className="size-4 text-ink-3" />
                    <span className="sr-only">Add to the call plan</span>
                    <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Add your own" className="h-full flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-3" />
                  </label>
                </form>
              ) : null}
            </Block>

            <Block icon={HistoryIcon} title="From last time">
              {spec.carried.length ? (
                <ul className="text-[13px] text-ink">{spec.carried.map((c) => <li key={c}>{c}</li>)}</ul>
              ) : (
                <p className="text-[13px] text-ink-3">No open tasks from the last signed call.</p>
              )}
            </Block>
          </div>

          {/* ---------- CENTRE: live key lines ---------- */}
          <div data-tour="call-centre" className={`${col} order-1 xl:order-none`}>
            <Block icon={QuoteIcon} title="Live key lines" meta={spec.translated ? `Translated from ${spec.translated}` : "What the AI is using"}>
              <ol ref={linesRef} className="flex flex-col gap-4" aria-live="polite">
                {s.shown.length ? (
                  s.shown.map((l) => (
                    <li key={l.id} className="flex animate-fade-up gap-3">
                      <span className="mt-0.5 w-9 shrink-0 text-right text-[12px] text-ink-3 tabular-nums">{mmss(l.at)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14.5px] leading-snug text-ink">
                          <span className="font-medium">{who(l.who)}</span>
                          <span className="text-ink-2"> · “<Stream text={l.text} delay={40} tokenMs={26} />”</span>
                        </p>
                        {l.tags.length ? (
                          <p className="mt-1.5 flex flex-wrap gap-1">
                            {l.tags.map((t, i) => (
                              <span key={i} className="inline-flex items-center gap-1 rounded-full bg-tonal/60 px-2 py-0.5 text-[11.5px] text-on-tonal">
                                <ArrowRightIcon className="size-3" />
                                {t}
                              </span>
                            ))}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="flex items-center gap-2 text-[13px] text-ink-3">
                    <SpinnerIcon className="size-4" />
                    {hold ? "On hold" : "Listening…"}
                  </li>
                )}
              </ol>
            </Block>
          </div>

          {/* ---------- RIGHT: filling as you talk (Material accordion) ---------- */}
          <div data-tour="call-right" className={`${col} order-2 xl:order-none`}>
            <div className="sticky top-0 z-[2] border-b border-line bg-surface/95 px-4 py-3 backdrop-blur">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-medium text-ink">{ended ? "Check and sign" : "Filling as you talk"}</h3>
                  <p className="text-[12px] text-ink-3">
                    {toDecide ? (
                      <>
                        <span key={toDecide} className="inline-block animate-pop font-medium text-primary">{toDecide}</span> to decide
                        {unsureN ? (
                          <>
                            {" · "}
                            <span className="font-medium text-soon">{unsureN} not sure</span>
                          </>
                        ) : null}
                        {unsureN ? null : " · ⌘↵ accept · ⌘⌫ reject"}
                      </>
                    ) : (
                      "Everything decided"
                    )}
                  </p>
                </div>
                {sure ? (
                  <>
                    <button type="button" onClick={() => dispatch({ type: "rejectAll" })} className="h-8 rounded-full px-3 text-[13px] font-medium text-ink-2 transition hover:bg-black/5 active:scale-95">
                      Reject all
                    </button>
                    <Tip side="bottom" label={unsureN ? `Skips ${unsureN} the AI isn’t sure about` : "Accept every suggestion"}>
                      <button type="button" onClick={() => dispatch({ type: "acceptAll" })} className="inline-flex h-8 items-center gap-1 rounded-full bg-ok px-3 text-[13px] font-medium text-white shadow-sm transition hover:brightness-110 active:scale-95">
                        <CheckIcon className="size-3.5" />
                        {unsureN ? `Accept ${sure} sure` : "Accept all"}
                      </button>
                    </Tip>
                  </>
                ) : unsureN ? (
                  <span className="inline-flex h-8 items-center gap-1 rounded-full bg-soon-bg px-3 text-[12.5px] font-medium text-soon">
                    <AlertIcon className="size-3.5" />
                    Check {unsureN === 1 ? "this one" : `these ${unsureN}`} yourself
                  </span>
                ) : null}
              </div>
              <FreshLegend compact className="mt-1" />
              {ended ? (
                <div className="mt-2.5 inline-flex rounded-full border border-line p-0.5 text-[12.5px]" role="tablist" aria-label="Show">
                  {[
                    { k: false, label: `To decide (${toDecide})` },
                    { k: true, label: "Everything" },
                  ].map((o) => (
                    <button
                      key={o.label}
                      type="button"
                      role="tab"
                      aria-selected={viewAll === o.k}
                      onClick={() => setViewAll(o.k)}
                      className={`inline-flex h-7 items-center gap-1 rounded-full px-3 font-medium transition ${viewAll === o.k ? "bg-tonal text-on-tonal" : "text-ink-2 hover:bg-surface-dim"}`}
                    >
                      {viewAll === o.k ? <CheckIcon className="size-3.5" /> : null}
                      {o.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {decideOnly && toDecide === 0 ? (
              <div className="flex animate-swap flex-col items-center px-6 py-10 text-center">
                <span className="grid size-14 place-items-center rounded-full bg-ok-bg text-ok">
                  <CheckDraw className="size-7" />
                </span>
                <p className="mt-3 text-[15px] font-medium text-ink">Nothing left to decide</p>
                <p className="mt-1 text-[13px] text-ink-3">Pick the next call below, then sign.</p>
              </div>
            ) : (
              <>
                {/* Medicines */}
                {medsShown.length ? (
                  <AccordionSection open={!closed.includes("meds")} onToggle={() => toggleSection("meds")} icon={PillIcon} title="Medicines" badge={s.meds.filter((m) => m.sugg).length}>
                    <ul className="flex flex-col gap-4">
                      {medsShown.map((m) => (
                        <li key={m.key}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[14.5px] font-medium text-ink">{m.name}</p>
                              <p key={m.flashKey} className={`mt-0.5 rounded text-[12.5px] text-ink-3 ${m.flash === "ok" ? "animate-flash-ok" : m.flash === "no" ? "animate-flash-no" : ""}`}>
                                {m.detail && m.status ? `${m.detail} · ${m.by === "maria" ? "set by you" : `heard ${mmss(m.heardAt ?? 0)}`}` : m.source}
                              </p>
                            </div>
                            {m.conflict && !m.status ? (
                              <Chip tone="conflict" icon={AlertIcon}>
                                {m.conflict}
                              </Chip>
                            ) : m.status ? (
                              <Chip tone="ok" icon={CheckIcon}>
                                Reconciled
                              </Chip>
                            ) : null}
                          </div>
                          <div className="mt-2 grid grid-cols-3 overflow-hidden rounded-full border border-line text-[12.5px]" role="radiogroup" aria-label={`${m.name}: status`}>
                            {(["taking", "not", "changed"] as MedStatus[]).map((st, i) => {
                              const on = m.status === st;
                              return (
                                <button
                                  key={st}
                                  type="button"
                                  role="radio"
                                  aria-checked={on}
                                  onClick={() => dispatch({ type: "setMed", key: m.key, status: st })}
                                  className={`inline-flex h-8 items-center justify-center gap-1 font-medium transition ${i ? "border-l border-line" : ""} ${on ? "bg-tonal text-on-tonal" : "text-ink-2 hover:bg-surface-dim"}`}
                                >
                                  {on ? <CheckDraw key={`${m.key}-${st}-${m.flashKey}`} className="size-3.5" /> : null}
                                  {statusLabel[st]}
                                </button>
                              );
                            })}
                          </div>
                          {m.sugg ? (
                            <Suggestion
                              key={`${m.sugg.status}-${m.sugg.value}`}
                              prev={m.sugg.prevStatus ? `${statusLabel[m.sugg.prevStatus]}${m.sugg.prev ? `: ${m.sugg.prev}` : ""}` : m.sugg.prev || undefined}
                              next={`${statusLabel[m.sugg.status!]}: ${m.sugg.value}`}
                              at={m.sugg.at}
                              unsure={!!m.sugg.unsure}
                              asking={m.sugg.asking}
                              onAccept={() => dispatch({ type: "accept", ref: refOf("m", m.key) })}
                              onReject={() => dispatch({ type: "reject", ref: refOf("m", m.key) })}
                              onAsk={live ? () => dispatch({ type: "followUp", ref: refOf("m", m.key) }) : undefined}
                            />
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </AccordionSection>
                ) : null}

                {/* Field sections */}
                {(Object.keys(sectionTitles) as SectionKey[]).map((sec) => {
                  const all = s.fields.filter((f) => f.section === sec);
                  const items = all.filter((f) => (decideOnly ? !!f.sugg : f.value || f.sugg));
                  const empty = decideOnly ? [] : all.filter((f) => !f.value && !f.sugg).map((f) => f.label);
                  if (!items.length && !empty.length) return null;
                  return (
                    <AccordionSection key={sec} open={!closed.includes(sec)} onToggle={() => toggleSection(sec)} icon={sectionIcon[sec]} title={sectionTitles[sec]} badge={all.filter((f) => f.sugg).length}>
                      <ul className="flex flex-col gap-3.5">
                        {items.map((f) => {
                          const [tone, icon, text] = fieldChip(f);
                          const booked = s.booked.includes(f.key);
                          return (
                            <li key={f.key}>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[12px] font-medium tracking-wide text-ink-3">{f.label}</span>
                                <Chip tone={tone} icon={icon}>
                                  {text}
                                </Chip>
                              </div>
                              {f.sugg && f.value && f.heardAt === undefined ? (
                                <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] text-ink-3">
                                  {f.source ? <span>{f.source}</span> : null}
                                  <FreshTag observed={recordOf(f).observed} />
                                  <LateNote v={recordOf(f)} />
                                </p>
                              ) : null}
                              {f.sugg ? (
                                <Suggestion
                                  key={f.sugg.value}
                                  prev={f.sugg.prev || undefined}
                                  next={f.sugg.value}
                                  at={f.sugg.at}
                                  unsure={!!f.sugg.unsure}
                                  asking={f.sugg.asking}
                                  onAccept={() => dispatch({ type: "accept", ref: refOf("f", f.key) })}
                                  onReject={() => dispatch({ type: "reject", ref: refOf("f", f.key) })}
                                  onAsk={live ? () => dispatch({ type: "followUp", ref: refOf("f", f.key) }) : undefined}
                                />
                              ) : (
                                <div key={f.flashKey} className={`-mx-1 mt-1 rounded-lg px-1 py-0.5 ${f.flash === "ok" ? "animate-flash-ok" : f.flash === "no" ? "animate-flash-no" : ""}`}>
                                  <p className="text-[14.5px] leading-snug text-ink">
                                    {f.heardAt === undefined ? (
                                      <Prov
                                        k={f.prov ?? `${p.id}.call.${f.key}`}
                                        seed={seedOf(f)}
                                      >
                                        {f.value}
                                      </Prov>
                                    ) : (
                                      f.value
                                    )}
                                  </p>
                                  {f.heardAt === undefined ? (
                                    (() => {
                                      const v = recordOf(f);
                                      return (
                                        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] text-ink-3">
                                          {f.source ? <span>{f.source}</span> : null}
                                          <FreshTag observed={v.observed} />
                                          <LateNote v={v} />
                                        </p>
                                      );
                                    })()
                                  ) : (
                                    <p className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-3">
                                      <FreshTag observed={TODAY_ISO} />
                                      <span>Just now</span>
                                    </p>
                                  )}
                                </div>
                              )}
                              {f.book && !decideOnly ? (
                                <button
                                  type="button"
                                  onClick={() => dispatch({ type: "book", key: f.key })}
                                  disabled={booked}
                                  className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[12.5px] font-medium text-primary transition hover:border-primary/40 hover:bg-tonal/40 active:scale-95 disabled:border-transparent disabled:bg-ok-bg disabled:text-ok"
                                >
                                  {booked ? <CheckDraw className="size-3.5" /> : <CalendarIcon className="size-3.5" />}
                                  {booked ? "Booking sent" : f.book}
                                </button>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                      {notCovered(empty)}
                    </AccordionSection>
                  );
                })}

                {/* Tasks */}
                {tasksShown.length || !decideOnly ? (
                  <AccordionSection open={!closed.includes("tasks")} onToggle={() => toggleSection("tasks")} icon={ListChecksIcon} title="Tasks" badge={pendingTasks}>
                    {tasksShown.length ? (
                      <ul className="flex flex-col gap-2">
                        {tasksShown.map((t) => {
                          const suggested = t.state === "pending";
                          return (
                            <li key={t.id} className={`flex animate-fade-up items-center gap-2.5 rounded-2xl px-3 py-2 ${suggested ? "border border-dashed border-primary/40 bg-[#f4f8fe]" : "bg-surface-dim/70"}`}>
                              <span className={`grid size-6 shrink-0 place-items-center rounded-full ${suggested ? "bg-tonal text-on-tonal" : "bg-ok text-white"}`}>
                                {suggested ? <SparkIcon className="size-3.5" /> : t.kind === "heard" ? <EarIcon className="size-3.5" /> : <CheckDraw className="size-3.5" />}
                              </span>
                              <span className="min-w-0 flex-1">
                                <Stream className="block text-[13.5px] leading-snug text-ink" text={t.text} delay={150} instant={!live} />
                                <span className="text-[11.5px] text-ink-3">{t.kind === "heard" ? `Agreed on the call · ${mmss(t.at)}` : suggested ? "Suggested · not confirmed" : "Suggested · kept"}</span>
                              </span>
                              <Tip label="Remove">
                                <button type="button" aria-label={`Remove: ${t.text}`} onClick={() => dispatch({ type: "task", id: t.id, state: "rejected" })} className="grid size-8 place-items-center rounded-full text-ink-3 transition hover:bg-urgent-bg hover:text-urgent active:scale-90">
                                  <CloseIcon className="size-4" />
                                </button>
                              </Tip>
                              {suggested ? (
                                <Tip label="Keep">
                                  <button type="button" aria-label={`Keep: ${t.text}`} onClick={() => dispatch({ type: "task", id: t.id, state: "accepted" })} className="grid size-8 place-items-center rounded-full bg-ok text-white shadow-sm transition hover:brightness-110 active:scale-90">
                                    <CheckIcon className="size-4" />
                                  </button>
                                </Tip>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-[13px] text-ink-3">None yet.</p>
                    )}
                  </AccordionSection>
                ) : null}

                {/* Note */}
                {!decideOnly ? (
                  <AccordionSection open={!closed.includes("note")} onToggle={() => toggleSection("note")} icon={NoteIcon} title="Note draft">
                    {noteBlock}
                    <p className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-3">
                      <span className="size-2.5 rounded-sm bg-[#e6f4ea]" aria-hidden />
                      Green text waits on a suggestion
                    </p>
                  </AccordionSection>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Floating bar: call controls while live; morphs into the wrap-up bar after End */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-3">
        {live ? (
          <div key="live" data-tour="call-controls" className="pointer-events-auto relative flex animate-swap items-end gap-2 rounded-[30px] bg-surface px-4 py-3 shadow-[0_18px_50px_-12px_rgb(0_0_0_/_0.55)] sm:gap-3.5 sm:px-6">
            <CtrlButton label={muted ? "Unmute" : "Mute"} kbd="⌘D" tone="danger" active={muted} onClick={onMute} icon={muted ? MicOffIcon : MicIcon} />
            <CtrlButton label={hold ? "Resume" : "Hold"} tone="warn" active={hold} onClick={onHold} icon={hold ? PlayIcon : PauseIcon} />
            <CtrlButton label="Speaker" active={speaker} onClick={() => setSpeaker((v) => !v)} icon={SpeakerIcon} />
            <CtrlButton label="Keypad" active={panel === "keypad"} expanded={panel === "keypad"} onClick={() => setPanel((x) => (x === "keypad" ? null : "keypad"))} icon={KeypadIcon} />
            <CtrlButton label="Add" active={panel === "add"} expanded={panel === "add"} onClick={() => setPanel((x) => (x === "add" ? null : "add"))} icon={PersonAddIcon} />
            <button type="button" onClick={endCall} className="mb-[20px] ml-1 flex h-12 items-center gap-2 rounded-full bg-urgent px-5 text-sm font-medium text-white shadow-sm transition hover:brightness-110 hover:shadow-md active:scale-95">
              <EndCallIcon className="size-5" />
              End call
            </button>

            {panel === "keypad" ? (
              <div className="absolute bottom-[calc(100%+10px)] left-1/2 w-[232px] -translate-x-1/2 animate-fade-up rounded-3xl bg-surface p-4 shadow-lift">
                <div className="mb-2 h-7 truncate text-center text-lg tracking-widest text-ink tabular-nums">{digits || <span className="text-sm tracking-normal text-ink-3">Send tones</span>}</div>
                <div className="grid grid-cols-3 gap-2">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((d) => (
                    <button key={d} type="button" onClick={() => setDigits((x) => (x + d).slice(-12))} className="h-11 rounded-full bg-surface-dim text-lg text-ink transition hover:bg-[#e3e8f0] active:scale-90">
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {panel === "add" ? (
              <div className="absolute bottom-[calc(100%+10px)] left-1/2 w-[260px] -translate-x-1/2 animate-fade-up overflow-hidden rounded-3xl bg-surface py-2 text-left shadow-lift">
                <p className="px-4 pt-1 pb-2 text-sm font-medium text-ink">Add to this call</p>
                {spec.people.map((person) => {
                  const isIn = joined.includes(person);
                  return (
                    <button
                      key={person}
                      type="button"
                      onClick={() => {
                        setJoined((j) => (isIn ? j.filter((x) => x !== person) : [...j, person]));
                        setPanel(null);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-ink-2 transition hover:bg-surface-dim"
                    >
                      <PersonAddIcon className="size-4 text-ink-3" />
                      <span className="flex-1 text-left">{person}</span>
                      <span className={`text-xs font-medium ${isIn ? "text-urgent" : "text-primary"}`}>{isIn ? "Remove" : "Add"}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : (
          <div key="wrap" data-tour="call-wrap" className="pointer-events-auto relative flex animate-swap flex-wrap items-center gap-3 rounded-[30px] bg-surface py-2.5 pr-2.5 pl-3 shadow-[0_18px_50px_-12px_rgb(0_0_0_/_0.55)]">
            <div className="flex items-center gap-2.5 pr-1">
              <Ring value={total - toDecide} total={total} />
              <div className="leading-tight">
                <p className="text-[13.5px] font-medium text-ink">{toDecide ? `${toDecide} to decide` : "All decided"}</p>
                <p className="text-[12px] text-ink-3">{pendingTasks ? `${pendingTasks} suggested task${pendingTasks === 1 ? "" : "s"}` : "Tasks confirmed"}</p>
              </div>
            </div>
            <span className="h-8 w-px bg-line" aria-hidden />
            <div className="relative">
              <button
                type="button"
                onClick={() => setPanel((x) => (x === "next" ? null : "next"))}
                aria-expanded={panel === "next"}
                aria-haspopup="listbox"
                className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-[13.5px] font-medium transition active:scale-95 ${nextCall ? "border-transparent bg-tonal text-on-tonal" : "border-line text-ink-2 hover:bg-surface-dim"}`}
              >
                <CalendarIcon className="size-4" />
                {nextCall ? `Next: ${nextCall}` : "Next call"}
                <ChevronDownIcon className={`size-4 transition-transform ${panel === "next" ? "rotate-180" : ""}`} />
              </button>
              {panel === "next" ? (
                <ul role="listbox" aria-label="Next call" className="absolute bottom-[calc(100%+10px)] left-0 w-[220px] animate-fade-up overflow-hidden rounded-2xl bg-surface py-1.5 shadow-lift">
                  {NEXT_OPTIONS.map((o) => (
                    <li key={o}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={nextCall === o}
                        onClick={() => {
                          setNextCall(o);
                          setPanel(null);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13.5px] text-ink transition hover:bg-surface-dim"
                      >
                        <span className="w-4">{nextCall === o ? <CheckIcon className="size-4 text-primary" /> : null}</span>
                        {o}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <Tip label={canSign ? "Sign as Maria R., RN" : toDecide ? `Decide ${toDecide} more first` : "Choose the next call first"}>
              <button
                type="button"
                onClick={sign}
                disabled={!canSign && signing === "idle"}
                className={`inline-flex h-11 min-w-[150px] items-center justify-center gap-2 rounded-full px-5 text-[14px] font-medium transition active:scale-95 ${
                  signing === "done" ? "bg-ok text-white" : canSign || signing !== "idle" ? "bg-primary text-white shadow-sm hover:bg-primary-hover hover:shadow-md" : "bg-surface-dim text-ink-3"
                }`}
              >
                {signing === "busy" ? <SpinnerIcon className="size-4" /> : signing === "done" ? <CheckDraw className="size-4" /> : <NoteIcon className="size-4" />}
                {signing === "busy" ? "Signing…" : signing === "done" ? "Signed" : "Sign and save"}
              </button>
            </Tip>
          </div>
        )}
      </div>
    </div>
  );
}
