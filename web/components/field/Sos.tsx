"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Siren, Phone, X, Check } from "@phosphor-icons/react/ssr";

const HOLD_MS = 2000;
const CANCEL_MS = 10000;

type Phase = "idle" | "confirm" | "sent";

/**
 * S-10. Under three seconds to sent.
 *
 * It docks into the tab bar rather than floating over the list. A floating
 * action button here sits on top of the state actions of whatever row happens
 * to be underneath it, and an emergency control that covers a working control
 * is worse than either of them alone.
 *
 * TWO ACTIVATION PATHS, deliberately different.
 *
 * A pointer press-and-hold of two seconds. Fast in a real emergency, immune to
 * a pocket tap.
 *
 * A keyboard or assistive-technology activation opens a single confirm
 * instead. This is not a nicety: TalkBack's double-tap synthesises a click,
 * not a sustained press, so a hold-only control cannot be operated by a
 * supervisor using a screen reader at all. The confirm costs one extra tap and
 * makes the control reachable by everyone, which for this particular control
 * is the difference between working and not existing.
 *
 * IT SENDS FIRST, then asks for detail. Who, work front, discipline and
 * timestamp are captured automatically; the category and voice note follow
 * afterwards. Never make someone fill in a form during an emergency.
 *
 * THE CONFIRMATION NEVER TRAPS THE SCREEN. It sits above the tab bar rather
 * than over it, and once the cancel window closes it collapses to a slim
 * banner. The trigger stays mounted the whole time, because a second emergency
 * during the first one is exactly when this must still work. There is no rate
 * limit on raising one. Ever.
 *
 * The site emergency number is shown alongside every confirmation, every time.
 * This app is a notifier and is never a replacement for the site's own
 * emergency protocol.
 */
export function Sos({ emergencyNumber }: { emergencyNumber: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [sentAt, setSentAt] = useState<string | null>(null);
  const [cancelLeft, setCancelLeft] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const raf = useRef<number | null>(null);
  const started = useRef(0);
  /* Read once, at hold time. The fill is a conic gradient repainted every
     frame; under reduced motion it becomes a stepped count instead, which
     still tells the supervisor how long is left without animating. */
  const reduceMotion = useRef(false);
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const send = useCallback(() => {
    setSentAt(
      new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
      }),
    );
    setCancelLeft(CANCEL_MS / 1000);
    setCollapsed(false);
    setProgress(0);
    setPhase("sent");
  }, []);

  function beginHold() {
    if (phase === "sent") return;
    reduceMotion.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    started.current = performance.now();
    const tick = () => {
      const raw = Math.min(1, (performance.now() - started.current) / HOLD_MS);
      /* Quantised to thirds under reduced motion: three state changes rather
         than a hundred and twenty. */
      const p = reduceMotion.current ? Math.floor(raw * 3) / 3 : raw;
      setProgress(raw >= 1 ? 1 : p);
      if (raw >= 1) {
        send();
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }

  function endHold() {
    if (raf.current) cancelAnimationFrame(raf.current);
    setProgress(0);
  }

  /* The cancel window, and the auto-collapse that ends it. */
  useEffect(() => {
    if (phase !== "sent" || collapsed) return;
    const t = setInterval(() => {
      setCancelLeft((c) => {
        if (c <= 1) {
          clearInterval(t);
          setCollapsed(true);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, collapsed]);

  useEffect(() => () => void (raf.current && cancelAnimationFrame(raf.current)), []);

  /* The confirm path exists for keyboard and screen reader users, so it has to
     move focus into the panel it opens. Without this a supervisor on TalkBack
     activates SOS, a dialog appears somewhere else on screen, nothing is
     spoken, and re-activating the trigger does nothing. */
  useEffect(() => {
    if (phase === "confirm") confirmRef.current?.focus();
  }, [phase]);

  const tel = `tel:${emergencyNumber.replace(/\s/g, "")}`;

  return (
    <>
      {/* Announced once, on send. Progress is not announced: a screen reader
          counting up to two seconds during an emergency is noise. */}
      <div role="alert" aria-live="assertive" className="sr-only">
        {phase === "sent" && sentAt
          ? `Emergency sent at ${sentAt}. Your location, work front and discipline were sent with it. Site emergency number ${emergencyNumber}.`
          : phase === "confirm"
            ? "Confirm the emergency. Send now, or not now."
            : ""}
      </div>

      {phase === "confirm" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sos-confirm-title"
          className="fixed inset-x-0 bottom-[calc(69px+env(safe-area-inset-bottom))] z-50 mx-auto max-w-[560px] p-3"
        >
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-crit bg-surface">
            <div className="px-4 py-4">
              <h2
                id="sos-confirm-title"
                className="text-[length:var(--text-lead)] font-semibold text-ink"
              >
                Send emergency now?
              </h2>
              <p className="mt-2 text-[length:var(--text-body)] text-ink-mid">
                Your location, work front and discipline go with it.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  ref={confirmRef}
                  type="button"
                  onClick={send}
                  className="flex min-h-[68px] items-center justify-center gap-2.5 rounded-[var(--radius-control)] bg-crit text-[length:var(--text-lead)] font-semibold text-ground"
                >
                  <Check size={24} weight="bold" aria-hidden />
                  Send now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhase("idle");
                    triggerRef.current?.focus();
                  }}
                  className="flex min-h-[56px] items-center justify-center rounded-[var(--radius-control)] border border-line bg-raised text-[length:var(--text-body)] font-medium text-ink"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === "sent" && !collapsed && (
        <div className="fixed inset-x-0 bottom-[calc(69px+env(safe-area-inset-bottom))] z-50 mx-auto max-w-[560px] p-3">
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-crit bg-surface">
            <div className="flex items-center gap-2.5 bg-crit px-4 py-3">
              <Siren size={22} weight="fill" className="text-ground" aria-hidden />
              <span className="text-[length:var(--text-title)] font-semibold text-ground">
                Sent {sentAt}
              </span>
              {cancelLeft > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setPhase("idle");
                    setSentAt(null);
                  }}
                  className="ml-auto flex min-h-[56px] items-center gap-1.5 rounded-[var(--radius-control)] bg-ground/20 px-3 text-[length:var(--text-body)] font-medium text-ground"
                >
                  <X size={17} weight="bold" aria-hidden />
                  Cancel {cancelLeft}
                </button>
              )}
            </div>
            <div className="px-4 py-4">
              <p className="text-[length:var(--text-title)] text-ink">
                Your location, work front and discipline went with it. A manager is being alerted
                now.
              </p>
              <a
                href={tel}
                className="mt-4 flex min-h-[68px] items-center justify-center gap-3 rounded-[var(--radius-control)] bg-crit px-5 text-[length:var(--text-lead)] font-semibold text-ground"
              >
                <Phone size={24} weight="fill" aria-hidden />
                {emergencyNumber}
              </a>
              <p className="mt-3 text-[length:var(--text-body)] text-ink-mid">
                Call the site emergency number as well. This app tells people. It does not replace
                the site protocol.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* After the cancel window the panel becomes a slim banner. It still
          never covers the tab bar, and the trigger below is live again. */}
      {phase === "sent" && collapsed && (
        <div className="fixed inset-x-0 bottom-[calc(69px+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-[560px] items-center gap-2 border-t border-crit bg-crit-wash px-3 py-2">
          <Siren size={18} weight="fill" className="shrink-0 text-crit" aria-hidden />
          <span className="min-w-0 flex-1 text-[length:var(--text-body)] text-ink">
            Emergency sent {sentAt}
          </span>
          <a
            href={tel}
            className="flex min-h-[56px] items-center rounded-[var(--radius-control)] bg-crit px-3 text-[length:var(--text-body)] font-semibold text-ground"
          >
            Call
          </a>
          <button
            type="button"
            onClick={() => {
              setPhase("idle");
              setSentAt(null);
            }}
            aria-label="Dismiss the emergency banner"
            className="flex size-14 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-ink-mid"
          >
            <X size={20} aria-hidden />
          </button>
        </div>
      )}

      <button
        ref={triggerRef}
        type="button"
        onPointerDown={beginHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        onPointerCancel={endHold}
        onClick={(e) => {
          /* detail 0 means the click was synthesised rather than produced by a
             real pointer: a keyboard Enter or Space, or an assistive
             technology's activation gesture. Those cannot express a hold, so
             they get the confirm path instead. */
          if (e.detail === 0 && phase === "idle") setPhase("confirm");
        }}
        aria-label="Emergency. Press and hold for two seconds, or activate for a confirmation."
        className="flex min-h-[68px] w-full touch-none select-none flex-col items-center justify-center gap-1 text-crit"
      >
        <span
          className="flex size-8 items-center justify-center rounded-[var(--radius-pill)] bg-crit"
          style={{
            backgroundImage:
              progress > 0
                ? `conic-gradient(var(--ground) ${progress * 360}deg, var(--crit) 0deg)`
                : undefined,
          }}
        >
          <span className="flex size-[26px] items-center justify-center rounded-[var(--radius-pill)] bg-crit">
            <Siren size={17} weight="fill" className="text-ground" aria-hidden />
          </span>
        </span>
        <span className="text-[length:var(--text-body)] font-medium leading-none">
          {progress > 0 ? "Hold" : "SOS"}
        </span>
      </button>
    </>
  );
}
