"use client";

import { useState } from "react";

/** Maria's last working week of outreach calls (invented demo data), plus today live. */
const WEEK = [
  { day: "Mon", date: "2 Nov", dialled: 12, picked: 7 },
  { day: "Tue", date: "3 Nov", dialled: 10, picked: 6 },
  { day: "Wed", date: "4 Nov", dialled: 11, picked: 5 },
  { day: "Thu", date: "5 Nov", dialled: 9, picked: 6 },
  { day: "Fri", date: "6 Nov", dialled: 8, picked: 4 },
];
const MISSED = [
  { label: "Voicemail", n: 13 },
  { label: "No answer", n: 7 },
  { label: "Wrong number", n: 2 },
];

const H = 120; // plot height (px)
const MAX = 12; // y max

export function CallStats({ todayDialled, todayPicked }: { todayDialled: number; todayPicked: number }) {
  const days = [...WEEK, { day: "Today", date: "9 Nov", dialled: todayDialled, picked: todayPicked }];
  const dialled = WEEK.reduce((s, d) => s + d.dialled, 0);
  const picked = WEEK.reduce((s, d) => s + d.picked, 0);
  const rate = Math.round((picked / dialled) * 100);
  const missedTotal = MISSED.reduce((s, m) => s + m.n, 0);
  const [hover, setHover] = useState<number | null>(null);

  return (
    <section aria-labelledby="calls-h" className="rounded-3xl bg-surface p-5 shadow-card">
      <div className="flex items-baseline justify-between">
        <h2 id="calls-h" className="text-base font-medium text-ink">
          Who picked up
        </h2>
        <span className="text-sm text-ink-3">Last week</span>
      </div>

      {/* hero number */}
      <div className="mt-3 flex items-end gap-3">
        <span className="text-[40px] leading-none font-semibold tracking-[-0.02em] text-ink tabular-nums">{rate}%</span>
        <span className="pb-1 text-sm leading-snug text-ink-3">
          {picked} of {dialled} calls
          <br />
          answered
        </span>
      </div>

      {/* stacked bars: picked up (bottom) + not picked up */}
      <div className="relative mt-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-line" style={{ height: H }} aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 border-t border-line" style={{ top: H }} aria-hidden />
        <ol className="relative grid grid-cols-6 gap-2" style={{ height: H + 22 }} aria-label="Calls per day, picked up versus not">
          {days.map((d, i) => {
            const isToday = i === days.length - 1;
            const missed = d.dialled - d.picked;
            const ph = (d.picked / MAX) * H;
            const mh = (missed / MAX) * H;
            const active = hover === i;
            return (
              <li
                key={d.day}
                className="relative flex flex-col items-center"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={`${d.day} ${d.date}: ${d.picked} picked up of ${d.dialled} dialled`}
              >
                <div className="flex w-full flex-col items-center justify-end outline-none" style={{ height: H }}>
                  {d.dialled === 0 ? (
                    <span className="mb-1 text-[11px] text-ink-3">—</span>
                  ) : (
                    <div className={`flex w-full max-w-7 flex-col gap-[2px] transition-opacity ${hover !== null && !active ? "opacity-45" : ""}`}>
                      {missed > 0 && <span className="block rounded-t-[4px] bg-[#c4c7c5] transition-[height] duration-500" style={{ height: mh }} />}
                      <span
                        className={`block bg-primary transition-[height] duration-500 ${missed > 0 ? "" : "rounded-t-[4px]"}`}
                        style={{ height: ph }}
                      />
                    </div>
                  )}
                </div>
                <span className={`mt-1.5 text-[11.5px] ${isToday ? "font-semibold text-ink" : "text-ink-3"}`}>{d.day}</span>

                {active && (
                  <div
                    role="tooltip"
                    className={`animate-fade-up pointer-events-none absolute top-0 z-10 w-max rounded-xl bg-ink px-3 py-2 text-xs text-white shadow-lift ${
                      i < 3 ? "left-[calc(50%+18px)]" : "right-[calc(50%+18px)]"
                    }`}
                  >
                    <p className="font-medium">
                      {isToday ? "Today" : d.day}, {d.date}
                    </p>
                    <p className="mt-0.5 text-white/80 tabular-nums">
                      {d.picked} picked up · {missed} missed
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-2 flex items-center gap-4 text-xs text-ink-2">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-primary" aria-hidden /> Picked up
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-[#c4c7c5]" aria-hidden /> Didn’t pick up
        </span>
      </div>

      {/* why the rest didn't */}
      <div className="mt-5 border-t border-line pt-4">
        <p className="text-sm font-medium text-ink-2">The {missedTotal} that didn’t</p>
        <ul className="mt-2.5 flex flex-col gap-2">
          {MISSED.map((m) => (
            <li key={m.label} className="grid grid-cols-[96px_1fr_24px] items-center gap-3 text-sm">
              <span className="text-ink-2">{m.label}</span>
              <span className="h-2 overflow-hidden rounded-full bg-surface-dim">
                <span className="block h-full rounded-full bg-[#8e918f]" style={{ width: `${(m.n / missedTotal) * 100}%` }} />
              </span>
              <span className="text-right text-ink-3 tabular-nums">{m.n}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-xl bg-surface-dim px-3 py-2.5 text-[13px] leading-snug text-ink-2">
          Most people answered between <span className="font-medium text-ink">10 and 11 am</span>.
        </p>
      </div>
    </section>
  );
}
