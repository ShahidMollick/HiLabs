"use client";

import { outOfScope } from "./scope";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIcon,
  AlertIcon,
  ArrowRightIcon,
  CalendarIcon,
  ChatIcon,
  CheckIcon,
  ClipboardIcon,
  ClockIcon,
  CloseIcon,
  DatabaseIcon,
  HeartIcon,
  HistoryIcon,
  ListChecksIcon,
  MicIcon,
  MicOffIcon,
  NoteIcon,
  PhoneIcon,
  PillIcon,
  ShieldIcon,
  TargetIcon,
} from "./icons";
import type { Patient } from "@/lib/data";
import type { Fact, Profile, TimelineItem } from "@/lib/profiles";
import { Prov, useProvenance } from "./provenance";
import { slug, type Seed } from "@/lib/provenance";

type IconC = (p: { className?: string }) => React.ReactElement;

/* ---------------- small pieces ---------------- */


const toneChip: Record<NonNullable<Fact["tone"]>, string> = {
  ok: "bg-ok-bg text-ok",
  conflict: "bg-urgent-bg text-urgent",
  stale: "bg-soon-bg text-soon",
  pending: "bg-tonal text-on-tonal",
};
const toneLabel: Record<NonNullable<Fact["tone"]>, string> = { ok: "Matches", conflict: "Conflict", stale: "Outdated", pending: "Open" };
const toneIcon: Record<NonNullable<Fact["tone"]>, IconC> = { ok: CheckIcon, conflict: AlertIcon, stale: HistoryIcon, pending: ClockIcon };

function Chip({ tone, children }: { tone: NonNullable<Fact["tone"]>; children?: React.ReactNode }) {
  const Icon = toneIcon[tone];
  return (
    <span className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[11.5px] font-medium whitespace-nowrap ${toneChip[tone]}`}>
      <Icon className="size-3.5" />
      {children ?? toneLabel[tone]}
    </span>
  );
}

function Source({ f }: { f: Fact }) {
  return (
    <span className="mt-0.5 flex items-center gap-1 text-[12px] text-ink-3">
      <DatabaseIcon className="size-3" />
      {f.source} · {f.age}
    </span>
  );
}

function Section({ icon: Icon, title, meta, children }: { icon: IconC; title: string; meta?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-b border-line px-6 py-5 last:border-b-0">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid size-8 place-items-center rounded-full bg-surface-dim text-ink-2">
          <Icon className="size-[17px]" />
        </span>
        <h3 className="flex-1 text-[15px] font-medium text-ink">{title}</h3>
        {meta ? <span className="text-[12.5px] text-ink-3">{meta}</span> : null}
      </div>
      {children}
    </section>
  );
}

const kindIcon: Record<TimelineItem["kind"], IconC> = {
  call: PhoneIcon,
  voicemail: PhoneIcon,
  discharge: NoteIcon,
  refill: PillIcon,
  form: ClipboardIcon,
  alert: ActivityIcon,
  note: NoteIcon,
  auth: ShieldIcon,
};

/* ---------------- the sheet ---------------- */

export type LiveCall = { elapsed: number; muted: boolean; onMute: () => void };
export type TodayCall = { seconds: number; nextCall?: string; tasks: string[] };

export function ProfileSheet({
  patient: p,
  profile: pr,
  onClose,
  onCall,
  live,
  today,
}: {
  patient: Patient;
  profile: Profile;
  onClose: () => void;
  onCall?: () => void;
  live?: LiveCall;
  today?: TodayCall;
}) {
  const [closing, setClosing] = useState(false);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const { open: openProv } = useProvenance();
  const keyOf = (f: Fact, group: string) => f.prov ?? `${p.id}.${slug(group)}.${slug(f.label ?? f.value)}`;
  const seedOf = (f: Fact, group: string): Seed => ({ patientId: p.id, group, label: f.label ?? group, value: f.value, source: f.source, age: f.age });
  const P = (f: Fact, group: string, children: React.ReactNode) => (
    <Prov k={keyOf(f, group)} seed={seedOf(f, group)}>
      {children}
    </Prov>
  );
  const [filter, setFilter] = useState<"all" | "calls" | "records">("all");
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [booked, setBooked] = useState<string[]>([]);
  const startY = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const first = p.name.split(" ")[0];

  const close = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 260);
  };

  // focus, Esc to close, and keep the page behind still
  useEffect(() => {
    headingRef.current?.focus();
    const el = document.documentElement;
    const prev = el.style.overflow;
    el.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      el.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // drag the handle down to dismiss
  const onPointerDown = (e: React.PointerEvent) => {
    startY.current = e.clientY;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging) setDrag(Math.max(0, e.clientY - startY.current));
  };
  const onPointerUp = () => {
    setDragging(false);
    if (drag > 140) close();
    else setDrag(0);
  };

  const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  const allItems: TimelineItem[] = [
    ...(today
      ? [
          {
            id: "today",
            date: "Today",
            kind: "call" as const,
            title: `Call with ${p.name === "Lai Fong Chan" ? "Grace, for Mrs Chan" : first} · signed`,
            detail: `${fmt(today.seconds)} · by Maria${today.nextCall ? ` · next call ${today.nextCall.toLowerCase()}` : ""}`,
            call: {
              duration: fmt(today.seconds),
              by: "Maria",
              changed: [],
              note: "Signed today. Accepted answers became the top source; old values moved to History.",
              tasks: today.tasks,
            },
          },
        ]
      : []),
    ...pr.timeline,
  ];
  const timeline = allItems.filter((t) => filter === "all" || (filter === "calls" ? !!t.call : !t.call));
  const opened = allItems.find((t) => t.id === openItem);

  return (
    <div className="fixed inset-0 z-[65]">
      {/* backdrop */}
      <button
        type="button"
        aria-label="Close profile"
        onClick={close}
        className={`absolute inset-0 cursor-default bg-[#0f1522]/60 backdrop-blur-[2px] transition-opacity duration-300 ${closing ? "opacity-0" : "animate-backdrop"}`}
      />

      {/* sheet */}
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-name"
        data-tour="profile"
        className={`absolute inset-x-0 bottom-0 mx-auto flex h-[94dvh] max-w-[1240px] flex-col overflow-hidden rounded-t-[28px] bg-surface shadow-[0_-24px_70px_-20px_rgb(0_0_0_/_0.55)] ${closing ? "animate-sheet-down" : "animate-sheet-up"}`}
        style={{ transform: drag ? `translateY(${drag}px)` : undefined, transition: dragging ? "none" : "transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)" }}
      >
        {/* drag handle */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="flex shrink-0 cursor-grab touch-none justify-center pt-2.5 pb-1.5 active:cursor-grabbing"
          aria-hidden
        >
          <span className={`h-1.5 rounded-full bg-line transition-all ${dragging ? "w-14 bg-ink-3/50" : "w-10"}`} />
        </div>

        {/* call strip, pinned while a call is running */}
        {live ? (
          <div className="mx-4 mb-2 flex shrink-0 items-center gap-3 rounded-2xl bg-ok-bg px-4 py-2 text-[13.5px]">
            <span className="size-2 animate-pulse rounded-full bg-ok" aria-hidden />
            <span className="flex-1 font-medium text-ok tabular-nums">
              On call with {first} · {Math.floor(live.elapsed / 60)}:{String(live.elapsed % 60).padStart(2, "0")}
              {live.muted ? " · muted" : ""}
            </span>
            <button type="button" onClick={live.onMute} aria-pressed={live.muted} className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 font-medium transition active:scale-95 ${live.muted ? "bg-urgent text-white" : "bg-surface text-ink-2 hover:brightness-95"}`}>
              {live.muted ? <MicOffIcon className="size-4" /> : <MicIcon className="size-4" />}
              {live.muted ? "Unmute" : "Mute"}
            </button>
            <button type="button" onClick={close} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ok px-3 font-medium text-white transition hover:brightness-110 active:scale-95">
              Back to call
            </button>
          </div>
        ) : null}

        {/* header */}
        <header className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-3 border-b border-line px-6 pt-2 pb-5">
          <Image src={p.photo} alt="" width={160} height={160} className="size-[72px] rounded-full object-cover" />
          <div className="min-w-0 flex-1">
            <h2 id="profile-name" ref={headingRef} tabIndex={-1} className="text-[26px] leading-tight font-normal text-ink outline-none">
              {p.name} <span className="text-lg text-ink-3">{p.age}</span>
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-medium ${pr.tier.tone === "urgent" ? "bg-urgent-bg text-urgent" : "bg-soon-bg text-soon"}`}>
                {pr.tier.label} · {pr.tier.reason}
              </span>
              <span className="inline-flex h-6 items-center rounded-full bg-surface-dim px-2.5 text-[12px] text-ink-2">{P({ value: pr.plan, source: "Eligibility", age: "1 week", label: "Plan" }, "Coverage", pr.plan)}</span>
              <span className="inline-flex h-6 items-center rounded-full bg-surface-dim px-2.5 text-[12px] text-ink-2">{P({ prov: p.id === "lai-fong-chan" ? "chan.language" : undefined, value: pr.language, source: "Eligibility", age: "1 week", label: "Language" }, "Contact", pr.language)}</span>
            </div>
            <p className="mt-1.5 text-[13px] text-ink-3">
              Main contact <span className="text-ink-2">{P({ prov: pr.numbers[0]?.prov, value: pr.contactLine, source: pr.numbers[0]?.source ?? "Contact record", age: pr.numbers[0]?.age ?? "on file", label: "Main contact" }, "Contact", pr.contactLine)}</span> · PCP <span className="text-ink-2">{P({ value: pr.pcp, source: "Eligibility", age: "1 week", label: "PCP" }, "Care team", pr.pcp)}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!live && onCall ? (
              <button type="button" onClick={onCall} className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-hover active:scale-95">
                <PhoneIcon className="size-4" />
                Call
              </button>
            ) : null}
            <button type="button" onClick={() => outOfScope("Texting patients")} className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium text-primary transition hover:bg-surface-dim active:scale-95">
              <ChatIcon className="size-4" />
              Text
            </button>
            <button type="button" onClick={close} aria-label="Close profile" className="grid size-10 place-items-center rounded-full text-ink-2 transition hover:bg-surface-dim active:scale-90">
              <CloseIcon className="size-5" />
            </button>
          </div>
        </header>

        {/* body: the whole truth on the left, contact timeline on the right */}
        <div className="min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:overflow-hidden">
          <div className="lg:min-h-0 lg:overflow-y-auto [scrollbar-width:thin]">
            {/* 1. alerts */}
            <Section icon={AlertIcon} title="Needs action" meta={`${pr.alerts.length} items`}>
              <ul className="flex flex-col gap-2">
                {pr.alerts.map((a) => (
                  <li key={a.value} className="flex items-start gap-3 rounded-2xl bg-surface-dim/50 px-3.5 py-2.5">
                    <Chip tone={a.tone ?? "pending"} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] leading-snug text-ink">{P(a, "Alerts", a.value)}</span>
                      <Source f={a} />
                    </span>
                  </li>
                ))}
              </ul>
            </Section>

            {/* 2. medicines */}
            <Section icon={PillIcon} title="Medicines" meta="One list, merged across sources">
              <ul className="flex flex-col gap-3">
                {pr.meds.map((m) => (
                  <li key={m.name}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[15px] font-medium text-ink">{m.name}</p>
                        <span className="text-[14px] text-ink-2">{P({ ...m, label: m.name }, "Medicines", m.value)}</span>
                        <Source f={m} />
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        {m.tone ? <Chip tone={m.tone} /> : null}
                        <button
                          type="button"
                          data-tour="history-btn"
                          onClick={() => openProv(keyOf({ ...m, label: m.name }, "Medicines"), seedOf({ ...m, label: m.name }, "Medicines"))}
                          className="inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[12.5px] font-medium text-primary transition hover:bg-tonal/50 active:scale-95"
                        >
                          <HistoryIcon className="size-3.5" />
                          Version history
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>

            {/* 3. conditions and events */}
            <Section icon={ActivityIcon} title="Conditions and recent events">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-[12px] font-medium tracking-wide text-ink-3">Conditions</p>
                  {pr.conditions.length ? (
                    <ul className="flex flex-col gap-2">
                      {pr.conditions.map((c) => (
                        <li key={c.value}>
                          <p className="text-[14px] text-ink">{P(c, "Conditions", c.value)}</p>
                          <Source f={c} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13px] text-ink-3">Not in the MVP data yet.</p>
                  )}
                </div>
                <div>
                  <p className="mb-1.5 text-[12px] font-medium tracking-wide text-ink-3">Recent events</p>
                  <ul className="flex flex-col gap-2">
                    {pr.events.map((c) => (
                      <li key={c.value}>
                        <p className="text-[14px] text-ink">{P(c, "Recent events", c.value)}</p>
                        <Source f={c} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Section>

            {/* 4. care gaps */}
            <Section icon={CalendarIcon} title="Care gaps and deadlines">
              <ul className="flex flex-col gap-2">
                {pr.gaps.map((g) => {
                  const isBooked = booked.includes(g.value);
                  return (
                    <li key={g.value} className="flex flex-wrap items-center gap-3">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] text-ink">{P({ ...g, label: g.value }, "Care gaps", g.value)}</span>
                        <Source f={g} />
                      </span>
                      <span className="inline-flex h-6 items-center rounded-full bg-soon-bg px-2.5 text-[12px] font-medium text-soon">Due {g.due}</span>
                      <button
                        type="button"
                        disabled={isBooked}
                        onClick={() => setBooked((b) => [...b, g.value])}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[12.5px] font-medium text-primary transition hover:bg-tonal/40 active:scale-95 disabled:border-transparent disabled:bg-ok-bg disabled:text-ok"
                      >
                        {isBooked ? <CheckIcon className="size-3.5" /> : <CalendarIcon className="size-3.5" />}
                        {isBooked ? "Booking sent" : "Book"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Section>

            {/* 5. social and caregiver */}
            <Section icon={HeartIcon} title="Social needs and caregiver">
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[140px_minmax(0,1fr)]">
                {pr.social.map((s) => (
                  <div key={s.label} className="contents">
                    <dt className="text-[13px] text-ink-3">{s.label}</dt>
                    <dd className="flex flex-wrap items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block text-[14px] text-ink">{P(s, "Social needs", s.value)}</span>
                        <Source f={s} />
                      </span>
                      {s.tone ? <Chip tone={s.tone} /> : null}
                    </dd>
                  </div>
                ))}
              </dl>
            </Section>

            {/* 6. care plan */}
            <Section icon={TargetIcon} title="Care plan">
              <p className="mb-1.5 text-[12px] font-medium tracking-wide text-ink-3">Goals, in the patient’s words</p>
              {pr.goals.length ? (
                <ul className="mb-4 list-disc pl-5 text-[14px] text-ink">{pr.goals.map((g) => <li key={g}>{g}</li>)}</ul>
              ) : (
                <p className="mb-4 text-[13.5px] text-ink-3">None yet. Goals always come from the patient, so ask on the next call.</p>
              )}
              <p className="mb-1.5 text-[12px] font-medium tracking-wide text-ink-3">Open tasks</p>
              <ul className="flex flex-col gap-1.5">
                {pr.tasks.map((t) => (
                  <li key={t.text} className="flex items-center gap-3 rounded-xl bg-surface-dim/60 px-3 py-2 text-[13.5px]">
                    <ListChecksIcon className="size-4 text-ink-3" />
                    <span className="flex-1 text-ink">{t.text}</span>
                    <span className="text-[12px] text-ink-3">
                      {t.owner} · {t.due}
                    </span>
                  </li>
                ))}
                {today?.tasks.map((t) => (
                  <li key={t} className="flex animate-fade-up items-center gap-3 rounded-xl bg-tonal/40 px-3 py-2 text-[13.5px]">
                    <ListChecksIcon className="size-4 text-on-tonal" />
                    <span className="flex-1 text-ink">{t}</span>
                    <span className="text-[12px] text-on-tonal">From today’s call</span>
                  </li>
                ))}
              </ul>
            </Section>

            {/* 7. contact and consent */}
            <Section icon={ShieldIcon} title="Contact and consent">
              <p className="mb-1.5 text-[12px] font-medium tracking-wide text-ink-3">Numbers, best first</p>
              <ul className="mb-4 flex flex-col gap-2">
                {pr.numbers.map((n) => (
                  <li key={n.value} className="flex items-center gap-3">
                    <PhoneIcon className="size-4 text-ink-3" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] text-ink">{P({ ...n, label: n.label ?? "Phone" }, "Contact", n.value)}</span>
                      <Source f={n} />
                    </span>
                    {n.works === "yes" ? <Chip tone="ok">Works</Chip> : n.works === "no" ? <Chip tone="conflict">Dead</Chip> : <Chip tone="pending">Not confirmed</Chip>}
                  </li>
                ))}
              </ul>
              <dl className="grid grid-cols-[140px_minmax(0,1fr)] gap-y-2 text-[14px]">
                <dt className="text-[13px] text-ink-3">Best time</dt>
                <dd className="text-ink">{pr.bestTime || "Not known yet"}</dd>
                <dt className="text-[13px] text-ink-3">Channel</dt>
                <dd className="text-ink">{pr.channel}</dd>
                {pr.consent.map((c) => (
                  <div key={c.value} className="contents">
                    <dt className="text-[13px] text-ink-3">Consent</dt>
                    <dd className="flex flex-wrap items-center gap-2 text-ink">
                      {P({ ...c, label: "Consent" }, "Consent", c.value)}
                      {c.tone ? <Chip tone={c.tone} /> : null}
                    </dd>
                  </div>
                ))}
              </dl>
            </Section>

            <div className="px-6 pt-1 pb-8">
              <button type="button" onClick={() => outOfScope("The full records browser")} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline">
                <DatabaseIcon className="size-3.5" />
                All records: claims lines, lab files, older notes
                <ArrowRightIcon className="size-3.5" />
              </button>
            </div>
          </div>

          {/* contact timeline */}
          <aside className="border-line max-lg:border-t lg:min-h-0 lg:overflow-y-auto lg:border-l [scrollbar-width:thin]" aria-label="Contact timeline">
            {opened?.call ? (
              <div key={opened.id} className="animate-swap px-5 py-5">
                <button type="button" onClick={() => setOpenItem(null)} className="mb-3 inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-[13px] font-medium text-primary transition hover:bg-tonal/40">
                  <ArrowRightIcon className="size-3.5 rotate-180" />
                  Timeline
                </button>
                <h3 className="text-[16px] font-medium text-ink">{opened.title}</h3>
                <p className="text-[13px] text-ink-3">
                  {opened.date} · {opened.call.duration} · by {opened.call.by}
                </p>
                {opened.call.changed.length ? (
                  <>
                    <p className="mt-4 mb-1.5 text-[12px] font-medium tracking-wide text-ink-3">What this call changed</p>
                    <ul className="flex flex-col gap-1.5 text-[13.5px]">
                      {opened.call.changed.map((c) => (
                        <li key={c.label}>
                          <span className="text-ink-3">{c.label}: </span>
                          {c.from ? <span className="text-ink-3 line-through">{c.from}</span> : null} <span className="text-ink">{c.to}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                <p className="mt-4 mb-1.5 text-[12px] font-medium tracking-wide text-ink-3">Signed note</p>
                <p className="rounded-2xl bg-surface-dim/60 p-3 text-[13.5px] leading-relaxed text-ink">{opened.call.note}</p>
                <p className="mt-4 mb-1.5 text-[12px] font-medium tracking-wide text-ink-3">Tasks from this call</p>
                {opened.call.tasks.length ? (
                  <ul className="flex flex-col gap-1.5">
                    {opened.call.tasks.map((t) => (
                      <li key={t} className="flex items-center gap-2 text-[13.5px] text-ink">
                        <CheckIcon className="size-3.5 text-ok" />
                        {t}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] text-ink-3">None.</p>
                )}
              </div>
            ) : (
              <div className="px-5 py-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-[15px] font-medium text-ink">Contact timeline</h3>
                  <span className="text-[12px] text-ink-3">Newest first</span>
                </div>
                <div className="mb-3 inline-flex rounded-full border border-line p-0.5 text-[12.5px]" role="tablist" aria-label="Filter timeline">
                  {(["all", "calls", "records"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      role="tab"
                      aria-selected={filter === f}
                      onClick={() => setFilter(f)}
                      className={`h-7 rounded-full px-3 font-medium capitalize transition ${filter === f ? "bg-tonal text-on-tonal" : "text-ink-2 hover:bg-surface-dim"}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <ol className="relative ml-4 border-l border-line">
                  {timeline.map((t) => {
                    const Icon = kindIcon[t.kind];
                    const clickable = !!t.call;
                    const body = (
                      <>
                        <span className={`absolute -left-[13px] mt-0.5 grid size-6 place-items-center rounded-full ring-4 ring-surface ${t.kind === "call" ? "bg-ok text-white" : "bg-surface-dim text-ink-2"}`}>
                          <Icon className="size-3.5" />
                        </span>
                        <span className="block min-w-0 pl-4">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="text-[13.5px] font-medium text-ink">{t.title}</span>
                            <span className="shrink-0 text-[12px] text-ink-3">{t.date}</span>
                          </span>
                          <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-3">{t.detail}</span>
                          {clickable ? (
                            <span className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-medium text-primary">
                              Open call
                              <ArrowRightIcon className="size-3" />
                            </span>
                          ) : null}
                        </span>
                      </>
                    );
                    return (
                      <li key={t.id} className="relative pb-4 last:pb-0">
                        {clickable ? (
                          <button type="button" onClick={() => setOpenItem(t.id)} className="-my-1 block w-full rounded-xl py-1 pr-2 text-left transition hover:bg-surface-dim/70 active:scale-[0.99]">
                            {body}
                          </button>
                        ) : (
                          <div>{body}</div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}
