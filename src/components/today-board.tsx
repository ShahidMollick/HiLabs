"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "./shell";
import { ProfileSheet } from "./profile-sheet";
import { profileFor } from "@/lib/profiles";
import { Prov, useProvenance } from "./provenance";
import { CallFlow, type SignResult } from "./call-flow";
import { specs } from "@/lib/calls";
import { CheckIcon, ChevronIcon, ClockIcon, PhoneIcon, UndoIcon } from "./icons";
import { allClear, openTasks, patients, type Patient, type Task } from "@/lib/data";
import { CallStats } from "./call-stats";
import { FreshLegend, FreshTag, LateNote } from "./freshness";
import { FACTS, ageDays, ageToIso, fmtDate, slug, type Seed } from "@/lib/provenance";

/* ---------- how fresh the facts behind the Up next card are ---------- */
type FreshItem = { label: string; k: string; seed?: Seed; observed: string; received?: string; when: string };
const ver = (k: string, id: string) => FACTS[k].versions.find((v) => v.id === id)!;
const when = (iso: string) => {
  const a = ageDays(iso);
  return a === 0 ? "Today" : a === 1 ? "Yesterday" : fmtDate(iso);
};
function freshItems(id: string): FreshItem[] {
  if (id === "tanya-brooks") {
    const note = ver("tanya.sertraline", "s2");
    const fill = ver("tanya.sertraline", "s3");
    const dx = ver("tanya.conditions", "c1");
    const hra = ver("tanya.housing", "h1");
    return [
      { label: "Discharge note", k: "tanya.sertraline", ...note, when: `${ageDays(note.observed)} days` },
      { label: "Pharmacy refill", k: "tanya.sertraline", ...fill, when: fmtDate(fill.observed) },
      { label: "Claims diagnosis", k: "tanya.conditions", ...dx, when: fmtDate(dx.observed) },
      { label: "Housing form", k: "tanya.housing", ...hra, when: fmtDate(hra.observed) },
    ];
  }
  if (id === "lai-fong-chan") {
    const fill = ver("chan.amlodipine", "m3");
    const note = ver("chan.event", "v2");
    const care = ver("chan.caregiver", "g2");
    const hra = ver("chan.mobility", "f1");
    return [
      { label: "Pharmacy fill", k: "chan.amlodipine", ...fill, when: fmtDate(fill.observed) },
      { label: "Rehab discharge note", k: "chan.event", ...note, when: fmtDate(note.observed) },
      { label: "Care note", k: "chan.caregiver", ...care, when: fmtDate(care.observed) },
      { label: "Health form", k: "chan.mobility", ...hra, when: fmtDate(hra.observed) },
    ];
  }
  const seen = new Set<string>();
  return specs[id].noticed
    .filter((n) => !/on file|since/i.test(n.age) && !seen.has(n.source) && seen.add(n.source))
    .slice(0, 4)
    .map((n) => {
      const observed = ageToIso(n.age);
      const seed: Seed = { patientId: id, group: "Sources", label: n.source, value: n.text, source: n.source, age: n.age };
      return { label: n.source, k: n.prov ?? `${id}.src.${slug(n.source)}`, seed, observed, when: when(observed) };
    });
}

type Done = { how: "call" | "manual"; seconds?: number };
type Call = { id: string; startedAt: number; muted: boolean; hold: boolean; endedAt?: number };
type Toast = { key: number; text: string; undo?: () => void };

const byId = Object.fromEntries(patients.map((p) => [p.id, p])) as Record<string, Patient>;
// How Maria refers to people (Mrs Chan is addressed formally, via her daughter).
const first = (name: string) => (name === "Lai Fong Chan" ? "Mrs Chan" : name.split(" ")[0]);
const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

function Avatar({ p, size = 40, ring }: { p: Patient; size?: number; ring?: boolean }) {
  return (
    <span className={`block shrink-0 overflow-hidden rounded-full bg-surface-dim ${ring ? "animate-ring" : ""}`} style={{ width: size, height: size }}>
      <Image src={p.photo} alt="" width={size * 2} height={size * 2} className="size-full object-cover" />
    </span>
  );
}

function Chip({ tone, children }: { tone: "urgent" | "soon" | "neutral" | "ok"; children: React.ReactNode }) {
  const styles = {
    urgent: "bg-urgent-bg text-urgent",
    soon: "bg-soon-bg text-soon",
    neutral: "bg-surface-dim text-ink-2",
    ok: "bg-ok-bg text-ok",
  }[tone];
  return <span className={`inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-[13px] font-medium ${styles}`}>{children}</span>;
}

export function TodayBoard() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelected] = useState(patients[0].id);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [nextCalls, setNextCalls] = useState<Record<string, string>>({});
  const [tasks, setTasks] = useState<Task[]>(openTasks);
  const [taskDone] = useState<string[]>([]);
  const openCount = tasks.filter((t) => !taskDone.includes(t.id)).length;
  const [done, setDone] = useState<Record<string, Done>>({});
  const [call, setCall] = useState<Call | null>(null);
  const [now, setNow] = useState(0); // set when a call starts
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const setSelectedId = (id: string) => setSelected(id);

  useEffect(() => {
    if (!call || call.endedAt) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [call]);

  const showToast = useCallback((text: string, undo?: () => void) => {
    clearTimeout(toastTimer.current);
    setToast({ key: Date.now(), text, undo });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => patients.filter((p) => !q || `${p.name} ${p.reason}`.toLowerCase().includes(q)), [q]);
  const groups = [
    { title: "Today", rows: visible.filter((p) => p.urgency === "today") },
    { title: "This week", rows: visible.filter((p) => p.urgency === "week") },
  ].filter((g) => g.rows.length);

  const todayAll = patients.filter((p) => p.urgency === "today");
  const callsDone = todayAll.filter((p) => done[p.id]).length;
  const remaining = todayAll.length - callsDone;
  const callsDoneByCall = patients.filter((p) => done[p.id]?.how === "call").length;
  const pct = Math.round((callsDone / todayAll.length) * 100);

  const selected = byId[selectedId];
  const selectedDone = done[selectedId];
  const nextUp = patients.find((p) => !done[p.id] && p.id !== selectedId);
  const isFirstOpen = patients.find((p) => !done[p.id])?.id === selectedId;

  const undoDone = (id: string) =>
    setDone((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  const toggleDone = (p: Patient) => {
    if (done[p.id]) {
      undoDone(p.id);
      showToast(`${first(p.name)} is back on your list`);
    } else {
      setDone((prev) => ({ ...prev, [p.id]: { how: "manual" } }));
      showToast(`${first(p.name)} marked as reached`, () => undoDone(p.id));
    }
  };

  const startCall = (p: Patient) => {
    if (call) return;
    setSelected(p.id);
    setSheetId(null);
    setNow(Date.now());
    setCall({ id: p.id, startedAt: Date.now(), muted: false, hold: false });
  };

  // End call -> the same screen turns into review and sign
  const endCall = () => setCall((c) => (c && !c.endedAt ? { ...c, endedAt: Date.now(), muted: false, hold: false } : c));

  // Sign and save -> back to the list, with the kept tasks
  const prov = useProvenance();
  const finishCall = (res: SignResult) => {
    if (!call) return;
    const p = byId[call.id];
    const seconds = Math.max(1, Math.round(((call.endedAt ?? Date.now()) - call.startedAt) / 1000));
    setDone((prev) => ({ ...prev, [p.id]: { how: "call", seconds } }));
    setCall(null);
    setTasks((prev) => [
      ...res.tasks.map((text, i) => ({ id: `${p.id}-${Date.now()}-${i}`, patientId: p.id, text, due: "This week", fromCall: true })),
      ...prev,
    ]);
    setNextCalls((prev) => ({ ...prev, [p.id]: res.nextCall }));
    res.confirmed.forEach((c) => prov.confirm(c.prov, c.value, `Confirmed on the call, 9 Nov · signed by Maria R., RN`));
    showToast(`Signed and saved · ${first(p.name)} · next call: ${res.nextCall.toLowerCase()}`, () => undoDone(p.id));
  };

  const elapsed = call ? Math.max(0, Math.floor(((call.endedAt ?? now) - call.startedAt) / 1000)) : 0;

  const renderRow = (p: Patient) => {
    const isSel = p.id === selectedId;
    const d = done[p.id];
    const live = call?.id === p.id;
    return (
      <li key={p.id}>
        <div className={`group flex items-center gap-2 rounded-2xl pr-2 transition-colors ${isSel ? "bg-tonal/60" : "hover:bg-surface-dim"}`}>
          <button
            type="button"
            onClick={() => setSelectedId(p.id)}
            aria-pressed={isSel}
            className="flex min-w-0 flex-1 items-center gap-4 rounded-2xl py-3 pl-3 text-left transition-transform active:scale-[0.99]"
          >
            <span className={d ? "opacity-50 grayscale transition" : "transition"}>
              <Avatar p={p} />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-[15px] font-medium ${d ? "text-ink-3 line-through decoration-ink-3/40" : "text-ink"}`}>{p.name}</span>
              <span className="block truncate text-sm text-ink-2">{p.reason}</span>
            </span>
            <span className="hidden w-[190px] shrink-0 justify-end sm:flex">
              {live ? (
                <Chip tone="neutral">
                  <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                  On call
                </Chip>
              ) : d ? (
                <Chip tone="ok">
                  <CheckIcon className="size-3.5" />
                  {d.how === "call" ? `Called · ${fmt(d.seconds ?? 0)}` : "Reached"}
                </Chip>
              ) : (
                <Chip tone={p.urgency === "today" ? "urgent" : "soon"}>{p.due}</Chip>
              )}
            </span>
            <span className="hidden w-[76px] shrink-0 justify-end whitespace-nowrap text-sm text-ink-3 tabular-nums md:flex">{p.bestTime}</span>
          </button>
          <span className="flex items-center sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
            <button
              type="button"
              aria-label={`Call ${p.name}`}
              disabled={!!call || !!d}
              onClick={() => startCall(p)}
              className="grid size-9 place-items-center rounded-full text-primary transition hover:bg-surface active:scale-90 disabled:pointer-events-none disabled:opacity-30"
            >
              <PhoneIcon className="size-[18px]" />
            </button>
            <button
              type="button"
              aria-label={d ? `Move ${p.name} back to the list` : `Mark ${p.name} as reached`}
              aria-pressed={!!d}
              disabled={live}
              onClick={() => toggleDone(p)}
              className={`grid size-9 place-items-center rounded-full transition hover:bg-surface active:scale-90 disabled:opacity-30 ${d ? "text-ok" : "text-ink-3 hover:text-ok"}`}
            >
              {d ? <UndoIcon className="size-[18px]" /> : <CheckIcon className="size-[18px]" />}
            </button>
          </span>
        </div>
      </li>
    );
  };

  return (
    <AppShell
      query={query}
      onQuery={setQuery}
      taskCount={openCount}
      greeting={
        <>
          <h1 className="truncate text-[19px] leading-tight font-normal text-ink">Good morning, Maria</h1>
          <p className="hidden truncate text-[13px] text-ink-3 sm:block">
            Monday, 9 November ·{" "}
            {remaining > 0 ? (
              <>
                <span className="font-medium text-ink-2">
                  {remaining} {remaining === 1 ? "call" : "calls"} today
                </span>{" "}
                · {allClear} need nothing new
              </>
            ) : (
              <span className="font-medium text-ok">Today’s calls are done</span>
            )}
          </p>
        </>
      }
      status={
        <div data-tour="progress" className="w-[160px]" role="progressbar" aria-label="Calls done today" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="mb-1 flex justify-between text-[13px]">
            <span className="text-ink-3">Calls done</span>
            <span className="font-medium text-ink tabular-nums">
              {callsDone} of {todayAll.length}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-dim">
            <div className={`h-full rounded-full transition-[width] duration-700 ease-out ${pct === 100 ? "bg-ok" : "bg-primary"}`} style={{ width: `${Math.max(pct, 3)}%` }} />
          </div>
        </div>
      }
    >
      {call ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Call with ${byId[call.id].name}`}
          className="fixed inset-0 z-40 animate-backdrop overflow-y-auto bg-[#0f1522]/75 backdrop-blur-[3px]"
        >
        <CallFlow
          key={call.id}
          patient={byId[call.id]}
          spec={specs[call.id]}
          elapsed={elapsed}
          muted={call.muted}
          hold={call.hold}
          ended={!!call.endedAt}
          onMute={() => setCall((c) => (c ? { ...c, muted: !c.muted } : c))}
          onHold={() => setCall((c) => (c ? { ...c, hold: !c.hold } : c))}
          onEnd={endCall}
          onSigned={finishCall}
          onOpenProfile={() => setSheetId(call.id)}
        />
        </div>
      ) : null}

      {sheetId ? (
        <ProfileSheet
          key={sheetId}
          patient={byId[sheetId]}
          profile={profileFor(sheetId)}
          onClose={() => setSheetId(null)}
          onCall={call ? undefined : () => startCall(byId[sheetId])}
          live={call && call.id === sheetId && !call.endedAt ? { elapsed, muted: call.muted, onMute: () => setCall((c) => (c ? { ...c, muted: !c.muted } : c)) } : undefined}
          today={
            done[sheetId]?.how === "call"
              ? { seconds: done[sheetId].seconds ?? 0, nextCall: nextCalls[sheetId], tasks: tasks.filter((t) => t.patientId === sheetId && t.fromCall).map((t) => t.text) }
              : undefined
          }
        />
      ) : null}
      <div className="mx-auto max-w-[1200px] pt-5 sm:pt-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col gap-4">
            {/* Who to call now */}
            <section data-tour="upnext" aria-labelledby="focus-name" className="rounded-3xl bg-surface p-6 shadow-card">
              <div key={selected.id} className="flex animate-fade-up flex-col gap-5 sm:flex-row sm:items-center">
                <Avatar p={selected} size={72} ring={call?.id === selected.id} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-primary">{isFirstOpen ? "Up next" : "Selected"}</p>
                  <h2 id="focus-name" className="mt-0.5 text-2xl font-normal text-ink">
                    {selected.name}
                    <span className="ml-2 text-base text-ink-3">{selected.age}</span>
                  </h2>
                  <p className="mt-1 text-[15px] text-ink-2">
                    <Prov
                      k={selected.id === "tanya-brooks" ? "tanya.sertraline" : selected.id === "lai-fong-chan" ? "chan.amlodipine" : `${selected.id}.reason`}
                      seed={{ patientId: selected.id, group: "Why today", label: "Reason", value: selected.reason, source: specs[selected.id].noticed[0].source, age: specs[selected.id].noticed[0].age }}
                    >
                      {selected.reason}
                    </Prov>
                    . {selected.why}.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedDone ? (
                      <Chip tone="ok">
                        <CheckIcon className="size-3.5" />
                        Reached today
                      </Chip>
                    ) : (
                      <Chip tone={selected.urgency === "today" ? "urgent" : "soon"}>{selected.due}</Chip>
                    )}
                    <Chip tone="neutral">
                      <ClockIcon className="size-3.5" />
                      {selected.bestTime}
                      {selected.contact !== first(selected.name) ? ` · ${selected.contact}` : ""}
                    </Chip>
                  </div>
                </div>
                <div className="flex gap-2 sm:flex-col">
                  {selectedDone ? (
                    nextUp ? (
                      <button
                        type="button"
                        onClick={() => setSelectedId(nextUp.id)}
                        className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-tonal px-5 text-sm font-medium text-on-tonal transition hover:brightness-95 active:scale-[0.97]"
                      >
                        Next: {first(nextUp.name)}
                        <ChevronIcon className="size-4" />
                      </button>
                    ) : null
                  ) : (
                    <button
                      type="button"
                      onClick={() => startCall(selected)}
                      disabled={!!call}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-white transition hover:bg-primary-hover hover:shadow-[0_1px_3px_rgb(60_64_67_/_0.3)] active:scale-[0.97] disabled:bg-ink-3"
                    >
                      <PhoneIcon className="size-4" />
                      {call?.id === selected.id ? "On call" : "Start call"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSheetId(selected.id)}
                    aria-expanded={sheetId === selected.id}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-line px-6 text-sm font-medium text-primary transition hover:bg-surface-dim active:scale-[0.97]"
                  >
                    Open profile
                  </button>
                </div>
              </div>
              <div key={`f-${selected.id}`} data-tour="freshness" className="mt-5 animate-fade-up border-t border-line pt-4">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <h3 className="text-[13px] font-medium text-ink-2">Sources</h3>
                  <FreshLegend />
                </div>
                <ul className="mt-2.5 grid grid-cols-2 gap-2 lg:grid-cols-4">
                  {freshItems(selected.id).map((it) => (
                    <li key={it.label} className="min-w-0 rounded-xl bg-surface-dim/60 px-3 py-2">
                      <p className="truncate text-[13px] font-medium text-ink">
                        <Prov k={it.k} seed={it.seed}>
                          {it.label}
                        </Prov>
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] text-ink-3">
                        <span className="tabular-nums">{it.when}</span>
                        <FreshTag observed={it.observed} />
                      </p>
                      <LateNote v={it} className="mt-0.5 block" />
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* The list */}
            <section data-tour="list" aria-label="Your patients" className="rounded-3xl bg-surface p-3 shadow-card sm:p-4">
              {groups.length ? (
                groups.map((g, i) => (
                  <div key={g.title} className={i > 0 ? "mt-3 border-t border-line pt-3" : undefined}>
                    <h2 className="flex items-baseline justify-between px-3 pt-1 pb-1.5 text-sm font-medium text-ink-2">
                      {g.title}
                      <span className="font-normal text-ink-3 tabular-nums">{g.rows.filter((p) => !done[p.id]).length} to go</span>
                    </h2>
                    <ol>{g.rows.map(renderRow)}</ol>
                  </div>
                ))
              ) : (
                <p className="px-3 py-8 text-center text-sm text-ink-3">
                  No patients match “{query}”.{" "}
                  <button type="button" onClick={() => setQuery("")} className="font-medium text-primary hover:underline">
                    Clear search
                  </button>
                </p>
              )}
            </section>
          </div>

          {/* Right column: the open patient, or what the middle doesn't show */}
          <div className="min-w-0">
            {(
              <aside data-tour="stats" aria-label="Call stats" className="flex flex-col gap-4 lg:sticky lg:top-[96px]">
                <CallStats todayDialled={callsDoneByCall} todayPicked={callsDoneByCall} />
              </aside>
            )}
          </div>
        </div>
      </div>

      {/* Toast + minimised call bar */}
      <div
        className={`pointer-events-none fixed inset-x-0 z-30 flex flex-col items-center gap-2 px-4 bottom-5`}
        aria-live="polite"
      >
        {toast ? (
          <div key={toast.key} className="pointer-events-auto flex animate-toast items-center gap-4 rounded-lg bg-[#303030] px-4 py-3 text-sm text-white shadow-lift">
            <span>{toast.text}</span>
            {toast.undo ? (
              <button
                type="button"
                onClick={() => {
                  toast.undo?.();
                  setToast(null);
                }}
                className="font-medium text-[#a8c7fa] hover:text-white"
              >
                Undo
              </button>
            ) : null}
          </div>
        ) : null}

      </div>
    </AppShell>
  );
}
