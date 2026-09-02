import { WarningDiamond } from "@phosphor-icons/react/ssr";
import { DATA_SOURCE } from "@/lib/data";

/**
 * The standing disclosure.
 *
 * The matching engine does not exist. Every confidence, margin, tier and
 * signal weight on any screen in this build was written by hand. A console
 * that shows those numbers in the register of measured results is a
 * misrepresentation, and no amount of craft elsewhere compensates for it.
 *
 * So this sits above anything carrying a score, it is not dismissible, and it
 * disappears on its own the day `DATA_SOURCE` flips to a real database. That
 * is the only way it can be removed.
 */
export function Provenance({ children }: { children?: React.ReactNode }) {
  if (DATA_SOURCE !== "fixture") return null;
  return (
    <div className="flex items-start gap-2.5 rounded-[var(--radius-control)] border border-warn/30 bg-warn-wash px-3 py-2">
      <WarningDiamond size={16} weight="fill" className="mt-0.5 shrink-0 text-warn" aria-hidden />
      <p className="text-[length:var(--text-data)] text-ink-mid">
        <span className="font-medium text-warn">Fixture data.</span>{" "}
        {children ??
          "The matching engine is not built. Every score, margin and tier on this screen is hand authored, not measured."}
      </p>
    </div>
  );
}
