"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  HardHat,
  ChartLineUp,
  Briefcase,
  PhoneCall,
  CheckCircle,
} from "@phosphor-icons/react/ssr";
import { Button, Input, Label, Select } from "@/components/ui/Control";
import { Tag } from "@/components/ui/Tag";
import { DISCIPLINE_LABEL, DISCIPLINES, type Discipline } from "@/domain/status";

type Role = "supervisor" | "planner" | "manager";

const ROLES = [
  {
    key: "supervisor" as const,
    icon: HardHat,
    title: "Discipline supervisor",
    who: "At the work front, in gloves, mid task.",
    ask: "Phone and a code",
    lands: "Today",
    href: "/field",
  },
  {
    key: "planner" as const,
    icon: ChartLineUp,
    title: "Planning engineer",
    who: "Project controls or PMC. Clears the review queue.",
    ask: "Email and password",
    lands: "W1 review queue",
    href: "/console",
  },
  {
    key: "manager" as const,
    icon: Briefcase,
    title: "Engineer in Charge",
    who: "Statutory recipient of the 07:00 and 15:00 report.",
    ask: "Email and password",
    lands: "M1 exception summary",
    href: "/manager",
  },
];

/**
 * The role desk.
 *
 * Two very different people arrive here and neither should have to understand
 * the other. A supervisor is being onboarded on a borrowed phone at a site
 * office and is never asked for an email, a password, a language or an
 * employee number. A planner is at a desk with two monitors. So each card
 * states what it will ask of you before you open it, and the fields grow
 * inside the card you chose rather than replacing the screen.
 *
 * Nothing here verifies a credential and no session is real. The specification
 * de-scopes authentication to a role picker; this keeps the shape of the real
 * flow so it can be demonstrated, and so Supabase Auth drops in behind it
 * without a redesign. `database.md` records which table each field becomes.
 */
export function Gate({ mode }: { mode: "signin" | "signup" }) {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);

  return (
    <div className="mx-auto w-full max-w-[520px] px-5 pb-16 pt-4">
      <div className="flex rounded-[var(--radius-pill)] border border-line bg-sunken p-1">
        {(["signin", "signup"] as const).map((m) => (
          <Link
            key={m}
            href={m === "signin" ? "/signin" : "/signup"}
            className={`flex-1 rounded-[var(--radius-pill)] px-3 py-1.5 text-center text-[length:var(--text-data)] font-medium transition-colors duration-150 ${
              mode === m ? "bg-accent text-accent-ink" : "text-ink-mid hover:text-ink"
            }`}
          >
            {m === "signin" ? "Sign in" : "Create an account"}
          </Link>
        ))}
      </div>

      <h1 className="mt-7 text-[length:var(--text-figure)] leading-tight tracking-[-0.02em] text-ink">
        {mode === "signin" ? "Which seat are you in?" : "Which seat are you registering?"}
      </h1>
      <p className="mt-2 text-[length:var(--text-body)] text-ink-mid">
        {mode === "signin"
          ? "The role stays visible in the chrome for the whole session, so anyone watching can tell which seat is being demonstrated."
          : "Each role is asked only for what its own flow needs. Nothing is asked twice and nothing is asked that the system can detect for itself."}
      </p>

      <div className="mt-5 flex flex-col gap-3">
        {ROLES.map((r) => {
          const open = role === r.key;
          const I = r.icon;
          return (
            <div
              key={r.key}
              className={`card overflow-hidden transition-shadow duration-150 ${
                open ? "shadow-[var(--shadow-pop)]" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => setRole(open ? null : r.key)}
                aria-expanded={open}
                className="flex w-full items-start gap-3 p-4 text-left transition-colors duration-150 hover:bg-raised"
              >
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-150 ${
                    open ? "bg-accent text-accent-ink" : "bg-raised text-accent"
                  }`}
                >
                  <I size={20} weight={open ? "fill" : "regular"} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[length:var(--text-title)] font-medium text-ink">
                    {r.title}
                  </span>
                  <span className="mt-1 block text-[length:var(--text-data)] text-ink-mid">
                    {r.who}
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Tag tone={open ? "accent" : "idle"}>{r.ask}</Tag>
                    <span className="text-[length:var(--text-data)] text-ink-meta">
                      lands on {r.lands}
                    </span>
                  </span>
                </span>
                <ArrowRight
                  size={16}
                  className={`mt-1 shrink-0 transition-transform duration-150 ${
                    open ? "rotate-90 text-accent" : "text-ink-meta"
                  }`} aria-hidden />
              </button>

              {open && (
                <div className="border-t border-line px-4 py-4">
                  {r.key === "supervisor" ? (
                    <SupervisorFlow mode={mode} onDone={() => router.push(r.href)} />
                  ) : (
                    <DeskFlow mode={mode} role={r.key} onDone={() => router.push(r.href)} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-[length:var(--text-data)] text-ink-meta">
        No credential is checked and no session is created. Authentication is de-scoped by the
        specification to a role picker, and this flow keeps the real shape so Supabase Auth can
        replace it without a redesign.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * S-1, four steps and no configuration.
 *
 * Language is deliberately not asked for. The agent detects the language the
 * supervisor speaks and can switch mid call, so a setting here would go stale
 * and get answered wrong. Preferred channel is not asked for either: voice is
 * the primary path and the app is the supporting surface, so there is no
 * choice to offer.
 */
function SupervisorFlow({ mode, onDone }: { mode: "signin" | "signup"; onDone: () => void }) {
  const [step, setStep] = useState<"phone" | "otp" | "discipline" | "front">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  /* Counted separately. The missed call route answers "no code arrived", so
     offering it because someone mistyped four digits is misleading: the code
     did arrive. */
  const [resends, setResends] = useState(0);
  const [discipline, setDiscipline] = useState<Discipline | null>(null);

  const FRONTS = ["South Rack", "North Rack", "Fab Yard", "Tank Farm 2", "CDU Unit"];
  const total = mode === "signup" ? 4 : 2;

  if (step === "phone") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setStep("otp");
        }}
      >
        <Step n={1} of={total} title="Your phone number" />
        <Label htmlFor="phone" hint="The number the system calls you on">
          Phone
        </Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          placeholder="+91 98550 00114"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="font-mono text-[length:var(--text-title)] tnum"
        />
        <Button type="submit" variant="primary" size="lg" className="mt-3 w-full">
          Send code
        </Button>
      </form>
    );
  }

  if (step === "otp") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (otp.length !== 6) {
            /* The field is not cleared. Retyping five correct digits because
               the sixth was wrong is the kind of small cruelty that gets an
               app abandoned by a user who did not want to be here. */
            setError("That is not six digits yet. Check the message and finish the code.");
            return;
          }
          setError(null);
          if (mode === "signin") onDone();
          else setStep("discipline");
        }}
      >
        <Step n={2} of={total} title="Code sent by SMS" />
        <Label htmlFor="otp" hint={phone || "your number"}>
          Six digit code
        </Label>
        <Input
          id="otp"
          name="otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          placeholder="000000"
          value={otp}
          maxLength={6}
          pattern="[0-9]{6}"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "otp-error" : undefined}
          onChange={(e) => {
            setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
            if (error) setError(null);
          }}
          className="font-mono text-[length:var(--text-lead)] tracking-[0.35em] tnum"
        />
        {error && (
          <p
            id="otp-error"
            role="alert"
            className="mt-1.5 text-[length:var(--text-data)] text-crit"
          >
            {error}
          </p>
        )}
        <div className="mt-2 flex gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => setResends((r) => r + 1)}>
            Resend
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setStep("phone")}>
            Change number
          </Button>
        </div>
        <Button type="submit" variant="primary" size="lg" className="mt-3 w-full">
          Verify
        </Button>

        {/* The no app route, offered rather than buried. A supervisor with a
            dead battery, no data or no smartphone is the single largest
            adoption objection this product faces, and the missed call pattern
            is one every field worker in India already understands. */}
        {resends >= 2 && (
          <div className="mt-4 rounded-[var(--radius-control)] border border-accent/30 bg-accent-wash p-3">
            <div className="flex items-center gap-2 text-[length:var(--text-data)] font-medium text-accent">
              <PhoneCall size={15} weight="fill" aria-hidden />
              No code arriving
            </div>
            <p className="mt-1.5 text-[length:var(--text-data)] text-ink-mid">
              Give a missed call to the TRACE number from any handset. The system hangs up
              straight away so it costs you nothing, then calls you back with today&apos;s work
              already loaded. No app and no data needed.
            </p>
            <div className="mt-2 font-mono text-[length:var(--text-title)] text-ink tnum">
              1800 000 0000
            </div>
          </div>
        )}
      </form>
    );
  }

  if (step === "discipline") {
    return (
      <div>
        <Step n={3} of={4} title="Your discipline" />
        <div className="grid grid-cols-2 gap-2">
          {DISCIPLINES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setDiscipline(d);
                setStep("front");
              }}
              className={`min-h-14 rounded-[var(--radius-control)] border px-3 py-2 text-left text-[length:var(--text-body)] transition-colors duration-150 ${
                discipline === d
                  ? "border-accent bg-accent-wash text-accent"
                  : "border-line bg-raised text-ink hover:border-line-firm"
              }`}
            >
              {DISCIPLINE_LABEL[d]}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Step n={4} of={4} title="Your work front" />
      <p className="mb-2.5 text-[length:var(--text-data)] text-ink-mid">
        Only the fronts the planner has already assigned to you.
      </p>
      <div className="flex flex-col gap-2">
        {FRONTS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={onDone}
            className="flex min-h-14 items-center justify-between rounded-[var(--radius-control)] border border-line bg-raised px-3 py-2 text-left text-[length:var(--text-body)] text-ink transition-colors duration-150 hover:border-accent"
          >
            {f}
            <CheckCircle size={18} className="text-ink-meta" aria-hidden />
          </button>
        ))}
        <button
          type="button"
          onClick={onDone}
          className="px-1 py-2 text-left text-[length:var(--text-data)] text-ink-mid underline underline-offset-4 hover:text-ink"
        >
          Not listed. Type it and the planner will fix it.
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function DeskFlow({
  mode,
  role,
  onDone,
}: {
  mode: "signin" | "signup";
  role: "planner" | "manager";
  onDone: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onDone();
      }}
    >
      {mode === "signup" && (
        <div className="mb-3">
          <Label htmlFor={`${role}-name`}>Name</Label>
          <Input
            id={`${role}-name`}
            name="name"
            required
            autoComplete="name"
            placeholder={role === "planner" ? "Anjali Sharma" : "Ravi Kumar"}
          />
        </div>
      )}
      <div className="mb-3">
        <Label htmlFor={`${role}-email`}>Work email</Label>
        <Input
          id={`${role}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="name@example.co.in"
        />
      </div>
      <div className="mb-3">
        <Label htmlFor={`${role}-pw`} hint={mode === "signup" ? "12 characters or more" : undefined}>
          Password
        </Label>
        <Input
          id={`${role}-pw`}
          name="password"
          type="password"
          required
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
      </div>
      {mode === "signup" && (
        <div className="mb-3">
          <Label htmlFor={`${role}-org`}>Organisation</Label>
          <Select id={`${role}-org`} name="organisation" defaultValue="OIL">
            <option value="OIL">Oil India Limited</option>
            <option value="EIL">EIL, project management consultant</option>
            <option value="TKP">thyssenkrupp, project management consultant</option>
            <option value="TEC">Technip, project management consultant</option>
            <option value="CON">Contractor</option>
          </Select>
        </div>
      )}
      <Button type="submit" variant="primary" size="md" className="mt-1 w-full">
        {mode === "signin" ? "Sign in" : "Create the account"}
      </Button>
    </form>
  );
}

function Step({ n, of, title }: { n: number; of: number; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5" role="status">
      <span className="flex items-center gap-1 font-mono text-[length:var(--text-label)] text-ink-meta tnum">
        {Array.from({ length: of }).map((_, i) => (
          <span
            key={i}
            className={`h-1 w-4 rounded-full ${i < n ? "bg-accent" : "bg-line-firm"}`}
          />
        ))}
      </span>
      <span className="text-[length:var(--text-body)] font-medium text-ink">
        <span className="sr-only">Step {n} of {of}: </span>
        {title}
      </span>
    </div>
  );
}
