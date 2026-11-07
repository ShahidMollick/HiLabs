"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const WORDS = "You’re about to enter a normal Monday for Maria.".split(" ");
const WORD_START = 350; // ms before the first headline word
const WORD_GAP = 85; // ms between words
const HOLD_UNTIL = WORD_START + WORDS.length * WORD_GAP + 1800; // auto-dismiss

/** Landing title card: plays once per load, then fades into Maria's Today board on its own. */
export function Intro() {
  const [phase, setPhase] = useState<"in" | "out" | "gone">("in");

  useEffect(() => {
    if (phase !== "in") return;
    // replaying the tour reloads the page: skip the title card then
    let replay = false;
    try {
      replay = sessionStorage.getItem("wb-tour-autostart") === "1";
    } catch {}
    if (replay) {
      const t0 = setTimeout(() => setPhase("gone"), 0);
      return () => clearTimeout(t0);
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setPhase("out"), reduce ? 1800 : HOLD_UNTIL);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
        e.preventDefault();
        setPhase("out");
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "out") return;
    const t = setTimeout(() => {
      setPhase("gone");
      window.dispatchEvent(new Event("intro:done"));
    }, 620);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "gone") return null;

  const at = (ms: number) => ({ animationDelay: `${ms}ms` });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-title"
      onClick={() => setPhase("out")}
      className={`fixed inset-0 z-[100] flex cursor-default flex-col items-center justify-center bg-surface px-6 transition-[opacity,transform,filter] duration-[600ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
        phase === "out" ? "pointer-events-none scale-[1.02] opacity-0 blur-[2px]" : ""
      }`}
    >
      <div className="flex flex-col items-center text-center">
        <div className="animate-intro flex items-center gap-3.5" style={at(0)}>
          <Image src="/hilabs-logo.png" alt="HiLabs" width={80} height={80} priority className="size-9 rounded-[10px]" />
          <span aria-hidden className="animate-hairline h-6 w-px origin-center bg-line" style={at(180)} />
          <span className="text-[15px] font-semibold text-ink-2">APM Case</span>
        </div>

        <h1
          id="intro-title"
          aria-label={WORDS.join(" ")}
          className="mt-6 max-w-[780px] text-[clamp(30px,4.6vw,52px)] leading-[1.14] font-semibold tracking-[-0.02em] text-balance text-ink"
        >
          {WORDS.map((w, i) => (
            <span key={i} aria-hidden className="inline-block">
              <span
                className={`animate-word inline-block ${w.startsWith("Maria") ? "text-primary" : ""}`}
                style={at(WORD_START + i * WORD_GAP)}
              >
                {w}
              </span>
              {i < WORDS.length - 1 && " "}
            </span>
          ))}
        </h1>
        <p className="animate-intro mt-5 text-[13px] text-ink-3" style={at(WORD_START + WORDS.length * WORD_GAP + 150)}>
          Shahid Mollick <span className="mx-1.5 text-line">|</span> IIT KGP
        </p>
      </div>
    </div>
  );
}
