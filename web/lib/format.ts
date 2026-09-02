/**
 * Formatting helpers. Every time on both surfaces is Asia/Kolkata, because the
 * site is in Assam and a planner reading a shift boundary in their browser's
 * locale would read the wrong shift.
 */

const TZ = "Asia/Kolkata";

export function time(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

export function day(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: TZ,
  });
}

export function dayTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return `${day(iso)} ${time(iso)}`;
}

/** Blocker ageing, written so six days reads as wrong at a glance. */
export function age(hours: number): string {
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const rem = hours % 24;
  return rem ? `${days}d ${rem}h` : `${days}d`;
}

export function pct(n: number, dp = 0): string {
  return `${n.toFixed(dp)}%`;
}

/** Confidence is always three decimals. A score rounded to two hides the
 *  difference between 0.914 and 0.909, which is exactly the difference the
 *  margin guard exists to catch. */
export function score(n: number): string {
  return n.toFixed(3);
}
