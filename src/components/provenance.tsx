"use client";

import Image from "next/image";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertIcon,
  ArrowRightIcon,
  CloseIcon,
  DatabaseIcon,
  HistoryIcon,
  ShieldIcon,
  UndoIcon,
} from "./icons";
import { patients } from "@/lib/data";
import { BandGlyph, FreshLegend, FreshTag, LateNote } from "./freshness";
import {
  FACTS,
  SOURCES,
  TODAY,
  decide,
  ageDays,
  bandOf,
  fmtDate,
  seedFact,
  type Decision,
  type PFact,
  type PVersion,
  type Scored,
  type Seed,
} from "@/lib/provenance";

/* ====================================================================
   Store: base facts + what Maria did (confirm, revert, flag) this session
   ==================================================================== */

type Override = { added: PVersion[]; flags: string[] };
type Ctx = {
  fact: (key: string, seed?: Seed) => PFact;
  confirm: (key: string, value: string, note: string, seed?: Seed) => void;
  revert: (key: string, versionId: string, seed?: Seed) => void;
  flag: (key: string, versionId: string, seed?: Seed) => void;
  open: (key: string, seed?: Seed) => void;
};
const ProvCtx = createContext<Ctx | null>(null);
export const useProvenance = () => {
  const c = useContext(ProvCtx);
  if (!c) throw new Error("ProvenanceProvider missing");
  return c;
};

const todayIso = TODAY.toISOString().slice(0, 10);

export function ProvenanceProvider({ children }: { children: React.ReactNode }) {
  const [over, setOver] = useState<Record<string, Override>>({});
  const [seeds, setSeeds] = useState<Record<string, Seed>>({});
  const [openKey, setOpenKey] = useState<string | null>(null);

  const remember = useCallback((key: string, seed?: Seed) => {
    if (seed && !FACTS[key]) setSeeds((s) => (s[key] ? s : { ...s, [key]: seed }));
  }, []);

  const fact = useCallback(
    (key: string, seed?: Seed): PFact => {
      const base = FACTS[key] ?? seedFact(key, seed ?? seeds[key] ?? { patientId: "", group: "", label: key, value: "—", source: "Care record", age: "on file" });
      const o = over[key];
      if (!o) return base;
      return { ...base, versions: [...base.versions, ...o.added].map((v) => ({ ...v, flagged: o.flags.includes(v.id) })) };
    },
    [over, seeds],
  );

  const add = useCallback(
    (key: string, v: PVersion, seed?: Seed) => {
      remember(key, seed);
      setOver((o) => {
        const cur = o[key] ?? { added: [], flags: [] };
        return { ...o, [key]: { ...cur, added: [...cur.added, v] } };
      });
    },
    [remember],
  );

  const ctx = useMemo<Ctx>(
    () => ({
      fact,
      confirm: (key, value, note, seed) => add(key, { id: `m${Date.now()}`, value, src: "MARIA", observed: todayIso, ref: `CALL-NOTE-${Date.now().toString().slice(-6)}`, kind: "confirmed", note }, seed),
      revert: (key, versionId, seed) => {
        const target = fact(key, seed).versions.find((v) => v.id === versionId);
        if (!target) return;
        add(key, { id: `r${Date.now()}`, value: target.value, src: "MARIA", observed: todayIso, ref: `REVERT-${target.ref}`, kind: "revert", note: `Reverted to the ${SOURCES[target.src].name} value from ${fmtDate(target.observed)}` }, seed);
      },
      flag: (key, versionId, seed) => {
        remember(key, seed);
        setOver((o) => {
          const cur = o[key] ?? { added: [], flags: [] };
          const flags = cur.flags.includes(versionId) ? cur.flags.filter((x) => x !== versionId) : [...cur.flags, versionId];
          return { ...o, [key]: { ...cur, flags } };
        });
      },
      open: (key, seed) => {
        remember(key, seed);
        setOpenKey(key);
      },
    }),
    [fact, add, remember],
  );

  return (
    <ProvCtx.Provider value={ctx}>
      {children}
      {openKey ? <HistoryPage key={openKey} k={openKey} onClose={() => setOpenKey(null)} /> : null}
    </ProvCtx.Provider>
  );
}

/* ====================================================================
   Hover card: where this came from, what it changed from, who disagrees
   ==================================================================== */

function statusOf(d: Decision): { text: string; cls: string } {
  if (d.winner.v.src === "MARIA") return { text: d.winner.v.kind === "revert" ? "Reverted by Maria" : "Confirmed by Maria", cls: "bg-ok-bg text-ok" };
  if (d.tie) return { text: "Too close: Maria decides", cls: "bg-soon-bg text-soon" };
  if (d.runnerUp) return { text: "Sources disagree", cls: "bg-urgent-bg text-urgent" };
  return { text: "Single source", cls: "bg-surface-dim text-ink-2" };
}

const BAND_CLS = { fresh: "text-ok", ageing: "text-soon", old: "text-urgent" } as const;
const BAND_WORD = { fresh: "Fresh", ageing: "Ageing", old: "Outdated · ask again" } as const;

const srcTag = (v: PVersion) => (v.src === "MARIA" ? "Maria R., RN" : `${SOURCES[v.src].name}${v.org ? ` · ${v.org}` : ""}`);

export function Prov({ k, seed, children, className = "" }: { k: string; seed?: Seed; children: React.ReactNode; className?: string }) {
  const { fact, open } = useProvenance();
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const left = Math.min(Math.max(12, r.left), window.innerWidth - 352);
      setPos(r.bottom + 260 > window.innerHeight ? { left, bottom: window.innerHeight - r.top + 8 } : { left, top: r.bottom + 8 });
    }, 280);
  };
  const hide = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPos(null), 160);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  const f = fact(k, seed);
  const d = decide(f);
  const w = d.winner;
  const older = [...f.versions]
    .filter((v) => v.id !== w.v.id && !v.flagged && v.value !== w.v.value && v.observed <= w.v.observed)
    .sort((a, b) => (a.observed < b.observed ? 1 : -1))[0];
  const st = statusOf(d);
  const sources = new Set(f.versions.map((v) => v.src)).size;

  return (
    <>
      <span
        ref={ref}
        tabIndex={0}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className={`cursor-help rounded-sm underline decoration-ink-3/35 decoration-dotted underline-offset-[5px] transition-colors hover:decoration-primary focus-visible:decoration-primary ${className}`}
      >
        {children}
      </span>
      {pos && typeof document !== "undefined"
        ? createPortal(
            <div
              role="tooltip"
              onMouseEnter={() => clearTimeout(timer.current)}
              onMouseLeave={hide}
              style={{ position: "fixed", left: pos.left, top: pos.top, bottom: pos.bottom, zIndex: 95 }}
              className="w-[340px] animate-fade-up rounded-2xl border border-line bg-surface p-3.5 text-left shadow-lift"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13.5px] leading-snug font-medium text-ink">{w.v.value}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${st.cls}`}>{st.text}</span>
              </div>
              <p className="mt-1.5 flex items-start gap-1.5 text-[12px] text-ink-2">
                <DatabaseIcon className="mt-px size-3.5 shrink-0 text-ink-3" />
                <span>
                  <span className="font-medium">{srcTag(w.v)}</span> · {fmtDate(w.v.observed)}
                  {w.v.received && w.v.received !== w.v.observed ? ` · arrived ${fmtDate(w.v.received)}` : ""}
                </span>
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-1.5 pl-5">
                <FreshTag observed={w.v.observed} />
                <LateNote v={w.v} />
              </p>
              {older ? (
                <div className="mt-2 rounded-xl bg-surface-dim/70 px-2.5 py-2 text-[12px] leading-snug">
                  <p className="text-ink-3">
                    <span className="line-through decoration-urgent/40">{older.value}</span> · {srcTag(older)}, {fmtDate(older.observed)}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-ink">
                    <ArrowRightIcon className="size-3 text-ok" />
                    {w.v.value} · {srcTag(w.v)}, {fmtDate(w.v.observed)}
                  </p>
                </div>
              ) : null}
              {d.runnerUp ? (
                <p className="mt-2 flex items-start gap-1.5 text-[12px] leading-snug text-urgent">
                  <AlertIcon className="mt-px size-3.5 shrink-0" />
                  <span>
                    {srcTag(d.runnerUp.v)} says “{d.runnerUp.v.value}” · {d.runnerUp.score.toFixed(2)} vs {w.score.toFixed(2)}
                  </span>
                </p>
              ) : null}
              <p className="mt-2 text-[11.5px] text-ink-3">
                {w.v.src === "MARIA"
                  ? "Maria’s confirmation is the top source until it ages."
                  : d.tie
                    ? "Scores within 10%, so the rule leaves it to Maria."
                    : `Evidence ${w.score.toFixed(2)} = authority ${w.authority} × freshness ${w.freshness} × reliability ${w.reliability.toFixed(2)}`}
              </p>
              <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2">
                <span className="text-[11.5px] text-ink-3">
                  {f.versions.length} version{f.versions.length === 1 ? "" : "s"} · {sources} source{sources === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPos(null);
                    open(k, seed);
                  }}
                  className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-[12.5px] font-medium text-primary transition hover:bg-tonal/50"
                >
                  <HistoryIcon className="size-3.5" />
                  View full history
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/* ====================================================================
   History page: just the git graph; hover a commit for everything else
   ==================================================================== */

const LANE_COLORS: Record<string, string> = {
  MARIA: "#1e8e3e",
  D1: "#0e7c86",
  D2: "#c5221f",
  D3: "#1f5ae6",
  D4: "#e8710a",
  D5: "#8430ce",
  D6: "#5f6368",
  D9: "#b06000",
  D10: "#188038",
  D11: "#a142f4",
  D12: "#9e6a03",
  D13: "#d01884",
};
const laneColor = (src: string) => LANE_COLORS[src] ?? "#5f6368";

/** A stable 7-character commit id for a version, like a git short hash. */
const shortHash = (v: PVersion) => {
  let h = 2166136261;
  for (const ch of `${v.ref}:${v.id}:${v.value}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0).toString(16).padStart(8, "0").slice(0, 7);
};

type GraphRow = {
  v: PVersion;
  s: Scored;
  merged: boolean;
  head: boolean;
  kept?: { value: string; score: number }; // a rejected record: what the rule kept instead
  replacedOn?: string; // a merged record: when something else took over
};

/** Replays the records in time order; a commit "merges" when it becomes what Maria is shown. */
function buildGraph(f: PFact, current: Decision): { rows: GraphRow[]; lanes: string[] } {
  const chrono = [...f.versions].sort((a, b) => (a.observed === b.observed ? f.versions.indexOf(a) - f.versions.indexOf(b) : a.observed < b.observed ? -1 : 1));
  const rows: GraphRow[] = [];
  let shown: string | null = null;
  chrono.forEach((v, i) => {
    const d = decide({ ...f, versions: chrono.slice(0, i + 1) });
    const merged = d.winner.v.id === v.id && d.winner.v.id !== shown && !v.flagged;
    if (merged) shown = v.id;
    const s = current.ranked.find((r) => r.v.id === v.id)!;
    const atTime = d.ranked.find((r) => r.v.id === v.id)!;
    rows.push({
      v,
      s,
      merged,
      head: false,
      kept: !merged && !v.flagged && !atTime.superseded ? { value: d.winner.v.value, score: d.winner.score } : undefined,
    });
  });
  const headRow = rows.find((r) => r.v.id === current.winner.v.id);
  if (headRow) {
    headRow.head = true;
    headRow.merged = true;
    headRow.kept = undefined;
  }
  const merges = rows.filter((r) => r.merged);
  merges.forEach((r, i) => {
    if (!r.head && merges[i + 1]) r.replacedOn = merges[i + 1].v.observed;
  });
  const lanes: string[] = [];
  chrono.forEach((v) => {
    if (!lanes.includes(v.src)) lanes.push(v.src);
  });
  return { rows: rows.reverse(), lanes };
}

/** Interactive hover card (stays open while the pointer is on it). */
function HoverCard({ content, children, className = "" }: { content: () => React.ReactNode; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const left = Math.min(Math.max(12, r.right + 12), window.innerWidth - 352);
      const top = Math.max(12, r.top - 8);
      setPos(top + 320 > window.innerHeight ? { left, bottom: 12 } : { left, top });
    }, 160);
  };
  const hide = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPos(null), 140);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div ref={ref} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide} className={className}>
      {children}
      {pos
        ? createPortal(
            <div
              role="tooltip"
              onMouseEnter={() => clearTimeout(timer.current)}
              onMouseLeave={hide}
              style={{ position: "fixed", left: pos.left, top: pos.top, bottom: pos.bottom, zIndex: 95 }}
              className="w-[340px] animate-fade-up rounded-2xl border border-line bg-surface p-4 text-left shadow-lift"
            >
              {content()}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function HistoryPage({ k, onClose }: { k: string; onClose: () => void }) {
  const { fact, confirm, revert, flag } = useProvenance();
  const f = fact(k);
  const d = decide(f);
  const [toast, setToast] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null); // the commit expanded inline
  const p = patients.find((x) => x.id === f.patientId);
  const st = statusOf(d);
  const { rows, lanes } = buildGraph(f, d);

  useEffect(() => {
    const el = document.documentElement;
    const prev = el.style.overflow;
    el.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      el.style.overflow = prev;
      window.removeEventListener("keydown", onKey, true);
    };
  }, [onClose]);

  const say = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(null), 2600);
  };

  // graph geometry (rows can expand inline, so y positions are cumulative)
  const ROW = 40;
  const EXP = 132;
  const LANE = 18;
  const X0 = 16;
  const laneX = (src: string) => X0 + LANE * (lanes.indexOf(src) + 1);
  const W = X0 + LANE * lanes.length + 14;
  const tops: number[] = [];
  let acc = ROW; // the "Now" row
  rows.forEach((r) => {
    tops.push(acc);
    acc += ROW + (open === r.v.id ? EXP : 0);
  });
  const H = acc;
  const cy = (i: number) => tops[i] + ROW / 2;
  const NOW_Y = ROW / 2;
  const mergeY = (i: number) => cy(i) - ROW / 2; // where a merge enters shown: just above its commit
  const COLS = `${W + 10}px minmax(0,1fr) 60px 128px 160px 72px`;
  const mergedIdx = rows.map((r, i) => (r.merged ? i : -1)).filter((i) => i >= 0);
  const tipOf = new Map<string, string>(); // newest commit per source = branch tip
  rows.forEach((r) => {
    if (!tipOf.has(r.v.src)) tipOf.set(r.v.src, r.v.id);
  });

  /** Inline details under a row (Git Graph's commit details). */
  const detail = (r: GraphRow) => {
    const src = SOURCES[r.v.src];
    return (
      <div className="grid h-full grid-cols-1 gap-4 border-b border-line bg-surface-dim/40 px-4 py-3 sm:grid-cols-2">
        <div className="min-w-0 text-[12.5px] leading-relaxed text-ink-2">
          <p className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: laneColor(r.v.src) }} />
            <span className="font-medium text-ink">{src.name}</span>
            {r.v.org ? <span>· {r.v.org}</span> : null}
          </p>
          <p>
            {r.v.src === "MARIA" ? (r.v.kind === "revert" ? "Reverted" : "Confirmed") : "Observed"} {fmtDate(r.v.observed)}
            {r.v.received && r.v.received !== r.v.observed ? ` · arrived ${fmtDate(r.v.received)}` : ""}
            <FreshTag observed={r.v.observed} className="ml-1.5 align-[1px]" />
            <LateNote v={r.v} className="ml-1.5" />
          </p>
          <p className="truncate">{[...src.lineage.map((l) => l.label), ...(r.v.src === "MARIA" ? [] : ["HiLabs ingest"]), "shown"].join(" → ")}</p>
          <p className="font-mono text-[11.5px] text-ink-3">
            {shortHash(r.v)} · record {r.v.ref}
          </p>
          {r.v.note ? <p className="text-ink-3">{r.v.note}</p> : null}
        </div>
        <div className="min-w-0">
          <div className={`rounded-xl px-3 py-2 text-[12.5px] ${r.v.flagged ? "bg-urgent-bg text-urgent" : r.merged ? "bg-ok-bg text-ok" : "bg-surface text-ink-2"}`}>
            <p className="font-medium">
              {r.v.flagged ? "Flagged · left out of the rule" : r.head ? "Shown to Maria now" : r.replacedOn ? `Was shown until ${fmtDate(r.replacedOn)}` : r.kept ? `Not merged · the rule kept “${r.kept.value}”` : "Superseded by a newer record from the same source"}
            </p>
            {!r.v.flagged ? (
              <p className="mt-0.5 opacity-80">
                {r.v.src === "MARIA"
                  ? `${r.s.score.toFixed(2)}: Maria’s word is the top source`
                  : `${r.s.score.toFixed(2)} = authority ${r.s.authority} × freshness ${r.s.freshness} × reliability ${r.s.reliability.toFixed(2)}${r.kept ? ` · lost to ${r.kept.score.toFixed(2)}` : ""}`}
              </p>
            ) : null}
          </div>
          <div className="mt-2.5 flex gap-2">
            {!r.head ? (
              <button
                type="button"
                disabled={r.v.flagged}
                onClick={() => {
                  revert(k, r.v.id);
                  setOpen(null);
                  say(`Reverted to “${r.v.value}”. Added as a new commit by Maria.`);
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-[12.5px] font-medium text-white transition hover:bg-primary-hover active:scale-95 disabled:opacity-40"
              >
                <UndoIcon className="size-3.5" />
                Revert to this
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  confirm(k, r.v.value, "Confirmed as correct from the history");
                  setOpen(null);
                  say("Confirmed. Your confirmation is now the top source.");
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-[12.5px] font-medium text-white transition hover:bg-primary-hover active:scale-95"
              >
                <ShieldIcon className="size-3.5" />
                Confirm
              </button>
            )}
            {r.v.src !== "MARIA" ? (
              <button
                type="button"
                onClick={() => {
                  flag(k, r.v.id);
                  say(r.v.flagged ? "Flag removed." : `${src.name} record flagged; the rule re-ran without it.`);
                }}
                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition active:scale-95 ${r.v.flagged ? "border-transparent bg-urgent-bg text-urgent" : "border-line text-ink-2 hover:bg-urgent-bg hover:text-urgent"}`}
              >
                <AlertIcon className="size-3.5" />
                {r.v.flagged ? "Unflag" : "Flag as wrong"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  const card = (r: GraphRow) => {
    const src = SOURCES[r.v.src];
    const lag = r.v.received && r.v.received !== r.v.observed ? ` · arrived ${fmtDate(r.v.received)}` : "";
    return (
      <>
        <div className="flex items-start justify-between gap-2">
          <p className={`text-[14px] leading-snug font-medium ${r.v.flagged ? "text-ink-3 line-through" : "text-ink"}`}>{r.v.value}</p>
          <span className="shrink-0 font-mono text-[11.5px] text-ink-3">{shortHash(r.v)}</span>
        </div>
        <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-ink-2">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: laneColor(r.v.src) }} />
          <span>
            <span className="font-medium">{src.name}</span>
            {r.v.org ? ` · ${r.v.org}` : ""}
          </span>
        </p>
        <p className="mt-0.5 pl-4 text-[12px] text-ink-3">
          {r.v.src === "MARIA" ? (r.v.kind === "revert" ? "Reverted" : "Confirmed") : "Observed"} {fmtDate(r.v.observed)}
          {lag}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 pl-4">
          <FreshTag observed={r.v.observed} />
          <LateNote v={r.v} />
        </p>

        <div className={`mt-3 rounded-xl px-3 py-2 text-[12.5px] ${r.v.flagged ? "bg-urgent-bg text-urgent" : r.merged ? "bg-ok-bg text-ok" : "bg-surface-dim text-ink-2"}`}>
          <p className="font-medium">{r.v.flagged ? "Flagged as wrong · left out of the rule" : r.head ? "Shown to Maria now" : r.merged ? "Merged · was shown, later replaced" : r.s.superseded ? "Superseded by a newer record from the same source" : "Not merged · another source scored higher"}</p>
          {!r.v.flagged ? (
            <p className="mt-0.5 opacity-80">
              {r.v.src === "MARIA" ? `${r.s.score.toFixed(2)}: Maria’s word is the top source` : `${r.s.score.toFixed(2)} = authority ${r.s.authority} × freshness ${r.s.freshness} × reliability ${r.s.reliability.toFixed(2)}`}
            </p>
          ) : null}
        </div>

        <p className="mt-3 text-[11.5px] font-medium tracking-wide text-ink-3">Path</p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-ink-2">
          {[...src.lineage.map((l) => l.label), ...(r.v.src === "MARIA" ? [] : ["HiLabs ingest"]), "shown"].join("  →  ")}
        </p>
        <p className="mt-1 font-mono text-[11.5px] text-ink-3">record {r.v.ref}</p>
        {r.v.note ? <p className="mt-1 text-[12px] text-ink-3">{r.v.note}</p> : null}

        <div className="mt-3 flex gap-2 border-t border-line pt-3">
          {!r.head ? (
            <button
              type="button"
              disabled={r.v.flagged}
              onClick={() => {
                revert(k, r.v.id);
                say(`Reverted to “${r.v.value}”. Added as a new commit by Maria.`);
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-[12.5px] font-medium text-white transition hover:bg-primary-hover active:scale-95 disabled:opacity-40"
            >
              <UndoIcon className="size-3.5" />
              Revert to this
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                confirm(k, r.v.value, "Confirmed as correct from the history");
                say("Confirmed. Your confirmation is now the top source.");
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-[12.5px] font-medium text-white transition hover:bg-primary-hover active:scale-95"
            >
              <ShieldIcon className="size-3.5" />
              Confirm
            </button>
          )}
          {r.v.src !== "MARIA" ? (
            <button
              type="button"
              onClick={() => {
                flag(k, r.v.id);
                say(r.v.flagged ? "Flag removed." : `${src.name} record flagged; the rule re-ran without it.`);
              }}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition active:scale-95 ${r.v.flagged ? "border-transparent bg-urgent-bg text-urgent" : "border-line text-ink-2 hover:bg-urgent-bg hover:text-urgent"}`}
            >
              <AlertIcon className="size-3.5" />
              {r.v.flagged ? "Unflag" : "Flag as wrong"}
            </button>
          ) : null}
        </div>
      </>
    );
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="hist-title" className="fixed inset-0 z-[80] flex animate-swap flex-col bg-canvas">
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-surface px-4 py-3 sm:px-6">
        <button type="button" onClick={onClose} aria-label="Back" className="grid size-10 place-items-center rounded-full text-ink-2 transition hover:bg-surface-dim active:scale-90">
          <ArrowRightIcon className="size-5 rotate-180" />
        </button>
        {p ? <Image src={p.photo} alt="" width={64} height={64} className="size-8 rounded-full object-cover" /> : null}
        <nav aria-label="Breadcrumb" className="min-w-0 flex-1 truncate text-[13.5px] text-ink-3">
          {p?.name} <span className="mx-1">/</span> {f.group} <span className="mx-1">/</span> <span className="text-ink">{f.label}</span>
        </nav>
        <button type="button" onClick={onClose} aria-label="Close history" className="grid size-10 place-items-center rounded-full text-ink-2 transition hover:bg-surface-dim active:scale-90">
          <CloseIcon className="size-5" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1000px] px-4 py-8 sm:px-6">
          {/* what Maria sees now */}
          <p className="text-[13px] text-ink-3">{f.label}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 id="hist-title" key={d.winner.v.id} className="animate-fade-up text-[28px] leading-tight font-normal text-ink">
              {d.winner.v.value}
            </h1>
            <span className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${st.cls}`}>{st.text}</span>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
            <span>
              from {srcTag(d.winner.v)} · {fmtDate(d.winner.v.observed)}
            </span>
            <FreshTag observed={d.winner.v.observed} />
            <LateNote v={d.winner.v} />
          </p>

          {/* the graph, Git Graph style */}
          <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface shadow-card" aria-label="Version history" data-tour="history">
            <div className="grid border-b border-line bg-surface-dim/60 text-[12px] font-medium text-ink-2" style={{ gridTemplateColumns: COLS }}>
              <span className="px-3 py-2">Sources</span>
              <span className="px-3 py-2">Description</span>
              <span className="px-3 py-2 text-right">Score</span>
              <span className="px-3 py-2">Date</span>
              <span className="px-3 py-2">From</span>
              <span className="px-3 py-2">Record</span>
            </div>
            <div className="relative" style={{ height: H }}>
              <svg width={W} height={H} className="pointer-events-none absolute top-0 left-0" aria-hidden>
                {/* shown: one straight line from Now down to the oldest merge */}
                {mergedIdx.length ? <line x1={X0} y1={NOW_Y} x2={X0} y2={mergeY(Math.max(...mergedIdx))} stroke="#1f1f1f" strokeWidth="2" /> : null}
                {/* each source: one continuous line through all its commits */}
                {lanes.map((l) => {
                  const idx = rows.map((r, i) => (r.v.src === l ? i : -1)).filter((i) => i >= 0);
                  return idx.length > 1 ? <line key={l} x1={laneX(l)} y1={cy(Math.min(...idx))} x2={laneX(l)} y2={cy(Math.max(...idx))} stroke={laneColor(l)} strokeWidth="2" /> : null;
                })}
                {rows.map((r, i) => {
                  const c = laneColor(r.v.src);
                  const x = laneX(r.v.src);
                  const y = cy(i);
                  const my = mergeY(i);
                  return (
                    <g key={`c-${r.v.id}`}>
                      {/* merge: curves up into shown */}
                      {r.merged ? <path d={`M${x} ${y} C${x} ${y - 14}, ${X0} ${my + 12}, ${X0} ${my}`} fill="none" stroke={c} strokeWidth="2" /> : null}
                      {r.merged ? <circle cx={X0} cy={my} r="3.5" fill="#1f1f1f" /> : null}
                      {/* rejected: dashed curve that stops at an ✕ before reaching shown */}
                      {r.kept ? (
                        <>
                          <path d={`M${x} ${y} C${x} ${y - 12}, ${X0 + 11} ${my + 12}, ${X0 + 11} ${my + 5}`} fill="none" stroke={c} strokeWidth="1.6" strokeDasharray="3 3" />
                          <path d={`M${X0 + 7.5} ${my - 0.5}l7 7M${X0 + 14.5} ${my - 0.5}l-7 7`} stroke={c} strokeWidth="1.8" strokeLinecap="round" />
                        </>
                      ) : null}
                      {r.v.flagged ? (
                        <>
                          <circle cx={x} cy={y} r="4.5" fill="#ffffff" stroke="#b3261e" strokeWidth="2" />
                          <path d={`M${x - 2.2} ${y - 2.2}l4.4 4.4M${x + 2.2} ${y - 2.2}l-4.4 4.4`} stroke="#b3261e" strokeWidth="1.4" />
                        </>
                      ) : (
                        <circle cx={x} cy={y} r="4.5" fill={r.merged ? c : "#ffffff"} stroke={c} strokeWidth="2" />
                      )}
                    </g>
                  );
                })}
                {/* Now node */}
                <circle cx={X0} cy={NOW_Y} r="6" fill="#ffffff" stroke="#1f1f1f" strokeWidth="2.5" />
                <circle cx={X0} cy={NOW_Y} r="2.2" fill="#1f1f1f" />
              </svg>

              <ol>
                <li style={{ height: ROW }}>
                  <HoverCard content={() => card(rows.find((r) => r.head) ?? rows[0])} className="h-full">
                    <div className="grid h-full w-full items-center border-b border-line/60 bg-surface-dim/40 text-[13px]" style={{ gridTemplateColumns: COLS }}>
                      <span />
                      <span className="flex min-w-0 items-center gap-1.5 px-3">
                        <span className="shrink-0 rounded-md bg-ink px-1.5 py-px text-[11px] font-medium text-white">shown</span>
                        <span className="font-medium text-ink">Now</span>
                        <span className="truncate text-ink-2">· {d.winner.v.value}</span>
                      </span>
                      <span className="px-3 text-right font-medium text-ink tabular-nums">{d.winner.score.toFixed(2)}</span>
                      <span className="px-3 text-ink-3">Today</span>
                      <span className="truncate px-3 text-ink-2">{d.winner.v.org ?? (d.winner.v.src === "MARIA" ? "Maria R., RN" : SOURCES[d.winner.v.src].name)}</span>
                      <span className="px-3 font-mono text-[12px] font-medium text-ink">Current</span>
                    </div>
                  </HoverCard>
                </li>
                {rows.map((r) => {
                  const c = laneColor(r.v.src);
                  const isOpen = open === r.v.id;
                  const isTip = tipOf.get(r.v.src) === r.v.id;
                  const word = r.v.flagged ? "flagged" : r.head ? "" : r.kept ? "not merged" : r.replacedOn ? `replaced ${fmtDate(r.replacedOn)}` : "superseded";
                  return (
                    <li key={r.v.id}>
                      <HoverCard content={() => card(r)} className="block" >
                        <button
                          type="button"
                          onClick={() => setOpen(isOpen ? null : r.v.id)}
                          aria-expanded={isOpen}
                          style={{ height: ROW, gridTemplateColumns: COLS }}
                          className={`grid w-full items-center border-b border-line/60 text-left text-[13px] transition ${isOpen ? "bg-tonal/40" : "hover:bg-tonal/25"}`}
                        >
                          <span />
                          <span className="flex min-w-0 items-center gap-1.5 px-3">
                            {isTip ? (
                              <span className="shrink-0 rounded-md border px-1.5 py-px text-[11px] font-medium" style={{ borderColor: c, color: c }}>
                                {SOURCES[r.v.src].name}
                              </span>
                            ) : null}
                            {r.head ? <span className="shrink-0 rounded-md bg-ink px-1.5 py-px text-[10.5px] font-medium text-white">In use</span> : null}
                            <span className={`truncate ${r.v.flagged ? "text-ink-3 line-through" : r.merged ? "text-ink" : "text-ink-3"}`}>{r.v.value}</span>
                            {word ? <span className={`shrink-0 text-[12px] ${r.v.flagged ? "text-urgent" : "text-ink-3"}`}>· {word}</span> : null}
                          </span>
                          <span className={`px-3 text-right tabular-nums ${r.head ? "font-medium text-ok" : "text-ink-3"}`}>{r.s.score.toFixed(2)}</span>
                          <span className="flex items-center gap-1.5 px-3 whitespace-nowrap text-ink-3 tabular-nums" title={`${BAND_WORD[bandOf(ageDays(r.v.observed))]}${r.v.received && r.v.received !== r.v.observed ? ` · arrived ${fmtDate(r.v.received)}` : ""}`}>
                            <span className={BAND_CLS[bandOf(ageDays(r.v.observed))]}>
                              <BandGlyph band={bandOf(ageDays(r.v.observed))} />
                            </span>
                            {fmtDate(r.v.observed)}
                            {r.v.received && r.v.received !== r.v.observed ? <span className="text-[11px] text-soon">late</span> : null}
                          </span>
                          <span className="truncate px-3 text-ink-2">{r.v.org ?? (r.v.src === "MARIA" ? "Maria R., RN" : SOURCES[r.v.src].name)}</span>
                          <span className="px-3 font-mono text-[12px] text-ink-3">{shortHash(r.v)}</span>
                        </button>
                      </HoverCard>
                      {isOpen ? (
                        <div className="animate-fade-up overflow-hidden" style={{ height: EXP, paddingLeft: W + 10 }}>
                          {detail(r)}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t border-line px-3 py-2">
              <p className="text-[12px] text-ink-3">Each colour is a source. Solid curve: merged into shown. Dashed curve ending in ✕: the rule kept what was shown. Click a row for details and revert.</p>
              <FreshLegend />
            </div>
          </section>
        </div>
      </div>

      {toast ? (
        <div key={toast} className="pointer-events-none fixed inset-x-0 bottom-5 z-[96] flex justify-center px-4">
          <p className="animate-toast rounded-lg bg-[#303030] px-4 py-3 text-sm text-white shadow-lift">{toast}</p>
        </div>
      ) : null}
    </div>
  );
}
