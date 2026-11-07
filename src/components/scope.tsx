"use client";

import { useEffect, useRef, useState } from "react";

/** Call from any control we show but haven't designed yet. */
export function outOfScope(what: string) {
  window.dispatchEvent(new CustomEvent("out-of-scope", { detail: what }));
}

/** One toast for the whole app, above every layer (call card, profile, history). */
export function ScopeNote() {
  const [note, setNote] = useState<{ key: number; what: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const on = (e: Event) => {
      clearTimeout(timer.current);
      setNote({ key: Date.now(), what: (e as CustomEvent<string>).detail });
      timer.current = setTimeout(() => setNote(null), 3200);
    };
    window.addEventListener("out-of-scope", on);
    return () => {
      window.removeEventListener("out-of-scope", on);
      clearTimeout(timer.current);
    };
  }, []);

  if (!note) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-5 z-[120] flex justify-center px-4" role="status" aria-live="polite">
      <div key={note.key} className="pointer-events-auto flex max-w-[440px] animate-toast items-start gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-lift">
        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-white/12" aria-hidden>
          <svg viewBox="0 0 20 20" fill="none" className="size-4">
            <path d="M3 6.5 10 3l7 3.5v7L10 17l-7-3.5v-7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M3 6.5 10 10l7-3.5M10 10v7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium">Outside our prototype scope</p>
          <p className="mt-0.5 text-[13px] leading-snug text-white/75">{note.what} is shown for context but not designed in this prototype.</p>
        </div>
        <button type="button" onClick={() => setNote(null)} aria-label="Dismiss" className="-mr-1 grid size-7 shrink-0 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white">
          <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden>
            <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
