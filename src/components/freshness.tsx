import { BANDS, ageDays, bandOf, lateDays, lateLabel, type Band } from "@/lib/provenance";

const TONE: Record<Band, string> = {
  fresh: "bg-ok-bg text-ok",
  ageing: "bg-soon-bg text-soon",
  old: "bg-urgent-bg text-urgent",
};

/** Harvey-ball style glyph so the band never rests on colour alone: full, half, empty. */
export function BandGlyph({ band, className = "size-2.5" }: { band: Band; className?: string }) {
  return (
    <svg viewBox="0 0 10 10" className={`shrink-0 ${className}`} aria-hidden>
      <circle cx="5" cy="5" r="4" fill={band === "fresh" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" />
      {band === "ageing" ? <path d="M5 1a4 4 0 0 1 0 8Z" fill="currentColor" /> : null}
    </svg>
  );
}

/** The band chip for one record. Out-of-date records read "Re-ask" so Maria asks again on the call. */
export function FreshTag({ observed, className = "" }: { observed: string; className?: string }) {
  const band = bandOf(ageDays(observed));
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-px text-[11px] leading-[16px] font-medium whitespace-nowrap ${TONE[band]} ${className}`}>
      <BandGlyph band={band} className="size-2" />
      {band === "old" ? "Outdated · ask again" : BANDS[band].label}
    </span>
  );
}

/** "Arrived 2 days late", only when a record reached HiLabs after the day it was true. */
export function LateNote({ v, className = "" }: { v: { observed: string; received?: string }; className?: string }) {
  const t = lateLabel(lateDays(v));
  return t ? <span className={`text-[11.5px] whitespace-nowrap text-soon ${className}`}>{t}</span> : null;
}

export function FreshLegend({ className = "", compact }: { className?: string; compact?: boolean }) {
  return (
    <ul className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-3 ${className}`} aria-label="Data age key">
      {(Object.keys(BANDS) as Band[]).map((b) => (
        <li key={b} className="flex items-center gap-1">
          <span className={TONE[b].split(" ")[1]}>
            <BandGlyph band={b} className="size-2.5" />
          </span>
          <span className="font-medium text-ink-2">{BANDS[b].label}</span>
          {compact ? null : <span>{BANDS[b].hint}</span>}
        </li>
      ))}
    </ul>
  );
}
