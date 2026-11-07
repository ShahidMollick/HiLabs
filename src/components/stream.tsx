"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reveals text a few words at a time, like a model streaming tokens.
 * Re-mount (key by text) to stream a new value. Honours reduced motion.
 */
export function Stream({
  text,
  instant = false,
  delay = 110,
  tokenMs = 24,
  onDone,
  className,
}: {
  text: string;
  instant?: boolean;
  delay?: number;
  tokenMs?: number;
  onDone?: () => void;
  className?: string;
}) {
  const tokens = text.split(/(\s+)/);
  const [n, setN] = useState(instant ? tokens.length : 0);
  const [thinking, setThinking] = useState(!instant);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });

  useEffect(() => {
    if (instant) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let tick: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(
      () => {
        setThinking(false);
        if (reduce) {
          setN(tokens.length);
          doneRef.current?.();
          return;
        }
        let i = 0;
        tick = setInterval(() => {
          i += 2; // a word and its space
          setN(i);
          if (i >= tokens.length) {
            clearInterval(tick);
            doneRef.current?.();
          }
        }, tokenMs);
      },
      reduce ? 0 : delay,
    );
    return () => {
      clearTimeout(start);
      if (tick) clearInterval(tick);
    };
    // tokens derive from text; the parent re-keys on new text
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instant]);

  const streaming = !instant && n < tokens.length;
  return (
    <span className={className}>
      {thinking ? (
        <span className="inline-flex translate-y-[-2px] gap-0.5 align-middle" aria-label="Writing">
          <span className="size-1 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.2s]" />
          <span className="size-1 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.1s]" />
          <span className="size-1 animate-bounce rounded-full bg-primary/70" />
        </span>
      ) : (
        <>
          {tokens.slice(0, n).join("")}
          {streaming ? <span className="ml-px inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-primary" aria-hidden /> : null}
        </>
      )}
      {streaming || thinking ? <span className="sr-only">{text}</span> : null}
    </span>
  );
}
