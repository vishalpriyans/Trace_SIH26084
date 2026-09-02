import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/ssr";
import { LogFlow } from "@/components/field/LogFlow";
import { getExpectedToday } from "@/lib/data";

export const metadata = { title: "Log by text - TRACE" };

export default async function LogPage() {
  const expected = await getExpectedToday();
  return (
    <div className="px-4 py-4">
      <Link
        href="/field"
        className="mb-4 inline-flex min-h-[56px] items-center gap-1.5 pr-3 text-[length:var(--text-body)] font-medium text-ink-mid"
      >
        <CaretLeft size={18} aria-hidden />
        Today
      </Link>
      <h1 className="mb-3 px-1 text-[length:var(--text-figure)] leading-tight text-ink">
        Log by text
      </h1>
      <LogFlow expected={expected} />
      <p className="mt-5 px-1 text-[length:var(--text-body)] text-ink-meta">
        A call is quicker and handles work that is not on your list. This is here for when you
        would rather not talk.
      </p>
    </div>
  );
}
