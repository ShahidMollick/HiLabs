"use client";

import { outOfScope } from "./scope";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BellIcon, CloseIcon, HomeIcon, PeopleIcon, SearchIcon, TaskIcon } from "./icons";

// Maria's day lives in three places: her list, her patients, her tasks.
const nav = [
  { label: "Today", icon: HomeIcon },
  { label: "Patients", icon: PeopleIcon },
  { label: "Tasks", icon: TaskIcon },
];

const alerts = [
  { title: "Discharge note arrived for Walter", time: "6:12 am" },
  { title: "Darnell gave a new mobile at the ER", time: "Sat" },
  { title: "Pharmacy refill conflict for Tanya", time: "Thu" },
];

export function AppShell({
  children,
  query,
  onQuery,
  taskCount = 0,
  greeting,
  status,
}: {
  children: React.ReactNode;
  query: string;
  onQuery: (q: string) => void;
  taskCount?: number;
  greeting: React.ReactNode;
  status?: React.ReactNode;
}) {
  const [active, setActive] = useState("Today");
  const [bellOpen, setBellOpen] = useState(false);
  const [unread, setUnread] = useState(alerts.length);
  const searchRef = useRef<HTMLInputElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  // "/" focuses search; Esc closes the popover; clicking outside closes it
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest("input, textarea");
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") setBellOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (!bellRef.current?.contains(e.target as Node)) setBellOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b border-line bg-surface px-3 sm:px-4">
        <Link href="/" className="flex w-[72px] shrink-0 justify-center sm:w-[80px]" aria-label="HiLabs Care Workbench, home">
          <Image src="/hilabs-logo.png" alt="HiLabs" width={80} height={80} priority className="size-10 rounded-[11px]" />
        </Link>
        <div className="min-w-0 flex-1 md:flex-none md:shrink-0">{greeting}</div>

        <label className="group mx-auto hidden h-11 w-full max-w-[520px] min-w-[200px] items-center gap-3 rounded-full bg-surface-dim px-4 transition focus-within:bg-surface focus-within:shadow-[0_1px_3px_rgb(60_64_67_/_0.3)] md:flex">
          <SearchIcon className="size-5 text-ink-2" />
          <span className="sr-only">Search patients</span>
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                onQuery("");
                e.currentTarget.blur();
              }
            }}
            placeholder="Search patients"
            className="h-full w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
          />
          {query ? (
            <button type="button" aria-label="Clear search" onClick={() => onQuery("")} className="grid size-7 place-items-center rounded-full text-ink-2 hover:bg-surface-dim">
              <CloseIcon className="size-4" />
            </button>
          ) : null}
        </label>

        {status ? <div className="hidden shrink-0 xl:block">{status}</div> : null}

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <div ref={bellRef} className="relative">
            <button
              type="button"
              aria-label={`Notifications, ${unread} unread`}
              aria-expanded={bellOpen}
              onClick={() => setBellOpen((o) => !o)}
              className={`relative grid size-11 place-items-center rounded-full text-ink-2 transition hover:bg-surface-dim active:scale-95 ${bellOpen ? "bg-surface-dim" : ""}`}
            >
              <BellIcon />
              {unread ? <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-urgent ring-2 ring-surface" /> : null}
            </button>
            {bellOpen ? (
              <div role="dialog" aria-label="Notifications" className="absolute right-0 top-[56px] w-80 animate-fade-up overflow-hidden rounded-2xl border border-line bg-surface shadow-lift">
                <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
                  <span className="text-sm font-semibold">Since Friday</span>
                  <button type="button" onClick={() => setUnread(0)} disabled={!unread} className="text-xs font-medium text-primary hover:underline disabled:text-ink-3 disabled:no-underline">
                    Mark all read
                  </button>
                </div>
                <ul className="pb-2">
                  {alerts.map((a, i) => (
                    <li key={a.title} className="flex items-start gap-3 px-4 py-2.5">
                      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${i < unread ? "bg-primary" : "bg-line"}`} />
                      <span className="flex-1 text-sm text-ink-2">{a.title}</span>
                      <span className="text-xs text-ink-3">{a.time}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <button type="button" onClick={() => outOfScope("Account and settings")} aria-label="Account: Maria R., RN" className="ml-1 grid size-9 place-items-center rounded-full bg-[#7c4dff] text-sm font-medium text-white transition active:scale-95">
            M
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        <nav aria-label="Main" className="sticky top-[72px] hidden h-[calc(100vh-72px)] w-[88px] shrink-0 flex-col items-center gap-3 border-r border-line bg-surface pt-4 sm:flex">
          {nav.map(({ label, icon: Icon }) => {
            const on = active === label;
            const badge = label === "Tasks" ? taskCount : 0;
            return (
              <button
                key={label}
                type="button"
                onClick={() => (label === "Today" ? setActive(label) : outOfScope(`The ${label} page`))}
                aria-current={on ? "page" : undefined}
                className="group flex w-full flex-col items-center gap-1 text-xs font-medium text-ink-2"
              >
                <span className={`relative grid h-8 w-14 place-items-center rounded-full transition duration-200 group-active:scale-90 ${on ? "bg-tonal text-on-tonal" : "group-hover:bg-surface-dim"}`}>
                  <Icon className="size-5" />
                  {badge ? (
                    <span className="absolute -top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-urgent px-1 text-[10px] font-semibold text-white">
                      {badge}
                    </span>
                  ) : null}
                </span>
                <span className={on ? "text-ink" : undefined}>{label}</span>
              </button>
            );
          })}
          <button
            type="button"
            data-tour="tour-btn"
            onClick={() => window.dispatchEvent(new Event("tour:start"))}
            className="group mt-auto mb-5 flex w-full flex-col items-center gap-1 text-xs font-medium text-ink-2"
          >
            <span className="grid h-8 w-14 place-items-center rounded-full text-primary transition duration-200 group-hover:bg-tonal/60 group-active:scale-90">
              <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden>
                <path d="M4 7.5 12 4l8 3.5-8 3.5-8-3.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                <path d="M7.5 9.2v4.6c0 1.2 2 2.7 4.5 2.7s4.5-1.5 4.5-2.7V9.2M20 7.5v5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </span>
            <span className="leading-tight">Tutorial</span>
          </button>
        </nav>

        <main className="min-w-0 flex-1 px-4 pb-28 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
