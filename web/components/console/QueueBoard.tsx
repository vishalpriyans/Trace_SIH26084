"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  ArrowsClockwise,
  Question,
  X,
  CaretDown,
  Phone,
  DeviceMobile,
  UploadSimple,
  WifiSlash,
  ArrowUUpLeft,
} from "@phosphor-icons/react/ssr";
import type { Channel, QueueItem } from "@/lib/types";
import { DISCIPLINE_LABEL, REJECT_REASONS, TIER_LABEL, type RejectReason } from "@/lib/status";
import { Button, Key } from "@/components/ui/Control";
import { Tag, MetaTag } from "@/components/ui/Tag";
import { StatusChip } from "@/components/ui/StatusChip";
import { Avatar } from "@/components/ui/Avatar";
import { Graticule } from "./Graticule";
import { SignalBars } from "./SignalBars";
import { dayTime, score, time } from "@/lib/format";

type Gate = Record<string, { threshold: number; minMargin: number }>;
type Action = "approve" | "reassign" | "ask" | "reject";

/** A decision, and what can be taken back. A bulk approve is one entry holding
 *  every id it touched, so `U` reverses the batch as the single gesture it was,
 *  rather than leaving four rows gone and nothing to undo. */
type Decision = { action: Action; reason?: RejectReason };
type Last =
  | { kind: "single"; id: string; action: Action }
  | { kind: "bulk"; ids: string[]; action: Action };

const CHANNEL: Record<Channel, { label: string; icon: typeof Phone }> = {
  call: { label: "Call", icon: Phone },
  app: { label: "App", icon: DeviceMobile },
  upload: { label: "Upload", icon: UploadSimple },
  missed_call: { label: "Missed call", icon: Phone },
  offline: { label: "Offline", icon: WifiSlash },
};

const ACTION_LABEL: Record<Action, string> = {
  approve: "Approved",
  reassign: "Reassigned",
  ask: "Question sent",
  reject: "Rejected",
};

/* Ask sits on C rather than ?. A planner reaches for / to search and ? for
   help by reflex, and both were previously firing Ask, which is the one action
   allowed to interrupt a supervisor. The legend below the slider and the
   bindings in the key handler are the same list, printed. */

/**
 * W1, the review queue. The one screen that proves the product.
 *
 * The model is inbox zero, not a dashboard: this is a queue that empties, and
 * the empty state says so rather than showing an idle chart. Rows are ordered
 * worst first, because a planner opens this to find what the matcher could not
 * settle. The single exception is an answered clarification, which jumps to
 * the top: the supervisor has already paid the interruption cost and the
 * planner should spend it rather than let it age.
 *
 * Keyboard first is a requirement here, not an enhancement. A planner clearing
 * forty items with a mouse will abandon the tool, so every action has a key
 * and every key is printed on the card rather than hidden in a help modal.
 *
 * Nothing here writes anywhere. Decisions are held in component state and can
 * be undone, because there is no database behind this build and a screen that
 * pretended otherwise would be lying about what it did.
 */
export function QueueBoard({ items, gate }: { items: QueueItem[]; gate: Gate }) {
  const [decided, setDecided] = useState<Record<string, Decision>>({});
  const [cursor, setCursor] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [last, setLast] = useState<Last | null>(null);
  const [floor, setFloor] = useState(0.9);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [announce, setAnnounce] = useState("");
  const rowRefs = useRef<Record<string, HTMLElement | null>>({});

  const live = useMemo(() => items.filter((i) => !decided[i.id]), [items, decided]);

  /* Clamped during render rather than corrected in an effect, so the cursor is
     never briefly pointing past the end of a shortened list. */
  const at = Math.min(cursor, Math.max(0, live.length - 1));

  const decide = useCallback((id: string, action: Action, reason?: RejectReason) => {
    setDecided((d) => ({ ...d, [id]: { action, reason } }));
    setLast({ kind: "single", id, action });
    setOpen(null);
    setRejecting(null);
    setAnnounce(`${ACTION_LABEL[action]}${reason ? `, ${reason}` : ""}. ${live.length - 1} left.`);
  }, [live.length]);

  const undo = useCallback(() => {
    if (!last) return;
    const ids = last.kind === "bulk" ? last.ids : [last.id];
    setDecided((d) => {
      const next = { ...d };
      ids.forEach((i) => delete next[i]);
      return next;
    });
    setLast(null);
    setAnnounce(`Undone. ${ids.length} row${ids.length > 1 ? "s" : ""} back in the queue.`);
  }, [last]);

  /* Keys are bound on the document rather than per row so they work wherever
     focus is, except inside a field where the planner is actually typing. */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      /* Text entry owns every key. */
      if (el?.closest("input, textarea, select, [contenteditable], summary")) return;

      /* On a control, the browser owns only its own activation keys. Claiming
         all of them here is what disabled every link on the route; claiming
         none of them is what stopped J and K working the moment a planner
         tabbed onto Approve. So Enter and Space go to the control, and the
         queue keeps the letters. */
      if (el?.closest('button, a, [role="button"]') && (e.key === "Enter" || e.key === " ")) {
        return;
      }

      const current = live[at];
      const k = e.key.toLowerCase();

      if (k === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, live.length - 1));
      } else if (k === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
      } else if (k === "u") {
        e.preventDefault();
        undo();
      } else if (k === "/") {
        /* Focus search. This is what / does in every tool a planner already
           uses, and it was previously firing Ask, which is the one action
           allowed to interrupt a supervisor. */
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
      } else if (k === "?") {
        e.preventDefault();
        setShowKeys((v) => !v);
      } else if (current) {
        if (rejecting === current.id) {
          /* While the reason strip is open the number keys pick one, because a
             rejection without a reason is a silent disappearance. */
          const n = Number(e.key);
          if (n >= 1 && n <= REJECT_REASONS.length) {
            e.preventDefault();
            decide(current.id, "reject", REJECT_REASONS[n - 1]);
          } else if (e.key === "Escape") {
            e.preventDefault();
            setRejecting(null);
          }
          return;
        }
        if (k === "a") {
          e.preventDefault();
          decide(current.id, "approve");
        } else if (k === "r") {
          e.preventDefault();
          decide(current.id, "reassign");
        } else if (k === "c") {
          e.preventDefault();
          decide(current.id, "ask");
        } else if (k === "x") {
          e.preventDefault();
          setRejecting(current.id);
          setAnnounce("Pick a reason. Nothing leaves the queue without one.");
        } else if (e.key === "Enter") {
          e.preventDefault();
          setOpen((o) => (o === current.id ? null : current.id));
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [live, at, decide, undo, rejecting]);

  useEffect(() => {
    const current = live[at];
    if (!current) return;
    const row = rowRefs.current[current.id];
    row?.scrollIntoView({ block: "nearest" });
    /* Focus follows the cursor. Without this the roving tabIndex is set up and
       never used: aria-current moves, the highlight moves, and a screen
       reader's cursor stays exactly where it was. */
    const article = row?.querySelector<HTMLElement>("article");
    if (article && document.activeElement !== article) {
      article.focus({ preventScroll: true });
    }
  }, [at, live]);

  const bulkEligible = live.filter(
    (i) =>
      i.confidence >= floor &&
      i.margin >= (gate[i.discipline]?.minMargin ?? 0.08) &&
      i.timeValidation === "ok",
  );

  const excludedForTimes = live.filter(
    (i) => i.confidence >= floor && i.timeValidation !== "ok",
  ).length;

  return (
    <div>
      {/* Bulk approve. Every row still logs an individual approval event: one
          bulk event would destroy per row accountability, which is the only
          reason a planner can defend a decision six months later. */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[var(--radius-card)] bg-surface px-4 py-3 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-3">
          <label
            htmlFor="floor"
            className="text-[length:var(--text-data)] font-medium text-ink-mid"
          >
            Bulk approve at or above
          </label>
          <input
            id="floor"
            type="range"
            min={0.5}
            max={0.99}
            step={0.01}
            value={floor}
            onChange={(e) => setFloor(Number(e.target.value))}
            className="w-40 accent-[var(--accent)]"
          />
          <span className="font-mono text-[length:var(--text-body)] text-ink tnum">
            {score(floor)}
          </span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={bulkEligible.length === 0}
          onClick={() => setConfirmBulk(true)}
        >
          <Check size={14} weight="bold" aria-hidden />
          Approve {bulkEligible.length}
        </Button>
        {excludedForTimes > 0 && (
          <p className="text-[length:var(--text-data)] text-warn">
            {excludedForTimes} row{excludedForTimes > 1 ? "s" : ""} above that score{" "}
            {excludedForTimes > 1 ? "are" : "is"} held back: a time validation failure needs a
            human whatever the confidence.
          </p>
        )}
        <div className="ml-auto hidden items-center gap-2 text-[length:var(--text-data)] text-ink-meta lg:flex">
          <Key>J</Key>
          <Key>K</Key>
          <span>move</span>
          <Key>A</Key>
          <Key>R</Key>
          <Key>C</Key>
          <Key>X</Key>
          <span>decide</span>
          <Key>U</Key>
          <span>undo</span>
          <button
            type="button"
            onClick={() => setShowKeys(true)}
            className="text-ink-meta underline underline-offset-2 hover:text-ink"
          >
            <Key>?</Key> all keys
          </button>
        </div>
      </div>

      {/* Every decision, undo and batch is announced here. Without it the
          entire queue is silent to a screen reader: rows leave, counts change,
          and nothing says so. */}
      <div role="status" aria-live="polite" className="sr-only">
        {announce}
      </div>

      {confirmBulk && (
        <div className="mb-4 rounded-[var(--radius-card)] border border-accent bg-surface p-4">
          <h3 className="text-[length:var(--text-title)] text-ink">
            Approve {bulkEligible.length} at or above {score(floor)}?
          </h3>
          <p className="mt-1 text-[length:var(--text-data)] text-ink-mid">
            Each one logs its own approval event under your name. One bulk event would destroy the
            per row accountability that lets you defend a decision six months from now.
          </p>
          <ul className="my-3 max-h-52 overflow-y-auto rounded-[var(--radius-control)] border border-line">
            {bulkEligible.map((i) => (
              <li
                key={i.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line px-3 py-2 last:border-0"
              >
                <span className="font-mono text-[length:var(--text-data)] text-accent">
                  {i.candidates[0].activityId}
                </span>
                <span className="min-w-0 flex-1 truncate text-[length:var(--text-data)] text-ink">
                  {i.candidates[0].description}
                </span>
                <span className="font-mono text-[length:var(--text-data)] text-ink-mid tnum">
                  {score(i.confidence)} / m {score(i.margin)}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const ids = bulkEligible.map((i) => i.id);
                setDecided((d) => {
                  const next = { ...d };
                  ids.forEach((id) => (next[id] = { action: "approve" }));
                  return next;
                });
                setLast({ kind: "bulk", ids, action: "approve" });
                setConfirmBulk(false);
                setAnnounce(`Approved ${ids.length}. Undo with U.`);
              }}
            >
              <Check size={14} weight="bold" aria-hidden />
              Approve {bulkEligible.length}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmBulk(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {showKeys && (
        <div className="mb-4 rounded-[var(--radius-card)] border border-line bg-surface p-4">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-[length:var(--text-title)] text-ink">Keys</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowKeys(false)}>
              Close
            </Button>
          </div>
          <dl className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {[
              ["J or down", "next row"],
              ["K or up", "previous row"],
              ["Enter", "why this score"],
              ["A", "approve"],
              ["R", "reassign"],
              ["C", "ask the supervisor"],
              ["X", "reject, then 1 to 4 for the reason"],
              ["U", "undo the last decision or batch"],
              ["/", "focus search"],
              ["?", "this list"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline gap-3">
                <dt className="w-28 shrink-0">
                  <Key>{k}</Key>
                </dt>
                <dd className="text-[length:var(--text-data)] text-ink-mid">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {last && (
        <div className="mb-4 flex items-center gap-3 rounded-[var(--radius-control)] border border-line bg-raised px-3 py-2">
          <span className="text-[length:var(--text-data)] text-ink-mid">
            {last.kind === "bulk"
              ? `${ACTION_LABEL[last.action]} ${last.ids.length}.`
              : `${ACTION_LABEL[last.action]}.`}{" "}
            Nothing was written: this build has no database behind it.
          </span>
          <Button variant="ghost" size="sm" onClick={undo} className="ml-auto">
            <ArrowUUpLeft size={14} aria-hidden />
            Undo
          </Button>
        </div>
      )}

      {live.length === 0 ? (
        <div className="rounded-[var(--radius-card)] bg-surface px-6 py-16 text-center shadow-[var(--shadow-card)]">
          <div className="mx-auto flex size-12 items-center justify-center rounded-[var(--radius-pill)] bg-ok-wash">
            <Check size={22} weight="bold" className="text-ok" aria-hidden />
          </div>
          <h3 className="mt-4 text-[length:var(--text-title)] text-ink">Nothing needs you</h3>
          <p className="mx-auto mt-2 max-w-[46ch] text-[length:var(--text-body)] text-ink-mid">
            The queue is empty. Silence from a work front is a different problem and lives on the
            coverage board, so check there before you close the day.
          </p>
          <Link
            href="/console/coverage"
            className="mt-4 inline-flex items-center gap-1.5 text-[length:var(--text-body)] font-medium text-accent hover:underline"
          >
            Open W2 coverage
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {live.map((item, i) => (
            <li key={item.id} ref={(el) => void (rowRefs.current[item.id] = el)}>
              <QueueCard
                item={item}
                gate={gate[item.discipline] ?? { threshold: 0.86, minMargin: 0.08 }}
                selected={i === at}
                expanded={open === item.id}
                rejecting={rejecting === item.id}
                onSelect={() => setCursor(i)}
                onToggle={() => setOpen((o) => (o === item.id ? null : item.id))}
                onReject={() => setRejecting(item.id)}
                onCancelReject={() => setRejecting(null)}
                onDecide={(a, reason) => decide(item.id, a, reason)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function QueueCard({
  item,
  gate,
  selected,
  expanded,
  rejecting,
  onSelect,
  onToggle,
  onReject,
  onCancelReject,
  onDecide,
}: {
  item: QueueItem;
  gate: { threshold: number; minMargin: number };
  selected: boolean;
  expanded: boolean;
  rejecting: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onReject: () => void;
  onCancelReject: () => void;
  onDecide: (a: Action, reason?: RejectReason) => void;
}) {
  const top = item.candidates[0];
  const ChannelIcon = CHANNEL[item.channel].icon;
  const answered = Boolean(item.clarification?.answer);

  return (
    <article
      onMouseDown={onSelect}
      onFocus={onSelect}
      tabIndex={selected ? 0 : -1}
      aria-current={selected ? "true" : undefined}
      aria-label={`${item.reporter}, ${DISCIPLINE_LABEL[item.discipline]}, ${item.workFront}. Said: ${item.rawPhrase}`}
      className={`card overflow-hidden transition-shadow duration-150 focus:outline-none ${
        selected ? "ring-2 ring-accent" : ""
      }`}
    >
      {answered && (
        <div className="flex items-center gap-2 bg-accent-wash px-4 py-1.5 text-[length:var(--text-data)] text-accent">
          <Question size={14} weight="fill" aria-hidden />
          The supervisor answered your question. They already paid the interruption, so this
          jumped to the top.
        </div>
      )}

      <div className="p-4">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
          <Avatar name={item.reporter} size="sm" />
          <span className="text-[length:var(--text-data)] font-medium text-ink">
            {item.reporter}
          </span>
          <MetaTag>{DISCIPLINE_LABEL[item.discipline]}</MetaTag>
          <MetaTag>{item.workFront}</MetaTag>
          <MetaTag>
            <ChannelIcon size={12} aria-hidden />
            {CHANNEL[item.channel].label}
          </MetaTag>
          <span className="font-mono text-[length:var(--text-label)] text-ink-meta tnum">
            {dayTime(item.capturedAt)}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <StatusChip status={item.status} />
          </div>
        </div>

        {/* Verbatim, never mutated. It is the audit anchor: everything below is
            derived from it and can be checked against it. */}
        <blockquote className="mt-3 border-l-2 border-line-firm pl-3 text-[length:var(--text-title)] leading-snug text-ink">
          {item.rawPhrase}
        </blockquote>
        {item.normalised && (
          <p className="mt-2 pl-3 text-[length:var(--text-data)] text-ink-meta">
            <span className="text-ink-mid">{item.language}, normalised:</span>{" "}
            {item.normalised}
          </p>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_260px]">
          <div className="min-w-0">
            <div className="text-[length:var(--text-label)] font-medium tracking-[0.08em] uppercase text-ink-meta">
              {item.decision === "unmatched_new" ? "No activity matches" : "Best match"}
            </div>
            {item.decision === "unmatched_new" ? (
              <p className="mt-1.5 text-[length:var(--text-body)] text-ink">
                Genuinely new work. Flagged as a proposed child under{" "}
                <span className="font-mono text-ink-mid">{item.proposedParent}</span> rather than
                dropped, because work the WBS never contained is the most valuable thing this
                system finds.
              </p>
            ) : (
              <>
                <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <Link
                    href={`/console/activities/${top.activityId}`}
                    className="font-mono text-[length:var(--text-body)] text-accent hover:underline"
                  >
                    {top.activityId}
                  </Link>
                  <span className="text-[length:var(--text-body)] text-ink">
                    {top.description}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Tag tone={item.resolvedTier <= 1 ? "ok" : "idle"}>
                    {TIER_LABEL[item.resolvedTier]}
                  </Tag>
                  {item.fanOut && <Tag tone="warn">Fans out to {item.fanOut.length}</Tag>}
                  {item.timeValidation !== "ok" && (
                    <Tag tone="crit">
                      {item.timeValidation === "none_given"
                        ? "No times given"
                        : item.timeValidation === "missing_start"
                          ? "No start on record"
                          : item.timeValidation === "missing_finish"
                            ? "No finish given"
                            : "Times implausible"}
                    </Tag>
                  )}
                </div>
              </>
            )}

            {item.gateReason && (
              <p className="mt-3 rounded-[var(--radius-control)] border border-line bg-raised px-3 py-2 text-[length:var(--text-data)] text-ink-mid">
                <span className="font-medium text-ink">Held because </span>
                {item.gateReason}
              </p>
            )}
          </div>

          <Graticule
            confidence={item.confidence}
            margin={item.margin}
            threshold={gate.threshold}
            minMargin={gate.minMargin}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => onDecide("approve")}>
            <Check size={14} weight="bold" aria-hidden />
            Approve <Key>A</Key>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onDecide("reassign")}>
            <ArrowsClockwise size={14} aria-hidden />
            Reassign <Key>R</Key>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onDecide("ask")}>
            <Question size={14} aria-hidden />
            Ask <Key>C</Key>
          </Button>
          <Button variant="danger" size="sm" onClick={onReject}>
            <X size={14} aria-hidden />
            Reject <Key>X</Key>
          </Button>
          <Button variant="ghost" size="sm" onClick={onToggle} className="ml-auto">
            <CaretDown
              size={14}
              className={`transition-transform duration-150 ${expanded ? "rotate-180" : ""}`} aria-hidden />
            {expanded ? "Hide" : "Why this score"}
          </Button>
        </div>
      </div>

      {/* A rejection with no reason is a silent disappearance, and the field
          surface already renders the reason back to the supervisor. Nothing
          leaves the queue until one is chosen. */}
      {rejecting && (
        <div className="border-t border-crit/40 bg-crit-wash px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[length:var(--text-data)] font-medium text-crit">
              Why is this rejected?
            </span>
            {REJECT_REASONS.map((r, i) => (
              <Button
                key={r}
                variant="secondary"
                size="sm"
                onClick={() => onDecide("reject", r)}
              >
                <Key>{String(i + 1)}</Key>
                {r}
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={onCancelReject} className="ml-auto">
              Cancel
            </Button>
          </div>
          <p className="mt-2 text-[length:var(--text-data)] text-ink-mid">
            {item.reporter} is told, with this reason. Never a silent disappearance: that is how
            field trust dies.
          </p>
        </div>
      )}

      {expanded && <Evidence item={item} />}
    </article>
  );
}

/* ------------------------------------------------------------------ */

function Evidence({ item }: { item: QueueItem }) {
  return (
    <div className="border-t border-line bg-sunken px-4 py-4">
      <div className="grid gap-5 lg:grid-cols-3">
        <div>
          <H>Evidence</H>
          <p className="mt-2 text-[length:var(--text-data)] text-ink">
            <span className="rounded-[3px] bg-accent-wash px-1 py-0.5 text-accent">
              {item.evidenceSpan}
            </span>
          </p>
          <p className="mt-2 text-[length:var(--text-data)] text-ink-meta">
            The verbatim substring the event was extracted from. Everything derived below can be
            checked against it.
          </p>
          {item.quantity && (
            <p className="mt-3 font-mono text-[length:var(--text-data)] text-ink tnum">
              {item.quantity.value} {item.quantity.unit}
              {item.quantity.of ? ` of ${item.quantity.of}` : ""}
            </p>
          )}
        </div>

        <div>
          <H>Times</H>
          <dl className="mt-2 space-y-1.5">
            <TimeRow
              label="Start"
              spoken={item.spokenStart}
              value={item.actualStart ? dayTime(item.actualStart) : null}
            />
            <TimeRow
              label="Finish"
              spoken={item.spokenFinish}
              value={item.actualFinish ? dayTime(item.actualFinish) : null}
            />
          </dl>
          <p className="mt-2 text-[length:var(--text-data)] text-ink-meta">
            The spoken phrase is kept beside the normalised value and read back for confirmation.
            Nothing is ever a silent guess, and no date is written directly: actual dates are
            derived by the rollup rule from the event log.
          </p>
        </div>

        <div>
          <H>Signals on the top candidate</H>
          <div className="mt-2">
            <SignalBars signals={item.candidates[0].signals} />
          </div>
        </div>
      </div>

      {item.candidates.length > 1 && (
        <div className="mt-5">
          <H>Alternatives</H>
          <ul className="mt-2 flex flex-col gap-1.5">
            {item.candidates.slice(1).map((c) => (
              <li
                key={c.activityId}
                className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2"
              >
                <span className="font-mono text-[length:var(--text-data)] text-ink-mid">
                  {c.activityId}
                </span>
                <span className="text-[length:var(--text-data)] text-ink">{c.description}</span>
                <span className="ml-auto font-mono text-[length:var(--text-data)] text-ink-mid tnum">
                  {score(c.score)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {item.clarification && (
        <div className="mt-5 rounded-[var(--radius-control)] border border-line bg-surface px-3 py-3">
          <H>Clarification</H>
          <p className="mt-1.5 text-[length:var(--text-data)] text-ink">
            {item.clarification.question}
          </p>
          <p className="mt-1 text-[length:var(--text-label)] text-ink-meta">
            Asked {time(item.clarification.askedAt)}
          </p>
          {item.clarification.answer && (
            <p className="mt-2 text-[length:var(--text-data)]">
              <span className="text-ink-mid">Answered </span>
              <span className="font-medium text-ok">{item.clarification.answer}</span>
              <span className="text-ink-meta"> at {time(item.clarification.answeredAt!)}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[length:var(--text-label)] font-medium tracking-[0.08em] uppercase text-ink-meta">
      {children}
    </h4>
  );
}

function TimeRow({
  label,
  spoken,
  value,
}: {
  label: string;
  spoken?: string;
  value: string | null;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="w-12 shrink-0 text-[length:var(--text-data)] text-ink-mid">{label}</dt>
      <dd className="min-w-0 flex-1">
        <span className="font-mono text-[length:var(--text-data)] text-ink tnum">
          {value ?? "not on record"}
        </span>
        {spoken && (
          <span className="ml-2 text-[length:var(--text-data)] text-ink-meta">
            heard as &ldquo;{spoken}&rdquo;
          </span>
        )}
      </dd>
    </div>
  );
}
