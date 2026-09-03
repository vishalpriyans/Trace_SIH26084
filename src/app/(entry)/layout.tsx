import { ThemeSwitch } from "@/components/chrome/Theme";

/**
 * Entry is a role desk, not a marketing page. One line of what this is, and
 * then the only question that matters, which is who is arriving.
 */
export default function EntryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-ground">
      <header className="flex items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-accent font-mono text-[length:var(--text-body)] font-medium text-accent-ink">
            TR
          </span>
          <div>
            <div className="text-[length:var(--text-body)] font-semibold text-ink">TRACE</div>
            <div className="text-[length:var(--text-data)] text-ink-meta">
              Field progress, captured as it is spoken and linked to the schedule inside the shift
            </div>
          </div>
        </div>
        <ThemeSwitch preferred="dark" />
      </header>

      <main className="flex-1">{children}</main>

      <footer className="px-5 py-4 text-[length:var(--text-data)] text-ink-meta">
        Oil India Limited. Synthetic data throughout, per the problem statement&apos;s own
        instruction that live project data will not be shared.
      </footer>
    </div>
  );
}
