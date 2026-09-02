import { ThemeSwitch } from "@/components/chrome/Theme";
import { Avatar } from "@/components/ui/Avatar";
import { FieldTabs } from "@/components/field/Tabs";
import { Sos } from "@/components/field/Sos";
import { getCounts, getFieldUser } from "@/lib/data";
import { DISCIPLINE_LABEL } from "@/lib/status";

/**
 * The phone shell. This is responsive mobile web standing in for an Expo
 * Android app, so it is framed at phone width rather than stretched across a
 * desktop: a supervisor uses this one handed at a work front, and a layout
 * that only makes sense at 1440px would be designing for the wrong room.
 *
 * The sun switch sits in the header rather than buried in settings, because
 * the decision it answers is made outdoors, several times a day.
 */
export default async function FieldLayout({ children }: { children: React.ReactNode }) {
  const [user, counts] = await Promise.all([getFieldUser(), getCounts()]);

  return (
    <div
      data-surface="field"
      className="mx-auto flex min-h-dvh max-w-[560px] flex-col border-x border-line bg-ground"
    >
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
        <Avatar name={user.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[length:var(--text-title)] font-medium text-ink">
            {user.name}
          </div>
          <div className="truncate text-[length:var(--text-body)] text-ink-mid">
            {DISCIPLINE_LABEL[user.discipline]}, {user.workFront}
          </div>
        </div>
        <ThemeSwitch preferred="dark" size="lg" />
      </header>

      <main className="flex-1 pb-[calc(92px+env(safe-area-inset-bottom))]">{children}</main>

      <FieldTabs
        questions={counts.openQuestions}
        actionable={counts.actionableUpdates}
        sos={<Sos emergencyNumber={user.siteEmergencyNumber} />}
      />
    </div>
  );
}
