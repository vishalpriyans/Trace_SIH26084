import { WarningDiamond } from "@phosphor-icons/react/ssr";
import { DATA_SOURCE, MATCHER_BUILT } from "@/server/data";

/**
 * The standing disclosure.
 *
 * The matching engine does not exist. Every confidence, margin, tier and
 * signal weight on any screen in this build was written by hand. A console
 * that shows those numbers in the register of measured results is a
 * misrepresentation, and no amount of craft elsewhere compensates for it.
 *
 * It is gated on `MATCHER_BUILT`, not on `DATA_SOURCE`. An earlier version had
 * this wrong: it hid itself the moment the rows came from Postgres, which
 * removed the disclosure while the numbers were still authored. Loading a
 * hand typed confidence into a database does not measure it, and a console
 * backed by a real database is MORE likely to be read as computing its scores,
 * not less. The banner belongs to the matcher's absence, and only the matcher
 * can remove it.
 */
export function Provenance({ children }: { children?: React.ReactNode }) {
  if (MATCHER_BUILT) return null;

  /* The label names what is wrong with the number, not where it is kept. The
     sentence underneath is what changes with storage, because "hand authored"
     and "loaded into the database" are both true now and only the first was
     true this morning. */
  const fallback =
    DATA_SOURCE === "supabase"
      ? "The matching engine is not built. Every score, margin and tier on this screen was written by hand and loaded into the database. Stored is not the same as measured."
      : "The matching engine is not built. Every score, margin and tier on this screen is hand authored, not measured.";

  return (
    <div className="flex items-start gap-2.5 rounded-[var(--radius-control)] border border-warn/30 bg-warn-wash px-3 py-2">
      <WarningDiamond size={16} weight="fill" className="mt-0.5 shrink-0 text-warn" aria-hidden />
      <p className="text-[length:var(--text-data)] text-ink-mid">
        <span className="font-medium text-warn">Not measured.</span> {children ?? fallback}
      </p>
    </div>
  );
}
