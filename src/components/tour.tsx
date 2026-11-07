"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Guided tour: spotlights the real UI and drives it (opens the       */
/*  profile, starts a call, ends and signs it) so the demo tells       */
/*  Maria's whole Monday in ~16 steps.                                 */
/* ------------------------------------------------------------------ */

const SEEN = "wb-tour-seen";
const AUTOSTART = "wb-tour-autostart";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const sel = (t: string) => (/[\[\.#\s>]/.test(t) ? t : `[data-tour="${t}"]`);
const q = (t: string) => document.querySelector<HTMLElement>(sel(t));

async function waitFor(t: string, ms = 5000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const el = q(t);
    if (el && el.getBoundingClientRect().width > 0) return el;
    await sleep(60);
  }
  return null;
}
async function waitGone(t: string, ms = 6000) {
  const end = Date.now() + ms;
  while (Date.now() < end && q(t)) await sleep(80);
}
function button(text: string, scope?: string) {
  const root = scope ? q(scope) : document;
  if (!root) return null;
  return [...root.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim().includes(text) && !b.disabled) ?? null;
}
function press(text: string, scope?: string) {
  const b = button(text, scope);
  b?.click();
  return !!b;
}
function pressLabel(label: string) {
  const b = document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  b?.click();
  return !!b;
}

type Step = {
  scene: "home" | "profile" | "call" | "end";
  chapter: string;
  title: string;
  body: string;
  target?: string | string[]; // none = centred card
  before?: () => Promise<void>;
  leave?: () => void;
  pad?: number;
};

const provTrigger = '[data-tour="upnext"] .cursor-help';

const STEPS: Step[] = [
  {
    scene: "home",
    chapter: "Welcome",
    title: "This is Maria’s workbench",
    body: "A two-minute tutorial through her Monday: who to call first, the call itself, signing off, and where every fact comes from. It clicks through the real screens for you.",
  },
  {
    scene: "home",
    chapter: "Her morning",
    title: "Who to call first",
    body: "One patient, picked for her: why now, what’s due, and the best time to reach them. Start call is one click away.",
    target: "upnext",
  },
  {
    scene: "home",
    chapter: "Her morning",
    title: "Every fact has a source",
    body: "Underlined values are traceable. Hover one to see the system it came from, what it changed from, and which source disagrees.",
    target: [provTrigger, '[role="tooltip"]'],
    pad: 6,
    before: async () => {
      q(provTrigger)?.focus({ preventScroll: true });
      await waitFor('[role="tooltip"]', 1500);
      await sleep(250);
    },
    leave: () => q(provTrigger)?.blur(),
  },
  {
    scene: "home",
    chapter: "Her morning",
    title: "The rest of her list",
    body: "Today first, then this week, each with the reason in plain words. Hover a row to call or mark it reached.",
    target: "list",
  },
  {
    scene: "home",
    chapter: "Her morning",
    title: "Who picked up",
    body: "Last week’s answer rate, why the rest didn’t pick up, and the hour people answer most, so she calls when it works.",
    target: "stats",
  },
  {
    scene: "profile",
    chapter: "The profile",
    title: "The whole record, without leaving",
    body: "Open profile slides up as a sheet over the list: what needs action, medicines, care gaps and the contact timeline. Drag down or press Esc to close.",
    target: "profile",
    before: async () => {
      press("Open profile", "upnext");
      await waitFor("profile");
      await sleep(550);
    },
  },
  {
    scene: "profile",
    chapter: "The profile",
    title: "History for any fact",
    body: "Every medicine and record keeps its versions: which source said what, and when.",
    target: "history-btn",
    pad: 4,
    before: async () => {
      const b = await waitFor("history-btn");
      b?.scrollIntoView({ block: "center", behavior: "smooth" });
      await sleep(450);
    },
  },
  {
    scene: "profile",
    chapter: "The profile",
    title: "Version control for every data source",
    body: "Each data source is a lane. A record that wins the merge rule becomes what Maria sees; one that loses ends in ✕ but stays on file. Click any record to revert to it or flag it.",
    target: "history",
    before: async () => {
      q("history-btn")?.click();
      await waitFor("history");
      await sleep(400);
    },
  },
  {
    scene: "call",
    chapter: "The call",
    title: "The call, in one card",
    body: "Her list stays underneath. The key lines are transcribed live as they talk.",
    target: "call-centre",
    before: async () => {
      if (pressLabel("Close history")) await sleep(350);
      if (pressLabel("Close profile")) await waitGone("profile", 1500);
      await sleep(150);
      press("Start call", "upnext");
      const centre = await waitFor("call-centre");
      // let the first key line stream in before spotlighting it
      const end = Date.now() + 7000;
      while (centre && Date.now() < end && centre.innerText.length < 140) await sleep(120);
      await sleep(600);
    },
  },
  {
    scene: "call",
    chapter: "The call",
    title: "What Maria brings",
    body: "What’s new since the last contact and her call plan. Items tick off by themselves as they’re covered.",
    target: "call-left",
  },
  {
    scene: "call",
    chapter: "The call",
    title: "Filling as you talk",
    body: "The AI drafts updates like code suggestions: the old value struck through, the new one in green. Accept with ⌘↵, reject with ⌘⌫, or ask a follow-up.",
    target: "call-right",
  },
  {
    scene: "call",
    chapter: "The call",
    title: "Familiar controls",
    body: "Mute, hold, speaker, keypad, add a caregiver. End call when she’s done.",
    target: "call-controls",
    pad: 6,
  },
  {
    scene: "end",
    chapter: "Wrap-up",
    title: "Wrap up in place",
    body: "No new screen. What’s left to decide stays right here, beside the note draft.",
    target: "call-right",
    before: async () => {
      press("End call", "call-controls");
      await waitFor("call-wrap");
      await sleep(450);
    },
  },
  {
    scene: "end",
    chapter: "Wrap-up",
    title: "Not sure? It waits for her",
    body: "Accept all only takes what the AI is sure of. Anything it’s unsure about stays flagged in amber, so Maria checks it herself or asks a follow-up on the spot.",
    target: "unsure",
    pad: 6,
    before: async () => {
      // the bulk button ("Accept all" / "Accept N sure") never touches the unsure ones
      [...(q("call-right")?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find((b) => /^Accept (all|\d+ sure)$/.test(b.textContent?.trim() ?? ""))?.click();
      await sleep(400);
      const u = await waitFor("unsure", 1500);
      u?.scrollIntoView({ block: "center", behavior: "smooth" });
      await sleep(450);
    },
  },
  {
    scene: "end",
    chapter: "Wrap-up",
    title: "Pick the next call, then sign",
    body: "The ring shows how much is decided. Once everything is, she picks the next call and signs once, as Maria R., RN.",
    target: "call-wrap",
    pad: 6,
    before: async () => {
      // Maria's own decisions: the unsure ones one by one, then the suggested tasks
      for (let k = 0; k < 4; k++) {
        const u = q("unsure");
        if (!u) break;
        [...u.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === "Accept")?.click();
        await sleep(300);
      }
      document.querySelectorAll<HTMLButtonElement>('button[aria-label^="Keep:"]').forEach((b) => b.click());
      await sleep(200);
      if (!button("Next:", "call-wrap")) {
        press("Next call", "call-wrap");
        await sleep(250);
        press("In 1 week", "call-wrap");
      }
      await sleep(350);
    },
  },
  {
    scene: "end",
    chapter: "Wrap-up",
    title: "Signed and saved",
    body: "Back on her list: progress moves, kept tasks are saved, and the facts she confirmed now carry her name as their top source.",
    target: "progress",
    pad: 10,
    before: async () => {
      press("Sign and save", "call-wrap");
      await waitGone("call-wrap");
      await sleep(500);
    },
  },
  {
    scene: "end",
    chapter: "Done",
    title: "That’s Maria’s Monday",
    body: "Replay this tutorial any time from Tutorial in the left menu.",
    target: "tour-btn",
    pad: 4,
  },
];

type Box = { x: number; y: number; w: number; h: number };

function measure(target: Step["target"], pad: number): Box | null {
  if (!target) return null;
  const list = Array.isArray(target) ? target : [target];
  const rects = list.map((t) => q(t)?.getBoundingClientRect()).filter((r): r is DOMRect => !!r && r.width > 0);
  if (!rects.length) return null;
  const x1 = Math.min(...rects.map((r) => r.left)) - pad;
  const y1 = Math.min(...rects.map((r) => r.top)) - pad;
  const x2 = Math.max(...rects.map((r) => r.right)) + pad;
  const y2 = Math.max(...rects.map((r) => r.bottom)) + pad;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // keep the hole on screen
  const x = Math.max(4, x1);
  const y = Math.max(4, y1);
  return { x, y, w: Math.min(vw - 4, x2) - x, h: Math.min(vh - 4, y2) - y };
}

const GAP = 14;
const M = 16;

function placeCard(hole: Box | null, cw: number, ch: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (!hole) return { left: (vw - cw) / 2, top: (vh - ch) / 2 };
  const clampX = (x: number) => Math.min(Math.max(M, x), vw - cw - M);
  const clampY = (y: number) => Math.min(Math.max(M, y), vh - ch - M);
  const cx = hole.x + hole.w / 2 - cw / 2;
  const cy = hole.y + hole.h / 2 - ch / 2;
  if (hole.y + hole.h + GAP + ch <= vh - M) return { left: clampX(cx), top: hole.y + hole.h + GAP };
  if (hole.y - GAP - ch >= M) return { left: clampX(cx), top: hole.y - GAP - ch };
  if (hole.x + hole.w + GAP + cw <= vw - M) return { left: hole.x + hole.w + GAP, top: clampY(cy) };
  if (hole.x - GAP - cw >= M) return { left: hole.x - GAP - cw, top: clampY(cy) };
  // big target: sit inside it, bottom-right
  return { left: clampX(hole.x + hole.w - cw - 24), top: clampY(hole.y + hole.h - ch - 24) };
}

export function Tour() {
  const [i, setI] = useState<number | null>(null); // null = off
  const [busy, setBusy] = useState(false);
  const [hole, setHole] = useState<Box | null>(null);
  const [card, setCard] = useState({ left: 0, top: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const step = i === null ? null : STEPS[i];
  const run = useRef(0);

  const finish = useCallback(() => {
    if (i !== null) STEPS[i].leave?.();
    try {
      sessionStorage.setItem(SEEN, "1");
    } catch {}
    setI(null);
    setHole(null);
  }, [i]);

  const go = useCallback(
    async (to: number) => {
      if (to < 0 || to >= STEPS.length) return;
      const id = ++run.current;
      if (i !== null) STEPS[i].leave?.();
      setBusy(true);
      try {
        await STEPS[to].before?.();
      } catch {
        /* keep going: the card still explains the step */
      }
      if (id !== run.current) return;
      setI(to);
      setBusy(false);
    },
    [i],
  );

  // start: after the intro (first visit), on the ? button, or after a replay reload
  useEffect(() => {
    let auto = false;
    let seen = false;
    try {
      auto = sessionStorage.getItem(AUTOSTART) === "1";
      seen = sessionStorage.getItem(SEEN) === "1";
    } catch {}
    let t: ReturnType<typeof setTimeout> | undefined;
    if (auto)
      t = setTimeout(() => {
        try {
          sessionStorage.removeItem(AUTOSTART);
        } catch {}
        go(0);
      }, 350);
    const onIntro = () => {
      if (!seen && !auto) go(0);
    };
    const onStart = () => {
      // replay from a clean slate so every step can drive the real UI
      try {
        sessionStorage.setItem(AUTOSTART, "1");
      } catch {}
      window.location.reload();
    };
    window.addEventListener("intro:done", onIntro);
    window.addEventListener("tour:start", onStart);
    return () => {
      clearTimeout(t);
      window.removeEventListener("intro:done", onIntro);
      window.removeEventListener("tour:start", onStart);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // follow the target every frame (sheets slide, calls stream, pages scroll)
  useLayoutEffect(() => {
    if (!step) return;
    let raf = 0;
    let last = "";
    const tick = () => {
      const h = measure(step.target, step.pad ?? 10);
      const el = cardRef.current;
      const cw = el?.offsetWidth ?? 340;
      const ch = el?.offsetHeight ?? 200;
      const c = placeCard(h, cw, ch);
      const key = JSON.stringify([h && [h.x, h.y, h.w, h.h].map(Math.round), Math.round(c.left), Math.round(c.top)]);
      if (key !== last) {
        last = key;
        setHole(h);
        setCard(c);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [step]);

  // keys: → / Enter next, ← back, Esc ends (captured so the app doesn't also react)
  useEffect(() => {
    if (i === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (!["ArrowRight", "ArrowLeft", "Enter", "Escape"].includes(e.key)) return;
      e.preventDefault();
      e.stopPropagation();
      if (busy) return;
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowLeft") {
        if (canBack) go(i - 1);
      }
      else if (i === STEPS.length - 1) finish();
      else go(i + 1);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  if (i === null || !step) return busy ? <div className="fixed inset-0 z-[90] cursor-progress" /> : null;

  const canBack = i > 0 && STEPS[i - 1].scene === step.scene;
  const last = i === STEPS.length - 1;
  const r = 14;

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {/* blocks clicks so the tour stays in charge of the screen */}
      <div className={`absolute inset-0 ${busy ? "cursor-progress" : ""}`} onClick={(e) => e.stopPropagation()} />

      {/* spotlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute transition-all duration-[380ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]"
        style={
          hole
            ? { left: hole.x, top: hole.y, width: hole.w, height: hole.h, borderRadius: r, boxShadow: "0 0 0 2px rgb(255 255 255 / 0.9), 0 0 0 9999px rgb(15 21 34 / 0.58)" }
            : { left: "50%", top: "50%", width: 0, height: 0, borderRadius: r, boxShadow: "0 0 0 9999px rgb(15 21 34 / 0.58)" }
        }
      />

      {/* card */}
      <div
        ref={cardRef}
        key={i}
        className={`absolute z-[97] w-[min(360px,calc(100vw-32px))] animate-fade-up rounded-[20px] bg-surface p-5 shadow-[0_24px_60px_-18px_rgb(0_0_0_/_0.5)] transition-[left,top,opacity] duration-[380ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${busy ? "opacity-0" : ""}`}
        style={{ left: card.left, top: card.top, zIndex: 97, position: "fixed" }}
      >
        <div className="flex items-center justify-between text-[12.5px]">
          <span className="font-medium text-primary">{step.chapter}</span>
          <span className="text-ink-3 tabular-nums">
            {i + 1} of {STEPS.length}
          </span>
        </div>
        <h2 id="tour-title" className="mt-1.5 text-[18px] leading-snug font-semibold text-ink">
          {step.title}
        </h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{step.body}</p>

        <div className="mt-4 h-1 overflow-hidden rounded-full bg-surface-dim" aria-hidden>
          <div className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out" style={{ width: `${((i + 1) / STEPS.length) * 100}%` }} />
        </div>

        <div className="mt-4 flex items-center gap-2">
          {!last ? (
            <button type="button" onClick={finish} className="mr-auto h-9 rounded-full px-2 text-[13px] font-medium text-ink-3 transition hover:text-ink">
              Skip tutorial
            </button>
          ) : (
            <span className="mr-auto" />
          )}
          {canBack ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => go(i - 1)}
              className="h-9 rounded-full border border-line px-4 text-[13.5px] font-medium text-ink-2 transition hover:bg-surface-dim active:scale-95"
            >
              Back
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => (last ? finish() : go(i + 1))}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-[13.5px] font-medium text-white shadow-sm transition hover:bg-primary-hover active:scale-95"
          >
            {last ? "Finish" : STEPS[i + 1].scene !== step.scene ? nextLabel(STEPS[i + 1].scene) : "Next"}
            {!last ? (
              <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden>
                <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : null}
          </button>
        </div>
      </div>
    </div>
  );
}

function nextLabel(scene: Step["scene"]) {
  if (scene === "profile") return "Open profile";
  if (scene === "call") return "Start the call";
  return "End the call";
}
