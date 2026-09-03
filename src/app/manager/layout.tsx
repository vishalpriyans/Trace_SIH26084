import { ManagerRail } from "@/components/chrome/Nav";
import { getCounts } from "@/server/data";

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const counts = await getCounts();
  return (
    <div className="flex min-h-dvh bg-ground">
      {/* Every console route puts ten rail links ahead of the content, on every
          navigation. Without this a keyboard user tabs the whole rail again to
          reach the queue each time. */}
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-[var(--radius-control)] focus:bg-accent focus:px-3 focus:py-2 focus:text-[length:var(--text-body)] focus:font-medium focus:text-accent-ink"
      >
        Skip to content
      </a>
      <ManagerRail counts={counts} />
      <main id="content" className="min-w-0 flex-1">
        {children}
      </main>
    </div>
  );
}
